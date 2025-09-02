import { FastifyDynamicSwaggerOptions } from '@fastify/swagger'
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui'

/**
 * Swagger documentation configuration
 * Provides comprehensive API documentation and testing interface
 */
export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    info: {
      title: 'Chain Capital Backend API',
      description: `
# Chain Capital Backend API

A comprehensive backend service for Chain Capital's investment platform, providing:

- **Authentication & Authorization** - JWT-based secure access control
- **Token Management** - ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626 token operations
- **Project Management** - Investment project lifecycle management  
- **Investor Services** - KYC/AML compliance, onboarding, and portfolio management
- **Compliance & Audit** - Regulatory compliance tracking and audit trails
- **Wallet Integration** - Multi-blockchain wallet operations
- **Document Management** - Secure document storage and verification

## Architecture

Built with:
- **Fastify** - High-performance Node.js web framework
- **Prisma** - Type-safe database ORM with PostgreSQL
- **TypeScript** - Full type safety and developer experience
- **Supabase** - Scalable PostgreSQL database with real-time features

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

## Rate Limiting

- **General endpoints**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **Public endpoints**: 1000 requests per minute per IP

## Error Handling

The API uses standard HTTP status codes and returns errors in this format:
\`\`\`json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": "Additional error details",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`
      `,
      version: process.env.npm_package_version || '1.0.0',
      contact: {
        name: 'Chain Capital Team',
        email: 'dev@chaincapital.com',
        url: 'https://chaincapital.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `${process.env.SWAGGER_SCHEMES || 'http'}://${process.env.SWAGGER_HOST || 'localhost:3001'}`,
        description: 'Development server'
      },
      {
        url: 'https://api.chaincapital.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication endpoint'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service communication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                details: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
              },
              required: ['message', 'statusCode', 'timestamp']
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                hasMore: { type: 'boolean' },
                totalPages: { type: 'number' }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and system status endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Projects', 
        description: 'Investment project management'
      },
      {
        name: 'Tokens',
        description: 'Token creation, deployment, and management'
      },
      {
        name: 'Investors',
        description: 'Investor onboarding, KYC, and compliance'
      },
      {
        name: 'Compliance',
        description: 'Regulatory compliance and audit trails'
      },
      {
        name: 'Wallets',
        description: 'Multi-blockchain wallet operations'
      },
      {
        name: 'Documents',
        description: 'Document management and verification'
      },
      {
        name: 'Analytics',
        description: 'Business intelligence and reporting'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (restricted access)'
      }
    ],
    security: [
      { bearerAuth: [] },
      { apiKey: [] }
    ]
  }
}

/**
 * Swagger UI configuration
 */
export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    defaultModelRendering: 'example',
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestSnippets: {
      generators: {
        curl_bash: {
          title: 'cURL (bash)',
          syntax: 'bash'
        },
        curl_powershell: {
          title: 'cURL (PowerShell)',
          syntax: 'powershell'
        }
      },
      defaultExpanded: true,
      languagesMask: ['curl_bash', 'curl_powershell']
    },
    persistAuthorization: true
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next()
    },
    preHandler: function (request, reply, next) {
      next()
    }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
}
