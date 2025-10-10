/**
 * NAV Routes
 * API endpoints for Net Asset Value operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getNavService } from '../services/nav'
import type {
  CalculationInput,
  CalculationResult,
  NavQueryOptions,
  CreateCalculationRequest,
  AssetType,
  CalculationStatus,
  ApprovalStatus
} from '../services/nav/types'

// ==================== REQUEST/RESPONSE TYPES ====================

interface GetCurrentNavRequest {
  Querystring: {
    assetId?: string
    productType?: string
    projectId?: string
    asOf?: string // ISO date string
  }
}

interface CreateNavRunRequest {
  Body: CreateCalculationRequest
}

interface GetNavRunRequest {
  Params: {
    runId: string
  }
}

interface GetNavRunsRequest {
  Querystring: {
    page?: number
    limit?: number
    assetId?: string
    productType?: string
    projectId?: string
    status?: CalculationStatus
    approvalStatus?: ApprovalStatus
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

interface UpdateNavRunRequest {
  Params: {
    runId: string
  }
  Body: {
    status?: CalculationStatus
    notes?: string
  }
}

interface GetProjectWeightedNavRequest {
  Params: {
    projectId: string
  }
  Querystring: {
    asOf?: string
    currency?: string
  }
}

// ==================== SCHEMA DEFINITIONS ====================

const assetTypeEnum = [
  'equity', 'bonds', 'commodities', 'mmf', 'composite_funds',
  'structured_products', 'quant_strategies', 'private_equity', 'private_debt',
  'real_estate', 'energy', 'infrastructure', 'collectibles', 'asset_backed',
  'invoice_receivables', 'climate_receivables', 'digital_tokenized_funds',
  'stablecoin_fiat_backed', 'stablecoin_crypto_backed', 
  'stablecoin_commodity_backed', 'stablecoin_algorithmic'
]

const calculationStatusEnum = ['queued', 'running', 'completed', 'failed']
const approvalStatusEnum = ['draft', 'validated', 'approved', 'rejected', 'published']

// Current NAV Schema
const getCurrentNavSchema = {
  description: 'Get current NAV for an asset, product type, or project',
  tags: ['NAV'],
  querystring: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        format: 'uuid',
        description: 'Asset identifier'
      },
      productType: {
        type: 'string',
        enum: assetTypeEnum,
        description: 'Product type for NAV calculation'
      },
      projectId: {
        type: 'string',
        format: 'uuid',
        description: 'Project identifier'
      },
      asOf: {
        type: 'string',
        format: 'date-time',
        description: 'NAV as of specific date (defaults to latest)'
      }
    },
    minProperties: 1
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            assetId: { type: 'string', format: 'uuid' },
            productType: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            valuationDate: { type: 'string', format: 'date-time' },
            navValue: { type: 'number', description: 'Net Asset Value' },
            navPerShare: { type: 'number', description: 'NAV per share' },
            totalAssets: { type: 'number', description: 'Total assets value' },
            totalLiabilities: { type: 'number', description: 'Total liabilities' },
            netAssets: { type: 'number', description: 'Net assets (assets - liabilities)' },
            sharesOutstanding: { type: 'number', description: 'Shares outstanding' },
            currency: { type: 'string', description: 'Currency code' },
            calculatedAt: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: calculationStatusEnum }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }
}

// Create NAV Run Schema
const createNavRunSchema = {
  description: 'Create a new NAV calculation run',
  tags: ['NAV'],
  body: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        format: 'uuid',
        description: 'Asset identifier'
      },
      productType: {
        type: 'string',
        enum: assetTypeEnum,
        description: 'Product type for calculation'
      },
      projectId: {
        type: 'string',
        format: 'uuid',
        description: 'Project identifier'
      },
      valuationDate: {
        type: 'string',
        format: 'date-time',
        description: 'Valuation date for NAV calculation'
      },
      targetCurrency: {
        type: 'string',
        pattern: '^[A-Z]{3}$',
        default: 'USD',
        description: 'Target currency for NAV (ISO 4217 code)'
      },
      runManually: {
        type: 'boolean',
        default: false,
        description: 'Whether to run calculation immediately or queue for batch processing'
      }
    },
    required: ['valuationDate'],
    minProperties: 2
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            assetId: { type: 'string', format: 'uuid' },
            productType: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            valuationDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: calculationStatusEnum },
            navValue: { type: 'number' },
            navPerShare: { type: 'number' },
            totalAssets: { type: 'number' },
            totalLiabilities: { type: 'number' },
            netAssets: { type: 'number' },
            currency: { type: 'string' },
            calculatedAt: { type: 'string', format: 'date-time' }
          }
        },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'number' },
            validation: { type: 'array' }
          }
        }
      }
    }
  }
}

// Get NAV Run Schema
const getNavRunSchema = {
  description: 'Get details of a specific NAV calculation run',
  tags: ['NAV'],
  params: {
    type: 'object',
    required: ['runId'],
    properties: {
      runId: {
        type: 'string',
        description: 'NAV calculation run identifier'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            assetId: { type: 'string', format: 'uuid' },
            productType: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            valuationDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: calculationStatusEnum },
            navValue: { type: 'number' },
            navPerShare: { type: 'number' },
            totalAssets: { type: 'number' },
            totalLiabilities: { type: 'number' },
            netAssets: { type: 'number' },
            sharesOutstanding: { type: 'number' },
            currency: { type: 'string' },
            fxRateUsed: { type: 'number' },
            pricingSources: { type: 'object' },
            calculatedAt: { type: 'string', format: 'date-time' },
            errorMessage: { type: 'string' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }
}

// List NAV Runs Schema
const getNavRunsSchema = {
  description: 'Get NAV calculation runs with filtering and pagination',
  tags: ['NAV'],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Page number for pagination'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Number of runs per page (max 100)'
      },
      assetId: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by asset ID'
      },
      productType: {
        type: 'string',
        enum: assetTypeEnum,
        description: 'Filter by product type'
      },
      projectId: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by project ID'
      },
      status: {
        type: 'string',
        enum: calculationStatusEnum,
        description: 'Filter by calculation status'
      },
      approvalStatus: {
        type: 'string',
        enum: approvalStatusEnum,
        description: 'Filter by approval status'
      },
      dateFrom: {
        type: 'string',
        format: 'date-time',
        description: 'Filter runs from this date'
      },
      dateTo: {
        type: 'string',
        format: 'date-time',
        description: 'Filter runs to this date'
      },
      sortBy: {
        type: 'string',
        enum: ['valuationDate', 'calculatedAt', 'navValue', 'status'],
        default: 'calculatedAt',
        description: 'Field to sort by'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              runId: { type: 'string' },
              assetId: { type: 'string', format: 'uuid' },
              productType: { type: 'string' },
              projectId: { type: 'string', format: 'uuid' },
              valuationDate: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: calculationStatusEnum },
              navValue: { type: 'number' },
              navPerShare: { type: 'number' },
              currency: { type: 'string' },
              calculatedAt: { type: 'string', format: 'date-time' }
            }
          }
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
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  }
}

// Update NAV Run Schema
const updateNavRunSchema = {
  description: 'Update NAV calculation run status or metadata',
  tags: ['NAV'],
  params: {
    type: 'object',
    required: ['runId'],
    properties: {
      runId: {
        type: 'string',
        description: 'NAV calculation run identifier'
      }
    }
  },
  body: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: calculationStatusEnum,
        description: 'Update calculation status'
      },
      notes: {
        type: 'string',
        maxLength: 1000,
        description: 'Add notes to the calculation run'
      }
    },
    minProperties: 1
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  }
}

// Project Weighted NAV Schema
const getProjectWeightedNavSchema = {
  description: 'Get weighted NAV for all assets in a project',
  tags: ['NAV', 'Projects'],
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: {
        type: 'string',
        format: 'uuid',
        description: 'Project identifier'
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      asOf: {
        type: 'string',
        format: 'date-time',
        description: 'NAV as of specific date (defaults to latest)'
      },
      currency: {
        type: 'string',
        pattern: '^[A-Z]{3}$',
        default: 'USD',
        description: 'Target currency for aggregated NAV'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            projectName: { type: 'string' },
            weightedNavValue: { type: 'number', description: 'Total weighted NAV across all assets' },
            currency: { type: 'string' },
            asOf: { type: 'string', format: 'date-time' },
            assetBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  assetId: { type: 'string', format: 'uuid' },
                  productType: { type: 'string' },
                  navValue: { type: 'number' },
                  weight: { type: 'number', description: 'Asset weight in project (0-1)' },
                  contributionToTotal: { type: 'number', description: 'Contribution to total project NAV' }
                }
              }
            },
            calculatedAt: { type: 'string', format: 'date-time' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  }
}

// ==================== ROUTE HANDLERS ====================

/**
 * NAV Routes Plugin
 */
