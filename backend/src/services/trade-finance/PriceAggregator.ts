/**
 * Price Aggregator Service - Supabase Edge Function Version
 * 
 * Purpose: Fetch commodity prices via Supabase Edge Function (FRED proxy)
 * Edge Function: https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy
 * 
 * Features:
 * - Uses Supabase Edge Function instead of direct FRED API calls
 * - No CORS issues (handled by edge function)
 * - Centralized error handling
 * - Rate limiting handled at edge function level
 */

import { FastifyInstance } from 'fastify'
import { FRED_COMMODITY_SERIES, getFREDSeriesId, isCommoditySupported } from './FREDSeriesMapping'

export interface FREDObservation {
  date: string
  value: string
  realtime_start: string
  realtime_end: string
}

export interface FREDResponse {
  observations: FREDObservation[]
  count: number
  offset: number
  limit: number
}

export interface EdgeFunctionResponse {
  success: boolean
  data: FREDResponse
  source: string
  timestamp: string
  error?: string
}

export interface CommodityPriceData {
  commodity_type: string
  price_usd: number
  timestamp: Date
  source: string
  confidence_score: number
  volume?: number
}

export class PriceAggregator {
  private fredApiKey: string
  private edgeFunctionUrl: string
  private supabase: any
  private projectId: string

  constructor(
    fredApiKey: string,
    supabase: any,
    projectId: string,
    edgeFunctionUrl: string = 'https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy'
  ) {
    if (!fredApiKey) {
      throw new Error('FRED API key is required. Use: 2f9410eb4d82bffc020c077ef79259e3')
    }
    this.fredApiKey = fredApiKey
    this.supabase = supabase
    this.projectId = projectId
    this.edgeFunctionUrl = edgeFunctionUrl
  }

