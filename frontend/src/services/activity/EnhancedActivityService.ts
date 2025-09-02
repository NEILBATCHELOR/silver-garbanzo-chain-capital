/**
 * Enhanced Activity Service v2
 * 
 * High-performance, asynchronous activity logging service that replaces
 * inefficient database triggers with queue-based processing.
 */

import { supabase } from './../../infrastructure/database/client';

// Activity Source Types
export enum ActivitySource {
  USER = 'USER',
  SYSTEM = 'SYSTEM', 
  DATABASE = 'DATABASE',
  INTEGRATION = 'INTEGRATION',
  API = 'API',
  BLOCKCHAIN = 'BLOCKCHAIN',
  COMPLIANCE = 'COMPLIANCE',
  WORKFLOW = 'WORKFLOW'
}

// Activity Categories
export enum ActivityCategory {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  AUTH = 'AUTH',
  DATA = 'DATA',
  FINANCIAL = 'FINANCIAL',
  COMPLIANCE = 'COMPLIANCE',
  SYSTEM = 'SYSTEM',
  INTEGRATION = 'INTEGRATION',
  BLOCKCHAIN = 'BLOCKCHAIN',
  DOCUMENT = 'DOCUMENT',
  POLICY = 'POLICY',
  WORKFLOW = 'WORKFLOW',
  NOTIFICATION = 'NOTIFICATION',
  BACKUP = 'BACKUP',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

// Activity Status
export enum ActivityStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  WARNING = 'WARNING',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS'
}

// Activity Severity Levels
export enum ActivitySeverity {
  INFO = 'INFO',
  NOTICE = 'NOTICE',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Core Activity Event Interface
export interface ActivityEvent {
  id?: string;
  source: ActivitySource;
  action: string;
  category: ActivityCategory;
  severity: ActivitySeverity;
  timestamp?: Date;
  entityType?: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  projectId?: string;
  status?: ActivityStatus;
  duration?: number;
  details?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  correlationId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  apiVersion?: string;
  requestId?: string;
  importance?: number;
  isAutomated?: boolean;
}

// Activity Filters for Querying
export interface ActivityFilters {
  source?: ActivitySource[];
  category?: ActivityCategory[];
  severity?: ActivitySeverity[];
  status?: ActivityStatus[];
  userId?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  startDate?: Date;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  correlationId?: string;
}

// Activity Query Result
export interface ActivityResult {
  activities: ActivityEvent[];
  total: number;
  totalCount: number;
  hasMore: boolean;
}

// Queue Metrics
export interface QueueMetrics {
  queueSize: number;
  cacheSize: number;
  processedCount: number;
  errorCount: number;
  processingRate: number;
  errorRate: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

// Activity Analytics
export interface ActivityAnalytics {
  totalEvents: number;
  eventsBySource: Record<ActivitySource, number>;
  eventsByCategory: Record<ActivityCategory, number>;
  eventsBySeverity: Record<ActivitySeverity, number>;
  averageResponseTime: number;
  errorRate: number;
  mostActiveUsers: Array<{ userId: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
}

// Operation Context
export interface OperationContext {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enhanced Activity Service Class
 * 
 * Provides high-performance, asynchronous activity logging with:
 * - Queue-based processing
 * - Intelligent batching
 * - Smart caching
 * - Real-time metrics
 * - Comprehensive error handling
 */
export class EnhancedActivityService {
  private queue: ActivityEvent[] = [];
  private cache = new Map<string, any>();
  private processing = false;
  private metrics = {
    processedCount: 0,
    errorCount: 0,
    totalProcessingTime: 0,
    lastProcessedAt: undefined as Date | undefined
  };

  // Configuration
  private config = {
    batchSize: 500,
    batchTimeout: 5000, // 5 seconds
    cacheTimeout: 300000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000
  };

  // Track processed IDs to prevent duplicates across service lifecycle
  private processedIds = new Set<string>();

  constructor() {
    this.startBatchProcessor();
    this.startCacheCleaner();
  }

