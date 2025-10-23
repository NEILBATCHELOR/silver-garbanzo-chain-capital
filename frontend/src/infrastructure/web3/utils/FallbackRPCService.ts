/**
 * Fallback RPC Service
 * 
 * Provides free, public RPC endpoints as fallback when primary RPC manager
 * cannot establish a connection. Organized by chain ID with multiple fallback
 * options for resilience.
 * 
 * Source: Fallback RPCs by Chain ID documentation
 * Last Updated: October 2025
 * 
 * Integration: Works with RPCConnectionManager to provide seamless fallback
 * when configured RPCs are unavailable
 */

import { CHAIN_IDS, getChainName, type ChainInfo } from './chainIds';

/**
 * Fallback RPC configuration interface
 */
export interface FallbackRPCConfig {
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  hasUrls: boolean;
}

/**
 * Result of attempting to get a working RPC
 */
export interface FallbackRPCResult {
  url: string | null;
  chainId: number;
  chainName: string;
  isFallback: boolean;
  attemptedUrls: string[];
  error?: string;
}

/**
 * Comprehensive fallback RPC URLs organized by chain ID
 * All URLs are free, public endpoints from the documentation
 */
const FALLBACK_RPC_URLS: Record<number, string[]> = {
  // Ethereum Networks
  [CHAIN_IDS.ethereum]: [
    'https://ethereum.publicnode.com',
    'https://0xrpc.io/eth',
    'https://1rpc.io/eth',
    'https://eth-mainnet.public.blastapi.io',
    'https://eth.rpc.grove.city/v1/01fdb492',
    'https://public-eth.nownodes.io'
  ],
  [CHAIN_IDS.sepolia]: [
    'https://ethereum-sepolia.publicnode.com',
    'https://eth-sepolia-testnet.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.holesky]: [
    'https://ethereum-holesky.publicnode.com',
    'https://1rpc.io/holesky',
    'https://eth-holesky.public.blastapi.io',
    'https://holesky.drpc.org/',
    'https://holesky.rpc.hypersync.xyz/',
    'https://eth-holesky-testnet.rpc.grove.city/v1/01fdb492',
    'https://holesky.gateway.tenderly.co',
    'https://holesky.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.hoodi]: [
    'https://ethereum-hoodi.publicnode.com',
    'https://0xrpc.io/hoodi',
    'https://hoodi.drpc.org/',
    'https://hoodi.gateway.tenderly.co'
  ],

  // Arbitrum Networks
  [CHAIN_IDS.arbitrumOne]: [
    'https://arbitrum-one.publicnode.com',
    'https://1rpc.io/arb',
    'https://arbitrum-one.public.blastapi.io',
    'https://api.blockeden.xyz/arbitrum/67nCBdZQSH9z3YqDDjdm',
    'https://arbitrum.drpc.org/',
    'https://arbitrum.rpc.hypersync.xyz/',
    'https://public-arb-mainnet.fastnode.io/',
    'https://go.getblock.us/ba07c51b612d4e1badae6196a1515c48',
    'https://arbitrum-one.rpc.grove.city/v1/01fdb492',
    'https://arbitrum.lava.build/',
    'https://arb.leorpc.com/?api_key=FREE',
    'https://arbitrum-one-public.nodies.app',
    'https://arb1.arbitrum.io/rpc',
    'https://endpoints.omniatech.io/v1/arbitrum/one/public',
    'https://arbitrum.api.onfinality.io/public',
    'https://arb-pokt.nodies.app/',
    'https://arbitrum-rpc.polkachu.com/',
    'https://arbitrum.rpc.subquery.network/public',
    'https://arbitrum.gateway.tenderly.co/',
    'https://arbitrum.therpc.io',
    'https://arbitrum.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.arbitrumNova]: [
    'https://arbitrum-nova.publicnode.com',
    'https://arbitrum-nova.public.blastapi.io',
    'https://api.blockeden.xyz/arbitrumnova/67nCBdZQSH9z3YqDDjdm',
    'https://arbitrum-nova.drpc.org/',
    'https://arbitrum-nova.rpc.hypersync.xyz/',
    'https://nova.arbitrum.io/rpc',
    'https://arbitrum-nova.gateway.tenderly.co/',
    'https://arbitrum-nova.therpc.io',
    'https://arbitrum-nova.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.arbitrumSepolia]: [
    'https://arbitrum-sepolia.publicnode.com',
    'https://arbitrum-sepolia-rpc.publicnode.com',
    'https://arbitrum-sepolia.drpc.org/',
    'https://arbitrum-sepolia.rpc.hypersync.xyz/',
    'https://testnet-rpc.etherspot.io/v1/421614',
    'https://go.getblock.io/c46ef5c02f9b4a09a7eedc7d68d8d5f9',
    'https://arbitrum-sepolia-testnet.rpc.grove.city/v1/01fdb492',
    'https://arbitrums.lava.build/',
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://endpoints.omniatech.io/v1/arbitrum/sepolia/public',
    'https://arbitrum-sepolia.api.onfinality.io/public',
    'https://arbitrum-sepolia.gateway.tenderly.co/',
    'https://arbitrum-sepolia.therpc.io',
    'https://arbitrum-sepolia.rpc.thirdweb.com/'
  ],

  // Base Networks
  [CHAIN_IDS.base]: [
    'https://base.publicnode.com',
    'https://base.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.baseSepolia]: [
    'https://base-sepolia.publicnode.com',
    'https://base-testnet.rpc.grove.city/v1/01fdb492'
  ],

  // Optimism Networks
  [CHAIN_IDS.optimism]: [
    'https://optimism.publicnode.com',
    'https://optimism.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.optimismSepolia]: [
    'https://optimism-sepolia.publicnode.com',
    'https://optimism-sepolia-testnet.rpc.grove.city/v1/01fdb492'
  ],

  // Blast Networks
  [CHAIN_IDS.blast]: [
    'https://blast.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.blastSepolia]: [], // None found in research

  // Scroll Networks
  [CHAIN_IDS.scroll]: [
    'https://scroll.publicnode.com',
    'https://scroll.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.scrollSepolia]: [
    'https://scroll-sepolia.publicnode.com'
  ],

  // zkSync Networks
  [CHAIN_IDS.zkSync]: [
    'https://zksync-era.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.zkSyncSepolia]: [], // None found in research

  // Polygon zkEVM Networks
  [CHAIN_IDS.polygonZkEvm]: [
    'https://polygon-zkevm.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.polygonZkEvmCardona]: [], // None found in research

  // Linea Networks
  [CHAIN_IDS.linea]: [
    'https://linea.publicnode.com',
    'https://linea.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.lineaSepolia]: [
    'https://linea-sepolia.publicnode.com'
  ],

  // Mantle Networks
  [CHAIN_IDS.mantle]: [
    'https://mantle.publicnode.com',
    'https://mantle.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.mantleSepolia]: [], // None found in research

  // Taiko Networks
  [CHAIN_IDS.taiko]: [
    'https://taiko.publicnode.com',
    'https://taiko.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.taikoHekla]: [
    'https://taiko-hekla.publicnode.com',
    'https://taiko-hekla-testnet.rpc.grove.city/v1/01fdb492'
  ],

  // Sonic Networks
  [CHAIN_IDS.sonic]: [
    'https://sonic.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.sonicTestnet]: [], // None found in research

  // Unichain Networks
  [CHAIN_IDS.unichain]: [
    'https://unichain.publicnode.com',
    'https://unichain.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.unichainSepolia]: [
    'https://unichain-sepolia.publicnode.com'
  ],

  // Abstract Networks
  [CHAIN_IDS.abstract]: [
    'https://api.mainnet.abs.xyz/',
    'https://abstract-mainnet.public.blastapi.io',
    'https://abstract.rpc.hypersync.xyz',
    'https://abstract.api.onfinality.io/public',
    'https://2741.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.abstractSepolia]: [
    'https://api.testnet.abs.xyz/',
    'https://abstract-testnet.public.blastapi.io',
    'https://11124.rpc.thirdweb.com/'
  ],

  // Fraxtal Networks
  [CHAIN_IDS.fraxtal]: [
    'https://fraxtal.publicnode.com',
    'https://fraxtal.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.fraxtalTestnet]: [
    'https://fraxtal-holesky.publicnode.com'
  ],

  // Swellchain Networks
  [CHAIN_IDS.swellchain]: [], // None found in research
  [CHAIN_IDS.swellchainTestnet]: [], // None found in research

  // Polygon Networks
  [CHAIN_IDS.polygon]: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.polygonAmoy]: [
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://polygon-amoy-testnet.rpc.grove.city/v1/01fdb492'
  ],

  // BNB Chain Networks
  [CHAIN_IDS.bnb]: [
    'https://bsc.publicnode.com',
    'https://public-bsc.nownodes.io',
    'https://bsc.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.bnbTestnet]: [
    'https://bsc-testnet.publicnode.com'
  ],
  [CHAIN_IDS.opBnb]: [
    'https://opbnb.publicnode.com',
    'https://opbnb.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.opBnbTestnet]: [
    'https://opbnb-testnet.publicnode.com'
  ],

  // Avalanche Networks
  [CHAIN_IDS.avalanche]: [
    'https://avax.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.avalancheFuji]: [
    'https://avalanche-fuji-c-chain.publicnode.com',
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
    'https://avalanche-fuji.drpc.org/',
    'https://fuji.rpc.hypersync.xyz/',
    'https://go.getblock.io/648b6fa545e44fbe862e43f87c3dd631/ext/bc/C/rpc',
    'https://endpoints.omniatech.io/v1/avax/fuji/public',
    'https://avalanche-fuji.gateway.tenderly.co',
    'https://avalanche-fuji.therpc.io',
    'https://avalanche-fuji.rpc.thirdweb.com/'
  ],

  // Gnosis Network
  [CHAIN_IDS.gnosis]: [
    'https://gnosis.publicnode.com',
    'https://gnosis.rpc.grove.city/v1/01fdb492'
  ],

  // Celo Networks
  [CHAIN_IDS.celo]: [
    'https://celo.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.celoAlfajores]: [], // None found in research

  // Moonbeam Networks
  [CHAIN_IDS.moonbeam]: [
    'https://moonbeam.publicnode.com',
    'https://moonbeam.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.moonriver]: [
    'https://moonriver.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.moonbaseAlpha]: [], // None found in research

  // Berachain Networks
  [CHAIN_IDS.berachain]: [
    'https://berachain.publicnode.com',
    'https://berachain.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.berachainBepolia]: [
    'https://berachain-bepolia.publicnode.com'
  ],

  // Sei Networks
  [CHAIN_IDS.sei]: [
    'https://sei.rpc.grove.city/v1/01fdb492'
  ],
  [CHAIN_IDS.seiTestnet]: [], // None found in research

  // Other Networks
  [CHAIN_IDS.katana]: [], // None found in research
  [CHAIN_IDS.world]: [], // None found in research
  [CHAIN_IDS.worldSepolia]: [], // None found in research
  [CHAIN_IDS.sophon]: [], // None found in research
  [CHAIN_IDS.sophonSepolia]: [], // None found in research
  [CHAIN_IDS.monad]: [], // None found in research
  [CHAIN_IDS.bitTorrent]: [], // None found in research
  [CHAIN_IDS.bitTorrentTestnet]: [], // None found in research
  [CHAIN_IDS.xdc]: [], // None found in research
  [CHAIN_IDS.xdcApothem]: [], // None found in research

  // HyperEVM Network
  [CHAIN_IDS.hyperEvm]: [
    'https://rpc.edgeless.network/http'
  ],

  // ApeChain Networks
  [CHAIN_IDS.apeChain]: [
    'https://apechain-mainnet.public.blastapi.io',
    'https://rpc.apechain.com/http',
    'https://apechain.drpc.org/',
    'https://apechain.gateway.tenderly.co/',
    'https://33139.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.apeChainCurtis]: [
    'https://apechain-curtis.public.blastapi.io',
    'https://curtis.rpc.caldera.xyz/http',
    'https://apechain-curtis.drpc.org/',
    'https://curtis.gateway.tenderly.co/',
    'https://33111.rpc.thirdweb.com/'
  ],
  [CHAIN_IDS.memecore]: [] // None found in research
};

/**
 * Fallback RPC Service Class
 * Provides resilient RPC fallback functionality
 */
export class FallbackRPCService {
  private static instance: FallbackRPCService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FallbackRPCService {
    if (!FallbackRPCService.instance) {
      FallbackRPCService.instance = new FallbackRPCService();
    }
    return FallbackRPCService.instance;
  }

  /**
   * Get fallback RPC URLs for a specific chain ID
   * @param chainId - The chain ID to get fallback RPCs for
   * @returns Array of fallback RPC URLs (empty if none available)
   */
  getFallbackRPCs(chainId: number): string[] {
    return FALLBACK_RPC_URLS[chainId] || [];
  }

  /**
   * Get fallback RPC configuration including metadata
   * @param chainId - The chain ID to get configuration for
   * @returns Fallback RPC configuration object
   */
  getFallbackConfig(chainId: number): FallbackRPCConfig {
    const chainName = getChainName(chainId) || 'unknown';
    const rpcUrls = this.getFallbackRPCs(chainId);

    return {
      chainId,
      chainName,
      rpcUrls,
      hasUrls: rpcUrls.length > 0
    };
  }

  /**
   * Check if fallback RPCs are available for a chain
   * @param chainId - The chain ID to check
   * @returns True if at least one fallback RPC is available
   */
  hasFallbackRPCs(chainId: number): boolean {
    return this.getFallbackRPCs(chainId).length > 0;
  }

  /**
   * Get the first available fallback RPC URL
   * @param chainId - The chain ID
   * @returns First available RPC URL or null if none available
   */
  getFirstFallbackRPC(chainId: number): string | null {
    const urls = this.getFallbackRPCs(chainId);
    return urls.length > 0 ? urls[0] : null;
  }

  /**
   * Test an RPC URL for connectivity
   * @param url - The RPC URL to test
   * @param timeoutMs - Timeout in milliseconds (default 5000)
   * @returns True if RPC is accessible
   */
  private async testRPCConnection(url: string, timeoutMs: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the first working fallback RPC URL by testing connectivity
   * @param chainId - The chain ID
   * @param timeoutMs - Timeout per URL test (default 5000ms)
   * @returns FallbackRPCResult with the working URL or error
   */
  async getWorkingFallbackRPC(
    chainId: number,
    timeoutMs: number = 5000
  ): Promise<FallbackRPCResult> {
    const chainName = getChainName(chainId) || 'unknown';
    const urls = this.getFallbackRPCs(chainId);
    const attemptedUrls: string[] = [];

    if (urls.length === 0) {
      return {
        url: null,
        chainId,
        chainName,
        isFallback: true,
        attemptedUrls,
        error: `No fallback RPCs available for chain ${chainName} (${chainId})`
      };
    }

    // Test each URL until one works
    for (const url of urls) {
      attemptedUrls.push(url);
      
      const isWorking = await this.testRPCConnection(url, timeoutMs);
      if (isWorking) {
        return {
          url,
          chainId,
          chainName,
          isFallback: true,
          attemptedUrls
        };
      }
    }

    return {
      url: null,
      chainId,
      chainName,
      isFallback: true,
      attemptedUrls,
      error: `All ${urls.length} fallback RPCs failed for chain ${chainName} (${chainId})`
    };
  }

  /**
   * Get all chains that have fallback RPCs available
   * @returns Array of chain IDs with fallback RPCs
   */
  getChainsWithFallbacks(): number[] {
    return Object.entries(FALLBACK_RPC_URLS)
      .filter(([, urls]) => urls.length > 0)
      .map(([chainId]) => Number(chainId));
  }

  /**
   * Get statistics about fallback RPC coverage
   * @returns Statistics object
   */
  getFallbackStatistics(): {
    totalChains: number;
    chainsWithFallbacks: number;
    chainsWithoutFallbacks: number;
    totalFallbackUrls: number;
    averageUrlsPerChain: number;
  } {
    const allChainIds = Object.keys(FALLBACK_RPC_URLS).map(Number);
    const chainsWithFallbacks = this.getChainsWithFallbacks();
    const totalFallbackUrls = Object.values(FALLBACK_RPC_URLS)
      .reduce((sum, urls) => sum + urls.length, 0);

    return {
      totalChains: allChainIds.length,
      chainsWithFallbacks: chainsWithFallbacks.length,
      chainsWithoutFallbacks: allChainIds.length - chainsWithFallbacks.length,
      totalFallbackUrls,
      averageUrlsPerChain: totalFallbackUrls / allChainIds.length
    };
  }

  /**
   * Get chains that need fallback RPC configuration
   * @returns Array of chain IDs without fallback RPCs
   */
  getChainsNeedingFallbacks(): number[] {
    return Object.entries(FALLBACK_RPC_URLS)
      .filter(([, urls]) => urls.length === 0)
      .map(([chainId]) => Number(chainId));
  }
}

/**
 * Singleton instance export
 */
export const fallbackRPCService = FallbackRPCService.getInstance();

/**
 * Helper function: Get fallback RPC URLs for a chain
 */
export function getFallbackRPCs(chainId: number): string[] {
  return fallbackRPCService.getFallbackRPCs(chainId);
}

/**
 * Helper function: Check if fallback RPCs exist for a chain
 */
export function hasFallbackRPCs(chainId: number): boolean {
  return fallbackRPCService.hasFallbackRPCs(chainId);
}

/**
 * Helper function: Get first fallback RPC URL
 */
export function getFirstFallbackRPC(chainId: number): string | null {
  return fallbackRPCService.getFirstFallbackRPC(chainId);
}

/**
 * Helper function: Get working fallback RPC with connectivity test
 */
export async function getWorkingFallbackRPC(
  chainId: number,
  timeoutMs?: number
): Promise<FallbackRPCResult> {
  return fallbackRPCService.getWorkingFallbackRPC(chainId, timeoutMs);
}
