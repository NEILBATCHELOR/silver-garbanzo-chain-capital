/**
 * Real Estate Financial Models
 * 
 * Comprehensive valuation models for real estate assets including:
 * - Income approach (Cap Rate, NOI)
 * - Comparable sales approach
 * - Cost approach
 * - Leveraged returns
 * - DCF for property valuation
 * 
 * Based on NAV Pricing Specification - Alternatives
 */

import { Decimal } from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: 4 })

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface Property {
  address: string
  type: 'residential' | 'commercial' | 'industrial' | 'retail' | 'mixed_use'
  squareFeet: number
  yearBuilt: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  location: 'prime' | 'secondary' | 'tertiary'
}

export interface Adjustment {
  factor: string
  adjustment: number // Percentage or absolute
  isPercentage: boolean
}

export interface IncomeApproachParams {
  netOperatingIncome: number
  capRate: number
  growthRate?: number
  holdingPeriod?: number
}

export interface ComparableSalesParams {
  comparables: Property[]
  subjectProperty: Property
  adjustments: Adjustment[]
  pricesPerSqFt: number[]
}

export interface CostApproachParams {
  landValue: number
  improvementCost: number
  depreciation: number
  replacementCost?: number
  functionalObsolescence?: number
  economicObsolescence?: number
}

export interface LeveragedYieldParams {
  unleveragedReturn: number
  leverageRatio: number
  debtCost: number
  amortizationPeriod?: number
}

export interface RealEstateDCFParams {
  rentalIncome: number[]
  operatingExpenses: number[]
  capitalExpenses: number[]
  terminalCapRate: number
  discountRate: number
  holdingPeriod: number
  financingTerms?: {
    loanAmount: number
    interestRate: number
    amortizationPeriod: number
  }
}

export interface RealEstateMetrics {
  grossRentMultiplier: number
  debtServiceCoverageRatio: number
  cashOnCashReturn: number
  internalRateOfReturn: number
  equityMultiple: number
}

// ============================================================================
// REAL ESTATE MODELS SINGLETON
// ============================================================================

class RealEstateModels {
  private static instance: RealEstateModels

  private constructor() {}

  public static getInstance(): RealEstateModels {
    if (!RealEstateModels.instance) {
      RealEstateModels.instance = new RealEstateModels()
    }
    return RealEstateModels.instance
  }

  // ==========================================================================
  // INCOME APPROACH
  // ==========================================================================

  /**
   * Income approach valuation using Cap Rate and NOI
   * SPECIFICATION: "Cap Rate (Capitalization Rate): Net operating income divided by property value"
   */
  public incomeApproach(params: IncomeApproachParams): Decimal {
    const { netOperatingIncome, capRate, growthRate = 0, holdingPeriod = 0 } = params
    
    const noi = new Decimal(netOperatingIncome)
    const cap = new Decimal(capRate)
    
    if (cap.equals(0)) {
      throw new Error('Cap rate cannot be zero')
    }
    
    // Basic income approach: Value = NOI / Cap Rate
    let value = noi.dividedBy(cap)
    
    // If growth rate and holding period specified, use Gordon Growth Model
    if (growthRate > 0 && holdingPeriod > 0) {
      const g = new Decimal(growthRate)
      const n = holdingPeriod
      
      // Value = NOI / (Cap Rate - Growth Rate) * [1 - (1 + g)^n / (1 + cap)^n]
      if (cap.greaterThan(g)) {
        const growthFactor = new Decimal(1).plus(g).pow(n)
        const discountFactor = new Decimal(1).plus(cap).pow(n)
        const pvFactor = new Decimal(1).minus(growthFactor.dividedBy(discountFactor))
        
        value = noi.dividedBy(cap.minus(g)).times(pvFactor)
      }
    }
    
    return value
  }

  /**
   * Calculate Net Operating Income (NOI)
   * SPECIFICATION: "Net Operating Income (NOI): Rental income minus operating expenses"
   */
  public calculateNOI(
    grossRentalIncome: number,
    vacancyRate: number,
    operatingExpenses: number,
    otherIncome: number = 0
  ): Decimal {
    const gross = new Decimal(grossRentalIncome)
    const vacancy = new Decimal(vacancyRate)
    const expenses = new Decimal(operatingExpenses)
    const other = new Decimal(otherIncome)
    
    // Effective Gross Income = Gross Rental Income * (1 - Vacancy Rate) + Other Income
    const effectiveGrossIncome = gross.times(new Decimal(1).minus(vacancy)).plus(other)
    
    // NOI = Effective Gross Income - Operating Expenses
    return effectiveGrossIncome.minus(expenses)
  }

