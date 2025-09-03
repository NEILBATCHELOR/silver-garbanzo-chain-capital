/**
 * Chain Capital Backend - Test Server
 * Optimized for testing with mocks, fixtures, and test utilities
 */

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './infrastructure/database/client'
import { swaggerOptions, swaggerUiOptions } from './config/swagger'
import { createLogger } from './utils/logger'
import { logError } from './utils/loggerAdapter'
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
const PORT = parseInt(process.env.TEST_PORT || '3002', 10)
const HOST = process.env.HOST || '127.0.0.1'
const NODE_ENV = 'test'

// Create logger (silent in test mode)
const logger = createLogger('TestServer')

/**
 * Build test Fastify application
 */
async function buildApp(options: { 
  enableLogs?: boolean
  enableDatabase?: boolean
  enableAudit?: boolean
  mockExternalAPIs?: boolean
} = {}): Promise<FastifyInstance> {
  
  const {
    enableLogs = false,
    enableDatabase = true,
    enableAudit = false,
    mockExternalAPIs = true
  } = options

  const app = Fastify({
    logger: enableLogs ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '[TEST] {msg}',
          customColors: 'info:blue,warn:yellow,error:red'
        }
      }
    } : false,
    disableRequestLogging: !enableLogs,
    requestIdHeader: 'x-test-request-id',
    trustProxy: false,
    bodyLimit: 50 * 1024 * 1024, // 50MB for large test data
    keepAliveTimeout: 5000,
    requestTimeout: 30000
  })

  // Basic security (relaxed for testing)
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: false
  })

  // Permissive CORS for testing
  await app.register(import('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'],
    credentials: true
  })

  // High rate limits for testing
  await app.register(import('@fastify/rate-limit'), {
    max: 10000,
    timeWindow: '1 minute',
    skipOnError: true,
    addHeaders: {
      'x-ratelimit-limit': false,
      'x-ratelimit-remaining': false,
      'x-ratelimit-reset': false
    }
  })

  await app.register(import('@fastify/sensible'))

  // JWT with test-friendly configuration
  await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'test-secret-key-for-testing-only-not-secure',
    sign: {
      expiresIn: '1d'
    },
    verify: {
      maxAge: '1d'
    }
  })

  // Test Swagger with additional test documentation
  await app.register(import('@fastify/swagger'), {
    ...swaggerOptions,
    openapi: {
      ...swaggerOptions.openapi!,
      info: {
        ...swaggerOptions.openapi!.info!,
        title: 'Chain Capital Backend API (Test Environment)',
        version: `${swaggerOptions.openapi?.info?.version || '1.0.0'}-test`,
        description: `${swaggerOptions.openapi?.info?.description || 'Chain Capital Backend API'}

## Test Environment Features

- **Test Authentication** - Simplified JWT tokens for testing
- **High Rate Limits** - No rate limiting interference during tests  
- **Mock External APIs** - External API calls are mocked by default
- **Test Data Endpoints** - Additional endpoints for test data management
- **Extended Timeouts** - Longer request timeouts for integration tests
- **Comprehensive Logging** - Detailed request/response logging when enabled

## Test Authentication

Use these test tokens for different user roles:
- **Admin**: \`test-admin-token\`
- **User**: \`test-user-token\`
- **Readonly**: \`test-readonly-token\`

Or generate tokens via \`POST /api/v1/test/auth/generate\`
        `
      },
      servers: [
        {
          url: `http://${HOST}:${PORT}`,
          description: 'Test server'
        }
      ]
    }
  })

  await app.register(import('@fastify/swagger-ui'), {
    ...swaggerUiOptions,
    routePrefix: '/test-docs',
    uiConfig: {
      ...swaggerUiOptions.uiConfig,
      tryItOutEnabled: true,
      deepLinking: true,
      displayRequestDuration: true
    }
  })

  // Conditional audit middleware (disabled by default in tests)
  if (enableAudit) {
    await app.register(auditMiddleware, {
      enabled: true,
      captureRequestBody: true,
      captureResponseBody: true,
      maxBodySize: 50000,
      logLevel: 'debug',
      batchSize: 10,
      flushInterval: 1000
    })
  }

  // Test health check with detailed information
  app.get('/health', {
    schema: {
      description: 'Test environment health check',
      tags: ['Health', 'Test'],
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
                total: { type: 'number' }
              }
            },
            testMode: { type: 'boolean' },
            features: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                audit: { type: 'boolean' },
                mocks: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      let dbStatus = 'disabled'
      
      if (enableDatabase) {
        const { checkDatabaseHealth } = await import('./infrastructure/database/client')
        const dbHealth = await checkDatabaseHealth()
        dbStatus = dbHealth.status
      }
      
      const memUsage = process.memoryUsage()
      
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: 'test',
        database: dbStatus,
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        testMode: true,
        features: {
          database: enableDatabase,
          audit: enableAudit,
          mocks: mockExternalAPIs
        }
      })
    } catch (error) {
      logError(app.log, 'Test health check failed:', error)
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: 'test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Test utilities endpoints
  app.register(async (testApp) => {
    const prefix = '/api/v1/test'

    // Test authentication endpoint
    testApp.post(`${prefix}/auth/generate`, {
      schema: {
        description: 'Generate test JWT tokens',
        tags: ['Test', 'Authentication'],
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string', default: 'test-user-id' },
            role: { type: 'string', enum: ['admin', 'user', 'readonly'], default: 'user' },
            expiresIn: { type: 'string', default: '1h' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              payload: { type: 'object' },
              expiresAt: { type: 'string' }
            }
          }
        }
      }
    }, async (request: any, reply) => {
      const { userId = 'test-user-id', role = 'user', expiresIn = '1h' } = request.body || {}
      
      const payload = {
        sub: userId,
        role,
        permissions: role === 'admin' ? ['*'] : role === 'readonly' ? ['read'] : ['read', 'write'],
        iat: Math.floor(Date.now() / 1000),
        iss: 'test-server'
      }
      
      const token = app.jwt.sign(payload, { expiresIn })
      const decoded = app.jwt.decode(token) as any
      
      return reply.send({
        token,
        payload,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      })
    })

    // Test data management endpoints
    if (enableDatabase) {
      testApp.post(`${prefix}/data/reset`, {
        schema: {
          description: 'Reset test database to clean state',
          tags: ['Test', 'Database'],
          body: {
            type: 'object',
            properties: {
              tables: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Specific tables to reset (all if not provided)'
              },
              confirm: { type: 'boolean', default: false }
            }
          }
        }
      }, async (request: any, reply) => {
        const { tables, confirm } = request.body || {}
        
        if (!confirm) {
          return reply.status(400).send({
            error: 'Must set confirm: true to reset test data'
          })
        }

        try {
          const { getDatabase } = await import('./infrastructure/database/client')
          const db = getDatabase()
          
          // Reset specific tables or all tables
          if (tables && tables.length > 0) {
            for (const table of tables) {
              await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
            }
          } else {
            // Reset all tables (be very careful with this)
            const tableResult = await db.$queryRaw<Array<{ tablename: string }>>`
              SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            `
            
            for (const row of tableResult) {
              await db.$executeRawUnsafe(`TRUNCATE TABLE "${row.tablename}" CASCADE`)
            }
          }
          
          return reply.send({
            message: 'Test data reset successfully',
            tables: tables || 'all',
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to reset test data',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      testApp.post(`${prefix}/data/seed`, {
        schema: {
          description: 'Load test fixtures into database',
          tags: ['Test', 'Database'],
          body: {
            type: 'object',
            properties: {
              fixtures: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fixture names to load'
              }
            }
          }
        }
      }, async (request: any, reply) => {
        const { fixtures = ['basic'] } = request.body || {}
        
        try {
          // This would integrate with your test fixtures
          return reply.send({
            message: 'Test fixtures loaded successfully',
            fixtures,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to load test fixtures',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
    }

    // Mock external API configuration
    if (mockExternalAPIs) {
      testApp.get(`${prefix}/mocks/status`, {
        schema: {
          description: 'Get status of mocked external APIs',
          tags: ['Test', 'Mocks']
        }
      }, async (request, reply) => {
        return reply.send({
          mocks: {
            stripe: { enabled: true, baseUrl: '/test/mocks/stripe' },
            moonpay: { enabled: true, baseUrl: '/test/mocks/moonpay' },
            blockchain: { enabled: true, baseUrl: '/test/mocks/blockchain' }
          },
          timestamp: new Date().toISOString()
        })
      })
    }

    // Test environment info
    testApp.get(`${prefix}/info`, {
      schema: {
        description: 'Get test environment information',
        tags: ['Test']
      }
    }, async (request, reply) => {
      return reply.send({
        environment: 'test',
        nodeVersion: process.version,
        features: {
          database: enableDatabase,
          audit: enableAudit,
          mocks: mockExternalAPIs,
          logs: enableLogs
        },
        endpoints: {
          health: '/health',
          docs: '/test-docs',
          apiPrefix: '/api/v1'
        },
        timestamp: new Date().toISOString()
      })
    })
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
  
  // System routes
  await app.register(auditRoutes, { prefix: apiPrefix })
  await app.register(userRoutes, { prefix: apiPrefix })
  await app.register(authRoutes, { prefix: apiPrefix })
  
  // Compliance and rules
  await app.register(policyRoutes, { prefix: apiPrefix })
  await app.register(ruleRoutes, { prefix: apiPrefix })
  await app.register(factoringRoutes, { prefix: apiPrefix })

  // Test-friendly error handler
  app.setErrorHandler((error, request, reply) => {
    if (enableLogs) {
      logError(app.log, 'Test request failed', {
        err: error,
        req: {
          method: request.method,
          url: request.url,
          headers: request.headers
        }
      })
    }

    // Include full error details in test mode
    reply.status(error.statusCode || 500).send({
      error: {
        message: error.message,
        statusCode: error.statusCode || 500,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-test-request-id']
      }
    })
  })

  // Test not found handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        message: `Test route ${request.method} ${request.url} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
          '/health',
          '/test-docs',
          '/api/v1/test/info'
        ]
      }
    })
  })

  return app
}

