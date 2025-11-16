/**
 * Stage 10: Multi-Party Approval Workflow - Exports
 */

export { ApprovalWorkflowManager } from './ApprovalWorkflowManager';
export { MultiSignature } from './MultiSignature';
export { RoleBasedApprover, roleBasedApprover } from './RoleBasedApprover';
export { ApprovalOrchestrator, approvalOrchestrator } from './ApprovalOrchestrator';
export { ApprovalDelegationService, approvalDelegationService } from './ApprovalDelegation';

// Notifiers
export {
  ApprovalNotifier,
  approvalNotifier,
  EscalationNotifier,
  escalationNotifier
} from './notifiers';

// Processors
export {
  SequentialProcessor,
  ParallelProcessor,
  HierarchicalProcessor,
  ConditionalProcessor,
  WorkflowProcessorFactory
} from './processors/WorkflowProcessors';

export type {
  ApprovalWorkflow,
  ApprovalProcess,
  ApprovalDecision,
  ApprovalThreshold,
  ApprovalCondition,
  EscalationRule,
  WorkflowTimeout,
  Approver,
  WorkflowType,
  ThresholdResult,
  SignatureMessage,
  VerifiedSignature,
  AggregatedSignature,
  WorkflowProcessor,
  ProcessResult,
  WorkflowConfig,
  NotifierConfig,
  SignatureConfig,
  ApprovalProcessRow,
  ApprovalConfigRow,
  ApprovalRequestRow,
  ApprovalSignatureRow,
  ApprovalDelegationRow,
  RedemptionApproverRow
} from './types';

export type {
  ApprovalDelegation,
  ProxyApproval,
  DelegationConfig
} from './ApprovalDelegation';

export type {
  ApprovalSubmission,
  ApprovalResult
} from './ApprovalOrchestrator';

export type {
  DelegationScope
} from '@/components/redemption/types/approvals';

export type {
  NotificationChannel,
  NotificationTemplate,
  NotificationResult,
  EscalationNotification,
  EscalationConfig
} from './notifiers';
