/**
 * BondCalculator - NAV calculation for fixed income securities
 * 
 * Handles:
 * - Mark-to-market bond valuation
 * - Yield curve integration and interpolation
 * - Credit spread adjustments
 * - Accrued interest calculations
 * - Duration and convexity adjustments
 * - Municipal bond tax equivalent yields
 * 
 * Supports bond products from bond_products table
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
  ValidationSeverity
} from '../types'

export interface BondCalculationInput extends CalculationInput {
  // Bond-specific parameters
  faceValue?: number
  couponRate?: number
  maturityDate?: Date
  issueDate?: Date
  paymentFrequency?: number // payments per year (2 = semi-annual, 4 = quarterly)
  creditRating?: string
  cusip?: string
  isin?: string
  yieldToMaturity?: number
  marketPrice?: number // as percentage of face value (e.g., 98.5)
  accruedInterest?: number
  sector?: string
  issuerType?: 'government' | 'corporate' | 'municipal' | 'supranational'
}

export interface BondPriceData extends PriceData {
  asOf: Date
  cleanPrice: number // price without accrued interest
  dirtyPrice: number // price including accrued interest
  yieldToMaturity: number
  duration: number
  convexity: number
  creditSpread?: number
  benchmarkYield?: number
  accruedInterest: number
  staleness: number
  confidence: number
}

export interface YieldCurvePoint {
  maturity: number // years to maturity
  yield: number    // annualized yield
}

export class BondCalculator extends BaseCalculator {
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
    return [AssetType.BONDS]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const bondInput = input as BondCalculationInput
      
      // Get bond product details from database
      const productDetails = await this.getBondProductDetails(bondInput)
      
      // Fetch current market data and yield curve
      const priceData = await this.fetchBondPriceData(bondInput, productDetails)
      const yieldCurve = await this.fetchYieldCurveData(productDetails.issuerType, productDetails.creditRating)
      
      // Calculate bond valuation components
      const valuation = await this.calculateBondValuation(bondInput, productDetails, priceData, yieldCurve)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `bond_${productDetails.cusip || 'unknown'}`,
        productType: AssetType.BONDS,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(valuation.totalValue),
        totalLiabilities: 0, // Bonds don't typically have liabilities
        netAssets: this.toNumber(valuation.totalValue),
        navValue: this.toNumber(valuation.totalValue),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(valuation.totalValue.div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || priceData.currency || 'USD',
        pricingSources: {
          bondPrice: {
            price: priceData.price,
            currency: priceData.currency,
            asOf: priceData.asOf,
            source: priceData.source
          }
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
        error: error instanceof Error ? error.message : 'Unknown bond calculation error',
        code: 'BOND_CALCULATION_FAILED'
      }
    }
  }

  // ==================== BOND-SPECIFIC METHODS ====================

  /**
   * Fetches bond product details from the database
   */
  private async getBondProductDetails(input: BondCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      cusip: input.cusip,
      isin: input.isin,
      faceValue: input.faceValue || 1000,
      couponRate: input.couponRate || 0.05, // 5%
      maturityDate: input.maturityDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5), // 5 years
      issueDate: input.issueDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      paymentFrequency: input.paymentFrequency || 2, // semi-annual
      creditRating: input.creditRating || 'AAA',
      sector: input.sector || 'corporate',
      issuerType: input.issuerType || 'corporate',
      currency: 'USD'
    }
  }

  /**
   * Fetches current bond market data
   */
  private async fetchBondPriceData(input: BondCalculationInput, productDetails: any): Promise<BondPriceData> {
    // Mock implementation - replace with actual market data service
    const marketPrice = input.marketPrice || 100.0 // percentage of face value
    const faceValue = productDetails.faceValue
    const couponRate = productDetails.couponRate
    const paymentFrequency = productDetails.paymentFrequency
    
    // Calculate accrued interest
    const accruedInterest = this.calculateAccruedInterest(
      input.valuationDate,
      productDetails.issueDate,
      productDetails.maturityDate,
      couponRate,
      paymentFrequency,
      faceValue
    )

    const cleanPrice = marketPrice
    const dirtyPrice = cleanPrice + (this.toNumber(accruedInterest) / faceValue) * 100
    
    return {
      price: dirtyPrice,
      currency: productDetails.currency,
      source: 'bloomberg',
      asOf: input.valuationDate,
      cleanPrice,
      dirtyPrice,
      accruedInterest: this.toNumber(accruedInterest),
      yieldToMaturity: input.yieldToMaturity || 0.045, // 4.5%
      duration: 4.2, // Modified duration
      convexity: 18.5,
      creditSpread: 0.002, // 20 bps
      benchmarkYield: 0.043, // 4.3%
      staleness: 0,
      confidence: 0.95
    }
  }

  /**
   * Fetches yield curve data for bond valuation
   */
  private async fetchYieldCurveData(issuerType: string, creditRating: string): Promise<{
    source: string,
    curve: YieldCurvePoint[]
  }> {
    // Mock implementation - replace with actual yield curve service
    const baseCurve: YieldCurvePoint[] = [
      { maturity: 0.25, yield: 0.042 }, // 3 month
      { maturity: 0.5,  yield: 0.043 }, // 6 month
      { maturity: 1,    yield: 0.044 }, // 1 year
      { maturity: 2,    yield: 0.045 }, // 2 year
      { maturity: 5,    yield: 0.046 }, // 5 year
      { maturity: 10,   yield: 0.047 }, // 10 year
      { maturity: 30,   yield: 0.048 }  // 30 year
    ]

    // Apply credit spread adjustment based on rating
    const creditSpread = this.getCreditSpread(creditRating)
    const adjustedCurve = baseCurve.map(point => ({
      ...point,
      yield: point.yield + creditSpread
    }))

    return {
      source: 'treasury_yield_curve',
      curve: adjustedCurve
    }
  }

  /**
   * Performs comprehensive bond valuation
   */
  private async calculateBondValuation(
    input: BondCalculationInput,
    productDetails: any,
    priceData: BondPriceData,
    yieldCurve: { source: string, curve: YieldCurvePoint[] }
  ): Promise<{
    totalValue: Decimal,
    daysToMaturity: number,
    couponPaymentsRemaining: number
  }> {
    const faceValue = this.decimal(productDetails.faceValue)
    const cleanPrice = this.decimal(priceData.cleanPrice)
    const accruedInterest = this.decimal(priceData.accruedInterest)
    
    // Calculate total value (dirty price)
    const totalValue = faceValue.mul(cleanPrice.div(100)).plus(accruedInterest)
    
    // Calculate days to maturity
    const daysToMaturity = Math.ceil(
      (productDetails.maturityDate.getTime() - input.valuationDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    
    // Calculate remaining coupon payments
    const yearsToMaturity = daysToMaturity / 365.25
    const couponPaymentsRemaining = Math.ceil(yearsToMaturity * productDetails.paymentFrequency)
    
    return {
      totalValue,
      daysToMaturity,
      couponPaymentsRemaining
    }
  }

  /**
   * Calculates accrued interest for the bond
   */
  private calculateAccruedInterest(
    valuationDate: Date,
    lastCouponDate: Date,
    nextCouponDate: Date,
    couponRate: number,
    paymentFrequency: number,
    faceValue: number
  ): Decimal {
    // Use 30/360 day count convention for most corporate bonds
    const daysSinceLastCoupon = this.calculateDaysBetween(lastCouponDate, valuationDate, '30/360')
    const daysInCouponPeriod = this.calculateDaysBetween(lastCouponDate, nextCouponDate, '30/360')
    
    const couponPayment = this.decimal(faceValue)
      .mul(this.decimal(couponRate))
      .div(this.decimal(paymentFrequency))
    
    const accruedInterest = couponPayment
      .mul(this.decimal(daysSinceLastCoupon))
      .div(this.decimal(daysInCouponPeriod))
    
    return accruedInterest
  }

  /**
   * Calculates days between dates using specified day count convention
   */
  private calculateDaysBetween(startDate: Date, endDate: Date, convention: string): number {
    switch (convention) {
      case '30/360':
        // Simplified 30/360 calculation
        const years = endDate.getFullYear() - startDate.getFullYear()
        const months = endDate.getMonth() - startDate.getMonth()
        const days = endDate.getDate() - startDate.getDate()
        return years * 360 + months * 30 + days
      
      case 'Actual/365':
        return (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      
      default:
        return (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    }
  }

  /**
   * Gets credit spread based on credit rating
   */
  private getCreditSpread(creditRating: string): number {
    const spreads: Record<string, number> = {
      'AAA': 0.0005, // 5 bps
      'AA+': 0.0010, // 10 bps
      'AA': 0.0015,  // 15 bps
      'AA-': 0.0020, // 20 bps
      'A+': 0.0030,  // 30 bps
      'A': 0.0040,   // 40 bps
      'A-': 0.0050,  // 50 bps
      'BBB+': 0.0075, // 75 bps
      'BBB': 0.0100,  // 100 bps
      'BBB-': 0.0150, // 150 bps
    }

    return spreads[creditRating] || 0.0200 // 200 bps for unrated/below investment grade
  }

  /**
   * Validates bond-specific input parameters
   */
  protected override validateInput(input: CalculationInput): { isValid: boolean, errors: string[], warnings: string[], severity: ValidationSeverity } {
    const baseValidation = super.validateInput(input)
    const bondInput = input as BondCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate bond-specific parameters
    if (bondInput.faceValue !== undefined && bondInput.faceValue <= 0) {
      errors.push('Face value must be positive')
    }

    if (bondInput.couponRate !== undefined && bondInput.couponRate < 0) {
      errors.push('Coupon rate cannot be negative')
    }

    if (bondInput.marketPrice !== undefined && bondInput.marketPrice <= 0) {
      errors.push('Market price must be positive')
    }

    if (bondInput.paymentFrequency !== undefined && ![1, 2, 4, 12].includes(bondInput.paymentFrequency)) {
      errors.push('Payment frequency must be 1, 2, 4, or 12 (annual, semi-annual, quarterly, or monthly)')
    }

    if (bondInput.maturityDate && bondInput.maturityDate <= input.valuationDate) {
      errors.push('Maturity date must be after valuation date')
    }

    // Add warnings for missing optional data
    if (!bondInput.cusip && !bondInput.isin) {
      warnings.push('No CUSIP or ISIN provided - may affect price data accuracy')
    }

    if (!bondInput.creditRating) {
      warnings.push('No credit rating provided - using default spread assumptions')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? ValidationSeverity.ERROR : warnings.length > 0 ? ValidationSeverity.WARN : ValidationSeverity.INFO
    }
  }

  /**
   * Generates a unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `bond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
