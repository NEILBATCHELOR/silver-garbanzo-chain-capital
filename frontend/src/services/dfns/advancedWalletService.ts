/**
 * DFNS Advanced Wallet Service
 * 
 * Implements advanced DFNS Wallet APIs:
 * - POST /wallets/import - Import existing wallets
 * - Advanced wallet operations not in core wallet service
 * 
 * Note: Export wallet functionality is deprecated in DFNS API
 * Focus on current supported operations only
 * 
 * Requires User Action Signing for all operations
 * Works with Service Account/PAT token authentication
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================
// DFNS WALLET IMPORT TYPES
// ==============================

/**
 * Encrypted key share for wallet import
 */
export interface DfnsEncryptedKeyShare {
  signerId: string;
  encryptedKeyShare: string;
}

/**
 * Wallet import request
 */
export interface DfnsWalletImportRequest {
  network: string;
  name?: string;
  protocol: 'CGGMP21'; // Currently only CGGMP21 is supported
  curve: 'secp256k1' | 'ed25519'; // Supported curves
  minSigners: number; // Always 3 for DFNS
  encryptedKeyShares: DfnsEncryptedKeyShare[];
  tags?: string[];
}

/**
 * Imported wallet response
 */
export interface DfnsImportedWallet {
  id: string;
  name?: string;
  network: string;
  address: string;
  status: 'Active' | 'Archived';
  dateCreated: string;
  imported: true; // Always true for imported wallets
  signingKey: {
    id: string;
    curve: string;
    scheme: string;
    publicKey: string;
  };
  custodial?: boolean;
  delegateTo?: string;
  tags?: string[];
}

// ==============================
// SIGNER CLUSTER INFORMATION
// ==============================

/**
 * Signer information for import
 */
export interface DfnsSignerInfo {
  signerId: string;
  publicKey: string; // Encryption public key for this signer
}

/**
 * Signer cluster response
 */
export interface DfnsSignerClusterResponse {
  signers: DfnsSignerInfo[];
  minSigners: number;
  protocol: string;
  curve: string;
}

// ==============================
// ADVANCED WALLET OPERATIONS
// ==============================

/**
 * Wallet delegation request (legacy - prefer creating with delegateTo)
 */
export interface DfnsWalletDelegationRequest {
  delegateTo: string; // End user ID to delegate to
}

/**
 * Advanced wallet update request
 */
export interface DfnsAdvancedWalletUpdateRequest {
  name?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ==============================
// SERVICE OPTIONS
// ==============================

export interface DfnsAdvancedWalletOptions {
  userActionToken?: string;
  syncToDatabase?: boolean;
  skipValidation?: boolean;
  metadata?: Record<string, any>;
}

// ==============================
// DFNS ADVANCED WALLET SERVICE
// ==============================

export class DfnsAdvancedWalletService {
  constructor(private client: WorkingDfnsClient) {}

  // ==============================
  // WALLET IMPORT OPERATIONS
  // ==============================

