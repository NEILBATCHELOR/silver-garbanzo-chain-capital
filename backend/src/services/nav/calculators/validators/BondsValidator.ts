/**
 * Bonds Validator
 * 
 * Validates bond product data, supporting data, and calculation results
 * Following Phase 5 specifications - ZERO HARDCODED FALLBACKS
 */

import { ValidationResult, ValidationError, ValidationWarning } from '../types'
import type { BondProduct, BondSupportingData } from '../../data-fetchers/traditional/BondsDataFetcher'

export class BondsValidator {
  
  /**
   * Validate calculator input
   */
  validateInput(input: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Validate productId
    if (!input.productId || typeof input.productId !== 'string') {
      errors.push({
        field: 'productId',
        rule: 'required',
        message: 'Product ID is required and must be a string',
        value: input.productId
      })
    }
    
    // Validate asOfDate
    if (!input.asOfDate || !(input.asOfDate instanceof Date)) {
      errors.push({
        field: 'asOfDate',
        rule: 'required',
        message: 'As-of date is required and must be a Date object',
        value: input.asOfDate
      })
    }
    
    // Validate targetCurrency if provided
    if (input.targetCurrency && typeof input.targetCurrency !== 'string') {
      errors.push({
        field: 'targetCurrency',
        rule: 'type',
        message: 'Target currency must be a string',
        value: input.targetCurrency
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate fetched data completeness
   */
  validateData(product: BondProduct, supporting: BondSupportingData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Validate required product fields
    this.validateProductFields(product, errors)
    
    // Validate supporting data based on accounting classification
    this.validateSupportingData(product, supporting, errors, warnings)
    
    // Validate data consistency
    this.validateDataConsistency(product, supporting, errors, warnings)
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate calculation result
   */
  validateResult(result: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Validate NAV is present and positive
    if (!result.nav || result.nav.isNegative()) {
      errors.push({
        field: 'nav',
        rule: 'positive',
        message: 'NAV must be present and positive',
        value: result.nav?.toString()
      })
    }
    
    // Validate breakdown exists if requested
    if (result.includeBreakdown && !result.breakdown) {
      warnings.push({
        field: 'breakdown',
        issue: 'Breakdown requested but not provided',
        recommendation: 'Ensure calculation method provides breakdown'
      })
    }
    
    // Validate sources exist
    if (!result.sources || result.sources.length === 0) {
      warnings.push({
        field: 'sources',
        issue: 'No data sources documented',
        recommendation: 'Add data source tracking for traceability'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate required product fields
   */
  private validateProductFields(product: BondProduct, errors: ValidationError[]): void {
    const requiredFields = [
      'bond_type',
      'issuer_name',
      'issue_date',
      'maturity_date',
      'par_value',
      'currency',
      'coupon_rate',
      'coupon_frequency',
      'accounting_classification'
    ]
    
    for (const field of requiredFields) {
      if (product[field as keyof BondProduct] === null || product[field as keyof BondProduct] === undefined) {
        errors.push({
          field,
          rule: 'required',
          message: `Required field '${field}' is missing from bond product`,
          value: undefined
        })
      }
    }
    
    // Validate date relationships
    if (product.issue_date && product.maturity_date) {
      const issueDate = new Date(product.issue_date)
      const maturityDate = new Date(product.maturity_date)
      
      if (maturityDate <= issueDate) {
        errors.push({
          field: 'maturity_date',
          rule: 'date_range',
          message: 'Maturity date must be after issue date',
          value: { issue_date: product.issue_date, maturity_date: product.maturity_date }
        })
      }
    }
    
    // Validate coupon frequency
    const validFrequencies = [1, 2, 4, 12]
    if (product.coupon_frequency && !validFrequencies.includes(product.coupon_frequency)) {
      errors.push({
        field: 'coupon_frequency',
        rule: 'enum',
        message: 'Coupon frequency must be 1, 2, 4, or 12 (annual, semi-annual, quarterly, monthly)',
        value: product.coupon_frequency
      })
    }
  }
  
  /**
   * Validate supporting data based on accounting classification
   */
  private validateSupportingData(
    product: BondProduct,
    supporting: BondSupportingData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    
    // For HTM (Held-to-Maturity): Need coupon schedule
    if (product.accounting_classification === 'htm') {
      if (supporting.couponPayments.length === 0) {
        errors.push({
          field: 'couponPayments',
          rule: 'required',
          message: 'Coupon payment schedule is required for HTM classification',
          value: supporting.couponPayments.length
        })
      }
    }
    
    // For AFS/Trading: Need market prices
    if (product.accounting_classification === 'afs' || product.accounting_classification === 'trading') {
      if (supporting.marketPrices.length === 0) {
        errors.push({
          field: 'marketPrices',
          rule: 'required',
          message: `Market prices are required for ${product.accounting_classification.toUpperCase()} classification`,
          value: supporting.marketPrices.length
        })
      }
      
      if (supporting.marketPrices.length < 3) {
        warnings.push({
          field: 'marketPrices',
          issue: 'Limited market price history',
          recommendation: 'Add more market price observations for better valuation accuracy'
        })
      }
    }
    
    // For callable bonds: Need call schedule
    if (product.is_callable && supporting.callPutSchedules.length === 0) {
      warnings.push({
        field: 'callPutSchedules',
        issue: 'Bond is callable but no call schedule provided',
        recommendation: 'Add call schedule to bond_call_put_schedules table'
      })
    }
    
    // For puttable bonds: Need put schedule
    if (product.is_puttable && supporting.callPutSchedules.length === 0) {
      warnings.push({
        field: 'callPutSchedules',
        issue: 'Bond is puttable but no put schedule provided',
        recommendation: 'Add put schedule to bond_call_put_schedules table'
      })
    }
    
    // For amortizing bonds: Need amortization schedule
    if (product.is_amortizing && supporting.amortizationSchedule.length === 0) {
      errors.push({
        field: 'amortizationSchedule',
        rule: 'required',
        message: 'Amortization schedule is required for amortizing bonds',
        value: supporting.amortizationSchedule.length
      })
    }
    
    // Credit ratings recommended for all bonds
    if (supporting.creditRatings.length === 0) {
      warnings.push({
        field: 'creditRatings',
        issue: 'No credit ratings available',
        recommendation: 'Add credit ratings to bond_credit_ratings table for better risk assessment'
      })
    }
  }
  
  /**
   * Validate data consistency
   */
  private validateDataConsistency(
    product: BondProduct,
    supporting: BondSupportingData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    
    // Validate coupon payments consistency
    for (const payment of supporting.couponPayments) {
      if (payment.currency !== product.currency) {
        errors.push({
          field: 'couponPayments',
          rule: 'consistency',
          message: `Coupon payment currency (${payment.currency}) does not match bond currency (${product.currency})`,
          value: payment.id
        })
      }
      
      // Validate payment dates are between issue and maturity
      const paymentDate = new Date(payment.payment_date)
      const issueDate = new Date(product.issue_date)
      const maturityDate = new Date(product.maturity_date)
      
      if (paymentDate < issueDate || paymentDate > maturityDate) {
        warnings.push({
          field: 'couponPayments',
          issue: `Coupon payment date ${payment.payment_date} is outside bond term`,
          recommendation: 'Verify payment date is correct'
        })
      }
    }
    
    // Validate market prices are within reasonable range
    for (const price of supporting.marketPrices) {
      if (price.clean_price < 0 || price.clean_price > 200) {
        warnings.push({
          field: 'marketPrices',
          issue: `Unusual market price: ${price.clean_price}`,
          recommendation: 'Verify price is correct (typical range: 0-200)'
        })
      }
      
      if (price.yield_to_maturity && (price.yield_to_maturity < -0.05 || price.yield_to_maturity > 0.50)) {
        warnings.push({
          field: 'marketPrices',
          issue: `Unusual YTM: ${price.yield_to_maturity}`,
          recommendation: 'Verify YTM is correct (typical range: -5% to 50%)'
        })
      }
    }
  }
}

export const bondsValidator = new BondsValidator()
