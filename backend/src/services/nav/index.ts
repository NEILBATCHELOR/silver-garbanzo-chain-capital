// Nav Service Exports
export { FinancialModelsService } from './FinancialModelsService'
export { MMFInvestorService } from './MMFInvestorService'
export * from './ProductTypeUtilities'

// Export main NAV types (prefer these over calculator types for external consumers)
export type {
  // Enums
  AssetType,
  CalculationStatus,
  ValidationSeverity,
  ApprovalStatus,
  MarketDataProvider,
  // Base Interfaces
  PriceData,
  FxRate,
  AssetHolding,
  // Calculation
  CalculationInput as NAVCalculationInput,
  CalculationResult as NAVCalculationResult,
  // Validation (from main types, not calculator types)
  ValidationRule,
  ValidationResult as NAVValidationResult,
  // Other types
  RedemptionData,
  OnChainNavUpdate,
  AssetNavCalculator,
  NavQueryOptions,
  NavServiceResult,
  NavPaginatedResponse,
  MarketDataRequest,
  MarketDataResponse,
  FxRateRequest,
  NavAnalytics
} from './types'

// Export calculator types separately to avoid conflicts
export type {
  CalculatorInput,
  CalculatorResult,
  CalculatorWarning,
  NAVResult,
  NAVBreakdown,
  DataSource,
  CalculatorError,
  CalculatorMetadata,
  Adjustment,
  ValidationResult as CalculatorValidationResult,
  ValidationError,
  ValidationWarning
} from './calculators/types'

// Export calculator classes and utilities
export { BaseCalculator } from './calculators/BaseCalculator'
export { 
  CalculatorRegistry, 
  createCalculatorRegistry,
  type AssetType as CalculatorAssetType // Rename to avoid conflict with enum
} from './calculators/CalculatorRegistry'

// Export validators
export { BondsValidator, bondsValidator } from './calculators/validators/BondsValidator'
export { ETFValidator, etfValidator, createETFValidator } from './calculators/validators/ETFValidator'

// Export calculators
export { BondsCalculator, createBondsCalculator } from './calculators/traditional/BondsCalculator'
export { MMFCalculator, createMMFCalculator } from './calculators/traditional/MMFCalculator'
export { ETFCalculator, createETFCalculator } from './calculators/traditional/ETFCalculator'

// Export support services
export * from './market-data'
export * from './benchmark'
export * from './crypto'
export * from './share-class'
export * from './config'

// Export Phase 2 Advanced Services
export * from './monitoring' // Premium/Discount Monitor
export * from './creation-redemption' // Basket Calculator
export * from './quality' // Data Quality Service
export * from './logging' // NAV Calculation Logger

// Export a convenience function to get the nav service
import { FinancialModelsService } from './FinancialModelsService'
import { MMFInvestorService } from './MMFInvestorService'

export function getNavService() {
  return new FinancialModelsService()
}

export function getMMFInvestorService(supabase: any) {
  return new MMFInvestorService(supabase)
}
