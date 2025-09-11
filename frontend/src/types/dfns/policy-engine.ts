/**
 * DFNS Policy Engine Types
 * 
 * Based on DFNS Policy Engine API documentation:
 * https://docs.dfns.co/d/api-docs/policy-engine
 */

// ==============================================
// CORE POLICY TYPES
// ==============================================

export type DfnsActivityKind = 
  | 'Wallets:Sign'
  | 'Wallets:IncomingTransaction'
  | 'Permissions:Assign'
  | 'Permissions:Modify'
  | 'Policies:Modify';

export type DfnsPolicyRuleKind = 
  | 'AlwaysTrigger'
  | 'TransactionAmountLimit'
  | 'TransactionAmountVelocity'
  | 'TransactionCountVelocity'
  | 'TransactionRecipientWhitelist'
  | 'ChainalysisTransactionPrescreening'
  | 'ChainalysisTransactionScreening';

export type DfnsPolicyActionKind = 
  | 'Block'
  | 'RequestApproval'
  | 'NoAction';

export type DfnsPolicyStatus = 'Active' | 'Archived';

export type DfnsTriggerStatus = 'Triggered' | 'Skipped';

// ==============================================
// POLICY RULE CONFIGURATIONS
// ==============================================

export interface DfnsAlwaysTriggerRule {
  kind: 'AlwaysTrigger';
}

export interface DfnsTransactionAmountLimitRule {
  kind: 'TransactionAmountLimit';
  configuration: {
    limit: number; // Amount limit in currency
    currency: string; // Currently only 'USD'
  };
}

export interface DfnsTransactionAmountVelocityRule {
  kind: 'TransactionAmountVelocity';
  configuration: {
    limit: number; // Amount limit in currency
    currency: string; // Currently only 'USD'
    timeframe: number; // Time period in minutes (1-43,200)
  };
}

export interface DfnsTransactionCountVelocityRule {
  kind: 'TransactionCountVelocity';
  configuration: {
    limit: number; // Transaction count limit
    timeframe: number; // Time period in minutes (1-43,200)
  };
}

export interface DfnsTransactionRecipientWhitelistRule {
  kind: 'TransactionRecipientWhitelist';
  configuration: {
    addresses: string[]; // Whitelisted recipient addresses
  };
}

export interface DfnsChainalysisTransactionPrescreeningRule {
  kind: 'ChainalysisTransactionPrescreening';
  configuration: {
    alerts: {
      alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
      categoryIds: number[];
    };
    exposures: {
      direct: {
        categoryIds: number[];
      };
    };
    addresses: {
      categoryIds: number[];
    };
    fallbackBehaviours: {
      skipUnscreenableTransaction: boolean;
      skipUnsupportedNetwork: boolean;
      skipUnsupportedAsset: boolean;
      skipChainalysisFailure: boolean;
    };
  };
}

export interface DfnsChainalysisTransactionScreeningRule {
  kind: 'ChainalysisTransactionScreening';
  configuration: {
    alerts: {
      alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
      categoryIds: number[];
    };
    exposures: {
      direct: {
        categoryIds: number[];
      };
    };
    fallbackBehaviours: {
      skipUnscreenableTransaction: boolean;
      skipUnsupportedNetwork: boolean;
      skipUnsupportedAsset: boolean;
      skipChainalysisFailure: boolean;
    };
  };
}

export type DfnsPolicyRule = 
  | DfnsAlwaysTriggerRule
  | DfnsTransactionAmountLimitRule
  | DfnsTransactionAmountVelocityRule
  | DfnsTransactionCountVelocityRule
  | DfnsTransactionRecipientWhitelistRule
  | DfnsChainalysisTransactionPrescreeningRule
  | DfnsChainalysisTransactionScreeningRule;

// ==============================================
// POLICY ACTION CONFIGURATIONS
// ==============================================

export interface DfnsBlockAction {
  kind: 'Block';
}

export interface DfnsRequestApprovalAction {
  kind: 'RequestApproval';
  autoRejectTimeout?: number; // Minutes until auto-rejection
  approvalGroups: DfnsApprovalGroup[];
}

export interface DfnsNoAction {
  kind: 'NoAction';
}

export type DfnsPolicyAction = 
  | DfnsBlockAction
  | DfnsRequestApprovalAction
  | DfnsNoAction;

export interface DfnsApprovalGroup {
  name?: string; // Optional group name
  quorum: number; // Required approvals in this group
  approvers: {
    userId?: {
      in: string[]; // List of specific user IDs
    };
  } | {}; // Empty object means anyone can approve
}

// ==============================================
// POLICY FILTERS
// ==============================================

export interface DfnsWalletFilters {
  walletId?: {
    in: string[]; // List of wallet IDs
  };
  walletTags?: {
    hasAny?: string[]; // Must have any of these tags
    hasAll?: string[]; // Must have all of these tags
  };
}

export interface DfnsPolicyFilters {
  policyId?: {
    in: string[]; // List of policy IDs
  };
}

export interface DfnsPermissionFilters {
  permissionId?: {
    in: string[]; // List of permission IDs
  };
}

