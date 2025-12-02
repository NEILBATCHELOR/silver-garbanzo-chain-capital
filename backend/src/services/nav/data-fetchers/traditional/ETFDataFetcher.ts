/**
 * Exchange-Traded Fund (ETF) Data Fetcher
 * 
 * Fetches ETF product data and supporting tables:
 * - etf_holdings (individual securities with crypto support)
 * - etf_metadata (ETF-specific details)
 * - etf_nav_history (daily NAV and market price tracking)
 * - etf_tracking_error_history (performance vs benchmark)
 * 
 * Following MMF/Bonds implementation pattern with ZERO HARDCODED VALUES
 * 
 * Database Schema:
 * - Product: fund_products table (with fund_type='etf_*')
 * - Supporting: etf_* tables linked via fund_product_id
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { BaseDataFetcher } from '../BaseDataFetcher'
import {
  FetchRequest,
  FetchResult,
  ProductWithSupporting,
  QueryResult
} from '../types'

// =====================================================
// TYPE DEFINITIONS (Based on actual database schema)
// =====================================================

/**
 * ETF Product from fund_products table
 * Extended with ETF-specific fields
 */
export interface ETFProduct {
  // Core fund_products fields
  id: string
  project_id: string
  fund_ticker: string | null
  fund_name: string
  fund_type: string // 'etf_equity' | 'etf_bond' | 'etf_crypto' | 'etf_commodity' | 'etf_sector' | 'etf_thematic' | 'etf_smart_beta'
  
  // ETF-specific fields in fund_products
  parent_fund_id: string | null // For share classes
  share_class_name: string | null // 'Class A', 'Class I', etc.
  structure_type: string | null // 'physical', 'synthetic', 'active', 'passive'
  replication_method: string | null // 'full', 'optimized', 'swap_based'
  
  // Valuation fields
  net_asset_value: number
  assets_under_management: number
  shares_outstanding: number
  market_price: number | null // Trading price on exchange
  premium_discount_pct: number | null // Market price vs NAV deviation
  
  // Performance & Tracking
  expense_ratio: number | null
  total_expense_ratio: number | null
  tracking_error: number | null
  benchmark_index: string | null
  
  // Registration & Status
  registration_status: string | null // 'draft', 'pending_sec', 'active', 'suspended', 'liquidating'
  status: string
  
  // Trading & Exchange
  exchange: string | null
  isin: string | null
  cusip: string | null
  sedol: string | null
  
  // Dates
  inception_date: Date
  closure_liquidation_date: Date | null
  
  // Other fields
  currency: string
  distribution_frequency: string | null
  holdings: any | null // JSONB
  creation_redemption_history: any | null // JSONB
  performance_history: any | null // JSONB
  flow_data: any | null // JSONB
  
  created_at: Date
  updated_at: Date
}

/**
 * Individual ETF Holding with comprehensive crypto support
 * Key for NAV calculation: market_value field
 */
export interface ETFHolding {
  id: string
  fund_product_id: string
  
  // Security Identification
  security_ticker: string | null
  security_name: string
  security_type: string // 'equity' | 'bond' | 'crypto' | 'commodity' | 'cash' | 'derivative'
  isin: string | null
  cusip: string | null
  sedol: string | null
  figi: string | null
  
  // Crypto Identification (for crypto holdings)
  blockchain: string | null // 'bitcoin', 'ethereum', 'solana'
  contract_address: string | null // For ERC-20, SPL tokens
  token_standard: string | null // 'native', 'erc20', 'spl'
  coingecko_id: string | null
  coinmarketcap_id: string | null
  
  // Position Details
  quantity: number
  market_value: number // KEY for NAV calculation
  weight_percentage: number // % of total ETF
  price_per_unit: number
  currency: string
  fx_rate: number | null
  market_value_base_currency: number | null
  
  // Pricing
  price_source: string | null
  price_timestamp: Date | null
  
  // Classification
  sector: string | null
  industry: string | null
  country: string | null
  asset_class: string | null
  market_cap_category: string | null
  
