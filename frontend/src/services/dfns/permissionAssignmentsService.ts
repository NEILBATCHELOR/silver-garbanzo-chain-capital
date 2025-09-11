/**
 * DFNS Permission Assignments Service
 * 
 * Implements current DFNS Permission Assignments API endpoints:
 * - POST /permissions/{permissionId}/assignments - Assign permission
 * - DELETE /permissions/assignments/{assignmentId} - Revoke permission assignment
 * - GET /permissions/assignments - List permission assignments
 * - GET /permissions/{permissionId}/assignments - List assignments for permission
 * 
 * Uses Service Account Token or PAT authentication only
 * Follows current DFNS API patterns and User Action Signing requirements
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsAssignPermissionRequest,
  DfnsCreatePermissionAssignmentRequest,
  DfnsAssignPermissionResponse,
  DfnsRevokePermissionAssignmentResponse,
  DfnsListPermissionAssignmentsRequest,
  DfnsListPermissionAssignmentsResponse,
  DfnsListPermissionAssignmentsForPermissionRequest,
  DfnsListPermissionAssignmentsForPermissionResponse,
  DfnsPermissionAssignmentResponse
} from '../../types/dfns/permissions';
import { DfnsError } from '../../types/dfns/errors';

/**
 * Service for managing DFNS permission assignments
 */
export class DfnsPermissionAssignmentsService {
  constructor(private client: WorkingDfnsClient) {}

  // ==============================================
  // PERMISSION ASSIGNMENT API
  // ==============================================

  /**
   * Assign permission to user, service account, or application
   * POST /permissions/{permissionId}/assignments
   * 
   * Requires User Action Signing for security
   * 
   * @param permissionId - DFNS permission ID
   * @param request - Assignment request
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Created assignment
   */
  async assignPermission(
    permissionId: string,
    request: DfnsAssignPermissionRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsAssignPermissionResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Assigning permission without User Action token - this will likely fail with 403');
      }

      console.log(`🔗 Assigning permission ${permissionId} to ${request.identityKind} ${request.identityId}`);
      
      const response = await this.client.makeRequest<DfnsAssignPermissionResponse>(
        'POST',
        `/permissions/${permissionId}/assignments`,
        {
          identityId: request.identityId,
          identityKind: request.identityKind
        },
        userActionToken
      );

      console.log(`✅ Assigned permission: ${response.id}`);

      // Sync to local database if requested
      if (options.syncToDatabase) {
        await this.syncAssignmentToDatabase(response);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to assign permission ${permissionId}:`, error);
      
      if (error instanceof DfnsError && error.message.includes('403')) {
        throw new DfnsError(
          `Permission assignment requires User Action Signing. ${userActionToken ? 'Token may be invalid or insufficient permissions.' : 'No User Action token provided.'}`,
          'PERMISSION_ASSIGN_UNAUTHORIZED',
          { 
            permissionId,
            identityId: request.identityId,
            identityKind: request.identityKind,
            requiredPermission: 'PermissionAssignments:Create',
            hasUserAction: !!userActionToken
          }
        );
      }
      
      throw new DfnsError(
        `Failed to assign permission ${permissionId} to ${request.identityKind} ${request.identityId}: ${error}`,
        'PERMISSION_ASSIGN_FAILED',
        { permissionId, identityId: request.identityId, identityKind: request.identityKind }
      );
    }
  }

  /**
   * Create permission assignment (alias for assignPermission)
   * 
   * @param permissionId - DFNS permission ID
   * @param request - Assignment request
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Created assignment
   */
  async createPermissionAssignment(
    permissionId: string,
    request: DfnsCreatePermissionAssignmentRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsAssignPermissionResponse> {
    return this.assignPermission(permissionId, request, userActionToken, options);
  }

  /**
   * Revoke permission assignment
   * DELETE /permissions/assignments/{assignmentId}
   * 
   * Requires User Action Signing for security
   * 
   * @param assignmentId - DFNS assignment ID
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Revoked assignment
   */
  async revokePermissionAssignment(
    assignmentId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsRevokePermissionAssignmentResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Revoking permission assignment without User Action token - this will likely fail with 403');
      }

      console.log(`🔓 Revoking permission assignment: ${assignmentId}`);
      
      const response = await this.client.makeRequest<DfnsRevokePermissionAssignmentResponse>(
        'DELETE',
        `/permissions/assignments/${assignmentId}`,
        undefined,
        userActionToken
      );

      console.log(`✅ Revoked permission assignment: ${response.id}`);

      // Sync to local database if requested
      if (options.syncToDatabase) {
        await this.syncAssignmentToDatabase(response);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to revoke permission assignment ${assignmentId}:`, error);
      
