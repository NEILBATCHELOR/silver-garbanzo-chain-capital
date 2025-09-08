/**
 * DFNS Webhook Service
 * 
 * High-level service for DFNS webhook management operations
 * Provides business logic layer over DFNS Webhooks APIs
 * 
 * Implementation: Complete Webhook Management
 * - Webhook Creation, Listing, Retrieval, Updates, and Deletion
 * - Webhook Event Management and History
 * - Webhook Testing (Ping functionality)
 * - Database Synchronization
 */

import type {
  DfnsCreateWebhookRequest,
  DfnsCreateWebhookResponse,
  DfnsUpdateWebhookRequest,
  DfnsUpdateWebhookResponse,
  DfnsListWebhooksRequest,
  DfnsListWebhooksResponse,
  DfnsGetWebhookResponse,
  DfnsDeleteWebhookResponse,
  DfnsPingWebhookResponse,
  DfnsListWebhookEventsRequest,
  DfnsListWebhookEventsResponse,
  DfnsWebhookEventResponse,
  DfnsWebhookEvent,
  DfnsWebhookStatus,
  WebhookConfig,
  WebhookEvent,
  WebhookServiceOptions,
  WebhookCreationOptions,
  WebhookEventFilterOptions,
  WebhookSummary,
  WebhookEventSummary,
  WebhookUrlValidation,
  WebhookEventData,
  WebhookSupportedNetwork,
} from '../../types/dfns';
import {
  isValidWebhookUrl,
  validateWebhookEvents,
  isWebhookSupportedNetwork,
  getSupportedWebhookEvents,
  WEBHOOK_EVENT_RETENTION_DAYS
} from '../../types/dfns';
import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { DfnsAuthenticationError, DfnsValidationError, DfnsWebhookError } from '../../types/dfns/errors';

export interface WebhookListOptions {
  limit?: number;
  paginationToken?: string;
  includeInactive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'status' | 'url';
  sortOrder?: 'asc' | 'desc';
}

export interface WebhookUpdateOptions {
  syncToDatabase?: boolean;
  validateUrl?: boolean;
  testWebhook?: boolean;
}

export interface WebhookDeletionOptions {
  syncToDatabase?: boolean;
  archiveEvents?: boolean;
}

export interface WebhookEventListOptions {
  webhookId: string;
  deliveryFailed?: boolean;
  eventType?: DfnsWebhookEvent;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  paginationToken?: string;
}

export interface WebhookTestOptions {
  includeEventHistory?: boolean;
  validateResponse?: boolean;
  timeoutMs?: number;
}

// Batch operation interfaces
export interface BatchWebhookOperation {
  webhookId: string;
  action: 'enable' | 'disable' | 'delete' | 'ping';
}

export interface BatchWebhookResult {
  successful: string[];
  failed: Array<{
    webhookId: string;
    error: string;
  }>;
}

/**
 * DFNS Webhook Service
 * 
 * Provides comprehensive webhook management operations:
 * - CRUD operations for webhooks
 * - Event management and history
 * - URL validation and testing
 * - Database synchronization
 * - Batch operations
 */
export class DfnsWebhookService {
  private dfnsClient: DfnsClient;
  private authClient: DfnsAuthClient;
  private userActionService: DfnsUserActionService;
  private options: WebhookServiceOptions;

  constructor(
    dfnsClient: DfnsClient,
    authClient: DfnsAuthClient,
    userActionService: DfnsUserActionService,
    options: WebhookServiceOptions = {}
  ) {
    this.dfnsClient = dfnsClient;
    this.authClient = authClient;
    this.userActionService = userActionService;
    this.options = {
      enableDatabaseSync: true,
      enableEventLogging: true,
      validateWebhookUrls: true,
      autoRetryFailedDeliveries: false,
      ...options
    };
  }

  // =============================================================================
  // CORE WEBHOOK MANAGEMENT OPERATIONS
  // =============================================================================

