/**
 * DFNS Key Service
 * 
 * High-level service for DFNS Keys API operations with enhanced business logic
 * Supports multichain key management, validation, and delegation
 */

import type {
  DfnsCreateKeyRequest,
  DfnsCreateKeyResponse,
  DfnsUpdateKeyRequest,
  DfnsUpdateKeyResponse,
  DfnsDeleteKeyResponse,
  DfnsGetKeyResponse,
  DfnsListKeysRequest,
  DfnsListKeysResponse,
  DfnsDelegateKeyRequest,
  DfnsDelegateKeyResponse,
  DfnsKey,
  DfnsKeyScheme,
  DfnsKeyCurve,
  DfnsKeyServiceOptions,
  DfnsCreateKeyOptions,
  DfnsKeySummary,
  DfnsKeyBatchResult,
  DfnsNetworkCompatibility,
  DfnsKeyValidation,
  DfnsValidSchemeCurvePair,
  // Signature Generation Types
  DfnsGenerateSignatureRequest,
  DfnsGenerateSignatureResponse,
  DfnsGetSignatureRequestResponse,
  DfnsListSignatureRequestsRequest,
  DfnsListSignatureRequestsResponse,
  DfnsSignatureKind,
  DfnsBlockchainKind,
  DfnsSignatureStatus,
  DfnsSignatureSummary,
  DfnsSignatureBatchResult,
  DfnsSignatureServiceOptions,
  DfnsNetworkSignatureCapabilities,
  DfnsEvmSignatureRequest,
  DfnsBitcoinSignatureRequest,
  DfnsSolanaSignatureRequest,
  DfnsXrpLedgerSignatureRequest
} from '../../types/dfns';
import { DFNS_KEY_NETWORK_COMPATIBILITY } from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { 
  DfnsError, 
  DfnsValidationError, 
  DfnsAuthorizationError,
  DfnsNetworkError 
} from '../../types/dfns/errors';

export class DfnsKeyService {
  constructor(
    private authClient: DfnsAuthClient,
    private userActionService: DfnsUserActionService
  ) {}

  // ===============================
  // Core Key Management
  // ===============================

