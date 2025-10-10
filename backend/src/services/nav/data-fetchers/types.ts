/**
 * Data Fetcher Types
 * 
 * Common types and interfaces for all NAV data fetchers
 * Following Phase 1 specifications from PHASE_1_DATA_FETCHERS.md
 */

import { Decimal } from 'decimal.js'

/**
 * Common fetch request parameters
 */
export interface FetchRequest {
  productId: string
  asOfDate: Date
  includeHistorical?: boolean
  historicalPeriodDays?: number
}

/**
 * Standard fetch result wrapper
 */
export interface FetchResult<T> {
  success: boolean
  data?: T
  error?: FetchError
  metadata: FetchMetadata
}

/**
 * Fetch error details
 */
export interface FetchError {
  code: string
  message: string
  field?: string
  table?: string
  query?: string
  originalError?: any
}

/**
 * Fetch operation metadata
 */
export interface FetchMetadata {
  fetchedAt: Date
  queryCount: number
  rowsFetched: number
  cacheable: boolean
  dataCompleteness: DataCompleteness
}

/**
 * Data completeness assessment
 */
export interface DataCompleteness {
  required: {
    total: number
    present: number
    missing: string[]
  }
  recommended: {
    total: number
    present: number
    missing: string[]
  }
  overall: 'complete' | 'partial' | 'insufficient'
}

/**
 * Product data with supporting tables
 */
export interface ProductWithSupporting<TProduct, TSupporting> {
  product: TProduct
  supporting: TSupporting
  relationships: RelationshipMap
  completeness: DataCompleteness
}

/**
 * Relationship metadata
 */
export interface RelationshipMap {
  [tableName: string]: {
    foreignKey: string
    cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many'
    recordCount: number
  }
}

/**
 * Query execution result
 */
export interface QueryResult<T> {
  rows: T[]
  count: number
  duration: number
  cached: boolean
}

/**
 * Batch fetch request
 */
export interface BatchFetchRequest {
  productIds: string[]
  asOfDate: Date
  parallel?: boolean
  maxConcurrency?: number
}

/**
 * Data validation result
 */
export interface DataValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  table: string
  value: any
  rule: string
  message: string
}

export interface ValidationWarning {
  field: string
  table: string
  issue: string
  recommendation: string
}
