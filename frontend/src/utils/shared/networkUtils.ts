/**
 * Network utility functions for handling blockchain network identifiers
 */

/**
 * Construct full network identifier from blockchain and environment
 * @param blockchain Base blockchain name (e.g., "polygon", "ethereum")
 * @param environment Deployment environment ("mainnet", "testnet", or specific testnet name)
 * @returns Full network identifier (e.g., "polygon-amoy", "ethereum", "polygon-mumbai")
 */
export function constructNetworkIdentifier(
  blockchain: string | undefined | null,
  environment: string | undefined | null
): string {
  if (!blockchain) return '';
  
  const normalizedBlockchain = blockchain.toLowerCase().trim();
  const normalizedEnvironment = (environment || '').toLowerCase().trim();
  
  // If environment is empty or mainnet, return just the blockchain
  if (!normalizedEnvironment || normalizedEnvironment === 'mainnet') {
    return normalizedBlockchain;
  }
  
  // If environment is already part of the blockchain identifier (e.g., "polygon-amoy"), return as is
  if (normalizedBlockchain.includes('-')) {
    return normalizedBlockchain;
  }
  
  // Map testnet to specific testnets based on blockchain
  // Default to most recent/recommended testnet for each chain
  const testnetMapping: Record<string, string> = {
    'polygon': 'polygon-amoy',        // Amoy is the current Polygon testnet
    'ethereum': 'ethereum-sepolia',   // Sepolia is the current Ethereum testnet
    'arbitrum': 'arbitrum-sepolia',   // Sepolia is the current Arbitrum testnet
    'optimism': 'optimism-sepolia',   // Sepolia is the current Optimism testnet
    'base': 'base-sepolia',           // Sepolia is the current Base testnet
    'avalanche': 'avalanche-fuji',    // Fuji is the Avalanche testnet
    'bsc': 'bsc-testnet',             // BNB Chain testnet
    'solana': 'solana-devnet',        // Devnet is the Solana testnet
    'bitcoin': 'bitcoin-testnet'      // Bitcoin testnet
  };
  
  // If environment is specifically "testnet", use the default testnet for that blockchain
  if (normalizedEnvironment === 'testnet') {
    return testnetMapping[normalizedBlockchain] || `${normalizedBlockchain}-testnet`;
  }
  
  // Otherwise, combine blockchain with environment
  // Handle cases like "amoy", "mumbai", "sepolia", "fuji", etc.
  return `${normalizedBlockchain}-${normalizedEnvironment}`;
}

/**
 * Parse network identifier into blockchain and environment components
 * @param networkIdentifier Full network identifier (e.g., "polygon-amoy", "ethereum")
 * @returns Object with blockchain and environment
 */
export function parseNetworkIdentifier(networkIdentifier: string): {
  blockchain: string;
  environment: string;
} {
  if (!networkIdentifier) {
    return { blockchain: '', environment: 'mainnet' };
  }
  
  const parts = networkIdentifier.toLowerCase().trim().split('-');
  
  if (parts.length === 1) {
    // No hyphen means mainnet
    return { blockchain: parts[0], environment: 'mainnet' };
  }
  
  // First part is blockchain, rest is environment
  const blockchain = parts[0];
  const environment = parts.slice(1).join('-');
  
  return { blockchain, environment };
}
