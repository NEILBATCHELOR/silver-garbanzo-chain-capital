/**
 * Price Orchestrator Service
 * 
 * Unified coordinator for all commodity price services with intelligent routing,
 * fallback logic, and rate limiting.
 * 
 * Architecture:
 * - Primary: Chainlink (on-chain, real-time, most reliable)
 * - Secondary: CME/LME/ICE (off-chain APIs, exchange data)
 * - Tertiary: FRED (government data, historical backup)
 * 
 * Features:
 * - Smart routing based on commodity type
 * - Automatic fallback on service failures
 * - Rate limiting across all services
 * - Price aggregation and confidence scoring
 * - Caching and staleness detection
 */

import { FastifyInstance } from 'fastify'
import { createCMEPriceService, CMEPriceData } from './CMEPriceService'
import { createLMEPriceService, LMEPriceData } from './LMEPriceService'
import { createICEPriceService, ICEPriceData } from './ICEPriceService'
import { createPriceAggregator } from './PriceAggregator'
import { createPreciousMetalsPriceService } from './PreciousMetalsPriceService'

export interface OrchestratedPrice {
  commodity: string
  price_usd: number
  source: 'chainlink' | 'cme' | 'lme' | 'ice' | 'fred' | 'precious-metals'
  confidence: number
  timestamp: Date
  isAggregated: boolean
  fallbackUsed: boolean
}

export interface PriceSourceConfig {
  enabled: boolean
  priority: number
  rateLimitPerHour: number
  staleness ThresholdMinutes: number
}

export class PriceOrchestrator {
  private supabase: any
  private projectId: string
  private fastify: FastifyInstance
  
  // Service instances
  private cmeService: ReturnType<typeof createCMEPriceService> | null = null
  private lmeService: ReturnType<typeof createLMEPriceService> | null = null
  private iceService: ReturnType<typeof createICEPriceService> | null = null
  private preciousMetalsService: ReturnType<typeof createPreciousMetalsPriceService> | null = null
  private fredService: ReturnType<typeof createPriceAggregator>
  
  // Rate limiting
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map()
  
  // Commodity type routing
  private readonly COMMODITY_ROUTING = {
    // Precious Metals - Chainlink primary, Precious Metals API secondary, FRED backup
    GOLD: ['chainlink', 'precious-metals', 'fred'],
    SILVER: ['chainlink', 'precious-metals', 'fred'],
    PLATINUM: ['chainlink', 'precious-metals', 'fred'],
    PALLADIUM: ['precious-metals', 'fred'], // No Chainlink feed
    
    // Base Metals - LME primary, FRED backup
    COPPER: ['lme', 'fred'],
    ALUMINUM: ['lme', 'fred'],
    ZINC: ['lme', 'fred'],
    NICKEL: ['lme', 'fred'],
    LEAD: ['lme', 'fred'],
    TIN: ['lme', 'fred'],
    
    // Energy - CME primary, FRED backup
    WTI_CRUDE_OIL: ['cme', 'fred'],
    BRENT_CRUDE_OIL: ['cme', 'fred'],
    NATURAL_GAS: ['cme', 'fred'],
    HEATING_OIL: ['cme', 'fred'],
    RBOB_GASOLINE: ['cme', 'fred'],
    
    // Agricultural - CME primary, FRED backup
    CORN: ['cme', 'fred'],
    WHEAT: ['cme', 'fred'],
    SOYBEANS: ['cme', 'fred'],
    SOYBEAN_MEAL: ['cme', 'fred'],
    RICE: ['cme', 'fred'],
    OATS: ['cme', 'fred'],
    
    // Livestock - CME only
    LIVE_CATTLE: ['cme'],
    FEEDER_CATTLE: ['cme'],
    LEAN_HOGS: ['cme'],
    
    // Soft Commodities - ICE primary, FRED backup
    COFFEE_ARABICA: ['ice', 'fred'],
    COCOA: ['ice', 'fred'],
    COTTON: ['ice', 'fred'],
    SUGAR_11: ['ice', 'fred'],
    ORANGE_JUICE: ['ice']
  } as const
  
