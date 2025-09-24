/**
 * Stablecoin Models
 * Comprehensive valuation models for all 5 types of stablecoins
 * As per NAV Pricing - Digital Asset Products specification
 */

import { Decimal } from 'decimal.js'

/**
 * Stablecoin health status interface
 */
export interface StablecoinHealth {
  nav: Decimal
  pegDeviation: Decimal
  isHealthy: boolean
  message: string
}

/**
 * Collateral status for crypto-backed stablecoins
 */
export interface CollateralStatus {
  collateralizationRatio: Decimal
  liquidationPrice: Decimal
  healthFactor: Decimal
  needsLiquidation: boolean
}

/**
 * Supply adjustment for algorithmic stablecoins
 */
export interface SupplyAdjustment {
  supplyAdjustment: Decimal
  newSupply: Decimal
  stabilityMechanism: 'expand' | 'contract' | 'neutral'
  confidence: Decimal
}

/**
 * Rebase result for rebasing stablecoins
 */
export interface RebaseResult {
  postRebaseBalance: Decimal
  rebaseFactor: Decimal
  supplyDelta: Decimal
  isPositive: boolean
}

/**
 * StablecoinModels class
 * Implements valuation logic for all stablecoin types
 */
export class StablecoinModels {
  private readonly PEG_DEVIATION_THRESHOLD = new Decimal(0.02) // 2% deviation threshold
  private readonly MIN_COLLATERAL_RATIO = new Decimal(1.5) // 150% minimum
  private readonly LIQUIDATION_RATIO = new Decimal(1.25) // 125% liquidation threshold

  /**
   * Fiat-Backed Stablecoin Valuation (e.g., USDC, USDT)
   * Spec: "Pegged 1:1 to fiat currencies via reserves held in banks"
   * 
   * @param reserveAssets - Total value of reserve assets (cash, treasuries)
   * @param liabilities - Outstanding liabilities
   * @param supply - Total token supply
   * @param targetPeg - Target peg value (usually 1.0)
   * @returns Stablecoin health status
   */
  public fiatBackedValuation(
    reserveAssets: number,
    liabilities: number,
    supply: number,
    targetPeg: number = 1.0
  ): StablecoinHealth {
    const reserveDecimal = new Decimal(reserveAssets)
    const liabilitiesDecimal = new Decimal(liabilities)
    const supplyDecimal = new Decimal(supply)
    const targetPegDecimal = new Decimal(targetPeg)

    // NAV = (Reserve Assets - Liabilities) / Outstanding Tokens
    const nav = supplyDecimal.isZero() 
      ? new Decimal(0)
      : reserveDecimal.minus(liabilitiesDecimal).dividedBy(supplyDecimal)

    // Calculate peg deviation
    const pegDeviation = nav.minus(targetPegDecimal).abs()
    const deviationPercent = targetPegDecimal.isZero() 
      ? new Decimal(0)
      : pegDeviation.dividedBy(targetPegDecimal)

    // Health check
    const isHealthy = deviationPercent.lessThanOrEqualTo(this.PEG_DEVIATION_THRESHOLD)
    
    const message = isHealthy 
      ? 'Stablecoin is healthy and maintaining peg'
      : `Warning: Peg deviation of ${deviationPercent.times(100).toFixed(2)}% detected`

    return {
      nav,
      pegDeviation,
      isHealthy,
      message
    }
  }

