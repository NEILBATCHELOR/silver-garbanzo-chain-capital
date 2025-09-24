/**
 * Factor Models Service
 * 
 * Institutional-grade factor modeling for quantitative investment strategies.
 * Implements various factor-based portfolio construction and analysis methods:
 * - Multi-factor models (Fama-French, Carhart, custom factors)
 * - Risk parity and equal risk contribution
 * - Statistical arbitrage signals
 * - Momentum and mean reversion strategies
 * - Factor exposure analysis and attribution
 * 
 * All calculations use Decimal.js for 28-decimal precision
 */

import Decimal from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface Factor {
  name: string
  returns: Decimal[] // Historical factor returns
  loadings?: Decimal[] // Factor loadings for assets
  description?: string
}

export interface FactorModelParams {
  factors: Factor[]
  assetReturns: Decimal[] // Historical asset returns
  exposures: Decimal[][] // Asset exposures to factors
  riskFreeRate?: Decimal
}

export interface FactorAnalysis {
  factorReturns: Decimal[]
  alpha: Decimal
  factorContributions: Decimal[]
  rsquared: Decimal
  specificRisk: Decimal
  systematicRisk: Decimal
}

export interface RiskParityParams {
  volatilities: Decimal[] // Asset volatilities
  correlations: Decimal[][] // Correlation matrix
  targetRisk?: Decimal // Target portfolio risk
}

export interface StatArbParams {
  spread: Decimal[] // Price spread time series
  meanReversionSpeed: number // Kappa parameter
  halfLife: number // Mean reversion half-life
  zScoreThreshold?: number // Entry/exit threshold
}

export interface MomentumParams {
  prices: Decimal[] // Historical prices
  lookbackPeriod: number // Days for momentum calculation
  holdingPeriod: number // Days to hold position
  skipPeriod?: number // Days to skip (avoid reversal)
}

export interface PortfolioOptimization {
  weights: Decimal[]
  expectedReturn: Decimal
  risk: Decimal
  sharpeRatio: Decimal
  informationRatio?: Decimal
  maxDrawdown?: Decimal
}

export interface BacktestResult {
  returns: Decimal[]
  cumulativeReturn: Decimal
  annualizedReturn: Decimal
  volatility: Decimal
  sharpeRatio: Decimal
  maxDrawdown: Decimal
  winRate: number
  profitFactor: Decimal
}

export enum FactorType {
  VALUE = 'VALUE',
  MOMENTUM = 'MOMENTUM',
  QUALITY = 'QUALITY',
  LOW_VOLATILITY = 'LOW_VOLATILITY',
  SIZE = 'SIZE',
  PROFITABILITY = 'PROFITABILITY',
  INVESTMENT = 'INVESTMENT',
  CUSTOM = 'CUSTOM'
}

export enum OptimizationMethod {
  MEAN_VARIANCE = 'MEAN_VARIANCE',
  RISK_PARITY = 'RISK_PARITY',
  MAXIMUM_SHARPE = 'MAXIMUM_SHARPE',
  MINIMUM_VARIANCE = 'MINIMUM_VARIANCE',
  EQUAL_WEIGHT = 'EQUAL_WEIGHT'
}

class FactorModelsClass {
  
  /**
   * Perform multi-factor regression analysis
   * Returns factor loadings, alpha, and performance attribution
   */
  analyzeFactorModel(params: FactorModelParams): FactorAnalysis {
    const { factors, assetReturns, exposures, riskFreeRate = new Decimal(0) } = params
    
    // Prepare regression matrix
    const n = assetReturns.length
    const k = factors.length
    
    // Build design matrix X (n x k+1) with intercept
    const X: Decimal[][] = []
    for (let i = 0; i < n; i++) {
      const row: Decimal[] = [new Decimal(1)] // Intercept
      for (let j = 0; j < k; j++) {
        const exposure = exposures[i]?.[j] || new Decimal(0)
        row.push(exposure)
      }
      X.push(row)
    }
    
    // Adjust returns for risk-free rate
    const excessReturns = assetReturns.map(r => r.minus(riskFreeRate))
    
    // Perform regression using OLS
    const coefficients = this.ordinaryLeastSquares(X, excessReturns)
    
    // Extract alpha and factor loadings with safe access
    const alpha = coefficients[0] || new Decimal(0)
    const factorLoadings = coefficients.slice(1)
    
    // Calculate factor contributions
    const factorContributions = this.calculateFactorContributions(
      factors,
      factorLoadings,
      excessReturns
    )
    
    // Calculate R-squared
    const rsquared = this.calculateRSquared(X, excessReturns, coefficients)
    
    // Decompose risk into systematic and specific
    const { systematicRisk, specificRisk } = this.decomposeRisk(
      excessReturns,
      X,
      coefficients
    )
    
    return {
      factorReturns: factorLoadings,
      alpha,
      factorContributions,
      rsquared,
      specificRisk,
      systematicRisk
    }
  }
  
