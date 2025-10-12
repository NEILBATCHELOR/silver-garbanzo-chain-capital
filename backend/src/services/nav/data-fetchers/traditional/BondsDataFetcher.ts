/**
 * Bonds Data Fetcher
 * 
 * Fetches complete bond product data and all 8 supporting tables
 * Following Phase 0 specification from PHASE_0_BONDS_SPECIFICATION.md
 * 
 * Tables:
 * - bond_products (main)
 * - bond_coupon_payments (cash flow schedule)
 * - bond_market_prices (price history)
 * - bond_call_put_schedules (embedded options)
 * - bond_credit_ratings (rating history)
 * - bond_covenants (covenant tracking)
 * - bond_amortization_schedule (principal amortization)
 * - bond_sinking_fund (sinking fund provisions)
 * - bond_events (corporate actions)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { BaseDataFetcher } from '../BaseDataFetcher'
import {
  FetchRequest,
  FetchResult,
  ProductWithSupporting,
  QueryResult
} from '../types'

// Bond Product Type from database schema
export interface BondProduct {
  id: string
  project_id: string
  bond_identifier: string | null
  bond_isin_cusip: string | null
  isin: string | null
  cusip: string | null
  sedol: string | null
  asset_name: string | null
  issuer_name: string
  issuer_type: string | null
  seniority: string | null
  bond_type: string
  callable_flag: boolean | null
  callable_features: boolean | null
  call_date: Date | null
  call_price: number | null
  call_put_dates: any | null
  puttable: boolean | null
  convertible: boolean | null
  coupon_rate: number
  coupon_frequency: string | null
  coupon_payment_history: any | null
  face_value: number
  currency: string
  issue_date: Date
  maturity_date: Date
  redemption_call_date: Date | null
  yield_to_maturity: number | null
  duration: number | null
  day_count_convention: string | null
  purchase_price: number | null
  purchase_date: Date | null
  current_price: number | null
  accounting_treatment: string | null
  credit_rating: string | null
  accrued_interest: number | null
  security_collateral: string | null
  target_raise: number | null
  status: string
  created_at: Date
  updated_at: Date
}

// Supporting Data Structure
export interface BondSupportingData {
  couponPayments: BondCouponPayment[]
  marketPrices: BondMarketPrice[]
  callPutSchedules: BondCallPutSchedule[]
  creditRatings: BondCreditRating[]
  covenants: BondCovenant[]
  amortizationSchedule: BondAmortizationSchedule[]
  sinkingFund: BondSinkingFund[]
  events: BondEvent[]
}

export interface BondCouponPayment {
  id: string
  bond_product_id: string
  payment_date: Date
  coupon_amount: number
  payment_status: string
  actual_payment_date: Date | null
  accrual_start_date: Date
  accrual_end_date: Date
  days_in_period: number
  created_at: Date
  updated_at: Date
}

export interface BondMarketPrice {
  id: string
  bond_product_id: string
  price_date: Date
  price_time: string | null
  clean_price: number
  dirty_price: number | null
  bid_price: number | null
  ask_price: number | null
  mid_price: number | null
  ytm: number | null
  spread_to_benchmark: number | null
  data_source: string
  is_official_close: boolean
  created_at: Date
}

export interface BondCallPutSchedule {
  id: string
  bond_product_id: string
  option_type: 'call' | 'put'
  option_date: Date
  call_price: number | null
  put_price: number | null
  notice_days: number | null
  option_style: 'american' | 'european' | 'bermudan' | 'make_whole'
  is_make_whole: boolean
  created_at: Date
  updated_at: Date
}

export interface BondCreditRating {
  id: string
  bond_product_id: string
  rating_agency: string
  rating: string
  rating_outlook: string | null
  rating_date: Date
  previous_rating: string | null
  rating_action: string | null
  created_at: Date
}

export interface BondCovenant {
  id: string
  bond_product_id: string
  covenant_type: string
  covenant_description: string
  financial_ratio: string | null
  threshold_value: number | null
  test_frequency: string | null
  last_test_date: Date | null
  compliance_status: string
  created_at: Date
  updated_at: Date
}

export interface BondAmortizationSchedule {
  id: string
  bond_product_id: string
  payment_date: Date
  principal_payment: number
  beginning_balance: number
  ending_balance: number
  payment_status: string
  created_at: Date
  updated_at: Date
}

export interface BondSinkingFund {
  id: string
  bond_product_id: string
  payment_date: Date
  required_amount: number
  actual_amount: number | null
  redemption_price: number
  payment_status: string
  created_at: Date
  updated_at: Date
}

export interface BondEvent {
  id: string
  bond_product_id: string
  event_type: string
  event_date: Date
  announcement_date: Date | null
  event_description: string
  financial_impact: number | null
  requires_revaluation: boolean
  created_at: Date
}

/**
 * Bonds Data Fetcher
 * Fetches complete bond data from all 9 tables
 */
