/**
 * Approval Orchestrator
 * Coordinates all approval workflow components
 * Implements Stage 10: Multi-Party Approval Workflow - Integration
 */

import { supabase } from '@/infrastructure/supabaseClient';
import { approvalWorkflowManager, type ApprovalProcess, type ApprovalWorkflow } from './ApprovalWorkflow';
import { roleBasedApprover } from './RoleBasedApprover';
import { approvalDelegationService } from './ApprovalDelegation';
import { MultiSignature } from './MultiSignature';
import type { 
  ApprovalDecision,
  ApprovalRecord
} from '@/components/redemption/types';

export interface ApprovalOrchestrationConfig {
  enableSignatures?: boolean;
  enableDelegation?: boolean;
  enableEscalation?: boolean;
  autoNotifyApprovers?: boolean;
}

export interface ApprovalSubmission {
  requestId: string;
  approverId: string;
  decision: ApprovalDecision;
  comments?: string;
  signature?: string;
  onBehalfOf?: string; // For delegated approvals
}

export interface ApprovalResult {
  success: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  message: string;
  process?: ApprovalProcess;
  remaining?: number;
  error?: string;
}

export class ApprovalOrchestrator {
  private config: ApprovalOrchestrationConfig;
  private signatureService: MultiSignature;

  constructor(config?: ApprovalOrchestrationConfig) {
    this.config = {
      enableSignatures: config?.enableSignatures ?? true,
      enableDelegation: config?.enableDelegation ?? true,
      enableEscalation: config?.enableEscalation ?? true,
      autoNotifyApprovers: config?.autoNotifyApprovers ?? true
    };

    // Initialize signature service with default config
    this.signatureService = new MultiSignature({
      algorithm: 'ECDSA',
      keySize: 256,
      hashFunction: 'SHA256'
    });
  }

