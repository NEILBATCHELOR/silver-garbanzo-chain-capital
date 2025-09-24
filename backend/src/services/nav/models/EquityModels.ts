/**
 * Equity valuation models
 * Implements DDM, CAPM, P/E ratio valuation, and other equity-specific models
 * Per specification: NAV Pricing - Traditionals
 */

import { Decimal } from 'decimal.js'

// Configure Decimal for maximum precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface DividendProjection {
  year: number
  dividend: number
  growthRate?: number
}

export interface CAPMParams {
  riskFreeRate: number
  marketReturn: number
  beta: number
}

export interface DDMParams {
  currentDividend: number
  growthRate: number
  requiredReturn: number
  terminalGrowthRate?: number
  forecastPeriod?: number
}

export interface MultiplierValuation {
  pe?: number  // Price-to-Earnings
  pb?: number  // Price-to-Book
  ps?: number  // Price-to-Sales
  ev_ebitda?: number  // Enterprise Value to EBITDA
}

export class EquityModels {
  
  /**
   * Dividend Discount Model (Gordon Growth Model)
   * Specification: "Values equity as present value of expected future dividends"
   */
  dividendDiscountModel(params: DDMParams): Decimal {
    const { currentDividend, growthRate, requiredReturn, terminalGrowthRate, forecastPeriod } = params
    
    // Validate inputs
    if (requiredReturn <= growthRate) {
      throw new Error('Required return must exceed growth rate for DDM to converge')
    }
    
    // Single-stage Gordon Growth Model
    if (!forecastPeriod || forecastPeriod === 0) {
      const nextDividend = new Decimal(currentDividend).mul(1 + growthRate)
      return nextDividend.div(requiredReturn - growthRate)
    }
    
    // Two-stage DDM
    let pv = new Decimal(0)
    let dividend = new Decimal(currentDividend)
    
    // Stage 1: High growth period
    for (let year = 1; year <= forecastPeriod; year++) {
      dividend = dividend.mul(1 + growthRate)
      const discountFactor = Math.pow(1 + requiredReturn, -year)
      pv = pv.plus(dividend.mul(discountFactor))
    }
    
    // Stage 2: Terminal value (perpetuity with terminal growth)
    const terminalGrowth = terminalGrowthRate ?? growthRate * 0.5  // Default to half of initial growth
    if (requiredReturn > terminalGrowth) {
      const terminalDividend = dividend.mul(1 + terminalGrowth)
      const terminalValue = terminalDividend.div(requiredReturn - terminalGrowth)
      const discountFactor = Math.pow(1 + requiredReturn, -forecastPeriod)
      pv = pv.plus(terminalValue.mul(discountFactor))
    }
    
    return pv
  }
  
  /**
   * Capital Asset Pricing Model (CAPM)
   * Calculate required return for equity
   * Specification: "Beta: Measure of equity's volatility relative to market"
   */
  calculateCAPM(params: CAPMParams): number {
    const { riskFreeRate, marketReturn, beta } = params
    
    // CAPM: E(Ri) = Rf + βi(E(Rm) - Rf)
    const marketPremium = marketReturn - riskFreeRate
    return riskFreeRate + beta * marketPremium
  }
  
  /**
   * Calculate Beta coefficient
   * Specification: "Measure of equity's volatility relative to the market"
   */
  calculateBeta(equityReturns: number[], marketReturns: number[]): number {
    if (equityReturns.length !== marketReturns.length) {
      throw new Error('Equity and market return arrays must have same length')
    }
    
    const n = equityReturns.length
    const meanEquity = equityReturns.reduce((a, b) => a + b, 0) / n
    const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / n
    
    let covariance = 0
    let marketVariance = 0
    
    for (let i = 0; i < n; i++) {
      const equityDev = (equityReturns[i] || 0) - meanEquity
      const marketDev = (marketReturns[i] || 0) - meanMarket
      covariance += equityDev * marketDev
      marketVariance += marketDev * marketDev
    }
    
    return covariance / marketVariance
  }
  
  /**
   * P/E Ratio Valuation
   * Specification: "Price-to-Earnings (P/E) Ratio used in relative valuation"
   */
  peRatioValuation(
    earnings: number,
    industryPE: number,
    adjustmentFactor: number = 1.0
  ): Decimal {
    // Value = Earnings × Industry P/E × Company-specific adjustment
    return new Decimal(earnings).mul(industryPE).mul(adjustmentFactor)
  }
  
