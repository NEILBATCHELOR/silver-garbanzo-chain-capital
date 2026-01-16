/**
 * XRPL Multi-Signature Service
 * Implements multi-signature account functionality
 * 
 * Provides:
 * - Signer list management
 * - Multi-sig transaction creation
 * - Signature collection
 * - Transaction submission with multiple signatures
 */

import {
  Client,
  Wallet,
  SignerListSet,
  Transaction,
  multisign,
  encode
} from 'xrpl'
import {
  Signer,
  SignerListParams,
  SignerListResult,
  MultiSigTransaction,
  MultiSigSignature,
  MultiSigTransactionResult
} from './types'

export class XRPLMultiSigService {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  /**
   * Setup signer list for multi-signature account
   * 
   * @param params - Signer list configuration
   * @returns Transaction hash and signer list sequence
   * @throws Error if setup fails
   */
  async setSignerList(params: SignerListParams): Promise<SignerListResult> {
    try {
      const tx: SignerListSet = {
        TransactionType: 'SignerListSet',
        Account: params.wallet.address,
        SignerQuorum: params.signerQuorum,
        SignerEntries: params.signers.map(signer => ({
          SignerEntry: {
            Account: signer.account,
            SignerWeight: signer.weight
          }
        }))
      }

      const response = await this.client.submitAndWait(tx, {
        wallet: params.wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Signer list setup failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash,
        // Get sequence from tx_json
        signerListSequence: response.result.tx_json.Sequence || 0,
        success: true
      }
    } catch (error) {
      throw new Error(`Failed to set signer list: ${(error as Error).message}`)
    }
  }

  /**
   * Sign transaction for multi-sig account
   * According to XRPL SDK, each signer must call wallet.sign(tx, true) to create a tx blob
   * 
   * @param transaction - Transaction to sign
   * @param signerWallet - Wallet of the signer
   * @returns Signature blob to be combined with other signatures
   */
  signForMultiSig(
    transaction: Transaction,
    signerWallet: Wallet
  ): string {
    // The second parameter 'true' indicates this is for multi-signing
    const { tx_blob } = signerWallet.sign(transaction, true)
    return tx_blob
  }

  /**
   * Combine signature blobs and create final multi-signed transaction
   * 
   * @param signatureBlobs - Array of tx blobs from each signer
   * @returns Combined multi-signed transaction ready to submit
   */
  combineSignatures(signatureBlobs: string[]): string {
    // multisign takes an array of tx blobs and combines them
    return multisign(signatureBlobs)
  }

  /**
   * Submit multi-signed transaction
   * 
   * @param multiSignedTxBlob - Combined multi-signed transaction blob
   * @returns Transaction hash and success status
   * @throws Error if submission fails
   */
  async submitMultiSigned(
    multiSignedTxBlob: string
  ): Promise<MultiSigTransactionResult> {
    try {
      const response = await this.client.submit(multiSignedTxBlob)

      if (response.result.engine_result !== 'tesSUCCESS') {
        return {
          success: false,
          error: response.result.engine_result_message || response.result.engine_result
        }
      }

      return {
        transactionHash: response.result.tx_json.hash,
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Complete workflow: combine signatures and submit
   * 
   * @param signatureBlobs - Array of signature blobs from signers
   * @returns Transaction result
   */
  async combineAndSubmit(signatureBlobs: string[]): Promise<MultiSigTransactionResult> {
    const multiSignedTx = this.combineSignatures(signatureBlobs)
    return this.submitMultiSigned(multiSignedTx)
  }

  /**
   * Get signer list for account
   * 
   * @param address - Account address
   * @returns Signer quorum and list of signers
   * @throws Error if account not found or has no signer list
   */
  async getSignerList(address: string): Promise<{
    signerQuorum: number
    signers: Signer[]
  }> {
    try {
      const response = await this.client.request({
        command: 'account_objects',
        account: address,
        type: 'signer_list',
        ledger_index: 'validated'
      })

      if (!response.result.account_objects || response.result.account_objects.length === 0) {
        throw new Error('No signer list found for account')
      }

      // Type guard to ensure we have a SignerList object
      const signerListObject = response.result.account_objects[0]
      
      // Check if this is a SignerList object
      if (!('SignerQuorum' in signerListObject && 'SignerEntries' in signerListObject)) {
        throw new Error('Invalid signer list object')
      }

      return {
        signerQuorum: (signerListObject as any).SignerQuorum,
        signers: ((signerListObject as any).SignerEntries as any[]).map((entry: any) => ({
          account: entry.SignerEntry.Account,
          weight: entry.SignerEntry.SignerWeight
        }))
      }
    } catch (error) {
      throw new Error(`Failed to get signer list: ${(error as Error).message}`)
    }
  }

  /**
   * Remove signer list (restore regular signing)
   * 
   * @param wallet - Master wallet
   * @returns Transaction hash
   * @throws Error if removal fails
   */
  async removeSignerList(wallet: Wallet): Promise<{ transactionHash: string }> {
    try {
      const tx: SignerListSet = {
        TransactionType: 'SignerListSet',
        Account: wallet.address,
        SignerQuorum: 0,
        SignerEntries: []
      }

      const response = await this.client.submitAndWait(tx, {
        wallet,
        autofill: true
      })

      if (response.result.meta && typeof response.result.meta !== 'string') {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Signer list removal failed: ${response.result.meta.TransactionResult}`)
        }
      }

      return {
        transactionHash: response.result.hash
      }
    } catch (error) {
      throw new Error(`Failed to remove signer list: ${(error as Error).message}`)
    }
  }

  /**
   * Calculate total signature weight
   * 
   * @param signers - List of signers with weights
   * @param signedBy - Addresses that have signed
   * @returns Total weight of signatures
   */
  calculateSignatureWeight(signers: Signer[], signedBy: string[]): number {
    return signers
      .filter(signer => signedBy.includes(signer.account))
      .reduce((total, signer) => total + signer.weight, 0)
  }

  /**
   * Check if signatures meet quorum
   * 
   * @param signerQuorum - Required total weight
   * @param signers - List of signers with weights
   * @param signedBy - Addresses that have signed
   * @returns True if quorum is met
   */
  meetsQuorum(
    signerQuorum: number,
    signers: Signer[],
    signedBy: string[]
  ): boolean {
    const totalWeight = this.calculateSignatureWeight(signers, signedBy)
    return totalWeight >= signerQuorum
  }

  /**
   * Encode transaction for signing
   * 
   * @param transaction - Transaction to encode
   * @returns Encoded transaction blob
   */
  encodeTransaction(transaction: Transaction): string {
    return encode(transaction)
  }
}
