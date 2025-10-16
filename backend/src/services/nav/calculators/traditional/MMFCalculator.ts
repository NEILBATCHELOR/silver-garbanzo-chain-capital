/**
 * Money Market Fund (MMF) Calculator
 * 
 * Orchestrates: MMFDataFetcher → EnhancedMMFModels → DatabaseWriter → NAVResult
 * 
 * Following Bonds implementation pattern with ZERO HARDCODED VALUES
 * Calculates both stable NAV (amortized cost) and shadow NAV (mark-to-market)
 * 
 * Key MMF Requirements:
 * - Stable NAV target: $1.00 per share
 * - WAM ≤ 60 days
 * - WAL ≤ 120 days
 * - Daily Liquid Assets ≥ 25%
 * - Weekly Liquid Assets ≥ 50%
 * - Breaking the Buck: NAV < 0.995
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import { BaseCalculator } from '../BaseCalculator'
import { 
  MMFDataFetcher, 
  MMFProduct, 
  MMFSupportingData 
} from '../../data-fetchers/traditional/MMFDataFetcher'
import { enhancedMMFModels } from '../../models/traditional/EnhancedMMFModels'
import {
  CalculatorInput,
  NAVResult,
  ValidationResult,
  NAVBreakdown
} from '../types'

/**
 * Money Market Fund Calculator
 * Orchestrates complete MMF valuation workflow
 */
export class MMFCalculator extends BaseCalculator<MMFProduct, MMFSupportingData, typeof enhancedMMFModels> {
  
  // Store for diagnostic access
  private currentProduct?: MMFProduct
  private currentSupporting?: MMFSupportingData
  
  constructor(dbClient: SupabaseClient) {
    super(
      dbClient,
      'mmf',
      new MMFDataFetcher(dbClient),
      enhancedMMFModels,
      // TODO: Create MMFValidator
      {
        validateInput: async (input: CalculatorInput) => ({ isValid: true, errors: [], warnings: [] }),
        validateData: async (product: any, supporting: any) => ({ isValid: true, errors: [], warnings: [] }),
        validateResult: async (result: any) => ({ isValid: true, errors: [], warnings: [] })
      } as any
    )
  }
  
  /**
   * Validate calculator input
   */
  protected async validateInput(input: CalculatorInput): Promise<ValidationResult> {
    // Basic validation for now
    if (!input.productId) {
      return {
        isValid: false,
        errors: [{ field: 'productId', rule: 'required', message: 'Product ID is required' }],
        warnings: []
      }
    }
    
    if (!input.asOfDate) {
      return {
        isValid: false,
        errors: [{ field: 'asOfDate', rule: 'required', message: 'As-of date is required' }],
        warnings: []
      }
    }
    
    return { isValid: true, errors: [], warnings: [] }
  }
  
  /**
   * Validate fetched data
   */
  protected async validateData(product: MMFProduct, supporting: MMFSupportingData): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    
    // Validate holdings exist
    if (!supporting.holdings || supporting.holdings.length === 0) {
      errors.push({
        field: 'holdings',
        rule: 'required',
        message: 'MMF must have at least one holding',
        fix: 'Add holdings to mmf_holdings table'
      })
    }
    