  /**
   * Calculate appropriate Cap Rate based on property characteristics
   */
  public calculateCapRate(
    riskFreeRate: number,
    riskPremium: number,
    propertyType: 'residential' | 'commercial' | 'industrial' | 'retail',
    location: 'prime' | 'secondary' | 'tertiary'
  ): Decimal {
    const rf = new Decimal(riskFreeRate)
    const rp = new Decimal(riskPremium)
    
    // Property type adjustments
    const typeAdjustments: Record<string, number> = {
      'residential': 0,
      'commercial': 0.005,
      'industrial': 0.01,
      'retail': 0.015
    }
    
    // Location adjustments
    const locationAdjustments: Record<string, number> = {
      'prime': -0.01,
      'secondary': 0,
      'tertiary': 0.015
    }
    
    const typeAdj = new Decimal(typeAdjustments[propertyType] || 0)
    const locAdj = new Decimal(locationAdjustments[location] || 0)
    
    // Cap Rate = Risk Free Rate + Risk Premium + Type Adjustment + Location Adjustment
    return rf.plus(rp).plus(typeAdj).plus(locAdj)
  }

  // ==========================================================================
  // COMPARABLE SALES APPROACH
  // ==========================================================================

  /**
   * Sales comparison approach using comparable properties
   * SPECIFICATION: "Appraisal Value via comparables"
   */
  public comparableSalesApproach(params: ComparableSalesParams): Decimal {
    const { comparables, subjectProperty, adjustments, pricesPerSqFt } = params
    
    if (comparables.length === 0 || comparables.length !== pricesPerSqFt.length) {
      throw new Error('Invalid comparables data')
    }
    
    const adjustedPrices: Decimal[] = []
    
    for (let i = 0; i < comparables.length; i++) {
      const comp = comparables[i]!
      let pricePerSqFt = new Decimal(pricesPerSqFt[i]!)
      
      // Apply adjustments for differences between comparable and subject
      for (const adj of adjustments) {
        let adjustmentValue = new Decimal(0)
        
        // Common adjustments
        if (adj.factor === 'size') {
          const sizeDiff = (comp.squareFeet - subjectProperty.squareFeet) / subjectProperty.squareFeet
          adjustmentValue = new Decimal(sizeDiff * -0.1) // -10% per 100% size difference
        } else if (adj.factor === 'age') {
          const ageDiff = (comp.yearBuilt - subjectProperty.yearBuilt) / 10 // Per decade
          adjustmentValue = new Decimal(ageDiff * 0.02) // 2% per decade
        } else if (adj.factor === 'condition') {
          const conditions = ['poor', 'fair', 'good', 'excellent']
          const compIndex = conditions.indexOf(comp.condition)
          const subjectIndex = conditions.indexOf(subjectProperty.condition)
          adjustmentValue = new Decimal((compIndex - subjectIndex) * 0.05) // 5% per level
        } else if (adj.factor === 'location') {
          const locations = ['tertiary', 'secondary', 'prime']
          const compIndex = locations.indexOf(comp.location)
          const subjectIndex = locations.indexOf(subjectProperty.location)
          adjustmentValue = new Decimal((compIndex - subjectIndex) * 0.1) // 10% per level
        } else {
          // Custom adjustment
          adjustmentValue = new Decimal(adj.adjustment)
          if (!adj.isPercentage) {
            adjustmentValue = adjustmentValue.dividedBy(pricePerSqFt) // Convert to percentage
          }
        }
        
        // Apply adjustment
        pricePerSqFt = pricePerSqFt.times(new Decimal(1).plus(adjustmentValue))
      }
      
      adjustedPrices.push(pricePerSqFt)
    }
    
    // Calculate weighted average of adjusted prices
    let totalWeight = new Decimal(0)
    let weightedSum = new Decimal(0)
    
    for (let i = 0; i < adjustedPrices.length; i++) {
      // Weight by inverse of total adjustments (less adjusted = more weight)
      const weight = new Decimal(1).dividedBy(new Decimal(1).plus(new Decimal(i * 0.1)))
      weightedSum = weightedSum.plus(adjustedPrices[i]!.times(weight))
      totalWeight = totalWeight.plus(weight)
    }
    
    const avgPricePerSqFt = weightedSum.dividedBy(totalWeight)
    
    // Final value = Average adjusted price per sq ft * Subject property size
    return avgPricePerSqFt.times(new Decimal(subjectProperty.squareFeet))
  }

  // ==========================================================================
  // COST APPROACH
  // ==========================================================================

