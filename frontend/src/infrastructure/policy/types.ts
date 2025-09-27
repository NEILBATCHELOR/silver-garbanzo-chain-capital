/**
 * Policy Engine Types and Interfaces
 * Core types for policy evaluation and cryptographic operations
 */

import type { Policy } from '@/services/policy/enhancedPolicyService';
import type { PolicyRule } from '@/services/rule/enhancedRuleService';

// ==================== Crypto Operation Types ====================

export type OperationType = 
  | 'mint' 
  | 'burn' 
  | 'transfer' 
  | 'lock' 
  | 'unlock' 
  | 'block' 
  | 'unblock';

export interface CryptoOperation {
  type: OperationType;
  amount?: bigint | string;
  from?: string;
  to?: string;
  tokenId?: string;
  tokenAddress?: string;
  chainId?: string;
  metadata?: Record<string, any>;
  lockDuration?: number; // for lock operations
  lockReason?: string;   // for lock/block operations
  partition?: string;    // for ERC-1400
}

// ==================== Context Types ====================

export interface UserContext {
  id: string;
  address: string;
  role?: string;
  permissions?: string[];
  kycStatus?: string;
  kycVerified?: boolean;
  governanceApproved?: boolean;
  productionApproved?: boolean;
  jurisdiction?: string;
  metadata?: Record<string, any>;
}

export interface TokenContext {
  id: string;
  address: string;
  name: string;
  symbol: string;
  standard: string;
  chainId: string;
  totalSupply?: string;
  decimals?: number;
  metadata?: Record<string, any>;
}

export interface EnvironmentContext {
  chainId: string;
  network: 'mainnet' | 'testnet' | 'local' | 'devnet' | 'regtest';
  timestamp: number;
  blockNumber?: number;
  gasPrice?: bigint;
  metadata?: Record<string, any>;
}

export interface PolicyContext {
  operation: CryptoOperation;
  user: UserContext;
  token: TokenContext;
  environment: EnvironmentContext;
}

// ==================== Evaluation Result Types ====================

export interface PolicyViolation {
  policyId: string;
  policyName?: string;
  violationType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation?: string;
  metadata?: Record<string, any>;
}

export interface PolicyResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  violations: PolicyViolation[];
  warnings?: string[];
  details?: string;
  evaluationTime?: number;
  metadata?: Record<string, any>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  policies: PolicyResult[];
  violations: PolicyViolation[];
  warnings: string[];
  metadata: Record<string, any>;
  evaluationId?: string;
  timestamp?: string;
}

// ==================== Cache Types ====================

export interface PolicyCacheEntry {
  key: string;
  result: PolicyEvaluationResult;
  expires: number;
  hitCount: number;
}

export interface PolicyCacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number;
}

// ==================== Engine Configuration ====================

export interface PolicyEngineConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  evaluationTimeout?: number;
  parallelEvaluation?: boolean;
  strictMode?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ==================== Validator Interfaces ====================

export interface OperationValidator {
  validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ==================== Rule Evaluation Types ====================

export interface RuleEvaluationContext {
  operation: CryptoOperation;
  policyContext: PolicyContext;
  previousEvaluations: RuleResult[];
  globalState: GlobalRuleState;
}

export interface GlobalRuleState {
  totalVolumeToday?: bigint;
  totalTransactionsToday?: number;
  lastOperationTime?: number;
  operationHistory?: CryptoOperation[];
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  kycVerified?: boolean;
  amlVerified?: boolean;
  sanctionsClear?: boolean;
  riskScore?: number;
  accreditedInvestor?: boolean;
  jurisdiction?: string;
  documents?: string[];
  complianceLastChecked?: number;
}

export interface RiskFactors {
  transactionRisk: number;
  userRisk: number;
  counterpartyRisk: number;
  jurisdictionRisk: number;
  overallRisk: number;
}

export interface ComplianceStatus {
  compliant: boolean;
  level: 'full' | 'partial' | 'non-compliant';
  score: number;
  details: string;
}

export interface MarketConditions {
  volatility: number;
  liquidityDepth: bigint;
  priceImpact: number;
  slippage: number;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score?: number;
  conditions: ConditionResult[];
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ConditionResult {
  type: string;
  passed: boolean;
  actual: string;
  expected?: string;
  message?: string;
}

export interface PipelineResult {
  success: boolean;
  rules: RuleResult[];
  conflicts: RuleConflict[];
  aggregateScore: number;
  recommendation: 'approve' | 'reject' | 'review';
}

export interface RuleConflict {
  rule1: RuleResult;
  rule2: RuleResult;
  type: ConflictType;
  resolution: ConflictResolution;
}

export type ConflictType = 'AMOUNT_CONFLICT' | 'TIME_CONFLICT' | 'ADDRESS_CONFLICT' | 'LOGICAL_CONFLICT';

export interface ConflictResolution {
  winner: string;
  strategy: 'priority' | 'critical' | 'restrictive' | 'permissive';
  reason?: string;
}

export interface PolicyRuleExtended extends PolicyRule {
  critical?: boolean;
  // priority is inherited from PolicyRule as 'high' | 'medium' | 'low'
}

export interface RuleDetails {
  // Amount rules
  maxAmount?: string | number;
  minAmount?: string | number;
  dailyLimit?: string | number;
  weeklyLimit?: string | number;
  monthlyLimit?: string | number;
  volumeThreshold?: string | number;
  
  // Address rules
  whitelistedAddresses?: string[];
  blacklistedAddresses?: string[];
  requiredSigners?: string[];
  minSignatures?: number;
  requireSmartContract?: boolean;
  requireEOA?: boolean;
  
  // Time rules
  allowedHours?: { start: number; end: number };
  blackoutDates?: string[];
  maintenanceWindows?: any[];
  maxOperationsPerHour?: number;
  maxOperationsPerDay?: number;
  cooldownPeriod?: number;
  businessHoursOnly?: boolean;
  
  // Frequency rules
  maxTransactionsPerPeriod?: number;
  periodDuration?: number;
  burstLimit?: number;
  burstWindow?: number;
  rollingWindowLimit?: number;
  rollingWindowDuration?: number;
  maxUniqueRecipientsPerPeriod?: number;
  uniqueRecipientPeriod?: number;
  
  // Compliance rules
  requireKYC?: boolean;
  requireAML?: boolean;
  requireSanctionsScreening?: boolean;
  riskThreshold?: number;
  requiredDocuments?: string[];
  restrictedJurisdictions?: string[];
  requireAccreditedInvestor?: boolean;
  complianceExpiryDays?: number;
  reportingThreshold?: string | number;
  requiredCompliance?: string[];
  
  // Other
  [key: string]: any;
}

export interface TimeWindow {
  start: string;
  end: string;
  timezone?: string;
}

export interface RuleValidationError extends ValidationError {
  ruleId: string;
  ruleName: string;
}

export interface RuleEvaluationMetrics {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  averageEvaluationTime: number;
  conflicts: number;
}

export interface FailureReason {
  ruleId: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
