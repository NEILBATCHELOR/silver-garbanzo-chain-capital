/**
 * Project Routes
 * API endpoints for project operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ProjectService } from '../services/projects/ProjectService'
import { ProjectAnalyticsService } from '../services/projects/ProjectAnalyticsService'
import type {
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectQueryOptions,
  BulkProjectUpdateRequest,
  ProjectExportOptions,
  ProjectImportData
} from '../types/project-service'

/**
 * Request/Response Types for API endpoints
 */
interface CreateProjectRequest {
  Body: ProjectCreateRequest
  Querystring: {
    createCapTable?: boolean
  }
}

interface UpdateProjectRequest {
  Body: ProjectUpdateRequest
  Params: {
    id: string
  }
}

interface GetProjectRequest {
  Params: {
    id: string
  }
  Querystring: {
    includeStats?: boolean
    includeRelated?: boolean
  }
}

interface GetProjectsRequest {
  Querystring: ProjectQueryOptions
}

interface SetPrimaryProjectRequest {
  Params: {
    id: string
  }
}

interface BulkUpdateRequest {
  Body: BulkProjectUpdateRequest
}

interface ExportProjectsRequest {
  Body: ProjectExportOptions
}

interface ImportProjectsRequest {
  Body: ProjectImportData
}

interface GetAnalyticsRequest {
  Params: {
    id: string
  }
}

interface GetAuditTrailRequest {
  Params: {
    id: string
  }
  Querystring: {
    limit?: number
    offset?: number
  }
}

interface GetPerformanceReportRequest {
  Params: {
    id: string
  }
  Body: {
    dateRange?: {
      start: string
      end: string
    }
  }
}

/**
 * Project Routes Plugin
 */
