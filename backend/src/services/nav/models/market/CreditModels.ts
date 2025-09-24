/**
 * Credit Models Service
 * 
 * Institutional-grade credit risk modeling for private debt and fixed income.
 * Implements various credit risk assessment and pricing methods:
 * - Merton structural model for default probability
 * - Credit spread calculation and term structure
 * - Credit Default Swap (CDS) pricing
 * - Recovery rate modeling
 * - Credit migration matrices
 * - Expected loss and unexpected loss calculations
 * 
 * All calculations use Decimal.js for 28-decimal precision
 */

import Decimal from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface MertonModelParams {
  assetValue: Decimal // Current value of firm assets
  debtFaceValue: Decimal // Face value of debt
  assetVolatility: Decimal // Volatility of asset value
  timeToMaturity: number // Years to debt maturity
  riskFreeRate: Decimal // Risk-free interest rate
}

export interface CreditSpreadParams {
  defaultProbability: Decimal // Probability of default
  recoveryRate: Decimal // Expected recovery in default
  riskFreeRate: Decimal // Risk-free rate
  maturity: number // Years to maturity
  riskPremium?: Decimal // Credit risk premium
}

export interface CDSParams {
  spread: Decimal // CDS spread in basis points
  notional: Decimal // Notional amount
  maturity: number // Years to maturity
  paymentFrequency?: number // Payments per year
  recoveryRate?: Decimal // Recovery rate assumption
}

export interface CreditRating {
  rating: string // AAA, AA+, AA, etc.
  defaultProbability: Decimal // Annual default probability
  transitionMatrix?: Decimal[][] // Migration probabilities
  spread: Decimal // Credit spread in basis points
}

export interface CreditMetrics {
  expectedLoss: Decimal // EL = PD × LGD × EAD
  unexpectedLoss: Decimal // Credit VaR
  economicCapital: Decimal // Buffer for unexpected losses
  riskAdjustedReturn: Decimal // RAROC
  creditVaR: Decimal // Value at Risk
  creditCVaR: Decimal // Conditional VaR
}

export interface LoanPortfolio {
  loans: LoanPosition[]
  correlations?: Decimal[][] // Default correlations
  concentrationRisk?: Decimal // Herfindahl index
  sectorExposures?: Map<string, Decimal>
}

export interface LoanPosition {
  id: string
  principal: Decimal
  interestRate: Decimal
  maturity: number
  rating: CreditRating
  collateral?: Decimal
  lgd?: Decimal // Loss Given Default
  ead?: Decimal // Exposure at Default
  sector?: string
  covenant?: CovenantStatus
}

export interface CovenantStatus {
  type: 'financial' | 'operational' | 'negative'
  metric: string // e.g., 'debt/ebitda', 'interest_coverage'
  threshold: Decimal
  currentValue: Decimal
  inBreach: boolean
}

export interface RecoveryRateParams {
  seniorityClass: 'senior_secured' | 'senior_unsecured' | 'subordinated' | 'junior'
  collateralValue?: Decimal
  industryType?: string
  economicCycle?: 'expansion' | 'recession' | 'recovery'
}

export enum CreditModel {
  MERTON = 'MERTON',
  KMV = 'KMV',
  CREDITMETRICS = 'CREDITMETRICS',
  CREDITRISK_PLUS = 'CREDITRISK_PLUS',
  REDUCED_FORM = 'REDUCED_FORM'
}

class CreditModelsClass {
  
  // Standard credit rating mappings
  private readonly ratingMap = new Map<string, { pd: Decimal; spread: Decimal }>([
    ['AAA', { pd: new Decimal(0.0001), spread: new Decimal(10) }],
    ['AA+', { pd: new Decimal(0.0002), spread: new Decimal(15) }],
    ['AA', { pd: new Decimal(0.0003), spread: new Decimal(20) }],
    ['AA-', { pd: new Decimal(0.0004), spread: new Decimal(25) }],
    ['A+', { pd: new Decimal(0.0006), spread: new Decimal(35) }],
    ['A', { pd: new Decimal(0.0008), spread: new Decimal(45) }],
    ['A-', { pd: new Decimal(0.0012), spread: new Decimal(60) }],
    ['BBB+', { pd: new Decimal(0.0020), spread: new Decimal(90) }],
    ['BBB', { pd: new Decimal(0.0030), spread: new Decimal(120) }],
    ['BBB-', { pd: new Decimal(0.0045), spread: new Decimal(180) }],
    ['BB+', { pd: new Decimal(0.0075), spread: new Decimal(300) }],
    ['BB', { pd: new Decimal(0.0120), spread: new Decimal(450) }],
    ['BB-', { pd: new Decimal(0.0200), spread: new Decimal(600) }],
    ['B+', { pd: new Decimal(0.0350), spread: new Decimal(800) }],
    ['B', { pd: new Decimal(0.0600), spread: new Decimal(1000) }],
    ['B-', { pd: new Decimal(0.1000), spread: new Decimal(1500) }],
    ['CCC', { pd: new Decimal(0.2000), spread: new Decimal(2000) }],
    ['D', { pd: new Decimal(1.0000), spread: new Decimal(10000) }]
  ])
  
