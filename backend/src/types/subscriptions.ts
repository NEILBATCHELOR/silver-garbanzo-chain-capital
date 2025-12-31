/**
 * Subscription Management Service Types
 * 
 * Comprehensive type definitions for subscription and redemption operations
 * Covers investment processing, approval workflows, and compliance tracking
 */

import type { ServiceResult, PaginatedResponse } from './index'
import { Decimal } from 'decimal.js'

// ===============================
// Core Entity Types
// ===============================

// Database entity types (matching Prisma schema)
export interface InvestmentSubscriptionDB {
  id: string
  investor_id: string
  subscription_id: string
  fiat_amount: Decimal
  currency: string
  confirmed: boolean
  allocated: boolean
  distributed: boolean
  notes: string | null
  subscription_date: Date | null
  created_at: Date | null
  updated_at: Date | null
  project_id: string | null
}

// API response types (converted from database)
export interface InvestmentSubscription {
  id: string
  investor_id: string
  subscription_id: string
  fiat_amount: number
  currency: string
  confirmed: boolean
  allocated: boolean
  distributed: boolean
  notes?: string
  subscription_date?: Date
  created_at?: Date
  updated_at?: Date
  project_id?: string
}

export interface InvestmentSubscriptionWithDetails extends InvestmentSubscription {
  investor?: {
    investor_id: string
    name: string
    email: string
    investor_type: string
  }
  project?: {
    id: string
    name: string
    status: string
  }
  statistics?: InvestmentSubscriptionStatistics
  compliance_status?: InvestmentSubscriptionComplianceStatus
}

// Database entity types (matching Prisma schema)
export interface RedemptionRequestDB {
  id: string
  token_amount: Decimal
  token_type: string
  redemption_type: string
  status: string
  source_wallet_address: string
  destination_wallet_address: string
  conversion_rate: Decimal
  investor_name: string | null
  investor_id: string | null
  required_approvals: number
  is_bulk_redemption: boolean | null
  investor_count: number | null
  rejection_reason: string | null
  rejected_by: string | null
  rejection_timestamp: Date | null
  created_at: Date
  updated_at: Date
}

// API response types (converted from database)
export interface RedemptionRequest {
  id: string
  token_amount: number
  token_type: string
  redemption_type: string
  status: RedemptionStatus
  source_wallet_address: string
  destination_wallet_address: string
  conversion_rate: number
  investor_name?: string
  investor_id?: string
  required_approvals: number
  is_bulk_redemption?: boolean
  investor_count?: number
  rejection_reason?: string
  rejected_by?: string
  rejection_timestamp?: Date
  created_at: Date
  updated_at: Date
}

// Database entity types (matching Prisma schema)
export interface RedemptionWindowDB {
  id: string
  config_id: string
  start_date: Date
  end_date: Date
  submission_start_date: Date
  submission_end_date: Date
  nav: Decimal | null
  nav_date: Date | null
  nav_source: string | null
  status: string
  max_redemption_amount: Decimal | null
  current_requests: number | null
  total_request_value: Decimal | null
  approved_requests: number | null
  approved_value: Decimal | null
  rejected_requests: number | null
  rejected_value: Decimal | null
  queued_requests: number | null
  queued_value: Decimal | null
  processed_by: string | null
  processed_at: Date | null
  notes: string | null
  created_at: Date | null
  updated_at: Date | null
  created_by: string | null
}

// API response types (converted from database)
export interface RedemptionWindow {
  id: string
  config_id: string
  start_date: Date
  end_date: Date
  submission_start_date: Date
  submission_end_date: Date
  nav?: number
  nav_date?: Date
  nav_source?: string
  status: RedemptionWindowStatus
  max_redemption_amount?: number
  current_requests?: number
  total_request_value?: number
  approved_requests?: number
  approved_value?: number
  rejected_requests?: number
  rejected_value?: number
  queued_requests?: number
  queued_value?: number
  processed_by?: string
  processed_at?: Date
  notes?: string
  created_at?: Date
  updated_at?: Date
  created_by?: string
}

// Database entity types (matching Prisma schema)
export interface RedemptionApprovalDB {
  id: string
  redemption_request_id: string
  approval_config_id: string
  approver_user_id: string
  assigned_at: Date | null
  status: string | null
  approval_timestamp: Date | null
  rejection_reason: string | null
  comments: string | null
  approval_signature: string | null
  ip_address: string | null
  user_agent: string | null
}

// API response types (converted from database)
export interface RedemptionApproval {
  id: string
  redemption_request_id: string
  approval_config_id: string
  approver_user_id: string
  assigned_at?: Date
  status?: RedemptionApprovalStatus
  approval_timestamp?: Date
  rejection_reason?: string
  comments?: string
  approval_signature?: string
  ip_address?: string
  user_agent?: string
}

// ===============================
// Enum Types
// ===============================

export type InvestmentSubscriptionStatus = 'pending' | 'confirmed' | 'allocated' | 'distributed' | 'cancelled' | 'failed'

