/**
 * Stage 8: Exchange Rate Cache
 * 
 * Caching layer for exchange rates with TTL and invalidation support.
 * Follows the caching pattern from PriceFeedManager.
 */

import {
  ExchangeRate,
  Currency,
  GetExchangeRateResponse,
  StaleDataError
} from './types';

/**
 * Configuration for exchange rate cache
 */
export interface ExchangeRateCacheConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** Maximum cache size (default: 1000 entries) */
  maxSize?: number;
  /** Log level for debugging */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Cached exchange rate entry
 */
interface CachedExchangeRate {
  data: ExchangeRate;
  timestamp: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Exchange Rate Cache Service
 * 
 * Provides in-memory caching for exchange rates with TTL and size limits.
 */
export class ExchangeRateCache {
  private cache: Map<string, CachedExchangeRate> = new Map();
  private ttlMs: number;
  private maxSize: number;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(config?: ExchangeRateCacheConfig) {
    this.ttlMs = config?.ttlMs ?? 5 * 60 * 1000; // Default: 5 minutes
    this.maxSize = config?.maxSize ?? 1000;
    this.logLevel = config?.logLevel ?? 'error';
  }
  
  /**
   * Get exchange rate from cache
   */
  get(
    tokenId: string,
    currency: Currency,
    timestamp?: string
  ): GetExchangeRateResponse | null {
    const key = this.generateKey(tokenId, currency, timestamp);
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.misses++;
      this.log('debug', `Cache miss for ${key}`);
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    
    // Check if entry is stale
    if (age > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      this.log('debug', `Cache entry stale for ${key} (age: ${age}ms)`);
      return null;
    }
    
    // Update hit count
    cached.hits++;
    this.hits++;
    
    this.log('debug', `Cache hit for ${key} (age: ${age}ms, hits: ${cached.hits})`);
    
    return {
      rate: cached.data,
      cached: true,
      age
    };
  }
  
  /**
   * Set exchange rate in cache
   */
  set(rate: ExchangeRate): void {
    const key = this.generateKey(rate.tokenId, rate.currency, rate.effectiveFrom);
    
    // Check cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldestEntry();
    }
    
    this.cache.set(key, {
      data: rate,
      timestamp: Date.now(),
      hits: 0
    });
    
    this.log('debug', `Cached exchange rate for ${key}`);
  }
  
  /**
   * Invalidate cache entry
   */
  invalidate(tokenId: string, currency: Currency, timestamp?: string): boolean {
    const key = this.generateKey(tokenId, currency, timestamp);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.log('info', `Invalidated cache entry for ${key}`);
    }
    
    return deleted;
  }
  
  /**
   * Invalidate all cache entries for a token
   */
  invalidateToken(tokenId: string): number {
    let count = 0;
    
    for (const [key, _] of this.cache) {
      if (key.startsWith(`${tokenId}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.log('info', `Invalidated ${count} cache entries for token ${tokenId}`);
    return count;
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.log('info', `Cleared cache (${size} entries)`);
  }
  
  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
    const totalRequests = this.hits + this.misses;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }
  
  /**
   * Set cache TTL
   */
  setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
    this.log('info', `Cache TTL set to ${ttlMs}ms`);
  }
  
  /**
   * Get cache TTL
   */
  getTtl(): number {
    return this.ttlMs;
  }
  
  /**
   * Cleanup stale entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.log('info', `Cleaned up ${removed} stale cache entries`);
    }
    
    return removed;
  }
  
  /**
   * Generate cache key
   */
  private generateKey(tokenId: string, currency: Currency, timestamp?: string): string {
    const timestampKey = timestamp ?? 'current';
    return `${tokenId}:${currency}:${timestampKey}`;
  }
  
  /**
   * Evict oldest cache entry (LRU-style)
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.log('debug', `Evicted oldest cache entry: ${oldestKey}`);
    }
  }
  
  /**
   * Log message based on log level
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
    const levels = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };
    
    if (levels[this.logLevel] >= levels[level]) {
      const prefix = `[ExchangeRateCache] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message);
          break;
        case 'warn':
          console.warn(prefix, message);
          break;
        case 'info':
          console.info(prefix, message);
          break;
        case 'debug':
          console.debug(prefix, message);
          break;
      }
    }
  }
}
