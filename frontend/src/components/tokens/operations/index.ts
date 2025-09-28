/**
 * Token Operations Module - Index
 * 
 * This module provides components for performing operations on deployed tokens
 * including mint, burn, pause, lock, and block operations.
 * 
 * PolicyAware components integrate with the policy engine for automated
 * validation and compliance checking before executing operations.
 */

// Standard Operations
export { default as MintOperation } from './MintOperation';
export { default as BurnOperation } from './BurnOperation';
export { default as PauseOperation } from './PauseOperation';
export { default as LockOperation } from './LockOperation';
export { default as BlockOperation } from './BlockOperation';
export { default as OperationsPanel } from './OperationsPanel';

// PolicyAware Operations with integrated validation
export { PolicyAwareMintOperation } from './PolicyAwareMintOperation';
export { PolicyAwareBurnOperation } from './PolicyAwareBurnOperation';
export { PolicyAwareLockOperation } from './PolicyAwareLockOperation';
export { PolicyAwareBlockOperation } from './PolicyAwareBlockOperation';
export { PolicyAwareUnlockOperation } from './PolicyAwareUnlockOperation';
export { PolicyAwareUnblockOperation } from './PolicyAwareUnblockOperation';
export { PolicyAwareTransferOperation } from './PolicyAwareTransferOperation';

// Type definitions for operation types
export type PolicyAwareOperationType = 
  | 'mint' 
  | 'burn' 
  | 'lock' 
  | 'block' 
  | 'unlock' 
  | 'unblock' 
  | 'transfer';