  /**
   * Crypto-Backed Stablecoin Valuation (e.g., DAI)
   * Spec: "Overcollateralized by volatile cryptocurrencies"
   * 
   * @param collateralValue - Current value of crypto collateral
   * @param debt - Outstanding debt/minted stablecoins
   * @param minRatio - Minimum collateralization ratio
   * @param currentPrice - Current stablecoin market price
   * @returns Collateral status and health metrics
   */
  public cryptoBackedValuation(
    collateralValue: number,
    debt: number,
    minRatio: number = 1.5,
    currentPrice: number = 1.0
  ): CollateralStatus {
    const collateralDecimal = new Decimal(collateralValue)
    const debtDecimal = new Decimal(debt)
    const minRatioDecimal = new Decimal(minRatio)
    const currentPriceDecimal = new Decimal(currentPrice)

    // Collateralization ratio = Collateral Value / Debt
    const collateralizationRatio = debtDecimal.isZero()
      ? new Decimal(999) // Max value for no debt
      : collateralDecimal.dividedBy(debtDecimal.times(currentPriceDecimal))

    // Liquidation price = Collateral / (Debt * Liquidation Ratio)
    const liquidationPrice = debtDecimal.isZero()
      ? new Decimal(0)
      : collateralDecimal.dividedBy(debtDecimal.times(this.LIQUIDATION_RATIO))

    // Health factor = Collateral Ratio / Min Ratio
    const healthFactor = collateralizationRatio.dividedBy(minRatioDecimal)
    
    // Check if position needs liquidation
    const needsLiquidation = collateralizationRatio.lessThan(this.LIQUIDATION_RATIO)

    return {
      collateralizationRatio,
      liquidationPrice,
      healthFactor,
      needsLiquidation
    }
  }

  /**
   * Commodity-Backed Stablecoin Valuation (e.g., PAXG - gold)
   * Spec: "Tied to physical assets like gold or silver"
   * 
   * @param commodityReserves - Physical commodity reserves (units)
   * @param spotPrice - Current spot price per unit
   * @param storageCosts - Annual storage costs
   * @param outstandingTokens - Total token supply
   * @param auditConfidence - Confidence in audit (0-1)
   * @returns NAV per token
   */
  public commodityBackedValuation(
    commodityReserves: number,
    spotPrice: number,
    storageCosts: number,
    outstandingTokens: number,
    auditConfidence: number = 1.0
  ): Decimal {
    const reservesDecimal = new Decimal(commodityReserves)
    const spotPriceDecimal = new Decimal(spotPrice)
    const storageDecimal = new Decimal(storageCosts)
    const tokensDecimal = new Decimal(outstandingTokens)
    const confidenceDecimal = new Decimal(Math.min(Math.max(auditConfidence, 0), 1))

    // Total commodity value
    const grossValue = reservesDecimal.times(spotPriceDecimal)
    
    // Adjust for storage costs (annualized)
    const netValue = grossValue.minus(storageDecimal)
    
    // Apply audit confidence factor
    const adjustedValue = netValue.times(confidenceDecimal)
    
    // NAV per token
    const navPerToken = tokensDecimal.isZero()
      ? new Decimal(0)
      : adjustedValue.dividedBy(tokensDecimal)

    return navPerToken
  }

