/**
 * Equity Price Provider
 * 
 * Specialized provider for fetching equity prices from multiple sources:
 * - Alpha Vantage (primary)
 * - Polygon.io (fallback)
 * - Yahoo Finance (additional fallback)
 * 
 * CORS-compatible via Supabase Edge Functions
 * Following ZERO HARDCODED VALUES principle
 */

import { Decimal } from 'decimal.js'
import axios, { AxiosInstance } from 'axios'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface EquityPriceRequest {
  ticker: string
  date?: Date
  currency?: string
  exchange?: string
}

export interface EquityPriceResult {
  ticker: string
  price: number
  priceDecimal: Decimal
  currency: string
  timestamp: Date
  source: string
  confidence: number
  metadata: {
    open?: number
    high?: number
    low?: number
    close?: number
    volume?: number
    adjustedClose?: number
    previousClose?: number
    changePercent?: number
    marketCap?: number
    pe?: number
    eps?: number
  }
}

export interface EquityPriceProviderConfig {
  alphaVantageApiKey?: string
  polygonApiKey?: string
  yahooFinanceEnabled?: boolean
  supabaseUrl?: string
  supabaseKey?: string
  cacheTTL?: number // milliseconds
  rateLimitPerMinute?: Record<string, number>
}

// =====================================================
// EQUITY PRICE PROVIDER
// =====================================================

export class EquityPriceProvider {
  private readonly config: EquityPriceProviderConfig
  private readonly httpClients: Map<string, AxiosInstance> = new Map()
  private readonly priceCache: Map<string, { price: EquityPriceResult; cachedAt: number }> = new Map()
  private readonly rateLimitTrackers: Map<string, { requests: number; resetTime: number }> = new Map()
  
  constructor(config: EquityPriceProviderConfig = {}) {
    this.config = {
      cacheTTL: config.cacheTTL || 60000, // 1 minute default
      rateLimitPerMinute: config.rateLimitPerMinute || {
        alphavantage: 5,
        polygon: 5,
        yahoo: 60
      },
      ...config
    }
    
    this.setupHttpClients()
  }
  
