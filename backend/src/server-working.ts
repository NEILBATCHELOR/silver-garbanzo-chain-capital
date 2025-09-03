/**
 * Chain Capital Backend - Working Development Server
 * Fixed version based on successful debugging - January 7, 2025
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './infrastructure/database/client'
import { createLogger } from './utils/logger'
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
import authRoutes from './routes/auth/index'

// Environment configuration - FIXED: Use localhost instead of 0.0.0.0 for macOS compatibility
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = 'localhost'  // Force localhost - ignore environment variable
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('WorkingDevServer')

/**
 * Build working Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  logger.info('🏗️ Building Chain Capital Fastify application...')
  
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    },
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
    requestTimeout: 60000
  })

  logger.info('📦 Registering core plugins...')

  // Core security and functionality plugins
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
    skipOnError: true
  })

  await app.register(import('@fastify/sensible'))

  // JWT authentication
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'development-secret-key-not-for-production',
    sign: { expiresIn: '7d' }
  })

  // JWT auth middleware
  try {
    await app.register(import('./middleware/auth/jwt-auth.js'))
    logger.info('✅ JWT authentication middleware loaded')
  } catch (error) {
      logger.warn(`⚠️ JWT auth middleware failed, continuing: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Swagger documentation
  try {
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Chain Capital Backend API (Development)',
          version: '1.0.0',
          description: 'Chain Capital tokenization platform backend API'
        },
        servers: [
          { url: `http://localhost:${PORT}`, description: 'Development server' }
        ]
      }
    })
    
    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    })
    logger.info('✅ Swagger documentation loaded')
  } catch (error) {
      logger.warn(`⚠️ Swagger failed, continuing without docs: ${error instanceof Error ? error.message : String(error)}`)
  }

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
            database: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
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
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  logger.info('🛣️ Registering API routes...')

  // Register all API routes with error handling
  const apiPrefix = '/api/v1'
  const routes = [
    { name: 'Projects', routes: projectRoutes },
    { name: 'Investors', routes: investorRoutes },
    { name: 'Cap Table', routes: captableRoutes },
    { name: 'Tokens', routes: tokenRoutes },
    { name: 'Subscriptions', routes: subscriptionRoutes },
    { name: 'Documents', routes: documentRoutes },
    { name: 'Wallets', routes: walletRoutes },
    { name: 'Audit', routes: auditRoutes },
    { name: 'Users', routes: userRoutes },
    { name: 'Auth', routes: authRoutes },
    { name: 'Policy', routes: policyRoutes },
    { name: 'Rules', routes: ruleRoutes },
    { name: 'Factoring', routes: factoringRoutes }
  ]

  for (const route of routes) {
    try {
      await app.register(route.routes, { prefix: apiPrefix })
      logger.info(`✅ ${route.name} routes registered`)
    } catch (error) {
      logger.error(`❌ ${route.name} routes failed: ${String(error)}`)
    }
  }

  // Development debug routes
  if (NODE_ENV === 'development') {
    app.get('/debug/routes', async (request, reply) => {
      const routes = app.printRoutes({ includeHooks: true, commonPrefix: false })
      return reply.type('text/plain').send(routes)
    })
    
    app.get('/debug/env', async (request, reply) => {
      const safeEnv = Object.entries(process.env)
        .filter(([key]) => !key.toLowerCase().includes('secret') && 
                           !key.toLowerCase().includes('password') && 
                           !key.toLowerCase().includes('key'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      
      return {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: safeEnv
      }
    })
  }

  // Error handlers
  app.setErrorHandler((error, request, reply) => {
    logError(app.log, 'Request failed', {
      err: error,
      req: { method: request.method, url: request.url }
    })

    reply.status(error.statusCode || 500).send({
      error: {
        message: NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        statusCode: error.statusCode || 500,
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

  logger.info('✅ Fastify application built successfully')
  return app
}

/**
 * Start the working development server
 */
async function start() {
  try {
    logger.info('🚀 Starting Chain Capital Development Server...')
    logger.info(`📍 Node.js ${process.version} on ${process.platform}`)
    
    // Initialize database
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build app
    const app = await buildApp()
    
    // Start server with FIXED host configuration
    logger.info(`🌐 Starting server on ${HOST}:${PORT}...`)
    const address = await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    console.log('\n🎉✨ CHAIN CAPITAL BACKEND SERVER STARTED SUCCESSFULLY! ✨🎉\n')
    console.log(`📍 Server Address: ${address}`)
    console.log(`🏥 Health Check:   http://localhost:${PORT}/health`)
    console.log(`📚 API Docs:       http://localhost:${PORT}/docs`)
    console.log(`🔍 Debug Routes:   http://localhost:${PORT}/debug/routes`)
    console.log(`⚙️  Debug Env:      http://localhost:${PORT}/debug/env`)
    console.log('\n🌐 Backend server is now ready to handle requests from the frontend!')
    console.log('💡 You can now run "npm run dev" in the frontend directory.\n')

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Shutting down gracefully...`)
      try {
        await app.close()
        logger.info('✅ Server closed')
        
        const { closeDatabaseConnection } = await import('./infrastructure/database/client.js')
        await closeDatabaseConnection()
        logger.info('✅ Database closed')
        
        console.log('👋 Shutdown complete!')
        process.exit(0)
      } catch (error) {
        logger.error(`❌ Shutdown error: ${error}`)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error}`)
    if (error instanceof Error) {
      logger.error(`Details: ${error.message}`)
      if (error.stack) logger.error(`Stack: ${error.stack}`)
    }
    process.exit(1)
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

// Start server
start()

export { buildApp, start }
export default start
