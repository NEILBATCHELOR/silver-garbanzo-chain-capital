/**
 * Climate and Renewable Energy Financial Models
 * 
 * Comprehensive valuation models for climate and renewable energy assets including:
 * - Levelized Cost of Energy (LCOE)
 * - Capacity Factor analysis
 * - Power Purchase Agreement (PPA) valuation
 * - Carbon credit pricing
 * - Solar/Wind energy project valuation
 * - Climate receivables DCF
 * - Energy storage economics
 * 
 * Based on NAV Pricing Specification - Alternatives
 */

import { Decimal } from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: 4 })

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface LCOEParams {
  capitalCosts: number
  operatingCosts: number[]
  energyOutput: number[]
  discountRate: number
  projectLife: number
  maintenanceCosts?: number[]
  fuelCosts?: number[]
  decommissioningCost?: number
  taxCredits?: number[]
}

export interface CapacityFactorParams {
  actualOutput: number
  maxPossibleOutput: number
  periodHours?: number
  installedCapacity?: number
}

export interface PPAValuationParams {
  contractPrice: number
  volume: number[]
  marketPrice: number[]
  escalationRate?: number
  contractTerm: number
  discountRate: number
  curtailmentRisk?: number
  creditRisk?: number
}

export interface CarbonCreditParams {
  tonnes: number
  pricePerTonne: number
  additionalityFactor: number
  leakageRate?: number
  permanenceRisk?: number
  verificationCost?: number
  vintageYear?: number
  projectType?: 'avoided_emissions' | 'removal' | 'sequestration'
}

export interface ClimateFlow {
  period: number
  carbonCredits: number
  energyRevenue: number
  operatingCosts: number
  maintenanceCosts: number
  carbonPrice: number
}

export interface SolarProjectParams {
  installedCapacity: number // MW
  capacityFactor: number
  degradationRate: number // Annual panel degradation
  operatingCosts: number[]
  maintenanceCosts: number[]
  ppaPrice: number
  projectLife: number
  discountRate: number
  investmentTaxCredit?: number
  acceleratedDepreciation?: boolean
}

export interface WindProjectParams {
  installedCapacity: number // MW
  capacityFactor: number
  windResource: number // Average wind speed m/s
  turbineEfficiency: number
  availabilityFactor: number
  operatingCosts: number[]
  maintenanceCosts: number[]
  ppaPrice: number
  projectLife: number
  discountRate: number
  productionTaxCredit?: number
}

export interface EnergyStorageParams {
  capacity: number // MWh
  power: number // MW
  efficiency: number // Round-trip efficiency
  cycles: number // Daily cycles
  degradation: number // Annual degradation
  chargingCost: number // $/MWh
  dischargingPrice: number // $/MWh
  operatingCosts: number[]
  projectLife: number
  discountRate: number
}

export interface ClimateMetrics {
  lcoe: number
  capacityFactor: number
  carbonIntensity: number
  paybackPeriod: number
  projectIRR: number
  netPresentValue: number
  carbonOffset: number
  greenPremium: number
}

// ============================================================================
// CLIMATE MODELS SINGLETON
// ============================================================================

class ClimateModels {
  private static instance: ClimateModels

  private constructor() {}

  public static getInstance(): ClimateModels {
    if (!ClimateModels.instance) {
      ClimateModels.instance = new ClimateModels()
    }
    return ClimateModels.instance
  }

  // ==========================================================================
  // LEVELIZED COST OF ENERGY (LCOE)
  // ==========================================================================

