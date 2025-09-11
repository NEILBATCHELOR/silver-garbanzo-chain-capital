/**
 * Enhanced Working DFNS Client
 * 
 * Supports both PAT and key-based authentication for DFNS API
 * Can use generated key pairs for proper DFNS authentication
 */

import type { 
  DfnsWallet, 
  DfnsWalletAsset, 
  DfnsWalletNft, 
  DfnsWalletHistoryEntry, 
  DfnsCredential,
  DfnsCreateWalletRequest,
  DfnsCreateWalletResponse 
} from '../../types/dfns';

// Type alias for backward compatibility
type DfnsWalletHistory = DfnsWalletHistoryEntry;
import { DfnsError, DfnsAuthenticationError } from '../../types/dfns/errors';
import { DfnsKeyPairGenerator, DfnsAuthUtils } from './key-pair-generator';

interface WorkingDfnsConfig {
  // Service Account (preferred) - supports both key-based and token-based
  serviceAccountToken?: string;
  serviceAccountCredentialId?: string;
  serviceAccountUserId?: string;
  serviceAccountPrivateKey?: string;
  
  // Personal Access Token (fallback)
  patToken?: string;
  
  // Key-based authentication (legacy)
  credentialId?: string;
  privateKeyPem?: string;
  algorithm?: 'ECDSA' | 'EDDSA' | 'RSA';
  
  // Common config
  baseUrl: string;
  appId: string;
  userId: string;
  username: string;
}

export class WorkingDfnsClient {
  private config: WorkingDfnsConfig;

  constructor(config?: Partial<WorkingDfnsConfig>) {
    this.config = {
      baseUrl: import.meta.env.VITE_DFNS_BASE_URL || 'https://api.dfns.io',
      appId: import.meta.env.VITE_DFNS_ORG_ID || '',
      
      // Service Account (preferred) - try token first, then key-based
      serviceAccountToken: import.meta.env.VITE_DFNS_SERVICE_ACCOUNT_TOKEN || '',
      serviceAccountCredentialId: import.meta.env.VITE_DFNS_SERVICE_ACCOUNT_CREDENTIAL_ID || '',
      serviceAccountUserId: import.meta.env.VITE_DFNS_SERVICE_ACCOUNT_USER_ID || '',
      serviceAccountPrivateKey: import.meta.env.VITE_DFNS_SERVICE_ACCOUNT_PRIVATE_KEY || '',
      
      // Personal Access Token (fallback)
      patToken: import.meta.env.VITE_DFNS_PERSONAL_ACCESS_TOKEN || '',
      
      // Legacy key-based auth
      credentialId: import.meta.env.VITE_DFNS_CREDENTIAL_ID || '',
      privateKeyPem: import.meta.env.VITE_DFNS_PRIVATE_KEY || '',
      algorithm: (import.meta.env.VITE_DFNS_ALGORITHM as any) || 'EDDSA',
      
      // User info
      userId: import.meta.env.VITE_DFNS_USER_ID || '',
      username: import.meta.env.VITE_DFNS_USERNAME || '',
      ...config,
    };

    // Validate authentication method
    const hasServiceAccountToken = !!this.config.serviceAccountToken;
    const hasServiceAccountKey = !!(this.config.serviceAccountPrivateKey && this.config.serviceAccountCredentialId);
    const hasPAT = !!this.config.patToken;
    const hasLegacyKey = !!(this.config.privateKeyPem && this.config.credentialId);
    
    if (!hasServiceAccountToken && !hasServiceAccountKey && !hasPAT && !hasLegacyKey) {
      throw new DfnsAuthenticationError('No valid authentication method found. Need either Service Account token, Service Account key, PAT token, or legacy key.');
    }
    
    if (!this.config.baseUrl) {
      throw new DfnsError('DFNS Base URL is required', 'INVALID_CONFIG');
    }
  }

  /**
   * Get authentication method being used
   */
  getAuthMethod(): 'SERVICE_ACCOUNT_TOKEN' | 'SERVICE_ACCOUNT_KEY' | 'PAT' | 'LEGACY_KEY' {
    if (this.config.serviceAccountToken) return 'SERVICE_ACCOUNT_TOKEN';
    if (this.config.serviceAccountPrivateKey && this.config.serviceAccountCredentialId) return 'SERVICE_ACCOUNT_KEY';
    if (this.config.patToken) return 'PAT';
    return 'LEGACY_KEY';
  }

