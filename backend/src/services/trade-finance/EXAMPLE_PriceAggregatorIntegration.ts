// /backend/src/services/trade-finance/PriceAggregatorService.ts
/**
 * EXAMPLE: How to integrate PreciousMetalsPriceService into existing CommodityPriceAggregator
 */

import { FastifyInstance } from 'fastify'
import { PreciousMetalsPriceService } from './PreciousMetalsPriceService'

// Assuming existing CommodityPriceAggregator structure
export class EnhancedCommodityPriceAggregator {
  private fastify: FastifyInstance
  private projectId: string
  private preciousMetalsService: PreciousMetalsPriceService
  
  constructor(fastify: FastifyInstance, projectId: string) {
    this.fastify = fastify
    this.projectId = projectId
    
    // Initialize precious metals service
    this.preciousMetalsService = new PreciousMetalsPriceService(fastify)
  }
  
  /**
   * Fetch current price for ANY commodity
   * Automatically routes to correct provider
   */
  async fetchCurrentPrice(commodityType: string): Promise<CommodityPrice> {
    // Precious metals → External APIs
    if (this.isPreciousMetal(commodityType)) {
      return this.fetchPreciousMetalPrice(commodityType)
    }
    
    // All other commodities → FRED
    return this.fetchFREDPrice(commodityType)
  }
  
  /**
   * Check if commodity is a precious metal
   */
  private isPreciousMetal(commodityType: string): boolean {
    const preciousMetals = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM']
    return preciousMetals.includes(commodityType.toUpperCase())
  }
  
  /**
   * Fetch precious metal price from external APIs
   * Uses multi-provider fallback automatically
   */
  private async fetchPreciousMetalPrice(metal: string): Promise<CommodityPrice> {
    try {
      const metalPrice = await this.preciousMetalsService.getSpotPrice(metal)
      
      return {
        commodity_type: metal.toUpperCase(),
        price_usd: metalPrice.price_usd,
        unit: metalPrice.unit,
        source: metalPrice.provider,
        timestamp: metalPrice.timestamp,
        confidence: metalPrice.confidence,
        metadata: {
          bid: metalPrice.bid,
          ask: metalPrice.ask,
          spread: metalPrice.bid && metalPrice.ask 
            ? metalPrice.ask - metalPrice.bid 
            : undefined
        }
      }
    } catch (error) {
      const err = error as Error
      this.fastify.log.error(`Failed to fetch ${metal} price: ${err.message}`)
      throw error
    }
  }
  
