/**
 * Subscription Service
 * Main service for subscription CRUD operations, compliance checking,
 * and workflow management
 */

import { BaseService } from '../BaseService'
import type {
  InvestmentSubscription,
  InvestmentSubscriptionWithDetails,
  InvestmentSubscriptionCreateRequest,
  InvestmentSubscriptionUpdateRequest,
  InvestmentSubscriptionQueryOptions,
  InvestmentSubscriptionStatistics,
  InvestmentSubscriptionCreationResult,
  InvestmentSubscriptionComplianceStatus,
  InvestmentSubscriptionWorkflow,
  InvestmentSubscriptionWorkflowStage,
  Currency,
  InvestmentSubscriptionStatus
} from '../../types/subscriptions'
import type { ServiceResult, PaginatedResponse } from '../../types/index'
import {
  decimalToNumber,
  nullToUndefined
} from '../../utils/decimal-helpers'

export class SubscriptionService extends BaseService {
  
  constructor() {
    super('Subscription')
  }

  /**
   * Convert database subscription record to API response format
   */
  private convertSubscriptionRecord(record: any): InvestmentSubscription {
    return {
      id: record.id,
      investor_id: record.investor_id,
      subscription_id: record.subscription_id,
      fiat_amount: decimalToNumber(record.fiat_amount),
      currency: record.currency,
      confirmed: record.confirmed,
      allocated: record.allocated,
      distributed: record.distributed,
      notes: nullToUndefined(record.notes),
      subscription_date: nullToUndefined(record.subscription_date),
      created_at: nullToUndefined(record.created_at),
      updated_at: nullToUndefined(record.updated_at),
      project_id: nullToUndefined(record.project_id)
    }
  }

  /**
   * Get all subscriptions with filtering, pagination, and optional details
   */
  async getSubscriptions(options: InvestmentSubscriptionQueryOptions = {}): Promise<PaginatedResponse<InvestmentSubscriptionWithDetails>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        investor_id,
        project_id,
        currency,
        status,
        confirmed,
        allocated,
        distributed,
        amount_min,
        amount_max,
        created_from,
        created_to,
        subscription_date_from,
        subscription_date_to,
        include_statistics = true,
        include_investor = true,
        include_project = true,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options

      // Build where clause
      const where: any = {}

      // Investor and project filters
      if (investor_id) {
        where.investor_id = investor_id
      }

      if (project_id) {
        where.project_id = project_id
      }

      // Currency filters
      if (currency && currency.length > 0) {
        where.currency = { in: currency }
      }

      // Status filters
      if (confirmed !== undefined) {
        where.confirmed = confirmed
      }

      if (allocated !== undefined) {
        where.allocated = allocated
      }

      if (distributed !== undefined) {
        where.distributed = distributed
      }

      // Amount filters
      if (amount_min !== undefined || amount_max !== undefined) {
        where.fiat_amount = {}
        if (amount_min !== undefined) where.fiat_amount.gte = amount_min
        if (amount_max !== undefined) where.fiat_amount.lte = amount_max
      }

      // Date filters
      if (created_from || created_to) {
        where.created_at = {}
        if (created_from) where.created_at.gte = created_from
        if (created_to) where.created_at.lte = created_to
      }

      if (subscription_date_from || subscription_date_to) {
        where.subscription_date = {}
        if (subscription_date_from) where.subscription_date.gte = subscription_date_from
        if (subscription_date_to) where.subscription_date.lte = subscription_date_to
      }