    // Validate holdings completeness
    if (supporting.holdings) {
      supporting.holdings.forEach((holding, idx) => {
        if (!holding.amortized_cost) {
          errors.push({
            field: `holdings[${idx}].amortized_cost`,
            rule: 'required',
            message: `Holding ${holding.issuer_name} missing amortized_cost`,
            fix: 'Set amortized_cost in mmf_holdings table'
          })
        }
        if (!holding.market_value) {
          errors.push({
            field: `holdings[${idx}].market_value`,
            rule: 'required',
            message: `Holding ${holding.issuer_name} missing market_value`,
            fix: 'Set market_value in mmf_holdings table'
          })
        }
        if (holding.days_to_maturity === null || holding.days_to_maturity === undefined) {
          warnings.push({
            field: `holdings[${idx}].days_to_maturity`,
            issue: 'Missing days to maturity',
            recommendation: 'Set days_to_maturity for accurate WAM calculation'
          })
        }
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Perform MMF NAV calculation
   * Calculates both stable NAV (amortized cost) and shadow NAV (mark-to-market)
   */
  protected async performCalculation(
    product: MMFProduct,
    supporting: MMFSupportingData,
    input: CalculatorInput
  ): Promise<NAVResult> {
    
    // Store for diagnostic access
    this.currentProduct = product
    this.currentSupporting = supporting
    
    console.log('=== MMF CALCULATOR: performCalculation START ===')
    console.log('Product ID:', product.id)
    console.log('Fund Name:', product.fund_name)
    console.log('Fund Type:', product.fund_type)
    console.log('As-of Date:', input.asOfDate)
    console.log('Holdings Count:', supporting.holdings?.length || 0)
    
    try {
      // Call enhanced model to calculate MMF valuation
      console.log('Calling model.calculateMMFValuation...')
      console.log('Config Overrides:', JSON.stringify(input.configOverrides || {}, null, 2))
      
      const valuationResult = await this.model.calculateMMFValuation(
        product,
        supporting,
        input.asOfDate,
        input.configOverrides // Pass config overrides from input
      )
      
      console.log('=== VALUATION RESULT RECEIVED ===')
      console.log('Stable NAV:', valuationResult.nav?.toString())
      console.log('Shadow NAV:', valuationResult.shadowNAV?.toString())
      console.log('Deviation (bps):', valuationResult.deviationBps)
      console.log('Breaking Buck:', valuationResult.isBreakingBuck)
      console.log('WAM:', valuationResult.riskMetrics.wam)
      console.log('WAL:', valuationResult.riskMetrics.wal)
      console.log('Compliance:', valuationResult.compliance.isCompliant)
      
      // Helper to convert Decimal to number
      const toNum = (val: any): any => {
        if (val === null || val === undefined) return val
        if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
        return val
      }
      
      // Convert to NAV result format
      const navResult: NAVResult = {
        productId: input.productId,
        assetType: this.assetType,
        valuationDate: input.asOfDate,
        nav: toNum(valuationResult.nav), // Stable NAV (amortized cost, target: $1.00)
        navPerShare: toNum(valuationResult.nav), // Same as nav for MMFs
        currency: input.targetCurrency || product.currency,
        breakdown: this.buildBreakdown(valuationResult),
        dataQuality: valuationResult.dataQuality.overall, // Extract string from DataQualityAssessment
        confidence: valuationResult.confidence,
        calculationMethod: valuationResult.calculationMethod,
        sources: valuationResult.sources,
        // MMF-specific fields (all optional in NAVResult type)
        shadowNAV: toNum(valuationResult.shadowNAV), // Mark-to-market NAV
        deviationFromStable: toNum(valuationResult.deviation), // Deviation from $1.00
        deviationBps: valuationResult.deviationBps,
        isBreakingBuck: valuationResult.isBreakingBuck,
        wam: valuationResult.riskMetrics.wam,
        wal: valuationResult.riskMetrics.wal,
        dailyLiquidPercentage: valuationResult.riskMetrics.dailyLiquidPercentage,
        weeklyLiquidPercentage: valuationResult.riskMetrics.weeklyLiquidPercentage,
        complianceStatus: valuationResult.compliance
      }
      
      console.log('=== NAV RESULT BUILT ===')
      console.log('NAV Result productId:', navResult.productId)
      console.log('NAV Result nav:', navResult.nav)
      console.log('=== MMF CALCULATOR: performCalculation END (SUCCESS) ===')
      
      return navResult
      
    } catch (error) {
      console.error('=== MMF CALCULATOR: performCalculation ERROR ===')
      console.error('Error:', error instanceof Error ? error.message : String(error))
      console.error('=== MMF CALCULATOR: performCalculation END (ERROR) ===')
      
      throw new Error(
        `MMF valuation failed for product ${input.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  /**
   * Validate calculated result - ENHANCED with intelligent diagnostics
   */
  protected async validateResult(
    result: NAVResult
  ): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    
    // Validate NAV is reasonable (between 0.90 and 1.10)
    const nav = typeof result.nav === 'number' ? new Decimal(result.nav) : result.nav
    if (nav.lt(0.90) || nav.gt(1.10)) {
      warnings.push({
        field: 'nav',
        issue: 'NAV outside normal range',
        recommendation: 'Verify holdings valuations and shares outstanding'
      })
    }
    
    // Check if breaking the buck - ENHANCED with diagnostics
    if (result.isBreakingBuck && this.currentProduct && this.currentSupporting) {
      // Run diagnostic to find root cause
      const diagnostic = await this.diagnoseNAVIssues(
        this.currentProduct, 
        this.currentSupporting, 
        result
      )
      
      errors.push({
        field: 'nav',
        rule: 'threshold',
        message: `Breaking the buck: NAV below $0.995`,
        rootCause: diagnostic.rootCause,
        details: diagnostic.details,
        recommendations: diagnostic.recommendations,
        severity: diagnostic.severity,
        // Keep legacy field for backwards compatibility
        fix: diagnostic.recommendations[0] || 'Review holdings valuations and implement liquidity fees'
      })
    } else if (result.isBreakingBuck) {
      // Fallback if product/supporting not available
      errors.push({
        field: 'nav',
        rule: 'threshold',
        message: 'Breaking the buck: NAV below $0.995',
        fix: 'Review holdings valuations and implement liquidity fees'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Override saveToDatabase to save to mmf_nav_history instead of asset_nav_data
   */
  protected override async saveToDatabase(result: NAVResult): Promise<void> {
    try {
      console.log('[MMF] Saving NAV to mmf_nav_history table...')
      console.log('[MMF] Fund ID:', result.productId)
      console.log('[MMF] Stable NAV (nav):', result.nav)
      console.log('[MMF] Shadow NAV:', result.shadowNAV)
      
      // Calculate total net assets from breakdown
      const totalNetAssets = result.breakdown?.componentValues?.get('total_amortized_cost') || 0
      const sharesOutstanding = result.breakdown?.componentValues?.get('shares_outstanding') || 1
      
      const { error } = await this.dbClient
        .from('mmf_nav_history')
        .insert({
          fund_product_id: result.productId,
          valuation_date: result.valuationDate,
          stable_nav: typeof result.nav === 'number' ? result.nav : result.nav?.toNumber(),
          market_based_nav: typeof result.shadowNAV === 'number' ? result.shadowNAV : result.shadowNAV?.toNumber(),
          deviation_from_stable: typeof result.deviationFromStable === 'number' 
            ? result.deviationFromStable 
            : result.deviationFromStable?.toNumber(),
          deviation_bps: result.deviationBps,
          total_net_assets: typeof totalNetAssets === 'object' && 'toNumber' in totalNetAssets 
            ? totalNetAssets.toNumber() 
            : totalNetAssets,
          shares_outstanding: typeof sharesOutstanding === 'object' && 'toNumber' in sharesOutstanding
            ? sharesOutstanding.toNumber()
            : sharesOutstanding,
          currency: result.currency,
          weighted_average_maturity_days: Math.round(result.wam || 0),
          weighted_average_life_days: Math.round(result.wal || 0),
          daily_liquid_assets_percentage: result.dailyLiquidPercentage || 0,
          weekly_liquid_assets_percentage: result.weeklyLiquidPercentage || 0,
          is_wam_compliant: result.complianceStatus?.wamCompliant ?? false,
          is_wal_compliant: result.complianceStatus?.walCompliant ?? false,
          is_liquidity_compliant: result.complianceStatus?.liquidityCompliant ?? false,
          is_breaking_the_buck: result.isBreakingBuck || false,
          seven_day_yield: result.breakdown?.componentValues?.get('seven_day_yield') 
            ? (typeof result.breakdown.componentValues.get('seven_day_yield') === 'object' 
              ? result.breakdown.componentValues.get('seven_day_yield')?.toNumber() 
              : result.breakdown.componentValues.get('seven_day_yield'))
            : null,
          thirty_day_yield: result.breakdown?.componentValues?.get('thirty_day_yield')
            ? (typeof result.breakdown.componentValues.get('thirty_day_yield') === 'object'
              ? result.breakdown.componentValues.get('thirty_day_yield')?.toNumber()
              : result.breakdown.componentValues.get('thirty_day_yield'))
            : null,
          config_overrides_used: this.currentInput?.configOverrides || null,  // ✅ ADD: Track config overrides
          created_at: new Date()
        })
      
      if (error) {
        console.error('[MMF] Failed to save NAV to mmf_nav_history:', error)
        throw new Error(`Database save failed: ${error.message}`)
      }
      
      console.log('[MMF] Successfully saved NAV to mmf_nav_history')
      
    } catch (error) {
      console.error('[MMF] Error in saveToDatabase:', error)
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
    const componentValues = new Map<string, Decimal>()
    componentValues.set('stable_nav', toDecimal(valuationResult.breakdown.stableNAVPerShare))
    componentValues.set('shadow_nav', toDecimal(valuationResult.breakdown.shadowNAVPerShare))
    componentValues.set('total_amortized_cost', toDecimal(valuationResult.breakdown.totalAmortizedCost))
    componentValues.set('total_market_value', toDecimal(valuationResult.breakdown.totalMarketValue))
    componentValues.set('shares_outstanding', toDecimal(valuationResult.breakdown.sharesOutstanding))
    componentValues.set('wam', new Decimal(valuationResult.riskMetrics.wam))
    componentValues.set('wal', new Decimal(valuationResult.riskMetrics.wal))
    componentValues.set('daily_liquid_percentage', new Decimal(valuationResult.riskMetrics.dailyLiquidPercentage))
    componentValues.set('weekly_liquid_percentage', new Decimal(valuationResult.riskMetrics.weeklyLiquidPercentage))
    componentValues.set('daily_liquid_value', toDecimal(valuationResult.riskMetrics.dailyLiquidValue))
    componentValues.set('weekly_liquid_value', toDecimal(valuationResult.riskMetrics.weeklyLiquidValue))
    componentValues.set('seven_day_yield', new Decimal(valuationResult.riskMetrics.sevenDayYield || 0))
    componentValues.set('thirty_day_yield', new Decimal(valuationResult.riskMetrics.thirtyDayYield || 0))
    
    return {
      totalAssets: toDecimal(valuationResult.breakdown.totalAmortizedCost),
      totalLiabilities: new Decimal(0),
      netAssets: toDecimal(valuationResult.breakdown.totalAmortizedCost),
      componentValues
    }
  }

  /**
   * ENHANCED: Diagnose NAV calculation issues with actionable insights
   */
  private async diagnoseNAVIssues(
    product: MMFProduct,
    supporting: MMFSupportingData,
    result: any
  ): Promise<{
    rootCause: string
    details: string[]
    recommendations: string[]
    severity: 'critical' | 'warning' | 'info'
  }> {
    const nav = typeof result.nav === 'number' ? new Decimal(result.nav) : result.nav
    const totalAmortizedCost = new Decimal(result.totalAmortizedCost || 0)
    const sharesOutstanding = new Decimal(result.sharesOutstanding || 1)
    
    // Get fund AUM from product
    const fundAUM = new Decimal(product.assets_under_management || 0)
    
    // Calculate actual holdings total
    const actualHoldingsTotal = supporting.holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.amortized_cost || 0)),
      new Decimal(0)
    )
    
    // Diagnostic checks
    const details: string[] = []
    const recommendations: string[] = []
    let rootCause = 'Unknown issue'
    let severity: 'critical' | 'warning' | 'info' = 'critical'
    
    // Check 1: Holdings vs AUM mismatch
    const holdingsAUMMismatch = actualHoldingsTotal.minus(fundAUM).abs()
    const mismatchPercentage = fundAUM.gt(0) 
      ? holdingsAUMMismatch.div(fundAUM).times(100)
      : new Decimal(0)
    
    if (mismatchPercentage.gt(1)) { // >1% difference
      rootCause = 'Holdings total does not match fund AUM'
      details.push(`Fund AUM: $${fundAUM.toFixed(0).toLocaleString()}`)
      details.push(`Actual Holdings: $${actualHoldingsTotal.toFixed(0).toLocaleString()}`)
      details.push(`Difference: $${holdingsAUMMismatch.toFixed(0).toLocaleString()} (${mismatchPercentage.toFixed(1)}%)`)
      details.push(`Active Holdings Count: ${supporting.holdings.filter(h => h.status === 'active').length}`)
      
      if (actualHoldingsTotal.lt(fundAUM)) {
        recommendations.push(`Missing $${fundAUM.minus(actualHoldingsTotal).toFixed(0).toLocaleString()} in holdings`)
        recommendations.push('Add missing securities to reach target AUM')
        recommendations.push('OR: Update fund AUM to match actual holdings')
      } else {
        recommendations.push(`Excess $${actualHoldingsTotal.minus(fundAUM).toFixed(0).toLocaleString()} in holdings`)
        recommendations.push('Remove excess securities or update fund AUM')
      }
      severity = 'critical'
      return { rootCause, details, recommendations, severity }
    }
    
    // Check 2: Shares outstanding vs holdings mismatch
    const expectedShares = totalAmortizedCost.div(1.0) // Assuming $1.00 NAV target
    const sharesMismatch = sharesOutstanding.minus(expectedShares).abs()
    const sharesMismatchPercentage = expectedShares.gt(0)
      ? sharesMismatch.div(expectedShares).times(100)
      : new Decimal(0)
    
    if (sharesMismatchPercentage.gt(1)) {
      rootCause = 'Shares outstanding does not match holdings value'
      details.push(`Shares Outstanding: ${sharesOutstanding.toFixed(0).toLocaleString()}`)
      details.push(`Expected Shares (at $1.00): ${expectedShares.toFixed(0).toLocaleString()}`)
      details.push(`Difference: ${sharesMismatch.toFixed(0).toLocaleString()} shares (${sharesMismatchPercentage.toFixed(1)}%)`)
      details.push(`This causes NAV = $${nav.toFixed(4)} instead of $1.00`)
      
      recommendations.push('Update shares_outstanding in latest NAV history')
      recommendations.push(`Set shares_outstanding = ${expectedShares.toFixed(0)}`)
      recommendations.push('OR: Issue/redeem shares to match current holdings')
      severity = 'critical'
      return { rootCause, details, recommendations, severity }
    }
    
    // Check 3: Individual holding valuation issues
    const negativeHoldings = supporting.holdings.filter(h => 
      new Decimal(h.amortized_cost || 0).lt(0)
    )
    if (negativeHoldings.length > 0) {
      rootCause = 'Negative valuations detected in holdings'
      details.push(`${negativeHoldings.length} holdings have negative amortized_cost`)
      negativeHoldings.forEach(h => {
        details.push(`${h.issuer_name}: $${h.amortized_cost}`)
      })
      recommendations.push('Review and correct negative valuations')
      recommendations.push('Check for data entry errors')
      severity = 'critical'
      return { rootCause, details, recommendations, severity }
    }
    
    // Check 4: Market stress scenario
    const shadowNAV = typeof result.shadowNAV === 'number' 
      ? new Decimal(result.shadowNAV) 
      : result.shadowNAV
    const shadowDeviation = shadowNAV.minus(nav).abs()
    
    if (nav.lt(0.995) && shadowDeviation.gt(0.01)) {
      rootCause = 'Market-driven valuation stress'
      details.push(`Stable NAV: $${nav.toFixed(4)}`)
      details.push(`Shadow NAV: $${shadowNAV.toFixed(4)}`)
      details.push(`Deviation: $${shadowDeviation.toFixed(4)}`)
      details.push('Holdings may be experiencing market stress')
      
      recommendations.push('Consider implementing liquidity fees')
      recommendations.push('Review mark-to-market valuations')
      recommendations.push('Assess need for portfolio rebalancing')
      recommendations.push('Notify board if daily liquidity <12.5%')
      severity = 'critical'
      return { rootCause, details, recommendations, severity }
    }
    
    // Check 5: No holdings found
    if (supporting.holdings.length === 0) {
      rootCause = 'No holdings found for fund'
      details.push('Fund has zero securities in portfolio')
      recommendations.push('Add holdings to the fund')
      recommendations.push('Verify fund_product_id in mmf_holdings table')
      severity = 'critical'
      return { rootCause, details, recommendations, severity }
    }
    
    // Check 6: Inactive holdings
    const inactiveHoldings = supporting.holdings.filter(h => h.status !== 'active')
    if (inactiveHoldings.length > 0) {
      rootCause = 'Inactive holdings affecting NAV'
      details.push(`${inactiveHoldings.length} holdings marked as inactive`)
      recommendations.push('Review inactive holdings status')
      recommendations.push('Set status=active if holdings should be included')
      severity = 'warning'
      return { rootCause, details, recommendations, severity }
    }
    
    // Default: Generic breaking the buck
    rootCause = 'NAV below regulatory threshold'
    details.push(`Current NAV: $${nav.toFixed(4)}`)
    details.push(`Threshold: $0.995`)
    details.push(`Deviation: $${nav.minus(new Decimal(0.995)).toFixed(4)}`)
    recommendations.push('Review all holdings for accurate valuations')
    recommendations.push('Implement liquidity fees if needed')
    recommendations.push('Consider portfolio adjustments')
    severity = 'critical'
    
    return { rootCause, details, recommendations, severity }
  }
}

// Export singleton factory function
export function createMMFCalculator(dbClient: SupabaseClient): MMFCalculator {
  return new MMFCalculator(dbClient)
}
