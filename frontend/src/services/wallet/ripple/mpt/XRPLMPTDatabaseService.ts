/**
 * XRPL MPT Database Service
 * Handles database operations for MPT (Multi-Purpose Token) records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client'

export interface MPTIssuanceRecord {
  id?: string
  project_id: string
  issuance_id: string
  issuer_address: string
  asset_scale: number
  maximum_amount?: string
  transfer_fee?: number
  outstanding_amount?: string
  ticker: string
  name: string
  description?: string
  icon_url?: string
  asset_class?: string
  asset_subclass?: string
  issuer_name?: string
  metadata_json?: Record<string, unknown>
  can_transfer?: boolean
  can_trade?: boolean
  can_lock?: boolean
  can_clawback?: boolean
  require_auth?: boolean
  flags?: number
  status?: string
  creation_transaction_hash: string
  created_at?: string
  updated_at?: string
}

export interface MPTHolderRecord {
  id?: string
  project_id: string
  issuance_id: string
  holder_address: string
  balance?: string
  authorized?: boolean
  authorization_transaction_hash?: string
  authorized_at?: string
  created_at?: string
  updated_at?: string
}

export interface MPTTransactionRecord {
  id?: string
  project_id: string
  issuance_id: string
  transaction_type: string
  from_address: string
  to_address: string
  amount: string
  transaction_hash: string
  ledger_index?: number
  status?: string
  created_at?: string
}

export class XRPLMPTDatabaseService {
  /**
   * Create MPT issuance record in database
   */
  static async createIssuance(record: MPTIssuanceRecord) {
    const { data, error } = await supabase
      .from('mpt_issuances')
      .insert(record)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create MPT issuance record: ${error.message}`)
    }

    return data
  }

  /**
   * Get MPT issuance by ID
   */
  static async getIssuance(projectId: string, issuanceId: string) {
    const { data, error } = await supabase
      .from('mpt_issuances')
      .select('*')
      .eq('project_id', projectId)
      .eq('issuance_id', issuanceId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get MPT issuance: ${error.message}`)
    }

    return data
  }

  /**
   * Get all MPT issuances for a project
   */
  static async getIssuances(projectId: string) {
    const { data, error } = await supabase
      .from('mpt_issuances')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get MPT issuances: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update MPT issuance outstanding amount
   */
  static async updateOutstandingAmount(
    projectId: string,
    issuanceId: string,
    outstandingAmount: string
  ) {
    const { data, error } = await supabase
      .from('mpt_issuances')
      .update({ 
        outstanding_amount: outstandingAmount,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('issuance_id', issuanceId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update MPT outstanding amount: ${error.message}`)
    }

    return data
  }

  /**
   * Create or update MPT holder record
   */
  static async upsertHolder(record: MPTHolderRecord) {
    const { data, error } = await supabase
      .from('mpt_holders')
      .upsert(record, {
        onConflict: 'issuance_id,holder_address',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to upsert MPT holder: ${error.message}`)
    }

    return data
  }

  /**
   * Get MPT holders for an issuance
   */
  static async getHolders(projectId: string, issuanceId: string) {
    const { data, error } = await supabase
      .from('mpt_holders')
      .select('*')
      .eq('project_id', projectId)
      .eq('issuance_id', issuanceId)
      .order('balance', { ascending: false })

    if (error) {
      throw new Error(`Failed to get MPT holders: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update holder balance
   */
  static async updateHolderBalance(
    projectId: string,
    issuanceId: string,
    holderAddress: string,
    balance: string
  ) {
    const { data, error } = await supabase
      .from('mpt_holders')
      .update({ 
        balance,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('issuance_id', issuanceId)
      .eq('holder_address', holderAddress)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update holder balance: ${error.message}`)
    }

    return data
  }

  /**
   * Create MPT transaction record
   */
  static async createTransaction(record: MPTTransactionRecord) {
    const { data, error } = await supabase
      .from('mpt_transactions')
      .insert(record)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create MPT transaction record: ${error.message}`)
    }

    return data
  }

  /**
   * Get MPT transactions for an issuance
   */
  static async getTransactions(projectId: string, issuanceId: string, limit: number = 100) {
    const { data, error } = await supabase
      .from('mpt_transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('issuance_id', issuanceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get MPT transactions: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get MPT transactions for a holder
   */
  static async getHolderTransactions(
    projectId: string,
    holderAddress: string,
    limit: number = 100
  ) {
    const { data, error } = await supabase
      .from('mpt_transactions')
      .select('*')
      .eq('project_id', projectId)
      .or(`from_address.eq.${holderAddress},to_address.eq.${holderAddress}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get holder transactions: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get transaction by hash
   */
  static async getTransactionByHash(projectId: string, transactionHash: string) {
    const { data, error } = await supabase
      .from('mpt_transactions')
      .select('*')
      .eq('project_id', projectId)
      .eq('transaction_hash', transactionHash)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get transaction: ${error.message}`)
    }

    return data
  }
}
