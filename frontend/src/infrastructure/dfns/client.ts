/**
 * DFNS Core Client
 * 
 * Main client for DFNS SDK integration with proper error handling and authentication
 */

import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import type { 
  DfnsSdkConfig, 
  DfnsApiConfig,
  DfnsApiCredential,
  DfnsCredentialProvider,
  DfnsUserActionSigner 
} from '../../types/dfns';
import { DfnsError, DfnsErrorFactory, DfnsAuthenticationError } from '../../types/dfns/errors';
import { DFNS_CONFIG, createDfnsSdkConfig, DEFAULT_HEADERS } from './config';

/**
 * DFNS Client wrapper with enhanced error handling and utilities
 */
export class DfnsClient {
  private api: DfnsApiClient | null = null;
  private config: DfnsSdkConfig;
  private isInitialized = false;

  constructor(config?: Partial<DfnsSdkConfig>) {
    this.config = {
      ...createDfnsSdkConfig(),
      ...config,
    } as DfnsSdkConfig;
  }

  /**
   * Initialize the DFNS client with PAT authentication
   */
  async initialize(
    credentialProvider?: DfnsCredentialProvider,
    userActionSigner?: DfnsUserActionSigner
  ): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Check if we have a PAT token
      const patToken = import.meta.env.VITE_DFNS_PERSONAL_ACCESS_TOKEN;
      if (patToken) {
        // Initialize with PAT token authentication
        await this.initializeWithPAT(patToken);
      } else if (credentialProvider) {
        // Update config with providers if provided
        this.config.credentialProvider = credentialProvider;
        this.config.userActionSigner = userActionSigner;
        // Initialize API client with WebAuthn credentials
        await this.initializeApiClient();
      } else {
        throw new DfnsAuthenticationError('No authentication method available - need PAT token or credential provider');
      }

      this.isInitialized = true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Initialize with Personal Access Token
   */
  private async initializeWithPAT(patToken: string): Promise<void> {
    try {
      // For PAT tokens, we don't need a signer, just the auth token
      this.api = new DfnsApiClient({
        appId: this.config.applicationId,
        authToken: patToken,
        baseUrl: this.config.baseUrl,
      });

      console.log('DFNS client initialized with PAT token authentication');
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to initialize with PAT token: ${error}`);
    }
  }

  /**
   * Initialize the API client with WebAuthn credentials
   */
  private async initializeApiClient(): Promise<void> {
    if (!this.config.credentialProvider) {
      throw new DfnsAuthenticationError('Credential provider is required for API operations');
    }

    try {
      const credential = await this.config.credentialProvider.getCredential();
      
      // Create key signer for WebAuthn authentication
      const signer = new AsymmetricKeySigner({
        privateKey: credential.privateKey,
        credId: credential.credentialId,
      });

      this.api = new DfnsApiClient({
        appId: this.config.applicationId,
        authToken: '', // No token for WebAuthn
        baseUrl: this.config.baseUrl,
        signer,
      });

      console.log('DFNS client initialized with WebAuthn credentials');
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to initialize API client: ${error}`);
    }
  }

  /**
   * Get the API client for authenticated operations
   */
  getApiClient(): DfnsApiClient {
    if (!this.api) {
      throw new DfnsAuthenticationError('API client not initialized - credentials required');
    }
    return this.api;
  }

  /**
   * Check if the client is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.api !== null;
  }

  /**
   * Check if API operations are available
   */
  hasApiAccess(): boolean {
    return this.api !== null;
  }

  /**
   * Make an authenticated API request with proper error handling
   * @deprecated Use getApiClient() and call specific DFNS SDK methods instead
   */
  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    throw new DfnsError(
      'makeRequest is deprecated. Use getApiClient() and call specific DFNS SDK methods like client.auth.listCredentials() instead',
      'DEPRECATED_METHOD'
    );
  }

  /**
   * Handle and normalize errors from DFNS operations
   */
  private handleError(error: any): DfnsError {
    // If it's already a DFNS error, return as-is
    if (error instanceof DfnsError) {
      return error;
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return DfnsErrorFactory.fromNetworkError(error);
    }

    // Handle API response errors
    if (error.response) {
      return DfnsErrorFactory.fromApiResponse(error.response);
    }

    // Handle SDK-specific errors
    if (error.name === 'DfnsError') {
      return new DfnsError(
        error.message,
        error.code || 'SDK_ERROR',
        error.details,
        error.statusCode
      );
    }

    // Default error handling
    return new DfnsError(
      error.message || 'An unknown error occurred',
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }

  /**
   * Make API request with user action signature
   */
  async makeRequestWithUserAction<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    userActionToken?: string,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...additionalHeaders,
    };

    // Add user action header if provided
    if (userActionToken) {
      headers['X-DFNS-USERACTION'] = userActionToken;
    }

    return this.makeRequest<T>(method, endpoint, data, headers);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.api = null;
    this.isInitialized = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<DfnsSdkConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Check authentication status
   */
  isAuthenticated(): boolean {
    return this.isReady();
  }

  /**
   * Get current user info from environment
   */
  getCurrentUser() {
    const userId = import.meta.env.VITE_DFNS_USER_ID;
    const username = import.meta.env.VITE_DFNS_USERNAME;
    
    if (userId && username) {
      return {
        id: userId,
        username: username,
        isAuthenticated: this.isAuthenticated()
      };
    }
    
    return null;
  }
}

// Global client instance
let globalDfnsClient: DfnsClient | null = null;

/**
 * Get or create the global DFNS client instance
 */
export function getDfnsClient(config?: Partial<DfnsSdkConfig>): DfnsClient {
  if (!globalDfnsClient) {
    globalDfnsClient = new DfnsClient(config);
  }
  return globalDfnsClient;
}

/**
 * Reset the global client instance (useful for testing)
 */
export function resetDfnsClient(): void {
  if (globalDfnsClient) {
    globalDfnsClient.destroy();
    globalDfnsClient = null;
  }
}