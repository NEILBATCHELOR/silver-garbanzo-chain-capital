/**
 * PSP Identity Routes
 * 
 * KYB/KYC identity verification endpoints.
 * Handles case creation, status tracking, and verification management.
 * 
 * Endpoints:
 * - POST   /api/psp/identity/cases           - Create new verification case
 * - GET    /api/psp/identity/cases           - List all cases for project
 * - GET    /api/psp/identity/cases/:id       - Get specific case
 * - PATCH  /api/psp/identity/cases/:id       - Update case data
 * - DELETE /api/psp/identity/cases/:id       - Deactivate case
 * - POST   /api/psp/identity/cases/:id/resubmit - Resubmit for verification
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IdentityService, BusinessData, PersonData } from '@/services/psp/identity/identityService';
import { logger } from '@/utils/logger';

const identityService = new IdentityService();

/**
 * Get environment from request (API key context)
 * TODO: In production, this should be determined from the API key's environment setting
 */
function getEnvironment(request: FastifyRequest): 'sandbox' | 'production' {
  // Check query parameter first (for testing)
  const queryEnv = (request.query as any)?.environment;
  if (queryEnv === 'production') return 'production';
  
  // Default to sandbox for safety
  return 'sandbox';
}

/**
 * Get user ID from request
 */
function getUserId(request: FastifyRequest): string {
  return (request.user as any)?.id || 'system';
}

const createCaseSchema = {
  body: {
    type: 'object',
    required: ['caseType'],
    properties: {
      caseType: { type: 'string', enum: ['individual', 'business'] },
      businessData: { type: 'object' },
      personsData: { type: 'array', items: { type: 'object' } }
    }
  }
};

export default async function identityRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/psp/identity/cases
   * Create a new identity verification case
   */
  fastify.post('/api/psp/identity/cases', {
    schema: createCaseSchema,
    handler: async (
      request: FastifyRequest<{
        Body: {
          caseType: 'individual' | 'business';
          businessData?: Record<string, unknown>;
          personsData?: Record<string, unknown>[];
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

        const { caseType, businessData, personsData } = request.body;

        const environment = getEnvironment(request);
        const userId = getUserId(request);

        const result = await identityService.createCase({
          projectId,
          caseType,
          businessData: businessData as BusinessData | undefined,
          personsData: (personsData || []) as unknown as PersonData[]
        }, environment, userId);

        logger.info({
          message: 'Identity case created',
          caseId: result.id, 
          projectId,
          environment
        });

        return reply.code(201).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error({
          message: 'Failed to create identity case',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create identity case'
        });
      }
    }
  });

  /**
   * GET /api/psp/identity/cases
   * List all identity cases for project
   */
  fastify.get('/api/psp/identity/cases', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_review', 'approved', 'rejected', 'review_required'] },
          caseType: { type: 'string', enum: ['individual', 'business'] }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{
        Querystring: {
          status?: 'pending' | 'in_review' | 'approved' | 'rejected' | 'review_required';
          caseType?: 'individual' | 'business';
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

        const { status, caseType } = request.query;

        const cases = await identityService.listCases(projectId, { status, caseType });

        return reply.code(200).send({
          success: true,
          data: cases
        });
      } catch (error) {
        logger.error({
          message: 'Failed to list identity cases',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list identity cases'
        });
      }
    }
  });

  /**
   * GET /api/psp/identity/cases/:id
   * Get specific identity case
   */
  fastify.get('/api/psp/identity/cases/:id', {
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

        const identityCase = await identityService.getCase(id);

        if (!identityCase) {
          return reply.code(404).send({
            success: false,
            error: 'Identity case not found'
          });
        }

        if (identityCase.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Case belongs to different project'
          });
        }

        return reply.code(200).send({
          success: true,
          data: identityCase
        });
      } catch (error) {
        logger.error({
          message: 'Failed to get identity case',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get identity case'
        });
      }
    }
  });

  /**
   * PATCH /api/psp/identity/cases/:id
   * Update identity case data
   */
  fastify.patch('/api/psp/identity/cases/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          businessData: { type: 'object' },
          personsData: { type: 'array', items: { type: 'object' } }
        }
      }
    },
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          businessData?: Record<string, unknown>;
          personsData?: Record<string, unknown>[];
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
        const identityCase = await identityService.getCase(id);
        if (!identityCase) {
          return reply.code(404).send({
            success: false,
            error: 'Identity case not found'
          });
        }

        if (identityCase.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Case belongs to different project'
          });
        }

        const environment = getEnvironment(request);
        const userId = getUserId(request);

        const updated = await identityService.updateCase(
          id, 
          {
            businessData: request.body.businessData as Partial<BusinessData> | undefined,
            personsData: request.body.personsData as PersonData[] | undefined
          },
          environment,
          userId
        );

        logger.info({
          message: 'Identity case updated',
          caseId: id, 
          projectId,
          environment
        });

        return reply.code(200).send({
          success: true,
          data: updated
        });
      } catch (error) {
        logger.error({
          message: 'Failed to update identity case',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update identity case'
        });
      }
    }
  });

  /**
   * DELETE /api/psp/identity/cases/:id
   * Deactivate identity case
   */
  fastify.delete('/api/psp/identity/cases/:id', {
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
        const identityCase = await identityService.getCase(id);
        if (!identityCase) {
          return reply.code(404).send({
            success: false,
            error: 'Identity case not found'
          });
        }

        if (identityCase.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Case belongs to different project'
          });
        }

        const environment = getEnvironment(request);

        await identityService.deactivateCase(id, environment);

        logger.info({
          message: 'Identity case deactivated',
          caseId: id, 
          projectId,
          environment
        });

        return reply.code(200).send({
          success: true,
          message: 'Identity case deactivated successfully'
        });
      } catch (error) {
        logger.error({
          message: 'Failed to deactivate identity case',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to deactivate identity case'
        });
      }
    }
  });

  /**
   * POST /api/psp/identity/cases/:id/resubmit
   * Resubmit case for verification
   */
  fastify.post('/api/psp/identity/cases/:id/resubmit', {
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
        const identityCase = await identityService.getCase(id);
        if (!identityCase) {
          return reply.code(404).send({
            success: false,
            error: 'Identity case not found'
          });
        }

        if (identityCase.projectId !== projectId) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden - Case belongs to different project'
          });
        }

        const environment = getEnvironment(request);

        const result = await identityService.resubmitCase(id, environment);

        logger.info({
          message: 'Identity case resubmitted',
          caseId: id, 
          projectId,
          environment
        });

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error({
          message: 'Failed to resubmit identity case',
          error
        });
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resubmit identity case'
        });
      }
    }
  });
}
