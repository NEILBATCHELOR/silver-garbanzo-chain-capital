import crypto from 'crypto'
import { BaseService } from '../BaseService'
import {
  BaseAuditEvent,
  UserAuditEvent,
  SystemAuditEvent,
  DataAuditEvent,
  SecurityAuditEvent,
  ApiAuditEvent,
  AuditQueryOptions,
  AuditStatistics,
  AuditTrail,
  CreateAuditEventRequest,
  BulkCreateAuditRequest,
  AuditServiceResult,
  AuditPaginatedResponse,
  AuditEventFilters,
  AuditCategory,
  AuditSeverity,
  AuditEventType
} from './types'

/**
 * Performance-optimized Audit Service for Chain Capital
 * Provides comprehensive audit logging without database triggers
 * Uses application-level interceptors for maximum performance
 */
export class AuditService extends BaseService {
  private auditQueue: BaseAuditEvent[] = []
  private batchSize = 50
  private flushInterval = 5000 // 5 seconds
  private isFlushingQueue = false

  constructor() {
    super('Audit')
    this.startBatchProcessor()
  }

  /**
   * Create a single audit event (async for performance)
   */
  async createAuditEvent(eventData: CreateAuditEventRequest): Promise<AuditServiceResult<BaseAuditEvent>> {
    try {
      const auditEvent: BaseAuditEvent = {
        id: this.generateAuditId(),
        timestamp: new Date(),
        action: eventData.action,
        category: eventData.category,
        severity: eventData.severity || AuditSeverity.LOW,
        entity_type: eventData.entity_type,
        entity_id: eventData.entity_id,
        user_id: eventData.user_id,
        details: eventData.details,
        metadata: eventData.metadata,
        old_data: eventData.old_data,
        new_data: eventData.new_data,
        changes: eventData.changes,
        correlation_id: eventData.correlation_id || this.generateAuditId(),
        session_id: eventData.session_id,
        source: eventData.source || 'api',
        is_automated: false,
        importance: this.calculateImportance(eventData.category, eventData.severity),
        status: 'logged'
      }

      // Add to batch queue for performance
      this.auditQueue.push(auditEvent)
      
      // If queue is getting large, flush in background to avoid blocking
      if (this.auditQueue.length >= this.batchSize) {
        setImmediate(() => this.flushAuditQueue().catch(error => 
          this.logger.error({ error }, 'Failed to flush audit queue in background')
        ))
      }

      return this.success(auditEvent)
    } catch (error) {
      this.logger.error({ error, eventData }, 'Failed to create audit event')
      return this.error('Failed to create audit event', 'AUDIT_ERROR')
    }
  }

  /**
   * Create multiple audit events in batch (high performance)
   */
  async createBulkAuditEvents(request: BulkCreateAuditRequest): Promise<AuditServiceResult<BaseAuditEvent[]>> {
    try {
      const batchId = request.batch_id || this.generateAuditId()
      const events: BaseAuditEvent[] = []

      for (const eventData of request.events) {
        const auditEvent: BaseAuditEvent = {
          id: this.generateAuditId(),
          timestamp: new Date(),
          action: eventData.action,
          category: eventData.category,
          severity: eventData.severity || AuditSeverity.LOW,
          entity_type: eventData.entity_type,
          entity_id: eventData.entity_id,
          user_id: eventData.user_id,
          details: eventData.details,
          metadata: { ...eventData.metadata, batch_id: batchId },
          old_data: eventData.old_data,
          new_data: eventData.new_data,
          changes: eventData.changes,
          correlation_id: eventData.correlation_id || this.generateAuditId(),
          session_id: eventData.session_id,
          source: eventData.source || 'api',
          is_automated: false,
          importance: this.calculateImportance(eventData.category, eventData.severity),
          status: 'logged'
        }

        events.push(auditEvent)
        this.auditQueue.push(auditEvent)
      }

      // Process large batches immediately - but don't wait for completion to avoid blocking
      if (this.auditQueue.length >= this.batchSize) {
        // Use setImmediate to avoid blocking the response
        setImmediate(() => this.flushAuditQueue().catch(error => 
          this.logger.error({ error }, 'Failed to flush audit queue in background')
        ))
      }

      this.logger.info({ batchId, count: events.length }, 'Bulk audit events created')
      
      // Return the events immediately without waiting for database flush
      return this.success(events)
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to create bulk audit events')
      return this.error('Failed to create bulk audit events', 'BULK_AUDIT_ERROR')
    }
  }

