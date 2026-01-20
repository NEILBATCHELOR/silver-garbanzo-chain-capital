/**
 * XRPL Multi-Signature Database Service
 * Manages multi-sig account and transaction data persistence
 */

import { supabase } from '@/infrastructure/database/client'
import { Transaction } from 'xrpl'
import {
  DBMultiSigAccount,
  DBSigner,
  DBPendingTransaction,
  DBSignature,
  SignerListResult,
  Signer,
  MultiSigSignature
} from './types'

export class XRPLMultiSigDatabaseService {
  private supabase = supabase

  /**
   * Save multi-sig account setup
   */
  async saveMultiSigAccount(
    projectId: string,
    accountAddress: string,
    signerQuorum: number,
    setupResult: SignerListResult
  ): Promise<DBMultiSigAccount> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_accounts')
      .insert({
        project_id: projectId,
        account_address: accountAddress,
        signer_quorum: signerQuorum,
        setup_transaction_hash: setupResult.transactionHash,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save multi-sig account: ${error.message}`)
    return data as DBMultiSigAccount
  }

  /**
   * Save signers for multi-sig account
   */
  async saveSigners(
    multisigAccountId: string,
    signers: Signer[]
  ): Promise<DBSigner[]> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signers')
      .insert(
        signers.map(signer => ({
          multisig_account_id: multisigAccountId,
          signer_address: signer.account,
          signer_weight: signer.weight
        }))
      )
      .select()

    if (error) throw new Error(`Failed to save signers: ${error.message}`)
    return data as DBSigner[]
  }

  /**
   * Create pending multi-sig transaction
   */
  async createPendingTransaction(
    multisigAccountId: string,
    transaction: Transaction,
    transactionBlob: string,
    requiredWeight: number,
    expiresAt?: Date
  ): Promise<DBPendingTransaction> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .insert({
        multisig_account_id: multisigAccountId,
        transaction_blob: transactionBlob,
        transaction_type: transaction.TransactionType,
        required_weight: requiredWeight,
        current_weight: 0,
        status: 'pending',
        expires_at: expiresAt?.toISOString() || null
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create pending transaction: ${error.message}`)
    return data as DBPendingTransaction
  }

  /**
   * Save signature for pending transaction
   */
  async saveSignature(
    pendingTransactionId: string,
    signature: MultiSigSignature,
    signerWeight: number
  ): Promise<DBSignature> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .insert({
        pending_transaction_id: pendingTransactionId,
        signer_address: signature.account,
        signature: signature.signature,
        public_key: signature.publicKey
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save signature: ${error.message}`)

    // Update current weight on pending transaction
    await this.incrementTransactionWeight(pendingTransactionId, signerWeight)

    return data as DBSignature
  }

  /**
   * Update pending transaction weight and status (public method)
   */
  async incrementTransactionWeight(
    pendingTransactionId: string,
    additionalWeight: number
  ): Promise<void> {
    const { data: transaction } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('current_weight, required_weight')
      .eq('id', pendingTransactionId)
      .single()

    if (!transaction) return

    const newWeight = transaction.current_weight + additionalWeight
    const newStatus = newWeight >= transaction.required_weight ? 'ready' : 'pending'

    await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .update({
        current_weight: newWeight,
        status: newStatus
      })
      .eq('id', pendingTransactionId)
  }

  /**
   * Update pending transaction weight and status
   */
  private async updateTransactionWeight(
    pendingTransactionId: string,
    additionalWeight: number
  ): Promise<void> {
    // Call the public method
    await this.incrementTransactionWeight(pendingTransactionId, additionalWeight)
  }

  /**
   * Create pending transaction by wallet address
   */
  async createPendingTransactionByWallet(
    walletAddress: string,
    transaction: Transaction,
    transactionBlob: string,
    requiredWeight: number,
    expiresAt?: Date
  ): Promise<DBPendingTransaction> {
    // Get multisig account first
    const account = await this.getMultiSigAccount(walletAddress)
    if (!account) {
      throw new Error('Multi-sig account not found for wallet address')
    }

    return this.createPendingTransaction(
      account.id,
      transaction,
      transactionBlob,
      requiredWeight,
      expiresAt
    )
  }

  /**
   * Save signature by transaction ID and signer address
   */
  async saveSignatureSimple(
    pendingTransactionId: string,
    signerAddress: string,
    signatureBlob: string
  ): Promise<void> {
    // Get the signer to find their weight
    const { data: pendingTx } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('multisig_account_id')
      .eq('id', pendingTransactionId)
      .single()

    if (!pendingTx) throw new Error('Pending transaction not found')

    const signers = await this.getSigners(pendingTx.multisig_account_id)
    const signer = signers.find(s => s.signer_address === signerAddress)
    
    if (!signer) throw new Error('Signer not found in account signer list')

    const { error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .insert({
        pending_transaction_id: pendingTransactionId,
        signer_address: signerAddress,
        signature: signatureBlob,
        public_key: '' // tx_blob doesn't contain separate public key
      })

    if (error) throw new Error(`Failed to save signature: ${error.message}`)

    // Update weight
    await this.incrementTransactionWeight(pendingTransactionId, signer.signer_weight)
  }

  /**
   * Get pending transaction signatures
   */
  async getPendingTransactionSignatures(
    pendingTransactionId: string
  ): Promise<DBSignature[]> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .select('*')
      .eq('pending_transaction_id', pendingTransactionId)
      .order('signed_at', { ascending: true })

    if (error) throw new Error(`Failed to get signatures: ${error.message}`)
    return data as DBSignature[]
  }

  /**
   * Mark transaction as submitted
   */
  async markTransactionSubmitted(
    pendingTransactionId: string,
    transactionHash: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        transaction_hash: transactionHash
      })
      .eq('id', pendingTransactionId)

    if (error) throw new Error(`Failed to mark transaction as submitted: ${error.message}`)
  }

  /**
   * Get multi-sig account by address
   */
  async getMultiSigAccount(accountAddress: string): Promise<DBMultiSigAccount | null> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_accounts')
      .select('*')
      .eq('account_address', accountAddress)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get multi-sig account: ${error.message}`)
    }
    return data as DBMultiSigAccount
  }

  /**
   * Get pending transactions by wallet address
   */
  async getPendingTransactionsByWallet(
    walletAddress: string,
    status?: 'pending' | 'ready'
  ): Promise<DBPendingTransaction[]> {
    // First get the multisig account
    const account = await this.getMultiSigAccount(walletAddress)
    if (!account) return []

    let query = this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('*')
      .eq('multisig_account_id', account.id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get pending transactions: ${error.message}`)
    return data as DBPendingTransaction[]
  }

  /**
   * Get pending transactions for account
   */
  async getPendingTransactions(
    multisigAccountId: string,
    status?: 'pending' | 'ready'
  ): Promise<DBPendingTransaction[]> {
    let query = this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('*')
      .eq('multisig_account_id', multisigAccountId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get pending transactions: ${error.message}`)
    return data as DBPendingTransaction[]
  }

  /**
   * Get signers for multi-sig account
   */
  async getSigners(multisigAccountId: string): Promise<DBSigner[]> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signers')
      .select('*')
      .eq('multisig_account_id', multisigAccountId)

    if (error) throw new Error(`Failed to get signers: ${error.message}`)
    return data as DBSigner[]
  }
}
