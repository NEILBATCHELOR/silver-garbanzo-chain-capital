/**
 * Authentication Adapter - Bridges EnhancedDfnsAuth with DfnsAuthenticator interface
 * 
 * This adapter makes EnhancedDfnsAuth compatible with code expecting DfnsAuthenticator
 */

import { EnhancedDfnsAuth } from './enhanced-auth';
import { DfnsAuthenticator } from './auth';
import type { DfnsClientConfig } from '@/types/dfns';
import type { AuthHeaders } from './auth';

/**
 * Adapter that wraps EnhancedDfnsAuth to be compatible with DfnsAuthenticator interface
 */
export class DfnsAuthAdapter extends DfnsAuthenticator {
  private enhancedAuth: EnhancedDfnsAuth;

  constructor(config: DfnsClientConfig, enhancedAuth: EnhancedDfnsAuth) {
    super(config);
    this.enhancedAuth = enhancedAuth;
  }

  /**
   * Override methods to delegate to EnhancedDfnsAuth when available
   */
  async getAuthHeaders(
    method: string,
    endpoint: string,
    body?: any,
    requiresUserAction = false
  ): Promise<AuthHeaders> {
    // Try to use EnhancedDfnsAuth method if available
    if (this.enhancedAuth && typeof this.enhancedAuth.createAuthenticatedHeaders === 'function') {
      const headers = await this.enhancedAuth.createAuthenticatedHeaders(method, endpoint, body, requiresUserAction);
      // Ensure we return proper AuthHeaders type
      return {
        'X-DFNS-APPID': headers['X-DFNS-APPID'] || this.getConfig().appId,
        'X-DFNS-VERSION': headers['X-DFNS-VERSION'] || '1.0.0',
        ...headers
      } as AuthHeaders;
    }
    
    // Fallback to parent implementation
    return await super.getAuthHeaders(method, endpoint, body, requiresUserAction);
  }

  async authenticateServiceAccount(serviceAccountId: string, privateKey: string) {
    // Try to use EnhancedDfnsAuth method if available
    if (this.enhancedAuth && typeof this.enhancedAuth.authenticateServiceAccount === 'function') {
      return await this.enhancedAuth.authenticateServiceAccount(serviceAccountId, privateKey);
    }
    
    // Fallback to parent implementation
    return await super.authenticateServiceAccount(serviceAccountId, privateKey);
  }

  async authenticateDelegated(username: string, userChallenge?: any) {
    // Use EnhancedDfnsAuth WebAuthn authentication instead
    if (this.enhancedAuth && typeof this.enhancedAuth.authenticateWithWebAuthn === 'function') {
      return await this.enhancedAuth.authenticateWithWebAuthn(username);
    }
    
    // Fallback to parent implementation if it exists
    if (typeof super.authenticateDelegated === 'function') {
      return await super.authenticateDelegated(username, userChallenge);
    }
    
    throw new Error('Delegated authentication not implemented');
  }

  /**
   * Get config from either enhanced auth or parent
   */
  getConfig() {
    if (this.enhancedAuth && typeof this.enhancedAuth.getConfig === 'function') {
      return this.enhancedAuth.getConfig();
    }
    
    // Return the config from parent
    return (this as any).config;
  }

  /**
   * Get credentials from either enhanced auth or parent
   */
  getCredentials() {
    if (this.enhancedAuth && typeof this.enhancedAuth.getAuthInfo === 'function') {
      return this.enhancedAuth.getAuthInfo();
    }
    
    // Return credentials from parent
    return (this as any).credentials;
  }
}
