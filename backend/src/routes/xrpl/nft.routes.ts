/**
 * NFT Routes
 * API routes for Non-Fungible Token operations
 */

import { FastifyInstance } from 'fastify'
import { SupabaseClient } from '@supabase/supabase-js'
import { NFTValidator } from '../../validators/xrpl'
import { xrplMonitor, xrplCache } from '../../services/xrpl'
import type {
  NFTMintRequest,
  NFTOfferRequest
} from '../../types/xrpl'

export default async function nftRoutes(
  fastify: FastifyInstance,
  options: { supabase: SupabaseClient }
) {
  const { supabase } = options

  /**
   * Mint NFT
   * POST /xrpl/nft/mint
   */
  fastify.post<{
    Body: NFTMintRequest
  }>('/mint', async (request, reply) => {
    const startTime = Date.now()

    try {
      // Validate request
      const validation = NFTValidator.validateMintRequest(request.body)
      if (!validation.valid) {
        xrplMonitor.recordMetric('nft_validation_error', 1)
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Store NFT record
      const { data, error } = await supabase
        .from('xrpl_nfts')
        .insert({
          project_id: request.body.projectId,
          issuer_address: request.body.issuerAddress,
          owner_address: request.body.issuerAddress,
          uri: request.body.uri,
          transfer_fee: request.body.transferFee,
          taxon: request.body.taxon || 0,
          serial: 0,
          flags: calculateNFTFlags(request.body.flags),
          is_burnable: request.body.flags?.burnable || false,
          is_only_xrp: request.body.flags?.onlyXRP || false,
          is_transferable: request.body.flags?.transferable !== false,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      const responseTime = Date.now() - startTime
      xrplMonitor.recordMetric('nft_mint_success', 1)
      xrplMonitor.recordMetric('nft_mint_response_time', responseTime)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      xrplMonitor.recordMetric('nft_mint_error', 1)
      xrplMonitor.recordMetric('nft_mint_response_time', responseTime)

      return reply.status(500).send({
        error: 'Failed to mint NFT',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Create NFT Offer
   * POST /xrpl/nft/offer
   */
  fastify.post<{
    Body: NFTOfferRequest
  }>('/offer', async (request, reply) => {
    try {
      // Validate request
      const validation = NFTValidator.validateOfferRequest(request.body)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.errors
        })
      }

      // Store offer record
      const { data, error } = await supabase
        .from('xrpl_nft_offers')
        .insert({
          nft_id: request.body.nftId,
          offer_type: request.body.offerType,
          owner_address: request.body.owner || request.body.destination || '',
          amount: request.body.amount,
          currency_code: request.body.currencyCode || 'XRP',
          issuer_address: request.body.issuerAddress,
          destination_address: request.body.destination,
          expiration: request.body.expiration 
            ? new Date(request.body.expiration * 1000) 
            : null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('nft_offer_success', 1)

      return reply.status(201).send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('nft_offer_error', 1)

      return reply.status(500).send({
        error: 'Failed to create NFT offer',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Accept NFT Offer
   * POST /xrpl/nft/accept-offer
   */
  fastify.post<{
    Body: {
      walletAddress: string
      offerIndex: string
      brokerFee?: string
    }
  }>('/accept-offer', async (request, reply) => {
    try {
      const { offerIndex, walletAddress } = request.body

      // Update offer status
      const { data, error } = await supabase
        .from('xrpl_nft_offers')
        .update({
          status: 'accepted',
          accepted_at: new Date()
        })
        .eq('offer_index', offerIndex)
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('nft_offer_accepted', 1)

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      xrplMonitor.recordMetric('nft_offer_accept_error', 1)

      return reply.status(500).send({
        error: 'Failed to accept NFT offer',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get NFT
   * GET /xrpl/nft/:nftId
   */
  fastify.get<{
    Params: { nftId: string }
  }>('/:nftId', async (request, reply) => {
    try {
      const { nftId } = request.params

      // Check cache first
      const cacheKey = `nft:${nftId}`
      const cached = xrplCache.get(cacheKey)
      if (cached) {
        xrplMonitor.recordMetric('nft_cache_hit', 1)
        return reply.send({
          success: true,
          data: cached,
          cached: true
        })
      }

      xrplMonitor.recordMetric('nft_cache_miss', 1)

      // Query database
      const { data, error } = await supabase
        .from('xrpl_nfts')
        .select('*')
        .eq('nft_id', nftId)
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
        error: 'Failed to get NFT',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get NFTs by Account
   * GET /xrpl/nft/account/:address
   */
  fastify.get<{
    Params: { address: string }
    Querystring: { limit?: string; offset?: string }
  }>('/account/:address', async (request, reply) => {
    try {
      const { address } = request.params
      const limit = parseInt(request.query.limit || '50', 10)
      const offset = parseInt(request.query.offset || '0', 10)

      const { data, error, count } = await supabase
        .from('xrpl_nfts')
        .select('*', { count: 'exact' })
        .eq('owner_address', address)
        .eq('status', 'active')
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
        error: 'Failed to get account NFTs',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get NFT Offers
   * GET /xrpl/nft/:nftId/offers
   */
  fastify.get<{
    Params: { nftId: string }
    Querystring: { type?: 'sell' | 'buy' }
  }>('/:nftId/offers', async (request, reply) => {
    try {
      const { nftId } = request.params
      const { type } = request.query

      let query = supabase
        .from('xrpl_nft_offers')
        .select('*')
        .eq('nft_id', nftId)
        .eq('status', 'active')

      if (type) {
        query = query.eq('offer_type', type)
      }

      const { data, error } = await query

      if (error) throw error

      return reply.send({
        success: true,
        data: data
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get NFT offers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Calculate NFT flags value from flags object
   */
  function calculateNFTFlags(flags: NFTMintRequest['flags']): number {
    let value = 0
    
    if (flags?.burnable) value |= 1
    if (flags?.onlyXRP) value |= 2
    if (flags?.trustLine) value |= 4
    if (flags?.transferable !== false) value |= 8

    return value
  }
}
