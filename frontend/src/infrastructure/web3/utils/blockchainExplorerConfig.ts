/**
 * Blockchain Explorer Configuration
 * Centralized management of blockchain explorer URLs and API integration
 * Supports all chains defined in chainIds.ts
 */

import { getChainInfo, CHAIN_IDS } from './chainIds';

/**
 * Etherscan-compatible API configuration
 * These chains use Etherscan API infrastructure
 */
export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || '';

/**
 * Etherscan-compatible chains with API support
 * Source: https://docs.etherscan.io/supported-chains
 */
const ETHERSCAN_COMPATIBLE_CHAINS: Set<number> = new Set([
  CHAIN_IDS.ethereum,
  CHAIN_IDS.sepolia,
  CHAIN_IDS.holesky,
  CHAIN_IDS.hoodi,
  CHAIN_IDS.arbitrumOne,
  CHAIN_IDS.arbitrumNova,
  CHAIN_IDS.arbitrumSepolia,
  CHAIN_IDS.base,
  CHAIN_IDS.baseSepolia,
  CHAIN_IDS.optimism,
  CHAIN_IDS.optimismSepolia,
  CHAIN_IDS.blast,
  CHAIN_IDS.blastSepolia,
  CHAIN_IDS.scroll,
  CHAIN_IDS.scrollSepolia,
  CHAIN_IDS.polygon,
  CHAIN_IDS.polygonAmoy,
  CHAIN_IDS.bnb,
  CHAIN_IDS.bnbTestnet,
  CHAIN_IDS.avalanche,
  CHAIN_IDS.avalancheFuji,
]);

/**
 * Explorer URL types
 */
export type ExplorerEntityType = 'tx' | 'address' | 'token' | 'block';

/**
 * Get explorer base URL for a chain
 */
export function getExplorerBaseUrl(chainId: number): string | null {
  const chainInfo = getChainInfo(chainId);
  return chainInfo?.explorer || null;
}

/**
 * Get explorer URL for a transaction hash
 */
export function getTransactionUrl(chainId: number, txHash: string): string | null {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl) {
    console.warn(`No explorer configured for chain ID: ${chainId}`);
    return null;
  }

  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 */
export function getAddressUrl(chainId: number, address: string): string | null {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl) {
    console.warn(`No explorer configured for chain ID: ${chainId}`);
    return null;
  }

  return `${baseUrl}/address/${address}`;
}

/**
 * Get explorer URL for a token
 */
export function getTokenUrl(chainId: number, tokenAddress: string): string | null {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl) {
    console.warn(`No explorer configured for chain ID: ${chainId}`);
    return null;
  }

  return `${baseUrl}/token/${tokenAddress}`;
}

/**
 * Get explorer URL for a block
 */
export function getBlockUrl(chainId: number, blockNumber: string | number): string | null {
  const baseUrl = getExplorerBaseUrl(chainId);
  if (!baseUrl) {
    console.warn(`No explorer configured for chain ID: ${chainId}`);
    return null;
  }

  return `${baseUrl}/block/${blockNumber}`;
}

/**
 * Check if chain supports Etherscan API
 */
export function isEtherscanCompatible(chainId: number): boolean {
  return ETHERSCAN_COMPATIBLE_CHAINS.has(chainId);
}

/**
 * Get Etherscan API base URL for a chain
 * Returns null if chain doesn't support Etherscan API
 */
export function getEtherscanApiUrl(chainId: number): string | null {
  if (!isEtherscanCompatible(chainId)) {
    return null;
  }

  // API URL mapping - using type assertion for flexibility
  const apiUrls: Record<number, string> = {
    // Ethereum
    [CHAIN_IDS.ethereum]: 'https://api.etherscan.io/api',
    [CHAIN_IDS.sepolia]: 'https://api-sepolia.etherscan.io/api',
    [CHAIN_IDS.holesky]: 'https://api-holesky.etherscan.io/api',
    [CHAIN_IDS.hoodi]: 'https://api-hoodi.etherscan.io/api',

    // Arbitrum
    [CHAIN_IDS.arbitrumOne]: 'https://api.arbiscan.io/api',
    [CHAIN_IDS.arbitrumNova]: 'https://api-nova.arbiscan.io/api',
    [CHAIN_IDS.arbitrumSepolia]: 'https://api-sepolia.arbiscan.io/api',

    // Base
    [CHAIN_IDS.base]: 'https://api.basescan.org/api',
    [CHAIN_IDS.baseSepolia]: 'https://api-sepolia.basescan.org/api',

    // Optimism
    [CHAIN_IDS.optimism]: 'https://api-optimistic.etherscan.io/api',
    [CHAIN_IDS.optimismSepolia]: 'https://api-sepolia-optimistic.etherscan.io/api',

    // Blast
    [CHAIN_IDS.blast]: 'https://api.blastscan.io/api',
    [CHAIN_IDS.blastSepolia]: 'https://api-sepolia.blastscan.io/api',

    // Scroll
    [CHAIN_IDS.scroll]: 'https://api.scrollscan.com/api',
    [CHAIN_IDS.scrollSepolia]: 'https://api-sepolia.scrollscan.com/api',

    // Polygon
    [CHAIN_IDS.polygon]: 'https://api.polygonscan.com/api',
    [CHAIN_IDS.polygonAmoy]: 'https://api-amoy.polygonscan.com/api',

    // BNB Chain
    [CHAIN_IDS.bnb]: 'https://api.bscscan.com/api',
    [CHAIN_IDS.bnbTestnet]: 'https://api-testnet.bscscan.com/api',

    // Avalanche
    [CHAIN_IDS.avalanche]: 'https://api.snowtrace.io/api',
    [CHAIN_IDS.avalancheFuji]: 'https://api-testnet.snowtrace.io/api',
  };

  return apiUrls[chainId] || null;
}

