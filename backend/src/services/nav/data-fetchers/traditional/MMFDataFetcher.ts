/**
 * Money Market Fund (MMF) Data Fetcher
 * 
 * Fetches MMF product data and supporting tables:
 * - mmf_holdings (individual securities)
 * - mmf_nav_history (daily NAV tracking)
 * - mmf_liquidity_buckets (liquidity classification)
 * 
 * Following Bonds implementation pattern with ZERO HARDCODED VALUES
 * 
 * Database Schema:
 * - Product: fund_products table (with fund_type indicating MMF)
 * - Supporting: mmf_* tables linked via fund_product_id
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
 * MMF Product from fund_products table
 */
export interface MMFProduct {
  id: string
  project_id: string
  fund_ticker: string | null
  fund_name: string
  fund_type: string // 'government' | 'prime' | 'retail' | 'institutional'
  net_asset_value: number
  assets_under_management: number
  expense_ratio: number | null
  benchmark_index: string | null
  holdings: any | null // JSONB
  distribution_frequency: string | null
  tracking_error: number | null
  currency: string
  inception_date: Date
  closure_liquidation_date: Date | null
  status: string
  creation_redemption_history: any | null // JSONB
  performance_history: any | null // JSONB
  flow_data: any | null // JSONB
  fund_vintage_year: number | null
  investment_stage: string | null
  sector_focus: string[] | null
  geographic_focus: string[] | null
  target_raise: number | null
  created_at: Date
  updated_at: Date
  asset_allocation: any | null // JSONB
  concentration_limits: any | null // JSONB
}

/**
 * Individual MMF Holding
 * Key for NAV calculation: amortized_cost field
 */
export interface MMFHolding {
  id: string
  fund_product_id: string
  holding_type: string // 'treasury' | 'agency' | 'commercial_paper' | 'cd' | 'repo' | 'municipal' | 'corporate_note'
  issuer_name: string
  issuer_id: string | null
  security_description: string
  cusip: string | null
  isin: string | null
  par_value: number
  purchase_price: number | null
  current_price: number
  amortized_cost: number // KEY for amortized cost NAV
  market_value: number // KEY for shadow NAV
  currency: string
  quantity: number | null
  yield_to_maturity: number | null
  coupon_rate: number | null
  effective_maturity_date: Date
  final_maturity_date: Date
  weighted_average_maturity_days: number | null
  weighted_average_life_days: number | null
  days_to_maturity: number | null
  credit_rating: string // Must be high quality
  rating_agency: string | null
  is_government_security: boolean
  is_daily_liquid: boolean // Liquid within 1 day
  is_weekly_liquid: boolean // Liquid within 5 days
  liquidity_classification: string | null
  acquisition_date: Date
  settlement_date: Date | null
  accrued_interest: number | null
  amortization_adjustment: number | null
  shadow_nav_impact: number | null
  stress_test_value: number | null
  counterparty: string | null
  collateral_description: string | null
  is_affiliated_issuer: boolean
  concentration_percentage: number | null
  status: string
  notes: string | null
  created_at: Date
  updated_at: Date
}

/**
 * MMF NAV History - Daily tracking
 */
export interface MMFNAVHistory {
  id: string
  fund_product_id: string
  valuation_date: Date
  stable_nav: number // Target: 1.00
  market_based_nav: number // Shadow NAV
  deviation_from_stable: number | null
  deviation_bps: number | null
  total_net_assets: number
  shares_outstanding: number
  currency: string
  daily_yield: number | null
  seven_day_yield: number | null
  thirty_day_yield: number | null
  effective_yield: number | null
  expense_ratio: number | null
  weighted_average_maturity_days: number // WAM
  weighted_average_life_days: number // WAL
  daily_liquid_assets_percentage: number // Must be >= 25%
  weekly_liquid_assets_percentage: number // Must be >= 50%
  is_wam_compliant: boolean
  is_wal_compliant: boolean
  is_liquidity_compliant: boolean
  is_breaking_the_buck: boolean // NAV < 0.995
  stress_test_result: string | null
  gate_status: string
  redemption_fee_imposed: boolean
  total_subscriptions: number | null
  total_redemptions: number | null
  net_flows: number | null
  portfolio_manager_notes: string | null
  regulatory_filing_reference: string | null
  notes: string | null
  created_at: Date
}

/**
 * MMF Liquidity Bucket
 * For regulatory compliance tracking
 */
export interface MMFLiquidityBucket {
  id: string
  fund_product_id: string
  as_of_date: Date
  bucket_type: string // 'daily' | 'weekly' | 'monthly' | 'beyond'
  total_value: number
  percentage_of_nav: number
  currency: string
  number_of_holdings: number | null
  holdings_detail: any | null // JSONB
  regulatory_minimum: number | null
  is_compliant: boolean
  cushion: number | null
  stress_scenario: string | null
  stressed_liquidity_percentage: number | null
  can_meet_redemptions: boolean
  projected_redemption_rate: number | null
  liquidity_coverage_ratio: number | null
  time_to_liquidate_days: number | null
  liquidation_cost_estimate: number | null
  contingency_liquidity_sources: any | null // JSONB
  notes: string | null
  created_at: Date
}