export type DfnsPolicyFilterConfig = 
  | DfnsWalletFilters
  | DfnsPolicyFilters
  | DfnsPermissionFilters;

// ==============================================
// MAIN POLICY INTERFACE
// ==============================================

export interface DfnsPolicy {
  id: string; // DFNS policy ID (plc-...)
  name: string;
  status: DfnsPolicyStatus;
  activityKind: DfnsActivityKind;
  rule: DfnsPolicyRule;
  action: DfnsPolicyAction;
  filters?: DfnsPolicyFilterConfig;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface DfnsCreatePolicyRequest {
  name: string;
  activityKind: DfnsActivityKind;
  rule: DfnsPolicyRule;
  action: DfnsPolicyAction;
  filters?: DfnsPolicyFilterConfig;
}

export interface DfnsUpdatePolicyRequest extends DfnsCreatePolicyRequest {
  // Same as create request - full replacement
}

export interface DfnsListPoliciesRequest {
  limit?: number; // Default 20, max likely varies
  paginationToken?: string;
  status?: DfnsPolicyStatus;
}

export interface DfnsListPoliciesResponse {
  items: DfnsPolicy[];
  nextPageToken?: string;
}

// ==============================================
// APPROVAL TYPES
// ==============================================

export type DfnsApprovalStatus = 
  | 'Pending'
  | 'Approved'
  | 'Denied'
  | 'AutoApproved'
  | 'Expired';

export interface DfnsActivity {
  kind: DfnsActivityKind;
  // Activity-specific data
  transferRequest?: any; // For Wallets:Sign activities
  transactionRequest?: any; // For Wallets:Sign activities
  signatureRequest?: any; // For Wallets:Sign activities
  incomingTransaction?: any; // For Wallets:IncomingTransaction activities
  permissionRequest?: any; // For Permissions:* activities
  policyRequest?: any; // For Policies:Modify activities
}

export interface DfnsEvaluatedPolicy {
  policyId: string;
  triggerStatus: DfnsTriggerStatus;
  reason?: string; // Human-readable reason
}

export interface DfnsApprovalDecision {
  userId: string;
  dateActioned: string;
  value: 'Approved' | 'Denied';
  reason?: string;
}

export interface DfnsApproval {
  id: string; // DFNS approval ID (ap-...)
  initiatorId: string; // User who initiated the activity
  status: DfnsApprovalStatus;
  expirationDate?: string;
  dateCreated: string;
  dateUpdated: string;
  activity: DfnsActivity;
  evaluatedPolicies: DfnsEvaluatedPolicy[];
  decisions: DfnsApprovalDecision[];
}

export interface DfnsListApprovalsRequest {
  limit?: number; // Default 20
  paginationToken?: string;
  status?: DfnsApprovalStatus;
  triggerStatus?: DfnsTriggerStatus;
  initiatorId?: string;
  approverId?: string;
}

export interface DfnsListApprovalsResponse {
  items: DfnsApproval[];
  nextPageToken?: string;
}

export interface DfnsCreateApprovalDecisionRequest {
  value: 'Approved' | 'Denied';
  reason?: string;
}

// ==============================================
// POLICY CHANGE REQUESTS
// ==============================================

export type DfnsPolicyChangeRequestStatus = 
  | 'Pending'
  | 'Approved'
  | 'Denied'
  | 'Executed';

export interface DfnsPolicyChangeRequest {
  id: string; // DFNS change request ID (cr-...)
  kind: 'Policy';
  operationKind: 'Update' | 'Archive';
  status: DfnsPolicyChangeRequestStatus;
  requester: {
    userId: string;
  };
  entityId: string; // The policy ID being modified
  approvalId?: string; // Associated approval ID if required
  dateCreated: string;
  body: DfnsUpdatePolicyRequest | {}; // Request body
}

// ==============================================
// DATABASE ENTITY TYPES
// ==============================================

export interface DfnsPolicyEntity {
  id: string; // UUID
  dfns_policy_id: string; // DFNS policy ID
  name: string;
  status: DfnsPolicyStatus;
  activity_kind: DfnsActivityKind;
  rule_kind: DfnsPolicyRuleKind;
  rule_configuration?: Record<string, any>;
  action_kind: DfnsPolicyActionKind;
  action_configuration?: Record<string, any>;
  filters?: Record<string, any>;
  organization_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DfnsPolicyApprovalGroupEntity {
  id: string; // UUID
  policy_id: string; // References dfns_policies.id
  dfns_policy_id: string; // DFNS policy ID
  group_name?: string;
  quorum: number;
  approvers: Record<string, any>; // JSON structure
  created_at: string;
  updated_at: string;
}

export interface DfnsPolicyEvaluationEntity {
  id: string; // UUID
  dfns_policy_id: string;
  activity_id: string;
  trigger_status: DfnsTriggerStatus;
  reason?: string;
  evaluation_timestamp: string;
  activity_kind: DfnsActivityKind;
  activity_details?: Record<string, any>;
  organization_id?: string;
  created_at: string;
}

export interface DfnsPolicyApprovalEntity {
  id: string; // UUID
  approval_id: string;
  activity_id: string;
  policy_id?: string;
  status: DfnsApprovalStatus;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  metadata?: Record<string, any>;
  organization_id?: string;
  dfns_approval_id?: string; // DFNS approval ID
  dfns_policy_id?: string; // DFNS policy ID
  initiator_id?: string;
  expiration_date?: string;
  activity_details?: Record<string, any>;
  evaluated_policies?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DfnsPolicyApprovalDecisionEntity {
  id: string; // UUID
  approval_id: string; // References dfns_policy_approvals.id
  dfns_approval_id: string; // DFNS approval ID
  user_id: string;
  decision_value: 'Approved' | 'Denied';
  reason?: string;
  date_actioned: string;
  organization_id?: string;
  created_at: string;
}

export interface DfnsPolicyChangeRequestEntity {
  id: string; // UUID
  dfns_change_request_id: string;
  kind: string;
  operation_kind: 'Update' | 'Archive';
  status: DfnsPolicyChangeRequestStatus;
  requester_user_id: string;
  entity_id: string; // Policy ID being modified
  dfns_approval_id?: string;
  request_body: Record<string, any>;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// ==============================================
// SERVICE RESPONSE TYPES
// ==============================================

export interface DfnsPolicyServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId?: string;
    timestamp: string;
    syncedToDatabase?: boolean;
    // Allow additional custom metadata properties
    [key: string]: any;
  };
}

export interface DfnsPolicyStatistics {
  totalPolicies: number;
  activePolicies: number;
  archivedPolicies: number;
  policiesByActivityKind: Record<DfnsActivityKind, number>;
  policiesByRuleKind: Record<DfnsPolicyRuleKind, number>;
  policiesByActionKind: Record<DfnsPolicyActionKind, number>;
  lastUpdated: string;
}

export interface DfnsApprovalStatistics {
  totalApprovals: number;
  pendingApprovals: number;
  approvedApprovals: number;
  deniedApprovals: number;
  expiredApprovals: number;
  averageApprovalTime?: number; // Minutes
  approvalsByActivityKind: Record<DfnsActivityKind, number>;
  lastUpdated: string;
}

// ==============================================
// ERROR TYPES
// ==============================================

export interface DfnsPolicyError extends Error {
  code: string;
  details?: Record<string, any>;
  httpStatus?: number;
}

export class DfnsPolicyEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'DfnsPolicyEngineError';
  }
}

