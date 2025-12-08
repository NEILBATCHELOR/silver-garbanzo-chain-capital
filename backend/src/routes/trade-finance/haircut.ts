/**
 * Trade Finance - Haircut Calculation Routes
 * API routes for statistical risk analysis and haircut recommendations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { HaircutCalculator, PricePoint, RiskMetrics } from '../../services/trade-finance/HaircutCalculator'

interface CalculateHaircutRequest {
  Body: {
    prices: PricePoint[]
    commodityType: string
  }
}

interface GetMetricsParams {
  Params: {
    commodity: string
  }
  Querystring: {
    project_id: string
  }
}

interface SubmitOnChainRequest {
  Body: {
    commodityType: string
    metrics: RiskMetrics
    projectId: string
  }
}

export async function haircutRoutes(fastify: FastifyInstance) {
  const calculator = new HaircutCalculator()

  /**
   * POST /api/trade-finance/haircut/calculate
   * Calculate haircut metrics from historical price data
   */
  fastify.post<CalculateHaircutRequest>(
    '/api/trade-finance/haircut/calculate',
    async (
      request: FastifyRequest<CalculateHaircutRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { prices, commodityType } = request.body

        if (!prices || !Array.isArray(prices) || prices.length < 2) {
          return reply.status(400).send({
            error: { message: 'Invalid price data: need at least 2 price points' }
          })
        }

        // Calculate risk metrics
        const metrics = calculator.calculateRiskMetrics(prices)

        // Generate haircut recommendation
        const recommendation = calculator.recommendHaircut(metrics)

        return reply.send({
          data: {
            metrics,
            recommendation,
            commodityType,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Haircut calculation failed'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/haircut/metrics/:commodity
   * Get current haircut metrics for a commodity
   */
  fastify.get<GetMetricsParams>(
    '/api/trade-finance/haircut/metrics/:commodity',
    async (
      request: FastifyRequest<GetMetricsParams>,
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

        // Query database for stored metrics
        const { data, error } = await fastify.supabase
          .from('commodity_risk_metrics')
          .select('*')
          .eq('commodity_type', commodity)
          .eq('project_id', project_id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          return reply.status(404).send({
            error: { message: `No metrics found for commodity: ${commodity}` }
          })
        }

        return reply.send({ data })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve metrics'
          }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/haircut/submit-onchain
   * Submit calculated metrics to blockchain (Risk Admin only)
   */
  fastify.post<SubmitOnChainRequest>(
    '/api/trade-finance/haircut/submit-onchain',
    async (
      request: FastifyRequest<SubmitOnChainRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { commodityType, metrics, projectId } = request.body

        // Validate required fields
        if (!commodityType || !metrics || !projectId) {
          return reply.status(400).send({
            error: { message: 'commodityType, metrics, and projectId are required' }
          })
        }

        // Store metrics in database
        const { data: storedMetrics, error: insertError } = await fastify.supabase
          .from('commodity_risk_metrics')
          .insert({
            project_id: projectId,
            commodity_type: commodityType,
            volatility_bps: metrics.volatilityBps,
            max_drawdown_bps: metrics.maxDrawdownBps,
            value_at_risk_95_bps: metrics.var95Bps,
            value_at_risk_99_bps: metrics.var99Bps,
            sharpe_ratio: Math.round(metrics.sharpeRatio * 100),
            liquidity_score: metrics.liquidityScore,
            data_points: metrics.dataPoints,
            calculated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          return reply.status(500).send({
            error: { message: 'Failed to store metrics: ' + insertError.message }
          })
        }

        return reply.send({
          data: {
            success: true,
            commodityType,
            metrics: storedMetrics,
            message: 'Metrics stored successfully. Blockchain submission pending.'
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to submit metrics'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/haircut/history/:commodity
   * Get historical haircut metrics for a commodity
   */
  fastify.get<GetMetricsParams>(
    '/api/trade-finance/haircut/history/:commodity',
    async (
      request: FastifyRequest<GetMetricsParams>,
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

        // Query database for historical metrics
        const { data, error } = await fastify.supabase
          .from('commodity_risk_metrics')
          .select('*')
          .eq('commodity_type', commodity)
          .eq('project_id', project_id)
          .order('calculated_at', { ascending: false })
          .limit(30) // Last 30 calculations

        if (error) {
          return reply.status(500).send({
            error: { message: 'Failed to retrieve historical metrics: ' + error.message }
          })
        }

        return reply.send({ data })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve historical metrics'
          }
        })
      }
    }
  )
}
