/**
 * ValidationCache.ts
 * Caching layer for validation results
 * Optimizes performance by caching repeated validation requests
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { ValidationResponse } from './TransactionValidator';

export interface CachedValidation {
  key: string;
  result: ValidationResponse;
  timestamp: number;
  hitCount: number;
  expiresAt: number;
}

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  useDatabase?: boolean; // Whether to persist to database
}

export class ValidationCache {
  private memoryCache: Map<string, CachedValidation>;
  private config: Required<CacheConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 1000,
      useDatabase: config.useDatabase !== false
    };
    
    this.memoryCache = new Map();
    this.startCleanupInterval();
  }
  
  /**
   * Get cached validation result
   */
  async get(key: string): Promise<ValidationResponse | null> {
    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      memCached.hitCount++;
      return memCached.result;
    }
    
    // Check database cache if enabled
    if (this.config.useDatabase) {
      const dbCached = await this.getDatabaseCache(key);
      if (dbCached) {
        // Update memory cache
        this.memoryCache.set(key, dbCached);
        return dbCached.result;
      }
    }
    
    return null;
  }
  
  /**
   * Set validation result in cache
   */
  async set(key: string, result: ValidationResponse): Promise<void> {
    const cached: CachedValidation = {
      key,
      result,
      timestamp: Date.now(),
      hitCount: 0,
      expiresAt: Date.now() + this.config.ttl
    };
    
    // Store in memory
    this.memoryCache.set(key, cached);
    
    // Enforce max size
    if (this.memoryCache.size > this.config.maxSize) {
      this.evictOldest();
    }
    
    // Store in database if enabled
    if (this.config.useDatabase) {
      await this.setDatabaseCache(cached);
    }
  }
  
  /**
   * Clear cache entry
   */
  async clear(key?: string): Promise<void> {
    if (key) {
      this.memoryCache.delete(key);
      if (this.config.useDatabase) {
        await this.clearDatabaseCache(key);
      }
    } else {
      // Clear all
      this.memoryCache.clear();
      if (this.config.useDatabase) {
        await this.clearAllDatabaseCache();
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalEntries = entries.length;
    
    return {
      size: totalEntries,
      totalHits,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: this.getOldestEntry()?.timestamp,
      newestEntry: this.getNewestEntry()?.timestamp
    };
  }
  
  /**
   * Check if cached entry is expired
   */
  private isExpired(cached: CachedValidation): boolean {
    return Date.now() > cached.expiresAt;
  }
  
  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldest = key;
      }
    }
    
    if (oldest) {
      this.memoryCache.delete(oldest);
    }
  }
  
  /**
   * Get cache from database
   */
  private async getDatabaseCache(key: string): Promise<CachedValidation | null> {
    try {
      const { data, error } = await supabase
        .from('validation_cache')
        .select('*')
        .eq('cache_key', key)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) return null;
      
      // Update hit count
      await supabase
        .from('validation_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('cache_key', key);
      
      return {
        key: data.cache_key,
        result: data.validation_result as ValidationResponse,
        timestamp: new Date(data.created_at).getTime(),
        hitCount: data.hit_count || 0,
        expiresAt: new Date(data.expires_at).getTime()
      };
    } catch (error) {
      console.error('Failed to get database cache:', error);
      return null;
    }
  }
  
  /**
   * Set cache in database
   */
  private async setDatabaseCache(cached: CachedValidation): Promise<void> {
    try {
      const { error } = await supabase
        .from('validation_cache')
        .upsert({
          cache_key: cached.key,
          validation_result: cached.result,
          expires_at: new Date(cached.expiresAt).toISOString(),
          hit_count: cached.hitCount,
          created_at: new Date(cached.timestamp).toISOString()
        }, {
          onConflict: 'cache_key'
        });
      
      if (error) {
        console.error('Failed to set database cache:', error);
      }
    } catch (error) {
      console.error('Failed to set database cache:', error);
    }
  }
  
  /**
   * Clear specific cache from database
   */
  private async clearDatabaseCache(key: string): Promise<void> {
    try {
      await supabase
        .from('validation_cache')
        .delete()
        .eq('cache_key', key);
    } catch (error) {
      console.error('Failed to clear database cache:', error);
    }
  }
  
  /**
   * Clear all cache from database
   */
  private async clearAllDatabaseCache(): Promise<void> {
    try {
      await supabase
        .from('validation_cache')
        .delete()
        .lte('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Failed to clear all database cache:', error);
    }
  }
  
  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }
  
  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expiresAt) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.memoryCache.delete(key);
    }
    
    // Also cleanup database if enabled
    if (this.config.useDatabase) {
      this.clearAllDatabaseCache();
    }
  }
  
  /**
   * Get oldest cache entry
   */
  private getOldestEntry(): CachedValidation | null {
    let oldest: CachedValidation | null = null;
    
    for (const value of this.memoryCache.values()) {
      if (!oldest || value.timestamp < oldest.timestamp) {
        oldest = value;
      }
    }
    
    return oldest;
  }
  
  /**
   * Get newest cache entry
   */
  private getNewestEntry(): CachedValidation | null {
    let newest: CachedValidation | null = null;
    
    for (const value of this.memoryCache.values()) {
      if (!newest || value.timestamp > newest.timestamp) {
        newest = value;
      }
    }
    
    return newest;
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    return this.memoryCache.size * 1024; // Assume ~1KB per entry
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
  }
}

export interface CacheStats {
  size: number;
  totalHits: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
}
