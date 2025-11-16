/**
 * Multi-Party Approval Workflow System
 * Manages approval processes for redemption requests
 * Implements Stage 10: Multi-Party Approval Workflow
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { 
  ApprovalRequest,
  ApprovalRecord,
  ApprovalDecision,
  ApprovalStatus
} from '@/components/redemption/types';

// Workflow types
export type WorkflowType = 
  | 'sequential'    // Approvals in specific order
  | 'parallel'      // Any order, threshold based
  | 'hierarchical'  // Escalation based on amount
  | 'conditional';  // Dynamic based on conditions

export interface ApprovalWorkflow {
  id: string;
  name: string;
  tokenId?: string;
  projectId?: string;
  type: WorkflowType;
  requiredApprovals: number;
  approvers: Approver[];
  thresholds: ApprovalThreshold[];
  escalationRules: EscalationRule[];
  timeouts: WorkflowTimeout[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface Approver {
  id: string;
  userId: string;
  name: string;
  role: string;
  weight: number;  // For weighted approvals
  required: boolean;
  alternates: string[];
  conditions?: ApprovalCondition[];
}

export interface ApprovalThreshold {
  amountMin?: bigint;
  amountMax?: bigint;
  requiredApprovals: number;
  requiredRoles?: string[];
  timeLimit?: number;  // in hours
}

export interface EscalationRule {
  id: string;
  level: number;
  triggerAfterHours: number;
  escalateToRole: string;
  newThreshold?: number;
  overrideThreshold?: boolean;
  extensionHours?: number;
}

export interface WorkflowTimeout {
  id: string;
  timeoutHours: number;
  action: 'auto_approve' | 'auto_reject' | 'escalate';
  escalateToRole?: string;
}

export interface ApprovalCondition {
  field: string;
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne' | 'in' | 'nin';
  value: any;
}

export interface ApprovalProcess {
  id: string;
  requestId: string;
  workflowId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  requiredApprovals: number;
  currentApprovals?: number; // Track number of approvals received (from DB)
  approvals: ApprovalRecord[];
  pendingApprovers: string[];
  startedAt: Date;
  deadline?: Date;
  escalationLevel?: number;
  metadata?: Record<string, any>;
}

export interface ThresholdResult {
  met: boolean;
  approved: boolean;
  rejected?: boolean;
  reason: string;
}

export class ApprovalWorkflowManager {
  private readonly approvalsTable = 'redemption_approvers';
  private readonly requestsTable = 'redemption_requests';
  private readonly processesTable = 'approval_processes';
  private readonly configsTable = 'approval_configs';

  /**
   * Initiate approval process for a redemption request
   */
  async initiateApproval(
    requestId: string,
    workflowConfig?: Partial<ApprovalWorkflow>
  ): Promise<ApprovalProcess> {
    try {
      // 1. Get or create workflow
      const workflow = await this.getApplicableWorkflow(requestId, workflowConfig);

      // 2. Identify approvers
      const approvers = await this.identifyApprovers(workflow, requestId);

      // 3. Calculate deadline
      const deadline = this.calculateDeadline(workflow);

      // 4. Create approval process
      const process: ApprovalProcess = {
        id: crypto.randomUUID(),
        requestId,
        workflowId: workflow.id,
        status: 'pending',
        requiredApprovals: this.calculateRequiredApprovals(workflow, requestId),
        approvals: [],
        pendingApprovers: approvers.map(a => a.id),
        startedAt: new Date(),
        deadline,
        metadata: {}
      };

      // 5. Store process in database
      await this.storeApprovalProcess(process);

      // 6. Create approval records for each approver
      await this.createApprovalRecords(requestId, approvers);

      // 7. Notify approvers
      await this.notifyApprovers(approvers, requestId, process);

      // 8. Start timeout monitoring
      await this.startTimeoutMonitoring(process);

      return process;
    } catch (error) {
      console.error('Error initiating approval:', error);
      throw error;
    }
  }

  /**
   * Submit an approval decision
   */
  async submitApproval(
    requestId: string,
    approverId: string,
    decision: ApprovalDecision,
    comments?: string,
    signature?: string
  ): Promise<{
    status: 'completed' | 'pending' | 'rejected';
    approved: boolean | null;
    message: string;
    remaining?: number;
  }> {
    try {
      // 1. Validate approver
      const isValid = await this.validateApprover(approverId, requestId);
      if (!isValid) {
        throw new Error('Unauthorized approver');
      }

      // 2. Verify signature if provided
      if (signature) {
        const signatureValid = await this.verifySignature(signature, approverId, requestId);
        if (!signatureValid) {
          throw new Error('Invalid signature');
        }
      }

      // 3. Record approval
      await this.recordApproval(requestId, approverId, decision, comments);

      // 4. Check if threshold met
      const process = await this.getProcess(requestId);
      const threshold = await this.checkThreshold(process);

      if (threshold.met) {
        if (threshold.approved) {
          // 5a. Complete approval process
          await this.completeApprovalProcess(process, threshold);
          
          return {
            status: 'completed',
            approved: true,
            message: 'Redemption request approved and ready for execution'
          };
        } else if (threshold.rejected) {
          // 5b. Reject request
          await this.rejectRequest(requestId, threshold.reason);
          
          return {
            status: 'rejected',
            approved: false,
            message: threshold.reason
          };
        }
      }

      // 6. Continue waiting for more approvals
      const remaining = process.requiredApprovals - process.approvals.filter(a => a.decision === 'approved').length;
      
      return {
        status: 'pending',
        approved: null,
        message: `${process.approvals.length}/${process.requiredApprovals} approvals received`,
        remaining
      };
    } catch (error) {
      console.error('Error submitting approval:', error);
      throw error;
    }
  }

  /**
   * Check if approval threshold has been met
   */
  private async checkThreshold(process: ApprovalProcess): Promise<ThresholdResult> {
    const { data: request } = await supabase
      .from(this.requestsTable)
      .select('token_amount')
      .eq('id', process.requestId)
      .single();

    if (!request) {
      throw new Error('Request not found');
    }

    // Find applicable threshold
    const workflow = await this.getWorkflow(process.workflowId);
    const threshold = workflow.thresholds.find(t => 
      (!t.amountMin || BigInt(request.token_amount) >= t.amountMin) &&
      (!t.amountMax || BigInt(request.token_amount) <= t.amountMax)
    ) || {
      requiredApprovals: workflow.requiredApprovals,
      requiredRoles: []
    };

    // Count approvals
    const approvals = process.approvals.filter(a => a.decision === 'approved');
    const rejections = process.approvals.filter(a => a.decision === 'rejected');

    // Check if met
    if (approvals.length >= threshold.requiredApprovals) {
      // Check role requirements
      if (threshold.requiredRoles && threshold.requiredRoles.length > 0) {
        const hasRequiredRoles = await this.checkRequiredRoles(
          approvals,
          threshold.requiredRoles
        );

        if (!hasRequiredRoles) {
          return {
            met: false,
            approved: false,
            reason: 'Missing required role approvals'
          };
        }
      }

      return {
        met: true,
        approved: true,
        reason: 'Threshold met'
      };
    }

    // Check if impossible to meet threshold
    const remainingPossible = process.pendingApprovers.length;
    if (approvals.length + remainingPossible < threshold.requiredApprovals) {
      return {
        met: true,
        rejected: true,
        approved: false,
        reason: 'Insufficient approvals possible'
      };
    }

    // Check explicit rejections for sequential workflow
    if (workflow.type === 'sequential' && rejections.length > 0) {
      return {
        met: true,
        rejected: true,
        approved: false,
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
   * Get applicable workflow for a redemption request
   */
  private async getApplicableWorkflow(
    requestId: string,
    config?: Partial<ApprovalWorkflow>
  ): Promise<ApprovalWorkflow> {
    // If config provided, use it
    if (config) {
      return this.createWorkflowFromConfig(config);
    }

    // Otherwise, get from database
    const { data: request } = await supabase
      .from(this.requestsTable)
      .select('project_id, organization_id')
      .eq('id', requestId)
      .single();

    if (!request) {
      throw new Error('Request not found');
    }

    // Get approval config for project
    const { data: approvalConfig } = await supabase
      .from(this.configsTable)
      .select(`
        *,
        approval_config_approvers (*)
      `)
      .eq('active', true)
      .limit(1)
      .single();

    if (!approvalConfig) {
      // Create default workflow
      return this.createDefaultWorkflow();
    }

    return this.mapConfigToWorkflow(approvalConfig);
  }

  /**
   * Identify approvers for workflow
   */
  private async identifyApprovers(
    workflow: ApprovalWorkflow,
    requestId: string
  ): Promise<Approver[]> {
    // If approvers defined in workflow, use them
    if (workflow.approvers && workflow.approvers.length > 0) {
      return workflow.approvers;
    }

    // Otherwise, get approvers from config
    const { data: configApprovers } = await supabase
      .from('approval_config_approvers')
      .select('*')
      .order('order_priority', { ascending: true });

    if (!configApprovers || configApprovers.length === 0) {
      throw new Error('No approvers configured');
    }

    return configApprovers.map(ca => ({
      id: ca.id,
      userId: ca.approver_user_id || ca.id,
      name: 'Approver', // Would get from users table in production
      role: ca.approver_role_id || 'admin',
      weight: 1,
      required: ca.is_required || false,
      alternates: []
    }));
  }

  /**
   * Calculate deadline based on workflow timeouts
   */
  private calculateDeadline(workflow: ApprovalWorkflow): Date | undefined {
    if (!workflow.timeouts || workflow.timeouts.length === 0) {
      return undefined;
    }

    const maxTimeout = Math.max(...workflow.timeouts.map(t => t.timeoutHours));
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + maxTimeout);
    
    return deadline;
  }

  /**
   * Calculate required approvals based on workflow and request
   */
  private calculateRequiredApprovals(
    workflow: ApprovalWorkflow,
    requestId: string
  ): number {
    // Use workflow's required approvals by default
    return workflow.requiredApprovals;
  }

  /**
   * Store approval process in database
   */
  private async storeApprovalProcess(process: ApprovalProcess): Promise<void> {
    const { error } = await supabase
      .from(this.processesTable)
      .insert({
        id: process.id,
        request_id: process.requestId,
        workflow_id: process.workflowId,
        status: process.status,
        required_approvals: process.requiredApprovals,
        pending_approvers: process.pendingApprovers,
        started_at: process.startedAt.toISOString(),
        deadline: process.deadline?.toISOString()
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Create approval records for approvers
   */
  private async createApprovalRecords(
    requestId: string,
    approvers: Approver[]
  ): Promise<void> {
    const records = approvers.map(approver => ({
      redemption_id: requestId,
      approver_id: approver.userId,
      name: approver.name,
      role: approver.role,
      approved: false
    }));

    const { error } = await supabase
      .from(this.approvalsTable)
      .insert(records);

    if (error) {
      throw error;
    }
  }

  /**
   * Notify approvers about pending approval
   */
  private async notifyApprovers(
    approvers: Approver[],
    requestId: string,
    process: ApprovalProcess
  ): Promise<void> {
    // Notification implementation would go here
    console.log(`Notifying ${approvers.length} approvers for request ${requestId}`);
  }

  /**
   * Start timeout monitoring for process
   */
  private async startTimeoutMonitoring(process: ApprovalProcess): Promise<void> {
    // Timeout monitoring implementation would go here
    console.log(`Starting timeout monitoring for process ${process.id}`);
  }

  /**
   * Validate approver authorization
   */
  private async validateApprover(approverId: string, requestId: string): Promise<boolean> {
    const { data } = await supabase
      .from(this.approvalsTable)
      .select('*')
      .eq('redemption_id', requestId)
      .or(`approver_id.eq.${approverId},id.eq.${approverId}`)
      .single();

    return !!data;
  }

  /**
   * Verify signature (placeholder for actual implementation)
   */
  private async verifySignature(
    signature: string,
    approverId: string,
    requestId: string
  ): Promise<boolean> {
    // Signature verification would go here
    return true; // Placeholder
  }

  /**
   * Record approval in database
   */
  private async recordApproval(
    requestId: string,
    approverId: string,
    decision: ApprovalDecision,
    comments?: string
  ): Promise<void> {
    const { error } = await supabase
      .from(this.approvalsTable)
      .update({
        approved: decision === 'approved',
        status: decision,
        comments,
        decision_date: new Date().toISOString(),
        approved_at: decision === 'approved' ? new Date().toISOString() : null
      })
      .eq('redemption_id', requestId)
      .or(`approver_id.eq.${approverId},id.eq.${approverId}`);

    if (error) {
      throw error;
    }
  }

  /**
   * Get approval process
   */
  private async getProcess(requestId: string): Promise<ApprovalProcess> {
    const { data: processData } = await supabase
      .from(this.processesTable)
      .select('*')
      .eq('request_id', requestId)
      .single();

    const { data: approvalData } = await supabase
      .from(this.approvalsTable)
      .select('*')
      .eq('redemption_id', requestId);

    if (!processData || !approvalData) {
      throw new Error('Process not found');
    }

    const approvals: ApprovalRecord[] = approvalData.map(a => ({
      id: a.id,
      approverId: a.approver_id || a.id,
      approverName: a.name,
      approverRole: a.role,
      decision: a.approved ? 'approved' : a.status || 'pending',
      status: a.approved ? 'approved' : a.status || 'pending',
      timestamp: a.approved_at ? new Date(a.approved_at) : new Date(a.created_at),
      comments: a.comments
    }));

    return {
      id: processData.id,
      requestId: processData.request_id,
      workflowId: processData.workflow_id,
      status: processData.status,
      requiredApprovals: processData.required_approvals,
      approvals,
      pendingApprovers: processData.pending_approvers || [],
      startedAt: new Date(processData.started_at),
      deadline: processData.deadline ? new Date(processData.deadline) : undefined
    };
  }

  /**
   * Get workflow by ID
   */
  private async getWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    const { data } = await supabase
      .from(this.configsTable)
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!data) {
      throw new Error('Workflow not found');
    }

    return this.mapConfigToWorkflow(data);
  }

  /**
   * Check required roles are present in approvals
   */
  private async checkRequiredRoles(
    approvals: ApprovalRecord[],
    requiredRoles: string[]
  ): Promise<boolean> {
    const approvalRoles = new Set(approvals.map(a => a.approverRole));
    return requiredRoles.every(role => approvalRoles.has(role));
  }

  /**
   * Complete approval process
   */
  private async completeApprovalProcess(
    process: ApprovalProcess,
    threshold: ThresholdResult
  ): Promise<void> {
    // Update process status
    await supabase
      .from(this.processesTable)
      .update({
        status: 'approved',
        completed_at: new Date().toISOString()
      })
      .eq('id', process.id);

    // Update redemption request status
    await supabase
      .from(this.requestsTable)
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', process.requestId);
  }

  /**
   * Reject request
   */
  private async rejectRequest(requestId: string, reason: string): Promise<void> {
    await supabase
      .from(this.requestsTable)
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejection_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
  }

  /**
   * Create workflow from config
   */
  private createWorkflowFromConfig(config: Partial<ApprovalWorkflow>): ApprovalWorkflow {
    return {
      id: config.id || crypto.randomUUID(),
      name: config.name || 'Custom Workflow',
      tokenId: config.tokenId,
      projectId: config.projectId,
      type: config.type || 'parallel',
      requiredApprovals: config.requiredApprovals || 2,
      approvers: config.approvers || [],
      thresholds: config.thresholds || [],
      escalationRules: config.escalationRules || [],
      timeouts: config.timeouts || [],
      status: config.status || 'active',
      createdAt: config.createdAt || new Date(),
      updatedAt: config.updatedAt || new Date()
    };
  }

  /**
   * Create default workflow
   */
  private createDefaultWorkflow(): ApprovalWorkflow {
    return {
      id: crypto.randomUUID(),
      name: 'Default Workflow',
      type: 'parallel',
      requiredApprovals: 2,
      approvers: [],
      thresholds: [],
      escalationRules: [],
      timeouts: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Map database config to workflow
   */
  private mapConfigToWorkflow(config: any): ApprovalWorkflow {
    return {
      id: config.id,
      name: config.config_name || 'Approval Workflow',
      type: config.approval_mode || 'parallel',
      requiredApprovals: config.required_approvals || 2,
      approvers: [],
      thresholds: [],
      escalationRules: config.escalation_config ? JSON.parse(config.escalation_config) : [],
      timeouts: [],
      status: config.active ? 'active' : 'inactive',
      createdAt: new Date(config.created_at),
      updatedAt: new Date(config.updated_at)
    };
  }
}

// Export singleton instance
export const approvalWorkflowManager = new ApprovalWorkflowManager();
