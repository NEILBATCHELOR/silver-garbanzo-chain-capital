/**
 * PSP External Accounts Routes
 * 
 * External account management for ACH, Wire, and Crypto accounts.
 * 
 * Endpoints:
 * - POST   /api/psp/external-accounts/ach    - Create ACH account
 * - POST   /api/psp/external-accounts/wire   - Create Wire account
 * - POST   /api/psp/external-accounts/crypto - Create Crypto account
 * - POST   /api/psp/external-accounts/plaid  - Create Plaid-linked account
 * - GET    /api/psp/external-accounts/fiat   - List fiat accounts
 * - GET    /api/psp/external-accounts/crypto - List crypto accounts
 * - GET    /api/psp/external-accounts/:id    - Get specific account
 * - DELETE /api/psp/external-accounts/:id    - Deactivate account
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExternalAccountService } from '@/services/psp/accounts/externalAccountService';
import { logger } from '@/utils/logger';
import type {
  CreateAchAccountRequestBody,
  CreateWireAccountRequestBody,
  CreateCryptoAccountRequestBody,
  AccountParamsRequest
} from '@/types/psp/external-accounts-requests';
import type { Address } from '@/types/psp';

const externalAccountService = new ExternalAccountService();

export default async function externalAccountsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/external-accounts/ach
   * Create ACH account
   */
  fastify.post<{ Body: CreateAchAccountRequestBody }>('/api/psp/external-accounts/ach', {
    schema: {
      body: {
        type: 'object',
        required: ['routingNumber', 'accountNumber', 'accountType', 'description'],
        properties: {
          routingNumber: { type: 'string', pattern: '^[0-9]{9}$' },
          accountNumber: { type: 'string', minLength: 4, maxLength: 17 },
          accountType: { type: 'string', enum: ['checking', 'savings'] },
          accountHolderName: { type: 'string' },
          bankName: { type: 'string' },
          description: { type: 'string', minLength: 1 }
        }
      }
    },
    handler: async (request, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const userId = (request.user as any)?.id || 'system';
        const environment = ((request.user as any)?.environment as 'sandbox' | 'production') || 'production';
        
        const body = request.body;

        const result = await externalAccountService.createAchAccount({
          project_id: projectId,
          routing_number: body.routingNumber,
          account_number: body.accountNumber,
          account_classification: body.accountType,
          account_holder_name: body.accountHolderName,
          bank_name: body.bankName,
          description: body.description
        }, environment, userId);

        if (!result.success || !result.data) {
          logger.error({ error: result.error, projectId }, 'Failed to create ACH account');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create ACH account'
          });
        }

        logger.info({ accountId: result.data.id, projectId }, 'ACH account created');
        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to create ACH account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create ACH account'
        });
      }
    }
  });

  /**
   * POST /api/psp/external-accounts/wire
   * Create Wire account
   */
  fastify.post<{ Body: CreateWireAccountRequestBody }>('/api/psp/external-accounts/wire', {
    schema: {
      body: {
        type: 'object',
        required: ['routingNumber', 'accountNumber', 'description'],
        properties: {
          routingNumber: { type: 'string', pattern: '^[0-9]{9}$' },
          accountNumber: { type: 'string', minLength: 4, maxLength: 17 },
          accountHolderName: { type: 'string' },
          bankName: { type: 'string' },
          receiverAddress: { type: 'string' },
          bankAddress: { type: 'string' },
          description: { type: 'string', minLength: 1 }
        }
      }
    },
    handler: async (request, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const userId = (request.user as any)?.id || 'system';
        const environment = ((request.user as any)?.environment as 'sandbox' | 'production') || 'production';
        
        const body = request.body;

        // Parse addresses from strings
        const receiverAddress: Address = {
          street1: body.receiverAddress || 'Not Provided',
          city: 'Not Provided',
          state: 'N/A',
          postalCode: '00000',
          country: 'US'
        };

        const receiverBankAddress: Address = {
          street1: body.bankAddress || 'Not Provided',
          city: 'Not Provided',
          state: 'N/A',
          postalCode: '00000',
          country: 'US'
        };

        const result = await externalAccountService.createWireAccount({
          project_id: projectId,
          routing_number: body.routingNumber,
          account_number: body.accountNumber,
          receiver_name: body.accountHolderName || 'Account Holder',
          receiver_address: receiverAddress,
          receiver_bank_name: body.bankName || 'Unknown Bank',
          receiver_bank_address: receiverBankAddress,
          description: body.description
        }, environment, userId);

        if (!result.success || !result.data) {
          logger.error({ error: result.error, projectId }, 'Failed to create Wire account');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create Wire account'
          });
        }

        logger.info({ accountId: result.data.id, projectId }, 'Wire account created');
        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to create Wire account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create Wire account'
        });
      }
    }
  });

  /**
   * POST /api/psp/external-accounts/crypto
   * Create Crypto account
   */
  fastify.post<{ Body: CreateCryptoAccountRequestBody }>('/api/psp/external-accounts/crypto', {
    schema: {
      body: {
        type: 'object',
        required: ['walletAddress', 'network', 'description'],
        properties: {
          walletAddress: { type: 'string', minLength: 26 },
          network: { type: 'string' },
          description: { type: 'string', minLength: 1 }
        }
      }
    },
    handler: async (request, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const environment = ((request.user as any)?.environment as 'sandbox' | 'production') || 'production';
        
        const body = request.body;

        const result = await externalAccountService.createCryptoAccount({
          project_id: projectId,
          wallet_address: body.walletAddress,
          network: body.network,
          description: body.description
        }, environment);

        if (!result.success || !result.data) {
          logger.error({ error: result.error, projectId }, 'Failed to create Crypto account');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create Crypto account'
          });
        }

        logger.info({ accountId: result.data.id, projectId }, 'Crypto account created');
        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to create Crypto account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create Crypto account'
        });
      }
    }
  });

  /**
   * GET /api/psp/external-accounts/fiat
   * List fiat accounts
   */
  fastify.get('/api/psp/external-accounts/fiat', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await externalAccountService.listFiatAccounts(projectId);

        if (!result.success || !result.data) {
          logger.error({ error: result.error, projectId }, 'Failed to list fiat accounts');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to list fiat accounts'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to list fiat accounts');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list fiat accounts'
        });
      }
    }
  });

  /**
   * GET /api/psp/external-accounts/crypto
   * List crypto accounts
   */
  fastify.get('/api/psp/external-accounts/crypto', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await externalAccountService.listCryptoAccounts(projectId);

        if (!result.success || !result.data) {
          logger.error({ error: result.error, projectId }, 'Failed to list crypto accounts');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to list crypto accounts'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to list crypto accounts');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list crypto accounts'
        });
      }
    }
  });

  /**
   * GET /api/psp/external-accounts/:id
   * Get specific account
   */
  fastify.get<AccountParamsRequest>('/api/psp/external-accounts/:id', {
    handler: async (request, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await externalAccountService.getAccount(id, projectId);

        if (!result.success || !result.data) {
          if (result.statusCode === 404) {
            return reply.code(404).send({ success: false, error: 'Account not found' });
          }
          logger.error({ error: result.error, accountId: id, projectId }, 'Failed to get account');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get account'
          });
        }

        if (result.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to get account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get account'
        });
      }
    }
  });

  /**
   * DELETE /api/psp/external-accounts/:id
   * Deactivate account
   */
  fastify.delete<AccountParamsRequest>('/api/psp/external-accounts/:id', {
    handler: async (request, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // First get the account to verify ownership
        const getResult = await externalAccountService.getAccount(id, projectId);
        if (!getResult.success || !getResult.data) {
          return reply.code(404).send({ success: false, error: 'Account not found' });
        }

        if (getResult.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        const result = await externalAccountService.deactivateAccount(id, projectId);

        if (!result.success) {
          logger.error({ error: result.error, accountId: id, projectId }, 'Failed to deactivate account');
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to deactivate account'
          });
        }

        logger.info({ accountId: id, projectId }, 'Account deactivated');
        return reply.code(200).send({ success: true, message: 'Account deactivated successfully' });
      } catch (error) {
        logger.error({ error, projectId: (request.user as any)?.project_id }, 'Failed to deactivate account');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to deactivate account'
        });
      }
    }
  });
}
