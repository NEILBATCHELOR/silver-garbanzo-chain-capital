/**
 * XRPL Compliance API Routes
 * 
 * RESTful endpoints for compliance and regulatory features
 * Implements asset freeze controls and deposit pre-authorization
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { XRPLFreezeService } from '@/services/wallet/ripple/compliance/XRPLFreezeService'
import { XRPLDepositPreAuthService } from '@/services/wallet/ripple/compliance/XRPLDepositPreAuthService'
import { XRPLComplianceDatabaseService } from '@/services/wallet/ripple/compliance/XRPLComplianceDatabaseService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { Wallet } from 'xrpl'

// Request/Response Types
interface EnableGlobalFreezeRequest {
  Body: {
    projectId: string
    issuerWalletSeed: string
    reason?: string
  }
}

interface DisableGlobalFreezeRequest {
  Body: {
    issuerWalletSeed: string
  }
}

interface FreezeTrustLineRequest {
  Body: {
    holder: string
    currency: string
    projectId: string
    issuerWalletSeed: string
    reason?: string
  }
}

interface UnfreezeTrustLineRequest {
  Body: {
    holder: string
    currency: string
    issuerWalletSeed: string
  }
}

interface EnableNoFreezeRequest {
  Body: {
    issuerWalletSeed: string
    confirmation: string
  }
}

interface GetFreezeStatusRequest {
  Params: {
    address: string
  }
}

interface EnableDepositAuthRequest {
  Body: {
    projectId: string
    walletSeed: string
  }
}

interface AuthorizeDepositorRequest {
  Body: {
    authorizedAddress: string
    projectId: string
    walletSeed: string
  }
}

interface UnauthorizeDepositorRequest {
  Body: {
    unauthorizedAddress: string
    walletSeed: string
  }
}

interface GetAuthorizedDepositorsRequest {
  Params: {
    address: string
  }
}

interface CheckDepositAuthRequest {
  Params: {
    accountAddress: string
    depositorAddress: string
  }
}

interface ListFreezeEventsRequest {
  Querystring: {
    page?: number
    limit?: number
    issuerAddress?: string
    freezeType?: string
    projectId?: string
  }
}

export async function complianceRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const freezeService = new XRPLFreezeService(xrplClient)
  const depositAuthService = new XRPLDepositPreAuthService(xrplClient)
  const databaseService = new XRPLComplianceDatabaseService()
  const wsService = getXRPLWebSocketService()

  /**
   * POST /compliance/freeze/global/enable
   * Enable global freeze on all trust lines
   */
  fastify.post<EnableGlobalFreezeRequest>(
    '/compliance/freeze/global/enable',
    {
      schema: {
        description: 'Enable global freeze on all trust lines',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['projectId', 'issuerWalletSeed'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            issuerWalletSeed: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<EnableGlobalFreezeRequest>, reply: FastifyReply) => {
      try {
        const { projectId, issuerWalletSeed, reason } = request.body
        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Enable global freeze
        const result = await freezeService.enableGlobalFreeze(issuerWallet)

        // Save event to database
        await databaseService.saveFreezeEvent({
          projectId,
          issuerAddress: issuerWallet.address,
          freezeType: 'global',
          action: 'enable',
          reason,
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_GLOBAL_FREEZE_ENABLED, {
          issuerAddress: issuerWallet.address,
          reason,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            issuerAddress: issuerWallet.address,
            freezeType: 'global',
            status: 'enabled',
            transactionHash: result.transactionHash,
            warning: result.warning
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /compliance/freeze/global/disable
   * Disable global freeze
   */
  fastify.post<DisableGlobalFreezeRequest>(
    '/compliance/freeze/global/disable',
    {
      schema: {
        description: 'Disable global freeze',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['issuerWalletSeed'],
          properties: {
            issuerWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<DisableGlobalFreezeRequest>, reply: FastifyReply) => {
      try {
        const { issuerWalletSeed } = request.body
        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Disable global freeze
        const result = await freezeService.disableGlobalFreeze(issuerWallet)

        // Save event
        await databaseService.saveFreezeEvent({
          projectId: undefined,
          issuerAddress: issuerWallet.address,
          freezeType: 'global',
          action: 'disable',
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_GLOBAL_FREEZE_DISABLED, {
          issuerAddress: issuerWallet.address,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            issuerAddress: issuerWallet.address,
            freezeType: 'global',
            status: 'disabled',
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /compliance/freeze/trustline
   * Freeze individual trust line
   */
  fastify.post<FreezeTrustLineRequest>(
    '/compliance/freeze/trustline',
    {
      schema: {
        description: 'Freeze individual trust line',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['holder', 'currency', 'projectId', 'issuerWalletSeed'],
          properties: {
            holder: { type: 'string' },
            currency: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            issuerWalletSeed: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<FreezeTrustLineRequest>, reply: FastifyReply) => {
      try {
        const { holder, currency, projectId, issuerWalletSeed, reason } = request.body

        XRPLErrorHandler.validateAddress(holder)
        XRPLErrorHandler.validateCurrency(currency)

        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Freeze trust line
        const result = await freezeService.freezeTrustLine(issuerWallet, holder, currency)

        // Save event
        await databaseService.saveFreezeEvent({
          projectId,
          issuerAddress: issuerWallet.address,
          holderAddress: holder,
          currency,
          freezeType: 'individual',
          action: 'freeze',
          reason,
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_TRUSTLINE_FROZEN, {
          issuerAddress: issuerWallet.address,
          holderAddress: holder,
          currency,
          reason,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            issuerAddress: issuerWallet.address,
            holderAddress: holder,
            currency,
            status: 'frozen',
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /compliance/freeze/trustline
   * Unfreeze individual trust line
   */
  fastify.delete<UnfreezeTrustLineRequest>(
    '/compliance/freeze/trustline',
    {
      schema: {
        description: 'Unfreeze individual trust line',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['holder', 'currency', 'issuerWalletSeed'],
          properties: {
            holder: { type: 'string' },
            currency: { type: 'string' },
            issuerWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<UnfreezeTrustLineRequest>, reply: FastifyReply) => {
      try {
        const { holder, currency, issuerWalletSeed } = request.body

        XRPLErrorHandler.validateAddress(holder)
        XRPLErrorHandler.validateCurrency(currency)

        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Unfreeze trust line
        const result = await freezeService.unfreezeTrustLine(issuerWallet, holder, currency)

        // Save event
        await databaseService.saveFreezeEvent({
          projectId: undefined,
          issuerAddress: issuerWallet.address,
          holderAddress: holder,
          currency,
          freezeType: 'individual',
          action: 'unfreeze',
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_TRUSTLINE_UNFROZEN, {
          issuerAddress: issuerWallet.address,
          holderAddress: holder,
          currency,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            issuerAddress: issuerWallet.address,
            holderAddress: holder,
            currency,
            status: 'unfrozen',
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /compliance/freeze/no-freeze
   * Enable No Freeze flag (PERMANENT)
   */
  fastify.post<EnableNoFreezeRequest>(
    '/compliance/freeze/no-freeze',
    {
      schema: {
        description: 'Enable No Freeze flag (PERMANENT - cannot be undone!)',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['issuerWalletSeed', 'confirmation'],
          properties: {
            issuerWalletSeed: { type: 'string' },
            confirmation: { 
              type: 'string',
              pattern: '^I_UNDERSTAND_THIS_IS_PERMANENT$'
            }
          }
        }
      }
    },
    async (request: FastifyRequest<EnableNoFreezeRequest>, reply: FastifyReply) => {
      try {
        const { issuerWalletSeed, confirmation } = request.body

        if (confirmation !== 'I_UNDERSTAND_THIS_IS_PERMANENT') {
          throw new XRPLError(
            XRPLErrorCode.FREEZE_NO_FREEZE_CONFIRMATION_REQUIRED,
            'Must confirm understanding that No Freeze is permanent'
          )
        }

        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Enable No Freeze
        const result = await freezeService.enableNoFreeze(issuerWallet)

        // Save event
        await databaseService.saveFreezeEvent({
          projectId: undefined,
          issuerAddress: issuerWallet.address,
          freezeType: 'no_freeze',
          action: 'enable',
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_NO_FREEZE_ENABLED, {
          issuerAddress: issuerWallet.address,
          transactionHash: result.transactionHash,
          warning: result.warning
        })

        return reply.send({
          success: true,
          data: {
            issuerAddress: issuerWallet.address,
            status: 'no_freeze_enabled',
            transactionHash: result.transactionHash,
            warning: result.warning
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /compliance/freeze/status/:address
   * Get freeze status for account
   */
  fastify.get<GetFreezeStatusRequest>(
    '/compliance/freeze/status/:address',
    {
      schema: {
        description: 'Get freeze status for account',
        tags: ['Compliance'],
        params: {
          type: 'object',
          properties: {
            address: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetFreezeStatusRequest>, reply: FastifyReply) => {
      try {
        const { address } = request.params

        XRPLErrorHandler.validateAddress(address)

        const status = await freezeService.getFreezeStatus(address)

        return reply.send({
          success: true,
          data: {
            address,
            ...status
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // Deposit Authorization Routes

  /**
   * POST /compliance/deposit-auth/enable
   * Enable deposit authorization requirement
   */
  fastify.post<EnableDepositAuthRequest>(
    '/compliance/deposit-auth/enable',
    {
      schema: {
        description: 'Enable deposit authorization requirement',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['projectId', 'walletSeed'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<EnableDepositAuthRequest>, reply: FastifyReply) => {
      try {
        const { projectId, walletSeed } = request.body
        const wallet = Wallet.fromSeed(walletSeed)

        // Enable deposit auth
        const result = await depositAuthService.enableDepositAuth(wallet)

        // Save to database
        await databaseService.saveDepositAuthEvent({
          projectId,
          accountAddress: wallet.address,
          action: 'enable',
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_DEPOSIT_AUTH_ENABLED, {
          accountAddress: wallet.address,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: wallet.address,
            depositAuthEnabled: true,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /compliance/deposit-auth/authorize
   * Pre-authorize an account for deposits
   */
  fastify.post<AuthorizeDepositorRequest>(
    '/compliance/deposit-auth/authorize',
    {
      schema: {
        description: 'Pre-authorize an account for deposits',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['authorizedAddress', 'projectId', 'walletSeed'],
          properties: {
            authorizedAddress: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<AuthorizeDepositorRequest>, reply: FastifyReply) => {
      try {
        const { authorizedAddress, projectId, walletSeed } = request.body

        XRPLErrorHandler.validateAddress(authorizedAddress)

        const wallet = Wallet.fromSeed(walletSeed)

        // Authorize depositor
        const result = await depositAuthService.authorizeDepositor(wallet, authorizedAddress)

        // Save to database
        await databaseService.saveDepositAuthorization({
          projectId,
          accountAddress: wallet.address,
          authorizedAddress,
          transactionHash: result.transactionHash
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_DEPOSITOR_AUTHORIZED, {
          accountAddress: wallet.address,
          authorizedAddress,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: wallet.address,
            authorizedAddress,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /compliance/deposit-auth/authorize
   * Remove deposit authorization
   */
  fastify.delete<UnauthorizeDepositorRequest>(
    '/compliance/deposit-auth/authorize',
    {
      schema: {
        description: 'Remove deposit authorization',
        tags: ['Compliance'],
        body: {
          type: 'object',
          required: ['unauthorizedAddress', 'walletSeed'],
          properties: {
            unauthorizedAddress: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<UnauthorizeDepositorRequest>, reply: FastifyReply) => {
      try {
        const { unauthorizedAddress, walletSeed } = request.body

        XRPLErrorHandler.validateAddress(unauthorizedAddress)

        const wallet = Wallet.fromSeed(walletSeed)

        // Unauthorize depositor
        const result = await depositAuthService.unauthorizeDepositor(wallet, unauthorizedAddress)

        // Update database
        await databaseService.removeDepositAuthorization(wallet.address, unauthorizedAddress)

        // Broadcast event
        wsService.emitToAll(XRPLEventType.COMPLIANCE_DEPOSITOR_UNAUTHORIZED, {
          accountAddress: wallet.address,
          unauthorizedAddress,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: wallet.address,
            unauthorizedAddress,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /compliance/deposit-auth/:address/authorized
   * Get authorized depositors for account
   */
  fastify.get<GetAuthorizedDepositorsRequest>(
    '/compliance/deposit-auth/:address/authorized',
    {
      schema: {
        description: 'Get authorized depositors for account',
        tags: ['Compliance'],
        params: {
          type: 'object',
          properties: {
            address: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetAuthorizedDepositorsRequest>, reply: FastifyReply) => {
      try {
        const { address } = request.params

        XRPLErrorHandler.validateAddress(address)

        const authorized = await depositAuthService.getAuthorizedDepositors(address)

        return reply.send({
          success: true,
          data: {
            accountAddress: address,
            authorizedDepositors: authorized,
            total: authorized.length
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /compliance/deposit-auth/:accountAddress/check/:depositorAddress
   * Check if depositor is authorized
   */
  fastify.get<CheckDepositAuthRequest>(
    '/compliance/deposit-auth/:accountAddress/check/:depositorAddress',
    {
      schema: {
        description: 'Check if depositor is authorized',
        tags: ['Compliance'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' },
            depositorAddress: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<CheckDepositAuthRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress, depositorAddress } = request.params

        XRPLErrorHandler.validateAddress(accountAddress)
        XRPLErrorHandler.validateAddress(depositorAddress)

        const isAuthorized = await depositAuthService.isAuthorized(
          accountAddress,
          depositorAddress
        )

        return reply.send({
          success: true,
          data: {
            accountAddress,
            depositorAddress,
            isAuthorized
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /compliance/freeze/events
   * List freeze events with pagination
   */
  fastify.get<ListFreezeEventsRequest>(
    '/compliance/freeze/events',
    {
      schema: {
        description: 'List freeze events',
        tags: ['Compliance'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            issuerAddress: { type: 'string' },
            freezeType: { type: 'string', enum: ['global', 'individual', 'no_freeze'] },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListFreezeEventsRequest>, reply: FastifyReply) => {
      try {
        const { page = 1, limit = 20, issuerAddress, freezeType, projectId } = request.query

        const result = await databaseService.listFreezeEvents({
          page,
          limit,
          issuerAddress,
          freezeType,
          projectId
        })

        return reply.send({
          success: true,
          data: {
            events: result.events,
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
}