  /**
   * Cost approach with depreciation
   * SPECIFICATION: "Cost approach with depreciation"
   */
  public costApproach(params: CostApproachParams): Decimal {
    const {
      landValue,
      improvementCost,
      depreciation,
      replacementCost,
      functionalObsolescence = 0,
      economicObsolescence = 0
    } = params
    
    const land = new Decimal(landValue)
    const improvement = new Decimal(replacementCost || improvementCost)
    const depr = new Decimal(depreciation)
    const funcObs = new Decimal(functionalObsolescence)
    const econObs = new Decimal(economicObsolescence)
    
    // Calculate depreciated improvement value
    const physicalDepreciation = improvement.times(depr)
    const totalDepreciation = physicalDepreciation.plus(funcObs).plus(econObs)
    
    const depreciatedImprovement = improvement.minus(totalDepreciation)
    
    // Property Value = Land Value + Depreciated Improvement Value
    return land.plus(depreciatedImprovement)
  }

  /**
   * Calculate depreciation using various methods
   */
  public calculateDepreciation(
    originalCost: number,
    age: number,
    usefulLife: number,
    method: 'straight_line' | 'declining_balance' | 'sum_of_years'
  ): Decimal {
    const cost = new Decimal(originalCost)
    
    if (age > usefulLife) {
      return cost // Fully depreciated
    }
    
    let depreciation = new Decimal(0)
    
    switch (method) {
      case 'straight_line':
        // Depreciation = (Cost / Useful Life) * Age
        depreciation = cost.dividedBy(usefulLife).times(age)
        break
        
      case 'declining_balance':
        // Using double declining balance
        const rate = new Decimal(2).dividedBy(usefulLife)
        const bookValue = cost.times(new Decimal(1).minus(rate).pow(age))
        depreciation = cost.minus(bookValue)
        break
        
      case 'sum_of_years':
        // Sum of years digits method
        const sumOfYears = (usefulLife * (usefulLife + 1)) / 2
        let accumulated = new Decimal(0)
        
        for (let year = 1; year <= age; year++) {
          const fraction = (usefulLife - year + 1) / sumOfYears
          accumulated = accumulated.plus(cost.times(fraction))
        }
        depreciation = accumulated
        break
    }
    
    return depreciation
  }

  // ==========================================================================
  // LEVERAGED RETURNS
  // ==========================================================================

  /**
   * Calculate leveraged yield for real estate investments
   * SPECIFICATION: "Leveraged Yield: Return after accounting for debt financing"
   */
  public leveragedYield(params: LeveragedYieldParams): number {
    const { unleveragedReturn, leverageRatio, debtCost, amortizationPeriod = 30 } = params
    
    const unlevered = new Decimal(unleveragedReturn)
    const leverage = new Decimal(leverageRatio) // Debt/Equity ratio
    const cost = new Decimal(debtCost)
    
    // For simplicity, assuming interest-only for calculation
    // Leveraged Return = Unlevered Return + Leverage * (Unlevered Return - Debt Cost)
    const leveragedReturn = unlevered.plus(leverage.times(unlevered.minus(cost)))
    
    return leveragedReturn.toNumber()
  }

  /**
   * Calculate Cash-on-Cash return
   */
  public cashOnCashReturn(
    annualCashFlow: number,
    initialCashInvestment: number
  ): Decimal {
    const cashFlow = new Decimal(annualCashFlow)
    const investment = new Decimal(initialCashInvestment)
    
    if (investment.equals(0)) {
      throw new Error('Initial investment cannot be zero')
    }
    
    // Cash-on-Cash Return = Annual Pre-Tax Cash Flow / Total Cash Invested
    return cashFlow.dividedBy(investment)
  }

  // ==========================================================================
  // DCF FOR REAL ESTATE
  // ==========================================================================