  /**
   * Initialize approval process for a redemption request
   */
  async initializeApproval(
    requestId: string,
    workflow?: Partial<ApprovalWorkflow>
  ): Promise<ApprovalResult> {
    try {
      console.log(`🔄 Initializing approval process for request: ${requestId}`);

      // 1. Get redemption request details
      const { data: request } = await supabase
        .from('redemption_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        return {
          success: false,
          status: 'pending',
          message: 'Redemption request not found',
          error: 'Request not found'
        };
      }

      // 2. Determine approvers based on role and amount
      const approvers = await this.determineApprovers(
        request.token_amount,
        request.project_id
      );

      if (approvers.length === 0) {
        return {
          success: false,
          status: 'pending',
          message: 'No eligible approvers found',
          error: 'No approvers available'
        };
      }

      // 3. Create workflow if not provided
      const approvalWorkflow: Partial<ApprovalWorkflow> = workflow || {
        name: 'Redemption Approval Workflow',
        type: 'parallel',
        requiredApprovals: Math.min(approvers.length, 2),
        approvers,
        thresholds: this.createThresholds(request.token_amount),
        escalationRules: this.config.enableEscalation ? this.createEscalationRules() : []
      };

      // 4. Initiate approval process
      const process = await approvalWorkflowManager.initiateApproval(
        requestId,
        approvalWorkflow
      );

      console.log(`✅ Approval process initialized: ${process.id}`);

      return {
        success: true,
        status: 'pending',
        message: `Approval process initiated with ${process.requiredApprovals} required approvals`,
        process,
        remaining: process.requiredApprovals
      };
    } catch (error) {
      console.error('❌ Error initializing approval:', error);
      return {
        success: false,
        status: 'pending',
        message: 'Failed to initialize approval process',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Submit an approval decision
   */
  async submitApproval(submission: ApprovalSubmission): Promise<ApprovalResult> {
    try {
      console.log(`🔄 Processing approval submission for request: ${submission.requestId}`);

      // 1. Validate approver authorization
      const isAuthorized = await this.validateApprover(
        submission.approverId,
        submission.requestId
      );

      if (!isAuthorized) {
        // Check if this is a delegated approval
        if (submission.onBehalfOf && this.config.enableDelegation) {
          const delegationCheck = await approvalDelegationService.canApproveOnBehalf(
            submission.approverId,
            submission.onBehalfOf,
            submission.requestId
          );

          if (!delegationCheck.canApprove) {
            return {
              success: false,
              status: 'pending',
              message: `Delegation not valid: ${delegationCheck.reason}`,
              error: delegationCheck.reason
            };
          }

          // Record proxy approval
          await approvalDelegationService.recordProxyApproval(
            submission.onBehalfOf,
            submission.approverId,
            delegationCheck.delegation!.id,
            submission.comments
          );

          console.log(`✅ Proxy approval recorded for ${submission.onBehalfOf}`);
        } else {
          return {
            success: false,
            status: 'pending',
            message: 'User is not authorized to approve this request',
            error: 'Unauthorized'
          };
        }
      }

      // 2. Verify signature if enabled and provided
      if (this.config.enableSignatures && submission.signature) {
        const signatureValid = await this.signatureService.verifySignature(
          submission.signature,
          submission.approverId,
          submission.requestId
        );

        if (!signatureValid) {
          return {
            success: false,
            status: 'pending',
            message: 'Invalid signature provided',
            error: 'Invalid signature'
          };
        }

        console.log(`✅ Signature verified for approval`);
      } else if (this.config.enableSignatures) {
        // Create signature if not provided
        submission.signature = await this.signatureService.createApprovalSignature(
          submission.approverId,
          submission.requestId,
          submission.decision
        );
      }

      // 3. Submit approval through workflow manager
      const result = await approvalWorkflowManager.submitApproval(
        submission.requestId,
        submission.approverId,
        submission.decision,
        submission.comments,
        submission.signature
      );

      console.log(`✅ Approval submitted: ${result.status}`);

      return {
        success: true,
        status: result.status === 'completed' 
          ? (result.approved ? 'approved' : 'rejected')
          : 'pending',
        message: result.message,
        remaining: result.remaining
      };
    } catch (error) {
      console.error('❌ Error submitting approval:', error);
      return {
        success: false,
        status: 'pending',
        message: 'Failed to submit approval',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Escalate an approval request
   */
  async escalateApproval(
    requestId: string,
    escalatorId: string,
    reason: string
  ): Promise<ApprovalResult> {
    try {
      if (!this.config.enableEscalation) {
        return {
          success: false,
          status: 'pending',
          message: 'Escalation is not enabled',
          error: 'Escalation disabled'
        };
      }

      console.log(`🔄 Escalating approval for request: ${requestId}`);

      // 1. Check if user can escalate
      const canEscalate = await roleBasedApprover.canEscalate(escalatorId);

      if (!canEscalate) {
        return {
          success: false,
          status: 'pending',
          message: 'User is not authorized to escalate approvals',
          error: 'Unauthorized escalation'
        };
      }

      // 2. Get user's role to determine escalation path
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', escalatorId)
        .single();

      if (!userRoles) {
        return {
          success: false,
          status: 'pending',
          message: 'Could not determine user role',
          error: 'Role not found'
        };
      }

      // 3. Get escalation chain
      const escalationChain = await roleBasedApprover.getEscalationChain(
        userRoles.role
      );

      if (escalationChain.length === 0) {
        return {
          success: false,
          status: 'pending',
          message: 'No escalation path available',
          error: 'No escalation path'
        };
      }

      // 4. Add escalation approvers
      const escalationApprovers = await roleBasedApprover.getApproversByRoles(
        [escalationChain[0]] // Take first escalation level
      );

      // 5. Update approval process with escalation
      await supabase
        .from('approval_processes')
        .update({
          status: 'escalated',
          escalation_level: 1,
          metadata: {
            escalation_reason: reason,
            escalated_by: escalatorId,
            escalated_at: new Date().toISOString(),
            new_approvers: escalationApprovers.map(a => a.id)
          }
        })
        .eq('request_id', requestId);

      console.log(`✅ Approval escalated to: ${escalationChain[0]}`);

      return {
        success: true,
        status: 'escalated',
        message: `Approval escalated to ${escalationChain[0]} role`
      };
    } catch (error) {
      console.error('❌ Error escalating approval:', error);
      return {
        success: false,
        status: 'pending',
        message: 'Failed to escalate approval',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get approval status
   */
  async getApprovalStatus(requestId: string): Promise<{
    success: boolean;
    process?: ApprovalProcess;
    approvals?: ApprovalRecord[];
    progress?: {
      current: number;
      required: number;
      percentage: number;
    };
    error?: string;
  }> {
    try {
      // Get process from database
      const { data: processData } = await supabase
        .from('approval_processes')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (!processData) {
        return {
          success: false,
          error: 'Approval process not found'
        };
      }

      // Get approval records
      const { data: approvalsData } = await supabase
        .from('redemption_approvers')
        .select('*')
        .eq('redemption_id', requestId);

      const approvals: ApprovalRecord[] = (approvalsData || []).map(a => ({
        id: a.id,
        approverId: a.approver_id || a.id,
        approverName: a.name,
        approverRole: a.role,
        decision: a.approved ? 'approved' : a.status || 'pending',
        status: a.approved ? 'approved' : a.status || 'pending',
        timestamp: a.approved_at ? new Date(a.approved_at) : new Date(a.created_at),
        comments: a.comments
      }));

      const current = approvals.filter(a => a.decision === 'approved').length;
      const required = processData.required_approvals;

      const process: ApprovalProcess = {
        id: processData.id,
        requestId: processData.request_id,
        workflowId: processData.workflow_id,
        status: processData.status,
        requiredApprovals: required,
        approvals,
        pendingApprovers: processData.pending_approvers || [],
        startedAt: new Date(processData.started_at),
        deadline: processData.deadline ? new Date(processData.deadline) : undefined,
        escalationLevel: processData.escalation_level,
        metadata: processData.metadata
      };

      return {
        success: true,
        process,
        approvals,
        progress: {
          current,
          required,
          percentage: Math.round((current / required) * 100)
        }
      };
    } catch (error) {
      console.error('Error getting approval status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Determine approvers based on amount and context
   */
  private async determineApprovers(
    amount: number,
    projectId?: string
  ): Promise<any[]> {
    // Get approvers based on amount thresholds
    const roles: string[] = [];

    if (amount > 1000000) {
      // Large amounts require admin approval
      roles.push('admin', 'super_admin');
    } else if (amount > 100000) {
      // Medium amounts require manager approval
      roles.push('operations_manager', 'admin');
    } else {
      // Standard amounts
      roles.push('operations_team', 'approver');
    }

    // Always include compliance for certain amounts
    if (amount > 50000) {
      roles.push('compliance_officer');
    }

    return await roleBasedApprover.getApproversByRoles(roles, projectId);
  }

  /**
   * Create approval thresholds based on amount
   */
  private createThresholds(amount: number): any[] {
    return [
      {
        amountMin: BigInt(0),
        amountMax: BigInt(100000),
        requiredApprovals: 1,
        requiredRoles: []
      },
      {
        amountMin: BigInt(100000),
        amountMax: BigInt(1000000),
        requiredApprovals: 2,
        requiredRoles: ['operations_manager']
      },
      {
        amountMin: BigInt(1000000),
        amountMax: BigInt('999999999999999999'),
        requiredApprovals: 3,
        requiredRoles: ['admin', 'compliance_officer']
      }
    ];
  }

  /**
   * Create escalation rules
   */
  private createEscalationRules(): any[] {
    return [
      {
        id: 'timeout-24h',
        level: 1,
        triggerAfterHours: 24,
        escalateToRole: 'operations_manager',
        extensionHours: 12
      },
      {
        id: 'timeout-48h',
        level: 2,
        triggerAfterHours: 48,
        escalateToRole: 'admin',
        extensionHours: 24
      }
    ];
  }

  /**
   * Validate if user is authorized to approve
   */
  private async validateApprover(
    approverId: string,
    requestId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('redemption_approvers')
      .select('*')
      .eq('redemption_id', requestId)
      .or(`approver_id.eq.${approverId},id.eq.${approverId}`)
      .single();

    return !!data;
  }
}

// Export singleton instance
export const approvalOrchestrator = new ApprovalOrchestrator();
