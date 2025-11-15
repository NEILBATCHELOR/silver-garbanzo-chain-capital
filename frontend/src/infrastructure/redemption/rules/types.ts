/**
 * Stage 9: Redemption Rules & Windows - Type Definitions
 * Domain-specific types for redemption rules, windows, and constraints
 */

// ============================================================================
// Database Types (snake_case - matches Supabase schema)
// ============================================================================

export interface RedemptionWindowDB {
  id: string;
  start_date: string;
  end_date: string;
  submission_start_date: string;
  submission_end_date: string;
  nav: number | null;
  nav_date: string | null;
  nav_source: string | null;
  status: string;
  max_redemption_amount: number | null;
  current_requests: number | null;
  total_request_value: number | null;
  approved_requests: number | null;
  approved_value: number | null;
  rejected_requests: number | null;
  rejected_value: number | null;
  queued_requests: number | null;
  queued_value: number | null;
  processed_by: string | null;
  processed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  project_id: string | null;
  organization_id: string | null;
  submission_date_mode: 'fixed' | 'rolling';
  processing_date_mode: 'fixed' | 'offset';
  lockup_days: number | null;
  processing_offset_days: number;
  name: string | null;
  enable_pro_rata_distribution: boolean | null;
  auto_process: boolean | null;
  is_active: boolean | null;
  is_template: boolean | null;
  min_redemption_amount: number | null;
  pro_rata_factor: number | null;
  processing_fee_percentage: number | null;
  early_redemption_penalty: number | null;
  submission_status: string | null;
  processing_status: string | null;
  last_modified_by: string | null;
  last_status_change_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface RedemptionRuleDB {
  id: string;
  rule_id: string | null;
  redemption_type: string;
  require_multi_sig_approval: boolean | null;
  required_approvers: number | null;
  total_approvers: number | null;
  notify_investors: boolean | null;
  settlement_method: string | null;
  immediate_execution: boolean | null;
  use_latest_nav: boolean | null;
  allow_any_time_redemption: boolean | null;
  repurchase_frequency: string | null;
  lock_up_period: number | null;
  submission_window_days: number | null;
  lock_tokens_on_request: boolean | null;
  use_window_nav: boolean | null;
  enable_pro_rata_distribution: boolean | null;
  queue_unprocessed_requests: boolean | null;
  enable_admin_override: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  project_id: string | null;
  organization_id: string | null;
  product_type: string | null;
  product_id: string | null;
  is_redemption_open: boolean | null;
  open_after_date: string | null;
  allow_continuous_redemption: boolean | null;
  max_redemption_percentage: number | null;
  redemption_eligibility_rules: Record<string, any> | null;
  target_raise_amount: number | null;
  redemption_window_id: string | null;
  approval_config_id: string | null;
}

// ============================================================================
// Application Types (camelCase - for TypeScript usage)
// ============================================================================

export type WindowStatus = 
  | 'upcoming'
  | 'active'
  | 'open'
  | 'closed'
  | 'processing'
  | 'completed'
  | 'cancelled';

export type SubmissionDateMode = 'fixed' | 'rolling';
export type ProcessingDateMode = 'fixed' | 'offset';

export interface RedemptionWindow {
  id: string;
  startDate: string;
  endDate: string;
  submissionStartDate: string;
  submissionEndDate: string;
  nav: number | null;
  navDate: string | null;
  navSource: string | null;
  status: WindowStatus;
  maxRedemptionAmount: number | null;
  currentRequests: number;
  totalRequestValue: number;
  approvedRequests: number;
  approvedValue: number;
  rejectedRequests: number;
  rejectedValue: number;
  queuedRequests: number;
  queuedValue: number;
  processedBy: string | null;
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  projectId: string | null;
  organizationId: string | null;
  submissionDateMode: SubmissionDateMode;
  processingDateMode: ProcessingDateMode;
  lockupDays: number | null;
  processingOffsetDays: number;
  name: string | null;
  enableProRataDistribution: boolean;
  autoProcess: boolean;
  isActive: boolean;
  isTemplate: boolean;
  minRedemptionAmount: number;
  proRataFactor: number;
  processingFeePercentage: number;
  earlyRedemptionPenalty: number;
  submissionStatus: string;
  processingStatus: string;
  lastModifiedBy: string | null;
  lastStatusChangeAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export type RedemptionRuleType =
  | 'window_restriction'
  | 'percentage_limit'
  | 'holding_period'
  | 'minimum_balance'
  | 'maximum_frequency'
  | 'blackout_period'
  | 'investor_category';

export interface RedemptionRule {
  id: string;
  ruleId: string | null;
  redemptionType: string;
  requireMultiSigApproval: boolean;
  requiredApprovers: number;
  totalApprovers: number;
  notifyInvestors: boolean;
  settlementMethod: string;
  immediateExecution: boolean | null;
  useLatestNav: boolean | null;
  allowAnyTimeRedemption: boolean | null;
  repurchaseFrequency: string | null;
  lockUpPeriod: number | null;
  submissionWindowDays: number | null;
  lockTokensOnRequest: boolean | null;
  useWindowNav: boolean | null;
  enableProRataDistribution: boolean | null;
  queueUnprocessedRequests: boolean | null;
  enableAdminOverride: boolean | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  organizationId: string | null;
  productType: string | null;
  productId: string | null;
  isRedemptionOpen: boolean;
  openAfterDate: string | null;
  allowContinuousRedemption: boolean;
  maxRedemptionPercentage: number | null;
  redemptionEligibilityRules: Record<string, any>;
  targetRaiseAmount: number | null;
  redemptionWindowId: string | null;
  approvalConfigId: string | null;
}

// ============================================================================
// Rule Evaluation Types
// ============================================================================

export interface RuleConditions {
  minAmount?: bigint;
  maxAmount?: bigint;
  minHoldingPeriod?: number; // days
  maxRedemptionPercentage?: number;
  requiresApproval?: boolean;
  allowedInvestorTypes?: string[];
  blackoutDates?: string[];
}

export interface RuleActions {
  block?: boolean;
  requireApproval?: boolean;
  applyFee?: number;
  applyPenalty?: number;
  queueForLater?: boolean;
  notifyCompliance?: boolean;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleType: RedemptionRuleType;
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  metadata?: Record<string, any>;
}

export interface RuleEvaluationResult {
  allowed: boolean;
  rules: RuleEvaluation[];
  violations: Violation[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface Violation {
  rule: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

// ============================================================================
// Constraint Types
// ============================================================================

export interface RedemptionConstraints {
  maxRedemptionPercentage?: number;
  minHoldingPeriod?: number; // days
  maxRedemptionsPerPeriod?: number;
  periodDays?: number;
  minRedemptionAmount?: bigint;
  maxRedemptionAmount?: bigint;
  requiresWindowOpen?: boolean;
  allowContinuousRedemption?: boolean;
}

export interface ConstraintValidation {
  valid: boolean;
  message: string;
  metadata?: Record<string, any>;
}

export interface ConstraintResult {
  satisfied: boolean;
  violations: Violation[];
  metadata: Record<string, any>;
}

// ============================================================================
// Window Management Types
// ============================================================================

export interface CreateWindowParams {
  projectId: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  submissionStartDate: string;
  submissionEndDate: string;
  submissionDateMode?: SubmissionDateMode;
  processingDateMode?: ProcessingDateMode;
  lockupDays?: number;
  processingOffsetDays?: number;
  maxRedemptionAmount?: number;
  minRedemptionAmount?: number;
  enableProRataDistribution?: boolean;
  autoProcess?: boolean;
  isTemplate?: boolean;
}

export interface WindowFilter {
  projectId?: string;
  organizationId?: string;
  status?: WindowStatus;
  isActive?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface WindowUpdateParams {
  status?: WindowStatus;
  processedBy?: string;
  processedAt?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ============================================================================
// Type Mappers
// ============================================================================

export function mapWindowFromDB(db: RedemptionWindowDB): RedemptionWindow {
  return {
    id: db.id,
    startDate: db.start_date,
    endDate: db.end_date,
    submissionStartDate: db.submission_start_date,
    submissionEndDate: db.submission_end_date,
    nav: db.nav,
    navDate: db.nav_date,
    navSource: db.nav_source,
    status: db.status as WindowStatus,
    maxRedemptionAmount: db.max_redemption_amount,
    currentRequests: db.current_requests ?? 0,
    totalRequestValue: db.total_request_value ?? 0,
    approvedRequests: db.approved_requests ?? 0,
    approvedValue: db.approved_value ?? 0,
    rejectedRequests: db.rejected_requests ?? 0,
    rejectedValue: db.rejected_value ?? 0,
    queuedRequests: db.queued_requests ?? 0,
    queuedValue: db.queued_value ?? 0,
    processedBy: db.processed_by,
    processedAt: db.processed_at,
    notes: db.notes,
    createdAt: db.created_at ?? new Date().toISOString(),
    updatedAt: db.updated_at ?? new Date().toISOString(),
    createdBy: db.created_by,
    projectId: db.project_id,
    organizationId: db.organization_id,
    submissionDateMode: db.submission_date_mode,
    processingDateMode: db.processing_date_mode,
    lockupDays: db.lockup_days,
    processingOffsetDays: db.processing_offset_days,
    name: db.name,
    enableProRataDistribution: db.enable_pro_rata_distribution ?? true,
    autoProcess: db.auto_process ?? false,
    isActive: db.is_active ?? true,
    isTemplate: db.is_template ?? false,
    minRedemptionAmount: db.min_redemption_amount ?? 0,
    proRataFactor: db.pro_rata_factor ?? 1.0,
    processingFeePercentage: db.processing_fee_percentage ?? 0,
    earlyRedemptionPenalty: db.early_redemption_penalty ?? 0,
    submissionStatus: db.submission_status ?? 'not_started',
    processingStatus: db.processing_status ?? 'pending',
    lastModifiedBy: db.last_modified_by,
    lastStatusChangeAt: db.last_status_change_at ?? new Date().toISOString(),
    approvedBy: db.approved_by,
    approvedAt: db.approved_at
  };
}

export function mapWindowToDB(window: Partial<RedemptionWindow>): Partial<RedemptionWindowDB> {
  return {
    id: window.id,
    start_date: window.startDate,
    end_date: window.endDate,
    submission_start_date: window.submissionStartDate,
    submission_end_date: window.submissionEndDate,
    nav: window.nav,
    nav_date: window.navDate,
    nav_source: window.navSource,
    status: window.status,
    max_redemption_amount: window.maxRedemptionAmount,
    current_requests: window.currentRequests,
    total_request_value: window.totalRequestValue,
    approved_requests: window.approvedRequests,
    approved_value: window.approvedValue,
    rejected_requests: window.rejectedRequests,
    rejected_value: window.rejectedValue,
    queued_requests: window.queuedRequests,
    queued_value: window.queuedValue,
    processed_by: window.processedBy,
    processed_at: window.processedAt,
    notes: window.notes,
    created_at: window.createdAt,
    updated_at: window.updatedAt,
    created_by: window.createdBy,
    project_id: window.projectId,
    organization_id: window.organizationId,
    submission_date_mode: window.submissionDateMode,
    processing_date_mode: window.processingDateMode,
    lockup_days: window.lockupDays,
    processing_offset_days: window.processingOffsetDays,
    name: window.name,
    enable_pro_rata_distribution: window.enableProRataDistribution,
    auto_process: window.autoProcess,
    is_active: window.isActive,
    is_template: window.isTemplate,
    min_redemption_amount: window.minRedemptionAmount,
    pro_rata_factor: window.proRataFactor,
    processing_fee_percentage: window.processingFeePercentage,
    early_redemption_penalty: window.earlyRedemptionPenalty,
    submission_status: window.submissionStatus,
    processing_status: window.processingStatus,
    last_modified_by: window.lastModifiedBy,
    last_status_change_at: window.lastStatusChangeAt,
    approved_by: window.approvedBy,
    approved_at: window.approvedAt
  };
}

export function mapRuleFromDB(db: RedemptionRuleDB): RedemptionRule {
  return {
    id: db.id,
    ruleId: db.rule_id,
    redemptionType: db.redemption_type,
    requireMultiSigApproval: db.require_multi_sig_approval ?? true,
    requiredApprovers: db.required_approvers ?? 2,
    totalApprovers: db.total_approvers ?? 3,
    notifyInvestors: db.notify_investors ?? true,
    settlementMethod: db.settlement_method ?? 'stablecoin',
    immediateExecution: db.immediate_execution,
    useLatestNav: db.use_latest_nav,
    allowAnyTimeRedemption: db.allow_any_time_redemption,
    repurchaseFrequency: db.repurchase_frequency,
    lockUpPeriod: db.lock_up_period,
    submissionWindowDays: db.submission_window_days,
    lockTokensOnRequest: db.lock_tokens_on_request,
    useWindowNav: db.use_window_nav,
    enableProRataDistribution: db.enable_pro_rata_distribution,
    queueUnprocessedRequests: db.queue_unprocessed_requests,
    enableAdminOverride: db.enable_admin_override,
    createdAt: db.created_at ?? new Date().toISOString(),
    updatedAt: db.updated_at ?? new Date().toISOString(),
    projectId: db.project_id,
    organizationId: db.organization_id,
    productType: db.product_type,
    productId: db.product_id,
    isRedemptionOpen: db.is_redemption_open ?? false,
    openAfterDate: db.open_after_date,
    allowContinuousRedemption: db.allow_continuous_redemption ?? false,
    maxRedemptionPercentage: db.max_redemption_percentage,
    redemptionEligibilityRules: db.redemption_eligibility_rules ?? {},
    targetRaiseAmount: db.target_raise_amount,
    redemptionWindowId: db.redemption_window_id,
    approvalConfigId: db.approval_config_id
  };
}

export function mapRuleToDB(rule: Partial<RedemptionRule>): Partial<RedemptionRuleDB> {
  return {
    id: rule.id,
    rule_id: rule.ruleId,
    redemption_type: rule.redemptionType,
    require_multi_sig_approval: rule.requireMultiSigApproval,
    required_approvers: rule.requiredApprovers,
    total_approvers: rule.totalApprovers,
    notify_investors: rule.notifyInvestors,
    settlement_method: rule.settlementMethod,
    immediate_execution: rule.immediateExecution,
    use_latest_nav: rule.useLatestNav,
    allow_any_time_redemption: rule.allowAnyTimeRedemption,
    repurchase_frequency: rule.repurchaseFrequency,
    lock_up_period: rule.lockUpPeriod,
    submission_window_days: rule.submissionWindowDays,
    lock_tokens_on_request: rule.lockTokensOnRequest,
    use_window_nav: rule.useWindowNav,
    enable_pro_rata_distribution: rule.enableProRataDistribution,
    queue_unprocessed_requests: rule.queueUnprocessedRequests,
    enable_admin_override: rule.enableAdminOverride,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
    project_id: rule.projectId,
    organization_id: rule.organizationId,
    product_type: rule.productType,
    product_id: rule.productId,
    is_redemption_open: rule.isRedemptionOpen,
    open_after_date: rule.openAfterDate,
    allow_continuous_redemption: rule.allowContinuousRedemption,
    max_redemption_percentage: rule.maxRedemptionPercentage,
    redemption_eligibility_rules: rule.redemptionEligibilityRules,
    target_raise_amount: rule.targetRaiseAmount,
    redemption_window_id: rule.redemptionWindowId,
    approval_config_id: rule.approvalConfigId
  };
}
