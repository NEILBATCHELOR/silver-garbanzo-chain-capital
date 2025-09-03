/**
 * Investor Service
 * Main service for investor CRUD operations, group management,
 * and statistics calculation
 */

import { BaseService } from '../BaseService'
import { InvestorValidationService } from './InvestorValidationService'
import { mapDatabaseResult, mapDatabaseResults } from '../../utils/type-mappers'
import type {
  Investor,
  InvestorWithStats,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  InvestorQueryOptions,
  InvestorStatistics,
  InvestorValidationResult,
  InvestorCreationResult,
  BulkInvestorUpdateRequest,
  InvestorComplianceSummary,
  InvestorGroup,
  InvestorGroupMember,
  KycStatus,
  InvestorStatus,
  InvestorType,
  AccreditationStatus
} from '@/types/investors'
import type { ServiceResult, PaginatedResponse } from '../../types/index'

export class InvestorService extends BaseService {
  private validationService: InvestorValidationService

  constructor() {
    super('Investor')
    this.validationService = new InvestorValidationService()
  }

  /**
   * Get all investors with filtering, pagination, and optional statistics
   */
  async getInvestors(options: InvestorQueryOptions = {}): Promise<PaginatedResponse<InvestorWithStats>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        investor_status,
        kyc_status,
        investor_type,
        accreditation_status,
        include_statistics = true,
        include_groups = false,
        include_cap_table = false,
        sort_by = 'created_at',
        sort_order = 'desc',
        created_from,
        created_to,
        kyc_expiry_from,
        kyc_expiry_to,
        has_wallet,
        compliance_score_min,
        investment_amount_min,
        investment_amount_max
      } = options

      // Build where clause
      const where: any = {}

      // Status filters
      if (investor_status && investor_status.length > 0) {
        where.investor_status = { in: investor_status }
      }

      if (kyc_status && kyc_status.length > 0) {
        where.kyc_status = { in: kyc_status }
      }

      if (investor_type && investor_type.length > 0) {
        where.investor_type = { in: investor_type }
      }

      if (accreditation_status && accreditation_status.length > 0) {
        where.accreditation_status = { in: accreditation_status }
      }

      // Search across multiple fields
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { tax_id_number: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Date filters
      if (created_from || created_to) {
        where.created_at = {}
        if (created_from) where.created_at.gte = created_from
        if (created_to) where.created_at.lte = created_to
      }

      if (kyc_expiry_from || kyc_expiry_to) {
        where.kyc_expiry_date = {}
        if (kyc_expiry_from) where.kyc_expiry_date.gte = kyc_expiry_from
        if (kyc_expiry_to) where.kyc_expiry_date.lte = kyc_expiry_to
      }

      // Wallet filter
      if (has_wallet !== undefined) {
        where.wallet_address = has_wallet ? { not: null } : null
      }

      // Build include clause
      const include: any = {}
      if (include_groups) {
        include.investor_group_members = {
          include: {
            investor_groups: true
          }
        }
      }

      if (include_cap_table) {
        include.cap_table_investors = {
          include: {
            cap_tables: {
              include: {
                projects: true
              }
            }
          }
        }
      }

      // Execute paginated query
      const { skip, take } = this.parseQueryOptions({ page, limit })
      const orderBy = { [sort_by]: sort_order }

      const [investors, total] = await Promise.all([
        this.db.investors.findMany({
          skip,
          take,
          where,
          include,
          orderBy
        }),
        this.db.investors.count({ where })
      ])

      // Enhance with statistics if requested
      const enhancedInvestors = include_statistics
        ? await Promise.all(investors.map((investor: any) => this.enhanceInvestorWithStats(investor)))
        : investors.map((investor: any) => this.mapToInvestorWithStats(investor))

      // Apply post-query filters that require computed data
      let filteredInvestors = enhancedInvestors

      if (compliance_score_min !== undefined) {
        filteredInvestors = filteredInvestors.filter(
          investor => (investor.compliance_score || 0) >= compliance_score_min
        )
      }

      if (investment_amount_min !== undefined || investment_amount_max !== undefined) {
        filteredInvestors = filteredInvestors.filter((investor: any) => {
          const totalInvested = investor.statistics?.total_invested || 0
          if (investment_amount_min !== undefined && totalInvested < investment_amount_min) {
            return false
          }
          if (investment_amount_max !== undefined && totalInvested > investment_amount_max) {
            return false
          }
          return true
        })
      }

      return this.paginatedResponse(filteredInvestors, total, page, limit)
    } catch (error) {
      this.logError('Failed to get investors', { error, options })
      throw error
    }
  }

  /**
   * Get investor by ID with optional related data
   */
  async getInvestorById(
    id: string,
    options: {
      include_statistics?: boolean
      include_groups?: boolean
      include_cap_table?: boolean
    } = {}
  ): Promise<ServiceResult<InvestorWithStats>> {
    try {
      const { include_statistics = true, include_groups = false, include_cap_table = false } = options

      const include: any = {}
      if (include_groups) {
        include.investor_group_members = {
          include: { investor_groups: true }
        }
      }

      if (include_cap_table) {
        include.cap_table_investors = {
          include: {
            cap_tables: {
              include: { projects: true }
            }
          }
        }
      }

      const investor = await this.db.investors.findUnique({
        where: { investor_id: id },
        include
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      const enhancedInvestor = include_statistics
        ? await this.enhanceInvestorWithStats(investor)
        : this.mapToInvestorWithStats(investor)

      return this.success(enhancedInvestor)
    } catch (error) {
      this.logError('Failed to get investor by ID', { error, id })
      return this.error('Failed to get investor', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new investor
   */
  async createInvestor(
    data: InvestorCreateRequest,
    options: { 
      validate_data?: boolean
      assign_to_groups?: string[]
      auto_kyc_check?: boolean 
    } = {}
  ): Promise<ServiceResult<InvestorCreationResult>> {
    try {
      const { validate_data = true, assign_to_groups = [], auto_kyc_check = true } = options

      // Validate required fields
      const validation = this.validateRequiredFields(data, ['name', 'email', 'type'])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Check for existing investor with same email
      const existingInvestor = await this.db.investors.findFirst({
        where: { email: data.email }
      })

      if (existingInvestor) {
        return this.error('Investor with this email already exists', 'CONFLICT', 409)
      }

      // Validate data if requested
      let validationResult: InvestorValidationResult | undefined
      if (validate_data) {
        const validationResponse = await this.validationService.validateInvestor(data)
        if (!validationResponse.success) {
          return this.error('Validation failed', 'VALIDATION_ERROR', 400)
        }
        validationResult = validationResponse.data!
      }

      // Create investor
      const investor = await this.db.investors.create({
        data: {
          name: data.name,
          email: data.email,
          type: data.type,
          investor_type: data.investor_type || 'individual',
          wallet_address: data.wallet_address,
          company: data.company,
          notes: data.notes,
          tax_residency: data.tax_residency,
          tax_id_number: data.tax_id_number,
          profile_data: data.profile_data || {},
          risk_assessment: data.risk_assessment || {},
          investment_preferences: data.investment_preferences || {},
          investor_status: 'pending',
          kyc_status: 'not_started',
          accreditation_status: 'not_started',
          onboarding_completed: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          investor_group_members: {
            include: { investor_groups: true }
          }
        }
      })

      // Assign to groups if specified
      const assignedGroups: InvestorGroup[] = []
      if (assign_to_groups.length > 0) {
        await Promise.all(
          assign_to_groups.map(async (groupId) => {
            await this.db.investor_group_members.create({
              data: {
                group_id: groupId,
                investor_id: investor.investor_id,
                created_at: new Date()
              }
            })

            // Get group details
            const group = await this.db.investor_groups.findUnique({
              where: { id: groupId }
            })
            if (group) {
              assignedGroups.push(group)
              
              // Update group member count
              await this.db.investor_groups.update({
                where: { id: groupId },
                data: { member_count: { increment: 1 } }
              })
            }
          })
        )
      }

      // Enhance with statistics
      const enhancedInvestor = await this.enhanceInvestorWithStats(investor)

      // Generate final validation result
      const finalValidation: InvestorValidationResult = validationResult || await this.validationService.validateInvestor(this.mapDatabaseInvestorToType(investor)).then(r => r.data) || {
        is_valid: false,
        missing_fields: [],
        validation_errors: [],
        compliance_issues: [],
        kyc_requirements: [],
        accreditation_requirements: [],
        completion_percentage: 0,
        business_rules_passed: false,
        required_documents: []
      }

      // Create audit log entry
      await this.createAuditEntry(investor.investor_id, 'CREATED', 'system', {
        original_data: data,
        assigned_groups: assignedGroups.map(g => g.id)
      })

      const result: InvestorCreationResult = {
        investor: enhancedInvestor,
        validation: finalValidation,
        groups_assigned: assignedGroups,
        compliance_status: {
          kyc_required: this.isKycRequired(investor),
          accreditation_required: this.isAccreditationRequired(investor),
          additional_documentation: this.getRequiredDocuments(investor)
        }
      }

      this.logInfo(
        'Investor created successfully',
        { investorId: investor.investor_id, groups: assignedGroups.length }
      )

      return this.success(result)
    } catch (error) {
      this.logError('Failed to create investor', { error, data })
      return this.error('Failed to create investor', 'DATABASE_ERROR')
    }
  }

  /**
   * Update existing investor
   */
  async updateInvestor(
    id: string,
    data: InvestorUpdateRequest,
    options: { 
      validate_data?: boolean
      create_audit_log?: boolean 
    } = {}
  ): Promise<ServiceResult<InvestorWithStats>> {
    try {
      const { validate_data = true, create_audit_log = true } = options

      // Check if investor exists
      const existingInvestor = await this.db.investors.findUnique({
        where: { investor_id: id }
      })

      if (!existingInvestor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Validate data if requested
      if (validate_data) {
        const validationResponse = await this.validationService.validateInvestorUpdate(data, this.mapDatabaseInvestorToType(existingInvestor))
        if (!validationResponse.success) {
          return this.error('Validation failed', 'VALIDATION_ERROR', 400)
        }
      }

      // Update investor
      const updatedInvestor = await this.db.investors.update({
        where: { investor_id: id },
        data: {
          ...data,
          updated_at: new Date()
        },
        include: {
          investor_group_members: {
            include: { investor_groups: true }
          }
        }
      })

      // Create audit log if requested
      if (create_audit_log) {
        await this.createAuditEntry(id, 'UPDATED', 'system', {
          changes: data,
          previous_state: existingInvestor
        })
      }

      // Enhance with statistics
      const enhancedInvestor = await this.enhanceInvestorWithStats(updatedInvestor)

      this.logInfo('Investor updated successfully', { investorId: id })
      return this.success(enhancedInvestor)
    } catch (error) {
      this.logError('Failed to update investor', { error, id, data })
      return this.error('Failed to update investor', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete investor (with cascade handling)
   */
  async deleteInvestor(id: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id: id }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Check for dependencies before deletion
      const [capTableEntries, groupMemberships] = await Promise.all([
        this.db.cap_table_investors.count({ where: { investor_id: id } }),
        this.db.investor_group_members.count({ where: { investor_id: id } })
      ])

      if (capTableEntries > 0) {
        return this.error(
          'Cannot delete investor with active cap table entries. Remove from cap tables first.',
          'DEPENDENCY_ERROR',
          409
        )
      }

      // Remove from all groups first
      if (groupMemberships > 0) {
        const groups = await this.db.investor_group_members.findMany({
          where: { investor_id: id },
          include: { investor_groups: true }
        })

        await this.db.investor_group_members.deleteMany({
          where: { investor_id: id }
        })

        // Update group member counts
        await Promise.all(
          groups.map((membership: any) =>
            this.db.investor_groups.update({
              where: { id: membership.group_id },
              data: { member_count: { decrement: 1 } }
            })
          )
        )
      }

      // Delete investor
      await this.db.investors.delete({
        where: { investor_id: id }
      })

      // Create audit log
      await this.createAuditEntry(id, 'DELETED', 'system', {
        deleted_investor: investor
      })

      this.logInfo('Investor deleted successfully', { investorId: id })
      return this.success(true)
    } catch (error) {
      this.logError('Failed to delete investor', { error, id })
      return this.error('Failed to delete investor', 'DATABASE_ERROR')
    }
  }

  /**
   * Bulk update investors
   */
  async bulkUpdateInvestors(
    request: BulkInvestorUpdateRequest
  ): Promise<ServiceResult<{
    successful: InvestorWithStats[]
    failed: Array<{ item: string, error: string, index: number }>
    summary: { total: number, success: number, failed: number }
  }>> {
    try {
      const { investor_ids, updates, options = {} } = request
      const { validate_before_update = true, create_audit_log = true } = options

      const successful: InvestorWithStats[] = []
      const failed: Array<{ item: string, error: string, index: number }> = []

      for (let i = 0; i < investor_ids.length; i++) {
        try {
          const investorId = investor_ids[i]
          if (!investorId) {
            failed.push({
              item: 'undefined',
              error: 'Investor ID is undefined',
              index: i
            })
            continue
          }

          const result = await this.updateInvestor(investorId, updates, {
            validate_data: validate_before_update,
            create_audit_log
          })

          if (result.success && result.data) {
            successful.push(result.data)
          } else {
            failed.push({
              item: investorId,
              error: result.error || 'Unknown error',
              index: i
            })
          }
        } catch (error) {
          failed.push({
            item: investor_ids[i] || 'undefined',
            error: error instanceof Error ? error.message : 'Unknown error',
            index: i
          })
        }
      }

      const summary = {
        total: investor_ids.length,
        success: successful.length,
        failed: failed.length
      }

      this.logInfo('Bulk investor update completed', summary)

      return this.success({
        successful,
        failed,
        summary
      })
    } catch (error) {
      this.logError('Failed to bulk update investors', { error, request })
      return this.error('Failed to bulk update investors', 'DATABASE_ERROR')
    }
  }

  /**
   * Get investor statistics
   */
  async getInvestorStatistics(id: string): Promise<ServiceResult<InvestorStatistics>> {
    try {
      const investor = await this.db.investors.findUnique({
        where: { investor_id: id }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      const statistics = await this.calculateInvestorStatistics(id)
      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get investor statistics', { error, id })
      return this.error('Failed to get investor statistics', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async enhanceInvestorWithStats(investor: any): Promise<InvestorWithStats> {
    const statistics = await this.calculateInvestorStatistics(investor.investor_id)
    const complianceScore = await this.calculateComplianceScore(investor)

    return {
      ...this.mapToInvestorWithStats(investor),
      statistics,
      compliance_score: complianceScore,
      total_investments: statistics.number_of_investments,
      active_projects: statistics.active_projects,
      last_activity: statistics.last_investment_date
    }
  }

  private mapToInvestorWithStats(investor: any): InvestorWithStats {
    return {
      investor_id: investor.investor_id,
      name: investor.name,
      email: investor.email,
      type: investor.type,
      wallet_address: investor.wallet_address,
      kyc_status: investor.kyc_status,
      lastUpdated: investor.lastUpdated,
      verification_details: investor.verification_details,
      created_at: investor.created_at,
      updated_at: investor.updated_at,
      kyc_expiry_date: investor.kyc_expiry_date,
      company: investor.company,
      notes: investor.notes,
      investor_status: investor.investor_status,
      investor_type: investor.investor_type,
      onboarding_completed: investor.onboarding_completed,
      risk_assessment: investor.risk_assessment,
      profile_data: investor.profile_data,
      accreditation_status: investor.accreditation_status,
      accreditation_expiry_date: investor.accreditation_expiry_date,
      accreditation_type: investor.accreditation_type,
      tax_residency: investor.tax_residency,
      tax_id_number: investor.tax_id_number,
      investment_preferences: investor.investment_preferences,
      last_compliance_check: investor.last_compliance_check,
      groups: investor.investor_group_members?.map((membership: any) => membership.investor_groups) || [],
      cap_table_entries: investor.cap_table_investors || []
    }
  }

  private async calculateInvestorStatistics(investorId: string): Promise<InvestorStatistics> {
    // Get cap table entries for this investor
    const capTableEntries = await this.db.cap_table_investors.findMany({
      where: { investor_id: investorId },
      include: {
        cap_tables: {
          include: { projects: true }
        }
      }
    })

    const totalInvested = capTableEntries.reduce((sum: number, entry: any) => 
      sum + (entry.amount_invested || 0), 0
    )

    const projects = capTableEntries.map((entry: any) => entry.cap_tables?.projects).filter(Boolean)
    const activeProjects = projects.filter((project: any) => 
      project && ['active', 'approved'].includes(project.status)
    ).length

    const completedProjects = projects.filter((project: any) =>
      project && project.status === 'completed'
    ).length

    const investments = capTableEntries.filter((entry: any) => entry.amount_invested > 0)
    const averageInvestment = investments.length > 0 ? totalInvested / investments.length : 0

    // Get investment dates
    const investmentDates = capTableEntries
      .map((entry: any) => entry.created_at)
      .filter(Boolean)
      .sort()

    return {
      total_invested: totalInvested,
      number_of_investments: investments.length,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      average_investment_size: averageInvestment,
      portfolio_value: totalInvested, // TODO: Calculate current value
      kyc_compliance_rate: 100, // TODO: Calculate based on requirements
      accreditation_status_current: true, // TODO: Check expiry dates
      first_investment_date: investmentDates[0] || undefined,
      last_investment_date: investmentDates[investmentDates.length - 1] || undefined,
      preferred_investment_types: [], // TODO: Extract from investment_preferences
      geographic_exposure: {}, // TODO: Calculate from project locations
      sector_exposure: {} // TODO: Calculate from project sectors
    }
  }

  private async calculateComplianceScore(investor: any): Promise<number> {
    let score = 0
    let maxScore = 100

    // KYC Status (30 points)
    switch (investor.kyc_status) {
      case 'approved':
        score += 30
        break
      case 'pending':
        score += 15
        break
      case 'not_started':
      case 'failed':
      case 'expired':
        score += 0
        break
    }

    // Accreditation Status (25 points)
    switch (investor.accreditation_status) {
      case 'approved':
        score += 25
        break
      case 'pending':
        score += 12
        break
      case 'not_started':
      case 'rejected':
      case 'expired':
        score += 0
        break
    }

    // Profile Completeness (20 points)
    const profileData = investor.profile_data || {}
    const requiredFields = ['phone', 'nationality', 'residence_country', 'date_of_birth']
    const completedFields = requiredFields.filter(field => profileData[field]).length
    score += (completedFields / requiredFields.length) * 20

    // Risk Assessment (15 points)
    const riskAssessment = investor.risk_assessment || {}
    const riskFields = ['risk_tolerance', 'investment_experience', 'liquidity_needs']
    const completedRiskFields = riskFields.filter(field => riskAssessment[field]).length
    score += (completedRiskFields / riskFields.length) * 15

    // Documentation (10 points)
    if (investor.verification_details && Object.keys(investor.verification_details).length > 0) {
      score += 10
    }

    return Math.round(score)
  }

  private isKycRequired(investor: any): boolean {
    // KYC is required for all investors above certain investment thresholds
    const profileData = investor.profile_data || {}
    const netWorth = profileData.net_worth || 0
    const annualIncome = profileData.annual_income || 0
    
    // Simple rule: require KYC for all investors
    return true
  }

  private isAccreditationRequired(investor: any): boolean {
    // Accreditation required for institutional investors or high net worth individuals
    if (investor.investor_type === 'institutional' || investor.investor_type === 'fund') {
      return true
    }

    const profileData = investor.profile_data || {}
    const netWorth = profileData.net_worth || 0
    const annualIncome = profileData.annual_income || 0

    // Accredited investor thresholds (US standards)
    return netWorth > 1000000 || annualIncome > 200000
  }

  private getRequiredDocuments(investor: any): string[] {
    const documents: string[] = []

    // Basic documents for all investors
    documents.push('Government-issued ID', 'Proof of address')

    // Additional documents based on investor type
    if (investor.investor_type === 'corporate') {
      documents.push('Articles of incorporation', 'Board resolution')
    }

    if (investor.investor_type === 'institutional') {
      documents.push('Institutional accreditation certificate', 'Investment committee authorization')
    }

    // Documents based on jurisdiction
    if (investor.tax_residency === 'US') {
      documents.push('W-9 Form')
    } else {
      documents.push('W-8 Form')
    }

    return documents
  }

  private async createAuditEntry(
    investorId: string,
    action: string,
    userId: string,
    details: any
  ): Promise<void> {
    try {
      // This would typically use an audit service or table
      // For now, just log the action
      this.logInfo('Investor audit entry created', {
        investorId,
        action,
        userId,
        details,
        timestamp: new Date()
      })
    } catch (error) {
      this.logError('Failed to create audit entry', { error, investorId, action })
      // Don't throw error as this shouldn't break the main operation
    }
  }

  /**
   * Maps database investor data to proper typed object for validation
   */
  private mapDatabaseInvestorToType(investor: any): Investor {
    return {
      investor_id: investor.investor_id,
      name: investor.name,
      email: investor.email,
      type: investor.type,
      wallet_address: investor.wallet_address,
      kyc_status: investor.kyc_status as KycStatus,
      lastUpdated: investor.lastUpdated,
      verification_details: investor.verification_details,
      created_at: investor.created_at,
      updated_at: investor.updated_at,
      kyc_expiry_date: investor.kyc_expiry_date,
      company: investor.company,
      notes: investor.notes,
      investor_status: investor.investor_status as InvestorStatus,
      investor_type: investor.investor_type as InvestorType,
      onboarding_completed: investor.onboarding_completed,
      risk_assessment: investor.risk_assessment,
      profile_data: investor.profile_data,
      accreditation_status: investor.accreditation_status as AccreditationStatus,
      accreditation_expiry_date: investor.accreditation_expiry_date,
      accreditation_type: investor.accreditation_type,
      tax_residency: investor.tax_residency,
      tax_id_number: investor.tax_id_number,
      investment_preferences: investor.investment_preferences,
      last_compliance_check: investor.last_compliance_check
    }
  }
}
