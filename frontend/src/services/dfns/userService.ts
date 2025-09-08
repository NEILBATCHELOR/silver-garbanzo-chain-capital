/**
 * DFNS User Service
 * 
 * High-level service for DFNS user management operations
 * Provides business logic layer over DFNS User Management APIs
 */

import type {
  DfnsListUsersRequest,
  DfnsListUsersResponse,
  DfnsCreateUserRequest,
  DfnsCreateUserResponse,
  DfnsGetUserResponse,
  DfnsActivateUserResponse,
  DfnsDeactivateUserResponse,
  DfnsArchiveUserResponse,
  DfnsUserResponse,
  DfnsUser,
} from '../../types/dfns';
import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

export interface UserServiceOptions {
  enableDatabaseSync?: boolean;
  enableAuditLogging?: boolean;
  validatePermissions?: boolean;
}

export interface UserListOptions {
  limit?: number;
  paginationToken?: string;
  includeInactive?: boolean;
  sortBy?: 'username' | 'createdAt' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreationOptions {
  sendRegistrationEmail?: boolean;
  autoActivate?: boolean;
  syncToDatabase?: boolean;
}

export class DfnsUserService {
  private authClient: DfnsAuthClient;
  private options: UserServiceOptions;

  constructor(
    dfnsClient: DfnsClient,
    options: UserServiceOptions = {}
  ) {
    this.authClient = new DfnsAuthClient(dfnsClient);
    this.options = {
      enableDatabaseSync: true,
      enableAuditLogging: true,
      validatePermissions: true,
      ...options
    };
  }

  // ===== User Listing and Retrieval =====

  /**
   * List all users in the organization with enhanced filtering
   * High-level wrapper around DFNS listUsers API
   */
  async listUsers(options?: UserListOptions): Promise<DfnsListUsersResponse> {
    try {
      const request: DfnsListUsersRequest = {
        limit: options?.limit || 50,
        paginationToken: options?.paginationToken,
      };

      const response = await this.authClient.listUsers(request);

      // Log for audit if enabled
      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Listed ${response.items.length} users`, {
          limit: request.limit,
          hasNextPage: !!response.nextPageToken
        });
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list users: ${error}`,
        { options }
      );
    }
  }

  /**
   * Get all users (handles pagination automatically)
   * Useful for admin dashboards and bulk operations
   */
  async getAllUsers(): Promise<DfnsUserResponse[]> {
    const allUsers: DfnsUserResponse[] = [];
    let paginationToken: string | undefined;

    try {
      do {
        const response = await this.listUsers({
          limit: 100, // Max per page
          paginationToken
        });
        
        allUsers.push(...response.items);
        paginationToken = response.nextPageToken;
        
      } while (paginationToken);

      console.log(`[DfnsUserService] Retrieved ${allUsers.length} total users`);
      return allUsers;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get all users: ${error}`
      );
    }
  }

  /**
   * Get a specific user by ID with enhanced error handling
   */
  async getUser(userId: string): Promise<DfnsGetUserResponse> {
    try {
      this.validateUserId(userId);
      
      const user = await this.authClient.getUser(userId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Retrieved user: ${user.username}`, {
          userId,
          isActive: user.isActive,
          isRegistered: user.isRegistered
        });
      }

      return user;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Get user by username (searches through all users)
   */
  async getUserByUsername(username: string): Promise<DfnsUserResponse | null> {
    try {
      const allUsers = await this.getAllUsers();
      const user = allUsers.find(u => u.username === username);
      
      if (this.options.enableAuditLogging && user) {
        console.log(`[DfnsUserService] Found user by username: ${username}`, {
          userId: user.userId,
          isActive: user.isActive
        });
      }

      return user || null;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get user by username: ${error}`,
        { username }
      );
    }
  }

  // ===== User Creation =====

  /**
   * Create a new user with enhanced validation and options
   */
  async createUser(
    request: DfnsCreateUserRequest,
    options?: UserCreationOptions
  ): Promise<DfnsCreateUserResponse> {
    try {
      // Validate input
      this.validateCreateUserRequest(request);

      // Check if user already exists
      const existingUser = await this.getUserByUsername(request.email);
      if (existingUser) {
        throw new DfnsValidationError(
          `User with email ${request.email} already exists`,
          { existingUserId: existingUser.userId }
        );
      }

      // Create user via DFNS API
      const newUser = await this.authClient.createUser(request);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncUserToDatabase(newUser);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Created user: ${newUser.username}`, {
          userId: newUser.userId,
          kind: newUser.kind,
          isRegistered: newUser.isRegistered
        });
      }

