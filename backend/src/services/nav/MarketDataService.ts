/**
 * MarketDataService - Market data provider integration
 * 
 * Handles:
 * - Multi-provider price data fetching
 * - Provider failover and fallback strategies
 * - Price validation and staleness detection
 * - Rate limiting and caching
 * - Data normalization across providers
 * 
 * Providers supported:
 * - Bloomberg API (primary)
 * - Refinitiv (fallback)
 * - CoinGecko (crypto assets)
 * - Internal database cache
 * - Manual price overrides
 */

import { Decimal } from 'decimal.js'
import { PriceData, MarketDataProvider } from './types'

export interface MarketDataRequest {
  symbol: string
  assetClass: 'equity' | 'bond' | 'commodity' | 'crypto' | 'fx'
  exchange?: string
  cusip?: string
  isin?: string
  timestamp: Date
  currency?: string
}

export interface MarketDataResponse {
  success: boolean
  data?: PriceData
  error?: string
  provider: MarketDataProvider
  cached: boolean
  staleness: number // minutes since last update
}

export interface ProviderConfig {
  name: MarketDataProvider
  enabled: boolean
  priority: number // Lower number = higher priority
  maxStalenessMinutes: number
  rateLimitPerMinute: number
  apiKey?: string
  baseUrl?: string
  timeout: number
}

export interface MarketDataServiceOptions {
  providers: ProviderConfig[]
  enableCache: boolean
  cacheTimeoutMinutes: number
  enableFallback: boolean
  maxRetries: number
  requestTimeout: number
}

export class MarketDataService {
  private providers: Map<MarketDataProvider, ProviderConfig>
  private priceCache: Map<string, { data: PriceData, timestamp: Date }>
  private rateLimitTrackers: Map<MarketDataProvider, number[]>
  private options: MarketDataServiceOptions

  constructor(options: MarketDataServiceOptions) {
    this.options = options
    this.providers = new Map()
    this.priceCache = new Map()
    this.rateLimitTrackers = new Map()

    // Initialize providers
    this.options.providers.forEach(config => {
      this.providers.set(config.name, config)
      this.rateLimitTrackers.set(config.name, [])
    })
  }

  // ==================== PUBLIC INTERFACE ====================

  /**
   * Fetches price data for a given asset with provider fallback
   */
  async getPrice(request: MarketDataRequest): Promise<MarketDataResponse> {
    const cacheKey = this.getCacheKey(request)
    
    // Check cache first
    if (this.options.enableCache) {
      const cached = this.getCachedPrice(cacheKey)
      if (cached) {
        return {
          success: true,
          data: cached.data,
          provider: cached.data.source as MarketDataProvider,
          cached: true,
          staleness: this.calculateStaleness(cached.timestamp)
        }
      }
    }

    // Try providers in priority order
    const sortedProviders = this.getSortedProviders()
    
    for (const providerName of sortedProviders) {
      const provider = this.providers.get(providerName)
      if (!provider || !provider.enabled) continue

      // Check rate limiting
      if (!this.checkRateLimit(providerName)) {
        console.warn(`Rate limit exceeded for provider ${providerName}`)
        continue
      }

      try {
        const result = await this.fetchFromProvider(providerName, request)
        
        if (result.success && result.data) {
          // Cache successful result
          if (this.options.enableCache) {
            this.cachePrice(cacheKey, result.data)
          }
          
          // Record successful API call
          this.recordRateLimitCall(providerName)
          
          return {
            ...result,
            cached: false,
            staleness: 0
          }
        }
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error)
        continue
      }
    }