  /**
   * Log an activity event
   */
  async logActivity(event: ActivityEvent): Promise<void> {
    try {
      // Generate a unique ID if not provided, ensuring uniqueness
      const eventId = event.id || this.generateUniqueId();
      
      // Add timestamp and correlation ID if not provided
      const enrichedEvent: ActivityEvent = {
        ...event,
        id: eventId,
        timestamp: event.timestamp || new Date(),
        correlationId: event.correlationId || this.generateCorrelationId(),
        isAutomated: event.isAutomated ?? (event.source === ActivitySource.SYSTEM)
      };

      // Enhanced duplicate detection across queue and processed history
      const isDuplicate = this.processedIds.has(eventId) || 
        this.queue.find(queuedEvent => 
          queuedEvent.id === eventId || 
          (queuedEvent.action === enrichedEvent.action && 
           queuedEvent.source === enrichedEvent.source &&
           queuedEvent.correlationId === enrichedEvent.correlationId &&
           Math.abs((queuedEvent.timestamp?.getTime() || 0) - (enrichedEvent.timestamp?.getTime() || 0)) < 1000)
        );

      if (isDuplicate) {
        // Silent skip for duplicates to reduce console noise
        return;
      }

      // Track this ID to prevent future duplicates
      this.processedIds.add(eventId);

      // Add to queue for batch processing
      this.queue.push(enrichedEvent);

      // If queue is getting large, process immediately
      if (this.queue.length >= this.config.batchSize) {
        this.processBatch();
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      this.metrics.errorCount++;
    }
  }

  /**
   * Query activities with filters
   */
  async getActivities(filters: ActivityFilters = {}): Promise<ActivityResult> {
    try {
      const cacheKey = this.getCacheKey('activities', filters);
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.source?.length) {
        query = query.in('source', filters.source);
      }
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      if (filters.severity?.length) {
        query = query.in('severity', filters.severity);
      }
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('timestamp', filters.dateTo.toISOString());
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      if (filters.searchTerm) {
        query = query.or(`action.ilike.%${filters.searchTerm}%,details.ilike.%${filters.searchTerm}%`);
      }
      if (filters.correlationId) {
        query = query.eq('correlation_id', filters.correlationId);
      }

      // Apply pagination
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by timestamp desc
      query = query.order('timestamp', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const result: ActivityResult = {
        activities: (data || []).map(item => ({
          ...item,
          timestamp: new Date(item.timestamp),
          source: item.source as ActivitySource,
          category: item.category as ActivityCategory,
          severity: item.severity as ActivitySeverity,
          status: item.status as ActivityStatus,
          changes: item.changes ? (typeof item.changes === 'string' ? JSON.parse(item.changes) : item.changes) as Record<string, any> : undefined,
          oldData: item.old_data ? (typeof item.old_data === 'string' ? JSON.parse(item.old_data) : item.old_data) as Record<string, any> : undefined,
          newData: item.new_data ? (typeof item.new_data === 'string' ? JSON.parse(item.new_data) : item.new_data) as Record<string, any> : undefined,
          metadata: item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) as Record<string, any> : undefined
        })),
        total: count || 0,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit
      };

      // Cache result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Failed to get activities:', error);
      throw error;
    }
  }

