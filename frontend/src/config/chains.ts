/**
 * Chain configuration and utilities
 * Centralized management of blockchain network configurations
 */

import type { Address } from '@solana/kit';
import { getRpcUrl } from '@/infrastructure/web3/rpc/rpc-config';

/**
 * Network environment type
 */
export type NetworkEnvironment = 'mainnet' | 'testnet';

/**
 * Chain configuration interface
 */
export interface ChainConfig {
  id: string | number;
  name: string;
  displayName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: string;
  isTestnet?: boolean;
  isNonEvm?: boolean;
  cosmosChainId?: string; // For Cosmos-based chains like Injective
}

/**
 * Chain environment configuration
 */
export interface ChainEnvironmentConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  net?: string; // For non-EVM networks
}

/**
 * Environment option for UI selection
 */
export interface EnvironmentOption {
  name: NetworkEnvironment;
  displayName: string;
  isTestnet: boolean;
  chainId?: string;
  net: string; // Network identifier (e.g., 'testnet', 'mainnet', 'amoy')
}

/**
 * Resolve chain and environment from a chain ID or network identifier
 */
export interface ResolvedChainEnvironment {
  network: string;
  environment: NetworkEnvironment;
  chainId?: string;
  nonEvmNetwork?: string;
}

/**
 * Supported chains configuration
 * Maps network names to their configurations
 */
