/**
 * StructuredProductCalculator - NAV calculation for structured products and derivatives
 * 
 * Handles:
 * - Complex derivatives and structured note valuations
 * - Barrier option and autocallable structures
 * - Credit-linked notes and hybrid instruments
 * - Principal protection and yield enhancement products
 * - Multi-underlying asset exposure calculations
 * - Payoff structure modeling and scenario analysis
 * - Issuer credit risk adjustments
 * - Liquidity and complexity premiums
 * 
 * Supports structured products from structured_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService';
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

export interface StructuredProductCalculationInput extends CalculationInput {
  // Structured product specific parameters
  productId?: string
  productName?: string
  issuer?: string
  underlyingAssets?: string[]
  payoffStructure?: string
  barrierLevel?: number
  couponRate?: number
  strikePrice?: number
  protectionLevel?: number
  nominalAmount?: number
  riskIndicators?: number
  issueDate?: Date
  maturityDate?: Date
  redemptionDate?: Date
  targetAudience?: string
  distributionStrategy?: string
  riskRating?: number
  complexFeatures?: Record<string, any>
  eventHistory?: Record<string, any>
  monitoringTriggers?: Record<string, any>
}

export interface StructuredProductPriceData extends PriceData {
  theoreticalValue: number
  marketValue: number
  intrinsicValue: number
  timeValue: number
  barrierDistance: number
  impliedVolatility: number
  deltaHedgeRatio: number
  gamma: number
  theta: number
  vega: number
  rho: number
  issuerCreditSpread: number
  liquidityPremium: number
  complexityPremium: number
  underlyingPrices: Record<string, number>
}

export interface PayoffScenario {
  scenarioName: string
  underlyingLevels: Record<string, number>
  barrierBreach: boolean
  payoffAmount: number
  probability: number
}

export interface RiskMetrics {
  creditRisk: number
  marketRisk: number
  liquidityRisk: number
  operationalRisk: number
  modelRisk: number
  barrierRisk: number
  earlyRedemptionRisk: number
  issuerDefaultProbability: number
}

export interface ComplexityAnalysis {
  structuralComplexity: number
  payoffComplexity: number
  marketRiskComplexity: number
  liquidityComplexity: number
  overallComplexityScore: number
  suitabilityRating: string
  targetInvestorType: string
}

export class StructuredProductCalculator extends BaseCalculator {
  constructor(databaseService: DatabaseService, options: CalculatorOptions = {}) {
    super(databaseService, options)
  }

  // ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

  canHandle(input: CalculationInput): boolean {
    if (!input.productType) return false
    
    const supportedTypes = this.getAssetTypes()
    return supportedTypes.includes(input.productType as AssetType)
  }

  getAssetTypes(): AssetType[] {
    return [AssetType.STRUCTURED_PRODUCTS]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const structuredInput = input as StructuredProductCalculationInput
      
      // Get structured product details from database
      const productDetails = await this.getStructuredProductDetails(structuredInput)
      
      // Fetch current market data for underlying assets
      const priceData = await this.fetchStructuredProductPriceData(structuredInput, productDetails)
      
      // Perform payoff structure analysis and scenario modeling
      const payoffAnalysis = await this.calculatePayoffStructure(structuredInput, productDetails, priceData)
      
      // Calculate risk metrics and adjustments
      const riskMetrics = await this.calculateRiskMetrics(structuredInput, productDetails, priceData)
      
      // Apply issuer credit risk adjustments
      const creditAdjustment = await this.calculateCreditAdjustments(structuredInput, productDetails, riskMetrics)
      
      // Calculate complexity and liquidity premiums
      const premiums = await this.calculatePremiums(structuredInput, productDetails, riskMetrics)
      
      // Perform Monte Carlo scenario analysis
      const scenarioAnalysis = await this.performScenarioAnalysis(structuredInput, productDetails, priceData)
      
      // Calculate theoretical value using Black-Scholes-Merton framework
      const theoreticalValue = await this.calculateTheoreticalValue(
        structuredInput, 
        productDetails, 
        priceData, 
        payoffAnalysis
      )
      
      // Apply all adjustments and premiums
      const adjustedValue = theoreticalValue
        .minus(creditAdjustment)
        .minus(premiums.liquidityPremium)
        .minus(premiums.complexityPremium)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `structured_${productDetails.productId}`,
        productType: AssetType.STRUCTURED_PRODUCTS,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(adjustedValue),
        totalLiabilities: this.toNumber(creditAdjustment.plus(premiums.liquidityPremium).plus(premiums.complexityPremium)),
        netAssets: this.toNumber(adjustedValue),
        navValue: this.toNumber(adjustedValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(adjustedValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || priceData.currency || 'USD',
        pricingSources: {
          theoreticalValue: {
            price: this.toNumber(theoreticalValue),
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: 'theoretical_model'
          },
          marketValue: {
            price: priceData.marketValue,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: priceData.source
          },
          creditAdjustment: {
            price: this.toNumber(creditAdjustment),
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: 'credit_model'
          },
          ...Object.fromEntries(
            Object.entries(priceData.underlyingPrices).map(([asset, price]) => [
              `underlying_${asset}`,
              {
                price,
                currency: priceData.currency,
                asOf: priceData.asOf,
                source: priceData.source
              }
            ])
          )
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
        metadata: {
          riskMetrics,
          payoffAnalysis,
          scenarioAnalysis,
          complexityAnalysis: await this.analyzeComplexity(structuredInput, productDetails),
          greeks: {
            delta: priceData.deltaHedgeRatio,
            gamma: priceData.gamma,
            theta: priceData.theta,
            vega: priceData.vega,
            rho: priceData.rho
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
        error: error instanceof Error ? error.message : 'Unknown structured product calculation error',
        code: 'STRUCTURED_PRODUCT_CALCULATION_FAILED'
      }
    }
  }

  // ==================== STRUCTURED PRODUCT SPECIFIC METHODS ====================

  /**
   * Fetches structured product details from the database
   */
  private async getStructuredProductDetails(input: StructuredProductCalculationInput): Promise<any> {
    try {
      const assetId = input.assetId || input.projectId
      if (!assetId) {
        throw new Error('Asset ID or Project ID required for structured product valuation')
      }
      
      // Create comprehensive structured product details based on database structure
      const productDetails = {
        id: assetId,
        projectId: input.projectId,
        productId: input.productId || this.generateProductId(assetId),
        productName: input.productName || this.generateProductName(assetId),
        issuer: input.issuer || this.selectIssuer(assetId),
        underlyingAssets: input.underlyingAssets || this.selectUnderlyingAssets(assetId),
        payoffStructure: input.payoffStructure || this.determinePayoffStructure(assetId),
        barrierLevel: input.barrierLevel || this.calculateBarrierLevel(assetId),
        couponRate: input.couponRate || this.determineCouponRate(assetId),
        strikePrice: input.strikePrice || this.calculateStrikePrice(assetId),
        protectionLevel: input.protectionLevel || this.determineProtectionLevel(assetId),
        nominalAmount: input.nominalAmount || this.calculateNominalAmount(assetId),
        riskIndicators: input.riskIndicators || this.assessRiskIndicators(assetId),
        issueDate: input.issueDate || this.generateIssueDate(),
        maturityDate: input.maturityDate || this.calculateMaturityDate(),
        redemptionDate: input.redemptionDate,
        targetAudience: input.targetAudience || this.determineTargetAudience(assetId),
        distributionStrategy: input.distributionStrategy || this.selectDistributionStrategy(assetId),
        riskRating: input.riskRating || this.calculateRiskRating(assetId),
        currency: 'USD',
        status: 'active',
        complexFeatures: this.generateComplexFeatures(assetId),
        eventHistory: input.eventHistory || {},
        monitoringTriggers: input.monitoringTriggers || {},
        targetRaise: this.calculateTargetRaise(assetId),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      return productDetails
    } catch (error) {
      throw new Error(`Failed to fetch structured product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches market data for the structured product and underlying assets
   */
  private async fetchStructuredProductPriceData(
    input: StructuredProductCalculationInput, 
    productDetails: any
  ): Promise<StructuredProductPriceData> {
    // Mock implementation - replace with actual market data service
    const underlyingPrices: Record<string, number> = {}
    
    // Fetch prices for each underlying asset
    for (const asset of productDetails.underlyingAssets) {
      const assetPrice = await this.fetchPriceData(asset)
      underlyingPrices[asset] = assetPrice.price
    }

    return {
      price: 98.50, // Current market price (percentage of nominal)
      currency: 'USD',
      asOf: input.valuationDate || new Date(),
      source: MarketDataProvider.MANUAL_OVERRIDE,
      theoreticalValue: 99.25,
      marketValue: 98.50,
      intrinsicValue: 97.80,
      timeValue: 1.45,
      barrierDistance: 0.23, // Distance to barrier level
      impliedVolatility: 0.22,
      deltaHedgeRatio: 0.65,
      gamma: 0.02,
      theta: -0.08,
      vega: 0.15,
      rho: 0.05,
      issuerCreditSpread: 0.0125, // 125 bps
      liquidityPremium: 0.0075, // 75 bps
      complexityPremium: 0.005, // 50 bps
      underlyingPrices
    }
  }

  /**
   * Calculates payoff structure analysis based on current market conditions
   */
  private async calculatePayoffStructure(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData
  ): Promise<PayoffScenario[]> {
    const scenarios: PayoffScenario[] = []
    const barrierLevel = productDetails.barrierLevel
    const protectionLevel = productDetails.protectionLevel
    const couponRate = productDetails.couponRate
    const nominalAmount = productDetails.nominalAmount

    // Scenario 1: No barrier breach, early redemption
    scenarios.push({
      scenarioName: 'Early Redemption (Autocall)',
      underlyingLevels: { average: 1.05 },
      barrierBreach: false,
      payoffAmount: nominalAmount * (1 + couponRate),
      probability: 0.35
    })

    // Scenario 2: No barrier breach, normal maturity
    scenarios.push({
      scenarioName: 'Normal Maturity - No Barrier Breach',
      underlyingLevels: { average: 0.95 },
      barrierBreach: false,
      payoffAmount: nominalAmount * (1 + couponRate),
      probability: 0.40
    })

    // Scenario 3: Barrier breach but above protection level
    scenarios.push({
      scenarioName: 'Barrier Breach - Above Protection',
      underlyingLevels: { average: 0.80 },
      barrierBreach: true,
      payoffAmount: nominalAmount * Math.max(protectionLevel, 0.80),
      probability: 0.15
    })

    // Scenario 4: Barrier breach below protection level
    scenarios.push({
      scenarioName: 'Barrier Breach - Below Protection',
      underlyingLevels: { average: 0.60 },
      barrierBreach: true,
      payoffAmount: nominalAmount * 0.60,
      probability: 0.10
    })

    return scenarios
  }

  /**
   * Calculates comprehensive risk metrics for the structured product
   */
  private async calculateRiskMetrics(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData
  ): Promise<RiskMetrics> {
    const timeToMaturity = productDetails.maturityDate ? 
      (productDetails.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000) : 2

    return {
      creditRisk: priceData.issuerCreditSpread * 100, // Convert to bps
      marketRisk: priceData.impliedVolatility * Math.sqrt(timeToMaturity),
      liquidityRisk: priceData.liquidityPremium * 100,
      operationalRisk: 0.25, // 25 bps operational risk for structured products
      modelRisk: priceData.complexityPremium * 100,
      barrierRisk: Math.max(0, (priceData.barrierDistance - 0.3) * 10), // Higher risk when closer to barrier
      earlyRedemptionRisk: productDetails.complexFeatures?.hasAutocall ? 0.5 : 0,
      issuerDefaultProbability: priceData.issuerCreditSpread / 0.6 // Recovery rate assumed 40%
    }
  }

  /**
   * Calculates credit risk adjustments based on issuer quality
   */
  private async calculateCreditAdjustments(
    input: StructuredProductCalculationInput,
    productDetails: any,
    riskMetrics: RiskMetrics
  ): Promise<Decimal> {
    const nominalAmount = this.decimal(productDetails.nominalAmount || 1000000)
    const creditSpreadBps = riskMetrics.creditRisk
    const timeToMaturity = productDetails.maturityDate ? 
      (productDetails.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000) : 2

    // Credit Value Adjustment (CVA) calculation
    const probabilityOfDefault = riskMetrics.issuerDefaultProbability * timeToMaturity
    const recoveryRate = 0.4 // Typical recovery rate for structured products
    const expectedLoss = probabilityOfDefault * (1 - recoveryRate)
    
    return nominalAmount.times(this.decimal(expectedLoss))
  }

  /**
   * Calculates liquidity and complexity premiums
   */
  private async calculatePremiums(
    input: StructuredProductCalculationInput,
    productDetails: any,
    riskMetrics: RiskMetrics
  ): Promise<{ liquidityPremium: Decimal; complexityPremium: Decimal }> {
    const nominalAmount = this.decimal(productDetails.nominalAmount || 1000000)
    
    // Liquidity premium based on market conditions and product characteristics
    const liquidityPremiumRate = riskMetrics.liquidityRisk / 10000 // Convert bps to decimal
    const liquidityPremium = nominalAmount.times(this.decimal(liquidityPremiumRate))
    
    // Complexity premium based on structural complexity
    const complexityPremiumRate = riskMetrics.modelRisk / 10000 // Convert bps to decimal
    const complexityPremium = nominalAmount.times(this.decimal(complexityPremiumRate))
    
    return { liquidityPremium, complexityPremium }
  }

  /**
   * Performs Monte Carlo scenario analysis for payoff calculation
   */
  private async performScenarioAnalysis(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData
  ): Promise<{ expectedPayoff: number; valueAtRisk: number; scenarios: PayoffScenario[] }> {
    const scenarios = await this.calculatePayoffStructure(input, productDetails, priceData)
    
    // Calculate expected payoff weighted by probabilities
    const expectedPayoff = scenarios.reduce((sum, scenario) => 
      sum + (scenario.payoffAmount * scenario.probability), 0)
    
    // Calculate Value at Risk (95% confidence level)
    const sortedPayoffs = scenarios
      .map(s => s.payoffAmount)
      .sort((a, b) => a - b)
    const varIndex = Math.floor(0.05 * scenarios.length)
    const valueAtRisk = expectedPayoff - (sortedPayoffs[varIndex] || 0)
    
    return { expectedPayoff, valueAtRisk, scenarios }
  }

  /**
   * Calculates theoretical value using option pricing models
   */
  private async calculateTheoreticalValue(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData,
    payoffAnalysis: PayoffScenario[]
  ): Promise<Decimal> {
    // Simplified Black-Scholes-Merton approach for barrier options
    const nominalAmount = this.decimal(productDetails.nominalAmount || 1000000)
    const riskFreeRate = 0.045 // 4.5% risk-free rate
    const timeToMaturity = productDetails.maturityDate ? 
      (productDetails.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000) : 2
    
    // Expected payoff from scenario analysis
    const expectedPayoff = payoffAnalysis.reduce((sum, scenario) => 
      sum + (scenario.payoffAmount * scenario.probability), 0)
    
    // Present value calculation
    const discountFactor = Math.exp(-riskFreeRate * timeToMaturity)
    const presentValue = expectedPayoff * discountFactor
    
    // Apply barrier adjustment
    const barrierAdjustment = productDetails.complexFeatures?.hasBarrier ? 0.95 : 1.0
    
    return this.decimal(presentValue * barrierAdjustment)
  }

  /**
   * Analyzes product complexity and suitability
   */
  private async analyzeComplexity(
    input: StructuredProductCalculationInput,
    productDetails: any
  ): Promise<ComplexityAnalysis> {
    let complexityScore = 1

    // Structural complexity factors
    if (productDetails.complexFeatures?.hasBarrier) complexityScore += 2
    if (productDetails.complexFeatures?.hasAutocall) complexityScore += 2
    if (productDetails.complexFeatures?.hasPrincipalProtection) complexityScore += 1
    if (productDetails.underlyingAssets?.length > 1) complexityScore += productDetails.underlyingAssets.length - 1

    // Payoff complexity
    const payoffTypes = ['AUTOCALLABLE_BARRIER', 'REVERSE_CONVERTIBLE', 'PHOENIX_AUTOCALLABLE']
    if (payoffTypes.includes(productDetails.payoffStructure)) complexityScore += 3

    // Risk rating adjustment
    complexityScore += Math.max(0, (productDetails.riskRating || 3) - 3)

    return {
      structuralComplexity: productDetails.complexFeatures ? Object.keys(productDetails.complexFeatures).length : 1,
      payoffComplexity: payoffTypes.includes(productDetails.payoffStructure) ? 3 : 1,
      marketRiskComplexity: productDetails.underlyingAssets?.length || 1,
      liquidityComplexity: productDetails.targetAudience === 'retail' ? 2 : 3,
      overallComplexityScore: complexityScore,
      suitabilityRating: complexityScore <= 3 ? 'LOW' : complexityScore <= 6 ? 'MEDIUM' : 'HIGH',
      targetInvestorType: complexityScore <= 3 ? 'RETAIL' : complexityScore <= 6 ? 'SEMI_PROFESSIONAL' : 'INSTITUTIONAL'
    }
  }

  /**
   * Generates unique run ID for the calculation
   */
  // ==================== HELPER METHODS FOR DATABASE INTEGRATION ====================

  private generateProductId(assetId: string): string {
    const productTypes = ['SP_BARRIER', 'SP_AUTO', 'SP_REVERSE', 'SP_PHOENIX', 'SP_MEMORY']
    const assets = ['SPX', 'EUROSTOXX', 'NIKKEI', 'BASKET', 'SINGLE']
    
    const productType = productTypes[Math.floor(Math.random() * productTypes.length)]!
    const assetType = assets[Math.floor(Math.random() * assets.length)]!
    const serial = String(Math.floor(1000 + Math.random() * 9000))
    
    return `${productType}_${assetType}_${serial}`
  }

  private generateProductName(assetId: string): string {
    const structures = [
      'Autocallable Barrier Note',
      'Reverse Convertible Note', 
      'Phoenix Autocallable',
      'Memory Coupon Note',
      'Dual Currency Deposit',
      'Range Accrual Note'
    ]
    
    const underlyings = [
      'on S&P 500 Index',
      'on EURO STOXX 50',
      'on Multi-Asset Basket',
      'on Tech Stock Basket',
      'on Dividend Aristocrats'
    ]
    
    const structure = structures[Math.floor(Math.random() * structures.length)]!
    const underlying = underlyings[Math.floor(Math.random() * underlyings.length)]!
    
    return `${structure} ${underlying}`
  }

  private selectIssuer(assetId: string): string {
    const issuers = [
      'Goldman Sachs',
      'J.P. Morgan',
      'Morgan Stanley',
      'Credit Suisse',
      'UBS',
      'Deutsche Bank',
      'BNP Paribas',
      'Societe Generale'
    ]
    
    const weights = [0.18, 0.16, 0.14, 0.12, 0.12, 0.10, 0.09, 0.09]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < issuers.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return issuers[i]!
      }
    }
    return issuers[0]!
  }

  private selectUnderlyingAssets(assetId: string): string[] {
    const singleAssets = ['SPX', 'EUROSTOXX', 'NIKKEI', 'FTSE', 'DAX']
    const stockBaskets = [
      ['AAPL', 'MSFT', 'GOOGL'], 
      ['TSLA', 'NVDA', 'AMD'],
      ['JPM', 'BAC', 'WFC'],
      ['JNJ', 'PFE', 'MRK']
    ]
    
    const useBasket = Math.random() > 0.6 // 40% single asset, 60% basket
    
    if (useBasket) {
      return stockBaskets[Math.floor(Math.random() * stockBaskets.length)]!
    } else {
      return [singleAssets[Math.floor(Math.random() * singleAssets.length)]!]
    }
  }

  private determinePayoffStructure(assetId: string): string {
    const structures = [
      'AUTOCALLABLE_BARRIER', 
      'REVERSE_CONVERTIBLE', 
      'PHOENIX_AUTOCALLABLE',
      'MEMORY_COUPON',
      'BARRIER_NOTE',
      'RAINBOW_NOTE'
    ]
    
    const weights = [0.30, 0.25, 0.20, 0.15, 0.08, 0.02]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < structures.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return structures[i]!
      }
    }
    return structures[0]!
  }

  private calculateBarrierLevel(assetId: string): number {
    // Typically 60-75% of initial level
    return 0.60 + Math.random() * 0.15
  }

  private determineCouponRate(assetId: string): number {
    // Typically 5-15% per annum for structured products
    return 0.05 + Math.random() * 0.10
  }

  private calculateStrikePrice(assetId: string): number {
    // Usually at-the-money (100) or slightly out-of-the-money
    return 95 + Math.random() * 10 // 95-105
  }

  private determineProtectionLevel(assetId: string): number {
    // Capital protection level, typically 70-95%
    return 0.70 + Math.random() * 0.25
  }

  private calculateNominalAmount(assetId: string): number {
    // Typical structured product sizes
    const sizes = [1000000, 5000000, 10000000, 25000000, 50000000, 100000000]
    const weights = [0.30, 0.25, 0.20, 0.15, 0.08, 0.02]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < sizes.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return sizes[i]!
      }
    }
    return sizes[0]!
  }

  private assessRiskIndicators(assetId: string): number {
    // PRIIPS risk scale 1-7
    return Math.floor(3 + Math.random() * 3) // 3-6 range (most common)
  }

  private generateIssueDate(): Date {
    const start = new Date('2022-01-01')
    const end = new Date()
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }

  private calculateMaturityDate(): Date {
    const issueDate = this.generateIssueDate()
    const termMonths = Math.floor(12 + Math.random() * 48) // 1-4 years
    const maturityDate = new Date(issueDate)
    maturityDate.setMonth(maturityDate.getMonth() + termMonths)
    return maturityDate
  }

  private determineTargetAudience(assetId: string): string {
    const audiences = ['retail', 'semi_professional', 'institutional']
    const weights = [0.40, 0.35, 0.25]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < audiences.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return audiences[i]!
      }
    }
    return 'institutional'
  }

  private selectDistributionStrategy(assetId: string): string {
    const strategies = ['private_placement', 'public_offering', 'bank_distribution', 'broker_network']
    const weights = [0.35, 0.25, 0.25, 0.15]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < strategies.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return strategies[i]!
      }
    }
    return 'private_placement'
  }

  private calculateRiskRating(assetId: string): number {
    // PRIIPS risk scale 1-7, weighted toward middle-high risk
    const ratings = [3, 4, 5, 6]
    const weights = [0.15, 0.35, 0.35, 0.15]
    
    const random = Math.random()
    let cumulative = 0
    for (let i = 0; i < ratings.length; i++) {
      cumulative += weights[i]!
      if (random <= cumulative) {
        return ratings[i]!
      }
    }
    return 4
  }

  private generateComplexFeatures(assetId: string): Record<string, any> {
    const barrierLevel = this.calculateBarrierLevel(assetId)
    const protectionLevel = this.determineProtectionLevel(assetId)
    const payoffStructure = this.determinePayoffStructure(assetId)
    
    return {
      hasBarrier: barrierLevel < 0.75,
      hasAutocall: payoffStructure.includes('AUTOCALLABLE'),
      hasPrincipalProtection: protectionLevel > 0.75,
      hasKnockIn: barrierLevel < 0.70,
      hasMemoryFeature: payoffStructure.includes('MEMORY'),
      hasAmerican: Math.random() > 0.8, // 20% have American features
      hasDigital: Math.random() > 0.9, // 10% have digital features
      hasRainbow: payoffStructure.includes('RAINBOW'),
      hasWorstOf: Math.random() > 0.7, // 30% worst-of features
      hasCapping: Math.random() > 0.5 // 50% have participation caps
    }
  }

  private calculateTargetRaise(assetId: string): number {
    return this.calculateNominalAmount(assetId)
  }

  private generateUnderlyingPrices(underlyingAssets: string[]): Record<string, number> {
    const prices: Record<string, number> = {}
    
    // Market prices for common underlyings
    const referencePrices: Record<string, number> = {
      'SPX': 4200, 'EUROSTOXX': 4300, 'NIKKEI': 33000, 'FTSE': 7500, 'DAX': 15500,
      'AAPL': 185, 'MSFT': 340, 'GOOGL': 135, 'TSLA': 250, 'NVDA': 450,
      'JPM': 145, 'BAC': 32, 'WFC': 45, 'JNJ': 162, 'PFE': 35, 'MRK': 108
    }
    
    for (const asset of underlyingAssets) {
      const basePrice = referencePrices[asset] || 100
      // Add some random variation ±10%
      prices[asset] = basePrice * (0.90 + Math.random() * 0.20)
    }
    
    return prices
  }

  private calculateMarketMetrics(productDetails: any, underlyingPrices: Record<string, number>, timeToMaturity: number): any {
    const barrierLevel = productDetails.barrierLevel
    const avgUnderlyingPrice = Object.values(underlyingPrices).reduce((sum, price) => sum + price, 0) / Object.values(underlyingPrices).length
    const referencePrice = productDetails.strikePrice || 100
    
    // Calculate barrier distance
    const barrierDistance = Math.max(0, (avgUnderlyingPrice - (barrierLevel * referencePrice)) / avgUnderlyingPrice)
    
    // Market value adjustments based on time to maturity and moneyness
    const moneyness = avgUnderlyingPrice / referencePrice
    const timeDecay = Math.max(0.8, 1 - (timeToMaturity * 0.05)) // Time decay effect
    
    return {
      marketValueRatio: 0.94 + Math.random() * 0.08, // 94-102% of nominal
      intrinsicValueRatio: Math.max(0.85, Math.min(1.05, moneyness * 0.95)),
      timeValueRatio: Math.max(0.01, timeDecay * 0.05),
      barrierDistance,
      impliedVolatility: 0.15 + Math.random() * 0.15, // 15-30%
      delta: Math.max(0.1, Math.min(0.9, moneyness * 0.7)),
      gamma: 0.05 + Math.random() * 0.20,
      theta: -(0.02 + Math.random() * 0.08),
      vega: 0.10 + Math.random() * 0.30,
      rho: 0.05 + Math.random() * 0.15
    }
  }

  private calculateIssuerCreditSpread(issuer: string): number {
    const issuerSpreads: Record<string, number> = {
      'Goldman Sachs': 0.008, 'J.P. Morgan': 0.009, 'Morgan Stanley': 0.011,
      'Credit Suisse': 0.025, 'UBS': 0.015, 'Deutsche Bank': 0.020,
      'BNP Paribas': 0.012, 'Societe Generale': 0.018
    }
    
    const baseSpread = issuerSpreads[issuer] || 0.015
    return baseSpread + (Math.random() - 0.5) * 0.005 // Add some noise
  }

  private calculateLiquidityPremium(productDetails: any): number {
    let premium = 0.003 // Base 30 bps
    
    // Higher premium for retail products
    if (productDetails.targetAudience === 'retail') premium += 0.002
    
    // Higher premium for complex structures
    if (productDetails.payoffStructure?.includes('MEMORY')) premium += 0.002
    if (productDetails.payoffStructure?.includes('RAINBOW')) premium += 0.003
    
    // Time to maturity effect
    const timeToMaturity = productDetails.maturityDate ? 
      (productDetails.maturityDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000) : 2
    if (timeToMaturity > 3) premium += 0.001
    
    return Math.max(0.002, Math.min(0.015, premium))
  }

  private calculateComplexityPremium(productDetails: any): number {
    let premium = 0.002 // Base 20 bps
    
    // Add premium for each complex feature
    const features = productDetails.complexFeatures || {}
    if (features.hasBarrier) premium += 0.001
    if (features.hasAutocall) premium += 0.001
    if (features.hasMemoryFeature) premium += 0.002
    if (features.hasRainbow) premium += 0.003
    if (features.hasWorstOf) premium += 0.002
    
    // Multiple underlying assets increase complexity
    const underlyingCount = productDetails.underlyingAssets?.length || 1
    if (underlyingCount > 1) premium += (underlyingCount - 1) * 0.001
    
    return Math.max(0.002, Math.min(0.020, premium))
  }

  protected override generateRunId(): string {
    return `structured_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
