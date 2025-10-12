/**
 * Bonds Calculator
 * 
 * Orchestrates: BondsDataFetcher → EnhancedBondModels → DatabaseWriter → NAVResult
 * 
 * Following Phase 5 specifications with ZERO HARDCODED VALUES
 * Routes to appropriate valuation method based on accounting classification
 * 
 * Now uses EnhancedBondsValidator for comprehensive error reporting
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import { BaseCalculator } from '../BaseCalculator'
import { BondsDataFetcher, BondProduct, BondSupportingData } from '../../data-fetchers/traditional/BondsDataFetcher'
import { enhancedBondModels } from '../../models/traditional/EnhancedBondModels'
import { bondsValidator } from '../validators/BondsValidator'
import { enhancedBondsValidator } from '../validators/EnhancedBondsValidator'
import {
  CalculatorInput,
  NAVResult,
  ValidationResult,
  DataSource,
  NAVBreakdown,
  Adjustment
} from '../types'

/**
 * Bonds Calculator
 * Orchestrates complete bond valuation workflow
 */
export class BondsCalculator extends BaseCalculator<BondProduct, BondSupportingData, typeof enhancedBondModels> {
  
  constructor(dbClient: SupabaseClient) {
    super(
      dbClient,
      'bonds',
      new BondsDataFetcher(dbClient),
      enhancedBondModels,
      bondsValidator // Keep for compatibility, but use enhanced in validateData
    )
  }
  
  /**
   * Validate calculator input
   */
  protected async validateInput(input: CalculatorInput): Promise<ValidationResult> {
    return this.validator.validateInput(input)
  }
  
  /**
   * Validate fetched data using Enhanced Validator
   * Returns comprehensive error information with fix instructions
   * Preserves structured error format for API consumption
   */
  protected async validateData(product: BondProduct, supporting: BondSupportingData): Promise<ValidationResult> {
    // Use enhanced validator for comprehensive error reporting
    const detailedResult = enhancedBondsValidator.validateDataComprehensive(
      product,
      supporting
    )
    
    // Preserve structured errors for API consumption
    // Map to standard ValidationResult format while keeping all enhanced fields
    return {
      isValid: detailedResult.isValid,
      errors: detailedResult.errors.map(e => ({
        field: e.field,
        rule: e.rule,
        message: e.message,
        value: e.value,
        // Preserve enhanced validation fields
        fix: e.fix,
        table: e.table,
        severity: e.severity,
        context: e.context
      })),
      warnings: detailedResult.warnings.map(w => ({
        field: w.field,
        issue: w.issue,
        recommendation: w.recommendation,
        table: w.table,
        impact: w.impact
      })),
      // Include summary for better error reporting
      summary: detailedResult.summary,
      info: detailedResult.info
    }
  }
  
