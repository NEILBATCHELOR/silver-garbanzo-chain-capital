/**
 * DFNS Policy Engine Types
 * 
 * Complete type definitions for DFNS Policy Engine APIs v2
 * Based on DFNS API documentation: https://docs.dfns.co/d/api-docs/policies
 */

import type { DfnsStatus } from './core';

// ===============================
// CORE POLICY TYPES
// ===============================

// DFNS Policy - Official API Structure v2
export interface DfnsPolicy {
  id: string;                           // Policy ID (po-xxxx-xxxx-xxxxxxxxxxxxxxxx)
  name: string;                         // Policy name
  status: 'Active' | 'Archived';       // Policy status
  activityKind: DfnsActivityKind;       // What activity this policy governs
  rule: DfnsPolicyRule;                 // The rule configuration
  action: DfnsPolicyAction;             // Action to take when rule is triggered
  filters?: DfnsPolicyFilters;          // Optional activity filters
  dateCreated: string;                  // ISO 8601 date string
  dateUpdated: string;                  // ISO 8601 date string
  externalId?: string;                  // External correlation ID
}

// Activity Kinds - What operations can be governed
export enum DfnsActivityKind {
  // Wallet Operations
  WalletsSign = 'Wallets:Sign',
  WalletsIncomingTransaction = 'Wallets:IncomingTransaction',
  WalletsModify = 'Wallets:Modify',
  WalletsImport = 'Wallets:Import',
  WalletsExport = 'Wallets:Export',
  WalletsDelegate = 'Wallets:Delegate',
  
  // Key Operations
  KeysSign = 'Keys:Sign',
  KeysModify = 'Keys:Modify',
  KeysImport = 'Keys:Import',
  KeysExport = 'Keys:Export',
  KeysDelegate = 'Keys:Delegate',
  
  // Permission Operations
  PermissionsAssign = 'Permissions:Assign',
  PermissionsModify = 'Permissions:Modify',
  
  // Policy Operations
  PoliciesModify = 'Policies:Modify',
  
  // User Operations
  UsersModify = 'Users:Modify',
  CredentialsModify = 'Credentials:Modify',
}

// ===============================
// POLICY RULES
// ===============================

// Policy Rule - Defines when a policy is triggered
export interface DfnsPolicyRule {
  kind: DfnsPolicyRuleKind;
  configuration: Record<string, any>;
}

// Policy Rule Kinds - Available rule types
export enum DfnsPolicyRuleKind {
  // Basic Rules
  AlwaysActivated = 'AlwaysActivated',
  
  // Transaction Amount Controls
  TransactionAmountLimit = 'TransactionAmountLimit',
  TransactionAmountVelocity = 'TransactionAmountVelocity',
  
  // Transaction Count Controls
  TransactionCountVelocity = 'TransactionCountVelocity',
  
  // Address Controls
  TransactionRecipientWhitelist = 'TransactionRecipientWhitelist',
  TransactionRecipientBlacklist = 'TransactionRecipientBlacklist',
  
  // Chainalysis Integration
  ChainalysisTransactionPrescreening = 'ChainalysisTransactionPrescreening',
  ChainalysisTransactionScreening = 'ChainalysisTransactionScreening',
  
  // Advanced Controls
  TransactionUserInitiated = 'TransactionUserInitiated',
  TransactionDestinationRestricted = 'TransactionDestinationRestricted',
}

// Specific Rule Configurations
export interface DfnsTransactionAmountLimitRule {
  kind: DfnsPolicyRuleKind.TransactionAmountLimit;
  configuration: {
    limit: string;                      // Amount limit in asset's smallest unit
    currency?: string;                  // USD, EUR, etc. for fiat-denominated limits
    includeNetworkFee?: boolean;        // Whether to include gas fees in limit
  };
}

export interface DfnsTransactionAmountVelocityRule {
  kind: DfnsPolicyRuleKind.TransactionAmountVelocity;
  configuration: {
    limit: string;                      // Amount limit in asset's smallest unit
    timeframe: string;                  // Time window (e.g., "1h", "24h", "7d")
    currency?: string;                  // USD, EUR, etc. for fiat-denominated limits
    includeNetworkFee?: boolean;        // Whether to include gas fees in limit
  };
}

export interface DfnsTransactionCountVelocityRule {
  kind: DfnsPolicyRuleKind.TransactionCountVelocity;
  configuration: {
    limit: number;                      // Number of transactions allowed
    timeframe: string;                  // Time window (e.g., "1h", "24h", "7d")
  };
}

export interface DfnsTransactionRecipientWhitelistRule {
  kind: DfnsPolicyRuleKind.TransactionRecipientWhitelist;
  configuration: {
    addresses: string[];                // Allowed recipient addresses
    matchType: 'exact' | 'prefix';     // How to match addresses
  };
}

export interface DfnsChainalysisTransactionScreeningRule {
  kind: DfnsPolicyRuleKind.ChainalysisTransactionScreening;
  configuration: {
    direction: 'inbound' | 'outbound' | 'both';
    riskCategories: DfnsChainalysisRiskCategory[];
    riskLevels: DfnsChainalysisRiskLevel[];
  };
}

