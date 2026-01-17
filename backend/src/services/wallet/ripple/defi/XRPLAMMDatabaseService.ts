/**
 * XRPL AMM Database Service
 * Manages AMM pool and liquidity data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class XRPLAMMDatabaseService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Save AMM pool
   */
  async saveAMMPool(params: {
    projectId: string
    ammId: string
    lpTokenCurrency: string
    asset1Currency: string
    asset1Issuer?: string
    asset1Balance: string
    asset2Currency: string
    asset2Issuer?: string
    asset2Balance: string
    lpTokenSupply: string
    tradingFee: number
    transactionHash: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .insert({
        project_id: params.projectId,
        amm_id: params.ammId,
        lp_token_currency: params.lpTokenCurrency,
        asset1_currency: params.asset1Currency,
        asset1_issuer: params.asset1Issuer,
        asset1_balance: params.asset1Balance,
        asset2_currency: params.asset2Currency,
        asset2_issuer: params.asset2Issuer,
        asset2_balance: params.asset2Balance,
        lp_token_supply: params.lpTokenSupply,
        trading_fee: params.tradingFee,
        creation_transaction_hash: params.transactionHash,
        status: 'active'
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save AMM pool: ${error.message}`)
    return data.id
  }

  /**
   * Save liquidity position
   */
  async saveLiquidityPosition(params: {
    poolId: string
    userAddress: string
    lpTokenBalance: string
    sharePercentage: number
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_liquidity_positions')
      .insert({
        pool_id: params.poolId,
        user_address: params.userAddress,
        lp_token_balance: params.lpTokenBalance,
        share_percentage: params.sharePercentage
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save liquidity position: ${error.message}`)
    return data.id
  }

  /**
   * Update liquidity position
   */
  async updateLiquidityPosition(params: {
    poolId: string
    userAddress: string
    lpTokenBalance: string
    sharePercentage: number
  }): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_amm_liquidity_positions')
      .update({
        lp_token_balance: params.lpTokenBalance,
        share_percentage: params.sharePercentage,
        updated_at: new Date().toISOString()
      })
      .eq('pool_id', params.poolId)
      .eq('user_address', params.userAddress)

    if (error) throw new Error(`Failed to update liquidity position: ${error.message}`)
  }

  /**
   * Save AMM transaction
   */
  async saveAMMTransaction(params: {
    poolId: string
    transactionType: 'create' | 'deposit' | 'withdraw' | 'vote' | 'bid'
    userAddress: string
    asset1Amount?: string
    asset2Amount?: string
    lpTokenAmount?: string
    transactionHash: string
    ledgerIndex?: number
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_transactions')
      .insert({
        pool_id: params.poolId,
        transaction_type: params.transactionType,
        user_address: params.userAddress,
        asset1_amount: params.asset1Amount,
        asset2_amount: params.asset2Amount,
        lp_token_amount: params.lpTokenAmount,
        transaction_hash: params.transactionHash,
        ledger_index: params.ledgerIndex
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save AMM transaction: ${error.message}`)
    return data.id
  }

  /**
   * Get AMM pool by ID
   */
  async getAMMPool(ammId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .select('*')
      .eq('amm_id', ammId)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get AMM pool: ${error.message}`)
    }

    return data
  }

  /**
   * Get liquidity position
   */
  async getLiquidityPosition(poolId: string, userAddress: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_liquidity_positions')
      .select('*')
      .eq('pool_id', poolId)
      .eq('user_address', userAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get liquidity position: ${error.message}`)
    }

    return data
  }

  /**
   * List AMM pools for project
   */
  async listAMMPools(projectId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_pools')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to list AMM pools: ${error.message}`)
    return data || []
  }

  /**
   * List liquidity positions for user
   */
  async listUserPositions(userAddress: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('xrpl_amm_liquidity_positions')
      .select(`
        *,
        xrpl_amm_pools (
          amm_id,
          asset1_currency,
          asset2_currency,
          trading_fee
        )
      `)
      .eq('user_address', userAddress)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to list user positions: ${error.message}`)
    return data || []
  }
}
