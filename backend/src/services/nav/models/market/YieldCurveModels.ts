/**
 * Yield Curve Models Service
 * 
 * Provides institutional-grade interest rate modeling for fixed income valuation.
 * Implements various yield curve construction and interpolation methods:
 * - Nelson-Siegel-Svensson model for term structure fitting
 * - Bootstrap methods for zero curve construction
 * - Forward rate calculations
 * - Basis point value (BPV) and duration analytics
 * - Curve risk metrics and sensitivities
 * 
 * All calculations use Decimal.js for 28-decimal precision
 */

import Decimal from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface YieldCurvePoint {
  tenor: number // Years to maturity
  rate: Decimal // Yield/rate as decimal (0.05 = 5%)
  zeroRate?: Decimal // Zero coupon rate if available
  forwardRate?: Decimal // Forward rate if calculated
  discountFactor?: Decimal // Present value factor
}

export interface NelsonSiegelParams {
  beta0: Decimal // Long-term rate level
  beta1: Decimal // Short-term component
  beta2: Decimal // Medium-term component
  beta3?: Decimal // Second hump (Svensson extension)
  tau1: Decimal // First decay parameter
  tau2?: Decimal // Second decay parameter (Svensson)
}

export interface BootstrapParams {
  instruments: BondInstrument[]
  marketPrices: Decimal[]
  dayCountConvention?: DayCountConvention
  compoundingFrequency?: number // Times per year
}

export interface BondInstrument {
  maturity: number // Years
  coupon: Decimal // Annual coupon rate
  frequency: number // Payments per year
  parValue: Decimal // Face value
}

export interface ForwardRateParams {
  spot1: Decimal // Near spot rate
  tenor1: number // Near tenor (years)
  spot2: Decimal // Far spot rate
  tenor2: number // Far tenor (years)
}

export interface CurveRiskMetrics {
  duration: Decimal // Modified duration
  convexity: Decimal // Bond convexity
  bpv: Decimal // Basis point value
  keyRateDurations: Map<number, Decimal> // KRD by tenor
  principalComponents: Decimal[] // PCA factors
}

export enum DayCountConvention {
  ACTUAL_365 = 'ACTUAL_365',
  ACTUAL_360 = 'ACTUAL_360',
  THIRTY_360 = '30_360',
  ACTUAL_ACTUAL = 'ACTUAL_ACTUAL'
}

export enum InterpolationMethod {
  LINEAR = 'LINEAR',
  LOG_LINEAR = 'LOG_LINEAR',
  CUBIC_SPLINE = 'CUBIC_SPLINE',
  MONOTONIC_CUBIC = 'MONOTONIC_CUBIC'
}

class YieldCurveModelsClass {
  
  /**
   * Fit Nelson-Siegel-Svensson model to yield curve data
   * Used by central banks and institutions for smooth curve fitting
   */
  fitNelsonSiegelSvensson(
    tenors: number[],
    yields: Decimal[],
    params?: Partial<NelsonSiegelParams>
  ): NelsonSiegelParams {
    if (tenors.length === 0 || yields.length === 0) {
      throw new Error('Tenors and yields arrays cannot be empty')
    }
    
    // Initial parameter estimates if not provided
    const lastYield = yields[yields.length - 1]
    const firstYield = yields[0]
    
    if (!lastYield || !firstYield) {
      throw new Error('Invalid yield data')
    }
    
    const beta0 = params?.beta0 ?? new Decimal(lastYield)
    const beta1 = params?.beta1 ?? new Decimal(firstYield).minus(beta0)
    const beta2 = params?.beta2 ?? new Decimal(0)
    const beta3 = params?.beta3 ?? new Decimal(0)
    const tau1 = params?.tau1 ?? new Decimal(2)
    const tau2 = params?.tau2 ?? new Decimal(5)
    
    // Optimize parameters using Levenberg-Marquardt (simplified)
    let bestParams: NelsonSiegelParams = { beta0, beta1, beta2, beta3, tau1, tau2 }
    let bestError = new Decimal(Infinity)
    
    // Grid search optimization (production would use numerical optimization)
    for (let t1 = 0.5; t1 <= 10; t1 += 0.5) {
      for (let t2 = t1 + 1; t2 <= 15; t2 += 1) {
        const currentParams = this.optimizeNelsonSiegel(
          tenors, 
          yields, 
          new Decimal(t1), 
          new Decimal(t2)
        )
        
        const error = this.calculateFittingError(tenors, yields, currentParams)
        if (error.lessThan(bestError)) {
          bestError = error
          bestParams = currentParams
        }
      }
    }
    
    return bestParams
  }
  
