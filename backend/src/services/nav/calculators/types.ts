/**
 * Calculator Types
 * 
 * Common types and interfaces for all NAV calculators
 * Following Phase 5 specifications
 */

import { Decimal } from 'decimal.js'

export interface CalculatorInput {
  productId: string
  asOfDate: Date
  targetCurrency?: string
  includeBreakdown?: boolean
  saveToDatabase?: boolean
}

export interface CalculatorResult {
  success: boolean
  data?: NAVResult
  error?: CalculatorError
  metadata: CalculatorMetadata
}

export interface NAVResult {
  productId: string
  assetType: string
  valuationDate: Date
  nav: Decimal
  navPerShare?: Decimal
  currency: string
  breakdown?: NAVBreakdown
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  confidence: 'high' | 'medium' | 'low'
  calculationMethod: string
  sources: DataSource[]
}

export interface NAVBreakdown {
  totalAssets: Decimal
  totalLiabilities: Decimal
  netAssets: Decimal
  componentValues?: Map<string, Decimal>
  adjustments?: Adjustment[]
}

export interface DataSource {
  table: string
  recordCount: number
  dateRange?: { start: Date; end: Date }
  completeness: number // 0-100%
}

export interface CalculatorError {
  code: string
  message: string
  field?: string
  details?: any
}

export interface CalculatorMetadata {
  calculatedAt: Date
  duration: number // milliseconds
  dataFetchTime: number
  calculationTime: number
  savedToDatabase: boolean
  validationsPassed: number
  validationsFailed: number
}

export interface Adjustment {
  type: string
  description: string
  amount: Decimal
  percentage: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  rule: string
  message: string
  value?: any
}

export interface ValidationWarning {
  field: string
  issue: string
  recommendation: string
}
