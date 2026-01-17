/**
 * XRPL Token API Routes
 * 
 * RESTful endpoints for Multi-Purpose Token (MPT) and Trust Line Token operations
 * Enhanced from legacy mpt.routes.ts with service layer, error handling, and WebSocket support
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { XRPLMPTDatabaseService } from '@/services/wallet/ripple/mpt/XRPLMPTDatabaseService'
import { MPTMetadataService } from '@/services/wallet/ripple/mpt/MPTMetadataService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { Wallet } from 'xrpl'

// ==================== REQUEST/RESPONSE TYPES ====================

interface CreateMPTRequest {
  Body: {
    assetScale: number
    maximumAmount?: string
    transferFee?: number
    metadata?: {
      name?: string
      symbol?: string
      description?: string
      icon?: string
      [key: string]: any
    }
    flags?: {
      canTransfer?: boolean
      canTrade?: boolean
      canLock?: boolean
      canClawback?: boolean
      requireAuth?: boolean
    }
    projectId: string
    walletSeed: string  // In production, use secure key vault
  }
}

interface AuthorizeHolderRequest {
  Params: {
    mptId: string
  }
  Body: {
    holderAddress: string
    walletSeed: string
  }
}

interface TransferMPTRequest {
  Params: {
    mptId: string
  }
  Body: {
    destinationAddress: string
    amount: string
    memos?: Array<{
      data?: string
      format?: string
      type?: string
    }>
    walletSeed: string
  }
}

interface ClawbackMPTRequest {
  Params: {
    mptId: string
  }
  Body: {
    holderAddress: string
    amount: string
    walletSeed: string
  }
}

interface GetMPTRequest {
  Params: {
    mptId: string
  }
}

interface ListMPTsRequest {
  Querystring: {
    page?: number
    limit?: number
    issuerAddress?: string
    status?: string
    projectId?: string
  }
}

interface GetHoldersRequest {
  Params: {
    mptId: string
  }
  Querystring: {
    page?: number
    limit?: number
    minBalance?: string
  }
}

// ==================== ROUTES ====================

export async function tokenRoutes(fastify: FastifyInstance) {
  // Initialize services
  const mptService = new XRPLMPTService()
  const databaseService = new XRPLMPTDatabaseService()
  const metadataService = new MPTMetadataService()

  // ==================== CREATE MPT TOKEN ====================
  
  /**
   * Create new Multi-Purpose Token issuance
   * 
   * POST /xrpl/tokens/mpt/create
   * 
   * Creates a new MPT token on XRPL with specified parameters.
   * Stores issuance record in database and broadcasts creation event.
   * 
   * @returns {Object} Created MPT issuance details with transaction hash
   */
  fastify.post<CreateMPTRequest>(
    '/mpt/create',
    {
      schema: {
        description: 'Create new Multi-Purpose Token',
        tags: ['Tokens'],
        body: {
          type: 'object',
          required: ['assetScale', 'projectId', 'walletSeed'],
          properties: {
            assetScale: {
              type: 'number',
              description: 'Decimal precision (0-19)',
              minimum: 0,
              maximum: 19
            },
            maximumAmount: {
              type: 'string',
              description: 'Maximum supply (optional)'
            },
            transferFee: {
              type: 'number',
              description: 'Transfer fee in basis points (0-50000)',
              minimum: 0,
              maximum: 50000
            },
            metadata: {
              type: 'object',
              description: 'Token metadata (name, symbol, etc.)'
            },
            flags: {
              type: 'object',
              description: 'Token permission flags'
            },
            projectId: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  mptId: { type: 'string' },
                  issuerAddress: { type: 'string' },
                  transactionHash: { type: 'string' },
                  ledgerIndex: { type: 'number' },
                  assetScale: { type: 'number' },
                  maximumAmount: { type: 'string' },
                  transferFee: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<CreateMPTRequest>, reply: FastifyReply) => {
      try {
        const { 
          assetScale, 
          maximumAmount, 
          transferFee, 
          metadata, 
          flags,
          projectId, 
          walletSeed 
        } = request.body

        // Create wallet from seed
        const wallet = Wallet.fromSeed(walletSeed)

        // Create MPT on blockchain
        const result = await mptService.createMPTIssuance({
          wallet,
          assetScale,
          maximumAmount,
          transferFee,
          flags
        })

        // Store metadata if provided
        // TODO: Implement metadata service
        // if (metadata) {
        //   await metadataService.storeMetadata(result.mptId, metadata)
        // }

        // Extract ticker and name from metadata (required fields)
        const ticker = metadata?.symbol || metadata?.ticker || result.mptId.substring(0, 8)
        const name = metadata?.name || `MPT Token ${result.mptId.substring(0, 8)}`

        // Store in database
        const dbRecord = await databaseService.saveMPTIssuance(projectId, {
          mptId: result.mptId,
          issuerAddress: wallet.address,
          assetScale,
          maximumAmount: maximumAmount || null,
          transferFee: transferFee || 0,
          transactionHash: result.transactionHash,
          ledgerIndex: result.ledgerIndex,
          metadata,
          flags,
          status: 'active',
          ticker,
          name,
          description: metadata?.description
        })

        return reply.status(201).send({
          success: true,
          data: {
            ...result,
            databaseId: dbRecord.id
          }
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== AUTHORIZE HOLDER ====================
  
  /**
   * Authorize holder for MPT token
   * 
   * POST /xrpl/tokens/mpt/:mptId/authorize
   * 
   * Authorizes an account to hold the MPT token.
   * Required when MPT has requireAuth flag enabled.
   */
  fastify.post<AuthorizeHolderRequest>(
    '/mpt/:mptId/authorize',
    {
      schema: {
        description: 'Authorize MPT token holder',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['holderAddress', 'walletSeed'],
          properties: {
            holderAddress: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<AuthorizeHolderRequest>, reply: FastifyReply) => {
      try {
        const { mptId } = request.params
        const { holderAddress, walletSeed } = request.body

        XRPLErrorHandler.validateAddress(holderAddress)

        const wallet = Wallet.fromSeed(walletSeed)

        const result = await mptService.authorizeHolder({
          wallet,
          mptId,
          holderAddress
        })

        // Store authorization in database
        await databaseService.saveHolderAuthorization(mptId, {
          holderAddress,
          authorized: true,
          transactionHash: result.transactionHash
        })

        return reply.status(200).send({
          success: true,
          data: result
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== TRANSFER MPT ====================
  
  /**
   * Transfer MPT tokens
   * 
   * POST /xrpl/tokens/mpt/:mptId/transfer
   * 
   * Transfers MPT tokens to another account.
   */
  fastify.post<TransferMPTRequest>(
    '/mpt/:mptId/transfer',
    {
      schema: {
        description: 'Transfer MPT tokens',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['destinationAddress', 'amount', 'walletSeed'],
          properties: {
            destinationAddress: { type: 'string' },
            amount: { type: 'string' },
            memos: { type: 'array' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<TransferMPTRequest>, reply: FastifyReply) => {
      try {
        const { mptId } = request.params
        const { destinationAddress, amount, memos, walletSeed } = request.body

        XRPLErrorHandler.validateAddress(destinationAddress)
        XRPLErrorHandler.validateAmount(amount)

        const wallet = Wallet.fromSeed(walletSeed)

        const result = await mptService.transferMPT({
          wallet,
          mptId,
          destinationAddress,
          amount,
          memos
        })

        // Record transaction
        await databaseService.saveMPTTransaction({
          mptId,
          transactionType: 'transfer',
          fromAddress: wallet.address,
          toAddress: destinationAddress,
          amount,
          transactionHash: result.transactionHash
        })

        return reply.status(200).send({
          success: true,
          data: result
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== CLAWBACK MPT ====================
  
  /**
   * Clawback MPT tokens
   * 
   * POST /xrpl/tokens/mpt/:mptId/clawback
   * 
   * Claws back MPT tokens from a holder (requires clawback flag).
   */
  fastify.post<ClawbackMPTRequest>(
    '/mpt/:mptId/clawback',
    {
      schema: {
        description: 'Clawback MPT tokens from holder',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['holderAddress', 'amount', 'walletSeed'],
          properties: {
            holderAddress: { type: 'string' },
            amount: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ClawbackMPTRequest>, reply: FastifyReply) => {
      try {
        const { mptId } = request.params
        const { holderAddress, amount, walletSeed } = request.body

        XRPLErrorHandler.validateAddress(holderAddress)
        XRPLErrorHandler.validateAmount(amount)

        const wallet = Wallet.fromSeed(walletSeed)

        const result = await mptService.clawbackMPT({
          wallet,
          mptId,
          holderAddress,
          amount
        })

        // Record clawback transaction
        await databaseService.saveMPTTransaction({
          mptId,
          transactionType: 'clawback',
          fromAddress: holderAddress,
          toAddress: wallet.address,
          amount,
          transactionHash: result.transactionHash
        })

        return reply.status(200).send({
          success: true,
          data: result
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== GET MPT DETAILS ====================
  
  /**
   * Get MPT token details
   * 
   * GET /xrpl/tokens/mpt/:mptId
   * 
   * Retrieves complete MPT token information including metadata.
   */
  fastify.get<GetMPTRequest>(
    '/mpt/:mptId',
    {
      schema: {
        description: 'Get MPT token details',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetMPTRequest>, reply: FastifyReply) => {
      try {
        const { mptId } = request.params

        // Get from database
        const dbRecord = await databaseService.getMPTIssuance(mptId)
        
        if (!dbRecord) {
          throw new XRPLError(
            XRPLErrorCode.NOT_FOUND,
            `MPT token ${mptId} not found`
          )
        }

        // Get metadata (TODO: Implement metadata service)
        // const metadata = await metadataService.getMetadata(mptId)

        return reply.send({
          success: true,
          data: {
            ...dbRecord,
            metadata: dbRecord.metadata_json // Use metadata from database directly
          }
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== LIST MPT TOKENS ====================
  
  /**
   * List MPT tokens
   * 
   * GET /xrpl/tokens/mpt
   * 
   * Lists MPT tokens with filtering and pagination.
   */
  fastify.get<ListMPTsRequest>(
    '/mpt',
    {
      schema: {
        description: 'List MPT tokens',
        tags: ['Tokens'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            issuerAddress: { type: 'string' },
            status: { type: 'string' },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListMPTsRequest>, reply: FastifyReply) => {
      try {
        const { page = 1, limit = 20, issuerAddress, status, projectId } = request.query

        const result = await databaseService.listMPTIssuances({
          page,
          limit,
          issuerAddress,
          status,
          projectId
        })

        return reply.send({
          success: true,
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== GET MPT HOLDERS ====================
  
  /**
   * Get MPT token holders
   * 
   * GET /xrpl/tokens/mpt/:mptId/holders
   * 
   * Lists all holders of a specific MPT token.
   */
  fastify.get<GetHoldersRequest>(
    '/mpt/:mptId/holders',
    {
      schema: {
        description: 'Get MPT token holders',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 50 },
            minBalance: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetHoldersRequest>, reply: FastifyReply) => {
      try {
        const { mptId } = request.params
        const { page = 1, limit = 50, minBalance } = request.query

        const holders = await databaseService.getMPTHolders(mptId)
        
        // Apply client-side filtering and pagination
        let filtered = holders
        if (minBalance) {
          filtered = filtered.filter((h: any) => parseFloat(h.balance || '0') >= parseFloat(minBalance))
        }
        
        const total = filtered.length
        const start = (page - 1) * limit
        const paginated = filtered.slice(start, start + limit)

        return reply.send({
          success: true,
          data: paginated,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== GET MPT TRANSACTIONS ====================
  
  /**
   * Get MPT transaction history
   * 
   * GET /xrpl/tokens/mpt/:mptId/transactions
   * 
   * Retrieves transaction history for an MPT token.
   */
  fastify.get(
    '/mpt/:mptId/transactions',
    {
      schema: {
        description: 'Get MPT transaction history',
        tags: ['Tokens'],
        params: {
          type: 'object',
          properties: {
            mptId: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            transactionType: { type: 'string' },
            fromAddress: { type: 'string' },
            toAddress: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { mptId } = request.params as { mptId: string }
        const { page = 1, limit = 20, transactionType, fromAddress, toAddress } = request.query as any

        const result = await databaseService.getMPTTransactions(mptId, {
          page,
          limit,
          transactionType,
          fromAddress,
          toAddress
        })

        return reply.send({
          success: true,
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        })

      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )
}
