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
  Token2022MetadataService,
  token2022MetadataService,
  type Token2022MetadataInfo,
  type Token2022MetadataUpdate,
  type Token2022MetadataOptions,
  type Token2022MetadataResult
} from './Token2022MetadataService';

export {
  ModernSolanaTokenTransferService,
  modernSolanaTokenTransferService,
  type TokenTransferParams,
  type FeeEstimate
} from './ModernSolanaTokenTransferService';

export {
  SimpleSolanaTokenTransferService,
  simpleSolanaTokenTransferService,
  type SimpleTransferParams,
  type SimpleTransferOptions,
  type SimpleTransferResult
} from './SimpleSolanaTokenTransferService';

export {
  ModernSolanaMintService,
  modernSolanaMintService,
  type MintCreationConfig,
  type MintCreationOptions,
  type MintCreationResult
} from './ModernSolanaMintService';

export {
  ModernSolanaTokenAccountService,
  modernSolanaTokenAccountService,
  type TokenAccountConfig,
  type ATAConfig,
  type TokenAccountOptions,
  type TokenAccountResult,
  type TokenAccountInfo
} from './ModernSolanaTokenAccountService';

export {
  ModernSolanaTokenBurnService,
  modernSolanaTokenBurnService,
  type TokenBurnParams,
  type ModernTokenBurnOptions,
  type SolanaBurnResult,
  type BurnValidation
} from './ModernSolanaTokenBurnService';

export {
  ModernSolanaTokenQueryService,
  modernSolanaTokenQueryService,
  type TokenOnChainData,
  type TokenAccountData,
  type TokenTransactionSignature
} from './ModernSolanaTokenQueryService';

export {
  ModernSolanaBlockchainQueryService,
  modernSolanaBlockchainQueryService
} from './ModernSolanaBlockchainQueryService';
export type {
  WalletBalance,
  TokenBalance,
  TokenHolder,
  TokenTransaction,
  OnChainMetadata
} from './ModernSolanaBlockchainQueryService';

// ============================================================================
// TOKEN OPERATIONS SERVICES
// ============================================================================

// NOTE: Additional token operation services will be added as needed:
// - ModernSolanaTokenDelegateService (approve/revoke delegates)
// - ModernSolanaTokenMintService (mint additional tokens)
// - ModernSolanaAuthorityService (set mint/freeze authority)
// - ModernSolanaFreezeService (freeze/thaw accounts)

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

// Re-export infrastructure utilities from their actual location
export { createModernRpc, createCustomRpc } from '@/infrastructure/web3/solana';
export type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
