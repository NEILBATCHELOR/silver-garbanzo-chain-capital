/**
 * Volatility Surface Models Service
 * 
 * Institutional-grade volatility modeling for options and derivatives pricing.
 * Implements various volatility surface construction and calibration methods:
 * - SABR (Stochastic Alpha Beta Rho) model for smile dynamics
 * - SVI (Stochastic Volatility Inspired) parametrization
 * - Local volatility (Dupire model)
 * - Volatility interpolation and extrapolation
 * - Greeks calculation with volatility smile adjustments
 * 
 * All calculations use Decimal.js for 28-decimal precision
 */

import Decimal from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface VolatilitySurfacePoint {
  strike: Decimal
  tenor: number // Years to expiry
  impliedVol: Decimal // Implied volatility as decimal
  moneyness?: Decimal // Strike/Spot ratio
  delta?: Decimal // Option delta
  localVol?: Decimal // Local volatility if calculated
}

export interface SABRParams {
  alpha: Decimal // Initial volatility
  beta: Decimal // CEV exponent (0 to 1)
  rho: Decimal // Correlation (-1 to 1)
  nu: Decimal // Volatility of volatility
  forward: Decimal // Forward price
  time: number // Time to expiry
}

export interface SVIParams {
  a: Decimal // Level parameter
  b: Decimal // Slope parameter  
  rho: Decimal // Rotation parameter
  m: Decimal // Translation parameter
  sigma: Decimal // Scaling parameter
}

export interface LocalVolParams {
  spot: Decimal
  strikes: Decimal[]
  tenors: number[]
  impliedVols: Decimal[][]
  riskFreeRate: Decimal
  dividendYield?: Decimal
}

export interface VolatilitySmile {
  strikes: Decimal[]
  impliedVols: Decimal[]
  tenor: number
  atmVol: Decimal
  skew: Decimal // Risk reversal
  convexity: Decimal // Butterfly spread
}

export interface GreeksWithSmile {
  delta: Decimal
  gamma: Decimal
  vega: Decimal
  theta: Decimal
  rho: Decimal
  vanna: Decimal // dDelta/dVol
  volga: Decimal // dVega/dVol
  charm: Decimal // dDelta/dTime
  vomma: Decimal // dVega/dVol (same as Volga)
  speed: Decimal // dGamma/dSpot
}

export enum ExtrapolationMethod {
  FLAT = 'FLAT',
  LINEAR = 'LINEAR',
  SABR = 'SABR',
  SVI = 'SVI'
}

class VolatilitySurfaceModelsClass {
  
  /**
   * Calculate implied volatility using SABR model
   * Industry standard for interest rate and FX options
   */
  sabrVolatility(strike: Decimal, params: SABRParams): Decimal {
    const { alpha, beta, rho, nu, forward, time } = params
    
    // Handle ATM case
    if (strike.equals(forward)) {
      return this.sabrATMVolatility(params)
    }
    
    const F = forward
    const K = strike
    const T = new Decimal(time)
    
    // Calculate z and chi(z) using Hagan approximation
    const logFK = Decimal.ln(F.div(K))
    const FK_avg = F.plus(K).div(2)
    const FK_beta = FK_avg.pow(beta)
    
    // First calculate z
    const numerator = nu.times(logFK).times(FK_beta.pow(new Decimal(1).minus(beta).div(2)))
    const denominator = alpha
    const z = numerator.div(denominator)
    
    // Calculate chi(z)
    const chi = this.calculateChiZ(z, rho)
    
    // Main volatility calculation
    const term1 = alpha.div(FK_beta.pow(new Decimal(1).minus(beta).div(2)))
    const term2 = z.div(chi)
    
    // Correction terms
    const correction1 = new Decimal(1).minus(beta).pow(2).times(logFK.pow(2)).div(24)
    const correction2 = new Decimal(1).minus(beta).pow(4).times(logFK.pow(4)).div(1920)
    const bracketTerm = new Decimal(1).plus(correction1).plus(correction2)
    
    // Time correction
    const timeTerm1 = new Decimal(1).minus(beta).pow(2).times(alpha.pow(2))
      .div(FK_beta.pow(new Decimal(1).minus(beta)).times(24))
    
    const timeTerm2 = rho.times(beta).times(nu).times(alpha)
      .div(FK_beta.pow(new Decimal(1).minus(beta).div(2)).times(4))
    
    const timeTerm3 = new Decimal(2).minus(rho.pow(2).times(3)).times(nu.pow(2)).div(24)
    
    const timeCorrection = new Decimal(1).plus(T.times(timeTerm1.plus(timeTerm2).plus(timeTerm3)))
    
    return term1.times(term2).times(bracketTerm).times(timeCorrection)
  }
  
