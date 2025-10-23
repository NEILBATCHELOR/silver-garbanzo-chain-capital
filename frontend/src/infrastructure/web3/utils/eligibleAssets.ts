/**
 * Eligible Assets Mapping Service
 * Maps chain IDs to accepted, compatible, eligible assets for deposits and transfers
 * Source: BLOCKCHAIN_ELIGIBLE_ASSETS_REFERENCE.md
 * Last Updated: October 2025
 */

import { CHAIN_IDS } from './chainIds';

/**
 * Asset type classification
 */
export type AssetType = 'native' | 'stablecoin' | 'wrapped' | 'governance' | 'defi';

/**
 * Asset information interface
 */
export interface AssetInfo {
  symbol: string;
  type: AssetType;
  name?: string;
  decimals?: number;
  contractAddress?: string;
}

/**
 * Chain eligible assets configuration
 */
export interface ChainEligibleAssets {
  chainId: number;
  chainName: string;
  nativeAsset: AssetInfo;
  stablecoins: AssetInfo[];
  otherAssets?: AssetInfo[];
}

/**
 * Standard stablecoin definitions
 */
const USDT: AssetInfo = {
  symbol: 'USDT',
  type: 'stablecoin',
  name: 'Tether USD',
  decimals: 6,
};

const USDC: AssetInfo = {
  symbol: 'USDC',
  type: 'stablecoin',
  name: 'USD Coin',
  decimals: 6,
};

/**
 * Native asset definitions by symbol
 */
const NATIVE_ASSETS: Record<string, Omit<AssetInfo, 'type'>> = {
  ETH: { symbol: 'ETH', name: 'Ether', decimals: 18 },
  MNT: { symbol: 'MNT', name: 'Mantle', decimals: 18 },
  S: { symbol: 'S', name: 'Sonic', decimals: 18 },
  FRAX: { symbol: 'FRAX', name: 'Frax Ether', decimals: 18 },
  POL: { symbol: 'POL', name: 'Polygon', decimals: 18 },
  BNB: { symbol: 'BNB', name: 'BNB', decimals: 18 },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
  xDAI: { symbol: 'xDAI', name: 'xDAI', decimals: 18 },
  CELO: { symbol: 'CELO', name: 'Celo', decimals: 18 },
  GLMR: { symbol: 'GLMR', name: 'Glimmer', decimals: 18 },
  MOVR: { symbol: 'MOVR', name: 'Moonriver', decimals: 18 },
  DEV: { symbol: 'DEV', name: 'Dev Token', decimals: 18 },
  BERA: { symbol: 'BERA', name: 'Berachain', decimals: 18 },
  SEI: { symbol: 'SEI', name: 'Sei', decimals: 18 },
  SOPH: { symbol: 'SOPH', name: 'Sophon', decimals: 18 },
  MON: { symbol: 'MON', name: 'Monad', decimals: 18 },
  BTT: { symbol: 'BTT', name: 'BitTorrent', decimals: 18 },
  XDC: { symbol: 'XDC', name: 'XDC Network', decimals: 18 },
  HYPE: { symbol: 'HYPE', name: 'HyperEVM', decimals: 18 },
  APE: { symbol: 'APE', name: 'ApeCoin', decimals: 18 },
  M: { symbol: 'M', name: 'Memecore', decimals: 18 },
};

/**
 * Helper to create native asset with type
 */
const createNativeAsset = (symbol: string): AssetInfo => ({
  ...NATIVE_ASSETS[symbol],
  type: 'native',
});

/**
 * Comprehensive mapping of chain IDs to eligible assets
 */