export const chains: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io',
  },
  sepolia: {
    id: 11155111,
    name: 'sepolia',
    displayName: 'Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  holesky: {
    id: 17000,
    name: 'holesky',
    displayName: 'Holesky Testnet',
    rpcUrl: import.meta.env.VITE_HOLESKY_RPC_URL || 'https://ethereum-holesky-rpc.publicnode.com',
    nativeCurrency: { name: 'Holesky Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://holesky.etherscan.io',
    isTestnet: true,
  },
  polygon: {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com',
  },
  amoy: {
    id: 80002,
    name: 'amoy',
    displayName: 'Polygon Amoy Testnet',
    rpcUrl: import.meta.env.VITE_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://amoy.polygonscan.com',
    isTestnet: true,
  },
  arbitrum: {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum',
    rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io',
  },
  'arbitrum-sepolia': {
    id: 421614,
    name: 'arbitrum-sepolia',
    displayName: 'Arbitrum Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.arbiscan.io',
    isTestnet: true,
  },
  avalanche: {
    id: 43114,
    name: 'avalanche',
    displayName: 'Avalanche',
    rpcUrl: import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorer: 'https://snowtrace.io',
  },
  'avalanche-testnet': {
    id: 43113,
    name: 'avalanche-testnet',
    displayName: 'Avalanche Fuji Testnet',
    rpcUrl: import.meta.env.VITE_AVALANCHE_TESTNET_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorer: 'https://testnet.snowtrace.io',
    isTestnet: true,
  },
  optimism: {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  'optimism-sepolia': {
    id: 11155420,
    name: 'optimism-sepolia',
    displayName: 'Optimism Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    isTestnet: true,
  },
  base: {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    rpcUrl: import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org',
  },
  'base-sepolia': {
    id: 84532,
    name: 'base-sepolia',
    displayName: 'Base Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
  bsc: {
    id: 56,
    name: 'bsc',
    displayName: 'BNB Smart Chain',
    rpcUrl: import.meta.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorer: 'https://bscscan.com',
  },
  'bsc-testnet': {
    id: 97,
    name: 'bsc-testnet',
    displayName: 'BNB Smart Chain Testnet',
    rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorer: 'https://testnet.bscscan.com',
    isTestnet: true,
  },
  zksync: {
    id: 324,
    name: 'zksync',
    displayName: 'zkSync',
    rpcUrl: import.meta.env.VITE_ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://explorer.zksync.io',
  },
  'zksync-sepolia': {
    id: 300,
    name: 'zksync-sepolia',
    displayName: 'zkSync Era Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_ZKSYNC_SEPOLIA_RPC_URL || 'https://sepolia.era.zksync.dev',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.explorer.zksync.io',
    isTestnet: true,
  },
  hoodi: {
    id: 560048,
    name: 'hoodi',
    displayName: 'Hoodi Testnet',
    rpcUrl: import.meta.env.VITE_HOODI_RPC_URL || 'https://rpc.hoodi.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://explorer.hoodi.io',
    isTestnet: true,
  },
  injective: {
    id: 'injective-1', // Cosmos chain ID
    name: 'injective',
    displayName: 'Injective',
    rpcUrl: import.meta.env.VITE_INJECTIVE_RPC_URL || 'https://sentry.tm.injective.network:443',
    nativeCurrency: { name: 'INJ', symbol: 'INJ', decimals: 18 },
    blockExplorer: 'https://explorer.injective.network',
    isNonEvm: true,
    cosmosChainId: 'injective-1',
  },
  'injective-testnet': {
    id: 'injective-888', // Cosmos chain ID
    name: 'injective-testnet',
    displayName: 'Injective Testnet',
    rpcUrl: import.meta.env.VITE_INJECTIVE_TESTNET_RPC_URL || 'https://testnet.sentry.tm.injective.network:443',
    nativeCurrency: { name: 'INJ', symbol: 'INJ', decimals: 18 },
    blockExplorer: 'https://testnet.explorer.injective.network',
    isTestnet: true,
    isNonEvm: true,
    cosmosChainId: 'injective-888',
  },
  'injective-evm': {
    id: 1776, // EVM chain ID
    name: 'injective-evm',
    displayName: 'Injective EVM',
    rpcUrl: import.meta.env.VITE_INJECTIVE_EVM_RPC_URL || 'https://mainnet.json-rpc.injective.network',
    nativeCurrency: { name: 'INJ', symbol: 'INJ', decimals: 18 },
    blockExplorer: 'https://explorer.injective.network',
  },
  'injective-evm-testnet': {
    id: 1439, // EVM chain ID
    name: 'injective-evm-testnet',
    displayName: 'Injective EVM Testnet',
    rpcUrl: import.meta.env.VITE_INJECTIVE_EVM_TESTNET_RPC_URL || 'https://testnet.json-rpc.injective.network',
    nativeCurrency: { name: 'INJ', symbol: 'INJ', decimals: 18 },
    blockExplorer: 'https://testnet.explorer.injective.network',
    isTestnet: true,
  },
  // Non-EVM networks
  bitcoin: {
    id: 'bitcoin',
    name: 'bitcoin',
    displayName: 'Bitcoin',
    rpcUrl: '',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    blockExplorer: 'https://blockchain.info',
    isNonEvm: true,
  },
  'bitcoin-testnet': {
    id: 'bitcoin-testnet',
    name: 'bitcoin-testnet',
    displayName: 'Bitcoin Testnet',
    rpcUrl: '',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    blockExplorer: 'https://blockstream.info/testnet',
    isTestnet: true,
    isNonEvm: true,
  },
  solana: {
    id: 'solana',
    name: 'solana',
    displayName: 'Solana',
    rpcUrl: getRpcUrl('solana', 'mainnet'),
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com',
    isNonEvm: true,
  },
  'solana-devnet': {
    id: 'solana-devnet',
    name: 'solana-devnet',
    displayName: 'Solana Devnet',
    rpcUrl: getRpcUrl('solana', 'devnet'),
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com?cluster=devnet',
    isTestnet: true,
    isNonEvm: true,
  },
  'solana-testnet': {
    id: 'solana-testnet',
    name: 'solana-testnet',
    displayName: 'Solana Testnet',
    rpcUrl: getRpcUrl('solana', 'testnet'),
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com?cluster=testnet',
    isTestnet: true,
    isNonEvm: true,
  },
  ripple: {
    id: 'ripple',
    name: 'ripple',
    displayName: 'XRPL',
    rpcUrl: 'https://s1.ripple.com:51234/',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 6 },
    blockExplorer: 'https://livenet.xrpl.org',
    isNonEvm: true,
  },
  'ripple-testnet': {
    id: 'ripple-testnet',
    name: 'ripple-testnet',
    displayName: 'XRPL Testnet',
    rpcUrl: 'https://s.altnet.rippletest.net:51234/',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 6 },
    blockExplorer: 'https://testnet.xrpl.org',
    isTestnet: true,
    isNonEvm: true,
  },
  'ripple-devnet': {
    id: 'ripple-devnet',
    name: 'ripple-devnet',
    displayName: 'XRPL Devnet',
    rpcUrl: 'https://s.devnet.rippletest.net:51234/',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 6 },
    blockExplorer: 'https://devnet.xrpl.org',
    isTestnet: true,
    isNonEvm: true,
  },
  'xrpl-evm': {
    id: 1440,
    name: 'xrpl-evm',
    displayName: 'XRPL EVM',
    rpcUrl: import.meta.env.VITE_XRPL_EVM_RPC_URL || 'https://rpc-evm-sidechain.xrpl.org',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 18 },
    blockExplorer: 'https://explorer.xrpl.org',
  },
  'xrpl-evm-testnet': {
    id: 1441,
    name: 'xrpl-evm-testnet',
    displayName: 'XRPL EVM Devnet',
    rpcUrl: import.meta.env.VITE_XRPL_EVM_TESTNET_RPC_URL || 'https://rpc-evm-sidechain.peersyst.tech',
    nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 18 },
    blockExplorer: 'https://explorer.xrpl-devnet.peersyst.tech',
    isTestnet: true,
  },
};

