/**
 * Chain Configuration
 * Maps chain names to their environments and chain IDs
 */

import { 
  CHAIN_IDS, 
  CHAIN_INFO, 
  getChainInfo as getChainInfoUtil,
  isTestnet as isTestnetUtil,
  ChainInfo 
} from '@/infrastructure/web3/utils/chainIds';

export interface ChainEnvironment {
  name: string; // 'mainnet' or 'testnet'
  chainId: string | null; // null for non-EVM chains
  displayName: string;
  isTestnet: boolean;
  explorerUrl?: string;
  rpcUrl?: string;
  isNonEvm?: boolean; // Flag for non-EVM chains
}

export interface ChainConfig {
  name: string; // Network identifier (e.g., 'ethereum', 'polygon', 'ripple')
  network: string; // Same as name for compatibility
  displayName: string;
  label: string; // Human-readable label
  icon?: string; // Icon or emoji
  environments: ChainEnvironment[];
  isNonEvm?: boolean; // Flag for non-EVM chains
}

export type NetworkEnvironment = 'mainnet' | 'testnet' | 'devnet';

/**
 * Network to environment mapping
 */
const NETWORK_ENVIRONMENTS: Record<string, Record<string, ChainEnvironment>> = {
  ethereum: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.ethereum.toString(),
      displayName: 'Ethereum Mainnet',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.ethereum]?.explorer,
    },
    sepolia: {
      name: 'sepolia',
      chainId: CHAIN_IDS.sepolia.toString(),
      displayName: 'Sepolia Testnet',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.sepolia]?.explorer,
    },
    holesky: {
      name: 'holesky',
      chainId: CHAIN_IDS.holesky.toString(),
      displayName: 'Holesky Testnet',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.holesky]?.explorer,
    },
    hoodi: {
      name: 'hoodi',
      chainId: CHAIN_IDS.hoodi.toString(),
      displayName: 'Hoodi Testnet',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.hoodi]?.explorer,
    },
  },
  polygon: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.polygon.toString(),
      displayName: 'Polygon Mainnet',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.polygon]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.polygonAmoy.toString(),
      displayName: 'Polygon Amoy',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.polygonAmoy]?.explorer,
    },
  },
  arbitrum: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.arbitrumOne.toString(),
      displayName: 'Arbitrum One',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.arbitrumOne]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.arbitrumSepolia.toString(),
      displayName: 'Arbitrum Sepolia',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.arbitrumSepolia]?.explorer,
    },
  },
  base: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.base.toString(),
      displayName: 'Base Mainnet',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.base]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.baseSepolia.toString(),
      displayName: 'Base Sepolia',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.baseSepolia]?.explorer,
    },
  },
  optimism: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.optimism.toString(),
      displayName: 'OP Mainnet',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.optimism]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.optimismSepolia.toString(),
      displayName: 'OP Sepolia',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.optimismSepolia]?.explorer,
    },
  },
  avalanche: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.avalanche.toString(),
      displayName: 'Avalanche C-Chain',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.avalanche]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.avalancheFuji.toString(),
      displayName: 'Avalanche Fuji',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.avalancheFuji]?.explorer,
    },
  },
  bsc: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.bnb.toString(),
      displayName: 'BNB Smart Chain',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.bnb]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.bnbTestnet.toString(),
      displayName: 'BNB Testnet',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.bnbTestnet]?.explorer,
    },
  },
  zksync: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.zkSync.toString(),
      displayName: 'zkSync Era',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.zkSync]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.zkSyncSepolia.toString(),
      displayName: 'zkSync Sepolia',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.zkSyncSepolia]?.explorer,
    },
  },
  injective: {
    mainnet: {
      name: 'mainnet',
      chainId: CHAIN_IDS.injective.toString(),
      displayName: 'Injective Mainnet',
      isTestnet: false,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.injective]?.explorer,
    },
    testnet: {
      name: 'testnet',
      chainId: CHAIN_IDS.injectiveTestnet.toString(),
      displayName: 'Injective Testnet',
      isTestnet: true,
      explorerUrl: CHAIN_INFO[CHAIN_IDS.injectiveTestnet]?.explorer,
    },
  },
  // Non-EVM Chains
  ripple: {
    mainnet: {
      name: 'mainnet',
      chainId: null,
      displayName: 'XRPL Mainnet',
      isTestnet: false,
      explorerUrl: 'https://livenet.xrpl.org',
      isNonEvm: true,
    },
    testnet: {
      name: 'testnet',
      chainId: null,
      displayName: 'XRPL Testnet',
      isTestnet: true,
      explorerUrl: 'https://testnet.xrpl.org',
      isNonEvm: true,
    },
    devnet: {
      name: 'devnet',
      chainId: null,
      displayName: 'XRPL Devnet',
      isTestnet: true,
      explorerUrl: 'https://devnet.xrpl.org',
      isNonEvm: true,
    },
  },
};