  /**
   * Get activity analytics
   */
  async getAnalytics(projectId?: string, days: number = 30): Promise<ActivityAnalytics> {
    try {
      const cacheKey = this.getCacheKey('analytics', { projectId, days });
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      let query = supabase
        .from('audit_logs')
        .select('source, category, severity, user_id, timestamp, duration')
        .gte('timestamp', dateFrom.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const analytics = this.calculateAnalytics(data || []);
      
      // Cache result
      this.cache.set(cacheKey, analytics);

      return analytics;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(): QueueMetrics {
    const processingRate = this.metrics.lastProcessedAt 
      ? this.metrics.processedCount / Math.max(1, (Date.now() - this.metrics.lastProcessedAt.getTime()) / 60000)
      : 0;
    
    const errorRate = this.metrics.processedCount > 0 
      ? this.metrics.errorCount / this.metrics.processedCount 
      : 0;

    return {
      queueSize: this.queue.length,
      cacheSize: this.cache.size,
      processedCount: this.metrics.processedCount,
      errorCount: this.metrics.errorCount,
      processingRate,
      errorRate,
      averageProcessingTime: this.metrics.processedCount > 0 
        ? this.metrics.totalProcessingTime / this.metrics.processedCount 
        : 0,
      lastProcessedAt: this.metrics.lastProcessedAt
    };
  }

  /**
   * Flush queue immediately
   */
  async flushQueue(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Process batch of activities
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const startTime = Date.now();
    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      // Remove duplicates based on ID to prevent duplicate key errors
      const uniqueBatch = batch.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      // Check for existing IDs in database to prevent duplicates across batches
      const eventIds = uniqueBatch.map(event => event.id).filter(Boolean);
      if (eventIds.length > 0) {
        const { data: existingEvents } = await supabase
          .from('audit_logs')
          .select('id')
          .in('id', eventIds);

        const existingIds = new Set((existingEvents || []).map(e => e.id));
        
        // Filter out events that already exist in database
        const newEvents = uniqueBatch.filter(event => !existingIds.has(event.id));
        
        // Reduce console noise by only logging significant duplicate counts
        if (newEvents.length !== uniqueBatch.length && (uniqueBatch.length - newEvents.length) > 5) {
          console.warn(`Filtered out ${uniqueBatch.length - newEvents.length} duplicate events that already exist in database`);
        }

        // If no new events to process, skip database operation
        if (newEvents.length === 0) {
          this.metrics.processedCount += uniqueBatch.length;
          this.metrics.totalProcessingTime += Date.now() - startTime;
          this.metrics.lastProcessedAt = new Date();
          return;
        }

        // Update uniqueBatch to only include new events
        uniqueBatch.length = 0;
        uniqueBatch.push(...newEvents);
      }

      // Transform events for database
      const dbEvents = uniqueBatch.map(event => ({
        id: event.id,
        timestamp: event.timestamp?.toISOString() || new Date().toISOString(),
        action: event.action,
        username: event.userEmail || null,
        user_email: event.userEmail || null,
        user_id: event.userId || null,
        entity_type: event.entityType || null,
        entity_id: event.entityId || null,
        status: event.status || ActivityStatus.SUCCESS,
        details: event.details || null,
        old_data: event.oldData || null,
        new_data: event.newData || null,
        changes: event.changes || null,
        metadata: event.metadata || null,
        project_id: event.projectId || null,
        source: event.source,
        category: event.category,
        severity: event.severity,
        duration: event.duration || null,
        correlation_id: event.correlationId || null,
        session_id: event.sessionId || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        api_version: event.apiVersion || null,
        request_id: event.requestId || null,
        importance: event.importance || null,
        is_automated: event.isAutomated || false
      }));

      // Insert batch into database with enhanced error handling
      const { error } = await supabase
        .from('audit_logs')
        .insert(dbEvents);

      if (error) {
        // Check if it's a duplicate key error and handle gracefully
        if (error.code === '23505' && error.message?.includes('duplicate key')) {
          // Reduced logging for duplicate key errors - only log significant batches
          if (dbEvents.length > 10) {
            console.warn('Large batch duplicate activity events detected:', {
              errorCode: error.code,
              batchSize: dbEvents.length,
              message: 'Attempting individual inserts'
            });
          }
          
          // Try to insert each event individually to identify which ones are duplicates
          let successCount = 0;
          let duplicateCount = 0;
          
          for (const event of dbEvents) {
            try {
              await supabase.from('audit_logs').insert([event]);
              successCount++;
              this.processedIds.add(event.id!); // Track successful inserts
            } catch (individualError: any) {
              if (individualError.code === '23505') {
                duplicateCount++;
                this.processedIds.add(event.id!); // Track duplicates to prevent future attempts
              } else {
                console.error(`Failed to insert individual event ${event.id}:`, individualError);
              }
            }
          }
          
          // Only log summary if significant activity
          if (successCount > 0 || duplicateCount > 5) {
            console.info(`Batch processing complete: ${successCount} inserted, ${duplicateCount} duplicates skipped`);
          }
        } else {
          throw error;
        }
      }

      // Update metrics based on unique events processed
      this.metrics.processedCount += uniqueBatch.length;
      this.metrics.totalProcessingTime += Date.now() - startTime;
      this.metrics.lastProcessedAt = new Date();

      // Clear relevant cache entries
      this.invalidateCache(['activities', 'analytics']);

    } catch (error) {
      console.error('Failed to process activity batch:', error);
      this.metrics.errorCount += batch.length;
      
      // For non-duplicate errors, put failed events back in queue for retry with new IDs
      if (!(error as any)?.code || (error as any).code !== '23505') {
        const retryEvents = batch.map(event => ({
          ...event,
          id: crypto.randomUUID() // Generate new ID for retry
        }));
        this.queue.unshift(...retryEvents);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0) {
        await this.processBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Start cache cleaner
   */
  private startCacheCleaner(): void {
    setInterval(() => {
      // Clean cache entries older than timeout
      const now = Date.now();
      for (const [key, value] of Array.from(this.cache.entries())) {
        if (value._cached && now - value._cached > this.config.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, this.config.cacheTimeout);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, params: any): string {
    return `${type}_${JSON.stringify(params)}`;
  }

  /**
   * Invalidate cache entries
   */
  private invalidateCache(types: string[]): void {
    for (const key of Array.from(this.cache.keys())) {
      if (types.some(type => key.startsWith(type))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID using proper UUID format
   * Fixed: August 11, 2025 - Removed invalid base-36 characters that caused UUID validation errors
   */
  private generateUniqueId(): string {
    // Use crypto.randomUUID() for proper UUID format (only hex characters 0-9, a-f)
    return crypto.randomUUID();
  }

  // Add counter for ID generation
  private idCounter = 0;

  /**
   * Calculate analytics from raw data
   */
  private calculateAnalytics(data: any[]): ActivityAnalytics {
    const analytics: ActivityAnalytics = {
      totalEvents: data.length,
      eventsBySource: {} as Record<ActivitySource, number>,
      eventsByCategory: {} as Record<ActivityCategory, number>,
      eventsBySeverity: {} as Record<ActivitySeverity, number>,
      averageResponseTime: 0,
      errorRate: 0,
      mostActiveUsers: [],
      peakHours: []
    };

    // Initialize counters
    Object.values(ActivitySource).forEach(source => {
      analytics.eventsBySource[source] = 0;
    });
    Object.values(ActivityCategory).forEach(category => {
      analytics.eventsByCategory[category] = 0;
    });
    Object.values(ActivitySeverity).forEach(severity => {
      analytics.eventsBySeverity[severity] = 0;
    });

    const userCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;

    // Process data
    data.forEach(event => {
      // Count by source, category, severity
      if (event.source) analytics.eventsBySource[event.source as ActivitySource]++;
      if (event.category) analytics.eventsByCategory[event.category as ActivityCategory]++;
      if (event.severity) analytics.eventsBySeverity[event.severity as ActivitySeverity]++;

      // Track response times
      if (event.duration) {
        totalDuration += event.duration;
        durationCount++;
      }

      // Track errors
      if (event.severity === ActivitySeverity.ERROR || event.severity === ActivitySeverity.CRITICAL) {
        errorCount++;
      }

      // Track user activity
      if (event.user_id) {
        userCounts.set(event.user_id, (userCounts.get(event.user_id) || 0) + 1);
      }

      // Track peak hours
      if (event.timestamp) {
        const hour = new Date(event.timestamp).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });

    // Calculate averages and rates
    analytics.averageResponseTime = durationCount > 0 ? totalDuration / durationCount : 0;
    analytics.errorRate = data.length > 0 ? errorCount / data.length : 0;

    // Get top users
    analytics.mostActiveUsers = Array.from(userCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Get peak hours
    analytics.peakHours = Array.from(hourCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([hour, count]) => ({ hour, count }));

    return analytics;
  }
}

// Singleton instance
export const enhancedActivityService = new EnhancedActivityService();

// Convenience functions for common logging patterns
export const logUserAction = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    projectId?: string;
    details?: string;
    metadata?: Record<string, any>;
  }
) => {
  return enhancedActivityService.logActivity({
    source: ActivitySource.USER,
    action,
    category: ActivityCategory.USER_MANAGEMENT,
    severity: ActivitySeverity.INFO,
    ...details
  });
};

export const logSystemEvent = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    projectId?: string;
    details?: string;
    metadata?: Record<string, any>;
    severity?: ActivitySeverity;
  }
) => {
  return enhancedActivityService.logActivity({
    source: ActivitySource.SYSTEM,
    action,
    category: ActivityCategory.SYSTEM,
    severity: details.severity || ActivitySeverity.INFO,
    ...details
  });
};

export const logIntegrationEvent = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    projectId?: string;
    details?: string;
    metadata?: Record<string, any>;
    status?: ActivityStatus;
  }
) => {
  return enhancedActivityService.logActivity({
    source: ActivitySource.INTEGRATION,
    action,
    category: ActivityCategory.INTEGRATION,
    severity: ActivitySeverity.INFO,
    ...details
  });
};

export default enhancedActivityService;