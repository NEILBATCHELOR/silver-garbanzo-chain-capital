// Core redemption types for the redemption module
// Following the existing database schema and domain-specific architecture

// New types for redemption window relative date configuration
export type SubmissionDateMode = 'fixed' | 'relative';
export type ProcessingDateMode = 'fixed' | 'same_day' | 'offset';
export type NavSource = 'manual' | 'oracle' | 'calculated'; // Database constraint values

export interface RedemptionWindow {
  id: string;
  config_id: string;
  project_id?: string;
  organization_id?: string;
  name: string;
  
  // Date Configuration Modes
  submission_date_mode: SubmissionDateMode;
  processing_date_mode: ProcessingDateMode;
  
  // Relative Date Settings
  lockup_days?: number; // Days after issuance when redemption submissions can begin (0 = same day)
  processing_offset_days?: number; // Days after submission period for processing (default 1 = next day)
  
  // Fixed Date Settings (legacy and alternative)
  start_date: Date;
  end_date: Date;
  submission_start_date: Date;
  submission_end_date: Date;
  
  // Financial Settings
  nav?: number;
  nav_date?: string;
  nav_source?: NavSource;
  max_redemption_amount?: number;
  min_redemption_amount?: number;
  
  // Enhanced Processing Settings
  enable_pro_rata_distribution?: boolean;
  auto_process?: boolean;
  is_active?: boolean;
  is_template?: boolean;
  pro_rata_factor?: number;
  processing_fee_percentage?: number;
  early_redemption_penalty?: number;
  
  // Enhanced Status Tracking
  status: 'upcoming' | 'submission_open' | 'submission_closed' | 'processing' | 'completed' | 'cancelled';
  submission_status?: 'not_started' | 'open' | 'closed' | 'extended' | 'cancelled';
  processing_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  // Metrics
  total_requests: number;
  total_request_value: number;
  processed_requests: number;
  processed_value: number;
  rejected_requests: number;
  queued_requests: number;
  
  // Audit Trail
  notes?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  last_modified_by?: string;
  last_status_change_at?: Date;
  processed_by?: string;
  processed_at?: Date;
  approved_by?: string;
  approved_at?: Date;
}

export interface RedemptionWindowTemplate {
  id: string;
  name: string;
  description?: string;
  
  // Template Configuration
  submission_date_mode: SubmissionDateMode;
  processing_date_mode: ProcessingDateMode;
  lockup_days?: number;
  processing_offset_days: number;
  
  // Default Settings
  default_nav_source?: NavSource;
  default_enable_pro_rata_distribution?: boolean;
  default_auto_process?: boolean;
  
