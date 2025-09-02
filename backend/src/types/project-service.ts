/**
 * Backend Project Service Types
 * Comprehensive types for project service operations
 */

// Import domain types
import { 
  ProjectStatus, 
  InvestmentStatus 
} from '@/types/projects'
import { ServiceResult, BatchResult } from '@/types/api'
import { Json } from '@/types/utils'
import { project_duration as ProjectDuration } from '@/infrastructure/database/generated/index'

/**
 * Core Project Creation Interface
 * Used for creating new projects with essential fields
 */
export interface ProjectCreateRequest {
  name: string // Required
  description?: string
  projectType: string // Required
  status?: ProjectStatus
  investmentStatus?: InvestmentStatus
  isPrimary?: boolean
  
  // Financial fields
  targetRaise?: number
  totalNotional?: number
  minimumInvestment?: number
  authorizedShares?: number
  sharePrice?: number
  companyValuation?: number
  estimatedYieldPercentage?: number
  currency?: string
  
  // Date fields
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  transactionStartDate?: string
  maturityDate?: string
  duration?: ProjectDuration
  
  // Legal fields
  legalEntity?: string
  jurisdiction?: string
  taxId?: string
  
  // Token fields
  tokenSymbol?: string
  
  // Universal ESG & Sustainability fields
  sustainabilityClassification?: string
  esgRiskRating?: string
  principalAdverseImpacts?: string
  taxonomyAlignmentPercentage?: number
  
  // Risk & Governance fields
  riskProfile?: string
  governanceStructure?: string
  complianceFramework?: string[]
  thirdPartyCustodian?: boolean
  custodianName?: string
  
  // Investor Protection fields
  targetInvestorType?: string
  complexityIndicator?: string
  liquidityTerms?: string
  feeStructureSummary?: string
  
  // Traditional Assets - Structured Products
  capitalProtectionLevel?: number
  underlyingAssets?: string[]
  barrierLevel?: number
  payoffStructure?: string
  
  // Traditional Assets - Equity
  votingRights?: string
  dividendPolicy?: string
  dilutionProtection?: string[]
  exitStrategy?: string
  
  // Traditional Assets - Bonds
  creditRating?: string
  couponFrequency?: string
  callableFeatures?: boolean
  callDate?: string
  callPrice?: number
  securityCollateral?: string
  
  // Alternative Assets - Private Equity
  fundVintageYear?: number
  investmentStage?: string
  sectorFocus?: string[]
  geographicFocus?: string[]
  
  // Alternative Assets - Real Estate
  propertyType?: string
  geographicLocation?: string
  developmentStage?: string
  environmentalCertifications?: string[]
  
  // Alternative Assets - Receivables
  debtorCreditQuality?: string
  collectionPeriodDays?: number
  recoveryRatePercentage?: number
  diversificationMetrics?: string
  
  // Alternative Assets - Energy/Solar & Wind
  projectCapacityMw?: number
  powerPurchaseAgreements?: string
  regulatoryApprovals?: string[]
  carbonOffsetPotential?: number
  
  // Digital Assets - All Digital Assets
  blockchainNetwork?: string
  smartContractAuditStatus?: string
  consensusMechanism?: string
  gasFeeStructure?: string
  oracleDependencies?: string[]
  
  // Digital Assets - Stablecoins
  collateralType?: string
  reserveManagementPolicy?: string
  auditFrequency?: string
  redemptionMechanism?: string
  depegRiskMitigation?: string[]
  
  // Digital Assets - Tokenized Funds
  tokenEconomics?: string
  custodyArrangements?: string
  smartContractAddress?: string
  upgradeGovernance?: string
  
  // Operational & Compliance
  dataProcessingBasis?: string
  privacyPolicyLink?: string
  dataRetentionPolicy?: string
  businessContinuityPlan?: boolean
  cybersecurityFramework?: string[]
  disasterRecoveryProcedures?: string
  taxReportingObligations?: string[]
  regulatoryPermissions?: string[]
  crossBorderImplications?: string
}

/**
 * Project Update Interface
 * Excludes system-managed fields for updates
 */
export interface ProjectUpdateRequest extends Partial<ProjectCreateRequest> {
  // All fields from create are optional for updates
}

/**
 * Complete Project Response Interface
 * Full project data returned from database
 */
export interface ProjectResponse extends ProjectCreateRequest {
  id: string
  createdAt: string
  updatedAt: string
}

/**
 * Enhanced Project with Statistics
 */
export interface ProjectWithStats extends ProjectResponse {
  // Completion tracking
  completionPercentage?: number
  missingFields?: string[]
  
  // Wallet information
  walletRequired?: boolean
  hasWallet?: boolean
  
  // Investment statistics
  investorCount?: number
  raisedAmount?: number
  totalAllocation?: number
  subscriptionCount?: number
  
  // Token information
  tokenCount?: number
  deployedTokens?: number
  
  // Compliance status
  complianceScore?: number
  kycCompletionRate?: number
  
  // Cap table information
  capTableId?: string
  capTableInvestorCount?: number
}

