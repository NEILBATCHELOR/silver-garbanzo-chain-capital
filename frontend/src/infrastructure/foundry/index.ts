/**
 * Foundry Infrastructure Index
 * Exports adapters, executors, and hooks for on-chain policy enforcement
 */

// Core adapters and executors
export { FoundryPolicyAdapter } from './FoundryPolicyAdapter';
export { FoundryOperationExecutor } from './FoundryOperationExecutor';

// React hooks
export { useFoundryOperations } from './hooks/useFoundryOperations';

// Types
export type { 
  OnChainPolicy, 
  ValidationResult as OnChainValidationResult,
  FoundryPolicyConfig 
} from './FoundryPolicyAdapter';

export type { 
  FoundryExecutorConfig 
} from './FoundryOperationExecutor';

export type { 
  UseFoundryOperationsResult 
} from './hooks/useFoundryOperations';