  /**
   * Build Fama-French three-factor model
   * Market, Size (SMB), Value (HML) factors
   */
  buildFamaFrenchModel(
    marketReturns: Decimal[],
    smbReturns: Decimal[],
    hmlReturns: Decimal[],
    assetReturns: Decimal[]
  ): FactorAnalysis {
    const factors: Factor[] = [
      { name: 'Market', returns: marketReturns },
      { name: 'SMB', returns: smbReturns },
      { name: 'HML', returns: hmlReturns }
    ]
    
    // Calculate exposures using rolling regression
    const exposures = this.calculateRollingExposures(
      factors.map(f => f.returns),
      assetReturns
    )
    
    return this.analyzeFactorModel({
      factors,
      assetReturns,
      exposures
    })
  }
  
  /**
   * Build Carhart four-factor model
   * Adds momentum (UMD) to Fama-French
   */
  buildCarhartModel(
    marketReturns: Decimal[],
    smbReturns: Decimal[],
    hmlReturns: Decimal[],
    umdReturns: Decimal[],
    assetReturns: Decimal[]
  ): FactorAnalysis {
    const factors: Factor[] = [
      { name: 'Market', returns: marketReturns },
      { name: 'SMB', returns: smbReturns },
      { name: 'HML', returns: hmlReturns },
      { name: 'UMD', returns: umdReturns }
    ]
    
    const exposures = this.calculateRollingExposures(
      factors.map(f => f.returns),
      assetReturns
    )
    
    return this.analyzeFactorModel({
      factors,
      assetReturns,
      exposures
    })
  }
  
  /**
   * Calculate risk parity portfolio weights
   * Each asset contributes equally to total portfolio risk
   */
  calculateRiskParity(params: RiskParityParams): Decimal[] {
    const { volatilities, correlations, targetRisk = new Decimal(0.1) } = params
    const n = volatilities.length
    
    // Initial guess: inverse volatility weighting
    let weights = volatilities.map(vol => new Decimal(1).div(vol))
    const sumWeights = weights.reduce((sum, w) => sum.plus(w), new Decimal(0))
    weights = weights.map(w => w.div(sumWeights))
    
    // Iterate to find equal risk contribution
    for (let iter = 0; iter < 50; iter++) {
      const riskContributions = this.calculateRiskContributions(
        weights,
        volatilities,
        correlations
      )
      
      // Check convergence
      const avgContribution = riskContributions.reduce((sum, rc) => sum.plus(rc), new Decimal(0)).div(n)
      const maxDeviation = Math.max(...riskContributions.map(rc => rc.minus(avgContribution).abs().toNumber()))
      
      if (maxDeviation < 0.0001) break
      
      // Update weights using Newton's method
      weights = this.updateRiskParityWeights(weights, volatilities, correlations)
    }
    
    // Scale to target risk if provided
    const portfolioRisk = this.calculatePortfolioRisk(weights, volatilities, correlations)
    const scaleFactor = targetRisk.div(portfolioRisk)
    
    return weights.map(w => w.times(scaleFactor))
  }
  
  /**
   * Generate statistical arbitrage signals
   * Based on mean reversion of spreads
   */
  generateStatArbSignal(params: StatArbParams): {
    signal: Decimal
    zScore: Decimal
    confidence: Decimal
    expectedReturn: Decimal
  } {
    const { spread, meanReversionSpeed, halfLife, zScoreThreshold = 2 } = params
    
    // Calculate rolling statistics
    const mean = this.calculateMean(spread)
    const stdDev = this.calculateStdDev(spread)
    
    // Current z-score with safe access
    const currentSpread = spread[spread.length - 1]
    if (!currentSpread) {
      throw new Error('Spread array cannot be empty')
    }
    const zScore = currentSpread.minus(mean).div(stdDev)
    
    // Generate signal
    let signal = new Decimal(0)
    if (zScore.abs().greaterThan(zScoreThreshold)) {
      signal = zScore.negated() // Mean reversion: sell when high, buy when low
    }
    
    // Calculate confidence based on historical hit rate
    const historicalSignals = this.calculateHistoricalSignals(spread, mean, stdDev, zScoreThreshold)
    const hitRate = this.calculateHitRate(historicalSignals)
    const confidence = new Decimal(hitRate)
    
    // Expected return based on mean reversion
    const expectedMoveToMean = currentSpread.minus(mean).abs()
    const timeToReversion = new Decimal(halfLife).div(meanReversionSpeed)
    const expectedReturn = expectedMoveToMean.div(currentSpread).div(timeToReversion)
    
    return {
      signal: signal.div(zScoreThreshold), // Normalize to [-1, 1]
      zScore,
      confidence,
      expectedReturn
    }
  }
  
