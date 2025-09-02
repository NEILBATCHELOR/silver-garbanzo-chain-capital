/**
 * Document Routes
 * API endpoints for document management operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { DocumentService } from '../services/documents/DocumentService'
import { DocumentValidationService } from '../services/documents/DocumentValidationService'
import { DocumentAnalyticsService } from '../services/documents/DocumentAnalyticsService'
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentQueryOptions,
  BulkDocumentUpdateRequest,
  DocumentExportOptions,
  CreateDocumentVersionRequest,
  DocumentApprovalRequest,
  CreateWorkflowRequest,
  UpdateWorkflowRequest
} from '../types/document-service'

/**
 * Request/Response Types for API endpoints
 */
interface CreateDocumentApiRequest {
  Body: CreateDocumentRequest
}

interface UpdateDocumentApiRequest {
  Body: UpdateDocumentRequest
  Params: {
    id: string
  }
}

interface GetDocumentRequest {
  Params: {
    id: string
  }
  Querystring: {
    include_versions?: boolean
    include_approvals?: boolean
    include_workflow?: boolean
  }
}

interface GetDocumentsRequest {
  Querystring: DocumentQueryOptions
}

interface DeleteDocumentRequest {
  Params: {
    id: string
  }
}

interface BulkUpdateRequest {
  Body: BulkDocumentUpdateRequest
}

interface CreateVersionRequest {
  Body: CreateDocumentVersionRequest
}

interface GetVersionsRequest {
  Params: {
    documentId: string
  }
}

interface CreateApprovalRequest {
  Body: DocumentApprovalRequest
}

interface CreateWorkflowApiRequest {
  Body: CreateWorkflowRequest
}

interface UpdateWorkflowApiRequest {
  Body: UpdateWorkflowRequest
  Params: {
    id: string
  }
}

interface GetStatisticsRequest {
  Querystring: DocumentQueryOptions
}

interface GetAnalyticsRequest {
  Querystring: DocumentQueryOptions
}

interface GetCompletionMetricsRequest {
  Params: {
    entityType: string
    entityId: string
  }
}

interface ExportDocumentsRequest {
  Body: DocumentExportOptions
}

interface GetAuditTrailRequest {
  Params: {
    documentId: string
  }
  Querystring: {
    limit?: number
  }
}

/**
 * Document Routes Plugin
 */
