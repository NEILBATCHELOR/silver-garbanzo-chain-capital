/**
 * DFNS Key Import Service - Advanced Keys API Implementation
 * 
 * Implements DFNS key import functionality for migrating existing private keys
 * into DFNS infrastructure using MPC (Multi-Party Computation) key sharding.
 * 
 * Key Features:
 * - Import external private keys securely via MPC sharding
 * - Client-side key sharding before transmission
 * - Encrypted key share distribution to signer nodes
 * - Support for CGGMP21, FROST, and FROST_BITCOIN protocols
 * - Enterprise security with User Action Signing
 * - Database synchronization for local storage
 * 
 * Security Notes:
 * - Private keys are never transmitted in clear text
 * - MPC sharding happens client-side before API calls
 * - Each key share is encrypted with signer-specific keys
 * - Requires enterprise contractual agreement for liability
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/advanced-keys-apis/import-key
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================================
// DFNS Key Import API Types
// ==============================================

/**
 * Supported import protocols
 */
export type DfnsImportProtocol = 'CGGMP21' | 'FROST' | 'FROST_BITCOIN';

/**
 * Supported import curves
 */
export type DfnsImportCurve = 'secp256k1' | 'ed25519' | 'stark';

/**
 * Encrypted key share for import
 */
export interface EncryptedKeyShare {
  signerId: string; // Signer ID from List Signers API
  encryptedKeyShare: string; // Key share encrypted with signer public key
}

/**
 * Key import request parameters
 */
export interface ImportKeyRequest {
  name: string; // Human-readable name for the key
  protocol: DfnsImportProtocol;
  curve: DfnsImportCurve;
  minSigners: 3; // Always 3 for DFNS (TSS threshold)
  encryptedKeyShares: EncryptedKeyShare[];
}

/**
 * Signer information for key import
 */
export interface SignerInfo {
  id: string; // Base64-encoded signer ID
  encryptionKey: string; // Public key for encrypting key shares
  status: 'Active' | 'Inactive';
}

/**
 * Signing cluster information
 */
export interface SigningCluster {
  id: string; // Cluster ID
  signers: SignerInfo[]; // Available signers in the cluster
  minSigners: number; // Minimum signers required (always 3)
  totalSigners: number; // Total signers in cluster
}

/**
 * Key import response (same as DfnsKey from keyService)
 */
export interface ImportKeyResponse {
  id: string;
  name: string;
  scheme: string; // Derived from protocol
  curve: DfnsImportCurve;
  publicKey: string; // Hex-encoded public key
  status: 'Active';
  custodial: true;
  imported: true; // Always true for imported keys
  dateCreated: string; // ISO 8601 date
}

/**
 * Key import validation result
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  estimatedGasUsage?: string; // For blockchain-specific keys
  networkCompatibility: string[]; // Compatible networks
}

/**
 * Import operation options
 */
export interface ImportOperationOptions {
  syncToDatabase?: boolean;
  validateBefore?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * Import statistics for monitoring
 */
export interface ImportStatistics {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  averageImportTime: number;
  byProtocol: Record<DfnsImportProtocol, number>;
  byCurve: Record<DfnsImportCurve, number>;
  recentImports: Array<{
    keyId: string;
    name: string;
    protocol: DfnsImportProtocol;
    curve: DfnsImportCurve;
    dateImported: string;
    success: boolean;
  }>;
}

/**
 * Protocol/curve compatibility matrix
 */
export const IMPORT_PROTOCOL_COMPATIBILITY: Record<DfnsImportProtocol, DfnsImportCurve[]> = {
  'CGGMP21': ['secp256k1'],
  'FROST': ['ed25519'],
  'FROST_BITCOIN': ['secp256k1']
};

/**
 * Network compatibility for imported keys
 */
export const IMPORT_NETWORK_COMPATIBILITY: Record<DfnsImportCurve, string[]> = {
  'secp256k1': ['Ethereum', 'Bitcoin', 'Polygon', 'Avalanche', 'BNB Smart Chain', 'Cosmos'],
  'ed25519': ['Solana', 'Aptos', 'Sui', 'NEAR', 'Stellar', 'Cardano'],
  'stark': ['StarkNet']
};

// ==============================================
// DFNS Key Import Service Implementation
// ==============================================

export class DfnsKeyImportService {
  private client: WorkingDfnsClient;
  private requestCount = 0;
  private errorCount = 0;
  private importHistory: ImportStatistics['recentImports'] = [];

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ==============================================
  // Core Import Operations
  // ==============================================