// Chainalysis Risk Categories
export enum DfnsChainalysisRiskCategory {
  Sanctions = 'sanctions',
  Stolen = 'stolen',
  DarknetMarkets = 'darknet-markets',
  Ransomware = 'ransomware',
  ChildAbuse = 'child-abuse',
  Terrorism = 'terrorism',
  Scam = 'scam',
  Mixer = 'mixer',
  GamblingUnlicensed = 'gambling-unlicensed',
}

// Chainalysis Risk Levels
export enum DfnsChainalysisRiskLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Severe = 'Severe',
}

// ===============================
// POLICY ACTIONS
// ===============================

// Policy Action - What happens when rule is triggered
export interface DfnsPolicyAction {
  kind: DfnsPolicyActionKind;
  autoRejectTimeout?: number;           // Seconds before auto-rejection (for RequestApproval)
  approvalGroups?: DfnsApprovalGroup[]; // Who can approve (for RequestApproval)
}

// Policy Action Kinds
export enum DfnsPolicyActionKind {
  Block = 'Block',                     // Immediately block the action
  RequestApproval = 'RequestApproval', // Require approval to proceed
  NoAction = 'NoAction',               // Allow but log the policy match
}

// Approval Group - Defines who can approve policy-triggered requests
export interface DfnsApprovalGroup {
  name: string;                         // Group name
  quorum: number;                       // Number of approvals required
  approvers: DfnsApprover[];            // List of potential approvers
}

// Approver - Someone who can approve policy requests
export interface DfnsApprover {
  kind: 'User' | 'ServiceAccount';
  id: string;                           // User ID or Service Account ID
}

// ===============================
// POLICY FILTERS
// ===============================

// Policy Filters - Scope what activities this policy applies to
export interface DfnsPolicyFilters {
  walletIds?: string[];                 // Apply to specific wallets only
  walletTags?: string[];                // Apply to wallets with specific tags
  userIds?: string[];                   // Apply to specific users only
  networks?: string[];                  // Apply to specific networks only
  assetSymbols?: string[];              // Apply to specific assets only
}

// ===============================
// POLICY CRUD OPERATIONS
// ===============================

// Create Policy Request
export interface DfnsCreatePolicyRequest {
  name: string;                         // Policy name
  activityKind: DfnsActivityKind;       // What activity to govern
  rule: DfnsPolicyRule;                 // Rule configuration
  action: DfnsPolicyAction;             // Action configuration
  filters?: DfnsPolicyFilters;          // Optional filters
  externalId?: string;                  // Optional external correlation ID
}

// Create Policy Response
export interface DfnsCreatePolicyResponse extends DfnsPolicy {}

// Update Policy Request
export interface DfnsUpdatePolicyRequest {
  name?: string;                        // New policy name
  rule?: DfnsPolicyRule;                // New rule configuration
  action?: DfnsPolicyAction;            // New action configuration
  filters?: DfnsPolicyFilters;          // New filters
}

// Update Policy Response
export interface DfnsUpdatePolicyResponse extends DfnsPolicy {}

// List Policies Request
export interface DfnsListPoliciesRequest {
  activityKind?: DfnsActivityKind;      // Filter by activity kind
  status?: 'Active' | 'Archived';      // Filter by status
  limit?: number;                       // Max items to return (default: 100)
  paginationToken?: string;             // Next page token
}

// List Policies Response
export interface DfnsListPoliciesResponse {
  items: DfnsPolicy[];
  nextPageToken?: string;               // Token for next page
}

// Get Policy Response
export interface DfnsGetPolicyResponse extends DfnsPolicy {}

// Archive Policy Response
export interface DfnsArchivePolicyResponse extends DfnsPolicy {}

// ===============================
// POLICY APPROVALS
// ===============================

// Policy Approval - Request pending approval due to policy trigger
export interface DfnsPolicyApproval {
  id: string;                           // Approval ID (pa-xxxx-xxxx-xxxxxxxxxxxxxxxx)
  status: DfnsApprovalStatus;           // Current approval status
  expirationDate?: string;              // When approval expires (ISO 8601)
  dateCreated: string;                  // ISO 8601 date string
  dateUpdated: string;                  // ISO 8601 date string
  initiator: DfnsApprovalInitiator;     // Who initiated the activity
  activity: DfnsActivity;               // The activity requiring approval
  evaluatedPolicies: DfnsEvaluatedPolicy[]; // Policies that triggered
  decisions: DfnsApprovalDecision[];    // Approval decisions made
  reason?: string;                      // Optional reason for the request
  externalId?: string;                  // External correlation ID
}

// Approval Status
export enum DfnsApprovalStatus {
  Pending = 'Pending',                 // Waiting for approval
  Approved = 'Approved',               // Approved and proceeding
  Denied = 'Denied',                   // Denied and blocked
  AutoApproved = 'AutoApproved',       // Automatically approved
  Expired = 'Expired',                 // Expired without decision
  Cancelled = 'Cancelled',             // Cancelled by initiator
}

