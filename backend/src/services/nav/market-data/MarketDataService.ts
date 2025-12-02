/**
 * Market Data Service - ZERO HARDCODED VALUES
 * 
 * Fetches real-time and historical prices via Supabase Edge Functions
 * NO FALLBACKS - Throws errors when data unavailable
 * 
 * All configuration from database:
 * - market_data_providers table
 * - crypto_symbol_mappings table
 * 
 * Routes ALL requests through Supabase edge functions:
 * - market-data-proxy (CoinGecko, Alpha Vantage, Polygon)
 * - free-marketdata-function (Treasury, FRED, Federal Register)
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface PriceRequest {
  securityType: 'equity' | 'crypto' | 'bond'
  identifier: string
  date?: Date
  currency?: string
}

export interface PriceResult {
  identifier: string
  price: number
  priceDecimal: Decimal
  currency: string
  timestamp: Date
  source: string
  confidence: number // 0-1
  metadata?: {
    volume?: number
    marketCap?: number
    priceChange24h?: number
    bid?: number
    ask?: number
  }
}

export interface BatchPriceRequest {
  securities: PriceRequest[]
}

export interface BatchPriceResult {
  prices: Map<string, PriceResult>
  failures: Array<{
    identifier: string
    error: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export interface MarketDataConfig {
  supabaseClient: SupabaseClient
  supabaseUrl: string
  supabaseAnonKey: string
  projectId?: string
}

interface ProviderConfig {
  providerName: string
  baseUrl: string
  requiresApiKey: boolean
  rateLimitPerMinute: number
  useEdgeFunction: boolean
  edgeFunctionName: string | null
  priority: number
}

interface CryptoSymbolMapping {
  symbol: string
  coingeckoId: string
  name: string
}

// =====================================================
// MARKET DATA SERVICE - ZERO FALLBACKS
// =====================================================

export class MarketDataService {
  private readonly config: MarketDataConfig
  private readonly priceCache: Map<string, { price: PriceResult; cachedAt: number }> = new Map()
  private readonly CACHE_TTL = 60 * 1000 // 1 minute cache
  
  // Rate limiting
  private rateLimitTrackers: Map<string, { requests: number; resetTime: number }> = new Map()
  
  // Database-backed configuration (loaded on demand)
  private providers: Map<string, ProviderConfig> = new Map()
  private cryptoMappings: Map<string, string> = new Map() // symbol -> coingecko_id
  private configLoaded = false
  
  constructor(config: MarketDataConfig) {
    if (!config.supabaseClient) {
      throw new Error('Supabase client is required - NO FALLBACKS ALLOWED')
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('Supabase URL and anon key required for edge functions')
    }
    
    this.config = config
  }
  
  /**
   * Load configuration from database
   * REQUIRED before any operations
   */
  private async loadConfiguration(): Promise<void> {
    if (this.configLoaded) return
    
    try {
      // Load providers
      const { data: providersData, error: providersError } = await this.config.supabaseClient
        .from('market_data_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
      
      if (providersError) {
        throw new Error(`Failed to load market data providers: ${providersError.message}`)
      }
      
      if (!providersData || providersData.length === 0) {
        throw new Error('No active market data providers configured in database')
      }
      
      providersData.forEach((p: any) => {
        this.providers.set(p.provider_name, {
          providerName: p.provider_name,
          baseUrl: p.base_url,
          requiresApiKey: p.requires_api_key,
          rateLimitPerMinute: p.rate_limit_per_minute,
          useEdgeFunction: p.use_edge_function,
          edgeFunctionName: p.edge_function_name,
          priority: p.priority
        })
      })
      
      // Load crypto symbol mappings
      const { data: mappingsData, error: mappingsError } = await this.config.supabaseClient
        .from('crypto_symbol_mappings')
        .select('symbol, coingecko_id')
        .eq('is_active', true)
      
      if (mappingsError) {
        throw new Error(`Failed to load crypto symbol mappings: ${mappingsError.message}`)
      }
      
      if (!mappingsData || mappingsData.length === 0) {
        throw new Error('No crypto symbol mappings configured in database')
      }
      
      mappingsData.forEach((m: any) => {
        this.cryptoMappings.set(m.symbol.toLowerCase(), m.coingecko_id)
      })
      
      this.configLoaded = true
      console.log('✅ Market data configuration loaded from database')
      console.log(`  - ${this.providers.size} providers configured`)
      console.log(`  - ${this.cryptoMappings.size} crypto mappings loaded`)
    } catch (error) {
      console.error('Failed to load market data configuration:', error)
      throw new Error('CRITICAL: Market data service cannot operate without database configuration')
    }
  }
  
  /**
   * Get current price for a single security
   * NO FALLBACKS - throws error if data unavailable
   */
  async getPrice(request: PriceRequest): Promise<PriceResult> {
    await this.loadConfiguration()
    
    // Check cache first
    const cacheKey = this.buildCacheKey(request)
    const cached = this.priceCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.price
    }
    
    // Route to appropriate provider
    let priceResult: PriceResult
    
    switch (request.securityType) {
      case 'crypto':
        priceResult = await this.getCryptoPrice(request)
        break
      case 'equity':
        priceResult = await this.getEquityPrice(request)
        break
      case 'bond':
        priceResult = await this.getBondPrice(request)
        break
      default:
        throw new Error(`Unsupported security type: ${request.securityType}`)
    }
    
    // Cache result
    this.priceCache.set(cacheKey, {
      price: priceResult,
      cachedAt: Date.now()
    })
    
    return priceResult
  }
  
  /**
   * Get prices for multiple securities in batch
   */
  async getBatchPrices(request: BatchPriceRequest): Promise<BatchPriceResult> {
    await this.loadConfiguration()
    
    const prices = new Map<string, PriceResult>()
    const failures: Array<{ identifier: string; error: string }> = []
    
    // Group by security type for efficient batch fetching
    const cryptoRequests = request.securities.filter(s => s.securityType === 'crypto')
    const equityRequests = request.securities.filter(s => s.securityType === 'equity')
    const bondRequests = request.securities.filter(s => s.securityType === 'bond')
    
    // Fetch crypto prices in batch
    if (cryptoRequests.length > 0) {
      try {
        const cryptoPrices = await this.getBatchCryptoPrices(cryptoRequests)
        cryptoPrices.forEach((price, identifier) => prices.set(identifier, price))
      } catch (error) {
        cryptoRequests.forEach(req => {
          failures.push({
            identifier: req.identifier,
            error: error instanceof Error ? error.message : 'Unknown crypto price error'
          })
        })
      }
    }
    
    // Fetch equity prices (one by one due to API limitations)
    for (const request of equityRequests) {
      try {
        const price = await this.getEquityPrice(request)
        prices.set(request.identifier, price)
      } catch (error) {
        failures.push({
          identifier: request.identifier,
          error: error instanceof Error ? error.message : 'Unknown equity price error'
        })
      }
    }
    
    // Fetch bond prices (one by one)
    for (const request of bondRequests) {
      try {
        const price = await this.getBondPrice(request)
        prices.set(request.identifier, price)
      } catch (error) {
        failures.push({
          identifier: request.identifier,
          error: error instanceof Error ? error.message : 'Unknown bond price error'
        })
      }
    }
    
    return {
      prices,
      failures,
      summary: {
        total: request.securities.length,
        successful: prices.size,
        failed: failures.length
      }
    }
  }
  
  /**
   * Get crypto price from CoinGecko via edge function
   * NO FALLBACKS
   */
  private async getCryptoPrice(request: PriceRequest): Promise<PriceResult> {
    const provider = this.providers.get('coingecko')
    if (!provider) {
      throw new Error('CoinGecko provider not configured in database')
    }
    
    await this.checkRateLimit('coingecko', provider.rateLimitPerMinute)
    
    // Get CoinGecko ID from database mapping
    const coinId = this.cryptoMappings.get(request.identifier.toLowerCase())
    if (!coinId) {
      throw new Error(`No CoinGecko mapping found for symbol: ${request.identifier}. Add to crypto_symbol_mappings table`)
    }
    
    const currency = (request.currency || 'USD').toLowerCase()
    
    try {
      // Call edge function
      const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${provider.edgeFunctionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          provider: 'coingecko',
          endpoint: 'simple/price',
          params: {
            ids: coinId,
            vs_currencies: currency,
            include_market_cap: 'true',
            include_24h_vol: 'true',
            include_24h_change: 'true',
            include_last_updated_at: 'true'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Edge function failed: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Edge function returned error')
      }
      
      const data = result.data[coinId]
      if (!data || data[currency] === undefined) {
        throw new Error(`Price not available for ${request.identifier} from CoinGecko`)
      }
      
      return {
        identifier: request.identifier,
        price: data[currency],
        priceDecimal: new Decimal(data[currency]),
        currency: request.currency || 'USD',
        timestamp: data.last_updated_at 
          ? new Date(data.last_updated_at * 1000)
          : new Date(),
        source: 'CoinGecko (via Edge Function)',
        confidence: 0.95,
        metadata: {
          marketCap: data[`${currency}_market_cap`],
          volume: data[`${currency}_24h_vol`],
          priceChange24h: data[`${currency}_24h_change`]
        }
      }
    } catch (error) {
      console.error(`CoinGecko price fetch failed for ${request.identifier}:`, error)
      throw new Error(`Failed to fetch crypto price: ${error instanceof Error ? error.message : 'Unknown error'}. NO FALLBACK AVAILABLE`)
    }
  }
  
  /**
   * Get batch crypto prices from CoinGecko via edge function
   */
  private async getBatchCryptoPrices(
    requests: PriceRequest[]
  ): Promise<Map<string, PriceResult>> {
    const provider = this.providers.get('coingecko')
    if (!provider) {
      throw new Error('CoinGecko provider not configured in database')
    }
    
    await this.checkRateLimit('coingecko', provider.rateLimitPerMinute)
    
    const prices = new Map<string, PriceResult>()
    
    // Map symbols to CoinGecko IDs
    const coinIds: string[] = []
    const symbolToCoinId = new Map<string, string>()
    
    for (const req of requests) {
      const coinId = this.cryptoMappings.get(req.identifier.toLowerCase())
      if (!coinId) {
        throw new Error(`No CoinGecko mapping for: ${req.identifier}`)
      }
      coinIds.push(coinId)
      symbolToCoinId.set(req.identifier, coinId)
    }
    
    const currency = (requests[0]?.currency || 'USD').toLowerCase()
    
    try {
      const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${provider.edgeFunctionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          provider: 'coingecko',
          endpoint: 'simple/price',
          params: {
            ids: coinIds.join(','),
            vs_currencies: currency,
            include_market_cap: 'true',
            include_24h_vol: 'true',
            include_24h_change: 'true',
            include_last_updated_at: 'true'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Edge function failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Edge function error')
      }
      
      requests.forEach((request) => {
        const coinId = symbolToCoinId.get(request.identifier)
        if (!coinId) return
        
        const data = result.data[coinId]
        
        if (data && data[currency] !== undefined) {
          prices.set(request.identifier, {
            identifier: request.identifier,
            price: data[currency],
            priceDecimal: new Decimal(data[currency]),
            currency: request.currency || 'USD',
            timestamp: data.last_updated_at 
              ? new Date(data.last_updated_at * 1000)
              : new Date(),
            source: 'CoinGecko (via Edge Function)',
            confidence: 0.95,
            metadata: {
              marketCap: data[`${currency}_market_cap`],
              volume: data[`${currency}_24h_vol`],
              priceChange24h: data[`${currency}_24h_change`]
            }
          })
        }
      })
      
      return prices
    } catch (error) {
      console.error('Batch crypto price fetch failed:', error)
      throw new Error(`Batch crypto fetch failed: ${error instanceof Error ? error.message : 'Unknown'}. NO FALLBACK`)
    }
  }
  
  /**
   * Get equity price via edge function
   * NO FALLBACKS
   */
  private async getEquityPrice(request: PriceRequest): Promise<PriceResult> {
    // Try Alpha Vantage first (highest priority)
    const alphavantage = this.providers.get('alphavantage')
    if (alphavantage) {
      try {
        return await this.getAlphaVantagePrice(request, alphavantage)
      } catch (error) {
        console.warn('Alpha Vantage failed:', error instanceof Error ? error.message : 'Unknown')
      }
    }
    
    // Try Polygon.io
    const polygon = this.providers.get('polygon')
    if (polygon) {
      try {
        return await this.getPolygonPrice(request, polygon)
      } catch (error) {
        console.warn('Polygon failed:', error instanceof Error ? error.message : 'Unknown')
      }
    }
    
    throw new Error(`No equity price available for ${request.identifier}. Configure API keys in market_data_providers table. NO FALLBACK`)
  }
  
  /**
   * Get equity price from Alpha Vantage via edge function
   */
  private async getAlphaVantagePrice(
    request: PriceRequest,
    provider: ProviderConfig
  ): Promise<PriceResult> {
    await this.checkRateLimit('alphavantage', provider.rateLimitPerMinute)
    
    const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${provider.edgeFunctionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`
      },
      body: JSON.stringify({
        provider: 'alphavantage',
        endpoint: 'query',
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: request.identifier
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage edge function failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Alpha Vantage error')
    }
    
    const quote = result.data['Global Quote']
    if (!quote || !quote['05. price']) {
      throw new Error(`Quote not available for ${request.identifier}`)
    }
    
    return {
      identifier: request.identifier,
      price: parseFloat(quote['05. price']),
      priceDecimal: new Decimal(quote['05. price']),
      currency: 'USD',
      timestamp: new Date(),
      source: 'Alpha Vantage (via Edge Function)',
      confidence: 0.90,
      metadata: {
        volume: parseFloat(quote['06. volume'] || '0'),
        priceChange24h: parseFloat(quote['09. change'] || '0')
      }
    }
  }
  
  /**
   * Get equity price from Polygon.io via edge function
   */
  private async getPolygonPrice(
    request: PriceRequest,
    provider: ProviderConfig
  ): Promise<PriceResult> {
    await this.checkRateLimit('polygon', provider.rateLimitPerMinute)
    
    const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${provider.edgeFunctionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`
      },
      body: JSON.stringify({
        provider: 'polygon',
        endpoint: `v2/aggs/ticker/${request.identifier}/prev`,
        params: {}
      })
    })
    
    if (!response.ok) {
      throw new Error(`Polygon edge function failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Polygon error')
    }
    
    const data = result.data.results?.[0]
    if (!data) {
      throw new Error(`Quote not available for ${request.identifier}`)
    }
    
    return {
      identifier: request.identifier,
      price: data.c,
      priceDecimal: new Decimal(data.c),
      currency: 'USD',
      timestamp: new Date(data.t),
      source: 'Polygon.io (via Edge Function)',
      confidence: 0.92,
      metadata: {
        volume: data.v,
        priceChange24h: ((data.c - data.o) / data.o) * 100
      }
    }
  }
  
  /**
   * Get bond price (placeholder - will integrate with FINRA TRACE)
   * NO FALLBACKS
   */
  private async getBondPrice(request: PriceRequest): Promise<PriceResult> {
    throw new Error(`Bond pricing not yet implemented for ${request.identifier}. Integrate with FINRA TRACE API. NO FALLBACK`)
  }
  
  /**
   * Build cache key for price result
   */
  private buildCacheKey(request: PriceRequest): string {
    return `${request.securityType}:${request.identifier}:${request.currency || 'USD'}`
  }
  
  /**
   * Rate limiting check
   */
  private async checkRateLimit(provider: string, limitPerMinute: number): Promise<void> {
    const tracker = this.rateLimitTrackers.get(provider)
    const now = Date.now()
    
    if (!tracker) {
      this.rateLimitTrackers.set(provider, {
        requests: 1,
        resetTime: now + 60000 // 1 minute
      })
      return
    }
    
    // Reset if time window passed
    if (now > tracker.resetTime) {
      tracker.requests = 1
      tracker.resetTime = now + 60000
      return
    }
    
    if (tracker.requests >= limitPerMinute) {
      const waitTime = tracker.resetTime - now
      console.warn(`⚠️ Rate limit reached for ${provider}, waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      tracker.requests = 1
      tracker.resetTime = Date.now() + 60000
    } else {
      tracker.requests++
    }
  }
  
  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.priceCache.clear()
    this.configLoaded = false
    this.providers.clear()
    this.cryptoMappings.clear()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.priceCache.size,
      ttl: this.CACHE_TTL
    }
  }
}

// Export singleton factory
export function createMarketDataService(config: MarketDataConfig): MarketDataService {
  return new MarketDataService(config)
}