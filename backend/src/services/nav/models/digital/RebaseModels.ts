/**
 * Rebase Models
 * Supply adjustment and rebase event handling for elastic supply tokens
 * As per NAV Pricing - Digital Asset Products specification
 */

import { Decimal } from 'decimal.js'

/**
 * Rebase event data
 */
export interface RebaseEvent {
  timestamp: Date
  supplyBefore: Decimal
  supplyAfter: Decimal
  rebaseFactor: Decimal
  priceTarget: Decimal
  priceActual: Decimal
  success: boolean
}

/**
 * Supply elasticity parameters
 */
export interface ElasticityParams {
  targetPrice: Decimal
  currentPrice: Decimal
  currentSupply: Decimal
  dampingFactor: Decimal
  minRebase: Decimal
  maxRebase: Decimal
}

/**
 * Rebase history analysis
 */
export interface RebaseAnalysis {
  totalRebases: number
  positiveRebases: number
  negativeRebases: number
  averageRebaseFactor: Decimal
  volatility: Decimal
  trend: 'expanding' | 'contracting' | 'stable'
  healthScore: Decimal
}

/**
 * RebaseModels class
 * Handles rebasing mechanics for elastic supply tokens
 */
export class RebaseModels {
  private readonly DEFAULT_DAMPING = new Decimal(0.1) // 10% damping
  private readonly MIN_REBASE = new Decimal(-0.99) // Maximum 99% contraction
  private readonly MAX_REBASE = new Decimal(10) // Maximum 10x expansion
  private readonly REBASE_THRESHOLD = new Decimal(0.005) // 0.5% price deviation threshold
  
  /**
   * Calculate rebase factor based on price deviation
   * Spec: "Post-Rebase Balance = Pre-Rebase Balance * (Target Price / Current Price)"
   * 
   * @param targetPrice - Target peg price
   * @param currentPrice - Current market price
   * @param dampingFactor - Damping to smooth adjustments
   * @returns Rebase factor to apply to supply
   */
  public calculateRebaseFactor(
    targetPrice: number,
    currentPrice: number,
    dampingFactor: number = 0.1
  ): Decimal {
    const targetDecimal = new Decimal(targetPrice)
    const currentDecimal = new Decimal(currentPrice)
    const dampingDecimal = new Decimal(Math.min(Math.max(dampingFactor, 0), 1))
    
    // Avoid division by zero
    if (currentDecimal.isZero()) {
      return new Decimal(1)
    }
    
    // Calculate price deviation ratio
    const deviationRatio = targetDecimal.dividedBy(currentDecimal).minus(1)
    
    // Apply damping to smooth the adjustment
    const dampedAdjustment = deviationRatio.times(dampingDecimal)
    
    // Calculate rebase factor (1 + dampedAdjustment)
    let rebaseFactor = new Decimal(1).plus(dampedAdjustment)
    
    // Apply constraints
    rebaseFactor = Decimal.max(rebaseFactor, new Decimal(1).plus(this.MIN_REBASE))
    rebaseFactor = Decimal.min(rebaseFactor, new Decimal(1).plus(this.MAX_REBASE))
    
    return rebaseFactor
  }

  /**
   * Apply rebase to token balance
   * Spec: "Daily rebases; no mint/burn needed for peg"
   * 
   * @param balance - Current token balance
   * @param rebaseFactor - Rebase factor to apply
   * @returns New balance after rebase
   */
  public applyRebase(balance: number, rebaseFactor: number): Decimal {
    const balanceDecimal = new Decimal(balance)
    const factorDecimal = new Decimal(rebaseFactor)
    
    // New balance = old balance * rebase factor
    const newBalance = balanceDecimal.times(factorDecimal)
    
    // Ensure non-negative balance
    return Decimal.max(newBalance, new Decimal(0))
  }