  /**
   * Algorithmic Stablecoin Stabilization (e.g., FRAX, early UST)
   * Spec: "Maintain peg via smart contract algorithms without full backing"
   * 
   * @param currentPrice - Current market price
   * @param targetPeg - Target peg value
   * @param supply - Current supply
   * @param algorithmParams - Algorithm-specific parameters
   * @returns Supply adjustment recommendation
   */
  public algorithmicStabilization(
    currentPrice: number,
    targetPeg: number,
    supply: number,
    algorithmParams: {
      expansionFactor?: number
      contractionFactor?: number
      deadband?: number
      maxAdjustment?: number
    } = {}
  ): SupplyAdjustment {
    const currentPriceDecimal = new Decimal(currentPrice)
    const targetPegDecimal = new Decimal(targetPeg)
    const supplyDecimal = new Decimal(supply)
    
    // Default parameters
    const expansionFactor = new Decimal(algorithmParams.expansionFactor || 0.1)
    const contractionFactor = new Decimal(algorithmParams.contractionFactor || 0.1)
    const deadband = new Decimal(algorithmParams.deadband || 0.005) // 0.5% deadband
    const maxAdjustment = new Decimal(algorithmParams.maxAdjustment || 0.25) // 25% max

    // Calculate price deviation
    const deviation = currentPriceDecimal.minus(targetPegDecimal)
    const deviationRatio = targetPegDecimal.isZero() 
      ? new Decimal(0)
      : deviation.dividedBy(targetPegDecimal)

    let supplyAdjustment: Decimal
    let stabilityMechanism: 'expand' | 'contract' | 'neutral'
    let confidence: Decimal

    // Determine mechanism based on deviation
    if (deviationRatio.abs().lessThan(deadband)) {
      // Within deadband - no adjustment
      supplyAdjustment = new Decimal(0)
      stabilityMechanism = 'neutral'
      confidence = new Decimal(1)
    } else if (deviationRatio.greaterThan(0)) {
      // Price above peg - expand supply
      supplyAdjustment = supplyDecimal.times(deviationRatio.times(expansionFactor))
      stabilityMechanism = 'expand'
      confidence = new Decimal(1).minus(deviationRatio.abs().dividedBy(10)) // Confidence decreases with deviation
    } else {
      // Price below peg - contract supply
      supplyAdjustment = supplyDecimal.times(deviationRatio.abs().times(contractionFactor)).negated()
      stabilityMechanism = 'contract'
      confidence = new Decimal(1).minus(deviationRatio.abs().dividedBy(5)) // Lower confidence for contractions
    }

    // Cap adjustment at maximum
    const maxAdjustmentAmount = supplyDecimal.times(maxAdjustment)
    if (supplyAdjustment.abs().greaterThan(maxAdjustmentAmount)) {
      supplyAdjustment = supplyAdjustment.greaterThan(0) 
        ? maxAdjustmentAmount 
        : maxAdjustmentAmount.negated()
    }

    // Calculate new supply
    const newSupply = supplyDecimal.plus(supplyAdjustment)

    // Death spiral prevention
    if (newSupply.lessThan(supplyDecimal.times(0.5))) {
      // Prevent more than 50% contraction in one adjustment
      supplyAdjustment = supplyDecimal.times(-0.5)
      confidence = new Decimal(0.1) // Very low confidence
    }

    return {
      supplyAdjustment,
      newSupply: supplyDecimal.plus(supplyAdjustment),
      stabilityMechanism,
      confidence: confidence.times(100) // As percentage
    }
  }

  /**
   * Rebasing Stablecoin Calculation (e.g., AMPL)
   * Spec: "Adjust token balances periodically to maintain peg"
   * 
   * @param preRebaseBalance - Balance before rebase
   * @param targetPrice - Target price (usually 1.0)
   * @param currentPrice - Current market price
   * @param dampingFactor - Damping factor to smooth adjustments (0-1)
   * @returns Post-rebase balance and rebase factor
   */
  public rebaseCalculation(
    preRebaseBalance: number,
    targetPrice: number,
    currentPrice: number,
    dampingFactor: number = 0.1
  ): RebaseResult {
    const balanceDecimal = new Decimal(preRebaseBalance)
    const targetDecimal = new Decimal(targetPrice)
    const currentDecimal = new Decimal(currentPrice)
    const dampingDecimal = new Decimal(Math.min(Math.max(dampingFactor, 0), 1))

    // Calculate price deviation
    const deviation = currentDecimal.minus(targetDecimal).dividedBy(targetDecimal)
    
    // Apply damping factor to smooth adjustments
    const dampedDeviation = deviation.times(dampingDecimal)
    
    // Calculate rebase factor
    // If price > target, increase supply (positive rebase)
    // If price < target, decrease supply (negative rebase)
    const rebaseFactor = new Decimal(1).plus(dampedDeviation)
    
    // Calculate new balance
    const postRebaseBalance = balanceDecimal.times(rebaseFactor)
    
    // Calculate supply delta
    const supplyDelta = postRebaseBalance.minus(balanceDecimal)
    
    return {
      postRebaseBalance,
      rebaseFactor,
      supplyDelta,
      isPositive: supplyDelta.greaterThanOrEqualTo(0)
    }
  }

