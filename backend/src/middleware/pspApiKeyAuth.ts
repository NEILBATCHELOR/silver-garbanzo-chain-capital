/**
 * PSP API Key Authentication Middleware
 * 
 * Provides API key-based authentication for external applications
 * using the Warp PSP services. This is separate from JWT authentication
 * which is used for the PSP management UI.
 * 
 * Usage:
 * - Add `preHandler: fastify.authenticatePspApiKey` to routes that require API key auth
 * - The authenticated context will be available in `request.pspContext`
 */

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { AuthenticationError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import { ApiKeyService } from '@/services/psp/auth/apiKeyService'

const apiKeyService = new ApiKeyService()

/**
 * PSP authenticated context
 */
export interface PspAuthContext {
  projectId: string
  apiKeyId: string
  environment: 'sandbox' | 'production'
  warpApiKey: string  // Decrypted Warp API key for making Warp API calls
  clientIp: string
}

/**
 * Extended FastifyRequest with PSP context
 */
interface PspAuthenticatedRequest extends FastifyRequest {
  pspContext: PspAuthContext
}

/**
 * PSP API Key Authentication Plugin
 */
const pspApiKeyAuthPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  /**
   * Extract client IP from request
   */
  function getClientIp(request: FastifyRequest): string {
    return (request.headers['x-forwarded-for'] as string)
      || (request.headers['x-real-ip'] as string)
      || request.socket.remoteAddress
      || 'unknown'
  }

  /**
   * PSP API Key authentication decorator
   * Validates API key, checks IP whitelist, and provides authenticated context
   */
  fastify.decorate('authenticatePspApiKey', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extract API key from Authorization header or X-API-Key header
      const authHeader = request.headers.authorization
      const apiKeyHeader = request.headers['x-api-key'] as string
      
      let apiKey: string | null = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7)
      } else if (apiKeyHeader) {
        apiKey = apiKeyHeader
      }
      
      if (!apiKey) {
        throw new AuthenticationError('API key required. Provide in Authorization header as "Bearer <key>" or in X-API-Key header')
      }

      // Get client IP
      const clientIp = getClientIp(request)
      
      // Validate API key and get decrypted context
      const validatedContext = await apiKeyService.validateAndDecryptApiKey(apiKey, clientIp)
      
      if (!validatedContext) {
        logger.warn({ clientIp }, 'Invalid API key or IP not whitelisted')
        throw new AuthenticationError('Invalid API key or IP address not authorized')
      }

      // Set PSP context on request
      ;(request as PspAuthenticatedRequest).pspContext = {
        projectId: validatedContext.projectId,
        apiKeyId: validatedContext.id,
        environment: validatedContext.environment,
        warpApiKey: validatedContext.warpApiKey,
        clientIp
      }
      
      logger.info({ 
        projectId: validatedContext.projectId,
        keyId: validatedContext.id,
        environment: validatedContext.environment,
        clientIp 
      }, 'PSP API key authenticated successfully')
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      
      logger.error({ error: error instanceof Error ? error.message : error }, 'PSP API key authentication failed')
      throw new AuthenticationError('API key authentication failed')
    }
  })

  /**
   * Optional PSP API key authentication - doesn't throw if key is missing
   * Useful for endpoints that can work with or without authentication
   */
  fastify.decorate('optionalPspApiKey', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization
      const apiKeyHeader = request.headers['x-api-key'] as string
      
      if (authHeader || apiKeyHeader) {
        await fastify.authenticatePspApiKey(request, reply)
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
      logger.debug('Optional PSP API key authentication failed, continuing without context')
    }
  })

  /**
   * Environment-specific authentication
   * Requires API key to be for specific environment
   */
  fastify.decorate('requirePspEnvironment', function(environment: 'sandbox' | 'production') {
    return async function(request: FastifyRequest, reply: FastifyReply) {
      await fastify.authenticatePspApiKey(request, reply)
      
      const pspContext = (request as PspAuthenticatedRequest).pspContext
      
      if (pspContext.environment !== environment) {
        throw new AuthenticationError(`This endpoint requires ${environment} environment API key`)
      }
    }
  })

  /**
   * Validate simple API key (without full decryption)
   * Faster validation for rate limiting or basic checks
   */
  fastify.decorate('validatePspApiKeyQuick', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization
      const apiKeyHeader = request.headers['x-api-key'] as string
      
      let apiKey: string | null = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7)
      } else if (apiKeyHeader) {
        apiKey = apiKeyHeader
      }
      
      if (!apiKey) {
        throw new AuthenticationError('API key required')
      }

      // Quick validation (checks hash but doesn't decrypt)
      const validation = await apiKeyService.validateApiKey(apiKey)
      
      if (!validation.valid) {
        throw new AuthenticationError(validation.reason || 'Invalid API key')
      }

      // Set minimal context
      ;(request as any).pspKeyInfo = {
        keyId: validation.keyId,
        projectId: validation.projectId,
        environment: validation.environment
      }
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      
      logger.error({ error: error instanceof Error ? error.message : error }, 'Quick API key validation failed')
      throw new AuthenticationError('API key validation failed')
    }
  })
}

// Export as default for easy importing
export default fp(pspApiKeyAuthPlugin, {
  name: 'psp-api-key-auth-handler'
})

// Also export as named for flexibility
export const pspApiKeyAuthHandler = fp(pspApiKeyAuthPlugin, {
  name: 'psp-api-key-auth-handler'
})

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    authenticatePspApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>
    optionalPspApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>
    requirePspEnvironment(environment: 'sandbox' | 'production'): (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    validatePspApiKeyQuick(request: FastifyRequest, reply: FastifyReply): Promise<void>
  }
  
  interface FastifyRequest {
    pspContext?: PspAuthContext
  }
}