  /**
   * Discounted Cash Flow model for real estate
   */
  public realEstateDCF(params: RealEstateDCFParams): Decimal {
    const {
      rentalIncome,
      operatingExpenses,
      capitalExpenses,
      terminalCapRate,
      discountRate,
      holdingPeriod,
      financingTerms
    } = params
    
    const r = new Decimal(discountRate)
    let totalPV = new Decimal(0)
    
    // Calculate cash flows for each period
    for (let t = 0; t < holdingPeriod && t < rentalIncome.length; t++) {
      const income = new Decimal(rentalIncome[t]!)
      const opEx = new Decimal(operatingExpenses[t] || 0)
      const capEx = new Decimal(capitalExpenses[t] || 0)
      
      let cashFlow = income.minus(opEx).minus(capEx)
      
      // Adjust for financing if applicable
      if (financingTerms) {
        const { loanAmount, interestRate, amortizationPeriod } = financingTerms
        const payment = this.calculateMortgagePayment(loanAmount, interestRate, amortizationPeriod)
        cashFlow = cashFlow.minus(payment)
      }
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCashFlow = cashFlow.dividedBy(discountFactor)
      totalPV = totalPV.plus(pvCashFlow)
    }
    
    // Calculate terminal value
    const lastNOI = new Decimal(rentalIncome[holdingPeriod - 1] || rentalIncome[rentalIncome.length - 1]!)
      .minus(new Decimal(operatingExpenses[holdingPeriod - 1] || operatingExpenses[operatingExpenses.length - 1] || 0))
    
    const terminalValue = lastNOI.dividedBy(new Decimal(terminalCapRate))
    const pvTerminalValue = terminalValue.dividedBy(new Decimal(1).plus(r).pow(holdingPeriod))
    
    return totalPV.plus(pvTerminalValue)
  }

  /**
   * Calculate mortgage payment
   */
  private calculateMortgagePayment(
    principal: number,
    annualRate: number,
    years: number
  ): Decimal {
    const p = new Decimal(principal)
    const r = new Decimal(annualRate).dividedBy(12) // Monthly rate
    const n = years * 12 // Total payments
    
    if (r.equals(0)) {
      return p.dividedBy(n) // Simple division if no interest
    }
    
    // Payment = P * [r(1 + r)^n] / [(1 + r)^n - 1]
    const onePlusR = new Decimal(1).plus(r)
    const powerN = onePlusR.pow(n)
    
    const payment = p.times(r.times(powerN)).dividedBy(powerN.minus(1))
    
    return payment.times(12) // Annual payment
  }

  // ==========================================================================
  // REAL ESTATE METRICS
  // ==========================================================================

  /**
   * Calculate comprehensive real estate investment metrics
   */
  public calculateMetrics(
    purchasePrice: number,
    annualRentalIncome: number,
    annualOperatingExpenses: number,
    downPayment: number,
    loanAmount: number,
    interestRate: number,
    amortizationYears: number,
    projectedCashFlows: number[],
    exitPrice: number
  ): RealEstateMetrics {
    // Gross Rent Multiplier
    const grm = new Decimal(purchasePrice).dividedBy(new Decimal(annualRentalIncome))
    
    // Net Operating Income
    const noi = new Decimal(annualRentalIncome).minus(new Decimal(annualOperatingExpenses))
    
    // Annual Debt Service
    const annualDebtService = this.calculateMortgagePayment(loanAmount, interestRate, amortizationYears)
    
    // Debt Service Coverage Ratio
    const dscr = noi.dividedBy(annualDebtService)
    
    // Cash-on-Cash Return
    const annualCashFlow = noi.minus(annualDebtService)
    const cocReturn = annualCashFlow.dividedBy(new Decimal(downPayment))
    
    // IRR Calculation (simplified)
    const cashFlowsWithExit = [...projectedCashFlows]
    cashFlowsWithExit[cashFlowsWithExit.length - 1] = 
      (cashFlowsWithExit[cashFlowsWithExit.length - 1] || 0) + exitPrice - loanAmount
    
    const irr = this.calculateIRR([-downPayment, ...cashFlowsWithExit])
    
    // Equity Multiple
    const totalCashReceived = cashFlowsWithExit.reduce((sum, cf) => sum + cf, 0)
    const equityMultiple = new Decimal(totalCashReceived).dividedBy(new Decimal(downPayment))
    
    return {
      grossRentMultiplier: grm.toNumber(),
      debtServiceCoverageRatio: dscr.toNumber(),
      cashOnCashReturn: cocReturn.toNumber(),
      internalRateOfReturn: irr,
      equityMultiple: equityMultiple.toNumber()
    }
  }

  /**
   * Simple IRR calculation using Newton's method
   */
  private calculateIRR(cashFlows: number[], guess: number = 0.1): number {
    const maxIterations = 100
    const tolerance = 0.00001
    let rate = guess
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0
      let dnpv = 0
      
      for (let t = 0; t < cashFlows.length; t++) {
        const cf = cashFlows[t]!
        const factor = Math.pow(1 + rate, t)
        npv += cf / factor
        dnpv -= (t * cf) / Math.pow(1 + rate, t + 1)
      }
      
      const newRate = rate - npv / dnpv
      
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate
      }
      
      rate = newRate
    }
    
    return rate
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const realEstateModels = RealEstateModels.getInstance()
