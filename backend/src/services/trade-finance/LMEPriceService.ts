/**
 * LME (London Metal Exchange) Price Service
 * 
 * Integrates with Metals-API to fetch LME spot prices for base metals.
 * 
 * Coverage: Copper, Aluminum, Zinc, Nickel, Lead, Tin
 * Update Frequency: Daily (LME settlement prices)
 * Cost: $9.99/month (10,000 requests)
 * Authentication: API key required
 * 
 * API Documentation: https://metals-api.com/documentation
 */

import { FastifyInstance } from 'fastify'

export interface LMEPriceData {
  metal: string
  symbol: string
  price_usd_per_tonne: number
  price_usd_per_troy_oz: number
  timestamp: Date
  source: string
  confidence: number
}

interface MetalsAPIResponse {
  success: boolean
  timestamp: number
  date: string
  base: string
  rates: Record<string, number>
  error?: {
    code: number
    type: string
    info: string
  }
}

export class LMEPriceService {
  private apiKey: string
  private baseUrl: string = 'https://metals-api.com/api'
  private supabase: any
  private projectId: string
  private fastify: FastifyInstance
  
  // LME symbol mapping
  private readonly LME_SYMBOLS = {
    COPPER: 'LME-XCU',
    ALUMINUM: 'LME-XAL',
    ZINC: 'LME-XZN',
    NICKEL: 'LME-XNI',
    LEAD: 'LME-XPB',
    TIN: 'LME-XSN'
  }
  
  // Conversion: 1 tonne = 32,150 troy ounces
  private readonly TROY_OZ_PER_TONNE = 32150
  
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
   * Get latest LME prices for all base metals
   */
  async getLatestPrices(): Promise<LMEPriceData[]> {
    try {
      const symbols = Object.values(this.LME_SYMBOLS)
      
      const response = await fetch(
        `${this.baseUrl}/latest?` +
        `access_key=${this.apiKey}&` +
        `base=USD&` +
        `symbols=${symbols.join(',')}`
      )
      
      if (!response.ok) {
        throw new Error(`LME API error: ${response.status} ${response.statusText}`)
      }
      
      const data: MetalsAPIResponse = await response.json()
      
      if (!data.success) {
        const errorMsg = data.error 
          ? `${data.error.type}: ${data.error.info}`
          : 'Unknown error'
        throw new Error(`LME API returned error: ${errorMsg}`)
      }
      
      return this._transformLMEData(data)
      
    } catch (error) {
      this.fastify.log.error('Failed to fetch LME prices:', error)
      throw error
    }
  }
  
  /**
   * Get price for a specific metal
   */
  async getMetalPrice(metal: keyof typeof this.LME_SYMBOLS): Promise<LMEPriceData | null> {
    try {
      const symbol = this.LME_SYMBOLS[metal]
      
      const response = await fetch(
        `${this.baseUrl}/latest?` +
        `access_key=${this.apiKey}&` +
        `base=USD&` +
        `symbols=${symbol}`
      )
      
      if (!response.ok) {
        throw new Error(`LME API error: ${response.status} ${response.statusText}`)
      }
      
      const data: MetalsAPIResponse = await response.json()
      
      if (!data.success || !data.rates[symbol]) {
        return null
      }
      
      return this._convertToLMEPrice(
        metal,
        symbol,
        data.rates[symbol],
        data.timestamp
      )
      
    } catch (error) {
      this.fastify.log.error(`Failed to fetch LME price for ${metal}:`, error)
      return null
    }
  }
  
