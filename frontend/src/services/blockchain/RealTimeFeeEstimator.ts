/**
 * Real-time fee estimation service using Etherscan API V2
 * Uses unified endpoint with chainid parameter for all 60+ supported chains
 * 
 * NO FALLBACKS - Requires real-time gas price data from RPC providers.
 * Service will throw errors if gas prices cannot be fetched.
 * 
 * Premium RPC providers (Alchemy/QuickNode) REQUIRED for testnets.
 * 
 * Official Documentation:
 * - V2 Migration Guide: https://docs.etherscan.io/v2-migration
 * - Gas Tracker API: https://docs.etherscan.io/v/etherscan-v2/api-endpoints/gas-tracker
 * - Get API Key: https://etherscan.io/myapikey
 */

import { CHAIN_IDS as CENTRAL_CHAIN_IDS } from '@/infrastructure/web3/utils/chainIds';

export enum FeePriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NetworkCongestion {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high', 
  VERY_HIGH = 'very_high'
}

export interface FeeData {
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedTimeSeconds: number;
  networkCongestion: NetworkCongestion;
  priority: FeePriority;
  source?: 'etherscan' | 'premium-rpc' | 'public-rpc' | 'static-fallback';
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCost: string;
  totalCostUSD?: string;
}

/**
 * Etherscan API V2 unified base URL
 * All chains use the same base URL with chainid parameter
 * Source: https://docs.etherscan.io/v2-migration
 */
const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api';

/**
 * Chains where Etherscan gastracker module is NOT supported
 * These chains will skip Etherscan and go directly to RPC
 * 
 * Note: Testnets typically don't support gastracker API
 * Source: https://stackoverflow.com/questions/70797186/etherscan-gas-tracker-api-for-testnets
 */
const CHAINS_WITHOUT_GASTRACKER = new Set([
  11155111, // Sepolia
  17000,    // Holesky
  560048,   // Hoodi
  421614,   // Arbitrum Sepolia
  11155420, // OP Sepolia
  84532,    // Base Sepolia
  80002,    // Polygon Amoy
  2442,     // Polygon zkEVM Cardona
  43113,    // Avalanche Fuji
  97,       // BSC Testnet
  5611,     // opBNB Testnet
  534351,   // Scroll Sepolia
  168587773, // Blast Sepolia
  59141,    // Linea Sepolia
  300,      // zkSync Sepolia
  2522,     // Fraxtal Testnet
  44787,    // Celo Alfajores
  1287,     // Moonbase Alpha
  167009,   // Taiko Hekla
  1301,     // Unichain Sepolia
  4801,     // World Sepolia
  80069,    // Berachain Bepolia
  14601,    // Sonic Testnet
  1924,     // Swellchain Testnet
  11124,    // Abstract Sepolia
  33111,    // ApeChain Curtis
  1328,     // Sei Testnet
  5003,     // Mantle Sepolia
  // Add more testnets as needed
]);

/**
 * Chain IDs by blockchain name
 * Supports 60+ EVM chains
 */