export const CHAIN_ELIGIBLE_ASSETS: Record<number, ChainEligibleAssets> = {
  // Ethereum Networks
  [CHAIN_IDS.ethereum]: {
    chainId: CHAIN_IDS.ethereum,
    chainName: 'ethereum',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.sepolia]: {
    chainId: CHAIN_IDS.sepolia,
    chainName: 'sepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.holesky]: {
    chainId: CHAIN_IDS.holesky,
    chainName: 'holesky',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.hoodi]: {
    chainId: CHAIN_IDS.hoodi,
    chainName: 'hoodi',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Arbitrum Networks
  [CHAIN_IDS.arbitrumOne]: {
    chainId: CHAIN_IDS.arbitrumOne,
    chainName: 'arbitrumOne',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.arbitrumNova]: {
    chainId: CHAIN_IDS.arbitrumNova,
    chainName: 'arbitrumNova',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.arbitrumSepolia]: {
    chainId: CHAIN_IDS.arbitrumSepolia,
    chainName: 'arbitrumSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Base Networks
  [CHAIN_IDS.base]: {
    chainId: CHAIN_IDS.base,
    chainName: 'base',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.baseSepolia]: {
    chainId: CHAIN_IDS.baseSepolia,
    chainName: 'baseSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Optimism Networks
  [CHAIN_IDS.optimism]: {
    chainId: CHAIN_IDS.optimism,
    chainName: 'optimism',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.optimismSepolia]: {
    chainId: CHAIN_IDS.optimismSepolia,
    chainName: 'optimismSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Blast Networks
  [CHAIN_IDS.blast]: {
    chainId: CHAIN_IDS.blast,
    chainName: 'blast',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.blastSepolia]: {
    chainId: CHAIN_IDS.blastSepolia,
    chainName: 'blastSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Scroll Networks
  [CHAIN_IDS.scroll]: {
    chainId: CHAIN_IDS.scroll,
    chainName: 'scroll',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.scrollSepolia]: {
    chainId: CHAIN_IDS.scrollSepolia,
    chainName: 'scrollSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // zkSync Networks
  [CHAIN_IDS.zkSync]: {
    chainId: CHAIN_IDS.zkSync,
    chainName: 'zkSync',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.zkSyncSepolia]: {
    chainId: CHAIN_IDS.zkSyncSepolia,
    chainName: 'zkSyncSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Polygon zkEVM Networks
  [CHAIN_IDS.polygonZkEvm]: {
    chainId: CHAIN_IDS.polygonZkEvm,
    chainName: 'polygonZkEvm',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.polygonZkEvmCardona]: {
    chainId: CHAIN_IDS.polygonZkEvmCardona,
    chainName: 'polygonZkEvmCardona',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Linea Networks
  [CHAIN_IDS.linea]: {
    chainId: CHAIN_IDS.linea,
    chainName: 'linea',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.lineaSepolia]: {
    chainId: CHAIN_IDS.lineaSepolia,
    chainName: 'lineaSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Mantle Networks
  [CHAIN_IDS.mantle]: {
    chainId: CHAIN_IDS.mantle,
    chainName: 'mantle',
    nativeAsset: createNativeAsset('MNT'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.mantleSepolia]: {
    chainId: CHAIN_IDS.mantleSepolia,
    chainName: 'mantleSepolia',
    nativeAsset: createNativeAsset('MNT'),
    stablecoins: [USDT, USDC],
  },

  // Taiko Networks
  [CHAIN_IDS.taiko]: {
    chainId: CHAIN_IDS.taiko,
    chainName: 'taiko',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.taikoHekla]: {
    chainId: CHAIN_IDS.taikoHekla,
    chainName: 'taikoHekla',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Sonic Networks
  [CHAIN_IDS.sonic]: {
    chainId: CHAIN_IDS.sonic,
    chainName: 'sonic',
    nativeAsset: createNativeAsset('S'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.sonicTestnet]: {
    chainId: CHAIN_IDS.sonicTestnet,
    chainName: 'sonicTestnet',
    nativeAsset: createNativeAsset('S'),
    stablecoins: [USDT, USDC],
  },

  // Unichain Networks
  [CHAIN_IDS.unichain]: {
    chainId: CHAIN_IDS.unichain,
    chainName: 'unichain',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.unichainSepolia]: {
    chainId: CHAIN_IDS.unichainSepolia,
    chainName: 'unichainSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Abstract Networks
  [CHAIN_IDS.abstract]: {
    chainId: CHAIN_IDS.abstract,
    chainName: 'abstract',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.abstractSepolia]: {
    chainId: CHAIN_IDS.abstractSepolia,
    chainName: 'abstractSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Fraxtal Networks
  [CHAIN_IDS.fraxtal]: {
    chainId: CHAIN_IDS.fraxtal,
    chainName: 'fraxtal',
    nativeAsset: createNativeAsset('FRAX'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.fraxtalTestnet]: {
    chainId: CHAIN_IDS.fraxtalTestnet,
    chainName: 'fraxtalTestnet',
    nativeAsset: createNativeAsset('FRAX'),
    stablecoins: [USDT, USDC],
  },

  // Swellchain Networks
  [CHAIN_IDS.swellchain]: {
    chainId: CHAIN_IDS.swellchain,
    chainName: 'swellchain',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.swellchainTestnet]: {
    chainId: CHAIN_IDS.swellchainTestnet,
    chainName: 'swellchainTestnet',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },

  // Polygon Networks
  [CHAIN_IDS.polygon]: {
    chainId: CHAIN_IDS.polygon,
    chainName: 'polygon',
    nativeAsset: createNativeAsset('POL'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.polygonAmoy]: {
    chainId: CHAIN_IDS.polygonAmoy,
    chainName: 'polygonAmoy',
    nativeAsset: createNativeAsset('POL'),
    stablecoins: [USDT, USDC],
  },

  // BNB Chain Networks
  [CHAIN_IDS.bnb]: {
    chainId: CHAIN_IDS.bnb,
    chainName: 'bnb',
    nativeAsset: createNativeAsset('BNB'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.bnbTestnet]: {
    chainId: CHAIN_IDS.bnbTestnet,
    chainName: 'bnbTestnet',
    nativeAsset: createNativeAsset('BNB'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.opBnb]: {
    chainId: CHAIN_IDS.opBnb,
    chainName: 'opBnb',
    nativeAsset: createNativeAsset('BNB'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.opBnbTestnet]: {
    chainId: CHAIN_IDS.opBnbTestnet,
    chainName: 'opBnbTestnet',
    nativeAsset: createNativeAsset('BNB'),
    stablecoins: [USDT, USDC],
  },

  // Avalanche Networks
  [CHAIN_IDS.avalanche]: {
    chainId: CHAIN_IDS.avalanche,
    chainName: 'avalanche',
    nativeAsset: createNativeAsset('AVAX'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.avalancheFuji]: {
    chainId: CHAIN_IDS.avalancheFuji,
    chainName: 'avalancheFuji',
    nativeAsset: createNativeAsset('AVAX'),
    stablecoins: [USDT, USDC],
  },

  // Other Major Networks
  [CHAIN_IDS.gnosis]: {
    chainId: CHAIN_IDS.gnosis,
    chainName: 'gnosis',
    nativeAsset: createNativeAsset('xDAI'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.celo]: {
    chainId: CHAIN_IDS.celo,
    chainName: 'celo',
    nativeAsset: createNativeAsset('CELO'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.celoAlfajores]: {
    chainId: CHAIN_IDS.celoAlfajores,
    chainName: 'celoAlfajores',
    nativeAsset: createNativeAsset('CELO'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.moonbeam]: {
    chainId: CHAIN_IDS.moonbeam,
    chainName: 'moonbeam',
    nativeAsset: createNativeAsset('GLMR'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.moonriver]: {
    chainId: CHAIN_IDS.moonriver,
    chainName: 'moonriver',
    nativeAsset: createNativeAsset('MOVR'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.moonbaseAlpha]: {
    chainId: CHAIN_IDS.moonbaseAlpha,
    chainName: 'moonbaseAlpha',
    nativeAsset: createNativeAsset('DEV'),
    stablecoins: [], // No stablecoins listed in the reference
  },
  [CHAIN_IDS.berachain]: {
    chainId: CHAIN_IDS.berachain,
    chainName: 'berachain',
    nativeAsset: createNativeAsset('BERA'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.berachainBepolia]: {
    chainId: CHAIN_IDS.berachainBepolia,
    chainName: 'berachainBepolia',
    nativeAsset: createNativeAsset('BERA'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.sei]: {
    chainId: CHAIN_IDS.sei,
    chainName: 'sei',
    nativeAsset: createNativeAsset('SEI'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.seiTestnet]: {
    chainId: CHAIN_IDS.seiTestnet,
    chainName: 'seiTestnet',
    nativeAsset: createNativeAsset('SEI'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.katana]: {
    chainId: CHAIN_IDS.katana,
    chainName: 'katana',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.world]: {
    chainId: CHAIN_IDS.world,
    chainName: 'world',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.worldSepolia]: {
    chainId: CHAIN_IDS.worldSepolia,
    chainName: 'worldSepolia',
    nativeAsset: createNativeAsset('ETH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.sophon]: {
    chainId: CHAIN_IDS.sophon,
    chainName: 'sophon',
    nativeAsset: createNativeAsset('SOPH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.sophonSepolia]: {
    chainId: CHAIN_IDS.sophonSepolia,
    chainName: 'sophonSepolia',
    nativeAsset: createNativeAsset('SOPH'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.monad]: {
    chainId: CHAIN_IDS.monad,
    chainName: 'monad',
    nativeAsset: createNativeAsset('MON'),
    stablecoins: [USDT, USDC],
  },

  // Specialized/Other Networks
  [CHAIN_IDS.bitTorrent]: {
    chainId: CHAIN_IDS.bitTorrent,
    chainName: 'bitTorrent',
    nativeAsset: createNativeAsset('BTT'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.bitTorrentTestnet]: {
    chainId: CHAIN_IDS.bitTorrentTestnet,
    chainName: 'bitTorrentTestnet',
    nativeAsset: createNativeAsset('BTT'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.xdc]: {
    chainId: CHAIN_IDS.xdc,
    chainName: 'xdc',
    nativeAsset: createNativeAsset('XDC'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.xdcApothem]: {
    chainId: CHAIN_IDS.xdcApothem,
    chainName: 'xdcApothem',
    nativeAsset: createNativeAsset('XDC'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.hyperEvm]: {
    chainId: CHAIN_IDS.hyperEvm,
    chainName: 'hyperEvm',
    nativeAsset: createNativeAsset('HYPE'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.apeChain]: {
    chainId: CHAIN_IDS.apeChain,
    chainName: 'apeChain',
    nativeAsset: createNativeAsset('APE'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.apeChainCurtis]: {
    chainId: CHAIN_IDS.apeChainCurtis,
    chainName: 'apeChainCurtis',
    nativeAsset: createNativeAsset('APE'),
    stablecoins: [USDT, USDC],
  },
  [CHAIN_IDS.memecore]: {
    chainId: CHAIN_IDS.memecore,
    chainName: 'memecore',
    nativeAsset: createNativeAsset('M'),
    stablecoins: [USDT, USDC],
  },
};

/**
 * Helper Functions
 */

/**
 * Get eligible assets for a specific chain
 * @param chainId - The chain ID to query
 * @returns Chain eligible assets or undefined if chain not found
 */
export function getEligibleAssets(chainId: number): ChainEligibleAssets | undefined {
  return CHAIN_ELIGIBLE_ASSETS[chainId];
}

/**
 * Get native asset for a specific chain
 * @param chainId - The chain ID to query
 * @returns Native asset info or undefined if chain not found
 */
export function getNativeAsset(chainId: number): AssetInfo | undefined {
  return CHAIN_ELIGIBLE_ASSETS[chainId]?.nativeAsset;
}

/**
 * Get stablecoins for a specific chain
 * @param chainId - The chain ID to query
 * @returns Array of stablecoin asset info or empty array if chain not found
 */
export function getStablecoins(chainId: number): AssetInfo[] {
  return CHAIN_ELIGIBLE_ASSETS[chainId]?.stablecoins || [];
}

/**
 * Get all assets (native + stablecoins + other) for a specific chain
 * @param chainId - The chain ID to query
 * @returns Array of all asset info or empty array if chain not found
 */
export function getAllAssets(chainId: number): AssetInfo[] {
  const chainAssets = CHAIN_ELIGIBLE_ASSETS[chainId];
  if (!chainAssets) return [];

  return [
    chainAssets.nativeAsset,
    ...chainAssets.stablecoins,
    ...(chainAssets.otherAssets || []),
  ];
}

/**
 * Check if a chain supports a specific asset by symbol
 * @param chainId - The chain ID to query
 * @param assetSymbol - The asset symbol to check (e.g., 'USDT', 'ETH')
 * @returns True if the asset is supported on this chain
 */
export function supportsAsset(chainId: number, assetSymbol: string): boolean {
  const assets = getAllAssets(chainId);
  return assets.some((asset) => asset.symbol === assetSymbol);
}

/**
 * Check if a chain supports stablecoins (USDT or USDC)
 * @param chainId - The chain ID to query
 * @returns True if the chain supports at least one major stablecoin
 */
export function supportsStablecoins(chainId: number): boolean {
  const stablecoins = getStablecoins(chainId);
  return stablecoins.length > 0;
}

/**
 * Get native asset symbol for a specific chain
 * @param chainId - The chain ID to query
 * @returns Native asset symbol or undefined if chain not found
 */
export function getNativeAssetSymbol(chainId: number): string | undefined {
  return getNativeAsset(chainId)?.symbol;
}

/**
 * Get all chain IDs that support a specific asset
 * @param assetSymbol - The asset symbol to search for (e.g., 'USDT', 'ETH')
 * @returns Array of chain IDs that support this asset
 */
export function getChainsForAsset(assetSymbol: string): number[] {
  return Object.keys(CHAIN_ELIGIBLE_ASSETS)
    .map(Number)
    .filter((chainId) => supportsAsset(chainId, assetSymbol));
}

/**
 * Get all chain IDs that use a specific native asset
 * @param nativeAssetSymbol - The native asset symbol (e.g., 'ETH', 'BNB')
 * @returns Array of chain IDs with this native asset
 */
export function getChainsWithNativeAsset(nativeAssetSymbol: string): number[] {
  return Object.entries(CHAIN_ELIGIBLE_ASSETS)
    .filter(([, config]) => config.nativeAsset.symbol === nativeAssetSymbol)
    .map(([chainId]) => Number(chainId));
}

/**
 * Check if a specific asset is a native asset on any chain
 * @param assetSymbol - The asset symbol to check
 * @returns True if this asset is native on at least one chain
 */
export function isNativeAsset(assetSymbol: string): boolean {
  return Object.values(CHAIN_ELIGIBLE_ASSETS).some(
    (config) => config.nativeAsset.symbol === assetSymbol
  );
}

/**
 * Get asset type for a specific asset on a specific chain
 * @param chainId - The chain ID to query
 * @param assetSymbol - The asset symbol to check
 * @returns Asset type or undefined if asset not found on chain
 */
export function getAssetType(chainId: number, assetSymbol: string): AssetType | undefined {
  const assets = getAllAssets(chainId);
  return assets.find((asset) => asset.symbol === assetSymbol)?.type;
}

/**
 * Check if two chains share compatible assets (for cross-chain transfers)
 * @param fromChainId - Source chain ID
 * @param toChainId - Destination chain ID
 * @returns Array of asset symbols that exist on both chains
 */
export function getCompatibleAssets(fromChainId: number, toChainId: number): string[] {
  const fromAssets = getAllAssets(fromChainId);
  const toAssets = getAllAssets(toChainId);

  return fromAssets
    .filter((fromAsset) => 
      toAssets.some((toAsset) => toAsset.symbol === fromAsset.symbol)
    )
    .map((asset) => asset.symbol);
}

/**
 * Get summary statistics about eligible assets across all chains
 * @returns Statistics object with asset counts and coverage
 */
export function getAssetStatistics() {
  const allChainIds = Object.keys(CHAIN_ELIGIBLE_ASSETS).map(Number);
  
  const nativeAssetCounts: Record<string, number> = {};
  const stablecoinSupport = {
    usdt: 0,
    usdc: 0,
    both: 0,
    none: 0,
  };

  allChainIds.forEach((chainId) => {
    const config = CHAIN_ELIGIBLE_ASSETS[chainId];
    
    // Count native assets
    const nativeSymbol = config.nativeAsset.symbol;
    nativeAssetCounts[nativeSymbol] = (nativeAssetCounts[nativeSymbol] || 0) + 1;
    
    // Count stablecoin support
    const hasUsdt = config.stablecoins.some((s) => s.symbol === 'USDT');
    const hasUsdc = config.stablecoins.some((s) => s.symbol === 'USDC');
    
    if (hasUsdt && hasUsdc) stablecoinSupport.both++;
    else if (hasUsdt) stablecoinSupport.usdt++;
    else if (hasUsdc) stablecoinSupport.usdc++;
    else stablecoinSupport.none++;
  });

  return {
    totalChains: allChainIds.length,
    nativeAssets: nativeAssetCounts,
    stablecoinSupport,
    uniqueNativeAssets: Object.keys(nativeAssetCounts).length,
  };
}

/**
 * Validate if a chain and asset combination is eligible for operations
 * @param chainId - The chain ID to validate
 * @param assetSymbol - The asset symbol to validate
 * @returns Validation result with success flag and optional error message
 */
export function validateChainAsset(
  chainId: number,
  assetSymbol: string
): { valid: boolean; error?: string } {
  const chainAssets = getEligibleAssets(chainId);

  if (!chainAssets) {
    return {
      valid: false,
      error: `Chain ID ${chainId} is not configured in the eligible assets system`,
    };
  }

  if (!supportsAsset(chainId, assetSymbol)) {
    return {
      valid: false,
      error: `Asset ${assetSymbol} is not supported on chain ${chainAssets.chainName} (${chainId})`,
    };
  }

  return { valid: true };
}
