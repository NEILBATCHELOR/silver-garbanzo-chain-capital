/**
 * Bond Validation Schemas
 * Zod schemas for runtime validation matching database constraints
 */

import { z } from 'zod'
import {
  BondType,
  IssuerType,
  Seniority,
  AccountingTreatment,
  DayCountConvention,
  PaymentStatus,
  PriceSource,
  OptionStyle,
  CovenantType,
  ComplianceStatus,
  EventType
} from './bonds'

// ==================== ENUM SCHEMAS ====================

export const bondTypeSchema = z.nativeEnum(BondType)
export const issuerTypeSchema = z.nativeEnum(IssuerType)
export const senioritySchema = z.nativeEnum(Seniority)
export const accountingTreatmentSchema = z.nativeEnum(AccountingTreatment)
export const dayCountConventionSchema = z.nativeEnum(DayCountConvention)
export const paymentStatusSchema = z.nativeEnum(PaymentStatus)
export const priceSourceSchema = z.nativeEnum(PriceSource)
export const optionStyleSchema = z.nativeEnum(OptionStyle)
export const covenantTypeSchema = z.nativeEnum(CovenantType)
export const complianceStatusSchema = z.nativeEnum(ComplianceStatus)
export const eventTypeSchema = z.nativeEnum(EventType)

// ==================== BOND PRODUCT SCHEMA ====================

export const bondProductInputSchema = z.object({
  // Required fields
  project_id: z.string().uuid('Invalid project ID'),
  bond_type: bondTypeSchema,
  face_value: z.number().positive('Face value must be positive'),
  coupon_rate: z.number().min(0, 'Coupon rate must be non-negative').max(1, 'Coupon rate must be ≤ 1'),
  coupon_frequency: z.string().min(1, 'Coupon frequency is required'),
  issue_date: z.date(),
  maturity_date: z.date(),
  accounting_treatment: accountingTreatmentSchema,
  currency: z.string().min(3).max(3, 'Currency must be 3-letter code'),
  
  // Optional identifiers
  isin: z.string().length(12, 'ISIN must be 12 characters').optional(),
  cusip: z.string().length(9, 'CUSIP must be 9 characters').optional(),
  sedol: z.string().length(7, 'SEDOL must be 7 characters').optional(),
  asset_name: z.string().max(255).optional(),
  
  // Optional issuer info
  issuer_name: z.string().max(255).optional(),
  issuer_type: issuerTypeSchema.optional(),
  
  // Optional characteristics
  credit_rating: z.string().max(10).optional(),
  seniority: senioritySchema.optional(),
  day_count_convention: dayCountConventionSchema.optional(),
  
  // Optional dates
  purchase_date: z.date().optional(),
  
  // Optional pricing
  purchase_price: z.number().positive().optional(),
  current_price: z.number().positive().optional(),
  
  // Optional features
  callable_features: z.boolean().optional(),
  puttable: z.boolean().optional(),
  convertible: z.boolean().optional(),
  
  // Optional additional
  status: z.string().max(50).optional()
}).refine(
  (data) => data.maturity_date > data.issue_date,
  {
    message: 'Maturity date must be after issue date',
    path: ['maturity_date']
  }
).refine(
  (data) => !data.purchase_date || data.purchase_date >= data.issue_date,
  {
    message: 'Purchase date cannot be before issue date',
    path: ['purchase_date']
  }
)

// ==================== COUPON PAYMENT SCHEMA ====================

export const couponPaymentInputSchema = z.object({
  payment_date: z.date(),
  coupon_amount: z.number().positive('Coupon amount must be positive'),
  payment_status: paymentStatusSchema.optional().default(PaymentStatus.SCHEDULED),
  actual_payment_date: z.date().optional(),
  accrual_start_date: z.date(),
  accrual_end_date: z.date(),
  days_in_period: z.number().int().positive().max(366, 'Days in period cannot exceed 366')
}).refine(
  (data) => data.accrual_end_date > data.accrual_start_date,
  {
    message: 'Accrual end date must be after start date',
    path: ['accrual_end_date']
  }
).refine(
  (data) => data.payment_status !== PaymentStatus.PAID || data.actual_payment_date,
  {
    message: 'Actual payment date required when status is paid',
    path: ['actual_payment_date']
  }
)

// ==================== MARKET PRICE SCHEMA ====================

export const marketPriceInputSchema = z.object({
  price_date: z.date(),
  price_time: z.string().optional(),
  clean_price: z.number().positive('Clean price must be positive'),
  dirty_price: z.number().positive('Dirty price must be positive'),
  bid_price: z.number().positive().optional(),
  ask_price: z.number().positive().optional(),
  mid_price: z.number().positive().optional(),
  ytm: z.number().positive().optional(),
  spread_to_benchmark: z.number().optional(),
  data_source: priceSourceSchema,
  is_official_close: z.boolean().optional().default(false)
}).refine(
  (data) => data.dirty_price >= data.clean_price,
  {
    message: 'Dirty price must be greater than or equal to clean price',
    path: ['dirty_price']
  }
).refine(
  (data) => !data.ask_price || !data.bid_price || data.ask_price >= data.bid_price,
  {
    message: 'Ask price must be greater than or equal to bid price',
    path: ['ask_price']
  }
)

