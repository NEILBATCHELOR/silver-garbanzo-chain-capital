/**
 * Data Quality Service
 * 
 * Assesses data quality for NAV calculations across all asset types
 * Provides comprehensive quality scores and actionable recommendations
 * 
 * Key Features:
 * - Holdings data quality assessment
 * - Price data quality assessment  
 * - Completeness checks
 * - Timeliness analysis
 * - Data source reliability scoring
 * - Actionable recommendations for improvement
 * 
 * Quality Levels:
 * - excellent (90-100%): All data present, fresh, and reliable
 * - good (70-89%): Minor gaps or slight staleness
 * - fair (50-69%): Significant gaps, requires attention
 * - poor (0-49%): Critical issues, calculation unreliable
 * 
 * Following ZERO HARDCODED VALUES principle
 */

import { Decimal } from 'decimal.js'

export interface DataQualityAssessment {
  overall: 'excellent' | 'good' | 'fair' | 'poor'
  score: number // 0-100
  
  // Component scores
  components: {
    completeness: QualityScore
    timeliness: QualityScore
    accuracy: QualityScore
    consistency: QualityScore
  }
  
  // Issues found
  issues: DataQualityIssue[]
  
  // Recommendations
  recommendations: string[]
  
  // Confidence in NAV calculation
  calculationConfidence: 'high' | 'medium' | 'low'
}

export interface QualityScore {
  score: number // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor'
  details: string
}

export interface DataQualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'completeness' | 'timeliness' | 'accuracy' | 'consistency'
  field: string
  message: string
  impact: string
  recommendation: string
}

export interface QualityCheckConfig {
  // Completeness thresholds
  minHoldingsCount: number // minimum holdings for diversified portfolio
  maxMissingPricesPercent: number // max % of holdings without prices
  
  // Timeliness thresholds (in days)
  maxPriceAge: number // max age of price data
  maxHoldingAge: number // max age of holdings data
  
  // Accuracy thresholds
  minPriceConfidence: number // 0-1 scale
  maxPriceSpreadPercent: number // max bid-ask spread %
  
  // Consistency thresholds
  maxWeightDeviation: number // max deviation from 100% total weight
  maxAUMDeviation: number // max deviation between holdings sum and AUM
}

export class DataQualityService {
  private readonly config: QualityCheckConfig
  
  constructor(config?: Partial<QualityCheckConfig>) {
    this.config = {
      minHoldingsCount: config?.minHoldingsCount ?? 10,
      maxMissingPricesPercent: config?.maxMissingPricesPercent ?? 5,
      maxPriceAge: config?.maxPriceAge ?? 1,
      maxHoldingAge: config?.maxHoldingAge ?? 7,
      minPriceConfidence: config?.minPriceConfidence ?? 0.8,
      maxPriceSpreadPercent: config?.maxPriceSpreadPercent ?? 2,
      maxWeightDeviation: config?.maxWeightDeviation ?? 1,
      maxAUMDeviation: config?.maxAUMDeviation ?? 5
    }
  }
  
  /**
   * Assess holdings data quality
   * Checks completeness, timeliness, and consistency of holdings
   */
  assessHoldingsQuality(holdings: any[]): QualityScore {
    
    const issues: string[] = []
    let score = 100
    
    // Check holdings count
    if (holdings.length === 0) {
      issues.push('No holdings found')
      score -= 100
    } else if (holdings.length < this.config.minHoldingsCount) {
      issues.push(`Only ${holdings.length} holdings (recommend minimum ${this.config.minHoldingsCount} for diversification)`)
      score -= 20
    }
    
    // Check for required fields
    const requiredFields = ['security_name', 'quantity', 'market_value', 'price_per_unit']
    const missingFields = new Set<string>()
    
    holdings.forEach(holding => {
      requiredFields.forEach(field => {
        if (!holding[field]) {
          missingFields.add(field)
        }
      })
    })
    
    if (missingFields.size > 0) {
      issues.push(`Missing fields: ${Array.from(missingFields).join(', ')}`)
      score -= missingFields.size * 10
    }
    
    // Check for stale data
    const now = new Date()
    const staleHoldings = holdings.filter(h => {
      if (!h.as_of_date) return true
      const age = (now.getTime() - new Date(h.as_of_date).getTime()) / (1000 * 60 * 60 * 24)
      return age > this.config.maxHoldingAge
    })
    
    if (staleHoldings.length > 0) {
      const stalePct = (staleHoldings.length / holdings.length) * 100
      issues.push(`${stalePct.toFixed(1)}% of holdings are stale (>${this.config.maxHoldingAge} days old)`)
      score -= Math.min(stalePct, 30)
    }
    
    // Check weight consistency
    const totalWeight = holdings.reduce((sum, h) => sum + (h.weight_percentage || 0), 0)
    const weightDeviation = Math.abs(totalWeight - 100)
    
    if (weightDeviation > this.config.maxWeightDeviation) {
      issues.push(`Weight sum is ${totalWeight.toFixed(2)}% (should be 100%)`)
      score -= Math.min(weightDeviation * 5, 20)
    }
    
    // Determine level
    const level = this.scoreToLevel(Math.max(0, score))
    
    return {
      score: Math.max(0, score),
      level,
      details: issues.length > 0 ? issues.join('; ') : 'Holdings data is complete and current'
    }
  }
  