/**
 * Get chain configuration by name or ID
 */
export function getChainConfig(networkOrId: string | number): ChainConfig | undefined {
  // If it's a number or numeric string, search by ID
  const numericId = typeof networkOrId === 'number' ? networkOrId : parseInt(networkOrId);
  if (!isNaN(numericId)) {
    return Object.values(chains).find(c => c.id === numericId);
  }
  
  // Otherwise search by name (case-insensitive)
  const normalizedNetwork = String(networkOrId).toLowerCase();
  return chains[normalizedNetwork] || Object.values(chains).find(
    c => c.name.toLowerCase() === normalizedNetwork
  );
}

/**
 * Get chain environment configuration
 */
export function getChainEnvironment(
  network: string,
  environment: 'mainnet' | 'testnet' = 'testnet'
): ChainEnvironmentConfig | null {
  const normalizedNetwork = network.toLowerCase();
  
  // For testnets, try network-testnet variant first
  if (environment === 'testnet') {
    const testnetKey = `${normalizedNetwork}-testnet`;
    const testnetConfig = chains[testnetKey];
    if (testnetConfig) {
      return {
        chainId: String(testnetConfig.id),
        name: environment,
        rpcUrl: testnetConfig.rpcUrl,
        net: testnetConfig.isNonEvm ? normalizedNetwork : undefined,
      };
    }
    
    // Special cases for networks where testnet has different naming
    if (normalizedNetwork === 'polygon') {
      const amoyConfig = chains['amoy'];
      return {
        chainId: String(amoyConfig.id),
        name: environment,
        rpcUrl: amoyConfig.rpcUrl,
      };
    }
  }
  
  // For mainnet or if testnet variant doesn't exist
  const mainnetConfig = chains[normalizedNetwork];
  if (mainnetConfig && (environment === 'mainnet' || !mainnetConfig.isTestnet)) {
    return {
      chainId: String(mainnetConfig.id),
      name: environment,
      rpcUrl: mainnetConfig.rpcUrl,
      net: mainnetConfig.isNonEvm ? normalizedNetwork : undefined,
    };
  }
  
  return null;
}

/**
 * Resolve chain and environment from a chain ID or network identifier
 */
export function resolveChainAndEnvironment(chainIdOrNetwork: string): ResolvedChainEnvironment | null {
  // Try to parse as numeric chain ID
  const numericChainId = parseInt(chainIdOrNetwork, 10);
  if (!isNaN(numericChainId)) {
    const config = getChainConfig(numericChainId);
    if (config) {
      return {
        network: config.name.toLowerCase(),
        environment: config.isTestnet ? 'testnet' : 'mainnet',
        chainId: String(config.id),
        nonEvmNetwork: config.isNonEvm ? config.name.toLowerCase() : undefined,
      };
    }
  }
  
  // Try as Cosmos chain ID format (e.g., 'injective-888')
  if (chainIdOrNetwork.includes('-')) {
    const config = Object.values(chains).find(c => c.cosmosChainId === chainIdOrNetwork);
    if (config) {
      return {
        network: config.name.toLowerCase(),
        environment: config.isTestnet ? 'testnet' : 'mainnet',
        chainId: chainIdOrNetwork,
        nonEvmNetwork: config.isNonEvm ? config.name.toLowerCase().replace('-testnet', '') : undefined,
      };
    }
  }
  
  // Try as network name
  const config = getChainConfig(chainIdOrNetwork);
  if (config) {
    return {
      network: config.name.toLowerCase(),
      environment: config.isTestnet ? 'testnet' : 'mainnet',
      chainId: config.isNonEvm ? undefined : String(config.id),
      nonEvmNetwork: config.isNonEvm ? config.name.toLowerCase().replace('-testnet', '') : undefined,
    };
  }
  
  return null;
}

