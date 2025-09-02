/**
 * Policy Validation Service
 * Business rules and validation logic for policy templates and approval configs
 */

import { BaseService } from '../BaseService'
import type { 
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateValidationResult,
  CreateApprovalConfigRequest,
  UpdateApprovalConfigRequest,
  PolicyTemplate,
  ApprovalConfig
} from '@/types/policy-service'

export class PolicyValidationService extends BaseService {
  constructor() {
    super('PolicyValidation')
  }

  /**
   * Validate policy template creation request
   */
  async validateCreatePolicyTemplateRequest(data: CreatePolicyTemplateRequest): Promise<PolicyTemplateValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.template_name || data.template_name.trim().length === 0) {
      errors.push('Template name is required')
    }

    if (!data.template_data || typeof data.template_data !== 'object') {
      errors.push('Template data is required and must be an object')
    }

    // Template name validation
    if (data.template_name && data.template_name.length > 255) {
      errors.push('Template name cannot exceed 255 characters')
    }

    // Template type validation
    if (data.template_type && !this.isValidTemplateType(data.template_type)) {
      errors.push(`Invalid template type: ${data.template_type}`)
    }

    // Status validation
    if (data.status && !this.isValidTemplateStatus(data.status)) {
      errors.push(`Invalid template status: ${data.status}`)
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
      warnings.push('Description is quite long - consider shortening for better readability')
    }

    // Template data validation
    if (data.template_data) {
      await this.validateTemplateData(data.template_data, data.template_type, errors, warnings)
    }

    // Business logic validation
    await this.validatePolicyTemplateBusinessRules(data, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate policy template update request
   */
  async validateUpdatePolicyTemplateRequest(
    templateId: string,
    data: UpdatePolicyTemplateRequest
  ): Promise<PolicyTemplateValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if template exists
    const existingTemplateRecord = await this.db.policy_templates.findUnique({
      where: { template_id: templateId }
    })

    if (!existingTemplateRecord) {
      errors.push('Policy template not found')
      return { isValid: false, errors, warnings }
    }

    // Transform to match PolicyTemplate interface
    const existingTemplate: PolicyTemplate = {
      ...existingTemplateRecord,
      template_data: (existingTemplateRecord.template_data && typeof existingTemplateRecord.template_data === 'object')
        ? existingTemplateRecord.template_data as Record<string, any>
        : {}
    }

    // Validate updated fields
    if (data.template_name !== undefined) {
      if (!data.template_name || data.template_name.trim().length === 0) {
        errors.push('Template name cannot be empty')
      } else if (data.template_name.length > 255) {
        errors.push('Template name cannot exceed 255 characters')
      }
    }

    if (data.template_data !== undefined) {
      if (!data.template_data || typeof data.template_data !== 'object') {
        errors.push('Template data must be a valid object')
      } else {
        const templateType = data.template_type || existingTemplate.template_type
        await this.validateTemplateData(data.template_data, templateType, errors, warnings)
      }
    }

    if (data.template_type !== undefined && !this.isValidTemplateType(data.template_type)) {
      errors.push(`Invalid template type: ${data.template_type}`)
    }

    if (data.status !== undefined && !this.isValidTemplateStatus(data.status)) {
      errors.push(`Invalid template status: ${data.status}`)
    }

    if (data.description !== undefined && data.description && data.description.length > 1000) {
      warnings.push('Description is quite long - consider shortening for better readability')
    }

    // Check for template name uniqueness
    await this.checkTemplateNameUniqueness(existingTemplate, data, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate approval config creation request
   */
  async validateCreateApprovalConfigRequest(data: CreateApprovalConfigRequest): Promise<PolicyTemplateValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.permission_id || data.permission_id.trim().length === 0) {
      errors.push('Permission ID is required')
    }

    if (data.required_approvals === undefined || data.required_approvals < 1) {
      errors.push('Required approvals must be at least 1')
    }

    if (!data.eligible_roles || !Array.isArray(data.eligible_roles) || data.eligible_roles.length === 0) {
      errors.push('At least one eligible role is required')
    }

    if (!data.consensus_type || data.consensus_type.trim().length === 0) {
      errors.push('Consensus type is required')
    }

    // Consensus type validation
    if (data.consensus_type && !this.isValidConsensusType(data.consensus_type)) {
      errors.push(`Invalid consensus type: ${data.consensus_type}`)
    }

    // Approval mode validation
    if (data.approval_mode && !this.isValidApprovalMode(data.approval_mode)) {
      errors.push(`Invalid approval mode: ${data.approval_mode}`)
    }

    // Threshold validation
    if (data.auto_approve_threshold !== undefined) {
      if (data.auto_approve_threshold < 0 || data.auto_approve_threshold > 100) {
        errors.push('Auto approve threshold must be between 0 and 100')
      }
    }

    // Eligible roles validation
    if (data.eligible_roles) {
      const invalidRoles = data.eligible_roles.filter(role => !this.isValidRole(role))
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(', ')}`)
      }
    }

    // Business logic validation
    this.validateApprovalConfigBusinessRules(data, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate approval config update request
   */
  async validateUpdateApprovalConfigRequest(
    configId: string,
    data: UpdateApprovalConfigRequest
  ): Promise<PolicyTemplateValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if config exists
    const existingConfig = await this.db.approval_configs.findUnique({
      where: { id: configId }
    })

    if (!existingConfig) {
      errors.push('Approval config not found')
      return { isValid: false, errors, warnings }
    }

    // Validate updated fields
    if (data.required_approvals !== undefined && data.required_approvals < 1) {
      errors.push('Required approvals must be at least 1')
    }

    if (data.eligible_roles !== undefined) {
      if (!Array.isArray(data.eligible_roles) || data.eligible_roles.length === 0) {
        errors.push('At least one eligible role is required')
      } else {
        const invalidRoles = data.eligible_roles.filter(role => !this.isValidRole(role))
        if (invalidRoles.length > 0) {
          errors.push(`Invalid roles: ${invalidRoles.join(', ')}`)
        }
      }
    }

    if (data.consensus_type !== undefined && !this.isValidConsensusType(data.consensus_type)) {
      errors.push(`Invalid consensus type: ${data.consensus_type}`)
    }

    if (data.approval_mode !== undefined && !this.isValidApprovalMode(data.approval_mode)) {
      errors.push(`Invalid approval mode: ${data.approval_mode}`)
    }

    if (data.auto_approve_threshold !== undefined) {
      if (data.auto_approve_threshold < 0 || data.auto_approve_threshold > 100) {
        errors.push('Auto approve threshold must be between 0 and 100')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check if template name is unique
   */
  async isTemplateNameUnique(templateName: string, excludeTemplateId?: string): Promise<boolean> {
    try {
      const where: any = { template_name: templateName }
      if (excludeTemplateId) {
        where.template_id = { not: excludeTemplateId }
      }

      const existingTemplate = await this.db.policy_templates.findFirst({ where })
      return !existingTemplate
    } catch (error) {
      this.logger.error({ error, templateName }, 'Failed to check template name uniqueness')
      return false
    }
  }

  /**
   * Private helper methods
   */
  private isValidTemplateType(templateType: string): boolean {
    const validTypes = [
      'compliance',
      'investment',
      'redemption',
      'transfer',
      'kyc',
      'aml',
      'approval',
      'workflow'
    ]
    return validTypes.includes(templateType)
  }

  private isValidTemplateStatus(status: string): boolean {
    const validStatuses = ['active', 'inactive', 'draft', 'archived', 'published']
    return validStatuses.includes(status)
  }

  private isValidConsensusType(consensusType: string): boolean {
    const validTypes = ['simple_majority', 'absolute_majority', 'unanimous', 'threshold']
    return validTypes.includes(consensusType)
  }

  private isValidApprovalMode(approvalMode: string): boolean {
    const validModes = ['sequential', 'parallel', 'mixed']
    return validModes.includes(approvalMode)
  }

  private isValidRole(role: string): boolean {
    // This would typically check against a roles table or predefined roles
    const validRoles = [
      'admin',
      'manager',
      'compliance_officer',
      'legal',
      'finance',
      'operations',
      'investor_relations'
    ]
    return validRoles.includes(role)
  }

  private async validateTemplateData(
    templateData: Record<string, any>,
    templateType: string | null | undefined,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Basic structure validation
    if (Object.keys(templateData).length === 0) {
      warnings.push('Template data is empty - template may not be functional')
      return
    }

    // Type-specific validation
    if (templateType) {
      switch (templateType) {
        case 'compliance':
          this.validateComplianceTemplateData(templateData, errors, warnings)
          break
        case 'investment':
          this.validateInvestmentTemplateData(templateData, errors, warnings)
          break
        case 'redemption':
          this.validateRedemptionTemplateData(templateData, errors, warnings)
          break
        case 'approval':
          this.validateApprovalTemplateData(templateData, errors, warnings)
          break
        default:
          warnings.push(`Unknown template type: ${templateType} - validation may be incomplete`)
      }
    }
  }

  private validateComplianceTemplateData(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!data.rules || !Array.isArray(data.rules)) {
      errors.push('Compliance template must have rules array')
    }
    if (!data.requirements) {
      warnings.push('Compliance template should specify requirements')
    }
  }

  private validateInvestmentTemplateData(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!data.investment_limits) {
      warnings.push('Investment template should specify investment limits')
    }
    if (!data.eligibility_criteria) {
      warnings.push('Investment template should specify eligibility criteria')
    }
  }

  private validateRedemptionTemplateData(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!data.redemption_rules) {
      errors.push('Redemption template must have redemption rules')
    }
    if (!data.processing_time) {
      warnings.push('Redemption template should specify processing time')
    }
  }

  private validateApprovalTemplateData(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!data.approval_workflow) {
      errors.push('Approval template must have approval workflow')
    }
    if (!data.approval_levels) {
      warnings.push('Approval template should specify approval levels')
    }
  }

  private async validatePolicyTemplateBusinessRules(
    data: CreatePolicyTemplateRequest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check for duplicate template names
    if (data.template_name) {
      const isUnique = await this.isTemplateNameUnique(data.template_name)
      if (!isUnique) {
        errors.push('Template name already exists')
      }
    }
  }

  private async checkTemplateNameUniqueness(
    existingTemplate: PolicyTemplate,
    updateData: UpdatePolicyTemplateRequest,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (updateData.template_name && updateData.template_name !== existingTemplate.template_name) {
      const isUnique = await this.isTemplateNameUnique(updateData.template_name, existingTemplate.template_id)
      if (!isUnique) {
        errors.push('Template name already exists')
      }
    }
  }

  private validateApprovalConfigBusinessRules(
    data: CreateApprovalConfigRequest,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate consensus type vs required approvals
    if (data.consensus_type === 'unanimous' && data.required_approvals !== data.eligible_roles.length) {
      warnings.push('Unanimous consensus requires approvals from all eligible roles')
    }

    // Validate threshold settings
    if (data.consensus_type === 'threshold' && !data.auto_approve_threshold) {
      errors.push('Threshold consensus type requires auto approve threshold')
    }

    // Validate approval mode vs consensus type
    if (data.approval_mode === 'sequential' && data.consensus_type === 'simple_majority') {
      warnings.push('Sequential approval with simple majority may cause delays')
    }
  }
}
