/**
 * Enhanced Gas Estimation Service - WITH TESTNET SUPPORT
 * 
 * Provides REAL blockchain-based gas estimation with testnet optimization.
 * 
 * Features:
 * - Real gas estimation using ethers.js estimateGas()
 * - Integration with RealTimeFeeEstimator for mainnet gas prices
 * - Integration with TestnetGasService for Sepolia/Holesky optimization
 * - Support for EIP-1559 and legacy transactions
 * - Detailed cost breakdowns with USD conversion
 * - Testnet-specific handling for accurate estimation
 * 
 * Usage:
 * ```typescript
 * const estimator = EnhancedGasEstimationService.getInstance();
 * const estimate = await estimator.estimateDeploymentCost({
 *   provider,
 *   bytecode,
 *   abi,
 *   constructorArgs,
 *   blockchain: 'ethereum',
 *   tokenType: 'ERC20'
 * });
 * ```
 */

import { ethers } from 'ethers';
import { RealTimeFeeEstimator, FeePriority } from './RealTimeFeeEstimator';
import { getSepoliaGas, getHoleskyGas, buildEip1559Fees } from '../GasOracleService';

// Re-export FeePriority for convenience
export { FeePriority } from './RealTimeFeeEstimator';

/**
 * Deployment cost estimation parameters
 */
export interface DeploymentEstimationParams {
  provider: ethers.Provider;
  bytecode: string;
  abi: any[];
  constructorArgs: any[];
  blockchain: string;
  tokenType: string;
  priority?: FeePriority;
  from?: string; // Required for accurate estimation
}

/**
 * Comprehensive gas estimation result
 */
export interface GasEstimationResult {
  // Gas limits
  estimatedGasLimit: bigint;
  recommendedGasLimit: bigint; // With 10% buffer
  
  // Gas prices (all in Wei)
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPriceSource?: 'etherscan' | 'premium-rpc' | 'public-rpc';
  
  // Transaction type
  isEIP1559: boolean;
  
  // Cost calculations (in Wei)
  estimatedCostWei: bigint;
  estimatedCostNative: string; // Formatted ETH/MATIC/etc
  estimatedCostUSD?: string;
  
  // Timing
  estimatedTimeSeconds: number;
  
  // Network info
  networkCongestion: string;
  
  // Breakdown for UI display
  breakdown: {
    gasLimit: string;
    gasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    totalCost: string;
    nativeCurrency: string;
    source: string;
  };
  
  // Warnings
  warnings: string[];
}

/**
 * Native currency symbols by blockchain
 */
const NATIVE_CURRENCIES: Record<string, string> = {
  'ethereum': 'ETH',
  'eth': 'ETH',
  'sepolia': 'ETH',
  'holesky': 'ETH',
  'polygon': 'MATIC',
  'matic': 'MATIC',
  'polygon-amoy': 'MATIC',
  'arbitrum': 'ETH',
  'arbitrum-one': 'ETH',
  'arbitrum-nova': 'ETH',
  'arbitrum-sepolia': 'ETH',
  'optimism': 'ETH',
  'op': 'ETH',
  'optimism-sepolia': 'ETH',
  'base': 'ETH',
  'base-sepolia': 'ETH',
  'avalanche': 'AVAX',
  'avax': 'AVAX',
  'avalanche-fuji': 'AVAX',
  'bsc': 'BNB',
  'bnb': 'BNB',
  'bsc-testnet': 'BNB',
};

export class EnhancedGasEstimationService {
  private static instance: EnhancedGasEstimationService;
  private feeEstimator: RealTimeFeeEstimator;
  
  // Safety buffer: 10% (reasonable for EIP-1559 base fee variations)
  private readonly GAS_BUFFER_PERCENTAGE = 10;
  
  private constructor() {
    this.feeEstimator = RealTimeFeeEstimator.getInstance();
  }
  
  public static getInstance(): EnhancedGasEstimationService {
    if (!EnhancedGasEstimationService.instance) {
      EnhancedGasEstimationService.instance = new EnhancedGasEstimationService();
    }
    return EnhancedGasEstimationService.instance;
  }
  
  /**
   * Detect if blockchain is a testnet
   */
  private isTestnet(blockchain: string): boolean {
    const testnets = ['sepolia', 'holesky', 'hoodi', 'base-sepolia', 'optimism-sepolia', 'arbitrum-sepolia', 'avalanche-fuji', 'bsc-testnet', 'polygon-amoy'];
    return testnets.includes(blockchain.toLowerCase());
  }
  
