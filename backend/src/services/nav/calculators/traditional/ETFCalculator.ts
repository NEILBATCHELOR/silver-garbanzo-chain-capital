/**
 * ETF Calculator
 * 
 * Orchestrates: ETFDataFetcher → EnhancedETFModels → DatabaseWriter → NAVResult
 * 
 * Following MMF/Bonds implementation pattern with ZERO HARDCODED VALUES
 * Calculates NAV via mark-to-market, premium/discount, and tracking metrics
 * 
 * Key ETF Requirements:
 * - NAV = (Sum of Holdings Market Value) / Shares Outstanding
 * - Premium/Discount = (Market Price - NAV) / NAV
 * - Tracking Error = StdDev(ETF Returns - Benchmark Returns)
 * - Supports crypto holdings with staking yields
 * - Supports share classes (different expense ratios)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import { BaseCalculator } from '../BaseCalculator'
import { 
  ETFDataFetcher, 
  ETFProduct, 
  ETFSupportingData,
  ETFHolding
} from '../../data-fetchers/traditional/ETFDataFetcher'
import { enhancedETFModels } from '../../models/traditional/EnhancedETFModels'
import { etfValidator } from '../validators/ETFValidator'
import {
  CalculatorInput,
  NAVResult,
  ValidationResult,
  NAVBreakdown
} from '../types'
import { MarketDataService, createMarketDataService } from '../../market-data'

/**
 * ETF Calculator
 * Orchestrates complete ETF valuation workflow
 */
export class ETFCalculator extends BaseCalculator<ETFProduct, ETFSupportingData, typeof enhancedETFModels> {
  
  // Store for diagnostic access
  private currentProduct?: ETFProduct
  private currentSupporting?: ETFSupportingData
  
  // Market data service for real-time pricing
  private readonly marketDataService: MarketDataService
  
  constructor(
    dbClient: SupabaseClient,
    marketDataConfig: Parameters<typeof createMarketDataService>[0]
  ) {
    super(
      dbClient,
      'etf',
      new ETFDataFetcher(dbClient),
      enhancedETFModels,
      etfValidator
    )
    
    // Initialize market data service (required for ETF pricing)
    this.marketDataService = createMarketDataService(marketDataConfig)
  }
  
  /**
   * Validate calculator input
   */
  protected async validateInput(input: CalculatorInput): Promise<ValidationResult> {
    return await this.validator.validateInput(input)
  }
  
  /**
   * Validate fetched data using comprehensive validator
   */
  protected async validateData(product: ETFProduct, supporting: ETFSupportingData): Promise<ValidationResult> {
    const detailedResult = this.validator.validateDataComprehensive(
      product,
      supporting
    )
    
    // Convert to standard ValidationResult format
    return {
      isValid: detailedResult.isValid,
      errors: detailedResult.errors.map((e: any) => ({
        field: e.field,
        rule: e.rule,
        message: e.message,
        value: e.value,
        fix: e.fix,
        table: e.table,
        severity: e.severity,
        context: e.context
      })),
      warnings: detailedResult.warnings.map((w: any) => ({
        field: w.field,
        issue: w.issue,
        recommendation: w.recommendation,
        table: w.table,
        impact: w.impact
      })),
      summary: detailedResult.summary,
      info: detailedResult.info
    }
  }
  