  /**
   * Calculate default probability using Merton structural model
   * Based on Black-Scholes framework for credit risk
   */
  mertonDefaultProbability(params: MertonModelParams): Decimal {
    const { assetValue, debtFaceValue, assetVolatility, timeToMaturity, riskFreeRate } = params
    
    // Calculate distance to default
    const d1 = this.calculateDistanceToDefault(
      assetValue,
      debtFaceValue,
      riskFreeRate,
      assetVolatility,
      timeToMaturity
    )
    
    const d2 = d1.minus(assetVolatility.times(Decimal.sqrt(timeToMaturity)))
    
    // Default probability = N(-d2)
    return this.normalCDF(d2.negated())
  }
  
  /**
   * Calculate KMV Expected Default Frequency (EDF)
   * Enhanced version of Merton model used by Moody's
   */
  kmvExpectedDefaultFrequency(
    assetValue: Decimal,
    assetVolatility: Decimal,
    defaultPoint: Decimal, // Short-term debt + 0.5 * long-term debt
    drift: Decimal = new Decimal(0) // Asset drift rate
  ): Decimal {
    // Distance to default in KMV framework
    const distanceToDefault = assetValue.minus(defaultPoint)
      .div(assetValue.times(assetVolatility))
    
    // Map distance to default to EDF using empirical calibration
    return this.distanceToEDF(distanceToDefault)
  }
  
  /**
   * Calculate credit spread from default probability
   * Compensates investors for expected loss and risk premium
   */
  calculateCreditSpread(params: CreditSpreadParams): Decimal {
    const { 
      defaultProbability, 
      recoveryRate, 
      riskFreeRate, 
      maturity,
      riskPremium = new Decimal(0.4) // Sharpe ratio for credit risk
    } = params
    
    // Risk-neutral spread (expected loss only)
    const expectedLoss = defaultProbability.times(new Decimal(1).minus(recoveryRate))
    const riskNeutralSpread = expectedLoss.div(maturity)
    
    // Add risk premium
    const totalSpread = riskNeutralSpread.plus(
      riskPremium.times(Decimal.sqrt(defaultProbability.times(new Decimal(1).minus(defaultProbability))))
    )
    
    // Convert to basis points
    return totalSpread.times(10000)
  }
  
  /**
   * Price a Credit Default Swap
   * Protection buyer pays periodic premium for default protection
   */
  priceCDS(params: CDSParams): {
    upfrontPayment: Decimal
    periodicPayment: Decimal
    protectionValue: Decimal
    presentValue: Decimal
  } {
    const {
      spread,
      notional,
      maturity,
      paymentFrequency = 4, // Quarterly
      recoveryRate = new Decimal(0.4)
    } = params
    
    // Convert spread from basis points to decimal
    const annualSpread = spread.div(10000)
    
    // Calculate protection leg (expected payout on default)
    const defaultProbability = this.spreadToDefaultProbability(spread, recoveryRate, maturity)
    const protectionValue = notional.times(new Decimal(1).minus(recoveryRate))
      .times(defaultProbability)
    
    // Calculate premium leg (periodic payments)
    const periodicPayment = notional.times(annualSpread).div(paymentFrequency)
    const totalPayments = maturity * paymentFrequency
    
    // Calculate present value using risky discount rate
    const riskyRate = new Decimal(0.03).plus(annualSpread) // Risk-free + spread
    let presentValue = new Decimal(0)
    
    for (let i = 1; i <= totalPayments; i++) {
      const time = i / paymentFrequency
      const survivalProbability = new Decimal(1).minus(defaultProbability).pow(time)
      const discountFactor = new Decimal(1).div(new Decimal(1).plus(riskyRate).pow(time))
      
      presentValue = presentValue.plus(
        periodicPayment.times(survivalProbability).times(discountFactor)
      )
    }
    
    // Upfront payment if spread differs from market
    const fairSpread = this.calculateFairCDSSpread(defaultProbability, recoveryRate, maturity)
    const spreadDifference = spread.minus(fairSpread)
    const upfrontPayment = notional.times(spreadDifference.div(10000)).times(maturity)
    
    return {
      upfrontPayment,
      periodicPayment,
      protectionValue,
      presentValue
    }
  }
  
