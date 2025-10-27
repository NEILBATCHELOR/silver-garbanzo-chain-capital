/**
 * PSP Virtual Accounts Routes
 * 
 * Virtual account creation and management.
 * 
 * Endpoints:
 * - POST /api/psp/virtual-accounts                 - Create virtual account
 * - GET  /api/psp/virtual-accounts                 - List virtual accounts
 * - GET  /api/psp/virtual-accounts/:id             - Get specific virtual account
 * - GET  /api/psp/virtual-accounts/:id/deposit     - Get deposit instructions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VirtualAccountService } from '@/services/psp/accounts/virtualAccountService';
import { logger } from '@/utils/logger';
import type { CreateVirtualAccountRequest } from '@/types/psp/routes';

const virtualAccountService = new VirtualAccountService();

export default async function virtualAccountsRoutes(fastify: FastifyInstance) {
  fastify.post('/api/psp/virtual-accounts', {
    schema: {
      body: {
        type: 'object',
        required: ['accountName', 'accountType'],
        properties: {
          accountName: { type: 'string', minLength: 1 },
          accountType: { type: 'string', enum: ['individual', 'business'] },
          identityCaseId: { type: 'string', format: 'uuid' }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: CreateVirtualAccountRequest }>, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await virtualAccountService.createVirtualAccount({
          project_id: projectId,
          account_name: request.body.accountName,
          account_type: request.body.accountType,
          identity_case_id: request.body.identityCaseId
        });

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create virtual account'
          });
        }

        logger.info({ accountId: result.data.id, projectId }, 'Virtual account created');

        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to create virtual account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create virtual account'
        });
      }
    }
  });

  fastify.get('/api/psp/virtual-accounts', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await virtualAccountService.listVirtualAccounts(projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to list virtual accounts'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to list virtual accounts');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list virtual accounts'
        });
      }
    }
  });

  fastify.get('/api/psp/virtual-accounts/:id', {
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

        const result = await virtualAccountService.getVirtualAccount(id, projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 404).send({
            success: false,
            error: result.error || 'Virtual account not found'
          });
        }

        if (result.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get virtual account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get virtual account'
        });
      }
    }
  });

  fastify.get('/api/psp/virtual-accounts/:id/deposit', {
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

        const result = await virtualAccountService.getDepositInstructions(id, projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 404).send({
            success: false,
            error: result.error || 'Deposit instructions not found'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get deposit instructions');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get deposit instructions'
        });
      }
    }
  });
}
