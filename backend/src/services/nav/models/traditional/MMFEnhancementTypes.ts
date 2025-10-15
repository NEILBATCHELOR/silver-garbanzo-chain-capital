// =====================================================
// MMF ENHANCEMENTS - NEW TYPES
// These types support the 5 critical enhancements
// =====================================================

import { Decimal } from 'decimal.js'
import type { FundType, ComplianceRule } from './EnhancedMMFModels'

// Enhancement #1: Asset Allocation Tracking
export interface AllocationBreakdown {
  assetClass: string
  totalValue: Decimal
  percentage: number
  numberOfSecurities: number
  averageMaturityDays: number
  averageYield: number | null
  typicalRange: { 
    min: number
    max: number
    average: number 
  } | null
  variance: number | null
  isWithinTypicalRange: boolean
}

// Enhancement #2: Fund-Type Specific Validation (expanded)
export interface FundTypeValidation {
  fundType: FundType
  specificRules: ComplianceRule[]
  allRulesMet: boolean
  violations: string[]
  governmentSecuritiesPercentage: number | null  // For government MMFs
  secondTierPercentage: number | null            // For prime MMFs
  municipalSecuritiesPercentage: number | null   // For tax-exempt MMFs
}

// Enhancement #3: Liquidity Fees & Gates
export interface FeesGatesAnalysis {
  currentStatus: 'no_action' | 'discretionary_permitted' | 'mandatory_required'
  fee: {
    type: 'none' | 'discretionary' | 'mandatory'
    percentage: number
    reason: string
  }
  gate: {
    permitted: boolean
    note: string
  }
  boardNotificationRequired: boolean
  recommendations: string[]
  triggerMetrics: {
    weeklyLiquidityPercentage: number
    dailyLiquidityPercentage: number
    netRedemptionsPercentage: number | null
  }
}

// Enhancement #4: Concentration Risk Alerts (expanded)
export interface ConcentrationAlert {
  issuer: string
  issuerId: string | null
  currentExposure: number
  limit: number
  exceedsLimit: boolean
  exceedBy: number
  severity: 'critical' | 'warning' | 'info'
  totalValue: Decimal
  numberOfSecurities: number
  isAffiliated: boolean
  suggestedAction: string
  alternativeIssuers: string[]
}

export interface ConcentrationRiskAnalysis {
  topIssuers: Array<{
    issuer: string
    exposure: number
    value: Decimal
    securities: number
  }>
  alerts: ConcentrationAlert[]
  totalExposedIssuers: number
  complianceStatus: 'compliant' | 'warning' | 'violation'
  recommendations: string[]
}

// Enhancement #5: Transaction Impact Analysis
export interface TransactionImpactAnalysis {
  transaction: {
    type: 'buy' | 'sell' | 'mature'
    security: string
    quantity: number
    price: number
    totalValue: Decimal
  }
  preTransaction: {
    nav: Decimal
    wam: number
    wal: number
    dailyLiquidPercentage: number
    weeklyLiquidPercentage: number
  }
  postTransaction: {
    nav: Decimal
    wam: number
    wal: number
    dailyLiquidPercentage: number
    weeklyLiquidPercentage: number
  }
  impacts: {
    navChange: Decimal
    wamChange: number
    walChange: number
    dailyLiquidChange: number
    weeklyLiquidChange: number
  }
  complianceCheck: {
    willBeCompliant: boolean
    violations: string[]
    warnings: string[]
  }
  concentrationCheck: {
    newIssuerExposure: number | null
    exceedsLimit: boolean
    message: string
  }
  recommendation: 'approve' | 'review' | 'reject'
  recommendationReason: string
}
