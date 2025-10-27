/**
 * PSP Transactions Routes
 * 
 * Transaction history and reporting endpoints.
 * 
 * Endpoints:
 * - GET /api/psp/transactions        - List transactions
 * - GET /api/psp/transactions/:id    - Get specific transaction
 * - GET /api/psp/transactions/export - Export transactions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransactionHistoryService } from '@/services/psp/reporting/transactionHistoryService';
import { logger } from '@/utils/logger';
import type { ListTransactionsQuery, ExportTransactionsQuery } from '@/types/psp/routes';

const transactionService = new TransactionHistoryService();

export default async function transactionsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/psp/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          type: { type: 'string', enum: ['payment', 'trade', 'all'] },
          status: { type: 'string' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: ListTransactionsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const { dateFrom, dateTo, status, ...otherParams } = request.query;
        const query = {
          project_id: projectId,
          ...otherParams,
          status: status as any, // Type narrowing from validated schema
          start_date: dateFrom ? new Date(dateFrom) : undefined,
          end_date: dateTo ? new Date(dateTo) : undefined
        };

        const result = await transactionService.getTransactionHistory(query);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get transactions'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get transactions');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get transactions'
        });
      }
    }
  });

  fastify.get('/api/psp/transactions/:id', {
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

        const result = await transactionService.getTransaction(id, projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 404).send({
            success: false,
            error: result.error || 'Transaction not found'
          });
        }

        // Authorization check is already handled by getTransaction
        // which filters by projectId in the query

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get transaction');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get transaction'
        });
      }
    }
  });

  fastify.get('/api/psp/transactions/export', {
    schema: {
      querystring: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'pdf'] },
          type: { type: 'string', enum: ['payment', 'trade'] },
          status: { type: 'string' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: ExportTransactionsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const { format, dateFrom, dateTo, ...otherParams } = request.query;
        const options = {
          ...otherParams,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined
        };

        const result = await transactionService.exportTransactionHistory(
          projectId, 
          format || 'csv', 
          options
        );

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to export transactions'
          });
        }

        // Set appropriate headers for file download
        const contentType = format === 'csv' ? 'text/csv' : 'application/pdf';
        const filename = `transactions_${new Date().toISOString()}.${format}`;

        return reply
          .header('Content-Type', contentType)
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(result.data);
      } catch (error) {
        logger.error({ error }, 'Failed to export transactions');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export transactions'
        });
      }
    }
  });
}
