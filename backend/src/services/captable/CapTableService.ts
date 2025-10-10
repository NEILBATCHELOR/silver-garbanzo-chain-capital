// Captable Service - Main CRUD operations
// Provides comprehensive captable management functionality

import { BaseService } from '../BaseService'
import { PrismaClient, Prisma } from '@/infrastructure/database/generated/index'
import { logger } from '@/utils/logger'
import {
  CapTable,
  Investor,
  Subscription,
  TokenAllocation,
  Distribution,
  InvestorApproval,
  CapTableWithStats,
  InvestorWithSubscription,
  SubscriptionWithDetails,
  TokenAllocationWithDetails,
  DistributionWithDetails,
  CapTableCreateRequest,
  CapTableUpdateRequest,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  SubscriptionCreateRequest,
  SubscriptionUpdateRequest,
  TokenAllocationCreateRequest,
  TokenAllocationUpdateRequest,
  DistributionCreateRequest,
  DistributionUpdateRequest,
  InvestorApprovalCreateRequest,
  InvestorApprovalUpdateRequest,
  CapTableQueryOptions,
  InvestorQueryOptions,
  SubscriptionQueryOptions,
  TokenAllocationQueryOptions,
  DistributionQueryOptions,
  BulkSubscriptionCreateRequest,
  BulkSubscriptionUpdateRequest,
  BulkTokenAllocationCreateRequest,
  BulkTokenAllocationUpdateRequest,
  BulkDistributionCreateRequest,
  ServiceResult,
  PaginatedResponse,
  BatchResult
} from '@/types/captable-service'

export class CapTableService extends BaseService {
  constructor() {
    super('CapTable')
  }

  // ============================================================================
  // CAP TABLE OPERATIONS
  // ============================================================================

  /**
   * Create a new cap table
   */
  async createCapTable(
    data: CapTableCreateRequest,
    userId?: string
  ): Promise<ServiceResult<CapTableWithStats>> {
    try {
      this.logInfo('Creating cap table', { data, userId })

      // Check if project exists
      const project = await this.db.projects.findUnique({
        where: { id: data.projectId }
      })

      if (!project) {
        return this.error('Project not found', 'PROJECT_NOT_FOUND', 404)
      }

      // Check if cap table already exists for this project
      const existingCapTable = await this.db.cap_tables.findFirst({
        where: { project_id: data.projectId }
      })

      if (existingCapTable) {
        return this.error('Cap table already exists for this project', 'CAP_TABLE_EXISTS', 409)
      }

      // Create cap table
      const capTable = await this.db.cap_tables.create({
        data: {
          project_id: data.projectId,
          name: data.name,
          description: data.description
        }
      })

      // Enhance with statistics
      const enhancedCapTable = await this.enhanceCapTableWithStats(capTable)

      this.logInfo('Cap table created successfully', { capTableId: capTable.id })
      return this.success(enhancedCapTable, 'Cap table created successfully')

    } catch (error) {
      this.logError('Error creating cap table', { error, data })
      return this.error('Failed to create cap table', 'CREATE_FAILED')
    }
  }

  /**
   * Get cap table by ID
   */
  async getCapTable(
    id: string,
    options: { includeStats?: boolean; includeRelated?: boolean } = {}
  ): Promise<ServiceResult<CapTableWithStats>> {
    try {
      this.logInfo('Getting cap table', { id, options })

      const capTable = await this.db.cap_tables.findUnique({
        where: { id }
      })

      if (!capTable) {
        return this.error('Cap table not found', 'CAP_TABLE_NOT_FOUND', 404)
      }

      // Enhance with statistics if requested
      const enhancedCapTable = options.includeStats
        ? await this.enhanceCapTableWithStats(capTable)
        : capTable as CapTableWithStats

      return this.success(enhancedCapTable)

    } catch (error) {
      this.logError('Error getting cap table', { error, id })
      return this.error('Failed to get cap table', 'GET_FAILED')
    }
  }

