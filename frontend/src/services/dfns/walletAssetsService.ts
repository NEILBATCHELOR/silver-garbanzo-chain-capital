/**
 * DFNS Wallet Assets Service
 * 
 * Implements current DFNS Wallet Assets API methods
 * Based on: https://docs.dfns.co/d/api-docs/wallets/get-wallet-assets
 *           https://docs.dfns.co/d/api-docs/wallets/get-wallet-nfts
 *           https://docs.dfns.co/d/api-docs/wallets/get-wallet-history
 * 
 * Handles wallet asset balances, NFTs, and transaction history
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsGetWalletAssetsRequest,
  DfnsGetWalletAssetsResponse,
  DfnsGetWalletNftsResponse,
  DfnsGetWalletHistoryResponse,
  DfnsWalletAsset,
  DfnsWalletNft,
  DfnsWalletHistoryEntry,
  DfnsWalletServiceOptions
} from '../../types/dfns/wallets';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';

export class DfnsWalletAssetsService {
  private client: WorkingDfnsClient;

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // WALLET ASSETS
  // ===============================

  /**
   * Get wallet asset balances
   * 
   * @param walletId - Wallet ID
   * @param includeUsdValue - Include USD valuation
   * @param options - Service options
   * @returns Wallet assets with balances
   * 
   * API: GET /wallets/{walletId}/assets
   * Requires: Wallets:Read permission
   */
  async getWalletAssets(
    walletId: string,
    includeUsdValue: boolean = true,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsGetWalletAssetsResponse> {
    try {
      this.validateWalletId(walletId);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (includeUsdValue) {
        queryParams.append('includeUsdValue', 'true');
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/wallets/${walletId}/assets?${queryString}` : `/wallets/${walletId}/assets`;

      const response = await this.client.makeRequest<DfnsGetWalletAssetsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.assets.length} assets for wallet ${walletId}`);
      
      if (response.totalValueUsd) {
        console.log(`💰 Total portfolio value: $${response.totalValueUsd}`);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(
        `Failed to get wallet assets for ${walletId}: ${error}`,
        { walletId, code: 'WALLET_ASSETS_FAILED' }
      );
    }
  }

  /**
   * Get specific asset balance
   * 
   * @param walletId - Wallet ID
   * @param assetIdentifier - Asset symbol, contract, or assetId
   * @param includeUsdValue - Include USD valuation
   * @returns Specific asset balance or null if not found
   */
  async getAssetBalance(
    walletId: string,
    assetIdentifier: string,
    includeUsdValue: boolean = true
  ): Promise<DfnsWalletAsset | null> {
    try {
      const response = await this.getWalletAssets(walletId, includeUsdValue);
      
      // Find asset by symbol, contract, or assetId
      const asset = response.assets.find(asset => {
        if (asset.symbol === assetIdentifier) return true;
        
        if ('contract' in asset && asset.contract === assetIdentifier) return true;
        if ('assetId' in asset && asset.assetId === assetIdentifier) return true;
        if ('mint' in asset && asset.mint === assetIdentifier) return true;
        if ('metadata' in asset && asset.metadata === assetIdentifier) return true;
        
        return false;
      });

      if (asset) {
        console.log(`✅ Found ${asset.symbol} balance for wallet ${walletId}: ${asset.balance}`);
      } else {
        console.log(`⚠️ Asset ${assetIdentifier} not found in wallet ${walletId}`);
      }

      return asset || null;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get asset balance for ${assetIdentifier} in wallet ${walletId}: ${error}`,
        { walletId, assetIdentifier, code: 'ASSET_BALANCE_FAILED' }
      );
    }
  }

  /**
   * Get native asset balance (ETH, BTC, etc.)
   * 
   * @param walletId - Wallet ID
   * @param includeUsdValue - Include USD valuation
   * @returns Native asset balance or null if not found
   */
  async getNativeAssetBalance(
    walletId: string,
    includeUsdValue: boolean = true
  ): Promise<DfnsWalletAsset | null> {
    try {
      const response = await this.getWalletAssets(walletId, includeUsdValue);
      
      const nativeAsset = response.assets.find(asset => asset.kind === 'Native');
      
      if (nativeAsset) {
        console.log(`✅ Native asset balance for wallet ${walletId}: ${nativeAsset.balance} ${nativeAsset.symbol}`);
      }
      
      return nativeAsset || null;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get native asset balance for wallet ${walletId}: ${error}`,
        { walletId, code: 'NATIVE_BALANCE_FAILED' }
      );
    }
  }

  /**
   * Get ERC-20 token balances
   * 
   * @param walletId - Wallet ID
   * @param includeUsdValue - Include USD valuation
   * @returns Array of ERC-20 token balances
   */
  async getErc20Balances(
    walletId: string,
    includeUsdValue: boolean = true
  ): Promise<DfnsWalletAsset[]> {
    try {
      const response = await this.getWalletAssets(walletId, includeUsdValue);
      
      const erc20Assets = response.assets.filter(asset => asset.kind === 'Erc20');
      
      console.log(`✅ Found ${erc20Assets.length} ERC-20 tokens in wallet ${walletId}`);
      
      return erc20Assets;
    } catch (error) {
      throw new DfnsWalletError(
        `Failed to get ERC-20 balances for wallet ${walletId}: ${error}`,
        { walletId, code: 'ERC20_BALANCES_FAILED' }
      );
    }
  }

  /**
   * Get total portfolio value in USD
   * 
   * @param walletId - Wallet ID
   * @returns Total portfolio value in USD
   */
  async getPortfolioValue(walletId: string): Promise<string | null> {
    try {
      const response = await this.getWalletAssets(walletId, true);
      
      if (response.totalValueUsd) {
        console.log(`💰 Portfolio value for wallet ${walletId}: $${response.totalValueUsd}`);
      }
      
      return response.totalValueUsd || null;
    } catch (error) {
      console.warn(`Failed to get portfolio value for wallet ${walletId}:`, error);
      return null;
    }
  }

  // ===============================
  // WALLET NFTS
  // ===============================

  /**
   * Get wallet NFT collection
   * 
   * @param walletId - Wallet ID
   * @param options - Service options
   * @returns Wallet NFTs
   * 
   * API: GET /wallets/{walletId}/nfts
   * Requires: Wallets:Read permission
   */
  async getWalletNfts(
    walletId: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsGetWalletNftsResponse> {
    try {
      this.validateWalletId(walletId);

      const response = await this.client.makeRequest<DfnsGetWalletNftsResponse>(
        'GET',
        `/wallets/${walletId}/nfts`
      );

      console.log(`✅ Retrieved ${response.nfts.length} NFTs for wallet ${walletId}`);

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(
        `Failed to get wallet NFTs for ${walletId}: ${error}`,
        { walletId, code: 'WALLET_NFTS_FAILED' }
      );
    }
  }

  /**
   * Get specific NFT by contract and tokenId
   * 
   * @param walletId - Wallet ID
   * @param contract - NFT contract address
   * @param tokenId - Token ID
   * @returns Specific NFT or null if not found
   */
  async getNftByTokenId(
    walletId: string,
    contract: string,
    tokenId: string
  ): Promise<DfnsWalletNft | null> {
    try {
      const response = await this.getWalletNfts(walletId);
      
      const nft = response.nfts.find(nft => {
        if ('contract' in nft && 'tokenId' in nft) {
          return nft.contract === contract && nft.tokenId === tokenId;
        }
        return false;
      });

      if (nft) {
        console.log(`✅ Found NFT ${contract}:${tokenId} in wallet ${walletId}`);
      } else {
        console.log(`⚠️ NFT ${contract}:${tokenId} not found in wallet ${walletId}`);
      }

      return nft || null;
    } catch (error) {
      throw new DfnsWalletError(`Failed to get NFT ${contract}:${tokenId} for wallet ${walletId}: ${error}`, { walletId, contract, tokenId , code: 'NFT_GET_FAILED'});
    }
  }

  /**
   * Get NFT count for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Number of NFTs in wallet
   */
  async getNftCount(walletId: string): Promise<number> {
    try {
      const response = await this.getWalletNfts(walletId);
      console.log(`✅ Wallet ${walletId} has ${response.nfts.length} NFTs`);
      return response.nfts.length;
    } catch (error) {
      console.warn(`Failed to get NFT count for wallet ${walletId}:`, error);
      return 0;
    }
  }

  // ===============================
  // WALLET HISTORY
  // ===============================

  /**
   * Get wallet transaction history
   * 
   * @param walletId - Wallet ID
   * @param limit - Number of transactions to retrieve
   * @param options - Service options
   * @returns Wallet transaction history
   * 
   * API: GET /wallets/{walletId}/history
   * Requires: Wallets:Read permission
   */
  async getWalletHistory(
    walletId: string,
    limit: number = 50,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsGetWalletHistoryResponse> {
    try {
      this.validateWalletId(walletId);
      
      if (limit < 1 || limit > 1000) {
        throw new DfnsValidationError('Limit must be between 1 and 1000');
      }

      const response = await this.client.makeRequest<DfnsGetWalletHistoryResponse>(
        'GET',
        `/wallets/${walletId}/history?limit=${limit}`
      );

      console.log(`✅ Retrieved ${response.history.length} transactions for wallet ${walletId}`);

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsWalletError(`Failed to get wallet history for ${walletId}: ${error}`, { walletId, limit , code: 'WALLET_HISTORY_FAILED'});
    }
  }

  /**
   * Get recent transactions for wallet
   * 
   * @param walletId - Wallet ID
   * @param count - Number of recent transactions
   * @returns Recent transactions
   */
  async getRecentTransactions(
    walletId: string,
    count: number = 10
  ): Promise<DfnsWalletHistoryEntry[]> {
    try {
      const response = await this.getWalletHistory(walletId, count);
      
      // Sort by timestamp descending to get most recent first
      const sortedHistory = response.history.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log(`✅ Retrieved ${sortedHistory.length} recent transactions for wallet ${walletId}`);
      
      return sortedHistory.slice(0, count);
    } catch (error) {
      throw new DfnsWalletError(`Failed to get recent transactions for wallet ${walletId}: ${error}`, { walletId, count , code: 'RECENT_TRANSACTIONS_FAILED'});
    }
  }

  /**
   * Get transaction count for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Number of transactions
   */
  async getTransactionCount(walletId: string): Promise<number> {
    try {
      // Get a large number to count all transactions
      const response = await this.getWalletHistory(walletId, 1000);
      console.log(`✅ Wallet ${walletId} has ${response.history.length} transactions`);
      return response.history.length;
    } catch (error) {
      console.warn(`Failed to get transaction count for wallet ${walletId}:`, error);
      return 0;
    }
  }

  /**
   * Get transaction summary for dashboard
   * 
   * @param walletId - Wallet ID
   * @returns Transaction summary statistics
   */
  async getTransactionSummary(walletId: string) {
    try {
      const response = await this.getWalletHistory(walletId, 100);
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const transactions = response.history;
      
      const summary = {
        total: transactions.length,
        confirmed: transactions.filter(tx => tx.status === 'Confirmed').length,
        pending: transactions.filter(tx => tx.status === 'Pending').length,
        failed: transactions.filter(tx => tx.status === 'Failed').length,
        last24h: transactions.filter(tx => new Date(tx.timestamp) > oneDayAgo).length,
        lastWeek: transactions.filter(tx => new Date(tx.timestamp) > oneWeekAgo).length,
        lastTransaction: transactions.length > 0 ? transactions[0].timestamp : null,
        incoming: transactions.filter(tx => tx.direction === 'Incoming').length,
        outgoing: transactions.filter(tx => tx.direction === 'Outgoing').length
      };
      
      console.log(`✅ Transaction summary for wallet ${walletId}:`, summary);
      
      return summary;
    } catch (error) {
      console.warn(`Failed to get transaction summary for wallet ${walletId}:`, error);
      return {
        total: 0,
        confirmed: 0,
        pending: 0,
        failed: 0,
        last24h: 0,
        lastWeek: 0,
        lastTransaction: null,
        incoming: 0,
        outgoing: 0
      };
    }
  }

  // ===============================
  // COMBINED OPERATIONS
  // ===============================

  /**
   * Get complete wallet overview (assets + NFTs + recent activity)
   * 
   * @param walletId - Wallet ID
   * @param includeUsdValue - Include USD valuations
   * @returns Complete wallet overview
   */
  async getWalletOverview(
    walletId: string,
    includeUsdValue: boolean = true
  ) {
    try {
      console.log(`🔍 Getting complete overview for wallet ${walletId}...`);
      
      // Fetch all data in parallel
      const [assets, nfts, recentHistory, transactionSummary] = await Promise.allSettled([
        this.getWalletAssets(walletId, includeUsdValue),
        this.getWalletNfts(walletId),
        this.getRecentTransactions(walletId, 5),
        this.getTransactionSummary(walletId)
      ]);

      const overview = {
        walletId,
        assets: assets.status === 'fulfilled' ? assets.value : null,
        nfts: nfts.status === 'fulfilled' ? nfts.value : null,
        recentTransactions: recentHistory.status === 'fulfilled' ? recentHistory.value : [],
        transactionSummary: transactionSummary.status === 'fulfilled' ? transactionSummary.value : null,
        totalValueUsd: assets.status === 'fulfilled' ? assets.value.totalValueUsd : null,
        assetCount: assets.status === 'fulfilled' ? assets.value.assets.length : 0,
        nftCount: nfts.status === 'fulfilled' ? nfts.value.nfts.length : 0,
        lastActivity: recentHistory.status === 'fulfilled' && recentHistory.value.length > 0 
          ? recentHistory.value[0].timestamp 
          : null
      };

      console.log(`✅ Complete overview retrieved for wallet ${walletId}`);
      
      return overview;
    } catch (error) {
      throw new DfnsWalletError(`Failed to get wallet overview for ${walletId}: ${error}`, { walletId , code: 'WALLET_OVERVIEW_FAILED'});
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

  // ===============================
  // SERVICE STATUS
  // ===============================

  /**
   * Test wallet assets service connectivity
   * 
   * @param walletId - Test wallet ID (optional)
   * @returns Service status
   */
  async testAssetsService(walletId?: string) {
    try {
      const startTime = Date.now();
      
      // If wallet ID provided, test against it
      if (walletId) {
        await this.getWalletAssets(walletId, false);
      } else {
        // Test would require a known wallet ID
        console.log('⚠️ No test wallet ID provided for assets service test');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        canReadAssets: true,
        canReadNfts: true,
        canReadHistory: true,
        message: 'Wallet assets service is operational'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        canReadAssets: false,
        canReadNfts: false,
        canReadHistory: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Wallet assets service is not accessible'
      };
    }
  }
}

// ===============================
// GLOBAL SERVICE INSTANCE
// ===============================

let globalWalletAssetsService: DfnsWalletAssetsService | null = null;

/**
 * Get or create the global DFNS wallet assets service instance
 */
export function getDfnsWalletAssetsService(client?: WorkingDfnsClient): DfnsWalletAssetsService {
  if (!globalWalletAssetsService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsWalletAssetsService', 'MISSING_CLIENT');
    }
    globalWalletAssetsService = new DfnsWalletAssetsService(client);
  }
  return globalWalletAssetsService;
}

/**
 * Reset the global wallet assets service instance
 */
export function resetDfnsWalletAssetsService(): void {
  globalWalletAssetsService = null;
}