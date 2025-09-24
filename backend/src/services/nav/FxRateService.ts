/**
 * FxRateService - Foreign Exchange Rate Service
 * 
 * Handles:
 * - Real-time FX rate fetching from database
 * - Currency conversion calculations
 * - Rate caching and staleness validation
 * - Multi-currency NAV calculations
 */

import { Decimal } from 'decimal.js'
import { createDatabaseService } from './DatabaseService'

export interface FxRate {
  baseCurrency: string
  quoteCurrency: string
  rate: Decimal
  asOf: Date
  source: string
  isStale: boolean
}

export interface ConversionResult {
  originalAmount: Decimal
  originalCurrency: string
  convertedAmount: Decimal
  targetCurrency: string
  fxRate: Decimal
  conversionTimestamp: Date
  source: string
}

export interface FxRateServiceOptions {
  maxStalenessMinutes: number
  enableFallbackToInverse: boolean
  enableCrossCurrencyRouting: boolean
}

/**
 * Production-ready FX Rate Service
 * Replaces hardcoded FX rates with database-driven calculations
 */
export class FxRateService {
  private options: FxRateServiceOptions
  private rateCache: Map<string, FxRate>
  private databaseService: any

  constructor(options: Partial<FxRateServiceOptions> = {}) {
    this.options = {
      maxStalenessMinutes: 60, // 1 hour max staleness
      enableFallbackToInverse: true,
      enableCrossCurrencyRouting: true,
      ...options
    }
    this.rateCache = new Map()
    this.databaseService = createDatabaseService()
  }

  /**
   * Get FX rate between two currencies
   * Replaces hardcoded 1.0 in NavService
   */
  async getFxRate(fromCurrency: string, toCurrency: string): Promise<FxRate> {
    // Same currency - rate is 1.0
    if (fromCurrency === toCurrency) {
      return {
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
        rate: new Decimal(1.0),
        asOf: new Date(),
        source: 'direct',
        isStale: false
      }
    }

    const cacheKey = `${fromCurrency}/${toCurrency}`
    
    // Check cache first
    const cached = this.rateCache.get(cacheKey)
    if (cached && !this.isRateStale(cached)) {
      return cached
    }

    // Try direct rate lookup
    try {
      const directRate = await this.getDirectRate(fromCurrency, toCurrency)
      if (directRate) {
        this.rateCache.set(cacheKey, directRate)
        return directRate
      }
    } catch (error) {
      console.warn(`Direct FX rate lookup failed for ${cacheKey}:`, error)
    }

    // Try inverse rate if enabled
    if (this.options.enableFallbackToInverse) {
      try {
        const inverseRate = await this.getInverseRate(fromCurrency, toCurrency)
        if (inverseRate) {
          this.rateCache.set(cacheKey, inverseRate)
          return inverseRate
        }
      } catch (error) {
        console.warn(`Inverse FX rate lookup failed for ${cacheKey}:`, error)
      }
    }

    // Try cross-currency routing via USD if enabled
    if (this.options.enableCrossCurrencyRouting && 
        fromCurrency !== 'USD' && toCurrency !== 'USD') {
      try {
        const crossRate = await this.getCrossRate(fromCurrency, toCurrency)
        if (crossRate) {
          this.rateCache.set(cacheKey, crossRate)
          return crossRate
        }
      } catch (error) {
        console.warn(`Cross-currency FX rate lookup failed for ${cacheKey}:`, error)
      }
    }

    // All methods failed
    throw new Error(`Unable to find FX rate for ${fromCurrency} to ${toCurrency}`)
  }

