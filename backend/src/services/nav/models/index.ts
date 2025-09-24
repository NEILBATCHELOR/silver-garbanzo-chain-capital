/**
 * Financial Models Orchestrator
 * Central export point for all financial calculation models
 */

// Export utility modules
export * from './utils/MathUtils'
export * from './utils/DateUtils'

// Export model classes
export { equityModels } from './EquityModels'
export { alternativeAssetModels } from './AlternativeAssetModels'

// Export alternative asset models
export * from './alternatives'

// Export digital asset models
export * from './digital'

// Export derivatives models  
export * from './derivatives'

// Export market models (avoid re-exporting enums that conflict with utils)
export { yieldCurveModels } from './market'
export { creditModels } from './market'
export { volatilitySurfaceModels } from './market'

// Export quantitative models
export * from './quant'

// Re-export types
export type { 
  DividendProjection,
  CAPMParams,
  DDMParams,
  MultiplierValuation
} from './EquityModels'

export type {
  JCurveParams,
  CarriedInterestParams,
  WaterfallResult,
  IRRResult
} from './AlternativeAssetModels'

export type {
  BarrierOptionParams,
  BarrierOptionResult
} from './derivatives/BarrierOptionModels'

export type {
  AsianOptionParams,
  LookbackOptionParams,
  ExoticOptionResult
} from './derivatives/ExoticOptionModels'