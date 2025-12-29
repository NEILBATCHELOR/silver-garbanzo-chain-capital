/**
 * Enhanced Chain Network Configuration
 * Supports multiple testnets per chain according to:
 * - https://docs.etherscan.io/supported-chains
 * - https://docs.etherscan.io/v2-migration
 * - https://chainlist.org
 */

import { CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export interface NetworkEnvironment {
  name: string;           // Network name (e.g., 'Sepolia', 'Holesky', 'Mainnet')
  chainId: string | null; // Chain ID for EVM chains, null for non-EVM
  net: string;            // Network identifier used in database
  displayName: string;    // User-friendly display name
  isTestnet: boolean;     // Whether this is a testnet
  explorerUrl?: string;   // Block explorer URL
  rpcUrl?: string;        // RPC endpoint
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  balanceServiceKey?: string; // Key for balance service mapping
}

export interface ChainConfig {
  name: string;
  label: string;
  icon: string;
  color: string;
  chainType: 'evm' | 'bitcoin' | 'solana' | 'cosmos' | 'other';
  environments: NetworkEnvironment[];
}

export const ENHANCED_CHAIN_CONFIGS: ChainConfig[] = [
  {
    name: 'ethereum',
    label: 'Ethereum',
    icon: '⟠',
    color: 'bg-blue-500',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.ethereum),
        net: 'mainnet',
        displayName: 'Ethereum Mainnet',
        isTestnet: false,
        explorerUrl: 'https://etherscan.io',
        balanceServiceKey: 'ethereum',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'sepolia',
        chainId: String(CHAIN_IDS.sepolia),
        net: 'sepolia',
        displayName: 'Sepolia Testnet',
        isTestnet: true,
        explorerUrl: 'https://sepolia.etherscan.io',
        balanceServiceKey: 'sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'holesky',
        chainId: String(CHAIN_IDS.holesky),
        net: 'holesky',
        displayName: 'Holesky Testnet',
        isTestnet: true,
        explorerUrl: 'https://holesky.etherscan.io',
        balanceServiceKey: 'holesky',
        nativeCurrency: {
          name: 'Holesky Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'hoodi',
        chainId: String(CHAIN_IDS.hoodi),
        net: 'hoodi',
        displayName: 'Hoodi Testnet',
        isTestnet: true,
        explorerUrl: 'https://hoodi.etherscan.io',
        rpcUrl: 'https://eth-hoodi.g.alchemy.com/v2/Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP',
        balanceServiceKey: 'hoodi',
        nativeCurrency: {
          name: 'Hoodi Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'polygon',
    label: 'Polygon',
    icon: '🟣',
    color: 'bg-purple-500',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.polygon),
        net: 'polygon',
        displayName: 'Polygon Mainnet',
        isTestnet: false,
        explorerUrl: 'https://polygonscan.com',
        balanceServiceKey: 'polygon',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18
        }
      },
      {
        name: 'amoy',
        chainId: String(CHAIN_IDS.polygonAmoy),
        net: 'amoy',
        displayName: 'Polygon Amoy Testnet',
        isTestnet: true,
        explorerUrl: 'https://amoy.polygonscan.com',
        balanceServiceKey: 'amoy',
        nativeCurrency: {
          name: 'Test MATIC',
          symbol: 'MATIC',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'optimism',
    label: 'Optimism',
    icon: '🔴',
    color: 'bg-red-400',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.optimism),
        net: 'optimism',
        displayName: 'Optimism Mainnet',
        isTestnet: false,
        explorerUrl: 'https://optimistic.etherscan.io',
        balanceServiceKey: 'optimism',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'sepolia',
        chainId: String(CHAIN_IDS.optimismSepolia),
        net: 'optimism-sepolia',
        displayName: 'Optimism Sepolia',
        isTestnet: true,
        explorerUrl: 'https://sepolia-optimism.etherscan.io',
        balanceServiceKey: 'optimism-sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'arbitrum',
    label: 'Arbitrum',
    icon: '🔵',
    color: 'bg-blue-600',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.arbitrumOne),
        net: 'arbitrum',
        displayName: 'Arbitrum One',
        isTestnet: false,
        explorerUrl: 'https://arbiscan.io',
        balanceServiceKey: 'arbitrum',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'sepolia',
        chainId: String(CHAIN_IDS.arbitrumSepolia),
        net: 'arbitrum-sepolia',
        displayName: 'Arbitrum Sepolia',
        isTestnet: true,
        explorerUrl: 'https://sepolia.arbiscan.io',
        balanceServiceKey: 'arbitrum-sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'base',
    label: 'Base',
    icon: '🔷',
    color: 'bg-blue-400',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.base),
        net: 'base',
        displayName: 'Base Mainnet',
        isTestnet: false,
        explorerUrl: 'https://basescan.org',
        balanceServiceKey: 'base',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'sepolia',
        chainId: String(CHAIN_IDS.baseSepolia),
        net: 'base-sepolia',
        displayName: 'Base Sepolia',
        isTestnet: true,
        explorerUrl: 'https://sepolia.basescan.org',
        balanceServiceKey: 'base-sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'bsc',
    label: 'BNB Chain',
    icon: '🟡',
    color: 'bg-yellow-500',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.bnb),
        net: 'bsc',
        displayName: 'BNB Chain Mainnet',
        isTestnet: false,
        explorerUrl: 'https://bscscan.com',
        balanceServiceKey: 'bsc',
        nativeCurrency: {
          name: 'BNB',
          symbol: 'BNB',
          decimals: 18
        }
      },
      {
        name: 'testnet',
        chainId: String(CHAIN_IDS.bnbTestnet),
        net: 'bsc-testnet',
        displayName: 'BNB Chain Testnet',
        isTestnet: true,
        explorerUrl: 'https://testnet.bscscan.com',
        balanceServiceKey: 'bsc-testnet',
        nativeCurrency: {
          name: 'Test BNB',
          symbol: 'tBNB',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'avalanche',
    label: 'Avalanche',
    icon: '🔺',
    color: 'bg-red-500',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.avalanche),
        net: 'avalanche',
        displayName: 'Avalanche C-Chain',
        isTestnet: false,
        explorerUrl: 'https://snowtrace.io',
        balanceServiceKey: 'avalanche',
        nativeCurrency: {
          name: 'AVAX',
          symbol: 'AVAX',
          decimals: 18
        }
      },
      {
        name: 'fuji',
        chainId: String(CHAIN_IDS.avalancheFuji),
        net: 'fuji',
        displayName: 'Avalanche Fuji Testnet',
        isTestnet: true,
        explorerUrl: 'https://testnet.snowtrace.io',
        balanceServiceKey: 'avalanche-testnet',
        nativeCurrency: {
          name: 'Test AVAX',
          symbol: 'AVAX',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'zksync',
    label: 'zkSync Era',
    icon: '⚡',
    color: 'bg-purple-600',
    chainType: 'evm',
    environments: [
      {
        name: 'mainnet',
        chainId: String(CHAIN_IDS.zkSync),
        net: 'zksync',
        displayName: 'zkSync Era Mainnet',
        isTestnet: false,
        explorerUrl: 'https://era.zksync.network',
        balanceServiceKey: 'zksync',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      {
        name: 'sepolia',
        chainId: String(CHAIN_IDS.zkSyncSepolia),
        net: 'zksync-sepolia',
        displayName: 'zkSync Era Sepolia',
        isTestnet: true,
        explorerUrl: 'https://sepolia.explorer.zksync.io',
        balanceServiceKey: 'zksync-sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    ]
  },
  {
    name: 'bitcoin',
    label: 'Bitcoin',
    icon: '₿',
    color: 'bg-orange-500',
    chainType: 'bitcoin',
    environments: [
      {
        name: 'mainnet',
        chainId: null,
        net: 'mainnet',
        displayName: 'Bitcoin Mainnet',
        isTestnet: false,
        explorerUrl: 'https://blockstream.info',
        balanceServiceKey: 'bitcoin',
        nativeCurrency: {
          name: 'Bitcoin',
          symbol: 'BTC',
          decimals: 8
        }
      },
      {
        name: 'testnet',
        chainId: null,
        net: 'testnet',
        displayName: 'Bitcoin Testnet3',
        isTestnet: true,
        explorerUrl: 'https://blockstream.info/testnet',
        balanceServiceKey: 'bitcoin-testnet',
        nativeCurrency: {
          name: 'Test Bitcoin',
          symbol: 'tBTC',
          decimals: 8
        }
      },
      {
        name: 'signet',
        chainId: null,
        net: 'signet',
        displayName: 'Bitcoin Signet',
        isTestnet: true,
        explorerUrl: 'https://explorer.bc-2.jp',
        balanceServiceKey: 'bitcoin-signet',
        nativeCurrency: {
          name: 'Signet Bitcoin',
          symbol: 'sBTC',
          decimals: 8
        }
      }
    ]
  },
  {
    name: 'solana',
    label: 'Solana',
    icon: '☀️',
    color: 'bg-green-500',
    chainType: 'solana',
    environments: [
      {
        name: 'mainnet-beta',
        chainId: null,
        net: 'mainnet-beta',
        displayName: 'Solana Mainnet',
        isTestnet: false,
        explorerUrl: 'https://explorer.solana.com',
        balanceServiceKey: 'solana',
        nativeCurrency: {
          name: 'SOL',
          symbol: 'SOL',
          decimals: 9
        }
      },
      {
        name: 'testnet',
        chainId: null,
        net: 'testnet',
        displayName: 'Solana Testnet',
        isTestnet: true,
        explorerUrl: 'https://explorer.solana.com?cluster=testnet',
        balanceServiceKey: 'solana-testnet',
        nativeCurrency: {
          name: 'Test SOL',
          symbol: 'SOL',
          decimals: 9
        }
      },
      {
        name: 'devnet',
        chainId: null,
        net: 'devnet',
        displayName: 'Solana Devnet',
        isTestnet: true,
        explorerUrl: 'https://explorer.solana.com?cluster=devnet',
        balanceServiceKey: 'solana-devnet',
        nativeCurrency: {
          name: 'Dev SOL',
          symbol: 'SOL',
          decimals: 9
        }
      }
    ]
  },
  {
    name: 'injective',
    label: 'Injective',
    icon: 'INJ',
    color: 'bg-gray-700',
    chainType: 'cosmos',
    environments: [
      {
        name: 'mainnet',
        chainId: 'injective-1',
        net: 'injective-1',
        displayName: 'Injective Mainnet',
        isTestnet: false,
        explorerUrl: 'https://explorer.injective.network',
        balanceServiceKey: 'injective',
        nativeCurrency: {
          name: 'INJ',
          symbol: 'INJ',
          decimals: 18
        }
      },
      {
        name: 'testnet',
        chainId: 'injective-888',
        net: 'injective-888',
        displayName: 'Injective Testnet',
        isTestnet: true,
        explorerUrl: 'https://testnet.explorer.injective.network',
        balanceServiceKey: 'injective-testnet',
        nativeCurrency: {
          name: 'Test INJ',
          symbol: 'INJ',
          decimals: 18
        }
      }
    ]
  }
];

/**
 * Get all available chains
 */
export function getAllChains(): ChainConfig[] {
  return ENHANCED_CHAIN_CONFIGS;
}

/**
 * Get a specific chain configuration
 */
export function getChainConfig(chainName: string): ChainConfig | undefined {
  return ENHANCED_CHAIN_CONFIGS.find(
    chain => chain.name.toLowerCase() === chainName.toLowerCase()
  );
}

/**
 * Get all environments for a specific chain
 */
export function getChainEnvironments(chainName: string): NetworkEnvironment[] {
  const chain = getChainConfig(chainName);
  return chain?.environments || [];
}

/**
 * Get a specific environment for a chain
 */
export function getChainEnvironment(
  chainName: string, 
  environmentName: string
): NetworkEnvironment | undefined {
  const chain = getChainConfig(chainName);
  return chain?.environments.find(
    env => env.name.toLowerCase() === environmentName.toLowerCase()
  );
}

/**
 * Get all testnet environments for a chain
 */
export function getChainTestnets(chainName: string): NetworkEnvironment[] {
  const chain = getChainConfig(chainName);
  return chain?.environments.filter(env => env.isTestnet) || [];
}

/**
 * Get mainnet environment for a chain
 */
export function getChainMainnet(chainName: string): NetworkEnvironment | undefined {
  const chain = getChainConfig(chainName);
  return chain?.environments.find(env => !env.isTestnet);
}

/**
 * Check if an environment is available for a chain
 */
export function isEnvironmentAvailable(
  chainName: string, 
  environmentName: string
): boolean {
  const env = getChainEnvironment(chainName, environmentName);
  return env !== undefined;
}

/**
 * Get balance service key for a specific chain and environment
 */
export function getBalanceServiceKey(
  chainName: string, 
  environmentName: string
): string | undefined {
  const env = getChainEnvironment(chainName, environmentName);
  return env?.balanceServiceKey;
}

/**
 * Get explorer URL for a specific chain and environment
 */
export function getExplorerUrl(
  chainName: string, 
  environmentName: string
): string | undefined {
  const env = getChainEnvironment(chainName, environmentName);
  return env?.explorerUrl;
}

/**
 * Format chain and environment for display
 */
export function formatChainEnvironment(
  chainName: string, 
  environmentName: string
): string {
  const env = getChainEnvironment(chainName, environmentName);
  return env?.displayName || `${chainName} ${environmentName}`;
}

/**
 * Map of environment names to their parent chain names
 * This allows converting user-selected environment (e.g., "holesky") to proper chain/environment pair
 */
const ENVIRONMENT_TO_CHAIN_MAP: Record<string, { chain: string; environment: string }> = {
  // Ethereum environments
  'mainnet': { chain: 'ethereum', environment: 'mainnet' },
  'sepolia': { chain: 'ethereum', environment: 'sepolia' },
  'holesky': { chain: 'ethereum', environment: 'holesky' },
  'hoodi': { chain: 'ethereum', environment: 'hoodi' },
  
  // Polygon environments
  'polygon': { chain: 'polygon', environment: 'mainnet' },
  'mumbai': { chain: 'polygon', environment: 'mumbai' },
  'amoy': { chain: 'polygon', environment: 'amoy' },
  
  // Avalanche environments
  'avalanche': { chain: 'avalanche', environment: 'mainnet' },
  'fuji': { chain: 'avalanche', environment: 'fuji' },
  
  // Optimism environments
  'optimism': { chain: 'optimism', environment: 'mainnet' },
  'optimism-sepolia': { chain: 'optimism', environment: 'sepolia' },
  
  // Arbitrum environments
  'arbitrum': { chain: 'arbitrum', environment: 'mainnet' },
  'arbitrum-sepolia': { chain: 'arbitrum', environment: 'sepolia' },
  
  // Base environments
  'base': { chain: 'base', environment: 'mainnet' },
  'base-sepolia': { chain: 'base', environment: 'sepolia' },
  
  // BSC environments
  'bsc': { chain: 'bsc', environment: 'mainnet' },
  'bsc-testnet': { chain: 'bsc', environment: 'testnet' },
  
  // Solana environments
  'solana': { chain: 'solana', environment: 'mainnet-beta' },
  'solana-testnet': { chain: 'solana', environment: 'testnet' },
  'solana-devnet': { chain: 'solana', environment: 'devnet' },
  
  // Injective environments
  'injective': { chain: 'injective', environment: 'mainnet' },
  'injective-testnet': { chain: 'injective', environment: 'testnet' },
  
  // Bitcoin environments
  'bitcoin': { chain: 'bitcoin', environment: 'mainnet' },
  'bitcoin-testnet': { chain: 'bitcoin', environment: 'testnet' }
};

/**
 * Get chain and environment from a network string
 * Handles cases where the network might be just an environment name (like "holesky")
 * or a chain name (like "ethereum")
 * 
 * @param networkInput - The network input (could be environment or chain name)
 * @param environmentInput - Optional environment name
 * @returns Object with chain and environment names, or undefined if not found
 */
export function resolveChainAndEnvironment(
  networkInput: string,
  environmentInput?: string
): { chain: string; environment: string } | undefined {
  const normalizedNetwork = networkInput.toLowerCase();
  
  // Case 1: If both network and environment provided, verify they exist
  if (environmentInput) {
    const normalizedEnv = environmentInput.toLowerCase();
    const envConfig = getChainEnvironment(normalizedNetwork, normalizedEnv);
    if (envConfig) {
      return { chain: normalizedNetwork, environment: normalizedEnv };
    }
  }
  
  // Case 2: Check if networkInput is actually an environment name
  const mapping = ENVIRONMENT_TO_CHAIN_MAP[normalizedNetwork];
  if (mapping) {
    return mapping;
  }
  
  // Case 3: Try to find as a chain with mainnet environment
  const chainConfig = getChainConfig(normalizedNetwork);
  if (chainConfig) {
    const mainnet = chainConfig.environments.find(env => !env.isTestnet);
    if (mainnet) {
      return { chain: normalizedNetwork, environment: mainnet.name };
    }
    // Fallback to first environment if no mainnet found
    if (chainConfig.environments.length > 0) {
      return { chain: normalizedNetwork, environment: chainConfig.environments[0].name };
    }
  }
  
  // Case 4: Not found
  console.warn(`[ChainConfig] Could not resolve chain and environment for: ${networkInput}${environmentInput ? `/${environmentInput}` : ''}`);
  return undefined;
}
