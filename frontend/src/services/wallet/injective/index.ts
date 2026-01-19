/**
 * Injective Wallet Service Exports
 * 
 * Updated: Added InjectiveTokenDeploymentService for unified integration
 */

// Import types for local use in type aliases
import type {
  InjectiveAccountInfo,
  InjectiveGenerationOptions,
  InjectiveNetworkInfo,
  InjectiveOrderParams,
  InjectiveSendParams
} from './InjectiveWalletService';

// Import TokenFactory types
import type {
  TokenFactoryConfig,
  TokenMetadata,
  InjectiveMintParams,
  InjectiveBurnParams,
  SpotMarketConfig,
  TokenCreationResult,
  MarketLaunchResult
} from './InjectiveNativeTokenService';

// Import MTS types
import type {
  MTSConfig,
  MTSTokenInfo,
  MTSBalance,
  CrossVMTransferParams
} from './mts-utils';

// Import Deployment types
import type {
  WalletInfo,
  TokenDeploymentConfig,
  TokenDeploymentResult
} from './InjectiveTokenDeploymentService';

// Export all wallet service functionality
export * from './InjectiveWalletService';

// Export all TokenFactory service functionality
export * from './InjectiveNativeTokenService';

// Export all MTS utilities
export * from './mts-utils';

// Export unified deployment service
export * from './InjectiveTokenDeploymentService';

// Re-export all types
export type {
  // Wallet types
  InjectiveAccountInfo,
  InjectiveGenerationOptions,
  InjectiveNetworkInfo,
  InjectiveOrderParams,
  InjectiveSendParams,
  // TokenFactory types
  TokenFactoryConfig,
  TokenMetadata,
  InjectiveMintParams,
  InjectiveBurnParams,
  SpotMarketConfig,
  TokenCreationResult,
  MarketLaunchResult,
  // MTS types
  MTSConfig,
  MTSTokenInfo,
  MTSBalance,
  CrossVMTransferParams,
  // Deployment types
  WalletInfo,
  TokenDeploymentConfig,
  TokenDeploymentResult
};
