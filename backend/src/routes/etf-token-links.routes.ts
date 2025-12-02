/**
 * ETF Token Links Routes
 * API endpoints for managing ETF-token link relationships
 * Following MMF/Bonds pattern
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ETFTokenLinksService } from '../services/etf-token-links.service'

// Request schemas
const createLinkSchema = z.object({
  etf_id: z.string().uuid(),
  token_id: z.string().uuid(),
  parity: z.number().positive().default(1.0),
  ratio: z.number().positive().default(1.0),
  effective_date: z.string().optional(),
  status: z.string().default('active')
})

const updateLinkSchema = z.object({
  parity: z.number().positive().optional(),
  ratio: z.number().positive().optional(),
  status: z.string().optional()
})

const updateRebaseConfigSchema = z.object({
  supports_rebase: z.boolean().optional(),
  rebase_frequency: z.string().optional(),
  rebase_threshold_pct: z.number().optional(),
  oracle_address: z.string().optional()
})

export async function etfTokenLinksRoutes(fastify: FastifyInstance) {
  const service = new ETFTokenLinksService(fastify.supabase)
  
  /**
   * POST /api/etf-token-links
   * Create a new token link
   */
  fastify.post('/etf-token-links', {
    schema: {
      description: 'Link a token to an ETF',
      tags: ['etf', 'tokens'],
      body: {
        type: 'object',
        properties: {
          etf_id: { type: 'string', format: 'uuid' },
          token_id: { type: 'string', format: 'uuid' },
          parity: { type: 'number', default: 1.0 },
          ratio: { type: 'number', default: 1.0 },
          status: { type: 'string', default: 'active' }
        },
        required: ['etf_id', 'token_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = createLinkSchema.parse(request.body)
      
      // Get project_id and user_id from request
      const projectId = request.headers['x-project-id'] as string || 'default-project'
      const userId = request.headers['x-user-id'] as string || 'system'
      
      const link = await service.createTokenLink(
        projectId,
        userId,
        validatedData
      )
      
      return reply.send({
        success: true,
        data: link
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid token link data',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create token link'
        }
      })
    }
  })
  
  /**
   * GET /api/etf-token-links/etf/:etfId
   * Get all token links for an ETF
   */
  fastify.get('/etf-token-links/etf/:etfId', {
    schema: {
      description: 'Get all token links for an ETF',
      tags: ['etf', 'tokens'],
      params: {
        type: 'object',
        properties: {
          etfId: { type: 'string', format: 'uuid' }
        },
        required: ['etfId']
      },
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      }
    }
  }, async (request, reply) => {
    const { etfId } = request.params as { etfId: string }
    const { projectId } = request.query as { projectId: string }
    
    try {
      const links = await service.getETFTokenLinks(etfId, projectId)
      
      return reply.send({
        success: true,
        data: links,
        metadata: {
          count: links.length
        }
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch token links'
        }
      })
    }
  })
  
  /**
   * GET /api/etf-token-links/:id
   * Get a single token link
   */
  fastify.get('/etf-token-links/:id', {
    schema: {
      description: 'Get a single token link',
      tags: ['etf', 'tokens'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { projectId } = request.query as { projectId: string }
    
    try {
      const link = await service.getTokenLinkById(id, projectId)
      
      if (!link) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Token link not found'
          }
        })
      }
      
      return reply.send({
        success: true,
        data: link
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch token link'
        }
      })
    }
  })
  
  /**
   * PUT /api/etf-token-links/:id
   * Update a token link
   */
  fastify.put('/etf-token-links/:id', {
    schema: {
      description: 'Update a token link',
      tags: ['etf', 'tokens'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          parity: { type: 'number' },
          ratio: { type: 'number' },
          status: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const validatedData = updateLinkSchema.parse(request.body)
      
      const projectId = request.headers['x-project-id'] as string || 'default-project'
      const userId = request.headers['x-user-id'] as string || 'system'
      
      const link = await service.updateTokenLink(
        id,
        projectId,
        userId,
        validatedData
      )
      
      return reply.send({
        success: true,
        data: link
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update token link'
        }
      })
    }
  })
  
  /**
   * DELETE /api/etf-token-links/:id
   * Delete a token link (unlink token from ETF)
   */
  fastify.delete('/etf-token-links/:id', {
    schema: {
      description: 'Unlink a token from an ETF',
      tags: ['etf', 'tokens'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { projectId } = request.query as { projectId: string }
    
    try {
      await service.deleteTokenLink(id, projectId)
      
      return reply.send({
        success: true,
        message: 'Token link deleted successfully'
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Failed to delete token link'
        }
      })
    }
  })
  
  /**
   * PUT /api/etf-token-links/:id/rebase
   * Update rebase configuration for a token link
   */
  fastify.put('/etf-token-links/:id/rebase', {
    schema: {
      description: 'Update rebase configuration for an ETF token link',
      tags: ['etf', 'tokens', 'rebase'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          supports_rebase: { type: 'boolean' },
          rebase_frequency: { type: 'string' },
          rebase_threshold_pct: { type: 'number' },
          oracle_address: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const validatedData = updateRebaseConfigSchema.parse(request.body)
      
      const projectId = request.headers['x-project-id'] as string || 'default-project'
      
      await service.updateRebaseConfig(id, projectId, validatedData)
      
      return reply.send({
        success: true,
        message: 'Rebase configuration updated successfully'
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid rebase configuration',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update rebase configuration'
        }
      })
    }
  })
  
  /**
   * GET /api/etf-token-links
   * Get all token links (with optional filters)
   */
  fastify.get('/etf-token-links', {
    schema: {
      description: 'Get all ETF token links with optional filters',
      tags: ['etf', 'tokens'],
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          etfId: { type: 'string', format: 'uuid' },
          tokenId: { type: 'string', format: 'uuid' },
          status: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const filters = request.query as {
      projectId?: string
      etfId?: string
      tokenId?: string
      status?: string
    }
    
    try {
      const links = await service.getTokenLinks({
        project_id: filters.projectId,
        etf_id: filters.etfId,
        token_id: filters.tokenId,
        status: filters.status
      })
      
      return reply.send({
        success: true,
        data: links,
        metadata: {
          count: links.length,
          filters
        }
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch token links'
        }
      })
    }
  })
}