  /**
   * Price-to-Book (P/B) Ratio Valuation
   * Specification: "Book Value: Total assets minus liabilities"
   */
  pbRatioValuation(
    bookValue: number,
    industryPB: number,
    adjustmentFactor: number = 1.0
  ): Decimal {
    return new Decimal(bookValue).mul(industryPB).mul(adjustmentFactor)
  }
  
  /**
   * Enterprise Value to EBITDA Valuation
   */
  evEbitdaValuation(
    ebitda: number,
    industryMultiple: number,
    netDebt: number = 0,
    cash: number = 0
  ): Decimal {
    // Enterprise Value = EBITDA × Multiple
    const enterpriseValue = new Decimal(ebitda).mul(industryMultiple)
    
    // Equity Value = Enterprise Value - Net Debt + Cash
    return enterpriseValue.minus(netDebt).plus(cash)
  }
  
  /**
   * Discounted Cash Flow (DCF) for Equity
   * Free Cash Flow to Equity (FCFE) approach
   */
  dcfEquity(
    cashFlows: number[],
    terminalValue: number,
    discountRate: number
  ): Decimal {
    let pv = new Decimal(0)
    
    // Discount projected cash flows
    for (let year = 0; year < cashFlows.length; year++) {
      const cf = cashFlows[year]
      if (cf !== undefined) {
        const discountFactor = Math.pow(1 + discountRate, -(year + 1))
        pv = pv.plus(new Decimal(cf).mul(discountFactor))
      }
    }
    
    // Add terminal value
    const terminalDiscountFactor = Math.pow(1 + discountRate, -cashFlows.length)
    pv = pv.plus(new Decimal(terminalValue).mul(terminalDiscountFactor))
    
    return pv
  }
  
  /**
   * Earnings Growth Model
   * Calculate sustainable growth rate
   */
  sustainableGrowthRate(
    returnOnEquity: number,
    payoutRatio: number
  ): number {
    // g = ROE × (1 - Payout Ratio)
    return returnOnEquity * (1 - payoutRatio)
  }
  
  /**
   * Residual Income Model
   * Values equity based on book value plus present value of residual income
   */
  residualIncomeModel(
    bookValue: number,
    projectedEarnings: number[],
    costOfEquity: number,
    terminalGrowth: number = 0
  ): Decimal {
    let value = new Decimal(bookValue)
    let currentBookValue = bookValue
    
    // Calculate residual income for each period
    for (let year = 0; year < projectedEarnings.length; year++) {
      const earnings = projectedEarnings[year]
      if (earnings !== undefined) {
        const expectedEarnings = currentBookValue * costOfEquity
        const residualIncome = earnings - expectedEarnings
        
        const discountFactor = Math.pow(1 + costOfEquity, -(year + 1))
        value = value.plus(new Decimal(residualIncome).mul(discountFactor))
        
        // Update book value (assuming clean surplus)
        const retention = earnings * 0.6  // Assume 60% retention
        currentBookValue += retention
      }
    }
    
    // Terminal value of residual income
    if (costOfEquity > terminalGrowth && projectedEarnings.length > 0) {
      const lastEarnings = projectedEarnings[projectedEarnings.length - 1]
      if (lastEarnings !== undefined) {
        const lastResidualIncome = lastEarnings - currentBookValue * costOfEquity
        const terminalResidualIncome = lastResidualIncome * (1 + terminalGrowth)
        const terminalValue = terminalResidualIncome / (costOfEquity - terminalGrowth)
        const discountFactor = Math.pow(1 + costOfEquity, -projectedEarnings.length)
        
        value = value.plus(new Decimal(terminalValue).mul(discountFactor))
      }
    }
    
    return value
  }
  
  /**
   * Calculate implied equity risk premium
   */
  impliedEquityRiskPremium(
    marketPrice: number,
    expectedDividend: number,
    growthRate: number,
    riskFreeRate: number
  ): number {
    // Rearranging Gordon Growth: r = (D1/P0) + g
    const impliedReturn = (expectedDividend / marketPrice) + growthRate
    return impliedReturn - riskFreeRate
  }
}

// Export singleton instance
export const equityModels = new EquityModels()