  constructor(
    supabase: any,
    projectId: string,
    fastify: FastifyInstance
  ) {
    this.supabase = supabase
    this.projectId = projectId
    this.fastify = fastify
    this.fredService = createPriceAggregator(fastify, projectId)
    
    // Initialize optional services if API keys are available
    this._initializeServices()
  }
  
  /**
   * Initialize price services based on available API keys
   */
  private _initializeServices(): void {
    try {
      if (process.env.CME_API_KEY) {
        this.cmeService = createCMEPriceService(this.fastify, this.projectId)
        this.fastify.log.info('CME Price Service initialized')
      }
    } catch (error) {
      this.fastify.log.warn('CME Price Service not available:', error)
    }
    
    try {
      if (process.env.METALS_API_KEY) {
        this.lmeService = createLMEPriceService(this.fastify, this.projectId)
        this.fastify.log.info('LME Price Service initialized')
      }
    } catch (error) {
      this.fastify.log.warn('LME Price Service not available:', error)
    }
    
    try {
      if (process.env.BARCHART_API_KEY) {
        this.iceService = createICEPriceService(this.fastify, this.projectId)
        this.fastify.log.info('ICE Price Service initialized')
      }
    } catch (error) {
      this.fastify.log.warn('ICE Price Service not available:', error)
    }
    
    // Always initialize Precious Metals Service (free tier available via metals.live)
    try {
      this.preciousMetalsService = createPreciousMetalsPriceService(this.fastify)
      this.fastify.log.info('Precious Metals Price Service initialized (metals.live free tier)')
    } catch (error) {
      this.fastify.log.warn('Precious Metals Price Service not available:', error)
    }
  }
  
  /**
   * Get price with intelligent routing and fallback
   */
  async getPrice(commodity: string): Promise<OrchestratedPrice | null> {
    const sources = this._getPriorityOrder(commodity)
    
    for (const source of sources) {
      try {
        // Check rate limits
        if (!this._checkRateLimit(source)) {
          this.fastify.log.warn(`Rate limit exceeded for ${source}, trying next source`)
          continue
        }
        
        // Try to fetch from source
        const price = await this._fetchFromSource(source, commodity)
        
        if (price) {
          // Increment rate limit counter
          this._incrementRateLimit(source)
          
          return {
            ...price,
            fallbackUsed: sources.indexOf(source) > 0
          }
        }
      } catch (error) {
        this.fastify.log.error(`Failed to fetch from ${source}:`, error)
        // Continue to next source
      }
    }
    
    this.fastify.log.error(`All sources failed for commodity: ${commodity}`)
    return null
  }
  
  /**
   * Get aggregated price from multiple sources
   */
  async getAggregatedPrice(commodity: string): Promise<OrchestratedPrice | null> {
    const sources = this._getPriorityOrder(commodity)
    const prices: OrchestratedPrice[] = []
    
    // Fetch from all available sources
    for (const source of sources) {
      try {
        if (this._checkRateLimit(source)) {
          const price = await this._fetchFromSource(source, commodity)
          if (price) {
            prices.push(price)
            this._incrementRateLimit(source)
          }
        }
      } catch (error) {
        this.fastify.log.warn(`Source ${source} failed, continuing:`, error)
      }
    }
    
    if (prices.length === 0) {
      return null
    }
    
    // If only one price, return it
    if (prices.length === 1) {
      return { ...prices[0], isAggregated: false }
    }
    
    // Calculate weighted average based on confidence scores
    let totalWeight = 0
    let weightedSum = 0
    
    for (const price of prices) {
      const weight = price.confidence / 100
      weightedSum += price.price_usd * weight
      totalWeight += weight
    }
    
    const aggregatedPrice = weightedSum / totalWeight
    const avgConfidence = prices.reduce((sum, p) => sum + p.confidence, 0) / prices.length
    
    return {
      commodity,
      price_usd: aggregatedPrice,
      source: prices[0].source, // Primary source
      confidence: Math.min(avgConfidence * 1.1, 100), // Boost confidence for multi-source
      timestamp: new Date(),
      isAggregated: true,
      fallbackUsed: false
    }
  }
  