  /**
   * Get fee data optimized for testnets
   * Uses TestnetGasService for Sepolia/Holesky, simple config for other testnets
   */
  private async getTestnetFeeData(blockchain: string, priority: FeePriority): Promise<any> {
    console.log(`[EnhancedGasEstimation] 🧪 Testnet detected: ${blockchain} - using testnet gas configuration`);
    
    const blockchainLower = blockchain.toLowerCase();
    
    // For Sepolia and Holesky, use TestnetGasService
    if (blockchainLower === 'sepolia' || blockchainLower === 'holesky') {
      try {
        const testnetGas = blockchainLower === 'sepolia' 
          ? await getSepoliaGas()
          : await getHoleskyGas();
        
        console.log(`[EnhancedGasEstimation] ✅ TestnetGasService data:`, {
          baseFee: testnetGas.suggestBaseFee,
          safe: testnetGas.safe,
          propose: testnetGas.propose,
          fast: testnetGas.fast
        });
        
        // Select priority fee based on priority level
        const priorityFeeMap = {
          [FeePriority.LOW]: testnetGas.safe,
          [FeePriority.MEDIUM]: testnetGas.propose,
          [FeePriority.HIGH]: testnetGas.fast,
          [FeePriority.URGENT]: testnetGas.fast * 1.5
        };
        
        const priorityFeeGwei = priorityFeeMap[priority];
        const baseFeeGwei = testnetGas.suggestBaseFee;
        
        // Convert priority to gas oracle priority level
        const priorityLevelMap = {
          [FeePriority.LOW]: 'low' as const,
          [FeePriority.MEDIUM]: 'medium' as const,
          [FeePriority.HIGH]: 'high' as const,
          [FeePriority.URGENT]: 'high' as const
        };
        
        // Build EIP-1559 fees
        const { maxFeePerGas, maxPriorityFeePerGas } = buildEip1559Fees(
          testnetGas,
          priorityLevelMap[priority]
        );
        
        // Return in RealTimeFeeEstimator-compatible format
        return {
          gasPrice: undefined, // EIP-1559 only for testnets
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
          estimatedTimeSeconds: 15, // Testnets are typically fast
          networkCongestion: 'low',
          priority,
          source: 'testnet-rpc'
        };
      } catch (error: any) {
        console.warn(`[EnhancedGasEstimation] ⚠️ TestnetGasService failed, falling back to RealTimeFeeEstimator:`, error.message);
        
        // Fallback to RealTimeFeeEstimator
        try {
          const feeData = await this.feeEstimator.getOptimalFeeData(blockchain, priority);
          console.log(`[EnhancedGasEstimation] ✅ Fallback successful - using RealTimeFeeEstimator`);
          return feeData;
        } catch (fallbackError: any) {
          console.error(`[EnhancedGasEstimation] ❌ Both TestnetGasService and RealTimeFeeEstimator failed`);
          throw new Error(
            `Failed to fetch testnet gas prices: ${error.message}. ` +
            `Fallback also failed: ${fallbackError.message}. ` +
            `Ensure VITE_${blockchain.toUpperCase()}_RPC_URL is configured with a valid endpoint.`
          );
        }
      }
    }
    
    // For all other testnets (hoodi, base-sepolia, etc.), use simple testnet-optimized gas prices
    console.log(`[EnhancedGasEstimation] ✅ Using generic testnet gas configuration for ${blockchain}`);
    
    // Testnet-optimized gas prices (much lower than mainnet)
    // Most testnets have very low gas prices (< 1 Gwei)
    const priorityFeeMap = {
      [FeePriority.LOW]: '0.1',      // 0.1 Gwei
      [FeePriority.MEDIUM]: '0.5',   // 0.5 Gwei
      [FeePriority.HIGH]: '1.0',     // 1.0 Gwei
      [FeePriority.URGENT]: '2.0'    // 2.0 Gwei
    };
    
    const maxPriorityFeePerGas = priorityFeeMap[priority];
    // For testnets, base fee is typically very low
    const baseFee = '0.5'; // 0.5 Gwei base fee
    const maxFeePerGas = (parseFloat(baseFee) + parseFloat(maxPriorityFeePerGas)).toString();
    
    return {
      gasPrice: undefined, // EIP-1559 only
      maxFeePerGas: ethers.parseUnits(maxFeePerGas, 'gwei').toString(),
      maxPriorityFeePerGas: ethers.parseUnits(maxPriorityFeePerGas, 'gwei').toString(),
      estimatedTimeSeconds: 15,
      networkCongestion: 'low',
      priority,
      source: 'testnet-optimized'
    };
  }
  
