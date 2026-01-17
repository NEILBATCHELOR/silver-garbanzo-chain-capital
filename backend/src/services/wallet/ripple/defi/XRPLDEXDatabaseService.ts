/**
 * XRPL DEX Database Service
 * Manages DEX order and trade data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class XRPLDEXDatabaseService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Save DEX order
   */
  async saveDEXOrder(params: {
    projectId: string
    accountAddress: string
    orderSequence: number
    orderType: 'buy' | 'sell'
    baseCurrency: string
    baseIssuer?: string
    quoteCurrency: string
    quoteIssuer?: string
    takerGetsAmount: string
    takerPaysAmount: string
    price: number
    expiration?: Date
    transactionHash: string
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_orders')
      .insert({
        project_id: params.projectId,
        account_address: params.accountAddress,
        order_sequence: params.orderSequence,
        order_type: params.orderType,
        base_currency: params.baseCurrency,
        base_issuer: params.baseIssuer,
        quote_currency: params.quoteCurrency,
        quote_issuer: params.quoteIssuer,
        taker_gets_amount: params.takerGetsAmount,
        taker_pays_amount: params.takerPaysAmount,
        price: params.price,
        remaining_amount: params.takerGetsAmount,
        expiration: params.expiration?.toISOString(),
        creation_transaction_hash: params.transactionHash,
        status: 'active'
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save DEX order: ${error.message}`)
    return data.id
  }

  /**
   * Cancel DEX order
   */
  async cancelDEXOrder(params: {
    accountAddress: string
    orderSequence: number
    transactionHash: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_dex_orders')
      .update({
        status: 'cancelled',
        cancellation_transaction_hash: params.transactionHash,
        cancelled_at: new Date().toISOString()
      })
      .eq('account_address', params.accountAddress)
      .eq('order_sequence', params.orderSequence)

    if (error) throw new Error(`Failed to cancel DEX order: ${error.message}`)
  }

  /**
   * Save trade
   */
  async saveTrade(params: {
    makerAddress: string
    takerAddress: string
    baseCurrency: string
    baseIssuer?: string
    quoteCurrency: string
    quoteIssuer?: string
    baseAmount: string
    quoteAmount: string
    price: number
    transactionHash: string
    ledgerIndex?: number
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_trades')
      .insert({
        maker_address: params.makerAddress,
        taker_address: params.takerAddress,
        base_currency: params.baseCurrency,
        base_issuer: params.baseIssuer,
        quote_currency: params.quoteCurrency,
        quote_issuer: params.quoteIssuer,
        base_amount: params.baseAmount,
        quote_amount: params.quoteAmount,
        price: params.price,
        transaction_hash: params.transactionHash,
        ledger_index: params.ledgerIndex
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save trade: ${error.message}`)
    return data.id
  }

  /**
   * Get order by sequence
   */
  async getOrder(accountAddress: string, orderSequence: number): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_orders')
      .select('*')
      .eq('account_address', accountAddress)
      .eq('order_sequence', orderSequence)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get order: ${error.message}`)
    }

    return data
  }

  /**
   * List account orders
   */
  async listAccountOrders(accountAddress: string, status?: string): Promise<any[]> {
    let query = this.supabase
      .from('xrpl_dex_orders')
      .select('*')
      .eq('account_address', accountAddress)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw new Error(`Failed to list account orders: ${error.message}`)
    return data || []
  }

  /**
   * List trades for account
   */
  async listAccountTrades(accountAddress: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_trades')
      .select('*')
      .or(`maker_address.eq.${accountAddress},taker_address.eq.${accountAddress}`)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to list account trades: ${error.message}`)
    return data || []
  }

  /**
   * Get order book snapshot
   */
  async saveOrderBookSnapshot(params: {
    baseCurrency: string
    baseIssuer?: string
    quoteCurrency: string
    quoteIssuer?: string
    bids: any[]
    asks: any[]
    ledgerIndex?: number
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_orderbook_snapshots')
      .insert({
        base_currency: params.baseCurrency,
        base_issuer: params.baseIssuer,
        quote_currency: params.quoteCurrency,
        quote_issuer: params.quoteIssuer,
        bids: params.bids,
        asks: params.asks,
        ledger_index: params.ledgerIndex
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to save order book snapshot: ${error.message}`)
    return data.id
  }
}