  /**
   * Perform NAV calculation
   * Routes to appropriate method based on accounting classification
   */
  protected async performCalculation(
    product: BondProduct,
    supporting: BondSupportingData,
    input: CalculatorInput
  ): Promise<NAVResult> {
    
    console.log('=== BONDS CALCULATOR: performCalculation START ===')
    console.log('Product ID:', product.id)
    console.log('Accounting Treatment:', product.accounting_treatment)
    console.log('As-of Date:', input.asOfDate)
    console.log('Coupon Payments Count:', supporting.couponPayments?.length || 0)
    console.log('Market Prices Count:', supporting.marketPrices?.length || 0)
    
    try {
      // Use enhanced model to calculate bond valuation
      console.log('Calling model.calculateBondValuation...')
      const valuationResult = await this.model.calculateBondValuation(
        product,
        supporting,
        input.asOfDate
      )
      
      console.log('=== VALUATION RESULT RECEIVED ===')
      console.log('Result type:', typeof valuationResult)
      console.log('Result is null?', valuationResult === null)
      console.log('Result is undefined?', valuationResult === undefined)
      
      if (!valuationResult) {
        throw new Error('calculateBondValuation returned null or undefined')
      }
      
      console.log('NAV value:', valuationResult.nav?.toString() || 'undefined')
      console.log('Accounting Method:', valuationResult.accountingMethod)
      console.log('Calculation Method:', valuationResult.calculationMethod)
      console.log('Has breakdown?', !!valuationResult.breakdown)
      console.log('Has riskMetrics?', !!valuationResult.riskMetrics)
      
      // Convert to NAV result format
      console.log('Building NAV result...')
      
      // Helper to convert Decimal to number
      const toNum = (val: any): any => {
        if (val === null || val === undefined) return val
        if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
        return val
      }
      
      const navResult: NAVResult = {
        productId: input.productId,
        assetType: this.assetType,
        valuationDate: input.asOfDate,
        nav: toNum(valuationResult.nav), // Convert Decimal to number
        navPerShare: undefined, // Bonds are priced per unit, not shares
        currency: input.targetCurrency || product.currency,
        breakdown: this.buildBreakdown(valuationResult),
        dataQuality: valuationResult.dataQuality,
        confidence: valuationResult.confidence,
        calculationMethod: valuationResult.calculationMethod,
        sources: valuationResult.sources,
        // Include market comparison if available (HTM bonds)
        marketComparison: valuationResult.marketComparison ? {
          accountingValue: toNum(valuationResult.marketComparison.accountingValue),
          marketValue: toNum(valuationResult.marketComparison.marketValue),
          unrealizedGainLoss: toNum(valuationResult.marketComparison.unrealizedGainLoss),
          marketPriceDate: valuationResult.marketComparison.marketPriceDate,
          marketYTM: toNum(valuationResult.marketComparison.marketYTM),
          accountingYTM: toNum(valuationResult.marketComparison.accountingYTM),
          yieldSpread: toNum(valuationResult.marketComparison.yieldSpread)
        } : undefined
      }
      
      console.log('=== NAV RESULT BUILT ===')
      console.log('NAV Result productId:', navResult.productId)
      console.log('NAV Result nav:', navResult.nav?.toString())
      console.log('NAV Result has breakdown?', !!navResult.breakdown)
      console.log('=== BONDS CALCULATOR: performCalculation END (SUCCESS) ===')
      
      return navResult
      
    } catch (error) {
      console.error('=== BONDS CALCULATOR: performCalculation ERROR ===')
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('=== BONDS CALCULATOR: performCalculation END (ERROR) ===')
      
      // Re-throw with context
      throw new Error(
        `Bond valuation failed for product ${input.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  /**
   * Validate calculated result
   */
  protected async validateResult(result: NAVResult): Promise<ValidationResult> {
    return this.validator.validateResult(result)
  }
  
  /**
   * Build NAV breakdown from valuation result
   * Explicitly convert all Decimal.js objects to numbers for JSON serialization
   */
  private buildBreakdown(valuationResult: any): NAVBreakdown {
    // Helper to convert Decimal to number
    const toNum = (val: any): any => {
      if (val === null || val === undefined) return val
      if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
      return val
    }
    
    // Create component values as plain object with all Decimals converted to numbers
    const componentValues: Record<string, any> = {
      clean_price: toNum(valuationResult.breakdown.cleanPrice),
      accrued_interest: toNum(valuationResult.breakdown.accruedInterest),
      dirty_price: toNum(valuationResult.breakdown.dirtyPrice)
    }
    
    // Add carried value for HTM bonds
    if (valuationResult.breakdown.carriedValue) {
      componentValues.carried_value = toNum(valuationResult.breakdown.carriedValue)
    }
    
    // Add premium/discount if present
    if (valuationResult.breakdown.premium) {
      componentValues.premium = toNum(valuationResult.breakdown.premium)
    }
    if (valuationResult.breakdown.discount) {
      componentValues.discount = toNum(valuationResult.breakdown.discount)
    }
    
    // Add risk metrics as components
    if (valuationResult.riskMetrics) {
      componentValues.ytm = toNum(valuationResult.riskMetrics.ytm)
      componentValues.duration = toNum(valuationResult.riskMetrics.duration)
      componentValues.modified_duration = toNum(valuationResult.riskMetrics.modifiedDuration)
      componentValues.convexity = toNum(valuationResult.riskMetrics.convexity)
      componentValues.bpv = toNum(valuationResult.riskMetrics.bpv)
    }
    
    console.log('=== BUILD BREAKDOWN DEBUG ===')
    console.log('componentValues:', componentValues)
    console.log('componentValues type:', typeof componentValues)
    console.log('componentValues keys:', Object.keys(componentValues))
    
    // Map bond-specific breakdown to standard NAV breakdown
    const breakdown: NAVBreakdown = {
      totalAssets: toNum(valuationResult.breakdown.presentValue),
      totalLiabilities: toNum(new Decimal(0)),
      netAssets: toNum(valuationResult.nav),
      componentValues: componentValues as any
    }
    
    return breakdown
  }
  
  /**
   * Override saveToDatabase to include bond-specific fields
   */
  protected override async saveToDatabase(result: NAVResult): Promise<void> {
    try {
      // Save base NAV data
      await super.saveToDatabase(result)
      
      // Save bond-specific calculation details
      if (result.breakdown?.componentValues) {
        const componentValues = result.breakdown.componentValues as any
        const ytm = componentValues['ytm']
        const duration = componentValues['duration']
        const convexity = componentValues['convexity']
        
        // Could save to a bond-specific results table if needed
        // For now, the base asset_nav_data table is sufficient
        console.log('Bond calculation saved:', {
          productId: result.productId,
          nav: result.nav.toString(),
          ytm: ytm?.toString(),
          duration: duration?.toString(),
          convexity: convexity?.toString(),
          method: result.calculationMethod
        })
      }
    } catch (error) {
      console.error('Error saving bond NAV:', error)
      throw error
    }
  }
}

// Export singleton factory function
export function createBondsCalculator(dbClient: SupabaseClient): BondsCalculator {
  return new BondsCalculator(dbClient)
}
