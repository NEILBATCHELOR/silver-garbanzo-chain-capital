/**
 * DFNS Wallet Tags Service
 * 
 * Implements current DFNS Wallet Tags API methods
 * Based on: https://docs.dfns.co/d/api-docs/wallets/add-wallet-tags
 *           https://docs.dfns.co/d/api-docs/wallets/delete-wallet-tags
 * 
 * Handles wallet tagging operations
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsAddWalletTagsRequest,
  DfnsAddWalletTagsResponse,
  DfnsDeleteWalletTagsRequest,
  DfnsDeleteWalletTagsResponse,
  DfnsWalletServiceOptions
} from '../../types/dfns/wallets';
import { DfnsError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';
import { getDfnsDatabaseSyncService } from './databaseSyncService';

export class DfnsWalletTagsService {
  private client: WorkingDfnsClient;
  private databaseSyncService = getDfnsDatabaseSyncService();

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // WALLET TAGS OPERATIONS
  // ===============================

  /**
   * Add tags to wallet
   * 
   * @param walletId - Wallet ID
   * @param request - Tags to add
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet with new tags
   * 
   * API: POST /wallets/{walletId}/tags
   * Requires: Wallets:Tags:Add permission + User Action Signing
   */
  async addWalletTags(
    walletId: string,
    request: DfnsAddWalletTagsRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsAddWalletTagsResponse> {
    try {
      // Validate inputs
      this.validateWalletId(walletId);
      this.validateAddTagsRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Adding wallet tags without User Action token - this will likely fail');
        console.log('💡 Create a WebAuthn credential or register a Key credential for User Action Signing');
      }

      // Make API request
      const wallet = await this.client.makeRequest<DfnsAddWalletTagsResponse>(
        'POST',
        `/wallets/${walletId}/tags`,
        request,
        userActionToken
      );

      console.log(`✅ Added ${request.tags.length} tags to wallet ${walletId}:`, request.tags);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for tagged wallet:', syncError);
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
          throw new DfnsWalletError(`Add wallet tags failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}. Check Wallets:Tags:Add permission.`, { 
              walletId, 
              tags: request.tags,
              hasUserAction: !!userActionToken,
              requiredPermission: 'Wallets:Tags:Add'
            , code: 'WALLET_TAGS_ADD_UNAUTHORIZED'});
        }
        if (error.message.includes('400')) {
          throw new DfnsValidationError('Invalid tags request', { walletId, request });
        }
      }
      
      throw new DfnsWalletError(`Failed to add tags to wallet ${walletId}: ${error}`, { walletId, tags: request.tags , code: 'WALLET_TAGS_ADD_FAILED'});
    }
  }

  /**
   * Remove tags from wallet
   * 
   * @param walletId - Wallet ID
   * @param request - Tags to remove
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet without removed tags
   * 
   * API: DELETE /wallets/{walletId}/tags
   * Requires: Wallets:Tags:Delete permission + User Action Signing
   */
  async deleteWalletTags(
    walletId: string,
    request: DfnsDeleteWalletTagsRequest,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsDeleteWalletTagsResponse> {
    try {
      // Validate inputs
      this.validateWalletId(walletId);
      this.validateDeleteTagsRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Deleting wallet tags without User Action token - this will likely fail');
      }

      // Make API request
      const wallet = await this.client.makeRequest<DfnsDeleteWalletTagsResponse>(
        'DELETE',
        `/wallets/${walletId}/tags`,
        request,
        userActionToken
      );

      console.log(`✅ Removed ${request.tags.length} tags from wallet ${walletId}:`, request.tags);
      
      // Sync to database if requested
      if (options.syncToDatabase) {
        try {
          await this.databaseSyncService.syncWallet(wallet);
        } catch (syncError) {
          console.warn('⚠️ Database sync failed for untagged wallet:', syncError);
        }
      }

      return wallet;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('403')) {
        throw new DfnsWalletError(`Delete wallet tags failed: ${userActionToken ? 'Insufficient permissions or User Action Signing failed' : 'User Action Signing required'}. Check Wallets:Tags:Delete permission.`, { 
            walletId, 
            tags: request.tags,
            hasUserAction: !!userActionToken,
            requiredPermission: 'Wallets:Tags:Delete'
          , code: 'WALLET_TAGS_DELETE_UNAUTHORIZED'});
      }
      
      throw new DfnsWalletError(`Failed to remove tags from wallet ${walletId}: ${error}`, { walletId, tags: request.tags , code: 'WALLET_TAGS_DELETE_FAILED'});
    }
  }

  /**
   * Replace all wallet tags
   * 
   * @param walletId - Wallet ID
   * @param newTags - New tags to set
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet with new tags
   */
  async replaceWalletTags(
    walletId: string,
    newTags: string[],
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsAddWalletTagsResponse> {
    try {
      // Get current wallet to see existing tags
      const currentWallet = await this.client.makeRequest<{ tags?: string[] }>(
        'GET',
        `/wallets/${walletId}`
      );

      const currentTags = currentWallet.tags || [];
      
      // Remove existing tags if any
      if (currentTags.length > 0) {
        await this.deleteWalletTags(
          walletId,
          { tags: currentTags },
          userActionToken,
          options
        );
      }

      // Add new tags if any
      if (newTags.length > 0) {
        return await this.addWalletTags(
          walletId,
          { tags: newTags },
          userActionToken,
          options
        );
      }

      // If no new tags, return current state
      const wallet = await this.client.makeRequest<DfnsAddWalletTagsResponse>(
        'GET',
        `/wallets/${walletId}`
      );

      console.log(`✅ Replaced wallet ${walletId} tags: ${currentTags.join(', ')} → ${newTags.join(', ')}`);
      
      return wallet;
    } catch (error) {
      throw new DfnsWalletError(`Failed to replace tags for wallet ${walletId}: ${error}`, { walletId, newTags , code: 'WALLET_TAGS_REPLACE_FAILED'});
    }
  }

  /**
   * Add single tag to wallet
   * 
   * @param walletId - Wallet ID
   * @param tag - Tag to add
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet
   */
  async addSingleTag(
    walletId: string,
    tag: string,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsAddWalletTagsResponse> {
    return this.addWalletTags(walletId, { tags: [tag] }, userActionToken, options);
  }

  /**
   * Remove single tag from wallet
   * 
   * @param walletId - Wallet ID
   * @param tag - Tag to remove
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet
   */
  async removeSingleTag(
    walletId: string,
    tag: string,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsDeleteWalletTagsResponse> {
    return this.deleteWalletTags(walletId, { tags: [tag] }, userActionToken, options);
  }

  // ===============================
  // TAG MANAGEMENT UTILITIES
  // ===============================

  /**
   * Check if wallet has specific tag
   * 
   * @param walletId - Wallet ID
   * @param tag - Tag to check
   * @returns True if wallet has the tag
   */
  async hasTag(walletId: string, tag: string): Promise<boolean> {
    try {
      const wallet = await this.client.makeRequest<{ tags?: string[] }>(
        'GET',
        `/wallets/${walletId}`
      );

      const tags = wallet.tags || [];
      return tags.includes(tag);
    } catch (error) {
      console.warn(`Failed to check tag ${tag} for wallet ${walletId}:`, error);
      return false;
    }
  }

  /**
   * Get all tags for wallet
   * 
   * @param walletId - Wallet ID
   * @returns Array of wallet tags
   */
  async getWalletTags(walletId: string): Promise<string[]> {
    try {
      const wallet = await this.client.makeRequest<{ tags?: string[] }>(
        'GET',
        `/wallets/${walletId}`
      );

      return wallet.tags || [];
    } catch (error) {
      console.warn(`Failed to get tags for wallet ${walletId}:`, error);
      return [];
    }
  }

  /**
   * Toggle tag on wallet (add if not present, remove if present)
   * 
   * @param walletId - Wallet ID
   * @param tag - Tag to toggle
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet and action taken
   */
  async toggleTag(
    walletId: string,
    tag: string,
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<{ wallet: DfnsAddWalletTagsResponse; action: 'added' | 'removed' }> {
    try {
      const hasTagAlready = await this.hasTag(walletId, tag);
      
      if (hasTagAlready) {
        const wallet = await this.removeSingleTag(walletId, tag, userActionToken, options);
        console.log(`✅ Removed tag "${tag}" from wallet ${walletId}`);
        return { wallet, action: 'removed' };
      } else {
        const wallet = await this.addSingleTag(walletId, tag, userActionToken, options);
        console.log(`✅ Added tag "${tag}" to wallet ${walletId}`);
        return { wallet, action: 'added' };
      }
    } catch (error) {
      throw new DfnsWalletError(`Failed to toggle tag ${tag} for wallet ${walletId}: ${error}`, { walletId, tag , code: 'WALLET_TAG_TOGGLE_FAILED'});
    }
  }

  /**
   * Add multiple tags with validation to avoid duplicates
   * 
   * @param walletId - Wallet ID
   * @param tags - Tags to add
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated wallet
   */
  async addTagsIfNotPresent(
    walletId: string,
    tags: string[],
    userActionToken?: string,
    options: DfnsWalletServiceOptions = {}
  ): Promise<DfnsAddWalletTagsResponse> {
    try {
      const currentTags = await this.getWalletTags(walletId);
      const newTags = tags.filter(tag => !currentTags.includes(tag));
      
      if (newTags.length === 0) {
        console.log(`ℹ️ All tags already present on wallet ${walletId}`);
        // Return current wallet state
        return await this.client.makeRequest<DfnsAddWalletTagsResponse>(
          'GET',
          `/wallets/${walletId}`
        );
      }

      console.log(`🏷️ Adding ${newTags.length} new tags to wallet ${walletId}:`, newTags);
      return await this.addWalletTags(walletId, { tags: newTags }, userActionToken, options);
    } catch (error) {
      throw new DfnsWalletError(`Failed to add unique tags to wallet ${walletId}: ${error}`, { walletId, tags , code: 'WALLET_TAGS_ADD_UNIQUE_FAILED'});
    }
  }

  /**
   * Get tag statistics for analytics
   * 
   * @param walletIds - Array of wallet IDs to analyze
   * @returns Tag usage statistics
   */
  async getTagStatistics(walletIds: string[]) {
    try {
      const tagCounts: Record<string, number> = {};
      const walletTagMap: Record<string, string[]> = {};
      
      // Collect tags from all wallets
      for (const walletId of walletIds) {
        try {
          const tags = await this.getWalletTags(walletId);
          walletTagMap[walletId] = tags;
          
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        } catch (error) {
          console.warn(`Failed to get tags for wallet ${walletId}:`, error);
        }
      }

      const totalTags = Object.keys(tagCounts).length;
      const totalUsages = Object.values(tagCounts).reduce((sum, count) => sum + count, 0);
      const mostUsedTag = Object.entries(tagCounts).sort(([,a], [,b]) => b - a)[0];
      
      const statistics = {
        totalUniqueTagsused: totalTags,
        totalTagUsages: totalUsages,
        averageTagsPerWallet: walletIds.length > 0 ? totalUsages / walletIds.length : 0,
        mostUsedTag: mostUsedTag ? { tag: mostUsedTag[0], count: mostUsedTag[1] } : null,
        tagCounts,
        walletTagMap
      };

      console.log(`📊 Tag statistics for ${walletIds.length} wallets:`, {
        totalUniqueTags: statistics.totalUniqueTagsused,
        totalUsages: statistics.totalTagUsages,
        avgPerWallet: statistics.averageTagsPerWallet.toFixed(1)
      });

      return statistics;
    } catch (error) {
      console.warn('Failed to get tag statistics:', error);
      return {
        totalUniqueTagsused: 0,
        totalTagUsages: 0,
        averageTagsPerWallet: 0,
        mostUsedTag: null,
        tagCounts: {},
        walletTagMap: {}
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

  private validateAddTagsRequest(request: DfnsAddWalletTagsRequest): void {
    if (!request.tags || !Array.isArray(request.tags)) {
      throw new DfnsValidationError('Tags array is required');
    }
    
    if (request.tags.length === 0) {
      throw new DfnsValidationError('At least one tag is required');
    }
    
    if (request.tags.length > 10) {
      throw new DfnsValidationError('Maximum 10 tags can be added at once');
    }
    
    // Validate individual tags
    for (const tag of request.tags) {
      this.validateTag(tag);
    }

    // Check for duplicates
    const uniqueTags = new Set(request.tags);
    if (uniqueTags.size !== request.tags.length) {
      throw new DfnsValidationError('Duplicate tags are not allowed');
    }
  }

  private validateDeleteTagsRequest(request: DfnsDeleteWalletTagsRequest): void {
    if (!request.tags || !Array.isArray(request.tags)) {
      throw new DfnsValidationError('Tags array is required');
    }
    
    if (request.tags.length === 0) {
      throw new DfnsValidationError('At least one tag is required');
    }
    
    // Validate individual tags
    for (const tag of request.tags) {
      this.validateTag(tag);
    }
  }

  private validateTag(tag: string): void {
    if (!tag || typeof tag !== 'string') {
      throw new DfnsValidationError('Tag must be a non-empty string');
    }
    
    if (tag.length > 50) {
      throw new DfnsValidationError('Tag must be 50 characters or less');
    }
    
    if (tag.trim() !== tag) {
      throw new DfnsValidationError('Tag cannot have leading or trailing whitespace');
    }
    
    if (tag.includes(',')) {
      throw new DfnsValidationError('Tag cannot contain commas');
    }
  }

  // ===============================
  // SERVICE STATUS
  // ===============================

  /**
   * Test wallet tags service connectivity
   * 
   * @param walletId - Test wallet ID (optional)
   * @returns Service status
   */
  async testTagsService(walletId?: string) {
    try {
      const startTime = Date.now();
      
      // If wallet ID provided, test against it
      if (walletId) {
        await this.getWalletTags(walletId);
      } else {
        console.log('⚠️ No test wallet ID provided for tags service test');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        canReadTags: true,
        canAddTags: false, // Requires User Action Signing
        canDeleteTags: false, // Requires User Action Signing
        message: 'Wallet tags service is operational (read-only with current auth)'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        canReadTags: false,
        canAddTags: false,
        canDeleteTags: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Wallet tags service is not accessible'
      };
    }
  }
}

// ===============================
// GLOBAL SERVICE INSTANCE
// ===============================

let globalWalletTagsService: DfnsWalletTagsService | null = null;

/**
 * Get or create the global DFNS wallet tags service instance
 */
export function getDfnsWalletTagsService(client?: WorkingDfnsClient): DfnsWalletTagsService {
  if (!globalWalletTagsService) {
    if (!client) {
      throw new DfnsError('WorkingDfnsClient is required to create DfnsWalletTagsService', 'MISSING_CLIENT');
    }
    globalWalletTagsService = new DfnsWalletTagsService(client);
  }
  return globalWalletTagsService;
}

/**
 * Reset the global wallet tags service instance
 */
export function resetDfnsWalletTagsService(): void {
  globalWalletTagsService = null;
}