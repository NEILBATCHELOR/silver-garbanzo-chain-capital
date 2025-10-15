/**
 * Money Market Fund (MMF) NAV Calculation Routes
 * 
 * API endpoints for calculating MMF NAV
 * Uses CalculatorRegistry to route to MMFCalculator
 * 
 * Following Bonds implementation pattern
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
  saveToDatabase: z.boolean().default(true)
})

export async function mmfCalculationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nav/mmf/:fundId/calculate
   * Calculate NAV for a Money Market Fund
   */
  fastify.post('/mmf/:fundId/calculate', {
    schema: {
      description: 'Calculate NAV for a Money Market Fund product',
      tags: ['mmf', 'calculations'],
      params: {
        type: 'object',
        properties: {
          fundId: { type: 'string', format: 'uuid' }
        },
        required: ['fundId']
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
    const { fundId } = request.params as { fundId: string }
    const body = request.body as Record<string, any>
    
    console.log('=== MMF CALCULATION REQUEST ===')
    console.log('Fund ID:', fundId)
    console.log('Request Body:', JSON.stringify(body, null, 2))
    
    try {
      // Validate request
      const validatedRequest = calculationRequestSchema.parse({
        ...body,
        productId: fundId
      })
      
      // Create calculator registry
      const registry = createCalculatorRegistry(fastify.supabase)
      
      // Calculate NAV
      const result = await registry.calculate('mmf', {
        productId: validatedRequest.productId,
        asOfDate: validatedRequest.asOfDate,
        targetCurrency: validatedRequest.targetCurrency,
        includeBreakdown: validatedRequest.includeBreakdown,
        saveToDatabase: validatedRequest.saveToDatabase
      })
      
      if (!result.success) {
        const errorResponse = {
          success: false,
          error: result.error,
          warning: result.warning,
          timestamp: new Date().toISOString()
        }
        
        console.error('MMF Calculation Error:', JSON.stringify(errorResponse, null, 2))
        
        return reply.status(400).send(errorResponse)
      }
      
      console.log('=== MMF CALCULATION SUCCESS ===')
      console.log('Stable NAV:', result.data?.nav)
      console.log('Shadow NAV:', result.data?.shadowNAV)
      console.log('Breaking Buck:', result.data?.isBreakingBuck)
      
      return {
        success: true,
        data: result.data,
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('=== MMF CALCULATION ROUTE ERROR ===')
      console.error(error)
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/mmf/:fundId/latest
   * Get latest calculated NAV for a fund
   */
  fastify.get('/mmf/:fundId/latest', {
    schema: {
      description: 'Get latest calculated NAV for a Money Market Fund',
      tags: ['mmf', 'nav'],
      params: {
        type: 'object',
        properties: {
          fundId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { fundId } = request.params as { fundId: string }
    
    try {
      // Get latest NAV from mmf_nav_history
      const { data, error } = await fastify.supabase
        .from('mmf_nav_history')
        .select('*')
        .eq('fund_product_id', fundId)
        .order('valuation_date', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No NAV history found for this fund'
          }
        })
      }
      
      return {
        success: true,
        data
      }
      
    } catch (error) {
      console.error('Error fetching latest NAV:', error)
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })
}
