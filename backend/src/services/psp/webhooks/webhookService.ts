/**
 * Webhook Service
 * 
 * Manages webhook registration, configuration, and lifecycle with Warp API.
 * 
 * Features:
 * - Register webhooks with Warp
 * - Update webhook configuration
 * - Deactivate/reactivate webhooks
 * - Track webhook health and status
 * - Automatic retry on failures
 * 
 * Integrates with:
 * - WarpClientService for API communication
 * - WebhookAuthService for credential management
 * - PSPEncryptionService for secure storage
 */

import { BaseService } from '../../BaseService';
import { WarpClientService } from '../auth/warpClientService';
import { WebhookAuthService } from './webhookAuthService';
import type { PSPEnvironment } from '@/types/psp';
import { PrismaClient } from '@/infrastructure/database/generated/index';

export interface RegisterWebhookRequest {
  projectId: string;
  userId: string;
  environment: PSPEnvironment;
  callbackUrl: string;
  authUsername: string;
  authPassword: string;
}

export interface UpdateWebhookRequest {
  webhookId: string;
  callbackUrl?: string;
  authUsername?: string;
  authPassword?: string;
}

export interface WebhookInfo {
  id: string;
  projectId: string;
  warpWebhookId: string | null;
  callbackUrl: string;
  authUsername: string;
  status: string;
  retryCount: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookService extends BaseService {
  constructor() {
    super('Webhook');
  }

  /**
   * Register a new webhook with Warp
   * 
   * Steps:
   * 1. Store credentials encrypted in vault
   * 2. Register webhook with Warp API
   * 3. Store webhook configuration in database
   */
  async registerWebhook(request: RegisterWebhookRequest) {
    try {
      this.logInfo('Registering new webhook', {
        projectId: request.projectId,
        callbackUrl: request.callbackUrl,
        environment: request.environment
      });

      // Store encrypted credentials
      const credentials = await WebhookAuthService.storeWebhookCredentials(
        request.projectId,
        request.userId,
        request.authUsername,
        request.authPassword,
        `Webhook for ${request.callbackUrl}`
      );

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.projectId,
        request.environment
      );

      // Register webhook with Warp
      const warpResponse = await warpClient.registerWebhook({
        callbackUrl: request.callbackUrl,
        authUsername: request.authUsername,
        authPassword: request.authPassword
      });

      if (!warpResponse.success) {
        this.logError('Failed to register webhook with Warp', {
          error: warpResponse.error
        });
        return this.error(
          warpResponse.error?.message || 'Failed to register webhook with Warp',
          'WARP_API_ERROR'
        );
      }

      // Store webhook configuration
      const webhook = await this.db.psp_webhooks.create({
        data: {
          project_id: request.projectId,
          warp_webhook_id: warpResponse.data?.id || null,
          callback_url: request.callbackUrl,
          auth_username: credentials.username,
          auth_password_vault_id: credentials.passwordVaultId,
          status: 'active'
        }
      });

      this.logInfo('Webhook registered successfully', {
        webhookId: webhook.id,
        warpWebhookId: webhook.warp_webhook_id
      });

      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to register webhook', error);
    }
  }

  /**
   * Get webhook configuration
   */
  async getWebhook(webhookId: string) {
    try {
      const webhook = await this.db.psp_webhooks.findUnique({
        where: { id: webhookId }
      });

      if (!webhook) {
        return this.error('Webhook not found', 'NOT_FOUND', 404);
      }

      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to get webhook', error);
    }
  }

