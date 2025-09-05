/**
 * NAV Form Validation
 * Comprehensive validation schemas and utilities for NAV calculations
 */

import { z } from 'zod'

// Common validation patterns
export const ValidationPatterns = {
  currency: /^\d+(\.\d{2})?$/,
  percentage: /^\d+(\.\d{1,4})?$/,
  cusip: /^[0-9A-Z]{9}$/,
  isin: /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/,
  ticker: /^[A-Z]{1,5}$/,
  postalCode: /^[0-9]{5}(-[0-9]{4})?$/,
  phone: /^\(\d{3}\) \d{3}-\d{4}$/,
  ein: /^\d{2}-\d{7}$/
}

// Custom validation functions
export const NavValidators = {
  positiveNumber: (message = "Must be a positive number") =>
    z.number().positive(message),

  currency: (message = "Must be a valid currency amount") =>
    z.number().positive(message).multipleOf(0.01),

  percentage: (min = 0, max = 100, message = "Must be a valid percentage") =>
    z.number().min(min, message).max(max, message),

  futureDate: (message = "Date must be in the future") =>
    z.date().refine((date) => date > new Date(), { message }),

  pastDate: (message = "Date must be in the past") =>
    z.date().refine((date) => date < new Date(), { message }),

  cusip: (message = "Must be a valid CUSIP (9 alphanumeric characters)") =>
    z.string().regex(ValidationPatterns.cusip, message),

  isin: (message = "Must be a valid ISIN (12 alphanumeric characters)") =>
    z.string().regex(ValidationPatterns.isin, message),

  ticker: (message = "Must be a valid ticker symbol (1-5 letters)") =>
    z.string().regex(ValidationPatterns.ticker, message),

  positiveInteger: (message = "Must be a positive whole number") =>
    z.number().int().positive(message),

  nonEmptyString: (message = "This field is required") =>
    z.string().min(1, message).trim(),

  optionalString: z.string().optional(),

  emailAddress: (message = "Must be a valid email address") =>
    z.string().email(message),

  phoneNumber: (message = "Must be a valid phone number") =>
    z.string().regex(ValidationPatterns.phone, message),

  ein: (message = "Must be a valid EIN (XX-XXXXXXX)") =>
    z.string().regex(ValidationPatterns.ein, message),

  creditRating: z.enum(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D']),

  paymentFrequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual']),

  assetClass: z.enum(['equity', 'fixed_income', 'alternatives', 'real_estate', 'commodities', 'cash']),

  calculateNav: z.object({
    assetId: z.string().min(1, "Asset ID is required"),
    productType: z.string().min(1, "Product type is required"),
    projectId: z.string().min(1, "Project ID is required"),
    valuationDate: z.date(),
    targetCurrency: z.string().default('USD'),
    runManually: z.boolean().default(true)
  })
}

// Base calculation schema
export const BaseCalculationSchema = z.object({
  assetId: NavValidators.nonEmptyString("Asset ID is required"),
  productType: NavValidators.nonEmptyString("Product type is required"),
  projectId: NavValidators.nonEmptyString("Project ID is required"),
  valuationDate: z.date(),
  targetCurrency: z.string().default('USD'),
  sharesOutstanding: NavValidators.positiveNumber("Shares outstanding must be positive").optional()
})

// Bond calculation schema
export const BondCalculationSchema = BaseCalculationSchema.extend({
  faceValue: NavValidators.currency("Face value must be a valid currency amount"),
  couponRate: NavValidators.percentage(0, 100, "Coupon rate must be between 0% and 100%"),
  maturityDate: z.date(),
  issueDate: z.date(),
  paymentFrequency: NavValidators.paymentFrequency,
  creditRating: NavValidators.creditRating,
  cusip: NavValidators.cusip().optional(),
  isin: NavValidators.isin().optional(),
  yieldToMaturity: NavValidators.percentage(0, 100, "Yield to maturity must be between 0% and 100%").optional(),
  marketPrice: NavValidators.currency().optional(),
  accruedInterest: NavValidators.currency().optional(),
  sector: NavValidators.optionalString,
  issuerType: z.enum(['government', 'corporate', 'municipal', 'agency']).optional()
}).refine(data => data.issueDate < data.maturityDate, {
  message: "Issue date must be before maturity date",
  path: ["maturityDate"]
}).refine(data => data.valuationDate <= data.maturityDate, {
  message: "Valuation date cannot be after maturity date",
  path: ["valuationDate"]
})

// Equity calculation schema
export const EquityCalculationSchema = BaseCalculationSchema.extend({
  tickerSymbol: NavValidators.ticker(),
  exchange: NavValidators.nonEmptyString("Exchange is required"),
  lastTradePrice: NavValidators.currency("Last trade price must be valid"),
  bidPrice: NavValidators.currency().optional(),
  askPrice: NavValidators.currency().optional(),
  marketCap: NavValidators.currency().optional(),
  dividendYield: NavValidators.percentage(0, 50, "Dividend yield must be between 0% and 50%").optional(),
  peRatio: NavValidators.positiveNumber("P/E ratio must be positive").optional(),
  beta: z.number().optional(),
  sector: NavValidators.optionalString,
  industry: NavValidators.optionalString
}).refine(data => !data.bidPrice || !data.askPrice || data.bidPrice <= data.askPrice, {
  message: "Bid price must be less than or equal to ask price",
  path: ["askPrice"]
})

// Real Estate calculation schema
export const RealEstateCalculationSchema = BaseCalculationSchema.extend({
  propertyType: z.enum(['office', 'retail', 'industrial', 'residential', 'hotel', 'mixed_use']),
  squareFootage: NavValidators.positiveNumber("Square footage must be positive"),
  location: NavValidators.nonEmptyString("Location is required"),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()),
  lastAppraisalValue: NavValidators.currency("Appraisal value must be valid"),
  appraisalDate: z.date(),
  rentalIncome: NavValidators.currency().optional(),
  operatingExpenses: NavValidators.currency().optional(),
  capRate: NavValidators.percentage(0, 30, "Cap rate must be between 0% and 30%").optional(),
  occupancyRate: NavValidators.percentage(0, 100, "Occupancy rate must be between 0% and 100%").optional(),
  marketRentPsf: NavValidators.currency().optional()
}).refine(data => data.appraisalDate <= data.valuationDate, {
  message: "Appraisal date cannot be after valuation date",
  path: ["appraisalDate"]
})