  /**
   * Calculate Levelized Cost of Energy
   * SPECIFICATION: "Levelized Cost of Energy (LCOE): Average cost per unit of energy"
   */
  public calculateLCOE(params: LCOEParams): Decimal {
    const {
      capitalCosts,
      operatingCosts,
      energyOutput,
      discountRate,
      projectLife,
      maintenanceCosts = [],
      fuelCosts = [],
      decommissioningCost = 0,
      taxCredits = []
    } = params
    
    const r = new Decimal(discountRate)
    let totalCosts = new Decimal(0)
    let totalEnergy = new Decimal(0)
    
    // Initial capital costs
    totalCosts = totalCosts.plus(new Decimal(capitalCosts))
    
    // Calculate present value of costs and energy production
    for (let t = 0; t < projectLife; t++) {
      const opex = new Decimal(operatingCosts[t] || 0)
      const maintenance = new Decimal(maintenanceCosts[t] || 0)
      const fuel = new Decimal(fuelCosts[t] || 0)
      const taxCredit = new Decimal(taxCredits[t] || 0)
      const energy = new Decimal(energyOutput[t] || 0)
      
      // Annual costs minus tax credits
      const annualCost = opex.plus(maintenance).plus(fuel).minus(taxCredit)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCost = annualCost.dividedBy(discountFactor)
      const pvEnergy = energy.dividedBy(discountFactor)
      
      totalCosts = totalCosts.plus(pvCost)
      totalEnergy = totalEnergy.plus(pvEnergy)
    }
    
    // Add decommissioning cost at end of project
    if (decommissioningCost > 0) {
      const pvDecommissioning = new Decimal(decommissioningCost)
        .dividedBy(new Decimal(1).plus(r).pow(projectLife))
      totalCosts = totalCosts.plus(pvDecommissioning)
    }
    
    // LCOE = Total Costs / Total Energy
    if (totalEnergy.equals(0)) {
      throw new Error('Total energy output cannot be zero')
    }
    
    return totalCosts.dividedBy(totalEnergy)
  }

  /**
   * Calculate LCOE with learning curve adjustments
   */
  public calculateLCOEWithLearningCurve(
    baseLCOE: number,
    cumulativeProduction: number,
    learningRate: number,
    targetProduction: number
  ): Decimal {
    const base = new Decimal(baseLCOE)
    const current = new Decimal(cumulativeProduction)
    const target = new Decimal(targetProduction)
    const lr = new Decimal(learningRate)
    
    // Cost reduction factor = (Target/Current)^(-log(1-LR)/log(2))
    const doublings = target.dividedBy(current).ln().dividedBy(new Decimal(2).ln())
    const costReduction = new Decimal(1).minus(lr).pow(doublings)
    
    return base.times(costReduction)
  }

  // ==========================================================================
  // CAPACITY FACTOR
  // ==========================================================================

  /**
   * Calculate capacity factor for renewable energy
   * SPECIFICATION: "Capacity Factor: Ratio of actual output to maximum possible"
   */
  public capacityFactor(params: CapacityFactorParams): number {
    const {
      actualOutput,
      maxPossibleOutput,
      periodHours = 8760, // Hours in year
      installedCapacity
    } = params
    
    const actual = new Decimal(actualOutput)
    let maximum = new Decimal(maxPossibleOutput)
    
    // If installed capacity provided, calculate max possible
    if (installedCapacity && periodHours) {
      maximum = new Decimal(installedCapacity).times(periodHours)
    }
    
    if (maximum.equals(0)) {
      throw new Error('Maximum possible output cannot be zero')
    }
    
    // Capacity Factor = Actual Output / Maximum Possible Output
    const cf = actual.dividedBy(maximum)
    
    // Ensure between 0 and 1
    if (cf.greaterThan(1)) {
      return 1
    }
    
    return cf.toNumber()
  }