  /**
   * Make authenticated HTTP request to DFNS API
   * Supports both PAT and key-based authentication
   */
  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    userActionToken?: string
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add user action token if provided (for sensitive operations)
    if (userActionToken) {
      headers['X-DFNS-USERACTION'] = userActionToken;
    }

    // Choose authentication method (priority order)
    if (this.config.serviceAccountToken) {
      // Service Account Token Authentication (preferred)
      headers['Authorization'] = `Bearer ${this.config.serviceAccountToken}`;
      console.log(`🌐 DFNS API Request (Service Account Token): ${method} ${url}`, userActionToken ? '(with User Action)' : '');
    } else if (this.config.serviceAccountPrivateKey && this.config.serviceAccountCredentialId && this.config.algorithm) {
      // Service Account Key-based Authentication
      try {
        const authHeaders = await DfnsAuthUtils.createAuthHeaders(
          this.config.serviceAccountPrivateKey,
          this.config.algorithm,
          this.config.serviceAccountCredentialId,
          method,
          endpoint,
          data ? JSON.stringify(data) : undefined
        );
        headers = { ...headers, ...authHeaders };
        console.log(`🌐 DFNS API Request (Service Account Key): ${method} ${url}`, userActionToken ? '(with User Action)' : '');
      } catch (error) {
        throw new DfnsAuthenticationError(`Failed to create service account key-based auth headers: ${error}`);
      }
    } else if (this.config.patToken) {
      // PAT Authentication (fallback)
      headers['Authorization'] = `Bearer ${this.config.patToken}`;
      console.log(`🌐 DFNS API Request (PAT): ${method} ${url}`, userActionToken ? '(with User Action)' : '');
    } else if (this.config.privateKeyPem && this.config.credentialId && this.config.algorithm) {
      // Legacy Key-based Authentication
      try {
        const authHeaders = await DfnsAuthUtils.createAuthHeaders(
          this.config.privateKeyPem,
          this.config.algorithm,
          this.config.credentialId,
          method,
          endpoint,
          data ? JSON.stringify(data) : undefined
        );
        headers = { ...headers, ...authHeaders };
        console.log(`🌐 DFNS API Request (Legacy Key): ${method} ${url}`, userActionToken ? '(with User Action)' : '');
      } catch (error) {
        throw new DfnsAuthenticationError(`Failed to create legacy key-based auth headers: ${error}`);
      }
    } else {
      throw new DfnsAuthenticationError('No valid authentication method configured');
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ DFNS API Error:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorData,
          authMethod: this.getAuthMethod()
        });
        
        // Provide specific error messages for common issues
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        const authMethod = this.getAuthMethod();
        
        if (response.status === 401) {
          switch (authMethod) {
            case 'SERVICE_ACCOUNT_TOKEN':
              errorMessage = `Authentication failed: Invalid or expired Service Account token. Please check VITE_DFNS_SERVICE_ACCOUNT_TOKEN.`;
              break;
            case 'SERVICE_ACCOUNT_KEY':
              errorMessage = `Authentication failed: Invalid Service Account key-based authentication. Please check credentials.`;
              break;
            case 'PAT':
              errorMessage = `Authentication failed: Invalid or expired PAT token. Please check VITE_DFNS_PERSONAL_ACCESS_TOKEN.`;
              break;
            case 'LEGACY_KEY':
              errorMessage = `Authentication failed: Invalid legacy key-based authentication. Please check credentials.`;
              break;
          }
        } else if (response.status === 403) {
          if (userActionToken) {
            errorMessage = `Access denied: User Action Signing failed or insufficient permissions for ${method} ${endpoint}`;
          } else if (endpoint.includes('/wallets') && method === 'POST') {
            errorMessage = `Access denied: Wallet creation requires User Action Signing and Wallets:Create permission`;
          } else {
            errorMessage = `Access denied: Insufficient permissions for ${method} ${endpoint} (using ${authMethod})`;
          }
        }
        
        throw new DfnsAuthenticationError(errorMessage, {
          httpStatus: response.status,
          url,
          body: errorData,
          method,
          endpoint,
          hasUserAction: !!userActionToken,
          authMethod: this.getAuthMethod()
        });
      }

      const result = await response.json();
      console.log(`✅ DFNS API Success (${this.getAuthMethod()}): ${method} ${endpoint}`);
      return result;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      console.error(`💥 DFNS API Network Error:`, error);
      throw new DfnsError(`Network error: ${error}`, 'NETWORK_ERROR', { originalError: error });
    }
  }

  /**
   * Configure key-based authentication
   */
  configureKeyAuth(credentialId: string, privateKeyPem: string, algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA') {
    this.config.credentialId = credentialId;
    this.config.privateKeyPem = privateKeyPem;
    this.config.algorithm = algorithm;
    this.config.patToken = undefined; // Prefer key auth over PAT
    console.log('🔑 Configured key-based authentication for DFNS API');
  }

  /**
   * Configure PAT authentication  
   */
  configurePATAuth(patToken: string) {
    this.config.patToken = patToken;
    console.log('🎫 Configured PAT authentication for DFNS API');
  }

  /**
   * Create a new wallet with User Action Signing support
   * Requires Wallets:Create permission
   */
  async createWallet(
    request: DfnsCreateWalletRequest,
    userActionToken?: string
  ): Promise<DfnsCreateWalletResponse> {
    try {
      if (!userActionToken) {
        console.warn('⚠️ Creating wallet without User Action token - this will likely fail with 403');
      }
      
      return await this.makeRequest<DfnsCreateWalletResponse>(
        'POST',
        '/wallets',
        request,
        userActionToken
      );
    } catch (error) {
      if (error instanceof DfnsAuthenticationError && error.details?.httpStatus === 403) {
        throw new DfnsError(
          `Failed to create wallet: ${userActionToken ? 'User Action Signing failed or insufficient permissions' : 'User Action Signing required for wallet creation'}`,
          'WALLET_CREATE_FAILED',
          { 
            network: request.network, 
            name: request.name, 
            hasUserAction: !!userActionToken,
            requiredPermission: 'Wallets:Create'
          }
        );
      }
      throw new DfnsError(
        `Failed to create wallet: ${error}`,
        'WALLET_CREATE_FAILED',
        { network: request.network, name: request.name }
      );
    }
  }

  /**
   * List user credentials
   */
  async listCredentials(): Promise<DfnsCredential[]> {
    try {
      const response = await this.makeRequest<{ items: DfnsCredential[] }>('GET', '/auth/credentials');
      return response.items || [];
    } catch (error) {
      throw new DfnsError(`Failed to list credentials: ${error}`, 'CREDENTIAL_LIST_FAILED');
    }
  }

  /**
   * List all wallets
   */
  async listWallets(): Promise<DfnsWallet[]> {
    try {
      const response = await this.makeRequest<{ items: DfnsWallet[] }>('GET', '/wallets');
      return response.items || [];
    } catch (error) {
      throw new DfnsError(`Failed to list wallets: ${error}`, 'WALLET_LIST_FAILED');
    }
  }

  /**
   * Get individual wallet details
   */
  async getWallet(walletId: string): Promise<DfnsWallet> {
    try {
      return await this.makeRequest<DfnsWallet>('GET', `/wallets/${walletId}`);
    } catch (error) {
      throw new DfnsError(`Failed to get wallet ${walletId}: ${error}`, 'WALLET_GET_FAILED');
    }
  }

  /**
   * Get wallet balances/assets
   */
  async getWalletAssets(walletId: string): Promise<DfnsWalletAsset[]> {
    try {
      const response = await this.makeRequest<{ items: DfnsWalletAsset[] }>('GET', `/wallets/${walletId}/assets`);
      return response.items || [];
    } catch (error) {
      throw new DfnsError(`Failed to get wallet assets for ${walletId}: ${error}`, 'WALLET_ASSETS_FAILED');
    }
  }

  /**
   * Get wallet NFTs
   */
  async getWalletNfts(walletId: string): Promise<DfnsWalletNft[]> {
    try {
      const response = await this.makeRequest<{ items: DfnsWalletNft[] }>('GET', `/wallets/${walletId}/nfts`);
      return response.items || [];
    } catch (error) {
      throw new DfnsError(`Failed to get wallet NFTs for ${walletId}: ${error}`, 'WALLET_NFTS_FAILED');
    }
  }

  /**
   * Get wallet transaction history
   */
  async getWalletHistory(walletId: string, limit = 50): Promise<DfnsWalletHistory[]> {
    try {
      const response = await this.makeRequest<{ items: DfnsWalletHistory[] }>(
        'GET', 
        `/wallets/${walletId}/history?limit=${limit}`
      );
      return response.items || [];
    } catch (error) {
      throw new DfnsError(`Failed to get wallet history for ${walletId}: ${error}`, 'WALLET_HISTORY_FAILED');
    }
  }

  /**
   * Test connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listCredentials();
      return true;
    } catch (error) {
      console.error('DFNS connection test failed:', error);
      return false;
    }
  }

  /**
   * Get connection status with details
   */
  async getConnectionStatus() {
    try {
      let credentials = [];
      let credentialError = null;
      
      // Try to get credentials (service accounts may not have access)
      try {
        credentials = await this.listCredentials();
      } catch (error) {
        credentialError = error;
        console.log(`⚠️ Credentials access not available (${this.getAuthMethod()}):`, error instanceof Error ? error.message : error);
      }
      
      const wallets = await this.listWallets();
      
      // Determine the appropriate username based on auth method
      let displayUsername = 'Unknown';
      const authMethod = this.getAuthMethod();
      
      if (authMethod === 'SERVICE_ACCOUNT_TOKEN' || authMethod === 'SERVICE_ACCOUNT_KEY') {
        displayUsername = this.config.username || 'Service Account';
      } else {
        displayUsername = this.config.username || 'Personal User';
      }
      
      return {
        connected: true,
        authenticated: true,
        authMethod: this.getAuthMethod(),
        credentialsCount: credentials.length,
        walletsCount: wallets.length,
        hasCredentialAccess: !credentialError,
        user: {
          id: this.config.userId || this.config.serviceAccountUserId,
          username: displayUsername
        }
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        authMethod: this.getAuthMethod(),
        credentialsCount: 0,
        walletsCount: 0,
        hasCredentialAccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        user: null
      };
    }
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.baseUrl && 
      (this.config.serviceAccountToken || 
       (this.config.serviceAccountPrivateKey && this.config.serviceAccountCredentialId) ||
       this.config.patToken || 
       (this.config.privateKeyPem && this.config.credentialId))
    );
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig() {
    const authMethod = this.getAuthMethod();
    return {
      baseUrl: this.config.baseUrl,
      appId: this.config.appId,
      userId: this.config.userId || this.config.serviceAccountUserId,
      username: this.config.username,
      authMethod,
      // Auth method indicators (without showing actual tokens/keys)
      hasServiceAccountToken: !!this.config.serviceAccountToken,
      hasServiceAccountKey: !!this.config.serviceAccountPrivateKey,
      hasPATToken: !!this.config.patToken,
      hasLegacyKey: !!this.config.privateKeyPem,
      // Service account info
      serviceAccountCredentialId: this.config.serviceAccountCredentialId,
      serviceAccountUserId: this.config.serviceAccountUserId,
      // Legacy info
      credentialId: this.config.credentialId,
      algorithm: this.config.algorithm
    };
  }

  /**
   * Create a new DFNS credential using generated key pair
   */
  async createCredential(
    name: string,
    publicKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<DfnsCredential> {
    try {
      const credentialData = {
        kind: 'Key',
        name,
        publicKey: publicKeyPem,
        algorithm
      };

      const credential = await this.makeRequest<DfnsCredential>(
        'POST',
        '/auth/credentials',
        credentialData
      );

      console.log('✅ DFNS credential created successfully:', credential.id);
      return credential;
    } catch (error) {
      throw new DfnsError(`Failed to create DFNS credential: ${error}`, 'CREDENTIAL_CREATE_FAILED');
    }
  }

  /**
   * Generate and register a new credential (convenience method)
   */
  async generateAndRegisterCredential(
    name: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<{ credential: DfnsCredential; privateKey: string }> {
    try {
      console.log(`🔑 Generating ${algorithm} key pair for DFNS credential...`);
      
      let keyPair;
      switch (algorithm) {
        case 'ECDSA':
          keyPair = await DfnsKeyPairGenerator.generateECDSAKeyPair();
          break;
        case 'EDDSA':
          keyPair = await DfnsKeyPairGenerator.generateEDDSAKeyPair();
          break;
        case 'RSA':
          keyPair = await DfnsKeyPairGenerator.generateRSAKeyPair();
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      console.log('🔑 Key pair generated, creating DFNS credential...');
      const credential = await this.createCredential(name, keyPair.publicKey, algorithm);

      return {
        credential,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      throw new DfnsError(`Failed to generate and register credential: ${error}`, 'CREDENTIAL_GENERATION_FAILED');
    }
  }

  // ==============================================
  // TRANSACTION METHODS
  // ==============================================

  /**
   * List wallet transactions with pagination
   */
  async listWalletTransactions(
    walletId: string, 
    options: { 
      limit?: number;
      paginationToken?: string;
    } = {}
  ): Promise<{ 
    items: any[]; 
    nextPageToken?: string 
  }> {
    try {
      const queryParams = new URLSearchParams({
        limit: (options.limit || 1000).toString(),
      });
      
      if (options.paginationToken) {
        queryParams.append('paginationToken', options.paginationToken);
      }

      const response = await this.makeRequest<{ 
        items: any[];
        nextPageToken?: string;
      }>(
        'GET',
        `/wallets/${walletId}/transactions?${queryParams.toString()}`
      );

      return response;
    } catch (error) {
      throw new DfnsError(`Failed to list wallet transactions for ${walletId}: ${error}`, 'WALLET_TRANSACTIONS_FAILED');
    }
  }

  /**
   * Get all wallet transactions (handles pagination automatically)
   */
  async getAllWalletTransactions(walletId: string): Promise<any[]> {
    try {
      const allTransactions: any[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const response = await this.listWalletTransactions(walletId, {
          limit: 1000,
          paginationToken: nextPageToken
        });

        allTransactions.push(...response.items);
        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      return allTransactions;
    } catch (error) {
      throw new DfnsError(`Failed to get all wallet transactions for ${walletId}: ${error}`, 'ALL_WALLET_TRANSACTIONS_FAILED');
    }
  }

  /**
   * Get specific transaction by ID
   */
  async getTransaction(walletId: string, transactionId: string): Promise<any> {
    try {
      return await this.makeRequest<any>(
        'GET',
        `/wallets/${walletId}/transactions/${transactionId}`
      );
    } catch (error) {
      throw new DfnsError(`Failed to get transaction ${transactionId} for wallet ${walletId}: ${error}`, 'GET_TRANSACTION_FAILED');
    }
  }

  /**
   * Broadcast transaction
   */
  async broadcastTransaction(
    walletId: string,
    transactionData: any,
    userActionToken?: string
  ): Promise<any> {
    try {
      return await this.makeRequest<any>(
        'POST',
        `/wallets/${walletId}/transactions`,
        transactionData,
        userActionToken
      );
    } catch (error) {
      throw new DfnsError(`Failed to broadcast transaction for wallet ${walletId}: ${error}`, 'BROADCAST_TRANSACTION_FAILED');
    }
  }
}

// Global working client instance
let globalWorkingClient: WorkingDfnsClient | null = null;

/**
 * Get or create the global working DFNS client instance
 */
export function getWorkingDfnsClient(config?: Partial<WorkingDfnsConfig>): WorkingDfnsClient {
  if (!globalWorkingClient) {
    globalWorkingClient = new WorkingDfnsClient(config);
  }
  return globalWorkingClient;
}

/**
 * Reset the global working client instance
 */
export function resetWorkingDfnsClient(): void {
  globalWorkingClient = null;
}

/**
 * Create a client with key-based authentication
 */
export function createKeyBasedDfnsClient(
  credentialId: string,
  privateKeyPem: string,
  algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA',
  config?: Partial<WorkingDfnsConfig>
): WorkingDfnsClient {
  return new WorkingDfnsClient({
    credentialId,
    privateKeyPem,
    algorithm,
    patToken: undefined, // Ensure PAT is not used
    ...config
  });
}