    // All providers failed
    return {
      success: false,
      error: 'All market data providers failed',
      provider: MarketDataProvider.INTERNAL_DB,
      cached: false,
      staleness: -1
    }
  }

  /**
   * Fetches multiple prices in batch
   */
  async getBatchPrices(requests: MarketDataRequest[]): Promise<MarketDataResponse[]> {
    const promises = requests.map(request => this.getPrice(request))
    return Promise.all(promises)
  }

  /**
   * Validates price data quality and freshness
   */
  validatePriceData(data: PriceData, maxStalenessMinutes: number = 60): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required fields
    if (data.price === undefined || data.price === null || data.price < 0) {
      errors.push('Price must be a non-negative number')
    }

    if (!data.currency || data.currency.trim() === '') {
      errors.push('Currency is required')
    }

    if (!data.asOf) {
      errors.push('AsOf date is required')
    }

    // Check staleness
    if (data.asOf) {
      const ageMinutes = (Date.now() - data.asOf.getTime()) / (60 * 1000)
      if (ageMinutes > maxStalenessMinutes) {
        warnings.push(`Price data is ${Math.round(ageMinutes)} minutes old (threshold: ${maxStalenessMinutes}m)`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Gets providers sorted by priority
   */
  private getSortedProviders(): MarketDataProvider[] {
    return Array.from(this.providers.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name, _]) => name)
  }

  /**
   * Fetches data from a specific provider
   */
  private async fetchFromProvider(
    provider: MarketDataProvider, 
    request: MarketDataRequest
  ): Promise<MarketDataResponse> {
    
    switch (provider) {
      case MarketDataProvider.CHAINLINK:
        return this.fetchFromChainlink(request)
      
      case MarketDataProvider.ONCHAIN_DEX:
        return this.fetchFromOnchainDex(request)
      
      case MarketDataProvider.COINGECKO:
        return this.fetchFromCoinGecko(request)
      
      case MarketDataProvider.INTERNAL_DB:
        return this.fetchFromInternalDb(request)
      
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  /**
   * Chainlink API integration (mock implementation)
   */
  private async fetchFromChainlink(request: MarketDataRequest): Promise<MarketDataResponse> {
    // Mock implementation - replace with actual Chainlink API
    const mockPrice: PriceData = {
      price: 100.0 + Math.random() * 10, // Mock price with variation
      currency: request.currency || 'USD',
      source: 'chainlink',
      asOf: request.timestamp
    }

    return {
      success: true,
      data: mockPrice,
      provider: MarketDataProvider.CHAINLINK,
      cached: false,
      staleness: 0
    }
  }

  /**
   * OnChain DEX integration (mock implementation)
   */
  private async fetchFromOnchainDex(request: MarketDataRequest): Promise<MarketDataResponse> {
    // Mock implementation - replace with actual DEX API
    const mockPrice: PriceData = {
      price: 99.0 + Math.random() * 12, // Mock price with variation
      currency: request.currency || 'USD',
      source: 'onchain_dex',
      asOf: request.timestamp
    }

    return {
      success: true,
      data: mockPrice,
      provider: MarketDataProvider.ONCHAIN_DEX,
      cached: false,
      staleness: 1
    }
  }

  /**
   * CoinGecko API integration (mock implementation)
   */
  private async fetchFromCoinGecko(request: MarketDataRequest): Promise<MarketDataResponse> {
    // Mock implementation - replace with actual CoinGecko API
    if (request.assetClass !== 'crypto') {
      return {
        success: false,
        error: 'CoinGecko only supports crypto assets',
        provider: MarketDataProvider.COINGECKO,
        cached: false,
        staleness: -1
      }
    }

    const mockPrice: PriceData = {
      price: 50000 + Math.random() * 10000, // Mock crypto price
      currency: 'USD',
      source: 'coingecko',
      asOf: request.timestamp
    }

    return {
      success: true,
      data: mockPrice,
      provider: MarketDataProvider.COINGECKO,
      cached: false,
      staleness: 0
    }
  }

  /**
   * Internal database fallback (mock implementation)
   */
  private async fetchFromInternalDb(request: MarketDataRequest): Promise<MarketDataResponse> {
    // Mock implementation - replace with actual database query
    const mockPrice: PriceData = {
      price: 100.0, // Static fallback price
      currency: request.currency || 'USD',
      source: 'internal_db',
      asOf: new Date(Date.now() - 60 * 60 * 1000) // 1 hour old
    }

    return {
      success: true,
      data: mockPrice,
      provider: MarketDataProvider.INTERNAL_DB,
      cached: false,
      staleness: 60
    }
  }

  /**
   * Checks rate limiting for provider
   */
  private checkRateLimit(provider: MarketDataProvider): boolean {
    const config = this.providers.get(provider)
    if (!config) return false

    const calls = this.rateLimitTrackers.get(provider) || []
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    // Remove calls older than 1 minute
    const recentCalls = calls.filter(timestamp => timestamp > oneMinuteAgo)
    this.rateLimitTrackers.set(provider, recentCalls)

    return recentCalls.length < config.rateLimitPerMinute
  }

  /**
   * Records a rate limit call
   */
  private recordRateLimitCall(provider: MarketDataProvider): void {
    const calls = this.rateLimitTrackers.get(provider) || []
    calls.push(Date.now())
    this.rateLimitTrackers.set(provider, calls)
  }

  /**
   * Generates cache key for price data
   */
  private getCacheKey(request: MarketDataRequest): string {
    return `${request.symbol}_${request.assetClass}_${request.exchange || 'default'}_${request.currency || 'USD'}`
  }

  /**
   * Gets cached price data
   */
  private getCachedPrice(cacheKey: string): { data: PriceData, timestamp: Date } | null {
    const cached = this.priceCache.get(cacheKey)
    if (!cached) return null

    const ageMinutes = (Date.now() - cached.timestamp.getTime()) / (60 * 1000)
    if (ageMinutes > this.options.cacheTimeoutMinutes) {
      this.priceCache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * Caches price data
   */
  private cachePrice(cacheKey: string, data: PriceData): void {
    this.priceCache.set(cacheKey, {
      data,
      timestamp: new Date()
    })
  }

  /**
   * Calculates staleness in minutes
   */
  private calculateStaleness(timestamp: Date): number {
    return Math.round((Date.now() - timestamp.getTime()) / (60 * 1000))
  }
}

/**
 * Factory function to create MarketDataService with default configuration
 */
export function createMarketDataService(): MarketDataService {
  const defaultProviders: ProviderConfig[] = [
    {
      name: MarketDataProvider.CHAINLINK,
      enabled: true,
      priority: 1,
      maxStalenessMinutes: 5,
      rateLimitPerMinute: 100,
      timeout: 5000
    },
    {
      name: MarketDataProvider.ONCHAIN_DEX,
      enabled: true,
      priority: 2,
      maxStalenessMinutes: 10,
      rateLimitPerMinute: 60,
      timeout: 8000
    },
    {
      name: MarketDataProvider.COINGECKO,
      enabled: true,
      priority: 3,
      maxStalenessMinutes: 15,
      rateLimitPerMinute: 30,
      timeout: 10000
    },
    {
      name: MarketDataProvider.INTERNAL_DB,
      enabled: true,
      priority: 99, // Fallback
      maxStalenessMinutes: 1440, // 24 hours
      rateLimitPerMinute: 1000,
      timeout: 2000
    }
  ]

  return new MarketDataService({
    providers: defaultProviders,
    enableCache: true,
    cacheTimeoutMinutes: 5,
    enableFallback: true,
    maxRetries: 3,
    requestTimeout: 10000
  })
}