  /**
   * Calculate elastic supply adjustment
   * Spec: "Incorporate on-chain rebase events; adjust for supply elasticity"
   * 
   * @param params - Elasticity parameters
   * @returns New supply and rebase details
   */
  public calculateElasticSupply(params: {
    targetPrice: number
    currentPrice: number
    currentSupply: number
    dampingFactor?: number
    minRebase?: number
    maxRebase?: number
  }): {
    newSupply: Decimal
    rebaseFactor: Decimal
    percentageChange: Decimal
    shouldRebase: boolean
  } {
    const targetDecimal = new Decimal(params.targetPrice)
    const currentDecimal = new Decimal(params.currentPrice)
    const supplyDecimal = new Decimal(params.currentSupply)
    const dampingDecimal = new Decimal(params.dampingFactor || 0.1)
    const minRebaseDecimal = new Decimal(params.minRebase || -0.99)
    const maxRebaseDecimal = new Decimal(params.maxRebase || 10)
    
    // Calculate price deviation
    const deviation = currentDecimal.minus(targetDecimal).dividedBy(targetDecimal).abs()
    
    // Check if rebase is needed (exceeds threshold)
    const shouldRebase = deviation.greaterThan(this.REBASE_THRESHOLD)
    
    if (!shouldRebase) {
      return {
        newSupply: supplyDecimal,
        rebaseFactor: new Decimal(1),
        percentageChange: new Decimal(0),
        shouldRebase: false
      }
    }
    
    // Calculate rebase factor
    const rebaseFactor = this.calculateRebaseFactor(
      params.targetPrice,
      params.currentPrice,
      dampingDecimal.toNumber()
    )
    
    // Calculate new supply
    const newSupply = supplyDecimal.times(rebaseFactor)
    
    // Calculate percentage change
    const percentageChange = rebaseFactor.minus(1).times(100)
    
    return {
      newSupply,
      rebaseFactor,
      percentageChange,
      shouldRebase: true
    }
  }

  /**
   * Simulate rebase events over time
   * Used for testing and analysis
   * 
   * @param initialSupply - Starting supply
   * @param priceHistory - Historical price data
   * @param targetPrice - Target peg price
   * @param dampingFactor - Damping factor
   * @returns Rebase event history
   */
  public simulateRebaseHistory(
    initialSupply: number,
    priceHistory: number[],
    targetPrice: number,
    dampingFactor: number = 0.1
  ): RebaseEvent[] {
    const events: RebaseEvent[] = []
    let currentSupply = new Decimal(initialSupply)
    const targetDecimal = new Decimal(targetPrice)
    
    for (let i = 0; i < priceHistory.length; i++) {
      const price = priceHistory[i]
      if (!price) continue
      
      const currentPrice = new Decimal(price)
      const supplyBefore = currentSupply
      
      // Calculate rebase
      const result = this.calculateElasticSupply({
        targetPrice,
        currentPrice: currentPrice.toNumber(),
        currentSupply: currentSupply.toNumber(),
        dampingFactor
      })
      
      if (result.shouldRebase) {
        currentSupply = result.newSupply
        
        events.push({
          timestamp: new Date(Date.now() - (priceHistory.length - i) * 86400000), // Daily rebases
          supplyBefore,
          supplyAfter: result.newSupply,
          rebaseFactor: result.rebaseFactor,
          priceTarget: targetDecimal,
          priceActual: currentPrice,
          success: true
        })
      }
    }
    
    return events
  }

