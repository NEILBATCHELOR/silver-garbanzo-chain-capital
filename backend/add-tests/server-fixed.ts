/**
 * Chain Capital Backend - Fixed Development Server
 * Resolved import path issues for proper tsx compatibility
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './src/infrastructure/database/client'
import { createLogger } from './src/utils/logger'

// Types
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || 'localhost'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('FixedDevServer')

/**
 * Build fixed Fastify application
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
        }
      }
    },
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
  })

  // Register core plugins with error handling
  try {
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
    logger.info('✅ Helmet plugin registered')

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
    logger.info('✅ CORS plugin registered')

    await app.register(import('@fastify/rate-limit'), {
      max: 1000,
      timeWindow: '1 minute'
    })
    logger.info('✅ Rate limit plugin registered')

    await app.register(import('@fastify/sensible'))
    logger.info('✅ Sensible plugin registered')

    // Register JWT authentication
    await app.register(import('@fastify/jwt'), {
      secret: process.env.JWT_SECRET || 'development-secret-key-not-for-production'
    })
    logger.info('✅ JWT plugin registered')

    // Register Swagger
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Chain Capital Backend API',
          description: 'Comprehensive tokenization platform API',
          version: '1.0.0'
        }
      }
    })
    logger.info('✅ Swagger plugin registered')

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    })
    logger.info('✅ Swagger UI plugin registered')

  } catch (error) {
    logger.error('❌ Error registering plugins:', error)
    throw error
  }

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./src/infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbHealth.status,
        uptime: Math.floor(process.uptime()),
        services: {
          database: 'connected',
          api: 'operational',
          swagger: 'available'
        }
      })
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // API status endpoint
  app.get('/api/v1/status', async (request, reply) => {
    return reply.send({
      message: 'Chain Capital Backend API is operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        docs: '/docs',
        ready: '/ready'
      }
    })
  })

  // Ready check endpoint
  app.get('/ready', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./src/infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      
      return reply.send({
        status: 'ready',
        database: dbHealth.status,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return reply.status(503).send({
        status: 'not_ready',
        reason: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Development debug routes
  if (NODE_ENV === 'development') {
    app.get('/debug/routes', async (request, reply) => {
      return reply.type('text/plain').send(app.printRoutes())
    })

    app.get('/debug/plugins', async (request, reply) => {
      return reply.type('text/plain').send(app.printPlugins())
    })
  }

  // Error handlers
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error)
    const statusCode = error.statusCode || 500
    
    reply.status(statusCode).send({
      error: {
        message: NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        statusCode,
        timestamp: new Date().toISOString()
      }
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    })
  })

  return app
}

/**
 * Start the fixed server
 */
async function start() {
  try {
    logger.info('🚀 Starting Chain Capital Fixed Development Server...')
    
    // Initialize database connection
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build Fastify app
    logger.info('🏗️ Building Fastify application...')
    const app = await buildApp()
    
    // Start server
    logger.info(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    logger.info('🎉 Fixed development server started successfully!')
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/docs`)
    logger.info(`🏥 Health Check: http://${HOST}:${PORT}/health`)
    logger.info(`🚥 Ready Check: http://${HOST}:${PORT}/ready`)
    logger.info(`📊 API Status: http://${HOST}:${PORT}/api/v1/status`)
    
    if (NODE_ENV === 'development') {
      logger.info(`🐛 Debug Routes: http://${HOST}:${PORT}/debug/routes`)
      logger.info(`🔌 Debug Plugins: http://${HOST}:${PORT}/debug/plugins`)
    }

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Shutting down gracefully...`)
      
      try {
        await app.close()
        const { closeDatabaseConnection } = await import('./src/infrastructure/database/client')
        await closeDatabaseConnection()
        logger.info('✅ Shutdown complete')
        process.exit(0)
      } catch (error) {
        logger.error('❌ Shutdown error:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()
