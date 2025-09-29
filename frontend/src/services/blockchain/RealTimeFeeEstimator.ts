/**
 * Real-time fee estimation service using Etherscan V2 API
 * Unified API across 60+ chains with single API key
 * 
 * Official Documentation:
 * - V2 Guide: https://docs.etherscan.io/v2-migration
 * - Supported Chains: https://docs.etherscan.io/supported-chains
 * - Get API Key: https://etherscan.io/myapikey
 */

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
 * Chain ID mapping for Etherscan V2 API
 * Source: https://docs.etherscan.io/supported-chains
 * Last Updated: September 29, 2025
 */
const CHAIN_IDS: Record<string, number> = {
  // Ethereum Mainnets
  'ethereum': 1,
  'eth': 1,
  
  // Ethereum Testnets
  'sepolia': 11155111,
  'holesky': 17000,
  'hoodi': 560048,
  
  // Abstract
  'abstract': 2741,
  'abstract-sepolia': 11124,
  
  // ApeChain
  'apechain': 33139,
  'apechain-curtis': 33111,
  
  // Arbitrum
  'arbitrum': 42161,
  'arbitrum-one': 42161,
  'arbitrum-nova': 42170,
  'arbitrum-sepolia': 421614,
  
  // Avalanche
  'avalanche': 43114,
  'avax': 43114,
  'avalanche-fuji': 43113,
  'avax-fuji': 43113,
  
  // Base
  'base': 8453,
  'base-sepolia': 84532,
  
  // Berachain
  'berachain': 80094,
  'berachain-bepolia': 80069,
  
  // BitTorrent Chain
  'bttc': 199,
  'bttc-testnet': 1029,
  
  // Blast
  'blast': 81457,
  'blast-sepolia': 168587773,
  
  // BNB Smart Chain
  'bsc': 56,
  'bnb': 56,
  'bsc-testnet': 97,
  'bnb-testnet': 97,
  
  // Celo
  'celo': 42220,
  'celo-alfajores': 44787,
  
  // Fraxtal
  'fraxtal': 252,
  'fraxtal-testnet': 2522,
  
  // Gnosis
  'gnosis': 100,
  'gno': 100,
  
  // HyperEVM
  'hyperevm': 999,
  
  // Linea
  'linea': 59144,
  'linea-sepolia': 59141,
  
  // Mantle
  'mantle': 5000,
  'mantle-sepolia': 5003,
  
  // Memecore
  'memecore': 43521,
  
  // Moonbeam/Moonriver
  'moonbeam': 1284,
  'moonriver': 1285,
  'moonbase': 1287,
  
  // Monad
  'monad': 10143,
  
  // Optimism
  'optimism': 10,
  'op': 10,
  'optimism-sepolia': 11155420,
  'op-sepolia': 11155420,
  
  // Polygon
  'polygon': 137,
  'matic': 137,
  'polygon-amoy': 80002,
  'polygon-zkevm': 1101,
  'polygon-zkevm-cardona': 2442,
  
  // Katana
  'katana': 747474,
  
  // Sei
  'sei': 1329,
  'sei-testnet': 1328,
  
  // Scroll
  'scroll': 534352,
  'scroll-sepolia': 534351,
  
  // Sonic
  'sonic': 146,
  'sonic-testnet': 14601,
  
  // Sophon
  'sophon': 50104,
  'sophon-sepolia': 531050104,
  
  // Swellchain
  'swell': 1923,
  'swell-testnet': 1924,
  
  // Taiko
  'taiko': 167000,
  'taiko-hekla': 167009,
  
  // Unichain
  'unichain': 130,
  'unichain-sepolia': 1301,
  
  // World
  'world': 480,
  'world-sepolia': 4801,
  
  // XDC
  'xdc': 50,
  'xdc-apothem': 51,
  
  // zkSync
  'zksync': 324,
  'zksync-era': 324,
  'zksync-sepolia': 300,
  
  // opBNB
  'opbnb': 204,
  'opbnb-testnet': 5611,
  
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
  private readonly V2_BASE_URL = 'https://api.etherscan.io/v2/api';
  
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
   */
  async getOptimalFeeData(blockchain: string, priority: FeePriority): Promise<FeeData> {
    // Check cache first
    const cacheKey = `${blockchain}-${priority}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Try Etherscan V2 API first
      const explorerData = await this.fetchFromEtherscanV2(blockchain);
      if (explorerData) {
        const chainId = this.getChainId(blockchain);
        const feeData = this.calculateFeeData(explorerData, priority, chainId);
        this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
        return feeData;
      }
    } catch (error) {
      console.warn(`Etherscan V2 API unavailable for ${blockchain}:`, error);
    }

    // Fallback to RPC endpoint
    try {
      const rpcData = await this.fetchFromRPC(blockchain);
      const chainId = this.getChainId(blockchain);
      const feeData = this.calculateFeeData(rpcData, priority, chainId);
      this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
      return feeData;
    } catch (error) {
      console.error(`RPC fallback failed for ${blockchain}:`, error);
    }

    // Final fallback to static defaults
    const chainId = this.getChainId(blockchain);
    return this.getFallbackFeeData(chainId, priority);
  }

  /**
   * Fetch gas prices from Etherscan V2 API
   * Official endpoint format: https://api.etherscan.io/v2/api?chainid={CHAIN_ID}&...
   */
  private async fetchFromEtherscanV2(blockchain: string): Promise<any> {
    const chainId = this.getChainId(blockchain);
    
    // Build V2 API URL per official docs
    const url = new URL(this.V2_BASE_URL);
    url.searchParams.set('chainid', chainId.toString());
    url.searchParams.set('module', 'gastracker');
    url.searchParams.set('action', 'gasoracle');
    
    // API key is optional per official docs
    if (this.etherscanApiKey) {
      url.searchParams.set('apikey', this.etherscanApiKey);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Etherscan API response format
    if (data.status !== '1') {
      throw new Error(data.message || 'API request failed');
    }

    return data.result;
  }

  /**
   * Fetch gas prices from public RPC endpoint
   * Used as fallback when Etherscan API is unavailable
   */
  private async fetchFromRPC(blockchain: string): Promise<any> {
    const rpcUrl = FALLBACK_RPC[blockchain.toLowerCase()];
    if (!rpcUrl) {
      throw new Error(`No RPC endpoint configured for ${blockchain}`);
    }

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

    const gasPriceData = await gasPriceResponse.json();
    
    if (gasPriceData.error) {
      throw new Error(gasPriceData.error.message);
    }
    
    const gasPrice = BigInt(gasPriceData.result);

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

        const blockData = await blockResponse.json();
        const block = blockData.result;

        if (block && block.baseFeePerGas) {
          const baseFee = BigInt(block.baseFeePerGas);
          // Return Etherscan-compatible format
          return {
            SafeGasPrice: (gasPrice / BigInt(1e9)).toString(),
            ProposeGasPrice: ((gasPrice * BigInt(12)) / BigInt(10) / BigInt(1e9)).toString(),
            FastGasPrice: ((gasPrice * BigInt(15)) / BigInt(10) / BigInt(1e9)).toString(),
            suggestBaseFee: (baseFee / BigInt(1e9)).toString()
          };
        }
      } catch (error) {
        console.warn('Failed to fetch EIP-1559 data:', error);
      }
    }

    // Return legacy format
    return {
      SafeGasPrice: ((gasPrice * BigInt(9)) / BigInt(10) / BigInt(1e9)).toString(),
      ProposeGasPrice: (gasPrice / BigInt(1e9)).toString(),
      FastGasPrice: ((gasPrice * BigInt(12)) / BigInt(10) / BigInt(1e9)).toString()
    };
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
   * Get fallback fee data when all API calls fail
   * Chain-specific base fees for major networks
   */
  private getFallbackFeeData(chainId: number, priority: FeePriority): FeeData {
    // Base fees in Gwei for different chain types
    const baseFees: Record<number, number> = {
      1: 20,       // Ethereum - 20 gwei
      11155111: 10, // Sepolia - 10 gwei
      17000: 10,   // Holesky - 10 gwei
      137: 30,     // Polygon - 30 gwei
      80002: 25,   // Polygon Amoy - 25 gwei
      42161: 0.1,  // Arbitrum - 0.1 gwei
      421614: 0.1, // Arbitrum Sepolia - 0.1 gwei
      42170: 0.1,  // Arbitrum Nova - 0.1 gwei
      10: 1,       // Optimism - 1 gwei
      11155420: 1, // OP Sepolia - 1 gwei
      8453: 0.1,   // Base - 0.1 gwei
      84532: 0.1,  // Base Sepolia - 0.1 gwei
      43114: 25,   // Avalanche - 25 gwei
      43113: 25,   // Avalanche Fuji - 25 gwei
      56: 5,       // BSC - 5 gwei
      97: 5,       // BSC Testnet - 5 gwei
      534352: 0.5, // Scroll - 0.5 gwei
      534351: 0.5, // Scroll Sepolia - 0.5 gwei
      81457: 0.1,  // Blast - 0.1 gwei
      168587773: 0.1, // Blast Sepolia - 0.1 gwei
      324: 0.25,   // zkSync Era - 0.25 gwei
      300: 0.25,   // zkSync Sepolia - 0.25 gwei
    };
    
    const baseGwei = baseFees[chainId] || 20; // Default to 20 gwei
    const multiplier = this.getPriorityMultiplier(priority);
    const selectedGwei = baseGwei * multiplier;

    const feeData: FeeData = {
      gasPrice: Math.round(selectedGwei * 1e9).toString(),
      estimatedTimeSeconds: this.getEstimatedTime(priority),
      networkCongestion: NetworkCongestion.MEDIUM,
      priority
    };

    // Add EIP-1559 fees for supported chains
    if (this.supportsEIP1559(chainId)) {
      feeData.maxFeePerGas = Math.round(selectedGwei * 1.2 * 1e9).toString();
      feeData.maxPriorityFeePerGas = Math.round(selectedGwei * 0.1 * 1e9).toString();
    }

    return feeData;
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
    const rpcUrl = FALLBACK_RPC[blockchain.toLowerCase()];
    if (!rpcUrl) {
      throw new Error(`No RPC endpoint configured for ${blockchain}`);
    }

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
