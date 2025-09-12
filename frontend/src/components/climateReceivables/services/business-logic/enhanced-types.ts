/**
 * Enhanced Types for Climate Receivables Business Logic Services
 * 
 * These types align with the actual database schema and provide
 * proper interfaces for the business logic services.
 */

import type { Tables, InsertTables, UpdateTables } from '@/types/core/database';

// === CORE DATABASE TABLE TYPES ===
export type ClimateReceivableTable = Tables<'climate_receivables'>;
export type EnergyAssetTable = Tables<'energy_assets'>;
export type ClimatePayerTable = Tables<'climate_payers'>;
export type ClimateIncentiveTable = Tables<'climate_incentives'>;
export type ProductionDataTable = Tables<'production_data'>;
export type RenewableEnergyCreditTable = Tables<'renewable_energy_credits'>;
export type ClimateRiskCalculationTable = Tables<'climate_risk_calculations'>;
export type ClimateCashFlowProjectionTable = Tables<'climate_cash_flow_projections'>;

// === INSERT/UPDATE TYPES ===
export type ClimateReceivableInsert = InsertTables<'climate_receivables'>;
export type ClimateReceivableUpdate = UpdateTables<'climate_receivables'>;
export type ClimateRiskCalculationInsert = InsertTables<'climate_risk_calculations'>;
export type ClimateCashFlowProjectionInsert = InsertTables<'climate_cash_flow_projections'>;

// === ENHANCED DOMAIN MODELS ===

/**
 * Enhanced Climate Receivable with proper relations
 */
export interface EnhancedClimateReceivable extends ClimateReceivableTable {
  asset?: EnergyAssetTable;
  payer?: ClimatePayerTable;
  riskCalculations?: ClimateRiskCalculationTable[];
  incentives?: ClimateIncentiveTable[];
}

/**
 * Enhanced Energy Asset with production data
 */
export interface EnhancedEnergyAsset extends EnergyAssetTable {
  productionData?: ProductionDataTable[];
  receivables?: ClimateReceivableTable[];
  averageMonthlyOutput?: number;
  lastProductionDate?: string;
  efficiencyRating?: number;
}

/**
 * Risk Level Enum aligned with database constraint
 * Database constraint supports: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Enhanced Risk Assessment Result
 */
export interface EnhancedRiskAssessmentResult {
  receivableId: string;
  calculatedAt: string;
  riskComponents: {
    productionRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastWeatherUpdate: string;
    };
    creditRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastCreditUpdate: string;
    };
    policyRisk: {
      score: number;
      factors: string[];
      confidence: number;
      lastPolicyUpdate: string;
    };
  };
  compositeRisk: {
    score: number;
    level: RiskLevel;
    confidence: number;
  };
  discountRate: {
    calculated: number;
    previous: number | null;
    change: number | null;
    reason: string;
  };
  recommendations: string[];
  alerts: AlertItem[];
  nextReviewDate: string;
  projectId?: string;
}

/**
 * Enhanced Alert Interface for UI Components
 * Extends basic database Alert with UI-required properties
 */
export interface Alert {
  id: string;
  receivableId: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'risk_change' | 'policy_update' | 'credit_alert' | 'production_issue' | 'general';
  acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
  updated_at?: string;
  recommendations?: string[];
  metadata?: Record<string, any>;
}

/**
 * Alert Statistics for Dashboard
 */
export interface AlertStatistics {
  total: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
  unacknowledged: number;
  averageResolutionTime: number;
  trends: {
    weeklyChange: number;
    monthlyChange: number;
  };
}

/**
 * Alert Item structure (legacy, used in risk calculations)
 */
export interface AlertItem {
  level: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
  timestamp?: string;
}

/**
 * Cash Flow Forecast aligned with database projections
 */
export interface EnhancedCashFlowForecast {
  projectionId: string;
  startDate: string;
  endDate: string;
  projections: ClimateCashFlowProjectionTable[];
  monthlyBreakdown: MonthlyForecastBreakdown[];
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  confidence: number;
  keyRisks: string[];
  recommendations: string[];
}

/**
 * Monthly forecast breakdown
 */
export interface MonthlyForecastBreakdown {
  month: string; // YYYY-MM format
  receivables: number;
  incentives: number;
  productionRevenue: number;
  recSales: number;
  carbonOffsets: number;
  total: number;
  confidence: number;
}

/**
 * External API Integration Results
 */
export interface WeatherDataResult {
  location: string;
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  sunlightHours: number;
  cloudCover: number;
  forecast: WeatherForecastItem[];
}

export interface WeatherForecastItem {
  date: string;
  temperature: number;
  windSpeed: number;
  sunlightHours: number;
  cloudCover: number;
  precipitationChance: number;
}

/**
 * Credit Rating Result from external API
 */
export interface CreditRatingResult {
  payerId: string;
  creditScore: number;
  rating: string;
  outlook: 'Positive' | 'Stable' | 'Negative' | 'Developing';
  lastUpdated: string;
  paymentHistory: {
    onTimeRate: number;
    defaultEvents: number;
    averagePaymentDelay: number;
  };
  financialMetrics: {
    debtToEquity?: number;
    liquidityRatio?: number;
    profitMargin?: number;
  };
}

/**
 * Regulatory News Impact
 */
export interface RegulatoryNewsResult {
  articles: RegulatoryArticle[];
  summary: {
    criticalCount: number;
    highImpactCount: number;
    mediumImpactCount: number;
    overallImpact: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface RegulatoryArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  relevantKeywords: string[];
  affectedSectors: string[];
}

/**
 * System Health Status for Orchestrator
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    database: ServiceStatus;
    externalAPIs: ServiceStatus;
    riskCalculation: ServiceStatus;
    alertSystem: ServiceStatus;
    cashFlowForecasting: ServiceStatus;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  lastChecked: string;
}

export interface ServiceStatus {
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  errorCount: number;
  averageResponseTime: number;
}

/**
 * Orchestration Result
 */
export interface OrchestrationResult {
  executionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  operations: {
    dataRefresh: OperationResult;
    riskCalculations: OperationResult;
    forecastUpdates: OperationResult;
    alertProcessing: OperationResult;
  };
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface OperationResult {
  success: boolean;
  duration: number;
  recordsProcessed: number;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * Risk Calculation Statistics
 */
export interface RiskCalculationStatistics {
  totalCalculations: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  lastCalculationTime: string;
  calculationFrequency: number;
  accuracy: number;
  trends: {
    risksIncreasing: boolean;
    averageChange: number;
    volatility: number;
  };
}
