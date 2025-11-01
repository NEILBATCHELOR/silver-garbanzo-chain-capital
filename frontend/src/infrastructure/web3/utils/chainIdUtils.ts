/**
 * Utility function to convert Chain ID to blockchain name and network type
 * This provides backwards compatibility with services expecting blockchain + environment parameters
 */

import { CHAIN_ID_TO_NAME, CHAIN_INFO, ChainType } from './chainIds';

export interface ChainIdConversion {
  blockchain: string;
  environment: 'mainnet' | 'testnet';
  chainId: number;
  chainName: string;
}

/**
 * Convert chain ID to blockchain and environment
 * @param chainId The numeric chain ID
 * @returns Blockchain name and environment
 */
export function chainIdToBlockchainAndEnvironment(chainId: number): ChainIdConversion {
  const chainName = CHAIN_ID_TO_NAME[chainId];
  const chainInfo = CHAIN_INFO[chainId];
  
  if (!chainName || !chainInfo) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  
  // Extract base blockchain name (remove testnet suffixes)
  let blockchain = chainName;
  
  // Map specific testnet names to their mainnet equivalents
  const testnetMappings: Record<string, string> = {
    'sepolia': 'ethereum',
    'holesky': 'ethereum',
    'hoodi': 'ethereum',
    'arbitrumSepolia': 'arbitrum',
    'baseSepolia': 'base',
    'optimismSepolia': 'optimism',
    'blastSepolia': 'blast',
    'scrollSepolia': 'scroll',
    'zkSyncSepolia': 'zksync',
    'polygonZkEvmCardona': 'polygonzkevm',
    'lineaSepolia': 'linea',
    'mantleSepolia': 'mantle',
    'taikoHekla': 'taiko',
    'sonicTestnet': 'sonic',
    'unichainSepolia': 'unichain',
    'abstractSepolia': 'abstract',
    'fraxtalTestnet': 'fraxtal',
    'swellchainTestnet': 'swellchain',
    'polygonAmoy': 'polygon',
    'bnbTestnet': 'bnb',
    'opBnbTestnet': 'opbnb',
    'avalancheFuji': 'avalanche',
    'celoAlfajores': 'celo',
    'moonbaseAlpha': 'moonbeam',
    'berachainBepolia': 'berachain',
    'seiTestnet': 'sei',
    'injectiveTestnet': 'injective',
    'worldSepolia': 'world',
    'sophonSepolia': 'sophon',
    'bitTorrentTestnet': 'bittorrent',
    'xdcApothem': 'xdc',
    'apeChainCurtis': 'apechain',
  };
  
  if (testnetMappings[chainName]) {
    blockchain = testnetMappings[chainName];
  }
  
  // Determine environment from chain info
  const environment: 'mainnet' | 'testnet' = chainInfo.type === 'mainnet' ? 'mainnet' : 'testnet';
  
  return {
    blockchain,
    environment,
    chainId,
    chainName: chainInfo.name
  };
}

/**
 * Get provider-friendly blockchain name from chain ID
 * @param chainId The numeric chain ID
 * @returns Blockchain name suitable for provider selection
 */
export function getBlockchainFromChainId(chainId: number): string {
  const conversion = chainIdToBlockchainAndEnvironment(chainId);
  return conversion.blockchain;
}

/**
 * Get environment from chain ID
 * @param chainId The numeric chain ID
 * @returns Environment ('mainnet' or 'testnet')
 */
export function getEnvironmentFromChainId(chainId: number): 'mainnet' | 'testnet' {
  const conversion = chainIdToBlockchainAndEnvironment(chainId);
  return conversion.environment;
}
