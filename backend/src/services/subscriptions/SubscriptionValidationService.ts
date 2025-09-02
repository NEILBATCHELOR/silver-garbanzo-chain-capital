/**
 * Subscription Validation Service
 * Comprehensive validation and business rule checking for subscription operations
 */

import { BaseService } from '../BaseService'
import type {
  InvestmentSubscription,
  InvestmentSubscriptionCreateRequest,
  InvestmentSubscriptionUpdateRequest,
  InvestmentSubscriptionValidationResult,
  InvestmentSubscriptionComplianceStatus,
  RedemptionRequest,
  RedemptionCreateRequest,
  RedemptionValidationResult,
  Currency,
  PaymentMethod,
  InvestmentSubscriptionStatus,
  RedemptionStatus,
  RedemptionType
} from '../../types/subscriptions'
import type { ServiceResult } from '../../types/index'
import {
  isGreaterThan,
  decimalToNumber
} from '../../utils/decimal-helpers'

export class SubscriptionValidationService extends BaseService {

  constructor() {
    super('SubscriptionValidation')
  }

  /**
   * Validate subscription creation request
   */
  async validateSubscriptionCreate(
    data: InvestmentSubscriptionCreateRequest
  ): Promise<ServiceResult<InvestmentSubscriptionValidationResult>> {
    try {
      const validationErrors: string[] = []
      const complianceIssues: string[] = []
      const blockingIssues: string[] = []
      const warningIssues: string[] = []
      const recommendations: string[] = []

      // Required field validation
      if (!data.investor_id) {
        validationErrors.push('Investor ID is required')
        blockingIssues.push('Missing investor ID')
      }

      if (!data.fiat_amount || data.fiat_amount <= 0) {
        validationErrors.push('Investment amount must be greater than 0')
        blockingIssues.push('Invalid investment amount')
      }

      if (!data.currency) {
        validationErrors.push('Currency is required')
        blockingIssues.push('Missing currency')
      }

      // Business rule validation
      if (data.fiat_amount && data.fiat_amount < 1000) {
        warningIssues.push('Investment amount is below recommended minimum of $1,000')
        recommendations.push('Consider minimum investment thresholds')
      }

      if (data.fiat_amount && data.fiat_amount > 10000000) {
        complianceIssues.push('Large investment requires additional compliance checks')
        recommendations.push('Enhanced due diligence required for amounts over $10M')
      }

      // Currency validation
      if (data.currency && !this.isValidCurrency(data.currency)) {
        validationErrors.push(`Invalid currency: ${data.currency}`)
        blockingIssues.push('Unsupported currency')
      }

      // Payment method validation
      if (data.payment_method && !this.isValidPaymentMethod(data.payment_method)) {
        validationErrors.push(`Invalid payment method: ${data.payment_method}`)
        warningIssues.push('Unsupported payment method')
      }

      // Date validation
      if (data.subscription_date) {
        const subscriptionDate = new Date(data.subscription_date)
        const now = new Date()
        const maxFutureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

        if (subscriptionDate > maxFutureDate) {
          validationErrors.push('Subscription date cannot be more than 30 days in the future')
          blockingIssues.push('Invalid subscription date')
        }

        if (subscriptionDate < new Date('2020-01-01')) {
          validationErrors.push('Subscription date seems too far in the past')
          warningIssues.push('Very old subscription date')
        }
      }

      // Investor validation (if investor_id provided)
      if (data.investor_id) {
        const investor = await this.db.investors.findUnique({
          where: { investor_id: data.investor_id }
        })

        if (!investor) {
          validationErrors.push('Investor not found')
          blockingIssues.push('Invalid investor reference')
        } else {
          // Check investor status
          if (investor.investor_status === 'blocked' || investor.investor_status === 'suspended') {
            complianceIssues.push('Investor account is blocked or suspended')
            blockingIssues.push('Investor account not eligible for subscriptions')
          }

          // Check KYC status
          if (investor.kyc_status !== 'approved') {
            complianceIssues.push('Investor KYC not approved')
            if (data.fiat_amount > 5000) {
              blockingIssues.push('KYC approval required for investments over $5,000')
            } else {
              warningIssues.push('KYC approval recommended')
            }
          }

          // Check accreditation for large amounts
          if (data.fiat_amount > 50000 && investor.accreditation_status !== 'approved') {
            complianceIssues.push('Investor accreditation not verified for large investment')
            blockingIssues.push('Accreditation required for investments over $50,000')
          }
        }
      }

      // Project validation (if project_id provided)
      if (data.project_id) {
        const project = await this.db.projects.findUnique({
          where: { id: data.project_id }
        })

        if (!project) {
          validationErrors.push('Project not found')
          blockingIssues.push('Invalid project reference')
        } else {
          // Check project status
          if (project.status !== 'active' && project.status !== 'approved') {
            validationErrors.push('Project is not accepting investments')
            blockingIssues.push('Project not in active investment phase')
          }

          // Check investment limits
          if (project.target_raise && data.fiat_amount > decimalToNumber(project.target_raise)) {
            validationErrors.push('Investment amount exceeds project target')
            blockingIssues.push('Amount exceeds project maximum')
          }
        }
      }

      const isValid = blockingIssues.length === 0
      const businessRulesPassed = validationErrors.length === 0 && complianceIssues.length === 0

      const result: InvestmentSubscriptionValidationResult = {
        is_valid: isValid,
        validation_errors: validationErrors,
        compliance_issues: complianceIssues,
        business_rules_passed: businessRulesPassed,
        required_approvals: this.getRequiredApprovals(data),
        estimated_processing_time: this.estimateProcessingTime(data),
        risk_score: this.calculateRiskScore(data),
        recommendations,
        blocking_issues: blockingIssues,
        warning_issues: warningIssues
      }

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to validate subscription creation')
      return this.error('Failed to validate subscription', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate subscription update request
   */
  async validateSubscriptionUpdate(
    data: InvestmentSubscriptionUpdateRequest,
    existingSubscription: InvestmentSubscription
  ): Promise<ServiceResult<InvestmentSubscriptionValidationResult>> {
    try {
      const validationErrors: string[] = []
      const complianceIssues: string[] = []
      const blockingIssues: string[] = []
      const warningIssues: string[] = []
      const recommendations: string[] = []

      // Amount validation
      if (data.fiat_amount !== undefined) {
        if (data.fiat_amount <= 0) {
          validationErrors.push('Investment amount must be greater than 0')
          blockingIssues.push('Invalid investment amount')
        }

        // Check if amount is being reduced and subscription is already allocated
        if (existingSubscription.allocated && data.fiat_amount < existingSubscription.fiat_amount) {
          validationErrors.push('Cannot reduce amount for allocated subscription')
          blockingIssues.push('Subscription already allocated')
        }

        // Check if amount is being reduced and subscription is distributed
        if (existingSubscription.distributed && data.fiat_amount !== existingSubscription.fiat_amount) {
          validationErrors.push('Cannot modify amount for distributed subscription')
          blockingIssues.push('Subscription already distributed')
        }
      }

      // Status validation
      if (data.confirmed !== undefined || data.allocated !== undefined || data.distributed !== undefined) {
        // Cannot unconfirm if already allocated
        if (data.confirmed === false && existingSubscription.allocated) {
          validationErrors.push('Cannot unconfirm allocated subscription')
          blockingIssues.push('Invalid status transition')
        }

        // Cannot unallocate if already distributed
        if (data.allocated === false && existingSubscription.distributed) {
          validationErrors.push('Cannot unallocate distributed subscription')
          blockingIssues.push('Invalid status transition')
        }

        // Cannot distribute without allocation
        if (data.distributed === true && !existingSubscription.allocated && data.allocated !== true) {
          validationErrors.push('Cannot distribute unallocated subscription')
          blockingIssues.push('Must allocate before distribution')
        }

        // Cannot distribute without confirmation
        if (data.distributed === true && !existingSubscription.confirmed && data.confirmed !== true) {
          validationErrors.push('Cannot distribute unconfirmed subscription')
          blockingIssues.push('Must confirm before distribution')
        }
      }

      // Currency validation
      if (data.currency && !this.isValidCurrency(data.currency)) {
        validationErrors.push(`Invalid currency: ${data.currency}`)
        blockingIssues.push('Unsupported currency')
      }

      // Date validation
      if (data.subscription_date) {
        const subscriptionDate = new Date(data.subscription_date)
        const now = new Date()

        if (subscriptionDate > now) {
          warningIssues.push('Subscription date is in the future')
        }

        if (subscriptionDate < new Date('2020-01-01')) {
          validationErrors.push('Subscription date seems too far in the past')
          warningIssues.push('Very old subscription date')
        }
      }

      const isValid = blockingIssues.length === 0
      const businessRulesPassed = validationErrors.length === 0 && complianceIssues.length === 0

      const result: InvestmentSubscriptionValidationResult = {
        is_valid: isValid,
        validation_errors: validationErrors,
        compliance_issues: complianceIssues,
        business_rules_passed: businessRulesPassed,
        required_approvals: this.getRequiredApprovalsForUpdate(data, existingSubscription),
        estimated_processing_time: this.estimateUpdateProcessingTime(data),
        risk_score: this.calculateUpdateRiskScore(data, existingSubscription),
        recommendations,
        blocking_issues: blockingIssues,
        warning_issues: warningIssues
      }

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to validate subscription update')
      return this.error('Failed to validate subscription update', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate redemption request
   */
  async validateRedemptionRequest(
    data: RedemptionCreateRequest
  ): Promise<ServiceResult<RedemptionValidationResult>> {
    try {
      const validationErrors: string[] = []
      const complianceIssues: string[] = []
      const workflowRequirements: string[] = []
      const approvalRequirements = {
        required_approvers: 1,
        assigned_approvers: [] as string[],
        missing_approvers: 1
      }
      const eligibilityCheck = {
        wallet_verified: false,
        token_balance_sufficient: false,
        redemption_window_open: false,
        investor_eligible: false
      }
      const riskAssessment = {
        risk_level: 'medium' as 'low' | 'medium' | 'high',
        risk_factors: [] as string[],
        additional_checks_required: [] as string[]
      }

      // Required field validation
      if (!data.token_amount || data.token_amount <= 0) {
        validationErrors.push('Token amount must be greater than 0')
      }

      if (!data.token_type) {
        validationErrors.push('Token type is required')
      }

      if (!data.redemption_type) {
        validationErrors.push('Redemption type is required')
      }

      if (!data.source_wallet_address) {
        validationErrors.push('Source wallet address is required')
      }

      if (!data.destination_wallet_address) {
        validationErrors.push('Destination wallet address is required')
      }

      // Wallet address validation
      if (data.source_wallet_address && !this.isValidWalletAddress(data.source_wallet_address)) {
        validationErrors.push('Invalid source wallet address format')
      } else {
        eligibilityCheck.wallet_verified = true
      }

      if (data.destination_wallet_address && !this.isValidWalletAddress(data.destination_wallet_address)) {
        validationErrors.push('Invalid destination wallet address format')
      }

      // Same wallet check
      if (data.source_wallet_address && data.destination_wallet_address && 
          data.source_wallet_address === data.destination_wallet_address) {
        validationErrors.push('Source and destination wallets cannot be the same')
      }

      // Redemption type validation
      if (data.redemption_type && !this.isValidRedemptionType(data.redemption_type)) {
        validationErrors.push(`Invalid redemption type: ${data.redemption_type}`)
      }

      // Token balance validation (simplified - would need blockchain integration)
      // For now, assume sufficient balance
      eligibilityCheck.token_balance_sufficient = true

      // Redemption window validation (simplified)
      eligibilityCheck.redemption_window_open = true

      // Investor eligibility (if investor_id provided)
      if (data.investor_id) {
        // This would typically validate against investor records
        eligibilityCheck.investor_eligible = true
      }

      // Risk assessment
      if (data.token_amount > 100000) {
        riskAssessment.risk_level = 'high'
        riskAssessment.risk_factors.push('Large token amount')
        riskAssessment.additional_checks_required.push('Enhanced due diligence')
        approvalRequirements.required_approvers = 2
        approvalRequirements.missing_approvers = 2
      }

      if (data.redemption_type === 'full') {
        riskAssessment.risk_factors.push('Full redemption request')
        workflowRequirements.push('Account closure procedures')
      }

      const isValid = validationErrors.length === 0 && 
                     eligibilityCheck.wallet_verified && 
                     eligibilityCheck.token_balance_sufficient &&
                     eligibilityCheck.redemption_window_open &&
                     eligibilityCheck.investor_eligible

      const result: RedemptionValidationResult = {
        is_valid: isValid,
        validation_errors: validationErrors,
        compliance_issues: complianceIssues,
        workflow_requirements: workflowRequirements,
        approval_requirements: approvalRequirements,
        eligibility_check: eligibilityCheck,
        risk_assessment: riskAssessment,
        estimated_completion_time: this.estimateRedemptionTime(data)
      }

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to validate redemption request')
      return this.error('Failed to validate redemption', 'VALIDATION_ERROR')
    }
  }

  /**
   * Private validation helper methods
   */

  private isValidCurrency(currency: string): currency is Currency {
    const validCurrencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY']
    return validCurrencies.includes(currency as Currency)
  }

  private isValidPaymentMethod(method: string): method is PaymentMethod {
    const validMethods: PaymentMethod[] = ['wire_transfer', 'credit_card', 'crypto', 'ach', 'check', 'other']
    return validMethods.includes(method as PaymentMethod)
  }

  private isValidRedemptionType(type: string): type is RedemptionType {
    const validTypes: RedemptionType[] = ['full', 'partial', 'dividend', 'liquidation']
    return validTypes.includes(type as RedemptionType)
  }

  private isValidWalletAddress(address: string): boolean {
    // Simplified wallet address validation
    // In production, this would validate against specific blockchain address formats
    if (!address || address.length < 10) return false
    
    // Ethereum address format (starts with 0x, 42 characters total)
    if (address.startsWith('0x') && address.length === 42) {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    }
    
    // Bitcoin address format (basic validation)
    if (address.length >= 26 && address.length <= 35) {
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)
    }
    
    return false
  }

  private getRequiredApprovals(data: InvestmentSubscriptionCreateRequest): string[] {
    const approvals: string[] = []

    if (!data.investor_id) {
      approvals.push('Investor verification')
    }

    if (!data.compliance_check) {
      approvals.push('Compliance review')
    }

    if (data.fiat_amount > 100000) {
      approvals.push('Large investment approval')
    }

    if (data.fiat_amount > 1000000) {
      approvals.push('Senior management approval')
    }

    return approvals
  }

  private getRequiredApprovalsForUpdate(
    data: InvestmentSubscriptionUpdateRequest,
    existing: InvestmentSubscription
  ): string[] {
    const approvals: string[] = []

    // If modifying a large amount
    if (data.fiat_amount && (data.fiat_amount > 100000 || existing.fiat_amount > 100000)) {
      approvals.push('Amount modification approval')
    }

    // If changing status to distributed
    if (data.distributed === true && !existing.distributed) {
      approvals.push('Distribution approval')
    }

    return approvals
  }

  private estimateProcessingTime(data: InvestmentSubscriptionCreateRequest): number {
    let hours = 24 // Base processing time

    if (data.fiat_amount > 100000) hours += 24
    if (data.fiat_amount > 1000000) hours += 48
    if (!data.compliance_check) hours += 12

    return hours
  }

  private estimateUpdateProcessingTime(data: InvestmentSubscriptionUpdateRequest): number {
    let hours = 2 // Base update time

    if (data.fiat_amount) hours += 4
    if (data.distributed === true) hours += 8

    return hours
  }

  private estimateRedemptionTime(data: RedemptionCreateRequest): number {
    let hours = 48 // Base redemption processing time

    if (data.token_amount > 100000) hours += 24
    if (data.redemption_type === 'full') hours += 12

    return hours
  }

  private calculateRiskScore(data: InvestmentSubscriptionCreateRequest): number {
    let score = 0

    // Amount-based risk
    if (data.fiat_amount > 1000000) score += 40
    else if (data.fiat_amount > 100000) score += 25
    else if (data.fiat_amount > 10000) score += 10

    // Currency risk
    if (data.currency && data.currency !== 'USD') score += 5

    // Payment method risk
    if (data.payment_method === 'crypto') score += 15
    else if (data.payment_method === 'other') score += 10

    return Math.min(score, 100)
  }

  private calculateUpdateRiskScore(
    data: InvestmentSubscriptionUpdateRequest,
    existing: InvestmentSubscription
  ): number {
    let score = 0

    // Status change risk
    if (data.distributed === true && !existing.distributed) score += 20
    if (data.allocated === true && !existing.allocated) score += 10

    // Amount change risk
    if (data.fiat_amount && data.fiat_amount !== existing.fiat_amount) {
      const changePercentage = Math.abs(data.fiat_amount - existing.fiat_amount) / existing.fiat_amount
      if (changePercentage > 0.5) score += 30
      else if (changePercentage > 0.2) score += 15
    }

    return Math.min(score, 100)
  }
}
