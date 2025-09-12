// Climate Receivables API Services
// Enhanced with FREE API integrations and batch processing

import { WeatherDataService } from './weather-data-service';
import { EnhancedFreeWeatherService } from './enhanced-free-weather-service';
import { CarbonMarketPriceService } from './carbon-market-price-service';
import { CreditMonitoringService } from './credit-monitoring-service';
import { PolicyRiskTrackingService } from './policy-risk-tracking-service';
import { ClimateReportGenerator } from './climate-report-generator';

// Enhanced External API Integration Services
import { EnhancedExternalAPIService } from './enhanced-external-api-service';
import { ExternalAPIIntegrationService } from './external-api-integration-service';
import { ExternalMarketDataAPIService } from './external-market-data-api-service';

export {
  // Core Weather Services (Enhanced with FREE APIs)
  WeatherDataService,
  EnhancedFreeWeatherService,
  
  // Policy and Risk Services
  PolicyRiskTrackingService,
  CreditMonitoringService,
  
  // Market Data Services
  CarbonMarketPriceService,
  ExternalMarketDataAPIService,
  
  // Report Generation (Phase 2: In-Platform Reports)
  ClimateReportGenerator,
  
  // Enhanced External API Services
  EnhancedExternalAPIService,
  ExternalAPIIntegrationService
};