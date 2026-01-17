/**
 * Backend XRPL Multi-Purpose Token (MPT) Service
 * 
 * Handles MPT creation, authorization, issuance, and transfers on the blockchain.
 * Based on XLS-33 MPT standard.
 * 
 * Reference: xrpl-dev-portal _code-samples/issue-mpt-with-metadata/
 */

import { Client, Wallet, Transaction } from 'xrpl'
import { xrplClientManager } from '../core/XRPLClientManager'

export interface CreateMPTParams {
  wallet: Wallet
  assetScale: number
  maximumAmount?: string
  transferFee?: number
  flags?: {
    canTransfer?: boolean
    canTrade?: boolean
    canLock?: boolean
    canClawback?: boolean
    requireAuth?: boolean
  }
}

export interface CreateMPTResult {
  mptId: string
  transactionHash: string
  ledgerIndex: number
}

export interface AuthorizeHolderParams {
  wallet: Wallet
  holderAddress: string
  mptId: string
}

export interface TransferMPTParams {
  wallet: Wallet
  destinationAddress: string
  mptId: string
  amount: string
  memos?: Array<{
    data?: string
    format?: string
    type?: string
  }>
}

export interface ClawbackMPTParams {
  wallet: Wallet
  holderAddress: string
  mptId: string
  amount: string
}

export class XRPLMPTService {
  /**
   * Create MPT Issuance
   */
  async createMPTIssuance(params: CreateMPTParams): Promise<CreateMPTResult> {
    const client = await xrplClientManager.getClient('testnet')

    try {
      // Build flags
      let flags = 0
      if (params.flags) {
        if (params.flags.canTransfer !== false) flags |= 0x0001 // tfMPTCanTransfer
        if (params.flags.canTrade) flags |= 0x0002 // tfMPTCanTrade
        if (params.flags.canLock) flags |= 0x0004 // tfMPTCanLock
        if (params.flags.canClawback) flags |= 0x0008 // tfMPTCanClawback
        if (params.flags.requireAuth) flags |= 0x0010 // tfMPTRequireAuth
      }

      const tx = {
        TransactionType: 'MPTokenIssuanceCreate',
        Account: params.wallet.address,
        AssetScale: params.assetScale,
        MaximumAmount: params.maximumAmount,
        TransferFee: params.transferFee,
        Flags: flags
      } as any // Cast as any for draft transaction types

      const response = await client.submitAndWait(tx as any, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`MPT creation failed: ${response.result.meta.TransactionResult}`)
        }
      }

      // Extract MPT ID from metadata
      const mptId = this.extractMPTId(response.result.meta)
      const ledgerIndex = response.result.ledger_index || 0

      return {
        mptId,
        transactionHash: response.result.hash,
        ledgerIndex
      }
    } finally {
      await client.disconnect()
    }
  }

  /**
   * Authorize holder for MPT
   */
  async authorizeHolder(params: AuthorizeHolderParams): Promise<{ transactionHash: string }> {
    const client = await xrplClientManager.getClient('testnet')

    try {
      const tx = {
        TransactionType: 'MPTokenAuthorize',
        Account: params.wallet.address,
        MPTokenIssuanceID: params.mptId,
        Holder: params.holderAddress
      } as any

      const response = await client.submitAndWait(tx as any, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Holder authorization failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash
      }
    } finally {
      await client.disconnect()
    }
  }

  /**
   * Transfer MPT tokens
   */
  async transferMPT(params: TransferMPTParams): Promise<{ transactionHash: string }> {
    const client = await xrplClientManager.getClient('testnet')

    try {
      const tx: any = {
        TransactionType: 'Payment',
        Account: params.wallet.address,
        Destination: params.destinationAddress,
        Amount: {
          mpt_issuance_id: params.mptId,
          value: params.amount
        }
      }

      // Add memos if provided
      if (params.memos && params.memos.length > 0) {
        tx.Memos = params.memos.map(memo => ({
          Memo: {
            MemoData: memo.data,
            MemoFormat: memo.format,
            MemoType: memo.type
          }
        }))
      }

      const response = await client.submitAndWait(tx as any, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`MPT transfer failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash
      }
    } finally {
      await client.disconnect()
    }
  }

  /**
   * Clawback MPT tokens from holder
   */
  async clawbackMPT(params: ClawbackMPTParams): Promise<{ transactionHash: string }> {
    const client = await xrplClientManager.getClient('testnet')

    try {
      const tx = {
        TransactionType: 'Clawback',
        Account: params.wallet.address,
        Holder: params.holderAddress,
        Amount: {
          mpt_issuance_id: params.mptId,
          value: params.amount
        }
      } as any

      const response = await client.submitAndWait(tx as any, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`MPT clawback failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash
      }
    } finally {
      await client.disconnect()
    }
  }

  /**
   * Extract MPT ID from transaction metadata
   */
  private extractMPTId(meta: any): string {
    if (!meta || !meta.AffectedNodes) {
      throw new Error('Invalid transaction metadata')
    }

    for (const node of meta.AffectedNodes) {
      if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'MPTokenIssuance') {
        return node.CreatedNode.LedgerIndex
      }
    }

    throw new Error('MPT ID not found in transaction metadata')
  }
}

// Export singleton instance
export const xrplMPTService = new XRPLMPTService()
