/**
 * Enhanced Bonds Validator
 * 
 * Extension of BondsValidator with comprehensive error aggregation and detailed reporting
 * Returns ALL errors at once instead of stopping at first error
 * 
 * Usage:
 *   const validator = new EnhancedBondsValidator()
 *   const result = validator.validateDataComprehensive(product, supporting)
 *   // result.errors contains ALL errors with fix instructions
 */

import { BondsValidator } from './BondsValidator'
import type { BondProduct, BondSupportingData } from '../../data-fetchers/traditional/BondsDataFetcher'

/**
 * Enhanced error format with actionable information
 */
export interface DetailedValidationError {
  severity: 'error' | 'warning' | 'info'
  field: string
  rule: string
  message: string
  value: any
  fix: string              // How to fix this error
  table: string            // Which database table needs data
  context?: Record<string, any>  // Additional context for debugging
}

/**
 * Enhanced warning format
 */
export interface DetailedValidationWarning {
  field: string
  issue: string
  recommendation: string
  table: string
  impact?: string          // What happens if not fixed
}

/**
 * Comprehensive validation result
 */
export interface DetailedValidationResult {
  isValid: boolean
  errors: DetailedValidationError[]
  warnings: DetailedValidationWarning[]
  info: string[]
  summary: {
    bondId: string
    bondName: string
    accountingTreatment: string
    totalErrors: number
    totalWarnings: number
    criticalIssues: number
    canCalculate: boolean
    missingTables: string[]
  }
}

/**
 * Enhanced Bonds Validator
 * Provides comprehensive error reporting with fix instructions
 */
export class EnhancedBondsValidator extends BondsValidator {
  
  /**
   * Comprehensive data validation with detailed error reporting
   * Returns ALL errors at once, not just the first one
   * 
   * @param product - Bond product data
   * @param supporting - Supporting data from all 8 tables
   * @returns Detailed validation result with ALL errors and fix instructions
   */
  validateDataComprehensive(
    product: BondProduct,
    supporting: BondSupportingData
  ): DetailedValidationResult {
    const errors: DetailedValidationError[] = []
    const warnings: DetailedValidationWarning[] = []
    const info: string[] = []
    const missingTables: string[] = []
    
    // Collect bond information for context
    info.push(`Bond ID: ${product.id}`)
    info.push(`Issuer: ${product.issuer_name}`)
    info.push(`Bond Type: ${product.bond_type}`)
    info.push(`Accounting Treatment: ${product.accounting_treatment || 'NOT SET'}`)
    info.push(`Maturity Date: ${product.maturity_date}`)
    
    // 1. Check ALL product fields (don't stop at first error)
    this.validateAllProductFields(product, errors)
    
    // 2. Check supporting data requirements based on accounting treatment
    this.validateAccountingTreatmentRequirements(product, supporting, errors, warnings, missingTables, info)
    
    // 3. Check optional but recommended data
    this.validateOptionalData(product, supporting, warnings, info)
    
    // 4. Check data consistency and quality
    this.validateDataQuality(product, supporting, warnings, info)
    
    // Build summary
    const summary = {
      bondId: product.id,
      bondName: product.asset_name || product.issuer_name || 'Unknown Bond',
      accountingTreatment: product.accounting_treatment || 'not_set',
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      criticalIssues: errors.filter(e => e.severity === 'error').length,
      canCalculate: errors.length === 0,
      missingTables
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary
    }
  }
  
