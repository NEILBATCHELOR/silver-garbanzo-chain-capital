/**
 * Modern Solana Infrastructure Index
 * 
 * Exports all modern Solana utilities, types, and services
 */

// Core RPC
export { 
  ModernSolanaRpc, 
  createModernRpc, 
  createCustomRpc, 
  getDefaultEndpoint 
} from './ModernSolanaRpc';

// Explorer Service
export { 
  ModernSolanaExplorer, 
  solanaExplorer 
} from './ModernSolanaExplorer';
export type { ExplorerType, ExplorerProvider, ExplorerLink } from './ModernSolanaExplorer';

// Error Handler
export {
  ModernSolanaErrorHandler,
  handleSolanaError,
  ERROR_CODES
} from './ModernSolanaErrorHandler';
export type { SolanaError, ErrorCategory } from './ModernSolanaErrorHandler';

// Types
export * from './ModernSolanaTypes';

// Utilities (avoid duplicate exports)
export {
  // Address utilities
  toAddress,
  isValidAddress,
  addressEquals,
  shortenAddress,
  // Lamports utilities
  solToLamports,
  lamportsToSol,
  formatSol,
  formatLamports,
  // Keypair utilities
  generateRandomKeypair,
  generateKeypairFromMnemonic,
  generateMnemonicPhrase,
  validateMnemonic,
  createSignerFromPrivateKey,
  exportPrivateKeyBase58,
  exportPrivateKeyHex,
  getPublicKey,
  // Transaction utilities
  parseCommitment,
  isValidSignature,
  getExplorerUrl,
  getSolscanUrl,
  // Other utilities
  extractErrorMessage,
  parseRpcError,
  isValidNetwork,
  isValidDecimals,
  isValidSupply,
  retryWithBackoff,
  waitForConfirmation
} from './ModernSolanaUtils';

// Re-export commonly used items from @solana/kit
export { 
  address, 
  lamports, 
  generateKeyPairSigner,
  createKeyPairSignerFromBytes
} from '@solana/kit';
export type { Address, KeyPairSigner, Rpc } from '@solana/kit';
