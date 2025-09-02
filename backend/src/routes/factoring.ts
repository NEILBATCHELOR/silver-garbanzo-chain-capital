/**
 * Factoring Routes
 * API endpoints for healthcare invoice factoring operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { 
  getFactoringService, 
  getFactoringValidationService, 
  getFactoringAnalyticsService 
} from '../services/factoring/index'
import type {
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreatePoolRequest,
  UpdatePoolRequest,
  CreateProviderRequest,
  UpdateProviderRequest,
  CreatePayerRequest,
  UpdatePayerRequest,
  TokenizationRequest,
  CreateTokenAllocationRequest,
  DistributeTokensRequest
} from '../services/factoring/types'
import { QueryOptions } from '@/types/index'

/**
 * Request/Response Types for API endpoints
 */
interface CreateInvoiceAPIRequest {
  Body: CreateInvoiceRequest
}

interface UpdateInvoiceAPIRequest {
  Body: UpdateInvoiceRequest
  Params: { id: string }
}

interface GetInvoiceAPIRequest {
  Params: { id: string }
  Querystring: {
    includeRelations?: boolean
  }
}

interface GetInvoicesAPIRequest {
  Querystring: QueryOptions & {
    poolId?: string
    providerId?: string
    payerId?: string
    minAmount?: string
    maxAmount?: string
  }
}

interface CreatePoolAPIRequest {
  Body: CreatePoolRequest
}

interface GetPoolAPIRequest {
  Params: { id: string }
  Querystring: {
    includeInvoices?: boolean
  }
}

interface CreateProviderAPIRequest {
  Body: CreateProviderRequest
}

interface GetProvidersAPIRequest {
  Querystring: QueryOptions
}

interface CreatePayerAPIRequest {
  Body: CreatePayerRequest
}

interface GetPayersAPIRequest {
  Querystring: QueryOptions
}

interface GetAnalyticsAPIRequest {
  Querystring: {
    include?: string[]
  }
}

interface TokenizePoolAPIRequest {
  Body: TokenizationRequest
}

interface CreateTokenAllocationAPIRequest {
  Body: CreateTokenAllocationRequest
}

interface DistributeTokensAPIRequest {
  Body: DistributeTokensRequest
}

interface GetPoolTokenizationAPIRequest {
  Params: { poolId: string }
}

interface GetTokenAllocationsAPIRequest {
  Params: { projectId: string }
  Querystring: QueryOptions
}

interface GetTokenDistributionsAPIRequest {
  Params: { projectId: string }
  Querystring: QueryOptions
}

interface UpdateDistributionStatusAPIRequest {
  Params: { distributionId: string }
  Body: {
    status: 'pending' | 'confirmed' | 'failed'
    transactionHash?: string
  }
}

/**
 * Factoring Routes Plugin
 */
