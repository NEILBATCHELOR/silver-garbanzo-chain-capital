/**
 * Rule Routes
 * API endpoints for rule operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { RuleService } from '../services/rules/RuleService'
import { RuleValidationService } from '../services/rules/RuleValidationService'
import { RuleAnalyticsService } from '../services/rules/RuleAnalyticsService'
import type {
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleQueryOptions,
  RuleExportOptions
} from '../types/rule-service'

/**
 * Request/Response Types for API endpoints
 */
interface CreateRuleRequestType {
  Body: CreateRuleRequest
}

interface UpdateRuleRequestType {
  Body: UpdateRuleRequest
  Params: {
    id: string
  }
}

interface GetRuleRequestType {
  Params: {
    id: string
  }
}

interface GetRulesRequestType {
  Querystring: RuleQueryOptions
}

interface GetRulesByTypeRequestType {
  Params: {
    type: string
  }
}

interface ExportRulesRequestType {
  Body: RuleExportOptions
}

interface ValidateRuleRequestType {
  Params: {
    id: string
  }
  Body: {
    rule_details: Record<string, any>
  }
}

/**
 * Rule Routes Plugin
 */
export async function ruleRoutes(fastify: FastifyInstance) {
  const ruleService = new RuleService()
  const validationService = new RuleValidationService()
  const analyticsService = new RuleAnalyticsService()

  // Schema definitions for validation
  const ruleCreateSchema = {
    type: 'object',
    required: ['rule_name', 'rule_type'],
    properties: {
      rule_name: { type: 'string', minLength: 1, maxLength: 255 },
      rule_type: { 
        type: 'string',
        enum: [
          'kyc_verification',
          'aml_sanctions',
          'accredited_investor',
          'lockup_period',
          'transfer_limit',
          'velocity_limit',
          'volume_supply_limit',
          'whitelist_transfer',
          'investor_position_limit',
          'investor_transaction_limit',
          'risk_profile',
          'redemption',
          'standard_redemption',
          'interval_fund_redemption',
          'tokenized_fund'
        ]
      },
      rule_details: { type: 'object' },
      status: { 
        type: 'string', 
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'active'
      },
      is_template: { type: 'boolean', default: false }
    }
  }

  const ruleUpdateSchema = {
    type: 'object',
    properties: {
      rule_name: { type: 'string', minLength: 1, maxLength: 255 },
      rule_type: { 
        type: 'string',
        enum: [
          'kyc_verification',
          'aml_sanctions',
          'accredited_investor',
          'lockup_period',
          'transfer_limit',
          'velocity_limit',
          'volume_supply_limit',
          'whitelist_transfer',
          'investor_position_limit',
          'investor_transaction_limit',
          'risk_profile',
          'redemption',
          'standard_redemption',
          'interval_fund_redemption',
          'tokenized_fund'
        ]
      },
      rule_details: { type: 'object' },
      status: { 
        type: 'string', 
        enum: ['active', 'inactive', 'draft', 'archived']
      },
      is_template: { type: 'boolean' }
    }
  }

  const ruleResponseSchema = {
    type: 'object',
    properties: {
      rule_id: { type: 'string' },
      rule_name: { type: 'string' },
      rule_type: { type: 'string' },
      rule_details: { type: 'object' },
      created_by: { type: 'string' },
      status: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
      is_template: { type: 'boolean' }
    }
  }

  // Routes

  /**
   * GET /rules - Get all rules with filtering and pagination
   */
  fastify.get<GetRulesRequestType>('/rules', {
    schema: {
      description: `
# Business Rules Management

Retrieve all business rules with comprehensive filtering, pagination, and advanced search capabilities.

## Features
- **Rule Library** - Complete library of business rules and validation logic
- **Advanced Filtering** - Filter by rule type, status, template flag, and creation date
- **Intelligent Search** - Full-text search across rule names and descriptions
- **Smart Pagination** - Efficient pagination with configurable limits
- **Template System** - Distinguish between rule templates and active rules

## Rule Categories
- **KYC Verification** - Customer identity verification and document validation rules
- **AML Sanctions** - Anti-money laundering and sanctions screening rules
- **Accredited Investor** - Investor accreditation and eligibility validation
- **Transfer Restrictions** - Asset transfer limitations and whitelist controls
- **Position Limits** - Investor position and transaction size limitations
- **Risk Profiling** - Risk assessment and suitability rules
- **Redemption Rules** - Investment redemption and withdrawal policies

## Validation Engine
- Real-time rule evaluation with high-performance processing
- Complex conditional logic support with nested rule sets
- Dynamic rule parameters with context-aware validation
- Rule dependency management and conflict resolution
- Comprehensive audit trail for rule execution history

## Business Rules
- Active rules are automatically applied to relevant transactions
- Template rules serve as blueprints for creating organization-specific rules
- Rule execution order follows priority and dependency chains
- Failed rule validation prevents transaction completion
- Rule modifications require approval workflow for sensitive types
`,
      tags: ['Rules'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          rule_type: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft', 'archived'] },
          is_template: { type: 'boolean' },
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
              items: ruleResponseSchema
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
  }, async (request: FastifyRequest<GetRulesRequestType>, reply: FastifyReply) => {
    try {
      const result = await ruleService.listRules(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get rules')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve rules',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /rules/:id - Get a specific rule by ID
   */
  fastify.get<GetRuleRequestType>('/rules/:id', {
    schema: {
      description: 'Get a specific rule by ID',
      tags: ['Rules'],
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
            data: ruleResponseSchema
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
  }, async (request: FastifyRequest<GetRuleRequestType>, reply: FastifyReply) => {
    try {
      const result = await ruleService.getRuleById(request.params.id)

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
      fastify.log.error({ error, ruleId: request.params.id }, 'Failed to get rule')
      return reply.status(500).send({
        error: {
          message: 'Failed to retrieve rule',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /rules - Create a new rule
   */
  fastify.post<CreateRuleRequestType>('/rules', {
    schema: {
      description: `
# Create Business Rule

Create a new business rule with comprehensive validation, type-specific logic, and audit trail.

## Features
- **Rule Creation** - Create custom business rules with complex conditional logic
- **Type-Specific Validation** - Automatic validation based on selected rule type
- **JSON Schema Validation** - Ensure rule details conform to expected structure
- **Template Support** - Create reusable rule templates for organization-wide use
- **Immediate Activation** - Rules can be activated immediately or scheduled for later

## Rule Types Supported
- **KYC Verification** - Identity document validation, address verification, enhanced due diligence
- **AML Sanctions** - OFAC screening, PEP checks, adverse media monitoring
- **Accredited Investor** - Income verification, net worth validation, sophistication assessment
- **Transfer Restrictions** - Lockup periods, whitelist validation, geographic restrictions
- **Position Limits** - Maximum holdings, concentration limits, exposure controls
- **Risk Profiling** - Suitability assessment, risk tolerance validation, investment experience

## Rule Logic Structure
- **Conditions** - Define when rule should be evaluated (triggers, contexts)
- **Validation Logic** - Core rule logic with AND/OR conditions and nested rules
- **Actions** - Define outcomes for rule success/failure (approve, reject, require review)
- **Parameters** - Configurable values for thresholds, limits, and criteria
- **Dependencies** - Reference other rules that must be evaluated first

## Business Rules
- Rule names must be unique within the organization
- Rule details must conform to type-specific JSON schema
- Active rules are immediately available for transaction validation
- Template rules can be copied and customized by other users
- Rule creation triggers approval workflow for compliance-sensitive types
`,
      tags: ['Rules'],
      body: ruleCreateSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: ruleResponseSchema
          }
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                statusCode: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<CreateRuleRequestType>, reply: FastifyReply) => {
    try {
      // TODO: Get actual user ID from authentication
      const createdBy = 'system' // request.user?.id || 'system'

      // Validate the request
      const validation = await validationService.validateCreateRequest(request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await ruleService.createRule(request.body, createdBy)

      if (!result.success) {
        return reply.status(result.statusCode || 500).send({ 
          error: { 
            message: result.error, 
            code: result.code,
            statusCode: result.statusCode 
          } 
        })
      }

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create rule')
      return reply.status(500).send({
        error: {
          message: 'Failed to create rule',
          statusCode: 500
        }
      })
    }
  })

  /**
   * PUT /rules/:id - Update a rule
   */
  fastify.put<UpdateRuleRequestType>('/rules/:id', {
    schema: {
      description: 'Update a rule',
      tags: ['Rules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: ruleUpdateSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: ruleResponseSchema
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
  }, async (request: FastifyRequest<UpdateRuleRequestType>, reply: FastifyReply) => {
    try {
      // Validate the update request
      const validation = await validationService.validateUpdateRequest(request.params.id, request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          }
        })
      }

      const result = await ruleService.updateRule(request.params.id, request.body)

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
      fastify.log.error({ error, ruleId: request.params.id, body: request.body }, 'Failed to update rule')
      return reply.status(500).send({
        error: {
          message: 'Failed to update rule',
          statusCode: 500
        }
      })
    }
  })

  /**
   * DELETE /rules/:id - Delete a rule
   */
  fastify.delete<{ Params: { id: string } }>('/rules/:id', {
    schema: {
      description: 'Delete a rule',
      tags: ['Rules'],
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
      const result = await ruleService.deleteRule(request.params.id)

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
      fastify.log.error({ error, ruleId: request.params.id }, 'Failed to delete rule')
      return reply.status(500).send({
        error: {
          message: 'Failed to delete rule',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /rules/type/:type - Get rules by type
   */
  fastify.get<GetRulesByTypeRequestType>('/rules/type/:type', {
    schema: {
      description: 'Get rules by type',
      tags: ['Rules'],
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
              items: ruleResponseSchema
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<GetRulesByTypeRequestType>, reply: FastifyReply) => {
    try {
      const result = await ruleService.getRulesByType(request.params.type)

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
      fastify.log.error({ error, ruleType: request.params.type }, 'Failed to get rules by type')
      return reply.status(500).send({
        error: {
          message: 'Failed to get rules by type',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /rules/templates - Get rule templates
   */
  fastify.get('/rules/templates', {
    schema: {
      description: 'Get rule templates',
      tags: ['Rules'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: ruleResponseSchema
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await ruleService.getRuleTemplates()

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
      fastify.log.error({ error }, 'Failed to get rule templates')
      return reply.status(500).send({
        error: {
          message: 'Failed to get rule templates',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /rules/:id/validate - Validate rule details
   */
  fastify.post<ValidateRuleRequestType>('/rules/:id/validate', {
    schema: {
      description: 'Validate rule details for a specific rule type',
      tags: ['Rules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['rule_details'],
        properties: {
          rule_details: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest<ValidateRuleRequestType>, reply: FastifyReply) => {
    try {
      // First get the rule to know its type
      const rule = await ruleService.getRuleById(request.params.id)
      if (!rule.success) {
        return reply.status(404).send({
          error: {
            message: 'Rule not found',
            statusCode: 404
          }
        })
      }

      const validation = await validationService.validateRuleDetails(
        rule.data!.rule_type, 
        request.body.rule_details
      )

      return reply.send({
        success: true,
        data: validation
      })
    } catch (error) {
      fastify.log.error({ error, ruleId: request.params.id }, 'Failed to validate rule')
      return reply.status(500).send({
        error: {
          message: 'Failed to validate rule',
          statusCode: 500
        }
      })
    }
  })

  /**
   * Analytics Routes
   */

  /**
   * GET /rules/analytics - Get rule analytics
   */
  fastify.get('/rules/analytics', {
    schema: {
      description: 'Get comprehensive rule analytics',
      tags: ['Rules', 'Analytics']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getRuleAnalytics()

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
      fastify.log.error({ error }, 'Failed to get rule analytics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get rule analytics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /rules/analytics/usage - Get rule usage metrics
   */
  fastify.get('/rules/analytics/usage', {
    schema: {
      description: 'Get rule usage metrics',
      tags: ['Rules', 'Analytics']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getRuleUsageMetrics()

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
      fastify.log.error({ error }, 'Failed to get rule usage metrics')
      return reply.status(500).send({
        error: {
          message: 'Failed to get rule usage metrics',
          statusCode: 500
        }
      })
    }
  })

  /**
   * GET /rules/analytics/trends - Get rule trends
   */
  fastify.get<{ Querystring: { days?: number } }>('/rules/analytics/trends', {
    schema: {
      description: 'Get rule trends over time',
      tags: ['Rules', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { days?: number } }>, reply: FastifyReply) => {
    try {
      const { days = 30 } = request.query
      const result = await analyticsService.getRuleTrends(days)

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
      fastify.log.error({ error }, 'Failed to get rule trends')
      return reply.status(500).send({
        error: {
          message: 'Failed to get rule trends',
          statusCode: 500
        }
      })
    }
  })

  /**
   * POST /rules/export - Export rules
   */
  fastify.post<ExportRulesRequestType>('/rules/export', {
    schema: {
      description: 'Export rules in various formats',
      tags: ['Rules', 'Export'],
      body: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
          includeInactive: { type: 'boolean', default: false },
          ruleTypes: { type: 'array', items: { type: 'string' } },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request: FastifyRequest<ExportRulesRequestType>, reply: FastifyReply) => {
    try {
      // Convert string dates to Date objects for service
      const exportOptions = {
        ...request.body,
        dateFrom: request.body.dateFrom ? new Date(request.body.dateFrom) : undefined,
        dateTo: request.body.dateTo ? new Date(request.body.dateTo) : undefined
      }
      
      const result = await analyticsService.exportRules(exportOptions)

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

      const filename = `rules-export-${new Date().toISOString().split('T')[0]}.${format}`

      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return reply.send(result.data)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export rules')
      return reply.status(500).send({
        error: {
          message: 'Failed to export rules',
          statusCode: 500
        }
      })
    }
  })
}

export default ruleRoutes
