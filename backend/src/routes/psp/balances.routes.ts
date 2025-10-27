/**
 * PSP Balances Routes
 * 
 * Balance queries and wallet management.
 * 
 * Endpoints:
 * - GET    /api/psp/balances         - Get balances
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
          virtualAccountId: { type: 'string', format: 'uuid' },
          assetType: { type: 'string', enum: ['fiat', 'crypto'] },
          assetSymbol: { type: 'string' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { virtualAccountId?: string; assetType?: string; assetSymbol?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
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

  fastify.get('/api/psp/wallets', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
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
