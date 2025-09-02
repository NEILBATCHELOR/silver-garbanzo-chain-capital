/**
 * Policy Routes
 * API endpoints for policy template and approval configuration operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PolicyService } from '../services/policy/PolicyService'
import { PolicyValidationService } from '../services/policy/PolicyValidationService'
import { PolicyAnalyticsService } from '../services/policy/PolicyAnalyticsService'
import type {
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateQueryOptions,
  CreateApprovalConfigRequest,
  UpdateApprovalConfigRequest,
  PolicyExportOptions
} from '../types/policy-service'

/**
 * Request/Response Types for API endpoints
 */
interface CreatePolicyTemplateRequestType {
  Body: CreatePolicyTemplateRequest
}

interface UpdatePolicyTemplateRequestType {
  Body: UpdatePolicyTemplateRequest
  Params: {
    id: string
  }
}

interface GetPolicyTemplateRequestType {
  Params: {
    id: string
  }
}

interface GetPolicyTemplatesRequestType {
  Querystring: PolicyTemplateQueryOptions
}

interface GetPolicyTemplatesByTypeRequestType {
  Params: {
    type: string
  }
}

interface CreateApprovalConfigRequestType {
  Body: CreateApprovalConfigRequest
}

interface UpdateApprovalConfigRequestType {
  Body: UpdateApprovalConfigRequest
  Params: {
    id: string
  }
}

interface GetApprovalConfigRequestType {
  Params: {
    id: string
  }
}

interface GetApprovalConfigsByPermissionRequestType {
  Params: {
    permissionId: string
  }
}

interface ExportPolicyDataRequestType {
  Body: PolicyExportOptions
}

/**
 * Policy Routes Plugin
 */