  /**
   * Validate ALL product fields - collect all errors, don't stop at first
   */
  private validateAllProductFields(
    product: BondProduct,
    errors: DetailedValidationError[]
  ): void {
    const requiredFields: Array<{ field: keyof BondProduct; table: string; fix: string }> = [
      { 
        field: 'bond_type', 
        table: 'bond_products', 
        fix: 'Set bond_type to: government, corporate, municipal, agency, supranational, or asset_backed' 
      },
      { 
        field: 'issuer_name', 
        table: 'bond_products', 
        fix: 'Add issuer name to bond_products.issuer_name' 
      },
      { 
        field: 'issue_date', 
        table: 'bond_products', 
        fix: 'Set issue_date to bond issuance date' 
      },
      { 
        field: 'maturity_date', 
        table: 'bond_products', 
        fix: 'Set maturity_date to bond maturity date' 
      },
      { 
        field: 'face_value', 
        table: 'bond_products', 
        fix: 'Set face_value (par value) for the bond' 
      },
      { 
        field: 'currency', 
        table: 'bond_products', 
        fix: 'Set currency (e.g., USD, EUR, GBP)' 
      },
      { 
        field: 'coupon_rate', 
        table: 'bond_products', 
        fix: 'Set annual coupon rate (e.g., 0.055 for 5.5%)' 
      },
      { 
        field: 'coupon_frequency', 
        table: 'bond_products', 
        fix: 'Set coupon_frequency to: annual, semi_annual, quarterly, or monthly' 
      },
      { 
        field: 'accounting_treatment', 
        table: 'bond_products', 
        fix: 'Set accounting_treatment to: held_to_maturity, available_for_sale, or trading' 
      }
    ]
    
    for (const { field, table, fix } of requiredFields) {
      const value = product[field]
      if (value === null || value === undefined || value === '') {
        errors.push({
          severity: 'error',
          field: field as string,
          rule: 'required',
          message: `Missing required field: ${field}`,
          value: undefined,
          fix,
          table,
          context: { bondId: product.id }
        })
      }
    }
    
    // Validate date relationships
    if (product.issue_date && product.maturity_date) {
      const issueDate = new Date(product.issue_date)
      const maturityDate = new Date(product.maturity_date)
      
      if (maturityDate <= issueDate) {
        errors.push({
          severity: 'error',
          field: 'maturity_date',
          rule: 'date_range',
          message: 'Maturity date must be after issue date',
          value: { issue_date: product.issue_date, maturity_date: product.maturity_date },
          fix: 'Correct maturity_date to be after issue_date',
          table: 'bond_products',
          context: {
            issueDate: product.issue_date,
            maturityDate: product.maturity_date
          }
        })
      }
    }
  }
  
