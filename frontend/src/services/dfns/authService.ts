/**
 * DFNS Authentication Service
 * 
 * High-level authentication service implementing delegated auth flows
 */

import type {
  DfnsDelegatedRegistrationRequest,
  DfnsDelegatedRegistrationResponse,
  DfnsUserRegistrationRequest,
  DfnsAuthTokenResponse,
  DfnsDelegatedLoginRequest,
  DfnsUserActionSigner,
  DfnsUserActionSignature,
  DfnsUser,
  DfnsUserRegistrationInitRequest,
  DfnsUserRegistrationInitResponse,
  DfnsEndUserRegistrationRequest,
  DfnsEndUserRegistrationResponse,
  DfnsSocialRegistrationRequest,
  DfnsSocialRegistrationResponse,
  DfnsResendRegistrationCodeRequest,
  DfnsResendRegistrationCodeResponse,
  DfnsCredentialInfo,
  DfnsWalletCreationSpec,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsCredentialManager } from '../../infrastructure/dfns/auth/credentialManager';
import { DfnsSessionManager } from '../../infrastructure/dfns/auth/sessionManager';
import { DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

export class DfnsAuthService {
  constructor(
    private authClient: DfnsAuthClient,
    private credentialManager: DfnsCredentialManager,
    private sessionManager: DfnsSessionManager
  ) {}

  /**
   * Register a new user using delegated registration
   * This is typically called by service accounts on behalf of end users
   */
  async registerUser(email: string, kind: 'EndUser' | 'Employee' = 'EndUser'): Promise<{
    registrationChallenge: DfnsDelegatedRegistrationResponse;
    completeRegistration: (credentialAssertion: any) => Promise<DfnsAuthTokenResponse>;
  }> {
    try {
      // Validate input
      if (!email || !email.includes('@')) {
        throw new DfnsValidationError('Valid email address is required');
      }

      // Initiate delegated registration
      const request: DfnsDelegatedRegistrationRequest = { email, kind };
      const registrationChallenge = await this.authClient.initiateDelegatedRegistration(request);

      // Return challenge and completion function
      return {
        registrationChallenge,
        completeRegistration: async (credentialAssertion: any) => {
          return this.completeUserRegistration(registrationChallenge, credentialAssertion);
        }
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`User registration failed: ${error}`);
    }
  }

  /**
   * Register a new user using standard registration (with registration code)
   * This is the typical flow for direct user registration
   */
  async registerUserWithCode(
    username: string, 
    registrationCode: string, 
    orgId: string
  ): Promise<{
    registrationChallenge: DfnsUserRegistrationInitResponse;
    completeRegistration: (credentialAssertion: any) => Promise<DfnsAuthTokenResponse>;
  }> {
    try {
      // Validate input
      if (!username || !username.includes('@')) {
        throw new DfnsValidationError('Valid email address is required');
      }
      if (!registrationCode) {
        throw new DfnsValidationError('Registration code is required');
      }
      if (!orgId) {
        throw new DfnsValidationError('Organization ID is required');
      }

      // Initiate standard registration
      const request: DfnsUserRegistrationInitRequest = { username, registrationCode, orgId };
      const registrationChallenge = await this.authClient.initiateUserRegistration(request);

      // Return challenge and completion function
      return {
        registrationChallenge,
        completeRegistration: async (credentialAssertion: any) => {
          return this.completeStandardUserRegistration(registrationChallenge, credentialAssertion);
        }
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`Standard user registration failed: ${error}`);
    }
  }

  /**
   * Register an end user with automatic wallet creation
   * This is ideal for onboarding as it creates wallets during registration
   */
  async registerEndUserWithWallets(
    credential: DfnsCredentialInfo,
    walletSpecs: DfnsWalletCreationSpec[],
    recoveryCredential?: DfnsCredentialInfo
  ): Promise<DfnsEndUserRegistrationResponse> {
    try {
      // Validate input
      if (!credential) {
        throw new DfnsValidationError('First factor credential is required');
      }
      if (!walletSpecs || walletSpecs.length === 0) {
        throw new DfnsValidationError('At least one wallet specification is required');
      }

      // Prepare end user registration request
      const request: DfnsEndUserRegistrationRequest = {
        firstFactorCredential: credential,
        recoveryCredential,
        wallets: walletSpecs
      };

      // Complete end user registration
      const response = await this.authClient.completeEndUserRegistration(request);
      
      // Create session from the response
      if (response.authentication?.token) {
        const authResponse: DfnsAuthTokenResponse = {
          token: response.authentication.token,
          expiresIn: 3600, // Default to 1 hour
          tokenType: 'Bearer',
          user: {
            id: response.user.id,
            username: response.user.username,
            status: 'Active',
            kind: 'EndUser'
          }
        };
        this.sessionManager.createSession(authResponse);
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(`End user registration failed: ${error}`);
    }
  }

  /**
   * Register a user using social authentication (OAuth)
   * Supports providers like Google via OIDC
   */
  async registerUserWithSocial(
    idToken: string,
    provider: 'Oidc' = 'Oidc',
    orgId?: string
  ): Promise<{
    registrationChallenge: DfnsSocialRegistrationResponse;
    completeRegistration: (credentialAssertion: any) => Promise<DfnsAuthTokenResponse>;
  }> {
    try {
      // Validate input
      if (!idToken) {
        throw new DfnsValidationError('ID token is required');
      }

      // Initiate social registration
      const request: DfnsSocialRegistrationRequest = {
        idToken,
        socialLoginProviderKind: provider,
        orgId
      };
      const registrationChallenge = await this.authClient.initiateSocialRegistration(request);

      // Return challenge and completion function
      return {
        registrationChallenge,
        completeRegistration: async (credentialAssertion: any) => {
          return this.completeSocialUserRegistration(registrationChallenge, credentialAssertion);
        }
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`Social registration failed: ${error}`);
    }
  }

  /**
   * Resend registration code to user's email
   * Useful when the original code expires or gets lost
   */
  async resendRegistrationCode(
    username: string, 
    orgId: string
  ): Promise<DfnsResendRegistrationCodeResponse> {
    try {
      // Validate input
      if (!username || !username.includes('@')) {
        throw new DfnsValidationError('Valid email address is required');
      }
      if (!orgId) {
        throw new DfnsValidationError('Organization ID is required');
      }

      const request: DfnsResendRegistrationCodeRequest = { username, orgId };
      return await this.authClient.resendRegistrationCode(request);
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to resend registration code: ${error}`);
    }
  }

  /**
   * Create WebAuthn credential for standard registration
   */
  async createWebAuthnCredentialForRegistration(
    challenge: DfnsUserRegistrationInitResponse,
    credentialName?: string
  ): Promise<DfnsCredentialInfo> {
    try {
      const credential = await this.credentialManager.registerWebAuthnCredential(
        challenge.challenge,
        challenge.user,
        credentialName
      );

      // Convert to DFNS credential format
      return {
        credentialKind: 'Fido2',
        credentialInfo: {
          credId: credential.id,
          clientData: this.arrayBufferToBase64((credential as any).response.clientDataJSON),
          attestationData: this.arrayBufferToBase64((credential as any).response.attestationObject)
        }
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`WebAuthn credential creation failed: ${error}`);
    }
  }

  /**
   * Complete user registration with WebAuthn credential (delegated)
   */
  private async completeUserRegistration(
    challenge: DfnsDelegatedRegistrationResponse,
    credentialAssertion: any
  ): Promise<DfnsAuthTokenResponse> {
    try {
      // Prepare registration request
      const registrationRequest: DfnsUserRegistrationRequest = {
        challengeIdentifier: challenge.challenge,
        firstFactor: {
          kind: 'Fido2',
          credentialAssertion
        }
      };

      // Complete registration
      const authResponse = await this.authClient.completeUserRegistration(registrationRequest);
      
      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Registration completion failed: ${error}`);
    }
  }

  /**
   * Complete standard user registration with WebAuthn credential
   */
  private async completeStandardUserRegistration(
    challenge: DfnsUserRegistrationInitResponse,
    credentialAssertion: any
  ): Promise<DfnsAuthTokenResponse> {
    try {
      // Prepare enhanced registration request
      const registrationRequest = {
        firstFactorCredential: {
          credentialKind: 'Fido2' as const,
          credentialInfo: {
            credId: credentialAssertion.id || '',
            clientData: credentialAssertion.response?.clientDataJSON || '',
            attestationData: credentialAssertion.response?.attestationObject || ''
          }
        }
      };

      // Complete enhanced registration
      const response = await this.authClient.completeEnhancedUserRegistration(registrationRequest);
      
      // Convert to auth token response
      const authResponse: DfnsAuthTokenResponse = {
        token: challenge.temporaryAuthenticationToken, // Use temporary token
        expiresIn: 3600, // Default to 1 hour
        tokenType: 'Bearer',
        user: {
          id: response.user.id,
          username: response.user.username,
          status: 'Active',
          kind: 'EndUser'
        }
      };
      
      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Standard registration completion failed: ${error}`);
    }
  }

  /**
   * Complete social user registration with WebAuthn credential
   */
  private async completeSocialUserRegistration(
    challenge: DfnsSocialRegistrationResponse,
    credentialAssertion: any
  ): Promise<DfnsAuthTokenResponse> {
    try {
      // Prepare enhanced registration request
      const registrationRequest = {
        firstFactorCredential: {
          credentialKind: 'Fido2' as const,
          credentialInfo: {
            credId: credentialAssertion.id || '',
            clientData: credentialAssertion.response?.clientDataJSON || '',
            attestationData: credentialAssertion.response?.attestationObject || ''
          }
        }
      };

      // Complete enhanced registration
      const response = await this.authClient.completeEnhancedUserRegistration(registrationRequest);
      
      // Convert to auth token response
      const authResponse: DfnsAuthTokenResponse = {
        token: challenge.temporaryAuthenticationToken, // Use temporary token
        expiresIn: 3600, // Default to 1 hour
        tokenType: 'Bearer',
        user: {
          id: response.user.id,
          username: response.user.username,
          status: 'Active',
          kind: 'EndUser'
        }
      };
      
      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Social registration completion failed: ${error}`);
    }
  }

  /**
   * Register WebAuthn credential for current user
   */
  async registerWebAuthnCredential(name?: string): Promise<void> {
    try {
      const session = this.sessionManager.getCurrentSession();
      if (!session) {
        throw new DfnsAuthenticationError('User must be authenticated to register credentials');
      }

      // Get user action challenge for credential registration
      const challenge = await this.authClient.initiateUserActionChallenge(
        'CreateCredential',
        { name: name || `Credential ${Date.now()}` }
      );

      // Register credential using WebAuthn
      await this.credentialManager.registerWebAuthnCredential(
        challenge.challenge,
        {
          id: session.user_id,
          name: session.user_id,
          displayName: session.user_id
        },
        name
      );
    } catch (error) {
      throw new DfnsAuthenticationError(`Credential registration failed: ${error}`);
    }
  }

  /**
   * Login with delegated authentication
   * Used when the application handles user authentication internally
   */
  async delegatedLogin(username: string, orgId?: string): Promise<DfnsAuthTokenResponse> {
    try {
      const request: DfnsDelegatedLoginRequest = { username, orgId };
      const authResponse = await this.authClient.delegatedLogin(request);
      
      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Delegated login failed: ${error}`);
    }
  }

  /**
   * Standard login with username and WebAuthn
   */
  async login(username: string): Promise<{
    loginChallenge: any;
    completeLogin: (credentialAssertion: any) => Promise<DfnsAuthTokenResponse>;
  }> {
    try {
      // Initiate login challenge
      const loginChallenge = await this.authClient.initiateLogin(username);

      return {
        loginChallenge,
        completeLogin: async (credentialAssertion: any) => {
          return this.completeLogin(loginChallenge, credentialAssertion);
        }
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`Login initiation failed: ${error}`);
    }
  }

  /**
   * Complete login with WebAuthn credential
   */
  private async completeLogin(challenge: any, credentialAssertion: any): Promise<DfnsAuthTokenResponse> {
    try {
      const loginRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        firstFactor: {
          kind: 'Fido2' as const,
          credentialAssertion
        }
      };

      const authResponse = await this.authClient.completeLogin(loginRequest);
      
      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Login completion failed: ${error}`);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken?: string): Promise<DfnsAuthTokenResponse> {
    try {
      const tokenToRefresh = refreshToken || this.sessionManager.getCurrentSession()?.refresh_token;
      
      if (!tokenToRefresh) {
        throw new DfnsAuthenticationError('No refresh token available');
      }

      const authResponse = await this.authClient.refreshToken(tokenToRefresh);
      
      // Update session
      this.sessionManager.updateSession(authResponse);

      return authResponse;
    } catch (error) {
      // Clear session on refresh failure
      this.sessionManager.clearSession();
      throw new DfnsAuthenticationError(`Token refresh failed: ${error}`);
    }
  }

  /**
   * Social login with OAuth providers (Google, etc.)
   * Completes login using ID token from external OAuth provider
   */
  async loginWithSocial(
    idToken: string,
    provider: 'Oidc' = 'Oidc',
    orgId?: string
  ): Promise<DfnsAuthTokenResponse> {
    try {
      // Validate input
      if (!idToken) {
        throw new DfnsValidationError('ID token is required');
      }

      // Perform social login
      const response = await this.authClient.socialLogin({
        idToken,
        socialLoginProviderKind: provider,
        orgId
      });

      // Convert to standard auth token response
      const authResponse: DfnsAuthTokenResponse = {
        token: response.token,
        expiresIn: 3600, // Default to 1 hour
        tokenType: 'Bearer',
        user: {
          id: 'social-user', // Will be updated by session manager
          username: 'social-user',
          status: 'Active',
          kind: 'EndUser'
        }
      };

      // Create session
      this.sessionManager.createSession(authResponse);

      return authResponse;
    } catch (error) {
      throw new DfnsAuthenticationError(`Social login failed: ${error}`);
    }
  }

  /**
   * Send login code to user's email
   * Required for users with PasswordProtectedKey credentials
   */
  async sendLoginCode(
    username: string,
    orgId: string
  ): Promise<void> {
    try {
      // Validate input
      if (!username || !username.includes('@')) {
        throw new DfnsValidationError('Valid email address is required');
      }
      if (!orgId) {
        throw new DfnsValidationError('Organization ID is required');
      }

      // Send login code
      await this.authClient.sendLoginCode({ username, orgId });
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to send login code: ${error}`);
    }
  }

  /**
   * Logout and clear session
   * Updated to use proper DFNS logout endpoint
   */
  async logout(): Promise<void> {
    try {
      const session = this.sessionManager.getCurrentSession();
      if (session) {
        await this.authClient.logout(session.token);
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn('Remote logout failed:', error);
    } finally {
      this.sessionManager.clearSession();
    }
  }

  /**
   * Create user action signer for sensitive operations
   * This creates a simplified signer interface that can be used by the DFNS client
   */
  createUserActionSigner(): DfnsUserActionSigner {
    return {
      signUserAction: async (challenge: string): Promise<DfnsUserActionSignature> => {
        try {
          // Get allowed credentials from session or stored credentials
          const credentials = await this.credentialManager.listCredentials();
          const allowedCredentials = credentials.map(cred => ({
            type: 'public-key' as const,
            id: cred.credential_id,
            transports: ['usb', 'nfc', 'ble', 'internal', 'hybrid'] as AuthenticatorTransport[]
          }));

          // Authenticate with WebAuthn
          const assertion = await this.credentialManager.authenticateWithWebAuthn(
            challenge,
            allowedCredentials
          );

          // Create and return signature response
          return this.authClient.createUserActionSignature(challenge, assertion);
        } catch (error) {
          throw new DfnsAuthenticationError(`User action signing failed: ${error}`);
        }
      }
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionManager.isAuthenticated();
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.sessionManager.getAuthToken();
  }

  /**
   * Get current user session
   */
  getCurrentSession() {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Validate if WebAuthn is supported
   */
  static isWebAuthnSupported(): boolean {
    return DfnsCredentialManager.isWebAuthnSupported();
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return window.btoa(binary);
  }
}
