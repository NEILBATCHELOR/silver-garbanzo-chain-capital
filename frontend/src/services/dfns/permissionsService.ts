/**
 * DFNS Permissions Service
 * 
 * Implements current DFNS Permissions API endpoints:
 * - GET /permissions - List permissions
 * - GET /permissions/{permissionId} - Get permission by ID
 * - POST /permissions - Create permission
 * - PUT /permissions/{permissionId} - Update permission
 * - DELETE /permissions/{permissionId} - Archive permission
 * 
 * Uses Service Account Token or PAT authentication only
 * Follows current DFNS API patterns and User Action Signing requirements
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsPermission,
  DfnsPermissionResponse,
  DfnsListPermissionsRequest,
  DfnsListPermissionsResponse,
  DfnsGetPermissionResponse,
  DfnsCreatePermissionRequest,
  DfnsCreatePermissionResponse,
  DfnsUpdatePermissionRequest,
  DfnsUpdatePermissionResponse,
  DfnsArchivePermissionResponse,
  DfnsPermissionOperation
} from '../../types/dfns/permissions';
import { DfnsError } from '../../types/dfns/errors';

/**
 * Service for managing DFNS permissions
 */
export class DfnsPermissionsService {
  constructor(private client: WorkingDfnsClient) {}

  // ==============================================
  // CORE PERMISSIONS API
  // ==============================================