      // Search across multiple fields
      if (search) {
        where.OR = [
          { subscription_id: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { currency: { contains: search, mode: 'insensitive' } },
          {
            investors: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        ]
      }

      // Build include clause
      const include: any = {}
      if (include_investor) {
        include.investors = {
          select: {
            investor_id: true,
            name: true,
            email: true,
            investor_type: true
          }
        }
      }

      if (include_project) {
        include.projects = {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }

      // Execute paginated query
      const { skip, take } = this.parseQueryOptions({ page, limit })
      const orderBy = { [sort_by]: sort_order }

      const [subscriptions, total] = await Promise.all([
        this.db.subscriptions.findMany({
          skip,
          take,
          where,
          include,
          orderBy
        }),
        this.db.subscriptions.count({ where })
      ])

      // Enhance with additional details if requested
      const enhancedSubscriptions = include_statistics
        ? await Promise.all(subscriptions.map((subscription: any) => this.enhanceSubscriptionWithDetails(subscription)))
        : subscriptions.map((subscription: any) => this.mapToSubscriptionWithDetails(subscription))

      return this.paginatedResponse(enhancedSubscriptions, total, page, limit)
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get subscriptions')
      throw error
    }
  }

  /**
   * Get subscription by ID with optional related data
   */
  async getSubscriptionById(
    id: string,
    options: {
      include_statistics?: boolean
      include_investor?: boolean
      include_project?: boolean
      include_workflow?: boolean
    } = {}
  ): Promise<ServiceResult<InvestmentSubscriptionWithDetails>> {
    try {
      const { 
        include_statistics = true, 
        include_investor = true, 
        include_project = true,
        include_workflow = false
      } = options

      const include: any = {}
      if (include_investor) {
        include.investors = {
          select: {
            investor_id: true,
            name: true,
            email: true,
            investor_type: true
          }
        }
      }

      if (include_project) {
        include.projects = {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }

      const subscription = await this.db.subscriptions.findUnique({
        where: { id },
        include
      })

      if (!subscription) {
        return this.error('Subscription not found', 'NOT_FOUND', 404)
      }

      const enhancedSubscription = include_statistics
        ? await this.enhanceSubscriptionWithDetails(subscription)
        : this.mapToSubscriptionWithDetails(subscription)

      return this.success(enhancedSubscription)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get subscription by ID')
      return this.error('Failed to get subscription', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new subscription
   */
  async createSubscription(
    data: InvestmentSubscriptionCreateRequest,
    options: {
      auto_allocate?: boolean
      compliance_check?: boolean
      generate_workflow?: boolean
    } = {}
  ): Promise<ServiceResult<InvestmentSubscriptionCreationResult>> {
    try {
      const { auto_allocate = false, compliance_check = true, generate_workflow = true } = options

      // Validate required fields
      const validation = this.validateRequiredFields(data, ['investor_id', 'fiat_amount', 'currency'])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Check if investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id: data.investor_id }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Check if project exists (if specified)
      if (data.project_id) {
        const project = await this.db.projects.findUnique({
          where: { id: data.project_id }
        })

        if (!project) {
          return this.error('Project not found', 'NOT_FOUND', 404)
        }
      }

      // Generate subscription ID
      const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Create subscription
      const subscription = await this.db.subscriptions.create({
        data: {
          investor_id: data.investor_id,
          subscription_id: subscriptionId,
          fiat_amount: data.fiat_amount,
          currency: data.currency,
          confirmed: false,
          allocated: auto_allocate,
          distributed: false,
          notes: data.notes,
          subscription_date: data.subscription_date || new Date(),
          project_id: data.project_id,
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          investors: {
            select: {
              investor_id: true,
              name: true,
              email: true,
              investor_type: true
            }
          },
          projects: data.project_id ? {
            select: {
              id: true,
              name: true,
              status: true
            }
          } : undefined
        }
      })

      // Enhance with statistics and details
      const enhancedSubscription = await this.enhanceSubscriptionWithDetails(subscription)

      // Perform compliance check if requested
      const complianceStatus = compliance_check 
        ? await this.checkSubscriptionCompliance(subscription.id)
        : this.getDefaultComplianceStatus()

      // Generate workflow if requested
      const workflow = generate_workflow
        ? await this.createSubscriptionWorkflow(subscription.id)
        : this.getDefaultWorkflow(subscription.id)

      const result: InvestmentSubscriptionCreationResult = {
        subscription: enhancedSubscription,
        validation: {
          is_valid: true,
          validation_errors: [],
          compliance_issues: complianceStatus.overall_status === 'compliant' ? [] : complianceStatus.issues,
          business_rules_passed: true,
          required_approvals: [],
          estimated_processing_time: this.estimateProcessingTime(data),
          risk_score: this.calculateRiskScore(data, investor),
          recommendations: [],
          blocking_issues: [],
          warning_issues: []
        },
        compliance_status: complianceStatus,
        workflow,
        next_steps: this.generateNextSteps(subscription, complianceStatus)
      }

      this.logger.info(
        { subscriptionId: subscription.id, investorId: data.investor_id },
        'Subscription created successfully'
      )

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create subscription')
      return this.error('Failed to create subscription', 'DATABASE_ERROR')
    }
  }

  /**
   * Update existing subscription
   */
  async updateSubscription(
    id: string,
    data: InvestmentSubscriptionUpdateRequest,
    options: {
      compliance_check?: boolean
      update_workflow?: boolean
    } = {}
  ): Promise<ServiceResult<InvestmentSubscriptionWithDetails>> {
    try {
      const { compliance_check = true, update_workflow = true } = options

      // Check if subscription exists
      const existingSubscription = await this.db.subscriptions.findUnique({
        where: { id }
      })

      if (!existingSubscription) {
        return this.error('Subscription not found', 'NOT_FOUND', 404)
      }

      // Update subscription
      const updatedSubscription = await this.db.subscriptions.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date()
        },
        include: {
          investors: {
            select: {
              investor_id: true,
              name: true,
              email: true,
              investor_type: true
            }
          },
          projects: existingSubscription.project_id ? {
            select: {
              id: true,
              name: true,
              status: true
            }
          } : undefined
        }
      })

      // Enhance with statistics and details
      const enhancedSubscription = await this.enhanceSubscriptionWithDetails(updatedSubscription)

      this.logger.info({ subscriptionId: id }, 'Subscription updated successfully')
      return this.success(enhancedSubscription)
    } catch (error) {
      this.logger.error({ error, id, data }, 'Failed to update subscription')
      return this.error('Failed to update subscription', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(id: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if subscription exists
      const subscription = await this.db.subscriptions.findUnique({
        where: { id }
      })

      if (!subscription) {
        return this.error('Subscription not found', 'NOT_FOUND', 404)
      }

      // Check if subscription can be deleted (business rules)
      if (subscription.distributed) {
        return this.error(
          'Cannot delete distributed subscription. Contact administrator.',
          'BUSINESS_RULE_VIOLATION',
          409
        )
      }

      // Delete subscription
      await this.db.subscriptions.delete({
        where: { id }
      })

      this.logger.info({ subscriptionId: id }, 'Subscription deleted successfully')
      return this.success(true)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete subscription')
      return this.error('Failed to delete subscription', 'DATABASE_ERROR')
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStatistics(id: string): Promise<ServiceResult<InvestmentSubscriptionStatistics>> {
    try {
      const subscription = await this.db.subscriptions.findUnique({
        where: { id }
      })

      if (!subscription) {
        return this.error('Subscription not found', 'NOT_FOUND', 404)
      }

      const statistics = await this.calculateSubscriptionStatistics(id)
      return this.success(statistics)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get subscription statistics')
      return this.error('Failed to get subscription statistics', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async enhanceSubscriptionWithDetails(subscription: any): Promise<InvestmentSubscriptionWithDetails> {
    const statistics = await this.calculateSubscriptionStatistics(subscription.id)
    const complianceStatus = await this.checkSubscriptionCompliance(subscription.id)

    return {
      ...this.mapToSubscriptionWithDetails(subscription),
      statistics,
      compliance_status: complianceStatus
    }
  }

  private mapToSubscriptionWithDetails(subscription: any): InvestmentSubscriptionWithDetails {
    return {
      id: subscription.id,
      investor_id: subscription.investor_id,
      subscription_id: subscription.subscription_id,
      fiat_amount: decimalToNumber(subscription.fiat_amount),
      currency: subscription.currency,
      confirmed: subscription.confirmed,
      allocated: subscription.allocated,
      distributed: subscription.distributed,
      notes: nullToUndefined(subscription.notes),
      subscription_date: nullToUndefined(subscription.subscription_date),
      created_at: nullToUndefined(subscription.created_at),
      updated_at: nullToUndefined(subscription.updated_at),
      project_id: nullToUndefined(subscription.project_id),
      investor: subscription.investors ? {
        investor_id: subscription.investors.investor_id,
        name: subscription.investors.name,
        email: subscription.investors.email,
        investor_type: subscription.investors.investor_type
      } : undefined,
      project: subscription.projects ? {
        id: subscription.projects.id,
        name: subscription.projects.name,
        status: subscription.projects.status
      } : undefined
    }
  }

  private async calculateSubscriptionStatistics(subscriptionId: string): Promise<InvestmentSubscriptionStatistics> {
    // For individual subscription, return basic stats
    const subscription = await this.db.subscriptions.findUnique({
      where: { id: subscriptionId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const amount = decimalToNumber(subscription.fiat_amount)
    
    return {
      total_amount: amount,
      currency_breakdown: { [subscription.currency as Currency]: amount } as Record<Currency, number>,
      confirmed_amount: subscription.confirmed ? amount : 0,
      allocated_amount: subscription.allocated ? amount : 0,
      distributed_amount: subscription.distributed ? amount : 0,
      pending_amount: subscription.confirmed ? 0 : amount,
      average_subscription_size: amount,
      investor_count: 1,
      project_count: subscription.project_id ? 1 : 0,
      completion_rate: this.calculateCompletionRate(subscription),
      first_subscription_date: nullToUndefined(subscription.subscription_date),
      last_subscription_date: nullToUndefined(subscription.subscription_date)
    }
  }

  private async checkSubscriptionCompliance(subscriptionId: string): Promise<InvestmentSubscriptionComplianceStatus> {
    const subscription = await this.db.subscriptions.findUnique({
      where: { id: subscriptionId },
      include: {
        investors: true
      }
    })

    if (!subscription || !subscription.investors) {
      return this.getDefaultComplianceStatus()
    }

    const investor = subscription.investors
    const issues: string[] = []
    const requiredActions: string[] = []

    // Check KYC status
    const kycVerified = investor.kyc_status === 'approved'
    if (!kycVerified) {
      issues.push('Investor KYC not approved')
      requiredActions.push('Complete KYC verification')
    }

    // Check accreditation
    const accreditationVerified = investor.accreditation_status === 'approved'
    if (!accreditationVerified && this.requiresAccreditation(subscription)) {
      issues.push('Investor accreditation required')
      requiredActions.push('Obtain accreditation verification')
    }

    // Check AML status (simplified)
    const amlCleared = investor.investor_status !== 'blocked'

    // Check investment limits (simplified)
    const investmentLimitsOk = true // TODO: Implement actual limit checking

    // Check regulatory approval (simplified)
    const regulatoryApproved = true // TODO: Implement regulatory checking

    // Check document requirements
    const documentRequirementsMet = investor.onboarding_completed === true

    const overallStatus = kycVerified && amlCleared && investmentLimitsOk && regulatoryApproved && documentRequirementsMet
      ? 'compliant'
      : issues.length > 0 ? 'non_compliant' : 'pending'

    return {
      kyc_verified: kycVerified,
      accreditation_verified: accreditationVerified,
      aml_cleared: amlCleared,
      investment_limits_ok: investmentLimitsOk,
      regulatory_approved: regulatoryApproved,
      document_requirements_met: documentRequirementsMet,
      overall_status: overallStatus,
      issues,
      required_actions: requiredActions
    }
  }

  private getDefaultComplianceStatus(): InvestmentSubscriptionComplianceStatus {
    return {
      kyc_verified: false,
      accreditation_verified: false,
      aml_cleared: false,
      investment_limits_ok: false,
      regulatory_approved: false,
      document_requirements_met: false,
      overall_status: 'pending',
      issues: ['Compliance check not performed'],
      required_actions: ['Perform compliance verification']
    }
  }

  private async createSubscriptionWorkflow(subscriptionId: string): Promise<InvestmentSubscriptionWorkflow> {
    const subscription = await this.db.subscriptions.findUnique({
      where: { id: subscriptionId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const currentStage: InvestmentSubscriptionWorkflowStage = 'created'
    const completedStages: InvestmentSubscriptionWorkflowStage[] = ['created']
    const pendingStages: InvestmentSubscriptionWorkflowStage[] = ['compliance_check', 'payment_verification', 'allocation', 'distribution']

    return {
      subscription_id: subscriptionId,
      current_stage: currentStage,
      completed_stages: completedStages,
      pending_stages: pendingStages,
      workflow_data: {
        created_at: subscription.created_at,
        amount: subscription.fiat_amount,
        currency: subscription.currency
      },
      estimated_completion: this.calculateEstimatedCompletion(subscription),
      actual_completion: subscription.distributed ? nullToUndefined(subscription.updated_at) : undefined
    }
  }

  private getDefaultWorkflow(subscriptionId: string): InvestmentSubscriptionWorkflow {
    return {
      subscription_id: subscriptionId,
      current_stage: 'created',
      completed_stages: ['created'],
      pending_stages: ['compliance_check', 'payment_verification', 'allocation', 'distribution'],
      workflow_data: {},
      estimated_completion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
  }

  private generateNextSteps(subscription: any, complianceStatus: InvestmentSubscriptionComplianceStatus): string[] {
    const steps: string[] = []

    if (complianceStatus.overall_status === 'non_compliant') {
      steps.push(...complianceStatus.required_actions)
    }

    if (!subscription.confirmed) {
      steps.push('Confirm subscription payment')
    }

    if (!subscription.allocated) {
      steps.push('Allocate subscription to project')
    }

    if (!subscription.distributed) {
      steps.push('Distribute tokens to investor')
    }

    return steps
  }

  private estimateProcessingTime(data: InvestmentSubscriptionCreateRequest): number {
    // Base processing time in hours
    let hours = 24

    // Adjust based on amount (larger amounts take longer)
    if (data.fiat_amount > 100000) {
      hours += 24
    }

    if (data.fiat_amount > 1000000) {
      hours += 48
    }

    return hours
  }

  private calculateRiskScore(data: InvestmentSubscriptionCreateRequest, investor: any): number {
    let score = 0

    // Amount-based risk
    if (data.fiat_amount > 1000000) score += 30
    else if (data.fiat_amount > 100000) score += 20
    else if (data.fiat_amount > 10000) score += 10

    // Investor-based risk
    if (investor.investor_type === 'individual') score += 10
    if (investor.kyc_status !== 'approved') score += 20
    if (investor.accreditation_status !== 'approved') score += 15

    // Currency risk
    if (data.currency !== 'USD') score += 5

    return Math.min(score, 100) // Cap at 100
  }

  private calculateCompletionRate(subscription: any): number {
    let completed = 0
    let total = 4

    if (subscription.confirmed) completed++
    if (subscription.allocated) completed++
    if (subscription.distributed) completed++
    completed++ // Creation is always completed

    return (completed / total) * 100
  }

  private requiresAccreditation(subscription: any): boolean {
    // Simple rule: amounts over $50k require accreditation
    return subscription.fiat_amount > 50000
  }

  private calculateEstimatedCompletion(subscription: any): Date {
    const days = subscription.fiat_amount > 100000 ? 14 : 7
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }
}