  /**
   * Create a new webhook
   * Requires User Action Signing and Webhooks:Create permission
   */
  async createWebhook(
    request: DfnsCreateWebhookRequest,
    options: WebhookCreationOptions = {}
  ): Promise<DfnsCreateWebhookResponse> {
    try {
      // Validation
      this.validateWebhookCreationRequest(request);

      if (this.options.validateWebhookUrls) {
        const validation = await this.validateWebhookUrl(request.url);
        if (!validation.isValid) {
          throw new DfnsValidationError(
            `Invalid webhook URL: ${validation.error}`,
            { url: request.url, validation }
          );
        }
      }

      // User Action Signing required for webhook creation
      const userActionToken = await this.userActionService.signUserAction(
        'CreateWebhook',
        request
      );

      // Create webhook via DFNS API
      const response = await this.authClient.createWebhook(request, userActionToken);

      // Database synchronization
      if (options.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncWebhookToDatabase(response);
      }

      // Test webhook if requested
      if (options.testWebhook) {
        try {
          await this.pingWebhook(response.id);
        } catch (error) {
          console.warn(`Webhook created but ping test failed: ${error}`);
        }
      }

      // Log activity
      if (this.options.enableEventLogging) {
        console.log(`Webhook created: ${response.id} -> ${response.url}`);
      }

      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to create webhook: ${error}`,
        { request, options }
      );
    }
  }

  /**
   * Get a specific webhook by ID
   * Requires Webhooks:Read permission
   */
  async getWebhook(webhookId: string): Promise<DfnsGetWebhookResponse> {
    try {
      this.validateWebhookId(webhookId);

      const response = await this.authClient.getWebhook(webhookId);
      
      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get webhook: ${error}`,
        { webhookId }
      );
    }
  }

  /**
   * Find webhook by URL
   */
  async getWebhookByUrl(url: string): Promise<DfnsGetWebhookResponse | null> {
    try {
      const webhooks = await this.getAllWebhooks();
      return webhooks.find(webhook => webhook.url === url) || null;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to find webhook by URL: ${error}`,
        { url }
      );
    }
  }

  /**
   * List all webhooks with pagination
   * Requires Webhooks:Read permission
   */
  async listWebhooks(
    request: DfnsListWebhooksRequest = {},
    options: WebhookListOptions = {}
  ): Promise<DfnsListWebhooksResponse> {
    try {
      const response = await this.authClient.listWebhooks(request);
      
      // Apply client-side filtering if needed
      let filteredItems = response.items;
      
      if (!options.includeInactive) {
        filteredItems = filteredItems.filter(webhook => webhook.status === 'Enabled');
      }

      // Apply sorting
      if (options.sortBy) {
        filteredItems = this.sortWebhooks(filteredItems, options.sortBy, options.sortOrder);
      }

      return {
        ...response,
        items: filteredItems
      };
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to list webhooks: ${error}`,
        { request, options }
      );
    }
  }

  /**
   * Get all webhooks (handles pagination automatically)
   */
  async getAllWebhooks(): Promise<DfnsGetWebhookResponse[]> {
    try {
      const allWebhooks: DfnsGetWebhookResponse[] = [];
      let paginationToken: string | undefined;

      do {
        const response = await this.listWebhooks({ 
          limit: 100, 
          paginationToken 
        });
        
        allWebhooks.push(...response.items);
        paginationToken = response.nextPageToken;
      } while (paginationToken);

      return allWebhooks;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get all webhooks: ${error}`
      );
    }
  }

  /**
   * Update a webhook
   * Requires User Action Signing and Webhooks:Update permission
   */
  async updateWebhook(
    webhookId: string,
    request: DfnsUpdateWebhookRequest,
    options: WebhookUpdateOptions = {}
  ): Promise<DfnsUpdateWebhookResponse> {
    try {
      this.validateWebhookId(webhookId);
      this.validateWebhookUpdateRequest(request);

      // Validate URL if being updated
      if (request.url && this.options.validateWebhookUrls) {
        const validation = await this.validateWebhookUrl(request.url);
        if (!validation.isValid) {
          throw new DfnsValidationError(
            `Invalid webhook URL: ${validation.error}`,
            { url: request.url, validation }
          );
        }
      }

      // User Action Signing required for webhook updates
      const userActionToken = await this.userActionService.signUserAction(
        'UpdateWebhook',
        { webhookId, ...request }
      );

      // Update webhook via DFNS API
      const response = await this.authClient.updateWebhook(webhookId, request, userActionToken);

      // Database synchronization
      if (options.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncWebhookToDatabase(response);
      }

      // Test webhook if requested
      if (options.testWebhook) {
        try {
          await this.pingWebhook(webhookId);
        } catch (error) {
          console.warn(`Webhook updated but ping test failed: ${error}`);
        }
      }

      // Log activity
      if (this.options.enableEventLogging) {
        console.log(`Webhook updated: ${webhookId}`);
      }

      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to update webhook: ${error}`,
        { webhookId, request, options }
      );
    }
  }

  /**
   * Delete a webhook
   * Requires User Action Signing and Webhooks:Delete permission
   */
  async deleteWebhook(
    webhookId: string,
    options: WebhookDeletionOptions = {}
  ): Promise<DfnsDeleteWebhookResponse> {
    try {
      this.validateWebhookId(webhookId);

      // User Action Signing required for webhook deletion
      const userActionToken = await this.userActionService.signUserAction(
        'DeleteWebhook',
        { webhookId }
      );

      // Delete webhook via DFNS API
      const response = await this.authClient.deleteWebhook(webhookId, userActionToken);

      // Archive events if requested
      if (options.archiveEvents) {
        await this.archiveWebhookEvents(webhookId);
      }

      // Database cleanup
      if (options.syncToDatabase && this.options.enableDatabaseSync) {
        await this.removeWebhookFromDatabase(webhookId);
      }

      // Log activity
      if (this.options.enableEventLogging) {
        console.log(`Webhook deleted: ${webhookId}`);
      }

      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to delete webhook: ${error}`,
        { webhookId, options }
      );
    }
  }

  /**
   * Test a webhook by sending a ping
   * Requires Webhooks:Ping permission
   */
  async pingWebhook(
    webhookId: string,
    options: WebhookTestOptions = {}
  ): Promise<DfnsPingWebhookResponse> {
    try {
      this.validateWebhookId(webhookId);

      const response = await this.authClient.pingWebhook(webhookId);

      // Log test result
      if (this.options.enableEventLogging) {
        const success = response.status === '200';
        console.log(
          `Webhook ping ${success ? 'successful' : 'failed'}: ${webhookId} -> ${response.status}`
        );
        if (!success && response.error) {
          console.warn(`Ping error: ${response.error}`);
        }
      }

      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to ping webhook: ${error}`,
        { webhookId, options }
      );
    }
  }

  // =============================================================================
  // WEBHOOK EVENT MANAGEMENT
  // =============================================================================

  /**
   * List webhook events with filtering
   * Requires Webhooks:Events:Read permission
   */
  async listWebhookEvents(
    options: WebhookEventListOptions
  ): Promise<DfnsListWebhookEventsResponse> {
    try {
      this.validateWebhookId(options.webhookId);

      const request: DfnsListWebhookEventsRequest = {
        limit: options.limit,
        paginationToken: options.paginationToken,
        deliveryFailed: options.deliveryFailed
      };

      const response = await this.authClient.listWebhookEvents(options.webhookId, request);
      
      // Apply client-side filtering if needed
      let filteredItems = response.items;
      
      if (options.eventType) {
        filteredItems = filteredItems.filter(event => event.kind === options.eventType);
      }

      if (options.dateFrom || options.dateTo) {
        filteredItems = filteredItems.filter(event => {
          const eventDate = new Date(event.date);
          if (options.dateFrom && eventDate < new Date(options.dateFrom)) return false;
          if (options.dateTo && eventDate > new Date(options.dateTo)) return false;
          return true;
        });
      }

      return {
        ...response,
        items: filteredItems
      };
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to list webhook events: ${error}`,
        { options }
      );
    }
  }

  /**
   * Get all webhook events (handles pagination automatically)
   */
  async getAllWebhookEvents(webhookId: string): Promise<DfnsWebhookEventResponse[]> {
    try {
      this.validateWebhookId(webhookId);

      const allEvents: DfnsWebhookEventResponse[] = [];
      let paginationToken: string | undefined;

      do {
        const response = await this.listWebhookEvents({
          webhookId,
          limit: 100,
          paginationToken
        });
        
        allEvents.push(...response.items);
        paginationToken = response.nextPageToken;
      } while (paginationToken);

      return allEvents;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get all webhook events: ${error}`,
        { webhookId }
      );
    }
  }

  /**
   * Get a specific webhook event by ID
   * Requires Webhooks:Events:Read permission
   */
  async getWebhookEvent(
    webhookId: string,
    webhookEventId: string
  ): Promise<DfnsWebhookEventResponse> {
    try {
      this.validateWebhookId(webhookId);
      this.validateWebhookEventId(webhookEventId);

      const response = await this.authClient.getWebhookEvent(webhookId, webhookEventId);
      
      return response;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get webhook event: ${error}`,
        { webhookId, webhookEventId }
      );
    }
  }

  /**
   * Get failed webhook events for a webhook
   */
  async getFailedWebhookEvents(webhookId: string): Promise<DfnsWebhookEventResponse[]> {
    try {
      const response = await this.listWebhookEvents({
        webhookId,
        deliveryFailed: true
      });
      
      return response.items;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get failed webhook events: ${error}`,
        { webhookId }
      );
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Validate webhook URL
   */
  async validateWebhookUrl(url: string): Promise<WebhookUrlValidation> {
    const validation: WebhookUrlValidation = {
      url,
      isValid: isValidWebhookUrl(url),
      isReachable: false
    };

    if (!validation.isValid) {
      validation.error = 'Invalid URL format';
      return validation;
    }

    // Optional: Test URL reachability
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      validation.isReachable = response.ok || response.status < 500;
      validation.responseTime = Date.now() - startTime;
      
      if (!validation.isReachable) {
        validation.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      validation.error = `Connection failed: ${error}`;
    }

    return validation;
  }

  /**
   * Get supported webhook events for a network
   */
  getSupportedEventsForNetwork(network: string): DfnsWebhookEvent[] {
    return getSupportedWebhookEvents(network);
  }

  /**
   * Check if network supports webhooks
   */
  isNetworkSupported(network: string): boolean {
    return isWebhookSupportedNetwork(network);
  }

  /**
   * Get webhook retention information
   */
  getWebhookRetentionInfo(): { days: number; description: string } {
    return {
      days: WEBHOOK_EVENT_RETENTION_DAYS,
      description: `Webhook events are retained for ${WEBHOOK_EVENT_RETENTION_DAYS} days`
    };
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  /**
   * Enable multiple webhooks
   */
  async enableWebhooks(webhookIds: string[]): Promise<BatchWebhookResult> {
    return this.performBatchWebhookOperation(
      webhookIds.map(id => ({ webhookId: id, action: 'enable' as const }))
    );
  }

  /**
   * Disable multiple webhooks
   */
  async disableWebhooks(webhookIds: string[]): Promise<BatchWebhookResult> {
    return this.performBatchWebhookOperation(
      webhookIds.map(id => ({ webhookId: id, action: 'disable' as const }))
    );
  }

  /**
   * Delete multiple webhooks
   */
  async deleteWebhooks(webhookIds: string[]): Promise<BatchWebhookResult> {
    return this.performBatchWebhookOperation(
      webhookIds.map(id => ({ webhookId: id, action: 'delete' as const }))
    );
  }

  /**
   * Ping multiple webhooks
   */
  async pingWebhooks(webhookIds: string[]): Promise<BatchWebhookResult> {
    return this.performBatchWebhookOperation(
      webhookIds.map(id => ({ webhookId: id, action: 'ping' as const }))
    );
  }

  // =============================================================================
  // DASHBOARD ANALYTICS
  // =============================================================================

  /**
   * Get webhook summaries for dashboard
   */
  async getWebhooksSummary(): Promise<WebhookSummary[]> {
    try {
      const webhooks = await this.getAllWebhooks();
      
      const summaries: WebhookSummary[] = [];
      
      for (const webhook of webhooks) {
        const events = await this.getAllWebhookEvents(webhook.id);
        
        const successfulDeliveries = events.filter(e => !e.deliveryFailed).length;
        const failedDeliveries = events.filter(e => e.deliveryFailed).length;
        const lastEvent = events.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        const lastSuccessfulEvent = events
          .filter(e => !e.deliveryFailed)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        summaries.push({
          webhookId: webhook.id,
          url: webhook.url,
          status: webhook.status,
          isActive: webhook.status === 'Enabled',
          eventCount: events.length,
          eventTypes: webhook.events,
          successfulDeliveries,
          failedDeliveries,
          lastEventAt: lastEvent?.date,
          lastSuccessfulDeliveryAt: lastSuccessfulEvent?.date,
          description: webhook.description,
          dateCreated: webhook.dateCreated,
          dateUpdated: webhook.dateUpdated
        });
      }
      
      return summaries;
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get webhooks summary: ${error}`
      );
    }
  }

  /**
   * Get webhook event summaries for dashboard
   */
  async getWebhookEventsSummary(webhookId: string): Promise<WebhookEventSummary[]> {
    try {
      const events = await this.getAllWebhookEvents(webhookId);
      
      return events.map(event => ({
        eventId: event.id,
        webhookId,
        eventType: event.kind,
        deliveryStatus: event.deliveryFailed 
          ? (event.nextAttemptDate ? 'retrying' : 'failed')
          : 'delivered',
        deliveryAttempts: event.deliveryAttempt,
        responseStatus: event.status,
        lastAttemptAt: new Date(event.timestampSent * 1000).toISOString(),
        nextAttemptAt: event.nextAttemptDate,
        eventDate: event.date,
        hasError: !!event.error,
        error: event.error
      }));
    } catch (error) {
      throw new DfnsWebhookError(
        `Failed to get webhook events summary: ${error}`,
        { webhookId }
      );
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private validateWebhookId(webhookId: string): void {
    if (!webhookId || typeof webhookId !== 'string') {
      throw new DfnsValidationError('Invalid webhook ID', { webhookId });
    }
  }

  private validateWebhookEventId(webhookEventId: string): void {
    if (!webhookEventId || typeof webhookEventId !== 'string') {
      throw new DfnsValidationError('Invalid webhook event ID', { webhookEventId });
    }
  }

  private validateWebhookCreationRequest(request: DfnsCreateWebhookRequest): void {
    if (!request.url || !isValidWebhookUrl(request.url)) {
      throw new DfnsValidationError('Invalid webhook URL', { url: request.url });
    }

    if (!validateWebhookEvents(request.events)) {
      throw new DfnsValidationError('Invalid webhook events', { events: request.events });
    }

    if (request.status && !['Enabled', 'Disabled'].includes(request.status)) {
      throw new DfnsValidationError('Invalid webhook status', { status: request.status });
    }
  }

  private validateWebhookUpdateRequest(request: DfnsUpdateWebhookRequest): void {
    if (request.url && !isValidWebhookUrl(request.url)) {
      throw new DfnsValidationError('Invalid webhook URL', { url: request.url });
    }

    if (request.events && !validateWebhookEvents(request.events)) {
      throw new DfnsValidationError('Invalid webhook events', { events: request.events });
    }

    if (request.status && !['Enabled', 'Disabled'].includes(request.status)) {
      throw new DfnsValidationError('Invalid webhook status', { status: request.status });
    }
  }

  private sortWebhooks(
    webhooks: DfnsGetWebhookResponse[],
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): DfnsGetWebhookResponse[] {
    return webhooks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          // Webhooks don't have names in the API, sort by URL
          comparison = a.url.localeCompare(b.url);
          break;
        case 'createdAt':
          comparison = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private async performBatchWebhookOperation(
    operations: BatchWebhookOperation[]
  ): Promise<BatchWebhookResult> {
    const result: BatchWebhookResult = {
      successful: [],
      failed: []
    };

    for (const operation of operations) {
      try {
        switch (operation.action) {
          case 'enable':
            await this.updateWebhook(operation.webhookId, { status: 'Enabled' });
            break;
          case 'disable':
            await this.updateWebhook(operation.webhookId, { status: 'Disabled' });
            break;
          case 'delete':
            await this.deleteWebhook(operation.webhookId);
            break;
          case 'ping':
            await this.pingWebhook(operation.webhookId);
            break;
        }
        
        result.successful.push(operation.webhookId);
      } catch (error) {
        result.failed.push({
          webhookId: operation.webhookId,
          error: String(error)
        });
      }
    }

    return result;
  }

  // Database synchronization methods (implement as needed)
  private async syncWebhookToDatabase(webhook: DfnsCreateWebhookResponse | DfnsUpdateWebhookResponse): Promise<void> {
    // TODO: Implement database synchronization
    // This would sync the webhook to the dfns_webhooks table
    console.log(`TODO: Sync webhook to database: ${webhook.id}`);
  }

  private async removeWebhookFromDatabase(webhookId: string): Promise<void> {
    // TODO: Implement database cleanup
    // This would remove/archive the webhook from the dfns_webhooks table
    console.log(`TODO: Remove webhook from database: ${webhookId}`);
  }

  private async archiveWebhookEvents(webhookId: string): Promise<void> {
    // TODO: Implement event archival
    // This would archive webhook events from the dfns_webhook_deliveries table
    console.log(`TODO: Archive webhook events: ${webhookId}`);
  }
}
