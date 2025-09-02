import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { JWTPayload } from '@/config/jwt'
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import { getDatabase } from '@/infrastructure/database/client'

/**
 * Extended FastifyRequest interface with user information
 */
interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload
}

/**
 * Authentication middleware plugin
 * Provides JWT-based authentication and authorization
 */
const authenticationPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  /**
   * Authentication decorator - verifies JWT token
   */
  fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Verify JWT token
      await request.jwtVerify()
      
      // Token is valid, user payload is now available in request.user
      const user = request.user as JWTPayload
      
      // Optional: Check if user still exists and is active
      if (user.userId) {
        const db = getDatabase()
        const dbUser = await db.public_users.findUnique({
          where: { id: user.userId },
          select: {
            id: true,
            email: true,
            status: true
          }
        })
        
        if (!dbUser || dbUser.status !== 'active') {
          throw new AuthenticationError('User account is inactive or not found')
        }
        
        // Simplified user context - we'll use the JWT permissions for now
        ;(request as AuthenticatedRequest).user = {
          ...user,
          permissions: user.permissions || []
        }
      }
      
      logger.debug({ userId: user.userId, email: user.email }, 'User authenticated successfully')
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      
      logger.warn({ error: error instanceof Error ? error.message : error }, 'Authentication failed')
      throw new AuthenticationError('Invalid or expired token')
    }
  })

  /**
   * Authorization decorator - checks user permissions
   */
  fastify.decorate('authorize', function(requiredPermissions: string | string[] = []) {
    return async function(request: FastifyRequest, reply: FastifyReply) {
      const user = (request as AuthenticatedRequest).user
      
      if (!user) {
        throw new AuthenticationError('Authentication required')
      }

      // Convert single permission to array
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
      
      if (permissions.length === 0) {
        return // No specific permissions required
      }

      const userPermissions = user.permissions || []
      
      // Check if user has all required permissions
      const hasPermissions = permissions.every(permission => 
        userPermissions.includes(permission) || user.role === 'Super Admin'
      )
      
      if (!hasPermissions) {
        logger.warn({
          userId: user.userId,
          required: permissions,
          available: userPermissions
        }, 'Authorization failed - insufficient permissions')
        
        throw new AuthorizationError('Insufficient permissions for this operation')
      }
      
      logger.debug({
        userId: user.userId,
        permissions
      }, 'User authorized successfully')
    }
  })

  /**
   * Role-based authorization decorator
   */
  fastify.decorate('requireRole', function(requiredRoles: string | string[]) {
    return async function(request: FastifyRequest, reply: FastifyReply) {
      const user = (request as AuthenticatedRequest).user
      
      if (!user) {
        throw new AuthenticationError('Authentication required')
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
      const userRole = user.role
      
      if (!userRole || (!roles.includes(userRole) && userRole !== 'Super Admin')) {
        logger.warn({
          userId: user.userId,
          required: roles,
          available: userRole
        }, 'Authorization failed - insufficient role')
        
        throw new AuthorizationError('Insufficient role for this operation')
      }
      
      logger.debug({
        userId: user.userId,
        role: userRole
      }, 'Role authorization successful')
    }
  })

  /**
   * Optional authentication decorator - doesn't throw if token is missing
   */
  fastify.decorate('optionalAuth', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authorization = request.headers.authorization
      
      if (authorization && authorization.startsWith('Bearer ')) {
        await fastify.authenticate(request, reply)
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
      logger.debug('Optional authentication failed, continuing without user context')
    }
  })

  /**
   * Admin only decorator - requires Super Admin role
   */
  fastify.decorate('adminOnly', async function(request: FastifyRequest, reply: FastifyReply) {
    await fastify.authenticate(request, reply)
    await fastify.requireRole('Super Admin')(request, reply)
  })

  /**
   * API Key authentication for service-to-service communication
   */
  fastify.decorate('apiKeyAuth', async function(request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'] as string
    const validApiKeys = process.env.API_KEYS?.split(',') || []
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      throw new AuthenticationError('Valid API key required')
    }
    
    // Set a special service user context
    ;(request as any).user = {
      userId: 'system',
      email: 'system@chaincapital.com',
      role: 'Service',
      permissions: ['*'] // Service has all permissions
    }
  })
}

// Export as Fastify plugin
export const authenticationHandler = fp(authenticationPlugin, {
  name: 'authentication-handler'
})

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
    authorize(requiredPermissions?: string | string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole(requiredRoles: string | string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>
    adminOnly(request: FastifyRequest, reply: FastifyReply): Promise<void>
    apiKeyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>
  }
}
