// Captable Service Types
// TypeScript interfaces for the Captable backend service

import { Decimal } from 'decimal.js'
import { 
  cap_tables as CapTable, 
  investors as Investor, 
  subscriptions as Subscription, 
  token_allocations as TokenAllocation, 
  distributions as Distribution,
  projects as Project,
  tokens as Token,
  investor_approvals as InvestorApproval,
  kyc_status,
  compliance_status,
  token_standard_enum
} from '@/infrastructure/database/generated/index'

// Type aliases for better readability
export type KycStatus = kyc_status
export type ComplianceStatus = compliance_status
export type TokenStandardEnum = token_standard_enum
import {
  ServiceResult,
  PaginatedResponse,
  BatchResult
} from '@/types/api'

// ============================================================================
// Core Entity Types
// ============================================================================

export interface CapTableWithStats extends CapTable {
  // Computed statistics
  totalInvestors: number
  totalRaised: Decimal
  totalTokens: Decimal
  totalDistributed: Decimal
  completionPercentage: number
  
  // Related data
  project?: Project
  investors?: InvestorWithSubscription[]
  subscriptions?: Subscription[]
  tokenAllocations?: TokenAllocation[]
  distributions?: Distribution[]
}

export interface InvestorWithSubscription extends Investor {
  // Subscription summary data
  totalSubscribed: Decimal
  totalAllocated: Decimal
  totalDistributed: Decimal
  subscriptionCount: number
  allocationCount: number
  distributionCount: number
  
  // Related data
  subscriptions?: Subscription[]
  tokenAllocations?: TokenAllocation[]
  distributions?: Distribution[]
  approvals?: InvestorApproval[]
}

export interface SubscriptionWithDetails extends Subscription {
  // Related entity data
  investor?: Investor
  project?: Project
  tokenAllocations?: TokenAllocation[]
  
  // Computed fields
  allocationPercentage: number
  remainingToAllocate: Decimal
  isFullyAllocated: boolean
}

export interface TokenAllocationWithDetails extends TokenAllocation {
  // Related entity data
  investor?: Investor
  project?: Project
  subscription?: Subscription
  token?: Token
  
  // Computed fields
  allocationPercentage: number
  distributionPercentage: number
  remainingToDistribute: Decimal
}

export interface DistributionWithDetails extends Distribution {
  // Related entity data
  investor?: Investor
  project?: Project
  