  // Custody (especially for crypto)
  custodian_name: string | null
  custody_address: string | null // Blockchain address for crypto
  custody_verification_method: string | null
  last_custody_verification: Date | null
  
  // Staking (for PoS cryptocurrencies)
  is_staked: boolean | null
  staking_provider: string | null
  staking_apr: number | null
  staking_rewards_accrued: number | null
  
  // Dates & Status
  as_of_date: Date
  acquisition_date: Date | null
  status: string | null
  
  // Accruals (for bonds)
  accrued_income: number | null
  accrued_income_type: string | null
  
  // Cost & P&L
  cost_basis: number | null
  unrealized_gain_loss: number | null
  
  notes: string | null
  created_at: Date
  updated_at: Date
}

/**
 * ETF Metadata - ETF-specific details
 */
export interface ETFMetadata {
  id: string
  fund_product_id: string
  
  // Strategy & Objective
  investment_objective: string | null
  strategy_description: string | null
  risk_profile: string | null
  
  // Registration
  sec_file_number: string | null
  prospectus_date: Date | null
  
  // Fund Management
  fund_family: string | null
  fund_manager: string | null
  
  // Trading
  primary_exchange: string | null
  secondary_exchanges: string[] | null
  options_available: boolean | null
  short_sale_restrictions: string | null
  
  // Tax
  tax_treatment: string | null
  k1_issued: boolean | null
  
  // Distributions
  dividend_frequency: string | null
  capital_gains_frequency: string | null
  last_distribution_date: Date | null
  next_distribution_date: Date | null
  
  // Crypto-Specific Fields
  is_crypto_etf: boolean | null
  supported_blockchains: string[] | null // ['bitcoin', 'ethereum', 'solana']
  custody_type: string | null // 'cold_storage', 'institutional_custody'
  staking_enabled: boolean | null
  staking_yield_pct: number | null
  
  // Rebalancing
  rebalancing_frequency: string | null // 'daily', 'weekly', 'monthly', 'quarterly'
  screening_criteria: any | null // JSONB
  concentration_rules: any | null // JSONB
  
  // Benchmarks
  primary_benchmark: string | null
  secondary_benchmark: string | null
  
  // Fees
  management_fee_pct: number | null
  administrative_fee_pct: number | null
  other_fees: any | null // JSONB
  
  created_at: Date
  updated_at: Date
}

/**
 * ETF NAV History - Daily NAV and market price tracking
 */
export interface ETFNAVHistory {
  id: string
  fund_product_id: string
  valuation_date: Date
  
  // NAV Calculation
  nav_per_share: number
  total_net_assets: number
  shares_outstanding: number
  
  // Market Trading
  opening_price: number | null
  closing_price: number | null
  high_price: number | null
  low_price: number | null
  market_price: number | null
  
  // Premium/Discount Analysis
  premium_discount_amount: number | null
  premium_discount_pct: number | null
  premium_discount_status: string | null // 'premium', 'discount', 'fair_value'
  
  // Trading Volume
  volume: number | null
  trade_count: number | null
  bid_price: number | null
  ask_price: number | null
  bid_ask_spread_bps: number | null
  
  // Performance Returns
  daily_return_pct: number | null
  nav_return_pct: number | null
  price_return_pct: number | null
  benchmark_return_pct: number | null
  excess_return_pct: number | null
  tracking_difference_bps: number | null
  
  // Components Breakdown
  total_assets: number
  total_liabilities: number
  cash_position: number | null
  securities_value: number | null
  derivatives_value: number | null
  crypto_value: number | null // Total crypto holdings value
  accrued_income: number | null
  accrued_expenses: number | null
  
  // Staking (for crypto ETFs)
  staking_rewards_earned: number | null
  staking_yield_annualized: number | null
  
  // Verification
  on_chain_verification_hash: string | null // For crypto custody proof
  
  // Distributions
  dividend_per_share: number | null
  dividend_yield_pct: number | null
  
