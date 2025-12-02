/**
 * ETF (Exchange-Traded Fund) Types
 * 
 * Comprehensive type definitions for ETF products, holdings, NAV history,
 * and related functionality including crypto ETFs, share classes, and tracking metrics.
 */

import { Database } from '../core/database'

// Base types from database
export type ETFProductRow = Database['public']['Tables']['fund_products']['Row']
export type ETFMetadataRow = Database['public']['Tables']['etf_metadata']['Row']
export type ETFHoldingRow = Database['public']['Tables']['etf_holdings']['Row']
export type ETFNAVHistoryRow = Database['public']['Tables']['etf_nav_history']['Row']
export type ETFTrackingErrorHistoryRow = Database['public']['Tables']['etf_tracking_error_history']['Row']
export type ETFCreationRedemptionRow = Database['public']['Tables']['etf_creation_redemption']['Row']
export type ETFTokenLinkRow = Database['public']['Tables']['etf_token_links']['Row']
export type ETFRebalancingHistoryRow = Database['public']['Tables']['etf_rebalancing_history']['Row']

/**
 * ETF Fund Types
 */
export enum ETFType {
  EQUITY = 'etf_equity',
  BOND = 'etf_bond',
  COMMODITY = 'etf_commodity',
  CRYPTO = 'etf_crypto',
  SECTOR = 'etf_sector',
  THEMATIC = 'etf_thematic',
  SMART_BETA = 'etf_smart_beta'
}

/**
 * Security Types within ETF Holdings
 */
export enum SecurityType {
  EQUITY = 'equity',
  BOND = 'bond',
  CRYPTO = 'crypto',
  COMMODITY = 'commodity',
  CASH = 'cash',
  DERIVATIVE = 'derivative'
}

/**
 * ETF Structure Types
 */
export enum StructureType {
  PHYSICAL = 'physical',
  SYNTHETIC = 'synthetic',
  ACTIVE = 'active',
  PASSIVE = 'passive'
}

/**
 * Replication Methods
 */
export enum ReplicationMethod {
  FULL = 'full',
  OPTIMIZED = 'optimized',
  SWAP_BASED = 'swap_based'
}

/**
 * Registration Status for New ETF Issuance
 */
export enum RegistrationStatus {
  DRAFT = 'draft',
  PENDING_SEC = 'pending_sec',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LIQUIDATING = 'liquidating'
}

/**
 * Blockchain Networks (for crypto ETFs)
 */
export enum Blockchain {
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism'
}

/**
 * Custody Types
 */
export enum CustodyType {
  COLD_STORAGE = 'cold_storage',
  INSTITUTIONAL_CUSTODY = 'institutional_custody',
  MULTI_SIG = 'multi_sig',
  QUALIFIED_CUSTODIAN = 'qualified_custodian'
}

/**
 * ETF Product with metadata
 */
export interface ETFProduct extends Omit<ETFProductRow, 'fund_type'> {
  fund_type: ETFType
  metadata?: ETFMetadata
}

/**
 * ETF Metadata
 */
export interface ETFMetadata extends Omit<ETFMetadataRow, 'supported_blockchains'> {
  supported_blockchains?: Blockchain[] | null
}

/**
 * ETF Holding with enriched data
 */
export interface ETFHolding extends Omit<ETFHoldingRow, 'security_type' | 'blockchain'> {
  security_type: SecurityType
  blockchain?: Blockchain | string | null
}

/**
 * ETF NAV History Record
 */
export interface ETFNAVHistory extends Omit<ETFNAVHistoryRow, 'premium_discount_status'> {
  // Type-safe premium/discount status
  premium_discount_status?: 'premium' | 'discount' | 'fair_value' | null
}

/**
 * ETF with Latest NAV (from view)
 */
export interface ETFWithLatestNAV {
  id: string
  fund_ticker: string
  fund_name: string
  fund_type: ETFType
  net_asset_value: number
  market_price?: number | null
  premium_discount_pct?: number | null
  assets_under_management: number
  shares_outstanding: number
  tracking_error?: number | null
  expense_ratio?: number | null
  benchmark_index?: string | null
  currency: string
  inception_date: string
  status: string
  share_class_name?: string | null
  latest_nav?: number | null
  latest_market_price?: number | null
  latest_premium_discount?: number | null
  nav_date?: string | null
  token_links?: ETFTokenLinkRow[]
}

/**
 * Crypto ETF Holdings Summary (from view)
 */
export interface CryptoETFHoldingsSummary {
  fund_product_id: string
  blockchain: Blockchain
  total_quantity: number
  total_market_value: number
  total_weight_percentage: number
  holdings_count: number
  staked_quantity?: number | null
  staked_value?: number | null
  average_staking_apr?: number | null
}

/**
 * Share Class Comparison (from view)
 */
export interface ShareClassComparison {
  parent_fund_id: string
  parent_ticker: string
  parent_name: string
  share_class_id: string
  share_class_ticker: string
  share_class_name: string
  expense_ratio: number
  nav_per_share?: number | null
  assets_under_management: number
  shares_outstanding: number
}

/**
 * Premium/Discount Latest (from view)
 */
