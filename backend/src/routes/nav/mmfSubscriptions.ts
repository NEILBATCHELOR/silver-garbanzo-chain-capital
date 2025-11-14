/**
 * MMF Subscription Routes - REFACTORED FOR SERVICE INTEGRATION
 * 
 * ARCHITECTURE: Delegates to MMFInvestorService for all operations
 * - Service handles all business logic
 * - Service manages database transactions
 * - Routes only handle HTTP concerns (validation, responses)
 * 
 * CRITICAL: All operations scoped to project_id via service layer
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MMFInvestorService } from '../../services/nav/MMFInvestorService'

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

// Subscription creation schema
const subscriptionSchema = z.object({
  investorId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  subscriptionDate: z.coerce.date().optional()
})

// Redemption schema
const redemptionSchema = z.object({
  investorId: z.string().uuid(),
  sharesAmount: z.number().positive(),
  redemptionDate: z.coerce.date().optional()
})

// =====================================================
// ROUTE REGISTRATION
// =====================================================

export async function mmfSubscriptionRoutes(fastify: FastifyInstance) {
  
  // Initialize service
  const mmfInvestorService = new MMFInvestorService(fastify.supabase)
  
  /**
   * POST /api/v1/nav/mmf/:fundId/subscriptions
   * Create new MMF subscription (investor buys shares)
   * 
   * INTEGRATION APPROACH:
   * - Validates input (route responsibility)
   * - Delegates to MMFInvestorService (business logic)
   * - Formats response (route responsibility)
   */
  fastify.post('/mmf/:fundId/subscriptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // 1. Validate input
      const input = subscriptionSchema.parse(request.body)
      
      fastify.log.info({
        fundId,
        requestedProjectId: projectId,
        investorId: input.investorId,
        amount: input.amount
      }, 'Processing MMF subscription request')
      
      // 2. Delegate to service (handles ALL business logic)
      const result = await mmfInvestorService.processSubscription({
        fundId,
        investorId: input.investorId,
        amount: input.amount,
        currency: input.currency,
        subscriptionDate: input.subscriptionDate,
        projectId
      })
      
      // 3. Handle service response
      if (!result.success) {
        const statusCode = result.code === 'NOT_FOUND' ? 404 
          : result.code === 'NAV_NOT_FOUND' ? 400
          : result.code === 'PROJECT_MISMATCH' ? 403
          : 400
        
        return reply.code(statusCode).send({
          success: false,
          error: result.error,
          code: result.code
        })
      }
      
      // 4. Format success response
      return reply.send({
        success: true,
        data: result.data
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Subscription error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/v1/nav/mmf/:fundId/redemptions
   * Process MMF redemption (investor sells shares)
   * 
   * INTEGRATION APPROACH:
   * - Validates input (route responsibility)
   * - Delegates to MMFInvestorService (business logic)
   * - Formats response (route responsibility)
   */
  fastify.post('/mmf/:fundId/redemptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // 1. Validate input
      const input = redemptionSchema.parse(request.body)
      
      fastify.log.info({
        fundId,
        requestedProjectId: projectId,
        investorId: input.investorId,
        sharesAmount: input.sharesAmount
      }, 'Processing MMF redemption request')
      
      // 2. Delegate to service (handles ALL business logic)
      const result = await mmfInvestorService.processRedemption({
        fundId,
        investorId: input.investorId,
        shares: input.sharesAmount,
        redemptionDate: input.redemptionDate,
        projectId
      })
      
      // 3. Handle service response
      if (!result.success) {
        const statusCode = result.code === 'NOT_FOUND' ? 404
          : result.code === 'NAV_NOT_FOUND' ? 400
          : result.code === 'PROJECT_MISMATCH' ? 403
          : result.code === 'INSUFFICIENT_SHARES' ? 400
          : 400
        
        return reply.code(statusCode).send({
          success: false,
          error: result.error,
          code: result.code
        })
      }
      
      // 4. Format success response
      return reply.send({
        success: true,
        data: result.data
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Redemption error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/subscriptions
   * List all subscriptions for an MMF
   * 
   * Returns both subscriptions and redemptions (filtered by fund_product_id)
   */
  fastify.get('/mmf/:fundId/subscriptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // 1. Validate fund belongs to project
      const fundValidation = await mmfInvestorService.validateFundProject(fundId, projectId)
      if (!fundValidation.success) {
        const statusCode = typeof fundValidation.code === 'number' ? fundValidation.code : 400
        return reply.code(statusCode).send({
          success: false,
          error: fundValidation.error
        })
      }
      
      const validatedProjectId = fundValidation.data?.project_id
      
      // 2. Query subscriptions with project_id filter
      const { data: subscriptions, error } = await fastify.supabase
        .from('subscriptions')
        .select(`
          *,
          investor:investors(
            investor_id,
            name,
            email,
            type
          )
        `)
        .eq('product_id', fundId)
        .eq('project_id', validatedProjectId) // *** PROJECT SCOPED ***
        .order('subscription_date', { ascending: false })
      
      if (error) {
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: subscriptions,
        meta: {
          total: subscriptions?.length || 0,
          fundId,
          projectId: validatedProjectId
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'List subscriptions error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/investor/:investorId/shares
   * Get investor's current share balance for an MMF
   */
  fastify.get('/mmf/:fundId/investor/:investorId/shares', async (request, reply) => {
    const { fundId, investorId } = request.params as { fundId: string; investorId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // 1. Validate fund belongs to project
      const fundValidation = await mmfInvestorService.validateFundProject(fundId, projectId)
      if (!fundValidation.success) {
        const statusCode = typeof fundValidation.code === 'number' ? fundValidation.code : 400
        return reply.code(statusCode).send({
          success: false,
          error: fundValidation.error
        })
      }
      
      // 2. Get investor shares
      const sharesResult = await mmfInvestorService.verifyInvestorShares(investorId, 0)
      if (!sharesResult.success) {
        return reply.code(500).send({
          success: false,
          error: sharesResult.error
        })
      }
      
      // 3. Get current NAV
      const navResult = await mmfInvestorService.getLatestNAV(fundId)
      const currentValue = sharesResult.data && navResult.success && navResult.data
        ? sharesResult.data.total_shares * navResult.data.stable_nav
        : null
      
      return reply.send({
        success: true,
        data: {
          investorId,
          fundId,
          totalShares: sharesResult.data?.total_shares || 0,
          currentNAV: navResult.data?.stable_nav || null,
          currentValue,
          navDate: navResult.data?.valuation_date || null
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Get investor shares error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