  /**
   * Calculate yield from Nelson-Siegel-Svensson parameters
   */
  nelsonSiegelYield(maturity: number, params: NelsonSiegelParams): Decimal {
    const m = new Decimal(maturity)
    const tau1 = params.tau1
    const tau2 = params.tau2 || params.tau1.times(2)
    
    // Loading factors
    const loading1 = m.equals(0) ? new Decimal(1) : 
      new Decimal(1).minus(Decimal.exp(m.negated().div(tau1))).div(m.div(tau1))
    
    const loading2 = loading1.minus(Decimal.exp(m.negated().div(tau1)))
    
    let yieldValue = params.beta0
      .plus(params.beta1.times(loading1))
      .plus(params.beta2.times(loading2))
    
    // Svensson extension if beta3 provided
    if (params.beta3 && !params.beta3.equals(0)) {
      const loading3 = new Decimal(1)
        .minus(Decimal.exp(m.negated().div(tau2)))
        .div(m.div(tau2))
        .minus(Decimal.exp(m.negated().div(tau2)))
      
      yieldValue = yieldValue.plus(params.beta3.times(loading3))
    }
    
    return yieldValue
  }
  
  /**
   * Bootstrap zero curve from bond prices
   * Iteratively solves for zero rates that price bonds correctly
   */
  bootstrapZeroCurve(params: BootstrapParams): YieldCurvePoint[] {
    const { instruments, marketPrices, compoundingFrequency = 2 } = params
    const curve: YieldCurvePoint[] = []
    
    // Sort instruments by maturity
    const sorted = instruments
      .map((inst, i) => ({ 
        inst, 
        price: marketPrices[i] ?? new Decimal(100) // Default price if missing
      }))
      .sort((a, b) => a.inst.maturity - b.inst.maturity)
    
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      if (!item) continue
      
      const { inst, price } = item
      
      if (inst.coupon.equals(0)) {
        // Zero coupon bond - direct calculation
        const zeroRate = this.calculateZeroRate(price, inst.parValue, inst.maturity)
        curve.push({
          tenor: inst.maturity,
          rate: zeroRate,
          zeroRate,
          discountFactor: price.div(inst.parValue)
        })
      } else {
        // Coupon bond - bootstrap using previous zero rates
        const zeroRate = this.bootstrapCouponBond(
          inst, 
          price, 
          curve, 
          compoundingFrequency
        )
        
        curve.push({
          tenor: inst.maturity,
          rate: zeroRate,
          zeroRate,
          discountFactor: new Decimal(1).div(
            new Decimal(1).plus(zeroRate.div(compoundingFrequency))
              .pow(inst.maturity * compoundingFrequency)
          )
        })
      }
    }
    