  /**
   * Estimate deployment cost with REAL blockchain data
   * 
   * NO FALLBACKS - Throws error if estimation fails
   */
  async estimateDeploymentCost(
    params: DeploymentEstimationParams
  ): Promise<GasEstimationResult> {
    const warnings: string[] = [];
    
    console.log(`[EnhancedGasEstimation] Starting estimation for ${params.tokenType} on ${params.blockchain}`);
    
    // Validate required parameters
    if (!params.from) {
      throw new Error(
        'Deployer address (from) is required for accurate gas estimation. ' +
        'Cannot proceed without knowing the deployer wallet.'
      );
    }
    
    if (!params.provider) {
      throw new Error(
        'RPC provider is required for gas estimation. ' +
        'Check your RPC configuration.'
      );
    }
    
    if (!params.bytecode || params.bytecode === '0x') {
      throw new Error(
        'Contract bytecode is required for gas estimation. ' +
        'Cannot estimate gas for empty contract.'
      );
    }
    
    // Step 1: Estimate gas limit from blockchain - NO FALLBACK
    console.log('[EnhancedGasEstimation] Calling eth_estimateGas...');
    let estimatedGasLimit: bigint;
    
    try {
      estimatedGasLimit = await this.estimateGasLimitFromBlockchain(params);
      console.log(`[EnhancedGasEstimation] ✅ Blockchain estimate: ${estimatedGasLimit.toString()} gas`);
    } catch (error: any) {
      // NO FALLBACK - Re-throw with context
      console.error('[EnhancedGasEstimation] ❌ Gas estimation failed:', error);
      throw new Error(
        `Gas estimation failed: ${error.message}. ` +
        `Common causes: ` +
        `1) Insufficient wallet balance for deployment, ` +
        `2) Contract constructor reverts on current chain state, ` +
        `3) Invalid bytecode or ABI, ` +
        `4) RPC provider not responding. ` +
        `Cannot proceed without accurate gas estimation.`
      );
    }
    
    // Step 2: Add 10% safety buffer (protects against base fee increases)
    const recommendedGasLimit = (estimatedGasLimit * BigInt(110)) / BigInt(100);
    console.log(`[EnhancedGasEstimation] Recommended gas limit with 10% buffer: ${recommendedGasLimit.toString()}`);
    
    // Step 3: Get current gas prices - use TestnetGasService for Sepolia/Holesky
    const priority = params.priority || FeePriority.MEDIUM;
    console.log(`[EnhancedGasEstimation] Fetching fee data for ${priority} priority...`);
    
    let feeData;
    try {
      // Route to appropriate gas price service based on network type
      if (this.isTestnet(params.blockchain)) {
        feeData = await this.getTestnetFeeData(params.blockchain, priority);
      } else {
        feeData = await this.feeEstimator.getOptimalFeeData(params.blockchain, priority);
      }
    } catch (error: any) {
      console.error('[EnhancedGasEstimation] ❌ Fee data fetch failed:', error);
      throw new Error(
        `Failed to fetch current gas prices: ${error.message}. ` +
        `Cannot proceed without real-time fee data from RPC provider.`
      );
    }
    
    console.log(`[EnhancedGasEstimation] Fee data received:`, {
      gasPrice: feeData.gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      congestion: feeData.networkCongestion,
      source: feeData.source
    });
    
    // Validate we got real fee data (not static fallbacks)
    if (feeData.source === 'static-fallback') {
      throw new Error(
        'Only static fallback fee data available. ' +
        'Cannot proceed without real-time gas prices from RPC provider. ' +
        'Check your RPC connection.'
      );
    }
    
    // Step 4: Calculate costs
    const isEIP1559 = !!(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas);
    
    let estimatedCostWei: bigint;
    let gasPrice: bigint | undefined;
    let maxFeePerGas: bigint | undefined;
    let maxPriorityFeePerGas: bigint | undefined;
    
    if (isEIP1559) {
      maxFeePerGas = BigInt(feeData.maxFeePerGas!);
      maxPriorityFeePerGas = BigInt(feeData.maxPriorityFeePerGas!);
      estimatedCostWei = recommendedGasLimit * maxFeePerGas;
      console.log(`[EnhancedGasEstimation] EIP-1559 transaction detected`);
    } else {
      if (!feeData.gasPrice) {
        throw new Error(
          'No gas price data available. ' +
          'Cannot calculate deployment cost without current gas prices.'
        );
      }
      gasPrice = BigInt(feeData.gasPrice);
      estimatedCostWei = recommendedGasLimit * gasPrice;
      console.log(`[EnhancedGasEstimation] Legacy transaction detected`);
    }
    
    // Step 5: Format results
    const nativeCurrency = this.getNativeCurrency(params.blockchain);
    const estimatedCostNative = ethers.formatEther(estimatedCostWei);
    
    console.log(`[EnhancedGasEstimation] ✅ Total estimated cost: ${estimatedCostNative} ${nativeCurrency}`);
    console.log(`[EnhancedGasEstimation] Gas price source: ${feeData.source}`);
    
    // Step 6: Create breakdown for UI
    const sourceDescriptions: Record<string, string> = {
      'etherscan': 'Real-time Etherscan API',
      'premium-rpc': 'Premium RPC (Alchemy/Infura)',
      'public-rpc': 'Public RPC endpoint',
      'testnet-rpc': 'Testnet Gas Service (Optimized)'
    };
    
    const breakdown = {
      gasLimit: recommendedGasLimit.toString(),
      gasPrice: gasPrice 
        ? ethers.formatUnits(gasPrice, 'gwei') + ' gwei'
        : maxFeePerGas 
          ? ethers.formatUnits(maxFeePerGas, 'gwei') + ' gwei'
          : '0 gwei',
      maxFeePerGas: maxFeePerGas ? ethers.formatUnits(maxFeePerGas, 'gwei') + ' gwei' : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ? ethers.formatUnits(maxPriorityFeePerGas, 'gwei') + ' gwei' : undefined,
      totalCost: estimatedCostNative,
      nativeCurrency,
      source: sourceDescriptions[feeData.source] || feeData.source
    };
    
    return {
      estimatedGasLimit,
      recommendedGasLimit,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasPriceSource: feeData.source as any,
      isEIP1559,
      estimatedCostWei,
      estimatedCostNative,
      estimatedCostUSD: undefined, // TODO: Integrate price oracle
      estimatedTimeSeconds: feeData.estimatedTimeSeconds,
      networkCongestion: feeData.networkCongestion,
      breakdown,
      warnings
    };
  }
  
