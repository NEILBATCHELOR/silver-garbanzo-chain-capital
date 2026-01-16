/**
 * XRPL Cache Service
 * In-memory caching for XRPL data with TTL support
 */

import { CacheEntry, CacheStats } from '../../types/xrpl'

interface CacheConfig {
  defaultTTL: number // seconds
  maxEntries: number
  cleanupInterval: number // seconds
}

export class XRPLCacheService {
  private cache: Map<string, CacheEntry>
  private config: CacheConfig
  private hits: number = 0
  private misses: number = 0
  private cleanupTimer?: NodeJS.Timeout

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map()
    this.config = {
      defaultTTL: config?.defaultTTL ?? 300, // 5 minutes default
      maxEntries: config?.maxEntries ?? 1000,
      cleanupInterval: config?.cleanupInterval ?? 60 // 1 minute
    }

    // Start cleanup timer
    this.startCleanup()
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, value: T, ttl?: number): void {
    // Check max entries
    if (this.cache.size >= this.config.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + (ttl ?? this.config.defaultTTL))

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt,
      createdAt: new Date()
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses
    
    return {
      totalKeys: this.cache.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval * 1000
    )
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let size = 0
    
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry.value).length * 2
      size += 48 // Approximate overhead for Date objects and structure
    }

    return size
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.stopCleanup()
    this.clear()
  }
}

// Singleton instance
export const xrplCache = new XRPLCacheService()
