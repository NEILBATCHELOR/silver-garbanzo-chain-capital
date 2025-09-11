/**
 * DFNS Webhook Events Service
 * 
 * Service for managing DFNS webhook events and monitoring delivery status
 * Handles event retrieval, filtering, and delivery tracking
 * 
 * Features:
 * - List webhook events with filtering
 * - Get individual event details
 * - Monitor delivery status and retries
 * - Event analytics and metrics
 * - Database synchronization
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type { 
  DfnsListWebhookEventsRequest,
  DfnsListWebhookEventsResponse,
  DfnsWebhookEventResponse,
  DfnsWebhookEvent,
  WebhookEvent,
  WebhookEventSummary,
  WebhookEventFilterOptions,
  WebhookServiceOptions
} from '../../types/dfns/webhooks';
import { DfnsError } from '../../types/dfns/errors';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/core/database';

// Database client for webhook events
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * DFNS Webhook Events Service
 * 
 * Manages webhook events and delivery monitoring
 */
export class DfnsWebhookEventsService {
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
  // WEBHOOK EVENTS RETRIEVAL
  // ==============================================

  /**
   * List webhook events for a specific webhook
   * 
   * @param webhookId - DFNS webhook ID
   * @param request - List request with filtering options
   * @returns Paginated webhook events
   */
  async listWebhookEvents(
    webhookId: string,
    request: DfnsListWebhookEventsRequest = {}
  ): Promise<DfnsListWebhookEventsResponse> {
    try {
      console.log('📋 Listing DFNS webhook events:', {
        webhookId,
        deliveryFailed: request.deliveryFailed,
        limit: request.limit
      });

      const queryParams = new URLSearchParams();
      if (request.limit) queryParams.append('limit', request.limit.toString());
      if (request.paginationToken) queryParams.append('paginationToken', request.paginationToken);
      if (request.deliveryFailed !== undefined) {
        queryParams.append('deliveryFailed', request.deliveryFailed.toString());
      }

      const endpoint = `/webhooks/${webhookId}/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.client.makeRequest<DfnsListWebhookEventsResponse>(
        'GET',
        endpoint
      );

      console.log('✅ DFNS webhook events listed:', {
        webhookId,
        count: response.items.length,
        hasNextPage: !!response.nextPageToken,
        failedEvents: response.items.filter(e => e.deliveryFailed).length
      });

      // Sync events to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncEventsToDatabase(webhookId, response.items);
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to list DFNS webhook events:', error);
      throw new DfnsError('WEBHOOK_EVENTS_LIST_FAILED', `Failed to list webhook events: ${error}`);
    }
  }

  /**
   * Get specific webhook event details
   * 
   * @param webhookId - DFNS webhook ID
   * @param eventId - Webhook event ID
   * @returns Webhook event details
   */
  async getWebhookEvent(
    webhookId: string,
    eventId: string
  ): Promise<DfnsWebhookEventResponse> {
    try {
      console.log('🔍 Getting DFNS webhook event:', {
        webhookId,
        eventId
      });

      const response = await this.client.makeRequest<DfnsWebhookEventResponse>(
        'GET',
        `/webhooks/${webhookId}/events/${eventId}`
      );

      console.log('✅ DFNS webhook event retrieved:', {
        eventId: response.id,
        kind: response.kind,
        deliveryFailed: response.deliveryFailed,
        deliveryAttempt: response.deliveryAttempt,
        status: response.status
      });

      // Sync event to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncEventToDatabase(webhookId, response);
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to get DFNS webhook event:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw new DfnsError('WEBHOOK_EVENT_NOT_FOUND', `Webhook event not found: ${eventId}`);
      }
      
      throw new DfnsError('WEBHOOK_EVENT_FETCH_FAILED', `Failed to get webhook event: ${error}`);
    }
  }

  // ==============================================
  // EVENT ANALYTICS AND MONITORING
  // ==============================================

  /**
   * Get webhook event analytics and metrics
   * 
   * @param webhookId - DFNS webhook ID
   * @param days - Number of days to analyze (default: 7)
   * @returns Event analytics
   */
  async getWebhookEventAnalytics(
    webhookId: string,
    days: number = 7
  ): Promise<{
    totalEvents: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    retryCount: number;
    averageDeliveryTime: number;
    eventsByType: Record<DfnsWebhookEvent, number>;
    deliverySuccessRate: number;
    lastEventDate?: string;
    oldestEventDate?: string;
  }> {
    try {
      console.log('📊 Analyzing webhook events:', {
        webhookId,
        days
      });

      // Get all events for analysis
      const allEvents: DfnsWebhookEventResponse[] = [];
      let nextPageToken: string | undefined;
      
      do {
        const response = await this.listWebhookEvents(webhookId, {
          limit: 100,
          paginationToken: nextPageToken
        });
        
        allEvents.push(...response.items);
        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      // Filter events by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentEvents = allEvents.filter(event => 
        new Date(event.date) >= cutoffDate
      );

      // Calculate analytics
      const totalEvents = recentEvents.length;
      const successfulDeliveries = recentEvents.filter(e => !e.deliveryFailed).length;
      const failedDeliveries = recentEvents.filter(e => e.deliveryFailed).length;
      const retryCount = recentEvents.filter(e => e.retryOf).length;

      // Event types analysis
      const eventsByType: Record<string, number> = {};
      recentEvents.forEach(event => {
        eventsByType[event.kind] = (eventsByType[event.kind] || 0) + 1;
      });

      // Delivery success rate
      const deliverySuccessRate = totalEvents > 0 ? (successfulDeliveries / totalEvents) * 100 : 0;

      // Average delivery time (simplified - using status as proxy)
      const averageDeliveryTime = 0; // Would need more detailed timing data

      const analytics = {
        totalEvents,
        successfulDeliveries,
        failedDeliveries,
        retryCount,
        averageDeliveryTime,
        eventsByType: eventsByType as Record<DfnsWebhookEvent, number>,
        deliverySuccessRate,
        lastEventDate: allEvents.length > 0 ? allEvents[0].date : undefined,
        oldestEventDate: allEvents.length > 0 ? allEvents[allEvents.length - 1].date : undefined
      };

      console.log('✅ Webhook event analytics computed:', {
        webhookId,
        totalEvents,
        successRate: `${deliverySuccessRate.toFixed(1)}%`,
        eventTypes: Object.keys(eventsByType).length
      });

      return analytics;
    } catch (error) {
      console.error('❌ Failed to analyze webhook events:', error);
      throw new DfnsError('WEBHOOK_ANALYTICS_FAILED', `Failed to analyze webhook events: ${error}`);
    }
  }

  /**
   * Get failed webhook events requiring attention
   * 
   * @param webhookId - DFNS webhook ID
   * @param includeRetrying - Include events still being retried
   * @returns Failed webhook events
   */
  async getFailedWebhookEvents(
    webhookId: string,
    includeRetrying: boolean = true
  ): Promise<DfnsWebhookEventResponse[]> {
    try {
      console.log('🚨 Getting failed webhook events:', {
        webhookId,
        includeRetrying
      });

      const response = await this.listWebhookEvents(webhookId, {
        deliveryFailed: true,
        limit: 100
      });

      let failedEvents = response.items;

      // Filter out events still being retried if requested
      if (!includeRetrying) {
        failedEvents = failedEvents.filter(event => !event.nextAttemptDate);
      }

      console.log('✅ Failed webhook events retrieved:', {
        webhookId,
        failedCount: failedEvents.length,
        retryingCount: response.items.filter(e => e.nextAttemptDate).length
      });

      return failedEvents;
    } catch (error) {
      console.error('❌ Failed to get failed webhook events:', error);
      throw new DfnsError('FAILED_EVENTS_FETCH_FAILED', `Failed to get failed events: ${error}`);
    }
  }

  /**
   * Get webhook events summary for dashboard
   * 
   * @param webhookId - DFNS webhook ID
   * @param limit - Number of recent events to include
   * @returns Webhook events summary
   */
  async getWebhookEventsSummary(
    webhookId: string,
    limit: number = 20
  ): Promise<{
    recentEvents: WebhookEventSummary[];
    analytics: {
      totalEvents: number;
      successfulDeliveries: number;
      failedDeliveries: number;
      deliverySuccessRate: number;
    };
    failedEventsNeedingAttention: number;
  }> {
    try {
      console.log('📈 Getting webhook events summary:', {
        webhookId,
        limit
      });

      // Get recent events
      const recentEventsResponse = await this.listWebhookEvents(webhookId, { limit });
      
      // Get analytics
      const analytics = await this.getWebhookEventAnalytics(webhookId, 30); // 30 days

      // Get failed events needing attention (not retrying)
      const failedEvents = await this.getFailedWebhookEvents(webhookId, false);

      // Format recent events for summary
      const recentEvents: WebhookEventSummary[] = recentEventsResponse.items.map(event => ({
        eventId: event.id,
        webhookId,
        eventType: event.kind,
        deliveryStatus: event.deliveryFailed ? 
          (event.nextAttemptDate ? 'retrying' : 'failed') : 'delivered',
        deliveryAttempts: event.deliveryAttempt,
        responseStatus: event.status,
        lastAttemptAt: event.date,
        nextAttemptAt: event.nextAttemptDate,
        eventDate: event.date,
        hasError: event.deliveryFailed,
        error: event.error
      }));

      const summary = {
        recentEvents,
        analytics: {
          totalEvents: analytics.totalEvents,
          successfulDeliveries: analytics.successfulDeliveries,
          failedDeliveries: analytics.failedDeliveries,
          deliverySuccessRate: analytics.deliverySuccessRate
        },
        failedEventsNeedingAttention: failedEvents.length
      };

      console.log('✅ Webhook events summary generated:', {
        webhookId,
        recentEventsCount: recentEvents.length,
        successRate: `${analytics.deliverySuccessRate.toFixed(1)}%`,
        failedEventsNeedingAttention: failedEvents.length
      });

      return summary;
    } catch (error) {
      console.error('❌ Failed to get webhook events summary:', error);
      throw new DfnsError('EVENTS_SUMMARY_FAILED', `Failed to get events summary: ${error}`);
    }
  }

  // ==============================================
  // EVENT FILTERING AND SEARCH
  // ==============================================

  /**
   * Filter webhook events by criteria
   * 
   * @param webhookId - DFNS webhook ID
   * @param filters - Filtering options
   * @returns Filtered webhook events
   */
  async filterWebhookEvents(
    webhookId: string,
    filters: WebhookEventFilterOptions
  ): Promise<DfnsWebhookEventResponse[]> {
    try {
      console.log('🔍 Filtering webhook events:', {
        webhookId,
        filters
      });

      // Get all events with pagination
      const allEvents: DfnsWebhookEventResponse[] = [];
      let nextPageToken: string | undefined;
      
      do {
        const response = await this.listWebhookEvents(webhookId, {
          limit: filters.limit || 100,
          paginationToken: nextPageToken,
          deliveryFailed: filters.deliveryFailed
        });
        
        allEvents.push(...response.items);
        nextPageToken = response.nextPageToken;
        
        // Respect limit if set
        if (filters.limit && allEvents.length >= filters.limit) {
          break;
        }
      } while (nextPageToken);

      // Apply additional filters
      let filteredEvents = allEvents;

      if (filters.eventType) {
        filteredEvents = filteredEvents.filter(event => event.kind === filters.eventType);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredEvents = filteredEvents.filter(event => new Date(event.date) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filteredEvents = filteredEvents.filter(event => new Date(event.date) <= toDate);
      }

      // Apply limit after filtering
      if (filters.limit) {
        filteredEvents = filteredEvents.slice(0, filters.limit);
      }

      console.log('✅ Webhook events filtered:', {
        webhookId,
        totalEvents: allEvents.length,
        filteredEvents: filteredEvents.length
      });

      return filteredEvents;
    } catch (error) {
      console.error('❌ Failed to filter webhook events:', error);
      throw new DfnsError('EVENT_FILTER_FAILED', `Failed to filter events: ${error}`);
    }
  }

  /**
   * Get webhook events by type
   * 
   * @param webhookId - DFNS webhook ID
   * @param eventType - Event type to filter by
   * @param limit - Maximum number of events
   * @returns Events of specified type
   */
  async getWebhookEventsByType(
    webhookId: string,
    eventType: DfnsWebhookEvent,
    limit: number = 50
  ): Promise<DfnsWebhookEventResponse[]> {
    return this.filterWebhookEvents(webhookId, {
      eventType,
      limit
    });
  }

  /**
   * Get webhook events in date range
   * 
   * @param webhookId - DFNS webhook ID
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @returns Events in date range
   */
  async getWebhookEventsInDateRange(
    webhookId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<DfnsWebhookEventResponse[]> {
    return this.filterWebhookEvents(webhookId, {
      dateFrom,
      dateTo
    });
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync webhook events to local database
   */
  private async syncEventsToDatabase(
    webhookId: string,
    events: DfnsWebhookEventResponse[]
  ): Promise<void> {
    if (!this.options.enableDatabaseSync) {
      return;
    }

    try {
      const eventRecords = events.map(event => ({
        delivery_id: event.id,
        webhook_id: webhookId,
        event: event.kind,
        payload: event.data,
        status: event.deliveryFailed ? 'Failed' : 'Delivered',
        response_code: parseInt(event.status) || null,
        response_body: event.error || null,
        attempts: event.deliveryAttempt,
        next_retry_at: event.nextAttemptDate ? new Date(event.nextAttemptDate).toISOString() : null,
        delivered_at: !event.deliveryFailed ? new Date(event.date).toISOString() : null,
        error_message: event.error,
        created_at: new Date(event.date).toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('dfns_webhook_deliveries')
        .upsert(eventRecords, { onConflict: 'delivery_id' });

      if (error) {
        console.error('❌ Failed to sync events to database:', error);
      } else {
        console.log(`✅ Synced ${events.length} webhook events to database`);
      }
    } catch (error) {
      console.error('❌ Database sync error:', error);
    }
  }

  /**
   * Sync individual webhook event to database
   */
  private async syncEventToDatabase(
    webhookId: string,
    event: DfnsWebhookEventResponse
  ): Promise<void> {
    await this.syncEventsToDatabase(webhookId, [event]);
  }

  // ==============================================
  // CONVENIENCE METHODS
  // ==============================================

  /**
   * Get latest webhook events across all event types
   * 
   * @param webhookId - DFNS webhook ID
   * @param count - Number of events to retrieve
   * @returns Latest webhook events
   */
  async getLatestWebhookEvents(
    webhookId: string,
    count: number = 10
  ): Promise<DfnsWebhookEventResponse[]> {
    const response = await this.listWebhookEvents(webhookId, { limit: count });
    return response.items;
  }

  /**
   * Check if webhook has any failed events
   * 
   * @param webhookId - DFNS webhook ID
   * @returns True if webhook has failed events
   */
  async hasFailedEvents(webhookId: string): Promise<boolean> {
    try {
      const response = await this.listWebhookEvents(webhookId, {
        deliveryFailed: true,
        limit: 1
      });
      return response.items.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get webhook health status based on recent events
   * 
   * @param webhookId - DFNS webhook ID
   * @returns Health status and metrics
   */
  async getWebhookHealth(webhookId: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    successRate: number;
    recentEventCount: number;
    failedEventCount: number;
    lastEventDate?: string;
  }> {
    try {
      const analytics = await this.getWebhookEventAnalytics(webhookId, 7); // 7 days
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (analytics.deliverySuccessRate < 50) {
        status = 'unhealthy';
      } else if (analytics.deliverySuccessRate < 90) {
        status = 'degraded';
      }

      return {
        status,
        successRate: analytics.deliverySuccessRate,
        recentEventCount: analytics.totalEvents,
        failedEventCount: analytics.failedDeliveries,
        lastEventDate: analytics.lastEventDate
      };
    } catch (error) {
      console.error('❌ Failed to get webhook health:', error);
      return {
        status: 'unhealthy',
        successRate: 0,
        recentEventCount: 0,
        failedEventCount: 0
      };
    }
  }
}

/**
 * Factory function to create DfnsWebhookEventsService instance
 */
export function getDfnsWebhookEventsService(
  client: WorkingDfnsClient,
  options?: WebhookServiceOptions
): DfnsWebhookEventsService {
  return new DfnsWebhookEventsService(client, options);
}

export default DfnsWebhookEventsService;
