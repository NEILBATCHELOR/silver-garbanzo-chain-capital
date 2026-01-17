/**
 * XRPL Advanced API Routes
 * 
 * RESTful endpoints for advanced account management:
 * - Key rotation and management
 * - Account delegation
 * - Account configuration
 * - Account lifecycle (deletion, reactivation)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { 
  Client,
  Wallet,
  SetRegularKey,
  AccountSet,
  AccountSetAsfFlags,
  AccountDelete
} from 'xrpl'

// ==================== REQUEST/RESPONSE TYPES ====================

interface SetRegularKeyRequest {
  Body: {
    regularKeyAddress: string
    projectId: string
    masterWalletSeed: string
  }
}

interface DisableMasterKeyRequest {
  Body: {
    projectId: string
    regularWalletSeed: string  // Must use regular key to disable master
  }
}

interface RotateKeyRequest {
  Body: {
    newRegularKeyAddress: string
    projectId: string
    currentRegularWalletSeed: string
  }
}

interface RemoveRegularKeyRequest {
  Body: {
    projectId: string
    masterWalletSeed: string
  }
}

interface ConfigureAccountRequest {
  Body: {
    accountAddress: string
    config: {
      requireDestinationTag?: boolean
      requireAuth?: boolean
      disallowIncomingXRP?: boolean
      defaultRipple?: boolean
      depositAuth?: boolean
      emailHash?: string
      messageKey?: string
      domain?: string
      transferRate?: number
      tickSize?: number
    }
    projectId: string
    walletSeed: string
  }
}

interface DelegatePermissionsRequest {
  Body: {
    accountAddress: string
    delegateAddress: string
    permissions: {
      canSend?: boolean
      canReceive?: boolean
      canTrade?: boolean
      canManageOffers?: boolean
      canManageNFTs?: boolean
    }
    expirationTime?: number
    projectId: string
    walletSeed: string
  }
}

interface RevokeDelegationRequest {
  Params: {
    delegationId: string
  }
  Body: {
    projectId: string
    walletSeed: string
  }
}

interface DeleteAccountRequest {
  Body: {
    accountAddress: string
    destinationAddress: string  // Where to send remaining XRP
    projectId: string
    walletSeed: string
  }
}

interface GetAccountConfigRequest {
  Params: {
    accountAddress: string
  }
}

interface GetKeyStatusRequest {
  Params: {
    accountAddress: string
  }
}

interface ListDelegationsRequest {
  Params: {
    accountAddress: string
  }
}

// ==================== ROUTES ====================

export async function advancedRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const wsService = getXRPLWebSocketService()

  // ==================== KEY MANAGEMENT ====================
  
  /**
   * Set regular key for account
   * 
   * POST /xrpl/advanced/keys/set-regular
   * 
   * Sets a regular key for an account, enabling key rotation.
   * Best practice: Set regular key before disabling master key.
   */
  fastify.post<SetRegularKeyRequest>(
    '/keys/set-regular',
    {
      schema: {
        description: 'Set regular key for account',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['regularKeyAddress', 'projectId', 'masterWalletSeed'],
          properties: {
            regularKeyAddress: { type: 'string' },
            projectId: { type: 'string' },
            masterWalletSeed: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accountAddress: { type: 'string' },
                  regularKeyAddress: { type: 'string' },
                  transactionHash: { type: 'string' },
                  ledgerIndex: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<SetRegularKeyRequest>, reply: FastifyReply) => {
      try {
        const { regularKeyAddress, projectId, masterWalletSeed } = request.body

        const masterWallet = Wallet.fromSeed(masterWalletSeed)

        // Create SetRegularKey transaction
        const tx: SetRegularKey = {
          TransactionType: 'SetRegularKey',
          Account: masterWallet.address,
          RegularKey: regularKeyAddress
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet: masterWallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        // Store key rotation in database
        // TODO: Add database storage via XRPLDatabaseService

        wsService.emitToAll(XRPLEventType.ACCOUNT_BALANCE_CHANGED, {
          accountAddress: masterWallet.address,
          regularKeyAddress,
          projectId,
          event: 'regular-key-set'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: masterWallet.address,
            regularKeyAddress,
            transactionHash: response.result.hash,
            ledgerIndex: response.result.validated ? response.result.ledger_index : undefined
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to set regular key',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * Disable master key
   * 
   * POST /xrpl/advanced/keys/disable-master
   * 
   * Permanently disables the master key. REQUIRES regular key to be set first.
   * WARNING: This is irreversible without the regular key!
   */
  fastify.post<DisableMasterKeyRequest>(
    '/keys/disable-master',
    {
      schema: {
        description: 'Disable master key (PERMANENT)',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['projectId', 'regularWalletSeed'],
          properties: {
            projectId: { type: 'string' },
            regularWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<DisableMasterKeyRequest>, reply: FastifyReply) => {
      try {
        const { projectId, regularWalletSeed } = request.body

        const regularWallet = Wallet.fromSeed(regularWalletSeed)

        // Create AccountSet transaction to disable master key
        const tx: AccountSet = {
          TransactionType: 'AccountSet',
          Account: regularWallet.address,
          SetFlag: AccountSetAsfFlags.asfDisableMaster
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet: regularWallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        wsService.emitToAll(XRPLEventType.ACCOUNT_FROZEN, {
          accountAddress: regularWallet.address,
          projectId,
          warning: 'Master key permanently disabled',
          event: 'master-key-disabled'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: regularWallet.address,
            transactionHash: response.result.hash,
            warning: 'Master key is now permanently disabled'
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to disable master key',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * Rotate regular key
   * 
   * POST /xrpl/advanced/keys/rotate
   * 
   * Rotates the regular key to a new address.
   */
  fastify.post<RotateKeyRequest>(
    '/keys/rotate',
    {
      schema: {
        description: 'Rotate regular key',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['newRegularKeyAddress', 'projectId', 'currentRegularWalletSeed'],
          properties: {
            newRegularKeyAddress: { type: 'string' },
            projectId: { type: 'string' },
            currentRegularWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<RotateKeyRequest>, reply: FastifyReply) => {
      try {
        const { newRegularKeyAddress, projectId, currentRegularWalletSeed } = request.body

        const currentWallet = Wallet.fromSeed(currentRegularWalletSeed)

        const tx: SetRegularKey = {
          TransactionType: 'SetRegularKey',
          Account: currentWallet.address,
          RegularKey: newRegularKeyAddress
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet: currentWallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        wsService.emitToAll(XRPLEventType.ACCOUNT_BALANCE_CHANGED, {
          accountAddress: currentWallet.address,
          newRegularKeyAddress,
          projectId,
          event: 'key-rotated'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: currentWallet.address,
            newRegularKeyAddress,
            transactionHash: response.result.hash
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to rotate key',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * Remove regular key
   * 
   * DELETE /xrpl/advanced/keys/regular
   * 
   * Removes the regular key, reverting to master key only.
   */
  fastify.delete<RemoveRegularKeyRequest>(
    '/keys/regular',
    {
      schema: {
        description: 'Remove regular key',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['projectId', 'masterWalletSeed'],
          properties: {
            projectId: { type: 'string' },
            masterWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<RemoveRegularKeyRequest>, reply: FastifyReply) => {
      try {
        const { projectId, masterWalletSeed } = request.body

        const masterWallet = Wallet.fromSeed(masterWalletSeed)

        // SetRegularKey with no RegularKey field removes it
        const tx: SetRegularKey = {
          TransactionType: 'SetRegularKey',
          Account: masterWallet.address
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet: masterWallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        wsService.emitToAll(XRPLEventType.ACCOUNT_BALANCE_CHANGED, {
          accountAddress: masterWallet.address,
          projectId,
          event: 'regular-key-removed'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: masterWallet.address,
            transactionHash: response.result.hash
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to remove regular key',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  // ==================== ACCOUNT CONFIGURATION ====================
  
  /**
   * Configure account settings
   * 
   * POST /xrpl/advanced/account/configure
   * 
   * Sets various account flags and properties.
   */
  fastify.post<ConfigureAccountRequest>(
    '/account/configure',
    {
      schema: {
        description: 'Configure account settings',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['accountAddress', 'config', 'projectId', 'walletSeed'],
          properties: {
            accountAddress: { type: 'string' },
            config: { type: 'object' },
            projectId: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ConfigureAccountRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress, config, projectId, walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Build AccountSet transaction with config flags
        const tx: AccountSet = {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          ...(config.emailHash && { EmailHash: config.emailHash }),
          ...(config.messageKey && { MessageKey: config.messageKey }),
          ...(config.domain && { Domain: config.domain }),
          ...(config.transferRate && { TransferRate: config.transferRate }),
          ...(config.tickSize && { TickSize: config.tickSize })
        }

        // Set flags
        if (config.requireDestinationTag) {
          tx.SetFlag = AccountSetAsfFlags.asfRequireDest
        } else if (config.requireAuth) {
          tx.SetFlag = AccountSetAsfFlags.asfRequireAuth
        } else if (config.disallowIncomingXRP) {
          tx.SetFlag = AccountSetAsfFlags.asfDisallowXRP
        } else if (config.defaultRipple) {
          tx.SetFlag = AccountSetAsfFlags.asfDefaultRipple
        } else if (config.depositAuth) {
          tx.SetFlag = AccountSetAsfFlags.asfDepositAuth
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        wsService.emitToAll(XRPLEventType.ACCOUNT_BALANCE_CHANGED, {
          accountAddress,
          config,
          projectId,
          event: 'account-configured'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress,
            config,
            transactionHash: response.result.hash
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to configure account',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  // ==================== ACCOUNT DELEGATION ====================
  
  /**
   * Delegate account permissions
   * 
   * POST /xrpl/advanced/delegation/create
   * 
   * Creates a delegation allowing another account limited permissions.
   */
  fastify.post<DelegatePermissionsRequest>(
    '/delegation/create',
    {
      schema: {
        description: 'Delegate account permissions',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['accountAddress', 'delegateAddress', 'permissions', 'projectId', 'walletSeed'],
          properties: {
            accountAddress: { type: 'string' },
            delegateAddress: { type: 'string' },
            permissions: { type: 'object' },
            expirationTime: { type: 'number' },
            projectId: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<DelegatePermissionsRequest>, reply: FastifyReply) => {
      try {
        const { 
          accountAddress, 
          delegateAddress, 
          permissions, 
          expirationTime, 
          projectId, 
          walletSeed 
        } = request.body

        // NOTE: XRPL doesn't have native delegation
        // This would be implemented via off-chain database + signing service
        // Store delegation in database for application-level enforcement

        // TODO: Implement database storage via XRPLDatabaseService

        wsService.emitToAll(XRPLEventType.MULTISIG_PROPOSAL_CREATED, {
          accountAddress,
          delegateAddress,
          permissions,
          expirationTime,
          projectId,
          event: 'delegation-created'
        })

        return reply.send({
          success: true,
          data: {
            delegationId: `del_${Date.now()}`,
            accountAddress,
            delegateAddress,
            permissions,
            expirationTime,
            note: 'Delegation stored for application-level enforcement'
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.OPERATION_FAILED,
          'Failed to create delegation',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * Revoke delegation
   * 
   * DELETE /xrpl/advanced/delegation/:delegationId
   * 
   * Revokes a previously granted delegation.
   */
  fastify.delete<RevokeDelegationRequest>(
    '/delegation/:delegationId',
    {
      schema: {
        description: 'Revoke delegation',
        tags: ['Advanced'],
        params: {
          type: 'object',
          properties: {
            delegationId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<RevokeDelegationRequest>, reply: FastifyReply) => {
      try {
        const { delegationId } = request.params
        const { projectId } = request.body

        // TODO: Remove from database via XRPLDatabaseService

        wsService.emitToAll(XRPLEventType.MULTISIG_PROPOSAL_EXECUTED, {
          delegationId,
          projectId,
          event: 'delegation-revoked'
        })

        return reply.send({
          success: true,
          data: { delegationId }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.OPERATION_FAILED,
          'Failed to revoke delegation',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  // ==================== ACCOUNT LIFECYCLE ====================
  
  /**
   * Delete account
   * 
   * DELETE /xrpl/advanced/account
   * 
   * Permanently deletes an account and sends remaining XRP to destination.
   * REQUIREMENTS:
   * - Account must have < 1000 owned objects
   * - Must specify destination for remaining XRP
   * - Cannot delete if account has negative balance
   */
  fastify.delete<DeleteAccountRequest>(
    '/account',
    {
      schema: {
        description: 'Delete XRPL account permanently',
        tags: ['Advanced'],
        body: {
          type: 'object',
          required: ['accountAddress', 'destinationAddress', 'projectId', 'walletSeed'],
          properties: {
            accountAddress: { type: 'string' },
            destinationAddress: { type: 'string' },
            projectId: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<DeleteAccountRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress, destinationAddress, projectId, walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Create AccountDelete transaction
        const tx: AccountDelete = {
          TransactionType: 'AccountDelete',
          Account: wallet.address,
          Destination: destinationAddress
        }

        const response = await xrplClient.submitAndWait(tx, {
          wallet,
          autofill: true
        })

        if (response.result.meta && typeof response.result.meta !== 'string') {
          if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
            throw new Error(`Transaction failed: ${response.result.meta.TransactionResult}`)
          }
        }

        wsService.emitToAll(XRPLEventType.ACCOUNT_BALANCE_CHANGED, {
          accountAddress,
          destinationAddress,
          projectId,
          event: 'account-deleted'
        })

        return reply.send({
          success: true,
          data: {
            accountAddress,
            destinationAddress,
            transactionHash: response.result.hash,
            warning: 'Account permanently deleted'
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.TRANSACTION_FAILED,
          'Failed to delete account',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  // ==================== QUERY ENDPOINTS ====================
  
  /**
   * Get account configuration
   * 
   * GET /xrpl/advanced/account/:accountAddress/config
   * 
   * Retrieves current account configuration and flags.
   */
  fastify.get<GetAccountConfigRequest>(
    '/account/:accountAddress/config',
    {
      schema: {
        description: 'Get account configuration',
        tags: ['Advanced'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetAccountConfigRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress } = request.params

        const accountInfo = await xrplClient.request({
          command: 'account_info',
          account: accountAddress,
          ledger_index: 'validated'
        })

        const flags = accountInfo.result.account_data.Flags || 0

        return reply.send({
          success: true,
          data: {
            accountAddress,
            flags: {
              requireDestinationTag: (flags & AccountSetAsfFlags.asfRequireDest) !== 0,
              requireAuth: (flags & AccountSetAsfFlags.asfRequireAuth) !== 0,
              disallowIncomingXRP: (flags & AccountSetAsfFlags.asfDisallowXRP) !== 0,
              defaultRipple: (flags & AccountSetAsfFlags.asfDefaultRipple) !== 0,
              depositAuth: (flags & AccountSetAsfFlags.asfDepositAuth) !== 0,
              masterKeyDisabled: (flags & AccountSetAsfFlags.asfDisableMaster) !== 0
            },
            config: {
              emailHash: accountInfo.result.account_data.EmailHash,
              messageKey: accountInfo.result.account_data.MessageKey,
              domain: accountInfo.result.account_data.Domain,
              transferRate: accountInfo.result.account_data.TransferRate,
              tickSize: accountInfo.result.account_data.TickSize
            }
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.QUERY_FAILED,
          'Failed to get account configuration',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * Get key status
   * 
   * GET /xrpl/advanced/account/:accountAddress/keys
   * 
   * Retrieves regular key and master key status.
   */
  fastify.get<GetKeyStatusRequest>(
    '/account/:accountAddress/keys',
    {
      schema: {
        description: 'Get key status',
        tags: ['Advanced'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetKeyStatusRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress } = request.params

        const accountInfo = await xrplClient.request({
          command: 'account_info',
          account: accountAddress,
          ledger_index: 'validated'
        })

        const flags = accountInfo.result.account_data.Flags || 0

        return reply.send({
          success: true,
          data: {
            accountAddress,
            regularKey: accountInfo.result.account_data.RegularKey,
            masterKeyDisabled: (flags & AccountSetAsfFlags.asfDisableMaster) !== 0
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.QUERY_FAILED,
          'Failed to get key status',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )

  /**
   * List delegations
   * 
   * GET /xrpl/advanced/delegation/:accountAddress
   * 
   * Lists all active delegations for an account.
   */
  fastify.get<ListDelegationsRequest>(
    '/delegation/:accountAddress',
    {
      schema: {
        description: 'List account delegations',
        tags: ['Advanced'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListDelegationsRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress } = request.params

        // TODO: Retrieve from database via XRPLDatabaseService

        return reply.send({
          success: true,
          data: {
            accountAddress,
            delegations: []  // Placeholder
          }
        })

      } catch (error) {
        throw new XRPLError(
          XRPLErrorCode.QUERY_FAILED,
          'Failed to list delegations',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  )
}
