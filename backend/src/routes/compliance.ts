/**
 * Compliance API Routes
 * Provides comprehensive compliance management endpoints with full OpenAPI/Swagger documentation
 * Supports KYC/AML verification, document compliance, organization onboarding, and regulatory reporting
 */

import { FastifyPluginAsync } from 'fastify'
import { ComplianceServiceFactory } from '@/services/compliance/index'
import type {
  ComplianceCheck,
  ComplianceReport,
  KycVerificationRequest,
  DocumentValidationResult,
  KybVerificationRequest,
  ComplianceOnboardingWorkflow
} from '@/services/compliance/index'

const complianceRoutes: FastifyPluginAsync = async (fastify) => {
  const {
    complianceService,
    kycService,
    documentComplianceService,
    organizationComplianceService
  } = ComplianceServiceFactory.getAllServices()

  // Schema definitions for OpenAPI/Swagger
  const complianceCheckSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      investor_id: { type: 'string', format: 'uuid' },
      project_id: { type: 'string', format: 'uuid' },
      risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      risk_reason: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'review_required'] },
      reviewed_by: { type: 'string', format: 'uuid', nullable: true },
      reviewed_at: { type: 'string', format: 'date-time', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  }

  const kycVerificationSchema = {
    type: 'object',
    properties: {
      verification_id: { type: 'string' },
      status: { type: 'string', enum: ['not_started', 'pending', 'approved', 'rejected', 'expired'] },
      verification_score: { type: 'number' },
      risk_score: { type: 'number' },
      verification_data: { type: 'object' },
      required_actions: { type: 'array', items: { type: 'string' } },
      expiry_date: { type: 'string', format: 'date-time', nullable: true }
    }
  }

  const documentValidationSchema = {
    type: 'object',
    properties: {
      document_id: { type: 'string' },
      is_valid: { type: 'boolean' },
      validation_score: { type: 'number' },
      validation_checks: { type: 'array', items: { type: 'object' } },
      extracted_data: { type: 'object' },
      recommendations: { type: 'array', items: { type: 'string' } },
      compliance_gaps: { type: 'array', items: { type: 'object' } }
    }
  }

  const organizationComplianceSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      organization_id: { type: 'string', format: 'uuid' },
      compliance_status: { type: 'string', enum: ['not_started', 'in_progress', 'compliant', 'non_compliant', 'review_required'] },
      kyb_status: { type: 'string', enum: ['not_started', 'pending', 'approved', 'rejected', 'expired'] },
      regulatory_status: { type: 'string', enum: ['unregulated', 'regulated', 'pending_approval', 'exempt'] },
      risk_rating: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      compliance_score: { type: 'number' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  }

  /**
   * GET /api/v1/compliance/dashboard-overview
   * Get compliance dashboard overview
   */
  fastify.get('/dashboard-overview', {
    schema: {
      description: 'Get compliance dashboard overview with metrics, recent checks, and alerts',
      tags: ['Compliance'],
      response: {
        200: {
          description: 'Compliance overview data',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                metrics: {
                  type: 'object',
                  properties: {
                    total_investors: { type: 'integer' },
                    kyc_completion_rate: { type: 'number' },
                    aml_clear_rate: { type: 'number' },
                    document_approval_rate: { type: 'number' },
                    compliance_issues_count: { type: 'integer' },
                    pending_reviews_count: { type: 'integer' }
                  }
                },
                recent_checks: { type: 'array', items: complianceCheckSchema },
                pending_reviews: { type: 'array', items: { type: 'object' } },
                alerts: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await complianceService.getComplianceOverview()
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/compliance/checks
   * Get compliance checks with filtering
   */
  fastify.get('/checks', {
    schema: {
      description: 'Get compliance checks with filtering and pagination',
      tags: ['Compliance'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          investor_id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          status: { 
            type: 'array', 
            items: { type: 'string', enum: ['pending', 'approved', 'rejected', 'review_required'] }
          },
          risk_level: { 
            type: 'array', 
            items: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          },
          reviewed_by: { type: 'string' },
          date_from: { type: 'string', format: 'date' },
          date_to: { type: 'string', format: 'date' },
          sortBy: { type: 'string', default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          description: 'Compliance checks list',
          type: 'object',
          properties: {
            data: { type: 'array', items: complianceCheckSchema },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                hasMore: { type: 'boolean' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const options = request.query as any
    const result = await complianceService.getComplianceChecks(options)
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/checks
   * Create new compliance check
   */
  fastify.post('/checks', {
    schema: {
      description: 'Create new compliance check for investor/project combination',
      tags: ['Compliance'],
      body: {
        type: 'object',
        required: ['investor_id', 'project_id'],
        properties: {
          investor_id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          risk_assessment: {
            type: 'object',
            properties: {
              factors: { type: 'array', items: { type: 'string' } },
              scores: { type: 'object' },
              overall_risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
            }
          },
          auto_approve_low_risk: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          description: 'Compliance check created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: complianceCheckSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await complianceService.createComplianceCheck(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PUT /api/v1/compliance/checks/:id
   * Update compliance check status
   */
  fastify.put('/checks/:id', {
    schema: {
      description: 'Update compliance check status and review information',
      tags: ['Compliance'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['status', 'reviewed_by'],
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'review_required'] },
          reviewer_notes: { type: 'string' },
          reviewed_by: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Compliance check updated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: complianceCheckSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = request.body as any
    const result = await complianceService.updateComplianceCheck(id, data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/screening/bulk
   * Perform bulk compliance screening
   */
  fastify.post('/screening/bulk', {
    schema: {
      description: 'Perform automated compliance screening for all entities',
      tags: ['Compliance', 'Screening'],
      body: {
        type: 'object',
        properties: {
          entity_type: { type: 'string', enum: ['investor', 'issuer', 'organization'] },
          screening_types: { 
            type: 'array', 
            items: { type: 'string', enum: ['sanctions', 'pep', 'adverse_media', 'watchlist'] },
            default: ['sanctions', 'pep', 'adverse_media']
          },
          force_rescreen: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Bulk screening results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_screened: { type: 'integer' },
                clear_results: { type: 'integer' },
                matches_found: { type: 'integer' },
                review_required: { type: 'integer' },
                errors: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const options = request.body as any
    const result = await complianceService.performBulkComplianceScreening(options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  // ============================================================================
  // KYC/AML ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/compliance/kyc/initiate
   * Initiate KYC verification process
   */
  fastify.post('/kyc/initiate', {
    schema: {
      description: 'Initiate KYC verification process for investor',
      tags: ['Compliance', 'KYC'],
      body: {
        type: 'object',
        required: ['investor_id', 'verification_type', 'verification_level', 'documents'],
        properties: {
          investor_id: { type: 'string', format: 'uuid' },
          verification_type: { type: 'string', enum: ['individual', 'corporate', 'institutional'] },
          verification_level: { type: 'string', enum: ['basic', 'enhanced', 'comprehensive'] },
          documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                file_url: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          },
          provider: { type: 'string', default: 'onfido' },
          force_reverification: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'KYC verification initiated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: kycVerificationSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as KycVerificationRequest
    const result = await kycService.initiateKycVerification(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/compliance/kyc/status/:entityId
   * Get KYC status for entity
   */
  fastify.get('/kyc/status/:entityId', {
    schema: {
      description: 'Get KYC status and compliance information for entity',
      tags: ['Compliance', 'KYC'],
      params: {
        type: 'object',
        required: ['entityId'],
        properties: {
          entityId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          entity_type: { type: 'string', enum: ['investor', 'issuer'], default: 'investor' }
        }
      },
      response: {
        200: {
          description: 'KYC status information',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                entity_id: { type: 'string' },
                entity_type: { type: 'string' },
                kyc_status: { type: 'string' },
                verification_level: { type: 'string' },
                expiry_date: { type: 'string', format: 'date-time' },
                compliance_score: { type: 'number' },
                required_actions: { type: 'array', items: { type: 'string' } },
                documents_status: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { entityId } = request.params as { entityId: string }
    const { entity_type = 'investor' } = request.query as any
    const result = await kycService.getKycStatus(entityId, entity_type as any)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/kyc/documents/verify
   * Verify individual document
   */
  fastify.post('/kyc/documents/verify', {
    schema: {
      description: 'Verify individual document for compliance',
      tags: ['Compliance', 'KYC', 'Documents'],
      body: {
        type: 'object',
        required: ['document_type', 'document_url', 'entity_id', 'entity_type'],
        properties: {
          document_type: { 
            type: 'string', 
            enum: ['passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement', 'articles_of_incorporation', 'certificate_of_good_standing']
          },
          document_url: { type: 'string' },
          entity_id: { type: 'string', format: 'uuid' },
          entity_type: { type: 'string', enum: ['investor', 'issuer'] },
          verification_requirements: {
            type: 'object',
            properties: {
              extract_data: { type: 'boolean', default: true },
              verify_authenticity: { type: 'boolean', default: true },
              check_expiry: { type: 'boolean', default: true }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Document verification result',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                document_type: { type: 'string' },
                verification_status: { type: 'string', enum: ['verified', 'failed', 'pending'] },
                extracted_data: { type: 'object' },
                verification_score: { type: 'number' },
                issues: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await kycService.verifyDocument(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/kyc/onboarding/workflow
   * Create onboarding workflow
   */
  fastify.post('/kyc/onboarding/workflow', {
    schema: {
      description: 'Create compliance onboarding workflow',
      tags: ['Compliance', 'KYC', 'Onboarding'],
      body: {
        type: 'object',
        required: ['entity_id', 'entity_type', 'workflow_type'],
        properties: {
          entity_id: { type: 'string', format: 'uuid' },
          entity_type: { type: 'string', enum: ['investor', 'issuer'] },
          workflow_type: { 
            type: 'string', 
            enum: ['individual_kyc', 'corporate_kyc', 'institutional_kyc', 'issuer_onboarding']
          },
          custom_steps: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          description: 'Onboarding workflow created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                entity_id: { type: 'string' },
                workflow_type: { type: 'string' },
                current_step: { type: 'string' },
                total_steps: { type: 'integer' },
                status: { type: 'string' },
                completion_percentage: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await kycService.createOnboardingWorkflow(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  // ============================================================================
  // DOCUMENT COMPLIANCE ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/compliance/documents/validate
   * Validate document compliance
   */
  fastify.post('/documents/validate', {
    schema: {
      description: 'Validate document compliance against regulatory requirements',
      tags: ['Compliance', 'Documents'],
      body: {
        type: 'object',
        required: ['document_type', 'entity_id', 'entity_type'],
        properties: {
          document_id: { type: 'string', format: 'uuid' },
          document_url: { type: 'string' },
          document_type: { type: 'string' },
          entity_id: { type: 'string', format: 'uuid' },
          entity_type: { type: 'string', enum: ['investor', 'issuer', 'organization'] },
          validation_level: { type: 'string', enum: ['basic', 'enhanced', 'comprehensive'], default: 'enhanced' },
          jurisdiction: { type: 'string', default: 'US' }
        }
      },
      response: {
        200: {
          description: 'Document validation result',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: documentValidationSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await documentComplianceService.validateDocumentCompliance(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/documents/compliance-check
   * Create compliance check for document
   */
  fastify.post('/documents/compliance-check', {
    schema: {
      description: 'Create compliance check for specific document',
      tags: ['Compliance', 'Documents'],
      body: {
        type: 'object',
        required: ['document_id', 'entity_id', 'entity_type'],
        properties: {
          document_id: { type: 'string', format: 'uuid' },
          entity_id: { type: 'string', format: 'uuid' },
          entity_type: { type: 'string', enum: ['investor', 'issuer', 'organization'] },
          verification_level: { type: 'string', enum: ['basic', 'enhanced', 'comprehensive'], default: 'enhanced' },
          auto_approve: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Document compliance check created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                document_id: { type: 'string' },
                compliance_status: { type: 'string' },
                verification_results: { type: 'object' },
                approval_workflow: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await documentComplianceService.createDocumentComplianceCheck(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/documents/bulk-validate
   * Perform bulk document validation
   */
  fastify.post('/documents/bulk-validate', {
    schema: {
      description: 'Perform bulk validation of multiple documents',
      tags: ['Compliance', 'Documents'],
      body: {
        type: 'object',
        required: ['document_ids', 'entity_type'],
        properties: {
          document_ids: { 
            type: 'array', 
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 50
          },
          entity_type: { type: 'string', enum: ['investor', 'issuer'] },
          validation_level: { type: 'string', enum: ['basic', 'enhanced', 'comprehensive'], default: 'enhanced' },
          auto_approve: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Bulk validation results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                batch_id: { type: 'string' },
                total_documents: { type: 'integer' },
                successful_validations: { type: 'integer' },
                failed_validations: { type: 'integer' },
                batch_status: { type: 'string' },
                validation_results: { type: 'array', items: documentValidationSchema }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await documentComplianceService.performBulkDocumentValidation(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/compliance/documents/templates
   * Get compliance templates
   */
  fastify.get('/documents/templates', {
    schema: {
      description: 'Get compliance document templates',
      tags: ['Compliance', 'Documents'],
      querystring: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          entity_type: { type: 'string', enum: ['investor', 'issuer', 'organization'] },
          jurisdiction: { type: 'string' },
          is_active: { type: 'boolean' }
        }
      },
      response: {
        200: {
          description: 'Compliance templates list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  document_type: { type: 'string' },
                  template_name: { type: 'string' },
                  entity_type: { type: 'string' },
                  jurisdiction: { type: 'string' },
                  required_fields: { type: 'array' },
                  acceptance_criteria: { type: 'array' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const filters = request.query as any
    const result = await documentComplianceService.getComplianceTemplates(filters)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  // ============================================================================
  // ORGANIZATION COMPLIANCE ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/compliance/organizations/profile
   * Create compliance profile for organization
   */
  fastify.post('/organizations/profile', {
    schema: {
      description: 'Create compliance profile for organization',
      tags: ['Compliance', 'Organizations'],
      body: {
        type: 'object',
        required: ['organization_id'],
        properties: {
          organization_id: { type: 'string', format: 'uuid' },
          initial_assessment: { type: 'boolean', default: true },
          jurisdiction: { type: 'string', default: 'US' }
        }
      },
      response: {
        200: {
          description: 'Organization compliance profile created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: organizationComplianceSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await organizationComplianceService.createComplianceProfile(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/organizations/kyb/initiate
   * Initiate KYB verification
   */
  fastify.post('/organizations/kyb/initiate', {
    schema: {
      description: 'Initiate Know Your Business (KYB) verification process',
      tags: ['Compliance', 'Organizations', 'KYB'],
      body: {
        type: 'object',
        required: ['organization_id', 'verification_level', 'business_information', 'beneficial_ownership_info', 'supporting_documents'],
        properties: {
          organization_id: { type: 'string', format: 'uuid' },
          verification_level: { type: 'string', enum: ['basic', 'enhanced', 'comprehensive'] },
          business_information: {
            type: 'object',
            properties: {
              legal_name: { type: 'string' },
              trade_name: { type: 'string' },
              registration_number: { type: 'string' },
              tax_id: { type: 'string' },
              business_type: { type: 'string' },
              incorporation_date: { type: 'string', format: 'date' },
              registration_country: { type: 'string' },
              operating_address: { type: 'object' },
              business_activities: { type: 'array', items: { type: 'string' } }
            }
          },
          beneficial_ownership_info: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                ownership_percentage: { type: 'number' },
                role: { type: 'string' },
                identification_document: { type: 'string' }
              }
            }
          },
          supporting_documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                document_type: { type: 'string' },
                document_url: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          },
          regulatory_requirements: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          description: 'KYB verification initiated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                verification_id: { type: 'string' },
                status: { type: 'string' },
                verification_score: { type: 'number' },
                verification_steps: { type: 'array' },
                beneficial_ownership_verification: { type: 'object' },
                regulatory_screening: { type: 'object' },
                next_steps: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as KybVerificationRequest
    const result = await organizationComplianceService.initiateKybVerification(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/organizations/onboarding/workflow
   * Create onboarding workflow for organization
   */
  fastify.post('/organizations/onboarding/workflow', {
    schema: {
      description: 'Create compliance onboarding workflow for organization',
      tags: ['Compliance', 'Organizations', 'Onboarding'],
      body: {
        type: 'object',
        required: ['organization_id', 'workflow_type'],
        properties: {
          organization_id: { type: 'string', format: 'uuid' },
          workflow_type: { 
            type: 'string', 
            enum: ['issuer_onboarding', 'fund_manager_verification', 'service_provider_kyb']
          },
          custom_stages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stage_name: { type: 'string' },
                requirements: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          assigned_compliance_officer: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Onboarding workflow created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                organization_id: { type: 'string' },
                workflow_type: { type: 'string' },
                current_stage: { type: 'string' },
                overall_status: { type: 'string' },
                completion_percentage: { type: 'number' },
                stages: { type: 'array' },
                compliance_requirements: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await organizationComplianceService.createOnboardingWorkflow(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/compliance/organizations/regulatory-assessment
   * Perform regulatory assessment
   */
  fastify.post('/organizations/regulatory-assessment', {
    schema: {
      description: 'Perform regulatory assessment for organization',
      tags: ['Compliance', 'Organizations', 'Regulatory'],
      body: {
        type: 'object',
        required: ['organization_id', 'jurisdiction', 'assessment_type'],
        properties: {
          organization_id: { type: 'string', format: 'uuid' },
          jurisdiction: { type: 'string' },
          assessment_type: { 
            type: 'string', 
            enum: ['initial', 'periodic', 'triggered', 'pre_issuance']
          },
          regulatory_framework: { type: 'string', default: 'securities_regulation' }
        }
      },
      response: {
        200: {
          description: 'Regulatory assessment completed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                assessment_id: { type: 'string' },
                organization_id: { type: 'string' },
                jurisdiction: { type: 'string' },
                assessment_type: { type: 'string' },
                assessment_score: { type: 'number' },
                applicable_regulations: { type: 'array' },
                risk_factors: { type: 'array' },
                compliance_recommendations: { type: 'array', items: { type: 'string' } },
                regulatory_approval_required: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await organizationComplianceService.performRegulatoryAssessment(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/compliance/organizations/:id/profile
   * Get organization compliance profile
   */
  fastify.get('/organizations/:id/profile', {
    schema: {
      description: 'Get compliance profile for organization',
      tags: ['Compliance', 'Organizations'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Organization compliance profile',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: organizationComplianceSchema
          }
        },
        404: {
          description: 'Compliance profile not found',
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
    const result = await organizationComplianceService.getComplianceProfile(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  // ============================================================================
  // REPORTING ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/compliance/reports/generate
   * Generate compliance report
   */
  fastify.post('/reports/generate', {
    schema: {
      description: 'Generate compliance report for specific period and type',
      tags: ['Compliance', 'Reports'],
      body: {
        type: 'object',
        required: ['report_type', 'period_start', 'period_end'],
        properties: {
          report_type: { 
            type: 'string', 
            enum: ['kyc_summary', 'aml_review', 'document_status', 'compliance_metrics', 'regulatory_filing']
          },
          period_start: { type: 'string', format: 'date' },
          period_end: { type: 'string', format: 'date' },
          filters: { type: 'object' },
          include_charts: { type: 'boolean', default: true },
          format: { type: 'string', enum: ['json', 'pdf', 'csv'], default: 'json' }
        }
      },
      response: {
        200: {
          description: 'Compliance report generated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                report_type: { type: 'string' },
                period_start: { type: 'string', format: 'date-time' },
                period_end: { type: 'string', format: 'date-time' },
                data: { type: 'object' },
                status: { type: 'string' },
                generated_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await complianceService.generateComplianceReport(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })
}

export default complianceRoutes
