/**
 * Comprehensive Chain ID Mapping
 * Source: https://docs.etherscan.io/supported-chains
 * Last Updated: January 2025
 */

/**
 * Chain type classification
 */
export type ChainType = 'mainnet' | 'testnet';

/**
 * Chain information interface
 */
export interface ChainInfo {
  id: number;
  name: string;
  type: ChainType;
  deprecated?: boolean;
  deprecationDate?: string;
  explorer?: string;
  rpcUrl?: string;
  eip1559?: boolean; // Explicitly mark EIP-1559 support
}

/**
 * All supported chain IDs organized by network
 */
export const CHAIN_IDS = {
  // Ethereum Networks
  ethereum: 1,
  sepolia: 11155111,
  holesky: 17000,
  hoodi: 560048,

  // Layer 2 Networks
  arbitrumOne: 42161,
  arbitrumNova: 42170,
  arbitrumSepolia: 421614,
  base: 8453,
  baseSepolia: 84532,
  optimism: 10,
  optimismSepolia: 11155420,
  blast: 81457,
  blastSepolia: 168587773,
  scroll: 534352,
  scrollSepolia: 534351,
  zkSync: 324,
  zkSyncSepolia: 300,
  polygonZkEvm: 1101,
  polygonZkEvmCardona: 2442,
  linea: 59144,
  lineaSepolia: 59141,
  mantle: 5000,
  mantleSepolia: 5003,
  taiko: 167000,
  taikoHekla: 167009,
  sonic: 146,
  sonicTestnet: 14601,
  unichain: 130,
  unichainSepolia: 1301,
  abstract: 2741,
  abstractSepolia: 11124,
  fraxtal: 252,
  fraxtalTestnet: 2522,
  swellchain: 1923,
  swellchainTestnet: 1924,

  // Polygon Networks
  polygon: 137,
  polygonAmoy: 80002,

  // BNB Chain Networks
  bnb: 56,
  bnbTestnet: 97,
  opBnb: 204,
  opBnbTestnet: 5611,

  // Avalanche Networks
  avalanche: 43114,
  avalancheFuji: 43113,

  // Other Major Networks
  gnosis: 100,
  celo: 42220,
  celoAlfajores: 44787,
  moonbeam: 1284,
  moonriver: 1285,
  moonbaseAlpha: 1287,
  berachain: 80094,
  berachainBepolia: 80069,
  sei: 1329,
  seiTestnet: 1328,
  // Note: Injective uses native chain IDs 'injective-1' and 'injective-888' 
  // EVM compatibility uses different chain IDs - see CHAIN_INFO for details
  injective: 1776, // EVM Chain ID for Injective Mainnet
  injectiveTestnet: 1439, // EVM Chain ID for Injective Testnet
  katana: 747474,
  world: 480,
  worldSepolia: 4801,
  sophon: 50104,
  sophonSepolia: 531050104,
  monad: 10143,

  // Other Networks
  bitTorrent: 199,
  bitTorrentTestnet: 1029,
  xdc: 50,
  xdcApothem: 51,
  hyperEvm: 999,
  apeChain: 33139,
  apeChainCurtis: 33111,
  memecore: 43521,

  // Deprecated Networks (kept for backward compatibility)
  cronos: 25, // Deprecated Oct 6, 2024
} as const;

/**
 * Reverse mapping: chain ID to chain name
 */
