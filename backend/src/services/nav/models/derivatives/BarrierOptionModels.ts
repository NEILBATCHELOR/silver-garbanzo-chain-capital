/**
 * BarrierOptionModels - Sophisticated barrier option pricing models
 * 
 * Implements institutional-grade pricing for:
 * - Knock-in and Knock-out options
 * - Up and Down barriers
 * - Autocallable structures
 * - Rebate calculations
 * 
 * Complies with NAV Pricing - Traditionals specification
 * "Barrier Level: Threshold price triggering protection or payout mechanisms"
 */

import { Decimal } from 'decimal.js'

// Configure Decimal for maximum precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface BarrierOptionParams {
  spot: number
  strike: number
  barrier: number
  riskFreeRate: number
  dividendYield: number
  volatility: number
  timeToExpiry: number
  rebate?: number  // Payment if knocked out
}

export interface BarrierOptionResult {
  price: number
  delta: number
  gamma: number
  vega: number
  theta: number
  barrierProbability: number
}

export class BarrierOptionModels {
  private static instance: BarrierOptionModels
  
  private constructor() {}
  
  static getInstance(): BarrierOptionModels {
    if (!this.instance) {
      this.instance = new BarrierOptionModels()
    }
    return this.instance
  }

  /**
   * Price a knock-out call option (up-and-out or down-and-out)
   * Specification requirement: "Barrier options (knock-in/knock-out)"
   */
  knockOutCall(params: BarrierOptionParams, type: 'up' | 'down'): BarrierOptionResult {
    const { spot, strike, barrier, riskFreeRate, dividendYield, volatility, timeToExpiry, rebate = 0 } = params
    
    // Adjust for continuous monitoring
    const adjustedVol = volatility * Math.sqrt(250 / 365)  // Trading days adjustment
    const drift = riskFreeRate - dividendYield - 0.5 * adjustedVol ** 2
    
    // Calculate barrier hit probability
    const barrierProbability = this.calculateBarrierProbability(
      spot, barrier, drift, adjustedVol, timeToExpiry, type
    )
    
    // Base Black-Scholes value
    const bsPrice = this.blackScholes(spot, strike, riskFreeRate, dividendYield, adjustedVol, timeToExpiry, 'call')
    
    // Barrier adjustment factor
    let adjustmentFactor = 1.0
    
    if (type === 'up' && barrier > spot) {
      // Up-and-out: option loses value as spot approaches barrier from below
      adjustmentFactor = 1 - Math.exp(-2 * drift * Math.log(barrier / spot) / (adjustedVol ** 2))
      
      // Add rebate value if knocked out
      if (rebate > 0) {
        const rebateValue = rebate * barrierProbability * Math.exp(-riskFreeRate * timeToExpiry)
        return {
          price: bsPrice * adjustmentFactor + rebateValue,
          delta: this.calculateBarrierDelta(params, type, 'call'),
          gamma: this.calculateBarrierGamma(params, type),
          vega: this.calculateBarrierVega(params, type, 'call'),
          theta: this.calculateBarrierTheta(params, type, 'call'),
          barrierProbability
        }
      }
    } else if (type === 'down' && barrier < spot) {
      // Down-and-out: option loses value as spot approaches barrier from above
      const lambda = (drift + 0.5 * adjustedVol ** 2) / (adjustedVol ** 2)
      const y = Math.log(barrier ** 2 / (spot * strike)) / (adjustedVol * Math.sqrt(timeToExpiry))
      
      if (strike >= barrier) {
        adjustmentFactor = (barrier / spot) ** (2 * lambda) * this.normalCDF(y)
      } else {
        adjustmentFactor = 1 - this.normalCDF(y - adjustedVol * Math.sqrt(timeToExpiry))
      }
    }
    
    const adjustedPrice = bsPrice * adjustmentFactor
    
    return {
      price: adjustedPrice,
      delta: this.calculateBarrierDelta(params, type, 'call'),
      gamma: this.calculateBarrierGamma(params, type),
      vega: this.calculateBarrierVega(params, type, 'call'),
      theta: this.calculateBarrierTheta(params, type, 'call'),
      barrierProbability
    }
  }

