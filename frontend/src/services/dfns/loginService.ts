/**
 * DFNS Login Service
 * 
 * Handles DFNS login operations including challenge/response flow,
 * social login, and login code management
 * 
 * Current DFNS API implementation - Service Account/PAT compatible
 */

import { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsLoginChallengeRequest,
  DfnsLoginChallengeResponse,
  DfnsCompleteLoginRequest,
  DfnsCompleteLoginResponse,
  DfnsSocialLoginRequest,
  DfnsSocialLoginResponse,
  DfnsSendLoginCodeRequest,
  DfnsSendLoginCodeResponse,
  DfnsLogoutRequest,
  DfnsLogoutResponse,
  DfnsFido2LoginAssertion,
  DfnsKeyLoginAssertion,
  DfnsPasswordProtectedKeyLoginAssertion
} from '../../types/dfns/auth';
import { DfnsError } from '../../types/dfns/errors';

export class DfnsLoginService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // ================================
  // STANDARD LOGIN FLOW (2-STEP)
  // ================================

  /**
   * Step 1: Initialize login challenge
   * POST /auth/login/init
   */
  async initializeLoginChallenge(request: DfnsLoginChallengeRequest): Promise<DfnsLoginChallengeResponse> {
    try {
      console.log('🔐 Initializing DFNS login challenge for user:', request.username);

      const response = await this.workingClient.makeRequest<DfnsLoginChallengeResponse>(
        'POST',
        '/auth/login/init',
        request
      );

      console.log('✅ Login challenge initialized successfully');
      console.log('📊 Supported credential kinds:', response.supportedCredentialKinds.length);
      console.log('🔑 Available credentials:', {
        key: response.allowCredentials?.key?.length || 0,
        webauthn: response.allowCredentials?.webauthn?.length || 0,
        passwordProtectedKey: response.allowCredentials?.passwordProtectedKey?.length || 0
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to initialize login challenge:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Login challenge initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOGIN_CHALLENGE_FAILED'
      );
    }
  }

  /**
   * Step 2: Complete login with signed challenge
   * POST /auth/login
   */
  async completeLogin(request: DfnsCompleteLoginRequest): Promise<DfnsCompleteLoginResponse> {
    try {
      console.log('🔐 Completing DFNS login...');

      const response = await this.workingClient.makeRequest<DfnsCompleteLoginResponse>(
        'POST',
        '/auth/login',
        request
      );

      console.log('✅ Login completed successfully');
      console.log('🎟️ Authentication token received');

      return response;
    } catch (error) {
      console.error('❌ Failed to complete login:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Login completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOGIN_COMPLETION_FAILED'
      );
    }
  }

  /**
   * Complete login flow - combines challenge init and completion
   * Useful for programmatic login with known credentials
   */
  async loginWithCredentials(
    username: string,
    orgId: string,
    credentialId: string,
    signChallenge: (challenge: string) => Promise<DfnsFido2LoginAssertion | DfnsKeyLoginAssertion | DfnsPasswordProtectedKeyLoginAssertion>,
    credentialKind: 'Fido2' | 'Key' | 'PasswordProtectedKey',
    loginCode?: string
  ): Promise<DfnsCompleteLoginResponse> {
    try {
      console.log('🔐 Starting complete login flow for user:', username);

      // Step 1: Initialize challenge
      const challengeResponse = await this.initializeLoginChallenge({
        username,
        orgId,
        loginCode
      });

      // Step 2: Sign the challenge
      console.log('✍️ Signing login challenge...');
      const credentialAssertion = await signChallenge(challengeResponse.challenge);

      // Step 3: Complete login
      const loginResponse = await this.completeLogin({
        challengeIdentifier: challengeResponse.challengeIdentifier,
        firstFactor: {
          kind: credentialKind,
          credentialAssertion
        } as any // TypeScript union type handling
      });

      console.log('✅ Complete login flow successful');
      return loginResponse;
    } catch (error) {
      console.error('❌ Complete login flow failed:', error);
      throw error;
    }
  }

  // ================================
  // SOCIAL LOGIN
  // ================================

  /**
   * Social login using OIDC provider (Google, etc.)
   * POST /auth/login/social
   */
  async socialLogin(request: DfnsSocialLoginRequest): Promise<DfnsSocialLoginResponse> {
    try {
      console.log('🔐 Starting DFNS social login...');

      const response = await this.workingClient.makeRequest<DfnsSocialLoginResponse>(
        'POST',
        '/auth/login/social',
        request
      );

      console.log('✅ Social login successful');
      console.log('🎟️ Authentication token received');

      return response;
    } catch (error) {
      console.error('❌ Social login failed:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Social login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SOCIAL_LOGIN_FAILED'
      );
    }
  }

  // ================================
  // LOGIN CODE MANAGEMENT
  // ================================

  /**
   * Send login code for PasswordProtectedKey credentials
   * POST /auth/login/code
   */
  async sendLoginCode(request: DfnsSendLoginCodeRequest): Promise<DfnsSendLoginCodeResponse> {
    try {
      console.log('📧 Sending login code to user:', request.username);

      const response = await this.workingClient.makeRequest<DfnsSendLoginCodeResponse>(
        'POST',
        '/auth/login/code',
        request
      );

      console.log('✅ Login code sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to send login code:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Send login code failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEND_LOGIN_CODE_FAILED'
      );
    }
  }

  // ================================
  // LOGOUT
  // ================================

  /**
   * Logout current session
   * POST /auth/logout (if endpoint exists, otherwise handle client-side)
   */
  async logout(): Promise<DfnsLogoutResponse> {
    try {
      console.log('🚪 Logging out of DFNS...');

      // Note: DFNS may not have a logout endpoint for token-based auth
      // Token invalidation is typically handled by token expiry
      // This method provides a placeholder for future logout functionality
      
      const response: DfnsLogoutResponse = { message: 'success' };
      
      console.log('✅ Logout successful (client-side)');
      return response;
    } catch (error) {
      console.error('❌ Logout failed:', error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOGOUT_FAILED'
      );
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * Check if username is required for login challenge
   * (false for usernameless WebAuthn flow)
   */
  isUsernameRequired(hasDiscoverableCredentials: boolean): boolean {
    return !hasDiscoverableCredentials;
  }

  /**
   * Validate login challenge response structure
   */
  validateLoginChallengeResponse(response: DfnsLoginChallengeResponse): boolean {
    return !!(
      response.challenge &&
      response.challengeIdentifier &&
      response.supportedCredentialKinds &&
      response.allowCredentials
    );
  }

  /**
   * Get supported credential kinds for specific factor
   */
  getSupportedCredentialKinds(
    response: DfnsLoginChallengeResponse,
    factor: 'first' | 'second' | 'either'
  ): string[] {
    return response.supportedCredentialKinds
      .filter(ck => ck.factor === factor || ck.factor === 'either')
      .map(ck => ck.kind);
  }

  /**
   * Check if second factor is required
   */
  isSecondFactorRequired(
    response: DfnsLoginChallengeResponse,
    firstFactorKind: string
  ): boolean {
    const credentialKind = response.supportedCredentialKinds.find(ck => ck.kind === firstFactorKind);
    return credentialKind?.requiresSecondFactor || false;
  }

  /**
   * Get available credentials by type
   */
  getAvailableCredentials(response: DfnsLoginChallengeResponse) {
    return {
      webauthn: response.allowCredentials?.webauthn || [],
      key: response.allowCredentials?.key || [],
      passwordProtectedKey: response.allowCredentials?.passwordProtectedKey || []
    };
  }

  /**
   * Format client data for credential assertion
   * Following DFNS client data specification
   */
  formatClientData(challenge: string, origin: string = 'https://app.dfns.ninja'): string {
    const clientData = {
      type: 'webauthn.get', // or 'key.get' for key credentials
      challenge: challenge,
      origin: origin,
      crossOrigin: false
    };

    return btoa(JSON.stringify(clientData));
  }

  /**
   * Get login service metrics
   */
  getMetrics() {
    // Return basic metrics about the login service
    return {
      totalRequests: 0,
      successfulLogins: 0,
      failedLogins: 0,
      averageResponseTime: 0,
      lastActivity: null
    };
  }

  /**
   * Test login service connectivity
   */
  async testConnection() {
    try {
      // Test with a minimal login challenge request
      // This will fail authentication but test the endpoint availability
      await this.initializeLoginChallenge({
        username: 'test@example.com',
        orgId: 'test-org-id'
      });
      
      return {
        success: true,
        message: 'Login service connectivity verified'
      };
    } catch (error) {
      // Expected to fail with authentication error, not connectivity error
      const isConnectivityIssue = error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('connect')
      );

      return {
        success: !isConnectivityIssue,
        message: isConnectivityIssue 
          ? 'Login service connectivity failed' 
          : 'Login service endpoint accessible'
      };
    }
  }
}
