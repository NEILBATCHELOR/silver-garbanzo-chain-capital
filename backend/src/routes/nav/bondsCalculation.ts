/**
 * Bond NAV Calculation Routes
 * 
 * API endpoints for calculating bond NAV
 * Uses CalculatorRegistry to route to BondsCalculator
 * 
 * Following Phase 5-6 specifications
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

export async function bondCalculationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nav/bonds/:bondId/calculate
   * Calculate NAV for a bond
   */
  fastify.post('/bonds/:bondId/calculate', {
    schema: {
      description: 'Calculate NAV for a bond product',
      tags: ['bonds', 'calculations'],
      params: {
        type: 'object',
        properties: {
          bondId: { type: 'string', format: 'uuid' }
        },
        required: ['bondId']
      },
      body: {
        type: 'object',
        properties: {
          asOfDate: { type: 'string', format: 'date-time' },
          targetCurrency: { type: 'string' },
          includeBreakdown: { type: 'boolean' },
          saveToDatabase: { type: 'boolean' }
        },
        required: ['asOfDate']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            metadata: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    const body = request.body as Record<string, any>
    
    try {
      // Validate request
      const validatedRequest = calculationRequestSchema.parse({
        ...body,
        productId: bondId
      })
      
      // Create calculator registry
      const registry = createCalculatorRegistry(fastify.supabase)
      
      // Calculate NAV
      const result = await registry.calculate('bonds', {
        productId: validatedRequest.productId,
        asOfDate: validatedRequest.asOfDate,
        targetCurrency: validatedRequest.targetCurrency,
        includeBreakdown: validatedRequest.includeBreakdown,
        saveToDatabase: validatedRequest.saveToDatabase
      })
      
      if (!result.success) {
        return reply.code(400).send(result)
      }
      
      return reply.send(result)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors
          }
        })
      }
      
      return reply.code(500).send({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })
  
  /**
   * POST /api/nav/bonds/batch-calculate
   * Calculate NAV for multiple bonds
   */
  fastify.post('/bonds/batch-calculate', {
    schema: {
      description: 'Calculate NAV for multiple bond products',
      tags: ['bonds', 'calculations'],
      body: {
        type: 'object',
        properties: {
          bonds: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bondId: { type: 'string', format: 'uuid' },
                asOfDate: { type: 'string', format: 'date-time' }
              },
              required: ['bondId', 'asOfDate']
            }
          },
          saveToDatabase: { type: 'boolean' }
        },
        required: ['bonds']
      }
    }
  }, async (request, reply) => {
    const { bonds, saveToDatabase } = request.body as {
      bonds: Array<{ bondId: string; asOfDate: Date }>
      saveToDatabase?: boolean
    }
    
    try {
      // Create calculator registry
      const registry = createCalculatorRegistry(fastify.supabase)
      
      // Prepare batch requests
      const requests = bonds.map(bond => ({
        assetType: 'bonds' as const,
        input: {
          productId: bond.bondId,
          asOfDate: bond.asOfDate,
          includeBreakdown: true,
          saveToDatabase: saveToDatabase !== false
        }
      }))
      
      // Calculate in batch
      const results = await registry.calculateBatch(requests)
      
      // Summarize results
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
      
      return reply.send({
        success: true,
        results,
        summary
      })
      
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'BATCH_CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/bonds/:bondId/history
   * Get NAV calculation history for a bond
   */
  fastify.get('/bonds/:bondId/history', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    const { limit = 10 } = request.query as { limit?: number }
    
    try {
      const { data, error } = await fastify.supabase
        .from('asset_nav_data')
        .select('*')
        .eq('asset_id', bondId)
        .order('date', { ascending: false })
        .limit(limit)
      
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
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
