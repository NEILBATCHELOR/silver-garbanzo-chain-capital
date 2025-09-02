/**
 * Chain Capital Backend - Production Server
 * Optimized for production with security, performance, and monitoring
 */

import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { initializeDatabase } from './infrastructure/database/client'
import { swaggerOptions, swaggerUiOptions } from './config/swagger'
import { jwtOptions } from './config/jwt'
import { createLogger } from './utils/logger'
import auditMiddleware from './middleware/audit/audit-middleware'
import { initializeSystemAuditMonitor } from './middleware/audit/system-audit-monitor'

// Route imports
import projectRoutes from './routes/projects'
import investorRoutes from './routes/investors'
import captableRoutes from './routes/captable'
import auditRoutes from './routes/audit'
import tokenRoutes from './routes/tokens'
import userRoutes from './routes/users'
import walletRoutes from './routes/wallets'
import documentRoutes from './routes/documents'
import subscriptionRoutes from './routes/subscriptions'
import policyRoutes from './routes/policy'
import ruleRoutes from './routes/rules'
import factoringRoutes from './routes/factoring'
import authRoutes from './routes/auth/index'

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'production'

// Create logger
const logger = createLogger('ProductionServer')

/**
 * Build production Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'warn',
      serializers: {
        req: (request) => ({
          method: request.method,
          url: request.url,
          headers: {
            host: request.headers.host,
            'user-agent': request.headers['user-agent'],
            'content-type': request.headers['content-type']
          },
          remoteAddress: request.ip
        }),
        res: (response) => ({
          statusCode: response.statusCode
        })
      }
    },
    disableRequestLogging: process.env.DISABLE_REQUEST_LOGGING === 'true',
    requestIdHeader: 'x-request-id',
    trustProxy: true,
    bodyLimit: parseInt(process.env.MAX_BODY_SIZE || '10485760', 10), // 10MB
    keepAliveTimeout: 30000,
    requestTimeout: 30000,
    connectionTimeout: 10000
  })

  // Security headers
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.chaincapital.com"]
      }
    },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })

  // CORS configuration for production
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['https://app.chaincapital.com']
  await app.register(import('@fastify/cors'), {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true,
    optionsSuccessStatus: 200
  })

  // Production rate limiting
  await app.register(import('@fastify/rate-limit'), {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
    skipOnError: false,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    },
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (request, context) => ({
      error: {
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
        retryAfter: Math.round(context.ttl / 1000),
        timestamp: new Date().toISOString()
      }
    })
  })

  await app.register(import('@fastify/sensible'))

  // JWT authentication with production security
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production')
  }
  
  await app.register(jwt, {
    ...jwtOptions,
    secret: process.env.JWT_SECRET
  })

  // Conditional Swagger registration (can be disabled in production)
  if (process.env.ENABLE_SWAGGER !== 'false') {
    await app.register(import('@fastify/swagger'), {
      ...swaggerOptions,
      openapi: {
        ...swaggerOptions.openapi!,
        info: {
          ...swaggerOptions.openapi!.info,
          title: 'Chain Capital Backend API',
          version: swaggerOptions.openapi?.info?.version || '1.0.0'
        },
        servers: [
          {
            url: `https://${process.env.API_DOMAIN || 'api.chaincapital.com'}`,
            description: 'Production server'
          }
        ]
      }
    })

    await app.register(import('@fastify/swagger-ui'), {
      ...swaggerUiOptions,
      routePrefix: process.env.SWAGGER_ROUTE_PREFIX || '/docs',
      staticCSP: true,
      uiConfig: {
        ...swaggerUiOptions.uiConfig,
        tryItOutEnabled: process.env.SWAGGER_TRY_IT_OUT === 'true'
      }
    })
  }

  // Production audit middleware
  await app.register(auditMiddleware, {
    enabled: process.env.ENABLE_AUDIT !== 'false',
    captureRequestBody: process.env.AUDIT_CAPTURE_REQUEST_BODY === 'true',
    captureResponseBody: false, // Disabled for performance in production
    maxBodySize: 5000,
    sensitiveFields: [
      'password', 'token', 'secret', 'key', 'authorization', 
      'cookie', 'x-api-key', 'refresh_token', 'access_token'
    ],
    logLevel: 'warn',
    batchSize: 100,
    flushInterval: 5000
  })

  // Health check endpoint (minimal)
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    })
  })

  // Ready check with database verification
  app.get('/ready', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      
      if (dbHealth.status === 'unhealthy') {
        return reply.status(503).send({
          status: 'not_ready',
          timestamp: new Date().toISOString()
        })
      }
      
      return reply.send({
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      app.log.error('Ready check failed:', error)
      return reply.status(503).send({
        status: 'not_ready',
        timestamp: new Date().toISOString()
      })
    }
  })

  // Metrics endpoint (if enabled)
  if (process.env.ENABLE_METRICS === 'true') {
    app.get('/metrics', async (request, reply) => {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      
      return reply.send({
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        version: process.env.npm_package_version || '1.0.0'
      })
    })
  }

  // Register API routes with prefix
  const apiPrefix = process.env.API_PREFIX || '/api/v1'

  // Core business routes
  await app.register(projectRoutes, { prefix: apiPrefix })
  await app.register(investorRoutes, { prefix: apiPrefix })
  await app.register(captableRoutes, { prefix: apiPrefix })
  await app.register(tokenRoutes, { prefix: apiPrefix })
  await app.register(subscriptionRoutes, { prefix: apiPrefix })
  await app.register(documentRoutes, { prefix: apiPrefix })
  await app.register(walletRoutes, { prefix: apiPrefix })
  
  // System routes
  await app.register(auditRoutes, { prefix: apiPrefix })
  await app.register(userRoutes, { prefix: apiPrefix })
  await app.register(authRoutes, { prefix: apiPrefix })
  
  // Compliance and rules
  await app.register(policyRoutes, { prefix: apiPrefix })
  await app.register(ruleRoutes, { prefix: apiPrefix })
  await app.register(factoringRoutes, { prefix: apiPrefix })

  // Production error handler
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.headers['x-request-id'] || 'unknown'
    
    // Log error with request context
    app.log.error({
      err: error,
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'Request failed')

    // Security: Don't leak internal error details
    const statusCode = error.statusCode || 500
    const isClientError = statusCode >= 400 && statusCode < 500
    
    reply.status(statusCode).send({
      error: {
        message: isClientError ? error.message : 'Internal Server Error',
        statusCode,
        timestamp: new Date().toISOString(),
        requestId
      }
    })
  })

  // Production not found handler
  app.setNotFoundHandler((request, reply) => {
    app.log.warn({
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'Route not found')

    reply.status(404).send({
      error: {
        message: 'Resource not found',
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    })
  })

  return app
}

/**
 * Start production server
 */
