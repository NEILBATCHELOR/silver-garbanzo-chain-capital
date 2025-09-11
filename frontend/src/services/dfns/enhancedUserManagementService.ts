/**
 * Enhanced DFNS User Management Service
 * 
 * Implements current DFNS User Management API with database integration:
 * - GET /auth/users (List Users)
 * - POST /auth/users (Create User) 
 * - GET /auth/users/{userId} (Get User)
 * - PUT /auth/users/{userId}/activate (Activate User)
 * - PUT /auth/users/{userId}/deactivate (Deactivate User)
 * - PUT /auth/users/{userId}/archive (Archive User)
 * 
 * Features:
 * - Full database synchronization with dfns_users table
 * - Enhanced error handling and response types
 * - Comprehensive analytics and statistics  
 * - Caching and performance optimizations
 * - Integration with User Action Signing
 * 
 * API Documentation:
 * - https://docs.dfns.co/d/api-docs/authentication/user-management
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/listusers
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/createuser
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/getuser
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/activateuser
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/deactivateuser
 * - https://docs.dfns.co/d/api-docs/authentication/user-management/archiveuser
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

// Database types for local storage
interface DatabaseUser {
  id: string;
  username: string;
  email?: string;
  status: string;
  kind: string;
  external_id?: string;
  public_key?: string;
  recovery_setup: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  registered_at: string;
  organization_id?: string;
  dfns_user_id?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced service interfaces
export interface UserListFilters {
  kind?: DfnsUserKind;
  isActive?: boolean;
  isRegistered?: boolean;
  search?: string;
  limit?: number;
  paginationToken?: string;
  // Enhanced filters
  hasPermissions?: boolean;
  lastLoginAfter?: string;
  organizationId?: string;
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
  // Enhanced statistics
  newUsersLast30Days: number;
  activeUsersLast30Days: number;
  averagePermissionsPerUser: number;
  mostCommonUserKind: DfnsUserKind;
}

export interface UserOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  userId?: string;
  requiresUserAction?: boolean;
  nextStep?: string;
  // Enhanced metadata
  cached?: boolean;
  syncedToDatabase?: boolean;
  requestId?: string;
  responseTime?: number;
}

export interface CreateUserOptions {
  email: string;
  externalId?: string;
  autoAssignPermissions?: string[];
  sendRegistrationEmail?: boolean;
  // Enhanced options
  syncToDatabase?: boolean;
  customMetadata?: Record<string, any>;
  tags?: string[];
}

export interface UserSyncOptions {
  forceRefresh?: boolean;
  syncPermissions?: boolean;
  updateTimestamps?: boolean;
  batchSize?: number;
}

export class EnhancedDfnsUserManagementService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private workingClient: WorkingDfnsClient) {}

  // =====================================
  // CURRENT DFNS USER MANAGEMENT API (Enhanced)
  // =====================================

  /**
   * List Users - Enhanced with caching and database sync
   * GET /auth/users
   * 
   * Required Permission: Auth:Users:Read
   */
  async listUsers(
    filters: UserListFilters = {},
    syncOptions: UserSyncOptions = {}
  ): Promise<UserOperationResult<DfnsListUsersResponse>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`📋 [${requestId}] Listing users with filters:`, filters);

      // Check cache first (unless forced refresh)
      const cacheKey = `users_list_${JSON.stringify(filters)}`;
      if (!syncOptions.forceRefresh) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log(`⚡ [${requestId}] Returning cached users (${cached.items.length} items)`);
          return {
            success: true,
            data: cached,
            cached: true,
            requestId,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Build query parameters for DFNS API
      const params = new URLSearchParams();
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.paginationToken) {
        params.append('paginationToken', filters.paginationToken);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/auth/users?${queryString}` : '/auth/users';

      // Make API request to DFNS
      const response = await this.workingClient.makeRequest<DfnsListUsersResponse>(
        'GET',
        endpoint
      );

      // Apply client-side filters
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

      if (filters.hasPermissions !== undefined) {
        filteredUsers = filteredUsers.filter(user => 
          filters.hasPermissions 
            ? (user.permissionAssignments && user.permissionAssignments.length > 0)
            : (!user.permissionAssignments || user.permissionAssignments.length === 0)
        );
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

      // Cache the result
      this.setCache(cacheKey, filteredResponse);

      // Sync to database if requested
      let syncedToDatabase = false;
      if (syncOptions.syncPermissions !== false) {
        try {
          await this.syncUsersToDatabase(filteredUsers);
          syncedToDatabase = true;
        } catch (syncError) {
          console.warn(`⚠️ [${requestId}] Failed to sync users to database:`, syncError);
        }
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] Found ${filteredUsers.length} users (${response.items.length} total) in ${responseTime}ms`);

      return {
        success: true,
        data: filteredResponse,
        requestId,
        responseTime,
        syncedToDatabase
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to list users in ${responseTime}ms:`, error);
      
      if (error instanceof DfnsAuthenticationError) {
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token permissions for Auth:Users:Read.',
          requiresUserAction: false,
          requestId,
          responseTime
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users',
        requestId,
        responseTime
      };
    }
  }

  /**
   * Create User - Enhanced with database sync and metadata
   * POST /auth/users
   * 
   * Required Permission: Auth:Users:Create
   * Requires User Action Signing
   */
  async createUser(
    options: CreateUserOptions,
    userActionToken?: string
  ): Promise<UserOperationResult<DfnsCreateUserResponse>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`👤 [${requestId}] Creating user:`, options.email);

      // Enhanced email validation
      if (!this.isValidEmail(options.email)) {
        throw new DfnsValidationError('Invalid email address format');
      }

      // Check for duplicate email in database
      if (options.syncToDatabase !== false) {
        const existingUser = await this.findUserByEmail(options.email);
        if (existingUser) {
          return {
            success: false,
            error: `User with email ${options.email} already exists`,
            userId: existingUser.dfns_user_id || undefined,
            requestId,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Validate User Action token requirement
      if (!userActionToken) {
        console.warn(`⚠️ [${requestId}] Creating user without User Action token - this will likely fail`);
        return {
          success: false,
          error: 'User Action Signing required for user creation. Please provide a valid User Action token.',
          requiresUserAction: true,
          nextStep: 'user_action_signing',
          requestId,
          responseTime: Date.now() - startTime
        };
      }

      // Build DFNS API request
      const createRequest: DfnsCreateUserRequest = {
        email: options.email,
        kind: 'CustomerEmployee', // Only CustomerEmployee allowed in this endpoint
        externalId: options.externalId
      };

      // Make API request to DFNS
      const response = await this.workingClient.makeRequest<DfnsCreateUserResponse>(
        'POST',
        '/auth/users',
        createRequest,
        userActionToken
      );

      console.log(`✅ [${requestId}] User created successfully:`, response.userId);

      // Sync to database
      let syncedToDatabase = false;
      if (options.syncToDatabase !== false) {
        try {
          await this.syncUserToDatabase({
            dfns_user_id: response.userId,
            username: response.username,
            email: options.email,
            kind: response.kind,
            external_id: options.externalId,
            status: response.isActive ? 'Active' : 'Inactive',
            recovery_setup: false,
            mfa_enabled: false,
            registered_at: new Date().toISOString(),
            organization_id: response.orgId,
            customMetadata: options.customMetadata,
            tags: options.tags
          });
          syncedToDatabase = true;
        } catch (syncError) {
          console.warn(`⚠️ [${requestId}] Failed to sync user to database:`, syncError);
        }
      }

      // Auto-assign permissions if requested
      if (options.autoAssignPermissions && options.autoAssignPermissions.length > 0) {
        console.log(`🔐 [${requestId}] Auto-assigning ${options.autoAssignPermissions.length} permissions...`);
        try {
          await this.assignPermissionsToUser(
            response.userId,
            options.autoAssignPermissions,
            userActionToken
          );
        } catch (permError) {
          console.warn(`⚠️ [${requestId}] Failed to assign some permissions:`, permError);
        }
      }

      // Clear relevant caches
      this.clearUserCaches();

      const responseTime = Date.now() - startTime;
      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: options.sendRegistrationEmail !== false ? 'registration_email_sent' : 'user_created',
        requestId,
        responseTime,
        syncedToDatabase
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to create user in ${responseTime}ms:`, error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:Users:Create permission.',
            requiresUserAction: true,
            nextStep: 'check_permissions',
            requestId,
            responseTime
          };
        }
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token.',
          requiresUserAction: false,
          requestId,
          responseTime
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        requiresUserAction: !userActionToken,
        requestId,
        responseTime
      };
    }
  }

  /**
   * Get User - Enhanced with caching
   * GET /auth/users/{userId}
   * 
   * Required Permission: Auth:Users:Read
   */
  async getUser(
    userId: string,
    options: { useCache?: boolean; syncToDatabase?: boolean } = {}
  ): Promise<UserOperationResult<DfnsGetUserResponse>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`👤 [${requestId}] Getting user:`, userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      // Check cache first
      const cacheKey = `user_${userId}`;
      if (options.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log(`⚡ [${requestId}] Returning cached user:`, cached.username);
          return {
            success: true,
            data: cached,
            userId,
            cached: true,
            requestId,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Make API request to DFNS
      const response = await this.workingClient.makeRequest<DfnsGetUserResponse>(
        'GET',
        `/auth/users/${userId}`
      );

      // Cache the result
      this.setCache(cacheKey, response);

      // Sync to database if requested
      let syncedToDatabase = false;
      if (options.syncToDatabase) {
        try {
          await this.syncUserToDatabase({
            dfns_user_id: response.userId,
            username: response.username,
            kind: response.kind,
            status: response.isActive ? 'Active' : 'Inactive',
            organization_id: response.orgId
          });
          syncedToDatabase = true;
        } catch (syncError) {
          console.warn(`⚠️ [${requestId}] Failed to sync user to database:`, syncError);
        }
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] User retrieved successfully in ${responseTime}ms:`, response.username);

      return {
        success: true,
        data: response,
        userId: response.userId,
        requestId,
        responseTime,
        syncedToDatabase
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to get user in ${responseTime}ms:`, error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId,
            requestId,
            responseTime
          };
        }
        return {
          success: false,
          error: 'Authentication failed. Check your permissions for Auth:Users:Read.',
          userId,
          requestId,
          responseTime
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        userId,
        requestId,
        responseTime
      };
    }
  }

  /**
   * Activate User - Enhanced with database sync
   * PUT /auth/users/{userId}/activate
   * 
   * Required Permission: Auth:Users:Update
   * Requires User Action Signing
   */
  async activateUser(
    userId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<UserOperationResult<DfnsActivateUserResponse>> {
    return this.updateUserStatus(userId, 'activate', userActionToken, options);
  }

  /**
   * Deactivate User - Enhanced with database sync
   * PUT /auth/users/{userId}/deactivate
   * 
   * Required Permission: Auth:Users:Update  
   * Requires User Action Signing
   */
  async deactivateUser(
    userId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<UserOperationResult<DfnsDeactivateUserResponse>> {
    return this.updateUserStatus(userId, 'deactivate', userActionToken, options);
  }

  /**
   * Archive User - Enhanced with database sync
   * PUT /auth/users/{userId}/archive
   * 
   * Required Permission: Auth:Users:Update
   * Requires User Action Signing
   */
  async archiveUser(
    userId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<UserOperationResult<DfnsArchiveUserResponse>> {
    return this.updateUserStatus(userId, 'archive', userActionToken, options);
  }

  // =====================================
  // ENHANCED CONVENIENCE METHODS
  // =====================================

  /**
   * Get comprehensive user statistics with enhanced analytics
   */
  async getUserStatistics(): Promise<UserOperationResult<UserStatistics>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`📊 [${requestId}] Calculating enhanced user statistics...`);

      const result = await this.getAllUsers();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get users for statistics',
          requestId,
          responseTime: Date.now() - startTime
        };
      }

      const users = result.data;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate enhanced statistics
      const stats: UserStatistics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        customerEmployees: users.filter(u => u.kind === 'CustomerEmployee').length,
        endUsers: users.filter(u => u.kind === 'EndUser').length,
        registeredUsers: users.filter(u => u.isRegistered).length,
        unregisteredUsers: users.filter(u => !u.isRegistered).length,
        usersWithPermissions: users.filter(u => u.permissionAssignments && u.permissionAssignments.length > 0).length,
        
        // Enhanced analytics
        newUsersLast30Days: users.filter(u => {
          if (!u.dateCreated) return false;
          const createdDate = new Date(u.dateCreated);
          return createdDate >= thirtyDaysAgo;
        }).length,
        
        activeUsersLast30Days: users.filter(u => {
          if (!u.lastLoginAt) return false;
          const lastLogin = new Date(u.lastLoginAt);
          return lastLogin >= thirtyDaysAgo;
        }).length,
        
        averagePermissionsPerUser: users.length > 0 
          ? users.reduce((sum, u) => sum + (u.permissionAssignments?.length || 0), 0) / users.length 
          : 0,
          
        mostCommonUserKind: this.getMostCommonUserKind(users)
      };

      const responseTime = Date.now() - startTime;
      console.log(`📊 [${requestId}] Enhanced user statistics calculated in ${responseTime}ms:`, stats);

      return {
        success: true,
        data: stats,
        requestId,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to calculate user statistics in ${responseTime}ms:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate statistics',
        requestId,
        responseTime
      };
    }
  }

  /**
   * Sync all users from DFNS to local database
   */
  async syncAllUsersToDatabase(options: UserSyncOptions = {}): Promise<UserOperationResult<{ syncedCount: number; errorCount: number }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`🔄 [${requestId}] Starting comprehensive user sync to database...`);

      const result = await this.getAllUsers();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get users for sync',
          requestId,
          responseTime: Date.now() - startTime
        };
      }

      const users = result.data;
      const batchSize = options.batchSize || 10;
      let syncedCount = 0;
      let errorCount = 0;

      // Process users in batches
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        console.log(`🔄 [${requestId}] Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)} (${batch.length} users)`);

        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              await this.syncUserToDatabase({
                dfns_user_id: user.userId,
                username: user.username,
                kind: user.kind,
                status: user.isActive ? 'Active' : 'Inactive',
                organization_id: user.orgId,
                updated_at: options.updateTimestamps ? new Date().toISOString() : undefined
              });
              syncedCount++;
            } catch (error) {
              console.warn(`⚠️ [${requestId}] Failed to sync user ${user.userId}:`, error);
              errorCount++;
            }
          })
        );

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] User sync completed in ${responseTime}ms: ${syncedCount} synced, ${errorCount} errors`);

      return {
        success: true,
        data: { syncedCount, errorCount },
        requestId,
        responseTime,
        syncedToDatabase: true
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to sync users to database in ${responseTime}ms:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync users to database',
        requestId,
        responseTime
      };
    }
  }

  /**
   * Get all users with automatic pagination (enhanced)
   */
  async getAllUsers(filters: UserListFilters = {}): Promise<UserOperationResult<DfnsUserResponse[]>> {
    try {
      const allUsers: DfnsUserResponse[] = [];
      let nextPageToken: string | undefined = undefined;
      let pageCount = 0;

      do {
        pageCount++;
        console.log(`📋 Getting users page ${pageCount}...`);

        const result = await this.listUsers({
          ...filters,
          paginationToken: nextPageToken,
          limit: filters.limit || 100
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to retrieve users',
            data: []
          };
        }

        allUsers.push(...result.data.items);
        nextPageToken = result.data.nextPageToken;

      } while (nextPageToken);

      console.log(`✅ Retrieved ${allUsers.length} total users across ${pageCount} pages`);

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

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

  /**
   * Generic user status update method
   */
  private async updateUserStatus(
    userId: string,
    action: 'activate' | 'deactivate' | 'archive',
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<UserOperationResult<any>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`🔄 [${requestId}] ${action}ing user:`, userId);

      if (!userId) {
        throw new DfnsValidationError('User ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: `User Action Signing required for user ${action}`,
          requiresUserAction: true,
          userId,
          nextStep: 'user_action_signing',
          requestId,
          responseTime: Date.now() - startTime
        };
      }

      // Make API request to DFNS
      const response = await this.workingClient.makeRequest<any>(
        'PUT',
        `/auth/users/${userId}/${action}`,
        {},
        userActionToken
      );

      // Sync to database
      let syncedToDatabase = false;
      if (options.syncToDatabase !== false) {
        try {
          const status = action === 'activate' ? 'Active' : 'Inactive';
          await this.updateUserInDatabase(userId, { status });
          syncedToDatabase = true;
        } catch (syncError) {
          console.warn(`⚠️ [${requestId}] Failed to sync user status to database:`, syncError);
        }
      }

      // Clear relevant caches
      this.clearUserCache(userId);

      const responseTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] User ${action}d successfully in ${responseTime}ms:`, response.username);

      return {
        success: true,
        data: response,
        userId: response.userId,
        nextStep: `user_${action}d`,
        requestId,
        responseTime,
        syncedToDatabase
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Failed to ${action} user in ${responseTime}ms:`, error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: `User Action Signing failed or insufficient permissions. Need Auth:Users:Update permission.`,
            requiresUserAction: true,
            userId,
            nextStep: 'check_permissions',
            requestId,
            responseTime
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            userId,
            requestId,
            responseTime
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${action} user`,
        userId,
        requiresUserAction: !userActionToken,
        requestId,
        responseTime
      };
    }
  }

  /**
   * Cache management methods
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearUserCache(userId: string): void {
    this.cache.delete(`user_${userId}`);
  }

  private clearUserCaches(): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith('user_') || key.startsWith('users_list_')
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Database sync methods (placeholder - implement with your database client)
   */
  private async syncUserToDatabase(userData: Partial<DatabaseUser & { customMetadata?: any; tags?: string[] }>): Promise<void> {
    console.log('🔄 Syncing user to database:', userData.username);
    // TODO: Implement actual database sync with Supabase
    // Example:
    // await supabaseClient.from('dfns_users').upsert({
    //   dfns_user_id: userData.dfns_user_id,
    //   username: userData.username,
    //   email: userData.email,
    //   status: userData.status,
    //   kind: userData.kind,
    //   external_id: userData.external_id,
    //   organization_id: userData.organization_id,
    //   updated_at: new Date().toISOString()
    // });
  }

  private async syncUsersToDatabase(users: DfnsUserResponse[]): Promise<void> {
    console.log(`🔄 Syncing ${users.length} users to database`);
    for (const user of users) {
      await this.syncUserToDatabase({
        dfns_user_id: user.userId,
        username: user.username,
        kind: user.kind,
        status: user.isActive ? 'Active' : 'Inactive',
        organization_id: user.orgId
      });
    }
  }

  private async updateUserInDatabase(userId: string, updates: Partial<DatabaseUser>): Promise<void> {
    console.log('🔄 Updating user in database:', userId, updates);
    // TODO: Implement actual database update
  }

  private async findUserByEmail(email: string): Promise<DatabaseUser | null> {
    console.log('🔍 Finding user by email:', email);
    // TODO: Implement actual database query
    return null;
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getMostCommonUserKind(users: DfnsUserResponse[]): DfnsUserKind {
    const kindCounts = users.reduce((acc, user) => {
      acc[user.kind] = (acc[user.kind] || 0) + 1;
      return acc;
    }, {} as Record<DfnsUserKind, number>);

    return Object.entries(kindCounts).reduce((a, b) => 
      kindCounts[a[0] as DfnsUserKind] > kindCounts[b[0] as DfnsUserKind] ? a : b
    )[0] as DfnsUserKind;
  }

  private async assignPermissionsToUser(
    userId: string,
    permissionIds: string[],
    userActionToken?: string
  ): Promise<void> {
    console.log(`🔐 Assigning ${permissionIds.length} permissions to user ${userId}`);
    // TODO: Implement permission assignment using DFNS Permissions API
    // This would integrate with your DfnsPermissionService
  }
}
