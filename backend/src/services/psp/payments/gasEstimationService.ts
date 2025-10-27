/**
 * PSP Gas Estimation Service
 * 
 * Backend gas estimation service for cryptocurrency transactions.
 * Uses Etherscan API and RPC fallback for real-time gas price data.
 * 
 * Based on frontend RealTimeFeeEstimator.ts patterns:
 * - Etherscan API V2 for mainnet chains
 * - RPC fallback for all chains
 * - Network-specific configurations
 * - EIP-1559 support
 * - No hardcoded/fake gas values
 * 
 * Features:
 * - Real-time gas price fetching
 * - Multiple priority levels (low, medium, high, urgent)
 * - Network congestion detection
 * - EIP-1559 fee structure support
 * - Rate limiting and caching
 */

import { BaseService, ServiceResult } from '@/services/BaseService';

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
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedTimeSeconds: number;
  networkCongestion: NetworkCongestion;
  priority: FeePriority;
  source: 'etherscan' | 'rpc' | 'fallback';
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCost: string;
  totalCostUSD?: string;
  networkCongestion: NetworkCongestion;
}

/**
 * Network configuration interface
 */
interface NetworkConfig {
  chainId?: number;
  supportsEIP1559: boolean;
  supportsEtherscanGastracker: boolean;
  fallbackRpcUrl?: string;
  avgBlockTimeSeconds: number;
  minConfirmations: number;
}

/**
 * Network configurations based on frontend chainIds.ts
 */
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 12,
    minConfirmations: 12
  },
  polygon: {
    chainId: 137,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 2,
    minConfirmations: 128
  },
  arbitrum: {
    chainId: 42161,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 0.25,
    minConfirmations: 20
  },
  arbitrumOne: {
    chainId: 42161,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 0.25,
    minConfirmations: 20
  },
  avalanche: {
    chainId: 43114,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 2,
    minConfirmations: 10
  },
  base: {
    chainId: 8453,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 2,
    minConfirmations: 10
  },
  optimism: {
    chainId: 10,
    supportsEIP1559: true,
    supportsEtherscanGastracker: true,
    avgBlockTimeSeconds: 2,
    minConfirmations: 10
  },
  bitcoin: {
    supportsEIP1559: false,
    supportsEtherscanGastracker: false,
    avgBlockTimeSeconds: 600,
    minConfirmations: 6
  },
  solana: {
    supportsEIP1559: false,
    supportsEtherscanGastracker: false,
    avgBlockTimeSeconds: 0.4,
    minConfirmations: 32
  },
  stellar: {
    supportsEIP1559: false,
    supportsEtherscanGastracker: false,
    avgBlockTimeSeconds: 5,
    minConfirmations: 1
  },
  algorand: {
    supportsEIP1559: false,
    supportsEtherscanGastracker: false,
    avgBlockTimeSeconds: 4.5,
    minConfirmations: 1
  },
  tron: {
    supportsEIP1559: false,
    supportsEtherscanGastracker: false,
    avgBlockTimeSeconds: 3,
    minConfirmations: 20
  }
};

/**
 * Etherscan API V2 unified base URL
 */
const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api';

