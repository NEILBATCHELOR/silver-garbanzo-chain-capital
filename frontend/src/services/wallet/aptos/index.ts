/**
 * Aptos Wallet Service Exports
 * Provides comprehensive Aptos wallet functionality including account generation,
 * import, validation, HD wallet support, and network operations
 */

export { 
  AptosWalletService, 
  aptosWalletService, 
  aptosTestnetWalletService,
  aptosDevnetWalletService
} from './AptosWalletService';

// Re-export types
export type {
  AptosAccountInfo,
  AptosGenerationOptions,
  AptosEncryptedWallet,
  AptosNetworkInfo
} from './AptosWalletService';

// Static utility export
export { AptosWallet } from './AptosWalletService';

// Default export for convenience
export { aptosWalletService as default } from './AptosWalletService';