  /**
   * List all permissions
   * GET /permissions
   * 
   * @param request - Optional pagination parameters
   * @returns List of permissions
   */
  async listPermissions(
    request: DfnsListPermissionsRequest = {}
  ): Promise<DfnsListPermissionsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }

      const endpoint = `/permissions${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      console.log('📋 Listing DFNS permissions...');
      const response = await this.client.makeRequest<DfnsListPermissionsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} permissions`);
      return response;
    } catch (error) {
      console.error('❌ Failed to list permissions:', error);
      throw new DfnsError(
        `Failed to list permissions: ${error}`,
        'PERMISSIONS_LIST_FAILED'
      );
    }
  }

  /**
   * Get permission by ID
   * GET /permissions/{permissionId}
   * 
   * @param permissionId - DFNS permission ID
   * @returns Permission details
   */
  async getPermission(permissionId: string): Promise<DfnsGetPermissionResponse> {
    try {
      console.log(`🔍 Getting permission: ${permissionId}`);
      
      const response = await this.client.makeRequest<DfnsGetPermissionResponse>(
        'GET',
        `/permissions/${permissionId}`
      );

      console.log(`✅ Retrieved permission: ${response.name}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to get permission ${permissionId}:`, error);
      throw new DfnsError(
        `Failed to get permission ${permissionId}: ${error}`,
        'PERMISSION_GET_FAILED',
        { permissionId }
      );
    }
  }

  /**
   * Create new permission
   * POST /permissions
   * 
   * Requires User Action Signing for security
   * 
   * @param request - Permission creation request
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Created permission
   */
  async createPermission(
    request: DfnsCreatePermissionRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsCreatePermissionResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Creating permission without User Action token - this will likely fail with 403');
      }

      console.log(`🆕 Creating permission: ${request.name} with ${request.operations.length} operations`);
      
      const response = await this.client.makeRequest<DfnsCreatePermissionResponse>(
        'POST',
        '/permissions',
        request,
        userActionToken
      );

      console.log(`✅ Created permission: ${response.id} (${response.name})`);

      // Sync to local database if requested
      if (options.syncToDatabase) {
        await this.syncPermissionToDatabase(response);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to create permission ${request.name}:`, error);
      
      if (error instanceof DfnsError && error.message.includes('403')) {
        throw new DfnsError(
          `Permission creation requires User Action Signing. ${userActionToken ? 'Token may be invalid or insufficient permissions.' : 'No User Action token provided.'}`,
          'PERMISSION_CREATE_UNAUTHORIZED',
          { 
            permissionName: request.name,
            requiredPermission: 'Permissions:Create',
            hasUserAction: !!userActionToken
          }
        );
      }
      
      throw new DfnsError(
        `Failed to create permission ${request.name}: ${error}`,
        'PERMISSION_CREATE_FAILED',
        { permissionName: request.name }
      );
    }
  }

  /**
   * Update existing permission
   * PUT /permissions/{permissionId}
   * 
   * Requires User Action Signing for security
   * 
   * @param permissionId - DFNS permission ID
   * @param request - Permission update request
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Updated permission
   */
  async updatePermission(
    permissionId: string,
    request: DfnsUpdatePermissionRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsUpdatePermissionResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Updating permission without User Action token - this will likely fail with 403');
      }

      console.log(`📝 Updating permission: ${permissionId}`);
      
      const response = await this.client.makeRequest<DfnsUpdatePermissionResponse>(
        'PUT',
        `/permissions/${permissionId}`,
        request,
        userActionToken
      );

      console.log(`✅ Updated permission: ${response.id} (${response.name})`);

      // Sync to local database if requested
      if (options.syncToDatabase) {
        await this.syncPermissionToDatabase(response);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to update permission ${permissionId}:`, error);
      
      if (error instanceof DfnsError && error.message.includes('403')) {
        throw new DfnsError(
          `Permission update requires User Action Signing. ${userActionToken ? 'Token may be invalid or insufficient permissions.' : 'No User Action token provided.'}`,
          'PERMISSION_UPDATE_UNAUTHORIZED',
          { 
            permissionId,
            requiredPermission: 'Permissions:Update',
            hasUserAction: !!userActionToken
          }
        );
      }
      
      throw new DfnsError(
        `Failed to update permission ${permissionId}: ${error}`,
        'PERMISSION_UPDATE_FAILED',
        { permissionId }
      );
    }
  }

  /**
   * Archive permission (soft delete)
   * DELETE /permissions/{permissionId}
   * 
   * Requires User Action Signing for security
   * Note: This archives the permission but doesn't delete existing assignments
   * 
   * @param permissionId - DFNS permission ID
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Archived permission
   */
  async archivePermission(
    permissionId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsArchivePermissionResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Archiving permission without User Action token - this will likely fail with 403');
      }

      console.log(`🗄️ Archiving permission: ${permissionId}`);
      
      const response = await this.client.makeRequest<DfnsArchivePermissionResponse>(
        'DELETE',
        `/permissions/${permissionId}`,
        undefined,
        userActionToken
      );

      console.log(`✅ Archived permission: ${response.id} (${response.name})`);

      // Sync to local database if requested
      if (options.syncToDatabase) {
        await this.syncPermissionToDatabase(response);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to archive permission ${permissionId}:`, error);
      
      if (error instanceof DfnsError && error.message.includes('403')) {
        throw new DfnsError(
          `Permission archiving requires User Action Signing. ${userActionToken ? 'Token may be invalid or insufficient permissions.' : 'No User Action token provided.'}`,
          'PERMISSION_ARCHIVE_UNAUTHORIZED',
          { 
            permissionId,
            requiredPermission: 'Permissions:Archive',
            hasUserAction: !!userActionToken
          }
        );
      }
      
      throw new DfnsError(
        `Failed to archive permission ${permissionId}: ${error}`,
        'PERMISSION_ARCHIVE_FAILED',
        { permissionId }
      );
    }
  }

  // ==============================================
  // CONVENIENCE METHODS
  // ==============================================

  /**
   * Get all active permissions
   * 
   * @returns Active permissions only
   */
  async getActivePermissions(): Promise<DfnsPermissionResponse[]> {
    try {
      const response = await this.listPermissions();
      return response.items.filter(permission => permission.status === 'Active');
    } catch (error) {
      console.error('❌ Failed to get active permissions:', error);
      throw new DfnsError(
        `Failed to get active permissions: ${error}`,
        'ACTIVE_PERMISSIONS_FAILED'
      );
    }
  }

  /**
   * Find permissions by operation
   * 
   * @param operation - Permission operation to search for
   * @returns Permissions containing the operation
   */
  async findPermissionsByOperation(operation: DfnsPermissionOperation): Promise<DfnsPermissionResponse[]> {
    try {
      const response = await this.listPermissions();
      return response.items.filter(permission => 
        permission.operations.includes(operation)
      );
    } catch (error) {
      console.error(`❌ Failed to find permissions for operation ${operation}:`, error);
      throw new DfnsError(
        `Failed to find permissions for operation ${operation}: ${error}`,
        'FIND_PERMISSIONS_BY_OPERATION_FAILED'
      );
    }
  }

  /**
   * Find permission by name
   * 
   * @param name - Permission name to search for
   * @returns Permission with matching name or null
   */
  async findPermissionByName(name: string): Promise<DfnsPermissionResponse | null> {
    try {
      const response = await this.listPermissions();
      return response.items.find(permission => permission.name === name) || null;
    } catch (error) {
      console.error(`❌ Failed to find permission by name ${name}:`, error);
      throw new DfnsError(
        `Failed to find permission by name ${name}: ${error}`,
        'FIND_PERMISSION_BY_NAME_FAILED'
      );
    }
  }

  /**
   * Get permissions statistics for dashboard
   * 
   * @returns Permission statistics
   */
  async getPermissionStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    topOperations: Array<{ operation: string; count: number }>;
  }> {
    try {
      const response = await this.listPermissions();
      const permissions = response.items;

      const stats = {
        total: permissions.length,
        active: permissions.filter(p => p.status === 'Active').length,
        inactive: permissions.filter(p => p.status === 'Inactive').length,
        byCategory: {} as Record<string, number>,
        topOperations: [] as Array<{ operation: string; count: number }>
      };

      // Count by category
      permissions.forEach(permission => {
        const category = permission.category || 'Uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      // Count operations across all permissions
      const operationCounts: Record<string, number> = {};
      permissions.forEach(permission => {
        permission.operations.forEach(operation => {
          operationCounts[operation] = (operationCounts[operation] || 0) + 1;
        });
      });

      // Get top 10 operations
      stats.topOperations = Object.entries(operationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([operation, count]) => ({ operation, count }));

      return stats;
    } catch (error) {
      console.error('❌ Failed to get permission statistics:', error);
      throw new DfnsError(
        `Failed to get permission statistics: ${error}`,
        'PERMISSION_STATISTICS_FAILED'
      );
    }
  }

  /**
   * Validate permission operations
   * 
   * @param operations - Operations to validate
   * @returns Validation result
   */
  validatePermissionOperations(operations: string[]): {
    valid: boolean;
    invalidOperations: string[];
    validOperations: string[];
  } {
    const validOperationsSet = new Set([
      // Auth Operations
      'Auth:Users:Create', 'Auth:Users:Read', 'Auth:Users:Update', 'Auth:Users:Delete',
      'Auth:Users:Activate', 'Auth:Users:Deactivate', 'Auth:Users:Archive',
      'Auth:ServiceAccounts:Create', 'Auth:ServiceAccounts:Read', 'Auth:ServiceAccounts:Update',
      'Auth:ServiceAccounts:Delete', 'Auth:ServiceAccounts:Activate', 'Auth:ServiceAccounts:Deactivate',
      'Auth:ServiceAccounts:Archive', 'Auth:PersonalAccessTokens:Create', 'Auth:PersonalAccessTokens:Read',
      'Auth:PersonalAccessTokens:Update', 'Auth:PersonalAccessTokens:Delete', 'Auth:PersonalAccessTokens:Activate',
      'Auth:PersonalAccessTokens:Deactivate', 'Auth:PersonalAccessTokens:Archive',
      'Auth:Credentials:Create', 'Auth:Credentials:Read', 'Auth:Credentials:Update', 'Auth:Credentials:Delete',
      'Auth:Credentials:Activate', 'Auth:Credentials:Deactivate',
      // Wallet Operations
      'Wallets:Create', 'Wallets:Read', 'Wallets:Update', 'Wallets:Delete',
      'Wallets:Transactions:Create', 'Wallets:Transactions:Read', 'Wallets:Transfers:Create', 'Wallets:Transfers:Read',
      'Wallets:Assets:Read', 'Wallets:History:Read', 'Wallets:Nfts:Read',
      // Key Operations
      'Keys:Create', 'Keys:Read', 'Keys:Update', 'Keys:Delete', 'Keys:Signatures:Create', 'Keys:Signatures:Read',
      'Keys:Export', 'Keys:Import', 'Keys:Delegate',
      // Permission Operations
      'Permissions:Create', 'Permissions:Read', 'Permissions:Update', 'Permissions:Delete',
      'Permissions:Assign', 'Permissions:Revoke', 'Permissions:Assignments:Read',
      // Policy Operations
      'Policies:Create', 'Policies:Read', 'Policies:Update', 'Policies:Delete', 'Policies:Archive',
      'Policies:Approvals:Create', 'Policies:Approvals:Read', 'Policies:Approvals:Update',
      // Exchange Operations
      'Exchange:Read', 'Exchange:Trade', 'Exchange:Withdraw',
      // Fiat Operations
      'Fiat:OnRamp:Create', 'Fiat:OffRamp:Create', 'Fiat:Quotes:Read', 'Fiat:Transactions:Read',
      // Organization Operations
      'Organization:Read', 'Organization:Update'
    ]);

    const validOperations = operations.filter(op => validOperationsSet.has(op));
    const invalidOperations = operations.filter(op => !validOperationsSet.has(op));

    return {
      valid: invalidOperations.length === 0,
      validOperations,
      invalidOperations
    };
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync permission to local database
   * 
   * @param permission - Permission to sync
   */
  private async syncPermissionToDatabase(permission: DfnsPermissionResponse): Promise<void> {
    try {
      // Note: This would typically use a database service
      // For now, we'll just log the sync operation
      console.log(`🔄 Would sync permission to database: ${permission.id} (${permission.name})`);
      
      // TODO: Implement actual database sync using your database service
      // await databaseService.syncPermission(permission);
    } catch (error) {
      console.error(`⚠️ Failed to sync permission ${permission.id} to database:`, error);
      // Don't throw - database sync failure shouldn't break the API operation
    }
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

let globalPermissionsService: DfnsPermissionsService | null = null;

/**
 * Get or create the global DFNS permissions service instance
 * 
 * @param client - Working DFNS client (optional, uses global if not provided)
 * @returns DfnsPermissionsService instance
 */
export function getDfnsPermissionsService(client?: WorkingDfnsClient): DfnsPermissionsService {
  if (!globalPermissionsService && client) {
    globalPermissionsService = new DfnsPermissionsService(client);
  }
  
  if (!globalPermissionsService) {
    throw new DfnsError(
      'DfnsPermissionsService not initialized. Call with WorkingDfnsClient first.',
      'SERVICE_NOT_INITIALIZED'
    );
  }
  
  return globalPermissionsService;
}

/**
 * Reset the global permissions service instance
 */
export function resetDfnsPermissionsService(): void {
  globalPermissionsService = null;
}
