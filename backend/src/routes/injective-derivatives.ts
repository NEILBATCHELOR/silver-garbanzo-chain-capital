/**
 * Injective Derivatives Routes - Backend
 * 
 * API endpoints for derivatives trading (perpetuals, futures, options)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DerivativesService } from '../services/derivatives';
import type {
  LaunchPerpetualMarketParams,
  LaunchExpiryFutureParams,
  OpenPositionParams,
  ClosePositionParams,
  GetMarketsParams,
  GetPositionsParams
} from '../services/derivatives/types';

// Request schemas
const launchPerpetualSchema = {
  body: {
    type: 'object',
    required: ['blockchain', 'network', 'ticker', 'quoteDenom', 'oracleBase', 'oracleQuote', 'oracleType', 'initialMarginRatio', 'maintenanceMarginRatio', 'makerFeeRate', 'takerFeeRate', 'minPriceTickSize', 'minQuantityTickSize', 'deployerAddress'],
    properties: {
      projectId: { type: 'string' },
      productId: { type: 'string' },
      blockchain: { type: 'string' },
      network: { type: 'string' },
      ticker: { type: 'string' },
      quoteDenom: { type: 'string' },
      oracleBase: { type: 'string' },
      oracleQuote: { type: 'string' },
      oracleType: { type: 'string', enum: ['BAND', 'PYTH', 'CHAINLINK', 'PROVIDER'] },
      initialMarginRatio: { type: 'string' },
      maintenanceMarginRatio: { type: 'string' },
      makerFeeRate: { type: 'string' },
      takerFeeRate: { type: 'string' },
      minPriceTickSize: { type: 'string' },
      minQuantityTickSize: { type: 'string' },
      fundingInterval: { type: 'number' },
      minFundingRate: { type: 'string' },
      maxFundingRate: { type: 'string' },
      deployerAddress: { type: 'string' },
      privateKey: { type: 'string' },
      useHSM: { type: 'boolean' }
    }
  }
};

const launchFutureSchema = {
  body: {
    type: 'object',
    required: ['blockchain', 'network', 'ticker', 'quoteDenom', 'oracleBase', 'oracleQuote', 'oracleType', 'expiryDate', 'settlementType', 'initialMarginRatio', 'maintenanceMarginRatio', 'makerFeeRate', 'takerFeeRate', 'minPriceTickSize', 'minQuantityTickSize', 'deployerAddress'],
    properties: {
      projectId: { type: 'string' },
      productId: { type: 'string' },
      blockchain: { type: 'string' },
      network: { type: 'string' },
      ticker: { type: 'string' },
      quoteDenom: { type: 'string' },
      oracleBase: { type: 'string' },
      oracleQuote: { type: 'string' },
      oracleType: { type: 'string', enum: ['BAND', 'PYTH', 'CHAINLINK', 'PROVIDER'] },
      expiryDate: { type: 'string' },
      settlementType: { type: 'string', enum: ['physical', 'cash'] },
      initialMarginRatio: { type: 'string' },
      maintenanceMarginRatio: { type: 'string' },
      makerFeeRate: { type: 'string' },
      takerFeeRate: { type: 'string' },
      minPriceTickSize: { type: 'string' },
      minQuantityTickSize: { type: 'string' },
      deployerAddress: { type: 'string' },
      privateKey: { type: 'string' },
      useHSM: { type: 'boolean' }
    }
  }
};

const openPositionSchema = {
  body: {
    type: 'object',
    required: ['marketId', 'userAddress', 'isLong', 'quantity', 'leverage'],
    properties: {
      marketId: { type: 'string' },
      userAddress: { type: 'string' },
      isLong: { type: 'boolean' },
      quantity: { type: 'string' },
      leverage: { type: 'number' },
      price: { type: 'string' },
      orderType: { type: 'string', enum: ['market', 'limit', 'stop_market', 'stop_limit', 'take_profit'] },
      subaccountId: { type: 'string' },
      privateKey: { type: 'string' },
      useHSM: { type: 'boolean' }
    }
  }
};

const closePositionSchema = {
  body: {
    type: 'object',
    required: ['positionId', 'userAddress'],
    properties: {
      positionId: { type: 'string' },
      userAddress: { type: 'string' },
      quantity: { type: 'string' },
      price: { type: 'string' },
      subaccountId: { type: 'string' },
      privateKey: { type: 'string' },
      useHSM: { type: 'boolean' }
    }
  }
};

export default async function derivativesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/injective/derivatives/launch-perpetual
   * Launch a perpetual futures market
   */
  fastify.post<{ Body: LaunchPerpetualMarketParams }>(
    '/api/injective/derivatives/launch-perpetual',
    {
      schema: launchPerpetualSchema
    },
    async (request: FastifyRequest<{ Body: LaunchPerpetualMarketParams }>, reply: FastifyReply) => {
      try {
        const result = await DerivativesService.launchPerpetualMarket(request.body);
        return reply.status(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Error launching perpetual market:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/injective/derivatives/launch-future
   * Launch an expiry futures market
   */
  fastify.post<{ Body: LaunchExpiryFutureParams }>(
    '/api/injective/derivatives/launch-future',
    {
      schema: launchFutureSchema
    },
    async (request: FastifyRequest<{ Body: LaunchExpiryFutureParams }>, reply: FastifyReply) => {
      try {
        const body = {
          ...request.body,
          expiryDate: new Date(request.body.expiryDate as any)
        };
        
        const result = await DerivativesService.launchExpiryFuture(body);
        return reply.status(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Error launching expiry future:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/injective/derivatives/open-position
   * Open a new position
   */
  fastify.post<{ Body: OpenPositionParams }>(
    '/api/injective/derivatives/open-position',
    {
      schema: openPositionSchema
    },
    async (request: FastifyRequest<{ Body: OpenPositionParams }>, reply: FastifyReply) => {
      try {
        const result = await DerivativesService.openPosition(request.body);
        return reply.status(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Error opening position:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/injective/derivatives/close-position
   * Close an existing position
   */
  fastify.post<{ Body: ClosePositionParams }>(
    '/api/injective/derivatives/close-position',
    {
      schema: closePositionSchema
    },
    async (request: FastifyRequest<{ Body: ClosePositionParams }>, reply: FastifyReply) => {
      try {
        const result = await DerivativesService.closePosition(request.body);
        return reply.status(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Error closing position:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/markets
   * Get derivative markets with filters
   */
  fastify.get<{ Querystring: GetMarketsParams }>(
    '/api/injective/derivatives/markets',
    async (request: FastifyRequest<{ Querystring: GetMarketsParams }>, reply: FastifyReply) => {
      try {
        const markets = await DerivativesService.getMarkets(request.query);
        return reply.status(200).send({
          success: true,
          data: markets,
          count: markets.length
        });
      } catch (error) {
        console.error('Error getting markets:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/positions
   * Get derivative positions with filters
   */
  fastify.get<{ Querystring: GetPositionsParams }>(
    '/api/injective/derivatives/positions',
    async (request: FastifyRequest<{ Querystring: GetPositionsParams }>, reply: FastifyReply) => {
      try {
        const positions = await DerivativesService.getPositions(request.query);
        return reply.status(200).send({
          success: true,
          data: positions,
          count: positions.length
        });
      } catch (error) {
        console.error('Error getting positions:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/market-info/:marketId
   * Get detailed market information
   */
  fastify.get<{ 
    Params: { marketId: string };
    Querystring: { blockchain: string; network?: string }
  }>(
    '/api/injective/derivatives/market-info/:marketId',
    async (request, reply) => {
      try {
        const { marketId } = request.params;
        const { blockchain, network = 'testnet' } = request.query;
        
        if (!blockchain) {
          return reply.status(400).send({
            success: false,
            error: 'blockchain parameter is required'
          });
        }
        
        const info = await DerivativesService.getMarketInfo(marketId, blockchain, network);
        return reply.status(200).send({
          success: true,
          data: info
        });
      } catch (error) {
        console.error('Error getting market info:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/funding-rate/:marketId
   * Get funding rate for perpetual market
   */
  fastify.get<{ 
    Params: { marketId: string };
    Querystring: { blockchain: string; network?: string }
  }>(
    '/api/injective/derivatives/funding-rate/:marketId',
    async (request, reply) => {
      try {
        const { marketId } = request.params;
        const { blockchain, network = 'testnet' } = request.query;
        
        if (!blockchain) {
          return reply.status(400).send({
            success: false,
            error: 'blockchain parameter is required'
          });
        }
        
        const fundingRate = await DerivativesService.getFundingRate(marketId, blockchain, network);
        return reply.status(200).send({
          success: true,
          data: fundingRate
        });
      } catch (error) {
        console.error('Error getting funding rate:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/orders
   * Get orders for a user
   */
  fastify.get<{
    Querystring: {
      userAddress: string;
      marketId?: string;
      status?: 'pending' | 'partial' | 'filled' | 'cancelled';
      side?: 'buy' | 'sell';
      blockchain?: string;
      network?: string;
    }
  }>(
    '/api/injective/derivatives/orders',
    async (request, reply) => {
      try {
        const { 
          userAddress, 
          marketId, 
          status, 
          side, 
          blockchain = 'injective', 
          network = 'testnet' 
        } = request.query;

        if (!userAddress) {
          return reply.status(400).send({
            success: false,
            error: 'userAddress parameter is required'
          });
        }

        const orders = await DerivativesService.getOrders({
          userAddress,
          marketId,
          status,
          side,
          blockchain,
          network
        });

        return reply.status(200).send({
          success: true,
          data: orders
        });
      } catch (error) {
        console.error('Error getting orders:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * POST /api/injective/derivatives/cancel-order
   * Cancel an open order
   */
  fastify.post<{
    Body: {
      orderId: string;
      userAddress: string;
      marketId: string;
      blockchain?: string;
      network?: string;
      privateKey: string;
      subaccountId?: string;
    }
  }>(
    '/api/injective/derivatives/cancel-order',
    async (request, reply) => {
      try {
        const { 
          orderId, 
          userAddress, 
          marketId, 
          blockchain = 'injective', 
          network = 'testnet',
          privateKey,
          subaccountId
        } = request.body;

        if (!orderId || !userAddress || !marketId || !privateKey) {
          return reply.status(400).send({
            success: false,
            error: 'orderId, userAddress, marketId, and privateKey are required'
          });
        }

        const result = await DerivativesService.cancelOrder({
          orderId,
          userAddress,
          marketId,
          blockchain,
          network,
          privateKey,
          subaccountId
        });

        return reply.status(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Error cancelling order:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/injective/derivatives/trade-history
   * Get trade history for a user
   */
  fastify.get<{
    Querystring: {
      userAddress: string;
      marketId?: string;
      side?: 'buy' | 'sell';
      blockchain?: string;
      network?: string;
      limit?: number;
      offset?: number;
    }
  }>(
    '/api/injective/derivatives/trade-history',
    async (request, reply) => {
      try {
        const { 
          userAddress, 
          marketId, 
          side, 
          blockchain = 'injective', 
          network = 'testnet',
          limit = 50,
          offset = 0
        } = request.query;

        if (!userAddress) {
          return reply.status(400).send({
            success: false,
            error: 'userAddress parameter is required'
          });
        }

        const trades = await DerivativesService.getTradeHistory({
          userAddress,
          marketId,
          side,
          blockchain,
          network,
          limit,
          offset
        });

        return reply.status(200).send({
          success: true,
          data: trades
        });
      } catch (error) {
        console.error('Error getting trade history:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}
