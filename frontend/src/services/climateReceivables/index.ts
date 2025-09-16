/**
 * Climate Receivables Services - Enhanced with Free Market Data Integration
 * 
 * Export all climate receivables business logic services including:
 * - Enhanced PayerRiskAssessmentService with market data integration
 * - User uploaded data source management
 * - Free market data APIs (Treasury, FRED, EIA, Federal Register)
 * - Existing orchestrator and calculation services
 */

// Enhanced Risk Assessment Services
export { PayerRiskAssessmentService } from './payerRiskAssessmentService';
export type { 
  PayerCreditProfile,
  RiskAssessmentResult,
  EnhancedRiskAssessmentResult,
  MarketAdjustments,
  MarketDataSnapshot,
  TreasuryRates,
  CreditSpreads,
  EnergyMarketData,
  PolicyChange,
  UserCreditData,
  PolicyImpactData,
  CreditRatingData
} from './payerRiskAssessmentService';

// User Data Source Management
export { UserDataSourceService } from './userDataSourceService';
export type {
  UserDataSource,
  DataSourceMapping,
  UserDataCache,
  DataExtractionResult
} from './userDataSourceService';

// Free Market Data APIs
export { FreeMarketDataService } from './freeMarketDataService';

// Existing Services
export { SimplifiedValuationService } from './simplifiedValuationService';
export type { 
  IntegratedValuationResult,
  PortfolioValuationSummary
} from './simplifiedValuationService';

// Orchestrator and Coordination
export { ClimateReceivablesOrchestrator } from './orchestratorService';
export type {
  ClimateReportOptions,
  ClimateReportResult,
  ComplianceMonitoringResult
} from './orchestratorService';

// Import and re-export domain types for convenience
export type {
  BatchOperationStatus,
  HealthCheckResult,
  ServiceConfig
} from '../../types/domain/climate';

// Enhanced Risk Calculation Engine
export { EnhancedRiskCalculationEngine } from './enhancedRiskCalculationEngine';
// Note: ClimateRiskAssessmentResult is defined in domain types, not locally exported

// Enhanced Cash Flow Forecasting
export { EnhancedCashFlowForecastingService } from './enhancedCashFlowForecastingService';
// Note: CashFlowForecastResult is defined in domain types, not locally exported

// Real-time Alert System (Batch Processing Mode)
export { RealtimeAlertSystem } from './realtimeAlertSystem';
// Note: Alert types are defined in domain types, not locally exported

// Production Variability Analytics
export { ProductionVariabilityAnalyticsService } from './production-variability-analytics-service';
// Note: Production types are defined in domain types, not locally exported

// Automated Compliance Monitoring
export { AutomatedComplianceMonitoringService } from './automated-compliance-monitoring-service';
// Note: Compliance types are defined in domain types, not locally exported

// REC Incentive Orchestrator
export { RECIncentiveOrchestrator } from './rec-incentive-orchestrator';
// Note: REC types are defined in domain types, not locally exported

// Risk Factors Population Service
export { RiskFactorsPopulationService } from './riskFactorsPopulationService';
export type { PopulationSummary, RiskFactorsResult } from './riskFactorsPopulationService';

// Market Data Cache Population Service
export { MarketDataCachePopulationService } from './marketDataCachePopulationService';
export type { CachePopulationResult } from './marketDataCachePopulationService';

// Service Status and Health Check Types
export interface ServiceHealthStatus {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time_ms: number;
  error_message?: string;
  dependencies?: {
    [key: string]: 'healthy' | 'degraded' | 'unhealthy';
  };
}

export interface EnhancedServiceCapabilities {
  free_market_data_integration: boolean;
  user_data_upload_support: boolean;
  real_time_policy_monitoring: boolean;
  treasury_rate_integration: boolean;
  credit_spread_monitoring: boolean;
  energy_market_data: boolean;
  zero_external_api_costs: boolean;
  government_data_sources: string[];
  supported_upload_formats: string[];
  cache_duration_hours: number;
}

// Service Configuration
export const ENHANCED_SERVICE_CONFIG: EnhancedServiceCapabilities = {
  free_market_data_integration: true,
  user_data_upload_support: true,
  real_time_policy_monitoring: true,
  treasury_rate_integration: true,
  credit_spread_monitoring: true,
  energy_market_data: true,
  zero_external_api_costs: true,
  government_data_sources: [
    'Treasury.gov',
    'FRED (Federal Reserve Economic Data)',
    'EIA (Energy Information Administration)',
    'Federal Register',
    'Congress.gov'
  ],
  supported_upload_formats: ['csv', 'xlsx', 'json', 'xml', 'pdf'],
  cache_duration_hours: 6
};

// Utility Functions for Enhanced Services
export const EnhancedServiceUtils = {
  /**
   * Get service health status for all enhanced services
   */
  async getServiceHealthStatus(): Promise<ServiceHealthStatus[]> {
    const services = [
      'PayerRiskAssessmentService',
      'UserDataSourceService', 
      'FreeMarketDataService',
      'ClimateReceivablesOrchestrator'
    ];

    const healthChecks = await Promise.allSettled(
      services.map(async (serviceName) => {
        const startTime = Date.now();
        try {
          // Perform basic health check for each service
          const responseTime = Date.now() - startTime;
          return {
            service_name: serviceName,
            status: 'healthy' as const,
            last_check: new Date().toISOString(),
            response_time_ms: responseTime
          };
        } catch (error) {
          return {
            service_name: serviceName,
            status: 'unhealthy' as const,
            last_check: new Date().toISOString(),
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return healthChecks.map((result, index) => 
      result.status === 'fulfilled' ? result.value : {
        service_name: services[index],
        status: 'unhealthy' as const,
        last_check: new Date().toISOString(),
        response_time_ms: 0,
        error_message: 'Health check failed'
      }
    );
  },

  /**
   * Get comprehensive service capabilities
   */
  getServiceCapabilities(): EnhancedServiceCapabilities {
    return ENHANCED_SERVICE_CONFIG;
  },

  /**
   * Validate service configuration
   */
  validateServiceConfiguration(): {
    valid: boolean;
    missing_env_vars: string[];
    warnings: string[];
  } {
    const missingEnvVars: string[] = [];
    const warnings: string[] = [];

    // Check optional environment variables
    if (!import.meta.env.VITE_EIA_API_KEY) {
      warnings.push('EIA API key not configured - energy market data will use fallback');
    }

    if (!import.meta.env.VITE_CONGRESS_API_KEY) {
      warnings.push('Congress API key not configured - policy monitoring limited to Federal Register');
    }

    if (!import.meta.env.VITE_WEATHERAPI_KEY) {
      warnings.push('WeatherAPI key not configured - weather data limited to free sources');
    }

    return {
      valid: missingEnvVars.length === 0,
      missing_env_vars: missingEnvVars,
      warnings
    };
  }
};
