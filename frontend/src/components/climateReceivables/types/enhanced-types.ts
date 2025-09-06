/**
 * Enhanced Climate Receivables Types
 * Fixes for TypeScript errors and missing type definitions
 */

// ============================================================================
// ENHANCED RISK TYPES
// ============================================================================

/**
 * Enhanced Risk Level enum with CRITICAL level
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Risk Level string union for backwards compatibility
 */
export type RiskLevelString = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================================
// ALERT SYSTEM TYPES
// ============================================================================

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Alert types for climate receivables system
 */
export enum AlertType {
  RISK_CHANGE = 'risk_change',
  DISCOUNT_RATE_CHANGE = 'discount_rate_change',
  CONFIDENCE_DROP = 'confidence_drop',
  SYSTEM_ERROR = 'system_error',
  CALCULATION_COMPLETE = 'calculation_complete',
  BATCH_COMPLETE = 'batch_complete'
}

/**
 * Climate Receivables Alert Item
 */
export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  description?: string;
  receivableId?: string;
  timestamp: string;
  acknowledged: boolean;
  recommendations?: string[];
  metadata?: Record<string, any>;
}

/**
 * Browser notification interface
 */
export interface BrowserNotification {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// ============================================================================
// ENHANCED RISK ASSESSMENT TYPES
// ============================================================================

/**
 * Risk calculation result wrapper
 */
export interface EnhancedRiskCalculationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  duration?: number;
}

/**
 * Risk component assessment
 */
export interface RiskComponent {
  score: number;
  factors: string[];
  confidence: number;
  lastUpdated?: string;
}

/**
 * Composite risk assessment
 */
export interface CompositeRisk {
  score: number;
  level: RiskLevel;
  confidence: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Discount rate calculation
 */
export interface DiscountRateCalculation {
  calculated: number;
  previous?: number;
  change?: number;
  factors: {
    riskFreeRate: number;
    creditSpread: number;
    illiquidityPremium: number;
    riskPremium: number;
  };
}

/**
 * Enhanced Risk Assessment Result
 */
export interface EnhancedRiskAssessmentResult {
  receivableId: string;
  calculatedAt: string;
  
  riskComponents: {
    productionRisk: RiskComponent;
    creditRisk: RiskComponent;
    policyRisk: RiskComponent;
  };
  
  compositeRisk: CompositeRisk;
  discountRate: DiscountRateCalculation;
  recommendations: string[];
  alerts: AlertItem[];
  nextReviewDate: string;
  
  // Metadata
  calculationDuration?: number;
  dataQuality?: number;
  methodologyVersion?: string;
}

/**
 * Batch risk calculation result
 */
export interface BatchRiskCalculationResult {
  successful: EnhancedRiskAssessmentResult[];
  failed: {
    receivableId: string;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
    averageRiskScore?: number;
    highRiskCount?: number;
  };
}

/**
 * Risk calculation statistics
 */
export interface RiskCalculationStatistics {
  totalCalculations: number;
  averageRiskScore: number;
  lastCalculationTime?: string;
  calculationFrequency?: number;
  accuracy?: number;
  
  riskDistribution: Record<RiskLevel, number>;
  
