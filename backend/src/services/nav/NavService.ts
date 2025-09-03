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
      
      // Calculate total assets
      const totalAssets = await this.calculateTotalAssets(input)
      
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
      
      // Build calculation result
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
        currency: input.targetCurrency || 'USD',
        fxRateUsed: 1.0, // TODO: Implement FX conversion in future phases
        pricingSources: {}, // TODO: Populate from market data service in future phases
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
   * Calculate total assets value from holdings or simple input
   */
  private async calculateTotalAssets(input: CalculationInput): Promise<Decimal> {
    // If holdings provided, calculate from holdings
    if (input.holdings && input.holdings.length > 0) {
      return this.calculateAssetsFromHoldings(input.holdings)
    }
    
    // For basic implementation, use simple asset value calculation
    // This will be enhanced with market data integration in future phases
    let totalAssets = new Decimal(0)
    
    // Add fees if they represent asset values (negative fees reduce assets)
    if (input.fees !== undefined) {
      totalAssets = totalAssets.plus(input.fees)
    }
    
    // For now, if no holdings provided and no explicit asset value,
    // return zero (this will be enhanced with database lookups)
    return totalAssets
  }
  
  /**
   * Calculate total assets from holdings array
   */
  private calculateAssetsFromHoldings(holdings: AssetHolding[]): Decimal {
    let totalValue = new Decimal(0)
    
    for (const holding of holdings) {
      // For basic implementation, use quantity as value
      // This will be enhanced with price lookup in market data service
      const holdingValue = new Decimal(holding.quantity)
      totalValue = totalValue.plus(holdingValue)
    }
    
    return totalValue
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
