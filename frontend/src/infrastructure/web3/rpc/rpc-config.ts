/**
 * RPC Configuration
 * 
 * This file provides RPC endpoints for various blockchain networks.
 * Used as a fallback when environment variables are not available.
 */

// Get API keys from environment variables with fallbacks
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || 'Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP';

// RPC endpoint configuration - matching the user's .env variables
export const RPC_CONFIG = {
  // Ethereum Networks
  ethereum: {
    mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Polygon Networks
  polygon: {
    mainnet: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Optimism Networks
  optimism: {
    mainnet: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Arbitrum Networks
  arbitrum: {
    mainnet: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Base Networks
  base: {
    mainnet: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // zkSync Networks
  zksync: {
    mainnet: `https://zksync-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://zksync-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Solana Networks - NO FALLBACKS, must use .env
  solana: {
    mainnet: import.meta.env.VITE_SOLANA_RPC_URL || '',
    devnet: import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || '',
    testnet: import.meta.env.VITE_SOLANA_TESTNET_RPC_URL || ''
  },
  
  // Bitcoin Networks
  bitcoin: {
    mainnet: `https://bitcoin-rpc.publicnode.com`,
  },
  
  // Aptos Networks
  aptos: {
    mainnet: `https://aptos-rpc.publicnode.com`,
    testnet: `https://fullnode.testnet.aptoslabs.com/v1`
  },
  
  // Sui Networks
  sui: {
    mainnet: `https://sui-rpc.publicnode.com`,
    testnet: `https://sui-testnet-rpc.publicnode.com`
  },
  
  // NEAR Networks
  near: {
    mainnet: `https://rpc.mainnet.near.org`,
    testnet: `https://rpc.testnet.near.org`
  },
  
  // Avalanche Networks - Use Alchemy instead of disabled QuickNode
  avalanche: {
    mainnet: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://avax-fuji.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Mantle Networks
  mantle: {
    mainnet: `https://mantle-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://mantle-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  
  // Hedera Networks - Add placeholder URLs
  hedera: {
    mainnet: "https://mainnet.hashio.io/api",
    testnet: "https://testnet.hashio.io/api"
  },
  
  // Injective EVM Networks (EVM-compatible endpoints, not Cosmos RPC)
  injective: {
    mainnet: "https://sentry.evm-rpc.injective.network",
    testnet: "https://light-responsive-card.injective-testnet.quiknode.pro/1bfd0c3e5f4cb82ff9e7be06008ad1c82f946d38/"
  },
  
  // Holesky and Hoodi Testnets
  holesky: {
    mainnet: `https://eth-holesky.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    testnet: `https://eth-holesky.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  },
  hoodi: {
    mainnet: "https://ethereum-hoodi.publicnode.com",
    testnet: "https://ethereum-hoodi.publicnode.com"
  }
};

// Factory Addresses (placeholders based on user's env - actual values are hidden)
export const FACTORY_ADDRESSES = {
  ethereum: {
    mainnet: import.meta.env.VITE_MAINNET_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    testnet: import.meta.env.VITE_GOERLI_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000"
  },
  polygon: {
    mainnet: import.meta.env.VITE_POLYGON_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    testnet: import.meta.env.VITE_MUMBAI_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000"
  }
};

/**
 * Get RPC URL from environment variables ONLY - no fallbacks
 * For Solana, supports 'mainnet', 'devnet', and 'testnet'
 */
export const getRpcUrl = (blockchain: string, network: 'mainnet' | 'devnet' | 'testnet' = 'devnet'): string => {
  // For Solana, handle all three networks
  if (blockchain === 'solana') {
    if (network === 'mainnet') {
      return import.meta.env.VITE_SOLANA_RPC_URL || '';
    } else if (network === 'devnet') {
      return import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || '';
    } else if (network === 'testnet') {
      return import.meta.env.VITE_SOLANA_TESTNET_RPC_URL || '';
    }
  }
  
  // For other blockchains, use isTestnet boolean for compatibility
  const isTestnet = network !== 'mainnet';
  const environment = isTestnet ? 'testnet' : 'mainnet';
  
  // Try to get URL from environment variables first
  let envUrl: string | undefined;
  
  if (isTestnet) {
    // Map of blockchain names to testnet env variable names
    const testnetEnvMap: Record<string, string> = {
      ethereum: 'VITE_SEPOLIA_RPC_URL',
      polygon: 'VITE_AMOY_RPC_URL',
      optimism: 'VITE_OPTIMISM_SEPOLIA_RPC_URL',
      arbitrum: 'VITE_ARBITRUM_SEPOLIA_RPC_URL',
      base: 'VITE_BASE_SEPOLIA_RPC_URL',
      zksync: 'VITE_ZKSYNC_SEPOLIA_RPC_URL',
      // Solana handled above
      bitcoin: 'VITE_BITCOIN_TESTNET_RPC_URL',
      aptos: 'VITE_APTOS_TESTNET_RPC_URL',
      sui: 'VITE_SUI_TESTNET_RPC_URL',
      near: 'VITE_NEAR_TESTNET_RPC_URL',
      avalanche: 'VITE_AVALANCHE_TESTNET_RPC_URL',
      mantle: 'VITE_MANTLE_TESTNET_RPC_URL',
      holesky: 'VITE_HOLESKY_RPC_URL',
      hoodi: 'VITE_HOODI_RPC_URL',
      injective: 'VITE_INJECTIVE_TESTNET_RPC_URL'
    };
    
    const envKey = testnetEnvMap[blockchain];
    if (envKey) {
      envUrl = import.meta.env[envKey];
    }
    
    // If not found in the map, try the standardized naming pattern
    if (!envUrl) {
      const testnetKey = `VITE_${blockchain.toUpperCase()}_TESTNET_RPC_URL`;
      envUrl = import.meta.env[testnetKey];
    }
  } else {
    // Mainnet URLs
    const mainnetEnvMap: Record<string, string> = {
      ethereum: 'VITE_MAINNET_RPC_URL',
      polygon: 'VITE_POLYGON_RPC_URL',
      optimism: 'VITE_OPTIMISM_RPC_URL',
      arbitrum: 'VITE_ARBITRUM_RPC_URL',
      base: 'VITE_BASE_RPC_URL',
      zksync: 'VITE_ZKSYNC_RPC_URL',
      // Solana handled above
      bitcoin: 'VITE_BITCOIN_RPC_URL',
      aptos: 'VITE_APTOS_RPC_URL',
      sui: 'VITE_SUI_RPC_URL',
      near: 'VITE_NEAR_RPC_URL',
      avalanche: 'VITE_AVALANCHE_RPC_URL',
      injective: 'VITE_INJECTIVE_RPC_URL'
    };
    
    const envKey = mainnetEnvMap[blockchain];
    if (envKey) {
      envUrl = import.meta.env[envKey];
    }
    
    // If not found in the map, try the standardized naming pattern
    if (!envUrl) {
      const mainnetKey = `VITE_${blockchain.toUpperCase()}_RPC_URL`;
      envUrl = import.meta.env[mainnetKey];
    }
  }
  
  // Return env URL if available
  if (envUrl) return envUrl;
  
  // For Solana, NEVER use fallback - must be in .env
  if (blockchain === 'solana') {
    throw new Error(
      `Solana RPC URL for ${network} not configured. ` +
      `Add VITE_SOLANA_${network.toUpperCase()}_RPC_URL to your .env file.`
    );
  }
  
  // Fallback to hardcoded config for non-Solana chains only
  return RPC_CONFIG[blockchain]?.[environment] || '';
};

export default RPC_CONFIG;