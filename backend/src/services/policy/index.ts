/**
 * Policy Service Module
 * Centralized exports for all policy-related services
 */

// Main services
export { PolicyService } from './PolicyService'
export { PolicyValidationService } from './PolicyValidationService' 
export { PolicyAnalyticsService } from './PolicyAnalyticsService'

// Types from analytics service
export type {
  PolicyAnalytics,
  PolicyUsageMetrics,
  PolicyExportOptions,
  ApprovalConfigAnalytics
} from './PolicyAnalyticsService'

// Types from main service types
export type {
  PolicyTemplate,
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateResponse,
  PolicyTemplateQueryOptions,
  PolicyTemplateValidationResult,
  ApprovalConfig,
  CreateApprovalConfigRequest,
  UpdateApprovalConfigRequest,
  ApprovalConfigResponse
} from '@/types/policy-service'

export {
  PolicyTemplateType,
  PolicyTemplateStatus,
  ConsensusType,
  ApprovalMode
} from '@/types/policy-service'

// Default exports for convenience
export { PolicyService as default } from './PolicyService'
