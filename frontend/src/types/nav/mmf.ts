/**
 * Money Market Fund (MMF) Types
 * Matches backend database schema for mmf_products and supporting tables
 * Zero hardcoded values - all data from database
 */

import { z } from 'zod'

// ==================== ENUMS ====================

export enum MMFFundType {
  GOVERNMENT = 'government',
  PRIME = 'prime',
  RETAIL = 'retail',
  INSTITUTIONAL = 'institutional',
  MUNICIPAL = 'municipal'
}

export enum MMFHoldingType {
  TREASURY = 'treasury',
  AGENCY = 'agency',
  COMMERCIAL_PAPER = 'commercial_paper',
  CD = 'cd',
  REPO = 'repo',
  TIME_DEPOSIT = 'time_deposit',
  VRDN = 'vrdn',
  MUNICIPAL = 'municipal'
}

export enum LiquidityClassification {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  BEYOND = 'beyond'
}

export enum GateStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SUSPENDED = 'suspended'
}

// ==================== MMF PRODUCT ====================

export interface MMFProduct {
  // Core fields
  id: string
  project_id: string
  
  // Fund Information
  fund_ticker?: string | null
  fund_name: string
  fund_type: MMFFundType
  
  // NAV & Assets
  net_asset_value: number
  assets_under_management: number
  
  // Fund Characteristics
  expense_ratio?: number | null
  benchmark_index?: string | null
  holdings?: any | null // JSON
  currency: string
  
  // Dates
  inception_date: Date
  
  // Status
  status: string
  
  // Timestamps
  created_at: Date
  updated_at: Date
  
  // MMF-specific
  concentration_limits?: any | null // JSON
}

// Input type for creating/updating MMF products
// Matches Zod schema requirements - only truly required fields are marked as such
export interface MMFProductInput {
  // Required fields
  project_id: string
  fund_name: string
  fund_type: MMFFundType
  
  // Optional fields (with defaults in validation or API)
  fund_ticker?: string | null
  net_asset_value?: number
  assets_under_management?: number
  expense_ratio?: number | null
  benchmark_index?: string | null
  holdings?: any | null
  currency?: string
  inception_date?: Date
  status?: string
  concentration_limits?: any | null
}

// ==================== MMF HOLDING ====================

export interface MMFHolding {
  // Core fields
  id: string
  fund_product_id: string
  
  // Security Information
  holding_type: MMFHoldingType
  issuer_name: string
  issuer_id?: string | null
  security_description: string
  
  // Identifiers
  cusip?: string | null
  isin?: string | null
  
  // Valuation
  par_value: number
  purchase_price?: number | null
  current_price: number
  amortized_cost: number // KEY for NAV calculation
  market_value: number
  currency: string
  
  // Quantity
  quantity?: number | null
  
  // Yield & Rate
  yield_to_maturity?: number | null
  coupon_rate?: number | null
  
  // Maturity
  effective_maturity_date: Date
  final_maturity_date: Date
  weighted_average_maturity_days?: number | null
  weighted_average_life_days?: number | null
  days_to_maturity?: number | null
  
  // Credit Quality
  credit_rating: string
  rating_agency?: string | null
  is_government_security: boolean
  
  // Liquidity
  is_daily_liquid: boolean
  is_weekly_liquid: boolean
  liquidity_classification?: LiquidityClassification | null
  
  // Dates
  acquisition_date: Date
  settlement_date?: Date | null
  
  // Additional Valuations
  accrued_interest?: number | null
  amortization_adjustment?: number | null
  shadow_nav_impact?: number | null
  stress_test_value?: number | null
  
  // Counterparty & Collateral
  counterparty?: string | null
  collateral_description?: string | null
  
  // Compliance
  is_affiliated_issuer: boolean
  concentration_percentage?: number | null
  
  // Status
  status: string
  notes?: string | null
  
  // Timestamps
  created_at: Date
  updated_at: Date
}

