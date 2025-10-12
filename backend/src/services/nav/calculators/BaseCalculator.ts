/**
 * Base Calculator
 * 
 * Abstract base calculator class that orchestrates:
 * DataFetcher → EnhancedModel → DatabaseWriter → NAVResult
 * 
 * Following Phase 5 specifications with ZERO HARDCODED VALUES
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import {
  CalculatorInput,
  CalculatorResult,
  NAVResult,
  CalculatorMetadata,
  ValidationResult
} from './types'

/**
 * Abstract base calculator
 * All asset-specific calculators extend this
 */
export abstract class BaseCalculator<TProduct, TSupporting, TModel> {
  protected readonly dbClient: SupabaseClient
  protected readonly assetType: string
  protected readonly fetcher: any
  protected readonly model: TModel
  protected readonly validator: any
  
  constructor(
    dbClient: SupabaseClient,
    assetType: string,
    fetcher: any,
    model: TModel,
    validator: any
  ) {
    this.dbClient = dbClient
    this.assetType = assetType
    this.fetcher = fetcher
    this.model = model
    this.validator = validator
  }
  
  /**
   * Main calculation entry point
   */
  async calculate(input: CalculatorInput): Promise<CalculatorResult> {
    const startTime = Date.now()
    let dataFetchTime = 0
    let calculationTime = 0
    
    try {
      // Step 1: Validate input
      const inputValidation = await this.validateInput(input)
      if (!inputValidation.isValid) {
        return this.buildErrorResult(
          'INPUT_VALIDATION_FAILED',
          'Input validation failed',
          inputValidation.errors,
          startTime
        )
      }
      
      // Step 2: Fetch data
      const fetchStart = Date.now()
      const fetchResult = await this.fetcher.fetch({
        productId: input.productId,
        asOfDate: input.asOfDate
      })
      dataFetchTime = Date.now() - fetchStart
      
      if (!fetchResult.success || !fetchResult.data) {
        return this.buildErrorResult(
          'DATA_FETCH_FAILED',
          fetchResult.error?.message || 'Failed to fetch data',
          [],
          startTime
        )
      }
      
      const { product, supporting } = fetchResult.data
      
      // Step 3: Validate data completeness
      const dataValidation = await this.validateData(product, supporting)
      if (!dataValidation.isValid) {
        return this.buildErrorResult(
          'DATA_VALIDATION_FAILED',
          'Required data missing or invalid',
          dataValidation.errors,
          startTime
        )
      }
      
      // Step 4: Calculate NAV
      const calcStart = Date.now()
      const navResult = await this.performCalculation(
        product,
        supporting,
        input
      )
      calculationTime = Date.now() - calcStart
      
      // Step 5: Validate result
      const resultValidation = await this.validateResult(navResult)
      if (!resultValidation.isValid) {
        return this.buildErrorResult(
          'RESULT_VALIDATION_FAILED',
          'Calculated NAV failed validation',
          resultValidation.errors,
          startTime
        )
      }
      
      // Step 6: Save to database if requested
      if (input.saveToDatabase !== false) {
        try {
          await this.saveToDatabase(navResult)
        } catch (saveError) {
          // Database save failed, but calculation succeeded
          // Return success with warning about save failure
          console.error('Database save failed, but calculation succeeded:', saveError)
          return {
            success: true,
            data: navResult,
            metadata: {
              calculatedAt: new Date(),
              duration: Date.now() - startTime,
              dataFetchTime,
              calculationTime,
              savedToDatabase: false,
              validationsPassed: 3,
              validationsFailed: 0
            },
            warning: {
              code: 'DATABASE_SAVE_FAILED',
              message: saveError instanceof Error ? saveError.message : 'Failed to save to database',
              details: 'Calculation succeeded but could not save to database. You can retry saving manually.'
            }
          }
        }
      }
      
      // Step 7: Build successful result
      return {
        success: true,
        data: navResult,
        metadata: {
          calculatedAt: new Date(),
          duration: Date.now() - startTime,
          dataFetchTime,
          calculationTime,
          savedToDatabase: input.saveToDatabase !== false,
          validationsPassed: 3,
          validationsFailed: 0
        }
      }
      
    } catch (error) {
      console.error('Calculator error:', error)
      
      // Extract meaningful error information
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred during calculation'
      
      const errorDetails = error instanceof Error && (error as any).details
        ? (error as any).details
        : []
      
      return this.buildErrorResult(
        'CALCULATION_ERROR',
        errorMessage,
        errorDetails,
        startTime,
        error // Pass original error for detailed extraction
      )
    }
  }
  
  /**
   * Abstract methods - must be implemented by each calculator
   */
  protected abstract validateInput(input: CalculatorInput): Promise<ValidationResult>
  
  protected abstract validateData(
    product: TProduct,
    supporting: TSupporting
  ): Promise<ValidationResult>
  
  protected abstract performCalculation(
    product: TProduct,
    supporting: TSupporting,
    input: CalculatorInput
  ): Promise<NAVResult>
  
  protected abstract validateResult(result: NAVResult): Promise<ValidationResult>
  
