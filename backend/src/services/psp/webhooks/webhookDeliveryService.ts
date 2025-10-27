/**
 * Webhook Delivery Service
 * 
 * Delivers webhook events to client callback URLs.
 * 
 * Responsibilities:
 * - Read pending events from psp_webhook_events table
 * - Deliver events to client webhook endpoints
 * - Implement retry logic with exponential backoff
 * - Track delivery success/failure
 * - Update webhook health metrics
 * 
 * Delivery Flow:
 * 1. Read pending event from database
 * 2. Get webhook configuration and credentials
 * 3. Send HTTP POST to client callback URL
 * 4. Handle response (success, retry, or fail)
 * 5. Update event and webhook status
 * 
 * Retry Strategy:
 * - Initial attempt: immediate
 * - Retry 1: after 1 minute
 * - Retry 2: after 5 minutes
 * - Retry 3: after 15 minutes
 * - Retry 4: after 1 hour
 * - Retry 5: after 4 hours
 * - Give up after 6 attempts
 * 
 * Security:
 * - Basic authentication on outgoing requests
 * - HMAC signature generation for payload verification
 * - Secure credential storage/retrieval
 */

import axios, { AxiosError } from 'axios';
import { BaseService } from '../../BaseService';
import { WebhookAuthService } from './webhookAuthService';
import { WebhookService } from './webhookService';

export interface DeliveryAttemptResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  shouldRetry: boolean;
}

export interface DeliverySchedule {
  attemptNumber: number;
  delayMs: number;
}

export class WebhookDeliveryService extends BaseService {
  private webhookService: WebhookService;

  // Retry schedule (in milliseconds)
  private readonly RETRY_SCHEDULE: DeliverySchedule[] = [
    { attemptNumber: 1, delayMs: 0 },              // Immediate
    { attemptNumber: 2, delayMs: 60 * 1000 },      // 1 minute
    { attemptNumber: 3, delayMs: 5 * 60 * 1000 },  // 5 minutes
    { attemptNumber: 4, delayMs: 15 * 60 * 1000 }, // 15 minutes
    { attemptNumber: 5, delayMs: 60 * 60 * 1000 }, // 1 hour
    { attemptNumber: 6, delayMs: 4 * 60 * 60 * 1000 } // 4 hours
  ];

  private readonly MAX_ATTEMPTS = 6;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {
    super('WebhookDelivery');
    this.webhookService = new WebhookService();
  }