  /**
   * Enrich holdings with real-time market prices
   * Fetches current prices for all securities using MarketDataService
   */
  private async enrichHoldingsWithMarketPrices(
    holdings: ETFHolding[],
    asOfDate: Date
  ): Promise<ETFHolding[]> {
    
    if (!holdings || holdings.length === 0) {
      return holdings
    }
    
    console.log(`🔄 Enriching ${holdings.length} holdings with real-time prices...`)
    
    try {
      // Build batch price requests
      const priceRequests = holdings.map(holding => ({
        securityType: holding.security_type as 'equity' | 'crypto' | 'bond',
        identifier: holding.security_ticker || holding.security_name || holding.blockchain || '',
        date: asOfDate,
        currency: holding.currency || 'USD'
      }))
      
      // Fetch prices in batch
      const priceResult = await this.marketDataService.getBatchPrices({
        securities: priceRequests
      })
      
      console.log(`✅ Retrieved prices for ${priceResult.summary.successful}/${priceResult.summary.total} securities`)
      
      if (priceResult.failures.length > 0) {
        console.warn(`⚠️ Failed to fetch prices for ${priceResult.failures.length} securities:`)
        priceResult.failures.forEach(f => {
          console.warn(`  - ${f.identifier}: ${f.error}`)
        })
      }
      
      // Update holdings with fetched prices
      const enrichedHoldings = holdings.map(holding => {
        const identifier = holding.security_ticker || holding.security_name || holding.blockchain || ''
        const priceData = priceResult.prices.get(identifier)
        
        if (priceData) {
          // Update price and market value
          const newQuantity = holding.quantity
          const newPrice = priceData.price
          const newMarketValue = newQuantity * newPrice
          
          return {
            ...holding,
            price_per_unit: newPrice,
            market_value: newMarketValue,
            price_source: priceData.source,
            price_timestamp: priceData.timestamp
          }
        }
        
        // Keep original values if price not available
        return holding
      })
      
      return enrichedHoldings
      
    } catch (error) {
      console.error('❌ Error enriching holdings with market prices:', error)
      // Return original holdings if enrichment fails
      return holdings
    }
  }
  