  /**
   * Fetch price from FRED for non-precious metals
   * (Existing implementation)
   */
  private async fetchFREDPrice(commodityType: string): Promise<CommodityPrice> {
    // Existing FRED logic...
    const seriesId = this.getFREDSeriesId(commodityType)
    
    const response = await fetch(
      'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          provider: 'fred',
          endpoint: 'series/observations',
          params: {
            series_id: seriesId,
            api_key: '2f9410eb4d82bffc020c077ef79259e3',
            sort_order: 'desc',
            limit: 1
          }
        })
      }
    )
    
    const data = await response.json()
    const observation = data.data.observations[0]
    
    return {
      commodity_type: commodityType,
      price_usd: parseFloat(observation.value),
      unit: this.getFREDUnit(commodityType),
      source: 'fred',
      timestamp: new Date(observation.date),
      confidence: 95
    }
  }
  
  /**
   * Get FRED series ID for commodity
   */
  private getFREDSeriesId(commodityType: string): string {
    const seriesMap: Record<string, string> = {
      // Energy
      'WTI_CRUDE': 'DCOILWTICO',
      'BRENT_CRUDE': 'DCOILBRENTEU',
      'NATURAL_GAS': 'DHHNGSP',
      
      // Agricultural - Grains
      'WHEAT': 'PWHEAMTUSDM',
      'CORN': 'PMAIZMTUSDM',
      'SOYBEANS': 'PSOYBUSDM',
      'RICE': 'PRICENPQUSDM',
      'BARLEY': 'PBARLUSDM',
      
      // Agricultural - Softs
      'COFFEE': 'PCOFFOTMUSDM',
      'COTTON': 'PCOTTINDUSDM',
      'SUGAR': 'PSUGAISAUSDM',
      'COCOA': 'PCOCOTUSDM',
      
      // Base Metals
      'COPPER': 'PCOPPUSDM',
      'ALUMINUM': 'PALUMUSDM',
      'ZINC': 'PZINCUSDM',
      'NICKEL': 'PNICKUSDM',
      'LEAD': 'PLEADUSDM',
      'TIN': 'PTINUSDM',
      
      // Other
      'LUMBER': 'PLUMBUSDM'
    }
    
    const seriesId = seriesMap[commodityType.toUpperCase()]
    if (!seriesId) {
      throw new Error(`Unknown commodity type: ${commodityType}`)
    }
    
    return seriesId
  }
  
  /**
   * Get unit for FRED commodity
   */
  private getFREDUnit(commodityType: string): string {
    const unitMap: Record<string, string> = {
      // Energy
      'WTI_CRUDE': 'USD/barrel',
      'BRENT_CRUDE': 'USD/barrel',
      'NATURAL_GAS': 'USD/MMBtu',
      
      // Agricultural - Grains
      'WHEAT': 'USD/metric ton',
      'CORN': 'USD/metric ton',
      'SOYBEANS': 'USD/metric ton',
      'RICE': 'USD/metric ton',
      'BARLEY': 'USD/metric ton',
      
      // Agricultural - Softs
      'COFFEE': 'USD/kg',
      'COTTON': 'USD/kg',
      'SUGAR': 'USD/kg',
      'COCOA': 'USD/metric ton',
      
      // Base Metals
      'COPPER': 'USD/metric ton',
      'ALUMINUM': 'USD/metric ton',
      'ZINC': 'USD/metric ton',
      'NICKEL': 'USD/metric ton',
      'LEAD': 'USD/metric ton',
      'TIN': 'USD/metric ton',
      
      // Other
      'LUMBER': 'USD/cubic meter'
    }
    
    return unitMap[commodityType.toUpperCase()] || 'USD'
  }
  
  /**
   * Fetch all commodity prices
   * Automatically handles precious metals vs FRED commodities
   */
  async fetchAllPrices(): Promise<Record<string, CommodityPrice>> {
    const allCommodities = [
      // Precious metals (external APIs)
      'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM',
      
      // FRED commodities
      'WTI_CRUDE', 'BRENT_CRUDE', 'NATURAL_GAS',
      'WHEAT', 'CORN', 'SOYBEANS', 'RICE', 'BARLEY',
      'COFFEE', 'COTTON', 'SUGAR', 'COCOA',
      'COPPER', 'ALUMINUM', 'ZINC', 'NICKEL', 'LEAD', 'TIN',
      'LUMBER'
    ]
    
    const results = await Promise.allSettled(
      allCommodities.map(commodity => 
        this.fetchCurrentPrice(commodity)
          .then(price => [commodity, price] as const)
      )
    )
    
    const prices: Record<string, CommodityPrice> = {}
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [commodity, price] = result.value
        prices[commodity] = price
      } else {
        this.fastify.log.error(
          `Failed to fetch price: ${result.reason}`
        )
      }
    }
    
    return prices
  }
  
  /**
   * Health check for all data sources
   */
  async checkHealth(): Promise<HealthStatus> {
    // Check precious metals providers
    const metalProviders = await this.preciousMetalsService.checkProviders()
    
    // Check FRED (try fetching WTI crude)
    let fredAvailable = false
    try {
      await this.fetchFREDPrice('WTI_CRUDE')
      fredAvailable = true
    } catch (error) {
      const err = error as Error
      this.fastify.log.error(`FRED health check failed: ${err.message}`)
    }
    
    return {
      fred: fredAvailable,
      preciousMetals: metalProviders,
      overall: fredAvailable && Object.values(metalProviders).some(v => v)
    }
  }
}

/**
 * Type definitions
 */
interface CommodityPrice {
  commodity_type: string
  price_usd: number
  unit: string
  source: string
  timestamp: Date
  confidence: number
  metadata?: {
    bid?: number
    ask?: number
    spread?: number
  }
}

interface HealthStatus {
  fred: boolean
  preciousMetals: Record<string, boolean>
  overall: boolean
}

/**
 * Factory function
 */
export function createEnhancedCommodityPriceAggregator(
  fastify: FastifyInstance,
  projectId: string
): EnhancedCommodityPriceAggregator {
  return new EnhancedCommodityPriceAggregator(fastify, projectId)
}

/**
 * USAGE EXAMPLE:
 * 
 * // In your route handler
 * const aggregator = createEnhancedCommodityPriceAggregator(fastify, 'project-123')
 * 
 * // Fetch gold (uses external API automatically)
 * const goldPrice = await aggregator.fetchCurrentPrice('GOLD')
 * // Returns: { price_usd: 2034.50, source: 'metals.live', ... }
 * 
 * // Fetch WTI crude (uses FRED automatically)
 * const oilPrice = await aggregator.fetchCurrentPrice('WTI_CRUDE')
 * // Returns: { price_usd: 73.50, source: 'fred', ... }
 * 
 * // Fetch all commodity prices
 * const allPrices = await aggregator.fetchAllPrices()
 * // Returns: { GOLD: {...}, WTI_CRUDE: {...}, ... }
 * 
 * // Check health of all data sources
 * const health = await aggregator.checkHealth()
 * // Returns: { fred: true, preciousMetals: { 'metals.live': true, ... }, overall: true }
 */