      return newUser;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create user: ${error}`,
        { email: request.email, kind: request.kind }
      );
    }
  }

  // ===== User Lifecycle Management =====

  /**
   * Activate a deactivated user
   */
  async activateUser(userId: string): Promise<DfnsActivateUserResponse> {
    try {
      this.validateUserId(userId);

      // Check current user status
      const currentUser = await this.getUser(userId);
      if (currentUser.isActive) {
        throw new DfnsValidationError(
          `User ${userId} is already active`,
          { userId, currentStatus: 'active' }
        );
      }

      const activatedUser = await this.authClient.activateUser(userId);

      // Sync to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncUserStatusToDatabase(userId, 'active');
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Activated user: ${activatedUser.username}`, {
          userId,
          wasActive: currentUser.isActive,
          nowActive: activatedUser.isActive
        });
      }

      return activatedUser;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Deactivate an active user
   */
  async deactivateUser(userId: string): Promise<DfnsDeactivateUserResponse> {
    try {
      this.validateUserId(userId);

      // Check current user status
      const currentUser = await this.getUser(userId);
      if (!currentUser.isActive) {
        throw new DfnsValidationError(
          `User ${userId} is already inactive`,
          { userId, currentStatus: 'inactive' }
        );
      }

      const deactivatedUser = await this.authClient.deactivateUser(userId);

      // Sync to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncUserStatusToDatabase(userId, 'inactive');
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Deactivated user: ${deactivatedUser.username}`, {
          userId,
          wasActive: currentUser.isActive,
          nowActive: deactivatedUser.isActive
        });
      }

      return deactivatedUser;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Archive a user (soft delete)
   */
  async archiveUser(userId: string): Promise<DfnsArchiveUserResponse> {
    try {
      this.validateUserId(userId);

      // Get current user for logging
      const currentUser = await this.getUser(userId);
      
      const archivedUser = await this.authClient.archiveUser(userId);

      // Sync to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncUserStatusToDatabase(userId, 'archived');
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsUserService] Archived user: ${archivedUser.username}`, {
          userId,
          previousStatus: currentUser.isActive ? 'active' : 'inactive'
        });
      }

      return archivedUser;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive user: ${error}`,
        { userId }
      );
    }
  }

  // ===== Batch Operations =====

  /**
   * Activate multiple users in batch
   */
  async activateUsers(userIds: string[]): Promise<DfnsActivateUserResponse[]> {
    const results: DfnsActivateUserResponse[] = [];
    const errors: Array<{ userId: string; error: Error }> = [];

    for (const userId of userIds) {
      try {
        const result = await this.activateUser(userId);
        results.push(result);
      } catch (error) {
        errors.push({ userId, error: error as Error });
      }
    }

    if (errors.length > 0 && this.options.enableAuditLogging) {
      console.warn(`[DfnsUserService] Batch activation completed with ${errors.length} errors`, {
        successCount: results.length,
        errorCount: errors.length,
        errors: errors.map(e => ({ userId: e.userId, message: e.error.message }))
      });
    }

    return results;
  }

  /**
   * Deactivate multiple users in batch
   */
  async deactivateUsers(userIds: string[]): Promise<DfnsDeactivateUserResponse[]> {
    const results: DfnsDeactivateUserResponse[] = [];
    const errors: Array<{ userId: string; error: Error }> = [];

    for (const userId of userIds) {
      try {
        const result = await this.deactivateUser(userId);
        results.push(result);
      } catch (error) {
        errors.push({ userId, error: error as Error });
      }
    }

    if (errors.length > 0 && this.options.enableAuditLogging) {
      console.warn(`[DfnsUserService] Batch deactivation completed with ${errors.length} errors`, {
        successCount: results.length,
        errorCount: errors.length,
        errors: errors.map(e => ({ userId: e.userId, message: e.error.message }))
      });
    }

    return results;
  }

  // ===== Utility and Validation Methods =====

  /**
   * Validate user ID format
   */
  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new DfnsValidationError('User ID is required and must be a string');
    }

    // DFNS user IDs follow pattern: us-xxxx-xxxx-xxxxxxxx
    const userIdPattern = /^us-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{8}$/;
    if (!userIdPattern.test(userId)) {
      throw new DfnsValidationError(
        `Invalid DFNS user ID format: ${userId}`,
        { expectedPattern: 'us-xxxx-xxxx-xxxxxxxx' }
      );
    }
  }

  /**
   * Validate create user request
   */
  private validateCreateUserRequest(request: DfnsCreateUserRequest): void {
    if (!request.email || typeof request.email !== 'string') {
      throw new DfnsValidationError('Email is required and must be a string');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(request.email)) {
      throw new DfnsValidationError(`Invalid email format: ${request.email}`);
    }

    if (request.kind !== 'CustomerEmployee') {
      throw new DfnsValidationError(
        `Invalid user kind: ${request.kind}. Only 'CustomerEmployee' is allowed for direct user creation`
      );
    }
  }

  /**
   * Sync user data to local database (placeholder)
   * TODO: Implement database sync using Supabase client
   */
  private async syncUserToDatabase(user: DfnsCreateUserResponse): Promise<void> {
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsUserService] TODO: Sync user to database`, {
        userId: user.userId,
        username: user.username
      });
    }
    // TODO: Implement Supabase insert to dfns_users table
  }

  /**
   * Sync user status to local database (placeholder)
   * TODO: Implement status sync using Supabase client
   */
  private async syncUserStatusToDatabase(userId: string, status: string): Promise<void> {
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsUserService] TODO: Sync user status to database`, {
        userId,
        status
      });
    }
    // TODO: Implement Supabase update to dfns_users table
  }
}
