/**
 * Investor Services Module
 * Exports all investor-related services
 */

export { InvestorService } from './InvestorService'
export { InvestorValidationService } from './InvestorValidationService'
export { InvestorAnalyticsService } from './InvestorAnalyticsService'
export { InvestorGroupService } from './InvestorGroupService'

// Re-export types for convenience
export type {
  Investor,
  InvestorWithStats,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  InvestorQueryOptions,
  InvestorStatistics,
  InvestorValidationResult,
  InvestorCreationResult,
  BulkInvestorUpdateRequest,
  InvestorComplianceSummary,
  InvestorGroup,
  InvestorGroupMember,
  InvestorOnboardingData,
  KycSubmissionData,
  InvestorAnalytics,
  InvestorAuditEntry,
  KycStatus,
  InvestorStatus,
  InvestorType,
  AccreditationStatus,
  InvestorResponse,
  InvestorsResponse,
  InvestorValidationResponse,
  InvestorCreationResponse,
  InvestorComplianceResponse,
  InvestorAnalyticsResponse,
  InvestorAuditResponse
} from '@/types/investors'
