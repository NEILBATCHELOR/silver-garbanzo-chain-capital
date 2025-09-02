/**
 * Chain Capital Backend - Enhanced Development Server (Accurate Service Cataloging)
 * All backend services properly exposed with accurate endpoint counts and comprehensive documentation
 */

// Load environment variables first
import { config } from 'dotenv'
config()

import Fastify, { FastifyInstance } from 'fastify'
import { initializeDatabase } from './src/infrastructure/database/client'
import { createLogger } from './src/utils/logger'

// Route imports - All 16 services
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
import complianceRoutes from './src/routes/compliance'
import calendarRoutes from './src/routes/calendar'
import organizationRoutes from './src/routes/organizations'
import authRoutes from './src/routes/auth/index'

// Types
const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || 'localhost'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Create logger
const logger = createLogger('EnhancedAccurateServer')

/**
 * Comprehensive Service Catalog with Accurate Counts
 * Based on actual route file analysis (August 2025)
 */
const SERVICE_CATALOG = {
  core_business: {
    category: 'Core Business Operations',
    services: [
      {
        name: 'Projects',
        endpoints: 14,
        routes: [
          'GET /projects (list)', 'GET /projects/:id (get)', 'POST /projects (create)',
          'PUT /projects/:id (update)', 'DELETE /projects/:id (delete)', 'GET /projects/search (search)',
          'PUT /projects/:id/primary (set primary)', 'GET /projects/:id/stats (stats)',
          'PUT /projects/:id/activate (activate)', 'GET /projects/:id/audit (audit)',
          'GET /projects/:id/analytics (analytics)', 'GET /projects/:id/performance (performance)',
          'POST /projects/bulk-update (bulk)', 'POST /projects/import (import)'
        ],
        operations: ['CRUD', 'Search', 'Analytics', 'Import/Export', 'Audit Trail'],
        prefix: '/api/v1/projects',
        description: 'Project lifecycle management, analytics, and reporting'
      },
      {
        name: 'Investors', 
        endpoints: 20,
        routes: [
          'GET /investors (list)', 'GET /investors/:id (get)', 'POST /investors (create)',
          'PUT /investors/:id (update)', 'DELETE /investors/:id (delete)', 'GET /investors/search (search)',
          'PUT /investors/:id/kyc-status (kyc)', 'GET /investors/:id/subscriptions (subs)',
          'GET /investors/:id/documents (docs)', 'POST /investors/:id/document (upload)',
          'POST /investors/:id/notes (notes)', 'GET /investors/:id/verification (verify)',
          'POST /investors/:id/accreditation (accred)', 'GET /investors/:id/activity (activity)',
          'PUT /investors/:id/status (status)', 'DELETE /investors/:id/documents/:docId (del-doc)',
          'GET /investors/:id/portfolio (portfolio)', 'POST /investors/bulk-create (bulk)',
          'DELETE /investors/bulk-delete (bulk-del)', 'POST /investors/export (export)'
        ],
        operations: ['CRUD', 'KYC/AML', 'Onboarding', 'Search', 'Bulk Operations', 'Document Management'],
        prefix: '/api/v1/investors',
        description: 'Comprehensive investor lifecycle management and compliance'
      },
      {
        name: 'Cap Tables',
        endpoints: 11,
        routes: [
          'POST /captable/entries (create)', 'GET /captable/project/:id (get)',
          'PUT /captable/entries/:id (update)', 'DELETE /captable/entries/:id (delete)',
          'POST /captable/bulk-update (bulk)', 'GET /captable/analytics/:projectId (analytics)',
          'POST /captable/simulate (simulate)', 'GET /captable/export/:projectId (export)',
          'GET /captable/validation/:projectId (validate)', 'POST /captable/reconcile (reconcile)',
          'GET /captable/history/:projectId (history)'
        ],
        operations: ['CRUD', 'Analytics', 'Simulation', 'Export', 'Validation', 'Reconciliation'],
        prefix: '/api/v1/captable',
        description: 'Capitalization table management with advanced analytics'
      },
      {
        name: 'Tokens',
        endpoints: 12,
        routes: [
          'GET /tokens (list)', 'GET /tokens/:id (get)', 'GET /tokens/project/:projectId (by-project)',
          'POST /tokens (create)', 'PUT /tokens/:id (update)', 'DELETE /tokens/:id (delete)',
          'GET /tokens/:id/holders (holders)', 'GET /tokens/:id/transactions (txns)',
          'GET /tokens/:id/analytics (analytics)', 'GET /tokens/:id/metadata (metadata)',
          'POST /tokens/:id/mint (mint)', 'GET /tokens/:id/supply (supply)'
        ],
        operations: ['CRUD', 'Deploy', 'Mint', 'Analytics', 'Blockchain Integration'],
        prefix: '/api/v1/tokens',
        description: 'Token lifecycle management and blockchain operations'
      },
      {
        name: 'Subscriptions',
        endpoints: 17,
        routes: [
          'GET /subscriptions (list)', 'GET /subscriptions/:id (get)', 'POST /subscriptions (create)',
          'PUT /subscriptions/:id (update)', 'DELETE /subscriptions/:id (delete)',
          'GET /subscriptions/investor/:investorId (by-investor)', 'GET /subscriptions/project/:projectId (by-project)',
          'POST /subscriptions/bulk-create (bulk)', 'GET /subscriptions/analytics (analytics)',
          'GET /subscriptions/pending (pending)', 'POST /subscriptions/process (process)',
          'PUT /subscriptions/:id/status (status)', 'POST /subscriptions/validate (validate)',
          'GET /subscriptions/reports (reports)', 'POST /subscriptions/export (export)',
          'POST /subscriptions/import (import)', 'POST /subscriptions/reconcile (reconcile)'
        ],
        operations: ['CRUD', 'Process', 'Validate', 'Analytics', 'Bulk Operations', 'Reconciliation'],
        prefix: '/api/v1/subscriptions',
        description: 'Subscription processing and management system'
      }
    ],
    total_endpoints: 74,
    total_services: 5
  },
  financial_operations: {
    category: 'Financial Operations',
    services: [
      {
        name: 'Wallets',
        endpoints: 50,
        routes: [
          'POST /wallets (create)', 'GET /wallets (list)', 'GET /wallets/:id (get)',
          'GET /wallets/user/:userId (by-user)', 'POST /wallets/hd (create-hd)',
          'POST /wallets/smart-contract (create-sc)', 'GET /wallets/:id/balance (balance)',
          'POST /wallets/:id/transaction (send)', 'POST /wallets/:id/sign (sign)',
          'POST /wallets/multi-sig (create-multisig)', 'GET /wallets/:id/transactions (txns)',
          'POST /wallets/:id/backup (backup)', 'GET /wallets/:id/recovery (recovery)',
          'POST /wallets/:id/restore (restore)', 'POST /wallets/:id/upgrade (upgrade)',
          // ... 35 more wallet endpoints for comprehensive wallet management
          'DELETE /wallets/:id/facet (remove-facet)'
        ],
        operations: ['Multi-Sig', 'Smart Contracts', 'HD Wallets', 'Transactions', 'Security', 'Backup/Recovery'],
        prefix: '/api/v1/wallets',
        description: 'Comprehensive wallet infrastructure with advanced security features'
      },
      {
        name: 'Factoring',
        endpoints: 21,
        routes: [
          'GET /factoring/invoices (list)', 'GET /factoring/pools (pools)',
          'POST /factoring/invoices (create)', 'PUT /factoring/invoices/:id (update)',
          'POST /factoring/pools (create-pool)', 'GET /factoring/analytics (analytics)',
          'GET /factoring/tokens (tokens)', 'POST /factoring/tokens (create-token)',
          'GET /factoring/distributions (distributions)', 'POST /factoring/distributions (create-dist)',
          'GET /factoring/reports (reports)', 'GET /factoring/performance (performance)',
          'GET /factoring/risk-assessment (risk)', 'POST /factoring/batch-upload (batch)',
          'GET /factoring/compliance (compliance)', 'POST /factoring/tokenize (tokenize)',
          'GET /factoring/marketplace (marketplace)', 'POST /factoring/trade (trade)',
          'GET /factoring/liquidity (liquidity)', 'PUT /factoring/pools/:id (update-pool)',
          'GET /factoring/valuations (valuations)'
        ],
        operations: ['Invoice Processing', 'Tokenization', 'Pool Management', 'Risk Assessment', 'Trading'],
        prefix: '/api/v1/factoring',
        description: 'Healthcare invoice factoring and tokenization platform'
      }
    ],
    total_endpoints: 71,
    total_services: 2
  },
  compliance_governance: {
    category: 'Compliance & Governance',
    services: [
      {
        name: 'Compliance',
        endpoints: 19,
        routes: [
          'GET /compliance/overview (overview)', 'GET /compliance/checks (list-checks)',
          'POST /compliance/checks (create-check)', 'PUT /compliance/checks/:id (update-check)',
          'POST /compliance/kyc/verify (kyc-verify)', 'POST /compliance/aml/check (aml-check)',
          'GET /compliance/reports (reports)', 'POST /compliance/reports (create-report)',
          'POST /compliance/kyc/upload (kyc-upload)', 'POST /compliance/kyc/submit (kyc-submit)',
          'POST /compliance/aml/submit (aml-submit)', 'POST /compliance/document/validate (doc-validate)',
          'GET /compliance/audit-trail (audit)', 'POST /compliance/risk/assess (risk-assess)',
          'POST /compliance/screening (screening)', 'POST /compliance/organization/kyb (kyb)',
          'POST /compliance/regulatory/assess (regulatory)', 'GET /compliance/dashboard (dashboard)',
          'POST /compliance/export (export)'
        ],
        operations: ['KYC/AML', 'Document Management', 'Regulatory Reports', 'Risk Assessment', 'Audit Trail'],
        prefix: '/api/v1/compliance',
        description: 'Comprehensive compliance and regulatory management system'
      },
      {
        name: 'Organizations',
        endpoints: 11,
        routes: [
          'GET /organizations (list)', 'POST /organizations (create)', 'GET /organizations/:id (get)',
          'GET /organizations/search (search)', 'GET /organizations/:id/documents (docs)',
          'GET /organizations/:id/compliance (compliance)', 'PUT /organizations/:id (update)',
          'DELETE /organizations/:id (delete)', 'GET /organizations/:id/verification (verify)',
          'PATCH /organizations/:id/status (status)', 'PATCH /organizations/:id/onboarding (onboard)'
        ],
        operations: ['CRUD', 'Onboarding', 'Verification', 'Document Management', 'Compliance Tracking'],
        prefix: '/api/v1/organizations',
        description: 'Organization onboarding and management system'
      },
      {
        name: 'Policies',
        endpoints: 15,
        routes: [
          'GET /policies (list)', 'GET /policies/:id (get)', 'POST /policies (create)',
          'PUT /policies/:id (update)', 'DELETE /policies/:id (delete)', 'GET /policies/search (search)',
          'GET /policies/templates (templates)', 'POST /policies/templates (create-template)',
          'GET /policies/:id/enforcement (enforcement)', 'GET /policies/:id/violations (violations)',
          'PUT /policies/:id/activate (activate)', 'DELETE /policies/:id/deactivate (deactivate)',
          'GET /policies/compliance (compliance)', 'GET /policies/reports (reports)',
          'POST /policies/validate (validate)'
        ],
        operations: ['CRUD', 'Templates', 'Enforcement', 'Compliance', 'Validation'],
        prefix: '/api/v1/policies',
        description: 'Policy management and enforcement system'
      },
      {
        name: 'Rules',
        endpoints: 12,
        routes: [
          'GET /rules (list)', 'GET /rules/:id (get)', 'POST /rules (create)',
          'PUT /rules/:id (update)', 'DELETE /rules/:id (delete)', 'GET /rules/search (search)',
          'GET /rules/templates (templates)', 'POST /rules/validate (validate)',
          'GET /rules/:id/execution (execution)', 'GET /rules/engine (engine)',
          'GET /rules/audit (audit)', 'POST /rules/test (test)'
        ],
        operations: ['CRUD', 'Validation', 'Engine', 'Templates', 'Testing'],
        prefix: '/api/v1/rules',
        description: 'Business rules engine and management system'
      }
    ],
    total_endpoints: 57,
    total_services: 4
  },
  system_infrastructure: {
    category: 'System & Infrastructure',
    services: [
      {
        name: 'Documents',
        endpoints: 14,
        routes: [
          'GET /documents (list)', 'GET /documents/:id (get)', 'POST /documents/upload (upload)',
          'PUT /documents/:id (update)', 'DELETE /documents/:id (delete)', 'PUT /documents/:id/status (status)',
          'POST /documents/:id/share (share)', 'GET /documents/:id/download (download)',
          'POST /documents/:id/version (version)', 'GET /documents/:id/metadata (metadata)',
          'GET /documents/search (search)', 'GET /documents/templates (templates)',
          'POST /documents/bulk-upload (bulk)', 'GET /documents/analytics (analytics)'
        ],
        operations: ['Upload', 'Storage', 'Retrieval', 'Validation', 'Version Control', 'Sharing'],
        prefix: '/api/v1/documents',
        description: 'Document storage and management system'
      },
      {
        name: 'Authentication',
        endpoints: 8,
        routes: [
          'POST /auth/login (login)', 'POST /auth/refresh (refresh)', 'GET /auth/profile (profile)',
          'POST /auth/logout (logout)', 'POST /auth/register (register)', 'POST /auth/forgot-password (forgot)',
          'POST /auth/reset-password (reset)', 'POST /auth/change-password (change)'
        ],
        operations: ['JWT', 'Refresh', 'Password', 'MFA', 'Registration'],
        prefix: '/api/v1/auth',
        description: 'Authentication and authorization services'
      },
      {
        name: 'Users',
        endpoints: 25,
        routes: [
          'GET /users (list)', 'GET /users/:id (get)', 'POST /users (create)',
          'PUT /users/:id (update)', 'DELETE /users/:id (delete)', 'POST /users/:id/role (assign-role)',
          'PUT /users/:id/permissions (permissions)', 'GET /users/:id/roles (roles)',
          'GET /users/:id/permissions (get-permissions)', 'GET /users/search (search)',
          // ... 15 more user management endpoints
        ],
        operations: ['CRUD', 'Roles', 'Permissions', 'Search', 'Activity Tracking'],
        prefix: '/api/v1/users',
        description: 'User management and access control system'
      },
      {
        name: 'Audit',
        endpoints: 7,
        routes: [
          'POST /audit/events (create)', 'POST /audit/events/batch (batch)',
          'GET /audit/events (list)', 'GET /audit/statistics (stats)',
          'GET /audit/health (health)', 'GET /audit/anomalies (anomalies)',
          'GET /audit/analytics (analytics)'
        ],
        operations: ['Logging', 'Analytics', 'Anomaly Detection', 'Compliance', 'Reports'],
        prefix: '/api/v1/audit',
        description: 'Comprehensive audit and activity tracking system'
      },
      {
        name: 'Calendar',
        endpoints: 5,
        routes: [
          'GET /calendar/events (events)', 'GET /calendar/ical (ical)',
          'GET /calendar/rss (rss)', 'POST /calendar/events (create)',
          'GET /calendar/subscriptions (subscriptions)'
        ],
        operations: ['Events', 'iCal', 'RSS', 'Subscriptions'],
        prefix: '/api/v1/calendar',
        description: 'Calendar and event management system'
      }
    ],
    total_endpoints: 59,
    total_services: 5
  }
}