export type RedemptionStatus = 
  | 'submitted' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'processing' 
  | 'completed' 
  | 'cancelled'
  | 'failed'

export type RedemptionType = 'full' | 'partial' | 'dividend' | 'liquidation'

export type RedemptionWindowStatus = 'upcoming' | 'open' | 'closed' | 'processing' | 'completed' | 'cancelled'

export type RedemptionApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export type PaymentMethod = 'wire_transfer' | 'credit_card' | 'crypto' | 'ach' | 'check' | 'other'

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'SGD' | 'HKD' | 'CNY'

// ===============================
// Request/Response Types
// ===============================

export interface InvestmentSubscriptionCreateRequest {
  investor_id: string
  project_id?: string
  fiat_amount: number
  currency: Currency
  payment_method?: PaymentMethod
  notes?: string
  subscription_date?: Date
  auto_allocate?: boolean
  compliance_check?: boolean
}

export interface InvestmentSubscriptionUpdateRequest {
  fiat_amount?: number
  currency?: Currency
  confirmed?: boolean
  allocated?: boolean
  distributed?: boolean
  notes?: string
  subscription_date?: Date
}

export interface RedemptionCreateRequest {
  token_amount: number
  token_type: string
  redemption_type: RedemptionType
  source_wallet_address: string
  destination_wallet_address: string
  investor_id?: string
  conversion_rate?: number
  notes?: string
  required_approvals?: number
}

export interface RedemptionUpdateRequest {
  token_amount?: number
  redemption_type?: RedemptionType
  status?: RedemptionStatus
  destination_wallet_address?: string
  conversion_rate?: number
  notes?: string
}

export interface RedemptionApprovalRequest {
  redemption_request_id: string
  approver_user_id: string
  action: 'approve' | 'reject'
  comments?: string
  rejection_reason?: string
  approval_signature?: string
}

// ===============================
// Query Options
// ===============================

export interface InvestmentSubscriptionQueryOptions {
  page?: number
  limit?: number
  search?: string
  investor_id?: string
  project_id?: string
  currency?: Currency[]
  status?: InvestmentSubscriptionStatus[]
  confirmed?: boolean
  allocated?: boolean
  distributed?: boolean
  amount_min?: number
  amount_max?: number
  created_from?: Date
  created_to?: Date
  subscription_date_from?: Date
  subscription_date_to?: Date
  include_statistics?: boolean
  include_investor?: boolean
  include_project?: boolean
  sort_by?: 'created_at' | 'subscription_date' | 'fiat_amount' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface RedemptionQueryOptions {
  page?: number
  limit?: number
  search?: string
  investor_id?: string
  status?: RedemptionStatus[]
  redemption_type?: RedemptionType[]
  token_type?: string[]
  amount_min?: number
  amount_max?: number
  created_from?: Date
  created_to?: Date
  requires_approval?: boolean
  is_bulk_redemption?: boolean
  include_approvals?: boolean
  include_window?: boolean
  sort_by?: 'created_at' | 'token_amount' | 'updated_at' | 'status'
  sort_order?: 'asc' | 'desc'
}

// ===============================
// Statistics and Analytics
// ===============================

export interface InvestmentSubscriptionStatistics {
  total_amount: number
  currency_breakdown: Record<Currency, number>
  confirmed_amount: number
  allocated_amount: number
  distributed_amount: number
  pending_amount: number
  average_subscription_size: number
  investor_count: number
  project_count: number
  completion_rate: number
  first_subscription_date?: Date
  last_subscription_date?: Date
}

export interface RedemptionStatistics {
  total_requests: number
  total_token_amount: number
  approved_requests: number
  approved_amount: number
  rejected_requests: number
  rejected_amount: number
  pending_requests: number
  pending_amount: number
  average_redemption_size: number
  average_approval_time: number
  completion_rate: number
  rejection_rate: number
}

export interface InvestmentSubscriptionAnalytics {
  summary: InvestmentSubscriptionStatistics
  trends: {
    monthly_subscriptions: Array<{
      month: string
      count: number
      total_amount: number
      currency_breakdown: Record<Currency, number>
    }>
    investor_trends: Array<{
      investor_id: string
      investor_name: string
      total_subscriptions: number
      total_amount: number
      average_size: number
    }>
    project_trends: Array<{
      project_id: string
      project_name: string
      subscription_count: number
      total_raised: number
    }>
  }
  demographics: {
    by_currency: Record<Currency, { count: number; amount: number; percentage: number }>
    by_investor_type: Record<string, { count: number; amount: number; percentage: number }>
    by_subscription_size: Array<{
      range: string
      count: number
      amount: number
      percentage: number
    }>
  }
}

export interface RedemptionAnalytics {
  summary: RedemptionStatistics
  trends: {
    monthly_redemptions: Array<{
      month: string
      count: number
      total_amount: number
      approval_rate: number
    }>
    window_performance: Array<{
      window_id: string
      window_period: string
      request_count: number
      approval_rate: number
      processing_time: number
    }>
  }
  workflow_metrics: {
    average_approval_time: number
    approval_rate_by_type: Record<RedemptionType, number>
    rejection_reasons: Array<{
      reason: string
      count: number
      percentage: number
    }>
  }
}

// ===============================
// Compliance and Validation
// ===============================

export interface InvestmentSubscriptionComplianceStatus {
  kyc_verified: boolean
  accreditation_verified: boolean
  aml_cleared: boolean
  investment_limits_ok: boolean
  regulatory_approved: boolean
  document_requirements_met: boolean
  overall_status: 'compliant' | 'pending' | 'non_compliant'
  issues: string[]
  required_actions: string[]
}

export interface InvestmentSubscriptionValidationResult {
  is_valid: boolean
  validation_errors: string[]
  compliance_issues: string[]
  business_rules_passed: boolean
  required_approvals: string[]
  estimated_processing_time: number
  risk_score: number
  recommendations: string[]
  blocking_issues: string[]
  warning_issues: string[]
}

export interface RedemptionValidationResult {
  is_valid: boolean
  validation_errors: string[]
  compliance_issues: string[]
  workflow_requirements: string[]
  approval_requirements: {
    required_approvers: number
    assigned_approvers: string[]
    missing_approvers: number
  }
  eligibility_check: {
    wallet_verified: boolean
    token_balance_sufficient: boolean
    redemption_window_open: boolean
    investor_eligible: boolean
  }
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high'
    risk_factors: string[]
    additional_checks_required: string[]
  }
  estimated_completion_time: number
}

