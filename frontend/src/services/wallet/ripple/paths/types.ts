/**
 * XRPL Path Finding Types
 * Based on official XRPL path finding implementation
 */

import { Amount, Currency } from 'xrpl'

/**
 * Currency specification for path finding
 */
export interface PathCurrency {
  currency: string
  issuer?: string
}

/**
 * Path finding request parameters
 */
export interface PathFindRequest {
  sourceAccount: string
  destinationAccount: string
  destinationAmount: Amount
  sourceCurrencies?: PathCurrency[]
  sendMax?: Amount
}

/**
 * Individual path step in a payment path
 */
export interface PathStep {
  account?: string
  currency?: string
  issuer?: string
  type?: number
  type_hex?: string
}

/**
 * Complete payment path (array of steps)
 */
export type PaymentPath = PathStep[]

/**
 * Alternative path option with cost analysis
 */
export interface PathAlternative {
  paths_computed: PaymentPath[]
  source_amount: Amount
  destination_amount?: Amount
  full_path?: string
  paths_canonical?: any[]
}

/**
 * Path finding result from XRPL
 */
export interface PathFindResult {
  alternatives: PathAlternative[]
  destination_account: string
  destination_currencies?: string[]
  source_account: string
  full_reply?: boolean
}

/**
 * Enhanced path alternative with cost calculations
 */
export interface EnhancedPathAlternative extends PathAlternative {
  effectiveExchangeRate: number
  totalCost: string
  pathLength: number
  intermediaryCount: number
  quality: number // 0-100 score
}

/**
 * Path selection criteria
 */
export interface PathSelectionCriteria {
  prioritizeShortestPath?: boolean
  prioritizeCheapestPath?: boolean
  maxPathLength?: number
  maxIntermediaries?: number
  minimumQuality?: number
}

/**
 * Database record for path finding history
 */
export interface DBPathFindRecord {
  id: string
  project_id: string
  source_account: string
  destination_account: string
  source_currency: string
  source_issuer: string | null
  destination_currency: string
  destination_issuer: string | null
  destination_amount: string
  best_path: PaymentPath[]
  effective_rate: number
  total_cost: string
  path_length: number
  searched_at: Date
  created_at: Date
}