  /**
   * Check if key import feature is available for your account
   * 
   * @returns Whether import endpoint is enabled
   */
  async isImportEnabled(): Promise<boolean> {
    try {
      // Test access by attempting to get signers (required for import)
      await this.getSigningCluster();
      return true;
    } catch (error) {
      if (error instanceof DfnsError && error.code === 'FEATURE_NOT_AVAILABLE') {
        return false;
      }
      // Other errors might indicate permission issues but not feature availability
      console.warn('⚠️ Unable to verify import feature availability:', error);
      return false;
    }
  }

  /**
   * Get signing cluster information required for key import
   * 
   * @returns Signing cluster with signer details
   */
  async getSigningCluster(): Promise<SigningCluster> {
    try {
      const response = await this.client.makeRequest<{
        signers: Array<{
          id: string;
          encryptionKey: string;
          status: 'Active' | 'Inactive';
        }>;
      }>('GET', '/signers');

      this.requestCount++;

      const activeSigners = response.signers.filter(s => s.status === 'Active');
      
      if (activeSigners.length < 3) {
        throw new DfnsError(
          `Insufficient active signers: ${activeSigners.length}/3 required`,
          'INSUFFICIENT_SIGNERS'
        );
      }

      const cluster: SigningCluster = {
        id: 'default', // DFNS uses default cluster
        signers: response.signers,
        minSigners: 3,
        totalSigners: response.signers.length
      };

      console.log(`✅ Signing cluster retrieved: ${activeSigners.length}/${response.signers.length} active signers`);
      return cluster;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Get signing cluster failed:', error);
      
      // Provide specific error for missing permissions
      if (error instanceof Error && error.message.includes('403')) {
        throw new DfnsError(
          'Key import feature not available. Contact your sales representative for enterprise access.',
          'FEATURE_NOT_AVAILABLE',
          { error }
        );
      }
      
      throw new DfnsError(
        `Failed to get signing cluster: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNING_CLUSTER_FAILED',
        { error }
      );
    }
  }

  /**
   * Validate key import parameters before attempting import
   * 
   * @param protocol - Import protocol
   * @param curve - Key curve
   * @param privateKey - Private key to validate (not transmitted)
   * @returns Validation result with recommendations
   */
  validateImportParameters(
    protocol: DfnsImportProtocol,
    curve: DfnsImportCurve,
    privateKey?: string
  ): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate protocol/curve compatibility
    const supportedCurves = IMPORT_PROTOCOL_COMPATIBILITY[protocol];
    if (!supportedCurves.includes(curve)) {
      errors.push(`Protocol ${protocol} does not support curve ${curve}. Supported: ${supportedCurves.join(', ')}`);
    }

    // Basic private key validation (if provided)
    if (privateKey) {
      // Remove 0x prefix if present
      const cleanKey = privateKey.replace(/^0x/, '');
      
      // Check basic format
      if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
        errors.push('Private key must be hexadecimal format');
      }
      
      // Check length based on curve
      const expectedLengths: Record<DfnsImportCurve, number> = {
        'secp256k1': 64, // 32 bytes
        'ed25519': 64,   // 32 bytes
        'stark': 64      // 32 bytes
      };
      
      if (cleanKey.length !== expectedLengths[curve]) {
        errors.push(`Private key length should be ${expectedLengths[curve]} characters for ${curve}`);
      }
      
      // Security warnings
      if (privateKey.includes('0000000000000000')) {
        warnings.push('Private key contains many zeros - ensure this is not a test/weak key');
      }
    }

    // Network compatibility
    const compatibleNetworks = IMPORT_NETWORK_COMPATIBILITY[curve] || [];
    
    // Recommendations
    recommendations.push(`This key will be compatible with: ${compatibleNetworks.join(', ')}`);
    recommendations.push('Ensure the original private key is securely deleted after successful import');
    recommendations.push('Test the imported key with small amounts before full migration');
    
    if (protocol === 'CGGMP21') {
      recommendations.push('CGGMP21 protocol provides enhanced security for secp256k1 keys');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      networkCompatibility: compatibleNetworks
    };
  }

  /**
   * Import a private key into DFNS infrastructure (ENTERPRISE ONLY)
   * 
   * Note: This method requires the client-side MPC sharding to be implemented
   * using DFNS SDK utilities. The actual sharding and encryption must happen
   * before calling this method.
   * 
   * @param request - Import request with encrypted key shares
   * @param userActionToken - Required User Action token for security
   * @param options - Import operation options
   * @returns Imported key details
   */
  async importKey(
    request: ImportKeyRequest,
    userActionToken?: string,
    options: ImportOperationOptions = {}
  ): Promise<ImportKeyResponse> {
    try {
      // Validate request parameters
      if (!request.name?.trim()) {
        throw new Error('Key name is required');
      }

      if (!request.encryptedKeyShares || request.encryptedKeyShares.length === 0) {
        throw new Error('Encrypted key shares are required');
      }

      if (request.minSigners !== 3) {
        throw new Error('minSigners must be 3 for DFNS');
      }

      // Validate protocol/curve compatibility
      const validation = this.validateImportParameters(request.protocol, request.curve);
      if (!validation.isValid) {
        throw new Error(`Invalid import parameters: ${validation.errors.join(', ')}`);
      }

      // Validate before import if requested
      if (options.validateBefore) {
        // Verify we have sufficient signers
        const cluster = await this.getSigningCluster();
        const activeSigners = cluster.signers.filter(s => s.status === 'Active');
        
        if (activeSigners.length < request.minSigners) {
          throw new Error(`Insufficient active signers: ${activeSigners.length}/${request.minSigners} required`);
        }

        // Verify all provided signer IDs exist
        const signerIds = new Set(cluster.signers.map(s => s.id));
        const invalidSigners = request.encryptedKeyShares
          .filter(share => !signerIds.has(share.signerId))
          .map(share => share.signerId);
          
        if (invalidSigners.length > 0) {
          throw new Error(`Invalid signer IDs: ${invalidSigners.join(', ')}`);
        }
      }

      const startTime = Date.now();

      const response = await this.client.makeRequest<ImportKeyResponse>(
        'POST',
        '/keys/import',
        request,
        userActionToken
      );

      this.requestCount++;
      const importTime = Date.now() - startTime;

      // Add to import history
      this.importHistory.unshift({
        keyId: response.id,
        name: response.name,
        protocol: request.protocol,
        curve: request.curve,
        dateImported: response.dateCreated,
        success: true
      });

      // Keep only last 50 imports
      this.importHistory = this.importHistory.slice(0, 50);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncImportedKeyToDatabase(response);
      }

      console.log(`✅ Key imported successfully: ${response.id} (${request.protocol}/${request.curve}) in ${importTime}ms`);
      return response;

    } catch (error) {
      this.errorCount++;
      
      // Add failed import to history
      this.importHistory.unshift({
        keyId: 'failed',
        name: request.name,
        protocol: request.protocol,
        curve: request.curve,
        dateImported: new Date().toISOString(),
        success: false
      });

      console.error('❌ Key import failed:', error);
      throw new DfnsError(
        `Failed to import key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_IMPORT_FAILED',
        { request: { ...request, encryptedKeyShares: '[REDACTED]' }, error }
      );
    }
  }

