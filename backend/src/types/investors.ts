/**
 * Investor Domain Types
 * Types specific to investor onboarding, KYC, and management
 */

import type { PaginatedResponse, ServiceResult } from './index'

/**
 * Investor KYC Status Enum
 */
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'failed' | 'expired'

/**
 * Investor Status Enum
 */
export type InvestorStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected'

/**
 * Investor Type Enum
 */
export type InvestorType = 'individual' | 'corporate' | 'institutional' | 'fund' | 'trust'

/**
 * Accreditation Status Enum
 */
export type AccreditationStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired'

/**
 * Core Investor interface matching database schema
 * Note: Database nullable fields can be null, so we accept both null and undefined
 */
export interface Investor {
  investor_id: string
  name: string
  email: string
  type: string
  wallet_address?: string | null
  kyc_status: KycStatus
  lastUpdated?: string | null
  verification_details?: any | null
  created_at?: Date | null
  updated_at?: Date | null
  kyc_expiry_date?: Date | null
  company?: string | null
  notes?: string | null
  investor_status?: InvestorStatus | null
  investor_type?: InvestorType | null
  onboarding_completed?: boolean | null
  risk_assessment?: any | null
  profile_data?: any | null
  accreditation_status?: AccreditationStatus | null
  accreditation_expiry_date?: Date | null
  accreditation_type?: string | null
  tax_residency?: string | null
  tax_id_number?: string | null
  investment_preferences?: any | null
  last_compliance_check?: Date | null
}

/**
 * Enhanced investor with computed statistics
 */
export interface InvestorWithStats extends Investor {
  statistics?: InvestorStatistics | null
  compliance_score?: number | null
  total_investments?: number | null
  active_projects?: number | null
  last_activity?: Date | null
  groups?: InvestorGroup[] | null
  cap_table_entries?: any[] | null
}

/**
 * Investor statistics interface
 */
export interface InvestorStatistics {
  total_invested: number
  number_of_investments: number
  active_projects: number
  completed_projects: number
  average_investment_size: number
  portfolio_value: number
  kyc_compliance_rate: number
  accreditation_status_current: boolean
  last_investment_date?: Date
  first_investment_date?: Date
  preferred_investment_types: string[]
  geographic_exposure: Record<string, number>
  sector_exposure: Record<string, number>
}

/**
 * Investor Group interface
 * Note: Database nullable fields can be null, so we accept both null and undefined
 */
export interface InvestorGroup {
  id: string
  name: string
  description?: string | null
  project_id?: string | null
  member_count: number
  group?: string | null
  created_at?: Date | null
  updated_at?: Date | null
}

/**
 * Investor Group Member interface
 */
export interface InvestorGroupMember {
  group_id: string
  investor_id: string
  created_at: Date
}

/**
 * Investor creation request
 */
export interface InvestorCreateRequest {
  name: string
  email: string
  type: string
  investor_type?: InvestorType
  wallet_address?: string
  company?: string
  notes?: string
  tax_residency?: string
  tax_id_number?: string
  profile_data?: {
    phone?: string
    nationality?: string
    residence_country?: string
    date_of_birth?: string
    employment_status?: string
    annual_income?: number
    net_worth?: number
    source_of_funds?: string
    investment_objectives?: string
  }
  risk_assessment?: {
    risk_tolerance?: string
    investment_experience?: string
    liquidity_needs?: string
    time_horizon?: string
  }
  investment_preferences?: {
    preferred_sectors?: string[]
    preferred_regions?: string[]
    minimum_investment?: number
    maximum_investment?: number
    preferred_project_types?: string[]
  }
}

/**
 * Investor update request
 */
export interface InvestorUpdateRequest extends Partial<Omit<InvestorCreateRequest, 'email'>> {
  investor_status?: InvestorStatus
  kyc_status?: KycStatus
  kyc_expiry_date?: Date
  accreditation_status?: AccreditationStatus
  accreditation_type?: string
  accreditation_expiry_date?: Date
  verification_details?: any
  last_compliance_check?: Date
}

/**
 * Investor query options
 */
