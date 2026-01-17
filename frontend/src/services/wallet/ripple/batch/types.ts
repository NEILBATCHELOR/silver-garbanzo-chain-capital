/**
 * XRPL Batch Operations Types
 * Based on XLS-56 specification
 * Reference: https://xrpl.org/batch-transactions.html
 * 
 * CRITICAL: Using proper XRPL SDK types - Batch is already defined in xrpl package
 */

import { Batch, Transaction, TxResponse } from 'xrpl'

/**
 * Re-export XRPL SDK Batch type for convenience
 */
export type BatchTransaction = Batch

/**
 * Batch transaction result
 */
export interface BatchTransactionResult {
  hash: string
  status: string
  ledgerIndex: number
  innerTransactionHashes: string[]
  allSucceeded: boolean
  failedTransactions: number[]
}

/**
 * Single account batch parameters
 */
export interface SingleAccountBatchParams {
  account: string
  transactions: Transaction[]
  allOrNothing?: boolean
}

/**
 * Multi-account batch parameters
 */
export interface MultiAccountBatchParams {
  submitterAccount: string
  transactions: Transaction[]
  allOrNothing?: boolean
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Database record for batch transactions
 */
export interface DBBatchTransaction {
  id: string
  project_id: string
  submitter_account: string
  batch_hash: string
  inner_transaction_count: number
  all_or_nothing: boolean
  status: string
  all_succeeded: boolean
  failed_count: number
  inner_transaction_hashes: string[]
  ledger_index: number | null
  submitted_at: Date
  created_at: Date
}

/**
 * Batch execution statistics
 */
export interface BatchExecutionStats {
  totalBatches: number
  successfulBatches: number
  failedBatches: number
  averageInnerTransactions: number
  averageExecutionTime: number
}

/**
 * Batch transaction response (from XRPL SDK)
 */
export type BatchTxResponse = TxResponse<Batch>