/**
 * Fetch transaction details from Etherscan API
 */
export async function fetchTransactionDetails(
  chainId: number,
  txHash: string
): Promise<any> {
  const apiUrl = getEtherscanApiUrl(chainId);
  if (!apiUrl) {
    throw new Error(`Chain ${chainId} does not support Etherscan API`);
  }

  if (!ETHERSCAN_API_KEY) {
    console.warn('VITE_ETHERSCAN_API_KEY not configured. API requests may be rate-limited.');
  }

  const url = new URL(apiUrl);
  url.searchParams.set('module', 'proxy');
  url.searchParams.set('action', 'eth_getTransactionByHash');
  url.searchParams.set('txhash', txHash);
  if (ETHERSCAN_API_KEY) {
    url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === '0') {
    throw new Error(data.message || 'Failed to fetch transaction');
  }

  return data.result;
}

/**
 * Fetch transaction receipt from Etherscan API
 */
export async function fetchTransactionReceipt(
  chainId: number,
  txHash: string
): Promise<any> {
  const apiUrl = getEtherscanApiUrl(chainId);
  if (!apiUrl) {
    throw new Error(`Chain ${chainId} does not support Etherscan API`);
  }

  if (!ETHERSCAN_API_KEY) {
    console.warn('VITE_ETHERSCAN_API_KEY not configured. API requests may be rate-limited.');
  }

  const url = new URL(apiUrl);
  url.searchParams.set('module', 'proxy');
  url.searchParams.set('action', 'eth_getTransactionReceipt');
  url.searchParams.set('txhash', txHash);
  if (ETHERSCAN_API_KEY) {
    url.searchParams.set('apikey', ETHERSCAN_API_KEY);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === '0') {
    throw new Error(data.message || 'Failed to fetch receipt');
  }

  return data.result;
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Open explorer URL in new tab
 */
export function openInExplorer(chainId: number, entityType: ExplorerEntityType, identifier: string): void {
  let url: string | null = null;

  switch (entityType) {
    case 'tx':
      url = getTransactionUrl(chainId, identifier);
      break;
    case 'address':
      url = getAddressUrl(chainId, identifier);
      break;
    case 'token':
      url = getTokenUrl(chainId, identifier);
      break;
    case 'block':
      url = getBlockUrl(chainId, identifier);
      break;
  }

  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    console.error(`Failed to generate explorer URL for chain ${chainId}, type ${entityType}`);
  }
}

/**
 * Blockchain Explorer Service
 * Provides a unified interface for all explorer operations
 */
export class BlockchainExplorerService {
  /**
   * Get transaction URL
   */
  static getTransactionUrl(chainId: number, txHash: string): string | null {
    return getTransactionUrl(chainId, txHash);
  }

  /**
   * Get address URL
   */
  static getAddressUrl(chainId: number, address: string): string | null {
    return getAddressUrl(chainId, address);
  }

  /**
   * Get token URL
   */
  static getTokenUrl(chainId: number, tokenAddress: string): string | null {
    return getTokenUrl(chainId, tokenAddress);
  }

  /**
   * Get block URL
   */
  static getBlockUrl(chainId: number, blockNumber: string | number): string | null {
    return getBlockUrl(chainId, blockNumber);
  }

  /**
   * Open transaction in explorer
   */
  static openTransaction(chainId: number, txHash: string): void {
    openInExplorer(chainId, 'tx', txHash);
  }

  /**
   * Open address in explorer
   */
  static openAddress(chainId: number, address: string): void {
    openInExplorer(chainId, 'address', address);
  }

  /**
   * Open token in explorer
   */
  static openToken(chainId: number, tokenAddress: string): void {
    openInExplorer(chainId, 'token', tokenAddress);
  }

  /**
   * Open block in explorer
   */
  static openBlock(chainId: number, blockNumber: string | number): void {
    openInExplorer(chainId, 'block', blockNumber.toString());
  }

  /**
   * Format address for display
   */
  static formatAddress(address: string, startChars?: number, endChars?: number): string {
    return formatAddress(address, startChars, endChars);
  }

  /**
   * Check if chain has explorer support
   */
  static hasExplorerSupport(chainId: number): boolean {
    return getExplorerBaseUrl(chainId) !== null;
  }

  /**
   * Check if chain has Etherscan API support
   */
  static hasEtherscanApiSupport(chainId: number): boolean {
    return isEtherscanCompatible(chainId);
  }
}