  trends: {
    dailyCalculations: {
      date: string;
      count: number;
      averageRisk: number;
    }[];
    riskLevelTrends: Record<RiskLevel, number[]>;
  };
}

// ============================================================================
// WEATHER AND EXTERNAL DATA TYPES
// ============================================================================

/**
 * Weather forecast item
 */
export interface WeatherForecastItem {
  date: string;
  location: string;
  temperature: {
    min: number;
    max: number;
    average: number;
  };
  conditions: {
    sunlightHours: number;
    windSpeed: number;
    precipitation: number;
    cloudCover: number;
  };
  confidence: number;
}

/**
 * Weather forecast data
 */
export interface WeatherForecastData {
  location: string;
  forecasts: WeatherForecastItem[];
  provider: string;
  lastUpdated: string;
  reliability: number;
}

/**
 * Energy price data
 */
export interface EnergyPriceData {
  region: string;
  marketType: 'spot' | 'forward' | 'futures';
  price: number;
  unit: string;
  timestamp: string;
  source: string;
}

/**
 * Carbon credit price data
 */
export interface CarbonCreditPrice {
  market: string;
  creditType: string;
  price: number;
  currency: string;
  timestamp: string;
  volume?: number;
}

/**
 * Financial indicators
 */
export interface FinancialIndicators {
  riskFreeRate: number;
  creditSpreads: Record<string, number>;
  inflationRate: number;
  commodityPrices: Record<string, number>;
  lastUpdated: string;
}

// ============================================================================
// CASH FLOW FORECASTING TYPES
// ============================================================================

/**
 * Cash flow scenario
 */
export interface CashFlowScenario {
  name: string;
  probability: number;
  monthlyProjections: {
    month: string;
    amount: number;
    confidence: number;
  }[];
  totalNPV: number;
  irr: number;
}

/**
 * Monte Carlo simulation result
 */
export interface MonteCarloResult {
  iterations: number;
  
  scenarios: {
    optimistic: number;    // P90
    realistic: number;     // P50
    pessimistic: number;   // P10
    worstCase: number;     // P5
  };
  
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    skewness: number;
    kurtosis: number;
  };
  
  percentiles: Record<string, number>;
  
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
    probabilityOfLoss: number;
  };
  
  confidence: number;
  calculationTime: number;
}

/**
 * Production forecast model
 */
export interface ProductionForecastModel {
  modelType: 'LSTM' | 'CNN_LSTM' | 'ARIMA' | 'ENSEMBLE';
  accuracy: number;
  lastTrained: string;
  hyperparameters: {
    lookbackPeriod: number;
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
  };
  features: string[];
  performance: {
    rmse: number;
    mae: number;
    r2Score: number;
  };
}

// ============================================================================
// CLIMATE NAV VALUATION TYPES
// ============================================================================

/**
 * Climate NAV calculation wrapper
 */
export interface ClimateNAVCalculation {
  assetId: string;
  calculatedAt: string;
  methodology: 'DCF' | 'comparables' | 'cost' | 'hybrid';
  
  baseNAV: number;
  riskAdjustedNAV: number;
  
  adjustments: {
    lcoeAdjustment: number;
    capacityFactorAdjustment: number;
    ppaAdjustment: number;
    carbonCreditAdjustment: number;
  };
  
  confidence: number;
  nextRevaluation: string;
}

// ============================================================================
// SERVICE INTEGRATION TYPES
// ============================================================================

/**
 * Service health status
 */
export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  errorRate?: number;
  uptime?: number;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  calculationsPerformed: number;
  averageProcessingTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  lastUpdated: string;
}

/**
 * Service configuration
 */
export interface ServiceConfiguration {
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  autoRefreshInterval: number;
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Risk calculation state
 */
export interface RiskCalculationState {
  isLoading: boolean;
  isCalculating: boolean;
  progress: number;
  
  lastCalculation?: EnhancedRiskAssessmentResult;
  batchResults?: BatchRiskCalculationResult;
  statistics: RiskCalculationStatistics;
  alerts: AlertItem[];
  
  error?: string;
  configuration: ServiceConfiguration;
}

/**
 * Cash flow forecasting state
 */
export interface CashFlowForecastingState {
  isLoading: boolean;
  isForecasting: boolean;
  progress: number;
  
  lastForecast?: {
    receivableId: string;
    scenarios: CashFlowScenario[];
    monteCarloResult: MonteCarloResult;
    confidence: number;
    calculatedAt: string;
  };
  
  portfolioForecast?: {
    totalValue: number;
    scenarios: CashFlowScenario[];
    diversificationBenefit: number;
    correlationMatrix: number[][];
  };
  
  error?: string;
  models: ProductionForecastModel[];
}

/**
 * Alert management state
 */
export interface AlertManagementState {
  alerts: AlertItem[];
  unacknowledgedCount: number;
  
  statistics: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
    acknowledgedToday: number;
  };
  
  isLoading: boolean;
  error?: string;
  lastRefresh: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Re-export everything for easy access
export * from './climate-nav-types';