  /**
   * Call Supabase Edge Function to fetch FRED data
   */
  private async callEdgeFunction(
    endpoint: string,
    params: Record<string, any>
  ): Promise<EdgeFunctionResponse> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          provider: 'fred',
          endpoint,
          params: {
            ...params,
            api_key: this.fredApiKey,
            file_type: 'json'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Edge function error: ${response.status} ${response.statusText}`)
      }

      const result: EdgeFunctionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Edge function returned error')
      }

      return result
    } catch (error) {
      console.error('Edge function call failed:', error)
      throw error
    }
  }

  /**
   * Fetch current price for a commodity via Edge Function
   */
  async fetchCurrentPrice(commodityType: string): Promise<CommodityPriceData | null> {
    if (!isCommoditySupported(commodityType)) {
      throw new Error(
        `Unknown commodity type: ${commodityType}. ` +
        `Supported: ${Object.keys(FRED_COMMODITY_SERIES).join(', ')}`
      )
    }

    try {
      const seriesId = getFREDSeriesId(commodityType)

      // Call edge function to get latest observation
      const result = await this.callEdgeFunction('series/observations', {
        series_id: seriesId,
        sort_order: 'desc',
        limit: 1
      })

      const observations = result.data.observations

      if (!observations || observations.length === 0) {
        console.warn(`No data available for ${commodityType} (${seriesId})`)
        return null
      }

      const observation = observations[0]
      
      if (!observation) {
        console.warn(`No observation data for ${commodityType}`)
        return null
      }
      
      const priceValue = parseFloat(observation.value)

      if (isNaN(priceValue) || observation.value === '.') {
        console.warn(`Invalid price value for ${commodityType}: ${observation.value}`)
        return null
      }

      return {
        commodity_type: commodityType.toUpperCase(),
        price_usd: priceValue,
        timestamp: new Date(observation.date),
        source: 'FRED',
        confidence_score: 100 // FRED is highly reliable
      }
    } catch (error) {
      console.error(`Error fetching price for ${commodityType}:`, error)
      throw error
    }
  }

  /**
   * Fetch historical prices via Edge Function
   */
  async fetchHistoricalPrices(
    commodityType: string,
    startDate: string,
    endDate: string,
    limit: number = 1000
  ): Promise<CommodityPriceData[]> {
    if (!isCommoditySupported(commodityType)) {
      throw new Error(`Unknown commodity type: ${commodityType}`)
    }

    try {
      const seriesId = getFREDSeriesId(commodityType)

      // Call edge function to get historical observations
      const result = await this.callEdgeFunction('series/observations', {
        series_id: seriesId,
        observation_start: startDate,
        observation_end: endDate,
        limit,
        sort_order: 'asc'
      })

      return result.data.observations
        .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
        .map(obs => ({
          commodity_type: commodityType.toUpperCase(),
          price_usd: parseFloat(obs.value),
          timestamp: new Date(obs.date),
          source: 'FRED',
          confidence_score: 100
        }))
    } catch (error) {
      console.error(`Error fetching historical prices for ${commodityType}:`, error)
      throw error
    }
  }

  /**
   * Update price in database
   */
  async updatePriceInDatabase(priceData: CommodityPriceData): Promise<void> {
    const { error } = await this.supabase
      .from('commodity_prices')
      .insert({
        project_id: this.projectId,
        commodity_type: priceData.commodity_type,
        price_usd: priceData.price_usd,
        oracle_source: priceData.source,
        confidence_score: priceData.confidence_score,
        volume: priceData.volume,
        timestamp: priceData.timestamp.toISOString()
      })

    if (error) {
      throw new Error(`Failed to update price in database: ${error.message}`)
    }
  }

  /**
   * Update all supported commodity prices
   */
  async updateAllPrices(): Promise<{
    success: string[]
    failed: string[]
  }> {
    const commodities = Object.keys(FRED_COMMODITY_SERIES)
    const success: string[] = []
    const failed: string[] = []

    for (const commodity of commodities) {
      try {
        const priceData = await this.fetchCurrentPrice(commodity)
        
        if (priceData) {
          await this.updatePriceInDatabase(priceData)
          success.push(commodity)
          console.log(`✓ Updated ${commodity}: $${priceData.price_usd}`)
        } else {
          failed.push(commodity)
          console.warn(`✗ No data available for ${commodity}`)
        }
        
        // Rate limiting: Wait 500ms between requests (FRED limit: 120 requests/minute)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        failed.push(commodity)
        console.error(`✗ Failed to update ${commodity}:`, error)
      }
    }

    return { success, failed }
  }

  /**
   * Get latest price from database (cached)
   */
  async getLatestPriceFromDatabase(commodityType: string): Promise<CommodityPriceData | null> {
    const { data, error } = await this.supabase
      .from('commodity_prices')
      .select('*')
      .eq('commodity_type', commodityType.toUpperCase())
      .eq('project_id', this.projectId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return {
      commodity_type: data.commodity_type,
      price_usd: data.price_usd,
      timestamp: new Date(data.timestamp),
      source: data.oracle_source,
      confidence_score: data.confidence_score,
      volume: data.volume
    }
  }

  /**
   * Get price with auto-update if stale
   */
  async getPriceWithAutoUpdate(
    commodityType: string,
    maxAgeMinutes: number = 60
  ): Promise<CommodityPriceData> {
    // Check database first
    const cachedPrice = await this.getLatestPriceFromDatabase(commodityType)

    if (cachedPrice) {
      const ageMinutes = (Date.now() - cachedPrice.timestamp.getTime()) / 60000
      
      if (ageMinutes < maxAgeMinutes) {
        return cachedPrice
      }
    }

    // Price is stale or doesn't exist, fetch from FRED via edge function
    const freshPrice = await this.fetchCurrentPrice(commodityType)
    
    if (!freshPrice) {
      // If edge function fails, return cached price if available
      if (cachedPrice) {
        console.warn(`Using stale cached price for ${commodityType} (${Math.floor((Date.now() - cachedPrice.timestamp.getTime()) / 60000)} minutes old)`)
        return cachedPrice
      }
      throw new Error(`No price data available for ${commodityType}`)
    }

    // Update database
    await this.updatePriceInDatabase(freshPrice)
    
    return freshPrice
  }

  /**
   * Batch fetch and store historical prices
   */
  async batchLoadHistoricalPrices(
    commodities: string[],
    startDate: string,
    endDate: string
  ): Promise<{
    success: string[]
    failed: string[]
    totalPricesLoaded: number
  }> {
    const success: string[] = []
    const failed: string[] = []
    let totalPricesLoaded = 0

    for (const commodity of commodities) {
      try {
        const prices = await this.fetchHistoricalPrices(commodity, startDate, endDate)
        
        // Batch insert all prices
        for (const priceData of prices) {
          await this.updatePriceInDatabase(priceData)
          totalPricesLoaded++
        }
        
        success.push(commodity)
        console.log(`✓ Loaded ${prices.length} historical prices for ${commodity}`)
        
        // Rate limiting: Wait 1 second between commodity batches
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        failed.push(commodity)
        console.error(`✗ Failed to load historical prices for ${commodity}:`, error)
      }
    }

    return { success, failed, totalPricesLoaded }
  }
}

/**
 * Create PriceAggregator instance from Fastify instance
 */
export function createPriceAggregator(
  fastify: FastifyInstance,
  projectId: string
): PriceAggregator {
  // Use the API key from environment
  const fredApiKey = process.env.FRED_API_KEY || '2f9410eb4d82bffc020c077ef79259e3'

  return new PriceAggregator(fredApiKey, fastify.supabase, projectId)
}