  // Template Metadata
  is_active?: boolean;
  created_by?: string;
  project_id?: string;
  organization_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRedemptionWindowTemplateInput {
  name: string;
  description?: string;
  submission_date_mode: SubmissionDateMode;
  processing_date_mode: ProcessingDateMode;
  lockup_days?: number;
  processing_offset_days?: number;
  default_nav_source?: NavSource;
  default_enable_pro_rata_distribution?: boolean;
  default_auto_process?: boolean;
  project_id?: string;
  organization_id?: string;
}

export interface RedemptionWindowConfig {
  id: string;
  name: string;
  fund_id: string;
  frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  submission_window_days: number;
  lock_up_period: number;
  max_redemption_percentage?: number;
  enable_pro_rata_distribution: boolean;
  queue_unprocessed_requests: boolean;
  use_window_nav: boolean;
  lock_tokens_on_request: boolean;
  enable_admin_override: boolean;
  notification_days: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RedemptionRequest {
  id: string;
  tokenAmount: number;
  tokenType: string;
  tokenSymbol?: string; // Token symbol from related distribution
  redemptionType: 'standard' | 'interval';
  status: RedemptionStatus;
  sourceWallet: string;
  destinationWallet: string;
  sourceWalletAddress: string; // Keep for backward compatibility
  destinationWalletAddress: string; // Keep for backward compatibility
  conversionRate: number;
  usdcAmount: number;
  investorName?: string;
  investorId?: string;
  requiredApprovals: number;
  isBulkRedemption?: boolean;
  investorCount?: number;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectionTimestamp?: Date;
  notes?: string;
  submittedAt: Date;
  validatedAt?: Date;
  approvedAt?: Date;
  executedAt?: Date;
  settledAt?: Date; // Add settledAt property - calculated from status
  createdAt: Date;
  updatedAt: Date;
}

export type RedemptionStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'processing' 
  | 'settled' 
  | 'rejected' 
  | 'cancelled';

export interface Distribution {
  id: string;
  tokenAllocationId: string;
  investorId: string;
  subscriptionId: string;
  projectId?: string;
  tokenType: string;
  tokenAmount: number;
  distributionDate: Date;
  distributionTxHash: string;
  walletId?: string;
  blockchain: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  toAddress: string;
  status: string;
  notes?: string;
  remainingAmount: number;
  fullyRedeemed: boolean;
  standard?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Enriched distribution with related investor, subscription, and token allocation data
export interface EnrichedDistribution extends Distribution {
  investor?: {
    investor_id: string;
    name: string;
    email: string;
    type: string;
    company?: string;
    wallet_address?: string;
    kyc_status: string;
    investor_status: string;
    investor_type: string;
    onboarding_completed: boolean;
    accreditation_status: string;
  };
  subscription?: {
    id: string;
    subscription_id: string;
    fiat_amount: number; // Changed from string to number to match database schema
    currency: string;
    confirmed: boolean;
    allocated: boolean;
    distributed: boolean;
    notes?: string;
    subscription_date: string;
  };
  tokenAllocation?: {
    id: string;
    token_type: string;
    token_amount: string;
    distributed: boolean;
    distribution_date?: string;
    distribution_tx_hash?: string;
    minted: boolean;
    minting_date?: string;
    minting_tx_hash?: string;
    standard?: string;
    symbol?: string;
    token_id?: string;
    notes?: string;
  };
}

export interface DistributionRedemption {
  id: string;
  distributionId: string;
  redemptionRequestId: string;
  amountRedeemed: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RedemptionApprover {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  // Database fields for persisted approvers
  redemptionId?: string;
  approverId?: string; // Maps to id for database operations
  approved?: boolean;
  approvedAt?: Date;
  status?: string;
  comments?: string;
  decisionDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RedemptionRule {
  id: string;
  ruleId?: string;
  tokenType?: string;
  redemptionType: 'standard' | 'interval';
  allowRedemption?: boolean;
  requireMultiSigApproval?: boolean;
  requiredApprovers?: number;
  totalApprovers?: number;
  notifyInvestors?: boolean;
  settlementMethod?: string;
  immediateExecution?: boolean;
  useLatestNav?: boolean;
  allowAnyTimeRedemption?: boolean;
  repurchaseFrequency?: string;
  lockUpPeriod?: number;
  submissionWindowDays?: number;
  lockTokensOnRequest?: boolean;
  useWindowNav?: boolean;
  enableProRataDistribution?: boolean;
  queueUnprocessedRequests?: boolean;
  enableAdminOverride?: boolean;
  // Additional properties used in rule compliance validation
  productType?: string;
  productId?: string;
  isRedemptionOpen?: boolean;
  openAfterDate?: Date;
  allowContinuousRedemption?: boolean;
  maxRedemptionPercentage?: number;
  redemptionEligibilityRules?: any;
  targetRaiseAmount?: number;
  projectId?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Utility types for type safety
export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  lockupExpiry?: Date;
  windowInfo?: RedemptionWindowInfo;
  restrictions?: string[];
}

export interface RedemptionWindowInfo {
  isOpen: boolean;
  openDate?: Date;
  closeDate?: Date;
  nextWindow?: Date;
  currentWindow?: Date;
  reason?: string;
}

export interface ValidationResult {
  approved: boolean;
  reason?: string;
  queuePosition?: number;
}

export interface SettlementResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  settlement?: SettlementDetails;
}

export interface SettlementDetails {
  tokensBurned: number;
  usdcAmount: number;
  feeAmount?: number;
  settlementDate: Date;
  blockchain: string;
}

// Enhanced types for interval fund redemptions
export interface IntervalFundConfig {
  repurchaseFrequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  lockUpPeriod: number;
  submissionWindowDays: number;
  lockTokensOnRequest: boolean;
  useWindowNav: boolean;
  enableProRataDistribution: boolean;
  queueUnprocessedRequests: boolean;
  enableAdminOverride: boolean;
}

// Enhanced types for standard redemptions
export interface StandardRedemptionConfig {
  immediateExecution: boolean;
  useLatestNav: boolean;
  allowAnyTimeRedemption: boolean;
}

// Multi-signature approval types
export interface MultiSigApproval {
  requiredApprovals: number;
  totalApprovers: number;
  approvers: RedemptionApprover[];
  currentApprovals: number;
  isComplete: boolean;
}

// Bulk redemption types
export interface BulkRedemptionData {
  investors: BulkInvestorData[];
  totalAmount: number;
  tokenType: string;
  redemptionType: 'standard' | 'interval';
  conversionRate: number;
}

export interface BulkInvestorData {
  investorId: string;
  investorName: string;
  tokenAmount: number;
  walletAddress: string;
  distributionId?: string;
  sourceWallet?: string;
  destinationWallet?: string;
  usdcAmount?: number;
}

// API request/response types
export interface CreateRedemptionRequestInput {
  distributionId?: string; // Distribution ID to auto-populate investor details
  tokenAmount: number;
  tokenType: string;
  tokenSymbol?: string; // Optional token symbol for display
  redemptionType: 'standard' | 'interval';
  sourceWallet: string;
  destinationWallet: string;
  sourceWalletAddress: string; // Keep for backward compatibility
  destinationWalletAddress: string; // Keep for backward compatibility
  conversionRate: number;
  usdcAmount: number;
  investorName?: string; // Auto-populated from distribution if not provided
  investorId?: string; // Auto-populated from distribution if not provided
  projectId?: string; // Project ID for the redemption request
  notes?: string;
}

export interface RedemptionRequestResponse {
  success: boolean;
  data?: RedemptionRequest;
  error?: string;
}

export interface RedemptionListResponse {
  success: boolean;
  data?: RedemptionRequest[];
  redemptions?: RedemptionRequest[]; // Alias for data for backward compatibility
  totalCount?: number;
  hasMore?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Response type for enriched distributions
export interface EnrichedDistributionResponse {
  success: boolean;
  data?: EnrichedDistribution[];
  error?: string;
}
