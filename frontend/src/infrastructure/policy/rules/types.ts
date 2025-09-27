/**
 * Type definitions for Rule Evaluation Pipeline - Enhanced
 */

import type { CryptoOperation, PolicyContext } from '../PolicyEngine';
import type { PolicyRule } from '@/services/rule/enhancedRuleService';

export interface RuleEvaluationContext {
  operation: CryptoOperation;
  policyContext: PolicyContext;
  previousEvaluations: RuleResult[];
  globalState: GlobalRuleState;
  userProfile?: UserProfile;
  riskFactors?: RiskFactors;
  timestamp?: string;
}

export interface GlobalRuleState {
  dailyOperationCount?: number;
  weeklyOperationCount?: number;
  monthlyOperationCount?: number;
  totalVolumeToday?: bigint;
  totalVolumeWeek?: bigint;
  totalVolumeMonth?: bigint;
  lastOperationTime?: Date;
  userRiskScore?: number;
  regulatoryCompliance?: ComplianceStatus;
  marketConditions?: MarketConditions;
  operationHistory?: any[];
  averageTransactionSize?: bigint;
  velocityScore?: number;
  blacklistStatus?: boolean;
}

export interface UserProfile {
  address: string;
  kycLevel: number;
  amlStatus: 'verified' | 'pending' | 'failed' | 'expired';
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  accountAge: number; // days
  totalTransactions: number;
  totalVolume: bigint;
  flags: string[];
  restrictions: string[];
  whitelistStatus: boolean;
  lastActivityDate: string;
}

export interface RiskFactors {
  transactionRisk: number;
  addressRisk: number;
  patternRisk: number;
  complianceRisk: number;
  marketRisk: number;
  overallRisk: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  mitigationFactors: string[];
  timestamp: number;
}

export interface ComplianceStatus {
  kycVerified: boolean;
  amlChecked: boolean;
  sanctionsScreened: boolean;
  lastCheckDate: Date;
  riskRating?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string[];
}

export interface MarketConditions {
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  liquidityLevel: 'low' | 'medium' | 'high';
  priceImpact: number;
  marketSentiment?: 'bullish' | 'bearish' | 'neutral';
  trendDirection?: 'up' | 'down' | 'sideways';
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score?: number;
  conditions: ConditionResult[];
  metadata: Record<string, any>;
  timestamp: string;
  executionTime?: number;
}

export interface ConditionResult {
  type: string;
  passed: boolean;
  actual: string | number;
  expected: string | number;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
}

export interface PipelineResult {
  success: boolean;
  rules: RuleResult[];
  conflicts: RuleConflict[];
  aggregateScore: number;
  recommendation: 'approve' | 'reject' | 'review';
  executionTime?: number;
  metadata?: {
    totalRules?: number;
    passedRules?: number;
    failedRules?: number;
    criticalFailures?: number;
    terminatedEarly?: boolean;
    terminationReason?: string;
  };
  timestamp?: number;
}

export interface RuleConflict {
  rule1: RuleResult;
  rule2: RuleResult;
  type: ConflictType;
  resolution: ConflictResolution;
  resolved?: boolean;
}

export type ConflictType = 
  | 'AMOUNT_CONFLICT'
  | 'TIME_CONFLICT'
  | 'ADDRESS_CONFLICT'
  | 'FREQUENCY_CONFLICT'
  | 'PERMISSION_CONFLICT'
  | 'COMPLIANCE_CONFLICT';

export interface ConflictResolution {
  winner: string;
  strategy: 'priority' | 'critical' | 'restrictive' | 'permissive' | 'manual';
  reason?: string;
  requiresReview?: boolean;
}

// Extended PolicyRule type with additional fields for rule evaluation
export interface PolicyRuleExtended extends PolicyRule {
  critical?: boolean;
  weight?: number;
  category?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  jurisdiction?: string;
  details?: RuleDetails;
}

export interface RuleDetails {
  // Amount rules
  maxAmount?: string | bigint;
  minAmount?: string | bigint;
  dailyLimit?: string | bigint;
  weeklyLimit?: string | bigint;
  monthlyLimit?: string | bigint;
  volumeThreshold?: string | number;
  
  // Time rules
  allowedHours?: {
    start: number;
    end: number;
  };
  blackoutDates?: string[];
  maintenanceWindows?: TimeWindow[];
  maxOperationsPerHour?: number;
  maxOperationsPerDay?: number;
  businessHoursOnly?: boolean;
  
  // Address rules
  whitelistedAddresses?: string[];
  blacklistedAddresses?: string[];
  requiredSigners?: string[];
  minSignatures?: number;
  requireSmartContract?: boolean;
  requireEOA?: boolean;
  
  // Compliance rules
  requireKYC?: boolean;
  requireAML?: boolean;
  requireSanctionsScreening?: boolean;
  riskThreshold?: number;
  requiredCompliance?: string[];
  requiredDocuments?: string[];
  restrictedJurisdictions?: string[];
  requireAccreditedInvestor?: boolean;
  complianceExpiryDays?: number;
  reportingThreshold?: string | number;
  
  // Frequency rules
  cooldownPeriod?: number; // in seconds
  maxTransactionsPerPeriod?: number;
  periodDuration?: number; // in seconds
  burstLimit?: number;
  burstWindow?: number;
  rollingWindowLimit?: number;
  rollingWindowDuration?: number;
  maxUniqueRecipientsPerPeriod?: number;
  uniqueRecipientPeriod?: number;
  
  // Allow additional properties for extensibility
  [key: string]: any;
}

export interface TimeWindow {
  start: string; // ISO date string
  end: string; // ISO date string
  description?: string;
}

export interface RuleValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface RuleEvaluationMetrics {
  totalEvaluations: number;
  averageExecutionTime: number;
  successRate: number;
  conflictRate: number;
  topFailureReasons: FailureReason[];
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
}

// Cache-related types
export interface RuleCacheEntry {
  key: string;
  result: PipelineResult;
  expires: number;
  hitCount: number;
  priority?: number;
}

// Type guards
export function isAmountRule(rule: PolicyRuleExtended): boolean {
  return rule.type === 'amount' || !!(rule.details?.maxAmount || rule.details?.minAmount);
}

export function isTimeRule(rule: PolicyRuleExtended): boolean {
  return rule.type === 'time' || !!(rule.details?.allowedHours || rule.details?.blackoutDates);
}

export function isAddressRule(rule: PolicyRuleExtended): boolean {
  return rule.type === 'address' || !!(rule.details?.whitelistedAddresses || rule.details?.blacklistedAddresses);
}

export function isFrequencyRule(rule: PolicyRuleExtended): boolean {
  return rule.type === 'frequency' || !!(rule.details?.cooldownPeriod || rule.details?.maxTransactionsPerPeriod);
}

export function isComplianceRule(rule: PolicyRuleExtended): boolean {
  return rule.type === 'compliance' || !!(rule.details?.requiredCompliance || rule.details?.riskThreshold);
}
