/**
 * Explorer Helper Functions
 * Provides utility functions for generating block explorer URLs including verification links
 */

import { BlockchainExplorerService } from './blockchainExplorerConfig';
import { CHAIN_IDS, getChainInfo } from './chainIds';

/**
 * Get chain ID from network name and environment
 * @param network Network name (e.g., 'ethereum', 'polygon', 'hoodi')
 * @param environment Environment ('mainnet' or 'testnet')
 * @returns Chain ID or null if not found
 */
export function getChainIdFromNetwork(network: string, environment: string = 'mainnet'): number | null {
  const normalizedNetwork = network.toLowerCase();
  const isTestnet = environment.toLowerCase() === 'testnet';

  // Map network names to chain IDs
  const networkMap: Record<string, { mainnet: number; testnet: number }> = {
    ethereum: { mainnet: CHAIN_IDS.ethereum, testnet: CHAIN_IDS.sepolia },
    eth: { mainnet: CHAIN_IDS.ethereum, testnet: CHAIN_IDS.sepolia },
    sepolia: { mainnet: CHAIN_IDS.sepolia, testnet: CHAIN_IDS.sepolia },
    holesky: { mainnet: CHAIN_IDS.holesky, testnet: CHAIN_IDS.holesky },
    hoodi: { mainnet: CHAIN_IDS.hoodi, testnet: CHAIN_IDS.hoodi },
    
    arbitrum: { mainnet: CHAIN_IDS.arbitrumOne, testnet: CHAIN_IDS.arbitrumSepolia },
    arb: { mainnet: CHAIN_IDS.arbitrumOne, testnet: CHAIN_IDS.arbitrumSepolia },
    
    base: { mainnet: CHAIN_IDS.base, testnet: CHAIN_IDS.baseSepolia },
    
    optimism: { mainnet: CHAIN_IDS.optimism, testnet: CHAIN_IDS.optimismSepolia },
    op: { mainnet: CHAIN_IDS.optimism, testnet: CHAIN_IDS.optimismSepolia },
    
    blast: { mainnet: CHAIN_IDS.blast, testnet: CHAIN_IDS.blastSepolia },
    
    scroll: { mainnet: CHAIN_IDS.scroll, testnet: CHAIN_IDS.scrollSepolia },
    
    polygon: { mainnet: CHAIN_IDS.polygon, testnet: CHAIN_IDS.polygonAmoy },
    matic: { mainnet: CHAIN_IDS.polygon, testnet: CHAIN_IDS.polygonAmoy },
    
    bnb: { mainnet: CHAIN_IDS.bnb, testnet: CHAIN_IDS.bnbTestnet },
    bsc: { mainnet: CHAIN_IDS.bnb, testnet: CHAIN_IDS.bnbTestnet },
    
    avalanche: { mainnet: CHAIN_IDS.avalanche, testnet: CHAIN_IDS.avalancheFuji },
    avax: { mainnet: CHAIN_IDS.avalanche, testnet: CHAIN_IDS.avalancheFuji },
  };

  const mapping = networkMap[normalizedNetwork];
  if (!mapping) {
    console.warn(`Unknown network: ${network}`);
    return null;
  }

  return isTestnet ? mapping.testnet : mapping.mainnet;
}

/**
 * Get contract verification URL for Etherscan-compatible explorers
 * @param chainId Chain ID
 * @param contractAddress Contract address
 * @returns Verification URL or null if not supported
 */
export function getContractVerificationUrl(chainId: number, contractAddress: string): string | null {
  const baseUrl = BlockchainExplorerService.getAddressUrl(chainId, contractAddress);
  if (!baseUrl) {
    return null;
  }

  // For Etherscan-compatible explorers, add #code to go to the verification tab
  // This works for Etherscan, Polygonscan, Arbiscan, Basescan, Optimism Etherscan, etc.
  return `${baseUrl}#code`;
}

/**
 * Get contract verification URL by network name
 * @param network Network name
 * @param environment Environment ('mainnet' or 'testnet')
 * @param contractAddress Contract address
 * @returns Verification URL or null if not supported
 */
export function getVerificationUrlByNetwork(
  network: string,
  environment: string,
  contractAddress: string
): string | null {
  const chainId = getChainIdFromNetwork(network, environment);
  if (!chainId) {
    return null;
  }

  return getContractVerificationUrl(chainId, contractAddress);
}

/**
 * Open contract verification page in new tab
 * @param chainId Chain ID
 * @param contractAddress Contract address
 */
export function openContractVerification(chainId: number, contractAddress: string): void {
  const url = getContractVerificationUrl(chainId, contractAddress);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    console.error(`Cannot open verification for chain ${chainId}`);
  }
}

/**
 * Get transaction URL by network name
 * @param network Network name
 * @param environment Environment ('mainnet' or 'testnet')
 * @param txHash Transaction hash
 * @returns Transaction URL or null if not supported
 */
export function getTransactionUrlByNetwork(
  network: string,
  environment: string,
  txHash: string
): string | null {
  const chainId = getChainIdFromNetwork(network, environment);
  if (!chainId) {
    return null;
  }

  return BlockchainExplorerService.getTransactionUrl(chainId, txHash);
}

/**
 * Get address URL by network name
 * @param network Network name
 * @param environment Environment ('mainnet' or 'testnet')
 * @param address Address
 * @returns Address URL or null if not supported
 */
export function getAddressUrlByNetwork(
  network: string,
  environment: string,
  address: string
): string | null {
  const chainId = getChainIdFromNetwork(network, environment);
  if (!chainId) {
    return null;
  }

  return BlockchainExplorerService.getAddressUrl(chainId, address);
}
