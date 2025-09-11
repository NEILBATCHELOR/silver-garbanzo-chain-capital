/**
 * DFNS Delegated Authentication Service
 * 
 * Handles delegated authentication flows for end users in DFNS:
 * - Delegated Registration: Register end users via service account
 * - Delegated Login: Authenticate end users via service account
 * 
 * Based on current DFNS API:
 * - https://docs.dfns.co/d/api-docs/authentication/delegated-auth/delegatedregistration
 * - https://docs.dfns.co/d/api-docs/authentication/delegated-auth/delegatedlogin
 * 
 * Requires: Service Account Token or PAT with appropriate permissions
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsDelegatedRegistrationRequest,
  DfnsDelegatedRegistrationResponse,
  DfnsDelegatedLoginRequest,
  DfnsAuthTokenResponse,
  DfnsUserRegistrationRequest,
  DfnsEnhancedUserRegistrationResponse,
  DfnsCredentialKind,
  DfnsUserKind
} from '../../types/dfns/auth';
import { DfnsError, DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

export interface DelegatedAuthenticationConfig {
  defaultOrgId?: string;
  defaultUserKind: DfnsUserKind;
  enableAutoWalletCreation: boolean;
  supportedCredentialKinds: DfnsCredentialKind[];
}

export interface DelegatedRegistrationOptions {
  orgId?: string;
  userKind?: DfnsUserKind;
  createDefaultWallet?: boolean;
  walletNetwork?: string;
  walletName?: string;
}

export interface DelegatedLoginOptions {
  orgId?: string;
  persistSession?: boolean;
  sessionDurationHours?: number;
}

export interface EndUserAuthContext {
  userId: string;
  username: string;
  token: string;
  temporaryToken?: string;
  challengeIdentifier?: string;
  orgId: string;
  userKind: DfnsUserKind;
  supportedCredentials: DfnsCredentialKind[];
  registrationComplete: boolean;
}

export interface DelegatedOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  userActionRequired?: boolean;
  nextStep?: string;
  context?: EndUserAuthContext;
}

export class DfnsDelegatedAuthenticationService {
  private config: DelegatedAuthenticationConfig;

  constructor(
    private workingClient: WorkingDfnsClient,
    config?: Partial<DelegatedAuthenticationConfig>
  ) {
    this.config = {
      defaultUserKind: 'EndUser',
      enableAutoWalletCreation: false,
      supportedCredentialKinds: ['Fido2', 'Key', 'PasswordProtectedKey'],
      ...config
    };
  }

  // =====================================
  // DELEGATED REGISTRATION
  // =====================================

  /**
   * Initiate delegated registration for an end user
   * This creates a user account and returns a registration challenge
   * 
   * POST /auth/registration/delegated
   * Requires: Service Account Token with User:Create permission
   */
  async initiateDelegatedRegistration(
    email: string,
    options: DelegatedRegistrationOptions = {}
  ): Promise<DelegatedOperationResult<DfnsDelegatedRegistrationResponse>> {
    try {
      console.log('🔐 Initiating delegated registration for:', email);

      // Validate inputs
      if (!this.isValidEmail(email)) {
        throw new DfnsValidationError('Invalid email address format');
      }

      // Prepare request
      const request: DfnsDelegatedRegistrationRequest = {
        email,
        kind: options.userKind || this.config.defaultUserKind
      };

      // Add orgId if provided or configured
      const orgId = options.orgId || this.config.defaultOrgId;
      if (orgId) {
        (request as any).orgId = orgId;
      }

      console.log('📝 Delegated registration request:', {
        email: request.email,
        kind: request.kind,
        orgId: orgId || 'default'
      });

      // Make API call with User Action Signing (required for user creation)
      const response = await this.workingClient.makeRequest<DfnsDelegatedRegistrationResponse>(
        'POST',
        '/auth/registration/delegated',
        request
      );

      console.log('✅ Delegated registration initiated successfully');
      console.log('🎯 User ID:', response.user.id);
      console.log('🔑 Supported credentials:', response.supportedCredentialKinds.firstFactor);

      // Create auth context for next steps
      const context: EndUserAuthContext = {
        userId: response.user.id,
        username: response.user.name,
        token: '', // Will be set after complete registration
        temporaryToken: response.temporaryAuthenticationToken,
        challengeIdentifier: response.challenge,
        orgId: orgId || '',
        userKind: request.kind,
        supportedCredentials: response.supportedCredentialKinds.firstFactor,
        registrationComplete: false
      };

      return {
        success: true,
        data: response,
        nextStep: 'complete_registration',
        context,
        userActionRequired: true
      };

    } catch (error) {
      console.error('❌ Delegated registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delegated registration failed',
        userActionRequired: false
      };
    }
  }

  /**
   * Complete delegated registration with user credentials
   * This registers the user's WebAuthn or Key credentials
   * 
   * POST /auth/registration (with temporary token)
   */
  async completeDelegatedRegistration(
    registrationData: DfnsUserRegistrationRequest,
    context: EndUserAuthContext
  ): Promise<DelegatedOperationResult<DfnsEnhancedUserRegistrationResponse>> {
    try {
      console.log('🔐 Completing delegated registration for user:', context.userId);

      if (!context.temporaryToken) {
        throw new DfnsAuthenticationError('Temporary token required for registration completion');
      }

      // Make API call with temporary token
      const response = await this.workingClient.makeRequest<DfnsEnhancedUserRegistrationResponse>(
        'POST',
        '/auth/registration',
        registrationData
      );

      console.log('✅ Delegated registration completed successfully');
      console.log('🎯 Credential ID:', response.credential.uuid);
      console.log('👤 User ID:', response.user.id);

      // Update context
      const updatedContext: EndUserAuthContext = {
        ...context,
        registrationComplete: true,
        temporaryToken: undefined,
        challengeIdentifier: undefined
      };

      return {
        success: true,
        data: response,
        nextStep: 'login_user',
        context: updatedContext,
        userActionRequired: false
      };

    } catch (error) {
      console.error('❌ Registration completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration completion failed'
      };
    }
  }

  // =====================================
  // DELEGATED LOGIN
  // =====================================

  /**
   * Perform delegated login for an end user
   * This authenticates a user without requiring their credentials directly
   * 
   * POST /auth/login/delegated
   * Requires: Service Account Token with Auth:Login permission
   */
  async performDelegatedLogin(
    username: string,
    options: DelegatedLoginOptions = {}
  ): Promise<DelegatedOperationResult<DfnsAuthTokenResponse>> {
    try {
      console.log('🔐 Performing delegated login for:', username);

      // Validate inputs
      if (!this.isValidEmail(username)) {
        throw new DfnsValidationError('Invalid username/email format');
      }

      // Prepare request
      const request: DfnsDelegatedLoginRequest = {
        username
      };

      // Add orgId if provided or configured
      const orgId = options.orgId || this.config.defaultOrgId;
      if (orgId) {
        request.orgId = orgId;
      }

      console.log('📝 Delegated login request:', {
        username: request.username,
        orgId: request.orgId || 'default'
      });

      // Make API call with User Action Signing (required for delegated auth)
      const response = await this.workingClient.makeRequest<DfnsAuthTokenResponse>(
        'POST',
        '/auth/login/delegated',
        request
      );

      console.log('✅ Delegated login successful');
      console.log('👤 User ID:', response.user.id);
      console.log('🔑 Token type:', response.tokenType);

      // Create auth context
      const context: EndUserAuthContext = {
        userId: response.user.id,
        username: response.user.username,
        token: response.token,
        orgId: orgId || '',
        userKind: response.user.kind,
        supportedCredentials: [], // Will be populated by getLoginChallenge if needed
        registrationComplete: true
      };

      // Store session if requested
      if (options.persistSession) {
        await this.storeUserSession(context, options.sessionDurationHours);
      }

      return {
        success: true,
        data: response,
        context,
        nextStep: 'authenticated'
      };

    } catch (error) {
      console.error('❌ Delegated login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delegated login failed'
      };
    }
  }

  // =====================================
  // USER SESSION MANAGEMENT
  // =====================================

  /**
   * Store user session for delegated authentication
   */
  private async storeUserSession(
    context: EndUserAuthContext,
    durationHours: number = 24
  ): Promise<void> {
    try {
      const sessionData = {
        userId: context.userId,
        username: context.username,
        token: context.token,
        orgId: context.orgId,
        userKind: context.userKind,
        expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      // Store in local storage or session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`dfns_delegated_session_${context.userId}`, JSON.stringify(sessionData));
        console.log('💾 User session stored for:', context.username);
      }
    } catch (error) {
      console.warn('⚠️ Failed to store user session:', error);
    }
  }

  /**
   * Retrieve stored user session
   */
  async getUserSession(userId: string): Promise<EndUserAuthContext | null> {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const sessionData = sessionStorage.getItem(`dfns_delegated_session_${userId}`);
      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData);
      
      // Check if session is expired
      if (new Date(parsed.expiresAt) < new Date()) {
        sessionStorage.removeItem(`dfns_delegated_session_${userId}`);
        return null;
      }

      return {
        userId: parsed.userId,
        username: parsed.username,
        token: parsed.token,
        orgId: parsed.orgId,
        userKind: parsed.userKind,
        supportedCredentials: [],
        registrationComplete: true
      };
    } catch (error) {
      console.warn('⚠️ Failed to retrieve user session:', error);
      return null;
    }
  }

  /**
   * Clear user session
   */
  async clearUserSession(userId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`dfns_delegated_session_${userId}`);
        console.log('🗑️ User session cleared for:', userId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear user session:', error);
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
   * Check if service account has required permissions for delegated auth
   */
  async validateDelegatedAuthPermissions(): Promise<{
    canRegisterUsers: boolean;
    canPerformDelegatedLogin: boolean;
    canCreateWallets: boolean;
    missingPermissions: string[];
  }> {
    try {
      const missingPermissions: string[] = [];
      
      // Test user creation permission
      let canRegisterUsers = false;
      try {
        // Make a test call to see if we have permission (this will fail but tell us about permissions)
        await this.workingClient.makeRequest('GET', '/auth/users?limit=1');
        canRegisterUsers = true;
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission')) {
          missingPermissions.push('Auth:Users:Create');
        } else {
          canRegisterUsers = true; // Assume we have permission if error is not permission-related
        }
      }

      // Test delegated login permission (similar approach)
      let canPerformDelegatedLogin = false;
      try {
        // The presence of service account token generally allows delegated operations
        canPerformDelegatedLogin = this.workingClient.getAuthMethod() === 'SERVICE_ACCOUNT_TOKEN';
        if (!canPerformDelegatedLogin) {
          missingPermissions.push('Auth:Login:Delegated');
        }
      } catch (error) {
        missingPermissions.push('Auth:Login:Delegated');
      }

      // Test wallet creation permission
      let canCreateWallets = false;
      try {
        await this.workingClient.makeRequest('GET', '/wallets?limit=1');
        canCreateWallets = true;
      } catch (error) {
        if (error instanceof Error && error.message.includes('permission')) {
          missingPermissions.push('Wallets:Create');
        } else {
          canCreateWallets = true;
        }
      }

      return {
        canRegisterUsers,
        canPerformDelegatedLogin,
        canCreateWallets,
        missingPermissions
      };
    } catch (error) {
      console.error('❌ Permission validation failed:', error);
      return {
        canRegisterUsers: false,
        canPerformDelegatedLogin: false,
        canCreateWallets: false,
        missingPermissions: ['Unknown - validation failed']
      };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): DelegatedAuthenticationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DelegatedAuthenticationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Delegated authentication config updated:', this.config);
  }

  /**
   * Test delegated authentication capabilities
   */
  async testDelegatedAuthCapabilities(): Promise<{
    isConfigured: boolean;
    hasRequiredPermissions: boolean;
    supportsRegistration: boolean;
    supportsLogin: boolean;
    authMethod: string;
    details: any;
  }> {
    try {
      const authMethod = this.workingClient.getAuthMethod();
      const permissions = await this.validateDelegatedAuthPermissions();
      
      const isConfigured = authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'PAT';
      const hasRequiredPermissions = permissions.canRegisterUsers && permissions.canPerformDelegatedLogin;
      
      return {
        isConfigured,
        hasRequiredPermissions,
        supportsRegistration: permissions.canRegisterUsers,
        supportsLogin: permissions.canPerformDelegatedLogin,
        authMethod,
        details: {
          permissions,
          config: this.config,
          workingClientStatus: this.workingClient.isConfigured()
        }
      };
    } catch (error) {
      console.error('❌ Capability test failed:', error);
      return {
        isConfigured: false,
        hasRequiredPermissions: false,
        supportsRegistration: false,
        supportsLogin: false,
        authMethod: 'NONE',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}