export const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  11155111: 'sepolia',
  17000: 'holesky',
  560048: 'hoodi',
  42161: 'arbitrumOne',
  42170: 'arbitrumNova',
  421614: 'arbitrumSepolia',
  8453: 'base',
  84532: 'baseSepolia',
  10: 'optimism',
  11155420: 'optimismSepolia',
  81457: 'blast',
  168587773: 'blastSepolia',
  534352: 'scroll',
  534351: 'scrollSepolia',
  324: 'zkSync',
  300: 'zkSyncSepolia',
  1101: 'polygonZkEvm',
  2442: 'polygonZkEvmCardona',
  59144: 'linea',
  59141: 'lineaSepolia',
  5000: 'mantle',
  5003: 'mantleSepolia',
  167000: 'taiko',
  167009: 'taikoHekla',
  146: 'sonic',
  14601: 'sonicTestnet',
  130: 'unichain',
  1301: 'unichainSepolia',
  2741: 'abstract',
  11124: 'abstractSepolia',
  252: 'fraxtal',
  2522: 'fraxtalTestnet',
  1923: 'swellchain',
  1924: 'swellchainTestnet',
  137: 'polygon',
  80002: 'polygonAmoy',
  56: 'bnb',
  97: 'bnbTestnet',
  204: 'opBnb',
  5611: 'opBnbTestnet',
  43114: 'avalanche',
  43113: 'avalancheFuji',
  100: 'gnosis',
  42220: 'celo',
  44787: 'celoAlfajores',
  1284: 'moonbeam',
  1285: 'moonriver',
  1287: 'moonbaseAlpha',
  80094: 'berachain',
  80069: 'berachainBepolia',
  1329: 'sei',
  1328: 'seiTestnet',
  1776: 'injective',
  1439: 'injectiveTestnet',
  747474: 'katana',
  480: 'world',
  4801: 'worldSepolia',
  50104: 'sophon',
  531050104: 'sophonSepolia',
  10143: 'monad',
  199: 'bitTorrent',
  1029: 'bitTorrentTestnet',
  50: 'xdc',
  51: 'xdcApothem',
  999: 'hyperEvm',
  33139: 'apeChain',
  33111: 'apeChainCurtis',
  43521: 'memecore',
  25: 'cronos',
};

/**
 * Detailed chain information
 */
