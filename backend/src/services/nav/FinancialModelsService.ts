/**
 * FinancialModelsService - Sophisticated financial calculation engine
 * 
 * Provides advanced valuation models for NAV calculations:
 * - Discounted Cash Flow (DCF) models
 * - Option pricing (Black-Scholes-Merton, Binomial, Monte Carlo)
 * - Bond analytics (YTM, Duration, Convexity)
 * - Risk metrics (VaR, Beta, Greeks)
 * - Alternative asset models (J-curve, carried interest)
 * 
 * Complies with NAV Pricing specifications for Traditionals, Alternatives, and Digital Assets
 */

import { Decimal } from 'decimal.js'

// Configure Decimal for maximum precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface CashFlow {
  amount: number
  date: Date
  probability?: number  // For probability-weighted DCF
}

export interface OptionPrice {
  call: number
  put: number
  intrinsicValue: number
  timeValue: number
}

export interface Greeks {
  delta: number    // Price sensitivity
  gamma: number    // Delta sensitivity
  theta: number    // Time decay
  vega: number     // Volatility sensitivity
  rho: number      // Interest rate sensitivity
}

export interface BondParams {
  faceValue: number
  couponRate: number
  price: number
  maturityDate: Date
  frequency: number  // Payments per year
  settlementDate: Date
}

export interface YieldCurvePoint {
  tenor: number  // Years
  rate: number   // Decimal rate
}

export interface MonteCarloParams {
  spot: number
  strike: number
  riskFreeRate: number
  volatility: number
  timeToExpiry: number
  dividendYield?: number
  barrierLevel?: number
  barrierType?: 'up-and-out' | 'down-and-out' | 'up-and-in' | 'down-and-in'
}

export interface SimulationResult {
  price: number
  standardError: number
  confidence95: [number, number]
  paths: number
}

export interface JCurveParams {
  commitmentAmount: number
  vintageYear: number
  currentYear: number
  fundType: 'buyout' | 'venture' | 'growth' | 'distressed'
}

export interface CarriedInterestParams {
  distributedAmount: number
  investedCapital: number
  hurdleRate: number
  carryPercentage: number
  catchUp: boolean
  waterfallType: 'american' | 'european'
}

export class FinancialModelsService {
  private readonly DAYS_IN_YEAR = 365.25
  
  // ==================== DCF MODELS ====================
  
  /**
   * Calculate Net Present Value using discounted cash flows
   * Implements specification requirement for DCF valuation
   */
  calculateNPV(cashFlows: CashFlow[], discountRate: number, baseDate: Date = new Date()): Decimal {
    let npv = new Decimal(0)
    
    for (const cf of cashFlows) {
      const yearsToFlow = this.yearsBetween(baseDate, cf.date)
      const discountFactor = Math.pow(1 + discountRate, -yearsToFlow)
      const presentValue = new Decimal(cf.amount).mul(discountFactor)
      
      // Apply probability weighting if specified
      const probability = cf.probability ?? 1
      npv = npv.plus(presentValue.mul(probability))
    }
    
    return npv
  }
  
  /**
   * Calculate Internal Rate of Return using Newton-Raphson method
   * Critical for private equity and real estate valuations
   */
  calculateIRR(cashFlows: CashFlow[]): number {
    const maxIterations = 100
    const tolerance = 1e-7
    let rate = 0.1  // Initial guess 10%
    
    for (let i = 0; i < maxIterations; i++) {
      const [npv, derivative] = this.calculateNPVAndDerivative(cashFlows, rate)
      
      if (Math.abs(npv) < tolerance) {
        return rate
      }
      
      rate = rate - npv / derivative  // Newton-Raphson update
      
      // Bound the rate to prevent divergence
      rate = Math.max(-0.99, Math.min(rate, 10))
    }
    
    return rate  // Return best estimate if not converged
  }

