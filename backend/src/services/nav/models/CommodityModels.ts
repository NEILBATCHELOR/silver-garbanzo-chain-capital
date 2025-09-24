/**
 * CommodityModels - Institutional-grade financial models for commodity valuation
 * 
 * Implements comprehensive commodity pricing models according to NAV Pricing - Traditionals specification
 * 
 * Key Features:
 * - Futures curve modeling (contango/backwardation analysis)
 * - Mean reversion models for price dynamics
 * - Convenience yield calculations
 * - Jump-diffusion models for volatility spikes
 * - Storage cost incorporation
 * - Seasonality adjustments for energy commodities
 * - Spot-futures parity relationships
 * 
 * Supports physical commodities (metals, energy, agriculture) and commodity derivatives
 */

import { Decimal } from 'decimal.js'

export interface FuturesCurveParams {
  spotPrice: Decimal
  storageRate: Decimal // Annual storage cost rate
  convenienceYield: Decimal // Annual convenience yield
  riskFreeRate: Decimal
  timeToMaturity: Decimal // In years
}

export interface MeanReversionParams {
  currentPrice: Decimal
  longTermMean: Decimal
  meanReversionSpeed: Decimal // Kappa
  volatility: Decimal
  timeHorizon: Decimal
}

export interface JumpDiffusionParams {
  currentPrice: Decimal
  drift: Decimal
  diffusionVol: Decimal
  jumpIntensity: Decimal // Lambda - frequency of jumps
  jumpMean: Decimal
  jumpVol: Decimal
  time: Decimal
}

export interface SeasonalityParams {
  basePrice: Decimal
  month: number // 1-12
  commodity: 'natural_gas' | 'heating_oil' | 'gasoline' | 'corn' | 'wheat' | 'other'
}

export interface ConvenienceYieldResult {
  convenienceYield: Decimal
  isBackwardation: boolean
  isContango: boolean
  storageArbitrage: Decimal
}

export interface FuturesPriceResult {
  futuresPrice: Decimal
  basis: Decimal // Futures - Spot
  basisPercentage: Decimal
  marketStructure: 'contango' | 'backwardation' | 'normal'
  rollYield: Decimal
}

export interface CommodityValuationResult {
  spotValue: Decimal
  futuresValue: Decimal
  convenienceYield: Decimal
  storageCosts: Decimal
  totalValue: Decimal
  marketStructure: string
  seasonalAdjustment?: Decimal
}

export class CommodityModels {
  private static instance: CommodityModels
  private readonly PRECISION = 28

  constructor() {
    // Configure Decimal precision
    Decimal.set({ precision: this.PRECISION })
  }

  static getInstance(): CommodityModels {
    if (!CommodityModels.instance) {
      CommodityModels.instance = new CommodityModels()
    }
    return CommodityModels.instance
  }

  /**
   * Calculate futures price using cost-of-carry model
   * F = S * e^((r + u - y) * T)
   * where u = storage costs, y = convenience yield
   * 
   * Spec: "Contango: Market condition where futures exceed spot"
   */
  calculateFuturesCurve(params: FuturesCurveParams): FuturesPriceResult {
    const { spotPrice, storageRate, convenienceYield, riskFreeRate, timeToMaturity } = params

    // Cost of carry rate
    const costOfCarry = riskFreeRate.plus(storageRate).minus(convenienceYield)
    
    // Futures price calculation
    const exponent = costOfCarry.times(timeToMaturity)
    const futuresPrice = spotPrice.times(Decimal.exp(exponent))
    
    // Basis calculation
    const basis = futuresPrice.minus(spotPrice)
    const basisPercentage = basis.div(spotPrice).times(100)
    
    // Determine market structure
    let marketStructure: 'contango' | 'backwardation' | 'normal'
    if (basis.greaterThan(0.01)) {
      marketStructure = 'contango'
    } else if (basis.lessThan(-0.01)) {
      marketStructure = 'backwardation'
    } else {
      marketStructure = 'normal'
    }
    
    // Calculate roll yield (negative in contango, positive in backwardation)
    const annualizedBasis = basisPercentage.div(timeToMaturity)
    const rollYield = annualizedBasis.neg() // Negative of basis gives roll yield
    
    return {
      futuresPrice,
      basis,
      basisPercentage,
      marketStructure,
      rollYield
    }
  }

