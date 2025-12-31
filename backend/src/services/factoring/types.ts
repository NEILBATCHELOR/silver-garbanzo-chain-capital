import { ServiceResult, PaginatedResponse, QueryOptions } from '@/types/index'
import { Decimal } from 'decimal.js'

// Core factoring entity types based on database schema
export interface Provider {
  provider_id: number
  name: string | null
  address: string | null
}

export interface Payer {
  payer_id: number
  name: string | null
}

export interface Pool {
  pool_id: number
  pool_name: string | null
  pool_type: PoolType | null
  creation_timestamp: Date | null
}

export interface Invoice {
  invoice_id: number
  provider_id: number | null
  patient_name: string | null
  patient_dob: Date | null
  service_dates: string | null
  procedure_codes: string | null
  diagnosis_codes: string | null
  billed_amount: Decimal | number | null
  adjustments: Decimal | number | null
  net_amount_due: Decimal | number | null
  payer_id: number | null
  policy_number: string | null
  invoice_number: string | null
  invoice_date: Date | null
  due_date: Date | null
  factoring_discount_rate: Decimal | number | null
  factoring_terms: string | null
  upload_timestamp: Date | null
  pool_id: number | null
}

// Enums - matching database enum values
export enum PoolType {
  TOTAL_POOL = "Total Pool", // Match database enum value exactly
  TRANCHE = "Tranche"
}

// Type transformation function to convert Prisma types to our types
export function transformPoolType(prismaPoolType: any): PoolType | null {
  if (prismaPoolType === null || prismaPoolType === undefined) return null
  
  // Handle both possible formats from Prisma
  switch (prismaPoolType) {
    case 'Total Pool':
    case 'Total_Pool':
      return PoolType.TOTAL_POOL
    case 'Tranche':
      return PoolType.TRANCHE
    default:
      return null
  }
}

export enum InvoiceStatus {
  UPLOADED = "uploaded",
  POOLED = "pooled", 
  TOKENIZED = "tokenized",
  DISTRIBUTED = "distributed"
}

// Request/Response types for API
export interface CreateProviderRequest {
  name: string
  address?: string
}

export interface UpdateProviderRequest {
  name?: string
  address?: string
}

export interface CreatePayerRequest {
  name: string
}

export interface UpdatePayerRequest {
  name?: string
}

export interface CreatePoolRequest {
  pool_name: string
  pool_type: PoolType
}

export interface UpdatePoolRequest {
  pool_name?: string
  pool_type?: PoolType
}

export interface CreateInvoiceRequest {
  provider_id?: number
  patient_name: string
  patient_dob: Date
  service_dates: string
  procedure_codes: string
  diagnosis_codes: string
  billed_amount: number
  adjustments?: number
  net_amount_due: number
  payer_id?: number
  policy_number: string
  invoice_number: string
  invoice_date: Date
  due_date: Date
  factoring_discount_rate?: number
  factoring_terms?: string
  pool_id?: number
}

export interface UpdateInvoiceRequest {
  provider_id?: number
  patient_name?: string
  patient_dob?: Date
  service_dates?: string
  procedure_codes?: string
  diagnosis_codes?: string
  billed_amount?: number
  adjustments?: number
  net_amount_due?: number
  payer_id?: number
  policy_number?: string
  invoice_number?: string
  invoice_date?: Date
  due_date?: Date
  factoring_discount_rate?: number
  factoring_terms?: string
  pool_id?: number
}

// Enhanced types with relations
export interface InvoiceWithRelations extends Invoice {
  provider?: Provider | null
  payer?: Payer | null
  pool?: Pool | null
}

export interface PoolWithInvoices extends Pool {
  invoices?: Invoice[]
  total_value?: number
  invoice_count?: number
  average_age?: number
}

// Extended query options with factoring-specific filters
export interface FactoringQueryOptions extends QueryOptions {
  limit?: number
  filters?: {
    poolId?: number
    providerId?: number
    payerId?: number
    minAmount?: number
    maxAmount?: number
    [key: string]: any
  }
}

// Service result types
export type FactoringServiceResult<T = any> = ServiceResult<T>
export type FactoringPaginatedResponse<T = any> = ServiceResult<PaginatedResponse<T>>

// Analytics types
export interface FactoringAnalytics {
  totals: {
    invoices: number
    pools: number
    providers: number
    payers: number
    total_value: number
  }
  pool_distribution: {
    [key: string]: number
  }
  provider_performance: Array<{
    provider_id: number
    provider_name: string
    total_invoices: number
    total_value: number
    average_discount_rate: number
  }>
  monthly_trends: Array<{
    month: string
    invoice_count: number
    total_value: number
  }>
}

// Helper function to convert Decimal to number safely
export function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  return Number(value.toString())
}

// Validation types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Tokenization and Distribution types
export interface TokenizationRequest {
  poolId: number
  tokenName: string
  tokenSymbol: string
  tokenStandard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626'
  totalTokens: number
  tokenValue: number
  projectId: string
  securityInterestDetails?: string
}

export interface TokenAllocation {
  id: string
  investorId: string
  tokenId: string
  tokenAmount: number
  allocationDate: Date
  status: 'pending' | 'minted' | 'distributed'
  notes?: string
}

export interface TokenDistribution {
  id: string
  tokenAllocationId: string
  investorId: string
  tokenAmount: number
  distributionDate: Date
  transactionHash: string
  blockchain: string
  toAddress: string
  status: 'pending' | 'confirmed' | 'failed'
  notes?: string
}

export interface CreateTokenAllocationRequest {
  investorId: string
  tokenId: string
  tokenAmount: number
  allocationMode: 'amount' | 'percentage'
  investmentAmount?: number
  notes?: string
}

export interface DistributeTokensRequest {
  allocationId: string
  toAddress: string
  blockchain: string
  gasPrice?: string
  gasLimit?: string
}

export interface PoolTokenizationData {
  poolId: number
  poolName: string | null
  poolType: PoolType | null
  totalValue: number
  invoiceCount: number
  averageAge: number
  averageDiscountRate: number
  discountedValue: number
  discountAmount: number
  canTokenize: boolean
  tokens: Array<{
    id: string
    name: string
    symbol: string
    totalSupply: string | null
    status: string
  }>
}

// Export all types
export * from './types'
