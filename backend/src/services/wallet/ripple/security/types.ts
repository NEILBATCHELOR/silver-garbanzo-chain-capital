/**
 * XRPL Multi-Signature Types
 * Implements multi-signature account functionality
 */

import { Wallet, Transaction } from 'xrpl'

/**
 * Signer in a multi-sig list
 */
export interface Signer {
  account: string
  weight: number
}

/**
 * Parameters for setting up signer list
 */
export interface SignerListParams {
  wallet: Wallet
  signerQuorum: number // Total weight needed for valid signature
  signers: Signer[]
}

/**
 * Multi-signature transaction with signatures
 */
export interface MultiSigTransaction {
  transactionBlob: string
  transaction: Transaction
  signers: MultiSigSignature[]
  currentWeight: number
  requiredWeight: number
  status: 'pending' | 'ready' | 'submitted' | 'completed' | 'expired'
}

/**
 * Individual signature for multi-sig transaction
 */
export interface MultiSigSignature {
  account: string
  signature: string
  publicKey: string
  signedAt?: Date
}

/**
 * Multi-sig transaction creation result
 */
export interface MultiSigTransactionResult {
  transactionHash?: string
  transactionId?: string
  success: boolean
  error?: string
}

/**
 * Signer list setup result
 */
export interface SignerListResult {
  transactionHash: string
  signerListSequence: number
  success: boolean
}

/**
 * Database multi-sig account record
 */
export interface DBMultiSigAccount {
  id: string
  project_id: string
  account_address: string
  signer_quorum: number
  setup_transaction_hash: string
  status: 'active' | 'inactive'
  created_at: Date
  updated_at: Date
}

/**
 * Database signer record
 */
export interface DBSigner {
  id: string
  multisig_account_id: string
  signer_address: string
  signer_weight: number
  added_at: Date
}

/**
 * Database pending transaction record
 */
export interface DBPendingTransaction {
  id: string
  multisig_account_id: string
  transaction_blob: string
  transaction_type: string
  required_weight: number
  current_weight: number
  status: 'pending' | 'ready' | 'submitted' | 'completed' | 'expired'
  expires_at: Date | null
  created_at: Date
  submitted_at: Date | null
}

/**
 * Database signature record
 */
export interface DBSignature {
  id: string
  pending_transaction_id: string
  signer_address: string
  signature: string
  public_key: string
  signed_at: Date
}
