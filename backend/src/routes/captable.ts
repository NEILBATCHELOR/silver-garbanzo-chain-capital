// Captable Routes - API endpoints with full OpenAPI/Swagger docs
// Provides comprehensive captable management API endpoints

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { 
  getCapTableServiceManager,
  CapTableCreateRequest,
  CapTableUpdateRequest,
  InvestorCreateRequest,
  InvestorUpdateRequest,
  SubscriptionCreateRequest,
  SubscriptionUpdateRequest,
  TokenAllocationCreateRequest,
  TokenAllocationUpdateRequest,
  DistributionCreateRequest,
  DistributionUpdateRequest,
  CapTableQueryOptions,
  InvestorQueryOptions,
  SubscriptionQueryOptions,
  TokenAllocationQueryOptions,
  DistributionQueryOptions,
  CapTableExportOptions,
  BulkSubscriptionCreateRequest,
  BulkSubscriptionUpdateRequest
} from '@/services/captable/index'
import { logger } from '@/utils/logger'

// User interface for JWT payload
interface UserPayload {
  id: string
  email: string
  name?: string
  role?: string
}

// Helper function to safely get user ID from request
function getUserId(request: FastifyRequest): string | undefined {
  const user = request.user
  if (user && typeof user === 'object' && 'id' in user) {
    return (user as UserPayload).id
  }
  return undefined
}

// Request type definitions for FastifyRequest
interface CapTableParams {
  id: string
}

interface ProjectParams {
  projectId: string
}

interface CapTableCreateBody {
  Body: CapTableCreateRequest
}

interface CapTableUpdateBody {
  Body: CapTableUpdateRequest
}

interface InvestorCreateBody {
  Body: InvestorCreateRequest
}

interface InvestorUpdateBody {
  Body: InvestorUpdateRequest
}

interface SubscriptionCreateBody {
  Body: SubscriptionCreateRequest
}

interface SubscriptionUpdateBody {
  Body: SubscriptionUpdateRequest
}

interface TokenAllocationCreateBody {
  Body: TokenAllocationCreateRequest
}

interface TokenAllocationUpdateBody {
  Body: TokenAllocationUpdateRequest
}

interface DistributionCreateBody {
  Body: DistributionCreateRequest
}

interface DistributionUpdateBody {
  Body: DistributionUpdateRequest
}

