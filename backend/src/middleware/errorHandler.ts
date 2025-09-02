import { FastifyError, FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { logger } from '@/utils/logger'

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'
  
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  statusCode = 401
  code = 'AUTHENTICATION_ERROR'
  
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  statusCode = 403
  code = 'AUTHORIZATION_ERROR'
  
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND_ERROR'
  
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  code = 'CONFLICT_ERROR'
  
  constructor(message: string = 'Resource already exists') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends Error {
  statusCode = 429
  code = 'RATE_LIMIT_ERROR'
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ServiceError extends Error {
  statusCode = 500
  code = 'SERVICE_ERROR'
  
  constructor(message: string = 'Internal service error') {
    super(message)
    this.name = 'ServiceError'
  }
}

export class ExternalServiceError extends Error {
  statusCode = 502
  code = 'EXTERNAL_SERVICE_ERROR'
  
  constructor(message: string = 'External service unavailable', public service?: string) {
    super(message)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Error handler plugin
 * Provides standardized error handling across the application
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // Set custom error handler
  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const timestamp = new Date().toISOString()
    const requestId = request.id
    
    // Extract error details
    const statusCode = error.statusCode || 500
    const errorCode = (error as any).code || 'INTERNAL_SERVER_ERROR'
    const message = error.message || 'An unexpected error occurred'
    
    // Log error details
    const errorLog = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: errorCode,
        statusCode
      },
      request: {
        id: requestId,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.userId
      },
      timestamp
    }

    if (statusCode >= 500) {
      logger.error(errorLog, 'Server error occurred')
    } else if (statusCode >= 400) {
      logger.warn(errorLog, 'Client error occurred')
    }

    // Prepare error response
    const errorResponse = {
      error: {
        message,
        statusCode,
        code: errorCode,
        timestamp,
        requestId
      }
    }

    // Add details for development environment
    if (process.env.NODE_ENV === 'development') {
      (errorResponse.error as any).stack = error.stack
      if ((error as any).details) {
        (errorResponse.error as any).details = (error as any).details
      }
    }

    // Add validation errors if present
    if (error.validation) {
      (errorResponse.error as any).validation = error.validation
    }

    // Send error response
    reply.status(statusCode).send(errorResponse)
  })

  // Only set the error handler, don't add conflicting decorators
  // @fastify/sensible already provides all the common error methods we need

  // Handle 404 for unmatched routes
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const errorResponse = {
      error: {
        message: 'Route not found',
        statusCode: 404,
        code: 'ROUTE_NOT_FOUND',
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
      }
    }

    reply.status(404).send(errorResponse)
  })
}

// Export as Fastify plugin
export const errorHandler = fp(errorHandlerPlugin, {
  name: 'error-handler'
})

// Custom error classes are still available for use in services
// @fastify/sensible provides standard HTTP error methods
