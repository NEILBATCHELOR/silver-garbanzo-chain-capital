/**
 * PSP Payments Routes
 * 
 * Payment creation and management for fiat and crypto rails.
 * 
 * Endpoints:
 * - POST   /api/psp/payments/fiat   - Create fiat payment
 * - POST   /api/psp/payments/crypto - Create crypto payment
 * - GET    /api/psp/payments        - List payments
 * - GET    /api/psp/payments/:id    - Get specific payment
 * - DELETE /api/psp/payments/:id    - Cancel payment
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '@/services/psp/payments/paymentService';
import { FiatPaymentService } from '@/services/psp/payments/fiatPaymentService';
import { CryptoPaymentService } from '@/services/psp/payments/cryptoPaymentService';
import { logger } from '@/utils/logger';
import type { 
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest,
  ListPaymentsQuery
} from '@/types/psp/routes';

const paymentService = new PaymentService();
const fiatPaymentService = new FiatPaymentService();
const cryptoPaymentService = new CryptoPaymentService();

export default async function paymentsRoutes(fastify: FastifyInstance) {
  fastify.post('/api/psp/payments/fiat', {
    schema: {
      body: {
        type: 'object',
        required: ['sourceWalletId', 'destinationAccountId', 'amount', 'currency'],
        properties: {
          sourceWalletId: { type: 'string', format: 'uuid' },
          destinationAccountId: { type: 'string', format: 'uuid' },
          amount: { type: 'string', pattern: '^\\d+(\\.\\d{1,18})?$' },
          currency: { type: 'string', enum: ['USD'] },
          paymentRail: { type: 'string', enum: ['ach', 'wire', 'rtp', 'fednow'] },
          memo: { type: 'string' },
          idempotencyKey: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: CreateFiatPaymentRequest }>, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await fiatPaymentService.createFiatPayment({
          project_id: projectId,
          source: {
            wallet_id: request.body.sourceWalletId,
            virtual_account_id: undefined
          },
          destination: {
            external_account_id: request.body.destinationAccountId
          },
          amount: request.body.amount,
          payment_rail: request.body.paymentRail,
          memo: request.body.memo,
          idempotency_key: request.body.idempotencyKey
        });

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create fiat payment'
          });
        }

        logger.info({ paymentId: result.data.id, projectId }, 'Fiat payment created');

        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to create fiat payment');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create fiat payment'
        });
      }
    }
  });

  fastify.post('/api/psp/payments/crypto', {
    schema: {
      body: {
        type: 'object',
        required: ['sourceWalletId', 'destinationAccountId', 'amount', 'currency', 'network'],
        properties: {
          sourceWalletId: { type: 'string', format: 'uuid' },
          destinationAccountId: { type: 'string', format: 'uuid' },
          amount: { type: 'string', pattern: '^\\d+(\\.\\d{1,18})?$' },
          currency: { type: 'string' },
          network: { type: 'string' },
          memo: { type: 'string' },
          idempotencyKey: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Body: CreateCryptoPaymentRequest }>, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await cryptoPaymentService.createCryptoPayment({
          project_id: projectId,
          source: {
            wallet_id: request.body.sourceWalletId,
            virtual_account_id: undefined
          },
          destination: {
            external_account_id: request.body.destinationAccountId
          },
          amount: request.body.amount,
          asset: request.body.currency,
          network: request.body.network,
          memo: request.body.memo,
          idempotency_key: request.body.idempotencyKey
        });

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to create crypto payment'
          });
        }

        logger.info({ paymentId: result.data.id, projectId }, 'Crypto payment created');

        return reply.code(201).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to create crypto payment');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create crypto payment'
        });
      }
    }
  });

  fastify.get('/api/psp/payments', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
          paymentType: { type: 'string' },
          direction: { type: 'string', enum: ['inbound', 'outbound'] },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: ListPaymentsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const { dateFrom, dateTo, paymentType, status, ...otherParams } = request.query;
        const options = {
          ...otherParams,
          paymentType: paymentType as any, // Type narrowing from validated schema enum
          status: status as any, // Type narrowing from validated schema enum
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined
        };

        const result = await paymentService.listPayments(projectId, options);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to list payments'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to list payments');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list payments'
        });
      }
    }
  });

  fastify.get('/api/psp/payments/:id', {
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

        const result = await paymentService.getPayment(id);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 404).send({
            success: false,
            error: result.error || 'Payment not found'
          });
        }

        if (result.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get payment');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get payment'
        });
      }
    }
  });

  fastify.delete('/api/psp/payments/:id', {
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

        const getResult = await paymentService.getPayment(id);
        
        if (!getResult.success || !getResult.data) {
          return reply.code(getResult.statusCode || 404).send({
            success: false,
            error: getResult.error || 'Payment not found'
          });
        }

        if (getResult.data.project_id !== projectId) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }

        const result = await paymentService.cancelPayment(id, projectId);

        if (!result.success) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to cancel payment'
          });
        }

        logger.info({ paymentId: id, projectId }, 'Payment cancelled');

        return reply.code(200).send({ success: true, message: 'Payment cancelled successfully' });
      } catch (error) {
        logger.error({ error }, 'Failed to cancel payment');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel payment'
        });
      }
    }
  });
}
