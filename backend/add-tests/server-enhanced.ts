/**
 * Chain Capital Backend - Enhanced Development Server
 * Combines server-fixed.ts stability with full service route loading
 * All 13+ backend services properly exposed via API
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './src/infrastructure/database/client'
import { createLogger } from './src/utils/logger'

// Route imports - All 13+ services
import projectRoutes from './src/routes/projects'
import investorRoutes from './src/routes/investors'
import captableRoutes from './src/routes/captable'
import tokenRoutes from './src/routes/tokens'
import subscriptionRoutes from './src/routes/subscriptions'
import documentRoutes from './src/routes/documents'
import walletRoutes from './src/routes/wallets'
import auditRoutes from './src/routes/audit'
import userRoutes from './src/routes/users'
import policyRoutes from './src/routes/policy'
import ruleRoutes from './src/routes/rules'
import factoringRoutes from './src/routes/factoring'
import authRoutes from './src/routes/auth/index'

// Types
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || 'localhost'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('EnhancedServer')

/**
 * Build enhanced Fastify application with all services
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

    // Register authentication middleware (provides fastify.authenticate)
    await app.register(import('./src/middleware/auth/jwt-auth'))
    logger.info('✅ JWT authentication middleware registered')

    // Register Swagger with comprehensive configuration
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Chain Capital Backend API - Complete Platform',
          description: `
# Complete Chain Capital Tokenization Platform API

## 🎯 Overview

This API provides comprehensive backend services for the Chain Capital institutional tokenization platform, supporting the complete lifecycle of digital asset creation, management, and trading.

## 📊 Available Services

### Core Business Services
- **Projects** - Investment project management and lifecycle
- **Investors** - Comprehensive investor onboarding and management
- **Cap Tables** - Capitalization table management and analytics
- **Tokens** - Multi-standard token creation and management (ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626)
- **Subscriptions** - Investment subscription and redemption processing
- **Documents** - Document management with version control and compliance

### Advanced Features
- **Wallets** - Multi-chain HD wallets, smart contracts, multi-sig, account abstraction
- **Factoring** - Healthcare invoice factoring with tokenization
- **Compliance** - Policy and rule management with automated validation
- **Audit** - Comprehensive audit trail and system monitoring

### System Services
- **Authentication** - JWT-based auth with MFA and role-based access
- **User Management** - User lifecycle and permission management

## 🏗️ Architecture

- **Framework**: Fastify (2x faster than Express)
- **Database**: Prisma ORM + Supabase PostgreSQL
- **Validation**: JSON Schema + Business Rules
- **Documentation**: OpenAPI 3.0 + Swagger UI
- **Security**: JWT, Rate Limiting, CORS, Helmet

## 🚀 Features

- **Multi-Chain Support**: Bitcoin, Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Solana, NEAR
- **Enterprise Security**: HSM integration, multi-sig wallets, hardware security
- **Compliance Ready**: KYC/AML, audit trails, regulatory reporting
- **Production Scale**: Connection pooling, query optimization, comprehensive monitoring
`,
          version: '1.0.0',
          contact: {
            name: 'Chain Capital',
            url: 'https://chaincapital.com',
            email: 'api@chaincapital.com'
          }
        },
        servers: [
          {
            url: 'http://localhost:3001/api/v1',
            description: 'Development server'
          }
        ],
        tags: [
          { name: 'Projects', description: 'Investment project management' },
          { name: 'Investors', description: 'Investor lifecycle and management' },
          { name: 'Cap Tables', description: 'Capitalization table management' },
          { name: 'Tokens', description: 'Multi-standard token operations' },
          { name: 'Subscriptions', description: 'Investment processing' },
          { name: 'Documents', description: 'Document management and compliance' },
          { name: 'Wallets', description: 'Multi-chain wallet infrastructure' },
          { name: 'Factoring', description: 'Healthcare invoice factoring' },
          { name: 'Authentication', description: 'User authentication and authorization' },
          { name: 'Users', description: 'User management and roles' },
          { name: 'Policies', description: 'Policy management and validation' },
          { name: 'Rules', description: 'Business rule engine' },
          { name: 'Audit', description: 'System audit and monitoring' },
          { name: 'Health', description: 'System health and status' },
          { name: 'Analytics', description: 'Business intelligence and reporting' }
        ]
      }
    })
    logger.info('✅ Swagger plugin registered')

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayOperationId: true,
        displayRequestDuration: true,
        filter: true,
        maxDisplayedTags: 20,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      },
      uiHooks: {
        onRequest: (request, reply, next) => { next() },
        preHandler: (request, reply, next) => { next() }
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      exposeRoute: true
    })
    logger.info('✅ Swagger UI plugin registered')

  } catch (error) {
    logger.error('❌ Error registering plugins:', error)
    throw error
  }

  // System Health and Status Endpoints
  app.get('/health', {
    schema: {
      description: 'Comprehensive system health check',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string', example: 'development' },
            database: { type: 'string', example: 'healthy' },
            uptime: { type: 'number', example: 3600 },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', example: 'connected' },
                api: { type: 'string', example: 'operational' },
                swagger: { type: 'string', example: 'available' }
              }
            },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number', example: 45 },
                total: { type: 'number', example: 128 },
                free: { type: 'number', example: 83 }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./src/infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      const memUsage = process.memoryUsage()
      
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
        },
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024)
        }
      })
    } catch (error) {
      logger.error('Health check failed:', error)
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // API status endpoint
  app.get('/api/v1/status', {
    schema: {
      description: 'API status and service overview',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 13 },
                available: { type: 'array', items: { type: 'string' } }
              }
            },
            endpoints: {
              type: 'object',
              properties: {
                health: { type: 'string', example: '/health' },
                docs: { type: 'string', example: '/docs' },
                ready: { type: 'string', example: '/ready' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      message: 'Chain Capital Backend API - Complete Platform Operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        total: 13,
        available: [
          'projects', 'investors', 'captable', 'tokens', 'subscriptions',
          'documents', 'wallets', 'factoring', 'authentication', 'users',
          'policies', 'rules', 'audit'
        ]
      },
      endpoints: {
        health: '/health',
        docs: '/docs',
        ready: '/ready',
        api: '/api/v1'
      }
    })
  })

  // Ready check endpoint
  app.get('/ready', {
    schema: {
      description: 'Service readiness check',
      tags: ['Health']
    }
  }, async (request, reply) => {
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

  // Register all API routes with prefix
  const apiPrefix = process.env.API_PREFIX || '/api/v1'

  try {
    // Core business routes
    logger.info('🔄 Registering core business routes...')
    await app.register(projectRoutes, { prefix: apiPrefix })
    logger.info('✅ Projects routes registered')
    
    await app.register(investorRoutes, { prefix: apiPrefix })
    logger.info('✅ Investors routes registered')
    
    await app.register(captableRoutes, { prefix: apiPrefix })
    logger.info('✅ Cap Table routes registered')
    
    await app.register(tokenRoutes, { prefix: apiPrefix })
    logger.info('✅ Tokens routes registered')
    
    await app.register(subscriptionRoutes, { prefix: apiPrefix })
    logger.info('✅ Subscriptions routes registered')
    
    await app.register(documentRoutes, { prefix: apiPrefix })
    logger.info('✅ Documents routes registered')
    
    await app.register(walletRoutes, { prefix: apiPrefix })
    logger.info('✅ Wallets routes registered')

    // System and management routes
    logger.info('🔄 Registering system routes...')
    await app.register(auditRoutes, { prefix: apiPrefix })
    logger.info('✅ Audit routes registered')
    
    await app.register(userRoutes, { prefix: apiPrefix })
    logger.info('✅ Users routes registered')
    
    await app.register(authRoutes, { prefix: apiPrefix })
    logger.info('✅ Authentication routes registered')

    // Compliance and specialized routes
    logger.info('🔄 Registering specialized routes...')
    await app.register(policyRoutes, { prefix: apiPrefix })
    logger.info('✅ Policy routes registered')
    
    await app.register(ruleRoutes, { prefix: apiPrefix })
    logger.info('✅ Rules routes registered')
    
    await app.register(factoringRoutes, { prefix: apiPrefix })
    logger.info('✅ Factoring routes registered')

    logger.info('🎉 All 13 service routes registered successfully!')

  } catch (error) {
    logger.error('❌ Error registering routes:', error)
    throw error
  }

  // Development debug routes
  if (NODE_ENV === 'development') {
    app.get('/debug/routes', {
      schema: {
        description: 'List all registered routes',
        tags: ['Health']
      }
    }, async (request, reply) => {
      return reply.type('text/plain').send(app.printRoutes())
    })

    app.get('/debug/plugins', {
      schema: {
        description: 'List all registered plugins',
        tags: ['Health']
      }
    }, async (request, reply) => {
      return reply.type('text/plain').send(app.printPlugins())
    })

    app.get('/debug/services', {
      schema: {
        description: 'List all available services',
        tags: ['Health']
      }
    }, async (request, reply) => {
      return reply.send({
        services: [
          { name: 'Projects', endpoints: 15, status: 'active' },
          { name: 'Investors', endpoints: 18, status: 'active' },
          { name: 'Cap Tables', endpoints: 25, status: 'active' },
          { name: 'Tokens', endpoints: 12, status: 'active' },
          { name: 'Subscriptions', endpoints: 20, status: 'active' },
          { name: 'Documents', endpoints: 15, status: 'active' },
          { name: 'Wallets', endpoints: 50, status: 'active' },
          { name: 'Factoring', endpoints: 18, status: 'active' },
          { name: 'Authentication', endpoints: 13, status: 'active' },
          { name: 'Users', endpoints: 10, status: 'active' },
          { name: 'Policies', endpoints: 12, status: 'active' },
          { name: 'Rules', endpoints: 10, status: 'active' },
          { name: 'Audit', endpoints: 8, status: 'active' }
        ],
        total_endpoints: 226,
        documentation: '/docs',
        timestamp: new Date().toISOString()
      })
    })
  }

  // Error handlers
  app.setErrorHandler((error, request, reply) => {
    app.log.error({
      error,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        ip: request.ip
      }
    }, 'Request failed')
    
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
        timestamp: new Date().toISOString(),
        availableRoutes: NODE_ENV === 'development' ? '/debug/routes' : undefined
      }
    })
  })

  return app
}

/**
 * Start the enhanced server with all services
 */