  /**
   * Get audit event by ID
   */
  async getAuditEvent(id: string): Promise<AuditServiceResult<BaseAuditEvent>> {
    return await this.findById(this.db.audit_logs, id)
  }

  /**
   * Get paginated audit events with advanced filtering
   */
  async getAuditEvents(options: AuditQueryOptions = {}): Promise<AuditServiceResult<AuditPaginatedResponse<BaseAuditEvent>>> {
    try {
      const { skip, take, where, orderBy } = this.parseAuditQueryOptions(options)

      // Build advanced where clause
      const auditWhere: any = { ...where }

      // Add audit-specific filters
      if (options.user_id) {
        auditWhere.user_id = options.user_id
      }

      if (options.entity_type) {
        auditWhere.entity_type = options.entity_type
      }

      if (options.entity_id) {
        auditWhere.entity_id = options.entity_id
      }

      if (options.category) {
        if (Array.isArray(options.category)) {
          auditWhere.category = { in: options.category }
        } else {
          auditWhere.category = options.category
        }
      }

      if (options.severity) {
        if (Array.isArray(options.severity)) {
          auditWhere.severity = { in: options.severity }
        } else {
          auditWhere.severity = options.severity
        }
      }

      if (options.correlation_id) {
        auditWhere.correlation_id = options.correlation_id
      }

      if (options.session_id) {
        auditWhere.session_id = options.session_id
      }

      if (options.search_details) {
        auditWhere.OR = [
          { details: { contains: options.search_details, mode: 'insensitive' } },
          { action: { contains: options.search_details, mode: 'insensitive' } },
          { username: { contains: options.search_details, mode: 'insensitive' } }
        ]
      }

      // Date filtering
      if (options.date_from || options.date_to) {
        const dateFilter: any = {}
        if (options.date_from) {
          dateFilter.gte = new Date(options.date_from)
        }
        if (options.date_to) {
          dateFilter.lte = new Date(options.date_to)
        }
        auditWhere.timestamp = dateFilter
      }

      const [events, total] = await Promise.all([
        this.db.audit_logs.findMany({
          where: auditWhere,
          orderBy: orderBy || { timestamp: 'desc' },
          skip,
          take,
          select: {
            id: true,
            timestamp: true,
            action: true,
            username: true,
            user_email: true,
            user_id: true,
            entity_type: true,
            entity_id: true,
            details: options.include_metadata ? true : undefined,
            metadata: options.include_metadata ? true : undefined,
            old_data: options.include_changes ? true : undefined,
            new_data: options.include_changes ? true : undefined,
            changes: options.include_changes ? true : undefined,
            category: true,
            severity: true,
            correlation_id: true,
            session_id: true,
            source: true,
            is_automated: true,
            duration: true,
            importance: true,
            status: true
          }
        }),
        this.db.audit_logs.count({ where: auditWhere })
      ])

      const page = Math.floor(skip / take) + 1
      const paginatedResult = this.paginatedResponse(events as BaseAuditEvent[], total, page, take)

      return this.success(paginatedResult) as AuditServiceResult<AuditPaginatedResponse<BaseAuditEvent>>
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get audit events')
      return this.error('Failed to get audit events', 'QUERY_ERROR')
    }
  }

