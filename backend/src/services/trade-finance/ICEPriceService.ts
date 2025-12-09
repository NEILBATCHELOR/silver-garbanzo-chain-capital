/**
 * ICE (Intercontinental Exchange) Price Service
 * 
 * Integrates with Barchart API to fetch ICE soft commodity futures prices.
 * 
 * Coverage: Coffee (Arabica), Cocoa, Cotton, Sugar No. 11, Orange Juice
 * Update Frequency: Real-time to 10-minute delayed (depending on plan)
 * Cost: Free tier (250 req/day) or $25/month
 * Authentication: API key required
 * 
 * API Documentation: https://www.barchart.com/solutions/data/market
 */

import { FastifyInstance } from 'fastify'

export interface ICEPriceData {
  commodity: string
  symbol: string
  contractMonth: string
  price_usd: number
  volume: number
  openInterest?: number
  timestamp: Date
  source: string
  confidence: number
}

interface BarchartQuoteResponse {
  status: {
    code: number
    message: string
  }
  results: Array<{
    symbol: string
    name: string
    lastPrice: number
    volume: number
    openInterest?: number
    tradeTimestamp: string
    open?: number
    high?: number
    low?: number
  }>
}

export class ICEPriceService {
  private apiKey: string
  private baseUrl: string = 'https://marketdata.websol.barchart.com/getQuote.json'
  private supabase: any
  private projectId: string
  private fastify: FastifyInstance
  
  // ICE soft commodity symbols (lead month contracts)
  private readonly ICE_SYMBOLS = {
    COFFEE_ARABICA: 'KC*1',   // Coffee C (Arabica)
    COCOA: 'CC*1',            // Cocoa
    COTTON: 'CT*1',           // Cotton No. 2
    SUGAR_11: 'SB*1',         // Sugar No. 11
    ORANGE_JUICE: 'OJ*1'      // Frozen Concentrated Orange Juice
  }
  
  constructor(
    apiKey: string,
    supabase: any,
    projectId: string,
    fastify: FastifyInstance
  ) {
    this.apiKey = apiKey
    this.supabase = supabase
    this.projectId = projectId
    this.fastify = fastify
  }
  
  /**
   * Get latest prices for all soft commodities
   */
  async getSoftCommodityPrices(): Promise<ICEPriceData[]> {
    const symbols = Object.values(this.ICE_SYMBOLS)
    const prices: ICEPriceData[] = []
    
    for (const symbol of symbols) {
      try {
        const price = await this.fetchSymbolPrice(symbol)
        if (price) {
          prices.push(price)
        }
      } catch (error) {
        this.fastify.log.error(`Failed to fetch ICE price for ${symbol}:`, error)
      }
    }
    
    return prices
  }
  
  /**
   * Get price for a specific commodity
   */
  async getCommodityPrice(
    commodity: keyof typeof this.ICE_SYMBOLS
  ): Promise<ICEPriceData | null> {
    try {
      const symbol = this.ICE_SYMBOLS[commodity]
      return await this.fetchSymbolPrice(symbol)
    } catch (error) {
      this.fastify.log.error(`Failed to fetch ICE price for ${commodity}:`, error)
      return null
    }
  }
  
