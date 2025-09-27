/**
 * Gas Estimator
 * Estimates gas costs for operations
 */

import type { OperationRequest, GasEstimate } from '../types';
import type { EnhancedTokenManager } from '../../web3/tokens/EnhancedTokenManager';

export interface GasEstimatorConfig {
  bufferPercentage?: number; // Extra buffer to add to estimates
  maxGasLimit?: bigint;
  cacheEstimates?: boolean;
  cacheTTL?: number; // Cache time-to-live in milliseconds
}

export class GasEstimator {
  private config: GasEstimatorConfig;
  private tokenManager: EnhancedTokenManager;
  private estimateCache: Map<string, { estimate: GasEstimate; timestamp: number }>;
  
  constructor(tokenManager: EnhancedTokenManager, config: GasEstimatorConfig = {}) {
    this.tokenManager = tokenManager;
    this.config = {
      bufferPercentage: 20, // 20% buffer by default
      maxGasLimit: BigInt(10000000), // 10M gas max
      cacheEstimates: true,
      cacheTTL: 60000, // 1 minute cache
      ...config
    };
    this.estimateCache = new Map();
  }
  
  /**
   * Estimate gas for operation
   */
  async estimateGas(request: OperationRequest): Promise<GasEstimate> {
    // Check cache first
    if (this.config.cacheEstimates) {
      const cached = this.getCachedEstimate(request);
      if (cached) return cached;
    }
    
    // For now, use default gas estimates based on operation type
    // In production, this would query the blockchain adapter
    let gasLimit: bigint;
    
    switch (request.type) {
      case 'mint':
        gasLimit = BigInt(100000);
        break;
      case 'burn':
        gasLimit = BigInt(80000);
        break;
      case 'transfer':
        gasLimit = BigInt(65000);
        break;
      case 'lock':
        gasLimit = BigInt(120000);
        break;
      case 'unlock':
        gasLimit = BigInt(90000);
        break;
      case 'block':
        gasLimit = BigInt(85000);
        break;
      case 'unblock':
        gasLimit = BigInt(75000);
        break;
      default:
        gasLimit = BigInt(100000); // Default estimate
    }
    
    // Add buffer
    gasLimit = this.addBuffer(gasLimit);
    
    // Ensure within limits
    gasLimit = this.enforceGasLimits(gasLimit);
    
    // Get current gas price (default to 20 gwei for now)
    const gasPrice = BigInt(20000000000); // 20 gwei
    
    // Calculate estimated cost
    const estimatedCost = this.calculateCost(gasLimit, gasPrice);
    
    const estimate: GasEstimate = {
      limit: gasLimit,
      price: gasPrice,
      estimatedCost
    };
    
    // Cache the estimate
    if (this.config.cacheEstimates) {
      this.cacheEstimate(request, estimate);
    }
    
    return estimate;
  }
  
  /**
   * Estimate gas for mint operation
   */
  private async estimateMintGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      const params = {
        to: request.parameters.to!,
        amount: request.parameters.amount!
      };
      return await adapter.estimateGas('mint', params);
    } catch {
      // Fallback estimate for mint
      return BigInt(75000);
    }
  }
  
  /**
   * Estimate gas for burn operation
   */
  private async estimateBurnGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      const params = {
        from: request.parameters.from,
        amount: request.parameters.amount!
      };
      return await adapter.estimateGas('burn', params);
    } catch {
      // Fallback estimate for burn
      return BigInt(60000);
    }
  }
  
  /**
   * Estimate gas for transfer operation
   */
  private async estimateTransferGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      const params = {
        from: request.parameters.from,
        to: request.parameters.to!,
        amount: request.parameters.amount!
      };
      return await adapter.estimateGas('transfer', params);
    } catch {
      // Fallback estimate for transfer
      return BigInt(65000);
    }
  }  
  /**
   * Estimate gas for lock operation
   */
  private async estimateLockGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      return await adapter.estimateGas('lock', request.parameters);
    } catch {
      // Fallback estimate for lock (higher due to complexity)
      return BigInt(100000);
    }
  }
  
  /**
   * Estimate gas for unlock operation
   */
  private async estimateUnlockGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      return await adapter.estimateGas('unlock', request.parameters);
    } catch {
      // Fallback estimate for unlock
      return BigInt(80000);
    }
  }
  
  /**
   * Estimate gas for block operation
   */
  private async estimateBlockGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      return await adapter.estimateGas('block', request.parameters);
    } catch {
      // Fallback estimate for block
      return BigInt(70000);
    }
  }
  
  /**
   * Estimate gas for unblock operation
   */
  private async estimateUnblockGas(request: OperationRequest, adapter: any): Promise<bigint> {
    try {
      return await adapter.estimateGas('unblock', request.parameters);
    } catch {
      // Fallback estimate for unblock
      return BigInt(70000);
    }
  }
  
  /**
   * Add buffer to gas estimate
   */
  private addBuffer(gasLimit: bigint): bigint {
    const buffer = (gasLimit * BigInt(this.config.bufferPercentage!)) / BigInt(100);
    return gasLimit + buffer;
  }
  
  /**
   * Enforce gas limits
   */
  private enforceGasLimits(gasLimit: bigint): bigint {
    if (gasLimit > this.config.maxGasLimit!) {
      console.warn(`Gas limit ${gasLimit} exceeds max ${this.config.maxGasLimit}, capping`);
      return this.config.maxGasLimit!;
    }
    return gasLimit;
  }
  
  /**
   * Calculate estimated cost
   */
  private calculateCost(gasLimit: bigint, gasPrice: bigint): string {
    const costInWei = gasLimit * gasPrice;
    const costInEth = Number(costInWei) / 1e18;
    return `${costInEth.toFixed(6)} ETH`;
  }
  
  /**
   * Get cached estimate
   */
  private getCachedEstimate(request: OperationRequest): GasEstimate | null {
    const cacheKey = this.getCacheKey(request);
    const cached = this.estimateCache.get(cacheKey);
    
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > this.config.cacheTTL!;
      if (!isExpired) {
        return cached.estimate;
      }
      // Remove expired entry
      this.estimateCache.delete(cacheKey);
    }
    
    return null;
  }
  
  /**
   * Cache estimate
   */
  private cacheEstimate(request: OperationRequest, estimate: GasEstimate): void {
    const cacheKey = this.getCacheKey(request);
    this.estimateCache.set(cacheKey, {
      estimate,
      timestamp: Date.now()
    });
    
    // Clean up old entries periodically
    if (this.estimateCache.size > 100) {
      this.cleanupCache();
    }
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(request: OperationRequest): string {
    return `${request.chain}-${request.type}-${request.tokenAddress}-${JSON.stringify(request.parameters)}`;
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.estimateCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL!) {
        this.estimateCache.delete(key);
      }
    }
  }
}