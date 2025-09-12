/**
 * Climate Receivables Domain Types
 * 
 * Core type definitions for climate receivables business logic services.
 * Based on database schema and business requirements.
 */

import type { Tables, InsertTables, UpdateTables } from '../../core/database';

// Energy Asset Types (commonly referenced by services)
export interface EnergyAsset {
  id: string;
  assetId: string;  // Alias for id - used by business logic services
  name: string;
  type: 'solar' | 'wind' | 'hydro' | 'geothermal' | 'biomass';
  capacity: number;
  location: string;
  commissioning_date: string;
  efficiency_rating: number;
  ownerId?: string;  // Added for service compatibility
  created_at: string;
  updated_at: string;
  createdAt?: string;  // Alias for compatibility
  updatedAt?: string;  // Alias for compatibility
}

// Renewable Energy Credit Types (Based on actual database schema)
export type RECStatus = 'issued' | 'pending' | 'verified' | 'retired' | 'cancelled';

// Runtime enum constants for RECStatus
export const RECStatusEnum = {
  ISSUED: 'issued' as const,
  PENDING: 'pending' as const,
  VERIFIED: 'verified' as const,
  RETIRED: 'retired' as const,
  CANCELLED: 'cancelled' as const
} as const;

export interface RenewableEnergyCredit {
  rec_id: string;  // Primary key in database
  asset_id?: string;
  quantity: number;
  vintage_year: number;
  market_type: string;
  price_per_rec: number;
  total_value: number;
  certification?: string;
  certification_body?: string;  // Added for service compatibility
  registry_id?: string;  // Added for service compatibility
  serial_number?: string;  // Added for service compatibility
  retirement_account?: string;  // Added for service compatibility
  retirement_date?: string;  // Added for service compatibility
  status: string;
  created_at?: string;
  updated_at?: string;
  receivable_id?: string;
  incentive_id?: string;
  project_id?: string;
}

export type InsertRenewableEnergyCredit = Omit<RenewableEnergyCredit, 'rec_id' | 'created_at' | 'updated_at'>;

// Climate Incentive Types (Based on actual database schema)
export type IncentiveStatus = 'pending' | 'approved' | 'disbursed' | 'expired' | 'cancelled';
export type IncentiveType = 'production_tax_credit' | 'investment_tax_credit' | 'renewable_energy_certificate' | 'carbon_credit' | 'green_bond';

// Runtime enum constants for IncentiveStatus and IncentiveType
export const IncentiveStatusEnum = {
  PENDING: 'pending' as const,
  APPROVED: 'approved' as const,
  DISBURSED: 'disbursed' as const,
  EXPIRED: 'expired' as const,
  CANCELLED: 'cancelled' as const
} as const;

export const IncentiveTypeEnum = {
  PRODUCTION_TAX_CREDIT: 'production_tax_credit' as const,
  INVESTMENT_TAX_CREDIT: 'investment_tax_credit' as const,
  RENEWABLE_ENERGY_CERTIFICATE: 'renewable_energy_certificate' as const,
  CARBON_CREDIT: 'carbon_credit' as const,
  GREEN_BOND: 'green_bond' as const,
  REC: 'renewable_energy_certificate' as const // Alias for REC
} as const;

export interface ClimateIncentive {
  incentive_id: string;  // Primary key in database
  type: string;  // Database column name
  amount: number;
  status: string;
  asset_id?: string;
  receivable_id?: string;
  expected_receipt_date?: string;
  actual_receipt_date?: string;  // Added for service compatibility
  notes?: string;  // Added for service compatibility
  metadata?: Record<string, any>;  // Added for service compatibility
  created_at?: string;
  updated_at?: string;
  project_id?: string;
}

export type InsertClimateIncentive = Omit<ClimateIncentive, 'incentive_id' | 'created_at' | 'updated_at'>;

// Weather Data Types
export interface WeatherData {
  date: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  windSpeed?: number;  // Alias for compatibility
  sunlightHours?: number;  // Added for service compatibility
  solar_irradiance: number;
  precipitation: number;
  precipitationMm?: number;  // Alias for compatibility
  cloud_cover: number;
  cloudCover?: number;  // Alias for compatibility
}

// Production Data Types (alias for existing ProductionDataPoint)
export type ProductionData = ProductionDataPoint;

// Database table types
export type ClimateReceivableTable = Tables<'climate_receivables'>;
export type ClimatePayerTable = Tables<'climate_payers'>;
export type ClimateRiskFactorTable = Tables<'climate_risk_factors'>;
export type ClimateCashFlowProjectionTable = Tables<'climate_cash_flow_projections'>;
export type ClimateNavCalculationTable = Tables<'climate_nav_calculations'>;

export type ClimateReceivableInsert = InsertTables<'climate_receivables'>;
export type ClimateReceivableUpdate = UpdateTables<'climate_receivables'>;
export type ClimateCashFlowProjectionInsert = InsertTables<'climate_cash_flow_projections'>;

// Risk Assessment Types
export interface ClimateRiskAssessmentInput {
  receivableId: string;
  payerId: string;
  assetId: string;
  amount: number;
  dueDate: string;
}

export interface ClimateRiskAssessmentResult {
  receivableId: string;
  riskScore: number;
  discountRate: number;
  confidenceLevel: number;
  methodology: string;
  factorsConsidered: string[];
  riskTier: 'Prime' | 'Investment Grade' | 'Speculative' | 'High Risk' | 'Default Risk';
  calculatedAt: string;
}

// Cash Flow Forecasting Types  
export interface CashFlowForecastInput {
  receivables: ClimateReceivableTable[];
  forecastHorizonDays: number;
  scenarioType: 'optimistic' | 'realistic' | 'pessimistic';
}

export interface CashFlowProjection {
  month: string;
  projectedAmount: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
}

export interface CashFlowForecastResult {
  projections: CashFlowProjection[];
  totalProjectedValue: number;
  averageConfidence: number;
  methodology: string;
  createdAt: string;
}

// Alert System Types
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertCategory = 'risk_threshold' | 'payment_overdue' | 'compliance_issue' | 'system_error';

export interface ClimateAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertTrigger {
  condition: string;
  threshold: number;
  comparisonOperator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  enabled: boolean;
}

// Orchestrator Types
export interface BatchOperationStatus {
  operationId: string;
  type: 'risk_calculation' | 'cash_flow_forecast' | 'nav_calculation' | 'compliance_check';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: Record<string, any>;
}

export interface ServiceConfig {
  riskCalculation: {
    enabled: boolean;
    batchSize: number;
    timeoutMs: number;
  };
  cashFlowForecasting: {
    enabled: boolean;
    defaultHorizonDays: number;
    refreshIntervalHours: number;
  };
  alerting: {
    enabled: boolean;
    emailNotifications: boolean;
    webhookUrl?: string;
  };
}

// Production Analytics Types
export interface ProductionDataPoint {
  date: string;
  productionDate?: string;  // Alias for compatibility
  outputMwh: number;
  efficiency: number;
  weatherConditions: {
    temperature: number;
    sunlightHours: number;
    windSpeed: number;
  };
}

export interface ProductionAnalytics {
  assetId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  averageOutput: number;
  outputVariance: number;
  efficiencyTrend: 'increasing' | 'stable' | 'decreasing';
  seasonalFactors: Record<string, number>;
  predictiveModel?: string;
}

// Enhanced types for the business logic services
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Type aliases for hook compatibility
export type EnhancedRiskAssessmentResult = ClimateRiskAssessmentResult;
export type ClimateRiskLevel = AlertSeverity;
export type AlertItem = ClimateAlert;
