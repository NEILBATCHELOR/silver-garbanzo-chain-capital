/**
 * XRPL AMM (Automated Market Maker) Types
 * XLS-30d Standard Implementation
 */

import { Wallet } from 'xrpl'

/**
 * Currency representation for AMM pools
 */
export interface AMMCurrency {
  currency: string
  issuer?: string
  value?: string
}

/**
 * Parameters for creating an AMM pool
 */
export interface AMMPoolParams {
  wallet: Wallet
  asset1: AMMCurrency
  asset2: AMMCurrency
  tradingFee: number // 0-1000 (0-1%)
}

/**
 * Parameters for adding liquidity to AMM pool
 */
export interface AMMAddLiquidityParams {
  wallet: Wallet
  asset1: AMMCurrency
  asset2: AMMCurrency
  asset1Amount?: string
  asset2Amount?: string
  lpTokensOut?: string
}

/**
 * Parameters for removing liquidity from AMM pool
 */
export interface AMMRemoveLiquidityParams {
  wallet: Wallet
  asset1: AMMCurrency
  asset2: AMMCurrency
  lpTokenAmount: string
}

/**
 * Parameters for voting on trading fee
 */
export interface AMMVoteParams {
  wallet: Wallet
  asset1: AMMCurrency
  asset2: AMMCurrency
  tradingFee: number
}

/**
 * Parameters for bidding on auction slot
 */
export interface AMMAuctionBidParams {
  wallet: Wallet
  asset1: AMMCurrency
  asset2: AMMCurrency
  bidMin?: string
  bidMax?: string
  authAccounts?: string[]
}

/**
 * Liquidity position in an AMM pool
 */
export interface LiquidityPosition {
  poolId: string
  lpTokenBalance: string
  asset1Balance: string
  asset2Balance: string
  sharePercentage: number
  asset1Value?: string
  asset2Value?: string
  totalValueUsd?: number
}

/**
 * AMM pool information
 */
export interface AMMPoolInfo {
  ammId: string
  asset1: AMMCurrency
  asset2: AMMCurrency
  asset1Balance: string
  asset2Balance: string
  lpTokenSupply: string
  tradingFee: number
  auctionSlot?: {
    account?: string
    price?: string
    expiration?: number
  }
}

/**
 * AMM transaction result
 */
export interface AMMTransactionResult {
  transactionHash: string
  ledgerIndex?: number
  success: boolean
  error?: string
}

/**
 * AMM pool creation result
 */
export interface AMMCreateResult extends AMMTransactionResult {
  poolId: string
  lpTokenId: string
}

/**
 * AMM liquidity operation result
 */
export interface AMMLiquidityResult extends AMMTransactionResult {
  lpTokensReceived?: string
  asset1Received?: string
  asset2Received?: string
}

/**
 * AMM auction slot result
 */
export interface AMMAuctionSlotResult extends AMMTransactionResult {
  slotPrice: string
  feeDiscount: number
  expiration: number
}

/**
 * Database AMM pool record
 */
export interface DBAMMPool {
  id: string
  project_id: string
  amm_id: string
  lp_token_currency: string
  asset1_currency: string
  asset1_issuer: string | null
  asset1_balance: string
  asset2_currency: string
  asset2_issuer: string | null
  asset2_balance: string
  lp_token_supply: string
  trading_fee: number
  auction_slot_holder: string | null
  auction_slot_price: string | null
  auction_slot_expiration: Date | null
  status: 'active' | 'inactive'
  creation_transaction_hash: string
  created_at: Date
  updated_at: Date
}

/**
 * Database AMM liquidity position record
 */
export interface DBAMMPosition {
  id: string
  pool_id: string
  user_address: string
  lp_token_balance: string
  share_percentage: string
  asset1_value: string | null
  asset2_value: string | null
  total_value_usd: number | null
  fees_earned_asset1: string
  fees_earned_asset2: string
  impermanent_loss: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Database AMM transaction record
 */
export interface DBAMMTransaction {
  id: string
  pool_id: string
  transaction_type: 'create' | 'deposit' | 'withdraw' | 'vote' | 'bid'
  user_address: string
  asset1_amount: string | null
  asset2_amount: string | null
  lp_token_amount: string | null
  transaction_hash: string
  ledger_index: number | null
  timestamp: Date
  metadata: Record<string, any> | null
}

/**
 * AMM Pool for UI components (combines AMMPoolInfo with database fields)
 */
export interface AMMPool extends AMMPoolInfo {
  id?: string
  projectId?: string
  status?: 'active' | 'inactive'
  creationTransactionHash?: string
  createdAt?: Date
  updatedAt?: Date
  // Flattened asset properties for UI convenience
  asset1Currency: string
  asset1Issuer?: string
  asset2Currency: string
  asset2Issuer?: string
}

/**
 * Alias for backward compatibility
 */
export type LiquidityPositionData = LiquidityPosition
