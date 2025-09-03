/**
 * NAV Service Types
 * Domain-specific types for Net Asset Value calculations and management
 */

import { 
  ServiceResult, 
  PaginatedResponse, 
  QueryOptions 
} from '@/types/index'

// ==================== ENUMS ====================

export enum AssetType {
  EQUITY = 'equity',
  BONDS = 'bonds',
  COMMODITIES = 'commodities',
  MMF = 'mmf', // Money Market Funds
  COMPOSITE_FUNDS = 'composite_funds',
  STRUCTURED_PRODUCTS = 'structured_products',
  QUANT_STRATEGIES = 'quant_strategies',
  PRIVATE_EQUITY = 'private_equity',
  PRIVATE_DEBT = 'private_debt',
  REAL_ESTATE = 'real_estate',
  ENERGY = 'energy',
  INFRASTRUCTURE = 'infrastructure',
  COLLECTIBLES = 'collectibles',
  ASSET_BACKED = 'asset_backed',
  INVOICE_RECEIVABLES = 'invoice_receivables',
  CLIMATE_RECEIVABLES = 'climate_receivables',
  DIGITAL_TOKENIZED_FUNDS = 'digital_tokenized_funds',
  STABLECOIN_FIAT_BACKED = 'stablecoin_fiat_backed',
  STABLECOIN_CRYPTO_BACKED = 'stablecoin_crypto_backed',
  STABLECOIN_COMMODITY_BACKED = 'stablecoin_commodity_backed',
  STABLECOIN_ALGORITHMIC = 'stablecoin_algorithmic'
}

export enum CalculationStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ValidationSeverity {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum ApprovalStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published'
}

export enum MarketDataProvider {
  CHAINLINK = 'chainlink',
  COINGECKO = 'coingecko',
  ONCHAIN_DEX = 'onchain_dex',
  INTERNAL_DB = 'internal_db',
  MANUAL_OVERRIDE = 'manual_override'
}

// ==================== BASE INTERFACES ====================

export interface PriceData {
  price: number
  currency: string
  asOf: Date
  source: string
}

export interface FxRate {
  baseCurrency: string
  quoteCurrency: string
  rate: number
  asOf: Date
  source: string
}

export interface AssetHolding {
  instrumentKey: string
  quantity: number
  weight?: number
  costBasis?: number
  currency: string
  effectiveDate: Date
}

// ==================== CALCULATION INPUTS ====================

export interface CalculationInput {
  assetId?: string
  productType?: string
  projectId?: string
  valuationDate: Date
  targetCurrency?: string
  holdings?: AssetHolding[]
  fees?: number
  liabilities?: number
  sharesOutstanding?: number
}

export interface CalculationResult {
  runId: string
  assetId?: string
  productType?: string
  projectId?: string
  valuationDate: Date
  totalAssets: number
  totalLiabilities: number
  netAssets: number
  navValue: number
  navPerShare?: number
  sharesOutstanding?: number
  currency: string
  fxRateUsed?: number
  pricingSources: Record<string, PriceData>
  calculatedAt: Date
  status: CalculationStatus
  errorMessage?: string
  metadata?: Record<string, any>
}

// ==================== VALIDATION ====================

export interface ValidationRule {
  code: string
  name: string
  description: string
  severity: ValidationSeverity
  threshold?: number
}

export interface ValidationResult {
  runId: string
  ruleCode: string
  severity: ValidationSeverity
  passed: boolean
  actualValue?: number
  threshold?: number
  details: string
  metadata?: Record<string, any>
}

// ==================== APPROVAL WORKFLOW ====================

export interface ApprovalRequest {
  runId: string
  requestedBy: string
  comments?: string
}

export interface ApprovalResponse {
  id: string
  runId: string
  status: ApprovalStatus
  requestedBy: string
  validatedBy?: string
  approvedBy?: string
  approvedAt?: Date
  comments?: string
  createdAt: Date
}

// ==================== REDEMPTION ====================

export interface RedemptionData {
  assetId: string
  productType: string
  asOfDate: Date
  sharesRedeemed: number
  valueRedeemed: number
  redemptionRate: number
}

export interface RedemptionRateRequest {
  assetId?: string
  productType?: string
  window: 'daily' | '7d' | '30d' | 'custom'
  startDate?: Date
  endDate?: Date
}

