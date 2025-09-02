/**
 * Bulk Organization Assignment Service
 * Service for bulk operations on user organization assignments
 */

import { supabase } from '@/infrastructure/database/client';
import type { OrganizationAssignmentRequest } from './types';

export interface BulkAssignmentRequest {
  userIds: string[];
  roleId: string;
  mode: 'all' | 'multiple' | 'single';
  organizationIds: string[];
  changeReason?: string;
}

export interface BulkAssignmentResult {
  success: boolean;
  processedUsers: number;
  failedUsers: { userId: string; error: string }[];
  summary: {
    totalUsers: number;
    successfulAssignments: number;
    failedAssignments: number;
    organizationsAssigned: number;
  };
}

export interface UserBulkAssignmentData {
  userId: string;
  userName: string;
  userEmail: string;
  currentAssignments: {
    roleId: string;
    roleName: string;
    organizationIds: string[];
    organizationNames: string[];
  }[];
  newAssignments?: {
    roleId: string;
    organizationIds: string[];
    mode: 'all' | 'multiple' | 'single';
  };
}

export class BulkOrganizationAssignmentService {
  /**
   * Assign multiple users to organizations in bulk
   */
  static async bulkAssignUsersToOrganizations(request: BulkAssignmentRequest): Promise<BulkAssignmentResult> {
    const result: BulkAssignmentResult = {
      success: true,
      processedUsers: 0,
      failedUsers: [],
      summary: {
        totalUsers: request.userIds.length,
        successfulAssignments: 0,
        failedAssignments: 0,
        organizationsAssigned: request.mode === 'all' ? 0 : request.organizationIds.length
      }
    };

    try {
      // Get all organizations if mode is 'all'
      let organizationIds = request.organizationIds;
      if (request.mode === 'all') {
        const { data: allOrgs, error } = await supabase
          .from('organizations')
          .select('id');
        
        if (error) {
          throw new Error(`Failed to fetch organizations: ${error.message}`);
        }
        
        organizationIds = (allOrgs || []).map(org => org.id);
        result.summary.organizationsAssigned = organizationIds.length;
      }

      // Process each user
      for (const userId of request.userIds) {
        try {
          // Remove existing assignments for this role
          const { error: deleteError } = await supabase
            .from('user_organization_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role_id', request.roleId)
            .not('organization_id', 'is', null);

          if (deleteError) {
            throw new Error(`Failed to remove existing assignments: ${deleteError.message}`);
          }

          // Create new assignments
          if (organizationIds.length > 0) {
            const assignments = organizationIds.map(orgId => ({
              user_id: userId,
              role_id: request.roleId,
              organization_id: orgId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
              .from('user_organization_roles')
              .insert(assignments);

            if (insertError) {
              throw new Error(`Failed to create assignments: ${insertError.message}`);
            }
          }

          result.processedUsers++;
          result.summary.successfulAssignments++;
        } catch (error) {
          result.failedUsers.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.summary.failedAssignments++;
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      console.error('Error in bulkAssignUsersToOrganizations:', error);
      result.success = false;
      result.failedUsers = request.userIds.map(userId => ({
        userId,
        error: error instanceof Error ? error.message : 'Bulk operation failed'
      }));
      result.summary.failedAssignments = request.userIds.length;
      return result;
    }
  }

  /**
   * Remove multiple users from organizations in bulk
   */
  static async bulkRemoveUsersFromOrganizations(userIds: string[], roleId: string, organizationIds?: string[]): Promise<BulkAssignmentResult> {
    const result: BulkAssignmentResult = {
      success: true,
      processedUsers: 0,
      failedUsers: [],
      summary: {
        totalUsers: userIds.length,
        successfulAssignments: 0,
        failedAssignments: 0,
        organizationsAssigned: organizationIds?.length || 0
      }
    };

    try {
      for (const userId of userIds) {
        try {
          let query = supabase
            .from('user_organization_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role_id', roleId);

          // If specific organizations provided, only remove those
          if (organizationIds && organizationIds.length > 0) {
            query = query.in('organization_id', organizationIds);
          } else {
            // Remove all organization assignments for this role
            query = query.not('organization_id', 'is', null);
          }

          const { error } = await query;

          if (error) {
            throw new Error(`Failed to remove assignments: ${error.message}`);
          }

          result.processedUsers++;
          result.summary.successfulAssignments++;
        } catch (error) {
          result.failedUsers.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.summary.failedAssignments++;
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      console.error('Error in bulkRemoveUsersFromOrganizations:', error);
      result.success = false;
      result.failedUsers = userIds.map(userId => ({
        userId,
        error: error instanceof Error ? error.message : 'Bulk operation failed'
      }));
      result.summary.failedAssignments = userIds.length;
      return result;
    }
  }

  /**
   * Get users with their current organization assignments for bulk operations
   * Enhanced to include users with global roles (from user_roles) and organization-specific roles
   */
  static async getUsersForBulkAssignment(roleId?: string): Promise<UserBulkAssignmentData[]> {
    try {
      let users;
      
      if (roleId) {
        // Get users who have the specified role from BOTH user_roles (global) AND user_organization_roles (organization-specific)
        // Use a more comprehensive query that includes users with global roles who may not have organization assignments
        
        // First get users from global roles table
        const { data: globalRoleUsers, error: globalError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            users!inner(id, name, email)
          `)
          .eq('role_id', roleId);

        if (globalError) {
          throw new Error(`Failed to fetch users with global role: ${globalError.message}`);
        }

        // Then get users from organization roles table  
        const { data: orgRoleUsers, error: orgError } = await supabase
          .from('user_organization_roles')
          .select(`
            user_id,
            users!inner(id, name, email)
          `)
          .eq('role_id', roleId);

        if (orgError) {
          throw new Error(`Failed to fetch users with organization role: ${orgError.message}`);
        }

        // Combine and deduplicate users from both sources
        const uniqueUsers = new Map();
        
        // Add users from global roles
        (globalRoleUsers || []).forEach(item => {
          const user = item.users;
          if (user && !uniqueUsers.has(user.id)) {
            uniqueUsers.set(user.id, {
              id: user.id,
              name: user.name,
              email: user.email
            });
          }
        });
        
        // Add users from organization roles (if not already added)
        (orgRoleUsers || []).forEach(item => {
          const user = item.users;
          if (user && !uniqueUsers.has(user.id)) {
            uniqueUsers.set(user.id, {
              id: user.id,
              name: user.name,
              email: user.email
            });
          }
        });
        
        users = Array.from(uniqueUsers.values());
      } else {
        // Get all users if no role filter
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name');

        if (usersError) {
          throw new Error(`Failed to fetch users: ${usersError.message}`);
        }
        
        users = allUsers || [];
      }

      // Get current assignments for all users
      let assignmentsQuery = supabase
        .from('user_organization_roles')
        .select(`
          user_id,
          role_id,
          organization_id,
          roles!inner(name),
          organizations(name)
        `)
        .not('organization_id', 'is', null);

      if (roleId) {
        assignmentsQuery = assignmentsQuery.eq('role_id', roleId);
      }

      const { data: assignments, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) {
        throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
      }

      // Group assignments by user and role
      const userAssignmentMap = new Map<string, Map<string, {
        roleId: string;
        roleName: string;
        organizationIds: string[];
        organizationNames: string[];
      }>>();

      (assignments || []).forEach(assignment => {
        const userId = assignment.user_id;
        const roleId = assignment.role_id;
        
        if (!userAssignmentMap.has(userId)) {
          userAssignmentMap.set(userId, new Map());
        }
        
        const userAssignments = userAssignmentMap.get(userId)!;
        
        if (!userAssignments.has(roleId)) {
          userAssignments.set(roleId, {
            roleId,
            roleName: assignment.roles?.name || 'Unknown Role',
            organizationIds: [],
            organizationNames: []
          });
        }
        
        const roleAssignment = userAssignments.get(roleId)!;
        if (assignment.organization_id) {
          roleAssignment.organizationIds.push(assignment.organization_id);
          roleAssignment.organizationNames.push(assignment.organizations?.name || 'Unknown Organization');
        }
      });

      // Build result
      return users.map(user => ({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        currentAssignments: Array.from(userAssignmentMap.get(user.id)?.values() || [])
      }));
    } catch (error) {
      console.error('Error in getUsersForBulkAssignment:', error);
      throw error;
    }
  }

  /**
   * Preview bulk assignment changes
   */
  static async previewBulkAssignment(request: BulkAssignmentRequest): Promise<{
    users: UserBulkAssignmentData[];
    changes: {
      usersToModify: number;
      organizationsToAssign: number;
      totalAssignmentsToCreate: number;
      totalAssignmentsToRemove: number;
    };
  }> {
    try {
      // Get current state
      const users = await this.getUsersForBulkAssignment(request.roleId);
      const requestedUsers = users.filter(user => request.userIds.includes(user.userId));

      // Calculate changes
      let organizationsToAssign = request.organizationIds.length;
      if (request.mode === 'all') {
        const { data: allOrgs } = await supabase
          .from('organizations')
          .select('id');
        organizationsToAssign = (allOrgs || []).length;
      }

      const totalAssignmentsToCreate = request.userIds.length * organizationsToAssign;
      
      // Count existing assignments that will be removed
      const existingAssignments = requestedUsers.reduce((total, user) => {
        const roleAssignment = user.currentAssignments.find(a => a.roleId === request.roleId);
        return total + (roleAssignment?.organizationIds.length || 0);
      }, 0);

      // Add preview data to users
      const usersWithPreview = requestedUsers.map(user => ({
        ...user,
        newAssignments: {
          roleId: request.roleId,
          organizationIds: request.mode === 'all' ? [] : request.organizationIds,
          mode: request.mode
        }
      }));

      return {
        users: usersWithPreview,
        changes: {
          usersToModify: request.userIds.length,
          organizationsToAssign,
          totalAssignmentsToCreate,
          totalAssignmentsToRemove: existingAssignments
        }
      };
    } catch (error) {
      console.error('Error in previewBulkAssignment:', error);
      throw error;
    }
  }

  /**
   * Copy assignments from one user to multiple users
   */
  static async copyUserAssignments(sourceUserId: string, targetUserIds: string[], roleId: string): Promise<BulkAssignmentResult> {
    try {
      // Get source user's assignments
      const { data: sourceAssignments, error } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', sourceUserId)
        .eq('role_id', roleId)
        .not('organization_id', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch source assignments: ${error.message}`);
      }

      const organizationIds = (sourceAssignments || [])
        .map(assignment => assignment.organization_id)
        .filter((id): id is string => Boolean(id));

      // Apply assignments to target users
      return await this.bulkAssignUsersToOrganizations({
        userIds: targetUserIds,
        roleId,
        mode: 'multiple',
        organizationIds,
        changeReason: `Copied assignments from user ${sourceUserId}`
      });
    } catch (error) {
      console.error('Error in copyUserAssignments:', error);
      throw error;
    }
  }

  /**
   * Bulk update organization assignments based on CSV data
   */
  static async bulkUpdateFromCSV(csvData: {
    userId: string;
    roleId: string;
    organizationIds: string[];
  }[]): Promise<BulkAssignmentResult> {
    const result: BulkAssignmentResult = {
      success: true,
      processedUsers: 0,
      failedUsers: [],
      summary: {
        totalUsers: csvData.length,
        successfulAssignments: 0,
        failedAssignments: 0,
        organizationsAssigned: 0
      }
    };

    try {
      for (const row of csvData) {
        try {
          // Validate input
          if (!row.userId || !row.roleId) {
            throw new Error('Missing required fields: userId or roleId');
          }

          // Remove existing assignments
          const { error: deleteError } = await supabase
            .from('user_organization_roles')
            .delete()
            .eq('user_id', row.userId)
            .eq('role_id', row.roleId)
            .not('organization_id', 'is', null);

          if (deleteError) {
            throw new Error(`Failed to remove existing assignments: ${deleteError.message}`);
          }

          // Create new assignments
          if (row.organizationIds && row.organizationIds.length > 0) {
            const assignments = row.organizationIds.map(orgId => ({
              user_id: row.userId,
              role_id: row.roleId,
              organization_id: orgId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
              .from('user_organization_roles')
              .insert(assignments);

            if (insertError) {
              throw new Error(`Failed to create assignments: ${insertError.message}`);
            }

            result.summary.organizationsAssigned += row.organizationIds.length;
          }

          result.processedUsers++;
          result.summary.successfulAssignments++;
        } catch (error) {
          result.failedUsers.push({
            userId: row.userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.summary.failedAssignments++;
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      console.error('Error in bulkUpdateFromCSV:', error);
      result.success = false;
      return result;
    }
  }
}

export default BulkOrganizationAssignmentService;
