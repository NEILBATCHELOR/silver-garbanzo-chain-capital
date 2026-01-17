/**
 * XRPL AMM Routes - Backend API
 * Handles Automated Market Maker operations
 * 
 * FIXED: Corrected import paths and type mismatches
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Wallet, Amount, Currency, IssuedCurrencyAmount } from 'xrpl'
import { XRPLAMMService } from '@/services/wallet/ripple/defi/XRPLAMMService'
import { XRPLAMMDatabaseService } from '@/services/wallet/ripple/defi/XRPLAMMDatabaseService'
import { XRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { xrplClientManager, XRPLNetwork } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLError, XRPLErrorCode } from '@/services/xrpl/error-handler'

/**
 * Helper: Convert pool asset data to Currency type
 */
function buildCurrency(currency: string, issuer: string | null | undefined): Currency {
  if (currency === 'XRP') {
    return { currency: 'XRP' }
  }
  if (!issuer) {
    throw new Error(`Issuer required for currency ${currency}`)
  }
  return { currency, issuer }
}

/**
 * Helper: Build Amount from currency and value
 */
function buildAmount(currency: string, issuer: string | null | undefined, value: string): Amount {
  if (currency === 'XRP') {
    return value // XRP in drops
  }
  if (!issuer) {
    throw new Error(`Issuer required for currency ${currency}`)
  }
  return { currency, issuer, value }
}

// Request type interfaces
interface CreatePoolRequest {
  Body: {
    asset1: {
      currency: string
      issuer?: string
    }
    asset2: {
      currency: string
      issuer?: string
    }
    amount1: string
    amount2: string
    tradingFee: number
    walletSeed: string
    projectId?: string
  }
}

interface AddLiquidityRequest {
  Params: {
    poolId: string
  }
  Body: {
    amount1: string
    amount2?: string
    lpTokensOut?: string
    walletSeed: string
  }
}

interface RemoveLiquidityRequest {
  Params: {
    poolId: string
  }
  Body: {
    lpTokenAmount: string
    walletSeed: string
  }
}

interface BidAuctionSlotRequest {
  Params: {
    poolId: string
  }
  Body: {
    bidMin?: string
    bidMax?: string
    authAccounts?: string[]
    walletSeed: string
  }
}

interface VoteTradingFeeRequest {
  Params: {
    poolId: string
  }
  Body: {
    newFee: number
    walletSeed: string
  }
}

interface GetPoolInfoRequest {
  Params: {
    poolId: string
  }
}

interface ListPoolsRequest {
  Querystring: {
    page?: string
    limit?: string
    asset1Currency?: string
    asset2Currency?: string
    status?: string
    projectId?: string
  }
}