  /**
   * Validate accounting treatment specific requirements
   */
  private validateAccountingTreatmentRequirements(
    product: BondProduct,
    supporting: BondSupportingData,
    errors: DetailedValidationError[],
    warnings: DetailedValidationWarning[],
    missingTables: string[],
    info: string[]
  ): void {
    
    const accountingTreatment = product.accounting_treatment
    
    if (!accountingTreatment) {
      errors.push({
        severity: 'error',
        field: 'accounting_treatment',
        rule: 'required',
        message: 'Accounting treatment is required to determine calculation method',
        value: undefined,
        fix: 'Set accounting_treatment to: held_to_maturity, available_for_sale, or trading',
        table: 'bond_products'
      })
      return
    }
    
    // HTM (Held-to-Maturity) - Requires coupon schedule for DCF
    if (accountingTreatment === 'held_to_maturity' || accountingTreatment === 'htm') {
      info.push('⚙️  HTM Classification → Uses Discounted Cash Flow (DCF) method')
      info.push('   Requires: Coupon payment schedule for future cash flows')
      
      if (supporting.couponPayments.length === 0) {
        missingTables.push('bond_coupon_payments')
        errors.push({
          severity: 'error',
          field: 'couponPayments',
          rule: 'required_for_htm',
          message: '❌ CRITICAL: Coupon payment schedule is REQUIRED for HTM classification',
          value: supporting.couponPayments.length,
          fix: 'Generate coupon schedule using: /backend/migrations/fix_missing_coupon_payments.sql',
          table: 'bond_coupon_payments',
          context: {
            bondId: product.id,
            couponRate: product.coupon_rate,
            frequency: product.coupon_frequency,
            maturityDate: product.maturity_date,
            sqlScript: 'fix_missing_coupon_payments.sql',
            explanation: 'DCF method requires all future payment dates to discount cash flows to present value'
          }
        })
      } else {
        info.push(`✅ Found ${supporting.couponPayments.length} coupon payments`)
        
        // Check if schedule looks complete
        const scheduledPayments = supporting.couponPayments.filter(p => p.payment_status === 'scheduled')
        if (scheduledPayments.length === 0) {
          warnings.push({
            field: 'couponPayments',
            issue: 'No future coupon payments scheduled',
            recommendation: 'Verify all future payments are in the schedule',
            table: 'bond_coupon_payments',
            impact: 'May undervalue the bond if future payments are missing'
          })
        }
      }
    }
    
    // AFS/Trading - Requires market prices for mark-to-market
    if (accountingTreatment === 'available_for_sale' || 
        accountingTreatment === 'afs' || 
        accountingTreatment === 'trading') {
      
      info.push(`⚙️  ${accountingTreatment.toUpperCase()} Classification → Uses Mark-to-Market valuation`)
      info.push('   Requires: Recent market prices for fair value')
      
      if (supporting.marketPrices.length === 0) {
        missingTables.push('bond_market_prices')
        errors.push({
          severity: 'error',
          field: 'marketPrices',
          rule: 'required_for_mtm',
          message: `❌ CRITICAL: Market prices are REQUIRED for ${accountingTreatment.toUpperCase()} classification`,
          value: supporting.marketPrices.length,
          fix: 'Add market prices to bond_market_prices table with clean_price, dirty_price, and ytm',
          table: 'bond_market_prices',
          context: {
            bondId: product.id,
            accountingTreatment,
            explanation: 'Mark-to-market accounting requires observable market prices for fair value measurement'
          }
        })
      } else {
        info.push(`✅ Found ${supporting.marketPrices.length} market price observations`)
        
        // Warn if limited price history
        if (supporting.marketPrices.length < 3) {
          warnings.push({
            field: 'marketPrices',
            issue: 'Limited market price history (< 3 observations)',
            recommendation: 'Add more market price data points for better valuation accuracy',
            table: 'bond_market_prices',
            impact: 'May have less confidence in market price reliability'
          })
        }
        
        // Check for recent prices
        const prices = supporting.marketPrices.sort((a, b) => 
          new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
        )
        const mostRecentPrice = prices[0]
        
        if (mostRecentPrice) {
          const daysSinceLastPrice = Math.floor(
            (new Date().getTime() - new Date(mostRecentPrice.price_date).getTime()) / (1000 * 60 * 60 * 24)
          )
          
          if (daysSinceLastPrice > 30) {
            warnings.push({
              field: 'marketPrices',
              issue: `Most recent price is ${daysSinceLastPrice} days old`,
              recommendation: 'Add more current market prices (within last 30 days)',
              table: 'bond_market_prices',
              impact: 'Stale prices may not reflect current market conditions'
            })
          }
        }
      }
    }
  }
  
