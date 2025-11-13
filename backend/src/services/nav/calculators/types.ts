/**
 * Calculator Types
 * 
 * Common types and interfaces for all NAV calculators
 * Following Phase 5 specifications
 */

import { Decimal } from 'decimal.js'
import type { AllocationBreakdown } from '../models/traditional/EnhancedMMFModels'

export interface CalculatorInput {
  productId: string
  asOfDate: Date
  targetCurrency?: string
  includeBreakdown?: boolean
  saveToDatabase?: boolean
  configOverrides?: any // Temporary config overrides for testing
}

export interface CalculatorResult {
  success: boolean
  data?: NAVResult
  error?: CalculatorError
  warning?: CalculatorWarning
  metadata: CalculatorMetadata
}

export interface CalculatorWarning {
  code: string
  message: string
  details?: string
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
  // Bond-specific: Market comparison for HTM bonds
  marketComparison?: {
    accountingValue: Decimal      // Amortized cost (book value)
    marketValue: Decimal           // Current market price
    unrealizedGainLoss: Decimal    // Difference
    marketPriceDate: Date          // When market price was observed
    marketYTM: Decimal             // Market yield
    accountingYTM: Decimal         // Effective interest rate
    yieldSpread: Decimal           // Difference in yields
  }
  // MMF-specific: Shadow NAV and compliance metrics
  shadowNAV?: Decimal              // Market-based NAV (mark-to-market)
  deviationFromStable?: Decimal    // Deviation from $1.00 stable NAV
  deviationBps?: number            // Deviation in basis points
  isBreakingBuck?: boolean         // Whether NAV < $0.995
  wam?: number                     // Weighted Average Maturity (days)
  wal?: number                     // Weighted Average Life (days)
  dailyLiquidPercentage?: number   // Daily liquid assets %
  weeklyLiquidPercentage?: number  // Weekly liquid assets %
  complianceStatus?: any           // SEC Rule 2a-7 compliance
  allocationBreakdown?: AllocationBreakdown[] // Asset class allocation breakdown
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
  summary?: {
    bondId?: string
    bondName?: string
    accountingTreatment?: string
    totalErrors: number
    totalWarnings: number
    criticalIssues: number
    canCalculate: boolean
    missingTables?: string[]
  }
  info?: string[]
}

export interface ValidationError {
  field: string
  rule: string
  message: string
  value?: any
  // Enhanced validation fields
  fix?: string
  table?: string
  severity?: 'error' | 'warning' | 'info'
  context?: Record<string, any>
}

export interface ValidationWarning {
  field: string
  issue: string
  recommendation: string
  table?: string
  impact?: string
}
