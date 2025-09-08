/**
 * DFNS Service Account Service
 * 
 * High-level business logic for service account management operations
 */

import type {
  DfnsListServiceAccountsRequest,
  DfnsListServiceAccountsResponse,
  DfnsCreateServiceAccountRequest,
  DfnsCreateServiceAccountResponse,
  DfnsUpdateServiceAccountRequest,
  DfnsServiceAccountInfo,
  DfnsServiceAccountOptions,
  DfnsServiceAccountSummary,
  DfnsServiceAccountBatchResult,
  DfnsValidatedServiceAccountParams,
  DfnsValidatedUpdateParams,
} from '../../types/dfns/serviceAccounts';

import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsValidationError, DfnsAuthenticationError } from '../../types/dfns/errors';

export class DfnsServiceAccountService {
  constructor(private authClient: DfnsAuthClient) {}

  // ===== CORE SERVICE ACCOUNT OPERATIONS =====

  /**
   * List service accounts with optional pagination
   */
  async listServiceAccounts(params?: DfnsListServiceAccountsRequest): Promise<DfnsListServiceAccountsResponse> {
    try {
      // Validate pagination parameters
      if (params?.limit && (params.limit < 1 || params.limit > 100)) {
        throw new DfnsValidationError('Limit must be between 1 and 100');
      }

      const response = await this.authClient.listServiceAccounts(params);
      
      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to list service accounts: ${error}`,
        { params }
      );
    }
  }

  /**
   * Get all service accounts (automatically handles pagination)
   */
  async getAllServiceAccounts(): Promise<DfnsServiceAccountInfo[]> {
    try {
      const allServiceAccounts: DfnsServiceAccountInfo[] = [];
      let paginationToken: string | undefined;
      
      do {
        const response = await this.listServiceAccounts({
          limit: 100,
          paginationToken,
        });
        
        allServiceAccounts.push(...response.items);
        paginationToken = response.nextPageToken;
      } while (paginationToken);
      
      return allServiceAccounts;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get all service accounts: ${error}`
      );
    }
  }

  /**
   * Create a new service account with validation
   */
  async createServiceAccount(
    params: DfnsCreateServiceAccountRequest,
    options: DfnsServiceAccountOptions = {}
  ): Promise<DfnsCreateServiceAccountResponse> {
    try {
      // Validate input parameters
      const validatedParams = this.validateCreateParams(params);
      
      const response = await this.authClient.createServiceAccount(validatedParams);
      
      // Optional: Sync to database
      if (options.syncToDatabase) {
        await this.syncServiceAccountToDatabase(response);
      }
      
      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to create service account: ${error}`,
        { params: { ...params, publicKey: '[REDACTED]' } }
      );
    }
  }

  /**
   * Get a specific service account by ID
   */
  async getServiceAccount(serviceAccountId: string): Promise<DfnsServiceAccountInfo> {
    try {
      this.validateServiceAccountId(serviceAccountId);
      
      const response = await this.authClient.getServiceAccount(serviceAccountId);
      
      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to get service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Find service account by name
   */
  async getServiceAccountByName(name: string): Promise<DfnsServiceAccountInfo | null> {
    try {
      if (!name || name.trim().length === 0) {
        throw new DfnsValidationError('Service account name cannot be empty');
      }
      
      const allServiceAccounts = await this.getAllServiceAccounts();
      
      const serviceAccount = allServiceAccounts.find(
        sa => sa.userInfo.username.toLowerCase() === name.toLowerCase()
      );
      
      return serviceAccount || null;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to find service account by name: ${error}`,
        { name }
      );
    }
  }

  /**
   * Update a service account
   */
  async updateServiceAccount(
    serviceAccountId: string,
    params: DfnsUpdateServiceAccountRequest,
    options: DfnsServiceAccountOptions = {}
  ): Promise<DfnsServiceAccountInfo> {
    try {
      this.validateServiceAccountId(serviceAccountId);
      const validatedParams = this.validateUpdateParams(params);
      
      const response = await this.authClient.updateServiceAccount(
        serviceAccountId,
        validatedParams
      );
      
      // Optional: Sync to database
      if (options.syncToDatabase) {
        await this.syncServiceAccountToDatabase(response);
      }
      
      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to update service account: ${error}`,
        { serviceAccountId, params }
      );
    }
  }

  // ===== SERVICE ACCOUNT LIFECYCLE MANAGEMENT =====

  /**
   * Activate a service account
   */
  async activateServiceAccount(
    serviceAccountId: string,
    options: DfnsServiceAccountOptions = {}
  ): Promise<DfnsServiceAccountInfo> {
    try {
      this.validateServiceAccountId(serviceAccountId);
      
      const response = await this.authClient.activateServiceAccount(serviceAccountId);
      
      // Optional: Sync to database
      if (options.syncToDatabase) {
        await this.syncServiceAccountToDatabase(response);
      }
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Deactivate a service account
   */
  async deactivateServiceAccount(
    serviceAccountId: string,
    options: DfnsServiceAccountOptions = {}
  ): Promise<DfnsServiceAccountInfo> {
    try {
      this.validateServiceAccountId(serviceAccountId);
      
      const response = await this.authClient.deactivateServiceAccount(serviceAccountId);
      
      // Optional: Sync to database
      if (options.syncToDatabase) {
        await this.syncServiceAccountToDatabase(response);
      }
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Archive a service account (soft delete)
   */
  async archiveServiceAccount(
    serviceAccountId: string,
    options: DfnsServiceAccountOptions = {}
  ): Promise<DfnsServiceAccountInfo> {
    try {
      this.validateServiceAccountId(serviceAccountId);
      
      const response = await this.authClient.archiveServiceAccount(serviceAccountId);
      
      // Optional: Sync to database
      if (options.syncToDatabase) {
        await this.syncServiceAccountToDatabase(response);
      }
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  // ===== BATCH OPERATIONS =====

  /**
   * Activate multiple service accounts
   */
  async activateServiceAccounts(serviceAccountIds: string[]): Promise<DfnsServiceAccountBatchResult> {
    return this.performBatchOperation(
      serviceAccountIds,
      'activate',
      (id) => this.activateServiceAccount(id)
    );
  }

  /**
   * Deactivate multiple service accounts
   */
  async deactivateServiceAccounts(serviceAccountIds: string[]): Promise<DfnsServiceAccountBatchResult> {
    return this.performBatchOperation(
      serviceAccountIds,
      'deactivate',
      (id) => this.deactivateServiceAccount(id)
    );
  }

  /**
   * Archive multiple service accounts
   */
  async archiveServiceAccounts(serviceAccountIds: string[]): Promise<DfnsServiceAccountBatchResult> {
    return this.performBatchOperation(
      serviceAccountIds,
      'archive',
      (id) => this.archiveServiceAccount(id)
    );
  }

  // ===== ENHANCED FEATURES =====

  /**
   * Get service accounts summary for dashboards
   */
  async getServiceAccountsSummary(): Promise<DfnsServiceAccountSummary[]> {
    try {
      const serviceAccounts = await this.getAllServiceAccounts();
      
      return serviceAccounts.map(sa => ({
        userId: sa.userInfo.userId,
        name: sa.userInfo.username,
        status: sa.userInfo.isActive ? 'Active' : 'Inactive',
        orgId: sa.userInfo.orgId,
        isActive: sa.userInfo.isActive,
        activeTokensCount: sa.accessTokens.filter(token => token.isActive).length,
        permissionCount: sa.userInfo.permissionAssignments.length,
        createdAt: sa.accessTokens[0]?.dateCreated || new Date().toISOString(),
        lastActiveAt: this.getLastActiveTime(sa.accessTokens),
      }));
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get service accounts summary: ${error}`
      );
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private validateServiceAccountId(serviceAccountId: string): void {
    if (!serviceAccountId || serviceAccountId.trim().length === 0) {
      throw new DfnsValidationError('Service account ID cannot be empty');
    }
    
    // DFNS user IDs start with 'us-'
    if (!serviceAccountId.startsWith('us-')) {
      throw new DfnsValidationError('Invalid service account ID format');
    }
  }

  private validateCreateParams(params: DfnsCreateServiceAccountRequest): DfnsValidatedServiceAccountParams {
    const errors: string[] = [];
    
    // Validate name
    if (!params.name || params.name.trim().length === 0) {
      errors.push('Service account name is required');
    } else if (params.name.length > 255) {
      errors.push('Service account name must be 255 characters or less');
    }
    
    // Validate public key
    if (!params.publicKey || params.publicKey.trim().length === 0) {
      errors.push('Public key is required');
    }
    
    // Validate days valid
    if (params.daysValid !== undefined) {
      if (params.daysValid < 1 || params.daysValid > 730) {
        errors.push('Days valid must be between 1 and 730');
      }
    }
    
    // Validate external ID
    if (params.externalId && params.externalId.length > 255) {
      errors.push('External ID must be 255 characters or less');
    }
    
    if (errors.length > 0) {
      throw new DfnsValidationError(`Validation failed: ${errors.join(', ')}`);
    }
    
    return {
      name: params.name.trim(),
      publicKey: params.publicKey.trim(),
      daysValid: params.daysValid || 365, // Default to 1 year
      permissionId: params.permissionId,
      externalId: params.externalId?.trim(),
    };
  }

  private validateUpdateParams(params: DfnsUpdateServiceAccountRequest): DfnsValidatedUpdateParams {
    const errors: string[] = [];
    
    // Validate name if provided
    if (params.name !== undefined) {
      if (params.name.trim().length === 0) {
        errors.push('Service account name cannot be empty');
      } else if (params.name.length > 255) {
        errors.push('Service account name must be 255 characters or less');
      }
    }
    
    // Validate external ID if provided
    if (params.externalId !== undefined && params.externalId.length > 255) {
      errors.push('External ID must be 255 characters or less');
    }
    
    if (errors.length > 0) {
      throw new DfnsValidationError(`Validation failed: ${errors.join(', ')}`);
    }
    
    return {
      name: params.name?.trim(),
      externalId: params.externalId?.trim(),
    };
  }

  private async performBatchOperation(
    serviceAccountIds: string[],
    operation: string,
    operationFn: (id: string) => Promise<DfnsServiceAccountInfo>
  ): Promise<DfnsServiceAccountBatchResult> {
    const successful: string[] = [];
    const failed: Array<{ userId: string; error: string }> = [];
    
    for (const serviceAccountId of serviceAccountIds) {
      try {
        await operationFn(serviceAccountId);
        successful.push(serviceAccountId);
      } catch (error) {
        failed.push({
          userId: serviceAccountId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return {
      successful,
      failed,
      total: serviceAccountIds.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  private async syncServiceAccountToDatabase(serviceAccount: DfnsServiceAccountInfo): Promise<void> {
    try {
      // TODO: Implement database synchronization
      // This would sync the service account data to the local dfns_service_accounts table
      console.log('Service account sync to database:', serviceAccount.userInfo.userId);
    } catch (error) {
      console.error('Failed to sync service account to database:', error);
      // Don't throw here - this is a non-critical operation
    }
  }

  private getLastActiveTime(accessTokens: any[]): string | undefined {
    if (!accessTokens || accessTokens.length === 0) {
      return undefined;
    }
    
    // Find the most recent dateCreated among active tokens
    const activeDates = accessTokens
      .filter(token => token.isActive)
      .map(token => token.dateCreated)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return activeDates[0];
  }
}
