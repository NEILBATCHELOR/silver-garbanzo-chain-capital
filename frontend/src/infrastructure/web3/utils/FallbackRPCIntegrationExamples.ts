/**
 * Fallback RPC Service Integration Examples
 * 
 * This file demonstrates how to integrate the Fallback RPC Service
 * with existing components in the Chain Capital project.
 */

import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { fallbackRPCService } from '@/infrastructure/web3/utils';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// ============================================================================
// EXAMPLE 1: Simple Fallback Usage in TransferService
// ============================================================================

export async function getProviderWithFallback(
  chainId: number,
  networkType: NetworkType = 'mainnet'
): Promise<ethers.JsonRpcProvider> {
  // Try to get RPC URL with automatic fallback support
  const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
  
  if (!rpcUrl) {
    throw new Error(
      `No RPC available for chain ID ${chainId}. ` +
      `Neither primary nor fallback RPCs are configured.`
    );
  }
  
  // Create and return provider
  const provider = new ethers.JsonRpcProvider(rpcUrl, {
    chainId,
    name: `chain-${chainId}`
  });
  
  return provider;
}

// ============================================================================
// EXAMPLE 2: Resilient Provider with Connectivity Testing
// ============================================================================

export async function getResilientProvider(
  chainId: number,
  networkType: NetworkType = 'mainnet'
): Promise<ethers.JsonRpcProvider> {
  // Get a working RPC URL (tests connectivity)
  const rpcUrl = await rpcManager.getWorkingRPCUrl(chainId, networkType, 5000);
  
  if (!rpcUrl) {
    // If no working RPC found, throw detailed error
    const config = fallbackRPCService.getFallbackConfig(chainId);
    throw new Error(
      `Cannot connect to chain ${config.chainName} (${chainId}). ` +
      `Tested ${config.rpcUrls.length} fallback RPCs without success.`
    );
  }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  
  // Verify provider is working
  try {
    await provider.getBlockNumber();
    console.log(`✅ Connected to chain ${chainId} using ${rpcUrl}`);
  } catch (error) {
    throw new Error(`Provider connected but failed to fetch block number: ${error}`);
  }
  
  return provider;
}

// ============================================================================
// EXAMPLE 3: Custom Retry Logic with Multiple Fallbacks
// ============================================================================

export async function getProviderWithRetry(
  chainId: number,
  networkType: NetworkType = 'mainnet',
  maxRetries: number = 3
): Promise<ethers.JsonRpcProvider> {
  // Get all available RPC URLs (primary + fallbacks)
  const urls = await rpcManager.getAllAvailableRPCUrls(chainId, networkType);
  
  if (urls.length === 0) {
    throw new Error(`No RPC URLs available for chain ${chainId}`);
  }
  
  const errors: string[] = [];
  
  // Try each URL up to maxRetries times
  for (let i = 0; i < Math.min(urls.length, maxRetries); i++) {
    try {
      const provider = new ethers.JsonRpcProvider(urls[i], chainId);
      
      // Test the connection
      await provider.getBlockNumber();
      
      console.log(
        `✅ Connected using ${i === 0 ? 'primary' : 'fallback'} RPC #${i + 1}: ${urls[i]}`
      );
      
      return provider;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`URL ${i + 1} (${urls[i]}): ${errorMsg}`);
      console.warn(`❌ Failed to connect to ${urls[i]}, trying next...`);
      continue;
    }
  }
  
  // All attempts failed
  throw new Error(
    `Failed to connect to chain ${chainId} after ${maxRetries} attempts:\n` +
    errors.join('\n')
  );
}

// ============================================================================
// EXAMPLE 4: Cached Fallback RPC Service
// ============================================================================

class CachedFallbackRPCService {
  private cache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get cached working RPC or find a new one
   */
  async getWorkingRPC(chainId: number, networkType: NetworkType = 'mainnet'): Promise<string | null> {
    const cacheKey = `${chainId}-${networkType}`;
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey) || 0;
    
    // Return cached URL if still valid
    if (cached && Date.now() < expiry) {
      console.log(`📦 Using cached RPC for chain ${chainId}`);
      return cached;
    }
    
    // Try primary RPC first
    let url = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
    
    // If primary failed, test fallbacks for working URL
    if (!url) {
      const result = await fallbackRPCService.getWorkingFallbackRPC(chainId);
      url = result.url;
    }
    
    // Cache the working URL
    if (url) {
      this.cache.set(cacheKey, url);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
      console.log(`💾 Cached RPC for chain ${chainId}: ${url}`);
    }
    
