/**
 * PSP Auth Routes
 * 
 * API key management endpoints for PSP authentication.
 * Handles creation, validation, listing, and lifecycle management of API keys.
 * 
 * Endpoints:
 * - POST   /api/psp/api-keys                - Create new API key
 * - GET    /api/psp/api-keys                - List all API keys for project
 * - GET    /api/psp/api-keys/:id            - Get specific API key
 * - DELETE /api/psp/api-keys/:id            - Delete API key
 * - POST   /api/psp/api-keys/:id/suspend    - Suspend API key
 * - POST   /api/psp/api-keys/:id/reactivate - Reactivate API key
 * - PUT    /api/psp/api-keys/:id/ip-whitelist - Update IP whitelist
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '@/services/psp/auth/apiKeyService';
import { logger } from '@/utils/logger';
import { getDatabase } from '@/infrastructure/database/client';

const apiKeyService = new ApiKeyService();

// Helper function to verify user has access to project
async function verifyProjectAccess(projectId: string, userId: string): Promise<{ hasAccess: boolean; project?: any; organization?: any }> {
  const db = getDatabase();
  
  // Get project with organization assignment
  const projectAssignment = await db.project_organization_assignments.findFirst({
    where: { project_id: projectId },
    include: {
      projects: {
        select: {
          id: true,
          name: true
        }
      },
      organizations: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  if (!projectAssignment) {
    return { hasAccess: false };
  }
  
  // Verify user has role in the organization
  const userOrgRole = await db.user_organization_roles.findFirst({
    where: {
      user_id: userId,
      organization_id: projectAssignment.organization_id
    }
  });
  
  return {
    hasAccess: !!userOrgRole,
    project: projectAssignment.projects,
    organization: projectAssignment.organizations
  };
}

// JSON Schema definitions
const createApiKeySchema = {
  body: {
    type: 'object',
    required: ['description', 'environment'],
    properties: {
      description: { type: 'string', minLength: 1 },
      environment: { type: 'string', enum: ['sandbox', 'production'] },
      ipWhitelist: { type: 'array', items: { type: 'string' } },
      expiresAt: { type: 'string', format: 'date-time' }
    }
  },
  querystring: {
    type: 'object',
    required: ['project_id'],
    properties: {
      project_id: { type: 'string', format: 'uuid' }
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

const projectQuerySchema = {
  querystring: {
    type: 'object',
    required: ['project_id'],
    properties: {
      project_id: { type: 'string', format: 'uuid' }
    }
  }
};

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/api-keys?project_id=xxx
   * Create a new API key
   */
  fastify.post('/api/psp/api-keys', {
    schema: createApiKeySchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Querystring: { project_id: string };
        Body: {
          description: string;
          environment: 'sandbox' | 'production';
          ipWhitelist?: string[];
          expiresAt?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query;
        const { description, environment, ipWhitelist, expiresAt } = request.body;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
          });
        }
        
        // Verify user has access to project
        const access = await verifyProjectAccess(project_id, userId);
        if (!access.hasAccess) {
          return reply.code(access.project ? 403 : 404).send({
            success: false,
            error: access.project ? 'You do not have access to this project' : 'Project not found'
          });
        }
        
        // For now, use a placeholder Warp API key
        // TODO: Implement project-level Warp API key storage
        const warpApiKey = `warp_project_${project_id}`;
        
        // Detect client IP address for automatic whitelisting
        let clientIp = (request.headers['x-forwarded-for'] as string) 
          || (request.headers['x-real-ip'] as string)
          || request.socket.remoteAddress
          || 'unknown';
        
        // Add client IP to whitelist if not already there
        const finalIpWhitelist = ipWhitelist || [];
        if (clientIp && clientIp !== 'unknown' && !finalIpWhitelist.includes(clientIp)) {
          finalIpWhitelist.push(clientIp);
          logger.info({ 
            ip: clientIp, 
            project: project_id 
          }, 'Auto-added client IP to whitelist');
        }

        const result = await apiKeyService.createApiKey(
          {
            projectId: project_id,
            description,
            warpApiKey,
            environment,
            ipWhitelist: finalIpWhitelist,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
          },
          userId
        );

        logger.info({ 
          keyId: result.id, 
          projectId: project_id,
          projectName: access.project?.name,
          clientIp,
          ipWhitelistCount: finalIpWhitelist.length
        }, 'API key created');

        return reply.code(201).send({
          success: true,
          data: result,
          message: clientIp !== 'unknown' 
            ? `API key created for ${access.project?.name}. Your IP (${clientIp}) was automatically added to the whitelist.`
            : `API key created for ${access.project?.name}.`
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
   * GET /api/psp/api-keys?project_id=xxx
   * List all API keys for the authenticated project
   */
  fastify.get('/api/psp/api-keys', {
    schema: projectQuerySchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
          });
        }
        
        // Verify user has access to project
        const access = await verifyProjectAccess(project_id, userId);
        if (!access.hasAccess) {
          return reply.code(access.project ? 403 : 404).send({
            success: false,
            error: access.project ? 'You do not have access to this project' : 'Project not found'
          });
        }

        const keys = await apiKeyService.listApiKeys(project_id);

        logger.info({ 
          projectId: project_id,
          projectName: access.project?.name,
          keyCount: keys.length,
          keys: keys
        }, 'API keys retrieved successfully');

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
   * GET /api/psp/api-keys/:id
   * Get a specific API key
   */
  fastify.get('/api/psp/api-keys/:id', {
    schema: idParamSchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
          });
        }

        const key = await apiKeyService.getApiKey(id);

        if (!key) {
          return reply.code(404).send({
            success: false,
            error: 'API key not found'
          });
        }

        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
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
   * DELETE /api/psp/api-keys/:id
   * Delete an API key
   */
  fastify.delete('/api/psp/api-keys/:id', {
    schema: idParamSchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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

        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        await apiKeyService.deleteApiKey(id);

        logger.info({ keyId: id, projectId: key.projectId }, 'API key deleted');

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
   * POST /api/psp/api-keys/:id/suspend
   * Suspend an API key
   */
  fastify.post('/api/psp/api-keys/:id/suspend', {
    schema: idParamSchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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

        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        await apiKeyService.suspendApiKey(id);

        logger.info({ keyId: id, projectId: key.projectId }, 'API key suspended');

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
   * POST /api/psp/api-keys/:id/reactivate
   * Reactivate a suspended API key
   */
  fastify.post('/api/psp/api-keys/:id/reactivate', {
    schema: idParamSchema,
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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

        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        await apiKeyService.reactivateApiKey(id);

        logger.info({ keyId: id, projectId: key.projectId }, 'API key reactivated');

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
   * PUT /api/psp/api-keys/:id/ip-whitelist
   * Update IP whitelist for an API key
   */
  fastify.put('/api/psp/api-keys/:id/ip-whitelist', {
    schema: {
      ...idParamSchema,
      ...updateIpWhitelistSchema
    },
    preHandler: fastify.authenticate,
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
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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

        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        await apiKeyService.updateIpWhitelist(id, ipWhitelist);

        logger.info({ keyId: id, projectId: key.projectId }, 'API key IP whitelist updated');

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
   * POST /api/psp/api-keys/:id/ip-whitelist/add
   * Add a single IP to the whitelist
   */
  fastify.post('/api/psp/api-keys/:id/ip-whitelist/add', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { ip: string; description?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { ip, description } = request.body;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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
        
        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        const result = await apiKeyService.addIpToWhitelist(id, { ip, description });

        logger.info({ keyId: id, ip, projectId: key.projectId }, 'IP added to whitelist');

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error({ error }, 'Failed to add IP to whitelist');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add IP to whitelist'
        });
      }
    }
  });

  /**
   * DELETE /api/psp/api-keys/:id/ip-whitelist/:ip
   * Remove a single IP from the whitelist
   */
  fastify.delete('/api/psp/api-keys/:id/ip-whitelist/:ip', {
    schema: {
      params: {
        type: 'object',
        required: ['id', 'ip'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          ip: { type: 'string' }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{
        Params: { id: string; ip: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, ip } = request.params;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
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
        
        // Verify user has access to key.projectId
        const access = await verifyProjectAccess(key.projectId, userId);
        if (!access.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have access to this API key'
          });
        }

        const result = await apiKeyService.removeIpFromWhitelist(id, ip);

        logger.info({ keyId: id, ip, projectId: key.projectId }, 'IP removed from whitelist');

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error({ error }, 'Failed to remove IP from whitelist');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove IP from whitelist'
        });
      }
    }
  });

  /**
   * GET /api/psp/api-keys/inactive?project_id=xxx
   * Get inactive API keys
   */
  fastify.get('/api/psp/api-keys/inactive', {
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          days: { type: 'number', minimum: 1 }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id: string; days?: number } }>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, days = 30 } = request.query;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
          });
        }
        
        // Verify user has access to project
        const access = await verifyProjectAccess(project_id, userId);
        if (!access.hasAccess) {
          return reply.code(access.project ? 403 : 404).send({
            success: false,
            error: access.project ? 'You do not have access to this project' : 'Project not found'
          });
        }

        const keys = await apiKeyService.getInactiveKeys(project_id, days);

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
   * GET /api/psp/api-keys/expiring?project_id=xxx
   * Get expiring API keys
   */
  fastify.get('/api/psp/api-keys/expiring', {
    schema: {
      querystring: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          days: { type: 'number', minimum: 1 }
        }
      }
    },
    preHandler: fastify.authenticate,
    handler: async (
      request: FastifyRequest<{ Querystring: { project_id: string; days?: number } }>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, days = 30 } = request.query;
        
        // Extract user info from JWT (Supabase stores user ID in 'sub' field)
        const user = request.user as any;
        const userId = user?.sub || user?.userId || user?.id;
        
        if (!userId) {
          logger.error({ user }, 'Could not extract userId from JWT token');
          return reply.code(401).send({
            success: false,
            error: 'User authentication required'
          });
        }
        
        // Verify user has access to project
        const access = await verifyProjectAccess(project_id, userId);
        if (!access.hasAccess) {
          return reply.code(access.project ? 403 : 404).send({
            success: false,
            error: access.project ? 'You do not have access to this project' : 'Project not found'
          });
        }

        const keys = await apiKeyService.getExpiringKeys(project_id, days);

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
