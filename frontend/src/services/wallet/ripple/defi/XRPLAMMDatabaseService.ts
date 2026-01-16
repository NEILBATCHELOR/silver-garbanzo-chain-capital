/**
 * XRPL AMM Database Service
 * Manages AMM pool data persistence with project scoping
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  DBAMMPool,
  DBAMMPosition,
  DBAMMTransaction,
  AMMCreateResult,
  AMMLiquidityResult,
  AMMPoolInfo
} from './types'

export class XRPLAMMDatabaseService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.VITE_SUPABASE_URL || '',
      supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || ''
    )
  }

  /**
   * Save new AMM pool to database
   */
  async saveAMMPool(
    projectId: string,
    poolInfo: AMMPoolInfo,
    creationResult: AMMCreateResult
  ): Promise<DBAMMPool> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .insert({
        project_id: projectId,
        amm_id: poolInfo.ammId,
        lp_token_currency: creationResult.lpTokenId,
        asset1_currency: poolInfo.asset1.currency,
        asset1_issuer: poolInfo.asset1.issuer || null,
        asset1_balance: poolInfo.asset1Balance,
        asset2_currency: poolInfo.asset2.currency,
        asset2_issuer: poolInfo.asset2.issuer || null,
        asset2_balance: poolInfo.asset2Balance,
        lp_token_supply: poolInfo.lpTokenSupply,
        trading_fee: poolInfo.tradingFee,
        auction_slot_holder: poolInfo.auctionSlot?.account || null,
        auction_slot_price: poolInfo.auctionSlot?.price || null,
        auction_slot_expiration: poolInfo.auctionSlot?.expiration 
          ? new Date(poolInfo.auctionSlot.expiration * 1000) 
          : null,
        status: 'active',
        creation_transaction_hash: creationResult.transactionHash
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save AMM pool: ${error.message}`)
    return data as DBAMMPool
  }

  /**
   * Save or update liquidity position
   */
  async saveLiquidityPosition(
    poolId: string,
    userAddress: string,
    lpTokenBalance: string,
    sharePercentage: string
  ): Promise<DBAMMPosition> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_liquidity_positions')
      .upsert({
        pool_id: poolId,
        user_address: userAddress,
        lp_token_balance: lpTokenBalance,
        share_percentage: sharePercentage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'pool_id,user_address'
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save liquidity position: ${error.message}`)
    return data as DBAMMPosition
  }

  /**
   * Record AMM transaction
   */
  async saveAMMTransaction(
    poolId: string,
    transactionType: 'create' | 'deposit' | 'withdraw' | 'vote' | 'bid',
    userAddress: string,
    transactionHash: string,
    amounts?: {
      asset1?: string
      asset2?: string
      lpToken?: string
    },
    metadata?: Record<string, any>
  ): Promise<DBAMMTransaction> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_transactions')
      .insert({
        pool_id: poolId,
        transaction_type: transactionType,
        user_address: userAddress,
        asset1_amount: amounts?.asset1 || null,
        asset2_amount: amounts?.asset2 || null,
        lp_token_amount: amounts?.lpToken || null,
        transaction_hash: transactionHash,
        metadata: metadata || null
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save AMM transaction: ${error.message}`)
    return data as DBAMMTransaction
  }

  /**
   * Get user's liquidity positions
   */
  async getUserPositions(userAddress: string, projectId?: string): Promise<DBAMMPosition[]> {
    let query = this.supabase
      .from('xrpl_amm_liquidity_positions')
      .select('*, pool:xrpl_amm_pools(*)')
      .eq('user_address', userAddress)

    if (projectId) {
      query = query.eq('pool.project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to get user positions: ${error.message}`)
    return data as DBAMMPosition[]
  }

  /**
   * Get pool transaction history
   */
  async getPoolTransactions(poolId: string, limit = 50): Promise<DBAMMTransaction[]> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_transactions')
      .select('*')
      .eq('pool_id', poolId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to get pool transactions: ${error.message}`)
    return data as DBAMMTransaction[]
  }

  /**
   * Update pool balances
   */
  async updatePoolBalances(
    ammId: string,
    asset1Balance: string,
    asset2Balance: string,
    lpTokenSupply: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_amm_pools')
      .update({
        asset1_balance: asset1Balance,
        asset2_balance: asset2Balance,
        lp_token_supply: lpTokenSupply,
        updated_at: new Date().toISOString()
      })
      .eq('amm_id', ammId)

    if (error) throw new Error(`Failed to update pool balances: ${error.message}`)
  }

  /**
   * Get pool by AMM ID
   */
  async getPoolByAMMId(ammId: string): Promise<DBAMMPool | null> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .select('*')
      .eq('amm_id', ammId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get pool: ${error.message}`)
    }
    return data as DBAMMPool
  }

  /**
   * Get all pools for a project
   */
  async getProjectPools(projectId: string): Promise<DBAMMPool[]> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get project pools: ${error.message}`)
    return data as DBAMMPool[]
  }
}
