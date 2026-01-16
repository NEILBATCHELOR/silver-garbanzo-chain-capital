/**
 * MPT Routes
 * API routes for Multi-Purpose Token operations
 */

import { FastifyInstance } from 'fastify'
import { SupabaseClient } from '@supabase/supabase-js'
import { MPTValidator } from '../../validators/xrpl'
import { xrplMonitor, xrplCache } from '../../services/xrpl'
import type {
  MPTIssuanceRequest,
  MPTAuthorizationRequest,
  MPTTransferRequest
} from '../../types/xrpl'

export default async function mptRoutes(
  fastify: FastifyInstance,
  options: { supabase: SupabaseClient }
) {
  const { supabase } = options

  /**
   * Create MPT Issuance
   * POST /xrpl/mpt/create
   */
  fastify.post<{
    Body: MPTIssuanceRequest
  }>('/create', async (request, reply) => {
    const startTime = Date.now()

    try {
      // Validate request
      const validation = MPTValidator.validateIssuanceRequest(request.body)
      if (!validation.valid) {
        xrplMonitor.recordMetric('mpt_validation_error', 1)
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Store issuance record
      const { data, error } = await supabase
        .from('mpt_issuances')
        .insert({
          project_id: request.body.projectId,
          issuer_address: request.body.issuerAddress,
          asset_scale: request.body.assetScale,
          maximum_amount: request.body.maximumAmount,
          transfer_fee: request.body.transferFee,
          metadata: request.body.metadata,
          flags: calculateFlags(request.body.flags),
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      const responseTime = Date.now() - startTime
      xrplMonitor.recordMetric('mpt_create_success', 1)
      xrplMonitor.recordMetric('mpt_create_response_time', responseTime)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      xrplMonitor.recordMetric('mpt_create_error', 1)
      xrplMonitor.recordMetric('mpt_create_response_time', responseTime)

      return reply.status(500).send({
        error: 'Failed to create MPT issuance',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Authorize MPT Holder
   * POST /xrpl/mpt/authorize
   */
  fastify.post<{
    Body: MPTAuthorizationRequest
  }>('/authorize', async (request, reply) => {
    try {
      // Validate request
      const validation = MPTValidator.validateAuthorizationRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Store authorization record
      const { data, error } = await supabase
        .from('mpt_holders')
        .insert({
          mpt_issuance_id: request.body.mptIssuanceId,
          holder_address: request.body.holderAddress,
          balance: '0',
          authorized: true
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('mpt_authorize_success', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('mpt_authorize_error', 1)

      return reply.status(500).send({
        error: 'Failed to authorize holder',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Transfer MPT
   * POST /xrpl/mpt/transfer
   */
  fastify.post<{
    Body: MPTTransferRequest
  }>('/transfer', async (request, reply) => {
    try {
      // Validate request
      const validation = MPTValidator.validateTransferRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Record transaction
      const { data, error } = await supabase
        .from('mpt_transactions')
        .insert({
          mpt_issuance_id: request.body.mptIssuanceId,
          from_address: request.body.senderAddress,
          to_address: request.body.destinationAddress,
          amount: request.body.amount,
          transaction_type: 'transfer',
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('mpt_transfer_success', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('mpt_transfer_error', 1)

      return reply.status(500).send({
        error: 'Failed to transfer MPT',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get MPT Issuance
   * GET /xrpl/mpt/:issuanceId
   */
  fastify.get<{
    Params: { issuanceId: string }
  }>('/:issuanceId', async (request, reply) => {
    try {
      const { issuanceId } = request.params

      // Check cache first
      const cacheKey = `mpt:${issuanceId}`
      const cached = xrplCache.get(cacheKey)
      if (cached) {
        xrplMonitor.recordMetric('mpt_cache_hit', 1)
        return reply.send({
          success: true,
          data: cached,
          cached: true
        })
      }

      xrplMonitor.recordMetric('mpt_cache_miss', 1)

      // Query database
      const { data, error } = await supabase
        .from('mpt_issuances')
        .select('*')
        .eq('mpt_issuance_id', issuanceId)
        .single()

      if (error) throw error

      // Cache result
      xrplCache.set(cacheKey, data, 300) // 5 minutes

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get MPT issuance',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get MPT Holders
   * GET /xrpl/mpt/:issuanceId/holders
   */
  fastify.get<{
    Params: { issuanceId: string }
    Querystring: { limit?: string; offset?: string }
  }>('/:issuanceId/holders', async (request, reply) => {
    try {
      const { issuanceId } = request.params
      const limit = parseInt(request.query.limit || '50', 10)
      const offset = parseInt(request.query.offset || '0', 10)

      const { data, error, count } = await supabase
        .from('mpt_holders')
        .select('*', { count: 'exact' })
        .eq('mpt_issuance_id', issuanceId)
        .range(offset, offset + limit - 1)

      if (error) throw error

      return reply.send({
        success: true,
        data: data,
        pagination: {
          limit,
          offset,
          total: count || 0
        }
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get MPT holders',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Calculate flags value from flags object
   */
  function calculateFlags(flags: MPTIssuanceRequest['flags']): number {
    let value = 0
    
    if (flags.canTransfer !== false) value |= 1
    if (flags.canTrade) value |= 2
    if (flags.canLock) value |= 4
    if (flags.canClawback) value |= 8
    if (flags.requireAuth) value |= 16

    return value
  }
}