  /**
   * Fetch price for a specific symbol
   */
  private async fetchSymbolPrice(symbol: string): Promise<ICEPriceData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}?` +
        `apikey=${this.apiKey}&` +
        `symbols=${symbol}`
      )
      
      if (!response.ok) {
        throw new Error(`Barchart API error: ${response.status} ${response.statusText}`)
      }
      
      const data: BarchartQuoteResponse = await response.json()
      
      if (data.status.code !== 200) {
        throw new Error(`Barchart API error: ${data.status.message}`)
      }
      
      if (!data.results || data.results.length === 0) {
        this.fastify.log.warn(`No data returned for symbol ${symbol}`)
        return null
      }
      
      const result = data.results[0]
      
      return {
        commodity: this._mapSymbolToCommodity(symbol),
        symbol: result.symbol,
        contractMonth: this._extractContractMonth(result.symbol),
        price_usd: result.lastPrice,
        volume: result.volume,
        openInterest: result.openInterest,
        timestamp: new Date(result.tradeTimestamp),
        source: 'ICE',
        confidence: 95
      }
      
    } catch (error) {
      this.fastify.log.error(`Error fetching symbol ${symbol}:`, error)
      return null
    }
  }
  
  /**
   * Get multiple symbols in one request (batch)
   */
  async getBatchPrices(symbols: string[]): Promise<ICEPriceData[]> {
    try {
      const symbolsParam = symbols.join(',')
      
      const response = await fetch(
        `${this.baseUrl}?` +
        `apikey=${this.apiKey}&` +
        `symbols=${symbolsParam}`
      )
      
      if (!response.ok) {
        throw new Error(`Barchart API error: ${response.status} ${response.statusText}`)
      }
      
      const data: BarchartQuoteResponse = await response.json()
      
      if (data.status.code !== 200 || !data.results) {
        return []
      }
      
      return data.results.map(result => ({
        commodity: this._mapSymbolToCommodity(result.symbol),
        symbol: result.symbol,
        contractMonth: this._extractContractMonth(result.symbol),
        price_usd: result.lastPrice,
        volume: result.volume,
        openInterest: result.openInterest,
        timestamp: new Date(result.tradeTimestamp),
        source: 'ICE',
        confidence: 95
      }))
      
    } catch (error) {
      this.fastify.log.error('Error fetching batch prices:', error)
      return []
    }
  }
  
  /**
   * Store ICE prices in database
   */
  async storePrices(prices: ICEPriceData[]): Promise<{
    success: number
    failed: number
  }> {
    let success = 0
    let failed = 0
    
    for (const price of prices) {
      try {
        const { error } = await this.supabase
          .from('commodity_prices')
          .insert({
            project_id: this.projectId,
            commodity_type: price.commodity,
            price_usd: price.price_usd,
            oracle_source: 'ICE',
            confidence_score: price.confidence,
            volume: price.volume,
            metadata: {
              symbol: price.symbol,
              contractMonth: price.contractMonth,
              openInterest: price.openInterest
            },
            timestamp: price.timestamp.toISOString()
          })
        
        if (error) {
          this.fastify.log.error(`Failed to store ICE price for ${price.commodity}:`, error)
          failed++
        } else {
          this.fastify.log.info(
            `Stored ICE price: ${price.commodity} = $${price.price_usd.toFixed(2)}`
          )
          success++
        }
      } catch (error) {
        this.fastify.log.error(`Error storing ICE price for ${price.commodity}:`, error)
        failed++
      }
    }
    
    return { success, failed }
  }
  
  /**
   * Get latest cached price from database
   */
  async getCachedPrice(
    commodity: keyof typeof this.ICE_SYMBOLS
  ): Promise<ICEPriceData | null> {
    try {
      const { data, error } = await this.supabase
        .from('commodity_prices')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('oracle_source', 'ICE')
        .eq('commodity_type', commodity)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (error || !data) {
        return null
      }
      
      return {
        commodity: data.commodity_type,
        symbol: data.metadata?.symbol || this.ICE_SYMBOLS[commodity],
        contractMonth: data.metadata?.contractMonth || '',
        price_usd: data.price_usd,
        volume: data.volume || 0,
        openInterest: data.metadata?.openInterest,
        timestamp: new Date(data.timestamp),
        source: 'ICE',
        confidence: data.confidence_score
      }
      
    } catch (error) {
      this.fastify.log.error(`Failed to get cached ICE price for ${commodity}:`, error)
      return null
    }
  }
  
  /**
   * Map Barchart symbol to commodity type
   */
  private _mapSymbolToCommodity(symbol: string): string {
    // Extract base symbol (first 2 characters)
    const baseSymbol = symbol.substring(0, 2)
    
    const mapping: Record<string, string> = {
      'KC': 'COFFEE_ARABICA',
      'CC': 'COCOA',
      'CT': 'COTTON',
      'SB': 'SUGAR_11',
      'OJ': 'ORANGE_JUICE'
    }
    
    return mapping[baseSymbol] || `UNKNOWN_${baseSymbol}`
  }
  
  /**
   * Extract contract month from symbol
   * Example: "KCH25" -> "2025-03" (H = March, 25 = 2025)
   */
  private _extractContractMonth(symbol: string): string {
    if (symbol.length < 4) return ''
    
    // Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun,
    //              N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
    const monthCode = symbol[2]
    const yearCode = symbol.substring(3, 5)
    
    const monthMapping: Record<string, string> = {
      'F': '01', 'G': '02', 'H': '03', 'J': '04',
      'K': '05', 'M': '06', 'N': '07', 'Q': '08',
      'U': '09', 'V': '10', 'X': '11', 'Z': '12'
    }
    
    const month = monthMapping[monthCode] || '01'
    const fullYear = `20${yearCode}` // Assuming 20xx
    
    return `${fullYear}-${month}`
  }
  
  /**
   * Validate API key
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}?` +
        `apikey=${this.apiKey}&` +
        `symbols=KC*1`
      )
      
      const data: BarchartQuoteResponse = await response.json()
      return data.status.code === 200
      
    } catch {
      return false
    }
  }
  
  /**
   * Get daily usage statistics (if supported by API)
   */
  async getUsageStats(): Promise<{
    requestsToday: number
    requestsRemaining: number
  } | null> {
    // Barchart free tier: 250 requests/day
    // This would require checking API response headers
    // Not implemented in basic version
    return null
  }
}

/**
 * Factory function to create ICE Price Service
 */
export function createICEPriceService(
  fastify: FastifyInstance,
  projectId: string
): ICEPriceService {
  const apiKey = process.env.BARCHART_API_KEY
  
  if (!apiKey) {
    throw new Error('BARCHART_API_KEY environment variable is required')
  }
  
  return new ICEPriceService(
    apiKey,
    fastify.supabase,
    projectId,
    fastify
  )
}
