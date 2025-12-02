/**
 * ETF Validator
 * 
 * Comprehensive validation for ETF products and holdings
 * Following Enhanced Bonds Validator pattern with ZERO HARDCODED VALUES
 * 
 * Validates:
 * - ETF product completeness
 * - Holdings existence and accuracy
 * - Holdings sum vs AUM tolerance
 * - Crypto-specific fields (if crypto ETF)
 * - Share class relationships (if applicable)
 */

import { Decimal } from 'decimal.js'
import type { ETFProduct, ETFHolding, ETFSupportingData } from '../../data-fetchers/traditional/ETFDataFetcher'
import type { CalculatorInput, NAVResult, ValidationResult } from '../types'

/**
 * Enhanced error format with actionable information
 */
export interface DetailedValidationError {
  severity: 'error' | 'warning' | 'info'
  field: string
  rule: string
  message: string
  value: any
  fix: string
  table: string
  context?: Record<string, any>
}

/**
 * Enhanced warning format
 */
export interface DetailedValidationWarning {
  field: string
  issue: string
  recommendation: string
  table: string
  impact?: string
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
    etfId: string
    etfName: string
    fundType: string
    totalErrors: number
    totalWarnings: number
    criticalIssues: number
    canCalculate: boolean
    missingTables: string[]
  }
}

/**
 * ETF Validator
 * Provides comprehensive error reporting with fix instructions
 */
export class ETFValidator {
  
