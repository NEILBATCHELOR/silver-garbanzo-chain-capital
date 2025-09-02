import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

/**
 * JWT Authentication Plugin
 * Provides the authenticate decorator that auth routes expect
 */
async function jwtAuthPlugin(fastify: FastifyInstance) {
  
  // Add authenticate decorator that auth routes are calling
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // Verify JWT token using fastify-jwt
      await request.jwtVerify()
      
      // Token is valid, continue with request
      fastify.log.debug({ userId: (request as any).user?.userId }, 'JWT authentication successful')
      
    } catch (err) {
      // Authentication failed
      fastify.log.warn({ error: err, url: request.url }, 'JWT authentication failed')
      
      reply.status(401).send({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  // Add optional authentication decorator (doesn't throw if no token)
  fastify.decorate('optionalAuthenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      fastify.log.debug({ userId: (request as any).user?.userId }, 'Optional JWT authentication successful')
    } catch (err) {
      // Optional auth - just continue without user context
      fastify.log.debug({ url: request.url }, 'No JWT token provided for optional auth')
    }
  })

  fastify.log.info('JWT Authentication middleware loaded successfully')
}

export default fp(jwtAuthPlugin, {
  name: 'jwt-auth',
  dependencies: ['@fastify/jwt'],
  fastify: '4.x'
})
