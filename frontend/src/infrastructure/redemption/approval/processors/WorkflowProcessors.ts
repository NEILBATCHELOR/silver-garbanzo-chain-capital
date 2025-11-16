/**
 * Workflow Processors for Different Approval Types
 * Implements Sequential, Parallel, and Hierarchical approval processing
 * Stage 10: Multi-Party Approval Workflow - Processors
 */

import type { ApprovalProcess, ApprovalWorkflow, Approver } from '../ApprovalWorkflow';
import type { ApprovalRecord } from '@/components/redemption/types';

export interface WorkflowProcessor {
  process(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess,
    newApproval: ApprovalRecord
  ): Promise<ProcessResult>;
}

export interface ProcessResult {
  shouldProceed: boolean;
  isComplete: boolean;
  nextApprovers?: Approver[];
  message: string;
}

/**
 * Sequential Processor - Approvals must happen in order
 */
export class SequentialProcessor implements WorkflowProcessor {
  async process(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess,
    newApproval: ApprovalRecord
  ): Promise<ProcessResult> {
    // Get ordered list of approvers
    const orderedApprovers = workflow.approvers.sort((a, b) => 
      (a.conditions?.find(c => c.field === 'order')?.value || 0) - 
      (b.conditions?.find(c => c.field === 'order')?.value || 0)
    );

    // Find current position in sequence
    const currentIndex = orderedApprovers.findIndex(a => a.id === newApproval.approverId);

    if (currentIndex === -1) {
      return {
        shouldProceed: false,
        isComplete: false,
        message: 'Approver not found in workflow'
      };
    }

    // Check if this is the current approver in sequence
    const expectedIndex = process.approvals.filter(a => a.decision === 'approved').length;

    if (currentIndex !== expectedIndex) {
      return {
        shouldProceed: false,
        isComplete: false,
        message: `Approval must be done in sequence. Next approver: ${orderedApprovers[expectedIndex].name}`
      };
    }

    // Check if approval was rejected
    if (newApproval.decision === 'rejected') {
      return {
        shouldProceed: false,
        isComplete: true,
        message: 'Sequential approval rejected - process terminated'
      };
    }

    // Check if this was the last approval
    const isComplete = currentIndex === orderedApprovers.length - 1;

    if (isComplete) {
      return {
        shouldProceed: true,
        isComplete: true,
        message: 'All sequential approvals complete'
      };
    }

    // Get next approver
    const nextApprover = orderedApprovers[currentIndex + 1];

    return {
      shouldProceed: true,
      isComplete: false,
      nextApprovers: [nextApprover],
      message: `Approval recorded. Next approver: ${nextApprover.name}`
    };
  }
}

/**
 * Parallel Processor - Approvals can happen in any order
 */
export class ParallelProcessor implements WorkflowProcessor {
  async process(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess,
    newApproval: ApprovalRecord
  ): Promise<ProcessResult> {
    // Count approved decisions
    const approvedCount = process.approvals.filter(a => a.decision === 'approved').length;
    const rejectedCount = process.approvals.filter(a => a.decision === 'rejected').length;

    // Check if threshold met
    const thresholdMet = approvedCount >= workflow.requiredApprovals;

    if (thresholdMet) {
      return {
        shouldProceed: true,
        isComplete: true,
        message: `Approval threshold met (${approvedCount}/${workflow.requiredApprovals})`
      };
    }

    // Check if impossible to meet threshold
    const remainingApprovers = workflow.approvers.length - (approvedCount + rejectedCount);
    const impossibleToMeet = approvedCount + remainingApprovers < workflow.requiredApprovals;

    if (impossibleToMeet) {
      return {
        shouldProceed: false,
        isComplete: true,
        message: 'Approval threshold cannot be met - insufficient approvers'
      };
    }

    // Get remaining approvers
    const approvedIds = new Set(process.approvals.map(a => a.approverId));
    const remainingApproversList = workflow.approvers.filter(a => !approvedIds.has(a.id));

    return {
      shouldProceed: true,
      isComplete: false,
      nextApprovers: remainingApproversList,
      message: `Approval recorded. ${approvedCount}/${workflow.requiredApprovals} approvals received`
    };
  }
}

/**
 * Hierarchical Processor - Approvals based on role hierarchy and amount
 */
