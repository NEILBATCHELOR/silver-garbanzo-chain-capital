/**
 * Money Market Fund (MMF) Data Input Routes
 * 
 * API endpoints for MMF product data input
 * Supports: Form submission, CSV upload, API integration
 * 
 * Following Bonds implementation pattern - ZERO HARDCODED VALUES
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validateProductLink } from '../../services/tokens/ProductLinkValidator'

// MMF product schema for validation - ALIGNED WITH DATABASE (fund_products table)
const mmfProductSchema = z.object({
  // Core identification
  project_id: z.string().uuid(),
  fund_ticker: z.string().nullable().optional(),
  fund_name: z.string().min(1),
  fund_type: z.enum(['government', 'prime', 'retail', 'institutional']),
  
  // Financial data
  net_asset_value: z.number().positive().default(1.0), // Target $1.00
  assets_under_management: z.number().min(0),
  expense_ratio: z.number().min(0).max(1).nullable().optional(),
  
  // Reference data
  benchmark_index: z.string().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  
  // Dates
  inception_date: z.coerce.date(),
  
  // Additional
  holdings: z.any().nullable().optional(), // JSON field
  concentration_limits: z.any().nullable().optional(), // JSON field
  status: z.string().default('active')
})

// MMF holding schema - ALIGNED WITH DATABASE (mmf_holdings table)
const mmfHoldingSchema = z.object({
  fund_product_id: z.string().uuid(),
  holding_type: z.enum(['treasury', 'agency', 'commercial_paper', 'cd', 'repo']),
  issuer_name: z.string().min(1),
  issuer_id: z.string().nullable().optional(),
  security_description: z.string(),
  
  // Identifiers
  cusip: z.string().length(9).nullable().optional(),
  isin: z.string().length(12).nullable().optional(),
  
  // Financial terms
  par_value: z.number().positive(),
  purchase_price: z.number().nullable().optional(),
  current_price: z.number().positive(),
  amortized_cost: z.number().positive(), // KEY for NAV calculation
  market_value: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  quantity: z.number().nullable().optional(),
  
  // Yield and maturity
  yield_to_maturity: z.number().nullable().optional(),
  coupon_rate: z.number().nullable().optional(),
  effective_maturity_date: z.coerce.date(),
  final_maturity_date: z.coerce.date(),
  weighted_average_maturity_days: z.number().int().nullable().optional(),
  weighted_average_life_days: z.number().int().nullable().optional(),
  days_to_maturity: z.number().int().nullable().optional(),
  
  // Credit quality
  credit_rating: z.string(), // Must be high quality
  rating_agency: z.string().nullable().optional(),
  is_government_security: z.boolean().default(false),
  
  // Liquidity classification
  is_daily_liquid: z.boolean(),
  is_weekly_liquid: z.boolean(),
  liquidity_classification: z.string().nullable().optional(),
  
  // Dates
  acquisition_date: z.coerce.date(),
  settlement_date: z.coerce.date().nullable().optional(),
  
  // Valuation
  accrued_interest: z.number().nullable().optional(),
  amortization_adjustment: z.number().nullable().optional(),
  shadow_nav_impact: z.number().nullable().optional(),
  stress_test_value: z.number().nullable().optional(),
  
  // Additional
  counterparty: z.string().nullable().optional(),
  collateral_description: z.string().nullable().optional(),
  is_affiliated_issuer: z.boolean().default(false),
  concentration_percentage: z.number().nullable().optional(),
  status: z.string().default('active'),
  notes: z.string().nullable().optional()
})

// MMF NAV history schema
const mmfNAVHistorySchema = z.object({
  fund_product_id: z.string().uuid(),
  valuation_date: z.coerce.date(),
  stable_nav: z.number().positive(), // Target: 1.00
  market_based_nav: z.number().positive(), // Shadow NAV
  deviation_from_stable: z.number().nullable().optional(),
  deviation_bps: z.number().nullable().optional(),
  total_net_assets: z.number().positive(),
  shares_outstanding: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  
  // Yields
  daily_yield: z.number().nullable().optional(),
  seven_day_yield: z.number().nullable().optional(),
  thirty_day_yield: z.number().nullable().optional(),
  effective_yield: z.number().nullable().optional(),
  expense_ratio: z.number().nullable().optional(),
  
  // Compliance metrics
  weighted_average_maturity_days: z.number().int(), // WAM
  weighted_average_life_days: z.number().int(), // WAL
  daily_liquid_assets_percentage: z.number().min(0).max(100), // >= 25%
  weekly_liquid_assets_percentage: z.number().min(0).max(100), // >= 50%
  
  // Compliance flags
  is_wam_compliant: z.boolean(),
  is_wal_compliant: z.boolean(),
  is_liquidity_compliant: z.boolean(),
  is_breaking_the_buck: z.boolean(), // NAV < 0.995
  
  // Additional
  stress_test_result: z.string().nullable().optional(),
  gate_status: z.string(),
  redemption_fee_imposed: z.boolean(),
  total_subscriptions: z.number().nullable().optional(),
  total_redemptions: z.number().nullable().optional(),
  net_flows: z.number().nullable().optional(),
  portfolio_manager_notes: z.string().nullable().optional(),
  regulatory_filing_reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
})

export async function mmfDataInputRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/v1/nav/mmf/upload
   * Create or update MMF product
   */
  fastify.post('/mmf/upload', async (request, reply) => {
    try {
      const validatedData = mmfProductSchema.parse(request.body)
      
      // Check if fund already exists
      const { data: existing } = await fastify.supabase
        .from('fund_products')
        .select('id')
        .eq('fund_name', validatedData.fund_name)
        .eq('project_id', validatedData.project_id)
        .single()
      
      if (existing) {
        // Update existing fund
        const { data: product, error } = await fastify.supabase
          .from('fund_products')
          .update(validatedData)
          .eq('id', existing.id)
          .select()
          .single()
        
        if (error) {
          fastify.log.error({ error }, 'Database update error')
          return reply.code(500).send({
            success: false,
            error: error.message
          })
        }
        
        return reply.send({
          success: true,
          data: product,
          message: 'MMF updated successfully'
        })
      }
      
      // Insert new fund
      const { data: product, error } = await fastify.supabase
        .from('fund_products')
        .insert(validatedData)
        .select()
        .single()
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: product
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf
   * List all MMF products for a project
   */
  fastify.get('/mmf', async (request, reply) => {
    try {
      const { project_id } = request.query as { project_id?: string }
      
      if (!project_id) {
        return reply.code(400).send({
          success: false,
          error: 'project_id is required'
        })
      }
      
      const { data: products, error } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('project_id', project_id)
        .in('fund_type', ['government', 'prime', 'retail', 'institutional'])
        .order('fund_name', { ascending: true })
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: products || []
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId
   * Get single MMF product with holdings
   */
  fastify.get('/mmf/:fundId', async (request, reply) => {
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
      const { data: holdings } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
        .order('acquisition_date', { ascending: false })
      
      // Get latest NAV
      const { data: latestNAV } = await fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      return reply.send({
        success: true,
        data: {
          ...product,
          holdings: holdings || [],
          latestNAV
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * PUT /api/v1/nav/mmf/:fundId
   * Update MMF product by ID
   */
  fastify.put('/mmf/:fundId', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const validatedData = mmfProductSchema.partial().parse(request.body)
      
      // Update existing fund
      const { data: product, error } = await fastify.supabase
        .from('fund_products')
        .update(validatedData)
        .eq('id', fundId)
        .select()
        .single()
      
      if (error) {
        fastify.log.error({ error }, 'Database update error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      if (!product) {
        return reply.code(404).send({
          success: false,
          error: 'MMF product not found'
        })
      }
      
      return reply.send({
        success: true,
        data: product,
        message: 'MMF updated successfully'
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * DELETE /api/v1/nav/mmf/:fundId
   * Delete MMF product
   */
  fastify.delete('/mmf/:fundId', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Delete holdings first (cascade)
      await fastify.supabase
        .from('mmf_holdings')
        .delete()
        .eq('fund_product_id', fundId)
      
      // Delete NAV history
      await fastify.supabase
        .from('mmf_nav_history')
        .delete()
        .eq('fund_product_id', fundId)
      
      // Delete the fund product
      const { error } = await fastify.supabase
        .from('fund_products')
        .delete()
        .eq('id', fundId)
      
      if (error) {
        fastify.log.error({ error }, 'Database delete error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        message: 'MMF deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/v1/nav/mmf/:fundId/holdings
   * Add or update holdings
   */
  fastify.post('/mmf/:fundId/holdings', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const { holdings } = request.body as { holdings: any[] }
      
      if (!Array.isArray(holdings) || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Holdings array is required and must not be empty'
        })
      }
      
      // Validate holdings
      const holdingsSchema = z.array(mmfHoldingSchema)
      const validatedHoldings = holdingsSchema.parse(
        holdings.map(h => ({ ...h, fund_product_id: fundId }))
      )
      
      // Bulk insert
      const { data, error } = await fastify.supabase
        .from('mmf_holdings')
        .insert(validatedHoldings)
        .select()
      
      if (error) {
        fastify.log.error({ error }, 'Database insert error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data,
        count: data?.length || 0
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * PUT /api/v1/nav/mmf/:fundId/holdings/:holdingId
   * Update a specific holding
   */
  fastify.put('/mmf/:fundId/holdings/:holdingId', async (request, reply) => {
    const { fundId, holdingId } = request.params as { fundId: string; holdingId: string }
    
    try {
      // Validate partial holding data
      const partialHoldingSchema = mmfHoldingSchema.partial()
      const validatedData = partialHoldingSchema.parse(request.body)
      
      // Update the holding
      const { data, error } = await fastify.supabase
        .from('mmf_holdings')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', holdingId)
        .eq('fund_product_id', fundId)
        .select()
        .single()
      
      if (error) {
        fastify.log.error({ error }, 'Database update error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      if (!data) {
        return reply.code(404).send({
          success: false,
          error: 'Holding not found'
        })
      }
      
      return reply.send({
        success: true,
        data,
        message: 'Holding updated successfully'
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * DELETE /api/v1/nav/mmf/:fundId/holdings/:holdingId
   * Delete a specific holding
   */
  fastify.delete('/mmf/:fundId/holdings/:holdingId', async (request, reply) => {
    const { fundId, holdingId } = request.params as { fundId: string; holdingId: string }
    
    try {
      const { error } = await fastify.supabase
        .from('mmf_holdings')
        .delete()
        .eq('id', holdingId)
        .eq('fund_product_id', fundId)
      
      if (error) {
        fastify.log.error({ error }, 'Database delete error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        message: 'Holding deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/history
   * Get NAV history for a fund
   */
  fastify.get('/mmf/history', async (request, reply) => {
    try {
      const { fund_product_id, start_date, end_date } = request.query as {
        fund_product_id?: string
        start_date?: string
        end_date?: string
      }
      
      if (!fund_product_id) {
        return reply.code(400).send({
          success: false,
          error: 'fund_product_id is required'
        })
      }
      
      let query = fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fund_product_id)
        .order('valuation_date', { ascending: false })
      
      if (start_date) {
        query = query.gte('valuation_date', start_date)
      }
      if (end_date) {
        query = query.lte('valuation_date', end_date)
      }
      
      const { data, error } = await query
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: data || []
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/history
   * Get NAV history for a specific fund (path param version)
   */
  fastify.get('/mmf/:fundId/history', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const { start_date, end_date } = request.query as {
        start_date?: string
        end_date?: string
      }
      
      let query = fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
      
      if (start_date) {
        query = query.gte('valuation_date', start_date)
      }
      if (end_date) {
        query = query.lte('valuation_date', end_date)
      }
      
      const { data, error } = await query
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: data || []
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/v1/nav/mmf/:fundId/history/latest
   * Get latest NAV history entry
   */
  fastify.get('/mmf/:fundId/history/latest', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const { data, error } = await fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        return reply.code(404).send({
          success: false,
          error: 'No NAV history found'
        })
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/v1/nav/mmf/:fundId/nav-history
   * Add NAV history entry
   */
  fastify.post('/mmf/:fundId/nav-history', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const validatedData = mmfNAVHistorySchema.parse({
        ...(request.body as Record<string, unknown>),
        fund_product_id: fundId
      })
      
      const { data, error } = await fastify.supabase
        .from('mmf_nav_history')
        .insert(validatedData)
        .select()
        .single()
      
      if (error) {
        fastify.log.error({ error }, 'Database insert error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/nav/mmf/token-links
   * Get token links for MMF (if tokenized)
   */
  fastify.get('/mmf/token-links', async (request, reply) => {
    try {
      const { project_id } = request.query as { project_id?: string }
      
      if (!project_id) {
        return reply.code(400).send({
          success: false,
          error: 'project_id is required'
        })
      }
      
      // Get all MMF products for project
      const { data: products, error: productsError } = await fastify.supabase
        .from('fund_products')
        .select('id, fund_name, fund_ticker')
        .eq('project_id', project_id)
        .in('fund_type', ['government', 'prime', 'retail', 'institutional'])
      
      if (productsError) {
        return reply.code(500).send({
          success: false,
          error: productsError.message
        })
      }
      
      if (!products || products.length === 0) {
        return reply.send({
          success: true,
          data: []
        })
      }
      
      // Get token links for these products
      const productIds = products.map(p => p.id)
      
      const { data: tokens, error: tokensError } = await fastify.supabase
        .from('tokens')
        .select('*')
        .in('product_id', productIds)
        .not('product_id', 'is', null)
      
      if (tokensError) {
        return reply.code(500).send({
          success: false,
          error: tokensError.message
        })
      }
      
      // Transform the data to match frontend expectations
      const tokenLinks = (tokens || []).map(token => {
        const product = products.find(p => p.id === token.product_id)
        return {
          id: token.id,
          mmf_id: token.product_id,
          token_id: token.id,
          token_name: token.name,
          token_symbol: token.symbol,
          mmf_name: product?.fund_name || product?.fund_ticker || 'Unknown MMF',
          parity: token.parity || 1.0,
          ratio: token.ratio || 1.0,
          effective_date: token.created_at,
          status: token.status || 'active',
          created_at: token.created_at
        }
      })
      
      return reply.send({
        success: true,
        data: tokenLinks
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * GET /api/nav/mmf/token-links/latest
   * Get latest token link data
   */
  fastify.get('/mmf/token-links/latest', async (request, reply) => {
    try {
      const { product_id } = request.query as { product_id?: string }
      
      if (!product_id) {
        return reply.code(400).send({
          success: false,
          error: 'product_id is required'
        })
      }
      
      const { data, error } = await fastify.supabase
        .from('product_token_links')
        .select('*')
        .eq('product_id', product_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        return reply.code(404).send({
          success: false,
          error: 'No token link found'
        })
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/v1/nav/mmf/:fundId/validate
   * Validate MMF data comprehensively
   */
  fastify.post('/mmf/:fundId/validate', async (request, reply) => {
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
      const { data: holdings } = await fastify.supabase
        .from('mmf_holdings')
        .select('*')
        .eq('fund_product_id', fundId)
        .eq('status', 'active')
      
      // Get latest NAV history
      const { data: navHistory } = await fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(30)
      
      // Validate data
      const validation = {
        productValid: true,
        holdingsCount: holdings?.length || 0,
        hasHoldings: (holdings?.length || 0) > 0,
        navHistoryCount: navHistory?.length || 0,
        hasNavHistory: (navHistory?.length || 0) > 0,
        issues: [] as string[]
      }
      
      // Check for issues
      if (!validation.hasHoldings) {
        validation.issues.push('No holdings found - MMF must have at least one holding')
      }
      
      if (holdings && holdings.length > 0) {
        // Check concentration (no more than 5% per issuer)
        const issuerConcentration = holdings.reduce((acc, h) => {
          const issuer = h.issuer_name
          acc[issuer] = (acc[issuer] || 0) + h.amortized_cost
          return acc
        }, {} as Record<string, number>)
        
        const totalValue = holdings.reduce((sum, h) => sum + h.amortized_cost, 0)
        
        Object.entries(issuerConcentration).forEach(([issuer, value]) => {
          const concentration = ((value as number) / totalValue) * 100
          if (concentration > 5) {
            validation.issues.push(`Issuer ${issuer} exceeds 5% concentration limit: ${concentration.toFixed(2)}%`)
          }
        })
      }
      
      return reply.send({
        success: true,
        validation
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Validation error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      })
    }
  })

  /**
   * GET /api/v1/nav/mmf/:fundId/token-links
   * Get token links for a specific MMF
   */
  fastify.get('/mmf/:fundId/token-links', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get all tokens linked to this MMF
      const { data: tokens, error: tokensError } = await fastify.supabase
        .from('tokens')
        .select('id, name, symbol, product_id, ratio, parity, status, created_at, updated_at')
        .eq('product_id', fundId)
      
      if (tokensError) {
        fastify.log.error({ error: tokensError }, 'Database error fetching token links')
        return reply.code(500).send({
          success: false,
          error: tokensError.message
        })
      }
      
      return reply.send({
        success: true,
        data: tokens || [],
        count: tokens?.length || 0
      })
      
    } catch (error) {
      fastify.log.error({ error, fundId }, 'Unexpected error fetching token links')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })

  /**
   * POST /api/v1/nav/mmf/:fundId/token-links
   * Link a token to this MMF by updating token's product_id, ratio, and parity
   * Body: { tokenId: string, parityRatio: number, collateralizationPercentage: number }
   */
  fastify.post('/mmf/:fundId/token-links', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    const { tokenId, parityRatio, collateralizationPercentage } = request.body as {
      tokenId: string
      parityRatio: number
      collateralizationPercentage: number
    }
    
    try {
      // Validate inputs
      if (!tokenId) {
        return reply.code(400).send({
          success: false,
          error: 'tokenId is required'
        })
      }
      
      if (!parityRatio || parityRatio <= 0) {
        return reply.code(400).send({
          success: false,
          error: 'parityRatio must be a positive number'
        })
      }
      
      // Validate that the MMF product exists in fund_products
      const productValidation = await validateProductLink(fastify.supabase, fundId, 'mmf')
      if (!productValidation.isValid) {
        return reply.code(404).send({
          success: false,
          error: productValidation.error || 'MMF product not found'
        })
      }
      
      // Check if token exists
      const { data: token, error: tokenError } = await fastify.supabase
        .from('tokens')
        .select('id, product_id, product_type, project_id')
        .eq('id', tokenId)
        .single()
      
      if (tokenError || !token) {
        return reply.code(404).send({
          success: false,
          error: 'Token not found'
        })
      }
      
      // Check if token is already linked to another product
      if (token.product_id && token.product_id !== fundId) {
        const linkedProductType = token.product_type || 'unknown'
        return reply.code(400).send({
          success: false,
          error: `Token is already linked to another ${linkedProductType} product (${token.product_id}). Unlink first.`
        })
      }
      
      // Update token with MMF link
      const ratio = collateralizationPercentage / 100
      
      const { data: updatedToken, error: updateError } = await fastify.supabase
        .from('tokens')
        .update({
          product_id: fundId,
          product_type: 'mmf',  // Specify this is an MMF product
          ratio: ratio,
          parity: parityRatio,
          status: 'DEPLOYED'  // Use uppercase enum value
        })
        .eq('id', tokenId)
        .select()
        .single()
      
      if (updateError) {
        return reply.code(500).send({
          success: false,
          error: updateError.message
        })
      }
      
      return reply.send({
        success: true,
        data: updatedToken
      })
      
    } catch (error) {
      fastify.log.error({ error, fundId, tokenId }, 'Unexpected error creating token link')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })

  /**
   * DELETE /api/v1/nav/mmf/:fundId/token-links/:tokenId
   * Unlink a token from this MMF by clearing token's product_id, ratio, and parity
   */
  fastify.delete('/mmf/:fundId/token-links/:tokenId', async (request, reply) => {
    const { fundId, tokenId } = request.params as { fundId: string; tokenId: string }
    
    try {
      // Verify token is linked to this MMF
      const { data: token, error: tokenError } = await fastify.supabase
        .from('tokens')
        .select('id, product_id')
        .eq('id', tokenId)
        .single()
      
      if (tokenError || !token) {
        return reply.code(404).send({
          success: false,
          error: 'Token not found'
        })
      }
      
      if (token.product_id !== fundId) {
        return reply.code(400).send({
          success: false,
          error: 'Token is not linked to this MMF'
        })
      }
      
      // Unlink token
      const { error: unlinkError } = await fastify.supabase
        .from('tokens')
        .update({
          product_id: null,
          ratio: null,
          parity: null
        })
        .eq('id', tokenId)
      
      if (unlinkError) {
        return reply.code(500).send({
          success: false,
          error: unlinkError.message
        })
      }
      
      return reply.send({
        success: true,
        message: 'Token link deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error, fundId, tokenId }, 'Unexpected error deleting token link')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })

  /**
   * PUT /api/v1/nav/mmf/:fundId/token-links/:tokenId
   * Update token link parameters (ratio, parity)
   */
  fastify.put('/mmf/:fundId/token-links/:tokenId', async (request, reply) => {
    const { fundId, tokenId } = request.params as { fundId: string; tokenId: string }
    const { parityRatio, collateralizationPercentage } = request.body as {
      parityRatio?: number
      collateralizationPercentage?: number
    }
    
    try {
      // Verify token is linked to this MMF
      const { data: token, error: tokenError } = await fastify.supabase
        .from('tokens')
        .select('id, product_id')
        .eq('id', tokenId)
        .single()
      
      if (tokenError || !token) {
        return reply.code(404).send({
          success: false,
          error: 'Token not found'
        })
      }
      
      if (token.product_id !== fundId) {
        return reply.code(400).send({
          success: false,
          error: 'Token is not linked to this MMF'
        })
      }
      
      // Build update object
      const updateData: any = {}
      
      if (parityRatio !== undefined) {
        if (parityRatio <= 0) {
          return reply.code(400).send({
            success: false,
            error: 'parityRatio must be a positive number'
          })
        }
        updateData.parity = parityRatio
      }
      
      if (collateralizationPercentage !== undefined) {
        updateData.ratio = collateralizationPercentage / 100
      }
      
      // Update token
      const { data: updatedToken, error: updateError } = await fastify.supabase
        .from('tokens')
        .update(updateData)
        .eq('id', tokenId)
        .select()
        .single()
      
      if (updateError) {
        return reply.code(500).send({
          success: false,
          error: updateError.message
        })
      }
      
      return reply.send({
        success: true,
        data: updatedToken
      })
      
    } catch (error) {
      fastify.log.error({ error, fundId, tokenId }, 'Unexpected error updating token link')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })

  /**
   * POST /api/v1/nav/mmf/:fundId/holdings/bulk
   * Bulk upload MMF holdings via CSV data
   */
  fastify.post('/mmf/:fundId/holdings/bulk', async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      const { holdings } = request.body as { holdings: any[] }
      
      if (!Array.isArray(holdings) || holdings.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Holdings array is required and must not be empty'
        })
      }
      
      // Validate each holding
      const errors: Array<{
        row: number
        field: string
        message: string
        value: unknown
      }> = []
      
      const validatedHoldings: any[] = []
      
      holdings.forEach((holding, index) => {
        try {
          const validated = mmfHoldingSchema.parse({
            ...holding,
            fund_product_id: fundId
          })
          validatedHoldings.push(validated)
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
              errors.push({
                row: index + 1,
                field: err.path.join('.'),
                message: err.message,
                value: holding[err.path[0] as string]
              })
            })
          }
        }
      })
      
      // If there are validation errors, return them
      if (errors.length > 0) {
        return reply.code(400).send({
          success: false,
          totalRows: holdings.length,
          successCount: validatedHoldings.length,
          failureCount: errors.length,
          errors
        })
      }
      
      // Bulk insert all validated holdings
      const { data, error } = await fastify.supabase
        .from('mmf_holdings')
        .insert(validatedHoldings)
        .select()
      
      if (error) {
        fastify.log.error({ error }, 'Database bulk insert error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        totalRows: holdings.length,
        successCount: data?.length || 0,
        failureCount: 0,
        errors: []
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error in bulk upload')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * GET /api/v1/nav/mmf/template/holdings
   * Download CSV template for holdings upload
   */
  fastify.get('/mmf/template/holdings', async (request, reply) => {
    try {
      // CSV template with all required and optional fields
      const csvTemplate = [
        // Header row
        'holding_type,issuer_name,security_description,cusip,isin,par_value,purchase_price,current_price,amortized_cost,market_value,currency,quantity,yield_to_maturity,coupon_rate,effective_maturity_date,final_maturity_date,weighted_average_maturity_days,weighted_average_life_days,days_to_maturity,credit_rating,rating_agency,is_government_security,is_daily_liquid,is_weekly_liquid,liquidity_classification,acquisition_date,settlement_date,accrued_interest,amortization_adjustment,shadow_nav_impact,stress_test_value,counterparty,collateral_description,is_affiliated_issuer,concentration_percentage,notes',
        // Example row 1: Treasury Bill
        'treasury,U.S. Treasury,Treasury Bill 3-Month,912796YR4,US912796YR43,1000000,999500,999800,999800,999800,USD,1000,3.85,0,2025-01-15,2025-01-15,90,90,90,AAA,S&P,true,true,true,daily,2024-10-16,2024-10-16,0,0,0,0,,,false,0,',
        // Example row 2: Commercial Paper
        'commercial_paper,XYZ Corporation,90-Day Commercial Paper,12345ABC7,US12345ABC78,500000,498500,498800,498800,498800,USD,500,4.15,0,2025-01-15,2025-01-15,90,90,90,A-1,S&P,false,false,true,weekly,2024-10-16,2024-10-16,0,0,0,0,,,false,0,High-quality issuer',
        // Example row 3: Agency Security
        'agency,Fannie Mae,FNMA 3-Month Note,31331XYZ1,US31331XYZ12,750000,749000,749500,749500,749500,USD,750,3.95,0,2025-01-15,2025-01-15,90,90,90,AA+,S&P,true,false,true,weekly,2024-10-16,2024-10-16,0,0,0,0,,,false,0,'
      ].join('\n')
      
      // Set headers for CSV download
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', 'attachment; filename="mmf_holdings_template.csv"')
      
      return reply.send(csvTemplate)
      
    } catch (error) {
      fastify.log.error({ error }, 'Error generating holdings template')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