// ==================== ON-CHAIN INTEGRATION ====================

export interface OnChainNavUpdate {
  assetId: string
  contractAddress: string
  chainId: number
  navValue: number
  navPerShare?: number
  blockNumber?: number
  transactionHash?: string
  publishedAt?: Date
}

// ==================== ASSET CALCULATOR INTERFACE ====================

export interface AssetNavCalculator {
  canHandle(input: CalculationInput): boolean
  calculate(input: CalculationInput): Promise<CalculationResult>
  getAssetTypes(): AssetType[]
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface CreateCalculationRequest {
  assetId?: string
  productType?: string
  projectId?: string
  valuationDate: string
  targetCurrency?: string
  runManually?: boolean
}

export interface CreateRedemptionRequest {
  assetId: string
  productType: string
  asOfDate: string
  sharesRedeemed: number
  valueRedeemed: number
}

export interface PublishOnChainRequest {
  runId?: string
  assetId?: string
  contractAddress: string
  chainId: number
}

// ==================== QUERY OPTIONS ====================

export interface NavQueryOptions extends QueryOptions {
  filters?: {
    assetId?: string
    productType?: string
    projectId?: string
    status?: CalculationStatus
    approvalStatus?: ApprovalStatus
    dateFrom?: string
    dateTo?: string
  }
}

// ==================== SERVICE RESULT TYPES ====================

export type NavServiceResult<T = any> = ServiceResult<T>
export type NavPaginatedResponse<T = any> = PaginatedResponse<T>

// ==================== MARKET DATA ORACLE ====================

export interface MarketDataRequest {
  instrumentKey: string
  asOf?: Date
  provider?: MarketDataProvider
}

export interface MarketDataResponse {
  instrumentKey: string
  priceData: PriceData
  cached: boolean
  source: MarketDataProvider
}

export interface FxRateRequest {
  baseCurrency: string
  quoteCurrency: string
  asOf?: Date
}

// ==================== ANALYTICS ====================

export interface NavAnalytics {
  totalAUM: number
  dailyChange: number
  weeklyChange: number
  monthlyChange: number
  pendingValidations: number
  pendingApprovals: number
  averageRedemptionRate: number
  assetClassBreakdown: Record<AssetType, number>
  topPerformers: Array<{
    assetId: string
    productType: string
    navChange: number
  }>
  currencyBreakdown: Record<string, number>
}

// ==================== DATABASE MAPPING ====================

export interface NavCalculationRun {
  id: string
  asset_id?: string
  product_type?: string
  project_id?: string
  valuation_date: Date
  started_at: Date
  completed_at?: Date
  status: CalculationStatus
  inputs_json?: any
  result_nav_value?: number
  nav_per_share?: number
  fx_rate_used?: number
  pricing_sources?: any
  error_message?: string
  created_by?: string
  created_at: Date
}

export interface NavValidationResult {
  id: string
  run_id: string
  rule_code: string
  severity: ValidationSeverity
  passed: boolean
  details_json?: any
  created_at: Date
}

export interface NavApproval {
  id: string
  run_id: string
  status: ApprovalStatus
  requested_by: string
  validated_by?: string
  approved_by?: string
  approved_at?: Date
  comments?: string
  created_at: Date
}

export interface NavRedemption {
  id: string
  asset_id: string
  product_type: string
  as_of_date: Date
  shares_redeemed: number
  value_redeemed: number
  redemption_rate: number
  created_at: Date
}

export interface NavFxRate {
  base_ccy: string
  quote_ccy: string
  rate: number
  as_of: Date
  source: string
}

export interface NavPriceCache {
  instrument_key: string
  price: number
  currency: string
  as_of: Date
  source: string
}

// ==================== UTILITY FUNCTIONS ====================

export function assetTypeFromString(value: string): AssetType | undefined {
  return Object.values(AssetType).find(type => type === value)
}

export function calculationStatusFromString(value: string): CalculationStatus | undefined {
  return Object.values(CalculationStatus).find(status => status === value)
}

export function approvalStatusFromString(value: string): ApprovalStatus | undefined {
  return Object.values(ApprovalStatus).find(status => status === value)
}

export function validationSeverityFromString(value: string): ValidationSeverity | undefined {
  return Object.values(ValidationSeverity).find(severity => severity === value)
}