  /**
   * Fit SABR parameters to market data
   * Uses optimization to calibrate alpha, rho, nu (beta often fixed)
   */
  calibrateSABR(
    strikes: Decimal[],
    impliedVols: Decimal[],
    forward: Decimal,
    time: number,
    beta: Decimal = new Decimal(0.5)
  ): SABRParams {
    // Initial parameter guesses
    const atmIndex = this.findATMIndex(strikes, forward)
    const atmVol = impliedVols[atmIndex] || impliedVols[0] || new Decimal(0.2)
    
    let alpha = atmVol
    let rho = new Decimal(-0.3) // Typical starting value
    let nu = new Decimal(0.3) // Typical vol-of-vol
    
    // Optimize using Levenberg-Marquardt (simplified)
    let bestParams = { alpha, beta, rho, nu, forward, time }
    let bestError = new Decimal(Infinity)
    
    // Grid search for initial optimization
    for (let r = -0.9; r <= 0.9; r += 0.3) {
      for (let n = 0.1; n <= 1.0; n += 0.3) {
        const currentRho = new Decimal(r)
        const currentNu = new Decimal(n)
        
        // Calibrate alpha for this rho/nu combination
        const currentAlpha = this.calibrateAlpha(
          strikes,
          impliedVols,
          forward,
          time,
          beta,
          currentRho,
          currentNu
        )
        
        const currentParams = {
          alpha: currentAlpha,
          beta,
          rho: currentRho,
          nu: currentNu,
          forward,
          time
        }
        
        const error = this.calculateCalibrationError(
          strikes,
          impliedVols,
          currentParams
        )
        
        if (error.lessThan(bestError)) {
          bestError = error
          bestParams = currentParams
        }
      }
    }
    
    // Fine-tune with gradient descent
    bestParams = this.fineTuneSABR(strikes, impliedVols, bestParams)
    
    return bestParams
  }
  
  /**
   * Calculate volatility using SVI parametrization
   * Popular for equity index options
   */
  sviVolatility(moneyness: Decimal, params: SVIParams): Decimal {
    const { a, b, rho, m, sigma } = params
    const k = moneyness // log-moneyness
    
    // SVI formula: w(k) = a + b * (rho * (k - m) + sqrt((k - m)^2 + sigma^2))
    const km = k.minus(m)
    const discriminant = km.pow(2).plus(sigma.pow(2))
    const sqrtTerm = Decimal.sqrt(discriminant)
    
    const w = a.plus(b.times(rho.times(km).plus(sqrtTerm)))
    
    // Convert total variance to implied volatility
    // Note: w is total variance, so vol = sqrt(w/T)
    // For unit time, vol = sqrt(w)
    return Decimal.sqrt(w.abs())
  }
  
  /**
   * Calibrate SVI parameters to smile data
   */
  calibrateSVI(
    strikes: Decimal[],
    impliedVols: Decimal[],
    spot: Decimal,
    time: number
  ): SVIParams {
    // Convert strikes to log-moneyness
    const moneyness = strikes.map(K => Decimal.ln(K.div(spot)))
    const totalVariances = impliedVols.map(v => v.pow(2).times(time))
    
    // Initial parameter estimates
    const atmIndex = this.findATMIndex(strikes, spot)
    const atmVar = totalVariances[atmIndex] || totalVariances[0] || new Decimal(0.04)
    
    // Use quasi-explicit calibration method
    let params: SVIParams = {
      a: atmVar, // ATM total variance
      b: new Decimal(0.1), // Initial slope
      rho: new Decimal(-0.3), // Initial correlation
      m: new Decimal(0), // Initial translation (ATM)
      sigma: new Decimal(0.1) // Initial scaling
    }
    
    // Optimize parameters
    for (let iter = 0; iter < 20; iter++) {
      params = this.optimizeSVIStep(moneyness, totalVariances, params)
    }
    
    return params
  }
  
  /**
   * Calculate local volatility using Dupire formula
   * Used for exotic option pricing
   */
  calculateLocalVolatility(
    strike: Decimal,
    time: number,
    surface: LocalVolParams
  ): Decimal {
    const { spot, strikes, tenors, impliedVols, riskFreeRate, dividendYield = new Decimal(0) } = surface
    
    // Find surrounding points for interpolation
    const strikeIndex = this.findInterpolationIndex(strikes, strike)
    const timeIndex = this.findInterpolationIndex(tenors, time)
    
    // Get implied volatility at this point
    const impliedVol = this.interpolateSurface(
      strikes,
      tenors,
      impliedVols,
      strike,
      time
    )
    
    // Calculate derivatives needed for Dupire formula
    const dC_dT = this.calculateTimeDeriv(strike, time, surface)
    const dC_dK = this.calculateStrikeDeriv(strike, time, surface)
    const d2C_dK2 = this.calculateStrikeSecondDeriv(strike, time, surface)
    
    // Dupire formula
    const forward = spot.times(Decimal.exp(riskFreeRate.minus(dividendYield).times(time)))
    const discount = Decimal.exp(riskFreeRate.negated().times(time))
    
    const numerator = dC_dT.plus(
      riskFreeRate.minus(dividendYield).times(strike).times(dC_dK)
    ).plus(dividendYield.times(spot).times(discount))
    
    const denominator = strike.pow(2).times(d2C_dK2).times(0.5)
    
    // Local variance
    const localVariance = numerator.div(denominator)
    
    // Return local volatility
    return Decimal.sqrt(localVariance.abs())
  }
  
