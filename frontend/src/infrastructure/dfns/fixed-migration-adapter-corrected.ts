/**
 * Fixed Migration Adapter - CORRECTED VERSION
 * 
 * This shows how to fix the migration adapter to use the official SDK correctly
 */

import { DfnsApiClient } from '@dfns/sdk';
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';
import { DFNS_CONFIG } from './config';

export interface FixedMigrationConfig {
  useOfficialSdk: boolean;
  enableFallback: boolean;
  logTransitions: boolean;
}

// Export alias for compatibility
export type DfnsSDKConfig = FixedMigrationConfig;
export type MigrationConfig = FixedMigrationConfig;

export class FixedDfnsMigrationAdapter {
  private officialClient: DfnsApiClient;
  private config: FixedMigrationConfig;

  constructor(migrationConfig: Partial<FixedMigrationConfig> = {}) {
    this.config = {
      useOfficialSdk: true, // Always use official SDK
      enableFallback: false, // No fallback needed - official SDK is stable
      logTransitions: false,
      ...migrationConfig
    };

    // Initialize ONLY with official SDK
    this.officialClient = this.createOfficialClient();
    this.log('Fixed migration adapter initialized with official SDK only');
  }

  // ===== Official SDK Client Creation =====

  private createOfficialClient(): DfnsApiClient {
    // Service Account authentication (recommended for server-side)
    if (DFNS_CONFIG.serviceAccountId && DFNS_CONFIG.serviceAccountPrivateKey) {
      return new DfnsApiClient({
        appId: DFNS_CONFIG.appId,
        baseUrl: DFNS_CONFIG.baseUrl,
        signer: new AsymmetricKeySigner({
          privateKey: DFNS_CONFIG.serviceAccountPrivateKey,
          credId: DFNS_CONFIG.serviceAccountId,
        })
      });
    }

    // Delegated authentication (for browser-side)
    return new DfnsApiClient({
      appId: DFNS_CONFIG.appId,
      baseUrl: DFNS_CONFIG.baseUrl,
      // WebAuthn signer will be added during authentication
    });
  }

  // ===== Wallet Operations - All using Official SDK =====

  async createWallet(params: {
    network: 'Ethereum' | 'Polygon' | 'Bitcoin' | 'Solana' | 'EthereumSepolia' | 'PolygonMumbai' | 'BitcoinTestnet3' | 'SolanaDevnet';
    name?: string;
    tags?: string[];
    externalId?: string;
  }): Promise<any> {
    try {
      const result = await this.officialClient.wallets.createWallet({
        body: {
          network: params.network,
          name: params.name,
          tags: params.tags,
          externalId: params.externalId
        }
      });
      
      this.log('Wallet creation successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Wallet creation failed with official SDK', error);
      throw error;
    }
  }

  async getWallet(walletId: string): Promise<any> {
    try {
      const result = await this.officialClient.wallets.getWallet({ walletId });
      this.log('Wallet retrieval successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Wallet retrieval failed with official SDK', error);
      throw error;
    }
  }

