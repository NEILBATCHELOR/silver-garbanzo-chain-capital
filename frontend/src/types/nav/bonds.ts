/**
 * Bond Types - Complete Database Schema Types
 * Matches backend database schema for bond_products and 8 supporting tables
 * Zero hardcoded values - all data from database
 */

import { z } from 'zod'

// ==================== ENUMS ====================

export enum BondType {
  GOVERNMENT = 'government',
  CORPORATE = 'corporate',
  MUNICIPAL = 'municipal',
  AGENCY = 'agency',
  SUPRANATIONAL = 'supranational',
  ASSET_BACKED = 'asset_backed'
}

export enum IssuerType {
  SOVEREIGN = 'sovereign',
  CORPORATE = 'corporate',
  FINANCIAL = 'financial',
  GOVERNMENT_AGENCY = 'government_agency',
  SUPRANATIONAL = 'supranational'
}

export enum Seniority {
  SENIOR_SECURED = 'senior_secured',
  SENIOR_UNSECURED = 'senior_unsecured',
  SUBORDINATED = 'subordinated',
  JUNIOR = 'junior'
}

export enum AccountingTreatment {
  HELD_TO_MATURITY = 'held_to_maturity',
  AVAILABLE_FOR_SALE = 'available_for_sale',
  TRADING = 'trading'
}

export enum DayCountConvention {
  ACTUAL_ACTUAL = 'actual_actual',
  ACTUAL_360 = 'actual_360',
  ACTUAL_365 = 'actual_365',
  THIRTY_360 = '30_360',
  THIRTY_360E = '30_360E'
}

export enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  MISSED = 'missed',
  DEFERRED = 'deferred'
}

export enum PriceSource {
  BLOOMBERG = 'bloomberg',
  REUTERS = 'reuters',
  ICE = 'ice',
  TRADEWEB = 'tradeweb',
  MARKIT = 'markit',
  INTERNAL_PRICING = 'internal_pricing',
  VENDOR = 'vendor'
}

export enum OptionStyle {
  AMERICAN = 'american',
  EUROPEAN = 'european',
  BERMUDAN = 'bermudan',
  MAKE_WHOLE = 'make_whole'
}

export enum CovenantType {
  FINANCIAL_RATIO = 'financial_ratio',
  NEGATIVE_PLEDGE = 'negative_pledge',
  CROSS_DEFAULT = 'cross_default',
  CHANGE_OF_CONTROL = 'change_of_control',
  RESTRICTED_PAYMENTS = 'restricted_payments'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  BREACH = 'breach',
  WAIVED = 'waived',
  CURED = 'cured'
}

export enum EventType {
  TENDER_OFFER = 'tender_offer',
  EXCHANGE_OFFER = 'exchange_offer',
  DEFEASANCE = 'defeasance',
  COVENANT_MODIFICATION = 'covenant_modification',
  RATING_CHANGE = 'rating_change',
  DEFAULT = 'default',
  RESTRUCTURING = 'restructuring',
  MERGER = 'merger',
  SPINOFF = 'spinoff'
}

// ==================== BOND PRODUCT ====================

export interface BondProduct {
  // Core fields
  id: string
  project_id: string
  
  // Identifiers
  isin?: string
  cusip?: string
  sedol?: string
  bond_identifier?: string
  asset_name?: string
  bond_isin_cusip?: string // Legacy field
  
  // Issuer Information
  issuer_name?: string
  issuer_type?: IssuerType
  
  // Bond Characteristics
  bond_type?: BondType
  face_value?: number
  par_value?: number // Alias for face_value (database may use either)
  coupon_rate?: number
  coupon_frequency?: string
  credit_rating?: string
  seniority?: Seniority
  
  // Dates
  issue_date?: Date
  maturity_date?: Date
  purchase_date?: Date
  
  // Pricing
  purchase_price?: number
  current_price?: number
  yield_to_maturity?: number
  duration?: number
  accrued_interest?: number
  
  // Features
  callable_features?: boolean
  callable?: boolean // Alias for callable_features
  callable_flag?: boolean
  call_date?: Date
  call_price?: number
  call_put_dates?: Date[]
  puttable?: boolean
  convertible?: boolean
  
  // Accounting
  accounting_treatment?: AccountingTreatment
  day_count_convention?: DayCountConvention
  
  // Additional
  currency?: string
  status?: string
  security_collateral?: string
  target_raise?: number
  coupon_payment_history?: unknown // jsonb
  redemption_call_date?: Date
  
  // Timestamps
  created_at?: Date
  updated_at?: Date
}

// ==================== COUPON PAYMENTS ====================

export interface CouponPayment {
  id: string
  bond_product_id: string
  
  payment_date: Date
  coupon_amount: number
  payment_status: PaymentStatus
  actual_payment_date?: Date
  
  accrual_start_date: Date
  accrual_end_date: Date
  days_in_period: number
  
  created_at?: Date
  updated_at?: Date
}

// ==================== MARKET PRICES ====================

export interface MarketPrice {
  id: string
  bond_product_id: string
  
  price_date: Date
  price_time?: string
  clean_price: number
  dirty_price: number
  
  bid_price?: number
  ask_price?: number
  mid_price?: number
  
  ytm?: number
  spread_to_benchmark?: number
  
  data_source: PriceSource
  is_official_close: boolean
  
  created_at?: Date
}

// ==================== CALL/PUT SCHEDULE ====================

export interface CallPutSchedule {
  id: string
  bond_product_id: string
  
  option_type: 'call' | 'put'
  option_date: Date
  call_price?: number
  put_price?: number
  notice_days?: number
  
