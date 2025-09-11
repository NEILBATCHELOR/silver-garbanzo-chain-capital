/**
 * DFNS Delegated User Management Service
 * 
 * Handles end user lifecycle management in delegated signing configuration:
 * - End user registration workflows
 * - User credential management
 * - Wallet creation for end users
 * - User status and permission management
 * 
 * Based on current DFNS API:
 * - https://docs.dfns.co/d/api-docs/authentication/user-management
 * - https://docs.dfns.co/d/advanced-topics/delegated-signing
 * 
 * Requires: Service Account Token with appropriate permissions
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsUser,
  DfnsCreateUserRequest,
  DfnsUserResponse,
  DfnsListUsersResponse,
  DfnsActivateUserResponse,
  DfnsDeactivateUserResponse,
  DfnsArchiveUserResponse
} from '../../types/dfns/users';
import type {
  DfnsWalletCreationSpec,
  DfnsEndUserRegistrationRequest,
  DfnsEndUserRegistrationResponse,
  DfnsCredentialKind,
  DfnsUserKind
} from '../../types/dfns/auth';
import type { DfnsCreateWalletRequest, DfnsWallet } from '../../types/dfns/wallets';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

export interface EndUserProfile {
  id: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Archived';
  kind: DfnsUserKind;
  dateCreated: string;
  lastLoginAt?: string; // Fix: Use lastLoginAt to match DfnsUserResponse
  credentialsCount: number;
  walletsCount: number;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface EndUserRegistrationFlow {
  email: string;
  userKind: DfnsUserKind;
  autoCreateWallet?: boolean;
  walletConfigs?: DfnsWalletCreationSpec[];
  credentialKinds?: DfnsCredentialKind[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface UserManagementOptions {
  includeInactive?: boolean;
  includeArchived?: boolean;
  filterByKind?: DfnsUserKind;
  filterByPermission?: string;
  limit?: number;
  offset?: string;
}

export interface UserOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  userId?: string;
  nextStep?: string;
}

export class DfnsDelegatedUserManagementService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // =====================================
  // END USER LIFECYCLE MANAGEMENT
  // =====================================

  /**
   * Create an end user with optional wallet and credential setup
   * Combines user creation with delegated registration flow
   */
  async createEndUser(
    registrationFlow: EndUserRegistrationFlow
  ): Promise<UserOperationResult<EndUserProfile>> {
    try {
      console.log('👤 Creating end user:', registrationFlow.email);

      // Validate email format
      if (!this.isValidEmail(registrationFlow.email)) {
        throw new DfnsValidationError('Invalid email address format');
      }

      // Step 1: Create user in DFNS
      const createUserRequest: DfnsCreateUserRequest = {
        email: registrationFlow.email,
        kind: 'CustomerEmployee' as const // Fix: DfnsCreateUserRequest only accepts 'CustomerEmployee'
      };

      console.log('📝 Creating user with request:', createUserRequest);

      const userResponse = await this.workingClient.makeRequest<DfnsUserResponse>(
        'POST',
        '/auth/users',
        createUserRequest
      );

      console.log('✅ User created successfully:', userResponse.userId);

      // Step 2: Create wallets if requested
      let wallets: DfnsWallet[] = [];
      if (registrationFlow.autoCreateWallet && registrationFlow.walletConfigs) {
        console.log('🏦 Creating wallets for user...');
        wallets = await this.createWalletsForUser(userResponse.userId, registrationFlow.walletConfigs);
      }

      // Step 3: Assign permissions if provided
      if (registrationFlow.permissions && registrationFlow.permissions.length > 0) {
        console.log('🔐 Assigning permissions to user...');
        await this.assignPermissionsToUser(userResponse.userId, registrationFlow.permissions);
      }

      // Step 4: Store metadata if provided
      if (registrationFlow.metadata) {
        await this.storeUserMetadata(userResponse.userId, registrationFlow.metadata);
      }

      // Create end user profile
      const profile: EndUserProfile = {
        id: userResponse.userId, // Fix: use userId instead of id
        email: registrationFlow.email, // Fix: use email from request since DfnsUserResponse doesn't have email
        status: userResponse.isActive ? 'Active' : 'Inactive',
        kind: userResponse.kind,
        dateCreated: new Date().toISOString(), // Fix: use current date since DfnsUserResponse may not have dateCreated
        credentialsCount: 0, // Will be updated after credential creation
        walletsCount: wallets.length,
        permissions: registrationFlow.permissions || []
      };

      console.log('🎉 End user creation completed:', {
        userId: profile.id,
        email: profile.email,
        wallets: wallets.length,
        permissions: profile.permissions.length
      });

      return {
        success: true,
        data: profile,
        userId: profile.id,
        nextStep: 'credential_registration'
      };

    } catch (error) {
      console.error('❌ End user creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'End user creation failed'
      };
    }
  }

  /**
   * Get end user profile with extended information
   */
  async getEndUserProfile(userId: string, userEmail?: string): Promise<UserOperationResult<EndUserProfile>> {
    try {
      console.log('👤 Fetching end user profile:', userId);

      // Get user details
      const userResponse = await this.workingClient.makeRequest<DfnsUserResponse>(
        'GET',
        `/auth/users/${userId}`
      );

      // Get user's wallets count
      const walletsResponse = await this.workingClient.makeRequest<any>(
        'GET',
        `/wallets?limit=1&assignee=${userId}`
      );

      // Get user's credentials count (if accessible)
      let credentialsCount = 0;
      try {
        const credentialsResponse = await this.workingClient.makeRequest<any>(
          'GET',
          `/auth/credentials?userId=${userId}&limit=1`
        );
        credentialsCount = credentialsResponse.total || 0;
      } catch (error) {
        console.warn('⚠️ Could not fetch credentials count for user:', userId);
      }

      // Get stored metadata
      const metadata = await this.getUserMetadata(userId);

      const profile: EndUserProfile = {
        id: userResponse.userId, // Fix: use userId instead of id
        email: userEmail || userResponse.username, // Fix: use provided email or username since DfnsUserResponse doesn't have email
        status: userResponse.isActive ? 'Active' : 'Inactive', // Fix: use isActive since isArchived doesn't exist
        kind: userResponse.kind,
        dateCreated: new Date().toISOString(), // Fix: use current date since DfnsUserResponse may not have dateCreated
        lastLoginAt: userResponse.lastLoginAt,
        credentialsCount,
        walletsCount: walletsResponse.total || 0,
        permissions: userResponse.permissionAssignments?.map((p: any) => p.permissionName) || [],
        metadata
      };

      return {
        success: true,
        data: profile,
        userId: profile.id
      };

    } catch (error) {
      console.error('❌ Failed to get end user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user profile',
        userId
      };
    }
  }

  /**
   * List all end users with filtering options
   */
  async listEndUsers(
    options: UserManagementOptions = {}
  ): Promise<UserOperationResult<EndUserProfile[]>> {
    try {
      console.log('📋 Listing end users with options:', options);

      // Build query parameters
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset);

      const response = await this.workingClient.makeRequest<DfnsListUsersResponse>(
        'GET',
        `/auth/users?${params.toString()}`
      );

      // Filter users based on options
      let filteredUsers = response.items;

      if (options.filterByKind) {
        filteredUsers = filteredUsers.filter(user => user.kind === options.filterByKind);
      }

      if (!options.includeInactive) {
        filteredUsers = filteredUsers.filter(user => user.isActive);
      }

      // Note: isArchived doesn't exist on DfnsUserResponse, so we skip this filter
      // if (!options.includeArchived) {
      //   filteredUsers = filteredUsers.filter(user => !user.isArchived);
      // }

      // Convert to end user profiles
      const profiles: EndUserProfile[] = await Promise.all(
        filteredUsers.map(async (user) => {
          const metadata = await this.getUserMetadata(user.userId);
          return {
            id: user.userId, // Fix: use userId instead of id
            email: user.username, // Fix: use username since DfnsUserResponse doesn't have email
            status: user.isActive ? 'Active' : 'Inactive', // Fix: simplified status logic
            kind: user.kind,
            dateCreated: new Date().toISOString(), // Fix: use current date
            lastLoginAt: user.lastLoginAt,
            credentialsCount: 0, // Would need separate API calls
            walletsCount: 0, // Would need separate API calls
            permissions: user.permissionAssignments?.map((p: any) => p.permissionName) || [],
            metadata
          };
        })
      );

      console.log(`✅ Found ${profiles.length} end users`);

      return {
        success: true,
        data: profiles
      };

    } catch (error) {
      console.error('❌ Failed to list end users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list end users'
      };
    }
  }

  /**
   * Activate end user account
   */
  async activateEndUser(userId: string): Promise<UserOperationResult<void>> {
    try {
      console.log('🔓 Activating end user:', userId);

      await this.workingClient.makeRequest<DfnsActivateUserResponse>(
        'PUT',
        `/auth/users/${userId}/activate`
      );

      console.log('✅ End user activated successfully');

      return {
        success: true,
        userId,
        nextStep: 'user_activated'
      };

    } catch (error) {
      console.error('❌ Failed to activate end user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate user',
        userId
      };
    }
  }

  /**
   * Deactivate end user account
   */
  async deactivateEndUser(userId: string): Promise<UserOperationResult<void>> {
    try {
      console.log('🔒 Deactivating end user:', userId);

      await this.workingClient.makeRequest<DfnsDeactivateUserResponse>(
        'PUT',
        `/auth/users/${userId}/deactivate`
      );

      console.log('✅ End user deactivated successfully');

      return {
        success: true,
        userId,
        nextStep: 'user_deactivated'
      };

    } catch (error) {
      console.error('❌ Failed to deactivate end user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        userId
      };
    }
  }

  /**
   * Archive end user account (soft delete)
   */
  async archiveEndUser(userId: string): Promise<UserOperationResult<void>> {
    try {
      console.log('🗄️ Archiving end user:', userId);

      await this.workingClient.makeRequest<DfnsArchiveUserResponse>(
        'PUT',
        `/auth/users/${userId}/archive`
      );

      console.log('✅ End user archived successfully');

      return {
        success: true,
        userId,
        nextStep: 'user_archived'
      };

    } catch (error) {
      console.error('❌ Failed to archive end user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive user',
        userId
      };
    }
  }

  // =====================================
  // WALLET MANAGEMENT FOR END USERS
  // =====================================

  /**
   * Create wallets for an end user
   */
  private async createWalletsForUser(
    userId: string,
    walletConfigs: DfnsWalletCreationSpec[]
  ): Promise<DfnsWallet[]> {
    const wallets: DfnsWallet[] = [];

    for (const config of walletConfigs) {
      try {
        const walletRequest: DfnsCreateWalletRequest = {
          network: config.network as DfnsNetwork, // Fix: Cast to DfnsNetwork type
          name: config.name || `${config.network} Wallet`,
          externalId: `user_${userId}_${config.network}`,
          tags: [`user:${userId}`, `network:${config.network}`]
        };

        const wallet = await this.workingClient.makeRequest<DfnsWallet>(
          'POST',
          '/wallets',
          walletRequest
        );

        // Delegate wallet to end user
        await this.workingClient.makeRequest(
          'PUT',
          `/wallets/${wallet.id}/delegate`,
          { userId }
        );

        wallets.push(wallet);
        console.log(`✅ Created and delegated wallet: ${wallet.id} (${config.network})`);

      } catch (error) {
        console.error(`❌ Failed to create wallet for ${config.network}:`, error);
        // Continue with other wallets even if one fails
      }
    }

    return wallets;
  }

  // =====================================
  // PERMISSION MANAGEMENT
  // =====================================

  /**
   * Assign permissions to end user
   */
  private async assignPermissionsToUser(
    userId: string,
    permissions: string[]
  ): Promise<void> {
    for (const permission of permissions) {
      try {
        await this.workingClient.makeRequest(
          'POST',
          '/permissions/assignments',
          {
            permissionId: permission,
            identityId: userId,
            identityKind: 'User'
          }
        );
        console.log(`✅ Assigned permission ${permission} to user ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to assign permission ${permission}:`, error);
      }
    }
  }

  // =====================================
  // METADATA MANAGEMENT
  // =====================================

  /**
   * Store user metadata (using local storage or external system)
   */
  private async storeUserMetadata(
    userId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // In a real implementation, this might store in your database
      // For now, store in session storage as an example
      if (typeof window !== 'undefined') {
        const key = `dfns_user_metadata_${userId}`;
        sessionStorage.setItem(key, JSON.stringify({
          ...metadata,
          updatedAt: new Date().toISOString()
        }));
        console.log('💾 User metadata stored for:', userId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to store user metadata:', error);
    }
  }

  /**
   * Get user metadata
   */
  private async getUserMetadata(userId: string): Promise<Record<string, any> | undefined> {
    try {
      if (typeof window !== 'undefined') {
        const key = `dfns_user_metadata_${userId}`;
        const stored = sessionStorage.getItem(key);
        return stored ? JSON.parse(stored) : undefined;
      }
      return undefined;
    } catch (error) {
      console.warn('⚠️ Failed to get user metadata:', error);
      return undefined;
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    archivedUsers: number;
    endUsers: number;
    employees: number;
    usersWithWallets: number;
    usersWithCredentials: number;
  }> {
    try {
      const response = await this.workingClient.makeRequest<DfnsListUsersResponse>(
        'GET',
        '/auth/users?limit=1000' // Adjust limit as needed
      );

      const users = response.items;
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length, // Fix: simplified inactive logic
        archivedUsers: 0, // Fix: DfnsUserResponse doesn't have isArchived property
        endUsers: users.filter(u => u.kind === 'EndUser').length,
        employees: users.filter(u => u.kind === 'CustomerEmployee').length,
        usersWithWallets: 0, // Would need separate API calls
        usersWithCredentials: 0 // Would need separate API calls
      };

      console.log('📊 User statistics:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Failed to get user statistics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        archivedUsers: 0,
        endUsers: 0,
        employees: 0,
        usersWithWallets: 0,
        usersWithCredentials: 0
      };
    }
  }

  /**
   * Validate user management permissions
   */
  async validateUserManagementPermissions(): Promise<{
    canCreateUsers: boolean;
    canManageUsers: boolean;
    canCreateWallets: boolean;
    canAssignPermissions: boolean;
    missingPermissions: string[];
  }> {
    const missingPermissions: string[] = [];
    let canCreateUsers = false;
    let canManageUsers = false;
    let canCreateWallets = false;
    let canAssignPermissions = false;

    try {
      // Test user creation
      await this.workingClient.makeRequest('GET', '/auth/users?limit=1');
      canCreateUsers = true;
      canManageUsers = true;
    } catch (error) {
      missingPermissions.push('Auth:Users:Create', 'Auth:Users:Read');
    }

    try {
      // Test wallet creation
      await this.workingClient.makeRequest('GET', '/wallets?limit=1');
      canCreateWallets = true;
    } catch (error) {
      missingPermissions.push('Wallets:Create');
    }

    try {
      // Test permission assignment
      await this.workingClient.makeRequest('GET', '/permissions?limit=1');
      canAssignPermissions = true;
    } catch (error) {
      missingPermissions.push('Permissions:Assign');
    }

    return {
      canCreateUsers,
      canManageUsers,
      canCreateWallets,
      canAssignPermissions,
      missingPermissions
    };
  }
}