  /**
   * Calculate momentum signal
   * Based on past returns and trend strength
   */
  calculateMomentumSignal(params: MomentumParams): {
    signal: 'long' | 'short' | 'neutral'
    strength: Decimal
    expectedReturn: Decimal
  } {
    const { prices, lookbackPeriod, holdingPeriod, skipPeriod = 1 } = params
    
    // Calculate returns over lookback period
    const startIndex = Math.max(0, prices.length - lookbackPeriod - skipPeriod)
    const endIndex = prices.length - skipPeriod
    
    const startPrice = prices[startIndex]
    const endPrice = prices[endIndex]
    
    if (!startPrice || !endPrice) {
      throw new Error('Insufficient price data for momentum calculation')
    }
    
    const lookbackReturn = endPrice.minus(startPrice).div(startPrice)
    
    // Calculate trend strength using regression
    const trendStrength = this.calculateTrendStrength(prices.slice(startIndex, endIndex))
    
    // Determine signal
    let signal: 'long' | 'short' | 'neutral' = 'neutral'
    if (lookbackReturn.greaterThan(0.05) && trendStrength.greaterThan(0.6)) {
      signal = 'long'
    } else if (lookbackReturn.lessThan(-0.05) && trendStrength.greaterThan(0.6)) {
      signal = 'short'
    }
    
    // Expected return based on momentum continuation
    const historicalContinuation = this.calculateMomentumContinuation(
      prices,
      lookbackPeriod,
      holdingPeriod
    )
    
    const expectedReturn = signal === 'long' ? 
      lookbackReturn.times(historicalContinuation) :
      signal === 'short' ? 
        lookbackReturn.negated().times(historicalContinuation) :
        new Decimal(0)
    
    return {
      signal,
      strength: trendStrength,
      expectedReturn
    }
  }
  
  /**
   * Optimize portfolio using various methods
   */
  optimizePortfolio(
    expectedReturns: Decimal[],
    covariance: Decimal[][],
    method: OptimizationMethod = OptimizationMethod.MAXIMUM_SHARPE,
    constraints?: {
      minWeight?: Decimal
      maxWeight?: Decimal
      targetReturn?: Decimal
      targetRisk?: Decimal
    }
  ): PortfolioOptimization {
    const n = expectedReturns.length
    
    switch (method) {
      case OptimizationMethod.EQUAL_WEIGHT:
        return this.equalWeightPortfolio(expectedReturns, covariance)
      
      case OptimizationMethod.RISK_PARITY:
        return this.riskParityOptimization(expectedReturns, covariance)
      
      case OptimizationMethod.MINIMUM_VARIANCE:
        return this.minimumVariancePortfolio(expectedReturns, covariance, constraints)
      
      case OptimizationMethod.MAXIMUM_SHARPE:
        return this.maximumSharpePortfolio(expectedReturns, covariance, constraints)
      
      case OptimizationMethod.MEAN_VARIANCE:
      default:
        return this.meanVarianceOptimization(expectedReturns, covariance, constraints)
    }
  }
  
  /**
   * Backtest a factor strategy
   */
  backtest(
    signals: Decimal[], // Trading signals
    returns: Decimal[], // Asset returns
    transactionCost: Decimal = new Decimal(0.001) // 10 bps
  ): BacktestResult {
    const strategyReturns: Decimal[] = []
    let position = new Decimal(0)
    
    for (let i = 0; i < signals.length && i < returns.length; i++) {
      const newPosition = signals[i]
      const currentReturn = returns[i]
      if (!newPosition || !currentReturn) {
        continue
      }
      const positionChange = newPosition.minus(position).abs()
      
      // Apply transaction costs
      const cost = positionChange.times(transactionCost)
      const netReturn = position.times(currentReturn).minus(cost)
      
      strategyReturns.push(netReturn)
      position = newPosition
    }
    
    return this.calculateBacktestMetrics(strategyReturns)
  }
  
