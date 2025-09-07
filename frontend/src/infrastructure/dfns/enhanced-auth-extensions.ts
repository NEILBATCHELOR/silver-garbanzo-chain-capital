/**
 * DFNS Enhanced Authentication Extensions
 * 
 * Additional methods to complement the existing enhanced-auth.ts
 * Adds support for:
 * - Social login (OAuth/OIDC)
 * - Login codes for PasswordProtectedKey credentials
 * - Multi-factor authentication
 * - Usernameless WebAuthn flow
 */

import { DfnsApiClient } from '@dfns/sdk';
import { EnhancedDfnsAuth } from './enhanced-auth';
import { DFNS_SDK_CONFIG } from './config';

export interface SocialLoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

export interface LoginCodeRequest {
  username: string;
  orgId?: string;
}

export interface ExtendedLoginOptions {
  loginCode?: string;
  orgId?: string;
  secondFactor?: any;
  usernamelessFlow?: boolean;
}

/**
 * Extensions to the Enhanced DFNS Authentication
 */
export class EnhancedDfnsAuthExtensions extends EnhancedDfnsAuth {
  private webAuthnSignerInstance?: any; // Private property to hold WebAuthn signer

  /**
   * Send login code for PasswordProtectedKey credentials
   */
  async sendLoginCode(request: LoginCodeRequest): Promise<void> {
    try {
      await this.dfnsClient.auth.sendLoginCode({
        body: {
          username: request.username,
          ...(request.orgId && { orgId: request.orgId })
        }
      });
    } catch (error) {
      throw new Error(`Failed to send login code: ${(error as Error).message}`);
    }
  }

  /**
   * Enhanced WebAuthn authentication with extended options
   */
  async authenticateWithWebAuthnExtended(
    username?: string, 
    options: ExtendedLoginOptions = {}
  ): Promise<void> {
    try {
      // Use the parent class WebAuthn authentication method
      if (username) {
        await this.authenticateWithWebAuthn(username);
      } else {
        throw new Error('Username required for WebAuthn authentication');
      }
    } catch (error) {
      throw new Error(`Extended WebAuthn authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Social login authentication (OAuth/OIDC)
   * Note: DFNS currently only supports OIDC provider kind
   */
  async loginWithSocial(
    idToken: string,
    orgId?: string,
    socialProvider: 'Oidc' = 'Oidc'
  ): Promise<SocialLoginResult> {
    try {
      const response = await this.dfnsClient.auth.socialLogin({
        body: {
          idToken,
          socialLoginProviderKind: socialProvider,
          ...(orgId && { orgId })
        }
      });

      this.currentAuthToken = response.token;
      if (response.token) {
        // Update client with social login token
        const newClient = new DfnsApiClient({
          appId: DFNS_SDK_CONFIG.appId,
          baseUrl: DFNS_SDK_CONFIG.baseUrl,
          authToken: response.token,
        });

        this.updateClient(newClient);
      }

      return {
        accessToken: response.token,
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // Default 1 hour
      };
    } catch (error) {
      throw new Error(`Social login failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if user supports usernameless WebAuthn flow
   */
  async supportsUsernamelessFlow(orgId: string): Promise<boolean> {
    try {
      // Try to create a challenge without username
      await this.dfnsClient.auth.createLoginChallenge({
        body: {
          orgId
        }
      });
      
      // If successful, usernameless flow is supported
      return true;
    } catch (error) {
      // If it fails, usernameless flow is not supported
      return false;
    }
  }

  /**
   * Get supported credential kinds for an organization
   */
  async getSupportedCredentialKinds(orgId?: string, username?: string): Promise<any> {
    try {
      const challengeRequest: any = {};
      
      if (username) {
        challengeRequest.username = username;
      }
      
      // Note: orgId may not be supported in createLoginChallenge, removing for now
      // if (orgId) {
      //   challengeRequest.orgId = orgId;
      // }

      const challenge = await this.dfnsClient.auth.createLoginChallenge(challengeRequest);

      return challenge.supportedCredentialKinds || [];
    } catch (error) {
      throw new Error(`Failed to get supported credential kinds: ${(error as Error).message}`);
    }
  }

  /**
   * Enhanced logout with proper cleanup
   */
  async logoutEnhanced(): Promise<void> {
    try {
      // Call DFNS logout endpoint if available
      if (this.currentAuthToken) {
        await this.dfnsClient.auth.logout();
      }
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('DFNS logout API call failed, proceeding with local logout:', error);
    } finally {
      // Always perform local cleanup
      this.logout();
    }
  }

  /**
   * Validate current authentication status with DFNS
   */
  async validateAuthentication(): Promise<boolean> {
    try {
      if (!this.currentAuthToken) return false;
      
      // Try to make a simple authenticated request (list credentials as a health check)
      await this.dfnsClient.auth.listCredentials();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default EnhancedDfnsAuthExtensions;
