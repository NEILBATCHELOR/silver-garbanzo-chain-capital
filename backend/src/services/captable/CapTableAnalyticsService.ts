// Captable Analytics Service - Analytics & reporting
// Provides comprehensive analytics and reporting for captable operations

import { BaseService } from '../BaseService'
import { Decimal } from 'decimal.js'
import { logger } from '@/utils/logger'
import {
  CapTableAnalytics,
  CapTableStatistics,
  InvestorStatistics,
  SubscriptionStatistics,
  TokenAllocationStatistics,
  DistributionStatistics,
  CapTableExportOptions,
  ServiceResult
} from '@/types/captable-service'

export class CapTableAnalyticsService extends BaseService {
  constructor() {
    super('CapTableAnalytics')
  }

  // ============================================================================
  // COMPREHENSIVE ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive cap table analytics
   */
  async getCapTableAnalytics(projectId: string): Promise<ServiceResult<CapTableAnalytics>> {
    try {
      this.logInfo('Getting comprehensive cap table analytics', { projectId })

      const [
        summary,
        investors,
        subscriptions,
        allocations,
        distributions,
        timeline,
        geography,
        demographics
      ] = await Promise.all([
        this.getCapTableStatistics(projectId),
        this.getInvestorStatistics(projectId),
        this.getSubscriptionStatistics(projectId),
        this.getTokenAllocationStatistics(projectId),
        this.getDistributionStatistics(projectId),
        this.getTimelineAnalytics(projectId),
        this.getGeographyAnalytics(projectId),
        this.getDemographicsAnalytics(projectId)
      ])

      const analytics: CapTableAnalytics = {
        summary: summary.data!,
        investors: investors.data!,
        subscriptions: subscriptions.data!,
        allocations: allocations.data!,
        distributions: distributions.data!,
        timeline: timeline.data!,
        geography: geography.data!,
        demographics: demographics.data!
      }

      return this.success(analytics, 'Analytics retrieved successfully')

    } catch (error) {
      this.logError('Error getting cap table analytics', { error, projectId })
      return this.error('Failed to get analytics', 'ANALYTICS_FAILED')
    }
  }

  // ============================================================================
  // SPECIFIC STATISTICS
  // ============================================================================

