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
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      productId: input.productId || 'SP_BARRIER_NOTE_001',
      productName: input.productName || 'Barrier Note on S&P 500',
      issuer: input.issuer || 'Goldman Sachs',
      underlyingAssets: input.underlyingAssets || ['SPX', 'AAPL', 'MSFT'],
      payoffStructure: input.payoffStructure || 'AUTOCALLABLE_BARRIER',
      barrierLevel: input.barrierLevel || 0.65,
      couponRate: input.couponRate || 0.08,
      strikePrice: input.strikePrice || 4500,
      protectionLevel: input.protectionLevel || 0.75,
      nominalAmount: input.nominalAmount || 1000000,
      riskIndicators: input.riskIndicators || 6,
      issueDate: input.issueDate || new Date('2024-01-01'),
      maturityDate: input.maturityDate || new Date('2026-01-01'),
      redemptionDate: input.redemptionDate,
      currency: 'USD',
      status: 'active',
      targetAudience: input.targetAudience || 'institutional',
      distributionStrategy: input.distributionStrategy || 'private_placement',
      riskRating: input.riskRating || 6,
      complexFeatures: input.complexFeatures || {
        hasBarrier: true,
        hasAutocall: true,
        hasPrincipalProtection: true,
        hasEarlyRedemption: false
      },
      eventHistory: input.eventHistory || {},
      monitoringTriggers: input.monitoringTriggers || {
        barrierBreach: false,
        autocallTriggered: false,
        principalAtRisk: false
      }
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
  protected override generateRunId(): string {
    return `structured_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
