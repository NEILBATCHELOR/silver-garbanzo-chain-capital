/**
 * DFNS User Recovery Service
 * 
 * Implements current DFNS User Recovery API endpoints
 * Supports Service Account and PAT token authentication (no private keys required)
 * 
 * API Documentation: https://docs.dfns.co/d/api-docs/authentication/user-recovery
 * 
 * Endpoints:
 * - PUT /auth/recover/user/code - Send Recovery Code Email
 * - POST /auth/recover/user/init - Create Recovery Challenge
 * - POST /auth/recover/user/delegated - Create Delegated Recovery Challenge (Service Account only)
 * - POST /auth/recover/user - Recover User
 * 
 * Authentication: Works with Service Account tokens and PAT tokens
 * Permissions: Delegated recovery requires Auth:Recover:Delegated permission
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

// Import existing recovery types from auth.ts (current DFNS API)
import type {
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  DfnsRecoveryCredentialAssertion,
  DfnsRecoveryObject,
  DfnsNewCredentials,
  DfnsCredentialInfo
} from '../../types/dfns/auth';

// Export types for use in index.ts
export type {
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  DfnsRecoveryCredentialAssertion,
  DfnsNewCredentials
};

// =====================================================
// USER RECOVERY SERVICE IMPLEMENTATION
// =====================================================

export class DfnsUserRecoveryService {
  private workingClient: WorkingDfnsClient;

  constructor(workingClient: WorkingDfnsClient) {
    this.workingClient = workingClient;
  }

  // =====================================================
  // RECOVERY CODE EMAIL
  // =====================================================

  /**
   * Send Recovery Code Email
   * PUT /auth/recover/user/code
   * 
   * Sends the user a recovery verification code via email.
   * This code is used as a second factor to verify the user initiated the recovery request.
   * 
   * @param request - Recovery code request with username and orgId
   * @returns Promise with success confirmation
   */
  async sendRecoveryCode(request: DfnsSendRecoveryCodeRequest): Promise<DfnsSendRecoveryCodeResponse> {
    try {
      this.validateSendRecoveryCodeRequest(request);

      const response = await this.workingClient.makeRequest(
        'PUT',
        '/auth/recover/user/code',
        request
      ) as { message: string };

      if (!response.message) {
        throw new DfnsError('Invalid response format from DFNS API', 'INVALID_RESPONSE');
      }

      console.log('✅ Recovery code sent successfully to:', request.username);
      
      return {
        message: 'success' as const
      };
    } catch (error) {
      console.error('❌ Failed to send recovery code:', error);
      throw this.handleRecoveryError(error, 'sendRecoveryCode');
    }
  }

  // =====================================================
  // RECOVERY CHALLENGE CREATION
  // =====================================================

  /**
   * Create Recovery Challenge
   * POST /auth/recover/user/init
   * 
   * Starts a user recovery session, returning a challenge that will be used 
   * to verify the user's identity. Requires the verification code from email.
   * 
   * @param request - Recovery challenge request with username, verificationCode, orgId, credentialId
   * @returns Promise with challenge data for WebAuthn recovery process
   */
  async createRecoveryChallenge(request: DfnsCreateRecoveryRequest): Promise<DfnsCreateRecoveryResponse> {
    try {
      this.validateCreateRecoveryRequest(request);

      const response = await this.workingClient.makeRequest(
        'POST',
        '/auth/recover/user/init',
        request
      ) as any;

      this.validateRecoveryResponse(response);

      console.log('✅ Recovery challenge created for user:', request.username);
      console.log(`🔐 Challenge includes ${response.allowedRecoveryCredentials?.length || 0} recovery credentials`);
      
      return response as DfnsCreateRecoveryResponse;
    } catch (error) {
      console.error('❌ Failed to create recovery challenge:', error);
      throw this.handleRecoveryError(error, 'createRecoveryChallenge');
    }
  }

  /**
   * Create Delegated Recovery Challenge
   * POST /auth/recover/user/delegated
   * 
   * Service Account only endpoint. Enables setting up a recovery workflow 
   * for Delegated Signing without sending user an email from DFNS.
   * 
   * Requires Service Account with Auth:Recover:Delegated permission.
   * 
   * @param request - Delegated recovery request with username and credentialId
   * @returns Promise with challenge data for delegated recovery process
   */
  async createDelegatedRecoveryChallenge(request: DfnsDelegatedRecoveryRequest): Promise<DfnsDelegatedRecoveryResponse> {
    try {
      // Verify Service Account authentication
      const authMethod = this.workingClient.getAuthMethod();
      if (!authMethod.includes('SERVICE_ACCOUNT')) {
        throw new DfnsAuthenticationError(
          'Delegated recovery requires Service Account authentication with Auth:Recover:Delegated permission'
        );
      }

      this.validateCreateDelegatedRecoveryRequest(request);

      const response = await this.workingClient.makeRequest(
        'POST',
        '/auth/recover/user/delegated',
        request
      ) as any;

      this.validateRecoveryResponse(response);

      console.log('✅ Delegated recovery challenge created for user:', request.username);
      console.log(`🔐 Challenge includes ${response.allowedRecoveryCredentials?.length || 0} recovery credentials`);
      
      return response as DfnsDelegatedRecoveryResponse;
    } catch (error) {
      console.error('❌ Failed to create delegated recovery challenge:', error);
      throw this.handleRecoveryError(error, 'createDelegatedRecoveryChallenge');
    }
  }

  // =====================================================
  // USER RECOVERY COMPLETION
  // =====================================================

  /**
   * Recover User
   * POST /auth/recover/user
   * 
   * Recovers a user using a recovery credential. After successfully recovering,
   * all previous credentials and personal access tokens will be invalidated.
   * 
   * Requires cryptographic validation of newly created credential(s) using 
   * a recovery credential.
   * 
   * @param request - Recovery request with recovery assertion and new credentials
   * @returns Promise with recovered user information
   */
  async recoverUser(request: DfnsRecoverUserRequest): Promise<DfnsRecoverUserResponse> {
    try {
      this.validateRecoverUserRequest(request);

      const response = await this.workingClient.makeRequest(
        'POST',
        '/auth/recover/user',
        request
      ) as any;

      this.validateRecoverUserResponse(response);

      console.log('✅ User recovery completed successfully');
      console.log(`👤 Recovered user: ${response.user.username} (${response.user.id})`);
      console.log(`🔑 New credential: ${response.credential.name} (${response.credential.kind})`);
      console.log('⚠️ All previous credentials and PATs have been invalidated');
      
      return response as DfnsRecoverUserResponse;
    } catch (error) {
      console.error('❌ Failed to recover user:', error);
      throw this.handleRecoveryError(error, 'recoverUser');
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  // =====================================================
  // HELPER METHODS & UTILITIES
  // =====================================================

  /**
   * Create recovery credential assertion for signing new credentials
   * 
   * This helper method constructs the challenge string needed for the 
   * recovery credential assertion based on the new credentials being created.
   * 
   * @param newCredentials - The new credentials being registered
   * @returns Base64url-encoded challenge string
   */
  createRecoveryChallengeFromCredentials(newCredentials: DfnsNewCredentials): string {
    try {
      // Serialize the newCredentials object to JSON
      const credentialsJson = JSON.stringify(newCredentials);
      
      // Base64url encode the JSON string (this becomes the challenge)
      const challenge = btoa(credentialsJson)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return challenge;
    } catch (error) {
      throw new DfnsValidationError('Failed to create recovery challenge from new credentials');
    }
  }

  /**
   * Validate recovery credential for WebAuthn operations
   */
  async validateRecoveryCredential(credentialId: string): Promise<boolean> {
    try {
      // Basic validation - credential ID should be base64url encoded
      if (!credentialId || credentialId.length < 16) {
        return false;
      }
      
      // Check if credential ID contains valid base64url characters
      const base64urlPattern = /^[A-Za-z0-9_-]+$/;
      return base64urlPattern.test(credentialId);
    } catch {
      return false;
    }
  }

  /**
   * Get recovery status for a user (basic implementation)
   * Note: DFNS doesn't provide direct endpoint for this, would need credential listing
   */
  async getRecoveryStatus(username: string, orgId: string): Promise<{
    hasRecoveryCredentials: boolean;
    recoveryCredentialCount: number;
    canInitiateRecovery: boolean;
  }> {
    try {
      // Note: This would need to be implemented through credential listing endpoints
      // For now, return a basic structure indicating limited information available
      
      console.log('ℹ️ Recovery status check - limited information available without credential access');
      console.log(`👤 Checking recovery status for: ${username} in org: ${orgId}`);
      
      return {
        hasRecoveryCredentials: false,
        recoveryCredentialCount: 0,
        canInitiateRecovery: true // Basic recovery flow is always available
      };
    } catch (error) {
      console.error('❌ Failed to get recovery status:', error);
      return {
        hasRecoveryCredentials: false,
        recoveryCredentialCount: 0,
        canInitiateRecovery: false
      };
    }
  }

  /**
   * Check if current authentication supports delegated recovery
   */
  canPerformDelegatedRecovery(): boolean {
    const authMethod = this.workingClient.getAuthMethod();
    return authMethod.includes('SERVICE_ACCOUNT');
  }

  /**
   * Get recovery workflow information
   */
  getRecoveryWorkflowInfo(): {
    supportedFlows: string[];
    authenticationRequired: boolean;
    permissionsRequired: string[];
  } {
    const canDelegated = this.canPerformDelegatedRecovery();
    
    return {
      supportedFlows: [
        'Standard Recovery (Email verification)',
        ...(canDelegated ? ['Delegated Recovery (Service Account)'] : [])
      ],
      authenticationRequired: false,
      permissionsRequired: canDelegated ? ['Auth:Recover:Delegated (for delegated recovery only)'] : []
    };
  }

  // =====================================================
  // VALIDATION METHODS
  // =====================================================

  private validateSendRecoveryCodeRequest(request: DfnsSendRecoveryCodeRequest): void {
    if (!request.username || !request.username.includes('@')) {
      throw new DfnsValidationError('Valid email address (username) is required');
    }
    
    if (!request.orgId || request.orgId.length < 10) {
      throw new DfnsValidationError('Valid organization ID is required');
    }
  }

  private validateCreateRecoveryRequest(request: DfnsCreateRecoveryRequest): void {
    if (!request.username || !request.username.includes('@')) {
      throw new DfnsValidationError('Valid email address (username) is required');
    }
    
    if (!request.verificationCode || request.verificationCode.length < 4) {
      throw new DfnsValidationError('Valid verification code is required');
    }
    
    if (!request.orgId || request.orgId.length < 10) {
      throw new DfnsValidationError('Valid organization ID is required');
    }
    
    if (!request.credentialId || request.credentialId.length < 16) {
      throw new DfnsValidationError('Valid recovery credential ID is required');
    }
  }

  private validateCreateDelegatedRecoveryRequest(request: DfnsDelegatedRecoveryRequest): void {
    if (!request.username || !request.username.includes('@')) {
      throw new DfnsValidationError('Valid email address (username) is required');
    }
    
    if (!request.credentialId || request.credentialId.length < 16) {
      throw new DfnsValidationError('Valid recovery credential ID is required');
    }
  }

  private validateRecoverUserRequest(request: DfnsRecoverUserRequest): void {
    if (!request.recovery || request.recovery.kind !== 'RecoveryKey') {
      throw new DfnsValidationError('Recovery must use RecoveryKey kind');
    }
    
    if (!request.recovery.credentialAssertion) {
      throw new DfnsValidationError('Recovery credential assertion is required');
    }
    
    if (!request.recovery.credentialAssertion.credId || 
        !request.recovery.credentialAssertion.clientData || 
        !request.recovery.credentialAssertion.signature) {
      throw new DfnsValidationError('Complete recovery credential assertion (credId, clientData, signature) is required');
    }
    
    if (!request.newCredentials || !request.newCredentials.firstFactorCredential) {
      throw new DfnsValidationError('At least a first factor credential is required for recovery');
    }
    
    const firstFactor = request.newCredentials.firstFactorCredential;
    if (!['Fido2', 'Key'].includes(firstFactor.credentialKind)) {
      throw new DfnsValidationError('First factor credential must be Fido2 or Key');
    }
    
    if (!firstFactor.credentialInfo || 
        !firstFactor.credentialInfo.credId || 
        !firstFactor.credentialInfo.clientData || 
        !firstFactor.credentialInfo.attestationData) {
      throw new DfnsValidationError('Complete first factor credential info is required');
    }
  }

  private validateRecoveryResponse(response: any): void {
    if (!response.temporaryAuthenticationToken) {
      throw new DfnsError('Invalid recovery challenge response: missing temporary auth token', 'INVALID_RESPONSE');
    }
    
    if (!response.challenge) {
      throw new DfnsError('Invalid recovery challenge response: missing challenge', 'INVALID_RESPONSE');
    }
    
    if (!response.allowedRecoveryCredentials || !Array.isArray(response.allowedRecoveryCredentials)) {
      throw new DfnsError('Invalid recovery challenge response: missing recovery credentials', 'INVALID_RESPONSE');
    }
  }

  private validateRecoverUserResponse(response: any): void {
    if (!response.user || !response.user.id || !response.user.username) {
      throw new DfnsError('Invalid recover user response: missing user data', 'INVALID_RESPONSE');
    }
    
    if (!response.credential || !response.credential.uuid || !response.credential.kind) {
      throw new DfnsError('Invalid recover user response: missing credential data', 'INVALID_RESPONSE');
    }
  }

  private handleRecoveryError(error: unknown, operation: string): Error {
    if (error instanceof DfnsError) {
      return error;
    }
    
    const errorObj = error as any;
    const message = errorObj?.message || 'Unknown error occurred';
    const statusCode = errorObj?.status || errorObj?.statusCode;
    
    // Handle specific HTTP status codes
    switch (statusCode) {
      case 400:
        return new DfnsValidationError(`${operation}: ${message}`);
      case 401:
        return new DfnsAuthenticationError(`${operation}: Authentication failed - ${message}`);
      case 403:
        return new DfnsAuthenticationError(`${operation}: Insufficient permissions - ${message}`);
      case 404:
        return new DfnsError(`${operation}: User or credential not found - ${message}`, 'NOT_FOUND');
      case 429:
        return new DfnsError(`${operation}: Rate limit exceeded - ${message}`, 'RATE_LIMIT');
      default:
        return new DfnsError(`${operation}: ${message}`, 'RECOVERY_ERROR');
    }
  }
}
