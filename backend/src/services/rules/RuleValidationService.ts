/**
 * Rule Validation Service
 * Business rules and validation logic for rules
 */

import { BaseService } from '../BaseService'
import type { 
  Rule, 
  CreateRuleRequest, 
  UpdateRuleRequest,
  RuleValidationResult,
  RuleType,
  RuleStatus
} from '@/types/rule-service'
import type { ServiceResult } from '@/types/index'

export class RuleValidationService extends BaseService {
  constructor() {
    super('RuleValidation')
  }

  /**
   * Validate rule creation request
   */
  async validateCreateRequest(data: CreateRuleRequest): Promise<RuleValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.rule_name || data.rule_name.trim().length === 0) {
      errors.push('Rule name is required')
    }

    if (!data.rule_type || data.rule_type.trim().length === 0) {
      errors.push('Rule type is required')
    }

    // Rule name length validation
    if (data.rule_name && data.rule_name.length > 255) {
      errors.push('Rule name cannot exceed 255 characters')
    }

    // Rule type validation
    if (data.rule_type && !this.isValidRuleType(data.rule_type)) {
      errors.push(`Invalid rule type: ${data.rule_type}`)
    }

    // Rule details validation
    if (data.rule_details && typeof data.rule_details !== 'object') {
      errors.push('Rule details must be a valid JSON object')
    }

    // Status validation
    if (data.status && !this.isValidRuleStatus(data.status)) {
      errors.push(`Invalid rule status: ${data.status}`)
    }

    // Business logic validation
    await this.validateBusinessRules(data, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate rule update request
   */
  async validateUpdateRequest(
    ruleId: string, 
    data: UpdateRuleRequest
  ): Promise<RuleValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if rule exists
    const existingRuleRecord = await this.db.rules.findUnique({
      where: { rule_id: ruleId }
    })

    if (!existingRuleRecord) {
      errors.push('Rule not found')
      return { isValid: false, errors, warnings }
    }

    // Transform to match Rule interface
    const existingRule: Rule = {
      ...existingRuleRecord,
      rule_details: (existingRuleRecord.rule_details && typeof existingRuleRecord.rule_details === 'object')
        ? existingRuleRecord.rule_details as Record<string, any>
        : null
    }

    // Validate updated fields
    if (data.rule_name !== undefined) {
      if (!data.rule_name || data.rule_name.trim().length === 0) {
        errors.push('Rule name cannot be empty')
      } else if (data.rule_name.length > 255) {
        errors.push('Rule name cannot exceed 255 characters')
      }
    }

    if (data.rule_type !== undefined) {
      if (!data.rule_type || data.rule_type.trim().length === 0) {
        errors.push('Rule type cannot be empty')
      } else if (!this.isValidRuleType(data.rule_type)) {
        errors.push(`Invalid rule type: ${data.rule_type}`)
      }
    }

    if (data.rule_details !== undefined && data.rule_details !== null) {
      if (typeof data.rule_details !== 'object') {
        errors.push('Rule details must be a valid JSON object')
      }
    }

    if (data.status !== undefined && !this.isValidRuleStatus(data.status)) {
      errors.push(`Invalid rule status: ${data.status}`)
    }

    // Check for rule conflicts
    await this.checkRuleConflicts(existingRule, data, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate rule details based on rule type
   */
  async validateRuleDetails(
    ruleType: string, 
    ruleDetails: Record<string, any>
  ): Promise<RuleValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    if (!ruleDetails) {
      warnings.push('Rule details are empty - rule may not function properly')
      return { isValid: true, errors, warnings }
    }

    // Type-specific validation
    switch (ruleType) {
      case 'kyc_verification':
        this.validateKYCRule(ruleDetails, errors, warnings)
        break
      case 'aml_sanctions':
        this.validateAMLRule(ruleDetails, errors, warnings)
        break
      case 'transfer_limit':
        this.validateTransferLimitRule(ruleDetails, errors, warnings)
        break
      case 'velocity_limit':
        this.validateVelocityLimitRule(ruleDetails, errors, warnings)
        break
      case 'lockup_period':
        this.validateLockupPeriodRule(ruleDetails, errors, warnings)
        break
      default:
        warnings.push(`Unknown rule type: ${ruleType} - validation may be incomplete`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check if rule name is unique
   */
  async isRuleNameUnique(ruleName: string, excludeRuleId?: string): Promise<boolean> {
    try {
      const where: any = { rule_name: ruleName }
      if (excludeRuleId) {
        where.rule_id = { not: excludeRuleId }
      }

      const existingRule = await this.db.rules.findFirst({ where })
      return !existingRule
    } catch (error) {
      this.logger.error({ error, ruleName }, 'Failed to check rule name uniqueness')
      return false
    }
  }

  /**
   * Private helper methods
   */
  private isValidRuleType(ruleType: string): boolean {
    const validTypes = [
      'kyc_verification',
      'aml_sanctions', 
      'accredited_investor',
      'lockup_period',
      'transfer_limit',
      'velocity_limit',
      'volume_supply_limit',
      'whitelist_transfer',
      'investor_position_limit',
      'investor_transaction_limit',
      'risk_profile',
      'redemption',
      'standard_redemption',
      'interval_fund_redemption',
      'tokenized_fund'
    ]
    return validTypes.includes(ruleType)
  }

  private isValidRuleStatus(status: string): boolean {
    const validStatuses = ['active', 'inactive', 'draft', 'archived']
    return validStatuses.includes(status)
  }

  private async validateBusinessRules(
    data: CreateRuleRequest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for duplicate rule names
    if (data.rule_name) {
      const isUnique = await this.isRuleNameUnique(data.rule_name)
      if (!isUnique) {
        errors.push('Rule name already exists')
      }
    }

    // Validate rule details if provided
    if (data.rule_details && data.rule_type) {
      const detailValidation = await this.validateRuleDetails(data.rule_type, data.rule_details)
      errors.push(...detailValidation.errors)
      warnings.push(...(detailValidation.warnings || []))
    }
  }

  private async checkRuleConflicts(
    existingRule: Rule,
    updateData: UpdateRuleRequest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for name uniqueness if name is being updated
    if (updateData.rule_name && updateData.rule_name !== existingRule.rule_name) {
      const isUnique = await this.isRuleNameUnique(updateData.rule_name, existingRule.rule_id)
      if (!isUnique) {
        errors.push('Rule name already exists')
      }
    }

    // Check for rule type conflicts
    if (updateData.rule_type && updateData.rule_type !== existingRule.rule_type) {
      warnings.push('Changing rule type may affect existing rule logic')
    }
  }

  private validateKYCRule(details: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!details.required_documents) {
      warnings.push('KYC rule should specify required documents')
    }
    if (!details.verification_level) {
      warnings.push('KYC rule should specify verification level')
    }
  }

  private validateAMLRule(details: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!details.screening_lists) {
      warnings.push('AML rule should specify screening lists')
    }
    if (!details.risk_threshold) {
      warnings.push('AML rule should specify risk threshold')
    }
  }

  private validateTransferLimitRule(details: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!details.max_amount) {
      errors.push('Transfer limit rule must specify maximum amount')
    }
    if (details.max_amount && details.max_amount <= 0) {
      errors.push('Transfer limit amount must be positive')
    }
  }

  private validateVelocityLimitRule(details: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!details.time_window) {
      errors.push('Velocity limit rule must specify time window')
    }
    if (!details.max_transactions) {
      errors.push('Velocity limit rule must specify maximum transactions')
    }
  }

  private validateLockupPeriodRule(details: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!details.lockup_duration) {
      errors.push('Lockup period rule must specify duration')
    }
    if (details.lockup_duration && details.lockup_duration <= 0) {
      errors.push('Lockup duration must be positive')
    }
  }
}
