/**
 * DFNS Wallet Service
 * 
 * High-level service for DFNS wallet management operations
 * Provides business logic layer over DFNS Wallet APIs
 * 
 * Phase 1 Implementation: Foundation (Core Wallet Management)
 * - Wallet Creation, Listing, Retrieval, and Updates
 * - Asset Management (balances, NFTs, history)
 * - Transfer Operations
 * - Tag Management
 */

import type {
  DfnsCreateWalletRequest,
  DfnsCreateWalletResponse,
  DfnsUpdateWalletRequest,
  DfnsUpdateWalletResponse,
  DfnsListWalletsRequest,
  DfnsListWalletsResponse,
  DfnsGetWalletResponse,
  DfnsDeleteWalletResponse,
  DfnsDelegateWalletRequest,
  DfnsDelegateWalletResponse,
  DfnsGetWalletAssetsRequest,
  DfnsGetWalletAssetsResponse,
  DfnsGetWalletNftsResponse,
  DfnsGetWalletHistoryResponse,
  DfnsAddWalletTagsRequest,
  DfnsAddWalletTagsResponse,
  DfnsDeleteWalletTagsRequest,
  DfnsDeleteWalletTagsResponse,
  DfnsTransferAssetRequest,
  DfnsTransferRequestResponse,
  DfnsListTransferRequestsResponse,
  DfnsGetTransferRequestResponse,
  DfnsWallet,
  DfnsNetwork,
  DfnsWalletAsset,
  DfnsWalletNft,
  DfnsWalletHistoryEntry,
} from '../../types/dfns';
import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { DfnsAuthenticationError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';

export interface WalletServiceOptions {
  enableDatabaseSync?: boolean;
  enableAuditLogging?: boolean;
  validateNetwork?: boolean;
  includeMetadata?: boolean;
  autoRefreshBalances?: boolean;
}

export interface WalletListOptions {
  owner?: string;
  limit?: number;
  paginationToken?: string;
  includeArchived?: boolean;
  filterByNetwork?: DfnsNetwork;
  sortBy?: 'name' | 'createdAt' | 'network' | 'balance';
  sortOrder?: 'asc' | 'desc';
}

export interface WalletCreationOptions {
  syncToDatabase?: boolean;
  autoActivate?: boolean;
  delegateToUser?: string;
  createWithTags?: string[];
}

export interface TransferOptions {
  syncToDatabase?: boolean;
  includeGasEstimation?: boolean;
  validateBalance?: boolean;
  waitForConfirmation?: boolean;
}

// Summary interfaces for dashboard functionality
export interface WalletSummary {
  walletId: string;
  name?: string;
  network: DfnsNetwork;
  address: string;
  totalValueUsd?: string;
  assetCount: number;
  nftCount: number;
  isActive: boolean;
  lastActivity?: string;
  dateCreated?: string; // Added for analytics
  tags?: string[];
}

export interface AssetSummary {
  symbol: string;
  balance: string;
  valueInUsd?: string;
  kind: string;
}

export interface TransferSummary {
  transferId: string;
  walletId: string;
  status: string;
  amount: string;
  asset: string;
  direction: 'outgoing';
  dateRequested: string;
  txHash?: string;
}

export class DfnsWalletService {
  private authClient: DfnsAuthClient;
  private userActionService: DfnsUserActionService;
  private options: WalletServiceOptions;

  constructor(
    dfnsClient: DfnsClient,
    userActionService?: DfnsUserActionService,
    options: WalletServiceOptions = {}
  ) {
    this.authClient = new DfnsAuthClient(dfnsClient);
    this.userActionService = userActionService!;
    this.options = {
      enableDatabaseSync: true,
      enableAuditLogging: true,
      validateNetwork: true,
      includeMetadata: true,
      autoRefreshBalances: false,
      ...options
    };
  }

  // ===============================
  // CORE WALLET MANAGEMENT
  // ===============================

  /**
   * Create a new wallet with User Action Signing
   * Requires Wallets:Create permission
   */
  async createWallet(
    request: DfnsCreateWalletRequest,
    options?: WalletCreationOptions
  ): Promise<DfnsCreateWalletResponse> {
    try {
      // Validate input
      this.validateCreateWalletRequest(request);

      // Check if wallet name already exists (if provided)
      if (request.name) {
        const existingWallet = await this.getWalletByName(request.name);
        if (existingWallet) {
          throw new DfnsValidationError(
            `Wallet with name "${request.name}" already exists`,
            { existingWalletId: existingWallet.id }
          );
        }
      }

      // Get User Action Token for wallet creation (sensitive operation)
      let userActionToken: string | undefined;
      if (this.userActionService) {
        try {
          userActionToken = await this.userActionService.signUserAction(
            'CreateWallet',
            request,
            { persistToDb: true }
          );
        } catch (error) {
          throw new DfnsWalletError(
            `Failed to get user action signature for wallet creation: ${error}`,
            { network: request.network, name: request.name }
          );
        }
      }

      // Create wallet via DFNS API
      const newWallet = await this.authClient.createWallet(request, userActionToken);

      // Add tags if specified
      if (options?.createWithTags && options.createWithTags.length > 0) {
        await this.addWalletTags(newWallet.id, { tags: options.createWithTags });
      }

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncWalletToDatabase(newWallet);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Created wallet: ${newWallet.name || newWallet.id}`, {
          walletId: newWallet.id,
          network: newWallet.network,
          address: newWallet.address,
          custodial: newWallet.custodial
        });
      }

      return newWallet;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to create wallet: ${error}`,
        { network: request.network, name: request.name }
      );
    }
  }

  /**
   * Update wallet name
   * Requires Wallets:Update permission
   */
  async updateWallet(
    walletId: string,
    request: DfnsUpdateWalletRequest
  ): Promise<DfnsUpdateWalletResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateUpdateWalletRequest(request);

      // Check if new name already exists
      const existingWallet = await this.getWalletByName(request.name);
      if (existingWallet && existingWallet.id !== walletId) {
        throw new DfnsValidationError(
          `Wallet with name "${request.name}" already exists`,
          { existingWalletId: existingWallet.id, requestedWalletId: walletId }
        );
      }

      const updatedWallet = await this.authClient.updateWallet(walletId, request);

      // Sync to database if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncWalletToDatabase(updatedWallet);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Updated wallet: ${updatedWallet.name}`, {
          walletId,
          newName: request.name
        });
      }

      return updatedWallet;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to update wallet: ${error}`,
        { walletId, name: request.name }
      );
    }
  }

  /**
   * Delete (archive) a wallet with User Action Signing
   * Requires Wallets:Delete permission
   */
  async deleteWallet(walletId: string): Promise<DfnsDeleteWalletResponse> {
    try {
      this.validateWalletId(walletId);

      // Get wallet info for logging
      const wallet = await this.getWallet(walletId);

      // Get User Action Token for wallet deletion (sensitive operation)
      let userActionToken: string | undefined;
      if (this.userActionService) {
        try {
          userActionToken = await this.userActionService.signUserAction(
            'DeleteWallet',
            { walletId },
            { persistToDb: true }
          );
        } catch (error) {
          throw new DfnsWalletError(
            `Failed to get user action signature for wallet deletion: ${error}`,
            { walletId }
          );
        }
      }

      const deletedWallet = await this.authClient.deleteWallet(walletId, userActionToken);

      // Update database status if enabled
      if (this.options.enableDatabaseSync) {
        await this.syncWalletStatusToDatabase(walletId, 'Archived');
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Deleted wallet: ${wallet.name || walletId}`, {
          walletId,
          network: wallet.network,
          address: wallet.address
        });
      }

      return deletedWallet;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to delete wallet: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Get wallet by ID
   * Requires Wallets:Read permission
   */
  async getWallet(walletId: string): Promise<DfnsGetWalletResponse> {
    try {
      this.validateWalletId(walletId);
      
      const wallet = await this.authClient.getWallet(walletId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Retrieved wallet: ${wallet.name || walletId}`, {
          walletId,
          network: wallet.network,
          address: wallet.address,
          status: wallet.status
        });
      }

      return wallet;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallet: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * List wallets with enhanced filtering
   * Requires Wallets:Read permission
   */
  async listWallets(options?: WalletListOptions): Promise<DfnsListWalletsResponse> {
    try {
      const request: DfnsListWalletsRequest = {
        owner: options?.owner,
        limit: options?.limit || 50,
        paginationToken: options?.paginationToken,
      };

      const response = await this.authClient.listWallets(request);

      // Filter by network if specified
      if (options?.filterByNetwork) {
        response.items = response.items.filter(
          wallet => wallet.network === options.filterByNetwork
        );
      }

      // Exclude archived if specified
      if (!options?.includeArchived) {
        response.items = response.items.filter(
          wallet => wallet.status === 'Active'
        );
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Listed ${response.items.length} wallets`, {
          totalWallets: response.items.length,
          hasNextPage: !!response.nextPageToken,
          filterByNetwork: options?.filterByNetwork
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to list wallets: ${error}`,
        { options }
      );
    }
  }

  /**
   * Get all wallets (handles pagination automatically)
   */
  async getAllWallets(): Promise<DfnsWallet[]> {
    const allWallets: DfnsWallet[] = [];
    let paginationToken: string | undefined;

    try {
      do {
        const response = await this.listWallets({
          limit: 100,
          paginationToken
        });
        
        allWallets.push(...response.items);
        paginationToken = response.nextPageToken;
        
      } while (paginationToken);

      console.log(`[DfnsWalletService] Retrieved ${allWallets.length} total wallets`);
      return allWallets;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get all wallets: ${error}`
      );
    }
  }

  /**
   * Get wallet by name (searches through all wallets)
   */
  async getWalletByName(name: string): Promise<DfnsWallet | null> {
    try {
      const allWallets = await this.getAllWallets();
      const wallet = allWallets.find(w => w.name === name);
      
      if (this.options.enableAuditLogging && wallet) {
        console.log(`[DfnsWalletService] Found wallet by name: ${name}`, {
          walletId: wallet.id,
          network: wallet.network,
          address: wallet.address
        });
      }

      return wallet || null;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallet by name: ${error}`,
        { name }
      );
    }
  }

  // ===============================
  // WALLET ASSET MANAGEMENT
  // ===============================

  /**
   * Get wallet assets (balances) with USD valuation
   * Requires Wallets:Read permission
   */
  async getWalletAssets(
    walletId: string,
    includeUsdValue: boolean = true
  ): Promise<DfnsGetWalletAssetsResponse> {
    try {
      this.validateWalletId(walletId);

      const request: DfnsGetWalletAssetsRequest = {
        walletId,
        includeUsdValue
      };

      const response = await this.authClient.getWalletAssets(walletId, request);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Retrieved ${response.assets.length} assets for wallet`, {
          walletId,
          network: response.network,
          totalValueUsd: response.totalValueUsd,
          assetCount: response.assets.length
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallet assets: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Get wallet NFTs
   * Requires Wallets:Read permission
   */
  async getWalletNfts(walletId: string): Promise<DfnsGetWalletNftsResponse> {
    try {
      this.validateWalletId(walletId);

      const response = await this.authClient.getWalletNfts(walletId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Retrieved ${response.nfts.length} NFTs for wallet`, {
          walletId,
          network: response.network,
          nftCount: response.nfts.length
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallet NFTs: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Get wallet transaction history
   * Requires Wallets:Read permission
   */
  async getWalletHistory(walletId: string): Promise<DfnsGetWalletHistoryResponse> {
    try {
      this.validateWalletId(walletId);

      const response = await this.authClient.getWalletHistory(walletId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Retrieved ${response.history.length} history entries for wallet`, {
          walletId,
          network: response.network,
          historyCount: response.history.length
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallet history: ${error}`,
        { walletId }
      );
    }
  }

  // ===============================
  // WALLET TAG MANAGEMENT
  // ===============================

  /**
   * Add tags to wallet
   * Requires Wallets:Tags:Add permission
   */
  async addWalletTags(
    walletId: string,
    request: DfnsAddWalletTagsRequest
  ): Promise<DfnsAddWalletTagsResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTags(request.tags);

      const response = await this.authClient.addWalletTags(walletId, request);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Added ${request.tags.length} tags to wallet`, {
          walletId,
          tags: request.tags
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to add wallet tags: ${error}`,
        { walletId, tags: request.tags }
      );
    }
  }

  /**
   * Delete tags from wallet
   * Requires Wallets:Tags:Delete permission
   */
  async deleteWalletTags(
    walletId: string,
    request: DfnsDeleteWalletTagsRequest
  ): Promise<DfnsDeleteWalletTagsResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTags(request.tags);

      const response = await this.authClient.deleteWalletTags(walletId, request);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Deleted ${request.tags.length} tags from wallet`, {
          walletId,
          tags: request.tags
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to delete wallet tags: ${error}`,
        { walletId, tags: request.tags }
      );
    }
  }

  // ===============================
  // TRANSFER OPERATIONS
  // ===============================

  /**
   * Transfer asset from wallet with User Action Signing
   * Requires Wallets:Transfer permission
   */
  async transferAsset(
    walletId: string,
    request: DfnsTransferAssetRequest,
    options?: TransferOptions
  ): Promise<DfnsTransferRequestResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTransferRequest(request);

      // Validate balance if requested
      if (options?.validateBalance) {
        await this.validateSufficientBalance(walletId, request);
      }

      // Get User Action Token for transfer (sensitive operation)
      let userActionToken: string | undefined;
      if (this.userActionService) {
        try {
          userActionToken = await this.userActionService.signUserAction(
            'Transfer',
            { walletId, ...request },
            { persistToDb: true }
          );
        } catch (error) {
          throw new DfnsWalletError(
            `Failed to get user action signature for transfer: ${error}`,
            { walletId, to: request.to, kind: request.kind }
          );
        }
      }

      const transferResponse = await this.authClient.transferAsset(
        walletId,
        request,
        userActionToken
      );

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncTransferToDatabase(transferResponse);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Initiated transfer from wallet`, {
          walletId,
          transferId: transferResponse.id,
          kind: request.kind,
          to: request.to,
          status: transferResponse.status
        });
      }

      return transferResponse;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to transfer asset: ${error}`,
        { walletId, to: request.to, kind: request.kind }
      );
    }
  }

  /**
   * Get transfer request by ID
   * Requires Wallets:Transfer:Read permission
   */
  async getTransferRequest(
    walletId: string,
    transferId: string
  ): Promise<DfnsGetTransferRequestResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTransferId(transferId);

      const response = await this.authClient.getTransferRequest(walletId, transferId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Retrieved transfer request`, {
          walletId,
          transferId,
          status: response.status,
          txHash: response.txHash
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get transfer request: ${error}`,
        { walletId, transferId }
      );
    }
  }

  /**
   * List transfer requests for wallet
   * Requires Wallets:Transfer:Read permission
   */
  async listTransferRequests(
    walletId: string,
    limit?: number,
    paginationToken?: string
  ): Promise<DfnsListTransferRequestsResponse> {
    try {
      this.validateWalletId(walletId);

      const response = await this.authClient.listTransferRequests(
        walletId,
        limit,
        paginationToken
      );

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Listed ${response.items.length} transfer requests`, {
          walletId,
          transferCount: response.items.length,
          hasNextPage: !!response.nextPageToken
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to list transfer requests: ${error}`,
        { walletId }
      );
    }
  }

  // ===============================
  // LEGACY/DEPRECATED OPERATIONS
  // ===============================

  /**
   * Delegate wallet to end user (DEPRECATED - use Delegate Key instead)
   * Requires Wallets:Delegate permission and User Action Signing
   */
  async delegateWallet(
    walletId: string,
    request: DfnsDelegateWalletRequest
  ): Promise<DfnsDelegateWalletResponse> {
    try {
      this.validateWalletId(walletId);

      console.warn('[DfnsWalletService] DEPRECATED: Use Delegate Key instead of Delegate Wallet');

      // Get User Action Token for delegation (sensitive operation)
      let userActionToken: string | undefined;
      if (this.userActionService) {
        try {
          userActionToken = await this.userActionService.signUserAction(
            'DelegateWallet',
            { walletId, ...request },
            { persistToDb: true }
          );
        } catch (error) {
          throw new DfnsWalletError(
            `Failed to get user action signature for wallet delegation: ${error}`,
            { walletId, endUserId: request.endUserId }
          );
        }
      }

      const response = await this.authClient.delegateWallet(walletId, request, userActionToken);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsWalletService] Delegated wallet (DEPRECATED)`, {
          walletId,
          endUserId: request.endUserId
        });
      }

      return response;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to delegate wallet: ${error}`,
        { walletId, endUserId: request.endUserId }
      );
    }
  }

  // ===============================
  // ENHANCED DASHBOARD METHODS
  // ===============================

  /**
   * Get wallet summaries for dashboard display
   */
  async getWalletsSummary(): Promise<WalletSummary[]> {
    try {
      const wallets = await this.getAllWallets();
      const summaries: WalletSummary[] = [];

      for (const wallet of wallets) {
        try {
          // Get assets for each wallet
          const assets = await this.getWalletAssets(wallet.id, true);
          const nfts = await this.getWalletNfts(wallet.id);
          
          summaries.push({
            walletId: wallet.id,
            name: wallet.name,
            network: wallet.network,
            address: wallet.address,
            totalValueUsd: assets.totalValueUsd,
            assetCount: assets.assets.length,
            nftCount: nfts.nfts.length,
            isActive: wallet.status === 'Active',
            tags: wallet.tags
          });
        } catch (error) {
          // Continue processing other wallets if one fails
          console.warn(`[DfnsWalletService] Failed to get summary for wallet ${wallet.id}:`, error);
        }
      }

      return summaries;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get wallets summary: ${error}`
      );
    }
  }

  // ===============================
  // VALIDATION METHODS
  // ===============================

  /**
   * Validate wallet ID format
   */
  private validateWalletId(walletId: string): void {
    if (!walletId || typeof walletId !== 'string') {
      throw new DfnsValidationError('Wallet ID is required and must be a string');
    }

    // DFNS wallet IDs follow pattern: wa-xxxx-xxxx-xxxxxxxxxxxxxxxx
    const walletIdPattern = /^wa-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{16}$/;
    if (!walletIdPattern.test(walletId)) {
      throw new DfnsValidationError(
        `Invalid DFNS wallet ID format: ${walletId}`,
        { expectedPattern: 'wa-xxxx-xxxx-xxxxxxxxxxxxxxxx' }
      );
    }
  }

  /**
   * Validate transfer ID format
   */
  private validateTransferId(transferId: string): void {
    if (!transferId || typeof transferId !== 'string') {
      throw new DfnsValidationError('Transfer ID is required and must be a string');
    }

    // DFNS transfer IDs follow pattern: tr-xxxx-xxxx-xxxxxxxxxxxxxxxx
    const transferIdPattern = /^tr-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{16}$/;
    if (!transferIdPattern.test(transferId)) {
      throw new DfnsValidationError(
        `Invalid DFNS transfer ID format: ${transferId}`,
        { expectedPattern: 'tr-xxxx-xxxx-xxxxxxxxxxxxxxxx' }
      );
    }
  }

  /**
   * Validate create wallet request
   */
  private validateCreateWalletRequest(request: DfnsCreateWalletRequest): void {
    if (!request.network || typeof request.network !== 'string') {
      throw new DfnsValidationError('Network is required and must be a string');
    }

    // Validate network support if enabled
    if (this.options.validateNetwork) {
      this.validateNetworkSupport(request.network);
    }

    if (request.name && request.name.length > 100) {
      throw new DfnsValidationError('Wallet name must be 100 characters or less');
    }
  }

  /**
   * Validate update wallet request
   */
  private validateUpdateWalletRequest(request: DfnsUpdateWalletRequest): void {
    if (!request.name || typeof request.name !== 'string') {
      throw new DfnsValidationError('Name is required and must be a string');
    }

    if (request.name.length > 100) {
      throw new DfnsValidationError('Wallet name must be 100 characters or less');
    }
  }

  /**
   * Validate transfer request
   */
  private validateTransferRequest(request: DfnsTransferAssetRequest): void {
    if (!request.kind || typeof request.kind !== 'string') {
      throw new DfnsValidationError('Asset kind is required');
    }

    if (!request.to || typeof request.to !== 'string') {
      throw new DfnsValidationError('Destination address is required');
    }

    // Validate based on asset type
    if (request.kind === 'Native' || request.kind === 'Erc20') {
      if (!('amount' in request) || !request.amount) {
        throw new DfnsValidationError('Amount is required for fungible asset transfers');
      }
    }

    if (request.kind === 'Erc721') {
      if (!('tokenId' in request) || !request.tokenId) {
        throw new DfnsValidationError('Token ID is required for NFT transfers');
      }
    }
  }

  /**
   * Validate network support
   */
  private validateNetworkSupport(network: DfnsNetwork): void {
    // DFNS supports 30+ blockchains - validate against known networks
    const supportedNetworks: DfnsNetwork[] = [
      'Ethereum', 'Bitcoin', 'Polygon', 'Avalanche', 'Binance',
      'Arbitrum', 'Optimism', 'Solana', 'Near', 'Algorand',
      'Stellar', 'Cardano', 'Polkadot', 'Kusama', 'Cosmos',
      'Osmosis', 'Juno', 'Stargaze', 'Aptos', 'Sui'
    ];

    if (!supportedNetworks.includes(network)) {
      throw new DfnsValidationError(
        `Unsupported network: ${network}`,
        { supportedNetworks }
      );
    }
  }

  /**
   * Validate wallet tags
   */
  private validateTags(tags: string[]): void {
    if (!Array.isArray(tags)) {
      throw new DfnsValidationError('Tags must be an array');
    }

    if (tags.length === 0) {
      throw new DfnsValidationError('At least one tag is required');
    }

    if (tags.length > 20) {
      throw new DfnsValidationError('Maximum 20 tags allowed');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length === 0) {
        throw new DfnsValidationError('Each tag must be a non-empty string');
      }
      if (tag.length > 50) {
        throw new DfnsValidationError('Each tag must be 50 characters or less');
      }
    }
  }

  /**
   * Validate sufficient balance for transfer (placeholder)
   */
  private async validateSufficientBalance(
    walletId: string,
    request: DfnsTransferAssetRequest
  ): Promise<void> {
    // TODO: Implement balance validation logic
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsWalletService] TODO: Validate sufficient balance`, {
        walletId,
        kind: request.kind,
        amount: 'amount' in request ? request.amount : 'N/A'
      });
    }
  }

  // ===============================
  // DATABASE SYNC METHODS (PLACEHOLDERS)
  // ===============================

  /**
   * Sync wallet data to local database (placeholder)
   * TODO: Implement database sync using Supabase client
   */
  private async syncWalletToDatabase(wallet: DfnsWallet): Promise<void> {
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsWalletService] TODO: Sync wallet to database`, {
        walletId: wallet.id,
        network: wallet.network,
        address: wallet.address
      });
    }
    // TODO: Implement Supabase insert/update to dfns_wallets table
  }

  /**
   * Sync wallet status to local database (placeholder)
   */
  private async syncWalletStatusToDatabase(walletId: string, status: string): Promise<void> {
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsWalletService] TODO: Sync wallet status to database`, {
        walletId,
        status
      });
    }
    // TODO: Implement Supabase update to dfns_wallets table
  }

  /**
   * Sync transfer to local database (placeholder)
   */
  private async syncTransferToDatabase(transfer: DfnsTransferRequestResponse): Promise<void> {
    if (this.options.enableAuditLogging) {
      console.log(`[DfnsWalletService] TODO: Sync transfer to database`, {
        transferId: transfer.id,
        walletId: transfer.walletId,
        status: transfer.status
      });
    }
    // TODO: Implement Supabase insert to dfns_transfers table
  }
}