  // Computed fields
  distributionPercentage: number
  isFullyRedeemed: boolean
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CapTableCreateRequest {
  projectId: string
  name: string
  description?: string
}

export interface CapTableUpdateRequest {
  name?: string
  description?: string
}

export interface InvestorCreateRequest {
  investorId: string
  name: string
  email: string
  phone?: string
  walletAddress?: string
  kycStatus?: KycStatus
  accreditationStatus?: string
  taxIdNumber?: string
  nationality?: string
  residenceCountry?: string
  dateOfBirth?: Date
  investorType?: string
  riskTolerance?: string
  investmentExperience?: string
  employmentStatus?: string
  annualIncome?: Decimal
  netWorth?: Decimal
  sourceOfFunds?: string
  investmentObjectives?: string
  complianceNotes?: string
}

export interface InvestorUpdateRequest {
  name?: string
  email?: string
  phone?: string
  walletAddress?: string
  kycStatus?: KycStatus
  accreditationStatus?: string
  taxIdNumber?: string
  nationality?: string
  residenceCountry?: string
  dateOfBirth?: Date
  investorType?: string
  riskTolerance?: string
  investmentExperience?: string
  employmentStatus?: string
  annualIncome?: Decimal
  netWorth?: Decimal
  sourceOfFunds?: string
  investmentObjectives?: string
  complianceNotes?: string
  isActive?: boolean
  onboardingCompleted?: boolean
}

export interface SubscriptionCreateRequest {
  projectId: string
  investorId: string
  subscriptionAmount: Decimal
  paymentMethod?: string
  paymentStatus?: string
  subscriptionDate?: Date
  notes?: string
}

export interface SubscriptionUpdateRequest {
  subscriptionAmount?: Decimal
  paymentMethod?: string
  paymentStatus?: string
  subscriptionDate?: Date
  allocated?: boolean
  distributionStatus?: string
  notes?: string
}

export interface TokenAllocationCreateRequest {
  projectId: string
  subscriptionId: string
  investorId: string
  tokenId?: string
  tokenType: string
  tokenAmount: Decimal
  symbol?: string
  standard?: TokenStandardEnum
  allocationDate?: Date
  notes?: string
}

export interface TokenAllocationUpdateRequest {
  tokenId?: string
  tokenType?: string
  tokenAmount?: Decimal
  symbol?: string
  standard?: TokenStandardEnum
  allocationDate?: Date
  distributed?: boolean
  distributionDate?: Date
  distributionTxHash?: string
  notes?: string
}

export interface DistributionCreateRequest {
  tokenAllocationId: string
  investorId: string
  subscriptionId?: string
  projectId: string
  tokenType: string
  tokenAmount: Decimal
  distributionDate?: Date
  distributionTxHash?: string
  walletId?: string
  blockchain?: string
  tokenAddress?: string
  tokenSymbol?: string
  toAddress: string
  notes?: string
  remainingAmount?: Decimal
  standard?: TokenStandardEnum
}

export interface DistributionUpdateRequest {
  tokenType?: string
  tokenAmount?: Decimal
  distributionDate?: Date
  distributionTxHash?: string
  walletId?: string
  blockchain?: string
  tokenAddress?: string
  tokenSymbol?: string
  toAddress?: string
  notes?: string
  remainingAmount?: Decimal
  fullyRedeemed?: boolean
  standard?: TokenStandardEnum
}

export interface InvestorApprovalCreateRequest {
  investorId: string
  approvalType: string
  status: ComplianceStatus
  reviewedBy?: string
  notes?: string
  expiryDate?: Date
}

export interface InvestorApprovalUpdateRequest {
  status?: ComplianceStatus
  reviewedBy?: string
  reviewedAt?: Date
  notes?: string
  expiryDate?: Date
}

// ============================================================================
// Query Options and Filtering
// ============================================================================

export interface CapTableQueryOptions {
  page?: number
  limit?: number
  search?: string
  projectId?: string
  includeStats?: boolean
  includeInvestors?: boolean
  includeSubscriptions?: boolean
  includeAllocations?: boolean
  includeDistributions?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface InvestorQueryOptions {
  page?: number
  limit?: number
  search?: string
  kycStatus?: KycStatus[]
  investorType?: string[]
  isActive?: boolean
  onboardingCompleted?: boolean
  includeSubscriptions?: boolean
  includeAllocations?: boolean
  includeDistributions?: boolean
  includeApprovals?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SubscriptionQueryOptions {
  page?: number
  limit?: number
  search?: string
  projectId?: string
  investorId?: string
  paymentStatus?: string[]
  allocated?: boolean
  distributionStatus?: string[]
  subscriptionDateFrom?: Date
  subscriptionDateTo?: Date
  includeInvestor?: boolean
  includeProject?: boolean
  includeAllocations?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TokenAllocationQueryOptions {
  page?: number
  limit?: number
  search?: string
  projectId?: string
  investorId?: string
  subscriptionId?: string
  tokenType?: string[]
  standard?: TokenStandardEnum[]
  distributed?: boolean
  allocationDateFrom?: Date
  allocationDateTo?: Date
  includeInvestor?: boolean
  includeProject?: boolean
  includeSubscription?: boolean
  includeToken?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DistributionQueryOptions {
  page?: number
  limit?: number
  search?: string
  projectId?: string
  investorId?: string
  tokenType?: string[]
  blockchain?: string[]
  fullyRedeemed?: boolean
  distributionDateFrom?: Date
  distributionDateTo?: Date
  includeInvestor?: boolean
  includeProject?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Analytics and Statistics Types
// ============================================================================

export interface CapTableStatistics {
  totalInvestors: number
  totalRaised: Decimal
  totalTokensAllocated: Decimal
  totalTokensDistributed: Decimal
  averageInvestment: Decimal
  medianInvestment: Decimal
  completionPercentage: number
  kycCompletionRate: number
  distributionCompletionRate: number
}

export interface InvestorStatistics {
  totalInvestors: number
  activeInvestors: number
  kycApprovedInvestors: number
  averageInvestment: Decimal
  totalNetWorth: Decimal
  investorTypeDistribution: Record<string, number>
  riskToleranceDistribution: Record<string, number>
  geographicDistribution: Record<string, number>
}

export interface SubscriptionStatistics {
  totalSubscriptions: number
  totalAmount: Decimal
  averageSubscription: Decimal
  medianSubscription: Decimal
  allocationRate: number
  paymentCompletionRate: number
  monthlySubscriptionTrend: Array<{
    month: string
    count: number
    amount: Decimal
  }>
}

export interface TokenAllocationStatistics {
  totalAllocations: number
  totalTokensAllocated: Decimal
  totalTokensDistributed: Decimal
  averageAllocation: Decimal
  distributionRate: number
  tokenTypeDistribution: Record<string, Decimal>
  standardDistribution: Record<string, number>
}

export interface DistributionStatistics {
  totalDistributions: number
  totalTokensDistributed: Decimal
  averageDistribution: Decimal
  blockchainDistribution: Record<string, number>
  redemptionRate: number
  monthlyDistributionTrend: Array<{
    month: string
    count: number
    amount: Decimal
  }>
}

export interface CapTableAnalytics {
  summary: CapTableStatistics
  investors: InvestorStatistics
  subscriptions: SubscriptionStatistics
  allocations: TokenAllocationStatistics
  distributions: DistributionStatistics
  timeline: Array<{
    date: string
    cumulativeRaised: Decimal
    newInvestors: number
    newSubscriptions: number
    newAllocations: number
    newDistributions: number
  }>
  geography: Array<{
    country: string
    investors: number
    amount: Decimal
    percentage: number
  }>
  demographics: {
    investorTypes: Record<string, number>
    riskProfiles: Record<string, number>
    investmentSizes: Record<string, number>
    accreditation: Record<string, number>
  }
}

// ============================================================================
// Bulk Operations Types
// ============================================================================

export interface BulkSubscriptionCreateRequest {
  subscriptions: SubscriptionCreateRequest[]
  options?: {
    validateBeforeCreate?: boolean
    createAuditLog?: boolean
    notifyInvestors?: boolean
  }
}

export interface BulkSubscriptionUpdateRequest {
  subscriptionIds: string[]
  updates: SubscriptionUpdateRequest
  options?: {
    validateBeforeUpdate?: boolean
    createAuditLog?: boolean
    notifyInvestors?: boolean
  }
}

export interface BulkTokenAllocationCreateRequest {
  allocations: TokenAllocationCreateRequest[]
  options?: {
    validateBeforeCreate?: boolean
    createAuditLog?: boolean
    autoDistribute?: boolean
  }
}

export interface BulkTokenAllocationUpdateRequest {
  allocationIds: string[]
  updates: TokenAllocationUpdateRequest
  options?: {
    validateBeforeUpdate?: boolean
    createAuditLog?: boolean
  }
}

export interface BulkDistributionCreateRequest {
  distributions: DistributionCreateRequest[]
  options?: {
    validateBeforeCreate?: boolean
    createAuditLog?: boolean
    executeBlockchainTransactions?: boolean
  }
}

// ============================================================================
// Export/Import Types
// ============================================================================

export interface CapTableExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  includeInvestors?: boolean
  includeSubscriptions?: boolean
  includeAllocations?: boolean
  includeDistributions?: boolean
  includeStatistics?: boolean
  includeCompliance?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  fields?: string[]
}

export interface InvestorImportOptions {
  investors: InvestorCreateRequest[]
  options?: {
    skipValidation?: boolean
    updateExisting?: boolean
    sendInvitations?: boolean
    createAuditLog?: boolean
  }
}

// ============================================================================
// Validation Types
// ============================================================================

export interface CapTableValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  completionPercentage: number
  missingFields: string[]
  requiredActions: string[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  recommendation?: string
}

// ============================================================================
// Compliance and Audit Types
// ============================================================================

export interface ComplianceCheck {
  checkType: string
  status: ComplianceStatus
  details: string
  lastChecked: Date
  nextCheckDue?: Date
  severity: 'high' | 'medium' | 'low'
}

export interface AuditTrailEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId?: string
  userName?: string
  timestamp: Date
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// ============================================================================
// Re-export imported types that services need
// ============================================================================

// Re-export Prisma types (already imported above with proper aliases)
export type { 
  CapTable, 
  Investor, 
  Subscription, 
  TokenAllocation, 
  Distribution,
  Project,
  Token,
  InvestorApproval
}

// Re-export API types
export type {
  ServiceResult,
  PaginatedResponse,
  BatchResult
} from '@/types/api'
