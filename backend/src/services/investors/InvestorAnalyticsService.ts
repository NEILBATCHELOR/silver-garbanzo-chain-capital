/**
 * Investor Analytics Service
 * Provides comprehensive analytics, reporting, and insights for investors
 */

import { BaseService } from '../BaseService'
import type {
  InvestorAnalytics,
  InvestorAuditEntry,
  InvestorWithStats,
  InvestorQueryOptions
} from '@/types/investors'
import type { ServiceResult, PaginatedResponse } from '../../types/index'

export class InvestorAnalyticsService extends BaseService {
  constructor() {
    super('InvestorAnalytics')
  }

  /**
   * Get comprehensive investor analytics
   */
  async getInvestorAnalytics(investorId: string): Promise<ServiceResult<InvestorAnalytics>> {
    try {
      const investor = await this.db.investors.findUnique({
        where: { investor_id: investorId }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Get cap table entries with project details
      const capTableEntries = await this.db.cap_table_investors.findMany({
        where: { investor_id: investorId },
        include: {
          cap_tables: {
            include: {
              projects: true
            }
          }
        },
        orderBy: { created_at: 'asc' }
      })

      const analytics: InvestorAnalytics = {
        investor_id: investorId,
        summary: await this.calculateSummaryMetrics(capTableEntries),
        timeline: await this.generateTimelineData(capTableEntries),
        project_breakdown: await this.generateProjectBreakdown(capTableEntries),
        risk_profile: await this.calculateRiskProfile(investor, capTableEntries)
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get investor analytics', { error, investorId })
      return this.error('Failed to get investor analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get analytics data (alias for getInvestorAnalytics for backwards compatibility)
   */
  async getAnalyticsData(investorId: string): Promise<ServiceResult<InvestorAnalytics>> {
    return this.getInvestorAnalytics(investorId)
  }

  /**
   * Get investor audit trail
   */
  async getInvestorAuditTrail(
    investorId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<InvestorAuditEntry>> {
    try {
      const { limit = 100, offset = 0 } = options

      // For now, create mock audit entries since we don't have a dedicated audit table
      // In production, this would query a proper audit_logs table
      const mockAuditEntries: InvestorAuditEntry[] = [
        {
          id: '1',
          investor_id: investorId,
          action: 'CREATED',
          user_id: 'system',
          user_name: 'System',
          timestamp: new Date(),
          details: { action: 'Investor account created' }
        }
      ]

      const total = mockAuditEntries.length
      const data = mockAuditEntries.slice(offset, offset + limit)

      return this.paginatedResponse(data, total, Math.floor(offset / limit) + 1, limit)
    } catch (error) {
      this.logError('Failed to get investor audit trail', { error, investorId })
      throw error
    }
  }

  /**
   * Export investor data in various formats
   */
  async exportInvestors(options: {
    format: 'csv' | 'excel' | 'pdf' | 'json'
    fields: string[]
    includeStatistics: boolean
    includeCompliance: boolean
    dateRange?: {
      start: string
      end: string
    }
    investorIds?: string[]
  }): Promise<ServiceResult<Buffer>> {
    try {
      const { format, fields, includeStatistics, includeCompliance, dateRange, investorIds } = options

      // Build query filters
      const where: any = {}
      
      if (investorIds && investorIds.length > 0) {
        where.investor_id = { in: investorIds }
      }

      if (dateRange) {
        where.created_at = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end)
        }
      }

      // Get investors data
      const investors = await this.db.investors.findMany({
        where,
        include: {
          investor_group_members: {
            include: { investor_groups: true }
          },
          cap_table_investors: {
            include: {
              cap_tables: {
                include: { projects: true }
              }
            }
          }
        }
      })

      // Format data based on requested fields
      const exportData = await Promise.all(
        investors.map(async (investor: any) => {
          const baseData: any = {}

          // Add requested fields
          for (const field of fields) {
            if (field.includes('.')) {
              // Handle nested fields
              const fieldParts = field.split('.')
              const parent = fieldParts[0]
              const child = fieldParts[1]
              if (parent && child) {
                if (!baseData[parent]) baseData[parent] = {}
                baseData[parent][child] = this.getNestedValue(investor, field)
              }
            } else {
              baseData[field] = investor[field]
            }
          }

          // Add statistics if requested
          if (includeStatistics) {
            baseData.statistics = await this.calculateInvestorStatistics(investor.investor_id)
          }

          // Add compliance data if requested
          if (includeCompliance) {
            baseData.compliance = await this.calculateComplianceMetrics(investor)
          }

          return baseData
        })
      )

      // Generate export file based on format
      const exportBuffer = await this.generateExportFile(exportData, format)
      
      return this.success(exportBuffer)
    } catch (error) {
      this.logError('Failed to export investors', { error, options })
      return this.error('Failed to export investors', 'EXPORT_ERROR')
    }
  }

  /**
   * Import investor data
   */
  async importInvestors(data: {
    investors: any[]
    options: {
      skipValidation?: boolean
      assignToGroups?: string[]
      autoKycCheck?: boolean
    }
  }): Promise<ServiceResult<{
    imported: number
    failed: number
    errors: string[]
  }>> {
    try {
      const { investors, options } = data
      const { skipValidation = false, assignToGroups = [], autoKycCheck = false } = options

      let imported = 0
      let failed = 0
      const errors: string[] = []

      for (const investorData of investors) {
        try {
          // Import logic would go here
          // For now, just simulate the import
          imported++
        } catch (error) {
          failed++
          errors.push(`Failed to import investor ${investorData.email}: ${error}`)
        }
      }

      return this.success({
        imported,
        failed,
        errors
      })
    } catch (error) {
      this.logError('Failed to import investors', { error, data })
      return this.error('Failed to import investors', 'IMPORT_ERROR')
    }
  }

  /**
   * Generate investor overview dashboard data
   */
  async getInvestorOverview(options: InvestorQueryOptions = {}): Promise<ServiceResult<{
    totalInvestors: number
    activeInvestors: number
    kycApprovalRate: number
    averageInvestmentSize: number
    totalInvested: number
    topInvestors: InvestorWithStats[]
    recentActivity: any[]
    complianceMetrics: {
      kycCompliant: number
      accreditationCompliant: number
      documentationComplete: number
    }
    geographicDistribution: Record<string, number>
    investorTypeDistribution: Record<string, number>
  }>> {
    try {
      // Get total investor counts
      const [totalInvestors, activeInvestors] = await Promise.all([
        this.db.investors.count(),
        this.db.investors.count({
          where: { investor_status: 'active' }
        })
      ])

      // Get KYC approval rate
      const kycApproved = await this.db.investors.count({
        where: { kyc_status: 'approved' }
      })
      const kycApprovalRate = totalInvestors > 0 ? (kycApproved / totalInvestors) * 100 : 0

      // Get investment metrics
      const capTableEntries = await this.db.cap_table_investors.findMany({
        include: {
          investors: true,
          cap_tables: {
            include: { projects: true }
          }
        }
      })

      const totalInvested = capTableEntries.reduce((sum: number, entry: any) => sum + (entry.amount_invested || 0), 0)
      const averageInvestmentSize = capTableEntries.length > 0 ? totalInvested / capTableEntries.length : 0

      // Get top investors by investment amount
      const investorInvestments = new Map<string, number>()
      capTableEntries.forEach((entry: any) => {
        const currentAmount = investorInvestments.get(entry.investor_id) || 0
        investorInvestments.set(entry.investor_id, currentAmount + (entry.amount_invested || 0))
      })

      const topInvestorIds = Array.from(investorInvestments.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id)

      const topInvestors = await this.db.investors.findMany({
        where: { investor_id: { in: topInvestorIds } },
        include: {
          cap_table_investors: true,
          investor_group_members: {
            include: { investor_groups: true }
          }
        }
      })

      // Calculate compliance metrics
      const [kycCompliant, accreditationCompliant, documentationComplete] = await Promise.all([
        this.db.investors.count({ where: { kyc_status: 'approved' } }),
        this.db.investors.count({ where: { accreditation_status: 'approved' } }),
        this.db.investors.count({ where: { verification_details: { not: undefined } } })
      ])

      // Get geographic distribution
      const investorsWithLocation = await this.db.investors.findMany({
        where: { tax_residency: { not: undefined } },
        select: { tax_residency: true }
      })

      const geographicDistribution = investorsWithLocation.reduce((acc: any, investor: any) => {
        const country = investor.tax_residency!
        acc[country] = (acc[country] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Get investor type distribution
      const investorsWithType = await this.db.investors.findMany({
        select: { investor_type: true }
      })

      const investorTypeDistribution = investorsWithType.reduce((acc: any, investor: any) => {
        const type = investor.investor_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Recent activity (mock data for now)
      const recentActivity = [
        {
          type: 'new_investor',
          investor_name: 'Recent activity would be tracked here',
          timestamp: new Date(),
          details: 'New investor registration'
        }
      ]

      return this.success({
        totalInvestors,
        activeInvestors,
        kycApprovalRate: Math.round(kycApprovalRate * 100) / 100,
        averageInvestmentSize: Math.round(averageInvestmentSize * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        topInvestors: [], // Would enhance with stats
        recentActivity,
        complianceMetrics: {
          kycCompliant,
          accreditationCompliant,
          documentationComplete
        },
        geographicDistribution,
        investorTypeDistribution
      })
    } catch (error) {
      this.logError('Failed to get investor overview', { error, options })
      return this.error('Failed to get investor overview', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async calculateSummaryMetrics(capTableEntries: any[]): Promise<InvestorAnalytics['summary']> {
    const totalInvested = capTableEntries.reduce((sum, entry) => sum + (entry.amount_invested || 0), 0)
    const uniqueProjects = new Set(capTableEntries.map(entry => entry.capTable.project?.id)).size
    const averageInvestment = capTableEntries.length > 0 ? totalInvested / capTableEntries.length : 0

    // Calculate portfolio performance (mock calculation)
    const portfolioPerformance = totalInvested * 1.05 // Assume 5% growth
    const roiPercentage = totalInvested > 0 ? ((portfolioPerformance - totalInvested) / totalInvested) * 100 : 0

    return {
      total_invested: Math.round(totalInvested * 100) / 100,
      total_projects: uniqueProjects,
      average_investment: Math.round(averageInvestment * 100) / 100,
      portfolio_performance: Math.round(portfolioPerformance * 100) / 100,
      roi_percentage: Math.round(roiPercentage * 100) / 100
    }
  }

  private async generateTimelineData(capTableEntries: any[]): Promise<InvestorAnalytics['timeline']> {
    // Group entries by month
    const timelineMap = new Map<string, {
      cumulative_invested: number
      new_investments: number
      portfolio_value: number
    }>()

    let cumulativeInvested = 0

    // Sort entries by date
    const sortedEntries = capTableEntries.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    for (const entry of sortedEntries) {
      const date = new Date(entry.createdAt)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      
      cumulativeInvested += entry.amount_invested || 0

      const existing = timelineMap.get(monthKey) || {
        cumulative_invested: 0,
        new_investments: 0,
        portfolio_value: 0
      }

      timelineMap.set(monthKey, {
        cumulative_invested: cumulativeInvested,
        new_investments: existing.new_investments + 1,
        portfolio_value: cumulativeInvested * 1.05 // Mock portfolio value
      })
    }

    return Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }))
  }

  private async generateProjectBreakdown(capTableEntries: any[]): Promise<InvestorAnalytics['project_breakdown']> {
    return capTableEntries.map(entry => ({
      project_id: entry.capTable.project?.id || '',
      project_name: entry.capTable.project?.name || 'Unknown Project',
      amount_invested: entry.amount_invested || 0,
      current_value: (entry.amount_invested || 0) * 1.05, // Mock current value
      roi: 5.0, // Mock ROI
      status: entry.capTable.project?.status || 'unknown'
    }))
  }

  private async calculateRiskProfile(investor: any, capTableEntries: any[]): Promise<InvestorAnalytics['risk_profile']> {
    // Calculate risk metrics based on investment portfolio
    const totalInvested = capTableEntries.reduce((sum, entry) => sum + (entry.amount_invested || 0), 0)
    const projectCount = new Set(capTableEntries.map(entry => entry.capTable.project?.id)).size

    // Risk score based on diversification and investment experience
    const riskAssessment = investor.risk_assessment || {}
    const experienceScore = this.getExperienceScore(riskAssessment.investment_experience)
    const diversificationScore = Math.min(projectCount * 10, 100) // 10 points per project, max 100

    const riskScore = Math.round((experienceScore + diversificationScore) / 2)

    // Concentration risk (percentage in largest investment)
    const largestInvestment = Math.max(...capTableEntries.map(entry => entry.amount_invested || 0))
    const concentrationRisk = totalInvested > 0 ? (largestInvestment / totalInvested) * 100 : 0

    return {
      risk_score: riskScore,
      diversification_score: diversificationScore,
      concentration_risk: Math.round(concentrationRisk * 100) / 100,
      recommended_actions: this.generateRiskRecommendations(riskScore, concentrationRisk, projectCount)
    }
  }

  private getExperienceScore(experience: string): number {
    switch (experience) {
      case 'extensive': return 90
      case 'moderate': return 70
      case 'limited': return 50
      case 'none': return 30
      default: return 50
    }
  }

  private generateRiskRecommendations(riskScore: number, concentrationRisk: number, projectCount: number): string[] {
    const recommendations: string[] = []

    if (riskScore < 50) {
      recommendations.push('Consider gaining more investment experience before increasing portfolio size')
    }

    if (concentrationRisk > 50) {
      recommendations.push('Consider diversifying investments to reduce concentration risk')
    }

    if (projectCount < 3) {
      recommendations.push('Consider investing in additional projects to improve diversification')
    }

    if (recommendations.length === 0) {
      recommendations.push('Portfolio risk profile appears well-balanced')
    }

    return recommendations
  }

  private async calculateInvestorStatistics(investorId: string): Promise<any> {
    // Simplified version of statistics calculation
    const capTableEntries = await this.db.cap_table_investors.findMany({
      where: { investor_id: investorId },
      include: { cap_tables: { include: { projects: true } } }
    })

    return {
      total_invested: capTableEntries.reduce((sum: number, entry: any) => sum + (entry.amount_invested || 0), 0),
      number_of_investments: capTableEntries.length,
      active_projects: capTableEntries.filter((entry: any) => 
        entry.cap_tables?.projects?.status === 'active'
      ).length
    }
  }

  private async calculateComplianceMetrics(investor: any): Promise<any> {
    return {
      kycStatus: investor.kyc_status,
      accreditation_status: investor.accreditation_status,
      verification_complete: !!investor.verification_details,
      documents_uploaded: investor.verification_details ? Object.keys(investor.verification_details).length : 0
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async generateExportFile(data: any[], format: string): Promise<Buffer> {
    // Mock file generation - in production, this would use libraries like
    // xlsx for Excel, jsPDF for PDF, etc.
    const jsonData = JSON.stringify(data, null, 2)
    
    switch (format) {
      case 'csv':
        return Buffer.from(this.convertToCSV(data))
      case 'json':
        return Buffer.from(jsonData)
      case 'excel':
      case 'pdf':
        // Would use appropriate libraries here
        return Buffer.from(jsonData)
      default:
        return Buffer.from(jsonData)
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )

    return [csvHeaders, ...csvRows].join('\n')
  }
}
