/**
 * DFNS Fee Sponsors Service
 * 
 * High-level business logic for DFNS Fee Sponsors management operations.
 * Enables gasless transactions by allowing designated wallets to sponsor
 * gas fees for other wallets across supported blockchain networks.
 * 
 * Features:
 * - Complete CRUD operations for fee sponsors
 * - Comprehensive validation and error handling
 * - Database synchronization support
 * - Batch operations for efficient management
 * - Dashboard analytics and summaries
 */

import type {
  DfnsFeeSponsor,
  DfnsSponsoredFee,
  DfnsCreateFeeSponsorRequest,
  DfnsCreateFeeSponsorResponse,
  DfnsGetFeeSponsorResponse,
  DfnsListFeeSponsorsRequest,
  DfnsListFeeSponsorsResponse,
  DfnsActivateFeeSponsorResponse,
  DfnsDeactivateFeeSponsorResponse,
  DfnsDeleteFeeSponsorResponse,
  DfnsListSponsoredFeesRequest,
  DfnsListSponsoredFeesResponse,
  DfnsFeeSponsorServiceOptions,
  DfnsBatchFeeSponsorOptions,
  DfnsFeeSponsorSummary,
  DfnsSponsoredFeeSummary,
  DfnsBatchFeeSponsorResult,
  DfnsFeeSponsorErrorReason,
  DfnsFeeSponsorSupportedNetwork,
  DfnsNetwork,
} from '../../types/dfns';
import {
  isFeeSponsorSupportedNetwork,
  isValidFeeSponsorId,
  isValidSponsoredFeeId,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { DfnsAuthenticationError, DfnsValidationError } from '../../types/dfns/errors';

/**
 * Custom error class for Fee Sponsor specific errors
 */
export class DfnsFeeSponsorError extends Error {
  public readonly reason: DfnsFeeSponsorErrorReason;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    reason: DfnsFeeSponsorErrorReason = 'VALIDATION_ERROR',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DfnsFeeSponsorError';
    this.reason = reason;
    this.context = context;
  }
}

/**
 * DFNS Fee Sponsors Service
 * Provides comprehensive fee sponsor management functionality
 */
export class DfnsFeeSponsorService {
  constructor(
    private authClient: DfnsAuthClient,
    private userActionService: DfnsUserActionService
  ) {}

  // =============================================================================
  // Core Fee Sponsor Management
  // =============================================================================

  /**
   * Create a new fee sponsor
   * Designates a wallet to sponsor gas fees for other wallets
   * Requires User Action Signing for security
   * 
   * @param walletId - Wallet ID that will sponsor fees
   * @param options - Service options for database sync, validation, etc.
   * @returns Created fee sponsor
   */
  async createFeeSponsor(
    walletId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      // Input validation
      this.validateWalletId(walletId);
      
      if (options.validateNetwork) {
        // Note: Network validation would require wallet lookup
        // For now, we'll validate during the API call
      }

      const request: DfnsCreateFeeSponsorRequest = {
        walletId
      };

      // User Action Signing required for fee sponsor creation
      const userActionToken = await this.userActionService.signUserAction(
        'CreateFeeSponsor',
        request,
        {
          persistToDb: options.syncToDatabase ?? false,
        }
      );

      const response: DfnsCreateFeeSponsorResponse = await this.authClient.createFeeSponsor(request);
      const feeSponsor = response.feeSponsor;

      // Auto-activate if requested
      if (options.autoActivate && feeSponsor.status !== 'Active') {
        await this.activateFeeSponsor(feeSponsor.id, options);
      }

      // Database synchronization
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(feeSponsor);
      }

