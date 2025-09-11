/**
 * DFNS Fee Sponsor Service
 * 
 * Implements current DFNS Fee Sponsor API methods
 * Based on: https://docs.dfns.co/d/api-docs/fee-sponsors/
 * 
 * Fee Sponsors enable gasless transactions by allowing designated wallets 
 * to sponsor gas fees for other wallets across supported networks.
 * 
 * Required permissions:
 * - FeeSponsors:Create (for creating fee sponsors)
 * - FeeSponsors:Read (for listing and retrieving fee sponsors)
 * - FeeSponsors:Update (for activating/deactivating fee sponsors)
 * - FeeSponsors:Delete (for deleting fee sponsors)
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsFeeSponsor,
  DfnsSponsoredFee,
  DfnsCreateFeeSponsorRequest,
  DfnsCreateFeeSponsorResponse,
  DfnsGetFeeSponsorResponse,
  DfnsListFeeSponsorsRequest,
  DfnsListFeeSponsorsResponse,
  DfnsListSponsoredFeesRequest,
  DfnsListSponsoredFeesResponse,
  DfnsActivateFeeSponsorResponse,
  DfnsDeactivateFeeSponsorResponse,
  DfnsDeleteFeeSponsorResponse,
  DfnsFeeSponsorServiceOptions,
  DfnsBatchFeeSponsorOptions,
  DfnsBatchFeeSponsorResult,
  DfnsFeeSponsorSummary,
  DfnsSponsoredFeeSummary,
  DfnsFeeSponsorErrorReason,
  DfnsFeeSponsorSupportedNetwork
} from '../../types/dfns/feeSponsors';
import {
  isFeeSponsorSupportedNetwork,
  isValidFeeSponsorId,
  isValidSponsoredFeeId
} from '../../types/dfns/feeSponsors';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsValidationError, DfnsWalletError } from '../../types/dfns/errors';

export class DfnsFeeSponsorService {
  private client: WorkingDfnsClient;

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ===============================
  // FEE SPONSOR MANAGEMENT
  // ===============================

  /**
   * Create a new fee sponsor
   * 
   * @param request - Fee sponsor creation request
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Created fee sponsor
   * 
   * API: POST /fee-sponsors
   * Requires: FeeSponsors:Create permission
   */
  async createFeeSponsor(
    request: DfnsCreateFeeSponsorRequest,
    userActionToken?: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateCreateRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Creating fee sponsor without User Action token - this will likely fail with 403');
      }

      const response = await this.client.makeRequest<DfnsFeeSponsor>(
        'POST',
        '/fee-sponsors',
        request,
        userActionToken
      );

      console.log(`✅ Created fee sponsor ${response.id} for wallet ${request.walletId} on ${response.network}`);

      // Auto-activate if requested
      if (options.autoActivate && response.status !== 'Active') {
        console.log(`🔄 Auto-activating fee sponsor ${response.id}...`);
        return await this.activateFeeSponsor(response.id, userActionToken, options);
      }

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to create fee sponsor for wallet ${request.walletId}: ${error}`,
        'FEE_SPONSOR_CREATE_FAILED',
        { walletId: request.walletId }
      );
    }
  }

  /**
   * Get fee sponsor by ID
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns Fee sponsor details
   * 
   * API: GET /fee-sponsors/{feeSponsorId}
   * Requires: FeeSponsors:Read permission
   */
  async getFeeSponsor(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      const response = await this.client.makeRequest<DfnsFeeSponsor>(
        'GET',
        `/fee-sponsors/${feeSponsorId}`
      );

      console.log(`✅ Retrieved fee sponsor ${feeSponsorId} (${response.status})`);

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to get fee sponsor ${feeSponsorId}: ${error}`,
        'FEE_SPONSOR_GET_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * List all fee sponsors
   * 
   * @param request - List request parameters
   * @param options - Service options
   * @returns List of fee sponsors
   * 
   * API: GET /fee-sponsors
   * Requires: FeeSponsors:Read permission
   */
  async listFeeSponsors(
    request: DfnsListFeeSponsorsRequest = {},
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsListFeeSponsorsResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/fee-sponsors?${queryString}` : '/fee-sponsors';

      const response = await this.client.makeRequest<DfnsListFeeSponsorsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} fee sponsors`);
      
      if (response.nextPageToken) {
        console.log(`📄 Next page available: ${response.nextPageToken}`);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to list fee sponsors: ${error}`,
        'FEE_SPONSOR_LIST_FAILED'
      );
    }
  }

  /**
   * Get all fee sponsors (handles pagination automatically)
   * 
   * @param options - Service options
   * @returns All fee sponsors
   */
  async getAllFeeSponsors(
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor[]> {
    try {
      const allFeeSponsors: DfnsFeeSponsor[] = [];
      let paginationToken: string | undefined = undefined;

      do {
        const response = await this.listFeeSponsors({
          limit: 100,
          paginationToken
        }, options);

        allFeeSponsors.push(...response.items);
        paginationToken = response.nextPageToken;
      } while (paginationToken);

      console.log(`✅ Retrieved all ${allFeeSponsors.length} fee sponsors`);
      return allFeeSponsors;
    } catch (error) {
      throw new DfnsError(
        `Failed to get all fee sponsors: ${error}`,
        'FEE_SPONSOR_GET_ALL_FAILED'
      );
    }
  }

  /**
   * Activate fee sponsor
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated fee sponsor
   * 
   * API: PUT /fee-sponsors/{feeSponsorId}/activate
   * Requires: FeeSponsors:Update permission
   */
  async activateFeeSponsor(
    feeSponsorId: string,
    userActionToken?: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      if (!userActionToken) {
        console.warn('⚠️ Activating fee sponsor without User Action token - this will likely fail with 403');
      }

      const response = await this.client.makeRequest<DfnsFeeSponsor>(
        'PUT',
        `/fee-sponsors/${feeSponsorId}/activate`,
        {},
        userActionToken
      );

      console.log(`✅ Activated fee sponsor ${feeSponsorId}`);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to activate fee sponsor ${feeSponsorId}: ${error}`,
        'FEE_SPONSOR_ACTIVATE_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * Deactivate fee sponsor
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Updated fee sponsor
   * 
   * API: PUT /fee-sponsors/{feeSponsorId}/deactivate
   * Requires: FeeSponsors:Update permission
   */
  async deactivateFeeSponsor(
    feeSponsorId: string,
    userActionToken?: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      if (!userActionToken) {
        console.warn('⚠️ Deactivating fee sponsor without User Action token - this will likely fail with 403');
      }

      const response = await this.client.makeRequest<DfnsFeeSponsor>(
        'PUT',
        `/fee-sponsors/${feeSponsorId}/deactivate`,
        {},
        userActionToken
      );

      console.log(`✅ Deactivated fee sponsor ${feeSponsorId}`);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to deactivate fee sponsor ${feeSponsorId}: ${error}`,
        'FEE_SPONSOR_DEACTIVATE_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * Delete fee sponsor
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Service options
   * @returns Archived fee sponsor
   * 
   * API: DELETE /fee-sponsors/{feeSponsorId}
   * Requires: FeeSponsors:Delete permission
   */
  async deleteFeeSponsor(
    feeSponsorId: string,
    userActionToken?: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      if (!userActionToken) {
        console.warn('⚠️ Deleting fee sponsor without User Action token - this will likely fail with 403');
      }

      const response = await this.client.makeRequest<DfnsFeeSponsor>(
        'DELETE',
        `/fee-sponsors/${feeSponsorId}`,
        {},
        userActionToken
      );

      console.log(`✅ Deleted fee sponsor ${feeSponsorId} (status: ${response.status})`);

      // Update database if requested
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to delete fee sponsor ${feeSponsorId}: ${error}`,
        'FEE_SPONSOR_DELETE_FAILED',
        { feeSponsorId }
      );
    }
  }

  // ===============================
  // SPONSORED FEES
  // ===============================

  /**
   * List sponsored fees for a fee sponsor
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param request - List request parameters
   * @param options - Service options
   * @returns List of sponsored fees
   * 
   * API: GET /fee-sponsors/{feeSponsorId}/fees
   * Requires: FeeSponsors:Read permission
   */
  async listSponsoredFees(
    feeSponsorId: string,
    request: DfnsListSponsoredFeesRequest = {},
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsListSponsoredFeesResponse> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      
      if (request.paginationToken) {
        queryParams.append('paginationToken', request.paginationToken);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/fee-sponsors/${feeSponsorId}/fees?${queryString}` 
        : `/fee-sponsors/${feeSponsorId}/fees`;

      const response = await this.client.makeRequest<DfnsListSponsoredFeesResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} sponsored fees for ${feeSponsorId}`);
      
      if (response.nextPageToken) {
        console.log(`📄 Next page available: ${response.nextPageToken}`);
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to list sponsored fees for ${feeSponsorId}: ${error}`,
        'SPONSORED_FEE_LIST_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * Get all sponsored fees for a fee sponsor (handles pagination automatically)
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns All sponsored fees
   */
  async getAllSponsoredFees(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsSponsoredFee[]> {
    try {
      const allSponsoredFees: DfnsSponsoredFee[] = [];
      let paginationToken: string | undefined = undefined;

      do {
        const response = await this.listSponsoredFees(feeSponsorId, {
          limit: 100,
          paginationToken
        }, options);

        allSponsoredFees.push(...response.items);
        paginationToken = response.nextPageToken;
      } while (paginationToken);

      console.log(`✅ Retrieved all ${allSponsoredFees.length} sponsored fees for ${feeSponsorId}`);
      return allSponsoredFees;
    } catch (error) {
      throw new DfnsError(
        `Failed to get all sponsored fees for ${feeSponsorId}: ${error}`,
        'SPONSORED_FEE_GET_ALL_FAILED',
        { feeSponsorId }
      );
    }
  }

  // ===============================
  // BATCH OPERATIONS
  // ===============================

  /**
   * Create multiple fee sponsors
   * 
   * @param requests - Array of fee sponsor creation requests
   * @param userActionToken - Required for User Action Signing
   * @param options - Batch operation options
   * @returns Batch operation results
   */
  async createMultipleFeeSponsors(
    requests: DfnsCreateFeeSponsorRequest[],
    userActionToken?: string,
    options: DfnsBatchFeeSponsorOptions = {}
  ): Promise<DfnsBatchFeeSponsorResult<DfnsFeeSponsor>> {
    const results: DfnsBatchFeeSponsorResult<DfnsFeeSponsor> = {
      successful: [],
      failed: []
    };

    const maxConcurrency = options.maxConcurrency || 5;
    
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const promises = batch.map(async (request) => {
        try {
          const feeSponsor = await this.createFeeSponsor(request, userActionToken, options);
          results.successful.push(feeSponsor);
        } catch (error) {
          results.failed.push({
            feeSponsorId: `wallet-${request.walletId}`,
            error: error instanceof Error ? error.message : 'Unknown error',
            reason: this.classifyError(error)
          });

          if (!options.continueOnError) {
            throw error;
          }
        }
      });

      await Promise.allSettled(promises);
    }

    console.log(`✅ Batch fee sponsor creation: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  // ===============================
  // BUSINESS LOGIC & ANALYTICS
  // ===============================

  /**
   * Get fee sponsor summary for dashboard
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns Fee sponsor summary with analytics
   */
  async getFeeSponsorSummary(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsorSummary> {
    try {
      const [feeSponsor, sponsoredFees] = await Promise.all([
        this.getFeeSponsor(feeSponsorId, options),
        this.getAllSponsoredFees(feeSponsorId, options)
      ]);

      // Calculate analytics
      const confirmedFees = sponsoredFees.filter(fee => fee.status === 'Confirmed');
      const totalFeesSponsored = confirmedFees
        .reduce((sum, fee) => sum + BigInt(fee.fee), BigInt(0))
        .toString();
      
      const averageFeePerTransaction = confirmedFees.length > 0
        ? (BigInt(totalFeesSponsored) / BigInt(confirmedFees.length)).toString()
        : '0';

      const lastSponsorshipDate = sponsoredFees.length > 0
        ? sponsoredFees
            .sort((a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime())[0]
            ?.dateRequested
        : undefined;

      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(feeSponsor.dateCreated).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        feeSponsorId,
        walletId: feeSponsor.walletId,
        network: feeSponsor.network,
        status: feeSponsor.status,
        isActive: feeSponsor.status === 'Active',
        totalFeesSponsored,
        transactionCount: confirmedFees.length,
        averageFeePerTransaction,
        dateCreated: feeSponsor.dateCreated,
        daysSinceCreated,
        lastSponsorshipDate
      };
    } catch (error) {
      throw new DfnsError(
        `Failed to get fee sponsor summary for ${feeSponsorId}: ${error}`,
        'FEE_SPONSOR_SUMMARY_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * Get sponsored fees summary with analytics
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns Sponsored fees with analytics
   */
  async getSponsoredFeesSummary(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsSponsoredFeeSummary[]> {
    try {
      const [feeSponsor, sponsoredFees] = await Promise.all([
        this.getFeeSponsor(feeSponsorId, options),
        this.getAllSponsoredFees(feeSponsorId, options)
      ]);

      return sponsoredFees.map(fee => {
        const timeToConfirmation = fee.dateConfirmed
          ? Math.floor(
              (new Date(fee.dateConfirmed).getTime() - new Date(fee.dateRequested).getTime()) / 1000
            )
          : undefined;

        return {
          sponsoredFeeId: fee.id,
          feeSponsorId,
          sponsoreeId: fee.sponsoreeId,
          requestId: fee.requestId,
          fee: fee.fee,
          status: fee.status,
          network: feeSponsor.network,
          isConfirmed: fee.status === 'Confirmed',
          timeToConfirmation,
          dateRequested: fee.dateRequested,
          dateConfirmed: fee.dateConfirmed
        };
      });
    } catch (error) {
      throw new DfnsError(
        `Failed to get sponsored fees summary for ${feeSponsorId}: ${error}`,
        'SPONSORED_FEE_SUMMARY_FAILED',
        { feeSponsorId }
      );
    }
  }

  /**
   * Get fee sponsor statistics across all sponsors
   * 
   * @param options - Service options
   * @returns Aggregated statistics
   */
  async getFeeSponsorStatistics(
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<{
    totalFeeSponsors: number;
    activeFeeSponsors: number;
    totalNetworks: number;
    totalFeesSponsored: string;
    totalTransactionsSponsored: number;
    networkDistribution: Record<DfnsNetwork, number>;
    statusDistribution: Record<string, number>;
  }> {
    try {
      const allFeeSponsors = await this.getAllFeeSponsors(options);
      
      // Get all sponsored fees for each sponsor
      const allSponsoredFeesPromises = allFeeSponsors.map(sponsor =>
        this.getAllSponsoredFees(sponsor.id, options)
      );
      
      const allSponsoredFeesArrays = await Promise.allSettled(allSponsoredFeesPromises);
      const allSponsoredFees = allSponsoredFeesArrays
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => (result as PromiseFulfilledResult<DfnsSponsoredFee[]>).value);

      // Calculate statistics
      const confirmedFees = allSponsoredFees.filter(fee => fee.status === 'Confirmed');
      const totalFeesSponsored = confirmedFees
        .reduce((sum, fee) => sum + BigInt(fee.fee), BigInt(0))
        .toString();

      const networkDistribution = allFeeSponsors.reduce((dist, sponsor) => {
        dist[sponsor.network] = (dist[sponsor.network] || 0) + 1;
        return dist;
      }, {} as Record<DfnsNetwork, number>);

      const statusDistribution = allFeeSponsors.reduce((dist, sponsor) => {
        dist[sponsor.status] = (dist[sponsor.status] || 0) + 1;
        return dist;
      }, {} as Record<string, number>);

      return {
        totalFeeSponsors: allFeeSponsors.length,
        activeFeeSponsors: allFeeSponsors.filter(s => s.status === 'Active').length,
        totalNetworks: Object.keys(networkDistribution).length,
        totalFeesSponsored,
        totalTransactionsSponsored: confirmedFees.length,
        networkDistribution,
        statusDistribution
      };
    } catch (error) {
      throw new DfnsError(
        `Failed to get fee sponsor statistics: ${error}`,
        'FEE_SPONSOR_STATISTICS_FAILED'
      );
    }
  }

  // ===============================
  // VALIDATION HELPERS
  // ===============================

  /**
   * Validate fee sponsor ID format
   */
  private validateFeeSponsorId(feeSponsorId: string): void {
    if (!feeSponsorId || typeof feeSponsorId !== 'string') {
      throw new DfnsValidationError('Fee sponsor ID is required and must be a string');
    }

    if (!isValidFeeSponsorId(feeSponsorId)) {
      throw new DfnsValidationError(
        `Invalid fee sponsor ID format: ${feeSponsorId}. Expected format: fs-xxxxx-xxxxx-xxxxxxxxxxxxxxxx`
      );
    }
  }

  /**
   * Validate wallet ID format
   */
  private validateWalletId(walletId: string): void {
    if (!walletId || typeof walletId !== 'string') {
      throw new DfnsValidationError('Wallet ID is required and must be a string');
    }

    // Basic wallet ID format validation
    if (!/^wa-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{16}$/.test(walletId)) {
      throw new DfnsValidationError(
        `Invalid wallet ID format: ${walletId}. Expected format: wa-xxxxx-xxxxx-xxxxxxxxxxxxxxxx`
      );
    }
  }

  /**
   * Validate create fee sponsor request
   */
  private validateCreateRequest(request: DfnsCreateFeeSponsorRequest): void {
    if (!request || typeof request !== 'object') {
      throw new DfnsValidationError('Create fee sponsor request is required');
    }

    this.validateWalletId(request.walletId);
  }

  /**
   * Classify error for batch operations
   */
  private classifyError(error: unknown): DfnsFeeSponsorErrorReason {
    if (error instanceof DfnsValidationError) {
      return 'VALIDATION_ERROR';
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('permission') || errorMessage.includes('403')) {
      return 'PERMISSION_DENIED';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return 'FEE_SPONSOR_NOT_FOUND';
    }
    
    if (errorMessage.includes('already exists')) {
      return 'FEE_SPONSOR_ALREADY_EXISTS';
    }

    return 'NETWORK_ERROR';
  }

  /**
   * Sync fee sponsor to database (placeholder for database integration)
   */
  private async syncFeeSponsorToDatabase(feeSponsor: DfnsFeeSponsor): Promise<void> {
    try {
      // TODO: Implement database sync logic
      console.log(`📊 Syncing fee sponsor ${feeSponsor.id} to database...`);
      
      // This would typically call a database service to update the dfns_fee_sponsors table
      // await databaseService.upsertFeeSponsor(feeSponsor);
      
      console.log(`✅ Fee sponsor ${feeSponsor.id} synced to database`);
    } catch (error) {
      console.error(`❌ Failed to sync fee sponsor ${feeSponsor.id} to database:`, error);
      // Don't throw here - database sync failure shouldn't break the main operation
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Check if a network supports fee sponsoring
   */
  isNetworkSupported(network: DfnsNetwork): network is DfnsFeeSponsorSupportedNetwork {
    return isFeeSponsorSupportedNetwork(network);
  }

  /**
   * Get supported networks for fee sponsoring
   */
  getSupportedNetworks(): DfnsFeeSponsorSupportedNetwork[] {
    // Import the array from types
    const { DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS } = require('../../types/dfns/feeSponsors');
    return [...DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS];
  }

  /**
   * Validate network compatibility
   */
  validateNetworkSupport(network: DfnsNetwork): void {
    if (!this.isNetworkSupported(network)) {
      throw new DfnsValidationError(
        `Network ${network} does not support fee sponsoring. Supported networks: ${this.getSupportedNetworks().join(', ')}`
      );
    }
  }
}

// Global service instance
let globalDfnsFeeSponsorService: DfnsFeeSponsorService | null = null;

/**
 * Get or create the global DFNS Fee Sponsor service instance
 */
export function getDfnsFeeSponsorService(client?: WorkingDfnsClient): DfnsFeeSponsorService {
  if (!globalDfnsFeeSponsorService || client) {
    if (!client) {
      const { getWorkingDfnsClient } = require('../../infrastructure/dfns/working-client');
      client = getWorkingDfnsClient();
    }
    globalDfnsFeeSponsorService = new DfnsFeeSponsorService(client);
  }
  return globalDfnsFeeSponsorService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsFeeSponsorService(): void {
  globalDfnsFeeSponsorService = null;
}