// Private Equity calculation schema
export const PrivateEquityCalculationSchema = BaseCalculationSchema.extend({
  fundName: NavValidators.nonEmptyString("Fund name is required"),
  fundType: z.enum(['buyout', 'growth', 'venture', 'distressed', 'real_estate', 'infrastructure']),
  vintage: z.number().int().min(1990).max(new Date().getFullYear()),
  fundSize: NavValidators.currency("Fund size must be valid"),
  commitmentAmount: NavValidators.currency("Commitment amount must be valid"),
  calledAmount: NavValidators.currency("Called amount must be valid"),
  distributedAmount: NavValidators.currency("Distributed amount must be valid"),
  navReported: NavValidators.currency("Reported NAV must be valid"),
  lastReportingDate: z.date(),
  generalPartner: NavValidators.nonEmptyString("General partner is required"),
  investmentStrategy: NavValidators.optionalString,
  geographicFocus: NavValidators.optionalString,
  industryFocus: NavValidators.optionalString,
  irr: z.number().optional(),
  multiple: NavValidators.positiveNumber().optional(),
  dpi: NavValidators.positiveNumber().optional(),
  rvpi: NavValidators.positiveNumber().optional(),
  tvpi: NavValidators.positiveNumber().optional()
}).refine(data => data.calledAmount <= data.commitmentAmount, {
  message: "Called amount cannot exceed commitment amount",
  path: ["calledAmount"]
}).refine(data => data.lastReportingDate <= data.valuationDate, {
  message: "Last reporting date cannot be after valuation date",
  path: ["lastReportingDate"]
})

// Commodities calculation schema
export const CommoditiesCalculationSchema = BaseCalculationSchema.extend({
  commodityType: z.enum(['gold', 'silver', 'oil', 'natural_gas', 'wheat', 'corn', 'soybeans', 'coffee', 'sugar', 'copper', 'aluminum']),
  contractSize: NavValidators.positiveNumber("Contract size must be positive"),
  deliveryMonth: z.number().int().min(1).max(12),
  deliveryYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 10),
  spotPrice: NavValidators.currency("Spot price must be valid"),
  futuresPrice: NavValidators.currency("Futures price must be valid"),
  storageCosting: NavValidators.currency().optional(),
  convenienceYield: NavValidators.percentage().optional(),
  riskFreeRate: NavValidators.percentage(0, 20, "Risk-free rate must be between 0% and 20%"),
  volatility: NavValidators.percentage(0, 200, "Volatility must be between 0% and 200%")
})

// Validation error formatter
export function formatValidationErrors(errors: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}
  
  errors.errors.forEach((error) => {
    const path = error.path.join('.')
    formattedErrors[path] = error.message
  })
  
  return formattedErrors
}

// Validation helper function
export function validateCalculationInput<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatValidationErrors(error) }
    }
    return { success: false, errors: { general: 'Validation failed' } }
  }
}

// Schema type exports for TypeScript
export type BondCalculationInput = z.infer<typeof BondCalculationSchema>
export type EquityCalculationInput = z.infer<typeof EquityCalculationSchema>
export type RealEstateCalculationInput = z.infer<typeof RealEstateCalculationSchema>
export type PrivateEquityCalculationInput = z.infer<typeof PrivateEquityCalculationSchema>
export type CommoditiesCalculationInput = z.infer<typeof CommoditiesCalculationSchema>

export default {
  ValidationPatterns,
  NavValidators,
  BondCalculationSchema,
  EquityCalculationSchema,
  RealEstateCalculationSchema,
  PrivateEquityCalculationSchema,
  CommoditiesCalculationSchema,
  formatValidationErrors,
  validateCalculationInput
}