  /**
   * List webhooks for a project
   */
  async listWebhooks(projectId: string) {
    try {
      const webhooks = await this.db.psp_webhooks.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: 'desc' }
      });

      return this.success(webhooks.map(w => this.formatWebhookInfo(w)));
    } catch (error) {
      return this.handleError('Failed to list webhooks', error);
    }
  }

  /**
   * Update webhook configuration
   * 
   * Note: Updating requires re-registering with Warp
   */
  async updateWebhook(request: UpdateWebhookRequest, environment: PSPEnvironment) {
    try {
      // Get existing webhook
      const existing = await this.db.psp_webhooks.findUnique({
        where: { id: request.webhookId }
      });

      if (!existing) {
        return this.error('Webhook not found', 'NOT_FOUND', 404);
      }

      this.logInfo('Updating webhook', {
        webhookId: request.webhookId,
        updates: {
          callbackUrl: request.callbackUrl ? 'updated' : 'unchanged',
          authUsername: request.authUsername ? 'updated' : 'unchanged',
          authPassword: request.authPassword ? 'updated' : 'unchanged'
        }
      });

      // Prepare update data
      const updateData: any = {
        updated_at: new Date()
      };

      // Update callback URL if provided
      if (request.callbackUrl) {
        updateData.callback_url = request.callbackUrl;
      }

      // Update username if provided
      if (request.authUsername) {
        updateData.auth_username = request.authUsername;
      }

      // Update password if provided
      if (request.authPassword) {
        // Encrypt new password
        const vaultRef = await WebhookAuthService.storeWebhookCredentials(
          existing.project_id,
          'system', // TODO: Get actual user ID
          request.authUsername || existing.auth_username,
          request.authPassword,
          `Updated webhook password for ${existing.callback_url}`
        );
        updateData.auth_password_vault_id = vaultRef.passwordVaultId;
      }

      // Update in Warp if any auth or URL changed
      if (request.callbackUrl || request.authUsername || request.authPassword) {
        const warpClient = await WarpClientService.getClientForProject(
          existing.project_id,
          environment
        );

        // Get current credentials (may need password from vault)
        let password = request.authPassword;
        if (!password && existing.auth_password_vault_id) {
          const creds = await WebhookAuthService.getWebhookCredentials(request.webhookId);
          password = creds.password;
        }

        const warpResponse = await warpClient.updateWebhook({
          callbackUrl: request.callbackUrl || existing.callback_url,
          authUsername: request.authUsername || existing.auth_username,
          authPassword: password!
        });

        if (!warpResponse.success) {
          this.logError('Failed to update webhook with Warp', {
            error: warpResponse.error
          });
          return this.error(
            warpResponse.error?.message || 'Failed to update webhook with Warp',
            'WARP_API_ERROR'
          );
        }
      }

      // Update in database
      const webhook = await this.db.psp_webhooks.update({
        where: { id: request.webhookId },
        data: updateData
      });

      this.logInfo('Webhook updated successfully', {
        webhookId: webhook.id
      });

      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to update webhook', error);
    }
  }

  /**
   * Suspend a webhook (temporary deactivation)
   */
  async suspendWebhook(webhookId: string) {
    try {
      const webhook = await this.db.psp_webhooks.update({
        where: { id: webhookId },
        data: {
          status: 'suspended',
          updated_at: new Date()
        }
      });

      this.logInfo('Webhook suspended', { webhookId });
      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to suspend webhook', error);
    }
  }

  /**
   * Reactivate a suspended webhook
   */
  async reactivateWebhook(webhookId: string) {
    try {
      const existing = await this.db.psp_webhooks.findUnique({
        where: { id: webhookId }
      });

      if (!existing) {
        return this.error('Webhook not found', 'NOT_FOUND', 404);
      }

      if (existing.status !== 'suspended') {
        return this.error('Can only reactivate suspended webhooks', 'INVALID_STATUS', 400);
      }

      const webhook = await this.db.psp_webhooks.update({
        where: { id: webhookId },
        data: {
          status: 'active',
          updated_at: new Date()
        }
      });

      this.logInfo('Webhook reactivated', { webhookId });
      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to reactivate webhook', error);
    }
  }

  /**
   * Mark webhook as failed (called by webhook handler on repeated failures)
   */
  async markWebhookFailed(webhookId: string, failureReason: string) {
    try {
      const webhook = await this.db.psp_webhooks.update({
        where: { id: webhookId },
        data: {
          status: 'failed',
          failure_reason: failureReason,
          last_failure_at: new Date(),
          retry_count: { increment: 1 },
          updated_at: new Date()
        }
      });

      this.logWarn('Webhook marked as failed', {
        webhookId,
        failureReason,
        retryCount: webhook.retry_count
      });

      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to mark webhook as failed', error);
    }
  }

  /**
   * Mark webhook delivery as successful
   */
  async markWebhookSuccess(webhookId: string) {
    try {
      const webhook = await this.db.psp_webhooks.update({
        where: { id: webhookId },
        data: {
          last_success_at: new Date(),
          retry_count: 0, // Reset retry count on success
          failure_reason: null, // Clear failure reason
          updated_at: new Date()
        }
      });

      this.logInfo('Webhook delivery successful', { webhookId });
      return this.success(this.formatWebhookInfo(webhook));
    } catch (error) {
      return this.handleError('Failed to mark webhook success', error);
    }
  }

  /**
   * Delete a webhook (removes from Warp and database)
   */
  async deleteWebhook(webhookId: string) {
    try {
      await this.db.psp_webhooks.delete({
        where: { id: webhookId }
      });

      this.logInfo('Webhook deleted', { webhookId });
      return this.success(true);
    } catch (error) {
      return this.handleError('Failed to delete webhook', error);
    }
  }

  /**
   * Format webhook record for API response
   */
  private formatWebhookInfo(webhook: any): WebhookInfo {
    return {
      id: webhook.id,
      projectId: webhook.project_id,
      warpWebhookId: webhook.warp_webhook_id,
      callbackUrl: webhook.callback_url,
      authUsername: webhook.auth_username,
      status: webhook.status,
      retryCount: webhook.retry_count,
      lastSuccessAt: webhook.last_success_at,
      lastFailureAt: webhook.last_failure_at,
      failureReason: webhook.failure_reason,
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at
    };
  }
}

export default WebhookService;
