/**
 * PSP Webhooks Routes
 * 
 * Webhook registration and management endpoints.
 * Handles registration with Warp API and event tracking.
 * 
 * Endpoints:
 * - POST   /api/psp/webhooks           - Register new webhook
 * - GET    /api/psp/webhooks           - List webhooks for project
 * - GET    /api/psp/webhooks/:id       - Get specific webhook
 * - PUT    /api/psp/webhooks/:id       - Update webhook configuration
 * - DELETE /api/psp/webhooks/:id       - Delete webhook
 * - GET    /api/psp/webhooks/events    - List webhook events
 * - POST   /api/psp/webhooks/:id/retry - Retry failed webhook events
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebhookService } from '@/services/psp/webhooks/webhookService';
import { logger } from '@/utils/logger';

const webhookService = new WebhookService();

const registerWebhookSchema = {
  body: {
    type: 'object',
    required: ['callbackUrl', 'authUsername', 'authPassword'],
    properties: {
      callbackUrl: { type: 'string', format: 'uri' },
      authUsername: { type: 'string', minLength: 1 },
      authPassword: { type: 'string', minLength: 8 },
      environment: { type: 'string', enum: ['sandbox', 'production'], default: 'production' }
    }
  }
};

const updateWebhookSchema = {
  body: {
    type: 'object',
    properties: {
      callbackUrl: { type: 'string', format: 'uri' },
      authUsername: { type: 'string', minLength: 1 },
      authPassword: { type: 'string', minLength: 8 }
    }
  }
};

export default async function webhooksRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/webhooks
   * Register a new webhook
   */
  fastify.post('/api/psp/webhooks', {
    schema: registerWebhookSchema,
    handler: async (
      request: FastifyRequest<{
        Body: {
          callbackUrl: string;
          authUsername: string;
          authPassword: string;
          environment?: 'sandbox' | 'production';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const { callbackUrl, authUsername, authPassword, environment = 'production' } = request.body;

        const result = await webhookService.registerWebhook(
          { projectId, callbackUrl, authUsername, authPassword },
          environment
        );

        logger.info(`Webhook registered - ID: ${result.id}, Project: ${projectId}`);

        return reply.code(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error(`Failed to register webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to register webhook'
        });
      }
    }
  });

  /**
   * GET /api/psp/webhooks
   * List all webhooks for project
   */
  fastify.get('/api/psp/webhooks', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const webhooks = await webhookService.listWebhooks(projectId);

        return reply.code(200).send({
          success: true,
          data: webhooks
        });
      } catch (error) {
        logger.error(`Failed to list webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list webhooks'
        });
      }
    }
  });

  /**
   * GET /api/psp/webhooks/:id
   * Get specific webhook
   */
  fastify.get('/api/psp/webhooks/:id', {
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const webhook = await webhookService.getWebhook(id);

        if (!webhook) {
          return reply.code(404).send({
            success: false,
            error: 'Webhook not found'
          });
        }

        if (webhook.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Webhook belongs to different project'
          });
        }

        return reply.code(200).send({
          success: true,
          data: webhook
        });
      } catch (error) {
        logger.error(`Failed to get webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get webhook'
        });
      }
    }
  });

  /**
   * PUT /api/psp/webhooks/:id
   * Update webhook configuration
   */
  fastify.put('/api/psp/webhooks/:id', {
    schema: updateWebhookSchema,
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          callbackUrl?: string;
          authUsername?: string;
          authPassword?: string;
          environment?: 'sandbox' | 'production';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        // Verify ownership
        const webhook = await webhookService.getWebhook(id);
        if (!webhook) {
          return reply.code(404).send({
            success: false,
            error: 'Webhook not found'
          });
        }

        if (webhook.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Webhook belongs to different project'
          });
        }

        // Extract environment from body or default to production
        const { environment = 'production', ...updates } = request.body;

        const updated = await webhookService.updateWebhook(id, updates, environment);

        logger.info(`Webhook updated - ID: ${id}, Project: ${projectId}`);

        return reply.code(200).send({
          success: true,
          data: updated
        });
      } catch (error) {
        logger.error(`Failed to update webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update webhook'
        });
      }
    }
  });

  /**
   * DELETE /api/psp/webhooks/:id
   * Delete webhook
   */
  fastify.delete('/api/psp/webhooks/:id', {
    handler: async (
      request: FastifyRequest<{ 
        Params: { id: string };
        Querystring: { environment?: 'sandbox' | 'production' };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;
        const environment = (request.query?.environment as 'sandbox' | 'production') || 'production';

        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        // Verify ownership
        const webhook = await webhookService.getWebhook(id);
        if (!webhook) {
          return reply.code(404).send({
            success: false,
            error: 'Webhook not found'
          });
        }

        if (webhook.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Webhook belongs to different project'
          });
        }

        await webhookService.deleteWebhook(id, environment);

        logger.info(`Webhook deleted - ID: ${id}, Project: ${projectId}`);

        return reply.code(200).send({
          success: true,
          message: 'Webhook deleted successfully'
        });
      } catch (error) {
        logger.error(`Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete webhook'
        });
      }
    }
  });

  /**
   * GET /api/psp/webhooks/events
   * List webhook events with pagination
   */
  fastify.get('/api/psp/webhooks/events', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'delivered', 'failed'] },
          eventName: { type: 'string' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          status?: 'pending' | 'delivered' | 'failed';
          eventName?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const { page = 1, limit = 20, status, eventName } = request.query;
        const offset = (page - 1) * limit;

        const events = await webhookService.getEventLog(projectId, {
          eventName,
          status,
          limit,
          offset
        });

        return reply.code(200).send({
          success: true,
          data: events,
          pagination: {
            page,
            limit,
            total: events.length
          }
        });
      } catch (error) {
        logger.error(`Failed to list webhook events: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list webhook events'
        });
      }
    }
  });

  /**
   * POST /api/psp/webhooks/:id/retry
   * Retry failed webhook events
   */
  fastify.post('/api/psp/webhooks/:id/retry', {
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        // Verify ownership
        const webhook = await webhookService.getWebhook(id);
        if (!webhook) {
          return reply.code(404).send({
            success: false,
            error: 'Webhook not found'
          });
        }

        if (webhook.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Webhook belongs to different project'
          });
        }

        const result = await webhookService.retryFailedDeliveries(projectId);

        logger.info(`Webhook events retried - ID: ${id}, Total: ${result.total}, Retried: ${result.retried}, Failed: ${result.failed}`);

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error(`Failed to retry webhook events: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retry webhook events'
        });
      }
    }
  });
}