  // Metadata
  currency: string
  calculation_method: string | null // 'mark_to_market', 'model_based'
  data_quality: string | null // 'high', 'medium', 'low'
  data_sources: any | null // JSONB
  config_overrides_used: any | null // JSONB
  
  created_at: Date
}

/**
 * ETF Tracking Error History - Performance vs benchmark
 */
export interface ETFTrackingErrorHistory {
  id: string
  fund_product_id: string
  
  // Time Period
  period_start: Date
  period_end: Date
  period_type: string // 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
  
  // Tracking Metrics
  tracking_error: number // Standard deviation of return differences
  tracking_difference: number // Average return difference
  
  // Returns
  etf_return: number
  benchmark_return: number
  excess_return: number | null // ETF return - benchmark return
  
  // Statistics
  correlation: number | null // Correlation with benchmark
  r_squared: number | null // R² vs benchmark
  beta: number | null // Systematic risk vs benchmark
  alpha: number | null // Excess return adjusted for risk
  information_ratio: number | null // Excess return / tracking error
  sharpe_ratio: number | null
  
  // Attribution
  fee_drag_bps: number | null // Return impact from fees
  cash_drag_bps: number | null // Return impact from cash holdings
  rebalancing_cost_bps: number | null
  sampling_error_bps: number | null // For optimized replication
  
  created_at: Date
}

/**
 * Supporting data structure
 */
export interface ETFSupportingData {
  holdings: ETFHolding[]
  metadata: ETFMetadata | null
  navHistory: ETFNAVHistory[]
  trackingHistory: ETFTrackingErrorHistory[]
}

// =====================================================
// ETF DATA FETCHER
// =====================================================

/**
 * Exchange-Traded Fund Data Fetcher
 * Fetches product data and all supporting tables
 */
export class ETFDataFetcher extends BaseDataFetcher<ETFProduct, ETFSupportingData> {
  
  constructor(dbClient: SupabaseClient) {
    super(
      dbClient,
      'fund_products',
      [
        'etf_holdings',
        'etf_metadata',
        'etf_nav_history',
        'etf_tracking_error_history'
      ]
    )
  }
  