  /**
   * Price a knock-in call option (up-and-in or down-and-in)
   */
  knockInCall(params: BarrierOptionParams, type: 'up' | 'down'): BarrierOptionResult {
    // Knock-in = Vanilla - Knock-out (in-out parity)
    const vanillaPrice = this.blackScholes(
      params.spot, params.strike, params.riskFreeRate, 
      params.dividendYield, params.volatility, params.timeToExpiry, 'call'
    )
    
    const knockOutResult = this.knockOutCall(params, type)
    
    return {
      price: vanillaPrice - knockOutResult.price,
      delta: this.calculateBarrierDelta(params, type, 'call', true),
      gamma: this.calculateBarrierGamma(params, type, true),
      vega: this.calculateBarrierVega(params, type, 'call', true),
      theta: this.calculateBarrierTheta(params, type, 'call', true),
      barrierProbability: 1 - knockOutResult.barrierProbability
    }
  }

  /**
   * Price an autocallable structured product
   * Specification: "Autocallable: automatically redeems early if underlying reaches predefined level"
   */
  autocallablePrice(
    spot: number,
    autocallBarriers: number[],  // Observation barriers at each date
    couponRate: number,
    observationDates: Date[],
    maturityDate: Date,
    notional: number,
    riskFreeRate: number,
    volatility: number
  ): {
    theoreticalValue: number
    expectedLife: number
    autocallProbabilities: number[]
  } {
    const now = new Date()
    let presentValue = 0
    let expectedLife = 0
    const autocallProbabilities: number[] = []
    
    // Calculate autocall probability at each observation date
    for (let i = 0; i < observationDates.length; i++) {
      const timeToObservation = (observationDates[i]!.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      const barrier = autocallBarriers[i]!
      
      // Probability that spot will be above barrier at observation date
      const drift = (riskFreeRate - 0.5 * volatility ** 2) * timeToObservation
      const diffusion = volatility * Math.sqrt(timeToObservation)
      const d = (Math.log(spot / barrier) + drift) / diffusion
      const autocallProb = this.normalCDF(d)
      
      // Probability of autocall at this specific date (not earlier)
      let probNotAutoCalledBefore = 1
      for (let j = 0; j < i; j++) {
        probNotAutoCalledBefore *= (1 - autocallProbabilities[j]!)
      }
      
      const probAutoCallNow = autocallProb * probNotAutoCalledBefore
      autocallProbabilities.push(probAutoCallNow)
      
      // Present value of autocall payment
      const couponPayment = notional * (1 + couponRate * (i + 1))
      const discountFactor = Math.exp(-riskFreeRate * timeToObservation)
      presentValue += probAutoCallNow * couponPayment * discountFactor
      
      // Expected life calculation
      expectedLife += probAutoCallNow * timeToObservation
    }
    
    // Add maturity payment if not autocalled
    const probNotAutocalled = autocallProbabilities.reduce((p, prob) => p * (1 - prob), 1)
    const timeToMaturity = (maturityDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    const maturityPayment = notional  // Principal protection assumed
    const maturityPV = probNotAutocalled * maturityPayment * Math.exp(-riskFreeRate * timeToMaturity)
    presentValue += maturityPV
    expectedLife += probNotAutocalled * timeToMaturity
    
    return {
      theoreticalValue: presentValue,
      expectedLife,
      autocallProbabilities
    }
  }

  /**
   * Calculate barrier hit probability
   */
  private calculateBarrierProbability(
    spot: number,
    barrier: number,
    drift: number,
    volatility: number,
    timeToExpiry: number,
    type: 'up' | 'down'
  ): number {
    const logRatio = Math.log(barrier / spot)
    const adjustedDrift = drift + 0.5 * volatility ** 2
    
    if (type === 'up') {
      // Probability of hitting upper barrier
      const d1 = (logRatio - adjustedDrift * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry))
      const d2 = (-logRatio - adjustedDrift * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry))
      const lambda = adjustedDrift / (volatility ** 2)
      
      return this.normalCDF(d1) + Math.exp(2 * lambda * logRatio) * this.normalCDF(d2)
    } else {
      // Probability of hitting lower barrier
      const d1 = (-logRatio + adjustedDrift * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry))
      const d2 = (logRatio + adjustedDrift * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry))
      const lambda = adjustedDrift / (volatility ** 2)
      
