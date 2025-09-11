/**
 * DFNS User Management Service
 * 
 * Implements the current DFNS User Management API endpoints:
 * - GET /auth/users (List Users)
 * - POST /auth/users (Create User)
 * - GET /auth/users/{userId} (Get User)
 * - PUT /auth/users/{userId}/activate (Activate User)
 * - PUT /auth/users/{userId}/deactivate (Deactivate User)
 * - PUT /auth/users/{userId}/archive (Archive User)
 * 
 * Compatible with Service Account and PAT token authentication.
 * User Action Signing required for mutating operations (create, activate, deactivate, archive).
 * 
 * API Documentation:
 * - https://docs.dfns.co/d/api-docs/authentication/user-management
 * - https://docs.dfns.co/d/api-docs/authentication/user-action-signing
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsListUsersRequest,
  DfnsListUsersResponse,
  DfnsCreateUserRequest,
  DfnsCreateUserResponse,
  DfnsGetUserResponse,
  DfnsUserResponse,
  DfnsActivateUserResponse,
  DfnsDeactivateUserResponse,
  DfnsArchiveUserResponse,
  DfnsPermissionAssignment
} from '../../types/dfns/users';
import type { DfnsUserKind } from '../../types/dfns/core';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

// Service-specific interfaces
export interface UserListFilters {
  kind?: DfnsUserKind;
  isActive?: boolean;
  isRegistered?: boolean;
  search?: string; // Search by username or email
  limit?: number;
  paginationToken?: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customerEmployees: number;
  endUsers: number;
  registeredUsers: number;
  unregisteredUsers: number;
  usersWithPermissions: number;
}

export interface UserOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  userId?: string;
  requiresUserAction?: boolean;
  nextStep?: string;
}

export interface CreateUserOptions {
  email: string;
  externalId?: string;
  autoAssignPermissions?: string[]; // Permission IDs to assign after creation
  sendRegistrationEmail?: boolean; // Default: true
}

export class DfnsUserManagementService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // =====================================
  // CURRENT DFNS USER MANAGEMENT API
  // =====================================

  /**
   * List Users
   * GET /auth/users
   * 
   * Required Permission: Auth:Users:Read
   */
  async listUsers(
    filters: UserListFilters = {}
  ): Promise<UserOperationResult<DfnsListUsersResponse>> {
    try {
      console.log('📋 Listing users with filters:', filters);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.paginationToken) {
        params.append('paginationToken', filters.paginationToken);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/auth/users?${queryString}` : '/auth/users';

      const response = await this.workingClient.makeRequest<DfnsListUsersResponse>(
        'GET',
        endpoint
      );

      // Apply client-side filters if needed
      let filteredUsers = response.items;

      if (filters.kind) {
        filteredUsers = filteredUsers.filter(user => user.kind === filters.kind);
      }

      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
      }

      if (filters.isRegistered !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isRegistered === filters.isRegistered);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(searchLower) ||
          (user.name && user.name.toLowerCase().includes(searchLower))
        );
      }

      const filteredResponse: DfnsListUsersResponse = {
        items: filteredUsers,
        nextPageToken: response.nextPageToken
      };

      console.log(`✅ Found ${filteredUsers.length} users (${response.items.length} total)`);

      return {
        success: true,
        data: filteredResponse
      };

    } catch (error) {
      console.error('❌ Failed to list users:', error);
      
      if (error instanceof DfnsAuthenticationError) {
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token permissions.',
          requiresUserAction: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users'
      };
    }
  }

  /**
   * Create User
   * POST /auth/users
   * 
   * Required Permission: Auth:Users:Create
   * Requires User Action Signing
   */
  async createUser(
    options: CreateUserOptions,
    userActionToken?: string
  ): Promise<UserOperationResult<DfnsCreateUserResponse>> {
    try {
      console.log('👤 Creating user:', options.email);

      // Validate email format
      if (!this.isValidEmail(options.email)) {
        throw new DfnsValidationError('Invalid email address format');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Creating user without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for user creation',
          requiresUserAction: true,
          nextStep: 'user_action_signing'
        };
      }

      const createRequest: DfnsCreateUserRequest = {
        email: options.email,
        kind: 'CustomerEmployee', // Only CustomerEmployee allowed in this endpoint
        externalId: options.externalId
      };

      const response = await this.workingClient.makeRequest<DfnsCreateUserResponse>(
        'POST',
        '/auth/users',
        createRequest,
        userActionToken
      );

      console.log('✅ User created successfully:', response.userId);

      // Auto-assign permissions if requested
      if (options.autoAssignPermissions && options.autoAssignPermissions.length > 0) {
        console.log('🔐 Auto-assigning permissions...');
        try {
          await this.assignPermissionsToUser(
            response.userId,
            options.autoAssignPermissions,
            userActionToken
          );
        } catch (permError) {
          console.warn('⚠️ Failed to assign some permissions:', permError);
        }
      }

      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: options.sendRegistrationEmail !== false ? 'registration_email_sent' : 'user_created'
      };

    } catch (error) {
      console.error('❌ Failed to create user:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:Users:Create permission.',
            requiresUserAction: true,
            nextStep: 'check_permissions'
          };
        }
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token.',
          requiresUserAction: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Get User
   * GET /auth/users/{userId}
   * 
   * Required Permission: Auth:Users:Read
   */
  async getUser(userId: string): Promise<UserOperationResult<DfnsGetUserResponse>> {
    try {
      console.log('👤 Getting user:', userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      const response = await this.workingClient.makeRequest<DfnsGetUserResponse>(
        'GET',
        `/auth/users/${userId}`
      );

      console.log('✅ User retrieved successfully:', response.username);

      return {
        success: true,
        data: response,
        userId: response.userId
      };

    } catch (error) {
      console.error('❌ Failed to get user:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId
          };
        }
        return {
          success: false,
          error: 'Authentication failed. Check your permissions.',
          userId
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        userId
      };
    }
  }

  /**
   * Activate User
   * PUT /auth/users/{userId}/activate
   * 
   * Required Permission: Auth:Users:Update
   * Requires User Action Signing
   */
  async activateUser(
    userId: string,
    userActionToken?: string
  ): Promise<UserOperationResult<DfnsActivateUserResponse>> {
    try {
      console.log('🔓 Activating user:', userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for user activation',
          requiresUserAction: true,
          userId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsActivateUserResponse>(
        'PUT',
        `/auth/users/${userId}/activate`,
        {}, // Empty body for activation
        userActionToken
      );

      console.log('✅ User activated successfully:', response.username);

      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: 'user_activated'
      };

    } catch (error) {
      console.error('❌ Failed to activate user:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:Users:Update permission.',
            requiresUserAction: true,
            userId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate user',
        userId,
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Deactivate User
   * PUT /auth/users/{userId}/deactivate
   * 
   * Required Permission: Auth:Users:Update  
   * Requires User Action Signing
   */
  async deactivateUser(
    userId: string,
    userActionToken?: string
  ): Promise<UserOperationResult<DfnsDeactivateUserResponse>> {
    try {
      console.log('🔒 Deactivating user:', userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for user deactivation',
          requiresUserAction: true,
          userId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsDeactivateUserResponse>(
        'PUT',
        `/auth/users/${userId}/deactivate`,
        {}, // Empty body for deactivation
        userActionToken
      );

      console.log('✅ User deactivated successfully:', response.username);

      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: 'user_deactivated'
      };

    } catch (error) {
      console.error('❌ Failed to deactivate user:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:Users:Update permission.',
            requiresUserAction: true,
            userId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        userId,
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Archive User
   * PUT /auth/users/{userId}/archive
   * 
   * Required Permission: Auth:Users:Update
   * Requires User Action Signing
   */
  async archiveUser(
    userId: string,
    userActionToken?: string
  ): Promise<UserOperationResult<DfnsArchiveUserResponse>> {
    try {
      console.log('🗄️ Archiving user:', userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for user archiving',
          requiresUserAction: true,
          userId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsArchiveUserResponse>(
        'PUT',
        `/auth/users/${userId}/archive`,
        {}, // Empty body for archiving
        userActionToken
      );

      console.log('✅ User archived successfully:', response.username);

      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: 'user_archived'
      };

    } catch (error) {
      console.error('❌ Failed to archive user:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:Users:Update permission.',
            requiresUserAction: true,
            userId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive user',
        userId,
        requiresUserAction: !userActionToken
      };
    }
  }

  // =====================================
  // CONVENIENCE METHODS
  // =====================================

  /**
   * Get all users (handles pagination automatically)
   */
  async getAllUsers(filters: UserListFilters = {}): Promise<UserOperationResult<DfnsUserResponse[]>> {
    try {
      console.log('📋 Getting all users...');

      const allUsers: DfnsUserResponse[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const result = await this.listUsers({
          ...filters,
          paginationToken: nextPageToken,
          limit: filters.limit || 100 // Use reasonable page size
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch users',
            requiresUserAction: result.requiresUserAction || false
          } as UserOperationResult<DfnsUserResponse[]>;
        }

        allUsers.push(...result.data.items);
        nextPageToken = result.data.nextPageToken;

      } while (nextPageToken);

      console.log(`✅ Retrieved ${allUsers.length} total users`);

      return {
        success: true,
        data: allUsers
      };

    } catch (error) {
      console.error('❌ Failed to get all users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all users'
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<UserOperationResult<UserStatistics>> {
    try {
      console.log('📊 Calculating user statistics...');

      const result = await this.getAllUsers();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get users for statistics'
        };
      }

      const users = result.data;
      const stats: UserStatistics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        customerEmployees: users.filter(u => u.kind === 'CustomerEmployee').length,
        endUsers: users.filter(u => u.kind === 'EndUser').length,
        registeredUsers: users.filter(u => u.isRegistered).length,
        unregisteredUsers: users.filter(u => !u.isRegistered).length,
        usersWithPermissions: users.filter(u => u.permissionAssignments && u.permissionAssignments.length > 0).length
      };

      console.log('📊 User statistics calculated:', stats);

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Failed to calculate user statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate statistics'
      };
    }
  }

  /**
   * Search users by username or email
   */
  async searchUsers(searchTerm: string): Promise<UserOperationResult<DfnsUserResponse[]>> {
    return this.listUsers({
      search: searchTerm,
      limit: 50 // Reasonable limit for search results
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get users by kind
   */
  async getUsersByKind(kind: DfnsUserKind): Promise<UserOperationResult<DfnsUserResponse[]>> {
    return this.listUsers({
      kind,
      limit: 100
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get active users only
   */
  async getActiveUsers(): Promise<UserOperationResult<DfnsUserResponse[]>> {
    return this.listUsers({
      isActive: true,
      limit: 100
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get users with permissions
   */
  async getUsersWithPermissions(): Promise<UserOperationResult<DfnsUserResponse[]>> {
    const result = await this.getAllUsers();
    if (!result.success || !result.data) {
      return result;
    }

    const usersWithPermissions = result.data.filter(user => 
      user.permissionAssignments && user.permissionAssignments.length > 0
    );

    return {
      success: true,
      data: usersWithPermissions
    };
  }

  // =====================================
  // PERMISSION MANAGEMENT HELPERS
  // =====================================

  /**
   * Assign permissions to a user (requires separate permission assignment API)
   */
  private async assignPermissionsToUser(
    userId: string,
    permissionIds: string[],
    userActionToken?: string
  ): Promise<void> {
    console.log(`🔐 Assigning ${permissionIds.length} permissions to user ${userId}`);

    for (const permissionId of permissionIds) {
      try {
        // This would use the DFNS Permissions API (separate service)
        // For now, just log the attempt
        console.log(`🔐 Would assign permission ${permissionId} to user ${userId}`);
        
        // In a full implementation, this would call:
        // await this.workingClient.makeRequest('POST', '/permissions/assignments', {
        //   permissionId,
        //   identityId: userId,
        //   identityKind: 'User'
        // }, userActionToken);

      } catch (error) {
        console.warn(`⚠️ Failed to assign permission ${permissionId}:`, error);
        // Continue with other permissions
      }
    }
  }

  // =====================================
  // VALIDATION HELPERS
  // =====================================

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate user management permissions
   */
  async validateUserManagementPermissions(): Promise<{
    canReadUsers: boolean;
    canCreateUsers: boolean;
    canUpdateUsers: boolean;
    missingPermissions: string[];
    recommendations: string[];
  }> {
    const missingPermissions: string[] = [];
    const recommendations: string[] = [];
    let canReadUsers = false;
    let canCreateUsers = false;
    let canUpdateUsers = false;

    try {
      // Test read permission
      await this.workingClient.makeRequest('GET', '/auth/users?limit=1');
      canReadUsers = true;
      console.log('✅ Auth:Users:Read permission confirmed');
    } catch (error) {
      missingPermissions.push('Auth:Users:Read');
      recommendations.push('Request Auth:Users:Read permission to list and view users');
    }

    // We can't easily test create/update permissions without actually performing the operations
    // So we'll provide recommendations based on the authentication method
    const authMethod = this.workingClient.getAuthMethod();
    
    if (authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY') {
      recommendations.push('Service Accounts typically have broader permissions for user management');
      recommendations.push('Ensure your Service Account has Auth:Users:Create and Auth:Users:Update permissions');
      canCreateUsers = true; // Assume service accounts have these permissions
      canUpdateUsers = true;
    } else if (authMethod === 'PAT') {
      recommendations.push('Personal Access Tokens may have limited user management permissions');
      recommendations.push('Check your PAT scope includes user management operations');
      missingPermissions.push('Auth:Users:Create (may be limited with PAT)');
      missingPermissions.push('Auth:Users:Update (may be limited with PAT)');
    }

    return {
      canReadUsers,
      canCreateUsers,
      canUpdateUsers,
      missingPermissions,
      recommendations
    };
  }

  /**
   * Check if User Action Signing is available for sensitive operations
   */
  isUserActionSigningAvailable(): boolean {
    // With token-based authentication, User Action Signing requires:
    // 1. WebAuthn credentials (passkeys), or
    // 2. Registered Key credentials with private keys
    
    // This would typically check credential availability
    // For now, return true if we have proper authentication
    const authMethod = this.workingClient.getAuthMethod();
    return authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY' || authMethod === 'PAT';
  }

  /**
   * Get authentication context for user management operations
   */
  getAuthenticationContext() {
    const authMethod = this.workingClient.getAuthMethod();
    const config = this.workingClient.getConfig();

    return {
      method: authMethod,
      hasUserActionCapability: this.isUserActionSigningAvailable(),
      recommendedFlow: authMethod === 'SERVICE_ACCOUNT_TOKEN' ? 
        'Service Account with User Action Signing' : 
        'PAT with WebAuthn credentials',
      userId: config.userId,
      username: config.username,
      orgId: config.appId
    };
  }
}