  /**
   * Calculate recovery rate based on seniority and collateral
   * Using industry standards and historical data
   */
  estimateRecoveryRate(params: RecoveryRateParams): Decimal {
    const { seniorityClass, collateralValue, industryType, economicCycle = 'expansion' } = params
    
    // Base recovery rates by seniority
    const baseRecovery = {
      'senior_secured': new Decimal(0.65),
      'senior_unsecured': new Decimal(0.45),
      'subordinated': new Decimal(0.30),
      'junior': new Decimal(0.15)
    }
    
    let recoveryRate = baseRecovery[seniorityClass]
    
    // Adjust for collateral if provided
    if (collateralValue) {
      const collateralAdjustment = Decimal.min(
        collateralValue.div(100), // Normalize to percentage
        new Decimal(0.25) // Cap adjustment at 25%
      )
      recoveryRate = recoveryRate.plus(collateralAdjustment)
    }
    
    // Industry adjustments
    const industryMultipliers: Record<string, Decimal> = {
      'utilities': new Decimal(1.15),
      'real_estate': new Decimal(1.10),
      'technology': new Decimal(0.85),
      'retail': new Decimal(0.80),
      'energy': new Decimal(0.90)
    }
    
    if (industryType && industryMultipliers[industryType]) {
      recoveryRate = recoveryRate.times(industryMultipliers[industryType])
    }
    
    // Economic cycle adjustment
    const cycleAdjustment = {
      'expansion': new Decimal(1.05),
      'recession': new Decimal(0.85),
      'recovery': new Decimal(0.95)
    }
    
    recoveryRate = recoveryRate.times(cycleAdjustment[economicCycle])
    
    // Cap between 0 and 1
    return Decimal.min(Decimal.max(recoveryRate, new Decimal(0)), new Decimal(1))
  }
  
  /**
   * Calculate credit metrics for a loan or portfolio
   * Expected Loss, Unexpected Loss, Economic Capital
   */
  calculateCreditMetrics(
    positions: LoanPosition[],
    confidenceLevel: Decimal = new Decimal(0.99)
  ): CreditMetrics {
    // Calculate expected loss for each position
    let totalExpectedLoss = new Decimal(0)
    let totalExposure = new Decimal(0)
    
    const positionMetrics: Array<{
      el: Decimal
      ul: Decimal
      ead: Decimal
    }> = []
    
    for (const position of positions) {
      const pd = position.rating.defaultProbability
      const lgd = position.lgd || new Decimal(0.45) // Default LGD if not provided
      const ead = position.ead || position.principal
      
      const expectedLoss = pd.times(lgd).times(ead)
      totalExpectedLoss = totalExpectedLoss.plus(expectedLoss)
      totalExposure = totalExposure.plus(ead)
      
      // Unexpected loss for individual position
      const variance = pd.times(new Decimal(1).minus(pd)).times(lgd.pow(2)).times(ead.pow(2))
      const unexpectedLoss = Decimal.sqrt(variance)
      
      positionMetrics.push({ el: expectedLoss, ul: unexpectedLoss, ead })
    }
    
    // Portfolio unexpected loss (assuming independence for simplicity)
    // Production would use correlation matrix
    const portfolioVariance = positionMetrics.reduce(
      (sum, m) => sum.plus(m.ul.pow(2)),
      new Decimal(0)
    )
    const unexpectedLoss = Decimal.sqrt(portfolioVariance)
    
    // Credit VaR at confidence level
    const zScore = this.normalInverse(confidenceLevel)
    const creditVaR = totalExpectedLoss.plus(unexpectedLoss.times(zScore))
    
    // Economic capital
    const economicCapital = creditVaR.minus(totalExpectedLoss)
    
    // Conditional VaR (expected loss beyond VaR)
    const tailProbability = new Decimal(1).minus(confidenceLevel)
    const conditionalMultiplier = this.normalPDF(zScore).div(tailProbability)
    const creditCVaR = creditVaR.plus(unexpectedLoss.times(conditionalMultiplier))
    
    // Risk-adjusted return
    const avgInterestRate = positions.reduce(
      (sum, p) => sum.plus(p.interestRate.times(p.principal)),
      new Decimal(0)
    ).div(totalExposure)
    
    const riskAdjustedReturn = avgInterestRate.minus(totalExpectedLoss.div(totalExposure))
      .div(economicCapital.div(totalExposure))
    
    return {
      expectedLoss: totalExpectedLoss,
      unexpectedLoss,
      economicCapital,
      riskAdjustedReturn,
      creditVaR,
      creditCVaR
    }
  }
  
