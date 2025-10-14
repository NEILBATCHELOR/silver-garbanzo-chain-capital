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
        required: ['asOfDate'],
        additionalProperties: true // Allow extra fields (for debugging)
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true  // ✅ Allow any properties in data
            },
            metadata: { 
              type: 'object',
              additionalProperties: true  // ✅ Allow any properties in metadata
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    const body = request.body as Record<string, any>
    
    // DEBUG: Log the incoming request
    console.log('=== BOND CALCULATION REQUEST ===')
    console.log('Bond ID:', bondId)
    console.log('Request Body:', JSON.stringify(body, null, 2))
    console.log('Body Keys:', Object.keys(body))
    
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
        // Enhanced error formatting for all error types
        const errorResponse = {
          success: false,
          error: {
            code: result.error?.code || 'UNKNOWN_ERROR',
            message: result.error?.message || 'An error occurred',
            // Include detailed validation/database errors if available
            ...(result.error?.details && result.error.details.length > 0 && {
              details: result.error.details,
              // For convenience, also provide a formatted message
              formattedMessage: result.error.details.map((err: any) => {
                const parts = [
                  `❌ ${err.field || 'Error'}: ${err.message}`
                ]
                if (err.fix) parts.push(`💡 FIX: ${err.fix}`)
                if (err.table) parts.push(`📊 TABLE: ${err.table}`)
                if (err.code && err.code !== result.error?.code) {
                  parts.push(`🔧 ERROR CODE: ${err.code}`)
                }
                if (err.constraint) {
                  parts.push(`⚠️  CONSTRAINT: ${err.constraint}`)
                }
                return parts.join('\n')
              }).join('\n\n')
            })
          },
          metadata: result.metadata
        }
        
        console.error('=== CALCULATION FAILED ===')
        console.error('Error Code:', errorResponse.error.code)
        console.error('Error Message:', errorResponse.error.message)
        if (errorResponse.error.details) {
          console.error('Detailed Errors:')
          errorResponse.error.details.forEach((err: any, i: number) => {
            console.error(`\n[${i + 1}] ${err.severity || 'error'}: ${err.field}`)
            console.error(`    Message: ${err.message}`)
            if (err.fix) console.error(`    Fix: ${err.fix}`)
            if (err.table) console.error(`    Table: ${err.table}`)
            if (err.code) console.error(`    Code: ${err.code}`)
            if (err.constraint) console.error(`    Constraint: ${err.constraint}`)
            if (err.context) {
              console.error('    Context:', JSON.stringify(err.context, null, 2))
            }
          })
        }
        
        return reply.code(400).send(errorResponse)
      }
      
      // DEBUG: Log what we actually received
      console.log('=== TRANSFORMATION DEBUG ===')
      console.log('result.success:', result.success)
      console.log('result.data type:', typeof result.data)
      console.log('result.data keys:', result.data ? Object.keys(result.data) : 'null/undefined')
      console.log('result.data:', JSON.stringify(result.data, null, 2))
      
      // Helper to safely convert to number
      const toNumber = (value: any): number | undefined => {
        if (value === null || value === undefined) return undefined
        if (typeof value === 'number') return value
        if (typeof value === 'string') return parseFloat(value)
        if (typeof value === 'object' && 'toNumber' in value) return value.toNumber()
        return undefined
      }
      
      // Helper to convert YTM to decimal format (0.0999 for 9.99%)
      // Handles multiple input formats and ensures consistent output
      const toYTMDecimal = (value: any): number | undefined => {
        const num = toNumber(value)
        if (num === undefined) return undefined
        
        // If value is greater than 1, assume it's in percentage format (e.g., 9.99 or 999 basis points)
        // Convert to decimal by dividing by 100
        if (num > 1) {
          console.log(`YTM appears to be in percentage format (${num}), converting to decimal: ${num / 100}`)
          return num / 100
        }
        
        // If value is between 0 and 1, it's already in decimal format
        return num
      }
      
      // Transform backend NAVResult format to frontend format
      const backendData = result.data as any
      
      // Get breakdown component values
      const getComponentValue = (key: string): number | undefined => {
        if (!backendData.breakdown?.componentValues) return undefined
        const map = backendData.breakdown.componentValues
        if (map instanceof Map) {
          return toNumber(map.get(key))
        }
        return toNumber(map[key])
      }
      
      // Special getter for YTM values to handle percentage conversion
      const getYTMComponentValue = (key: string): number | undefined => {
        if (!backendData.breakdown?.componentValues) return undefined
        const map = backendData.breakdown.componentValues
        const value = map instanceof Map ? map.get(key) : map[key]
        return toYTMDecimal(value)
      }
      
      const frontendData = {
        // Generic fields (used by all calculators)
        assetId: backendData.productId || bondId,      // ✅ Generic: assetId
        navValue: toNumber(backendData.nav) || 0,      // ✅ Generic: navValue
        // Bond-specific fields (for backward compatibility)
        bondId: backendData.productId || bondId,
        netAssetValue: toNumber(backendData.nav) || 0,
        // Common fields
        asOfDate: backendData.valuationDate,
        calculationMethod: backendData.calculationMethod || 'Unknown',
        confidenceLevel: (backendData.confidence || 'medium') as 'high' | 'medium' | 'low',
        priorNAV: undefined, // Could be calculated from history if needed
        breakdown: backendData.breakdown ? {
          cleanPrice: getComponentValue('clean_price'),
          accruedInterest: getComponentValue('accrued_interest'),
          totalValue: getComponentValue('dirty_price'),
          ytm: getYTMComponentValue('ytm'),  // ✅ Use special getter for YTM
          duration: getComponentValue('duration'),
          convexity: getComponentValue('convexity')
        } : undefined,
        // Market comparison for HTM bonds
        marketComparison: backendData.marketComparison ? {
          accountingValue: toNumber(backendData.marketComparison.accountingValue),
          marketValue: toNumber(backendData.marketComparison.marketValue),
          unrealizedGainLoss: toNumber(backendData.marketComparison.unrealizedGainLoss),
          marketPriceDate: backendData.marketComparison.marketPriceDate,
          marketYTM: toYTMDecimal(backendData.marketComparison.marketYTM),  // ✅ Convert YTM to decimal
          accountingYTM: toYTMDecimal(backendData.marketComparison.accountingYTM),  // ✅ Convert YTM to decimal
          yieldSpread: toYTMDecimal(backendData.marketComparison.yieldSpread)  // ✅ Convert spread to decimal
        } : undefined,
        metadata: {
          calculatedAt: result.metadata?.calculatedAt || new Date(),
          calculationDate: backendData.valuationDate,
          dataSourcesUsed: backendData.sources?.map((s: any) => `${s.table} (${s.recordCount} records)`) || [],
          dataSources: backendData.sources?.map((s: any) => ({
            source: s.table,
            timestamp: backendData.valuationDate
          })) || []
        },
        riskMetrics: backendData.breakdown?.componentValues ? {
          duration: getComponentValue('duration'),
          modifiedDuration: getComponentValue('modified_duration'),
          convexity: getComponentValue('convexity'),
          dv01: getComponentValue('bpv'),
          spreadDuration: undefined // Not currently calculated
        } : undefined
      }
      
      console.log('=== TRANSFORMED DATA ===')
      console.log('frontendData:', JSON.stringify(frontendData, null, 2))
      console.log('frontendData.netAssetValue:', frontendData.netAssetValue)
      
      // Test JSON serialization before sending
      const responseObj = {
        success: true,
        data: frontendData,
        metadata: result.metadata,
        warning: result.warning
      }
      
      console.log('=== ABOUT TO SEND RESPONSE ===')
      console.log('Response object keys:', Object.keys(responseObj))
      console.log('Response.data keys:', Object.keys(responseObj.data))
      console.log('Trying JSON.stringify on response...')
      const jsonString = JSON.stringify(responseObj)
      console.log('JSON.stringify result length:', jsonString.length)
      console.log('JSON.stringify result:', jsonString.substring(0, 200))
      
      return reply.send(responseObj)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('=== ZOD VALIDATION ERROR ===')
        console.error('Errors:', JSON.stringify(error.errors, null, 2))
        
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              ...(('received' in e) && { received: e.received })
            }))
          }
        })
      }
      
      console.error('=== CALCULATION ERROR ===')
      console.error('Error:', error)
      
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
   * FIXED: Now queries nav_calculation_runs table instead of asset_nav_data
   */
  fastify.get('/bonds/:bondId/history', async (request, reply) => {
    const { bondId } = request.params as { bondId: string }
    const { limit = 10 } = request.query as { limit?: number }
    
    try {
      // Query nav_calculation_runs table with correct fields
      const { data, error } = await fastify.supabase
        .from('nav_calculation_runs')
        .select('id, valuation_date, result_nav_value, nav_per_share, status, created_at, error_message, pricing_sources')
        .eq('asset_id', bondId)
        .order('valuation_date', { ascending: false })
        .limit(limit)
      
      if (error) {
        fastify.log.error({ error, bondId }, 'Failed to fetch NAV history')
        return reply.code(500).send({
          success: false,
          error: error.message
        })
      }
      
      return reply.send({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
      
    } catch (error) {
      fastify.log.error({ error, bondId }, 'Unexpected error fetching NAV history')
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