  /**
   * Calculate factor exposures for an asset
   */
  calculateFactorExposures(
    assetReturns: Decimal[],
    factorReturns: Decimal[][]
  ): Decimal[] {
    // Validate inputs
    if (!assetReturns || assetReturns.length === 0) {
      throw new Error('Asset returns cannot be empty')
    }
    if (!factorReturns || factorReturns.length === 0) {
      throw new Error('Factor returns cannot be empty')
    }
    
    // Build regression matrix
    const n = assetReturns.length
    const k = factorReturns.length
    
    const X: Decimal[][] = []
    for (let i = 0; i < n; i++) {
      const row: Decimal[] = [new Decimal(1)] // Intercept
      for (let j = 0; j < k; j++) {
        const factorReturn = factorReturns[j]?.[i]
        row.push(factorReturn || new Decimal(0))
      }
      X.push(row)
    }
    
    // OLS regression
    const coefficients = this.ordinaryLeastSquares(X, assetReturns)
    if (!coefficients || coefficients.length === 0) {
      throw new Error('Failed to calculate factor exposures - insufficient data')
    }
    
    // Return factor loadings (excluding intercept)
    return coefficients.slice(1)
  }
  
  // Private helper methods
  
  private ordinaryLeastSquares(X: Decimal[][], y: Decimal[]): Decimal[] {
    // Calculate (X'X)^-1 * X'y
    const Xt = this.transpose(X)
    const XtX = this.matrixMultiply(Xt, X)
    const XtX_inv = this.matrixInverse(XtX)
    const Xty = this.matrixVectorMultiply(Xt, y)
    
    return this.matrixVectorMultiply(XtX_inv, Xty)
  }
  
  private calculateFactorContributions(
    factors: Factor[],
    loadings: Decimal[],
    returns: Decimal[]
  ): Decimal[] {
    const contributions: Decimal[] = []
    
    for (let i = 0; i < factors.length; i++) {
      const factor = factors[i]
      const loading = loadings[i]
      
      if (factor && loading && factor.returns && factor.returns.length > 0) {
        const factorReturn = this.calculateMean(factor.returns)
        const contribution = loading.times(factorReturn)
        contributions.push(contribution)
      } else {
        contributions.push(new Decimal(0))
      }
    }
    
    return contributions
  }
  
  private calculateRSquared(X: Decimal[][], y: Decimal[], coefficients: Decimal[]): Decimal {
    // Calculate fitted values with safe access
    const yFitted = X.map(row => 
      row.reduce((sum, x, i) => {
        const coeff = coefficients[i]
        return coeff ? sum.plus(x.times(coeff)) : sum
      }, new Decimal(0))
    )
    
    // Calculate total sum of squares
    const yMean = this.calculateMean(y)
    const totalSS = y.reduce((sum, yi) => sum.plus(yi.minus(yMean).pow(2)), new Decimal(0))
    
    // Calculate residual sum of squares
    const residualSS = y.reduce((sum, yi, i) => {
      const fitted = yFitted[i] || new Decimal(0)
      return sum.plus(yi.minus(fitted).pow(2))
    }, new Decimal(0))
    
    return totalSS.equals(0) ? new Decimal(0) : new Decimal(1).minus(residualSS.div(totalSS))
  }
  
  private decomposeRisk(
    returns: Decimal[],
    X: Decimal[][],
    coefficients: Decimal[]
  ): { systematicRisk: Decimal; specificRisk: Decimal } {
    // Calculate fitted values with safe access
    const fittedReturns = X.map(row =>
      row.reduce((sum, x, i) => {
        const coeff = coefficients[i]
        return coeff ? sum.plus(x.times(coeff)) : sum
      }, new Decimal(0))
    )
    
    // Systematic risk (explained by factors)
    const systematicRisk = this.calculateStdDev(fittedReturns)
    
    // Specific risk (residuals)
    const residuals = returns.map((r, i) => {
      const fitted = fittedReturns[i] || new Decimal(0)
      return r.minus(fitted)
    })
    const specificRisk = this.calculateStdDev(residuals)
    
    return { systematicRisk, specificRisk }
  }
  
