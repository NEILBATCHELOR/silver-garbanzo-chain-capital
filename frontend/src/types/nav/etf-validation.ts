/**
 * ETF Validation Schemas
 * 
 * Zod validation schemas for ETF products, holdings, and related entities
 * Following established patterns from mmf-validation.ts and bonds-validation.ts
 */

import { z } from 'zod'
import {
  ETFType,
  SecurityType,
  StructureType,
  ReplicationMethod,
  RegistrationStatus,
  Blockchain,
  CustodyType
} from './etf'

/**
 * ETF Type enum schema
 */
export const ETFTypeSchema = z.nativeEnum(ETFType)

/**
 * Security Type enum schema
 */
export const SecurityTypeSchema = z.nativeEnum(SecurityType)

/**
 * Structure Type enum schema
 */
export const StructureTypeSchema = z.nativeEnum(StructureType)

/**
 * Replication Method enum schema
 */
export const ReplicationMethodSchema = z.nativeEnum(ReplicationMethod)

/**
 * Registration Status enum schema
 */
export const RegistrationStatusSchema = z.nativeEnum(RegistrationStatus)

/**
 * Blockchain enum schema
 */
export const BlockchainSchema = z.nativeEnum(Blockchain)

/**
 * Custody Type enum schema
 */
export const CustodyTypeSchema = z.nativeEnum(CustodyType)

/**
 * ETF Product validation schema
 */
export const ETFProductSchema = z.object({
  project_id: z.string().uuid(),
  fund_ticker: z.string().min(1).max(10),
  fund_name: z.string().min(1).max(255),
  fund_type: ETFTypeSchema,
  net_asset_value: z.number().positive(),
  assets_under_management: z.number().nonnegative(),
  shares_outstanding: z.number().positive(),
  expense_ratio: z.number().nonnegative().max(1).optional(),
  total_expense_ratio: z.number().nonnegative().max(1).optional(),
  benchmark_index: z.string().max(255).optional(),
  currency: z.string().length(3).optional().default('USD'),
  inception_date: z.date(),
  structure_type: StructureTypeSchema.optional(),
  replication_method: ReplicationMethodSchema.optional(),
  registration_status: RegistrationStatusSchema.optional().default(RegistrationStatus.DRAFT),
  exchange: z.string().max(50).optional(),
  isin: z.string().length(12).optional(),
  sedol: z.string().length(7).optional(),
  cusip: z.string().length(9).optional(),
  parent_fund_id: z.string().uuid().nullable().optional(),
  share_class_name: z.string().max(100).nullable().optional()
})

/**
 * ETF Metadata validation schema
 */
export const ETFMetadataSchema = z.object({
  investment_objective: z.string().max(1000).optional(),
  strategy_description: z.string().max(2000).optional(),
  is_crypto_etf: z.boolean().default(false),
  supported_blockchains: z.array(BlockchainSchema).optional(),
  custody_type: CustodyTypeSchema.optional(),
  staking_enabled: z.boolean().default(false),
  rebalancing_frequency: z.string().max(50).optional(),
  screening_criteria: z.string().max(500).optional(),
  primary_benchmark: z.string().max(255).optional()
})

/**
 * ETF Holding validation schema
 */
export const ETFHoldingSchema = z.object({
  fund_product_id: z.string().uuid(),
  security_ticker: z.string().max(20).optional(),
  security_name: z.string().min(1).max(255),
  security_type: SecurityTypeSchema,
  quantity: z.number().positive(),
  market_value: z.number().nonnegative(),
  weight_percentage: z.number().min(0).max(100),
  price_per_unit: z.number().positive(),
  currency: z.string().length(3).optional().default('USD'),
  as_of_date: z.date(),
  
  // Identifiers
  isin: z.string().length(12).optional(),
  cusip: z.string().length(9).optional(),
  sedol: z.string().length(7).optional(),
  
  // Crypto-specific
  blockchain: BlockchainSchema.optional(),
  contract_address: z.string().max(255).optional(),
  token_standard: z.string().max(50).optional(),
  custody_address: z.string().optional(),
  custodian_name: z.string().max(255).optional(),
  is_staked: z.boolean().default(false),
  staking_apr: z.number().min(0).max(100).optional(),
  staking_rewards_accrued: z.number().nonnegative().optional(),
  
  // Classification
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  asset_class: z.string().max(50).optional()
}).refine(
  (data) => {
    // If crypto security type, blockchain must be specified
    if (data.security_type === SecurityType.CRYPTO && !data.blockchain) {
      return false
    }
    // If staked, staking_apr should be present
    if (data.is_staked && (data.staking_apr === undefined || data.staking_apr === null)) {
      return false
    }
    return true
  },
  {
    message: 'Crypto holdings must have blockchain specified, and staked holdings must have staking_apr'
  }
)

