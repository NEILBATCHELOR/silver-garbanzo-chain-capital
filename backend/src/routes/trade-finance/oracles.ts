/**
 * Trade Finance - Oracle & Price Feed Routes
 * API routes for managing commodity price feeds and oracle health
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface GetPriceParams {
  Params: {
    commodity: string
  }
  Querystring: {
    project_id: string
  }
}

interface GetPriceHistoryParams {
  Params: {
    commodity: string
  }
  Querystring: {
    project_id: string
    from?: string
    to?: string
    interval?: 'hourly' | 'daily' | 'weekly'
  }
}

interface OracleHealthQuery {
  Querystring: {
    project_id: string
  }
}

export async function oraclesRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/oracles/prices/:commodity
   * Get current price for a commodity
   */
  fastify.get<GetPriceParams>(
    '/api/trade-finance/oracles/prices/:commodity',
    async (
      request: FastifyRequest<GetPriceParams>,
      reply: FastifyReply
    ) => {
      try {
        const { commodity } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Query latest price from database
        const { data: priceData, error } = await fastify.supabase
          .from('commodity_prices')
          .select('*')
          .eq('commodity_type', commodity)
          .eq('project_id', project_id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        if (error || !priceData) {
          return reply.status(404).send({
            error: { message: `No price data found for commodity: ${commodity}` }
          })
        }

        // Check if price is stale (> 1 hour old)
        const priceAge = Date.now() - new Date(priceData.timestamp).getTime()
        const isStale = priceAge > 3600000 // 1 hour in milliseconds

        return reply.send({
          data: {
            commodity,
            price: priceData.price_usd,
            confidence: priceData.confidence_score,
            source: priceData.oracle_source,
            timestamp: priceData.timestamp,
            isStale,
            ageMinutes: Math.floor(priceAge / 60000)
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch price'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/oracles/price-history/:commodity
   * Get historical price data for a commodity
   */
  fastify.get<GetPriceHistoryParams>(
    '/api/trade-finance/oracles/price-history/:commodity',
    async (
      request: FastifyRequest<GetPriceHistoryParams>,
      reply: FastifyReply
    ) => {
      try {
        const { commodity } = request.params
        const { project_id, from, to, interval = 'daily' } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Build query
        let query = fastify.supabase
          .from('commodity_prices')
          .select('timestamp, price_usd, volume, confidence_score')
          .eq('commodity_type', commodity)
          .eq('project_id', project_id)
          .order('timestamp', { ascending: true })

        // Apply time filters
        if (from) {
          query = query.gte('timestamp', from)
        }
        if (to) {
          query = query.lte('timestamp', to)
        }

        // Limit based on interval
        const limits = {
          hourly: 720,  // 30 days
          daily: 365,   // 1 year
          weekly: 260   // 5 years
        }
        query = query.limit(limits[interval])

        const { data: priceHistory, error } = await query

        if (error) {
          return reply.status(500).send({
            error: { message: 'Failed to fetch price history: ' + error.message }
          })
        }

        // Calculate summary statistics
        const prices = priceHistory?.map(p => p.price_usd) || []
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length || 0
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const priceChange = prices.length > 1 
          ? ((prices[prices.length - 1] || 0) - (prices[0] || 0)) / (prices[0] || 1)
          : 0

        return reply.send({
          data: {
            commodity,
            interval,
            dataPoints: priceHistory?.length || 0,
            prices: priceHistory,
            summary: {
              avgPrice,
              minPrice,
              maxPrice,
              priceChange: priceChange * 100, // %
              startDate: priceHistory?.[0]?.timestamp,
              endDate: priceHistory?.[priceHistory.length - 1]?.timestamp
            }
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch price history'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/oracles/health
   * Check health status of all oracle feeds
   */
  fastify.get<OracleHealthQuery>(
    '/api/trade-finance/oracles/health',
    async (
      request: FastifyRequest<OracleHealthQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get latest price for each commodity
        const { data: latestPrices, error } = await fastify.supabase
          .from('commodity_prices')
          .select('commodity_type, timestamp, confidence_score, oracle_source')
          .eq('project_id', project_id)
          .order('timestamp', { ascending: false })

        if (error) {
          return reply.status(500).send({
            error: { message: 'Failed to fetch oracle health: ' + error.message }
          })
        }

        // Group by commodity and get latest
        const commodityMap = new Map()
        latestPrices?.forEach(price => {
          if (!commodityMap.has(price.commodity_type)) {
            commodityMap.set(price.commodity_type, price)
          }
        })

        // Check health of each feed
        const now = Date.now()
        const healthChecks = Array.from(commodityMap.values()).map(price => {
          const ageMs = now - new Date(price.timestamp).getTime()
          const ageMinutes = Math.floor(ageMs / 60000)
          
          let status: 'healthy' | 'degraded' | 'stale' | 'offline'
          if (ageMinutes < 30) status = 'healthy'
          else if (ageMinutes < 60) status = 'degraded'
          else if (ageMinutes < 180) status = 'stale'
          else status = 'offline'

          return {
            commodity: price.commodity_type,
            status,
            lastUpdate: price.timestamp,
            ageMinutes,
            confidence: price.confidence_score,
            source: price.oracle_source
          }
        })

        // Overall system health
        const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
        const totalCount = healthChecks.length
        const systemHealth = totalCount > 0 
          ? (healthyCount / totalCount) * 100 
          : 0

        return reply.send({
          data: {
            systemHealth: {
              status: systemHealth >= 80 ? 'healthy' : systemHealth >= 50 ? 'degraded' : 'critical',
              percentage: systemHealth,
              healthyFeeds: healthyCount,
              totalFeeds: totalCount
            },
            feeds: healthChecks
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to check oracle health'
          }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/oracles/update-price
   * Manually update commodity price (Admin only)
   */
  fastify.post(
    '/api/trade-finance/oracles/update-price',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { 
          commodity_type, 
          price_usd, 
          project_id, 
          oracle_source = 'manual',
          confidence_score = 100 
        } = request.body as {
          commodity_type: string
          price_usd: number
          project_id: string
          oracle_source?: string
          confidence_score?: number
        }

        if (!commodity_type || !price_usd || !project_id) {
          return reply.status(400).send({
            error: { message: 'commodity_type, price_usd, and project_id are required' }
          })
        }

        // Insert new price record
        const { data: priceRecord, error } = await fastify.supabase
          .from('commodity_prices')
          .insert({
            project_id,
            commodity_type,
            price_usd,
            oracle_source,
            confidence_score,
            timestamp: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          return reply.status(500).send({
            error: { message: 'Failed to update price: ' + error.message }
          })
        }

        return reply.send({
          data: {
            success: true,
            priceRecord,
            message: 'Price updated successfully'
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to update price'
          }
        })
      }
    }
  )
}
