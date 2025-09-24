/**
 * Alternative Asset Financial Models
 * Export all alternative asset model services
 */

export { realEstateModels } from './RealEstateModels'
export { infrastructureModels } from './InfrastructureModels'
export { climateModels } from './ClimateModels'

// Re-export types for convenience
export type { 
  IncomeApproachParams,
  ComparableSalesParams,
  CostApproachParams,
  LeveragedYieldParams,
  RealEstateDCFParams,
  RealEstateMetrics,
  Property,
  Adjustment
} from './RealEstateModels'

export type {
  PPPValuationParams,
  RegulatoryAssetBaseParams,
  TariffModelParams,
  ConcessionValuationParams,
  InfrastructureDCFParams,
  InfrastructureMetrics,
  InfrastructureCashFlow,
  DebtSchedule
} from './InfrastructureModels'

export type {
  LCOEParams,
  CapacityFactorParams,
  PPAValuationParams,
  CarbonCreditParams,
  ClimateFlow,
  SolarProjectParams,
  WindProjectParams,
  EnergyStorageParams,
  ClimateMetrics
} from './ClimateModels'