  /**
   * Mean reversion model (Ornstein-Uhlenbeck process)
   * Used for commodity prices that tend to revert to long-term averages
   * 
   * Spec: "Mean Reversion: Assumption prices revert to long-term averages"
   */
  meanReversionModel(params: MeanReversionParams): Decimal {
    const { currentPrice, longTermMean, meanReversionSpeed, volatility, timeHorizon } = params
    
    // Expected price using Ornstein-Uhlenbeck formula
    // E[P_t] = P_0 * e^(-kappa*t) + theta * (1 - e^(-kappa*t))
    const decayFactor = Decimal.exp(meanReversionSpeed.neg().times(timeHorizon))
    const expectedPrice = currentPrice.times(decayFactor)
      .plus(longTermMean.times(new Decimal(1).minus(decayFactor)))
    
    // Variance of the process (for risk adjustment)
    const variance = volatility.pow(2)
      .times(new Decimal(1).minus(decayFactor.pow(2)))
      .div(meanReversionSpeed.times(2))
    
    // Risk-adjusted price (using 1 std deviation discount)
    const riskAdjustedPrice = expectedPrice.minus(Decimal.sqrt(variance))
    
    return riskAdjustedPrice
  }

  /**
   * Jump-diffusion model for commodity prices with sudden shocks
   * Captures both normal volatility and sudden price spikes
   * 
   * Spec: "Mark-to-model using stochastic processes"
   */
  jumpDiffusionModel(params: JumpDiffusionParams): Decimal {
    const { currentPrice, drift, diffusionVol, jumpIntensity, jumpMean, jumpVol, time } = params
    
    // Expected number of jumps
    const expectedJumps = jumpIntensity.times(time)
    
    // Diffusion component
    const diffusionDrift = drift.minus(diffusionVol.pow(2).div(2))
    const diffusionComponent = Decimal.exp(diffusionDrift.times(time))
    
    // Jump component
    // E[J] = exp(lambda * t * (exp(mu_j + sigma_j^2/2) - 1))
    const jumpEffect = Decimal.exp(
      jumpMean.plus(jumpVol.pow(2).div(2))
    ).minus(1)
    const jumpComponent = Decimal.exp(expectedJumps.times(jumpEffect))
    
    // Combined price
    const expectedPrice = currentPrice.times(diffusionComponent).times(jumpComponent)
    
    return expectedPrice
  }

  /**
   * Calculate implied convenience yield from spot and futures prices
   * 
   * Spec: "Convenience Yield: Benefit of holding physical commodity"
   */
  calculateConvenienceYield(
    spotPrice: Decimal,
    futuresPrice: Decimal,
    storageRate: Decimal,
    riskFreeRate: Decimal,
    timeToMaturity: Decimal
  ): ConvenienceYieldResult {
    // Rearranging futures formula: y = r + u - (1/T) * ln(F/S)
    const logRatio = Decimal.ln(futuresPrice.div(spotPrice))
    const impliedRate = logRatio.div(timeToMaturity)
    const convenienceYield = riskFreeRate.plus(storageRate).minus(impliedRate)
    
    // Determine market structure
    const isBackwardation = futuresPrice.lessThan(spotPrice)
    const isContango = futuresPrice.greaterThan(spotPrice)
    
    // Calculate storage arbitrage opportunity
    const theoreticalFutures = spotPrice.times(
      Decimal.exp(riskFreeRate.plus(storageRate).times(timeToMaturity))
    )
    const storageArbitrage = theoreticalFutures.minus(futuresPrice)
    
    return {
      convenienceYield,
      isBackwardation,
      isContango,
      storageArbitrage
    }
  }

  /**
   * Apply seasonality adjustments for energy and agricultural commodities
   * 
   * Spec: "Seasonality adjustments for energy commodities"
   */
  applySeasonalityAdjustment(params: SeasonalityParams): Decimal {
    const { basePrice, month, commodity } = params
    
    // Seasonal factors based on historical patterns
    const seasonalFactors: Record<string, number[]> = {
      natural_gas: [1.25, 1.20, 1.10, 0.95, 0.85, 0.80, 0.80, 0.85, 0.90, 1.00, 1.15, 1.25], // Winter peak
      heating_oil: [1.20, 1.15, 1.05, 0.95, 0.85, 0.80, 0.80, 0.85, 0.95, 1.05, 1.15, 1.20], // Winter peak
      gasoline: [0.95, 0.95, 1.00, 1.05, 1.10, 1.15, 1.15, 1.10, 1.05, 1.00, 0.95, 0.90], // Summer peak
      corn: [1.05, 1.05, 1.00, 0.95, 0.90, 0.90, 0.95, 1.00, 1.10, 1.15, 1.10, 1.05], // Harvest impact
      wheat: [1.00, 1.00, 0.95, 0.90, 0.85, 0.90, 1.00, 1.10, 1.15, 1.10, 1.05, 1.00], // Harvest impact
      other: [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00] // No seasonality
    }
    
    const factors = seasonalFactors[commodity] ?? seasonalFactors.other
    if (!factors || factors.length === 0) {
      return basePrice // No seasonality adjustment
    }
    const monthIndex = Math.max(0, Math.min(11, month - 1)) // Ensure valid index
    const factorValue = factors[monthIndex] ?? 1.00 // Fallback to 1.00 if undefined
    const seasonalFactor = new Decimal(factorValue)
    
    return basePrice.times(seasonalFactor)
  }

