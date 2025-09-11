/**
 * DFNS Key Service - Current DFNS Keys API Implementation
 * 
 * Implements the modern DFNS Keys API endpoints that replace deprecated wallet operations.
 * Supports key management for multi-chain signatures across 30+ blockchain networks.
 * 
 * Key Features:
 * - Create/Update/Delete keys with scheme/curve configuration
 * - Delegate keys to end users for non-custodial operations  
 * - List and retrieve keys with pagination and filtering
 * - Support for ECDSA, EdDSA, and Schnorr key formats
 * - User Action Signing for all mutating operations
 * - Database synchronization for local storage
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================================
// DFNS Keys API Types (Current API)
// ==============================================

/**
 * Supported key schemes in DFNS
 */
export type DfnsKeyScheme = 'ECDSA' | 'EdDSA' | 'Schnorr';

/**
 * Supported key curves by scheme
 */
export type DfnsKeyCurve = 
  | 'secp256k1'  // ECDSA, Schnorr
  | 'stark'      // ECDSA  
  | 'ed25519';   // EdDSA

/**
 * Key status values
 */
export type DfnsKeyStatus = 'Active' | 'Archived';

/**
 * Key store types
 */
export type DfnsKeyStoreKind = 'Mpc' | 'Hsm';

/**
 * Wallet info attached to key
 */
export interface DfnsKeyWalletInfo {
  id: string;
  network: string;
}

/**
 * Key store information
 */
export interface DfnsKeyStoreInfo {
  kind: DfnsKeyStoreKind;
  keyId: string; // Internal key identifier for Layer 4 backup
}

/**
 * Core key entity (matches DFNS API response)
 */
export interface DfnsKey {
  id: string;
  name?: string;
  scheme: DfnsKeyScheme;
  curve: DfnsKeyCurve;
  publicKey: string; // Hex-encoded public key
  status: DfnsKeyStatus;
  custodial: boolean;
  dateCreated: string; // ISO 8601 date
  imported?: boolean;
  exported?: boolean;
  dateExported?: string; // ISO 8601 date
  wallets?: DfnsKeyWalletInfo[]; // Only returned by getKey
  store?: DfnsKeyStoreInfo; // Only returned by getKey
}

/**
 * Create key request parameters
 */
export interface CreateKeyRequest {
  scheme: DfnsKeyScheme;
  curve: DfnsKeyCurve;
  name?: string;
  delegateTo?: string; // End user ID for delegation
  delayDelegation?: boolean; // Create for later delegation
}

/**
 * Update key request parameters
 */
export interface UpdateKeyRequest {
  name: string;
}

/**
 * Delegate key request parameters
 */
export interface DelegateKeyRequest {
  userId: string; // End user ID to delegate to
}

/**
 * List keys query parameters
 */
export interface ListKeysParams {
  owner?: string; // Get delegated keys by userId or username
  limit?: number; // Max items to return (default: 100)
  paginationToken?: string; // Token for next page
}

/**
 * List keys response
 */
export interface ListKeysResponse {
  items: DfnsKey[];
  nextPageToken?: string;
}

/**
 * Key operation options
 */
export interface KeyOperationOptions {
  syncToDatabase?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * Key statistics for dashboard
 */
export interface KeyStatistics {
  totalKeys: number;
  activeKeys: number;
  archivedKeys: number;
  delegatedKeys: number;
  custodialKeys: number;
  byScheme: Record<DfnsKeyScheme, number>;
  byCurve: Record<DfnsKeyCurve, number>;
  walletsPerKey: Record<string, number>; // keyId -> wallet count
}

/**
 * Supported scheme/curve combinations
 */
export const SUPPORTED_KEY_FORMATS: Record<DfnsKeyScheme, DfnsKeyCurve[]> = {
  'ECDSA': ['secp256k1', 'stark'],
  'EdDSA': ['ed25519'],
  'Schnorr': ['secp256k1']
};

/**
 * Network compatibility by key format
 */
export const NETWORK_KEY_COMPATIBILITY: Record<string, { scheme: DfnsKeyScheme; curve: DfnsKeyCurve }[]> = {
  'Ethereum': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Bitcoin': [
    { scheme: 'ECDSA', curve: 'secp256k1' },
    { scheme: 'Schnorr', curve: 'secp256k1' }
  ],
  'Solana': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Aptos': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Cosmos': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Polygon': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Stellar': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Cardano': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Tezos': [
    { scheme: 'EdDSA', curve: 'ed25519' },
    { scheme: 'ECDSA', curve: 'secp256k1' }
  ],
  'Algorand': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'NEAR': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Sui': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'TRON': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'XrpLedger': [
    { scheme: 'ECDSA', curve: 'secp256k1' },
    { scheme: 'EdDSA', curve: 'ed25519' }
  ]
};

