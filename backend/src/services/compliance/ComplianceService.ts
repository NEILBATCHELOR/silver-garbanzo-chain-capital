/**
 * ComplianceService
 * Main service for compliance management, KYC/AML verification, 
 * document compliance, and regulatory reporting
 */

import { BaseService } from '../BaseService'
import type {
  ServiceResult,
  PaginatedResponse,
  QueryOptions
} from '@/types/index'

// Compliance Types
export interface ComplianceCheck {
  id: string
  investor_id: string
  project_id: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_reason: string
  status: 'pending' | 'approved' | 'rejected' | 'review_required'
  reviewed_by?: string
  reviewed_at?: Date
  created_at: Date
  updated_at: Date
}

export interface ComplianceReport {
  id: string
  title: string
  report_type: 'kyc_summary' | 'aml_review' | 'document_status' | 'compliance_metrics' | 'regulatory_filing'
  generated_by: string
  generated_at: Date
  period_start: Date
  period_end: Date
  data: Record<string, any>
  status: 'draft' | 'finalized' | 'submitted' | 'approved'
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface KycVerification {
  id: string
  investor_id: string
  verification_type: 'individual' | 'corporate' | 'institutional'
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired'
  verification_level: 'basic' | 'enhanced' | 'comprehensive'
  provider: string
  provider_verification_id?: string
  documents_required: string[]
  documents_submitted: string[]
  verification_data: Record<string, any>
  risk_score?: number
  risk_factors: string[]
  expiry_date?: Date
  verified_by?: string
  verified_at?: Date
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface AmlScreening {
  id: string
  entity_id: string
  entity_type: 'investor' | 'issuer' | 'organization'
  screening_type: 'sanctions' | 'pep' | 'adverse_media' | 'watchlist'
  provider: string
  provider_screening_id?: string
  status: 'pending' | 'clear' | 'match_found' | 'review_required' | 'false_positive'
  matches: Array<{
    match_type: string
    confidence_score: number
    match_data: Record<string, any>
    reviewed: boolean
    reviewer_notes?: string
  }>
  last_screened_at: Date
  next_screening_due: Date
  created_at: Date
  updated_at: Date
}

export interface ComplianceMetrics {
  total_investors: number
  kyc_completion_rate: number
  aml_clear_rate: number
  document_approval_rate: number
  compliance_issues_count: number
  pending_reviews_count: number
  high_risk_entities_count: number
  average_onboarding_time_days: number
  regulatory_breaches_count: number
}

export interface ComplianceSettings {
  id: string
  setting_category: 'kyc' | 'aml' | 'document' | 'reporting' | 'automation'
  setting_name: string
  setting_value: any
  is_active: boolean
  updated_by: string
  updated_at: Date
}

export class ComplianceService extends BaseService {
  constructor() {
    super('Compliance')
  }

  /**
   * Get compliance overview dashboard data
   */
  async getComplianceOverview(): Promise<ServiceResult<{
    metrics: ComplianceMetrics
    recent_checks: ComplianceCheck[]
    pending_reviews: Array<{
      type: string
      entity_id: string
      entity_name: string
      priority: string
      due_date: Date
    }>
    alerts: Array<{
      type: string
      message: string
      severity: string
      created_at: Date
    }>
  }>> {
    try {
      // Get overall compliance metrics
      const metrics = await this.calculateComplianceMetrics()

      // Get recent compliance checks
      const recentChecks = await this.db.compliance_checks.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          investors: {
            select: { name: true }
          }
        }
      })

      // Get pending reviews
      const pendingKycReviews = await this.db.investors.findMany({
        where: { kyc_status: 'pending' },
        take: 5,
        select: {
          investor_id: true,
          name: true,
          created_at: true
        }
      })

      const pendingDocumentReviews = await this.db.issuer_documents.findMany({
        where: { status: 'pending' },
        take: 5,
        select: {
          id: true,
          document_name: true,
          uploaded_at: true
        }
      })

      const pendingReviews = [
        ...pendingKycReviews.map(investor => ({
          type: 'kyc_review',
          entity_id: investor.investor_id,
          entity_name: investor.name,
          priority: 'medium',
          due_date: investor.created_at ? new Date(investor.created_at.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date() // 7 days from creation
        })),
        ...pendingDocumentReviews.map(doc => ({
          type: 'document_review',
          entity_id: doc.id,
          entity_name: doc.document_name || 'Unknown Document',
          priority: 'high',
          due_date: new Date(doc.uploaded_at.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from upload
        }))
      ]

      // Generate compliance alerts
      const alerts = await this.generateComplianceAlerts()

      return this.success({
        metrics,
        recent_checks: recentChecks.map(this.mapComplianceCheck),
        pending_reviews: pendingReviews.slice(0, 10),
        alerts
      })
    } catch (error) {
      this.logger.error({ error }, 'Failed to get compliance overview')
      return this.error('Failed to get compliance overview', 'DATABASE_ERROR')
    }
  }

  /**
   * Create compliance check for investor/project combination
   */
  async createComplianceCheck(data: {
    investor_id: string
    project_id: string
    risk_assessment?: {
      factors: string[]
      scores: Record<string, number>
      overall_risk: 'low' | 'medium' | 'high' | 'critical'
    }
    auto_approve_low_risk?: boolean
  }): Promise<ServiceResult<ComplianceCheck>> {
    try {
      const { investor_id, project_id, risk_assessment, auto_approve_low_risk = true } = data

      // Validate investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id },
        select: {
          investor_id: true,
          name: true,
          kyc_status: true,
          investor_status: true,
          risk_assessment: true
        }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Validate project exists
      const project = await this.db.projects.findUnique({
        where: { id: project_id },
        select: { id: true, name: true, status: true }
      })

      if (!project) {
        return this.error('Project not found', 'NOT_FOUND', 404)
      }

      // Check for existing compliance check
      const existingCheck = await this.db.compliance_checks.findFirst({
        where: {
          investor_id,
          project_id
        }
      })

      if (existingCheck) {
        return this.error('Compliance check already exists for this investor/project combination', 'CONFLICT', 409)
      }

      // Perform risk assessment
      const riskResult = risk_assessment || await this.performRiskAssessment(investor_id, project_id)
      
      // Determine initial status
      let status: ComplianceCheck['status'] = 'pending'
      if (auto_approve_low_risk && riskResult.overall_risk === 'low') {
        status = 'approved'
      } else if (riskResult.overall_risk === 'critical') {
        status = 'rejected'
      }

      // Create compliance check
      const complianceCheck = await this.db.compliance_checks.create({
        data: {
          investor_id,
          project_id,
          risk_level: riskResult.overall_risk,
          risk_reason: riskResult.factors.join(', '),
          status,
          reviewed_by: auto_approve_low_risk && status === 'approved' ? 'system' : undefined,
          reviewed_at: auto_approve_low_risk && status === 'approved' ? new Date() : undefined,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      // Log audit event
      await this.logActivity(
        'compliance_check_created',
        'compliance_check',
        complianceCheck.id,
        { investor_id, project_id, risk_level: riskResult.overall_risk },
        'system'
      )

      return this.success(this.mapComplianceCheck(complianceCheck))
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create compliance check')
      return this.error('Failed to create compliance check', 'DATABASE_ERROR')
    }
  }

  /**
   * Update compliance check status
   */
  async updateComplianceCheck(
    id: string,
    data: {
      status: ComplianceCheck['status']
      reviewer_notes?: string
      reviewed_by: string
    }
  ): Promise<ServiceResult<ComplianceCheck>> {
    try {
      const { status, reviewer_notes, reviewed_by } = data

      // Check if compliance check exists
      const existingCheck = await this.db.compliance_checks.findUnique({
        where: { id }
      })

      if (!existingCheck) {
        return this.error('Compliance check not found', 'NOT_FOUND', 404)
      }

      // Update compliance check
      const updatedCheck = await this.db.compliance_checks.update({
        where: { id },
        data: {
          status,
          reviewed_by,
          reviewed_at: new Date(),
          updated_at: new Date()
        }
      })

      // Log audit event
      await this.logActivity(
        'compliance_check_updated',
        'compliance_check',
        id,
        { 
          status, 
          previous_status: existingCheck.status,
          reviewer_notes 
        },
        reviewed_by
      )

      return this.success(this.mapComplianceCheck(updatedCheck))
    } catch (error) {
      this.logger.error({ error, id, data }, 'Failed to update compliance check')
      return this.error('Failed to update compliance check', 'DATABASE_ERROR')
    }
  }

  /**
   * Get compliance checks with filtering
   */
  async getComplianceChecks(options: QueryOptions & {
    investor_id?: string
    project_id?: string
    status?: ComplianceCheck['status'][]
    risk_level?: ComplianceCheck['risk_level'][]
    reviewed_by?: string
    date_from?: Date
    date_to?: Date
  } = {}): Promise<PaginatedResponse<ComplianceCheck>> {
    try {
      const {
        investor_id,
        project_id,
        status,
        risk_level,
        reviewed_by,
        date_from,
        date_to,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options

      // Build where clause
      const where: any = {}

      if (investor_id) where.investor_id = investor_id
      if (project_id) where.project_id = project_id
      if (status && status.length > 0) where.status = { in: status }
      if (risk_level && risk_level.length > 0) where.risk_level = { in: risk_level }
      if (reviewed_by) where.reviewed_by = reviewed_by

      if (date_from || date_to) {
        where.created_at = {}
        if (date_from) where.created_at.gte = date_from
        if (date_to) where.created_at.lte = date_to
      }

      // Execute paginated query
      const { skip, take } = this.parseQueryOptions({ page, limit })
      const orderBy = { [sortBy]: sortOrder }

      const [checks, total] = await Promise.all([
        this.db.compliance_checks.findMany({
          skip,
          take,
          where,
          orderBy,
          include: {
            investors: {
              select: { name: true, email: true }
            },
            projects: {
              select: { name: true }
            }
          }
        }),
        this.db.compliance_checks.count({ where })
      ])

      const mappedChecks = checks.map(this.mapComplianceCheck)

      return this.paginatedResponse(mappedChecks, total, page, limit)
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get compliance checks')
      throw error
    }
  }

  /**
   * Perform automated compliance screening for all entities
   */
  async performBulkComplianceScreening(options: {
    entity_type?: 'investor' | 'issuer' | 'organization'
    screening_types?: Array<'sanctions' | 'pep' | 'adverse_media' | 'watchlist'>
    force_rescreen?: boolean
  } = {}): Promise<ServiceResult<{
    total_screened: number
    clear_results: number
    matches_found: number
    review_required: number
    errors: number
  }>> {
    try {
      const {
        entity_type,
        screening_types = ['sanctions', 'pep', 'adverse_media'],
        force_rescreen = false
      } = options

      let total_screened = 0
      let clear_results = 0
      let matches_found = 0
      let review_required = 0
      let errors = 0

      // Screen investors
      if (!entity_type || entity_type === 'investor') {
        const investors = await this.db.investors.findMany({
          where: {
            investor_status: 'active',
            kyc_status: 'approved'
          },
          select: {
            investor_id: true,
            name: true,
            email: true
          }
        })

        for (const investor of investors) {
          try {
            const screeningResult = await this.performAmlScreening({
              entity_id: investor.investor_id,
              entity_type: 'investor',
              screening_types,
              force_rescreen
            })

            total_screened++
            
            if (screeningResult.success && screeningResult.data) {
              switch (screeningResult.data.status) {
                case 'clear':
                  clear_results++
                  break
                case 'match_found':
                  matches_found++
                  break
                case 'review_required':
                  review_required++
                  break
              }
            } else {
              errors++
            }
          } catch (error) {
            this.logger.error({ error, investor_id: investor.investor_id }, 'Failed to screen investor')
            errors++
          }
        }
      }

      // Screen organizations (issuers)
      if (!entity_type || entity_type === 'organization') {
        const organizations = await this.db.organizations.findMany({
          where: {
            status: 'active'
          },
          select: {
            id: true,
            name: true,
            legal_name: true
          }
        })

        for (const org of organizations) {
          try {
            const screeningResult = await this.performAmlScreening({
              entity_id: org.id,
              entity_type: 'organization',
              screening_types,
              force_rescreen
            })

            total_screened++
            
            if (screeningResult.success && screeningResult.data) {
              switch (screeningResult.data.status) {
                case 'clear':
                  clear_results++
                  break
                case 'match_found':
                  matches_found++
                  break
                case 'review_required':
                  review_required++
                  break
              }
            } else {
              errors++
            }
          } catch (error) {
            this.logger.error({ error, organization_id: org.id }, 'Failed to screen organization')
            errors++
          }
        }
      }

      return this.success({
        total_screened,
        clear_results,
        matches_found,
        review_required,
        errors
      })
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to perform bulk compliance screening')
      return this.error('Failed to perform bulk compliance screening', 'DATABASE_ERROR')
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(data: {
    report_type: ComplianceReport['report_type']
    period_start: Date
    period_end: Date
    filters?: Record<string, any>
    include_charts?: boolean
    format?: 'json' | 'pdf' | 'csv'
  }): Promise<ServiceResult<ComplianceReport>> {
    try {
      const { report_type, period_start, period_end, filters = {}, include_charts = true } = data

      let reportData: Record<string, any> = {}

      switch (report_type) {
        case 'kyc_summary':
          reportData = await this.generateKycSummaryReport(period_start, period_end, filters)
          break
        case 'aml_review':
          reportData = await this.generateAmlReviewReport(period_start, period_end, filters)
          break
        case 'document_status':
          reportData = await this.generateDocumentStatusReport(period_start, period_end, filters)
          break
        case 'compliance_metrics':
          reportData = await this.generateComplianceMetricsReport(period_start, period_end, filters)
          break
        case 'regulatory_filing':
          reportData = await this.generateRegulatoryFilingReport(period_start, period_end, filters)
          break
        default:
          return this.error('Invalid report type', 'VALIDATION_ERROR', 400)
      }

      // Create report record - mapping to actual database fields
      const report = await this.db.compliance_reports.create({
        data: {
          issuer_id: 'system', // TODO: Get from request context or use proper UUID
          generated_at: new Date(),
          status: 'pending_review',
          findings: reportData,
          metadata: {
            title: this.generateReportTitle(report_type, period_start, period_end),
            report_type,
            period_start: period_start.toISOString(),
            period_end: period_end.toISOString(),
            filters,
            include_charts,
            generation_time_ms: Date.now() - Date.now() // TODO: Actual timing
          },
          created_by: 'system', // TODO: Get from request context
          updated_by: 'system'
        }
      })

      // Map database result to ComplianceReport interface
      const mappedReport: ComplianceReport = {
        id: report.id,
        title: (report.metadata as any)?.title || 'Compliance Report',
        report_type,
        generated_by: report.created_by,
        generated_at: report.generated_at,
        period_start,
        period_end,
        data: report.findings as Record<string, any> || {},
        status: 'draft', // Map to interface status
        metadata: report.metadata as Record<string, any> || {},
        created_at: report.created_at,
        updated_at: report.updated_at
      }

      return this.success(mappedReport)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to generate compliance report')
      return this.error('Failed to generate compliance report', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async calculateComplianceMetrics(): Promise<ComplianceMetrics> {
    const [
      totalInvestors,
      kycApproved,
      amlClear,
      documentsApproved,
      totalDocuments,
      complianceIssues,
      pendingReviews,
      highRiskEntities
    ] = await Promise.all([
      this.db.investors.count(),
      this.db.investors.count({ where: { kyc_status: 'approved' } }),
      this.db.investors.count({ where: { kyc_status: 'approved', investor_status: 'active' } }),
      this.db.issuer_documents.count({ where: { status: 'approved' } }),
      this.db.issuer_documents.count(),
      this.db.compliance_checks.count({ where: { status: 'rejected' } }),
      this.db.compliance_checks.count({ where: { status: 'pending' } }),
      this.db.compliance_checks.count({ where: { risk_level: { in: ['high', 'critical'] } } })
    ])

    return {
      total_investors: totalInvestors,
      kyc_completion_rate: totalInvestors > 0 ? (kycApproved / totalInvestors) * 100 : 0,
      aml_clear_rate: totalInvestors > 0 ? (amlClear / totalInvestors) * 100 : 0,
      document_approval_rate: totalDocuments > 0 ? (documentsApproved / totalDocuments) * 100 : 0,
      compliance_issues_count: complianceIssues,
      pending_reviews_count: pendingReviews,
      high_risk_entities_count: highRiskEntities,
      average_onboarding_time_days: 7, // TODO: Calculate from actual data
      regulatory_breaches_count: 0 // TODO: Track regulatory breaches
    }
  }

  private async performRiskAssessment(investor_id: string, project_id: string): Promise<{
    overall_risk: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    scores: Record<string, number>
  }> {
    const factors: string[] = []
    const scores: Record<string, number> = {}
    let totalScore = 0

    // Get investor details
    const investor = await this.db.investors.findUnique({
      where: { investor_id },
      select: {
        kyc_status: true,
        investor_type: true,
        tax_residency: true,
        risk_assessment: true
      }
    })

    // KYC Status Risk
    if (investor?.kyc_status === 'not_started' || investor?.kyc_status === 'failed') {
      factors.push('No valid KYC verification')
      scores.kyc_risk = 40
      totalScore += 40
    } else if (investor?.kyc_status === 'pending') {
      factors.push('Pending KYC verification')
      scores.kyc_risk = 20
      totalScore += 20
    } else {
      scores.kyc_risk = 5
      totalScore += 5
    }

    // Investor Type Risk
    if (investor?.investor_type === 'institutional') {
      scores.entity_type_risk = 5
      totalScore += 5
    } else if (investor?.investor_type === 'corporate') {
      factors.push('Corporate entity requires enhanced due diligence')
      scores.entity_type_risk = 15
      totalScore += 15
    } else {
      scores.entity_type_risk = 10
      totalScore += 10
    }

    // Geographic Risk
    const highRiskJurisdictions = ['AF', 'KP', 'IR', 'SY'] // Simplified example
    if (investor?.tax_residency && highRiskJurisdictions.includes(investor.tax_residency)) {
      factors.push('High-risk jurisdiction')
      scores.geographic_risk = 30
      totalScore += 30
    } else {
      scores.geographic_risk = 5
      totalScore += 5
    }

    // Determine overall risk level
    let overall_risk: 'low' | 'medium' | 'high' | 'critical'
    if (totalScore >= 70) {
      overall_risk = 'critical'
    } else if (totalScore >= 50) {
      overall_risk = 'high'
    } else if (totalScore >= 30) {
      overall_risk = 'medium'
    } else {
      overall_risk = 'low'
    }

    return { overall_risk, factors, scores }
  }

  private async performAmlScreening(data: {
    entity_id: string
    entity_type: 'investor' | 'issuer' | 'organization'
    screening_types: Array<'sanctions' | 'pep' | 'adverse_media' | 'watchlist'>
    force_rescreen: boolean
  }): Promise<ServiceResult<AmlScreening>> {
    // This is a placeholder implementation
    // In real implementation, this would integrate with AML screening providers
    // like WorldCheck, Dow Jones, Comply Advantage, etc.
    
    const screening: AmlScreening = {
      id: this.generateId(),
      entity_id: data.entity_id,
      entity_type: data.entity_type,
      screening_type: 'sanctions', // For now, just sanctions
      provider: 'internal',
      status: 'clear', // Simplified for demo
      matches: [],
      last_screened_at: new Date(),
      next_screening_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      created_at: new Date(),
      updated_at: new Date()
    }

    return this.success(screening)
  }

  private async generateComplianceAlerts(): Promise<Array<{
    type: string
    message: string
    severity: string
    created_at: Date
  }>> {
    const alerts: Array<{
      type: string
      message: string
      severity: string
      created_at: Date
    }> = []

    // Check for expired KYC
    const expiredKyc = await this.db.investors.count({
      where: {
        kyc_expiry_date: {
          lt: new Date()
        },
        kyc_status: 'approved'
      }
    })

    if (expiredKyc > 0) {
      alerts.push({
        type: 'kyc_expired',
        message: `${expiredKyc} investors have expired KYC verification`,
        severity: 'high',
        created_at: new Date()
      })
    }

    // Check for pending reviews
    const pendingReviews = await this.db.compliance_checks.count({
      where: { status: 'pending' }
    })

    if (pendingReviews > 10) {
      alerts.push({
        type: 'pending_reviews',
        message: `${pendingReviews} compliance checks pending review`,
        severity: 'medium',
        created_at: new Date()
      })
    }

    return alerts
  }

  private async generateKycSummaryReport(period_start: Date, period_end: Date, filters: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for KYC summary report
    return {
      summary: 'KYC Summary Report',
      period: { start: period_start, end: period_end },
      // Add actual KYC data here
    }
  }

  private async generateAmlReviewReport(period_start: Date, period_end: Date, filters: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for AML review report
    return {
      summary: 'AML Review Report',
      period: { start: period_start, end: period_end },
      // Add actual AML data here
    }
  }

  private async generateDocumentStatusReport(period_start: Date, period_end: Date, filters: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for document status report
    return {
      summary: 'Document Status Report',
      period: { start: period_start, end: period_end },
      // Add actual document data here
    }
  }

  private async generateComplianceMetricsReport(period_start: Date, period_end: Date, filters: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for compliance metrics report
    return {
      summary: 'Compliance Metrics Report',
      period: { start: period_start, end: period_end },
      // Add actual metrics data here
    }
  }

  private async generateRegulatoryFilingReport(period_start: Date, period_end: Date, filters: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for regulatory filing report
    return {
      summary: 'Regulatory Filing Report',
      period: { start: period_start, end: period_end },
      // Add actual regulatory data here
    }
  }

  private generateReportTitle(report_type: string, period_start: Date, period_end: Date): string {
    const formattedStart = period_start.toISOString().split('T')[0]
    const formattedEnd = period_end.toISOString().split('T')[0]
    
    const titles: Record<string, string> = {
      kyc_summary: 'KYC Summary Report',
      aml_review: 'AML Review Report',
      document_status: 'Document Status Report',
      compliance_metrics: 'Compliance Metrics Report',
      regulatory_filing: 'Regulatory Filing Report'
    }

    return `${titles[report_type] || 'Compliance Report'} (${formattedStart} to ${formattedEnd})`
  }

  private mapComplianceCheck(check: any): ComplianceCheck {
    return {
      id: check.id,
      investor_id: check.investor_id,
      project_id: check.project_id,
      risk_level: check.risk_level,
      risk_reason: check.risk_reason,
      status: check.status,
      reviewed_by: check.reviewed_by,
      reviewed_at: check.reviewed_at,
      created_at: check.created_at,
      updated_at: check.updated_at
    }
  }
}