  /**
   * Get key import requirements and status
   * 
   * @returns Import requirements information
   */
  async getImportRequirements(): Promise<{
    isEnabled: boolean;
    requiresEnterprise: boolean;
    minSigners: number;
    supportedProtocols: DfnsImportProtocol[];
    supportedCurves: DfnsImportCurve[];
    signingCluster?: SigningCluster;
  }> {
    try {
      const isEnabled = await this.isImportEnabled();
      let signingCluster: SigningCluster | undefined;

      if (isEnabled) {
        try {
          signingCluster = await this.getSigningCluster();
        } catch (error) {
          console.warn('⚠️ Could not retrieve signing cluster:', error);
        }
      }

      return {
        isEnabled,
        requiresEnterprise: true, // Always requires enterprise agreement
        minSigners: 3,
        supportedProtocols: Object.keys(IMPORT_PROTOCOL_COMPATIBILITY) as DfnsImportProtocol[],
        supportedCurves: ['secp256k1', 'ed25519', 'stark'],
        signingCluster
      };

    } catch (error) {
      console.error('❌ Failed to get import requirements:', error);
      return {
        isEnabled: false,
        requiresEnterprise: true,
        minSigners: 3,
        supportedProtocols: [],
        supportedCurves: []
      };
    }
  }

  // ==============================================
  // Statistics and Monitoring
  // ==============================================

