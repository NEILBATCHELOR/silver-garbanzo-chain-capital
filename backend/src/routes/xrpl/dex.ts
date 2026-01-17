/**
 * XRPL DEX API Routes
 * 
 * RESTful endpoints for Decentralized Exchange operations
 * Implements order placement, cancellation, swaps, and order book queries
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { XRPLDEXService } from '@/services/wallet/ripple/defi/XRPLDEXService'
import { XRPLDEXDatabaseService } from '@/services/wallet/ripple/defi/XRPLDEXDatabaseService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { Amount, IssuedCurrencyAmount } from '@/services/wallet/ripple/types/xrpl-amounts'
import { Wallet } from 'xrpl'

// Request/Response Types
interface CreateOfferRequest {
  Body: {
    takerGets: {
      currency: string
      issuer?: string
      value: string
    } | string
    takerPays: {
      currency: string
      issuer?: string
      value: string
    } | string
    expiration?: number
    projectId: string
    walletSeed: string
  }
}

interface CancelOfferRequest {
  Params: {
    offerSequence: string
  }
  Body: {
    walletSeed: string
  }
}

interface ExecuteSwapRequest {
  Body: {
    fromCurrency: string
    fromIssuer?: string
    toCurrency: string
    toIssuer?: string
    amount: string
    maxSlippage?: number
    projectId: string
    walletSeed: string
  }
}

interface GetOrderBookRequest {
  Querystring: {
    baseCurrency: string
    baseIssuer?: string
    quoteCurrency: string
    quoteIssuer?: string
    limit?: number
  }
}

interface GetAccountOffersRequest {
  Params: {
    address: string
  }
}

interface ListOrdersRequest {
  Querystring: {
    page?: number
    limit?: number
    accountAddress?: string
    status?: string
    baseCurrency?: string
    quoteCurrency?: string
    projectId?: string
  }
}

export async function dexRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const dexService = new XRPLDEXService(xrplClient)
  const databaseService = new XRPLDEXDatabaseService()
  const wsService = getXRPLWebSocketService()

  /**
   * POST /dex/offers
   * Create a limit order on the DEX
   */
  fastify.post<CreateOfferRequest>(
    '/dex/offers',
    {
      schema: {
        description: 'Create a limit order on the decentralized exchange',
        tags: ['DEX'],
        body: {
          type: 'object',
          required: ['takerGets', 'takerPays', 'projectId', 'walletSeed'],
          properties: {
            takerGets: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    currency: { type: 'string' },
                    issuer: { type: 'string' },
                    value: { type: 'string' }
                  }
                }
              ]
            },
            takerPays: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    currency: { type: 'string' },
                    issuer: { type: 'string' },
                    value: { type: 'string' }
                  }
                }
              ]
            },
            expiration: { type: 'number' },
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<CreateOfferRequest>, reply: FastifyReply) => {
      try {
        const { takerGets, takerPays, expiration, projectId, walletSeed } = request.body

        // Validate amounts
        if (typeof takerGets === 'object') {
          XRPLErrorHandler.validateAmount(takerGets.value)
          XRPLErrorHandler.validateCurrency(takerGets.currency)
          if (takerGets.issuer) {
            XRPLErrorHandler.validateAddress(takerGets.issuer)
          }
        } else {
          XRPLErrorHandler.validateAmount(takerGets)
        }

        if (typeof takerPays === 'object') {
          XRPLErrorHandler.validateAmount(takerPays.value)
          XRPLErrorHandler.validateCurrency(takerPays.currency)
          if (takerPays.issuer) {
            XRPLErrorHandler.validateAddress(takerPays.issuer)
          }
        } else {
          XRPLErrorHandler.validateAmount(takerPays)
        }

        // Create wallet
        const wallet = Wallet.fromSeed(walletSeed)

        // Convert to proper XRPL Amount types
        const takerGetsAmount: Amount = typeof takerGets === 'string' 
          ? takerGets
          : { ...takerGets, issuer: takerGets.issuer! }
        const takerPaysAmount: Amount = typeof takerPays === 'string'
          ? takerPays  
          : { ...takerPays, issuer: takerPays.issuer! }

        // Create offer on blockchain
        const result = await dexService.createOffer({
          wallet,
          takerGets: takerGetsAmount,
          takerPays: takerPaysAmount,
          expiration
        })

        // Calculate price and order type
        const price = calculatePrice(takerGetsAmount, takerPaysAmount)
        const orderType = determineOrderType(takerGetsAmount, takerPaysAmount)

        // Save to database
        await databaseService.saveDEXOrder({
          projectId,
          accountAddress: wallet.address,
          orderSequence: result.offerSequence,
          orderType,
          baseCurrency: typeof takerGetsAmount === 'string' ? 'XRP' : takerGetsAmount.currency,
          baseIssuer: typeof takerGetsAmount === 'string' ? undefined : takerGetsAmount.issuer,
          quoteCurrency: typeof takerPaysAmount === 'string' ? 'XRP' : takerPaysAmount.currency,
          quoteIssuer: typeof takerPaysAmount === 'string' ? undefined : takerPaysAmount.issuer,
          takerGetsAmount: typeof takerGetsAmount === 'string' ? takerGetsAmount : takerGetsAmount.value,
          takerPaysAmount: typeof takerPaysAmount === 'string' ? takerPaysAmount : takerPaysAmount.value,
          price,
          expiration: expiration ? new Date(expiration * 1000) : undefined,
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.DEX_OFFER_CREATED, {
          accountAddress: wallet.address,
          offerSequence: result.offerSequence,
          orderType,
          price,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            offerSequence: result.offerSequence,
            transactionHash: result.transactionHash,
            orderType,
            price
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /dex/offers/:offerSequence
   * Cancel an existing offer
   */
  fastify.delete<CancelOfferRequest>(
    '/dex/offers/:offerSequence',
    {
      schema: {
        description: 'Cancel an existing DEX offer',
        tags: ['DEX'],
        params: {
          type: 'object',
          properties: {
            offerSequence: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['walletSeed'],
          properties: {
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<CancelOfferRequest>, reply: FastifyReply) => {
      try {
        const { offerSequence } = request.params
        const { walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Cancel on blockchain
        const result = await dexService.cancelOffer(
          wallet,
          parseInt(offerSequence)
        )

        // Update database
        await databaseService.cancelDEXOrder({
          accountAddress: wallet.address,
          orderSequence: parseInt(offerSequence),
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.DEX_OFFER_CANCELLED, {
          accountAddress: wallet.address,
          offerSequence: parseInt(offerSequence),
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /dex/swap
   * Execute a market swap
   */
  fastify.post<ExecuteSwapRequest>(
    '/dex/swap',
    {
      schema: {
        description: 'Execute a market swap on the DEX',
        tags: ['DEX'],
        body: {
          type: 'object',
          required: ['fromCurrency', 'toCurrency', 'amount', 'projectId', 'walletSeed'],
          properties: {
            fromCurrency: { type: 'string' },
            fromIssuer: { type: 'string' },
            toCurrency: { type: 'string' },
            toIssuer: { type: 'string' },
            amount: { type: 'string' },
            maxSlippage: { type: 'number', minimum: 0, maximum: 100 },
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ExecuteSwapRequest>, reply: FastifyReply) => {
      try {
        const { 
          fromCurrency, 
          fromIssuer, 
          toCurrency, 
          toIssuer, 
          amount, 
          maxSlippage, 
          projectId, 
          walletSeed 
        } = request.body

        XRPLErrorHandler.validateAmount(amount)
        XRPLErrorHandler.validateCurrency(fromCurrency)
        XRPLErrorHandler.validateCurrency(toCurrency)

        if (fromIssuer) XRPLErrorHandler.validateAddress(fromIssuer)
        if (toIssuer) XRPLErrorHandler.validateAddress(toIssuer)

        const wallet = Wallet.fromSeed(walletSeed)

        // Execute swap
        const result = await dexService.executeSwap({
          wallet,
          fromCurrency,
          fromIssuer,
          toCurrency,
          toIssuer,
          amount,
          maxSlippage
        })

        // Save trade to database
        await databaseService.saveTrade({
          makerAddress: wallet.address, // Simplified - in reality this would be the actual maker
          takerAddress: wallet.address,
          baseCurrency: toCurrency,
          baseIssuer: toIssuer,
          quoteCurrency: fromCurrency,
          quoteIssuer: fromIssuer,
          baseAmount: result.amountReceived,
          quoteAmount: amount,
          price: result.effectivePrice,
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.DEX_SWAP_EXECUTED, {
          accountAddress: wallet.address,
          fromCurrency,
          toCurrency,
          amountIn: amount,
          amountOut: result.amountReceived,
          effectivePrice: result.effectivePrice,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            amountReceived: result.amountReceived,
            effectivePrice: result.effectivePrice,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /dex/orderbook
   * Get order book for a trading pair
   */
  fastify.get<GetOrderBookRequest>(
    '/dex/orderbook',
    {
      schema: {
        description: 'Get order book for a trading pair',
        tags: ['DEX'],
        querystring: {
          type: 'object',
          required: ['baseCurrency', 'quoteCurrency'],
          properties: {
            baseCurrency: { type: 'string' },
            baseIssuer: { type: 'string' },
            quoteCurrency: { type: 'string' },
            quoteIssuer: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 200, default: 50 }
          }
        }
      }
    },
    async (request: FastifyRequest<GetOrderBookRequest>, reply: FastifyReply) => {
      try {
        const { baseCurrency, baseIssuer, quoteCurrency, quoteIssuer, limit = 50 } = request.query

        XRPLErrorHandler.validateCurrency(baseCurrency)
        XRPLErrorHandler.validateCurrency(quoteCurrency)

        const takerGets = baseIssuer
          ? { currency: baseCurrency, issuer: baseIssuer }
          : { currency: baseCurrency }

        const takerPays = quoteIssuer
          ? { currency: quoteCurrency, issuer: quoteIssuer }
          : { currency: quoteCurrency }

        const orderBook = await dexService.getOrderBook(takerGets, takerPays, limit)

        return reply.send({
          success: true,
          data: {
            pair: `${baseCurrency}/${quoteCurrency}`,
            bids: orderBook.bids,
            asks: orderBook.asks,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /dex/accounts/:address/offers
   * Get all offers for an account
   */
  fastify.get<GetAccountOffersRequest>(
    '/dex/accounts/:address/offers',
    {
      schema: {
        description: 'Get all offers for an account',
        tags: ['DEX'],
        params: {
          type: 'object',
          properties: {
            address: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetAccountOffersRequest>, reply: FastifyReply) => {
      try {
        const { address } = request.params

        XRPLErrorHandler.validateAddress(address)

        const offers = await dexService.getAccountOffers(address)

        return reply.send({
          success: true,
          data: {
            address,
            offers,
            total: offers.length
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /dex/orders
   * List orders with pagination and filters
   */
  fastify.get<ListOrdersRequest>(
    '/dex/orders',
    {
      schema: {
        description: 'List DEX orders with pagination and filters',
        tags: ['DEX'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            accountAddress: { type: 'string' },
            status: { type: 'string', enum: ['active', 'filled', 'cancelled', 'expired'] },
            baseCurrency: { type: 'string' },
            quoteCurrency: { type: 'string' },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListOrdersRequest>, reply: FastifyReply) => {
      try {
        const { 
          page = 1, 
          limit = 20, 
          accountAddress, 
          status, 
          baseCurrency, 
          quoteCurrency, 
          projectId 
        } = request.query

        // Get orders from database - handle both array and object returns
        const ordersResult = await databaseService.listAccountOrders(
          accountAddress || '', 
          status
        )
        
        // Normalize to expected format
        const result: { orders: any[]; total: number } = Array.isArray(ordersResult)
          ? { orders: ordersResult, total: ordersResult.length }
          : ordersResult

        return reply.send({
          success: true,
          data: {
            orders: result.orders,
            pagination: {
              page,
              limit,
              total: result.total,
              totalPages: Math.ceil(result.total / limit)
            }
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // Helper methods
  function calculatePrice(takerGets: any, takerPays: any): number {
    const getsValue = typeof takerGets === 'string' 
      ? parseFloat(takerGets) 
      : parseFloat(takerGets.value)
    const paysValue = typeof takerPays === 'string'
      ? parseFloat(takerPays)
      : parseFloat(takerPays.value)
    
    return paysValue / getsValue
  }

  function determineOrderType(takerGets: any, takerPays: any): 'buy' | 'sell' {
    // Simplified logic - in reality this depends on which is base/quote
    return 'buy'
  }
}
