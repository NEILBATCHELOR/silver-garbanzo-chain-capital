/**
 * Cosmos Ecosystem Services
 * Comprehensive exports for all Cosmos SDK functionality
 */

// Core Ecosystem Service
export { 
  CosmosEcosystemService, 
  cosmosEcosystemService 
} from './CosmosEcosystemService';

// Re-export types
export type {
  CosmosChainConfig,
  IBCTransferParams,
  StakingParams,
  GovernanceVoteParams,
  LiquidStakingParams,
  CrossChainSwapParams,
  SwapRoute,
  ValidatorInfo,
  ProposalInfo
} from './CosmosEcosystemService';

// Export service collection
export const cosmosServices = {
  ecosystem: () => import('./CosmosEcosystemService').then(m => m.cosmosEcosystemService),
};