// ===============================
// Bulk Operations
// ===============================

export interface BulkInvestmentSubscriptionRequest {
  subscriptions: InvestmentSubscriptionCreateRequest[]
  options?: {
    validate_before_create?: boolean
    auto_allocate?: boolean
    compliance_check?: boolean
    continue_on_error?: boolean
  }
}

export interface BulkInvestmentSubscriptionResult {
  successful: InvestmentSubscriptionWithDetails[]
  failed: Array<{
    subscription: InvestmentSubscriptionCreateRequest
    error: string
    index: number
  }>
  summary: {
    total: number
    success: number
    failed: number
    total_amount: number
    successful_amount: number
  }
}

export interface BulkRedemptionRequest {
  redemptions: RedemptionCreateRequest[]
  options?: {
    validate_before_create?: boolean
    auto_assign_approvers?: boolean
    continue_on_error?: boolean
  }
}

// ===============================
// Workflow and Process Types
// ===============================

export interface InvestmentSubscriptionWorkflow {
  subscription_id: string
  current_stage: InvestmentSubscriptionWorkflowStage
  completed_stages: InvestmentSubscriptionWorkflowStage[]
  pending_stages: InvestmentSubscriptionWorkflowStage[]
  workflow_data: Record<string, any>
  estimated_completion: Date
  actual_completion?: Date
  blocked_reason?: string
}

export type InvestmentSubscriptionWorkflowStage = 
  | 'created'
  | 'compliance_check'
  | 'payment_verification'
  | 'allocation'
  | 'distribution'
  | 'completed'

export interface RedemptionWorkflow {
  redemption_id: string
  current_stage: RedemptionWorkflowStage
  completed_stages: RedemptionWorkflowStage[]
  pending_stages: RedemptionWorkflowStage[]
  approvals: RedemptionApproval[]
  workflow_data: Record<string, any>
  estimated_completion: Date
  actual_completion?: Date
  blocked_reason?: string
}

export type RedemptionWorkflowStage = 
  | 'submitted'
  | 'validation'
  | 'approval_required'
  | 'approved'
  | 'processing'
  | 'settlement'
  | 'completed'

// ===============================
// Export/Import Types
// ===============================

export interface InvestmentSubscriptionExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  filters?: InvestmentSubscriptionQueryOptions
  include_investor_details?: boolean
  include_project_details?: boolean
  include_statistics?: boolean
  date_range?: {
    from: Date
    to: Date
  }
}

export interface RedemptionExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  filters?: RedemptionQueryOptions
  include_approval_details?: boolean
  include_workflow_history?: boolean
  date_range?: {
    from: Date
    to: Date
  }
}

// ===============================
// Service Result Types
// ===============================

export type InvestmentSubscriptionServiceResult<T> = ServiceResult<T>
export type PaginatedInvestmentSubscriptionResponse<T> = PaginatedResponse<T>

// Creation result with additional context
export interface InvestmentSubscriptionCreationResult {
  subscription: InvestmentSubscriptionWithDetails
  validation: InvestmentSubscriptionValidationResult
  compliance_status: InvestmentSubscriptionComplianceStatus
  workflow: InvestmentSubscriptionWorkflow
  next_steps: string[]
}

export interface RedemptionCreationResult {
  redemption: RedemptionRequest
  validation: RedemptionValidationResult
  workflow: RedemptionWorkflow
  assigned_approvers: string[]
  estimated_completion: Date
}
