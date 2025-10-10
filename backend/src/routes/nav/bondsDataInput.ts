/**
 * Bond Data Input Routes
 * 
 * API endpoints for bond product data input
 * Supports: Form submission, CSV upload, API integration
 * 
 * Following Phase 6 specifications - ZERO HARDCODED VALUES
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// Bond product schema for validation
const bondProductSchema = z.object({
  project_id: z.string().uuid(),
  bond_type: z.enum(['corporate', 'government', 'municipal', 'agency', 'supranational']),
  issuer_name: z.string().min(1),
  issuer_country: z.string().min(2),
  issuer_sector: z.string().optional(),
  isin: z.string().optional(),
  cusip: z.string().optional(),
  ticker: z.string().optional(),
  issue_date: z.coerce.date(),
  maturity_date: z.coerce.date(),
  par_value: z.number().positive(),
  currency: z.string().length(3),
  coupon_rate: z.number().min(0).max(1),
  coupon_frequency: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(12)]),
  day_count_convention: z.string(),
  accounting_classification: z.enum(['htm', 'afs', 'trading']),
  is_callable: z.boolean().default(false),
  is_puttable: z.boolean().default(false),
  is_convertible: z.boolean().default(false),
  is_amortizing: z.boolean().default(false),
  has_sinking_fund: z.boolean().default(false),
  credit_rating: z.string().optional(),
  embedded_option_type: z.string().optional(),
  status: z.string().default('active')
})

// Coupon payment schema
const couponPaymentSchema = z.object({
  payment_date: z.coerce.date(),
  coupon_amount: z.number().positive(),
  currency: z.string().length(3),
  payment_status: z.string().default('scheduled'),
  payment_number: z.number().int().positive()
})

// Market price schema
const marketPriceSchema = z.object({
  price_date: z.coerce.date(),
  clean_price: z.number().positive(),
  dirty_price: z.number().optional(),
  yield_to_maturity: z.number().optional(),
  yield_to_call: z.number().optional(),
  yield_to_worst: z.number().optional(),
  spread_to_benchmark: z.number().optional(),
  duration: z.number().optional(),
  convexity: z.number().optional(),
  price_source: z.string()
})

export async function bondDataInputRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nav/bonds/data
   * Submit bond product data
   */
  fastify.post('/bonds/data', {
    schema: {
      description: 'Create a new bond product',
      tags: ['bonds'],
      body: {
        type: 'object',
        properties: bondProductSchema.shape
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            errors: { type: 'array' }
          }
        }
      }
    }
  }, async (request, reply) => {
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
      
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/nav/bonds/:bondId/coupon-payments
   * Add coupon payment schedule
   */
  fastify.post('/bonds/:bondId/coupon-payments', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      // Validate array of coupon payments
      const paymentsSchema = z.array(couponPaymentSchema)
      const validatedPayments = paymentsSchema.parse(request.body)
      
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
      
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/nav/bonds/:bondId/market-prices
   * Add market price history
   */
  fastify.post('/bonds/:bondId/market-prices', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    
    try {
      // Validate array of market prices
      const pricesSchema = z.array(marketPriceSchema)
      const validatedPrices = pricesSchema.parse(request.body)
      
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
      
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  /**
   * POST /api/nav/bonds/bulk
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
   * GET /api/nav/bonds/template
   * Download CSV template
   */
  fastify.get('/bonds/template', async (request, reply) => {
    const header = [
      'project_id',
      'bond_type',
      'issuer_name',
      'issuer_country',
      'issue_date',
      'maturity_date',
      'par_value',
      'currency',
      'coupon_rate',
      'coupon_frequency',
      'day_count_convention',
      'accounting_classification',
      'is_callable',
      'is_puttable',
      'credit_rating'
    ].join(',')
    
    const example = [
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'corporate',
      'Apple Inc',
      'US',
      '2020-01-15',
      '2030-01-15',
      '1000',
      'USD',
      '0.025',
      '2',
      'ACT/ACT',
      'htm',
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
   * GET /api/nav/bonds/:bondId
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
      const [couponPayments, marketPrices, creditRatings] = await Promise.all([
        fastify.supabase
          .from('bond_coupon_payments')
          .select('*')
          .eq('bond_product_id', bondId),
        fastify.supabase
          .from('bond_market_prices')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('price_date', { ascending: false }),
        fastify.supabase
          .from('bond_credit_ratings')
          .select('*')
          .eq('bond_product_id', bondId)
          .order('rating_date', { ascending: false })
      ])
      
      return reply.send({
        success: true,
        data: {
          product,
          supporting: {
            couponPayments: couponPayments.data || [],
            marketPrices: marketPrices.data || [],
            creditRatings: creditRatings.data || []
          }
        }
      })
      
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