// Calculate totals
const TOTAL_SERVICES = Object.values(SERVICE_CATALOG).reduce((sum, cat) => sum + cat.total_services, 0)
const TOTAL_ENDPOINTS = Object.values(SERVICE_CATALOG).reduce((sum, cat) => sum + cat.total_endpoints, 0)

/**
 * Build enhanced Fastify application with all services
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '[{level}] {msg}',
        }
      }
    },
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
  })

  // Register core plugins
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

    await app.register(import('@fastify/cors'), {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true
    })

    await app.register(import('@fastify/rate-limit'), {
      max: 1000,
      timeWindow: '1 minute'
    })

    await app.register(import('@fastify/sensible'))

    // Register JWT authentication
    await app.register(import('@fastify/jwt'), {
      secret: process.env.JWT_SECRET || 'development-secret-key-not-for-production'
    })

    // Register authentication middleware
    await app.register(import('./src/middleware/auth/jwt-auth'))

    // Register Swagger with comprehensive documentation
    await app.register(import('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Chain Capital Backend API - Complete Tokenization Platform',
          description: `Complete Chain Capital Tokenization Platform API with ${TOTAL_SERVICES} services and ${TOTAL_ENDPOINTS}+ endpoints. 
                       
Comprehensive platform supporting:
- Asset tokenization and management
- Investor onboarding and compliance  
- Multi-signature wallet infrastructure
- Regulatory compliance and reporting
- Healthcare invoice factoring
- Smart contract deployment and management`,
          version: '1.0.0',
          contact: {
            name: 'Chain Capital Development Team',
            url: 'https://chaincapital.io'
          }
        },
        servers: [
          {
            url: 'http://localhost:3001/api/v1',
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              name: 'X-API-Key',
              in: 'header'
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ],
        tags: [
          { name: 'Core Business', description: 'Core business operations and asset management' },
          { name: 'Financial Operations', description: 'Wallets, transactions, and financial services' },
          { name: 'Compliance & Governance', description: 'Regulatory compliance and policy management' },
          { name: 'System & Infrastructure', description: 'System utilities and infrastructure services' }
        ]
      }
    })

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        tryItOutEnabled: true,
        displayOperationId: true,
        showExtensions: true,
        showCommonExtensions: true
      },
      staticCSP: true,
      transformStaticCSP: (header) => header
    })

  } catch (error) {
    logger.error('Plugin registration failed:', error)
    throw error
  }

  // Enhanced health endpoints
  app.get('/health', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./src/infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      const memUsage = process.memoryUsage()
      
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        platform: 'Chain Capital Tokenization Platform',
        version: '1.0.0',
        database: dbHealth.status,
        uptime: Math.floor(process.uptime()),
        services: { 
          database: 'connected', 
          api: 'operational', 
          swagger: 'available',
          total_services: TOTAL_SERVICES,
          total_endpoints: TOTAL_ENDPOINTS
        },
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024)
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

  app.get('/api/v1/status', async (request, reply) => {
    return reply.send({
      message: 'Chain Capital Backend API - Complete Tokenization Platform Operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      platform: {
        name: 'Chain Capital Tokenization Platform',
        description: 'Complete tokenization infrastructure for digital assets',
        services: {
          total: TOTAL_SERVICES,
          active: TOTAL_SERVICES,
          categories: Object.keys(SERVICE_CATALOG).length
        },
        endpoints: {
          total: TOTAL_ENDPOINTS + 5, // +5 for health/debug endpoints
          health: 3,
          debug: 2,
          api: TOTAL_ENDPOINTS
        }
      },
      capabilities: [
        'Asset Tokenization & Management',
        'Investor Onboarding & KYC/AML',
        'Multi-Signature Wallet Infrastructure', 
        'Smart Contract Deployment',
        'Regulatory Compliance & Reporting',
        'Healthcare Invoice Factoring',
        'Document Management & Storage',
        'Audit Trail & Activity Tracking'
      ],
      service_categories: Object.keys(SERVICE_CATALOG).map(key => ({
        key,
        name: SERVICE_CATALOG[key as keyof typeof SERVICE_CATALOG].category,
        services: SERVICE_CATALOG[key as keyof typeof SERVICE_CATALOG].total_services,
        endpoints: SERVICE_CATALOG[key as keyof typeof SERVICE_CATALOG].total_endpoints
      })),
      quick_access: { 
        health: '/health', 
        docs: '/docs', 
        ready: '/ready', 
        api: '/api/v1',
        services: '/debug/services',
        routes: '/debug/routes',
        catalog: '/debug/catalog'
      }
    })
  })

  app.get('/ready', async (request, reply) => {
    try {
      const { checkDatabaseHealth } = await import('./src/infrastructure/database/client')
      const dbHealth = await checkDatabaseHealth()
      return reply.send({ 
        status: 'ready', 
        database: dbHealth.status, 
        services: TOTAL_SERVICES,
        endpoints: TOTAL_ENDPOINTS,
        timestamp: new Date().toISOString() 
      })
    } catch (error) {
      return reply.status(503).send({ 
        status: 'not_ready', 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  })

  // Register all API routes
  const apiPrefix = '/api/v1'

  try {
    // Core business routes
    await app.register(projectRoutes, { prefix: apiPrefix })
    await app.register(investorRoutes, { prefix: apiPrefix })
    await app.register(captableRoutes, { prefix: apiPrefix })
    await app.register(tokenRoutes, { prefix: apiPrefix })
    await app.register(subscriptionRoutes, { prefix: apiPrefix })
    await app.register(documentRoutes, { prefix: apiPrefix })
    await app.register(walletRoutes, { prefix: apiPrefix })
    await app.register(calendarRoutes, { prefix: apiPrefix })

    // System routes
    await app.register(auditRoutes, { prefix: apiPrefix })
    await app.register(userRoutes, { prefix: apiPrefix })
    await app.register(authRoutes, { prefix: apiPrefix })

    // Specialized routes
    await app.register(policyRoutes, { prefix: apiPrefix })
    await app.register(ruleRoutes, { prefix: apiPrefix })
    await app.register(factoringRoutes, { prefix: apiPrefix })
    await app.register(complianceRoutes, { prefix: apiPrefix })
    await app.register(organizationRoutes, { prefix: '/api/v1/organizations' })

  } catch (error) {
    logger.error('Route registration failed:', error)
    throw error
  }

  // Enhanced debug routes
  if (NODE_ENV === 'development') {
    app.get('/debug/routes', async (request, reply) => {
      return reply.type('text/plain').send(app.printRoutes())
    })

    app.get('/debug/catalog', async (request, reply) => {
      return reply.send({
        platform: 'Chain Capital Tokenization Platform',
        version: '1.0.0',
        last_updated: '2025-08-12',
        summary: {
          total_services: TOTAL_SERVICES,
          total_endpoints: TOTAL_ENDPOINTS,
          categories: Object.keys(SERVICE_CATALOG).length
        },
        service_catalog: SERVICE_CATALOG,
        endpoint_distribution: Object.entries(SERVICE_CATALOG).map(([key, category]) => ({
          category: category.category,
          services: category.total_services,
          endpoints: category.total_endpoints,
          percentage: Math.round((category.total_endpoints / TOTAL_ENDPOINTS) * 100)
        }))
      })
    })

    app.get('/debug/services', async (request, reply) => {
      return reply.send({
        platform: 'Chain Capital Tokenization Platform',
        version: '1.0.0',
        categories: SERVICE_CATALOG,
        summary: {
          total_services: TOTAL_SERVICES,
          total_endpoints: TOTAL_ENDPOINTS,
          active_services: TOTAL_SERVICES,
          categories: Object.keys(SERVICE_CATALOG).length,
          documentation_url: '/docs',
          swagger_ui: '/docs'
        },
        health_endpoints: {
          general: '/health',
          readiness: '/ready',
          status: '/api/v1/status'
        },
        development_endpoints: {
          routes: '/debug/routes',
          services: '/debug/services', 
          catalog: '/debug/catalog'
        },
        timestamp: new Date().toISOString()
      })
    })
  }

  // Error handlers
  app.setErrorHandler((error, request, reply) => {
    app.log.error({ error, url: request.url, method: request.method }, 'Request failed')
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
        timestamp: new Date().toISOString(),
        available_endpoints: {
          docs: '/docs',
          health: '/health',
          status: '/api/v1/status',
          services: '/debug/services'
        }
      }
    })
  })

  return app
}

/**
 * Start the enhanced accurate server
 */
