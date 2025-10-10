/**
 * Chain Configuration Module
 * Central export point for all chain-related configurations
 */

export * from './enhancedChainConfig';

// Re-export the main functions for convenience
export { 
  ENHANCED_CHAIN_CONFIGS,
  getAllChains,
  getChainConfig,
  getChainEnvironments,
  getChainEnvironment,
  getChainTestnets,
  getChainMainnet,
  isEnvironmentAvailable,
  getBalanceServiceKey,
  getExplorerUrl,
  formatChainEnvironment,
  resolveChainAndEnvironment
} from './enhancedChainConfig';

// Export types
export type { 
  NetworkEnvironment, 
  ChainConfig 
} from './enhancedChainConfig';
