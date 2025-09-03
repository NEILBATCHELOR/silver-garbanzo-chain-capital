/**
 * PrivateEquityCalculator - NAV calculation for Private Equity holdings
 * 
 * Handles:
 * - J-curve modeling and fund lifecycle management
 * - Illiquidity premiums and discount rates
 * - Commitment tracking and drawdown schedules
 * - Portfolio company valuations with multiple methodologies
 * - Exit value projections and timing analysis  
 * - Fund performance attribution and benchmarking
 * - Carried interest calculations and management fees
 * - Capital call/distribution modeling
 * - Vintage year and sector diversification analysis
 * - IRR and multiple calculations
 * 
 * Supports private equity products from private_equity_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import {
  AssetType,
  CalculationInput,
  CalculationResult,
  CalculationStatus,
  PriceData,
  NavServiceResult,
  ValidationSeverity,
  MarketDataProvider
} from '../types'

export interface PrivateEquityCalculationInput extends CalculationInput {
  // Private equity specific parameters
  fundId?: string
  fundType?: string
  vintageYear?: number
  investmentStage?: string
  sectorFocus?: string
  geographicFocus?: string
  managementFee?: number
  carriedInterest?: number
  hurdleRate?: number
  commitmentPeriod?: number
  capitalCommitment?: number
  investedCapital?: number
  unfundedCommitment?: number
  distributedToDate?: number
  illiquidityDiscount?: number
  benchmarkIndex?: string
  riskAdjustment?: number
}

export interface PortfolioCompany {
  companyId: string
  companyName: string
  investmentDate: Date
  exitDate?: Date
  investmentAmount: number
  ownershipPercentage: number
  valuationPreMoney: number
  valuationPostMoney: number
  financingRound: string
  stageOfDevelopment: string
  sector: string
  geography: string
  status: string
  currentValue: number
  unrealizedGain: number
  exitMechanism?: string
  exitMultiple?: number
  moic?: number // Multiple of Invested Capital
  irr?: number
}

export interface FundPerformanceMetrics {
  totalValue: Decimal
  totalInvested: Decimal
  totalDistributed: Decimal
  netAssetValue: Decimal
  tvpi: number // Total Value to Paid In
  dpi: number // Distributions to Paid In  
  rvpi: number // Residual Value to Paid In
  irr: number
  moic: number // Multiple of Invested Capital
  jCurvePosition: number // J-curve progress (0-1)
  vintageBenchmark: number
  peerRanking: number
}

export interface JCurveAnalysis {
  stage: 'early_investment' | 'harvest' | 'mature'
  monthsFromFormation: number
  expectedCashFlows: CashFlowProjection[]
  cumulativeNetCashFlow: number
  crossoverPoint: number // Months when positive
  peakNegativeCashFlow: number
  maturityProgress: number // 0-1 scale
}

export interface CashFlowProjection {
  date: Date
  capitalCall: number
  distribution: number
  netCashFlow: number
  navValue: number
  cumulativeNetCashFlow: number
  confidence: number // 0-1
}

export interface IlliquidityAdjustment {
  baseLiquidityDiscount: number // Base illiquidity premium
  fundAgeAdjustment: number // Adjustment based on fund maturity
  sectorRiskAdjustment: number // Sector-specific risk
  sizeAdjustment: number // Fund size impact
  marketConditionsAdjustment: number // Current market liquidity
  finalDiscount: number
  durationToLiquidity: number // Expected months to liquidity
}

export class PrivateEquityCalculator extends BaseCalculator {
  constructor(options: CalculatorOptions = {}) {
    super(options)
  }

  // ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

  canHandle(input: CalculationInput): boolean {
    if (!input.productType) return false
    
    const supportedTypes = this.getAssetTypes()
    return supportedTypes.includes(input.productType as AssetType)
  }

  getAssetTypes(): AssetType[] {
    return [AssetType.PRIVATE_EQUITY]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const peInput = input as PrivateEquityCalculationInput

      // Get private equity fund details
      const fundDetails = await this.getFundDetails(peInput)
      
      // Get portfolio companies and their valuations
      const portfolioCompanies = await this.getPortfolioCompanies(peInput, fundDetails)
      
      // Calculate individual company valuations
      const companyValuations = await this.calculateCompanyValuations(
        portfolioCompanies, 
        peInput.valuationDate
      )
      
      // Aggregate portfolio value
      const portfolioValue = await this.aggregatePortfolioValue(companyValuations)
      
      // Apply illiquidity adjustments
      const illiquidityAdjustment = await this.calculateIlliquidityAdjustment(
        fundDetails, 
        portfolioValue, 
        peInput
      )
      
      // Calculate fund-level adjustments (fees, carried interest)
      const fundAdjustments = await this.calculateFundAdjustments(
        peInput, 
        fundDetails, 
        portfolioValue
      )
      
      // J-curve analysis and lifecycle modeling
      const jCurveAnalysis = await this.performJCurveAnalysis(
        fundDetails, 
        portfolioValue, 
        peInput.valuationDate
      )
      
      // Calculate performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(
        fundDetails, 
        portfolioValue, 
        jCurveAnalysis
      )
      
      // Calculate final NAV with adjustments
      const grossAssetValue = portfolioValue.totalValue
      const illiquidityAdjustedValue = grossAssetValue.minus(
        grossAssetValue.times(illiquidityAdjustment.finalDiscount)
      )
      
      const totalLiabilities = fundAdjustments.managementFees
        .plus(fundAdjustments.carriedInterestAccrual)
        .plus(fundAdjustments.otherExpenses)
      
      const netAssetValue = illiquidityAdjustedValue.minus(totalLiabilities)
      
      // Build comprehensive calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `pe_fund_${fundDetails.fundId}`,
        productType: AssetType.PRIVATE_EQUITY,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(grossAssetValue),
        totalLiabilities: this.toNumber(totalLiabilities),
        netAssets: this.toNumber(netAssetValue),
        navValue: this.toNumber(netAssetValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(netAssetValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildPEPricingSources(companyValuations, illiquidityAdjustment),
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          portfolioCompanies: companyValuations.length,
          jCurveStage: jCurveAnalysis.stage,
          illiquidityDiscount: illiquidityAdjustment.finalDiscount,
          performanceMetrics: {
            tvpi: performanceMetrics.tvpi,
            dpi: performanceMetrics.dpi,
            irr: performanceMetrics.irr,
            moic: performanceMetrics.moic
          },
          fundDetails: {
            vintageYear: fundDetails.vintageYear,
            fundType: fundDetails.fundType,
            investmentStage: fundDetails.investmentStage,
            commitmentPeriod: fundDetails.commitmentPeriod,
            deploymentProgress: fundDetails.investedCapital / fundDetails.capitalCommitment
          }
        }
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown private equity calculation error',
        code: 'PRIVATE_EQUITY_CALCULATION_FAILED'
      }
    }
  }

  // ==================== PRIVATE EQUITY SPECIFIC METHODS ====================

  /**
   * Fetches private equity fund details from database
   */
  private async getFundDetails(input: PrivateEquityCalculationInput): Promise<any> {
    // TODO: Replace with actual database query
    // For now, mock implementation with realistic data structure
    return {
      id: input.assetId || 'pe_fund_001',
      fundId: input.fundId || 'PE001',
      fundName: `Private Equity Fund ${input.fundId}`,
      fundType: input.fundType || 'buyout',
      vintageYear: input.vintageYear || 2020,
      fundSize: 1000000000, // $1B fund
      formationDate: new Date('2020-01-01'),
      investmentStage: input.investmentStage || 'growth',
      sectorFocus: input.sectorFocus || 'technology',
      geographicFocus: input.geographicFocus || 'north_america',
      commitmentPeriod: input.commitmentPeriod || 60, // months
      capitalCommitment: input.capitalCommitment || 50000000,
      investedCapital: input.investedCapital || 35000000,
      capitalCall: 35000000,
      distributedToDate: input.distributedToDate || 5000000,
      managementFee: input.managementFee || 0.02, // 2%
      carriedInterest: input.carriedInterest || 0.20, // 20%
      hurdleRate: input.hurdleRate || 0.08, // 8%
      internalRateOfReturn: 0.15,
      distributedToPaidIn: 0.14,
      residualValueToPaidIn: 1.25
    }
  }

  /**
   * Gets portfolio companies for the private equity fund
   */
  private async getPortfolioCompanies(
    input: PrivateEquityCalculationInput, 
    fundDetails: any
  ): Promise<PortfolioCompany[]> {
    // TODO: Replace with actual database query
    // For now, mock implementation with representative portfolio
    return [
      {
        companyId: 'company_001',
        companyName: 'TechCorp Inc',
        investmentDate: new Date('2020-06-01'),
        investmentAmount: 10000000,
        ownershipPercentage: 25,
        valuationPreMoney: 30000000,
        valuationPostMoney: 40000000,
        financingRound: 'Series B',
        stageOfDevelopment: 'growth',
        sector: 'technology',
        geography: 'north_america',
        status: 'active',
        currentValue: 15000000,
        unrealizedGain: 5000000,
        moic: 1.5
      },
      {
        companyId: 'company_002', 
        companyName: 'HealthTech Solutions',
        investmentDate: new Date('2021-03-15'),
        exitDate: new Date('2023-09-01'),
        investmentAmount: 8000000,
        ownershipPercentage: 20,
        valuationPreMoney: 32000000,
        valuationPostMoney: 40000000,
        financingRound: 'Series C',
        stageOfDevelopment: 'mature',
        sector: 'healthcare',
        geography: 'north_america',
        status: 'exited',
        currentValue: 0, // Already exited
        unrealizedGain: 0,
        exitMechanism: 'strategic_sale',
        exitMultiple: 2.5,
        moic: 2.5,
        irr: 0.45
      }
      // Additional portfolio companies would be included here
    ]
  }

  /**
   * Calculates individual company valuations using multiple methods
   */
  private async calculateCompanyValuations(
    companies: PortfolioCompany[], 
    valuationDate: Date
  ): Promise<any[]> {
    const valuations = []
    
    for (const company of companies) {
      const valuation = {
        companyId: company.companyId,
        companyName: company.companyName,
        valuationMethod: 'market_comparable',
        fairValue: this.decimal(company.currentValue),
        
        // Multiple valuation approaches for validation
        marketComparable: this.calculateMarketComparableValue(company),
        discountedCashFlow: this.calculateDCFValue(company, valuationDate),
        assetBased: this.calculateAssetBasedValue(company),
        
        // Risk adjustments
        liquidityDiscount: 0.20,
        minorityDiscount: company.ownershipPercentage < 50 ? 0.15 : 0,
        keyPersonDiscount: 0.05,
        
        // Performance metrics
        unrealizedGain: this.decimal(company.unrealizedGain),
        moic: company.moic || 1.0,
        holdingPeriodMonths: this.calculateHoldingPeriod(
          company.investmentDate, 
          company.exitDate || valuationDate
        )
      }
      
      valuations.push(valuation)
    }
    
    return valuations
  }

  /**
   * Market comparable valuation methodology
   */
  private calculateMarketComparableValue(company: PortfolioCompany): Decimal {
    // Simplified market comparable calculation
    // In practice, this would use industry multiples and peer analysis
    const baseValue = this.decimal(company.currentValue)
    const sectorMultiple = this.getSectorMultiple(company.sector)
    const sizeAdjustment = this.getSizeAdjustment(company.currentValue)
    
    return baseValue.times(sectorMultiple).times(sizeAdjustment)
  }

  /**
   * Discounted Cash Flow valuation methodology
   */
  private calculateDCFValue(company: PortfolioCompany, valuationDate: Date): Decimal {
    // Simplified DCF calculation
    // In practice, this would involve detailed cash flow projections
    const projectedCashFlows = this.projectCompanyCashFlows(company, 5) // 5 years
    const discountRate = 0.12 // 12% required return
    
    let dcfValue = new Decimal(0)
    
    projectedCashFlows.forEach((cashFlow, year) => {
      const discountFactor = Math.pow(1 + discountRate, year + 1)
      const presentValue = this.decimal(cashFlow).div(discountFactor)
      dcfValue = dcfValue.plus(presentValue)
    })
    
    return dcfValue
  }

  /**
   * Asset-based valuation methodology
   */
  private calculateAssetBasedValue(company: PortfolioCompany): Decimal {
    // Simplified asset-based valuation
    const bookValue = this.decimal(company.investmentAmount)
    const assetAppreciation = 1.2 // 20% appreciation assumption
    
    return bookValue.times(assetAppreciation)
  }

  /**
   * Aggregates portfolio company values
   */
  private async aggregatePortfolioValue(companyValuations: any[]): Promise<any> {
    let totalValue = new Decimal(0)
    let totalInvested = new Decimal(0)
    let totalUnrealized = new Decimal(0)
    let totalRealized = new Decimal(0)
    
    for (const valuation of companyValuations) {
      totalValue = totalValue.plus(valuation.fairValue)
      totalUnrealized = totalUnrealized.plus(valuation.unrealizedGain)
    }
    
    return {
      totalValue,
      totalInvested,
      totalUnrealized,
      totalRealized,
      numberOfCompanies: companyValuations.length,
      averageHoldingPeriod: this.calculateAverageHoldingPeriod(companyValuations),
      sectorDiversification: this.calculateSectorDiversification(companyValuations)
    }
  }

  /**
   * Calculates illiquidity adjustment based on multiple factors
   */
  private async calculateIlliquidityAdjustment(
    fundDetails: any, 
    portfolioValue: any, 
    input: PrivateEquityCalculationInput
  ): Promise<IlliquidityAdjustment> {
    const monthsFromFormation = this.calculateMonthsFromFormation(fundDetails.formationDate)
    const fundLifecycleStage = this.determineFundLifecycleStage(monthsFromFormation)
    
    // Base illiquidity discount varies by fund stage
    let baseLiquidityDiscount = 0.20 // 20% base discount
    
    // Adjust based on fund maturity (J-curve position)
    let fundAgeAdjustment = 0
    if (fundLifecycleStage === 'early_investment') {
      fundAgeAdjustment = 0.05 // Additional discount for early stage
    } else if (fundLifecycleStage === 'harvest') {
      fundAgeAdjustment = -0.08 // Lower discount approaching liquidity
    }
    
    // Sector risk adjustment
    const sectorRiskAdjustment = this.getSectorRiskAdjustment(fundDetails.sectorFocus)
    
    // Fund size adjustment (larger funds typically more liquid)
    const sizeAdjustment = fundDetails.fundSize > 500000000 ? -0.02 : 0.03
    
    // Current market conditions
    const marketConditionsAdjustment = await this.getMarketLiquidityAdjustment()
    
    const finalDiscount = Math.max(0, 
      baseLiquidityDiscount + 
      fundAgeAdjustment + 
      sectorRiskAdjustment + 
      sizeAdjustment + 
      marketConditionsAdjustment
    )
    
    // Expected duration to liquidity based on fund lifecycle
    const durationToLiquidity = this.estimateDurationToLiquidity(
      fundLifecycleStage, 
      monthsFromFormation
    )
    
    return {
      baseLiquidityDiscount,
      fundAgeAdjustment,
      sectorRiskAdjustment,
      sizeAdjustment,
      marketConditionsAdjustment,
      finalDiscount,
      durationToLiquidity
    }
  }

  /**
   * Calculates fund-level adjustments for fees and carried interest
   */
  private async calculateFundAdjustments(
    input: PrivateEquityCalculationInput, 
    fundDetails: any, 
    portfolioValue: any
  ): Promise<any> {
    const managementFee = this.decimal(fundDetails.capitalCommitment)
      .times(fundDetails.managementFee)
      .div(12) // Monthly accrual
    
    // Carried interest calculation (simplified)
    const totalReturn = portfolioValue.totalValue.minus(fundDetails.investedCapital)
    const hurdleReturn = this.decimal(fundDetails.investedCapital).times(fundDetails.hurdleRate)
    const excessReturn = totalReturn.minus(hurdleReturn)
    const carriedInterestAccrual = excessReturn.gt(0) ? 
      excessReturn.times(fundDetails.carriedInterest) : 
      new Decimal(0)
    
    const otherExpenses = this.decimal(portfolioValue.totalValue).times(0.005) // 0.5% other expenses
    
    return {
      managementFees: managementFee,
      carriedInterestAccrual,
      otherExpenses,
      totalAdjustments: managementFee.plus(carriedInterestAccrual).plus(otherExpenses)
    }
  }

  /**
   * Performs J-curve analysis for fund lifecycle modeling
   */
  private async performJCurveAnalysis(
    fundDetails: any, 
    portfolioValue: any, 
    valuationDate: Date
  ): Promise<JCurveAnalysis> {
    const monthsFromFormation = this.calculateMonthsFromFormation(fundDetails.formationDate)
    const stage = this.determineFundLifecycleStage(monthsFromFormation)
    
    // Project future cash flows
    const expectedCashFlows = this.projectFundCashFlows(fundDetails, portfolioValue, 120) // 10 years
    
    // Calculate cumulative net cash flow
    let cumulativeNetCashFlow = -fundDetails.investedCapital
    fundDetails.distributedToDate && (cumulativeNetCashFlow += fundDetails.distributedToDate)
    
    // Estimate crossover point (when cumulative cash flows turn positive)
    const crossoverPoint = this.estimateCrossoverPoint(expectedCashFlows, cumulativeNetCashFlow)
    
    // Find peak negative cash flow
    const peakNegativeCashFlow = Math.min(cumulativeNetCashFlow, -fundDetails.investedCapital)
    
    // Calculate maturity progress (0-1 scale based on typical fund lifecycle)
    const maturityProgress = Math.min(1.0, monthsFromFormation / 120) // 10-year fund lifecycle
    
    return {
      stage,
      monthsFromFormation,
      expectedCashFlows,
      cumulativeNetCashFlow,
      crossoverPoint,
      peakNegativeCashFlow,
      maturityProgress
    }
  }

  /**
   * Calculates comprehensive performance metrics
   */
  private async calculatePerformanceMetrics(
    fundDetails: any, 
    portfolioValue: any, 
    jCurveAnalysis: JCurveAnalysis
  ): Promise<FundPerformanceMetrics> {
    const totalInvested = this.decimal(fundDetails.investedCapital)
    const totalDistributed = this.decimal(fundDetails.distributedToDate || 0)
    const netAssetValue = portfolioValue.totalValue
    const totalValue = netAssetValue.plus(totalDistributed)
    
    // Key performance ratios
    const tvpi = this.toNumber(totalValue.div(totalInvested)) // Total Value to Paid In
    const dpi = this.toNumber(totalDistributed.div(totalInvested)) // Distributions to Paid In  
    const rvpi = this.toNumber(netAssetValue.div(totalInvested)) // Residual Value to Paid In
    
    // IRR calculation (simplified)
    const holdingPeriodYears = jCurveAnalysis.monthsFromFormation / 12
    const irr = holdingPeriodYears > 0 ? 
      Math.pow(tvpi, 1 / holdingPeriodYears) - 1 : 
      0
    
    const moic = tvpi // Multiple of Invested Capital (same as TVPI for PE)
    
    // J-curve position (0 = early negative, 1 = positive value creation)
    const jCurvePosition = Math.max(0, Math.min(1, 
      (jCurveAnalysis.cumulativeNetCashFlow + Math.abs(jCurveAnalysis.peakNegativeCashFlow)) / 
      Math.abs(jCurveAnalysis.peakNegativeCashFlow)
    ))
    
    // Benchmark comparisons (simplified)
    const vintageBenchmark = 0.12 // 12% vintage year benchmark
    const peerRanking = irr > vintageBenchmark ? 75 : 25 // Percentile ranking
    
    return {
      totalValue,
      totalInvested,
      totalDistributed,
      netAssetValue,
      tvpi,
      dpi,
      rvpi,
      irr,
      moic,
      jCurvePosition,
      vintageBenchmark,
      peerRanking
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateMonthsFromFormation(formationDate: Date): number {
    const now = new Date()
    const yearDiff = now.getFullYear() - formationDate.getFullYear()
    const monthDiff = now.getMonth() - formationDate.getMonth()
    return yearDiff * 12 + monthDiff
  }

  private determineFundLifecycleStage(monthsFromFormation: number): 'early_investment' | 'harvest' | 'mature' {
    if (monthsFromFormation < 36) return 'early_investment' // First 3 years
    if (monthsFromFormation < 84) return 'harvest' // Years 3-7
    return 'mature' // Years 7+
  }

  private getSectorMultiple(sector: string): number {
    const sectorMultiples: Record<string, number> = {
      technology: 1.2,
      healthcare: 1.1,
      financial_services: 0.9,
      industrials: 1.0,
      consumer: 1.0,
      energy: 0.8
    }
    return sectorMultiples[sector] || 1.0
  }

  private getSizeAdjustment(value: number): number {
    if (value > 50000000) return 1.1 // Large companies get premium
    if (value < 5000000) return 0.9 // Small companies get discount
    return 1.0
  }

  private getSectorRiskAdjustment(sector: string): number {
    const sectorRisks: Record<string, number> = {
      technology: 0.02, // Higher risk
      healthcare: 0.01,
      financial_services: 0.03,
      industrials: 0.00,
      consumer: 0.01,
      energy: 0.04
    }
    return sectorRisks[sector] || 0.02
  }

  private async getMarketLiquidityAdjustment(): Promise<number> {
    // TODO: Replace with actual market conditions analysis
    return 0.01 // 1% additional discount for current conditions
  }

  private estimateDurationToLiquidity(stage: string, monthsFromFormation: number): number {
    switch (stage) {
      case 'early_investment': return 60 // 5 years
      case 'harvest': return 36 // 3 years
      case 'mature': return 12 // 1 year
      default: return 48 // 4 years default
    }
  }

  private projectCompanyCashFlows(company: PortfolioCompany, years: number): number[] {
    // Simplified cash flow projection
    const baseCashFlow = company.currentValue * 0.2 // 20% cash flow yield
    const growthRate = 0.05 // 5% annual growth
    
    const cashFlows = []
    for (let year = 0; year < years; year++) {
      cashFlows.push(baseCashFlow * Math.pow(1 + growthRate, year))
    }
    return cashFlows
  }

  private projectFundCashFlows(fundDetails: any, portfolioValue: any, months: number): CashFlowProjection[] {
    // Simplified fund cash flow projection
    const projections = []
    const monthlyDistribution = portfolioValue.totalValue.toNumber() / months
    
    for (let month = 1; month <= months; month++) {
      const date = new Date()
      date.setMonth(date.getMonth() + month)
      
      projections.push({
        date,
        capitalCall: month <= 36 ? fundDetails.capitalCommitment * 0.02 : 0,
        distribution: month > 36 ? monthlyDistribution : 0,
        netCashFlow: month > 36 ? monthlyDistribution : -fundDetails.capitalCommitment * 0.02,
        navValue: portfolioValue.totalValue.toNumber(),
        cumulativeNetCashFlow: 0, // Would be calculated cumulatively
        confidence: Math.max(0.5, 1 - month / months) // Decreasing confidence over time
      })
    }
    
    return projections
  }

  private estimateCrossoverPoint(cashFlows: CashFlowProjection[], initialCumulative: number): number {
    let cumulative = initialCumulative
    for (let i = 0; i < cashFlows.length; i++) {
      cumulative += cashFlows[i]?.netCashFlow || 0
      if (cumulative > 0) {
        return i + 1 // Return month number
      }
    }
    return -1 // No crossover within projection period
  }

  private calculateHoldingPeriod(investmentDate: Date, exitDate: Date): number {
    const yearDiff = exitDate.getFullYear() - investmentDate.getFullYear()
    const monthDiff = exitDate.getMonth() - investmentDate.getMonth()
    return yearDiff * 12 + monthDiff
  }

  private calculateAverageHoldingPeriod(valuations: any[]): number {
    const totalMonths = valuations.reduce((sum, v) => sum + v.holdingPeriodMonths, 0)
    return valuations.length > 0 ? totalMonths / valuations.length : 0
  }

  private calculateSectorDiversification(valuations: any[]): Record<string, number> {
    // Simplified sector analysis
    return {
      technology: 0.4,
      healthcare: 0.3,
      industrials: 0.2,
      consumer: 0.1
    }
  }

  private buildPEPricingSources(valuations: any[], illiquidityAdjustment: IlliquidityAdjustment): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    // Add portfolio company pricing sources
    valuations.forEach((valuation, index) => {
      pricingSources[`company_${index + 1}`] = {
        price: this.toNumber(valuation.fairValue),
        currency: 'USD',
        asOf: new Date(),
        source: MarketDataProvider.MANUAL_OVERRIDE.toString()
      }
    })
    
    // Add illiquidity adjustment pricing
    pricingSources['illiquidity_adjustment'] = {
      price: illiquidityAdjustment.finalDiscount,
      currency: 'DISCOUNT_RATE',
      asOf: new Date(),
      source: 'internal_model'
    }
    
    return pricingSources
  }

  protected override generateRunId(): string {
    return `pe_nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