  /**
   * Estimate capacity factor based on resource quality
   */
  public estimateCapacityFactor(
    resourceType: 'solar' | 'wind' | 'hydro',
    resourceQuality: number, // Solar irradiance, wind speed, or water flow
    location: 'excellent' | 'good' | 'average' | 'poor'
  ): Decimal {
    const locationFactors: Record<string, number> = {
      'excellent': 1.2,
      'good': 1.0,
      'average': 0.85,
      'poor': 0.7
    }
    
    const locationFactor = new Decimal(locationFactors[location] || 1)
    let baseFactor = new Decimal(0)
    
    switch (resourceType) {
      case 'solar':
        // Based on solar irradiance (kWh/m²/day)
        // Typical range: 3-7 kWh/m²/day
        baseFactor = new Decimal(resourceQuality).dividedBy(24).times(0.85) // 85% system efficiency
        break
        
      case 'wind':
        // Based on average wind speed (m/s)
        // Typical range: 5-10 m/s
        if (resourceQuality < 3) {
          baseFactor = new Decimal(0.05)
        } else if (resourceQuality < 5) {
          baseFactor = new Decimal(0.15)
        } else if (resourceQuality < 7) {
          baseFactor = new Decimal(0.25)
        } else if (resourceQuality < 9) {
          baseFactor = new Decimal(0.35)
        } else {
          baseFactor = new Decimal(0.45)
        }
        break
        
      case 'hydro':
        // Based on water flow consistency
        baseFactor = new Decimal(0.5).plus(new Decimal(resourceQuality).dividedBy(100))
        break
    }
    
    return baseFactor.times(locationFactor)
  }

  // ==========================================================================
  // POWER PURCHASE AGREEMENT (PPA)
  // ==========================================================================

  /**
   * Value a Power Purchase Agreement
   * SPECIFICATION: "Power Purchase Agreement (PPA): Long-term contract for energy sales"
   */
  public ppaValuation(params: PPAValuationParams): Decimal {
    const {
      contractPrice,
      volume,
      marketPrice,
      escalationRate = 0,
      contractTerm,
      discountRate,
      curtailmentRisk = 0,
      creditRisk = 0
    } = params
    
    const r = new Decimal(discountRate)
    const escalation = new Decimal(escalationRate)
    const curtailment = new Decimal(1).minus(curtailmentRisk)
    const creditAdj = new Decimal(1).minus(creditRisk)
    
    let totalValue = new Decimal(0)
    
    for (let t = 0; t < contractTerm && t < volume.length; t++) {
      const vol = new Decimal(volume[t]!)
      const market = new Decimal(marketPrice[t] || contractPrice)
      
      // Contract price with escalation
      const escalatedPrice = new Decimal(contractPrice)
        .times(new Decimal(1).plus(escalation).pow(t))
      
      // Value = (Contract Price - Market Price) × Volume
      const spread = escalatedPrice.minus(market)
      const periodValue = spread.times(vol).times(curtailment).times(creditAdj)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvValue = periodValue.dividedBy(discountFactor)
      
      totalValue = totalValue.plus(pvValue)
    }
    
    return totalValue
  }

  /**
   * Calculate optimal PPA price for target return
   */
  public calculatePPAPrice(
    capitalCost: number,
    targetIRR: number,
    energyProduction: number[],
    operatingCosts: number[],
    projectLife: number
  ): Decimal {
    const capex = new Decimal(capitalCost)
    const irr = new Decimal(targetIRR)
    
    // Calculate present value of costs
    let pvCosts = capex
    let pvEnergy = new Decimal(0)
    
    for (let t = 0; t < projectLife; t++) {
      const opex = new Decimal(operatingCosts[t] || 0)
      const energy = new Decimal(energyProduction[t] || 0)
      
      const discountFactor = new Decimal(1).plus(irr).pow(t + 1)
      
      pvCosts = pvCosts.plus(opex.dividedBy(discountFactor))
      pvEnergy = pvEnergy.plus(energy.dividedBy(discountFactor))
    }
    
    // Required PPA Price = PV of Costs / PV of Energy
    if (pvEnergy.equals(0)) {
      throw new Error('Present value of energy cannot be zero')
    }
    
    return pvCosts.dividedBy(pvEnergy)
  }

  // ==========================================================================
  // CARBON CREDIT VALUATION
  // ==========================================================================