  option_style: OptionStyle
  is_make_whole: boolean
  
  created_at?: Date
  updated_at?: Date
}

// ==================== CREDIT RATINGS ====================

export interface CreditRating {
  id: string
  bond_product_id: string
  
  rating_agency: 'SP' | 'Moodys' | 'Fitch' | 'DBRS'
  rating: string
  rating_outlook?: 'positive' | 'stable' | 'negative' | 'developing'
  
  rating_date: Date
  previous_rating?: string
  rating_action?: 'upgrade' | 'downgrade' | 'affirmed' | 'withdrawn'
  
  created_at?: Date
}

// ==================== COVENANTS ====================

export interface Covenant {
  id: string
  bond_product_id: string
  
  covenant_type: CovenantType
  covenant_description: string
  
  financial_ratio?: string
  threshold_value?: number
  test_frequency?: 'quarterly' | 'annually' | 'event_driven'
  
  last_test_date?: Date
  compliance_status?: ComplianceStatus
  
  created_at?: Date
  updated_at?: Date
}

// ==================== AMORTIZATION SCHEDULE ====================

export interface AmortizationSchedule {
  id: string
  bond_product_id: string
  
  payment_date: Date
  principal_payment: number
  beginning_balance: number
  ending_balance: number
  
  payment_status: PaymentStatus
  
  created_at?: Date
  updated_at?: Date
}

// ==================== SINKING FUND ====================

export interface SinkingFund {
  id: string
  bond_product_id: string
  
  payment_date: Date
  required_amount: number
  actual_amount?: number
  redemption_price: number
  
  payment_status: 'pending' | 'completed' | 'deferred' | 'waived'
  
  created_at?: Date
  updated_at?: Date
}

// ==================== BOND EVENTS ====================

export interface BondEvent {
  id: string
  bond_product_id: string
  
  event_type: EventType
  event_date: Date
  announcement_date?: Date
  event_description: string
  
  financial_impact?: number
  requires_revaluation: boolean
  
  created_at?: Date
}

// ==================== INPUT DTOS ====================

export interface BondProductInput {
  project_id: string
  
  // Identifiers
  isin?: string
  cusip?: string
  sedol?: string
  asset_name?: string
  
  // Issuer
  issuer_name?: string
  issuer_type?: IssuerType
  
  // Characteristics
  bond_type: BondType
  face_value: number
  coupon_rate: number
  coupon_frequency: string
  credit_rating?: string
  seniority?: Seniority
  
  // Dates
  issue_date: Date
  maturity_date: Date
  purchase_date?: Date
  
  // Pricing
  purchase_price?: number
  current_price?: number
  
  // Features
  callable_features?: boolean
  puttable?: boolean
  convertible?: boolean
  
  // Accounting
  accounting_treatment: AccountingTreatment
  day_count_convention?: DayCountConvention
  
  // Additional
  currency: string
  status?: string
}

export interface CouponPaymentInput {
  payment_date: Date
  coupon_amount: number
  payment_status?: PaymentStatus
  accrual_start_date: Date
  accrual_end_date: Date
  days_in_period: number
}

export interface MarketPriceInput {
  price_date: Date
  price_time?: string
  clean_price: number
  dirty_price: number
  bid_price?: number
  ask_price?: number
  ytm?: number
  spread_to_benchmark?: number
  data_source: PriceSource
  is_official_close?: boolean
}


// ==================== ADDITIONAL INPUT TYPES ====================

export interface CallPutScheduleInput {
  option_type: 'call' | 'put'
  option_date: Date
  call_price?: number
  put_price?: number
  notice_days?: number
  option_style: OptionStyle
  is_make_whole?: boolean
}

// ==================== COMPLETE BOND DATA ====================

export interface BondProductComplete extends BondProduct {
  coupon_payments: CouponPayment[]
  market_prices: MarketPrice[]
  call_put_schedules: CallPutSchedule[]
  credit_ratings: CreditRating[]
  covenants: Covenant[]
  amortization_schedule: AmortizationSchedule[]
  sinking_fund: SinkingFund[]
  events: BondEvent[]
}

// ==================== CALCULATION TYPES ====================

export interface CalculationParams {
  asOfDate: Date
  includeBreakdown?: boolean
  saveToDatabase?: boolean
  accountingMethod?: AccountingTreatment
}

export interface NAVResult {
  bondId: string
  asOfDate: Date
  netAssetValue: number
  calculationMethod: string
  confidenceLevel: 'high' | 'medium' | 'low'
  priorNAV?: number
  breakdown?: {
    cleanPrice?: number
    accruedInterest?: number
    totalValue?: number
    ytm?: number
    duration?: number
    convexity?: number
  }
  metadata: {
    calculatedAt: Date
    calculationDate: Date
    dataSourcesUsed: string[]
    dataSources?: Array<{ source: string; timestamp: Date }>
    assumptions?: Record<string, unknown>
  }
  riskMetrics?: {
    duration?: number
    modifiedDuration?: number
    convexity?: number
    dv01?: number
    spreadDuration?: number
  }
}

export interface NAVCalculation {
  id: string
  bond_product_id: string
  as_of_date: Date
  netAssetValue: number
  calculationMethod: string
  confidenceLevel: 'high' | 'medium' | 'low'
  breakdown?: Record<string, unknown>
  metadata?: Record<string, unknown>
  calculatedAt: Date
  created_at: Date
}

// ==================== TYPE ALIASES ====================

export type AccountingClassification = AccountingTreatment
export type BondCalculationParams = CalculationParams
export type CallPutScheduleInputData = CallPutScheduleInput
