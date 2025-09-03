import { BaseService } from '../BaseService'
import {
  Token,
  TokenStandard,
  TokenStatus,
  TokenConfigMode,
  TokenAnalytics,
  TokenStatistics,
  TokenServiceResult
} from './types'

/**
 * Analytics data interfaces
 */
export interface TokenTrendData {
  date: string
  count: number
  standard?: TokenStandard
  status?: TokenStatus
}

export interface TokenDistributionData {
  label: string
  value: number
  percentage: number
}

export interface TokenPerformanceMetrics {
  totalTokens: number
  activeTokens: number
  deployedTokens: number
  successRate: number
  averageTimeToDeployment: number
  mostPopularStandard: string
  growthRate: number
}

/**
 * Token Analytics Service
 * 
 * Comprehensive analytics service providing insights into token usage,
 * performance metrics, trends, and standard-specific statistics
 */
export class TokenAnalyticsService extends BaseService {
  constructor() {
    super('TokenAnalytics')
  }

  /**
   * Get comprehensive analytics for a specific token
   */
  async getTokenAnalytics(tokenId: string): Promise<TokenServiceResult<TokenAnalytics>> {
    const validation = this.validateRequiredFields({ tokenId }, ['tokenId'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid token ID', 'VALIDATION_ERROR', 400)
    }

    try {
      const token = await this.db.tokens.findUnique({
        where: { id: tokenId },
        include: {
          token_deployments: true,
          token_operations: {
            orderBy: { timestamp: 'desc' }
          },
          token_allocations: true,
          token_versions: {
            orderBy: { version: 'desc' }
          }
        }
      })

      if (!token) {
        return this.error('Token not found', 'NOT_FOUND', 404)
      }

      const analytics: TokenAnalytics = {
        totalSupply: token.total_supply || '0',
        holders: token.token_allocations?.length || 0,
        transactions: token.token_operations?.length || 0,
        deployments: token.token_deployments?.filter(d => d.status === 'completed').length || 0,
        lastActivity: token.token_operations?.[0]?.timestamp?.toISOString() || null
      }

      this.logInfo('Token analytics retrieved successfully', { tokenId })
      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get token analytics', { error, tokenId })
      return this.error('Failed to get token analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get comprehensive platform token statistics
   */
  async getTokenStatistics(): Promise<TokenServiceResult<TokenStatistics>> {
    try {
      const [
        totalTokens,
        tokensByStandard,
        tokensByStatus,
        tokensByConfigMode,
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        deploymentsByNetwork
      ] = await Promise.all([
        this.db.tokens.count(),
        this.db.tokens.groupBy({
          by: ['standard'],
          _count: true
        }),
        this.db.tokens.groupBy({
          by: ['status'],
          _count: true
        }),
        this.db.tokens.groupBy({
          by: ['config_mode'],
          _count: true,
          where: {
            config_mode: { not: null }
          }
        }),
        this.db.token_deployments.count(),
        this.db.token_deployments.count({
          where: { status: 'completed' }
        }),
        this.db.token_deployments.count({
          where: { status: 'failed' }
        }),
        this.db.token_deployments.groupBy({
          by: ['network'],
          _count: true,
          where: { status: 'completed' }
        })
      ])

      const statistics: TokenStatistics = {
        totalTokens,
        tokensByStandard: tokensByStandard.reduce((acc, item) => {
          acc[item.standard] = item._count
          return acc
        }, {} as Record<string, number>),
        tokensByStatus: tokensByStatus.reduce((acc, item) => {
          acc[item.status] = item._count
          return acc
        }, {} as Record<string, number>),
        tokensByConfigMode: tokensByConfigMode.reduce((acc, item) => {
          acc[item.config_mode || 'unknown'] = item._count
          return acc
        }, {} as Record<string, number>),
        deploymentStatistics: {
          totalDeployments,
          successfulDeployments,
          failedDeployments,
          deploymentsByNetwork: deploymentsByNetwork.reduce((acc, item) => {
            acc[item.network] = item._count
            return acc
          }, {} as Record<string, number>)
        }
      }

      this.logInfo('Token statistics retrieved successfully')
      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get token statistics', { error })
      return this.error('Failed to get token statistics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get token creation trends over time
   */
  async getTokenTrends(
    days: number = 30,
    standard?: TokenStandard
  ): Promise<TokenServiceResult<TokenTrendData[]>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const whereClause: any = {
        created_at: {
          gte: startDate
        }
      }

      if (standard) {
        whereClause.standard = standard
      }

      const tokens = await this.db.tokens.findMany({
        where: whereClause,
        select: {
          created_at: true,
          standard: true,
          status: true
        },
        orderBy: {
          created_at: 'asc'
        }
      })

      // Group by date
      const trendMap = new Map<string, number>()
      tokens.forEach(token => {
        const date = token.created_at?.toISOString().split('T')[0] || ''
        trendMap.set(date, (trendMap.get(date) || 0) + 1)
      })

      const trends: TokenTrendData[] = Array.from(trendMap.entries()).map(([date, count]) => ({
        date,
        count,
        ...(standard && { standard })
      }))

      this.logInfo('Token trends retrieved successfully', { days, standard })
      return this.success(trends)
    } catch (error) {
      this.logError('Failed to get token trends', { error, days, standard })
      return this.error('Failed to get token trends', 'DATABASE_ERROR')
    }
  }

  /**
   * Get token distribution by various criteria
   */
  async getTokenDistribution(
    criteria: 'standard' | 'status' | 'config_mode' | 'project'
  ): Promise<TokenServiceResult<TokenDistributionData[]>> {
    try {
      let groupByField: string
      let includeClause: any = {}

      switch (criteria) {
        case 'standard':
          groupByField = 'standard'
          break
        case 'status':
          groupByField = 'status'
          break
        case 'config_mode':
          groupByField = 'config_mode'
          break
        case 'project':
          groupByField = 'project_id'
          includeClause = {
            project: {
              select: { name: true }
            }
          }
          break
        default:
          return this.error('Invalid criteria', 'VALIDATION_ERROR', 400)
      }

      const results = await this.db.tokens.groupBy({
        by: [groupByField as any],
        _count: true,
        where: criteria === 'config_mode' ? { config_mode: { not: null } } : undefined
      })

      const totalCount = results.reduce((sum, item) => sum + item._count, 0)

      let distribution: TokenDistributionData[]

      if (criteria === 'project') {
        // For projects, we need to get project names
        const projectIds = results.map(r => r.project_id).filter(Boolean)
        const projects = await this.db.projects.findMany({
          where: { id: { in: projectIds as string[] } },
          select: { id: true, name: true }
        })

        const projectNameMap = new Map(projects.map(p => [p.id, p.name]))

        distribution = results.map(item => ({
          label: projectNameMap.get(item.project_id as string) || 'Unknown Project',
          value: item._count,
          percentage: Math.round((item._count / totalCount) * 100)
        }))
      } else {
        distribution = results.map(item => ({
          label: (item as any)[groupByField] || 'Unknown',
          value: item._count,
          percentage: Math.round((item._count / totalCount) * 100)
        }))
      }

      this.logInfo('Token distribution retrieved successfully', { criteria })
      return this.success(distribution)
    } catch (error) {
      this.logError('Failed to get token distribution', { error, criteria })
      return this.error('Failed to get token distribution', 'DATABASE_ERROR')
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<TokenServiceResult<TokenPerformanceMetrics>> {
    try {
      const [
        totalTokens,
        activeTokens,
        deployedTokens,
        standardDistribution,
        averageDeploymentTime,
        recentGrowth
      ] = await Promise.all([
        this.db.tokens.count(),
        this.db.tokens.count({
          where: {
            status: {
              in: [TokenStatus.APPROVED, TokenStatus.READY_TO_MINT, TokenStatus.DEPLOYED]
            }
          }
        }),
        this.db.tokens.count({
          where: { status: TokenStatus.DEPLOYED }
        }),
        this.db.tokens.groupBy({
          by: ['standard'],
          _count: true,
          orderBy: {
            _count: {
              standard: 'desc'
            }
          },
          take: 1
        }),
        this.calculateAverageDeploymentTime(),
        this.calculateGrowthRate()
      ])

      const successRate = totalTokens > 0 ? (deployedTokens / totalTokens) * 100 : 0
      const mostPopularStandard = standardDistribution[0]?.standard || 'ERC_20'

      const metrics: TokenPerformanceMetrics = {
        totalTokens,
        activeTokens,
        deployedTokens,
        successRate: Math.round(successRate * 100) / 100,
        averageTimeToDeployment: averageDeploymentTime,
        mostPopularStandard,
        growthRate: recentGrowth
      }

      this.logInfo('Performance metrics retrieved successfully')
      return this.success(metrics)
    } catch (error) {
      this.logError('Failed to get performance metrics', { error })
      return this.error('Failed to get performance metrics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get analytics for a specific token standard
   */
  async getStandardAnalytics(standard: TokenStandard): Promise<TokenServiceResult<{
    totalTokens: number
    deployedTokens: number
    averageConfigMode: string
    popularFeatures: Record<string, number>
    trends: TokenTrendData[]
  }>> {
    try {
      const [
        totalTokens,
        deployedTokens,
        configModeDistribution,
        trends
      ] = await Promise.all([
        this.db.tokens.count({
          where: { standard }
        }),
        this.db.tokens.count({
          where: { 
            standard,
            status: TokenStatus.DEPLOYED
          }
        }),
        this.db.tokens.groupBy({
          by: ['config_mode'],
          _count: true,
          where: { 
            standard,
            config_mode: { not: null }
          }
        }),
        this.getTokenTrends(30, standard)
      ])

      const mostPopularConfigMode = configModeDistribution
        .sort((a, b) => b._count - a._count)[0]?.config_mode || 'min'

      // Get popular features for this standard
      const popularFeatures = await this.getPopularFeaturesForStandard(standard)

      const analytics = {
        totalTokens,
        deployedTokens,
        averageConfigMode: mostPopularConfigMode,
        popularFeatures,
        trends: trends.success ? trends.data || [] : []
      }

      this.logInfo('Standard analytics retrieved successfully', { standard })
      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get standard analytics', { error, standard })
      return this.error('Failed to get standard analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Calculate average deployment time from creation to deployment
   */
  private async calculateAverageDeploymentTime(): Promise<number> {
    try {
      const deployedTokens = await this.db.tokens.findMany({
        where: { 
          status: TokenStatus.DEPLOYED,
          deployment_timestamp: { not: null }
        },
        select: {
          created_at: true,
          deployment_timestamp: true
        }
      })

      if (deployedTokens.length === 0) return 0

      const totalTime = deployedTokens.reduce((sum, token) => {
        if (token.created_at && token.deployment_timestamp) {
          const diff = token.deployment_timestamp.getTime() - token.created_at.getTime()
          return sum + diff
        }
        return sum
      }, 0)

      // Return average time in hours
      return Math.round((totalTime / deployedTokens.length) / (1000 * 60 * 60))
    } catch (error) {
      this.logError('Failed to calculate average deployment time', { error })
      return 0
    }
  }

  /**
   * Calculate growth rate over the last 30 days
   */
  private async calculateGrowthRate(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const [recentTokens, previousTokens] = await Promise.all([
        this.db.tokens.count({
          where: {
            created_at: { gte: thirtyDaysAgo }
          }
        }),
        this.db.tokens.count({
          where: {
            created_at: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo
            }
          }
        })
      ])

      if (previousTokens === 0) return recentTokens > 0 ? 100 : 0

      const growthRate = ((recentTokens - previousTokens) / previousTokens) * 100
      return Math.round(growthRate * 100) / 100
    } catch (error) {
      this.logError('Failed to calculate growth rate', { error })
      return 0
    }
  }

  /**
   * Get popular features for a specific token standard
   */
  private async getPopularFeaturesForStandard(standard: TokenStandard): Promise<Record<string, number>> {
    try {
      const features: Record<string, number> = {}

      switch (standard) {
        case TokenStandard.ERC_20:
          const erc20Features = await this.db.token_erc20_properties.groupBy({
            by: ['is_mintable', 'is_burnable', 'is_pausable'],
            _count: true
          })
          erc20Features.forEach(feature => {
            if (feature.is_mintable) features['mintable'] = (features['mintable'] || 0) + feature._count
            if (feature.is_burnable) features['burnable'] = (features['burnable'] || 0) + feature._count
            if (feature.is_pausable) features['pausable'] = (features['pausable'] || 0) + feature._count
          })
          break

        case TokenStandard.ERC_721:
          const erc721Features = await this.db.token_erc721_properties.groupBy({
            by: ['has_royalty', 'is_mintable', 'is_burnable'],
            _count: true
          })
          erc721Features.forEach(feature => {
            if (feature.has_royalty) features['royalty'] = (features['royalty'] || 0) + feature._count
            if (feature.is_mintable) features['mintable'] = (features['mintable'] || 0) + feature._count
            if (feature.is_burnable) features['burnable'] = (features['burnable'] || 0) + feature._count
          })
          break

        case TokenStandard.ERC_1155:
          const erc1155Features = await this.db.token_erc1155_properties.groupBy({
            by: ['has_royalty', 'is_burnable', 'is_pausable'],
            _count: true
          })
          erc1155Features.forEach(feature => {
            if (feature.has_royalty) features['royalty'] = (features['royalty'] || 0) + feature._count
            if (feature.is_burnable) features['burnable'] = (features['burnable'] || 0) + feature._count
            if (feature.is_pausable) features['pausable'] = (features['pausable'] || 0) + feature._count
          })
          break

        default:
          // For other standards, return empty features for now
          break
      }

      return features
    } catch (error) {
      this.logError('Failed to get popular features', { error, standard })
      return {}
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalyticsData(
    format: 'csv' | 'json' | 'excel',
    includeDetailedMetrics: boolean = false
  ): Promise<TokenServiceResult<{
    data: any
    filename: string
    contentType: string
  }>> {
    try {
      const [statistics, trends, distribution] = await Promise.all([
        this.getTokenStatistics(),
        this.getTokenTrends(30),
        this.getTokenDistribution('standard')
      ])

      const exportData = {
        generatedAt: new Date().toISOString(),
        statistics: statistics.success ? statistics.data : null,
        trends: trends.success ? trends.data : null,
        distribution: distribution.success ? distribution.data : null
      }

      if (includeDetailedMetrics) {
        const performance = await this.getPerformanceMetrics();
        (exportData as any)['performanceMetrics'] = performance.success ? performance.data : null;
      }

      const timestamp = new Date().toISOString().split('T')[0]
      
      switch (format) {
        case 'json':
          return this.success({
            data: JSON.stringify(exportData, null, 2),
            filename: `token-analytics-${timestamp}.json`,
            contentType: 'application/json'
          })

        case 'csv':
          // Convert to CSV format (simplified)
          const csvData = this.convertToCSV(exportData)
          return this.success({
            data: csvData,
            filename: `token-analytics-${timestamp}.csv`,
            contentType: 'text/csv'
          })

        default:
          return this.error('Unsupported export format', 'VALIDATION_ERROR', 400)
      }
    } catch (error) {
      this.logError('Failed to export analytics data', { error, format })
      return this.error('Failed to export analytics data', 'DATABASE_ERROR')
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const headers = ['Metric', 'Value']
    const rows = [
      ['Total Tokens', data.statistics?.totalTokens || 0],
      ['Deployed Tokens', data.statistics?.deploymentStatistics?.successfulDeployments || 0],
      ['Failed Deployments', data.statistics?.deploymentStatistics?.failedDeployments || 0],
      // Add more metrics as needed
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    return csvContent
  }
}
