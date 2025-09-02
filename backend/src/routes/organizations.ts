/**
 * Organization Management API Routes
 * Provides comprehensive CRUD operations for organizations/issuers
 * Resolves architectural anti-pattern by moving from direct frontend database calls to proper API endpoints
 */

import { FastifyPluginAsync } from 'fastify'
import { OrganizationService } from '@/services/organizations'
import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest
} from '@/services/organizations'

const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  const organizationService = new OrganizationService()

  // Schema definitions for OpenAPI/Swagger
  const organizationSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      legal_name: { type: 'string', nullable: true },
      business_type: { type: 'string', nullable: true },
      registration_number: { type: 'string', nullable: true },
      registration_date: { type: 'string', format: 'date', nullable: true },
      tax_id: { type: 'string', nullable: true },
      jurisdiction: { type: 'string', nullable: true },
      status: { type: 'string', nullable: true },
      contact_email: { type: 'string', nullable: true },
      contact_phone: { type: 'string', nullable: true },
      website: { type: 'string', nullable: true },
      address: { type: 'object', nullable: true },
      legal_representatives: { type: 'object', nullable: true },
      compliance_status: { type: 'string', nullable: true },
      onboarding_completed: { type: 'boolean', nullable: true },
      entity_structure: { type: 'string', nullable: true },
      issuer_type: { type: 'string', nullable: true },
      governance_model: { type: 'string', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time', nullable: true }
    }
  }

  const organizationSummarySchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      legal_name: { type: 'string', nullable: true },
      business_type: { type: 'string', nullable: true },
      status: { type: 'string', nullable: true },
      compliance_status: { type: 'string', nullable: true },
      onboarding_completed: { type: 'boolean', nullable: true },
      document_count: { type: 'integer' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time', nullable: true }
    }
  }

  const documentSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      document_name: { type: 'string' },
      document_type: { type: 'string' },
      status: { type: 'string' },
      file_url: { type: 'string', nullable: true },
      uploaded_at: { type: 'string', format: 'date-time' },
      is_public: { type: 'boolean', nullable: true },
      metadata: { type: 'object', nullable: true }
    }
  }

  /**
   * GET /api/v1/organizations
   * Get all organizations with filtering and pagination
   */
  fastify.get('/', {
    schema: {
      description: 'Get all organizations with filtering, searching, and pagination',
      tags: ['Organizations'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string' },
          search: { type: 'string' },
          sortBy: { type: 'string', default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          description: 'Organizations list with pagination',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                organizations: { type: 'array', items: organizationSummarySchema },
                pagination: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    hasMore: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const options = request.query as any
    const result = await organizationService.getOrganizations(options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/organizations
   * Create new organization
   */
  fastify.post('/', {
    schema: {
      description: 'Create new organization with comprehensive details',
      tags: ['Organizations'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          legal_name: { type: 'string' },
          business_type: { type: 'string' },
          registration_number: { type: 'string' },
          registration_date: { type: 'string', format: 'date' },
          tax_id: { type: 'string' },
          jurisdiction: { type: 'string' },
          contact_email: { type: 'string', format: 'email' },
          contact_phone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          address: { type: 'object' },
          legal_representatives: { type: 'object' },
          entity_structure: { type: 'string' },
          issuer_type: { type: 'string' },
          governance_model: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Organization created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: organizationSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as CreateOrganizationRequest
    const result = await organizationService.createOrganization(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/organizations/statistics
   * Get organization statistics
   */
  fastify.get('/statistics', {
    schema: {
      description: 'Get comprehensive organization statistics',
      tags: ['Organizations'],
      response: {
        200: {
          description: 'Organization statistics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                by_status: { type: 'object' },
                by_compliance_status: { type: 'object' },
                onboarding_completed: { type: 'integer' },
                recent_registrations: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await organizationService.getOrganizationStatistics()
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/organizations/search
   * Search organizations
   */
  fastify.get('/search', {
    schema: {
      description: 'Search organizations by name or legal name',
      tags: ['Organizations'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          page: { type: 'integer', minimum: 1, default: 1 }
        }
      },
      response: {
        200: {
          description: 'Search results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: organizationSummarySchema }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { q, limit, page } = request.query as any
    const result = await organizationService.searchOrganizations(q, { limit, page })
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/organizations/by-status/:status
   * Get organizations by status
   */
  fastify.get('/by-status/:status', {
    schema: {
      description: 'Get organizations filtered by status',
      tags: ['Organizations'],
      params: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Organizations with specified status',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: organizationSummarySchema }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { status } = request.params as { status: string }
    const result = await organizationService.getOrganizationsByStatus(status)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/organizations/:id
   * Get organization by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get organization details by ID',
      tags: ['Organizations'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Organization details',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: organizationSchema
          }
        },
        404: {
          description: 'Organization not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await organizationService.getOrganizationById(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PUT /api/v1/organizations/:id
   * Update organization
   */
  fastify.put('/:id', {
    schema: {
      description: 'Update organization details',
      tags: ['Organizations'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          legal_name: { type: 'string' },
          business_type: { type: 'string' },
          registration_number: { type: 'string' },
          registration_date: { type: 'string', format: 'date' },
          tax_id: { type: 'string' },
          jurisdiction: { type: 'string' },
          status: { type: 'string' },
          contact_email: { type: 'string', format: 'email' },
          contact_phone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          address: { type: 'object' },
          legal_representatives: { type: 'object' },
          compliance_status: { type: 'string' },
          onboarding_completed: { type: 'boolean' },
          entity_structure: { type: 'string' },
          issuer_type: { type: 'string' },
          governance_model: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Organization updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: organizationSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = request.body as UpdateOrganizationRequest
    const result = await organizationService.updateOrganization(id, data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * DELETE /api/v1/organizations/:id
   * Delete organization
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete organization and associated data',
      tags: ['Organizations'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Organization deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await organizationService.deleteOrganization(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send({
      success: true,
      message: 'Organization deleted successfully'
    })
  })

  /**
   * GET /api/v1/organizations/:id/documents
   * Get organization documents
   */
  fastify.get('/:id/documents', {
    schema: {
      description: 'Get all documents associated with organization',
      tags: ['Organizations', 'Documents'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Organization documents',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: documentSchema }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await organizationService.getOrganizationDocuments(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PATCH /api/v1/organizations/:id/compliance-status
   * Update organization compliance status
   */
  fastify.patch('/:id/compliance-status', {
    schema: {
      description: 'Update organization compliance status',
      tags: ['Organizations', 'Compliance'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['compliance_status'],
        properties: {
          compliance_status: { 
            type: 'string',
            enum: ['pending_review', 'compliant', 'non_compliant', 'review_required']
          }
        }
      },
      response: {
        200: {
          description: 'Compliance status updated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { compliance_status } = request.body as { compliance_status: string }
    const result = await organizationService.updateComplianceStatus(id, compliance_status)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send({
      success: true,
      message: 'Compliance status updated successfully'
    })
  })

  /**
   * PATCH /api/v1/organizations/:id/complete-onboarding
   * Complete organization onboarding
   */
  fastify.patch('/:id/complete-onboarding', {
    schema: {
      description: 'Mark organization onboarding as completed',
      tags: ['Organizations', 'Onboarding'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Onboarding completed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await organizationService.completeOnboarding(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send({
      success: true,
      message: 'Organization onboarding completed successfully'
    })
  })
}

export default organizationRoutes
