import { BaseService } from '../BaseService'
import {
  BaseAuditEvent,
  AuditAnalytics,
  AuditStatistics,
  AuditCategory,
  AuditSeverity,
  AuditExportOptions,
  AuditServiceResult,
  SecurityAuditEvent
} from './types'

/**
 * Trend data interface
 */
interface TrendData {
  period: string
  count: number
  percentage_change?: number
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  average_response_time: number
  total_requests: number
  error_rate: number
  peak_usage_periods: Array<{ hour: number; count: number }>
  slowest_operations: Array<{ operation: string; avg_duration: number }>
}

/**
 * User behavior analytics interface
 */
interface UserBehaviorAnalytics {
  most_active_users: Array<{ user_id: string; action_count: number; last_seen: Date }>
  common_user_journeys: Array<{ sequence: string[]; frequency: number }>
  session_analytics: {
    average_session_duration: number
    total_sessions: number
    bounce_rate: number
  }
  geographic_distribution: Array<{ location: string; user_count: number }>
}

/**
 * Audit Analytics Service for Chain Capital
 * Provides comprehensive analytics, reporting, and insights
 */
export class AuditAnalyticsService extends BaseService {
  
  constructor() {
    super('AuditAnalytics')
  }

  /**
   * Get comprehensive audit analytics
   */
  async getAuditAnalytics(dateFrom?: Date, dateTo?: Date): Promise<AuditServiceResult<AuditAnalytics>> {
    try {
      const startDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      const endDate = dateTo || new Date()

      const where = {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }

      const [
        activityTrends,
        userActivity,
        performanceMetrics,
        complianceMetrics
      ] = await Promise.all([
        this.getActivityTrends(startDate, endDate),
        this.getUserActivityAnalytics(startDate, endDate),
        this.getPerformanceMetrics(startDate, endDate),
        this.getComplianceMetrics(startDate, endDate)
      ])

      // Simplified security events (no complex analytics)
      const securityEvents = {
        total: 0,
        by_severity: {} as Record<AuditSeverity, number>,
        recent_threats: [] as SecurityAuditEvent[]
      }

      const analytics: AuditAnalytics = {
        activity_trends: activityTrends,
        user_activity: userActivity,
        security_events: securityEvents,
        system_performance: performanceMetrics,
        compliance_metrics: complianceMetrics
      }

      return this.success(analytics)
    } catch (error) {
      this.logger.error({ error, dateFrom, dateTo }, 'Failed to get audit analytics')
      return this.error('Failed to get audit analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Get activity trends over time
   */
  async getActivityTrends(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Hourly trends for last 24 hours
      const hourlyTrends = await this.db.$queryRaw`
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
        GROUP BY hour
        ORDER BY hour
      `

      // Daily trends for the period
      const dailyTrends = await this.db.$queryRaw`
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
        GROUP BY date
        ORDER BY date
      `

      // Weekly trends
      const weeklyTrends = await this.db.$queryRaw`
        SELECT 
          DATE_TRUNC('week', timestamp) as week,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
        GROUP BY week
        ORDER BY week
      `

      return {
        hourly: (hourlyTrends as any[]).map((row: any) => ({
          hour: row.hour.toISOString(),
          count: parseInt(row.count)
        })),
        daily: (dailyTrends as any[]).map((row: any) => ({
          date: row.date.toISOString().split('T')[0],
          count: parseInt(row.count)
        })),
        weekly: (weeklyTrends as any[]).map((row: any) => ({
          week: row.week.toISOString().split('T')[0],
          count: parseInt(row.count)
        }))
      }
    } catch (error) {
      this.logger.error({ error, startDate, endDate }, 'Failed to get activity trends')
      return { hourly: [], daily: [], weekly: [] }
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const userStats = await this.db.$queryRaw`
        SELECT 
          user_id,
          username,
          COUNT(*) as total_actions,
          MAX(timestamp) as last_activity,
          string_agg(DISTINCT action, ', ' ORDER BY action) as common_actions
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate} 
          AND user_id IS NOT NULL
        GROUP BY user_id, username
        ORDER BY total_actions DESC
        LIMIT 50
      `

      return (userStats as any[]).map((row: any) => ({
        user_id: row.user_id,
        username: row.username || 'Unknown',
        total_actions: parseInt(row.total_actions),
        last_activity: row.last_activity,
        most_common_actions: row.common_actions ? row.common_actions.split(', ').slice(0, 5) : []
      }))
    } catch (error) {
      this.logger.error({ error, startDate, endDate }, 'Failed to get user activity analytics')
      return []
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const performanceData = await this.db.$queryRaw`
        SELECT 
          AVG(duration) as avg_response_time,
          COUNT(*) as total_api_calls,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(*) as total_count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate}
          AND duration IS NOT NULL
      `

      const peakHours = await this.db.$queryRaw`
        SELECT 
          EXTRACT(hour FROM timestamp) as hour,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate}
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 5
      `

      const firstRow = (performanceData as any[])[0]
      const totalCalls = parseInt(firstRow?.total_count || 0)
      const errorCount = parseInt(firstRow?.error_count || 0)
      
      return {
        average_response_time: parseFloat(firstRow?.avg_response_time || 0),
        total_api_calls: totalCalls,
        error_rate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
        peak_usage_hours: (peakHours as any[]).map((row: any) => `${row.hour}:00`)
      }
    } catch (error) {
      this.logger.error({ error, startDate, endDate }, 'Failed to get performance metrics')
      return {
        average_response_time: 0,
        total_api_calls: 0,
        error_rate: 0,
        peak_usage_hours: []
      }
    }
  }

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const complianceData = await this.db.audit_logs.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          category: AuditCategory.COMPLIANCE
        }
      })

      const totalChecks = complianceData.length
      const passedChecks = complianceData.filter(e => e.status === 'passed' || e.status === 'success').length
      const failedChecks = complianceData.filter(e => e.status === 'failed' || e.status === 'error').length
      const pendingChecks = complianceData.filter(e => e.status === 'pending').length

      return {
        total_checks: totalChecks,
        passed: passedChecks,
        failed: failedChecks,
        pending: pendingChecks,
        compliance_rate: totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0
      }
    } catch (error) {
      this.logger.error({ error, startDate, endDate }, 'Failed to get compliance metrics')
      return {
        total_checks: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        compliance_rate: 0
      }
    }
  }

  /**
   * Get detailed user behavior analytics
   */
  async getUserBehaviorAnalytics(dateFrom?: Date, dateTo?: Date): Promise<AuditServiceResult<UserBehaviorAnalytics>> {
    try {
      const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      const endDate = dateTo || new Date()

      // Most active users
      const activeUsers = await this.db.$queryRaw`
        SELECT 
          user_id,
          COUNT(*) as action_count,
          MAX(timestamp) as last_seen
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate}
          AND user_id IS NOT NULL
          AND category = 'user_action'
        GROUP BY user_id
        ORDER BY action_count DESC
        LIMIT 20
      `

      // Session analytics
      const sessionData = await this.db.$queryRaw`
        SELECT 
          session_id,
          user_id,
          MIN(timestamp) as session_start,
          MAX(timestamp) as session_end,
          COUNT(*) as action_count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate}
          AND session_id IS NOT NULL
        GROUP BY session_id, user_id
        HAVING COUNT(*) > 1
      `

      // Geographic distribution (based on IP addresses)
      const geoData = await this.db.$queryRaw`
        SELECT 
          COALESCE(ip_address, 'Unknown') as location,
          COUNT(DISTINCT user_id) as user_count
        FROM audit_logs 
        WHERE timestamp >= ${startDate} 
          AND timestamp <= ${endDate}
          AND user_id IS NOT NULL
        GROUP BY ip_address
        ORDER BY user_count DESC
        LIMIT 10
      `

      const sessions = sessionData as any[]
      const totalSessions = sessions.length
      const avgDuration = totalSessions > 0 
        ? sessions.reduce((sum, session) => {
            const duration = (new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 1000 / 60 // minutes
            return sum + duration
          }, 0) / totalSessions
        : 0

      const singleActionSessions = sessions.filter(s => s.action_count === 1).length
      const bounceRate = totalSessions > 0 ? (singleActionSessions / totalSessions) * 100 : 0

      const analytics: UserBehaviorAnalytics = {
        most_active_users: (activeUsers as any[]).map(user => ({
          user_id: user.user_id,
          action_count: parseInt(user.action_count),
          last_seen: user.last_seen
        })),
        common_user_journeys: [], // Would require more complex analysis
        session_analytics: {
          average_session_duration: avgDuration,
          total_sessions: totalSessions,
          bounce_rate: bounceRate
        },
        geographic_distribution: (geoData as any[]).map(geo => ({
          location: geo.location,
          user_count: parseInt(geo.user_count)
        }))
      }

      return this.success(analytics)
    } catch (error) {
      this.logger.error({ error, dateFrom, dateTo }, 'Failed to get user behavior analytics')
      return this.error('Failed to get user behavior analytics', 'USER_ANALYTICS_ERROR')
    }
  }

  /**
   * Generate audit export data
   */
  async exportAuditData(options: AuditExportOptions): Promise<AuditServiceResult<any>> {
    try {
      const where: any = {}

      // Apply date filters
      if (options.date_from || options.date_to) {
        const dateFilter: any = {}
        if (options.date_from) dateFilter.gte = new Date(options.date_from)
        if (options.date_to) dateFilter.lte = new Date(options.date_to)
        where.timestamp = dateFilter
      }

      // Apply category filters
      if (options.categories?.length) {
        where.category = { in: options.categories }
      }

      // Apply severity filters
      if (options.severities?.length) {
        where.severity = { in: options.severities }
      }

      // Apply user filters
      if (options.user_ids?.length) {
        where.user_id = { in: options.user_ids }
      }

      // Apply entity type filters
      if (options.entity_types?.length) {
        where.entity_type = { in: options.entity_types }
      }

      const events = await this.db.audit_logs.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.max_records || 10000,
        select: {
          id: true,
          timestamp: true,
          action: true,
          username: true,
          user_email: true,
          user_id: true,
          entity_type: true,
          entity_id: true,
          details: true,
          metadata: options.include_metadata ? true : undefined,
          old_data: options.include_changes ? true : undefined,
          new_data: options.include_changes ? true : undefined,
          changes: options.include_changes ? true : undefined,
          category: true,
          severity: true,
          correlation_id: true,
          session_id: true,
          ip_address: true,
          source: true,
          status: true,
          duration: true
        }
      })

      // Format data based on export format
      let exportData: any

      switch (options.format) {
        case 'csv':
          exportData = this.formatAsCSV(events)
          break
        case 'json':
          exportData = JSON.stringify(events, null, 2)
          break
        case 'excel':
          exportData = this.formatAsExcel(events)
          break
        case 'pdf':
          exportData = this.formatAsPDF(events)
          break
        default:
          exportData = events
      }

      return this.success({
        format: options.format,
        record_count: events.length,
        generated_at: new Date(),
        data: exportData
      })
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to export audit data')
      return this.error('Failed to export audit data', 'EXPORT_ERROR')
    }
  }




  /**
   * Private helper methods
   */

  private formatAsCSV(events: any[]): string {
    if (events.length === 0) return ''

    const headers = Object.keys(events[0]).join(',')
    const rows = events.map(event => 
      Object.values(event).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      ).join(',')
    )

    return [headers, ...rows].join('\n')
  }

  private formatAsExcel(events: any[]): any {
    // In a real implementation, use a library like xlsx
    return {
      format: 'excel',
      sheets: [
        {
          name: 'Audit Events',
          data: events
        }
      ]
    }
  }

  private formatAsPDF(events: any[]): any {
    // In a real implementation, use a library like pdfkit
    return {
      format: 'pdf',
      title: 'Audit Events Report',
      generated_at: new Date(),
      total_records: events.length,
      data: events.slice(0, 100) // Limit for PDF
    }
  }
}
