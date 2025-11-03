/**
 * Token Operations Module - Index
 * 
 * This module provides Policy-Aware components for performing operations on deployed tokens
 * with integrated policy validation and compliance checking.
 * 
 * PolicyAware components integrate with the Policy Engine for automated
 * validation and compliance checking before executing operations.
 */

// Main Operations Panel with Policy Integration
export { default as PolicyAwareOperationsPanel } from './PolicyAwareOperationsPanel';

// Legacy Operations Panel (for backward compatibility - remove after migration)
export { default as OperationsPanel } from './OperationsPanel';

// PolicyAware Operations with integrated validation
export { PolicyAwareMintOperation } from './PolicyAwareMintOperation';
export { PolicyAwareBurnOperation } from './PolicyAwareBurnOperation';
export { PolicyAwareLockOperation } from './PolicyAwareLockOperation';
export { PolicyAwareBlockOperation } from './PolicyAwareBlockOperation';
export { PolicyAwareUnlockOperation } from './PolicyAwareUnlockOperation';
export { PolicyAwareUnblockOperation } from './PolicyAwareUnblockOperation';
export { PolicyAwareTransferOperation } from './PolicyAwareTransferOperation';
export { PolicyAwarePauseOperation } from './PolicyAwarePauseOperation';

// 🆕 Advanced Management Operations
export { PolicyAwareRoleManagementOperation } from './PolicyAwareRoleManagementOperation';
export { ModuleManagementPanel } from './ModuleManagementPanel';
export { UpdateMaxSupplyOperation } from './UpdateMaxSupplyOperation';

// Type definitions for operation types
export type PolicyAwareOperationType = 
  | 'mint' 
  | 'burn' 
  | 'lock' 
  | 'block' 
  | 'unlock' 
  | 'unblock' 
  | 'transfer'
  | 'pause'
  | 'unpause'
  | 'grantRole'
  | 'revokeRole'
  | 'setModule'
  | 'updateMaxSupply';

// Configuration type for PolicyAware operations
export interface PolicyAwareOperationConfig {
  requireApproval?: boolean;
  maxRetries?: number;
  validationTimeout?: number;
  bypassPolicies?: string[]; // Policy IDs that can be bypassed with approval
}

// Export status type for policy validation results
export interface PolicyValidationStatus {
  valid: boolean;
  violations: Array<{
    policyId: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}