async function start() {
  try {
    logger.info('🚀 Starting Chain Capital Production Server...')
    
    // Validate required environment variables
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
    }

    // Initialize database connection
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build Fastify app
    const app = await buildApp()
    
    // Initialize system audit monitoring (production mode)
    logger.info('🔍 Initializing system audit monitoring...')
    await initializeSystemAuditMonitor({
      captureStartup: true,
      captureJobs: true,
      captureExternalCalls: true,
      performanceThreshold: 10000 // Higher threshold for production
    })
    logger.info('✅ System audit monitoring active')

    // Start server
    await app.listen({ 
      port: PORT, 
      host: HOST,
      listenTextResolver: (address) => `Server listening at ${address}`
    })
    
    logger.info('✅ Production server started successfully')
    logger.info(`🌐 Server running on ${HOST}:${PORT}`)
    logger.info(`📊 Environment: ${NODE_ENV}`)
    
    if (process.env.ENABLE_SWAGGER !== 'false') {
      logger.info(`📚 API Documentation: https://${process.env.API_DOMAIN || `${HOST}:${PORT}`}/docs`)
    }

    // Production graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
      
      const shutdownTimeout = setTimeout(() => {
        logger.error('❌ Graceful shutdown timeout. Forcing exit.')
        process.exit(1)
      }, 10000) // 10 second timeout
      
      try {
        await app.close()
        logger.info('✅ Server closed successfully')
        
        const { closeDatabaseConnection } = await import('./infrastructure/database/client')
        await closeDatabaseConnection()
        logger.info('✅ Database connection closed')
        
        clearTimeout(shutdownTimeout)
        logger.info('👋 Shutdown complete')
        process.exit(0)
      } catch (error) {
        logger.error('❌ Error during shutdown:', error)
        clearTimeout(shutdownTimeout)
        process.exit(1)
      }
    }

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // Handle worker thread termination (PM2, Docker, etc.)
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        gracefulShutdown('SHUTDOWN_MESSAGE')
      }
    })
    
  } catch (error) {
    logger.error('❌ Failed to start production server:', error)
    process.exit(1)
  }
}

// Production error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit immediately in production, let monitoring systems handle it
  if (NODE_ENV !== 'production') {
    process.exit(1)
  }
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

// Memory monitoring
if (process.env.ENABLE_MEMORY_MONITORING === 'true') {
  setInterval(() => {
    const memUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    
    if (heapUsedMB > 500) { // 500MB threshold
      logger.warn(`High memory usage: ${heapUsedMB}MB used of ${heapTotalMB}MB total`)
    }
  }, 60000) // Check every minute
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

export { buildApp, start }
export default start
