/**
 * Wallets Routes
 * API routes for XRPL wallet operations
 */

import { FastifyInstance } from 'fastify'
import { SupabaseClient } from '@supabase/supabase-js'
import { xrplMonitor, xrplCache } from '../../services/xrpl'

export default async function walletsRoutes(
  fastify: FastifyInstance,
  options: { supabase: SupabaseClient }
) {
  const { supabase } = options

  /**
   * Get Wallet Balance
   * GET /xrpl/wallets/:address/balance
   */
  fastify.get<{
    Params: { address: string }
  }>('/:address/balance', async (request, reply) => {
    try {
      const { address } = request.params

      // Validate address format
      if (!isValidXRPLAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid XRPL address format'
        })
      }

      // Check cache first
      const cacheKey = `balance:${address}`
      const cached = xrplCache.get(cacheKey)
      if (cached) {
        xrplMonitor.recordMetric('balance_cache_hit', 1)
        return reply.send({
          success: true,
          data: cached,
          cached: true
        })
      }

      xrplMonitor.recordMetric('balance_cache_miss', 1)

      // In a real implementation, this would query XRPL ledger
      // For now, aggregate from our database

      // Get MPT balances
      const { data: mptBalances } = await supabase
        .from('mpt_holders')
        .select('*, mpt_issuances!inner(metadata)')
        .eq('holder_address', address)
        .eq('authorized', true)

      // Get NFT count
      const { count: nftCount } = await supabase
        .from('xrpl_nfts')
        .select('id', { count: 'exact', head: true })
        .eq('owner_address', address)
        .eq('status', 'active')

      const balances = {
        address,
        xrp: '0', // Would come from XRPL ledger
        mptTokens: mptBalances?.map(balance => ({
          issuanceId: balance.mpt_issuance_id,
          balance: balance.balance,
          metadata: balance.mpt_issuances?.metadata
        })) || [],
        nftCount: nftCount || 0,
        timestamp: new Date()
      }

      // Cache for 30 seconds
      xrplCache.set(cacheKey, balances, 30)

      return reply.send({
        success: true,
        data: balances
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get wallet balance',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Wallet Assets
   * GET /xrpl/wallets/:address/assets
   */
  fastify.get<{
    Params: { address: string }
    Querystring: { type?: 'mpt' | 'nft' | 'all' }
  }>('/:address/assets', async (request, reply) => {
    try {
      const { address } = request.params
      const { type = 'all' } = request.query

      if (!isValidXRPLAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid XRPL address format'
        })
      }

      const assets: any = {}

      // Get MPT holdings
      if (type === 'mpt' || type === 'all') {
        const { data: mptHoldings } = await supabase
          .from('mpt_holders')
          .select('*, mpt_issuances!inner(*)')
          .eq('holder_address', address)
          .eq('authorized', true)

        assets.mptTokens = mptHoldings || []
      }

      // Get NFTs
      if (type === 'nft' || type === 'all') {
        const { data: nfts } = await supabase
          .from('xrpl_nfts')
          .select('*')
          .eq('owner_address', address)
          .eq('status', 'active')

        assets.nfts = nfts || []
      }

      return reply.send({
        success: true,
        data: assets
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get wallet assets',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Wallet Info
   * GET /xrpl/wallets/:address/info
   */
  fastify.get<{
    Params: { address: string }
  }>('/:address/info', async (request, reply) => {
    try {
      const { address } = request.params

      if (!isValidXRPLAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid XRPL address format'
        })
      }

      // Get wallet statistics
      const [mptCount, nftCount, txCount] = await Promise.all([
        supabase
          .from('mpt_holders')
          .select('id', { count: 'exact', head: true })
          .eq('holder_address', address)
          .eq('authorized', true),
        supabase
          .from('xrpl_nfts')
          .select('id', { count: 'exact', head: true })
          .eq('owner_address', address)
          .eq('status', 'active'),
        supabase
          .from('mpt_transactions')
          .select('id', { count: 'exact', head: true })
          .or(`from_address.eq.${address},to_address.eq.${address}`)
      ])

      const info = {
        address,
        stats: {
          mptTokenCount: mptCount.count || 0,
          nftCount: nftCount.count || 0,
          transactionCount: txCount.count || 0
        },
        xrpLedgerInfo: {
          // Would come from XRPL ledger in real implementation
          sequence: 0,
          balance: '0',
          ownerCount: 0
        }
      }

      return reply.send({
        success: true,
        data: info
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get wallet info',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Wallet Activity
   * GET /xrpl/wallets/:address/activity
   */
  fastify.get<{
    Params: { address: string }
    Querystring: { 
      limit?: string
      offset?: string
      days?: string
    }
  }>('/:address/activity', async (request, reply) => {
    try {
      const { address } = request.params
      const limit = parseInt(request.query.limit || '20', 10)
      const offset = parseInt(request.query.offset || '0', 10)
      const days = parseInt(request.query.days || '30', 10)

      if (!isValidXRPLAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid XRPL address format'
        })
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get recent transactions
      const { data: mptTxs } = await supabase
        .from('mpt_transactions')
        .select('*')
        .or(`from_address.eq.${address},to_address.eq.${address}`)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: nftTxs } = await supabase
        .from('xrpl_nft_transfers')
        .select('*')
        .or(`from_address.eq.${address},to_address.eq.${address}`)
        .gte('transferred_at', startDate.toISOString())
        .order('transferred_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Combine and sort activities
      const activities = [
        ...(mptTxs || []).map(tx => ({
          ...tx,
          type: 'mpt_transfer',
          timestamp: tx.created_at
        })),
        ...(nftTxs || []).map(tx => ({
          ...tx,
          type: 'nft_transfer',
          timestamp: tx.transferred_at
        }))
      ].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      return reply.send({
        success: true,
        data: activities.slice(0, limit),
        pagination: {
          limit,
          offset,
          total: activities.length
        }
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get wallet activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Validate address format
   */
  function isValidXRPLAddress(address: string): boolean {
    return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)
  }
}