const CHAIN_IDS: Record<string, number> = {
  'eth': CENTRAL_CHAIN_IDS.ethereum,
  
  // Ethereum Testnets
  'sepolia': CENTRAL_CHAIN_IDS.sepolia,
  'holesky': CENTRAL_CHAIN_IDS.holesky,
  'hoodi': CENTRAL_CHAIN_IDS.hoodi,
  
  // Abstract
  'abstract': CENTRAL_CHAIN_IDS.abstract,
  'abstract-sepolia': CENTRAL_CHAIN_IDS.abstractSepolia,
  
  // ApeChain
  'apechain': CENTRAL_CHAIN_IDS.apeChain,
  'apechain-curtis': CENTRAL_CHAIN_IDS.apeChainCurtis,
  
  // Arbitrum
  'arbitrum': CENTRAL_CHAIN_IDS.arbitrumOne,
  'arbitrum-one': CENTRAL_CHAIN_IDS.arbitrumOne,
  'arbitrum-nova': CENTRAL_CHAIN_IDS.arbitrumNova,
  'arbitrum-sepolia': CENTRAL_CHAIN_IDS.arbitrumSepolia,
  
  // Avalanche
  'avalanche': CENTRAL_CHAIN_IDS.avalanche,
  'avax': CENTRAL_CHAIN_IDS.avalanche,
  'avalanche-fuji': CENTRAL_CHAIN_IDS.avalancheFuji,
  'avax-fuji': CENTRAL_CHAIN_IDS.avalancheFuji,
  
  // Base
  'base': CENTRAL_CHAIN_IDS.base,
  'base-sepolia': CENTRAL_CHAIN_IDS.baseSepolia,
  
  // Berachain
  'berachain': CENTRAL_CHAIN_IDS.berachain,
  'berachain-bepolia': CENTRAL_CHAIN_IDS.berachainBepolia,
  
  // BitTorrent Chain
  'bttc': CENTRAL_CHAIN_IDS.bitTorrent,
  'bttc-testnet': CENTRAL_CHAIN_IDS.bitTorrentTestnet,
  
  // Blast
  'blast': CENTRAL_CHAIN_IDS.blast,
  'blast-sepolia': CENTRAL_CHAIN_IDS.blastSepolia,
  
  // BNB Smart Chain
  'bsc': CENTRAL_CHAIN_IDS.bnb,
  'bnb': CENTRAL_CHAIN_IDS.bnb,
  'bsc-testnet': CENTRAL_CHAIN_IDS.bnbTestnet,
  'bnb-testnet': CENTRAL_CHAIN_IDS.bnbTestnet,
  
  // Celo
  'celo': CENTRAL_CHAIN_IDS.celo,
  'celo-alfajores': CENTRAL_CHAIN_IDS.celoAlfajores,
  
  // Fraxtal
  'fraxtal': CENTRAL_CHAIN_IDS.fraxtal,
  'fraxtal-testnet': CENTRAL_CHAIN_IDS.fraxtalTestnet,
  
  // Gnosis
  'gnosis': CENTRAL_CHAIN_IDS.gnosis,
  'gno': CENTRAL_CHAIN_IDS.gnosis,
  
  // HyperEVM
  'hyperevm': CENTRAL_CHAIN_IDS.hyperEvm,
  
  // Linea
  'linea': CENTRAL_CHAIN_IDS.linea,
  'linea-sepolia': CENTRAL_CHAIN_IDS.lineaSepolia,
  
  // Mantle
  'mantle': CENTRAL_CHAIN_IDS.mantle,
  'mantle-sepolia': CENTRAL_CHAIN_IDS.mantleSepolia,
  
  // Memecore
  'memecore': CENTRAL_CHAIN_IDS.memecore,
  
  // Moonbeam/Moonriver
  'moonbeam': CENTRAL_CHAIN_IDS.moonbeam,
  'moonriver': CENTRAL_CHAIN_IDS.moonriver,
  'moonbase': CENTRAL_CHAIN_IDS.moonbaseAlpha,
  
  // Monad
  'monad': CENTRAL_CHAIN_IDS.monad,
  
  // Optimism
  'optimism': CENTRAL_CHAIN_IDS.optimism,
  'op': CENTRAL_CHAIN_IDS.optimism,
  'optimism-sepolia': CENTRAL_CHAIN_IDS.optimismSepolia,
  'op-sepolia': CENTRAL_CHAIN_IDS.optimismSepolia,
  
  // Polygon
  'polygon': CENTRAL_CHAIN_IDS.polygon,
  'matic': CENTRAL_CHAIN_IDS.polygon,
  'polygon-amoy': CENTRAL_CHAIN_IDS.polygonAmoy,
  'polygon-zkevm': CENTRAL_CHAIN_IDS.polygonZkEvm,
  'polygon-zkevm-cardona': CENTRAL_CHAIN_IDS.polygonZkEvmCardona,
  
  // Katana
  'katana': CENTRAL_CHAIN_IDS.katana,
  
  // Sei
  'sei': CENTRAL_CHAIN_IDS.sei,
  'sei-testnet': CENTRAL_CHAIN_IDS.seiTestnet,
  
  // Scroll
  'scroll': CENTRAL_CHAIN_IDS.scroll,
  'scroll-sepolia': CENTRAL_CHAIN_IDS.scrollSepolia,
  
  // Sonic
  'sonic': CENTRAL_CHAIN_IDS.sonic,
  'sonic-testnet': CENTRAL_CHAIN_IDS.sonicTestnet,
  
  // Sophon
  'sophon': CENTRAL_CHAIN_IDS.sophon,
  'sophon-sepolia': CENTRAL_CHAIN_IDS.sophonSepolia,
  
  // Swellchain
  'swell': CENTRAL_CHAIN_IDS.swellchain,
  'swell-testnet': CENTRAL_CHAIN_IDS.swellchainTestnet,
  
  // Taiko
  'taiko': CENTRAL_CHAIN_IDS.taiko,
  'taiko-hekla': CENTRAL_CHAIN_IDS.taikoHekla,
  
  // Unichain
  'unichain': CENTRAL_CHAIN_IDS.unichain,
  'unichain-sepolia': CENTRAL_CHAIN_IDS.unichainSepolia,
  
  // World
  'world': CENTRAL_CHAIN_IDS.world,
  'world-sepolia': CENTRAL_CHAIN_IDS.worldSepolia,
  
  // XDC
  'xdc': CENTRAL_CHAIN_IDS.xdc,
  'xdc-apothem': CENTRAL_CHAIN_IDS.xdcApothem,
  
  // zkSync
  'zksync': CENTRAL_CHAIN_IDS.zkSync,
  'zksync-era': CENTRAL_CHAIN_IDS.zkSync,
  'zksync-sepolia': CENTRAL_CHAIN_IDS.zkSyncSepolia,
  
  // opBNB
  'opbnb': CENTRAL_CHAIN_IDS.opBnb,
  'opbnb-testnet': CENTRAL_CHAIN_IDS.opBnbTestnet,
  
  // DEPRECATED CHAINS (will be removed)
  // 'cronos': 25, // Deprecated Oct 6
  // 'xai': 660279, // Deprecated Sept 3
  // 'wemix': 1111, // Deprecated Sept 3
};

