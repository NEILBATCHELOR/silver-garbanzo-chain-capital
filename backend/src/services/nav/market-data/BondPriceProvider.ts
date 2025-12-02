/**
 * Bond Price Provider
 * 
 * Specialized provider for fetching bond prices from multiple sources:
 * - FINRA TRACE (primary for corporate bonds)
 * - FICC (for Treasury bonds)
 * - Bloomberg (if available)
 * - Estimated pricing based on yield curves
 * 
 * CORS-compatible via Supabase Edge Functions
 * Following ZERO HARDCODED VALUES principle
 */

import { Decimal } from 'decimal.js'
import axios, { AxiosInstance } from 'axios'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BondPriceRequest {
  cusip: string
  isin?: string
  bondType?: 'treasury' | 'corporate' | 'municipal' | 'agency'
  date?: Date
  currency?: string
}

export interface BondPriceResult {
  cusip: string
  isin?: string
  price: number // Clean price (excludes accrued interest)
  priceDecimal: Decimal
  dirtyPrice: number // Includes accrued interest
  currency: string
  timestamp: Date
  source: string
  confidence: number
  metadata: {
    yield?: number
    ytm?: number
    accruedInterest?: number
    couponRate?: number
    maturityDate?: Date
    rating?: string
    duration?: number
    convexity?: number
    bidPrice?: number
    askPrice?: number
    spread?: number // Spread over benchmark
    volume?: number
    lastTrade?: Date
  }
}

export interface BondPriceProviderConfig {
  finraApiKey?: string
  ficcApiKey?: string
  bloombergApiKey?: string
  supabaseUrl?: string
  supabaseKey?: string
  cacheTTL?: number
  rateLimitPerMinute?: Record<string, number>
  defaultYieldCurve?: Record<string, number> // Maturity -> Yield
}

// =====================================================
// BOND PRICE PROVIDER
// =====================================================

export class BondPriceProvider {
  private readonly config: BondPriceProviderConfig
  private readonly httpClients: Map<string, AxiosInstance> = new Map()
  private readonly priceCache: Map<string, { price: BondPriceResult; cachedAt: number }> = new Map()
  private readonly rateLimitTrackers: Map<string, { requests: number; resetTime: number }> = new Map()
  
  // Treasury yield curve (daily update)
  private treasuryYieldCurve: Map<number, number> = new Map()
  
  constructor(config: BondPriceProviderConfig = {}) {
    this.config = {
      cacheTTL: config.cacheTTL || 300000, // 5 minutes (bonds less volatile)
      rateLimitPerMinute: config.rateLimitPerMinute || {
        finra: 10,
        ficc: 10,
        bloomberg: 5
      },
      ...config
    }
    
    this.setupHttpClients()
    this.initializeTreasuryYieldCurve()
  }
  
  /**
   * Setup HTTP clients for bond price sources
   */
  private setupHttpClients(): void {
    // FINRA TRACE (corporate bonds)
    if (this.config.finraApiKey) {
      this.httpClients.set('finra', axios.create({
        baseURL: 'https://api.finra.org/data/group/OTC-bonds/name/trace',
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${this.config.finraApiKey}`
        }
      }))
    }
    
    // FICC (Treasury bonds)
    if (this.config.ficcApiKey) {
      this.httpClients.set('ficc', axios.create({
        baseURL: 'https://api.dtcc.com/ficc',
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${this.config.ficcApiKey}`
        }
      }))
    }
    
