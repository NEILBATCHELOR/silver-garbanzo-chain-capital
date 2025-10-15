/**
 * MMF Validation Schemas
 * Zod schemas for form validation
 * Matches database constraints and business rules
 */

import { z } from 'zod'
import { MMFFundType, MMFHoldingType, LiquidityClassification } from './mmf'

// ==================== MMF PRODUCT VALIDATION ====================

export const mmfProductInputSchema = z.object({
  // Required fields
  project_id: z.string().uuid('Invalid project ID'),
  fund_name: z.string().min(1, 'Fund name is required').max(255),
  fund_type: z.nativeEnum(MMFFundType, {
    errorMap: () => ({ message: 'Invalid fund type' }),
  }),
  
  // Optional fields
  fund_ticker: z.string().max(10).optional().nullable(),
  net_asset_value: z.number().min(0).optional().default(0),
  assets_under_management: z.number().min(0).optional().default(0),
  expense_ratio: z.number().min(0).max(100).optional().nullable(),
  benchmark_index: z.string().max(255).optional().nullable(),
  holdings: z.any().optional().nullable(),
  currency: z.string().length(3).optional().default('USD'),
  inception_date: z.date().optional().default(() => new Date()),
  status: z.string().optional().default('active'),
  concentration_limits: z.any().optional().nullable(),
})

export type MMFProductInputData = z.infer<typeof mmfProductInputSchema>

// ==================== MMF HOLDING VALIDATION ====================

export const mmfHoldingInputSchema = z.object({
  // Required fields
  fund_product_id: z.string().uuid('Invalid fund ID'),
  holding_type: z.nativeEnum(MMFHoldingType, {
    errorMap: () => ({ message: 'Invalid holding type' }),
  }),
  issuer_name: z.string().min(1, 'Issuer name is required').max(255),
  security_description: z.string().min(1, 'Security description is required'),
  
  par_value: z.number().min(0, 'Par value must be non-negative'),
  current_price: z.number().min(0, 'Current price must be non-negative'),
  amortized_cost: z.number().min(0, 'Amortized cost must be non-negative'),
  market_value: z.number().min(0, 'Market value must be non-negative'),
  
  effective_maturity_date: z.date(),
  final_maturity_date: z.date(),
  acquisition_date: z.date(),
  
  credit_rating: z.string().min(1, 'Credit rating is required'),
  
  // Boolean flags with defaults
  is_government_security: z.boolean().optional().default(false),
  is_daily_liquid: z.boolean().optional().default(false),
  is_weekly_liquid: z.boolean().optional().default(false),
  is_affiliated_issuer: z.boolean().optional().default(false),
  
  // Optional fields
  issuer_id: z.string().optional().nullable(),
  cusip: z.string().max(9).optional().nullable(),
  isin: z.string().max(12).optional().nullable(),
  purchase_price: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional().default('USD'),
  quantity: z.number().min(0).optional().nullable(),
  yield_to_maturity: z.number().optional().nullable(),
  coupon_rate: z.number().min(0).max(100).optional().nullable(),
  weighted_average_maturity_days: z.number().int().min(0).max(397).optional().nullable(),
  weighted_average_life_days: z.number().int().min(0).max(397).optional().nullable(),
  days_to_maturity: z.number().int().min(0).max(397).optional().nullable(),
  rating_agency: z.string().optional().nullable(),
  liquidity_classification: z.nativeEnum(LiquidityClassification).optional().nullable(),
  settlement_date: z.date().optional().nullable(),
  accrued_interest: z.number().optional().nullable(),
  amortization_adjustment: z.number().optional().nullable(),
  shadow_nav_impact: z.number().optional().nullable(),
  stress_test_value: z.number().optional().nullable(),
  counterparty: z.string().optional().nullable(),
  collateral_description: z.string().optional().nullable(),
  concentration_percentage: z.number().min(0).max(100).optional().nullable(),
  status: z.string().optional().default('active'),
  notes: z.string().optional().nullable(),
})
  .refine((data) => data.final_maturity_date >= data.effective_maturity_date, {
    message: 'Final maturity date must be after effective maturity date',
    path: ['final_maturity_date'],
  })
  .refine((data) => data.amortized_cost >= 0 && data.market_value >= 0, {
    message: 'Valuation amounts must be non-negative',
    path: ['amortized_cost'],
  })

export type MMFHoldingInputData = z.infer<typeof mmfHoldingInputSchema>

// ==================== BULK UPLOAD VALIDATION ====================

export const mmfBulkUploadSchema = z.object({
  holdings: z.array(mmfHoldingInputSchema).min(1, 'At least one holding is required'),
})

export type MMFBulkUploadData = z.infer<typeof mmfBulkUploadSchema>

// ==================== CALCULATION PARAMS VALIDATION ====================

export const mmfCalculationParamsSchema = z.object({
  asOfDate: z.date().optional().default(() => new Date()),
  configOverrides: z.any().optional(), // Partial<MMFCalculationConfig>
})

export type MMFCalculationParamsData = z.infer<typeof mmfCalculationParamsSchema>

// ==================== VALIDATION HELPERS ====================

/**
 * Validate credit rating format
 * Accepts standard ratings: AAA, AA+, AA, AA-, A+, A, A-, etc.
 */
export function isValidCreditRating(rating: string): boolean {
  const ratingPattern = /^(AAA|AA[+-]?|A[+-]?|BBB[+-]?|BB[+-]?|B[+-]?|CCC[+-]?|CC|C|D)$/
  return ratingPattern.test(rating.toUpperCase())
}

/**
 * Validate CUSIP format (9 characters)
 */
export function isValidCUSIP(cusip: string): boolean {
  return /^[0-9A-Z]{9}$/.test(cusip)
}

/**
 * Validate ISIN format (12 characters, starts with 2-letter country code)
 */
export function isValidISIN(isin: string): boolean {
  return /^[A-Z]{2}[0-9A-Z]{10}$/.test(isin)
}

/**
 * Validate maturity days against SEC Rule 2a-7 (≤397 days)
 */
export function isValidMaturity(days: number): boolean {
  return days >= 0 && days <= 397
}

/**
 * Validate concentration percentage (≤5% per issuer)
 */
export function isValidConcentration(percentage: number): boolean {
  return percentage >= 0 && percentage <= 5
}