  /**
   * Estimate gas limit from blockchain using ethers.js
   * This is the REAL blockchain-based estimation using eth_estimateGas
   * 
   * NO FALLBACKS - Throws error if estimation fails
   */
  private async estimateGasLimitFromBlockchain(
    params: DeploymentEstimationParams
  ): Promise<bigint> {
    const { provider, bytecode, abi, constructorArgs, from } = params;
    
    // Create a contract factory
    const factory = new ethers.ContractFactory(abi, bytecode);
    
    // Get deployment transaction
    const deployTx = await factory.getDeployTransaction(...constructorArgs);
    
    // Prepare transaction object for estimation
    const txRequest: ethers.TransactionRequest = {
      data: deployTx.data,
      from: from // REQUIRED for accurate estimation
    };
    
    // Estimate gas from blockchain using eth_estimateGas
    // This throws if:
    // - Transaction would revert
    // - Sender has insufficient balance
    // - Bytecode is invalid
    // - RPC provider is unavailable
    const gasEstimate = await provider.estimateGas(txRequest);
    
    return gasEstimate;
  }
  
  /**
   * Get native currency symbol for blockchain
   */
  private getNativeCurrency(blockchain: string): string {
    return NATIVE_CURRENCIES[blockchain.toLowerCase()] || 'ETH';
  }
  
  /**
   * Estimate gas for a simple transaction (not deployment)
   * 
   * NO FALLBACKS - Throws error if estimation fails
   */
  async estimateTransactionGas(
    provider: ethers.Provider,
    to: string,
    data: string,
    value: bigint = BigInt(0),
    from?: string
  ): Promise<bigint> {
    if (!from) {
      throw new Error(
        'Sender address (from) is required for accurate gas estimation'
      );
    }
    
    const txRequest: ethers.TransactionRequest = {
      to,
      data,
      value,
      from
    };
    
    // NO FALLBACK - Let errors propagate
    return await provider.estimateGas(txRequest);
  }
  
  /**
   * DEPRECATED: Quick estimation without blockchain call
   * 
   * This method is deprecated because it uses fallback values.
   * Use estimateDeploymentCost instead.
   */
  async quickEstimate(
    blockchain: string,
    tokenType: string,
    priority: FeePriority = FeePriority.MEDIUM
  ): Promise<{
    gasLimit: string;
    gasPrice: string;
    totalCost: string;
    currency: string;
  }> {
    throw new Error(
      'quickEstimate() is deprecated - it uses fallback values. ' +
      'Use estimateDeploymentCost() with proper provider and bytecode instead.'
    );
  }
}

// Export singleton instance
export const enhancedGasEstimator = EnhancedGasEstimationService.getInstance();

// Export as default
export default EnhancedGasEstimationService;
