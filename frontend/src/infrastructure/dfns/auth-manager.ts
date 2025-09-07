/**
 * Enhanced DFNS Authentication - Complete User Action Signing Integration
 * 
 * This service integrates the DFNS-compliant User Action Signing with 
 * the existing enhanced authentication system.
 */

import { DfnsUserActionSigning } from './user-action-signing';
import { EnhancedDfnsAuth } from './enhanced-auth';
import { DfnsAuthAdapter } from './auth-adapter';
import { DFNS_SDK_CONFIG } from './config';
import type {
  UserActionContext,
  UserActionResult,
  UserActionChallengeRequest
} from '@/types/dfns/user-actions';

/**
 * Enhanced DFNS Authentication with full User Action Signing compliance
 */
export class DfnsAuthenticationManager {
  private enhancedAuth: EnhancedDfnsAuth;
  private userActionSigning: DfnsUserActionSigning;
  private authAdapter: DfnsAuthAdapter;

  constructor() {
    this.enhancedAuth = new EnhancedDfnsAuth();
    this.userActionSigning = new DfnsUserActionSigning();
    this.authAdapter = new DfnsAuthAdapter(DFNS_SDK_CONFIG, this.enhancedAuth);
  }

  // ===== Delegate Core Authentication Methods =====

  async authenticateServiceAccount(serviceAccountId: string, privateKey: string) {
    return this.enhancedAuth.authenticateServiceAccount(serviceAccountId, privateKey);
  }

  async authenticateWithWebAuthn(username: string) {
    return this.enhancedAuth.authenticateWithWebAuthn(username);
  }

  async registerPasskey(username: string, displayName: string, credentialName: string, registrationCode: string) {
    return this.enhancedAuth.registerPasskey(username, displayName, credentialName, registrationCode);
  }

  // ===== Enhanced User Action Signing =====

  /**
   * Create authenticated headers with DFNS-compliant user action signing
   */
  async createAuthenticatedHeaders(
    method: string,
    path: string,
    body?: any,
    options: {
      requiresUserAction?: boolean;
      credentialId?: string;
      credentialKind?: "Fido2" | "Key" | "PasswordProtectedKey";
      privateKey?: string;
    } = {}
  ): Promise<Record<string, string>> {
    // Get base headers from enhanced auth
    const baseHeaders = await this.enhancedAuth.createAuthenticatedHeaders(
      method, 
      path, 
      body, 
      false // Don't use legacy user action signing
    );

    // Add DFNS-compliant user action signing for mutating requests
    if (options.requiresUserAction && this.isStateChangingOperation(method)) {
      const userActionResult = await this.performCompliantUserActionSigning(
        method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path,
        body,
        options
      );

      if (userActionResult.success && userActionResult.headers) {
        Object.assign(baseHeaders, userActionResult.headers);
      } else {
        console.warn('User action signing failed:', userActionResult.error);
        // In production, you might want to throw an error here
      }
    }

    // Filter out undefined values to ensure Record<string, string> compatibility
    const filteredHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(baseHeaders)) {
      if (value !== undefined) {
        filteredHeaders[key] = value;
      }
    }

