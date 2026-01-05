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

import { 
  CHAIN_IDS,
  CHAIN_ID_TO_NAME,
  getChainId as getChainIdFromName,
  isTestnet,
  isEIP1559Supported as checkChainEIP1559Support,
  getAllChainIds
} from '@/infrastructure/web3/utils/chainIds';
import { fallbackRPCService } from '@/infrastructure/web3/utils/FallbackRPCService';

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
  source?: 'etherscan' | 'premium-rpc' | 'public-rpc' | 'static-fallback' | 'mainnet-estimate';
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
 * Mapping of testnet chain IDs to their corresponding mainnet chain IDs
 * Used to provide realistic gas estimates for testnets based on mainnet data
 */
const TESTNET_TO_MAINNET_MAPPING: Record<number, number> = {
  // Ethereum testnets -> Ethereum mainnet
  11155111: 1, // Sepolia -> Ethereum
  17000: 1,    // Holesky -> Ethereum
  560048: 1,   // Hoodi -> Ethereum
  
  // Arbitrum testnets -> Arbitrum One
  421614: 42161, // Arbitrum Sepolia -> Arbitrum One
  
  // Base testnets -> Base mainnet
  84532: 8453, // Base Sepolia -> Base
  
  // Optimism testnets -> OP Mainnet
  11155420: 10, // OP Sepolia -> OP Mainnet
  
  // Blast testnets -> Blast mainnet
  168587773: 81457, // Blast Sepolia -> Blast
  
  // Scroll testnets -> Scroll mainnet
  534351: 534352, // Scroll Sepolia -> Scroll
  
  // zkSync testnets -> zkSync Era mainnet
  300: 324, // zkSync Era Sepolia -> zkSync Era
  
  // Polygon zkEVM testnets -> Polygon zkEVM mainnet
  2442: 1101, // Polygon zkEVM Cardona -> Polygon zkEVM
  
  // Linea testnets -> Linea mainnet
  59141: 59144, // Linea Sepolia -> Linea
  
  // Mantle testnets -> Mantle mainnet
  5003: 5000, // Mantle Sepolia -> Mantle
  
  // Taiko testnets -> Taiko mainnet
  167009: 167000, // Taiko Hekla -> Taiko
  
  // Sonic testnets -> Sonic mainnet
  14601: 146, // Sonic Testnet -> Sonic
  
  // Unichain testnets -> Unichain mainnet
  1301: 130, // Unichain Sepolia -> Unichain
  
  // Abstract testnets -> Abstract mainnet
  11124: 2741, // Abstract Sepolia -> Abstract
  
  // Fraxtal testnets -> Fraxtal mainnet
  2522: 252, // Fraxtal Testnet -> Fraxtal
  
  // Swellchain testnets -> Swellchain mainnet
  1924: 1923, // Swellchain Testnet -> Swellchain
  
  // Polygon testnets -> Polygon mainnet
  80002: 137, // Polygon Amoy -> Polygon
  
  // BNB testnets -> BNB mainnet
  97: 56,   // BNB Testnet -> BNB
  5611: 204, // opBNB Testnet -> opBNB
  
  // Avalanche testnets -> Avalanche mainnet
  43113: 43114, // Avalanche Fuji -> Avalanche C-Chain
  
  // Celo testnets -> Celo mainnet
  44787: 42220, // Celo Alfajores -> Celo
  
  // Moonbeam testnets -> Moonbeam mainnet
  1287: 1284, // Moonbase Alpha -> Moonbeam
  
  // Berachain testnets -> Berachain mainnet
  80069: 80094, // Berachain Bepolia -> Berachain
  
  // Sei testnets -> Sei mainnet
  1328: 1329, // Sei Testnet -> Sei
  
  // Injective testnets -> Injective mainnet
  1439: 1776, // Injective Testnet -> Injective
  
  // World testnets -> World mainnet
  4801: 480, // World Sepolia -> World
  
  // Sophon testnets -> Sophon mainnet
  531050104: 50104, // Sophon Sepolia -> Sophon
  
  // BitTorrent testnets -> BitTorrent mainnet
  1029: 199, // BitTorrent Testnet -> BitTorrent Chain
  
  // XDC testnets -> XDC mainnet
  51: 50, // XDC Apothem -> XDC
  
  // ApeChain testnets -> ApeChain mainnet
  33111: 33139, // ApeChain Curtis -> ApeChain
};

/**
 * Get the mainnet equivalent for a testnet chain ID
 * Returns the original chain ID if it's already a mainnet or has no mapping
 */
function getMainnetEquivalent(chainId: number): number {
  return TESTNET_TO_MAINNET_MAPPING[chainId] || chainId;
}