  /**
   * Get signer cluster information for wallet import
   * This provides the encryption keys needed for secure import
   * 
   * @returns Signer cluster information
   */
  async getSignerClusterInfo(): Promise<DfnsSignerClusterResponse> {
    try {
      console.log('🔍 Getting signer cluster information for wallet import...');

      const response = await this.client.makeRequest<DfnsSignerClusterResponse>(
        'GET',
        '/signers'
      );

      console.log(`✅ Retrieved signer cluster info: ${response.signers.length} signers, protocol: ${response.protocol}`);

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to get signer cluster info: ${error}`,
        'SIGNER_CLUSTER_INFO_FAILED'
      );
    }
  }

  /**
   * Import an existing wallet into DFNS infrastructure
   * 
   * IMPORTANT: This endpoint is not enabled by default and requires:
   * 1. Enterprise customer status
   * 2. Signed contractual addendum
   * 3. Contact with sales representative to enable
   * 
   * The private key is never transmitted in one piece or unencrypted.
   * Process:
   * 1. Get signer cluster info (encryption keys)
   * 2. MPC-shard the private key client-side
   * 3. Encrypt each share with corresponding signer encryption key
   * 4. Call this import endpoint with encrypted shares
   * 
   * @param importRequest - Wallet import request with encrypted key shares
   * @param options - Import options
   * @returns Imported wallet
   */
  async importWallet(
    importRequest: DfnsWalletImportRequest,
    options: DfnsAdvancedWalletOptions = {}
  ): Promise<DfnsImportedWallet> {
    try {
      const { userActionToken, syncToDatabase = false } = options;

      // Validate import request
      this.validateImportRequest(importRequest);

      // User Action Signing is REQUIRED for wallet import
      if (!userActionToken) {
        throw new DfnsError(
          'User Action Signing required for wallet import. Please provide userActionToken.',
          'USER_ACTION_REQUIRED',
          { 
            operation: 'importWallet',
            network: importRequest.network,
            requiredPermission: 'Wallets:Import'
          }
        );
      }

      console.log(`📦 Importing wallet on ${importRequest.network}:`, {
        name: importRequest.name,
        protocol: importRequest.protocol,
        curve: importRequest.curve,
        keySharesCount: importRequest.encryptedKeyShares.length
      });

      // Check if endpoint is enabled
      try {
        const response = await this.client.makeRequest<DfnsImportedWallet>(
          'POST',
          '/wallets/import',
          importRequest,
          userActionToken
        );

        // Sync to database if requested
        if (syncToDatabase && response.id) {
          await this.syncImportedWalletToDatabase(response);
        }

        console.log(`✅ Wallet imported successfully:`, {
          id: response.id,
          network: response.network,
          address: response.address,
          imported: response.imported
        });

        return response;
      } catch (error) {
        if (error instanceof DfnsError && error.message.includes('404')) {
          throw new DfnsError(
            'Wallet import endpoint is not enabled for your account. Please contact DFNS sales to enable this feature.',
            'IMPORT_ENDPOINT_NOT_ENABLED',
            { 
              contactInfo: 'Contact your DFNS sales representative',
              documentation: 'https://docs.dfns.co/d/api-docs/wallets/advanced-wallet-apis/wallet-import'
            }
          );
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to import wallet: ${error}`,
        'WALLET_IMPORT_FAILED',
        { network: importRequest.network, name: importRequest.name }
      );
    }
  }

