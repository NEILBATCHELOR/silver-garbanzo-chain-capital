/**
 * Analytics Domain Types
 * Types specific to analytics queries, reporting, and business intelligence
 */

/**
 * Analytics query structure
 */
export interface AnalyticsQuery {
  metric: string
  dimensions?: string[]
  filters?: Record<string, any>
  dateRange?: {
    start: string
    end: string
  }
  granularity?: 'hour' | 'day' | 'week' | 'month'
}

/**
 * Analytics result structure
 */
export interface AnalyticsResult {
  metric: string
  value: number | string
  change?: number
  changePercent?: number
  data?: Array<{
    date: string
    value: number
  }>
}
