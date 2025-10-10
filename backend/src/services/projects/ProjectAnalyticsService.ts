/**
 * Project Analytics Service
 * Handles analytics, reporting, export/import, and audit trail functionality
 */

import { BaseService } from '../BaseService'
import type {
  ProjectAnalytics,
  ProjectExportOptions,
  ProjectImportData,
  ProjectAuditEntry,
  ProjectCreateRequest,
  ProjectDuration
} from '@/types/project-service'
import type { ServiceResult } from '../../types/index'

export class ProjectAnalyticsService extends BaseService {
  constructor() {
    super('ProjectAnalytics')
  }

  /**
   * Get comprehensive analytics for a project
   */
  async getProjectAnalytics(projectId: string): Promise<ServiceResult<ProjectAnalytics>> {
    try {
      // Verify project exists
      const project = await this.db.projects.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }

      // Gather analytics data
      const [
        subscriptions,
        tokenAllocations,
        distributions,
        investors
      ] = await Promise.all([
        this.db.subscriptions.findMany({
          where: { project_id: projectId },
          include: {
            investors: {
              select: {
                investor_id: true,
                tax_residency: true,
                type: true
              }
            }
          },
          orderBy: { subscription_date: 'asc' }
        }),
        this.db.token_allocations.findMany({
          where: { project_id: projectId }
        }),
        this.db.distributions.findMany({
          where: { project_id: projectId }
        }),
        this.db.investors.findMany({
          where: {
            subscriptions: {
              some: { project_id: projectId }
            }
          }
        })
      ])

      // Calculate summary metrics
      const totalRaised = subscriptions.reduce((sum: number, s: any) => sum + (s.fiat_amount || 0), 0)
      const totalInvestors = new Set(subscriptions.map((s: any) => s.investor_id)).size
      const averageInvestment = totalInvestors > 0 ? totalRaised / totalInvestors : 0
      const targetRaiseValue = project.target_raise ? project.target_raise.toNumber() : 0
      const targetCompletion = targetRaiseValue > 0 ? (totalRaised / targetRaiseValue) * 100 : 0

      // Calculate time to target (estimated days)
      const timeToTarget = this.calculateTimeToTarget(subscriptions, targetRaiseValue, totalRaised)

      // Build timeline data
      const timeline = this.buildTimeline(subscriptions)

      // Geographic analysis
      const geography = this.analyzeGeography(subscriptions)

      // Demographics analysis
      const demographics = this.analyzeDemographics(subscriptions)

      const analytics: ProjectAnalytics = {
        projectId,
        summary: {
          totalRaised,
          totalInvestors,
          averageInvestment,
          targetCompletion,
          timeToTarget
        },
        timeline,
        geography,
        demographics
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get project analytics', { error, projectId })
      return this.error('Failed to retrieve project analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get project audit trail
   */
  async getProjectAuditTrail(
    projectId: string,
    limit = 100,
    offset = 0
  ): Promise<ServiceResult<ProjectAuditEntry[]>> {
    try {
      const auditEntries = await this.db.audit_logs.findMany({
        where: {
          OR: [
            { entity_id: projectId },
            { entity_type: 'project' }
          ]
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: Math.min(limit, 1000)
      })

      const formattedEntries: ProjectAuditEntry[] = auditEntries.map((entry: any) => ({
        id: entry.id,
        projectId,
        action: entry.action,
        userId: entry.user_id || '',
        userName: entry.user_name || 'Unknown',
        timestamp: entry.created_at.toISOString(),
        details: (entry.details as any) || {},
        ipAddress: entry.ip_address || undefined,
        userAgent: entry.user_agent || undefined
      }))

      return this.success(formattedEntries)
    } catch (error) {
      this.logError('Failed to get project audit trail', { error, projectId })
      return this.error('Failed to retrieve audit trail', 'DATABASE_ERROR')
    }
  }

  /**
   * Export projects in various formats
   */
  async exportProjects(options: ProjectExportOptions): Promise<ServiceResult<any>> {
    try {
      const { format, fields, includeStatistics, includeCompliance, dateRange } = options

      // Build query
      const where: any = {}
      if (dateRange) {
        where.created_at = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end)
        }
      }

      // Get projects with selected fields
      const projects = await this.db.projects.findMany({
        where,
        select: this.buildSelectObject(fields),
        orderBy: { created_at: 'desc' }
      })

      // Enhance with statistics if requested
      let exportData: any[] = projects
      if (includeStatistics) {
        exportData = await Promise.all(
          projects.map(async (project: any) => {
            const stats = await this.calculateBasicStats(project.id)
            return { ...project, ...stats }
          })
        )
      }

      // Format according to export format
      switch (format) {
        case 'csv':
          return this.success(this.formatAsCSV(exportData))
        case 'excel':
          return this.success(await this.formatAsExcel(exportData))
        case 'pdf':
          return this.success(await this.formatAsPDF(exportData))
        case 'json':
          return this.success(JSON.stringify(exportData, null, 2))
        default:
          return this.error('Unsupported export format', 'INVALID_FORMAT', 400)
      }
    } catch (error) {
      this.logError('Failed to export projects', { error, options })
      return this.error('Failed to export projects', 'EXPORT_ERROR')
    }
  }

  /**
   * Import projects from data
   */
  async importProjects(data: ProjectImportData): Promise<ServiceResult<any>> {
    try {
      const { projects, options = {} } = data
      const { skipValidation = false, createCapTables = true, setAsPrimary } = options

      const successful: any[] = []
      const failed: Array<{ item: any, error: string, index: number }> = []

      for (let i = 0; i < projects.length; i++) {
        try {
          const projectData = projects[i]

          // Check if projectData exists
          if (!projectData) {
            throw new Error('Project data is missing')
          }

          // Validation if not skipped
          if (!skipValidation) {
            // Basic validation - could integrate with ProjectValidationService
            if (!projectData.name || !projectData.projectType) {
              throw new Error('Name and project type are required')
            }
          }

          // Ensure required fields are present
          if (!projectData.name) {
            throw new Error('Project name is required')
          }

          // Create project
          const project = await this.db.projects.create({
            data: {
              name: projectData.name,
              description: projectData.description || null,
              project_type: projectData.projectType || null,
              token_symbol: projectData.tokenSymbol || null,
              target_raise: projectData.targetRaise || null,
              company_valuation: projectData.companyValuation || null,
              legal_entity: projectData.legalEntity || null,
              jurisdiction: projectData.jurisdiction || null,
              tax_id: projectData.taxId || null,
              status: projectData.status || 'Active',
              is_primary: projectData.isPrimary || false,
              investment_status: projectData.investmentStatus || 'Open',
              estimated_yield_percentage: projectData.estimatedYieldPercentage || null,
              duration: projectData.duration ? (projectData.duration as ProjectDuration) : null,
              subscription_start_date: projectData.subscriptionStartDate ? new Date(projectData.subscriptionStartDate) : null,
              subscription_end_date: projectData.subscriptionEndDate ? new Date(projectData.subscriptionEndDate) : null,
              transaction_start_date: projectData.transactionStartDate ? new Date(projectData.transactionStartDate) : null,
              maturity_date: projectData.maturityDate ? new Date(projectData.maturityDate) : null,
              currency: projectData.currency || 'USD',
              minimum_investment: projectData.minimumInvestment || null,
              total_notional: projectData.totalNotional || null
            }
          })

          // Create cap table if requested
          if (createCapTables) {
            await this.db.cap_tables.create({
              data: {
                project_id: project.id,
                name: `${project.name} Cap Table`,
                description: `Imported cap table for ${project.name}`
              }
            })
          }

          successful.push(project)
        } catch (error) {
          failed.push({
            item: projects[i],
            error: error instanceof Error ? error.message : 'Unknown error',
            index: i
          })
        }
      }

      // Set primary project if specified
      if (setAsPrimary && successful.length > 0) {
        const primaryProject = successful.find((p: any) => p.name === setAsPrimary)
        if (primaryProject) {
          await this.db.projects.updateMany({
            where: { is_primary: true },
            data: { is_primary: false }
          })
          await this.db.projects.update({
            where: { id: primaryProject.id },
            data: { is_primary: true }
          })
        }
      }

      const result = {
        imported: successful.length,
        failed: failed.length,
        errors: failed.map(f => f.error),
        details: {
          successful: successful.map(p => ({ id: p.id, name: p.name })),
          failed
        }
      }

      this.logInfo('Project import completed', { 
        imported: successful.length, 
        failed: failed.length 
      })

      return this.success(result)
    } catch (error) {
      this.logError('Failed to import projects', { error, data })
      return this.error('Failed to import projects', 'IMPORT_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private calculateTimeToTarget(subscriptions: any[], targetRaise: number, currentRaised: number): number {
    if (subscriptions.length < 2 || currentRaised >= targetRaise) return 0

    // Calculate daily raise rate from recent activity
    const sortedSubs = subscriptions.sort((a, b) => 
      new Date(a.subscriptionDate).getTime() - new Date(b.subscriptionDate).getTime()
    )

    const recentSubs = sortedSubs.slice(-10) // Last 10 subscriptions
    if (recentSubs.length < 2) return 0

    const firstDate = new Date(recentSubs[0].subscriptionDate)
    const lastDate = new Date(recentSubs[recentSubs.length - 1].subscriptionDate)
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff === 0) return 0

    const recentRaised = recentSubs.reduce((sum, s) => sum + s.subscriptionAmount.toNumber(), 0)
    const dailyRate = recentRaised / daysDiff

    if (dailyRate === 0) return 0

    const remainingToRaise = targetRaise - currentRaised
    return Math.ceil(remainingToRaise / dailyRate)
  }

  private buildTimeline(subscriptions: any[]): Array<{
    date: string
    cumulativeRaised: number
    newInvestors: number
    transactions: number
  }> {
    const timeline: Map<string, { raised: number, investors: Set<string>, transactions: number }> = new Map()

    subscriptions.forEach((sub: any) => {
      const date = sub.subscription_date.toISOString().split('T')[0]
      const existing = timeline.get(date) || { raised: 0, investors: new Set(), transactions: 0 }
      
      existing.raised += sub.fiat_amount || 0
      existing.investors.add(sub.investor_id)
      existing.transactions += 1
      
      timeline.set(date, existing)
    })

    const result: Array<{
      date: string
      cumulativeRaised: number
      newInvestors: number
      transactions: number
    }> = []

    let cumulativeRaised = 0
    const sortedDates = Array.from(timeline.keys()).sort()

    sortedDates.forEach(date => {
      const dayData = timeline.get(date)!
      cumulativeRaised += dayData.raised

      result.push({
        date,
        cumulativeRaised,
        newInvestors: dayData.investors.size,
        transactions: dayData.transactions
      })
    })

    return result
  }

  private analyzeGeography(subscriptions: any[]): Array<{
    country: string
    investors: number
    amount: number
    percentage: number
  }> {
    const countryMap: Map<string, { investors: Set<string>, amount: number }> = new Map()
    const totalAmount = subscriptions.reduce((sum: number, s: any) => sum + (s.fiat_amount || 0), 0)

    subscriptions.forEach((sub: any) => {
      const country = sub.investors?.tax_residency || 'Unknown'
      const existing = countryMap.get(country) || { investors: new Set(), amount: 0 }
      
      existing.investors.add(sub.investor_id)
      existing.amount += sub.fiat_amount || 0
      
      countryMap.set(country, existing)
    })

    return Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        investors: data.investors.size,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  private analyzeDemographics(subscriptions: any[]): {
    investorTypes: Record<string, number>
    riskProfiles: Record<string, number>
    investmentSizes: Record<string, number>
  } {
    const investorTypes: Record<string, number> = {}
    const riskProfiles: Record<string, number> = {}
    const investmentSizes: Record<string, number> = {}

    subscriptions.forEach((sub: any) => {
      // Investor types
      const type = sub.investors?.investor_type || 'Unknown'
      investorTypes[type] = (investorTypes[type] || 0) + 1

      // Risk profiles
      const risk = sub.investors?.risk_assessment?.risk_tolerance || 'Unknown'
      riskProfiles[risk] = (riskProfiles[risk] || 0) + 1

      // Investment size buckets
      const amount = sub.fiat_amount || 0
      let bucket: string
      if (amount < 10000) bucket = 'Under $10K'
      else if (amount < 50000) bucket = '$10K - $50K'
      else if (amount < 100000) bucket = '$50K - $100K'
      else if (amount < 500000) bucket = '$100K - $500K'
      else bucket = 'Over $500K'

      investmentSizes[bucket] = (investmentSizes[bucket] || 0) + 1
    })

    return {
      investorTypes,
      riskProfiles,
      investmentSizes
    }
  }

  private async calculateBasicStats(projectId: string) {
    const [subscriptions, tokens] = await Promise.all([
      this.db.subscriptions.count({ where: { project_id: projectId } }),
      this.db.tokens.count({ where: { project_id: projectId } })
    ])

    return {
      subscriptionCount: subscriptions,
      tokenCount: tokens
    }
  }

  private buildSelectObject(fields: string[]): any {
    const select: any = {}
    
    // Always include ID
    select.id = true
    
    fields.forEach(field => {
      select[field] = true
    })

    return select
  }

  private formatAsCSV(data: any[]): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }

  private async formatAsExcel(data: any[]): Promise<Buffer> {
    // This would typically use a library like 'exceljs'
    // For now, return CSV format as placeholder
    const csvData = this.formatAsCSV(data)
    return Buffer.from(csvData, 'utf-8')
  }

  private async formatAsPDF(data: any[]): Promise<Buffer> {
    // This would typically use a library like 'puppeteer' or 'jspdf'
    // For now, return a simple text format as placeholder
    const content = JSON.stringify(data, null, 2)
    return Buffer.from(content, 'utf-8')
  }
}
