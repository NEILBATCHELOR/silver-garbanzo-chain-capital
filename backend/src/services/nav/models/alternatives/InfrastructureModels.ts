/**
 * Infrastructure Financial Models
 * 
 * Comprehensive valuation models for infrastructure assets including:
 * - Public-Private Partnership (PPP) valuation
 * - Regulatory Asset Base (RAB) calculation
 * - Tariff structure modeling
 * - Availability payment mechanisms
 * - Concession period valuation
 * - Infrastructure DCF models
 * 
 * Based on NAV Pricing Specification - Alternatives
 */

import { Decimal } from 'decimal.js'

// Configure Decimal precision
Decimal.set({ precision: 28, rounding: 4 })

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PPPValuationParams {
  availabilityPayments: number[]
  concessionPeriod: number
  discountRate: number
  constructionCosts?: number
  operatingCosts?: number[]
  maintenanceCosts?: number[]
  performanceDeductions?: number[]
  inflationRate?: number
}

export interface RegulatoryAssetBaseParams {
  initialInvestment: number
  depreciation: number
  additions: number
  disposals?: number
  workingCapital?: number
  regulatoryPeriod?: number
  allowedReturn?: number
}

export interface TariffModelParams {
  usageVolume: number
  fixedTariff: number
  variableTariff: number
  peakTariff?: number
  offPeakTariff?: number
  capacityCharge?: number
  demandCharge?: number
  timeOfUseRates?: TimeOfUseRate[]
}

export interface TimeOfUseRate {
  startHour: number
  endHour: number
  rate: number
  isDayRate: boolean
}

export interface ConcessionValuationParams {
  concessionLength: number
  revenueProjections: number[]
  operatingExpenses: number[]
  capitalExpenses: number[]
  taxRate: number
  discountRate: number
  terminalValueMethod?: 'perpetuity' | 'multiple' | 'book_value'
  terminalValueParameter?: number
}

export interface InfrastructureDCFParams {
  cashFlows: InfrastructureCashFlow[]
  discountRate: number
  inflationRate: number
  taxRate: number
  depreciationSchedule?: number[]
  debtSchedule?: DebtSchedule
}

export interface InfrastructureCashFlow {
  period: number
  revenue: number
  opex: number
  capex: number
  workingCapitalChange?: number
}

export interface DebtSchedule {
  principal: number
  interestRate: number
  term: number
  type: 'amortizing' | 'bullet' | 'balloon'
  gracePeriod?: number
}

export interface InfrastructureMetrics {
  projectIRR: number
  equityIRR: number
  paybackPeriod: number
  debtServiceCoverageRatio: number
  loanLifeCoverageRatio: number
  netPresentValue: number
}

// ============================================================================
// INFRASTRUCTURE MODELS SINGLETON
// ============================================================================

class InfrastructureModels {
  private static instance: InfrastructureModels

  private constructor() {}

  public static getInstance(): InfrastructureModels {
    if (!InfrastructureModels.instance) {
      InfrastructureModels.instance = new InfrastructureModels()
    }
    return InfrastructureModels.instance
  }

  // ==========================================================================
  // PUBLIC-PRIVATE PARTNERSHIP (PPP) VALUATION
  // ==========================================================================

  /**
   * PPP valuation using availability payments
   * SPECIFICATION: "Public-Private Partnership valuation"
   * SPECIFICATION: "Availability Payment: Fixed payments based on asset availability"
   */
  public pppValuation(params: PPPValuationParams): Decimal {
    const {
      availabilityPayments,
      concessionPeriod,
      discountRate,
      constructionCosts = 0,
      operatingCosts = [],
      maintenanceCosts = [],
      performanceDeductions = [],
      inflationRate = 0
    } = params

    const r = new Decimal(discountRate)
    const inflation = new Decimal(inflationRate)
    let totalNPV = new Decimal(0)
    
    // Initial construction costs (negative cash flow)
    if (constructionCosts > 0) {
      totalNPV = totalNPV.minus(new Decimal(constructionCosts))
    }
    
    // Calculate NPV of net cash flows during concession period
    for (let t = 0; t < concessionPeriod && t < availabilityPayments.length; t++) {
      const availabilityPayment = new Decimal(availabilityPayments[t]!)
      const opex = new Decimal(operatingCosts[t] || 0)
      const maintenance = new Decimal(maintenanceCosts[t] || 0)
      const deduction = new Decimal(performanceDeductions[t] || 0)
      
      // Adjust for inflation if applicable
      const inflationFactor = new Decimal(1).plus(inflation).pow(t)
      const adjustedPayment = availabilityPayment.times(inflationFactor)
      const adjustedCosts = opex.plus(maintenance).times(inflationFactor)
      
      // Net cash flow = Availability Payment - Operating Costs - Maintenance - Deductions
      const netCashFlow = adjustedPayment.minus(adjustedCosts).minus(deduction)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvCashFlow = netCashFlow.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvCashFlow)
    }
    
