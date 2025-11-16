/**
 * Stage 10: Role-Based Approver Service
 * Manages role-based approval logic and permissions
 */

import { supabase } from '@/infrastructure/supabaseClient';
import type { Approver, ApprovalCondition } from './types';

export class RoleBasedApprover {
  /**
   * Get approvers for specific role
   */
  async getApproversForRole(
    role: string,
    tokenId: string
  ): Promise<Approver[]> {
    // 1. Get users with the specified role
    const { data: roleAssignments, error: roleError } = await supabase
      .from('user_organization_roles')
      .select(`
        user_id,
        role_id,
        organization_id,
        roles:role_id (
          id,
          name,
          permissions
        )
      `)
      .eq('roles.name', role);

    if (roleError || !roleAssignments) {
      return [];
    }

    // 2. Filter users with redemption approval permissions
    const approvers: Approver[] = [];

    for (const assignment of roleAssignments) {
      const hasPermission = await this.checkApprovalPermission(
        assignment.user_id,
        'approve_redemption',
        tokenId
      );

      if (hasPermission) {
        approvers.push({
          id: assignment.user_id,
          userId: assignment.user_id,
          role: assignment.roles?.name || role,
          weight: this.getRoleWeight(assignment.roles?.name || role),
          required: this.isRoleRequired(assignment.roles?.name || role),
          alternates: await this.getAlternates(assignment.user_id)
        });
      }
    }

    return approvers;
  }

  /**
   * Check if user has approval permission for token
   */
  private async checkApprovalPermission(
    userId: string,
    permission: string,
    tokenId: string
  ): Promise<boolean> {
    // Check user's role permissions
    const { data: roleData } = await supabase
      .from('user_organization_roles')
      .select(`
        roles:role_id (
          permissions
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!roleData?.roles?.permissions) {
      return false;
    }

    const permissions = roleData.roles.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  }

  /**
   * Get role weight for weighted approvals
   */
  private getRoleWeight(role: string): number {
    const weights: Record<string, number> = {
      'admin': 3,
      'operations_manager': 2,
      'operations_team': 1,
      'compliance_officer': 2,
      'finance_manager': 2,
      'viewer': 0
    };

    return weights[role] || 1;
  }

  /**
   * Check if role is required for approval
   */
  private isRoleRequired(role: string): boolean {
    const requiredRoles = ['admin', 'operations_manager', 'compliance_officer'];
    return requiredRoles.includes(role);
  }

  /**
   * Get alternate approvers for user
   */
  private async getAlternates(userId: string): Promise<string[]> {
    // Get delegation records where this user is the delegator
    const { data: delegations } = await supabase
      .from('approval_delegations')
      .select('delegate_id')
      .eq('delegator_id', userId)
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString());

    return delegations?.map(d => d.delegate_id) || [];
  }

  /**
   * Check role hierarchy
   */
  async checkRoleHierarchy(
    approverRole: string,
    requiredRole: string
  ): Promise<boolean> {
    const hierarchy: Record<string, number> = {
      'admin': 10,
      'operations_manager': 8,
      'compliance_officer': 7,
      'finance_manager': 7,
      'operations_team': 5,
      'viewer': 1
    };

    const approverLevel = hierarchy[approverRole] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;

    return approverLevel >= requiredLevel;
  }

  /**
   * Get approval conditions for user
   */
  private async getApprovalConditions(
    userId: string,
    tokenId: string
  ): Promise<ApprovalCondition[] | undefined> {
    // Get user-specific approval conditions
    const { data: conditions } = await supabase
      .from('user_approval_conditions')
      .select('*')
      .eq('user_id', userId);

    if (!conditions || conditions.length === 0) {
      return undefined;
    }

    return conditions.map(c => ({
      field: c.field,
      operator: c.operator,
      value: c.value
    }));
  }

  /**
   * Evaluate if user can approve based on conditions
   */
  async canApprove(
    userId: string,
    redemptionAmount: bigint,
    redemptionType: string
  ): Promise<{ canApprove: boolean; reason?: string }> {
    // Get user's role and conditions
    const { data: roleData } = await supabase
      .from('user_organization_roles')
      .select(`
        roles:role_id (
          name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!roleData?.roles) {
      return {
        canApprove: false,
        reason: 'User has no role assigned'
      };
    }

    // Check basic permission
    const permissions = roleData.roles.permissions;
    if (!Array.isArray(permissions) || !permissions.includes('approve_redemption')) {
      return {
        canApprove: false,
        reason: 'User lacks approval permission'
      };
    }

    // Check amount-based restrictions (example)
    const roleAmountLimits: Record<string, bigint> = {
      'operations_team': BigInt(10000),
      'operations_manager': BigInt(100000),
      'admin': BigInt(Number.MAX_SAFE_INTEGER)
    };

    const limit = roleAmountLimits[roleData.roles.name];
    if (limit && redemptionAmount > limit) {
      return {
        canApprove: false,
        reason: `Amount exceeds ${roleData.roles.name} limit of ${limit.toString()}`
      };
    }

    return { canApprove: true };
  }

  /**
   * Check if user can escalate approvals
   */
  async canEscalate(userId: string): Promise<boolean> {
    const { data: roleData } = await supabase
      .from('user_organization_roles')
      .select(`
        roles:role_id (
          name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!roleData?.roles) {
      return false;
    }

    // Users with admin or operations_manager roles can escalate
    const escalationRoles = ['admin', 'operations_manager', 'compliance_officer'];
    return escalationRoles.includes(roleData.roles.name);
  }

  /**
   * Get escalation chain for a role
   */
  async getEscalationChain(role: string): Promise<string[]> {
    // Define escalation paths based on role hierarchy
    const escalationPaths: Record<string, string[]> = {
      'operations_team': ['operations_manager', 'admin'],
      'operations_manager': ['admin'],
      'compliance_officer': ['admin'],
      'finance_manager': ['admin'],
      'viewer': ['operations_team', 'operations_manager', 'admin']
    };

    return escalationPaths[role] || ['admin'];
  }

  /**
   * Get approvers by multiple roles
   */
  async getApproversByRoles(
    roles: string[],
    projectId?: string
  ): Promise<Approver[]> {
    const approvers: Approver[] = [];

    // Get approvers for each role
    for (const role of roles) {
      const roleApprovers = await this.getApproversForRole(role, projectId || '');
      approvers.push(...roleApprovers);
    }

    // Remove duplicates by user ID
    const uniqueApprovers = approvers.filter(
      (approver, index, self) =>
        index === self.findIndex((a) => a.userId === approver.userId)
    );

    return uniqueApprovers;
  }
}


// Export singleton instance
export const roleBasedApprover = new RoleBasedApprover();
