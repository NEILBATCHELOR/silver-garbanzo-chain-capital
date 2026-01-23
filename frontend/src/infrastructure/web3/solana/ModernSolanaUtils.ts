/**
 * Modern Solana Utilities
 * 
 * Utility functions for modern Solana SDK
 * Provides helpers for common operations
 */

import {
  address,
  lamports,
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  type Address,
  type KeyPairSigner
} from '@solana/kit';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { HDKey } from '@scure/bip32';
import bs58 from 'bs58';
import type { Commitment } from '@solana/rpc-types';

// ===========================
// Address Utilities
// ===========================

/**
 * Convert string to Address (with validation)
 */
export function toAddress(value: string): Address {
  if (!isValidAddress(value)) {
    throw new Error(`Invalid Solana address: ${value}`);
  }
  return address(value);
}

/**
 * Validate Solana address format
 */
export function isValidAddress(value: string): boolean {
  try {
    // Solana addresses are base58 encoded, 32-44 characters
    if (value.length < 32 || value.length > 44) {
      return false;
    }
    
    // Try to decode as base58
    const decoded = bs58.decode(value);
    
    // Should be 32 bytes
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Compare two addresses
 */
export function addressEquals(a: Address | string, b: Address | string): boolean {
  // Address type is already a string in @solana/kit
  const addrA = typeof a === 'string' ? a : a;
  const addrB = typeof b === 'string' ? b : b;
  return addrA === addrB;
}

/**
 * Shorten address for display (e.g., "ABC...XYZ")
 */
export function shortenAddress(addr: Address | string, chars: number = 4): string {
  // Address type is already a string in @solana/kit
  const str = typeof addr === 'string' ? addr : addr;
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

// ===========================
// Lamports Utilities
// ===========================

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  const lamportsPerSol = 1_000_000_000n;
  return BigInt(Math.floor(sol * Number(lamportsPerSol)));
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamportsAmount: bigint): number {
  const lamportsPerSol = 1_000_000_000n;
  return Number(lamportsAmount) / Number(lamportsPerSol);
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamportsAmount: bigint, decimals: number = 4): string {
  const sol = lamportsToSol(lamportsAmount);
  return sol.toFixed(decimals);
}

/**
 * Format lamports with separators
 */
export function formatLamports(lamportsAmount: bigint): string {
  return lamportsAmount.toLocaleString();
}

// ===========================
// Keypair Generation
// ===========================

/**
 * Generate random keypair signer
 */
export async function generateRandomKeypair(): Promise<KeyPairSigner> {
  return generateKeyPairSigner();
}

/**
 * Generate keypair from mnemonic
 */
export async function generateKeypairFromMnemonic(
  mnemonic: string,
  accountIndex: number = 0,
  changeIndex: number = 0
): Promise<KeyPairSigner> {
  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic);
  
  // Derive key using Solana's derivation path
  const path = `m/44'/501'/${accountIndex}'/${changeIndex}'`;
  const hdKey = HDKey.fromMasterSeed(seed).derive(path);
  
  if (!hdKey.privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }

  // Create signer from private key
  return createSignerFromPrivateKey(hdKey.privateKey);
}

/**
 * Generate new mnemonic
 */
export function generateMnemonicPhrase(strength: 128 | 256 = 128): string {
  return generateMnemonic(strength);
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    mnemonicToSeedSync(mnemonic);
    return true;
  } catch {
    return false;
  }
}

// ===========================
// Keypair Conversion
// ===========================

/**
 * Create signer from private key (base58 or hex or bytes)
 */
export async function createSignerFromPrivateKey(
  privateKey: string | Uint8Array
): Promise<KeyPairSigner> {
  let secretKey: Uint8Array;

  if (typeof privateKey === 'string') {
    // Try hex format first
    if (privateKey.length === 128) {
      secretKey = new Uint8Array(Buffer.from(privateKey, 'hex'));
    } else {
      // Assume base58
      secretKey = bs58.decode(privateKey);
    }
  } else {
    secretKey = privateKey;
  }

  // Validate key length - Solana private keys can be either 32 bytes (just private key) or 64 bytes (private + public)
  if (secretKey.length === 32) {
    // 32-byte private key - use createKeyPairSignerFromPrivateKeyBytes
    return await createKeyPairSignerFromPrivateKeyBytes(secretKey, true);
  } else if (secretKey.length === 64) {
    // 64-byte secret key (private + public) - use createKeyPairSignerFromBytes
    return await createKeyPairSignerFromBytes(secretKey, true);
  } else {
    throw new Error(`Invalid private key length: ${secretKey.length} (expected 32 or 64 bytes)`);
  }
}

/**
 * Export signer private key as base58 (64-byte secret key format)
 */
