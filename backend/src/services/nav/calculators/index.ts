/**
 * NAV Calculators Index
 * Exports for asset-specific NAV calculation implementations
 * 
 * This directory contains calculator implementations for different asset types:
 * - BaseCalculator.ts (abstract base class) ✅
 * - CalculatorRegistry.ts (dynamic calculator resolution) ✅
 * - EquityCalculator.ts (TODO - Phase 6)
 * - BondCalculator.ts (TODO - Phase 6)
 * - StablecoinFiatCalculator.ts (TODO - Phase 6)
 * - ... additional asset-specific calculators
 */

import { AssetType, AssetNavCalculator } from '../types'
import { CalculatorRegistry, createCalculatorRegistry } from './CalculatorRegistry'

// ==================== CORE CALCULATOR INFRASTRUCTURE ====================

export { BaseCalculator } from './BaseCalculator'
export type { 
  CalculatorOptions, 
  CalculatorValidation,
  CalculatorMetrics 
} from './BaseCalculator'

export { 
  CalculatorRegistry,
  createCalculatorRegistry 
} from './CalculatorRegistry'
export type { 
  CalculatorRegistration,
  CalculatorResolution,
  RegistryMetrics,
  RegistryOptions
} from './CalculatorRegistry'

// ==================== ASSET-SPECIFIC CALCULATORS ====================

// Phase 6 Implementation - Priority calculators
export { EquityCalculator } from './EquityCalculator'
export type { EquityCalculationInput, EquityPriceData } from './EquityCalculator'

export { BondCalculator } from './BondCalculator'
export type { BondCalculationInput, BondPriceData, YieldCurvePoint } from './BondCalculator'

// Phase 7 Implementation - Additional priority calculators
export { MmfCalculator } from './MmfCalculator'
export type { 
  MmfCalculationInput, 
  MmfHolding, 
  MmfPriceData, 
  MmfRiskMetrics, 
  StressTestScenario 
} from './MmfCalculator'

export { StablecoinFiatCalculator } from './StablecoinFiatCalculator'
export type { 
  StablecoinFiatCalculationInput, 
  FiatReserve, 
  StablecoinPriceData, 
  ReserveAttestation, 
  DepegRiskMetrics, 
  StablecoinComplianceMetrics 
} from './StablecoinFiatCalculator'

// TODO: Export remaining priority calculators as they are implemented
// export { StablecoinCryptoCalculator } from './StablecoinCryptoCalculator'
// export { CommoditiesCalculator } from './CommoditiesCalculator'
// export { AssetBackedCalculator } from './AssetBackedCalculator'

// ==================== FACTORY FUNCTIONS ====================

/**
 * Factory function to get calculator for a specific asset type
 * This will be enhanced in Phase 6 when specific calculators are implemented
 */
export function getCalculatorForAssetType(assetType: AssetType): AssetNavCalculator | null {
  const registry = createCalculatorRegistry()
  return registry.getCalculatorForAssetType(assetType)
}

/**
 * Creates a default calculator registry with fallback calculator
 * This provides basic NAV calculation capability until specific calculators are implemented
 */
export function createDefaultCalculatorRegistry(): CalculatorRegistry {
  return createCalculatorRegistry({
    enableHealthChecks: true,
    enableCaching: true,
    defaultFallbackEnabled: true,
    maxResolutionTimeMs: 1000
  })
}

// ==================== STATUS FLAGS ====================

/**
 * Indicates Phase 5 (Calculator Foundation) is complete
 */
export const CALCULATOR_FOUNDATION_IMPLEMENTED = true

/**
 * Indicates specific asset calculators are partially implemented
 * Phase 7 in progress: 4/7 priority calculators completed
 * - EquityCalculator ✅
 * - BondCalculator ✅  
 * - MmfCalculator ✅
 * - StablecoinFiatCalculator ✅
 * - StablecoinCryptoCalculator ⏳
 * - CommoditiesCalculator ⏳
 * - AssetBackedCalculator ⏳
 */
export const ASSET_CALCULATORS_IMPLEMENTED = false // Will be true when all 7 priority calculators are done

/**
 * List of asset types that will be supported when Phase 6 is complete
 */
export const PLANNED_ASSET_TYPES: AssetType[] = [
  AssetType.EQUITY,
  AssetType.BONDS,
  AssetType.MMF,
  AssetType.COMMODITIES,
  AssetType.STABLECOIN_FIAT_BACKED,
  AssetType.STABLECOIN_CRYPTO_BACKED,
  AssetType.ASSET_BACKED,
  AssetType.COMPOSITE_FUNDS,
  AssetType.PRIVATE_EQUITY,
  AssetType.PRIVATE_DEBT,
  AssetType.REAL_ESTATE,
  AssetType.INFRASTRUCTURE,
  AssetType.STRUCTURED_PRODUCTS,
  AssetType.QUANT_STRATEGIES,
  AssetType.ENERGY,
  AssetType.COLLECTIBLES,
  AssetType.DIGITAL_TOKENIZED_FUNDS,
  AssetType.CLIMATE_RECEIVABLES,
  AssetType.INVOICE_RECEIVABLES,
  AssetType.STABLECOIN_COMMODITY_BACKED,
  AssetType.STABLECOIN_ALGORITHMIC
]

/**
 * Gets the number of asset types that will be supported
 */
export function getSupportedAssetTypesCount(): number {
  return PLANNED_ASSET_TYPES.length
}

/**
 * Checks if a specific asset type is planned for calculator support
 */
export function isAssetTypePlannedForCalculator(assetType: AssetType): boolean {
  return PLANNED_ASSET_TYPES.includes(assetType)
}
