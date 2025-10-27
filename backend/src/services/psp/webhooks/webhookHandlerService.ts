/**
 * Webhook Handler Service
 * 
 * Processes incoming webhook events from Warp API.
 * 
 * Responsibilities:
 * - Validate webhook signatures from Warp
 * - Store webhook events in psp_webhook_events table
 * - Prevent duplicate event processing
 * - Trigger downstream event processing
 * - Handle various Warp event types
 * 
 * Event Flow:
 * 1. Warp sends webhook to our endpoint
 * 2. Validate signature and authentication
 * 3. Check for duplicate events (by event_id)
 * 4. Store event in database
 * 5. Trigger delivery to client webhooks
 * 
 * Security:
 * - Signature verification (HMAC-SHA256)
 * - Event ID deduplication
 * - Rate limiting at route level
 */

import { BaseService } from '../../BaseService';
import { WebhookAuthService } from './webhookAuthService';
import { WebhookDeliveryService } from './webhookDeliveryService';
import type { 
  WebhookEventName, 
  WarpWebhookEventPayload 
} from '@/types/psp';

export interface IncomingWebhookRequest {
  signature?: string;
  payload: WarpWebhookEventPayload;
  webhookId?: string; // Optional: if webhook-specific endpoint
  projectId?: string; // Optional: if project-specific endpoint
}

export interface WebhookProcessingResult {
  eventId: string;
  eventName: WebhookEventName;
  status: 'processed' | 'duplicate' | 'invalid';
  stored: boolean;
  deliveryTriggered: boolean;
}

export class WebhookHandlerService extends BaseService {
  private deliveryService: WebhookDeliveryService;

  constructor() {
    super('WebhookHandler');
    this.deliveryService = new WebhookDeliveryService();
  }

