/**
 * Stage 10: Multi-Party Approval Workflow Manager
 * Manages approval processes for redemption requests
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type {
  ApprovalWorkflow,
  ApprovalProcess,
  ApprovalDecision,
  ApprovalThreshold,
  ThresholdResult,
  EscalationRule,
  WorkflowConfig,
  Approver,
  ApprovalProcessRow,
  ApprovalRequestRow
} from './types';
import {
  NoWorkflowError,
  UnauthorizedApproverError,
  InvalidSignatureError,
  NoThresholdError
} from './types';
import type { ApprovalDecisionType } from '@/components/redemption/types';
import { MultiSignature } from './MultiSignature';
import { approvalNotifier } from './notifiers/ApprovalNotifier';
import { escalationNotifier } from './notifiers/EscalationNotifier';

export interface RedemptionRequest {
  id: string;
  tokenId: string;
  amount: bigint;
  investorId: string;
}

export interface RuleEvaluationResult {
  allowed: boolean;
  rules: RuleResult[];
  violations: Violation[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  message: string;
  metadata?: Record<string, any>;
}export interface Violation {
  rule: string;
  message: string;
  severity: 'critical' | 'warning';
}

export class ApprovalWorkflowManager {
  private signatureManager: MultiSignature;

  constructor(config: WorkflowConfig) {
    this.signatureManager = new MultiSignature(config.signatureConfig);
  }

  /**
   * Initiate approval workflow for redemption request
   */
  async initiateApproval(
    request: RedemptionRequest
  ): Promise<ApprovalProcess> {
    // 1. Determine applicable workflow
    const workflow = await this.getApplicableWorkflow(request);

    if (!workflow) {
      throw new NoWorkflowError(`No approval workflow found for token ${request.tokenId}`);
    }

    // 2. Calculate required approvals based on amount
    const threshold = this.findApplicableThreshold(workflow, request.amount);
    const requiredApprovals = threshold?.requiredApprovals || workflow.requiredApprovals;

    // 3. Create approval process
    const processId = crypto.randomUUID();
    const now = new Date().toISOString();
    // 4. Identify approvers based on threshold
    const approvers = await this.identifyApprovers(workflow, request, threshold);
    const pendingApprovers = approvers.map(a => a.userId);

    // 5. Calculate deadline
    const deadline = this.calculateDeadline(workflow, threshold);

    // 6. Store approval process in database
    const { data: processData, error: processError } = await supabase
      .from('approval_processes')
      .insert({
        id: processId,
        request_id: request.id,
        workflow_id: workflow.id,
        status: 'pending',
        required_approvals: requiredApprovals,
        current_approvals: 0,
        pending_approvers: pendingApprovers,
        started_at: now,
        deadline: deadline?.toISOString(),
        metadata: {
          tokenId: request.tokenId,
          amount: request.amount.toString(),
          threshold: threshold ? {
            min: threshold.amountMin?.toString(),
            max: threshold.amountMax?.toString(),
            required: threshold.requiredApprovals
          } : null
        }
      })
      .select()
      .single();
    if (processError) {
      throw new Error(`Failed to create approval process: ${processError.message}`);
    }

    const process: ApprovalProcess = {
      id: processId,
      requestId: request.id,
      workflowId: workflow.id,
      status: 'pending',
      requiredApprovals,
      approvals: [],
      pendingApprovers,
      startedAt: now,
      deadline: deadline?.toISOString(),
      metadata: processData.metadata
    };

    // 7. Notify approvers
    await this.notifyApprovers(approvers, request, process);

    // 8. Start timeout monitoring if configured
    if (deadline) {
      await this.startTimeoutMonitoring(process);
    }

    return process;
  }

  /**
   * Submit an approval decision
   */
  async submitApproval(
    decision: Omit<ApprovalDecision, 'timestamp'>
  ): Promise<ApprovalResult> {    const now = new Date().toISOString();
    const decisionWithTimestamp = { ...decision, timestamp: now };

    // 1. Get the approval process
    const { data: processData, error: processError } = await supabase
      .from('approval_processes')
      .select('*')
      .eq('id', decision.processId)
      .single();

    if (processError || !processData) {
      throw new Error('Approval process not found');
    }

    // 2. Validate approver is authorized
    const process = this.mapProcessRowToProcess(processData);
    if (!process.pendingApprovers.includes(decision.approverId)) {
      throw new UnauthorizedApproverError(decision.approverId);
    }

    // 3. Verify signature
    const signatureValid = await this.signatureManager.verifySignature(
      decision.signature,
      decision.approverId,
      process.requestId
    );

    if (!signatureValid) {
      throw new InvalidSignatureError();
    }

    // 4. Record the approval decision
    await this.recordApproval(decisionWithTimestamp);
    // 5. Update process with new approval
    const updatedApprovals = [...process.approvals, decisionWithTimestamp];
    const currentApprovals = updatedApprovals.filter(a => a.decision === 'approved').length;

    // 6. Check if threshold met
    const threshold = await this.checkThreshold(process, updatedApprovals);

    if (threshold.met) {
      // Complete the approval process
      await this.completeApprovalProcess(process, threshold);

      return {
        status: threshold.approved ? 'completed' : 'rejected',
        approved: threshold.approved,
        message: threshold.reason,
        isComplete: true
      };
    }

    // 7. Update process status
    await supabase
      .from('approval_processes')
      .update({
        current_approvals: currentApprovals,
        pending_approvers: process.pendingApprovers.filter(id => id !== decision.approverId),
        updated_at: now
      })
      .eq('id', process.id);

    return {
      status: 'pending',
      approved: null,
      message: `${currentApprovals}/${process.requiredApprovals} approvals received`,
      remaining: process.requiredApprovals - currentApprovals,
      isComplete: false
    };
  }
  /**
   * Check if approval threshold has been met
   */
  private async checkThreshold(
    process: ApprovalProcess,
    approvals: ApprovalDecision[]
  ): Promise<ThresholdResult> {
    // Get workflow to determine threshold requirements
    const { data: workflowData } = await supabase
      .from('approval_configs')
      .select('*')
      .eq('id', process.workflowId)
      .single();

    if (!workflowData) {
      throw new NoThresholdError();
    }

    // Count approvals and rejections
    const approved = approvals.filter(a => a.decision === 'approved').length;
    const rejected = approvals.filter(a => a.decision === 'rejected').length;

    // Check if threshold met
    if (approved >= process.requiredApprovals) {
      return {
        met: true,
        approved: true,
        reason: 'Approval threshold met'
      };
    }

    // Check if impossible to meet threshold
    const remainingPossible = process.pendingApprovers.length;
    if (approved + remainingPossible < process.requiredApprovals) {
      return {
        met: true,
        approved: false,
        rejected: true,
        reason: 'Insufficient approvals possible'
      };
    }
    // Check for explicit rejections in sequential workflows
    if (workflowData.approval_mode === 'sequential' && rejected > 0) {
      return {
        met: true,
        approved: false,
        rejected: true,
        reason: 'Sequential approval rejected'
      };
    }

    return {
      met: false,
      approved: false,
      reason: 'Waiting for more approvals'
    };
  }

  /**
   * Complete the approval process
   */
  private async completeApprovalProcess(
    process: ApprovalProcess,
    threshold: ThresholdResult
  ): Promise<void> {
    const now = new Date().toISOString();
    const finalStatus = threshold.approved ? 'approved' : 'rejected';

    // Update approval process
    await supabase
      .from('approval_processes')
      .update({
        status: finalStatus,
        completed_at: now,
        updated_at: now
      })
      .eq('id', process.id);

    // Update redemption request status
    await supabase
      .from('redemption_requests')
      .update({
        status: finalStatus,
        updated_at: now
      })
      .eq('id', process.requestId);
  }
  /**
   * Get applicable workflow for redemption request
   */
  private async getApplicableWorkflow(
    request: RedemptionRequest
  ): Promise<ApprovalWorkflow | null> {
    const { data, error } = await supabase
      .from('approval_configs')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const config = data[0];
    return this.mapConfigToWorkflow(config, request.tokenId);
  }

  /**
   * Find applicable threshold for request amount
   */
  private findApplicableThreshold(
    workflow: ApprovalWorkflow,
    amount: bigint
  ): ApprovalThreshold | undefined {
    return workflow.thresholds.find(t => 
      (!t.amountMin || amount >= t.amountMin) &&
      (!t.amountMax || amount <= t.amountMax)
    );
  }

  /**
   * Identify approvers for request
   */
  private async identifyApprovers(
    workflow: ApprovalWorkflow,
    request: RedemptionRequest,
    threshold?: ApprovalThreshold
  ): Promise<Approver[]> {
    // Get users with eligible roles
    const eligibleRoles = threshold?.requiredRoles || ['admin', 'operations_manager'];

    const { data: users, error } = await supabase
      .from('user_organization_roles')
      .select(`
        user_id,
        role_id,
        roles:role_id (
          name
        )
      `)
      .in('roles.name', eligibleRoles);

    if (error || !users) {
      return [];
    }

    return users.map((user: any) => ({
      id: user.user_id,
      userId: user.user_id,
      role: user.roles?.name || 'unknown',
      weight: this.getRoleWeight(user.roles?.name || 'unknown'),
      required: true,
      alternates: []
    }));
  }
  /**
   * Get role weight for weighted approvals
   */
  private getRoleWeight(role: string): number {
    const weights: Record<string, number> = {
      'admin': 3,
      'operations_manager': 2,
      'compliance_officer': 2,
      'finance_manager': 2,
      'operations_team': 1
    };
    return weights[role] || 1;
  }

  /**
   * Calculate approval deadline
   */
  private calculateDeadline(
    workflow: ApprovalWorkflow,
    threshold?: ApprovalThreshold
  ): Date | undefined {
    const hours = threshold?.timeLimit || 24; // Default 24 hours
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  /**
   * Record approval decision
   */
  private async recordApproval(decision: ApprovalDecision): Promise<void> {
    await supabase
      .from('approval_signatures')
      .insert({
        signature: decision.signature,
        approver_id: decision.approverId,
        request_id: decision.processId,
        message: JSON.stringify(decision),
        verified: true
      });
  }
  /**
   * Notify approvers about pending approval
   */
  private async notifyApprovers(
    approvers: Approver[],
    request: RedemptionRequest,
    process: ApprovalProcess
  ): Promise<void> {
    // Use the ApprovalNotifier service
    await approvalNotifier.notifyApprovers(approvers, request.id, process);
    
    // Also store legacy notification records for backwards compatibility
    for (const approver of approvers) {
      await supabase
        .from('redemption_notifications')
        .insert({
          redemption_id: request.id,
          user_id: approver.userId,
          notification_type: 'approval_required',
          message: `Approval required for redemption request ${request.id}`,
          metadata: {
            processId: process.id,
            deadline: process.deadline
          }
        });
    }
  }

  /**
   * Start timeout monitoring for approval process
   */
  private async startTimeoutMonitoring(process: ApprovalProcess): Promise<void> {
    // This would typically be handled by a background job
    // For now, just log
    console.log(`Timeout monitoring started for process ${process.id}, deadline: ${process.deadline}`);
  }

  /**
   * Map database row to ApprovalProcess
   */
  private mapProcessRowToProcess(row: ApprovalProcessRow): ApprovalProcess {
    return {
      id: row.id,
      requestId: row.request_id,
      workflowId: row.workflow_id,
      status: row.status as any,
      requiredApprovals: row.required_approvals,
      approvals: [],
      pendingApprovers: row.pending_approvers || [],
      startedAt: row.started_at || new Date().toISOString(),
      deadline: row.deadline || undefined,
      completedAt: row.completed_at || undefined,
      escalationLevel: row.escalation_level || undefined,
      metadata: row.metadata || undefined
    };
  }
  /**
   * Map config row to ApprovalWorkflow
   */
  private mapConfigToWorkflow(config: any, tokenId: string): ApprovalWorkflow {
    return {
      id: config.id,
      name: config.config_name || 'Default Workflow',
      tokenId,
      type: config.approval_mode || 'parallel',
      requiredApprovals: config.required_approvals,
      approvers: [],
      thresholds: this.parseThresholds(config.metadata),
      escalationRules: this.parseEscalationRules(config.escalation_config),
      timeouts: [],
      status: config.active ? 'active' : 'inactive'
    };
  }

  /**
   * Parse thresholds from metadata
   */
  private parseThresholds(metadata: any): ApprovalThreshold[] {
    if (!metadata?.thresholds) {
      return [];
    }
    return metadata.thresholds.map((t: any) => ({
      amountMin: t.min ? BigInt(t.min) : undefined,
      amountMax: t.max ? BigInt(t.max) : undefined,
      requiredApprovals: t.required,
      requiredRoles: t.roles,
      timeLimit: t.hours
    }));
  }

  /**
   * Parse escalation rules from config
   */
  private parseEscalationRules(config: any): EscalationRule[] {
    if (!config || !Array.isArray(config)) {
      return [];
    }
    return config.map((rule: any, index: number) => ({
      id: `rule-${index}`,
      name: rule.name || `Escalation ${index + 1}`,
      trigger: rule.trigger || 'timeout',
      afterHours: rule.afterHours,
      escalateToRole: rule.escalateToRole || 'admin',
      extensionHours: rule.extensionHours,
      level: index + 1,
      overrideThreshold: rule.overrideThreshold || false
    }));
  }
}

// Result type for submitApproval
export interface ApprovalResult {
  status: 'pending' | 'completed' | 'rejected';
  approved: boolean | null;
  message: string;
  remaining?: number;
  isComplete: boolean;
}
