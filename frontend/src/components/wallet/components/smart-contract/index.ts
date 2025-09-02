/**
 * Smart Contract Wallet Components - Index
 * 
 * Exports all smart contract wallet components for easy importing
 */

export { UnifiedWalletDashboard } from './UnifiedWalletDashboard'
export { SignatureMigrationFlow } from './SignatureMigrationFlow'
export { RestrictionManagement } from './RestrictionManagement'
export { EmergencyLockControls } from './EmergencyLockControls'

// Export service
export { unifiedWalletService } from '@/services/wallet/smart-contract/unifiedWalletService'

// Export types
export type {
  UnifiedWallet,
  WalletCapabilities,
  WalletUpgradeRequest,
  UnifiedTransactionRequest
} from '@/services/wallet/smart-contract/unifiedWalletService'
