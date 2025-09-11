/**
 * DFNS Wallet Service
 * 
 * Implements current DFNS Wallet API methods
 * Based on: https://docs.dfns.co/d/api-docs/wallets
 * 
 * Supports both Service Account and PAT token authentication
 * User Action Signing required for write operations
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsWallet,
  DfnsCreateWalletRequest,
  DfnsCreateWalletResponse,
  DfnsUpdateWalletRequest,
  DfnsUpdateWalletResponse,
  DfnsListWalletsRequest,
  DfnsListWalletsResponse,
  DfnsGetWalletResponse,
  DfnsDelegateWalletRequest,
  DfnsDelegateWalletResponse,
  DfnsWalletServiceOptions,
  DfnsPaginationOptions
} from '../../types/dfns/wallets';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';
import { getDfnsDatabaseSyncService } from './databaseSyncService';
import { getDfnsWalletAssetsService } from './walletAssetsService';
import { getDfnsWalletTransfersService } from './walletTransfersService';

export class DfnsWalletService {
  private client: WorkingDfnsClient;
  private databaseSyncService = getDfnsDatabaseSyncService();

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // WALLET CRUD OPERATIONS
  // ===============================

  /**
   * Create a new wallet
   * 
   * @param request - Wallet creation parameters
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Created wallet
   * 
   * API: POST /wallets
   * Requires: Wallets:Create permission + User Action Signing
   */
  async createWallet(
    request: DfnsCreateWalletRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsCreateWalletResponse> {
    try {
      // Validate request
      this.validateCreateWalletRequest(request);

      // Warn if no User Action token (will likely fail)
      if (!userActionToken) {
        console.warn('⚠️ Creating wallet without User Action token - this will likely fail with 403');
        console.log('💡 Create a WebAuthn credential or register a Key credential for User Action Signing');
      }

      // Make API request
      const wallet = await this.client.makeRequest<DfnsCreateWalletResponse>(
        'POST',
        '/wallets',
        request,
        userActionToken
      );

      console.log(`✅ Wallet created successfully: ${wallet.id} (${wallet.network})`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet, {}); // Fix: add required options parameter
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      // Enhanced error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          throw new DfnsWalletError(
            `Wallet creation failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}. Check Wallets:Create permission.`,
            { 
              network: request.network, 
              name: request.name,
              hasUserAction: !!userActionToken,
              requiredPermission: 'Wallets:Create'
            }
          );
        }
        if (error.message.includes('400')) {
          throw new DfnsValidationError('Invalid wallet creation request', { request });
        }
      }
      
      throw new DfnsWalletError(`Failed to create wallet: ${error}`, { network: request.network, name: request.name , code: 'WALLET_CREATE_FAILED'});
    }
  }

  /**
   * Update wallet details
   * 
   * @param walletId - Wallet ID
   * @param request - Update parameters
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet
   * 
   * API: PUT /wallets/{walletId}
   * Requires: Wallets:Update permission + User Action Signing
   */
  async updateWallet(
    walletId: string,
    request: DfnsUpdateWalletRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsUpdateWalletResponse> {
    try {
      // Validate inputs
      this.validateWalletId(walletId);
      this.validateUpdateWalletRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Updating wallet without User Action token - this will likely fail');
      }

      const wallet = await this.client.makeRequest<DfnsUpdateWalletResponse>(
        'PUT',
        `/wallets/${walletId}`,
        request,
        userActionToken
      );

      console.log(`✅ Wallet updated successfully: ${walletId}`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet, {});
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for updated wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('403')) {
        throw new DfnsWalletError(`Wallet update failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}`, { walletId, hasUserAction: !!userActionToken , code: 'WALLET_UPDATE_UNAUTHORIZED'});
      }
      
      throw new DfnsWalletError(`Failed to update wallet ${walletId}: ${error}`, { walletId , code: 'WALLET_UPDATE_FAILED'});
    }
  }

  /**
   * Get wallet by ID
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Wallet details
   * 
   * API: GET /wallets/{walletId}
   * Requires: Wallets:Read permission
   */
  async getWallet(
    walletId: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsGetWalletResponse> {
    try {
      this.validateWalletId(walletId);

      const wallet = await this.client.makeRequest<DfnsGetWalletResponse>(
        'GET',
        `/wallets/${walletId}`
      );

      console.log(`✅ Retrieved wallet: ${walletId} (${wallet.network})`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet, {});
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for retrieved wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(`Failed to get wallet ${walletId}: ${error}`, { walletId , code: 'WALLET_GET_FAILED'});
    }
  }

  /**
   * List wallets with filtering and pagination
   * 
   * @param request - List parameters
   * @param options - Service options
   * @returns List of wallets
   * 
   * API: GET /wallets
   * Requires: Wallets:Read permission
   */
  async listWallets(
    request: DfnsListWalletsRequest = {},
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsListWalletsResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (request.owner) {
        queryParams.append('owner', request.owner);
      }
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/wallets?${queryString}` : '/wallets';

      const response = await this.client.makeRequest<DfnsListWalletsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} wallets`);
      
      // Sync to database if requested
      if (options.syncToDatabase && response.items.length > 0) {
        try {
          await this.databaseSyncService.syncWalletsBatch(response.items, {});
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for wallet list:', syncError);
        }
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(
        `Failed to list wallets: ${error}`,
        { code: 'WALLET_LIST_FAILED' }
      );
    }
  }

  /**
   * Get all wallets (handles pagination automatically)
   * 
   * @param owner - Optional owner filter
   * @param options - Service options
   * @returns All wallets
   */
  async getAllWallets(
    owner?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsWallet[]> {
    try {
      const allWallets: DfnsWallet[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const response = await this.listWallets({
          owner,
          limit: 100,
          paginationToken: nextPageToken
        }, options);

        allWallets.push(...response.items);
        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      console.log(`✅ Retrieved all ${allWallets.length} wallets`);
      return allWallets;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get all wallets: ${error}`,
        { code: 'WALLET_GET_ALL_FAILED' }
      );
    }
  }

  /**
   * Archive/delete wallet (sets status to Archived)
   * 
   * @param walletId - Wallet ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Archived wallet
   * 
   * API: DELETE /wallets/{walletId} (Archives wallet)
   * Requires: Wallets:Archive permission + User Action Signing
   */
  async archiveWallet(
    walletId: string,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsWallet> {
    try {
      this.validateWalletId(walletId);

      if (!userActionToken) {
        console.warn('⚠️ Archiving wallet without User Action token - this will likely fail');
      }

      const wallet = await this.client.makeRequest<DfnsWallet>(
        'DELETE',
        `/wallets/${walletId}`,
        undefined,
        userActionToken
      );

      console.log(`✅ Wallet archived successfully: ${walletId}`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for archived wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('403')) {
        throw new DfnsWalletError(`Wallet archive failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}`, { walletId, hasUserAction: !!userActionToken , code: 'WALLET_ARCHIVE_UNAUTHORIZED'});
      }
      
      throw new DfnsWalletError(`Failed to archive wallet ${walletId}: ${error}`, { walletId , code: 'WALLET_ARCHIVE_FAILED'});
    }
  }

  // ===============================
  // DELEGATION OPERATIONS
  // ===============================

  /**
   * Delegate wallet to end user (DEPRECATED - use delegateTo in createWallet)
   * 
   * @param walletId - Wallet ID
   * @param request - Delegation parameters
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Delegated wallet
   * 
   * API: PUT /wallets/{walletId}/delegate
   * Requires: Wallets:Delegate permission + User Action Signing
   * 
   * @deprecated Use delegateTo parameter in createWallet instead
   */
  async delegateWallet(
    walletId: string,
    request: DfnsDelegateWalletRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsDelegateWalletResponse> {
    try {
      console.warn('⚠️ delegateWallet is deprecated. Use delegateTo parameter in createWallet instead.');
      
      this.validateWalletId(walletId);
      
      if (!request.endUserId) {
        throw new DfnsValidationError('endUserId is required for wallet delegation');
      }

      if (!userActionToken) {
        console.warn('⚠️ Delegating wallet without User Action token - this will likely fail');
      }

      const wallet = await this.client.makeRequest<DfnsDelegateWalletResponse>(
        'PUT',
        `/wallets/${walletId}/delegate`,
        request,
        userActionToken
      );

      console.log(`✅ Wallet delegated successfully: ${walletId} → ${request.endUserId}`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for delegated wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('403')) {
        throw new DfnsWalletError(`Wallet delegation failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}`, { walletId, endUserId: request.endUserId, hasUserAction: !!userActionToken , code: 'WALLET_DELEGATE_UNAUTHORIZED'});
      }
      
      throw new DfnsWalletError(`Failed to delegate wallet ${walletId}: ${error}`, { walletId, endUserId: request.endUserId , code: 'WALLET_DELEGATE_FAILED'});
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Check if a wallet exists
   * 
   * @param walletId - Wallet ID
   * @returns True if wallet exists
   */
  async walletExists(walletId: string): Promise<boolean> {
    try {
      await this.getWallet(walletId);
      return true;
    } catch (error) {
      if (error instanceof DfnsWalletError && error.code === 'WALLET_GET_FAILED') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get wallet summary for dashboard display
   * 
   * @param walletId - Wallet ID
   * @returns Basic wallet information
   */
  async getWalletSummary(walletId: string) {
    try {
      const wallet = await this.getWallet(walletId);
      
      return {
        id: wallet.id,
        name: wallet.name,
        network: wallet.network,
        address: wallet.address,
        status: wallet.status,
        custodial: wallet.custodial,
        dateCreated: wallet.dateCreated,
        tags: wallet.tags || []
      };
    } catch (error) {
      throw new DfnsWalletError(`Failed to get wallet summary for ${walletId}: ${error}`, { walletId , code: 'WALLET_SUMMARY_FAILED'});
    }
  }

  /**
   * Alias for getWalletSummary (component compatibility)
   */
  async getWalletsSummary(walletId: string) {
    return this.getWalletSummary(walletId);
  }

  /**
   * Get wallet assets (alias for wallet assets service)
   */
  async getWalletAssets(walletId: string) {
    // This method should delegate to wallet assets service
    const walletAssetsService = getDfnsWalletAssetsService();
    return walletAssetsService.getWalletAssets(walletId);
  }

  /**
   * Get wallet NFTs (alias for wallet assets service)
   */
  async getWalletNfts(walletId: string) {
    // This method should delegate to wallet assets service
    const walletAssetsService = getDfnsWalletAssetsService();
    return walletAssetsService.getWalletNfts(walletId);
  }

  /**
   * Get wallet history/transactions (alias for wallet transfers service)
   */
  async getWalletHistory(walletId: string) {
    // This method should delegate to wallet transfers service
    const walletTransfersService = getDfnsWalletTransfersService();
    return walletTransfersService.listTransferRequests(walletId);
  }

  /**
   * Transfer asset (alias for wallet transfers service)
   */
  async transferAsset(
    walletId: string, 
    to: string, 
    amount: string, 
    userActionToken?: string
  ) {
    // This method should delegate to wallet transfers service
    const walletTransfersService = getDfnsWalletTransfersService();
    return walletTransfersService.transferNativeAsset(
      walletId, to, amount, userActionToken, { syncToDatabase: true }
    );
  }

  /**
   * Get wallet count for analytics
   * 
   * @param owner - Optional owner filter
   * @returns Wallet count
   */
  async getWalletCount(owner?: string): Promise<number> {
    try {
      // Use limit 1 to get count efficiently
      const response = await this.listWallets({ owner, limit: 1 });
      
      // If there's pagination, we'd need to count all pages
      // For now, return the count from first page or total if available
      let count = response.items.length;
      
      // If there's a next page, we need to count all
      if (response.nextPageToken) {
        const allWallets = await this.getAllWallets(owner);
        count = allWallets.length;
      }
      
      return count;
    } catch (error) {
      console.warn('Failed to get wallet count:', error);
      return 0;
    }
  }

  /**
   * Validate supported networks
   * 
   * @param network - Network to validate
   * @returns True if supported
   */
  isSupportedNetwork(network: DfnsNetwork): boolean {
    // This could be enhanced to check against DFNS API for current supported networks
    const supportedNetworks: DfnsNetwork[] = [
      'Ethereum', 'Bitcoin', 'Polygon', 'Arbitrum', 'Optimism', 'Base',
      'Solana', 'Avalanche', 'BnbSmartChain', 'Fantom', 'Algorand',
      'Cardano', 'Cosmos', 'Near', 'Polkadot', 'Stellar', 'Tezos',
      'Tron', 'XrpLedger', 'Aptos', 'Sui', 'Iota'
    ];
    
    return supportedNetworks.includes(network);
  }

  // ===============================
  // VALIDATION METHODS
  // ===============================

  private validateWalletId(walletId: string): void {
    if (!walletId) {
      throw new DfnsValidationError('Wallet ID is required');
    }
    if (!walletId.startsWith('wa-')) {
      throw new DfnsValidationError('Invalid wallet ID format. Expected format: wa-xxxxx-xxxxx-xxxxxxxxxxxxxxxx');
    }
  }

  private validateCreateWalletRequest(request: DfnsCreateWalletRequest): void {
    if (!request.network) {
      throw new DfnsValidationError('Network is required for wallet creation');
    }
    
    if (!this.isSupportedNetwork(request.network)) {
      throw new DfnsValidationError(`Unsupported network: ${request.network}`);
    }
    
    if (request.name && request.name.length > 100) {
      throw new DfnsValidationError('Wallet name must be 100 characters or less');
    }
    
    if (request.tags && request.tags.length > 10) {
      throw new DfnsValidationError('Maximum 10 tags allowed per wallet');
    }
  }

  private validateUpdateWalletRequest(request: DfnsUpdateWalletRequest): void {
    if (!request.name) {
      throw new DfnsValidationError('Name is required for wallet update');
    }
    
    if (request.name.length > 100) {
      throw new DfnsValidationError('Wallet name must be 100 characters or less');
    }
  }

  // ===============================
  // SERVICE STATUS
  // ===============================

  /**
   * Test wallet service connectivity
   * 
   * @returns Service status
   */
  async testWalletService() {
    try {
      const startTime = Date.now();
      
      // Test basic list operation
      const response = await this.listWallets({ limit: 1 });
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        walletCount: response.items.length,
        canCreateWallet: false, // Requires User Action Signing
        canReadWallets: true,
        message: 'Wallet service is operational'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        walletCount: 0,
        canCreateWallet: false,
        canReadWallets: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Wallet service is not accessible'
      };
    }
  }
}

// ===============================
// GLOBAL SERVICE INSTANCE
// ===============================

let globalWalletService: DfnsWalletService | null = null;

/**
 * Get or create the global DFNS wallet service instance
 */
export function getDfnsWalletService(client?: WorkingDfnsClient): DfnsWalletService {
  if (!globalWalletService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsWalletService', 'MISSING_CLIENT');
    }
    globalWalletService = new DfnsWalletService(client);
  }
  return globalWalletService;
}

/**
 * Reset the global wallet service instance
 */
export function resetDfnsWalletService(): void {
  globalWalletService = null;
}