    return totalNPV
  }

  /**
   * Calculate availability payment required for target return
   */
  public calculateRequiredAvailabilityPayment(
    constructionCost: number,
    targetIRR: number,
    concessionPeriod: number,
    operatingCosts: number[],
    maintenanceCosts: number[]
  ): Decimal {
    const construction = new Decimal(constructionCost)
    const irr = new Decimal(targetIRR)
    
    // Calculate total present value of costs
    let pvCosts = new Decimal(0)
    
    for (let t = 0; t < concessionPeriod; t++) {
      const opex = new Decimal(operatingCosts[t] || 0)
      const maintenance = new Decimal(maintenanceCosts[t] || 0)
      const totalCost = opex.plus(maintenance)
      
      const discountFactor = new Decimal(1).plus(irr).pow(t + 1)
      pvCosts = pvCosts.plus(totalCost.dividedBy(discountFactor))
    }
    
    // Calculate annuity factor for availability payments
    const annuityFactor = new Decimal(1)
      .minus(new Decimal(1).plus(irr).pow(-concessionPeriod))
      .dividedBy(irr)
    
    // Required availability payment = (Construction Cost + PV of Costs) / Annuity Factor
    const requiredPayment = construction.plus(pvCosts).dividedBy(annuityFactor)
    
    return requiredPayment
  }

  // ==========================================================================
  // REGULATORY ASSET BASE (RAB)
  // ==========================================================================

  /**
   * Calculate Regulatory Asset Base for utilities
   * SPECIFICATION: "Regulatory Asset Base (RAB): Value of assets used for rate-setting"
   */
  public regulatoryAssetBase(params: RegulatoryAssetBaseParams): Decimal {
    const {
      initialInvestment,
      depreciation,
      additions,
      disposals = 0,
      workingCapital = 0,
      regulatoryPeriod = 1,
      allowedReturn = 0
    } = params
    
    const initial = new Decimal(initialInvestment)
    const depr = new Decimal(depreciation)
    const add = new Decimal(additions)
    const disp = new Decimal(disposals)
    const wc = new Decimal(workingCapital)
    
    // RAB = Initial Investment - Depreciation + Additions - Disposals + Working Capital
    const rab = initial.minus(depr).plus(add).minus(disp).plus(wc)
    
    // If allowed return specified, calculate revenue requirement
    if (allowedReturn > 0) {
      const returnOnAssets = rab.times(new Decimal(allowedReturn))
      const depreciationAllowance = depr.dividedBy(regulatoryPeriod)
      
      // Revenue Requirement = Return on RAB + Depreciation + Operating Costs
      const revenueRequirement = returnOnAssets.plus(depreciationAllowance)
      
      return revenueRequirement // Return revenue requirement instead of just RAB
    }
    
    return rab
  }

  /**
   * Calculate allowed revenue under RAB model
   */
  public calculateAllowedRevenue(
    rab: number,
    allowedReturn: number,
    depreciation: number,
    operatingExpenses: number,
    taxAllowance: number = 0,
    incentives: number = 0
  ): Decimal {
    const base = new Decimal(rab)
    const wacc = new Decimal(allowedReturn)
    const depr = new Decimal(depreciation)
    const opex = new Decimal(operatingExpenses)
    const tax = new Decimal(taxAllowance)
    const inc = new Decimal(incentives)
    
    // Allowed Revenue = (RAB × WACC) + Depreciation + Opex + Tax + Incentives
    const returnOnCapital = base.times(wacc)
    const returnOfCapital = depr
    
    return returnOnCapital.plus(returnOfCapital).plus(opex).plus(tax).plus(inc)
  }

  // ==========================================================================
  // TARIFF MODELING
  // ==========================================================================

  /**
   * Calculate revenue from tariff structure
   * SPECIFICATION: "Tariff Structure: Pricing model for user fees"
   */
  public tariffModel(params: TariffModelParams): Decimal {
    const {
      usageVolume,
      fixedTariff,
      variableTariff,
      peakTariff = 0,
      offPeakTariff = 0,
      capacityCharge = 0,
      demandCharge = 0,
      timeOfUseRates = []
    } = params
    
    const volume = new Decimal(usageVolume)
    const fixed = new Decimal(fixedTariff)
    const variable = new Decimal(variableTariff)
    
    // Basic tariff revenue = Fixed charge + (Variable rate × Volume)
    let revenue = fixed.plus(variable.times(volume))
    
    // Add capacity and demand charges if applicable
    if (capacityCharge > 0) {
      revenue = revenue.plus(new Decimal(capacityCharge))
    }
    
    if (demandCharge > 0) {
      revenue = revenue.plus(new Decimal(demandCharge))
    }
    
    // Apply time-of-use rates if provided
    if (timeOfUseRates.length > 0) {
      let touRevenue = new Decimal(0)
      const hoursInDay = 24
      
      for (const rate of timeOfUseRates) {
        const hours = rate.endHour - rate.startHour
        const proportion = hours / hoursInDay
        const volumeInPeriod = volume.times(proportion)
        
        touRevenue = touRevenue.plus(volumeInPeriod.times(new Decimal(rate.rate)))
      }
      
      // Use TOU revenue if calculated
      if (touRevenue.greaterThan(0)) {
        revenue = fixed.plus(touRevenue)
      }
    } else if (peakTariff > 0 || offPeakTariff > 0) {
      // Simple peak/off-peak split (assume 30% peak, 70% off-peak)
      const peakVolume = volume.times(0.3)
      const offPeakVolume = volume.times(0.7)
      
      const peakRevenue = peakVolume.times(new Decimal(peakTariff))
      const offPeakRevenue = offPeakVolume.times(new Decimal(offPeakTariff))
      
      revenue = fixed.plus(peakRevenue).plus(offPeakRevenue)
    }
    
    return revenue
  }

  /**
   * Calculate optimal tariff for cost recovery
   */
  public calculateCostRecoveryTariff(
    totalCosts: number,
    expectedVolume: number,
    fixedCostProportion: number = 0.3,
    elasticityOfDemand: number = -0.3
  ): { fixedTariff: Decimal, variableTariff: Decimal } {
    const costs = new Decimal(totalCosts)
    const volume = new Decimal(expectedVolume)
    const fixedProp = new Decimal(fixedCostProportion)
    
    // Split costs into fixed and variable components
    const fixedCosts = costs.times(fixedProp)
    const variableCosts = costs.times(new Decimal(1).minus(fixedProp))
    
    // Calculate base tariffs
    let fixedTariff = fixedCosts.dividedBy(12) // Monthly fixed charge
    let variableTariff = variableCosts.dividedBy(volume)
    
    // Adjust for demand elasticity (Ramsey pricing)
    const elasticity = new Decimal(elasticityOfDemand)
    const markup = new Decimal(1).dividedBy(new Decimal(1).plus(elasticity.abs()))
    
    variableTariff = variableTariff.times(markup)
    
    return {
      fixedTariff,
      variableTariff
    }
  }

  // ==========================================================================
  // CONCESSION VALUATION
  // ==========================================================================

  /**
   * Value infrastructure concession
   * SPECIFICATION: "Concession Period: Duration of private operation rights"
   */
  public concessionValuation(params: ConcessionValuationParams): Decimal {
    const {
      concessionLength,
      revenueProjections,
      operatingExpenses,
      capitalExpenses,
      taxRate,
      discountRate,
      terminalValueMethod = 'perpetuity',
      terminalValueParameter = 0
    } = params
    
    const r = new Decimal(discountRate)
    const tax = new Decimal(taxRate)
    let totalNPV = new Decimal(0)
    
    // Calculate free cash flows during concession period
    for (let t = 0; t < concessionLength && t < revenueProjections.length; t++) {
      const revenue = new Decimal(revenueProjections[t]!)
      const opex = new Decimal(operatingExpenses[t] || 0)
      const capex = new Decimal(capitalExpenses[t] || 0)
      
      // EBITDA = Revenue - Operating Expenses
      const ebitda = revenue.minus(opex)
      
      // Tax on EBITDA (simplified - ignoring depreciation tax shield)
      const taxes = ebitda.times(tax)
      
      // Free Cash Flow = EBITDA - Taxes - CapEx
      const fcf = ebitda.minus(taxes).minus(capex)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      const pvFCF = fcf.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvFCF)
    }
    
    // Calculate terminal value if concession has residual value
    if (terminalValueParameter > 0) {
      const lastFCF = new Decimal(revenueProjections[concessionLength - 1] || 0)
        .minus(new Decimal(operatingExpenses[concessionLength - 1] || 0))
        .times(new Decimal(1).minus(tax))
      
      let terminalValue = new Decimal(0)
      
      switch (terminalValueMethod) {
        case 'perpetuity':
          // TV = FCF × (1 + g) / (r - g)
          const growthRate = new Decimal(terminalValueParameter)
          if (r.greaterThan(growthRate)) {
            terminalValue = lastFCF.times(new Decimal(1).plus(growthRate))
              .dividedBy(r.minus(growthRate))
          }
          break
          
        case 'multiple':
          // TV = EBITDA × Multiple
          const multiple = new Decimal(terminalValueParameter)
          const lastEBITDA = new Decimal(revenueProjections[concessionLength - 1] || 0)
            .minus(new Decimal(operatingExpenses[concessionLength - 1] || 0))
          terminalValue = lastEBITDA.times(multiple)
          break
          
        case 'book_value':
          // TV = Book Value of Assets
          terminalValue = new Decimal(terminalValueParameter)
          break
      }
      
      // Discount terminal value to present
      const pvTerminalValue = terminalValue.dividedBy(
        new Decimal(1).plus(r).pow(concessionLength)
      )
      
      totalNPV = totalNPV.plus(pvTerminalValue)
    }
    
    return totalNPV
  }

  // ==========================================================================
  // INFRASTRUCTURE DCF
  // ==========================================================================

  /**
   * Comprehensive DCF model for infrastructure projects
   */
  public infrastructureDCF(params: InfrastructureDCFParams): Decimal {
    const {
      cashFlows,
      discountRate,
      inflationRate,
      taxRate,
      depreciationSchedule = [],
      debtSchedule
    } = params
    
    const r = new Decimal(discountRate)
    const inflation = new Decimal(inflationRate)
    const tax = new Decimal(taxRate)
    let totalNPV = new Decimal(0)
    
    // Process each cash flow period
    for (const cf of cashFlows) {
      const revenue = new Decimal(cf.revenue)
      const opex = new Decimal(cf.opex)
      const capex = new Decimal(cf.capex)
      const wcChange = new Decimal(cf.workingCapitalChange || 0)
      
      // Adjust for inflation
      const inflationFactor = new Decimal(1).plus(inflation).pow(cf.period)
      const adjustedRevenue = revenue.times(inflationFactor)
      const adjustedOpex = opex.times(inflationFactor)
      
      // EBITDA
      const ebitda = adjustedRevenue.minus(adjustedOpex)
      
      // Depreciation tax shield
      const depreciation = new Decimal(depreciationSchedule[cf.period] || 0)
      const taxShield = depreciation.times(tax)
      
      // Interest tax shield if debt schedule provided
      let interestTaxShield = new Decimal(0)
      if (debtSchedule) {
        const interest = this.calculateInterestPayment(
          debtSchedule,
          cf.period
        )
        interestTaxShield = interest.times(tax)
      }
      
      // After-tax operating income
      const nopat = ebitda.times(new Decimal(1).minus(tax)).plus(taxShield)
      
      // Free Cash Flow
      const fcf = nopat
        .minus(capex)
        .minus(wcChange)
        .plus(interestTaxShield)
      
      // Discount to present value
      const discountFactor = new Decimal(1).plus(r).pow(cf.period)
      const pvFCF = fcf.dividedBy(discountFactor)
      
      totalNPV = totalNPV.plus(pvFCF)
    }
    
    return totalNPV
  }

  /**
   * Calculate interest payment for a given period
   */
  private calculateInterestPayment(
    debtSchedule: DebtSchedule,
    period: number
  ): Decimal {
    const { principal, interestRate, term, type, gracePeriod = 0 } = debtSchedule
    
    // No payment during grace period
    if (period <= gracePeriod) {
      return new Decimal(0)
    }
    
    const p = new Decimal(principal)
    const r = new Decimal(interestRate)
    
    switch (type) {
      case 'amortizing':
        // Calculate remaining balance and interest
        const periodsElapsed = period - gracePeriod
        const totalPeriods = term - gracePeriod
        
        if (periodsElapsed > totalPeriods) {
          return new Decimal(0) // Loan fully repaid
        }
        
        // Simplified: assume equal principal payments
        const principalPayment = p.dividedBy(totalPeriods)
        const remainingBalance = p.minus(principalPayment.times(periodsElapsed - 1))
        
        return remainingBalance.times(r)
        
      case 'bullet':
      case 'balloon':
        // Interest only until maturity
        if (period <= term) {
          return p.times(r)
        }
        return new Decimal(0)
        
      default:
        return new Decimal(0)
    }
  }

  // ==========================================================================
  // INFRASTRUCTURE METRICS
  // ==========================================================================

  /**
   * Calculate comprehensive infrastructure project metrics
   */
  public calculateMetrics(
    initialInvestment: number,
    cashFlows: number[],
    debtAmount: number,
    debtService: number[],
    discountRate: number
  ): InfrastructureMetrics {
    // Project IRR
    const projectCashFlows = [-initialInvestment, ...cashFlows]
    const projectIRR = this.calculateIRR(projectCashFlows)
    
    // Equity IRR
    const equityInvestment = initialInvestment - debtAmount
    const equityCashFlows = cashFlows.map((cf, i) => cf - (debtService[i] || 0))
    const equityIRR = this.calculateIRR([-equityInvestment, ...equityCashFlows])
    
    // Payback Period
    let cumulative = -initialInvestment
    let paybackPeriod = 0
    
    for (let i = 0; i < cashFlows.length; i++) {
      cumulative += cashFlows[i]!
      if (cumulative >= 0) {
        paybackPeriod = i + 1
        break
      }
    }
    
    // Debt Service Coverage Ratio (average)
    let totalDSCR = new Decimal(0)
    let validPeriods = 0
    
    for (let i = 0; i < cashFlows.length; i++) {
      const cf = cashFlows[i]!
      const ds = debtService[i] || 0
      
      if (ds > 0) {
        const dscr = new Decimal(cf).dividedBy(new Decimal(ds))
        totalDSCR = totalDSCR.plus(dscr)
        validPeriods++
      }
    }
    
    const avgDSCR = validPeriods > 0 ? 
      totalDSCR.dividedBy(validPeriods).toNumber() : 0
    
    // Loan Life Coverage Ratio
    const pvCashFlows = this.presentValue(cashFlows, discountRate)
    const pvDebtService = this.presentValue(debtService, discountRate)
    const llcr = pvDebtService > 0 ? pvCashFlows / pvDebtService : 0
    
    // Net Present Value
    const npv = this.calculateNPV(projectCashFlows, discountRate)
    
    return {
      projectIRR,
      equityIRR,
      paybackPeriod,
      debtServiceCoverageRatio: avgDSCR,
      loanLifeCoverageRatio: llcr,
      netPresentValue: npv
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

  /**
   * Calculate Present Value of cash flow stream
   */
  private presentValue(cashFlows: number[], discountRate: number): number {
    const r = new Decimal(discountRate)
    let pv = new Decimal(0)
    
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = new Decimal(cashFlows[t] || 0)
      const discountFactor = new Decimal(1).plus(r).pow(t + 1)
      pv = pv.plus(cf.dividedBy(discountFactor))
    }
    
    return pv.toNumber()
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const infrastructureModels = InfrastructureModels.getInstance()