// Approval Initiator
export interface DfnsApprovalInitiator {
  kind: 'User' | 'ServiceAccount' | 'Application';
  id: string;                           // ID of the initiator
  name?: string;                        // Display name
}

// Activity - The activity that triggered the policy
export interface DfnsActivity {
  kind: DfnsActivityKind;               // Type of activity
  walletId?: string;                    // Wallet involved (if applicable)
  keyId?: string;                       // Key involved (if applicable)
  intent: Record<string, any>;          // Activity-specific data
}

// Evaluated Policy - Policy that was triggered
export interface DfnsEvaluatedPolicy {
  policyId: string;                     // Policy that was triggered
  result: 'Triggered' | 'NotTriggered'; // Whether policy was triggered
  reason?: string;                      // Why policy was triggered
}

// Approval Decision - Individual approval/rejection
export interface DfnsApprovalDecision {
  id: string;                           // Decision ID
  userId: string;                       // Who made the decision
  value: 'Approved' | 'Denied';         // The decision
  reason?: string;                      // Optional reason
  dateCreated: string;                  // ISO 8601 date string
}

// ===============================
// APPROVAL OPERATIONS
// ===============================

// List Approvals Request
export interface DfnsListApprovalsRequest {
  status?: DfnsApprovalStatus;          // Filter by status
  activityKind?: DfnsActivityKind;      // Filter by activity kind
  walletId?: string;                    // Filter by wallet
  keyId?: string;                       // Filter by key
  limit?: number;                       // Max items to return (default: 100)
  paginationToken?: string;             // Next page token
}

// List Approvals Response
export interface DfnsListApprovalsResponse {
  items: DfnsPolicyApproval[];
  nextPageToken?: string;               // Token for next page
}

// Get Approval Response
export interface DfnsGetApprovalResponse extends DfnsPolicyApproval {}

// Create Approval Decision Request
export interface DfnsCreateApprovalDecisionRequest {
  value: 'Approved' | 'Denied';         // The decision
  reason?: string;                      // Optional reason for decision
}

// Create Approval Decision Response
export interface DfnsCreateApprovalDecisionResponse extends DfnsPolicyApproval {}

// ===============================
// SERVICE OPTIONS & UTILITIES
// ===============================

// Service Options for Policy Operations
export interface DfnsPolicyServiceOptions {
  syncToDatabase?: boolean;             // Sync to local database
  validatePermissions?: boolean;        // Validate user permissions
  auditLog?: boolean;                   // Log operation for audit
  timeout?: number;                     // Request timeout override
}

// Policy Summary for Dashboards
export interface DfnsPolicySummary {
  policyId: string;
  name: string;
  activityKind: DfnsActivityKind;
  ruleKind: DfnsPolicyRuleKind;
  actionKind: DfnsPolicyActionKind;
  status: 'Active' | 'Archived';
  triggeredCount: number;               // How many times triggered
  approvedCount: number;                // How many approvals granted
  deniedCount: number;                  // How many denials made
  pendingCount: number;                 // Current pending approvals
  lastTriggered?: string;               // Last trigger date
  dateCreated: string;
}

// Approval Summary for Dashboards
export interface DfnsApprovalSummary {
  approvalId: string;
  status: DfnsApprovalStatus;
  activityKind: DfnsActivityKind;
  initiatorName?: string;
  walletId?: string;
  walletName?: string;
  requiredApprovals: number;
  receivedApprovals: number;
  timeToExpiry?: number;                // Hours until expiry
  dateCreated: string;
}

// Create Policy Response
export interface DfnsCreatePolicyResponse extends DfnsPolicy {}

// Update Policy Response
export interface DfnsUpdatePolicyResponse extends DfnsPolicy {}

// List Policies Request
export interface DfnsListPoliciesRequest {
  status?: 'Active' | 'Archived';
  activityKind?: DfnsActivityKind;
  limit?: number;
  paginationToken?: string;
}

// List Policies Response
export interface DfnsListPoliciesResponse {
  items: DfnsPolicy[];
  nextPageToken?: string;
}

// Get Policy Response
export interface DfnsGetPolicyResponse extends DfnsPolicy {}

// Archive Policy Response
export interface DfnsArchivePolicyResponse extends DfnsPolicy {}

// ===============================
// ERROR TYPES
// ===============================

// Policy-specific error types
export interface DfnsPolicyError {
  code: string;
  message: string;
  policyId?: string;
  approvalId?: string;
  details?: Record<string, any>;
}

// Common Policy Error Codes
export enum DfnsPolicyErrorCode {
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_ARCHIVED = 'POLICY_ARCHIVED',
  APPROVAL_NOT_FOUND = 'APPROVAL_NOT_FOUND',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  APPROVAL_ALREADY_DECIDED = 'APPROVAL_ALREADY_DECIDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_RULE_CONFIGURATION = 'INVALID_RULE_CONFIGURATION',
  INVALID_ACTION_CONFIGURATION = 'INVALID_ACTION_CONFIGURATION',
  ACTIVITY_BLOCKED_BY_POLICY = 'ACTIVITY_BLOCKED_BY_POLICY',
}
