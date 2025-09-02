/**
 * Rule Analytics Service
 * Analytics and reporting for rules management
 */

import { BaseService } from '../BaseService'
import type { ServiceResult } from '@/types/index'

export interface RuleAnalytics {
  totalRules: number
  activeRules: number
  inactiveRules: number
  draftRules: number
  rulesByType: Record<string, number>
  recentActivity: {
    created: number
    updated: number
    deleted: number
  }
  templateRules: number
  customRules: number
}

export interface RuleUsageMetrics {
  ruleId: string
  ruleName: string
  ruleType: string
  usageCount: number
  lastUsed?: Date
  successRate: number
  failureRate: number
}

export interface RuleExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  includeInactive?: boolean
  ruleTypes?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export class RuleAnalyticsService extends BaseService {
  constructor() {
    super('RuleAnalytics')
  }

  /**
   * Get comprehensive rule analytics
   */
  async getRuleAnalytics(): Promise<ServiceResult<RuleAnalytics>> {
    try {
      // Get basic counts
      const [
        totalRules,
        activeRules,
        inactiveRules,
        draftRules,
        templateRules,
        rulesByType,
        recentActivity
      ] = await Promise.all([
        this.db.rules.count(),
        this.db.rules.count({ where: { status: 'active' } }),
        this.db.rules.count({ where: { status: 'inactive' } }),
        this.db.rules.count({ where: { status: 'draft' } }),
        this.db.rules.count({ where: { is_template: true } }),
        this.getRuleCountsByType(),
        this.getRecentActivity()
      ])

      const analytics: RuleAnalytics = {
        totalRules,
        activeRules,
        inactiveRules,
        draftRules,
        rulesByType,
        recentActivity,
        templateRules,
        customRules: totalRules - templateRules
      }

      return this.success(analytics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rule analytics')
      return this.error('Failed to get rule analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Get rule usage metrics
   */
  async getRuleUsageMetrics(): Promise<ServiceResult<RuleUsageMetrics[]>> {
    try {
      const rules = await this.db.rules.findMany({
        where: { status: 'active' },
        select: {
          rule_id: true,
          rule_name: true,
          rule_type: true,
          updated_at: true
        }
      })

      // TODO: Integrate with actual usage tracking when available
      const metrics: RuleUsageMetrics[] = rules.map(rule => ({
        ruleId: rule.rule_id,
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        usageCount: 0, // Would be populated from usage tracking
        lastUsed: rule.updated_at || undefined,
        successRate: 100, // Placeholder
        failureRate: 0 // Placeholder
      }))

      return this.success(metrics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rule usage metrics')
      return this.error('Failed to get rule usage metrics', 'METRICS_ERROR')
    }
  }

  /**
   * Get rule trends over time
   */
  async getRuleTrends(days: number = 30): Promise<ServiceResult<any[]>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const trends = await this.db.rules.groupBy({
        by: ['rule_type'],
        where: {
          created_at: {
            gte: startDate
          }
        },
        _count: {
          rule_id: true
        },
        orderBy: {
          _count: {
            rule_id: 'desc'
          }
        }
      })

      const formattedTrends = trends.map(trend => ({
        ruleType: trend.rule_type,
        count: trend._count.rule_id
      }))

      return this.success(formattedTrends)
    } catch (error) {
      this.logger.error({ error, days }, 'Failed to get rule trends')
      return this.error('Failed to get rule trends', 'TRENDS_ERROR')
    }
  }

  /**
   * Get rules by creator
   */
  async getRulesByCreator(): Promise<ServiceResult<any[]>> {
    try {
      const rulesByCreator = await this.db.rules.groupBy({
        by: ['created_by'],
        _count: {
          rule_id: true
        },
        orderBy: {
          _count: {
            rule_id: 'desc'
          }
        }
      })

      const formatted = rulesByCreator.map(item => ({
        createdBy: item.created_by,
        ruleCount: item._count.rule_id
      }))

      return this.success(formatted)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rules by creator')
      return this.error('Failed to get rules by creator', 'CREATOR_ANALYTICS_ERROR')
    }
  }

  /**
   * Export rules data
   */
  async exportRules(options: RuleExportOptions): Promise<ServiceResult<any>> {
    try {
      const where: any = {}
      
      if (!options.includeInactive) {
        where.status = 'active'
      }
      
      if (options.ruleTypes && options.ruleTypes.length > 0) {
        where.rule_type = { in: options.ruleTypes }
      }
      
      if (options.dateFrom || options.dateTo) {
        where.created_at = {}
        if (options.dateFrom) where.created_at.gte = options.dateFrom
        if (options.dateTo) where.created_at.lte = options.dateTo
      }

      const rules = await this.db.rules.findMany({
        where,
        orderBy: { created_at: 'desc' }
      })

      // Format based on export type
      let exportData
      switch (options.format) {
        case 'json':
          exportData = JSON.stringify(rules, null, 2)
          break
        case 'csv':
          exportData = this.convertToCSV(rules)
          break
        case 'xlsx':
          // TODO: Implement Excel export
          exportData = rules
          break
        default:
          exportData = rules
      }

      return this.success({
        data: exportData,
        count: rules.length,
        format: options.format
      })
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to export rules')
      return this.error('Failed to export rules', 'EXPORT_ERROR')
    }
  }

  /**
   * Get rule compliance metrics
   */
  async getRuleComplianceMetrics(): Promise<ServiceResult<any>> {
    try {
      const metrics = {
        totalActiveRules: await this.db.rules.count({ where: { status: 'active' } }),
        totalInactiveRules: await this.db.rules.count({ where: { status: 'inactive' } }),
        complianceRules: await this.db.rules.count({
          where: {
            status: 'active',
            rule_type: {
              in: ['kyc_verification', 'aml_sanctions', 'accredited_investor']
            }
          }
        })
      }

      return this.success(metrics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get compliance metrics')
      return this.error('Failed to get compliance metrics', 'COMPLIANCE_METRICS_ERROR')
    }
  }

  /**
   * Private helper methods
   */
  private async getRuleCountsByType(): Promise<Record<string, number>> {
    try {
      const counts = await this.db.rules.groupBy({
        by: ['rule_type'],
        _count: {
          rule_id: true
        }
      })

      const result: Record<string, number> = {}
      counts.forEach(count => {
        result[count.rule_type] = count._count.rule_id
      })

      return result
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rule counts by type')
      return {}
    }
  }

  private async getRecentActivity(): Promise<{ created: number; updated: number; deleted: number }> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [created, updated] = await Promise.all([
        this.db.rules.count({
          where: {
            created_at: { gte: sevenDaysAgo }
          }
        }),
        this.db.rules.count({
          where: {
            updated_at: { gte: sevenDaysAgo },
            created_at: { lt: sevenDaysAgo }
          }
        })
      ])

      return {
        created,
        updated,
        deleted: 0 // Would need audit table to track deletions
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get recent activity')
      return { created: 0, updated: 0, deleted: 0 }
    }
  }

  private convertToCSV(rules: any[]): string {
    if (rules.length === 0) return ''

    const headers = Object.keys(rules[0])
    const csvRows = [
      headers.join(','),
      ...rules.map(rule => 
        headers.map(header => {
          const value = rule[header]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }
}
