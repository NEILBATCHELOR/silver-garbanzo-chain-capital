/**
 * Approval Delegation Service
 * Manages delegation of approval rights between users
 * Implements Stage 10: Multi-Party Approval Workflow - Delegation
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { ApprovalCondition } from './ApprovalWorkflow';

export type DelegationScope = 'all' | 'amount_limit' | 'token_type' | 'specific_conditions';

export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  scope: DelegationScope;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  conditions?: ApprovalCondition[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProxyApproval {
  id: string;
  originalApproverId: string;
  proxyApproverId: string;
  delegationId: string;
  timestamp: Date;
  reason?: string;
}

export interface DelegationConfig {
  maxDelegationDays?: number;
  allowChainedDelegation?: boolean;
  requireApprovalForDelegation?: boolean;
}

export class ApprovalDelegationService {
  private readonly delegationsTable = 'approval_delegations';
  private readonly config: DelegationConfig;

  constructor(config?: DelegationConfig) {
    this.config = {
      maxDelegationDays: config?.maxDelegationDays || 90,
      allowChainedDelegation: config?.allowChainedDelegation || false,
      requireApprovalForDelegation: config?.requireApprovalForDelegation || true
    };
  }

  /**
   * Create a new delegation
   */
  async createDelegation(
    delegatorId: string,
    delegateId: string,
    scope: DelegationScope,
    durationDays?: number,
    conditions?: ApprovalCondition[]
  ): Promise<ApprovalDelegation> {
    try {
      // Validate delegation request
      await this.validateDelegationRequest(delegatorId, delegateId);

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date();
      const days = Math.min(
        durationDays || 30,
        this.config.maxDelegationDays!
      );
      endDate.setDate(endDate.getDate() + days);

      // Create delegation record
      const delegation: Partial<ApprovalDelegation> = {
        delegatorId,
        delegateId,
        scope,
        startDate,
        endDate,
        isActive: true,
        conditions: conditions || []
      };

      const { data, error } = await supabase
        .from(this.delegationsTable)
        .insert({
          delegator_id: delegation.delegatorId,
          delegate_id: delegation.delegateId,
          scope: delegation.scope,
          start_date: delegation.startDate?.toISOString(),
          end_date: delegation.endDate?.toISOString(),
          is_active: delegation.isActive,
          conditions: delegation.conditions
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToDelegation(data);
    } catch (error) {
      console.error('Error creating delegation:', error);
      throw error;
    }
  }

  /**
   * Get active delegations for a user
   */
  async getActiveDelegations(userId: string): Promise<ApprovalDelegation[]> {
    try {
      const { data, error } = await supabase
        .from(this.delegationsTable)
        .select('*')
        .eq('delegator_id', userId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(d => this.mapToDelegation(d));
    } catch (error) {
      console.error('Error getting active delegations:', error);
      return [];
    }
  }

  /**
   * Get delegations where user is the delegate
   */
  async getDelegatedToUser(userId: string): Promise<ApprovalDelegation[]> {
    try {
      const { data, error } = await supabase
        .from(this.delegationsTable)
        .select('*')
        .eq('delegate_id', userId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(d => this.mapToDelegation(d));
    } catch (error) {
      console.error('Error getting delegations to user:', error);
      return [];
    }
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(delegationId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.delegationsTable)
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
          metadata: { revocation_reason: reason }
        })
        .eq('id', delegationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error revoking delegation:', error);
      throw error;
    }
  }

  /**
   * Check if user can approve on behalf of another
   */
  async canApproveOnBehalf(
    delegateId: string,
    delegatorId: string,
    requestId: string,
    amount?: bigint
  ): Promise<{
    canApprove: boolean;
    delegation?: ApprovalDelegation;
    reason?: string;
  }> {
    try {
      // Get active delegation
      const { data: delegations, error } = await supabase
        .from(this.delegationsTable)
        .select('*')
        .eq('delegator_id', delegatorId)
        .eq('delegate_id', delegateId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString());

      if (error || !delegations || delegations.length === 0) {
        return {
          canApprove: false,
          reason: 'No active delegation found'
        };
      }

      const delegation = this.mapToDelegation(delegations[0]);

      // Check delegation scope
      if (delegation.scope === 'all') {
        return {
          canApprove: true,
          delegation
        };
      }

      // Check amount limits
      if (delegation.scope === 'amount_limit' && amount) {
        const maxAmount = this.getMaxAmountFromConditions(delegation.conditions);
        if (maxAmount && amount > maxAmount) {
          return {
            canApprove: false,
            delegation,
            reason: 'Amount exceeds delegation limit'
          };
        }
      }

      // Check specific conditions
      if (delegation.scope === 'specific_conditions' && delegation.conditions) {
        const meetsConditions = await this.evaluateConditions(
          delegation.conditions,
          requestId
        );

        if (!meetsConditions) {
          return {
            canApprove: false,
            delegation,
            reason: 'Request does not meet delegation conditions'
          };
        }
      }

      return {
        canApprove: true,
        delegation
      };
    } catch (error) {
      console.error('Error checking delegation:', error);
      return {
        canApprove: false,
        reason: 'Error validating delegation'
      };
    }
  }

  /**
   * Record a proxy approval
   */
  async recordProxyApproval(
    originalApproverId: string,
    proxyApproverId: string,
    delegationId: string,
    reason?: string
  ): Promise<ProxyApproval> {
    try {
      const proxyApproval: ProxyApproval = {
        id: crypto.randomUUID(),
        originalApproverId,
        proxyApproverId,
        delegationId,
        timestamp: new Date(),
        reason
      };

      // Store in metadata or separate table
      await supabase
        .from('proxy_approvals')
        .insert({
          id: proxyApproval.id,
          original_approver_id: proxyApproval.originalApproverId,
          proxy_approver_id: proxyApproval.proxyApproverId,
          delegation_id: proxyApproval.delegationId,
          timestamp: proxyApproval.timestamp.toISOString(),
          reason: proxyApproval.reason
        });

      return proxyApproval;
    } catch (error) {
      console.error('Error recording proxy approval:', error);
      throw error;
    }
  }

  /**
   * Validate delegation request
   */
  private async validateDelegationRequest(
    delegatorId: string,
    delegateId: string
  ): Promise<void> {
    // Prevent self-delegation
    if (delegatorId === delegateId) {
      throw new Error('Cannot delegate to self');
    }

    // Check if chained delegation is allowed
    if (!this.config.allowChainedDelegation) {
      const delegateDelegations = await this.getActiveDelegations(delegateId);
      if (delegateDelegations.length > 0) {
        throw new Error('Chained delegation not allowed');
      }
    }

    // Check if delegate exists and has appropriate role
    const { data: delegateUser, error } = await supabase
      .from('users')
      .select('*, user_roles(*)')
      .eq('id', delegateId)
      .single();

    if (error || !delegateUser) {
      throw new Error('Delegate user not found');
    }

    // Verify delegate has approval permissions
    const hasApprovalRole = delegateUser.user_roles?.some((r: any) => 
      ['admin', 'super_admin', 'operations_manager', 'approver'].includes(r.role)
    );

    if (!hasApprovalRole) {
      throw new Error('Delegate does not have approval permissions');
    }
  }

  /**
   * Get max amount from delegation conditions
   */
  private getMaxAmountFromConditions(
    conditions?: ApprovalCondition[]
  ): bigint | undefined {
    if (!conditions) return undefined;

    const amountCondition = conditions.find(c => c.field === 'amount' && c.operator === 'lte');
    if (amountCondition) {
      return BigInt(amountCondition.value);
    }

    return undefined;
  }

  /**
   * Evaluate delegation conditions against request
   */
  private async evaluateConditions(
    conditions: ApprovalCondition[],
    requestId: string
  ): Promise<boolean> {
    // Get request details
    const { data: request } = await supabase
      .from('redemption_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) {
      return false;
    }

    // Evaluate each condition
    for (const condition of conditions) {
      const fieldValue = (request as any)[condition.field];
      if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    fieldValue: any,
    operator: string,
    conditionValue: any
  ): boolean {
    switch (operator) {
      case 'lt':
        return fieldValue < conditionValue;
      case 'lte':
        return fieldValue <= conditionValue;
      case 'gt':
        return fieldValue > conditionValue;
      case 'gte':
        return fieldValue >= conditionValue;
      case 'eq':
        return fieldValue === conditionValue;
      case 'ne':
        return fieldValue !== conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Map database record to delegation object
   */
  private mapToDelegation(data: any): ApprovalDelegation {
    return {
      id: data.id,
      delegatorId: data.delegator_id,
      delegateId: data.delegate_id,
      scope: data.scope,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      isActive: data.is_active,
      conditions: data.conditions || [],
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Get delegation statistics
   */
  async getDelegationStats(userId: string): Promise<{
    activeDelegations: number;
    delegatedApprovals: number;
    expiringSoon: number;
  }> {
    const activeDelegations = await this.getActiveDelegations(userId);
    const delegatedToUser = await this.getDelegatedToUser(userId);

    // Get delegations expiring in next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = activeDelegations.filter(d => 
      d.endDate && d.endDate <= sevenDaysFromNow
    ).length;

    return {
      activeDelegations: activeDelegations.length,
      delegatedApprovals: delegatedToUser.length,
      expiringSoon
    };
  }
}

// Export singleton instance
export const approvalDelegationService = new ApprovalDelegationService();
