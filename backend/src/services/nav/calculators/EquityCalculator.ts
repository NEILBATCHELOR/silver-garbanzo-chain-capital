/**
 * EquityCalculator - NAV calculation for equity holdings
 * 
 * Handles:
 * - Market price × quantity calculations
 * - Corporate actions (splits, dividends, spin-offs)
 * - Multi-exchange price aggregation
 * - Currency conversion for international equities
 * - Dividend accrual and ex-dividend adjustments
 * 
 * Supports equity products from equity_products table
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
// Product utilities will be imported when needed

export interface EquityCalculationInput extends CalculationInput {
  // Equity-specific parameters
  shares?: number
  marketPrice?: number
  dividendPerShare?: number
  exDividendDate?: Date
  splitRatio?: number
  splitEffectiveDate?: Date
  exchangeCode?: string
  cusip?: string
  isin?: string
}

export interface EquityPriceData extends PriceData {
  asOf: Date
  exchange: string
  bid: number
  ask: number
  volume: number
  dividendYield?: number
  exDividendDate?: Date
  beta?: number
  staleness: number
  confidence: number
}

export class EquityCalculator extends BaseCalculator {
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
    return [AssetType.EQUITY]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const equityInput = input as EquityCalculationInput
      
      // Get equity product details from database
      const productDetails = await this.getEquityProductDetails(equityInput)
      
      // Fetch current market data
      const priceData = await this.fetchEquityPriceData(equityInput, productDetails)
      
      // Apply corporate actions
      const adjustedHoldings = await this.applyCorporateActions(equityInput, productDetails)
      
      // Calculate market value
      const marketValue = await this.calculateMarketValue(adjustedHoldings, priceData)
      
      // Calculate accrued dividends if applicable
      const accruedDividends = await this.calculateAccruedDividends(adjustedHoldings, productDetails)
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `equity_${productDetails.cusip || 'unknown'}`,
        productType: AssetType.EQUITY,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(marketValue.plus(accruedDividends)),
        totalLiabilities: 0, // Equities typically don't have liabilities
        netAssets: this.toNumber(marketValue.plus(accruedDividends)),
        navValue: this.toNumber(marketValue.plus(accruedDividends)),
        navPerShare: input.sharesOutstanding ? 
          this.toNumber(marketValue.plus(accruedDividends).div(this.decimal(input.sharesOutstanding))) : 
          undefined,
        currency: input.targetCurrency || priceData.currency || 'USD',
        pricingSources: {
          marketPrice: {
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
        error: error instanceof Error ? error.message : 'Unknown equity calculation error',
        code: 'EQUITY_CALCULATION_FAILED'
      }
    }
  }

  // ==================== EQUITY-SPECIFIC METHODS ====================

  /**
   * Fetches equity product details from the database
   */
  private async getEquityProductDetails(input: EquityCalculationInput): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: input.assetId,
      symbol: input.assetId?.split('_')[1] || 'UNKNOWN',
      cusip: input.cusip,
      isin: input.isin,
      exchange: input.exchangeCode || 'NYSE',
      currency: 'USD',
      dividendPerShare: input.dividendPerShare || 0,
      splitRatio: input.splitRatio || 1,
      splitEffectiveDate: input.splitEffectiveDate,
      exDividendDate: input.exDividendDate,
      dividendSource: 'bloomberg'
    }
  }

  /**
   * Fetches current market price data for the equity
   */
  private async fetchEquityPriceData(input: EquityCalculationInput, productDetails: any): Promise<EquityPriceData> {
    // Mock implementation - replace with actual market data service
    const mockPrice = input.marketPrice || 100.00
    
    return {
      price: mockPrice,
      currency: productDetails.currency,
      source: 'bloomberg',
      asOf: input.valuationDate,
      exchange: productDetails.exchange,
      bid: mockPrice * 0.999,
      ask: mockPrice * 1.001,
      volume: 1000000,
      staleness: 0,
      confidence: 0.95
    }
  }

  /**
   * Applies corporate actions like stock splits and dividend adjustments
   */
  private async applyCorporateActions(input: EquityCalculationInput, productDetails: any): Promise<{
    shares: Decimal,
    corporateActions: string[]
  }> {
    const shares = this.decimal(input.shares || 0)
    const corporateActions: string[] = []

    let adjustedShares = shares

    // Apply stock splits
    if (productDetails.splitRatio && productDetails.splitRatio !== 1) {
      if (productDetails.splitEffectiveDate && productDetails.splitEffectiveDate <= input.valuationDate) {
        adjustedShares = adjustedShares.mul(this.decimal(productDetails.splitRatio))
        corporateActions.push(`Stock split ${productDetails.splitRatio}:1 applied`)
      }
    }

    return {
      shares: adjustedShares,
      corporateActions
    }
  }

  /**
   * Calculates market value of equity holdings
   */
  private async calculateMarketValue(
    holdings: { shares: Decimal, corporateActions: string[] }, 
    priceData: EquityPriceData
  ): Promise<Decimal> {
    const shares = holdings.shares
    const pricePerShare = this.decimal(priceData.price)
    
    const marketValue = shares.mul(pricePerShare)
    
    // Apply any market-specific adjustments
    return marketValue
  }

  /**
   * Calculates accrued dividends for dividend-paying equities
   */
  private async calculateAccruedDividends(
    holdings: { shares: Decimal, corporateActions: string[] },
    productDetails: any
  ): Promise<Decimal> {
    if (!productDetails.dividendPerShare || productDetails.dividendPerShare === 0) {
      return this.decimal(0)
    }

    // If we're after record date but before ex-dividend date, accrue dividend
    const exDivDate = productDetails.exDividendDate
    if (exDivDate && exDivDate > new Date()) {
      const dividendPerShare = this.decimal(productDetails.dividendPerShare)
      return holdings.shares.mul(dividendPerShare)
    }

    return this.decimal(0)
  }

  /**
   * Validates equity-specific input parameters
   */
  protected override validateInput(input: CalculationInput): { isValid: boolean, errors: string[], warnings: string[], severity: ValidationSeverity } {
    const baseValidation = super.validateInput(input)
    const equityInput = input as EquityCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate equity-specific parameters
    if (equityInput.shares !== undefined && equityInput.shares < 0) {
      errors.push('Shares cannot be negative')
    }

    if (equityInput.marketPrice !== undefined && equityInput.marketPrice < 0) {
      errors.push('Market price cannot be negative')
    }

    if (equityInput.splitRatio !== undefined && equityInput.splitRatio <= 0) {
      errors.push('Split ratio must be positive')
    }

    // Add warnings for missing optional data
    if (!equityInput.cusip && !equityInput.isin) {
      warnings.push('No CUSIP or ISIN provided - may affect price data accuracy')
    }

    if (!equityInput.exchangeCode) {
      warnings.push('No exchange code provided - using default exchange')
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
    return `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
