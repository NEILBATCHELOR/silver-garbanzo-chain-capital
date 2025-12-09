/**
 * CME Group Price Service
 * 
 * Integrates with CME Group's WebSocket API for real-time futures prices
 * and REST API for historical data.
 * 
 * Coverage: Agricultural (corn, wheat, soybeans), Energy (oil, gas), Metals
 * Update Frequency: Real-time (500ms conflation)
 * Cost: $23/GB + ILA fees
 * Authentication: API key required
 * 
 * API Documentation: https://www.cmegroup.com/market-data/market-data-api.html
 */

import { FastifyInstance } from 'fastify'
import WebSocket from 'ws'

export interface CMEPriceData {
  symbol: string
  productCode: string
  contractMonth: string
  commodity_type: string
  price_usd: number
  volume: number
  openInterest?: number
  timestamp: Date
  source: string
}

interface CMEWebSocketMessage {
  symbol: string
  productCode: string
  contractMonth: string
  lastPrice: number
  volume: number
  openInterest?: number
  timestamp: string
}

interface CMEHistoricalResponse {
  data: Array<{
    symbol: string
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export class CMEPriceService {
  private ws: WebSocket | null = null
  private apiKey: string
  private wsUrl: string
  private restUrl: string
  private supabase: any
  private projectId: string
  private fastify: FastifyInstance
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000 // 5 seconds
  
  constructor(
    apiKey: string,
    supabase: any,
    projectId: string,
    fastify: FastifyInstance,
    wsUrl: string = 'wss://www.cmegroup.com/market-data/api/v1/stream',
    restUrl: string = 'https://www.cmegroup.com/market-data/api/v1'
  ) {
    this.apiKey = apiKey
    this.supabase = supabase
    this.projectId = projectId
    this.fastify = fastify
    this.wsUrl = wsUrl
    this.restUrl = restUrl
  }
  
  /**
   * Connect to CME WebSocket for real-time prices
   * @param symbols Array of CME symbols to subscribe to
   */
  async connectWebSocket(symbols: string[]): Promise<void> {
    if (this.ws) {
      this.fastify.log.warn('WebSocket already connected')
      return
    }
    
    try {
      this.ws = new WebSocket(this.wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      
      this.ws.on('open', () => {
        this.fastify.log.info('CME WebSocket connected')
        this.reconnectAttempts = 0
        
        // Subscribe to symbols
        if (this.ws && symbols.length > 0) {
          this.ws.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }))
          
          this.fastify.log.info(`Subscribed to ${symbols.length} CME symbols`)
        }
      })
      
      this.ws.on('message', async (data: Buffer) => {
        try {
          const message: CMEWebSocketMessage = JSON.parse(data.toString())
          await this.handlePriceUpdate(message)
        } catch (error) {
          this.fastify.log.error('Error processing CME message:', error)
        }
      })
      
      this.ws.on('error', (error) => {
        this.fastify.log.error('CME WebSocket error:', error)
      })
      
      this.ws.on('close', () => {
        this.fastify.log.warn('CME WebSocket closed')
        this.ws = null
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          this.fastify.log.info(
            `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
          )
          
          setTimeout(() => {
            this.connectWebSocket(symbols)
          }, this.reconnectDelay)
        } else {
          this.fastify.log.error('Max reconnection attempts reached')
        }
      })
      
    } catch (error) {
      this.fastify.log.error('Failed to connect to CME WebSocket:', error)
      throw error
    }
  }
  
  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.fastify.log.info('CME WebSocket disconnected')
    }
  }
  
  /**
   * Fetch historical prices via REST API
   * @param symbol CME symbol (e.g., "CLZ24" for December 2024 WTI Crude)
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   */
  async fetchHistoricalPrices(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<CMEPriceData[]> {
    try {
      const response = await fetch(
        `${this.restUrl}/historical?` +
        `symbol=${symbol}&` +
        `start=${startDate}&` +
        `end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`CME API error: ${response.status} ${response.statusText}`)
      }
      
      const data: CMEHistoricalResponse = await response.json()
      
      return data.data.map(item => ({
        symbol: item.symbol,
        productCode: this._extractProductCode(item.symbol),
        contractMonth: this._extractContractMonth(item.symbol),
        commodity_type: this._mapSymbolToCommodity(item.symbol),
        price_usd: item.close,
        volume: item.volume,
        timestamp: new Date(item.date),
        source: 'CME'
      }))
      
    } catch (error) {
      this.fastify.log.error(`Failed to fetch historical prices for ${symbol}:`, error)
      throw error
    }
  }
  
  /**
   * Get current front-month price for a commodity
   * @param productCode CME product code (e.g., "CL" for WTI Crude)
   */
  async getCurrentPrice(productCode: string): Promise<CMEPriceData | null> {
    try {
      const { data, error } = await this.supabase
        .from('commodity_prices')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('oracle_source', 'CME')
        .like('commodity_type', `%${this._mapProductCodeToCommodity(productCode)}%`)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
      
      if (error || !data) {
        return null
      }
      
      return {
        symbol: data.symbol || productCode,
        productCode: productCode,
        contractMonth: '',
        commodity_type: data.commodity_type,
        price_usd: data.price_usd,
        volume: data.volume || 0,
        timestamp: new Date(data.timestamp),
        source: 'CME'
      }
      
    } catch (error) {
      this.fastify.log.error(`Failed to get current price for ${productCode}:`, error)
      return null
    }
  }
  
  /**
   * Handle incoming WebSocket price update
   */
  private async handlePriceUpdate(message: CMEWebSocketMessage): Promise<void> {
    try {
      const priceData: CMEPriceData = {
        symbol: message.symbol,
        productCode: message.productCode,
        contractMonth: message.contractMonth,
        commodity_type: this._mapSymbolToCommodity(message.symbol),
        price_usd: message.lastPrice,
        volume: message.volume,
        openInterest: message.openInterest,
        timestamp: new Date(message.timestamp),
        source: 'CME'
      }
      
      await this.storePriceData(priceData)
      
      this.fastify.log.debug(
        `Updated CME price: ${priceData.commodity_type} = $${priceData.price_usd}`
      )
      
    } catch (error) {
      this.fastify.log.error('Failed to handle price update:', error)
    }
  }
  
  /**
   * Store price data in database
   */
  private async storePriceData(priceData: CMEPriceData): Promise<void> {
    const { error } = await this.supabase
      .from('commodity_prices')
      .insert({
        project_id: this.projectId,
        commodity_type: priceData.commodity_type,
        price_usd: priceData.price_usd,
        oracle_source: 'CME',
        confidence_score: 95,
        volume: priceData.volume,
        metadata: {
          symbol: priceData.symbol,
          productCode: priceData.productCode,
          contractMonth: priceData.contractMonth,
          openInterest: priceData.openInterest
        },
        timestamp: priceData.timestamp.toISOString()
      })
    
    if (error) {
      this.fastify.log.error('Failed to store CME price:', error)
      throw error
    }
  }
  
  /**
   * Map CME symbol to commodity type
   */
  private _mapSymbolToCommodity(symbol: string): string {
    const productCode = this._extractProductCode(symbol)
    return this._mapProductCodeToCommodity(productCode)
  }
  
  /**
   * Map CME product code to commodity type
   */
  private _mapProductCodeToCommodity(productCode: string): string {
    const mapping: Record<string, string> = {
      // Energy
      'CL': 'WTI_CRUDE_OIL',
      'BZ': 'BRENT_CRUDE_OIL',
      'NG': 'NATURAL_GAS',
      'RB': 'RBOB_GASOLINE',
      'HO': 'HEATING_OIL',
      
      // Agricultural - Grains
      'ZC': 'CORN',
      'ZW': 'WHEAT',
      'ZS': 'SOYBEANS',
      'ZM': 'SOYBEAN_MEAL',
      'ZO': 'OATS',
      'ZR': 'RICE',
      
      // Agricultural - Livestock
      'LE': 'LIVE_CATTLE',
      'GF': 'FEEDER_CATTLE',
      'HE': 'LEAN_HOGS',
      
      // Metals
      'GC': 'GOLD',
      'SI': 'SILVER',
      'HG': 'COPPER',
      'PA': 'PALLADIUM',
      'PL': 'PLATINUM'
    }
    
    return mapping[productCode] || `UNKNOWN_${productCode}`
  }
  
  /**
   * Extract product code from symbol
   * Example: "CLZ24" -> "CL"
   */
  private _extractProductCode(symbol: string): string {
    // CME symbols typically: ProductCode + Month + Year
    // e.g., "CLZ24" = CL (crude) + Z (December) + 24 (2024)
    return symbol.substring(0, 2)
  }
  
  /**
   * Extract contract month from symbol
   * Example: "CLZ24" -> "2024-12"
   */
  private _extractContractMonth(symbol: string): string {
    if (symbol.length < 4) return ''
    
    // Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun,
    //              N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
    const monthCode = symbol[2]
    const year = symbol.substring(3)
    
    const monthMapping: Record<string, string> = {
      'F': '01', 'G': '02', 'H': '03', 'J': '04',
      'K': '05', 'M': '06', 'N': '07', 'Q': '08',
      'U': '09', 'V': '10', 'X': '11', 'Z': '12'
    }
    
    const month = monthMapping[monthCode] || '01'
    const fullYear = `20${year}` // Assuming 20xx
    
    return `${fullYear}-${month}`
  }
  
  /**
   * Get WebSocket connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

/**
 * Factory function to create CME Price Service
 */
export function createCMEPriceService(
  fastify: FastifyInstance,
  projectId: string
): CMEPriceService {
  const apiKey = process.env.CME_API_KEY
  
  if (!apiKey) {
    throw new Error('CME_API_KEY environment variable is required')
  }
  
  return new CMEPriceService(
    apiKey,
    fastify.supabase,
    projectId,
    fastify
  )
}
