import { BaseService } from '../BaseService'
import { 
  FactoringAnalytics,
  FactoringServiceResult,
  Invoice,
  Pool,
  Provider,
  Payer
} from './types'

/**
 * Factoring analytics service for reporting and business intelligence
 */
export class FactoringAnalyticsService extends BaseService {
  constructor() {
    super('FactoringAnalytics')
  }

  // ==================== COMPREHENSIVE ANALYTICS ====================

  /**
   * Get comprehensive factoring analytics
   */
  async getFactoringAnalytics(): Promise<FactoringServiceResult<FactoringAnalytics>> {
    try {
      // Get all basic totals
      const [
        totalInvoices,
        totalPools,
        totalProviders,
        totalPayers,
        invoicesWithAmount,
        poolData,
        providerData,
        monthlyData
      ] = await Promise.all([
        this.db.invoice.count(),
        this.db.pool.count(),
        this.db.provider.count(),
        this.db.payer.count(),
        this.db.invoice.aggregate({
          _sum: { net_amount_due: true }
        }),
        this.getPoolDistribution(),
        this.getProviderPerformance(),
        this.getMonthlyTrends()
      ])

      const analytics: FactoringAnalytics = {
        totals: {
          invoices: totalInvoices,
          pools: totalPools,
          providers: totalProviders,
          payers: totalPayers,
          total_value: Number(invoicesWithAmount._sum.net_amount_due || 0)
        },
        pool_distribution: (poolData.success && poolData.data) ? poolData.data : {},
        provider_performance: (providerData.success && providerData.data) ? providerData.data : [],
        monthly_trends: (monthlyData.success && monthlyData.data) ? monthlyData.data : []
      }

      return this.success(analytics)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get factoring analytics')
      return this.error('Failed to get analytics', 'ANALYTICS_ERROR')
    }
  }

  // ==================== INVOICE ANALYTICS ====================

  /**
   * Get invoice statistics and metrics
   */
  async getInvoiceStatistics(): Promise<FactoringServiceResult<any>> {
    try {
      const [
        totalCount,
        totalValue,
        averageValue,
        statusBreakdown,
        ageDistribution,
        discountRateStats
      ] = await Promise.all([
        this.db.invoice.count(),
        this.db.invoice.aggregate({ _sum: { net_amount_due: true } }),
        this.db.invoice.aggregate({ _avg: { net_amount_due: true } }),
        this.getInvoiceStatusBreakdown(),
        this.getInvoiceAgeDistribution(),
        this.getDiscountRateStatistics()
      ])

      const statistics = {
        total_count: totalCount,
        total_value: Number(totalValue._sum.net_amount_due || 0),
        average_value: Number(averageValue._avg.net_amount_due || 0),
        status_breakdown: statusBreakdown.success ? statusBreakdown.data : {},
        age_distribution: ageDistribution.success ? ageDistribution.data : {},
        discount_rate_stats: discountRateStats.success ? discountRateStats.data : {}
      }

      return this.success(statistics)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get invoice statistics')
      return this.error('Failed to get invoice statistics', 'STATS_ERROR')
    }
  }

  /**
   * Get invoice status breakdown
   */
  private async getInvoiceStatusBreakdown(): Promise<FactoringServiceResult<any>> {
    try {
      // Calculate status based on pool assignment and other factors
      const [
        unpoooled,
        pooled,
        invoicesWithPools
      ] = await Promise.all([
        this.db.invoice.count({ where: { pool_id: null } }),
        this.db.invoice.count({ where: { pool_id: { not: null } } }),
        this.db.invoice.findMany({
          where: { pool_id: { not: null } },
          select: { invoice_id: true, pool_id: true }
        })
      ])

      const breakdown = {
        uploaded: unpoooled,
        pooled: pooled,
        // In a real implementation, you would check for tokenization status
        tokenized: 0,
        distributed: 0
      }

      return this.success(breakdown)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get status breakdown')
      return this.error('Failed to get status breakdown')
    }
  }

  /**
   * Get invoice age distribution
   */
  private async getInvoiceAgeDistribution(): Promise<FactoringServiceResult<any>> {
    try {
      const invoices = await this.db.invoice.findMany({
        where: {
          invoice_date: { not: null },
          due_date: { not: null }
        },
        select: {
          invoice_date: true,
          due_date: true
        }
      })

      const ageRanges = {
        '0-30 days': 0,
        '31-60 days': 0,
        '61-90 days': 0,
        '91-120 days': 0,
        '120+ days': 0
      }

      const today = new Date()

      invoices.forEach(invoice => {
        if (invoice.invoice_date && invoice.due_date) {
          const invoiceDate = new Date(invoice.invoice_date)
          const dueDate = new Date(invoice.due_date)
          
          // Calculate age from invoice date to today
          const ageInDays = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (ageInDays <= 30) {
            ageRanges['0-30 days']++
          } else if (ageInDays <= 60) {
            ageRanges['31-60 days']++
          } else if (ageInDays <= 90) {
            ageRanges['61-90 days']++
          } else if (ageInDays <= 120) {
            ageRanges['91-120 days']++
          } else {
            ageRanges['120+ days']++
          }
        }
      })

      return this.success(ageRanges)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get age distribution')
      return this.error('Failed to get age distribution')
    }
  }