/**
 * Fallback RPC endpoints (public, no API key needed)
 * Used when Etherscan API is unavailable
 */
const FALLBACK_RPC: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  'arbitrum-nova': 'https://nova.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  bsc: 'https://bsc-dataseed.binance.org',
  base: 'https://mainnet.base.org',
  scroll: 'https://rpc.scroll.io',
  blast: 'https://rpc.blast.io',
  linea: 'https://rpc.linea.build',
  zksync: 'https://mainnet.era.zksync.io',
  gnosis: 'https://rpc.gnosischain.com',
  mantle: 'https://rpc.mantle.xyz',
  celo: 'https://forno.celo.org',
  moonbeam: 'https://rpc.api.moonbeam.network',
  sepolia: 'https://rpc.sepolia.org',
  holesky: 'https://ethereum-holesky.publicnode.com'
};

/**
 * EIP-1559 support by chain ID
 * Source: Chains that support EIP-1559 transaction format
 */
const EIP1559_SUPPORTED = new Set([
  1,      // Ethereum
  11155111, // Sepolia
  17000,  // Holesky
  42161,  // Arbitrum One
  42170,  // Arbitrum Nova
  421614, // Arbitrum Sepolia
  10,     // Optimism
  11155420, // OP Sepolia
  8453,   // Base
  84532,  // Base Sepolia
  137,    // Polygon
  80002,  // Polygon Amoy
  1101,   // Polygon zkEVM
  43114,  // Avalanche
  43113,  // Avalanche Fuji
  534352, // Scroll
  534351, // Scroll Sepolia
  81457,  // Blast
  168587773, // Blast Sepolia
  59144,  // Linea
  59141,  // Linea Sepolia
  5000,   // Mantle
  5003,   // Mantle Sepolia
  324,    // zkSync Era
  300,    // zkSync Sepolia
  252,    // Fraxtal
  2522,   // Fraxtal Testnet
  42220,  // Celo
  44787,  // Celo Alfajores
  1284,   // Moonbeam
  1285,   // Moonriver
  1287,   // Moonbase Alpha
  100,    // Gnosis
  167000, // Taiko
  167009, // Taiko Hekla
  130,    // Unichain
  1301,   // Unichain Sepolia
  480,    // World
  4801,   // World Sepolia
  80094,  // Berachain
  80069,  // Berachain Bepolia
  146,    // Sonic
  14601,  // Sonic Testnet
  50104,  // Sophon
  1923,   // Swellchain
  1924,   // Swellchain Testnet
  2741,   // Abstract
  11124,  // Abstract Sepolia
  33139,  // ApeChain
  33111,  // ApeChain Curtis
  747474, // Katana
  1329,   // Sei
  204,    // opBNB
]);

