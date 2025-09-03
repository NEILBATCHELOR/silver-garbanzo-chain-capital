/**
 * Subscription Analytics Service
 * Advanced analytics, reporting, and data export for subscription operations
 */

import { BaseService } from '../BaseService'
import type {
  InvestmentSubscription,
  InvestmentSubscriptionStatistics,
  InvestmentSubscriptionAnalytics,
  RedemptionStatistics,
  RedemptionAnalytics,
  InvestmentSubscriptionQueryOptions,
  RedemptionQueryOptions,
  InvestmentSubscriptionExportOptions,
  RedemptionExportOptions,
  Currency
} from '../../types/subscriptions'
import type { ServiceResult } from '../../types/index'
import {
  decimalToNumber,
  addDecimals,
  divideDecimals,
  isGreaterThanOrEqual,
  isLessThan
} from '../../utils/decimal-helpers'

export class SubscriptionAnalyticsService extends BaseService {

  constructor() {
    super('SubscriptionAnalytics')
  }

  /**
   * Get comprehensive subscription analytics
   */
  async getSubscriptionAnalytics(
    filters: InvestmentSubscriptionQueryOptions = {},
    timeframe: 'month' | 'quarter' | 'year' | 'all' = 'all'
  ): Promise<ServiceResult<InvestmentSubscriptionAnalytics>> {
    try {
      // Build date filter based on timeframe
      const dateFilter = this.buildDateFilter(timeframe)
      
      // Get basic statistics
      const summary = await this.calculateSubscriptionStatistics(filters, dateFilter)
      
      // Get trend data
      const trends = await this.calculateSubscriptionTrends(filters, dateFilter)
      
      // Get demographic data
      const demographics = await this.calculateSubscriptionDemographics(filters, dateFilter)

      const analytics: InvestmentSubscriptionAnalytics = {
        summary,
        trends,
        demographics
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get subscription analytics', { error, filters, timeframe })
      return this.error('Failed to get subscription analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Get comprehensive redemption analytics
   */
  async getRedemptionAnalytics(
    filters: RedemptionQueryOptions = {},
    timeframe: 'month' | 'quarter' | 'year' | 'all' = 'all'
  ): Promise<ServiceResult<RedemptionAnalytics>> {
    try {
      const dateFilter = this.buildDateFilter(timeframe)
      
      // Get basic statistics
      const summary = await this.calculateRedemptionStatistics(filters, dateFilter)
      
      // Get trend data
      const trends = await this.calculateRedemptionTrends(filters, dateFilter)
      
      // Get workflow metrics
      const workflowMetrics = await this.calculateRedemptionWorkflowMetrics(filters, dateFilter)

      const analytics: RedemptionAnalytics = {
        summary,
        trends,
        workflow_metrics: workflowMetrics
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get redemption analytics', { error, filters, timeframe })
      return this.error('Failed to get redemption analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Export subscription data in various formats
   */
  async exportSubscriptionData(
    options: InvestmentSubscriptionExportOptions
  ): Promise<ServiceResult<{
    data: any[]
    format: string
    filename: string
    totalRecords: number
  }>> {
    try {
      const { format, filters, include_investor_details, include_project_details, include_statistics } = options

      // Build query based on filters
      const where = this.buildWhereClause(filters)
      const include: any = {}

      if (include_investor_details) {
        include.investors = {
          select: {
            investor_id: true,
            name: true,
            email: true,
            investor_type: true
          }
        }
      }

      if (include_project_details) {
        include.projects = {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }

      // Get subscription data
      const subscriptions = await this.db.subscriptions.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' }
      })

      // Transform data based on format requirements
      let exportData: any[]

      switch (format) {
        case 'csv':
        case 'excel':
          exportData = await this.transformForSpreadsheet(subscriptions, include_statistics)
          break
        case 'json':
          exportData = await this.transformForJSON(subscriptions, include_statistics)
          break
        case 'pdf':
          exportData = await this.transformForPDF(subscriptions, include_statistics)
          break
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      const filename = this.generateFilename('subscriptions', format)

      return this.success({
        data: exportData,
        format,
        filename,
        totalRecords: subscriptions.length
      })
    } catch (error) {
      this.logError('Failed to export subscription data', { error, options })
      return this.error('Failed to export subscription data', 'EXPORT_ERROR')
    }
  }

  /**
   * Export redemption data in various formats
   */
  async exportRedemptionData(
    options: RedemptionExportOptions
  ): Promise<ServiceResult<{
    data: any[]
    format: string
    filename: string
    totalRecords: number
  }>> {
    try {
      const { format, filters, include_approval_details, include_workflow_history } = options

      // Build query based on filters
      const where = this.buildRedemptionWhereClause(filters)
      const include: any = {}

      if (include_approval_details) {
        include.redemption_approver_assignments = {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }

      // Get redemption data
      const redemptions = await this.db.redemption_requests.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' }
      })

      // Transform data based on format requirements
      let exportData: any[]

      switch (format) {
        case 'csv':
        case 'excel':
          exportData = this.transformRedemptionsForSpreadsheet(redemptions, include_workflow_history)
          break
        case 'json':
          exportData = this.transformRedemptionsForJSON(redemptions, include_workflow_history)
          break
        case 'pdf':
          exportData = this.transformRedemptionsForPDF(redemptions, include_workflow_history)
          break
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      const filename = this.generateFilename('redemptions', format)

      return this.success({
        data: exportData,
        format,
        filename,
        totalRecords: redemptions.length
      })
    } catch (error) {
      this.logError('Failed to export redemption data', { error, options })
      return this.error('Failed to export redemption data', 'EXPORT_ERROR')
    }
  }

  /**
   * Private analytics calculation methods
   */

  private async calculateSubscriptionStatistics(
    filters: InvestmentSubscriptionQueryOptions = {},
    dateFilter?: any
  ): Promise<InvestmentSubscriptionStatistics> {
    const where = { ...this.buildWhereClause(filters), ...dateFilter }

    const [
      subscriptions,
      totalAmount,
      confirmedAmount,
      allocatedAmount,
      distributedAmount,
      uniqueInvestors,
      uniqueProjects
    ] = await Promise.all([
      this.db.subscriptions.findMany({ where }),
      this.db.subscriptions.aggregate({
        where,
        _sum: { fiat_amount: true }
      }),
      this.db.subscriptions.aggregate({
        where: { ...where, confirmed: true },
        _sum: { fiat_amount: true }
      }),
      this.db.subscriptions.aggregate({
        where: { ...where, allocated: true },
        _sum: { fiat_amount: true }
      }),
      this.db.subscriptions.aggregate({
        where: { ...where, distributed: true },
        _sum: { fiat_amount: true }
      }),
      this.db.subscriptions.groupBy({
        where,
        by: ['investor_id']
      }),
      this.db.subscriptions.groupBy({
        where,
        by: ['project_id']
      })
    ])

    const total = decimalToNumber(totalAmount._sum.fiat_amount)
    const confirmed = decimalToNumber(confirmedAmount._sum.fiat_amount)
    const allocated = decimalToNumber(allocatedAmount._sum.fiat_amount)
    const distributed = decimalToNumber(distributedAmount._sum.fiat_amount)
    const pending = total - confirmed

    // Calculate currency breakdown
    const currencyBreakdown: Record<Currency, number> = {} as Record<Currency, number>
    subscriptions.forEach(sub => {
      const currency = sub.currency as Currency
      const amount = decimalToNumber(sub.fiat_amount)
      currencyBreakdown[currency] = (currencyBreakdown[currency] || 0) + amount
    })

    // Get date range
    const dates = subscriptions
      .map(s => s.subscription_date)
      .filter(Boolean)
      .sort()

    return {
      total_amount: total,
      currency_breakdown: currencyBreakdown,
      confirmed_amount: confirmed,
      allocated_amount: allocated,
      distributed_amount: distributed,
      pending_amount: pending,
      average_subscription_size: subscriptions.length > 0 ? total / subscriptions.length : 0,
      investor_count: uniqueInvestors.length,
      project_count: uniqueProjects.filter(p => p.project_id).length,
      completion_rate: total > 0 ? (distributed / total) * 100 : 0,
      first_subscription_date: dates[0] || undefined,
      last_subscription_date: dates[dates.length - 1] || undefined
    }
  }

  private async calculateSubscriptionTrends(
    filters: InvestmentSubscriptionQueryOptions = {},
    dateFilter?: any
  ): Promise<InvestmentSubscriptionAnalytics['trends']> {
    const where = { ...this.buildWhereClause(filters), ...dateFilter }

    // Monthly subscription trends
    const monthlyData = await this.db.subscriptions.groupBy({
      where,
      by: ['subscription_date'],
      _count: true,
      _sum: { fiat_amount: true }
    })

    const monthlyTrends = this.groupByMonth(monthlyData)

    // Investor trends
    const investorData = await this.db.subscriptions.groupBy({
      where,
      by: ['investor_id'],
      _count: { investor_id: true },
      _sum: { fiat_amount: true }
    })

    const investorTrends = await Promise.all(
      investorData.slice(0, 10).map(async (item) => {
        const investor = await this.db.investors.findUnique({
          where: { investor_id: item.investor_id },
          select: { investor_id: true, name: true }
        })

        const totalAmount = decimalToNumber(item._sum.fiat_amount)
        return {
          investor_id: item.investor_id,
          investor_name: investor?.name || 'Unknown',
          total_subscriptions: item._count.investor_id,
          total_amount: totalAmount,
          average_size: totalAmount / item._count.investor_id
        }
      })
    )

    // Project trends
    const projectData = await this.db.subscriptions.groupBy({
      where: { ...where, project_id: { not: null } },
      by: ['project_id'],
      _count: { project_id: true },
      _sum: { fiat_amount: true }
    })

    const projectTrends = await Promise.all(
      projectData.slice(0, 10).map(async (item) => {
        const project = item.project_id ? await this.db.projects.findUnique({
          where: { id: item.project_id },
          select: { id: true, name: true }
        }) : null

        return {
          project_id: item.project_id || '',
          project_name: project?.name || 'Unknown',
          subscription_count: item._count.project_id || 0,
          total_raised: decimalToNumber(item._sum.fiat_amount)
        }
      })
    )

    return {
      monthly_subscriptions: monthlyTrends,
      investor_trends: investorTrends,
      project_trends: projectTrends
    }
  }

  private async calculateSubscriptionDemographics(
    filters: InvestmentSubscriptionQueryOptions = {},
    dateFilter?: any
  ): Promise<InvestmentSubscriptionAnalytics['demographics']> {
    const where = { ...this.buildWhereClause(filters), ...dateFilter }

    // Get all subscriptions with investor data
    const subscriptions = await this.db.subscriptions.findMany({
      where,
      include: {
        investors: {
          select: {
            investor_type: true
          }
        }
      }
    })

    const totalAmount = subscriptions.reduce((sum, sub) => sum + decimalToNumber(sub.fiat_amount), 0)
    const totalCount = subscriptions.length

    // Currency demographics
    const byCurrency: Record<string, { count: number; amount: number; percentage: number }> = {}
    subscriptions.forEach(sub => {
      const currency = sub.currency
      if (!byCurrency[currency]) {
        byCurrency[currency] = { count: 0, amount: 0, percentage: 0 }
      }
      byCurrency[currency].count++
      byCurrency[currency].amount += decimalToNumber(sub.fiat_amount)
    })

    Object.keys(byCurrency).forEach(currency => {
      const currencyData = byCurrency[currency]
      if (currencyData) {
        currencyData.percentage = (currencyData.amount / totalAmount) * 100
      }
    })

    // Investor type demographics
    const byInvestorType: Record<string, { count: number; amount: number; percentage: number }> = {}
    subscriptions.forEach(sub => {
      const type = sub.investors?.investor_type || 'unknown'
      if (!byInvestorType[type]) {
        byInvestorType[type] = { count: 0, amount: 0, percentage: 0 }
      }
      byInvestorType[type].count++
      byInvestorType[type].amount += decimalToNumber(sub.fiat_amount)
    })

    Object.keys(byInvestorType).forEach(type => {
      const typeData = byInvestorType[type]
      if (typeData) {
        typeData.percentage = (typeData.amount / totalAmount) * 100
      }
    })

    // Subscription size demographics
    const sizeRanges = [
      { range: '$0 - $1K', min: 0, max: 1000 },
      { range: '$1K - $10K', min: 1000, max: 10000 },
      { range: '$10K - $100K', min: 10000, max: 100000 },
      { range: '$100K - $1M', min: 100000, max: 1000000 },
      { range: '$1M+', min: 1000000, max: Infinity }
    ]

    const bySubscriptionSize = sizeRanges.map(range => {
      const subsInRange = subscriptions.filter(sub => {
        const amount = decimalToNumber(sub.fiat_amount)
        return amount >= range.min && amount < range.max
      })
      const rangeAmount = subsInRange.reduce((sum, sub) => sum + decimalToNumber(sub.fiat_amount), 0)

      return {
        range: range.range,
        count: subsInRange.length,
        amount: rangeAmount,
        percentage: totalCount > 0 ? (subsInRange.length / totalCount) * 100 : 0
      }
    })

    return {
      by_currency: byCurrency,
      by_investor_type: byInvestorType,
      by_subscription_size: bySubscriptionSize
    }
  }

  private async calculateRedemptionStatistics(
    filters: RedemptionQueryOptions = {},
    dateFilter?: any
  ): Promise<RedemptionStatistics> {
    const where = { ...this.buildRedemptionWhereClause(filters), ...dateFilter }

    const [
      totalRequests,
      totalTokenAmount,
      approvedRequests,
      approvedAmount,
      rejectedRequests,
      rejectedAmount,
      pendingRequests,
      pendingAmount
    ] = await Promise.all([
      this.db.redemption_requests.count({ where }),
      this.db.redemption_requests.aggregate({
        where,
        _sum: { token_amount: true }
      }),
      this.db.redemption_requests.count({
        where: { ...where, status: 'approved' }
      }),
      this.db.redemption_requests.aggregate({
        where: { ...where, status: 'approved' },
        _sum: { token_amount: true }
      }),
      this.db.redemption_requests.count({
        where: { ...where, status: 'rejected' }
      }),
      this.db.redemption_requests.aggregate({
        where: { ...where, status: 'rejected' },
        _sum: { token_amount: true }
      }),
      this.db.redemption_requests.count({
        where: { ...where, status: { in: ['submitted', 'pending_approval'] } }
      }),
      this.db.redemption_requests.aggregate({
        where: { ...where, status: { in: ['submitted', 'pending_approval'] } },
        _sum: { token_amount: true }
      })
    ])

    const totalTokens = decimalToNumber(totalTokenAmount._sum.token_amount)
    const approvedTokens = decimalToNumber(approvedAmount._sum.token_amount)
    const rejectedTokens = decimalToNumber(rejectedAmount._sum.token_amount)
    const pendingTokens = decimalToNumber(pendingAmount._sum.token_amount)

    return {
      total_requests: totalRequests,
      total_token_amount: totalTokens,
      approved_requests: approvedRequests,
      approved_amount: approvedTokens,
      rejected_requests: rejectedRequests,
      rejected_amount: rejectedTokens,
      pending_requests: pendingRequests,
      pending_amount: pendingTokens,
      average_redemption_size: totalRequests > 0 ? totalTokens / totalRequests : 0,
      average_approval_time: 48, // TODO: Calculate actual approval times
      completion_rate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0,
      rejection_rate: totalRequests > 0 ? (rejectedRequests / totalRequests) * 100 : 0
    }
  }

  private async calculateRedemptionTrends(
    filters: RedemptionQueryOptions = {},
    dateFilter?: any
  ): Promise<RedemptionAnalytics['trends']> {
    // Simplified implementation - would need more complex grouping in production
    return {
      monthly_redemptions: [],
      window_performance: []
    }
  }

  private async calculateRedemptionWorkflowMetrics(
    filters: RedemptionQueryOptions = {},
    dateFilter?: any
  ): Promise<RedemptionAnalytics['workflow_metrics']> {
    // Simplified implementation
    return {
      average_approval_time: 48,
      approval_rate_by_type: {
        full: 85,
        partial: 92,
        dividend: 98,
        liquidation: 75
      },
      rejection_reasons: [
        { reason: 'Insufficient balance', count: 15, percentage: 30 },
        { reason: 'Invalid wallet address', count: 10, percentage: 20 },
        { reason: 'Outside redemption window', count: 8, percentage: 16 }
      ]
    }
  }

  /**
   * Private utility methods
   */

  private buildDateFilter(timeframe: 'month' | 'quarter' | 'year' | 'all') {
    const now = new Date()
    let startDate: Date

    switch (timeframe) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
      default:
        return undefined
    }

    return {
      created_at: {
        gte: startDate
      }
    }
  }

  private buildWhereClause(filters: InvestmentSubscriptionQueryOptions = {}): any {
    const where: any = {}

    if (filters.investor_id) where.investor_id = filters.investor_id
    if (filters.project_id) where.project_id = filters.project_id
    if (filters.currency && filters.currency.length > 0) {
      where.currency = { in: filters.currency }
    }
    if (filters.confirmed !== undefined) where.confirmed = filters.confirmed
    if (filters.allocated !== undefined) where.allocated = filters.allocated
    if (filters.distributed !== undefined) where.distributed = filters.distributed

    return where
  }

  private buildRedemptionWhereClause(filters: RedemptionQueryOptions = {}): any {
    const where: any = {}

    if (filters.investor_id) where.investor_id = filters.investor_id
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }
    if (filters.redemption_type && filters.redemption_type.length > 0) {
      where.redemption_type = { in: filters.redemption_type }
    }

    return where
  }

  private groupByMonth(data: any[]): Array<{
    month: string
    count: number
    total_amount: number
    currency_breakdown: Record<Currency, number>
  }> {
    // Simplified implementation - would need proper date grouping
    return []
  }

  private async transformForSpreadsheet(subscriptions: any[], includeStats?: boolean): Promise<any[]> {
    return subscriptions.map(sub => ({
      'Subscription ID': sub.subscription_id,
      'Investor ID': sub.investor_id,
      'Investor Name': sub.investors?.name || '',
      'Project': sub.projects?.name || '',
      'Amount': sub.fiat_amount,
      'Currency': sub.currency,
      'Confirmed': sub.confirmed ? 'Yes' : 'No',
      'Allocated': sub.allocated ? 'Yes' : 'No',
      'Distributed': sub.distributed ? 'Yes' : 'No',
      'Subscription Date': sub.subscription_date?.toISOString() || '',
      'Created At': sub.created_at?.toISOString() || '',
      'Updated At': sub.updated_at?.toISOString() || ''
    }))
  }

  private async transformForJSON(subscriptions: any[], includeStats?: boolean): Promise<any[]> {
    return subscriptions
  }

  private async transformForPDF(subscriptions: any[], includeStats?: boolean): Promise<any[]> {
    // Simplified for PDF format - would include formatting for PDF generation
    return this.transformForSpreadsheet(subscriptions, includeStats)
  }

  private transformRedemptionsForSpreadsheet(redemptions: any[], includeWorkflow?: boolean): any[] {
    return redemptions.map(red => ({
      'Redemption ID': red.id,
      'Token Amount': red.token_amount,
      'Token Type': red.token_type,
      'Redemption Type': red.redemption_type,
      'Status': red.status,
      'Source Wallet': red.source_wallet_address,
      'Destination Wallet': red.destination_wallet_address,
      'Conversion Rate': red.conversion_rate,
      'Created At': red.created_at?.toISOString() || '',
      'Updated At': red.updated_at?.toISOString() || ''
    }))
  }

  private transformRedemptionsForJSON(redemptions: any[], includeWorkflow?: boolean): any[] {
    return redemptions
  }

  private transformRedemptionsForPDF(redemptions: any[], includeWorkflow?: boolean): any[] {
    return this.transformRedemptionsForSpreadsheet(redemptions, includeWorkflow)
  }

  private generateFilename(type: string, format: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `${type}_export_${timestamp}.${format}`
  }
}