// ==============================================
// VALIDATION HELPERS
// ==============================================

export const DFNS_ACTIVITY_KINDS: DfnsActivityKind[] = [
  'Wallets:Sign',
  'Wallets:IncomingTransaction',
  'Permissions:Assign',
  'Permissions:Modify',
  'Policies:Modify'
];

export const DFNS_POLICY_RULE_KINDS: DfnsPolicyRuleKind[] = [
  'AlwaysTrigger',
  'TransactionAmountLimit',
  'TransactionAmountVelocity',
  'TransactionCountVelocity',
  'TransactionRecipientWhitelist',
  'ChainalysisTransactionPrescreening',
  'ChainalysisTransactionScreening'
];

export const DFNS_POLICY_ACTION_KINDS: DfnsPolicyActionKind[] = [
  'Block',
  'RequestApproval',
  'NoAction'
];

export const DFNS_APPROVAL_STATUSES: DfnsApprovalStatus[] = [
  'Pending',
  'Approved',
  'Denied',
  'AutoApproved',
  'Expired'
];

// ==============================================
// TYPE GUARDS
// ==============================================

export function isDfnsWalletActivity(activityKind: DfnsActivityKind): activityKind is 'Wallets:Sign' | 'Wallets:IncomingTransaction' {
  return activityKind === 'Wallets:Sign' || activityKind === 'Wallets:IncomingTransaction';
}

export function isDfnsPermissionActivity(activityKind: DfnsActivityKind): activityKind is 'Permissions:Assign' | 'Permissions:Modify' {
  return activityKind === 'Permissions:Assign' || activityKind === 'Permissions:Modify';
}

export function isDfnsPolicyActivity(activityKind: DfnsActivityKind): activityKind is 'Policies:Modify' {
  return activityKind === 'Policies:Modify';
}

export function isRequestApprovalAction(action: DfnsPolicyAction): action is DfnsRequestApprovalAction {
  return action.kind === 'RequestApproval';
}

export function isTransactionRule(rule: DfnsPolicyRule): rule is DfnsTransactionAmountLimitRule | DfnsTransactionAmountVelocityRule | DfnsTransactionCountVelocityRule | DfnsTransactionRecipientWhitelistRule {
  return ['TransactionAmountLimit', 'TransactionAmountVelocity', 'TransactionCountVelocity', 'TransactionRecipientWhitelist'].includes(rule.kind);
}

export function isChainalysisRule(rule: DfnsPolicyRule): rule is DfnsChainalysisTransactionPrescreeningRule | DfnsChainalysisTransactionScreeningRule {
  return rule.kind === 'ChainalysisTransactionPrescreening' || rule.kind === 'ChainalysisTransactionScreening';
}