  /**
   * Interpolate volatility for any strike/tenor combination
   */
  interpolateVolatility(
    surface: VolatilitySurfacePoint[],
    strike: Decimal,
    tenor: number,
    method: ExtrapolationMethod = ExtrapolationMethod.SABR
  ): Decimal {
    // Group surface points by tenor
    const tenorGroups = new Map<number, VolatilitySurfacePoint[]>()
    
    for (const point of surface) {
      if (!tenorGroups.has(point.tenor)) {
        tenorGroups.set(point.tenor, [])
      }
      const group = tenorGroups.get(point.tenor)
      if (group) {
        group.push(point)
      }
    }
    
    // Find surrounding tenors
    const tenors = Array.from(tenorGroups.keys()).sort((a, b) => a - b)
    let lowerTenor: number | null = null
    let upperTenor: number | null = null
    
    for (const t of tenors) {
      if (t <= tenor) lowerTenor = t
      else if (!upperTenor && t > tenor) upperTenor = t
    }
    
    // Interpolate in strike dimension first
    const volsAtTenor: { tenor: number; vol: Decimal }[] = []
    
    if (lowerTenor !== null) {
      const lowerPoints = tenorGroups.get(lowerTenor)
      if (lowerPoints) {
        const lowerVol = this.interpolateStrike(lowerPoints, strike, method)
        volsAtTenor.push({ tenor: lowerTenor, vol: lowerVol })
      }
    }
    
    if (upperTenor !== null) {
      const upperPoints = tenorGroups.get(upperTenor)
      if (upperPoints) {
        const upperVol = this.interpolateStrike(upperPoints, strike, method)
        volsAtTenor.push({ tenor: upperTenor, vol: upperVol })
      }
    }
    
    // Interpolate in time dimension
    if (volsAtTenor.length === 0) {
      throw new Error('No volatility data available')
    } else if (volsAtTenor.length === 1) {
      const singleVol = volsAtTenor[0]
      if (!singleVol) {
        throw new Error('Invalid volatility data')
      }
      return singleVol.vol
    } else {
      // Linear interpolation in total variance space
      const firstPoint = volsAtTenor[0]
      if (!firstPoint) {
        throw new Error('Invalid volatility data for interpolation')
      }
      const secondPoint = volsAtTenor[1]
      
      if (!firstPoint || !secondPoint) {
        throw new Error('Insufficient volatility data for interpolation')
      }
      
      const var1 = firstPoint.vol.pow(2).times(firstPoint.tenor)
      const var2 = secondPoint.vol.pow(2).times(secondPoint.tenor)
      
      const weight = new Decimal(tenor - firstPoint.tenor)
        .div(secondPoint.tenor - firstPoint.tenor)
      
      const totalVar = var1.plus(var2.minus(var1).times(weight))
      return Decimal.sqrt(totalVar.div(tenor))
    }
  }
  
