/**
 * DFNS Transaction Broadcasting Service
 * 
 * Comprehensive service for broadcasting transactions across all DFNS supported networks
 * Based on: https://docs.dfns.co/d/api-docs/wallets/broadcast-transaction
 * 
 * Supports all 12 network categories:
 * - EVM (Ethereum, Polygon, Base, Arbitrum, etc.)
 * - Bitcoin / Litecoin
 * - Solana
 * - Algorand
 * - Aptos
 * - Cardano
 * - Stellar
 * - Tezos
 * - TRON
 * - XRP Ledger
 * - Canton
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsBroadcastTransactionRequest,
  DfnsTransactionRequestResponse,
  DfnsListTransactionRequestsResponse,
  DfnsTransactionServiceOptions,
  DfnsTransactionPaginationOptions,
  DfnsTransactionBroadcastOptions,
  DfnsTransactionNetwork,
  DfnsNetworkCategory,
  DfnsNetworkDetectionResult,
  DfnsTransactionValidationResult,
  DfnsTransactionStatistics,
  // Specific network request types
  DfnsEvmTransactionRequest,
  DfnsEvmUserOperationsRequest,
  DfnsBitcoinTransactionRequest,
  DfnsSolanaTransactionRequest,
  DfnsAlgorandTransactionRequest,
  DfnsAptosTransactionRequest,
  DfnsCardanoTransactionRequest,
  DfnsStellarTransactionRequest,
  DfnsTezosTransactionRequest,
  DfnsTronTransactionRequest,
  DfnsXrpLedgerTransactionRequest,
  DfnsCantonTransactionRequest
} from '../../types/dfns/transactions';
import { DfnsError, DfnsValidationError, DfnsWalletError, DfnsAuthenticationError, DfnsRateLimitError } from '../../types/dfns/errors';
import { getDfnsDatabaseSyncService } from './databaseSyncService';

export class DfnsTransactionBroadcastService {
  private client: WorkingDfnsClient;
  private databaseSyncService = getDfnsDatabaseSyncService();

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // MAIN TRANSACTION BROADCASTING
  // ===============================

  /**
   * Broadcast transaction to blockchain
   * 
   * @param walletId - Wallet ID to broadcast from
   * @param request - Network-specific transaction request
   * @param options - Broadcasting options including User Action token
   * @returns Transaction request response
   * 
   * API: POST /wallets/{walletId}/transactions
   * Requires: Wallets:Transactions:Create permission + User Action Signing
   */
  async broadcastTransaction(
    walletId: string,
    request: DfnsBroadcastTransactionRequest,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      // Validate inputs
      this.validateWalletId(walletId);
      
      if (options.validateRequest !== false) {
        const validation = this.validateTransactionRequest(request);
        if (!validation.isValid) {
          throw new DfnsValidationError(`Transaction validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Transaction validation warnings:', validation.warnings);
        }
      }

      // Check for User Action token requirement
      if (!options.userActionToken) {
        console.warn('⚠️ Broadcasting transaction without User Action token - this will likely fail');
        console.log('💡 Create a WebAuthn credential or register a Key credential for User Action Signing');
      }

      // Add external ID if provided
      const requestWithExternalId = options.externalId 
        ? { ...request, externalId: options.externalId }
        : request;

      // Make API request
      const transaction = await this.client.makeRequest<DfnsTransactionRequestResponse>(
        'POST',
        `/wallets/${walletId}/transactions`,
        requestWithExternalId,
        options.userActionToken
      );

      const networkCategory = this.detectNetworkCategory(request);
      
      console.log(`✅ Transaction broadcasted: ${transaction.id} (${transaction.status})`);
      console.log(`🌐 Network: ${transaction.network} (${networkCategory}) | TX Hash: ${transaction.txHash || 'pending'}`);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncTransferRequest(transaction);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for transaction request:', syncError);
        }
      }

      return transaction;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      // Enhanced error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          throw new DfnsAuthenticationError(
            `Transaction broadcast failed: ${options.userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}. Check Wallets:Transactions:Create permission.`,
            {
              httpStatus: 403,
              walletId,
              transactionRequest: request,
              hasUserAction: !!options.userActionToken,
              requiredPermission: 'Wallets:Transactions:Create'
            }
          );
        }
        if (error.message.includes('400')) {
          throw new DfnsValidationError('Invalid transaction request', { walletId, request });
        }
        if (error.message.includes('402')) {
          throw new DfnsWalletError('Insufficient funds for transaction', { walletId, request, code: 'INSUFFICIENT_FUNDS' });
        }
        if (error.message.includes('429')) {
          throw new DfnsRateLimitError('Rate limit exceeded', undefined, { walletId });
        }
      }
      
      throw new DfnsWalletError(
        `Failed to broadcast transaction for wallet ${walletId}: ${error}`,
        { walletId, transactionRequest: request, code: 'TRANSACTION_BROADCAST_FAILED' }
      );
    }
  }

  // ===============================
  // NETWORK-SPECIFIC BROADCASTING METHODS
  // ===============================

  /**
   * Broadcast EVM transaction (Ethereum, Polygon, Base, etc.)
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex string or transaction JSON
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastEvmTransaction(
    walletId: string,
    transaction: string | object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsEvmTransactionRequest = {
      kind: 'Transaction',
      transaction: transaction as any,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast EVM User Operations (fee sponsored)
   * 
   * @param walletId - Wallet ID
   * @param userOperations - Array of user operations
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastEvmUserOperations(
    walletId: string,
    userOperations: any[],
    feeSponsorId: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsEvmUserOperationsRequest = {
      kind: 'UserOperations',
      userOperations,
      feeSponsorId,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Bitcoin PSBT
   * 
   * @param walletId - Wallet ID
   * @param psbt - Hex encoded PSBT
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastBitcoinTransaction(
    walletId: string,
    psbt: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsBitcoinTransactionRequest = {
      kind: 'Psbt',
      psbt,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Solana transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Hex encoded unsigned transaction
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastSolanaTransaction(
    walletId: string,
    transaction: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsSolanaTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Algorand transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Base64 encoded unsigned transaction
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastAlgorandTransaction(
    walletId: string,
    transaction: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsAlgorandTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Aptos transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Aptos transaction object
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastAptosTransaction(
    walletId: string,
    transaction: object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsAptosTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Cardano transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - CBOR hex encoded transaction
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastCardanoTransaction(
    walletId: string,
    transaction: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsCardanoTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Stellar transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Base64 encoded transaction envelope
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastStellarTransaction(
    walletId: string,
    transaction: string,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsStellarTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Tezos transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Tezos transaction object
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastTezosTransaction(
    walletId: string,
    transaction: object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsTezosTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast TRON transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - TRON transaction object
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastTronTransaction(
    walletId: string,
    transaction: object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsTronTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }
  /**
   * Broadcast XRP Ledger transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - XRP transaction object
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastXrpLedgerTransaction(
    walletId: string,
    transaction: object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsXrpLedgerTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  /**
   * Broadcast Canton transaction
   * 
   * @param walletId - Wallet ID
   * @param transaction - Canton transaction object
   * @param options - Broadcasting options
   * @returns Transaction response
   */
  async broadcastCantonTransaction(
    walletId: string,
    transaction: object,
    options: DfnsTransactionBroadcastOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    const request: DfnsCantonTransactionRequest = {
      kind: 'Transaction',
      transaction,
      externalId: options.externalId
    };

    return this.broadcastTransaction(walletId, request, options);
  }

  // ===============================
  // TRANSACTION REQUEST QUERIES
  // ===============================

  /**
   * Get transaction request by ID
   * 
   * @param walletId - Wallet ID
   * @param transactionId - Transaction request ID
   * @param options - Service options
   * @returns Transaction request details
   * 
   * API: GET /wallets/{walletId}/transactions/{transactionId}
   * Requires: Wallets:Transactions:Read permission
   */
  async getTransactionRequest(
    walletId: string,
    transactionId: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      this.validateWalletId(walletId);
      this.validateTransactionId(transactionId);

      const transaction = await this.client.makeRequest<DfnsTransactionRequestResponse>(
        'GET',
        `/wallets/${walletId}/transactions/${transactionId}`
      );

      console.log(`✅ Retrieved transaction request: ${transactionId} (${transaction.status})`);
      
      return transaction;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(
        `Failed to get transaction request ${transactionId} for wallet ${walletId}: ${error}`,
        { walletId, transactionId, code: 'TRANSACTION_GET_FAILED' }
      );
    }
  }

  /**
   * List transaction requests for wallet
   * 
   * @param walletId - Wallet ID
   * @param options - Pagination and filter options
   * @returns List of transaction requests
   * 
   * API: GET /wallets/{walletId}/transactions
   * Requires: Wallets:Transactions:Read permission
   */
  async listTransactionRequests(
    walletId: string,
    options: DfnsTransactionPaginationOptions & DfnsTransactionServiceOptions = {}
  ): Promise<DfnsListTransactionRequestsResponse> {
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
      const endpoint = queryString ? `/wallets/${walletId}/transactions?${queryString}` : `/wallets/${walletId}/transactions`;

      const response = await this.client.makeRequest<DfnsListTransactionRequestsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} transaction requests for wallet ${walletId}`);
      
      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(
        `Failed to list transaction requests for wallet ${walletId}: ${error}`,
        { walletId, code: 'TRANSACTION_LIST_FAILED' }
      );
    }
  }

  /**
   * Get all transaction requests (handles pagination automatically)
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns All transaction requests
   */
  async getAllTransactionRequests(
    walletId: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse[]> {
    try {
      const allTransactions: DfnsTransactionRequestResponse[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const response = await this.listTransactionRequests(walletId, {
          limit: 100,
          paginationToken: nextPageToken,
          ...options
        });

        allTransactions.push(...response.items);
        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      console.log(`✅ Retrieved all ${allTransactions.length} transaction requests for wallet ${walletId}`);
      return allTransactions;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get all transaction requests for wallet ${walletId}: ${error}`,
        { walletId, code: 'TRANSACTION_GET_ALL_FAILED' }
      );
    }
  }

  /**
   * Get pending transaction requests
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Pending transaction requests
   */
  async getPendingTransactions(
    walletId: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse[]> {
    try {
      const allTransactions = await this.getAllTransactionRequests(walletId, options);
      
      const pendingTransactions = allTransactions.filter(tx => 
        tx.status === 'Pending' || tx.status === 'Executing'
      );

      console.log(`✅ Found ${pendingTransactions.length} pending transactions for wallet ${walletId}`);
      
      return pendingTransactions;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get pending transactions for wallet ${walletId}: ${error}`,
        { walletId, code: 'PENDING_TRANSACTIONS_FAILED' }
      );
    }
  }

  /**
   * Get recent transaction requests
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent transactions
   * @param options - Service options
   * @returns Recent transaction requests
   */
  async getRecentTransactions(
    walletId: string,
    count: number = 10,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionRequestResponse[]> {
    try {
      const response = await this.listTransactionRequests(walletId, {
        limit: count,
        ...options
      });
      
      // Sort by dateRequested descending to get most recent first
      const sortedTransactions = response.items.sort((a, b) => 
        new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
      );

      console.log(`✅ Retrieved ${sortedTransactions.length} recent transactions for wallet ${walletId}`);
      
      return sortedTransactions.slice(0, count);
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get recent transactions for wallet ${walletId}: ${error}`,
        { walletId, count, code: 'RECENT_TRANSACTIONS_FAILED' }
      );
    }
  }

  // ===============================
  // TRANSACTION ANALYTICS
  // ===============================

  /**
   * Get transaction statistics for wallet
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Transaction statistics
   */
  async getTransactionStatistics(
    walletId: string,
    options: DfnsTransactionServiceOptions = {}
  ): Promise<DfnsTransactionStatistics> {
    try {
      const allTransactions = await this.getAllTransactionRequests(walletId, options);
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const statistics: DfnsTransactionStatistics = {
        total: allTransactions.length,
        byStatus: {
          Pending: allTransactions.filter(t => t.status === 'Pending').length,
          Executing: allTransactions.filter(t => t.status === 'Executing').length,
          Broadcasted: allTransactions.filter(t => t.status === 'Broadcasted').length,
          Confirmed: allTransactions.filter(t => t.status === 'Confirmed').length,
          Failed: allTransactions.filter(t => t.status === 'Failed').length,
          Rejected: allTransactions.filter(t => t.status === 'Rejected').length
        },
        byNetwork: {},
        byTimeframe: {
          last24h: allTransactions.filter(t => new Date(t.dateRequested) > oneDayAgo).length,
          lastWeek: allTransactions.filter(t => new Date(t.dateRequested) > oneWeekAgo).length,
          lastMonth: allTransactions.filter(t => new Date(t.dateRequested) > oneMonthAgo).length
        },
        totalFeesPaid: '0',
        successRate: 0,
        lastTransaction: allTransactions.length > 0 ? allTransactions[0].dateRequested : null
      };

      // Count by network
      for (const transaction of allTransactions) {
        const network = transaction.network;
        statistics.byNetwork[network] = (statistics.byNetwork[network] || 0) + 1;
      }

      // Calculate success rate
      const completedTransactions = statistics.byStatus.Confirmed + statistics.byStatus.Failed + statistics.byStatus.Rejected;
      if (completedTransactions > 0) {
        statistics.successRate = (statistics.byStatus.Confirmed / completedTransactions) * 100;
      }

      // Calculate total fees (sum all confirmed transactions with fee)
      const feesSum = allTransactions
        .filter(t => t.status === 'Confirmed' && t.fee)
        .reduce((sum, t) => sum + BigInt(t.fee || '0'), BigInt(0));
      statistics.totalFeesPaid = feesSum.toString();

      console.log(`📊 Transaction statistics for wallet ${walletId}:`, {
        total: statistics.total,
        successRate: statistics.successRate.toFixed(1) + '%',
        pendingCount: statistics.byStatus.Pending
      });

      return statistics;
    } catch (error) {
      console.warn(`Failed to get transaction statistics for wallet ${walletId}:`, error);
      return {
        total: 0,
        byStatus: { Pending: 0, Executing: 0, Broadcasted: 0, Confirmed: 0, Failed: 0, Rejected: 0 },
        byNetwork: {},
        byTimeframe: { last24h: 0, lastWeek: 0, lastMonth: 0 },
        totalFeesPaid: '0',
        successRate: 0,
        lastTransaction: null
      };
    }
  }

  // ===============================
  // NETWORK DETECTION & VALIDATION
  // ===============================

  /**
   * Detect network category from transaction request
   * 
   * @param request - Transaction request
   * @returns Network category
   */
  detectNetworkCategory(request: DfnsBroadcastTransactionRequest): DfnsNetworkCategory {
    if ('userOperations' in request) {
      return 'evm'; // EVM User Operations
    }

    switch (request.kind) {
      case 'Transaction':
        // Need to determine from transaction content
        if (typeof request.transaction === 'string') {
          if (request.transaction.startsWith('0x')) {
            return 'evm'; // Hex transaction likely EVM or Solana
          }
          return 'stellar'; // Base64 could be Stellar, Algorand, etc.
        }
        return 'evm'; // JSON transaction likely EVM
      case 'Psbt':
        return 'bitcoin';
      default:
        return 'evm'; // Default fallback
    }
  }

  /**
   * Detect possible networks for transaction request
   * 
   * @param request - Transaction request
   * @returns Network detection result
   */
  detectPossibleNetworks(request: DfnsBroadcastTransactionRequest): DfnsNetworkDetectionResult {
    const category = this.detectNetworkCategory(request);
    
    const networkMap: Record<DfnsNetworkCategory, DfnsTransactionNetwork[]> = {
      evm: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche', 'Bsc'],
      bitcoin: ['Bitcoin', 'Litecoin'],
      solana: ['Solana'],
      algorand: ['Algorand'],
      aptos: ['Aptos'],
      cardano: ['Cardano'],
      stellar: ['Stellar'],
      tezos: ['Tezos'],
      tron: ['Tron'],
      xrp: ['XrpLedger'],
      canton: ['Canton']
    };

    return {
      category,
      networks: networkMap[category] || [],
      isSupported: category in networkMap,
      requiresUserAction: true, // All transaction broadcasts require User Action Signing
      supportsFeeSponsor: category === 'evm' // Only EVM supports fee sponsorship
    };
  }

  /**
   * Validate transaction request
   * 
   * @param request - Transaction request to validate
   * @returns Validation result
   */
  validateTransactionRequest(request: DfnsBroadcastTransactionRequest): DfnsTransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!request.kind) {
      errors.push('Transaction kind is required');
    }

    // Validate based on transaction kind
    switch (request.kind) {
      case 'Transaction':
        if (!request.transaction) {
          errors.push('Transaction data is required');
        }
        break;
      case 'Psbt':
        if (!(request as any).psbt) {
          errors.push('PSBT data is required');
        }
        break;
      case 'UserOperations':
        const userOpsRequest = request as any;
        if (!userOpsRequest.userOperations || !Array.isArray(userOpsRequest.userOperations)) {
          errors.push('User operations array is required');
        }
        if (!userOpsRequest.feeSponsorId) {
          errors.push('Fee sponsor ID is required for user operations');
        }
        break;
    }

    const networkCategory = this.detectNetworkCategory(request);
    const detection = this.detectPossibleNetworks(request);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      networkCategory,
      estimatedNetwork: detection.networks[0] // First network as estimate
    };
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

  private validateTransactionId(transactionId: string): void {
    if (!transactionId) {
      throw new DfnsValidationError('Transaction ID is required');
    }
    if (!transactionId.startsWith('tx-')) {
      throw new DfnsValidationError('Invalid transaction ID format. Expected format: tx-xxxxx-xxxxx-xxxxxxxxxxxxxxxx');
    }
  }

  // ===============================
  // SERVICE STATUS
  // ===============================

  /**
   * Test transaction broadcast service connectivity
   * 
   * @param walletId - Test wallet ID (optional)
   * @returns Service status
   */
  async testTransactionService(walletId?: string) {
    try {
      const startTime = Date.now();
      
      // If wallet ID provided, test against it
      if (walletId) {
        await this.listTransactionRequests(walletId, { limit: 1 });
      } else {
        console.log('⚠️ No test wallet ID provided for transaction service test');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        canReadTransactions: true,
        canBroadcastTransactions: false, // Requires User Action Signing
        supportedNetworks: ['EVM', 'Bitcoin', 'Solana', 'Algorand', 'Aptos', 'Cardano', 'Stellar', 'Tezos', 'TRON', 'XRP Ledger', 'Canton'],
        message: 'Transaction broadcast service is operational (read-only with current auth)'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        canReadTransactions: false,
        canBroadcastTransactions: false,
        supportedNetworks: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Transaction broadcast service is not accessible'
      };
    }
  }

  /**
   * Get supported networks
   * 
   * @returns List of supported networks by category
   */
  getSupportedNetworks() {
    return {
      evm: {
        mainnet: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche', 'Bsc'],
        testnet: ['EthereumGoerli', 'EthereumSepolia', 'PolygonMumbai', 'ArbitrumGoerli', 'ArbitrumSepolia', 'OptimismGoerli', 'OptimismSepolia', 'BaseGoerli', 'BaseSepolia', 'AvalancheFuji', 'BscTestnet'],
        features: ['User Operations', 'Fee Sponsorship', 'Smart Contracts']
      },
      bitcoin: {
        mainnet: ['Bitcoin', 'Litecoin'],
        testnet: ['BitcoinTestnet3', 'LitecoinTestnet'],
        features: ['PSBT Signing']
      },
      solana: {
        mainnet: ['Solana'],
        testnet: ['SolanaDevnet'],
        features: ['Transaction Signing']
      },
      algorand: {
        mainnet: ['Algorand'],
        testnet: ['AlgorandTestnet'],
        features: ['Transaction Signing']
      },
      aptos: {
        mainnet: ['Aptos'],
        testnet: ['AptosTestnet'],
        features: ['Transaction Signing']
      },
      cardano: {
        mainnet: ['Cardano'],
        testnet: ['CardanoTestnet'],
        features: ['CBOR Transaction Signing']
      },
      stellar: {
        mainnet: ['Stellar'],
        testnet: ['StellarTestnet'],
        features: ['Transaction Envelope Signing']
      },
      tezos: {
        mainnet: ['Tezos'],
        testnet: ['TezosTestnet'],
        features: ['Transaction Signing']
      },
      tron: {
        mainnet: ['Tron'],
        testnet: ['TronTestnet'],
        features: ['Transaction Signing']
      },
      xrp: {
        mainnet: ['XrpLedger'],
        testnet: ['XrpLedgerTestnet'],
        features: ['Transaction Signing']
      },
      canton: {
        mainnet: ['Canton'],
        testnet: ['CantonTestnet'],
        features: ['Transaction Signing', 'Validator Support']
      }
    };
  }
}

// ===============================
// GLOBAL SERVICE INSTANCE
// ===============================

let globalTransactionBroadcastService: DfnsTransactionBroadcastService | null = null;

/**
 * Get or create the global DFNS transaction broadcast service instance
 */
export function getDfnsTransactionBroadcastService(client?: WorkingDfnsClient): DfnsTransactionBroadcastService {
  if (!globalTransactionBroadcastService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsTransactionBroadcastService', 'MISSING_CLIENT');
    }
    globalTransactionBroadcastService = new DfnsTransactionBroadcastService(client);
  }
  return globalTransactionBroadcastService;
}

/**
 * Reset the global transaction broadcast service instance
 */
export function resetDfnsTransactionBroadcastService(): void {
  globalTransactionBroadcastService = null;
}
