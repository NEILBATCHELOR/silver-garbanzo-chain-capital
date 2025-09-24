/**
 * Mathematical utilities for financial calculations
 */

/**
 * Normal cumulative distribution function
 * Used in Black-Scholes and other option pricing models
 */
export function normalCDF(x: number): number {
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
 * Used in Monte Carlo simulations
 */
export function normalRandom(): number {
  let u = 0
  let v = 0
  
  while (u === 0) u = Math.random()  // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random()
  
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * Normal probability density function
 */
export function normalPDF(x: number, mean: number = 0, stdDev: number = 1): number {
  const factor = 1 / (stdDev * Math.sqrt(2 * Math.PI))
  const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2)
  return factor * Math.exp(exponent)
}

/**
 * Inverse normal cumulative distribution (probit function)
 * Approximation using Beasley-Springer-Moro algorithm
 */
export function normalInverseCDF(p: number): number {
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
            0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
            0.0000321767881768, 0.0000002888167364, 0.0000003960315187]
  
  const y = p - 0.5
  
  if (Math.abs(y) < 0.42) {
    const r = y * y
    return y * (((a[3]! * r + a[2]!) * r + a[1]!) * r + a[0]!) /
               ((((b[3]! * r + b[2]!) * r + b[1]!) * r + b[0]!) * r + 1)
  } else {
    let r = p
    if (y > 0) r = 1 - p
    
    r = Math.log(-Math.log(r))
    let x: number = c[0]!
    for (let i = 1; i < 9; i++) {
      x = x * r + c[i]!
    }
    
    return y < 0 ? -x : x
  }
}

/**
 * Calculate correlation coefficient
 */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error('Arrays must have same length')
  }
  
  const n = x.length
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n
  
  let covariance = 0
  let varX = 0
  let varY = 0
  
  for (let i = 0; i < n; i++) {
    const dx = (x[i] ?? 0) - meanX
    const dy = (y[i] ?? 0) - meanY
    covariance += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  
  return covariance / Math.sqrt(varX * varY)
}

/**
 * Linear interpolation
 */
export function linearInterpolation(x: number, x1: number, y1: number, x2: number, y2: number): number {
  return y1 + (y2 - y1) * (x - x1) / (x2 - x1)
}