  /**
   * Get historical prices for a metal
   */
  async getHistoricalPrices(
    metal: keyof typeof this.LME_SYMBOLS,
    startDate: string,
    endDate: string
  ): Promise<LMEPriceData[]> {
    try {
      const symbol = this.LME_SYMBOLS[metal]
      
      const response = await fetch(
        `${this.baseUrl}/timeseries?` +
        `access_key=${this.apiKey}&` +
        `start_date=${startDate}&` +
        `end_date=${endDate}&` +
        `symbols=${symbol}`
      )
      
      if (!response.ok) {
        throw new Error(`LME API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error('LME API returned error')
      }
      
      const results: LMEPriceData[] = []
      
      for (const [date, rates] of Object.entries(data.rates as Record<string, any>)) {
        const rate = rates[symbol]
        if (rate) {
          results.push(this._convertToLMEPrice(
            metal,
            symbol,
            rate,
            new Date(date).getTime() / 1000
          ))
        }
      }
      
      return results
      
    } catch (error) {
      this.fastify.log.error(
        `Failed to fetch historical LME prices for ${metal}:`,
        error
      )
      throw error
    }
  }
  
  /**
   * Store LME prices in database
   */
  async storePrices(prices: LMEPriceData[]): Promise<{
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
            commodity_type: price.metal,
            price_usd: price.price_usd_per_tonne,
            oracle_source: 'LME',
            confidence_score: price.confidence,
            metadata: {
              symbol: price.symbol,
              price_per_troy_oz: price.price_usd_per_troy_oz,
              price_per_tonne: price.price_usd_per_tonne
            },
            timestamp: price.timestamp.toISOString()
          })
        
        if (error) {
          this.fastify.log.error(`Failed to store LME price for ${price.metal}:`, error)
          failed++
        } else {
          this.fastify.log.info(
            `Stored LME price: ${price.metal} = $${price.price_usd_per_tonne.toFixed(2)}/tonne`
          )
          success++
        }
      } catch (error) {
        this.fastify.log.error(`Error storing LME price for ${price.metal}:`, error)
        failed++
      }
    }
    
    return { success, failed }
  }
  
  /**
   * Get latest cached price from database
   */
  async getCachedPrice(metal: keyof typeof this.LME_SYMBOLS): Promise<LMEPriceData | null> {
    try {
      const { data, error } = await this.supabase
        .from('commodity_prices')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('oracle_source', 'LME')
        .eq('commodity_type', metal)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (error || !data) {
        return null
      }
      
      return {
        metal: data.commodity_type,
        symbol: data.metadata?.symbol || this.LME_SYMBOLS[metal],
        price_usd_per_tonne: data.price_usd,
        price_usd_per_troy_oz: data.metadata?.price_per_troy_oz || 
          data.price_usd / this.TROY_OZ_PER_TONNE,
        timestamp: new Date(data.timestamp),
        source: 'LME',
        confidence: data.confidence_score
      }
      
    } catch (error) {
      this.fastify.log.error(`Failed to get cached LME price for ${metal}:`, error)
      return null
    }
  }
  
  /**
   * Transform Metals-API response to LMEPriceData format
   */
  private _transformLMEData(data: MetalsAPIResponse): LMEPriceData[] {
    const results: LMEPriceData[] = []
    
    for (const [metal, symbol] of Object.entries(this.LME_SYMBOLS)) {
      const rate = data.rates[symbol]
      
      if (rate) {
        results.push(this._convertToLMEPrice(
          metal as keyof typeof this.LME_SYMBOLS,
          symbol,
          rate,
          data.timestamp
        ))
      }
    }
    
    return results
  }
  
  /**
   * Convert troy ounce price to tonne price and create LMEPriceData
   */
  private _convertToLMEPrice(
    metal: keyof typeof this.LME_SYMBOLS,
    symbol: string,
    pricePerTroyOz: number,
    timestamp: number
  ): LMEPriceData {
    // Metals-API returns price per troy ounce in USD/oz format
    // Example: USD/LME-XCU rate of 0.2773501 means:
    //   1 USD = 0.2773501 troy oz of copper
    //   Therefore: 1 troy oz = 1 / 0.2773501 = 3.605 USD
    
    const pricePerOz = 1 / pricePerTroyOz
    const pricePerTonne = pricePerOz * this.TROY_OZ_PER_TONNE
    
    return {
      metal: metal,
      symbol: symbol,
      price_usd_per_tonne: pricePerTonne,
      price_usd_per_troy_oz: pricePerOz,
      timestamp: new Date(timestamp * 1000),
      source: 'LME',
      confidence: 95 // LME is highly reliable
    }
  }
  
  /**
   * Check if API key is valid
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/latest?` +
        `access_key=${this.apiKey}&` +
        `base=USD&` +
        `symbols=LME-XCU`
      )
      
      const data: MetalsAPIResponse = await response.json()
      return data.success
      
    } catch {
      return false
    }
  }
}

/**
 * Factory function to create LME Price Service
 */
export function createLMEPriceService(
  fastify: FastifyInstance,
  projectId: string
): LMEPriceService {
  const apiKey = process.env.METALS_API_KEY
  
  if (!apiKey) {
    throw new Error('METALS_API_KEY environment variable is required')
  }
  
  return new LMEPriceService(
    apiKey,
    fastify.supabase,
    projectId,
    fastify
  )
}
