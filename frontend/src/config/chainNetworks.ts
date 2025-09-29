/**
 * Chain Network Configurations
 * Defines mainnet and testnet identifiers for all supported blockchain networks
 * 
 * EVM Chains: Use numeric chain_id per EIP-155 standard
 * Bitcoin: Uses network names (mainnet, testnet, regtest, signet)
 * Solana: Uses cluster names (mainnet-beta, testnet, devnet)
 * Cosmos Ecosystem: Uses chain-id strings (e.g., injective-1, injective-888)
 * 
 * Based on: https://docs.etherscan.io/supported-chains, https://chainlist.org
 */

export interface NetworkIdentifier {
  chainId: string | null;  // null for non-EVM chains that don't use numeric chain IDs
  net: string;             // Human-readable network identifier
  rpcUrl?: string;         // Optional RPC URL for the network
}

export interface ChainNetworkConfig {
  mainnet: NetworkIdentifier;
  testnet: NetworkIdentifier;
  devnet?: NetworkIdentifier;  // Some chains have devnet
}

export const CHAIN_NETWORKS: Record<string, ChainNetworkConfig> = {
  // EVM Chains
  ethereum: {
    mainnet: {
      chainId: '1',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '11155111',  // Sepolia
      net: 'Testnet',
    },
  },
  polygon: {
    mainnet: {
      chainId: '137',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '80002',  // Amoy testnet
      net: 'Testnet',
    },
  },
  optimism: {
    mainnet: {
      chainId: '10',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '11155420',  // Sepolia
      net: 'Testnet',
    },
  },
  arbitrum: {
    mainnet: {
      chainId: '42161',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '421614',  // Sepolia
      net: 'Testnet',
    },
  },
  base: {
    mainnet: {
      chainId: '8453',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '84532',  // Sepolia
      net: 'Testnet',
    },
  },
  bsc: {
    mainnet: {
      chainId: '56',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '97',
      net: 'Testnet',
    },
  },
  avalanche: {
    mainnet: {
      chainId: '43114',  // C-Chain
      net: 'Mainnet',
    },
    testnet: {
      chainId: '43113',  // Fuji
      net: 'Testnet',
    },
  },
  zksync: {
    mainnet: {
      chainId: '324',
      net: 'Mainnet',
    },
    testnet: {
      chainId: '300',  // Sepolia
      net: 'Testnet',
    },
  },
  
  // Non-EVM Chains
  bitcoin: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',  // testnet3
    },
  },
  solana: {
    mainnet: {
      chainId: null,
      net: 'mainnet-beta',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
    devnet: {
      chainId: null,
      net: 'devnet',
    },
  },
  aptos: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
    devnet: {
      chainId: null,
      net: 'devnet',
    },
  },
  sui: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
    devnet: {
      chainId: null,
      net: 'devnet',
    },
  },
  near: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
  },
  stellar: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
  },
  ripple: {
    mainnet: {
      chainId: null,
      net: 'mainnet',
    },
    testnet: {
      chainId: null,
      net: 'testnet',
    },
    devnet: {
      chainId: null,
      net: 'devnet',
    },
  },
  
  // Cosmos Ecosystem - uses chain-id strings
  injective: {
    mainnet: {
      chainId: 'injective-1',
      net: 'injective-1',
    },
    testnet: {
      chainId: 'injective-888',
      net: 'injective-888',
    },
  },
  cosmos: {
    mainnet: {
      chainId: 'cosmoshub-4',
      net: 'cosmoshub-4',
    },
    testnet: {
      chainId: 'theta-testnet-001',
      net: 'theta-testnet-001',
    },
  },
};

/**
 * Get network identifier for a chain and environment
 */
export function getNetworkIdentifier(
  chain: string,
  environment: 'mainnet' | 'testnet' | 'devnet'
): NetworkIdentifier | null {
  const chainConfig = CHAIN_NETWORKS[chain.toLowerCase()];
  if (!chainConfig) {
    console.warn(`No network configuration found for chain: ${chain}`);
    return null;
  }

  const networkId = chainConfig[environment];
  if (!networkId) {
    console.warn(`No ${environment} configuration found for chain: ${chain}`);
    return null;
  }

  return networkId;
}

/**
 * Check if a chain supports a specific environment
 */
export function supportsEnvironment(
  chain: string,
  environment: 'mainnet' | 'testnet' | 'devnet'
): boolean {
  const chainConfig = CHAIN_NETWORKS[chain.toLowerCase()];
  return chainConfig?.[environment] !== undefined;
}

/**
 * Get available environments for a chain
 */
export function getAvailableEnvironments(chain: string): string[] {
  const chainConfig = CHAIN_NETWORKS[chain.toLowerCase()];
  if (!chainConfig) return [];
  
  const environments: string[] = [];
  if (chainConfig.mainnet) environments.push('mainnet');
  if (chainConfig.testnet) environments.push('testnet');
  if (chainConfig.devnet) environments.push('devnet');
  
  return environments;
}