  /**
   * Validate calculator input
   */
  async validateInput(input: CalculatorInput): Promise<ValidationResult> {
    const errors: any[] = []
    
    if (!input.productId) {
      errors.push({
        field: 'productId',
        rule: 'required',
        message: 'Product ID is required'
      })
    }
    
    if (!input.asOfDate) {
      errors.push({
        field: 'asOfDate',
        rule: 'required',
        message: 'As-of date is required'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }
  
  /**
   * Comprehensive data validation with detailed error reporting
   * Returns ALL errors at once, not just the first one
   */
  validateDataComprehensive(
    product: ETFProduct,
    supporting: ETFSupportingData
  ): DetailedValidationResult {
    const errors: DetailedValidationError[] = []
    const warnings: DetailedValidationWarning[] = []
    const info: string[] = []
    const missingTables: string[] = []
    
    // Collect ETF information for context
    info.push(`ETF ID: ${product.id}`)
    info.push(`Ticker: ${product.fund_ticker}`)
    info.push(`Name: ${product.fund_name}`)
    info.push(`Type: ${product.fund_type}`)
    info.push(`AUM: $${product.assets_under_management?.toLocaleString() || '0'}`)
    info.push(`Shares Outstanding: ${product.shares_outstanding?.toLocaleString() || '0'}`)
    
    // Add crypto info if applicable
    if (supporting.metadata?.is_crypto_etf) {
      info.push(`🪙 Crypto ETF`)
      info.push(`   Supported Chains: ${supporting.metadata.supported_blockchains?.join(', ') || 'none'}`)
      info.push(`   Staking Enabled: ${supporting.metadata.staking_enabled ? 'Yes' : 'No'}`)
    }
    
    // 1. Check ALL product fields
    this.validateAllProductFields(product, errors)
    
    // 2. Validate holdings existence and completeness
    this.validateHoldings(product, supporting, errors, warnings, missingTables, info)
    
    // 3. Validate crypto-specific requirements
    if (supporting.metadata?.is_crypto_etf) {
      this.validateCryptoRequirements(product, supporting, errors, warnings, info)
    }
    
    // 4. Validate share class relationships
    if (product.parent_fund_id) {
      this.validateShareClass(product, warnings, info)
    }
    
    // 5. Check optional but recommended data
    this.validateOptionalData(product, supporting, warnings, info)
    
    // Build summary
    const summary = {
      etfId: product.id,
      etfName: product.fund_name || product.fund_ticker || 'Unknown ETF',
      fundType: product.fund_type || 'not_set',
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
   * Standard validation result format (for compatibility)
   */
  async validateData(
    product: ETFProduct,
    supporting: ETFSupportingData
  ): Promise<ValidationResult> {
    const detailed = this.validateDataComprehensive(product, supporting)
    
    return {
      isValid: detailed.isValid,
      errors: detailed.errors.map(e => ({
        field: e.field,
        rule: e.rule,
        message: e.message,
        value: e.value,
        fix: e.fix,
        table: e.table,
        severity: e.severity,
        context: e.context
      })),
      warnings: detailed.warnings.map(w => ({
        field: w.field,
        issue: w.issue,
        recommendation: w.recommendation,
        table: w.table,
        impact: w.impact
      })),
      summary: detailed.summary,
      info: detailed.info
    }
  }
  
  /**
   * Validate calculated result
   */
  async validateResult(result: NAVResult): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    
    // Helper to convert Decimal to number
    const toNum = (val: any): number => {
      if (val === null || val === undefined) return 0
      if (typeof val === 'object' && 'toNumber' in val) return val.toNumber()
      return val
    }
    
    // Validate NAV is a positive number
    const navNum = toNum(result.nav)
    if (!navNum || navNum <= 0) {
      errors.push({
        field: 'nav',
        rule: 'positive',
        message: 'NAV must be a positive number',
        fix: 'Check holdings valuations and shares outstanding'
      })
    }
    
    // Check if NAV is reasonable (not extremely high or low)
    if (navNum && (navNum < 1 || navNum > 10000)) {
      warnings.push({
        field: 'nav',
        issue: 'NAV outside typical range ($1-$10,000)',
        recommendation: 'Verify holdings valuations and shares outstanding are correct'
      })
    }
    
    // Validate premium/discount if present
    const premiumDiscountNum = toNum(result.premiumDiscountPct)
    if (result.premiumDiscountPct !== undefined && result.premiumDiscountPct !== null) {
      if (Math.abs(premiumDiscountNum) > 10) {
        warnings.push({
          field: 'premiumDiscountPct',
          issue: `Large premium/discount: ${premiumDiscountNum.toFixed(2)}%`,
          recommendation: 'Review market price vs NAV. Consider arbitrage opportunities or market stress.'
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate ALL product fields
   */
  private validateAllProductFields(
    product: ETFProduct,
    errors: DetailedValidationError[]
  ): void {
    const requiredFields: Array<{ 
      field: keyof ETFProduct
      table: string
      fix: string 
    }> = [
      { 
        field: 'fund_ticker', 
        table: 'fund_products', 
        fix: 'Set fund_ticker (e.g., SPY, QQQ, BTCX)' 
      },
      { 
        field: 'fund_name', 
        table: 'fund_products', 
        fix: 'Set fund_name (e.g., "S&P 500 ETF Trust")' 
      },
      { 
        field: 'fund_type', 
        table: 'fund_products', 
        fix: 'Set fund_type to: etf_equity, etf_bond, etf_crypto, etc.' 
      },
      { 
        field: 'assets_under_management', 
        table: 'fund_products', 
        fix: 'Set AUM (total dollar value of all holdings)' 
      },
      { 
        field: 'shares_outstanding', 
        table: 'fund_products', 
        fix: 'Set shares_outstanding (number of ETF shares issued)' 
      },
      { 
        field: 'currency', 
        table: 'fund_products', 
        fix: 'Set currency (e.g., USD, EUR, GBP)' 
      },
      { 
        field: 'inception_date', 
        table: 'fund_products', 
        fix: 'Set inception_date (when ETF launched)' 
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
          context: { etfId: product.id }
        })
      }
    }
    
    // Validate shares outstanding is positive
    if (product.shares_outstanding !== null && product.shares_outstanding !== undefined) {
      if (product.shares_outstanding <= 0) {
        errors.push({
          severity: 'error',
          field: 'shares_outstanding',
          rule: 'positive',
          message: 'Shares outstanding must be positive',
          value: product.shares_outstanding,
          fix: 'Set shares_outstanding > 0 in fund_products table',
          table: 'fund_products',
          context: { etfId: product.id }
        })
      }
    }
    
    // Validate AUM is positive
    if (product.assets_under_management !== null && product.assets_under_management !== undefined) {
      if (product.assets_under_management < 0) {
        errors.push({
          severity: 'error',
          field: 'assets_under_management',
          rule: 'non_negative',
          message: 'AUM cannot be negative',
          value: product.assets_under_management,
          fix: 'Set assets_under_management >= 0 in fund_products table',
          table: 'fund_products',
          context: { etfId: product.id }
        })
      }
    }
  }
  
  /**
   * Validate holdings existence and accuracy
   */
  private validateHoldings(
    product: ETFProduct,
    supporting: ETFSupportingData,
    errors: DetailedValidationError[],
    warnings: DetailedValidationWarning[],
    missingTables: string[],
    info: string[]
  ): void {
    
    // Check holdings exist
    if (!supporting.holdings || supporting.holdings.length === 0) {
      missingTables.push('etf_holdings')
      errors.push({
        severity: 'error',
        field: 'holdings',
        rule: 'required',
        message: '❌ CRITICAL: ETF must have at least one holding',
        value: supporting.holdings?.length || 0,
        fix: 'Add holdings to etf_holdings table with security details, quantity, and market_value',
        table: 'etf_holdings',
        context: {
          etfId: product.id,
          explanation: 'NAV calculation requires portfolio holdings to sum their market values'
        }
      })
      return
    }
    
    info.push(`✅ Found ${supporting.holdings.length} holdings`)
    
    // Validate each holding has required fields
    supporting.holdings.forEach((holding, idx) => {
      if (!holding.security_name) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].security_name`,
          rule: 'required',
          message: `Holding ${idx + 1} missing security_name`,
          value: undefined,
          fix: 'Set security_name in etf_holdings table',
          table: 'etf_holdings'
        })
      }
      
      if (!holding.security_type) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].security_type`,
          rule: 'required',
          message: `Holding ${holding.security_name || idx + 1} missing security_type`,
          value: undefined,
          fix: 'Set security_type to: equity, bond, crypto, commodity, cash, or derivative',
          table: 'etf_holdings'
        })
      }
      
      if (holding.quantity === null || holding.quantity === undefined) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].quantity`,
          rule: 'required',
          message: `Holding ${holding.security_name || idx + 1} missing quantity`,
          value: undefined,
          fix: 'Set quantity (number of shares/units held)',
          table: 'etf_holdings'
        })
      }
      
      if (holding.market_value === null || holding.market_value === undefined) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].market_value`,
          rule: 'required',
          message: `Holding ${holding.security_name || idx + 1} missing market_value`,
          value: undefined,
          fix: 'Set market_value (current dollar value of position)',
          table: 'etf_holdings'
        })
      }
      
      if (holding.price_per_unit === null || holding.price_per_unit === undefined) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].price_per_unit`,
          rule: 'required',
          message: `Holding ${holding.security_name || idx + 1} missing price_per_unit`,
          value: undefined,
          fix: 'Set price_per_unit (current market price)',
          table: 'etf_holdings'
        })
      }
    })
    
    // Validate holdings sum vs AUM (within 1% tolerance)
    const holdingsTotal = supporting.holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.market_value || 0)),
      new Decimal(0)
    )
    
    const fundAUM = new Decimal(product.assets_under_management || 0)
    const difference = holdingsTotal.minus(fundAUM).abs()
    const tolerance = fundAUM.times(0.01) // 1%
    
    if (difference.gt(tolerance)) {
      const percentageDiff = fundAUM.gt(0) 
        ? difference.div(fundAUM).times(100).toFixed(2)
        : '0'
      
      warnings.push({
        field: 'holdings_vs_aum',
        issue: `Holdings total ($${holdingsTotal.toFixed(0).toLocaleString()}) does not match AUM ($${fundAUM.toFixed(0).toLocaleString()})`,
        recommendation: `Difference: $${difference.toFixed(0).toLocaleString()} (${percentageDiff}%). Review holdings or update AUM.`,
        table: 'fund_products or etf_holdings',
        impact: 'NAV calculation may be inaccurate if holdings do not reflect actual portfolio'
      })
    } else {
      info.push(`✅ Holdings total matches AUM (within 1% tolerance)`)
    }
    
    // Check for negative holdings
    const negativeHoldings = supporting.holdings.filter(h => 
      new Decimal(h.market_value || 0).lt(0)
    )
    
    if (negativeHoldings.length > 0) {
      negativeHoldings.forEach(h => {
        warnings.push({
          field: 'holdings.market_value',
          issue: `Negative market value for ${h.security_name}`,
          recommendation: 'Review valuation or indicate short position explicitly',
          table: 'etf_holdings',
          impact: 'May indicate data error or short position'
        })
      })
    }
  }
  
  /**
   * Validate crypto-specific requirements
   */
  private validateCryptoRequirements(
    product: ETFProduct,
    supporting: ETFSupportingData,
    errors: DetailedValidationError[],
    warnings: DetailedValidationWarning[],
    info: string[]
  ): void {
    
    info.push('⚙️  Crypto ETF → Validating blockchain-specific requirements')
    
    const cryptoHoldings = supporting.holdings.filter(h => h.security_type === 'crypto')
    
    if (cryptoHoldings.length === 0) {
      warnings.push({
        field: 'holdings',
        issue: 'Crypto ETF has no crypto holdings',
        recommendation: 'Add crypto holdings with security_type="crypto" to etf_holdings table',
        table: 'etf_holdings',
        impact: 'ETF marked as crypto but contains no crypto assets'
      })
      return
    }
    
    info.push(`✅ Found ${cryptoHoldings.length} crypto holdings`)
    
    // Validate each crypto holding has blockchain info
    cryptoHoldings.forEach((holding, idx) => {
      if (!holding.blockchain) {
        errors.push({
          severity: 'error',
          field: `holdings[${idx}].blockchain`,
          rule: 'required_for_crypto',
          message: `Crypto holding ${holding.security_name || idx + 1} missing blockchain`,
          value: undefined,
          fix: 'Set blockchain to: bitcoin, ethereum, solana, etc.',
          table: 'etf_holdings',
          context: {
            securityName: holding.security_name,
            isCryptoETF: true
          }
        })
      }
      
      // Warn if no custody info
      if (!holding.custody_address && !holding.custodian_name) {
        warnings.push({
          field: `holdings[${idx}].custody`,
          issue: `No custody information for ${holding.security_name}`,
          recommendation: 'Set custody_address and/or custodian_name for audit trail',
          table: 'etf_holdings',
          impact: 'Cannot verify proof of reserves'
        })
      }
      
      // Check staking fields if staked
      if (holding.is_staked) {
        if (!holding.staking_apr || holding.staking_apr === 0) {
          warnings.push({
            field: `holdings[${idx}].staking_apr`,
            issue: `Staking enabled but APR not set for ${holding.security_name}`,
            recommendation: 'Set staking_apr to expected annual yield',
            table: 'etf_holdings',
            impact: 'Staking rewards not tracked in NAV'
          })
        }
      }
    })
    
    // Check supported blockchains matches holdings
    const supportedChains = supporting.metadata?.supported_blockchains || []
    const holdingChains = new Set(
      cryptoHoldings
        .map(h => h.blockchain)
        .filter((c): c is string => c !== null && c !== undefined)
    )
    
    const unsupportedChains = Array.from(holdingChains).filter(
      chain => !supportedChains.includes(chain)
    )
    
    if (unsupportedChains.length > 0) {
      warnings.push({
        field: 'supported_blockchains',
        issue: `Holdings contain blockchains not in supported list: ${unsupportedChains.join(', ')}`,
        recommendation: 'Update supported_blockchains in etf_metadata to include all chains',
        table: 'etf_metadata',
        impact: 'Metadata inconsistent with actual holdings'
      })
    }
  }
  
  /**
   * Validate share class relationships
   */
  private validateShareClass(
    product: ETFProduct,
    warnings: DetailedValidationWarning[],
    info: string[]
  ): void {
    
    info.push('📊 Share Class detected')
    info.push(`   Parent Fund ID: ${product.parent_fund_id}`)
    info.push(`   Share Class Name: ${product.share_class_name || 'not set'}`)
    
    if (!product.share_class_name) {
      warnings.push({
        field: 'share_class_name',
        issue: 'Share class has parent_fund_id but no share_class_name',
        recommendation: 'Set share_class_name (e.g., "Class A", "Class I", "Institutional")',
        table: 'fund_products',
        impact: 'Difficult to distinguish between share classes'
      })
    }
    
    // Note: We can't validate parent exists without querying DB here
    // That would be done in data fetcher or calculator
  }
  
  /**
   * Validate optional but recommended data
   */
  private validateOptionalData(
    product: ETFProduct,
    supporting: ETFSupportingData,
    warnings: DetailedValidationWarning[],
    info: string[]
  ): void {
    
    // Check for market price (needed for premium/discount)
    if (!product.market_price || product.market_price === 0) {
      warnings.push({
        field: 'market_price',
        issue: 'No market price available',
        recommendation: 'Set market_price in fund_products for premium/discount calculation',
        table: 'fund_products',
        impact: 'Cannot calculate premium/discount vs NAV'
      })
    }
    
    // Check for benchmark (needed for tracking error)
    if (!product.benchmark_index) {
      warnings.push({
        field: 'benchmark_index',
        issue: 'No benchmark index specified',
        recommendation: 'Set benchmark_index (e.g., "S&P 500", "NASDAQ-100")',
        table: 'fund_products',
        impact: 'Cannot calculate tracking error vs benchmark'
      })
    }
    
    // Check for expense ratio
    if (!product.expense_ratio || product.expense_ratio === 0) {
      warnings.push({
        field: 'expense_ratio',
        issue: 'No expense ratio set',
        recommendation: 'Set expense_ratio (annual fee as decimal, e.g., 0.0020 for 0.20%)',
        table: 'fund_products',
        impact: 'Expenses not deducted from NAV calculation'
      })
    }
    
    // Check for NAV history (helps with trending)
    if (!supporting.navHistory || supporting.navHistory.length === 0) {
      info.push('ℹ️  No historical NAV records found (OK for new ETFs)')
    } else {
      info.push(`✅ Found ${supporting.navHistory.length} historical NAV records`)
    }
  }
}

// Export singleton factory function
export function createETFValidator(): ETFValidator {
  return new ETFValidator()
}

// Export default instance
export const etfValidator = new ETFValidator()