  /**
   * Get audit trail for specific entity
   */
  async getAuditTrail(entityType: string, entityId: string): Promise<AuditServiceResult<AuditTrail>> {
    try {
      const events = await this.db.audit_logs.findMany({
        where: {
          entity_type: entityType,
          entity_id: entityId
        },
        orderBy: { timestamp: 'asc' }
      })

      if (events.length === 0) {
        return this.error('No audit trail found for entity', 'NOT_FOUND', 404)
      }

      // Get unique contributors
      const contributorSet = new Set(events.filter(e => e.user_id).map(e => e.user_id!))
      const contributors = Array.from(contributorSet)
      
      // Count major changes (updates/deletes)
      const majorChanges = events.filter(e => 
        e.action?.includes('update') || 
        e.action?.includes('delete') || 
        e.changes !== null
      ).length

      const auditTrail: AuditTrail = {
        entity_type: entityType,
        entity_id: entityId,
        events: events as BaseAuditEvent[],
        summary: {
          total_events: events.length,
          first_event: events[0]?.timestamp || new Date(),
          last_event: events[events.length - 1]?.timestamp || new Date(),
          contributors,
          major_changes: majorChanges
        }
      }

      return this.success(auditTrail)
    } catch (error) {
      this.logger.error({ error, entityType, entityId }, 'Failed to get audit trail')
      return this.error('Failed to get audit trail', 'QUERY_ERROR')
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(dateFrom?: Date, dateTo?: Date): Promise<AuditServiceResult<AuditStatistics>> {
    try {
      const where: any = {}
      
      if (dateFrom || dateTo) {
        const dateFilter: any = {}
        if (dateFrom) dateFilter.gte = dateFrom
        if (dateTo) dateFilter.lte = dateTo
        where.timestamp = dateFilter
      }

      const [
        totalEvents,
        eventsByCategory,
        eventsBySeverity,
        eventsByUser,
        eventsByEntityType,
        recentActivity
      ] = await Promise.all([
        this.db.audit_logs.count({ where }),
        this.db.audit_logs.groupBy({
          by: ['category'],
          where,
          _count: { category: true }
        }),
        this.db.audit_logs.groupBy({
          by: ['severity'],
          where,
          _count: { severity: true }
        }),
        this.db.audit_logs.groupBy({
          by: ['user_id'],
          where: { ...where, user_id: { not: null } },
          _count: { user_id: true }
        }),
        this.db.audit_logs.groupBy({
          by: ['entity_type'],
          where: { ...where, entity_type: { not: null } },
          _count: { entity_type: true }
        }),
        this.db.audit_logs.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: {
            id: true,
            timestamp: true,
            action: true,
            username: true,
            entity_type: true,
            category: true,
            severity: true
          }
        })
      ])

      // Process grouped results into records
      const categoryStats: Record<AuditCategory, number> = {} as Record<AuditCategory, number>
      eventsByCategory.forEach((item: any) => {
        if (item.category) {
          categoryStats[item.category as AuditCategory] = item._count?.category || 0
        }
      })

      const severityStats: Record<AuditSeverity, number> = {} as Record<AuditSeverity, number>
      eventsBySeverity.forEach((item: any) => {
        if (item.severity) {
          severityStats[item.severity as AuditSeverity] = item._count?.severity || 0
        }
      })

      const userStats: Record<string, number> = {}
      eventsByUser.forEach((item: any) => {
        if (item.user_id) {
          userStats[item.user_id] = item._count?.user_id || 0
        }
      })

      const entityStats: Record<string, number> = {}
      eventsByEntityType.forEach((item: any) => {
        if (item.entity_type) {
          entityStats[item.entity_type] = item._count?.entity_type || 0
        }
      })

      const statistics: AuditStatistics = {
        total_events: totalEvents,
        events_by_category: categoryStats,
        events_by_severity: severityStats,
        events_by_user: userStats,
        events_by_entity_type: entityStats,
        recent_activity: recentActivity as BaseAuditEvent[],
        time_period: {
          start_date: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end_date: dateTo || new Date(),
          duration_hours: Math.abs((dateTo || new Date()).getTime() - (dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).getTime()) / (1000 * 60 * 60)
        }
      }

      return this.success(statistics)
    } catch (error) {
      this.logger.error({ error, dateFrom, dateTo }, 'Failed to get audit statistics')
      return this.error('Failed to get audit statistics', 'QUERY_ERROR')
    }
  }