// Input type for creating/updating holdings
// Matches Zod schema requirements - only truly required fields are marked as such
export interface MMFHoldingInput {
  // Required fields
  fund_product_id: string
  holding_type: MMFHoldingType
  issuer_name: string
  security_description: string
  par_value: number
  current_price: number
  amortized_cost: number
  market_value: number
  effective_maturity_date: Date
  final_maturity_date: Date
  acquisition_date: Date
  credit_rating: string
  
  // Optional fields with defaults in validation
  is_government_security?: boolean
  is_daily_liquid?: boolean
  is_weekly_liquid?: boolean
  is_affiliated_issuer?: boolean
  currency?: string
  status?: string
  
  // Fully optional fields
  issuer_id?: string | null
  cusip?: string | null
  isin?: string | null
  purchase_price?: number | null
  quantity?: number | null
  yield_to_maturity?: number | null
  coupon_rate?: number | null
  weighted_average_maturity_days?: number | null
  weighted_average_life_days?: number | null
  days_to_maturity?: number | null
  rating_agency?: string | null
  liquidity_classification?: LiquidityClassification | null
  settlement_date?: Date | null
  accrued_interest?: number | null
  amortization_adjustment?: number | null
  shadow_nav_impact?: number | null
  stress_test_value?: number | null
  counterparty?: string | null
  collateral_description?: string | null
  concentration_percentage?: number | null
  notes?: string | null
}

// ==================== MMF NAV HISTORY ====================

export interface MMFNAVHistory {
  // Core fields
  id: string
  fund_product_id: string
  valuation_date: Date
  
  // NAV Values
  stable_nav: number // Target: 1.00
  market_based_nav: number // Shadow NAV
  deviation_from_stable?: number | null
  deviation_bps?: number | null
  
  // Fund Metrics
  total_net_assets: number
  shares_outstanding: number
  currency: string
  
  // Yields
  daily_yield?: number | null
  seven_day_yield?: number | null
  thirty_day_yield?: number | null
  effective_yield?: number | null
  expense_ratio?: number | null
  
  // Maturity Metrics
  weighted_average_maturity_days: number // WAM
  weighted_average_life_days: number // WAL
  
  // Liquidity Metrics
  daily_liquid_assets_percentage: number // Must be >= 25%
  weekly_liquid_assets_percentage: number // Must be >= 50%
  
  // Compliance Flags
  is_wam_compliant: boolean
  is_wal_compliant: boolean
  is_liquidity_compliant: boolean
  is_breaking_the_buck: boolean // NAV < 0.995
  
  // Stress Testing
  stress_test_result?: string | null
  
  // Gates & Fees
  gate_status: GateStatus
  redemption_fee_imposed: boolean
  
  // Flows
  total_subscriptions?: number | null
  total_redemptions?: number | null
  net_flows?: number | null
  
  // Notes
  portfolio_manager_notes?: string | null
  regulatory_filing_reference?: string | null
  notes?: string | null
  
  // Timestamp
  created_at: Date
}

// ==================== MMF LIQUIDITY BUCKET ====================

export interface MMFLiquidityBucket {
  // Core fields
  id: string
  fund_product_id: string
  as_of_date: Date
  
  // Bucket Classification
  bucket_type: LiquidityClassification
  total_value: number
  percentage_of_nav: number
  currency: string
  
  // Holdings Detail
  number_of_holdings?: number | null
  holdings_detail?: any | null // JSON
  
  // Compliance
  regulatory_minimum?: number | null
  is_compliant: boolean
  cushion?: number | null
  
  // Stress Testing
  stress_scenario?: string | null
  stressed_liquidity_percentage?: number | null
  can_meet_redemptions: boolean
  projected_redemption_rate?: number | null
  liquidity_coverage_ratio?: number | null
  
  // Liquidation Estimates
  time_to_liquidate_days?: number | null
  liquidation_cost_estimate?: number | null
  contingency_liquidity_sources?: any | null // JSON
  
  // Notes
  notes?: string | null
  
  // Timestamp
  created_at: Date
}

// ==================== MMF CALCULATION PARAMS ====================

export interface MMFCalculationParams {
  asOfDate: Date
  targetCurrency?: string
  includeBreakdown?: boolean
  saveToDatabase?: boolean
  configOverrides?: Partial<MMFCalculationConfig>
}