  /**
   * Get cap table statistics
   */
  async getCapTableStatistics(projectId: string): Promise<ServiceResult<CapTableStatistics>> {
    try {
      const [subscriptions, tokenAllocations, distributions] = await Promise.all([
        this.db.subscriptions.findMany({
          where: { project_id: projectId },
          include: { investors: true }
        }),
        this.db.token_allocations.findMany({
          where: { project_id: projectId }
        }),
        this.db.distributions.findMany({
          where: { project_id: projectId }
        })
      ])

      // Calculate unique investors
      const uniqueInvestors = new Set(subscriptions.map((s: any) => s.investor_id)).size

      // Calculate totals
      const totalRaised = subscriptions.reduce(
        (sum: Decimal, sub: any) => sum.add(sub.subscription_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const totalTokensAllocated = tokenAllocations.reduce(
        (sum: Decimal, alloc: any) => sum.add(alloc.token_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const totalTokensDistributed = distributions.reduce(
        (sum: Decimal, dist: any) => sum.add(dist.token_amount || new Decimal(0)), 
        new Decimal(0)
      )

      // Calculate averages
      const averageInvestment = subscriptions.length > 0 
        ? totalRaised.dividedBy(subscriptions.length)
        : new Decimal(0)

      // Calculate median investment
      const sortedAmounts = subscriptions
        .map((s: any) => s.subscription_amount || new Decimal(0))
        .sort((a: Decimal, b: Decimal) => a.minus(b).toNumber())
      
      const medianInvestment = sortedAmounts.length > 0
        ? sortedAmounts.length % 2 === 0
          ? (sortedAmounts[Math.floor(sortedAmounts.length / 2) - 1] || new Decimal(0))
              .add(sortedAmounts[Math.floor(sortedAmounts.length / 2)] || new Decimal(0))
              .dividedBy(2)
          : sortedAmounts[Math.floor(sortedAmounts.length / 2)] || new Decimal(0)
        : new Decimal(0)

      // Calculate completion percentages
      const completionPercentage = totalTokensAllocated.greaterThan(0)
        ? totalTokensDistributed.dividedBy(totalTokensAllocated).mul(100).toNumber()
        : 0

      const kycApprovedInvestors = subscriptions.filter((s: any) => 
        s.investors && s.investors.kyc_status === 'approved'
      ).length

      const kycCompletionRate = uniqueInvestors > 0 
        ? (kycApprovedInvestors / uniqueInvestors) * 100
        : 0

      const distributedAllocations = tokenAllocations.filter((alloc: any) => alloc.distributed).length
      const distributionCompletionRate = tokenAllocations.length > 0
        ? (distributedAllocations / tokenAllocations.length) * 100
        : 0

      const statistics: CapTableStatistics = {
        totalInvestors: uniqueInvestors,
        totalRaised,
        totalTokensAllocated,
        totalTokensDistributed,
        averageInvestment,
        medianInvestment,
        completionPercentage,
        kycCompletionRate,
        distributionCompletionRate
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Error getting cap table statistics', { error, projectId })
      return this.error('Failed to get statistics', 'STATISTICS_FAILED')
    }
  }

  /**
   * Get investor statistics
   */
  async getInvestorStatistics(projectId: string): Promise<ServiceResult<InvestorStatistics>> {
    try {
      // Get all investors who have subscriptions for this project
      const subscriptions = await this.db.subscriptions.findMany({
        where: { project_id: projectId },
        include: { investors: true }
      })

      const investors = subscriptions
        .map((s: any) => s.investors)
        .filter((inv: any, index: number, self: any[]) => inv && self.findIndex((i: any) => i?.id === inv?.id) === index)

      const totalInvestors = investors.length
      const activeInvestors = investors.filter((inv: any) => inv?.is_active).length
      const kycApprovedInvestors = investors.filter((inv: any) => inv?.kyc_status === 'approved').length

      // Calculate average investment per investor
      const investorTotals = new Map<string, Decimal>()
      subscriptions.forEach((sub: any) => {
        const current = investorTotals.get(sub.investor_id) || new Decimal(0)
        investorTotals.set(sub.investor_id, current.add(sub.subscription_amount || new Decimal(0)))
      })

      const totalInvestmentAmount = Array.from(investorTotals.values())
        .reduce((sum, amount) => sum.add(amount), new Decimal(0))

      const averageInvestment = totalInvestors > 0 
        ? totalInvestmentAmount.dividedBy(totalInvestors)
        : new Decimal(0)

      // Calculate total net worth
      const totalNetWorth = investors
        .filter((inv: any) => inv?.net_worth)
        .reduce((sum: Decimal, inv: any) => sum.add(inv!.net_worth!), new Decimal(0))

      // Distribution analysis
      const investorTypeDistribution = this.calculateDistribution(
        investors.map((inv: any) => inv.investor_type || 'unknown')
      )

      const riskToleranceDistribution = this.calculateDistribution(
        investors.map((inv: any) => inv.risk_tolerance || 'unknown')
      )

      const geographicDistribution = this.calculateDistribution(
        investors.map((inv: any) => inv.residence_country || 'unknown')
      )

      const statistics: InvestorStatistics = {
        totalInvestors,
        activeInvestors,
        kycApprovedInvestors,
        averageInvestment,
        totalNetWorth,
        investorTypeDistribution,
        riskToleranceDistribution,
        geographicDistribution
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Error getting investor statistics', { error, projectId })
      return this.error('Failed to get investor statistics', 'STATISTICS_FAILED')
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStatistics(projectId: string): Promise<ServiceResult<SubscriptionStatistics>> {
    try {
      const subscriptions = await this.db.subscriptions.findMany({
        where: { project_id: projectId }
      })

      const totalSubscriptions = subscriptions.length
      const totalAmount = subscriptions.reduce(
        (sum: Decimal, sub: any) => sum.add(sub.subscription_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const averageSubscription = totalSubscriptions > 0 
        ? totalAmount.dividedBy(totalSubscriptions)
        : new Decimal(0)

      // Calculate median
      const sortedAmounts = subscriptions
        .map((s: any) => s.subscription_amount || new Decimal(0))
        .sort((a: Decimal, b: Decimal) => a.minus(b).toNumber())
      
      const medianSubscription = sortedAmounts.length > 0
        ? sortedAmounts.length % 2 === 0
          ? (sortedAmounts[Math.floor(sortedAmounts.length / 2) - 1] || new Decimal(0))
              .add(sortedAmounts[Math.floor(sortedAmounts.length / 2)] || new Decimal(0))
              .dividedBy(2)
          : sortedAmounts[Math.floor(sortedAmounts.length / 2)] || new Decimal(0)
        : new Decimal(0)

      // Calculate rates
      const allocatedSubscriptions = subscriptions.filter((s: any) => s.allocated).length
      const allocationRate = totalSubscriptions > 0 
        ? (allocatedSubscriptions / totalSubscriptions) * 100
        : 0

      const paidSubscriptions = subscriptions.filter((s: any) => s.payment_status === 'paid' || s.payment_status === 'completed').length
      const paymentCompletionRate = totalSubscriptions > 0 
        ? (paidSubscriptions / totalSubscriptions) * 100
        : 0

      // Monthly trend analysis
      const monthlyTrend = this.calculateMonthlyTrend(subscriptions)

      const statistics: SubscriptionStatistics = {
        totalSubscriptions,
        totalAmount,
        averageSubscription,
        medianSubscription,
        allocationRate,
        paymentCompletionRate,
        monthlySubscriptionTrend: monthlyTrend
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Error getting subscription statistics', { error, projectId })
      return this.error('Failed to get subscription statistics', 'STATISTICS_FAILED')
    }
  }

  /**
   * Get token allocation statistics
   */
  async getTokenAllocationStatistics(projectId: string): Promise<ServiceResult<TokenAllocationStatistics>> {
    try {
      const [tokenAllocations, distributions] = await Promise.all([
        this.db.token_allocations.findMany({
          where: { project_id: projectId }
        }),
        this.db.distributions.findMany({
          where: { project_id: projectId }
        })
      ])

      const totalAllocations = tokenAllocations.length
      const totalTokensAllocated = tokenAllocations.reduce(
        (sum: Decimal, alloc: any) => sum.add(alloc.token_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const totalTokensDistributed = distributions.reduce(
        (sum: Decimal, dist: any) => sum.add(dist.token_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const averageAllocation = totalAllocations > 0 
        ? totalTokensAllocated.dividedBy(totalAllocations)
        : new Decimal(0)

      const distributionRate = totalTokensAllocated.greaterThan(0)
        ? totalTokensDistributed.dividedBy(totalTokensAllocated).mul(100).toNumber()
        : 0

      // Token type distribution
      const tokenTypeDistribution: Record<string, Decimal> = {}
      tokenAllocations.forEach((alloc: any) => {
        const type = alloc.token_type || 'unknown'
        tokenTypeDistribution[type] = (tokenTypeDistribution[type] || new Decimal(0))
          .add(alloc.token_amount || new Decimal(0))
      })

      // Standard distribution
      const standardDistribution = this.calculateDistribution(
        tokenAllocations.map((alloc: any) => alloc.standard?.toString() || 'unknown')
      )

      const statistics: TokenAllocationStatistics = {
        totalAllocations,
        totalTokensAllocated,
        totalTokensDistributed,
        averageAllocation,
        distributionRate,
        tokenTypeDistribution,
        standardDistribution
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Error getting token allocation statistics', { error, projectId })
      return this.error('Failed to get allocation statistics', 'STATISTICS_FAILED')
    }
  }

  /**
   * Get distribution statistics
   */
  async getDistributionStatistics(projectId: string): Promise<ServiceResult<DistributionStatistics>> {
    try {
      const distributions = await this.db.distributions.findMany({
        where: { project_id: projectId }
      })

      const totalDistributions = distributions.length
      const totalTokensDistributed = distributions.reduce(
        (sum: Decimal, dist: any) => sum.add(dist.token_amount || new Decimal(0)), 
        new Decimal(0)
      )

      const averageDistribution = totalDistributions > 0 
        ? totalTokensDistributed.dividedBy(totalDistributions)
        : new Decimal(0)

      // Blockchain distribution
      const blockchainDistribution = this.calculateDistribution(
        distributions.map((dist: any) => dist.blockchain || 'unknown')
      )

      // Redemption rate
      const redeemedDistributions = distributions.filter((dist: any) => dist.fully_redeemed).length
      const redemptionRate = totalDistributions > 0 
        ? (redeemedDistributions / totalDistributions) * 100
        : 0

      // Monthly trend analysis
      const monthlyTrend = this.calculateMonthlyDistributionTrend(distributions)

      const statistics: DistributionStatistics = {
        totalDistributions,
        totalTokensDistributed,
        averageDistribution,
        blockchainDistribution,
        redemptionRate,
        monthlyDistributionTrend: monthlyTrend
      }

      return this.success(statistics)

    } catch (error) {
      this.logError('Error getting distribution statistics', { error, projectId })
      return this.error('Failed to get distribution statistics', 'STATISTICS_FAILED')
    }
  }

  // ============================================================================
  // TIMELINE AND TREND ANALYSIS
  // ============================================================================

  /**
   * Get timeline analytics
   */
  async getTimelineAnalytics(projectId: string): Promise<ServiceResult<Array<{
    date: string
    cumulativeRaised: Decimal
    newInvestors: number
    newSubscriptions: number
    newAllocations: number
    newDistributions: number
  }>>> {
    try {
      // Get all events sorted by date
      const [subscriptions, allocations, distributions] = await Promise.all([
        this.db.subscriptions.findMany({
          where: { project_id: projectId },
          orderBy: { subscription_date: 'asc' }
        }),
        this.db.token_allocations.findMany({
          where: { project_id: projectId },
          orderBy: { allocation_date: 'asc' }
        }),
        this.db.distributions.findMany({
          where: { project_id: projectId },
          orderBy: { distribution_date: 'asc' }
        })
      ])

      // Create timeline by day
      const timelineMap = new Map<string, {
        date: string
        cumulativeRaised: Decimal
        newInvestors: Set<string>
        newSubscriptions: number
        newAllocations: number
        newDistributions: number
      }>()

      let cumulativeRaised = new Decimal(0)

      // Process subscriptions
      subscriptions.forEach((sub: any) => {
        if (!sub.subscription_date) return
        
        const date: string = sub.subscription_date.toISOString().split('T')[0] || sub.subscription_date.toISOString().slice(0, 10)
        if (!timelineMap.has(date)) {
          timelineMap.set(date, {
            date: date,
            cumulativeRaised: new Decimal(0),
            newInvestors: new Set<string>(),
            newSubscriptions: 0,
            newAllocations: 0,
            newDistributions: 0
          })
        }

        const entry = timelineMap.get(date)
        if (entry) {
          cumulativeRaised = cumulativeRaised.add(sub.subscription_amount || new Decimal(0))
          entry.cumulativeRaised = cumulativeRaised
          if (sub.investor_id && typeof sub.investor_id === 'string') {
            entry.newInvestors.add(sub.investor_id)
          }
          entry.newSubscriptions++
        }
      })

      // Process allocations
      allocations.forEach((alloc: any) => {
        if (!alloc.allocation_date) return
        
        const date: string = alloc.allocation_date.toISOString().split('T')[0] || alloc.allocation_date.toISOString().slice(0, 10)
        if (!timelineMap.has(date)) {
          timelineMap.set(date, {
            date: date,
            cumulativeRaised: cumulativeRaised,
            newInvestors: new Set<string>(),
            newSubscriptions: 0,
            newAllocations: 0,
            newDistributions: 0
          })
        }

        const entry = timelineMap.get(date)
        if (entry) {
          entry.newAllocations++
        }
      })

      // Process distributions
      distributions.forEach((dist: any) => {
        if (!dist.distribution_date) return
        
        const date: string = dist.distribution_date.toISOString().split('T')[0] || dist.distribution_date.toISOString().slice(0, 10)
        if (!timelineMap.has(date)) {
          timelineMap.set(date, {
            date: date,
            cumulativeRaised: cumulativeRaised,
            newInvestors: new Set<string>(),
            newSubscriptions: 0,
            newAllocations: 0,
            newDistributions: 0
          })
        }

        const entry = timelineMap.get(date)
        if (entry) {
          entry.newDistributions++
        }
      })

      // Convert to array and sort
      const timeline = Array.from(timelineMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(entry => ({
          date: entry.date,
          cumulativeRaised: entry.cumulativeRaised,
          newInvestors: entry.newInvestors.size,
          newSubscriptions: entry.newSubscriptions,
          newAllocations: entry.newAllocations,
          newDistributions: entry.newDistributions
        }))

      return this.success(timeline)

    } catch (error) {
      this.logError('Error getting timeline analytics', { error, projectId })
      return this.error('Failed to get timeline analytics', 'ANALYTICS_FAILED')
    }
  }

  /**
   * Get geography analytics
   */
  async getGeographyAnalytics(projectId: string): Promise<ServiceResult<Array<{
    country: string
    investors: number
    amount: Decimal
    percentage: number
  }>>> {
    try {
      const subscriptions = await this.db.subscriptions.findMany({
        where: { project_id: projectId },
        include: { investors: true }
      })

      // Group by country
      const countryMap = new Map<string, {
        investors: Set<string>
        amount: Decimal
      }>()

      const totalAmount = subscriptions.reduce(
        (sum: Decimal, sub: any) => sum.add(sub.subscription_amount || new Decimal(0)), 
        new Decimal(0)
      )

      subscriptions.forEach((sub: any) => {
        const country = sub.investors?.residence_country || 'Unknown'
        if (!countryMap.has(country)) {
          countryMap.set(country, {
            investors: new Set(),
            amount: new Decimal(0)
          })
        }

        const entry = countryMap.get(country)
        if (entry) {
          if (sub.investor_id && typeof sub.investor_id === 'string') {
            entry.investors.add(sub.investor_id)
          }
          entry.amount = entry.amount.add(sub.subscription_amount || new Decimal(0))
        }
      })

      // Convert to array with percentages
      const geography = Array.from(countryMap.entries())
        .map(([country, data]) => ({
          country,
          investors: data.investors.size,
          amount: data.amount,
          percentage: totalAmount.greaterThan(0) 
            ? data.amount.dividedBy(totalAmount).mul(100).toNumber()
            : 0
        }))
        .sort((a, b) => b.amount.minus(a.amount).toNumber())

      return this.success(geography)

    } catch (error) {
      this.logError('Error getting geography analytics', { error, projectId })
      return this.error('Failed to get geography analytics', 'ANALYTICS_FAILED')
    }
  }

  /**
   * Get demographics analytics
   */
  async getDemographicsAnalytics(projectId: string): Promise<ServiceResult<{
    investorTypes: Record<string, number>
    riskProfiles: Record<string, number>
    investmentSizes: Record<string, number>
    accreditation: Record<string, number>
  }>> {
    try {
      const subscriptions = await this.db.subscriptions.findMany({
        where: { project_id: projectId },
        include: { investors: true }
      })

      const investors = subscriptions
        .map((s: any) => s.investors)
        .filter((inv: any, index: number, self: any[]) => inv && self.findIndex((i: any) => i?.id === inv.id) === index)

      // Investor types
      const investorTypes = this.calculateDistribution(
        investors.map((inv: any) => inv.investor_type || 'Unknown')
      )

      // Risk profiles
      const riskProfiles = this.calculateDistribution(
        investors.map((inv: any) => inv.risk_tolerance || 'Unknown')
      )

      // Investment sizes (categorized)
      const investmentSizes = this.categorizeInvestmentSizes(subscriptions)

      // Accreditation status
      const accreditation = this.calculateDistribution(
        investors.map((inv: any) => inv.accreditation_status || 'Unknown')
      )

      const demographics = {
        investorTypes,
        riskProfiles,
        investmentSizes,
        accreditation
      }

      return this.success(demographics)

    } catch (error) {
      this.logError('Error getting demographics analytics', { error, projectId })
      return this.error('Failed to get demographics analytics', 'ANALYTICS_FAILED')
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate distribution of values
   */
  private calculateDistribution(values: string[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    values.forEach(value => {
      distribution[value] = (distribution[value] || 0) + 1
    })
    return distribution
  }

  /**
   * Calculate monthly trend for subscriptions
   */
  private calculateMonthlyTrend(subscriptions: any[]): Array<{
    month: string
    count: number
    amount: Decimal
  }> {
    const monthlyMap = new Map<string, { count: number; amount: Decimal }>()

    subscriptions.forEach((sub: any) => {
      if (!sub.subscription_date) return
      
      const month = sub.subscription_date.toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { count: 0, amount: new Decimal(0) })
      }

      const entry = monthlyMap.get(month)
      if (entry) {
        entry.count++
        entry.amount = entry.amount.add(sub.subscription_amount || new Decimal(0))
      }
    })

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * Calculate monthly trend for distributions
   */
  private calculateMonthlyDistributionTrend(distributions: any[]): Array<{
    month: string
    count: number
    amount: Decimal
  }> {
    const monthlyMap = new Map<string, { count: number; amount: Decimal }>()

    distributions.forEach((dist: any) => {
      if (!dist.distribution_date) return
      
      const month = dist.distribution_date.toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { count: 0, amount: new Decimal(0) })
      }

      const entry = monthlyMap.get(month)
      if (entry) {
        entry.count++
        entry.amount = entry.amount.add(dist.token_amount || new Decimal(0))
      }
    })

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * Categorize investment sizes
   */
  private categorizeInvestmentSizes(subscriptions: any[]): Record<string, number> {
    const categories: Record<string, number> = {
      'Under $10K': 0,
      '$10K - $50K': 0,
      '$50K - $100K': 0,
      '$100K - $500K': 0,
      '$500K - $1M': 0,
      'Over $1M': 0
    }

    subscriptions.forEach((sub: any) => {
      if (!sub.subscription_amount) return
      
      const amount = sub.subscription_amount.toNumber()
      
      if (amount < 10000) {
        categories['Under $10K'] = (categories['Under $10K'] || 0) + 1
      } else if (amount < 50000) {
        categories['$10K - $50K'] = (categories['$10K - $50K'] || 0) + 1
      } else if (amount < 100000) {
        categories['$50K - $100K'] = (categories['$50K - $100K'] || 0) + 1
      } else if (amount < 500000) {
        categories['$100K - $500K'] = (categories['$100K - $500K'] || 0) + 1
      } else if (amount < 1000000) {
        categories['$500K - $1M'] = (categories['$500K - $1M'] || 0) + 1
      } else {
        categories['Over $1M'] = (categories['Over $1M'] || 0) + 1
      }
    })

    return categories
  }

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  /**
   * Export cap table data
   */
  async exportCapTableData(
    projectId: string,
    options: CapTableExportOptions
  ): Promise<ServiceResult<any>> {
    try {
      this.logInfo('Exporting cap table data', { projectId, options })

      // Get data based on options
      const data: any = {}

      if (options.includeInvestors) {
        const investorsResult = await this.getInvestorStatistics(projectId)
        data.investors = investorsResult.data
      }

      if (options.includeSubscriptions) {
        const subscriptionsResult = await this.getSubscriptionStatistics(projectId)
        data.subscriptions = subscriptionsResult.data
      }

      if (options.includeAllocations) {
        const allocationsResult = await this.getTokenAllocationStatistics(projectId)
        data.allocations = allocationsResult.data
      }

      if (options.includeDistributions) {
        const distributionsResult = await this.getDistributionStatistics(projectId)
        data.distributions = distributionsResult.data
      }

      if (options.includeStatistics) {
        const statisticsResult = await this.getCapTableStatistics(projectId)
        data.statistics = statisticsResult.data
      }

      // Add metadata
      data.exportMetadata = {
        projectId,
        exportDate: new Date().toISOString(),
        format: options.format,
        dateRange: options.dateRange
      }

      return this.success(data, 'Data exported successfully')

    } catch (error) {
      this.logError('Error exporting cap table data', { error, projectId, options })
      return this.error('Failed to export data', 'EXPORT_FAILED')
    }
  }
}