  /**
   * Analyze rebase history for patterns and health
   * 
   * @param events - Historical rebase events
   * @returns Analysis of rebase patterns
   */
  public analyzeRebaseHistory(events: RebaseEvent[]): RebaseAnalysis {
    if (events.length === 0) {
      return {
        totalRebases: 0,
        positiveRebases: 0,
        negativeRebases: 0,
        averageRebaseFactor: new Decimal(1),
        volatility: new Decimal(0),
        trend: 'stable',
        healthScore: new Decimal(100)
      }
    }
    
    const positiveRebases = events.filter(e => e.rebaseFactor.greaterThan(1)).length
    const negativeRebases = events.filter(e => e.rebaseFactor.lessThan(1)).length
    
    // Calculate average rebase factor
    const totalFactor = events.reduce(
      (sum, e) => sum.plus(e.rebaseFactor),
      new Decimal(0)
    )
    const averageRebaseFactor = totalFactor.dividedBy(events.length)
    
    // Calculate volatility (standard deviation of rebase factors)
    const variance = events.reduce((sum, e) => {
      const diff = e.rebaseFactor.minus(averageRebaseFactor)
      return sum.plus(diff.pow(2))
    }, new Decimal(0)).dividedBy(events.length)
    const volatility = variance.sqrt()
    
    // Determine trend
    let trend: 'expanding' | 'contracting' | 'stable'
    if (positiveRebases > negativeRebases * 1.5) {
      trend = 'expanding'
    } else if (negativeRebases > positiveRebases * 1.5) {
      trend = 'contracting'
    } else {
      trend = 'stable'
    }
    
    // Calculate health score (0-100)
    let healthScore = new Decimal(100)
    
    // Penalize high volatility
    healthScore = healthScore.minus(volatility.times(50))
    
    // Penalize extreme trend
    if (trend !== 'stable') {
      const imbalance = new Decimal(Math.abs(positiveRebases - negativeRebases))
        .dividedBy(events.length)
      healthScore = healthScore.minus(imbalance.times(30))
    }
    
    // Penalize frequent rebases
    const rebaseFrequency = new Decimal(events.length).dividedBy(30) // Assume 30-day period
    if (rebaseFrequency.greaterThan(0.5)) {
      healthScore = healthScore.minus(rebaseFrequency.minus(0.5).times(20))
    }
    
    healthScore = Decimal.max(healthScore, new Decimal(0))
    healthScore = Decimal.min(healthScore, new Decimal(100))
    
    return {
      totalRebases: events.length,
      positiveRebases,
      negativeRebases,
      averageRebaseFactor,
      volatility,
      trend,
      healthScore
    }
  }

  /**
   * Calculate portfolio impact of rebase
   * For users holding rebasing tokens
   * 
   * @param holdings - Token holdings by address
   * @param rebaseFactor - Rebase factor to apply
   * @returns Updated holdings after rebase
   */
  public calculatePortfolioImpact(
    holdings: Map<string, number>,
    rebaseFactor: number
  ): Map<string, Decimal> {
    const factorDecimal = new Decimal(rebaseFactor)
    const updatedHoldings = new Map<string, Decimal>()
    
    for (const [address, balance] of holdings) {
      const balanceDecimal = new Decimal(balance)
      const newBalance = balanceDecimal.times(factorDecimal)
      updatedHoldings.set(address, newBalance)
    }
    
    return updatedHoldings
  }

  /**
   * Determine optimal damping factor
   * Based on market conditions and volatility
   * 
   * @param priceVolatility - Recent price volatility
   * @param supplyVolatility - Recent supply volatility
   * @param targetStability - Desired stability level (0-1)
   * @returns Optimal damping factor
   */
  public calculateOptimalDamping(
    priceVolatility: number,
    supplyVolatility: number,
    targetStability: number = 0.8
  ): Decimal {
    const priceVolDecimal = new Decimal(priceVolatility)
    const supplyVolDecimal = new Decimal(supplyVolatility)
    const targetDecimal = new Decimal(Math.min(Math.max(targetStability, 0), 1))
    
    // Base damping increases with volatility
    const baseDamping = priceVolDecimal.plus(supplyVolDecimal).dividedBy(2)
    
    // Adjust based on target stability
    const adjustedDamping = baseDamping.times(targetDecimal)
    
    // Constrain to reasonable range (5% to 50%)
    const minDamping = new Decimal(0.05)
    const maxDamping = new Decimal(0.5)
    
    let optimalDamping = adjustedDamping
    optimalDamping = Decimal.max(optimalDamping, minDamping)
    optimalDamping = Decimal.min(optimalDamping, maxDamping)
    
    return optimalDamping
  }
}

// Export singleton instance
export const rebaseModels = new RebaseModels()