export async function exportPrivateKeyBase58(signer: KeyPairSigner): Promise<string> {
  // Export private key (32 bytes from PKCS#8 format)
  const exportedPrivateKey = await crypto.subtle.exportKey('pkcs8', signer.keyPair.privateKey);
  const privateKeyBytes = new Uint8Array(exportedPrivateKey, exportedPrivateKey.byteLength - 32, 32);
  
  // Export public key (32 bytes)
  const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', signer.keyPair.publicKey));
  
  // Combine into 64-byte secret key (Solana format: private + public)
  const secretKeyBytes = new Uint8Array(64);
  secretKeyBytes.set(privateKeyBytes, 0);
  secretKeyBytes.set(publicKeyBytes, 32);
  
  return bs58.encode(secretKeyBytes);
}

/**
 * Export signer private key as hex
 */
export async function exportPrivateKeyHex(signer: KeyPairSigner): Promise<string> {
  // Export private key (32 bytes from PKCS#8 format)
  const exportedPrivateKey = await crypto.subtle.exportKey('pkcs8', signer.keyPair.privateKey);
  const privateKeyBytes = new Uint8Array(exportedPrivateKey, exportedPrivateKey.byteLength - 32, 32);
  
  // Export public key (32 bytes)
  const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', signer.keyPair.publicKey));
  
  // Combine into 64-byte secret key
  const secretKeyBytes = new Uint8Array(64);
  secretKeyBytes.set(privateKeyBytes, 0);
  secretKeyBytes.set(publicKeyBytes, 32);
  
  return Buffer.from(secretKeyBytes).toString('hex');
}

/**
 * Get public key from signer
 */
export function getPublicKey(signer: KeyPairSigner): Address {
  return signer.address;
}

// ===========================
// Transaction Utilities
// ===========================

/**
 * Get commitment level enum
 */
export function parseCommitment(level?: string): Commitment {
  const commitments: Record<string, Commitment> = {
    'processed': 'processed',
    'confirmed': 'confirmed',
    'finalized': 'finalized'
  };
  
  return commitments[level || 'confirmed'] || 'confirmed';
}

/**
 * Check if transaction signature is valid format
 */
export function isValidSignature(signature: string): boolean {
  try {
    const decoded = bs58.decode(signature);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

/**
 * Create explorer URL for transaction
 */
export function getExplorerUrl(
  signature: string,
  network: 'mainnet-beta' | 'devnet' | 'testnet',
  type: 'tx' | 'address' | 'block' = 'tx'
): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/${type}/${signature}${cluster}`;
}

/**
 * Create Solscan URL
 */
export function getSolscanUrl(
  signature: string,
  network: 'mainnet-beta' | 'devnet' | 'testnet',
  type: 'tx' | 'address' | 'token' = 'tx'
): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://solscan.io/${type}/${signature}${cluster}`;
}

// ===========================
// Data Encoding Utilities
// ===========================

/**
 * Encode string to bytes
 */
export function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode bytes to string
 */
export function decodeString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Encode number to bytes (little-endian)
 */
export function encodeU64(num: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, num, true); // true = little-endian
  return new Uint8Array(buffer);
}

/**
 * Decode bytes to number (little-endian)
 */
export function decodeU64(bytes: Uint8Array): bigint {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getBigUint64(0, true); // true = little-endian
}

// ===========================
// Time Utilities
// ===========================

/**
 * Convert Unix timestamp to Date
 */
export function unixToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Get current Unix timestamp
 */
export function getCurrentUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return unixToDate(timestamp).toLocaleString();
}

// ===========================
// Error Utilities
// ===========================

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'Unknown error occurred';
}

/**
 * Parse RPC error
 */
export function parseRpcError(error: any): {
  code?: number;
  message: string;
  data?: any;
} {
  if (error?.message) {
    return {
      code: error.code,
      message: error.message,
      data: error.data
    };
  }
  
  return {
    message: extractErrorMessage(error)
  };
}

// ===========================
// Validation Utilities
// ===========================

/**
 * Validate network type
 */
export function isValidNetwork(network: string): network is 'mainnet-beta' | 'devnet' | 'testnet' {
  return ['mainnet-beta', 'devnet', 'testnet'].includes(network);
}

/**
 * Validate decimals (0-18)
 */
export function isValidDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 18;
}

/**
 * Validate supply amount
 */
export function isValidSupply(supply: number): boolean {
  return Number.isFinite(supply) && supply >= 0;
}

// ===========================
// Retry Utilities
// ===========================

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Exponential backoff: delay * 2^i
        const backoffDelay = delayMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Wait for confirmation with timeout
 */
export async function waitForConfirmation<T>(
  checkFn: () => Promise<T | null>,
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<T> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await checkFn();
    if (result !== null) {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Confirmation timeout');
}
