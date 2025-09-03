/**
 * Chain Capital Backend - Development Server
 * Optimized for development with detailed logging, hot reload support, and comprehensive debugging
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './infrastructure/database/client'
import { swaggerOptions, swaggerUiOptions } from './config/swagger'
import { createLogger } from './utils/logger'
import auditMiddleware from './middleware/audit/audit-middleware'
import { initializeSystemAuditMonitor } from './middleware/audit/system-audit-monitor'
import { logError } from './utils/loggerAdapter'

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
import complianceRoutes from './routes/compliance'
import calendarRoutes from './routes/calendar'
import navRoutes from './routes/nav'
import authRoutes from './routes/auth/index'

// Types
import type { RouteHandlerMethod } from 'fastify'

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || 'localhost'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('DevelopmentServer')

/**
 * Build development Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '[{level}] {msg}',
          customColors: 'error:red,warn:yellow,info:blue,debug:gray',
          customLevels: 'info:30,warn:40,error:50,debug:20'
        }
      }
    },
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
    keepAliveTimeout: 30000,
    requestTimeout: 60000
  })

  // Register core plugins
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  })

  await app.register(import('@fastify/cors'), {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true
  })

  await app.register(import('@fastify/rate-limit'), {
    max: 1000, // High limit for development
    timeWindow: '1 minute',
    skipOnError: true,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    }
  })

  await app.register(import('@fastify/sensible'))

  // Register JWT authentication
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'development-secret-key-not-for-production',
    sign: {
      expiresIn: '7d'
    }
  })

  // Register authentication middleware (provides fastify.authenticate)
  await app.register(import('./middleware/auth/jwt-auth'))

  // Register Swagger documentation
  await app.register(import('@fastify/swagger'), {
    ...swaggerOptions,
    openapi: {
      ...swaggerOptions.openapi!,
      info: {
        ...swaggerOptions.openapi!.info,
        title: 'Chain Capital Backend API (Development)',
        version: `${swaggerOptions.openapi?.info?.version || '1.0.0'}-dev`
      }
    }
  })

  await app.register(import('@fastify/swagger-ui'), swaggerUiOptions)

  // Register comprehensive audit middleware (commented out for debugging)
  // await app.register(auditMiddleware, {
  //   enabled: true,
  //   captureRequestBody: true,
  //   captureResponseBody: true,
  //   maxBodySize: 10000,
  //   sensitiveFields: ['password', 'token', 'secret', 'key'],
  //   logLevel: 'debug'
  // })

  // Health check endpoint
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
            environment: { type: 'string' },
            database: { type: 'string' },
            uptime: { type: 'number' },
            memory: { 
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
                free: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      const memUsage = process.memoryUsage()
      
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbHealth.status,
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024)
        }
      })
    } catch (error) {
      logError(app.log, 'Health check failed:', error)
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Ready check endpoint
  app.get('/ready', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      
      if (dbHealth.status === 'unhealthy') {
        return reply.status(503).send({
          status: 'not_ready',
          reason: 'Database not available',
          timestamp: new Date().toISOString()
        })
      }
      
      return reply.send({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'ready',
          audit: 'ready',
          swagger: 'ready'
        }
      })
    } catch (error) {
      return reply.status(503).send({
        status: 'not_ready',
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  })

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
  await app.register(navRoutes, { prefix: apiPrefix })
  
  // System routes
  await app.register(auditRoutes, { prefix: apiPrefix })
  await app.register(userRoutes, { prefix: apiPrefix })
  await app.register(authRoutes, { prefix: apiPrefix })
  
  // Compliance and rules
  await app.register(complianceRoutes, { prefix: `${apiPrefix}/compliance` })
  await app.register(calendarRoutes, { prefix: apiPrefix })
  await app.register(policyRoutes, { prefix: apiPrefix })
  await app.register(ruleRoutes, { prefix: apiPrefix })
  await app.register(factoringRoutes, { prefix: apiPrefix })

  // Development-only routes
  if (NODE_ENV === 'development') {
    // Debug routes
    app.get('/debug/routes', async (request, reply) => {
      const routes = app.printRoutes({ includeHooks: true, commonPrefix: false })
      return reply.type('text/plain').send(routes)
    })

    app.get('/debug/plugins', async (request, reply) => {
      const plugins = app.printPlugins()
      return reply.type('text/plain').send(plugins)
    })

    app.get('/debug/env', async (request, reply) => {
      const safeEnv = Object.entries(process.env)
        .filter(([key]) => !key.toLowerCase().includes('secret') && 
                           !key.toLowerCase().includes('password') && 
                           !key.toLowerCase().includes('key'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      
      return reply.send({
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: safeEnv,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      })
    })
  }

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logError(app.log, 'Request failed', {
      err: error,
      req: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        remoteAddress: request.ip
      }
    })

    // Don't leak error details in production
    if (NODE_ENV === 'production') {
      reply.status(500).send({
        error: {
          message: 'Internal Server Error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      reply.status(error.statusCode || 500).send({
        error: {
          message: error.message,
          statusCode: error.statusCode || 500,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      })
    }
  })

  // Global not found handler
  app.setNotFoundHandler((request, reply) => {
    app.log.warn({
      method: request.method,
      url: request.url,
      ip: request.ip
    }, 'Route not found')

    reply.status(404).send({
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        availableRoutes: NODE_ENV === 'development' ? '/debug/routes' : undefined
      }
    })
  })

  return app
}

/**
 * Start development server
 */
async function start() {
  try {
    logger.info('🚀 Starting Chain Capital Development Server...')
    
    // Initialize database connection
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build Fastify app
    logger.info('🏗️ Building Fastify application...')
    const app = await buildApp()
    
    // Initialize system audit monitoring (commented out for debugging)
    // logger.info('🔍 Initializing system audit monitoring...')
    // await initializeSystemAuditMonitor({
    //   captureStartup: true,
    //   captureJobs: true,
    //   captureExternalCalls: true,
    //   performanceThreshold: 5000
    // })
    // logger.info('✅ System audit monitoring active')

    // Start server
    logger.info(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    logger.info('🎉 Development server started successfully!')
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/docs`)
    logger.info(`🏥 Health Check: http://${HOST}:${PORT}/health`)
    logger.info(`🚥 Ready Check: http://${HOST}:${PORT}/ready`)
    
    if (NODE_ENV === 'development') {
      logger.info(`🐛 Debug Routes: http://${HOST}:${PORT}/debug/routes`)
      logger.info(`🔌 Debug Plugins: http://${HOST}:${PORT}/debug/plugins`)
      logger.info(`⚙️ Debug Environment: http://${HOST}:${PORT}/debug/env`)
    }

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
      
      try {
        await app.close()
        logger.info('✅ Server closed successfully')
        
        const { closeDatabaseConnection } = await import('./infrastructure/database/client')
        await closeDatabaseConnection()
        logger.info('✅ Database connection closed')
        
        logger.info('👋 Shutdown complete. Goodbye!')
        process.exit(0)
      } catch (error) {
        logger.error(error, '❌ Error during shutdown:')
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.error(error, '❌ Failed to start development server:')
    process.exit(1)
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection at')
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught Exception thrown:')
  process.exit(1)
})

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

export { buildApp, start }
export default start
