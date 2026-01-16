/**
 * XRPL DEX Database Service
 * Phase 14.1: DEX Trading Infrastructure
 * Handles database operations for orders, trades, and order book snapshots
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  DEXOrder,
  DEXTrade,
  OrderBookSnapshot,
  OrderBook,
  OrderStatus,
  OrderType,
  TradeHistoryQuery,
  OrderHistoryQuery
} from './dex-types'

export class XRPLDEXDatabaseService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }

  /**
   * Save order to database
   */
  async saveOrder(order: Omit<DEXOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<DEXOrder> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_orders')
      .insert({
        project_id: order.projectId,
        account_address: order.accountAddress,
        order_sequence: order.orderSequence,
        order_type: order.orderType,
        base_currency: order.baseCurrency,
        base_issuer: order.baseIssuer,
        quote_currency: order.quoteCurrency,
        quote_issuer: order.quoteIssuer,
        taker_gets_amount: order.takerGetsAmount,
        taker_pays_amount: order.takerPaysAmount,
        price: order.price,
        status: order.status,
        filled_amount: order.filledAmount,
        remaining_amount: order.remainingAmount,
        expiration: order.expiration,
        creation_transaction_hash: order.creationTransactionHash
      })
      .select()
      .single()

    if (error) throw error
    return this.mapOrderFromDB(data)
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    cancellationTxHash?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'cancelled' && cancellationTxHash) {
      updates.cancellation_transaction_hash = cancellationTxHash
      updates.cancelled_at = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('xrpl_dex_orders')
      .update(updates)
      .eq('id', orderId)

    if (error) throw error
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<DEXOrder | null> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) return null
    return this.mapOrderFromDB(data)
  }

  /**
   * Get orders by account
   */
  async getOrdersByAccount(
    projectId: string,
    accountAddress: string,
    status?: OrderStatus
  ): Promise<DEXOrder[]> {
    let query = this.supabase
      .from('xrpl_dex_orders')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(this.mapOrderFromDB)
  }

  /**
   * Get order history with filters
   */
  async getOrderHistory(query: OrderHistoryQuery): Promise<DEXOrder[]> {
    let dbQuery = this.supabase
      .from('xrpl_dex_orders')
      .select('*')
      .eq('project_id', query.projectId)

    if (query.accountAddress) {
      dbQuery = dbQuery.eq('account_address', query.accountAddress)
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    if (query.pair) {
      dbQuery = dbQuery
        .eq('base_currency', query.pair.baseCurrency)
        .eq('quote_currency', query.pair.quoteCurrency)
    }

    if (query.startDate) {
      dbQuery = dbQuery.gte('created_at', query.startDate.toISOString())
    }

    if (query.endDate) {
      dbQuery = dbQuery.lte('created_at', query.endDate.toISOString())
    }

    dbQuery = dbQuery.order('created_at', { ascending: false })

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit)
    }

    if (query.offset) {
      dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1)
    }

    const { data, error } = await dbQuery

    if (error) throw error
    return data.map(this.mapOrderFromDB)
  }

  /**
   * Save trade to database
   */
  async saveTrade(trade: Omit<DEXTrade, 'id' | 'executedAt'>): Promise<DEXTrade> {
    const { data, error } = await this.supabase
      .from('xrpl_dex_trades')
      .insert({
        project_id: trade.projectId,
        maker_address: trade.makerAddress,
        taker_address: trade.takerAddress,
        base_currency: trade.baseCurrency,
        base_issuer: trade.baseIssuer,
        quote_currency: trade.quoteCurrency,
        quote_issuer: trade.quoteIssuer,
        base_amount: trade.baseAmount,
        quote_amount: trade.quoteAmount,
        price: trade.price,
        transaction_hash: trade.transactionHash,
        ledger_index: trade.ledgerIndex
      })
      .select()
      .single()

    if (error) throw error
    return this.mapTradeFromDB(data)
  }

  /**
   * Get trade history
   */
  async getTradeHistory(query: TradeHistoryQuery): Promise<DEXTrade[]> {
    let dbQuery = this.supabase
      .from('xrpl_dex_trades')
      .select('*')
      .eq('project_id', query.projectId)

    if (query.pair) {
      dbQuery = dbQuery
        .eq('base_currency', query.pair.baseCurrency)
        .eq('quote_currency', query.pair.quoteCurrency)
    }

    if (query.startDate) {
      dbQuery = dbQuery.gte('executed_at', query.startDate.toISOString())
    }

    if (query.endDate) {
      dbQuery = dbQuery.lte('executed_at', query.endDate.toISOString())
    }

    dbQuery = dbQuery.order('executed_at', { ascending: false })

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit)
    }

    if (query.offset) {
      dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1)
    }

    const { data, error } = await dbQuery

    if (error) throw error
    return data.map(this.mapTradeFromDB)
  }

  /**
   * Save order book snapshot
   */
  async saveOrderBookSnapshot(orderBook: OrderBook, projectId: string): Promise<void> {
    const { error } = await this.supabase.from('xrpl_dex_orderbook_snapshots').insert({
      project_id: projectId,
      base_currency: orderBook.baseCurrency,
      base_issuer: orderBook.baseIssuer,
      quote_currency: orderBook.quoteCurrency,
      quote_issuer: orderBook.quoteIssuer,
      bids: orderBook.bids,
      asks: orderBook.asks,
      ledger_index: null
    })

    if (error) throw error
  }

  /**
   * Map database order to DEXOrder type
   */
  private mapOrderFromDB(data: any): DEXOrder {
    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      orderSequence: data.order_sequence,
      orderType: data.order_type as OrderType,
      baseCurrency: data.base_currency,
      baseIssuer: data.base_issuer,
      quoteCurrency: data.quote_currency,
      quoteIssuer: data.quote_issuer,
      takerGetsAmount: data.taker_gets_amount,
      takerPaysAmount: data.taker_pays_amount,
      price: data.price,
      status: data.status as OrderStatus,
      filledAmount: data.filled_amount,
      remainingAmount: data.remaining_amount,
      expiration: data.expiration ? new Date(data.expiration) : undefined,
      creationTransactionHash: data.creation_transaction_hash,
      cancellationTransactionHash: data.cancellation_transaction_hash,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined
    }
  }

  /**
   * Map database trade to DEXTrade type
   */
  private mapTradeFromDB(data: any): DEXTrade {
    return {
      id: data.id,
      projectId: data.project_id,
      makerAddress: data.maker_address,
      takerAddress: data.taker_address,
      baseCurrency: data.base_currency,
      baseIssuer: data.base_issuer,
      quoteCurrency: data.quote_currency,
      quoteIssuer: data.quote_issuer,
      baseAmount: data.base_amount,
      quoteAmount: data.quote_amount,
      price: data.price,
      transactionHash: data.transaction_hash,
      ledgerIndex: data.ledger_index,
      executedAt: new Date(data.executed_at)
    }
  }
}