  /**
   * Get discount rate statistics
   */
  private async getDiscountRateStatistics(): Promise<FactoringServiceResult<any>> {
    try {
      const stats = await this.db.invoice.aggregate({
        where: { factoring_discount_rate: { not: null } },
        _avg: { factoring_discount_rate: true },
        _min: { factoring_discount_rate: true },
        _max: { factoring_discount_rate: true },
        _count: { factoring_discount_rate: true }
      })

      return this.success({
        average: Number(stats._avg.factoring_discount_rate || 0),
        minimum: Number(stats._min.factoring_discount_rate || 0),
        maximum: Number(stats._max.factoring_discount_rate || 0),
        count_with_rate: stats._count.factoring_discount_rate
      })

    } catch (error) {
      this.logger.error({ error }, 'Failed to get discount rate statistics')
      return this.error('Failed to get discount rate statistics')
    }
  }

  // ==================== POOL ANALYTICS ====================

  /**
   * Get pool distribution data
   */
  private async getPoolDistribution(): Promise<FactoringServiceResult<Record<string, number>>> {
    try {
      const pools = await this.db.pool.findMany({
        include: {
          invoice: {
            select: { net_amount_due: true }
          }
        }
      })

      const distribution: Record<string, number> = {}

      pools.forEach(pool => {
        const poolName = pool.pool_name || `Pool ${pool.pool_id}`
        const totalValue = pool.invoice.reduce((sum, invoice) => 
          sum + Number(invoice.net_amount_due || 0), 0
        )
        distribution[poolName] = totalValue
      })

      return this.success(distribution)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get pool distribution')
      return this.error('Failed to get pool distribution')
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStatistics(): Promise<FactoringServiceResult<any>> {
    try {
      const pools = await this.db.pool.findMany({
        include: {
          invoice: {
            select: { 
              net_amount_due: true,
              invoice_date: true,
              due_date: true,
              factoring_discount_rate: true
            }
          }
        }
      })

      const poolStats = pools.map(pool => {
        const invoices = pool.invoice || []
        const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.net_amount_due || 0), 0)
        const invoiceCount = invoices.length

        // Calculate average age
        const totalAge = invoices.reduce((sum, inv) => {
          if (!inv.invoice_date || !inv.due_date) return sum
          const invoiceDate = new Date(inv.invoice_date)
          const dueDate = new Date(inv.due_date)
          const ageInDays = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
          return sum + (ageInDays > 0 ? ageInDays : 0)
        }, 0)
        const averageAge = invoiceCount > 0 ? Math.round(totalAge / invoiceCount) : 0

        // Calculate average discount rate
        const invoicesWithRate = invoices.filter(inv => inv.factoring_discount_rate !== null)
        const averageDiscountRate = invoicesWithRate.length > 0 
          ? invoicesWithRate.reduce((sum, inv) => sum + Number(inv.factoring_discount_rate || 0), 0) / invoicesWithRate.length
          : 0

        return {
          pool_id: pool.pool_id,
          pool_name: pool.pool_name,
          pool_type: pool.pool_type,
          total_value: totalValue,
          invoice_count: invoiceCount,
          average_age: averageAge,
          average_discount_rate: averageDiscountRate
        }
      })

      return this.success(poolStats)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get pool statistics')
      return this.error('Failed to get pool statistics')
    }
  }

  // ==================== PROVIDER ANALYTICS ====================

  /**
   * Get provider performance metrics
   */
  private async getProviderPerformance(): Promise<FactoringServiceResult<any[]>> {
    try {
      const providers = await this.db.provider.findMany({
        include: {
          invoice: {
            select: {
              net_amount_due: true,
              factoring_discount_rate: true
            }
          }
        }
      })

      const performance = providers.map(provider => {
        const invoices = provider.invoice || []
        const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.net_amount_due || 0), 0)
        const invoicesWithRate = invoices.filter(inv => inv.factoring_discount_rate !== null)
        const averageDiscountRate = invoicesWithRate.length > 0
          ? invoicesWithRate.reduce((sum, inv) => sum + Number(inv.factoring_discount_rate || 0), 0) / invoicesWithRate.length
          : 0

        return {
          provider_id: provider.provider_id,
          provider_name: provider.name || `Provider ${provider.provider_id}`,
          total_invoices: invoices.length,
          total_value: totalValue,
          average_discount_rate: averageDiscountRate
        }
      }).filter(p => p.total_invoices > 0) // Only include providers with invoices
        .sort((a, b) => b.total_value - a.total_value) // Sort by total value descending