  /**
   * Calculate expected loss for a single exposure
   * EL = PD × LGD × EAD (Probability of Default × Loss Given Default × Exposure at Default)
   */
  calculateExpectedLoss(
    probabilityOfDefault: Decimal,
    lossGivenDefault: Decimal,
    exposureAtDefault: Decimal = new Decimal(1)
  ): Decimal {
    return probabilityOfDefault.times(lossGivenDefault).times(exposureAtDefault)
  }
  
  /**
   * Generate credit migration matrix
   * Probabilities of rating transitions over time
   */
  generateMigrationMatrix(
    currentRating: string,
    timeHorizon: number = 1 // Years
  ): Map<string, Decimal> {
    // Simplified migration matrix - production would use historical data
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D']
    const currentIndex = this.getRatingIndex(currentRating)
    
    const migrations = new Map<string, Decimal>()
    
    for (let i = 0; i < ratings.length; i++) {
      const distance = Math.abs(i - currentIndex)
      let probability: Decimal
      
      if (distance === 0) {
        // Stay in same rating
        probability = new Decimal(0.85).pow(timeHorizon)
      } else if (distance === 1) {
        // One notch migration
        probability = new Decimal(0.10).times(timeHorizon)
      } else if (distance === 2) {
        // Two notch migration
        probability = new Decimal(0.03).times(timeHorizon)
      } else {
        // Rare migrations
        probability = new Decimal(0.01).times(timeHorizon).div(distance)
      }
      
      // Higher probability of downgrade than upgrade
      if (i > currentIndex) {
        probability = probability.times(1.5)
      }
      
      const rating = ratings[i]
      if (rating) {
        migrations.set(rating, probability)
      }
    }
    
    // Normalize probabilities
    const total = Array.from(migrations.values())
      .reduce((sum, p) => sum.plus(p), new Decimal(0))
    
    for (const [rating, prob] of migrations) {
      migrations.set(rating, prob.div(total))
    }
    
    return migrations
  }
  
  /**
   * Calculate portfolio concentration risk
   * Using Herfindahl-Hirschman Index
   */
  calculateConcentrationRisk(positions: LoanPosition[]): {
    herfindahlIndex: Decimal
    effectiveNumber: Decimal
    concentrationMultiplier: Decimal
  } {
    const totalExposure = positions.reduce(
      (sum, p) => sum.plus(p.principal),
      new Decimal(0)
    )
    
    // Calculate HHI
    let hhi = new Decimal(0)
    for (const position of positions) {
      const weight = position.principal.div(totalExposure)
      hhi = hhi.plus(weight.pow(2))
    }
    
    // Effective number of positions
    const effectiveNumber = new Decimal(1).div(hhi)
    
    // Concentration multiplier for capital calculation
    const concentrationMultiplier = new Decimal(1).plus(
      hhi.minus(new Decimal(1).div(positions.length)).times(0.5)
    )
    
    return {
      herfindahlIndex: hhi,
      effectiveNumber,
      concentrationMultiplier
    }
  }
  