  /**
   * Get cap table by project ID
   */
  async getCapTableByProject(
    projectId: string,
    options: { includeStats?: boolean; includeRelated?: boolean } = {}
  ): Promise<ServiceResult<CapTableWithStats>> {
    try {
      this.logInfo('Getting cap table by project', { projectId, options })

      const capTable = await this.db.cap_tables.findFirst({
        where: { project_id: projectId }
      })

      if (!capTable) {
        // Auto-create cap table if it doesn't exist
        const createResult = await this.createCapTable({
          projectId,
          name: `Cap Table for Project ${projectId}`,
          description: 'Auto-generated cap table'
        })

        if (!createResult.success) {
          return createResult
        }

        return this.success(createResult.data!)
      }

      // Enhance with statistics if requested
      const enhancedCapTable = options.includeStats
        ? await this.enhanceCapTableWithStats(capTable)
        : capTable as CapTableWithStats

      return this.success(enhancedCapTable)

    } catch (error) {
      this.logError('Error getting cap table by project', { error, projectId })
      return this.error('Failed to get cap table', 'GET_FAILED')
    }
  }

  /**
   * Update cap table
   */
  async updateCapTable(
    id: string,
    data: CapTableUpdateRequest,
    userId?: string
  ): Promise<ServiceResult<CapTableWithStats>> {
    try {
      this.logInfo('Updating cap table', { id, data, userId })

      const capTable = await this.db.cap_tables.update({
        where: { id },
        data
      })

      const enhancedCapTable = await this.enhanceCapTableWithStats(capTable)

      this.logInfo('Cap table updated successfully', { capTableId: id })
      return this.success(enhancedCapTable, 'Cap table updated successfully')

    } catch (error: any) {
      if (error.code === 'P2025') {
        return this.error('Cap table not found', 'CAP_TABLE_NOT_FOUND', 404)
      }
      this.logError('Error updating cap table', { error, id, data })
      return this.error('Failed to update cap table', 'UPDATE_FAILED')
    }
  }

  /**
   * Delete cap table
   */
  async deleteCapTable(id: string, userId?: string): Promise<ServiceResult<boolean>> {
    try {
      this.logInfo('Deleting cap table', { id, userId })

      // Check if cap table exists
      const capTable = await this.db.cap_tables.findUnique({
        where: { id }
      })

      if (!capTable) {
        return this.error('Cap table not found', 'CAP_TABLE_NOT_FOUND', 404)
      }

      await this.db.cap_tables.delete({
        where: { id }
      })

      this.logInfo('Cap table deleted successfully', { capTableId: id })
      return this.success(true, 'Cap table deleted successfully')

    } catch (error) {
      this.logError('Error deleting cap table', { error, id })
      return this.error('Failed to delete cap table', 'DELETE_FAILED')
    }
  }

  // ============================================================================
  // INVESTOR OPERATIONS
  // ============================================================================

  /**
   * Create a new investor
   */
  async createInvestor(
    data: InvestorCreateRequest,
    userId?: string
  ): Promise<ServiceResult<InvestorWithSubscription>> {
    try {
      this.logInfo('Creating investor', { data: { ...data, email: '[REDACTED]' }, userId })

      // Check if investor already exists
      const existingInvestor = await this.db.investors.findFirst({
        where: {
          OR: [
            { investor_id: data.investorId },
            { email: data.email }
          ]
        }
      })

      if (existingInvestor) {
        return this.error('Investor already exists', 'INVESTOR_EXISTS', 409)
      }

      const investor = await this.db.investors.create({
        data: {
          investor_id: data.investorId,
          name: data.name,
          email: data.email,
          type: data.investorType || 'individual', // Map investorType to type field
          wallet_address: data.walletAddress,
          kyc_status: data.kycStatus || 'not_started',
          accreditation_status: data.accreditationStatus,
          tax_id_number: data.taxIdNumber,
          tax_residency: data.residenceCountry, // Map to tax_residency field
          onboarding_completed: false, // Default value
          // Store additional fields in profile_data JSON field
          profile_data: {
            phone: data.phone, // Store phone in profile_data
            nationality: data.nationality,
            dateOfBirth: data.dateOfBirth,
            riskTolerance: data.riskTolerance,
            investmentExperience: data.investmentExperience,
            employmentStatus: data.employmentStatus,
            annualIncome: data.annualIncome,
            netWorth: data.netWorth,
            sourceOfFunds: data.sourceOfFunds,
            investmentObjectives: data.investmentObjectives,
            complianceNotes: data.complianceNotes
          }
        }
      })

      const enhancedInvestor = await this.enhanceInvestorWithSubscriptions(investor)

      this.logInfo('Investor created successfully', { investorId: investor.investor_id })
      return this.success(enhancedInvestor, 'Investor created successfully')

    } catch (error) {
      this.logError('Error creating investor', { error, data: { ...data, email: '[REDACTED]' } })
      return this.error('Failed to create investor', 'CREATE_FAILED')
    }
  }

