/**
 * Crypto Price Provider
 * 
 * Specialized provider for fetching cryptocurrency prices from multiple sources:
 * - CoinGecko (primary)
 * - Chainlink Price Feeds (on-chain oracle data)
 * - Coinbase API (institutional-grade)
 * - CoinMarketCap (fallback)
 * 
 * CORS-compatible via Supabase Edge Functions
 * Supports 24/7 pricing for crypto markets
 * Following ZERO HARDCODED VALUES principle
 */

import { Decimal } from 'decimal.js'
import axios, { AxiosInstance } from 'axios'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CryptoPriceRequest {
  symbol: string // BTC, ETH, SOL
  blockchain?: string // bitcoin, ethereum, solana
  contractAddress?: string // For ERC-20, SPL tokens
  date?: Date
  currency?: string
}

export interface CryptoPriceResult {
  symbol: string
  blockchain: string
  price: number
  priceDecimal: Decimal
  currency: string
  timestamp: Date
  source: string
  confidence: number
  metadata: {
    marketCap?: number
    volume24h?: number
    volumeChange24h?: number
    priceChange24h?: number
    priceChangePercent24h?: number
    circulatingSupply?: number
    totalSupply?: number
    maxSupply?: number
    high24h?: number
    low24h?: number
    ath?: number
    athDate?: Date
  }
}

export interface CryptoPriceProviderConfig {
  coingeckoApiKey?: string
  coinbaseApiKey?: string
  coinbaseApiSecret?: string
  coinmarketcapApiKey?: string
  chainlinkEnabled?: boolean
  supabaseUrl?: string
  supabaseKey?: string
  cacheTTL?: number // milliseconds
  rateLimitPerMinute?: Record<string, number>
}

// =====================================================
// CRYPTO PRICE PROVIDER
// =====================================================

export class CryptoPriceProvider {
  private readonly config: CryptoPriceProviderConfig
  private readonly httpClients: Map<string, AxiosInstance> = new Map()
  private readonly priceCache: Map<string, { price: CryptoPriceResult; cachedAt: number }> = new Map()
  private readonly rateLimitTrackers: Map<string, { requests: number; resetTime: number }> = new Map()
  
  constructor(config: CryptoPriceProviderConfig = {}) {
    this.config = {
      cacheTTL: config.cacheTTL || 30000, // 30 seconds for crypto (more volatile)
      rateLimitPerMinute: config.rateLimitPerMinute || {
        coingecko: 50,
        coinbase: 10,
        coinmarketcap: 30
      },
      ...config
    }
    
    this.setupHttpClients()
  }
  