  /**
   * Fetch complete ETF data
   */
  async fetch(request: FetchRequest): Promise<FetchResult<ProductWithSupporting<ETFProduct, ETFSupportingData>>> {
    try {
      // Step 1: Fetch fund product
      const productResult = await this.fetchProduct(request.productId)
      const product = productResult.rows[0]
      
      if (!product) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Fund product ${request.productId} not found`
          },
          metadata: this.buildMetadata(1, 0, {
            required: { total: 0, present: 0, missing: [] },
            recommended: { total: 0, present: 0, missing: [] },
            overall: 'insufficient'
          })
        }
      }
      
      // Step 2: Verify it's an ETF
      if (!this.isETF(product)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FUND_TYPE',
            message: `Product ${request.productId} is not an ETF (fund_type: ${product.fund_type})`
          },
          metadata: this.buildMetadata(1, 0, {
            required: { total: 0, present: 0, missing: [] },
            recommended: { total: 0, present: 0, missing: [] },
            overall: 'insufficient'
          })
        }
      }
      
      // Step 3: Fetch all supporting data in parallel
      const [holdings, metadata, navHistory, trackingHistory] = await Promise.all([
        this.fetchHoldings(request.productId, request.asOfDate),
        this.fetchMetadata(request.productId),
        this.fetchNAVHistory(request.productId, request.asOfDate),
        this.fetchTrackingHistory(request.productId, request.asOfDate)
      ])
      
      // Step 4: Build supporting data structure
      const supporting: ETFSupportingData = {
        holdings: holdings.rows,
        metadata: metadata.rows[0] || null,
        navHistory: navHistory.rows,
        trackingHistory: trackingHistory.rows
      }
      
      // Step 5: Validate completeness
      const completeness = this.validateDataCompleteness(
        product,
        supporting,
        this.getRequiredFields(),
        this.getRecommendedFields()
      )
      
      // Step 6: Calculate total rows fetched
      const totalRows = productResult.count +
        holdings.count +
        metadata.count +
        navHistory.count +
        trackingHistory.count
      
      return {
        success: true,
        data: {
          product,
          supporting,
          relationships: {
            etf_holdings: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: holdings.count
            },
            etf_metadata: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-one',
              recordCount: metadata.count
            },
            etf_nav_history: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: navHistory.count
            },
            etf_tracking_error_history: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: trackingHistory.count
            }
          },
          completeness
        },
        metadata: this.buildMetadata(5, totalRows, completeness)
      }
      
    } catch (error) {
      return {
        success: false,
        error: error as any,
        metadata: this.buildMetadata(0, 0, {
          required: { total: 0, present: 0, missing: [] },
          recommended: { total: 0, present: 0, missing: [] },
          overall: 'insufficient'
        })
      }
    }
  }
  
  /**
   * Check if product is an ETF
   * Valid fund types: etf_equity, etf_bond, etf_crypto, etf_commodity, etf_sector, etf_thematic, etf_smart_beta
   */
  private isETF(product: ETFProduct): boolean {
    const fundType = product.fund_type?.toLowerCase() || ''
    return fundType.startsWith('etf_')
  }
  
  /**
   * Fetch active holdings
   * Includes comprehensive crypto support
   */
  private async fetchHoldings(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<ETFHolding>> {
    return this.fetchSupportingTable<ETFHolding>(
      'etf_holdings',
      'fund_product_id',
      fundId,
      { status: 'active' },
      { column: 'weight_percentage', ascending: false }
    )
  }
  
  /**
   * Fetch ETF metadata
   */
  private async fetchMetadata(
    fundId: string
  ): Promise<QueryResult<ETFMetadata>> {
    return this.fetchSupportingTable<ETFMetadata>(
      'etf_metadata',
      'fund_product_id',
      fundId
    )
  }
  
  /**
   * Fetch NAV history (last 30 days)
   * Includes daily NAV, market price, and premium/discount
   */
  private async fetchNAVHistory(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<ETFNAVHistory>> {
    // Calculate start date (30 days before as-of date)
    const startDate = new Date(asOfDate)
    startDate.setDate(startDate.getDate() - 30)
    
    return this.fetchTimeSeriesData<ETFNAVHistory>(
      'etf_nav_history',
      'fund_product_id',
      fundId,
      asOfDate,
      startDate,
      'valuation_date'
    )
  }
  
  /**
   * Fetch tracking error history (last 90 days)
   * Performance metrics vs benchmark
   */
  private async fetchTrackingHistory(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<ETFTrackingErrorHistory>> {
    // Calculate start date (90 days before as-of date)
    const startDate = new Date(asOfDate)
    startDate.setDate(startDate.getDate() - 90)
    
    return this.fetchTimeSeriesData<ETFTrackingErrorHistory>(
      'etf_tracking_error_history',
      'fund_product_id',
      fundId,
      asOfDate,
      startDate,
      'period_end'
    )
  }
  
  /**
   * Define required fields for validation
   * These must be present for NAV calculation
   */
  protected getRequiredFields(): string[] {
    return [
      'fund_type', // Must be etf_*
      'net_asset_value',
      'shares_outstanding',
      'holdings' // Must have at least 1 holding
    ]
  }
  
  /**
   * Define recommended fields for validation
   * These improve accuracy and compliance
   */
  protected getRecommendedFields(): string[] {
    return [
      'expense_ratio',
      'benchmark_index',
      'metadata', // ETF-specific details
      'navHistory', // Historical tracking
      'trackingHistory', // Performance metrics
      'market_price' // For premium/discount analysis
    ]
  }
}

// Export singleton factory function
export function createETFDataFetcher(dbClient: SupabaseClient): ETFDataFetcher {
  return new ETFDataFetcher(dbClient)
}