// Configuration override types (matching backend)
export interface MMFCalculationConfig {
  compliance?: Partial<ComplianceConfig>
  stressTesting?: Partial<StressTestConfig>
  // Add other config sections as needed
}

interface ComplianceConfig {
  wamLimits?: {
    government?: number
    prime?: number
    retail?: number
    municipal?: number
    institutional?: number
    default?: number
  }
  walLimits?: {
    government?: number
    prime?: number
    retail?: number
    municipal?: number
    institutional?: number
    default?: number
  }
  dailyLiquidMinimum?: number
  weeklyLiquidMinimum?: number
  breakingBuckThreshold?: number
  maxIssuerConcentration?: number
  maxSecondTierPercentage?: number
  minGovernmentSecuritiesPercentage?: number
}

interface StressTestConfig {
  rateShockBps?: number
  redemptionTests?: {
    low?: number
    high?: number
  }
  stressedDailyRedemptionRate?: number
}

// ==================== MMF NAV RESULT ====================

export interface MMFNAVResult {
  fundId: string
  asOfDate: Date
  
  // Dual NAV system
  nav: number // Stable NAV - Amortized cost (target $1.00)
  shadowNAV: number // Mark-to-market NAV
  deviationFromStable: number // Deviation from $1.00
  deviationBps: number // Deviation in basis points
  
  // Breaking the Buck Alert
  isBreakingBuck: boolean
  
  // Metrics
  wam: number // Weighted Average Maturity
  wal: number // Weighted Average Life
  dailyLiquidPercentage: number
  weeklyLiquidPercentage: number
  
  // Compliance
  complianceStatus: {
    isCompliant: boolean
    wamCompliant: boolean
    walCompliant: boolean
    liquidityCompliant: boolean
    violations: string[]
  }
  
  // Calculation Metadata
  calculationMethod: string
  confidenceLevel: 'high' | 'medium' | 'low'
  dataQuality: {
    score: number
    rating: string
    imputations: number
  }
  
  // Breakdown
  breakdown?: {
    totalAmortizedCost: number
    totalMarketValue: number
    sharesOutstanding: number
    componentValues: Record<string, any>
  }
  
  metadata: {
    calculatedAt: Date
    calculationDate: Date
    dataSourcesUsed: Array<string | { table: string; recordCount: number; completeness: number }>
    dataSources?: Array<{ source: string; timestamp: Date }>
    assumptions?: Record<string, unknown>
  }
}

// ==================== ZOD SCHEMAS ====================

export const mmfCalculationParamsSchema = z.object({
  asOfDate: z.coerce.date(),
  targetCurrency: z.string().length(3).optional(),
  includeBreakdown: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
  configOverrides: z.any().optional()
})

export const mmfProductInputSchema = z.object({
  project_id: z.string().uuid(),
  fund_ticker: z.string().optional().nullable(),
  fund_name: z.string().min(1),
  fund_type: z.nativeEnum(MMFFundType),
  net_asset_value: z.number().optional(),
  assets_under_management: z.number().optional(),
  expense_ratio: z.number().optional().nullable(),
  benchmark_index: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  inception_date: z.coerce.date().optional(),
  status: z.string().default('active')
})

export const mmfHoldingInputSchema = z.object({
  fund_product_id: z.string().uuid(),
  holding_type: z.nativeEnum(MMFHoldingType),
  issuer_name: z.string().min(1),
  security_description: z.string().min(1),
  par_value: z.number().positive(),
  current_price: z.number().positive(),
  amortized_cost: z.number().positive(),
  market_value: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  effective_maturity_date: z.coerce.date(),
  final_maturity_date: z.coerce.date(),
  credit_rating: z.string().min(1),
  is_government_security: z.boolean().default(false),
  is_daily_liquid: z.boolean().default(false),
  is_weekly_liquid: z.boolean().default(false),
  acquisition_date: z.coerce.date(),
  is_affiliated_issuer: z.boolean().default(false),
  status: z.string().default('active')
})
