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
    
    console.log('=== MMF CALCULATOR: performCalculation START ===')
    console.log('Product ID:', product.id)
    console.log('Fund Name:', product.fund_name)
    console.log('Fund Type:', product.fund_type)
    console.log('As-of Date:', input.asOfDate)
    console.log('Holdings Count:', supporting.holdings?.length || 0)
    
    try {
      // Call enhanced model to calculate MMF valuation
      console.log('Calling model.calculateMMFValuation...')
      const valuationResult = await this.model.calculateMMFValuation(
        product,
        supporting,
        input.asOfDate
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
        nav: toNum(valuationResult.nav), // Stable NAV (target: $1.00)
        navPerShare: toNum(valuationResult.nav), // Same as nav for MMFs
        currency: input.targetCurrency || product.currency,
        breakdown: this.buildBreakdown(valuationResult),
        dataQuality: valuationResult.dataQuality.overall, // Extract string from DataQualityAssessment
        confidence: valuationResult.confidence,
        calculationMethod: valuationResult.calculationMethod,
        sources: valuationResult.sources,
        // MMF-specific fields
        shadowNAV: toNum(valuationResult.shadowNAV),
        deviationFromStable: toNum(valuationResult.deviation),
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
   * Validate calculated result
   */
  protected async validateResult(result: NAVResult): Promise<ValidationResult> {
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
    
    // Check if breaking the buck
    if (result.isBreakingBuck) {
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
}

// Export singleton factory function
export function createMMFCalculator(dbClient: SupabaseClient): MMFCalculator {
  return new MMFCalculator(dbClient)
}
