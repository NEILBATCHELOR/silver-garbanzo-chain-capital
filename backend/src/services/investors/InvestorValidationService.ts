/**
 * Investor Validation Service
 * Handles investor data validation, business rules, and compliance checks
 */

import { BaseService } from '../BaseService'
import type {
  Investor,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  InvestorValidationResult,
  KycStatus,
  InvestorStatus,
  InvestorType,
  AccreditationStatus
} from '@/types/investors'
import type { ServiceResult } from '../../types/index'

interface ValidationRule {
  field: string
  rule: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
  condition?: (data: any) => boolean
}

export class InvestorValidationService extends BaseService {
  private validationRules: Record<string, ValidationRule[]> = {}

  constructor() {
    super('InvestorValidation')
    this.initializeValidationRules()
  }

  /**
   * Validate investor creation data
   */
  async validateInvestor(data: InvestorCreateRequest | Investor): Promise<ServiceResult<InvestorValidationResult>> {
    try {
      const validationResult = await this.performValidation(data)
      return this.success(validationResult)
    } catch (error) {
      this.logError('Failed to validate investor', { error, data })
      return this.error('Validation service error', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate investor update data
   */
  async validateInvestorUpdate(
    data: InvestorUpdateRequest, 
    existingInvestor: Investor
  ): Promise<ServiceResult<InvestorValidationResult>> {
    try {
      // Merge update data with existing investor data
      const mergedData = { ...existingInvestor, ...data }
      const validationResult = await this.performValidation(mergedData)
      
      // Additional validation for status transitions
      const statusValidation = this.validateStatusTransitions(data, existingInvestor)
      if (!statusValidation.is_valid) {
        validationResult.validation_errors.push(...statusValidation.validation_errors)
        validationResult.is_valid = false
      }

      return this.success(validationResult)
    } catch (error) {
      this.logError('Failed to validate investor update', { error, data })
      return this.error('Update validation service error', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate KYC data completeness
   */
  async validateKycData(investor: Investor): Promise<ServiceResult<InvestorValidationResult>> {
    try {
      const kycRequirements = this.validateKycRequirements(investor)
      const result: InvestorValidationResult = {
        is_valid: kycRequirements.kyc_requirements.length === 0,
        missing_fields: [],
        validation_errors: kycRequirements.kyc_requirements,
        compliance_issues: [],
        kyc_requirements: kycRequirements.kyc_requirements,
        accreditation_requirements: [],
        completion_percentage: 100,
        business_rules_passed: kycRequirements.kyc_requirements.length === 0,
        required_documents: kycRequirements.kyc_requirements
      }
      return this.success(result)
    } catch (error) {
      this.logError('Failed to validate KYC data', { error, investor })
      return this.error('KYC validation service error', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate accreditation requirements
   */
  async validateAccreditation(investor: Investor): Promise<ServiceResult<InvestorValidationResult>> {
    try {
      const accreditationRequirements = this.validateAccreditationRequirements(investor)
      const result: InvestorValidationResult = {
        is_valid: accreditationRequirements.accreditation_requirements.length === 0,
        missing_fields: [],
        validation_errors: accreditationRequirements.accreditation_requirements,
        compliance_issues: [],
        kyc_requirements: [],
        accreditation_requirements: accreditationRequirements.accreditation_requirements,
        completion_percentage: 100,
        business_rules_passed: accreditationRequirements.accreditation_requirements.length === 0,
        required_documents: accreditationRequirements.accreditation_requirements
      }
      return this.success(result)
    } catch (error) {
      this.logError('Failed to validate accreditation', { error, investor })
      return this.error('Accreditation validation service error', 'VALIDATION_ERROR')
    }
  }

  /**
   * Private validation methods
   */

  private async performValidation(data: any): Promise<InvestorValidationResult> {
    const validationErrors: string[] = []
    const missingFields: string[] = []
    const complianceIssues: string[] = []
    const kycRequirements: string[] = []
    const accreditationRequirements: string[] = []

    // Basic field validation
    const basicValidation = this.validateBasicFields(data)
    validationErrors.push(...basicValidation.validation_errors)
    missingFields.push(...basicValidation.missing_fields)

    // Business rule validation
    const businessValidation = this.validateBusinessRules(data)
    validationErrors.push(...businessValidation.validation_errors)

    // Type-specific validation
    const typeValidation = this.validateInvestorType(data)
    validationErrors.push(...typeValidation.validation_errors)
    missingFields.push(...typeValidation.missing_fields)

    // Compliance validation
    const complianceValidation = this.validateCompliance(data)
    complianceIssues.push(...complianceValidation.compliance_issues)

    // KYC validation
    const kycValidation = this.validateKycRequirements(data)
    kycRequirements.push(...kycValidation.kyc_requirements)

    // Accreditation validation
    const accreditationValidation = this.validateAccreditationRequirements(data)
    accreditationRequirements.push(...accreditationValidation.accreditation_requirements)

    // Calculate completion percentage
    const completionPercentage = this.calculateCompletionPercentage(data)

    return {
      is_valid: validationErrors.length === 0,
      missing_fields: [...new Set(missingFields)],
      validation_errors: [...new Set(validationErrors)],
      compliance_issues: [...new Set(complianceIssues)],
      kyc_requirements: [...new Set(kycRequirements)],
      accreditation_requirements: [...new Set(accreditationRequirements)],
      completion_percentage: completionPercentage,
      business_rules_passed: validationErrors.length === 0 && complianceIssues.length === 0,
      required_documents: [...new Set([...kycRequirements, ...accreditationRequirements])]
    }
  }

  private validateBasicFields(data: any): { validation_errors: string[], missing_fields: string[] } {
    const errors: string[] = []
    const missing: string[] = []

    // Required fields for all investors
    const requiredFields = ['name', 'email', 'type']
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missing.push(field)
      }
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format')
    }

    // Name validation
    if (data.name && data.name.length < 2) {
      errors.push('Name must be at least 2 characters long')
    }

    // Wallet address validation
    if (data.wallet_address && !this.isValidWalletAddress(data.wallet_address)) {
      errors.push('Invalid wallet address format')
    }

    return { validation_errors: errors, missing_fields: missing }
  }

  private validateBusinessRules(data: any): { validation_errors: string[] } {
    const errors: string[] = []

    // Tax ID validation
    if (data.tax_id_number && data.tax_residency) {
      if (!this.isValidTaxId(data.tax_id_number, data.tax_residency)) {
        errors.push('Invalid tax ID format for the specified tax residency')
      }
    }

    // Profile data validation
    if (data.profile_data) {
      const profileValidation = this.validateProfileData(data.profile_data)
      errors.push(...profileValidation)
    }

    // Risk assessment validation
    if (data.risk_assessment) {
      const riskValidation = this.validateRiskAssessment(data.risk_assessment)
      errors.push(...riskValidation)
    }

    // Investment preferences validation
    if (data.investment_preferences) {
      const preferencesValidation = this.validateInvestmentPreferences(data.investment_preferences)
      errors.push(...preferencesValidation)
    }

    return { validation_errors: errors }
  }

  private validateInvestorType(data: any): { validation_errors: string[], missing_fields: string[] } {
    const errors: string[] = []
    const missing: string[] = []

    const investorType = data.investor_type || data.type

    switch (investorType) {
      case 'individual':
        // Additional validation for individual investors
        if (data.profile_data) {
          const requiredFields = ['date_of_birth', 'nationality']
          for (const field of requiredFields) {
            if (!data.profile_data[field]) {
              missing.push(`profile_data.${field}`)
            }
          }
        }
        break

      case 'corporate':
        // Additional validation for corporate investors
        if (!data.company) {
          missing.push('company')
        }
        if (data.profile_data && !data.profile_data.registration_number) {
          missing.push('profile_data.registration_number')
        }
        break

      case 'institutional':
        // Additional validation for institutional investors
        if (!data.company) {
          missing.push('company')
        }
        if (data.accreditation_status === 'not_started') {
          errors.push('Institutional investors must complete accreditation process')
        }
        break

      case 'fund':
        // Additional validation for fund investors
        if (!data.company) {
          missing.push('company')
        }
        if (data.profile_data && !data.profile_data.fund_type) {
          missing.push('profile_data.fund_type')
        }
        break

      case 'trust':
        // Additional validation for trust investors
        if (data.profile_data && !data.profile_data.trust_type) {
          missing.push('profile_data.trust_type')
        }
        if (data.profile_data && !data.profile_data.trustee_name) {
          missing.push('profile_data.trustee_name')
        }
        break

      default:
        errors.push('Invalid investor type')
    }

    return { validation_errors: errors, missing_fields: missing }
  }

  private validateCompliance(data: any): { compliance_issues: string[] } {
    const issues: string[] = []

    // KYC expiry check
    if (data.kyc_status === 'approved' && data.kyc_expiry_date) {
      const expiryDate = new Date(data.kyc_expiry_date)
      const now = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        issues.push('KYC has expired')
      } else if (daysUntilExpiry < 30) {
        issues.push('KYC expires within 30 days')
      }
    }

    // Accreditation expiry check
    if (data.accreditation_status === 'approved' && data.accreditation_expiry_date) {
      const expiryDate = new Date(data.accreditation_expiry_date)
      const now = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        issues.push('Accreditation has expired')
      } else if (daysUntilExpiry < 60) {
        issues.push('Accreditation expires within 60 days')
      }
    }

    // Compliance check frequency
    if (data.last_compliance_check) {
      const lastCheck = new Date(data.last_compliance_check)
      const now = new Date()
      const daysSinceCheck = Math.ceil((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceCheck > 365) {
        issues.push('Annual compliance check overdue')
      }
    } else {
      issues.push('No compliance check on record')
    }

    // Sanctions screening
    if (!data.verification_details?.sanctions_checked) {
      issues.push('Sanctions screening not completed')
    }

    return { compliance_issues: issues }
  }

  private validateKycRequirements(data: any): { kyc_requirements: string[] } {
    const requirements: string[] = []

    if (data.kyc_status === 'not_started' || data.kyc_status === 'failed') {
      requirements.push('Identity verification required')
      requirements.push('Address verification required')
      
      if (data.investor_type === 'corporate' || data.investor_type === 'institutional') {
        requirements.push('Corporate documentation required')
        requirements.push('Beneficial ownership disclosure required')
      }

      if (data.tax_residency === 'US') {
        requirements.push('W-9 tax form required')
      } else {
        requirements.push('W-8 tax form required')
      }
    }

    if (data.kyc_status === 'pending') {
      requirements.push('Awaiting KYC review completion')
    }

    return { kyc_requirements: requirements }
  }

  private validateAccreditationRequirements(data: any): { accreditation_requirements: string[] } {
    const requirements: string[] = []

    // Check if accreditation is required
    const needsAccreditation = this.isAccreditationRequired(data)
    
    if (needsAccreditation && (data.accreditation_status === 'not_started' || data.accreditation_status === 'rejected')) {
      requirements.push('Accredited investor verification required')
      
      if (data.investor_type === 'individual') {
        requirements.push('Income verification (>$200K annually) or net worth verification (>$1M)')
      } else {
        requirements.push('Institutional accreditation certificate required')
      }
    }

    if (data.accreditation_status === 'pending') {
      requirements.push('Awaiting accreditation review completion')
    }

    return { accreditation_requirements: requirements }
  }

  private validateStatusTransitions(updateData: InvestorUpdateRequest, existingInvestor: Investor): InvestorValidationResult {
    const errors: string[] = []

    // Valid KYC status transitions
    const validKycTransitions: Record<KycStatus, KycStatus[]> = {
      'not_started': ['pending'],
      'pending': ['approved', 'failed', 'not_started'],
      'approved': ['expired', 'pending'], // Can re-verify
      'failed': ['pending', 'not_started'],
      'expired': ['pending', 'not_started']
    }

    // Valid investor status transitions
    const validStatusTransitions: Record<InvestorStatus, InvestorStatus[]> = {
      'pending': ['active', 'rejected'],
      'active': ['inactive', 'suspended'],
      'inactive': ['active', 'suspended'],
      'suspended': ['active', 'inactive'],
      'rejected': ['pending'] // Can reapply
    }

    // Validate KYC status transition
    if (updateData.kyc_status && updateData.kyc_status !== existingInvestor.kyc_status) {
      const currentStatus = existingInvestor.kyc_status
      const newStatus = updateData.kyc_status
      
      if (!validKycTransitions[currentStatus]?.includes(newStatus)) {
        errors.push(`Invalid KYC status transition from ${currentStatus} to ${newStatus}`)
      }
    }

    // Validate investor status transition
    if (updateData.investor_status && updateData.investor_status !== existingInvestor.investor_status) {
      const currentStatus = existingInvestor.investor_status!
      const newStatus = updateData.investor_status
      
      if (!validStatusTransitions[currentStatus]?.includes(newStatus)) {
        errors.push(`Invalid investor status transition from ${currentStatus} to ${newStatus}`)
      }
    }

    return {
      is_valid: errors.length === 0,
      validation_errors: errors,
      missing_fields: [],
      compliance_issues: [],
      kyc_requirements: [],
      accreditation_requirements: [],
      completion_percentage: 0,
      business_rules_passed: errors.length === 0,
      required_documents: []
    }
  }

  private calculateCompletionPercentage(data: any): number {
    const requiredFields = [
      'name', 'email', 'type', 'investor_type',
      'profile_data.phone', 'profile_data.nationality', 'profile_data.residence_country',
      'risk_assessment.risk_tolerance', 'risk_assessment.investment_experience',
      'tax_residency'
    ]

    const optionalFields = [
      'company', 'wallet_address', 'tax_id_number',
      'investment_preferences', 'verification_details'
    ]

    let completedRequired = 0
    let completedOptional = 0

    // Check required fields
    for (const field of requiredFields) {
      if (this.hasFieldValue(data, field)) {
        completedRequired++
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (this.hasFieldValue(data, field)) {
        completedOptional++
      }
    }

    // Weight required fields more heavily (70% of score)
    const requiredScore = (completedRequired / requiredFields.length) * 70
    const optionalScore = (completedOptional / optionalFields.length) * 30

    return Math.round(requiredScore + optionalScore)
  }

  private hasFieldValue(data: any, fieldPath: string): boolean {
    const keys = fieldPath.split('.')
    let current = data

    for (const key of keys) {
      if (current == null || current[key] == null) {
        return false
      }
      current = current[key]
    }

    return current !== '' && current !== null && current !== undefined
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation
    const ethRegex = /^0x[a-fA-F0-9]{40}$/
    return ethRegex.test(address)
  }

  private isValidTaxId(taxId: string, taxResidency: string): boolean {
    // Simplified tax ID validation
    switch (taxResidency) {
      case 'US':
        return /^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$/.test(taxId) // EIN or SSN format
      case 'UK':
        return /^[A-Z]{2}\d{6}[A-Z]$/.test(taxId) // UTR format
      case 'CA':
        return /^\d{9}$/.test(taxId) // SIN format
      default:
        return taxId.length >= 5 // Generic validation
    }
  }

  private validateProfileData(profileData: any): string[] {
    const errors: string[] = []

    if (profileData.date_of_birth) {
      const birthDate = new Date(profileData.date_of_birth)
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      
      if (age < 18) {
        errors.push('Investor must be at least 18 years old')
      }
      if (age > 120) {
        errors.push('Invalid date of birth')
      }
    }

    if (profileData.net_worth && profileData.net_worth < 0) {
      errors.push('Net worth cannot be negative')
    }

    if (profileData.annual_income && profileData.annual_income < 0) {
      errors.push('Annual income cannot be negative')
    }

    return errors
  }

  private validateRiskAssessment(riskAssessment: any): string[] {
    const errors: string[] = []

    const validRiskTolerances = ['conservative', 'moderate', 'aggressive']
    if (riskAssessment.risk_tolerance && !validRiskTolerances.includes(riskAssessment.risk_tolerance)) {
      errors.push('Invalid risk tolerance level')
    }

    const validExperienceLevels = ['none', 'limited', 'moderate', 'extensive']
    if (riskAssessment.investment_experience && !validExperienceLevels.includes(riskAssessment.investment_experience)) {
      errors.push('Invalid investment experience level')
    }

    return errors
  }

  private validateInvestmentPreferences(preferences: any): string[] {
    const errors: string[] = []

    if (preferences.minimum_investment && preferences.maximum_investment) {
      if (preferences.minimum_investment > preferences.maximum_investment) {
        errors.push('Minimum investment cannot exceed maximum investment')
      }
    }

    if (preferences.minimum_investment && preferences.minimum_investment < 0) {
      errors.push('Minimum investment cannot be negative')
    }

    if (preferences.maximum_investment && preferences.maximum_investment < 0) {
      errors.push('Maximum investment cannot be negative')
    }

    return errors
  }

  private isAccreditationRequired(data: any): boolean {
    // Accreditation required for institutional investors
    if (['institutional', 'fund'].includes(data.investor_type)) {
      return true
    }

    // Check net worth and income thresholds for individuals
    if (data.profile_data) {
      const netWorth = data.profile_data.net_worth || 0
      const annualIncome = data.profile_data.annual_income || 0

      // US accredited investor thresholds
      return netWorth > 1000000 || annualIncome > 200000
    }

    return false
  }

  private initializeValidationRules(): void {
    // This method could be expanded to load validation rules from configuration
    // For now, validation logic is embedded in the methods above
  }
}
