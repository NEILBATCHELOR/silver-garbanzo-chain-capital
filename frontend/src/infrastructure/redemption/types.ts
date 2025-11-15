/**
 * Stage 7: Redemption Request Management - Core Types
 * Comprehensive type definitions for the redemption request system
 */

export type RedemptionStatus =
  | 'draft'
  | 'pending_validation'
  | 'validated'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PriorityLevel = 'standard' | 'priority' | 'urgent';

export interface LockStatus {
  isLocked: boolean;
  lockedAmount?: bigint;
  lockReason?: string;
  unlockDate?: string;
  lockType?: 'regulatory' | 'contractual' | 'technical' | 'administrative';
}

export interface ComplianceCheck {
  checkType: string;
  passed: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

export interface RequestMetadata {
  investorWallet: string;
  projectWallet: string;
  currentBalance: string;
  availableBalance: string;
  lockStatus: LockStatus;
  complianceChecks: ComplianceCheck[];
  priorityLevel: PriorityLevel;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface RuleValidation {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  errorCode?: string;
  field?: string;
}

export interface PolicyValidation {
  policyId: string;
  policyName: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  rules: RuleValidation[];
  policies: PolicyValidation[];
  warnings: string[];
  errors: ValidationError[];
  recommendations: string[];
}

export interface RedemptionRequest {
  id: string;
  investorId: string;
  tokenId: string;
  tokenAddress: string;
  amount: bigint;
  exchangeRate?: number;
  targetCurrency: 'USDC' | 'USDT';
  requestedAt: string;
  status: RedemptionStatus;
  windowId?: string;
  validationResult?: ValidationResult;
  metadata: RequestMetadata;
}

export interface CreateRequestParams {
  investorId: string;
  tokenId: string;
  tokenAddress: string;
  amount: bigint;
  targetCurrency: 'USDC' | 'USDT';
  investorWallet: string;
}

// Validator interfaces
export interface ValidatorConfig {
  enabled?: boolean;
  thresholds?: Record<string, any>;
}

export interface ValidatorResult {
  passed: boolean;
  message: string;
  errorCode?: string;
  field?: string;
  metadata?: Record<string, any>;
}

// Queue interfaces
export interface QueueConfig {
  maxSize?: number;
  processingInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueueItem<T> {
  id: string;
  item: T;
  priority: number;
  enqueuedAt: string;
  retryCount: number;
}

// Request Manager interfaces
export interface RequestManagerConfig {
  policyConfig: any;
  validatorConfig: ValidatorConfig;
  queueConfig: QueueConfig;
  walletConfig: any;
}
