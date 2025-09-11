/**
 * DFNS Wallet Transfers Service
 * 
 * Implements current DFNS Wallet Transfer API methods
 * Based on: https://docs.dfns.co/d/api-docs/wallets/transfer-asset
 *           https://docs.dfns.co/d/api-docs/wallets/get-transfer-request-by-id
 *           https://docs.dfns.co/d/api-docs/wallets/list-transfer-requests
 * 
 * Handles wallet asset transfer operations
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsTransferAssetRequest,
  DfnsTransferRequestResponse,
  DfnsListTransferRequestsResponse,
  DfnsGetTransferRequestResponse,
  DfnsWalletServiceOptions,
  DfnsPaginationOptions
} from '../../types/dfns/wallets';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';
import { getDfnsDatabaseSyncService } from './databaseSyncService';

export class DfnsWalletTransfersService {
  private client: WorkingDfnsClient;
  private databaseSyncService = getDfnsDatabaseSyncService();

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // TRANSFER OPERATIONS
  // ===============================

  /**
   * Transfer asset from wallet
   * 
   * @param walletId - Source wallet ID
   * @param request - Transfer parameters
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Transfer request details
   * 
   * API: POST /wallets/{walletId}/transfers
   * Requires: Wallets:Transfers:Create permission + User Action Signing
   */
  async transferAsset(
    walletId: string,
    request: DfnsTransferAssetRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    try {
      // Validate inputs
      this.validateWalletId(walletId);
      this.validateTransferRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Transferring asset without User Action token - this will likely fail');
        console.log('💡 Create a WebAuthn credential or register a Key credential for User Action Signing');
      }

      // Make API request
      const transfer = await this.client.makeRequest<DfnsTransferRequestResponse>(
        'POST',
        `/wallets/${walletId}/transfers`,
        request,
        userActionToken
      );

      console.log(`✅ Transfer request created: ${transfer.id} (${transfer.status})`);
      console.log(`📤 Transferring ${request.kind} from ${walletId} to ${request.to}`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncTransferRequest(transfer);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for transfer request:', syncError);
        }
      }

      return transfer;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      // Enhanced error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          throw new DfnsWalletError(`Asset transfer failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}. Check Wallets:Transfers:Create permission.`, { 
              walletId, 
              transferRequest: request,
              hasUserAction: !!userActionToken,
              requiredPermission: 'Wallets:Transfers:Create'
            , code: 'TRANSFER_UNAUTHORIZED'});
        }
        if (error.message.includes('400')) {
          throw new DfnsValidationError('Invalid transfer request', { walletId, request });
        }
        if (error.message.includes('402')) {
          throw new DfnsWalletError('Insufficient funds for transfer', { walletId, request , code: 'INSUFFICIENT_FUNDS'});
        }
      }
      
      throw new DfnsWalletError(`Failed to transfer asset from wallet ${walletId}: ${error}`, { walletId, transferRequest: request , code: 'TRANSFER_FAILED'});
    }
  }

  /**
   * Transfer native asset (ETH, BTC, etc.)
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param amount - Amount in smallest unit
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Transfer request
   */
  async transferNativeAsset(
    walletId: string,
    to: string,
    amount: string,
    userActionToken?: string,
    options: { externalId?: string; feeSponsorId?: string } & DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    const request: DfnsTransferAssetRequest = {
      kind: 'Native',
      to,
      amount,
      externalId: options.externalId,
      feeSponsorId: options.feeSponsorId
    };

    return this.transferAsset(walletId, request, userActionToken, options);
  }

  /**
   * Transfer ERC-20 token
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param contract - Token contract address
   * @param amount - Amount in smallest unit
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Transfer request
   */
  async transferErc20Token(
    walletId: string,
    to: string,
    contract: string,
    amount: string,
    userActionToken?: string,
    options: { externalId?: string; feeSponsorId?: string } & DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    const request: DfnsTransferAssetRequest = {
      kind: 'Erc20',
      to,
      contract,
      amount,
      externalId: options.externalId,
      feeSponsorId: options.feeSponsorId
    };

    return this.transferAsset(walletId, request, userActionToken, options);
  }

  /**
   * Transfer NFT (ERC-721)
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param contract - NFT contract address
   * @param tokenId - Token ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Transfer request
   */
  async transferNft(
    walletId: string,
    to: string,
    contract: string,
    tokenId: string,
    userActionToken?: string,
    options: { externalId?: string; feeSponsorId?: string } & DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    const request: DfnsTransferAssetRequest = {
      kind: 'Erc721',
      to,
      contract,
      tokenId,
      externalId: options.externalId,
      feeSponsorId: options.feeSponsorId
    };

    return this.transferAsset(walletId, request, userActionToken, options);
  }

  /**
   * Transfer Algorand Standard Asset (ASA)
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param assetId - Asset ID
   * @param amount - Amount in smallest unit
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Transfer request
   */
  async transferAlgorandAsset(
    walletId: string,
    to: string,
    assetId: string,
    amount: string,
    userActionToken?: string,
    options: { externalId?: string; feeSponsorId?: string } & DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    const request: DfnsTransferAssetRequest = {
      kind: 'Asa',
      to,
      assetId,
      amount,
      externalId: options.externalId,
      feeSponsorId: options.feeSponsorId
    };

    return this.transferAsset(walletId, request, userActionToken, options);
  }

  /**
   * Transfer Solana token (SPL)
   * 
   * @param walletId - Source wallet ID
   * @param to - Destination address
   * @param mint - Token mint address
   * @param amount - Amount in smallest unit
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Transfer request
   */
  async transferSolanaToken(
    walletId: string,
    to: string,
    mint: string,
    amount: string,
    userActionToken?: string,
    options: { externalId?: string; feeSponsorId?: string; kind?: 'Spl' | 'Spl2022' } & DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse> {
    const request: DfnsTransferAssetRequest = {
      kind: options.kind || 'Spl',
      to,
      mint,
      amount,
      externalId: options.externalId,
      feeSponsorId: options.feeSponsorId
    };

    return this.transferAsset(walletId, request, userActionToken, options);
  }

  // ===============================
  // TRANSFER REQUEST QUERIES
  // ===============================

  /**
   * Get transfer request by ID
   * 
   * @param walletId - Wallet ID
   * @param transferId - Transfer request ID
   * @param options - Service options
   * @returns Transfer request details
   * 
   * API: GET /wallets/{walletId}/transfers/{transferId}
   * Requires: Wallets:Read permission
   */
  async getTransferRequest(
    walletId: string,
    transferId: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsGetTransferRequestResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTransferId(transferId);

      const transfer = await this.client.makeRequest<DfnsGetTransferRequestResponse>(
        'GET',
        `/wallets/${walletId}/transfers/${transferId}`
      );

      console.log(`✅ Retrieved transfer request: ${transferId} (${transfer.status})`);
      
      return transfer;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(`Failed to get transfer request ${transferId} for wallet ${walletId}: ${error}`, { walletId, transferId , code: 'TRANSFER_GET_FAILED'});
    }
  }

  /**
   * List transfer requests for wallet
   * 
   * @param walletId - Wallet ID
   * @param options - Pagination and filter options
   * @returns List of transfer requests
   * 
   * API: GET /wallets/{walletId}/transfers
   * Requires: Wallets:Read permission
   */
  async listTransferRequests(
    walletId: string,
    options: DfnsPaginationOptions & DfnsWalletServiceOptions = {}
  ): Promise<DfnsListTransferRequestsResponse> {
    try {
      this.validateWalletId(walletId);

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      if (options.paginationToken) {
        queryParams.append('paginationToken', options.paginationToken);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/wallets/${walletId}/transfers?${queryString}` : `/wallets/${walletId}/transfers`;

      const response = await this.client.makeRequest<DfnsListTransferRequestsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} transfer requests for wallet ${walletId}`);
      
      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(`Failed to list transfer requests for wallet ${walletId}: ${error}`, { walletId , code: 'TRANSFER_LIST_FAILED'});
    }
  }

  /**
   * Get all transfer requests (handles pagination automatically)
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns All transfer requests
   */
  async getAllTransferRequests(
    walletId: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse[]> {
    try {
      const allTransfers: DfnsTransferRequestResponse[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const response = await this.listTransferRequests(walletId, {
          limit: 100,
          paginationToken: nextPageToken,
          ...options
        });

        allTransfers.push(...response.items);
        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      console.log(`✅ Retrieved all ${allTransfers.length} transfer requests for wallet ${walletId}`);
      return allTransfers;
    } catch (error) {
      throw new DfnsWalletError(`Failed to get all transfer requests for wallet ${walletId}: ${error}`, { walletId , code: 'TRANSFER_GET_ALL_FAILED'});
    }
  }

  /**
   * Get pending transfer requests
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Pending transfer requests
   */
  async getPendingTransfers(
    walletId: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse[]> {
    try {
      const allTransfers = await this.getAllTransferRequests(walletId, options);
      
      const pendingTransfers = allTransfers.filter(transfer => 
        transfer.status === 'Pending' || transfer.status === 'Executing'
      );

      console.log(`✅ Found ${pendingTransfers.length} pending transfers for wallet ${walletId}`);
      
      return pendingTransfers;
    } catch (error) {
      throw new DfnsWalletError(`Failed to get pending transfers for wallet ${walletId}: ${error}`, { walletId , code: 'PENDING_TRANSFERS_FAILED'});
    }
  }

  /**
   * Get recent transfer requests
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent transfers
   * @param options - Service options
   * @returns Recent transfer requests
   */
  async getRecentTransfers(
    walletId: string,
    count: number = 10,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsTransferRequestResponse[]> {
    try {
      const response = await this.listTransferRequests(walletId, {
        limit: count,
        ...options
      });
      
      // Sort by dateRequested descending to get most recent first
      const sortedTransfers = response.items.sort((a, b) => 
        new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
      );

      console.log(`✅ Retrieved ${sortedTransfers.length} recent transfers for wallet ${walletId}`);
      
      return sortedTransfers.slice(0, count);
    } catch (error) {
      throw new DfnsWalletError(`Failed to get recent transfers for wallet ${walletId}: ${error}`, { walletId, count , code: 'RECENT_TRANSFERS_FAILED'});
    }
  }

  // ===============================
  // TRANSFER ANALYTICS
  // ===============================

  /**
   * Get transfer statistics for wallet
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Transfer statistics
   */
  async getTransferStatistics(
    walletId: string,
    options: DfnsWalletServiceOptions = {}
  ) {
    try {
      const allTransfers = await this.getAllTransferRequests(walletId, options);
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const statistics = {
        total: allTransfers.length,
        byStatus: {
          pending: allTransfers.filter(t => t.status === 'Pending').length,
          executing: allTransfers.filter(t => t.status === 'Executing').length,
          confirmed: allTransfers.filter(t => t.status === 'Confirmed').length,
          failed: allTransfers.filter(t => t.status === 'Failed').length,
          rejected: allTransfers.filter(t => t.status === 'Rejected').length
        },
        byTimeframe: {
          last24h: allTransfers.filter(t => new Date(t.dateRequested) > oneDayAgo).length,
          lastWeek: allTransfers.filter(t => new Date(t.dateRequested) > oneWeekAgo).length,
          lastMonth: allTransfers.filter(t => new Date(t.dateRequested) > oneMonthAgo).length
        },
        byAssetKind: {} as Record<string, number>,
        totalFeesPaid: '0',
        successRate: 0,
        lastTransfer: allTransfers.length > 0 ? allTransfers[0].dateRequested : null
      };

      // Count by asset kind
      for (const transfer of allTransfers) {
        const kind = transfer.requestBody.kind;
        statistics.byAssetKind[kind] = (statistics.byAssetKind[kind] || 0) + 1;
      }

      // Calculate success rate
      const completedTransfers = statistics.byStatus.confirmed + statistics.byStatus.failed + statistics.byStatus.rejected;
      if (completedTransfers > 0) {
        statistics.successRate = (statistics.byStatus.confirmed / completedTransfers) * 100;
      }

      // Calculate total fees (sum all confirmed transfers with fee)
      const feesSum = allTransfers
        .filter(t => t.status === 'Confirmed' && t.fee)
        .reduce((sum, t) => sum + BigInt(t.fee || '0'), BigInt(0));
      statistics.totalFeesPaid = feesSum.toString();

      console.log(`📊 Transfer statistics for wallet ${walletId}:`, {
        total: statistics.total,
        successRate: statistics.successRate.toFixed(1) + '%',
        pendingCount: statistics.byStatus.pending
      });

      return statistics;
    } catch (error) {
      console.warn(`Failed to get transfer statistics for wallet ${walletId}:`, error);
      return {
        total: 0,
        byStatus: { pending: 0, executing: 0, confirmed: 0, failed: 0, rejected: 0 },
        byTimeframe: { last24h: 0, lastWeek: 0, lastMonth: 0 },
        byAssetKind: {},
        totalFeesPaid: '0',
        successRate: 0,
        lastTransfer: null
      };
    }
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

  private validateTransferId(transferId: string): void {
    if (!transferId) {
      throw new DfnsValidationError('Transfer ID is required');
    }
    if (!transferId.startsWith('tx-')) {
      throw new DfnsValidationError('Invalid transfer ID format. Expected format: tx-xxxxx-xxxxx-xxxxxxxxxxxxxxxx');
    }
  }

  private validateTransferRequest(request: DfnsTransferAssetRequest): void {
    if (!request.kind) {
      throw new DfnsValidationError('Asset kind is required');
    }

    if (!request.to) {
      throw new DfnsValidationError('Destination address is required');
    }

    // Validate based on asset kind
    switch ((request as any).kind) {
      case 'Native':
        this.validateNativeTransfer(request);
        break;
      case 'Erc20':
        this.validateErc20Transfer(request);
        break;
      case 'Erc721':
        this.validateErc721Transfer(request);
        break;
      case 'Asa':
        this.validateAsaTransfer(request);
        break;
      case 'Aip21':
        this.validateAip21Transfer(request);
        break;
      case 'Spl':
      case 'Spl2022':
        this.validateSplTransfer(request);
        break;
      default:
        throw new DfnsValidationError(`Unsupported asset kind: ${request.kind}`);
    }
  }

  private validateNativeTransfer(request: any): void {
    if (!request.amount) {
      throw new DfnsValidationError('Amount is required for native asset transfer');
    }
    if (BigInt(request.amount) <= 0) {
      throw new DfnsValidationError('Amount must be greater than 0');
    }
  }

  private validateErc20Transfer(request: any): void {
    if (!request.contract) {
      throw new DfnsValidationError('Contract address is required for ERC-20 transfer');
    }
    if (!request.amount) {
      throw new DfnsValidationError('Amount is required for ERC-20 transfer');
    }
    if (BigInt(request.amount) <= 0) {
      throw new DfnsValidationError('Amount must be greater than 0');
    }
  }

  private validateErc721Transfer(request: any): void {
    if (!request.contract) {
      throw new DfnsValidationError('Contract address is required for ERC-721 transfer');
    }
    if (!request.tokenId) {
      throw new DfnsValidationError('Token ID is required for ERC-721 transfer');
    }
  }

  private validateAsaTransfer(request: any): void {
    if (!request.assetId) {
      throw new DfnsValidationError('Asset ID is required for Algorand asset transfer');
    }
    if (!request.amount) {
      throw new DfnsValidationError('Amount is required for Algorand asset transfer');
    }
    if (BigInt(request.amount) <= 0) {
      throw new DfnsValidationError('Amount must be greater than 0');
    }
  }

  private validateAip21Transfer(request: any): void {
    if (!request.metadata) {
      throw new DfnsValidationError('Metadata address is required for Aptos asset transfer');
    }
    if (!request.amount) {
      throw new DfnsValidationError('Amount is required for Aptos asset transfer');
    }
    if (BigInt(request.amount) <= 0) {
      throw new DfnsValidationError('Amount must be greater than 0');
    }
  }

  private validateSplTransfer(request: any): void {
    if (!request.mint) {
      throw new DfnsValidationError('Mint address is required for Solana token transfer');
    }
    if (!request.amount) {
      throw new DfnsValidationError('Amount is required for Solana token transfer');
    }
    if (BigInt(request.amount) <= 0) {
      throw new DfnsValidationError('Amount must be greater than 0');
    }
  }

  // ===============================
  // SERVICE STATUS
  // ===============================

  /**
   * Test wallet transfers service connectivity
   * 
   * @param walletId - Test wallet ID (optional)
   * @returns Service status
   */
  async testTransfersService(walletId?: string) {
    try {
      const startTime = Date.now();
      
      // If wallet ID provided, test against it
      if (walletId) {
        await this.listTransferRequests(walletId, { limit: 1 });
      } else {
        console.log('⚠️ No test wallet ID provided for transfers service test');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        canReadTransfers: true,
        canCreateTransfers: false, // Requires User Action Signing
        message: 'Wallet transfers service is operational (read-only with current auth)'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        canReadTransfers: false,
        canCreateTransfers: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Wallet transfers service is not accessible'
      };
    }
  }
}

// ===============================
// GLOBAL SERVICE INSTANCE
// ===============================

let globalWalletTransfersService: DfnsWalletTransfersService | null = null;

/**
 * Get or create the global DFNS wallet transfers service instance
 */
export function getDfnsWalletTransfersService(client?: WorkingDfnsClient): DfnsWalletTransfersService {
  if (!globalWalletTransfersService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsWalletTransfersService', 'MISSING_CLIENT');
    }
    globalWalletTransfersService = new DfnsWalletTransfersService(client);
  }
  return globalWalletTransfersService;
}

/**
 * Reset the global wallet transfers service instance
 */
export function resetDfnsWalletTransfersService(): void {
  globalWalletTransfersService = null;
}