  /**
   * Check covenant compliance and calculate breach probability
   */
  evaluateCovenant(covenant: CovenantStatus): {
    headroom: Decimal
    breachProbability: Decimal
    expectedTimeToBreachDays: number
  } {
    const { threshold, currentValue } = covenant
    
    // Calculate headroom (distance from breach)
    const headroom = covenant.type === 'financial' ?
      threshold.minus(currentValue).div(threshold) : // For max thresholds
      currentValue.minus(threshold).div(currentValue) // For min thresholds
    
    // Estimate breach probability based on headroom
    let breachProbability: Decimal
    if (headroom.lessThanOrEqualTo(0)) {
      breachProbability = new Decimal(1) // Already in breach
    } else if (headroom.lessThan(0.1)) {
      breachProbability = new Decimal(0.75) // High risk
    } else if (headroom.lessThan(0.25)) {
      breachProbability = new Decimal(0.40) // Medium risk
    } else if (headroom.lessThan(0.5)) {
      breachProbability = new Decimal(0.15) // Low risk
    } else {
      breachProbability = new Decimal(0.05) // Very low risk
    }
    
    // Estimate time to breach (simplified)
    const volatility = new Decimal(0.2) // Assumed metric volatility
    const drift = new Decimal(-0.05) // Assumed deterioration rate
    
    const expectedTimeToBreachYears = headroom.div(drift.abs().plus(volatility.div(2)))
    const expectedTimeToBreachDays = Math.floor(expectedTimeToBreachYears.times(365).toNumber())
    
    return {
      headroom,
      breachProbability,
      expectedTimeToBreachDays
    }
  }
  
  /**
   * Calculate yield for a distressed debt investment
   * Accounts for default probability and recovery
   */
  distressedDebtYield(
    purchasePrice: Decimal, // As % of par
    coupon: Decimal,
    maturity: number,
    defaultProbability: Decimal,
    recoveryRate: Decimal
  ): Decimal {
    // Expected cash flows
    const parValue = new Decimal(100)
    const annualCoupon = parValue.times(coupon)
    
    // Survival scenario cash flows
    const survivalProbability = new Decimal(1).minus(defaultProbability)
    const survivalValue = parValue.plus(annualCoupon.times(maturity))
    
    // Default scenario cash flows
    const defaultValue = parValue.times(recoveryRate)
    
    // Expected terminal value
    const expectedValue = survivalValue.times(survivalProbability)
      .plus(defaultValue.times(defaultProbability))
    
    // Calculate yield
    const totalReturn = expectedValue.div(purchasePrice).pow(new Decimal(1).div(maturity))
    return totalReturn.minus(1)
  }
  
  // Private helper methods
  
  private calculateDistanceToDefault(
    assetValue: Decimal,
    debtValue: Decimal,
    riskFree: Decimal,
    volatility: Decimal,
    time: number
  ): Decimal {
    const logVD = Decimal.ln(assetValue.div(debtValue))
    const drift = riskFree.minus(volatility.pow(2).div(2)).times(time)
    const diffusion = volatility.times(Decimal.sqrt(time))
    
    return logVD.plus(drift).div(diffusion)
  }
  
  private distanceToEDF(distance: Decimal): Decimal {
    // Empirical mapping from distance-to-default to EDF
    // Based on KMV historical calibration
    
    if (distance.lessThanOrEqualTo(0)) {
      return new Decimal(0.20) // 20% default probability
    } else if (distance.lessThanOrEqualTo(1)) {
      return new Decimal(0.10)
    } else if (distance.lessThanOrEqualTo(2)) {
      return new Decimal(0.05)
    } else if (distance.lessThanOrEqualTo(3)) {
      return new Decimal(0.02)
    } else if (distance.lessThanOrEqualTo(4)) {
      return new Decimal(0.01)
    } else if (distance.lessThanOrEqualTo(5)) {
      return new Decimal(0.005)
    } else {
      return new Decimal(0.001)
    }
  }
  
  private spreadToDefaultProbability(
    spread: Decimal,
    recoveryRate: Decimal,
    maturity: number
  ): Decimal {
    // Inverse of credit spread formula
    const annualSpread = spread.div(10000)
    const lossGivenDefault = new Decimal(1).minus(recoveryRate)
    
    return annualSpread.times(maturity).div(lossGivenDefault)
  }
  
  private calculateFairCDSSpread(
    defaultProbability: Decimal,
    recoveryRate: Decimal,
    maturity: number
  ): Decimal {
    const expectedLoss = defaultProbability.times(new Decimal(1).minus(recoveryRate))
    const annualSpread = expectedLoss.div(maturity)
    
    return annualSpread.times(10000) // Convert to basis points
  }
  
  private getRatingIndex(rating: string): number {
    const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D']
    const index = ratings.findIndex(r => rating.startsWith(r))
    return index >= 0 ? index : 4 // Default to BBB if not found
  }
  
