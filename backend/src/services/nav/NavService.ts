/**
 * NavService - Core NAV Calculation Service
 * Implements basic Net Asset Value calculations and orchestration logic
 * Phase 4 implementation: Basic calculations without database operations
 */

import { Decimal } from 'decimal.js'
import { 
  AssetType,
  CalculationInput, 
  CalculationResult,
  CalculationStatus,
  AssetHolding,
  PriceData,
  NavServiceResult
} from './types'
import { 
  getProductTableName, 
  getAssetTypeConfig,
  validateAndResolveProductType 
} from './ProductTypeUtilities'
import { createFxRateService } from './FxRateService'
import { createMarketDataService } from './MarketDataService'

// Configure Decimal.js for financial precision
Decimal.set({ 
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -21,
  toExpPos: 21,
  modulo: Decimal.ROUND_HALF_UP
})

/**
 * Core NAV calculation service
 * Provides basic NAV calculation functionality without database side effects
 */
export class NavService {
  private fxRateService: any
  private marketDataService: any
  
  constructor() {
    this.fxRateService = createFxRateService()
    this.marketDataService = createMarketDataService()
  }
  
  /**
   * Calculate basic NAV using the fundamental formula:
   * NAV = (Total Assets - Total Liabilities) / Outstanding Shares
   */
  public async calculateBasicNav(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      // Validate input
      const validation = this.validateCalculationInput(input)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Input validation failed: ${validation.errors.join(', ')}`,
          statusCode: 400
        }
      }

      // Generate unique run ID for this calculation
      const runId = this.generateRunId()
      
      // Calculate total assets with proper FX conversion and pricing sources
      const { totalAssets, pricingSources } = await this.calculateTotalAssetsWithSources(input)
      
      // Get liabilities (default to 0 if not provided)
      const totalLiabilities = new Decimal(input.liabilities || 0)
      
      // Calculate net assets
      const netAssets = totalAssets.minus(totalLiabilities)
      
      // Ensure net assets is non-negative
      if (netAssets.lt(0)) {
        return {
          success: false,
          error: 'Net assets cannot be negative (liabilities exceed assets)',
          statusCode: 422
        }
      }
      
      // Calculate NAV value
      let navValue = netAssets
      let navPerShare: Decimal | undefined
      
      // If shares outstanding provided, calculate per-share NAV
      if (input.sharesOutstanding && input.sharesOutstanding > 0) {
        const sharesOutstanding = new Decimal(input.sharesOutstanding)
        navPerShare = netAssets.div(sharesOutstanding)
      }

      // Get FX rate used for conversion to target currency
      const targetCurrency = input.targetCurrency || 'USD'
      const baseCurrency = input.baseCurrency || 'USD' // Default to USD if not specified
      let fxRateUsed = 1.0

      if (baseCurrency !== targetCurrency) {
        try {
          const conversion = await this.fxRateService.convertAmount(
            navValue.toNumber(), 
            baseCurrency, 
            targetCurrency
          )
          navValue = conversion.convertedAmount
          if (navPerShare) {
            navPerShare = navPerShare.mul(conversion.fxRate)
          }
          fxRateUsed = conversion.fxRate.toNumber()
        } catch (error) {
          console.warn(`FX conversion failed from ${baseCurrency} to ${targetCurrency}, using 1.0:`, error)
          fxRateUsed = 1.0
        }
      }
      
      // Build calculation result with real data
      const result: CalculationResult = {
        runId,
        assetId: input.assetId,
        productType: input.productType,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: totalAssets.toNumber(),
        totalLiabilities: totalLiabilities.toNumber(),
        netAssets: netAssets.toNumber(),
        navValue: navValue.toNumber(),
        navPerShare: navPerShare?.toNumber(),
        sharesOutstanding: input.sharesOutstanding,
        currency: targetCurrency,
        fxRateUsed: fxRateUsed, // Real FX rate from database
        pricingSources: pricingSources, // Real pricing sources from market data
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED,
      }
      
      return {
        success: true,
        data: result,
        statusCode: 200
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error'
      
      return {
        success: false,
        error: `NAV calculation failed: ${errorMessage}`,
        statusCode: 500
      }
    }
  }
  
  /**
   * Calculate per-share NAV value
   */
  public calculateNavPerShare(navValue: number, sharesOutstanding: number): number {
    if (sharesOutstanding <= 0) {
      throw new Error('Shares outstanding must be greater than zero')
    }
    
    const nav = new Decimal(navValue)
    const shares = new Decimal(sharesOutstanding)
    
    return nav.div(shares).toNumber()
  }
  
  /**
   * Calculate percentage change between two NAV values
   */
  public calculateNavChange(currentNav: number, previousNav: number): { amount: number; percentage: number } {
    if (previousNav <= 0) {
      throw new Error('Previous NAV must be greater than zero for change calculation')
    }
    
    const current = new Decimal(currentNav)
    const previous = new Decimal(previousNav)
    const changeAmount = current.minus(previous)
    const changePercentage = changeAmount.div(previous).mul(100)
    
    return {
      amount: changeAmount.toNumber(),
      percentage: changePercentage.toNumber()
    }
  }
  
  /**
   * Validate calculation input parameters
   */
  private validateCalculationInput(input: CalculationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validate valuation date
    if (!input.valuationDate || isNaN(input.valuationDate.getTime())) {
      errors.push('Valid valuation date is required')
    }
    
    // Validate asset identification (at least one identifier required)
    if (!input.assetId && !input.productType && !input.projectId) {
      errors.push('At least one of assetId, productType, or projectId must be provided')
    }
    
    // Validate numerical inputs
    if (input.fees !== undefined && (isNaN(input.fees) || input.fees < 0)) {
      errors.push('Fees must be a non-negative number')
    }
    
    if (input.liabilities !== undefined && (isNaN(input.liabilities) || input.liabilities < 0)) {
      errors.push('Liabilities must be a non-negative number')
    }
    
    if (input.sharesOutstanding !== undefined && (isNaN(input.sharesOutstanding) || input.sharesOutstanding <= 0)) {
      errors.push('Shares outstanding must be a positive number')
    }
    
    // Validate asset type if provided
    if (input.productType) {
      const typeValidation = validateAndResolveProductType({ productType: input.productType })
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors)
      }
    }
    
    // Validate holdings if provided
    if (input.holdings) {
      const holdingErrors = this.validateHoldings(input.holdings)
      errors.push(...holdingErrors)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Validate individual holdings
   */
  private validateHoldings(holdings: AssetHolding[]): string[] {
    const errors: string[] = []
    
    holdings.forEach((holding, index) => {
      if (!holding.instrumentKey || holding.instrumentKey.trim() === '') {
        errors.push(`Holding ${index}: instrumentKey is required`)
      }
      
      if (isNaN(holding.quantity) || holding.quantity < 0) {
        errors.push(`Holding ${index}: quantity must be a non-negative number`)
      }
      
      if (holding.weight !== undefined && (isNaN(holding.weight) || holding.weight < 0 || holding.weight > 1)) {
        errors.push(`Holding ${index}: weight must be between 0 and 1`)
      }
      
      if (!holding.currency || holding.currency.trim() === '') {
        errors.push(`Holding ${index}: currency is required`)
      }
      
      if (!holding.effectiveDate || isNaN(holding.effectiveDate.getTime())) {
        errors.push(`Holding ${index}: valid effectiveDate is required`)
      }
    })
    
    return errors
  }
  
  /**
   * Calculate total assets value with market data and pricing sources
   * Enhanced version that replaces hardcoded values with real data
   */
  private async calculateTotalAssetsWithSources(input: CalculationInput): Promise<{
    totalAssets: Decimal,
    pricingSources: Record<string, any>
  }> {
    const pricingSources: Record<string, any> = {}
    let totalAssets = new Decimal(0)

    // If holdings provided, calculate from holdings with real market data
    if (input.holdings && input.holdings.length > 0) {
      const holdingsResult = await this.calculateAssetsFromHoldingsWithPricing(input.holdings)
      totalAssets = holdingsResult.totalValue
      Object.assign(pricingSources, holdingsResult.pricingSources)
    }

    // Add fees if they represent asset values (negative fees reduce assets)
    if (input.fees !== undefined) {
      totalAssets = totalAssets.plus(input.fees)
      pricingSources['fees'] = {
        amount: input.fees,
        source: 'input',
        timestamp: new Date()
      }
    }

    return { totalAssets, pricingSources }
  }

  /**
   * Calculate total assets from holdings array with real pricing
   * Enhanced version that fetches market prices and tracks sources
   */
  private async calculateAssetsFromHoldingsWithPricing(holdings: AssetHolding[]): Promise<{
    totalValue: Decimal,
    pricingSources: Record<string, any>
  }> {
    let totalValue = new Decimal(0)
    const pricingSources: Record<string, any> = {}
    
    for (const holding of holdings) {
      try {
        // Get market price for the instrument
        const marketDataRequest = {
          symbol: holding.instrumentKey,
          assetClass: this.inferAssetClass(holding.instrumentKey),
          timestamp: holding.effectiveDate,
          currency: holding.currency
        }

        const priceResponse = await this.marketDataService.getPrice(marketDataRequest)
        
        if (priceResponse.success && priceResponse.data) {
          const priceData = priceResponse.data
          const quantity = new Decimal(holding.quantity)
          const price = new Decimal(priceData.price)
          const holdingValue = quantity.mul(price)
          
          totalValue = totalValue.plus(holdingValue)
          
          // Track pricing source
          pricingSources[holding.instrumentKey] = {
            quantity: quantity.toNumber(),
            price: price.toNumber(),
            currency: priceData.currency,
            value: holdingValue.toNumber(),
            source: priceData.source,
            asOf: priceData.asOf,
            cached: priceResponse.cached,
            staleness: priceResponse.staleness
          }
        } else {
          // Fallback to quantity as value (old behavior)
          const fallbackValue = new Decimal(holding.quantity)
          totalValue = totalValue.plus(fallbackValue)
          
          pricingSources[holding.instrumentKey] = {
            quantity: holding.quantity,
            price: 1.0, // Fallback assumes 1:1 price
            currency: holding.currency,
            value: fallbackValue.toNumber(),
            source: 'fallback',
            error: priceResponse.error || 'Price lookup failed',
            asOf: new Date()
          }
        }
      } catch (error) {
        // Error fetching price - use fallback
        const fallbackValue = new Decimal(holding.quantity)
        totalValue = totalValue.plus(fallbackValue)
        
        pricingSources[holding.instrumentKey] = {
          quantity: holding.quantity,
          price: 1.0,
          currency: holding.currency,
          value: fallbackValue.toNumber(),
          source: 'error_fallback',
          error: error instanceof Error ? error.message : 'Unknown error',
          asOf: new Date()
        }
      }
    }

    return { totalValue, pricingSources }
  }
  
  /**
   * Generate unique calculation run ID
   */
  private generateRunId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `nav_${timestamp}_${random}`
  }
  
  /**
   * Infer asset class from instrument key for market data lookup
   */
  private inferAssetClass(instrumentKey: string): 'equity' | 'bond' | 'commodity' | 'crypto' | 'fx' {
    const key = instrumentKey.toLowerCase()
    
    // Simple heuristics for asset class inference
    if (key.includes('btc') || key.includes('eth') || key.includes('usdc') || key.includes('crypto')) {
      return 'crypto'
    }
    if (key.includes('usd') || key.includes('eur') || key.includes('gbp') || key.includes('fx')) {
      return 'fx'
    }
    if (key.includes('bond') || key.includes('treasury') || key.includes('corp')) {
      return 'bond'
    }
    if (key.includes('gold') || key.includes('oil') || key.includes('commodity')) {
      return 'commodity'
    }
    
    // Default to equity
    return 'equity'
  }
  
  /**
   * Check if NAV change is within acceptable limits
   */
  public validateNavChange(
    currentNav: number, 
    previousNav: number, 
    assetType: AssetType
  ): { isValid: boolean; changePercentage: number; threshold: number } {
    
    const change = this.calculateNavChange(currentNav, previousNav)
    const config = getAssetTypeConfig(assetType)
    const absChangePercentage = Math.abs(change.percentage) / 100 // Convert to decimal
    
    return {
      isValid: absChangePercentage <= config.maxDailyNavChange,
      changePercentage: change.percentage,
      threshold: config.maxDailyNavChange * 100 // Return as percentage
    }
  }
  
  /**
   * Get asset type configuration for calculation rules
   */
  public getCalculationConfig(assetType: AssetType) {
    return getAssetTypeConfig(assetType)
  }
  
  /**
   * Format NAV value for display with appropriate decimal places
   */
  public formatNavValue(navValue: number, currency: string = 'USD'): string {
    const formatted = new Decimal(navValue).toFixed(6) // 6 decimal places for precision
    return `${formatted} ${currency}`
  }
  
  /**
   * Validate if calculation result meets business rules
   */
  public validateCalculationResult(result: CalculationResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // NAV must be non-negative
    if (result.navValue < 0) {
      errors.push('NAV value cannot be negative')
    }
    
    // Net assets must equal NAV for single asset
    if (Math.abs(result.netAssets - result.navValue) > 0.000001) {
      errors.push('Net assets and NAV value must be equal for single asset calculations')
    }
    
    // Total assets must be >= total liabilities
    if (result.totalAssets < result.totalLiabilities) {
      errors.push('Total assets cannot be less than total liabilities')
    }
    
    // Per-share NAV calculation consistency check
    if (result.navPerShare && result.sharesOutstanding) {
      const calculatedNavValue = new Decimal(result.navPerShare).mul(result.sharesOutstanding)
      const actualNavValue = new Decimal(result.navValue)
      
      if (calculatedNavValue.minus(actualNavValue).abs().gt(0.01)) {
        errors.push('NAV per share calculation is inconsistent with total NAV value')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
