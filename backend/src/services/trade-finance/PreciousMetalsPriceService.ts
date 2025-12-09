// /backend/src/services/trade-finance/PreciousMetalsPriceService.ts
import { FastifyInstance } from 'fastify'

/**
 * Precious Metals Price Service
 * 
 * Multi-provider architecture with automatic fallback for maximum reliability.
 * Uses Supabase Edge Function to avoid CORS issues.
 * 
 * Provider Priority:
 * 1. api.metals.live (30,000 req/month free, no API key)
 * 2. Metals.Dev (100 req/month free, requires API key)
 * 3. Metals-API.com (10,000 req/month paid, requires API key)
 * 
 * Usage:
 * ```typescript
 * const service = new PreciousMetalsPriceService(fastify)
 * const goldPrice = await service.getSpotPrice('GOLD')
 * // Returns: { provider: 'metals.live', price_usd: 2034.50, ... }
 * ```
 */

export interface MetalPrice {
  provider: string
  metal: string
  price_usd: number
  unit: 'toz' // troy ounce
  bid?: number
  ask?: number
  timestamp: Date
  confidence: number // 0-100
}

interface PriceProvider {
  name: string
  getSpotPrice(metal: string): Promise<MetalPrice>
  isAvailable(): boolean
}

interface EdgeFunctionResponse {
  success: boolean
  data: unknown
  source: string
  timestamp: string
  error?: string
}

/**
 * Provider 1: api.metals.live
 * - FREE: 30,000 requests/month
 * - No API key required < 30K
 * - Real-time when markets open
 */
class MetalsLiveProvider implements PriceProvider {
  name = 'metals.live'
  private fastify: FastifyInstance
  private edgeFunctionUrl: string
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
    this.edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL || 
      'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy'
  }
  
  isAvailable(): boolean {
    return true // Always available (no API key)
  }
  
  async getSpotPrice(metal: string): Promise<MetalPrice> {
    const metalMap: Record<string, string> = {
      'GOLD': 'XAU',
      'SILVER': 'XAG',
      'PLATINUM': 'XPT',
      'PALLADIUM': 'XPD'
    }
    
    const symbol = metalMap[metal.toUpperCase()]
    if (!symbol) {
      throw new Error(`Unsupported metal: ${metal}`)
    }
    
    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        provider: 'metals_live',
        endpoint: `spot/${symbol}`,
        params: {}
      })
    })
    
    if (!response.ok) {
      throw new Error(`Metals.live API error: ${response.statusText}`)
    }
    
    const result = await response.json() as EdgeFunctionResponse
    
    if (!result.success || !result.data) {
      throw new Error(`Metals.live API error: ${result.error || 'Unknown error'}`)
    }
    
    const data = result.data as { price: number; timestamp: number }
    
    return {
      provider: this.name,
      metal: metal.toUpperCase(),
      price_usd: data.price,
      unit: 'toz',
      timestamp: new Date(data.timestamp * 1000),
      confidence: 90
    }
  }
}

/**
 * Provider 2: Metals.Dev
 * - FREE: 100 requests/month
 * - API key required
 * - 60-second update delay
 */
class MetalsDevProvider implements PriceProvider {
  name = 'metals.dev'
  private fastify: FastifyInstance
  private edgeFunctionUrl: string
  private apiKey?: string
  
  constructor(fastify: FastifyInstance, apiKey?: string) {
    this.fastify = fastify
    this.apiKey = apiKey || process.env.METALS_DEV_API_KEY
    this.edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL || 
      'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy'
  }
  
  isAvailable(): boolean {
    return !!this.apiKey
  }
  
  async getSpotPrice(metal: string): Promise<MetalPrice> {
    if (!this.apiKey) {
      throw new Error('Metals.Dev API key not configured')
    }
    
    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        provider: 'metals_dev',
        endpoint: 'metal/spot',
        params: {
          api_key: this.apiKey,
          metal: metal.toLowerCase(),
          currency: 'USD'
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Metals.Dev API error: ${response.statusText}`)
    }
    
    const result = await response.json() as EdgeFunctionResponse
    
    if (!result.success || !result.data) {
      throw new Error(`Metals.Dev API error: ${result.error || 'Unknown error'}`)
    }
    
    const data = result.data as { 
      rates: { spot: number; bid?: number; ask?: number }; 
      timestamp: string 
    }
    
    return {
      provider: this.name,
      metal: metal.toUpperCase(),
      price_usd: data.rates.spot,
      unit: 'toz',
      bid: data.rates.bid,
      ask: data.rates.ask,
      timestamp: new Date(data.timestamp),
      confidence: 95
    }
  }
}

/**
 * Provider 3: Metals-API.com
 * - PAID: $9.99/month for 10,000 requests
 * - API key required
 * - 60-second updates
 * - Comprehensive features
 */
class MetalsAPIProvider implements PriceProvider {
  name = 'metals-api.com'
  private fastify: FastifyInstance
  private edgeFunctionUrl: string
  private apiKey?: string
  
  constructor(fastify: FastifyInstance, apiKey?: string) {
    this.fastify = fastify
    this.apiKey = apiKey || process.env.METALS_API_KEY
    this.edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL || 
      'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy'
  }
  
  isAvailable(): boolean {
    return !!this.apiKey
  }
  
  async getSpotPrice(metal: string): Promise<MetalPrice> {
    if (!this.apiKey) {
      throw new Error('Metals-API.com API key not configured')
    }
    
    const symbolMap: Record<string, string> = {
      'GOLD': 'XAU',
      'SILVER': 'XAG',
      'PLATINUM': 'XPT',
      'PALLADIUM': 'XPD'
    }
    
    const symbol = symbolMap[metal.toUpperCase()]
    if (!symbol) {
      throw new Error(`Unsupported metal: ${metal}`)
    }
    
    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        provider: 'metals_api',
        endpoint: 'latest',
        params: {
          access_key: this.apiKey,
          base: 'USD',
          symbols: symbol
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Metals-API.com error: ${response.statusText}`)
    }
    
