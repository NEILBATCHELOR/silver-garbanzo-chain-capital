/**
 * Cosmos Balance Services
 * 
 * Exports balance services for Cosmos ecosystem chains
 */

// Cosmos Hub
export { CosmosBalanceService, cosmosBalanceService } from './CosmosBalanceService';

// Osmosis DEX
export { OsmosisBalanceService, osmosisBalanceService } from './OsmosisBalanceService';

// Export all services as a collection
export const cosmosBalanceServices = {
  cosmos: () => import('./CosmosBalanceService').then(m => m.cosmosBalanceService),
  osmosis: () => import('./OsmosisBalanceService').then(m => m.osmosisBalanceService),
};
