/**
 * Rule Service Types
 * Type definitions for rules and policy backend services
 */

/**
 * Core Rule Types - matching database schema
 */
export interface Rule {
  rule_id: string
  rule_name: string
  rule_type: string
  rule_details?: Record<string, any> | null
  created_by: string
  status?: string | null
  created_at?: Date | null
  updated_at?: Date | null
  is_template?: boolean | null
}

export interface CreateRuleRequest {
  rule_name: string
  rule_type: string
  rule_details?: Record<string, any>
  status?: string
  is_template?: boolean
}

export interface UpdateRuleRequest {
  rule_name?: string
  rule_type?: string
  rule_details?: Record<string, any>
  status?: string
  is_template?: boolean
}

export interface RuleResponse extends Rule {
  // Additional computed fields can be added here
}

/**
 * Rule Types enum
 */
export enum RuleType {
  KYC_VERIFICATION = 'kyc_verification',
  AML_SANCTIONS = 'aml_sanctions',
  ACCREDITED_INVESTOR = 'accredited_investor',
  LOCKUP_PERIOD = 'lockup_period',
  TRANSFER_LIMIT = 'transfer_limit',
  VELOCITY_LIMIT = 'velocity_limit',
  VOLUME_SUPPLY_LIMIT = 'volume_supply_limit',
  WHITELIST_TRANSFER = 'whitelist_transfer',
  INVESTOR_POSITION_LIMIT = 'investor_position_limit',
  INVESTOR_TRANSACTION_LIMIT = 'investor_transaction_limit',
  RISK_PROFILE = 'risk_profile',
  REDEMPTION = 'redemption',
  STANDARD_REDEMPTION = 'standard_redemption',
  INTERVAL_FUND_REDEMPTION = 'interval_fund_redemption',
  TOKENIZED_FUND = 'tokenized_fund'
}

/**
 * Rule Status enum
 */
export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

/**
 * Query and pagination types
 */
export interface RuleQueryOptions {
  page?: number
  limit?: number
  rule_type?: string
  status?: string
  is_template?: boolean
  search?: string
  created_by?: string
}

export interface RuleValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Export Options Types
 */
export interface RuleExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  includeInactive?: boolean
  ruleTypes?: string[]
  dateFrom?: string
  dateTo?: string
}