export async function ammRoutes(fastify: FastifyInstance) {
  const network = (process.env.XRPL_NETWORK || 'testnet') as XRPLNetwork
  const client = xrplClientManager.getClient(network)
  
  const ammService = new XRPLAMMService(client)
  const databaseService = new XRPLAMMDatabaseService()
  // Note: WebSocket service needs to be initialized elsewhere with Socket.IO instance
  // const wsService = new XRPLWebSocketService()

  /**
   * POST /amm/pools
   * Create a new AMM liquidity pool
   */
  fastify.post<CreatePoolRequest>(
    '/amm/pools',
    {
      schema: {
        description: 'Create a new AMM liquidity pool',
        tags: ['AMM'],
        body: {
          type: 'object',
          required: ['asset1', 'asset2', 'amount1', 'amount2', 'tradingFee', 'walletSeed'],
          properties: {
            asset1: {
              type: 'object',
              required: ['currency'],
              properties: {
                currency: { type: 'string' },
                issuer: { type: 'string' }
              }
            },
            asset2: {
              type: 'object',
              required: ['currency'],
              properties: {
                currency: { type: 'string' },
                issuer: { type: 'string' }
              }
            },
            amount1: { type: 'string' },
            amount2: { type: 'string' },
            tradingFee: { type: 'number', minimum: 0, maximum: 1000 },
            walletSeed: { type: 'string' },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<CreatePoolRequest>, reply: FastifyReply) => {
      try {
        const { asset1, asset2, amount1, amount2, tradingFee, walletSeed, projectId } = request.body

        // Validate
        XRPLErrorHandler.validateCurrency(asset1.currency)
        XRPLErrorHandler.validateCurrency(asset2.currency)
        XRPLErrorHandler.validateAmount(amount1)
        XRPLErrorHandler.validateAmount(amount2)
        if (asset1.issuer) {
          XRPLErrorHandler.validateAddress(asset1.issuer)
        }
        if (asset2.issuer) {
          XRPLErrorHandler.validateAddress(asset2.issuer)
        }

        // Create wallet from seed
        const wallet = Wallet.fromSeed(walletSeed)

        // Build proper Amount types for XRPL SDK
        const amount1Full = buildAmount(asset1.currency, asset1.issuer, amount1)
        const amount2Full = buildAmount(asset2.currency, asset2.issuer, amount2)

        // Create AMM pool on blockchain
        const result = await ammService.createAMMPool({
          wallet,
          amount: amount1Full,
          amount2: amount2Full,
          tradingFee
        })

        // Save to database - convert null to undefined
        await databaseService.saveAMMPool({
          projectId: projectId || '',
          ammId: result.poolId,
          lpTokenCurrency: result.lpTokenId,
          asset1Currency: asset1.currency,
          asset1Issuer: asset1.issuer || undefined,
          asset1Balance: amount1,
          asset2Currency: asset2.currency,
          asset2Issuer: asset2.issuer || undefined,
          asset2Balance: amount2,
          lpTokenSupply: '0', // Will be updated
          tradingFee,
          transactionHash: result.transactionHash
        })

        // Broadcast WebSocket event would go here if wsService was available
        // wsService.emitToAll(XRPLEventType.AMM_POOL_CREATED, { ... })

        return reply.send({
          success: true,
          data: {
            poolId: result.poolId,
            lpTokenId: result.lpTokenId,
            transactionHash: result.transactionHash,
            ledgerIndex: undefined
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /amm/pools/:poolId/liquidity/add
   * Add liquidity to an existing pool
   */
  fastify.post<AddLiquidityRequest>(
    '/amm/pools/:poolId/liquidity/add',
    {
      schema: {
        description: 'Add liquidity to an AMM pool',
        tags: ['AMM'],
        params: {
          type: 'object',
          properties: {
            poolId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['amount1', 'walletSeed'],
          properties: {
            amount1: { type: 'string' },
            amount2: { type: 'string' },
            lpTokensOut: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<AddLiquidityRequest>, reply: FastifyReply) => {
      try {
        const { poolId } = request.params
        const { amount1, amount2, lpTokensOut, walletSeed } = request.body

        // Validate
        XRPLErrorHandler.validateAmount(amount1)
        if (amount2) XRPLErrorHandler.validateAmount(amount2)

        // Get pool info from database
        const pool = await databaseService.getAMMPool(poolId)
        if (!pool) {
          throw new XRPLError(
            XRPLErrorCode.AMM_POOL_NOT_FOUND,
            `AMM pool not found: ${poolId}`
          )
        }

        // Create wallet
        const wallet = Wallet.fromSeed(walletSeed)

        // Build Currency types from pool data
        const asset1Currency = buildCurrency(pool.asset1_currency, pool.asset1_issuer)
        const asset2Currency = buildCurrency(pool.asset2_currency, pool.asset2_issuer)

        // Build Amount types
        const amount1Full = buildAmount(pool.asset1_currency, pool.asset1_issuer, amount1)
        const amount2Full = amount2 
          ? buildAmount(pool.asset2_currency, pool.asset2_issuer, amount2)
          : undefined

        // Build LP token out if provided
        const lpTokenOutFull = lpTokensOut 
          ? { currency: pool.lp_token_currency, issuer: wallet.address, value: lpTokensOut } as IssuedCurrencyAmount
          : undefined

        // Add liquidity
        const result = await ammService.addLiquidity(
          wallet,
          asset1Currency,
          asset2Currency,
          amount1Full,
          amount2Full,
          lpTokenOutFull
        )

        // Save position to database
        await databaseService.saveLiquidityPosition({
          poolId: pool.id,
          userAddress: wallet.address,
          lpTokenBalance: result.lpTokensReceived,
          sharePercentage: 0 // Calculate based on total supply
        })

        // Save transaction - convert undefined to null
        await databaseService.saveAMMTransaction({
          poolId: pool.id,
          transactionType: 'deposit',
          userAddress: wallet.address,
          asset1Amount: amount1,
          asset2Amount: amount2 || undefined,
          lpTokenAmount: result.lpTokensReceived,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            lpTokensReceived: result.lpTokensReceived,
            transactionHash: result.transactionHash,
            sharePercentage: 0
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /amm/pools/:poolId/liquidity/remove
   * Remove liquidity from a pool
   */
  fastify.post<RemoveLiquidityRequest>(
    '/amm/pools/:poolId/liquidity/remove',
    {
      schema: {
        description: 'Remove liquidity from an AMM pool',
        tags: ['AMM'],
        params: {
          type: 'object',
          properties: {
            poolId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['lpTokenAmount', 'walletSeed'],
          properties: {
            lpTokenAmount: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<RemoveLiquidityRequest>, reply: FastifyReply) => {
      try {
        const { poolId } = request.params
        const { lpTokenAmount, walletSeed } = request.body

        XRPLErrorHandler.validateAmount(lpTokenAmount)

        const pool = await databaseService.getAMMPool(poolId)
        if (!pool) {
          throw new XRPLError(
            XRPLErrorCode.AMM_POOL_NOT_FOUND,
            `AMM pool not found: ${poolId}`
          )
        }

        const wallet = Wallet.fromSeed(walletSeed)

        // Build Currency types
        const asset1Currency = buildCurrency(pool.asset1_currency, pool.asset1_issuer)
        const asset2Currency = buildCurrency(pool.asset2_currency, pool.asset2_issuer)

        // Build LP token amount
        const lpTokenAmountFull = buildAmount(pool.lp_token_currency, wallet.address, lpTokenAmount)

        // Build LP token in
        const lpTokenIn: IssuedCurrencyAmount = {
          currency: pool.lp_token_currency,
          issuer: wallet.address,
          value: lpTokenAmount
        }

        const result = await ammService.removeLiquidity(
          wallet,
          asset1Currency,
          asset2Currency,
          lpTokenAmountFull,
          lpTokenIn
        )

        // Update position
        await databaseService.updateLiquidityPosition({
          poolId: pool.id,
          userAddress: wallet.address,
          lpTokenBalance: '0',
          sharePercentage: 0
        })

        // Save transaction
        await databaseService.saveAMMTransaction({
          poolId: pool.id,
          transactionType: 'withdraw',
          userAddress: wallet.address,
          asset1Amount: result.asset1Received,
          asset2Amount: result.asset2Received,
          lpTokenAmount: lpTokenAmount,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            asset1Received: result.asset1Received,
            asset2Received: result.asset2Received,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /amm/pools/:poolId/auction-slot/bid
   * Bid for auction slot on AMM pool
   */
  fastify.post<BidAuctionSlotRequest>(
    '/amm/pools/:poolId/auction-slot/bid',
    {
      schema: {
        description: 'Bid for AMM auction slot',
        tags: ['AMM'],
        params: {
          type: 'object',
          properties: {
            poolId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['walletSeed'],
          properties: {
            bidMin: { type: 'string' },
            bidMax: { type: 'string' },
            authAccounts: { type: 'array', items: { type: 'string' } },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<BidAuctionSlotRequest>, reply: FastifyReply) => {
      try {
        const { poolId } = request.params
        const { bidMin, bidMax, authAccounts, walletSeed } = request.body

        const pool = await databaseService.getAMMPool(poolId)
        if (!pool) {
          throw new XRPLError(
            XRPLErrorCode.AMM_POOL_NOT_FOUND,
            `AMM pool not found: ${poolId}`
          )
        }

        const wallet = Wallet.fromSeed(walletSeed)

        // Build Currency types
        const asset1Currency = buildCurrency(pool.asset1_currency, pool.asset1_issuer)
        const asset2Currency = buildCurrency(pool.asset2_currency, pool.asset2_issuer)

        // Build bid amounts if provided
        const bidMinFull = bidMin 
          ? { currency: pool.lp_token_currency, issuer: wallet.address, value: bidMin } as IssuedCurrencyAmount
          : undefined
        const bidMaxFull = bidMax
          ? { currency: pool.lp_token_currency, issuer: wallet.address, value: bidMax } as IssuedCurrencyAmount
          : undefined

        const result = await ammService.bidAuctionSlot(
          wallet,
          asset1Currency,
          asset2Currency,
          bidMinFull,
          bidMaxFull,
          authAccounts
        )

        return reply.send({
          success: true,
          data: result
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /amm/pools/:poolId/vote
   * Vote to change trading fee
   */
  fastify.post<VoteTradingFeeRequest>(
    '/amm/pools/:poolId/vote',
    {
      schema: {
        description: 'Vote to change AMM trading fee',
        tags: ['AMM'],
        params: {
          type: 'object',
          properties: {
            poolId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['newFee', 'walletSeed'],
          properties: {
            newFee: { type: 'number', minimum: 0, maximum: 1000 },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<VoteTradingFeeRequest>, reply: FastifyReply) => {
      try {
        const { poolId } = request.params
        const { newFee, walletSeed } = request.body

        const pool = await databaseService.getAMMPool(poolId)
        if (!pool) {
          throw new XRPLError(
            XRPLErrorCode.AMM_POOL_NOT_FOUND,
            `AMM pool not found: ${poolId}`
          )
        }

        const wallet = Wallet.fromSeed(walletSeed)

        // Build Currency types
        const asset1Currency = buildCurrency(pool.asset1_currency, pool.asset1_issuer)
        const asset2Currency = buildCurrency(pool.asset2_currency, pool.asset2_issuer)

        const result = await ammService.voteTradingFee(
          wallet,
          asset1Currency,
          asset2Currency,
          newFee
        )

        return reply.send({
          success: true,
          data: result
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /amm/pools/:poolId
   * Get pool information
   */
  fastify.get<GetPoolInfoRequest>(
    '/amm/pools/:poolId',
    {
      schema: {
        description: 'Get AMM pool information',
        tags: ['AMM'],
        params: {
          type: 'object',
          properties: {
            poolId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetPoolInfoRequest>, reply: FastifyReply) => {
      try {
        const { poolId } = request.params

        const pool = await databaseService.getAMMPool(poolId)
        if (!pool) {
          throw new XRPLError(
            XRPLErrorCode.AMM_POOL_NOT_FOUND,
            `AMM pool not found: ${poolId}`
          )
        }

        // Get live info from blockchain
        const asset1Currency = buildCurrency(pool.asset1_currency, pool.asset1_issuer)
        const asset2Currency = buildCurrency(pool.asset2_currency, pool.asset2_issuer)

        const liveInfo = await ammService.getAMMInfo(asset1Currency, asset2Currency)

        return reply.send({
          success: true,
          data: {
            pool,
            liveInfo
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /amm/pools
   * List AMM pools with pagination
   * FIXED: Use correct method signature
   */
  fastify.get<ListPoolsRequest>(
    '/amm/pools',
    {
      schema: {
        description: 'List AMM pools',
        tags: ['AMM'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
            asset1Currency: { type: 'string' },
            asset2Currency: { type: 'string' },
            status: { type: 'string' },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListPoolsRequest>, reply: FastifyReply) => {
      try {
        const { projectId } = request.query

        // For now, just list pools for project
        // TODO: Implement filtering by asset currencies and status
        const pools = await databaseService.listAMMPools(projectId || '')

        return reply.send({
          success: true,
          data: {
            pools: pools,
            pagination: {
              page: 1,
              limit: pools.length,
              total: pools.length,
              totalPages: 1
            }
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )
}