/**
 * Etherscan API V2 unified base URL
 * All chains use the same base URL with chainid parameter
 * Source: https://docs.etherscan.io/v2-migration
 */
const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api';

/**
 * Create a reverse mapping for all supported chain name variations
 * This ensures we can look up chains by any of their common names
 * (e.g., 'eth', 'ethereum', 'arbitrum-one', 'arbitrum', etc.)
 */
const CHAIN_NAME_TO_ID = (() => {
  const mapping: Record<string, number> = {};
  
  // Direct mappings from CHAIN_IDS
  Object.entries(CHAIN_IDS).forEach(([name, id]) => {
    mapping[name.toLowerCase()] = id;
  });
  
  // Add common aliases
  const aliases: Record<string, string> = {
    'eth': 'ethereum',
    'arb': 'arbitrumOne',
    'op': 'optimism',
    'avax': 'avalanche',
    'matic': 'polygon',
    'gno': 'gnosis',
    'bnb': 'bnb'
  };
  
  Object.entries(aliases).forEach(([alias, canonical]) => {
    const chainId = CHAIN_IDS[canonical as keyof typeof CHAIN_IDS];
    if (chainId) {
      mapping[alias.toLowerCase()] = chainId;
    }
  });
  
  return mapping;
})();

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
   * Uses centralized FallbackRPCService for fallback URLs
   */
  private getRpcUrl(blockchain: string): string {
    // Try to get from environment first
    const envKey = `VITE_${blockchain.toUpperCase()}_RPC_URL`;
    const envUrl = import.meta.env[envKey];
    if (envUrl) {
      return envUrl;
    }

    // Get chain ID and use FallbackRPCService
    const chainId = this.getChainId(blockchain);
    const fallbackUrl = fallbackRPCService.getFirstFallbackRPC(chainId);
    
    if (!fallbackUrl) {
      throw new Error(
        `No RPC endpoint configured for ${blockchain} (chain ID: ${chainId}). ` +
        `Configure VITE_${blockchain.toUpperCase()}_RPC_URL in .env or add fallback RPC to FallbackRPCService.`
      );
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
   * Uses centralized chain ID mapping from chainIds.ts
   * Supports multiple name variations (e.g., 'ethereum', 'eth')
   */
  private getChainId(blockchain: string): number {
    const chainId = CHAIN_NAME_TO_ID[blockchain.toLowerCase()];
    
    if (!chainId) {
      // Get list of supported chains for error message
      const supportedChains = Object.keys(CHAIN_NAME_TO_ID).slice(0, 20).join(', ');
      throw new Error(
        `Unsupported blockchain: "${blockchain}". ` +
        `Supported chains include: ${supportedChains}... (60+ total). ` +
        `See chainIds.ts for full list or https://docs.etherscan.io/supported-chains`
      );
    }
    
    return chainId;
  }

  /**
   * Check if chain supports EIP-1559 (Type 2 transactions)
   * Uses centralized detection from chainIds.ts for single source of truth
   */
  private supportsEIP1559(chainId: number): boolean {
    return checkChainEIP1559Support(chainId);
  }

  /**
   * Check if chain supports Etherscan gastracker module
   * Testnets typically don't support gastracker API
   * Source: https://stackoverflow.com/questions/70797186/etherscan-gas-tracker-api-for-testnets
   */
  private supportsGastracker(chainId: number): boolean {
    return !isTestnet(chainId);
  }

  /**
   * Get optimal fee data from Etherscan V2 API
   * Automatically falls back to RPC then static defaults
   * 
   * For testnets, uses mainnet gas estimates for more realistic costs
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
    const isTestnetChain = isTestnet(chainId);
    
    // For testnets, use mainnet equivalent gas prices for realistic estimates
    const effectiveChainId = isTestnetChain ? getMainnetEquivalent(chainId) : chainId;
    const effectiveBlockchain = isTestnetChain ? (CHAIN_ID_TO_NAME[effectiveChainId] || blockchain) : blockchain;
    
    if (isTestnetChain && effectiveChainId !== chainId) {
      console.log(`[RealTimeFeeEstimator] 🔄 Testnet detected (${blockchain}), using mainnet ${effectiveBlockchain} gas estimates for realistic costs`);
    }
    
    console.log(`[RealTimeFeeEstimator] Fetching fee data for ${blockchain} (chain ${chainId}${isTestnetChain ? ` -> mainnet ${effectiveChainId}` : ''}), priority: ${priority}`);

    // Check if this chain supports gastracker module (mainnet only)
    const hasGastracker = this.supportsGastracker(effectiveChainId);
    
    // Check if premium RPC is available
    const hasPremiumRpc = this.hasPremiumRpcProvider(blockchain);
    
    // For testnets using mainnet estimates, we don't need premium RPC
    if (!hasGastracker && !hasPremiumRpc && !isTestnetChain) {
      throw new Error(
        `Chain ${blockchain} requires premium RPC provider (Alchemy/QuickNode) for gas estimation. ` +
        `Configure VITE_${blockchain.toUpperCase()}_RPC_URL with premium provider in .env`
      );
    }

    // Try Etherscan API first (for mainnet chains with gastracker support)
    if (hasGastracker) {
      try {
        console.log(`[RealTimeFeeEstimator] Trying Etherscan API...`);
        const explorerData = await this.fetchFromEtherscanV2(effectiveBlockchain);
        if (explorerData) {
          const feeData = this.calculateFeeData(explorerData, priority, effectiveChainId);
          feeData.source = isTestnetChain ? 'mainnet-estimate' as any : 'etherscan';
          this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
          console.log(`[RealTimeFeeEstimator] ✅ SUCCESS via Etherscan - Gas price: ${feeData.gasPrice} Wei [Source: ${feeData.source}]`);
          return feeData;
        }
      } catch (error) {
        console.warn(`[RealTimeFeeEstimator] ⚠️ Etherscan API failed for ${effectiveBlockchain}, falling back to RPC:`, error);
      }
    }

    // Fallback to RPC (for mainnets without Etherscan, or testnets with premium RPC)
    // For testnets without premium RPC, this will use the mainnet RPC
    try {
      console.log(`[RealTimeFeeEstimator] Trying RPC fallback...`);
      const rpcData = await this.fetchFromRPC(effectiveBlockchain);
      const feeData = this.calculateFeeData(rpcData, priority, effectiveChainId);
      // Determine if this is premium or public RPC
      feeData.source = isTestnetChain ? 'mainnet-estimate' as any : (hasPremiumRpc ? 'premium-rpc' : 'public-rpc');
      this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
      console.log(`[RealTimeFeeEstimator] ✅ SUCCESS via RPC - Gas price: ${feeData.gasPrice} Wei [Source: ${feeData.source}]`);
      return feeData;
    } catch (error) {
      console.error(`[RealTimeFeeEstimator] ❌ RPC fallback also failed for ${effectiveBlockchain}:`, error);
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
   * 🔥 SAFETY BUFFER: Adds +1 Gwei to all calculated gas values to prevent stuck transactions
   */
  private calculateFeeData(apiData: any, priority: FeePriority, chainId: number): FeeData {
    // 🔥 SAFETY BUFFER: Always add 1 Gwei to prevent stuck transactions
    const SAFETY_BUFFER_GWEI = 1.0;
    
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
        selectedGwei = (safeGwei || standardGwei * 0.85) + SAFETY_BUFFER_GWEI;
        estimatedTime = 300; // 5 minutes
        break;
      case FeePriority.MEDIUM:
        selectedGwei = standardGwei + SAFETY_BUFFER_GWEI;
        estimatedTime = 120; // 2 minutes
        break;
      case FeePriority.HIGH:
        selectedGwei = (fastGwei || standardGwei * 1.3) + SAFETY_BUFFER_GWEI;
        estimatedTime = 60; // 1 minute
        break;
      case FeePriority.URGENT:
        selectedGwei = ((fastGwei || standardGwei) * 1.5) + SAFETY_BUFFER_GWEI;
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
      const priorityTipGwei = (selectedGwei * 0.1 * priorityMultiplier) + SAFETY_BUFFER_GWEI;
      
      maxPriorityFeePerGas = Math.round(priorityTipGwei * 1e9).toString();
      // Max fee = base fee + priority fee + 20% buffer + safety buffer
      maxFeePerGas = Math.round(((baseFeeGwei + priorityTipGwei) * 1.2 + SAFETY_BUFFER_GWEI) * 1e9).toString();
    }

    console.log(`[RealTimeFeeEstimator] 🛡️ Safety buffer (+${SAFETY_BUFFER_GWEI} Gwei) applied to all gas values`);

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
   * Returns array of chain names from centralized chainIds.ts
   */
  getSupportedChains(): string[] {
    return Object.keys(CHAIN_NAME_TO_ID);
  }

  /**
   * Check if blockchain is supported
   * Uses centralized chain mapping
   */
  isChainSupported(blockchain: string): boolean {
    return blockchain.toLowerCase() in CHAIN_NAME_TO_ID;
  }

  /**
   * Get chain ID for a blockchain name
   * Public method that uses centralized mapping
   */
  getChainIdFor(blockchain: string): number | null {
    return CHAIN_NAME_TO_ID[blockchain.toLowerCase()] || null;
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