export class RealTimeFeeEstimator {
  private static instance: RealTimeFeeEstimator;
  private etherscanApiKey: string | null = null;
  private cache: Map<string, { data: FeeData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10 seconds cache
  
  // Rate limiting: Etherscan V2 free tier allows 5 req/sec with API key, 1 req/5sec without
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 250ms = 4 req/sec (safe buffer below 5 req/sec limit)
  
  public static getInstance(): RealTimeFeeEstimator {
    if (!RealTimeFeeEstimator.instance) {
      RealTimeFeeEstimator.instance = new RealTimeFeeEstimator();
    }
    return RealTimeFeeEstimator.instance;
  }

  private constructor() {
    this.loadApiKey();
  }

  /**
   * Load Etherscan API key from environment
   * V2 uses single key for all chains (60+ supported)
   * 
   * IMPORTANT: API key is optional - system works with public RPC fallback
   */
  private loadApiKey(): void {
    this.etherscanApiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || null;
    
    if (!this.etherscanApiKey) {
      console.warn(
        'No Etherscan API key found. Using public RPC fallback. ' +
        'For better rate limits (5 req/sec vs 1 req/5sec), get a free key at: ' +
        'https://etherscan.io/myapikey'
      );
    }
  }

  /**
   * Rate limiter to prevent hitting API limits
   * Enforces minimum interval between requests
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`[RealTimeFeeEstimator] Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get RPC URL for blockchain, preferring environment variables over fallbacks
   */
  private getRpcUrl(blockchain: string): string {
    // Try to get from environment first
    const envKey = `VITE_${blockchain.toUpperCase()}_RPC_URL`;
    const envUrl = import.meta.env[envKey];
    if (envUrl) {
      return envUrl;
    }

    // Fall back to hardcoded public RPCs
    const fallbackUrl = FALLBACK_RPC[blockchain.toLowerCase()];
    if (!fallbackUrl) {
      throw new Error(`No RPC endpoint configured for ${blockchain}`);
    }
    
    return fallbackUrl;
  }

  /**
   * Check if using a premium RPC provider (Alchemy, Infura, QuickNode, etc.)
   * Premium providers return realistic gas prices even on testnets
   */
  private hasPremiumRpcProvider(blockchain: string): boolean {
    try {
      const rpcUrl = this.getRpcUrl(blockchain).toLowerCase();
      const premiumProviders = [
        'alchemy.com',
        'alchemyapi.io',
        'infura.io',
        'quicknode.com',
        'chainstack.com',
        'ankr.com',
        'blast.io',
        'getblock.io'
      ];
      
      return premiumProviders.some(provider => rpcUrl.includes(provider));
    } catch {
      return false;
    }
  }

  /**
   * Get chain ID from blockchain name
   * Supports multiple name variations (e.g., 'ethereum', 'eth')
   */
  private getChainId(blockchain: string): number {
    const chainId = CHAIN_IDS[blockchain.toLowerCase()];
    if (!chainId) {
      const available = Object.keys(CHAIN_IDS).slice(0, 10).join(', ');
      throw new Error(
        `Unsupported blockchain: "${blockchain}". ` +
        `Supported chains include: ${available}... (60+ total). ` +
        `See: https://docs.etherscan.io/supported-chains`
      );
    }
    return chainId;
  }

  /**
   * Check if chain supports EIP-1559 (Type 2 transactions)
   */
  private supportsEIP1559(chainId: number): boolean {
    return EIP1559_SUPPORTED.has(chainId);
  }

  /**
   * Get optimal fee data from Etherscan V2 API
   * Automatically falls back to RPC then static defaults
   * 
   * Per Etherscan V2 docs, API supports 60+ chains including testnets
   * See: https://docs.etherscan.io/supported-chains
   * 
   * Note: gastracker module is NOT available for testnets
   */
  async getOptimalFeeData(blockchain: string, priority: FeePriority): Promise<FeeData> {
    // Check cache first
    const cacheKey = `${blockchain}-${priority}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`[RealTimeFeeEstimator] Using cached data for ${blockchain}`);
      return cached.data;
    }

    const chainId = this.getChainId(blockchain);
    console.log(`[RealTimeFeeEstimator] Fetching fee data for ${blockchain} (chain ${chainId}), priority: ${priority}`);

    // Check if this chain supports gastracker module
    const supportsGastracker = !CHAINS_WITHOUT_GASTRACKER.has(chainId);
    
    // Check if premium RPC is available
    const hasPremiumRpc = this.hasPremiumRpcProvider(blockchain);
    
    // NO FALLBACKS - Require premium RPC for testnets
    if (!supportsGastracker && !hasPremiumRpc) {
      throw new Error(
        `Testnet ${blockchain} requires premium RPC provider (Alchemy/QuickNode) for gas estimation. ` +
        `Etherscan gastracker is not supported on testnets. ` +
        `Configure VITE_${blockchain.toUpperCase()}_RPC_URL with premium provider in .env`
      );
    }
    
    if (!supportsGastracker && hasPremiumRpc) {
      console.log(`[RealTimeFeeEstimator] 🔗 Testnet detected (${blockchain}) with premium RPC (Alchemy/Infura) - fetching real gas prices`);
    }

    // Try Etherscan API first (only for mainnet chains with gastracker support)
    if (supportsGastracker) {
      try {
        console.log(`[RealTimeFeeEstimator] Trying Etherscan API...`);
        const explorerData = await this.fetchFromEtherscanV2(blockchain);
        if (explorerData) {
          const feeData = this.calculateFeeData(explorerData, priority, chainId);
          feeData.source = 'etherscan';
          this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
          console.log(`[RealTimeFeeEstimator] ✅ SUCCESS via Etherscan - Gas price: ${feeData.gasPrice} Wei [Source: etherscan]`);
          return feeData;
        }
      } catch (error) {
        console.warn(`[RealTimeFeeEstimator] ⚠️ Etherscan API failed for ${blockchain}, falling back to RPC:`, error);
      }
    }

    // Fallback to RPC (for mainnets without Etherscan, or testnets with premium RPC)
    try {
      console.log(`[RealTimeFeeEstimator] Trying RPC fallback...`);
      const rpcData = await this.fetchFromRPC(blockchain);
      const feeData = this.calculateFeeData(rpcData, priority, chainId);
      // Determine if this is premium or public RPC
      feeData.source = hasPremiumRpc ? 'premium-rpc' : 'public-rpc';
      this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
      console.log(`[RealTimeFeeEstimator] ✅ SUCCESS via RPC - Gas price: ${feeData.gasPrice} Wei [Source: ${feeData.source}]`);
      return feeData;
    } catch (error) {
      console.error(`[RealTimeFeeEstimator] ❌ RPC fallback also failed for ${blockchain}:`, error);
    }

    // NO STATIC FALLBACK - Throw error instead
    throw new Error(
      `Failed to fetch gas prices for ${blockchain}. ` +
      `Both Etherscan and RPC providers failed. ` +
      `Check: 1) RPC URL is correctly configured, ` +
      `2) RPC provider is responding (Alchemy/Infura recommended), ` +
      `3) Network connection is stable. ` +
      `Cannot proceed without real-time gas price data.`
    );
  }

  /**
   * Fetch gas prices from Etherscan API V2 using unified endpoint
   * Official docs: https://docs.etherscan.io/v/etherscan-v2/api-endpoints/gas-tracker
   * Format: https://api.etherscan.io/v2/api?chainid={CHAIN_ID}&module=gastracker&action=gasoracle&apikey={API_KEY}
   */
  private async fetchFromEtherscanV2(blockchain: string): Promise<any> {
    // Apply rate limiting
    await this.waitForRateLimit();
    
    // Get the chain ID for this blockchain
    const chainId = this.getChainId(blockchain);
    
    // Build V2 API URL with chainid parameter
    const url = new URL(ETHERSCAN_V2_API_URL);
    url.searchParams.set('chainid', chainId.toString());
    url.searchParams.set('module', 'gastracker');
    url.searchParams.set('action', 'gasoracle');
    
    // API key is optional
    if (this.etherscanApiKey) {
      url.searchParams.set('apikey', this.etherscanApiKey);
    }

    console.log(`[RealTimeFeeEstimator] Fetching from Etherscan V2 for ${blockchain} (chainId: ${chainId})`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[RealTimeFeeEstimator] HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Etherscan API response format - log for debugging
    console.log(`[RealTimeFeeEstimator] Etherscan V2 response:`, {
      status: data.status,
      message: data.message,
      hasResult: !!data.result,
      blockchain,
      chainId
    });

    if (data.status !== '1') {
      console.error('[RealTimeFeeEstimator] Etherscan API error:', {
        status: data.status,
        message: data.message,
        result: data.result,
        blockchain,
        chainId
      });
      throw new Error(data.message || data.result || 'API request failed');
    }

    return data.result;
  }

  /**
   * Fetch gas prices from public RPC endpoint
   * Used as fallback when Etherscan API is unavailable
   */
  private async fetchFromRPC(blockchain: string): Promise<any> {
    const rpcUrl = this.getRpcUrl(blockchain);
    
    console.log(`[RealTimeFeeEstimator] Fetching from RPC fallback for ${blockchain}: ${rpcUrl}`);

    try {
      // Fetch current gas price via eth_gasPrice
      const gasPriceResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        })
      });

      if (!gasPriceResponse.ok) {
        throw new Error(`RPC HTTP error: ${gasPriceResponse.status} ${gasPriceResponse.statusText}`);
      }

      const gasPriceData = await gasPriceResponse.json();
      
      if (gasPriceData.error) {
        console.error('[RealTimeFeeEstimator] RPC error:', gasPriceData.error);
        throw new Error(gasPriceData.error.message);
      }
      
      if (!gasPriceData.result) {
        throw new Error('RPC returned no gas price result');
      }

      const gasPrice = BigInt(gasPriceData.result);
      console.log(`[RealTimeFeeEstimator] RPC gas price (Wei):`, gasPrice.toString(), `(${Number(gasPrice / BigInt(1e9))} Gwei)`);

      // Try to fetch EIP-1559 data if supported
      const chainId = this.getChainId(blockchain);
      if (this.supportsEIP1559(chainId)) {
        try {
          const blockResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: ['latest', false],
              id: 2
            })
          });

          if (!blockResponse.ok) {
            throw new Error(`Block fetch HTTP error: ${blockResponse.status}`);
          }

          const blockData = await blockResponse.json();
          const block = blockData.result;

          if (block && block.baseFeePerGas) {
            const baseFee = BigInt(block.baseFeePerGas);
            console.log(`[RealTimeFeeEstimator] EIP-1559 base fee (Wei):`, baseFee.toString(), `(${Number(baseFee / BigInt(1e9))} Gwei)`);
            
            // Return Etherscan-compatible format
            const result = {
              SafeGasPrice: (gasPrice / BigInt(1e9)).toString(),
              ProposeGasPrice: ((gasPrice * BigInt(12)) / BigInt(10) / BigInt(1e9)).toString(),
              FastGasPrice: ((gasPrice * BigInt(15)) / BigInt(10) / BigInt(1e9)).toString(),
              suggestBaseFee: (baseFee / BigInt(1e9)).toString()
            };
            console.log(`[RealTimeFeeEstimator] RPC SUCCESS - Returning EIP-1559 data:`, result);
            return result;
          }
        } catch (error) {
          console.warn('[RealTimeFeeEstimator] Failed to fetch EIP-1559 data, using legacy format:', error);
        }
      }

      // Return legacy format
      const result = {
        SafeGasPrice: ((gasPrice * BigInt(9)) / BigInt(10) / BigInt(1e9)).toString(),
        ProposeGasPrice: (gasPrice / BigInt(1e9)).toString(),
        FastGasPrice: ((gasPrice * BigInt(12)) / BigInt(10) / BigInt(1e9)).toString()
      };
      console.log(`[RealTimeFeeEstimator] RPC SUCCESS - Returning legacy data:`, result);
      return result;
    } catch (error) {
      console.error(`[RealTimeFeeEstimator] RPC fetch failed for ${blockchain}:`, error);
      throw error;
    }
  }

  /**
   * Calculate fee data based on API response and priority
   * Converts Gwei prices to Wei and adds EIP-1559 fees if supported
   */
  private calculateFeeData(apiData: any, priority: FeePriority, chainId: number): FeeData {
    // Parse gas prices (in Gwei from Etherscan)
    const safeGwei = parseFloat(apiData.SafeGasPrice || '0');
    const standardGwei = parseFloat(apiData.ProposeGasPrice || '0');
    const fastGwei = parseFloat(apiData.FastGasPrice || '0');
    const baseFeeGwei = parseFloat(apiData.suggestBaseFee || '0');

    // Select gas price based on priority
    let selectedGwei: number;
    let estimatedTime: number;

    switch (priority) {
      case FeePriority.LOW:
        selectedGwei = safeGwei || standardGwei * 0.85;
        estimatedTime = 300; // 5 minutes
        break;
      case FeePriority.MEDIUM:
        selectedGwei = standardGwei;
        estimatedTime = 120; // 2 minutes
        break;
      case FeePriority.HIGH:
        selectedGwei = fastGwei || standardGwei * 1.3;
        estimatedTime = 60; // 1 minute
        break;
      case FeePriority.URGENT:
        selectedGwei = (fastGwei || standardGwei) * 1.5;
        estimatedTime = 30; // 30 seconds
        break;
    }

    // Determine network congestion based on standard gas price
    const congestion = this.calculateCongestion(standardGwei);

    // Convert Gwei to Wei (1 Gwei = 1e9 Wei)
    const gasPrice = Math.round(selectedGwei * 1e9).toString();

    // Calculate EIP-1559 fees if supported
    let maxFeePerGas: string | undefined;
    let maxPriorityFeePerGas: string | undefined;

    if (this.supportsEIP1559(chainId) && baseFeeGwei > 0) {
      const priorityMultiplier = this.getPriorityMultiplier(priority);
      const priorityTipGwei = selectedGwei * 0.1 * priorityMultiplier;
      
      maxPriorityFeePerGas = Math.round(priorityTipGwei * 1e9).toString();
      // Max fee = base fee + priority fee + 20% buffer
      maxFeePerGas = Math.round((baseFeeGwei + priorityTipGwei) * 1.2 * 1e9).toString();
    }

    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedTimeSeconds: estimatedTime,
      networkCongestion: congestion,
      priority
    };
  }

  /**
   * Calculate network congestion level based on gas price
   */
  private calculateCongestion(standardGwei: number): NetworkCongestion {
    if (standardGwei > 100) return NetworkCongestion.VERY_HIGH;
    if (standardGwei > 50) return NetworkCongestion.HIGH;
    if (standardGwei > 20) return NetworkCongestion.MEDIUM;
    return NetworkCongestion.LOW;
  }

  /**
   * Get priority multiplier for fee calculation
   */
  private getPriorityMultiplier(priority: FeePriority): number {
    const multipliers: Record<FeePriority, number> = {
      [FeePriority.LOW]: 0.8,
      [FeePriority.MEDIUM]: 1.0,
      [FeePriority.HIGH]: 1.3,
      [FeePriority.URGENT]: 1.8
    };
    
    return multipliers[priority];
  }

  /**
   * DEPRECATED: Get fallback fee data when all API calls fail
   * 
   * This method is no longer used. The service now throws errors
   * instead of using static fallbacks.
   * 
   * Chain-specific base fees for major networks
   */
  private getFallbackFeeData(chainId: number, priority: FeePriority): FeeData {
    throw new Error(
      'getFallbackFeeData() is deprecated. ' +
      'Service now requires real-time gas price data from RPC providers. ' +
      'Configure premium RPC providers (Alchemy/QuickNode) in .env file.'
    );
  }

  /**
   * Get estimated confirmation time by priority
   */
  private getEstimatedTime(priority: FeePriority): number {
    const times: Record<FeePriority, number> = {
      [FeePriority.LOW]: 300,
      [FeePriority.MEDIUM]: 120,
      [FeePriority.HIGH]: 60,
      [FeePriority.URGENT]: 30
    };
    
    return times[priority];
  }

  /**
   * Estimate gas for a specific transaction using RPC
   */
  async estimateGas(
    blockchain: string,
    to: string,
    data?: string,
    value?: string
  ): Promise<GasEstimate> {
    const rpcUrl = this.getRpcUrl(blockchain);

    try {
      // Estimate gas limit via eth_estimateGas
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_estimateGas',
          params: [{
            to,
            data: data || '0x',
            value: value || '0x0'
          }],
          id: 1
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      const gasLimit = BigInt(result.result).toString();

      // Get current fee data
      const feeData = await this.getOptimalFeeData(blockchain, FeePriority.MEDIUM);
      
      // Calculate total cost
      const gasCost = BigInt(gasLimit) * BigInt(feeData.gasPrice || '0');

      return {
        gasLimit,
        gasPrice: feeData.gasPrice || '0',
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        totalCost: gasCost.toString(),
        totalCostUSD: '0.00' // Would need price oracle integration
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }

  /**
   * Get all supported chains
   * Returns array of chain names (60+ chains)
   */
  getSupportedChains(): string[] {
    return Object.keys(CHAIN_IDS);
  }

  /**
   * Check if blockchain is supported by Etherscan V2
   */
  isChainSupported(blockchain: string): boolean {
    return blockchain.toLowerCase() in CHAIN_IDS;
  }

  /**
   * Get chain ID for a blockchain name
   */
  getChainIdFor(blockchain: string): number | null {
    return CHAIN_IDS[blockchain.toLowerCase()] || null;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Force refresh fee data (bypasses cache)
   */
  async refreshFeeData(blockchain: string, priority: FeePriority): Promise<FeeData> {
    const cacheKey = `${blockchain}-${priority}`;
    this.cache.delete(cacheKey);
    return this.getOptimalFeeData(blockchain, priority);
  }
}

// Export singleton instance
export const realTimeFeeEstimator = RealTimeFeeEstimator.getInstance();

// Default export
export default RealTimeFeeEstimator;