  /**
   * Value carbon credits with adjustments
   * SPECIFICATION: "Carbon Credit: Tradable certificate representing one tonne CO2e reduced"
   * SPECIFICATION: "Additionality: Requirement that emissions reductions are beyond business-as-usual"
   */
  public carbonCreditValue(params: CarbonCreditParams): Decimal {
    const {
      tonnes,
      pricePerTonne,
      additionalityFactor,
      leakageRate = 0,
      permanenceRisk = 0,
      verificationCost = 0,
      vintageYear,
      projectType = 'avoided_emissions'
    } = params
    
    const credits = new Decimal(tonnes)
    const price = new Decimal(pricePerTonne)
    const additionality = new Decimal(additionalityFactor)
    const leakage = new Decimal(1).minus(leakageRate)
    const permanence = new Decimal(1).minus(permanenceRisk)
    const verification = new Decimal(verificationCost)
    
    // Adjust credits for quality factors
    let adjustedCredits = credits
      .times(additionality)
      .times(leakage)
      .times(permanence)
    
    // Apply vintage discount if applicable
    if (vintageYear) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - vintageYear
      
      // Older vintages typically worth less (5% discount per year)
      const vintageDiscount = new Decimal(1).minus(new Decimal(0.05).times(age))
      adjustedCredits = adjustedCredits.times(Decimal.max(vintageDiscount, new Decimal(0.5)))
    }
    
    // Apply project type premium/discount
    const projectMultipliers: Record<string, number> = {
      'removal': 1.2, // Premium for carbon removal
      'sequestration': 1.1, // Premium for sequestration
      'avoided_emissions': 1.0 // Base rate
    }
    
    const projectMultiplier = new Decimal(projectMultipliers[projectType] || 1)
    adjustedCredits = adjustedCredits.times(projectMultiplier)
    
    // Calculate gross value
    const grossValue = adjustedCredits.times(price)
    
    // Subtract verification costs
    const netValue = grossValue.minus(verification)
    
