/**
 * EVM Wallet Service Exports
 * Provides comprehensive EVM wallet functionality including account generation,
 * import, validation, mnemonic support, and network operations for all EVM chains
 */

export { 
  EVMWalletService, 
  evmWalletService,
  ethereumWalletService,
  polygonWalletService,
  arbitrumWalletService,
  optimismWalletService,
  baseWalletService,
  avalancheWalletService,
  bscWalletService,
  // Testnet services
  ethereumSepoliaWalletService,
  polygonMumbaiWalletService,
  arbitrumSepoliaWalletService,
  optimismSepoliaWalletService,
  baseSepoliaWalletService,
  avalancheFujiWalletService,
  bscTestnetWalletService
} from './EVMWalletService';

// Re-export types
export type {
  EVMAccountInfo,
  EVMGenerationOptions,
  EVMEncryptedWallet,
  EVMNetworkInfo
} from './EVMWalletService';

// Static utility export
export { EVMWallet } from './EVMWalletService';

// Default export for convenience
export { evmWalletService as default } from './EVMWalletService';
