/**
 * Alternative Asset Models
 * Implements J-curve, carried interest waterfall, and other alternative asset models
 * Per specification: NAV Pricing - Alternatives
 */

import { Decimal } from 'decimal.js'

// Configure Decimal for maximum precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export interface JCurveParams {
  commitmentAmount: number
  vintageYear: number
  currentYear: number
  fundType: 'buyout' | 'venture' | 'growth' | 'distressed'
  managementFee: number  // Annual percentage
  fundLife?: number  // Years
}

export interface CarriedInterestParams {
  distributedAmount: number
  investedCapital: number
  hurdleRate: number
  carryPercentage: number
  catchUp: boolean
  catchUpPercentage?: number  // LP percentage during catch-up phase
  waterfallType: 'american' | 'european'
}

export interface WaterfallResult {
  lpDistribution: Decimal
  gpCarry: Decimal
  hurdleReached: boolean
  catchUpAmount: Decimal
  effectiveCarryRate: number
}

export interface IRRResult {
  irr: number
  xirr: number
  moic: number  // Multiple on Invested Capital
  dpi: number   // Distributions to Paid-In
  rvpi: number  // Residual Value to Paid-In
  tvpi: number  // Total Value to Paid-In
}

export class AlternativeAssetModels {
  
  /**
   * J-Curve Model for Private Equity
   * Specification: "J-Curve Effect: Initial negative returns due to upfront fees"
   */
  jCurveProjection(params: JCurveParams): {
    year: number
    netCashFlow: number
    cumulativeCashFlow: number
    nav: number
    irr: number
  }[] {
    const { 
      commitmentAmount, 
      vintageYear, 
      currentYear, 
      fundType, 
      managementFee,
      fundLife = 10 
    } = params
    
    const yearsSinceVintage = currentYear - vintageYear
    const results = []
    
    // Fund-specific J-curve parameters
    const curveParams = this.getJCurveParameters(fundType)
    
    let cumulativeCashFlow = 0
    let totalContributions = 0
    let totalDistributions = 0
    
    for (let year = 0; year <= Math.min(yearsSinceVintage, fundLife); year++) {
      // Capital calls (front-loaded)
      const callRate = this.calculateCallRate(year, curveParams.investmentPeriod)
      const capitalCall = commitmentAmount * callRate
      
      // Management fees (higher in early years)
      const feeBase = year < curveParams.investmentPeriod ? 
        commitmentAmount : (commitmentAmount * curveParams.investedCapital)
      const fees = feeBase * managementFee / 100
      
      // Distributions (back-loaded)
      const distributionRate = this.calculateDistributionRate(
        year, 
        curveParams.harvestingStart,
        curveParams.peakDistribution,
        fundLife
      )
      const distributions = commitmentAmount * curveParams.targetMultiple * distributionRate
      
      // Net cash flow
      const netCashFlow = distributions - capitalCall - fees
      cumulativeCashFlow += netCashFlow
      totalContributions += capitalCall + fees
      totalDistributions += distributions
      
      // NAV estimation
      const nav = this.estimateNAV(
        totalContributions,
        totalDistributions,
        year,
        curveParams
      )
      
      // IRR calculation
      const irr = year > 0 ? this.calculateSimpleIRR(
        totalContributions,
        totalDistributions + nav,
        year
      ) : 0
      
      results.push({
        year: vintageYear + year,
        netCashFlow,
        cumulativeCashFlow,
        nav,
        irr
      })
    }
    
    return results
  }
  