    return netValue
  }

  /**
   * Calculate carbon credit generation from project
   */
  public calculateCarbonCredits(
    baselineEmissions: number,
    projectEmissions: number,
    projectLife: number,
    discountRate: number = 0
  ): Decimal {
    const baseline = new Decimal(baselineEmissions)
    const project = new Decimal(projectEmissions)
    const years = projectLife
    const r = new Decimal(discountRate)
    
    // Annual emissions reduction
    const annualReduction = baseline.minus(project)
    
    if (discountRate > 0) {
      // Calculate present value of future credits
      let totalCredits = new Decimal(0)
      
      for (let t = 0; t < years; t++) {
        const discountFactor = new Decimal(1).plus(r).pow(t + 1)
        const pvCredits = annualReduction.dividedBy(discountFactor)
        totalCredits = totalCredits.plus(pvCredits)
      }
      
      return totalCredits
    }
    
    // Simple multiplication if no discounting
    return annualReduction.times(years)
  }

  // ==========================================================================
  // CLIMATE RECEIVABLES DCF
  // ==========================================================================

  /**
   * DCF model for climate receivables
   * SPECIFICATION: "Climate receivables DCF with green discount"
   */
  public climateReceivablesDCF(
    cashflows: ClimateFlow[],
    greenDiscount: number
  ): Decimal {
    const discount = new Decimal(greenDiscount)
    let totalNPV = new Decimal(0)
    
    for (const flow of cashflows) {
      const carbonRevenue = new Decimal(flow.carbonCredits).times(flow.carbonPrice)
      const energyRevenue = new Decimal(flow.energyRevenue)
      const opex = new Decimal(flow.operatingCosts)
      const maintenance = new Decimal(flow.maintenanceCosts)
      
      // Net cash flow
      const netCashFlow = carbonRevenue.plus(energyRevenue).minus(opex).minus(maintenance)
      
      // Apply green discount (lower discount rate for climate projects)
      const discountFactor = new Decimal(1).plus(discount).pow(flow.period)
      const pvCashFlow = netCashFlow.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvCashFlow)
    }
    
    return totalNPV
  }

  // ==========================================================================
  // SOLAR PROJECT VALUATION
  // ==========================================================================

  /**
   * Value a solar energy project
   */
  public solarProjectValuation(params: SolarProjectParams): Decimal {
    const {
      installedCapacity,
      capacityFactor,
      degradationRate,
      operatingCosts,
      maintenanceCosts,
      ppaPrice,
      projectLife,
      discountRate,
      investmentTaxCredit = 0,
      acceleratedDepreciation = false
    } = params
    
    const capacity = new Decimal(installedCapacity)
    const cf = new Decimal(capacityFactor)
    const degradation = new Decimal(degradationRate)
    const price = new Decimal(ppaPrice)
    const r = new Decimal(discountRate)
    const itc = new Decimal(investmentTaxCredit)
    
    const hoursPerYear = 8760
    let totalNPV = new Decimal(0)
    
    // Apply investment tax credit if available
    if (investmentTaxCredit > 0) {
      totalNPV = totalNPV.plus(capacity.times(1000000).times(itc)) // Assume $1M/MW capex
    }
    
    for (let t = 0; t < projectLife; t++) {
      // Energy production with degradation
      const degradationFactor = new Decimal(1).minus(degradation).pow(t)
      const annualProduction = capacity
        .times(hoursPerYear)
        .times(cf)
        .times(degradationFactor)
      
      // Revenue
      const revenue = annualProduction.times(price)
      
      // Costs
      const opex = new Decimal(operatingCosts[t] || 0)
      const maintenance = new Decimal(maintenanceCosts[t] || 0)
      
      // Net cash flow
      const netCashFlow = revenue.minus(opex).minus(maintenance)
      
      // Apply accelerated depreciation benefit if applicable
      if (acceleratedDepreciation && t < 5) {
        const depreciationBenefit = capacity.times(1000000).times(0.2).times(0.21) // MACRS 5-year, 21% tax
        netCashFlow.plus(depreciationBenefit)
      }
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCashFlow = netCashFlow.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvCashFlow)
    }
    
    return totalNPV
  }

  // ==========================================================================
  // WIND PROJECT VALUATION
  // ==========================================================================

  /**
   * Value a wind energy project
   */
  public windProjectValuation(params: WindProjectParams): Decimal {
    const {
      installedCapacity,
      capacityFactor,
      windResource,
      turbineEfficiency,
      availabilityFactor,
      operatingCosts,
      maintenanceCosts,
      ppaPrice,
      projectLife,
      discountRate,
      productionTaxCredit = 0
    } = params
    
    const capacity = new Decimal(installedCapacity)
    const cf = new Decimal(capacityFactor)
    const efficiency = new Decimal(turbineEfficiency)
    const availability = new Decimal(availabilityFactor)
    const price = new Decimal(ppaPrice)
    const r = new Decimal(discountRate)
    const ptc = new Decimal(productionTaxCredit)
    
    const hoursPerYear = 8760
    let totalNPV = new Decimal(0)
    
    for (let t = 0; t < projectLife; t++) {
      // Energy production
      const annualProduction = capacity
        .times(hoursPerYear)
        .times(cf)
        .times(efficiency)
        .times(availability)
      
      // Revenue including PTC
      const energyRevenue = annualProduction.times(price)
      const taxCreditRevenue = annualProduction.times(ptc)
      const totalRevenue = energyRevenue.plus(taxCreditRevenue)
      
      // Costs (higher maintenance for wind)
      const opex = new Decimal(operatingCosts[t] || 0)
      const maintenance = new Decimal(maintenanceCosts[t] || 0)
      
      // Net cash flow
      const netCashFlow = totalRevenue.minus(opex).minus(maintenance)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCashFlow = netCashFlow.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvCashFlow)
    }
    
    return totalNPV
  }

  // ==========================================================================
  // ENERGY STORAGE ECONOMICS
  // ==========================================================================

  /**
   * Value energy storage project (batteries, pumped hydro, etc.)
   */
  public energyStorageValuation(params: EnergyStorageParams): Decimal {
    const {
      capacity,
      power,
      efficiency,
      cycles,
      degradation,
      chargingCost,
      dischargingPrice,
      operatingCosts,
      projectLife,
      discountRate
    } = params
    
    const storageCapacity = new Decimal(capacity)
    const roundTripEfficiency = new Decimal(efficiency)
    const dailyCycles = new Decimal(cycles)
    const annualDegradation = new Decimal(degradation)
    const chargePrice = new Decimal(chargingCost)
    const dischargePrice = new Decimal(dischargingPrice)
    const r = new Decimal(discountRate)
    
    const daysPerYear = 365
    let totalNPV = new Decimal(0)
    
    for (let t = 0; t < projectLife; t++) {
      // Capacity with degradation
      const degradationFactor = new Decimal(1).minus(annualDegradation).pow(t)
      const effectiveCapacity = storageCapacity.times(degradationFactor)
      
      // Annual throughput
      const annualThroughput = effectiveCapacity.times(dailyCycles).times(daysPerYear)
      
      // Revenue from arbitrage
      const energyStored = annualThroughput
      const energyDelivered = energyStored.times(roundTripEfficiency)
      
      const chargingCosts = energyStored.times(chargePrice)
      const dischargingRevenue = energyDelivered.times(dischargePrice)
      
      // Operating costs
      const opex = new Decimal(operatingCosts[t] || 0)
      
      // Net cash flow
      const netCashFlow = dischargingRevenue.minus(chargingCosts).minus(opex)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCashFlow = netCashFlow.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvCashFlow)
    }
    
    return totalNPV
  }

  // ==========================================================================
  // CLIMATE PROJECT METRICS
  // ==========================================================================

  /**
   * Calculate comprehensive climate project metrics
   */
  public calculateClimateMetrics(
    capitalCost: number,
    annualEnergyProduction: number[],
    annualCosts: number[],
    carbonOffset: number,
    projectLife: number,
    discountRate: number
  ): ClimateMetrics {
    // Calculate LCOE
    const lcoeParams: LCOEParams = {
      capitalCosts: capitalCost,
      operatingCosts: annualCosts,
      energyOutput: annualEnergyProduction,
      discountRate,
      projectLife
    }
    const lcoe = this.calculateLCOE(lcoeParams).toNumber()
    
    // Calculate capacity factor
    const avgProduction = annualEnergyProduction.reduce((sum, val) => sum + val, 0) / annualEnergyProduction.length
    const maxProduction = Math.max(...annualEnergyProduction) * 1.2 // Assume 20% headroom
    const capacityFactor = avgProduction / maxProduction
    
    // Calculate carbon intensity
    const totalEnergy = annualEnergyProduction.reduce((sum, val) => sum + val, 0)
    const carbonIntensity = carbonOffset / totalEnergy
    
    // Calculate payback period
    const annualRevenue = avgProduction * 0.05 // Assume $0.05/kWh
    const annualProfit = annualRevenue - (annualCosts.reduce((sum, val) => sum + val, 0) / annualCosts.length)
    const paybackPeriod = capitalCost / annualProfit
    
    // Calculate project IRR
    const cashFlows = [-capitalCost]
    for (let i = 0; i < projectLife; i++) {
      const revenue = (annualEnergyProduction[i] || avgProduction) * 0.05
      const cost = annualCosts[i] || 0
      cashFlows.push(revenue - cost)
    }
    const projectIRR = this.calculateIRR(cashFlows)
    
    // Calculate NPV
    const netPresentValue = this.calculateNPV(cashFlows, discountRate)
    
    // Calculate green premium
    const conventionalLCOE = 0.06 // Assume $0.06/kWh for fossil
    const greenPremium = (lcoe - conventionalLCOE) / conventionalLCOE
    
    return {
      lcoe,
      capacityFactor,
      carbonIntensity,
      paybackPeriod,
      projectIRR,
      netPresentValue,
      carbonOffset,
      greenPremium
    }
  }

  /**
   * Calculate Internal Rate of Return
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

  /**
   * Calculate Net Present Value
   */
  private calculateNPV(cashFlows: number[], discountRate: number): number {
    const r = new Decimal(discountRate)
    let npv = new Decimal(0)
    
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = new Decimal(cashFlows[t]!)
      const discountFactor = new Decimal(1).plus(r).pow(t)
      npv = npv.plus(cf.dividedBy(discountFactor))
    }
    
    return npv.toNumber()
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const climateModels = ClimateModels.getInstance()