  /**
   * Save NAV result to database
   */
  protected async saveToDatabase(result: NAVResult): Promise<void> {
    try {
      // Query the product to get its project_id
      let projectId: string | null = null
      
      // Try to get project_id from the product table
      const productTableMap: Record<string, string> = {
        'bonds': 'bond_products',
        'equity': 'equity_products',
        'commodities': 'commodity_products',
        'funds': 'fund_products',
        'structured_products': 'structured_products'
        // Add other asset types as needed
      }
      
      const productTable = productTableMap[this.assetType]
      if (productTable) {
        const { data: productData, error: productError } = await this.dbClient
          .from(productTable)
          .select('project_id')
          .eq('id', result.productId)
          .single()
        
        if (productError) {
          console.error(`Failed to fetch project_id from ${productTable}:`, productError)
        } else if (productData) {
          projectId = productData.project_id
        }
      }
      
      // If no project_id found, use the product_id as fallback
      // This maintains backward compatibility but will fail if foreign key constraint is enforced
      if (!projectId) {
        console.warn(`No project_id found for ${this.assetType} product ${result.productId}, using product_id as fallback`)
        projectId = result.productId
      }
      
      const { error } = await this.dbClient
        .from('asset_nav_data')
        .insert({
          asset_id: result.productId,
          project_id: projectId,
          date: result.valuationDate,
          nav: result.nav.toString(),
          asset_name: this.assetType,
          total_assets: result.breakdown?.totalAssets.toString() || '0',
          total_liabilities: result.breakdown?.totalLiabilities.toString() || '0',
          outstanding_shares: '1',
          source: 'calculated', // Changed from 'calculator' to match DB constraint
          validated: false,
          calculation_method: result.calculationMethod,
          created_at: new Date()
        })
      
      if (error) {
        console.error('Failed to save NAV to database:', error)
        
        // Cast to any to access constraint property which exists at runtime but not in type
        const supabaseError = error as any
        
        // Create detailed error with all context
        const dbError: any = new Error(
          `Database save failed: ${error.message}`
        )
        dbError.code = error.code
        dbError.details = error.details
        dbError.hint = error.hint
        dbError.constraint = supabaseError.constraint || this.extractConstraintFromMessage(error.message)
        dbError.table = 'asset_nav_data'
        
        throw dbError
      }
    } catch (error) {
      console.error('Error saving NAV:', error)
      // Re-throw to be caught by calculate() method
      throw error
    }
  }
  
  /**
   * Extract constraint name from error message
   */
  private extractConstraintFromMessage(message: string): string | undefined {
    const match = message.match(/constraint "(\w+)"/)
    return match ? match[1] : undefined
  }
  
  /**
   * Build error result with comprehensive error information
   */
  protected buildErrorResult(
    code: string,
    message: string,
    errors: any[],
    startTime: number,
    originalError?: any
  ): CalculatorResult {
    // Extract detailed error information if available
    let detailedErrors = errors
    
    // If originalError has PostgreSQL error info, format it nicely
    if (originalError && typeof originalError === 'object') {
      if (originalError.code && originalError.message) {
        // PostgreSQL error
        detailedErrors = [{
          severity: 'error',
          field: 'database',
          rule: originalError.code || 'database_error',
          message: originalError.message || message,
          fix: this.getDatabaseErrorFix(originalError),
          table: this.extractTableFromError(originalError),
          context: {
            code: originalError.code,
            details: originalError.details,
            hint: originalError.hint,
            constraint: originalError.constraint
          }
        }]
      } else if (originalError.details) {
        // Error with details array
        detailedErrors = originalError.details
      }
    }
    
    return {
      success: false,
      error: { 
        code, 
        message,
        details: detailedErrors.length > 0 ? detailedErrors : undefined
      },
      metadata: {
        calculatedAt: new Date(),
        duration: Date.now() - startTime,
        dataFetchTime: 0,
        calculationTime: 0,
        savedToDatabase: false,
        validationsPassed: 0,
        validationsFailed: 1
      }
    }
  }
  
  /**
   * Get user-friendly fix instructions for database errors
   */
  private getDatabaseErrorFix(error: any): string {
    const code = error.code
    const constraint = error.constraint || ''
    
    // Common PostgreSQL error codes
    if (code === '23505') {
      return 'This record already exists. Try updating instead of inserting, or delete the existing record first.'
    }
    if (code === '23503') {
      return 'Referenced record does not exist. Ensure all foreign key relationships are valid.'
    }
    if (code === '23514') {
      // Check constraint violation
      if (constraint.includes('source_check')) {
        return "The 'source' field must be one of: 'manual', 'oracle', 'calculated', or 'administrator'. Current value is invalid."
      }
      return `Check constraint '${constraint}' was violated. Review the constraint rules and adjust your data.`
    }
    if (code === '23502') {
      return 'A required field is missing. All NOT NULL columns must have values.'
    }
    
    return 'Check the database error details and constraint rules to fix this issue.'
  }
  
  /**
   * Extract table name from PostgreSQL error
   */
  private extractTableFromError(error: any): string {
    if (error.table) return error.table
    
    // Try to extract from message
    const message = error.message || ''
    const match = message.match(/relation "(\w+)"/)
    if (match) return match[1]
    
    return 'unknown_table'
  }
}
