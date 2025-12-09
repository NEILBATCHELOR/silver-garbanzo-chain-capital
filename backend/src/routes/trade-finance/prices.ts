/**
 * Trade Finance - Price Management Routes
 * API routes for managing FRED price feeds and historical data
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createPriceAggregator } from '../../services/trade-finance/PriceAggregator'

interface UpdatePricesRequest {
  Body: {
    project_id: string
    commodities?: string[] // If not provided, updates all
  }
}

interface LoadHistoricalRequest {
  Body: {
    project_id: string
    commodities: string[]
    start_date: string // YYYY-MM-DD
    end_date: string   // YYYY-MM-DD
  }
}

interface GetCurrentPriceRequest {
  Params: {
    commodity: string
  }
  Querystring: {
    project_id: string
    max_age_minutes?: number
  }
}

export async function priceManagementRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/trade-finance/prices/update
   * Update commodity prices from FRED
   */
  fastify.post<UpdatePricesRequest>(
    '/api/trade-finance/prices/update',
    async (
      request: FastifyRequest<UpdatePricesRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, commodities } = request.body

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const aggregator = createPriceAggregator(fastify, project_id)

        let result
        if (commodities && commodities.length > 0) {
          // Update specific commodities
          const success: string[] = []
          const failed: string[] = []

          for (const commodity of commodities) {
            try {
              const priceData = await aggregator.fetchCurrentPrice(commodity)
              if (priceData) {
                await aggregator.updatePriceInDatabase(priceData)
                success.push(commodity)
              } else {
                failed.push(commodity)
              }
            } catch (error) {
              failed.push(commodity)
              console.error(`Failed to update ${commodity}:`, error)
            }
          }

          result = { success, failed }
        } else {
          // Update all commodities
          result = await aggregator.updateAllPrices()
        }

        return reply.send({
          data: {
            updated: result.success.length,
            failed: result.failed.length,
            success: result.success,
            failures: result.failed,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to update prices'
          }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/prices/load-historical
   * Load historical prices from FRED
   */
  fastify.post<LoadHistoricalRequest>(
    '/api/trade-finance/prices/load-historical',
    async (
      request: FastifyRequest<LoadHistoricalRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, commodities, start_date, end_date } = request.body

        if (!project_id || !commodities || !start_date || !end_date) {
          return reply.status(400).send({
            error: { message: 'project_id, commodities, start_date, and end_date are required' }
          })
        }

        const aggregator = createPriceAggregator(fastify, project_id)
        
        const result = await aggregator.batchLoadHistoricalPrices(
          commodities,
          start_date,
          end_date
        )

        return reply.send({
          data: {
            loaded: result.success.length,
            failed: result.failed.length,
            totalPrices: result.totalPricesLoaded,
            success: result.success,
            failures: result.failed,
            dateRange: { start_date, end_date },
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to load historical prices'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/prices/current/:commodity
   * Get current price with auto-update
   */
  fastify.get<GetCurrentPriceRequest>(
    '/api/trade-finance/prices/current/:commodity',
    async (
      request: FastifyRequest<GetCurrentPriceRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { commodity } = request.params
        const { project_id, max_age_minutes = 60 } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const aggregator = createPriceAggregator(fastify, project_id)
        
        const priceData = await aggregator.getPriceWithAutoUpdate(
          commodity,
          Number(max_age_minutes)
        )

        return reply.send({ data: priceData })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to get current price'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/prices/supported
   * Get list of supported commodities
   */
  fastify.get(
    '/api/trade-finance/prices/supported',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { FRED_COMMODITY_SERIES } = await import('../../services/trade-finance/FREDSeriesMapping')
      
      return reply.send({
        data: {
          commodities: Object.keys(FRED_COMMODITY_SERIES),
          count: Object.keys(FRED_COMMODITY_SERIES).length,
          series: FRED_COMMODITY_SERIES
        }
      })
    }
  )
}