    const result = await response.json() as EdgeFunctionResponse
    
    if (!result.success || !result.data) {
      throw new Error(`Metals-API.com error: ${result.error || 'Unknown error'}`)
    }
    
    const data = result.data as {
      success: boolean
      timestamp: number
      rates: Record<string, number>
      error?: { info: string }
    }
    
    if (!data.success) {
      throw new Error(`Metals-API.com error: ${data.error?.info || 'Unknown error'}`)
    }
    
    // Check if the rate exists
    const rate = data.rates[symbol]
    if (!rate) {
      throw new Error(`Rate not found for symbol: ${symbol}`)
    }
    
    // Convert inverse rate to USD/oz
    const priceUsd = 1 / rate
    
    return {
      provider: this.name,
      metal: metal.toUpperCase(),
      price_usd: priceUsd,
      unit: 'toz',
      timestamp: new Date(data.timestamp * 1000),
      confidence: 95
    }
  }
}

/**
 * Main Service with Multi-Provider Fallback
 */
export class PreciousMetalsPriceService {
  private providers: PriceProvider[]
  private fastify: FastifyInstance
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
    
    // Priority order: Free → Paid (if configured)
    this.providers = [
      new MetalsLiveProvider(fastify), // Always available
      new MetalsDevProvider(fastify), // Free tier, if API key set
      new MetalsAPIProvider(fastify) // Paid, if API key set
    ]
  }
  
  /**
   * Get spot price for a single metal
   * Tries providers in order until one succeeds
   */
  async getSpotPrice(metal: string): Promise<MetalPrice> {
    const availableProviders = this.providers.filter(p => p.isAvailable())
    
    if (availableProviders.length === 0) {
      throw new Error('No precious metals price providers available')
    }
    
    let lastError: Error | null = null
    
    for (const provider of availableProviders) {
      try {
        const price = await provider.getSpotPrice(metal)
        
        this.fastify.log.info(
          `✅ Got ${metal} price from ${provider.name}: $${price.price_usd}/oz`
        )
        
        return price
      } catch (error) {
        const err = error as Error
        lastError = err
        this.fastify.log.warn(
          `❌ ${provider.name} failed for ${metal}: ${err.message}`
        )
        // Continue to next provider
      }
    }
    
    throw new Error(
      `All precious metals providers failed for ${metal}: ${lastError?.message || 'Unknown error'}`
    )
  }
  
  /**
   * Get spot prices for all precious metals
   * Returns partial results if some providers fail
   */
  async getAllSpotPrices(): Promise<Record<string, MetalPrice>> {
    const metals = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM']
    
    const results = await Promise.allSettled(
      metals.map(metal => this.getSpotPrice(metal))
    )
    
    return results.reduce((acc, result, index) => {
      if (result.status === 'fulfilled') {
        const metalName = metals[index]
        if (metalName) {
          acc[metalName] = result.value
        }
      } else {
        const metalName = metals[index]
        if (metalName) {
          this.fastify.log.error(
            `Failed to get ${metalName} price: ${result.reason}`
          )
        }
      }
      return acc
    }, {} as Record<string, MetalPrice>)
  }
  
  /**
   * Health check for all providers
   */
  async checkProviders(): Promise<Record<string, boolean>> {
    const checks = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          await provider.getSpotPrice('GOLD')
          return [provider.name, true] as const
        } catch {
          return [provider.name, false] as const
        }
      })
    )
    
    return Object.fromEntries(checks)
  }
}

/**
 * Factory function for dependency injection
 */
export function createPreciousMetalsPriceService(
  fastify: FastifyInstance
): PreciousMetalsPriceService {
  return new PreciousMetalsPriceService(fastify)
}
