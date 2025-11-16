/**
 * Stage 10: Multi-Party Approval Workflow - Database Types
 * Maps to existing approval tables in Supabase
 */

import type { ApprovalDecisionType } from '@/components/redemption/types';

// Database row types matching existing schema

export interface ApprovalProcessRow {
  id: string;
  request_id: string;
  workflow_id: string;
  status: string;
  required_approvals: number;
  current_approvals: number | null;
  pending_approvers: string[] | null;
  started_at: string | null;
  deadline: string | null;
  completed_at: string | null;
  escalation_level: number | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApprovalConfigRow {
  id: string;
  permission_id: string;
  required_approvals: number;
  eligible_roles: string[];
  auto_approval_conditions: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
  consensus_type: string;
  config_name: string | null;
  config_description: string | null;
  approval_mode: string | null;
  requires_all_approvers: boolean | null;
  auto_approve_threshold: number | null;
  escalation_config: Record<string, any> | null;
  notification_config: Record<string, any> | null;
  active: boolean | null;
  created_by: string | null;
  last_modified_by: string | null;
}

export interface ApprovalRequestRow {
  id: string;
  action: string;
  resource: string;
  resource_id: string;
  requested_by: string;
  status: string;
  approvers: string[];
  approved_by: string[];
  rejected_by: string[];
  required_approvals: number;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApprovalSignatureRow {
  id: string;
  signature: string;
  approver_id: string;
  request_id: string | null;
  message: string;
  verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApprovalDelegationRow {
  id: string;
  delegator_id: string;
  delegate_id: string;
  scope: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  conditions: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RedemptionApproverRow {
  id: string;
  redemption_id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
  approver_id: string;
  status: string | null;
  comments: string | null;
  decision_date: string | null;
  updated_at: string | null;
}

// Domain types for approval workflow

export type WorkflowType = 
  | 'sequential'    // Approvals in specific order
  | 'parallel'      // Any order, threshold based
  | 'hierarchical'  // Escalation based on amount
  | 'conditional';  // Dynamic based on conditions

export interface ApprovalWorkflow {
  id: string;
  name: string;
  tokenId: string;
  type: WorkflowType;
  requiredApprovals: number;
  approvers: Approver[];
  thresholds: ApprovalThreshold[];
  escalationRules: EscalationRule[];
  timeouts: WorkflowTimeout[];
  status: 'active' | 'inactive' | 'draft';
}

export interface Approver {
  id: string;
  userId: string;
  name?: string;  // Optional name for display purposes
  role: string;
  weight: number;  // For weighted approvals
  required: boolean;
  alternates: string[];  // Backup approvers
  conditions?: ApprovalCondition[];
}

export interface ApprovalThreshold {
  amountMin?: bigint;
  amountMax?: bigint;
  requiredApprovals: number;
  requiredRoles?: string[];
  timeLimit?: number;  // in hours
}

export interface ApprovalCondition {
  field: string;
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne' | 'in' | 'nin';
  value: any;
}

export interface EscalationRule {
  id: string;
  name: string;
  trigger: 'timeout' | 'rejection' | 'amount_threshold';
  afterHours?: number;
  escalateToRole: string;
  extensionHours?: number;
  newThreshold?: number;
  level: number;
  overrideThreshold?: boolean;
}

export interface WorkflowTimeout {
  type: 'hard' | 'soft';
  hours: number;
  action: 'auto_approve' | 'auto_reject' | 'escalate';
}

export interface ApprovalProcess {
  id: string;
  requestId: string;
  workflowId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requiredApprovals: number;
  currentApprovals?: number;  // Track number of approvals received (from DB)
  approvals: ApprovalDecision[];
  pendingApprovers: string[];
  startedAt: string;
  deadline?: string;
  completedAt?: string;
  escalationLevel?: number;
  metadata?: Record<string, any>;
}

export interface ApprovalDecision {
  id: string;
  processId: string;
  approverId: string;
  decision: ApprovalDecisionType;
  comments?: string;
  conditions?: string[];
  signature: string;
  timestamp: string;
}

export interface ThresholdResult {
  met: boolean;
  approved: boolean;
  rejected?: boolean;
  reason: string;
}

export interface SignatureMessage {
  approverId: string;
  requestId: string;
  decision: string;
  timestamp: number;
  nonce: string;
}

export interface VerifiedSignature {
  signature: string;
  approver: string;
  timestamp: string;
}

export interface AggregatedSignature {
  signatures: VerifiedSignature[];
  threshold: number;
  timestamp: string;
}

// Workflow processor interface
export interface WorkflowProcessor {
  processApproval(
    process: ApprovalProcess,
    decision: ApprovalDecision
  ): Promise<ProcessResult>;
}

export interface ProcessResult {
  isComplete: boolean;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  nextApprovers?: string[];
}

// Configuration types
export interface WorkflowConfig {
  pipelineConfig: any;
  windowConfig: any;
  constraintConfig: any;
  notifierConfig: NotifierConfig;
  signatureConfig: SignatureConfig;
}

export interface NotifierConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  templates: Record<string, string>;
}

export interface SignatureConfig {
  algorithm: 'ECDSA' | 'EdDSA' | 'RSA';
  keySize: number;
  hashFunction: 'SHA256' | 'SHA512';
}

// Error types
export class NoWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoWorkflowError';
  }
}

export class UnauthorizedApproverError extends Error {
  constructor(approverId: string) {
    super(`Approver ${approverId} is not authorized for this request`);
    this.name = 'UnauthorizedApproverError';
  }
}

export class InvalidSignatureError extends Error {
  constructor() {
    super('Invalid signature provided');
    this.name = 'InvalidSignatureError';
  }
}

export class NoThresholdError extends Error {
  constructor() {
    super('No applicable approval threshold found');
    this.name = 'NoThresholdError';
  }
}

export class WindowOverlapError extends Error {
  constructor(window: any, overlapping: any) {
    super(`Window overlaps with existing window ${overlapping.id}`);
    this.name = 'WindowOverlapError';
  }
}

export class WindowCreationError extends Error {
  cause?: any;
  
  constructor(message: string, cause?: any) {
    super(message);
    this.name = 'WindowCreationError';
    this.cause = cause;
  }
}

export class WindowOperationError extends Error {
  cause?: any;
  
  constructor(message: string, cause?: any) {
    super(message);
    this.name = 'WindowOperationError';
    this.cause = cause;
  }
}