  /**
   * Create a new cryptographic key
   * Requires User Action Signing for security compliance
   */
  async createKey(
    request: DfnsCreateKeyRequest,
    options: DfnsCreateKeyOptions = {}
  ): Promise<DfnsCreateKeyResponse> {
    try {
      // Validate scheme/curve compatibility
      this.validateSchemeCurvePair(request.scheme, request.curve);

      // Validate network compatibility if autoCreateWallets specified
      if (options.autoCreateWallets?.length) {
        this.validateNetworkCompatibility(request.scheme, request.curve, options.autoCreateWallets);
      }

      // Sign user action for key creation (always required)
      const userActionToken = await this.userActionService.signUserAction(
        'CreateKey',
        {
          scheme: request.scheme,
          curve: request.curve,
          name: request.name,
          delegateTo: request.delegateTo,
          delayDelegation: request.delayDelegation
        }
      );

      // Create the key
      const keyResponse = await this.authClient.createKey(request, userActionToken);

      // Auto-create wallets if requested
      if (options.autoCreateWallets?.length && keyResponse.id) {
        await this.autoCreateWalletsForKey(
          keyResponse.id, 
          options.autoCreateWallets,
          options.walletTags
        );
      }

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(keyResponse);
      }

      return keyResponse;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to create key: ${error}`, 'KEY_CREATION_FAILED');
    }
  }

  /**
   * Update a key's name
   */
  async updateKey(
    keyId: string,
    request: DfnsUpdateKeyRequest,
    options: DfnsKeyServiceOptions = {}
  ): Promise<DfnsUpdateKeyResponse> {
    try {
      this.validateKeyId(keyId);
      this.validateKeyName(request.name);

      const response = await this.authClient.updateKey(keyId, request);

      if (options.syncToDatabase) {
        await this.syncKeyToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to update key: ${error}`, 'KEY_UPDATE_FAILED');
    }
  }

  /**
   * Delete (archive) a key and all associated wallets
   * Requires User Action Signing - this is a destructive operation
   */
  async deleteKey(
    keyId: string,
    options: DfnsKeyServiceOptions = {}
  ): Promise<DfnsDeleteKeyResponse> {
    try {
      this.validateKeyId(keyId);

      // Get key details to understand impact
      const keyDetails = await this.getKey(keyId);
      const walletCount = keyDetails.wallets?.length || 0;

      // Sign user action for key deletion
      const userActionToken = await this.userActionService.signUserAction(
        'DeleteKey',
        {
          keyId,
          walletCount,
          scheme: keyDetails.scheme,
          curve: keyDetails.curve
        }
      );

      const response = await this.authClient.deleteKey(keyId, userActionToken);

      if (options.syncToDatabase) {
        await this.markKeyAsDeletedInDatabase(keyId);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to delete key: ${error}`, 'KEY_DELETION_FAILED');
    }
  }

  /**
   * Get a key by its ID
   */
  async getKey(keyId: string): Promise<DfnsGetKeyResponse> {
    try {
      this.validateKeyId(keyId);
      return await this.authClient.getKey(keyId);
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to get key: ${error}`, 'KEY_RETRIEVAL_FAILED');
    }
  }

  /**
   * List all keys with optional filtering
   */
  async listKeys(
    request: DfnsListKeysRequest = {},
    options: DfnsKeyServiceOptions = {}
  ): Promise<DfnsListKeysResponse> {
    try {
      const response = await this.authClient.listKeys(request);

      if (options.syncToDatabase) {
        await Promise.all(
          response.items.map(key => this.syncKeyToDatabase(key))
        );
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to list keys: ${error}`, 'KEY_LISTING_FAILED');
    }
  }

  /**
   * Get all keys (handles pagination automatically)
   */
  async getAllKeys(): Promise<DfnsKey[]> {
    const allKeys: DfnsKey[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listKeys({ 
        limit: 100, 
        paginationToken 
      });
      
      allKeys.push(...response.items);
      paginationToken = response.nextPageToken;
    } while (paginationToken);

    return allKeys;
  }

  /**
   * Delegate a key to an end user
   * Requires User Action Signing - transfers ownership
   */
  async delegateKey(
    keyId: string,
    request: DfnsDelegateKeyRequest,
    options: DfnsKeyServiceOptions = {}
  ): Promise<DfnsDelegateKeyResponse> {
    try {
      this.validateKeyId(keyId);
      this.validateUserId(request.userId);

      // Get key details to understand delegation impact
      const keyDetails = await this.getKey(keyId);
      if (keyDetails.delegatedTo) {
        throw new DfnsValidationError('Key is already delegated');
      }

      // Sign user action for key delegation
      const userActionToken = await this.userActionService.signUserAction(
        'DelegateKey',
        {
          keyId,
          userId: request.userId,
          scheme: keyDetails.scheme,
          curve: keyDetails.curve,
          walletCount: keyDetails.wallets?.length || 0
        }
      );

      const response = await this.authClient.delegateKey(keyId, request, userActionToken);

      if (options.syncToDatabase) {
        await this.updateKeyDelegationInDatabase(keyId, request.userId);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to delegate key: ${error}`, 'KEY_DELEGATION_FAILED');
    }
  }

  // ===============================
  // Enhanced Features
  // ===============================

  /**
   * Find a key by name
   */
  async getKeyByName(name: string): Promise<DfnsKey | null> {
    const allKeys = await this.getAllKeys();
    return allKeys.find(key => key.name === name) || null;
  }

  /**
   * Get keys summary for dashboard display
   */
  async getKeysSummary(): Promise<DfnsKeySummary[]> {
    const keys = await this.getAllKeys();
    
    return Promise.all(
      keys.map(async (key) => {
        const details = await this.getKey(key.id);
        const compatibleNetworks = this.getCompatibleNetworks(key.scheme, key.curve);
        
        return {
          keyId: key.id,
          name: key.name,
          scheme: key.scheme,
          curve: key.curve,
          compatibleNetworks: compatibleNetworks.length,
          walletCount: details.wallets?.length || 0,
          isActive: key.status === 'Active',
          isCustodial: key.custodial,
          isDelegated: !!key.delegatedTo,
          delegatedTo: key.delegatedTo,
          dateCreated: key.dateCreated,
          isImported: key.imported || false,
          wasExported: key.exported || false
        };
      })
    );
  }

  /**
   * Validate key configuration
   */
  validateKeyConfiguration(
    scheme: DfnsKeyScheme,
    curve: DfnsKeyCurve,
    targetNetworks?: string[]
  ): DfnsKeyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scheme/curve compatibility
    try {
      this.validateSchemeCurvePair(scheme, curve);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid scheme/curve pair');
    }

    // Validate network compatibility
    const networkCompatibility = this.getNetworkCompatibilityDetails(scheme, curve);
    
    if (targetNetworks?.length) {
      const incompatibleNetworks = targetNetworks.filter(
        network => !this.isNetworkCompatible(scheme, curve, network)
      );
      
      if (incompatibleNetworks.length > 0) {
        errors.push(`Networks not compatible with ${scheme}/${curve}: ${incompatibleNetworks.join(', ')}`);
      }
    }

    // Performance warnings
    if (scheme === 'ECDSA' && curve === 'stark') {
      warnings.push('STARK curve is specialized for StarkNet - may have limited network support');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      networkCompatibility
    };
  }

  /**
   * Get compatible networks for a scheme/curve pair
   */
  getCompatibleNetworks(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): string[] {
    return DFNS_KEY_NETWORK_COMPATIBILITY[scheme]?.[curve] || [];
  }

  /**
   * Check if a network is compatible with scheme/curve
   */
  isNetworkCompatible(scheme: DfnsKeyScheme, curve: DfnsKeyCurve, network: string): boolean {
    const compatibleNetworks = this.getCompatibleNetworks(scheme, curve);
    return compatibleNetworks.includes(network);
  }

  /**
   * Get network compatibility details
   */
  getNetworkCompatibilityDetails(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): DfnsNetworkCompatibility[] {
    const allNetworks = [
      'Ethereum', 'Bitcoin', 'Solana', 'Polygon', 'Arbitrum', 'Optimism',
      'Avalanche', 'Binance', 'Cosmos', 'Stellar', 'Algorand', 'Cardano',
      'Polkadot', 'Near', 'Aptos', 'Sui', 'Tezos', 'Kaspa', 'Tron'
    ];

    return allNetworks.map(network => ({
      network,
      compatible: this.isNetworkCompatible(scheme, curve, network),
      supportedSchemes: this.getSupportedSchemesForNetwork(network),
      supportedCurves: this.getSupportedCurvesForNetwork(network)
    }));
  }

  // ===============================
  // Batch Operations
  // ===============================

  /**
   * Delete multiple keys
   */
  async deleteKeys(keyIds: string[]): Promise<DfnsKeyBatchResult<DfnsDeleteKeyResponse>> {
    const successful: DfnsDeleteKeyResponse[] = [];
    const failed: Array<{ keyId: string; error: string }> = [];

    for (const keyId of keyIds) {
      try {
        const result = await this.deleteKey(keyId);
        successful.push(result);
      } catch (error) {
        failed.push({
          keyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  // ===============================
  // Static Utilities
  // ===============================

  /**
   * Check if scheme/curve pair is valid
   */
  static isValidSchemeCurvePair(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): boolean {
    const validPairs: DfnsValidSchemeCurvePair[] = [
      { scheme: 'ECDSA', curve: 'secp256k1' },
      { scheme: 'ECDSA', curve: 'stark' },
      { scheme: 'EdDSA', curve: 'ed25519' },
      { scheme: 'Schnorr', curve: 'secp256k1' }
    ];

    return validPairs.some(pair => pair.scheme === scheme && pair.curve === curve);
  }

  /**
   * Get default curve for a scheme
   */
  static getDefaultCurveForScheme(scheme: DfnsKeyScheme): DfnsKeyCurve {
    switch (scheme) {
      case 'ECDSA':
        return 'secp256k1';
      case 'EdDSA':
        return 'ed25519';
      case 'Schnorr':
        return 'secp256k1';
      default:
        throw new DfnsValidationError(`Unknown scheme: ${scheme}`);
    }
  }

  /**
   * Get supported schemes for a network
   */
  static getSupportedSchemesForNetwork(network: string): DfnsKeyScheme[] {
    const schemes: DfnsKeyScheme[] = [];
    
    Object.entries(DFNS_KEY_NETWORK_COMPATIBILITY).forEach(([scheme, curveMap]) => {
      Object.values(curveMap).forEach(networks => {
        if (networks.includes(network)) {
          schemes.push(scheme as DfnsKeyScheme);
        }
      });
    });

    return [...new Set(schemes)]; // Remove duplicates
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private validateKeyId(keyId: string): void {
    if (!keyId || typeof keyId !== 'string' || keyId.trim().length === 0) {
      throw new DfnsValidationError('Key ID is required');
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new DfnsValidationError('User ID is required');
    }
  }

  private validateKeyName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new DfnsValidationError('Key name is required');
    }
    if (name.length > 100) {
      throw new DfnsValidationError('Key name must be 100 characters or less');
    }
  }

  private validateSchemeCurvePair(scheme: DfnsKeyScheme, curve: DfnsKeyCurve): void {
    if (!DfnsKeyService.isValidSchemeCurvePair(scheme, curve)) {
      throw new DfnsValidationError(`Invalid scheme/curve combination: ${scheme}/${curve}`);
    }
  }

  private validateNetworkCompatibility(
    scheme: DfnsKeyScheme, 
    curve: DfnsKeyCurve, 
    networks: string[]
  ): void {
    const incompatibleNetworks = networks.filter(
      network => !this.isNetworkCompatible(scheme, curve, network)
    );
    
    if (incompatibleNetworks.length > 0) {
      throw new DfnsValidationError(
        `Networks not compatible with ${scheme}/${curve}: ${incompatibleNetworks.join(', ')}`
      );
    }
  }

  private getSupportedSchemesForNetwork(network: string): DfnsKeyScheme[] {
    return DfnsKeyService.getSupportedSchemesForNetwork(network);
  }

  private getSupportedCurvesForNetwork(network: string): DfnsKeyCurve[] {
    const curves: DfnsKeyCurve[] = [];
    
    Object.entries(DFNS_KEY_NETWORK_COMPATIBILITY).forEach(([_, curveMap]) => {
      Object.entries(curveMap).forEach(([curve, networks]) => {
        if (networks.includes(network)) {
          curves.push(curve as DfnsKeyCurve);
        }
      });
    });

    return [...new Set(curves)]; // Remove duplicates
  }

  private async autoCreateWalletsForKey(
    keyId: string,
    networks: string[],
    tags?: string[]
  ): Promise<void> {
    // TODO: Implement wallet auto-creation
    // This would integrate with the wallet service to create wallets
    // using the specified key across multiple networks
    console.log(`Auto-creating wallets for key ${keyId} on networks:`, networks);
  }

  private async syncKeyToDatabase(key: DfnsKey): Promise<void> {
    // TODO: Implement database synchronization
    // This would sync key data to the local dfns_signing_keys table
    console.log(`Syncing key ${key.id} to database`);
  }

  private async markKeyAsDeletedInDatabase(keyId: string): Promise<void> {
    // TODO: Implement database deletion marking
    console.log(`Marking key ${keyId} as deleted in database`);
  }

  private async updateKeyDelegationInDatabase(keyId: string, userId: string): Promise<void> {
    // TODO: Implement database delegation update
    console.log(`Updating key ${keyId} delegation to user ${userId} in database`);
  }

  // ===============================
  // Signature Generation Methods
  // ===============================

  /**
   * Generate a signature using a key
   * Requires User Action Signing for security compliance
   */
  async generateSignature(
    keyId: string,
    request: DfnsGenerateSignatureRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse> {
    try {
      // Validate signature request
      this.validateSignatureRequest(request);

      // Sign user action for signature generation (always required)
      const userActionToken = await this.userActionService.signUserAction(
        'GenerateSignature',
        {
          keyId,
          kind: request.kind,
          blockchainKind: request.blockchainKind,
          externalId: request.externalId
        }
      );

      // Generate the signature
      const signatureResponse = await this.authClient.generateKeySignature(
        keyId,
        request,
        userActionToken
      );

      // Wait for completion if requested
      if (options.waitForCompletion) {
        const completedSignature = await this.waitForSignatureCompletion(
          keyId,
          signatureResponse.id,
          options.timeout || 30000
        );
        
        // Sync to database if requested
        if (options.syncToDatabase) {
          await this.syncSignatureToDatabase(completedSignature);
        }

        return completedSignature;
      }

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncSignatureToDatabase(signatureResponse);
      }

      return signatureResponse;
    } catch (error) {
      if (error instanceof DfnsError) throw error;
      throw new DfnsError(`Failed to generate signature: ${error}`, 'SIGNATURE_GENERATION_FAILED');
    }
  }

  /**
   * Generate EVM signature (Ethereum, Polygon, Arbitrum, etc.)
   */
  async generateEvmSignature(
    keyId: string,
    request: DfnsEvmSignatureRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse> {
    return this.generateSignature(keyId, request, options);
  }

  /**
   * Generate Bitcoin signature (Bitcoin, Litecoin)
   */
  async generateBitcoinSignature(
    keyId: string,
    request: DfnsBitcoinSignatureRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse> {
    return this.generateSignature(keyId, request, options);
  }

  /**
   * Generate Solana signature
   */
  async generateSolanaSignature(
    keyId: string,
    request: DfnsSolanaSignatureRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse> {
    return this.generateSignature(keyId, request, options);
  }

  /**
   * Generate XRP Ledger signature
   */
  async generateXrpLedgerSignature(
    keyId: string,
    request: DfnsXrpLedgerSignatureRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse> {
    return this.generateSignature(keyId, request, options);
  }

  /**
   * Get a signature request by ID
   */
  async getSignatureRequest(
    keyId: string,
    signatureId: string
  ): Promise<DfnsGetSignatureRequestResponse> {
    try {
      return await this.authClient.getKeySignatureRequest(keyId, signatureId);
    } catch (error) {
      throw new DfnsError(`Failed to get signature request: ${error}`, 'GET_SIGNATURE_REQUEST_FAILED');
    }
  }

  /**
   * List signature requests for a key
   */
  async listSignatureRequests(
    keyId: string,
    request?: DfnsListSignatureRequestsRequest,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsListSignatureRequestsResponse> {
    try {
      const response = await this.authClient.listKeySignatureRequests(keyId, request);

      // Sync to database if requested
      if (options.syncToDatabase) {
        for (const signature of response.items) {
          await this.syncSignatureToDatabase(signature);
        }
      }

      return response;
    } catch (error) {
      throw new DfnsError(`Failed to list signature requests: ${error}`, 'LIST_SIGNATURE_REQUESTS_FAILED');
    }
  }

  /**
   * Get all signature requests for a key (handles pagination)
   */
  async getAllSignatureRequests(
    keyId: string,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse[]> {
    const allSignatures: DfnsGenerateSignatureResponse[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listSignatureRequests(
        keyId,
        { limit: 100, paginationToken },
        options
      );
      
      allSignatures.push(...response.items);
      paginationToken = response.nextPageToken;
    } while (paginationToken);

    return allSignatures;
  }

  /**
   * Get pending signature requests for a key
   */
  async getPendingSignatureRequests(
    keyId: string,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsGenerateSignatureResponse[]> {
    const response = await this.listSignatureRequests(
      keyId,
      { status: 'Pending' },
      options
    );
    return response.items;
  }

  /**
   * Get signature summaries for dashboard display
   */
  async getSignaturesSummary(
    keyId: string,
    options: DfnsSignatureServiceOptions = {}
  ): Promise<DfnsSignatureSummary[]> {
    const signatures = await this.getAllSignatureRequests(keyId, options);

    return signatures.map(signature => ({
      signatureId: signature.id,
      keyId: signature.keyId,
      blockchainKind: signature.requestBody.blockchainKind,
      kind: signature.requestBody.kind,
      network: signature.network,
      status: signature.status,
      isCompleted: signature.status === 'Signed',
      isPending: signature.status === 'Pending',
      isFailed: signature.status === 'Failed',
      dateRequested: signature.dateRequested,
      dateSigned: signature.dateSigned,
      externalId: signature.requestBody.externalId,
      error: signature.error
    }));
  }

  // ===============================
  // Network Signature Capabilities
  // ===============================

  /**
   * Get signature capabilities for a network
   */
  static getNetworkSignatureCapabilities(network: string): DfnsNetworkSignatureCapabilities {
    const evmNetworks = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche', 'Binance'];
    const bitcoinNetworks = ['Bitcoin', 'BitcoinCash', 'Litecoin'];

    if (evmNetworks.includes(network)) {
      return {
        network,
        supportedBlockchainKinds: ['Evm'],
        supportedSignatureKinds: ['Transaction', 'Hash', 'Message', 'Eip712'],
        supportsEip712: true,
        supportsMessageSigning: true,
        supportsHashSigning: true
      };
    }

    if (bitcoinNetworks.includes(network)) {
      return {
        network,
        supportedBlockchainKinds: ['Bitcoin'],
        supportedSignatureKinds: ['Psbt', 'Hash', 'Bip322'],
        supportsEip712: false,
        supportsMessageSigning: true,
        supportsHashSigning: true
      };
    }

    if (network === 'Solana') {
      return {
        network,
        supportedBlockchainKinds: ['Solana'],
        supportedSignatureKinds: ['Transaction', 'Hash', 'Message'],
        supportsEip712: false,
        supportsMessageSigning: true,
        supportsHashSigning: true
      };
    }

    if (network === 'Xrpl') {
      return {
        network,
        supportedBlockchainKinds: ['XrpLedger'],
        supportedSignatureKinds: ['Transaction', 'Hash', 'Message'],
        supportsEip712: false,
        supportsMessageSigning: true,
        supportsHashSigning: true
      };
    }

    // Default capabilities for other networks
    return {
      network,
      supportedBlockchainKinds: [],
      supportedSignatureKinds: ['Hash'],
      supportsEip712: false,
      supportsMessageSigning: false,
      supportsHashSigning: true
    };
  }

  /**
   * Check if a signature kind is supported by a network
   */
  static isSignatureKindSupported(network: string, kind: DfnsSignatureKind): boolean {
    const capabilities = DfnsKeyService.getNetworkSignatureCapabilities(network);
    return capabilities.supportedSignatureKinds.includes(kind);
  }

  /**
   * Check if a blockchain kind is supported by a network
   */
  static isBlockchainKindSupported(network: string, blockchainKind: DfnsBlockchainKind): boolean {
    const capabilities = DfnsKeyService.getNetworkSignatureCapabilities(network);
    return capabilities.supportedBlockchainKinds.includes(blockchainKind);
  }

  // ===============================
  // Private Signature Helper Methods
  // ===============================

  private validateSignatureRequest(request: DfnsGenerateSignatureRequest): void {
    // Validate signature kind
    const validKinds: DfnsSignatureKind[] = ['Transaction', 'Hash', 'Message', 'Eip712', 'Psbt', 'Bip322'];
    if (!validKinds.includes(request.kind)) {
      throw new DfnsValidationError(`Invalid signature kind: ${request.kind}`);
    }

    // Validate blockchain kind if provided
    if (request.blockchainKind) {
      const validBlockchainKinds: DfnsBlockchainKind[] = [
        'Evm', 'Bitcoin', 'Solana', 'XrpLedger', 'Tezos', 'Stellar',
        'Algorand', 'Aptos', 'Cardano', 'Cosmos', 'Near', 'Polkadot', 'Sui'
      ];
      if (!validBlockchainKinds.includes(request.blockchainKind)) {
        throw new DfnsValidationError(`Invalid blockchain kind: ${request.blockchainKind}`);
      }
    }

    // Validate request has required data for signature kind
    switch (request.kind) {
      case 'Transaction':
        if (!request.transaction) {
          throw new DfnsValidationError('Transaction hex required for Transaction signature kind');
        }
        break;
      case 'Hash':
        if (!request.hash) {
          throw new DfnsValidationError('Hash required for Hash signature kind');
        }
        break;
      case 'Message':
        if (!request.message) {
          throw new DfnsValidationError('Message required for Message signature kind');
        }
        break;
      case 'Psbt':
        if (!request.psbt) {
          throw new DfnsValidationError('PSBT hex required for Psbt signature kind');
        }
        break;
      case 'Eip712':
        if (!request.types || !request.domain) {
          throw new DfnsValidationError('EIP-712 types and domain required for Eip712 signature kind');
        }
        break;
    }
  }

  private async waitForSignatureCompletion(
    keyId: string,
    signatureId: string,
    timeout: number
  ): Promise<DfnsGenerateSignatureResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < timeout) {
      const signature = await this.getSignatureRequest(keyId, signatureId);
      
      if (signature.status === 'Signed' || signature.status === 'Failed' || signature.status === 'Cancelled') {
        return signature;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new DfnsError(`Signature request ${signatureId} timed out after ${timeout}ms`, 'SIGNATURE_TIMEOUT');
  }

  private async syncSignatureToDatabase(signature: DfnsGenerateSignatureResponse): Promise<void> {
    // TODO: Implement database synchronization
    // This would sync signature data to the local dfns_signature_requests table
    console.log(`Syncing signature ${signature.id} to database`);
  }
}
