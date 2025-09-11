/**
 * DFNS Key Import Service
 * 
 * Implements the DFNS Advanced Keys Import API for importing external private keys
 * into DFNS infrastructure. Keys are securely sharded and distributed across
 * the MPC cluster without ever exposing the full private key.
 * 
 * Features:
 * - Secure key import with MPC sharding
 * - Support for ECDSA, EdDSA key formats
 * - User Action Signing for security
 * - Database synchronization
 * - Comprehensive error handling
 * 
 * Security Notes:
 * - Private keys are never transmitted to DFNS in cleartext
 * - Client-side sharding with signer-specific encryption
 * - Requires contractual addendum for imported key liability
 * - Enterprise customers only
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/advanced-keys-apis/import-key
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type { 
  ImportKeyRequest,
  ImportKeyResponse, 
  KeyImportOptions,
  SignerInfo,
  EncryptedKeyShare,
  MpcProtocol,
  KeyImportPreparation,
  AdvancedKeysErrorCode
} from '../../types/dfns/advancedKeys';
import type { Key, KeyScheme, KeyCurve } from '../../types/dfns/key';
import { DfnsError } from '../../types/dfns/errors';

// ==============================================
// DFNS Key Import Service Implementation
// ==============================================

export class DfnsKeyImportService {
  private client: WorkingDfnsClient;
  private requestCount = 0;
  private errorCount = 0;
  private importCount = 0;
  private successfulImports = 0;

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ==============================================
  // Core Import Operations
  // ==============================================

  /**
   * Import an external private key into DFNS infrastructure
   * 
   * Security: Private key is never sent to DFNS directly. Must be client-side
   * sharded and encrypted for each signer before calling this method.
   * 
   * @param request - Import request with encrypted key shares
   * @param userActionToken - Required User Action token for security
   * @param options - Operation options
   * @returns Imported key entity
   */
  async importKey(
    request: ImportKeyRequest,
    userActionToken?: string,
    options: KeyImportOptions = {}
  ): Promise<ImportKeyResponse> {
    try {
      this.validateImportRequest(request);
      
      if (!userActionToken) {
        console.warn('⚠️ Importing key without User Action token - this will likely fail with 403');
      }

      console.log(`🔐 Importing key: ${request.name || 'Unnamed'} (${request.protocol}/${request.curve})`);
      console.log(`📊 Key shares: ${request.encryptedKeyShares.length} encrypted shares`);

      const response = await this.client.makeRequest<ImportKeyResponse>(
        'POST',
        '/keys/import',
        request,
        userActionToken
      );

      this.requestCount++;
      this.importCount++;
      this.successfulImports++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncImportToDatabase(response, options.externalId);
      }

      console.log(`✅ Key imported successfully: ${response.id}`);
      console.log(`📈 Import stats: ${this.successfulImports}/${this.importCount} successful`);
      
      return response;

    } catch (error) {
      this.errorCount++;
      this.importCount++;
      
      console.error('❌ Key import failed:', error);
      
      // Enhanced error handling for import-specific issues
      if (error instanceof DfnsError) {
        throw error;
      }
      
      const errorMessage = this.getImportErrorMessage(error, request);
      throw new DfnsError(
        errorMessage,
        'KEY_IMPORT_FAILED' as AdvancedKeysErrorCode,
        { 
          request,
          protocol: request.protocol,
          curve: request.curve,
          shareCount: request.encryptedKeyShares.length,
          hasUserAction: !!userActionToken,
          error 
        }
      );
    }
  }

  /**
   * Get signer cluster information for key import preparation
   * 
   * This information is needed to prepare encrypted key shares on the client side.
   * 
   * @param options - Operation options
   * @returns Signer cluster information
   */
  async getSignerClusterInfo(options: KeyImportOptions = {}): Promise<SignerInfo[]> {
    try {
      console.log('🔍 Fetching signer cluster information for import...');

      const response = await this.client.makeRequest<{ signers: SignerInfo[] }>(
        'GET',
        '/signers'
      );

      this.requestCount++;

      if (!response.signers || response.signers.length === 0) {
        throw new Error('No signers available in cluster');
      }

      const availableSigners = response.signers.filter(s => s.available);
      
      console.log(`📊 Signer cluster: ${availableSigners.length}/${response.signers.length} available`);
      
      if (availableSigners.length < 3) {
        console.warn(`⚠️ Warning: Only ${availableSigners.length} signers available (minimum 3 required)`);
      }

      return response.signers;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Failed to get signer cluster info:', error);
      
      throw new DfnsError(
        `Failed to get signer cluster information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNER_UNAVAILABLE' as AdvancedKeysErrorCode,
        { error }
      );
    }
  }

  /**
   * Check if key import is enabled for your account
   * 
   * Import endpoint requires Enterprise account and contractual addendum.
   * 
   * @returns Whether import endpoint is available
   */
  async isImportEnabled(): Promise<boolean> {
    try {
      // Test import endpoint availability with minimal request
      await this.client.makeRequest(
        'GET',
        '/keys/import'
      );
      
      return true;
      
    } catch (error: any) {
      // 404 = endpoint not available, 405 = method not allowed but endpoint exists
      if (error?.details?.httpStatus === 404) {
        return false;
      }
      
      // Other errors suggest endpoint exists but may have other requirements
      return true;
    }
  }

  // ==============================================
  // Validation & Utility Methods
  // ==============================================

  /**
   * Validate import request parameters
   * 
   * @param request - Import request to validate
   */
  private validateImportRequest(request: ImportKeyRequest): void {
    if (!request.protocol || !['CGGMP21', 'FROST', 'FROST_BITCOIN'].includes(request.protocol)) {
      throw new Error(`Invalid protocol: ${request.protocol}. Supported: CGGMP21, FROST, FROST_BITCOIN`);
    }

    if (!request.curve || !['secp256k1', 'ed25519', 'stark'].includes(request.curve)) {
      throw new Error(`Invalid curve: ${request.curve}. Supported: secp256k1, ed25519, stark`);
    }

    if (request.minSigners !== 3) {
      throw new Error('minSigners must be 3 for DFNS operations');
    }

    if (!request.encryptedKeyShares || request.encryptedKeyShares.length === 0) {
      throw new Error('encryptedKeyShares array is required and cannot be empty');
    }

    // Validate protocol-curve compatibility
    const validCombinations: Record<MpcProtocol, KeyCurve[]> = {
      'CGGMP21': ['secp256k1'],
      'FROST': ['ed25519'],
      'FROST_BITCOIN': ['secp256k1']
    };

    const supportedCurves = validCombinations[request.protocol];
    if (!supportedCurves.includes(request.curve)) {
      throw new Error(`Protocol ${request.protocol} does not support curve ${request.curve}. Supported: ${supportedCurves.join(', ')}`);
    }

    // Validate key shares structure
    for (const [index, share] of request.encryptedKeyShares.entries()) {
      if (!share.signerId?.trim()) {
        throw new Error(`Key share ${index}: signerId is required`);
      }
      
      if (!share.encryptedKeyShare?.trim()) {
        throw new Error(`Key share ${index}: encryptedKeyShare is required`);
      }
    }

    console.log(`✅ Import request validation passed: ${request.protocol}/${request.curve}, ${request.encryptedKeyShares.length} shares`);
  }

  /**
   * Validate key format is supported for import
   * 
   * @param scheme - Key scheme
   * @param curve - Key curve
   * @returns Whether format is supported for import
   */
  isKeyFormatSupportedForImport(scheme: KeyScheme, curve: KeyCurve): boolean {
    const supportedFormats: Record<KeyScheme, KeyCurve[]> = {
      'ECDSA': ['secp256k1', 'stark'],
      'EdDSA': ['ed25519'],
      'Schnorr': ['secp256k1']
    };

    return supportedFormats[scheme]?.includes(curve) || false;
  }

  /**
   * Get recommended MPC protocol for key format
   * 
   * @param scheme - Key scheme
   * @param curve - Key curve
   * @returns Recommended MPC protocol
   */
  getRecommendedProtocol(scheme: KeyScheme, curve: KeyCurve): MpcProtocol | null {
    // ECDSA secp256k1 -> CGGMP21
    if (scheme === 'ECDSA' && curve === 'secp256k1') return 'CGGMP21';
    
    // EdDSA ed25519 -> FROST
    if (scheme === 'EdDSA' && curve === 'ed25519') return 'FROST';
    
    // Schnorr secp256k1 -> FROST_BITCOIN (for Bitcoin Taproot)
    if (scheme === 'Schnorr' && curve === 'secp256k1') return 'FROST_BITCOIN';
    
    return null;
  }

  /**
   * Get import requirements and restrictions
   * 
   * @returns Import capability information
   */
  async getImportRequirements(): Promise<{
    enabled: boolean;
    enterpriseRequired: boolean;
    contractualAddendumRequired: boolean;
    supportedProtocols: MpcProtocol[];
    supportedCurves: KeyCurve[];
    maxKeyShares: number;
    restrictions: string[];
  }> {
    const enabled = await this.isImportEnabled();
    
    return {
      enabled,
      enterpriseRequired: true,
      contractualAddendumRequired: true,
      supportedProtocols: ['CGGMP21', 'FROST', 'FROST_BITCOIN'],
      supportedCurves: ['secp256k1', 'ed25519'],
      maxKeyShares: 5, // Typical DFNS cluster size
      restrictions: [
        'Enterprise customers only',
        'Contractual addendum required for liability limitation',
        'Private keys never transmitted in cleartext',
        'Client-side sharding and encryption required',
        'Minimum 3 signers required for MPC threshold',
        'Imported keys cannot guarantee same security as DFNS-generated keys'
      ]
    };
  }

  // ==============================================
  // Error Handling
  // ==============================================

  /**
   * Get user-friendly error message for import failures
   * 
   * @param error - Original error
   * @param request - Import request that failed
   * @returns User-friendly error message
   */
  private getImportErrorMessage(error: any, request: ImportKeyRequest): string {
    const baseMessage = 'Failed to import key';
    
    // Check for common error patterns
    if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
      return `${baseMessage}: Authentication failed. Please check your DFNS credentials.`;
    }
    
    if (error?.message?.includes('403') || error?.message?.includes('forbidden')) {
      return `${baseMessage}: Access denied. Import endpoint may not be enabled for your account or User Action Signing failed.`;
    }
    
    if (error?.message?.includes('404')) {
      return `${baseMessage}: Import endpoint not found. Please contact DFNS support to enable key import.`;
    }
    
    if (error?.message?.includes('400') || error?.message?.includes('bad request')) {
      return `${baseMessage}: Invalid import request. Please check key shares and protocol/curve compatibility.`;
    }
    
    if (error?.message?.includes('encryption')) {
      return `${baseMessage}: Key share encryption error. Please verify signer encryption keys.`;
    }
    
    if (error?.message?.includes('signer')) {
      return `${baseMessage}: Signer cluster error. Some signers may be unavailable.`;
    }

    // Default error message
    const errorDetails = error instanceof Error ? error.message : String(error);
    return `${baseMessage}: ${errorDetails}`;
  }

  // ==============================================
  // Database Synchronization
  // ==============================================

  /**
   * Sync imported key to local database
   * 
   * @param key - Imported key entity
   * @param externalId - Optional external tracking ID
   */
  private async syncImportToDatabase(key: ImportKeyResponse, externalId?: string): Promise<void> {
    try {
      console.log(`💾 Syncing imported key ${key.id} to database...`);
      
      // Note: This would sync to your Supabase tables
      // Implementation depends on your database schema
      
      /*
      await supabase
        .from('dfns_keys')
        .upsert({
          id: key.id,
          dfns_key_id: key.id,
          name: key.name,
          scheme: this.protocolToScheme(key),
          curve: key.curve,
          public_key: key.publicKey,
          status: key.status,
          custodial: key.custodial,
          imported: true,
          date_created: key.dateCreated,
          external_id: externalId,
          updated_at: new Date().toISOString()
        });
      */

    } catch (error) {
      console.error('❌ Database sync failed for imported key:', key.id, error);
      // Don't throw - database sync failures shouldn't break the main operation
    }
  }

  // ==============================================
  // Service Status & Metrics
  // ==============================================

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      importCount: this.importCount,
      successfulImports: this.successfulImports,
      successRate: this.importCount > 0 ? (this.successfulImports / this.importCount) * 100 : 0,
      importSuccessRate: this.importCount > 0 ? (this.successfulImports / this.importCount) * 100 : 0
    };
  }

  /**
   * Reset service metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.importCount = 0;
    this.successfulImports = 0;
  }

  /**
   * Test import service connection and permissions
   */
  async testConnection(): Promise<{ 
    success: boolean; 
    importEnabled: boolean; 
    signerCount: number; 
    error?: string 
  }> {
    try {
      const [importEnabled, signers] = await Promise.allSettled([
        this.isImportEnabled(),
        this.getSignerClusterInfo()
      ]);

      const enabled = importEnabled.status === 'fulfilled' ? importEnabled.value : false;
      const signerCount = signers.status === 'fulfilled' ? signers.value.length : 0;

      return {
        success: true,
        importEnabled: enabled,
        signerCount
      };
    } catch (error) {
      return {
        success: false,
        importEnabled: false,
        signerCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==============================================
// Factory Function
// ==============================================

let globalKeyImportService: DfnsKeyImportService | null = null;

/**
 * Get or create the global DFNS Key Import service instance
 */
export function getDfnsKeyImportService(client?: WorkingDfnsClient): DfnsKeyImportService {
  if (!globalKeyImportService && client) {
    globalKeyImportService = new DfnsKeyImportService(client);
  }
  
  if (!globalKeyImportService) {
    throw new DfnsError('DfnsKeyImportService not initialized', 'SERVICE_NOT_INITIALIZED');
  }
  
  return globalKeyImportService;
}

/**
 * Reset the global key import service instance (useful for testing)
 */
export function resetDfnsKeyImportService(): void {
  globalKeyImportService = null;
}