export default async function captableRoutes(fastify: FastifyInstance) {
  const capTableServiceManager = getCapTableServiceManager()
  const capTableService = capTableServiceManager.getCapTableService()
  const validationService = capTableServiceManager.getValidationService()
  const analyticsService = capTableServiceManager.getAnalyticsService()

  // ============================================================================
  // CAP TABLE ROUTES
  // ============================================================================

  // Create cap table
  fastify.post<CapTableCreateBody>('/captable', {
    schema: {
      tags: ['Captable'],
      summary: 'Create a new cap table',
      description: 'Creates a new cap table for a project with comprehensive validation',
      body: {
        type: 'object',
        required: ['projectId', 'name'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID to create cap table for',
            format: 'uuid'
          },
          name: {
            type: 'string',
            description: 'Name of the cap table',
            maxLength: 255
          },
          description: {
            type: 'string',
            description: 'Optional description of the cap table',
            maxLength: 1000
          }
        }
      },
      response: {
        201: {
          description: 'Cap table created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        409: {
          description: 'Cap table already exists for project',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<CapTableCreateBody>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request)
        const result = await capTableServiceManager.createCapTableWithValidation(request.body as CapTableCreateRequest, userId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.code(201).send(result)
      } catch (error) {
        logger.error('Error in POST /captable', { error, body: request.body })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // Get cap table by project
  fastify.get<{ Params: ProjectParams; Querystring: { includeStats?: boolean; includeRelated?: boolean } }>('/captable/project/:projectId', {
    schema: {
      tags: ['Captable'],
      summary: 'Get cap table by project ID',
      description: 'Retrieves the cap table for a specific project with optional statistics and related data',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID to get cap table for',
            format: 'uuid'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeStats: {
            type: 'boolean',
            description: 'Include computed statistics',
            default: true
          },
          includeRelated: {
            type: 'boolean',
            description: 'Include related data',
            default: false
          }
        }
      },
      response: {
        200: {
          description: 'Cap table retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        },
        404: {
          description: 'Cap table not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { projectId } = request.params
        const { includeStats = true, includeRelated = false } = request.query
        
        const result = await capTableService.getCapTableByProject(projectId, {
          includeStats,
          includeRelated
        })
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in GET /captable/project/:projectId', { error, params: request.params })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // Update cap table
  fastify.put<{ Params: CapTableParams } & CapTableUpdateBody>('/captable/:id', {
    schema: {
      tags: ['Captable'],
      summary: 'Update cap table',
      description: 'Updates an existing cap table with validation',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Cap table ID',
            format: 'uuid'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the cap table',
            maxLength: 255
          },
          description: {
            type: 'string',
            description: 'Description of the cap table',
            maxLength: 1000
          }
        }
      },
      response: {
        200: {
          description: 'Cap table updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'Cap table not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Params: CapTableParams } & CapTableUpdateBody>, reply: FastifyReply) => {
      try {
        const { id } = request.params as CapTableParams
        const userId = getUserId(request)
        
        // Validate update data
        const validationResult = await validationService.validateCapTableUpdate(id, request.body as CapTableUpdateRequest)
        if (!validationResult.success || !validationResult.data?.isValid) {
          return reply.code(400).send(validationResult)
        }

        const result = await capTableService.updateCapTable(id, request.body as CapTableUpdateRequest, userId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in PUT /captable/:id', { error, params: request.params, body: request.body })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // Delete cap table
  fastify.delete<{ Params: CapTableParams }>('/captable/:id', {
    schema: {
      tags: ['Captable'],
      summary: 'Delete cap table',
      description: 'Deletes a cap table and related data (cascade deletion)',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Cap table ID',
            format: 'uuid'
          }
        }
      },
      response: {
        200: {
          description: 'Cap table deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'Cap table not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{ Params: CapTableParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params as CapTableParams
        const userId = getUserId(request)
        
        const result = await capTableService.deleteCapTable(id, userId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in DELETE /captable/:id', { error, params: request.params })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // ============================================================================
  // INVESTOR ROUTES
  // ============================================================================

  // Create investor
  fastify.post<InvestorCreateBody>('/captable/investors', {
    schema: {
      tags: ['Captable - Investors'],
      summary: 'Create a new investor',
      description: 'Creates a new investor with comprehensive validation and KYC tracking',
      body: {
        type: 'object',
        required: ['investorId', 'name', 'email'],
        properties: {
          investorId: {
            type: 'string',
            description: 'Unique investor identifier',
            minLength: 3
          },
          name: {
            type: 'string',
            description: 'Full name of the investor'
          },
          email: {
            type: 'string',
            description: 'Email address',
            format: 'email'
          },
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          walletAddress: {
            type: 'string',
            description: 'Blockchain wallet address'
          },
          kycStatus: {
            type: 'string',
            enum: ['approved', 'pending', 'failed', 'not_started', 'expired'],
            description: 'KYC verification status'
          },
          accreditationStatus: {
            type: 'string',
            description: 'Investor accreditation status'
          },
          investorType: {
            type: 'string',
            description: 'Type of investor (individual, institutional, etc.)'
          },
          riskTolerance: {
            type: 'string',
            description: 'Risk tolerance level'
          },
          annualIncome: {
            type: 'number',
            description: 'Annual income',
            minimum: 0
          },
          netWorth: {
            type: 'number',
            description: 'Net worth',
            minimum: 0
          }
        }
      },
      response: {
        201: {
          description: 'Investor created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        409: {
          description: 'Investor already exists',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<InvestorCreateBody>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request)
        const result = await capTableServiceManager.createInvestorWithValidation(request.body as InvestorCreateRequest, userId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.code(201).send(result)
      } catch (error) {
        logger.error('Error in POST /captable/investors', { 
          error, 
          body: request.body && typeof request.body === 'object' 
            ? { ...(request.body as Record<string, any>), email: '[REDACTED]' }
            : '[INVALID_BODY]'
        })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // Get all investors with filtering and pagination
  fastify.get<{ Querystring: InvestorQueryOptions }>('/captable/investors', {
    schema: {
      tags: ['Captable - Investors'],
      summary: 'Get all investors',
      description: 'Retrieves all investors with advanced filtering, pagination, and optional related data',
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Page number',
            default: 1,
            minimum: 1
          },
          limit: {
            type: 'integer',
            description: 'Items per page',
            default: 20,
            minimum: 1,
            maximum: 100
          },
          search: {
            type: 'string',
            description: 'Search in name, email, investor ID'
          },
          kycStatus: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['approved', 'pending', 'failed', 'not_started', 'expired']
            },
            description: 'Filter by KYC status'
          },
          investorType: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by investor type'
          },
          isActive: {
            type: 'boolean',
            description: 'Filter by active status'
          },
          includeSubscriptions: {
            type: 'boolean',
            description: 'Include subscription data',
            default: false
          },
          includeAllocations: {
            type: 'boolean',
            description: 'Include allocation data',
            default: false
          },
          sortBy: {
            type: 'string',
            description: 'Sort field',
            default: 'createdAt'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort direction',
            default: 'desc'
          }
        }
      },
      response: {
        200: {
          description: 'Investors retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                data: { type: 'array' },
                pagination: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await capTableService.getInvestors(request.query)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in GET /captable/investors', { error, query: request.query })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // ============================================================================
  // SUBSCRIPTION ROUTES
  // ============================================================================

  // Create subscription
  fastify.post<SubscriptionCreateBody>('/captable/subscriptions', {
    schema: {
      tags: ['Captable - Subscriptions'],
      summary: 'Create a new subscription',
      description: 'Creates a new investment subscription with validation and compliance checks',
      body: {
        type: 'object',
        required: ['projectId', 'investorId', 'subscriptionAmount'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID',
            format: 'uuid'
          },
          investorId: {
            type: 'string',
            description: 'Investor ID',
            format: 'uuid'
          },
          subscriptionAmount: {
            type: 'number',
            description: 'Subscription amount',
            minimum: 0.01
          },
          paymentMethod: {
            type: 'string',
            description: 'Payment method'
          },
          paymentStatus: {
            type: 'string',
            description: 'Payment status',
            default: 'pending'
          },
          subscriptionDate: {
            type: 'string',
            format: 'date-time',
            description: 'Subscription date'
          },
          notes: {
            type: 'string',
            description: 'Additional notes'
          }
        }
      },
      response: {
        201: {
          description: 'Subscription created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<SubscriptionCreateBody>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request)
        const result = await capTableServiceManager.createSubscriptionWithValidation(request.body as SubscriptionCreateRequest, userId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.code(201).send(result)
      } catch (error) {
        logger.error('Error in POST /captable/subscriptions', { error, body: request.body })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // ============================================================================
  // ANALYTICS ROUTES
  // ============================================================================

  // Get comprehensive cap table analytics
  fastify.get<{ Params: ProjectParams }>('/captable/analytics/:projectId', {
    schema: {
      tags: ['Captable - Analytics'],
      summary: 'Get comprehensive cap table analytics',
      description: 'Retrieves detailed analytics including statistics, trends, geography, and demographics',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID',
            format: 'uuid'
          }
        }
      },
      response: {
        200: {
          description: 'Analytics retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                summary: { type: 'object' },
                investors: { type: 'object' },
                subscriptions: { type: 'object' },
                allocations: { type: 'object' },
                distributions: { type: 'object' },
                timeline: { type: 'array' },
                geography: { type: 'array' },
                demographics: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { projectId } = request.params
        const result = await analyticsService.getCapTableAnalytics(projectId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in GET /captable/analytics/:projectId', { error, params: request.params })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // Get cap table statistics
  fastify.get<{ Params: ProjectParams }>('/captable/statistics/:projectId', {
    schema: {
      tags: ['Captable - Analytics'],
      summary: 'Get cap table statistics',
      description: 'Retrieves detailed statistics for a cap table including totals, averages, and completion rates',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID',
            format: 'uuid'
          }
        }
      },
      response: {
        200: {
          description: 'Statistics retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalInvestors: { type: 'integer' },
                totalRaised: { type: 'number' },
                totalTokensAllocated: { type: 'number' },
                totalTokensDistributed: { type: 'number' },
                averageInvestment: { type: 'number' },
                medianInvestment: { type: 'number' },
                completionPercentage: { type: 'number' },
                kycCompletionRate: { type: 'number' },
                distributionCompletionRate: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { projectId } = request.params
        const result = await analyticsService.getCapTableStatistics(projectId)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in GET /captable/statistics/:projectId', { error, params: request.params })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // ============================================================================
  // EXPORT ROUTES
  // ============================================================================

  // Export cap table data
  fastify.post<{ Params: ProjectParams; Body: CapTableExportOptions }>('/captable/export/:projectId', {
    schema: {
      tags: ['Captable - Export'],
      summary: 'Export cap table data',
      description: 'Exports cap table data in various formats (CSV, Excel, PDF, JSON)',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID',
            format: 'uuid'
          }
        }
      },
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: {
            type: 'string',
            enum: ['csv', 'excel', 'pdf', 'json'],
            description: 'Export format'
          },
          includeInvestors: {
            type: 'boolean',
            description: 'Include investor data',
            default: true
          },
          includeSubscriptions: {
            type: 'boolean',
            description: 'Include subscription data',
            default: true
          },
          includeAllocations: {
            type: 'boolean',
            description: 'Include allocation data',
            default: true
          },
          includeDistributions: {
            type: 'boolean',
            description: 'Include distribution data',
            default: true
          },
          includeStatistics: {
            type: 'boolean',
            description: 'Include statistics',
            default: true
          },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific fields to include'
          },
          dateRange: {
            type: 'object',
            properties: {
              start: {
                type: 'string',
                format: 'date',
                description: 'Start date'
              },
              end: {
                type: 'string',
                format: 'date',
                description: 'End date'
              }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Data exported successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { projectId } = request.params
        const result = await analyticsService.exportCapTableData(projectId, request.body)
        
        if (!result.success) {
          return reply.code(result.statusCode || 400).send(result)
        }

        return reply.send(result)
      } catch (error) {
        logger.error('Error in POST /captable/export/:projectId', { error, params: request.params, body: request.body })
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  })

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  // Health check endpoint
  fastify.get('/captable/health', {
    schema: {
      tags: ['Captable - Health'],
      summary: 'Health check',
      description: 'Checks the health of the captable service',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'captable'
      })
    }
  })
}