export interface PremiumDiscountLatest {
  fund_product_id: string
  fund_ticker: string
  fund_name: string
  valuation_date: string
  nav_per_share: number
  market_price?: number | null
  premium_discount_amount?: number | null
  premium_discount_pct?: number | null
  status?: 'premium' | 'discount' | 'fair_value'
}

/**
 * ETF Calculation Input
 */
export interface ETFCalculationInput {
  productId: string
  asOfDate: Date
  configOverrides?: Record<string, any>
}

/**
 * ETF Calculation Result
 */
export interface ETFCalculationResult {
  productId: string
  assetType: 'etf'
  valuationDate: Date
  nav: number
  navPerShare: number
  currency: string
  
  // Market price analysis
  marketPrice?: number
  premiumDiscountPct?: number
  premiumDiscountStatus?: 'premium' | 'discount' | 'fair_value'
  
  // Performance metrics
  trackingError?: number
  trackingDifference?: number
  correlation?: number
  rSquared?: number
  
  // Breakdown
  breakdown: {
    totalAssets: number
    totalLiabilities: number
    netAssets: number
    sharesOutstanding: number
    cashPosition: number
    securitiesValue: number
    cryptoValue?: number
    derivativesValue?: number
  }
  
  // Crypto-specific
  cryptoMetrics?: {
    totalCryptoValue: number
    stakingRewardsAccrued: number
    averageStakingYield: number
    holdingsByChain: Record<Blockchain, number>
  }
  
  // Quality indicators
  dataQuality: 'high' | 'medium' | 'low'
  confidence: 'high' | 'medium' | 'low'
  calculationMethod: string
  sources: string[]
}

/**
 * ETF Product Creation Input
 */
export interface CreateETFProductInput {
  project_id: string
  fund_ticker: string
  fund_name: string
  fund_type: ETFType
  net_asset_value?: number
  assets_under_management?: number
  shares_outstanding?: number
  expense_ratio?: number
  total_expense_ratio?: number
  benchmark_index?: string
  currency?: string
  inception_date?: Date
  structure_type?: StructureType
  replication_method?: ReplicationMethod
  registration_status?: RegistrationStatus
  exchange?: string
  isin?: string
  sedol?: string
  cusip?: string
  
  // Metadata
  metadata?: CreateETFMetadataInput
}

/**
 * ETF Metadata Creation Input
 */
export interface CreateETFMetadataInput {
  investment_objective?: string
  strategy_description?: string
  is_crypto_etf?: boolean
  supported_blockchains?: Blockchain[]
  custody_type?: CustodyType
  staking_enabled?: boolean
  rebalancing_frequency?: string
  screening_criteria?: string
  primary_benchmark?: string
}

/**
 * ETF Holding Creation Input
 */
export interface CreateETFHoldingInput {
  fund_product_id: string
  security_name: string
  security_type: SecurityType
  quantity: number
  market_value: number
  weight_percentage: number
  price_per_unit: number
  as_of_date: Date
  security_ticker?: string
  currency?: string
  
  // Identifiers
  isin?: string
  cusip?: string
  sedol?: string
  
  // Crypto-specific
  blockchain?: Blockchain | string
  contract_address?: string
  token_standard?: string
  custody_address?: string
  custodian_name?: string
  custody_type?: CustodyType
  is_staked?: boolean
  staking_apr?: number
  staking_rewards_accrued?: number
  
  // Classification
  sector?: string
  industry?: string
  country?: string
  asset_class?: string
}

/**
 * Share Class Creation Input
 */
export interface CreateShareClassInput {
  parent_fund_id: string
  share_class_name: string
  fund_ticker: string
  fund_name: string
  expense_ratio: number
  minimum_investment?: number
  distribution_frequency?: string
}

/**
 * Bulk Holdings Import Input
 */
export interface BulkHoldingsImportInput {
  fund_product_id: string
  holdings: CreateETFHoldingInput[]
  as_of_date: Date
  replace_existing?: boolean
}

/**
 * ETF Token Link Input
 */
export interface ETFTokenLinkInput {
  fund_product_id: string
  token_id: string
  link_type?: string
  is_active?: boolean
  supports_rebase?: boolean
  rebase_frequency?: string
}

/**
 * Holdings Breakdown by Category
 */
export interface HoldingsBreakdown {
  bySector: Record<string, number>
  byAssetClass: Record<string, number>
  byCountry: Record<string, number>
  bySecurityType: Record<SecurityType, number>
  byBlockchain?: Record<Blockchain, number>
}

/**
 * Tracking Error Analysis
 */
export interface TrackingErrorAnalysis {
  period: string
  trackingError: number
  trackingDifference: number
  correlation: number
  rSquared: number
  informationRatio?: number
  alpha?: number
  beta?: number
}

/**
 * Premium/Discount History Point
 */
export interface PremiumDiscountPoint {
  date: Date
  nav: number
  marketPrice: number
  premiumDiscount: number
  premiumDiscountPct: number
  status: 'premium' | 'discount' | 'fair_value'
}

export default {
  ETFType,
  SecurityType,
  StructureType,
  ReplicationMethod,
  RegistrationStatus,
  Blockchain,
  CustodyType
}
