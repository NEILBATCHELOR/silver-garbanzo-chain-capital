/**
 * Trade Finance - Position Monitoring Routes
 * API routes for health factor tracking and liquidation monitoring
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface GetHealthFactorParams {
  Params: {
    user: string
  }
  Querystring: {
    project_id: string
  }
}

interface GetPositionDetailsParams {
  Params: {
    user: string
  }
  Querystring: {
    project_id: string
  }
}

interface LiquidatablePositionsQuery {
  Querystring: {
    project_id: string
    threshold?: number
  }
}

export async function positionsRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/positions/health-factor/:user
   * Get health factor for a specific user's position
   */
  fastify.get<GetHealthFactorParams>(
    '/api/trade-finance/positions/health-factor/:user',
    async (
      request: FastifyRequest<GetHealthFactorParams>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Query user position from database
        const { data: position, error } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            *,
            collateral:commodity_collateral(
              commodity_type,
              token_address,
              amount,
              value_usd
            ),
            debt:commodity_debt(
              asset_address,
              amount,
              value_usd
            )
          `)
          .eq('wallet_address', user)
          .eq('project_id', project_id)
          .single()

        if (error || !position) {
          return reply.status(404).send({
            error: { message: `No position found for user: ${user}` }
          })
        }

        // Calculate health factor
        // HF = (Collateral Value × Liquidation Threshold) / Debt
        const totalCollateralValue = position.collateral?.reduce(
          (sum: number, c: any) => sum + (c.value_usd || 0), 
          0
        ) || 0
        
        const totalDebt = position.debt?.reduce(
          (sum: number, d: any) => sum + (d.value_usd || 0),
          0
        ) || 0

        const liquidationThreshold = 0.85 // 85% - should be fetched from config
        const healthFactor = totalDebt > 0 
          ? (totalCollateralValue * liquidationThreshold) / totalDebt
          : Infinity

        // Determine status
        let status: 'healthy' | 'warning' | 'danger' | 'liquidatable'
        if (healthFactor >= 1.1) status = 'healthy'
        else if (healthFactor >= 1.0) status = 'warning'
        else if (healthFactor >= 0.95) status = 'danger'
        else status = 'liquidatable'

        return reply.send({
          data: {
            user,
            healthFactor,
            status,
            totalCollateralValue,
            totalDebt,
            liquidationThreshold,
            updatedAt: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to calculate health factor'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/positions/liquidatable
   * Get all positions eligible for liquidation
   */
  fastify.get<LiquidatablePositionsQuery>(
    '/api/trade-finance/positions/liquidatable',
    async (
      request: FastifyRequest<LiquidatablePositionsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id, threshold = 1.0 } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Query all positions
        const { data: positions, error } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            *,
            collateral:commodity_collateral(
              commodity_type,
              token_address,
              amount,
              value_usd
            ),
            debt:commodity_debt(
              asset_address,
              amount,
              value_usd
            )
          `)
          .eq('project_id', project_id)
          .eq('status', 'active')

        if (error) {
          return reply.status(500).send({
            error: { message: 'Failed to fetch positions: ' + error.message }
          })
        }

        // Calculate health factors and filter liquidatable
        const liquidationThreshold = 0.85 // 85%
        const liquidatablePositions = positions
          ?.map(position => {
            const totalCollateralValue = position.collateral?.reduce(
              (sum: number, c: any) => sum + (c.value_usd || 0),
              0
            ) || 0

            const totalDebt = position.debt?.reduce(
              (sum: number, d: any) => sum + (d.value_usd || 0),
              0
            ) || 0

            const healthFactor = totalDebt > 0
              ? (totalCollateralValue * liquidationThreshold) / totalDebt
              : Infinity

            return {
              walletAddress: position.wallet_address,
              healthFactor,
              totalCollateralValue,
              totalDebt,
              collateral: position.collateral,
              debt: position.debt
            }
          })
          .filter(p => p.healthFactor < threshold)
          .sort((a, b) => a.healthFactor - b.healthFactor) || []

        return reply.send({
          data: {
            count: liquidatablePositions.length,
            positions: liquidatablePositions,
            threshold
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch liquidatable positions'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/positions/details/:user
   * Get detailed position information for a user
   */
  fastify.get<GetPositionDetailsParams>(
    '/api/trade-finance/positions/details/:user',
    async (
      request: FastifyRequest<GetPositionDetailsParams>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Query full position details
        const { data: position, error } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            *,
            collateral:commodity_collateral(
              id,
              commodity_type,
              token_address,
              token_id,
              amount,
              value_usd,
              haircut_bps,
              quality,
              certificate_date,
              created_at
            ),
            debt:commodity_debt(
              id,
              asset_address,
              amount,
              value_usd,
              interest_rate_bps,
              accrued_interest,
              created_at,
              last_updated
            )
          `)
          .eq('wallet_address', user)
          .eq('project_id', project_id)
          .single()

        if (error || !position) {
          return reply.status(404).send({
            error: { message: `No position found for user: ${user}` }
          })
        }

        // Calculate metrics
        const totalCollateralValue = position.collateral?.reduce(
          (sum: number, c: any) => sum + (c.value_usd || 0),
          0
        ) || 0

        const totalDebt = position.debt?.reduce(
          (sum: number, d: any) => sum + (d.value_usd || 0),
          0
        ) || 0

        const liquidationThreshold = 0.85 // 85%
        const healthFactor = totalDebt > 0
          ? (totalCollateralValue * liquidationThreshold) / totalDebt
          : Infinity

        const borrowingPower = totalCollateralValue * 0.80 // 80% LTV
        const availableToBorrow = Math.max(0, borrowingPower - totalDebt)

        return reply.send({
          data: {
            position: {
              walletAddress: position.wallet_address,
              status: position.status,
              createdAt: position.created_at,
              updatedAt: position.updated_at
            },
            collateral: position.collateral,
            debt: position.debt,
            metrics: {
              totalCollateralValue,
              totalDebt,
              healthFactor,
              liquidationThreshold,
              borrowingPower,
              availableToBorrow,
              utilizationRate: borrowingPower > 0 ? totalDebt / borrowingPower : 0
            }
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch position details'
          }
        })
      }
    }
  )
}
