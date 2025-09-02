/**
 * Subscription Management Service Exports
 * Main entry point for subscription and redemption services
 */

export { SubscriptionService } from './SubscriptionService'
export { SubscriptionValidationService } from './SubscriptionValidationService'
export { SubscriptionAnalyticsService } from './SubscriptionAnalyticsService'
export { RedemptionService } from './RedemptionService'

// Export types from the subscriptions module
export type {
  // Core entities
  InvestmentSubscription,
  InvestmentSubscriptionWithDetails,
  RedemptionRequest,
  RedemptionWindow,
  RedemptionApproval,

  // Request/Response types
  InvestmentSubscriptionCreateRequest,
  InvestmentSubscriptionUpdateRequest,
  RedemptionCreateRequest,
  RedemptionUpdateRequest,
  RedemptionApprovalRequest,

  // Query options
  InvestmentSubscriptionQueryOptions,
  RedemptionQueryOptions,

  // Statistics and analytics
  InvestmentSubscriptionStatistics,
  RedemptionStatistics,
  InvestmentSubscriptionAnalytics,
  RedemptionAnalytics,

  // Compliance and validation
  InvestmentSubscriptionComplianceStatus,
  InvestmentSubscriptionValidationResult,
  RedemptionValidationResult,

  // Workflow types
  InvestmentSubscriptionWorkflow,
  InvestmentSubscriptionWorkflowStage,
  RedemptionWorkflow,
  RedemptionWorkflowStage,

  // Bulk operations
  BulkInvestmentSubscriptionRequest,
  BulkInvestmentSubscriptionResult,
  BulkRedemptionRequest,

  // Export options
  InvestmentSubscriptionExportOptions,
  RedemptionExportOptions,

  // Enum types
  InvestmentSubscriptionStatus,
  RedemptionStatus,
  RedemptionType,
  RedemptionWindowStatus,
  RedemptionApprovalStatus,
  PaymentMethod,
  Currency,

  // Service result types
  InvestmentSubscriptionServiceResult,
  PaginatedInvestmentSubscriptionResponse,
  InvestmentSubscriptionCreationResult,
  RedemptionCreationResult
} from '../../types/subscriptions'