      return feeSponsor;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to create fee sponsor: ${error.message}`,
          'FEE_SPONSOR_ALREADY_EXISTS',
          { walletId, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Get fee sponsor by ID
   * 
   * @param feeSponsorId - Fee sponsor ID to retrieve
   * @param options - Service options
   * @returns Fee sponsor details
   */
  async getFeeSponsor(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      const response: DfnsGetFeeSponsorResponse = await this.authClient.getFeeSponsor(feeSponsorId);
      const feeSponsor = response.feeSponsor;

      // Database synchronization
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(feeSponsor);
      }

      return feeSponsor;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to get fee sponsor: ${error.message}`,
          'FEE_SPONSOR_NOT_FOUND',
          { feeSponsorId, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * List all fee sponsors with pagination
   * 
   * @param request - List parameters (limit, pagination)
   * @param options - Service options
   * @returns List of fee sponsors
   */
  async listFeeSponsors(
    request: DfnsListFeeSponsorsRequest = {},
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsListFeeSponsorsResponse> {
    try {
      if (request.limit && (request.limit < 1 || request.limit > 100)) {
        throw new DfnsFeeSponsorError(
          'Limit must be between 1 and 100',
          'VALIDATION_ERROR',
          { limit: request.limit }
        );
      }

      const response: DfnsListFeeSponsorsResponse = await this.authClient.listFeeSponsors(request);

      // Database synchronization
      if (options.syncToDatabase) {
        for (const feeSponsor of response.items) {
          await this.syncFeeSponsorToDatabase(feeSponsor);
        }
      }

      return response;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to list fee sponsors: ${error.message}`,
          'NETWORK_ERROR',
          { request, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Get all fee sponsors (automatic pagination)
   * 
   * @param options - Service options
   * @returns All fee sponsors
   */
  async getAllFeeSponsors(
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor[]> {
    const allFeeSponsors: DfnsFeeSponsor[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listFeeSponsors(
        { limit: 100, paginationToken },
        options
      );
      
      allFeeSponsors.push(...response.items);
      paginationToken = response.nextPageToken;
    } while (paginationToken);

    return allFeeSponsors;
  }

  // =============================================================================
  // Fee Sponsor Lifecycle Management
  // =============================================================================

  /**
   * Activate a fee sponsor
   * Once activated, the fee sponsor can be used for gasless transactions
   * Requires User Action Signing for security
   * 
   * @param feeSponsorId - Fee sponsor ID to activate
   * @param options - Service options
   * @returns Activated fee sponsor
   */
  async activateFeeSponsor(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      // User Action Signing required for fee sponsor activation
      const userActionToken = await this.userActionService.signUserAction(
        'ActivateFeeSponsor',
        { feeSponsorId },
        {
          persistToDb: options.syncToDatabase ?? false,
        }
      );

      const response: DfnsActivateFeeSponsorResponse = await this.authClient.activateFeeSponsor(feeSponsorId);
      const feeSponsor = response.feeSponsor;

      // Database synchronization
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(feeSponsor);
      }

      return feeSponsor;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to activate fee sponsor: ${error.message}`,
          'FEE_SPONSOR_NOT_FOUND',
          { feeSponsorId, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Deactivate a fee sponsor
   * Once deactivated, the fee sponsor cannot be used for new transactions
   * Requires User Action Signing for security
   * 
   * @param feeSponsorId - Fee sponsor ID to deactivate
   * @param options - Service options
   * @returns Deactivated fee sponsor
   */
  async deactivateFeeSponsor(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      // User Action Signing required for fee sponsor deactivation
      const userActionToken = await this.userActionService.signUserAction(
        'DeactivateFeeSponsor',
        { feeSponsorId },
        {
          persistToDb: options.syncToDatabase ?? false,
        }
      );

      const response: DfnsDeactivateFeeSponsorResponse = await this.authClient.deactivateFeeSponsor(feeSponsorId);
      const feeSponsor = response.feeSponsor;

      // Database synchronization
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(feeSponsor);
      }

      return feeSponsor;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to deactivate fee sponsor: ${error.message}`,
          'FEE_SPONSOR_NOT_FOUND',
          { feeSponsorId, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Delete (archive) a fee sponsor
   * Permanently removes the fee sponsor from active use
   * Requires User Action Signing for security
   * 
   * @param feeSponsorId - Fee sponsor ID to delete
   * @param options - Service options
   * @returns Deleted fee sponsor
   */
  async deleteFeeSponsor(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      // User Action Signing required for fee sponsor deletion
      const userActionToken = await this.userActionService.signUserAction(
        'DeleteFeeSponsor',
        { feeSponsorId },
        {
          persistToDb: options.syncToDatabase ?? false,
        }
      );

      const response: DfnsDeleteFeeSponsorResponse = await this.authClient.deleteFeeSponsor(feeSponsorId);
      const feeSponsor = response.feeSponsor;

      // Database synchronization
      if (options.syncToDatabase) {
        await this.syncFeeSponsorToDatabase(feeSponsor);
      }

      return feeSponsor;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to delete fee sponsor: ${error.message}`,
          'FEE_SPONSOR_NOT_FOUND',
          { feeSponsorId, error: error.message }
        );
      }
      throw error;
    }
  }

  // =============================================================================
  // Sponsored Fees Management
  // =============================================================================

  /**
   * List sponsored fees for a fee sponsor
   * Returns history of all fees paid by this sponsor
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param request - List parameters
   * @param options - Service options
   * @returns List of sponsored fees
   */
  async listSponsoredFees(
    feeSponsorId: string,
    request: DfnsListSponsoredFeesRequest = {},
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsListSponsoredFeesResponse> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      if (request.limit && (request.limit < 1 || request.limit > 100)) {
        throw new DfnsFeeSponsorError(
          'Limit must be between 1 and 100',
          'VALIDATION_ERROR',
          { limit: request.limit }
        );
      }

      const response: DfnsListSponsoredFeesResponse = await this.authClient.listSponsoredFees(
        feeSponsorId,
        request
      );

      return response;
    } catch (error) {
      if (error instanceof DfnsAuthenticationError) {
        throw new DfnsFeeSponsorError(
          `Failed to list sponsored fees: ${error.message}`,
          'FEE_SPONSOR_NOT_FOUND',
          { feeSponsorId, request, error: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Get all sponsored fees for a fee sponsor (automatic pagination)
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns All sponsored fees
   */
  async getAllSponsoredFees(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsSponsoredFee[]> {
    const allSponsoredFees: DfnsSponsoredFee[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listSponsoredFees(
        feeSponsorId,
        { limit: 100, paginationToken },
        options
      );
      
      allSponsoredFees.push(...response.items);
      paginationToken = response.nextPageToken;
    } while (paginationToken);

    return allSponsoredFees;
  }

  // =============================================================================
  // Batch Operations
  // =============================================================================

  /**
   * Activate multiple fee sponsors
   * 
   * @param feeSponsorIds - Array of fee sponsor IDs to activate
   * @param options - Batch operation options
   * @returns Batch operation result
   */
  async activateFeeSponsors(
    feeSponsorIds: string[],
    options: DfnsBatchFeeSponsorOptions = {}
  ): Promise<DfnsBatchFeeSponsorResult<DfnsFeeSponsor>> {
    const result: DfnsBatchFeeSponsorResult<DfnsFeeSponsor> = {
      successful: [],
      failed: []
    };

    const maxConcurrency = options.maxConcurrency || 5;
    const continueOnError = options.continueOnError ?? true;

    for (let i = 0; i < feeSponsorIds.length; i += maxConcurrency) {
      const batch = feeSponsorIds.slice(i, i + maxConcurrency);
      
      const promises = batch.map(async (feeSponsorId) => {
        try {
          const feeSponsor = await this.activateFeeSponsor(feeSponsorId, options);
          result.successful.push(feeSponsor);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const reason = error instanceof DfnsFeeSponsorError ? error.reason : 'BATCH_OPERATION_FAILED';
          
          result.failed.push({
            feeSponsorId,
            error: errorMessage,
            reason
          });

          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(promises);
    }

    return result;
  }

  /**
   * Deactivate multiple fee sponsors
   * 
   * @param feeSponsorIds - Array of fee sponsor IDs to deactivate
   * @param options - Batch operation options
   * @returns Batch operation result
   */
  async deactivateFeeSponsors(
    feeSponsorIds: string[],
    options: DfnsBatchFeeSponsorOptions = {}
  ): Promise<DfnsBatchFeeSponsorResult<DfnsFeeSponsor>> {
    const result: DfnsBatchFeeSponsorResult<DfnsFeeSponsor> = {
      successful: [],
      failed: []
    };

    const maxConcurrency = options.maxConcurrency || 5;
    const continueOnError = options.continueOnError ?? true;

    for (let i = 0; i < feeSponsorIds.length; i += maxConcurrency) {
      const batch = feeSponsorIds.slice(i, i + maxConcurrency);
      
      const promises = batch.map(async (feeSponsorId) => {
        try {
          const feeSponsor = await this.deactivateFeeSponsor(feeSponsorId, options);
          result.successful.push(feeSponsor);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const reason = error instanceof DfnsFeeSponsorError ? error.reason : 'BATCH_OPERATION_FAILED';
          
          result.failed.push({
            feeSponsorId,
            error: errorMessage,
            reason
          });

          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(promises);
    }

    return result;
  }

  // =============================================================================
  // Lookup and Search Operations
  // =============================================================================

  /**
   * Find fee sponsor by wallet ID
   * 
   * @param walletId - Wallet ID to search for
   * @param options - Service options
   * @returns Fee sponsor if found, null otherwise
   */
  async getFeeSponsorByWalletId(
    walletId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor | null> {
    try {
      this.validateWalletId(walletId);

      const allFeeSponsors = await this.getAllFeeSponsors(options);
      
      const feeSponsor = allFeeSponsors.find(sponsor => sponsor.walletId === walletId);
      return feeSponsor || null;
    } catch (error) {
      throw new DfnsFeeSponsorError(
        `Failed to find fee sponsor by wallet ID: ${error}`,
        'NETWORK_ERROR',
        { walletId }
      );
    }
  }

  /**
   * Find fee sponsors by network
   * 
   * @param network - Network to filter by
   * @param options - Service options
   * @returns Fee sponsors for the specified network
   */
  async getFeeSponsorsByNetwork(
    network: DfnsNetwork,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsor[]> {
    try {
      if (options.validateNetwork && !isFeeSponsorSupportedNetwork(network)) {
        throw new DfnsFeeSponsorError(
          `Network ${network} does not support fee sponsoring`,
          'NETWORK_NOT_SUPPORTED',
          { network }
        );
      }

      const allFeeSponsors = await this.getAllFeeSponsors(options);
      
      return allFeeSponsors.filter(sponsor => sponsor.network === network);
    } catch (error) {
      if (error instanceof DfnsFeeSponsorError) {
        throw error;
      }
      throw new DfnsFeeSponsorError(
        `Failed to find fee sponsors by network: ${error}`,
        'NETWORK_ERROR',
        { network }
      );
    }
  }

  // =============================================================================
  // Dashboard and Analytics
  // =============================================================================

  /**
   * Get fee sponsor summaries for dashboard
   * 
   * @param options - Service options
   * @returns Array of fee sponsor summaries
   */
  async getFeeSponsorsSummary(
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsFeeSponsorSummary[]> {
    try {
      const feeSponsors = await this.getAllFeeSponsors(options);
      
      const summaries: DfnsFeeSponsorSummary[] = [];

      for (const feeSponsor of feeSponsors) {
        try {
          // Get sponsored fees for analytics
          let sponsoredFees: DfnsSponsoredFee[] = [];
          if (options.includeFeeHistory) {
            sponsoredFees = await this.getAllSponsoredFees(feeSponsor.id, options);
          }

          const summary: DfnsFeeSponsorSummary = {
            feeSponsorId: feeSponsor.id,
            walletId: feeSponsor.walletId,
            network: feeSponsor.network,
            status: feeSponsor.status,
            isActive: feeSponsor.status === 'Active',
            totalFeesSponsored: this.calculateTotalFees(sponsoredFees),
            transactionCount: sponsoredFees.length,
            averageFeePerTransaction: this.calculateAverageFee(sponsoredFees),
            dateCreated: feeSponsor.dateCreated,
            daysSinceCreated: this.calculateDaysSince(feeSponsor.dateCreated),
            lastSponsorshipDate: this.getLastSponsorshipDate(sponsoredFees)
          };

          summaries.push(summary);
        } catch (error) {
          // Continue with other fee sponsors if one fails
          console.warn(`Failed to get summary for fee sponsor ${feeSponsor.id}:`, error);
        }
      }

      return summaries;
    } catch (error) {
      throw new DfnsFeeSponsorError(
        `Failed to get fee sponsors summary: ${error}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Get sponsored fee summaries for analytics
   * 
   * @param feeSponsorId - Fee sponsor ID
   * @param options - Service options
   * @returns Array of sponsored fee summaries
   */
  async getSponsoredFeesSummary(
    feeSponsorId: string,
    options: DfnsFeeSponsorServiceOptions = {}
  ): Promise<DfnsSponsoredFeeSummary[]> {
    try {
      this.validateFeeSponsorId(feeSponsorId);

      const feeSponsor = await this.getFeeSponsor(feeSponsorId, options);
      const sponsoredFees = await this.getAllSponsoredFees(feeSponsorId, options);

      return sponsoredFees.map(fee => ({
        sponsoredFeeId: fee.id,
        feeSponsorId,
        sponsoreeId: fee.sponsoreeId,
        requestId: fee.requestId,
        fee: fee.fee,
        status: fee.status,
        network: feeSponsor.network,
        isConfirmed: fee.status === 'Confirmed',
        timeToConfirmation: this.calculateTimeToConfirmation(fee),
        dateRequested: fee.dateRequested,
        dateConfirmed: fee.dateConfirmed
      }));
    } catch (error) {
      throw new DfnsFeeSponsorError(
        `Failed to get sponsored fees summary: ${error}`,
        'FEE_SPONSOR_NOT_FOUND',
        { feeSponsorId }
      );
    }
  }

  // =============================================================================
  // Utility and Validation Methods
  // =============================================================================

  /**
   * Check if network supports fee sponsoring
   * 
   * @param network - Network to check
   * @returns True if network supports fee sponsoring
   */
  static isNetworkSupported(network: DfnsNetwork): network is DfnsFeeSponsorSupportedNetwork {
    return isFeeSponsorSupportedNetwork(network);
  }

  /**
   * Validate fee sponsor ID format
   * 
   * @param feeSponsorId - Fee sponsor ID to validate
   * @throws DfnsFeeSponsorError if invalid
   */
  private validateFeeSponsorId(feeSponsorId: string): void {
    if (!feeSponsorId || typeof feeSponsorId !== 'string') {
      throw new DfnsFeeSponsorError(
        'Fee sponsor ID is required and must be a string',
        'INVALID_FEE_SPONSOR_ID',
        { feeSponsorId }
      );
    }

    if (!isValidFeeSponsorId(feeSponsorId)) {
      throw new DfnsFeeSponsorError(
        'Invalid fee sponsor ID format',
        'INVALID_FEE_SPONSOR_ID',
        { feeSponsorId }
      );
    }
  }

  /**
   * Validate wallet ID format
   * 
   * @param walletId - Wallet ID to validate
   * @throws DfnsFeeSponsorError if invalid
   */
  private validateWalletId(walletId: string): void {
    if (!walletId || typeof walletId !== 'string') {
      throw new DfnsFeeSponsorError(
        'Wallet ID is required and must be a string',
        'INVALID_WALLET_ID',
        { walletId }
      );
    }

    // Basic wallet ID format validation (wa-xxxxx-xxxxx-xxxxxxxxxxxxxxxx)
    if (!/^wa-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{16}$/.test(walletId)) {
      throw new DfnsFeeSponsorError(
        'Invalid wallet ID format',
        'INVALID_WALLET_ID',
        { walletId }
      );
    }
  }

  /**
   * Sync fee sponsor to database (placeholder for Supabase integration)
   * 
   * @param feeSponsor - Fee sponsor to sync
   */
  private async syncFeeSponsorToDatabase(feeSponsor: DfnsFeeSponsor): Promise<void> {
    // TODO: Implement Supabase dfns_fee_sponsors table synchronization
    // This would involve inserting/updating the fee sponsor record in the database
    console.debug('Database sync placeholder:', { feeSponsorId: feeSponsor.id });
  }

  /**
   * Calculate total fees sponsored
   * 
   * @param sponsoredFees - Array of sponsored fees
   * @returns Total fees as string
   */
  private calculateTotalFees(sponsoredFees: DfnsSponsoredFee[]): string {
    const total = sponsoredFees.reduce((sum, fee) => {
      return sum + BigInt(fee.fee);
    }, BigInt(0));

    return total.toString();
  }

  /**
   * Calculate average fee per transaction
   * 
   * @param sponsoredFees - Array of sponsored fees
   * @returns Average fee as string
   */
  private calculateAverageFee(sponsoredFees: DfnsSponsoredFee[]): string {
    if (sponsoredFees.length === 0) {
      return '0';
    }

    const total = BigInt(this.calculateTotalFees(sponsoredFees));
    const average = total / BigInt(sponsoredFees.length);

    return average.toString();
  }

  /**
   * Calculate days since date
   * 
   * @param dateString - ISO date string
   * @returns Number of days since date
   */
  private calculateDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get last sponsorship date
   * 
   * @param sponsoredFees - Array of sponsored fees
   * @returns Last sponsorship date or undefined
   */
  private getLastSponsorshipDate(sponsoredFees: DfnsSponsoredFee[]): string | undefined {
    if (sponsoredFees.length === 0) {
      return undefined;
    }

    const sortedFees = sponsoredFees.sort((a, b) => 
      new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
    );

    return sortedFees[0]?.dateRequested;
  }

  /**
   * Calculate time to confirmation in seconds
   * 
   * @param fee - Sponsored fee
   * @returns Time to confirmation in seconds or undefined
   */
  private calculateTimeToConfirmation(fee: DfnsSponsoredFee): number | undefined {
    if (!fee.dateConfirmed) {
      return undefined;
    }

    const requested = new Date(fee.dateRequested).getTime();
    const confirmed = new Date(fee.dateConfirmed).getTime();
    
    return Math.round((confirmed - requested) / 1000);
  }
}