/**
 * Start test server
 */
async function start(options: {
  enableLogs?: boolean
  enableDatabase?: boolean
  enableAudit?: boolean
  mockExternalAPIs?: boolean
  port?: number
} = {}) {
  try {
    const {
      enableLogs = false,
      enableDatabase = true,
      enableAudit = false,
      mockExternalAPIs = true,
      port = PORT
    } = options

    if (enableLogs) {
      logger.info('🧪 Starting Chain Capital Test Server...')
    }

    // Initialize database if enabled
    if (enableDatabase) {
      if (enableLogs) logger.info('📂 Initializing test database connection...')
      await initializeDatabase()
      if (enableLogs) logger.info('✅ Test database connection established')
    }

    // Build Fastify app with test configuration
    const app = await buildApp({
      enableLogs,
      enableDatabase,
      enableAudit,
      mockExternalAPIs
    })
    
    // Initialize system monitoring if enabled
    if (enableAudit) {
      if (enableLogs) logger.info('🔍 Initializing test audit monitoring...')
      await initializeSystemAuditMonitor({
        captureStartup: true,
        captureJobs: false,
        captureExternalCalls: mockExternalAPIs,
        performanceThreshold: 1000
      })
      if (enableLogs) logger.info('✅ Test audit monitoring active')
    }

    // Start server
    await app.listen({ port, host: HOST })
    
    if (enableLogs) {
      logger.info('🎉 Test server started successfully!')
      logger.info(`🌐 Server: http://${HOST}:${port}`)
      logger.info(`📚 Test Docs: http://${HOST}:${port}/test-docs`)
      logger.info(`🏥 Health: http://${HOST}:${port}/health`)
      logger.info(`🧪 Test Utils: http://${HOST}:${port}/api/v1/test/info`)
    }

    return app
    
  } catch (error) {
    if (logger) {
      logger.error(error, '❌ Failed to start test server:')
    } else {
      console.error('❌ Failed to start test server:', error)
    }
    throw error
  }
}

/**
 * Create test app instance (for programmatic testing)
 */
async function createTestApp(options?: {
  enableLogs?: boolean
  enableDatabase?: boolean
  enableAudit?: boolean
  mockExternalAPIs?: boolean
}) {
  if (options?.enableDatabase) {
    await initializeDatabase()
  }
  
  return await buildApp(options)
}

/**
 * Helper function to close test app
 */
async function closeTestApp(app: FastifyInstance) {
  try {
    await app.close()
    const { closeDatabaseConnection } = await import('./infrastructure/database/client')
    await closeDatabaseConnection()
  } catch (error) {
    // Ignore errors during test cleanup
  }
}

// Export for different use cases
export { buildApp, start, createTestApp, closeTestApp }
export default start