    // Bloomberg Terminal (if available)
    if (this.config.bloombergApiKey) {
      this.httpClients.set('bloomberg', axios.create({
        baseURL: 'https://api.bloomberg.com',
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${this.config.bloombergApiKey}`
        }
      }))
    }
  }
  
  /**
   * Initialize Treasury yield curve - NO DEFAULTS
   * Must be provided via config or updated from Fed data
   */
  private initializeTreasuryYieldCurve(): void {
    // Only use config-provided yield curve - NO HARDCODED DEFAULTS
    if (this.config.defaultYieldCurve) {
      Object.entries(this.config.defaultYieldCurve).forEach(([maturity, yield_]) => {
        this.treasuryYieldCurve.set(parseFloat(maturity), yield_)
      })
      console.log('✅ Treasury yield curve initialized from config')
    } else {
      console.warn('⚠️ No Treasury yield curve provided. Call updateTreasuryYieldCurve() with Fed data.')
    }
  }
  
  /**
   * Get bond price with automatic fallback
   */
  async getPrice(request: BondPriceRequest): Promise<BondPriceResult> {
    // Check cache first
    const cacheKey = this.buildCacheKey(request)
    const cached = this.priceCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.config.cacheTTL!) {
      console.log(`📦 Cache hit for ${request.cusip}`)
      return cached.price
    }
    
    // Route to appropriate source based on bond type
    if (request.bondType === 'treasury' && this.httpClients.has('ficc')) {
      try {
        const price = await this.getFICCPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`FICC failed for ${request.cusip}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // Try FINRA TRACE for corporate bonds
    if (request.bondType === 'corporate' && this.httpClients.has('finra')) {
      try {
        const price = await this.getFINRAPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`FINRA failed for ${request.cusip}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // Try Bloomberg if available
    if (this.httpClients.has('bloomberg')) {
      try {
        const price = await this.getBloombergPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`Bloomberg failed for ${request.cusip}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // NO FALLBACKS - Fail explicitly if all sources fail
    throw new Error(
      `All bond price sources failed for ${request.cusip}. ` +
      `Available sources: ${Array.from(this.httpClients.keys()).join(', ')}. ` +
      `Please check API keys and connectivity.`
    )
  }
  
  /**
   * Get batch bond prices
   */
  async getBatchPrices(requests: BondPriceRequest[]): Promise<Map<string, BondPriceResult>> {
    const results = new Map<string, BondPriceResult>()
    
    // Process in parallel with rate limiting
    const chunkSize = 5
    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize)
      
      const chunkResults = await Promise.allSettled(
        chunk.map(req => this.getPrice(req))
      )
      
      chunkResults.forEach((result, index) => {
        const request = chunk[index]
        if (!request) return
        
        if (result.status === 'fulfilled') {
          results.set(request.cusip, result.value)
        } else {
          console.error(`Failed to fetch price for ${request.cusip}:`, result.reason)
        }
      })
    }
    
    return results
  }
  
  /**
   * Fetch price from FINRA TRACE (corporate bonds)
   */
  private async getFINRAPrice(request: BondPriceRequest): Promise<BondPriceResult> {
    await this.checkRateLimit('finra')
    
    const client = this.httpClients.get('finra')
    if (!client) throw new Error('FINRA client not initialized')
    
    try {
      const response = await client.get('/trades', {
        params: {
          cusip: request.cusip,
          limit: 1,
          orderBy: 'tradeDate',
          orderDirection: 'desc'
        }
      })
      
      const trade = response.data.data?.[0]
      if (!trade) {
        throw new Error(`No TRACE data for ${request.cusip}`)
      }
      
      return {
        cusip: request.cusip,
        isin: request.isin,
        price: trade.price,
        priceDecimal: new Decimal(trade.price),
        dirtyPrice: trade.price + (trade.accruedInterest || 0),
        currency: request.currency || 'USD',
        timestamp: new Date(trade.tradeDate),
        source: 'FINRA TRACE',
        confidence: 0.90,
        metadata: {
          yield: trade.yield,
          ytm: trade.yieldToMaturity,
          accruedInterest: trade.accruedInterest,
          couponRate: trade.couponRate,
          maturityDate: trade.maturityDate ? new Date(trade.maturityDate) : undefined,
          rating: trade.rating,
          volume: trade.volume,
          lastTrade: new Date(trade.tradeDate)
        }
      }
    } catch (error) {
      throw new Error(`FINRA API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from FICC (Treasury bonds)
   */
  private async getFICCPrice(request: BondPriceRequest): Promise<BondPriceResult> {
    await this.checkRateLimit('ficc')
    
    const client = this.httpClients.get('ficc')
    if (!client) throw new Error('FICC client not initialized')
    
    try {
      const response = await client.get('/securities', {
        params: {
          cusip: request.cusip
        }
      })
      
      const security = response.data
      if (!security) {
        throw new Error(`No FICC data for ${request.cusip}`)
      }
      
      return {
        cusip: request.cusip,
        isin: request.isin,
        price: security.price,
        priceDecimal: new Decimal(security.price),
        dirtyPrice: security.price + (security.accruedInterest || 0),
        currency: request.currency || 'USD',
        timestamp: new Date(security.priceDate),
        source: 'FICC',
        confidence: 0.95,
        metadata: {
          yield: security.yield,
          ytm: security.yieldToMaturity,
          accruedInterest: security.accruedInterest,
          couponRate: security.couponRate,
          maturityDate: security.maturityDate ? new Date(security.maturityDate) : undefined,
          duration: security.duration,
          convexity: security.convexity,
          bidPrice: security.bidPrice,
          askPrice: security.askPrice
        }
      }
    } catch (error) {
      throw new Error(`FICC API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from Bloomberg
   */
  private async getBloombergPrice(request: BondPriceRequest): Promise<BondPriceResult> {
    await this.checkRateLimit('bloomberg')
    
    const client = this.httpClients.get('bloomberg')
    if (!client) throw new Error('Bloomberg client not initialized')
    
    try {
      const response = await client.get('/instruments', {
        params: {
          id: request.cusip,
          idType: 'CUSIP'
        }
      })
      
      const instrument = response.data
      if (!instrument) {
        throw new Error(`No Bloomberg data for ${request.cusip}`)
      }
      
      return {
        cusip: request.cusip,
        isin: request.isin || instrument.isin,
        price: instrument.lastPrice,
        priceDecimal: new Decimal(instrument.lastPrice),
        dirtyPrice: instrument.lastPrice + (instrument.accruedInterest || 0),
        currency: request.currency || 'USD',
        timestamp: new Date(instrument.lastUpdate),
        source: 'Bloomberg',
        confidence: 0.95,
        metadata: {
          yield: instrument.yield,
          ytm: instrument.yieldToMaturity,
          accruedInterest: instrument.accruedInterest,
          couponRate: instrument.couponRate,
          maturityDate: instrument.maturityDate ? new Date(instrument.maturityDate) : undefined,
          rating: instrument.rating,
          duration: instrument.duration,
          convexity: instrument.convexity,
          bidPrice: instrument.bidPrice,
          askPrice: instrument.askPrice,
          spread: instrument.spread
        }
      }
    } catch (error) {
      throw new Error(`Bloomberg API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Build cache key
   */
  private buildCacheKey(request: BondPriceRequest): string {
    return `bond:${request.cusip}:${request.currency || 'USD'}`
  }
  
  /**
   * Cache price result
   */
  private cachePrice(key: string, price: BondPriceResult): void {
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
      ttl: this.config.cacheTTL || 300000
    }
  }
  
  /**
   * Update Treasury yield curve
   * Should be called daily with Fed data
   */
  updateTreasuryYieldCurve(yieldCurve: Record<number, number>): void {
    this.treasuryYieldCurve.clear()
    Object.entries(yieldCurve).forEach(([maturity, yield_]) => {
      this.treasuryYieldCurve.set(parseFloat(maturity), yield_)
    })
    console.log('✅ Treasury yield curve updated')
  }
}

// Export singleton factory
export function createBondPriceProvider(config?: BondPriceProviderConfig): BondPriceProvider {
  return new BondPriceProvider(config)
}
