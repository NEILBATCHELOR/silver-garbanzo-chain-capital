export { UnifiedWalletInterface } from './UnifiedWalletInterface'
export type {
  UnifiedWallet,
  WalletCapabilities,
  WalletUpgradeRequest,
  UnifiedTransactionRequest
} from './UnifiedWalletInterface'

// Re-export Phase 3D types from their respective services
export type {
  SignatureMigrationRequest,
  GuardianApproval,
  SignatureMigrationStatus
} from '../signature-migration/index'

export type {
  RestrictionRule,
  RestrictionRuleData,
  TransactionValidationRequest,
  ValidationResult
} from '../restrictions/index'

export type {
  WalletLock,
  LockRequest,
  UnlockRequest,
  LockStatus
} from '../lock/index'
