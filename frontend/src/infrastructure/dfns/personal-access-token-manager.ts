/**
 * DFNS Personal Access Token Manager
 * 
 * Comprehensive service for managing DFNS Personal Access Tokens
 * implementing all 7 DFNS PAT management API endpoints.
 */

import { DfnsApiClient } from './client';
import type {
  CreatePersonalAccessTokenRequest,
  CreatePersonalAccessTokenResponse,
  UpdatePersonalAccessTokenRequest,
  PersonalAccessTokenResponse,
  ListPersonalAccessTokensResponse,
  PatKeyPair
} from '@/types/dfns/personal-access-token';
import type { DfnsResponse } from '@/types/dfns';

/**
 * Personal Access Token Manager for DFNS API
 */
export class DfnsPersonalAccessTokenManager {
  private client: DfnsApiClient;

  constructor(client?: DfnsApiClient) {
    this.client = client || new DfnsApiClient();
  }

  // ===== Core CRUD Operations =====

  /**
   * List all Personal Access Tokens
   * GET /auth/pats
   */
  async listPersonalAccessTokens(): Promise<PersonalAccessTokenResponse[]> {
    try {
      const response = await this.client.get('/auth/pats');
      return response.data?.items || [];
    } catch (error) {
      console.error('Error listing personal access tokens:', error);
      throw error;
    }
  }

  /**
   * Create a new Personal Access Token
   * POST /auth/pats
   */
  async createPersonalAccessToken(
    request: CreatePersonalAccessTokenRequest
  ): Promise<CreatePersonalAccessTokenResponse> {
    try {
      // Validate required fields
      if (!request.name || !request.publicKey) {
        throw new Error('Name and public key are required for PAT creation');
      }

      const response = await this.client.post('/auth/pats', request);
      return response.data;
    } catch (error) {
      console.error('Error creating personal access token:', error);
      throw error;
    }
  }

  /**
   * Get a specific Personal Access Token
   * GET /auth/pats/{tokenId}
   */
  async getPersonalAccessToken(tokenId: string): Promise<PersonalAccessTokenResponse> {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      const response = await this.client.get(`/auth/pats/${tokenId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting personal access token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Update a Personal Access Token
   * PUT /auth/pats/{tokenId}
   */
  async updatePersonalAccessToken(
    tokenId: string,
    request: UpdatePersonalAccessTokenRequest
  ): Promise<PersonalAccessTokenResponse> {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      const response = await this.client.put(`/auth/pats/${tokenId}`, request);
      return response.data;
    } catch (error) {
      console.error(`Error updating personal access token ${tokenId}:`, error);
      throw error;
    }
  }

  // ===== Lifecycle Management =====

  /**
   * Activate a Personal Access Token
   * PUT /auth/pats/{tokenId}/activate
   */
  async activatePersonalAccessToken(tokenId: string): Promise<PersonalAccessTokenResponse> {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      const response = await this.client.put(`/auth/pats/${tokenId}/activate`);
      return response.data;
    } catch (error) {
      console.error(`Error activating personal access token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate a Personal Access Token
   * PUT /auth/pats/{tokenId}/deactivate
   */
  async deactivatePersonalAccessToken(tokenId: string): Promise<PersonalAccessTokenResponse> {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      const response = await this.client.put(`/auth/pats/${tokenId}/deactivate`);
      return response.data;
    } catch (error) {
      console.error(`Error deactivating personal access token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Archive a Personal Access Token
   * DELETE /auth/pats/{tokenId}
   */
  async archivePersonalAccessToken(tokenId: string): Promise<PersonalAccessTokenResponse> {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      const response = await this.client.delete(`/auth/pats/${tokenId}`);
      return response.data;
    } catch (error) {
      console.error(`Error archiving personal access token ${tokenId}:`, error);
      throw error;
    }
  }

  // ===== Utility Methods =====

  /**
   * Generate a cryptographic key pair for PAT creation
   */
  async generateKeyPair(): Promise<PatKeyPair> {
    try {
      // Generate EC P-256 key pair for DFNS compatibility
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true, // extractable
        ['sign', 'verify']
      );

      // Export private key
      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

      // Export public key
      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

      return {
        privateKey: `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`,
        publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`,
        algorithm: 'ECDSA'
      };
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error('Failed to generate cryptographic key pair');
    }
  }

  /**
   * Validate token permissions against required operations
   */
  async validateTokenPermissions(tokenId: string): Promise<boolean> {
    try {
      const token = await this.getPersonalAccessToken(tokenId);
      
      // Check if token is active
      if (!token.isActive) {
        return false;
      }

      // Validate permission assignments exist
      if (!token.permissionAssignments || token.permissionAssignments.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error validating token permissions for ${tokenId}:`, error);
      return false;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: PersonalAccessTokenResponse): boolean {
    if (!token.dateCreated) {
      return false; // If no creation date, assume it's not expired
    }

    // Check if explicitly marked as inactive
    if (!token.isActive) {
      return true;
    }

    // Additional expiry logic can be added here based on DFNS token lifecycle
    return false;
  }

  /**
   * Format token for display in UI
   */
  formatTokenForDisplay(token: PersonalAccessTokenResponse) {
    return {
      id: token.tokenId,
      name: token.name,
      status: token.isActive ? 'Active' : 'Inactive',
      createdAt: new Date(token.dateCreated).toLocaleDateString(),
      permissions: token.permissionAssignments?.length || 0,
      lastUsed: 'Never', // This would come from your database tracking
      organization: token.orgId
    };
  }

  /**
   * Bulk operations for PAT management
   */
  async bulkActivateTokens(tokenIds: string[]): Promise<PersonalAccessTokenResponse[]> {
    const results = await Promise.allSettled(
      tokenIds.map(id => this.activatePersonalAccessToken(id))
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<PersonalAccessTokenResponse> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .length;

    if (failed > 0) {
      console.warn(`${failed} tokens failed to activate out of ${tokenIds.length}`);
    }

    return successful;
  }

  async bulkDeactivateTokens(tokenIds: string[]): Promise<PersonalAccessTokenResponse[]> {
    const results = await Promise.allSettled(
      tokenIds.map(id => this.deactivatePersonalAccessToken(id))
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<PersonalAccessTokenResponse> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    return successful;
  }
}

export default DfnsPersonalAccessTokenManager;
