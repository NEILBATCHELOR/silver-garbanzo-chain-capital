/**
 * Benchmark Data Service - ZERO HARDCODED VALUES
 * 
 * Fetches benchmark index data for tracking error calculation
 * All mappings from database: benchmark_index_mappings table
 * NO FALLBACKS - throws error if data unavailable
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BenchmarkReturn {
  date: Date
  value: number
  return: number // % return for the period
  returnDecimal: Decimal
}

export interface BenchmarkDataRequest {
  benchmarkIndex: string
  startDate: Date
  endDate: Date
  frequency?: 'daily' | 'weekly' | 'monthly'
}

export interface BenchmarkDataResult {
  benchmarkIndex: string
  returns: BenchmarkReturn[]
  metadata: {
    source: string
    fetchedAt: Date
    totalReturns: number
    annualizedReturn: number
    volatility: number
    sharpeRatio?: number
  }
}

export interface BenchmarkDataServiceConfig {
  supabaseClient: SupabaseClient
  supabaseUrl: string
  supabaseAnonKey: string
  projectId?: string
}

interface BenchmarkMapping {
  benchmarkName: string
  tickerSymbol: string
  provider: string
  assetClass: string
}

// =====================================================
// BENCHMARK DATA SERVICE - ZERO FALLBACKS
// =====================================================

export class BenchmarkDataService {
  private readonly config: BenchmarkDataServiceConfig
  private readonly benchmarkCache: Map<string, { data: BenchmarkDataResult; cachedAt: number }> = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour
  
  // Database-backed configuration (loaded on demand)
  private benchmarkMappings: Map<string, BenchmarkMapping> = new Map()
  private configLoaded = false
  
  constructor(config: BenchmarkDataServiceConfig) {
    if (!config.supabaseClient) {
      throw new Error('Supabase client is required - NO FALLBACKS ALLOWED')
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('Supabase URL and anon key required for edge functions')
    }
    
    this.config = config
  }
  
  /**
   * Load benchmark mappings from database
   * REQUIRED before any operations
   */
  private async loadConfiguration(): Promise<void> {
    if (this.configLoaded) return
    
    try {
      const { data, error } = await this.config.supabaseClient
        .from('benchmark_index_mappings')
        .select('*')
        .eq('is_active', true)
      
      if (error) {
        throw new Error(`Failed to load benchmark mappings: ${error.message}`)
      }
      
      if (!data || data.length === 0) {
        throw new Error('No benchmark index mappings configured in database. Add to benchmark_index_mappings table')
      }
      
      data.forEach((mapping: any) => {
        this.benchmarkMappings.set(mapping.benchmark_name.toLowerCase(), {
          benchmarkName: mapping.benchmark_name,
          tickerSymbol: mapping.ticker_symbol,
          provider: mapping.provider,
          assetClass: mapping.asset_class
        })
      })
      
      this.configLoaded = true
      console.log('✅ Benchmark mappings loaded from database')
      console.log(`  - ${this.benchmarkMappings.size} benchmarks configured`)
    } catch (error) {
      console.error('Failed to load benchmark mappings:', error)
      throw new Error('CRITICAL: Benchmark data service cannot operate without database configuration')
    }
  }
  
  /**
   * Get benchmark returns for tracking error calculation
   * NO FALLBACKS - throws error if data unavailable
   */
  async getBenchmarkReturns(request: BenchmarkDataRequest): Promise<BenchmarkDataResult> {
    await this.loadConfiguration()
    
    // Check cache
    const cacheKey = this.buildCacheKey(request)
    const cached = this.benchmarkCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      console.log(`📦 Cache hit for benchmark ${request.benchmarkIndex}`)
      return cached.data
    }
    
    // Get mapping from database
    const mapping = this.benchmarkMappings.get(request.benchmarkIndex.toLowerCase())
    if (!mapping) {
      throw new Error(
        `No ticker mapping found for benchmark: ${request.benchmarkIndex}. ` +
        `Add to benchmark_index_mappings table. NO FALLBACK AVAILABLE`
      )
    }
    
    // Fetch data based on provider
    let result: BenchmarkDataResult
    
    switch (mapping.provider) {
      case 'yahoo_finance':
        result = await this.getYahooBenchmarkData(mapping.tickerSymbol, request)
        break
      case 'alphavantage':
        result = await this.getAlphaVantageBenchmarkData(mapping.tickerSymbol, request)
        break
      case 'fred':
        result = await this.getFREDBenchmarkData(mapping.tickerSymbol, request)
        break
      default:
        throw new Error(`Unsupported provider: ${mapping.provider}`)
    }
    
    // Cache result
    this.benchmarkCache.set(cacheKey, {
      data: result,
      cachedAt: Date.now()
    })
    
    return result
  }
  
  /**
   * Get current benchmark value
   * NO FALLBACKS
   */
  async getCurrentBenchmarkValue(benchmarkIndex: string): Promise<number> {
    await this.loadConfiguration()
    
    const mapping = this.benchmarkMappings.get(benchmarkIndex.toLowerCase())
    if (!mapping) {
      throw new Error(`No mapping for benchmark: ${benchmarkIndex}. Add to benchmark_index_mappings table`)
    }
    
    if (mapping.provider === 'yahoo_finance') {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${mapping.tickerSymbol}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          }
        )
        
        if (!response.ok) {
          throw new Error(`Yahoo Finance failed: ${response.status}`)
        }
        
        const data = await response.json()
        const quote = data.quoteResponse?.result?.[0]
        
        if (quote && quote.regularMarketPrice) {
          return quote.regularMarketPrice
        }
      } catch (error) {
        throw new Error(
          `Failed to fetch current value for ${benchmarkIndex}: ${error instanceof Error ? error.message : 'Unknown'}. NO FALLBACK`
        )
      }
    }
    
    throw new Error(`Current value fetch not implemented for provider: ${mapping.provider}. NO FALLBACK`)
  }
  
  /**
   * Fetch benchmark data from Yahoo Finance
   */
  private async getYahooBenchmarkData(
    symbol: string,
    request: BenchmarkDataRequest
  ): Promise<BenchmarkDataResult> {
    
    const period1 = Math.floor(request.startDate.getTime() / 1000)
    const period2 = Math.floor(request.endDate.getTime() / 1000)
    
    const interval = request.frequency === 'monthly' ? '1mo' 
      : request.frequency === 'weekly' ? '1wk' 
      : '1d'
    
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&includeAdjustedClose=true`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance failed: ${response.status}`)
      }
      
      const data = await response.json()
      const result = data.chart?.result?.[0]
      
      if (!result) {
        throw new Error(`No data available for ${symbol}`)
      }
      
      const timestamps = result.timestamp || []
      const closes = result.indicators?.quote?.[0]?.close || []
      
      // Calculate returns
      const returns: BenchmarkReturn[] = []
      for (let i = 1; i < timestamps.length && i < closes.length; i++) {
        const prevClose = closes[i - 1]
        const currentClose = closes[i]
        
        if (prevClose && currentClose && !isNaN(prevClose) && !isNaN(currentClose)) {
          const return_ = ((currentClose - prevClose) / prevClose) * 100
          
          returns.push({
            date: new Date(timestamps[i]! * 1000),
            value: currentClose,
            return: return_,
            returnDecimal: new Decimal(return_)
          })
        }
      }
      
      if (returns.length === 0) {
        throw new Error(`No valid returns calculated for ${symbol}`)
      }
      
      // Calculate metadata
      const totalReturn = returns.reduce((sum, r) => sum + r.return, 0)
      const avgReturn = totalReturn / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r.return - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance)
      const annualizedReturn = avgReturn * 252 // Assuming daily returns
      
      return {
        benchmarkIndex: request.benchmarkIndex,
        returns,
        metadata: {
          source: 'Yahoo Finance',
          fetchedAt: new Date(),
          totalReturns: totalReturn,
          annualizedReturn,
          volatility
        }
      }
    } catch (error) {
      throw new Error(
        `Yahoo Finance fetch failed for ${symbol}: ${error instanceof Error ? error.message : 'Unknown'}. NO FALLBACK`
      )
    }
  }
  
  /**
   * Fetch benchmark data from Alpha Vantage via edge function
   */
  private async getAlphaVantageBenchmarkData(
    symbol: string,
    request: BenchmarkDataRequest
  ): Promise<BenchmarkDataResult> {
    
    try {
      const response = await fetch(`${this.config.supabaseUrl}/functions/v1/market-data-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          provider: 'alphavantage',
          endpoint: 'query',
          params: {
            function: 'TIME_SERIES_DAILY_ADJUSTED',
            symbol,
            outputsize: 'full'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage edge function failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Alpha Vantage error')
      }
      
      const timeSeries = result.data['Time Series (Daily)']
      if (!timeSeries) {
        throw new Error(`No time series data for ${symbol}`)
      }
      
      // Filter by date range and calculate returns
      const returns: BenchmarkReturn[] = []
      const dates = Object.keys(timeSeries).sort()
      
      for (let i = 1; i < dates.length; i++) {
        const date = new Date(dates[i]!)
        if (date < request.startDate || date > request.endDate) continue
        
        const prevDate = dates[i - 1]
        if (!prevDate) continue
        
        const prevClose = parseFloat(timeSeries[prevDate]['5. adjusted close'])
        const currentClose = parseFloat(timeSeries[dates[i]!]['5. adjusted close'])
        
        if (!isNaN(prevClose) && !isNaN(currentClose)) {
          const return_ = ((currentClose - prevClose) / prevClose) * 100
          
          returns.push({
            date,
            value: currentClose,
            return: return_,
            returnDecimal: new Decimal(return_)
          })
        }
      }
      
      if (returns.length === 0) {
        throw new Error(`No valid returns calculated for ${symbol}`)
      }
      
      // Calculate metadata
      const totalReturn = returns.reduce((sum, r) => sum + r.return, 0)
      const avgReturn = totalReturn / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r.return - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance)
      const annualizedReturn = avgReturn * 252
      
      return {
        benchmarkIndex: request.benchmarkIndex,
        returns,
        metadata: {
          source: 'Alpha Vantage (via Edge Function)',
          fetchedAt: new Date(),
          totalReturns: totalReturn,
          annualizedReturn,
          volatility
        }
      }
    } catch (error) {
      throw new Error(
        `Alpha Vantage fetch failed: ${error instanceof Error ? error.message : 'Unknown'}. NO FALLBACK`
      )
    }
  }
  
  /**
   * Fetch benchmark data from FRED via edge function
   */
  private async getFREDBenchmarkData(
    series: string,
    request: BenchmarkDataRequest
  ): Promise<BenchmarkDataResult> {
    
    try {
      const startDate = request.startDate.toISOString().split('T')[0]
      const endDate = request.endDate.toISOString().split('T')[0]
      
      const response = await fetch(`${this.config.supabaseUrl}/functions/v1/free-marketdata-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          provider: 'fred',
          endpoint: `series/observations`,
          params: {
            series_id: series,
            observation_start: startDate,
            observation_end: endDate
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`FRED edge function failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'FRED error')
      }
      
      const observations = result.data.observations
      if (!observations || observations.length === 0) {
        throw new Error(`No observations for FRED series: ${series}`)
      }
      
      // Calculate returns
      const returns: BenchmarkReturn[] = []
      for (let i = 1; i < observations.length; i++) {
        const prev = parseFloat(observations[i - 1].value)
        const current = parseFloat(observations[i].value)
        
        if (!isNaN(prev) && !isNaN(current) && prev !== 0) {
          const return_ = ((current - prev) / prev) * 100
          
          returns.push({
            date: new Date(observations[i].date),
            value: current,
            return: return_,
            returnDecimal: new Decimal(return_)
          })
        }
      }
      
      if (returns.length === 0) {
        throw new Error(`No valid returns calculated for FRED series: ${series}`)
      }
      
      // Calculate metadata
      const totalReturn = returns.reduce((sum, r) => sum + r.return, 0)
      const avgReturn = totalReturn / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r.return - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance)
      const annualizedReturn = avgReturn * 252
      
      return {
        benchmarkIndex: request.benchmarkIndex,
        returns,
        metadata: {
          source: 'FRED (via Edge Function)',
          fetchedAt: new Date(),
          totalReturns: totalReturn,
          annualizedReturn,
          volatility
        }
      }
    } catch (error) {
      throw new Error(
        `FRED fetch failed: ${error instanceof Error ? error.message : 'Unknown'}. NO FALLBACK`
      )
    }
  }
  
  /**
   * Build cache key
   */
  private buildCacheKey(request: BenchmarkDataRequest): string {
    return `benchmark:${request.benchmarkIndex}:${request.startDate.toISOString()}:${request.endDate.toISOString()}`
  }
  
  /**
   * Clear cache and force reload
   */
  clearCache(): void {
    this.benchmarkCache.clear()
    this.configLoaded = false
    this.benchmarkMappings.clear()
  }
  
  /**
   * Get all configured benchmarks
   */
  async getSupportedBenchmarks(): Promise<string[]> {
    await this.loadConfiguration()
    return Array.from(this.benchmarkMappings.keys())
  }
}

// Export singleton factory
export function createBenchmarkDataService(config: BenchmarkDataServiceConfig): BenchmarkDataService {
  return new BenchmarkDataService(config)
}