export async function factoringRoutes(fastify: FastifyInstance) {
  const factoringService = getFactoringService()
  const validationService = getFactoringValidationService()
  const analyticsService = getFactoringAnalyticsService()

  // Schema definitions
  const invoiceCreateSchema = {
    type: 'object',
    required: ['patient_name', 'patient_dob', 'service_dates', 'procedure_codes', 
               'diagnosis_codes', 'billed_amount', 'net_amount_due', 'policy_number', 
               'invoice_number', 'invoice_date', 'due_date'],
    properties: {
      provider_id: {
        type: 'integer',
        description: 'Healthcare provider identifier'
      },
      patient_name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Patient full name'
      },
      patient_dob: {
        type: 'string',
        format: 'date',
        description: 'Patient date of birth'
      },
      service_dates: {
        type: 'string',
        maxLength: 255,
        description: 'Service date range or single date'
      },
      procedure_codes: {
        type: 'string',
        pattern: '^(\\d{5})(,\\s*\\d{5})*$',
        description: 'CPT procedure codes (5 digits, comma-separated)'
      },
      diagnosis_codes: {
        type: 'string',
        pattern: '^([A-Z]\\d{2}(\\.\\d{1,4})?)(,\\s*[A-Z]\\d{2}(\\.\\d{1,4})?)*$',
        description: 'ICD-10 diagnosis codes (comma-separated)'
      },
      billed_amount: {
        type: 'number',
        minimum: 0,
        description: 'Original billed amount before adjustments'
      },
      adjustments: {
        type: 'number',
        minimum: 0,
        description: 'Insurance adjustments and write-offs'
      },
      net_amount_due: {
        type: 'number',
        minimum: 0,
        description: 'Final amount due after adjustments'
      },
      payer_id: {
        type: 'integer',
        description: 'Insurance payer identifier'
      },
      policy_number: {
        type: 'string',
        maxLength: 255,
        description: 'Insurance policy number'
      },
      invoice_number: {
        type: 'string',
        maxLength: 255,
        description: 'Unique invoice number'
      },
      invoice_date: {
        type: 'string',
        format: 'date',
        description: 'Invoice generation date'
      },
      due_date: {
        type: 'string',
        format: 'date',
        description: 'Payment due date'
      },
      factoring_discount_rate: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Factoring discount percentage'
      },
      factoring_terms: {
        type: 'string',
        maxLength: 1000,
        description: 'Factoring agreement terms'
      },
      pool_id: {
        type: 'integer',
        description: 'Pool assignment (optional)'
      }
    }
  }

  const poolCreateSchema = {
    type: 'object',
    required: ['pool_name', 'pool_type'],
    properties: {
      pool_name: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9\\s\\-_]+$',
        description: 'Pool name (letters, numbers, spaces, hyphens, underscores only)'
      },
      pool_type: {
        type: 'string',
        enum: ['Total Pool', 'Tranche'],
        description: 'Pool classification type'
      }
    }
  }

  const providerCreateSchema = {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 255,
        description: 'Healthcare provider name'
      },
      address: {
        type: 'string',
        maxLength: 500,
        description: 'Provider business address'
      }
    }
  }

  const payerCreateSchema = {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 255,
        description: 'Insurance payer name'
      }
    }
  }

  const invoiceResponseSchema = {
    type: 'object',
    properties: {
      invoice_id: { type: 'integer' },
      provider_id: { type: 'integer' },
      patient_name: { type: 'string' },
      patient_dob: { type: 'string', format: 'date' },
      service_dates: { type: 'string' },
      procedure_codes: { type: 'string' },
      diagnosis_codes: { type: 'string' },
      billed_amount: { type: 'number' },
      adjustments: { type: 'number' },
      net_amount_due: { type: 'number' },
      payer_id: { type: 'integer' },
      policy_number: { type: 'string' },
      invoice_number: { type: 'string' },
      invoice_date: { type: 'string', format: 'date' },
      due_date: { type: 'string', format: 'date' },
      factoring_discount_rate: { type: 'number' },
      factoring_terms: { type: 'string' },
      upload_timestamp: { type: 'string', format: 'date-time' },
      pool_id: { type: 'integer' },
      provider: {
        type: 'object',
        properties: {
          provider_id: { type: 'integer' },
          name: { type: 'string' },
          address: { type: 'string' }
        }
      },
      payer: {
        type: 'object',
        properties: {
          payer_id: { type: 'integer' },
          name: { type: 'string' }
        }
      },
      pool: {
        type: 'object',
        properties: {
          pool_id: { type: 'integer' },
          pool_name: { type: 'string' },
          pool_type: { type: 'string' }
        }
      }
    }
  }

  // ==================== INVOICE ROUTES ====================

  /**
   * GET /factoring/invoices - Get all invoices with filtering
   */
  fastify.get<GetInvoicesAPIRequest>('/factoring/invoices', {
    schema: {
      description: `
# Get Healthcare Invoices

Retrieve all healthcare invoices with comprehensive filtering, pagination, and sorting capabilities.

## Features

- **Healthcare-Specific Filtering** - Filter by provider, payer, patient, procedure codes
- **Financial Filtering** - Filter by amount ranges, discount rates, payment status
- **Pagination & Sorting** - Efficient data handling with customizable sorting
- **Relationship Data** - Include provider, payer, and pool information
- **Search Capabilities** - Text search across multiple invoice fields

## Filtering Options

### Provider & Payer Filtering
- \`providerId\` - Filter by specific healthcare provider
- \`payerId\` - Filter by specific insurance payer

### Financial Filtering
- \`minAmount\` - Minimum net amount due
- \`maxAmount\` - Maximum net amount due
- \`poolId\` - Filter by pool assignment

### Search Capabilities
Text search across:
- Invoice numbers
- Patient names
- Procedure codes
- Diagnosis codes

## Healthcare Invoice Management

This endpoint supports the complete healthcare factoring workflow:
1. **Invoice Upload** - Track uploaded invoices from providers
2. **Pool Assignment** - Manage invoice grouping for tokenization
3. **Discount Rate Analysis** - Monitor factoring rates and terms
4. **Payment Tracking** - Monitor due dates and aging
`,
      tags: ['Factoring', 'Invoices'],
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
            description: 'Number of invoices per page'
          },
          search: { 
            type: 'string',
            description: 'Text search across invoice fields'
          },
          poolId: {
            type: 'string',
            description: 'Filter by pool assignment'
          },
          providerId: {
            type: 'string', 
            description: 'Filter by healthcare provider'
          },
          payerId: {
            type: 'string',
            description: 'Filter by insurance payer'
          },
          minAmount: {
            type: 'string',
            description: 'Minimum net amount due'
          },
          maxAmount: {
            type: 'string',
            description: 'Maximum net amount due'
          },
          sortBy: { 
            type: 'string', 
            default: 'upload_timestamp',
            enum: ['upload_timestamp', 'invoice_date', 'due_date', 'net_amount_due', 'patient_name'],
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
            data: {
              type: 'array',
              items: invoiceResponseSchema
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
    }
  }, async (request: FastifyRequest<GetInvoicesAPIRequest>, reply: FastifyReply) => {
    try {
      const result = await factoringService.getInvoices(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get invoices')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve invoices', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/invoices/:id - Get specific invoice
   */
  fastify.get<GetInvoiceAPIRequest>('/factoring/invoices/:id', {
    schema: {
      description: 'Get a specific healthcare invoice by ID',
      tags: ['Factoring', 'Invoices'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeRelations: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: invoiceResponseSchema
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
  }, async (request: FastifyRequest<GetInvoiceAPIRequest>, reply: FastifyReply) => {
    try {
      const invoiceId = parseInt(request.params.id, 10)
      if (isNaN(invoiceId)) {
        return reply.status(400).send({
          error: { message: 'Invalid invoice ID', statusCode: 400 }
        })
      }

      const result = await factoringService.getInvoice(invoiceId)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, invoiceId: request.params.id }, 'Failed to get invoice')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve invoice', statusCode: 500 }
      })
    }
  })

  /**
   * POST /factoring/invoices - Create new invoice
   */
  fastify.post<CreateInvoiceAPIRequest>('/factoring/invoices', {
    schema: {
      description: 'Create a new healthcare invoice',
      tags: ['Factoring', 'Invoices'],
      body: invoiceCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: invoiceResponseSchema
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
                validationErrors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      code: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateInvoiceAPIRequest>, reply: FastifyReply) => {
    try {
      // Validate the request data
      const validation = validationService.validateCreateInvoice(request.body)
      
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            validationErrors: validation.errors
          }
        })
      }

      const result = await factoringService.createInvoice(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create invoice')
      return reply.status(500).send({
        error: { message: 'Failed to create invoice', statusCode: 500 }
      })
    }
  })

  /**
   * PUT /factoring/invoices/:id - Update invoice
   */
  fastify.put<UpdateInvoiceAPIRequest>('/factoring/invoices/:id', {
    schema: {
      description: 'Update a healthcare invoice',
      tags: ['Factoring', 'Invoices'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: { ...invoiceCreateSchema.properties }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: invoiceResponseSchema
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
                validationErrors: { type: 'array' }
              }
            }
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
  }, async (request: FastifyRequest<UpdateInvoiceAPIRequest>, reply: FastifyReply) => {
    try {
      const invoiceId = parseInt(request.params.id, 10)
      if (isNaN(invoiceId)) {
        return reply.status(400).send({
          error: { message: 'Invalid invoice ID', statusCode: 400 }
        })
      }

      // Validate the update data
      const validation = validationService.validateUpdateInvoice(request.body)
      
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            validationErrors: validation.errors
          }
        })
      }

      const result = await factoringService.updateInvoice(invoiceId, request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, invoiceId: request.params.id, body: request.body }, 'Failed to update invoice')
      return reply.status(500).send({
        error: { message: 'Failed to update invoice', statusCode: 500 }
      })
    }
  })

  // ==================== POOL ROUTES ====================

  /**
   * POST /factoring/pools - Create new pool
   */
  fastify.post<CreatePoolAPIRequest>('/factoring/pools', {
    schema: {
      description: 'Create a new invoice pool or tranche',
      tags: ['Factoring', 'Pools'],
      body: poolCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                pool_id: { type: 'integer' },
                pool_name: { type: 'string' },
                pool_type: { type: 'string' },
                creation_timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreatePoolAPIRequest>, reply: FastifyReply) => {
    try {
      // Validate the request data
      const validation = validationService.validateCreatePool(request.body)
      
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            validationErrors: validation.errors
          }
        })
      }

      const result = await factoringService.createPool(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create pool')
      return reply.status(500).send({
        error: { message: 'Failed to create pool', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/pools/:id - Get pool with invoices
   */
  fastify.get<GetPoolAPIRequest>('/factoring/pools/:id', {
    schema: {
      description: 'Get a specific pool with its invoices and statistics',
      tags: ['Factoring', 'Pools'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeInvoices: { type: 'boolean', default: true }
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
                pool_id: { type: 'integer' },
                pool_name: { type: 'string' },
                pool_type: { type: 'string' },
                creation_timestamp: { type: 'string', format: 'date-time' },
                total_value: { type: 'number' },
                invoice_count: { type: 'number' },
                average_age: { type: 'number' },
                invoices: {
                  type: 'array',
                  items: invoiceResponseSchema
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetPoolAPIRequest>, reply: FastifyReply) => {
    try {
      const poolId = parseInt(request.params.id, 10)
      if (isNaN(poolId)) {
        return reply.status(400).send({
          error: { message: 'Invalid pool ID', statusCode: 400 }
        })
      }

      const result = await factoringService.getPoolWithInvoices(poolId)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, poolId: request.params.id }, 'Failed to get pool')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve pool', statusCode: 500 }
      })
    }
  })

  // ==================== PROVIDER ROUTES ====================

  /**
   * GET /factoring/providers - Get all providers
   */
  fastify.get<GetProvidersAPIRequest>('/factoring/providers', {
    schema: {
      description: 'Get all healthcare providers with pagination',
      tags: ['Factoring', 'Providers'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', description: 'Search provider names and addresses' }
        }
      }
    }
  }, async (request: FastifyRequest<GetProvidersAPIRequest>, reply: FastifyReply) => {
    try {
      const result = await factoringService.getProviders(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get providers')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve providers', statusCode: 500 }
      })
    }
  })

  /**
   * POST /factoring/providers - Create new provider
   */
  fastify.post<CreateProviderAPIRequest>('/factoring/providers', {
    schema: {
      description: 'Create a new healthcare provider',
      tags: ['Factoring', 'Providers'],
      body: providerCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                provider_id: { type: 'integer' },
                name: { type: 'string' },
                address: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateProviderAPIRequest>, reply: FastifyReply) => {
    try {
      const validation = validationService.validateCreateProvider(request.body)
      
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            validationErrors: validation.errors
          }
        })
      }

      const result = await factoringService.createProvider(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create provider')
      return reply.status(500).send({
        error: { message: 'Failed to create provider', statusCode: 500 }
      })
    }
  })

  // ==================== PAYER ROUTES ====================

  /**
   * GET /factoring/payers - Get all payers
   */
  fastify.get<GetPayersAPIRequest>('/factoring/payers', {
    schema: {
      description: 'Get all insurance payers with pagination',
      tags: ['Factoring', 'Payers'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', description: 'Search payer names' }
        }
      }
    }
  }, async (request: FastifyRequest<GetPayersAPIRequest>, reply: FastifyReply) => {
    try {
      const result = await factoringService.getPayers(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get payers')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve payers', statusCode: 500 }
      })
    }
  })

  /**
   * POST /factoring/payers - Create new payer
   */
  fastify.post<CreatePayerAPIRequest>('/factoring/payers', {
    schema: {
      description: 'Create a new insurance payer',
      tags: ['Factoring', 'Payers'],
      body: payerCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                payer_id: { type: 'integer' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreatePayerAPIRequest>, reply: FastifyReply) => {
    try {
      const validation = validationService.validateCreatePayer(request.body)
      
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            validationErrors: validation.errors
          }
        })
      }

      const result = await factoringService.createPayer(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create payer')
      return reply.status(500).send({
        error: { message: 'Failed to create payer', statusCode: 500 }
      })
    }
  })

  // ==================== ANALYTICS ROUTES ====================

  /**
   * GET /factoring/analytics - Get comprehensive factoring analytics
   */
  fastify.get<GetAnalyticsAPIRequest>('/factoring/analytics', {
    schema: {
      description: `
# Factoring Analytics

Get comprehensive analytics and business intelligence for healthcare invoice factoring operations.

## Analytics Included

### Summary Metrics
- Total invoices, pools, providers, and payers
- Total portfolio value across all invoices
- Financial performance indicators

### Performance Analysis
- Provider performance rankings with discount rates
- Pool value distribution and composition
- Monthly trends and growth patterns

### Business Intelligence
- Invoice aging and payment patterns
- Discount rate analysis and optimization opportunities
- Geographic and demographic breakdowns

This endpoint provides the data needed for executive dashboards, 
performance monitoring, and strategic decision making.
`,
      tags: ['Factoring', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          include: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['summary', 'provider_performance', 'pool_distribution', 'monthly_trends', 'all']
            },
            description: 'Specific analytics sections to include'
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
                totals: {
                  type: 'object',
                  properties: {
                    invoices: { type: 'number' },
                    pools: { type: 'number' },
                    providers: { type: 'number' },
                    payers: { type: 'number' },
                    total_value: { type: 'number' }
                  }
                },
                pool_distribution: {
                  type: 'object',
                  additionalProperties: { type: 'number' }
                },
                provider_performance: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      provider_id: { type: 'number' },
                      provider_name: { type: 'string' },
                      total_invoices: { type: 'number' },
                      total_value: { type: 'number' },
                      average_discount_rate: { type: 'number' }
                    }
                  }
                },
                monthly_trends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: { type: 'string' },
                      invoice_count: { type: 'number' },
                      total_value: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetAnalyticsAPIRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getFactoringAnalytics()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get factoring analytics')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve analytics', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/analytics/invoices - Get invoice-specific analytics
   */
  fastify.get('/factoring/analytics/invoices', {
    schema: {
      description: 'Get detailed invoice statistics and analytics',
      tags: ['Factoring', 'Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_count: { type: 'number' },
                total_value: { type: 'number' },
                average_value: { type: 'number' },
                status_breakdown: { type: 'object' },
                age_distribution: { type: 'object' },
                discount_rate_stats: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getInvoiceStatistics()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get invoice analytics')
      return reply.status(500).send({
        error: { message: 'Failed to retrieve invoice analytics', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/analytics/export - Export analytics data
   */
  fastify.get('/factoring/analytics/export', {
    schema: {
      description: 'Export comprehensive analytics data',
      tags: ['Factoring', 'Analytics', 'Export'],
      querystring: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'csv'],
            default: 'json',
            description: 'Export format'
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { format?: 'json' | 'csv' } }>, reply: FastifyReply) => {
    try {
      const { format = 'json' } = request.query
      const result = await analyticsService.generateAnalyticsExport(format)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      // Set appropriate headers for file download
      const contentType = format === 'csv' ? 'text/csv' : 'application/json'
      const filename = `factoring-analytics-${new Date().toISOString().split('T')[0]}.${format}`

      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(result.data)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to export analytics')
      return reply.status(500).send({
        error: { message: 'Failed to export analytics', statusCode: 500 }
      })
    }
  })

  // ==================== TOKENIZATION ROUTES ====================

  /**
   * POST /factoring/tokenize - Tokenize a pool
   */
  fastify.post<TokenizePoolAPIRequest>('/factoring/tokenize', {
    schema: {
      description: 'Tokenize a pool of invoices',
      tags: ['Factoring', 'Tokenization'],
      body: {
        type: 'object',
        required: ['poolId', 'tokenName', 'tokenSymbol', 'tokenStandard', 'totalTokens', 'tokenValue', 'projectId'],
        properties: {
          poolId: { type: 'number', description: 'Pool ID to tokenize' },
          tokenName: { type: 'string', description: 'Token name' },
          tokenSymbol: { type: 'string', description: 'Token symbol' },
          tokenStandard: { 
            type: 'string', 
            enum: ['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-1400', 'ERC-3525', 'ERC-4626'],
            description: 'Token standard'
          },
          totalTokens: { type: 'number', description: 'Total number of tokens' },
          tokenValue: { type: 'number', description: 'Value per token' },
          projectId: { type: 'string', description: 'Project ID' },
          securityInterestDetails: { type: 'string', description: 'Security interest details' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await factoringService.tokenizePool(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to tokenize pool')
      return reply.status(500).send({
        error: { message: 'Failed to tokenize pool', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/pools/{poolId}/tokenization - Get pool tokenization data
   */
  fastify.get<GetPoolTokenizationAPIRequest>('/factoring/pools/:poolId/tokenization', {
    schema: {
      description: 'Get tokenization data for a pool',
      tags: ['Factoring', 'Tokenization'],
      params: {
        type: 'object',
        properties: {
          poolId: { type: 'string', description: 'Pool ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const poolId = parseInt(request.params.poolId)
      
      if (isNaN(poolId)) {
        return reply.status(400).send({
          error: { message: 'Invalid pool ID', statusCode: 400 }
        })
      }

      const result = await factoringService.getPoolTokenizationData(poolId)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get pool tokenization data')
      return reply.status(500).send({
        error: { message: 'Failed to get pool tokenization data', statusCode: 500 }
      })
    }
  })

  // ==================== TOKEN ALLOCATION ROUTES ====================

  /**
   * POST /factoring/allocations - Create token allocation
   */
  fastify.post<CreateTokenAllocationAPIRequest>('/factoring/allocations', {
    schema: {
      description: 'Create token allocation for investor',
      tags: ['Factoring', 'Token Allocation'],
      body: {
        type: 'object',
        required: ['investorId', 'tokenId', 'tokenAmount', 'allocationMode'],
        properties: {
          investorId: { type: 'string', description: 'Investor ID' },
          tokenId: { type: 'string', description: 'Token ID' },
          tokenAmount: { type: 'number', description: 'Token amount to allocate' },
          allocationMode: { type: 'string', enum: ['amount', 'percentage'], description: 'Allocation mode' },
          investmentAmount: { type: 'number', description: 'Investment amount' },
          notes: { type: 'string', description: 'Additional notes' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await factoringService.createTokenAllocation(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create token allocation')
      return reply.status(500).send({
        error: { message: 'Failed to create token allocation', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/projects/{projectId}/allocations - Get token allocations
   */
  fastify.get<GetTokenAllocationsAPIRequest>('/factoring/projects/:projectId/allocations', {
    schema: {
      description: 'Get token allocations for a project',
      tags: ['Factoring', 'Token Allocation'],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            pagination: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await factoringService.getTokenAllocations(request.params.projectId, request.query)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get token allocations')
      return reply.status(500).send({
        error: { message: 'Failed to get token allocations', statusCode: 500 }
      })
    }
  })

  // ==================== TOKEN DISTRIBUTION ROUTES ====================

  /**
   * POST /factoring/distributions - Distribute tokens
   */
  fastify.post<DistributeTokensAPIRequest>('/factoring/distributions', {
    schema: {
      description: 'Distribute tokens to investor',
      tags: ['Factoring', 'Token Distribution'],
      body: {
        type: 'object',
        required: ['allocationId', 'toAddress', 'blockchain'],
        properties: {
          allocationId: { type: 'string', description: 'Token allocation ID' },
          toAddress: { type: 'string', description: 'Recipient wallet address' },
          blockchain: { type: 'string', description: 'Blockchain network' },
          gasPrice: { type: 'string', description: 'Gas price (optional)' },
          gasLimit: { type: 'string', description: 'Gas limit (optional)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await factoringService.distributeTokens(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to distribute tokens')
      return reply.status(500).send({
        error: { message: 'Failed to distribute tokens', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/projects/{projectId}/distributions - Get token distributions
   */
  fastify.get<GetTokenDistributionsAPIRequest>('/factoring/projects/:projectId/distributions', {
    schema: {
      description: 'Get token distributions for a project',
      tags: ['Factoring', 'Token Distribution'],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            pagination: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await factoringService.getTokenDistributions(request.params.projectId, request.query)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get token distributions')
      return reply.status(500).send({
        error: { message: 'Failed to get token distributions', statusCode: 500 }
      })
    }
  })

  /**
   * PUT /factoring/distributions/{distributionId}/status - Update distribution status
   */
  fastify.put<UpdateDistributionStatusAPIRequest>('/factoring/distributions/:distributionId/status', {
    schema: {
      description: 'Update token distribution status',
      tags: ['Factoring', 'Token Distribution'],
      params: {
        type: 'object',
        properties: {
          distributionId: { type: 'string', description: 'Distribution ID' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'confirmed', 'failed'], description: 'New status' },
          transactionHash: { type: 'string', description: 'Transaction hash (optional)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { status, transactionHash } = request.body
      const result = await factoringService.updateDistributionStatus(
        request.params.distributionId,
        status,
        transactionHash
      )
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: { message: result.error, statusCode: result.statusCode }
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update distribution status')
      return reply.status(500).send({
        error: { message: 'Failed to update distribution status', statusCode: 500 }
      })
    }
  })

  /**
   * GET /factoring/health - Health check endpoint
   */
  fastify.get('/factoring/health', {
    schema: {
      description: 'Health check for factoring service',
      tags: ['Factoring', 'Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                factoring: { type: 'string' },
                validation: { type: 'string' },
                analytics: { type: 'string' },
                database: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Basic health checks
      const timestamp = new Date().toISOString()
      
      // Test database connectivity with a simple query
      await factoringService['db'].invoice.count({ take: 1 })
      
      return reply.send({
        status: 'healthy',
        timestamp,
        services: {
          factoring: 'operational',
          validation: 'operational',
          analytics: 'operational',
          database: 'connected'
        }
      })
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed')
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      })
    }
  })
}

export default factoringRoutes
