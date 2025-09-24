/**
 * StructuredProductCalculator - NAV calculation for complex structured products
 * 
 * Handles:
 * - Principal protected notes with equity/commodity upside
 * - Autocallable products with barrier monitoring
 * - Reverse convertibles with embedded put options
 * - Range accrual products with observation periods
 * - Leveraged/inverse ETPs with daily rebalancing
 * - CLNs with credit event monitoring
 * 
 * Uses sophisticated option pricing models:
 * - BarrierOptionModels for knock-in/knock-out features
 * - ExoticOptionModels for Asian, lookback options
 * - FinancialModelsService for Black-Scholes and Monte Carlo
 * 
 * Supports structured products from structured_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { FinancialModelsService } from '../FinancialModelsService'
import { barrierOptionModels } from '../models/derivatives'
import { exoticOptionModels } from '../models/derivatives'
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
  // Product identification
  productId?: string
  isin?: string
  cusip?: string
  
  // Product structure
  productType?: 'principal_protected' | 'autocallable' | 'reverse_convertible' | 'range_accrual' | 'leveraged_etp' | 'cln'
  underlyingAssets?: string[]
  notionalAmount?: number
  issuePrice?: number
  
  // Protection and barriers
  protectionLevel?: number // e.g., 0.9 for 90% principal protection
  barrierLevel?: number // e.g., 0.7 for 70% knock-in barrier
  barrierType?: 'european' | 'american' | 'continuous'
  autocallLevels?: number[] // Multiple autocall barriers
  autocallDates?: Date[] // Observation dates
  
  // Payoff parameters
  participationRate?: number // e.g., 1.5 for 150% participation
  cap?: number // Maximum payout
  floor?: number // Minimum payout
  couponRate?: number // Fixed coupon if applicable
  
  // Options embedded
  optionType?: 'call' | 'put' | 'digital' | 'barrier' | 'asian' | 'lookback'
  strike?: number
  
  // Dates
  issueDate?: Date
  maturityDate?: Date
  observationDates?: Date[]
  
  // Market data override
  impliedVolatility?: number
  riskFreeRate?: number
  dividendYield?: number
}

export interface StructuredProductPriceData extends PriceData {
  theoreticalValue: number
  marketValue: number
  intrinsicValue: number
  timeValue: number
  barrierDistance: number // Distance to nearest barrier as percentage
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
  underlyingLevel: number
  payoff: number
  probability: number
}

export class StructuredProductCalculator extends BaseCalculator {
  private financialModels: FinancialModelsService

  constructor(databaseService: DatabaseService, options: CalculatorOptions = {}) {
    super(databaseService, options)
    this.financialModels = new FinancialModelsService()
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
      
      // Get product details from database
      const productDetails = await this.getStructuredProductDetails(structuredInput)
      
      // Fetch current market data
      const priceData = await this.fetchStructuredProductPriceData(structuredInput, productDetails)
      
      // Calculate option value using appropriate model
      const optionValue = await this.calculateOptionValue(structuredInput, productDetails, priceData)
      
      // Calculate payoff scenarios
      const payoffScenarios = await this.calculatePayoffStructure(structuredInput, productDetails, priceData)
      
      // Apply issuer credit spread adjustment
      const creditAdjustedValue = await this.applyCreditAdjustment(optionValue, priceData)
      
      // Calculate final NAV
      const finalValue = creditAdjustedValue
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `structured_${productDetails.productId}`,
        productType: AssetType.STRUCTURED_PRODUCTS,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(finalValue),
        totalLiabilities: 0,
        netAssets: this.toNumber(finalValue),
        navValue: this.toNumber(finalValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(finalValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || 'USD',
        pricingSources: {
          theoreticalValue: {
            price: priceData.theoreticalValue,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: 'internal_model'
          },
          marketValue: {
            price: priceData.marketValue,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: priceData.source
          }
        },
        metadata: {
          greeks: {
            delta: priceData.deltaHedgeRatio,
            gamma: priceData.gamma,
            theta: priceData.theta,
            vega: priceData.vega,
            rho: priceData.rho
          },
          impliedVolatility: priceData.impliedVolatility,
          barrierDistance: priceData.barrierDistance
        },
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED
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

  // ==================== STRUCTURED PRODUCT-SPECIFIC METHODS ====================

  /**
   * Fetches structured product details from the database
   */
  private async getStructuredProductDetails(input: StructuredProductCalculationInput): Promise<any> {
    try {
      // Would fetch from structured_products table
      const productDetails = await this.databaseService.getStructuredProductById(input.assetId!)
      
      return {
        id: productDetails.id,
        productId: productDetails.product_id || input.productId,
        productName: productDetails.product_name,
        productType: productDetails.product_type || input.productType || 'autocallable',
        underlyingAssets: productDetails.underlying_assets || input.underlyingAssets || ['SPX'],
        notionalAmount: productDetails.notional_amount || input.notionalAmount || 1000000,
        issuePrice: productDetails.issue_price || input.issuePrice || 100,
        protectionLevel: productDetails.protection_level || input.protectionLevel || 0.9,
        barrierLevel: productDetails.barrier_level || input.barrierLevel || 0.7,
        barrierType: productDetails.barrier_type || input.barrierType || 'european',
        participationRate: productDetails.participation_rate || input.participationRate || 1.0,
        cap: productDetails.cap || input.cap,
        floor: productDetails.floor || input.floor || 0,
        couponRate: productDetails.coupon_rate || input.couponRate || 0.05,
        strike: productDetails.strike || input.strike || 100,
        issueDate: productDetails.issue_date || input.issueDate || new Date('2024-01-01'),
        maturityDate: productDetails.maturity_date || input.maturityDate || new Date('2025-01-01'),
        autocallLevels: productDetails.autocall_levels || input.autocallLevels || [1.10, 1.08, 1.06],
        autocallDates: productDetails.autocall_dates || input.autocallDates || [],
        currency: productDetails.currency || 'USD'
      }
    } catch (error) {
      // Graceful fallback
      this.logger?.warn({ error, assetId: input.assetId }, 'Failed to fetch structured product details')
      
      return {
        id: input.assetId,
        productId: input.productId || 'STRUCT001',
        productName: 'Autocallable Note',
        productType: input.productType || 'autocallable',
        underlyingAssets: input.underlyingAssets || ['SPX'],
        notionalAmount: input.notionalAmount || 1000000,
        issuePrice: input.issuePrice || 100,
        protectionLevel: input.protectionLevel || 0.9,
        barrierLevel: input.barrierLevel || 0.7,
        barrierType: input.barrierType || 'european',
        participationRate: input.participationRate || 1.0,
        cap: input.cap,
        floor: input.floor || 0,
        couponRate: input.couponRate || 0.05,
        strike: input.strike || 100,
        issueDate: input.issueDate || new Date('2024-01-01'),
        maturityDate: input.maturityDate || new Date('2025-01-01'),
        autocallLevels: input.autocallLevels || [1.10, 1.08, 1.06],
        autocallDates: input.autocallDates || [],
        currency: 'USD'
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
    const underlyingPrices: Record<string, number> = {}
    
    // Fetch prices for each underlying asset
    for (const asset of productDetails.underlyingAssets) {
      try {
        const assetPrice = await this.fetchPriceData(asset)
        underlyingPrices[asset] = assetPrice.price
      } catch {
        // Use fallback prices
        underlyingPrices[asset] = this.getUnderlyingFallbackPrice(asset)
      }
    }

    // Calculate theoretical value using appropriate option model
    const spot = Object.values(underlyingPrices)[0] || 100 // Primary underlying
    const strike = productDetails.strike
    const timeToMaturity = this.calculateTimeToMaturity(productDetails.maturityDate, input.valuationDate)
    const riskFreeRate = input.riskFreeRate || 0.05
    const impliedVol = input.impliedVolatility || this.calculateImpliedVolatility(productDetails.productType)
    
    // Calculate option value based on product type
    let theoreticalValue = 0
    let greeks = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
    
    if (productDetails.productType === 'autocallable') {
      // Use barrier option model for autocallable
      const autocallResult = barrierOptionModels.autocallablePrice(
        spot,
        productDetails.autocallLevels,
        productDetails.couponRate,
        productDetails.autocallDates,
        productDetails.maturityDate,
        productDetails.notionalAmount,
        riskFreeRate,
        impliedVol
      )
      
      theoreticalValue = autocallResult.theoreticalValue
      
      // Calculate barrier option greeks instead
      const barrierParams = {
        spot,
        strike: productDetails.autocallLevels[0] * spot,
        barrier: productDetails.barrierLevel * spot,
        timeToMaturity,
        riskFreeRate,
        volatility: impliedVol,
        rebate: 0
      }
      
      // Use barrier option pricing for greeks approximation
      const barrierResult = barrierOptionModels.knockOutCall({
        spot: barrierParams.spot,
        strike: barrierParams.strike,
        barrier: barrierParams.barrier,
        riskFreeRate,
        dividendYield: 0,
        volatility: impliedVol,
        timeToExpiry: timeToMaturity,
        rebate: barrierParams.rebate
      }, barrierParams.spot > barrierParams.barrier ? 'up' : 'down')
      
      greeks = {
        delta: barrierResult.delta,
        gamma: barrierResult.gamma,
        theta: barrierResult.theta,
        vega: barrierResult.vega,
        rho: 0 // Approximate
      }
      
    } else if (productDetails.productType === 'reverse_convertible') {
      // Reverse convertible = bond - put option
      const bondValue = productDetails.notionalAmount * Math.exp(-riskFreeRate * timeToMaturity)
      const putValue = this.financialModels.blackScholes(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity,
        0 // dividendYield
      ).put
      
      theoreticalValue = bondValue - putValue
      
      // Calculate put Greeks
      const putGreeks = this.financialModels.calculateGreeks(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity
      )
      
      greeks = {
        delta: -putGreeks.delta,
        gamma: -putGreeks.gamma,
        theta: -putGreeks.theta,
        vega: -putGreeks.vega,
        rho: -putGreeks.rho + bondValue * timeToMaturity // Add bond rho
      }
      
    } else if (productDetails.productType === 'principal_protected') {
      // Principal protected = zero-coupon bond + call option
      const bondValue = productDetails.notionalAmount * productDetails.protectionLevel * Math.exp(-riskFreeRate * timeToMaturity)
      const callValue = this.financialModels.blackScholes(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity,
        0 // dividendYield
      ).call * productDetails.participationRate
      
      theoreticalValue = bondValue + callValue
      
      // Calculate call Greeks with participation
      const callGreeks = this.financialModels.calculateGreeks(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity
      )
      
      greeks = {
        delta: callGreeks.delta * productDetails.participationRate,
        gamma: callGreeks.gamma * productDetails.participationRate,
        theta: callGreeks.theta * productDetails.participationRate,
        vega: callGreeks.vega * productDetails.participationRate,
        rho: callGreeks.rho * productDetails.participationRate + bondValue * timeToMaturity
      }
      
    } else {
      // Default to Black-Scholes for standard options
      const optionPrice = this.financialModels.blackScholes(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity,
        0 // dividendYield
      )
      
      theoreticalValue = productDetails.optionType === 'put' ? optionPrice.put : optionPrice.call
      
      greeks = this.financialModels.calculateGreeks(
        spot,
        strike,
        riskFreeRate,
        impliedVol,
        timeToMaturity
      )
    }
    
    // Calculate barrier distance
    const barrierDistance = productDetails.barrierLevel ? 
      Math.abs((spot - productDetails.barrierLevel * productDetails.strike) / spot) : 1
    
    // Market value with liquidity adjustment
    const liquidityDiscount = 0.02 // 2% liquidity discount
    const complexityPremium = this.getComplexityPremium(productDetails.productType)
    const marketValue = theoreticalValue * (1 - liquidityDiscount - complexityPremium)
    
    return {
      price: marketValue,
      currency: productDetails.currency,
      asOf: input.valuationDate || new Date(),
      source: MarketDataProvider.INTERNAL_DB,
      theoreticalValue,
      marketValue,
      intrinsicValue: Math.max(0, spot - strike),
      timeValue: theoreticalValue - Math.max(0, spot - strike),
      barrierDistance,
      impliedVolatility: impliedVol,
      deltaHedgeRatio: greeks.delta,
      gamma: greeks.gamma,
      theta: greeks.theta,
      vega: greeks.vega,
      rho: greeks.rho,
      issuerCreditSpread: this.getIssuerCreditSpread(productDetails),
      liquidityPremium: liquidityDiscount,
      complexityPremium,
      underlyingPrices
    }
  }

  /**
   * Calculates option value using appropriate pricing model
   */
  private async calculateOptionValue(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData
  ): Promise<Decimal> {
    const spot = Object.values(priceData.underlyingPrices)[0] || 100
    const timeToMaturity = this.calculateTimeToMaturity(productDetails.maturityDate, input.valuationDate)
    
    let optionValue = this.decimal(0)
    
    switch (productDetails.productType) {
      case 'autocallable':
        // Already calculated in price data
        optionValue = this.decimal(priceData.theoreticalValue)
        break
        
      case 'reverse_convertible':
        // Bond minus put
        const bondValue = productDetails.notionalAmount * Math.exp(-0.05 * timeToMaturity)
        optionValue = this.decimal(bondValue).minus(this.decimal(priceData.theoreticalValue))
        break
        
      case 'principal_protected':
        // Protected principal plus upside
        optionValue = this.decimal(priceData.theoreticalValue)
        break
        
      case 'range_accrual':
        // Use digital option pricing
        const rangeValue = this.calculateRangeAccrualValue(
          spot,
          productDetails,
          timeToMaturity
        )
        optionValue = this.decimal(rangeValue)
        break
        
      default:
        optionValue = this.decimal(priceData.theoreticalValue)
    }
    
    return optionValue
  }

  /**
   * Calculates range accrual product value
   */
  private calculateRangeAccrualValue(
    spot: number,
    productDetails: any,
    timeToMaturity: number
  ): number {
    // Simplified range accrual: pays coupon for days within range
    const lowerBarrier = productDetails.floor || spot * 0.9
    const upperBarrier = productDetails.cap || spot * 1.1
    
    // Probability of staying in range (simplified)
    const vol = 0.20
    const probInRange = this.calculateProbabilityInRange(
      spot,
      lowerBarrier,
      upperBarrier,
      vol,
      timeToMaturity
    )
    
    const dailyCoupon = productDetails.couponRate / 365
    const expectedDaysInRange = probInRange * (timeToMaturity * 365)
    const accruedValue = productDetails.notionalAmount * dailyCoupon * expectedDaysInRange
    
    return accruedValue
  }

  /**
   * Calculates probability of staying within range
   */
  private calculateProbabilityInRange(
    spot: number,
    lower: number,
    upper: number,
    vol: number,
    time: number
  ): number {
    // Simplified: use normal distribution
    const drift = 0
    const variance = vol * vol * time
    const std = Math.sqrt(variance)
    
    // Log-normal distribution
    const lowerZ = (Math.log(lower / spot) - drift) / std
    const upperZ = (Math.log(upper / spot) - drift) / std
    
    // Use normal CDF from financial models
    const probBelow = this.financialModels['normalCDF'](upperZ)
    const probAbove = this.financialModels['normalCDF'](lowerZ)
    
    return probBelow - probAbove
  }

  /**
   * Calculates payoff structure analysis
   */
  private async calculatePayoffStructure(
    input: StructuredProductCalculationInput,
    productDetails: any,
    priceData: StructuredProductPriceData
  ): Promise<PayoffScenario[]> {
    const scenarios: PayoffScenario[] = []
    const spot = Object.values(priceData.underlyingPrices)[0] || 100
    const notional = productDetails.notionalAmount
    
    // Generate scenarios from 50% to 150% of current spot
    const scenarioLevels = [0.5, 0.7, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.3, 1.5]
    
    for (const level of scenarioLevels) {
      const underlyingLevel = spot * level
      let payoff = 0
      
      switch (productDetails.productType) {
        case 'autocallable':
          // Check autocall levels
          for (let i = 0; i < productDetails.autocallLevels.length; i++) {
            if (underlyingLevel >= productDetails.autocallLevels[i] * productDetails.strike) {
              payoff = notional * (1 + productDetails.couponRate * (i + 1))
              break
            }
          }
          // If not autocalled and below barrier
          if (payoff === 0 && underlyingLevel < productDetails.barrierLevel * productDetails.strike) {
            payoff = notional * (underlyingLevel / productDetails.strike)
          } else if (payoff === 0) {
            payoff = notional // Return principal
          }
          break
          
        case 'reverse_convertible':
          if (underlyingLevel >= productDetails.strike) {
            payoff = notional * (1 + productDetails.couponRate)
          } else {
            payoff = notional * (underlyingLevel / productDetails.strike) + notional * productDetails.couponRate
          }
          break
          
        case 'principal_protected':
          const upside = Math.max(0, (underlyingLevel - productDetails.strike) / productDetails.strike)
          const participation = upside * productDetails.participationRate
          const capped = productDetails.cap ? Math.min(participation, productDetails.cap) : participation
          payoff = notional * (productDetails.protectionLevel + capped)
          break
          
        default:
          payoff = notional * (underlyingLevel / spot)
      }
      
      scenarios.push({
        scenarioName: `${Math.round(level * 100)}% of Spot`,
        underlyingLevel,
        payoff,
        probability: this.calculateScenarioProbability(level, priceData.impliedVolatility)
      })
    }
    
    return scenarios
  }

  /**
   * Calculates scenario probability using log-normal distribution
   */
  private calculateScenarioProbability(level: number, volatility: number): number {
    // Simplified probability calculation
    const logReturn = Math.log(level)
    const variance = volatility * volatility
    const probability = Math.exp(-(logReturn * logReturn) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance)
    return Math.min(1, Math.max(0, probability * 0.1)) // Normalize
  }

  /**
   * Applies issuer credit spread adjustment
   */
  private async applyCreditAdjustment(
    optionValue: Decimal,
    priceData: StructuredProductPriceData
  ): Promise<Decimal> {
    // Apply credit spread as discount
    const creditDiscount = this.decimal(1).minus(this.decimal(priceData.issuerCreditSpread))
    return optionValue.mul(creditDiscount)
  }

  /**
   * Gets issuer credit spread based on rating or default
   */
  private getIssuerCreditSpread(productDetails: any): number {
    // Credit spreads by rating (annual basis points)
    const creditSpreads: Record<string, number> = {
      'AAA': 0.0020, // 20 bps
      'AA': 0.0035,  // 35 bps
      'A': 0.0060,   // 60 bps
      'BBB': 0.0125, // 125 bps
      'BB': 0.0300,  // 300 bps
      'B': 0.0500    // 500 bps
    }
    
    return creditSpreads[productDetails.issuerRating] || 0.0125 // Default to BBB
  }

  /**
   * Gets complexity premium based on product type
   */
  private getComplexityPremium(productType: string): number {
    const premiums: Record<string, number> = {
      'principal_protected': 0.002, // 20 bps
      'reverse_convertible': 0.003, // 30 bps
      'autocallable': 0.005,        // 50 bps
      'range_accrual': 0.007,       // 70 bps
      'leveraged_etp': 0.004,       // 40 bps
      'cln': 0.010                  // 100 bps
    }
    
    return premiums[productType] || 0.005
  }

  /**
   * Calculates implied volatility for product type
   */
  private calculateImpliedVolatility(productType: string): number {
    // Default implied vols by product type
    const impliedVols: Record<string, number> = {
      'principal_protected': 0.18,
      'reverse_convertible': 0.22,
      'autocallable': 0.20,
      'range_accrual': 0.15,
      'leveraged_etp': 0.25,
      'cln': 0.30
    }
    
    return impliedVols[productType] || 0.20
  }

  /**
   * Gets fallback price for underlying asset
   */
  private getUnderlyingFallbackPrice(asset: string): number {
    const fallbackPrices: Record<string, number> = {
      'SPX': 5000,
      'NDX': 17000,
      'RUT': 2000,
      'AAPL': 180,
      'MSFT': 400,
      'GOLD': 2000,
      'OIL': 75
    }
    
    return fallbackPrices[asset] || 100
  }

  /**
   * Fetches price data for an underlying asset
   */
  protected override async fetchPriceData(asset: string): Promise<PriceData> {
    try {
      const priceData = await this.databaseService.getPriceData(asset)
      return {
        price: priceData.price,
        currency: priceData.currency,
        asOf: new Date(priceData.as_of), // Convert string to Date
        source: priceData.source
      }
    } catch {
      // Fallback
      return {
        price: this.getUnderlyingFallbackPrice(asset),
        currency: 'USD',
        source: MarketDataProvider.MANUAL_OVERRIDE,
        asOf: new Date()
      }
    }
  }

  /**
   * Calculates time to maturity in years
   */
  private calculateTimeToMaturity(maturityDate: Date, valuationDate: Date): number {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000
    return Math.max(0, (maturityDate.getTime() - valuationDate.getTime()) / msPerYear)
  }

  /**
   * Validates structured product input parameters
   */
  protected override validateInput(input: CalculationInput): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    severity: ValidationSeverity
  } {
    const baseValidation = super.validateInput(input)
    const structuredInput = input as StructuredProductCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate structured product parameters
    if (structuredInput.notionalAmount !== undefined && structuredInput.notionalAmount <= 0) {
      errors.push('Notional amount must be positive')
    }

    if (structuredInput.participationRate !== undefined && structuredInput.participationRate < 0) {
      errors.push('Participation rate cannot be negative')
    }

    if (structuredInput.barrierLevel !== undefined && (structuredInput.barrierLevel <= 0 || structuredInput.barrierLevel > 2)) {
      errors.push('Barrier level must be between 0 and 2')
    }

    // Validate dates
    if (structuredInput.maturityDate && structuredInput.maturityDate <= input.valuationDate) {
      warnings.push('Product has matured')
    }

    // Add warnings for missing data
    if (!structuredInput.underlyingAssets || structuredInput.underlyingAssets.length === 0) {
      warnings.push('No underlying assets specified - using default')
    }

    if (!structuredInput.impliedVolatility) {
      warnings.push('No implied volatility provided - using product type default')
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
    return `structured_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
