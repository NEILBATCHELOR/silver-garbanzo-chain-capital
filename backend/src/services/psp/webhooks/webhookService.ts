/**
 * PSP Webhook Service
 * 
 * Manages webhook registration, event processing, and delivery.
 * Handles both incoming webhooks from Warp and outgoing webhooks to customers.
 * 
 * Features:
 * - Webhook registration with Warp API
 * - Event storage and tracking
 * - Automatic retry with exponential backoff
 * - Event delivery to customer callbacks
 * - Authentication for customer webhooks
 */

import axios from 'axios';
import { Prisma, psp_webhooks, psp_webhook_events } from '@/infrastructure/database/generated/index';
import { BaseService } from '../../BaseService';
import { logger } from '@/utils/logger';
import { PSPEncryptionService } from '../security/pspEncryptionService';
import { WarpClientService } from '../auth/warpClientService';

export interface RegisterWebhookRequest {
  projectId: string;
  callbackUrl: string;
  authUsername: string;
  authPassword: string;
}

export interface WebhookResponse {
  id: string;
  projectId: string;
  warpWebhookId: string | null;
  callbackUrl: string;
  authUsername: string;
  status: 'active' | 'suspended' | 'failed';
  retryCount: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEventPayload {
  event_id: string;
  event_name: string;
  resource_urls: string[];
  payload: Record<string, unknown>;
}

export interface WebhookEventResponse {
  id: string;
  webhookId: string | null;
  projectId: string;
  eventId: string;
  eventName: string;
  resourceUrls: string[];
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  deliveryAttempts: number;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookService extends BaseService {
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

  constructor() {
    super('Webhook');
  }

  /**
   * Register a new webhook with Warp API and store configuration
   */
  async registerWebhook(
    request: RegisterWebhookRequest,
    environment: 'sandbox' | 'production'
  ): Promise<WebhookResponse> {
    this.logInfo('Registering webhook', { 
      projectId: request.projectId,
      callbackUrl: request.callbackUrl 
    });

    try {
      // Encrypt webhook password
      const passwordVault = await PSPEncryptionService.encryptWebhookPassword(
        request.authPassword,
        request.projectId,
        `Webhook auth for ${request.callbackUrl}`
      );

      // Register with Warp API
      const warpClient = await WarpClientService.getClientForProject(
        request.projectId,
        environment
      );

      const warpResponse = await warpClient.post('/webhooks', {
        url: request.callbackUrl,
        events: [
          'DEPOSIT_STATUS_CHANGE',
          'PAYMENT_STATUS_CHANGE',
          'TRADE_COMPLETED',
          'IDENTITY_VERIFICATION_UPDATE'
        ]
      });

      const warpWebhookId = warpResponse.data.id || warpResponse.data.webhook_id;

      // Store webhook configuration using BaseService
      const result = await this.createEntity<psp_webhooks>(this.db.psp_webhooks, {
        project_id: request.projectId,
        warp_webhook_id: warpWebhookId,
        callback_url: request.callbackUrl,
        auth_username: request.authUsername,
        auth_password_vault_id: passwordVault.vaultId,
        status: 'active',
        retry_count: 0
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create webhook');
      }

      this.logInfo('Webhook registered successfully', { 
        webhookId: result.data.id,
        warpWebhookId 
      });

      return this.toWebhookResponse(result.data);
    } catch (error) {
      this.logError('Failed to register webhook', { error, request });
      throw error;
    }
  }

  /**
   * Get webhook details
   */
  async getWebhook(webhookId: string): Promise<WebhookResponse | null> {
    const result = await this.findById<psp_webhooks>(this.db.psp_webhooks, webhookId);
    if (!result.success || !result.data) return null;
    return this.toWebhookResponse(result.data);
  }

  /**
   * List all webhooks for a project
   */
  async listWebhooks(projectId: string): Promise<WebhookResponse[]> {
    const records = await this.db.psp_webhooks.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' }
    });

    return records.map(r => this.toWebhookResponse(r));
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(
    webhookId: string,
    updates: {
      callbackUrl?: string;
      authUsername?: string;
      authPassword?: string;
      status?: 'active' | 'suspended' | 'failed';
    },
    environment: 'sandbox' | 'production'
  ): Promise<WebhookResponse> {
    this.logInfo('Updating webhook', { webhookId, updates });

    const findResult = await this.findById<psp_webhooks>(this.db.psp_webhooks, webhookId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Webhook not found');
    }
    const webhook = findResult.data;

    const updateData: Prisma.psp_webhooksUpdateInput = {};

    // Update callback URL if provided
    if (updates.callbackUrl) {
      updateData.callback_url = updates.callbackUrl;

      // Update in Warp API if webhook is registered
      if (webhook.warp_webhook_id) {
        const warpClient = await WarpClientService.getClientForProject(
          webhook.project_id,
          environment
        );

        await warpClient.put(`/webhooks/${webhook.warp_webhook_id}`, {
          url: updates.callbackUrl
        });
      }
    }

    // Update auth username
    if (updates.authUsername) {
      updateData.auth_username = updates.authUsername;
    }

    // Update auth password (encrypt new password)
    if (updates.authPassword) {
      // Delete old password from vault
      if (webhook.auth_password_vault_id) {
        await PSPEncryptionService.deleteVaultKey(webhook.auth_password_vault_id);
      }

      // Encrypt new password
      const passwordVault = await PSPEncryptionService.encryptWebhookPassword(
        updates.authPassword,
        webhook.project_id,
        `Webhook auth for ${updates.callbackUrl || webhook.callback_url}`
      );

      // Use relation connect syntax for foreign key update
      updateData.key_vault_keys = {
        connect: { id: passwordVault.vaultId }
      };
    }

    // Update status
    if (updates.status) {
      updateData.status = updates.status;
    }

    updateData.updated_at = new Date();

    const updateResult = await this.updateEntity<psp_webhooks>(this.db.psp_webhooks, webhookId, updateData);
    if (!updateResult.success || !updateResult.data) {
      throw new Error(updateResult.error || 'Failed to update webhook');
    }

    this.logInfo('Webhook updated successfully', { webhookId });
    return this.toWebhookResponse(updateResult.data);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(
    webhookId: string,
    environment: 'sandbox' | 'production'
  ): Promise<void> {
    this.logInfo('Deleting webhook', { webhookId });

    const findResult = await this.findById<psp_webhooks>(this.db.psp_webhooks, webhookId);
    if (!findResult.success || !findResult.data) {
      throw new Error('Webhook not found');
    }
    const webhook = findResult.data;

    // Delete from Warp API if registered
    if (webhook.warp_webhook_id) {
      try {
        const warpClient = await WarpClientService.getClientForProject(
          webhook.project_id,
          environment
        );

        await warpClient.delete(`/webhooks/${webhook.warp_webhook_id}`);
      } catch (error) {
        this.logError('Failed to delete webhook from Warp', { error, webhookId });
        // Continue with local deletion even if Warp deletion fails
      }
    }

    // Delete encrypted password from vault
    if (webhook.auth_password_vault_id) {
      await PSPEncryptionService.deleteVaultKey(webhook.auth_password_vault_id);
    }

    // Delete webhook record
    await this.deleteEntity(this.db.psp_webhooks, webhookId);

    this.logInfo('Webhook deleted successfully', { webhookId });
  }

  /**
   * Receive and store webhook event from Warp
   */
  async receiveEvent(
    projectId: string,
    eventPayload: WebhookEventPayload
  ): Promise<WebhookEventResponse> {
    this.logInfo('Receiving webhook event', { 
      projectId,
      eventId: eventPayload.event_id,
      eventName: eventPayload.event_name 
    });

    try {
      // Check for duplicate events
      const existing = await this.db.psp_webhook_events.findFirst({
        where: { event_id: eventPayload.event_id }
      });

      if (existing) {
        this.logInfo('Duplicate event ignored', { eventId: eventPayload.event_id });
        return this.toEventResponse(existing);
      }

      // Get active webhook for this project
      const webhook = await this.db.psp_webhooks.findFirst({
        where: {
          project_id: projectId,
          status: 'active'
        }
      });

      // Store event
      const event = await this.db.psp_webhook_events.create({
        data: {
          webhook_id: webhook?.id || null,
          project_id: projectId,
          event_id: eventPayload.event_id,
          event_name: eventPayload.event_name,
          resource_urls: eventPayload.resource_urls,
          payload: eventPayload.payload as Prisma.InputJsonValue,
          status: 'pending',
          delivery_attempts: 0
        }
      });

      this.logInfo('Event stored successfully', { eventId: event.id });

      // If webhook is configured, attempt delivery
      if (webhook) {
        this.deliverEvent(event.id).catch(error => {
          this.logError('Failed to deliver event', { error, eventId: event.id });
        });
      }

      return this.toEventResponse(event);
    } catch (error) {
      this.logError('Failed to receive event', { error, eventPayload });
      throw error;
    }
  }

  /**
   * Deliver webhook event to customer callback URL
   */
  async deliverEvent(eventId: string): Promise<void> {
    const event = await this.db.psp_webhook_events.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.webhook_id) {
      this.logInfo('No webhook configured for event', { eventId });
      return;
    }

    const findResult = await this.findById<psp_webhooks>(this.db.psp_webhooks, event.webhook_id);
    if (!findResult.success || !findResult.data) {
      this.logError('Webhook not found for event', { eventId, webhookId: event.webhook_id });
      return;
    }
    const webhook = findResult.data;

    if (webhook.status !== 'active') {
      this.logInfo('Webhook not active, skipping delivery', { eventId, webhookId: webhook.id });
      return;
    }

    this.logInfo('Delivering event', { 
      eventId,
      webhookId: webhook.id,
      callbackUrl: webhook.callback_url 
    });

    try {
      // Decrypt webhook password
      const password = await PSPEncryptionService.decryptWebhookPassword(
        webhook.auth_password_vault_id!
      );

      // Make HTTP request to customer callback
      const response = await axios.post(
        webhook.callback_url,
        {
          event_id: event.event_id,
          event_name: event.event_name,
          resource_urls: event.resource_urls,
          payload: event.payload
        },
        {
          auth: {
            username: webhook.auth_username,
            password
          },
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Chain-Capital-Warp/1.0'
          }
        }
      );

      // Update event as delivered
      await this.db.psp_webhook_events.update({
        where: { id: eventId },
        data: {
          status: 'delivered',
          delivered_at: new Date(),
          delivery_attempts: (event.delivery_attempts || 0) + 1,
          updated_at: new Date()
        }
      });

      // Update webhook success tracking
      await this.updateEntity<psp_webhooks>(this.db.psp_webhooks, webhook.id, {
        last_success_at: new Date(),
        retry_count: 0,
        status: 'active'
      });

      this.logInfo('Event delivered successfully', { 
        eventId,
        statusCode: response.status 
      });
    } catch (error) {
      const deliveryAttempts = (event.delivery_attempts || 0) + 1;
      const failureReason = error instanceof Error ? error.message : 'Unknown error';

      this.logError('Event delivery failed', { 
        error,
        eventId,
        attempt: deliveryAttempts 
      });

      // Update event status
      await this.db.psp_webhook_events.update({
        where: { id: eventId },
        data: {
          status: deliveryAttempts >= this.MAX_RETRY_ATTEMPTS ? 'failed' : 'pending',
          delivery_attempts: deliveryAttempts,
          updated_at: new Date()
        }
      });

      // Update webhook failure tracking
      await this.updateEntity<psp_webhooks>(this.db.psp_webhooks, webhook.id, {
        last_failure_at: new Date(),
        failure_reason: failureReason,
        retry_count: (webhook.retry_count || 0) + 1,
        status: (webhook.retry_count || 0) + 1 >= this.MAX_RETRY_ATTEMPTS ? 'failed' : webhook.status
      });

      // Schedule retry if not exceeded max attempts
      if (deliveryAttempts < this.MAX_RETRY_ATTEMPTS) {
        const delay = this.RETRY_DELAYS[deliveryAttempts - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        setTimeout(() => {
          this.deliverEvent(eventId).catch(err => {
            this.logError('Retry delivery failed', { error: err, eventId });
          });
        }, delay);
      }

      throw error;
    }
  }

  /**
   * Retry all failed event deliveries for a project
   */
  async retryFailedDeliveries(projectId: string): Promise<{
    total: number;
    retried: number;
    failed: number;
  }> {
    this.logInfo('Retrying failed deliveries', { projectId });

    const failedEvents = await this.db.psp_webhook_events.findMany({
      where: {
        project_id: projectId,
        status: 'failed',
        delivery_attempts: {
          lt: this.MAX_RETRY_ATTEMPTS
        }
      }
    });

    const total = failedEvents.length;
    let retried = 0;
    let failed = 0;

    for (const event of failedEvents) {
      try {
        await this.deliverEvent(event.id);
        retried++;
      } catch (error) {
        failed++;
        this.logError('Failed to retry event', { error, eventId: event.id });
      }
    }

    this.logInfo('Retry completed', { total, retried, failed });
    return { total, retried, failed };
  }

  /**
   * List webhook events with pagination
   */
  async listEvents(
    projectId: string,
    options: {
      eventName?: string;
      status?: 'pending' | 'delivered' | 'failed';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    events: WebhookEventResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const where: Prisma.psp_webhook_eventsWhereInput = {
      project_id: projectId
    };

    if (options.eventName) {
      where.event_name = options.eventName;
    }

    if (options.status) {
      where.status = options.status;
    }

    // Get total count
    const total = await this.db.psp_webhook_events.count({ where });

    // Get paginated events
    const records = await this.db.psp_webhook_events.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    const events = records.map(r => this.toEventResponse(r));
    const totalPages = Math.ceil(total / limit);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get webhook event log
   */
  async getEventLog(
    projectId: string,
    options: {
      eventName?: string;
      status?: 'pending' | 'delivered' | 'failed';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WebhookEventResponse[]> {
    const where: Prisma.psp_webhook_eventsWhereInput = {
      project_id: projectId
    };

    if (options.eventName) {
      where.event_name = options.eventName;
    }

    if (options.status) {
      where.status = options.status;
    }

    const events = await this.db.psp_webhook_events.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });

    return events.map(e => this.toEventResponse(e));
  }

  /**
   * Convert database record to response format
   */
  private toWebhookResponse(record: psp_webhooks): WebhookResponse {
    return {
      id: record.id,
      projectId: record.project_id,
      warpWebhookId: record.warp_webhook_id,
      callbackUrl: record.callback_url,
      authUsername: record.auth_username,
      status: record.status as 'active' | 'suspended' | 'failed',
      retryCount: record.retry_count || 0,
      lastSuccessAt: record.last_success_at,
      lastFailureAt: record.last_failure_at,
      failureReason: record.failure_reason,
      createdAt: record.created_at!,
      updatedAt: record.updated_at!
    };
  }

  /**
   * Convert event record to response format
   */
  private toEventResponse(record: psp_webhook_events): WebhookEventResponse {
    return {
      id: record.id,
      webhookId: record.webhook_id,
      projectId: record.project_id,
      eventId: record.event_id,
      eventName: record.event_name,
      resourceUrls: record.resource_urls || [],
      payload: (record.payload as Record<string, unknown>) || {},
      status: record.status as 'pending' | 'delivered' | 'failed',
      deliveryAttempts: record.delivery_attempts || 0,
      deliveredAt: record.delivered_at,
      createdAt: record.created_at!,
      updatedAt: record.updated_at!
    };
  }

  /**
   * Mark webhook as failed with failure reason
   */
  async markWebhookFailed(webhookId: string, reason: string): Promise<void> {
    const findResult = await this.findById<psp_webhooks>(this.db.psp_webhooks, webhookId);
    if (!findResult.success || !findResult.data) {
      this.logError('Webhook not found when marking as failed', { webhookId });
      return;
    }

    const webhook = findResult.data;
    const retryCount = (webhook.retry_count || 0) + 1;

    await this.updateEntity<psp_webhooks>(this.db.psp_webhooks, webhookId, {
      last_failure_at: new Date(),
      failure_reason: reason,
      retry_count: retryCount,
      status: retryCount >= this.MAX_RETRY_ATTEMPTS ? 'failed' : webhook.status,
      updated_at: new Date()
    });

    this.logInfo('Webhook marked as failed', { webhookId, reason, retryCount });
  }

  /**
   * Mark webhook as successful
   */
  async markWebhookSuccess(webhookId: string): Promise<void> {
    await this.updateEntity<psp_webhooks>(this.db.psp_webhooks, webhookId, {
      last_success_at: new Date(),
      retry_count: 0,
      failure_reason: null,
      status: 'active',
      updated_at: new Date()
    });

    this.logInfo('Webhook marked as successful', { webhookId });
  }
}

export default WebhookService;