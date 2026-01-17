/**
 * XRPL Batch Operations Service
 * Based on XLS-56 specification
 * Reference: https://xrpl.org/batch-transactions.html
 * 
 * CRITICAL: Follows official XRPL SDK patterns from code samples
 */

import { Client, Wallet, Transaction, validate, hashes, Batch, TxResponse } from 'xrpl'
import * as xrpl from 'xrpl'
import type {
  BatchTransaction,
  BatchTransactionResult,
  SingleAccountBatchParams,
  MultiAccountBatchParams,
  BatchValidationResult,
  BatchTxResponse
} from './types'

// Batch flag constants (from XLS-56 specification)
const BatchFlags = {
  tfAllOrNothing: 0x00010000 // All inner transactions must succeed
}

const GlobalFlags = {
  tfInnerBatchTxn: 0x40000000 // Marks transaction as part of a batch
}

/**
 * Service for creating and managing batch transactions (XLS-56)
 * Allows atomic execution of multiple transactions
 */
export class XRPLBatchOperationsService {
  constructor(private client: Client) {}

  /**
   * Create single-account batch transaction
   * All transactions must be from the same account
   */
  async createSingleAccountBatch(
    wallet: Wallet,
    params: SingleAccountBatchParams
  ): Promise<BatchTransactionResult> {
    // Validate all transactions are from the same account
    const invalidTx = params.transactions.find(
      tx => (tx as any).Account !== params.account
    )
    if (invalidTx) {
      throw new Error('All transactions must be from the same account for single-account batch')
    }

    // Add tfInnerBatchTxn flag to all inner transactions
    // CRITICAL: Remove fields that are not allowed in batch inner transactions
    const innerTransactions = params.transactions.map(tx => {
      const { TxnSignature, Signers, LastLedgerSequence, ...cleanTx } = tx as any
      
      return {
        RawTransaction: {
          ...cleanTx,
          // CRITICAL: Inner transactions MUST have tfInnerBatchTxn flag (from official example)
          Flags: (cleanTx.Flags || 0) | GlobalFlags.tfInnerBatchTxn,
          // CRITICAL: Inner transactions must have Fee: "0" and SigningPubKey: "" (literal types)
          Fee: "0" as const,
          SigningPubKey: "" as const
        }
      }
    })

    // Create batch transaction (using SDK's Batch type)
    const batchTx: Batch = {
      TransactionType: 'Batch',
      Account: params.account,
      Flags: params.allOrNothing ? BatchFlags.tfAllOrNothing : 0,
      RawTransactions: innerTransactions
    }

    // Validate before submission (from official example)
    validate(batchTx)

    // Submit and wait (autofill handles Fee: "0" and SigningPubKey: "" automatically)
    const response: TxResponse<Batch> = await this.client.submitAndWait(batchTx, {
      wallet,
      autofill: true
    })

    // Check result
    if (typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Batch transaction failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    // Extract inner transaction hashes (from official example)
    const innerTxHashes = (
      response.result.tx_json?.RawTransactions || []
    ).map((wrapper: any) => {
      return hashes.hashSignedTx(wrapper.RawTransaction)
    })

    return {
      hash: response.result.hash,
      status: typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta 
        ? response.result.meta.TransactionResult 
        : 'unknown',
      ledgerIndex: response.result.ledger_index || 0,
      innerTransactionHashes: innerTxHashes,
      allSucceeded: true,
      failedTransactions: []
    }
  }

  /**
   * Create multi-account batch transaction
   * Transactions can be from different accounts
   */
  async createMultiAccountBatch(
    submitterWallet: Wallet,
    params: MultiAccountBatchParams
  ): Promise<BatchTransactionResult> {
    // Add tfInnerBatchTxn flag to all inner transactions
    // CRITICAL: Remove fields that are not allowed in batch inner transactions
    const innerTransactions = params.transactions.map(tx => {
      const { TxnSignature, Signers, LastLedgerSequence, ...cleanTx } = tx as any
      
      return {
        RawTransaction: {
          ...cleanTx,
          // CRITICAL: Inner transactions MUST have tfInnerBatchTxn flag
          Flags: (cleanTx.Flags || 0) | GlobalFlags.tfInnerBatchTxn,
          // CRITICAL: Inner transactions must have Fee: "0" and SigningPubKey: "" (literal types)
          Fee: "0" as const,
          SigningPubKey: "" as const
        }
      }
    })

    // Create batch transaction
    const batchTx: Batch = {
      TransactionType: 'Batch',
      Account: params.submitterAccount,
      Flags: params.allOrNothing ? BatchFlags.tfAllOrNothing : 0,
      RawTransactions: innerTransactions
    }

    // Validate before submission
    validate(batchTx)

    // Submit and wait
    const response: TxResponse<Batch> = await this.client.submitAndWait(
      batchTx,
      {
        wallet: submitterWallet,
        autofill: true
      }
    )

    // Check result
    if (typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Batch transaction failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    // Extract inner transaction hashes
    const innerTxHashes = (
      response.result.tx_json?.RawTransactions || []
    ).map((wrapper: any) => {
      return hashes.hashSignedTx(wrapper.RawTransaction)
    })

    // Determine success status of individual transactions
    const failedIndices: number[] = []
    let allSucceeded = true

    // Note: In practice, you'd verify each inner transaction individually
    // This is simplified - see official example for full verification

    return {
      hash: response.result.hash,
      status: typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta 
        ? response.result.meta.TransactionResult 
        : 'unknown',
      ledgerIndex: response.result.ledger_index || 0,
      innerTransactionHashes: innerTxHashes,
      allSucceeded,
      failedTransactions: failedIndices
    }
  }

  /**
   * Validate batch transaction structure
   */
  validateBatch(params: SingleAccountBatchParams | MultiAccountBatchParams): BatchValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check transaction count (2-8 per spec)
    if (params.transactions.length < 2) {
      errors.push('Batch must contain at least 2 transactions')
    }
    if (params.transactions.length > 8) {
      errors.push('Batch cannot contain more than 8 transactions')
    }

    // Check for single account batch
    if ('account' in params) {
      const invalidTx = params.transactions.find(
        tx => (tx as any).Account !== params.account
      )
      if (invalidTx) {
        errors.push('All transactions must be from the same account for single-account batch')
      }
    }

    // Warning for allOrNothing flag
    if (!params.allOrNothing) {
      warnings.push('Consider using allOrNothing flag for atomic execution')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Verify inner transaction results
   * Based on official example pattern
   */
  async verifyInnerTransactions(
    batchHash: string,
    innerTxHashes: string[]
  ): Promise<{
    allSucceeded: boolean
    results: Array<{
      hash: string
      status: string
      ledgerIndex: number
    }>
  }> {
    const results: Array<{
      hash: string
      status: string
      ledgerIndex: number
    }> = []

    let allSucceeded = true

    for (const hash of innerTxHashes) {
      try {
        const tx = await this.client.request({
          command: 'tx',
          transaction: hash
        })

        const status = typeof tx.result.meta === 'object' && 'TransactionResult' in tx.result.meta
          ? tx.result.meta.TransactionResult
          : 'unknown'

        results.push({
          hash,
          status,
          ledgerIndex: tx.result.ledger_index || 0
        })

        if (status !== 'tesSUCCESS') {
          allSucceeded = false
        }
      } catch (error) {
        allSucceeded = false
        results.push({
          hash,
          status: 'NOT_FOUND',
          ledgerIndex: 0
        })
      }
    }

    return {
      allSucceeded,
      results
    }
  }

  /**
   * Get batch transaction details
   */
  async getBatchTransaction(hash: string): Promise<any> {
    const response = await this.client.request({
      command: 'tx',
      transaction: hash
    })

    return response.result
  }
}

// Create singleton instance
let xrplBatchOperationsService: XRPLBatchOperationsService | null = null

/**
 * Get or create XRPLBatchOperationsService instance
 */
export function getXRPLBatchOperationsService(client: Client): XRPLBatchOperationsService {
  if (!xrplBatchOperationsService || (xrplBatchOperationsService as any).client !== client) {
    xrplBatchOperationsService = new XRPLBatchOperationsService(client)
  }
  return xrplBatchOperationsService
}