  /**
   * Get all investors with filtering and pagination
   */
  async getInvestors(options: InvestorQueryOptions = {}): Promise<ServiceResult<PaginatedResponse<InvestorWithSubscription>>> {
    try {
      this.logInfo('Getting investors', { options })

      const {
        page = 1,
        limit = 20,
        search,
        kycStatus,
        investorType,
        isActive,
        onboardingCompleted,
        includeSubscriptions,
        includeAllocations,
        includeDistributions,
        includeApprovals,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { investor_id: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (kycStatus && kycStatus.length > 0) {
        where.kyc_status = { in: kycStatus }
      }

      if (investorType && investorType.length > 0) {
        where.investor_type = { in: investorType }
      }

      if (isActive !== undefined) {
        where.is_active = isActive
      }

      if (onboardingCompleted !== undefined) {
        where.onboarding_completed = onboardingCompleted
      }

      // Get total count
      const total = await this.db.investors.count({ where })

      // Get investors
      const investors = await this.db.investors.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      })

      // Enhance with subscription data
      const enhancedInvestors = await Promise.all(
        investors.map((investor: any) => this.enhanceInvestorWithSubscriptions(investor))
      )

      const paginatedResponse = this.paginatedResponse(
        enhancedInvestors,
        total,
        page,
        limit,
        'Investors retrieved successfully'
      )

      return this.success(paginatedResponse)

    } catch (error) {
      this.logError('Error getting investors', { error, options })
      return this.error('Failed to get investors', 'GET_FAILED')
    }
  }

  /**
   * Get investor by ID
   */
  async getInvestor(
    id: string,
    options: {
      includeSubscriptions?: boolean
      includeAllocations?: boolean
      includeDistributions?: boolean
      includeApprovals?: boolean
    } = {}
  ): Promise<ServiceResult<InvestorWithSubscription>> {
    try {
      this.logInfo('Getting investor', { id, options })

      const investor = await this.db.investors.findUnique({
        where: { investor_id: id }
      })

      if (!investor) {
        return this.error('Investor not found', 'INVESTOR_NOT_FOUND', 404)
      }

      const enhancedInvestor = await this.enhanceInvestorWithSubscriptions(investor)
      return this.success(enhancedInvestor)

    } catch (error) {
      this.logError('Error getting investor', { error, id })
      return this.error('Failed to get investor', 'GET_FAILED')
    }
  }

