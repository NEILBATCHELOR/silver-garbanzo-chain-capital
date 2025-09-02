/**
 * Investor API Routes
 * Provides comprehensive investor management endpoints with full OpenAPI/Swagger documentation
 */

import { FastifyPluginAsync } from 'fastify'
import { 
  InvestorService, 
  InvestorValidationService, 
  InvestorAnalyticsService,
  InvestorGroupService
} from '@/services/investors/index'
import type {
  InvestorCreateRequest,
  InvestorUpdateRequest,
  InvestorQueryOptions,
  BulkInvestorUpdateRequest
} from '@/types/investors'

const investorRoutes: FastifyPluginAsync = async (fastify) => {
  const investorService = new InvestorService()
  const validationService = new InvestorValidationService()
  const analyticsService = new InvestorAnalyticsService()
  const groupService = new InvestorGroupService()

  // Schema definitions for OpenAPI/Swagger
  const investorSchema = {
    type: 'object',
    properties: {
      investor_id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      type: { type: 'string' },
      wallet_address: { type: 'string', nullable: true },
      kyc_status: { 
        type: 'string', 
        enum: ['not_started', 'pending', 'approved', 'failed', 'expired'] 
      },
      investor_status: { 
        type: 'string', 
        enum: ['pending', 'active', 'inactive', 'suspended', 'rejected'] 
      },
      investor_type: { 
        type: 'string', 
        enum: ['individual', 'corporate', 'institutional', 'fund', 'trust'] 
      },
      accreditation_status: { 
        type: 'string', 
        enum: ['not_started', 'pending', 'approved', 'rejected', 'expired'] 
      },
      company: { type: 'string', nullable: true },
      tax_residency: { type: 'string', nullable: true },
      tax_id_number: { type: 'string', nullable: true },
      onboarding_completed: { type: 'boolean' },
      profile_data: { type: 'object' },
      risk_assessment: { type: 'object' },
      investment_preferences: { type: 'object' },
      verification_details: { type: 'object' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      kyc_expiry_date: { type: 'string', format: 'date-time', nullable: true },
      accreditation_expiry_date: { type: 'string', format: 'date-time', nullable: true },
      last_compliance_check: { type: 'string', format: 'date-time', nullable: true }
    }
  }

  const investorStatisticsSchema = {
    type: 'object',
    properties: {
      total_invested: { type: 'number' },
      number_of_investments: { type: 'integer' },
      active_projects: { type: 'integer' },
      completed_projects: { type: 'integer' },
      average_investment_size: { type: 'number' },
      portfolio_value: { type: 'number' },
      kyc_compliance_rate: { type: 'number' },
      accreditation_status_current: { type: 'boolean' },
      first_investment_date: { type: 'string', format: 'date-time', nullable: true },
      last_investment_date: { type: 'string', format: 'date-time', nullable: true }
    }
  }

  const paginationSchema = {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      page: { type: 'integer' },
      limit: { type: 'integer' },
      hasMore: { type: 'boolean' },
      totalPages: { type: 'integer' },
      nextPage: { type: 'integer', nullable: true },
      prevPage: { type: 'integer', nullable: true }
    }
  }

  /**
   * GET /api/v1/investors
   * Get all investors with filtering and pagination
   */
  fastify.get('/', {
    schema: {
      description: 'Get all investors with filtering, pagination, and optional statistics',
      tags: ['Investors'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', description: 'Search in name, email, company, tax_id_number' },
          investor_status: { 
            type: 'array', 
            items: { type: 'string', enum: ['pending', 'active', 'inactive', 'suspended', 'rejected'] },
            description: 'Filter by investor status'
          },
          kyc_status: { 
            type: 'array', 
            items: { type: 'string', enum: ['not_started', 'pending', 'approved', 'failed', 'expired'] },
            description: 'Filter by KYC status'
          },
          investor_type: { 
            type: 'array', 
            items: { type: 'string', enum: ['individual', 'corporate', 'institutional', 'fund', 'trust'] },
            description: 'Filter by investor type'
          },
          accreditation_status: { 
            type: 'array', 
            items: { type: 'string', enum: ['not_started', 'pending', 'approved', 'rejected', 'expired'] },
            description: 'Filter by accreditation status'
          },
          include_statistics: { type: 'boolean', default: true },
          include_groups: { type: 'boolean', default: false },
          include_cap_table: { type: 'boolean', default: false },
          sort_by: { type: 'string', default: 'created_at' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          created_from: { type: 'string', format: 'date' },
          created_to: { type: 'string', format: 'date' },
          kyc_expiry_from: { type: 'string', format: 'date' },
          kyc_expiry_to: { type: 'string', format: 'date' },
          has_wallet: { type: 'boolean' },
          compliance_score_min: { type: 'number', minimum: 0, maximum: 100 },
          investment_amount_min: { type: 'number', minimum: 0 },
          investment_amount_max: { type: 'number', minimum: 0 }
        }
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                allOf: [
                  investorSchema,
                  {
                    type: 'object',
                    properties: {
                      statistics: investorStatisticsSchema,
                      compliance_score: { type: 'number' },
                      total_investments: { type: 'integer' },
                      active_projects: { type: 'integer' }
                    }
                  }
                ]
              }
            },
            pagination: paginationSchema,
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const options = request.query as InvestorQueryOptions
    const result = await investorService.getInvestors(options)
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/:id
   * Get specific investor by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get specific investor by ID with optional related data',
      tags: ['Investors'],
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
          include_statistics: { type: 'boolean', default: true },
          include_groups: { type: 'boolean', default: false },
          include_cap_table: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              allOf: [
                investorSchema,
                {
                  type: 'object',
                  properties: {
                    statistics: investorStatisticsSchema,
                    compliance_score: { type: 'number' },
                    groups: { type: 'array', items: { type: 'object' } },
                    cap_table_entries: { type: 'array', items: { type: 'object' } }
                  }
                }
              ]
            }
          }
        },
        404: {
          description: 'Investor not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const options = request.query as any
    const result = await investorService.getInvestorById(id, options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/investors
   * Create new investor
   */
  fastify.post('/', {
    schema: {
      description: 'Create new investor with validation and compliance checks',
      tags: ['Investors'],
      body: {
        type: 'object',
        required: ['name', 'email', 'type'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 200 },
          email: { type: 'string', format: 'email' },
          type: { type: 'string' },
          investor_type: { 
            type: 'string', 
            enum: ['individual', 'corporate', 'institutional', 'fund', 'trust'],
            default: 'individual'
          },
          wallet_address: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          tax_residency: { type: 'string', nullable: true },
          tax_id_number: { type: 'string', nullable: true },
          profile_data: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              nationality: { type: 'string' },
              residence_country: { type: 'string' },
              date_of_birth: { type: 'string', format: 'date' },
              employment_status: { type: 'string' },
              annual_income: { type: 'number', minimum: 0 },
              net_worth: { type: 'number', minimum: 0 },
              source_of_funds: { type: 'string' },
              investment_objectives: { type: 'string' }
            }
          },
          risk_assessment: {
            type: 'object',
            properties: {
              risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
              investment_experience: { type: 'string', enum: ['none', 'limited', 'moderate', 'extensive'] },
              liquidity_needs: { type: 'string' },
              time_horizon: { type: 'string' }
            }
          },
          investment_preferences: {
            type: 'object',
            properties: {
              preferred_sectors: { type: 'array', items: { type: 'string' } },
              preferred_regions: { type: 'array', items: { type: 'string' } },
              minimum_investment: { type: 'number', minimum: 0 },
              maximum_investment: { type: 'number', minimum: 0 },
              preferred_project_types: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          validate_data: { type: 'boolean', default: true },
          assign_to_groups: { type: 'array', items: { type: 'string', format: 'uuid' } },
          auto_kyc_check: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          description: 'Investor created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                investor: investorSchema,
                validation: {
                  type: 'object',
                  properties: {
                    is_valid: { type: 'boolean' },
                    completion_percentage: { type: 'number' },
                    missing_fields: { type: 'array', items: { type: 'string' } },
                    kyc_requirements: { type: 'array', items: { type: 'string' } }
                  }
                },
                compliance_status: {
                  type: 'object',
                  properties: {
                    kyc_required: { type: 'boolean' },
                    accreditation_required: { type: 'boolean' },
                    additional_documentation: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        },
        409: {
          description: 'Investor with email already exists',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as InvestorCreateRequest
    const options = request.query as any
    const result = await investorService.createInvestor(data, options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PUT /api/v1/investors/:id
   * Update existing investor
   */
  fastify.put('/:id', {
    schema: {
      description: 'Update existing investor with validation',
      tags: ['Investors'],
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
          name: { type: 'string', minLength: 2, maxLength: 200 },
          type: { type: 'string' },
          investor_type: { 
            type: 'string', 
            enum: ['individual', 'corporate', 'institutional', 'fund', 'trust']
          },
          investor_status: { 
            type: 'string', 
            enum: ['pending', 'active', 'inactive', 'suspended', 'rejected']
          },
          kyc_status: { 
            type: 'string', 
            enum: ['not_started', 'pending', 'approved', 'failed', 'expired']
          },
          accreditation_status: { 
            type: 'string', 
            enum: ['not_started', 'pending', 'approved', 'rejected', 'expired']
          },
          wallet_address: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          tax_residency: { type: 'string', nullable: true },
          tax_id_number: { type: 'string', nullable: true },
          kyc_expiry_date: { type: 'string', format: 'date-time', nullable: true },
          accreditation_expiry_date: { type: 'string', format: 'date-time', nullable: true },
          accreditation_type: { type: 'string', nullable: true },
          profile_data: { type: 'object' },
          risk_assessment: { type: 'object' },
          investment_preferences: { type: 'object' },
          verification_details: { type: 'object' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          validate_data: { type: 'boolean', default: true },
          create_audit_log: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          description: 'Investor updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: investorSchema
          }
        },
        404: {
          description: 'Investor not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = request.body as InvestorUpdateRequest
    const options = request.query as any
    const result = await investorService.updateInvestor(id, data, options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * DELETE /api/v1/investors/:id
   * Delete investor (with cascade handling)
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete investor with cascade handling for related data',
      tags: ['Investors'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Investor deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'boolean' }
          }
        },
        404: {
          description: 'Investor not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        409: {
          description: 'Cannot delete investor with dependencies',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await investorService.deleteInvestor(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/:id/statistics
   * Get detailed investor statistics
   */
  fastify.get('/:id/statistics', {
    schema: {
      description: 'Get detailed statistics for a specific investor',
      tags: ['Investors', 'Analytics'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Investor statistics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: investorStatisticsSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await investorService.getInvestorStatistics(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PUT /api/v1/investors/bulk-update
   * Bulk update multiple investors
   */
  fastify.put('/bulk-update', {
    schema: {
      description: 'Bulk update multiple investors',
      tags: ['Investors'],
      body: {
        type: 'object',
        required: ['investor_ids', 'updates'],
        properties: {
          investor_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 100
          },
          updates: {
            type: 'object',
            properties: {
              investor_status: { 
                type: 'string', 
                enum: ['pending', 'active', 'inactive', 'suspended', 'rejected']
              },
              kyc_status: { 
                type: 'string', 
                enum: ['not_started', 'pending', 'approved', 'failed', 'expired']
              },
              notes: { type: 'string' }
            }
          },
          options: {
            type: 'object',
            properties: {
              validate_before_update: { type: 'boolean', default: true },
              create_audit_log: { type: 'boolean', default: true },
              notify_investors: { type: 'boolean', default: false }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Bulk update results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                successful: { type: 'array', items: investorSchema },
                failed: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      item: { type: 'string' },
                      error: { type: 'string' },
                      index: { type: 'integer' }
                    }
                  }
                },
                summary: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    success: { type: 'integer' },
                    failed: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as BulkInvestorUpdateRequest
    const result = await investorService.bulkUpdateInvestors(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/:id/analytics
   * Get comprehensive investor analytics
   */
  fastify.get('/:id/analytics', {
    schema: {
      description: 'Get comprehensive analytics for a specific investor',
      tags: ['Investors', 'Analytics'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Investor analytics data',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                investor_id: { type: 'string' },
                summary: {
                  type: 'object',
                  properties: {
                    total_invested: { type: 'number' },
                    total_projects: { type: 'integer' },
                    average_investment: { type: 'number' },
                    portfolio_performance: { type: 'number' },
                    roi_percentage: { type: 'number' }
                  }
                },
                timeline: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      cumulative_invested: { type: 'number' },
                      new_investments: { type: 'integer' },
                      portfolio_value: { type: 'number' }
                    }
                  }
                },
                project_breakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      project_id: { type: 'string' },
                      project_name: { type: 'string' },
                      amount_invested: { type: 'number' },
                      current_value: { type: 'number' },
                      roi: { type: 'number' },
                      status: { type: 'string' }
                    }
                  }
                },
                risk_profile: {
                  type: 'object',
                  properties: {
                    risk_score: { type: 'number' },
                    diversification_score: { type: 'number' },
                    concentration_risk: { type: 'number' },
                    recommended_actions: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = await analyticsService.getInvestorAnalytics(id)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/overview
   * Get investor overview dashboard data
   */
  fastify.get('/overview', {
    schema: {
      description: 'Get comprehensive investor overview dashboard data',
      tags: ['Investors', 'Analytics'],
      response: {
        200: {
          description: 'Investor overview data',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalInvestors: { type: 'integer' },
                activeInvestors: { type: 'integer' },
                kycApprovalRate: { type: 'number' },
                averageInvestmentSize: { type: 'number' },
                totalInvested: { type: 'number' },
                topInvestors: { type: 'array', items: investorSchema },
                complianceMetrics: {
                  type: 'object',
                  properties: {
                    kycCompliant: { type: 'integer' },
                    accreditationCompliant: { type: 'integer' },
                    documentationComplete: { type: 'integer' }
                  }
                },
                geographicDistribution: { type: 'object' },
                investorTypeDistribution: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await analyticsService.getInvestorOverview()
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/investors/export
   * Export investors in various formats
   */
  fastify.post('/export', {
    schema: {
      description: 'Export investor data in various formats',
      tags: ['Investors', 'Export'],
      body: {
        type: 'object',
        required: ['format', 'fields'],
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'pdf', 'json'] },
          fields: { type: 'array', items: { type: 'string' }, minItems: 1 },
          includeStatistics: { type: 'boolean', default: false },
          includeCompliance: { type: 'boolean', default: false },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          },
          investorIds: { type: 'array', items: { type: 'string', format: 'uuid' } }
        }
      },
      response: {
        200: {
          description: 'File download',
          type: 'string',
          format: 'binary'
        }
      }
    }
  }, async (request, reply) => {
    const options = request.body as any
    const result = await analyticsService.exportInvestors(options)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send({ error: result.error })
    }

    const filename = `investors-export-${new Date().toISOString().split('T')[0]}.${options.format}`
    
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.type(`application/${options.format === 'csv' ? 'csv' : 'octet-stream'}`)
    
    return reply.send(result.data)
  })

  /**
   * POST /api/v1/investors/:id/validate
   * Validate investor data and compliance
   */
  fastify.post('/:id/validate', {
    schema: {
      description: 'Validate investor data and check compliance requirements',
      tags: ['Investors', 'Validation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Validation results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                is_valid: { type: 'boolean' },
                completion_percentage: { type: 'number' },
                missing_fields: { type: 'array', items: { type: 'string' } },
                validation_errors: { type: 'array', items: { type: 'string' } },
                compliance_issues: { type: 'array', items: { type: 'string' } },
                kyc_requirements: { type: 'array', items: { type: 'string' } },
                accreditation_requirements: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // Get investor first
    const investorResult = await investorService.getInvestorById(id, { include_statistics: false })
    if (!investorResult.success) {
      return reply.status(investorResult.statusCode || 500).send(investorResult)
    }

    const result = await validationService.validateInvestor(investorResult.data!)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  // ============================================================================
  // INVESTOR GROUP MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/investors/groups
   * Get all investor groups
   */
  fastify.get('/groups', {
    schema: {
      description: 'Get all investor groups with optional member data',
      tags: ['Investors', 'Groups'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          project_id: { type: 'string', format: 'uuid' },
          include_members: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Investor groups list',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  project_id: { type: 'string', format: 'uuid', nullable: true },
                  member_count: { type: 'integer' },
                  group: { type: 'string', nullable: true },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: paginationSchema
          }
        }
      }
    }
  }, async (request, reply) => {
    const options = request.query as any
    const result = await groupService.getGroups(options)
    return reply.send(result)
  })

  /**
   * POST /api/v1/investors/groups
   * Create new investor group
   */
  fastify.post('/groups', {
    schema: {
      description: 'Create new investor group',
      tags: ['Investors', 'Groups'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          project_id: { type: 'string', format: 'uuid' },
          group: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Group created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                project_id: { type: 'string', format: 'uuid', nullable: true },
                member_count: { type: 'integer' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = request.body as any
    const result = await groupService.createGroup(data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/groups/:groupId
   * Get specific investor group
   */
  fastify.get('/groups/:groupId', {
    schema: {
      description: 'Get specific investor group by ID',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          include_members: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Investor group details',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                project_id: { type: 'string', format: 'uuid', nullable: true },
                member_count: { type: 'integer' },
                group: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const { include_members } = request.query as any
    const result = await groupService.getGroupById(groupId, include_members)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * PUT /api/v1/investors/groups/:groupId
   * Update investor group
   */
  fastify.put('/groups/:groupId', {
    schema: {
      description: 'Update investor group',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          group: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const data = request.body as any
    const result = await groupService.updateGroup(groupId, data)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * DELETE /api/v1/investors/groups/:groupId
   * Delete investor group
   */
  fastify.delete('/groups/:groupId', {
    schema: {
      description: 'Delete investor group and remove all members',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const result = await groupService.deleteGroup(groupId)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * GET /api/v1/investors/groups/:groupId/members
   * Get group members
   */
  fastify.get('/groups/:groupId/members', {
    schema: {
      description: 'Get all members of a specific investor group',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const options = request.query as any
    const result = await groupService.getGroupMembers(groupId, options)
    return reply.send(result)
  })

  /**
   * POST /api/v1/investors/groups/:groupId/members/:investorId
   * Add investor to group
   */
  fastify.post('/groups/:groupId/members/:investorId', {
    schema: {
      description: 'Add investor to group',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId', 'investorId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' },
          investorId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId, investorId } = request.params as { groupId: string, investorId: string }
    const result = await groupService.addInvestorToGroup(groupId, investorId)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * DELETE /api/v1/investors/groups/:groupId/members/:investorId
   * Remove investor from group
   */
  fastify.delete('/groups/:groupId/members/:investorId', {
    schema: {
      description: 'Remove investor from group',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId', 'investorId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' },
          investorId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId, investorId } = request.params as { groupId: string, investorId: string }
    const result = await groupService.removeInvestorFromGroup(groupId, investorId)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })

  /**
   * POST /api/v1/investors/groups/:groupId/bulk-add
   * Bulk add investors to group
   */
  fastify.post('/groups/:groupId/bulk-add', {
    schema: {
      description: 'Bulk add multiple investors to group',
      tags: ['Investors', 'Groups'],
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['investor_ids'],
        properties: {
          investor_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 100
          }
        }
      }
    }
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const { investor_ids } = request.body as { investor_ids: string[] }
    const result = await groupService.bulkAddInvestorsToGroup(groupId, investor_ids)
    
    if (!result.success) {
      return reply.status(result.statusCode || 500).send(result)
    }
    
    return reply.send(result)
  })
}

export default investorRoutes