export const CHAIN_INFO: Record<number, ChainInfo> = {
  // Ethereum Networks
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    type: 'mainnet',
    explorer: 'https://etherscan.io',
    eip1559: true, // London hard fork Aug 2021
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia Testnet',
    type: 'testnet',
    explorer: 'https://sepolia.etherscan.io',
    eip1559: true,
  },
  17000: {
    id: 17000,
    name: 'Holesky Testnet',
    type: 'testnet',
    explorer: 'https://holesky.etherscan.io',
    eip1559: true,
  },
  560048: {
    id: 560048,
    name: 'Hoodi Testnet',
    type: 'testnet',
    explorer: 'https://hoodi.etherscan.io',
    eip1559: true, // Modern testnet with EIP-1559 support
  },

  // Layer 2 Networks - Arbitrum
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    type: 'mainnet',
    explorer: 'https://arbiscan.io',
  },
  42170: {
    id: 42170,
    name: 'Arbitrum Nova',
    type: 'mainnet',
    explorer: 'https://nova.arbiscan.io',
  },
  421614: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.arbiscan.io',
  },

  // Layer 2 Networks - Base
  8453: {
    id: 8453,
    name: 'Base Mainnet',
    type: 'mainnet',
    explorer: 'https://basescan.org',
  },
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.basescan.org',
  },

  // Layer 2 Networks - Optimism
  10: {
    id: 10,
    name: 'OP Mainnet',
    type: 'mainnet',
    explorer: 'https://optimistic.etherscan.io',
  },
  11155420: {
    id: 11155420,
    name: 'OP Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia-optimism.etherscan.io',
  },

  // Layer 2 Networks - Blast
  81457: {
    id: 81457,
    name: 'Blast Mainnet',
    type: 'mainnet',
    explorer: 'https://blastscan.io',
  },
  168587773: {
    id: 168587773,
    name: 'Blast Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.blastscan.io',
  },

  // Layer 2 Networks - Scroll
  534352: {
    id: 534352,
    name: 'Scroll Mainnet',
    type: 'mainnet',
    explorer: 'https://scrollscan.com',
  },
  534351: {
    id: 534351,
    name: 'Scroll Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.scrollscan.com',
  },

  // Layer 2 Networks - zkSync
  324: {
    id: 324,
    name: 'zkSync Era Mainnet',
    type: 'mainnet',
    explorer: 'https://explorer.zksync.io',
  },
  300: {
    id: 300,
    name: 'zkSync Era Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.explorer.zksync.io',
  },

  // Layer 2 Networks - Polygon zkEVM
  1101: {
    id: 1101,
    name: 'Polygon zkEVM',
    type: 'mainnet',
    explorer: 'https://zkevm.polygonscan.com',
  },
  2442: {
    id: 2442,
    name: 'Polygon zkEVM Cardona',
    type: 'testnet',
    explorer: 'https://cardona-zkevm.polygonscan.com',
  },

  // Layer 2 Networks - Linea
  59144: {
    id: 59144,
    name: 'Linea Mainnet',
    type: 'mainnet',
    explorer: 'https://lineascan.build',
  },
  59141: {
    id: 59141,
    name: 'Linea Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.lineascan.build',
  },

  // Layer 2 Networks - Mantle
  5000: {
    id: 5000,
    name: 'Mantle Mainnet',
    type: 'mainnet',
    explorer: 'https://mantlescan.xyz',
  },
  5003: {
    id: 5003,
    name: 'Mantle Sepolia',
    type: 'testnet',
    explorer: 'https://sepolia.mantlescan.xyz',
  },

  // Layer 2 Networks - Taiko
  167000: {
    id: 167000,
    name: 'Taiko Mainnet',
    type: 'mainnet',
    explorer: 'https://taikoscan.io',
  },
  167009: {
    id: 167009,
    name: 'Taiko Hekla',
    type: 'testnet',
    explorer: 'https://hekla.taikoscan.io',
  },

  // Layer 2 Networks - Sonic
  146: {
    id: 146,
    name: 'Sonic Mainnet',
    type: 'mainnet',
  },
  14601: {
    id: 14601,
    name: 'Sonic Testnet',
    type: 'testnet',
  },

  // Layer 2 Networks - Unichain
  130: {
    id: 130,
    name: 'Unichain Mainnet',
    type: 'mainnet',
  },
  1301: {
    id: 1301,
    name: 'Unichain Sepolia',
    type: 'testnet',
  },

  // Layer 2 Networks - Abstract
  2741: {
    id: 2741,
    name: 'Abstract Mainnet',
    type: 'mainnet',
  },
  11124: {
    id: 11124,
    name: 'Abstract Sepolia',
    type: 'testnet',
  },

  // Layer 2 Networks - Fraxtal
  252: {
    id: 252,
    name: 'Fraxtal Mainnet',
    type: 'mainnet',
    explorer: 'https://fraxscan.com',
  },
  2522: {
    id: 2522,
    name: 'Fraxtal Testnet',
    type: 'testnet',
  },

  // Layer 2 Networks - Swellchain
  1923: {
    id: 1923,
    name: 'Swellchain Mainnet',
    type: 'mainnet',
  },
  1924: {
    id: 1924,
    name: 'Swellchain Testnet',
    type: 'testnet',
  },

  // Polygon Networks
  137: {
    id: 137,
    name: 'Polygon Mainnet',
    type: 'mainnet',
    explorer: 'https://polygonscan.com',
  },
  80002: {
    id: 80002,
    name: 'Polygon Amoy',
    type: 'testnet',
    explorer: 'https://amoy.polygonscan.com',
  },

  // BNB Chain Networks
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    type: 'mainnet',
    explorer: 'https://bscscan.com',
  },
  97: {
    id: 97,
    name: 'BNB Testnet',
    type: 'testnet',
    explorer: 'https://testnet.bscscan.com',
  },
  204: {
    id: 204,
    name: 'opBNB Mainnet',
    type: 'mainnet',
    explorer: 'https://opbnbscan.com',
  },
  5611: {
    id: 5611,
    name: 'opBNB Testnet',
    type: 'testnet',
    explorer: 'https://testnet.opbnbscan.com',
  },

  // Avalanche Networks
  43114: {
    id: 43114,
    name: 'Avalanche C-Chain',
    type: 'mainnet',
    explorer: 'https://snowtrace.io',
  },
  43113: {
    id: 43113,
    name: 'Avalanche Fuji',
    type: 'testnet',
    explorer: 'https://testnet.snowtrace.io',
  },

  // Other Major Networks
  100: {
    id: 100,
    name: 'Gnosis',
    type: 'mainnet',
    explorer: 'https://gnosisscan.io',
  },
  42220: {
    id: 42220,
    name: 'Celo Mainnet',
    type: 'mainnet',
    explorer: 'https://celoscan.io',
  },
  44787: {
    id: 44787,
    name: 'Celo Alfajores',
    type: 'testnet',
    explorer: 'https://alfajores.celoscan.io',
  },
  1284: {
    id: 1284,
    name: 'Moonbeam',
    type: 'mainnet',
    explorer: 'https://moonscan.io',
  },
  1285: {
    id: 1285,
    name: 'Moonriver',
    type: 'mainnet',
    explorer: 'https://moonriver.moonscan.io',
  },
  1287: {
    id: 1287,
    name: 'Moonbase Alpha',
    type: 'testnet',
    explorer: 'https://moonbase.moonscan.io',
  },
  80094: {
    id: 80094,
    name: 'Berachain Mainnet',
    type: 'mainnet',
  },
  80069: {
    id: 80069,
    name: 'Berachain Bepolia',
    type: 'testnet',
  },
  1329: {
    id: 1329,
    name: 'Sei Mainnet',
    type: 'mainnet',
  },
  1328: {
    id: 1328,
    name: 'Sei Testnet',
    type: 'testnet',
  },
  1776: {
    id: 1776,
    name: 'Injective Mainnet',
    type: 'mainnet',
    explorer: 'https://blockscout.injective.network',
    rpcUrl: 'https://sentry.evm-rpc.injective.network',
    eip1559: true, // Note: EVM Chain ID 1776 maps to native chain ID 'injective-1'
  },
  1439: {
    id: 1439,
    name: 'Injective Testnet',
    type: 'testnet',
    explorer: 'https://testnet.blockscout.injective.network',
    rpcUrl: 'https://k8s.testnet.json-rpc.injective.network',
    eip1559: true, // Note: EVM Chain ID 1439 maps to native chain ID 'injective-888'
  },
  747474: {
    id: 747474,
    name: 'Katana Mainnet',
    type: 'mainnet',
  },
  480: {
    id: 480,
    name: 'World Mainnet',
    type: 'mainnet',
  },
  4801: {
    id: 4801,
    name: 'World Sepolia',
    type: 'testnet',
  },
  50104: {
    id: 50104,
    name: 'Sophon Mainnet',
    type: 'mainnet',
  },
  531050104: {
    id: 531050104,
    name: 'Sophon Sepolia',
    type: 'testnet',
  },
  10143: {
    id: 10143,
    name: 'Monad Testnet',
    type: 'testnet',
  },

  // Other Networks
  199: {
    id: 199,
    name: 'BitTorrent Chain',
    type: 'mainnet',
    explorer: 'https://bttcscan.com',
  },
  1029: {
    id: 1029,
    name: 'BitTorrent Testnet',
    type: 'testnet',
  },
  50: {
    id: 50,
    name: 'XDC Mainnet',
    type: 'mainnet',
    explorer: 'https://xdcscan.io',
  },
  51: {
    id: 51,
    name: 'XDC Apothem',
    type: 'testnet',
    explorer: 'https://apothem.xdcscan.io',
  },
  999: {
    id: 999,
    name: 'HyperEVM Mainnet',
    type: 'mainnet',
  },
  33139: {
    id: 33139,
    name: 'ApeChain Mainnet',
    type: 'mainnet',
  },
  33111: {
    id: 33111,
    name: 'ApeChain Curtis',
    type: 'testnet',
  },
  43521: {
    id: 43521,
    name: 'Memecore Testnet',
    type: 'testnet',
  },

  // Deprecated Networks
  25: {
    id: 25,
    name: 'Cronos Mainnet',
    type: 'mainnet',
    deprecated: true,
    deprecationDate: '2024-10-06',
    explorer: 'https://cronoscan.com',
  },
};