/**
 * Get explorer URL for a transaction, address, or token
 */
export function getExplorerUrl(
  networkOrChainId: string | number,
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const config = getChainConfig(networkOrChainId);
  if (!config?.blockExplorer) {
    return '#';
  }
  
  const base = config.blockExplorer;
  switch (type) {
    case 'tx':
      return `${base}/tx/${value}`;
    case 'address':
      return `${base}/address/${value}`;
    case 'token':
      return `${base}/token/${value}`;
    default:
      return base;
  }
}

/**
 * Check if a network is non-EVM
 */
export function isNonEvmNetwork(network: string): boolean {
  const config = getChainConfig(network);
  return config?.isNonEvm === true;
}

/**
 * Derive wallet type from chain ID, non-EVM network, or wallet_type column
 * FIXED: Now checks wallet_type as a fallback
 */
export function deriveWalletType(
  chainId?: string | null, 
  nonEvmNetwork?: string | null,
  walletType?: string | null
): string {
  // First check non-EVM network
  if (nonEvmNetwork) {
    return nonEvmNetwork.toLowerCase();
  }
  
  // Then check chain ID
  if (chainId) {
    const resolved = resolveChainAndEnvironment(chainId);
    return resolved?.network || 'unknown';
  }
  
  // NEW: Check wallet_type column as fallback
  if (walletType) {
    return walletType.toLowerCase();
  }
  
  return 'unknown';
}

/**
 * Get network environment (mainnet/testnet) from chain ID
 */
export function getNetworkEnvironment(chainId: string): 'mainnet' | 'testnet' {
  const chainIdNum = parseInt(chainId, 10);
  return isTestnetUtil(chainIdNum) ? 'testnet' : 'mainnet';
}

/**
 * Check if a chain ID is a testnet (utility function)
 */
function isTestnetUtil(chainId: number): boolean {
  const testnetChainIds = [
    11155111, // Sepolia
    17000,    // Holesky
    80002,    // Amoy
    421614,   // Arbitrum Sepolia
    43113,    // Avalanche Fuji
    11155420, // Optimism Sepolia
    84532,    // Base Sepolia
    97,       // BSC Testnet
    300,      // zkSync Sepolia
    560048,   // Hoodi Testnet
    1439,     // Injective EVM Testnet
  ];
  return testnetChainIds.includes(chainId);
}

/**
 * Get all chain configurations
 */
export function getAllChains(): ChainConfig[] {
  return Object.values(chains);
}

/**
 * Get unique base networks (filters out testnet/devnet variants)
 * Returns only one entry per network family (e.g., just "Ethereum" not "Ethereum", "Sepolia", "Holesky")
 */
export function getUniqueNetworks(): ChainConfig[] {
  const seen = new Set<string>();
  const uniqueNetworks: ChainConfig[] = [];
  
  // Define network families and their base network
  const networkFamilies: Record<string, string> = {
    'ethereum': 'ethereum',
    'sepolia': 'ethereum',
    'holesky': 'ethereum',
    'polygon': 'polygon',
    'amoy': 'polygon',
    'arbitrum': 'arbitrum',
    'arbitrum-sepolia': 'arbitrum',
    'avalanche': 'avalanche',
    'avalanche-testnet': 'avalanche',
    'optimism': 'optimism',
    'optimism-sepolia': 'optimism',
    'base': 'base',
    'base-sepolia': 'base',
    'bsc': 'bsc',
    'bsc-testnet': 'bsc',
    'zksync': 'zksync',
    'zksync-sepolia': 'zksync',
    'hoodi': 'hoodi',
    'injective': 'injective',
    'injective-testnet': 'injective',
    'injective-evm': 'injective-evm',
    'injective-evm-testnet': 'injective-evm',
    'bitcoin': 'bitcoin',
    'bitcoin-testnet': 'bitcoin',
    'solana': 'solana',
    'solana-devnet': 'solana',
    'solana-testnet': 'solana',
    'ripple': 'ripple',
    'ripple-testnet': 'ripple',
    'ripple-devnet': 'ripple',
    'xrpl-evm': 'xrpl-evm',
    'xrpl-evm-testnet': 'xrpl-evm',
  };
  
  // Preferred display order
  const preferredOrder = [
    'ethereum', 'polygon', 'arbitrum', 'avalanche', 'optimism', 'base', 'bsc', 
    'zksync', 'hoodi', 'injective', 'injective-evm', 'solana', 'ripple', 'xrpl-evm', 'bitcoin'
  ];
  
  // Get one representative config per network family (prefer mainnet)
  for (const baseNetwork of preferredOrder) {
    // First try mainnet
    const mainnetConfig = chains[baseNetwork];
    if (mainnetConfig && !seen.has(baseNetwork)) {
      uniqueNetworks.push(mainnetConfig);
      seen.add(baseNetwork);
    }
  }
  
  return uniqueNetworks;
}

