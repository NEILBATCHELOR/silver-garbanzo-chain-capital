/**
 * DFNS Personal Access Token Service
 * 
 * High-level service for DFNS Personal Access Token management operations
 * Provides business logic, validation, and enhanced error handling
 */

import type {
  DfnsPersonalAccessToken,
  DfnsListPersonalAccessTokensResponse,
  DfnsCreatePersonalAccessTokenRequest,
  DfnsCreatePersonalAccessTokenResponse,
  DfnsGetPersonalAccessTokenResponse,
  DfnsUpdatePersonalAccessTokenRequest,
  DfnsUpdatePersonalAccessTokenResponse,
  DfnsActivatePersonalAccessTokenResponse,
  DfnsDeactivatePersonalAccessTokenResponse,
  DfnsArchivePersonalAccessTokenResponse,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { 
  DfnsValidationError, 
  DfnsAuthenticationError,
  DfnsAuthorizationError 
} from '../../types/dfns/errors';

// Service options for PAT operations
export interface PersonalAccessTokenServiceOptions {
  syncToDatabase?: boolean;
  autoActivate?: boolean;
  validatePermissions?: boolean;
}

// Enhanced PAT summary for dashboards
export interface PersonalAccessTokenSummary {
  tokenId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  permissionCount: number;
  daysSinceCreated: number;
  daysSinceLastUsed?: number;
  daysUntilExpiry?: number;
}

/**
 * Personal Access Token Service
 * 
 * Provides high-level business logic for DFNS Personal Access Token management
 * including validation, database synchronization, and enhanced operations
 */
export class PersonalAccessTokenService {
  constructor(
    private authClient: DfnsAuthClient,
    private userActionService: DfnsUserActionService
  ) {}

  // ===============================
  // Core PAT Operations
  // ===============================

  /**
   * Get all personal access tokens (alias for listPersonalAccessTokens for compatibility)
   */
  async getAllPersonalAccessTokens(
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsPersonalAccessToken[]> {
    return this.listPersonalAccessTokens(options);
  }

  /**
   * List all personal access tokens for the current user
   */
  async listPersonalAccessTokens(
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsPersonalAccessToken[]> {
    try {
      const response = await this.authClient.listPersonalAccessTokens();
      const tokens = response.items;

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokensToDatabase(tokens);
      }

      return tokens;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list personal access tokens: ${error}`,
        { operation: 'listPersonalAccessTokens' }
      );
    }
  }

  /**
   * Create a new personal access token with User Action Signing
   */
  async createPersonalAccessToken(
    request: DfnsCreatePersonalAccessTokenRequest,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsCreatePersonalAccessTokenResponse> {
    try {
      // Validate request
      this.validateCreateRequest(request);

      // Validate permissions if requested
      if (options.validatePermissions && request.permissionId) {
        await this.validatePermissionId(request.permissionId);
      }

      // Use User Action Signing for this sensitive operation
      const userActionToken = await this.userActionService.signUserAction(
        'CreatePersonalAccessToken',
        request,
        { persistToDb: true }
      );

      // Create the PAT
      const response = await this.authClient.createPersonalAccessToken(
        request,
        userActionToken
      );

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      // Optional auto-activation (if created in inactive state)
      if (options.autoActivate && !response.isActive) {
        await this.activatePersonalAccessToken(response.tokenId);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to create personal access token: ${error}`,
        { request, operation: 'createPersonalAccessToken' }
      );
    }
  }

  /**
   * Get a specific personal access token by ID
   */
  async getPersonalAccessToken(
    tokenId: string,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsPersonalAccessToken> {
    try {
      this.validateTokenId(tokenId);

      const response = await this.authClient.getPersonalAccessToken(tokenId);

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get personal access token: ${error}`,
        { tokenId, operation: 'getPersonalAccessToken' }
      );
    }
  }

  /**
   * Update a personal access token
   */
  async updatePersonalAccessToken(
    tokenId: string,
    request: DfnsUpdatePersonalAccessTokenRequest,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsUpdatePersonalAccessTokenResponse> {
    try {
      this.validateTokenId(tokenId);
      this.validateUpdateRequest(request);

      const response = await this.authClient.updatePersonalAccessToken(
        tokenId,
        request
      );

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsValidationError) {
        throw error;
      }
      throw new DfnsAuthenticationError(
        `Failed to update personal access token: ${error}`,
        { tokenId, request, operation: 'updatePersonalAccessToken' }
      );
    }
  }

  /**
   * Activate a deactivated personal access token
   */
  async activatePersonalAccessToken(
    tokenId: string,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsActivatePersonalAccessTokenResponse> {
    try {
      this.validateTokenId(tokenId);

      const response = await this.authClient.activatePersonalAccessToken(tokenId);

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate personal access token: ${error}`,
        { tokenId, operation: 'activatePersonalAccessToken' }
      );
    }
  }

  /**
   * Deactivate an active personal access token
   */
  async deactivatePersonalAccessToken(
    tokenId: string,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsDeactivatePersonalAccessTokenResponse> {
    try {
      this.validateTokenId(tokenId);

      const response = await this.authClient.deactivatePersonalAccessToken(tokenId);

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate personal access token: ${error}`,
        { tokenId, operation: 'deactivatePersonalAccessToken' }
      );
    }
  }

  /**
   * Archive a personal access token (soft delete)
   */
  async archivePersonalAccessToken(
    tokenId: string,
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsArchivePersonalAccessTokenResponse> {
    try {
      this.validateTokenId(tokenId);

      const response = await this.authClient.archivePersonalAccessToken(tokenId);

      // Optional database synchronization
      if (options.syncToDatabase) {
        await this.syncTokenToDatabase(response);
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive personal access token: ${error}`,
        { tokenId, operation: 'archivePersonalAccessToken' }
      );
    }
  }

  // ===============================
  // Enhanced Operations
  // ===============================

  /**
   * Get personal access token by name
   */
  async getPersonalAccessTokenByName(name: string): Promise<DfnsPersonalAccessToken | null> {
    try {
      const tokens = await this.listPersonalAccessTokens();
      return tokens.find(token => token.name === name) || null;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get personal access token by name: ${error}`,
        { name, operation: 'getPersonalAccessTokenByName' }
      );
    }
  }

  /**
   * Batch activate multiple personal access tokens
   */
  async activatePersonalAccessTokens(
    tokenIds: string[],
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsActivatePersonalAccessTokenResponse[]> {
    const results: DfnsActivatePersonalAccessTokenResponse[] = [];
    
    for (const tokenId of tokenIds) {
      try {
        const result = await this.activatePersonalAccessToken(tokenId, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to activate PAT ${tokenId}:`, error);
        // Continue with other tokens
      }
    }
    
    return results;
  }

  /**
   * Batch deactivate multiple personal access tokens
   */
  async deactivatePersonalAccessTokens(
    tokenIds: string[],
    options: PersonalAccessTokenServiceOptions = {}
  ): Promise<DfnsDeactivatePersonalAccessTokenResponse[]> {
    const results: DfnsDeactivatePersonalAccessTokenResponse[] = [];
    
    for (const tokenId of tokenIds) {
      try {
        const result = await this.deactivatePersonalAccessToken(tokenId, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to deactivate PAT ${tokenId}:`, error);
        // Continue with other tokens
      }
    }
    
    return results;
  }

  /**
   * Get personal access tokens summary for dashboards
   */
  async getPersonalAccessTokensSummary(): Promise<PersonalAccessTokenSummary[]> {
    try {
      const tokens = await this.listPersonalAccessTokens();
      const now = new Date();
      
      return tokens.map(token => {
        const createdAt = new Date(token.dateCreated);
        const lastUsedAt = token.publicKey ? new Date(token.publicKey) : undefined; // Approximation
        const expiresAt = undefined; // Would need to be tracked separately
        
        const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceLastUsed = lastUsedAt ? Math.floor((now.getTime() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)) : undefined;
        const daysUntilExpiry = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined;
        
        return {
          tokenId: token.tokenId,
          name: token.name,
          isActive: token.isActive,
          createdAt: token.dateCreated,
          permissionCount: token.permissionAssignments?.length || 0,
          daysSinceCreated,
          daysSinceLastUsed,
          daysUntilExpiry,
        };
      });
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get personal access tokens summary: ${error}`,
        { operation: 'getPersonalAccessTokensSummary' }
      );
    }
  }

  // ===============================
  // Validation Methods
  // ===============================

  /**
   * Validate token ID format
   */
  private validateTokenId(tokenId: string): void {
    if (!tokenId || typeof tokenId !== 'string') {
      throw new DfnsValidationError('Token ID is required and must be a string');
    }
    
    // DFNS token ID pattern: to-xxxxx-xxxxx-xxxxxxxxxxxxxx
    const tokenIdPattern = /^to-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{14}$/;
    if (!tokenIdPattern.test(tokenId)) {
      throw new DfnsValidationError(
        'Invalid token ID format. Expected format: to-xxxxx-xxxxx-xxxxxxxxxxxxxx'
      );
    }
  }

  /**
   * Validate create PAT request
   */
  private validateCreateRequest(request: DfnsCreatePersonalAccessTokenRequest): void {
    if (!request.name || typeof request.name !== 'string' || request.name.trim().length === 0) {
      throw new DfnsValidationError('Personal access token name is required');
    }

    if (request.name.length > 100) {
      throw new DfnsValidationError('Personal access token name must be 100 characters or less');
    }

    if (!request.publicKey || typeof request.publicKey !== 'string') {
      throw new DfnsValidationError('Public key is required for personal access token creation');
    }

    // Validate public key format (basic check)
    if (!request.publicKey.includes('BEGIN PUBLIC KEY') || !request.publicKey.includes('END PUBLIC KEY')) {
      throw new DfnsValidationError('Public key must be in PEM format');
    }

    // Validate daysValid if provided
    if (request.daysValid !== undefined) {
      if (typeof request.daysValid !== 'number' || request.daysValid < 1 || request.daysValid > 730) {
        throw new DfnsValidationError('daysValid must be a number between 1 and 730');
      }
    }

    // Validate secondsValid if provided
    if (request.secondsValid !== undefined) {
      if (typeof request.secondsValid !== 'number' || request.secondsValid < 1) {
        throw new DfnsValidationError('secondsValid must be a positive number');
      }
    }
  }

  /**
   * Validate update PAT request
   */
  private validateUpdateRequest(request: DfnsUpdatePersonalAccessTokenRequest): void {
    if (request.name !== undefined) {
      if (typeof request.name !== 'string' || request.name.trim().length === 0) {
        throw new DfnsValidationError('Personal access token name must be a non-empty string');
      }
      if (request.name.length > 100) {
        throw new DfnsValidationError('Personal access token name must be 100 characters or less');
      }
    }

    if (request.externalId !== undefined && typeof request.externalId !== 'string') {
      throw new DfnsValidationError('External ID must be a string');
    }
  }

  /**
   * Validate permission ID exists (placeholder for actual implementation)
   */
  private async validatePermissionId(permissionId: string): Promise<void> {
    // This would typically check against available permissions
    // For now, just validate format
    if (!permissionId || typeof permissionId !== 'string') {
      throw new DfnsValidationError('Permission ID must be a non-empty string');
    }
    
    // DFNS permission ID pattern: pm-xxxxx-xxxxx-xxxxxxxxxxxxxx
    const permissionIdPattern = /^pm-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{14}$/;
    if (!permissionIdPattern.test(permissionId)) {
      throw new DfnsValidationError(
        'Invalid permission ID format. Expected format: pm-xxxxx-xxxxx-xxxxxxxxxxxxxx'
      );
    }
  }

  // ===============================
  // Database Synchronization (Placeholder)
  // ===============================

  /**
   * Sync multiple tokens to database
   */
  private async syncTokensToDatabase(tokens: DfnsPersonalAccessToken[]): Promise<void> {
    // Placeholder for database synchronization
    // Would typically update the dfns_personal_access_tokens table
    console.log(`Syncing ${tokens.length} personal access tokens to database...`);
  }

  /**
   * Sync single token to database
   */
  private async syncTokenToDatabase(token: DfnsPersonalAccessToken): Promise<void> {
    // Placeholder for database synchronization
    // Would typically upsert to dfns_personal_access_tokens table
    console.log(`Syncing personal access token ${token.tokenId} to database...`);
  }
}