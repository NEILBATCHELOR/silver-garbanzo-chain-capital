/**
 * Modern Solana Shim
 * 
 * Provides compatibility layer for Solana SDK
 * Uses modern @solana/kit + @solana/client
 * 
 * MIGRATION STATUS: ✅ MODERN
 */

// ============================================================================
// MODERN SOLANA SDK EXPORTS (from infrastructure)
// ============================================================================

// Re-export modern RPC
export { ModernSolanaRpc, createModernRpc, createCustomRpc } from '../../infrastructure/web3/solana/ModernSolanaRpc';

// Re-export modern types
export * from '../../infrastructure/web3/solana/ModernSolanaTypes';

// Re-export modern utils (explicit to avoid ambiguity)
export { 
  toAddress,
  isValidAddress,
  addressEquals,
  shortenAddress,
  solToLamports,
  lamportsToSol,
  formatSol,
  formatLamports,
  generateRandomKeypair,
  generateKeypairFromMnemonic,
  generateMnemonicPhrase,
  validateMnemonic,
  createSignerFromPrivateKey,
  exportPrivateKeyBase58,
  exportPrivateKeyHex,
  getPublicKey,
  parseCommitment,
  isValidSignature,
  getExplorerUrl,
  getSolscanUrl,
  extractErrorMessage,
  parseRpcError,
  isValidNetwork,
  isValidDecimals,
  isValidSupply,
  retryWithBackoff,
  waitForConfirmation
} from '../../infrastructure/web3/solana/ModernSolanaUtils';

// ============================================================================
// MODERN SOLANA SDK EXPORTS (from @solana/kit)
// ============================================================================

export {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase58Encoder,
  getBase58Decoder,
  address,
  lamports,
  type Address,
  type KeyPairSigner
} from '@solana/kit';

// Re-export modern program libraries
export {
  TOKEN_2022_PROGRAM_ADDRESS,
  extension,
  getMintSize,
  getInitializeMintInstruction,
  getInitializeMetadataPointerInstruction,
  getInitializeTokenMetadataInstruction,
  getUpdateTokenMetadataFieldInstruction,
  tokenMetadataField,
  getInitializeTransferFeeConfigInstruction,
  AccountState
} from '@solana-program/token-2022';

export {
  getCreateAccountInstruction,
  getTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS
} from '@solana-program/system';

// ============================================================================
// LEGACY COMPATIBILITY (For gradual migration)
// ============================================================================

// Legacy imports still used by some services
// These will be phased out during migration
import { 
  Connection as LegacyConnection,
  PublicKey as LegacyPublicKey,
  Keypair as LegacyKeypair,
  Transaction as LegacyTransaction,
  SystemProgram as LegacySystemProgram,
  LAMPORTS_PER_SOL as LEGACY_LAMPORTS_PER_SOL
} from '@solana/web3.js';

export {
  LegacyConnection,
  LegacyPublicKey,
  LegacyKeypair,
  LegacyTransaction,
  LegacySystemProgram,
  LEGACY_LAMPORTS_PER_SOL
};

// Legacy exports (deprecated - use modern equivalents)
export type {
  Commitment,
  Finality,
  TransactionSignature,
  SendOptions,
  ConfirmOptions,
  BlockhashWithExpiryBlockHeight
} from '@solana/web3.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const MICRO_LAMPORTS_PER_LAMPORT = 1_000_000;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Convert legacy PublicKey to modern Address
 * @deprecated Use address() directly with string
 */
export function legacyPublicKeyToAddress(pubkey: LegacyPublicKey): string {
  return pubkey.toString();
}

/**
 * Get network endpoint
 */
export function getNetworkEndpoint(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
  const endpoints = {
    'mainnet-beta': import.meta.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'devnet': import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    'testnet': import.meta.env.VITE_SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com'
  };
  return endpoints[network];
}
