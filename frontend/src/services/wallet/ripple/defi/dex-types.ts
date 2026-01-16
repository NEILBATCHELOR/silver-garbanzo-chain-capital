/**
 * XRPL DEX (Decentralized Exchange) Types
 * Phase 14.1: DEX Trading Infrastructure
 */

import { Amount, Currency } from 'xrpl'

// Order Types
export type OrderType = 'buy' | 'sell'
export type OrderStatus = 'active' | 'filled' | 'cancelled' | 'expired'

// Currency Asset Interface
export interface CurrencyAsset {
  currency: string
  issuer?: string
  value?: string
}

// Offer Parameters for Creating Orders
export interface OfferParams {
  takerGets: string | Amount
  takerPays: string | Amount
  expiration?: number
  offerSequence?: number
}

// DEX Order (matches database schema)
export interface DEXOrder {
  id: string
  projectId: string
  accountAddress: string
  orderSequence: number
  orderType: OrderType
  baseCurrency: string
  baseIssuer?: string
  quoteCurrency: string
  quoteIssuer?: string
  takerGetsAmount: string
  takerPaysAmount: string
  price: string
  status: OrderStatus
  filledAmount: string
  remainingAmount?: string
  expiration?: Date
  creationTransactionHash: string
  cancellationTransactionHash?: string
  createdAt: Date
  updatedAt: Date
  cancelledAt?: Date
}

// DEX Trade (matches database schema)
export interface DEXTrade {
  id: string
  projectId: string
  makerAddress: string
  takerAddress: string
  baseCurrency: string
  baseIssuer?: string
  quoteCurrency: string
  quoteIssuer?: string
  baseAmount: string
  quoteAmount: string
  price: string
  transactionHash: string
  ledgerIndex?: number
  executedAt: Date
}

// Order Book Entry
export interface OrderBookEntry {
  price: number
  amount: string
  total?: string
  account?: string
}

// Order Book
export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  baseCurrency: string
  baseIssuer?: string
  quoteCurrency: string
  quoteIssuer?: string
  timestamp?: Date
}

// Order Book Snapshot (database)
export interface OrderBookSnapshot {
  id: string
  projectId: string
  baseCurrency: string
  baseIssuer?: string
  quoteCurrency: string
  quoteIssuer?: string
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  snapshotAt: Date
  ledgerIndex?: number
}

// Swap Parameters
export interface SwapParams {
  fromCurrency: string
  fromIssuer?: string
  toCurrency: string
  toIssuer?: string
  amount: string
  maxSlippage?: number // percentage (e.g., 1 = 1%)
  paths?: any[]
}

// Swap Result
export interface SwapResult {
  amountSent: string
  amountReceived: string
  effectivePrice: number
  transactionHash: string
  path?: any[]
}

// Create Order Result
export interface CreateOrderResult {
  orderSequence: number
  transactionHash: string
  status: string
}

// Cancel Order Result
export interface CancelOrderResult {
  transactionHash: string
  status: string
}

// Account Offers
export interface AccountOffer {
  sequence: number
  takerGets: Amount
  takerPays: Amount
  price: number
  expiration?: number
  quality?: string
}

// Trading Pair
export interface TradingPair {
  baseCurrency: string
  baseIssuer?: string
  quoteCurrency: string
  quoteIssuer?: string
}

// Market Depth
export interface MarketDepth {
  pair: TradingPair
  bidDepth: string
  askDepth: string
  spread: number
  midPrice?: number
  lastPrice?: number
  volume24h?: string
}

// Trade History Query
export interface TradeHistoryQuery {
  projectId: string
  pair?: TradingPair
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Order History Query
export interface OrderHistoryQuery {
  projectId: string
  accountAddress?: string
  status?: OrderStatus
  pair?: TradingPair
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}
