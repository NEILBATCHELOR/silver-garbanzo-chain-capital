/**
 * Solana Services Index
 * Exports all Solana-related services
 * 
 * MIGRATION STATUS: ✅ Modern services available
 * - ModernSolanaWalletService: Uses @solana/kit + @solana/client
 * - ModernSPLTokenDeploymentService: Uses @solana/kit + @solana-program/token
 * - Token2022DeploymentService: Uses @solana/kit + @solana-program/token-2022
 * - All token operation services: burn, delegate, mint, freeze, authority, account
 */

// ============================================================================
// MODERN SERVICES (Recommended for new code)
// ============================================================================

export { 
  ModernSolanaWalletService,
  modernSolanaWalletService,
  modernSolanaDevnetWalletService,
  modernSolanaTestnetWalletService,
  ModernSolanaWallet
} from './ModernSolanaWalletService';

export {
  ModernSPLTokenDeploymentService,
  modernSPLTokenDeploymentService,
  type ModernSPLTokenConfig,
  type ModernSPLDeploymentOptions,
  type ModernSPLDeploymentResult
} from './ModernSPLTokenDeploymentService';

export {
  Token2022DeploymentService,
  type Token2022Config,
  type Token2022DeploymentOptions,
  type Token2022DeploymentResult,
  type MetadataConfig,
  type TransferFeeConfig
} from './Token2022DeploymentService';

export {
  ModernSolanaTokenTransferService,
  modernSolanaTokenTransferService,
  type TokenTransferParams,
  type FeeEstimate
} from './ModernSolanaTokenTransferService';

// ============================================================================
// TOKEN OPERATIONS SERVICES
// ============================================================================

export {
  ModernSolanaTokenDelegateService,
  modernSolanaTokenDelegateService,
  type ApproveDelegateParams,
  type RevokeDelegateParams,
  type ApproveResult,
  type RevokeResult,
  type DelegateInfo
} from './ModernSolanaTokenDelegateService';

export {
  ModernSolanaTokenBurnService,
  modernSolanaTokenBurnService,
  type BurnTokenParams,
  type BurnResult
} from './ModernSolanaTokenBurnService';

export {
  ModernSolanaTokenMintService,
  modernSolanaTokenMintService,
  type MintTokensParams,
  type MintResult
} from './ModernSolanaTokenMintService';

export {
  ModernSolanaAuthorityService,
  modernSolanaAuthorityService,
  AuthorityType,
  type SetAuthorityParams,
  type SetAuthorityResult,
  type AuthorityInfo
} from './ModernSolanaAuthorityService';

export {
  ModernSolanaFreezeService,
  modernSolanaFreezeService,
  FreezeStatus,
  type FreezeAccountParams,
  type ThawAccountParams,
  type FreezeResult
} from './ModernSolanaFreezeService';

export {
  ModernSolanaAccountService,
  modernSolanaAccountService,
  type CloseAccountParams,
  type SyncNativeParams,
  type CloseAccountResult,
  type SyncNativeResult,
  type TokenAccountInfo
} from './ModernSolanaAccountService';

// ============================================================================
// LEGACY SERVICES (Backward compatibility - delegate to modern)
// ============================================================================

export * from './SolanaWalletService';
export * from './SolanaTokenDeploymentService';

// ============================================================================
// SINGLETON INSTANCES (Convenience exports)
// ============================================================================

export { solanaWalletService, solanaDevnetWalletService, solanaTestnetWalletService } from './SolanaWalletService';
export { solanaTokenDeploymentService } from './SolanaTokenDeploymentService';

// ============================================================================
// INFRASTRUCTURE EXPORTS
// ============================================================================

export { createModernRpc } from './ModernSolanaRpc';
export { createSolanaError } from './ModernSolanaErrors';
export type { SolanaNetwork } from './ModernSolanaTypes';