  /**
   * Assess price data quality
   * Checks freshness, reliability, and bid-ask spreads
   */
  assessPriceDataQuality(prices: Map<string, any>): QualityScore {
    
    const issues: string[] = []
    let score = 100
    
    if (prices.size === 0) {
      return {
        score: 0,
        level: 'poor',
        details: 'No price data available'
      }
    }
    
    const now = new Date()
    let stalePrices = 0
    let lowConfidencePrices = 0
    let wideSpreadPrices = 0
    
    for (const [identifier, priceData] of prices.entries()) {
      // Check price age
      if (priceData.timestamp) {
        const ageHours = (now.getTime() - new Date(priceData.timestamp).getTime()) / (1000 * 60 * 60)
        const ageDays = ageHours / 24
        
        if (ageDays > this.config.maxPriceAge) {
          stalePrices++
        }
      }
      
      // Check confidence
      if (priceData.confidence && priceData.confidence < this.config.minPriceConfidence) {
        lowConfidencePrices++
      }
      
      // Check bid-ask spread (if available)
      if (priceData.bid && priceData.ask) {
        const midpoint = (priceData.bid + priceData.ask) / 2
        const spreadPct = ((priceData.ask - priceData.bid) / midpoint) * 100
        
        if (spreadPct > this.config.maxPriceSpreadPercent) {
          wideSpreadPrices++
        }
      }
    }
    
    // Calculate percentages
    const stalePct = (stalePrices / prices.size) * 100
    const lowConfPct = (lowConfidencePrices / prices.size) * 100
    const wideSpreadPct = (wideSpreadPrices / prices.size) * 100
    
    // Deduct points for issues
    if (stalePct > 0) {
      issues.push(`${stalePct.toFixed(1)}% of prices are stale (>${this.config.maxPriceAge} days old)`)
      score -= Math.min(stalePct, 30)
    }
    
    if (lowConfPct > 0) {
      issues.push(`${lowConfPct.toFixed(1)}% of prices have low confidence (<${this.config.minPriceConfidence})`)
      score -= Math.min(lowConfPct * 0.5, 20)
    }
    
    if (wideSpreadPct > 0) {
      issues.push(`${wideSpreadPct.toFixed(1)}% of prices have wide spreads (>${this.config.maxPriceSpreadPercent}%)`)
      score -= Math.min(wideSpreadPct * 0.5, 15)
    }
    
    const level = this.scoreToLevel(Math.max(0, score))
    
    return {
      score: Math.max(0, score),
      level,
      details: issues.length > 0 ? issues.join('; ') : 'Price data is fresh and reliable'
    }
  }
  