  /**
   * Calculate Greeks with volatility smile adjustments
   */
  calculateGreeksWithSmile(
    spot: Decimal,
    strike: Decimal,
    time: number,
    riskFreeRate: Decimal,
    surface: VolatilitySurfacePoint[],
    isCall: boolean = true
  ): GreeksWithSmile {
    // Get implied volatility for this strike/tenor
    const impliedVol = this.interpolateVolatility(surface, strike, time)
    
    // Calculate standard Greeks
    const d1 = this.calculateD1(spot, strike, riskFreeRate, impliedVol, time)
    const d2 = d1.minus(impliedVol.times(Decimal.sqrt(time)))
    
    const nd1 = this.normalCDF(d1)
    const nd2 = this.normalCDF(d2)
    const npd1 = this.normalPDF(d1)
    
    const sqrtT = Decimal.sqrt(time)
    
    // Standard Greeks
    const delta = isCall ? nd1 : nd1.minus(1)
    const gamma = npd1.div(spot.times(impliedVol).times(sqrtT))
    const vega = spot.times(npd1).times(sqrtT).div(100) // Per 1% vol change
    const theta = this.calculateTheta(spot, strike, riskFreeRate, impliedVol, time, isCall)
    const rho = this.calculateRho(strike, riskFreeRate, time, nd2, isCall)
    
    // Smile-adjusted Greeks
    const { skew, convexity } = this.calculateSkewConvexity(surface, strike, time)
    
    // Vanna: dDelta/dVol
    const vanna = npd1.times(d2).div(impliedVol)
    
    // Volga: dVega/dVol  
    const volga = vega.times(d1).times(d2).div(impliedVol)
    
    // Charm: dDelta/dTime - Fix variable declaration issue
    let charm: Decimal
    if (isCall) {
      charm = npd1.times(
        new Decimal(2).times(riskFreeRate).times(time)
          .minus(d2.times(impliedVol).times(sqrtT))
      ).div(new Decimal(2).times(time).times(impliedVol).times(sqrtT))
    } else {
      charm = npd1.times(
        new Decimal(2).times(riskFreeRate).times(time)
          .minus(d2.times(impliedVol).times(sqrtT))
      ).div(new Decimal(2).times(time).times(impliedVol).times(sqrtT)).negated()
    }
    
    // Vomma (same as Volga)
    const vomma = volga
    
    // Speed: dGamma/dSpot
    const speed = gamma.negated().times(d1.plus(sqrtT.times(impliedVol))).div(spot)
    
    return {
      delta,
      gamma,
      vega,
      theta,
      rho,
      vanna,
      volga,
      charm,
      vomma,
      speed
    }
  }
  
  /**
   * Build volatility smile from market quotes
   */
  buildVolatilitySmile(
    strikes: Decimal[],
    impliedVols: Decimal[],
    tenor: number,
    spot: Decimal
  ): VolatilitySmile {
    const atmIndex = this.findATMIndex(strikes, spot)
    const atmVol = impliedVols[atmIndex] ?? impliedVols[0] ?? new Decimal(0.2)
    
    // Calculate 25-delta risk reversal (proxy for skew)
    const delta25Index = Math.floor(strikes.length * 0.25)
    const delta75Index = Math.floor(strikes.length * 0.75)
    
    const vol25 = impliedVols[delta25Index] ?? impliedVols[0] ?? atmVol
    const vol75 = impliedVols[delta75Index] ?? impliedVols[impliedVols.length - 1] ?? atmVol
    
    const skew = vol75.minus(vol25)
    
    // Calculate butterfly spread (proxy for convexity)
    const butterfly = vol25.plus(vol75)
      .div(2).minus(atmVol)
    
    return {
      strikes,
      impliedVols,
      tenor,
      atmVol,
      skew,
      convexity: butterfly
    }
  }
  
  // Private helper methods
  
  private sabrATMVolatility(params: SABRParams): Decimal {
    const { alpha, beta, rho, nu, forward, time } = params
    const T = new Decimal(time)
    const F = forward
    
    const term1 = alpha.div(F.pow(new Decimal(1).minus(beta)))
    
    const correction1 = new Decimal(1).minus(beta).pow(2).times(alpha.pow(2))
      .div(F.pow(new Decimal(2).minus(beta).times(2)).times(24))
    
    const correction2 = rho.times(beta).times(nu).times(alpha)
      .div(F.pow(new Decimal(1).minus(beta)).times(4))
    
    const correction3 = new Decimal(2).minus(rho.pow(2).times(3)).times(nu.pow(2)).div(24)
    
    const timeCorrection = new Decimal(1).plus(T.times(correction1.plus(correction2).plus(correction3)))
    
    return term1.times(timeCorrection)
  }
  
  private calculateChiZ(z: Decimal, rho: Decimal): Decimal {
    if (z.abs().lessThan(0.0001)) {
      // Series expansion for small z
      return new Decimal(1).minus(rho.times(z).div(2))
        .plus(z.pow(2).times(new Decimal(3).times(rho.pow(2)).minus(2)).div(12))
    }
    
    const numerator = Decimal.sqrt(new Decimal(1).minus(rho.times(2).times(z).plus(z.pow(2))))
      .plus(z).minus(rho)
    
    const denominator = new Decimal(1).minus(rho)
    
    return Decimal.ln(numerator.div(denominator)).div(z)
  }
  
  private findATMIndex(strikes: Decimal[], forward: Decimal): number {
    let minDiff = new Decimal(Infinity)
    let atmIndex = 0
    
    for (let i = 0; i < strikes.length; i++) {
      const strike = strikes[i]
      if (!strike) continue // Skip undefined elements
      
      const diff = strike.minus(forward).abs()
      if (diff.lessThan(minDiff)) {
        minDiff = diff
        atmIndex = i
      }
    }
    
    return atmIndex
  }
  