  /**
   * Check if wallet import is available for your account
   * 
   * @returns Whether import endpoint is enabled
   */
  async isImportEnabled(): Promise<boolean> {
    try {
      // Try to get signer cluster info - this indicates import capability
      await this.getSignerClusterInfo();
      return true;
    } catch (error) {
      console.log('ℹ️ Wallet import not available:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  // ==============================
  // ADVANCED WALLET OPERATIONS
  // ==============================

  /**
   * Delegate wallet to end user (deprecated - prefer creating with delegateTo)
   * 
   * @param walletId - Wallet ID to delegate
   * @param endUserId - End user ID to delegate to
   * @param userActionToken - Required User Action token
   * @param options - Additional options
   * @returns Updated wallet
   */
  async delegateWallet(
    walletId: string,
    endUserId: string,
    userActionToken?: string,
    options: Omit<DfnsAdvancedWalletOptions, 'userActionToken'> = {}
  ): Promise<any> {
    try {
      if (!userActionToken) {
        throw new DfnsError(
          'User Action Signing required for wallet delegation. Please provide userActionToken.',
          'USER_ACTION_REQUIRED',
          { 
            operation: 'delegateWallet',
            walletId,
            requiredPermission: 'Wallets:Delegate'
          }
        );
      }

      console.log(`🤝 Delegating wallet ${walletId} to user ${endUserId}`);

      const request: DfnsWalletDelegationRequest = {
        delegateTo: endUserId
      };

      try {
        const response = await this.client.makeRequest<any>(
          'POST',
          `/wallets/${walletId}/delegate`,
          request,
          userActionToken
        );

        console.log(`✅ Wallet delegated successfully`);
        return response;
      } catch (error) {
        if (error instanceof DfnsError && error.message.includes('deprecated')) {
          throw new DfnsError(
            'Wallet delegation endpoint is deprecated. Please create new wallets with delegateTo parameter instead.',
            'DELEGATE_ENDPOINT_DEPRECATED',
            { 
              recommendation: 'Use wallet creation with delegateTo parameter for new wallets',
              walletId
            }
          );
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to delegate wallet: ${error}`,
        'WALLET_DELEGATION_FAILED',
        { walletId, endUserId }
      );
    }
  }

  /**
   * Advanced wallet update with extended metadata
   * 
   * @param walletId - Wallet ID to update
   * @param updates - Advanced update request
   * @param userActionToken - User Action token (required for some updates)
   * @param options - Additional options
   * @returns Updated wallet
   */
  async updateWalletAdvanced(
    walletId: string,
    updates: DfnsAdvancedWalletUpdateRequest,
    userActionToken?: string,
    options: Omit<DfnsAdvancedWalletOptions, 'userActionToken'> = {}
  ): Promise<any> {
    try {
      console.log(`🔧 Performing advanced update on wallet ${walletId}:`, updates);

      // Some updates may require User Action Signing (like sensitive metadata changes)
      const response = await this.client.makeRequest<any>(
        'PUT',
        `/wallets/${walletId}`,
        updates,
        userActionToken
      );

      if (options.syncToDatabase) {
        await this.syncWalletUpdateToDatabase(walletId, updates);
      }

      console.log(`✅ Advanced wallet update completed`);
      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      throw new DfnsError(
        `Failed to update wallet: ${error}`,
        'WALLET_UPDATE_FAILED',
        { walletId, updates }
      );
    }
  }

  // ==============================
  // WALLET ANALYSIS & UTILITIES
  // ==============================

  /**
   * Analyze wallet for import readiness
   * This is a client-side utility function for preparing import
   * 
   * @param privateKey - Private key to analyze (hex string)
   * @param network - Target network
   * @returns Analysis result
   */
  analyzeWalletForImport(privateKey: string, network: string) {
    try {
      // Remove 0x prefix if present
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

      // Basic validations
      const analysis = {
        keyFormat: 'hex',
        keyLength: cleanKey.length,
        network,
        compatibility: {
          curve: this.determineCurveForNetwork(network),
          protocol: 'CGGMP21' as const,
          minSigners: 3
        },
        recommendations: [] as string[],
        warnings: [] as string[],
        isReady: false
      };

      // Validate key length
      if (cleanKey.length === 64) {
        analysis.recommendations.push('✅ Private key length is valid for secp256k1');
      } else if (cleanKey.length === 64) {
        analysis.recommendations.push('✅ Private key length is valid for ed25519');
      } else {
        analysis.warnings.push('⚠️ Unusual private key length detected');
      }

      // Network-specific checks
      if (['Ethereum', 'EthereumSepolia', 'Polygon', 'Arbitrum'].includes(network)) {
        analysis.recommendations.push('✅ Network supports wallet import');
        analysis.isReady = true;
      } else if (['Bitcoin', 'BitcoinTestnet3'].includes(network)) {
        analysis.recommendations.push('✅ Bitcoin network supports wallet import');
        analysis.isReady = true;
      } else {
        analysis.warnings.push(`⚠️ Import support for ${network} may be limited`);
      }

      // Security recommendations
      analysis.recommendations.push('🔒 Private key will be MPC-sharded client-side for secure import');
      analysis.recommendations.push('🔒 Each key share will be encrypted before transmission');
      analysis.warnings.push('⚠️ DFNS cannot guarantee security of imported keys');
      analysis.warnings.push('⚠️ Import requires Enterprise account and signed addendum');

      return analysis;
    } catch (error) {
      throw new DfnsError(
        `Failed to analyze wallet for import: ${error}`,
        'WALLET_ANALYSIS_FAILED',
        { network }
      );
    }
  }

  /**
   * Get import requirements for current account
   * 
   * @returns Import requirements and status
   */
  async getImportRequirements() {
    try {
      const requirements = {
        accountType: 'Unknown',
        isEnabled: false,
        requirements: [
          '📋 Enterprise customer status',
          '📋 Signed contractual addendum limiting liability',
          '📋 Contact with DFNS sales representative',
          '📋 Import endpoint activation'
        ],
        nextSteps: [
          '1. Contact your DFNS sales representative',
          '2. Sign the required contractual addendum',
          '3. Request import endpoint activation',
          '4. Test with getSignerClusterInfo()'
        ],
        contactInfo: {
          sales: 'Contact your DFNS sales representative',
          documentation: 'https://docs.dfns.co/d/api-docs/wallets/advanced-wallet-apis/wallet-import'
        }
      };

      // Check if import is enabled
      const isEnabled = await this.isImportEnabled();
      requirements.isEnabled = isEnabled;

      if (isEnabled) {
        requirements.accountType = 'Enterprise (Import Enabled)';
        requirements.nextSteps = [
          '✅ Import endpoint is enabled',
          '1. Use getSignerClusterInfo() to get encryption keys',
          '2. MPC-shard your private key client-side',
          '3. Encrypt each share with signer encryption keys',
          '4. Call importWallet() with encrypted shares'
        ];
      } else {
        requirements.accountType = 'Standard (Import Not Enabled)';
      }

      return requirements;
    } catch (error) {
      throw new DfnsError(
        `Failed to get import requirements: ${error}`,
        'IMPORT_REQUIREMENTS_FAILED'
      );
    }
  }

  // ==============================
  // VALIDATION & UTILITIES
  // ==============================

  /**
   * Validate wallet import request
   * 
   * @param request - Import request to validate
   */
  private validateImportRequest(request: DfnsWalletImportRequest): void {
    if (!request || typeof request !== 'object') {
      throw new DfnsError('Invalid import request', 'INVALID_REQUEST');
    }

    // Required fields
    if (!request.network) {
      throw new DfnsError('Network is required', 'MISSING_NETWORK');
    }

    if (!request.protocol || request.protocol !== 'CGGMP21') {
      throw new DfnsError('Protocol must be CGGMP21', 'INVALID_PROTOCOL');
    }

    if (!request.curve || !['secp256k1', 'ed25519'].includes(request.curve)) {
      throw new DfnsError('Curve must be secp256k1 or ed25519', 'INVALID_CURVE');
    }

    if (request.minSigners !== 3) {
      throw new DfnsError('minSigners must be 3 for DFNS', 'INVALID_MIN_SIGNERS');
    }

    if (!request.encryptedKeyShares || !Array.isArray(request.encryptedKeyShares) || request.encryptedKeyShares.length === 0) {
      throw new DfnsError('encryptedKeyShares array is required', 'MISSING_KEY_SHARES');
    }

    // Validate key shares
    for (const share of request.encryptedKeyShares) {
      if (!share.signerId || !share.encryptedKeyShare) {
        throw new DfnsError('Each key share must have signerId and encryptedKeyShare', 'INVALID_KEY_SHARE');
      }
    }
  }

  /**
   * Determine appropriate curve for network
   * 
   * @param network - Network name
   * @returns Appropriate curve
   */
  private determineCurveForNetwork(network: string): string {
    const evmNetworks = [
      'Ethereum', 'EthereumSepolia', 'Polygon', 'Arbitrum', 'Optimism', 'Base'
    ];

    const bitcoinNetworks = [
      'Bitcoin', 'BitcoinTestnet3', 'Litecoin'
    ];

    const ed25519Networks = [
      'Solana', 'SolanaDevnet', 'Aptos', 'Sui', 'Near'
    ];

    if (evmNetworks.includes(network) || bitcoinNetworks.includes(network)) {
      return 'secp256k1';
    } else if (ed25519Networks.includes(network)) {
      return 'ed25519';
    } else {
      return 'secp256k1'; // Default
    }
  }

  /**
   * Sync imported wallet to database
   * 
   * @param wallet - Imported wallet to sync
   */
  private async syncImportedWalletToDatabase(wallet: DfnsImportedWallet): Promise<void> {
    try {
      console.log('📊 Syncing imported wallet to database:', {
        id: wallet.id,
        network: wallet.network,
        imported: wallet.imported
      });
      // Implementation would sync to dfns_wallets table with imported=true flag
    } catch (error) {
      console.warn('⚠️ Failed to sync imported wallet to database:', error);
      // Don't throw - this is not critical for the operation
    }
  }

  /**
   * Sync wallet update to database
   * 
   * @param walletId - Wallet ID
   * @param updates - Updates applied
   */
  private async syncWalletUpdateToDatabase(walletId: string, updates: DfnsAdvancedWalletUpdateRequest): Promise<void> {
    try {
      console.log('📊 Syncing wallet update to database:', {
        walletId,
        updates
      });
      // Implementation would update dfns_wallets table
    } catch (error) {
      console.warn('⚠️ Failed to sync wallet update to database:', error);
      // Don't throw - this is not critical for the operation
    }
  }
}

// ==============================
// GLOBAL SERVICE INSTANCE
// ==============================

let globalAdvancedWalletService: DfnsAdvancedWalletService | null = null;

/**
 * Get or create the global DFNS Advanced Wallet service instance
 */
export function getDfnsAdvancedWalletService(client?: WorkingDfnsClient): DfnsAdvancedWalletService {
  if (!globalAdvancedWalletService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsAdvancedWalletService', 'CLIENT_REQUIRED');
    }
    globalAdvancedWalletService = new DfnsAdvancedWalletService(client);
  }
  return globalAdvancedWalletService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsAdvancedWalletService(): void {
  globalAdvancedWalletService = null;
}