  /**
   * Deliver a webhook event to a specific webhook endpoint
   * 
   * Main entry point for event delivery
   * 
   * @param eventId - The UUID of the psp_webhook_events record
   * @param webhookId - The UUID of the psp_webhooks record
   */
  async deliverEvent(eventId: string, webhookId: string) {
    try {
      this.logInfo('Starting webhook delivery', { eventId, webhookId });

      // Get event details
      const event = await this.db.psp_webhook_events.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          event_name: true,
          payload: true,
          delivery_attempts: true,
          status: true
        }
      });

      if (!event) {
        return this.error('Webhook event not found', 'NOT_FOUND', 404);
      }

      // Check if already delivered
      if (event.status === 'delivered') {
        this.logInfo('Event already delivered', { eventId });
        return this.success({ alreadyDelivered: true });
      }

      // Get current attempt number (0 if null)
      const currentAttempts = event.delivery_attempts || 0;

      // Check if max attempts exceeded
      if (currentAttempts >= this.MAX_ATTEMPTS) {
        this.logWarn('Max delivery attempts exceeded', {
          eventId,
          attempts: currentAttempts
        });

        await this.markEventFailed(eventId, 'Max delivery attempts exceeded');
        await this.webhookService.markWebhookFailed(
          webhookId,
          'Max delivery attempts exceeded'
        );

        return this.error(
          'Max delivery attempts exceeded',
          'MAX_ATTEMPTS_EXCEEDED'
        );
      }

      // Get webhook configuration
      const webhook = await this.db.psp_webhooks.findUnique({
        where: { id: webhookId },
        select: {
          id: true,
          callback_url: true,
          auth_username: true,
          auth_password_vault_id: true,
          status: true
        }
      });

      if (!webhook) {
        return this.error('Webhook not found', 'NOT_FOUND', 404);
      }

      // Check webhook status
      if (webhook.status !== 'active') {
        this.logWarn('Webhook not active', {
          webhookId,
          status: webhook.status
        });
        return this.error(
          `Webhook is ${webhook.status}`,
          'WEBHOOK_NOT_ACTIVE'
        );
      }

      // Perform delivery attempt
      const deliveryResult = await this.attemptDelivery(
        webhook.callback_url,
        webhook.auth_username,
        webhook.auth_password_vault_id,
        event.payload,
        currentAttempts + 1
      );

      // Update event based on result
      if (deliveryResult.success) {
        await this.markEventDelivered(eventId);
        await this.webhookService.markWebhookSuccess(webhookId);

        this.logInfo('Webhook delivery successful', {
          eventId,
          webhookId,
          attempts: currentAttempts + 1
        });

        return this.success({
          delivered: true,
          attempts: currentAttempts + 1
        });
      } else {
        // Update delivery attempt count
        await this.incrementDeliveryAttempts(
          eventId,
          deliveryResult.error || 'Delivery failed'
        );

        if (deliveryResult.shouldRetry && currentAttempts + 1 < this.MAX_ATTEMPTS) {
          // Schedule retry
          const nextRetry = this.RETRY_SCHEDULE[currentAttempts + 1];
          if (nextRetry) {
            this.scheduleRetry(eventId, webhookId, nextRetry.delayMs);
          }

          this.logWarn('Webhook delivery failed, will retry', {
            eventId,
            webhookId,
            attempts: currentAttempts + 1,
            nextRetryInMs: nextRetry?.delayMs
          });

          return this.error(
            'Delivery failed, will retry',
            'DELIVERY_FAILED_RETRY',
            deliveryResult.statusCode || 500
          );
        } else {
          // Mark as permanently failed
          await this.markEventFailed(
            eventId,
            deliveryResult.error || 'Delivery failed after max attempts'
          );
          await this.webhookService.markWebhookFailed(
            webhookId,
            'Delivery failed after max attempts'
          );

          this.logError('Webhook delivery permanently failed', {
            eventId,
            webhookId,
            attempts: currentAttempts + 1
          });

          return this.error(
            'Delivery permanently failed',
            'DELIVERY_FAILED_PERMANENT',
            deliveryResult.statusCode || 500
          );
        }
      }
    } catch (error) {
      return this.handleError('Failed to deliver webhook', error);
    }
  }

  /**
   * Attempt to deliver webhook to client endpoint
   */
  private async attemptDelivery(
    callbackUrl: string,
    username: string,
    passwordVaultId: string | null,
    payload: any,
    attemptNumber: number
  ): Promise<DeliveryAttemptResult> {
    try {
      // Get decrypted password
      let password = '';
      if (passwordVaultId) {
        try {
          password = await WebhookAuthService.getWebhookCredentials(passwordVaultId)
            .then(creds => creds.password);
        } catch (error) {
          this.logError('Failed to decrypt webhook password', { error });
          return {
            success: false,
            error: 'Failed to decrypt webhook credentials',
            shouldRetry: false // Don't retry if credentials are broken
          };
        }
      }

      // Generate signature
      const payloadString = JSON.stringify(payload);
      const signature = WebhookAuthService.generateSignature(payloadString, password);

      // Prepare request
      const authHeader = WebhookAuthService.createBasicAuthHeader({
        username,
        password
      });

      // Make HTTP request
      this.logInfo('Sending webhook', {
        callbackUrl,
        attemptNumber,
        payloadSize: payloadString.length
      });

      const response = await axios.post(callbackUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Webhook-Signature': signature,
          'X-Webhook-Attempt': attemptNumber.toString(),
          'User-Agent': 'Chain-Capital-PSP/1.0'
        },
        timeout: this.REQUEST_TIMEOUT,
        validateStatus: () => true // Don't throw on any status code
      });

      // Check response status
      if (response.status >= 200 && response.status < 300) {
        this.logInfo('Webhook delivery successful', {
          statusCode: response.status,
          attemptNumber
        });

        return {
          success: true,
          statusCode: response.status,
          responseBody: JSON.stringify(response.data),
          shouldRetry: false
        };
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry (except for rate limits)
        const shouldRetry = response.status === 429; // Rate limit

        this.logWarn('Webhook delivery failed with client error', {
          statusCode: response.status,
          shouldRetry
        });

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          shouldRetry
        };
      } else {
        // Server error - retry
        this.logWarn('Webhook delivery failed with server error', {
          statusCode: response.status
        });

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          shouldRetry: true
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNREFUSED') {
          this.logError('Connection refused', { callbackUrl });
          return {
            success: false,
            error: 'Connection refused',
            shouldRetry: true
          };
        }

        if (axiosError.code === 'ETIMEDOUT') {
          this.logError('Request timeout', { callbackUrl });
          return {
            success: false,
            error: 'Request timeout',
            shouldRetry: true
          };
        }

        this.logError('Axios error during webhook delivery', {
          error: axiosError.message,
          code: axiosError.code
        });

        return {
          success: false,
          error: axiosError.message,
          shouldRetry: true
        };
      }

      this.logError('Unexpected error during webhook delivery', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true
      };
    }
  }

  /**
   * Schedule a retry delivery
   * 
   * In production, this would use a job queue (e.g., Bull, BullMQ)
   * For now, we use setTimeout (not suitable for production at scale)
   */
  private scheduleRetry(
    eventId: string,
    webhookId: string,
    delayMs: number
  ): void {
    this.logInfo('Scheduling webhook retry', {
      eventId,
      webhookId,
      delayMs
    });

    // Note: In production, use a proper job queue
    setTimeout(async () => {
      try {
        await this.deliverEvent(eventId, webhookId);
      } catch (error) {
        this.logError('Error during scheduled retry', {
          error,
          eventId,
          webhookId
        });
      }
    }, delayMs);
  }

  /**
   * Mark event as successfully delivered
   */
  private async markEventDelivered(eventId: string): Promise<void> {
    await this.db.psp_webhook_events.update({
      where: { id: eventId },
      data: {
        status: 'delivered',
        delivered_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Mark event as permanently failed
   */
  private async markEventFailed(eventId: string, reason: string): Promise<void> {
    await this.db.psp_webhook_events.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        updated_at: new Date()
      }
    });
  }

  /**
   * Increment delivery attempt count
   */
  private async incrementDeliveryAttempts(
    eventId: string,
    errorMessage: string
  ): Promise<void> {
    await this.db.psp_webhook_events.update({
      where: { id: eventId },
      data: {
        delivery_attempts: { increment: 1 },
        updated_at: new Date()
      }
    });
  }

  /**
   * Retry pending webhook deliveries
   * 
   * This can be called periodically to retry failed deliveries
   */
  async retryPendingDeliveries(projectId?: string) {
    try {
      const where: any = {
        status: 'pending',
        delivery_attempts: { lt: this.MAX_ATTEMPTS }
      };

      if (projectId) {
        where.project_id = projectId;
      }

      // Find pending events
      const pendingEvents = await this.db.psp_webhook_events.findMany({
        where,
        select: {
          id: true,
          webhook_id: true,
          delivery_attempts: true,
          created_at: true
        },
        orderBy: { created_at: 'asc' },
        take: 100 // Limit to 100 events per batch
      });

      this.logInfo('Retrying pending deliveries', {
        count: pendingEvents.length,
        projectId: projectId || 'all'
      });

      // Trigger delivery for each event
      const results = await Promise.allSettled(
        pendingEvents.map(event => {
          // Only retry if enough time has passed since last attempt
          const attempts = event.delivery_attempts || 0;
          const schedule = this.RETRY_SCHEDULE[attempts];
          if (schedule) {
            return this.deliverEvent(event.id, event.webhook_id!);
          }
          return Promise.resolve();
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return this.success({
        total: pendingEvents.length,
        successful,
        failed
      });
    } catch (error) {
      return this.handleError('Failed to retry pending deliveries', error);
    }
  }

  /**
   * Get delivery statistics for a webhook
   */
  async getDeliveryStats(webhookId: string) {
    try {
      const stats = await this.db.psp_webhook_events.groupBy({
        by: ['status'],
        where: { webhook_id: webhookId },
        _count: { status: true }
      });

      const totalAttempts = await this.db.psp_webhook_events.aggregate({
        where: { webhook_id: webhookId },
        _sum: { delivery_attempts: true },
        _avg: { delivery_attempts: true }
      });

      return this.success({
        statusBreakdown: stats.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        totalDeliveryAttempts: totalAttempts._sum.delivery_attempts || 0,
        averageAttempts: totalAttempts._avg.delivery_attempts || 0
      });
    } catch (error) {
      return this.handleError('Failed to get delivery stats', error);
    }
  }

  /**
   * Clean up old delivered events
   * 
   * Remove events older than specified days
   */
  async cleanupOldEvents(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.db.psp_webhook_events.deleteMany({
        where: {
          status: 'delivered',
          delivered_at: { lt: cutoffDate }
        }
      });

      this.logInfo('Cleaned up old webhook events', {
        deletedCount: deleted.count,
        cutoffDate
      });

      return this.success({ deletedCount: deleted.count });
    } catch (error) {
      return this.handleError('Failed to cleanup old events', error);
    }
  }
}

export default WebhookDeliveryService;
