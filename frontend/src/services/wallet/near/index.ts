/**
 * NEAR Wallet Service Exports
 * Provides comprehensive NEAR wallet functionality including account generation,
 * import, validation, HD wallet support, and network operations
 */

export { 
  NEARWalletService, 
  nearWalletService, 
  nearTestnetWalletService
} from './NEARWalletService';

// Re-export types
export type {
  NEARAccountInfo,
  NEARGenerationOptions,
  NEAREncryptedWallet,
  NEARNetworkInfo,
  NEARAccessKey
} from './NEARWalletService';

// Static utility export
export { NEARWallet } from './NEARWalletService';

// Default export for convenience
export { nearWalletService as default } from './NEARWalletService';
