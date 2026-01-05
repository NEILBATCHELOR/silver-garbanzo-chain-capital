/**
 * Trade Finance Services Index
 * Exports all trade-finance related services
 */

export { HaircutCalculator } from './HaircutCalculator'
export type { 
  PricePoint, 
  RiskMetrics, 
  HaircutRecommendation 
} from './HaircutCalculator'

export { 
  PriceAggregator, 
  createPriceAggregator
} from './PriceAggregator'
export type { 
  FREDObservation, 
  FREDResponse,
  EdgeFunctionResponse,
  CommodityPriceData 
} from './PriceAggregator'

export {
  FRED_COMMODITY_SERIES,
  getFREDSeriesId,
  getCommodityName,
  getCommodityUnit,
  getSupportedCommodities,
  isCommoditySupported
} from './FREDSeriesMapping'
export type {
  FREDSeriesInfo
} from './FREDSeriesMapping'

export { 
  RiskMonitor, 
  createRiskMonitor 
} from './RiskMonitoring'
export type { 
  PositionRiskData, 
  CollateralItem, 
  DebtItem, 
  MonitoringAlert, 
  OracleHealthStatus 
} from './RiskMonitoring'

export { 
  MarginCallService, 
  createMarginCallService 
} from './MarginCallService'
export type { 
  AlertChannel, 
  AlertPreferences, 
  SentAlert 
} from './MarginCallService'

// CME Price Service
export { 
  CMEPriceService, 
  createCMEPriceService 
} from './CMEPriceService'
export type { 
  CMEPriceData 
} from './CMEPriceService'

// LME Price Service
export { 
  LMEPriceService, 
  createLMEPriceService 
} from './LMEPriceService'
export type { 
  LMEPriceData 
} from './LMEPriceService'

// ICE Price Service
export { 
  ICEPriceService, 
  createICEPriceService 
} from './ICEPriceService'
export type { 
  ICEPriceData 
} from './ICEPriceService'

// Price Orchestrator (NEW)
export { 
  PriceOrchestrator, 
  createPriceOrchestrator 
} from './PriceOrchestrator'
export type { 
  OrchestratedPrice, 
  PriceSourceConfig 
} from './PriceOrchestrator'

// Price Update Scheduler (NEW)
export { 
  PriceUpdateScheduler, 
  createPriceUpdateScheduler,
  registerPriceUpdateScheduler 
} from './priceUpdateJobs'

// Precious Metals Price Service
export { 
  PreciousMetalsPriceService, 
  createPreciousMetalsPriceService 
} from './PreciousMetalsPriceService'
export type { 
  MetalPrice 
} from './PreciousMetalsPriceService'

// Deployment Recording Service
export { 
  DeploymentRecordingService,
  deploymentRecordingService 
} from './DeploymentRecordingService'