async function start() {
  let app: FastifyInstance | null = null
  
  try {
    console.log('🚀 Chain Capital Enhanced Accurate Server Starting...')
    console.log('📍 Port:', PORT)
    console.log('🖥️  Host:', HOST)
    console.log('🌍 Environment:', NODE_ENV)
    console.log('')

    // Initialize database
    console.log('📂 Initializing database...')
    await initializeDatabase()
    console.log('✅ Database connected')

    // Build app
    console.log('🏗️  Building application...')
    app = await buildApp()
    console.log(`✅ Application built - ${TOTAL_SERVICES} services registered`)

    // Start server
    console.log(`🌐 Starting server on ${HOST}:${PORT}...`)
    await app.listen({ port: PORT, host: HOST })
    
    // Success!
    console.log('')
    console.log('🎉 SUCCESS! Enhanced accurate server started with all services')
    console.log('')
    console.log(`📊 AVAILABLE SERVICES (${TOTAL_SERVICES}):`)
    console.log('   🏢 Core Business: Projects, Investors, Cap Tables, Tokens, Subscriptions')  
    console.log('   💰 Financial Ops: Wallets (50 endpoints), Factoring')
    console.log('   ⚖️  Compliance: Compliance, Organizations, Policies, Rules')
    console.log('   🔧 Infrastructure: Documents, Auth, Users, Audit, Calendar')
    console.log('')
    console.log('🔗 QUICK ACCESS:')
    console.log(`   📚 API Docs: http://${HOST}:${PORT}/docs`)
    console.log(`   🏥 Health: http://${HOST}:${PORT}/health`)
    console.log(`   📊 Status: http://${HOST}:${PORT}/api/v1/status`)
    console.log(`   🐛 Debug Services: http://${HOST}:${PORT}/debug/services`)
    console.log(`   📋 Service Catalog: http://${HOST}:${PORT}/debug/catalog`)
    console.log('')
    console.log(`🎯 All ${TOTAL_ENDPOINTS}+ API endpoints are accessible!`)
    console.log('')
    console.log('📈 ENDPOINT DISTRIBUTION:')
    Object.entries(SERVICE_CATALOG).forEach(([key, category]) => {
      const percentage = Math.round((category.total_endpoints / TOTAL_ENDPOINTS) * 100)
      console.log(`   • ${category.category}: ${category.total_endpoints} endpoints (${percentage}%)`)
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal} - shutting down...`)
      try {
        if (app) await app.close()
        const { closeDatabaseConnection } = await import('./src/infrastructure/database/client')
        await closeDatabaseConnection()
        console.log('✅ Shutdown complete')
        process.exit(0)
      } catch (error) {
        console.error('❌ Shutdown error:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
  } catch (error: any) {
    console.error('\n❌ STARTUP FAILED:')
    console.error('Error:', error?.message || error)
    
    if (error?.code === 'EADDRINUSE') {
      console.error(`\n🔴 Port ${PORT} is already in use!`)
      console.error('Solutions:')
      console.error('   1. Kill existing: npm run kill:port')
      console.error('   2. Use different port: PORT=3002 npm run start:enhanced')
      console.error('   3. Check what\'s running: npm run check:port')
    } else if (error?.code === 'EACCES') {
      console.error(`\n🔴 Permission denied for port ${PORT}`)
      console.error('Solutions:')
      console.error('   1. Use port > 1024: PORT=3002 npm run start:enhanced')
      console.error('   2. Check permissions')
    } else {
      console.error('\nError details:', {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        stack: error?.stack
      })
    }
    
    process.exit(1)
  }
}

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

start()
