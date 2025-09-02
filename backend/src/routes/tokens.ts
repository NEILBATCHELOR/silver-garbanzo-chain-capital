import { FastifyInstance } from 'fastify'
import {
  TokenService,
  TokenValidationService,
  TokenAnalyticsService,
  TokenStandard,
  TokenStatus,
  TokenConfigMode,
  TokenCreationData,
  TokenUpdateData,
  TokenDeploymentData,
  TokenOperationData
} from '../services/tokens/index'

/**
 * Token API Routes
 * 
 * Comprehensive REST API endpoints for token management supporting
 * all 6 ERC standards with full CRUD operations, validation, analytics,
 * and deployment management
 */
export async function tokenRoutes(fastify: FastifyInstance) {
  // Service instances
  const tokenService = new TokenService()
  const tokenValidationService = new TokenValidationService()
  const tokenAnalyticsService = new TokenAnalyticsService()
  
  const { authenticate } = fastify

  // JSON Schemas for validation and documentation
  const TokenSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      project_id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      symbol: { type: 'string' },
      decimals: { type: 'integer', minimum: 0, maximum: 18 },
      standard: { 
        type: 'string', 
        enum: ['ERC_20', 'ERC_721', 'ERC_1155', 'ERC_1400', 'ERC_3525', 'ERC_4626'] 
      },
      blocks: { type: 'object' },
      metadata: { type: 'object' },
      status: { 
        type: 'string', 
        enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEPLOYED', 'READY_TO_MINT'] 
      },
      total_supply: { type: 'string' },
      config_mode: { 
        type: 'string', 
        enum: ['min', 'basic', 'advanced', 'max'] 
      },
      description: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  }

  const TokenCreationSchema = {
    type: 'object',
    required: ['name', 'symbol', 'standard', 'projectId'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      symbol: { type: 'string', minLength: 2, maxLength: 10 },
      decimals: { type: 'integer', minimum: 0, maximum: 18, default: 18 },
      standard: { 
        type: 'string', 
        enum: ['ERC_20', 'ERC_721', 'ERC_1155', 'ERC_1400', 'ERC_3525', 'ERC_4626'] 
      },
      blocks: { type: 'object', default: {} },
      metadata: { type: 'object', default: {} },
      projectId: { type: 'string', format: 'uuid' },
      totalSupply: { type: 'string' },
      configMode: { 
        type: 'string', 
        enum: ['min', 'basic', 'advanced', 'max'],
        default: 'min'
      },
      description: { type: 'string' },
      standardProperties: { type: 'object', default: {} }
    }
  }

  const TokenUpdateSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      symbol: { type: 'string', minLength: 2, maxLength: 10 },
      description: { type: 'string' },
      blocks: { type: 'object' },
      metadata: { type: 'object' },
      status: { 
        type: 'string', 
        enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEPLOYED', 'READY_TO_MINT'] 
      },
      config_mode: { 
        type: 'string', 
        enum: ['min', 'basic', 'advanced', 'max'] 
      },
      total_supply: { type: 'string' }
    }
  }

  const ErrorSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean', default: false },
      error: { type: 'string' },
      errors: { type: 'array', items: { type: 'string' } },
      code: { type: 'string' }
    }
  }

  const PaginatedResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean', default: true },
      data: { type: 'array', items: TokenSchema },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' },
          hasMore: { type: 'boolean' },
          nextPage: { type: 'integer' },
          prevPage: { type: 'integer' }
        }
      }
    }
  }

  //------------------------------------------------------------------------------
  // Core Token CRUD Operations
  //------------------------------------------------------------------------------

  // Get all tokens with filtering and pagination
  fastify.get('/tokens', {
    schema: {
      tags: ['Tokens'],
      summary: 'Get all tokens',
      description: 'Retrieve all tokens with comprehensive filtering, searching, and pagination',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', description: 'Search in name, symbol, or description' },
          standard: { 
            type: 'string', 
            enum: ['ERC_20', 'ERC_721', 'ERC_1155', 'ERC_1400', 'ERC_3525', 'ERC_4626'] 
          },
          status: { 
            type: 'string', 
            enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEPLOYED', 'READY_TO_MINT'] 
          },
          config_mode: { 
            type: 'string', 
            enum: ['min', 'basic', 'advanced', 'max'] 
          },
          project_id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: PaginatedResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const options = request.query as any
      const result = await tokenService.getTokens(options)

      if (!result.success) {
        return reply.status(400).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Get tokens by project ID
  fastify.get('/tokens/project/:projectId', {
    schema: {
      tags: ['Tokens'],
      summary: 'Get tokens by project',
      description: 'Retrieve all tokens for a specific project',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          standard: { 
            type: 'string', 
            enum: ['ERC_20', 'ERC_721', 'ERC_1155', 'ERC_1400', 'ERC_3525', 'ERC_4626'] 
          },
          status: { 
            type: 'string', 
            enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEPLOYED', 'READY_TO_MINT'] 
          }
        }
      },
      response: {
        200: PaginatedResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const options = request.query as any
      
      const result = await tokenService.getTokensByProject(projectId, options)

      if (!result.success) {
        const statusCode = result.error === 'Project not found' ? 404 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Get token by ID
  fastify.get('/tokens/:id', {
    schema: {
      tags: ['Tokens'],
      summary: 'Get token by ID',
      description: 'Retrieve comprehensive token details including standard-specific properties',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: TokenSchema
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await tokenService.getTokenById(id)

      if (!result.success) {
        const statusCode = result.error === 'Token not found' ? 404 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Create new token
  fastify.post('/tokens', {
    schema: {
      tags: ['Tokens'],
      summary: 'Create new token',
      description: 'Create a new token with standard-specific properties and validation',
      body: TokenCreationSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: TokenSchema
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const data = request.body as TokenCreationData

      // Validate token creation data
      const validation = await tokenValidationService.validateTokenCreation(data)
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: validation.error,
          errors: validation.errors
        })
      }

      const result = await tokenService.createToken(data)

      if (!result.success) {
        const statusCode = result.error?.includes('already exists') ? 409 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Update token
  fastify.put('/tokens/:id', {
    schema: {
      tags: ['Tokens'],
      summary: 'Update token',
      description: 'Update token details with validation and version history',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: TokenUpdateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: TokenSchema
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = request.body as TokenUpdateData

      // Validate token update data
      const validation = await tokenValidationService.validateTokenUpdate(id, data)
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: validation.error,
          errors: validation.errors
        })
      }

      const result = await tokenService.updateToken(id, data)

      if (!result.success) {
        const statusCode = result.error === 'Token not found' ? 404 : 
                          result.error?.includes('Cannot') ? 409 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Delete token (soft delete)
  fastify.delete('/tokens/:id', {
    schema: {
      tags: ['Tokens'],
      summary: 'Delete token',
      description: 'Soft delete token with validation for deployments and allocations',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: { type: 'boolean', default: true }
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await tokenService.deleteToken(id)

      if (!result.success) {
        const statusCode = result.error === 'Token not found' ? 404 :
                          result.error?.includes('Cannot delete') ? 409 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  //------------------------------------------------------------------------------
  // Analytics Endpoints
  //------------------------------------------------------------------------------

  // Get token analytics
  fastify.get('/tokens/:id/analytics', {
    schema: {
      tags: ['Token Analytics'],
      summary: 'Get token analytics',
      description: 'Get comprehensive analytics for a specific token',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: {
              type: 'object',
              properties: {
                totalSupply: { type: 'string' },
                holders: { type: 'integer' },
                transactions: { type: 'integer' },
                deployments: { type: 'integer' },
                lastActivity: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await tokenAnalyticsService.getTokenAnalytics(id)

      if (!result.success) {
        const statusCode = result.error === 'Token not found' ? 404 : 400
        return reply.status(statusCode).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Get platform statistics
  fastify.get('/tokens/statistics', {
    schema: {
      tags: ['Token Analytics'],
      summary: 'Get platform token statistics',
      description: 'Get comprehensive platform-wide token statistics and metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: {
              type: 'object',
              properties: {
                totalTokens: { type: 'integer' },
                tokensByStandard: { type: 'object' },
                tokensByStatus: { type: 'object' },
                tokensByConfigMode: { type: 'object' },
                deploymentStatistics: {
                  type: 'object',
                  properties: {
                    totalDeployments: { type: 'integer' },
                    successfulDeployments: { type: 'integer' },
                    failedDeployments: { type: 'integer' },
                    deploymentsByNetwork: { type: 'object' }
                  }
                }
              }
            }
          }
        },
        401: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const result = await tokenAnalyticsService.getTokenStatistics()

      if (!result.success) {
        return reply.status(400).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Get token trends
  fastify.get('/tokens/trends', {
    schema: {
      tags: ['Token Analytics'],
      summary: 'Get token creation trends',
      description: 'Get token creation trends over time with optional standard filtering',
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          standard: { 
            type: 'string', 
            enum: ['ERC_20', 'ERC_721', 'ERC_1155', 'ERC_1400', 'ERC_3525', 'ERC_4626'] 
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  count: { type: 'integer' },
                  standard: { type: 'string' }
                }
              }
            }
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { days, standard } = request.query as { days?: number; standard?: TokenStandard }
      const result = await tokenAnalyticsService.getTokenTrends(days, standard)

      if (!result.success) {
        return reply.status(400).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Get performance metrics
  fastify.get('/tokens/metrics', {
    schema: {
      tags: ['Token Analytics'],
      summary: 'Get performance metrics',
      description: 'Get comprehensive platform performance metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: {
              type: 'object',
              properties: {
                totalTokens: { type: 'integer' },
                activeTokens: { type: 'integer' },
                deployedTokens: { type: 'integer' },
                successRate: { type: 'number' },
                averageTimeToDeployment: { type: 'number' },
                mostPopularStandard: { type: 'string' },
                growthRate: { type: 'number' }
              }
            }
          }
        },
        401: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const result = await tokenAnalyticsService.getPerformanceMetrics()

      if (!result.success) {
        return reply.status(400).send(result)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Export analytics data
  fastify.post('/tokens/export', {
    schema: {
      tags: ['Token Analytics'],
      summary: 'Export analytics data',
      description: 'Export comprehensive analytics data in various formats',
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'excel'], default: 'json' },
          includeDetailedMetrics: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            data: {
              type: 'object',
              properties: {
                data: { type: 'string' },
                filename: { type: 'string' },
                contentType: { type: 'string' }
              }
            }
          }
        },
        400: ErrorSchema,
        401: ErrorSchema,
        500: ErrorSchema
      }
    },
    preHandler: authenticate
  }, async (request, reply) => {
    try {
      const { format, includeDetailedMetrics } = request.body as { 
        format?: 'csv' | 'json' | 'excel'
        includeDetailedMetrics?: boolean 
      }
      
      const result = await tokenAnalyticsService.exportAnalyticsData(
        format || 'json', 
        includeDetailedMetrics || false
      )

      if (!result.success) {
        return reply.status(400).send(result)
      }

      // Set appropriate headers for file download
      if (result.data) {
        reply.header('Content-Type', result.data.contentType)
        reply.header('Content-Disposition', `attachment; filename="${result.data.filename}"`)
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  //------------------------------------------------------------------------------
  // Health Check
  //------------------------------------------------------------------------------

  // Service health check
  fastify.get('/tokens/health', {
    schema: {
      tags: ['System'],
      summary: 'Token service health check',
      description: 'Check token service health and connectivity',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: true },
            service: { type: 'string', default: 'TokenService' },
            status: { type: 'string', default: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                TokenService: { type: 'string' },
                TokenValidationService: { type: 'string' },
                TokenAnalyticsService: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Test database connectivity - use service for health check
      await tokenService.getTokenStatistics()

      return reply.send({
        success: true,
        service: 'TokenService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        services: {
          TokenService: 'operational',
          TokenValidationService: 'operational',
          TokenAnalyticsService: 'operational'
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        service: 'TokenService',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connectivity issue'
      })
    }
  })
}

export default tokenRoutes