export class BondsDataFetcher extends BaseDataFetcher<
  BondProduct,
  BondSupportingData
> {
  constructor(dbClient: SupabaseClient) {
    super(
      dbClient,
      'bond_products',
      [
        'bond_coupon_payments',
        'bond_market_prices',
        'bond_call_put_schedules',
        'bond_credit_ratings',
        'bond_covenants',
        'bond_amortization_schedule',
        'bond_sinking_fund',
        'bond_events'
      ]
    )
  }

  /**
   * Main fetch method - retrieves all bond data
   * Follows Phase 1 specification pattern
   */
  async fetch(request: FetchRequest): Promise<FetchResult<ProductWithSupporting<BondProduct, BondSupportingData>>> {
    try {
      // Step 1: Fetch product
      const productResult = await this.fetchProduct(request.productId)
      const product = productResult.rows[0]
      
      if (!product) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Bond product ${request.productId} not found`
          },
          metadata: this.buildMetadata(1, 0, {
            required: { total: 0, present: 0, missing: [] },
            recommended: { total: 0, present: 0, missing: [] },
            overall: 'insufficient'
          })
        }
      }
      
      // Step 2: Fetch all supporting data in parallel
      const [
        couponPayments,
        marketPrices,
        callPutSchedules,
        creditRatings,
        covenants,
        amortizationSchedule,
        sinkingFund,
        events
      ] = await Promise.all([
        this.fetchCouponPayments(request.productId, request.asOfDate),
        this.fetchMarketPrices(request.productId, request.asOfDate),
        this.fetchCallPutSchedules(request.productId, request.asOfDate),
        this.fetchCreditRatings(request.productId, request.asOfDate),
        this.fetchCovenants(request.productId),
        this.fetchAmortizationSchedule(request.productId, request.asOfDate),
        this.fetchSinkingFund(request.productId, request.asOfDate),
        this.fetchEvents(request.productId, request.asOfDate)
      ])
      
      // Step 3: Build supporting data structure
      const supporting: BondSupportingData = {
        couponPayments: couponPayments.rows,
        marketPrices: marketPrices.rows,
        callPutSchedules: callPutSchedules.rows,
        creditRatings: creditRatings.rows,
        covenants: covenants.rows,
        amortizationSchedule: amortizationSchedule.rows,
        sinkingFund: sinkingFund.rows,
        events: events.rows
      }
      
      // Step 4: Validate completeness
      const completeness = this.validateDataCompleteness(
        product,
        supporting,
        this.getRequiredFields(),
        this.getRecommendedFields()
      )
      
      // Step 5: Calculate total rows fetched
      const totalRows = productResult.count +
        couponPayments.count +
        marketPrices.count +
        callPutSchedules.count +
        creditRatings.count +
        covenants.count +
        amortizationSchedule.count +
        sinkingFund.count +
        events.count
      
      return {
        success: true,
        data: {
          product,
          supporting,
          relationships: {
            bond_coupon_payments: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: couponPayments.count
            },
            bond_market_prices: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: marketPrices.count
            },
            bond_call_put_schedules: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: callPutSchedules.count
            },
            bond_credit_ratings: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: creditRatings.count
            },
            bond_covenants: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: covenants.count
            },
            bond_amortization_schedule: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: amortizationSchedule.count
            },
            bond_sinking_fund: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: sinkingFund.count
            },
            bond_events: {
              foreignKey: 'bond_product_id',
              cardinality: 'one-to-many',
              recordCount: events.count
            }
          },
          completeness
        },
        metadata: this.buildMetadata(9, totalRows, completeness)
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
   * Fetch coupon payment schedule
   */
  private async fetchCouponPayments(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondCouponPayment>> {
    return this.fetchTimeSeriesData<BondCouponPayment>(
      'bond_coupon_payments',
      'bond_product_id',
      productId,
      asOfDate,
      undefined,
      'payment_date'
    )
  }
  
  /**
   * Fetch market price history (last 30 days by default)
   */
  private async fetchMarketPrices(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondMarketPrice>> {
    const thirtyDaysAgo = new Date(asOfDate)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return this.fetchTimeSeriesData<BondMarketPrice>(
      'bond_market_prices',
      'bond_product_id',
      productId,
      asOfDate,
      thirtyDaysAgo,
      'price_date'
    )
  }
  
  /**
   * Fetch call/put schedules
   */
  private async fetchCallPutSchedules(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondCallPutSchedule>> {
    return this.fetchSupportingTable<BondCallPutSchedule>(
      'bond_call_put_schedules',
      'bond_product_id',
      productId,
      undefined,
      { column: 'option_date', ascending: true }
    )
  }
  
  /**
   * Fetch credit rating history
   */
  private async fetchCreditRatings(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondCreditRating>> {
    return this.fetchTimeSeriesData<BondCreditRating>(
      'bond_credit_ratings',
      'bond_product_id',
      productId,
      asOfDate,
      undefined,
      'rating_date'
    )
  }
  
  /**
   * Fetch covenants
   */
  private async fetchCovenants(
    productId: string
  ): Promise<QueryResult<BondCovenant>> {
    return this.fetchSupportingTable<BondCovenant>(
      'bond_covenants',
      'bond_product_id',
      productId
    )
  }
  
  /**
   * Fetch amortization schedule
   */
  private async fetchAmortizationSchedule(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondAmortizationSchedule>> {
    return this.fetchTimeSeriesData<BondAmortizationSchedule>(
      'bond_amortization_schedule',
      'bond_product_id',
      productId,
      asOfDate,
      undefined,
      'payment_date'
    )
  }
  
  /**
   * Fetch sinking fund schedule
   */
  private async fetchSinkingFund(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondSinkingFund>> {
    return this.fetchTimeSeriesData<BondSinkingFund>(
      'bond_sinking_fund',
      'bond_product_id',
      productId,
      asOfDate,
      undefined,
      'payment_date'
    )
  }
  
  /**
   * Fetch bond events (corporate actions)
   */
  private async fetchEvents(
    productId: string,
    asOfDate: Date
  ): Promise<QueryResult<BondEvent>> {
    return this.fetchTimeSeriesData<BondEvent>(
      'bond_events',
      'bond_product_id',
      productId,
      asOfDate,
      undefined,
      'event_date'
    )
  }
  
  /**
   * Define required fields for validation
   * NO HARDCODED VALUES - all data must come from database
   */
  protected getRequiredFields(): string[] {
    return [
      'bond_type',
      'issuer_name',
      'issue_date',
      'maturity_date',
      'face_value',
      'coupon_rate',
      'coupon_frequency',
      'couponPayments', // At least 1 coupon payment OR market price
      'marketPrices' // At least 1 market price OR YTM parameter
    ]
  }
  
  /**
   * Define recommended fields for validation
   */
  protected getRecommendedFields(): string[] {
    return [
      'isin',
      'credit_rating',
      'creditRatings',
      'marketPrices'
    ]
  }
}