  /**
   * Comprehensive commodity valuation combining multiple models
   * 
   * Spec: "Mark-to-market via spot prices for liquid commodities"
   */
  calculateComprehensiveValue(
    spotPrice: Decimal,
    quantity: Decimal,
    params: {
      futuresPosition?: { price: Decimal; quantity: Decimal; maturity: Decimal }
      storageRate?: Decimal
      convenienceYield?: Decimal
      riskFreeRate?: Decimal
      seasonalAdjustment?: SeasonalityParams
      meanReversion?: MeanReversionParams
    }
  ): CommodityValuationResult {
    let totalValue = spotPrice.times(quantity)
    let futuresValue = new Decimal(0)
    let convenienceYield = new Decimal(0)
    let storageCosts = new Decimal(0)
    let seasonalAdjustment: Decimal | undefined
    let marketStructure = 'spot'

    // Apply futures valuation if position exists
    if (params.futuresPosition && params.storageRate && params.riskFreeRate) {
      const futuresCurve = this.calculateFuturesCurve({
        spotPrice,
        storageRate: params.storageRate,
        convenienceYield: params.convenienceYield || new Decimal(0.03),
        riskFreeRate: params.riskFreeRate,
        timeToMaturity: params.futuresPosition.maturity
      })
      
      futuresValue = futuresCurve.futuresPrice.times(params.futuresPosition.quantity)
      marketStructure = futuresCurve.marketStructure
      
      // Calculate storage costs
      storageCosts = spotPrice.times(quantity)
        .times(params.storageRate)
        .times(params.futuresPosition.maturity)
    }

    // Apply convenience yield if calculated
    if (params.convenienceYield) {
      convenienceYield = params.convenienceYield
    }

    // Apply seasonality adjustment
    if (params.seasonalAdjustment) {
      const adjustedPrice = this.applySeasonalityAdjustment(params.seasonalAdjustment)
      seasonalAdjustment = adjustedPrice.minus(params.seasonalAdjustment.basePrice)
      totalValue = adjustedPrice.times(quantity)
    }

    // Apply mean reversion model if provided
    if (params.meanReversion) {
      const meanReversionPrice = this.meanReversionModel(params.meanReversion)
      totalValue = meanReversionPrice.times(quantity)
    }

    // Calculate total value
    const finalValue = totalValue
      .plus(futuresValue)
      .plus(convenienceYield.times(quantity))
      .minus(storageCosts)

    return {
      spotValue: totalValue,
      futuresValue,
      convenienceYield,
      storageCosts,
      totalValue: finalValue,
      marketStructure,
      seasonalAdjustment
    }
  }

  /**
   * Calculate Value at Risk for commodity portfolio
   * Using historical simulation or parametric approach
   */
  calculateCommodityVaR(
    portfolioValue: Decimal,
    volatility: Decimal,
    confidenceLevel: Decimal = new Decimal(0.95),
    timeHorizon: Decimal = new Decimal(1) // Days
  ): Decimal {
    // Z-score for confidence level (approximation for 95% = 1.645)
    const zScore = confidenceLevel.equals(0.95) ? new Decimal(1.645) :
                   confidenceLevel.equals(0.99) ? new Decimal(2.326) :
                   new Decimal(1.645)
    
    // Daily VaR = Portfolio Value * Volatility * Z-score * sqrt(time)
    const dailyVolatility = volatility.div(Decimal.sqrt(252)) // Annualized to daily
    const VaR = portfolioValue.times(dailyVolatility)
      .times(zScore)
      .times(Decimal.sqrt(timeHorizon))
    
    return VaR
  }
}

// Export singleton instance
export const commodityModels = CommodityModels.getInstance()