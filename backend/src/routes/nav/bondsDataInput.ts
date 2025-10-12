/**
 * Bond Data Input Routes
 * 
 * API endpoints for bond product data input
 * Supports: Form submission, CSV upload, API integration
 * 
 * Following Phase 6 specifications - ZERO HARDCODED VALUES
 * FIXED: Schema now matches actual database columns
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// Bond product schema for validation - ALIGNED WITH DATABASE
const bondProductSchema = z.object({
  // Core identification
  project_id: z.string().uuid(),
  asset_name: z.string().min(1).optional(),
  
  // Identifiers - with strict length validation to match database constraints
  isin: z.string().length(12, 'ISIN must be 12 characters').nullish().or(z.literal('')),
  cusip: z.string().length(9, 'CUSIP must be 9 characters').nullish().or(z.literal('')),
  sedol: z.string().length(7, 'SEDOL must be 7 characters').nullish().or(z.literal('')),
  bond_identifier: z.string().optional(),
  
  // Issuer information
  issuer_name: z.string().min(1),
  issuer_type: z.enum(['sovereign', 'corporate', 'financial', 'government_agency', 'supranational']).optional(),
  seniority: z.enum(['senior_secured', 'senior_unsecured', 'subordinated', 'junior']).optional(),
  
  // Bond classification
  bond_type: z.enum(['government', 'corporate', 'municipal', 'agency', 'supranational', 'asset_backed']),
  
  // Financial terms
  face_value: z.number().positive(), // Changed from par_value
  currency: z.string().length(3),
  coupon_rate: z.number().min(0).max(1),
  coupon_frequency: z.string().optional(), // Changed to string to match DB
  
  // Dates
  issue_date: z.coerce.date(),
  maturity_date: z.coerce.date(),
  purchase_date: z.coerce.date().optional(),
  
  // Pricing
  purchase_price: z.number().optional(),
  current_price: z.number().optional(),
  yield_to_maturity: z.number().optional(),
  duration: z.number().optional(),
  
  // Accounting
  accounting_treatment: z.enum(['held_to_maturity', 'available_for_sale', 'trading']).optional(), // Changed from accounting_classification
  day_count_convention: z.string().optional(),
  
  // Features
  callable_flag: z.boolean().default(false),
  callable_features: z.boolean().optional(),
  puttable: z.boolean().default(false),
  convertible: z.boolean().default(false),
  
  // Additional
  credit_rating: z.string().optional(),
  status: z.string().default('active')
})

// Coupon payment schema - ALIGNED WITH DATABASE
const couponPaymentSchema = z.object({
  payment_date: z.coerce.date(),
  coupon_amount: z.number().positive(),
  payment_status: z.enum(['scheduled', 'paid', 'missed', 'deferred']).default('scheduled'),
  actual_payment_date: z.coerce.date().optional(),
  accrual_start_date: z.coerce.date(),
  accrual_end_date: z.coerce.date(),
  days_in_period: z.number().int().positive()
})

// Market price schema - ALIGNED WITH DATABASE
const marketPriceSchema = z.object({
  price_date: z.coerce.date(),
  price_time: z.string().optional(),
  clean_price: z.number().positive(),
  dirty_price: z.number().optional(),
  bid_price: z.number().optional(),
  ask_price: z.number().optional(),
  mid_price: z.number().optional(),
  ytm: z.number().optional(),
  spread_to_benchmark: z.number().optional(),
  data_source: z.enum(['bloomberg', 'reuters', 'ice', 'tradeweb', 'markit', 'internal_pricing', 'vendor']),
  is_official_close: z.boolean().default(false)
})

export async function bondDataInputRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/v1/nav/bonds/:bondId/validate
   * Comprehensive data validation with detailed error reporting
   * Returns ALL validation errors with fix instructions
   */
  fastify.post('/bonds/:bondId/validate', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      // Import validator and fetcher
      const { enhancedBondsValidator } = await import(
        '../../services/nav/calculators/validators/EnhancedBondsValidator'
      )
      const { BondsDataFetcher } = await import(
        '../../services/nav/data-fetchers/traditional/BondsDataFetcher'
      )
      
      // Fetch bond data
      const fetcher = new BondsDataFetcher(fastify.supabase)
      const result = await fetcher.fetch({ 
        productId: bondId, 
        asOfDate: new Date() 
      })
      
      if (!result.success || !result.data) {
        return reply.code(404).send({
          success: false,
          error: 'Bond not found or data fetch failed'
        })
      }
      
      // Validate comprehensively
      const validation = enhancedBondsValidator.validateDataComprehensive(
        result.data.product,
        result.data.supporting
      )
      
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
   * POST /api/v1/nav/bonds/data
   * Submit bond product data
   */
  fastify.post('/bonds/data', async (request, reply) => {
    try {
      // Validate request body
      const validatedData = bondProductSchema.parse(request.body)
      
      // Additional validation: maturity > issue
      if (validatedData.maturity_date <= validatedData.issue_date) {
        return reply.code(400).send({
          success: false,
          errors: [{
            field: 'maturity_date',
            message: 'Maturity date must be after issue date'
          }]
        })
      }
      
      // Insert into database
      const { data: product, error } = await fastify.supabase
        .from('bond_products')
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
            message: e.message,
            ...(('input' in e) && { value: e.input })
          }))
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })
  
  /**
   * POST /api/v1/nav/bonds/:bondId/coupon-payments
   * Add coupon payment schedule
   * ENHANCED: Added debug logging for troubleshooting save issues
   */
  fastify.post('/bonds/:bondId/coupon-payments', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      const { payments } = request.body as { payments: any[] }
      
      // Debug logging
      fastify.log.info({ 
        bondId, 
        paymentCount: payments?.length 
      }, 'Received coupon payments request')
      
      // Validate array of coupon payments
      const paymentsSchema = z.array(couponPaymentSchema)
      const validatedPayments = paymentsSchema.parse(payments)
      
      fastify.log.info({ 
        validatedCount: validatedPayments.length 
      }, 'Payments validated successfully')
      
      // Add bond_product_id to each payment
      const paymentsWithBondId = validatedPayments.map(payment => ({
        ...payment,
        bond_product_id: bondId
      }))
      
      // Bulk insert
      const { data, error } = await fastify.supabase
        .from('bond_coupon_payments')
        .insert(paymentsWithBondId)
        .select()
      
      if (error) {
        fastify.log.error({ error, bondId }, 'Database insert error')
        return reply.code(500).send({ 
          success: false, 
          error: error.message
        })
      }
      
      fastify.log.info({ 
        bondId, 
        insertedCount: data?.length || 0 
      }, 'Coupon payments saved successfully')
      
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })
  
  /**
   * DELETE /api/v1/nav/bonds/:bondId/coupon-payments/:paymentId
   * Delete a specific coupon payment
   */
  fastify.delete('/bonds/:bondId/coupon-payments/:paymentId', async (request, reply) => {
    const { bondId, paymentId } = request.params as { bondId: string; paymentId: string }
    
    try {
      fastify.log.info({ bondId, paymentId }, 'Deleting coupon payment')
      
      // Delete the payment
      const { error } = await fastify.supabase
        .from('bond_coupon_payments')
        .delete()
        .eq('id', paymentId)
        .eq('bond_product_id', bondId)
      
      if (error) {
        fastify.log.error({ error, bondId, paymentId }, 'Database delete error')
        return reply.code(500).send({ 
          success: false, 
          error: error.message
        })
      }
      
      fastify.log.info({ bondId, paymentId }, 'Coupon payment deleted successfully')
      
      return reply.send({
        success: true,
        message: 'Coupon payment deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })
  
  /**
   * POST /api/v1/nav/bonds/:bondId/market-prices
   * Add market price history
   */
  fastify.post('/bonds/:bondId/market-prices', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      const { prices } = request.body as { prices: any[] }
      
      // Validate array of market prices
      const pricesSchema = z.array(marketPriceSchema)
      const validatedPrices = pricesSchema.parse(prices)
      
      // Add bond_product_id to each price
      const pricesWithBondId = validatedPrices.map(price => ({
        ...price,
        bond_product_id: bondId
      }))
      
      // Bulk insert
      const { data, error } = await fastify.supabase
        .from('bond_market_prices')
        .insert(pricesWithBondId)
        .select()
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })
  
  /**
   * POST /api/v1/nav/bonds/bulk
   * Bulk upload from CSV
   */
  fastify.post('/bonds/bulk', async (request, reply) => {
    const { products } = request.body as { products: any[] }
    
    const results = {
      products: { success: 0, failed: 0, errors: [] as any[] }
    }
    
    // Process each product
    for (const product of products) {
      try {
        const validatedData = bondProductSchema.parse(product)
        
        const { error } = await fastify.supabase
          .from('bond_products')
          .insert(validatedData)
        
        if (error) {
          results.products.failed++
          results.products.errors.push({
            row: product.row,
            error: error.message
          })
        } else {
          results.products.success++
        }
      } catch (error) {
        results.products.failed++
        if (error instanceof z.ZodError) {
          results.products.errors.push({
            row: product.row,
            errors: error.errors
          })
        } else {
          results.products.errors.push({
            row: product.row,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }
    
    return reply.send({
      success: results.products.failed === 0,
      results
    })
  })
  
  /**
   * GET /api/v1/nav/bonds
   * List all bonds for a project
   */
  fastify.get('/bonds', async (request, reply) => {
    const { project_id } = request.query as { project_id?: string }
    
    if (!project_id) {
      return reply.code(400).send({
        success: false,
        error: 'project_id query parameter is required'
      })
    }
    
    try {
      const { data, error } = await fastify.supabase
        .from('bond_products')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: false })
      
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
   * GET /api/v1/nav/bonds/template
   * Download CSV template
   */
  fastify.get('/bonds/template', async (request, reply) => {
    const header = [
      'project_id',
      'bond_type',
      'asset_name',
      'issuer_name',
      'isin',
      'cusip',
      'issue_date',
      'maturity_date',
      'face_value',
      'currency',
      'coupon_rate',
      'coupon_frequency',
      'day_count_convention',
      'accounting_treatment',
      'callable_flag',
      'puttable',
      'credit_rating'
    ].join(',')
    
    const example = [
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'corporate',
      'Apple Inc 2.5% 2030',
      'Apple Inc',
      'US0378331005',
      '037833100',
      '2020-01-15',
      '2030-01-15',
      '1000000',
      'USD',
      '0.025',
      'semi_annual',
      'actual_actual',
      'held_to_maturity',
      'false',
      'false',
      'AA+'
    ].join(',')
    
    const template = `${header}\n${example}\n`
    
    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename=bonds_template.csv')
      .send(template)
  })
  
  /**
   * GET /api/v1/nav/bonds/:bondId
   * Get bond product with all supporting data
   */
  fastify.get('/bonds/:bondId', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      // Fetch bond product
      const { data: product, error: productError } = await fastify.supabase
        .from('bond_products')
        .select('*')
        .eq('id', bondId)
        .single()
      
      if (productError || !product) {
        return reply.code(404).send({
          success: false,
          error: 'Bond not found'
        })
      }
      
      // Fetch supporting data in parallel
      const [couponPayments, marketPrices, creditRatings, callPutSchedules] = await Promise.all([
        fastify.supabase
          .from('bond_coupon_payments')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('payment_date', { ascending: true }),
        fastify.supabase
          .from('bond_market_prices')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('price_date', { ascending: false }),
        fastify.supabase
          .from('bond_credit_ratings')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('rating_date', { ascending: false }),
        fastify.supabase
          .from('bond_call_put_schedules')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('option_date', { ascending: true })
      ])
      
      return reply.send({
        success: true,
        data: {
          ...product,
          coupon_payments: couponPayments.data || [],
          market_prices: marketPrices.data || [],
          credit_ratings: creditRatings.data || [],
          call_put_schedules: callPutSchedules.data || []
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
   * PUT /api/v1/nav/bonds/:bondId
   * Update bond product
   */
  fastify.put('/bonds/:bondId', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      // Validate partial update
      const validatedData = bondProductSchema.partial().parse(request.body)
      
      // Update in database
      const { data: product, error } = await fastify.supabase
        .from('bond_products')
        .update(validatedData)
        .eq('id', bondId)
        .select()
        .single()
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      if (!product) {
        return reply.code(404).send({
          success: false,
          error: 'Bond not found'
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
          errors: error.errors
        })
      }
      
      fastify.log.error({ error }, 'Unexpected error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return reply.code(500).send({
        success: false,
        error: errorMessage
      })
    }
  })

  /**
   * DELETE /api/v1/nav/bonds/:bondId
   * Delete bond product and all supporting data (CASCADE)
   */
  fastify.delete('/bonds/:bondId', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      const { error } = await fastify.supabase
        .from('bond_products')
        .delete()
        .eq('id', bondId)
      
      if (error) {
        fastify.log.error({ error }, 'Database error')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        message: 'Bond deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Unexpected error')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