// ==================== CALL/PUT SCHEDULE SCHEMA ====================

export const callPutScheduleInputSchema = z.object({
  option_type: z.enum(['call', 'put']),
  option_date: z.date(),
  call_price: z.number().positive().optional(),
  put_price: z.number().positive().optional(),
  notice_days: z.number().int().min(0).optional(),
  option_style: optionStyleSchema,
  is_make_whole: z.boolean().default(false)
}).refine(
  (data) => data.option_type === 'call' ? !!data.call_price : true,
  {
    message: 'Call price required for call options',
    path: ['call_price']
  }
).refine(
  (data) => data.option_type === 'put' ? !!data.put_price : true,
  {
    message: 'Put price required for put options',
    path: ['put_price']
  }
)

// ==================== CREDIT RATING SCHEMA ====================

export const creditRatingInputSchema = z.object({
  rating_agency: z.enum(['SP', 'Moodys', 'Fitch', 'DBRS']),
  rating: z.string().max(10),
  rating_outlook: z.enum(['positive', 'stable', 'negative', 'developing']).optional(),
  rating_date: z.date(),
  previous_rating: z.string().max(10).optional(),
  rating_action: z.enum(['upgrade', 'downgrade', 'affirmed', 'withdrawn']).optional()
})

// ==================== COVENANT SCHEMA ====================

export const covenantInputSchema = z.object({
  covenant_type: covenantTypeSchema,
  covenant_description: z.string().min(1, 'Description is required'),
  financial_ratio: z.string().max(50).optional(),
  threshold_value: z.number().optional(),
  test_frequency: z.enum(['quarterly', 'annually', 'event_driven']).optional(),
  last_test_date: z.date().optional(),
  compliance_status: complianceStatusSchema.optional()
})

// ==================== AMORTIZATION SCHEDULE SCHEMA ====================

export const amortizationScheduleInputSchema = z.object({
  payment_date: z.date(),
  principal_payment: z.number().positive('Principal payment must be positive'),
  beginning_balance: z.number().positive('Beginning balance must be positive'),
  ending_balance: z.number().min(0, 'Ending balance cannot be negative'),
  payment_status: paymentStatusSchema.optional().default(PaymentStatus.SCHEDULED)
}).refine(
  (data) => data.ending_balance === data.beginning_balance - data.principal_payment,
  {
    message: 'Ending balance must equal beginning balance minus principal payment',
    path: ['ending_balance']
  }
)

// ==================== SINKING FUND SCHEMA ====================

export const sinkingFundInputSchema = z.object({
  payment_date: z.date(),
  required_amount: z.number().positive('Required amount must be positive'),
  actual_amount: z.number().positive().optional(),
  redemption_price: z.number().positive('Redemption price must be positive'),
  payment_status: z.enum(['pending', 'completed', 'deferred', 'waived']).optional().default('pending')
}).refine(
  (data) => !data.actual_amount || data.actual_amount >= data.required_amount,
  {
    message: 'Actual amount must be greater than or equal to required amount',
    path: ['actual_amount']
  }
)

// ==================== BOND EVENT SCHEMA ====================

export const bondEventInputSchema = z.object({
  event_type: eventTypeSchema,
  event_date: z.date(),
  announcement_date: z.date().optional(),
  event_description: z.string().min(1, 'Event description is required'),
  financial_impact: z.number().optional(),
  requires_revaluation: z.boolean().default(false)
}).refine(
  (data) => !data.announcement_date || data.announcement_date <= data.event_date,
  {
    message: 'Announcement date cannot be after event date',
    path: ['announcement_date']
  }
)

// ==================== BULK UPLOAD SCHEMA ====================

export const bondBulkUploadSchema = z.object({
  bonds: z.array(bondProductInputSchema).min(1, 'At least one bond is required')
})

// ==================== CALCULATION PARAMETER SCHEMA ====================

export const bondCalculationParamsSchema = z.object({
  asOfDate: z.date(),
  includeBreakdown: z.boolean().optional().default(false),
  saveToDatabase: z.boolean().optional().default(true),
  accountingMethod: accountingTreatmentSchema.optional()
})

// ==================== TYPE EXPORTS ====================

export type BondProductInputData = z.infer<typeof bondProductInputSchema>
export type CouponPaymentInputData = z.infer<typeof couponPaymentInputSchema>
export type MarketPriceInputData = z.infer<typeof marketPriceInputSchema>
export type CallPutScheduleInputData = z.infer<typeof callPutScheduleInputSchema>
export type CreditRatingInputData = z.infer<typeof creditRatingInputSchema>
export type CovenantInputData = z.infer<typeof covenantInputSchema>
export type AmortizationScheduleInputData = z.infer<typeof amortizationScheduleInputSchema>
export type SinkingFundInputData = z.infer<typeof sinkingFundInputSchema>
export type BondEventInputData = z.infer<typeof bondEventInputSchema>
export type BondCalculationParams = z.infer<typeof bondCalculationParamsSchema>
