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
  bond_type: 'corporate' | 'government' | 'municipal' | 'agency' | 'supranational'
  issuer_name: string
  issuer_country: string
  issuer_sector?: string
  isin?: string
  cusip?: string
  ticker?: string
  issue_date: Date
  maturity_date: Date
  par_value: number
  currency: string
  coupon_rate: number
  coupon_frequency: number
  day_count_convention: string
  accounting_classification: 'htm' | 'afs' | 'trading'
  is_callable: boolean
  is_puttable: boolean
  is_convertible: boolean
  is_amortizing: boolean
  has_sinking_fund: boolean
  credit_rating?: string
  embedded_option_type?: string
  interest_payment_dates?: string[]
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
  currency: string
  payment_status: string
  accrued_interest?: number
  payment_number: number
  created_at: Date
}

export interface BondMarketPrice {
  id: string
  bond_product_id: string
  price_date: Date
  clean_price: number
  dirty_price?: number
  yield_to_maturity?: number
  yield_to_call?: number
  yield_to_worst?: number
  spread_to_benchmark?: number
  duration?: number
  convexity?: number
  price_source: string
  created_at: Date
}

export interface BondCallPutSchedule {
  id: string
  bond_product_id: string
  option_type: 'call' | 'put'
  exercise_date: Date
  exercise_price: number
  notice_period_days?: number
  exercise_status: string
  created_at: Date
}

export interface BondCreditRating {
  id: string
  bond_product_id: string
  rating_agency: string
  rating: string
  rating_date: Date
  outlook?: string
  watch_status?: string
  created_at: Date
}

export interface BondCovenant {
  id: string
  bond_product_id: string
  covenant_type: string
  covenant_description: string
  threshold_value?: number
  current_value?: number
  compliance_status: string
  last_tested_date?: Date
  created_at: Date
}

export interface BondAmortizationSchedule {
  id: string
  bond_product_id: string
  payment_date: Date
  principal_payment: number
  remaining_principal: number
  payment_number: number
  payment_status: string
  created_at: Date
}

export interface BondSinkingFund {
  id: string
  bond_product_id: string
  payment_date: Date
  required_amount: number
  amount_paid?: number
  payment_status: string
  created_at: Date
}

export interface BondEvent {
  id: string
  bond_product_id: string
  event_date: Date
  event_type: string
  event_description: string
  financial_impact?: number
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
      { column: 'exercise_date', ascending: true }
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
      'par_value',
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
