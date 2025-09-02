/**
 * Subscription Management API Routes
 * RESTful API endpoints for subscription and redemption operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { 
  SubscriptionService, 
  SubscriptionValidationService,
  SubscriptionAnalyticsService,
  RedemptionService 
} from '../services/subscriptions/index'
import type {
  InvestmentSubscriptionCreateRequest,
  InvestmentSubscriptionUpdateRequest,
  InvestmentSubscriptionQueryOptions,
  RedemptionCreateRequest,
  RedemptionUpdateRequest,
  RedemptionQueryOptions,
  RedemptionApprovalRequest,
  InvestmentSubscriptionExportOptions,
  RedemptionExportOptions
} from '../types/subscriptions'

// Initialize services
const subscriptionService = new SubscriptionService()
const validationService = new SubscriptionValidationService()
const analyticsService = new SubscriptionAnalyticsService()
const redemptionService = new RedemptionService()

export async function subscriptionRoutes(fastify: FastifyInstance) {
  
  // ===============================
  // Subscription Management Routes
  // ===============================

  /**
   * Get all subscriptions with filtering and pagination
   */
  fastify.get('/subscriptions', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Get all subscriptions',
      description: 'Retrieve paginated list of subscriptions with filtering options',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          investor_id: { type: 'string' },
          project_id: { type: 'string' },
          currency: { 
            type: 'array',
            items: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] }
          },
          confirmed: { type: 'boolean' },
          allocated: { type: 'boolean' },
          distributed: { type: 'boolean' },
          amount_min: { type: 'number', minimum: 0 },
          amount_max: { type: 'number', minimum: 0 },
          include_statistics: { type: 'boolean', default: true },
          include_investor: { type: 'boolean', default: true },
          include_project: { type: 'boolean', default: true },
          sort_by: { type: 'string', enum: ['created_at', 'subscription_date', 'fiat_amount', 'updated_at'], default: 'created_at' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  investor_id: { type: 'string' },
                  subscription_id: { type: 'string' },
                  fiat_amount: { type: 'number' },
                  currency: { type: 'string' },
                  confirmed: { type: 'boolean' },
                  allocated: { type: 'boolean' },
                  distributed: { type: 'boolean' },
                  subscription_date: { type: 'string', format: 'date-time' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            },
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const options = request.query as InvestmentSubscriptionQueryOptions
      const result = await subscriptionService.getSubscriptions(options)
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve subscriptions'
      })
    }
  })

  /**
   * Get subscription by ID
   */
  fastify.get('/subscriptions/:id', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Get subscription by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          include_statistics: { type: 'boolean', default: true },
          include_investor: { type: 'boolean', default: true },
          include_project: { type: 'boolean', default: true },
          include_workflow: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      const options = request.query as any
      
      const result = await subscriptionService.getSubscriptionById(id, options)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve subscription'
      })
    }
  })

  /**
   * Create new subscription
   */
  fastify.post('/subscriptions', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Create new subscription',
      body: {
        type: 'object',
        properties: {
          investor_id: { type: 'string' },
          project_id: { type: 'string' },
          fiat_amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] },
          payment_method: { type: 'string', enum: ['wire_transfer', 'credit_card', 'crypto', 'ach', 'check', 'other'] },
          notes: { type: 'string' },
          subscription_date: { type: 'string', format: 'date-time' },
          auto_allocate: { type: 'boolean', default: false },
          compliance_check: { type: 'boolean', default: true }
        },
        required: ['investor_id', 'fiat_amount', 'currency']
      }
    }
  }, async (request: FastifyRequest<{ Body: InvestmentSubscriptionCreateRequest }>, reply: FastifyReply) => {
    try {
      const data = request.body
      const result = await subscriptionService.createSubscription(data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to create subscription'
      })
    }
  })

  /**
   * Update subscription
   */
  fastify.put('/subscriptions/:id', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Update subscription',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          fiat_amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] },
          confirmed: { type: 'boolean' },
          allocated: { type: 'boolean' },
          distributed: { type: 'boolean' },
          notes: { type: 'string' },
          subscription_date: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: InvestmentSubscriptionUpdateRequest }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      const data = request.body
      
      const result = await subscriptionService.updateSubscription(id, data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to update subscription'
      })
    }
  })

  /**
   * Delete subscription
   */
  fastify.delete('/subscriptions/:id', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Delete subscription',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      
      const result = await subscriptionService.deleteSubscription(id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete subscription'
      })
    }
  })

  /**
   * Get subscription statistics
   */
  fastify.get('/subscriptions/:id/statistics', {
    schema: {
      tags: ['Subscriptions'],
      summary: 'Get subscription statistics',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      
      const result = await subscriptionService.getSubscriptionStatistics(id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to get subscription statistics'
      })
    }
  })

  // ===============================
  // Subscription Analytics Routes
  // ===============================

  /**
   * Get subscription analytics
   */
  fastify.get('/subscriptions/analytics', {
    schema: {
      tags: ['Subscription Analytics'],
      summary: 'Get subscription analytics',
      querystring: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', enum: ['month', 'quarter', 'year', 'all'], default: 'all' },
          investor_id: { type: 'string' },
          project_id: { type: 'string' },
          currency: { 
            type: 'array',
            items: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any
      const { timeframe, ...filters } = query
      
      const result = await analyticsService.getSubscriptionAnalytics(filters, timeframe)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to get subscription analytics'
      })
    }
  })

  /**
   * Export subscription data
   */
  fastify.post('/subscriptions/export', {
    schema: {
      tags: ['Subscription Analytics'],
      summary: 'Export subscription data',
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'pdf', 'json'] },
          filters: {
            type: 'object',
            properties: {
              investor_id: { type: 'string' },
              project_id: { type: 'string' },
              currency: { 
                type: 'array',
                items: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] }
              },
              confirmed: { type: 'boolean' },
              allocated: { type: 'boolean' },
              distributed: { type: 'boolean' }
            }
          },
          include_investor_details: { type: 'boolean', default: true },
          include_project_details: { type: 'boolean', default: true },
          include_statistics: { type: 'boolean', default: false }
        },
        required: ['format']
      }
    }
  }, async (request: FastifyRequest<{ Body: InvestmentSubscriptionExportOptions }>, reply: FastifyReply) => {
    try {
      const options = request.body
      
      const result = await analyticsService.exportSubscriptionData(options)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to export subscription data'
      })
    }
  })

  // ===============================
  // Redemption Management Routes
  // ===============================

  /**
   * Get all redemption requests
   */
  fastify.get('/redemptions', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Get all redemption requests',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          investor_id: { type: 'string' },
          status: { 
            type: 'array',
            items: { type: 'string', enum: ['submitted', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'cancelled', 'failed'] }
          },
          redemption_type: { 
            type: 'array',
            items: { type: 'string', enum: ['full', 'partial', 'dividend', 'liquidation'] }
          },
          token_type: { 
            type: 'array',
            items: { type: 'string' }
          },
          amount_min: { type: 'number', minimum: 0 },
          amount_max: { type: 'number', minimum: 0 },
          requires_approval: { type: 'boolean' },
          is_bulk_redemption: { type: 'boolean' },
          include_approvals: { type: 'boolean', default: false },
          include_window: { type: 'boolean', default: false },
          sort_by: { type: 'string', enum: ['created_at', 'token_amount', 'updated_at', 'status'], default: 'created_at' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const options = request.query as RedemptionQueryOptions
      
      const result = await redemptionService.getRedemptionRequests(options)
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve redemption requests'
      })
    }
  })

  /**
   * Get redemption request by ID
   */
  fastify.get('/redemptions/:id', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Get redemption request by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']  
      },
      querystring: {
        type: 'object',
        properties: {
          include_approvals: { type: 'boolean', default: true },
          include_window: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      const options = request.query as any
      
      const result = await redemptionService.getRedemptionById(id, options)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve redemption request'
      })
    }
  })

  /**
   * Create new redemption request
   */
  fastify.post('/redemptions', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Create new redemption request',
      body: {
        type: 'object',
        properties: {
          token_amount: { type: 'number', minimum: 0 },
          token_type: { type: 'string' },
          redemption_type: { type: 'string', enum: ['full', 'partial', 'dividend', 'liquidation'] },
          source_wallet_address: { type: 'string' },
          destination_wallet_address: { type: 'string' },
          investor_id: { type: 'string' },
          conversion_rate: { type: 'number', minimum: 0 },
          notes: { type: 'string' },
          required_approvals: { type: 'integer', minimum: 1, default: 1 }
        },
        required: ['token_amount', 'token_type', 'redemption_type', 'source_wallet_address', 'destination_wallet_address']
      }
    }
  }, async (request: FastifyRequest<{ Body: RedemptionCreateRequest }>, reply: FastifyReply) => {
    try {
      const data = request.body
      
      const result = await redemptionService.createRedemptionRequest(data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to create redemption request'
      })
    }
  })

  /**
   * Update redemption request
   */
  fastify.put('/redemptions/:id', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Update redemption request',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          token_amount: { type: 'number', minimum: 0 },
          redemption_type: { type: 'string', enum: ['full', 'partial', 'dividend', 'liquidation'] },
          status: { type: 'string', enum: ['submitted', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'cancelled', 'failed'] },
          destination_wallet_address: { type: 'string' },
          conversion_rate: { type: 'number', minimum: 0 },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: RedemptionUpdateRequest }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      const data = request.body
      
      const result = await redemptionService.updateRedemptionRequest(id, data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to update redemption request'
      })
    }
  })

  /**
   * Process redemption approval
   */
  fastify.post('/redemptions/approvals', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Process redemption approval',
      body: {
        type: 'object',
        properties: {
          redemption_request_id: { type: 'string' },
          approver_user_id: { type: 'string' },
          action: { type: 'string', enum: ['approve', 'reject'] },
          comments: { type: 'string' },
          rejection_reason: { type: 'string' },
          approval_signature: { type: 'string' }
        },
        required: ['redemption_request_id', 'approver_user_id', 'action']
      }
    }
  }, async (request: FastifyRequest<{ Body: RedemptionApprovalRequest }>, reply: FastifyReply) => {
    try {
      const approvalData = request.body
      
      const result = await redemptionService.processRedemptionApproval(approvalData)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to process redemption approval'
      })
    }
  })

  /**
   * Get active redemption windows
   */
  fastify.get('/redemptions/windows/active', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Get active redemption windows'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await redemptionService.getActiveRedemptionWindows()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to get active redemption windows'
      })
    }
  })

  /**
   * Check redemption eligibility
   */
  fastify.post('/redemptions/check-eligibility', {
    schema: {
      tags: ['Redemptions'],
      summary: 'Check redemption eligibility',
      body: {
        type: 'object',
        properties: {
          token_type: { type: 'string' },
          amount: { type: 'number', minimum: 0 }
        },
        required: ['token_type', 'amount']
      }
    }
  }, async (request: FastifyRequest<{ Body: { token_type: string, amount: number } }>, reply: FastifyReply) => {
    try {
      const { token_type, amount } = request.body
      
      const result = await redemptionService.isRedemptionAllowed(token_type, amount)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to check redemption eligibility'
      })
    }
  })

  // ===============================
  // Validation Routes
  // ===============================

  /**
   * Validate subscription creation request
   */
  fastify.post('/subscriptions/validate', {
    schema: {
      tags: ['Subscription Validation'],
      summary: 'Validate subscription creation request',
      body: {
        type: 'object',
        properties: {
          investor_id: { type: 'string' },
          project_id: { type: 'string' },
          fiat_amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'CNY'] },
          payment_method: { type: 'string', enum: ['wire_transfer', 'credit_card', 'crypto', 'ach', 'check', 'other'] },
          subscription_date: { type: 'string', format: 'date-time' },
          compliance_check: { type: 'boolean', default: true }
        },
        required: ['investor_id', 'fiat_amount', 'currency']
      }
    }
  }, async (request: FastifyRequest<{ Body: InvestmentSubscriptionCreateRequest }>, reply: FastifyReply) => {
    try {
      const data = request.body
      
      const result = await validationService.validateSubscriptionCreate(data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to validate subscription'
      })
    }
  })

  /**
   * Validate redemption request
   */
  fastify.post('/redemptions/validate', {
    schema: {
      tags: ['Redemption Validation'],
      summary: 'Validate redemption request',
      body: {
        type: 'object',
        properties: {
          token_amount: { type: 'number', minimum: 0 },
          token_type: { type: 'string' },
          redemption_type: { type: 'string', enum: ['full', 'partial', 'dividend', 'liquidation'] },
          source_wallet_address: { type: 'string' },
          destination_wallet_address: { type: 'string' },
          investor_id: { type: 'string' },
          conversion_rate: { type: 'number', minimum: 0 },
          required_approvals: { type: 'integer', minimum: 1 }
        },
        required: ['token_amount', 'token_type', 'redemption_type', 'source_wallet_address', 'destination_wallet_address']
      }
    }
  }, async (request: FastifyRequest<{ Body: RedemptionCreateRequest }>, reply: FastifyReply) => {
    try {
      const data = request.body
      
      const result = await validationService.validateRedemptionRequest(data)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to validate redemption request'
      })
    }
  })
}

export default subscriptionRoutes
