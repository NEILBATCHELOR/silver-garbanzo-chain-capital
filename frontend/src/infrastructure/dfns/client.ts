/**
 * DFNS Core Client
 * 
 * Main client for DFNS SDK integration with proper error handling and authentication
 */

// Note: Actual DFNS SDK imports may differ - commenting out until SDK is properly configured
// import { DfnsApi } from '@dfns/sdk';
// import { DfnsBrowserClient } from '@dfns/sdk-browser';
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
  private api: any | null = null;
  private browserClient: any | null = null;
  private config: DfnsSdkConfig;
  private isInitialized = false;

  constructor(config?: Partial<DfnsSdkConfig>) {
    this.config = {
      ...createDfnsSdkConfig(),
      ...config,
    } as DfnsSdkConfig;
  }

  /**
   * Initialize the DFNS client with required providers
   */
  async initialize(
    credentialProvider?: DfnsCredentialProvider,
    userActionSigner?: DfnsUserActionSigner
  ): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Update config with providers if provided
      if (credentialProvider) {
        this.config.credentialProvider = credentialProvider;
      }
      if (userActionSigner) {
        this.config.userActionSigner = userActionSigner;
      }

      // Initialize browser client for WebAuthn operations
      // TODO: Initialize actual DFNS browser client when SDK is properly configured
      this.browserClient = {
        appId: this.config.applicationId,
        baseUrl: this.config.baseUrl,
        rpId: this.config.rpId,
      };

      // Initialize API client if we have credentials
      if (this.config.credentialProvider) {
        await this.initializeApiClient();
      }

      this.isInitialized = true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Initialize the API client with credentials
   */
  private async initializeApiClient(): Promise<void> {
    if (!this.config.credentialProvider) {
      throw new DfnsAuthenticationError('Credential provider is required for API operations');
    }

    try {
      const credential = await this.config.credentialProvider.getCredential();
      
      // TODO: Initialize actual DFNS API client when SDK is properly configured
      this.api = {
        appId: this.config.applicationId,
        baseUrl: this.config.baseUrl,
        signer: {
          credId: credential.credentialId,
          privateKey: credential.privateKey,
        },
        userActionSigner: this.config.userActionSigner,
      };
    } catch (error) {
      throw new DfnsAuthenticationError(`Failed to initialize API client: ${error}`);
    }
  }

  /**
   * Get the browser client for WebAuthn operations
   */
  getBrowserClient(): any {
    if (!this.browserClient) {
      throw new DfnsError('DFNS client not initialized', 'CLIENT_NOT_INITIALIZED');
    }
    return this.browserClient;
  }

  /**
   * Get the API client for authenticated operations
   */
  getApiClient(): any {
    if (!this.api) {
      throw new DfnsAuthenticationError('API client not initialized - credentials required');
    }
    return this.api;
  }

  /**
   * Check if the client is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.browserClient !== null;
  }

  /**
   * Check if API operations are available
   */
  hasApiAccess(): boolean {
    return this.api !== null;
  }

  /**
   * Refresh the API client with new credentials
   */
  async refreshCredentials(): Promise<void> {
    if (!this.config.credentialProvider?.refreshCredential) {
      throw new DfnsAuthenticationError('Credential refresh not supported');
    }

    try {
      const newCredential = await this.config.credentialProvider.refreshCredential();
      
      // Reinitialize API client with new credentials
      // TODO: Initialize actual DFNS API client when SDK is properly configured
      this.api = {
        appId: this.config.applicationId,
        baseUrl: this.config.baseUrl,
        signer: {
          credId: newCredential.credentialId,
          privateKey: newCredential.privateKey,
        },
        userActionSigner: this.config.userActionSigner,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make an authenticated API request with proper error handling
   */
  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    if (!this.api) {
      throw new DfnsAuthenticationError('API client not available');
    }

    try {
      const requestConfig = {
        method,
        url: endpoint,
        data,
        headers: {
          ...DEFAULT_HEADERS,
          ...headers,
        },
      };

      // Use the DFNS API client's internal request method
      const response = await (this.api as any).request(requestConfig);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
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
    this.browserClient = null;
    this.isInitialized = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<DfnsSdkConfig> {
    return Object.freeze({ ...this.config });
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
