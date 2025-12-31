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
import { getDatabase } from '@/infrastructure/database/client';

const webhookService = new WebhookService();

/**
 * Helper to extract and validate project_id
 * Checks query params first, then request body, then validates access
 */
async function getAndValidateProjectId(
  request: FastifyRequest<{ 
    Querystring?: { project_id?: string };
    Body?: any;
  }>,
  reply: FastifyReply
): Promise<string | null> {
  // Extract project_id from query params or body
  const projectId = 
    (request.query as any)?.project_id || 
    (request.body as any)?.project_id;

  if (!projectId) {
    logger.error({ url: request.url }, 'Missing project_id in request');
    reply.code(400).send({
      success: false,
      error: 'project_id is required'
    });
    return null;
  }

  // Get user from JWT token
  const user = (request as any).user;
  if (!user || !user.sub) {
    logger.error({ projectId }, 'No user context in JWT token');
    reply.code(401).send({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
    return null;
  }

  // Verify user has access to this project
  try {
    const prisma = getDatabase(); // Get database instance when needed
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        // Verify user is member of the organization that owns this project
        organizations: {
          user_organization_roles: {
            some: {
              user_id: user.sub
            }
          }
        }
      }
    });

    if (!project) {
      logger.error({ projectId, userId: user.sub }, 'User does not have access to project');
      reply.code(403).send({
        success: false,
        error: 'Forbidden - No access to this project'
      });
      return null;
    }

    return projectId;
  } catch (error) {
    logger.error({ error, projectId, userId: user.sub }, 'Error validating project access');
    reply.code(500).send({
      success: false,
      error: 'Failed to validate project access'
    });
    return null;
  }
}

/**
 * Normalize field names from snake_case to camelCase
 * Accepts both naming conventions for compatibility
 */
function normalizeWebhookFields(data: any): {
  callbackUrl: string;
  authUsername: string;
  authPassword: string;
  environment?: 'sandbox' | 'production';
} {
  return {
    callbackUrl: data.callbackUrl || data.callback_url,
    authUsername: data.authUsername || data.auth_username,
    authPassword: data.authPassword || data.auth_password,
    environment: data.environment
  };
}

const registerWebhookSchema = {
  body: {
    type: 'object',
    // Accept both naming conventions
    anyOf: [
      {
        required: ['callbackUrl', 'authUsername', 'authPassword'],
        properties: {
          callbackUrl: { type: 'string', format: 'uri' },
          authUsername: { type: 'string', minLength: 1 },
          authPassword: { type: 'string', minLength: 8 },
          environment: { type: 'string', enum: ['sandbox', 'production'] }
        }
      },
      {
        required: ['callback_url', 'auth_username', 'auth_password'],
        properties: {
          callback_url: { type: 'string', format: 'uri' },
          auth_username: { type: 'string', minLength: 1 },
          auth_password: { type: 'string', minLength: 8 },
          environment: { type: 'string', enum: ['sandbox', 'production'] }
        }
      }
    ]
  },
  querystring: {
    type: 'object',
    required: ['project_id'],
    properties: {
      project_id: { type: 'string', format: 'uuid' }
    }
  }
};

const updateWebhookSchema = {
  body: {
    type: 'object',
    anyOf: [
      {
        properties: {
          callbackUrl: { type: 'string', format: 'uri' },
          authUsername: { type: 'string', minLength: 1 },
          authPassword: { type: 'string', minLength: 8 }
        }
      },
      {
        properties: {
          callback_url: { type: 'string', format: 'uri' },
          auth_username: { type: 'string', minLength: 1 },
          auth_password: { type: 'string', minLength: 8 }
        }
      }
    ]
  }
};

export default async function webhooksRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/webhooks
   * Register a new webhook
   */
  fastify.post('/api/psp/webhooks', {
    schema: registerWebhookSchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Querystring: { project_id: string };
        Body: any;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

        // Normalize field names to camelCase
        const { callbackUrl, authUsername, authPassword, environment = 'production' } = 
          normalizeWebhookFields(request.body);

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
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Querystring: { project_id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

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
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ 
        Params: { id: string };
        Querystring: { project_id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

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
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { project_id: string };
        Body: any;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

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

        // Normalize and extract updates
        const normalized = normalizeWebhookFields(request.body);
        const { environment = 'production', ...updates } = normalized;

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
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          environment: { type: 'string', enum: ['sandbox', 'production'] }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ 
        Params: { id: string };
        Querystring: { 
          project_id: string;
          environment?: 'sandbox' | 'production';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

        const environment = request.query.environment || 'production';

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
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          status: { type: 'string', enum: ['pending', 'delivered', 'failed'] },
          eventName: { type: 'string' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Querystring: {
          project_id: string;
          page?: number;
          limit?: number;
          status?: 'pending' | 'delivered' | 'failed';
          eventName?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

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
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ 
        Params: { id: string };
        Querystring: { project_id: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const projectId = await getAndValidateProjectId(request, reply);
        if (!projectId) return; // Error already sent

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

  /**
   * POST /api/psp/webhooks/receiver
   * Public endpoint to receive webhook events from Warp
   * 
   * NOTE: This endpoint does NOT require authentication as it receives
   * events directly from Warp's servers. Event authenticity is verified
   * through signature validation in the service layer.
   */
  fastify.post('/api/psp/webhooks/receiver', {
    schema: {
      body: {
        type: 'object',
        required: ['event_id', 'event_name', 'resource_urls', 'payload'],
        properties: {
          event_id: { type: 'string' },
          event_name: { type: 'string' },
          resource_urls: { type: 'array', items: { type: 'string' } },
          payload: { type: 'object' },
          project_id: { type: 'string' }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{
        Body: {
          event_id: string;
          event_name: string;
          resource_urls: string[];
          payload: Record<string, unknown>;
          project_id?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { event_id, event_name, resource_urls, payload, project_id } = request.body;

        // Extract project_id from payload if not provided at top level
        const projectId = project_id || (payload.project_id as string);

        if (!projectId) {
          logger.error({ event_id, event_name }, 'Webhook event missing project_id');
          return reply.code(400).send({
            success: false,
            error: 'project_id is required'
          });
        }

        // Process the event (store in database and queue for delivery)
        const eventResponse = await webhookService.receiveEvent(projectId, {
          event_id,
          event_name,
          resource_urls,
          payload
        });

        logger.info({
          event_id: eventResponse.eventId,
          event_name: eventResponse.eventName,
          project_id: projectId
        }, 'Webhook event received successfully');

        // Always return 200 OK immediately to Warp
        // Event processing happens asynchronously
        return reply.code(200).send({
          success: true,
          message: 'Event received',
          event_id: eventResponse.eventId
        });
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          body: request.body
        }, 'Failed to receive webhook event');

        // Even on error, return 200 OK to prevent Warp from retrying
        // We'll log the error and investigate separately
        return reply.code(200).send({
          success: false,
          message: 'Event received but processing failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
}
