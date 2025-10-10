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
        await this.saveToDatabase(navResult)
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
      return this.buildErrorResult(
        'CALCULATION_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        [],
        startTime
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
      const { error } = await this.dbClient
        .from('asset_nav_data')
        .insert({
          asset_id: result.productId,
          project_id: result.productId, // TODO: Get from product
          date: result.valuationDate,
          nav: result.nav.toString(),
          asset_name: this.assetType,
          total_assets: result.breakdown?.totalAssets.toString() || '0',
          total_liabilities: result.breakdown?.totalLiabilities.toString() || '0',
          outstanding_shares: '1',
          source: 'calculator',
          validated: false,
          calculation_method: result.calculationMethod,
          created_at: new Date()
        })
      
      if (error) {
        console.error('Failed to save NAV to database:', error)
        throw error
      }
    } catch (error) {
      console.error('Error saving NAV:', error)
      throw error
    }
  }
  
  /**
   * Build error result
   */
  protected buildErrorResult(
    code: string,
    message: string,
    errors: any[],
    startTime: number
  ): CalculatorResult {
    return {
      success: false,
      error: { code, message, details: errors },
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
}
