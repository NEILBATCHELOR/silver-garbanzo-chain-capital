/**
 * Premium/Discount Monitor Service
 * 
 * Monitors ETF premium/discount against NAV and generates alerts
 * when thresholds are exceeded. Provides historical trend analysis
 * and arbitrage opportunity detection.
 * 
 * Key Features:
 * - Real-time premium/discount monitoring
 * - Threshold-based alerting
 * - Historical trend analysis
 * - Arbitrage opportunity detection
 * - Statistical analysis (volatility, mean reversion)
 * 
 * Following ZERO HARDCODED VALUES principle - all thresholds from config
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'

export interface PremiumDiscountAlert {
  etfId: string
  etfTicker: string
  alertType: 'premium_exceeded' | 'discount_exceeded' | 'volatility_high' | 'arbitrage_opportunity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentPremiumDiscountPct: Decimal
  threshold: Decimal
  message: string
  recommendation: string
  detectedAt: Date
  metrics: {
    nav: Decimal
    marketPrice: Decimal
    deviationAmount: Decimal
    deviationPct: Decimal
    historicalAverage?: Decimal
    standardDeviation?: Decimal
    zScore?: number
  }
}

export interface PremiumDiscountTrend {
  etfId: string
  etfTicker: string
  periodDays: number
  analysis: {
    average: Decimal
    median: Decimal
    stdDev: Decimal
    min: Decimal
    max: Decimal
    volatility: number
    trendDirection: 'widening' | 'narrowing' | 'stable'
    meanReversion: boolean
  }
  dataPoints: {
    date: Date
    premiumDiscountPct: Decimal
    nav: Decimal
    marketPrice: Decimal
  }[]
  alerts: PremiumDiscountAlert[]
}

export interface MonitoringConfig {
  // Alert thresholds (all in percentage points)
  premiumThreshold: number      // e.g., 1.0 = alert when premium > 1%
  discountThreshold: number      // e.g., 1.0 = alert when discount < -1%
  volatilityThreshold: number    // e.g., 0.5 = alert when daily volatility > 0.5%
  
  // Arbitrage opportunity detection
  arbitrageMinSpread: number     // e.g., 0.5 = min 0.5% spread for arbitrage
  arbitrageMinDuration: number   // e.g., 3 = spread must persist for 3 days
  
  // Statistical analysis
  lookbackPeriodDays: number     // e.g., 30 = analyze last 30 days
  zScoreThreshold: number        // e.g., 2.0 = alert when > 2 std deviations
  
  // Mean reversion detection
  meanReversionWindowDays: number // e.g., 5 = check if reverting over 5 days
}

export class PremiumDiscountMonitor {
  private readonly dbClient: SupabaseClient
  private readonly config: MonitoringConfig
  
  constructor(
    dbClient: SupabaseClient,
    config?: Partial<MonitoringConfig>
  ) {
    this.dbClient = dbClient
    
    // Default configuration (can be overridden)
    this.config = {
      premiumThreshold: config?.premiumThreshold ?? 1.0,
      discountThreshold: config?.discountThreshold ?? 1.0,
      volatilityThreshold: config?.volatilityThreshold ?? 0.5,
      arbitrageMinSpread: config?.arbitrageMinSpread ?? 0.5,
      arbitrageMinDuration: config?.arbitrageMinDuration ?? 3,
      lookbackPeriodDays: config?.lookbackPeriodDays ?? 30,
      zScoreThreshold: config?.zScoreThreshold ?? 2.0,
      meanReversionWindowDays: config?.meanReversionWindowDays ?? 5
    }
  }
  
  /**
   * Check if premium/discount exceeds configured thresholds
   * Returns alert if threshold exceeded, null otherwise
   */
  async checkPremiumDiscountAlert(
    etfId: string,
    customThresholds?: { premiumThreshold?: number; discountThreshold?: number }
  ): Promise<PremiumDiscountAlert | null> {
    
    try {
      // Fetch latest NAV data for ETF
      const { data: latestNav, error } = await this.dbClient
        .from('etf_products_with_latest_nav')
        .select('*')
        .eq('id', etfId)
        .single()
      
      if (error || !latestNav) {
        console.error(`Failed to fetch latest NAV for ETF ${etfId}:`, error)
        return null
      }
      
      // Check if we have both NAV and market price
      if (!latestNav.nav_per_share || !latestNav.market_price) {
        console.warn(`ETF ${etfId} missing NAV or market price - cannot check premium/discount`)
        return null
      }
      
      const nav = new Decimal(latestNav.nav_per_share)
      const marketPrice = new Decimal(latestNav.market_price)
      const premiumDiscountPct = new Decimal(latestNav.premium_discount_pct || 0)
      
      // Use custom thresholds if provided, otherwise use config
      const premiumThreshold = customThresholds?.premiumThreshold ?? this.config.premiumThreshold
      const discountThreshold = customThresholds?.discountThreshold ?? this.config.discountThreshold
      
      // Check if premium exceeds threshold
      if (premiumDiscountPct.greaterThan(premiumThreshold)) {
        return this.createAlert(
          latestNav,
          'premium_exceeded',
          this.calculateSeverity(premiumDiscountPct, new Decimal(premiumThreshold)),
          premiumDiscountPct,
          new Decimal(premiumThreshold),
          nav,
          marketPrice,
          `ETF trading at ${premiumDiscountPct.toFixed(2)}% premium, exceeds threshold of ${premiumThreshold}%`,
          'Consider selling ETF shares and buying underlying securities for arbitrage opportunity'
        )
      }
      
      // Check if discount exceeds threshold (discount is negative)
      if (premiumDiscountPct.lessThan(-discountThreshold)) {
        return this.createAlert(
          latestNav,
          'discount_exceeded',
          this.calculateSeverity(premiumDiscountPct.abs(), new Decimal(discountThreshold)),
          premiumDiscountPct,
          new Decimal(-discountThreshold),
          nav,
          marketPrice,
          `ETF trading at ${premiumDiscountPct.toFixed(2)}% discount, exceeds threshold of ${discountThreshold}%`,
          'Consider buying ETF shares and selling underlying securities for arbitrage opportunity'
        )
      }
      
      // No threshold exceeded
      return null
      
    } catch (error) {
      console.error('Error checking premium/discount alert:', error)
      return null
    }
  }
  
  /**
   * Get historical premium/discount trend analysis
   * Provides statistical analysis and trend detection
   */
  async getPremiumDiscountTrend(
    etfId: string,
    days?: number
  ): Promise<PremiumDiscountTrend | null> {
    
    const lookbackDays = days ?? this.config.lookbackPeriodDays
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
    
    try {
      // Fetch historical NAV data
      const { data: navHistory, error } = await this.dbClient
        .from('etf_nav_history')
        .select('*')
        .eq('fund_product_id', etfId)
        .gte('valuation_date', cutoffDate.toISOString())
        .order('valuation_date', { ascending: true })
      
      if (error || !navHistory || navHistory.length === 0) {
        console.error(`Failed to fetch NAV history for ETF ${etfId}:`, error)
        return null
      }
      
      // Get ETF product info
      const { data: product } = await this.dbClient
        .from('fund_products')
        .select('fund_ticker')
        .eq('id', etfId)
        .single()
      
      // Extract data points with premium/discount
      const dataPoints = navHistory
        .filter(nav => nav.nav_per_share && nav.market_price && nav.premium_discount_pct !== null)
        .map(nav => ({
          date: new Date(nav.valuation_date),
          premiumDiscountPct: new Decimal(nav.premium_discount_pct),
          nav: new Decimal(nav.nav_per_share),
          marketPrice: new Decimal(nav.market_price)
        }))
      
      if (dataPoints.length === 0) {
        console.warn(`No valid data points for ETF ${etfId} premium/discount trend`)
        return null
      }
      
      // Calculate statistical metrics
      const premiumDiscountValues = dataPoints.map(dp => dp.premiumDiscountPct)
      const analysis = this.calculateStatistics(premiumDiscountValues)
      
      // Detect alerts based on statistical analysis
      const alerts = await this.detectStatisticalAlerts(
        etfId,
        product?.fund_ticker || 'UNKNOWN',
        dataPoints,
        analysis
      )
      
      return {
        etfId,
        etfTicker: product?.fund_ticker || 'UNKNOWN',
        periodDays: lookbackDays,
        analysis,
        dataPoints,
        alerts
      }
      
    } catch (error) {
      console.error('Error getting premium/discount trend:', error)
      return null
    }
  }
  
  /**
   * Detect arbitrage opportunities
   * Identifies sustained premium/discount spreads suitable for arbitrage
   */
  async detectArbitrageOpportunities(
    etfId: string
  ): Promise<PremiumDiscountAlert[]> {
    
    const alerts: PremiumDiscountAlert[] = []
    
    try {
      // Fetch recent NAV data (lookback period for arbitrage detection)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.arbitrageMinDuration)
      
      const { data: navHistory, error } = await this.dbClient
        .from('etf_nav_history')
        .select('*')
        .eq('fund_product_id', etfId)
        .gte('valuation_date', cutoffDate.toISOString())
        .order('valuation_date', { ascending: false })
      
      if (error || !navHistory || navHistory.length < this.config.arbitrageMinDuration) {
        return alerts
      }
      
      // Get ETF product info
      const { data: product } = await this.dbClient
        .from('fund_products')
        .select('fund_ticker')
        .eq('id', etfId)
        .single()
      
      // Check if spread has persisted for minimum duration
      const recentData = navHistory.slice(0, this.config.arbitrageMinDuration)
      const allAboveThreshold = recentData.every(nav => 
        nav.premium_discount_pct && 
        Math.abs(nav.premium_discount_pct) >= this.config.arbitrageMinSpread
      )
      
      if (allAboveThreshold) {
        const latestNav = recentData[0]
        const premiumDiscountPct = new Decimal(latestNav.premium_discount_pct || 0)
        const nav = new Decimal(latestNav.nav_per_share || 0)
        const marketPrice = new Decimal(latestNav.market_price || 0)
        
        const alert = this.createAlert(
          latestNav,
          'arbitrage_opportunity',
          'high',
          premiumDiscountPct,
          new Decimal(this.config.arbitrageMinSpread),
          nav,
          marketPrice,
          `Sustained ${premiumDiscountPct.greaterThan(0) ? 'premium' : 'discount'} of ${premiumDiscountPct.abs().toFixed(2)}% for ${this.config.arbitrageMinDuration} days`,
          `Potential arbitrage opportunity - spread has persisted for ${this.config.arbitrageMinDuration} days`
        )
        
        alerts.push(alert)
      }
      
      return alerts
      
    } catch (error) {
      console.error('Error detecting arbitrage opportunities:', error)
      return alerts
    }
  }
  
  /**
   * Calculate statistical metrics for premium/discount data
   */
  private calculateStatistics(values: Decimal[]): PremiumDiscountTrend['analysis'] {
    
    if (values.length === 0) {
      return {
        average: new Decimal(0),
        median: new Decimal(0),
        stdDev: new Decimal(0),
        min: new Decimal(0),
        max: new Decimal(0),
        volatility: 0,
        trendDirection: 'stable',
        meanReversion: false
      }
    }
    
    // Calculate average
    const sum = values.reduce((acc, val) => acc.plus(val), new Decimal(0))
    const average = sum.div(values.length)
    
    // Calculate median
    const sorted = [...values].sort((a, b) => a.comparedTo(b))
    const median = values.length % 2 === 0
      ? (sorted[values.length / 2 - 1]?.plus(sorted[values.length / 2] || new Decimal(0)) || new Decimal(0)).div(2)
      : (sorted[Math.floor(values.length / 2)] || new Decimal(0))
    
    // Calculate standard deviation
    const squaredDiffs = values.map(val => val.minus(average).pow(2))
    const variance = squaredDiffs.reduce((acc, val) => acc.plus(val), new Decimal(0)).div(values.length)
    const stdDev = new Decimal(Math.sqrt(variance.toNumber()))
    
    // Calculate volatility (coefficient of variation)
    const volatility = average.eq(0) ? 0 : stdDev.div(average.abs()).toNumber()
    
    // Find min and max (safe access with fallback to 0)
    const min = sorted[0] ?? new Decimal(0)
    const max = sorted[sorted.length - 1] ?? new Decimal(0)
    
    // Detect trend direction (compare first half to second half)
    const halfPoint = Math.floor(values.length / 2)
    const firstHalfAvg = values.slice(0, halfPoint).reduce((acc, val) => acc.plus(val), new Decimal(0)).div(halfPoint)
    const secondHalfAvg = values.slice(halfPoint).reduce((acc, val) => acc.plus(val), new Decimal(0)).div(values.length - halfPoint)
    
    let trendDirection: 'widening' | 'narrowing' | 'stable' = 'stable'
    const trendDiff = secondHalfAvg.minus(firstHalfAvg).abs()
    if (trendDiff.greaterThan(0.1)) {
      trendDirection = secondHalfAvg.greaterThan(firstHalfAvg) ? 'widening' : 'narrowing'
    }
    
    // Detect mean reversion (are recent values closer to average than earlier ones?)
    const meanReversion = this.detectMeanReversion(values, average)
    
    return {
      average,
      median,
      stdDev,
      min,
      max,
      volatility,
      trendDirection,
      meanReversion
    }
  }
  
  /**
   * Detect mean reversion in premium/discount data
   */
  private detectMeanReversion(values: Decimal[], average: Decimal): boolean {
    if (values.length < this.config.meanReversionWindowDays) {
      return false
    }
    
    // Compare recent values to average vs earlier values
    const recentWindow = values.slice(-this.config.meanReversionWindowDays)
    const earlierWindow = values.slice(0, this.config.meanReversionWindowDays)
    
    const recentAvgDeviation = recentWindow
      .map(val => val.minus(average).abs())
      .reduce((acc, val) => acc.plus(val), new Decimal(0))
      .div(recentWindow.length)
    
    const earlierAvgDeviation = earlierWindow
      .map(val => val.minus(average).abs())
      .reduce((acc, val) => acc.plus(val), new Decimal(0))
      .div(earlierWindow.length)
    
    // Mean reversion if recent deviation is significantly less than earlier
    return recentAvgDeviation.lessThan(earlierAvgDeviation.times(0.7))
  }
  
  /**
   * Detect statistical alerts (volatility, z-score)
   */
  private async detectStatisticalAlerts(
    etfId: string,
    etfTicker: string,
    dataPoints: PremiumDiscountTrend['dataPoints'],
    analysis: PremiumDiscountTrend['analysis']
  ): Promise<PremiumDiscountAlert[]> {
    
    const alerts: PremiumDiscountAlert[] = []
    
    if (dataPoints.length === 0) return alerts
    
    const latestPoint = dataPoints[dataPoints.length - 1]
    if (!latestPoint) return alerts // Safety check
    
    // Check for high volatility
    if (analysis.volatility > this.config.volatilityThreshold) {
      alerts.push({
        etfId,
        etfTicker,
        alertType: 'volatility_high',
        severity: 'medium',
        currentPremiumDiscountPct: latestPoint.premiumDiscountPct,
        threshold: new Decimal(this.config.volatilityThreshold),
        message: `Premium/discount volatility is ${(analysis.volatility * 100).toFixed(2)}%, exceeds threshold`,
        recommendation: 'Monitor closely - high volatility may indicate pricing inefficiencies or arbitrage opportunities',
        detectedAt: new Date(),
        metrics: {
          nav: latestPoint.nav,
          marketPrice: latestPoint.marketPrice,
          deviationAmount: latestPoint.marketPrice.minus(latestPoint.nav),
          deviationPct: latestPoint.premiumDiscountPct,
          historicalAverage: analysis.average,
          standardDeviation: analysis.stdDev,
          zScore: latestPoint.premiumDiscountPct.minus(analysis.average).div(analysis.stdDev).toNumber()
        }
      })
    }
    
    // Check for extreme z-score (statistical outlier)
    const zScore = latestPoint.premiumDiscountPct.minus(analysis.average).div(analysis.stdDev)
    if (zScore.abs().greaterThan(this.config.zScoreThreshold)) {
      alerts.push({
        etfId,
        etfTicker,
        alertType: zScore.greaterThan(0) ? 'premium_exceeded' : 'discount_exceeded',
        severity: zScore.abs().greaterThan(3) ? 'critical' : 'high',
        currentPremiumDiscountPct: latestPoint.premiumDiscountPct,
        threshold: analysis.average.plus(analysis.stdDev.times(this.config.zScoreThreshold)),
        message: `Premium/discount is ${zScore.abs().toFixed(2)} standard deviations from average`,
        recommendation: 'Statistical outlier detected - investigate potential pricing error or market dislocation',
        detectedAt: new Date(),
        metrics: {
          nav: latestPoint.nav,
          marketPrice: latestPoint.marketPrice,
          deviationAmount: latestPoint.marketPrice.minus(latestPoint.nav),
          deviationPct: latestPoint.premiumDiscountPct,
          historicalAverage: analysis.average,
          standardDeviation: analysis.stdDev,
          zScore: zScore.toNumber()
        }
      })
    }
    
    return alerts
  }
  
  /**
   * Create alert object
   */
  private createAlert(
    latestNav: any,
    alertType: PremiumDiscountAlert['alertType'],
    severity: PremiumDiscountAlert['severity'],
    currentPremiumDiscountPct: Decimal,
    threshold: Decimal,
    nav: Decimal,
    marketPrice: Decimal,
    message: string,
    recommendation: string
  ): PremiumDiscountAlert {
    
    return {
      etfId: latestNav.id,
      etfTicker: latestNav.fund_ticker || 'UNKNOWN',
      alertType,
      severity,
      currentPremiumDiscountPct,
      threshold,
      message,
      recommendation,
      detectedAt: new Date(),
      metrics: {
        nav,
        marketPrice,
        deviationAmount: marketPrice.minus(nav),
        deviationPct: currentPremiumDiscountPct
      }
    }
  }
  
  /**
   * Calculate severity based on how much threshold is exceeded
   */
  private calculateSeverity(
    actualValue: Decimal,
    threshold: Decimal
  ): PremiumDiscountAlert['severity'] {
    
    const ratio = actualValue.div(threshold)
    
    if (ratio.greaterThanOrEqualTo(3)) return 'critical'
    if (ratio.greaterThanOrEqualTo(2)) return 'high'
    if (ratio.greaterThanOrEqualTo(1.5)) return 'medium'
    return 'low'
  }
}

/**
 * Factory function to create monitor with optional custom config
 */
export function createPremiumDiscountMonitor(
  dbClient: SupabaseClient,
  config?: Partial<MonitoringConfig>
): PremiumDiscountMonitor {
  return new PremiumDiscountMonitor(dbClient, config)
}