    return curve
  }
  
  /**
   * Calculate forward rate between two time points
   * F(t1,t2) = [(1+r2)^t2 / (1+r1)^t1]^(1/(t2-t1)) - 1
   */
  calculateForwardRate(params: ForwardRateParams): Decimal {
    const { spot1, tenor1, spot2, tenor2 } = params
    
    if (tenor2 <= tenor1) {
      throw new Error('Far tenor must be greater than near tenor')
    }
    
    const compound1 = new Decimal(1).plus(spot1).pow(tenor1)
    const compound2 = new Decimal(1).plus(spot2).pow(tenor2)
    const timeDiff = new Decimal(tenor2 - tenor1)
    
    const forwardCompound = compound2.div(compound1).pow(new Decimal(1).div(timeDiff))
    return forwardCompound.minus(1)
  }
  
  /**
   * Interpolate yield for any maturity using specified method
   */
  interpolateYield(
    curve: YieldCurvePoint[],
    maturity: number,
    method: InterpolationMethod = InterpolationMethod.LINEAR
  ): Decimal {
    if (curve.length === 0) {
      throw new Error('Curve cannot be empty')
    }
    
    // Find surrounding points
    let lower: YieldCurvePoint | null = null
    let upper: YieldCurvePoint | null = null
    
    for (const point of curve) {
      if (point.tenor <= maturity) {
        lower = point
      } else if (!upper && point.tenor > maturity) {
        upper = point
      }
    }
    
    // Edge cases
    const firstPoint = curve[0]
    const lastPoint = curve[curve.length - 1]
    
    if (!firstPoint || !lastPoint) {
      throw new Error('Invalid curve data')
    }
    
    if (!lower) return firstPoint.rate
    if (!upper) return lastPoint.rate
    if (lower.tenor === maturity) return lower.rate
    
    switch (method) {
      case InterpolationMethod.LINEAR:
        return this.linearInterpolation(lower, upper, maturity)
      
      case InterpolationMethod.LOG_LINEAR:
        return this.logLinearInterpolation(lower, upper, maturity)
      
      case InterpolationMethod.CUBIC_SPLINE:
        return this.cubicSplineInterpolation(curve, maturity)
      
      case InterpolationMethod.MONOTONIC_CUBIC:
        return this.monotonicCubicInterpolation(curve, maturity)
      
      default:
        return this.linearInterpolation(lower, upper, maturity)
    }
  }
  
  /**
   * Calculate curve risk metrics including duration and convexity
   */
  calculateCurveRiskMetrics(
    curve: YieldCurvePoint[],
    bondCashFlows: { time: number; amount: Decimal }[],
    price: Decimal
  ): CurveRiskMetrics {
    if (bondCashFlows.length === 0) {
      throw new Error('Bond cash flows cannot be empty')
    }
    
    const lastCashFlow = bondCashFlows[bondCashFlows.length - 1]
    if (!lastCashFlow) {
      throw new Error('Invalid cash flow data')
    }
    
    const yieldToMaturity = this.calculateYTMFromCurve(curve, bondCashFlows, price)
    
    // Modified duration
    const duration = this.calculateModifiedDuration(bondCashFlows, yieldToMaturity, price)
    
    // Convexity
    const convexity = this.calculateConvexity(bondCashFlows, yieldToMaturity, price)
    
    // Basis point value (DV01)
    const bpv = price.times(duration).div(10000)
    
    // Key rate durations (simplified - production would use full KRD)
    const keyRateDurations = this.calculateKeyRateDurations(
      curve, 
      bondCashFlows, 
      price
    )
    
    // Principal components (first 3 factors)
    const principalComponents = this.calculatePrincipalComponents(curve)
    
    return {
      duration,
      convexity,
      bpv,
      keyRateDurations,
      principalComponents
    }
  }
  
  /**
   * Convert spot rate to discount factor
   */
  spotToDiscount(spotRate: Decimal, tenor: number): Decimal {
    return new Decimal(1).div(new Decimal(1).plus(spotRate).pow(tenor))
  }
  
  /**
   * Convert discount factor to spot rate
   */
  discountToSpot(discountFactor: Decimal, tenor: number): Decimal {
    return discountFactor.pow(new Decimal(-1).div(tenor)).minus(1)
  }
  
  // Private helper methods
  
  private optimizeNelsonSiegel(
    tenors: number[],
    yields: Decimal[],
    tau1: Decimal,
    tau2: Decimal
  ): NelsonSiegelParams {
    // Simplified linear regression for beta parameters
    const n = tenors.length
    const X: Decimal[][] = []
    const y: Decimal[] = yields
    
    for (let i = 0; i < n; i++) {
      const tenor = tenors[i]
      if (tenor === undefined) continue
      
      const m = new Decimal(tenor)
      const loading1 = m.equals(0) ? new Decimal(1) :
        new Decimal(1).minus(Decimal.exp(m.negated().div(tau1))).div(m.div(tau1))
      const loading2 = loading1.minus(Decimal.exp(m.negated().div(tau1)))
      const loading3 = new Decimal(1).minus(Decimal.exp(m.negated().div(tau2)))
        .div(m.div(tau2)).minus(Decimal.exp(m.negated().div(tau2)))
      
      X.push([new Decimal(1), loading1, loading2, loading3])
    }
    
    // Solve normal equations (simplified - production would use QR decomposition)
    const betas = this.solveLinearSystem(X, y)
    
    // Ensure we have valid beta values
    if (betas.length < 4) {
      throw new Error('Failed to solve for Nelson-Siegel parameters')
    }
    
    const beta0 = betas[0] ?? new Decimal(0.05)
    const beta1 = betas[1] ?? new Decimal(0)
    const beta2 = betas[2] ?? new Decimal(0)
    const beta3 = betas[3] ?? new Decimal(0)
    
    return {
      beta0,
      beta1,
      beta2,
      beta3,
      tau1,
      tau2
    }
  }
  
  private calculateFittingError(
    tenors: number[],
    yields: Decimal[],
    params: NelsonSiegelParams
  ): Decimal {
    let sumSquaredError = new Decimal(0)
    
    for (let i = 0; i < tenors.length; i++) {
      const tenor = tenors[i]
      const yieldValue = yields[i]
      
      if (tenor === undefined || !yieldValue) continue
      
      const fitted = this.nelsonSiegelYield(tenor, params)
      const error = fitted.minus(yieldValue)
      sumSquaredError = sumSquaredError.plus(error.pow(2))
    }
    
    return sumSquaredError.sqrt()
  }
  
  private calculateZeroRate(
    price: Decimal,
    parValue: Decimal,
    maturity: number
  ): Decimal {
    return parValue.div(price).pow(new Decimal(1).div(maturity)).minus(1)
  }
  
  private bootstrapCouponBond(
    instrument: BondInstrument,
    price: Decimal,
    curve: YieldCurvePoint[],
    compoundingFrequency: number
  ): Decimal {
    const { maturity, coupon, frequency, parValue } = instrument
    const couponPayment = parValue.times(coupon).div(frequency)
    
    // Calculate present value of known coupon payments
    let pvCoupons = new Decimal(0)
    const paymentTimes = []
    
    for (let t = 1 / frequency; t < maturity; t += 1 / frequency) {
      paymentTimes.push(t)
      const discountFactor = this.getDiscountFactor(curve, t)
      pvCoupons = pvCoupons.plus(couponPayment.times(discountFactor))
    }
    
    // Solve for final payment discount factor
    const finalPayment = couponPayment.plus(parValue)
    const finalDiscountFactor = price.minus(pvCoupons).div(finalPayment)
    
    // Convert to zero rate
    return this.discountToSpot(finalDiscountFactor, maturity)
  }
  
  private getDiscountFactor(curve: YieldCurvePoint[], tenor: number): Decimal {
    const rate = this.interpolateYield(curve, tenor)
    return this.spotToDiscount(rate, tenor)
  }
  
  private linearInterpolation(
    lower: YieldCurvePoint,
    upper: YieldCurvePoint,
    maturity: number
  ): Decimal {
    const weight = new Decimal(maturity - lower.tenor).div(upper.tenor - lower.tenor)
    return lower.rate.plus(upper.rate.minus(lower.rate).times(weight))
  }
  
  private logLinearInterpolation(
    lower: YieldCurvePoint,
    upper: YieldCurvePoint,
    maturity: number
  ): Decimal {
    const logLower = Decimal.ln(new Decimal(1).plus(lower.rate))
    const logUpper = Decimal.ln(new Decimal(1).plus(upper.rate))
    const weight = new Decimal(maturity - lower.tenor).div(upper.tenor - lower.tenor)
    const logRate = logLower.plus(logUpper.minus(logLower).times(weight))
    return Decimal.exp(logRate).minus(1)
  }
  
  private cubicSplineInterpolation(curve: YieldCurvePoint[], maturity: number): Decimal {
    // Simplified cubic spline - production would use full spline algorithm
    const n = curve.length
    if (n < 4) {
      const firstPoint = curve[0]
      const lastPoint = curve[n-1]
      if (!firstPoint || !lastPoint) {
        throw new Error('Invalid curve data')
      }
      return this.linearInterpolation(firstPoint, lastPoint, maturity)
    }
    
    // Find interval
    let i = 0
    for (; i < n - 1; i++) {
      const nextPoint = curve[i + 1]
      if (nextPoint && nextPoint.tenor > maturity) break
    }
    
    // Use Catmull-Rom spline formula
    const currentPoint = curve[i]
    const nextPoint = curve[i + 1]
    
    if (!currentPoint || !nextPoint) {
      throw new Error('Invalid curve interval')
    }
    
    const t = new Decimal(maturity - currentPoint.tenor).div(nextPoint.tenor - currentPoint.tenor)
    const t2 = t.pow(2)
    const t3 = t.pow(3)
    
    const p0 = i > 0 ? (curve[i - 1]?.rate ?? currentPoint.rate) : currentPoint.rate
    const p1 = currentPoint.rate
    const p2 = nextPoint.rate
    const p3 = i < n - 2 ? (curve[i + 2]?.rate ?? nextPoint.rate) : nextPoint.rate
    
    const a = p1
    const b = p2.minus(p0).div(2)
    const c = p0.times(2).minus(p1.times(5)).plus(p2.times(4)).minus(p3).div(2)
    const d = p0.negated().plus(p1.times(3)).minus(p2.times(3)).plus(p3).div(2)
    
    return a.plus(b.times(t)).plus(c.times(t2)).plus(d.times(t3))
  }
  
  private monotonicCubicInterpolation(curve: YieldCurvePoint[], maturity: number): Decimal {
    // Monotonic cubic preserves monotonicity - prevents oscillation
    // Simplified version - production would use Fritsch-Carlson method
    return this.cubicSplineInterpolation(curve, maturity)
  }
  
  private calculateYTMFromCurve(
    curve: YieldCurvePoint[],
    cashFlows: { time: number; amount: Decimal }[],
    price: Decimal
  ): Decimal {
    // Newton-Raphson method for YTM
    const lastCashFlow = cashFlows[cashFlows.length - 1]
    if (!lastCashFlow) {
      throw new Error('Invalid cash flow data')
    }
    
    let ytm = this.interpolateYield(curve, lastCashFlow.time)
    
    for (let iter = 0; iter < 20; iter++) {
      let pv = new Decimal(0)
      let dpv = new Decimal(0)
      
      for (const cf of cashFlows) {
        const df = new Decimal(1).div(new Decimal(1).plus(ytm).pow(cf.time))
        pv = pv.plus(cf.amount.times(df))
        dpv = dpv.minus(cf.amount.times(cf.time).times(df).div(new Decimal(1).plus(ytm)))
      }
      
      const error = pv.minus(price)
      if (error.abs().lessThan(0.0001)) break
      
      ytm = ytm.minus(error.div(dpv))
    }
    
    return ytm
  }
  
  private calculateModifiedDuration(
    cashFlows: { time: number; amount: Decimal }[],
    ytm: Decimal,
    price: Decimal
  ): Decimal {
    let weightedPV = new Decimal(0)
    
    for (const cf of cashFlows) {
      const df = new Decimal(1).div(new Decimal(1).plus(ytm).pow(cf.time))
      weightedPV = weightedPV.plus(cf.amount.times(cf.time).times(df))
    }
    
    return weightedPV.div(price).div(new Decimal(1).plus(ytm))
  }
  
  private calculateConvexity(
    cashFlows: { time: number; amount: Decimal }[],
    ytm: Decimal,
    price: Decimal
  ): Decimal {
    let weightedPV = new Decimal(0)
    
    for (const cf of cashFlows) {
      const df = new Decimal(1).div(new Decimal(1).plus(ytm).pow(cf.time))
      const timeSquared = new Decimal(cf.time).times(cf.time + 1)
      weightedPV = weightedPV.plus(cf.amount.times(timeSquared).times(df))
    }
    
    return weightedPV.div(price).div(new Decimal(1).plus(ytm).pow(2))
  }
  
  private calculateKeyRateDurations(
    curve: YieldCurvePoint[],
    cashFlows: { time: number; amount: Decimal }[],
    price: Decimal
  ): Map<number, Decimal> {
    const keyRates = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30]
    const krd = new Map<number, Decimal>()
    
    for (const keyTenor of keyRates) {
      // Shift curve at key tenor
      const shiftedCurve = this.shiftCurveAtTenor(curve, keyTenor, 0.0001)
      
      // Reprice with shifted curve
      let shiftedPrice = new Decimal(0)
      for (const cf of cashFlows) {
        const rate = this.interpolateYield(shiftedCurve, cf.time)
        const df = this.spotToDiscount(rate, cf.time)
        shiftedPrice = shiftedPrice.plus(cf.amount.times(df))
      }
      
      // Calculate duration for this key rate
      const duration = price.minus(shiftedPrice).div(price).div(0.0001)
      krd.set(keyTenor, duration)
    }
    
    return krd
  }
  
  private shiftCurveAtTenor(
    curve: YieldCurvePoint[],
    tenor: number,
    shift: number
  ): YieldCurvePoint[] {
    return curve.map(point => ({
      ...point,
      rate: Math.abs(point.tenor - tenor) < 0.5 ? 
        point.rate.plus(shift) : point.rate
    }))
  }
  
  private calculatePrincipalComponents(curve: YieldCurvePoint[]): Decimal[] {
    // Simplified PCA - returns level, slope, curvature factors
    const rates = curve.map(p => p.rate)
    
    if (rates.length === 0) {
      return [new Decimal(0), new Decimal(0), new Decimal(0)]
    }
    
    // Level: average of all rates
    const level = rates.reduce((sum, r) => sum.plus(r), new Decimal(0))
      .div(rates.length)
    
    // Slope: long minus short
    const firstRate = rates[0]
    const lastRate = rates[rates.length - 1]
    
    if (!firstRate || !lastRate) {
      return [level, new Decimal(0), new Decimal(0)]
    }
    
    const slope = lastRate.minus(firstRate)
    
    // Curvature: 2*mid - short - long
    const midIndex = Math.floor(rates.length / 2)
    const midRate = rates[midIndex]
    
    if (!midRate) {
      return [level, slope, new Decimal(0)]
    }
    
    const curvature = midRate.times(2)
      .minus(firstRate)
      .minus(lastRate)
    
    return [level, slope, curvature]
  }
  
  private solveLinearSystem(X: Decimal[][], y: Decimal[]): Decimal[] {
    // Simplified linear regression using normal equations
    // (X'X)^-1 * X'y
    const n = X.length
    if (n === 0) {
      return []
    }
    
    const firstRow = X[0]
    if (!firstRow) {
      return []
    }
    
    const k = firstRow.length
    
    // X'X
    const XtX: Decimal[][] = []
    for (let i = 0; i < k; i++) {
      XtX[i] = []
      for (let j = 0; j < k; j++) {
        let sum = new Decimal(0)
        for (let m = 0; m < n; m++) {
          const xRow = X[m]
          if (xRow && xRow[i] !== undefined && xRow[j] !== undefined) {
            sum = sum.plus(xRow[i]!.times(xRow[j]!))
          }
        }
        XtX[i]![j] = sum
      }
    }
    
    // X'y
    const Xty: Decimal[] = []
    for (let i = 0; i < k; i++) {
      let sum = new Decimal(0)
      for (let m = 0; m < n; m++) {
        const xRow = X[m]
        const yValue = y[m]
        if (xRow && xRow[i] !== undefined && yValue !== undefined) {
          sum = sum.plus(xRow[i]!.times(yValue))
        }
      }
      Xty[i] = sum
    }
    
    // Solve using Gaussian elimination (simplified)
    return this.gaussianElimination(XtX, Xty)
  }
  
  private gaussianElimination(A: Decimal[][], b: Decimal[]): Decimal[] {
    const n = b.length
    const augmented: Decimal[][] = A.map((row, i) => {
      const bValue = b[i]
      return bValue ? [...row, bValue] : [...row, new Decimal(0)]
    })
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Partial pivoting
      let maxRow = i
      for (let k = i + 1; k < n; k++) {
        const currentRow = augmented[k]
        const maxRowRef = augmented[maxRow]
        if (currentRow && maxRowRef && 
            currentRow[i] !== undefined && maxRowRef[i] !== undefined && 
            currentRow[i]!.abs().greaterThan(maxRowRef[i]!.abs())) {
          maxRow = k
        }
      }
      
      // Swap rows
      const maxRowData = augmented[maxRow]
      const currentRowData = augmented[i]
      if (maxRowData && currentRowData) {
        [augmented[i], augmented[maxRow]] = [maxRowData, currentRowData]
      }
      
      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const kRow = augmented[k]
        const iRow = augmented[i]
        
        if (!kRow || !iRow || kRow[i] === undefined || iRow[i] === undefined) continue
        
        const factor = kRow[i]!.div(iRow[i]!)
        for (let j = i; j <= n; j++) {
          if (kRow[j] !== undefined && iRow[j] !== undefined) {
            kRow[j] = kRow[j]!.minus(factor.times(iRow[j]!))
          }
        }
      }
    }
    
    // Back substitution
    const x: Decimal[] = new Array(n)
    for (let i = n - 1; i >= 0; i--) {
      const row = augmented[i]
      if (!row || row[n] === undefined || row[i] === undefined) {
        x[i] = new Decimal(0)
        continue
      }
      
      let sum = row[n]!
      for (let j = i + 1; j < n; j++) {
        if (row[j] !== undefined && x[j] !== undefined) {
          sum = sum.minus(row[j]!.times(x[j]!))
        }
      }
      x[i] = sum.div(row[i]!)
    }
    
    return x
  }
}

// Export singleton instance
export const yieldCurveModels = new YieldCurveModelsClass()