  /**
   * Batch fetch prices for multiple commodities
   */
  async getBatchPrices(commodities: string[]): Promise<Map<string, OrchestratedPrice>> {
    const results = new Map<string, OrchestratedPrice>()
    
    // Process in parallel with Promise.allSettled
    const promises = commodities.map(async (commodity) => {
      const price = await this.getPrice(commodity)
      return { commodity, price }
    })
    
    const settled = await Promise.allSettled(promises)
    
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.price) {
        results.set(result.value.commodity, result.value.price)
      }
    }
    
    return results
  }
  
  /**
   * Get price priority order for a commodity
   */
  private _getPriorityOrder(commodity: string): string[] {
    const upperCommodity = commodity.toUpperCase()
    
    // Check predefined routing
    if (upperCommodity in this.COMMODITY_ROUTING) {
      return [...this.COMMODITY_ROUTING[upperCommodity as keyof typeof this.COMMODITY_ROUTING]]
    }
    
    // Default fallback order
    return ['fred']
  }
  
  /**
   * Fetch price from specific source
   */
  private async _fetchFromSource(
    source: string,
    commodity: string
  ): Promise<OrchestratedPrice | null> {
    switch (source) {
      case 'chainlink':
        return await this._fetchFromChainlink(commodity)
      
      case 'cme':
        return await this._fetchFromCME(commodity)
      
      case 'lme':
        return await this._fetchFromLME(commodity)
      
      case 'ice':
        return await this._fetchFromICE(commodity)
      
      case 'precious-metals':
        return await this._fetchFromPreciousMetals(commodity)
      
      case 'fred':
        return await this._fetchFromFRED(commodity)
      
      default:
        return null
    }
  }
  
  /**
   * Fetch from Chainlink (via database cache)
   */
  private async _fetchFromChainlink(commodity: string): Promise<OrchestratedPrice | null> {
    const { data, error } = await this.supabase
      .from('commodity_prices')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('oracle_source', 'chainlink')
      .eq('commodity_type', commodity.toUpperCase())
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) return null
    
    // Check staleness (Chainlink should be < 30 minutes old)
    const ageMinutes = (Date.now() - new Date(data.timestamp).getTime()) / 60000
    if (ageMinutes > 30) return null
    
    return {
      commodity: data.commodity_type,
      price_usd: data.price_usd,
      source: 'chainlink',
      confidence: data.confidence_score || 100,
      timestamp: new Date(data.timestamp),
      isAggregated: false,
      fallbackUsed: false
    }
  }
  
  /**
   * Fetch from CME
   */
  private async _fetchFromCME(commodity: string): Promise<OrchestratedPrice | null> {
    if (!this.cmeService) return null
    
    // Map commodity to CME product code
    const productCode = this._mapToCMECode(commodity)
    if (!productCode) return null
    
    const priceData = await this.cmeService.getCurrentPrice(productCode)
    if (!priceData) return null
    
    return {
      commodity: priceData.commodity_type,
      price_usd: priceData.price_usd,
      source: 'cme',
      confidence: 95,
      timestamp: priceData.timestamp,
      isAggregated: false,
      fallbackUsed: false
    }
  }
  
  /**
   * Fetch from LME
   */
  private async _fetchFromLME(commodity: string): Promise<OrchestratedPrice | null> {
    if (!this.lmeService) return null
    
    const metal = this._mapToLMEMetal(commodity)
    if (!metal) return null
    
    const priceData = await this.lmeService.getMetalPrice(metal as any)
    if (!priceData) return null
    
    return {
      commodity: priceData.metal,
      price_usd: priceData.price_usd_per_tonne,
      source: 'lme',
      confidence: priceData.confidence,
      timestamp: priceData.timestamp,
      isAggregated: false,
      fallbackUsed: false
    }
  }
  
  /**
   * Fetch from ICE
   */
  private async _fetchFromICE(commodity: string): Promise<OrchestratedPrice | null> {
    if (!this.iceService) return null
    
    const iceCommodity = this._mapToICECommodity(commodity)
    if (!iceCommodity) return null
    
    const priceData = await this.iceService.getCommodityPrice(iceCommodity as any)
    if (!priceData) return null
    
    return {
      commodity: priceData.commodity,
      price_usd: priceData.price_usd,
      source: 'ice',
      confidence: priceData.confidence,
      timestamp: priceData.timestamp,
      isAggregated: false,
      fallbackUsed: false
    }
  }
  
  /**
   * Fetch from Precious Metals Service
   */
  private async _fetchFromPreciousMetals(commodity: string): Promise<OrchestratedPrice | null> {
    if (!this.preciousMetalsService) return null
    
    const metal = this._mapToPreciousMetal(commodity)
    if (!metal) return null
    
    try {
      const priceData = await this.preciousMetalsService.getSpotPrice(metal)
      if (!priceData) return null
      
      return {
        commodity: priceData.metal,
        price_usd: priceData.price_usd,
        source: 'precious-metals',
        confidence: priceData.confidence,
        timestamp: priceData.timestamp,
        isAggregated: false,
        fallbackUsed: false
      }
    } catch (error) {
      this.fastify.log.warn(`Precious metals service failed for ${commodity}:`, error)
      return null
    }
  }
  
  /**
   * Fetch from FRED
   */
  private async _fetchFromFRED(commodity: string): Promise<OrchestratedPrice | null> {
    const priceData = await this.fredService.fetchCurrentPrice(commodity)
    if (!priceData) return null
    
    return {
      commodity: priceData.commodity,
      price_usd: priceData.price,
      source: 'fred',
      confidence: priceData.confidence,
      timestamp: priceData.timestamp,
      isAggregated: false,
      fallbackUsed: false
    }
  }
  
  /**
   * Rate limiting
   */
  private _checkRateLimit(source: string): boolean {
    const limits: Record<string, number> = {
      chainlink: 1000,       // No real limit (cached)
      cme: 100,              // Conservative
      lme: 200,              // 10k/month ~= 300/day
      ice: 250,              // Free tier
      'precious-metals': 500, // metals.live: 30K/month ~= 1K/day
      fred: 1000             // No real limit
    }
    
    const limit = limits[source] || 100
    const now = Date.now()
    const hourInMs = 3600000
    
    const entry = this.requestCounts.get(source)
    
    if (!entry || now > entry.resetTime) {
      // New hour, reset counter
      this.requestCounts.set(source, {
        count: 0,
        resetTime: now + hourInMs
      })
      return true
    }
    
    return entry.count < limit
  }
  
  private _incrementRateLimit(source: string): void {
    const entry = this.requestCounts.get(source)
    if (entry) {
      entry.count++
    }
  }
  
  /**
   * Commodity mapping helpers
   */
  private _mapToCMECode(commodity: string): string | null {
    const mapping: Record<string, string> = {
      WTI_CRUDE_OIL: 'CL',
      BRENT_CRUDE_OIL: 'BZ',
      NATURAL_GAS: 'NG',
      CORN: 'ZC',
      WHEAT: 'ZW',
      SOYBEANS: 'ZS',
      GOLD: 'GC',
      SILVER: 'SI',
      COPPER: 'HG'
    }
    return mapping[commodity.toUpperCase()] || null
  }
  
  private _mapToLMEMetal(commodity: string): string | null {
    const mapping: Record<string, string> = {
      COPPER: 'COPPER',
      ALUMINUM: 'ALUMINUM',
      ZINC: 'ZINC',
      NICKEL: 'NICKEL',
      LEAD: 'LEAD',
      TIN: 'TIN'
    }
    return mapping[commodity.toUpperCase()] || null
  }
  
  private _mapToICECommodity(commodity: string): string | null {
    const mapping: Record<string, string> = {
      COFFEE_ARABICA: 'COFFEE_ARABICA',
      COCOA: 'COCOA',
      COTTON: 'COTTON',
      SUGAR_11: 'SUGAR_11',
      ORANGE_JUICE: 'ORANGE_JUICE'
    }
    return mapping[commodity.toUpperCase()] || null
  }
  
  private _mapToPreciousMetal(commodity: string): 'gold' | 'silver' | 'platinum' | 'palladium' | null {
    const mapping: Record<string, 'gold' | 'silver' | 'platinum' | 'palladium'> = {
      GOLD: 'gold',
      SILVER: 'silver',
      PLATINUM: 'platinum',
      PALLADIUM: 'palladium'
    }
    return mapping[commodity.toUpperCase()] || null
  }
}

/**
 * Factory function
 */
export function createPriceOrchestrator(
  fastify: FastifyInstance,
  projectId: string
): PriceOrchestrator {
  return new PriceOrchestrator(
    fastify.supabase,
    projectId,
    fastify
  )
}
