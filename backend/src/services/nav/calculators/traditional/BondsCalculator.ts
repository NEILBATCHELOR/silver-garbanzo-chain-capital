/**
 * Bonds Calculator
 * 
 * Orchestrates: BondsDataFetcher → EnhancedBondModels → DatabaseWriter → NAVResult
 * 
 * Following Phase 5 specifications with ZERO HARDCODED VALUES
 * Routes to appropriate valuation method based on accounting classification
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import { BaseCalculator } from '../BaseCalculator'
import { BondsDataFetcher, BondProduct, BondSupportingData } from '../../data-fetchers/traditional/BondsDataFetcher'
import { enhancedBondModels } from '../../models/traditional/EnhancedBondModels'
import { bondsValidator } from '../validators/BondsValidator'
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
      bondsValidator
    )
  }
  
  /**
   * Validate calculator input
   */
  protected async validateInput(input: CalculatorInput): Promise<ValidationResult> {
    return this.validator.validateInput(input)
  }
  
  /**
   * Validate fetched data
   */
  protected async validateData(product: BondProduct, supporting: BondSupportingData): Promise<ValidationResult> {
    return this.validator.validateData(product, supporting)
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
    
    try {
      // Use enhanced model to calculate bond valuation
      const valuationResult = await this.model.calculateBondValuation(
        product,
        supporting,
        input.asOfDate
      )
      
      // Convert to NAV result format
      const navResult: NAVResult = {
        productId: input.productId,
        assetType: this.assetType,
        valuationDate: input.asOfDate,
        nav: valuationResult.nav,
        navPerShare: undefined, // Bonds are priced per unit, not shares
        currency: input.targetCurrency || product.currency,
        breakdown: this.buildBreakdown(valuationResult),
        dataQuality: valuationResult.dataQuality,
        confidence: valuationResult.confidence,
        calculationMethod: valuationResult.calculationMethod,
        sources: valuationResult.sources
      }
      
      return navResult
      
    } catch (error) {
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
   */
  private buildBreakdown(valuationResult: any): NAVBreakdown {
    // Map bond-specific breakdown to standard NAV breakdown
    const breakdown: NAVBreakdown = {
      totalAssets: valuationResult.breakdown.presentValue,
      totalLiabilities: new Decimal(0), // Bonds don't have liabilities in this context
      netAssets: valuationResult.nav,
      componentValues: new Map([
        ['clean_price', valuationResult.breakdown.cleanPrice],
        ['accrued_interest', valuationResult.breakdown.accruedInterest],
        ['dirty_price', valuationResult.breakdown.dirtyPrice]
      ])
    }
    
    // Add carried value for HTM bonds
    if (valuationResult.breakdown.carriedValue) {
      breakdown.componentValues?.set('carried_value', valuationResult.breakdown.carriedValue)
    }
    
    // Add premium/discount if present
    if (valuationResult.breakdown.premium) {
      breakdown.componentValues?.set('premium', valuationResult.breakdown.premium)
    }
    if (valuationResult.breakdown.discount) {
      breakdown.componentValues?.set('discount', valuationResult.breakdown.discount)
    }
    
    // Add risk metrics as components
    if (valuationResult.riskMetrics) {
      breakdown.componentValues?.set('ytm', valuationResult.riskMetrics.ytm)
      breakdown.componentValues?.set('duration', valuationResult.riskMetrics.duration)
      breakdown.componentValues?.set('modified_duration', valuationResult.riskMetrics.modifiedDuration)
      breakdown.componentValues?.set('convexity', valuationResult.riskMetrics.convexity)
      breakdown.componentValues?.set('bpv', valuationResult.riskMetrics.bpv)
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
        const ytm = result.breakdown.componentValues.get('ytm')
        const duration = result.breakdown.componentValues.get('duration')
        const convexity = result.breakdown.componentValues.get('convexity')
        
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