export async function projectRoutes(fastify: FastifyInstance) {
  const projectService = new ProjectService()
  const analyticsService = new ProjectAnalyticsService()

  // Enhanced schema definitions with comprehensive validation (examples removed for Fastify strict mode)
  const projectCreateSchema = {
    type: 'object',
    required: ['name', 'project_type'],
    properties: {
      name: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 255,
        description: 'Human-readable project name (unique within organization)'
      },
      description: { 
        type: 'string', 
        maxLength: 1000,
        description: 'Detailed project description for investors and stakeholders'
      },
      project_type: { 
        type: 'string',
        enum: ['equity', 'bonds', 'structured_products', 'private_equity', 'real_estate', 'receivables', 'energy', 'stablecoins', 'tokenized_funds'],
        description: 'Project category that determines validation rules and required fields'
      },
      status: { 
        type: 'string', 
        enum: ['draft', 'under_review', 'approved', 'active', 'paused', 'completed', 'cancelled'],
        default: 'draft',
        description: 'Current project lifecycle status'
      },
      investment_status: { 
        type: 'string', 
        enum: ['open', 'closed', 'fully_subscribed', 'cancelled'],
        default: 'open',
        description: 'Investment availability status for new investors'
      },
      is_primary: { 
        type: 'boolean',
        default: false,
        description: 'Whether this is the primary project (only one allowed per organization)'
      },
      target_raise: { 
        type: 'number', 
        minimum: 0,
        description: 'Target fundraising amount in base currency'
      },
      minimum_investment: { 
        type: 'number', 
        minimum: 0,
        description: 'Minimum investment amount per investor'
      },
      legal_entity: { 
        type: 'string', 
        maxLength: 255,
        description: 'Legal entity name associated with the project'
      },
      jurisdiction: { 
        type: 'string', 
        maxLength: 100,
        description: 'Legal jurisdiction where the project is incorporated'
      },
      currency: { 
        type: 'string', 
        maxLength: 10,
        pattern: '^[A-Z]{3}$',
        description: 'Base currency for all financial amounts (ISO 4217 code)'
      },
      token_symbol: { 
        type: 'string', 
        pattern: '^[A-Z]{2,10}$',
        description: 'Token symbol for digital asset projects (2-10 uppercase letters)'
      },
      // ESG and compliance fields
      esg_rating: {
        type: 'string',
        enum: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'],
        description: 'Environmental, Social, and Governance rating'
      },
      sfdr_classification: {
        type: 'string',
        enum: ['article_6', 'article_8', 'article_9'],
        description: 'EU Sustainable Finance Disclosure Regulation classification'
      }
    }
  }

  const projectUpdateSchema = {
    type: 'object',
    properties: {
      ...projectCreateSchema.properties
    }
  }

  const projectResponseSchema = {
    type: 'object',
    properties: {
      id: { 
        type: 'string',
        format: 'uuid',
        description: 'Unique project identifier'
      },
      name: { 
        type: 'string',
        description: 'Project name'
      },
      description: { 
        type: 'string',
        description: 'Project description'
      },
      project_type: { 
        type: 'string',
        description: 'Project category type'
      },
      status: { 
        type: 'string',
        description: 'Current project status'
      },
      investment_status: {
        type: 'string',
        description: 'Investment availability status'
      },
      created_at: { 
        type: 'string',
        format: 'date-time',
        description: 'Project creation timestamp'
      },
      updated_at: { 
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      },
      completion_percentage: { 
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Data completion percentage based on required fields for project type'
      },
      investor_count: { 
        type: 'number',
        minimum: 0,
        description: 'Number of unique investors in this project'
      },
      raised_amount: { 
        type: 'number',
        minimum: 0,
        description: 'Total amount raised to date in base currency'
      },
      target_raise: {
        type: 'number',
        minimum: 0,
        description: 'Target fundraising amount'
      },
      minimum_investment: {
        type: 'number',
        minimum: 0,
        description: 'Minimum investment amount per investor'
      },
      legal_entity: {
        type: 'string',
        description: 'Associated legal entity'
      },
      currency: {
        type: 'string',
        description: 'Base currency for financial amounts'
      }
    }
  }

  // Routes

  /**
   * GET /projects - Get all projects with filtering and pagination
   */
  fastify.get<GetProjectsRequest>('/projects', {
    schema: {
      description: 'Get all investment projects with comprehensive filtering, pagination, and sorting capabilities',
      tags: ['Projects', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          page: { 
            type: 'integer', 
            minimum: 1, 
            default: 1,
            description: 'Page number for pagination (1-based)'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 100, 
            default: 20,
            description: 'Number of projects per page (max 100)'
          },
          search: { 
            type: 'string',
            description: 'Text search across project names, descriptions, and entities'
          },
          status: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['draft', 'under_review', 'approved', 'active', 'paused', 'completed', 'cancelled']
            },
            description: 'Filter by project lifecycle status (multiple values allowed)'
          },
          project_type: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['equity', 'bonds', 'structured_products', 'private_equity', 'real_estate', 'receivables', 'energy', 'stablecoins', 'tokenized_funds']
            },
            description: 'Filter by project investment category (multiple values allowed)'
          },
          is_primary: { 
            type: 'boolean',
            description: 'Filter by primary project flag (only one primary project allowed per organization)'
          },
          sortBy: { 
            type: 'string', 
            default: 'created_at',
            enum: ['created_at', 'updated_at', 'name', 'target_raise', 'raised_amount', 'completion_percentage'],
            description: 'Field to sort by'
          },
          sortOrder: { 
            type: 'string', 
            enum: ['asc', 'desc'], 
            default: 'desc',
            description: 'Sort order (ascending or descending)'
          },
          include_statistics: { 
            type: 'boolean', 
            default: true,
            description: 'Include calculated statistics (completion percentage, investor count, raised amount)'
          }
        }
      },
      response: {
        200: {
          description: 'Successfully retrieved projects with pagination',
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success indicator'
            },
            data: {
              type: 'array',
              items: projectResponseSchema,
              description: 'Array of project objects with calculated statistics'
            },
            pagination: {
              type: 'object',
              properties: {
                total: { 
                  type: 'number',
                  description: 'Total number of projects matching filters'
                },
                page: { 
                  type: 'number',
                  description: 'Current page number'
                },
                limit: { 
                  type: 'number',
                  description: 'Number of items per page'
                },
                hasMore: { 
                  type: 'boolean',
                  description: 'Whether more pages are available'
                },
                totalPages: { 
                  type: 'number',
                  description: 'Total number of pages available'
                }
              },
              description: 'Pagination information for efficient data loading'
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        400: {
          description: 'Bad Request - Invalid query parameters',
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                timestamp: { type: 'string' }
              }
            }
          }
        },
        500: {
          description: 'Internal Server Error',
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                timestamp: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetProjectsRequest>, reply: FastifyReply) => {
    try {
      const result = await projectService.getProjects(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get projects')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve projects',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /projects/:id - Get a specific project by ID
   */
  fastify.get<GetProjectRequest>('/projects/:id', {
    schema: {
      description: 'Get a specific project by ID',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeStats: { type: 'boolean', default: true },
          includeRelated: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: projectResponseSchema
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
  }, async (request: FastifyRequest<GetProjectRequest>, reply: FastifyReply) => {
    try {
      const { includeStats = true, includeRelated = false } = request.query
      const result = await projectService.getProjectById(
        request.params.id,
        includeStats,
        includeRelated
      )

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to get project')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /projects - Create a new project
   */
  fastify.post<CreateProjectRequest>('/projects', {
    schema: {
      description: 'Create a new project',
      tags: ['Projects'],
      body: projectCreateSchema,
      querystring: {
        type: 'object',
        properties: {
          createCapTable: { type: 'boolean', default: true }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                project: projectResponseSchema,
                capTable: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                },
                validation: {
                  type: 'object',
                  properties: {
                    isValid: { type: 'boolean' },
                    warnings: { type: 'array' }
                  }
                }
              }
            }
          }
        },
        400: {
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
  }, async (request: FastifyRequest<CreateProjectRequest>, reply: FastifyReply) => {
    try {
      const { createCapTable = true } = request.query
      const result = await projectService.createProject(request.body, createCapTable)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create project')
      return reply.status(500).send({
        error: {
          message: 'Failed to create project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /projects/:id - Update a project
   */
  fastify.put<UpdateProjectRequest>('/projects/:id', {
    schema: {
      description: 'Update a project',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: projectUpdateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: projectResponseSchema
          }
        },
        400: {
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
  }, async (request: FastifyRequest<UpdateProjectRequest>, reply: FastifyReply) => {
    try {
      const result = await projectService.updateProject(request.params.id, request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id, body: request.body }, 'Failed to update project')
      return reply.status(500).send({
        error: {
          message: 'Failed to update project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * DELETE /projects/:id - Delete a project
   */
  fastify.delete<{ Params: { id: string } }>('/projects/:id', {
    schema: {
      description: 'Delete a project',
      tags: ['Projects'],
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
            success: { type: 'boolean' },
            data: { type: 'boolean' }
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await projectService.deleteProject(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to delete project')
      return reply.status(500).send({
        error: {
          message: 'Failed to delete project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /projects/primary - Get the primary project
   */
  fastify.get('/projects/primary', {
    schema: {
      description: 'Get the primary project',
      tags: ['Projects'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { anyOf: [projectResponseSchema, { type: 'null' }] }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await projectService.getPrimaryProject()
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get primary project')
      return reply.status(500).send({
        error: {
          message: 'Failed to get primary project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /projects/:id/primary - Set project as primary
   */
  fastify.put<SetPrimaryProjectRequest>('/projects/:id/primary', {
    schema: {
      description: 'Set a project as primary',
      tags: ['Projects'],
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
            success: { type: 'boolean' },
            data: projectResponseSchema
          }
        }
      }
    }
  }, async (request: FastifyRequest<SetPrimaryProjectRequest>, reply: FastifyReply) => {
    try {
      const result = await projectService.setPrimaryProject(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to set primary project')
      return reply.status(500).send({
        error: {
          message: 'Failed to set primary project',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /projects/statistics/:id - Get project statistics
   */
  fastify.get<{ Params: { id: string } }>('/projects/statistics/:id', {
    schema: {
      description: 'Get project statistics',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await projectService.getProjectStatistics(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to get project statistics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get project statistics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /projects/bulk-update - Bulk update projects
   */
  fastify.put<BulkUpdateRequest>('/projects/bulk-update', {
    schema: {
      description: 'Bulk update multiple projects',
      tags: ['Projects'],
      body: {
        type: 'object',
        required: ['projectIds', 'updates'],
        properties: {
          projectIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          },
          updates: projectUpdateSchema,
          options: {
            type: 'object',
            properties: {
              validateBeforeUpdate: { type: 'boolean', default: true },
              createAuditLog: { type: 'boolean', default: true }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<BulkUpdateRequest>, reply: FastifyReply) => {
    try {
      const result = await projectService.bulkUpdateProjects(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to bulk update projects')
      return reply.status(500).send({
        error: {
          message: 'Failed to bulk update projects',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /projects/compliance/summary - Get compliance summary
   */
  fastify.get('/projects/compliance/summary', {
    schema: {
      description: 'Get compliance summary for all projects',
      tags: ['Projects', 'Compliance']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await projectService.getComplianceSummary()

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get compliance summary')
      return reply.status(500).send({
        error: {
          message: 'Failed to get compliance summary',
          statusCode: 500
        }
      })
    }
  })

  /**
   * Analytics Routes
   */

  /**
   * GET /projects/:id/analytics - Get project analytics
   */
  fastify.get<GetAnalyticsRequest>('/projects/:id/analytics', {
    schema: {
      description: 'Get comprehensive analytics for a project',
      tags: ['Projects', 'Analytics'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<GetAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getProjectAnalytics(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to get project analytics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get project analytics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /projects/:id/audit-trail - Get project audit trail
   */
  fastify.get<GetAuditTrailRequest>('/projects/:id/audit-trail', {
    schema: {
      description: 'Get audit trail for a project',
      tags: ['Projects', 'Audit'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest<GetAuditTrailRequest>, reply: FastifyReply) => {
    try {
      const { limit = 100, offset = 0 } = request.query
      const result = await analyticsService.getProjectAuditTrail(
        request.params.id,
        limit,
        offset
      )

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, projectId: request.params.id }, 'Failed to get project audit trail')
      return reply.status(500).send({
        error: {
          message: 'Failed to get project audit trail',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /projects/export - Export projects
   */
  fastify.post<ExportProjectsRequest>('/projects/export', {
    schema: {
      description: 'Export projects in various formats',
      tags: ['Projects', 'Export'],
      body: {
        type: 'object',
        required: ['format', 'fields'],
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'pdf', 'json'] },
          fields: { type: 'array', items: { type: 'string' } },
          includeStatistics: { type: 'boolean', default: false },
          includeCompliance: { type: 'boolean', default: false },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<ExportProjectsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.exportProjects(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      // Set appropriate headers for file download
      const { format } = request.body
      const contentType = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        json: 'application/json'
      }[format] || 'application/octet-stream'

      const filename = `projects-export-${new Date().toISOString().split('T')[0]}.${format}`

      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(result.data)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export projects')
      return reply.status(500).send({
        error: {
          message: 'Failed to export projects',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /projects/import - Import projects
   */
  fastify.post<ImportProjectsRequest>('/projects/import', {
    schema: {
      description: 'Import projects from data',
      tags: ['Projects', 'Import'],
      body: {
        type: 'object',
        required: ['projects'],
        properties: {
          projects: {
            type: 'array',
            items: projectCreateSchema
          },
          options: {
            type: 'object',
            properties: {
              skipValidation: { type: 'boolean', default: false },
              createCapTables: { type: 'boolean', default: true },
              setAsPrimary: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<ImportProjectsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.importProjects(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ error: { message: result.error, statusCode: result.statusCode } })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to import projects')
      return reply.status(500).send({
        error: {
          message: 'Failed to import projects',
          statusCode: 500
        }
      })
    }
  })
}

export default projectRoutes
