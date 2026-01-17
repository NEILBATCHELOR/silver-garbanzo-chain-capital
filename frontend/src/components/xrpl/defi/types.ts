/**
 * XRPL AMM UI Component Types
 * Type definitions for AMM (Automated Market Maker) UI components
 */

import type { Wallet } from 'xrpl'

export interface AMMUIProps {
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
}

export interface AMMPoolCreatorProps extends AMMUIProps {
  onSuccess?: () => void
}

export interface AMMPoolListProps extends AMMUIProps {
  onSelectPool?: (pool: AMMPoolData) => void
}

export interface AMMAddLiquidityProps {
  pool: AMMPoolData
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
  onSuccess?: () => void
}

export interface AMMRemoveLiquidityProps {
  pool: AMMPoolData
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
  onSuccess?: () => void
}

export interface AMMAuctionSlotProps {
  pool: AMMPoolData
  wallet: Wallet
  network: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
  onSuccess?: () => void
}

export interface AMMPoolData {
  id: string // Database record ID
  poolId: string
  ammId: string
  lpTokenCurrency: string
  
  // Assets
  asset1Currency: string
  asset1Issuer?: string
  asset1Balance: string
  
  asset2Currency: string
  asset2Issuer?: string
  asset2Balance: string
  
  // Pool parameters
  lpTokenSupply: string
  tradingFee: number
  
  // Auction slot
  auctionSlotHolder?: string
  auctionSlotPrice?: string
  auctionSlotExpiration?: Date
  
  // Status
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface LiquidityPositionData {
  positionId: string
  poolId: string
  userAddress: string
  lpTokenBalance: string
  sharePercentage: number
  asset1Value: string
  asset2Value: string
  totalValueUSD: string
  feesEarnedAsset1: string
  feesEarnedAsset2: string
  impermanentLoss: string
  createdAt: Date
}

export interface AMMTransactionData {
  id: string
  poolId: string
  transactionType: 'create' | 'deposit' | 'withdraw' | 'vote' | 'bid'
  userAddress: string
  asset1Amount?: string
  asset2Amount?: string
  lpTokenAmount?: string
  transactionHash: string
  timestamp: Date
}

export interface CreatePoolFormData {
  asset1Currency: string
  asset1Issuer?: string
  asset1Amount: string
  
  asset2Currency: string
  asset2Issuer?: string
  asset2Amount: string
  
  tradingFee: number // 0-1000 (0-1%)
}

export interface AddLiquidityFormData {
  poolId: string
  asset1Amount: string
  asset2Amount?: string
  lpTokensOut?: string
  depositMode: 'balanced' | 'single' | 'lp-tokens'
}

export interface RemoveLiquidityFormData {
  poolId: string
  lpTokenAmount: string
  withdrawalMode: 'all' | 'partial'
}

export interface AuctionBidFormData {
  poolId: string
  bidMin?: string
  bidMax?: string
  authAccounts?: string[]
}

export interface VoteFeeFormData {
  poolId: string
  newFee: number // 0-1000 (0-1%)
}

/**
 * Alias for backward compatibility
 */
export type AMMPool = AMMPoolData
export type LiquidityPosition = LiquidityPositionData