  /**
   * Carried Interest Waterfall Calculation
   * Specification: "Carried Interest: Portion of profits after hurdle rate"
   */
  carriedInterestWaterfall(params: CarriedInterestParams): WaterfallResult {
    const {
      distributedAmount,
      investedCapital,
      hurdleRate,
      carryPercentage,
      catchUp,
      catchUpPercentage = 80,  // Default 80/20 to LP/GP during catch-up
      waterfallType
    } = params
    
    const distribution = new Decimal(distributedAmount)
    const capital = new Decimal(investedCapital)
    
    // American waterfall: deal-by-deal carry
    // European waterfall: whole fund carry
    
    if (waterfallType === 'american') {
      return this.americanWaterfall(
        distribution,
        capital,
        hurdleRate,
        carryPercentage,
        catchUp,
        catchUpPercentage
      )
    } else {
      return this.europeanWaterfall(
        distribution,
        capital,
        hurdleRate,
        carryPercentage,
        catchUp,
        catchUpPercentage
      )
    }
  }
  
  /**
   * American (Deal-by-Deal) Waterfall
   */
  private americanWaterfall(
    distribution: Decimal,
    capital: Decimal,
    hurdleRate: number,
    carryPercentage: number,
    catchUp: boolean,
    catchUpPercentage: number
  ): WaterfallResult {
    let lpDistribution = new Decimal(0)
    let gpCarry = new Decimal(0)
    let catchUpAmount = new Decimal(0)
    let remaining = distribution
    
    // Tier 1: Return of capital
    const capitalReturn = Decimal.min(remaining, capital)
    lpDistribution = lpDistribution.plus(capitalReturn)
    remaining = remaining.minus(capitalReturn)
    
    // Tier 2: Preferred return (hurdle)
    const preferredReturn = capital.mul(hurdleRate / 100)
    const hurdlePayment = Decimal.min(remaining, preferredReturn)
    lpDistribution = lpDistribution.plus(hurdlePayment)
    remaining = remaining.minus(hurdlePayment)
    
    const hurdleReached = hurdlePayment.equals(preferredReturn)
    
    if (hurdleReached && remaining.gt(0)) {
      if (catchUp) {
        // Tier 3: GP catch-up
        // GP receives distributions until they have carryPercentage of total profits
        const totalProfits = distribution.minus(capital)
        const gpTargetCarry = totalProfits.mul(carryPercentage / 100)
        const catchUpNeeded = gpTargetCarry
        
        catchUpAmount = Decimal.min(remaining, catchUpNeeded.mul(100 / (100 - catchUpPercentage)))
        const gpCatchUp = catchUpAmount.mul((100 - catchUpPercentage) / 100)
        const lpCatchUp = catchUpAmount.minus(gpCatchUp)
        
        gpCarry = gpCarry.plus(gpCatchUp)
        lpDistribution = lpDistribution.plus(lpCatchUp)
        remaining = remaining.minus(catchUpAmount)
      }
      
      // Tier 4: Carried interest split
      if (remaining.gt(0)) {
        const gpShare = remaining.mul(carryPercentage / 100)
        const lpShare = remaining.minus(gpShare)
        
        gpCarry = gpCarry.plus(gpShare)
        lpDistribution = lpDistribution.plus(lpShare)
      }
    } else if (remaining.gt(0)) {
      // If hurdle not reached, all to LP
      lpDistribution = lpDistribution.plus(remaining)
    }
    
    const effectiveCarryRate = distribution.gt(0) ? 
      gpCarry.div(distribution.minus(capital)).mul(100).toNumber() : 0
    
    return {
      lpDistribution,
      gpCarry,
      hurdleReached,
      catchUpAmount,
      effectiveCarryRate
    }
  }
  
  /**
   * European (Whole Fund) Waterfall
   */
  private europeanWaterfall(
    distribution: Decimal,
    capital: Decimal,
    hurdleRate: number,
    carryPercentage: number,
    catchUp: boolean,
    catchUpPercentage: number
  ): WaterfallResult {
    // Similar to American but calculated at fund level
    // All capital must be returned before carry
    return this.americanWaterfall(
      distribution,
      capital,
      hurdleRate,
      carryPercentage,
      catchUp,
      catchUpPercentage
    )
  }
  
