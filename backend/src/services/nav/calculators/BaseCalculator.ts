/**
 * BaseCalculator - Abstract foundation for all NAV calculators
 * 
 * Provides common utilities for:
 * - Decimal precision mathematics
 * - FX currency conversion
 * - Price data fetching and validation
 * - Risk controls and validation
 * - Observability and logging hooks
 * - Error handling patterns
 * 
 * All asset-specific calculators should extend this base class.
 */

import { Decimal } from 'decimal.js'
import {
  AssetNavCalculator,
  CalculationInput,
  CalculationResult,
  AssetType,
  CalculationStatus,
  PriceData,
  FxRate,
  MarketDataProvider,
  ValidationSeverity
} from '../types'
import { NavServiceResult } from '../types'

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  maxE: 9e15,
  minE: -9e15
})

export interface CalculatorOptions {
  enableRiskControls?: boolean
  enableObservability?: boolean
  maxPriceStalenessMinutes?: number
  maxCalculationTimeMs?: number
}

export interface CalculatorValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  severity: ValidationSeverity
}

export interface CalculatorMetrics {
  calculatorType: string
  executionTimeMs: number
  priceDataSources: Record<string, MarketDataProvider>
  fxRatesUsed: Record<string, number>
  riskControlsTriggered: string[]
  validationResults: CalculatorValidation
}

export abstract class BaseCalculator implements AssetNavCalculator {
  protected readonly options: CalculatorOptions
  protected readonly logger: any // Use existing logging infrastructure
  protected metrics: CalculatorMetrics

  constructor(options: CalculatorOptions = {}) {
    this.options = {
      enableRiskControls: true,
      enableObservability: true,
      maxPriceStalenessMinutes: 60,
      maxCalculationTimeMs: 30000,
      ...options
    }

    this.metrics = {
      calculatorType: this.constructor.name,
      executionTimeMs: 0,
      priceDataSources: {},
      fxRatesUsed: {},
      riskControlsTriggered: [],
      validationResults: {
        isValid: true,
        errors: [],
        warnings: [],
        severity: ValidationSeverity.INFO
      }
    }
  }

  // ==================== ABSTRACT METHODS ====================
  
  /**
   * Determines if this calculator can handle the given input
   */
  abstract canHandle(input: CalculationInput): boolean

  /**
   * Returns the asset types this calculator supports
   */
  abstract getAssetTypes(): AssetType[]

  /**
   * Performs the asset-specific NAV calculation logic
   * Subclasses implement this with their specific calculation algorithms
   */
  protected abstract performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>>

  // ==================== PUBLIC INTERFACE ====================

