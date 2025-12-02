/**
 * Exchange-Traded Fund (ETF) Data Input Routes
 * 
 * API endpoints for ETF product and holdings data input
 * Supports: Form submission, CSV upload, API integration
 * 
 * Following MMF/Bonds implementation pattern - ZERO HARDCODED VALUES
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// ETF product schema - ALIGNED WITH DATABASE (fund_products table)
const etfProductSchema = z.object({
  // Core identification
  project_id: z.string().uuid(),
  fund_ticker: z.string().nullable().optional(),
  fund_name: z.string().min(1),
  fund_type: z.enum([
    'etf_equity', 
    'etf_bond', 
    'etf_crypto', 
    'etf_commodity', 
    'etf_sector', 
    'etf_thematic', 
    'etf_smart_beta'
  ]),
  
  // Share class (optional - for parent-child relationships)
  parent_fund_id: z.string().uuid().nullable().optional(),
  share_class_name: z.string().nullable().optional(),
  
  // Structure
  structure_type: z.enum(['physical', 'synthetic', 'active', 'passive']).nullable().optional(),
  replication_method: z.enum(['full', 'optimized', 'swap_based']).nullable().optional(),
  
  // Financial data
  net_asset_value: z.number().positive(),
  assets_under_management: z.number().min(0),
  shares_outstanding: z.number().positive(),
  market_price: z.number().nullable().optional(),
  premium_discount_pct: z.number().nullable().optional(),
  
  // Performance
  expense_ratio: z.number().min(0).max(1).nullable().optional(),
  total_expense_ratio: z.number().min(0).max(1).nullable().optional(),
  tracking_error: z.number().nullable().optional(),
  
  // Reference
  benchmark_index: z.string().nullable().optional(),
  currency: z.string().length(3).default('USD'),
  exchange: z.string().nullable().optional(),
  
  // Identifiers
  isin: z.string().length(12).nullable().optional(),
  cusip: z.string().length(9).nullable().optional(),
  sedol: z.string().length(7).nullable().optional(),
  
  // Registration
  registration_status: z.enum(['draft', 'pending_sec', 'active', 'suspended', 'liquidating']).nullable().optional(),
  
  // Dates
  inception_date: z.coerce.date(),
  
  // Additional
  status: z.string().default('active')
})

// ETF holding schema - ALIGNED WITH DATABASE (etf_holdings table)
const etfHoldingSchema = z.object({
  fund_product_id: z.string().uuid(),
  
  // Security identification
  security_ticker: z.string().nullable().optional(),
  security_name: z.string().min(1),
  security_type: z.enum(['equity', 'bond', 'crypto', 'commodity', 'cash', 'derivative']),
  isin: z.string().length(12).nullable().optional(),
  cusip: z.string().length(9).nullable().optional(),
  sedol: z.string().length(7).nullable().optional(),
  
  // Crypto identification (for crypto holdings)
  blockchain: z.string().nullable().optional(),
  contract_address: z.string().nullable().optional(),
  token_standard: z.enum(['native', 'erc20', 'spl']).nullable().optional(),
  
  // Position details
  quantity: z.number().positive(),
  market_value: z.number().positive(), // KEY for NAV calculation
  weight_percentage: z.number().min(0).max(100),
  price_per_unit: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  
  // Classification
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  asset_class: z.string().nullable().optional(),
  
  // Custody (especially for crypto)
  custodian_name: z.string().nullable().optional(),
  custody_address: z.string().nullable().optional(),
  
  // Staking (for PoS cryptocurrencies)
  is_staked: z.boolean().default(false),
  staking_apr: z.number().nullable().optional(),
  staking_rewards_accrued: z.number().nullable().optional(),
  
  // Dates
  as_of_date: z.coerce.date(),
  acquisition_date: z.coerce.date().nullable().optional(),
  
  // Additional
  status: z.string().default('active'),
  notes: z.string().nullable().optional()
})

// ETF metadata schema
const etfMetadataSchema = z.object({
  fund_product_id: z.string().uuid(),
  
  // Strategy
  investment_objective: z.string().nullable().optional(),
  strategy_description: z.string().nullable().optional(),
  
  // Crypto fields
  is_crypto_etf: z.boolean().default(false),
  supported_blockchains: z.array(z.string()).nullable().optional(),
  custody_type: z.string().nullable().optional(),
  staking_enabled: z.boolean().default(false),
  
  // Rebalancing
  rebalancing_frequency: z.string().nullable().optional(),
  
  // Benchmarks
  primary_benchmark: z.string().nullable().optional()
})

export async function etfDataInputRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nav/etf/products
   * Create a new ETF product
   */
  fastify.post('/etf/products', {
    schema: {
      description: 'Create a new ETF product',
      tags: ['etf', 'data-input'],
      body: {
        type: 'object',
        additionalProperties: true
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = etfProductSchema.parse(request.body)
      
      const { data, error } = await fastify.supabase
        .from('fund_products')
        .insert(validatedData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create ETF product: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ETF product data',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: error.message || 'Failed to create ETF product'
        }
      })
    }
  })
  
  /**
   * PUT /api/nav/etf/products/:id
   * Update an ETF product
   */
  fastify.put('/etf/products/:id', {
    schema: {
      description: 'Update an ETF product',
      tags: ['etf', 'data-input'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const updateData = request.body as Record<string, any>
      
      const { data, error } = await fastify.supabase
        .from('fund_products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update ETF product: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update ETF product'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/etf/products
   * Get all ETF products for a project
   */
  fastify.get('/etf/products', {
    schema: {
      description: 'Get all ETF products',
      tags: ['etf', 'data-input'],
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string' }
        },
        required: ['projectId']
      }
    }
  }, async (request, reply) => {
    const { projectId, status } = request.query as { projectId: string; status?: string }
    
    try {
      let query = fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('project_id', projectId)
        .like('fund_type', 'etf_%')
      
      if (status) {
        query = query.eq('status', status)
      }
      
      query = query.order('fund_name', { ascending: true })
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch ETF products: ${error.message}`)
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
          message: error.message || 'Failed to fetch ETF products'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/etf/products/:id
   * Get a single ETF product
   */
  fastify.get('/etf/products/:id', {
    schema: {
      description: 'Get a single ETF product',
      tags: ['etf', 'data-input'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const { data, error } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'ETF product not found'
            }
          })
        }
        throw new Error(`Failed to fetch ETF product: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch ETF product'
        }
      })
    }
  })
  
  /**
   * DELETE /api/nav/etf/products/:id
   * Delete an ETF product
   */
  fastify.delete('/etf/products/:id', {
    schema: {
      description: 'Delete an ETF product',
      tags: ['etf', 'data-input'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const { error } = await fastify.supabase
        .from('fund_products')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete ETF product: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        message: 'ETF product deleted successfully'
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Failed to delete ETF product'
        }
      })
    }
  })
  
  /**
   * POST /api/nav/etf/:etfId/holdings
   * Add a new holding to an ETF
   */
  fastify.post('/etf/:etfId/holdings', {
    schema: {
      description: 'Add a new holding to an ETF',
      tags: ['etf', 'holdings'],
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
      const body = request.body as Record<string, any>
      const validatedData = etfHoldingSchema.parse({
        ...body,
        fund_product_id: etfId
      })
      
      const { data, error } = await fastify.supabase
        .from('etf_holdings')
        .insert(validatedData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to add holding: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid holding data',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: error.message || 'Failed to add holding'
        }
      })
    }
  })
  
  /**
   * PUT /api/nav/etf/holdings/:id
   * Update an ETF holding
   */
  fastify.put('/etf/holdings/:id', {
    schema: {
      description: 'Update an ETF holding',
      tags: ['etf', 'holdings'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const updateData = request.body as Record<string, any>
      
      const { data, error } = await fastify.supabase
        .from('etf_holdings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update holding: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update holding'
        }
      })
    }
  })
  
  /**
   * DELETE /api/nav/etf/holdings/:id
   * Delete an ETF holding
   */
  fastify.delete('/etf/holdings/:id', {
    schema: {
      description: 'Delete an ETF holding',
      tags: ['etf', 'holdings'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const { error } = await fastify.supabase
        .from('etf_holdings')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete holding: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        message: 'Holding deleted successfully'
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Failed to delete holding'
        }
      })
    }
  })
  
  /**
   * GET /api/nav/etf/:etfId/holdings
   * Get all holdings for an ETF
   */
  fastify.get('/etf/:etfId/holdings', {
    schema: {
      description: 'Get all holdings for an ETF',
      tags: ['etf', 'holdings'],
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
        .from('etf_holdings')
        .select('*')
        .eq('fund_product_id', etfId)
        .eq('status', 'active')
        .order('weight_percentage', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch holdings: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data: data || [],
        metadata: {
          count: data?.length || 0,
          totalValue: data?.reduce((sum, h) => sum + (h.market_value || 0), 0) || 0
        }
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message || 'Failed to fetch holdings'
        }
      })
    }
  })
  
  /**
   * POST /api/nav/etf/:etfId/holdings/bulk
   * Bulk import holdings (e.g., from CSV)
   */
  fastify.post('/etf/:etfId/holdings/bulk', {
    schema: {
      description: 'Bulk import holdings for an ETF',
      tags: ['etf', 'holdings'],
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
          holdings: {
            type: 'array',
            items: { type: 'object' }
          },
          replaceExisting: { type: 'boolean', default: false }
        },
        required: ['holdings']
      }
    }
  }, async (request, reply) => {
    const { etfId } = request.params as { etfId: string }
    const { holdings, replaceExisting } = request.body as { 
      holdings: any[]
      replaceExisting?: boolean 
    }
    
    try {
      // Validate all holdings
      const validatedHoldings = holdings.map(h => 
        etfHoldingSchema.parse({
          ...h,
          fund_product_id: etfId
        })
      )
      
      // If replaceExisting, delete old holdings first
      if (replaceExisting) {
        await fastify.supabase
          .from('etf_holdings')
          .delete()
          .eq('fund_product_id', etfId)
      }
      
      // Insert all holdings
      const { data, error } = await fastify.supabase
        .from('etf_holdings')
        .insert(validatedHoldings)
        .select()
      
      if (error) {
        throw new Error(`Failed to bulk import holdings: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data: data || [],
        metadata: {
          imported: data?.length || 0,
          replaceExisting: replaceExisting || false
        }
      })
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid holdings data',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BULK_IMPORT_ERROR',
          message: error.message || 'Failed to bulk import holdings'
        }
      })
    }
  })
  
  /**
   * POST /api/nav/etf/:parentId/share-classes
   * Create a new share class for an ETF
   */
  fastify.post('/etf/:parentId/share-classes', {
    schema: {
      description: 'Create a new share class for an ETF',
      tags: ['etf', 'share-classes'],
      params: {
        type: 'object',
        properties: {
          parentId: { type: 'string', format: 'uuid' }
        },
        required: ['parentId']
      },
      body: {
        type: 'object',
        properties: {
          share_class_name: { type: 'string' },
          expense_ratio: { type: 'number' },
          minimum_investment: { type: 'number' }
        },
        required: ['share_class_name', 'expense_ratio']
      }
    }
  }, async (request, reply) => {
    const { parentId } = request.params as { parentId: string }
    const body = request.body as Record<string, any>
    
    try {
      // Get parent ETF
      const { data: parent, error: parentError } = await fastify.supabase
        .from('fund_products')
        .select('*')
        .eq('id', parentId)
        .single()
      
      if (parentError || !parent) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent ETF not found'
          }
        })
      }
      
      // Create share class (copy from parent with new class name and expense ratio)
      const shareClassData = {
        ...parent,
        id: undefined, // Let database generate new ID
        parent_fund_id: parentId,
        share_class_name: body.share_class_name,
        expense_ratio: body.expense_ratio,
        fund_ticker: `${parent.fund_ticker}-${body.share_class_name.replace(/\s+/g, '')}`,
        fund_name: `${parent.fund_name} - ${body.share_class_name}`,
        created_at: undefined,
        updated_at: undefined
      }
      
      const { data, error } = await fastify.supabase
        .from('fund_products')
        .insert(shareClassData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create share class: ${error.message}`)
      }
      
      return reply.send({
        success: true,
        data,
        message: `Share class ${body.share_class_name} created successfully`
      })
      
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create share class'
        }
      })
    }
  })
  
  /**
   * POST /api/nav/etf/metadata
   * Create or update ETF metadata
   */
  fastify.post('/etf/metadata', {
    schema: {
      description: 'Create or update ETF metadata',
      tags: ['etf', 'metadata']
    }
  }, async (request, reply) => {
    try {
      const validatedData = etfMetadataSchema.parse(request.body)
      
      // Check if metadata exists
      const { data: existing } = await fastify.supabase
        .from('etf_metadata')
        .select('id')
        .eq('fund_product_id', validatedData.fund_product_id)
        .single()
      
      if (existing) {
        // Update
        const { data, error } = await fastify.supabase
          .from('etf_metadata')
          .update(validatedData)
          .eq('fund_product_id', validatedData.fund_product_id)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to update metadata: ${error.message}`)
        }
        
        return reply.send({
          success: true,
          data
        })
      } else {
        // Insert
        const { data, error } = await fastify.supabase
          .from('etf_metadata')
          .insert(validatedData)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to create metadata: ${error.message}`)
        }
        
        return reply.send({
          success: true,
          data
        })
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid metadata',
            details: error.errors
          }
        })
      }
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'METADATA_ERROR',
          message: error.message || 'Failed to save metadata'
        }
      })
    }
  })
}