  // FIXED: Correct API usage for listWallets
  async listWallets(params?: {
    paginationToken?: string;
    limit?: string;
  }): Promise<any> {
    try {
      const result = await this.officialClient.wallets.listWallets({
        query: {  // FIXED: Wrap parameters in query object
          paginationToken: params?.paginationToken,
          limit: params?.limit
        }
      });
      this.log('Wallet listing successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('Wallet listing failed with official SDK', error);
      throw error;
    }
  }

  async transferAsset(
    walletId: string, 
    transfer: {
      to: string;
      amount: string;
      asset?: string;
      memo?: string;
    }
  ): Promise<any> {
    try {
      const result = await this.officialClient.wallets.transferAsset({
        walletId,
        body: {
          kind: 'Native', // Add required kind field
          to: transfer.to,
          amount: transfer.amount,
          memo: transfer.memo
        }
      });
      
      this.log('Asset transfer successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Asset transfer failed with official SDK', error);
      throw error;
    }
  }

  async getWalletAssets(walletId: string): Promise<any> {
    try {
      const result = await this.officialClient.wallets.getWalletAssets({ walletId });
      this.log('Wallet assets retrieval successful via official SDK');
      return { kind: 'success', data: result.assets };
    } catch (error) {
      this.log('Wallet assets retrieval failed with official SDK', error);
      throw error;
    }
  }

  async getWalletHistory(walletId: string): Promise<any> {
    try {
      const result = await this.officialClient.wallets.getWalletHistory({ walletId });
      this.log('Wallet history retrieval successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('Wallet history retrieval failed with official SDK', error);
      throw error;
    }
  }

  async getWalletNfts(walletId: string): Promise<any> {
    try {
      const result = await this.officialClient.wallets.getWalletNfts({ walletId });
      this.log('Wallet NFTs retrieval successful via official SDK');
      return { kind: 'success', data: result.nfts };
    } catch (error) {
      this.log('Wallet NFTs retrieval failed with official SDK', error);
      throw error;
    }
  }

  // ===== Key Operations - FIXED =====

  // FIXED: Correct API usage for createKey
  async createKey(request: {
    curve: 'secp256k1' | 'ed25519' | 'stark';
    name?: string;
  }): Promise<any> {
    try {
      const result = await this.officialClient.keys.createKey({
        body: {
          scheme: 'ECDSA', // Required field
          curve: request.curve,
          name: request.name
          // REMOVED: network field doesn't exist in CreateKeyBody
        }
      });
      
      this.log('Key creation successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Key creation failed with official SDK', error);
      throw error;
    }
  }

  async listKeys(params?: any): Promise<any> {
    try {
      const result = await this.officialClient.keys.listKeys(params);
      this.log('Key listing successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('Key listing failed with official SDK', error);
      throw error;
    }
  }

  // FIXED: Correct signature generation based on kind
  async generateSignature(
    keyId: string,
    request: {
      kind: 'Hash' | 'Message' | 'Transaction' | 'Eip712' | 'Psbt';
      message?: string;
      hash?: string;
    }
  ): Promise<any> {
    try {
      let body: any;
      
      // Build correct body based on kind
      switch (request.kind) {
        case 'Hash':
          body = {
            kind: 'Hash',
            hash: request.hash || request.message || ''
          };
          break;
        case 'Message':
          body = {
            kind: 'Message',
            message: request.message || ''
          };
          break;
        case 'Transaction':
          body = {
            kind: 'Transaction',
            transaction: request.message || ''
          };
          break;
        default:
          body = {
            kind: request.kind,
            message: request.message || ''
          };
      }

      const result = await this.officialClient.keys.generateSignature({
        keyId,
        body
      });
      
      this.log('Signature generation successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Signature generation failed with official SDK', error);
      throw error;
    }
  }

  // ===== Policy Operations - All using Official SDK =====

  async createPolicy(params: {
    name: string;
    activityKind: 'Permissions:Assign' | 'Permissions:Modify' | 'Policies:Modify' | 'Wallets:Sign' | 'Wallets:IncomingTransaction';
    rule: any;
    action?: any;
  }): Promise<any> {
    try {
      const result = await this.officialClient.policies.createPolicy({
        body: {
          name: params.name,
          activityKind: params.activityKind,
          rule: params.rule,
          action: params.action || { kind: 'NoAction' } // Add required action field
        }
      });
      
      this.log('Policy creation successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('Policy creation failed with official SDK', error);
      throw error;
    }
  }

  async listPolicies(params?: any): Promise<any> {
    try {
      const result = await this.officialClient.policies.listPolicies(params);
      this.log('Policy listing successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('Policy listing failed with official SDK', error);
      throw error;
    }
  }

  async listApprovals(params?: any): Promise<any> {
    try {
      const result = await this.officialClient.policies.listApprovals(params);
      this.log('Approval listing successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('Approval listing failed with official SDK', error);
      throw error;
    }
  }

  // ===== User Management - All using Official SDK =====

  async listUsers(params?: any): Promise<any> {
    try {
      const result = await this.officialClient.auth.listUsers(params);
      this.log('User listing successful via official SDK');
      return { kind: 'success', data: result.items };
    } catch (error) {
      this.log('User listing failed with official SDK', error);
      throw error;
    }
  }

  async createUser(params: {
    email: string;
    kind: string;
  }): Promise<any> {
    try {
      const result = await this.officialClient.auth.createUser({
        body: params as any
      });
      
      this.log('User creation successful via official SDK');
      return { kind: 'success', data: result };
    } catch (error) {
      this.log('User creation failed with official SDK', error);
      throw error;
    }
  }

  // ===== Authentication Methods - FIXED =====

  // REMOVED: WebAuthn configuration fix - rpId doesn't exist
  async authenticateWithWebAuthn(username: string): Promise<void> {
    try {
      // For WebAuthn, we need to use proper configuration
      // This would typically require browser-specific setup
      // For now, throw error indicating WebAuthn needs proper implementation
      throw new Error('WebAuthn authentication requires browser-specific setup');
    } catch (error) {
      this.log('WebAuthn authentication failed', error);
      throw error;
    }
  }

  async authenticateServiceAccount(serviceAccountId: string, privateKey: string): Promise<void> {
    try {
      const signer = new AsymmetricKeySigner({
        privateKey,
        credId: serviceAccountId,
      });

      this.officialClient = new DfnsApiClient({
        appId: DFNS_CONFIG.appId,
        baseUrl: DFNS_CONFIG.baseUrl,
        signer
      });
      
      this.log('Service account authentication successful via official SDK');
    } catch (error) {
      this.log('Service account authentication failed with official SDK', error);
      throw error;
    }
  }

  // ===== Status and Configuration =====

  isReady(): boolean {
    return !!this.officialClient;
  }

  getActiveClient(): DfnsApiClient {
    return this.officialClient;
  }

  getMigrationStats(): {
    usingSdk: boolean;
    fallbackEnabled: boolean;
    sdkReady: boolean;
    operationsViaSDK: number;
    operationsViaLegacy: number;
  } {
    return {
      usingSdk: true, // Always true - we only use official SDK now
      fallbackEnabled: false, // No fallback needed
      sdkReady: this.isReady(),
      operationsViaSDK: 1, // All operations use SDK
      operationsViaLegacy: 0 // No legacy operations
    };
  }

  // ===== Utility Methods =====

  /**
   * Register a passkey credential
   * Note: This is a placeholder implementation. For production use, implement proper
   * WebAuthn credential registration following DFNS documentation.
   */
  async registerPasskey(username: string, displayName?: string, credentialName?: string): Promise<any> {
    this.log('Registering passkey', { username, displayName, credentialName });
    
    // TODO: Implement proper WebAuthn credential registration
    // This requires following the DFNS WebAuthn flow:
    // 1. Call createUserCredentialChallenge to get WebAuthn options
    // 2. Use browser WebAuthn API to create credential
    // 3. Call createUserCredential with the attestation result
    
    throw new Error(
      'Passkey registration not implemented. This requires WebAuthn browser APIs and proper challenge flow. ' +
      'See DFNS documentation for WebAuthn credential registration.'
    );
  }

  /**
   * Create recovery credential
   * Note: This is a placeholder implementation. For production use, implement proper
   * recovery credential creation following DFNS documentation.
   */
  async createRecoveryCredential(request: any): Promise<any> {
    this.log('Creating recovery credential', request);
    
    // TODO: Implement proper recovery credential creation
    // This requires following the DFNS recovery flow:
    // 1. Generate recovery key pair
    // 2. Follow DFNS recovery credential creation process
    // 3. Store recovery information securely
    
    throw new Error(
      'Recovery credential creation not implemented. This requires proper DFNS recovery flow. ' +
      'See DFNS documentation for user recovery credential creation.'
    );
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string | null> {
    this.log('Refreshing token');
    // DFNS uses WebAuthn/Service Account auth, no traditional token refresh
    // Return null to indicate no token refresh needed
    return null;
  }

  private log(message: string, data?: any): void {
    if (this.config.logTransitions) {
      console.log(`[Fixed DFNS Migration] ${message}`, data);
    }
  }
}

export default FixedDfnsMigrationAdapter;