      return this.normalCDF(d1) + Math.exp(2 * lambda * logRatio) * this.normalCDF(d2)
    }
  }

  /**
   * Calculate barrier option delta
   */
  private calculateBarrierDelta(
    params: BarrierOptionParams,
    type: 'up' | 'down',
    optionType: 'call' | 'put',
    isKnockIn: boolean = false
  ): number {
    const epsilon = params.spot * 0.001
    const upParams = { ...params, spot: params.spot + epsilon }
    const downParams = { ...params, spot: params.spot - epsilon }
    
    let upPrice, downPrice
    if (isKnockIn) {
      upPrice = this.knockInCall(upParams, type).price
      downPrice = this.knockInCall(downParams, type).price
    } else {
      upPrice = this.knockOutCall(upParams, type).price
      downPrice = this.knockOutCall(downParams, type).price
    }
    
    return (upPrice - downPrice) / (2 * epsilon)
  }

  /**
   * Calculate barrier option gamma
   */
  private calculateBarrierGamma(
    params: BarrierOptionParams,
    type: 'up' | 'down',
    isKnockIn: boolean = false
  ): number {
    const epsilon = params.spot * 0.001
    const upParams = { ...params, spot: params.spot + epsilon }
    const centerParams = params
    const downParams = { ...params, spot: params.spot - epsilon }
    
    let upDelta, centerDelta, downDelta
    if (isKnockIn) {
      upDelta = this.calculateBarrierDelta(upParams, type, 'call', true)
      centerDelta = this.calculateBarrierDelta(centerParams, type, 'call', true)
      downDelta = this.calculateBarrierDelta(downParams, type, 'call', true)
    } else {
      upDelta = this.calculateBarrierDelta(upParams, type, 'call', false)
      centerDelta = this.calculateBarrierDelta(centerParams, type, 'call', false)
      downDelta = this.calculateBarrierDelta(downParams, type, 'call', false)
    }
    
    return (upDelta - 2 * centerDelta + downDelta) / (epsilon ** 2)
  }

  /**
   * Calculate barrier option vega
   */
  private calculateBarrierVega(
    params: BarrierOptionParams,
    type: 'up' | 'down',
    optionType: 'call' | 'put',
    isKnockIn: boolean = false
  ): number {
    const vegaShift = 0.01
    const upParams = { ...params, volatility: params.volatility + vegaShift }
    
    let basePrice, upPrice
    if (isKnockIn) {
      basePrice = this.knockInCall(params, type).price
      upPrice = this.knockInCall(upParams, type).price
    } else {
      basePrice = this.knockOutCall(params, type).price
      upPrice = this.knockOutCall(upParams, type).price
    }
    
    return upPrice - basePrice  // Vega per 1% vol change
  }

  /**
   * Calculate barrier option theta
   */
  private calculateBarrierTheta(
    params: BarrierOptionParams,
    type: 'up' | 'down',
    optionType: 'call' | 'put',
    isKnockIn: boolean = false
  ): number {
    const dayDecay = 1 / 365
    const tomorrowParams = { ...params, timeToExpiry: params.timeToExpiry - dayDecay }
    
    let todayPrice, tomorrowPrice
    if (isKnockIn) {
      todayPrice = this.knockInCall(params, type).price
      tomorrowPrice = this.knockInCall(tomorrowParams, type).price
    } else {
      todayPrice = this.knockOutCall(params, type).price
      tomorrowPrice = this.knockOutCall(tomorrowParams, type).price
    }
    
    return tomorrowPrice - todayPrice  // Daily theta
  }

  /**
   * Black-Scholes formula for vanilla options (used as base)
   */
  private blackScholes(
    spot: number,
    strike: number,
    riskFreeRate: number,
    dividendYield: number,
    volatility: number,
    timeToExpiry: number,
    optionType: 'call' | 'put'
  ): number {
    const d1 = (Math.log(spot / strike) + (riskFreeRate - dividendYield + 0.5 * volatility ** 2) * timeToExpiry) / 
               (volatility * Math.sqrt(timeToExpiry))
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry)
    
    if (optionType === 'call') {
      return spot * Math.exp(-dividendYield * timeToExpiry) * this.normalCDF(d1) -
             strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2)
    } else {
      return strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2) -
             spot * Math.exp(-dividendYield * timeToExpiry) * this.normalCDF(-d1)
    }
  }

  /**
   * Cumulative distribution function for standard normal distribution
   */
  private normalCDF(x: number): number {
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911
    
    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2.0)
    
    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    
    return 0.5 * (1.0 + sign * y)
  }
}

// Export singleton instance
export const barrierOptionModels = BarrierOptionModels.getInstance()
