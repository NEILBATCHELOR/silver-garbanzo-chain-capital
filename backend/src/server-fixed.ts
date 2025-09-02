/**
 * Chain Capital Backend - Fixed Development Server
 * Simplified version to isolate and fix startup issues
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './infrastructure/database/client'
import { createLogger } from './utils/logger'

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
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('FixedDevServer')

/**
 * Build fixed Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  logger.info('🔧 Building fixed Fastify application...')
  
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l'
        }
      }
    }
  })

  logger.info('📦 Registering core plugins...')

  // Register core plugins with basic configuration
  await app.register(import('@fastify/helmet'))
  logger.info('✅ Helmet registered')

  await app.register(import('@fastify/cors'), {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  })
  logger.info('✅ CORS registered')

  await app.register(import('@fastify/sensible'))
  logger.info('✅ Sensible registered')

  // Register JWT authentication
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'development-secret-key-not-for-production'
  })
  logger.info('✅ JWT registered')

  // Register authentication middleware
  try {
    await app.register(import('./middleware/auth/jwt-auth.js'))
    logger.info('✅ JWT auth middleware registered')
  } catch (error) {
    logger.warn('⚠️ JWT auth middleware failed, continuing without it:', error instanceof Error ? error.message : error)
  }

  // Basic Swagger (simplified)
  try {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Chain Capital Backend API (Development)',
          version: '1.0.0'
        }
      }
    })
    
    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    })
    logger.info('✅ Swagger registered')
  } catch (error) {
    logger.warn('⚠️ Swagger registration failed, continuing without it:', error instanceof Error ? error.message : error)
  }

  // Health check endpoint
  app.get('/health', async () => {
    try {
      const { checkDatabaseHealth } = await import('./infrastructure/database/client.js')
      const dbHealth = await checkDatabaseHealth()
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbHealth.status
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  logger.info('🛣️ Registering API routes...')

  // Register API routes with prefix
  const apiPrefix = '/api/v1'

  try {
    await app.register(projectRoutes, { prefix: apiPrefix })
    logger.info('✅ Projects routes registered')
  } catch (error) {
    logger.error('❌ Projects routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(investorRoutes, { prefix: apiPrefix })
    logger.info('✅ Investors routes registered')
  } catch (error) {
    logger.error('❌ Investors routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(captableRoutes, { prefix: apiPrefix })
    logger.info('✅ Cap table routes registered')
  } catch (error) {
    logger.error('❌ Cap table routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(tokenRoutes, { prefix: apiPrefix })
    logger.info('✅ Tokens routes registered')
  } catch (error) {
    logger.error('❌ Tokens routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(subscriptionRoutes, { prefix: apiPrefix })
    logger.info('✅ Subscriptions routes registered')
  } catch (error) {
    logger.error('❌ Subscriptions routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(documentRoutes, { prefix: apiPrefix })
    logger.info('✅ Documents routes registered')
  } catch (error) {
    logger.error('❌ Documents routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(walletRoutes, { prefix: apiPrefix })
    logger.info('✅ Wallets routes registered')
  } catch (error) {
    logger.error('❌ Wallets routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(auditRoutes, { prefix: apiPrefix })
    logger.info('✅ Audit routes registered')
  } catch (error) {
    logger.error('❌ Audit routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(userRoutes, { prefix: apiPrefix })
    logger.info('✅ Users routes registered')
  } catch (error) {
    logger.error('❌ Users routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(authRoutes, { prefix: apiPrefix })
    logger.info('✅ Auth routes registered')
  } catch (error) {
    logger.error('❌ Auth routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(policyRoutes, { prefix: apiPrefix })
    logger.info('✅ Policy routes registered')
  } catch (error) {
    logger.error('❌ Policy routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(ruleRoutes, { prefix: apiPrefix })
    logger.info('✅ Rules routes registered')
  } catch (error) {
    logger.error('❌ Rules routes failed:', error instanceof Error ? error.message : error)
  }

  try {
    await app.register(factoringRoutes, { prefix: apiPrefix })
    logger.info('✅ Factoring routes registered')
  } catch (error) {
    logger.error('❌ Factoring routes failed:', error instanceof Error ? error.message : error)
  }

  // Development debug routes
  if (NODE_ENV === 'development') {
    app.get('/debug/routes', async (request, reply) => {
      const routes = app.printRoutes()
      return reply.type('text/plain').send(routes)
    })
    logger.info('✅ Debug routes registered')
  }

  // Simple error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error)
    reply.status(error.statusCode || 500).send({
      error: {
        message: error.message,
        statusCode: error.statusCode || 500
      }
    })
  })

  logger.info('✅ Fastify application built successfully')
  return app
}

/**
 * Start fixed development server
 */
async function start() {
  try {
    logger.info('🚀 Starting Fixed Chain Capital Development Server...')
    
    // Initialize database connection
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build Fastify app
    const app = await buildApp()
    
    // Start server
    logger.info(`🌐 Starting server on ${HOST}:${PORT}...`)
    const address = await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    logger.info('🎉 Fixed development server started successfully!')
    logger.info(`📍 Server address: ${address}`)
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`)
    logger.info(`📚 API Documentation: http://localhost:${PORT}/docs`)
    
    if (NODE_ENV === 'development') {
      logger.info(`🐛 Debug Routes: http://localhost:${PORT}/debug/routes`)
    }

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
      
      try {
        await app.close()
        logger.info('✅ Server closed successfully')
        
        const { closeDatabaseConnection } = await import('./infrastructure/database/client.js')
        await closeDatabaseConnection()
        logger.info('✅ Database connection closed')
        
        logger.info('👋 Shutdown complete. Goodbye!')
        process.exit(0)
      } catch (error) {
        logger.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.error('❌ Failed to start fixed development server:', error)
    if (error instanceof Error) {
      logger.error('Error message:', error.message)
      logger.error('Error stack:', error.stack)
    }
    process.exit(1)
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error)
  process.exit(1)
})

// Start server
start()

export { buildApp, start }
export default start