/**
 * Supporting data structure
 */
export interface MMFSupportingData {
  holdings: MMFHolding[]
  liquidityBuckets: MMFLiquidityBucket[]
  navHistory: MMFNAVHistory[]
}

// =====================================================
// MMF DATA FETCHER
// =====================================================

/**
 * Money Market Fund Data Fetcher
 * Fetches product data and all supporting tables
 */
export class MMFDataFetcher extends BaseDataFetcher<MMFProduct, MMFSupportingData> {
  
  constructor(dbClient: SupabaseClient) {
    super(
      dbClient,
      'fund_products',
      [
        'mmf_holdings',
        'mmf_nav_history',
        'mmf_liquidity_buckets'
      ]
    )
  }
  
  /**
   * Fetch complete MMF data
   */
  async fetch(request: FetchRequest): Promise<FetchResult<ProductWithSupporting<MMFProduct, MMFSupportingData>>> {
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
      
      // Step 2: Verify it's an MMF
      if (!this.isMMF(product)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FUND_TYPE',
            message: `Product ${request.productId} is not a Money Market Fund (fund_type: ${product.fund_type})`
          },
          metadata: this.buildMetadata(1, 0, {
            required: { total: 0, present: 0, missing: [] },
            recommended: { total: 0, present: 0, missing: [] },
            overall: 'insufficient'
          })
        }
      }
      
      // Step 3: Fetch all supporting data in parallel
      const [holdings, liquidityBuckets, navHistory] = await Promise.all([
        this.fetchHoldings(request.productId, request.asOfDate),
        this.fetchLiquidityBuckets(request.productId, request.asOfDate),
        this.fetchNAVHistory(request.productId, request.asOfDate)
      ])
      
      // Step 4: Build supporting data structure
      const supporting: MMFSupportingData = {
        holdings: holdings.rows,
        liquidityBuckets: liquidityBuckets.rows,
        navHistory: navHistory.rows
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
        liquidityBuckets.count +
        navHistory.count
      
      return {
        success: true,
        data: {
          product,
          supporting,
          relationships: {
            mmf_holdings: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: holdings.count
            },
            mmf_liquidity_buckets: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: liquidityBuckets.count
            },
            mmf_nav_history: {
              foreignKey: 'fund_product_id',
              cardinality: 'one-to-many',
              recordCount: navHistory.count
            }
          },
          completeness
        },
        metadata: this.buildMetadata(4, totalRows, completeness)
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
   * Check if product is an MMF
   */
  private isMMF(product: MMFProduct): boolean {
    const mmfTypes = ['mmf', 'money_market', 'government_mmf', 'prime_mmf', 'retail_mmf', 'institutional_mmf']
    return mmfTypes.some(type => 
      product.fund_type?.toLowerCase().includes(type.toLowerCase())
    )
  }
  
  /**
   * Fetch active holdings
   */
  private async fetchHoldings(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<MMFHolding>> {
    return this.fetchSupportingTable<MMFHolding>(
      'mmf_holdings',
      'fund_product_id',
      fundId,
      { status: 'active' },
      { column: 'acquisition_date', ascending: false }
    )
  }
  
  /**
   * Fetch liquidity buckets
   */
  private async fetchLiquidityBuckets(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<MMFLiquidityBucket>> {
    return this.fetchTimeSeriesData<MMFLiquidityBucket>(
      'mmf_liquidity_buckets',
      'fund_product_id',
      fundId,
      asOfDate,
      undefined, // Get all historical buckets
      'as_of_date'
    )
  }
  
  /**
   * Fetch NAV history (last 30 days)
   */
  private async fetchNAVHistory(
    fundId: string,
    asOfDate: Date
  ): Promise<QueryResult<MMFNAVHistory>> {
    // Calculate start date (30 days before as-of date)
    const startDate = new Date(asOfDate)
    startDate.setDate(startDate.getDate() - 30)
    
    return this.fetchTimeSeriesData<MMFNAVHistory>(
      'mmf_nav_history',
      'fund_product_id',
      fundId,
      asOfDate,
      startDate,
      'valuation_date'
    )
  }
  
  /**
   * Define required fields for validation
   */
  protected getRequiredFields(): string[] {
    return [
      'fund_type',
      'net_asset_value',
      'holdings' // Must have at least 1 holding
    ]
  }
  
  /**
   * Define recommended fields for validation
   */
  protected getRecommendedFields(): string[] {
    return [
      'expense_ratio',
      'benchmark_index',
      'liquidityBuckets',
      'navHistory'
    ]
  }
}

// Export singleton factory function
export function createMMFDataFetcher(dbClient: SupabaseClient): MMFDataFetcher {
  return new MMFDataFetcher(dbClient)
}