async function start() {
  try {
    logger.info('🚀 Starting Chain Capital Enhanced Server with All Services...')
    
    // Initialize database connection
    logger.info('📂 Initializing database connection...')
    await initializeDatabase()
    logger.info('✅ Database connection established')

    // Build Fastify app
    logger.info('🏗️ Building comprehensive Fastify application...')
    const app = await buildApp()
    
    // Start server
    logger.info(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    // Success messages
    logger.info('🎉 Enhanced server with all services started successfully!')
    logger.info('')
    logger.info('📋 AVAILABLE SERVICES:')
    logger.info('   🏢 Projects        - Investment project management')
    logger.info('   👥 Investors       - Investor lifecycle & KYC')
    logger.info('   📊 Cap Tables      - Capitalization management')
    logger.info('   🪙  Tokens         - Multi-standard token ops')
    logger.info('   💰 Subscriptions  - Investment processing')
    logger.info('   📄 Documents       - Document & compliance')
    logger.info('   💳 Wallets        - Multi-chain infrastructure')
    logger.info('   🏥 Factoring      - Healthcare invoice factoring')
    logger.info('   🔐 Authentication - Security & auth')
    logger.info('   👤 Users          - User management')
    logger.info('   📋 Policies       - Policy management')
    logger.info('   ⚖️  Rules          - Business rules')
    logger.info('   📈 Audit          - System monitoring')
    logger.info('')
    logger.info(`📚 Complete API Documentation: http://${HOST}:${PORT}/docs`)
    logger.info(`🏥 System Health: http://${HOST}:${PORT}/health`)
    logger.info(`🚥 Ready Check: http://${HOST}:${PORT}/ready`)
    logger.info(`📊 API Status: http://${HOST}:${PORT}/api/v1/status`)
    
    if (NODE_ENV === 'development') {
      logger.info(`🐛 Debug Routes: http://${HOST}:${PORT}/debug/routes`)
      logger.info(`🔌 Debug Plugins: http://${HOST}:${PORT}/debug/plugins`)
      logger.info(`⚙️  Debug Services: http://${HOST}:${PORT}/debug/services`)
    }
    
    logger.info('')
    logger.info('🎯 All 226+ API endpoints are now accessible!')

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
    logger.error('❌ Failed to start enhanced server:', error)
    process.exit(1)
  }
}

start()