  /**
   * Search audit events with advanced filters
   */
  async searchAuditEvents(filters: AuditEventFilters): Promise<AuditServiceResult<BaseAuditEvent[]>> {
    try {
      const where: any = {}

      // Apply all filters
      if (filters.user_ids?.length) {
        where.user_id = { in: filters.user_ids }
      }

      if (filters.entity_types?.length) {
        where.entity_type = { in: filters.entity_types }
      }

      if (filters.actions?.length) {
        where.action = { in: filters.actions }
      }

      if (filters.categories?.length) {
        where.category = { in: filters.categories }
      }

      if (filters.severities?.length) {
        where.severity = { in: filters.severities }
      }

      if (filters.date_range) {
        const dateFilter: any = {}
        if (filters.date_range.start) {
          dateFilter.gte = new Date(filters.date_range.start)
        }
        if (filters.date_range.end) {
          dateFilter.lte = new Date(filters.date_range.end)
        }
        where.timestamp = dateFilter
      }

      if (filters.has_changes) {
        where.changes = { not: null }
      }

      if (filters.has_metadata) {
        where.metadata = { not: null }
      }

      if (filters.correlation_ids?.length) {
        where.correlation_id = { in: filters.correlation_ids }
      }

      if (filters.session_ids?.length) {
        where.session_id = { in: filters.session_ids }
      }

      if (filters.ip_addresses?.length) {
        where.ip_address = { in: filters.ip_addresses }
      }

      if (filters.source_systems?.length) {
        where.source = { in: filters.source_systems }
      }

      if (filters.importance_min !== undefined) {
        where.importance = { gte: filters.importance_min }
      }

      if (filters.duration_min !== undefined || filters.duration_max !== undefined) {
        const durationFilter: any = {}
        if (filters.duration_min !== undefined) {
          durationFilter.gte = filters.duration_min
        }
        if (filters.duration_max !== undefined) {
          durationFilter.lte = filters.duration_max
        }
        where.duration = durationFilter
      }

      const events = await this.db.audit_logs.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 1000 // Reasonable limit for search results
      })

