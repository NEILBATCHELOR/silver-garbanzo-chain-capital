/**
 * DFNS Webhook Service
 * 
 * Comprehensive webhook management service for DFNS integration
 * Supports current DFNS Webhook API with full CRUD operations
 * 
 * Features:
 * - Create, read, update, delete webhooks
 * - Event subscription management
 * - Webhook validation and testing
 * - Database synchronization
 * - User Action Signing support
 * - HMAC signature verification
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type { 
  DfnsCreateWebhookRequest,
  DfnsCreateWebhookResponse,
  DfnsGetWebhookResponse,
  DfnsListWebhooksRequest,
  DfnsListWebhooksResponse,
  DfnsUpdateWebhookRequest,
  DfnsUpdateWebhookResponse,
  DfnsDeleteWebhookResponse,
  DfnsPingWebhookResponse,
  DfnsWebhookEvent,
  DfnsWebhookStatus,
  WebhookConfig,
  WebhookSummary,
  WebhookCreationOptions,
  WebhookServiceOptions,
  WebhookUrlValidation,
  WebhookSignatureVerification
} from '../../types/dfns/webhooks';
import { DfnsError, DfnsAuthenticationError } from '../../types/dfns/errors';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/core/database';

// Database client for webhook operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * DFNS Webhook Service
 * 
 * Manages DFNS webhooks using current API methods and authentication patterns
 */
export class DfnsWebhookService {
  private client: WorkingDfnsClient;
  private options: WebhookServiceOptions;

  constructor(client: WorkingDfnsClient, options: WebhookServiceOptions = {}) {
    this.client = client;
    this.options = {
      enableDatabaseSync: true,
      enableEventLogging: true,
      validateWebhookUrls: true,
      autoRetryFailedDeliveries: false,
      ...options
    };
  }

  // ==============================================
  // WEBHOOK CRUD OPERATIONS
  // ==============================================

