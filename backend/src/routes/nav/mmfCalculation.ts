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
  saveToDatabase: z.boolean().default(true),
  configOverrides: z.any().optional() // Allow config overrides for testing
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
        
        console.error('MMF Calculation Error:', JSON.stringify(errorResponse, null, 2))
        
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
      console.log('shadowNAV:', result.data.shadowNAV)
      console.log('wam:', result.data.wam)
      console.log('wal:', result.data.wal)
      console.log('dailyLiquidPercentage:', result.data.dailyLiquidPercentage)
      console.log('weeklyLiquidPercentage:', result.data.weeklyLiquidPercentage)
      console.log('complianceStatus:', result.data.complianceStatus)
      
      // Transform backend result to match frontend MMFNAVResult type
      // All fields must be explicitly mapped to avoid undefined values
      const transformedData = {
        fundId: result.data.productId,
        asOfDate: result.data.valuationDate,
        
        // Core NAV values (REQUIRED)
        nav: result.data.nav, // Stable NAV (amortized cost)
        shadowNAV: result.data.shadowNAV || result.data.nav, // Fallback to nav if missing
        deviationFromStable: result.data.deviationFromStable || 0,
        deviationBps: result.data.deviationBps || 0,
        
        // Risk flags
        isBreakingBuck: result.data.isBreakingBuck || false,
        
        // Risk metrics (REQUIRED)
        wam: result.data.wam || 0,
        wal: result.data.wal || 0,
        dailyLiquidPercentage: result.data.dailyLiquidPercentage || 0,
        weeklyLiquidPercentage: result.data.weeklyLiquidPercentage || 0,
        
        // Compliance status (REQUIRED)
        complianceStatus: result.data.complianceStatus || {
          isCompliant: false,
          wamCompliant: false,
          walCompliant: false,
          liquidityCompliant: false,
          violations: ['Data missing for compliance check']
        },
        
        // Metadata (REQUIRED)
        calculationMethod: result.data.calculationMethod || 'amortized_cost',
        confidenceLevel: result.data.confidence || 'medium',
        dataQuality: typeof result.data.dataQuality === 'string' 
          ? { 
              rating: result.data.dataQuality, 
              score: 0, 
              imputations: 0 
            }
          : result.data.dataQuality || {
              rating: 'unknown',
              score: 0,
              imputations: 0
            },
        
        // Breakdown (optional)
        breakdown: result.data.breakdown || undefined,
        
        // Metadata object (REQUIRED)
        metadata: {
          calculationDate: result.data.valuationDate,
          dataSourcesUsed: result.data.sources || [],
          ...result.metadata // Contains calculatedAt and other metadata
        }
      }
      
      console.log('=== TRANSFORMED DATA ===')
      console.log('fundId:', transformedData.fundId)
      console.log('nav:', transformedData.nav)
      console.log('shadowNAV:', transformedData.shadowNAV)
      console.log('wam:', transformedData.wam)
      console.log('wal:', transformedData.wal)
      console.log('dailyLiquidPercentage:', transformedData.dailyLiquidPercentage)
      console.log('weeklyLiquidPercentage:', transformedData.weeklyLiquidPercentage)
      console.log('=========================')
      
      // Validate that critical fields are present
      if (transformedData.nav === undefined || transformedData.nav === null) {
        console.error('=== CRITICAL: NAV IS UNDEFINED ===')
        console.error('Original nav from result.data:', result.data.nav)
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INVALID_NAV',
            message: 'Calculation did not produce a valid NAV value'
          }
        })
      }
      
      return {
        success: true,
        data: transformedData,
        metadata: result.metadata
      }
      
    } catch (error) {
      console.error('=== MMF CALCULATION ROUTE ERROR ===')
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred during calculation'
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