export async function policyRoutes(fastify: FastifyInstance) {
  const policyService = new PolicyService()
  const validationService = new PolicyValidationService()
  const analyticsService = new PolicyAnalyticsService()

  // Schema definitions for validation
  const policyTemplateCreateSchema = {
    type: 'object',
    required: ['template_name', 'template_data'],
    properties: {
      template_name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      template_data: { type: 'object' },
      template_type: { 
        type: 'string',
        enum: ['compliance', 'investment', 'redemption', 'transfer', 'kyc', 'aml', 'approval', 'workflow']
      },
      status: { 
        type: 'string', 
        enum: ['active', 'inactive', 'draft', 'archived', 'published'],
        default: 'draft'
      }
    }
  }

  const policyTemplateUpdateSchema = {
    type: 'object',
    properties: {
      template_name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      template_data: { type: 'object' },
      template_type: { 
        type: 'string',
        enum: ['compliance', 'investment', 'redemption', 'transfer', 'kyc', 'aml', 'approval', 'workflow']
      },
      status: { 
        type: 'string', 
        enum: ['active', 'inactive', 'draft', 'archived', 'published']
      }
    }
  }

  const approvalConfigCreateSchema = {
    type: 'object',
    required: ['permission_id', 'required_approvals', 'eligible_roles', 'consensus_type'],
    properties: {
      permission_id: { type: 'string', format: 'uuid' },
      required_approvals: { type: 'integer', minimum: 1 },
      eligible_roles: { type: 'array', items: { type: 'string' }, minItems: 1 },
      consensus_type: {
        type: 'string',
        enum: ['simple_majority', 'absolute_majority', 'unanimous', 'threshold']
      },
      config_name: { type: 'string', maxLength: 255 },
      config_description: { type: 'string', maxLength: 1000 },
      approval_mode: {
        type: 'string',
        enum: ['sequential', 'parallel', 'mixed']
      },
      requires_all_approvers: { type: 'boolean' },
      auto_approve_threshold: { type: 'integer', minimum: 0, maximum: 100 },
      auto_approval_conditions: { type: 'object' },
      escalation_config: { type: 'object' },
      notification_config: { type: 'object' },
      active: { type: 'boolean', default: true }
    }
  }

  const policyTemplateResponseSchema = {
    type: 'object',
    properties: {
      template_id: { type: 'string' },
      template_name: { type: 'string' },
      description: { type: 'string' },
      template_data: { type: 'object' },
      created_by: { type: 'string' },
      template_type: { type: 'string' },
      status: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' }
    }
  }

  const approvalConfigResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      permission_id: { type: 'string' },
      required_approvals: { type: 'integer' },
      eligible_roles: { type: 'array', items: { type: 'string' } },
      consensus_type: { type: 'string' },
      config_name: { type: 'string' },
      config_description: { type: 'string' },
      approval_mode: { type: 'string' },
      active: { type: 'boolean' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' }
    }
  }

  // Policy Template Routes

  /**
   * GET /policy/templates - Get all policy templates
   */
  fastify.get<GetPolicyTemplatesRequestType>('/policy/templates', {
    schema: {
      description: `
# Policy Template Management

Retrieve all policy templates with comprehensive filtering, pagination, and sorting capabilities.

## Features
- **Template Library** - Complete library of pre-built and custom policy templates
- **Advanced Filtering** - Filter by type, status, creator, and custom search terms
- **Intelligent Pagination** - Efficient pagination with configurable page sizes
- **Smart Sorting** - Sort by creation date, usage frequency, or template name
- **Status Management** - Track template lifecycle from draft to published

## Policy Template Types
- **Compliance Templates** - Regulatory compliance policies (KYC, AML, GDPR)
- **Investment Policies** - Investment strategy and allocation templates
- **Redemption Policies** - Investor redemption and withdrawal rules
- **Transfer Policies** - Asset transfer and ownership change policies
- **Approval Workflows** - Multi-stage approval process templates
- **Custom Templates** - Organization-specific policy templates

## Business Rules
- Active templates are available for immediate use
- Draft templates are only visible to creators and administrators
- Published templates have been reviewed and approved
- Archived templates are preserved for audit but hidden from active use
- Template usage statistics help identify most valuable policies
`,
      tags: ['Policy Templates'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          template_type: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft', 'archived', 'published'] },
          search: { type: 'string' },
          created_by: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: policyTemplateResponseSchema
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
  }, async (request: FastifyRequest<GetPolicyTemplatesRequestType>, reply: FastifyReply) => {
    try {
      const result = await policyService.listPolicyTemplates(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get policy templates')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve policy templates',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/templates/:id - Get a specific policy template
   */
  fastify.get<GetPolicyTemplateRequestType>('/policy/templates/:id', {
    schema: {
      description: 'Get a specific policy template by ID',
      tags: ['Policy Templates'],
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
            data: policyTemplateResponseSchema
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
  }, async (request: FastifyRequest<GetPolicyTemplateRequestType>, reply: FastifyReply) => {
    try {
      const result = await policyService.getPolicyTemplateById(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, templateId: request.params.id }, 'Failed to get policy template')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve policy template',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /policy/templates - Create a new policy template
   */
  fastify.post<CreatePolicyTemplateRequestType>('/policy/templates', {
    schema: {
      description: `
# Create Policy Template

Create a new policy template with comprehensive validation and business rule enforcement.

## Features
- **Template Creation** - Create custom policy templates from scratch or based on existing templates
- **Comprehensive Validation** - Validate template structure, required fields, and business logic
- **Type-Specific Fields** - Template fields automatically adapt based on policy type
- **Version Control** - Automatic versioning system for template changes
- **Approval Workflow** - New templates enter approval workflow before publication

## Template Data Structure
- **Policy Rules** - Core policy logic and conditional statements
- **Approval Stages** - Multi-stage approval workflow configuration
- **Notification Settings** - Email and system notification preferences
- **Compliance Requirements** - Regulatory compliance checkpoints
- **Custom Fields** - Organization-specific policy parameters

## Validation Rules
- Template name must be unique within organization
- Template data must conform to selected policy type schema
- Required fields vary by template type (compliance, investment, etc.)
- Business rules are validated for logical consistency
- JSON schema validation ensures data integrity

## Business Rules
- New templates start in 'draft' status by default
- Template creator becomes initial owner and reviewer
- Compliance templates require additional regulatory validation
- Investment templates must specify risk assessment criteria
- Approval templates require minimum threshold definitions
`,
      tags: ['Policy Templates'],
      body: policyTemplateCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: policyTemplateResponseSchema
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
  }, async (request: FastifyRequest<CreatePolicyTemplateRequestType>, reply: FastifyReply) => {
    try {
      // TODO: Get actual user ID from authentication
      const createdBy = 'system' // request.user?.id || 'system'

      // Validate the request
      const validation = await validationService.validateCreatePolicyTemplateRequest(request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await policyService.createPolicyTemplate(request.body, createdBy)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create policy template')
      return reply.status(500).send({
        error: {
          message: 'Failed to create policy template',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /policy/templates/:id - Update a policy template
   */
  fastify.put<UpdatePolicyTemplateRequestType>('/policy/templates/:id', {
    schema: {
      description: 'Update a policy template',
      tags: ['Policy Templates'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: policyTemplateUpdateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: policyTemplateResponseSchema
          }
        }
      }
    }
  }, async (request: FastifyRequest<UpdatePolicyTemplateRequestType>, reply: FastifyReply) => {
    try {
      // Validate the update request
      const validation = await validationService.validateUpdatePolicyTemplateRequest(
        request.params.id, 
        request.body
      )
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await policyService.updatePolicyTemplate(request.params.id, request.body)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, templateId: request.params.id, body: request.body }, 'Failed to update policy template')
      return reply.status(500).send({
        error: {
          message: 'Failed to update policy template',
          statusCode: 500
        }
      })
    }
  })

  /**
   * DELETE /policy/templates/:id - Delete a policy template
   */
  fastify.delete<{ Params: { id: string } }>('/policy/templates/:id', {
    schema: {
      description: 'Delete a policy template',
      tags: ['Policy Templates'],
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
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await policyService.deletePolicyTemplate(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, templateId: request.params.id }, 'Failed to delete policy template')
      return reply.status(500).send({
        error: {
          message: 'Failed to delete policy template',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/templates/type/:type - Get policy templates by type
   */
  fastify.get<GetPolicyTemplatesByTypeRequestType>('/policy/templates/type/:type', {
    schema: {
      description: 'Get policy templates by type',
      tags: ['Policy Templates'],
      params: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: policyTemplateResponseSchema
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetPolicyTemplatesByTypeRequestType>, reply: FastifyReply) => {
    try {
      const result = await policyService.getPolicyTemplatesByType(request.params.type)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, templateType: request.params.type }, 'Failed to get policy templates by type')
      return reply.status(500).send({
        error: {
          message: 'Failed to get policy templates by type',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/templates/published - Get published policy templates
   */
  fastify.get('/policy/templates/published', {
    schema: {
      description: 'Get published policy templates',
      tags: ['Policy Templates'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: policyTemplateResponseSchema
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await policyService.getPublishedPolicyTemplates()

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get published policy templates')
      return reply.status(500).send({
        error: {
          message: 'Failed to get published policy templates',
          statusCode: 500
        }
      })
    }
  })

  // Approval Configuration Routes

  /**
   * POST /policy/approval-configs - Create approval configuration
   */
  fastify.post<CreateApprovalConfigRequestType>('/policy/approval-configs', {
    schema: {
      description: 'Create a new approval configuration',
      tags: ['Approval Configs'],
      body: approvalConfigCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: approvalConfigResponseSchema
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateApprovalConfigRequestType>, reply: FastifyReply) => {
    try {
      // TODO: Get actual user ID from authentication
      const createdBy = 'system' // request.user?.id || 'system'

      // Validate the request
      const validation = await validationService.validateCreateApprovalConfigRequest(request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await policyService.createApprovalConfig(request.body, createdBy)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create approval config')
      return reply.status(500).send({
        error: {
          message: 'Failed to create approval config',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/approval-configs - Get all approval configurations
   */
  fastify.get('/policy/approval-configs', {
    schema: {
      description: 'Get all approval configurations',
      tags: ['Approval Configs'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: approvalConfigResponseSchema
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await policyService.listApprovalConfigs()

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get approval configs')
      return reply.status(500).send({
        error: {
          message: 'Failed to get approval configs',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/approval-configs/:id - Get approval configuration by ID
   */
  fastify.get<GetApprovalConfigRequestType>('/policy/approval-configs/:id', {
    schema: {
      description: 'Get approval configuration by ID',
      tags: ['Approval Configs'],
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
            data: approvalConfigResponseSchema
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetApprovalConfigRequestType>, reply: FastifyReply) => {
    try {
      const result = await policyService.getApprovalConfigById(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, configId: request.params.id }, 'Failed to get approval config')
      return reply.status(500).send({
        error: {
          message: 'Failed to get approval config',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /policy/approval-configs/:id - Update approval configuration
   */
  fastify.put<UpdateApprovalConfigRequestType>('/policy/approval-configs/:id', {
    schema: {
      description: 'Update approval configuration',
      tags: ['Approval Configs'],
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
          required_approvals: { type: 'integer', minimum: 1 },
          eligible_roles: { type: 'array', items: { type: 'string' }, minItems: 1 },
          consensus_type: {
            type: 'string',
            enum: ['simple_majority', 'absolute_majority', 'unanimous', 'threshold']
          },
          config_name: { type: 'string', maxLength: 255 },
          config_description: { type: 'string', maxLength: 1000 },
          approval_mode: {
            type: 'string',
            enum: ['sequential', 'parallel', 'mixed']
          },
          requires_all_approvers: { type: 'boolean' },
          auto_approve_threshold: { type: 'integer', minimum: 0, maximum: 100 },
          auto_approval_conditions: { type: 'object' },
          escalation_config: { type: 'object' },
          notification_config: { type: 'object' },
          active: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest<UpdateApprovalConfigRequestType>, reply: FastifyReply) => {
    try {
      // TODO: Get actual user ID from authentication
      const modifiedBy = 'system' // request.user?.id || 'system'

      // Validate the update request
      const validation = await validationService.validateUpdateApprovalConfigRequest(
        request.params.id, 
        request.body
      )
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await policyService.updateApprovalConfig(request.params.id, request.body, modifiedBy)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, configId: request.params.id, body: request.body }, 'Failed to update approval config')
      return reply.status(500).send({
        error: {
          message: 'Failed to update approval config',
          statusCode: 500
        }
      })
    }
  })

  /**
   * DELETE /policy/approval-configs/:id - Delete approval configuration
   */
  fastify.delete<{ Params: { id: string } }>('/policy/approval-configs/:id', {
    schema: {
      description: 'Delete approval configuration',
      tags: ['Approval Configs'],
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
      const result = await policyService.deleteApprovalConfig(request.params.id)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, configId: request.params.id }, 'Failed to delete approval config')
      return reply.status(500).send({
        error: {
          message: 'Failed to delete approval config',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /policy/approval-configs/permission/:permissionId - Get approval configs by permission
   */
  fastify.get<GetApprovalConfigsByPermissionRequestType>('/policy/approval-configs/permission/:permissionId', {
    schema: {
      description: 'Get approval configurations by permission ID',
      tags: ['Approval Configs'],
      params: {
        type: 'object',
        required: ['permissionId'],
        properties: {
          permissionId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<GetApprovalConfigsByPermissionRequestType>, reply: FastifyReply) => {
    try {
      const result = await policyService.getApprovalConfigsByPermission(request.params.permissionId)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, permissionId: request.params.permissionId }, 'Failed to get approval configs by permission')
      return reply.status(500).send({
        error: {
          message: 'Failed to get approval configs by permission',
          statusCode: 500
        }
      })
    }
  })

  // Analytics Routes

  /**
   * GET /policy/analytics - Get policy analytics
   */
  fastify.get('/policy/analytics', {
    schema: {
      description: 'Get comprehensive policy analytics',
      tags: ['Policy Analytics']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getPolicyAnalytics()

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get policy analytics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get policy analytics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /policy/export - Export policy data
   */
  fastify.post<ExportPolicyDataRequestType>('/policy/export', {
    schema: {
      description: 'Export policy data in various formats',
      tags: ['Policy Export'],
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
          includeInactive: { type: 'boolean', default: false },
          templateTypes: { type: 'array', items: { type: 'string' } },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' },
          includeApprovalConfigs: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<ExportPolicyDataRequestType>, reply: FastifyReply) => {
    try {
      // Convert string dates to Date objects for service
      const exportOptions = {
        ...request.body,
        dateFrom: request.body.dateFrom ? new Date(request.body.dateFrom) : undefined,
        dateTo: request.body.dateTo ? new Date(request.body.dateTo) : undefined
      }
      
      const result = await analyticsService.exportPolicyData(exportOptions)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            statusCode: result.statusCode 
          } 
        })
      }

      // Set appropriate headers for file download
      const { format } = request.body
      const contentType = {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        json: 'application/json'
      }[format] || 'application/octet-stream'

      const filename = `policy-export-${new Date().toISOString().split('T')[0]}.${format}`

      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(result.data)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export policy data')
      return reply.status(500).send({
        error: {
          message: 'Failed to export policy data',
          statusCode: 500
        }
      })
    }
  })
}

export default policyRoutes
