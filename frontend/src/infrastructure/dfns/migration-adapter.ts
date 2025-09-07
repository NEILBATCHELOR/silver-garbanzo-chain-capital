/**
 * Migration Adapter - Provides backward compatibility during transition
 * This allows gradual migration from custom implementation to SDK
 */

import { DfnsSDKClient, type DfnsSDKConfig } from './sdk-client';
import { DfnsManager } from './DfnsManager';
import { DFNS_CONFIG } from './config';
import { EnhancedDfnsAuth } from './enhanced-auth';
import type { 
  WalletCreationRequest, 
  DfnsResponse, 
  Wallet,
  KeyCreationRequest,
  SigningKey,
  TransferRequest,
  TransferResponse 
} from '@/types/dfns';

// Re-export DfnsSDKConfig for use by index.ts
export type { DfnsSDKConfig } from './sdk-client';

export interface MigrationConfig {
  useSdk: boolean;
  enableFallback: boolean;
  logTransitions: boolean;
}

export class DfnsMigrationAdapter {
  private sdkClient: DfnsSDKClient;
  private legacyManager: DfnsManager;
  private config: MigrationConfig;
  private enhancedAuth?: EnhancedDfnsAuth;

  constructor(migrationConfig: Partial<MigrationConfig> = {}) {
    this.config = {
      useSdk: true, // Default to SDK
      enableFallback: true,
      logTransitions: false,
      ...migrationConfig
    };

    // Initialize SDK client
    const sdkConfig: DfnsSDKConfig = {
      appId: DFNS_CONFIG.appId,
      baseUrl: DFNS_CONFIG.baseUrl,
      serviceAccount: DFNS_CONFIG.serviceAccountId && DFNS_CONFIG.serviceAccountPrivateKey ? {
        privateKey: DFNS_CONFIG.serviceAccountPrivateKey,
        credentialId: DFNS_CONFIG.serviceAccountId,
      } : undefined,
      webAuthn: {
        rpId: process.env.VITE_DFNS_RP_ID || 'localhost',
        origin: process.env.VITE_DFNS_ORIGIN || window?.location?.origin || 'http://localhost:3000',
      }
    };

    this.sdkClient = new DfnsSDKClient(sdkConfig);
    this.legacyManager = new DfnsManager();

    // Initialize enhanced auth for Phase 2 features
    if (this.config.useSdk) {
      this.enhancedAuth = new EnhancedDfnsAuth();
    }

    this.log('Migration adapter initialized', { useSdk: this.config.useSdk });
  }

  // ===== Enhanced Authentication Methods (Phase 2) =====

  /**
   * Enhanced WebAuthn authentication with proper passkey support
   */
  async authenticateWithWebAuthn(username: string): Promise<void> {
    if (this.config.useSdk) {
      try {
        await this.sdkClient.authenticateWithWebAuthn(username);
        this.log('Enhanced WebAuthn authentication successful via SDK');
      } catch (error) {
        this.log('SDK WebAuthn failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          await this.legacyManager.authenticateDelegated(username, 'default_credential');
        } else {
          throw error;
        }
      }
    } else {
      await this.legacyManager.authenticateDelegated(username, 'default_credential');
    }
  }

  /**
   * Enhanced service account authentication with token management
   */
  async authenticateServiceAccount(serviceAccountId: string, privateKey: string): Promise<void> {
    if (this.config.useSdk) {
      try {
        await this.sdkClient.authenticateServiceAccount(serviceAccountId, privateKey);
        this.log('Enhanced service account authentication successful via SDK');
      } catch (error) {
        this.log('SDK service account auth failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          await this.legacyManager.authenticateServiceAccount(serviceAccountId, privateKey);
        } else {
          throw error;
        }
      }
    } else {
      await this.legacyManager.authenticateServiceAccount(serviceAccountId, privateKey);
    }
  }