  private calibrateAlpha(
    strikes: Decimal[],
    impliedVols: Decimal[],
    forward: Decimal,
    time: number,
    beta: Decimal,
    rho: Decimal,
    nu: Decimal
  ): Decimal {
    const atmIndex = this.findATMIndex(strikes, forward)
    const atmVol = impliedVols[atmIndex] ?? impliedVols[0] ?? new Decimal(0.2)
    
    // Solve for alpha that matches ATM volatility
    const F = forward
    const T = new Decimal(time)
    
    const denominator = F.pow(new Decimal(1).minus(beta))
    
    const correction1 = new Decimal(1).minus(beta).pow(2).div(24)
    const correction2 = rho.times(beta).times(nu).div(4)
    const correction3 = new Decimal(2).minus(rho.pow(2).times(3)).times(nu.pow(2)).div(24)
    
    const timeCorrection = new Decimal(1).plus(T.times(correction2.plus(correction3)))
    
    const alpha = atmVol.times(denominator).div(timeCorrection)
    
    return alpha
  }
  
  private calculateCalibrationError(
    strikes: Decimal[],
    marketVols: Decimal[],
    params: SABRParams
  ): Decimal {
    let sumSquaredError = new Decimal(0)
    
    for (let i = 0; i < strikes.length; i++) {
      const strike = strikes[i]
      const marketVol = marketVols[i]
      
      if (strike && marketVol) {
        const modelVol = this.sabrVolatility(strike, params)
        const error = modelVol.minus(marketVol)
        sumSquaredError = sumSquaredError.plus(error.pow(2))
      }
    }
    
    return sumSquaredError.sqrt()
  }
  
  private fineTuneSABR(
    strikes: Decimal[],
    impliedVols: Decimal[],
    params: SABRParams
  ): SABRParams {
    // Gradient descent fine-tuning
    let currentParams = { ...params }
    const learningRate = new Decimal(0.01)
    
    for (let iter = 0; iter < 10; iter++) {
      const gradient = this.calculateSABRGradient(strikes, impliedVols, currentParams)
      
      currentParams.alpha = currentParams.alpha.minus(gradient.alpha.times(learningRate))
      currentParams.rho = currentParams.rho.minus(gradient.rho.times(learningRate))
      currentParams.nu = currentParams.nu.minus(gradient.nu.times(learningRate))
      
      // Enforce parameter bounds
      currentParams.rho = Decimal.max(-0.999, Decimal.min(0.999, currentParams.rho))
      currentParams.nu = Decimal.max(0.001, currentParams.nu)
      currentParams.alpha = Decimal.max(0.001, currentParams.alpha)
    }
    
    return currentParams
  }
  
  private calculateSABRGradient(
    strikes: Decimal[],
    impliedVols: Decimal[],
    params: SABRParams
  ): { alpha: Decimal; rho: Decimal; nu: Decimal } {
    const eps = new Decimal(0.0001)
    
    // Numerical gradient
    const baseError = this.calculateCalibrationError(strikes, impliedVols, params)
    
    // Alpha gradient
    const paramsAlpha = { ...params, alpha: params.alpha.plus(eps) }
    const errorAlpha = this.calculateCalibrationError(strikes, impliedVols, paramsAlpha)
    const gradAlpha = errorAlpha.minus(baseError).div(eps)
    
    // Rho gradient
    const paramsRho = { ...params, rho: params.rho.plus(eps) }
    const errorRho = this.calculateCalibrationError(strikes, impliedVols, paramsRho)
    const gradRho = errorRho.minus(baseError).div(eps)
    
    // Nu gradient
    const paramsNu = { ...params, nu: params.nu.plus(eps) }
    const errorNu = this.calculateCalibrationError(strikes, impliedVols, paramsNu)
    const gradNu = errorNu.minus(baseError).div(eps)
    
    return { alpha: gradAlpha, rho: gradRho, nu: gradNu }
  }
  
  private optimizeSVIStep(
    moneyness: Decimal[],
    totalVariances: Decimal[],
    params: SVIParams
  ): SVIParams {
    // Quasi-Newton step for SVI optimization
    const gradient = this.calculateSVIGradient(moneyness, totalVariances, params)
    const learningRate = new Decimal(0.1)
    
    return {
      a: params.a.minus(gradient.a.times(learningRate)),
      b: Decimal.max(new Decimal(0.001), params.b.minus(gradient.b.times(learningRate))),
      rho: Decimal.max(new Decimal(-0.999), Decimal.min(new Decimal(0.999), 
        params.rho.minus(gradient.rho.times(learningRate)))),
      m: params.m.minus(gradient.m.times(learningRate)),
      sigma: Decimal.max(new Decimal(0.001), params.sigma.minus(gradient.sigma.times(learningRate)))
    }
  }
  