  /**
   * Setup HTTP clients for each equity price source
   */
  private setupHttpClients(): void {
    // Alpha Vantage
    if (this.config.alphaVantageApiKey) {
      this.httpClients.set('alphavantage', axios.create({
        baseURL: 'https://www.alphavantage.co/query',
        timeout: 15000,
        params: {
          apikey: this.config.alphaVantageApiKey
        }
      }))
    }
    
    // Polygon.io
    if (this.config.polygonApiKey) {
      this.httpClients.set('polygon', axios.create({
        baseURL: 'https://api.polygon.io',
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${this.config.polygonApiKey}`
        }
      }))
    }
    
    // Yahoo Finance (no API key needed for basic quotes)
    if (this.config.yahooFinanceEnabled) {
      this.httpClients.set('yahoo', axios.create({
        baseURL: 'https://query1.finance.yahoo.com',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }))
    }
  }
  
  /**
   * Get equity price with automatic fallback to multiple sources
   */
  async getPrice(request: EquityPriceRequest): Promise<EquityPriceResult> {
    // Check cache first
    const cacheKey = this.buildCacheKey(request)
    const cached = this.priceCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.config.cacheTTL!) {
      console.log(`📦 Cache hit for ${request.ticker}`)
      return cached.price
    }
    
    // Try primary source first (Alpha Vantage)
    if (this.httpClients.has('alphavantage')) {
      try {
        const price = await this.getAlphaVantagePrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`Alpha Vantage failed for ${request.ticker}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // Fallback to Polygon.io
    if (this.httpClients.has('polygon')) {
      try {
        const price = await this.getPolygonPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`Polygon failed for ${request.ticker}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // Fallback to Yahoo Finance
    if (this.httpClients.has('yahoo')) {
      try {
        const price = await this.getYahooPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`Yahoo Finance failed for ${request.ticker}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // NO FALLBACKS - Fail explicitly if all sources fail
    throw new Error(
      `All equity price sources failed for ${request.ticker}. ` +
      `Available sources: ${Array.from(this.httpClients.keys()).join(', ')}. ` +
      `Please check API keys and connectivity.`
    )
  }
  
  /**
   * Get batch equity prices
   */
  async getBatchPrices(requests: EquityPriceRequest[]): Promise<Map<string, EquityPriceResult>> {
    const results = new Map<string, EquityPriceResult>()
    
    // Process requests in parallel with rate limiting
    const chunkSize = 5 // Process 5 at a time
    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize)
      
      const chunkResults = await Promise.allSettled(
        chunk.map(req => this.getPrice(req))
      )
      
      chunkResults.forEach((result, index) => {
        const request = chunk[index]
        if (!request) return
        
        if (result.status === 'fulfilled') {
          results.set(request.ticker, result.value)
        } else {
          console.error(`Failed to fetch price for ${request.ticker}:`, result.reason)
        }
      })
    }
    
    return results
  }
  
  /**
   * Fetch price from Alpha Vantage
   */
  private async getAlphaVantagePrice(request: EquityPriceRequest): Promise<EquityPriceResult> {
    await this.checkRateLimit('alphavantage')
    
    const client = this.httpClients.get('alphavantage')
    if (!client) throw new Error('Alpha Vantage client not initialized')
    
    try {
      const response = await client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: request.ticker
        }
      })
      
      const quote = response.data['Global Quote']
      if (!quote || !quote['05. price']) {
        throw new Error(`No quote available for ${request.ticker}`)
      }
      
      return {
        ticker: request.ticker,
        price: parseFloat(quote['05. price']),
        priceDecimal: new Decimal(quote['05. price']),
        currency: request.currency || 'USD',
        timestamp: new Date(),
        source: 'Alpha Vantage',
        confidence: 0.92,
        metadata: {
          open: parseFloat(quote['02. open'] || '0'),
          high: parseFloat(quote['03. high'] || '0'),
          low: parseFloat(quote['04. low'] || '0'),
          close: parseFloat(quote['05. price']),
          volume: parseInt(quote['06. volume'] || '0'),
          previousClose: parseFloat(quote['08. previous close'] || '0'),
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0')
        }
      }
    } catch (error) {
      throw new Error(`Alpha Vantage API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from Polygon.io
   */
  private async getPolygonPrice(request: EquityPriceRequest): Promise<EquityPriceResult> {
    await this.checkRateLimit('polygon')
    
    const client = this.httpClients.get('polygon')
    if (!client) throw new Error('Polygon client not initialized')
    
    try {
      // Get previous day's close (most reliable for daily NAV)
      const response = await client.get(`/v2/aggs/ticker/${request.ticker}/prev`)
      
      const result = response.data.results?.[0]
      if (!result) {
        throw new Error(`No data available for ${request.ticker}`)
      }
      
      return {
        ticker: request.ticker,
        price: result.c,
        priceDecimal: new Decimal(result.c),
        currency: request.currency || 'USD',
        timestamp: new Date(result.t),
        source: 'Polygon.io',
        confidence: 0.93,
        metadata: {
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v,
          changePercent: ((result.c - result.o) / result.o) * 100
        }
      }
    } catch (error) {
      throw new Error(`Polygon API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from Yahoo Finance
   */
  private async getYahooPrice(request: EquityPriceRequest): Promise<EquityPriceResult> {
    await this.checkRateLimit('yahoo')
    
    const client = this.httpClients.get('yahoo')
    if (!client) throw new Error('Yahoo Finance client not initialized')
    
    try {
      const response = await client.get(`/v8/finance/quote`, {
        params: {
          symbols: request.ticker
        }
      })
      
      const quote = response.data.quoteResponse?.result?.[0]
      if (!quote) {
        throw new Error(`No quote available for ${request.ticker}`)
      }
      
      return {
        ticker: request.ticker,
        price: quote.regularMarketPrice,
        priceDecimal: new Decimal(quote.regularMarketPrice),
        currency: request.currency || 'USD',
        timestamp: new Date(quote.regularMarketTime * 1000),
        source: 'Yahoo Finance',
        confidence: 0.90,
        metadata: {
          open: quote.regularMarketOpen,
          high: quote.regularMarketDayHigh,
          low: quote.regularMarketDayLow,
          close: quote.regularMarketPrice,
          volume: quote.regularMarketVolume,
          previousClose: quote.regularMarketPreviousClose,
          changePercent: quote.regularMarketChangePercent,
          marketCap: quote.marketCap,
          pe: quote.trailingPE,
          eps: quote.epsTrailingTwelveMonths
        }
      }
    } catch (error) {
      throw new Error(`Yahoo Finance API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Build cache key
   */
  private buildCacheKey(request: EquityPriceRequest): string {
    return `equity:${request.ticker}:${request.currency || 'USD'}`
  }
  
  /**
   * Cache price result
   */
  private cachePrice(key: string, price: EquityPriceResult): void {
    this.priceCache.set(key, {
      price,
      cachedAt: Date.now()
    })
  }
  
  /**
   * Rate limiting check
   */
  private async checkRateLimit(source: string): Promise<void> {
    const tracker = this.rateLimitTrackers.get(source)
    const now = Date.now()
    
    if (!tracker) {
      this.rateLimitTrackers.set(source, {
        requests: 1,
        resetTime: now + 60000
      })
      return
    }
    
    // Reset if time window passed
    if (now > tracker.resetTime) {
      tracker.requests = 1
      tracker.resetTime = now + 60000
      return
    }
    
    const limit = this.config.rateLimitPerMinute?.[source] || 10
    
    if (tracker.requests >= limit) {
      const waitTime = tracker.resetTime - now
      console.warn(`⏱️ Rate limit reached for ${source}, waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      tracker.requests = 1
      tracker.resetTime = Date.now() + 60000
    } else {
      tracker.requests++
    }
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.priceCache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.priceCache.size,
      ttl: this.config.cacheTTL || 60000
    }
  }
}

// Export singleton factory
export function createEquityPriceProvider(config?: EquityPriceProviderConfig): EquityPriceProvider {
  return new EquityPriceProvider(config)
}