    return url;
  }
  
  /**
   * Clear cache for a specific chain
   */
  clearCache(chainId: number, networkType: NetworkType = 'mainnet'): void {
    const cacheKey = `${chainId}-${networkType}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }
  
  /**
   * Clear all cached RPCs
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const cachedRPCService = new CachedFallbackRPCService();

// ============================================================================
// EXAMPLE 5: React Hook for Fallback RPCs
// ============================================================================

import { useState, useEffect } from 'react';

export function useRPCWithFallback(chainId: number, networkType: NetworkType = 'mainnet') {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    async function initProvider() {
      try {
        setLoading(true);
        setError(null);
        
        // Get RPC URL with fallback
        const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
        
        if (!rpcUrl) {
          throw new Error(`No RPC available for chain ${chainId}`);
        }
        
        // Check if using fallback
        const isPrimaryRPC = !rpcUrl.includes('publicnode.com') && 
                            !rpcUrl.includes('grove.city');
        setUsingFallback(!isPrimaryRPC);
        
        // Create provider
        const newProvider = new ethers.JsonRpcProvider(rpcUrl, chainId);
        
        // Test connection
        await newProvider.getBlockNumber();
        
        if (mounted) {
          setProvider(newProvider);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
          setLoading(false);
        }
      }
    }
    
    initProvider();
    
    return () => {
      mounted = false;
    };
  }, [chainId, networkType]);
  
  return { provider, loading, error, usingFallback };
}

// ============================================================================
// EXAMPLE 6: Monitoring and Alerting
// ============================================================================

export class RPCMonitoringService {
  private fallbackUsageCount = new Map<number, number>();
  private lastFallbackTime = new Map<number, number>();
  
  /**
   * Track fallback usage for monitoring
   */
  async getProviderWithMonitoring(
    chainId: number,
    networkType: NetworkType = 'mainnet'
  ): Promise<ethers.JsonRpcProvider> {
    const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
    
    if (!rpcUrl) {
      this.alertCritical(chainId, 'No RPC available');
      throw new Error(`No RPC available for chain ${chainId}`);
    }
    
    // Check if using fallback
    const isFallback = rpcUrl.includes('publicnode.com') || 
                      rpcUrl.includes('grove.city');
    
    if (isFallback) {
      // Track fallback usage
      const count = this.fallbackUsageCount.get(chainId) || 0;
      this.fallbackUsageCount.set(chainId, count + 1);
      this.lastFallbackTime.set(chainId, Date.now());
      
      // Alert if using fallbacks frequently
      if (count > 10) {
        this.alertWarning(
          chainId,
          `Fallback RPC used ${count} times - primary RPC may be down`
        );
      }
      
      console.warn(`⚠️  Using fallback RPC for chain ${chainId}`);
    }
    
    return new ethers.JsonRpcProvider(rpcUrl, chainId);
  }
  
  /**
   * Get monitoring statistics
   */
  getStatistics() {
    return {
      fallbackUsage: Array.from(this.fallbackUsageCount.entries()),
      lastFallbacks: Array.from(this.lastFallbackTime.entries())
    };
  }
  
  private alertWarning(chainId: number, message: string): void {
    console.warn(`⚠️  RPC Warning for chain ${chainId}: ${message}`);
    // Could send to monitoring service like Sentry, Datadog, etc.
  }
  
  private alertCritical(chainId: number, message: string): void {
    console.error(`🚨 RPC Critical for chain ${chainId}: ${message}`);
    // Could trigger alerts/notifications
  }
}

export const rpcMonitor = new RPCMonitoringService();

// ============================================================================
// EXAMPLE 7: Diagnostic Tool
// ============================================================================

export async function diagnoseRPCConnectivity(chainId: number): Promise<void> {
  console.log(`\n🔍 Diagnosing RPC connectivity for chain ${chainId}...\n`);
  
  // Get fallback config
  const config = fallbackRPCService.getFallbackConfig(chainId);
  console.log(`Chain: ${config.chainName}`);
  console.log(`Fallback RPCs available: ${config.rpcUrls.length}`);
  
  if (!config.hasUrls) {
    console.warn('❌ No fallback RPCs configured for this chain');
    return;
  }
  
  // Test each fallback RPC
  console.log('\nTesting fallback RPCs...');
  for (let i = 0; i < config.rpcUrls.length; i++) {
    const url = config.rpcUrls[i];
    const startTime = Date.now();
    
    try {
      const provider = new ethers.JsonRpcProvider(url, chainId);
      await provider.getBlockNumber();
      const latency = Date.now() - startTime;
      
      console.log(`✅ RPC ${i + 1}: ${url} (${latency}ms)`);
    } catch (error) {
      console.log(`❌ RPC ${i + 1}: ${url} - FAILED`);
    }
  }
  
  // Test working RPC finder
  console.log('\nFinding working RPC...');
  const result = await fallbackRPCService.getWorkingFallbackRPC(chainId);
  
  if (result.url) {
    console.log(`✅ Working RPC found: ${result.url}`);
  } else {
    console.error(`❌ No working RPC found. Error: ${result.error}`);
  }
  
  console.log('\n✅ Diagnosis complete\n');
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Basic usage
// const provider = await getProviderWithFallback(1);

// Example 2: Resilient with testing
// const provider = await getResilientProvider(1);

// Example 3: Custom retry logic
// const provider = await getProviderWithRetry(1, 'mainnet', 5);

// Example 4: Cached service
// const url = await cachedRPCService.getWorkingRPC(1);

// Example 5: React hook
// const { provider, loading, error, usingFallback } = useRPCWithFallback(1);

// Example 6: Monitoring
// const provider = await rpcMonitor.getProviderWithMonitoring(1);

// Example 7: Diagnostic
// await diagnoseRPCConnectivity(1);