  /**
   * Calculate death spiral risk for algorithmic stablecoins
   * Spec requirement: "Death spiral prevention"
   * 
   * @param currentPrice - Current price
   * @param targetPeg - Target peg
   * @param historicalPrices - Historical prices (recent)
   * @param collateralRatio - Collateral ratio if partially backed
   * @returns Risk score (0-100) and recommendation
   */
  public calculateDeathSpiralRisk(
    currentPrice: number,
    targetPeg: number,
    historicalPrices: number[],
    collateralRatio?: number
  ): { riskScore: Decimal; recommendation: string; shouldHalt: boolean } {
    const currentDecimal = new Decimal(currentPrice)
    const targetDecimal = new Decimal(targetPeg)
    
    // Calculate current deviation
    const deviation = currentDecimal.minus(targetDecimal).abs().dividedBy(targetDecimal)
    
    // Calculate volatility from historical prices
    const volatility = this.calculateVolatility(historicalPrices)
    
    // Calculate trend (negative trend increases risk)
    const trend = this.calculateTrend(historicalPrices)
    
    // Base risk from deviation
    let riskScore = deviation.times(100)
    
    // Add volatility component (high volatility increases risk)
    riskScore = riskScore.plus(volatility.times(30))
    
    // Add trend component (downward trend increases risk)
    if (trend.lessThan(0)) {
      riskScore = riskScore.plus(trend.abs().times(50))
    }
    
    // Consider collateral ratio if provided
    if (collateralRatio !== undefined) {
      const collateralDecimal = new Decimal(collateralRatio)
      if (collateralDecimal.lessThan(1)) {
        // Undercollateralized - high risk
        riskScore = riskScore.plus(new Decimal(1).minus(collateralDecimal).times(100))
      }
    }
    
    // Cap at 100
    riskScore = Decimal.min(riskScore, new Decimal(100))
    
    // Determine recommendation
    let recommendation: string
    let shouldHalt = false
    
    if (riskScore.greaterThan(80)) {
      recommendation = 'CRITICAL: Halt all operations immediately'
      shouldHalt = true
    } else if (riskScore.greaterThan(60)) {
      recommendation = 'HIGH RISK: Implement emergency measures'
    } else if (riskScore.greaterThan(40)) {
      recommendation = 'MODERATE RISK: Increase monitoring frequency'
    } else {
      recommendation = 'LOW RISK: Normal operations'
    }
    
    return { riskScore, recommendation, shouldHalt }
  }

  /**
   * Helper: Calculate volatility from price series
   */
  private calculateVolatility(prices: number[]): Decimal {
    if (prices.length < 2) return new Decimal(0)
    
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i]
      const prevPrice = prices[i-1]
      if (!currentPrice || !prevPrice || prevPrice === 0) continue
      
      const ret = new Decimal(currentPrice).minus(prevPrice).dividedBy(prevPrice)
      returns.push(ret)
    }
    
    if (returns.length === 0) return new Decimal(0)
    
    const mean = returns.reduce((sum, ret) => sum.plus(ret), new Decimal(0))
      .dividedBy(returns.length)
    
    const variance = returns.reduce((sum, ret) => 
      sum.plus(ret.minus(mean).pow(2)), new Decimal(0)
    ).dividedBy(returns.length)
    
    return variance.sqrt()
  }

  /**
   * Helper: Calculate price trend
   */
  private calculateTrend(prices: number[]): Decimal {
    if (!prices || prices.length < 2) return new Decimal(0)
    
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    
    if (!firstPrice || !lastPrice || firstPrice === 0) return new Decimal(0)
    
    return new Decimal(lastPrice).minus(firstPrice).dividedBy(firstPrice)
  }
}

// Export singleton instance
export const stablecoinModels = new StablecoinModels()
