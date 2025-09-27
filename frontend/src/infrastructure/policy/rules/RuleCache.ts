/**
 * Rule Cache - Enhanced
 * Strategic caching layer for rule evaluation results with advanced eviction and statistics
 */

import type { PipelineResult } from './types';
import { supabase } from '@/infrastructure/database/client';

export interface RuleCacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cached entries
  cleanupInterval?: number; // Cleanup interval in milliseconds
  strategy?: 'lru' | 'lfu' | 'fifo' | 'ttl'; // Cache eviction strategy
  persistToDatabase?: boolean; // Persist cache to database
  warmupOnStart?: boolean; // Pre-load common evaluations
}

interface CacheEntry {
  key: string;
  value: PipelineResult;
  timestamp: number;
  hits: number;
  lastAccessTime: number;
  size: number; // Approximate memory size
  priority?: number; // Priority for eviction
  persistent?: boolean; // Should not be evicted
}

interface CacheMetrics {
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  averageHitTime: number;
  averageMissTime: number;
  memoryUsage: number;
}

export class RuleCache {
  private cache: Map<string, CacheEntry>;
  private config: RuleCacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private metrics: CacheMetrics;
  private accessLog: Map<string, number[]>; // Track access patterns

  constructor(config: RuleCacheConfig = {}) {
    this.config = {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      strategy: 'lru',
      persistToDatabase: false,
      warmupOnStart: false,
      ...config
    };
    
    this.cache = new Map();
    this.accessLog = new Map();
    this.metrics = {
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      averageHitTime: 0,
      averageMissTime: 0,
      memoryUsage: 0
    };
    
    if (this.config.enabled) {
      if (this.config.cleanupInterval) {
        this.startCleanup();
      }
      
      if (this.config.warmupOnStart) {
        this.warmupCache();
      }
    }
  }

