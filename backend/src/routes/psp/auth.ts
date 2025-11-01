/**
 * PSP Authentication Routes
 * Handles API key management and IP whitelisting
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ApiKeyService } from '@/services/psp/auth/apiKeyService'
import { logger } from '@/utils/logger'
import type {
  CreateApiKeyRequest,
  ApiKeyFilters,
  AddIpToWhitelistRequest
} from '@/types/psp-auth'

export async function authRoutes(fastify: FastifyInstance) {
  const apiKeyService = new ApiKeyService()

  /**
   * Create API Key
   * POST /api/psp/auth/api-keys
   */
  fastify.post<{
    Body: CreateApiKeyRequest & { warpApiKey?: string }
  }>(
    '/auth/api-keys',
    {
      schema: {
        description: 'Create a new PSP API key',
        tags: ['PSP Auth'],
        body: {
          type: 'object',
          required: ['projectId', 'description', 'environment'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            description: { type: 'string', minLength: 1, maxLength: 200 },
            environment: { type: 'string', enum: ['sandbox', 'production'] },
            warpApiKey: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        response: {
          201: {
            description: 'API key created successfully',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              key: { type: 'string' },
              description: { type: 'string' },
              environment: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: CreateApiKeyRequest & { warpApiKey?: string } }>, reply: FastifyReply) => {
      try {
        // For now, use a placeholder Warp API key since we're in development
        const warpApiKey = request.body.warpApiKey || 'warp_dev_placeholder_key'
        
        const result = await apiKeyService.createApiKey({
          projectId: request.body.projectId,
          description: request.body.description,
          environment: request.body.environment,
          warpApiKey,
          expiresAt: request.body.expiresAt ? new Date(request.body.expiresAt) : undefined
        })

        logger.info('API key created')

        return reply.code(201).send(result)
      } catch (err) {
        const error = err as Error
        logger.error(`Error creating API key: ${error.message}`)
        return reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create API key'
        })
      }
    }
  )

  /**
   * List API Keys
   * GET /api/psp/auth/api-keys
   */
  fastify.get<{
    Querystring: ApiKeyFilters
  }>(
    '/auth/api-keys',
    {
      schema: {
        description: 'List all API keys for a project',
        tags: ['PSP Auth'],
        querystring: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['active', 'suspended', 'revoked'] },
            environment: { type: 'string', enum: ['sandbox', 'production'] }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Querystring: ApiKeyFilters }>, reply: FastifyReply) => {
      try {
        const keys = await apiKeyService.listApiKeys(request.query.projectId)

        return reply.code(200).send({
          keys,
          total: keys.length,
          page: request.query.page || 1,
          limit: request.query.limit || 20
        })
      } catch (err) {
        const error = err as Error
        logger.error(`Error listing API keys: ${error.message}`)
        return reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list API keys'
        })
      }
    }
  )

  /**
   * Revoke API Key
   * DELETE /api/psp/auth/api-keys/:id
   */
  fastify.delete<{
    Params: { id: string }
  }>(
    '/auth/api-keys/:id',
    {
      schema: {
        description: 'Revoke an API key',
        tags: ['PSP Auth'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const result = await apiKeyService.revokeApiKey(request.params.id)

        logger.info('API key revoked')

        return reply.code(200).send(result)
      } catch (err) {
        const error = err as Error
        logger.error(`Error revoking API key: ${error.message}`)
        return reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke API key'
        })
      }
    }
  )

  /**
   * Add IP to Whitelist
   * POST /api/psp/auth/api-keys/:id/ips
   */
  fastify.post<{
    Params: { id: string }
    Body: AddIpToWhitelistRequest
  }>(
    '/auth/api-keys/:id/ips',
    {
      schema: {
        description: 'Add an IP address to the whitelist',
        tags: ['PSP Auth'],
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
      }
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: AddIpToWhitelistRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const result = await apiKeyService.addIpToWhitelist(request.params.id, request.body)

        logger.info('IP added to whitelist')

        return reply.code(200).send(result)
      } catch (err) {
        const error = err as Error
        logger.error(`Error adding IP to whitelist: ${error.message}`)
        return reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add IP to whitelist'
        })
      }
    }
  )

  /**
   * Remove IP from Whitelist
   * DELETE /api/psp/auth/api-keys/:id/ips/:ip
   */
  fastify.delete<{
    Params: { id: string; ip: string }
  }>(
    '/auth/api-keys/:id/ips/:ip',
    {
      schema: {
        description: 'Remove an IP address from the whitelist',
        tags: ['PSP Auth'],
        params: {
          type: 'object',
          required: ['id', 'ip'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            ip: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { id: string; ip: string } }>, reply: FastifyReply) => {
      try {
        const result = await apiKeyService.removeIpFromWhitelist(request.params.id, request.params.ip)

        logger.info('IP removed from whitelist')

        return reply.code(200).send(result)
      } catch (err) {
        const error = err as Error
        logger.error(`Error removing IP from whitelist: ${error.message}`)
        return reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove IP from whitelist'
        })
      }
    }
  )
}
