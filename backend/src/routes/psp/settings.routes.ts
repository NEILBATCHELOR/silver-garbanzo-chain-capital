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
          automationEnabled: { type: 'boolean' },
          withdrawalFrequency: { type: 'string', enum: ['continuous', 'on_demand', 'daily', 'weekly'] },
          onrampEnabled: { type: 'boolean' },
          onrampTargetAsset: { type: 'string' },
          onrampTargetNetwork: { type: 'string' },
          onrampTargetWalletId: { type: 'string', format: 'uuid' },
          offrampEnabled: { type: 'boolean' },
          offrampTargetCurrency: { type: 'string' },
          offrampTargetAccountId: { type: 'string', format: 'uuid' },
          defaultFiatRail: { type: 'string', enum: ['ach', 'wire', 'rtp', 'fednow'] }
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

        const body = request.body || {};
        const result = await settingsService.updateSettings(projectId, {
          project_id: projectId,
          automation_enabled: body.automationEnabled,
          withdrawal_frequency: body.withdrawalFrequency,
          onramp_enabled: body.onrampEnabled,
          onramp_target_asset: body.onrampTargetAsset,
          onramp_target_network: body.onrampTargetNetwork,
          onramp_target_wallet_id: body.onrampTargetWalletId,
          offramp_enabled: body.offrampEnabled,
          offramp_target_currency: body.offrampTargetCurrency,
          offramp_target_account_id: body.offrampTargetAccountId,
          default_fiat_rail: body.defaultFiatRail
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
