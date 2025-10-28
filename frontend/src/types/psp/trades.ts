/**
 * PSP Trades Types
 * Types for currency trading transactions
 */

export type TradeStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface PspTrade {
  id: string
  project_id: string
  warp_trade_id: string | null
  virtual_account_id: string | null
  source_symbol: string
  source_network: string | null
  source_amount: string
  destination_symbol: string
  destination_network: string | null
  destination_amount: string | null
  exchange_rate: string | null
  fee_amount: string | null
  fee_currency: string | null
  status: TradeStatus
  error_message: string | null
  executed_at: string | null
  created_at: string
  updated_at: string
}

export interface TradeListFilters {
  project_id?: string
  virtual_account_id?: string
  status?: TradeStatus
  source_symbol?: string
  destination_symbol?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface CreateTradeRequest {
  project_id: string
  virtual_account_id?: string
  source_symbol: string
  source_network?: string
  source_amount: string
  destination_symbol: string
  destination_network?: string
}

export interface MarketRate {
  from_symbol: string
  to_symbol: string
  rate: number
  timestamp: string
}

export interface TradesSummary {
  total_count: number
  total_volume_usd: number
  by_status: Record<TradeStatus, number>
  recent_trades: PspTrade[]
}