/**
 * Get all available chains with their configurations
 */
export function getAllChains(): ChainConfig[] {
  return Object.entries(NETWORK_ENVIRONMENTS).map(([network, environments]) => {
    const displayName = getNetworkDisplayName(network);
    const isNonEvm = Object.values(environments).some(env => env.isNonEvm);
    return {
      name: network,
      network,
      displayName,
      label: displayName,
      icon: getNetworkIcon(network),
      environments: Object.values(environments),
      isNonEvm,
    };
  });
}

/**
 * Get available environments for a specific network
 */
export function getChainEnvironments(network: string): ChainEnvironment[] {
  return Object.values(NETWORK_ENVIRONMENTS[network] || {});
}

/**
 * Get chain configuration for a specific network
 */
export function getChainConfig(network: string): ChainConfig | undefined {
  const environments = NETWORK_ENVIRONMENTS[network];
  if (!environments) return undefined;
  
  const displayName = getNetworkDisplayName(network);
  const isNonEvm = Object.values(environments).some(env => env.isNonEvm);
  return {
    name: network,
    network,
    displayName,
    label: displayName,
    icon: getNetworkIcon(network),
    environments: Object.values(environments),
    isNonEvm,
  };
}

/**
 * Get display name for a network
 */
function getNetworkDisplayName(network: string): string {
  const displayNames: Record<string, string> = {
    ethereum: 'Ethereum',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    base: 'Base',
    optimism: 'Optimism',
    avalanche: 'Avalanche',
    bsc: 'BNB Smart Chain',
    zksync: 'zkSync',
    injective: 'Injective',
    ripple: 'XRP Ledger (XRPL)',
  };
  return displayNames[network] || network;
}

/**
 * Get icon/emoji for a network
 */
function getNetworkIcon(network: string): string {
  const icons: Record<string, string> = {
    ethereum: 'Ξ',
    polygon: '⬡',
    arbitrum: '🔷',
    base: '🔵',
    optimism: '🔴',
    avalanche: '🔺',
    bsc: '🟡',
    zksync: '⚡',
    injective: '💉',
    ripple: '💧',
  };
  return icons[network] || '🔗';
}

/**
 * Get chain environment for a network and environment type
 */
export function getChainEnvironment(
  network: string,
  environmentType: string
): ChainEnvironment | undefined {
  return NETWORK_ENVIRONMENTS[network]?.[environmentType];
}

/**
 * Resolve chain and environment from chain ID
 */
export function resolveChainAndEnvironment(
  chainId: string
): { network: string; environment: ChainEnvironment } | undefined {
  const chainIdNum = parseInt(chainId, 10);
  
  for (const [network, environments] of Object.entries(NETWORK_ENVIRONMENTS)) {
    for (const [envType, env] of Object.entries(environments)) {
      if (env.chainId === chainId) {
        return { network, environment: env };
      }
    }
  }
  
  return undefined;
}

/**
 * Get explorer URL for a chain ID
 */
export function getExplorerUrl(chainId: string | number): string | undefined {
  if (chainId === null) return undefined;
  const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
  return CHAIN_INFO[chainIdNum]?.explorer;
}

/**
 * Check if a network is non-EVM
 */
export function isNonEvmNetwork(network: string): boolean {
  const config = getChainConfig(network);
  return config?.isNonEvm === true;
}

/**
 * Derive wallet type from chain ID or non-EVM network
 */
export function deriveWalletType(chainId?: string | null, nonEvmNetwork?: string | null): string {
  if (nonEvmNetwork) {
    return nonEvmNetwork.toLowerCase();
  }
  
  if (chainId) {
    const resolved = resolveChainAndEnvironment(chainId);
    return resolved?.network || 'unknown';
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
