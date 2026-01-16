/**
 * XRPL Reliable Transaction Service (SDK Compliant)
 * Robust transaction submission with retry logic and verification
 */

import { Client, Wallet } from 'xrpl'
import type { Transaction, TxResponse, SubmittableTransaction } from 'xrpl'
import {
  TransactionSubmissionParams,
  TransactionSubmission,
  SubmitAndVerifyParams,
  SubmitAndVerifyResult,
  TransactionVerification,
  getTransactionResult
} from './types'

export class XRPLReliableTransactionService {
  private readonly DEFAULT_MAX_RETRIES = 3
  private readonly DEFAULT_RETRY_DELAY = 2000 // 2 seconds
  private readonly DEFAULT_MAX_WAIT_TIME = 30000 // 30 seconds

  constructor(private client: Client) {}

  /**
   * Submit transaction with automatic retry logic
   */
  async submitWithRetry(
    wallet: Wallet,
    transaction: Transaction | Record<string, any>,
    params?: {
      maxRetries?: number
      retryDelay?: number
    }
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
    attempts: number
  }> {
    const maxRetries = params?.maxRetries ?? this.DEFAULT_MAX_RETRIES
    const retryDelay = params?.retryDelay ?? this.DEFAULT_RETRY_DELAY

    let lastError: Error | undefined
    let attempts = 0

    for (let i = 0; i <= maxRetries; i++) {
      attempts++
      try {
        const tx = {
          ...transaction,
          Account: wallet.address
        }

        const response = await this.client.submitAndWait(tx as any, {
          wallet,
          autofill: true
        })

        const txResult = getTransactionResult(response)
        
        // If successful, return immediately
        if (txResult === 'tesSUCCESS') {
          return {
            transactionHash: response.result.hash,
            ledgerIndex: response.result.ledger_index || 0,
            attempts
          }
        }

        // If tec code (fee claimed but failed), don't retry
        if (txResult?.startsWith('tec')) {
          throw new Error(`Transaction failed with tec code: ${txResult}`)
        }

        // Store error for potential retry
        lastError = new Error(`Transaction failed: ${txResult}`)

        // If we have retries left, wait and try again
        if (i < maxRetries) {
          await this.delay(retryDelay)
        }
      } catch (error) {
        lastError = error as Error
        
        // If we have retries left, wait and try again
        if (i < maxRetries) {
          await this.delay(retryDelay)
        }
      }
    }

    throw new Error(
      `Transaction failed after ${attempts} attempts: ${lastError?.message}`
    )
  }

  /**
   * Submit and verify transaction
   */
  async submitAndVerify(
    wallet: Wallet,
    transaction: Transaction | Record<string, any>,
    params?: SubmitAndVerifyParams
  ): Promise<SubmitAndVerifyResult> {
    const waitForValidation = params?.waitForValidation ?? true
    const maxWaitTime = params?.maxWaitTime ?? this.DEFAULT_MAX_WAIT_TIME

    // Submit transaction
    const tx = {
      ...transaction,
      Account: wallet.address
    }

    const startTime = Date.now()
    const response = await this.client.submitAndWait(tx as any, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    const isSuccessful = txResult === 'tesSUCCESS'

    const submission: TransactionSubmission = {
      id: crypto.randomUUID(),
      projectId: '', // To be filled by caller
      transactionHash: response.result.hash,
      transactionType: (tx as any).TransactionType || 'Unknown',
      accountAddress: wallet.address,
      sequenceNumber: response.result.tx_json?.Sequence,
      lastLedgerSequence: response.result.tx_json?.LastLedgerSequence,
      status: isSuccessful ? 'validated' : 'failed',
      result: txResult,
      submissionAttempts: 1,
      firstSubmittedAt: new Date(startTime),
      lastSubmittedAt: new Date(),
      validatedAt: isSuccessful ? new Date() : undefined,
      includedInLedger: response.result.ledger_index,
      transactionJson: tx as Record<string, any>,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Perform verification if requested
    let verification: TransactionVerification | undefined

    if (waitForValidation) {
      verification = await this.verifyTransaction(
        response.result.hash,
        params?.verificationMethod
      )
    }

    return {
      submission,
      verification,
      isValidated: isSuccessful,
      isSuccessful,
      transactionResult: txResult
    }
  }

  /**
   * Verify transaction status
   */
  async verifyTransaction(
    transactionHash: string,
    method: 'account_sequence' | 'ledger_scan' | 'tx_lookup' = 'tx_lookup'
  ): Promise<TransactionVerification> {
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: transactionHash
      })

      const txResult = response.result.meta && typeof response.result.meta === 'object'
        ? (response.result.meta as any).TransactionResult
        : undefined

      return {
        id: crypto.randomUUID(),
        submissionId: '', // To be filled by caller
        verifiedAt: new Date(),
        verificationMethod: method,
        isValidated: response.result.validated === true,
        isSuccessful: txResult === 'tesSUCCESS',
        transactionResult: txResult,
        ledgerIndex: response.result.ledger_index,
        metadata: response.result.meta as Record<string, any>
      }
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        submissionId: '',
        verifiedAt: new Date(),
        verificationMethod: method,
        isValidated: false,
        isSuccessful: false,
        transactionResult: undefined
      }
    }
  }

  /**
   * Wait for transaction to be validated
   */
  async waitForValidation(
    transactionHash: string,
    maxWaitTime: number = this.DEFAULT_MAX_WAIT_TIME
  ): Promise<{
    isValidated: boolean
    isSuccessful: boolean
    ledgerIndex?: number
    transactionResult?: string
  }> {
    const startTime = Date.now()
    const pollInterval = 1000 // 1 second

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const verification = await this.verifyTransaction(transactionHash)
        
        if (verification.isValidated) {
          return {
            isValidated: true,
            isSuccessful: verification.isSuccessful || false,
            ledgerIndex: verification.ledgerIndex,
            transactionResult: verification.transactionResult
          }
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }

      await this.delay(pollInterval)
    }

    return {
      isValidated: false,
      isSuccessful: false
    }
  }

  /**
   * Check if transaction was successful by hash
   */
  async wasSuccessful(transactionHash: string): Promise<boolean> {
    try {
      const verification = await this.verifyTransaction(transactionHash)
      return verification.isSuccessful || false
    } catch (error) {
      return false
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(transactionHash: string): Promise<{
    exists: boolean
    validated: boolean
    successful: boolean
    result?: string
    ledgerIndex?: number
  }> {
    try {
      const verification = await this.verifyTransaction(transactionHash)
      return {
        exists: true,
        validated: verification.isValidated,
        successful: verification.isSuccessful || false,
        result: verification.transactionResult,
        ledgerIndex: verification.ledgerIndex
      }
    } catch (error) {
      return {
        exists: false,
        validated: false,
        successful: false
      }
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
