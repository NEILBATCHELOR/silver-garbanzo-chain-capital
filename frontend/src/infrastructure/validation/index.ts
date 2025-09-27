/**
 * Validation Infrastructure Index
 * Stage 4: Real-time Transaction Validation
 */

// Core validator
export { TransactionValidator } from './TransactionValidator';
export type {
  ValidationRequest,
  ValidationResponse,
  PolicyCheck,
  RuleCheck,
  ValidationWarning,
  ValidationError,
  GasEstimate,
  SimulationResult,
  StateChange,
  SimulatedEvent,
  ApprovalRequirement,
  Recommendation,
  ValidatorConfig
} from './TransactionValidator';

// Cache
export { ValidationCache } from './ValidationCache';
export type { CachedValidation, CacheConfig, CacheStats } from './ValidationCache';

// Simulators
export { TransactionSimulator } from './simulators/TransactionSimulator';
export { StatePredictor } from './simulators/StatePredictor';

// Monitors
export { RealTimeMonitor } from './monitors/RealTimeMonitor';
export { AlertManager } from './monitors/AlertManager';
export type {
  MonitorConfig,
  TransactionEvent,
  MonitorAlert,
  MonitorCallback,
  MonitoringStats
} from './monitors/RealTimeMonitor';
export type {
  AlertConfig,
  AlertChannel,
  AlertThresholds,
  AlertStatistics
} from './monitors/AlertManager';

// React hooks
export {
  useTransactionValidation,
  useValidationMonitoring,
  useValidationCache,
  usePolicyValidation,
  useRuleValidation,
  useGasEstimation
} from './hooks/PreTransactionHooks';
export type {
  ValidationOptions,
  UseTransactionValidationReturn
} from './hooks/PreTransactionHooks';