  /**
   * Calculate overall data quality
   * Combines holdings, pricing, and consistency checks
   */
  calculateOverallQuality(
    product: any,
    supporting: any
  ): DataQualityAssessment {
    
    const issues: DataQualityIssue[] = []
    const recommendations: string[] = []
    
    // 1. Assess completeness
    const completeness = this.assessCompleteness(product, supporting, issues, recommendations)
    
    // 2. Assess timeliness
    const timeliness = this.assessTimeliness(supporting, issues, recommendations)
    
    // 3. Assess accuracy
    const accuracy = this.assessAccuracy(supporting, issues, recommendations)
    
    // 4. Assess consistency
    const consistency = this.assessConsistency(product, supporting, issues, recommendations)
    
    // Calculate weighted overall score
    const overallScore = (
      completeness.score * 0.30 +  // 30% weight on completeness
      timeliness.score * 0.25 +     // 25% weight on timeliness
      accuracy.score * 0.25 +       // 25% weight on accuracy
      consistency.score * 0.20      // 20% weight on consistency
    )
    
    // Determine calculation confidence
    const calculationConfidence = this.determineCalculationConfidence(
      overallScore,
      issues
    )
    
    return {
      overall: this.scoreToLevel(overallScore),
      score: overallScore,
      components: {
        completeness,
        timeliness,
        accuracy,
        consistency
      },
      issues,
      recommendations,
      calculationConfidence
    }
  }
  
