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

// Priority Calculators (Phase 6) - COMPLETED
export { CommoditiesCalculator } from './CommoditiesCalculator'
export type { 
  CommodityCalculationInput, 
  CommodityPriceData, 
  CommodityRollData, 
  StorageCostData 
} from './CommoditiesCalculator'

export { StablecoinCryptoCalculator } from './StablecoinCryptoCalculator'
export type { 
  StablecoinCryptoCalculationInput, 
  CollateralAsset, 
  StablecoinCryptoPriceData, 
  LiquidationRisk, 
  ProtocolMetrics 
} from './StablecoinCryptoCalculator'

export { AssetBackedCalculator } from './AssetBackedCalculator'
export type { 
  AssetBackedCalculationInput, 
  AssetBackedPriceData, 
  CashFlowProjection, 
  CreditMetrics, 
  TranchingStructure 
} from './AssetBackedCalculator'

// Extended Calculators (Plan 1 Additions) - IMPLEMENTED
export { CompositeFundCalculator } from './CompositeFundCalculator'
export type { 
  CompositeFundCalculationInput, 
  AssetAllocationTarget, 
  ConcentrationLimit, 
  PortfolioHolding, 
  CompositeFundMetrics, 
  RiskAttribution 
} from './CompositeFundCalculator'

// PrivateEquityCalculator - COMPLETED ✅
export { PrivateEquityCalculator } from './PrivateEquityCalculator'
export type {
  PrivateEquityCalculationInput,
  PortfolioCompany,
  FundPerformanceMetrics,
  JCurveAnalysis,
  IlliquidityAdjustment
} from './PrivateEquityCalculator'

// RealEstateCalculator - COMPLETED ✅
export { RealEstateCalculator } from './RealEstateCalculator'
export type {
  RealEstateCalculationInput,
  PropertyDetails,
  MarketComparables,
  ValuationResult,
  ReitMetrics
} from './RealEstateCalculator'

// PrivateDebtCalculator - COMPLETED ✅
export { PrivateDebtCalculator } from './PrivateDebtCalculator'
export type {
  PrivateDebtCalculationInput,
  LoanDetails,
  CreditRiskAssessment as PrivateDebtCreditRiskAssessment,
  CollateralAnalysis,
  PortfolioMetrics
} from './PrivateDebtCalculator'

// InfrastructureCalculator - COMPLETED ✅
export { InfrastructureCalculator } from './InfrastructureCalculator'
export type { InfrastructureCalculationInput, InfrastructureAsset } from './InfrastructureCalculator'

export { EnergyCalculator } from './EnergyCalculator'
export type { 
  EnergyCalculationInput, 
  EnergyAsset,
  EnergyRiskMetrics,
  PowerPurchaseAgreement,
  WeatherRisk,
  CommodityExposure,
  EnergyValuationScenario
} from './EnergyCalculator'

export { DigitalTokenizedFundCalculator } from './DigitalTokenizedFundCalculator'
export type { 
  DigitalTokenizedFundCalculationInput,
  DigitalAsset,
  LiquidityPoolPosition,
  StakingPosition,
  YieldFarmingPosition,
  GovernanceToken,
  VestingSchedule,
  AuditStatus,
  TechnicalMetrics,
  DeFiMetrics,
  TokenMetrics,
  DigitalRiskMetrics,
  GovernanceMetrics,
  BlockchainPosition,
  CrossChainBridge,
  DeFiProtocolExposure,
  TokenomicsData
} from './DigitalTokenizedFundCalculator'

export { QuantitativeStrategiesCalculator } from './QuantitativeStrategiesCalculator'
export type { 
  QuantitativeStrategiesCalculationInput,
  FactorLoading,
  QuantStrategy,
  PerformanceMetrics,
  QuantRiskMetrics,
  FactorExposure,
  FactorMetric,
  BacktestResults,
  YearlyPerformance,
  AlgorithmicExecution,
  QuantPosition,
  DynamicHedging,
  HedgeInstrument,
  RiskManagement,
  StressTestResult,
  SystemMetrics,
  AlphaSource,
  ModelValidation,
  WalkForwardResult,
  RobustnessTest
} from './QuantitativeStrategiesCalculator'

// Extended Calculators - FINAL 4 COMPLETE ✅
export { StructuredProductCalculator } from './StructuredProductCalculator'
export type {
  StructuredProductCalculationInput,
  StructuredProductPriceData,
  PayoffScenario,
  RiskMetrics as StructuredProductRiskMetrics,
  ComplexityAnalysis
} from './StructuredProductCalculator'

export { CollectiblesCalculator } from './CollectiblesCalculator'
export type {
  CollectiblesCalculationInput,
  AuthenticityDetails,
  ProvenanceDetails,
  OwnershipRecord,
  Exhibition,
  Publication,
  CollectiblesMarketData,
  AuctionResult,
  StorageRequirements,
  ValuationMetrics,
  RiskAssessment as CollectiblesRiskAssessment
} from './CollectiblesCalculator'

export { ClimateReceivablesCalculator } from './ClimateReceivablesCalculator'
export type {
  ClimateReceivablesCalculationInput,
  CobenefitDetails,
  ClimateReceivablesPriceData,
  VerificationMetrics,
  PolicyImpactAnalysis,
  ClimateRiskAssessment,
  SustainabilityMetrics,
  MarketDynamics,
  ComplianceMarketData,
  VoluntaryMarketData,
  FuturesMarketData,
  MarketCorrelations
} from './ClimateReceivablesCalculator'

export { InvoiceReceivablesCalculator } from './InvoiceReceivablesCalculator'
export type {
  InvoiceReceivablesCalculationInput,
  CollectionHistory,
  GuaranteeDetails,
  InsuranceDetails,
  VerificationStatus,
  InvoiceReceivablesPriceData,
  CreditRiskAssessment as InvoiceCreditRiskAssessment,
  CollectionMetrics,
  FactoringTerms,
  ConcentrationLimits,
  IndustryAnalysis,
  SeasonalityPattern,
  DilutionAnalysis
} from './InvoiceReceivablesCalculator'

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
  return createCalculatorRegistry(undefined, {
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
 * Indicates specific asset calculators implementation status
 * Phase 6 Priority Calculators: 7/7 COMPLETED ✅
 * - EquityCalculator ✅
 * - BondCalculator ✅  
 * - MmfCalculator ✅
 * - StablecoinFiatCalculator ✅
 * - CommoditiesCalculator ✅
 * - StablecoinCryptoCalculator ✅
 * - AssetBackedCalculator ✅
 * 
 * Extended Calculators: 15/15 COMPLETED ✅
 * - CompositeFundCalculator ✅
 * - PrivateEquityCalculator ✅
 * - RealEstateCalculator ✅
 * - PrivateDebtCalculator ✅
 * - InfrastructureCalculator ✅
 * - EnergyCalculator ✅
 * - DigitalTokenizedFundCalculator ✅
 * - QuantitativeStrategiesCalculator ✅
 * - StructuredProductCalculator ✅
 * - CollectiblesCalculator ✅
 * - ClimateReceivablesCalculator ✅
 * - InvoiceReceivablesCalculator ✅
 */
export const ASSET_CALCULATORS_IMPLEMENTED = true // ALL CALCULATORS COMPLETE ✅

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