      if (error instanceof DfnsError && error.message.includes('403')) {
        throw new DfnsError(
          `Permission assignment revocation requires User Action Signing. ${userActionToken ? 'Token may be invalid or insufficient permissions.' : 'No User Action token provided.'}`,
          'PERMISSION_REVOKE_UNAUTHORIZED',
          { 
            assignmentId,
            requiredPermission: 'PermissionAssignments:Revoke',
            hasUserAction: !!userActionToken
          }
        );
      }
      
      throw new DfnsError(
        `Failed to revoke permission assignment ${assignmentId}: ${error}`,
        'PERMISSION_REVOKE_FAILED',
        { assignmentId }
      );
    }
  }

  /**
   * List all permission assignments
   * GET /permissions/assignments
   * 
   * @param request - Optional filtering and pagination parameters
   * @returns List of permission assignments
   */
  async listPermissionAssignments(
    request: DfnsListPermissionAssignmentsRequest = {}
  ): Promise<DfnsListPermissionAssignmentsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }
      
      if (request.permissionId) {
        queryParams.append('permissionId', request.permissionId);
      }
      
      if (request.identityId) {
        queryParams.append('identityId', request.identityId);
      }
      
      if (request.identityKind) {
        queryParams.append('identityKind', request.identityKind);
      }

      const endpoint = `/permissions/assignments${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      console.log('📋 Listing permission assignments...');
      const response = await this.client.makeRequest<DfnsListPermissionAssignmentsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} permission assignments`);
      return response;
    } catch (error) {
      console.error('❌ Failed to list permission assignments:', error);
      throw new DfnsError(
        `Failed to list permission assignments: ${error}`,
        'PERMISSION_ASSIGNMENTS_LIST_FAILED'
      );
    }
  }

  /**
   * List assignments for a specific permission
   * GET /permissions/{permissionId}/assignments
   * 
   * @param permissionId - DFNS permission ID
   * @param request - Optional pagination parameters
   * @returns List of assignments for the permission
   */
  async listAssignmentsForPermission(
    permissionId: string,
    request: DfnsListPermissionAssignmentsForPermissionRequest = {}
  ): Promise<DfnsListPermissionAssignmentsForPermissionResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }

      const endpoint = `/permissions/${permissionId}/assignments${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      console.log(`📋 Listing assignments for permission: ${permissionId}`);
      const response = await this.client.makeRequest<DfnsListPermissionAssignmentsForPermissionResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} assignments for permission ${permissionId}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to list assignments for permission ${permissionId}:`, error);
      throw new DfnsError(
        `Failed to list assignments for permission ${permissionId}: ${error}`,
        'PERMISSION_ASSIGNMENTS_FOR_PERMISSION_FAILED',
        { permissionId }
      );
    }
  }

  // ==============================================
  // CONVENIENCE METHODS
  // ==============================================

  /**
   * Get assignments for a specific user
   * 
   * @param userId - User ID
   * @returns Assignments for the user
   */
  async getAssignmentsForUser(userId: string): Promise<DfnsPermissionAssignmentResponse[]> {
    try {
      const response = await this.listPermissionAssignments({
        identityId: userId,
        identityKind: 'User'
      });
      
      return response.items.filter(assignment => assignment.status === 'Active');
    } catch (error) {
      console.error(`❌ Failed to get assignments for user ${userId}:`, error);
      throw new DfnsError(
        `Failed to get assignments for user ${userId}: ${error}`,
        'USER_ASSIGNMENTS_FAILED',
        { userId }
      );
    }
  }

  /**
   * Get assignments for a specific service account
   * 
   * @param serviceAccountId - Service Account ID
   * @returns Assignments for the service account
   */
  async getAssignmentsForServiceAccount(serviceAccountId: string): Promise<DfnsPermissionAssignmentResponse[]> {
    try {
      const response = await this.listPermissionAssignments({
        identityId: serviceAccountId,
        identityKind: 'ServiceAccount'
      });
      
      return response.items.filter(assignment => assignment.status === 'Active');
    } catch (error) {
      console.error(`❌ Failed to get assignments for service account ${serviceAccountId}:`, error);
      throw new DfnsError(
        `Failed to get assignments for service account ${serviceAccountId}: ${error}`,
        'SERVICE_ACCOUNT_ASSIGNMENTS_FAILED',
        { serviceAccountId }
      );
    }
  }

  /**
   * Get assignments for a specific Personal Access Token
   * 
   * @param patId - Personal Access Token ID
   * @returns Assignments for the PAT
   */
  async getAssignmentsForPersonalAccessToken(patId: string): Promise<DfnsPermissionAssignmentResponse[]> {
    try {
      const response = await this.listPermissionAssignments({
        identityId: patId,
        identityKind: 'PersonalAccessToken'
      });
      
      return response.items.filter(assignment => assignment.status === 'Active');
    } catch (error) {
      console.error(`❌ Failed to get assignments for PAT ${patId}:`, error);
      throw new DfnsError(
        `Failed to get assignments for PAT ${patId}: ${error}`,
        'PAT_ASSIGNMENTS_FAILED',
        { patId }
      );
    }
  }

  /**
   * Check if an identity has a specific permission
   * 
   * @param identityId - Identity ID (user, service account, or PAT)
   * @param identityKind - Type of identity
   * @param permissionId - Permission ID to check
   * @returns Whether the identity has the permission
   */
  async hasPermission(
    identityId: string,
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken',
    permissionId: string
  ): Promise<boolean> {
    try {
      const assignments = await this.listPermissionAssignments({
        identityId,
        identityKind,
        permissionId
      });
      
      return assignments.items.some(assignment => 
        assignment.status === 'Active' && assignment.permissionId === permissionId
      );
    } catch (error) {
      console.error(`❌ Failed to check permission for ${identityKind} ${identityId}:`, error);
      return false; // Fail closed - deny access if we can't verify
    }
  }

  /**
   * Bulk assign permissions to multiple identities
   * 
   * @param permissionId - Permission ID to assign
   * @param assignments - List of identities to assign to
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Results of all assignments
   */
  async bulkAssignPermission(
    permissionId: string,
    assignments: Array<{ identityId: string; identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken' }>,
    userActionToken?: string,
    options: { syncToDatabase?: boolean; continueOnError?: boolean } = {}
  ): Promise<{
    successful: DfnsAssignPermissionResponse[];
    failed: Array<{ identityId: string; identityKind: string; error: string }>;
  }> {
    const results = {
      successful: [] as DfnsAssignPermissionResponse[],
      failed: [] as Array<{ identityId: string; identityKind: string; error: string }>
    };

    console.log(`🔗 Bulk assigning permission ${permissionId} to ${assignments.length} identities...`);

    for (const assignment of assignments) {
      try {
        const result = await this.assignPermission(
          permissionId,
          { ...assignment, permissionId },
          userActionToken,
          options
        );
        results.successful.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          identityId: assignment.identityId,
          identityKind: assignment.identityKind,
          error: errorMessage
        });

        if (!options.continueOnError) {
          console.error(`❌ Bulk assignment stopped at ${assignment.identityId} due to error:`, error);
          break;
        }
      }
    }

    console.log(`✅ Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Bulk revoke permission assignments
   * 
   * @param assignmentIds - Assignment IDs to revoke
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Results of all revocations
   */
  async bulkRevokePermissionAssignments(
    assignmentIds: string[],
    userActionToken?: string,
    options: { syncToDatabase?: boolean; continueOnError?: boolean } = {}
  ): Promise<{
    successful: DfnsRevokePermissionAssignmentResponse[];
    failed: Array<{ assignmentId: string; error: string }>;
  }> {
    const results = {
      successful: [] as DfnsRevokePermissionAssignmentResponse[],
      failed: [] as Array<{ assignmentId: string; error: string }>
    };

    console.log(`🔓 Bulk revoking ${assignmentIds.length} permission assignments...`);

    for (const assignmentId of assignmentIds) {
      try {
        const result = await this.revokePermissionAssignment(
          assignmentId,
          userActionToken,
          options
        );
        results.successful.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({
          assignmentId,
          error: errorMessage
        });

        if (!options.continueOnError) {
          console.error(`❌ Bulk revocation stopped at ${assignmentId} due to error:`, error);
          break;
        }
      }
    }

    console.log(`✅ Bulk revocation completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Get assignment statistics for dashboard
   * 
   * @returns Assignment statistics
   */
  async getAssignmentStatistics(): Promise<{
    total: number;
    active: number;
    revoked: number;
    byIdentityKind: Record<string, number>;
    byPermission: Array<{ permissionId: string; count: number }>;
    recentActivity: Array<{
      assignmentId: string;
      action: 'assigned' | 'revoked';
      date: string;
      identityKind: string;
    }>;
  }> {
    try {
      const response = await this.listPermissionAssignments();
      const assignments = response.items;

      const stats = {
        total: assignments.length,
        active: assignments.filter(a => a.status === 'Active').length,
        revoked: assignments.filter(a => a.status === 'Revoked').length,
        byIdentityKind: {} as Record<string, number>,
        byPermission: [] as Array<{ permissionId: string; count: number }>,
        recentActivity: [] as Array<{
          assignmentId: string;
          action: 'assigned' | 'revoked';
          date: string;
          identityKind: string;
        }>
      };

      // Count by identity kind
      assignments.forEach(assignment => {
        const kind = assignment.identityKind;
        stats.byIdentityKind[kind] = (stats.byIdentityKind[kind] || 0) + 1;
      });

      // Count by permission
      const permissionCounts: Record<string, number> = {};
      assignments
        .filter(a => a.status === 'Active')
        .forEach(assignment => {
          const permissionId = assignment.permissionId;
          permissionCounts[permissionId] = (permissionCounts[permissionId] || 0) + 1;
        });

      stats.byPermission = Object.entries(permissionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([permissionId, count]) => ({ permissionId, count }));

      // Recent activity (last 50 assignments)
      stats.recentActivity = assignments
        .sort((a, b) => new Date(b.dateAssigned).getTime() - new Date(a.dateAssigned).getTime())
        .slice(0, 50)
        .map(assignment => ({
          assignmentId: assignment.id,
          action: assignment.status === 'Revoked' ? 'revoked' as const : 'assigned' as const,
          date: assignment.status === 'Revoked' 
            ? assignment.dateRevoked || assignment.dateAssigned 
            : assignment.dateAssigned,
          identityKind: assignment.identityKind
        }));

      return stats;
    } catch (error) {
      console.error('❌ Failed to get assignment statistics:', error);
      throw new DfnsError(
        `Failed to get assignment statistics: ${error}`,
        'ASSIGNMENT_STATISTICS_FAILED'
      );
    }
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync assignment to local database
   * 
   * @param assignment - Assignment to sync
   */
  private async syncAssignmentToDatabase(assignment: DfnsPermissionAssignmentResponse | DfnsRevokePermissionAssignmentResponse): Promise<void> {
    try {
      // Note: This would typically use a database service
      // For now, we'll just log the sync operation
      console.log(`🔄 Would sync assignment to database: ${assignment.id}`);
      
      // TODO: Implement actual database sync using your database service
      // await databaseService.syncPermissionAssignment(assignment);
    } catch (error) {
      console.error(`⚠️ Failed to sync assignment ${assignment.id} to database:`, error);
      // Don't throw - database sync failure shouldn't break the API operation
    }
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

let globalPermissionAssignmentsService: DfnsPermissionAssignmentsService | null = null;

/**
 * Get or create the global DFNS permission assignments service instance
 * 
 * @param client - Working DFNS client (optional, uses global if not provided)
 * @returns DfnsPermissionAssignmentsService instance
 */
export function getDfnsPermissionAssignmentsService(client?: WorkingDfnsClient): DfnsPermissionAssignmentsService {
  if (!globalPermissionAssignmentsService && client) {
    globalPermissionAssignmentsService = new DfnsPermissionAssignmentsService(client);
  }
  
  if (!globalPermissionAssignmentsService) {
    throw new DfnsError(
      'DfnsPermissionAssignmentsService not initialized. Call with WorkingDfnsClient first.',
      'SERVICE_NOT_INITIALIZED'
    );
  }
  
  return globalPermissionAssignmentsService;
}

/**
 * Reset the global permission assignments service instance
 */
export function resetDfnsPermissionAssignmentsService(): void {
  globalPermissionAssignmentsService = null;
}