  private calculateSVIGradient(
    moneyness: Decimal[],
    totalVariances: Decimal[],
    params: SVIParams
  ): SVIParams {
    // Numerical gradient for SVI parameters
    const eps = new Decimal(0.0001)
    const baseError = this.calculateSVIError(moneyness, totalVariances, params)
    
    // Calculate gradients for each parameter with proper defaults
    const gradA = this.calculateParameterGradient('a', params, eps, baseError, moneyness, totalVariances)
    const gradB = this.calculateParameterGradient('b', params, eps, baseError, moneyness, totalVariances)
    const gradRho = this.calculateParameterGradient('rho', params, eps, baseError, moneyness, totalVariances)
    const gradM = this.calculateParameterGradient('m', params, eps, baseError, moneyness, totalVariances)
    const gradSigma = this.calculateParameterGradient('sigma', params, eps, baseError, moneyness, totalVariances)
    
    return {
      a: gradA,
      b: gradB,
      rho: gradRho,
      m: gradM,
      sigma: gradSigma
    }
  }
  
  private calculateParameterGradient(
    paramName: keyof SVIParams,
    params: SVIParams,
    eps: Decimal,
    baseError: Decimal,
    moneyness: Decimal[],
    totalVariances: Decimal[]
  ): Decimal {
    const perturbedParams = { ...params }
    perturbedParams[paramName] = params[paramName].plus(eps)
    const error = this.calculateSVIError(moneyness, totalVariances, perturbedParams)
    return error.minus(baseError).div(eps)
  }
  
  private calculateSVIError(
    moneyness: Decimal[],
    totalVariances: Decimal[],
    params: SVIParams
  ): Decimal {
    let sumSquaredError = new Decimal(0)
    
    for (let i = 0; i < moneyness.length; i++) {
      const money = moneyness[i]
      const totalVar = totalVariances[i]
      
      if (money && totalVar) {
        const modelVar = this.sviVolatility(money, params).pow(2)
        const error = modelVar.minus(totalVar)
        sumSquaredError = sumSquaredError.plus(error.pow(2))
      }
    }
    
    return sumSquaredError.sqrt()
  }
  
  private findInterpolationIndex(array: any[], value: any): number {
    for (let i = 0; i < array.length - 1; i++) {
      if (array[i + 1] > value) return i
    }
    return Math.max(0, array.length - 2)
  }
  
  private interpolateSurface(
    strikes: Decimal[],
    tenors: number[],
    vols: Decimal[][],
    strike: Decimal,
    time: number
  ): Decimal {
    // Bilinear interpolation with bounds checking
    const i = this.findInterpolationIndex(strikes, strike)
    const j = this.findInterpolationIndex(tenors, time)
    
    // Ensure indices are within bounds
    const safeI = Math.max(0, Math.min(i, strikes.length - 2))
    const safeJ = Math.max(0, Math.min(j, tenors.length - 2))
    
    // Bounds check for strikes and tenors
    if (safeI >= strikes.length - 1 || safeJ >= tenors.length - 1 ||
        !vols[safeJ] || !vols[safeJ + 1]) {
      // Fallback to available data
      const fallbackVol = vols[safeJ]?.[safeI] || 
                         vols[0]?.[0] || 
                         new Decimal(0.2) // 20% default vol
      return fallbackVol
    }
    
    // Add explicit null checks for strikes and tenors
    const x1 = strikes[safeI] ?? new Decimal(100) // Default strike
    const x2 = strikes[safeI + 1] ?? new Decimal(110) // Default strike
    const y1 = tenors[safeJ] ?? 0.25 // Default tenor (3 months)
    const y2 = tenors[safeJ + 1] ?? 1.0 // Default tenor (1 year)
    
    // Ensure we have the volatility data with proper fallbacks
    const q11 = vols[safeJ]?.[safeI] ?? new Decimal(0.2)
    const q12 = vols[safeJ]?.[safeI + 1] ?? new Decimal(0.2)
    const q21 = vols[safeJ + 1]?.[safeI] ?? new Decimal(0.2)
    const q22 = vols[safeJ + 1]?.[safeI + 1] ?? new Decimal(0.2)
    
    // Safe division with fallback
    const denomX = x2.minus(x1)
    const denomY = new Decimal(y2 - y1)
    
    if (denomX.isZero() || denomY.isZero()) {
      return q11 // Return nearest available volatility
    }
    
    const wx = strike.minus(x1).div(denomX)
    const wy = new Decimal(time - y1).div(denomY)
    
    return q11.times(new Decimal(1).minus(wx)).times(new Decimal(1).minus(wy))
      .plus(q12.times(wx).times(new Decimal(1).minus(wy)))
      .plus(q21.times(new Decimal(1).minus(wx)).times(wy))
      .plus(q22.times(wx).times(wy))
  }
  
