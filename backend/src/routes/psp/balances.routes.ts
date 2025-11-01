/**
 * PSP Balances Routes
 * 
 * Balance queries and wallet management.
 * 
 * Endpoints:
 * - GET    /api/psp/balances         - Get balances
 * - GET    /api/psp/balances/summary - Get balance summary
 * - GET    /api/psp/wallets          - Get wallets  
 * - POST   /api/psp/balances/sync    - Sync balances with Warp
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BalanceService } from '@/services/psp/accounts/balanceService';
import { logger } from '@/utils/logger';

const balanceService = new BalanceService();

export default async function balancesRoutes(fastify: FastifyInstance) {
  fastify.get('/api/psp/balances', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          virtualAccountId: { type: 'string', format: 'uuid' },
          assetType: { type: 'string', enum: ['fiat', 'crypto'] },
          assetSymbol: { type: 'string' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id?: string; virtualAccountId?: string; assetType?: string; assetSymbol?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        // DEVELOPMENT MODE: project_id required in query params (no API key auth)
        const projectId = request.query.project_id;
        if (!projectId) {
          return reply.code(400).send({ 
            success: false, 
            error: 'project_id query parameter is required' 
          });
        }

        const balances = await balanceService.getBalances(projectId, request.query.virtualAccountId);

        return reply.code(200).send({ success: true, data: balances });
      } catch (error) {
        logger.error({ error }, 'Failed to get balances');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get balances'
        });
      }
    }
  });

  fastify.get('/api/psp/balances/summary', {
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
        // DEVELOPMENT MODE: project_id required in query params (no API key auth)
        const projectId = request.query.project_id;
        if (!projectId) {
          return reply.code(400).send({ 
            success: false, 
            error: 'project_id query parameter is required' 
          });
        }

        const result = await balanceService.getBalances(projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get balance summary'
          });
        }

        const balances = result.data;

        // Separate balances by type
        const fiat_balances = balances.filter((b: any) => b.assetType === 'fiat');
        const crypto_balances = balances.filter((b: any) => b.assetType === 'crypto');

        // Group balances by asset symbol
        const balances_by_asset: Record<string, any[]> = {};
        balances.forEach((balance: any) => {
          const key = balance.assetSymbol;
          if (!balances_by_asset[key]) {
            balances_by_asset[key] = [];
          }
          balances_by_asset[key].push(balance);
        });

        // Calculate total USD value (sum of all available balances)
        // NOTE: This assumes all balances are in USD-equivalent or will be converted
        const total_usd_value = balances.reduce((sum: number, b: any) => {
          return sum + Number(b.availableBalance || 0);
        }, 0);

        // Return summary matching frontend BalancesSummary type
        const summary = {
          total_usd_value,
          fiat_balances,
          crypto_balances,
          balances_by_asset
        };

        return reply.code(200).send({ success: true, data: summary });
      } catch (error) {
        logger.error({ error }, 'Failed to get balance summary');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get balance summary'
        });
      }
    }
  });

  fastify.get('/api/psp/wallets', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id']
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        // DEVELOPMENT MODE: project_id required in query params (no API key auth)
        const projectId = request.query.project_id;
        if (!projectId) {
          return reply.code(400).send({ 
            success: false, 
            error: 'project_id query parameter is required' 
          });
        }

        // For now, return balances grouped as wallets
        // TODO: Add dedicated getWallets method to BalanceService
        const balances = await balanceService.getBalances(projectId);

        return reply.code(200).send({ success: true, data: balances });
      } catch (error) {
        logger.error({ error }, 'Failed to get wallets');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get wallets'
        });
      }
    }
  });

  fastify.post('/api/psp/balances/sync', {
    schema: {
      body: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        },
        required: ['project_id']
      }
    },
    handler: async (
      request: FastifyRequest<{ Body: { project_id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        // DEVELOPMENT MODE: project_id required in request body (no API key auth)
        const projectId = request.body.project_id;
        if (!projectId) {
          return reply.code(400).send({ 
            success: false, 
            error: 'project_id in request body is required' 
          });
        }

        const result = await balanceService.syncBalances(projectId);

        if (!result.success) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error
          });
        }

        logger.info({ projectId, syncedCount: result.data }, 'Balances synced');

        return reply.code(200).send({ success: true, data: { syncedCount: result.data } });
      } catch (error) {
        logger.error({ error }, 'Failed to sync balances');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to sync balances'
        });
      }
    }
  });
}
