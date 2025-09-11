/**
 * DFNS Personal Access Token Management Service
 * 
 * Implements the current DFNS Personal Access Token Management API endpoints:
 * - GET /auth/pats (List Personal Access Tokens)
 * - POST /auth/pats (Create Personal Access Token)
 * - GET /auth/pats/{tokenId} (Get Personal Access Token)
 * - PUT /auth/pats/{tokenId} (Update Personal Access Token)
 * - PUT /auth/pats/{tokenId}/activate (Activate Personal Access Token)
 * - PUT /auth/pats/{tokenId}/deactivate (Deactivate Personal Access Token)
 * - DELETE /auth/pats/{tokenId} (Archive Personal Access Token)
 * 
 * Compatible with Service Account and PAT token authentication.
 * User Action Signing required for all mutating operations.
 * 
 * API Documentation:
 * - https://docs.dfns.co/d/api-docs/authentication/personal-access-token-management
 * - https://docs.dfns.co/d/api-docs/authentication/user-action-signing
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
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
  DfnsArchivePersonalAccessTokenResponse
} from '../../types/dfns/auth';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

// Request and response filters for PAT operations
export interface PersonalAccessTokenListFilters {
  limit?: number;
  paginationToken?: string;
  isActive?: boolean;
  hasPermissions?: boolean;
  search?: string; // Search by name
  createdAfter?: string; // ISO date string
  createdBefore?: string; // ISO date string
}

export interface PersonalAccessTokenStatistics {
  totalTokens: number;
  activeTokens: number;
  inactiveTokens: number;
  tokensWithPermissions: number;
  averagePermissionsPerToken: number;
  oldestToken?: DfnsPersonalAccessToken;
  newestToken?: DfnsPersonalAccessToken;
  expiringTokens: DfnsPersonalAccessToken[]; // Tokens expiring in next 30 days
}

export interface PersonalAccessTokenOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  requestId?: string;
  responseTime: number;
}

export interface CreatePersonalAccessTokenOptions {
  validatePublicKey?: boolean;
  assignDefaultPermissions?: boolean;
  setExpirationReminder?: boolean;
  generateKeyPairIfNeeded?: boolean;
}

export interface PersonalAccessTokenSummary {
  tokenId: string;
  name: string;
  isActive: boolean;
  permissionCount: number;
  createdDate: string;
  expirationDate?: string;
  lastUsed?: string;
}

export interface PersonalAccessTokenValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  securityScore: number; // 0-100
}

export class DfnsPersonalAccessTokenManagementService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // =====================================
  // CURRENT DFNS PERSONAL ACCESS TOKEN MANAGEMENT API
  // =====================================

  /**
   * List Personal Access Tokens
   * GET /auth/pats
   * 
   * Required Permission: None (user's own tokens)
   */
  async listPersonalAccessTokens(
    filters: PersonalAccessTokenListFilters = {}
  ): Promise<PersonalAccessTokenOperationResult<DfnsListPersonalAccessTokensResponse>> {
    try {
      console.log('📋 Listing personal access tokens with filters:', filters);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.paginationToken) {
        params.append('paginationToken', filters.paginationToken);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/auth/pats?${queryString}` : '/auth/pats';

      const startTime = Date.now();
      const response = await this.workingClient.makeRequest<DfnsListPersonalAccessTokensResponse>(
        'GET',
        endpoint
      );
      const responseTime = Date.now() - startTime;

      // Apply client-side filters if needed
      let filteredTokens = response.items;

      if (filters.isActive !== undefined) {
        filteredTokens = filteredTokens.filter(token => 
          token.isActive === filters.isActive
        );
      }

      if (filters.hasPermissions !== undefined) {
        filteredTokens = filteredTokens.filter(token => {
          const hasPermissions = token.permissionAssignments && 
                                token.permissionAssignments.length > 0;
          return hasPermissions === filters.hasPermissions;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTokens = filteredTokens.filter(token => 
          token.name.toLowerCase().includes(searchLower)
        );
      }

      if (filters.createdAfter) {
        const afterDate = new Date(filters.createdAfter);
        filteredTokens = filteredTokens.filter(token => 
          new Date(token.dateCreated) >= afterDate
        );
      }

      if (filters.createdBefore) {
        const beforeDate = new Date(filters.createdBefore);
        filteredTokens = filteredTokens.filter(token => 
          new Date(token.dateCreated) <= beforeDate
        );
      }

      const filteredResponse = {
        ...response,
        items: filteredTokens
      };

      console.log(`✅ Listed ${filteredTokens.length} personal access tokens`);

      return {
        success: true,
        data: filteredResponse,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to list personal access tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Create Personal Access Token
   * POST /auth/pats
   * 
   * Required Permission: Auth:Pats:Create
   * Requires User Action Signing
   */
  async createPersonalAccessToken(
    request: DfnsCreatePersonalAccessTokenRequest,
    userActionToken?: string,
    options: CreatePersonalAccessTokenOptions = {}
  ): Promise<PersonalAccessTokenOperationResult<DfnsCreatePersonalAccessTokenResponse>> {
    try {
      console.log('🔑 Creating personal access token:', { name: request.name });

      // Validate request
      const validation = this.validateCreatePatRequest(request);
      if (!validation.isValid) {
        throw new DfnsValidationError(`Invalid create PAT request: ${validation.issues.join(', ')}`);
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Creating personal access token without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for personal access token creation',
          errorCode: 'USER_ACTION_REQUIRED',
          responseTime: 0
        };
      }

      // Apply options
      let processedRequest = { ...request };

      if (options.validatePublicKey && request.publicKey) {
        await this.validatePublicKey(request.publicKey);
      }

      if (options.assignDefaultPermissions && !request.permissionId) {
        // Could implement default permission assignment logic here
        console.log('💡 Note: No permission specified, PAT will inherit user permissions');
      }

      const startTime = Date.now();

      // Make request with User Action token
      const response = await this.workingClient.makeRequest<DfnsCreatePersonalAccessTokenResponse>(
        'POST',
        '/auth/pats',
        processedRequest,
        userActionToken
      );

      const responseTime = Date.now() - startTime;

      console.log(`✅ Created personal access token: ${response.tokenId}`);
      console.log(`🔐 Access token returned (store securely): ${response.accessToken?.substring(0, 20)}...`);

      // Log security reminder
      if (response.accessToken) {
        console.warn('⚠️ SECURITY: Store the access token securely. It will not be shown again.');
      }

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to create personal access token:', error);
      
      // Handle specific DFNS error cases
      if (error instanceof DfnsAuthenticationError) {
        return {
          success: false,
          error: 'Authentication failed. Check your Service Account or PAT token permissions for Auth:Pats:Create.',
          errorCode: 'AUTHENTICATION_ERROR',
          responseTime: 0
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Get Personal Access Token
   * GET /auth/pats/{tokenId}
   * 
   * Required Permission: None (user's own tokens)
   */
  async getPersonalAccessToken(
    tokenId: string
  ): Promise<PersonalAccessTokenOperationResult<DfnsGetPersonalAccessTokenResponse>> {
    try {
      console.log('🔍 Getting personal access token:', tokenId);

      if (!tokenId) {
        throw new DfnsValidationError('Token ID is required');
      }

      const startTime = Date.now();
      const response = await this.workingClient.makeRequest<DfnsGetPersonalAccessTokenResponse>(
        'GET',
        `/auth/pats/${tokenId}`
      );
      const responseTime = Date.now() - startTime;

      console.log(`✅ Retrieved personal access token: ${response.name}`);

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to get personal access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Update Personal Access Token
   * PUT /auth/pats/{tokenId}
   * 
   * Required Permission: None (user's own tokens)
   * Requires User Action Signing for security-sensitive updates
   */
  async updatePersonalAccessToken(
    tokenId: string,
    request: DfnsUpdatePersonalAccessTokenRequest,
    userActionToken?: string
  ): Promise<PersonalAccessTokenOperationResult<DfnsUpdatePersonalAccessTokenResponse>> {
    try {
      console.log('✏️ Updating personal access token:', tokenId, request);

      if (!tokenId) {
        throw new DfnsValidationError('Token ID is required');
      }

      // Validate request
      if (!request.name && !request.externalId) {
        throw new DfnsValidationError('At least one field (name or externalId) must be provided');
      }

      if (request.name && request.name.trim().length === 0) {
        throw new DfnsValidationError('Name cannot be empty');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Updating personal access token without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for personal access token updates',
          errorCode: 'USER_ACTION_REQUIRED',
          responseTime: 0
        };
      }

      const startTime = Date.now();

      // Make request with User Action token
      const response = await this.workingClient.makeRequest<DfnsUpdatePersonalAccessTokenResponse>(
        'PUT',
        `/auth/pats/${tokenId}`,
        request,
        userActionToken
      );

      const responseTime = Date.now() - startTime;

      console.log(`✅ Updated personal access token: ${response.name}`);

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to update personal access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Activate Personal Access Token
   * PUT /auth/pats/{tokenId}/activate
   * 
   * Required Permission: None (user's own tokens)
   * Requires User Action Signing
   */
  async activatePersonalAccessToken(
    tokenId: string,
    userActionToken?: string
  ): Promise<PersonalAccessTokenOperationResult<DfnsActivatePersonalAccessTokenResponse>> {
    try {
      console.log('🟢 Activating personal access token:', tokenId);

      if (!tokenId) {
        throw new DfnsValidationError('Token ID is required');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Activating personal access token without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for personal access token activation',
          errorCode: 'USER_ACTION_REQUIRED',
          responseTime: 0
        };
      }

      const startTime = Date.now();

      // Make request with User Action token
      const response = await this.workingClient.makeRequest<DfnsActivatePersonalAccessTokenResponse>(
        'PUT',
        `/auth/pats/${tokenId}/activate`,
        {},
        userActionToken
      );

      const responseTime = Date.now() - startTime;

      console.log(`✅ Activated personal access token: ${response.name}`);

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to activate personal access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Deactivate Personal Access Token
   * PUT /auth/pats/{tokenId}/deactivate
   * 
   * Required Permission: None (user's own tokens)
   * Requires User Action Signing
   */
  async deactivatePersonalAccessToken(
    tokenId: string,
    userActionToken?: string
  ): Promise<PersonalAccessTokenOperationResult<DfnsDeactivatePersonalAccessTokenResponse>> {
    try {
      console.log('🔴 Deactivating personal access token:', tokenId);

      if (!tokenId) {
        throw new DfnsValidationError('Token ID is required');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Deactivating personal access token without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for personal access token deactivation',
          errorCode: 'USER_ACTION_REQUIRED',
          responseTime: 0
        };
      }

      const startTime = Date.now();

      // Make request with User Action token
      const response = await this.workingClient.makeRequest<DfnsDeactivatePersonalAccessTokenResponse>(
        'PUT',
        `/auth/pats/${tokenId}/deactivate`,
        {},
        userActionToken
      );

      const responseTime = Date.now() - startTime;

      console.log(`✅ Deactivated personal access token: ${response.name}`);

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to deactivate personal access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Archive Personal Access Token
   * DELETE /auth/pats/{tokenId}
   * 
   * Required Permission: None (user's own tokens)
   * Requires User Action Signing
   */
  async archivePersonalAccessToken(
    tokenId: string,
    userActionToken?: string
  ): Promise<PersonalAccessTokenOperationResult<DfnsArchivePersonalAccessTokenResponse>> {
    try {
      console.log('🗑️ Archiving personal access token:', tokenId);

      if (!tokenId) {
        throw new DfnsValidationError('Token ID is required');
      }

      // Check if User Action token is provided for this sensitive operation
      if (!userActionToken) {
        console.warn('⚠️ Archiving personal access token without User Action token - this will likely fail');
        return {
          success: false,
          error: 'User Action Signing required for personal access token archival',
          errorCode: 'USER_ACTION_REQUIRED',
          responseTime: 0
        };
      }

      const startTime = Date.now();

      // Make request with User Action token
      const response = await this.workingClient.makeRequest<DfnsArchivePersonalAccessTokenResponse>(
        'DELETE',
        `/auth/pats/${tokenId}`,
        {},
        userActionToken
      );

      const responseTime = Date.now() - startTime;

      console.log(`✅ Archived personal access token: ${response.name}`);

      return {
        success: true,
        data: response,
        responseTime
      };

    } catch (error) {
      console.error('❌ Failed to archive personal access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  // =====================================
  // ENHANCED UTILITIES AND ANALYTICS
  // =====================================

  /**
   * Get Personal Access Token Statistics
   */
  async getPersonalAccessTokenStatistics(): Promise<PersonalAccessTokenOperationResult<PersonalAccessTokenStatistics>> {
    try {
      console.log('📊 Calculating personal access token statistics...');

      const listResult = await this.listPersonalAccessTokens({ limit: 1000 });
      
      if (!listResult.success || !listResult.data) {
        throw new DfnsError('Failed to fetch tokens for statistics', 'STATS_ERROR');
      }

      const tokens = listResult.data.items;
      const activeTokens = tokens.filter(token => token.isActive);
      const inactiveTokens = tokens.filter(token => !token.isActive);
      const tokensWithPermissions = tokens.filter(token => 
        token.permissionAssignments && token.permissionAssignments.length > 0
      );

      // Calculate average permissions per token
      const totalPermissions = tokens.reduce((sum, token) => 
        sum + (token.permissionAssignments?.length || 0), 0
      );
      const averagePermissionsPerToken = tokens.length > 0 ? totalPermissions / tokens.length : 0;

      // Find oldest and newest tokens
      const sortedByDate = [...tokens].sort((a, b) => 
        new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      );
      const oldestToken = sortedByDate[0];
      const newestToken = sortedByDate[sortedByDate.length - 1];

      // Find tokens expiring in next 30 days (if expiration info is available)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      // Note: DFNS API doesn't return expiration dates in list response
      // This would need to be enhanced if expiration tracking is added
      const expiringTokens: DfnsPersonalAccessToken[] = [];

      const statistics: PersonalAccessTokenStatistics = {
        totalTokens: tokens.length,
        activeTokens: activeTokens.length,
        inactiveTokens: inactiveTokens.length,
        tokensWithPermissions: tokensWithPermissions.length,
        averagePermissionsPerToken,
        oldestToken,
        newestToken,
        expiringTokens
      };

      console.log('✅ Personal access token statistics calculated:', statistics);

      return {
        success: true,
        data: statistics,
        responseTime: 0
      };

    } catch (error) {
      console.error('❌ Failed to calculate PAT statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Get Personal Access Token Summary
   */
  async getPersonalAccessTokenSummaries(): Promise<PersonalAccessTokenOperationResult<PersonalAccessTokenSummary[]>> {
    try {
      console.log('📝 Generating personal access token summaries...');

      const listResult = await this.listPersonalAccessTokens({ limit: 1000 });
      
      if (!listResult.success || !listResult.data) {
        throw new DfnsError('Failed to fetch tokens for summaries', 'SUMMARY_ERROR');
      }

      const summaries: PersonalAccessTokenSummary[] = listResult.data.items.map(token => ({
        tokenId: token.tokenId,
        name: token.name,
        isActive: token.isActive,
        permissionCount: token.permissionAssignments?.length || 0,
        createdDate: token.dateCreated,
        // Note: DFNS API doesn't provide expiration or last used dates
        expirationDate: undefined,
        lastUsed: undefined
      }));

      console.log(`✅ Generated ${summaries.length} PAT summaries`);

      return {
        success: true,
        data: summaries,
        responseTime: 0
      };

    } catch (error) {
      console.error('❌ Failed to generate PAT summaries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  /**
   * Validate Personal Access Token Configuration
   */
  async validatePersonalAccessToken(tokenId: string): Promise<PersonalAccessTokenOperationResult<PersonalAccessTokenValidationResult>> {
    try {
      console.log('🔍 Validating personal access token configuration:', tokenId);

      const getResult = await this.getPersonalAccessToken(tokenId);
      
      if (!getResult.success || !getResult.data) {
        throw new DfnsError('Failed to fetch token for validation', 'VALIDATION_ERROR');
      }

      const token = getResult.data;
      const issues: string[] = [];
      const recommendations: string[] = [];
      let securityScore = 100;

      // Check if token is active
      if (!token.isActive) {
        issues.push('Token is inactive');
        securityScore -= 30;
      }

      // Check if token has permissions
      if (!token.permissionAssignments || token.permissionAssignments.length === 0) {
        recommendations.push('Consider assigning specific permissions instead of inheriting all user permissions');
        securityScore -= 10;
      }

      // Check token age
      const tokenAge = Date.now() - new Date(token.dateCreated).getTime();
      const daysSinceCreation = tokenAge / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation > 365) {
        recommendations.push('Consider rotating tokens older than 1 year');
        securityScore -= 5;
      }

      // Check for meaningful name
      if (!token.name || token.name.trim().length < 3) {
        recommendations.push('Use descriptive names for better token management');
        securityScore -= 5;
      }

      // Check for external ID usage
      if (!token.externalId) {
        recommendations.push('Consider adding an external ID for better tracking');
        securityScore -= 5;
      }

      const validationResult: PersonalAccessTokenValidationResult = {
        isValid: issues.length === 0,
        issues,
        recommendations,
        securityScore: Math.max(0, securityScore)
      };

      console.log('✅ PAT validation completed:', {
        isValid: validationResult.isValid,
        securityScore: validationResult.securityScore,
        issueCount: issues.length,
        recommendationCount: recommendations.length
      });

      return {
        success: true,
        data: validationResult,
        responseTime: 0
      };

    } catch (error) {
      console.error('❌ Failed to validate PAT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DfnsError ? error.code : 'UNKNOWN_ERROR',
        responseTime: 0
      };
    }
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

  private validateCreatePatRequest(request: DfnsCreatePersonalAccessTokenRequest): PersonalAccessTokenValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    // Validate required fields
    if (!request.name || request.name.trim().length === 0) {
      issues.push('Name is required');
      securityScore -= 30;
    }

    if (!request.publicKey || request.publicKey.trim().length === 0) {
      issues.push('Public key is required');
      securityScore -= 40;
    }

    // Validate optional fields
    if (request.name && request.name.trim().length < 3) {
      recommendations.push('Use descriptive names for better token management');
      securityScore -= 5;
    }

    if (request.daysValid && request.daysValid > 730) {
      issues.push('Maximum validity period is 730 days');
      securityScore -= 20;
    }

    if (request.daysValid && request.daysValid < 1) {
      issues.push('Minimum validity period is 1 day');
      securityScore -= 20;
    }

    // Check for security best practices
    if (!request.permissionId) {
      recommendations.push('Consider assigning specific permissions instead of inheriting all user permissions');
      securityScore -= 10;
    }

    if (!request.externalId) {
      recommendations.push('Consider adding an external ID for better tracking');
      securityScore -= 5;
    }

    // Validate expiration settings
    if (!request.daysValid && !request.secondsValid) {
      recommendations.push('Consider setting an expiration period for better security');
      securityScore -= 10;
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      securityScore: Math.max(0, securityScore)
    };
  }

  private async validatePublicKey(publicKey: string): Promise<void> {
    // Basic validation - check if it looks like a PEM format public key
    if (!publicKey.includes('BEGIN PUBLIC KEY') || !publicKey.includes('END PUBLIC KEY')) {
      throw new DfnsValidationError('Public key must be in PEM format');
    }

    // Additional validation could be added here
    // For example, checking key length, algorithm compatibility, etc.
  }
}
