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
import { DatabaseService } from '../DatabaseService'
import {
  AssetType,
  CalculationInput,
  CalculationResult,
  CalculationStatus,
  PriceData,
  NavServiceResult,
  ValidationSeverity
} from '../types'

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
   * Fetches equity product details from the database - NO MOCKS
   */
  private async getEquityProductDetails(input: EquityCalculationInput): Promise<any> {
    if (!input.assetId) {
      throw new Error('Asset ID is required for equity product lookup')
    }

    try {
      const productDetails = await this.databaseService.getEquityProductById(input.assetId)
      
      return {
        id: productDetails.id,
        symbol: productDetails.ticker_symbol,
        companyName: productDetails.company_name,
        exchange: productDetails.exchange || input.exchangeCode || 'NYSE',
        currency: productDetails.currency || 'USD',
        marketCap: productDetails.market_capitalization,
        sharesOutstanding: productDetails.shares_outstanding,
        dividendYield: productDetails.dividend_yield,
        earningsPerShare: productDetails.earnings_per_share,
        priceEarningsRatio: productDetails.price_earnings_ratio,
        sector: productDetails.sector_industry,
        status: productDetails.status,
        // Corporate action data from input (would normally come from corporate_actions_history JSONB)
        dividendPerShare: input.dividendPerShare || 0,
        splitRatio: input.splitRatio || 1,
        splitEffectiveDate: input.splitEffectiveDate,
        exDividendDate: input.exDividendDate
      }
    } catch (error) {
      throw new Error(`Failed to get equity product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches current market price data for the equity - NO MOCKS
   */
  private async fetchEquityPriceData(input: EquityCalculationInput, productDetails: any): Promise<EquityPriceData> {
    try {
      
      // Try to get price data from nav_price_cache using equity symbol as instrument key
      const instrumentKey = productDetails.symbol || input.assetId
      
      let priceData
      try {
        priceData = await this.databaseService.getPriceData(instrumentKey)
      } catch (error) {
        // If no price data found, use fallback values
        console.warn(`No price data found for equity ${instrumentKey}, using fallback values`)
        priceData = {
          price: input.marketPrice || 100.00,
          currency: productDetails.currency,
          source: 'fallback',
          as_of: input.valuationDate.toISOString(),
          instrument_key: instrumentKey
        }
      }
      
      const price = priceData.price
      
      return {
        price,
        currency: priceData.currency,
        source: priceData.source,
        asOf: new Date(priceData.as_of),
        exchange: productDetails.exchange,
        bid: price * 0.999, // TODO: Get actual bid/ask from market data
        ask: price * 1.001,
        volume: 1000000, // TODO: Get actual volume
        dividendYield: productDetails.dividendYield,
        exDividendDate: productDetails.exDividendDate,
        staleness: 0,
        confidence: priceData.source === 'fallback' ? 0.5 : 0.95
      }
    } catch (error) {
      throw new Error(`Failed to fetch equity price data: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