  /**
   * Get import statistics for monitoring and analytics
   * 
   * @returns Import operation statistics
   */
  getImportStatistics(): ImportStatistics {
    const successfulImports = this.importHistory.filter(h => h.success).length;
    const failedImports = this.importHistory.filter(h => h.success === false).length;
    
    // Calculate statistics by protocol and curve
    const byProtocol: Record<DfnsImportProtocol, number> = {
      'CGGMP21': 0,
      'FROST': 0,
      'FROST_BITCOIN': 0
    };
    
    const byCurve: Record<DfnsImportCurve, number> = {
      'secp256k1': 0,
      'ed25519': 0,
      'stark': 0
    };

    this.importHistory.forEach(import_ => {
      if (import_.success) {
        byProtocol[import_.protocol]++;
        byCurve[import_.curve]++;
      }
    });

    return {
      totalImports: this.importHistory.length,
      successfulImports,
      failedImports,
      averageImportTime: 0, // Would need to track timing
      byProtocol,
      byCurve,
      recentImports: this.importHistory.slice(0, 10)
    };
  }

  /**
   * Get success rate for import operations
   * 
   * @returns Success rate percentage
   */
  getImportSuccessRate(): number {
    if (this.requestCount === 0) return 100;
    return ((this.requestCount - this.errorCount) / this.requestCount) * 100;
  }

  /**
   * Check if a protocol/curve combination is supported
   * 
   * @param protocol - Import protocol
   * @param curve - Key curve
   * @returns Whether combination is supported
   */
  isProtocolCurveSupported(protocol: DfnsImportProtocol, curve: DfnsImportCurve): boolean {
    return IMPORT_PROTOCOL_COMPATIBILITY[protocol]?.includes(curve) || false;
  }

  /**
   * Get compatible networks for a curve
   * 
   * @param curve - Key curve
   * @returns List of compatible blockchain networks
   */
  getCompatibleNetworks(curve: DfnsImportCurve): string[] {
    return IMPORT_NETWORK_COMPATIBILITY[curve] || [];
  }

  // ==============================================
  // Private Utility Methods
  // ==============================================

  /**
   * Sync imported key to local database
   * 
   * @param key - Imported key to sync
   */
  private async syncImportedKeyToDatabase(key: ImportKeyResponse): Promise<void> {
    try {
      // This would integrate with your database sync service
      // Implementation depends on your database schema
      console.log(`📊 Syncing imported key to database: ${key.id}`);
      
      // TODO: Implement database sync
      // await this.databaseSyncService.syncImportedKey(key);
      
    } catch (error) {
      console.warn('⚠️ Failed to sync imported key to database:', error);
      // Don't throw - import was successful even if sync failed
    }
  }
}

// ==============================================
// Service Factory Function
// ==============================================

/**
 * Create and configure DFNS Key Import Service instance
 * 
 * @param client - Working DFNS client
 * @returns Configured service instance
 */
export function getDfnsKeyImportService(client: WorkingDfnsClient): DfnsKeyImportService {
  return new DfnsKeyImportService(client);
}

/**
 * Default export for convenience
 */
export default DfnsKeyImportService;
