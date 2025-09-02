/**
 * Policy Analytics Service
 * Analytics and reporting for policy templates and approval configurations
 */

import { BaseService } from '../BaseService'
import type { ServiceResult } from '@/types/index'

export interface PolicyAnalytics {
  totalTemplates: number
  activeTemplates: number
  draftTemplates: number
  publishedTemplates: number
  templatesByType: Record<string, number>
  recentActivity: {
    created: number
    updated: number
    published: number
  }
  totalApprovalConfigs: number
  activeApprovalConfigs: number
}

export interface PolicyUsageMetrics {
  templateId: string
  templateName: string
  templateType: string
  usageCount: number
  lastUsed?: Date
  successRate: number
  approvalRate: number
}

export interface PolicyExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  includeInactive?: boolean
  templateTypes?: string[]
  dateFrom?: Date
  dateTo?: Date
  includeApprovalConfigs?: boolean
}

export interface ApprovalConfigAnalytics {
  configId: string
  configName: string
  consensusType: string
  approvalMode: string
  averageApprovalTime: number
  approvalRate: number
  totalRequests: number
  approvedRequests: number
  rejectedRequests: number
}

export class PolicyAnalyticsService extends BaseService {
  constructor() {
    super('PolicyAnalytics')
  }

  /**
   * Get comprehensive policy analytics
   */
  async getPolicyAnalytics(): Promise<ServiceResult<PolicyAnalytics>> {
    try {
      // Get template counts
      const [
        totalTemplates,
        activeTemplates,
        draftTemplates,
        publishedTemplates,
        templatesByType,
        recentActivity,
        totalApprovalConfigs,
        activeApprovalConfigs
      ] = await Promise.all([
        this.db.policy_templates.count(),
        this.db.policy_templates.count({ where: { status: 'active' } }),
        this.db.policy_templates.count({ where: { status: 'draft' } }),
        this.db.policy_templates.count({ where: { status: 'published' } }),
        this.getTemplateCountsByType(),
        this.getRecentTemplateActivity(),
        this.db.approval_configs.count(),
        this.db.approval_configs.count({ where: { active: true } })
      ])

      const analytics: PolicyAnalytics = {
        totalTemplates,
        activeTemplates,
        draftTemplates,
        publishedTemplates,
        templatesByType,
        recentActivity,
        totalApprovalConfigs,
        activeApprovalConfigs
      }

      return this.success(analytics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get policy analytics')
      return this.error('Failed to get policy analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Get policy template usage metrics
   */
  async getPolicyUsageMetrics(): Promise<ServiceResult<PolicyUsageMetrics[]>> {
    try {
      const templates = await this.db.policy_templates.findMany({
        where: { status: { in: ['active', 'published'] } },
        select: {
          template_id: true,
          template_name: true,
          template_type: true,
          updated_at: true
        }
      })

      // TODO: Integrate with actual usage tracking when available
      const metrics: PolicyUsageMetrics[] = templates.map(template => ({
        templateId: template.template_id,
        templateName: template.template_name,
        templateType: template.template_type || 'unknown',
        usageCount: 0, // Would be populated from usage tracking
        lastUsed: template.updated_at || undefined,
        successRate: 100, // Placeholder
        approvalRate: 95 // Placeholder
      }))

      return this.success(metrics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get policy usage metrics')
      return this.error('Failed to get policy usage metrics', 'METRICS_ERROR')
    }
  }

  /**
   * Get approval configuration analytics
   */
  async getApprovalConfigAnalytics(): Promise<ServiceResult<ApprovalConfigAnalytics[]>> {
    try {
      const configs = await this.db.approval_configs.findMany({
        where: { active: true },
        select: {
          id: true,
          config_name: true,
          consensus_type: true,
          approval_mode: true
        }
      })

      // TODO: Integrate with actual approval tracking when available
      const analytics: ApprovalConfigAnalytics[] = configs.map(config => ({
        configId: config.id,
        configName: config.config_name || 'Unnamed Config',
        consensusType: config.consensus_type,
        approvalMode: config.approval_mode || 'parallel',
        averageApprovalTime: 24, // Placeholder - hours
        approvalRate: 92, // Placeholder - percentage
        totalRequests: 0, // Would be populated from approval tracking
        approvedRequests: 0,
        rejectedRequests: 0
      }))

      return this.success(analytics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get approval config analytics')
      return this.error('Failed to get approval config analytics', 'APPROVAL_ANALYTICS_ERROR')
    }
  }

  /**
   * Get policy template trends over time
   */
  async getPolicyTemplateTrends(days: number = 30): Promise<ServiceResult<any[]>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const trends = await this.db.policy_templates.groupBy({
        by: ['template_type'],
        where: {
          created_at: {
            gte: startDate
          }
        },
        _count: {
          template_id: true
        },
        orderBy: {
          _count: {
            template_id: 'desc'
          }
        }
      })

      const formattedTrends = trends.map(trend => ({
        templateType: trend.template_type || 'unknown',
        count: trend._count.template_id
      }))

      return this.success(formattedTrends)
    } catch (error) {
      this.logger.error({ error, days }, 'Failed to get policy template trends')
      return this.error('Failed to get policy template trends', 'TRENDS_ERROR')
    }
  }

  /**
   * Get templates by creator
   */
  async getTemplatesByCreator(): Promise<ServiceResult<any[]>> {
    try {
      const templatesByCreator = await this.db.policy_templates.groupBy({
        by: ['created_by'],
        _count: {
          template_id: true
        },
        orderBy: {
          _count: {
            template_id: 'desc'
          }
        }
      })

      const formatted = templatesByCreator.map(item => ({
        createdBy: item.created_by,
        templateCount: item._count.template_id
      }))

      return this.success(formatted)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get templates by creator')
      return this.error('Failed to get templates by creator', 'CREATOR_ANALYTICS_ERROR')
    }
  }

  /**
   * Export policy data
   */
  async exportPolicyData(options: PolicyExportOptions): Promise<ServiceResult<any>> {
    try {
      const where: any = {}
      
      if (!options.includeInactive) {
        where.status = { in: ['active', 'published'] }
      }
      
      if (options.templateTypes && options.templateTypes.length > 0) {
        where.template_type = { in: options.templateTypes }
      }
      
      if (options.dateFrom || options.dateTo) {
        where.created_at = {}
        if (options.dateFrom) where.created_at.gte = options.dateFrom
        if (options.dateTo) where.created_at.lte = options.dateTo
      }

      const templates = await this.db.policy_templates.findMany({
        where,
        orderBy: { created_at: 'desc' }
      })

      let exportData: any = { templates }

      // Include approval configs if requested
      if (options.includeApprovalConfigs) {
        const approvalConfigs = await this.db.approval_configs.findMany({
          where: { active: true },
          orderBy: { created_at: 'desc' }
        })
        exportData.approvalConfigs = approvalConfigs
      }

      // Format based on export type
      let formattedData
      switch (options.format) {
        case 'json':
          formattedData = JSON.stringify(exportData, null, 2)
          break
        case 'csv':
          formattedData = this.convertToCSV(templates)
          break
        case 'xlsx':
          // TODO: Implement Excel export
          formattedData = exportData
          break
        default:
          formattedData = exportData
      }

      return this.success({
        data: formattedData,
        count: templates.length,
        format: options.format
      })
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to export policy data')
      return this.error('Failed to export policy data', 'EXPORT_ERROR')
    }
  }

  /**
   * Get policy compliance metrics
   */
  async getPolicyComplianceMetrics(): Promise<ServiceResult<any>> {
    try {
      const metrics = {
        totalActiveTemplates: await this.db.policy_templates.count({ 
          where: { status: 'active' } 
        }),
        publishedTemplates: await this.db.policy_templates.count({ 
          where: { status: 'published' } 
        }),
        complianceTemplates: await this.db.policy_templates.count({
          where: {
            status: { in: ['active', 'published'] },
            template_type: {
              in: ['compliance', 'kyc', 'aml']
            }
          }
        }),
        approvalConfigsActive: await this.db.approval_configs.count({
          where: { active: true }
        })
      }

      return this.success(metrics)
    } catch (error) {
      this.logger.error({ error }, 'Failed to get policy compliance metrics')
      return this.error('Failed to get policy compliance metrics', 'COMPLIANCE_METRICS_ERROR')
    }
  }

  /**
   * Get template usage by status over time
   */
  async getTemplateStatusTrends(days: number = 30): Promise<ServiceResult<any[]>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const statusTrends = await this.db.policy_templates.groupBy({
        by: ['status'],
        where: {
          updated_at: {
            gte: startDate
          }
        },
        _count: {
          template_id: true
        }
      })

      const formatted = statusTrends.map(trend => ({
        status: trend.status,
        count: trend._count.template_id
      }))

      return this.success(formatted)
    } catch (error) {
      this.logger.error({ error, days }, 'Failed to get template status trends')
      return this.error('Failed to get template status trends', 'STATUS_TRENDS_ERROR')
    }
  }

  /**
   * Private helper methods
   */
  private async getTemplateCountsByType(): Promise<Record<string, number>> {
    try {
      const counts = await this.db.policy_templates.groupBy({
        by: ['template_type'],
        _count: {
          template_id: true
        }
      })

      const result: Record<string, number> = {}
      counts.forEach(count => {
        const type = count.template_type || 'unknown'
        result[type] = count._count.template_id
      })

      return result
    } catch (error) {
      this.logger.error({ error }, 'Failed to get template counts by type')
      return {}
    }
  }

  private async getRecentTemplateActivity(): Promise<{ created: number; updated: number; published: number }> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [created, updated, published] = await Promise.all([
        this.db.policy_templates.count({
          where: {
            created_at: { gte: sevenDaysAgo }
          }
        }),
        this.db.policy_templates.count({
          where: {
            updated_at: { gte: sevenDaysAgo },
            created_at: { lt: sevenDaysAgo }
          }
        }),
        this.db.policy_templates.count({
          where: {
            status: 'published',
            updated_at: { gte: sevenDaysAgo }
          }
        })
      ])

      return {
        created,
        updated,
        published
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get recent template activity')
      return { created: 0, updated: 0, published: 0 }
    }
  }

  private convertToCSV(templates: any[]): string {
    if (templates.length === 0) return ''

    const headers = Object.keys(templates[0])
    const csvRows = [
      headers.join(','),
      ...templates.map(template => 
        headers.map(header => {
          const value = template[header]
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`
          } else if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }
}