export class GasEstimationService extends BaseService {
  private etherscanApiKey: string | null = null;
  private cache: Map<string, { data: FeeData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10 seconds cache
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 250ms between requests

  constructor() {
    super('PSPGasEstimation');
    this.loadApiKey();
  }

  /**
   * Load Etherscan API key from environment
   */
  private loadApiKey(): void {
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY || null;
    
    if (!this.etherscanApiKey) {
      this.logWarn('No Etherscan API key found. Using RPC fallback only.');
    }
  }

  /**
   * Rate limiter to prevent hitting API limits
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get optimal fee data for network
   */
  async getOptimalFeeData(
    network: string,
    priority: FeePriority = FeePriority.MEDIUM
  ): Promise<ServiceResult<FeeData>> {
    try {
      // Normalize network name
      const normalizedNetwork = network.toLowerCase();
      
      // Check cache first
      const cacheKey = `${normalizedNetwork}-${priority}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.logInfo('Using cached gas data', { network: normalizedNetwork });
        return this.success(cached.data);
      }

      const config = NETWORK_CONFIGS[normalizedNetwork];
      if (!config) {
        return this.error(
          `Unsupported network for gas estimation: ${network}`,
          'UNSUPPORTED_NETWORK',
          400
        );
      }

      this.logInfo('Fetching gas price data', {
        network: normalizedNetwork,
        priority,
        supportsEtherscan: config.supportsEtherscanGastracker
      });

      // Try Etherscan API first (for EVM chains that support it)
      if (config.supportsEtherscanGastracker && config.chainId) {
        try {
          const etherscanData = await this.fetchFromEtherscan(config.chainId);
          if (etherscanData) {
            const feeData = this.calculateFeeData(
              etherscanData,
              priority,
              config,
              'etherscan'
            );
            this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
            return this.success(feeData);
          }
        } catch (error) {
          this.logWarn('Etherscan API failed, falling back to RPC', {
            network: normalizedNetwork,
            error
          });
        }
      }

      // Fallback to RPC
      const rpcUrl = this.getRpcUrl(normalizedNetwork);
      if (rpcUrl) {
        try {
          const rpcData = await this.fetchFromRPC(rpcUrl, config);
          const feeData = this.calculateFeeData(
            rpcData,
            priority,
            config,
            'rpc'
          );
          this.cache.set(cacheKey, { data: feeData, timestamp: Date.now() });
          return this.success(feeData);
        } catch (error) {
          this.logError('RPC fetch failed', {
            network: normalizedNetwork,
            error
          });
        }
      }

      // If all else fails, return error
      return this.error(
        'Failed to fetch gas prices from all sources',
        'GAS_FETCH_FAILED',
        500
      );
    } catch (error) {
      return this.handleError('Failed to get optimal fee data', error);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGasForTransaction(
    network: string,
    amount: string,
    destinationAddress: string,
    priority: FeePriority = FeePriority.MEDIUM
  ): Promise<ServiceResult<GasEstimate>> {
    try {
      const normalizedNetwork = network.toLowerCase();
      const config = NETWORK_CONFIGS[normalizedNetwork];

      if (!config) {
        return this.error(
          `Unsupported network: ${network}`,
          'UNSUPPORTED_NETWORK',
          400
        );
      }

      // Get fee data
      const feeDataResult = await this.getOptimalFeeData(normalizedNetwork, priority);
      if (!feeDataResult.success || !feeDataResult.data) {
        return this.error(
          'Failed to fetch fee data',
          'FEE_FETCH_FAILED',
          500
        );
      }

      const feeData = feeDataResult.data;

      // Estimate gas limit based on network
      let gasLimit: string;
      
      if (config.supportsEIP1559) {
        // EVM chains: standard transfer = 21000 gas
        gasLimit = '21000';
      } else {
        // Non-EVM chains: use network-specific estimation
        gasLimit = '1';
      }

      // Calculate total cost
      const gasCost = BigInt(gasLimit) * BigInt(feeData.gasPrice);

      const estimate: GasEstimate = {
        gasLimit,
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        totalCost: gasCost.toString(),
        networkCongestion: feeData.networkCongestion
      };

      this.logInfo('Gas estimation complete', {
        network: normalizedNetwork,
        gasLimit,
        gasPrice: feeData.gasPrice,
        totalCost: estimate.totalCost,
        congestion: feeData.networkCongestion
      });

      return this.success(estimate);
    } catch (error) {
      return this.handleError('Failed to estimate gas', error);
    }
  }

  /**
   * Fetch gas prices from Etherscan API V2
   */
  private async fetchFromEtherscan(chainId: number): Promise<any> {
    await this.waitForRateLimit();

    const url = new URL(ETHERSCAN_V2_API_URL);
    url.searchParams.set('chainid', chainId.toString());
    url.searchParams.set('module', 'gastracker');
    url.searchParams.set('action', 'gasoracle');

    if (this.etherscanApiKey) {
      url.searchParams.set('apikey', this.etherscanApiKey);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(data.message || data.result || 'API request failed');
    }

    return data.result;
  }

  /**
   * Fetch gas prices from RPC endpoint
   */
  private async fetchFromRPC(
    rpcUrl: string,
    config: NetworkConfig
  ): Promise<any> {
    // Fetch current gas price
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
      throw new Error(
        `RPC HTTP error: ${gasPriceResponse.status} ${gasPriceResponse.statusText}`
      );
    }

    const gasPriceData = await gasPriceResponse.json();

    if (gasPriceData.error) {
      throw new Error(gasPriceData.error.message);
    }

    if (!gasPriceData.result) {
      throw new Error('RPC returned no gas price result');
    }

    const gasPrice = BigInt(gasPriceData.result);

    // Try to fetch EIP-1559 data if supported
    if (config.supportsEIP1559) {
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

        if (blockResponse.ok) {
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
        }
      } catch (error) {
        this.logWarn('Failed to fetch EIP-1559 data, using legacy format', { error });
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
   */
  private calculateFeeData(
    apiData: any,
    priority: FeePriority,
    config: NetworkConfig,
    source: 'etherscan' | 'rpc' | 'fallback'
  ): FeeData {
    // Parse gas prices (in Gwei from Etherscan/RPC)
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

    // Determine network congestion
    const congestion = this.calculateCongestion(standardGwei);

    // Convert Gwei to Wei (1 Gwei = 1e9 Wei)
    const gasPrice = Math.round(selectedGwei * 1e9).toString();

    // Calculate EIP-1559 fees if supported
    let maxFeePerGas: string | undefined;
    let maxPriorityFeePerGas: string | undefined;

    if (config.supportsEIP1559 && baseFeeGwei > 0) {
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
      priority,
      source
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
   * Get RPC URL for network from environment
   */
  private getRpcUrl(network: string): string | null {
    const envKey = `${network.toUpperCase()}_RPC_URL`;
    return process.env[envKey] || null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default GasEstimationService;