    return filteredHeaders;
  }

  /**
   * Perform DFNS-compliant user action signing
   */
  private async performCompliantUserActionSigning(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    payload?: any,
    options: {
      credentialId?: string;
      credentialKind?: "Fido2" | "Key" | "PasswordProtectedKey";
      privateKey?: string;
    } = {}
  ): Promise<UserActionResult> {
    try {
      const authInfo = this.enhancedAuth.getAuthInfo();
      
      // Determine credential information
      const credentialId = options.credentialId || this.getDefaultCredentialId();
      const credentialKind = options.credentialKind || this.getDefaultCredentialKind(authInfo);

      if (!credentialId) {
        throw new Error('No credential ID available for user action signing');
      }

      const context: UserActionContext = {
        method,
        endpoint,
        payload,
        credentialKind,
        credentialId
      };

      // Perform signing based on credential type
      if (credentialKind === 'Fido2' && authInfo.hasWebAuthn) {
        return await this.userActionSigning.signUserActionWithWebAuthn(context);
      } else if (credentialKind === 'Key' && options.privateKey) {
        return await this.userActionSigning.signUserActionWithPrivateKey(context, options.privateKey);
      } else {
        throw new Error(`Cannot perform user action signing with credential kind: ${credentialKind}`);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNING_FAILED',
          message: (error as Error).message,
          details: error
        }
      };
    }
  }

  /**
   * Direct user action signing method for advanced use cases
   */
  async signUserAction(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    payload?: any,
    credentialInfo?: {
      credentialId: string;
      credentialKind: "Fido2" | "Key" | "PasswordProtectedKey";
      privateKey?: string;
    }
  ): Promise<UserActionResult> {
    const context: UserActionContext = {
      method,
      endpoint,
      payload,
      credentialKind: credentialInfo?.credentialKind || 'Fido2',
      credentialId: credentialInfo?.credentialId || this.getDefaultCredentialId()
    };

    if (!context.credentialId) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIAL',
          message: 'No credential ID provided'
        }
      };
    }

    if (context.credentialKind === 'Fido2') {
      return await this.userActionSigning.signUserActionWithWebAuthn(context);
    } else if (context.credentialKind === 'Key' && credentialInfo?.privateKey) {
      return await this.userActionSigning.signUserActionWithPrivateKey(context, credentialInfo.privateKey);
    } else {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIAL',
          message: 'Invalid credential configuration for signing'
        }
      };
    }
  }

  /**
   * Initialize user action challenge directly (for advanced workflows)
   */
  async initUserActionChallenge(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    payload?: any
  ) {
    const request: UserActionChallengeRequest = {
      userActionPayload: JSON.stringify(payload || {}),
      userActionHttpMethod: method,
      userActionHttpPath: endpoint,
      userActionServerKind: 'Api'
    };

    return await this.userActionSigning.initUserActionChallenge(request);
  }

  // ===== Utility Methods =====

  private isStateChangingOperation(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private getDefaultCredentialId(): string {
    // This would typically come from stored authentication state
    // For now, return empty string - should be set during authentication
    return '';
  }

  private getDefaultCredentialKind(authInfo: any): "Fido2" | "Key" | "PasswordProtectedKey" {
    if (authInfo.hasWebAuthn) {
      return 'Fido2';
    } else if (authInfo.hasServiceAccount) {
      return 'Key';
    } else {
      return 'Key'; // Default fallback
    }
  }

  // ===== Delegate Status and Management Methods =====

  isAuthenticated() {
    return this.enhancedAuth.isAuthenticated();
  }

  getAuthInfo() {
    return this.enhancedAuth.getAuthInfo();
  }

  async refreshToken() {
    return this.enhancedAuth.refreshToken();
  }

  logout() {
    this.enhancedAuth.logout();
  }

  getClient() {
    return this.enhancedAuth.getClient();
  }

  // Add method to get config for recovery manager
  getConfig() {
    return {
      baseUrl: this.enhancedAuth.getConfig().baseUrl,
      appId: this.enhancedAuth.getConfig().appId
    };
  }

  shouldRefreshToken() {
    return this.enhancedAuth.shouldRefreshToken();
  }

  async ensureValidToken() {
    return this.enhancedAuth.ensureValidToken();
  }

  // ===== Recovery Methods =====

  /**
   * Create recovery credential using new recovery manager
   */
  async createRecoveryCredential(name: string) {
    const { DfnsUserRecoveryManager } = await import('./user-recovery-manager');
    const recoveryManager = new DfnsUserRecoveryManager({
      baseUrl: this.enhancedAuth.getConfig().baseUrl,
      appId: this.enhancedAuth.getConfig().appId
    }, this.authAdapter);
    
    return await recoveryManager.createRecoveryCredential(name);
  }

  /**
   * Initiate account recovery using new recovery manager
   */
  async initiateAccountRecovery(username: string, recoveryCredentialId: string) {
    const { DfnsUserRecoveryManager } = await import('./user-recovery-manager');
    const recoveryManager = new DfnsUserRecoveryManager({
      baseUrl: this.enhancedAuth.getConfig().baseUrl,
      appId: this.enhancedAuth.getConfig().appId
    }, this.authAdapter);
    
    const orgId = this.enhancedAuth.getConfig().appId; // Using appId as orgId fallback
    return await recoveryManager.initiateRecovery(username, orgId);
  }

  /**
   * Send recovery code email
   */
  async sendRecoveryCode(username: string, orgId: string) {
    const { DfnsUserRecoveryManager } = await import('./user-recovery-manager');
    const recoveryManager = new DfnsUserRecoveryManager({
      baseUrl: this.enhancedAuth.getConfig().baseUrl,
      appId: this.enhancedAuth.getConfig().appId
    }, this.authAdapter);
    
    return await recoveryManager.sendRecoveryCode(username, orgId);
  }

  /**
   * Complete recovery with verification code and new credentials
   */
  async completeRecoveryWithWebAuthn(
    username: string,
    verificationCode: string,
    orgId: string,
    credentialId: string,
    newCredentialName: string
  ) {
    const { DfnsUserRecoveryManager } = await import('./user-recovery-manager');
    const recoveryManager = new DfnsUserRecoveryManager({
      baseUrl: this.enhancedAuth.getConfig().baseUrl,
      appId: this.enhancedAuth.getConfig().appId
    }, this.authAdapter);
    
    return await recoveryManager.completeRecoveryWithWebAuthn(
      username,
      verificationCode,
      orgId,
      credentialId,
      newCredentialName
    );
  }
}

// ===== Export =====
export default DfnsAuthenticationManager;
