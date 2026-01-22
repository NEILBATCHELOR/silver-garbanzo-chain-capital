/**
 * Injective Derivatives Adapter - Backend
 * 
 * Injective-specific implementation for derivatives trading
 * Uses Injective SDK for perpetuals, futures, and options
 * 
 * NOTE: SDK v1.16.12 does not export MsgInstantPerpetualMarketLaunch or MsgInstantExpiryFuturesMarketLaunch
 * These require governance proposals instead. Future SDK versions may add instant launch support.
 */

import { 
  MsgBroadcasterWithPk,
  MsgCreateDerivativeLimitOrder,
  MsgCreateDerivativeMarketOrder,
  MsgCancelDerivativeOrder,
  MsgVote,
  IndexerGrpcDerivativesApi,
  ChainGrpcGovApi,
  getEthereumAddress,
  derivativePriceToChainPriceToFixed,
  derivativeQuantityToChainQuantityToFixed,
  derivativeMarginToChainMarginToFixed
} from '@injectivelabs/sdk-ts';
import { 
  getNetworkEndpoints, 
  Network 
} from '@injectivelabs/networks';
import type {
  LaunchPerpetualMarketParams,
  LaunchExpiryFutureParams,
  OpenPositionParams,
  ClosePositionParams,
  LaunchMarketResult,
  OpenPositionResult,
  ClosePositionResult,
  FundingRateInfo,
  MarketInfo,
  DerivativePosition,
  GetPositionsParams,
  IDerivativesAdapter
} from '../types';

export class InjectiveDerivativesAdapter implements IDerivativesAdapter {
  /**
   * Get network from string
   */
  private getNetwork(network: string): Network {
    switch (network.toLowerCase()) {
      case 'mainnet':
        return Network.Mainnet;
      case 'testnet':
        return Network.Testnet;
      case 'devnet':
        return Network.Devnet;
      default:
        return Network.Testnet;
    }
  }

  /**
   * Launch perpetual futures market
   * 
   * NOTE: Requires governance proposal in SDK v1.16.12
   * Use MsgSubmitProposalPerpetualMarketLaunch via governance
   */
  async launchPerpetualMarket(
    params: LaunchPerpetualMarketParams
  ): Promise<LaunchMarketResult> {
    try {
      // TODO: Implement via governance proposal
      // SDK v1.16.12 does not support instant launch
      // Need to use MsgSubmitProposalPerpetualMarketLaunch
      
      throw new Error(
        'Perpetual market launch via governance not yet implemented. ' +
        'SDK v1.16.12 does not support MsgInstantPerpetualMarketLaunch. ' +
        'Please use governance proposal or upgrade SDK.'
      );
    } catch (error) {
      console.error('Error launching perpetual market:', error);
      throw error;
    }
  }

  /**
   * Launch expiry futures market
   * 
   * NOTE: Requires governance proposal in SDK v1.16.12
   */
  async launchExpiryFuture(
    params: LaunchExpiryFutureParams
  ): Promise<LaunchMarketResult> {
    try {
      // TODO: Implement via governance proposal
      // SDK v1.16.12 does not support instant launch
      
      throw new Error(
        'Expiry futures launch via governance not yet implemented. ' +
        'SDK v1.16.12 does not support MsgInstantExpiryFuturesMarketLaunch. ' +
        'Please use governance proposal or upgrade SDK.'
      );
    } catch (error) {
      console.error('Error launching expiry future:', error);
      throw error;
    }
  }