/**
 * Project Statistics Interface
 */
export interface ProjectStatistics {
  investorCount: number
  totalAllocation: number
  raisedAmount: number
  subscriptionCount: number
  tokenCount: number
  deployedTokens: number
  complianceScore: number
  kycCompletionRate: number
  capTableInvestorCount: number
}

/**
 * Project Form Data Interface (Frontend compatibility)
 */
export interface ProjectFormData {
  name: string
  description: string
  status: string
  projectType: string
  tokenSymbol: string
  targetRaise: string
  authorizedShares: string
  sharePrice: string
  fundingRound?: string
  legalEntity?: string
  jurisdiction?: string
  taxId?: string
  isPrimary?: boolean
  investmentStatus?: string
  minimumInvestment?: string
  currency?: string
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  transactionStartDate?: string
  maturityDate?: string
}

/**
 * Project Query Options
 */
export interface ProjectQueryOptions {
  // Pagination
  page?: number
  limit?: number
  offset?: number
  
  // Filtering
  status?: ProjectStatus[]
  projectType?: string[]
  investmentStatus?: InvestmentStatus[]
  isPrimary?: boolean
  
  // Search
  search?: string
  searchFields?: string[]
  
  // Date filters
  createdAfter?: string
  createdBefore?: string
  maturityAfter?: string
  maturityBefore?: string
  
  // Financial filters
  minTargetRaise?: number
  maxTargetRaise?: number
  minMinimumInvestment?: number
  maxMinimumInvestment?: number
  
  // Sorting
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  
  // Include related data
  includeStatistics?: boolean
  includeTokens?: boolean
  includeCapTable?: boolean
  includeCompliance?: boolean
  includeWallet?: boolean
}

/**
 * Project Validation Result
 */
export interface ProjectValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    code: string
  }>
  warnings: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Project Creation Result
 */
export interface ProjectCreationResult {
  project: ProjectWithStats
  capTable?: {
    id: string
    name: string
  }
  validation: ProjectValidationResult
}

/**
 * Bulk Project Operations
 */
export interface BulkProjectUpdateRequest {
  projectIds: string[]
  updates: ProjectUpdateRequest
  options?: {
    validateBeforeUpdate?: boolean
    createAuditLog?: boolean
  }
}

/**
 * Project Category Types
 */
export type ProjectCategory = 'traditional' | 'alternative' | 'digital'

/**
 * Project Compliance Summary
 */
export interface ProjectComplianceSummary {
  totalProjects: number
  byCategory: Record<ProjectCategory, number>
  completionStatus: {
    complete: number
    incomplete: number
  }
  esgRatings: {
    low: number
    medium: number
    high: number
    notAssessed: number
  }
  sfdrClassification: {
    article6: number
    article8: number
    article9: number
    notApplicable: number
  }
  digitalAssets: {
    total: number
    withWallet: number
    withoutWallet: number
  }
}

/**
 * Project Analytics Data
 */
export interface ProjectAnalytics {
  projectId: string
  summary: {
    totalRaised: number
    totalInvestors: number
    averageInvestment: number
    targetCompletion: number
    timeToTarget: number
  }
  timeline: Array<{
    date: string
    cumulativeRaised: number
    newInvestors: number
    transactions: number
  }>
  geography: Array<{
    country: string
    investors: number
    amount: number
    percentage: number
  }>
  demographics: {
    investorTypes: Record<string, number>
    riskProfiles: Record<string, number>
    investmentSizes: Record<string, number>
  }
}

/**
 * Project Export Options
 */
export interface ProjectExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]
  includeStatistics: boolean
  includeCompliance: boolean
  dateRange?: {
    start: string
    end: string
  }
}

/**
 * Project Import Data
 */
export interface ProjectImportData {
  projects: ProjectCreateRequest[]
  options: {
    skipValidation?: boolean
    createCapTables?: boolean
    setAsPrimary?: string // Project name to set as primary
  }
}

/**
 * Project Document Reference
 */
export interface ProjectDocumentReference {
  id: string
  name: string
  type: string
  status: string
  uploadedAt: string
  size: number
}

/**
 * Project Wallet Information
 */
export interface ProjectWalletInfo {
  id: string
  projectId: string
  walletAddress: string
  blockchain: string
  network: string
  isActive: boolean
  balance?: number
  lastActivity?: string
}

/**
 * Project Audit Trail Entry
 */
export interface ProjectAuditEntry {
  id: string
  projectId: string
  action: string
  userId: string
  userName: string
  timestamp: string
  details: Json
  ipAddress?: string
  userAgent?: string
}

// ============================================================================
// Re-export imported types that services need
// ============================================================================

// Re-export domain types
export type { 
  ProjectStatus, 
  InvestmentStatus 
} from '@/types/projects'

// Re-export database generated types (already imported above with proper alias)
export type { ProjectDuration }

// Re-export API types
export type { ServiceResult, BatchResult } from '@/types/api'

// Re-export utility types
export type { Json } from '@/types/utils'
