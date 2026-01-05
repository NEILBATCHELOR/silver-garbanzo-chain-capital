/**
 * Trade Finance - Analytics Routes
 * API routes for market analytics, trends, and historical data
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface AnalyticsQuery {
  Querystring: {
    project_id: string
    start_date?: string // ISO date
    end_date?: string // ISO date
    interval?: 'hour' | 'day' | 'week' | 'month'
  }
}

interface CommodityAnalyticsParams {
  Params: {
    commodityType: string
  }
  Querystring: {
    project_id: string
    start_date?: string
    end_date?: string
    interval?: 'hour' | 'day' | 'week' | 'month'
  }
}

export async function analyticsRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/analytics/tvl-history
   * Get TVL (Total Value Locked) history over time
   */
  fastify.get<AnalyticsQuery>(
    '/api/trade-finance/analytics/tvl-history',
    async (
      request: FastifyRequest<AnalyticsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const {
          project_id,
          start_date,
          end_date,
          interval = 'day'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get market data snapshots
        let query = fastify.supabase
          .from('commodity_market_data')
          .select('created_at, total_supply_usd, total_borrow_usd')
          .eq('project_id', project_id)
          .order('created_at', { ascending: true })

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: snapshots, error } = await query

        if (error) {
          throw new Error('Failed to fetch TVL history: ' + error.message)
        }

        // Aggregate by interval
        const aggregated = aggregateByInterval(snapshots || [], interval, (items) => {
          const totalSupply = items.reduce((sum, item) => sum + (item.total_supply_usd || 0), 0)
          const totalBorrow = items.reduce((sum, item) => sum + (item.total_borrow_usd || 0), 0)
          return {
            tvl: totalSupply,
            totalSupply,
            totalBorrow,
            utilizationRate: totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0
          }
        })

        return reply.send({ data: aggregated })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch TVL history'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/analytics/apy-trends
   * Get APY trends over time for all markets
   */
  fastify.get<AnalyticsQuery>(
    '/api/trade-finance/analytics/apy-trends',
    async (
      request: FastifyRequest<AnalyticsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const {
          project_id,
          start_date,
          end_date,
          interval = 'day'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get market data with APY information
        let query = fastify.supabase
          .from('commodity_market_data')
          .select('created_at, commodity_type, supply_apy, borrow_apy')
          .eq('project_id', project_id)
          .order('created_at', { ascending: true })

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: snapshots, error } = await query

        if (error) {
          throw new Error('Failed to fetch APY trends: ' + error.message)
        }

        // Group by commodity type
        const byCommodity: { [key: string]: any[] } = {}
        snapshots?.forEach(snapshot => {
          const type = snapshot.commodity_type
          if (!byCommodity[type]) {
            byCommodity[type] = []
          }
          byCommodity[type].push(snapshot)
        })

        // Aggregate each commodity's data
        const trends: { [key: string]: any[] } = {}
        Object.keys(byCommodity).forEach(commodityType => {
          const commodityData = byCommodity[commodityType]
          if (commodityData && commodityData.length > 0) {
            trends[commodityType] = aggregateByInterval(
              commodityData,
              interval,
              (items) => ({
                supplyAPY: items.reduce((sum, item) => sum + (item.supply_apy || 0), 0) / items.length,
                borrowAPY: items.reduce((sum, item) => sum + (item.borrow_apy || 0), 0) / items.length
              })
            )
          }
        })

        return reply.send({ data: trends })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch APY trends'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/analytics/commodity/:commodityType/history
   * Get detailed historical data for a specific commodity
   */
  fastify.get<CommodityAnalyticsParams>(
    '/api/trade-finance/analytics/commodity/:commodityType/history',
    async (
      request: FastifyRequest<CommodityAnalyticsParams>,
      reply: FastifyReply
    ) => {
      try {
        const { commodityType } = request.params
        const {
          project_id,
          start_date,
          end_date,
          interval = 'day'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get price history
        let priceQuery = fastify.supabase
          .from('commodity_prices')
          .select('created_at, price_usd, volume_24h')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType.toLowerCase())
          .order('created_at', { ascending: true })

        if (start_date) {
          priceQuery = priceQuery.gte('created_at', start_date)
        }
        if (end_date) {
          priceQuery = priceQuery.lte('created_at', end_date)
        }

        // Get market data history
        let marketQuery = fastify.supabase
          .from('commodity_market_data')
          .select('created_at, supply_apy, borrow_apy, utilization_rate, total_supply_usd, total_borrow_usd')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType.toLowerCase())
          .order('created_at', { ascending: true })

        if (start_date) {
          marketQuery = marketQuery.gte('created_at', start_date)
        }
        if (end_date) {
          marketQuery = marketQuery.lte('created_at', end_date)
        }

        const [
          { data: priceData, error: priceError },
          { data: marketData, error: marketError }
        ] = await Promise.all([priceQuery, marketQuery])

        if (priceError || marketError) {
          throw new Error('Failed to fetch commodity history')
        }

        // Aggregate price data
        const priceHistory = aggregateByInterval(priceData || [], interval, (items) => ({
          price: items.reduce((sum, item) => sum + (item.price_usd || 0), 0) / items.length,
          volume: items.reduce((sum, item) => sum + (item.volume_24h || 0), 0),
          high: Math.max(...items.map(item => item.price_usd || 0)),
          low: Math.min(...items.map(item => item.price_usd || 0))
        }))

        // Aggregate market data
        const marketHistory = aggregateByInterval(marketData || [], interval, (items) => ({
          supplyAPY: items.reduce((sum, item) => sum + (item.supply_apy || 0), 0) / items.length,
          borrowAPY: items.reduce((sum, item) => sum + (item.borrow_apy || 0), 0) / items.length,
          utilizationRate: items.reduce((sum, item) => sum + (item.utilization_rate || 0), 0) / items.length,
          totalSupplyUSD: items.reduce((sum, item) => sum + (item.total_supply_usd || 0), 0) / items.length,
          totalBorrowUSD: items.reduce((sum, item) => sum + (item.total_borrow_usd || 0), 0) / items.length
        }))

        return reply.send({
          data: {
            commodityType,
            priceHistory,
            marketHistory
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch commodity history'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/analytics/utilization-rates
   * Get utilization rates across all commodities
   */
  fastify.get<AnalyticsQuery>(
    '/api/trade-finance/analytics/utilization-rates',
    async (
      request: FastifyRequest<AnalyticsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, start_date, end_date } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get latest market data for each commodity
        let query = fastify.supabase
          .from('commodity_market_data')
          .select('commodity_type, utilization_rate, total_supply_usd, total_borrow_usd, created_at')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data: marketData, error } = await query

        if (error) {
          throw new Error('Failed to fetch utilization rates: ' + error.message)
        }

        // Get latest for each commodity
        const latestByCommodity: { [key: string]: any } = {}
        marketData?.forEach(data => {
          if (!latestByCommodity[data.commodity_type]) {
            latestByCommodity[data.commodity_type] = data
          }
        })

        const utilizationRates = Object.values(latestByCommodity).map(data => ({
          commodityType: data.commodity_type,
          utilizationRate: data.utilization_rate,
          totalSupplyUSD: data.total_supply_usd,
          totalBorrowUSD: data.total_borrow_usd,
          timestamp: data.created_at
        }))

        return reply.send({ data: utilizationRates })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch utilization rates'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/analytics/top-suppliers
   * Get top suppliers by total supplied value
   */
  fastify.get<AnalyticsQuery>(
    '/api/trade-finance/analytics/top-suppliers',
    async (
      request: FastifyRequest<AnalyticsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get all positions
        const { data: positions, error } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            wallet_address,
            collateral:commodity_collateral(value_usd)
          `)
          .eq('project_id', project_id)
          .eq('status', 'active')

        if (error) {
          throw new Error('Failed to fetch top suppliers: ' + error.message)
        }

        // Calculate total supplied per wallet
        const supplierTotals: { [key: string]: number } = {}
        positions?.forEach(position => {
          const total = position.collateral?.reduce(
            (sum: number, c: any) => sum + (c.value_usd || 0),
            0
          ) || 0
          supplierTotals[position.wallet_address] = (supplierTotals[position.wallet_address] || 0) + total
        })

        // Sort and get top 10
        const topSuppliers = Object.entries(supplierTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([address, totalSupplied], index) => ({
            rank: index + 1,
            walletAddress: address,
            totalSuppliedUSD: totalSupplied,
            // Anonymize address for privacy
            displayAddress: `${address.slice(0, 6)}...${address.slice(-4)}`
          }))

        return reply.send({ data: topSuppliers })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch top suppliers'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/analytics/top-borrowers
   * Get top borrowers by total borrowed value
   */
  fastify.get<AnalyticsQuery>(
    '/api/trade-finance/analytics/top-borrowers',
    async (
      request: FastifyRequest<AnalyticsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get all positions
        const { data: positions, error } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            wallet_address,
            debt:commodity_debt(value_usd)
          `)
          .eq('project_id', project_id)
          .eq('status', 'active')

        if (error) {
          throw new Error('Failed to fetch top borrowers: ' + error.message)
        }

        // Calculate total borrowed per wallet
        const borrowerTotals: { [key: string]: number } = {}
        positions?.forEach(position => {
          const total = position.debt?.reduce(
            (sum: number, d: any) => sum + (d.value_usd || 0),
            0
          ) || 0
          if (total > 0) {
            borrowerTotals[position.wallet_address] = (borrowerTotals[position.wallet_address] || 0) + total
          }
        })

        // Sort and get top 10
        const topBorrowers = Object.entries(borrowerTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([address, totalBorrowed], index) => ({
            rank: index + 1,
            walletAddress: address,
            totalBorrowedUSD: totalBorrowed,
            // Anonymize address for privacy
            displayAddress: `${address.slice(0, 6)}...${address.slice(-4)}`
          }))

        return reply.send({ data: topBorrowers })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch top borrowers'
          }
        })
      }
    }
  )
}

/**
 * Helper function to aggregate data by time interval
 */
function aggregateByInterval<T>(
  data: any[],
  interval: 'hour' | 'day' | 'week' | 'month',
  aggregator: (items: any[]) => T
): Array<{ timestamp: string; data: T }> {
  if (!data || data.length === 0) return []

  // Group by interval
  const grouped: { [key: string]: any[] } = {}

  data.forEach(item => {
    const date = new Date(item.created_at)
    let key: string = ''

    switch (interval) {
      case 'hour':
        date.setMinutes(0, 0, 0)
        key = date.toISOString()
        break
      case 'day':
        date.setHours(0, 0, 0, 0)
        key = date.toISOString().split('T')[0] || ''
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        weekStart.setHours(0, 0, 0, 0)
        key = weekStart.toISOString().split('T')[0] || ''
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    if (key) {
      const group = grouped[key] ?? []
      group.push(item)
      grouped[key] = group
    }
  })

  // Aggregate each group
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, items]) => ({
      timestamp,
      data: aggregator(items)
    }))
}
