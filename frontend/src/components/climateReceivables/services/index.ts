import { productionDataService } from './productionDataService';
import { climateReceivablesService } from './climateReceivablesService';
import { incentivesService } from './incentivesService';
import { recsService } from './recsService';
import { tokenizationPoolsService } from './tokenizationPoolsService';
import { energyAssetsService } from './energyAssetsService';
import { enhancedEnergyAssetsService } from './enhancedEnergyAssetsService';
import { CarbonOffsetsService } from './carbonOffsetsService';
import { climatePayersService } from './climatePayersService';
import { WeatherDataService, CarbonMarketPriceService } from './api';

// New CRUD Services
import { ClimateIncentivesService } from './climateIncentivesService';

// Configuration Service
import { ClimateConfigurationService } from './climateConfigurationService';

// REC-Incentive Synchronization Services
import { RECIncentiveOrchestrator } from '@/services/climateReceivables/rec-incentive-orchestrator';
import { enhancedRECService, enhancedIncentiveService } from './enhanced-rec-incentive-service';

// Enhanced Business Logic Services (using consolidated climate NAV types)
// Export all services from the migrated climateReceivables services directory
export * from '@/services/climateReceivables';

export {
  productionDataService,
  climateReceivablesService,
  incentivesService,
  recsService,
  tokenizationPoolsService,
  energyAssetsService,
  enhancedEnergyAssetsService,
  CarbonOffsetsService,
  climatePayersService,
  WeatherDataService,
  CarbonMarketPriceService,
  // New CRUD Services
  ClimateIncentivesService,
  // Configuration Service
  ClimateConfigurationService,
  // REC-Incentive Synchronization Services
  RECIncentiveOrchestrator,
  enhancedRECService,
  enhancedIncentiveService
};
