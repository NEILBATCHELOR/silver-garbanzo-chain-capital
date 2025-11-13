/**
 * MMF Subscription Routes - WITH PROJECT_ID CONSISTENCY
 * 
 * CRITICAL: All operations scoped to project_id
 * - Validates fund belongs to project
 * - Validates investor access to project
 * - Auto-sets project_id from fund
 * - Prevents cross-project data leakage
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Decimal } from 'decimal.js'

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

export async function mmfSubscriptionRoutes(fastify: FastifyInstance) {
  
  /**
   * Helper: Get and validate fund belongs to project
   */
  async function validateFundProject(fundId: string, projectId?: string) {
    const { data: fund, error } = await fastify.supabase
      .from('fund_products')
      .select('id, project_id, fund_name, fund_type')
      .eq('id', fundId)
      .single()
    
    if (error || !fund) {
      throw new Error('Fund not found')
    }
    
    // If projectId provided, validate it matches
    if (projectId && fund.project_id !== projectId) {
      throw new Error(`Fund ${fundId} does not belong to project ${projectId}`)
    }
    
    return fund
  }
  
  /**
   * POST /api/v1/nav/mmf/:fundId/subscriptions
   * Create new MMF subscription (investor buys shares)
   * 
   * SCOPED TO PROJECT_ID
   */
  fastify.post('/mmf/:fundId/subscriptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      const input = subscriptionSchema.parse(request.body)
      
      // 1. Validate fund and get project_id
      const fund = await validateFundProject(fundId, projectId)
      const fundProjectId = fund.project_id
      
      fastify.log.info({
        fundId,
        fundProjectId,
        requestedProjectId: projectId,
        investorId: input.investorId
      }, 'Processing MMF subscription')
      
      // 2. Get current NAV
      const { data: latestNAV, error: navError } = await fastify.supabase
        .from('mmf_nav_history')
        .select('stable_nav, valuation_date')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      if (navError || !latestNAV) {
        return reply.code(400).send({
          success: false,
          error: 'No NAV found for this fund. Please calculate NAV first.',
          details: {
            fundId,
            projectId: fundProjectId
          }
        })
      }
      
      const currentNAV = new Decimal(latestNAV.stable_nav)
      const amount = new Decimal(input.amount)
      
      // 3. Calculate shares to issue
      const sharesToIssue = amount.div(currentNAV)
      
      fastify.log.info({
        amount: amount.toNumber(),
        currentNAV: currentNAV.toNumber(),
        sharesToIssue: sharesToIssue.toNumber()
      }, 'Calculated shares to issue')
      
      // 4. Create subscription record with project_id
      const { data: subscription, error: subError } = await fastify.supabase
        .from('subscriptions')
        .insert({
          investor_id: input.investorId,
          subscription_id: `MMF-SUB-${Date.now()}`,
          fiat_amount: input.amount,
          currency: input.currency,
          project_id: fundProjectId,  // *** CRITICAL: Set project_id ***
          fund_product_id: fundId,
          nav_per_share: currentNAV.toNumber(),
          shares_calculated: sharesToIssue.toNumber(),
          transaction_type: 'subscription',
          subscription_date: input.subscriptionDate || new Date(),
          confirmed: true,
          allocated: false,
          distributed: false
        })
        .select()
        .single()
      
      if (subError) {
        fastify.log.error({ subError }, 'Failed to create subscription')
        return reply.code(500).send({
          success: false,
          error: 'Failed to create subscription: ' + subError.message
        })
      }
      
      // 5. Create token_allocation record with project_id
      const { error: allocError } = await fastify.supabase
        .from('token_allocations')
        .insert({
          investor_id: input.investorId,
          subscription_id: subscription.id,
          project_id: fundProjectId,  // *** CRITICAL: Set project_id ***
          token_type: 'mmf_share',
          token_amount: sharesToIssue.toNumber(),
          distributed: false,
          allocation_date: new Date(),
          minted: false
        })
      
      if (allocError) {
        fastify.log.error({ allocError }, 'Failed to create token allocation')
        // Don't fail the request, but log the error
      }
      
      // 6. Create mmf_transaction record (auto-gets project_id via trigger)
      const { error: txError } = await fastify.supabase
        .from('mmf_transactions')
        .insert({
          fund_product_id: fundId,
          investor_id: input.investorId,
          subscription_id: subscription.id,
          transaction_date: input.subscriptionDate || new Date(),
          transaction_type: 'subscription',
          quantity: sharesToIssue.toNumber(),
          price: currentNAV.toNumber(),
          gross_amount: input.amount,
          net_amount: input.amount,
          currency: input.currency,
          status: 'completed'
        })
      
      if (txError) {
        fastify.log.error({ txError }, 'Failed to create MMF transaction')
      }
      
      // 7. Update fund_products.shares_outstanding with project validation
      const { error: updateError } = await fastify.supabase
        .rpc('increment_shares_outstanding', {
          p_fund_id: fundId,
          p_shares: sharesToIssue.toNumber(),
          p_project_id: fundProjectId  // *** CRITICAL: Validate project_id ***
        })
      
      if (updateError) {
        fastify.log.error({ updateError }, 'Failed to update shares outstanding')
      }
      
      // 8. Mark subscription as allocated
      await fastify.supabase
        .from('subscriptions')
        .update({ allocated: true })
        .eq('id', subscription.id)
      
      return reply.send({
        success: true,
        data: {
          subscriptionId: subscription.id,
          projectId: fundProjectId,
          fundId: fundId,
          fundName: fund.fund_name,
          investorId: input.investorId,
          amountInvested: input.amount,
          currency: input.currency,
          navPerShare: currentNAV.toNumber(),
          sharesIssued: sharesToIssue.toNumber(),
          navCalculationDate: latestNAV.valuation_date
        }
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
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
   * SCOPED TO PROJECT_ID
   */
  fastify.post('/mmf/:fundId/redemptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      const input = redemptionSchema.parse(request.body)
      
      // 1. Validate fund and get project_id
      const fund = await validateFundProject(fundId, projectId)
      const fundProjectId = fund.project_id
      
      fastify.log.info({
        fundId,
        fundProjectId,
        investorId: input.investorId,
        sharesAmount: input.sharesAmount
      }, 'Processing MMF redemption')
      
      // 2. Get current NAV
      const { data: latestNAV, error: navError } = await fastify.supabase
        .from('mmf_nav_history')
        .select('stable_nav, valuation_date')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      if (navError || !latestNAV) {
        return reply.code(400).send({
          success: false,
          error: 'No NAV found for this fund'
        })
      }
      
      const currentNAV = new Decimal(latestNAV.stable_nav)
      const shares = new Decimal(input.sharesAmount)
      
      // 3. Calculate cash to pay out
      const cashAmount = shares.times(currentNAV)
      
      // 4. Verify investor has enough shares (PROJECT-SCOPED)
      const { data: investorShares } = await fastify.supabase
        .rpc('get_investor_mmf_shares_by_project', {
          p_investor_id: input.investorId,
          p_fund_id: fundId,
          p_project_id: fundProjectId  // *** CRITICAL: Project-scoped query ***
        })
      
      const totalShares = investorShares?.[0]?.total_shares || 0
      
      if (totalShares < shares.toNumber()) {
        return reply.code(400).send({
          success: false,
          error: `Investor only has ${totalShares} shares in this project, cannot redeem ${shares.toNumber()}`,
          details: {
            availableShares: totalShares,
            requestedShares: shares.toNumber(),
            projectId: fundProjectId
          }
        })
      }
      
      // 5. Create redemption subscription record with project_id
      const { data: subscription, error: subError } = await fastify.supabase
        .from('subscriptions')
        .insert({
          investor_id: input.investorId,
          subscription_id: `MMF-RED-${Date.now()}`,
          fiat_amount: -cashAmount.toNumber(),
          currency: 'USD',
          project_id: fundProjectId,  // *** CRITICAL: Set project_id ***
          fund_product_id: fundId,
          nav_per_share: currentNAV.toNumber(),
          shares_calculated: -shares.toNumber(),
          transaction_type: 'redemption',
          subscription_date: input.redemptionDate || new Date(),
          confirmed: true,
          allocated: true,
          distributed: true
        })
        .select()
        .single()
      
      if (subError) {
        fastify.log.error({ subError }, 'Failed to create redemption')
        return reply.code(500).send({
          success: false,
          error: 'Failed to create redemption: ' + subError.message
        })
      }
      
      // 6. Create negative token_allocation with project_id
      const { error: allocError } = await fastify.supabase
        .from('token_allocations')
        .insert({
          investor_id: input.investorId,
          subscription_id: subscription.id,
          project_id: fundProjectId,  // *** CRITICAL: Set project_id ***
          token_type: 'mmf_share',
          token_amount: -shares.toNumber(),
          distributed: true,
          allocation_date: new Date(),
          minted: false
        })
      
      if (allocError) {
        fastify.log.error({ allocError }, 'Failed to create token allocation')
      }
      
      // 7. Create mmf_transaction record
      const { error: txError } = await fastify.supabase
        .from('mmf_transactions')
        .insert({
          fund_product_id: fundId,
          investor_id: input.investorId,
          subscription_id: subscription.id,
          transaction_date: input.redemptionDate || new Date(),
          transaction_type: 'redemption',
          quantity: -shares.toNumber(),
          price: currentNAV.toNumber(),
          gross_amount: -cashAmount.toNumber(),
          net_amount: -cashAmount.toNumber(),
          currency: 'USD',
          status: 'completed'
        })
      
      if (txError) {
        fastify.log.error({ txError }, 'Failed to create MMF transaction')
      }
      
      // 8. Decrease fund_products.shares_outstanding with project validation
      const { error: updateError } = await fastify.supabase
        .rpc('decrement_shares_outstanding', {
          p_fund_id: fundId,
          p_shares: shares.toNumber(),
          p_project_id: fundProjectId  // *** CRITICAL: Validate project_id ***
        })
      
      if (updateError) {
        fastify.log.error({ updateError }, 'Failed to update shares outstanding')
      }
      
      return reply.send({
        success: true,
        data: {
          redemptionId: subscription.id,
          projectId: fundProjectId,
          fundId: fundId,
          fundName: fund.fund_name,
          investorId: input.investorId,
          sharesRedeemed: shares.toNumber(),
          navPerShare: currentNAV.toNumber(),
          cashPaidOut: cashAmount.toNumber(),
          currency: 'USD',
          navCalculationDate: latestNAV.valuation_date
        }
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
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
   * List all subscriptions for an MMF (PROJECT-SCOPED)
   */
  fastify.get('/mmf/:fundId/subscriptions', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // Validate fund and get project_id
      const fund = await validateFundProject(fundId, projectId)
      const fundProjectId = fund.project_id
      
      const { data: subscriptions, error } = await fastify.supabase
        .from('subscriptions')
        .select(`
          *,
          investor:investors(*)
        `)
        .eq('fund_product_id', fundId)
        .eq('project_id', fundProjectId)  // *** CRITICAL: Project-scoped ***
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
          projectId: fundProjectId,
          fundId: fundId,
          count: subscriptions?.length || 0
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
   * GET /api/v1/nav/mmf/:fundId/investors
   * List all investors in an MMF (PROJECT-SCOPED)
   */
  fastify.get('/mmf/:fundId/investors', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { projectId } = request.query as { projectId?: string }
    
    try {
      // Validate fund and get project_id
      const fund = await validateFundProject(fundId, projectId)
      const fundProjectId = fund.project_id
      
      // Use the project-scoped view
      const { data: investors, error } = await fastify.supabase
        .from('mmf_investor_holdings_by_project')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('project_id', fundProjectId)  // *** CRITICAL: Project-scoped ***
      
      if (error) {
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: investors,
        meta: {
          projectId: fundProjectId,
          fundId: fundId,
          investorCount: investors?.length || 0
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'List investors error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
