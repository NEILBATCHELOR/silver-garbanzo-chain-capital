/**
 * MMF Enhancement Routes - Market Leader Features
 * 
 * API endpoints for 5 enhancement features:
 * 1. Asset Allocation Breakdown
 * 2. Fund-Type Specific Validation
 * 3. Concentration Risk Alerts
 * 4. Fees and Gates Analysis
 * 5. Transaction Impact Analysis
 * 
 * Following Bonds implementation pattern - ZERO HARDCODED VALUES
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import { enhancedMMFModels } from '../../services/nav/models/traditional/EnhancedMMFModels'

// Transaction input schema for impact analysis
const transactionSchema = z.object({
  type: z.enum(['buy', 'sell', 'mature']),
  holdingType: z.string(),
  issuerName: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  maturityDate: z.coerce.date(),
  isGovernmentSecurity: z.boolean(),
  isDailyLiquid: z.boolean(),
  isWeeklyLiquid: z.boolean(),
  creditRating: z.string()
})

export async function mmfEnhancementRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/v1/nav/mmf/:fundId/allocation-breakdown
   * ENHANCEMENT 1: Asset Allocation Tracking
   */
  fastify.get('/mmf/:fundId/allocation-breakdown', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get fund product
      const { data: product, error: productError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', fundId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      // Get holdings
      const { data: holdings, error: holdingsError } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
      
      if (holdingsError || !holdings || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No holdings found for this fund'
        })
      }
      
      // Calculate total value
      const totalValue = holdings.reduce(
        (sum, h) => sum.plus(new Decimal(h.amortized_cost || 0)),
        new Decimal(0)
      )
      
      // Calculate allocation breakdown
      const breakdown = enhancedMMFModels.calculateAllocationBreakdown(
        holdings,
        product.fund_type,
        totalValue
      )
      
      // Convert Decimal to number for JSON response
      const serializedBreakdown = breakdown.map(item => ({
        ...item,
        totalValue: item.totalValue.toNumber()
      }))
      
      return reply.send({
        success: true,
        data: serializedBreakdown
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Allocation breakdown error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/fund-type-validation
   * ENHANCEMENT 2: Fund-Type Specific Validation
   */
  fastify.get('/mmf/:fundId/fund-type-validation', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get fund product
      const { data: product, error: productError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', fundId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      // Get holdings
      const { data: holdings, error: holdingsError } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
      
      if (holdingsError || !holdings || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No holdings found for this fund'
        })
      }
      
      // Calculate total value
      const totalValue = holdings.reduce(
        (sum, h) => sum.plus(new Decimal(h.amortized_cost || 0)),
        new Decimal(0)
      )
      
      // Validate fund-type specific rules
      const compliance = enhancedMMFModels.validateFundTypeSpecificRules(
        product.fund_type,
        holdings,
        totalValue
      )
      
      return reply.send({
        success: true,
        data: compliance
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Fund-type validation error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/concentration-risk
   * ENHANCEMENT 3: Concentration Risk Alerts
   */
  fastify.get('/mmf/:fundId/concentration-risk', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get fund product
      const { data: product, error: productError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', fundId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      // Get holdings
      const { data: holdings, error: holdingsError } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
      
      if (holdingsError || !holdings || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No holdings found for this fund'
        })
      }
      
      // Calculate total value
      const totalValue = holdings.reduce(
        (sum, h) => sum.plus(new Decimal(h.amortized_cost || 0)),
        new Decimal(0)
      )
      
      // Check concentration risk
      const analysis = enhancedMMFModels.checkConcentrationRisk(
        holdings,
        totalValue,
        product.fund_type
      )
      
      // Serialize Decimal values
      const serializedAnalysis = {
        ...analysis,
        topIssuers: analysis.topIssuers.map(issuer => ({
          ...issuer,
          value: issuer.value.toNumber()
        })),
        alerts: analysis.alerts.map(alert => ({
          ...alert,
          totalValue: alert.totalValue.toNumber()
        }))
      }
      
      return reply.send({
        success: true,
        data: serializedAnalysis
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Concentration risk error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/fees-gates-analysis
   * ENHANCEMENT 4: Fees and Gates Mechanism
   */
  fastify.get('/mmf/:fundId/fees-gates-analysis', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get fund product
      const { data: product, error: productError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', fundId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      // Get latest NAV history for liquidity metrics
      const { data: latestNAV, error: navError } = await fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      if (navError || !latestNAV) {
        return reply.code(400).send({
          success: false,
          error: 'No NAV history found for this fund'
        })
      }
      
      // Calculate net redemptions percentage (if available)
      // For now, use 0 as default; in production, calculate from transactions
      const netRedemptionsPercentage = 0
      
      // Evaluate fees and gates
      const analysis = enhancedMMFModels.evaluateFeesGates(
        product.fund_type,
        latestNAV.weekly_liquid_assets_percentage,
        latestNAV.daily_liquid_assets_percentage,
        netRedemptionsPercentage
      )
      
      return reply.send({
        success: true,
        data: analysis
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Fees/gates analysis error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/v1/nav/mmf/:fundId/transaction-impact
   * ENHANCEMENT 5: Transaction Impact Analysis
   */
  fastify.post('/mmf/:fundId/transaction-impact', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Validate transaction input
      const transaction = transactionSchema.parse(request.body)
      
      // Get fund product
      const { data: product, error: productError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', fundId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      // Get holdings
      const { data: holdings, error: holdingsError } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
      
      if (holdingsError || !holdings || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No holdings found for this fund'
        })
      }
      
      // Analyze transaction impact
      const analysis = await enhancedMMFModels.analyzeTransactionImpact(
        transaction,
        holdings,
        product,
        new Date()
      )
      
      // Serialize Decimal values
      const serializedAnalysis = {
        ...analysis,
        transaction: {
          ...analysis.transaction,
          totalValue: analysis.transaction.totalValue.toNumber()
        },
        preTransaction: {
          ...analysis.preTransaction,
          nav: analysis.preTransaction.nav.toNumber()
        },
        postTransaction: {
          ...analysis.postTransaction,
          nav: analysis.postTransaction.nav.toNumber()
        },
        impacts: {
          ...analysis.impacts,
          navChange: analysis.impacts.navChange.toNumber()
        }
      }
      
      return reply.send({
        success: true,
        data: serializedAnalysis
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Transaction impact analysis error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
