/**
 * Trade Finance - Marketplace Routes
 * API routes for marketplace overview, markets, user positions, and activity
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface MarketplaceOverviewQuery {
  Querystring: {
    project_id: string
  }
}

interface MarketStatsQuery {
  Querystring: {
    project_id: string
  }
}

interface GetMarketsQuery {
  Querystring: {
    project_id: string
    search?: string
    commodity_types?: string // comma-separated
    min_apy?: number
    max_apy?: number
    only_active?: boolean
    only_collateral?: boolean
    only_borrowable?: boolean
    sort_by?: 'supplyAPY' | 'borrowAPY' | 'totalSupply' | 'utilization'
    sort_order?: 'asc' | 'desc'
  }
}

interface GetMarketParams {
  Params: {
    commodityType: string
  }
  Querystring: {
    project_id: string
  }
}

interface GetUserPositionParams {
  Params: {
    walletAddress: string
  }
  Querystring: {
    project_id: string
  }
}

interface GetActivityQuery {
  Querystring: {
    project_id: string
    limit?: number
    offset?: number
    wallet_address?: string
    commodity_type?: string
    action_type?: string // 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidate'
  }
}

export async function marketplaceRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/trade-finance/marketplace/overview
   * Get market overview with TVL, total supplied, total borrowed, active users
   */
  fastify.get<MarketplaceOverviewQuery>(
    '/api/trade-finance/marketplace/overview',
    async (
      request: FastifyRequest<MarketplaceOverviewQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get total collateral (supplied)
        const { data: collateralData } = await fastify.supabase
          .from('commodity_collateral')
          .select('value_usd')
          .eq('project_id', project_id)

        const totalSupplied = collateralData?.reduce((sum, c) => sum + (c.value_usd || 0), 0) || 0

        // Get total debt (borrowed)
        const { data: debtData } = await fastify.supabase
          .from('commodity_debt')
          .select('value_usd')
          .eq('project_id', project_id)

        const totalBorrowed = debtData?.reduce((sum, d) => sum + (d.value_usd || 0), 0) || 0

        // Get active users count
        const { data: positionsData } = await fastify.supabase
          .from('commodity_positions')
          .select('wallet_address')
          .eq('project_id', project_id)
          .eq('status', 'active')

        const activeUsers = new Set(positionsData?.map(p => p.wallet_address) || []).size

        // TVL = Total Supplied (collateral value)
        const totalValueLocked = totalSupplied

        return reply.send({
          data: {
            totalValueLocked,
            totalSupplied,
            totalBorrowed,
            activeUsers,
            utilizationRate: totalSupplied > 0 ? (totalBorrowed / totalSupplied) * 100 : 0,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch market overview'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/marketplace/stats
   * Get aggregated market statistics
   */
  fastify.get<MarketStatsQuery>(
    '/api/trade-finance/marketplace/stats',
    async (
      request: FastifyRequest<MarketStatsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get market data from commodity_market_data table
        const { data: marketData, error } = await fastify.supabase
          .from('commodity_market_data')
          .select('*')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          throw new Error('Failed to fetch market data: ' + error.message)
        }

        // Calculate averages and trends
        const avgSupplyAPY = marketData?.reduce((sum, m) => sum + (m.supply_apy || 0), 0) / (marketData?.length || 1)
        const avgBorrowAPY = marketData?.reduce((sum, m) => sum + (m.borrow_apy || 0), 0) / (marketData?.length || 1)
        const avgUtilization = marketData?.reduce((sum, m) => sum + (m.utilization_rate || 0), 0) / (marketData?.length || 1)

        return reply.send({
          data: {
            avgSupplyAPY,
            avgBorrowAPY,
            avgUtilization,
            totalMarkets: marketData?.length || 0,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch market stats'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/marketplace/markets
   * Get all commodity markets with optional filters
   */
  fastify.get<GetMarketsQuery>(
    '/api/trade-finance/marketplace/markets',
    async (
      request: FastifyRequest<GetMarketsQuery>,
      reply: FastifyReply
    ) => {
      try {
        const {
          project_id,
          search,
          commodity_types,
          min_apy,
          max_apy,
          only_active,
          only_collateral,
          only_borrowable,
          sort_by = 'supplyAPY',
          sort_order = 'desc'
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get pool configurations
        let query = fastify.supabase
          .from('commodity_pool_config')
          .select(`
            *,
            prices:commodity_prices!left(
              current_price,
              price_usd
            )
          `)
          .eq('project_id', project_id)

        // Apply filters
        if (only_active) {
          query = query.eq('is_active', true)
        }

        const { data: poolConfigs, error: poolError } = await query

        if (poolError) {
          throw new Error('Failed to fetch pool configs: ' + poolError.message)
        }

        if (!poolConfigs || poolConfigs.length === 0) {
          return reply.send({ data: [] })
        }

        // Get aggregated collateral and debt data for each commodity
        const markets = await Promise.all(
          poolConfigs.map(async (config) => {
            // Get total supplied for this commodity
            const { data: collateralData } = await fastify.supabase
              .from('commodity_collateral')
              .select('amount, value_usd')
              .eq('project_id', project_id)
              .eq('commodity_type', config.commodity_type)

            const totalSupply = collateralData?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
            const totalSupplyUSD = collateralData?.reduce((sum, c) => sum + (c.value_usd || 0), 0) || 0

            // Get total borrowed against this commodity
            const { data: debtData } = await fastify.supabase
              .from('commodity_debt')
              .select('value_usd')
              .eq('project_id', project_id)
              // Note: debt is linked to collateral via positions
            
            const totalBorrowedUSD = debtData?.reduce((sum, d) => sum + (d.value_usd || 0), 0) || 0

            // Calculate APYs (simplified - should come from interest rate model)
            const utilizationRate = totalSupplyUSD > 0 ? (totalBorrowedUSD / totalSupplyUSD) * 100 : 0
            const baseSupplyAPY = 3.5 + (utilizationRate / 100) * 2.5 // Simple model
            const baseBorrowAPY = 5.0 + (utilizationRate / 100) * 3.5 // Simple model

            // Get latest price
            const currentPrice = config.prices?.[0]?.price_usd || 0

            return {
              commodityType: config.commodity_type,
              commodityName: config.commodity_type.charAt(0).toUpperCase() + config.commodity_type.slice(1),
              symbol: config.commodity_type.toUpperCase(),
              supplyAPY: baseSupplyAPY,
              borrowAPY: baseBorrowAPY,
              totalSupply,
              totalSupplyUSD,
              totalBorrowedUSD,
              availableLiquidity: totalSupplyUSD - totalBorrowedUSD,
              utilizationRate,
              currentPrice,
              isActive: config.is_active,
              canBeCollateral: config.ltv_bps > 0,
              canBeBorrowed: true,
              ltv: config.ltv_bps / 100,
              liquidationThreshold: config.liquidation_threshold_bps / 100,
              liquidationBonus: config.liquidation_bonus_bps / 100
            }
          })
        )

        // Apply additional filters
        let filteredMarkets = markets

        if (search) {
          const searchLower = search.toLowerCase()
          filteredMarkets = filteredMarkets.filter(m =>
            m.commodityName.toLowerCase().includes(searchLower) ||
            m.symbol.toLowerCase().includes(searchLower) ||
            m.commodityType.toLowerCase().includes(searchLower)
          )
        }

        if (commodity_types) {
          const types = commodity_types.split(',').map(t => t.trim().toLowerCase())
          filteredMarkets = filteredMarkets.filter(m =>
            types.includes(m.commodityType.toLowerCase())
          )
        }

        if (min_apy !== undefined) {
          filteredMarkets = filteredMarkets.filter(m => m.supplyAPY >= min_apy)
        }

        if (max_apy !== undefined) {
          filteredMarkets = filteredMarkets.filter(m => m.supplyAPY <= max_apy)
        }

        if (only_collateral) {
          filteredMarkets = filteredMarkets.filter(m => m.canBeCollateral)
        }

        if (only_borrowable) {
          filteredMarkets = filteredMarkets.filter(m => m.canBeBorrowed)
        }

        // Sort markets
        filteredMarkets.sort((a, b) => {
          let aVal: number, bVal: number

          switch (sort_by) {
            case 'supplyAPY':
              aVal = a.supplyAPY
              bVal = b.supplyAPY
              break
            case 'borrowAPY':
              aVal = a.borrowAPY
              bVal = b.borrowAPY
              break
            case 'totalSupply':
              aVal = a.totalSupplyUSD
              bVal = b.totalSupplyUSD
              break
            case 'utilization':
              aVal = a.utilizationRate
              bVal = b.utilizationRate
              break
            default:
              aVal = a.supplyAPY
              bVal = b.supplyAPY
          }

          return sort_order === 'desc' ? bVal - aVal : aVal - bVal
        })

        return reply.send({ data: filteredMarkets })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch markets'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/marketplace/markets/:commodityType
   * Get specific commodity market details
   */
  fastify.get<GetMarketParams>(
    '/api/trade-finance/marketplace/markets/:commodityType',
    async (
      request: FastifyRequest<GetMarketParams>,
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

        // Get pool config
        const { data: config, error: configError } = await fastify.supabase
          .from('commodity_pool_config')
          .select('*')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType.toLowerCase())
          .single()

        if (configError || !config) {
          return reply.status(404).send({
            error: { message: `Market not found for commodity: ${commodityType}` }
          })
        }

        // Get supply data
        const { data: collateralData } = await fastify.supabase
          .from('commodity_collateral')
          .select('amount, value_usd')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType.toLowerCase())

        const totalSupply = collateralData?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
        const totalSupplyUSD = collateralData?.reduce((sum, c) => sum + (c.value_usd || 0), 0) || 0

        // Get borrow data
        const { data: debtData } = await fastify.supabase
          .from('commodity_debt')
          .select('value_usd')
          .eq('project_id', project_id)

        const totalBorrowedUSD = debtData?.reduce((sum, d) => sum + (d.value_usd || 0), 0) || 0

        // Calculate metrics
        const utilizationRate = totalSupplyUSD > 0 ? (totalBorrowedUSD / totalSupplyUSD) * 100 : 0
        const supplyAPY = 3.5 + (utilizationRate / 100) * 2.5
        const borrowAPY = 5.0 + (utilizationRate / 100) * 3.5

        // Get price history
        const { data: priceHistory } = await fastify.supabase
          .from('commodity_prices')
          .select('price_usd, created_at')
          .eq('project_id', project_id)
          .eq('commodity_type', commodityType.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(30)

        return reply.send({
          data: {
            commodityType: config.commodity_type,
            commodityName: config.commodity_type.charAt(0).toUpperCase() + config.commodity_type.slice(1),
            symbol: config.commodity_type.toUpperCase(),
            supplyAPY,
            borrowAPY,
            totalSupply,
            totalSupplyUSD,
            totalBorrowedUSD,
            availableLiquidity: totalSupplyUSD - totalBorrowedUSD,
            utilizationRate,
            isActive: config.is_active,
            ltv: config.ltv_bps / 100,
            liquidationThreshold: config.liquidation_threshold_bps / 100,
            liquidationBonus: config.liquidation_bonus_bps / 100,
            supplyCap: config.supply_cap,
            borrowCap: config.borrow_cap,
            priceHistory: priceHistory?.map(p => ({
              price: p.price_usd,
              timestamp: p.created_at
            })) || []
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch market details'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/marketplace/positions/:walletAddress
   * Get user position summary
   */
  fastify.get<GetUserPositionParams>(
    '/api/trade-finance/marketplace/positions/:walletAddress',
    async (
      request: FastifyRequest<GetUserPositionParams>,
      reply: FastifyReply
    ) => {
      try {
        const { walletAddress } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Get position
        const { data: position, error: positionError } = await fastify.supabase
          .from('commodity_positions')
          .select(`
            *,
            collateral:commodity_collateral(
              id,
              commodity_type,
              amount,
              value_usd
            ),
            debt:commodity_debt(
              id,
              asset_address,
              amount,
              value_usd
            )
          `)
          .eq('wallet_address', walletAddress.toLowerCase())
          .eq('project_id', project_id)
          .single()

        if (positionError || !position) {
          // Return empty position if none exists
          return reply.send({
            data: {
              walletAddress,
              netWorth: 0,
              totalCollateralUSD: 0,
              totalDebtUSD: 0,
              healthFactor: Infinity,
              availableToBorrow: 0,
              collateral: [],
              debt: []
            }
          })
        }

        // Calculate totals
        const totalCollateralUSD = position.collateral?.reduce(
          (sum: number, c: any) => sum + (c.value_usd || 0),
          0
        ) || 0

        const totalDebtUSD = position.debt?.reduce(
          (sum: number, d: any) => sum + (d.value_usd || 0),
          0
        ) || 0

        const netWorth = totalCollateralUSD - totalDebtUSD

        // Calculate health factor
        const liquidationThreshold = 0.85 // 85%
        const healthFactor = totalDebtUSD > 0
          ? (totalCollateralUSD * liquidationThreshold) / totalDebtUSD
          : Infinity

        // Calculate available to borrow
        const maxLTV = 0.80 // 80%
        const borrowingPower = totalCollateralUSD * maxLTV
        const availableToBorrow = Math.max(0, borrowingPower - totalDebtUSD)

        return reply.send({
          data: {
            walletAddress,
            netWorth,
            totalCollateralUSD,
            totalDebtUSD,
            healthFactor,
            availableToBorrow,
            collateral: position.collateral?.map((c: any) => ({
              commodityType: c.commodity_type,
              amount: c.amount,
              valueUSD: c.value_usd
            })) || [],
            debt: position.debt?.map((d: any) => ({
              assetAddress: d.asset_address,
              amount: d.amount,
              valueUSD: d.value_usd
            })) || []
          }
        })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch user position'
          }
        })
      }
    }
  )

  /**
   * GET /api/trade-finance/marketplace/activity
   * Get recent marketplace activity
   */
  fastify.get<GetActivityQuery>(
    '/api/trade-finance/marketplace/activity',
    async (
      request: FastifyRequest<GetActivityQuery>,
      reply: FastifyReply
    ) => {
      try {
        const {
          project_id,
          limit = 10,
          offset = 0,
          wallet_address,
          commodity_type,
          action_type
        } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' }
          })
        }

        // Query trade finance reserve transactions for activity
        let query = fastify.supabase
          .from('trade_finance_reserve_transactions')
          .select('*')
          .eq('project_id', project_id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (wallet_address) {
          query = query.eq('wallet_address', wallet_address.toLowerCase())
        }

        const { data: transactions, error } = await query

        if (error) {
          throw new Error('Failed to fetch activity: ' + error.message)
        }

        // Map to activity format
        const activity = transactions?.map(tx => ({
          id: tx.id,
          type: tx.transaction_type || 'unknown',
          walletAddress: tx.wallet_address,
          commodityType: tx.commodity_type,
          amount: tx.amount,
          valueUSD: tx.value_usd,
          timestamp: tx.created_at,
          txHash: tx.transaction_hash
        })) || []

        return reply.send({ data: activity })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Failed to fetch activity'
          }
        })
      }
    }
  )
}
