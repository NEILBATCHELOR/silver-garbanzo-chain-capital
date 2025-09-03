/**
 * MmfCalculator - NAV calculation for Money Market Funds
 * 
 * Handles:
 * - SEC Rule 2a-7 compliance requirements
 * - Shadow pricing and stress testing
 * - Weighted Average Maturity (WAM) calculations
 * - Weighted Average Life (WAL) calculations
 * - Credit quality assessments
 * - Liquidity requirements validation
 * - Stable NAV vs Variable NAV fund types
 * 
 * Supports MMF products from fund_products table
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
  AssetHolding
} from '../types'

export interface MmfCalculationInput extends CalculationInput {
  // MMF-specific parameters
  fundType?: 'stable_nav' | 'variable_nav'
  shareClass?: 'institutional' | 'retail'
  liquidityFeeThreshold?: number // percentage
  redemptionGateThreshold?: number // percentage
  weeklyLiquidityMinimum?: number // percentage (min 30% for retail, 10% for institutional)
  dailyLiquidityMinimum?: number // percentage (min 10%)
  maxMaturity?: number // days (397 days max for retail, 762 for institutional)
  maxWeightedAverageMaturity?: number // days (60 days max for retail, 120 for institutional)
  maxWeightedAverageLife?: number // days (120 days max for retail, 397 for institutional)
  shadowPricing?: boolean // enable shadow NAV calculations
  stressTesting?: boolean // enable stress test scenarios
  yieldCalculationMethod?: 'simple' | 'compound'
  minimumCreditQuality?: 'A1' | 'A2' | 'A3' // minimum short-term rating
}

export interface MmfHolding extends AssetHolding {
  // Additional MMF-specific holding data
  maturityDate: Date
  issueDate: Date
  creditRating: string
  shortTermRating?: string
  issuerType: 'government' | 'bank' | 'corporate' | 'asset_backed' | 'municipal'
  securityType: 'cp' | 'cd' | 'ba' | 'repo' | 'treasury' | 'agency' | 'note' | 'variable_rate'
  floatingRate?: boolean
  dailyLiquid?: boolean
  weeklyLiquid?: boolean
  amortizedCost?: number
  marketValue?: number
  shadowPrice?: number
  yieldToMaturity?: number
}

export interface MmfPriceData extends PriceData {
  amortizedCostPrice: number
  marketPrice: number
  shadowPrice: number
  yieldToMaturity: number
  daysToMaturity: number
  liquidityClassification: 'daily' | 'weekly' | 'monthly' | 'illiquid'
  creditRisk: number
  staleness: number
  confidence: number
}

export interface MmfRiskMetrics {
  weightedAverageMaturity: number // days
  weightedAverageLife: number // days
  dailyLiquidityPercentage: number
  weeklyLiquidityPercentage: number
  creditQualityScore: number
  concentrationRisk: number
  interestRateRisk: number
  shadowNavDeviation: number // basis points from $1.00
}

export interface StressTestScenario {
  name: string
  interestRateShock: number // basis points
  creditSpreadShock: number // basis points
  liquidityStress: number // percentage of assets becoming illiquid
  expectedNavImpact: number // dollar impact
}

export class MmfCalculator extends BaseCalculator {
  private static readonly STABLE_NAV_TARGET = 1.00
  private static readonly MAX_SHADOW_DEVIATION_BPS = 50 // 0.5%
  private static readonly SEC_2A7_DAILY_LIQUIDITY_MIN = 0.10 // 10%
  private static readonly SEC_2A7_WEEKLY_LIQUIDITY_MIN_RETAIL = 0.30 // 30%
  private static readonly SEC_2A7_WEEKLY_LIQUIDITY_MIN_INSTITUTIONAL = 0.10 // 10%

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
    return [AssetType.MMF]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const mmfInput = input as MmfCalculationInput
      
      // Get MMF product details and holdings from database
      const productDetails = await this.getMmfProductDetails(mmfInput)
      const holdings = await this.getMmfHoldings(mmfInput)
      
      // Perform portfolio valuation using both amortized cost and market value methods
      const portfolioValuation = await this.calculatePortfolioValuation(holdings, mmfInput.valuationDate)
      
      // Calculate risk metrics and compliance checks
      const riskMetrics = await this.calculateRiskMetrics(holdings, mmfInput.valuationDate)
      const complianceResults = await this.performComplianceChecks(riskMetrics, productDetails)
      
      // Perform shadow pricing if enabled
      let shadowNavResults = null
      if (mmfInput.shadowPricing) {
        shadowNavResults = await this.calculateShadowNav(holdings, mmfInput.valuationDate)
      }
      
      // Perform stress testing if enabled
      let stressTestResults = null
      if (mmfInput.stressTesting) {
        stressTestResults = await this.performStressTests(holdings, portfolioValuation)
      }
      
      // Calculate final NAV based on fund type
      const navCalculation = await this.calculateFinalNav(
        portfolioValuation,
        productDetails,
        mmfInput,
        shadowNavResults
      )
      
      // Build comprehensive calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `mmf_${productDetails.fundId}`,
        productType: AssetType.MMF,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(portfolioValuation.totalAmortizedCost),
        totalLiabilities: input.liabilities || 0,
        netAssets: this.toNumber(portfolioValuation.totalAmortizedCost.minus(this.decimal(input.liabilities || 0))),
        navValue: this.toNumber(navCalculation.totalNavValue),
        navPerShare: this.toNumber(navCalculation.navPerShare),
        sharesOutstanding: input.sharesOutstanding,
        currency: input.targetCurrency || 'USD',
        pricingSources: this.buildPricingSources(holdings),
        calculatedAt: new Date(),
        status: complianceResults.allPassed ? CalculationStatus.COMPLETED : CalculationStatus.FAILED,
        errorMessage: complianceResults.allPassed ? undefined : `SEC 2a-7 compliance violations: ${complianceResults.violations.join(', ')}`
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MMF calculation error',
        code: 'MMF_CALCULATION_FAILED'
      }
    }
  }

  // ==================== MMF-SPECIFIC METHODS ====================

  /**
   * Fetches MMF product details from the database
   */
  private async getMmfProductDetails(input: MmfCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query to fund_products table
    return {
      fundId: input.assetId || 'mmf_default',
      fundName: 'Money Market Fund',
      fundType: input.fundType || 'stable_nav',
      shareClass: input.shareClass || 'institutional',
      currency: 'USD',
      minimumCreditQuality: input.minimumCreditQuality || 'A2',
      maxWeightedAverageMaturity: input.maxWeightedAverageMaturity || 60,
      maxWeightedAverageLife: input.maxWeightedAverageLife || 120,
      weeklyLiquidityMinimum: input.weeklyLiquidityMinimum || 
        (input.shareClass === 'retail' ? 0.30 : 0.10),
      dailyLiquidityMinimum: input.dailyLiquidityMinimum || 0.10,
      liquidityFeeThreshold: input.liquidityFeeThreshold || 0.30,
      redemptionGateThreshold: input.redemptionGateThreshold || 0.10,
      shadowPricingEnabled: input.shadowPricing || true,
      stressTestingEnabled: input.stressTesting || true
    }
  }

  /**
   * Fetches MMF holdings from the database
   */
  private async getMmfHoldings(input: MmfCalculationInput): Promise<MmfHolding[]> {
    // Mock implementation - replace with actual database query to asset_holdings
    const mockHoldings: MmfHolding[] = [
      {
        instrumentKey: 'US_TREASURY_BILL_3M',
        quantity: 10000000,
        currency: 'USD',
        effectiveDate: new Date(),
        maturityDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        issueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        creditRating: 'AAA',
        shortTermRating: 'A1',
        issuerType: 'government',
        securityType: 'treasury',
        floatingRate: false,
        dailyLiquid: true,
        weeklyLiquid: true,
        amortizedCost: 9980000,
        marketValue: 9985000,
        yieldToMaturity: 0.0525
      },
      {
        instrumentKey: 'COMMERCIAL_PAPER_CORP_A',
        quantity: 5000000,
        currency: 'USD',
        effectiveDate: new Date(),
        maturityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        creditRating: 'A',
        shortTermRating: 'A1',
        issuerType: 'corporate',
        securityType: 'cp',
        floatingRate: false,
        dailyLiquid: false,
        weeklyLiquid: true,
        amortizedCost: 4990000,
        marketValue: 4995000,
        yieldToMaturity: 0.0535
      },
      {
        instrumentKey: 'BANK_CD_60D',
        quantity: 3000000,
        currency: 'USD',
        effectiveDate: new Date(),
        maturityDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        issueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        creditRating: 'AA',
        shortTermRating: 'A1',
        issuerType: 'bank',
        securityType: 'cd',
        floatingRate: false,
        dailyLiquid: false,
        weeklyLiquid: false,
        amortizedCost: 2995000,
        marketValue: 2997000,
        yieldToMaturity: 0.0515
      }
    ]

    return mockHoldings
  }

  /**
   * Calculates portfolio valuation using amortized cost method
   */
  private async calculatePortfolioValuation(
    holdings: MmfHolding[],
    valuationDate: Date
  ): Promise<{
    totalAmortizedCost: Decimal,
    totalMarketValue: Decimal,
    holdingValuations: Array<{
      instrumentKey: string,
      amortizedCostValue: Decimal,
      marketValue: Decimal,
      accruedIncome: Decimal
    }>
  }> {
    let totalAmortizedCost = this.decimal(0)
    let totalMarketValue = this.decimal(0)
    const holdingValuations = []

    for (const holding of holdings) {
      // Calculate amortized cost value
      const amortizedCostValue = this.decimal(holding.amortizedCost || 0)
      
      // Calculate market value
      const marketValue = this.decimal(holding.marketValue || 0)
      
      // Calculate accrued income
      const accruedIncome = await this.calculateAccruedIncome(holding, valuationDate)
      
      holdingValuations.push({
        instrumentKey: holding.instrumentKey,
        amortizedCostValue: amortizedCostValue.plus(accruedIncome),
        marketValue,
        accruedIncome
      })
      
      totalAmortizedCost = totalAmortizedCost.plus(amortizedCostValue).plus(accruedIncome)
      totalMarketValue = totalMarketValue.plus(marketValue)
    }

    return {
      totalAmortizedCost,
      totalMarketValue,
      holdingValuations
    }
  }

  /**
   * Calculates accrued income for a money market instrument
   */
  private async calculateAccruedIncome(holding: MmfHolding, valuationDate: Date): Promise<Decimal> {
    const quantity = this.decimal(holding.quantity)
    const yieldToMaturity = this.decimal(holding.yieldToMaturity || 0)
    
    // Calculate days since issue
    const daysSinceIssue = Math.floor(
      (valuationDate.getTime() - holding.issueDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    
    // Calculate days to maturity
    const daysToMaturity = Math.floor(
      (holding.maturityDate.getTime() - valuationDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    
    if (daysToMaturity <= 0) return this.decimal(0)
    
    // Simple interest calculation for money market instruments
    const dailyYield = yieldToMaturity.div(365)
    const accruedIncome = quantity.mul(dailyYield).mul(daysSinceIssue)
    
    return accruedIncome
  }

  /**
   * Calculates comprehensive risk metrics for SEC 2a-7 compliance
   */
  private async calculateRiskMetrics(holdings: MmfHolding[], valuationDate: Date): Promise<MmfRiskMetrics> {
    const totalPortfolioValue = holdings.reduce(
      (sum, holding) => sum + (holding.amortizedCost || 0),
      0
    )

    // Calculate Weighted Average Maturity (WAM)
    let weightedMaturitySum = 0
    let weightedLifeSum = 0
    let dailyLiquidValue = 0
    let weeklyLiquidValue = 0

    for (const holding of holdings) {
      const weight = (holding.amortizedCost || 0) / totalPortfolioValue
      
      // Days to maturity
      const daysToMaturity = Math.floor(
        (holding.maturityDate.getTime() - valuationDate.getTime()) / (24 * 60 * 60 * 1000)
      )
      
      // Days from issue to maturity (life)
      const daysLife = Math.floor(
        (holding.maturityDate.getTime() - holding.issueDate.getTime()) / (24 * 60 * 60 * 1000)
      )
      
      weightedMaturitySum += weight * daysToMaturity
      weightedLifeSum += weight * daysLife
      
      // Liquidity classifications
      if (holding.dailyLiquid) {
        dailyLiquidValue += holding.amortizedCost || 0
      }
      if (holding.weeklyLiquid || holding.dailyLiquid) {
        weeklyLiquidValue += holding.amortizedCost || 0
      }
    }

    // Credit quality assessment
    const creditQualityScore = this.calculateCreditQualityScore(holdings)
    
    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(holdings)
    
    // Interest rate risk (duration approximation)
    const interestRateRisk = weightedMaturitySum / 365 // Convert to years
    
    return {
      weightedAverageMaturity: weightedMaturitySum,
      weightedAverageLife: weightedLifeSum,
      dailyLiquidityPercentage: dailyLiquidValue / totalPortfolioValue,
      weeklyLiquidityPercentage: weeklyLiquidValue / totalPortfolioValue,
      creditQualityScore,
      concentrationRisk,
      interestRateRisk,
      shadowNavDeviation: 0 // Will be calculated in shadow pricing
    }
  }

  /**
   * Calculates credit quality score based on holdings ratings
   */
  private calculateCreditQualityScore(holdings: MmfHolding[]): number {
    const ratingScores: Record<string, number> = {
      'A1': 100,
      'A2': 85,
      'A3': 70,
      'B1': 55,
      'B2': 40,
      'B3': 25
    }

    const totalValue = holdings.reduce((sum, holding) => sum + (holding.amortizedCost || 0), 0)
    let weightedScore = 0

    for (const holding of holdings) {
      const weight = (holding.amortizedCost || 0) / totalValue
      const score = ratingScores[holding.shortTermRating || 'A3'] || 50
      weightedScore += weight * score
    }

    return weightedScore
  }

  /**
   * Calculates concentration risk metrics
   */
  private calculateConcentrationRisk(holdings: MmfHolding[]): number {
    const issuerConcentration: Record<string, number> = {}
    const totalValue = holdings.reduce((sum, holding) => sum + (holding.amortizedCost || 0), 0)

    // Group by issuer (simplified - use security type as proxy)
    for (const holding of holdings) {
      const issuer = holding.securityType
      issuerConcentration[issuer] = (issuerConcentration[issuer] || 0) + (holding.amortizedCost || 0)
    }

    // Calculate maximum concentration percentage
    const maxConcentration = Math.max(...Object.values(issuerConcentration)) / totalValue
    return maxConcentration
  }

  /**
   * Performs SEC Rule 2a-7 compliance checks
   */
  private async performComplianceChecks(
    riskMetrics: MmfRiskMetrics,
    productDetails: any
  ): Promise<{
    allPassed: boolean,
    violations: string[],
    warnings: string[]
  }> {
    const violations: string[] = []
    const warnings: string[] = []

    // WAM check
    if (riskMetrics.weightedAverageMaturity > productDetails.maxWeightedAverageMaturity) {
      violations.push(
        `WAM exceeds limit: ${riskMetrics.weightedAverageMaturity} > ${productDetails.maxWeightedAverageMaturity} days`
      )
    }

    // WAL check
    if (riskMetrics.weightedAverageLife > productDetails.maxWeightedAverageLife) {
      violations.push(
        `WAL exceeds limit: ${riskMetrics.weightedAverageLife} > ${productDetails.maxWeightedAverageLife} days`
      )
    }

    // Daily liquidity check
    if (riskMetrics.dailyLiquidityPercentage < productDetails.dailyLiquidityMinimum) {
      violations.push(
        `Daily liquidity below minimum: ${(riskMetrics.dailyLiquidityPercentage * 100).toFixed(1)}% < ${(productDetails.dailyLiquidityMinimum * 100).toFixed(1)}%`
      )
    }

    // Weekly liquidity check
    if (riskMetrics.weeklyLiquidityPercentage < productDetails.weeklyLiquidityMinimum) {
      violations.push(
        `Weekly liquidity below minimum: ${(riskMetrics.weeklyLiquidityPercentage * 100).toFixed(1)}% < ${(productDetails.weeklyLiquidityMinimum * 100).toFixed(1)}%`
      )
    }

    // Concentration risk warning
    if (riskMetrics.concentrationRisk > 0.05) { // 5% threshold
      warnings.push(
        `High concentration risk: ${(riskMetrics.concentrationRisk * 100).toFixed(1)}% in single issuer`
      )
    }

    // Credit quality check
    if (riskMetrics.creditQualityScore < 70) {
      warnings.push(
        `Credit quality score below threshold: ${riskMetrics.creditQualityScore.toFixed(1)}`
      )
    }

    return {
      allPassed: violations.length === 0,
      violations,
      warnings
    }
  }

  /**
   * Calculates shadow NAV for stable NAV funds
   */
  private async calculateShadowNav(
    holdings: MmfHolding[],
    valuationDate: Date
  ): Promise<{
    shadowNavPerShare: number,
    deviationFromStableNav: number,
    deviationBasisPoints: number
  }> {
    // Calculate market value based NAV
    const totalMarketValue = holdings.reduce((sum, holding) => sum + (holding.marketValue || 0), 0)
    const totalShares = 1000000 // Mock shares outstanding
    
    const shadowNavPerShare = totalMarketValue / totalShares
    const deviationFromStableNav = shadowNavPerShare - MmfCalculator.STABLE_NAV_TARGET
    const deviationBasisPoints = deviationFromStableNav * 10000 // Convert to basis points

    return {
      shadowNavPerShare,
      deviationFromStableNav,
      deviationBasisPoints
    }
  }

  /**
   * Performs stress testing scenarios
   */
  private async performStressTests(
    holdings: MmfHolding[],
    portfolioValuation: any
  ): Promise<StressTestScenario[]> {
    const scenarios: StressTestScenario[] = [
      {
        name: 'Interest Rate Shock +100bp',
        interestRateShock: 100,
        creditSpreadShock: 0,
        liquidityStress: 0,
        expectedNavImpact: -0.002 // Approximate impact
      },
      {
        name: 'Credit Spread Shock +50bp',
        interestRateShock: 0,
        creditSpreadShock: 50,
        liquidityStress: 0,
        expectedNavImpact: -0.001
      },
      {
        name: 'Liquidity Stress 20%',
        interestRateShock: 0,
        creditSpreadShock: 0,
        liquidityStress: 0.20,
        expectedNavImpact: -0.0005
      }
    ]

    // In a real implementation, perform actual stress calculations
    return scenarios
  }

  /**
   * Calculates final NAV based on fund type and methodology
   */
  private async calculateFinalNav(
    portfolioValuation: any,
    productDetails: any,
    input: MmfCalculationInput,
    shadowNavResults: any
  ): Promise<{
    totalNavValue: Decimal,
    navPerShare: Decimal
  }> {
    const sharesOutstanding = this.decimal(input.sharesOutstanding || 1000000)
    
    if (productDetails.fundType === 'stable_nav') {
      // Stable NAV funds target $1.00 per share
      const totalNavValue = sharesOutstanding.mul(MmfCalculator.STABLE_NAV_TARGET)
      const navPerShare = this.decimal(MmfCalculator.STABLE_NAV_TARGET)
      
      return { totalNavValue, navPerShare }
    } else {
      // Variable NAV funds use market value
      const totalNavValue = portfolioValuation.totalMarketValue
      const navPerShare = totalNavValue.div(sharesOutstanding)
      
      return { totalNavValue, navPerShare }
    }
  }

  /**
   * Builds pricing sources map from holdings
   */
  private buildPricingSources(holdings: MmfHolding[]): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    for (const holding of holdings) {
      pricingSources[holding.instrumentKey] = {
        price: holding.marketValue || holding.amortizedCost || 0,
        currency: holding.currency,
        asOf: new Date(),
        source: 'amortized_cost_method'
      }
    }
    
    return pricingSources
  }

  /**
   * Validates MMF-specific input parameters
   */
  protected override validateInput(input: CalculationInput): { 
    isValid: boolean, 
    errors: string[], 
    warnings: string[], 
    severity: ValidationSeverity 
  } {
    const baseValidation = super.validateInput(input)
    const mmfInput = input as MmfCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate fund type
    if (mmfInput.fundType && !['stable_nav', 'variable_nav'].includes(mmfInput.fundType)) {
      errors.push('Fund type must be either stable_nav or variable_nav')
    }

    // Validate share class
    if (mmfInput.shareClass && !['institutional', 'retail'].includes(mmfInput.shareClass)) {
      errors.push('Share class must be either institutional or retail')
    }

    // Validate liquidity thresholds
    if (mmfInput.dailyLiquidityMinimum !== undefined && 
        (mmfInput.dailyLiquidityMinimum < 0 || mmfInput.dailyLiquidityMinimum > 1)) {
      errors.push('Daily liquidity minimum must be between 0 and 1 (0-100%)')
    }

    if (mmfInput.weeklyLiquidityMinimum !== undefined && 
        (mmfInput.weeklyLiquidityMinimum < 0 || mmfInput.weeklyLiquidityMinimum > 1)) {
      errors.push('Weekly liquidity minimum must be between 0 and 1 (0-100%)')
    }

    // Validate maturity limits
    if (mmfInput.maxWeightedAverageMaturity !== undefined && mmfInput.maxWeightedAverageMaturity <= 0) {
      errors.push('Maximum weighted average maturity must be positive')
    }

    // SEC Rule 2a-7 warnings
    if (mmfInput.shareClass === 'retail' && mmfInput.maxWeightedAverageMaturity && 
        mmfInput.maxWeightedAverageMaturity > 60) {
      warnings.push('Retail MMF WAM typically should not exceed 60 days per SEC Rule 2a-7')
    }

    if (mmfInput.shareClass === 'retail' && mmfInput.weeklyLiquidityMinimum && 
        mmfInput.weeklyLiquidityMinimum < 0.30) {
      warnings.push('Retail MMF weekly liquidity minimum should be at least 30% per SEC Rule 2a-7')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? ValidationSeverity.ERROR : 
                warnings.length > 0 ? ValidationSeverity.WARN : 
                ValidationSeverity.INFO
    }
  }

  /**
   * Generates a unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `mmf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
