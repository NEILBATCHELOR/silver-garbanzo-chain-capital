/**
 * Working DFNS Client
 * 
 * Manual HTTP client that bypasses DFNS SDK authentication issues
 * Uses direct fetch() calls with Bearer token authentication
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

interface WorkingDfnsConfig {
  baseUrl: string;
  appId: string;
  patToken: string;
  userId: string;
  username: string;
}

export class WorkingDfnsClient {
  private config: WorkingDfnsConfig;

  constructor(config?: Partial<WorkingDfnsConfig>) {
    this.config = {
      baseUrl: import.meta.env.VITE_DFNS_BASE_URL || 'https://api.dfns.io',
      appId: import.meta.env.VITE_DFNS_APP_ID || '',
      patToken: import.meta.env.VITE_DFNS_PERSONAL_ACCESS_TOKEN || '',
      userId: import.meta.env.VITE_DFNS_USER_ID || '',
      username: import.meta.env.VITE_DFNS_USERNAME || '',
      ...config,
    };

    // Validate required configuration
    if (!this.config.patToken) {
      throw new DfnsAuthenticationError('DFNS Personal Access Token is required');
    }
    if (!this.config.baseUrl) {
      throw new DfnsError('DFNS Base URL is required', 'INVALID_CONFIG');
    }
  }

  /**
   * Make authenticated HTTP request to DFNS API
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    userActionToken?: string
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.config.patToken}`,
    };

    // Add user action token if provided (for sensitive operations)
    if (userActionToken) {
      headers['X-DFNS-USERACTION'] = userActionToken;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`🌐 DFNS API Request: ${method} ${url}`, userActionToken ? '(with User Action)' : '');
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ DFNS API Error:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorData,
          headers: Object.fromEntries(Object.entries(headers))
        });
        
        // Provide specific error messages for common issues
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        if (response.status === 403) {
          if (userActionToken) {
            errorMessage = `Access denied: User Action Signing failed or insufficient permissions for ${method} ${endpoint}`;
          } else if (endpoint.includes('/wallets') && method === 'POST') {
            errorMessage = `Access denied: Wallet creation requires User Action Signing and Wallets:Create permission`;
          } else {
            errorMessage = `Access denied: Insufficient permissions for ${method} ${endpoint}`;
          }
        } else if (response.status === 401) {
          errorMessage = `Authentication failed: Invalid or expired token`;
        }
        
        throw new DfnsAuthenticationError(errorMessage, {
          httpStatus: response.status,
          url,
          body: errorData,
          method,
          endpoint,
          hasUserAction: !!userActionToken
        });
      }

      const result = await response.json();
      console.log(`✅ DFNS API Success: ${method} ${endpoint}`);
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
      const credentials = await this.listCredentials();
      const wallets = await this.listWallets();
      
      return {
        connected: true,
        authenticated: true,
        credentialsCount: credentials.length,
        walletsCount: wallets.length,
        user: {
          id: this.config.userId,
          username: this.config.username
        }
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        credentialsCount: 0,
        walletsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        user: null
      };
    }
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.patToken && this.config.baseUrl);
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      appId: this.config.appId,
      userId: this.config.userId,
      username: this.config.username,
      hasToken: !!this.config.patToken
    };
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