  private calculateRollingExposures(
    factorReturns: Decimal[][],
    assetReturns: Decimal[],
    windowSize: number = 60
  ): Decimal[][] {
    const exposures: Decimal[][] = []
    
    for (let i = 0; i < assetReturns.length; i++) {
      const startIdx = Math.max(0, i - windowSize + 1)
      const endIdx = i + 1
      
      const windowAssetReturns = assetReturns.slice(startIdx, endIdx)
      const windowFactorReturns = factorReturns.map(f => f.slice(startIdx, endIdx))
      
      try {
        if (windowAssetReturns.length >= 10 && windowFactorReturns.every(f => f.length >= 10)) {
          const exposure = this.calculateFactorExposures(windowAssetReturns, windowFactorReturns)
          exposures.push(exposure || [])
        } else {
          // Insufficient data, use zeros
          exposures.push(Array(factorReturns.length).fill(new Decimal(0)))
        }
      } catch (error) {
        // If calculation fails, use zeros
        exposures.push(Array(factorReturns.length).fill(new Decimal(0)))
      }
    }
    
    return exposures
  }
  
  private calculateRiskContributions(
    weights: Decimal[],
    volatilities: Decimal[],
    correlations: Decimal[][]
  ): Decimal[] {
    const portfolioRisk = this.calculatePortfolioRisk(weights, volatilities, correlations)
    const contributions: Decimal[] = []
    
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i]
      const vol = volatilities[i]
      const corrRow = correlations[i]
      
      if (!weight || !vol || !corrRow) {
        contributions.push(new Decimal(0))
        continue
      }
      
      let contribution = weight.times(vol).times(vol)
      
      for (let j = 0; j < weights.length; j++) {
        if (i !== j) {
          const otherWeight = weights[j]
          const otherVol = volatilities[j]
          const correlation = corrRow?.[j]
          
          if (otherWeight && otherVol && correlation !== undefined) {
            contribution = contribution.plus(
              weight.times(otherWeight)
                .times(vol)
                .times(otherVol)
                .times(correlation)
            )
          }
        }
      }
      
