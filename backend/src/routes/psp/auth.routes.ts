/**
 * PSP Auth Routes
 * 
 * API key management endpoints for PSP authentication.
 * Handles creation, validation, listing, and lifecycle management of API keys.
 * 
 * Endpoints:
 * - POST   /api/psp/auth/api-keys      - Create new API key
 * - GET    /api/psp/auth/api-keys      - List all API keys for project
 * - GET    /api/psp/auth/api-keys/:id  - Get specific API key
 * - DELETE /api/psp/auth/api-keys/:id  - Delete API key
 * - POST   /api/psp/auth/api-keys/:id/suspend - Suspend API key
 * - POST   /api/psp/auth/api-keys/:id/reactivate - Reactivate API key
 * - PUT    /api/psp/auth/api-keys/:id/ip-whitelist - Update IP whitelist
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '@/services/psp/auth/apiKeyService';
import { logger } from '@/utils/logger';

const apiKeyService = new ApiKeyService();

// JSON Schema definitions
const createApiKeySchema = {
  body: {
    type: 'object',
    required: ['description', 'warpApiKey', 'environment'],
    properties: {
      description: { type: 'string', minLength: 1 },
      warpApiKey: { type: 'string', minLength: 1 },
      environment: { type: 'string', enum: ['sandbox', 'production'] },
      ipWhitelist: { type: 'array', items: { type: 'string' } },
      expiresAt: { type: 'string', format: 'date-time' }
    }
  }
};

const updateIpWhitelistSchema = {
  body: {
    type: 'object',
    required: ['ipWhitelist'],
    properties: {
      ipWhitelist: { type: 'array', items: { type: 'string' } }
    }
  }
};

const idParamSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/auth/api-keys
   * Create a new API key
   */
  fastify.post('/api/psp/auth/api-keys', {
    schema: createApiKeySchema,
    handler: async (
      request: FastifyRequest<{
        Body: {
          description: string;
          warpApiKey: string;
          environment: 'sandbox' | 'production';
          ipWhitelist?: string[];
          expiresAt?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { description, warpApiKey, environment, ipWhitelist, expiresAt } = request.body;
        
        // Get project ID from authenticated user context
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const userId = (request.user as any)?.id || 'system';

        const result = await apiKeyService.createApiKey(
          {
            projectId,
            description,
            warpApiKey,
            environment,
            ipWhitelist,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
          },
          userId
        );

        logger.info({ keyId: result.id, projectId }, 'API key created');

        return reply.code(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error({ error }, 'Failed to create API key');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create API key'
        });
      }
    }
  });

  /**
   * GET /api/psp/auth/api-keys
   * List all API keys for the authenticated project
   */
  fastify.get('/api/psp/auth/api-keys', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const projectId = (request.user as any)?.project_id;
        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        const keys = await apiKeyService.listApiKeys(projectId);

        return reply.code(200).send({
          success: true,
          data: keys
        });
      } catch (error) {
        logger.error({ error }, 'Failed to list API keys');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list API keys'
        });
      }
    }
  });

  /**
   * GET /api/psp/auth/api-keys/:id
   * Get a specific API key
   */
  fastify.get('/api/psp/auth/api-keys/:id', {
    schema: idParamSchema,
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

        const key = await apiKeyService.getApiKey(id);

        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        // Verify the key belongs to the user's project
        if (key.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - API key belongs to different project'
          });
        }

        return reply.code(200).send({
          success: true,
          data: key
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get API key');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get API key'
        });
      }
    }
  });

  /**
   * DELETE /api/psp/auth/api-keys/:id
   * Delete an API key
   */
  fastify.delete('/api/psp/auth/api-keys/:id', {
    schema: idParamSchema,
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
        const key = await apiKeyService.getApiKey(id);
        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        if (key.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - API key belongs to different project'
          });
        }

        await apiKeyService.deleteApiKey(id);

        logger.info({ keyId: id, projectId }, 'API key deleted');

        return reply.code(200).send({
          success: true,
          message: 'API key deleted successfully'
        });
      } catch (error) {
        logger.error({ error }, 'Failed to delete API key');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete API key'
        });
      }
    }
  });

  /**
   * POST /api/psp/auth/api-keys/:id/suspend
   * Suspend an API key
   */
  fastify.post('/api/psp/auth/api-keys/:id/suspend', {
    schema: idParamSchema,
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
        const key = await apiKeyService.getApiKey(id);
        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        if (key.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - API key belongs to different project'
          });
        }

        await apiKeyService.suspendApiKey(id);

        logger.info({ keyId: id, projectId }, 'API key suspended');

        return reply.code(200).send({
          success: true,
          message: 'API key suspended successfully'
        });
      } catch (error) {
        logger.error({ error }, 'Failed to suspend API key');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to suspend API key'
        });
      }
    }
  });

  /**
   * POST /api/psp/auth/api-keys/:id/reactivate
   * Reactivate a suspended API key
   */
  fastify.post('/api/psp/auth/api-keys/:id/reactivate', {
    schema: idParamSchema,
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
        const key = await apiKeyService.getApiKey(id);
        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        if (key.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - API key belongs to different project'
          });
        }

        await apiKeyService.reactivateApiKey(id);

        logger.info({ keyId: id, projectId }, 'API key reactivated');

        return reply.code(200).send({
          success: true,
          message: 'API key reactivated successfully'
        });
      } catch (error) {
        logger.error({ error }, 'Failed to reactivate API key');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reactivate API key'
        });
      }
    }
  });

  /**
   * PUT /api/psp/auth/api-keys/:id/ip-whitelist
   * Update IP whitelist for an API key
   */
  fastify.put('/api/psp/auth/api-keys/:id/ip-whitelist', {
    schema: {
      ...idParamSchema,
      ...updateIpWhitelistSchema
    },
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { ipWhitelist: string[] };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { ipWhitelist } = request.body;
        const projectId = (request.user as any)?.project_id;

        if (!projectId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized - No project context'
          });
        }

        // Verify ownership
        const key = await apiKeyService.getApiKey(id);
        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        if (key.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - API key belongs to different project'
          });
        }

        await apiKeyService.updateIpWhitelist(id, ipWhitelist);

        logger.info({ keyId: id, projectId }, 'API key IP whitelist updated');

        return reply.code(200).send({
          success: true,
          message: 'IP whitelist updated successfully'
        });
      } catch (error) {
        logger.error({ error }, 'Failed to update IP whitelist');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update IP whitelist'
        });
      }
    }
  });

  /**
   * GET /api/psp/auth/api-keys/inactive
   * Get inactive API keys
   */
  fastify.get('/api/psp/auth/api-keys/inactive', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', minimum: 1, default: 30 }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { days?: number } }>,
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

        const days = request.query.days || 30;
        const keys = await apiKeyService.getInactiveKeys(projectId, days);

        return reply.code(200).send({
          success: true,
          data: keys
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get inactive keys');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get inactive keys'
        });
      }
    }
  });

  /**
   * GET /api/psp/auth/api-keys/expiring
   * Get expiring API keys
   */
  fastify.get('/api/psp/auth/api-keys/expiring', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', minimum: 1, default: 30 }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{ Querystring: { days?: number } }>,
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

        const days = request.query.days || 30;
        const keys = await apiKeyService.getExpiringKeys(projectId, days);

        return reply.code(200).send({
          success: true,
          data: keys
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get expiring keys');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get expiring keys'
        });
      }
    }
  });
}
