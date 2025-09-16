/**
 * Account Abstraction Components
 * 
 * Export all EIP-4337 account abstraction UI components
 * Integrates with backend UserOperationService, PaymasterService, and BatchOperationService
 */

export { UserOperationBuilder } from './UserOperationBuilder'
export { GaslessTransactionInterface } from './GaslessTransactionInterface'
export { SocialRecoveryInterface } from './SocialRecoveryInterface'

// Re-export types for components that need them
export type {
  BatchOperation,
  PaymasterPolicy,
  GasPolicy,
  UserOperationPreview,
  UserOperationStatus
} from './UserOperationBuilder'

export type {
  GaslessTransactionRequest,
  PaymasterQuote,
  GaslessTransactionStatus
} from './GaslessTransactionInterface'

export type {
  Guardian,
  RecoveryProcess,
  GuardianPolicy,
  RecoveryRequest
} from './SocialRecoveryInterface'