export async function documentRoutes(fastify: FastifyInstance) {
  const documentService = new DocumentService()
  const validationService = new DocumentValidationService()
  const analyticsService = new DocumentAnalyticsService()

  // Schema definitions for validation
  const documentCreateSchema = {
    type: 'object',
    required: ['name', 'type', 'entity_id', 'entity_type'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      type: { type: 'string', minLength: 1 },
      entity_id: { type: 'string', format: 'uuid' },
      entity_type: { type: 'string', enum: ['project', 'investor', 'issuer', 'user', 'organization', 'token'] },
      file_path: { type: 'string' },
      file_url: { type: 'string', format: 'uri' },
      metadata: { type: 'object' },
      category: { type: 'string', enum: ['compliance', 'legal', 'financial', 'technical', 'operational', 'general'] },
      project_id: { type: 'string', format: 'uuid' },
      uploaded_by: { type: 'string', format: 'uuid' },
      expiry_date: { type: 'string', format: 'date-time' },
      workflow_stage_id: { type: 'string' }
    }
  }

  const documentUpdateSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      type: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'expired'] },
      file_path: { type: 'string' },
      file_url: { type: 'string', format: 'uri' },
      metadata: { type: 'object' },
      category: { type: 'string', enum: ['compliance', 'legal', 'financial', 'technical', 'operational', 'general'] },
      expiry_date: { type: 'string', format: 'date-time' },
      workflow_stage_id: { type: 'string' },
      version: { type: 'integer', minimum: 1 }
    }
  }

  const documentResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'string' },
      status: { type: 'string' },
      entity_type: { type: 'string' },
      entity_id: { type: 'string' },
      file_url: { type: 'string' },
      file_path: { type: 'string' },
      category: { type: 'string' },
      version: { type: 'integer' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
      expiry_date: { type: 'string' }
    }
  }

  const documentVersionSchema = {
    type: 'object',
    required: ['document_id'],
    properties: {
      document_id: { type: 'string', format: 'uuid' },
      file_path: { type: 'string' },
      file_url: { type: 'string', format: 'uri' },
      uploaded_by: { type: 'string', format: 'uuid' },
      metadata: { type: 'object' }
    }
  }

  const documentApprovalSchema = {
    type: 'object',
    required: ['document_id', 'approver_id', 'status'],
    properties: {
      document_id: { type: 'string', format: 'uuid' },
      approver_id: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['approved', 'rejected', 'pending'] },
      comments: { type: 'string' }
    }
  }

  const documentWorkflowSchema = {
    type: 'object',
    required: ['document_id', 'required_signers', 'created_by'],
    properties: {
      document_id: { type: 'string', format: 'uuid' },
      required_signers: { type: 'array', items: { type: 'string', format: 'uuid' } },
      deadline: { type: 'string', format: 'date-time' },
      metadata: { type: 'object' },
      created_by: { type: 'string', format: 'uuid' }
    }
  }

  // Routes

  /**
   * GET /documents - Get all documents with filtering and pagination
   */
  fastify.get<GetDocumentsRequest>('/documents', {
    schema: {
      description: 'Get all documents with optional filtering and pagination',
      tags: ['Documents'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'array', items: { type: 'string' } },
          type: { type: 'array', items: { type: 'string' } },
          category: { type: 'array', items: { type: 'string' } },
          entity_type: { type: 'array', items: { type: 'string' } },
          entity_id: { type: 'array', items: { type: 'string' } },
          project_id: { type: 'array', items: { type: 'string' } },
          uploaded_by: { type: 'array', items: { type: 'string' } },
          created_after: { type: 'string', format: 'date-time' },
          created_before: { type: 'string', format: 'date-time' },
          expires_after: { type: 'string', format: 'date-time' },
          expires_before: { type: 'string', format: 'date-time' },
          sortBy: { type: 'string', default: 'updated_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          include_versions: { type: 'boolean', default: false },
          include_approvals: { type: 'boolean', default: false },
          include_workflow: { type: 'boolean', default: false },
          include_stats: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: documentResponseSchema
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
  }, async (request: FastifyRequest<GetDocumentsRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.listDocuments(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get documents')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve documents',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /documents/:id - Get a specific document by ID
   */
  fastify.get<GetDocumentRequest>('/documents/:id', {
    schema: {
      description: 'Get a specific document by ID',
      tags: ['Documents'],
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
          include_versions: { type: 'boolean', default: false },
          include_approvals: { type: 'boolean', default: false },
          include_workflow: { type: 'boolean', default: false }
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
                document: documentResponseSchema,
                versions: { type: 'array' },
                approvals: { type: 'array' },
                workflow: { type: 'object' }
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
  }, async (request: FastifyRequest<GetDocumentRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.getDocument(request.params.id, request.query)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, documentId: request.params.id }, 'Failed to get document')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve document',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /documents - Create a new document
   */
  fastify.post<CreateDocumentApiRequest>('/documents', {
    schema: {
      description: 'Create a new document',
      tags: ['Documents'],
      body: documentCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                document: documentResponseSchema,
                versions: { type: 'array' },
                approvals: { type: 'array' },
                workflow: { type: 'object' }
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
  }, async (request: FastifyRequest<CreateDocumentApiRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.createDocument(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create document')
      return reply.status(500).send({
        error: {
          message: 'Failed to create document',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /documents/:id - Update a document
   */
  fastify.put<UpdateDocumentApiRequest>('/documents/:id', {
    schema: {
      description: 'Update a document',
      tags: ['Documents'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: documentUpdateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: documentResponseSchema
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
  }, async (request: FastifyRequest<UpdateDocumentApiRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.updateDocument(request.params.id, request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, documentId: request.params.id, body: request.body }, 'Failed to update document')
      return reply.status(500).send({
        error: {
          message: 'Failed to update document',
          statusCode: 500
        }
      })
    }
  })

  /**
   * DELETE /documents/:id - Delete a document
   */
  fastify.delete<DeleteDocumentRequest>('/documents/:id', {
    schema: {
      description: 'Delete a document (cascades to versions, approvals, workflows)',
      tags: ['Documents'],
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
  }, async (request: FastifyRequest<DeleteDocumentRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.deleteDocument(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, documentId: request.params.id }, 'Failed to delete document')
      return reply.status(500).send({
        error: {
          message: 'Failed to delete document',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /documents/bulk-update - Bulk update documents
   */
  fastify.put<BulkUpdateRequest>('/documents/bulk-update', {
    schema: {
      description: 'Bulk update multiple documents',
      tags: ['Documents'],
      body: {
        type: 'object',
        required: ['document_ids', 'updates'],
        properties: {
          document_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          },
          updates: documentUpdateSchema,
          updated_by: { type: 'string', format: 'uuid' }
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
                updated: { type: 'number' },
                failed: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<BulkUpdateRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.bulkUpdateDocuments(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to bulk update documents')
      return reply.status(500).send({
        error: {
          message: 'Failed to bulk update documents',
          statusCode: 500
        }
      })
    }
  })

  // === Version Management Routes ===

  /**
   * POST /documents/versions - Create a new document version
   */
  fastify.post<CreateVersionRequest>('/documents/versions', {
    schema: {
      description: 'Create a new version of a document',
      tags: ['Documents', 'Versions'],
      body: documentVersionSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                document_id: { type: 'string' },
                version_number: { type: 'integer' },
                file_url: { type: 'string' },
                created_at: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateVersionRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.createDocumentVersion(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create document version')
      return reply.status(500).send({
        error: {
          message: 'Failed to create document version',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /documents/:documentId/versions - Get all versions for a document
   */
  fastify.get<GetVersionsRequest>('/documents/:documentId/versions', {
    schema: {
      description: 'Get all versions for a document',
      tags: ['Documents', 'Versions'],
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
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
                  id: { type: 'string' },
                  version_number: { type: 'integer' },
                  file_url: { type: 'string' },
                  uploaded_by: { type: 'string' },
                  created_at: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetVersionsRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.getDocumentVersions(request.params.documentId)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, documentId: request.params.documentId }, 'Failed to get document versions')
      return reply.status(500).send({
        error: {
          message: 'Failed to get document versions',
          statusCode: 500
        }
      })
    }
  })

  // === Approval Management Routes ===

  /**
   * POST /documents/approvals - Create document approval
   */
  fastify.post<CreateApprovalRequest>('/documents/approvals', {
    schema: {
      description: 'Create a document approval',
      tags: ['Documents', 'Approvals'],
      body: documentApprovalSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                document_id: { type: 'string' },
                approver_id: { type: 'string' },
                status: { type: 'string' },
                comments: { type: 'string' },
                created_at: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateApprovalRequest>, reply: FastifyReply) => {
    try {
      const result = await documentService.createDocumentApproval(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create document approval')
      return reply.status(500).send({
        error: {
          message: 'Failed to create document approval',
          statusCode: 500
        }
      })
    }
  })

  // === Analytics Routes ===

  /**
   * GET /documents/statistics - Get document statistics
   */
  fastify.get<GetStatisticsRequest>('/documents/statistics', {
    schema: {
      description: 'Get comprehensive document statistics',
      tags: ['Documents', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'array', items: { type: 'string' } },
          type: { type: 'array', items: { type: 'string' } },
          entity_type: { type: 'array', items: { type: 'string' } },
          created_after: { type: 'string', format: 'date-time' },
          created_before: { type: 'string', format: 'date-time' }
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
                total_documents: { type: 'number' },
                by_status: { type: 'object' },
                by_type: { type: 'object' },
                by_category: { type: 'object' },
                by_entity_type: { type: 'object' },
                expired_count: { type: 'number' },
                expiring_soon_count: { type: 'number' },
                pending_approvals: { type: 'number' },
                total_versions: { type: 'number' },
                storage_used: { type: 'number' },
                average_approval_time: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetStatisticsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getDocumentStatistics(request.query)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get document statistics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get document statistics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /documents/analytics - Get comprehensive document analytics
   */
  fastify.get<GetAnalyticsRequest>('/documents/analytics', {
    schema: {
      description: 'Get comprehensive document analytics with trends',
      tags: ['Documents', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'array', items: { type: 'string' } },
          type: { type: 'array', items: { type: 'string' } },
          entity_type: { type: 'array', items: { type: 'string' } },
          created_after: { type: 'string', format: 'date-time' },
          created_before: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request: FastifyRequest<GetAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getDocumentAnalytics(request.query)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get document analytics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get document analytics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /documents/completion/:entityType/:entityId - Get completion metrics for entity
   */
  fastify.get<GetCompletionMetricsRequest>('/documents/completion/:entityType/:entityId', {
    schema: {
      description: 'Get document completion metrics for an entity',
      tags: ['Documents', 'Analytics'],
      params: {
        type: 'object',
        required: ['entityType', 'entityId'],
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<GetCompletionMetricsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getDocumentCompletionMetrics(
        request.params.entityType, 
        request.params.entityId
      )

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, params: request.params }, 'Failed to get completion metrics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get completion metrics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /documents/export - Export documents
   */
  fastify.post<ExportDocumentsRequest>('/documents/export', {
    schema: {
      description: 'Export documents in various formats',
      tags: ['Documents', 'Export'],
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'pdf', 'json'] },
          filters: {
            type: 'object',
            properties: {
              status: { type: 'array', items: { type: 'string' } },
              type: { type: 'array', items: { type: 'string' } },
              entity_type: { type: 'array', items: { type: 'string' } }
            }
          },
          include_metadata: { type: 'boolean', default: false },
          include_versions: { type: 'boolean', default: false },
          include_approvals: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<ExportDocumentsRequest>, reply: FastifyReply) => {
    try {
      const result = await analyticsService.exportDocuments(request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      // Set appropriate headers for file download
      const { format } = request.body
      const contentType = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        json: 'application/json'
      }[format] || 'application/octet-stream'

      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${result.data!.filename}"`)
      
      return reply.send(result.data!.data)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export documents')
      return reply.status(500).send({
        error: {
          message: 'Failed to export documents',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /documents/:documentId/audit-trail - Get document audit trail
   */
  fastify.get<GetAuditTrailRequest>('/documents/:documentId/audit-trail', {
    schema: {
      description: 'Get audit trail for a document',
      tags: ['Documents', 'Audit'],
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 50 }
        }
      }
    }
  }, async (request: FastifyRequest<GetAuditTrailRequest>, reply: FastifyReply) => {
    try {
      const { limit = 50 } = request.query
      const result = await analyticsService.getDocumentAuditTrail(
        request.params.documentId,
        limit
      )

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { message: result.error, statusCode: result.statusCode } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, documentId: request.params.documentId }, 'Failed to get audit trail')
      return reply.status(500).send({
        error: {
          message: 'Failed to get document audit trail',
          statusCode: 500
        }
      })
    }
  })
}

export default documentRoutes
