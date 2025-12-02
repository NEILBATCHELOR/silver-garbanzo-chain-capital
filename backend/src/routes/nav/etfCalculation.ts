/**
 * Exchange-Traded Fund (ETF) NAV Calculation Routes
 * 
 * API endpoints for calculating ETF NAV
 * Uses CalculatorRegistry to route to ETFCalculator
 * 
 * Following MMF/Bonds implementation pattern
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createCalculatorRegistry } from '../../services/nav/calculators'

// Calculation request schema
const calculationRequestSchema = z.object({
  productId: z.string().uuid(),
  asOfDate: z.coerce.date(),
  targetCurrency: z.string().length(3).optional(),
  includeBreakdown: z.boolean().default(true),
  saveToDatabase: z.boolean().default(true),
  configOverrides: z.any().optional() // Allow config overrides for testing
})

export async function etfCalculationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nav/etf/:etfId/calculate
   * Calculate NAV for an Exchange-Traded Fund
   */
  fastify.post('/etf/:etfId/calculate', {
    schema: {
      description: 'Calculate NAV for an Exchange-Traded Fund product',
      tags: ['etf', 'calculations'],
      params: {
        type: 'object',
        properties: {
          etfId: { type: 'string', format: 'uuid' }
        },
        required: ['etfId']
      },
      body: {
        type: 'object',
        properties: {
          asOfDate: { type: 'string', format: 'date-time' },
          targetCurrency: { type: 'string' },
          includeBreakdown: { type: 'boolean' },
          saveToDatabase: { type: 'boolean' }
        },
        required: ['asOfDate'],
        additionalProperties: true
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            },
            metadata: { 
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { etfId } = request.params as { etfId: string }
    const body = request.body as Record<string, any>
    
    console.log('=== ETF CALCULATION REQUEST ===')
    console.log('ETF ID:', etfId)
    console.log('Request Body:', JSON.stringify(body, null, 2))
    
    try {
      // Validate request
      const validatedRequest = calculationRequestSchema.parse({
        ...body,
        productId: etfId
      })
      
      // Create calculator registry with market data config for ETF
      const marketDataConfig = {
        supabaseClient: fastify.supabase,
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
      }
      const registry = createCalculatorRegistry(fastify.supabase, marketDataConfig)
      
      // Calculate NAV
      const result = await registry.calculate('etf', {
        productId: validatedRequest.productId,
        asOfDate: validatedRequest.asOfDate,
        targetCurrency: validatedRequest.targetCurrency,
        includeBreakdown: validatedRequest.includeBreakdown,
        saveToDatabase: validatedRequest.saveToDatabase,
        configOverrides: validatedRequest.configOverrides // Pass config overrides
      })
      
      console.log('=== REGISTRY CALCULATE RESULT ===')
      console.log('Success:', result.success)
      console.log('Has Data:', !!result.data)
      console.log('Data Keys:', result.data ? Object.keys(result.data) : 'none')
      
      if (!result.success) {
        const errorResponse = {
          success: false,
          error: result.error,
          warning: result.warning,
          timestamp: new Date().toISOString()
        }
        
        console.error('ETF Calculation Error:', JSON.stringify(errorResponse, null, 2))
        
        return reply.status(400).send(errorResponse)
      }
      
      // Ensure result.data exists
      if (!result.data) {
        console.error('=== CALCULATION RETURNED NO DATA ===')
        return reply.status(500).send({
          success: false,
          error: {
            code: 'NO_DATA',
            message: 'Calculation completed but returned no data'
          }
        })
      }
      
      console.log('=== RAW CALCULATOR DATA ===')
      console.log('productId:', result.data.productId)
      console.log('nav:', result.data.nav)
      console.log('marketPrice:', result.data.marketPrice)
      console.log('premiumDiscountPct:', result.data.premiumDiscountPct)
      console.log('trackingError:', result.data.trackingError)
      console.log('trackingDifference:', result.data.trackingDifference)
      console.log('cryptoValue:', result.data.cryptoValue)
      
      // Transform backend result to match frontend ETFNAVResult type
      const transformedData = {
        etfId: result.data.productId,
        asOfDate: result.data.valuationDate,
        
        // Core NAV values (REQUIRED)
        nav: result.data.nav, // NAV per share
        navPerShare: result.data.navPerShare || result.data.nav,
        
        // Market price and premium/discount
        marketPrice: result.data.marketPrice || null,
        premiumDiscountPct: result.data.premiumDiscountPct || null,
        premiumDiscountStatus: result.data.premiumDiscountPct
          ? (Number(result.data.premiumDiscountPct) > 0.25 ? 'premium' : 
             Number(result.data.premiumDiscountPct) < -0.25 ? 'discount' : 'fair_value')
          : 'fair_value',
        
        // Tracking metrics
        trackingError: result.data.trackingError || null,
        trackingDifference: result.data.trackingDifference || null,
        
        // Crypto metrics (if applicable)
        cryptoValue: result.data.cryptoValue || null,
        stakingRewards: result.data.stakingRewards || null,
        stakingYield: result.data.stakingYield || null,
        
        // Holdings breakdown
        breakdown: result.data.breakdown ? {
          totalAssets: result.data.breakdown.totalAssets,
          totalLiabilities: result.data.breakdown.totalLiabilities,
          netAssets: result.data.breakdown.netAssets,
          componentValues: result.data.breakdown.componentValues,
          adjustments: result.data.breakdown.adjustments || []
        } : null,
        
        // Data quality
        dataQuality: result.data.dataQuality || 'good',
        confidence: result.data.confidence || 'medium',
        calculationMethod: result.data.calculationMethod || 'mark_to_market',
        
        // Sources
        sources: result.data.sources || [],
        
        // Currency
        currency: result.data.currency || 'USD'
      }
      
      console.log('=== TRANSFORMED DATA ===')
      console.log('ETF ID:', transformedData.etfId)
      console.log('NAV:', transformedData.nav)
      console.log('Market Price:', transformedData.marketPrice)
      console.log('Premium/Discount %:', transformedData.premiumDiscountPct)
      console.log('Tracking Error:', transformedData.trackingError)
      
      return reply.send({
        success: true,
        data: transformedData,
        metadata: result.metadata
      })
      
    } catch (error: any) {
      console.error('=== ETF CALCULATION ERROR ===')
      console.error('Error Message:', error.message)
      console.error('Error Stack:', error.stack)
      
      // Handle validation errors
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: error.errors
          }
        })
      }
      
      // Handle other errors
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to calculate ETF NAV',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      })
    }
  })
  
  /**
   * GET /api/nav/etf/:etfId/nav-history
   * Get historical NAV data for an ETF
   */
  fastify.get('/etf/:etfId/nav-history', {
    schema: {
      description: 'Get historical NAV data for an ETF',
      tags: ['etf', 'history'],
      params: {
        type: 'object',
        properties: {
          etfId: { type: 'string', format: 'uuid' }
        },
        required: ['etfId']
      },
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          limit: { type: 'integer', default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const { etfId } = request.params as { etfId: string }
    const { startDate, endDate, limit } = request.query as { 
      startDate?: string
      endDate?: string
      limit?: number 
    }
    
    try {
      let query = fastify.supabase
        .from('etf_nav_history')
        .select('*')
        .eq('fund_product_id', etfId)
        .order('valuation_date', { ascending: false })
        .limit(limit || 30)
      
      if (startDate) {
        query = query.gte('valuation_date', startDate)
      }
      if (endDate) {
        query = query.lte('valuation_date', endDate)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch NAV history: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data: data || [],
        metadata: {
          count: data?.length || 0,
          startDate,
          endDate,
          limit
        }
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch NAV history'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/etf/:etfId/tracking
   * Get tracking error history for an ETF
   */
  fastify.get('/etf/:etfId/tracking', {
    schema: {
      description: 'Get tracking error history for an ETF',
      tags: ['etf', 'tracking'],
      params: {
        type: 'object',
        properties: {
          etfId: { type: 'string', format: 'uuid' }
        },
        required: ['etfId']
      }
    }
  }, async (request, reply) => {
    const { etfId } = request.params as { etfId: string }
    
    try {
      const { data, error } = await fastify.supabase
        .from('etf_tracking_error_history')
        .select('*')
        .eq('fund_product_id', etfId)
        .order('period_end', { ascending: false })
        .limit(12) // Last 12 periods
      
      if (error) {
        throw new Error(`Failed to fetch tracking history: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data: data || [],
        metadata: {
          count: data?.length || 0
        }
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch tracking history'
        }
      })
    }
  })
}
