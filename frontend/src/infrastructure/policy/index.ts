/**
 * Policy Infrastructure Module
 * Central export point for all policy and rule evaluation components
 */

// Core Policy Engine
export { PolicyEngine } from './PolicyEngine';
export { PolicyEvaluator } from './PolicyEvaluator';
export { PolicyContextBuilder } from './PolicyContext';
export { PolicyRepository } from './PolicyRepository';

// 🆕 Phase 5: Hybrid Policy Engine
export { HybridPolicyEngine } from './HybridPolicyEngine';
export type { EnforcementMode, HybridConfig, LayerResult } from './HybridPolicyEngine';

// Rule Evaluation Pipeline (Stage 2)
export { RuleEvaluationPipeline } from './rules/RuleEvaluationPipeline';
export { RuleContext } from './rules/RuleContext';
export { RuleCache } from './rules/RuleCache';

// Rule Processors
export {
  RuleProcessor,
  AmountRuleProcessor,
  TimeRuleProcessor,
  AddressRuleProcessor,
  FrequencyRuleProcessor,
  ComplianceRuleProcessor
} from './rules/processors';

// Conflict Resolvers
export { ConflictResolver } from './rules/resolvers/ConflictResolver';
export { PriorityResolver } from './rules/resolvers/PriorityResolver';

// Validators
export { 
  MintValidator,
  BurnValidator,
  TransferValidator,
  LockValidator
} from './validators';

// Types
export type {
  // Policy types
  CryptoOperation,
  PolicyContext,
  PolicyEvaluationResult,
  PolicyEngineConfig,
  PolicyResult,
  PolicyViolation,
  PolicyCacheEntry,
  
  // Rule types
  RuleEvaluationContext,
  GlobalRuleState,
  UserProfile,
  RiskFactors,
  ComplianceStatus,
  MarketConditions,
  RuleResult,
  ConditionResult,
  PipelineResult,
  RuleConflict,
  ConflictType,
  ConflictResolution,
  PolicyRuleExtended,
  RuleDetails,
  TimeWindow,
  RuleValidationError,
  RuleEvaluationMetrics,
  FailureReason
} from './types';

export type {
  RuleCacheEntry
} from './rules/types';

// Utility functions
export {
  isAmountRule,
  isTimeRule,
  isAddressRule,
  isFrequencyRule,
  isComplianceRule
} from './rules/types';
