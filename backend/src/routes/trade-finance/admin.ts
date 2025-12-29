/**
 * Trade Finance - Admin Routes
 * API routes for admin operations: risk parameters, asset listing, emergency controls
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// ============================================================================
// INTERFACES
// ============================================================================

interface UpdateRiskParamsBody {
  Body: {
    commodityType: string
    ltv: number
    liquidationThreshold: number
    liquidationBonus: number
    baseInterestRate: number
    optimalUtilization: number
    slope1: number
    slope2: number
    supplyCap: string
    borrowCap: string
    isIsolated: boolean
    debtCeiling: string
    projectId: string
  }
}

interface GetRiskParamsParams {
  Params: {
    commodityType: string
  }
  Querystring: {
    project_id: string
  }
}

interface ListAssetBody {
  Body: {
    commodityType: string
    commodityName: string
    tokenAddress: string
    oracleAddress: string
    ltv: number
    liquidationThreshold: number
    liquidationBonus: number
    baseInterestRate: number
    optimalUtilization: number
    slope1: number
    slope2: number
    supplyCap: string
    borrowCap: string
    isIsolated: boolean
    debtCeiling: string
    borrowableInIsolation: string[]
    projectId: string
  }
}

interface GetListedAssetsQuery {
  Querystring: {
    project_id: string
  }
}

interface ProtocolStatusQuery {
  Querystring: {
    project_id: string
  }
}

interface PauseProtocolBody {
  Body: {
    projectId: string
  }
}

interface ResetCircuitBreakerBody {
  Body: {
    projectId: string
    breakerType: 'oracleFailure' | 'highUtilization' | 'largeLiquidation'
  }
}

// ============================================================================
// ROUTES
// ============================================================================

export async function adminRoutes(fastify: FastifyInstance) {

  // ==========================================================================
  // RISK PARAMETERS
  // ==========================================================================

  /**
   * PUT /api/trade-finance/admin/risk-parameters
   * Update risk parameters for a commodity
   */
  fastify.put<UpdateRiskParamsBody>(
    '/api/trade-finance/admin/risk-parameters',
    async (
      request: FastifyRequest<UpdateRiskParamsBody>,
      reply: FastifyReply
    ) => {
      try {
        const params = request.body

        // Validation
        if (params.ltv >= params.liquidationThreshold) {
          return reply.status(400).send({
            error: { message: 'LTV must be lower than liquidation threshold' }
          })
        }

        if (params.ltv < 5000 || params.ltv > 9000) {
          return reply.status(400).send({
            error: { message: 'LTV must be between 50-90%' }
          })
        }

        if (params.liquidationThreshold < 6000 || params.liquidationThreshold > 9500) {
          return reply.status(400).send({
            error: { message: 'Liquidation threshold must be between 60-95%' }
          })
        }

        // Update or insert risk parameters
        const { data, error } = await fastify.supabase
          .from('commodity_risk_parameters')
          .upsert({
            project_id: params.projectId,
            commodity_type: params.commodityType,
            ltv_bps: params.ltv,
            liquidation_threshold_bps: params.liquidationThreshold,
            liquidation_bonus_bps: params.liquidationBonus,
            base_interest_rate_bps: params.baseInterestRate,
            optimal_utilization: params.optimalUtilization,
            slope1_bps: params.slope1,
            slope2_bps: params.slope2,
            supply_cap_usd: params.supplyCap,
            borrow_cap_usd: params.borrowCap,
            is_isolated: params.isIsolated,
            debt_ceiling_usd: params.debtCeiling,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id,commodity_type'
          })
          .select()
          .single()

        if (error) {
          return reply.status(500).send({
            error: { message: `Failed to update risk parameters: ${error.message}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            success: true,
            message: `Risk parameters updated for ${params.commodityType}`,
            commodityType: params.commodityType
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/admin/risk-parameters/:commodityType
   * Get risk parameters for a commodity
   */
  fastify.get<GetRiskParamsParams>(
    '/api/trade-finance/admin/risk-parameters/:commodityType',
    async (
      request: FastifyRequest<GetRiskParamsParams>,
      reply: FastifyReply
    ) => {
      try {
        const { commodityType } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const { data, error } = await fastify.supabase
          .from('commodity_risk_parameters')
          .select('*')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType)
          .single()

        if (error || !data) {
          return reply.status(404).send({
            error: { message: `No risk parameters found for ${commodityType}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            commodityType: data.commodity_type,
            ltv: data.ltv_bps,
            liquidationThreshold: data.liquidation_threshold_bps,
            liquidationBonus: data.liquidation_bonus_bps,
            baseInterestRate: data.base_interest_rate_bps,
            optimalUtilization: data.optimal_utilization,
            slope1: data.slope1_bps,
            slope2: data.slope2_bps,
            supplyCap: data.supply_cap_usd,
            borrowCap: data.borrow_cap_usd,
            isIsolated: data.is_isolated,
            debtCeiling: data.debt_ceiling_usd,
            updatedAt: data.updated_at,
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  // ==========================================================================
  // ASSET LISTING
  // ==========================================================================

  /**
   * POST /api/trade-finance/admin/list-asset
   * List a new commodity asset
   */
  fastify.post<ListAssetBody>(
    '/api/trade-finance/admin/list-asset',
    async (
      request: FastifyRequest<ListAssetBody>,
      reply: FastifyReply
    ) => {
      try {
        const asset = request.body

        // Validation
        if (!asset.tokenAddress || !asset.tokenAddress.startsWith('0x')) {
          return reply.status(400).send({
            error: { message: 'Invalid token address' }
          })
        }

        if (!asset.oracleAddress || !asset.oracleAddress.startsWith('0x')) {
          return reply.status(400).send({
            error: { message: 'Invalid oracle address' }
          })
        }

        // Create asset listing
        const { data: assetData, error: assetError } = await fastify.supabase
          .from('commodity_assets')
          .insert({
            project_id: asset.projectId,
            commodity_type: asset.commodityType,
            commodity_name: asset.commodityName,
            token_address: asset.tokenAddress,
            oracle_address: asset.oracleAddress,
            is_isolated: asset.isIsolated,
            borrowable_in_isolation: asset.borrowableInIsolation,
            is_active: true,
            listed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (assetError) {
          return reply.status(500).send({
            error: { message: `Failed to list asset: ${assetError.message}` }
          })
        }

        // Create risk parameters for the asset
        const { error: riskError } = await fastify.supabase
          .from('commodity_risk_parameters')
          .insert({
            project_id: asset.projectId,
            commodity_type: asset.commodityType,
            ltv_bps: asset.ltv,
            liquidation_threshold_bps: asset.liquidationThreshold,
            liquidation_bonus_bps: asset.liquidationBonus,
            base_interest_rate_bps: asset.baseInterestRate,
            optimal_utilization: asset.optimalUtilization,
            slope1_bps: asset.slope1,
            slope2_bps: asset.slope2,
            supply_cap_usd: asset.supplyCap,
            borrow_cap_usd: asset.borrowCap,
            is_isolated: asset.isIsolated,
            debt_ceiling_usd: asset.debtCeiling,
            updated_at: new Date().toISOString(),
          })

        if (riskError) {
          // Rollback asset listing
          await fastify.supabase
            .from('commodity_assets')
            .delete()
            .eq('id', assetData.id)

          return reply.status(500).send({
            error: { message: `Failed to create risk parameters: ${riskError.message}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            success: true,
            message: `${asset.commodityName} listed successfully`,
            assetId: assetData.id
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/admin/listed-assets
   * Get all listed assets
   */
  fastify.get<GetListedAssetsQuery>(
    '/api/trade-finance/admin/listed-assets',
    async (
      request: FastifyRequest<GetListedAssetsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        const { data, error } = await fastify.supabase
          .from('commodity_assets')
          .select('*')
          .eq('project_id', project_id)
          .order('listed_at', { ascending: false })

        if (error) {
          return reply.status(500).send({
            error: { message: `Failed to fetch assets: ${error.message}` }
          })
        }

        return reply.send({
          success: true,
          data: data.map(asset => ({
            commodityType: asset.commodity_type,
            commodityName: asset.commodity_name,
            tokenAddress: asset.token_address,
            oracleAddress: asset.oracle_address,
            isActive: asset.is_active,
            listedAt: asset.listed_at,
          }))
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  // ==========================================================================
  // EMERGENCY CONTROLS
  // ==========================================================================

  /**
   * GET /api/trade-finance/admin/protocol-status
   * Get protocol status and circuit breakers
   */
  fastify.get<ProtocolStatusQuery>(
    '/api/trade-finance/admin/protocol-status',
    async (
      request: FastifyRequest<ProtocolStatusQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get protocol status from database
        const { data, error } = await fastify.supabase
          .from('protocol_status')
          .select('*')
          .eq('project_id', project_id)
          .single()

        if (error || !data) {
          // Return default status if no record exists
          return reply.send({
            success: true,
            data: {
              isPaused: false,
              pausedAt: null,
              circuitBreakers: {
                oracleFailure: false,
                highUtilization: false,
                largeLiquidation: false,
              },
              lastUpdate: new Date().toISOString(),
            }
          })
        }

        return reply.send({
          success: true,
          data: {
            isPaused: data.is_paused,
            pausedAt: data.paused_at,
            circuitBreakers: {
              oracleFailure: data.oracle_failure_breaker,
              highUtilization: data.high_utilization_breaker,
              largeLiquidation: data.large_liquidation_breaker,
            },
            lastUpdate: data.updated_at,
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/admin/pause
   * Pause protocol
   */
  fastify.post<PauseProtocolBody>(
    '/api/trade-finance/admin/pause',
    async (
      request: FastifyRequest<PauseProtocolBody>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.body

        const now = new Date().toISOString()

        const { data, error } = await fastify.supabase
          .from('protocol_status')
          .upsert({
            project_id: projectId,
            is_paused: true,
            paused_at: now,
            updated_at: now,
          }, {
            onConflict: 'project_id'
          })
          .select()
          .single()

        if (error) {
          return reply.status(500).send({
            error: { message: `Failed to pause protocol: ${error.message}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            success: true,
            message: 'Protocol paused successfully',
            pausedAt: now,
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/admin/unpause
   * Unpause protocol
   */
  fastify.post<PauseProtocolBody>(
    '/api/trade-finance/admin/unpause',
    async (
      request: FastifyRequest<PauseProtocolBody>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.body

        const { data, error } = await fastify.supabase
          .from('protocol_status')
          .upsert({
            project_id: projectId,
            is_paused: false,
            paused_at: null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id'
          })
          .select()
          .single()

        if (error) {
          return reply.status(500).send({
            error: { message: `Failed to unpause protocol: ${error.message}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            success: true,
            message: 'Protocol unpaused successfully',
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )

  /**
   * POST /api/trade-finance/admin/circuit-breaker/reset
   * Reset a circuit breaker
   */
  fastify.post<ResetCircuitBreakerBody>(
    '/api/trade-finance/admin/circuit-breaker/reset',
    async (
      request: FastifyRequest<ResetCircuitBreakerBody>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId, breakerType } = request.body

        const breakerColumn = 
          breakerType === 'oracleFailure' ? 'oracle_failure_breaker' :
          breakerType === 'highUtilization' ? 'high_utilization_breaker' :
          'large_liquidation_breaker'

        const { data, error } = await fastify.supabase
          .from('protocol_status')
          .update({
            [breakerColumn]: false,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) {
          return reply.status(500).send({
            error: { message: `Failed to reset circuit breaker: ${error.message}` }
          })
        }

        return reply.send({
          success: true,
          data: {
            success: true,
            message: `${breakerType} circuit breaker reset`,
            breakerType,
          }
        })

      } catch (err: any) {
        return reply.status(500).send({
          error: { message: err.message || 'Internal server error' }
        })
      }
    }
  )
}
