/**
 * Rules Service Module
 * Centralized exports for all rule-related services
 */

// Main services
export { RuleService } from './RuleService'
export { RuleValidationService } from './RuleValidationService'
export { RuleAnalyticsService } from './RuleAnalyticsService'

// Types from analytics service
export type {
  RuleAnalytics,
  RuleUsageMetrics,
  RuleExportOptions
} from './RuleAnalyticsService'

// Types from main service types
export type {
  Rule,
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleResponse,
  RuleQueryOptions,
  RuleValidationResult
} from '@/types/rule-service'

export {
  RuleType,
  RuleStatus
} from '@/types/rule-service'

// Default exports for convenience
export { RuleService as default } from './RuleService'