  /**
   * Update investor
   */
  async updateInvestor(
    id: string,
    data: InvestorUpdateRequest,
    userId?: string
  ): Promise<ServiceResult<InvestorWithSubscription>> {
    try {
      this.logInfo('Updating investor', { id, data: { ...data, email: '[REDACTED]' }, userId })

      const updateData: any = {}
      
      // Map camelCase to snake_case for database fields
      if (data.name !== undefined) updateData.name = data.name
      if (data.email !== undefined) updateData.email = data.email
      // Phone should be stored in profile_data JSON field
      if (data.walletAddress !== undefined) updateData.wallet_address = data.walletAddress
      if (data.kycStatus !== undefined) updateData.kyc_status = data.kycStatus
      if (data.accreditationStatus !== undefined) updateData.accreditation_status = data.accreditationStatus
      if (data.taxIdNumber !== undefined) updateData.tax_id_number = data.taxIdNumber
      if (data.residenceCountry !== undefined) updateData.tax_residency = data.residenceCountry  // Map to tax_residency
      if (data.investorType !== undefined) updateData.investor_type = data.investorType
      if (data.isActive !== undefined) updateData.is_active = data.isActive
      if (data.onboardingCompleted !== undefined) updateData.onboarding_completed = data.onboardingCompleted

      // Store additional fields in profile_data JSON field
      const profileFields: (keyof InvestorUpdateRequest)[] = ['phone', 'nationality', 'dateOfBirth', 'riskTolerance', 
                           'investmentExperience', 'employmentStatus', 'annualIncome', 
                           'netWorth', 'sourceOfFunds', 'investmentObjectives', 'complianceNotes']
      
      const profileData: any = {}
      profileFields.forEach(field => {
        if (data[field] !== undefined) {
          profileData[field] = data[field]
        }
      })
      
      if (Object.keys(profileData).length > 0) {
        updateData.profile_data = profileData
      }

      const investor = await this.db.investors.update({
        where: { investor_id: id },
        data: updateData
      })

      const enhancedInvestor = await this.enhanceInvestorWithSubscriptions(investor)

      this.logInfo('Investor updated successfully', { investorId: id })
      return this.success(enhancedInvestor, 'Investor updated successfully')

    } catch (error: any) {
      if (error.code === 'P2025') {
        return this.error('Investor not found', 'INVESTOR_NOT_FOUND', 404)
      }
      this.logError('Error updating investor', { error, id, data })
      return this.error('Failed to update investor', 'UPDATE_FAILED')
    }
  }

