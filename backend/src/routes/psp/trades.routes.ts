/**
 * PSP Trades Routes
 * 
 * Currency exchange and trading operations.
 * 
 * Endpoints:
 * - POST /api/psp/trades         - Create trade
 * - GET  /api/psp/trades         - List trades
 * - GET  /api/psp/trades/summary - Get trade summary statistics
 * - GET  /api/psp/trades/:id     - Get specific trade
 * - GET  /api/psp/market-rates   - Get current market rates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TradeService } from '@/services/psp/payments/tradeService';
import { logger } from '@/utils/logger';
import type { CreateTradeRequest, ListTradesQuery, MarketRatesQuery } from '@/types/psp/routes';

const tradeService = new TradeService();

export default async function tradesRoutes(fastify: FastifyInstance) {
  fastify.post('/api/psp/trades', {
    schema: {
      body: {
        type: 'object',
        required: ['source', 'destination'],
        properties: {
          source: {
            type: 'object',
            required: ['symbol', 'amount'],
            properties: {
              symbol: { type: 'string' },
              amount: { type: 'string', pattern: '^\\d+(\\.\\d{1,18})?$' },
              network: { type: 'string' }
            }
          },
          destination: {
            type: 'object',
            required: ['symbol'],
            properties: {
              symbol: { type: 'string' },
              network: { type: 'string' }
            }
          },
          virtualAccountId: { type: 'string', format: 'uuid' }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: CreateTradeRequest }>, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await tradeService.executeTrade({
          project_id: projectId,
          source: request.body.source,
          destination: request.body.destination,
          virtual_account_id: request.body.virtualAccountId
        });

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create trade'
          });
        }

        logger.info({ tradeId: result.data.id, projectId }, 'Trade created');

        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to create trade');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create trade'
        });
      }
    }
  });

  fastify.get('/api/psp/trades', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          virtualAccountId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'executing', 'completed', 'failed', 'cancelled'] },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: ListTradesQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await tradeService.listTrades(projectId, request.query);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to list trades'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to list trades');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list trades'
        });
      }
    }
  });

  fastify.get('/api/psp/trades/summary', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = request.query.project_id || (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized - No project context' });
        }

        const result = await tradeService.listTrades(projectId, {});

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get trade summary'
          });
        }

        const trades = result.data;
        const summary = {
          total: trades.length,
          pending: trades.filter((t: any) => t.status === 'pending').length,
          executing: trades.filter((t: any) => t.status === 'executing').length,
          completed: trades.filter((t: any) => t.status === 'completed').length,
          failed: trades.filter((t: any) => t.status === 'failed').length,
          cancelled: trades.filter((t: any) => t.status === 'cancelled').length,
          totalVolume: trades
            .filter((t: any) => t.status === 'completed')
            .reduce((sum: number, t: any) => sum + Number(t.sourceAmount || 0), 0),
          byPair: trades.reduce((acc: Record<string, number>, t: any) => {
            const pair = `${t.sourceSymbol}-${t.destinationSymbol}`;
            acc[pair] = (acc[pair] || 0) + 1;
            return acc;
          }, {})
        };

        return reply.code(200).send({ success: true, data: summary });
      } catch (error) {
        logger.error({ error }, 'Failed to get trade summary');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get trade summary'
        });
      }
    }
  });

  fastify.get('/api/psp/trades/:id', {
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await tradeService.getTrade(id);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 404).send({
            success: false,
            error: result.error || 'Trade not found'
          });
        }

        if (result.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get trade');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get trade'
        });
      }
    }
  });

  fastify.get('/api/psp/market-rates', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: MarketRatesQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await tradeService.getMarketRates(projectId, request.query.from, request.query.to);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get market rates'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get market rates');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get market rates'
        });
      }
    }
  });
}