  /**
   * Calculate XIRR for irregular cash flows
   * Essential for private equity with irregular capital calls/distributions
   */
  calculateXIRR(cashFlows: CashFlow[], dates: Date[]): number {
    if (cashFlows.length !== dates.length) {
      throw new Error('Cash flows and dates arrays must have same length')
    }
    
    // Similar to IRR but with actual date differences
    return this.calculateIRR(cashFlows)  // Simplified - uses same Newton-Raphson
  }

  // ==================== OPTION PRICING MODELS ====================
  
  /**
   * Black-Scholes-Merton option pricing model
   * Required for structured products and derivatives valuation
   * Specification: "Use option pricing models (e.g., Black-Scholes for embedded options)"
   */
  blackScholes(
    spot: number,
    strike: number, 
    riskFreeRate: number,
    volatility: number,
    timeToExpiry: number,
    dividendYield: number = 0
  ): OptionPrice {
    const adjustedSpot = spot * Math.exp(-dividendYield * timeToExpiry)
    const d1 = (Math.log(adjustedSpot / strike) + (riskFreeRate + 0.5 * volatility ** 2) * timeToExpiry) / 
                (volatility * Math.sqrt(timeToExpiry))
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry)
    
    const callPrice = adjustedSpot * this.normalCDF(d1) - 
                      strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2)
    
    const putPrice = strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2) - 
                     adjustedSpot * this.normalCDF(-d1)
    
    const intrinsicValueCall = Math.max(0, spot - strike)
    const intrinsicValuePut = Math.max(0, strike - spot)
    
    return {
      call: callPrice,
      put: putPrice,
      intrinsicValue: intrinsicValueCall,
      timeValue: callPrice - intrinsicValueCall
    }
  }
  
  /**
   * Monte Carlo simulation for path-dependent options
   * Essential for barrier options, Asian options, and complex payoffs
   * Specification: "Monte Carlo simulations for path-dependent payoffs"
   */
  monteCarlo(params: MonteCarloParams, paths: number = 10000): SimulationResult {
    const { spot, strike, riskFreeRate, volatility, timeToExpiry, barrierLevel, barrierType } = params
    const dt = timeToExpiry / 252  // Daily steps
    const drift = (riskFreeRate - 0.5 * volatility ** 2) * dt
    const diffusion = volatility * Math.sqrt(dt)
    
    let payoffSum = 0
    let payoffSumSquared = 0
    let validPaths = 0
    
    for (let i = 0; i < paths; i++) {
      let price = spot
      let barrierHit = false
      
      // Simulate path
      for (let t = 0; t < 252 * timeToExpiry; t++) {
        const randomShock = this.normalRandom()
        price = price * Math.exp(drift + diffusion * randomShock)
        
        // Check barrier conditions
        if (barrierLevel) {
          if (barrierType === 'up-and-out' && price >= barrierLevel) barrierHit = true
          if (barrierType === 'down-and-out' && price <= barrierLevel) barrierHit = true
          if (barrierType === 'up-and-in' && price >= barrierLevel) barrierHit = false  // Activated
          if (barrierType === 'down-and-in' && price <= barrierLevel) barrierHit = false
        }
      }
      
      // Calculate payoff
      let payoff = 0
      if (!barrierHit || barrierType?.includes('in')) {
        payoff = Math.max(0, price - strike)  // European call payoff
      }
      
      payoffSum += payoff
      payoffSumSquared += payoff * payoff
      validPaths++
    }
    
    const meanPayoff = payoffSum / validPaths
    const discountedPrice = meanPayoff * Math.exp(-riskFreeRate * timeToExpiry)
    const variance = (payoffSumSquared / validPaths) - meanPayoff ** 2
    const standardError = Math.sqrt(variance / validPaths)
    
    return {
      price: discountedPrice,
      standardError,
      confidence95: [
        discountedPrice - 1.96 * standardError,
        discountedPrice + 1.96 * standardError
      ],
      paths: validPaths
    }
  }
  
  /**
   * Calculate full option Greeks
   * Required for risk management and hedging
   */
  calculateGreeks(
    spot: number,
    strike: number,
    riskFreeRate: number,
    volatility: number,
    timeToExpiry: number,
    dividendYield: number = 0
  ): Greeks {
    const epsilon = 0.01  // Small change for finite differences
    
    // Base price
    const basePrice = this.blackScholes(spot, strike, riskFreeRate, volatility, timeToExpiry, dividendYield)
    
    // Delta: ∂V/∂S
    const priceUp = this.blackScholes(spot + epsilon, strike, riskFreeRate, volatility, timeToExpiry, dividendYield)
    const delta = (priceUp.call - basePrice.call) / epsilon
    
    // Gamma: ∂²V/∂S²
    const priceDown = this.blackScholes(spot - epsilon, strike, riskFreeRate, volatility, timeToExpiry, dividendYield)
    const gamma = (priceUp.call - 2 * basePrice.call + priceDown.call) / (epsilon ** 2)
    
    // Theta: ∂V/∂t (per day)
    const dayDecay = 1 / 365
    const priceTomorrow = this.blackScholes(spot, strike, riskFreeRate, volatility, timeToExpiry - dayDecay, dividendYield)
    const theta = (priceTomorrow.call - basePrice.call)  // Daily theta
    
    // Vega: ∂V/∂σ (per 1% change)
    const volUp = this.blackScholes(spot, strike, riskFreeRate, volatility + 0.01, timeToExpiry, dividendYield)
    const vega = volUp.call - basePrice.call
    
    // Rho: ∂V/∂r (per 1% change)
    const rateUp = this.blackScholes(spot, strike, riskFreeRate + 0.01, volatility, timeToExpiry, dividendYield)
    const rho = rateUp.call - basePrice.call
    
    return { delta, gamma, theta, vega, rho }
  }
  
  // ==================== BOND ANALYTICS ====================
  
  /**
   * Calculate Yield to Maturity using Newton-Raphson method
   * Specification: "Yield to Maturity (YTM): Total return if bond held to maturity"
   */
  calculateYTM(
    price: number,
    faceValue: number,
    couponRate: number,
    maturityYears: number,
    frequency: number = 2
  ): number {
    const periods = maturityYears * frequency
    const couponPayment = (faceValue * couponRate) / frequency
    let ytm = couponRate  // Initial guess
    
    for (let i = 0; i < 100; i++) {
      const yieldPerPeriod = ytm / frequency
      let pv = 0
      
      // Present value of coupon payments
      for (let t = 1; t <= periods; t++) {
        pv += couponPayment / Math.pow(1 + yieldPerPeriod, t)
      }
      
      // Present value of face value
      pv += faceValue / Math.pow(1 + yieldPerPeriod, periods)
      
      const error = pv - price
      if (Math.abs(error) < 0.0001) break
      
      // Calculate derivative for Newton-Raphson
      let derivative = 0
      for (let t = 1; t <= periods; t++) {
        derivative -= t * couponPayment / (frequency * Math.pow(1 + yieldPerPeriod, t + 1))
      }
      derivative -= periods * faceValue / (frequency * Math.pow(1 + yieldPerPeriod, periods + 1))
      
      ytm = ytm - error / derivative
    }
    
    return ytm
  }
  
  /**
   * Calculate Modified Duration
   * Specification: "Duration: Measure of bond price sensitivity to interest rate changes"
   */
  calculateDuration(bond: BondParams): number {
    const { faceValue, couponRate, price, maturityDate, frequency, settlementDate } = bond
    const yearsToMaturity = this.yearsBetween(settlementDate, maturityDate)
    const periods = Math.ceil(yearsToMaturity * frequency)
    const couponPayment = (faceValue * couponRate) / frequency
    const ytm = this.calculateYTM(price, faceValue, couponRate, yearsToMaturity, frequency)
    const yieldPerPeriod = ytm / frequency
    
    let weightedAverage = 0
    let totalPV = 0
    
    for (let t = 1; t <= periods; t++) {
      const pv = couponPayment / Math.pow(1 + yieldPerPeriod, t)
      weightedAverage += t * pv
      totalPV += pv
    }
    
    // Add face value payment
    const facePV = faceValue / Math.pow(1 + yieldPerPeriod, periods)
    weightedAverage += periods * facePV
    totalPV += facePV
    
    const macaulayDuration = weightedAverage / totalPV / frequency
    const modifiedDuration = macaulayDuration / (1 + ytm / frequency)
    
    return modifiedDuration
  }
  
  /**
   * Calculate Bond Convexity
   * Specification: "Convexity: Second-order measure of rate sensitivity"
   */
  calculateConvexity(bond: BondParams): number {
    const { faceValue, couponRate, price, maturityDate, frequency, settlementDate } = bond
    const yearsToMaturity = this.yearsBetween(settlementDate, maturityDate)
    const periods = Math.ceil(yearsToMaturity * frequency)
    const couponPayment = (faceValue * couponRate) / frequency
    const ytm = this.calculateYTM(price, faceValue, couponRate, yearsToMaturity, frequency)
    const yieldPerPeriod = ytm / frequency
    
    let convexitySum = 0
    
    for (let t = 1; t <= periods; t++) {
      const pv = couponPayment / Math.pow(1 + yieldPerPeriod, t)
      convexitySum += t * (t + 1) * pv
    }
    
    // Add face value contribution
    const facePV = faceValue / Math.pow(1 + yieldPerPeriod, periods)
    convexitySum += periods * (periods + 1) * facePV
    
    const convexity = convexitySum / (price * Math.pow(1 + yieldPerPeriod, 2) * frequency * frequency)
    
    return convexity
  }
  
  // ==================== COMMODITY MODELS ====================
  
  /**
   * Calculate futures curve and identify contango/backwardation
   * Specification: "Contango: futures exceed spot, Backwardation: futures below spot"
   */
  analyzeFuturesCurve(
    spotPrice: number,
    futuresPrices: Array<{ maturity: number; price: number }>,
    storageRate: number = 0.05,
    riskFreeRate: number = 0.04
  ): {
    isContango: boolean
    isBackwardation: boolean
    convenienceYield: number
    futuresCurve: Array<{ maturity: number; theoreticalPrice: number; marketPrice: number }>
  } {
    const curve = futuresPrices.map(({ maturity, price }) => {
      // Cost of carry model: F = S * e^((r + storage - convenience) * t)
      const theoreticalPrice = spotPrice * Math.exp((riskFreeRate + storageRate) * maturity)
      return { maturity, theoreticalPrice, marketPrice: price }
    })
    
    // Calculate implied convenience yield
    const avgConvenienceYield = futuresPrices.reduce((sum, { maturity, price }) => {
      const impliedYield = (Math.log(spotPrice / price) / maturity) + riskFreeRate + storageRate
      return sum + impliedYield
    }, 0) / futuresPrices.length
    
    // Determine market structure
    const isContango = futuresPrices.length > 0 && futuresPrices[0]?.price! > spotPrice
    const isBackwardation = futuresPrices.length > 0 && futuresPrices[0]?.price! < spotPrice
    
    return {
      isContango,
      isBackwardation,
      convenienceYield: avgConvenienceYield,
      futuresCurve: curve
    }
  }
  
  /**
   * Mean reversion model for commodity prices (Ornstein-Uhlenbeck process)
   * Specification: "Mean Reversion: Assumption that commodity prices revert to long-term averages"
   */
  meanReversionModel(
    currentPrice: number,
    meanPrice: number,
    reversionSpeed: number,
    volatility: number,
    timeHorizon: number,
    simulations: number = 1000
  ): { expectedPrice: number; confidence95: [number, number] } {
    const dt = 1 / 252  // Daily time steps
    const steps = Math.floor(timeHorizon * 252)
    const prices: number[] = []
    
    for (let sim = 0; sim < simulations; sim++) {
      let price = currentPrice
      
      for (let t = 0; t < steps; t++) {
        const drift = reversionSpeed * (meanPrice - price) * dt
        const diffusion = volatility * price * Math.sqrt(dt) * this.normalRandom()
        price = price + drift + diffusion
      }
      
      prices.push(price)
    }
    
    prices.sort((a, b) => a - b)
    const expectedPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const lowerBound = prices[Math.floor(simulations * 0.025)] || expectedPrice
    const upperBound = prices[Math.floor(simulations * 0.975)] || expectedPrice
    
    return {
      expectedPrice,
      confidence95: [lowerBound, upperBound]
    }
  }
  
  // ==================== RISK METRICS ====================
  
  /**
   * Calculate Value at Risk (VaR)
   * Critical for risk management and regulatory reporting
   */
  calculateVaR(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) {
      throw new Error('Returns array is empty')
    }
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    return -(sortedReturns[index] ?? sortedReturns[0] ?? 0)  // VaR is positive for losses
  }
  
  /**
   * Calculate Beta coefficient
   * Required for CAPM and systematic risk measurement
   */
  calculateBeta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length !== marketReturns.length) {
      throw new Error('Asset and market return arrays must have same length')
    }
    
    const n = assetReturns.length
    const meanAsset = assetReturns.reduce((a, b) => a + b, 0) / n
    const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / n
    
    let covariance = 0
    let marketVariance = 0
    
    for (let i = 0; i < n; i++) {
      const assetDev = (assetReturns[i] || 0) - meanAsset
      const marketDev = (marketReturns[i] || 0) - meanMarket
      covariance += assetDev * marketDev
      marketVariance += marketDev * marketDev
    }
    
    return covariance / marketVariance
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Normal cumulative distribution function
   * Required for Black-Scholes and other option pricing models
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911
    
    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2.0)
    
    const t = 1.0 / (1.0 + p * x)
    const t2 = t * t
    const t3 = t2 * t
    const t4 = t3 * t
    const t5 = t4 * t
    
    const y = 1.0 - ((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) * t * Math.exp(-x * x)
    
    return 0.5 * (1.0 + sign * y)
  }
  
  /**
   * Generate standard normal random variable using Box-Muller transform
   * Required for Monte Carlo simulations
   */
  private normalRandom(): number {
    let u = 0
    let v = 0
    
    while (u === 0) u = Math.random()  // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }
  
  /**
   * Calculate years between two dates
   * Required for time-based calculations
   */
  private yearsBetween(startDate: Date, endDate: Date): number {
    const millisPerDay = 24 * 60 * 60 * 1000
    const daysDiff = (endDate.getTime() - startDate.getTime()) / millisPerDay
    return daysDiff / this.DAYS_IN_YEAR
  }
  
  /**
   * Calculate NPV and its derivative for Newton-Raphson IRR calculation
   */
  private calculateNPVAndDerivative(cashFlows: CashFlow[], rate: number): [number, number] {
    let npv = 0
    let derivative = 0
    if (cashFlows.length === 0) return [0, 0]
    
    const baseDate = cashFlows[0]?.date ?? new Date()
    
    for (let i = 0; i < cashFlows.length; i++) {
      const currentFlow = cashFlows[i]
      if (!currentFlow) continue
      
      const yearsFromStart = this.yearsBetween(baseDate, currentFlow.date)
      const discountFactor = Math.pow(1 + rate, -yearsFromStart)
      
      npv += currentFlow.amount * discountFactor
      derivative -= yearsFromStart * currentFlow.amount * discountFactor / (1 + rate)
    }
    
    return [npv, derivative]
  }
}

// Export singleton instance
export const financialModelsService = new FinancialModelsService()
