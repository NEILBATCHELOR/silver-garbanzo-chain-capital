/**
 * PSP Authentication Middleware
 * 
 * Validates API keys and attaches PSP context to requests.
 * Enforces IP whitelisting and checks key expiration.
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ApiKeyService } from '@/services/psp/auth/apiKeyService'
import { PSPAuthContext } from '@/types/psp-auth'
import { logger } from '@/utils/logger'

// Context type is defined in @/types/psp-auth.ts
// No need to redeclare here

/**
 * Extract API key from Authorization header
 * Expected format: "Bearer warp_xxxxx..."
 */
function extractApiKey(authHeader?: string): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  // Explicitly check parts[1] exists
  const key = parts[1]
  return key || null
}

/**
 * Extract client IP address from request
 * Handles proxies and load balancers
 */
function extractClientIp(request: FastifyRequest): string | null {
  // Check X-Forwarded-For header (common with proxies/load balancers)
  const forwardedFor = request.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string') {
    const parts = forwardedFor.split(',')
    const firstIp = parts[0]?.trim()
    if (firstIp) return firstIp
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const firstHeader = forwardedFor[0]
    if (firstHeader) {
      const parts = firstHeader.split(',')
      const firstIp = parts[0]?.trim()
      if (firstIp) return firstIp
    }
  }

  // Check X-Real-IP header
  const realIp = request.headers['x-real-ip']
  if (typeof realIp === 'string') {
    return realIp
  } else if (Array.isArray(realIp) && realIp.length > 0) {
    const firstRealIp = realIp[0]
    if (firstRealIp) return firstRealIp
  }

  // Fallback to connection remote address
  return request.ip || null
}

/**
 * PSP Authentication Middleware
 * 
 * Validates API key and attaches PSP context to request.
 * Returns 401 for invalid/missing keys, 403 for IP restrictions.
 */
export async function pspAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKeyService = new ApiKeyService()

  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.authorization
    const apiKey = extractApiKey(authHeader)

    if (!apiKey) {
      logger.warn('PSP authentication failed: Missing or invalid Authorization header')

      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid API key. Include "Authorization: Bearer warp_xxx..." header.'
      })
    }

    // Validate API key format
    if (!apiKey.startsWith('warp_')) {
      logger.warn('PSP authentication failed: Invalid API key format')

      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key format. Key must start with "warp_".'
      })
    }

    // Extract client IP (pass null if cannot be determined)
    const clientIp = extractClientIp(request)

    // Validate API key with optional IP address
    // This method returns the full authenticated context with decrypted Warp API key
    const validatedKey = await apiKeyService.validateAndDecryptApiKey(
      apiKey, 
      clientIp || undefined
    )

    if (!validatedKey) {
      logger.warn({
        clientIp: clientIp || 'unknown'
      }, 'PSP authentication failed: Invalid or expired API key')

      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid, expired, or revoked API key.'
      })
    }

    // Attach PSP context to request (validatedKey is guaranteed to have all required fields)
    request.psp = {
      projectId: validatedKey.projectId,
      apiKeyId: validatedKey.id,
      environment: validatedKey.environment,
      ipAddress: clientIp || 'unknown',
      warpApiKey: validatedKey.warpApiKey
    }

    logger.info({
      projectId: validatedKey.projectId,
      environment: validatedKey.environment,
      apiKeyId: validatedKey.id
    }, 'PSP authentication successful')

    // Continue to route handler
  } catch (err) {
    const error = err as Error
    logger.error(`PSP authentication error: ${error.message}`)

    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred during authentication.'
    })
  }
}

/**
 * Optional: Environment-specific middleware
 * Requires specific environment (sandbox or production)
 */
export function requireEnvironment(environment: 'sandbox' | 'production') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.psp) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'PSP authentication required.'
      })
    }

    if (request.psp.environment !== environment) {
      logger.warn('PSP environment mismatch')

      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: `This endpoint requires ${environment} environment. Your key is for ${request.psp.environment}.`
      })
    }
  }
}

/**
 * Optional: Project-specific middleware
 * Validates request belongs to specific project
 */
export function requireProject(projectId: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.psp) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'PSP authentication required.'
      })
    }

    if (request.psp.projectId !== projectId) {
      logger.warn('PSP project mismatch')

      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this project.'
      })
    }
  }
}

export default pspAuthMiddleware