  /**
   * Process incoming webhook from Warp
   * 
   * Main entry point for webhook processing
   * 
   * @param request - Incoming webhook data
   * @returns Processing result with event details
   */
  async processIncomingWebhook(request: IncomingWebhookRequest) {
    try {
      const { payload, signature, webhookId, projectId } = request;

      this.logInfo('Processing incoming webhook', {
        eventId: payload.id,
        eventName: payload.eventName,
        webhookId,
        projectId
      });

      // Validate event payload structure
      const validationResult = this.validateEventPayload(payload);
      if (!validationResult.valid) {
        return this.error(validationResult.error!, 'INVALID_PAYLOAD', 400);
      }

      // Verify signature if provided
      if (signature && webhookId) {
        const signatureValid = await this.verifyWebhookSignature(
          webhookId,
          payload,
          signature
        );

        if (!signatureValid) {
          this.logWarn('Webhook signature verification failed', {
            eventId: payload.id,
            webhookId
          });
          return this.error('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
        }
      }

      // Check for duplicate event
      const isDuplicate = await this.checkDuplicateEvent(payload.id);
      if (isDuplicate) {
        this.logInfo('Duplicate webhook event detected', {
          eventId: payload.id
        });

        return this.success<WebhookProcessingResult>({
          eventId: payload.id,
          eventName: payload.eventName,
          status: 'duplicate',
          stored: false,
          deliveryTriggered: false
        });
      }

      // Determine project ID if not provided
      let effectiveProjectId = projectId;
      if (!effectiveProjectId && webhookId) {
        effectiveProjectId = await this.getProjectIdFromWebhook(webhookId) ?? undefined;
      }

      if (!effectiveProjectId) {
        return this.error('Unable to determine project ID', 'MISSING_PROJECT', 400);
      }

      // Store webhook event
      const storedEvent = await this.storeWebhookEvent({
        eventId: payload.id,
        eventName: payload.eventName,
        resourceUrls: payload.resources,
        payload: payload,
        projectId: effectiveProjectId,
        webhookId: webhookId || undefined
      });

      if (!storedEvent.success) {
        return storedEvent;
      }

      // Trigger delivery to client webhooks (asynchronous)
      const deliveryResult = await this.triggerEventDelivery(
        storedEvent.data.id,
        effectiveProjectId
      );

      return this.success<WebhookProcessingResult>({
        eventId: payload.id,
        eventName: payload.eventName,
        status: 'processed',
        stored: true,
        deliveryTriggered: deliveryResult.success
      });
    } catch (error) {
      return this.handleError('Failed to process webhook', error);
    }
  }

  /**
   * Validate webhook event payload structure
   */
  private validateEventPayload(payload: any): { valid: boolean; error?: string } {
    if (!payload) {
      return { valid: false, error: 'Missing payload' };
    }

    if (!payload.id) {
      return { valid: false, error: 'Missing event ID' };
    }

    if (!payload.eventName) {
      return { valid: false, error: 'Missing event name' };
    }

    if (!Array.isArray(payload.resources)) {
      return { valid: false, error: 'Missing or invalid resources array' };
    }

    return { valid: true };
  }

  /**
   * Verify webhook signature from Warp
   */
  private async verifyWebhookSignature(
    webhookId: string,
    payload: WarpWebhookEventPayload,
    providedSignature: string
  ): Promise<boolean> {
    try {
      // Get webhook credentials
      const credentials = await WebhookAuthService.getWebhookCredentials(webhookId);

      // Use password as shared secret for signature verification
      const payloadString = JSON.stringify(payload);
      const verificationResult = WebhookAuthService.verifySignature(
        payloadString,
        providedSignature,
        credentials.password
      );

      return verificationResult.valid;
    } catch (error) {
      this.logError('Error verifying webhook signature', { error, webhookId });
      return false;
    }
  }

  /**
   * Check if webhook event has already been processed
   * 
   * Prevents duplicate processing by checking event_id
   */
  private async checkDuplicateEvent(eventId: string): Promise<boolean> {
    try {
      const existing = await this.db.psp_webhook_events.findFirst({
        where: { event_id: eventId },
        select: { id: true }
      });

      return !!existing;
    } catch (error) {
      this.logError('Error checking for duplicate event', { error, eventId });
      // On error, allow processing to prevent blocking
      return false;
    }
  }

  /**
   * Get project ID from webhook configuration
   */
  private async getProjectIdFromWebhook(webhookId: string): Promise<string | null> {
    try {
      const webhook = await this.db.psp_webhooks.findUnique({
        where: { id: webhookId },
        select: { project_id: true }
      });

      return webhook?.project_id || null;
    } catch (error) {
      this.logError('Error getting project ID from webhook', { error, webhookId });
      return null;
    }
  }

  /**
   * Store webhook event in database
   */
  private async storeWebhookEvent(data: {
    eventId: string;
    eventName: WebhookEventName;
    resourceUrls: string[];
    payload: any;
    projectId: string;
    webhookId?: string;
  }) {
    try {
      const event = await this.db.psp_webhook_events.create({
        data: {
          event_id: data.eventId,
          event_name: data.eventName,
          resource_urls: data.resourceUrls,
          payload: data.payload,
          project_id: data.projectId,
          webhook_id: data.webhookId || null,
          status: 'pending',
          delivery_attempts: 0
        }
      });

      this.logInfo('Webhook event stored', {
        eventId: data.eventId,
        storedId: event.id,
        eventName: data.eventName
      });

      return this.success(event);
    } catch (error) {
      return this.handleError('Failed to store webhook event', error);
    }
  }

  /**
   * Trigger delivery of event to client webhooks
   * 
   * Finds all active webhooks for the project and queues delivery
   */
  private async triggerEventDelivery(eventId: string, projectId: string) {
    try {
      // Find active webhooks for this project
      const webhooks = await this.db.psp_webhooks.findMany({
        where: {
          project_id: projectId,
          status: 'active'
        },
        select: {
          id: true,
          callback_url: true
        }
      });

      if (webhooks.length === 0) {
        this.logInfo('No active webhooks found for project', { projectId });
        return this.success({ webhooksTriggered: 0 });
      }

      this.logInfo('Triggering webhook delivery', {
        eventId,
        projectId,
        webhookCount: webhooks.length
      });

      // Trigger delivery for each webhook (fire and forget)
      const deliveryPromises = webhooks.map(webhook =>
        this.deliveryService.deliverEvent(eventId, webhook.id)
          .catch(error => {
            this.logError('Error triggering webhook delivery', {
              error,
              eventId,
              webhookId: webhook.id
            });
          })
      );

      // Wait for all deliveries to be triggered (not completed)
      await Promise.allSettled(deliveryPromises);

      return this.success({ webhooksTriggered: webhooks.length });
    } catch (error) {
      return this.handleError('Failed to trigger event delivery', error);
    }
  }

  /**
   * Process event by type (for specialized handling)
   * 
   * This can be extended to handle different event types differently
   */
  async processEventByType(
    eventId: string,
    eventName: WebhookEventName,
    payload: any
  ) {
    try {
      this.logInfo('Processing event by type', { eventId, eventName });

      switch (eventName) {
        case 'Payment.Completed':
          return await this.processPaymentCompleted(eventId, payload);

        case 'Payment.Failed':
          return await this.processPaymentFailed(eventId, payload);

        case 'DEPOSIT_RECEIVED':
          return await this.processDepositReceived(eventId, payload);

        case 'DEPOSIT_REJECTED':
          return await this.processDepositRejected(eventId, payload);

        case 'Account.Status.Changed':
          return await this.processAccountStatusChanged(eventId, payload);

        default:
          // Generic handling for unknown event types
          this.logInfo('Handling unknown event type generically', {
            eventId,
            eventName
          });
          return this.success({ processed: true, specialized: false });
      }
    } catch (error) {
      return this.handleError('Failed to process event by type', error);
    }
  }

  /**
   * Handle Payment.Completed event
   */
  private async processPaymentCompleted(eventId: string, payload: any) {
    // Update payment status in database
    // Trigger any post-completion workflows
    // This is a placeholder for domain-specific logic

    this.logInfo('Processing Payment.Completed event', { eventId });
    return this.success({ eventType: 'Payment.Completed', processed: true });
  }

  /**
   * Handle Payment.Failed event
   */
  private async processPaymentFailed(eventId: string, payload: any) {
    this.logInfo('Processing Payment.Failed event', { eventId });
    return this.success({ eventType: 'Payment.Failed', processed: true });
  }

  /**
   * Handle DEPOSIT_RECEIVED event
   */
  private async processDepositReceived(eventId: string, payload: any) {
    this.logInfo('Processing DEPOSIT_RECEIVED event', { eventId });
    return this.success({ eventType: 'DEPOSIT_RECEIVED', processed: true });
  }

  /**
   * Handle DEPOSIT_REJECTED event
   */
  private async processDepositRejected(eventId: string, payload: any) {
    this.logInfo('Processing DEPOSIT_REJECTED event', { eventId });
    return this.success({ eventType: 'DEPOSIT_REJECTED', processed: true });
  }

  /**
   * Handle Account.Status.Changed event
   */
  private async processAccountStatusChanged(eventId: string, payload: any) {
    this.logInfo('Processing Account.Status.Changed event', { eventId });
    return this.success({ eventType: 'Account.Status.Changed', processed: true });
  }

  /**
   * Get webhook event by ID
   */
  async getWebhookEvent(eventId: string) {
    try {
      const event = await this.db.psp_webhook_events.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return this.error('Webhook event not found', 'NOT_FOUND', 404);
      }

      return this.success(event);
    } catch (error) {
      return this.handleError('Failed to get webhook event', error);
    }
  }

  /**
   * List webhook events for a project
   */
  async listWebhookEvents(
    projectId: string,
    options?: {
      eventName?: WebhookEventName;
      status?: 'pending' | 'delivered' | 'failed';
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = { project_id: projectId };

      if (options?.eventName) {
        where.event_name = options.eventName;
      }

      if (options?.status) {
        where.status = options.status;
      }

      const events = await this.db.psp_webhook_events.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      });

      const total = await this.db.psp_webhook_events.count({ where });

      return this.success({
        events,
        pagination: {
          total,
          limit: options?.limit || 50,
          offset: options?.offset || 0
        }
      });
    } catch (error) {
      return this.handleError('Failed to list webhook events', error);
    }
  }
}

export default WebhookHandlerService;