  /**
   * Get J-curve parameters by fund type
   */
  private getJCurveParameters(fundType: string) {
    const params = {
      buyout: {
        investmentPeriod: 5,
        harvestingStart: 3,
        peakDistribution: 7,
        targetMultiple: 2.5,
        investedCapital: 0.85
      },
      venture: {
        investmentPeriod: 4,
        harvestingStart: 5,
        peakDistribution: 8,
        targetMultiple: 3.0,
        investedCapital: 0.75
      },
      growth: {
        investmentPeriod: 4,
        harvestingStart: 3,
        peakDistribution: 6,
        targetMultiple: 2.0,
        investedCapital: 0.80
      },
      distressed: {
        investmentPeriod: 3,
        harvestingStart: 2,
        peakDistribution: 5,
        targetMultiple: 1.8,
        investedCapital: 0.90
      }
    }
    
    return params[fundType as keyof typeof params] || params.buyout
  }
  
  /**
   * Calculate capital call rate for J-curve
   */
  private calculateCallRate(year: number, investmentPeriod: number): number {
    if (year >= investmentPeriod) return 0
    
    // Front-loaded capital calls with declining rate
    const baseRate = 1 / investmentPeriod
    const frontLoadFactor = 1.5 - (year / investmentPeriod) * 0.5
    return Math.min(baseRate * frontLoadFactor, 0.4)  // Cap at 40% per year
  }
  
  /**
   * Calculate distribution rate for J-curve
   */
  private calculateDistributionRate(
    year: number,
    harvestingStart: number,
    peakYear: number,
    fundLife: number
  ): number {
    if (year < harvestingStart) return 0
    
    const yearsIntoHarvest = year - harvestingStart
    const harvestPeriod = fundLife - harvestingStart
    
    // Bell curve distribution pattern
    const normalizedYear = yearsIntoHarvest / harvestPeriod
    const peakNormalized = (peakYear - harvestingStart) / harvestPeriod
    
    const distribution = Math.exp(-Math.pow((normalizedYear - peakNormalized) * 2, 2)) * 0.4
    return Math.max(0, distribution)
  }
  
  /**
   * Estimate NAV for J-curve model
   */
  private estimateNAV(
    totalContributions: number,
    totalDistributions: number,
    year: number,
    curveParams: any
  ): number {
    const unrealizedValue = totalContributions - totalDistributions
    
    // Apply growth factor based on fund maturity
    const maturityFactor = Math.min(year / 10, 1)
    const growthMultiple = 1 + (curveParams.targetMultiple - 1) * maturityFactor
    
    return Math.max(0, unrealizedValue * growthMultiple)
  }
  
  /**
   * Simple IRR calculation for J-curve
   */
  private calculateSimpleIRR(
    totalContributions: number,
    totalValue: number,
    years: number
  ): number {
    if (totalContributions === 0 || years === 0) return 0
    
    const multiple = totalValue / totalContributions
    return Math.pow(multiple, 1 / years) - 1
  }
  
  /**
   * Calculate various PE performance metrics
   */
  calculatePEMetrics(
    contributions: number[],
    distributions: number[],
    currentNAV: number,
    dates: Date[]
  ): IRRResult {
    const totalContributions = contributions.reduce((a, b) => a + b, 0)
    const totalDistributions = distributions.reduce((a, b) => a + b, 0)
    
    // MOIC: Multiple on Invested Capital
    const moic = (totalDistributions + currentNAV) / totalContributions
    
    // DPI: Distributions to Paid-In
    const dpi = totalDistributions / totalContributions
    
    // RVPI: Residual Value to Paid-In
    const rvpi = currentNAV / totalContributions
    
    // TVPI: Total Value to Paid-In
    const tvpi = dpi + rvpi
    
    // IRR calculation would need actual implementation
    const irr = 0  // Placeholder
    const xirr = 0  // Placeholder
    
    return { irr, xirr, moic, dpi, rvpi, tvpi }
  }
}

// Export singleton instance
export const alternativeAssetModels = new AlternativeAssetModels()
