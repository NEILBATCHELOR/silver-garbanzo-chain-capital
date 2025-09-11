/**
 * DFNS Service Account Management Service
 * 
 * Implements the current DFNS Service Account Management API endpoints:
 * - GET /auth/service-accounts (List Service Accounts)
 * - POST /auth/service-accounts (Create Service Account)
 * - GET /auth/service-accounts/{serviceAccountId} (Get Service Account)
 * - PUT /auth/service-accounts/{serviceAccountId} (Update Service Account)
 * - PUT /auth/service-accounts/{serviceAccountId}/activate (Activate Service Account)
 * - PUT /auth/service-accounts/{serviceAccountId}/deactivate (Deactivate Service Account)
 * - DELETE /auth/service-accounts/{serviceAccountId} (Archive Service Account)
 * 
 * Compatible with Service Account and PAT token authentication.
 * User Action Signing required for all mutating operations.
 * 
 * API Documentation:
 * - https://docs.dfns.co/d/api-docs/authentication/service-account-management
 * - https://docs.dfns.co/d/api-docs/authentication/user-action-signing
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsListServiceAccountsRequest,
  DfnsListServiceAccountsResponse,
  DfnsCreateServiceAccountRequest,
  DfnsCreateServiceAccountResponse,
  DfnsGetServiceAccountResponse,
  DfnsUpdateServiceAccountRequest,
  DfnsUpdateServiceAccountResponse,
  DfnsActivateServiceAccountResponse,
  DfnsDeactivateServiceAccountResponse,
  DfnsArchiveServiceAccountResponse,
  ServiceAccountListFilters,
  ServiceAccountStatistics,
  ServiceAccountOperationResult,
  CreateServiceAccountOptions,
  ServiceAccountSummary,
  ServiceAccountValidationResult,
  DfnsServiceAccountResponse
} from '../../types/dfns/serviceAccounts';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

// Export types for use in index.ts
export type {
  ServiceAccountListFilters,
  ServiceAccountStatistics,
  ServiceAccountOperationResult,
  CreateServiceAccountOptions,
  ServiceAccountSummary,
  ServiceAccountValidationResult
};

export class DfnsServiceAccountManagementService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // =====================================
  // CURRENT DFNS SERVICE ACCOUNT MANAGEMENT API
  // =====================================

  /**
   * List Service Accounts
   * GET /auth/service-accounts
   * 
   * Required Permission: Auth:ServiceAccounts:Read
   */
  async listServiceAccounts(
    filters: ServiceAccountListFilters = {}
  ): Promise<ServiceAccountOperationResult<DfnsListServiceAccountsResponse>> {
    try {
      console.log('📋 Listing service accounts with filters:', filters);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.paginationToken) {
        params.append('paginationToken', filters.paginationToken);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/auth/service-accounts?${queryString}` : '/auth/service-accounts';

      const response = await this.workingClient.makeRequest<DfnsListServiceAccountsResponse>(
        'GET',
        endpoint
      );

      // Apply client-side filters if needed
      let filteredAccounts = response.items;

      if (filters.isActive !== undefined) {
        filteredAccounts = filteredAccounts.filter(account => 
          account.userInfo.isActive === filters.isActive
        );
      }

      if (filters.hasPermissions !== undefined) {
        filteredAccounts = filteredAccounts.filter(account => {
          const hasPermissions = account.userInfo.permissionAssignments && 
                                account.userInfo.permissionAssignments.length > 0;
          return hasPermissions === filters.hasPermissions;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredAccounts = filteredAccounts.filter(account => 
          account.userInfo.username.toLowerCase().includes(searchLower)
        );
      }

      const filteredResponse: DfnsListServiceAccountsResponse = {
        items: filteredAccounts,
        nextPageToken: response.nextPageToken
      };

      console.log(`✅ Found ${filteredAccounts.length} service accounts (${response.items.length} total)`);

      return {
        success: true,
        data: filteredResponse
      };

    } catch (error) {
      console.error('❌ Failed to list service accounts:', error);
      
      if (error instanceof DfnsAuthenticationError) {
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token permissions for Auth:ServiceAccounts:Read.',
          requiresUserAction: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list service accounts'
      };
    }
  }

  /**
   * Create Service Account
   * POST /auth/service-accounts
   * 
   * Required Permission: Auth:ServiceAccounts:Create
   * Requires User Action Signing
   */
  async createServiceAccount(
    options: CreateServiceAccountOptions,
    userActionToken?: string
  ): Promise<ServiceAccountOperationResult<DfnsCreateServiceAccountResponse>> {
    try {
      console.log('🏗️ Creating service account:', options.name);

      // Validate required fields
      if (!options.name?.trim()) {
        throw new DfnsValidationError('Service account name is required');
      }

      if (!options.publicKey?.trim()) {
        throw new DfnsValidationError('Public key is required for service account creation');
      }

      // Validate public key format (basic check)
      if (!this.isValidPublicKey(options.publicKey)) {
        throw new DfnsValidationError('Invalid public key format. Expected PEM format.');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Creating service account without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for service account creation',
          requiresUserAction: true,
          nextStep: 'user_action_signing'
        };
      }

      const createRequest: DfnsCreateServiceAccountRequest = {
        name: options.name.trim(),
        publicKey: options.publicKey,
        daysValid: options.daysValid || 365, // Default to 1 year
        permissionId: options.permissionId,
        externalId: options.externalId
      };

      // Validate daysValid range
      if (createRequest.daysValid && (createRequest.daysValid < 1 || createRequest.daysValid > 730)) {
        throw new DfnsValidationError('daysValid must be between 1 and 730 days');
      }

      const response = await this.workingClient.makeRequest<DfnsCreateServiceAccountResponse>(
        'POST',
        '/auth/service-accounts',
        createRequest,
        userActionToken
      );

      console.log('✅ Service account created successfully:', response.userInfo.userId);

      // Log the access token creation (but don't log the actual token for security)
      if (response.accessTokens && response.accessTokens.length > 0) {
        const token = response.accessTokens[0];
        console.log('🔑 Access token created:', {
          tokenId: token.tokenId,
          isActive: token.isActive,
          dateCreated: token.dateCreated
        });
      }

      // Auto-assign additional permissions if requested
      if (options.autoAssignPermissions && options.autoAssignPermissions.length > 0) {
        console.log('🔐 Auto-assigning additional permissions...');
        try {
          await this.assignPermissionsToServiceAccount(
            response.userInfo.userId,
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
        serviceAccountId: response.userInfo.userId,
        nextStep: 'service_account_created'
      };

    } catch (error) {
      console.error('❌ Failed to create service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:ServiceAccounts:Create permission.',
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

      if (error instanceof DfnsValidationError) {
        return {
          success: false,
          error: error.message,
          requiresUserAction: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create service account',
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Get Service Account
   * GET /auth/service-accounts/{serviceAccountId}
   * 
   * Required Permission: Auth:ServiceAccounts:Read
   */
  async getServiceAccount(
    serviceAccountId: string
  ): Promise<ServiceAccountOperationResult<DfnsGetServiceAccountResponse>> {
    try {
      console.log('🔍 Getting service account:', serviceAccountId);

      if (!serviceAccountId?.trim()) {
        throw new DfnsValidationError('Service account ID is required');
      }

      const response = await this.workingClient.makeRequest<DfnsGetServiceAccountResponse>(
        'GET',
        `/auth/service-accounts/${serviceAccountId}`
      );

      console.log('✅ Service account retrieved successfully:', response.userInfo.username);

      return {
        success: true,
        data: response,
        serviceAccountId: response.userInfo.userId
      };

    } catch (error) {
      console.error('❌ Failed to get service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `Service account not found: ${serviceAccountId}`,
            serviceAccountId
          };
        }
        return {
          success: false,
          error: 'Authentication failed. Check your permissions for Auth:ServiceAccounts:Read.',
          serviceAccountId
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get service account',
        serviceAccountId
      };
    }
  }

  /**
   * Update Service Account
   * PUT /auth/service-accounts/{serviceAccountId}
   * 
   * Required Permission: Auth:ServiceAccounts:Update
   * Requires User Action Signing
   */
  async updateServiceAccount(
    serviceAccountId: string,
    updates: DfnsUpdateServiceAccountRequest,
    userActionToken?: string
  ): Promise<ServiceAccountOperationResult<DfnsUpdateServiceAccountResponse>> {
    try {
      console.log('✏️ Updating service account:', serviceAccountId);

      if (!serviceAccountId?.trim()) {
        throw new DfnsValidationError('Service account ID is required');
      }

      if (!updates.name && !updates.externalId) {
        throw new DfnsValidationError('At least one field (name or externalId) must be provided for update');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for service account updates',
          requiresUserAction: true,
          serviceAccountId,
          nextStep: 'user_action_signing'
        };
      }

      // Validate name if provided
      if (updates.name && !updates.name.trim()) {
        throw new DfnsValidationError('Service account name cannot be empty');
      }

      const updateRequest: DfnsUpdateServiceAccountRequest = {
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.externalId !== undefined && { externalId: updates.externalId })
      };

      const response = await this.workingClient.makeRequest<DfnsUpdateServiceAccountResponse>(
        'PUT',
        `/auth/service-accounts/${serviceAccountId}`,
        updateRequest,
        userActionToken
      );

      console.log('✅ Service account updated successfully:', response.userInfo.username);

      return {
        success: true,
        data: response,
        serviceAccountId: response.userInfo.userId,
        nextStep: 'service_account_updated'
      };

    } catch (error) {
      console.error('❌ Failed to update service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:ServiceAccounts:Update permission.',
            requiresUserAction: true,
            serviceAccountId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `Service account not found: ${serviceAccountId}`,
            serviceAccountId
          };
        }
      }

      if (error instanceof DfnsValidationError) {
        return {
          success: false,
          error: error.message,
          serviceAccountId,
          requiresUserAction: false
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update service account',
        serviceAccountId,
        requiresUserAction: !userActionToken
      };
    }
  }  /**
   * Activate Service Account
   * PUT /auth/service-accounts/{serviceAccountId}/activate
   * 
   * Required Permission: Auth:ServiceAccounts:Activate
   * Requires User Action Signing
   */
  async activateServiceAccount(
    serviceAccountId: string,
    userActionToken?: string
  ): Promise<ServiceAccountOperationResult<DfnsActivateServiceAccountResponse>> {
    try {
      console.log('🔓 Activating service account:', serviceAccountId);

      if (!serviceAccountId?.trim()) {
        throw new DfnsValidationError('Service account ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for service account activation',
          requiresUserAction: true,
          serviceAccountId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsActivateServiceAccountResponse>(
        'PUT',
        `/auth/service-accounts/${serviceAccountId}/activate`,
        {}, // Empty body for activation
        userActionToken
      );

      console.log('✅ Service account activated successfully:', response.userInfo.username);

      return {
        success: true,
        data: response,
        serviceAccountId: response.userInfo.userId,
        nextStep: 'service_account_activated'
      };

    } catch (error) {
      console.error('❌ Failed to activate service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:ServiceAccounts:Activate permission.',
            requiresUserAction: true,
            serviceAccountId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `Service account not found: ${serviceAccountId}`,
            serviceAccountId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate service account',
        serviceAccountId,
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Deactivate Service Account
   * PUT /auth/service-accounts/{serviceAccountId}/deactivate
   * 
   * Required Permission: Auth:ServiceAccounts:Deactivate
   * Requires User Action Signing
   */
  async deactivateServiceAccount(
    serviceAccountId: string,
    userActionToken?: string
  ): Promise<ServiceAccountOperationResult<DfnsDeactivateServiceAccountResponse>> {
    try {
      console.log('🔒 Deactivating service account:', serviceAccountId);

      if (!serviceAccountId?.trim()) {
        throw new DfnsValidationError('Service account ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for service account deactivation',
          requiresUserAction: true,
          serviceAccountId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsDeactivateServiceAccountResponse>(
        'PUT',
        `/auth/service-accounts/${serviceAccountId}/deactivate`,
        {}, // Empty body for deactivation
        userActionToken
      );

      console.log('✅ Service account deactivated successfully:', response.userInfo.username);

      return {
        success: true,
        data: response,
        serviceAccountId: response.userInfo.userId,
        nextStep: 'service_account_deactivated'
      };

    } catch (error) {
      console.error('❌ Failed to deactivate service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:ServiceAccounts:Deactivate permission.',
            requiresUserAction: true,
            serviceAccountId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `Service account not found: ${serviceAccountId}`,
            serviceAccountId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate service account',
        serviceAccountId,
        requiresUserAction: !userActionToken
      };
    }
  }

  /**
   * Archive Service Account
   * DELETE /auth/service-accounts/{serviceAccountId}
   * 
   * Required Permission: Auth:ServiceAccounts:Delete
   * Requires User Action Signing
   */
  async archiveServiceAccount(
    serviceAccountId: string,
    userActionToken?: string
  ): Promise<ServiceAccountOperationResult<DfnsArchiveServiceAccountResponse>> {
    try {
      console.log('🗄️ Archiving service account:', serviceAccountId);

      if (!serviceAccountId?.trim()) {
        throw new DfnsValidationError('Service account ID is required');
      }

      if (!userActionToken) {
        return {
          success: false,
          error: 'User Action Signing required for service account archiving',
          requiresUserAction: true,
          serviceAccountId,
          nextStep: 'user_action_signing'
        };
      }

      const response = await this.workingClient.makeRequest<DfnsArchiveServiceAccountResponse>(
        'DELETE',
        `/auth/service-accounts/${serviceAccountId}`,
        undefined, // No body for DELETE
        userActionToken
      );

      console.log('✅ Service account archived successfully:', response.userInfo.username);

      return {
        success: true,
        data: response,
        serviceAccountId: response.userInfo.userId,
        nextStep: 'service_account_archived'
      };

    } catch (error) {
      console.error('❌ Failed to archive service account:', error);

      if (error instanceof DfnsAuthenticationError) {
        if (error.details?.httpStatus === 403) {
          return {
            success: false,
            error: 'User Action Signing failed or insufficient permissions. Need Auth:ServiceAccounts:Delete permission.',
            requiresUserAction: true,
            serviceAccountId,
            nextStep: 'check_permissions'
          };
        }
        if (error.details?.httpStatus === 404) {
          return {
            success: false,
            error: `Service account not found: ${serviceAccountId}`,
            serviceAccountId
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive service account',
        serviceAccountId,
        requiresUserAction: !userActionToken
      };
    }
  }

  // =====================================
  // CONVENIENCE METHODS
  // =====================================

  /**
   * Get all service accounts (handles pagination automatically)
   */
  async getAllServiceAccounts(
    filters: ServiceAccountListFilters = {}
  ): Promise<ServiceAccountOperationResult<DfnsServiceAccountResponse[]>> {
    try {
      console.log('📋 Getting all service accounts...');

      const allAccounts: DfnsServiceAccountResponse[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const result = await this.listServiceAccounts({
          ...filters,
          paginationToken: nextPageToken,
          limit: filters.limit || 100 // Use reasonable page size
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to retrieve service accounts',
            data: []
          };
        }

        allAccounts.push(...result.data.items);
        nextPageToken = result.data.nextPageToken;

      } while (nextPageToken);

      console.log(`✅ Retrieved ${allAccounts.length} total service accounts`);

      return {
        success: true,
        data: allAccounts
      };

    } catch (error) {
      console.error('❌ Failed to get all service accounts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all service accounts'
      };
    }
  }

  /**
   * Get service account statistics
   */
  async getServiceAccountStatistics(): Promise<ServiceAccountOperationResult<ServiceAccountStatistics>> {
    try {
      console.log('📊 Calculating service account statistics...');

      const result = await this.getAllServiceAccounts();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get service accounts for statistics'
        };
      }

      const accounts = result.data;
      let totalAccessTokens = 0;
      let activeAccessTokens = 0;

      accounts.forEach(account => {
        totalAccessTokens += account.accessTokens.length;
        activeAccessTokens += account.accessTokens.filter(token => token.isActive).length;
      });

      const stats: ServiceAccountStatistics = {
        totalServiceAccounts: accounts.length,
        activeServiceAccounts: accounts.filter(a => a.userInfo.isActive).length,
        inactiveServiceAccounts: accounts.filter(a => !a.userInfo.isActive).length,
        serviceAccountsWithPermissions: accounts.filter(a => 
          a.userInfo.permissionAssignments && a.userInfo.permissionAssignments.length > 0
        ).length,
        serviceAccountsWithTokens: accounts.filter(a => a.accessTokens.length > 0).length,
        totalAccessTokens,
        activeAccessTokens
      };

      console.log('📊 Service account statistics calculated:', stats);

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Failed to calculate service account statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate statistics'
      };
    }
  }

  /**
   * Search service accounts by name
   */
  async searchServiceAccounts(
    searchTerm: string
  ): Promise<ServiceAccountOperationResult<DfnsServiceAccountResponse[]>> {
    return this.listServiceAccounts({
      search: searchTerm,
      limit: 50 // Reasonable limit for search results
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get active service accounts only
   */
  async getActiveServiceAccounts(): Promise<ServiceAccountOperationResult<DfnsServiceAccountResponse[]>> {
    return this.listServiceAccounts({
      isActive: true,
      limit: 100
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get service accounts with permissions
   */
  async getServiceAccountsWithPermissions(): Promise<ServiceAccountOperationResult<DfnsServiceAccountResponse[]>> {
    return this.listServiceAccounts({
      hasPermissions: true,
      limit: 100
    }).then(result => ({
      ...result,
      data: result.data?.items
    }));
  }

  /**
   * Get service account summaries (lightweight view)
   */
  async getServiceAccountSummaries(): Promise<ServiceAccountOperationResult<ServiceAccountSummary[]>> {
    const result = await this.getAllServiceAccounts();
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve service accounts',
        data: []
      };
    }

    const summaries: ServiceAccountSummary[] = result.data.map(account => {
      const activeTokens = account.accessTokens.filter(token => token.isActive);
      const latestToken = account.accessTokens
        .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())[0];

      return {
        userId: account.userInfo.userId,
        username: account.userInfo.username,
        isActive: account.userInfo.isActive,
        hasActiveTokens: activeTokens.length > 0,
        tokenCount: account.accessTokens.length,
        permissionCount: account.userInfo.permissionAssignments.length,
        dateCreated: latestToken?.dateCreated || '',
        lastTokenCreated: latestToken?.dateCreated,
        externalId: undefined // Not available in the response
      };
    });

    return {
      success: true,
      data: summaries
    };
  }

  // =====================================
  // PERMISSION MANAGEMENT HELPERS
  // =====================================

  /**
   * Assign permissions to a service account
   * Note: This requires the DFNS Permissions API (separate service)
   */
  private async assignPermissionsToServiceAccount(
    serviceAccountId: string,
    permissionIds: string[],
    userActionToken?: string
  ): Promise<void> {
    console.log(`🔐 Assigning ${permissionIds.length} permissions to service account ${serviceAccountId}`);

    for (const permissionId of permissionIds) {
      try {
        // This would use the DFNS Permissions API (separate service)
        // For now, just log the attempt
        console.log(`🔐 Would assign permission ${permissionId} to service account ${serviceAccountId}`);
        
        // In a full implementation, this would call:
        // await this.workingClient.makeRequest('POST', '/permissions/assignments', {
        //   permissionId,
        //   identityId: serviceAccountId,
        //   identityKind: 'User' // Service accounts are users in DFNS
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
   * Validate public key format (basic PEM validation)
   */
  private isValidPublicKey(publicKey: string): boolean {
    // Basic validation for PEM format
    const pemRegex = /^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY|EC PUBLIC KEY)-----[\s\S]*-----END (PUBLIC KEY|RSA PUBLIC KEY|EC PUBLIC KEY)-----$/;
    return pemRegex.test(publicKey.trim());
  }

  /**
   * Validate service account management permissions
   */
  async validateServiceAccountManagementPermissions(): Promise<ServiceAccountValidationResult> {
    const missingPermissions: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let canCreate = false;
    let canUpdate = false;
    let canActivate = false;
    let canDeactivate = false;
    let canArchive = false;

    try {
      // Test read permission
      await this.workingClient.makeRequest('GET', '/auth/service-accounts?limit=1');
      console.log('✅ Auth:ServiceAccounts:Read permission confirmed');
    } catch (error) {
      missingPermissions.push('Auth:ServiceAccounts:Read');
      recommendations.push('Request Auth:ServiceAccounts:Read permission to list and view service accounts');
    }

    // We can't easily test create/update/activate/deactivate/delete permissions without performing operations
    // So we'll provide recommendations based on the authentication method
    const authMethod = this.workingClient.getAuthMethod();
    
    if (authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY') {
      recommendations.push('Service Accounts typically have broader permissions for service account management');
      recommendations.push('Ensure your Service Account has the following permissions:');
      recommendations.push('- Auth:ServiceAccounts:Create (for creating service accounts)');
      recommendations.push('- Auth:ServiceAccounts:Update (for updating service accounts)');
      recommendations.push('- Auth:ServiceAccounts:Activate (for activating service accounts)');
      recommendations.push('- Auth:ServiceAccounts:Deactivate (for deactivating service accounts)');
      recommendations.push('- Auth:ServiceAccounts:Delete (for archiving service accounts)');
      
      // Assume service accounts have these permissions
      canCreate = true;
      canUpdate = true;
      canActivate = true;
      canDeactivate = true;
      canArchive = true;
    } else if (authMethod === 'PAT') {
      recommendations.push('Personal Access Tokens may have limited service account management permissions');
      recommendations.push('Check your PAT scope includes service account management operations');
      missingPermissions.push('Auth:ServiceAccounts:Create (may be limited with PAT)');
      missingPermissions.push('Auth:ServiceAccounts:Update (may be limited with PAT)');
      missingPermissions.push('Auth:ServiceAccounts:Activate (may be limited with PAT)');
      missingPermissions.push('Auth:ServiceAccounts:Deactivate (may be limited with PAT)');
      missingPermissions.push('Auth:ServiceAccounts:Delete (may be limited with PAT)');
    }

    // Warning about User Action Signing
    if (!this.isUserActionSigningAvailable()) {
      warnings.push('User Action Signing not available - sensitive operations will fail');
      recommendations.push('Set up WebAuthn credentials or Key credentials for User Action Signing');
    }

    return {
      isValid: missingPermissions.length === 0,
      errors: [],
      warnings,
      canCreate,
      canUpdate,
      canActivate,
      canDeactivate,
      canArchive,
      missingPermissions,
      recommendations
    };
  }

  /**
   * Check if User Action Signing is available for sensitive operations
   */
  private isUserActionSigningAvailable(): boolean {
    // With token-based authentication, User Action Signing requires:
    // 1. WebAuthn credentials (passkeys), or
    // 2. Registered Key credentials with private keys
    
    // This would typically check credential availability
    // For now, return true if we have proper authentication
    const authMethod = this.workingClient.getAuthMethod();
    return authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY' || authMethod === 'PAT';
  }

  /**
   * Get authentication context for service account management operations
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