  /**
   * Validate optional but recommended data
   */
  private validateOptionalData(
    product: BondProduct,
    supporting: BondSupportingData,
    warnings: DetailedValidationWarning[],
    info: string[]
  ): void {
    
    // Credit ratings (recommended for all bonds)
    if (supporting.creditRatings.length === 0) {
      warnings.push({
        field: 'creditRatings',
        issue: 'No credit ratings available',
        recommendation: 'Add credit ratings from S&P, Moody\'s, or Fitch to bond_credit_ratings table',
        table: 'bond_credit_ratings',
        impact: 'Cannot assess credit risk or calculate credit spreads accurately'
      })
    } else {
      info.push(`✅ Found ${supporting.creditRatings.length} credit rating records`)
    }
    
    // Call/Put schedules for callable/puttable bonds
    if (product.callable_flag && supporting.callPutSchedules.length === 0) {
      warnings.push({
        field: 'callPutSchedules',
        issue: 'Bond is callable but no call schedule provided',
        recommendation: 'Add call dates and prices to bond_call_put_schedules table',
        table: 'bond_call_put_schedules',
        impact: 'Cannot calculate Option-Adjusted Spread (OAS) - may overvalue the bond'
      })
    }
    
    if (product.puttable && supporting.callPutSchedules.length === 0) {
      warnings.push({
        field: 'callPutSchedules',
        issue: 'Bond is puttable but no put schedule provided',
        recommendation: 'Add put dates and prices to bond_call_put_schedules table',
        table: 'bond_call_put_schedules',
        impact: 'Cannot properly value embedded put option'
      })
    }
    
    // Amortization schedule for amortizing bonds
    if (supporting.amortizationSchedule && supporting.amortizationSchedule.length > 0) {
      info.push(`✅ Found ${supporting.amortizationSchedule.length} amortization schedule entries`)
      
      // Validate schedule completeness
      const scheduleHasGaps = this.validateAmortizationScheduleCompleteness(
        supporting.amortizationSchedule,
        product
      )
      
      if (scheduleHasGaps) {
        warnings.push({
          field: 'amortizationSchedule',
          issue: 'Amortization schedule appears incomplete (gaps detected)',
          recommendation: 'Ensure all principal payment dates are included in bond_amortization_schedule',
          table: 'bond_amortization_schedule',
          impact: 'May incorrectly calculate outstanding principal and cash flows'
        })
      }
    }
  }
  
  /**
   * Validate data quality and consistency
   */
  private validateDataQuality(
    product: BondProduct,
    supporting: BondSupportingData,
    warnings: DetailedValidationWarning[],
    info: string[]
  ): void {
    
    // Check coupon payment consistency
    for (const payment of supporting.couponPayments) {
      const paymentDate = new Date(payment.payment_date)
      const issueDate = new Date(product.issue_date)
      const maturityDate = new Date(product.maturity_date)
      
      if (paymentDate < issueDate || paymentDate > maturityDate) {
        warnings.push({
          field: 'couponPayments',
          issue: `Coupon payment date ${payment.payment_date} is outside bond term (${product.issue_date} to ${product.maturity_date})`,
          recommendation: 'Verify payment date is correct or remove if erroneous',
          table: 'bond_coupon_payments'
        })
      }
    }
    
    // Check market price reasonableness
    for (const price of supporting.marketPrices) {
      if (price.clean_price < 0 || price.clean_price > 200) {
        warnings.push({
          field: 'marketPrices',
          issue: `Unusual market price: ${price.clean_price} on ${price.price_date} (typical range: 0-200)`,
          recommendation: 'Verify price is correct - may be data entry error',
          table: 'bond_market_prices'
        })
      }
      
      if (!price.ytm) {
        warnings.push({
          field: 'ytm',
          issue: `Market price on ${price.price_date} missing yield-to-maturity`,
          recommendation: 'Add ytm to all market price entries for complete analysis',
          table: 'bond_market_prices'
        })
      } else if (price.ytm < -0.05 || price.ytm > 0.50) {
        warnings.push({
          field: 'ytm',
          issue: `Unusual YTM: ${(price.ytm * 100).toFixed(2)}% on ${price.price_date} (typical range: -5% to 50%)`,
          recommendation: 'Verify YTM is correct',
          table: 'bond_market_prices'
        })
      }
    }
  }
  
  /**
   * Helper: Validate amortization schedule completeness
   * Override from base class with enhanced checking
   */
  protected override validateAmortizationScheduleCompleteness(
    schedule: any[],
    product: BondProduct
  ): boolean {
    if (schedule.length === 0) return false
    if (schedule.length < 2) return true
    
    // Check dates are sequential without large gaps
    const dates = schedule
      .map(s => new Date(s.payment_date))
      .sort((a, b) => a.getTime() - b.getTime())
    
    for (let i = 1; i < dates.length; i++) {
      const currentDate = dates[i]
      const prevDate = dates[i-1]
      
      if (!currentDate || !prevDate) continue
      
      const diffMonths = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (diffMonths > 6) {
        return true // Gap detected
      }
    }
    
    return false
  }
}

// Export singleton instance
export const enhancedBondsValidator = new EnhancedBondsValidator()