  /**
   * Create a new webhook with User Action Signing
   * 
   * @param request - Webhook creation request
   * @param userActionToken - Optional User Action token for sensitive operations
   * @param options - Creation options
   * @returns Created webhook with secret
   */
  async createWebhook(
    request: DfnsCreateWebhookRequest,
    userActionToken?: string,
    options: WebhookCreationOptions = {}
  ): Promise<DfnsCreateWebhookResponse> {
    try {
      // Validate webhook URL format
      if (this.options.validateWebhookUrls && !this.isValidWebhookUrl(request.url)) {
        throw new DfnsError('INVALID_WEBHOOK_URL', `Invalid webhook URL format: ${request.url}`);
      }

      // Validate events array
      if (!this.validateWebhookEvents(request.events)) {
        throw new DfnsError('INVALID_WEBHOOK_EVENTS', 'Invalid webhook events configuration');
      }

      // Test webhook URL accessibility if requested
      if (options.validateUrl) {
        const validation = await this.validateWebhookUrl(request.url);
        if (!validation.isReachable) {
          throw new DfnsError('WEBHOOK_URL_UNREACHABLE', `Webhook URL is not reachable: ${validation.error}`);
        }
      }

      console.log('🎣 Creating DFNS webhook:', {
        url: request.url,
        eventCount: request.events.length,
        description: request.description
      });

      // Make authenticated request to DFNS API
      const response = await this.client.makeRequest<DfnsCreateWebhookResponse>(
        'POST',
        '/webhooks',
        request,
        userActionToken
      );

      console.log('✅ DFNS webhook created successfully:', {
        id: response.id,
        url: response.url,
        secretProvided: !!response.secret
      });

      // Sync to database if enabled
      if (options.syncToDatabase !== false && this.options.enableDatabaseSync) {
        await this.syncWebhookToDatabase(response);
      }

      // Test webhook with ping if requested
      if (options.testWebhook) {
        try {
          await this.pingWebhook(response.id);
          console.log('🔔 Webhook ping test successful');
        } catch (error) {
          console.warn('⚠️ Webhook ping test failed:', error);
          // Don't fail creation if ping fails
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to create DFNS webhook:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      // Handle specific DFNS API errors
      if (error instanceof Error) {
        if (error.message.includes('webhook limit')) {
          throw new DfnsError('WEBHOOK_LIMIT_EXCEEDED', 'Organization webhook limit exceeded (5 max)');
        }
        if (error.message.includes('permission')) {
          throw new DfnsAuthenticationError('Webhooks:Create permission required', { code: 'INSUFFICIENT_PERMISSIONS' });
        }
      }
      
      throw new DfnsError('WEBHOOK_CREATION_FAILED', `Failed to create webhook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get webhook details by ID
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Webhook details (without secret)
   */
  async getWebhook(webhookId: string): Promise<DfnsGetWebhookResponse> {
    try {
      console.log('🔍 Getting DFNS webhook:', webhookId);

      const response = await this.client.makeRequest<DfnsGetWebhookResponse>(
        'GET',
        `/webhooks/${webhookId}`
      );

      console.log('✅ DFNS webhook retrieved:', {
        id: response.id,
        url: response.url,
        status: response.status,
        eventCount: response.events.length
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to get DFNS webhook:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw new DfnsError('WEBHOOK_NOT_FOUND', `Webhook not found: ${webhookId}`);
      }
      
      throw new DfnsError('WEBHOOK_FETCH_FAILED', `Failed to get webhook: ${error}`);
    }
  }

  /**
   * List all webhooks with pagination
   * 
   * @param request - List request with pagination
   * @returns Paginated webhook list
   */
  async listWebhooks(request: DfnsListWebhooksRequest = {}): Promise<DfnsListWebhooksResponse> {
    try {
      console.log('📋 Listing DFNS webhooks:', request);

      const queryParams = new URLSearchParams();
      if (request.limit) queryParams.append('limit', request.limit.toString());
      if (request.paginationToken) queryParams.append('paginationToken', request.paginationToken);

      const endpoint = `/webhooks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.client.makeRequest<DfnsListWebhooksResponse>(
        'GET',
        endpoint
      );

      console.log('✅ DFNS webhooks listed:', {
        count: response.items.length,
        hasNextPage: !!response.nextPageToken
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to list DFNS webhooks:', error);
      throw new DfnsError('WEBHOOK_LIST_FAILED', `Failed to list webhooks: ${error}`);
    }
  }

  /**
   * Update webhook configuration with User Action Signing
   * 
   * @param webhookId - DFNS webhook ID
   * @param request - Update request
   * @param userActionToken - Optional User Action token
   * @returns Updated webhook details
   */
  async updateWebhook(
    webhookId: string,
    request: DfnsUpdateWebhookRequest,
    userActionToken?: string
  ): Promise<DfnsUpdateWebhookResponse> {
    try {
      // Validate webhook URL if provided
      if (request.url && this.options.validateWebhookUrls && !this.isValidWebhookUrl(request.url)) {
        throw new DfnsError('INVALID_WEBHOOK_URL', `Invalid webhook URL format: ${request.url}`);
      }

      // Validate events array if provided
      if (request.events && !this.validateWebhookEvents(request.events)) {
        throw new DfnsError('INVALID_WEBHOOK_EVENTS', 'Invalid webhook events configuration');
      }

      console.log('🔄 Updating DFNS webhook:', {
        webhookId,
        updates: Object.keys(request)
      });

      const response = await this.client.makeRequest<DfnsUpdateWebhookResponse>(
        'PUT',
        `/webhooks/${webhookId}`,
        request,
        userActionToken
      );

      console.log('✅ DFNS webhook updated successfully:', {
        id: response.id,
        status: response.status
      });

      // Sync to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.updateWebhookInDatabase(webhookId, response);
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to update DFNS webhook:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw new DfnsError('WEBHOOK_NOT_FOUND', `Webhook not found: ${webhookId}`);
      }
      
      throw new DfnsError('WEBHOOK_UPDATE_FAILED', `Failed to update webhook: ${error}`);
    }
  }

  /**
   * Delete webhook with User Action Signing
   * 
   * @param webhookId - DFNS webhook ID
   * @param userActionToken - Optional User Action token
   * @returns Deletion confirmation
   */
  async deleteWebhook(
    webhookId: string,
    userActionToken?: string
  ): Promise<DfnsDeleteWebhookResponse> {
    try {
      console.log('🗑️ Deleting DFNS webhook:', webhookId);

      const response = await this.client.makeRequest<DfnsDeleteWebhookResponse>(
        'DELETE',
        `/webhooks/${webhookId}`,
        undefined,
        userActionToken
      );

      console.log('✅ DFNS webhook deleted successfully:', webhookId);

      // Remove from database if enabled
      if (this.options.enableDatabaseSync) {
        await this.removeWebhookFromDatabase(webhookId);
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to delete DFNS webhook:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw new DfnsError('WEBHOOK_NOT_FOUND', `Webhook not found: ${webhookId}`);
      }
      
      throw new DfnsError('WEBHOOK_DELETE_FAILED', `Failed to delete webhook: ${error}`);
    }
  }

  /**
   * Ping webhook to test connectivity
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Ping response with status
   */
  async pingWebhook(webhookId: string): Promise<DfnsPingWebhookResponse> {
    try {
      console.log('🔔 Pinging DFNS webhook:', webhookId);

      const response = await this.client.makeRequest<DfnsPingWebhookResponse>(
        'POST',
        `/webhooks/${webhookId}/ping`
      );

      console.log('✅ DFNS webhook ping response:', {
        webhookId,
        status: response.status,
        hasError: !!response.error
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to ping DFNS webhook:', error);
      throw new DfnsError('WEBHOOK_PING_FAILED', `Failed to ping webhook: ${error}`);
    }
  }

  // ==============================================
  // WEBHOOK MANAGEMENT CONVENIENCE METHODS
  // ==============================================

  /**
   * Get all webhooks for dashboard overview
   * 
   * @returns Array of webhook summaries
   */
  async getAllWebhookSummaries(): Promise<WebhookSummary[]> {
    try {
      const webhooks = await this.listWebhooks({ limit: 50 });
      const summaries: WebhookSummary[] = [];

      for (const webhook of webhooks.items) {
        try {
          const summary = await this.getWebhookSummary(webhook.id);
          summaries.push(summary);
        } catch (error) {
          console.warn(`⚠️ Failed to get summary for webhook ${webhook.id}:`, error);
          // Create basic summary from webhook data
          summaries.push({
            webhookId: webhook.id,
            url: webhook.url,
            status: webhook.status,
            isActive: webhook.status === 'Enabled',
            eventCount: 0,
            eventTypes: webhook.events,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            description: webhook.description,
            dateCreated: webhook.dateCreated,
            dateUpdated: webhook.dateUpdated
          });
        }
      }

      return summaries;
    } catch (error) {
      console.error('❌ Failed to get webhook summaries:', error);
      throw new DfnsError('WEBHOOK_SUMMARIES_FAILED', `Failed to get webhook summaries: ${error}`);
    }
  }

  /**
   * Get comprehensive webhook summary with analytics
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Webhook summary with metrics
   */
  async getWebhookSummary(webhookId: string): Promise<WebhookSummary> {
    try {
      // Get webhook details from DFNS
      const webhook = await this.getWebhook(webhookId);
      
      // Get analytics from database if available
      let analytics: {
        eventCount: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        lastEventAt?: string;
        lastSuccessfulDeliveryAt?: string;
      } = {
        eventCount: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0
      };

      if (this.options.enableDatabaseSync) {
        try {
          analytics = await this.getWebhookAnalytics(webhookId);
        } catch (error) {
          console.warn(`⚠️ Failed to get analytics for webhook ${webhookId}:`, error);
        }
      }

      return {
        webhookId: webhook.id,
        url: webhook.url,
        status: webhook.status,
        isActive: webhook.status === 'Enabled',
        eventTypes: webhook.events,
        description: webhook.description,
        dateCreated: webhook.dateCreated,
        dateUpdated: webhook.dateUpdated,
        ...analytics
      };
    } catch (error) {
      console.error(`❌ Failed to get webhook summary for ${webhookId}:`, error);
      throw new DfnsError('WEBHOOK_SUMMARY_FAILED', `Failed to get webhook summary: ${error}`);
    }
  }

  /**
   * Alias for getWebhookSummary (component compatibility)
   */
  async getWebhooksSummary(webhookId: string): Promise<WebhookSummary> {
    return this.getWebhookSummary(webhookId);
  }

  /**
   * Get webhook events summary (alias for webhook events analytics)
   */
  async getWebhookEventsSummary(webhookId: string) {
    return this.getWebhookAnalytics(webhookId);
  }

  /**
   * Create webhook for specific events with validation
   * 
   * @param url - Webhook endpoint URL
   * @param events - Array of event types to subscribe to
   * @param description - Optional description
   * @param userActionToken - Optional User Action token
   * @returns Created webhook
   */
  async createEventWebhook(
    url: string,
    events: DfnsWebhookEvent[],
    description?: string,
    userActionToken?: string
  ): Promise<DfnsCreateWebhookResponse> {
    const request: DfnsCreateWebhookRequest = {
      url,
      events,
      description,
      status: 'Enabled'
    };

    return this.createWebhook(request, userActionToken, {
      validateUrl: true,
      testWebhook: true,
      syncToDatabase: true
    });
  }

  /**
   * Toggle webhook status (enable/disable)
   * 
   * @param webhookId - DFNS webhook ID
   * @param userActionToken - Optional User Action token
   * @returns Updated webhook
   */
  async toggleWebhookStatus(
    webhookId: string,
    userActionToken?: string
  ): Promise<DfnsUpdateWebhookResponse> {
    try {
      const webhook = await this.getWebhook(webhookId);
      const newStatus: DfnsWebhookStatus = webhook.status === 'Enabled' ? 'Disabled' : 'Enabled';

      return this.updateWebhook(webhookId, { status: newStatus }, userActionToken);
    } catch (error) {
      console.error(`❌ Failed to toggle webhook status for ${webhookId}:`, error);
      throw new DfnsError('WEBHOOK_TOGGLE_FAILED', `Failed to toggle webhook status: ${error}`);
    }
  }

  // ==============================================
  // WEBHOOK VALIDATION AND SECURITY
  // ==============================================

  /**
   * Validate webhook URL format and accessibility
   * 
   * @param url - Webhook URL to validate
   * @returns Validation result
   */
  async validateWebhookUrl(url: string): Promise<WebhookUrlValidation> {
    const result: WebhookUrlValidation = {
      url,
      isValid: false,
      isReachable: false
    };

    try {
      // Validate URL format
      result.isValid = this.isValidWebhookUrl(url);
      if (!result.isValid) {
        result.error = 'Invalid URL format';
        return result;
      }

      // Test URL accessibility with HEAD request
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      result.responseTime = Date.now() - startTime;
      result.isReachable = response.status < 500; // Accept any status except server errors

      if (!result.isReachable) {
        result.error = `Server returned ${response.status}`;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Network error';
    }

    return result;
  }

  /**
   * Verify DFNS webhook signature
   * 
   * @param payload - Raw webhook payload
   * @param signature - X-DFNS-WEBHOOK-SIGNATURE header value
   * @param secret - Webhook secret from creation
   * @returns Signature verification result
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<WebhookSignatureVerification> {
    try {
      const crypto = await import('crypto');
      
      // Parse timestamp from payload
      const payloadObj = JSON.parse(payload);
      const timestamp = payloadObj.timestampSent || Date.now() / 1000;

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const expectedSig = `sha256=${expectedSignature}`;
      
      // Constant-time comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'ascii'),
        Buffer.from(expectedSig, 'ascii')
      );

      // Check for replay attacks (5 minute tolerance)
      const now = Date.now() / 1000;
      const timeDiff = Math.abs(now - timestamp);
      const isTimestampValid = timeDiff < 300; // 5 minutes

      return {
        isValid: isValid && isTimestampValid,
        timestamp,
        signature,
        payload,
        secret: '***' // Don't return actual secret
      };
    } catch (error) {
      console.error('❌ Failed to verify webhook signature:', error);
      return {
        isValid: false,
        timestamp: 0,
        signature,
        payload,
        secret: '***'
      };
    }
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync webhook to local database
   */
  private async syncWebhookToDatabase(webhook: DfnsCreateWebhookResponse): Promise<void> {
    try {
      const { error } = await supabase
        .from('dfns_webhooks')
        .upsert({
          webhook_id: webhook.id,
          name: webhook.description || webhook.url,
          url: webhook.url,
          description: webhook.description,
          events: webhook.events,
          status: webhook.status === 'Enabled' ? 'Active' : 'Inactive',
          secret: webhook.secret,
          dfns_webhook_id: webhook.id,
          created_at: webhook.dateCreated,
          updated_at: webhook.dateUpdated
        });

      if (error) {
        console.error('❌ Failed to sync webhook to database:', error);
      } else {
        console.log('✅ Webhook synced to database successfully');
      }
    } catch (error) {
      console.error('❌ Database sync error:', error);
    }
  }

  /**
   * Update webhook in database
   */
  private async updateWebhookInDatabase(
    webhookId: string,
    webhook: DfnsUpdateWebhookResponse
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('dfns_webhooks')
        .update({
          url: webhook.url,
          description: webhook.description,
          events: webhook.events,
          status: webhook.status === 'Enabled' ? 'Active' : 'Inactive',
          updated_at: webhook.dateUpdated
        })
        .eq('dfns_webhook_id', webhookId);

      if (error) {
        console.error('❌ Failed to update webhook in database:', error);
      }
    } catch (error) {
      console.error('❌ Database update error:', error);
    }
  }

  /**
   * Remove webhook from database
   */
  private async removeWebhookFromDatabase(webhookId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dfns_webhooks')
        .delete()
        .eq('dfns_webhook_id', webhookId);

      if (error) {
        console.error('❌ Failed to remove webhook from database:', error);
      }
    } catch (error) {
      console.error('❌ Database removal error:', error);
    }
  }

  /**
   * Get webhook analytics from database
   */
  private async getWebhookAnalytics(webhookId: string): Promise<{
    eventCount: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastEventAt?: string;
    lastSuccessfulDeliveryAt?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('dfns_webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId);

      if (error) {
        throw error;
      }

      const events = data || [];
      const successful = events.filter(e => e.status === 'Delivered');
      const failed = events.filter(e => e.status === 'Failed');

      return {
        eventCount: events.length,
        successfulDeliveries: successful.length,
        failedDeliveries: failed.length,
        lastEventAt: events.length > 0 ? events[0].created_at : undefined,
        lastSuccessfulDeliveryAt: successful.length > 0 ? successful[0].delivered_at : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get webhook analytics:', error);
      return {
        eventCount: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0
      };
    }
  }

  // ==============================================
  // VALIDATION HELPERS
  // ==============================================

  /**
   * Validate webhook URL format
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate webhook events array
   */
  private validateWebhookEvents(events: (DfnsWebhookEvent | '*')[]): boolean {
    if (!Array.isArray(events) || events.length === 0) {
      return false;
    }
    
    // If contains '*', it should be the only element
    if (events.includes('*')) {
      return events.length === 1;
    }
    
    return true;
  }
}

/**
 * Factory function to create DfnsWebhookService instance
 */
export function getDfnsWebhookService(
  client: WorkingDfnsClient,
  options?: WebhookServiceOptions
): DfnsWebhookService {
  return new DfnsWebhookService(client, options);
}

export default DfnsWebhookService;
