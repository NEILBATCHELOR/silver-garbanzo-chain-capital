/**
 * PSP Settings Routes
 * 
 * Payment settings and automation configuration.
 * 
 * Endpoints:
 * - GET /api/psp/settings     - Get payment settings
 * - PUT /api/psp/settings     - Update payment settings
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SettingsService } from '@/services/psp/automation/settingsService';
import { logger } from '@/utils/logger';
import type { UpdatePaymentSettingsRequest } from '@/types/psp/routes';

const settingsService = new SettingsService();

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/psp/settings', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await settingsService.getSettings(projectId);

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to get payment settings'
          });
        }

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to get payment settings');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get payment settings'
        });
      }
    }
  });

  fastify.put('/api/psp/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          automation_enabled: { type: 'boolean' },
          withdrawal_frequency: { type: 'string', enum: ['continuous', 'on_demand', 'daily', 'weekly'] },
          onramp_enabled: { type: 'boolean' },
          onramp_target_asset: { type: 'string' },
          onramp_target_network: { type: 'string' },
          onramp_target_wallet_id: { type: 'string', format: 'uuid' },
          offramp_enabled: { type: 'boolean' },
          offramp_target_currency: { type: 'string' },
          offramp_target_account_id: { type: 'string', format: 'uuid' },
          default_fiat_rail: { type: 'string', enum: ['ach', 'wire', 'rtp', 'fednow'] }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Body: UpdatePaymentSettingsRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        const result = await settingsService.updateSettings(projectId, {
          project_id: projectId,
          ...request.body
        });

        if (!result.success || !result.data) {
          return reply.code(result.statusCode || 500).send({
            success: false,
            error: result.error || 'Failed to update payment settings'
          });
        }

        logger.info({ projectId }, 'Payment settings updated');

        return reply.code(200).send({ success: true, data: result.data });
      } catch (error) {
        logger.error({ error }, 'Failed to update payment settings');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update payment settings'
        });
      }
    }
  });
}