      return this.success(events as BaseAuditEvent[])
    } catch (error) {
      this.logger.error({ error, filters }, 'Failed to search audit events')
      return this.error('Failed to search audit events', 'SEARCH_ERROR')
    }
  }

  /**
   * Delete old audit events (for retention management)
   */
  async deleteOldAuditEvents(olderThanDays: number): Promise<AuditServiceResult<{ deletedCount: number }>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const result = await this.db.audit_logs.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          },
          // Don't delete critical security events
          severity: {
            not: AuditSeverity.CRITICAL
          }
        }
      })

      this.logger.info({ deletedCount: result.count, cutoffDate }, 'Old audit events deleted')
      
      return this.success({ deletedCount: result.count })
    } catch (error) {
      this.logger.error({ error, olderThanDays }, 'Failed to delete old audit events')
      return this.error('Failed to delete old audit events', 'DELETE_ERROR')
    }
  }

  /**
   * Performance-optimized batch processor
   * Processes audit queue in batches to avoid blocking operations
   * Note: This method is called in constructor, implementation is below
   */

  /**
   * Calculate importance score based on category and severity
   */
  private calculateImportance(category: AuditCategory, severity?: AuditSeverity): number {
    let score = 1

    // Category weights
    switch (category) {
      case AuditCategory.SECURITY:
        score += 4
        break
      case AuditCategory.COMPLIANCE:
        score += 3
        break
      case AuditCategory.AUTHENTICATION:
        score += 3
        break
      case AuditCategory.DATA_OPERATION:
        score += 2
        break
      case AuditCategory.USER_ACTION:
        score += 1
        break
      case AuditCategory.SYSTEM_PROCESS:
        score += 1
        break
      default:
        score += 0
    }

    // Severity weights
    switch (severity) {
      case AuditSeverity.CRITICAL:
        score += 4
        break
      case AuditSeverity.HIGH:
        score += 3
        break
      case AuditSeverity.MEDIUM:
        score += 2
        break
      case AuditSeverity.LOW:
        score += 1
        break
      default:
        score += 1
    }

    return Math.min(score, 10) // Cap at 10
  }

  /**
   * Quick audit logging method for high-frequency operations
   * This is optimized for performance and used by other services
   */
  async quickLog(
    action: string, 
    category: AuditCategory, 
    userId?: string,
    entityType?: string,
    entityId?: string,
    details?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Add to queue without awaiting - fire and forget for performance
    this.auditQueue.push({
      id: this.generateAuditId(),
      timestamp: new Date(),
      action,
      category,
      severity: AuditSeverity.LOW,
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      details,
      metadata,
      source: 'service',
      is_automated: false,
      importance: this.calculateImportance(category, AuditSeverity.LOW),
      status: 'queued'
    })

    // Flush if queue is getting large
    if (this.auditQueue.length >= this.batchSize) {
      setImmediate(() => this.flushAuditQueue())
    }
  }

  /**
   * Generate unique ID for audit events
   */
  private generateAuditId(): string {
    // Generate proper UUID for database compatibility
    return crypto.randomUUID()
  }

  /**
   * Start batch processor for queue management
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.auditQueue.length > 0 && !this.isFlushingQueue) {
        this.flushAuditQueue().catch(error => 
          this.logger.error({ error }, 'Failed to flush audit queue')
        )
      }
    }, this.flushInterval)
  }

  /**
   * Flush audit queue to database
   */
  private async flushAuditQueue(): Promise<void> {
    if (this.isFlushingQueue || this.auditQueue.length === 0) return

    this.isFlushingQueue = true
    const eventsToFlush = this.auditQueue.splice(0, this.batchSize)

    try {
      // Prepare events for database insertion
      const dbEvents = eventsToFlush.map(event => ({
        id: event.id || this.generateAuditId(),
        timestamp: event.timestamp || new Date(),
        action: event.action,
        category: event.category,
        severity: event.severity,
        user_id: event.user_id || null,
        entity_type: event.entity_type || null,
        entity_id: event.entity_id || null,
        details: event.details || null,
        metadata: event.metadata || undefined,
        old_data: event.old_data || undefined,
        new_data: event.new_data || undefined,
        changes: event.changes || undefined,
        correlation_id: event.correlation_id || null,
        session_id: event.session_id || null,
        ip_address: event.ip_address || null,
        user_agent: event.user_agent || null,
        source: event.source || 'api',
        is_automated: event.is_automated || false,
        duration: event.duration || null,
        importance: event.importance || 1,
        status: event.status || 'logged',
        occurred_at: event.timestamp || new Date()
      }))

      // Use createMany for better performance
      await this.db.audit_logs.createMany({
        data: dbEvents,
        skipDuplicates: true
      })

      this.logger.debug(`Flushed ${eventsToFlush.length} audit events to database`)
    } catch (error) {
      this.logger.error({ error, eventsCount: eventsToFlush.length }, 'Failed to flush audit events to database')
      // Re-add events back to queue for retry (at the beginning)
      this.auditQueue.unshift(...eventsToFlush)
    } finally {
      this.isFlushingQueue = false
    }
  }

  /**
   * Custom parseQueryOptions for audit events
   * Overrides base implementation to use 'timestamp' instead of 'created_at'
   */
  private parseAuditQueryOptions(options: AuditQueryOptions = {}): {
    skip: number
    take: number
    where: any
    orderBy: any
  } {
    const {
      page = 1,
      limit = 20,
      sort = 'timestamp',
      order = 'desc',
      filters = {}
    } = options

    // Calculate pagination
    const skip = (page - 1) * limit
    const take = Math.min(limit, 100) // Max 100 items per page

    // Build where clause from filters
    const whereClause: any = {}

    // Apply filters
    if (filters.user_id) {
      whereClause.user_id = filters.user_id
    }

    if (filters.entity_type) {
      whereClause.entity_type = filters.entity_type
    }

    if (filters.entity_id) {
      whereClause.entity_id = filters.entity_id
    }

    if (filters.category) {
      whereClause.category = filters.category
    }

    if (filters.severity) {
      whereClause.severity = filters.severity
    }

    if (filters.correlation_id) {
      whereClause.correlation_id = filters.correlation_id
    }

    if (filters.session_id) {
      whereClause.session_id = filters.session_id
    }

    // Date filtering using 'timestamp' field instead of 'created_at'
    if (filters.date_from || filters.date_to) {
      const timestampFilter: any = {}
      if (filters.date_from) timestampFilter.gte = new Date(filters.date_from)
      if (filters.date_to) timestampFilter.lte = new Date(filters.date_to)
      whereClause.timestamp = timestampFilter
    }

    // Build order by
    const orderBy = { [sort]: order }

    return {
      skip,
      take,
      where: whereClause,
      orderBy
    }
  }
}