/**
 * Helper functions
 */

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string | undefined {
  return CHAIN_ID_TO_NAME[chainId];
}

/**
 * Get chain ID from chain name
 */
export function getChainId(chainName: string): number | undefined {
  return CHAIN_IDS[chainName as keyof typeof CHAIN_IDS];
}

/**
 * Get chain information
 */
export function getChainInfo(chainId: number): ChainInfo | undefined {
  return CHAIN_INFO[chainId];
}

/**
 * Check if chain ID is valid
 */
export function isValidChainId(chainId: number): boolean {
  return chainId in CHAIN_ID_TO_NAME;
}

/**
 * Check if chain is a testnet
 */
export function isTestnet(chainId: number): boolean {
  const info = getChainInfo(chainId);
  return info?.type === 'testnet';
}

/**
 * Check if chain is a mainnet
 */
export function isMainnet(chainId: number): boolean {
  const info = getChainInfo(chainId);
  return info?.type === 'mainnet';
}

/**
 * Check if chain is deprecated
 */
export function isDeprecated(chainId: number): boolean {
  const info = getChainInfo(chainId);
  return info?.deprecated === true;
}

/**
 * Get all mainnet chain IDs
 */
export function getMainnetChainIds(): number[] {
  return Object.values(CHAIN_INFO)
    .filter((info) => info.type === 'mainnet' && !info.deprecated)
    .map((info) => info.id);
}

