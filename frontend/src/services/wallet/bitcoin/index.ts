/**
 * Bitcoin Wallet Service Exports
 * Provides comprehensive Bitcoin wallet functionality including account generation,
 * import, validation, HD wallet support, multiple address types, and network operations
 */

export { 
  BitcoinWalletService, 
  bitcoinWalletService, 
  bitcoinTestnetWalletService
} from './BitcoinWalletService';

// Re-export types
export type {
  BitcoinAccountInfo,
  BitcoinGenerationOptions,
  BitcoinEncryptedWallet,
  BitcoinNetworkInfo,
  BitcoinUTXO
} from './BitcoinWalletService';

// Static utility export
export { BitcoinWallet } from './BitcoinWalletService';

// Default export for convenience
export { bitcoinWalletService as default } from './BitcoinWalletService';
