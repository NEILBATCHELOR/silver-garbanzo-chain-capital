/**
 * DFNS Authentication Service
 * 
 * Handles core authentication patterns for DFNS API:
 * - Bearer token authentication (Service Account, PAT)
 * - Request header management
 * - Authentication status and validation
 * 
 * Based on current DFNS API: https://docs.dfns.co/d/advanced-topics/authentication/authentication-authorization
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError, DfnsAuthenticationError } from '../../types/dfns/errors';

// Authentication method types based on current DFNS API
export type AuthenticationMethod = 
  | 'SERVICE_ACCOUNT_TOKEN'  // Bearer token for service accounts
  | 'SERVICE_ACCOUNT_KEY'    // Key-based service account auth
  | 'PAT'                    // Personal Access Token
  | 'LEGACY_KEY'             // Legacy key-based auth
  | 'NONE';

export interface AuthenticationStatus {
  isAuthenticated: boolean;
  connected: boolean;
  method: AuthenticationMethod;
  methodDisplayName: string;
  user: any;
  isReady: boolean;
  credentialsCount: number;
  walletsCount: number;
  hasCredentialAccess: boolean;
  error: string;
  tokenExpiry: string;
  lastValidated: string;
  permissions: string[];
  hasValidToken?: boolean;
  hasCredentials?: boolean;
  organization?: {
    id: string;
    name: string;
  };
}

export interface RequestHeaders {
  'Content-Type': string;
  'Accept': string;
  'Authorization'?: string;
  'X-DFNS-USERACTION'?: string;
  'X-DFNS-APPID'?: string;
  [key: string]: string | undefined;
}

export interface TokenValidationResult {
  isValid: boolean;
  method: AuthenticationMethod;
  expiresAt?: Date;
  permissions?: string[];
  user?: {
    id: string;
    username: string;
  };
  error?: string;
}

export class DfnsAuthenticationService {
  constructor(private workingClient: WorkingDfnsClient) {}

  /**
   * Get current authentication status
   * Validates token and returns comprehensive auth information
   */
  async getAuthenticationStatus(): Promise<AuthenticationStatus> {
    try {
      const config = this.workingClient.getConfig();
      const authMethod = this.workingClient.getAuthMethod();
      
      // Test authentication by making a simple API call
      const tokenValidation = await this.validateCurrentToken();
      const connectionStatus = await this.workingClient.getConnectionStatus();
      
      return {
        isAuthenticated: tokenValidation.isValid,
        connected: connectionStatus.connected,
        method: authMethod,
        methodDisplayName: this.getAuthMethodDisplayName(authMethod),
        user: tokenValidation.user || null,
        isReady: tokenValidation.isValid && connectionStatus.connected,
        credentialsCount: connectionStatus.credentialsCount || 0,
        walletsCount: connectionStatus.walletsCount || 0,
        hasCredentialAccess: connectionStatus.hasCredentialAccess || false,
        error: tokenValidation.error || '',
        tokenExpiry: tokenValidation.expiresAt?.toISOString() || '',
        lastValidated: new Date().toISOString(),
        permissions: tokenValidation.permissions || [],
        hasValidToken: tokenValidation.isValid,
        hasCredentials: this.hasValidCredentials(),
        organization: config.appId ? {
          id: config.appId,
          name: config.appId
        } : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get authentication status:', error);
      return {
        isAuthenticated: false,
        connected: false,
        method: 'NONE',
        methodDisplayName: 'Not Authenticated',
        user: null,
        isReady: false,
        credentialsCount: 0,
        walletsCount: 0,
        hasCredentialAccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenExpiry: '',
        lastValidated: new Date().toISOString(),
        permissions: [],
        hasValidToken: false,
        hasCredentials: false
      };
    }
  }

  /**
   * Validate current authentication token
   * Makes a test API call to verify token is still valid
   */
  async validateCurrentToken(): Promise<TokenValidationResult> {
    try {
      const authMethod = this.workingClient.getAuthMethod();
      
      // Try to make a simple authenticated request
      // Service accounts may not have access to all endpoints, so try multiple
      let testResponse;
      let testEndpoint = '';
      
      try {
        // Try wallets first (most service accounts have this)
        testResponse = await this.workingClient.makeRequest('GET', '/wallets?limit=1');
        testEndpoint = 'wallets';
      } catch (walletError) {
        try {
          // Try organizations as fallback
          testResponse = await this.workingClient.makeRequest('GET', '/auth/whoami');
          testEndpoint = 'whoami';
        } catch (orgError) {
          // If both fail, the token is likely invalid
          return {
            isValid: false,
            method: authMethod,
            error: `Token validation failed on both test endpoints: ${walletError} | ${orgError}`
          };
        }
      }

      console.log(`✅ Token validated successfully via ${testEndpoint} endpoint`);

      return {
        isValid: true,
        method: authMethod,
        user: {
          id: this.workingClient.getConfig().userId || 'unknown',
          username: this.workingClient.getConfig().username || 'Unknown User'
        }
        // Note: DFNS doesn't provide token expiry info in API responses
        // Would need to decode JWT if it's a JWT token
      };
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      
      return {
        isValid: false,
        method: this.workingClient.getAuthMethod(),
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Create request headers for DFNS API calls
   * Based on: https://docs.dfns.co/d/advanced-topics/authentication/request-headers
   */
  createRequestHeaders(userActionToken?: string): RequestHeaders {
    const config = this.workingClient.getConfig();
    
    const headers: RequestHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add authentication header based on method
    const authMethod = this.workingClient.getAuthMethod();
    
    if (authMethod === 'SERVICE_ACCOUNT_TOKEN' && config.hasServiceAccountToken) {
      // Service Account Token uses Bearer authentication
      headers['Authorization'] = `Bearer ${this.getServiceAccountToken()}`;
    } else if (authMethod === 'PAT' && config.hasPATToken) {
      // Personal Access Token uses Bearer authentication
      headers['Authorization'] = `Bearer ${this.getPATToken()}`;
    }
    // Note: Key-based auth headers are handled by WorkingDfnsClient.makeRequest

    // Add User Action Signing header if provided
    if (userActionToken) {
      headers['X-DFNS-USERACTION'] = userActionToken;
    }

    // Add application ID if available
    if (config.appId) {
      headers['X-DFNS-APPID'] = config.appId;
    }

    return headers;
  }

  /**
   * Check if current authentication method uses service account
   */
  isServiceAccount(method?: AuthenticationMethod): boolean {
    const authMethod = method || this.workingClient.getAuthMethod();
    return authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY';
  }

  /**
   * Check if current authentication method supports User Action Signing
   */
  supportsUserActionSigning(): boolean {
    const authMethod = this.workingClient.getAuthMethod() as AuthenticationMethod;
    // All methods support User Action Signing, but key-based methods need credentials
    return authMethod !== 'NONE';
  }

  /**
   * Get authentication method display name
   */
  getAuthMethodDisplayName(method?: AuthenticationMethod): string {
    const authMethod = method || this.workingClient.getAuthMethod();
    
    switch (authMethod) {
      case 'SERVICE_ACCOUNT_TOKEN':
        return 'Service Account (Token)';
      case 'SERVICE_ACCOUNT_KEY':
        return 'Service Account (Key)';
      case 'PAT':
        return 'Personal Access Token';
      case 'LEGACY_KEY':
        return 'Legacy Key Authentication';
      case 'NONE':
        return 'Not Authenticated';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if we have valid credentials for the current auth method
   */
  private hasValidCredentials(): boolean {
    const config = this.workingClient.getConfig();
    const authMethod = this.workingClient.getAuthMethod();
    
    switch (authMethod) {
      case 'SERVICE_ACCOUNT_TOKEN':
        return config.hasServiceAccountToken;
      case 'SERVICE_ACCOUNT_KEY':
        return config.hasServiceAccountKey;
      case 'PAT':
        return config.hasPATToken;
      case 'LEGACY_KEY':
        return config.hasLegacyKey;
      default:
        return false;
    }
  }

  /**
   * Get service account token (safely)
   * Note: This is for internal use only - doesn't expose the actual token
   */
  private getServiceAccountToken(): string {
    // This would typically come from environment variables
    // The actual implementation is in WorkingDfnsClient
    const token = process.env.VITE_DFNS_SERVICE_ACCOUNT_TOKEN;
    if (!token) {
      throw new DfnsAuthenticationError('Service Account token not available');
    }
    return token;
  }

  /**
   * Get PAT token (safely)
   * Note: This is for internal use only - doesn't expose the actual token
   */
  private getPATToken(): string {
    // This would typically come from environment variables
    // The actual implementation is in WorkingDfnsClient
    const token = process.env.VITE_DFNS_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      throw new DfnsAuthenticationError('Personal Access Token not available');
    }
    return token;
  }

  /**
   * Refresh authentication if supported
   * Note: Service Account tokens and PATs don't need refresh in DFNS
   */
  async refreshAuthentication(): Promise<boolean> {
    try {
      const authMethod = this.workingClient.getAuthMethod();
      
      switch (authMethod) {
        case 'SERVICE_ACCOUNT_TOKEN':
        case 'SERVICE_ACCOUNT_KEY':
        case 'PAT':
        case 'LEGACY_KEY':
          // These don't need refresh - just validate current token
          const validation = await this.validateCurrentToken();
          return validation.isValid;
        
        default:
          console.log('💡 Authentication refresh not needed for method:', authMethod);
          return true;
      }
    } catch (error) {
      console.error('❌ Authentication refresh failed:', error);
      return false;
    }
  }

  /**
   * Get authentication configuration (safe - no secrets exposed)
   */
  getAuthenticationConfig() {
    const config = this.workingClient.getConfig();
    const authMethod = this.workingClient.getAuthMethod();
    
    return {
      method: authMethod,
      methodDisplayName: this.getAuthMethodDisplayName(authMethod),
      baseUrl: config.baseUrl,
      appId: config.appId,
      userId: config.userId,
      username: config.username,
      isServiceAccount: this.isServiceAccount(authMethod),
      supportsUserActionSigning: this.supportsUserActionSigning(),
      hasValidCredentials: this.hasValidCredentials(),
      // Show which auth methods are configured (but not the actual values)
      configuredMethods: {
        serviceAccountToken: config.hasServiceAccountToken,
        serviceAccountKey: config.hasServiceAccountKey,
        personalAccessToken: config.hasPATToken,
        legacyKey: config.hasLegacyKey
      }
    };
  }

  /**
   * Check if a specific permission is available
   * Note: DFNS doesn't provide permission checking in API responses,
   * so this is a placeholder for future enhancement
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      // For now, we can't check specific permissions via DFNS API
      // This would need to be implemented when DFNS provides a permissions endpoint
      console.log('💡 Permission checking not yet available via DFNS API:', permission);
      return true; // Assume permission is available for now
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }

  /**
   * Test connection with detailed error reporting
   */
  async testConnection(): Promise<{
    success: boolean;
    method: AuthenticationMethod;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    const startTime = Date.now();
    const authMethod = this.workingClient.getAuthMethod();
    
    try {
      const connectionStatus = await this.workingClient.getConnectionStatus();
      const responseTime = Date.now() - startTime;
      
      return {
        success: connectionStatus.connected && connectionStatus.authenticated,
        method: authMethod,
        responseTime,
        details: {
          connected: connectionStatus.connected,
          authenticated: connectionStatus.authenticated,
          walletsCount: connectionStatus.walletsCount,
          credentialsCount: connectionStatus.credentialsCount,
          hasCredentialAccess: connectionStatus.hasCredentialAccess
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ Connection test failed:', error);
      
      return {
        success: false,
        method: authMethod,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }
}
