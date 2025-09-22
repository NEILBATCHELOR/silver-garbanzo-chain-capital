/**
 * Solana Wallet Service Exports
 * Provides comprehensive Solana wallet functionality including account generation,
 * import, validation, mnemonic support, and network operations
 */

export { 
  SolanaWalletService, 
  solanaWalletService, 
  solanaDevnetWalletService,
  solanaTestnetWalletService
} from './SolanaWalletService';

// Re-export types
export type {
  SolanaAccountInfo,
  SolanaGenerationOptions,
  SolanaEncryptedWallet,
  SolanaNetworkInfo
} from './SolanaWalletService';

// Static utility export
export { SolanaWallet } from './SolanaWalletService';

// Default export for convenience
export { solanaWalletService as default } from './SolanaWalletService';