// ==============================================
// DFNS Key Service Implementation
// ==============================================

export class DfnsKeyService {
  private client: WorkingDfnsClient;
  private requestCount = 0;
  private errorCount = 0;

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ==============================================
  // Core Key Management Operations
  // ==============================================

  /**
   * Create a new cryptographic key with specified scheme and curve
   * 
   * @param request - Key creation parameters
   * @param userActionToken - Required User Action token for security
   * @param options - Operation options
   * @returns Created key entity
   */
  async createKey(
    request: CreateKeyRequest,
    userActionToken?: string,
    options: KeyOperationOptions = {}
  ): Promise<DfnsKey> {
    try {
      this.validateKeyFormat(request.scheme, request.curve);
      
      const response = await this.client.makeRequest<DfnsKey>(
        'POST',
        '/keys',
        request,
        userActionToken
      );

      this.requestCount++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      console.log(`✅ Key created: ${response.id} (${response.scheme}/${response.curve})`);
      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Create key failed:', error);
      throw new DfnsError(
        `Failed to create key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_CREATE_FAILED',
        { request, error }
      );
    }
  }

  /**
   * Update an existing key's name
   * 
   * @param keyId - Key ID to update
   * @param request - Update parameters (name only)
   * @param userActionToken - Required User Action token
   * @param options - Operation options
   * @returns Updated key entity
   */
  async updateKey(
    keyId: string,
    request: UpdateKeyRequest,
    userActionToken?: string,
    options: KeyOperationOptions = {}
  ): Promise<DfnsKey> {
    try {
      if (!keyId?.trim()) {
        throw new Error('Key ID is required');
      }

      if (!request.name?.trim()) {
        throw new Error('Key name is required');
      }

      const response = await this.client.makeRequest<DfnsKey>(
        'PUT',
        `/keys/${keyId}`,
        request,
        userActionToken
      );

      this.requestCount++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      console.log(`✅ Key updated: ${keyId} -> "${request.name}"`);
      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Update key failed:', error);
      throw new DfnsError(
        `Failed to update key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_UPDATE_FAILED',
        { keyId, request, error }
      );
    }
  }

  /**
   * Delete a key and all associated wallets
   * WARNING: This operation is irreversible and deletes all wallets using this key
   * 
   * @param keyId - Key ID to delete
   * @param userActionToken - Required User Action token
   * @param options - Operation options
   * @returns Archived key entity
   */
  async deleteKey(
    keyId: string,
    userActionToken?: string,
    options: KeyOperationOptions = {}
  ): Promise<DfnsKey> {
    try {
      if (!keyId?.trim()) {
        throw new Error('Key ID is required');
      }

      // Get key info first to warn about wallet deletion
      const keyInfo = await this.getKey(keyId);
      const walletCount = keyInfo.wallets?.length || 0;
      
      if (walletCount > 0) {
        console.warn(`⚠️ WARNING: Deleting key ${keyId} will also delete ${walletCount} associated wallet(s)`);
      }

      const response = await this.client.makeRequest<DfnsKey>(
        'DELETE',
        `/keys/${keyId}`,
        undefined,
        userActionToken
      );

      this.requestCount++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      console.log(`✅ Key deleted: ${keyId} (${walletCount} wallets also deleted)`);
      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Delete key failed:', error);
      throw new DfnsError(
        `Failed to delete key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_DELETE_FAILED',
        { keyId, error }
      );
    }
  }

  /**
   * Delegate a key to an end user (irreversible operation)
   * 
   * @param keyId - Key ID to delegate
   * @param request - Delegation parameters
   * @param userActionToken - Required User Action token
   * @param options - Operation options
   * @returns Updated key entity
   */
  async delegateKey(
    keyId: string,
    request: DelegateKeyRequest,
    userActionToken?: string,
    options: KeyOperationOptions = {}
  ): Promise<DfnsKey> {
    try {
      if (!keyId?.trim()) {
        throw new Error('Key ID is required');
      }

      if (!request.userId?.trim()) {
        throw new Error('User ID is required for delegation');
      }

      console.warn(`⚠️ WARNING: Key delegation is irreversible. Key ${keyId} will be transferred to user ${request.userId}`);

      const response = await this.client.makeRequest<DfnsKey>(
        'POST',
        `/keys/${keyId}/delegate`,
        { userId: request.userId },
        userActionToken
      );

      this.requestCount++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      console.log(`✅ Key delegated: ${keyId} -> user ${request.userId}`);
      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Delegate key failed:', error);
      throw new DfnsError(
        `Failed to delegate key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_DELEGATE_FAILED',
        { keyId, request, error }
      );
    }
  }