      if (portfolioRisk.greaterThan(0)) {
        contributions.push(contribution.div(portfolioRisk))
      } else {
        contributions.push(new Decimal(0))
      }
    }
    
    return contributions
  }
  
  private updateRiskParityWeights(
    weights: Decimal[],
    volatilities: Decimal[],
    correlations: Decimal[][]
  ): Decimal[] {
    const n = weights.length
    const riskContributions = this.calculateRiskContributions(weights, volatilities, correlations)
    const avgContribution = riskContributions.reduce((sum, rc) => sum.plus(rc), new Decimal(0)).div(n)
    
    // Newton's method update
    const newWeights: Decimal[] = []
    for (let i = 0; i < n; i++) {
      const weight = weights[i]
      const riskContrib = riskContributions[i]
      
      if (!weight || !riskContrib || riskContrib.equals(0)) {
        newWeights.push(new Decimal(0))
        continue
      }
      
      const adjustment = avgContribution.div(riskContrib)
      newWeights.push(weight.times(adjustment.sqrt()))
    }
    
    // Normalize
    const sumWeights = newWeights.reduce((sum, w) => sum.plus(w), new Decimal(0))
    if (sumWeights.equals(0)) {
      // Return equal weights if sum is zero
      const equalWeight = new Decimal(1).div(n)
      return Array(n).fill(equalWeight)
    }
    
    return newWeights.map(w => w.div(sumWeights))
  }
  
  private calculatePortfolioRisk(
    weights: Decimal[],
    volatilities: Decimal[],
    correlations: Decimal[][]
  ): Decimal {
    let variance = new Decimal(0)
    
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const wi = weights[i]
        const wj = weights[j]
        const voli = volatilities[i]
        const volj = volatilities[j]
        const corrij = correlations[i]?.[j]
        
        if (wi && wj && voli && volj && corrij !== undefined) {
          variance = variance.plus(
            wi.times(wj)
              .times(voli)
              .times(volj)
              .times(corrij)
          )
        }
      }
    }
    
    return variance.sqrt()
  }
  
  private calculateHistoricalSignals(
    spread: Decimal[],
    mean: Decimal,
    stdDev: Decimal,
    threshold: number
  ): Decimal[] {
    return spread.map(s => {
      const zScore = s.minus(mean).div(stdDev)
      if (zScore.abs().greaterThan(threshold)) {
        return zScore.negated().div(threshold)
      }
      return new Decimal(0)
    })
  }
  
  private calculateHitRate(signals: Decimal[]): number {
    let hits = 0
    let total = 0
    
    for (let i = 0; i < signals.length - 1; i++) {
      const signal = signals[i]
      const nextSignal = signals[i + 1]
      
      if (!signal || !nextSignal || signal.equals(0)) {
        continue
      }
      
      total++
      // Check if signal was profitable
      if (signal.greaterThan(0) && nextSignal.lessThan(signal)) {
        hits++
      } else if (signal.lessThan(0) && nextSignal.greaterThan(signal)) {
        hits++
      }
    }
    
    return total > 0 ? hits / total : 0.5
  }
  
  private calculateTrendStrength(prices: Decimal[]): Decimal {
    // Use R-squared of linear regression as trend strength
    const n = prices.length
    const X: Decimal[][] = []
    
    for (let i = 0; i < n; i++) {
      X.push([new Decimal(1), new Decimal(i)])
    }
    
    const coefficients = this.ordinaryLeastSquares(X, prices)
    return this.calculateRSquared(X, prices, coefficients)
  }
  
  private calculateMomentumContinuation(
    prices: Decimal[],
    lookback: number,
    holding: number
  ): Decimal {
    // Historical analysis of momentum continuation
    let continuationSum = new Decimal(0)
    let count = 0
    
    for (let i = lookback; i < prices.length - holding; i++) {
      const priceNow = prices[i]
      const pricePast = prices[i - lookback]
      const priceFuture = prices[i + holding]
      
      if (!priceNow || !pricePast || !priceFuture) {
        continue
      }
      
      const pastReturn = priceNow.minus(pricePast).div(pricePast)
      const futureReturn = priceFuture.minus(priceNow).div(priceNow)
      
      if (pastReturn.abs().greaterThan(0.05)) {
        const continuation = futureReturn.div(pastReturn)
        continuationSum = continuationSum.plus(continuation.abs())
        count++
      }
    }
    
    return count > 0 ? continuationSum.div(count) : new Decimal(0.5)
  }
  
  private calculateBacktestMetrics(returns: Decimal[]): BacktestResult {
    const cumulativeReturn = returns.reduce((prod, r) => 
      prod.times(new Decimal(1).plus(r)), new Decimal(1)
    ).minus(1)
    
    const annualizedReturn = cumulativeReturn.pow(new Decimal(252).div(returns.length)).minus(1)
    const volatility = this.calculateStdDev(returns).times(Decimal.sqrt(252))
    const sharpeRatio = annualizedReturn.div(volatility)
    
    // Calculate max drawdown
    let peak = new Decimal(1)
    let maxDrawdown = new Decimal(0)
    let cumulative = new Decimal(1)
    
    for (const r of returns) {
      cumulative = cumulative.times(new Decimal(1).plus(r))
      if (cumulative.greaterThan(peak)) {
        peak = cumulative
      }
      const drawdown = peak.minus(cumulative).div(peak)
      if (drawdown.greaterThan(maxDrawdown)) {
        maxDrawdown = drawdown
      }
    }
    
    // Calculate win rate
    const wins = returns.filter(r => r.greaterThan(0)).length
    const winRate = wins / returns.length
    
    // Calculate profit factor
    const gains = returns.filter(r => r.greaterThan(0))
      .reduce((sum, r) => sum.plus(r), new Decimal(0))
    const losses = returns.filter(r => r.lessThan(0))
      .reduce((sum, r) => sum.plus(r.abs()), new Decimal(0))
    
    const profitFactor = losses.equals(0) ? new Decimal(999) : gains.div(losses)
    
    return {
      returns,
      cumulativeReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor
    }
  }
  
  // Portfolio optimization methods
  
  private equalWeightPortfolio(
    expectedReturns: Decimal[],
    covariance: Decimal[][]
  ): PortfolioOptimization {
    const n = expectedReturns.length
    const weight = new Decimal(1).div(n)
    const weights = Array(n).fill(weight)
    
    return this.calculatePortfolioMetrics(weights, expectedReturns, covariance)
  }
  
  private riskParityOptimization(
    expectedReturns: Decimal[],
    covariance: Decimal[][]
  ): PortfolioOptimization {
    const volatilities = covariance.map((row, i) => {
      const variance = row[i]
      return variance ? Decimal.sqrt(variance) : new Decimal(0.01) // Default small volatility
    })
    
    const correlations = this.covarianceToCorrelation(covariance, volatilities)
    
    const weights = this.calculateRiskParity({
      volatilities,
      correlations
    })
    
    return this.calculatePortfolioMetrics(weights, expectedReturns, covariance)
  }
  
  private minimumVariancePortfolio(
    expectedReturns: Decimal[],
    covariance: Decimal[][],
    constraints?: any
  ): PortfolioOptimization {
    // Simplified - production would use quadratic programming
    const n = expectedReturns.length
    
    // Use inverse variance weighting as approximation
    const variances = covariance.map((row, i) => row[i] || new Decimal(1))
    const invVar = variances.map(v => new Decimal(1).div(v))
    const sumInvVar = invVar.reduce((sum, iv) => sum.plus(iv), new Decimal(0))
    
    const weights = invVar.map(iv => iv.div(sumInvVar))
    
    return this.calculatePortfolioMetrics(weights, expectedReturns, covariance)
  }
  
  private maximumSharpePortfolio(
    expectedReturns: Decimal[],
    covariance: Decimal[][],
    constraints?: any
  ): PortfolioOptimization {
    // Simplified - use tangency portfolio approximation
    const riskFree = new Decimal(0.02) // 2% risk-free rate
    const excessReturns = expectedReturns.map(r => r.minus(riskFree))
    
    try {
      // Solve for tangency portfolio
      const covInv = this.matrixInverse(covariance)
      const weights_raw = this.matrixVectorMultiply(covInv, excessReturns)
      const sumWeights = weights_raw.reduce((sum, w) => sum.plus(w), new Decimal(0))
      
      if (sumWeights.equals(0)) {
        // Fallback to equal weights
        return this.equalWeightPortfolio(expectedReturns, covariance)
      }
      
      const weights = weights_raw.map(w => w.div(sumWeights))
      return this.calculatePortfolioMetrics(weights, expectedReturns, covariance)
      
    } catch (error) {
      // Fallback to equal weights if matrix inversion fails
      return this.equalWeightPortfolio(expectedReturns, covariance)
    }
  }
  
  private meanVarianceOptimization(
    expectedReturns: Decimal[],
    covariance: Decimal[][],
    constraints?: any
  ): PortfolioOptimization {
    // Default to maximum Sharpe for mean-variance
    return this.maximumSharpePortfolio(expectedReturns, covariance, constraints)
  }
  
  private calculatePortfolioMetrics(
    weights: Decimal[],
    expectedReturns: Decimal[],
    covariance: Decimal[][]
  ): PortfolioOptimization {
    // Expected return with safe access
    const expectedReturn = weights.reduce((sum, w, i) => {
      const ret = expectedReturns[i]
      return ret ? sum.plus(w.times(ret)) : sum
    }, new Decimal(0))
    
    // Portfolio variance with safe access
    let variance = new Decimal(0)
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const wi = weights[i]
        const wj = weights[j]
        const covRow = covariance[i]
        const covij = covRow?.[j]
        
        if (wi && wj && covij !== undefined) {
          variance = variance.plus(wi.times(wj).times(covij))
        }
      }
    }
    
    const risk = variance.sqrt()
    const riskFree = new Decimal(0.02)
    
    let sharpeRatio = new Decimal(0)
    if (risk.greaterThan(0)) {
      sharpeRatio = expectedReturn.minus(riskFree).div(risk)
    }
    
    return {
      weights,
      expectedReturn,
      risk,
      sharpeRatio
    }
  }
  
  private covarianceToCorrelation(
    covariance: Decimal[][],
    volatilities: Decimal[]
  ): Decimal[][] {
    const n = volatilities.length
    const correlation: Decimal[][] = []
    
    for (let i = 0; i < n; i++) {
      correlation[i] = []
      const covRow = covariance[i]
      const volI = volatilities[i]
      
      if (!covRow || !volI) {
        // Fill with zeros if missing data
        correlation[i] = Array(n).fill(new Decimal(0))
        continue
      }
      
      for (let j = 0; j < n; j++) {
        const volJ = volatilities[j]
        const covRow = covariance[i]
        const covij = covRow?.[j]
        
        if (volJ && covij !== undefined && volI.greaterThan(0) && volJ.greaterThan(0)) {
          correlation[i]![j] = covij.div(volI.times(volJ))
        } else if (i === j) {
          correlation[i]![j] = new Decimal(1) // Diagonal should be 1
        } else {
          correlation[i]![j] = new Decimal(0)
        }
      }
    }
    
    return correlation
  }
  
  // Matrix operations
  
  private transpose(matrix: Decimal[][]): Decimal[][] {
    const rows = matrix.length
    const cols = matrix[0]?.length || 0
    const result: Decimal[][] = []
    
    for (let j = 0; j < cols; j++) {
      result[j] = []
      for (let i = 0; i < rows; i++) {
        const matrixRow = matrix[i]
        result[j]![i] = matrixRow ? (matrixRow[j] || new Decimal(0)) : new Decimal(0)
      }
    }
    
    return result
  }
  
  private matrixMultiply(A: Decimal[][], B: Decimal[][]): Decimal[][] {
    const rows = A.length
    const cols = B[0]?.length || 0
    const common = B.length
    const result: Decimal[][] = []
    
    for (let i = 0; i < rows; i++) {
      result[i] = []
      const rowA = A[i]
      
      if (!rowA) {
        result[i] = Array(cols).fill(new Decimal(0))
        continue
      }
      
      for (let j = 0; j < cols; j++) {
        let sum = new Decimal(0)
        for (let k = 0; k < common; k++) {
          const aVal = rowA[k]
          const rowB = B[k]
          const bVal = rowB?.[j]
          
          if (aVal && bVal) {
            sum = sum.plus(aVal.times(bVal))
          }
        }
        result[i]![j] = sum
      }
    }
    
    return result
  }
  
  private matrixVectorMultiply(A: Decimal[][], b: Decimal[]): Decimal[] {
    return A.map(row => 
      row.reduce((sum, a, i) => {
        const bVal = b[i]
        return bVal ? sum.plus(a.times(bVal)) : sum
      }, new Decimal(0))
    )
  }
  
  private matrixInverse(matrix: Decimal[][]): Decimal[][] {
    // Gauss-Jordan elimination
    const n = matrix.length
    const augmented: Decimal[][] = []
    
    // Create augmented matrix [A | I]
    for (let i = 0; i < n; i++) {
      augmented[i] = []
      const matrixRow = matrix[i]
      for (let j = 0; j < n; j++) {
        const val = matrixRow?.[j]
        augmented[i]![j] = val || new Decimal(0)
      }
      for (let j = 0; j < n; j++) {
        augmented[i]![n + j] = i === j ? new Decimal(1) : new Decimal(0)
      }
    }
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Partial pivoting
      let maxRow = i
      for (let k = i + 1; k < n; k++) {
        const augmentedK = augmented[k]
        const augmentedMax = augmented[maxRow]
        const currentVal = augmentedK?.[i] || new Decimal(0)
        const maxVal = augmentedMax?.[i] || new Decimal(0)
        if (currentVal.abs().greaterThan(maxVal.abs())) {
          maxRow = k
        }
      }
      
      // Swap rows if necessary
      const augmentedI = augmented[i]
      const augmentedMaxRow = augmented[maxRow]
      if (maxRow !== i && augmentedI && augmentedMaxRow) {
        augmented[i] = augmentedMaxRow
        augmented[maxRow] = augmentedI
      }
      
      // Scale pivot row
      const pivotRow = augmented[i]
      const pivot = pivotRow?.[i] || new Decimal(1)
      if (pivot.equals(0)) {
        throw new Error('Matrix is singular and cannot be inverted')
      }
      
      if (pivotRow) {
        for (let j = 0; j < 2 * n; j++) {
          const currentVal = pivotRow[j]
          if (currentVal !== undefined) {
            pivotRow[j] = currentVal.div(pivot)
          }
        }
      }
      
      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const currentRow = augmented[k]
          const factor = currentRow?.[i] || new Decimal(0)
          if (currentRow && pivotRow) {
            for (let j = 0; j < 2 * n; j++) {
              const pivotVal = pivotRow[j] || new Decimal(0)
              const currentVal = currentRow[j] || new Decimal(0)
              currentRow[j] = currentVal.minus(factor.times(pivotVal))
            }
          }
        }
      }
    }
    
    // Extract inverse from augmented matrix
    const inverse: Decimal[][] = []
    for (let i = 0; i < n; i++) {
      const augRow = augmented[i]
      if (augRow && augRow.length >= 2 * n) {
        inverse[i] = augRow.slice(n)
      } else {
        inverse[i] = Array(n).fill(new Decimal(0))
      }
    }
    
    return inverse
  }
  
  // Statistical utilities
  
  private calculateMean(values: Decimal[]): Decimal {
    if (values.length === 0) return new Decimal(0)
    return values.reduce((sum, v) => sum.plus(v), new Decimal(0)).div(values.length)
  }
  
  private calculateStdDev(values: Decimal[]): Decimal {
    if (values.length < 2) return new Decimal(0)
    const mean = this.calculateMean(values)
    const squaredDiffs = values.map(v => v.minus(mean).pow(2))
    const variance = squaredDiffs.reduce((sum, sd) => sum.plus(sd), new Decimal(0))
      .div(values.length - 1)
    return variance.sqrt()
  }
}

// Export singleton instance
export const factorModels = new FactorModelsClass()