  /**
   * Convert amount from one currency to another
   * Used by NavService for accurate currency conversions
   */
  async convertAmount(
    amount: number | Decimal, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<ConversionResult> {
    const originalAmount = new Decimal(amount)
    
    const fxRate = await this.getFxRate(fromCurrency, toCurrency)
    const convertedAmount = originalAmount.mul(fxRate.rate)

    return {
      originalAmount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      fxRate: fxRate.rate,
      conversionTimestamp: new Date(),
      source: fxRate.source
    }
  }

  /**
   * Get batch FX rates for multiple currency pairs
   * Optimized for NAV calculations with multiple currencies
   */
  async getBatchFxRates(pairs: Array<{from: string, to: string}>): Promise<Map<string, FxRate>> {
    const results = new Map<string, FxRate>()
    
    // Process in parallel for better performance
    const promises = pairs.map(async (pair) => {
      try {
        const rate = await this.getFxRate(pair.from, pair.to)
        const key = `${pair.from}/${pair.to}`
        results.set(key, rate)
      } catch (error) {
        console.error(`Failed to get FX rate for ${pair.from}/${pair.to}:`, error)
        // Don't throw - allow other rates to succeed
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  /**
   * Validate if FX rates are fresh enough for NAV calculations
   */
  public validateRateFreshness(rate: FxRate): { isValid: boolean; ageMinutes: number } {
    const ageMinutes = (Date.now() - rate.asOf.getTime()) / (60 * 1000)
    return {
      isValid: ageMinutes <= this.options.maxStalenessMinutes,
      ageMinutes: Math.round(ageMinutes)
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get direct FX rate from database
   */
  private async getDirectRate(fromCurrency: string, toCurrency: string): Promise<FxRate | null> {
    try {
      const fxData = await this.databaseService.getFxRate(fromCurrency, toCurrency)
      
      if (!fxData) {
        return null
      }

      const rate: FxRate = {
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
        rate: new Decimal(fxData.rate),
        asOf: new Date(fxData.as_of),
        source: fxData.source || 'database',
        isStale: this.isRateStale({
          asOf: new Date(fxData.as_of)
        } as FxRate)
      }

      return rate
    } catch (error) {
      console.error(`Database FX lookup failed for ${fromCurrency}/${toCurrency}:`, error)
      return null
    }
  }

  /**
   * Get inverse rate (e.g., EUR/USD from USD/EUR)
   */
  private async getInverseRate(fromCurrency: string, toCurrency: string): Promise<FxRate | null> {
    const inverseRate = await this.getDirectRate(toCurrency, fromCurrency)
    
    if (!inverseRate) {
      return null
    }

    // Invert the rate
    return {
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      rate: new Decimal(1).div(inverseRate.rate),
      asOf: inverseRate.asOf,
      source: `inverse_${inverseRate.source}`,
      isStale: inverseRate.isStale
    }
  }

  /**
   * Get cross rate via USD (e.g., EUR/GBP via EUR/USD and USD/GBP)
   */
  private async getCrossRate(fromCurrency: string, toCurrency: string): Promise<FxRate | null> {
    try {
      const fromUsdRate = await this.getDirectRate(fromCurrency, 'USD')
      const toUsdRate = await this.getDirectRate(toCurrency, 'USD')

      if (!fromUsdRate || !toUsdRate) {
        return null
      }

      // Cross rate calculation
      const crossRate = fromUsdRate.rate.div(toUsdRate.rate)
      const olderTimestamp = fromUsdRate.asOf < toUsdRate.asOf ? fromUsdRate.asOf : toUsdRate.asOf

      return {
        baseCurrency: fromCurrency,
        quoteCurrency: toCurrency,
        rate: crossRate,
        asOf: olderTimestamp,
        source: `cross_${fromUsdRate.source}_${toUsdRate.source}`,
        isStale: fromUsdRate.isStale || toUsdRate.isStale
      }
    } catch (error) {
      console.error(`Cross-currency calculation failed for ${fromCurrency}/${toCurrency}:`, error)
      return null
    }
  }

  /**
   * Check if rate is stale based on configuration
   */
  private isRateStale(rate: FxRate): boolean {
    const ageMinutes = (Date.now() - rate.asOf.getTime()) / (60 * 1000)
    return ageMinutes > this.options.maxStalenessMinutes
  }

  /**
   * Clear rate cache (useful for testing or forced refresh)
   */
  public clearCache(): void {
    this.rateCache.clear()
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): { size: number; staleEntries: number } {
    const staleEntries = Array.from(this.rateCache.values())
      .filter(rate => this.isRateStale(rate)).length

    return {
      size: this.rateCache.size,
      staleEntries
    }
  }
}

/**
 * Factory function to create FxRateService with default configuration
 */
export function createFxRateService(): FxRateService {
  return new FxRateService({
    maxStalenessMinutes: 60, // 1 hour for NAV calculations
    enableFallbackToInverse: true,
    enableCrossCurrencyRouting: true
  })
}

/**
 * Utility function to normalize currency codes
 */
export function normalizeCurrencyCode(currency: string): string {
  return currency.toUpperCase().trim()
}
