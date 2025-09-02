/**
 * Policy Service Types
 * Type definitions for policy template backend services
 */

/**
 * Core Policy Template Types - matching database schema
 */
export interface PolicyTemplate {
  template_id: string
  template_name: string
  description?: string | null
  template_data: Record<string, any>
  created_by: string
  created_at?: Date | null
  updated_at?: Date | null
  template_type?: string | null
  status: string
}

export interface CreatePolicyTemplateRequest {
  template_name: string
  description?: string
  template_data: Record<string, any>
  template_type?: string
  status?: string
}

export interface UpdatePolicyTemplateRequest {
  template_name?: string
  description?: string
  template_data?: Record<string, any>
  template_type?: string
  status?: string
}

export interface PolicyTemplateResponse extends PolicyTemplate {
  // Additional computed fields can be added here
}

/**
 * Policy Template Types enum
 */
export enum PolicyTemplateType {
  COMPLIANCE = 'compliance',
  INVESTMENT = 'investment',
  REDEMPTION = 'redemption',
  TRANSFER = 'transfer',
  KYC = 'kyc',
  AML = 'aml',
  APPROVAL = 'approval',
  WORKFLOW = 'workflow'
}

/**
 * Policy Template Status enum
 */
export enum PolicyTemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  PUBLISHED = 'published'
}

/**
 * Query and pagination types
 */
export interface PolicyTemplateQueryOptions {
  page?: number
  limit?: number
  template_type?: string
  status?: string
  search?: string
  created_by?: string
}

export interface PolicyTemplateValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Approval Config Types - matching approval_configs table
 */
export interface ApprovalConfig {
  id: string
  permission_id: string
  required_approvals: number
  eligible_roles: string[]
  auto_approval_conditions?: Record<string, any> | null
  created_at?: Date | null
  updated_at?: Date | null
  consensus_type: string
  config_name?: string | null
  config_description?: string | null
  approval_mode?: string | null
  requires_all_approvers?: boolean | null
  auto_approve_threshold?: number | null
  escalation_config?: Record<string, any> | null
  notification_config?: Record<string, any> | null
  active?: boolean | null
  created_by?: string | null
  last_modified_by?: string | null
}

export interface CreateApprovalConfigRequest {
  permission_id: string
  required_approvals: number
  eligible_roles: string[]
  consensus_type: string
  config_name?: string
  config_description?: string
  approval_mode?: string
  requires_all_approvers?: boolean
  auto_approve_threshold?: number
  auto_approval_conditions?: Record<string, any>
  escalation_config?: Record<string, any>
  notification_config?: Record<string, any>
  active?: boolean
}

export interface UpdateApprovalConfigRequest {
  required_approvals?: number
  eligible_roles?: string[]
  consensus_type?: string
  config_name?: string
  config_description?: string
  approval_mode?: string
  requires_all_approvers?: boolean
  auto_approve_threshold?: number
  auto_approval_conditions?: Record<string, any>
  escalation_config?: Record<string, any>
  notification_config?: Record<string, any>
  active?: boolean
}

export interface ApprovalConfigResponse extends ApprovalConfig {
  // Additional computed fields can be added here
}

/**
 * Approval Config enums
 */
export enum ConsensusType {
  SIMPLE_MAJORITY = 'simple_majority',
  ABSOLUTE_MAJORITY = 'absolute_majority',
  UNANIMOUS = 'unanimous',
  THRESHOLD = 'threshold'
}

export enum ApprovalMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  MIXED = 'mixed'
}

/**
 * Export Options Types
 */
export interface PolicyExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  includeInactive?: boolean
  templateTypes?: string[]
  dateFrom?: string
  dateTo?: string
  includeApprovalConfigs?: boolean
}