  private calculateTimeDeriv(
    strike: Decimal,
    time: number,
    surface: LocalVolParams
  ): Decimal {
    const eps = 0.001 // Small time step
    const volPlus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike,
      time + eps
    )
    const volMinus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike,
      time - eps
    )
    
    // Use Black-Scholes formula to get option prices
    const pricePlus = this.blackScholesPrice(
      surface.spot,
      strike,
      surface.riskFreeRate,
      volPlus,
      time + eps,
      true
    )
    const priceMinus = this.blackScholesPrice(
      surface.spot,
      strike,
      surface.riskFreeRate,
      volMinus,
      time - eps,
      true
    )
    
    return pricePlus.minus(priceMinus).div(2 * eps)
  }
  
  private calculateStrikeDeriv(
    strike: Decimal,
    time: number,
    surface: LocalVolParams
  ): Decimal {
    const eps = strike.times(0.001) // Small strike step
    const volPlus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike.plus(eps),
      time
    )
    const volMinus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike.minus(eps),
      time
    )
    
    const pricePlus = this.blackScholesPrice(
      surface.spot,
      strike.plus(eps),
      surface.riskFreeRate,
      volPlus,
      time,
      true
    )
    const priceMinus = this.blackScholesPrice(
      surface.spot,
      strike.minus(eps),
      surface.riskFreeRate,
      volMinus,
      time,
      true
    )
    
    return pricePlus.minus(priceMinus).div(eps.times(2))
  }
  
  private calculateStrikeSecondDeriv(
    strike: Decimal,
    time: number,
    surface: LocalVolParams
  ): Decimal {
    const eps = strike.times(0.001)
    
    const vol0 = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike,
      time
    )
    const volPlus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike.plus(eps),
      time
    )
    const volMinus = this.interpolateSurface(
      surface.strikes,
      surface.tenors,
      surface.impliedVols,
      strike.minus(eps),
      time
    )
    
    const price0 = this.blackScholesPrice(
      surface.spot,
      strike,
      surface.riskFreeRate,
      vol0,
      time,
      true
    )
    const pricePlus = this.blackScholesPrice(
      surface.spot,
      strike.plus(eps),
      surface.riskFreeRate,
      volPlus,
      time,
      true
    )
    const priceMinus = this.blackScholesPrice(
      surface.spot,
      strike.minus(eps),
      surface.riskFreeRate,
      volMinus,
      time,
      true
    )
    
    return pricePlus.minus(price0.times(2)).plus(priceMinus).div(eps.pow(2))
  }
  
  private interpolateStrike(
    points: VolatilitySurfacePoint[],
    strike: Decimal,
    method: ExtrapolationMethod
  ): Decimal {
    // Sort points by strike
    const sorted = points.sort((a, b) => a.strike.comparedTo(b.strike))
    
    if (sorted.length === 0) {
      return new Decimal(0.2) // Default 20% volatility
    }
    
    // Check if we need extrapolation
    const firstPoint = sorted[0]
    const lastPoint = sorted[sorted.length - 1]
    
    if (!firstPoint || !lastPoint) {
      return new Decimal(0.2) // Fallback if points are undefined
    }
    
    if (strike.lessThan(firstPoint.strike) || strike.greaterThan(lastPoint.strike)) {
      return this.extrapolateVolatility(sorted, strike, method)
    }
    
    // Interpolation
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentPoint = sorted[i]
      const nextPoint = sorted[i + 1]
      
      if (!currentPoint || !nextPoint) {
        continue // Skip if points are undefined
      }
      
      if (nextPoint.strike.greaterThanOrEqualTo(strike)) {
        const denominator = nextPoint.strike.minus(currentPoint.strike)
        if (denominator.isZero()) {
          return currentPoint.impliedVol
        }
        
        const weight = strike.minus(currentPoint.strike).div(denominator)
        
        // Interpolate in total variance space
        const var1 = currentPoint.impliedVol.pow(2)
        const var2 = nextPoint.impliedVol.pow(2)
        const interpVar = var1.plus(var2.minus(var1).times(weight))
        
        return Decimal.sqrt(interpVar.abs())
      }
    }
    
    return lastPoint.impliedVol
  }
  
  private extrapolateVolatility(
    points: VolatilitySurfacePoint[],
    strike: Decimal,
    method: ExtrapolationMethod
  ): Decimal {
    if (points.length === 0) {
      return new Decimal(0.2) // Default 20% volatility
    }
    
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    
    if (!firstPoint || !lastPoint) {
      return new Decimal(0.2) // Fallback if points are undefined
    }
    
    switch (method) {
      case ExtrapolationMethod.FLAT:
        return strike.lessThan(firstPoint.strike) ? 
          firstPoint.impliedVol : lastPoint.impliedVol
      
      case ExtrapolationMethod.LINEAR: {
        if (points.length < 2) {
          return firstPoint.impliedVol
        }
        
        const secondPoint = points[1]
        const secondLastPoint = points[points.length - 2]
        
        if (!secondPoint || !secondLastPoint) {
          return firstPoint.impliedVol // Fallback if points are undefined
        }
        
        if (strike.lessThan(firstPoint.strike)) {
          const denominator = secondPoint.strike.minus(firstPoint.strike)
          if (denominator.isZero()) {
            return firstPoint.impliedVol
          }
          
          const slope = secondPoint.impliedVol.minus(firstPoint.impliedVol).div(denominator)
          return firstPoint.impliedVol.plus(
            slope.times(strike.minus(firstPoint.strike))
          )
        } else {
          const denominator = lastPoint.strike.minus(secondLastPoint.strike)
          if (denominator.isZero()) {
            return lastPoint.impliedVol
          }
          
          const slope = lastPoint.impliedVol.minus(secondLastPoint.impliedVol).div(denominator)
          return lastPoint.impliedVol.plus(
            slope.times(strike.minus(lastPoint.strike))
          )
        }
      }
      
      default:
        return this.extrapolateVolatility(points, strike, ExtrapolationMethod.FLAT)
    }
  }
  
  private calculateSkewConvexity(
    surface: VolatilitySurfacePoint[],
    strike: Decimal,
    time: number
  ): { skew: Decimal; convexity: Decimal } {
    const eps = strike.times(0.01)
    
    try {
      const volCenter = this.interpolateVolatility(surface, strike, time)
      const volUp = this.interpolateVolatility(surface, strike.plus(eps), time)
      const volDown = this.interpolateVolatility(surface, strike.minus(eps), time)
      
      const skew = volUp.minus(volDown).div(eps.times(2))
      const convexity = volUp.minus(volCenter.times(2)).plus(volDown).div(eps.pow(2))
      
      return { skew, convexity }
    } catch (error) {
      // Fallback to zero skew and convexity if interpolation fails
      return { 
        skew: new Decimal(0), 
        convexity: new Decimal(0) 
      }
    }
  }
  
  private calculateD1(
    spot: Decimal,
    strike: Decimal,
    r: Decimal,
    sigma: Decimal,
    time: number
  ): Decimal {
    const logSK = Decimal.ln(spot.div(strike))
    const rt = r.times(time)
    const halfSigmaSqT = sigma.pow(2).times(time).div(2)
    const sigmaRootT = sigma.times(Decimal.sqrt(time))
    
    return logSK.plus(rt).plus(halfSigmaSqT).div(sigmaRootT)
  }
  
  private blackScholesPrice(
    spot: Decimal,
    strike: Decimal,
    r: Decimal,
    sigma: Decimal,
    time: number,
    isCall: boolean
  ): Decimal {
    if (time <= 0) return Decimal.max(0, isCall ? spot.minus(strike) : strike.minus(spot))
    
    const d1 = this.calculateD1(spot, strike, r, sigma, time)
    const d2 = d1.minus(sigma.times(Decimal.sqrt(time)))
    
    const discount = Decimal.exp(r.negated().times(time))
    
    if (isCall) {
      return spot.times(this.normalCDF(d1))
        .minus(strike.times(discount).times(this.normalCDF(d2)))
    } else {
      return strike.times(discount).times(this.normalCDF(d2.negated()))
        .minus(spot.times(this.normalCDF(d1.negated())))
    }
  }
  
  private calculateTheta(
    spot: Decimal,
    strike: Decimal,
    r: Decimal,
    sigma: Decimal,
    time: number,
    isCall: boolean
  ): Decimal {
    const d1 = this.calculateD1(spot, strike, r, sigma, time)
    const d2 = d1.minus(sigma.times(Decimal.sqrt(time)))
    
    const sqrtT = Decimal.sqrt(time)
    const npd1 = this.normalPDF(d1)
    const discount = Decimal.exp(r.negated().times(time))
    
    const term1 = spot.times(npd1).times(sigma).div(sqrtT.times(2))
    
    if (isCall) {
      const term2 = r.times(strike).times(discount).times(this.normalCDF(d2))
      return term1.plus(term2).negated().div(365) // Per day
    } else {
      const term2 = r.times(strike).times(discount).times(this.normalCDF(d2.negated()))
      return term2.minus(term1).negated().div(365) // Per day
    }
  }
  
  private calculateRho(
    strike: Decimal,
    r: Decimal,
    time: number,
    nd2: Decimal,
    isCall: boolean
  ): Decimal {
    const discount = Decimal.exp(r.negated().times(time))
    const rho = strike.times(time).times(discount).times(nd2).div(100) // Per 1% rate change
    
    return isCall ? rho : rho.negated()
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
}

// Export singleton instance
export const volatilitySurfaceModels = new VolatilitySurfaceModelsClass()

// Export the class as well
export { VolatilitySurfaceModelsClass }