  // ==============================================
  // Key Retrieval Operations
  // ==============================================

  /**
   * Get a key by ID with complete details including wallets and store info
   * 
   * @param keyId - Key ID to retrieve
   * @param options - Operation options
   * @returns Key entity with extended information
   */
  async getKey(keyId: string, options: KeyOperationOptions = {}): Promise<DfnsKey> {
    try {
      if (!keyId?.trim()) {
        throw new Error('Key ID is required');
      }

      const response = await this.client.makeRequest<DfnsKey>(
        'GET',
        `/keys/${keyId}`
      );

      this.requestCount++;

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ Get key failed:', error);
      throw new DfnsError(
        `Failed to get key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_GET_FAILED',
        { keyId, error }
      );
    }
  }

  /**
   * List keys with pagination and filtering
   * 
   * @param params - Query parameters for filtering and pagination
   * @param options - Operation options
   * @returns Paginated list of keys
   */
  async listKeys(
    params: ListKeysParams = {},
    options: KeyOperationOptions = {}
  ): Promise<ListKeysResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.owner) {
        queryParams.append('owner', params.owner);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.paginationToken) {
        queryParams.append('paginationToken', params.paginationToken);
      }

      const path = `/keys${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await this.client.makeRequest<ListKeysResponse>(
        'GET',
        path
      );

      this.requestCount++;

      // Sync all keys to database if requested
      if (options.syncToDatabase && response.items.length > 0) {
        await Promise.allSettled(
          response.items.map(key => this.syncKeyToDatabase(key))
        );
      }

      console.log(`📋 Listed ${response.items.length} keys`);
      return response;

    } catch (error) {
      this.errorCount++;
      console.error('❌ List keys failed:', error);
      throw new DfnsError(
        `Failed to list keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_LIST_FAILED',
        { params, error }
      );
    }
  }

  // ==============================================
  // Convenience Methods
  // ==============================================

  /**
   * Get all keys (handles pagination automatically)
   * 
   * @param owner - Optional owner filter
   * @param options - Operation options
   * @returns All keys matching criteria
   */
  async getAllKeys(owner?: string, options: KeyOperationOptions = {}): Promise<DfnsKey[]> {
    const allKeys: DfnsKey[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listKeys({
        owner,
        limit: 100,
        paginationToken
      }, options);

      allKeys.push(...response.items);
      paginationToken = response.nextPageToken;

    } while (paginationToken);

    console.log(`📋 Retrieved ${allKeys.length} total keys`);
    return allKeys;
  }

  /**
   * Get keys by scheme and curve
   * 
   * @param scheme - Key scheme filter
   * @param curve - Key curve filter
   * @param options - Operation options
   * @returns Keys matching the specified format
   */
  async getKeysByFormat(
    scheme: DfnsKeyScheme, 
    curve: DfnsKeyCurve, 
    options: KeyOperationOptions = {}
  ): Promise<DfnsKey[]> {
    this.validateKeyFormat(scheme, curve);
    
    const allKeys = await this.getAllKeys(undefined, options);
    return allKeys.filter(key => key.scheme === scheme && key.curve === curve);
  }

  /**
   * Get keys compatible with a specific network
   * 
   * @param network - Network name (e.g., 'Ethereum', 'Bitcoin')
   * @param options - Operation options
   * @returns Keys that can be used with the specified network
   */
  async getKeysForNetwork(network: string, options: KeyOperationOptions = {}): Promise<DfnsKey[]> {
    const supportedFormats = NETWORK_KEY_COMPATIBILITY[network];
    if (!supportedFormats || supportedFormats.length === 0) {
      throw new Error(`Network "${network}" is not supported or has no compatible key formats`);
    }

    const allKeys = await this.getAllKeys(undefined, options);
    
    return allKeys.filter(key => 
      supportedFormats.some(format => 
        key.scheme === format.scheme && key.curve === format.curve
      )
    );
  }

  /**
   * Get custodial vs non-custodial key breakdown
   * 
   * @param options - Operation options
   * @returns Categorized keys by custodial status
   */
  async getKeysByCustodialStatus(options: KeyOperationOptions = {}): Promise<{
    custodial: DfnsKey[];
    nonCustodial: DfnsKey[];
    total: number;
  }> {
    const allKeys = await this.getAllKeys(undefined, options);
    
    const custodial = allKeys.filter(key => key.custodial);
    const nonCustodial = allKeys.filter(key => !key.custodial);

    return {
      custodial,
      nonCustodial,
      total: allKeys.length
    };
  }

  // ==============================================
  // Statistics & Analytics
  // ==============================================

  /**
   * Get comprehensive key statistics for dashboard
   * 
   * @param options - Operation options
   * @returns Detailed key statistics
   */
  async getKeyStatistics(options: KeyOperationOptions = {}): Promise<KeyStatistics> {
    try {
      const allKeys = await this.getAllKeys(undefined, options);

      const stats: KeyStatistics = {
        totalKeys: allKeys.length,
        activeKeys: 0,
        archivedKeys: 0,
        delegatedKeys: 0,
        custodialKeys: 0,
        byScheme: { 'ECDSA': 0, 'EdDSA': 0, 'Schnorr': 0 },
        byCurve: { 'secp256k1': 0, 'stark': 0, 'ed25519': 0 },
        walletsPerKey: {}
      };

      // Calculate statistics
      for (const key of allKeys) {
        // Status counts
        if (key.status === 'Active') stats.activeKeys++;
        if (key.status === 'Archived') stats.archivedKeys++;
        
        // Custodial counts
        if (key.custodial) stats.custodialKeys++;
        if (!key.custodial) stats.delegatedKeys++;

        // Scheme/curve counts
        stats.byScheme[key.scheme]++;
        stats.byCurve[key.curve]++;

        // Wallet count per key (if available)
        if (key.wallets) {
          stats.walletsPerKey[key.id] = key.wallets.length;
        }
      }

      console.log(`📊 Key statistics: ${stats.totalKeys} total, ${stats.activeKeys} active, ${stats.delegatedKeys} delegated`);
      return stats;

    } catch (error) {
      console.error('❌ Get key statistics failed:', error);
      throw new DfnsError(
        `Failed to get key statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_STATS_FAILED',
        { error }
      );
    }
  }

  /**
   * Get active keys ready for wallet creation
   * 
   * @param options - Operation options
   * @returns Active keys that can be used for wallet creation
   */
  async getActiveKeysForWalletCreation(options: KeyOperationOptions = {}): Promise<DfnsKey[]> {
    const allKeys = await this.getAllKeys(undefined, options);
    
    return allKeys.filter(key => 
      key.status === 'Active' && 
      key.custodial // Only custodial keys can create new wallets
    );
  }

  /**
   * Get delegated keys by user
   * 
   * @param userId - User ID or username
   * @param options - Operation options
   * @returns Keys delegated to the specified user
   */
  async getDelegatedKeysByUser(userId: string, options: KeyOperationOptions = {}): Promise<DfnsKey[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    const response = await this.listKeys({ owner: userId }, options);
    return response.items;
  }

  // ==============================================
  // Validation & Utility Methods
  // ==============================================

  /**
   * Validate key scheme and curve combination
   * 
   * @param scheme - Key scheme
   * @param curve - Key curve
   * @throws Error if combination is not supported
   */
  validateKeyFormat(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): void {
    const supportedCurves = SUPPORTED_KEY_FORMATS[scheme];
    if (!supportedCurves || !supportedCurves.includes(curve)) {
      throw new Error(`Invalid key format: ${scheme}/${curve}. Supported combinations: ${JSON.stringify(SUPPORTED_KEY_FORMATS)}`);
    }
  }

  /**
   * Check if a key format is compatible with a network
   * 
   * @param network - Network name
   * @param scheme - Key scheme
   * @param curve - Key curve
   * @returns Whether the key format is compatible
   */
  isKeyFormatCompatibleWithNetwork(
    network: string, 
    scheme: DfnsKeyScheme, 
    curve: DfnsKeyCurve
  ): boolean {
    const supportedFormats = NETWORK_KEY_COMPATIBILITY[network];
    if (!supportedFormats) return false;

    return supportedFormats.some(format => 
      format.scheme === scheme && format.curve === curve
    );
  }

  /**
   * Get supported networks for a key format
   * 
   * @param scheme - Key scheme
   * @param curve - Key curve
   * @returns Networks that support this key format
   */
  getSupportedNetworksForKeyFormat(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): string[] {
    this.validateKeyFormat(scheme, curve);

    return Object.entries(NETWORK_KEY_COMPATIBILITY)
      .filter(([_, formats]) => 
        formats.some(format => format.scheme === scheme && format.curve === curve)
      )
      .map(([network]) => network);
  }

  /**
   * Get recommended key format for a network
   * 
   * @param network - Network name
   * @returns Recommended key format (first in compatibility list)
   */
  getRecommendedKeyFormatForNetwork(network: string): { scheme: DfnsKeyScheme; curve: DfnsKeyCurve } | null {
    const supportedFormats = NETWORK_KEY_COMPATIBILITY[network];
    return supportedFormats?.[0] || null;
  }

  // ==============================================
  // Database Synchronization
  // ==============================================

  /**
   * Sync key data to local database
   * 
   * @param key - Key entity to sync
   */
  private async syncKeyToDatabase(key: DfnsKey): Promise<void> {
    try {
      // Note: This would sync to your Supabase tables
      // Implementation depends on your database schema
      console.log(`💾 Syncing key ${key.id} to database...`);
      
      // Example sync logic (adjust based on your schema):
      /*
      await supabase
        .from('dfns_keys')
        .upsert({
          id: key.id,
          name: key.name,
          scheme: key.scheme,
          curve: key.curve,
          public_key: key.publicKey,
          status: key.status,
          custodial: key.custodial,
          date_created: key.dateCreated,
          imported: key.imported,
          exported: key.exported,
          date_exported: key.dateExported,
          store_kind: key.store?.kind,
          store_key_id: key.store?.keyId,
          updated_at: new Date().toISOString()
        });
      */

    } catch (error) {
      console.error('❌ Database sync failed for key:', key.id, error);
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
      successRate: this.requestCount > 0 ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 0
    };
  }

  /**
   * Reset service metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Test key service connection
   */
  async testConnection(): Promise<{ success: boolean; keyCount: number; error?: string }> {
    try {
      const response = await this.listKeys({ limit: 1 });
      return {
        success: true,
        keyCount: response.items.length
      };
    } catch (error) {
      return {
        success: false,
        keyCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==============================================
// Factory Function
// ==============================================

let globalKeyService: DfnsKeyService | null = null;

/**
 * Get or create the global DFNS Key service instance
 */
export function getDfnsKeyService(client?: WorkingDfnsClient): DfnsKeyService {
  if (!globalKeyService && client) {
    globalKeyService = new DfnsKeyService(client);
  }
  
  if (!globalKeyService) {
    throw new DfnsError('DfnsKeyService not initialized', 'SERVICE_NOT_INITIALIZED');
  }
  
  return globalKeyService;
}

/**
 * Reset the global key service instance (useful for testing)
 */
export function resetDfnsKeyService(): void {
  globalKeyService = null;
}