  /**
   * Register passkey credential (SDK only)
   */
  async registerPasskey(
    username: string,
    displayName: string,
    credentialName: string,
    registrationCode: string = 'default-code'
  ): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.registerPasskey(username, displayName, credentialName, registrationCode);
        this.log('Passkey registration successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK passkey registration failed', error);
        throw error;
      }
    }
    throw new Error('Passkey registration requires SDK implementation');
  }

  /**
   * Create recovery credential (SDK only)
   */
  async createRecoveryCredential(name: string): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.createRecoveryCredential(name);
        this.log('Recovery credential creation successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK recovery credential creation failed', error);
        throw error;
      }
    }
    throw new Error('Recovery credential creation requires SDK implementation');
  }

  /**
   * Initiate account recovery (SDK only)
   */
  async initiateAccountRecovery(username: string, recoveryCredentialId: string): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.initiateAccountRecovery(username, recoveryCredentialId);
        this.log('Account recovery initiation successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK account recovery initiation failed', error);
        throw error;
      }
    }
    throw new Error('Account recovery requires SDK implementation');
  }

  /**
   * Refresh authentication token (SDK only)
   */
  async refreshToken(): Promise<void> {
    if (this.config.useSdk) {
      try {
        await this.sdkClient.refreshToken();
        this.log('Token refresh successful via SDK');
      } catch (error) {
        this.log('SDK token refresh failed', error);
        throw error;
      }
    } else {
      throw new Error('Token refresh requires SDK implementation');
    }
  }

  // ===== Wallet Operations with Fallback =====

  async createWallet(params: WalletCreationRequest): Promise<DfnsResponse<Wallet>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.createWallet(params);
        this.log('Wallet creation successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK wallet creation failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.createWallet(params);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.createWallet(params);
  }

  async getWallet(walletId: string): Promise<DfnsResponse<Wallet>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.getWallet(walletId);
        this.log('Wallet retrieval successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK wallet retrieval failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.wallets.getWallet(walletId);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.wallets.getWallet(walletId);
  }

  async listWallets(params?: any): Promise<DfnsResponse<Wallet[]>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.listWallets(params);
        this.log('Wallet listing successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK wallet listing failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.wallets.listWallets(params);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.wallets.listWallets(params);
  }

  async transferAsset(walletId: string, transfer: TransferRequest): Promise<DfnsResponse<TransferResponse>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.transferAsset(walletId, transfer);
        this.log('Asset transfer successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK asset transfer failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.wallets.transferAsset(walletId, transfer);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.wallets.transferAsset(walletId, transfer);
  }

  // ===== Key Operations with Fallback =====

  async createKey(request: KeyCreationRequest): Promise<DfnsResponse<SigningKey>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.createKey(request);
        this.log('Key creation successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK key creation failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.createKey(request);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.createKey(request);
  }

  async listKeys(params?: any): Promise<DfnsResponse<SigningKey[]>> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.listKeys(params);
        this.log('Key listing successful via SDK');
        return this.transformSdkResponse(result);
      } catch (error) {
        this.log('SDK key listing failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.keys.listKeys(params);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.keys.listKeys(params);
  }

  // ===== Policy Operations with Fallback =====

  async createPolicy(params: any): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.createPolicy(params);
        this.log('Policy creation successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK policy creation failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.policies.createPolicy(params);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.policies.createPolicy(params);
  }

  async listPolicies(params?: any): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.listPolicies(params);
        this.log('Policy listing successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK policy listing failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          return await this.legacyManager.policies.listPolicies(params);
        } else {
          throw error;
        }
      }
    }
    return await this.legacyManager.policies.listPolicies(params);
  }

  // ===== User Management =====

  async registerDelegatedUser(email: string): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.registerDelegatedUser(email);
        this.log('Delegated user registration successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK delegated registration failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          // Legacy manager doesn't have this - this is a new SDK feature
          throw new Error('Delegated registration not available in legacy implementation');
        } else {
          throw error;
        }
      }
    }
    throw new Error('Delegated registration requires SDK implementation');
  }

  async loginDelegatedUser(username: string): Promise<any> {
    if (this.config.useSdk) {
      try {
        const result = await this.sdkClient.loginDelegatedUser(username);
        this.log('Delegated user login successful via SDK');
        return result;
      } catch (error) {
        this.log('SDK delegated login failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          // Legacy manager doesn't have this - this is a new SDK feature
          throw new Error('Delegated login not available in legacy implementation');
        } else {
          throw error;
        }
      }
    }
    throw new Error('Delegated login requires SDK implementation');
  }

  // ===== Dashboard Metrics =====

  async getDashboardMetrics(): Promise<DfnsResponse<any>> {
    if (this.config.useSdk) {
      try {
        // For now, return mock dashboard metrics since this is likely a custom business logic method
        const mockMetrics = {
          totalWallets: 0,
          totalTransactions: 0,
          totalKeys: 0,
          totalPolicies: 0,
          activeUsers: 0,
          recentActivity: []
        };
        
        this.log('Dashboard metrics retrieved via SDK (mock data)');
        return this.transformSdkResponse(mockMetrics);
      } catch (error) {
        this.log('SDK dashboard metrics failed, falling back to legacy', error);
        if (this.config.enableFallback) {
          // Return mock data for legacy as well
          return {
            kind: 'success',
            data: {
              totalWallets: 0,
              totalTransactions: 0,
              totalKeys: 0,
              totalPolicies: 0,
              activeUsers: 0,
              recentActivity: []
            }
          };
        } else {
          throw error;
        }
      }
    }
    
    // Return mock data for legacy implementation
    return {
      kind: 'success',
      data: {
        totalWallets: 0,
        totalTransactions: 0,
        totalKeys: 0,
        totalPolicies: 0,
        activeUsers: 0,
        recentActivity: []
      }
    };
  }

  // ===== Configuration and Control =====

  /**
   * Switch between implementations
   */
  enableSdk(enable: boolean = true): void {
    this.config.useSdk = enable;
    this.log(`Switched to ${enable ? 'SDK' : 'legacy'} implementation`);
  }

  /**
   * Enable or disable fallback
   */
  enableFallback(enable: boolean = true): void {
    this.config.enableFallback = enable;
    this.log(`Fallback ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check which implementation is being used
   */
  isUsingSdk(): boolean {
    return this.config.useSdk;
  }

  /**
   * Check if both implementations are ready
   */
  isReady(): boolean {
    const sdkReady = this.sdkClient.isReady();
    const legacyReady = this.legacyManager.isReady();
    
    if (this.config.useSdk) {
      return sdkReady || (this.config.enableFallback && legacyReady);
    }
    return legacyReady;
  }

  /**
   * Get the current active client
   */
  getActiveClient(): DfnsSDKClient | DfnsManager {
    return this.config.useSdk ? this.sdkClient : this.legacyManager;
  }

  /**
   * Get migration statistics
   */
  getMigrationStats(): {
    usingSdk: boolean;
    fallbackEnabled: boolean;
    sdkReady: boolean;
    legacyReady: boolean;
    operationsViaSDK: number;
    operationsViaLegacy: number;
  } {
    return {
      usingSdk: this.config.useSdk,
      fallbackEnabled: this.config.enableFallback,
      sdkReady: this.sdkClient.isReady(),
      legacyReady: this.legacyManager.isReady(),
      operationsViaSDK: 0, // Would need to implement counters
      operationsViaLegacy: 0
    };
  }

  // ===== Utility Methods =====

  /**
   * Transform SDK response to match legacy format
   */
  private transformSdkResponse<T>(sdkResponse: any): DfnsResponse<T> {
    // If SDK response already matches expected format, return as-is
    if (sdkResponse && (sdkResponse.kind === 'success' || sdkResponse.kind === 'error')) {
      return sdkResponse;
    }

    // Transform raw SDK response to expected format
    return {
      kind: 'success',
      data: sdkResponse
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: any): void {
    if (this.config.logTransitions) {
      console.log(`[DFNS Migration] ${message}`, data);
    }
  }
}
