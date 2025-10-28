/**
 * PSP Balances Types
 * Types for balance management
 */

export interface PspBalance {
  id: string
  project_id: string
  virtual_account_id: string | null
  asset_type: 'fiat' | 'crypto'
  asset_symbol: string
  network: string | null
  available_balance: string
  locked_balance: string
  pending_balance: string
  total_balance: string
  warp_wallet_id: string | null
  wallet_address: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface BalancesSummary {
  total_usd_value: number
  fiat_balances: PspBalance[]
  crypto_balances: PspBalance[]
  balances_by_asset: Record<string, PspBalance[]>
}

export interface BalanceListFilters {
  project_id?: string
  virtual_account_id?: string
  asset_type?: 'fiat' | 'crypto'
  asset_symbol?: string
  network?: string
}

export interface SyncBalancesRequest {
  project_id: string
  virtual_account_id?: string
}