/**
 * Share Class creation validation schema
 */
export const ShareClassSchema = z.object({
  parent_fund_id: z.string().uuid(),
  share_class_name: z.string().min(1).max(100),
  fund_ticker: z.string().min(1).max(10),
  fund_name: z.string().min(1).max(255),
  expense_ratio: z.number().nonnegative().max(1),
  minimum_investment: z.number().nonnegative().optional(),
  distribution_frequency: z.string().max(50).optional()
})

/**
 * Bulk holdings import validation schema
 */
export const BulkHoldingsImportSchema = z.object({
  fund_product_id: z.string().uuid(),
  holdings: z.array(ETFHoldingSchema),
  as_of_date: z.date(),
  replace_existing: z.boolean().optional().default(false)
}).refine(
  (data) => data.holdings.length > 0,
  { message: 'Holdings array cannot be empty' }
).refine(
  (data) => {
    // Check that all holdings sum to approximately 100% weight
    const totalWeight = data.holdings.reduce((sum, h) => sum + h.weight_percentage, 0)
    return Math.abs(totalWeight - 100) < 1 // Allow 1% tolerance
  },
  { message: 'Total weight percentage of holdings must sum to approximately 100%' }
)

/**
 * ETF Calculation input validation schema
 */
export const ETFCalculationInputSchema = z.object({
  productId: z.string().uuid(),
  asOfDate: z.date(),
  configOverrides: z.record(z.any()).optional()
})

/**
 * ETF Token Link validation schema
 */
export const ETFTokenLinkSchema = z.object({
  fund_product_id: z.string().uuid(),
  token_id: z.string().uuid(),
  link_type: z.string().max(50).optional().default('primary'),
  is_active: z.boolean().optional().default(true),
  supports_rebase: z.boolean().optional().default(false),
  rebase_frequency: z.string().max(20).optional()
})

/**
 * Helper function to validate ETF product data
 */
export function validateETFProduct(data: unknown) {
  return ETFProductSchema.safeParse(data)
}

/**
 * Helper function to validate ETF holding data
 */
export function validateETFHolding(data: unknown) {
  return ETFHoldingSchema.safeParse(data)
}

/**
 * Helper function to validate share class data
 */
export function validateShareClass(data: unknown) {
  return ShareClassSchema.safeParse(data)
}

/**
 * Helper function to validate bulk holdings import
 */
export function validateBulkHoldingsImport(data: unknown) {
  return BulkHoldingsImportSchema.safeParse(data)
}

/**
 * Helper function to validate ETF calculation input
 */
export function validateETFCalculationInput(data: unknown) {
  return ETFCalculationInputSchema.safeParse(data)
}

/**
 * Helper function to validate ETF token link
 */
export function validateETFTokenLink(data: unknown) {
  return ETFTokenLinkSchema.safeParse(data)
}

export default {
  ETFTypeSchema,
  SecurityTypeSchema,
  StructureTypeSchema,
  ReplicationMethodSchema,
  RegistrationStatusSchema,
  BlockchainSchema,
  CustodyTypeSchema,
  ETFProductSchema,
  ETFMetadataSchema,
  ETFHoldingSchema,
  ShareClassSchema,
  BulkHoldingsImportSchema,
  ETFCalculationInputSchema,
  ETFTokenLinkSchema,
  validateETFProduct,
  validateETFHolding,
  validateShareClass,
  validateBulkHoldingsImport,
  validateETFCalculationInput,
  validateETFTokenLink
}