export default async function navRoutes(fastify: FastifyInstance) {
  const navService = getNavService()

  /**
   * GET /nav/current - Get current NAV for asset/product/project
   */
  fastify.get<GetCurrentNavRequest>('/nav/current', {
    schema: getCurrentNavSchema
  }, async (request: FastifyRequest<GetCurrentNavRequest>, reply: FastifyReply) => {
    try {
      const { assetId, productType, projectId, asOf } = request.query
      
      // Validate that at least one identifier is provided
      if (!assetId && !productType && !projectId) {
        return reply.status(400).send({
          error: {
            message: 'At least one of assetId, productType, or projectId must be provided',
            statusCode: 400
          }
        })
      }

      // For Phase 2, we'll use the basic NAV service
      // TODO: Enhance with database lookup in future phases
      const calculationInput: CalculationInput = {
        assetId,
        productType,
        projectId,
        valuationDate: asOf ? new Date(asOf) : new Date(),
        targetCurrency: 'USD'
      }

      // TODO: Rebuild NAV calculation service
      // const result = await navService.calculateBasicNav(calculationInput)
      return reply.status(501).send({
        error: {
          message: 'NAV calculation service is being rebuilt',
          statusCode: 501
        }
      })

      /* COMMENTED OUT - Needs rebuild
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: {
            message: result.error,
            statusCode: result.statusCode || 500
          }
        })
      }

      return reply.send({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      })
      */

    } catch (error) {
      fastify.log.error({ error, query: request.query }, 'Failed to get current NAV')
      return reply.status(500).send({
        error: {
          message: 'Failed to get current NAV',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /nav/runs - Create NAV calculation run
   */
  fastify.post<CreateNavRunRequest>('/nav/runs', {
    schema: createNavRunSchema
  }, async (request: FastifyRequest<CreateNavRunRequest>, reply: FastifyReply) => {
    try {
      const { assetId, productType, projectId, valuationDate, targetCurrency, runManually } = request.body

      // Validate that at least one identifier is provided
      if (!assetId && !productType && !projectId) {
        return reply.status(400).send({
          error: {
            message: 'At least one of assetId, productType, or projectId must be provided',
            statusCode: 400,
            validation: ['Missing required identifier: assetId, productType, or projectId']
          }
        })
      }

      const calculationInput: CalculationInput = {
        assetId,
        productType,
        projectId,
        valuationDate: new Date(valuationDate),
        targetCurrency: targetCurrency || 'USD'
      }

      // TODO: Rebuild NAV calculation service
      // const result = await navService.calculateBasicNav(calculationInput)
      return reply.status(501).send({
        error: {
          message: 'NAV calculation service is being rebuilt',
          statusCode: 501
        }
      })

      /* COMMENTED OUT - Needs rebuild
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: {
            message: result.error,
            statusCode: result.statusCode || 500
          }
        })
      }

      return reply.status(201).send({
        success: true,
        data: result.data,
        message: 'NAV calculation completed successfully',
        timestamp: new Date().toISOString()
      })
      */

    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create NAV run')
      return reply.status(500).send({
        error: {
          message: 'Failed to create NAV calculation run',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /nav/runs/:runId - Get NAV run details
   */
  fastify.get<GetNavRunRequest>('/nav/runs/:runId', {
    schema: getNavRunSchema
  }, async (request: FastifyRequest<GetNavRunRequest>, reply: FastifyReply) => {
    try {
      const { runId } = request.params

      // TODO: Implement database lookup for stored NAV runs
      // For Phase 2, return a mock response based on runId
      return reply.status(404).send({
        error: {
          message: `NAV run '${runId}' not found. Database persistence not yet implemented.`,
          statusCode: 404
        }
      })

    } catch (error) {
      fastify.log.error({ error, runId: request.params.runId }, 'Failed to get NAV run')
      return reply.status(500).send({
        error: {
          message: 'Failed to get NAV run details',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /nav/runs - List NAV runs with filtering
   */
  fastify.get<GetNavRunsRequest>('/nav/runs', {
    schema: getNavRunsSchema
  }, async (request: FastifyRequest<GetNavRunsRequest>, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 20, sortBy = 'calculatedAt', sortOrder = 'desc' } = request.query

      // TODO: Implement database query for stored NAV runs
      // For Phase 2, return empty results
      return reply.send({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          hasMore: false,
          totalPages: 0
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      fastify.log.error({ error, query: request.query }, 'Failed to list NAV runs')
      return reply.status(500).send({
        error: {
          message: 'Failed to list NAV runs',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PATCH /nav/runs/:runId - Update NAV run
   */
  fastify.patch<UpdateNavRunRequest>('/nav/runs/:runId', {
    schema: updateNavRunSchema
  }, async (request: FastifyRequest<UpdateNavRunRequest>, reply: FastifyReply) => {
    try {
      const { runId } = request.params

      // TODO: Implement database update for stored NAV runs
      // For Phase 2, return not found
      return reply.status(404).send({
        error: {
          message: `NAV run '${runId}' not found. Database persistence not yet implemented.`,
          statusCode: 404
        }
      })

    } catch (error) {
      fastify.log.error({ error, runId: request.params.runId, body: request.body }, 'Failed to update NAV run')
      return reply.status(500).send({
        error: {
          message: 'Failed to update NAV run',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /nav/projects/:projectId/weighted - Get project weighted NAV
   */
  fastify.get<GetProjectWeightedNavRequest>('/nav/projects/:projectId/weighted', {
    schema: getProjectWeightedNavSchema
  }, async (request: FastifyRequest<GetProjectWeightedNavRequest>, reply: FastifyReply) => {
    try {
      const { projectId } = request.params
      const { asOf, currency = 'USD' } = request.query

      // TODO: Implement project weighted NAV calculation with database lookup
      // For Phase 2, calculate basic single-asset NAV
      const calculationInput: CalculationInput = {
        projectId,
        valuationDate: asOf ? new Date(asOf) : new Date(),
        targetCurrency: currency
      }

      // TODO: Rebuild NAV calculation service
      // const result = await navService.calculateBasicNav(calculationInput)
      return reply.status(501).send({
        error: {
          message: 'NAV calculation service is being rebuilt',
          statusCode: 501
        }
      })

      /* COMMENTED OUT - Needs rebuild - unreachable code removed
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: {
            message: result.error,
            statusCode: result.statusCode || 500
          }
        })
      }

      // Transform single result into project weighted format
      const projectWeightedData = {
        projectId,
        projectName: `Project ${projectId}`,
        weightedNavValue: result.data!.navValue,
        currency: result.data!.currency,
        asOf: result.data!.valuationDate.toISOString(),
        assetBreakdown: [{
          assetId: result.data!.assetId || projectId,
          productType: result.data!.productType || 'unknown',
          navValue: result.data!.navValue,
          weight: 1.0,
          contributionToTotal: result.data!.navValue
        }],
        calculatedAt: result.data!.calculatedAt.toISOString()
      }

      return reply.send({
        success: true,
        data: projectWeightedData,
        timestamp: new Date().toISOString()
      })
      */

    } catch (error) {
      fastify.log.error({ error, projectId: request.params.projectId, query: request.query }, 'Failed to get project weighted NAV')
      return reply.status(500).send({
        error: {
          message: 'Failed to get project weighted NAV',
          statusCode: 500
        }
      })
    }
  })
}
