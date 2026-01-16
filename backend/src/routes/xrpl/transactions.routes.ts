/**
 * Transactions Routes
 * API routes for XRPL transaction queries and management
 */

import { FastifyInstance } from 'fastify'
import { SupabaseClient } from '@supabase/supabase-js'
import { xrplMonitor, xrplCache } from '../../services/xrpl'
import type { TransactionRequest } from '../../types/xrpl'

export default async function transactionsRoutes(
  fastify: FastifyInstance,
  options: { supabase: SupabaseClient }
) {
  const { supabase } = options

  /**
   * Get Transaction by Hash
   * GET /xrpl/transactions/:hash
   */
  fastify.get<{
    Params: { hash: string }
  }>('/:hash', async (request, reply) => {
    try {
      const { hash } = request.params

      // Check cache first
      const cacheKey = `tx:${hash}`
      const cached = xrplCache.get(cacheKey)
      if (cached) {
        xrplMonitor.recordMetric('transaction_cache_hit', 1)
        return reply.send({
          success: true,
          data: cached,
          cached: true
        })
      }

      xrplMonitor.recordMetric('transaction_cache_miss', 1)

      // Query transaction from multiple tables
      const [mptTx, nftTx, channelTx, escrowTx, checkTx] = await Promise.all([
        supabase.from('mpt_transactions').select('*').eq('transaction_hash', hash).maybeSingle(),
        supabase.from('xrpl_nft_transfers').select('*').eq('transaction_hash', hash).maybeSingle(),
        supabase.from('xrpl_payment_channels').select('*').eq('create_transaction_hash', hash).maybeSingle(),
        supabase.from('xrpl_escrows').select('*').eq('create_transaction_hash', hash).maybeSingle(),
        supabase.from('xrpl_checks').select('*').eq('create_transaction_hash', hash).maybeSingle()
      ])

      const transaction = 
        mptTx.data || 
        nftTx.data || 
        channelTx.data || 
        escrowTx.data || 
        checkTx.data

      if (!transaction) {
        return reply.status(404).send({
          error: 'Transaction not found'
        })
      }

      // Cache result
      xrplCache.set(cacheKey, transaction, 600) // 10 minutes

      return reply.send({
        success: true,
        data: transaction
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Transactions by Account
   * GET /xrpl/transactions/account/:address
   */
  fastify.get<{
    Params: { address: string }
    Querystring: {
      type?: string
      limit?: string
      offset?: string
      startDate?: string
      endDate?: string
    }
  }>('/account/:address', async (request, reply) => {
    try {
      const { address } = request.params
      const { type, startDate, endDate } = request.query
      const limit = parseInt(request.query.limit || '50', 10)
      const offset = parseInt(request.query.offset || '0', 10)

      const transactions: any[] = []

      // Query MPT transactions
      if (!type || type === 'mpt') {
        const { data } = await supabase
          .from('mpt_transactions')
          .select('*, mpt_issuances!inner(metadata)')
          .or(`from_address.eq.${address},to_address.eq.${address}`)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (data) {
          transactions.push(...data.map(tx => ({
            ...tx,
            transactionType: 'MPT',
            tokenInfo: tx.mpt_issuances?.metadata
          })))
        }
      }

      // Query NFT transactions
      if (!type || type === 'nft') {
        const { data } = await supabase
          .from('xrpl_nft_transfers')
          .select('*, xrpl_nfts!inner(name, image_url)')
          .or(`from_address.eq.${address},to_address.eq.${address}`)
          .order('transferred_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (data) {
          transactions.push(...data.map(tx => ({
            ...tx,
            transactionType: 'NFT',
            nftInfo: { 
              name: tx.xrpl_nfts?.name, 
              image: tx.xrpl_nfts?.image_url 
            }
          })))
        }
      }

      // Sort all transactions by date
      transactions.sort((a, b) => {
        const dateA = new Date(a.created_at || a.transferred_at).getTime()
        const dateB = new Date(b.created_at || b.transferred_at).getTime()
        return dateB - dateA
      })

      // Apply date filters if provided
      let filtered = transactions
      if (startDate) {
        const start = new Date(startDate)
        filtered = filtered.filter(tx => {
          const txDate = new Date(tx.created_at || tx.transferred_at)
          return txDate >= start
        })
      }
      if (endDate) {
        const end = new Date(endDate)
        filtered = filtered.filter(tx => {
          const txDate = new Date(tx.created_at || tx.transferred_at)
          return txDate <= end
        })
      }

      return reply.send({
        success: true,
        data: filtered,
        pagination: {
          limit,
          offset,
          total: filtered.length
        }
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get account transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Get Transaction Statistics
   * GET /xrpl/transactions/stats/:address
   */
  fastify.get<{
    Params: { address: string }
    Querystring: { period?: '24h' | '7d' | '30d' | '90d' }
  }>('/stats/:address', async (request, reply) => {
    try {
      const { address } = request.params
      const { period = '30d' } = request.query

      // Calculate date range
      const now = new Date()
      const periodHours = {
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30,
        '90d': 24 * 90
      }
      const startDate = new Date(now.getTime() - periodHours[period] * 60 * 60 * 1000)

      // Query transaction counts
      const [mptCount, nftCount, channelCount, escrowCount, checkCount] = await Promise.all([
        supabase
          .from('mpt_transactions')
          .select('id', { count: 'exact', head: true })
          .or(`from_address.eq.${address},to_address.eq.${address}`)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('xrpl_nft_transfers')
          .select('id', { count: 'exact', head: true })
          .or(`from_address.eq.${address},to_address.eq.${address}`)
          .gte('transferred_at', startDate.toISOString()),
        supabase
          .from('xrpl_payment_channels')
          .select('id', { count: 'exact', head: true })
          .or(`source_address.eq.${address},destination_address.eq.${address}`)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('xrpl_escrows')
          .select('id', { count: 'exact', head: true })
          .or(`owner_address.eq.${address},destination_address.eq.${address}`)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('xrpl_checks')
          .select('id', { count: 'exact', head: true })
          .or(`sender_address.eq.${address},destination_address.eq.${address}`)
          .gte('created_at', startDate.toISOString())
      ])

      const stats = {
        period,
        address,
        totalTransactions: 
          (mptCount.count || 0) + 
          (nftCount.count || 0) + 
          (channelCount.count || 0) + 
          (escrowCount.count || 0) + 
          (checkCount.count || 0),
        byType: {
          mpt: mptCount.count || 0,
          nft: nftCount.count || 0,
          paymentChannel: channelCount.count || 0,
          escrow: escrowCount.count || 0,
          check: checkCount.count || 0
        },
        dateRange: {
          start: startDate,
          end: now
        }
      }

      return reply.send({
        success: true,
        data: stats
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get transaction statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * Verify Transaction
   * POST /xrpl/transactions/verify
   */
  fastify.post<{
    Body: { hash: string }
  }>('/verify', async (request, reply) => {
    try {
      const { hash } = request.body

      if (!hash) {
        return reply.status(400).send({
          error: 'Transaction hash is required'
        })
      }

      // In a real implementation, this would verify the transaction on XRPL
      // For now, just check if it exists in our database

      const transaction = await fastify.inject({
        method: 'GET',
        url: `/xrpl/transactions/${hash}`
      })

      const verified = transaction.statusCode === 200

      xrplMonitor.recordMetric('transaction_verified', verified ? 1 : 0)

      return reply.send({
        success: true,
        verified,
        hash
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to verify transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