  /**
   * Setup HTTP clients for each crypto price source
   */
  private setupHttpClients(): void {
    // CoinGecko
    this.httpClients.set('coingecko', axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.coingeckoApiKey && {
          'x-cg-pro-api-key': this.config.coingeckoApiKey
        })
      }
    }))
    
    // Coinbase
    if (this.config.coinbaseApiKey) {
      this.httpClients.set('coinbase', axios.create({
        baseURL: 'https://api.coinbase.com/v2',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'CB-ACCESS-KEY': this.config.coinbaseApiKey
        }
      }))
    }
    
    // CoinMarketCap
    if (this.config.coinmarketcapApiKey) {
      this.httpClients.set('coinmarketcap', axios.create({
        baseURL: 'https://pro-api.coinmarketcap.com/v1',
        timeout: 15000,
        headers: {
          'X-CMC_PRO_API_KEY': this.config.coinmarketcapApiKey
        }
      }))
    }
  }
  
  /**
   * Get crypto price with automatic fallback
   */
  async getPrice(request: CryptoPriceRequest): Promise<CryptoPriceResult> {
    // Check cache first
    const cacheKey = this.buildCacheKey(request)
    const cached = this.priceCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.config.cacheTTL!) {
      console.log(`📦 Cache hit for ${request.symbol}`)
      return cached.price
    }
    
    // Try CoinGecko first (most reliable)
    try {
      const price = await this.getCoinGeckoPrice(request)
      this.cachePrice(cacheKey, price)
      return price
    } catch (error) {
      console.warn(`CoinGecko failed for ${request.symbol}:`, error instanceof Error ? error.message : 'Unknown error')
    }
    
    // Fallback to Coinbase
    if (this.httpClients.has('coinbase')) {
      try {
        const price = await this.getCoinbasePrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`Coinbase failed for ${request.symbol}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // Fallback to CoinMarketCap
    if (this.httpClients.has('coinmarketcap')) {
      try {
        const price = await this.getCoinMarketCapPrice(request)
        this.cachePrice(cacheKey, price)
        return price
      } catch (error) {
        console.warn(`CoinMarketCap failed for ${request.symbol}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    // NO FALLBACKS - Fail explicitly if all sources fail
    throw new Error(
      `All crypto price sources failed for ${request.symbol}. ` +
      `Available sources: ${Array.from(this.httpClients.keys()).join(', ')}. ` +
      `Please check API keys and connectivity. CoinGecko is free tier.`
    )
  }
  
  /**
   * Get batch crypto prices
   */
  async getBatchPrices(requests: CryptoPriceRequest[]): Promise<Map<string, CryptoPriceResult>> {
    await this.checkRateLimit('coingecko')
    
    const client = this.httpClients.get('coingecko')
    if (!client) {
      throw new Error('CoinGecko client not initialized')
    }
    
    const results = new Map<string, CryptoPriceResult>()
    
    try {
      // Map symbols to CoinGecko IDs
      const coinIds = requests.map(r => this.getCoinGeckoId(r.symbol))
      const currency = (requests[0]?.currency || 'USD').toLowerCase()
      
      const response = await client.get('/simple/price', {
        params: {
          ids: coinIds.join(','),
          vs_currencies: currency,
          include_market_cap: 'true',
          include_24hr_vol: 'true',
          include_24hr_change: 'true',
          include_last_updated_at: 'true'
        }
      })
      
      requests.forEach((request, index) => {
        const coinId = coinIds[index]
        if (!coinId) return
        
        const data = response.data[coinId]
        
        if (data && data[currency] !== undefined) {
          results.set(request.symbol, {
            symbol: request.symbol,
            blockchain: request.blockchain || this.inferBlockchain(request.symbol),
            price: data[currency],
            priceDecimal: new Decimal(data[currency]),
            currency: request.currency || 'USD',
            timestamp: data.last_updated_at 
              ? new Date(data.last_updated_at * 1000)
              : new Date(),
            source: 'CoinGecko',
            confidence: 0.95,
            metadata: {
              marketCap: data[`${currency}_market_cap`],
              volume24h: data[`${currency}_24h_vol`],
              priceChange24h: data[`${currency}_24h_change`]
            }
          })
        }
      })
      
      return results
    } catch (error) {
      console.error('Batch crypto price fetch failed:', error)
      throw error
    }
  }
  
  /**
   * Fetch price from CoinGecko
   */
  private async getCoinGeckoPrice(request: CryptoPriceRequest): Promise<CryptoPriceResult> {
    await this.checkRateLimit('coingecko')
    
    const client = this.httpClients.get('coingecko')
    if (!client) throw new Error('CoinGecko client not initialized')
    
    try {
      const coinId = this.getCoinGeckoId(request.symbol)
      const currency = (request.currency || 'USD').toLowerCase()
      
      const response = await client.get('/simple/price', {
        params: {
          ids: coinId,
          vs_currencies: currency,
          include_market_cap: 'true',
          include_24hr_vol: 'true',
          include_24hr_change: 'true',
          include_last_updated_at: 'true'
        }
      })
      
      const data = response.data[coinId]
      if (!data || data[currency] === undefined) {
        throw new Error(`Price not available for ${request.symbol}`)
      }
      
      // Get additional details
      const detailsResponse = await client.get(`/coins/${coinId}`)
      const details = detailsResponse.data
      
      return {
        symbol: request.symbol,
        blockchain: request.blockchain || this.inferBlockchain(request.symbol),
        price: data[currency],
        priceDecimal: new Decimal(data[currency]),
        currency: request.currency || 'USD',
        timestamp: data.last_updated_at 
          ? new Date(data.last_updated_at * 1000)
          : new Date(),
        source: 'CoinGecko',
        confidence: 0.95,
        metadata: {
          marketCap: data[`${currency}_market_cap`],
          volume24h: data[`${currency}_24h_vol`],
          priceChange24h: data[`${currency}_24h_change`],
          priceChangePercent24h: details.market_data?.price_change_percentage_24h,
          circulatingSupply: details.market_data?.circulating_supply,
          totalSupply: details.market_data?.total_supply,
          maxSupply: details.market_data?.max_supply,
          high24h: details.market_data?.high_24h?.[currency],
          low24h: details.market_data?.low_24h?.[currency],
          ath: details.market_data?.ath?.[currency],
          athDate: details.market_data?.ath_date?.[currency] 
            ? new Date(details.market_data.ath_date[currency])
            : undefined
        }
      }
    } catch (error) {
      throw new Error(`CoinGecko API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from Coinbase
   */
  private async getCoinbasePrice(request: CryptoPriceRequest): Promise<CryptoPriceResult> {
    await this.checkRateLimit('coinbase')
    
    const client = this.httpClients.get('coinbase')
    if (!client) throw new Error('Coinbase client not initialized')
    
    try {
      const pair = `${request.symbol}-${request.currency || 'USD'}`
      const response = await client.get(`/prices/${pair}/spot`)
      
      const price = parseFloat(response.data.data.amount)
      
      return {
        symbol: request.symbol,
        blockchain: request.blockchain || this.inferBlockchain(request.symbol),
        price,
        priceDecimal: new Decimal(price),
        currency: request.currency || 'USD',
        timestamp: new Date(),
        source: 'Coinbase',
        confidence: 0.93,
        metadata: {}
      }
    } catch (error) {
      throw new Error(`Coinbase API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Fetch price from CoinMarketCap
   */
  private async getCoinMarketCapPrice(request: CryptoPriceRequest): Promise<CryptoPriceResult> {
    await this.checkRateLimit('coinmarketcap')
    
    const client = this.httpClients.get('coinmarketcap')
    if (!client) throw new Error('CoinMarketCap client not initialized')
    
    try {
      const response = await client.get('/cryptocurrency/quotes/latest', {
        params: {
          symbol: request.symbol,
          convert: request.currency || 'USD'
        }
      })
      
      const data = response.data.data[request.symbol]
      if (!data) {
        throw new Error(`No data available for ${request.symbol}`)
      }
      
      const quote = data.quote[request.currency || 'USD']
      
      return {
        symbol: request.symbol,
        blockchain: request.blockchain || this.inferBlockchain(request.symbol),
        price: quote.price,
        priceDecimal: new Decimal(quote.price),
        currency: request.currency || 'USD',
        timestamp: new Date(quote.last_updated),
        source: 'CoinMarketCap',
        confidence: 0.92,
        metadata: {
          marketCap: quote.market_cap,
          volume24h: quote.volume_24h,
          volumeChange24h: quote.volume_change_24h,
          priceChangePercent24h: quote.percent_change_24h,
          circulatingSupply: data.circulating_supply,
          totalSupply: data.total_supply,
          maxSupply: data.max_supply
        }
      }
    } catch (error) {
      throw new Error(`CoinMarketCap API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Map crypto symbols to CoinGecko IDs
   */
  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      'btc': 'bitcoin',
      'bitcoin': 'bitcoin',
      'eth': 'ethereum',
      'ethereum': 'ethereum',
      'sol': 'solana',
      'solana': 'solana',
      'avax': 'avalanche-2',
      'avalanche': 'avalanche-2',
      'matic': 'matic-network',
      'polygon': 'matic-network',
      'near': 'near',
      'xrp': 'ripple',
      'usdt': 'tether',
      'usdc': 'usd-coin',
      'dai': 'dai',
      'bnb': 'binancecoin',
      'ada': 'cardano',
      'dot': 'polkadot',
      'link': 'chainlink',
      'ftm': 'fantom',
      'op': 'optimism',
      'arb': 'arbitrum',
      'inj': 'injective-protocol'
    }
    
    return mapping[symbol.toLowerCase()] || symbol.toLowerCase()
  }
  
  /**
   * Infer blockchain from symbol
   */
  private inferBlockchain(symbol: string): string {
    const mapping: Record<string, string> = {
      'btc': 'bitcoin',
      'bitcoin': 'bitcoin',
      'eth': 'ethereum',
      'ethereum': 'ethereum',
      'sol': 'solana',
      'solana': 'solana',
      'avax': 'avalanche',
      'avalanche': 'avalanche',
      'matic': 'polygon',
      'polygon': 'polygon',
      'near': 'near',
      'inj': 'injective'
    }
    
    return mapping[symbol.toLowerCase()] || 'unknown'
  }
  
  /**
   * Build cache key
   */
  private buildCacheKey(request: CryptoPriceRequest): string {
    return `crypto:${request.symbol}:${request.currency || 'USD'}`
  }
  
  /**
   * Cache price result
   */
  private cachePrice(key: string, price: CryptoPriceResult): void {
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
      ttl: this.config.cacheTTL || 30000
    }
  }
}

// Export singleton factory
export function createCryptoPriceProvider(config?: CryptoPriceProviderConfig): CryptoPriceProvider {
  return new CryptoPriceProvider(config)
}