export class HierarchicalProcessor implements WorkflowProcessor {
  async process(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess,
    newApproval: ApprovalRecord
  ): Promise<ProcessResult> {
    // Get amount from process metadata
    const amount = BigInt(process.metadata?.amount || '0');

    // Find applicable threshold
    const threshold = workflow.thresholds.find(t =>
      (!t.amountMin || amount >= t.amountMin) &&
      (!t.amountMax || amount <= t.amountMax)
    );

    if (!threshold) {
      return {
        shouldProceed: false,
        isComplete: false,
        message: 'No applicable threshold found for amount'
      };
    }

    // Check if required roles have approved
    const approvedRoles = new Set(
      process.approvals
        .filter(a => a.decision === 'approved')
        .map(a => a.approverRole)
    );

    const requiredRoles = threshold.requiredRoles || [];
    const missingRoles = requiredRoles.filter(role => !approvedRoles.has(role));

    if (missingRoles.length > 0) {
      // Get approvers with missing roles
      const nextApprovers = workflow.approvers.filter(a => 
        missingRoles.includes(a.role)
      );

      return {
        shouldProceed: true,
        isComplete: false,
        nextApprovers,
        message: `Required roles still needed: ${missingRoles.join(', ')}`
      };
    }

    // Check if approval count threshold met
    const approvedCount = process.approvals.filter(a => a.decision === 'approved').length;
    const thresholdMet = approvedCount >= threshold.requiredApprovals;

    if (thresholdMet) {
      return {
        shouldProceed: true,
        isComplete: true,
        message: 'Hierarchical approval threshold met'
      };
    }

    return {
      shouldProceed: true,
      isComplete: false,
      message: `${approvedCount}/${threshold.requiredApprovals} approvals received`
    };
  }
}

/**
 * Conditional Processor - Dynamic approval based on conditions
 */
export class ConditionalProcessor implements WorkflowProcessor {
  async process(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess,
    newApproval: ApprovalRecord
  ): Promise<ProcessResult> {
    // Evaluate conditions for each approver
    const validApprovers = await this.evaluateApproverConditions(
      workflow.approvers,
      process
    );

    // Count valid approvals
    const validApprovals = process.approvals.filter(a => 
      a.decision === 'approved' && 
      validApprovers.some(va => va.id === a.approverId)
    );

    // Determine required approvals based on conditions
    const requiredCount = this.calculateRequiredApprovals(workflow, process);

    const thresholdMet = validApprovals.length >= requiredCount;

    if (thresholdMet) {
      return {
        shouldProceed: true,
        isComplete: true,
        message: 'Conditional approval requirements met'
      };
    }

    // Get remaining valid approvers
    const approvedIds = new Set(validApprovals.map(a => a.approverId));
    const remainingApprovers = validApprovers.filter(a => !approvedIds.has(a.id));

    return {
      shouldProceed: true,
      isComplete: false,
      nextApprovers: remainingApprovers,
      message: `${validApprovals.length}/${requiredCount} conditional approvals received`
    };
  }

  private async evaluateApproverConditions(
    approvers: Approver[],
    process: ApprovalProcess
  ): Promise<Approver[]> {
    const validApprovers: Approver[] = [];

    for (const approver of approvers) {
      if (!approver.conditions || approver.conditions.length === 0) {
        validApprovers.push(approver);
        continue;
      }

      const allConditionsMet = approver.conditions.every(condition =>
        this.evaluateCondition(condition, process)
      );

      if (allConditionsMet) {
        validApprovers.push(approver);
      }
    }

    return validApprovers;
  }

  private evaluateCondition(
    condition: any,
    process: ApprovalProcess
  ): boolean {
    const value = process.metadata?.[condition.field];

    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'gte': return value >= condition.value;
      case 'lt': return value < condition.value;
      case 'lte': return value <= condition.value;
      case 'in': return condition.value.includes(value);
      case 'nin': return !condition.value.includes(value);
      default: return false;
    }
  }

  private calculateRequiredApprovals(
    workflow: ApprovalWorkflow,
    process: ApprovalProcess
  ): number {
    // Could be dynamic based on conditions
    // For now, use workflow's required approvals
    return workflow.requiredApprovals;
  }
}

/**
 * Factory for creating appropriate processor
 */
export class WorkflowProcessorFactory {
  static createProcessor(type: string): WorkflowProcessor {
    switch (type) {
      case 'sequential':
        return new SequentialProcessor();
      case 'parallel':
        return new ParallelProcessor();
      case 'hierarchical':
        return new HierarchicalProcessor();
      case 'conditional':
        return new ConditionalProcessor();
      default:
        return new ParallelProcessor(); // Default to parallel
    }
  }
}