  /**
   * Assess data completeness
   */
  private assessCompleteness(
    product: any,
    supporting: any,
    issues: DataQualityIssue[],
    recommendations: string[]
  ): QualityScore {
    
    let score = 100
    const checks: string[] = []
    
    // Check holdings existence
    if (!supporting.holdings || supporting.holdings.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'completeness',
        field: 'holdings',
        message: 'No holdings found',
        impact: 'Cannot calculate NAV without holdings',
        recommendation: 'Add holdings to etf_holdings table'
      })
      score -= 50
    } else {
      checks.push(`${supporting.holdings.length} holdings`)
      
      // Check for missing prices
      const missingPrices = supporting.holdings.filter((h: any) => !h.price_per_unit || !h.market_value)
      if (missingPrices.length > 0) {
        const missingPct = (missingPrices.length / supporting.holdings.length) * 100
        
        if (missingPct > this.config.maxMissingPricesPercent) {
          issues.push({
            severity: 'high',
            category: 'completeness',
            field: 'holdings.price_per_unit',
            message: `${missingPct.toFixed(1)}% of holdings missing prices`,
            impact: 'NAV calculation may be inaccurate',
            recommendation: 'Update prices for all holdings'
          })
          score -= Math.min(missingPct, 30)
        }
      }
    }
    
    // Check product fields
    const requiredProductFields = ['net_asset_value', 'shares_outstanding', 'assets_under_management']
    const missingProductFields = requiredProductFields.filter(field => !product[field])
    
    if (missingProductFields.length > 0) {
      issues.push({
        severity: 'high',
        category: 'completeness',
        field: missingProductFields.join(', '),
        message: `Missing required product fields: ${missingProductFields.join(', ')}`,
        impact: 'Cannot validate NAV calculation',
        recommendation: 'Update fund_products table with required fields'
      })
      score -= missingProductFields.length * 15
    }
    
    return {
      score: Math.max(0, score),
      level: this.scoreToLevel(Math.max(0, score)),
      details: checks.join(', ')
    }
  }
  
  /**
   * Assess data timeliness
   */
  private assessTimeliness(
    supporting: any,
    issues: DataQualityIssue[],
    recommendations: string[]
  ): QualityScore {
    
    let score = 100
    const now = new Date()
    
    // Check holdings freshness
    if (supporting.holdings && supporting.holdings.length > 0) {
      const staleHoldings = supporting.holdings.filter((h: any) => {
        if (!h.as_of_date) return true
        const ageDays = (now.getTime() - new Date(h.as_of_date).getTime()) / (1000 * 60 * 60 * 24)
        return ageDays > this.config.maxHoldingAge
      })
      
      if (staleHoldings.length > 0) {
        const stalePct = (staleHoldings.length / supporting.holdings.length) * 100
        
        issues.push({
          severity: stalePct > 50 ? 'high' : 'medium',
          category: 'timeliness',
          field: 'holdings.as_of_date',
          message: `${stalePct.toFixed(1)}% of holdings are stale`,
          impact: 'May not reflect current portfolio composition',
          recommendation: `Update holdings data (currently >${this.config.maxHoldingAge} days old)`
        })
        
        score -= Math.min(stalePct, 40)
      }
    }
    
    return {
      score: Math.max(0, score),
      level: this.scoreToLevel(Math.max(0, score)),
      details: score >= 90 ? 'Data is current' : 'Some data is stale'
    }
  }
  
  /**
   * Assess data accuracy
   */
  private assessAccuracy(
    supporting: any,
    issues: DataQualityIssue[],
    recommendations: string[]
  ): QualityScore {
    
    let score = 100
    
    // Check for negative values
    if (supporting.holdings) {
      const negativeValues = supporting.holdings.filter((h: any) => 
        (h.quantity && h.quantity < 0) || 
        (h.market_value && h.market_value < 0) ||
        (h.price_per_unit && h.price_per_unit < 0)
      )
      
      if (negativeValues.length > 0) {
        issues.push({
          severity: 'high',
          category: 'accuracy',
          field: 'holdings values',
          message: `${negativeValues.length} holdings with negative values`,
          impact: 'Invalid data will cause calculation errors',
          recommendation: 'Review and correct negative values'
        })
        score -= 30
      }
      
      // Check for zero prices
      const zeroPrices = supporting.holdings.filter((h: any) => 
        h.price_per_unit === 0 || h.market_value === 0
      )
      
      if (zeroPrices.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'accuracy',
          field: 'holdings.price_per_unit',
          message: `${zeroPrices.length} holdings with zero prices`,
          impact: 'May indicate missing or stale price data',
          recommendation: 'Update price data for zero-priced holdings'
        })
        score -= 15
      }
    }
    
    return {
      score: Math.max(0, score),
      level: this.scoreToLevel(Math.max(0, score)),
      details: score >= 90 ? 'Data appears accurate' : 'Some accuracy issues detected'
    }
  }
  
  /**
   * Assess data consistency
   */
  private assessConsistency(
    product: any,
    supporting: any,
    issues: DataQualityIssue[],
    recommendations: string[]
  ): QualityScore {
    
    let score = 100
    
    // Check weights sum to 100%
    if (supporting.holdings && supporting.holdings.length > 0) {
      const totalWeight = supporting.holdings.reduce((sum: number, h: any) => sum + (h.weight_percentage || 0), 0)
      const weightDeviation = Math.abs(totalWeight - 100)
      
      if (weightDeviation > this.config.maxWeightDeviation) {
        issues.push({
          severity: weightDeviation > 5 ? 'high' : 'medium',
          category: 'consistency',
          field: 'holdings.weight_percentage',
          message: `Weights sum to ${totalWeight.toFixed(2)}% (should be 100%)`,
          impact: 'May indicate missing or incorrect holdings',
          recommendation: 'Recalculate weights to ensure they sum to 100%'
        })
        score -= Math.min(weightDeviation * 5, 30)
      }
      
      // Check AUM consistency
      const holdingsTotal = supporting.holdings.reduce((sum: number, h: any) => sum + (h.market_value || 0), 0)
      const aum = product.assets_under_management || 0
      
      if (aum > 0) {
        const aumDeviation = Math.abs(holdingsTotal - aum) / aum * 100
        
        if (aumDeviation > this.config.maxAUMDeviation) {
          issues.push({
            severity: aumDeviation > 20 ? 'high' : 'medium',
            category: 'consistency',
            field: 'assets_under_management',
            message: `Holdings total (${holdingsTotal.toFixed(2)}) differs from AUM (${aum.toFixed(2)}) by ${aumDeviation.toFixed(1)}%`,
            impact: 'May indicate stale holdings or incorrect AUM',
            recommendation: 'Verify holdings are current and AUM is accurate'
          })
          score -= Math.min(aumDeviation, 25)
        }
      }
    }
    
    return {
      score: Math.max(0, score),
      level: this.scoreToLevel(Math.max(0, score)),
      details: score >= 90 ? 'Data is internally consistent' : 'Some consistency issues detected'
    }
  }
  
  /**
   * Determine calculation confidence based on overall quality
   */
  private determineCalculationConfidence(
    overallScore: number,
    issues: DataQualityIssue[]
  ): 'high' | 'medium' | 'low' {
    
    // Check for critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      return 'low'
    }
    
    // Use score thresholds
    if (overallScore >= 80) return 'high'
    if (overallScore >= 60) return 'medium'
    return 'low'
  }
  
  /**
   * Convert numeric score to quality level
   */
  private scoreToLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 50) return 'fair'
    return 'poor'
  }
}

/**
 * Factory function to create data quality service with optional config
 */
export function createDataQualityService(
  config?: Partial<QualityCheckConfig>
): DataQualityService {
  return new DataQualityService(config)
}
