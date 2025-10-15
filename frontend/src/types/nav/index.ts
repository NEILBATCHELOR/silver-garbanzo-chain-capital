/**
 * NAV Domain Types - Central exports
 * All TypeScript interfaces and types for NAV operations
 */

// Import enums for utility functions
import { AssetType, CalculationStatus, ApprovalStatus } from './nav'

// Re-export everything from nav.ts (single export only)
export * from './nav'

// Export domain-specific calculator types
export * from './calculator-inputs'

// Export MMF types
export * from './mmf'

// Re-export service types for compatibility
export type { NavCalculationRequest, NavCalculationResult } from '@/services/nav'

// Generated types from OpenAPI (when available)
// export * from './generated'

// Asset type utility functions
export const assetTypeLabels: Record<AssetType, string> = {
  [AssetType.EQUITY]: 'Equity',
  [AssetType.BONDS]: 'Bonds',
  [AssetType.MMF]: 'Money Market Funds',
  [AssetType.COMMODITIES]: 'Commodities',
  [AssetType.STABLECOIN_FIAT_BACKED]: 'Fiat-Backed Stablecoin',
  [AssetType.STABLECOIN_CRYPTO_BACKED]: 'Crypto-Backed Stablecoin',
  [AssetType.ASSET_BACKED]: 'Asset-Backed Securities',
  [AssetType.COMPOSITE_FUNDS]: 'Composite Funds',
  [AssetType.PRIVATE_EQUITY]: 'Private Equity',
  [AssetType.PRIVATE_DEBT]: 'Private Debt',
  [AssetType.REAL_ESTATE]: 'Real Estate',
  [AssetType.INFRASTRUCTURE]: 'Infrastructure',
  [AssetType.ENERGY]: 'Energy',
  [AssetType.STRUCTURED_PRODUCTS]: 'Structured Products',
  [AssetType.QUANT_STRATEGIES]: 'Quantitative Strategies',
  [AssetType.COLLECTIBLES]: 'Collectibles',
  [AssetType.DIGITAL_TOKENIZED_FUNDS]: 'Digital Tokenized Funds',
  [AssetType.CLIMATE_RECEIVABLES]: 'Climate Receivables',
  [AssetType.INVOICE_RECEIVABLES]: 'Invoice Receivables',
  [AssetType.STABLECOIN_COMMODITY_BACKED]: 'Commodity-Backed Stablecoin',
  [AssetType.STABLECOIN_ALGORITHMIC]: 'Algorithmic Stablecoin',
}

// Status utility functions
export const calculationStatusLabels: Record<CalculationStatus, string> = {
  [CalculationStatus.QUEUED]: 'Queued',
  [CalculationStatus.RUNNING]: 'Running',
  [CalculationStatus.COMPLETED]: 'Completed',
  [CalculationStatus.FAILED]: 'Failed',
}

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: 'Draft',
  [ApprovalStatus.VALIDATED]: 'Validated',
  [ApprovalStatus.APPROVED]: 'Approved',
  [ApprovalStatus.REJECTED]: 'Rejected',
  [ApprovalStatus.PUBLISHED]: 'Published',
}

// Color variants for status indicators
export const calculationStatusColors: Record<CalculationStatus, string> = {
  [CalculationStatus.QUEUED]: 'bg-gray-100 text-gray-800',
  [CalculationStatus.RUNNING]: 'bg-blue-100 text-blue-800', 
  [CalculationStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [CalculationStatus.FAILED]: 'bg-red-100 text-red-800',
}

export const approvalStatusColors: Record<ApprovalStatus, string> = {
  [ApprovalStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [ApprovalStatus.VALIDATED]: 'bg-yellow-100 text-yellow-800',
  [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-800',
  [ApprovalStatus.REJECTED]: 'bg-red-100 text-red-800',
  [ApprovalStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
}

// Priority asset types for calculators (based on backend analysis)
export const priorityAssetTypes: AssetType[] = [
  AssetType.EQUITY,
  AssetType.BONDS,
  AssetType.MMF,
  AssetType.COMMODITIES,
  AssetType.STABLECOIN_FIAT_BACKED,
  AssetType.STABLECOIN_CRYPTO_BACKED,
  AssetType.ASSET_BACKED,
]

// Extended asset types
export const extendedAssetTypes: AssetType[] = [
  AssetType.COMPOSITE_FUNDS,
  AssetType.PRIVATE_EQUITY,
  AssetType.PRIVATE_DEBT,
  AssetType.REAL_ESTATE,
  AssetType.INFRASTRUCTURE,
  AssetType.ENERGY,
  AssetType.STRUCTURED_PRODUCTS,
  AssetType.QUANT_STRATEGIES,
  AssetType.COLLECTIBLES,
  AssetType.DIGITAL_TOKENIZED_FUNDS,
  AssetType.CLIMATE_RECEIVABLES,
  AssetType.INVOICE_RECEIVABLES,
  AssetType.STABLECOIN_COMMODITY_BACKED,
  AssetType.STABLECOIN_ALGORITHMIC,
]

// Type guards
export const isAssetType = (value: string): value is AssetType => {
  return Object.values(AssetType).includes(value as AssetType)
}

export const isCalculationStatus = (value: string): value is CalculationStatus => {
  return Object.values(CalculationStatus).includes(value as CalculationStatus)
}

export const isApprovalStatus = (value: string): value is ApprovalStatus => {
  return Object.values(ApprovalStatus).includes(value as ApprovalStatus)
}

// Re-exports are handled above in the organized exports section