      return this.success(performance)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get provider performance')
      return this.error('Failed to get provider performance')
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStatistics(): Promise<FactoringServiceResult<any>> {
    try {
      const result = await this.getProviderPerformance()
      if (!result.success || !result.data) {
        return result
      }

      const providerData = result.data || []
      const topProviders = providerData.slice(0, 10) // Top 10 providers
      const totalProviders = providerData.length
      const totalValue = providerData.reduce((sum, p) => sum + ((p && typeof p.total_value === 'number') ? p.total_value : 0), 0)
      const totalInvoices = providerData.reduce((sum, p) => sum + ((p && typeof p.total_invoices === 'number') ? p.total_invoices : 0), 0)

      return this.success({
        top_providers: topProviders,
        summary: {
          total_active_providers: totalProviders,
          total_value_across_providers: totalValue,
          total_invoices_across_providers: totalInvoices
        }
      })

    } catch (error) {
      this.logger.error({ error }, 'Failed to get provider statistics')
      return this.error('Failed to get provider statistics')
    }
  }

  // ==================== TIME-SERIES ANALYTICS ====================

  /**
   * Get monthly trends data
   */
  private async getMonthlyTrends(): Promise<FactoringServiceResult<any[]>> {
    try {
      // Get invoices from the last 12 months
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const invoices = await this.db.invoice.findMany({
        where: {
          invoice_date: { gte: twelveMonthsAgo },
          net_amount_due: { not: null }
        },
        select: {
          invoice_date: true,
          net_amount_due: true
        }
      })

      // Group by month
      const monthlyData: Record<string, { count: number; value: number }> = {}

      invoices.forEach(invoice => {
        if (invoice.invoice_date && invoice.net_amount_due) {
          const date = new Date(invoice.invoice_date)
          
          // Ensure date is valid before creating monthKey
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { count: 0, value: 0 }
            }
            
            monthlyData[monthKey].count++
            monthlyData[monthKey].value += Number(invoice.net_amount_due)
          }
        }
      })

      // Convert to array format
      const trends = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        invoice_count: data.count,
        total_value: data.value
      })).sort((a, b) => a.month.localeCompare(b.month))

      return this.success(trends)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get monthly trends')
      return this.error('Failed to get monthly trends')
    }
  }

  /**
   * Get daily trends for the last 30 days
   */
  async getDailyTrends(): Promise<FactoringServiceResult<any[]>> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const invoices = await this.db.invoice.findMany({
        where: {
          upload_timestamp: { gte: thirtyDaysAgo },
          net_amount_due: { not: null }
        },
        select: {
          upload_timestamp: true,
          net_amount_due: true
        }
      })

      const dailyData: Record<string, { count: number; value: number }> = {}

      invoices.forEach(invoice => {
        if (invoice.upload_timestamp && invoice.net_amount_due) {
          const date = new Date(invoice.upload_timestamp)
          
          // Ensure date is valid before creating dayKey
          if (!isNaN(date.getTime())) {
            const dayKey: string = date.toISOString().split('T')[0] || 'unknown' // YYYY-MM-DD format
            
            // TypeScript-safe object access
            if (!dailyData[dayKey]) {
              dailyData[dayKey] = { count: 0, value: 0 }
            }
            
            dailyData[dayKey]!.count++
            dailyData[dayKey]!.value += Number(invoice.net_amount_due)
          }
        }
      })

      const trends = Object.entries(dailyData).map(([day, data]) => ({
        date: day,
        invoice_count: data.count,
        total_value: data.value
      })).sort((a, b) => a.date.localeCompare(b.date))

      return this.success(trends)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get daily trends')
      return this.error('Failed to get daily trends')
    }
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  /**
   * Generate analytics export data
   */
  async generateAnalyticsExport(format: 'csv' | 'json' = 'json'): Promise<FactoringServiceResult<any>> {
    try {
      const [
        analytics,
        invoiceStats,
        poolStats,
        providerStats,
        monthlyTrends,
        dailyTrends
      ] = await Promise.all([
        this.getFactoringAnalytics(),
        this.getInvoiceStatistics(),
        this.getPoolStatistics(),
        this.getProviderStatistics(),
        this.getMonthlyTrends(),
        this.getDailyTrends()
      ])

      const exportData = {
        generated_at: new Date().toISOString(),
        analytics: (analytics.success && analytics.data) ? analytics.data : null,
        invoice_statistics: (invoiceStats.success && invoiceStats.data) ? invoiceStats.data : null,
        pool_statistics: (poolStats.success && poolStats.data) ? poolStats.data : null,
        provider_statistics: (providerStats.success && providerStats.data) ? providerStats.data : null,
        monthly_trends: (monthlyTrends.success && monthlyTrends.data) ? monthlyTrends.data : null,
        daily_trends: (dailyTrends.success && dailyTrends.data) ? dailyTrends.data : null
      }

      if (format === 'csv') {
        // In a real implementation, you would convert to CSV format
        // For now, return JSON with a note
        return this.success({
          format: 'csv',
          note: 'CSV conversion would be implemented here',
          data: exportData
        })
      }

      return this.success(exportData)

    } catch (error) {
      this.logger.error({ error }, 'Failed to generate analytics export')
      return this.error('Failed to generate analytics export')
    }
  }
}