  /**
   * Delete investor
   */
  async deleteInvestor(id: string, userId?: string): Promise<ServiceResult<boolean>> {
    try {
      this.logInfo('Deleting investor', { id, userId })

      await this.db.investors.delete({
        where: { investor_id: id }
      })

      this.logInfo('Investor deleted successfully', { investorId: id })
      return this.success(true, 'Investor deleted successfully')

    } catch (error: any) {
      if (error.code === 'P2025') {
        return this.error('Investor not found', 'INVESTOR_NOT_FOUND', 404)
      }
      this.logError('Error deleting investor', { error, id })
      return this.error('Failed to delete investor', 'DELETE_FAILED')
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  /**
   * Create a new subscription
   */
  async createSubscription(
    data: SubscriptionCreateRequest,
    userId?: string
  ): Promise<ServiceResult<SubscriptionWithDetails>> {
    try {
      this.logInfo('Creating subscription', { data, userId })

      // Validate project exists
      const project = await this.db.projects.findUnique({
        where: { id: data.projectId }
      })

      if (!project) {
        return this.error('Project not found', 'PROJECT_NOT_FOUND', 404)
      }

      // Validate investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id: data.investorId }
      })

      if (!investor) {
        return this.error('Investor not found', 'INVESTOR_NOT_FOUND', 404)
      }

      const subscription = await this.db.subscriptions.create({
        data: {
          project_id: data.projectId,
          investor_id: data.investorId,
          subscription_id: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          fiat_amount: data.subscriptionAmount,
          currency: 'USD', // Default to USD since currency field is required
          subscription_date: data.subscriptionDate || new Date(),
          notes: data.notes ? `Payment Method: ${data.paymentMethod || 'Not specified'}\nPayment Status: ${data.paymentStatus || 'Pending'}\n${data.notes}` : `Payment Method: ${data.paymentMethod || 'Not specified'}\nPayment Status: ${data.paymentStatus || 'Pending'}`
        }
      })

      const enhancedSubscription = await this.enhanceSubscriptionWithDetails(subscription)

      this.logInfo('Subscription created successfully', { subscriptionId: subscription.id })
      return this.success(enhancedSubscription, 'Subscription created successfully')

    } catch (error) {
      this.logError('Error creating subscription', { error, data })
      return this.error('Failed to create subscription', 'CREATE_FAILED')
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Enhance cap table with computed statistics
   */
  private async enhanceCapTableWithStats(capTable: any): Promise<CapTableWithStats> {
    try {
      // Get related data for statistics
      const [subscriptions, tokenAllocations, distributions] = await Promise.all([
        this.db.subscriptions.findMany({
          where: { project_id: capTable.project_id }
        }),
        this.db.token_allocations.findMany({
          where: { project_id: capTable.project_id }
        }),
        this.db.distributions.findMany({
          where: { project_id: capTable.project_id }
        })
      ])

      // Calculate statistics
      const totalInvestors = new Set(subscriptions.map((s: any) => s.investor_id)).size
      const totalRaised = subscriptions.reduce((sum: any, s: any) => sum.add(s.fiat_amount), new Prisma.Decimal(0))
      const totalTokens = tokenAllocations.reduce((sum: any, a: any) => sum.add(a.token_amount), new Prisma.Decimal(0))
      const totalDistributed = distributions.reduce((sum: any, d: any) => sum.add(d.token_amount), new Prisma.Decimal(0))

      const completionPercentage = totalTokens.greaterThan(0)
        ? totalDistributed.dividedBy(totalTokens).mul(100).toNumber()
        : 0

      return {
        ...capTable,
        totalInvestors,
        totalRaised,
        totalTokens,
        totalDistributed,
        completionPercentage
      }
    } catch (error) {
      this.logError('Error enhancing cap table with stats', { error, capTableId: capTable.id })
      return {
        ...capTable,
        totalInvestors: 0,
        totalRaised: new Prisma.Decimal(0),
        totalTokens: new Prisma.Decimal(0),
        totalDistributed: new Prisma.Decimal(0),
        completionPercentage: 0
      }
    }
  }

  /**
   * Enhance investor with subscription data
   */
  private async enhanceInvestorWithSubscriptions(investor: any): Promise<InvestorWithSubscription> {
    try {
      const [subscriptions, tokenAllocations, distributions] = await Promise.all([
        this.db.subscriptions.findMany({
          where: { investor_id: investor.investor_id }
        }),
        this.db.token_allocations.findMany({
          where: { investor_id: investor.investor_id }
        }),
        this.db.distributions.findMany({
          where: { investor_id: investor.investor_id }
        })
      ])

      const totalSubscribed = subscriptions.reduce((sum: any, s: any) => sum.add(s.fiat_amount), new Prisma.Decimal(0))
      const totalAllocated = tokenAllocations.reduce((sum: any, a: any) => sum.add(a.token_amount), new Prisma.Decimal(0))
      const totalDistributed = distributions.reduce((sum: any, d: any) => sum.add(d.token_amount), new Prisma.Decimal(0))

      return {
        ...investor,
        totalSubscribed,
        totalAllocated,
        totalDistributed,
        subscriptionCount: subscriptions.length,
        allocationCount: tokenAllocations.length,
        distributionCount: distributions.length
      }
    } catch (error) {
      this.logError('Error enhancing investor with subscriptions', { error, investorId: investor.investor_id })
      return {
        ...investor,
        totalSubscribed: new Prisma.Decimal(0),
        totalAllocated: new Prisma.Decimal(0),
        totalDistributed: new Prisma.Decimal(0),
        subscriptionCount: 0,
        allocationCount: 0,
        distributionCount: 0
      }
    }
  }

  /**
   * Enhance subscription with details
   */
  private async enhanceSubscriptionWithDetails(subscription: any): Promise<SubscriptionWithDetails> {
    try {
      const tokenAllocations = await this.db.token_allocations.findMany({
        where: { subscription_id: subscription.id }
      })
      
      const totalAllocated = tokenAllocations.reduce((sum: any, a: any) => sum.add(a.token_amount), new Prisma.Decimal(0))
      const remainingToAllocate = subscription.fiat_amount.minus(totalAllocated)
      const allocationPercentage = subscription.fiat_amount.greaterThan(0)
        ? totalAllocated.dividedBy(subscription.fiat_amount).mul(100).toNumber()
        : 0
      const isFullyAllocated = remainingToAllocate.lessThanOrEqualTo(0)

      return {
        ...subscription,
        allocationPercentage,
        remainingToAllocate,
        isFullyAllocated
      }
    } catch (error) {
      this.logError('Error enhancing subscription with details', { error, subscriptionId: subscription.id })
      return {
        ...subscription,
        allocationPercentage: 0,
        remainingToAllocate: new Prisma.Decimal(0),
        isFullyAllocated: false
      }
    }
  }
}
