/**
 * Base Data Fetcher
 * 
 * Abstract base class for all data fetchers
 * Provides common functionality and enforces standard patterns
 * Following Phase 1 specifications
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'
import {
  FetchRequest,
  FetchResult,
  FetchError,
  FetchMetadata,
  DataCompleteness,
  ProductWithSupporting,
  QueryResult,
  DataValidationResult
} from './types'

/**
 * Abstract base class for all data fetchers
 * Provides common functionality and enforces standard patterns
 */
export abstract class BaseDataFetcher<TProduct, TSupporting> {
  protected readonly dbClient: SupabaseClient
  protected readonly productTableName: string
  protected readonly supportingTableNames: string[]
  
  constructor(
    dbClient: SupabaseClient,
    productTableName: string,
    supportingTableNames: string[]
  ) {
    this.dbClient = dbClient
    this.productTableName = productTableName
    this.supportingTableNames = supportingTableNames
  }
  
  /**
   * Main fetch method - orchestrates all data retrieval
   * Must be implemented by each specific fetcher
   */
  abstract fetch(request: FetchRequest): Promise<FetchResult<ProductWithSupporting<TProduct, TSupporting>>>
  
  /**
   * Fetch product record
   * Protected method for use by subclasses
   */
  protected async fetchProduct(productId: string): Promise<QueryResult<TProduct>> {
    const startTime = Date.now()
    
    try {
      const { data, error, count } = await this.dbClient
        .from(this.productTableName)
        .select('*', { count: 'exact' })
        .eq('id', productId)
        .single()
      
      if (error) {
        throw this.createFetchError(
          'PRODUCT_FETCH_ERROR',
          `Failed to fetch product from ${this.productTableName}`,
          error,
          this.productTableName
        )
      }
      
      if (!data) {
        throw this.createFetchError(
          'PRODUCT_NOT_FOUND',
          `Product ${productId} not found in ${this.productTableName}`,
          null,
          this.productTableName
        )
      }
      
      return {
        rows: [data as TProduct],
        count: count || 1,
        duration: Date.now() - startTime,
        cached: false
      }
      
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error // Already a FetchError
      }
      throw this.createFetchError(
        'UNKNOWN_ERROR',
        'Unexpected error fetching product',
        error,
        this.productTableName
      )
    }
  }
  
  /**
   * Fetch supporting table data
   * Generic method with standard filtering
   */
  protected async fetchSupportingTable<T>(
    tableName: string,
    foreignKey: string,
    productId: string,
    additionalFilters?: Record<string, any>,
    orderBy?: { column: string; ascending: boolean }
  ): Promise<QueryResult<T>> {
    const startTime = Date.now()
    
    try {
      let query = this.dbClient
        .from(tableName)
        .select('*', { count: 'exact' })
        .eq(foreignKey, productId)
      
      // Apply additional filters
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending })
      }
      
      const { data, error, count } = await query
      
      if (error) {
        throw this.createFetchError(
          'SUPPORTING_TABLE_ERROR',
          `Failed to fetch from ${tableName}`,
          error,
          tableName
        )
      }
      
      return {
        rows: (data || []) as T[],
        count: count || 0,
        duration: Date.now() - startTime,
        cached: false
      }
      
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createFetchError(
        'UNKNOWN_ERROR',
        `Unexpected error fetching from ${tableName}`,
        error,
        tableName
      )
    }
  }
  
  /**
   * Fetch time-series data with date filtering
   */
  protected async fetchTimeSeriesData<T>(
    tableName: string,
    foreignKey: string,
    productId: string,
    asOfDate: Date,
    startDate?: Date,
    dateColumn: string = 'date'
  ): Promise<QueryResult<T>> {
    const startTime = Date.now()
    
    try {
      let query = this.dbClient
        .from(tableName)
        .select('*', { count: 'exact' })
        .eq(foreignKey, productId)
        .lte(dateColumn, asOfDate.toISOString())
      
      if (startDate) {
        query = query.gte(dateColumn, startDate.toISOString())
      }
      
      query = query.order(dateColumn, { ascending: false })
      
      const { data, error, count } = await query
      
      if (error) {
        throw this.createFetchError(
          'TIME_SERIES_FETCH_ERROR',
          `Failed to fetch time-series from ${tableName}`,
          error,
          tableName
        )
      }
      
      return {
        rows: (data || []) as T[],
        count: count || 0,
        duration: Date.now() - startTime,
        cached: false
      }
      
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createFetchError(
        'UNKNOWN_ERROR',
        `Unexpected error fetching time-series from ${tableName}`,
        error,
        tableName
      )
    }
  }
  
  /**
   * Parallel fetch multiple supporting tables
   */
  protected async fetchMultipleTables(
    tables: Array<{
      tableName: string
      foreignKey: string
      productId: string
      additionalFilters?: Record<string, any>
    }>
  ): Promise<Map<string, QueryResult<any>>> {
    const results = new Map<string, QueryResult<any>>()
    
    const promises = tables.map(async ({ tableName, foreignKey, productId, additionalFilters }) => {
      const result = await this.fetchSupportingTable(
        tableName,
        foreignKey,
        productId,
        additionalFilters
      )
      return { tableName, result }
    })
    
    const settled = await Promise.allSettled(promises)
    
    settled.forEach((outcome, index) => {
      const tableName = tables[index]?.tableName
      if (!tableName) return
      
      if (outcome.status === 'fulfilled') {
        results.set(tableName, outcome.value.result)
      } else {
        // Log error but don't fail entire fetch
        console.error(`Failed to fetch ${tableName}:`, outcome.reason)
        results.set(tableName, {
          rows: [],
          count: 0,
          duration: 0,
          cached: false
        })
      }
    })
    
    return results
  }
  
  /**
   * Validate fetched data completeness
   */
  protected validateDataCompleteness(
    product: TProduct,
    supporting: TSupporting,
    requiredFields: string[],
    recommendedFields: string[]
  ): DataCompleteness {
    const missingRequired: string[] = []
    const missingRecommended: string[] = []
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!this.hasValue(product, field) && !this.hasValue(supporting, field)) {
        missingRequired.push(field)
      }
    })
    
    // Check recommended fields
    recommendedFields.forEach(field => {
      if (!this.hasValue(product, field) && !this.hasValue(supporting, field)) {
        missingRecommended.push(field)
      }
    })
    
    const requiredComplete = requiredFields.length - missingRequired.length
    const recommendedComplete = recommendedFields.length - missingRecommended.length
    
    let overall: 'complete' | 'partial' | 'insufficient'
    if (missingRequired.length > 0) {
      overall = 'insufficient'
    } else if (missingRecommended.length > 0) {
      overall = 'partial'
    } else {
      overall = 'complete'
    }
    
    return {
      required: {
        total: requiredFields.length,
        present: requiredComplete,
        missing: missingRequired
      },
      recommended: {
        total: recommendedFields.length,
        present: recommendedComplete,
        missing: missingRecommended
      },
      overall
    }
  }
  
  /**
   * Check if object has non-null value for field
   */
  private hasValue(obj: any, field: string): boolean {
    if (!obj) return false
    
    const parts = field.split('.')
    let current = obj
    
    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        return false
      }
      current = current[part]
    }
    
    return true
  }
  
  /**
   * Create standardized fetch error
   */
  protected createFetchError(
    code: string,
    message: string,
    originalError: any,
    table?: string,
    field?: string
  ): FetchError & Error {
    const error = new Error(message) as FetchError & Error
    error.code = code
    error.message = message
    error.table = table
    error.field = field
    error.originalError = originalError
    return error
  }
  
  /**
   * Build fetch metadata
   */
  protected buildMetadata(
    queryCount: number,
    rowsFetched: number,
    completeness: DataCompleteness
  ): FetchMetadata {
    return {
      fetchedAt: new Date(),
      queryCount,
      rowsFetched,
      cacheable: completeness.overall !== 'insufficient',
      dataCompleteness: completeness
    }
  }
  
  /**
   * Abstract method: Define required fields
   * Must be implemented by each specific fetcher
   */
  protected abstract getRequiredFields(): string[]
  
  /**
   * Abstract method: Define recommended fields
   * Must be implemented by each specific fetcher
   */
  protected abstract getRecommendedFields(): string[]
}