  private normalCDF(x: Decimal): Decimal {
    const a1 = new Decimal(0.254829592)
    const a2 = new Decimal(-0.284496736)
    const a3 = new Decimal(1.421413741)
    const a4 = new Decimal(-1.453152027)
    const a5 = new Decimal(1.061405429)
    const p = new Decimal(0.3275911)
    
    const sign = x.greaterThanOrEqualTo(0) ? new Decimal(1) : new Decimal(-1)
    const absX = x.abs()
    
    const t = new Decimal(1).div(new Decimal(1).plus(p.times(absX)))
    const t2 = t.pow(2)
    const t3 = t.pow(3)
    const t4 = t.pow(4)
    const t5 = t.pow(5)
    
    const y = new Decimal(1).minus(
      a1.times(t)
        .plus(a2.times(t2))
        .plus(a3.times(t3))
        .plus(a4.times(t4))
        .plus(a5.times(t5))
        .times(Decimal.exp(absX.negated().pow(2)))
    )
    
    return new Decimal(0.5).times(new Decimal(1).plus(sign.times(y)))
  }
  
  private normalPDF(x: Decimal): Decimal {
    const sqrt2Pi = Decimal.sqrt(new Decimal(2).times(Decimal.acos(-1)))
    return Decimal.exp(x.pow(2).negated().div(2)).div(sqrt2Pi)
  }
  
  private normalInverse(p: Decimal): Decimal {
    // Inverse normal CDF using Acklam's algorithm
    const a1 = new Decimal(-3.969683028665376e+01)
    const a2 = new Decimal(2.209460984245205e+02)
    const a3 = new Decimal(-2.759285104469687e+02)
    const a4 = new Decimal(1.383577518672690e+02)
    const a5 = new Decimal(-3.066479806614716e+01)
    const a6 = new Decimal(2.506628277459239e+00)
    
    const b1 = new Decimal(-5.447609879822406e+01)
    const b2 = new Decimal(1.615858368580409e+02)
    const b3 = new Decimal(-1.556989798598866e+02)
    const b4 = new Decimal(6.680131188771972e+01)
    const b5 = new Decimal(-1.328068155288572e+01)
    
    const c1 = new Decimal(-7.784894002430293e-03)
    const c2 = new Decimal(-3.223964580411365e-01)
    const c3 = new Decimal(-2.400758277161838e+00)
    const c4 = new Decimal(-2.549732539343734e+00)
    const c5 = new Decimal(4.374664141464968e+00)
    const c6 = new Decimal(2.938163982698783e+00)
    
    const d1 = new Decimal(7.784695709041462e-03)
    const d2 = new Decimal(3.224671290700398e-01)
    const d3 = new Decimal(2.445134137142996e+00)
    const d4 = new Decimal(3.754408661907416e+00)
    
    const pLow = new Decimal(0.02425)
    const pHigh = new Decimal(1).minus(pLow)
    
    let q: Decimal, r: Decimal
    
    if (p.lessThan(pLow)) {
      q = Decimal.sqrt(Decimal.ln(p).negated().times(2))
      return a1.plus(q.times(a2.plus(q.times(a3.plus(q.times(a4.plus(q.times(a5.plus(q.times(a6))))))))))
        .div(b1.plus(q.times(b2.plus(q.times(b3.plus(q.times(b4.plus(q.times(b5.plus(q))))))))))
    } else if (p.lessThanOrEqualTo(pHigh)) {
      q = p.minus(0.5)
      r = q.pow(2)
      return q.times(c1.plus(r.times(c2.plus(r.times(c3.plus(r.times(c4.plus(r.times(c5.plus(r.times(c6)))))))))))
        .div(new Decimal(1).plus(r.times(d1.plus(r.times(d2.plus(r.times(d3.plus(r.times(d4)))))))))
    } else {
      q = Decimal.sqrt(Decimal.ln(new Decimal(1).minus(p)).negated().times(2))
      return a1.plus(q.times(a2.plus(q.times(a3.plus(q.times(a4.plus(q.times(a5.plus(q.times(a6))))))))))
        .div(b1.plus(q.times(b2.plus(q.times(b3.plus(q.times(b4.plus(q.times(b5.plus(q))))))))))
        .negated()
    }
  }
}

// Export singleton instance
export const creditModels = new CreditModelsClass()