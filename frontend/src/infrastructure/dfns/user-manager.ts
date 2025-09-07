/**
 * DFNS User Manager - Complete user lifecycle management for DFNS integration
 * 
 * This service manages DFNS users including:
 * - User creation (CustomerEmployee type)
 * - User lifecycle management (activate/deactivate/archive)
 * - User information retrieval
 * - Permission assignment integration
 */

import type { DfnsClientConfig } from '@/types/dfns';
import type { 
  DfnsUser,
  CreateUserRequest,
  ListUsersResponse,
  DfnsUserPermissionAssignment
} from '@/types/dfns/user';
import { 
  DfnsUserKind,
  DfnsUserStatus
} from '@/types/dfns/user';
import { DfnsApiClient } from './client';
import { DfnsAuthenticator } from './auth';
import { DFNS_CONFIG } from './config';

// ===== DFNS User Manager Class =====

export class DfnsUserManager {
  private client: DfnsApiClient;
  private authenticator: DfnsAuthenticator;

  constructor(config: DfnsClientConfig, authenticator?: DfnsAuthenticator) {
    this.client = new DfnsApiClient(config);
    this.authenticator = authenticator || new DfnsAuthenticator(config);
    
    // Bind methods to preserve 'this' context
    this.mapApiUserToDfnsUser = this.mapApiUserToDfnsUser.bind(this);
    this.mapApiStatusToDfnsUserStatus = this.mapApiStatusToDfnsUserStatus.bind(this);
  }

  // ===== User Listing =====

  /**
   * List all users with optional pagination
   * Required permission: Auth:Users:Read
   */
  async listUsers(options: {
    limit?: number;
    paginationToken?: string;
  } = {}): Promise<ListUsersResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.paginationToken) queryParams.append('paginationToken', options.paginationToken);

      const response = await this.client.get(
        `/auth/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      );

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }

      if (!response.data || !response.data.items) {
        throw new Error('Invalid response format: missing items array');
      }

      return {
        items: response.data.items.map(this.mapApiUserToDfnsUser),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Failed to list users:', error);
      throw new Error(`Failed to list users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== User Creation =====

  /**
   * Create a new CustomerEmployee user
   * Required permission: Auth:Users:Create
   */
  async createUser(request: CreateUserRequest): Promise<DfnsUser> {
    try {
      const headers = await this.authenticator.getAuthHeaders(
        'POST',
        '/auth/users',
        request,
        true
      );

      const response = await this.client.post('/auth/users', request, { 
        headers: headers as unknown as Record<string, string> 
      });

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }

      if (!response.data || !response.data.userId) {
        throw new Error('Invalid response format: missing userId');
      }

      return this.mapApiUserToDfnsUser(response.data);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== User Retrieval =====

  /**
   * Get user details by userId
   * Required permission: Auth:Users:Read
   */
  async getUser(userId: string): Promise<DfnsUser> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const response = await this.client.get(`/auth/users/${userId}`);

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }

      if (!response.data || !response.data.userId) {
        throw new Error('Invalid response format: missing userId');
      }

      return this.mapApiUserToDfnsUser(response.data);
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== User Lifecycle Management =====

  /**
   * Activate a deactivated user
   * Required permission: Auth:Users:Activate
   */
  async activateUser(userId: string): Promise<DfnsUser> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const headers = await this.authenticator.getAuthHeaders(
        'PUT',
        `/auth/users/${userId}/activate`,
        {},
        true
      );

      const response = await this.client.put(`/auth/users/${userId}/activate`, {}, { 
        headers: headers as unknown as Record<string, string> 
      });

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }

      return this.mapApiUserToDfnsUser(response.data);
    } catch (error) {
      console.error(`Failed to activate user ${userId}:`, error);
      throw new Error(`Failed to activate user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deactivate an active user
   * Required permission: Auth:Users:Deactivate
   */
  async deactivateUser(userId: string): Promise<DfnsUser> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const headers = await this.authenticator.getAuthHeaders(
        'PUT',
        `/auth/users/${userId}/deactivate`,
        {},
        true
      );

      const response = await this.client.put(`/auth/users/${userId}/deactivate`, {}, { 
        headers: headers as unknown as Record<string, string> 
      });

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }

      return this.mapApiUserToDfnsUser(response.data);
    } catch (error) {
      console.error(`Failed to deactivate user ${userId}:`, error);
      throw new Error(`Failed to deactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive (soft delete) a user
   * Required permission: Auth:Users:Delete
   */
  async archiveUser(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const headers = await this.authenticator.getAuthHeaders(
        'DELETE',
        `/auth/users/${userId}`,
        {},
        true
      );

      const response = await this.client.delete(`/auth/users/${userId}`, { 
        headers: headers as unknown as Record<string, string> 
      });

      if (response.error) {
        throw new Error(`DFNS API Error: ${response.error.message}`);
      }
    } catch (error) {
      console.error(`Failed to archive user ${userId}:`, error);
      throw new Error(`Failed to archive user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== Helper Methods =====

  /**
   * Map API response to DfnsUser interface
   */
  private mapApiUserToDfnsUser(apiUser: any): DfnsUser {
    return {
      userId: apiUser.userId || apiUser.id,
      kind: (apiUser.kind === 'CustomerEmployee' ? DfnsUserKind.CustomerEmployee : DfnsUserKind.EndUser),
      username: apiUser.username || apiUser.email,
      name: apiUser.name,
      orgId: apiUser.orgId || 'default-org', // Provide default if not present
      isActive: apiUser.isActive ?? (apiUser.status === 'Active'),
      isRegistered: apiUser.isRegistered ?? true,
      permissionAssignments: apiUser.permissionAssignments || [],
      externalId: apiUser.externalId,
      dateCreated: apiUser.dateCreated || apiUser.createdAt || new Date().toISOString(),
      dateUpdated: apiUser.dateUpdated || apiUser.updatedAt || new Date().toISOString(),
      lastLoginAt: apiUser.lastLoginAt,
      email: apiUser.email || apiUser.username,
      status: this.mapApiStatusToDfnsUserStatus(apiUser.status || 'Active')
    };
  }

  /**
   * Map API status to DfnsUserStatus enum
   */
  private mapApiStatusToDfnsUserStatus(apiStatus: string): DfnsUserStatus {
    switch (apiStatus) {
      case 'Active': return DfnsUserStatus.Active;
      case 'Inactive': return DfnsUserStatus.Inactive;
      case 'Pending': return DfnsUserStatus.Pending;
      case 'Archived': return DfnsUserStatus.Archived;
      default: return DfnsUserStatus.Active;
    }
  }

  /**
   * Check if user exists by userId
   */
  async userExists(userId: string): Promise<boolean> {
    try {
      await this.getUser(userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search users by email
   */
  async findUserByEmail(email: string): Promise<DfnsUser | null> {
    try {
      const response = await this.listUsers();
      const user = response.items.find(u => u.username === email);
      return user || null;
    } catch (error) {
      console.error('Failed to search users by email:', error);
      return null;
    }
  }
}

export default DfnsUserManager;
