/**
 * Modern Solana Types
 * 
 * Type definitions for modern Solana SDK
 * Based on @solana/kit and @solana/client
 */

import type { Address, KeyPairSigner } from '@solana/kit';
import type { Rpc } from '@solana/rpc-spec';
import type { Commitment } from '@solana/rpc-types';

// ===========================
// Core Types
// ===========================

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

export interface SolanaConfig {
  network: SolanaNetwork;
  rpcUrl?: string;
  commitment?: Commitment;
}

// ===========================
// Account Types
// ===========================

export interface ModernAccountInfo {
  address: Address;
  lamports: bigint;
  owner: Address;
  executable: boolean;
  rentEpoch: bigint;
  data: Uint8Array;
}

export interface ModernTokenAccount {
  mint: Address;
  owner: Address;
  amount: bigint;
  delegateOption: 0 | 1;
  delegate: Address | null;
  state: 'uninitialized' | 'initialized' | 'frozen';
  isNativeOption: 0 | 1;
  isNative: bigint;
  delegatedAmount: bigint;
  closeAuthorityOption: 0 | 1;
  closeAuthority: Address | null;
}

export interface ModernMintAccount {
  address: Address;
  mintAuthority: Address | null;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: Address | null;
}

// ===========================
// Transaction Types
// ===========================

export interface ModernTransactionSignature {
  signature: string;
  slot: bigint;
  err: any | null;
  memo: string | null;
  blockTime: number | null;
}

export interface ModernTransactionMeta {
  err: any | null;
  fee: bigint;
  preBalances: bigint[];
  postBalances: bigint[];
  preTokenBalances: any[];
  postTokenBalances: any[];
  logMessages: string[];
  rewards: any[];
}

export interface ModernTransaction {
  signatures: string[];
  message: {
    accountKeys: Address[];
    recentBlockhash: string;
    instructions: ModernInstruction[];
  };
  meta: ModernTransactionMeta | null;
  blockTime: number | null;
  slot: bigint;
}

export interface ModernInstruction {
  programId: Address;
  accounts: Address[];
  data: Uint8Array;
}

// ===========================
// Signer Types
// ===========================

export interface ModernSigner {
  address: Address;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

// Modern KeyPairSigner is from @solana/kit
// Don't create a separate type - just re-export
export type ModernKeypairSigner = KeyPairSigner;

// ===========================
// Token Types
// ===========================

export interface ModernTokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: Address;
  mint: Address;
  additionalMetadata?: Map<string, string>;
}

export interface ModernTransferFeeConfig {
  transferFeeConfigAuthority: Address | null;
  withdrawWithheldAuthority: Address | null;
  withheldAmount: bigint;
  olderTransferFee: {
    epoch: bigint;
    transferFeeBasisPoints: number;
    maximumFee: bigint;
  };
  newerTransferFee: {
    epoch: bigint;
    transferFeeBasisPoints: number;
    maximumFee: bigint;
  };
}

// ===========================
// Block Types
// ===========================

export interface ModernBlockhash {
  blockhash: string;
  lastValidBlockHeight: bigint;
}

export interface ModernEpochInfo {
  epoch: bigint;
  slotIndex: bigint;
  slotsInEpoch: bigint;
  absoluteSlot: bigint;
  blockHeight: bigint;
  transactionCount: bigint;
}

// ===========================
// Network Types
// ===========================

export interface ModernClusterNode {
  pubkey: Address;
  gossip: string | null;
  tpu: string | null;
  rpc: string | null;
  version: string | null;
  featureSet: number | null;
  shredVersion: number | null;
}

export interface ModernVersion {
  'solana-core': string;
  'feature-set': number;
}

// ===========================
// Response Types
// ===========================

export interface ModernRpcResponse<T> {
  value: T;
  context: {
    slot: bigint;
    apiVersion?: string;
  };
}

// ===========================
// Error Types
// ===========================

export class ModernSolanaError extends Error {
  constructor(
    message: string,
    public code?: string | number,
    public data?: any
  ) {
    super(message);
    this.name = 'ModernSolanaError';
  }
}

export class ModernTransactionError extends ModernSolanaError {
  constructor(
    message: string,
    public signature?: string,
    public logs?: string[]
  ) {
    super(message);
    this.name = 'ModernTransactionError';
  }
}

// ===========================
// Utility Types
// ===========================

export type PublicKeyLike = Address | string;

export type SignerLike = KeyPairSigner | ModernSigner;

export type RpcLike = Rpc<any>;

// ===========================
// Type Guards
// ===========================

export function isAddress(value: any): value is Address {
  return typeof value === 'string' && value.length >= 32 && value.length <= 44;
}

export function isKeypairSigner(signer: any): signer is KeyPairSigner {
  return (
    signer &&
    typeof signer.address === 'string' &&
    typeof signer.sign === 'function' &&
    signer.secretKey instanceof Uint8Array
  );
}

export function isModernSigner(signer: any): signer is ModernSigner {
  return (
    signer &&
    typeof signer.address === 'string' &&
    typeof signer.sign === 'function'
  );
}

// ===========================
// Re-exports for convenience
// ===========================

export type { Address, KeyPairSigner, Rpc, Commitment };