  /**
   * Main calculation entry point with full error handling and validation
   */
  async calculate(input: CalculationInput): Promise<CalculationResult> {
    const startTime = Date.now()
    
    try {
      // Input validation
      const validationResult = this.validateInput(input)
      if (!validationResult.isValid) {
        throw new Error(`Invalid calculation input: ${validationResult.errors.join(', ')}`)
      }

      // Pre-calculation setup
      this.resetMetrics()
      
      // Perform the actual calculation
      const result = await this.performCalculation(input)
      
      if (!result.success || !result.data) {
        throw new Error(`Calculation failed: ${result.error}`)
      }

      // Post-calculation validation
      const calculationResult = result.data
      const postValidation = this.validateCalculationResult(calculationResult)
      
      if (!postValidation.isValid) {
        calculationResult.status = CalculationStatus.FAILED
        calculationResult.errorMessage = `Result validation failed: ${postValidation.errors.join(', ')}`
      }

      // Record metrics
      this.metrics.executionTimeMs = Date.now() - startTime
      this.metrics.validationResults = postValidation
      
      if (this.options.enableObservability) {
        this.logCalculationMetrics(calculationResult)
      }

      return calculationResult
      
    } catch (error) {
      const failedResult: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId,
        productType: input.productType,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: 0,
        totalLiabilities: 0,
        netAssets: 0,
        navValue: 0,
        currency: input.targetCurrency || 'USD',
        pricingSources: {},
        calculatedAt: new Date(),
        status: CalculationStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown calculation error'
      }
      
      this.metrics.executionTimeMs = Date.now() - startTime
      
      if (this.options.enableObservability) {
        this.logCalculationError(failedResult, error)
      }
      
      return failedResult
    }
  }

  // ==================== DECIMAL MATH UTILITIES ====================

  /**
   * Creates a Decimal instance for precise financial calculations
   */
  protected decimal(value: number | string): Decimal {
    return new Decimal(value)
  }

  /**
   * Safely converts Decimal back to number, checking for precision loss
   */
  protected toNumber(decimal: Decimal, context?: string): number {
    const num = decimal.toNumber()
    
    // Check for precision loss or overflow
    if (!isFinite(num)) {
      throw new Error(`Decimal conversion resulted in non-finite number${context ? ` in ${context}` : ''}`)
    }
    
    return num
  }

  /**
   * Performs precise addition with multiple values
   */
  protected sum(...values: (number | Decimal)[]): Decimal {
    return values.reduce(
      (acc: Decimal, val) => acc.plus(val instanceof Decimal ? val : new Decimal(val)),
      new Decimal(0)
    )
  }

  /**
   * Performs precise multiplication with proper scaling
   */
  protected multiply(a: number | Decimal, b: number | Decimal): Decimal {
    const decimalA = a instanceof Decimal ? a : new Decimal(a)
    const decimalB = b instanceof Decimal ? b : new Decimal(b)
    return decimalA.times(decimalB)
  }

  /**
   * Performs precise division with zero checking
   */
  protected divide(numerator: number | Decimal, denominator: number | Decimal, context?: string): Decimal {
    const num = numerator instanceof Decimal ? numerator : new Decimal(numerator)
    const den = denominator instanceof Decimal ? denominator : new Decimal(denominator)
    
    if (den.isZero()) {
      throw new Error(`Division by zero${context ? ` in ${context}` : ''}`)
    }
    
    return num.dividedBy(den)
  }

  /**
   * Rounds to specified decimal places using ROUND_HALF_UP
   */
  protected round(value: number | Decimal, decimalPlaces: number = 2): Decimal {
    const decimal = value instanceof Decimal ? value : new Decimal(value)
    return decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP)
  }

  // ==================== FX CONVERSION UTILITIES ====================

  /**
   * Converts amount from one currency to another
   * TODO: Integration with FxRateService when implemented
   */
  protected async convertCurrency(
    amount: number | Decimal, 
    fromCurrency: string, 
    toCurrency: string,
    asOf?: Date
  ): Promise<{ convertedAmount: Decimal; fxRate: number; source: string }> {
    // If same currency, no conversion needed
    if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
      return {
        convertedAmount: amount instanceof Decimal ? amount : new Decimal(amount),
        fxRate: 1.0,
        source: 'no_conversion_needed'
      }
    }

    // TODO: Replace with actual FX service call
    // For now, mock implementation - this will be replaced in Phase 10
    const mockFxRate = 1.0 // Placeholder
    const amountDecimal = amount instanceof Decimal ? amount : new Decimal(amount)
    
    this.metrics.fxRatesUsed[`${fromCurrency}/${toCurrency}`] = mockFxRate
    
    return {
      convertedAmount: this.multiply(amountDecimal, mockFxRate),
      fxRate: mockFxRate,
      source: 'mock_fx_service'
    }
  }

  /**
   * Validates currency code format
   */
  protected isValidCurrencyCode(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency.toUpperCase())
  }

  // ==================== PRICE DATA UTILITIES ====================

  /**
   * Fetches price data for an instrument
   * TODO: Integration with MarketDataOracleService when implemented
   */
  protected async fetchPriceData(
    instrumentKey: string, 
    asOf?: Date,
    preferredProvider?: MarketDataProvider
  ): Promise<PriceData> {
    // TODO: Replace with actual market data service call
    // For now, mock implementation - this will be replaced in Phase 7
    const mockPrice: PriceData = {
      price: 100.0, // Placeholder
      currency: 'USD',
      asOf: asOf || new Date(),
      source: preferredProvider || MarketDataProvider.MANUAL_OVERRIDE
    }
    
    this.metrics.priceDataSources[instrumentKey] = mockPrice.source as MarketDataProvider
    
    return mockPrice
  }

  /**
   * Validates price data is not stale
   */
  protected validatePriceData(priceData: PriceData, maxStalenessMinutes?: number): boolean {
    const maxStaleMs = (maxStalenessMinutes || this.options.maxPriceStalenessMinutes!) * 60 * 1000
    const ageMs = Date.now() - priceData.asOf.getTime()
    
    if (ageMs > maxStaleMs) {
      this.metrics.riskControlsTriggered.push(`Stale price data: ${ageMs}ms old`)
      return false
    }
    
    return true
  }

  // ==================== VALIDATION UTILITIES ====================

  /**
   * Validates calculation input parameters
   */
  protected validateInput(input: CalculationInput): CalculatorValidation {
    const validation: CalculatorValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      severity: ValidationSeverity.INFO
    }

    // Required fields validation
    if (!input.valuationDate) {
      validation.errors.push('Valuation date is required')
    }

    if (!input.assetId && !input.productType && !input.projectId) {
      validation.errors.push('At least one of assetId, productType, or projectId must be provided')
    }

    // Date validation
    if (input.valuationDate && input.valuationDate > new Date()) {
      validation.warnings.push('Valuation date is in the future')
    }

    // Currency validation
    if (input.targetCurrency && !this.isValidCurrencyCode(input.targetCurrency)) {
      validation.errors.push(`Invalid target currency code: ${input.targetCurrency}`)
    }

    // Numeric validations
    if (input.fees && input.fees < 0) {
      validation.errors.push('Fees cannot be negative')
    }

    if (input.liabilities && input.liabilities < 0) {
      validation.errors.push('Liabilities cannot be negative')
    }

    if (input.sharesOutstanding && input.sharesOutstanding <= 0) {
      validation.errors.push('Shares outstanding must be positive')
    }

    // Set validation status
    validation.isValid = validation.errors.length === 0
    validation.severity = validation.errors.length > 0 ? ValidationSeverity.ERROR :
                        validation.warnings.length > 0 ? ValidationSeverity.WARN :
                        ValidationSeverity.INFO

    return validation
  }

  /**
   * Validates calculation result meets business rules
   */
  protected validateCalculationResult(result: CalculationResult): CalculatorValidation {
    const validation: CalculatorValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      severity: ValidationSeverity.INFO
    }

    // NAV cannot be negative
    if (result.navValue < 0) {
      validation.errors.push(`NAV cannot be negative: ${result.navValue}`)
    }

    // Net assets calculation should be consistent
    const expectedNetAssets = result.totalAssets - result.totalLiabilities
    const netAssetsDiff = Math.abs(result.netAssets - expectedNetAssets)
    if (netAssetsDiff > 0.01) { // Allow for small rounding differences
      validation.errors.push(`Net assets inconsistent: ${result.netAssets} vs expected ${expectedNetAssets}`)
    }

    // NAV per share calculation if applicable
    if (result.navPerShare && result.sharesOutstanding) {
      const expectedNavPerShare = result.navValue / result.sharesOutstanding
      const navPerShareDiff = Math.abs(result.navPerShare - expectedNavPerShare)
      if (navPerShareDiff > 0.0001) {
        validation.errors.push(`NAV per share inconsistent: ${result.navPerShare} vs expected ${expectedNavPerShare}`)
      }
    }

    // Check for extremely large values that might indicate errors
    if (result.navValue > 1e12) {
      validation.warnings.push(`Very large NAV value: ${result.navValue} - please verify`)
    }

    validation.isValid = validation.errors.length === 0
    validation.severity = validation.errors.length > 0 ? ValidationSeverity.ERROR :
                        validation.warnings.length > 0 ? ValidationSeverity.WARN :
                        ValidationSeverity.INFO

    return validation
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generates a unique run ID for this calculation
   */
  protected generateRunId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Resets metrics for a new calculation
   */
  private resetMetrics(): void {
    this.metrics = {
      calculatorType: this.constructor.name,
      executionTimeMs: 0,
      priceDataSources: {},
      fxRatesUsed: {},
      riskControlsTriggered: [],
      validationResults: {
        isValid: true,
        errors: [],
        warnings: [],
        severity: ValidationSeverity.INFO
      }
    }
  }

  /**
   * Logs calculation metrics (to be integrated with existing logging)
   */
  private logCalculationMetrics(result: CalculationResult): void {
    // TODO: Integrate with existing logging infrastructure
    console.log(`[${this.constructor.name}] Calculation completed`, {
      runId: result.runId,
      assetId: result.assetId,
      productType: result.productType,
      executionTimeMs: this.metrics.executionTimeMs,
      navValue: result.navValue,
      status: result.status,
      pricingSources: Object.keys(result.pricingSources).length,
      riskControlsTriggered: this.metrics.riskControlsTriggered.length
    })
  }

  /**
   * Logs calculation errors (to be integrated with existing logging)
   */
  private logCalculationError(result: CalculationResult, error: unknown): void {
    // TODO: Integrate with existing logging infrastructure
    console.error(`[${this.constructor.name}] Calculation failed`, {
      runId: result.runId,
      assetId: result.assetId,
      productType: result.productType,
      executionTimeMs: this.metrics.executionTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
      riskControlsTriggered: this.metrics.riskControlsTriggered
    })
  }

  /**
   * Gets current calculation metrics
   */
  getMetrics(): CalculatorMetrics {
    return { ...this.metrics }
  }
}
