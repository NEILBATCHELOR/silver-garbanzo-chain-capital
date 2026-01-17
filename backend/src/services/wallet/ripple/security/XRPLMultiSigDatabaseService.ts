/**
 * XRPL Multi-Signature Database Service
 * Manages multi-sig account and transaction data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
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
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Save multi-sig account setup
   */
  async saveMultiSigAccount(params: {
    projectId: string
    accountAddress: string
    signerQuorum: number
    setupTransactionHash: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_accounts')
      .insert({
        project_id: params.projectId,
        account_address: params.accountAddress,
        signer_quorum: params.signerQuorum,
        setup_transaction_hash: params.setupTransactionHash,
        status: 'active'
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save multi-sig account: ${error.message}`)
    return data.id
  }

  /**
   * Save individual signer
   */
  async saveSigner(params: {
    multiSigAccountId: string
    signerAddress: string
    signerWeight: number
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signers')
      .insert({
        multisig_account_id: params.multiSigAccountId,
        signer_address: params.signerAddress,
        signer_weight: params.signerWeight
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save signer: ${error.message}`)
    return data.id
  }

  /**
   * Deactivate multi-sig account
   */
  async deactivateMultiSigAccount(accountAddress: string): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_multisig_accounts')
      .update({ status: 'inactive' })
      .eq('account_address', accountAddress)

    if (error) throw new Error(`Failed to deactivate account: ${error.message}`)
  }

  /**
   * Create proposal
   */
  async createProposal(params: {
    multiSigAccountId: string
    transactionBlob: string
    transactionType: string
    requiredWeight: number
    expiresAt?: Date
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .insert({
        multisig_account_id: params.multiSigAccountId,
        transaction_blob: params.transactionBlob,
        transaction_type: params.transactionType,
        required_weight: params.requiredWeight,
        current_weight: 0,
        status: 'pending',
        expires_at: params.expiresAt?.toISOString() || null
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create proposal: ${error.message}`)
    return data.id
  }

  /**
   * Get proposal by ID
   */
  async getProposal(proposalId: string): Promise<{
    id: string
    multiSigAccountId: string
    transactionBlob: string
    transactionType: string
    requiredWeight: number
    currentWeight: number
    status: string
    expiresAt: Date | null
  } | null> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get proposal: ${error.message}`)
    }

    return {
      id: data.id,
      multiSigAccountId: data.multisig_account_id,
      transactionBlob: data.transaction_blob,
      transactionType: data.transaction_type,
      requiredWeight: data.required_weight,
      currentWeight: data.current_weight,
      status: data.status,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null
    }
  }

  /**
   * Get signature
   */
  async getSignature(proposalId: string, signerAddress: string): Promise<{
    id: string
    signature: string
    publicKey: string
  } | null> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .select('*')
      .eq('pending_transaction_id', proposalId)
      .eq('signer_address', signerAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get signature: ${error.message}`)
    }

    return {
      id: data.id,
      signature: data.signature,
      publicKey: data.public_key
    }
  }

  /**
   * Get signer
   */
  async getSigner(multiSigAccountId: string, signerAddress: string): Promise<{
    id: string
    signerWeight: number
  } | null> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signers')
      .select('*')
      .eq('multisig_account_id', multiSigAccountId)
      .eq('signer_address', signerAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get signer: ${error.message}`)
    }

    return {
      id: data.id,
      signerWeight: data.signer_weight
    }
  }

  /**
   * Save signature
   */
  async saveSignature(params: {
    proposalId: string
    signerAddress: string
    signature: string
    publicKey: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .insert({
        pending_transaction_id: params.proposalId,
        signer_address: params.signerAddress,
        signature: params.signature,
        public_key: params.publicKey
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save signature: ${error.message}`)
    return data.id
  }

  /**
   * Update proposal weight
   */
  async updateProposalWeight(proposalId: string, additionalWeight: number): Promise<void> {
    const proposal = await this.getProposal(proposalId)
    if (!proposal) return

    const newWeight = proposal.currentWeight + additionalWeight
    const newStatus = newWeight >= proposal.requiredWeight ? 'ready' : 'pending'

    await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .update({
        current_weight: newWeight,
        status: newStatus
      })
      .eq('id', proposalId)
  }

  /**
   * Get proposal with signatures
   */
  async getProposalWithSignatures(proposalId: string): Promise<{
    proposal: {
      id: string
      multiSigAccountId: string
      transactionBlob: string
      transactionType: string
      requiredWeight: number
      currentWeight: number
      status: string
      expiresAt: Date | null
    }
    signatures: Array<{
      signerAddress: string
      signature: string
      publicKey: string
    }>
  } | null> {
    const proposal = await this.getProposal(proposalId)
    if (!proposal) return null

    const { data: sigData, error } = await this.supabase
      .from('xrpl_multisig_signatures')
      .select('*')
      .eq('pending_transaction_id', proposalId)

    if (error) throw new Error(`Failed to get signatures: ${error.message}`)

    return {
      proposal,
      signatures: (sigData || []).map((sig: any) => ({
        signerAddress: sig.signer_address,
        signature: sig.signature,
        publicKey: sig.public_key
      }))
    }
  }

  /**
   * Update proposal status
   */
  async updateProposalStatus(proposalId: string, status: string, transactionHash?: string): Promise<void> {
    const update: any = { status }
    if (transactionHash) {
      update.transaction_hash = transactionHash
      update.submitted_at = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('xrpl_multisig_pending_transactions')
      .update(update)
      .eq('id', proposalId)

    if (error) throw new Error(`Failed to update proposal status: ${error.message}`)
  }

  /**
   * Get multi-sig account by address
   */
  async getMultiSigAccount(accountAddress: string): Promise<{
    id: string
    projectId: string
    accountAddress: string
    signerQuorum: number
    status: string
  } | null> {
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

    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      signerQuorum: data.signer_quorum,
      status: data.status
    }
  }

  /**
   * List proposals with pagination
   */
  async listProposals(params: {
    accountAddress?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<Array<{
    id: string
    multiSigAccountId: string
    transactionType: string
    requiredWeight: number
    currentWeight: number
    status: string
    createdAt: Date
    expiresAt: Date | null
  }>> {
    let query = this.supabase
      .from('xrpl_multisig_pending_transactions')
      .select('*')

    if (params.accountAddress) {
      const account = await this.getMultiSigAccount(params.accountAddress)
      if (account) {
        query = query.eq('multisig_account_id', account.id)
      }
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(params.limit || 50)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1)

    const { data, error } = await query

    if (error) throw new Error(`Failed to list proposals: ${error.message}`)

    return (data || []).map((p: any) => ({
      id: p.id,
      multiSigAccountId: p.multisig_account_id,
      transactionType: p.transaction_type,
      requiredWeight: p.required_weight,
      currentWeight: p.current_weight,
      status: p.status,
      createdAt: new Date(p.created_at),
      expiresAt: p.expires_at ? new Date(p.expires_at) : null
    }))
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
