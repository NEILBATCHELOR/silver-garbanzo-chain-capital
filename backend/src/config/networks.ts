/**
 * Network Configuration - Backend
 * 
 * Centralized RPC URL configuration for all supported blockchains
 * Pulls from environment variables to avoid hardcoding
 */

interface NetworkEndpoints {
  rpcUrl: string;
  chainId: string;
}

interface NetworkConfig {
  mainnet?: NetworkEndpoints;
  testnet?: NetworkEndpoints;
  devnet?: NetworkEndpoints;
}

/**
 * Get RPC URL for a specific blockchain and network
 * 
 * @param blockchain - Blockchain name (injective, ethereum, polygon, etc.)
 * @param network - Network name (mainnet, testnet, devnet)
 * @returns RPC URL
 */
export function getRpcUrl(blockchain: string, network: string): string {
  const config = NETWORK_CONFIG[blockchain.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  const endpoints = config[network.toLowerCase() as keyof NetworkConfig];
  if (!endpoints) {
    throw new Error(`Unsupported network '${network}' for blockchain '${blockchain}'`);
  }

  return endpoints.rpcUrl;
}

/**
 * Get chain ID for a specific blockchain and network
 * 
 * @param blockchain - Blockchain name
 * @param network - Network name
 * @returns Chain ID
 */
export function getChainId(blockchain: string, network: string): string {
  const config = NETWORK_CONFIG[blockchain.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported blockchain: ${blockchain}`);
  }

  const endpoints = config[network.toLowerCase() as keyof NetworkConfig];
  if (!endpoints) {
    throw new Error(`Unsupported network '${network}' for blockchain '${blockchain}'`);
  }

  return endpoints.chainId;
}

/**
 * Network configuration for all supported blockchains
 * All RPC URLs are loaded from environment variables
 */
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  // Injective
  injective: {
    mainnet: {
      rpcUrl: process.env.INJECTIVE_EVM_MAINNET_RPC_URL || 'https://evm.injective.network',
      chainId: 'injective-1'
    },
    testnet: {
      rpcUrl: process.env.INJECTIVE_EVM_TESTNET_RPC_URL || 'https://k8s.testnet.evm-rpc.injective.network',
      chainId: 'injective-888'
    }
  },

  // Ethereum
  ethereum: {
    mainnet: {
      rpcUrl: process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      chainId: '1'
    },
    testnet: {
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      chainId: '11155111'
    }
  },

  // Polygon
  polygon: {
    mainnet: {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      chainId: '137'
    },
    testnet: {
      rpcUrl: process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      chainId: '80002'
    }
  },

  // Arbitrum
  arbitrum: {
    mainnet: {
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      chainId: '42161'
    },
    testnet: {
      rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: '421614'
    }
  },

  // Optimism
  optimism: {
    mainnet: {
      rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      chainId: '10'
    },
    testnet: {
      rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
      chainId: '11155420'
    }
  },

  // Base
  base: {
    mainnet: {
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: '8453'
    },
    testnet: {
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      chainId: '84532'
    }
  },

  // Hoodi (custom testnet)
  hoodi: {
    testnet: {
      rpcUrl: process.env.HOODI_RPC_URL || 'https://rpc-testnet.hoodi.tech',
      chainId: '560048'
    }
  },

  // Avalanche
  avalanche: {
    mainnet: {
      rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      chainId: '43114'
    },
    testnet: {
      rpcUrl: process.env.AVALANCHE_TESTNET_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: '43113'
    }
  },

  // BSC (Binance Smart Chain)
  bsc: {
    mainnet: {
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      chainId: '56'
    },
    testnet: {
      rpcUrl: process.env.BSC_TESTNET_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: '97'
    }
  }
};