/**
 * Get available environments for a network
 * Returns array of environment options with display info
 */
export function getChainEnvironments(network: string): EnvironmentOption[] {
  const normalizedNetwork = network.toLowerCase();
  const environments: EnvironmentOption[] = [];
  
  // Check for mainnet
  const mainnetConfig = chains[normalizedNetwork];
  if (mainnetConfig && !mainnetConfig.isTestnet) {
    environments.push({
      name: 'mainnet',
      displayName: mainnetConfig.displayName,
      isTestnet: false,
      chainId: String(mainnetConfig.id),
      net: normalizedNetwork
    });
  }
  
  // Check for testnet
  const testnetKey = normalizedNetwork + '-testnet';
  const testnetConfig = chains[testnetKey];
  if (testnetConfig?.isTestnet) {
    environments.push({
      name: 'testnet',
      displayName: testnetConfig.displayName,
      isTestnet: true,
      chainId: String(testnetConfig.id),
      net: testnetKey
    });
  }
  
  // Check for devnet
  const devnetKey = normalizedNetwork + '-devnet';
  const devnetConfig = chains[devnetKey];
  if (devnetConfig?.isTestnet) {
    environments.push({
      name: 'testnet',
      displayName: devnetConfig.displayName,
      isTestnet: true,
      chainId: String(devnetConfig.id),
      net: devnetKey
    });
  }
  
  // Special cases for networks with different naming
  if (normalizedNetwork === 'polygon') {
    const amoyConfig = chains['amoy'];
    if (amoyConfig && !environments.some(e => e.isTestnet)) {
      environments.push({
        name: 'testnet',
        displayName: amoyConfig.displayName,
        isTestnet: true,
        chainId: String(amoyConfig.id),
        net: 'amoy'
      });
    }
  }
  
  if (normalizedNetwork === 'ethereum') {
    const sepoliaConfig = chains['sepolia'];
    const holeskyConfig = chains['holesky'];
    
    if (sepoliaConfig && !environments.some(e => e.net === 'sepolia')) {
      environments.push({
        name: 'testnet',
        displayName: sepoliaConfig.displayName,
        isTestnet: true,
        chainId: String(sepoliaConfig.id),
        net: 'sepolia'
      });
    }
    
    if (holeskyConfig && !environments.some(e => e.net === 'holesky')) {
      environments.push({
        name: 'testnet',
        displayName: holeskyConfig.displayName,
        isTestnet: true,
        chainId: String(holeskyConfig.id),
        net: 'holesky'
      });
    }
  }
  
  return environments;
}

/**
 * Get display name for network with environment
 */
export function getNetworkDisplayName(
  network: string, 
  environment?: NetworkEnvironment | string
): string {
  const config = getChainConfig(network);
  if (!config) return network;
  
  // If no environment specified, return base display name
  if (!environment) {
    return config.displayName;
  }
  
  // For testnet, try to get specific testnet config
  if (environment === 'testnet') {
    const testnetKey = network.toLowerCase() + '-testnet';
    const testnetConfig = chains[testnetKey];
    if (testnetConfig) {
      return testnetConfig.displayName;
    }
    
    // Special cases
    if (network.toLowerCase() === 'polygon') {
      return chains['amoy']?.displayName || 'Polygon Testnet';
    }
    
    return `${config.displayName} Testnet`;
  }
  
  return config.displayName;
}