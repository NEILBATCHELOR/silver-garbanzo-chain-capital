/**
 * Token Cache Service
 * 
 * Provides intelligent caching for token data with memory-based storage
 * and automatic cache invalidation strategies.
 */

import { EnhancedTokenData } from '../types';
import { BulkTokenData } from './tokenBulkService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
}

interface TokenCacheStats {
  entries: number;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
}

class TokenCacheService {
  private static instance: TokenCacheService;
  
  // Cache for individual enhanced token data
  private enhancedTokenCache = new Map<string, CacheEntry<EnhancedTokenData>>();
  
  // Cache for bulk token data by project
  private bulkTokenCache = new Map<string, CacheEntry<BulkTokenData[]>>();
  
  // Cache for token status counts by project
  private statusCountsCache = new Map<string, CacheEntry<Record<string, number>>>();
  
  // Cache for computed data (expensive operations)
  private computedCache = new Map<string, CacheEntry<any>>();
  
  // Cache statistics
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  // Cache configuration
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly EXTENDED_TTL = 15 * 60 * 1000; // 15 minutes for bulk data
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
  
  private cleanupTimer?: NodeJS.Timeout;
  
  private constructor() {
    this.startCleanupTimer();
  }
  
  static getInstance(): TokenCacheService {
    if (!TokenCacheService.instance) {
      TokenCacheService.instance = new TokenCacheService();
    }
    return TokenCacheService.instance;
  }
  
  /**
   * Cache enhanced token data
   */
  setEnhancedToken(tokenId: string, data: EnhancedTokenData): void {
    this.enhancedTokenCache.set(tokenId, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
    this.maintainCacheSize(this.enhancedTokenCache);
  }
  
  /**
   * Get cached enhanced token data
   */
  getEnhancedToken(tokenId: string): EnhancedTokenData | null {
    this.stats.totalRequests++;
    
    const entry = this.enhancedTokenCache.get(tokenId);
    if (entry && this.isValid(entry, this.DEFAULT_TTL)) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.stats.cacheHits++;
      return entry.data;
    }
    
    if (entry) {
      this.enhancedTokenCache.delete(tokenId);
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * Cache bulk token data for a project
   */
  setBulkTokens(projectId: string, data: BulkTokenData[]): void {
    this.bulkTokenCache.set(projectId, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
    this.maintainCacheSize(this.bulkTokenCache);
  }
  
  /**
   * Get cached bulk token data for a project
   */
  getBulkTokens(projectId: string): BulkTokenData[] | null {
    this.stats.totalRequests++;
    
    const entry = this.bulkTokenCache.get(projectId);
    if (entry && this.isValid(entry, this.EXTENDED_TTL)) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.stats.cacheHits++;
      return entry.data;
    }
    
    if (entry) {
      this.bulkTokenCache.delete(projectId);
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * Cache token status counts for a project
   */
  setStatusCounts(projectId: string, data: Record<string, number>): void {
    this.statusCountsCache.set(projectId, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }
  
  /**
   * Get cached token status counts for a project
   */
  getStatusCounts(projectId: string): Record<string, number> | null {
    this.stats.totalRequests++;
    
    const entry = this.statusCountsCache.get(projectId);
    if (entry && this.isValid(entry, this.DEFAULT_TTL)) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.stats.cacheHits++;
      return entry.data;
    }
    
    if (entry) {
      this.statusCountsCache.delete(projectId);
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * Cache computed data (expensive operations)
   */
  setComputed(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.computedCache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
    this.maintainCacheSize(this.computedCache);
  }
  
  /**
   * Get cached computed data
   */
  getComputed<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
    this.stats.totalRequests++;
    
    const entry = this.computedCache.get(key);
    if (entry && this.isValid(entry, ttl)) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.stats.cacheHits++;
      return entry.data as T;
    }
    
    if (entry) {
      this.computedCache.delete(key);
    }
    
    this.stats.cacheMisses++;
    return null;
  }
  
  /**
   * Invalidate cache entries for a specific project
   */
  invalidateProject(projectId: string): void {
    this.bulkTokenCache.delete(projectId);
    this.statusCountsCache.delete(projectId);
    
    // Remove computed cache entries related to this project
    for (const [key] of this.computedCache) {
      if (key.includes(projectId)) {
        this.computedCache.delete(key);
      }
    }
    
    console.log(`[TokenCacheService] Invalidated cache for project: ${projectId}`);
  }
  
  /**
   * Invalidate cache entries for a specific token
   */
  invalidateToken(tokenId: string): void {
    this.enhancedTokenCache.delete(tokenId);
    
    // Remove computed cache entries related to this token
    for (const [key] of this.computedCache) {
      if (key.includes(tokenId)) {
        this.computedCache.delete(key);
      }
    }
    
    console.log(`[TokenCacheService] Invalidated cache for token: ${tokenId}`);
  }
  
  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.enhancedTokenCache.clear();
    this.bulkTokenCache.clear();
    this.statusCountsCache.clear();
    this.computedCache.clear();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    console.log('[TokenCacheService] All caches cleared');
  }
  
  /**
   * Get cache statistics
   */
  getStats(): TokenCacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.cacheHits / this.stats.totalRequests 
      : 0;
    
    const totalEntries = this.enhancedTokenCache.size + 
                        this.bulkTokenCache.size + 
                        this.statusCountsCache.size + 
                        this.computedCache.size;
    
    return {
      entries: totalEntries,
      hitRate: hitRate * 100,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp < ttl;
  }
  
  /**
   * Maintain cache size limits
   */
  private maintainCacheSize(cache: Map<string, CacheEntry<any>>): void {
    if (cache.size <= this.MAX_CACHE_SIZE) return;
    
    // Remove least recently used entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.1));
    toRemove.forEach(([key]) => cache.delete(key));
  }
  
  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean enhanced token cache
    for (const [key, entry] of this.enhancedTokenCache) {
      if (!this.isValid(entry, this.DEFAULT_TTL)) {
        this.enhancedTokenCache.delete(key);
      }
    }
    
    // Clean bulk token cache
    for (const [key, entry] of this.bulkTokenCache) {
      if (!this.isValid(entry, this.EXTENDED_TTL)) {
        this.bulkTokenCache.delete(key);
      }
    }
    
    // Clean status counts cache
    for (const [key, entry] of this.statusCountsCache) {
      if (!this.isValid(entry, this.DEFAULT_TTL)) {
        this.statusCountsCache.delete(key);
      }
    }
    
    // Clean computed cache
    for (const [key, entry] of this.computedCache) {
      if (!this.isValid(entry, this.DEFAULT_TTL)) {
        this.computedCache.delete(key);
      }
    }
  }
  
  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    // Rough estimation - each cache entry is approximately 1KB
    size += this.enhancedTokenCache.size * 1024;
    size += this.bulkTokenCache.size * 10240; // Bulk data is larger
    size += this.statusCountsCache.size * 512;
    size += this.computedCache.size * 1024;
    
    return size;
  }
  
  /**
   * Cleanup resources on destruction
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clearAll();
  }
}

export default TokenCacheService;