  /**
   * Get value from cache with advanced tracking
   */
  async get(key: string): Promise<PipelineResult | null> {
    if (!this.config.enabled) return null;
    
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.totalMisses++;
      this.updateAverageTime('miss', performance.now() - startTime);
      this.trackAccess(key, false);
      
      // Try to load from database if persistent caching is enabled
      if (this.config.persistToDatabase) {
        return await this.loadFromDatabase(key);
      }
      
      return null;
    }
    
    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.totalMisses++;
      this.updateAverageTime('miss', performance.now() - startTime);
      return null;
    }
    
    // Update hit metrics
    entry.hits++;
    entry.lastAccessTime = Date.now();
    this.metrics.totalHits++;
    this.updateAverageTime('hit', performance.now() - startTime);
    this.trackAccess(key, true);
    
    // Update priority for adaptive caching
    this.updatePriority(entry);
    
    return entry.value;
  }

  /**
   * Set value in cache with advanced management
   */
  async set(key: string, value: PipelineResult, options?: {
    priority?: number;
    persistent?: boolean;
    customTTL?: number;
  }): Promise<void> {
    if (!this.config.enabled) return;
    
    // Calculate approximate size
    const size = this.calculateSize(value);
    
    // Check cache size and evict if necessary
    while (this.getMemoryUsage() + size > this.getMaxMemory() || 
           this.cache.size >= (this.config.maxSize || 1000)) {
      this.evict();
      this.metrics.totalEvictions++;
    }
    
    const entry: CacheEntry = {
      key,
      value: { ...value, timestamp: Date.now() },
      timestamp: Date.now(),
      lastAccessTime: Date.now(),
      hits: 0,
      size,
      priority: options?.priority || this.calculatePriority(value),
      persistent: options?.persistent || false
    };
    
    this.cache.set(key, entry);
    this.metrics.memoryUsage += size;
    
    // Persist to database if enabled
    if (this.config.persistToDatabase) {
      await this.persistToDatabase(key, entry);
    }
  }

  /**
   * Advanced eviction based on configured strategy
   */
  private evict(): void {
    let victimKey: string | null = null;
    
    switch (this.config.strategy) {
      case 'lru':
        victimKey = this.evictLRU();
        break;
      case 'lfu':
        victimKey = this.evictLFU();
        break;
      case 'fifo':
        victimKey = this.evictFIFO();
        break;
      case 'ttl':
        victimKey = this.evictOldest();
        break;
      default:
        victimKey = this.evictLRU();
    }
    
    if (victimKey) {
      const entry = this.cache.get(victimKey);
      if (entry) {
        this.metrics.memoryUsage -= entry.size;
      }
      this.cache.delete(victimKey);
    }
  }

  private evictLRU(): string | null {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.persistent) continue;
      
      if (entry.lastAccessTime < lruTime) {
        lruKey = key;
        lruTime = entry.lastAccessTime;
      }
    }
    
    return lruKey;
  }

  private evictLFU(): string | null {
    let lfuKey: string | null = null;
    let minHits = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.persistent) continue;
      
      const frequency = entry.hits / (Date.now() - entry.timestamp);
      if (frequency < minHits) {
        lfuKey = key;
        minHits = frequency;
      }
    }
    
    return lfuKey;
  }

  private evictFIFO(): string | null {
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.persistent) {
        return key;
      }
    }
    return null;
  }

  private evictOldest(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.persistent) continue;
      
      if (entry.timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    }
    
    return oldestKey;
  }

  /**
   * Calculate priority based on rule evaluation results
   */
  private calculatePriority(result: PipelineResult): number {
    let priority = 0;
    
    // Higher priority for failed evaluations (need quick re-evaluation)
    if (!result.success) priority += 10;
    
    // Higher priority for evaluations with conflicts
    if (result.conflicts && result.conflicts.length > 0) priority += 5;
    
    // Higher priority for quick evaluations (likely to be re-used)
    if (result.executionTime && result.executionTime < 100) priority += 3;
    
    return priority;
  }

  /**
   * Update priority based on access patterns
   */
  private updatePriority(entry: CacheEntry): void {
    const accessPattern = this.accessLog.get(entry.key);
    if (!accessPattern) return;
    
    // Calculate access frequency
    const frequency = accessPattern.length;
    const recency = Date.now() - Math.max(...accessPattern);
    
    // Adaptive priority based on frequency and recency
    entry.priority = (entry.priority || 0) + 
      (frequency * 2) - (recency / 1000000);
  }

  /**
   * Track access patterns for analytics
   */
  private trackAccess(key: string, hit: boolean): void {
    if (!this.accessLog.has(key)) {
      this.accessLog.set(key, []);
    }
    
    const log = this.accessLog.get(key)!;
    log.push(Date.now());
    
    // Keep only last 100 accesses
    if (log.length > 100) {
      log.shift();
    }
  }

  /**
   * Persist cache entry to database
   */
  private async persistToDatabase(key: string, entry: CacheEntry): Promise<void> {
    try {
      await supabase
        .from('validation_cache')
        .upsert({
          cache_key: key,
          validation_result: entry.value,
          expires_at: new Date(entry.timestamp + (this.config.ttl || 0)).toISOString(),
          hit_count: entry.hits,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to persist cache to database:', error);
    }
  }

  /**
   * Load cache entry from database
   */
  private async loadFromDatabase(key: string): Promise<PipelineResult | null> {
    try {
      const { data, error } = await supabase
        .from('validation_cache')
        .select('*')
        .eq('cache_key', key)
        .single();
      
      if (error || !data) return null;
      
      // Update hit count
      await supabase
        .from('validation_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('cache_key', key);
      
      return data.validation_result as PipelineResult;
    } catch (error) {
      console.error('Failed to load from database:', error);
      return null;
    }
  }

  /**
   * Pre-load common evaluations on startup
   */
  private async warmupCache(): Promise<void> {
    try {
      // Load frequently accessed evaluations from last 24 hours
      const { data } = await supabase
        .from('validation_cache')
        .select('*')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .order('hit_count', { ascending: false })
        .limit(100);
      
      if (data) {
        for (const item of data) {
          const entry: CacheEntry = {
            key: item.cache_key,
            value: item.validation_result,
            timestamp: new Date(item.created_at).getTime(),
            lastAccessTime: Date.now(),
            hits: item.hit_count || 0,
            size: this.calculateSize(item.validation_result),
            persistent: false
          };
          
          this.cache.set(item.cache_key, entry);
        }
      }
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  /**
   * Calculate approximate memory size of value
   */
  private calculateSize(value: any): number {
    const str = JSON.stringify(value);
    return str.length * 2; // Approximate bytes (UTF-16)
  }

  /**
   * Get total memory usage
   */
  private getMemoryUsage(): number {
    return this.metrics.memoryUsage;
  }

  /**
   * Get maximum memory limit (10MB default)
   */
  private getMaxMemory(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * Update average timing metrics
   */
  private updateAverageTime(type: 'hit' | 'miss', time: number): void {
    if (type === 'hit') {
      const total = this.metrics.totalHits;
      this.metrics.averageHitTime = 
        (this.metrics.averageHitTime * (total - 1) + time) / total;
    } else {
      const total = this.metrics.totalMisses;
      this.metrics.averageMissTime = 
        (this.metrics.averageMissTime * (total - 1) + time) / total;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    memoryUsage: string;
    averageHitTime: string;
    averageMissTime: string;
    topKeys: Array<{ key: string; hits: number }>;
  } {
    const hitRate = this.metrics.totalHits > 0 
      ? this.metrics.totalHits / (this.metrics.totalHits + this.metrics.totalMisses) 
      : 0;
    
    // Get top accessed keys
    const topKeys = Array.from(this.cache.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, hits: entry.hits }));
    
    return {
      size: this.cache.size,
      hits: this.metrics.totalHits,
      misses: this.metrics.totalMisses,
      hitRate,
      evictions: this.metrics.totalEvictions,
      memoryUsage: `${(this.metrics.memoryUsage / 1024).toFixed(2)} KB`,
      averageHitTime: `${this.metrics.averageHitTime.toFixed(2)} ms`,
      averageMissTime: `${this.metrics.averageMissTime.toFixed(2)} ms`,
      topKeys
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!this.config.ttl) return false;
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval || 60000);
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry) && !entry.persistent) {
        keysToDelete.push(key);
        this.metrics.memoryUsage -= entry.size;
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    // Clean up access log
    for (const [key, log] of this.accessLog.entries()) {
      const recentAccesses = log.filter(
        time => Date.now() - time < 3600000 // Keep last hour
      );
      
      if (recentAccesses.length === 0) {
        this.accessLog.delete(key);
      } else {
        this.accessLog.set(key, recentAccesses);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessLog.clear();
    this.metrics.memoryUsage = 0;
  }

  async remove(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.metrics.memoryUsage -= entry.size;
    }
    this.cache.delete(key);
    this.accessLog.delete(key);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.accessLog.clear();
  }
}