/**
 * Get all testnet chain IDs
 */
export function getTestnetChainIds(): number[] {
  return Object.values(CHAIN_INFO)
    .filter((info) => info.type === 'testnet' && !info.deprecated)
    .map((info) => info.id);
}

/**
 * Get explorer URL for chain
 */
export function getExplorerUrl(chainId: number): string | undefined {
  return getChainInfo(chainId)?.explorer;
}

/**
 * Format chain ID as hex string (for wallet connections)
 */
export function chainIdToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

/**
 * Parse hex chain ID to number
 */
export function hexToChainId(hex: string): number {
  return parseInt(hex, 16);
}

/**
 * Get all supported chain IDs
 */
export function getAllChainIds(): number[] {
  return Object.keys(CHAIN_ID_TO_NAME).map(Number);
}

/**
 * Group chains by category
 */
export function getChainsByCategory(): Record<string, number[]> {
  return {
    ethereum: [1, 11155111, 17000, 560048],
    arbitrum: [42161, 42170, 421614],
    base: [8453, 84532],
    optimism: [10, 11155420],
    blast: [81457, 168587773],
    scroll: [534352, 534351],
    zkSync: [324, 300],
    polygonZkEvm: [1101, 2442],
    linea: [59144, 59141],
    mantle: [5000, 5003],
    taiko: [167000, 167009],
    sonic: [146, 14601],
    unichain: [130, 1301],
    abstract: [2741, 11124],
    fraxtal: [252, 2522],
    swellchain: [1923, 1924],
    polygon: [137, 80002],
    bnb: [56, 97, 204, 5611],
    avalanche: [43114, 43113],
    celo: [42220, 44787],
    moonbeam: [1284, 1285, 1287],
    injective: [1776, 1439],
    other: [
      100, 199, 1029, 50, 51, 999, 33139, 33111, 43521, 80094, 80069, 1329,
      1328, 747474, 480, 4801, 50104, 531050104, 10143,
    ],
  };
}

/**
 * Check if chain supports EIP-1559
 */
export function isEIP1559Supported(chainId: number): boolean {
  const info = getChainInfo(chainId);
  // Default to true for modern chains if not explicitly set
  // EIP-1559 was introduced in August 2021, most chains support it
  return info?.eip1559 ?? true;
}

/**
 * Check if chain explicitly has EIP-1559 marked in metadata
 */
export function hasExplicitEIP1559Flag(chainId: number): boolean {
  const info = getChainInfo(chainId);
  return info?.eip1559 === true;
}
