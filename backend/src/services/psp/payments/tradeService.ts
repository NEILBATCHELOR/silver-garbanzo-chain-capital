/**
 * PSP Trade Service
 * 
 * Handles currency exchange and conversion operations between fiat and crypto.
 * Enables USD ↔ Stablecoin trading through Warp API.
 * 
 * Features:
 * - Execute trades (currency conversion)
 * - Get market rates
 * - Track trade status
 * - Support for multiple crypto networks
 * - Automatic conversion as part of payment flows
 */

import { BaseService, ServiceResult } from '@/services/BaseService';
import { WarpClientService } from '../auth/warpClientService';
import type {
  PSPTrade,
  CreateTradeRequest,
  MarketRate,
  TradeStatus,
  PSPEnvironment
} from '@/types/psp';

export class TradeService extends BaseService {
  constructor() {
    super('PSPTrade');
  }

  /**
   * Execute a trade (currency conversion)
   * Converts between USD and stablecoins
   */
  async executeTrade(
    request: CreateTradeRequest,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPTrade>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(request, [
        'project_id',
        'source',
        'destination'
      ]);

      if (!validation.success) {
        // validation.error is always a string from validateRequiredFields
        return this.error(
          validation.error || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      // Validate source and destination
      if (!request.source.symbol || !request.source.amount) {
        return this.error(
          'Source symbol and amount are required',
          'VALIDATION_ERROR',
          400
        );
      }

      if (!request.destination.symbol) {
        return this.error(
          'Destination symbol is required',
          'VALIDATION_ERROR',
          400
        );
      }

      // Get Warp API client
      const warpClient = await WarpClientService.getClientForProject(
        request.project_id,
        environment
      );

      // Execute trade in Warp
      this.logInfo('Executing trade in Warp', {
        projectId: request.project_id,
        from: request.source.symbol,
        to: request.destination.symbol,
        amount: request.source.amount
      });

      const warpResponse = await warpClient.createTrade({
        source: {
          symbol: request.source.symbol,
          network: request.source.network,
          amount: request.source.amount,
          virtualAccountId: request.virtual_account_id
        },
        destination: {
          symbol: request.destination.symbol,
          network: request.destination.network
        }
      });

      if (!warpResponse.success || !warpResponse.data) {
        this.logError('Failed to execute trade in Warp', warpResponse.error);
        return this.error(
          warpResponse.error?.message || 'Failed to execute trade',
          'WARP_API_ERROR',
          500
        );
      }

      // Store trade record in database
      const trade = await this.db.psp_trades.create({
        data: {
          project_id: request.project_id,
          warp_trade_id: warpResponse.data.id,
          virtual_account_id: request.virtual_account_id || null,
          source_symbol: request.source.symbol,
          source_network: request.source.network || null,
          source_amount: request.source.amount,
          destination_symbol: request.destination.symbol,
          destination_network: request.destination.network || null,
          destination_amount: warpResponse.data.destinationAmount || null,
          exchange_rate: warpResponse.data.rate || null,
          fee_amount: warpResponse.data.feeAmount || null,
          fee_currency: warpResponse.data.feeCurrency || null,
          status: this.mapWarpTradeStatus(warpResponse.data.status),
          executed_at: warpResponse.data.executedAt ? new Date(warpResponse.data.executedAt) : null,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      this.logInfo('Trade executed successfully', {
        tradeId: trade.id,
        warpTradeId: trade.warp_trade_id,
        status: trade.status
      });

      // Convert Decimal types to strings for PSPTrade
      return this.success({
        ...trade,
        source_amount: trade.source_amount.toString(),
        destination_amount: trade.destination_amount?.toString() || null,
        exchange_rate: trade.exchange_rate?.toString() || null,
        fee_amount: trade.fee_amount?.toString() || null
      } as PSPTrade);
    } catch (error) {
      return this.handleError('Failed to execute trade', error);
    }
  }

  /**
   * Get trade by ID
   */
  async getTrade(tradeId: string): Promise<ServiceResult<PSPTrade>> {
    return this.findById<PSPTrade>(this.db.psp_trades, tradeId);
  }

  /**
   * List trades for a project
   */
  async listTrades(
    projectId: string,
    options?: {
      virtualAccountId?: string;
      status?: TradeStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResult<PSPTrade[]>> {
    try {
      const whereClause: any = { project_id: projectId };

      if (options?.virtualAccountId) {
        whereClause.virtual_account_id = options.virtualAccountId;
      }

      if (options?.status) {
        whereClause.status = options.status;
      }

      const trades = await this.db.psp_trades.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      });

      // Convert Decimal types to strings for PSPTrade
      const formattedTrades = trades.map(trade => ({
        ...trade,
        source_amount: trade.source_amount.toString(),
        destination_amount: trade.destination_amount?.toString() || null,
        exchange_rate: trade.exchange_rate?.toString() || null,
        fee_amount: trade.fee_amount?.toString() || null
      } as PSPTrade));

      return this.success(formattedTrades);
    } catch (error) {
      return this.handleError('Failed to list trades', error);
    }
  }

  /**
   * Get current market rates
   * Returns live exchange rates from Warp
   */
  async getMarketRates(
    projectId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<MarketRate[]>> {
    try {
      const warpClient = await WarpClientService.getClientForProject(
        projectId,
        environment
      );

      const response = await warpClient.getMarketRates();

      if (!response.success || !response.data) {
        return this.error(
          'Failed to fetch market rates from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Transform Warp market rates to our format
      const rates: MarketRate[] = [];

      if (Array.isArray(response.data)) {
        for (const rate of response.data) {
          rates.push({
            from_symbol: rate.fromSymbol || rate.from,
            to_symbol: rate.toSymbol || rate.to,
            rate: rate.rate || rate.exchangeRate,
            timestamp: new Date()
          });
        }
      }

      return this.success(rates);
    } catch (error) {
      return this.handleError('Failed to get market rates', error);
    }
  }

  /**
   * Get trade status from Warp
   * Syncs latest status with Warp API
   */
  async syncTradeStatus(
    tradeId: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<PSPTrade>> {
    try {
      const trade = await this.db.psp_trades.findUnique({
        where: { id: tradeId },
        select: {
          id: true,
          project_id: true,
          warp_trade_id: true
        }
      });

      if (!trade) {
        return this.error('Trade not found', 'NOT_FOUND', 404);
      }

      if (!trade.warp_trade_id) {
        return this.error('No Warp trade ID found', 'INVALID_STATE', 400);
      }

      // Get trade status from Warp
      const warpClient = await WarpClientService.getClientForProject(
        trade.project_id,
        environment
      );

      const response = await warpClient.getTransactionById(trade.warp_trade_id);

      if (!response.success || !response.data) {
        return this.error(
          'Failed to fetch trade status from Warp',
          'WARP_API_ERROR',
          500
        );
      }

      // Update local record
      const updatedTrade = await this.db.psp_trades.update({
        where: { id: tradeId },
        data: {
          status: this.mapWarpTradeStatus(response.data.status),
          destination_amount: response.data.destinationAmount || undefined,
          error_message: response.data.errorMessage || undefined,
          executed_at: response.data.executedAt ? new Date(response.data.executedAt) : undefined,
          updated_at: new Date()
        }
      });

      // Convert Decimal types to strings for PSPTrade
      return this.success({
        ...updatedTrade,
        source_amount: updatedTrade.source_amount.toString(),
        destination_amount: updatedTrade.destination_amount?.toString() || null,
        exchange_rate: updatedTrade.exchange_rate?.toString() || null,
        fee_amount: updatedTrade.fee_amount?.toString() || null
      } as PSPTrade);
    } catch (error) {
      return this.handleError('Failed to sync trade status', error);
    }
  }

  /**
   * Calculate estimated trade output
   * Provides preview of trade before execution
   */
  async estimateTrade(
    projectId: string,
    fromSymbol: string,
    toSymbol: string,
    amount: string,
    environment: PSPEnvironment = 'production'
  ): Promise<ServiceResult<{
    fromSymbol: string;
    toSymbol: string;
    fromAmount: string;
    estimatedToAmount: string;
    rate: string;
    fee?: string;
  }>> {
    try {
      // Get current market rate
      const ratesResult = await this.getMarketRates(projectId, environment);

      if (!ratesResult.success || !ratesResult.data) {
        return this.error('Failed to get market rates', 'RATE_ERROR', 500);
      }

      // Find matching rate
      const matchingRate = ratesResult.data.find(
        r => r.from_symbol === fromSymbol && r.to_symbol === toSymbol
      );

      if (!matchingRate) {
        return this.error(
          `No market rate found for ${fromSymbol} → ${toSymbol}`,
          'RATE_NOT_FOUND',
          404
        );
      }

      const fromAmount = parseFloat(amount);
      const rate = parseFloat(matchingRate.rate);
      const estimatedToAmount = fromAmount * rate;

      return this.success({
        fromSymbol,
        toSymbol,
        fromAmount: amount,
        estimatedToAmount: estimatedToAmount.toString(),
        rate: matchingRate.rate
      });
    } catch (error) {
      return this.handleError('Failed to estimate trade', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Map Warp trade status to our TradeStatus type
   */
  private mapWarpTradeStatus(warpStatus: string): TradeStatus {
    const statusMap: Record<string, TradeStatus> = {
      'pending': 'pending',
      'processing': 'executing',
      'executing': 'executing',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled'
    };

    return statusMap[warpStatus.toLowerCase()] || 'pending';
  }
}

export default TradeService;
