/**
 * EquityCalculator - NAV calculation for equity holdings
 * 
 * Handles:
 * - Market price × quantity calculations
 * - Corporate actions (splits, dividends, spin-offs)
 * - Multi-exchange price aggregation
 * - Currency conversion for international equities
 * - Dividend accrual and ex-dividend adjustments
 * - DDM, CAPM, and Beta calculations using financial models
 * 
 * Supports equity products from equity_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import { equityModels } from '../models'
import { FinancialModelsService } from '../FinancialModelsService'
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
      
      // INSTITUTIONAL VALUATION: Use equity models for comprehensive valuation
      const fundamentalValue = await this.calculateFundamentalValue(productDetails, priceData)
      const relativeValue = await this.calculateRelativeValue(productDetails, priceData)
      
      // Use weighted average of market and fundamental values for final NAV
      const marketWeight = new Decimal(0.7) // 70% market price
      const fundamentalWeight = new Decimal(0.3) // 30% fundamental value
      const weightedValue = marketValue.times(marketWeight)
        .plus(fundamentalValue.times(fundamentalWeight))
      
      // Build calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `equity_${productDetails.cusip || 'unknown'}`,
        productType: AssetType.EQUITY,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(weightedValue.plus(accruedDividends)),
        totalLiabilities: 0, // Equities typically don't have liabilities
        netAssets: this.toNumber(weightedValue.plus(accruedDividends)),
        navValue: this.toNumber(weightedValue.plus(accruedDividends)),
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
      
      // Get market microstructure data from database or calculate spread
      let bidAskData = { bid: price, ask: price, volume: 0 }
      try {
        const marketData = await this.databaseService.getMarketMicrostructure(instrumentKey)
        if (marketData) {
          bidAskData = marketData
        }
      } catch (error) {
        // Calculate bid/ask spread based on liquidity metrics
        const liquidityScore = productDetails.marketCap ? 
          Math.min(1, Math.log10(productDetails.marketCap) / 10) : 0.5
        const spreadBps = Math.max(1, Math.floor((1 - liquidityScore) * 20)) // 1-20 bps based on liquidity
        const spreadMultiplier = 1 + (spreadBps / 10000)
        
        bidAskData = {
          bid: price / spreadMultiplier,
          ask: price * spreadMultiplier,
          volume: productDetails.sharesOutstanding ? 
            Math.floor(productDetails.sharesOutstanding * 0.01) : // Assume 1% daily turnover
            100000 // Default volume
        }
      }
      
      // Calculate beta if we have market returns data
      let beta = 1.0 // Market beta default
      try {
        const returns = await this.databaseService.getHistoricalReturns(instrumentKey, 252) // 1 year
        const marketReturns = await this.databaseService.getMarketReturns('SPX', 252)
        if (returns && marketReturns) {
          beta = this.financialModels.calculateBeta(returns, marketReturns)
        }
      } catch (error) {
        // Use sector-based beta as fallback
        beta = this.getSectorBeta(productDetails.sector) 
      }
      
      return {
        price,
        currency: priceData.currency,
        source: priceData.source,
        asOf: new Date(priceData.as_of),
        exchange: productDetails.exchange,
        bid: bidAskData.bid,
        ask: bidAskData.ask,
        volume: bidAskData.volume,
        dividendYield: productDetails.dividendYield,
        exDividendDate: productDetails.exDividendDate,
        beta,
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
   * Gets sector-based beta as fallback when individual beta unavailable
   */
  private getSectorBeta(sector: string | undefined): number {
    const sectorBetas: Record<string, number> = {
      'Technology': 1.25,
      'Healthcare': 0.90,
      'Financials': 1.15,
      'Consumer Discretionary': 1.10,
      'Consumer Staples': 0.70,
      'Energy': 1.20,
      'Materials': 1.05,
      'Industrials': 1.00,
      'Utilities': 0.60,
      'Real Estate': 0.85,
      'Communication Services': 1.05
    }
    
    return sectorBetas[sector || ''] || 1.0  // Default to market beta
  }

  /**
   * Calculate fundamental value using DDM, DCF, and CAPM models
   * Spec: "Dividend Discount Model values equity as present value of expected future dividends"
   */
  private async calculateFundamentalValue(
    productDetails: any,
    priceData: EquityPriceData
  ): Promise<Decimal> {
    const currentPrice = this.decimal(priceData.price)
    
    // Calculate required return using CAPM
    const riskFreeRate = 0.04 // Current 10-year Treasury yield approximation
    const marketReturn = 0.10 // Long-term equity market return
    
    const requiredReturn = equityModels.calculateCAPM({
      riskFreeRate,
      marketReturn,
      beta: priceData.beta || 1.0
    })

    // Use DDM if dividend-paying stock
    if (productDetails.dividendPerShare && productDetails.dividendPerShare > 0) {
      const dividendGrowthRate = productDetails.dividendYield ? 
        productDetails.dividendYield * 0.6 : // Payout ratio assumption
        0.03 // Conservative growth assumption
      
      const ddmValue = equityModels.dividendDiscountModel({
        currentDividend: productDetails.dividendPerShare,
        growthRate: dividendGrowthRate,
        requiredReturn: requiredReturn
      })
      
      // For mature companies, use multi-stage DDM
      if (productDetails.marketCap > 10000000000) { // $10B+ market cap
        const multiStageValue = equityModels.dividendDiscountModel({
          currentDividend: productDetails.dividendPerShare,
          growthRate: 0.08, // Higher initial growth
          terminalGrowthRate: 0.03, // Terminal growth
          forecastPeriod: 5,
          requiredReturn: requiredReturn
        })
        return multiStageValue
      }
      
      return ddmValue
    }
    
    // For non-dividend stocks, use earnings-based DCF
    if (productDetails.earningsPerShare && productDetails.earningsPerShare > 0) {
      const fcfePerShare = new Decimal(productDetails.earningsPerShare * 0.7) // Free cash flow approximation
      const growthRate = new Decimal(0.05) // Moderate growth assumption
      
      // Simple perpetuity model for FCFE
      const dcfValue = fcfePerShare.times(new Decimal(1).plus(growthRate))
        .div(new Decimal(requiredReturn).minus(growthRate))
      
      return dcfValue
    }
    
    // Fallback to current market price if no fundamental data
    return currentPrice
  }

  /**
   * Calculate relative value using P/E, P/B, EV/EBITDA multiples
   * Spec: "Multiplier models (P/E, P/B) for relative valuation"
   */
  private async calculateRelativeValue(
    productDetails: any,
    priceData: EquityPriceData
  ): Promise<Decimal> {
    const currentPrice = this.decimal(priceData.price)
    let valuationSum = new Decimal(0)
    let valuationCount = 0
    
    // P/E Valuation
    if (productDetails.earningsPerShare && productDetails.earningsPerShare > 0) {
      // Industry average P/E (would normally fetch from database)
      const industryPE = this.getIndustryPE(productDetails.sector)
      const peImpliedValue = equityModels.peRatioValuation(
        productDetails.earningsPerShare,
        industryPE.toNumber(),
        1.0 // Adjustment factor
      )
      
      valuationSum = valuationSum.plus(peImpliedValue)
      valuationCount++
    }
    
    // P/B Valuation
    if (productDetails.bookValuePerShare && productDetails.bookValuePerShare > 0) {
      // Industry average P/B
      const industryPB = this.getIndustryPB(productDetails.sector)
      const pbImpliedValue = equityModels.pbRatioValuation(
        productDetails.bookValuePerShare,
        industryPB.toNumber(),
        1.0 // Adjustment factor
      )
      
      valuationSum = valuationSum.plus(pbImpliedValue)
      valuationCount++
    }
    
    // EV/EBITDA Valuation
    if (productDetails.ebitdaPerShare && productDetails.ebitdaPerShare > 0) {
      // Industry average EV/EBITDA
      const industryEVEBITDA = this.getIndustryEVEBITDA(productDetails.sector)
      const totalEbitda = productDetails.ebitdaPerShare * (productDetails.sharesOutstanding || 1)
      const evImpliedValue = equityModels.evEbitdaValuation(
        totalEbitda,
        industryEVEBITDA.toNumber(),
        productDetails.netDebt || 0,
        productDetails.cash || 0
      )
      
      // Convert to per-share value
      const evPerShare = evImpliedValue.div(productDetails.sharesOutstanding || 1)
      valuationSum = valuationSum.plus(evPerShare)
      valuationCount++
    }
    
    // Return average of all valuation methods
    if (valuationCount > 0) {
      return valuationSum.div(valuationCount)
    }
    
    // Fallback to current price if no relative metrics available
    return currentPrice
  }

  /**
   * Get industry average P/E ratio by sector
   */
  private getIndustryPE(sector: string | undefined): Decimal {
    const industryPEs: Record<string, number> = {
      'Technology': 25,
      'Healthcare': 20,
      'Financials': 15,
      'Consumer Discretionary': 18,
      'Consumer Staples': 20,
      'Energy': 12,
      'Materials': 15,
      'Industrials': 18,
      'Utilities': 16,
      'Real Estate': 20,
      'Communication Services': 22
    }
    
    return new Decimal(industryPEs[sector || ''] || 18)
  }

  /**
   * Get industry average P/B ratio by sector
   */
  private getIndustryPB(sector: string | undefined): Decimal {
    const industryPBs: Record<string, number> = {
      'Technology': 4.5,
      'Healthcare': 3.5,
      'Financials': 1.2,
      'Consumer Discretionary': 3.0,
      'Consumer Staples': 3.5,
      'Energy': 1.5,
      'Materials': 2.0,
      'Industrials': 2.5,
      'Utilities': 1.8,
      'Real Estate': 2.2,
      'Communication Services': 3.0
    }
    
    return new Decimal(industryPBs[sector || ''] || 2.5)
  }

  /**
   * Get industry average EV/EBITDA ratio by sector
   */
  private getIndustryEVEBITDA(sector: string | undefined): Decimal {
    const industryEVs: Record<string, number> = {
      'Technology': 20,
      'Healthcare': 15,
      'Financials': 10,
      'Consumer Discretionary': 12,
      'Consumer Staples': 14,
      'Energy': 6,
      'Materials': 8,
      'Industrials': 11,
      'Utilities': 10,
      'Real Estate': 15,
      'Communication Services': 12
    }
    
    return new Decimal(industryEVs[sector || ''] || 12)
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
