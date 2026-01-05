/**
 * Trade Finance - Activity Feed Routes
 * Real-time activity feed with filtering and live updates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface ActivityFeedQuery {
  Querystring: {
    project_id: string
    limit?: number
    offset?: number
    wallet_address?: string
    commodity_type?: string
    action_types?: string // comma-separated
    min_value?: number
    start_date?: string
    end_date?: string
    sort_order?: 'asc' | 'desc'
  }
}

interface LiveActivityQuery {
  Querystring: {
    project_id: string
    since?: string // ISO timestamp
  }
}

export async function activityFeedRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/activity/feed
   * Get comprehensive activity feed with advanced filtering
   */
  fastify.get<ActivityFeedQuery>(
    '/api/trade-finance/activity/feed',
    async (
      request: FastifyRequest<ActivityFeedQuery>,
      reply: FastifyReply
    ) => {
      try {
        const {
          project_id,
          limit = 20,
          offset = 0,
          wallet_address,
          commodity_type,
          action_types,
          min_value,
          start_date,
          end_date,
          sort_order = 'desc'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Build query
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .order('created_at', { ascending: sort_order === 'asc' })
          .range(offset, offset + limit - 1)

        // Apply filters
        if (wallet_address) {
          query = query.eq('wallet_address', wallet_address.toLowerCase())
        }

        if (commodity_type) {
          query = query.eq('commodity_type', commodity_type.toLowerCase())
        }

        if (action_types) {
          const types = action_types.split(',').map(t => t.trim())
          query = query.in('transaction_type', types)
        }

        if (min_value) {
          query = query.gte('value_usd', min_value)
        }

        if (start_date) {
          query = query.gte('created_at', start_date)
        }

        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch activity feed: ' + error.message)
        }

        // Get total count for pagination
        let countQuery = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project_id)

        if (wallet_address) {
          countQuery = countQuery.eq('wallet_address', wallet_address.toLowerCase())
        }
        if (commodity_type) {
          countQuery = countQuery.eq('commodity_type', commodity_type.toLowerCase())
        }
        if (action_types) {
          const types = action_types.split(',').map(t => t.trim())
          countQuery = countQuery.in('transaction_type', types)
        }
        if (min_value) {
          countQuery = countQuery.gte('value_usd', min_value)
        }
        if (start_date) {
          countQuery = countQuery.gte('created_at', start_date)
        }
        if (end_date) {
          countQuery = countQuery.lte('created_at', end_date)
        }

        const { count } = await countQuery

        // Format activity items
        const activities = transactions?.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          walletAddress: tx.wallet_address,
          displayAddress: `${tx.wallet_address.slice(0, 6)}...${tx.wallet_address.slice(-4)}`,
          commodityType: tx.commodity_type,
          amount: tx.amount,
          valueUSD: tx.value_usd,
          timestamp: tx.created_at,
          txHash: tx.transaction_hash,
          isLarge: tx.value_usd >= 10000, // Flag large transactions
          status: tx.status || 'completed'
        })) || []

        return reply.send({
          data: {
            activities,
            pagination: {
              total: count || 0,
              limit,
              offset,
              hasMore: (count || 0) > offset + limit
            }
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch activity feed'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/activity/live
   * Get live activity updates since a timestamp (for polling)
   */
  fastify.get<LiveActivityQuery>(
    '/api/trade-finance/activity/live',
    async (
      request: FastifyRequest<LiveActivityQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, since } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get transactions since timestamp
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })
          .limit(50) // Max 50 new items

        if (since) {
          query = query.gt('created_at', since)
        } else {
          // If no timestamp, get last 10 items
          query = query.limit(10)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch live activity: ' + error.message)
        }

        // Format activity items
        const activities = transactions?.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          walletAddress: tx.wallet_address,
          displayAddress: `${tx.wallet_address.slice(0, 6)}...${tx.wallet_address.slice(-4)}`,
          commodityType: tx.commodity_type,
          amount: tx.amount,
          valueUSD: tx.value_usd,
          timestamp: tx.created_at,
          txHash: tx.transaction_hash,
          isLarge: tx.value_usd >= 10000,
          status: tx.status || 'completed'
        })) || []

        return reply.send({
          data: {
            activities,
            count: activities.length,
            latestTimestamp: activities.length > 0 ? activities[0]?.timestamp : null
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch live activity'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/activity/recent-large
   * Get recent large transactions (> $10k)
   */
  fastify.get<ActivityFeedQuery>(
    '/api/trade-finance/activity/recent-large',
    async (
      request: FastifyRequest<ActivityFeedQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, limit = 10 } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const { data: transactions, error } = await fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .gte('value_usd', 10000)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          throw new Error('Failed to fetch large transactions: ' + error.message)
        }

        const activities = transactions?.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          walletAddress: tx.wallet_address,
          displayAddress: `${tx.wallet_address.slice(0, 6)}...${tx.wallet_address.slice(-4)}`,
          commodityType: tx.commodity_type,
          amount: tx.amount,
          valueUSD: tx.value_usd,
          timestamp: tx.created_at,
          txHash: tx.transaction_hash
        })) || []

        return reply.send({ data: activities })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch large transactions'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/activity/recent-by-type
   * Get recent activity grouped by transaction type
   */
  fastify.get<ActivityFeedQuery>(
    '/api/trade-finance/activity/recent-by-type',
    async (
      request: FastifyRequest<ActivityFeedQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, limit = 5 } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const types = ['supply', 'withdraw', 'borrow', 'repay', 'liquidate']
        const results: { [key: string]: any[] } = {}

        // Fetch recent transactions for each type
        await Promise.all(
          types.map(async (type) => {
            const { data } = await fastify.supabase
              .from('trade_finance_reserve_transactions')
              .select('*')
              .eq('project_id', project_id)
              .eq('transaction_type', type)
              .order('created_at', { ascending: false })
              .limit(limit)

            results[type] = data?.map(tx => ({
              id: tx.id,
              walletAddress: tx.wallet_address,
              displayAddress: `${tx.wallet_address.slice(0, 6)}...${tx.wallet_address.slice(-4)}`,
              commodityType: tx.commodity_type,
              amount: tx.amount,
              valueUSD: tx.value_usd,
              timestamp: tx.created_at,
              txHash: tx.transaction_hash
            })) || []
          })
        )

        return reply.send({ data: results })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch activity by type'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/activity/stats
   * Get activity statistics (counts by type, volume, etc.)
   */
  fastify.get<ActivityFeedQuery>(
    '/api/trade-finance/activity/stats',
    async (
      request: FastifyRequest<ActivityFeedQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, start_date, end_date } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('transaction_type, value_usd')
          .eq('project_id', project_id)

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch activity stats: ' + error.message)
        }

        // Calculate statistics
        const stats = {
          total: transactions?.length || 0,
          byType: {
            supply: 0,
            withdraw: 0,
            borrow: 0,
            repay: 0,
            liquidate: 0
          },
          volumeByType: {
            supply: 0,
            withdraw: 0,
            borrow: 0,
            repay: 0,
            liquidate: 0
          },
          totalVolume: 0,
          largeTransactions: 0 // > $10k
        }

        transactions?.forEach(tx => {
          const type = tx.transaction_type as keyof typeof stats.byType
          if (type && stats.byType[type] !== undefined) {
            stats.byType[type]++
            stats.volumeByType[type] += tx.value_usd || 0
          }
          stats.totalVolume += tx.value_usd || 0
          if (tx.value_usd >= 10000) {
            stats.largeTransactions++
          }
        })

        return reply.send({ data: stats })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch activity stats'
          }
        })
      }
    }
  )
}