export interface InvestorQueryOptions {
  page?: number
  limit?: number
  search?: string
  investor_status?: InvestorStatus[]
  kyc_status?: KycStatus[]
  investor_type?: InvestorType[]
  accreditation_status?: AccreditationStatus[]
  include_statistics?: boolean
  include_groups?: boolean
  include_cap_table?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  created_from?: Date
  created_to?: Date
  kyc_expiry_from?: Date
  kyc_expiry_to?: Date
  has_wallet?: boolean
  compliance_score_min?: number
  investment_amount_min?: number
  investment_amount_max?: number
}

/**
 * Investor validation result
 */
export interface InvestorValidationResult {
  is_valid: boolean
  missing_fields: string[]
  validation_errors: string[]
  compliance_issues: string[]
  kyc_requirements: string[]
  accreditation_requirements: string[]
  completion_percentage: number
  business_rules_passed: boolean
  required_documents: string[]
}

/**
 * Investor creation result
 */
export interface InvestorCreationResult {
  investor: InvestorWithStats
  validation: InvestorValidationResult
  groups_assigned?: InvestorGroup[]
  compliance_status: {
    kyc_required: boolean
    accreditation_required: boolean
    additional_documentation: string[]
  }
}

/**
 * Bulk investor update request
 */
export interface BulkInvestorUpdateRequest {
  investor_ids: string[]
  updates: InvestorUpdateRequest
  options?: {
    validate_before_update?: boolean
    create_audit_log?: boolean
    notify_investors?: boolean
  }
}

/**
 * Investor compliance summary
 */
export interface InvestorComplianceSummary {
  investor_id: string
  overall_score: number
  kyc_status: KycStatus
  kyc_expiry?: Date
  accreditation_status: AccreditationStatus
  accreditation_expiry?: Date
  outstanding_requirements: string[]
  last_check: Date
  next_review_due?: Date
  risk_level: 'low' | 'medium' | 'high'
  regulatory_flags: string[]
}

/**
 * Investor onboarding data structure
 */
export interface InvestorOnboardingData {
  name: string
  email: string
  phone?: string
  nationality?: string
  residenceCountry?: string
  dateOfBirth?: string
  investorType?: string
  riskTolerance?: string
  investmentExperience?: string
  employmentStatus?: string
  annualIncome?: number
  netWorth?: number
  sourceOfFunds?: string
  investmentObjectives?: string
}

/**
 * KYC submission data structure
 */
export interface KycSubmissionData {
  investor_id: string
  documents: {
    type: string
    file_url: string
    file_name: string
    file_size: number
  }[]
  personal_info: Record<string, any>
  financial_info: Record<string, any>
}

/**
 * Investor analytics data
 */
export interface InvestorAnalytics {
  investor_id: string
  summary: {
    total_invested: number
    total_projects: number
    average_investment: number
    portfolio_performance: number
    roi_percentage: number
  }
  timeline: Array<{
    date: string
    cumulative_invested: number
    new_investments: number
    portfolio_value: number
  }>
  project_breakdown: Array<{
    project_id: string
    project_name: string
    amount_invested: number
    current_value: number
    roi: number
    status: string
  }>
  risk_profile: {
    risk_score: number
    diversification_score: number
    concentration_risk: number
    recommended_actions: string[]
  }
}

/**
 * Investor audit trail entry
 */
export interface InvestorAuditEntry {
  id: string
  investor_id: string
  action: string
  user_id: string
  user_name: string
  timestamp: Date
  details: any
  ip_address?: string
  user_agent?: string
}

/**
 * Service response types
 */
export type InvestorResponse = ServiceResult<InvestorWithStats>
export type InvestorsResponse = PaginatedResponse<InvestorWithStats>
export type InvestorValidationResponse = ServiceResult<InvestorValidationResult>
export type InvestorCreationResponse = ServiceResult<InvestorCreationResult>
export type InvestorComplianceResponse = ServiceResult<InvestorComplianceSummary>
export type InvestorAnalyticsResponse = ServiceResult<InvestorAnalytics>
export type InvestorAuditResponse = PaginatedResponse<InvestorAuditEntry>