  /**
   * Open a position (place derivative order)
   */
  async openPosition(params: OpenPositionParams): Promise<OpenPositionResult> {
    try {
      if (!params.privateKey) {
        throw new Error('Private key is required for opening position');
      }

      const network = this.getNetwork(params.network);
      const isLimitOrder = params.orderType === 'limit' && params.price !== undefined;
      
      // Convert address to subaccount ID
      const ethereumAddress = getEthereumAddress(params.userAddress);
      const subaccountIndex = params.subaccountId ? parseInt(params.subaccountId) : 0;
      const suffix = '0'.repeat(23) + subaccountIndex;
      const subaccountId = ethereumAddress + suffix;

      // Calculate margin required
      const quantity = parseFloat(params.quantity);
      const price = parseFloat(params.price || '0');
      const margin = (quantity * price) / params.leverage;

      // Calculate liquidation price
      const liquidationPrice = this.calculateLiquidationPrice(
        params.price || '0',
        params.leverage,
        params.isLong,
        params.maintenanceMarginRatio || '0.025'
      );

      let txResponse: any;
      let positionId: string;

      if (isLimitOrder) {
        // Create limit order
        const msg = MsgCreateDerivativeLimitOrder.fromJSON({
          orderType: params.isLong ? 1 : 2, // 1 = Buy, 2 = Sell
          triggerPrice: '0',
          injectiveAddress: params.userAddress,
          price: derivativePriceToChainPriceToFixed({
            value: price.toString(),
            quoteDecimals: 6 // USDT decimals
          }),
          quantity: derivativeQuantityToChainQuantityToFixed({
            value: quantity.toString()
          }),
          margin: derivativeMarginToChainMarginToFixed({
            value: margin.toString(),
            quoteDecimals: 6
          }),
          marketId: params.marketId,
          feeRecipient: params.userAddress,
          subaccountId
        });

        txResponse = await new MsgBroadcasterWithPk({
          privateKey: params.privateKey,
          network
        }).broadcast({
          msgs: msg
        });

        positionId = `pos_${txResponse.txHash?.substring(0, 20) || Date.now()}`;
      } else {
        // Create market order
        const msg = MsgCreateDerivativeMarketOrder.fromJSON({
          orderType: params.isLong ? 1 : 2,
          triggerPrice: '0',
          injectiveAddress: params.userAddress,
          price: derivativePriceToChainPriceToFixed({
            value: price.toString(),
            quoteDecimals: 6
          }),
          quantity: derivativeQuantityToChainQuantityToFixed({
            value: quantity.toString()
          }),
          margin: derivativeMarginToChainMarginToFixed({
            value: margin.toString(),
            quoteDecimals: 6
          }),
          marketId: params.marketId,
          feeRecipient: params.userAddress,
          subaccountId
        });

        txResponse = await new MsgBroadcasterWithPk({
          privateKey: params.privateKey,
          network
        }).broadcast({
          msgs: msg
        });

        positionId = `pos_${txResponse.txHash?.substring(0, 20) || Date.now()}`;
      }

      // Create position object
      const position: DerivativePosition = {
        id: positionId,
        market_id: params.marketId,
        user_address: params.userAddress,
        blockchain: 'injective',
        network: params.network,
        chain_id: network === Network.Mainnet ? '1776' : '1439',
        is_long: params.isLong,
        entry_price: params.price || '0',
        quantity: params.quantity,
        leverage: params.leverage,
        margin: margin.toString(),
        liquidation_price: liquidationPrice,
        status: 'open',
        opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        positionId,
        txHash: txResponse.txHash || '',
        position,
        requiredMargin: margin.toString(),
        liquidationPrice,
        estimatedFees: this.calculateFees(params.quantity, params.price || '0')
      };
    } catch (error) {
      console.error('Error opening position:', error);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(params: ClosePositionParams): Promise<ClosePositionResult> {
    try {
      if (!params.privateKey) {
        throw new Error('Private key is required for closing position');
      }

      const network = this.getNetwork(params.network);
      
      const ethereumAddress = getEthereumAddress(params.userAddress);
      const subaccountIndex = params.subaccountId ? parseInt(params.subaccountId) : 0;
      const suffix = '0'.repeat(23) + subaccountIndex;
      const subaccountId = ethereumAddress + suffix;

      // Create opposite market order to close position
      const quantity = parseFloat(params.quantity || '0');
      const price = parseFloat(params.price || '0');
      const margin = quantity * price; // Full margin for closing

      const msg = MsgCreateDerivativeMarketOrder.fromJSON({
        orderType: params.isLong ? 2 : 1, // Opposite direction
        triggerPrice: '0',
        injectiveAddress: params.userAddress,
        price: derivativePriceToChainPriceToFixed({
          value: price.toString(),
          quoteDecimals: 6
        }),
        quantity: derivativeQuantityToChainQuantityToFixed({
          value: quantity.toString()
        }),
        margin: derivativeMarginToChainMarginToFixed({
          value: margin.toString(),
          quoteDecimals: 6
        }),
        marketId: params.marketId,
        feeRecipient: params.userAddress,
        subaccountId
      });

      const txResponse = await new MsgBroadcasterWithPk({
        privateKey: params.privateKey,
        network
      }).broadcast({
        msgs: msg
      });

      // Calculate realized PnL (simplified)
      const entryPrice = parseFloat(params.entryPrice || '0');
      const exitPrice = price;
      const pnl = params.isLong 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;

      return {
        positionId: params.positionId,
        txHash: txResponse.txHash || '',
        closedQuantity: quantity.toString(),
        exitPrice: price.toString(),
        realizedPnl: pnl.toString(),
        fees: this.calculateFees(quantity.toString(), price.toString())
      };
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  /**
   * Get market information
   */
  async getMarketInfo(marketId: string, network: string): Promise<MarketInfo> {
    try {
      const networkEnum = this.getNetwork(network);
      const endpoints = getNetworkEndpoints(networkEnum);
      const indexerApi = new IndexerGrpcDerivativesApi(endpoints.indexer);

      // Fetch market details
      const market = await indexerApi.fetchMarket(marketId);
      
      // Fetch orderbook
      const orderbook = await indexerApi.fetchOrderbookV2(marketId);

      // Fetch recent trades
      const trades = await indexerApi.fetchTrades({
        marketId,
        pagination: { limit: 100 }
      });

      // Calculate 24h stats (simplified)
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const recentTrades = (trades.trades || []).filter(
        (t: any) => new Date(t.executedAt).getTime() > oneDayAgo
      );

      const volume24h = recentTrades.reduce(
        (sum: number, t: any) => sum + parseFloat(t.price) * parseFloat(t.quantity),
        0
      );

      const prices = recentTrades.map((t: any) => parseFloat(t.price));
      const high24h = prices.length > 0 ? Math.max(...prices) : 0;
      const low24h = prices.length > 0 ? Math.min(...prices) : 0;

      // Calculate last price from recent trades or use mid-price from orderbook
      let lastPrice = '0';
      if (recentTrades.length > 0) {
        // Access with type assertion since we're filtering from any[] trades
        const latestTrade = recentTrades[0] as any;
        lastPrice = latestTrade?.price || '0';
      } else if (orderbook?.buys?.length && orderbook?.sells?.length) {
        const firstBid = orderbook.buys[0];
        const firstAsk = orderbook.sells[0];
        if (firstBid && firstAsk) {
          const bestBid = parseFloat(firstBid.price);
          const bestAsk = parseFloat(firstAsk.price);
          lastPrice = ((bestBid + bestAsk) / 2).toString();
        }
      }

      // For mark price and index price, use oracle if perpetual market
      // For now, use last price as fallback (should fetch from oracle in production)
      const markPrice = lastPrice;
      const indexPrice = lastPrice;

      // Get open interest from market metadata if available
      // Note: minQuantityTickSize is for order sizing, not open interest
      // Open interest should be fetched separately or from market summary
      const openInterest = '0'; // TODO: Fetch actual open interest

      return {
        marketId,
        ticker: market.ticker || 'Unknown',
        lastPrice,
        markPrice,
        indexPrice,
        volume24h: volume24h.toString(),
        high24h: high24h.toString(),
        low24h: low24h.toString(),
        openInterest,
        orderbook: {
          bids: (orderbook.buys || []).map((b: any) => ({
            price: b.price,
            quantity: b.quantity
          })),
          asks: (orderbook.sells || []).map((s: any) => ({
            price: s.price,
            quantity: s.quantity
          }))
        },
        recentTrades: recentTrades.map((t: any) => ({
          price: t.price,
          quantity: t.quantity,
          side: t.tradeDirection === 'buy' ? 'buy' as const : 'sell' as const,
          timestamp: t.executedAt
        }))
      };
    } catch (error) {
      console.error('Error getting market info:', error);
      throw error;
    }
  }

  /**
   * Get funding rate (perpetuals only)
   */
  async getFundingRate(marketId: string, network: string): Promise<FundingRateInfo> {
    try {
      const networkEnum = this.getNetwork(network);
      const endpoints = getNetworkEndpoints(networkEnum);
      const indexerApi = new IndexerGrpcDerivativesApi(endpoints.indexer);

      // Fetch funding rates
      const fundingRates = await indexerApi.fetchFundingRates({
        marketId,
        pagination: { limit: 1 }
      });

      if (!fundingRates.fundingRates || fundingRates.fundingRates.length === 0) {
        return {
          currentRate: '0',
          nextPaymentTime: new Date(Date.now() + 3600000).toISOString(), // +1 hour
          estimatedPayment: '0'
        };
      }

      const latestRate = fundingRates.fundingRates[0];
      
      // Calculate next payment time (hourly)
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      return {
        currentRate: latestRate?.rate || '0',
        nextPaymentTime: nextHour.toISOString(),
        estimatedPayment: latestRate?.rate || '0' // Simplified
      };
    } catch (error) {
      console.error('Error getting funding rate:', error);
      throw error;
    }
  }

  /**
   * Get positions
   */
  async getPositions(params: GetPositionsParams): Promise<DerivativePosition[]> {
    try {
      const network = this.getNetwork(params.network || 'testnet');
      const endpoints = getNetworkEndpoints(network);
      const indexerApi = new IndexerGrpcDerivativesApi(endpoints.indexer);

      // Fetch positions from indexer
      const positions = await indexerApi.fetchPositions({
        marketId: params.marketId,
        subaccountId: params.userAddress,
        pagination: { limit: 100 }
      });

      // Convert to our format
      return (positions.positions || []).map((p: any) => ({
        id: p.marketId + '_' + p.subaccountId,
        market_id: p.marketId,
        user_address: params.userAddress || '',
        blockchain: 'injective',
        network: params.network || 'testnet',
        chain_id: network === Network.Mainnet ? '1776' : '1439',
        is_long: p.direction === 'long',
        entry_price: p.entryPrice || '0',
        quantity: p.quantity || '0',
        leverage: parseInt(p.leverage || '1'),
        margin: p.margin || '0',
        liquidation_price: '0', // Calculate separately
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        updated_at: p.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  }

  /**
   * Parse oracle type
   */
  private parseOracleType(type: string): number {
    switch (type.toUpperCase()) {
      case 'BAND':
        return 3;
      case 'PYTH':
        return 4;
      case 'CHAINLINK':
        return 5;
      case 'PROVIDER':
        return 10;
      default:
        return 10;
    }
  }

  /**
   * Calculate liquidation price
   */
  private calculateLiquidationPrice(
    entryPrice: string,
    leverage: number,
    isLong: boolean,
    maintenanceMargin: string
  ): string {
    const entry = parseFloat(entryPrice);
    const maintenance = parseFloat(maintenanceMargin);
    
    if (isLong) {
      // Long liquidation: entry * (1 - 1/leverage + maintenance)
      return (entry * (1 - 1/leverage + maintenance)).toString();
    } else {
      // Short liquidation: entry * (1 + 1/leverage - maintenance)
      return (entry * (1 + 1/leverage - maintenance)).toString();
    }
  }

  /**
   * Calculate estimated fees
   */
  private calculateFees(quantity: string, price: string): string {
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    const takerFee = 0.002; // 0.2% taker fee
    return (qty * px * takerFee).toString();
  }

  /**
   * Get orders for a user
   */
  async getOrders(params: {
    userAddress: string;
    marketId?: string;
    status?: 'pending' | 'partial' | 'filled' | 'cancelled';
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
  }): Promise<any[]> {
    try {
      const network = this.getNetwork(params.network);
      const endpoints = getNetworkEndpoints(network);
      const indexerGrpcDerivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);

      // Get subaccount ID
      const ethereumAddress = getEthereumAddress(params.userAddress);
      const subaccountId = ethereumAddress + '0'.repeat(24);

      // Query orders from Injective
      const { orders } = await indexerGrpcDerivativesApi.fetchOrders({
        subaccountId,
        marketId: params.marketId,
      });

      // Transform and filter orders
      return orders
        .filter((order: any) => {
          if (params.status && order.state?.toLowerCase() !== params.status) return false;
          if (params.side) {
            const isBuy = order.orderType === 'buy' || order.orderType === 1;
            if ((params.side === 'buy' && !isBuy) || (params.side === 'sell' && isBuy)) {
              return false;
            }
          }
          return true;
        })
        .map((order: any) => ({
          orderId: order.orderHash || order.hash,
          marketId: order.marketId,
          ticker: order.ticker || params.marketId,
          side: (order.orderType === 'buy' || order.orderType === 1) ? 'buy' : 'sell',
          orderType: order.triggerPrice === '0' ? 'limit' : 'stop',
          quantity: order.quantity,
          price: order.price,
          filledQuantity: order.filledQuantity || '0',
          status: this.getOrderStatus(order),
          createdAt: order.createdAt ? new Date(order.createdAt * 1000).toISOString() : new Date().toISOString(),
        }));
    } catch (error) {
      console.error('Error getting orders:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(params: {
    orderId: string;
    userAddress: string;
    marketId: string;
    blockchain: string;
    network: string;
    privateKey: string;
    subaccountId?: string;
  }): Promise<{ orderId: string; txHash: string }> {
    try {
      const network = this.getNetwork(params.network);
      
      // Get subaccount ID
      const ethereumAddress = getEthereumAddress(params.userAddress);
      const subaccountIndex = params.subaccountId ? parseInt(params.subaccountId) : 0;
      const suffix = '0'.repeat(23) + subaccountIndex;
      const subaccountId = ethereumAddress + suffix;

      // Create cancel order message
      const msg = MsgCancelDerivativeOrder.fromJSON({
        injectiveAddress: params.userAddress,
        marketId: params.marketId,
        subaccountId,
        orderHash: params.orderId,
      });

      // Broadcast transaction
      const txResponse = await new MsgBroadcasterWithPk({
        privateKey: params.privateKey,
        network,
      }).broadcast({
        msgs: msg,
      });

      return {
        orderId: params.orderId,
        txHash: txResponse.txHash,
      };
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get trade history for a user
   */
  async getTradeHistory(params: {
    userAddress: string;
    marketId?: string;
    side?: 'buy' | 'sell';
    blockchain: string;
    network: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const network = this.getNetwork(params.network);
      const endpoints = getNetworkEndpoints(network);
      const indexerGrpcDerivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);

      // Get subaccount ID
      const ethereumAddress = getEthereumAddress(params.userAddress);
      const subaccountId = ethereumAddress + '0'.repeat(24);

      // Query trades from Injective
      const { trades } = await indexerGrpcDerivativesApi.fetchTrades({
        subaccountId,
        marketId: params.marketId,
      });

      // Transform and filter trades
      return trades
        .filter((trade: any) => {
          if (params.side) {
            const isBuy = trade.orderType === 'buy' || trade.tradeDirection === 'buy';
            if ((params.side === 'buy' && !isBuy) || (params.side === 'sell' && isBuy)) {
              return false;
            }
          }
          return true;
        })
        .slice(params.offset || 0, (params.offset || 0) + (params.limit || 50))
        .map((trade: any) => ({
          tradeId: trade.tradeId || trade.orderHash,
          marketId: trade.marketId,
          ticker: trade.ticker || params.marketId,
          side: (trade.orderType === 'buy' || trade.tradeDirection === 'buy') ? 'buy' : 'sell',
          quantity: trade.quantity || trade.executedQuantity,
          price: trade.price || trade.executionPrice,
          fee: trade.fee || '0',
          pnl: trade.pnl || undefined,
          timestamp: trade.executedAt ? new Date(trade.executedAt).toISOString() : new Date().toISOString(),
          txHash: trade.tradeExecutionType || trade.txHash || '',
        }));
    } catch (error) {
      console.error('Error getting trade history:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  }

  /**
   * Helper to get order status
   */
  private getOrderStatus(order: any): 'pending' | 'partial' | 'filled' | 'cancelled' {
    const state = typeof order.state === 'string' ? order.state.toLowerCase() : '';
    const status = typeof order.status === 'string' ? order.status.toLowerCase() : '';
    
    if (state === 'canceled' || state === 'cancelled' || status === 'canceled' || status === 'cancelled') {
      return 'cancelled';
    }
    if (state === 'filled' || status === 'filled') {
      return 'filled';
    }
    if (order.filledQuantity && parseFloat(order.filledQuantity) > 0) {
      return 'partial';
    }
    return 'pending';
  }

  // ==========================================================================
  // GOVERNANCE PROPOSAL METHODS
  // ==========================================================================

  /**
   * Launch perpetual market via governance proposal
   * 
   * NOTE: This requires manual governance proposal submission through Injective Hub
   * SDK v1.16.12 does not provide programmatic proposal submission for market launch
   * 
   * Instructions:
   * 1. Go to https://hub.injective.network/governance
   * 2. Click "Submit Proposal"
   * 3. Select "Perpetual Market Launch Proposal"
   * 4. Fill in the parameters from this function
   * 5. Submit and vote
   * 
   * This method provides the proposal parameters that should be used.
   */
  async launchPerpetualMarketViaGovernance(params: LaunchPerpetualMarketParams & {
    title: string;
    description: string;
    deposit: string;
    proposer: string;
    privateKey: string;
  }): Promise<{
    proposalId: string;
    txHash: string;
    votingEndTime: Date;
    proposalParameters: any;
  }> {
    // Return proposal parameters for manual submission
    const proposalParameters = {
      title: params.title,
      description: params.description,
      ticker: params.ticker,
      quoteDenom: params.quoteDenom,
      oracleBase: params.oracleBase,
      oracleQuote: params.oracleQuote,
      oracleType: params.oracleType,
      oracleScaleFactor: 6,
      initialMarginRatio: params.initialMarginRatio,
      maintenanceMarginRatio: params.maintenanceMarginRatio,
      makerFeeRate: params.makerFeeRate,
      takerFeeRate: params.takerFeeRate,
      minPriceTickSize: params.minPriceTickSize,
      minQuantityTickSize: params.minQuantityTickSize,
      fundingInterval: params.fundingInterval || 3600,
      minFundingRate: params.minFundingRate || '-0.001',
      maxFundingRate: params.maxFundingRate || '0.001',
    };

    throw new Error(
      'Governance proposal submission must be done through Injective Hub. ' +
      'Please visit https://hub.injective.network/governance and submit a ' +
      '"Perpetual Market Launch Proposal" with the parameters provided in this error. ' +
      'Proposal parameters: ' + JSON.stringify(proposalParameters, null, 2)
    );
  }

  /**
   * Vote on governance proposal
   */
  async voteOnProposal(params: {
    proposalId: string;
    voter: string;
    option: 'yes' | 'no' | 'abstain' | 'no_with_veto';
    privateKey: string;
    network: string;
  }): Promise<{ txHash: string }> {
    try {
      const network = this.getNetwork(params.network);
      
      // Map vote options to Cosmos SDK vote option numbers
      const voteOptionMap: Record<string, number> = {
        yes: 1,
        abstain: 2,
        no: 3,
        no_with_veto: 4
      };

      const voteOption = voteOptionMap[params.option];
      if (!voteOption) {
        throw new Error(`Invalid vote option: ${params.option}`);
      }

      // Convert proposalId to number
      const proposalIdNumber = parseInt(params.proposalId, 10);
      if (isNaN(proposalIdNumber)) {
        throw new Error('Invalid proposal ID');
      }

      const voteMsg = MsgVote.fromJSON({
        proposalId: proposalIdNumber,
        voter: params.voter,
        vote: voteOption
      });

      const txResponse = await new MsgBroadcasterWithPk({
        privateKey: params.privateKey,
        network
      }).broadcast({
        msgs: voteMsg
      });

      return {
        txHash: txResponse.txHash
      };
    } catch (error) {
      console.error('Error voting on proposal:', error);
      throw error;
    }
  }

  /**
   * Check proposal status
   */
  async getProposalStatus(
    proposalId: string,
    network: string
  ): Promise<{
    status: 'voting' | 'passed' | 'rejected' | 'failed';
    yesVotes: string;
    noVotes: string;
    abstainVotes: string;
    vetoVotes: string;
    endTime: Date;
  }> {
    try {
      const networkConfig = this.getNetwork(network);
      const endpoints = getNetworkEndpoints(networkConfig);
      const chainGrpcGovApi = new ChainGrpcGovApi(endpoints.grpc);
      
      // Convert proposalId to number
      const proposalIdNumber = parseInt(proposalId, 10);
      if (isNaN(proposalIdNumber)) {
        throw new Error('Invalid proposal ID');
      }

      const proposal = await chainGrpcGovApi.fetchProposal(proposalIdNumber);
      
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      return {
        status: this.mapProposalStatus(proposal.status),
        yesVotes: proposal.finalTallyResult?.yesCount || '0',
        noVotes: proposal.finalTallyResult?.noCount || '0',
        abstainVotes: proposal.finalTallyResult?.abstainCount || '0',
        vetoVotes: proposal.finalTallyResult?.noWithVetoCount || '0',
        endTime: new Date(proposal.votingEndTime || Date.now())
      };
    } catch (error) {
      console.error('Error getting proposal status:', error);
      throw error;
    }
  }

  /**
   * Map proposal status from chain to our format
   */
  private mapProposalStatus(status: any): 'voting' | 'passed' | 'rejected' | 'failed' {
    // Injective proposal status codes
    const statusNum = typeof status === 'number' ? status : parseInt(status, 10);
    switch (statusNum) {
      case 2: return 'voting';
      case 3: return 'passed';
      case 4: return 'rejected';
      case 5: return 'failed';
      default: return 'voting';
    }
  }
}
