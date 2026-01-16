/**
 * Payments Routes
 * API routes for XRPL payment operations (channels, escrow, checks)
 */

import { FastifyInstance } from 'fastify'
import { SupabaseClient } from '@supabase/supabase-js'
import { TransactionValidator } from '../../validators/xrpl'
import { xrplMonitor } from '../../services/xrpl'
import type {
  PaymentChannelCreateRequest,
  PaymentChannelClaimRequest,
  EscrowCreateRequest,
  EscrowFinishRequest,
  CheckCreateRequest,
  CheckCashRequest
} from '../../types/xrpl'

export default async function paymentsRoutes(
  fastify: FastifyInstance,
  options: { supabase: SupabaseClient }
) {
  const { supabase } = options

  // ============================================================================
  // Payment Channel Routes
  // ============================================================================

  /**
   * Create Payment Channel
   * POST /xrpl/payments/channel/create
   */
  fastify.post<{
    Body: PaymentChannelCreateRequest
  }>('/channel/create', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateChannelCreateRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      const { data, error } = await supabase
        .from('xrpl_payment_channels')
        .insert({
          source_address: request.body.sourceAddress,
          destination_address: request.body.destinationAddress,
          amount: request.body.amount,
          balance: '0',
          settle_delay: request.body.settleDelay,
          public_key: request.body.publicKey,
          cancel_after: request.body.cancelAfter 
            ? new Date(request.body.cancelAfter * 1000) 
            : null,
          destination_tag: request.body.destinationTag,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('payment_channel_created', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('payment_channel_create_error', 1)

      return reply.status(500).send({
        error: 'Failed to create payment channel',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Claim Payment Channel
   * POST /xrpl/payments/channel/claim
   */
  fastify.post<{
    Body: PaymentChannelClaimRequest
  }>('/channel/claim', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateChannelClaimRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Record claim
      const { data, error } = await supabase
        .from('xrpl_payment_channel_claims')
        .insert({
          channel_id: request.body.channelId,
          destination_address: request.body.destinationAddress,
          amount: request.body.amount,
          signature: request.body.signature,
          public_key: request.body.publicKey,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('payment_channel_claimed', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('payment_channel_claim_error', 1)

      return reply.status(500).send({
        error: 'Failed to claim payment channel',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Payment Channel
   * GET /xrpl/payments/channel/:channelId
   */
  fastify.get<{
    Params: { channelId: string }
  }>('/channel/:channelId', async (request, reply) => {
    try {
      const { channelId } = request.params

      const { data, error } = await supabase
        .from('xrpl_payment_channels')
        .select('*')
        .eq('channel_id', channelId)
        .single()

      if (error) throw error

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get payment channel',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // ============================================================================
  // Escrow Routes
  // ============================================================================

  /**
   * Create Escrow
   * POST /xrpl/payments/escrow/create
   */
  fastify.post<{
    Body: EscrowCreateRequest
  }>('/escrow/create', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateEscrowCreateRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      const { data, error } = await supabase
        .from('xrpl_escrows')
        .insert({
          owner_address: request.body.senderAddress,
          destination_address: request.body.destinationAddress,
          amount: request.body.amount,
          finish_after: request.body.finishAfter 
            ? new Date(request.body.finishAfter * 1000) 
            : null,
          cancel_after: request.body.cancelAfter 
            ? new Date(request.body.cancelAfter * 1000) 
            : null,
          condition: request.body.condition,
          sequence: 0, // Will be set after transaction
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('escrow_created', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('escrow_create_error', 1)

      return reply.status(500).send({
        error: 'Failed to create escrow',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Finish Escrow
   * POST /xrpl/payments/escrow/finish
   */
  fastify.post<{
    Body: EscrowFinishRequest
  }>('/escrow/finish', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateEscrowFinishRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Update escrow status
      const { data, error } = await supabase
        .from('xrpl_escrows')
        .update({
          status: 'finished',
          finish_transaction_hash: null // Will be set after transaction
        })
        .eq('owner_address', request.body.ownerAddress)
        .eq('sequence', request.body.sequence)
        .eq('status', 'active')
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('escrow_finished', 1)

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('escrow_finish_error', 1)

      return reply.status(500).send({
        error: 'Failed to finish escrow',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Escrow
   * GET /xrpl/payments/escrow/:owner/:sequence
   */
  fastify.get<{
    Params: { owner: string; sequence: string }
  }>('/escrow/:owner/:sequence', async (request, reply) => {
    try {
      const { owner, sequence } = request.params

      const { data, error } = await supabase
        .from('xrpl_escrows')
        .select('*')
        .eq('owner_address', owner)
        .eq('sequence', parseInt(sequence, 10))
        .single()

      if (error) throw error

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get escrow',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // ============================================================================
  // Check Routes
  // ============================================================================

  /**
   * Create Check
   * POST /xrpl/payments/check/create
   */
  fastify.post<{
    Body: CheckCreateRequest
  }>('/check/create', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateCheckCreateRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      const { data, error } = await supabase
        .from('xrpl_checks')
        .insert({
          sender_address: request.body.senderAddress,
          destination_address: request.body.destinationAddress,
          send_max: request.body.sendMax,
          currency_code: request.body.currencyCode,
          issuer_address: request.body.issuerAddress,
          expiration: request.body.expiration 
            ? new Date(request.body.expiration * 1000) 
            : null,
          invoice_id: request.body.invoiceID,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('check_created', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('check_create_error', 1)

      return reply.status(500).send({
        error: 'Failed to create check',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Cash Check
   * POST /xrpl/payments/check/cash
   */
  fastify.post<{
    Body: CheckCashRequest
  }>('/check/cash', async (request, reply) => {
    try {
      const validation = TransactionValidator.validateCheckCashRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Update check status
      const { data, error } = await supabase
        .from('xrpl_checks')
        .update({
          status: 'cashed',
          cash_transaction_hash: null // Will be set after transaction
        })
        .eq('check_id', request.body.checkId)
        .eq('status', 'active')
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('check_cashed', 1)

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('check_cash_error', 1)

      return reply.status(500).send({
        error: 'Failed to cash check',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Check
   * GET /xrpl/payments/check/:checkId
   */
  fastify.get<{
    Params: { checkId: string }
  }>('/check/:checkId', async (request, reply) => {
    try {
      const { checkId } = request.params

      const { data, error } = await supabase
        .from('xrpl_checks')
        .select('*')
        .eq('check_id', checkId)
        .single()

      if (error) throw error

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get check',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