  /**
   * Perform ETF NAV calculation
   * Calculates NAV via mark-to-market of holdings
   */
  protected async performCalculation(
    product: ETFProduct,
    supporting: ETFSupportingData,
    input: CalculatorInput
  ): Promise<NAVResult> {
    
    // Store for diagnostic access
    this.currentProduct = product
    this.currentSupporting = supporting
    
    console.log('=== ETF CALCULATOR: performCalculation START ===')
    console.log('Product ID:', product.id)
    console.log('Fund Ticker:', product.fund_ticker)
    console.log('Fund Type:', product.fund_type)
    console.log('Is Crypto ETF:', supporting.metadata?.is_crypto_etf || false)
    console.log('As-of Date:', input.asOfDate)
    console.log('Holdings Count:', supporting.holdings?.length || 0)
    console.log('NAV History Count:', supporting.navHistory?.length || 0)
    
    try {
      // Step 1: Enrich holdings with real-time market prices
      // This fetches current prices for all securities before NAV calculation
      const enrichedHoldings = await this.enrichHoldingsWithMarketPrices(
        supporting.holdings,
        input.asOfDate
      )
      
      // Update supporting data with enriched holdings
      const enrichedSupporting = {
        ...supporting,
        holdings: enrichedHoldings
      }
      
      console.log('✅ Holdings enriched with real-time prices')
      
      // Step 2: Call enhanced model to calculate ETF valuation
      console.log('Calling model.calculateETFValuation...')
      console.log('Config Overrides:', JSON.stringify(input.configOverrides || {}, null, 2))
      
      const valuationResult = await this.model.calculateETFValuation(
        product,
        enrichedSupporting,
        input.asOfDate,
        input.configOverrides
      )
      
      console.log('=== VALUATION RESULT RECEIVED ===')
      console.log('NAV per Share:', valuationResult.navPerShare?.toString())
      console.log('Total Net Assets:', valuationResult.breakdown.netAssets?.toString())
      console.log('Market Price:', valuationResult.marketPrice?.toString())
      console.log('Premium/Discount %:', valuationResult.premiumDiscount?.percentage?.toString())
      console.log('Tracking Error:', valuationResult.trackingMetrics?.trackingError)
      
      // If crypto ETF, log crypto metrics
      if (valuationResult.cryptoMetrics) {
        console.log('Crypto Value:', valuationResult.cryptoMetrics.totalCryptoValue?.toString())
        console.log('Staking Rewards:', valuationResult.cryptoMetrics.stakingRewardsAccrued?.toString())
        console.log('Avg Staking Yield:', valuationResult.cryptoMetrics.averageStakingYield)
      }
      
      // Helper to convert Decimal to number
      const toNum = (val: any): any => {
        if (val === null || val === undefined) return val
        if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
        return val
      }
      
      // Helper to convert confidence score to string
      const confidenceToString = (conf: number): 'high' | 'medium' | 'low' => {
        if (conf >= 0.8) return 'high'
        if (conf >= 0.5) return 'medium'
        return 'low'
      }
      
      // Convert to NAV result format
      const navResult: NAVResult = {
        productId: input.productId,
        assetType: this.assetType,
        valuationDate: input.asOfDate,
        nav: toNum(valuationResult.navPerShare),
        navPerShare: toNum(valuationResult.navPerShare),
        currency: input.targetCurrency || product.currency,
        breakdown: this.buildBreakdown(valuationResult),
        dataQuality: valuationResult.dataQuality.overall,
        confidence: confidenceToString(valuationResult.confidence),
        calculationMethod: valuationResult.calculationMethod,
        sources: valuationResult.sources,
        
        // ETF-specific fields
        marketPrice: toNum(valuationResult.marketPrice),
        premiumDiscountPct: valuationResult.premiumDiscount 
          ? toNum(valuationResult.premiumDiscount.percentage) 
          : undefined,
        trackingError: valuationResult.trackingMetrics?.trackingError || undefined,
        trackingDifference: valuationResult.trackingMetrics?.trackingDifference || undefined,
        
        // Crypto-specific fields
        ...(valuationResult.cryptoMetrics && {
          cryptoValue: toNum(valuationResult.cryptoMetrics.totalCryptoValue),
          stakingRewards: toNum(valuationResult.cryptoMetrics.stakingRewardsAccrued),
          stakingYield: valuationResult.cryptoMetrics.averageStakingYield
        })
      }
      
      console.log('=== NAV RESULT BUILT ===')
      console.log('NAV Result productId:', navResult.productId)
      console.log('NAV Result nav:', navResult.nav)
      console.log('NAV Result premiumDiscountPct:', navResult.premiumDiscountPct)
      console.log('=== ETF CALCULATOR: performCalculation END (SUCCESS) ===')
      
      return navResult
      
    } catch (error) {
      console.error('=== ETF CALCULATOR: performCalculation ERROR ===')
      console.error('Error:', error instanceof Error ? error.message : String(error))
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('=== ETF CALCULATOR: performCalculation END (ERROR) ===')
      
      throw new Error(
        `ETF valuation failed for product ${input.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  /**
   * Validate calculated result
   */
  protected async validateResult(result: NAVResult): Promise<ValidationResult> {
    return await this.validator.validateResult(result)
  }
  
  /**
   * Override saveToDatabase to save to etf_nav_history table
   */
  protected override async saveToDatabase(result: NAVResult): Promise<void> {
    try {
      console.log('[ETF] Saving NAV to etf_nav_history table...')
      console.log('[ETF] Fund ID:', result.productId)
      console.log('[ETF] NAV per Share:', result.nav)
      console.log('[ETF] Market Price:', result.marketPrice)
      console.log('[ETF] Premium/Discount %:', result.premiumDiscountPct)
      
      // Calculate total net assets from breakdown
      const totalNetAssets = result.breakdown?.netAssets 
        ? (typeof result.breakdown.netAssets === 'object' && 'toNumber' in result.breakdown.netAssets
          ? result.breakdown.netAssets.toNumber()
          : result.breakdown.netAssets)
        : 0
      
      const sharesOutstanding = result.breakdown?.componentValues?.get('shares_outstanding')
        ? (typeof result.breakdown.componentValues.get('shares_outstanding') === 'object' && 'toNumber' in result.breakdown.componentValues.get('shares_outstanding')!
          ? result.breakdown.componentValues.get('shares_outstanding')!.toNumber()
          : result.breakdown.componentValues.get('shares_outstanding'))
        : 1
      
      const totalAssets = result.breakdown?.totalAssets
        ? (typeof result.breakdown.totalAssets === 'object' && 'toNumber' in result.breakdown.totalAssets
          ? result.breakdown.totalAssets.toNumber()
          : result.breakdown.totalAssets)
        : 0
      
      const totalLiabilities = result.breakdown?.totalLiabilities
        ? (typeof result.breakdown.totalLiabilities === 'object' && 'toNumber' in result.breakdown.totalLiabilities
          ? result.breakdown.totalLiabilities.toNumber()
          : result.breakdown.totalLiabilities)
        : 0
      
      // Extract ETF-specific values from breakdown
      const cashPosition = result.breakdown?.componentValues?.get('cash_position')
        ? (typeof result.breakdown.componentValues.get('cash_position') === 'object'
          ? result.breakdown.componentValues.get('cash_position')!.toNumber()
          : result.breakdown.componentValues.get('cash_position'))
        : 0
      
      const securitiesValue = result.breakdown?.componentValues?.get('securities_value')
        ? (typeof result.breakdown.componentValues.get('securities_value') === 'object'
          ? result.breakdown.componentValues.get('securities_value')!.toNumber()
          : result.breakdown.componentValues.get('securities_value'))
        : 0
      
      const derivativesValue = result.breakdown?.componentValues?.get('derivatives_value')
        ? (typeof result.breakdown.componentValues.get('derivatives_value') === 'object'
          ? result.breakdown.componentValues.get('derivatives_value')!.toNumber()
          : result.breakdown.componentValues.get('derivatives_value'))
        : 0
      
      // Crypto-specific values
      const cryptoValue = result.cryptoValue 
        ? (typeof result.cryptoValue === 'object' && 'toNumber' in result.cryptoValue
          ? result.cryptoValue.toNumber()
          : result.cryptoValue)
        : 0
        
      const stakingRewardsEarned = result.stakingRewards
        ? (typeof result.stakingRewards === 'object' && 'toNumber' in result.stakingRewards
          ? result.stakingRewards.toNumber()
          : result.stakingRewards)
        : 0
      
      // Premium/discount calculation
      const navNumber = typeof result.nav === 'object' && 'toNumber' in result.nav 
        ? result.nav.toNumber() 
        : result.nav
      const marketPriceNumber = result.marketPrice
        ? (typeof result.marketPrice === 'object' && 'toNumber' in result.marketPrice
          ? result.marketPrice.toNumber()
          : result.marketPrice)
        : null
      
      const premiumDiscountAmount = marketPriceNumber && navNumber
        ? marketPriceNumber - navNumber
        : null
      
      // Prepare insert data
      const insertData: any = {
        fund_product_id: result.productId,
        valuation_date: result.valuationDate,
        nav_per_share: typeof result.nav === 'number' ? result.nav : result.nav?.toNumber(),
        total_net_assets: totalNetAssets,
        shares_outstanding: sharesOutstanding,
        market_price: result.marketPrice || null,
        closing_price: result.marketPrice || null, // Use market price as closing price
        premium_discount_amount: premiumDiscountAmount,
        premium_discount_pct: result.premiumDiscountPct || null,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        cash_position: cashPosition,
        securities_value: securitiesValue,
        derivatives_value: derivativesValue,
        currency: result.currency,
        calculation_method: result.calculationMethod,
        data_quality: result.dataQuality,
        config_overrides_used: this.currentInput?.configOverrides || null,
        created_at: new Date()
      }
      
      // Add crypto-specific fields if present
      if (cryptoValue > 0) {
        insertData.crypto_value = cryptoValue
      }
      if (stakingRewardsEarned > 0) {
        insertData.staking_rewards_earned = stakingRewardsEarned
      }
      
      // Add tracking metrics if present
      if (result.trackingError !== undefined && result.trackingError !== null) {
        insertData.tracking_difference_bps = result.trackingDifference 
          ? result.trackingDifference * 100 
          : null
      }
      
      const { error } = await this.dbClient
        .from('etf_nav_history')
        .insert(insertData)
      
      if (error) {
        console.error('[ETF] Failed to save NAV to etf_nav_history:', error)
        throw new Error(`Database save failed: ${error.message}`)
      }
      
      console.log('[ETF] Successfully saved NAV to etf_nav_history')
      
    } catch (error) {
      console.error('[ETF] Error in saveToDatabase:', error)
      throw error
    }
  }
  
  /**
   * Build NAV breakdown from valuation result
   * Converts all Decimal objects to numbers for JSON serialization
   */
  private buildBreakdown(valuationResult: any): NAVBreakdown {
    // Helper to convert value to Decimal
    const toDecimal = (val: any): Decimal => {
      if (val === null || val === undefined) return new Decimal(0)
      if (typeof val === 'object' && 'toNumber' in val) return val
      return new Decimal(val)
    }
    
    // Build component values Map
    const componentValues: Record<string, any> = {
      shares_outstanding: toDecimal(valuationResult.breakdown.sharesOutstanding),
      cash_position: toDecimal(valuationResult.breakdown.cashPosition),
      securities_value: toDecimal(valuationResult.breakdown.securitiesValue),
      derivatives_value: toDecimal(valuationResult.breakdown.derivativesValue || 0)
    }
    
    // Add crypto metrics if present
    if (valuationResult.cryptoMetrics) {
      componentValues.crypto_value = toDecimal(valuationResult.cryptoMetrics.totalCryptoValue)
      componentValues.staking_rewards_accrued = toDecimal(valuationResult.cryptoMetrics.stakingRewardsAccrued)
      componentValues.average_staking_yield = new Decimal(valuationResult.cryptoMetrics.averageStakingYield || 0)
      
      // Add holdings by chain
      if (valuationResult.cryptoMetrics.holdingsByChain) {
        const chainBreakdown: Record<string, any> = {}
        for (const [chain, value] of valuationResult.cryptoMetrics.holdingsByChain.entries()) {
          chainBreakdown[chain] = toDecimal(value)
        }
        componentValues.holdings_by_chain = chainBreakdown
      }
    }
    
    // Add premium/discount if present
    if (valuationResult.premiumDiscount) {
      componentValues.premium_discount_amount = toDecimal(valuationResult.premiumDiscount.amount)
      componentValues.premium_discount_pct = toDecimal(valuationResult.premiumDiscount.percentage)
      componentValues.premium_discount_status = valuationResult.premiumDiscount.status
    }
    
    // Add tracking metrics if present
    if (valuationResult.trackingMetrics) {
      if (valuationResult.trackingMetrics.trackingError !== null) {
        componentValues.tracking_error = new Decimal(valuationResult.trackingMetrics.trackingError)
      }
      if (valuationResult.trackingMetrics.trackingDifference !== null) {
        componentValues.tracking_difference = new Decimal(valuationResult.trackingMetrics.trackingDifference)
      }
      if (valuationResult.trackingMetrics.correlation !== null) {
        componentValues.correlation = new Decimal(valuationResult.trackingMetrics.correlation)
      }
      if (valuationResult.trackingMetrics.rSquared !== null) {
        componentValues.r_squared = new Decimal(valuationResult.trackingMetrics.rSquared)
      }
    }
    
    return {
      totalAssets: toDecimal(valuationResult.breakdown.totalAssets),
      totalLiabilities: toDecimal(valuationResult.breakdown.totalLiabilities),
      netAssets: toDecimal(valuationResult.breakdown.netAssets),
      componentValues: componentValues as any
    }
  }
}

// Export singleton factory function
export function createETFCalculator(
  dbClient: SupabaseClient,
  marketDataConfig: Parameters<typeof createMarketDataService>[0]
): ETFCalculator {
  return new ETFCalculator(dbClient, marketDataConfig)
}
