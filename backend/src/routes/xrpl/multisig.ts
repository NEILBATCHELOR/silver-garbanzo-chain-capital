/**
 * XRPL Multi-Signature API Routes
 * 
 * RESTful endpoints for multi-signature account operations
 * Implements signer list management, proposal creation, signing, and execution
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { XRPLMultiSigService } from '@/services/wallet/ripple/security/XRPLMultiSigService'
import { XRPLMultiSigDatabaseService } from '@/services/wallet/ripple/security/XRPLMultiSigDatabaseService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { Wallet, Transaction } from 'xrpl'

// Request/Response Types
interface SetupSignerListRequest {
  Body: {
    signerQuorum: number
    signers: Array<{
      account: string
      weight: number
    }>
    projectId: string
    walletSeed: string
  }
}

interface RemoveSignerListRequest {
  Params: {
    accountAddress: string
  }
  Body: {
    walletSeed: string
  }
}

interface CreateProposalRequest {
  Body: {
    accountAddress: string
    transaction: Transaction
    expiresIn?: number // seconds
    projectId: string
  }
}

interface SignProposalRequest {
  Params: {
    proposalId: string
  }
  Body: {
    signerWalletSeed: string
  }
}

interface ExecuteProposalRequest {
  Params: {
    proposalId: string
  }
}

interface GetSignerListRequest {
  Params: {
    accountAddress: string
  }
}

interface ListProposalsRequest {
  Querystring: {
    page?: number
    limit?: number
    accountAddress?: string
    status?: string
    projectId?: string
  }
}

export async function multiSigRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const multiSigService = new XRPLMultiSigService(xrplClient)
  const databaseService = new XRPLMultiSigDatabaseService()
  const wsService = getXRPLWebSocketService()

  /**
   * POST /multisig/signer-list
   * Setup signer list for multi-signature account
   */
  fastify.post<SetupSignerListRequest>(
    '/multisig/signer-list',
    {
      schema: {
        description: 'Setup signer list for multi-signature account',
        tags: ['MultiSig'],
        body: {
          type: 'object',
          required: ['signerQuorum', 'signers', 'projectId', 'walletSeed'],
          properties: {
            signerQuorum: { type: 'number', minimum: 1 },
            signers: {
              type: 'array',
              minItems: 1,
              maxItems: 32,
              items: {
                type: 'object',
                properties: {
                  account: { type: 'string' },
                  weight: { type: 'number', minimum: 1 }
                }
              }
            },
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<SetupSignerListRequest>, reply: FastifyReply) => {
      try {
        const { signerQuorum, signers, projectId, walletSeed } = request.body

        // Validate signers
        for (const signer of signers) {
          XRPLErrorHandler.validateAddress(signer.account)
        }

        // Check quorum is achievable
        const totalWeight = signers.reduce((sum, s) => sum + s.weight, 0)
        if (signerQuorum > totalWeight) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_INVALID_QUORUM,
            `Signer quorum (${signerQuorum}) exceeds total weight (${totalWeight})`
          )
        }

        const wallet = Wallet.fromSeed(walletSeed)

        // Setup signer list on blockchain
        const result = await multiSigService.setSignerList({
          wallet,
          signerQuorum,
          signers
        })

        // Save to database
        const accountId = await databaseService.saveMultiSigAccount({
          projectId,
          accountAddress: wallet.address,
          signerQuorum,
          setupTransactionHash: result.transactionHash
        })

        // Save signers
        for (const signer of signers) {
          await databaseService.saveSigner({
            multiSigAccountId: accountId,
            signerAddress: signer.account,
            signerWeight: signer.weight
          })
        }

        // Broadcast event
        wsService.emitToAll(XRPLEventType.MULTISIG_SIGNER_LIST_CREATED, {
          accountAddress: wallet.address,
          signerQuorum,
          signersCount: signers.length,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            accountAddress: wallet.address,
            signerQuorum,
            signers,
            transactionHash: result.transactionHash,
            signerListSequence: result.signerListSequence
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /multisig/signer-list/:accountAddress
   * Remove signer list (restore regular signing)
   */
  fastify.delete<RemoveSignerListRequest>(
    '/multisig/signer-list/:accountAddress',
    {
      schema: {
        description: 'Remove signer list and restore regular signing',
        tags: ['MultiSig'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' }
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
    async (request: FastifyRequest<RemoveSignerListRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress } = request.params
        const { walletSeed } = request.body

        XRPLErrorHandler.validateAddress(accountAddress)

        const wallet = Wallet.fromSeed(walletSeed)

        if (wallet.address !== accountAddress) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_UNAUTHORIZED,
            'Wallet does not match account address'
          )
        }

        // Remove signer list
        const result = await multiSigService.removeSignerList(wallet)

        // Update database
        await databaseService.deactivateMultiSigAccount(accountAddress)

        // Broadcast event
        wsService.emitToAll(XRPLEventType.MULTISIG_SIGNER_LIST_REMOVED, {
          accountAddress,
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
   * POST /multisig/proposals
   * Create a new multi-sig transaction proposal
   */
  fastify.post<CreateProposalRequest>(
    '/multisig/proposals',
    {
      schema: {
        description: 'Create a new multi-sig transaction proposal',
        tags: ['MultiSig'],
        body: {
          type: 'object',
          required: ['accountAddress', 'transaction', 'projectId'],
          properties: {
            accountAddress: { type: 'string' },
            transaction: { type: 'object' },
            expiresIn: { type: 'number', minimum: 60, maximum: 2592000 }, // 1 min to 30 days
            projectId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest<CreateProposalRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress, transaction, expiresIn = 86400, projectId } = request.body

        XRPLErrorHandler.validateAddress(accountAddress)

        // Get multi-sig account from database
        const account = await databaseService.getMultiSigAccount(accountAddress)
        if (!account) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_ACCOUNT_NOT_FOUND,
            `Multi-sig account not found: ${accountAddress}`
          )
        }

        // Create proposal in database
        const proposalId = await databaseService.createProposal({
          multiSigAccountId: account.id,
          transactionBlob: JSON.stringify(transaction),
          transactionType: transaction.TransactionType,
          requiredWeight: account.signerQuorum,
          expiresAt: new Date(Date.now() + expiresIn * 1000)
        })

        // Broadcast event
        wsService.emitToAll(XRPLEventType.MULTISIG_PROPOSAL_CREATED, {
          proposalId,
          accountAddress,
          transactionType: transaction.TransactionType,
          requiredWeight: account.signerQuorum,
          expiresAt: new Date(Date.now() + expiresIn * 1000)
        })

        return reply.send({
          success: true,
          data: {
            proposalId,
            accountAddress,
            transactionType: transaction.TransactionType,
            requiredWeight: account.signerQuorum,
            currentWeight: 0,
            expiresAt: new Date(Date.now() + expiresIn * 1000)
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /multisig/proposals/:proposalId/sign
   * Sign a multi-sig proposal
   */
  fastify.post<SignProposalRequest>(
    '/multisig/proposals/:proposalId/sign',
    {
      schema: {
        description: 'Sign a multi-sig proposal',
        tags: ['MultiSig'],
        params: {
          type: 'object',
          properties: {
            proposalId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['signerWalletSeed'],
          properties: {
            signerWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<SignProposalRequest>, reply: FastifyReply) => {
      try {
        const { proposalId } = request.params
        const { signerWalletSeed } = request.body

        // Get proposal
        const proposal = await databaseService.getProposal(proposalId)
        if (!proposal) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_PROPOSAL_NOT_FOUND,
            `Proposal not found: ${proposalId}`
          )
        }

        // Check if already signed
        const existingSignature = await databaseService.getSignature(proposalId, Wallet.fromSeed(signerWalletSeed).address)
        if (existingSignature) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_ALREADY_SIGNED,
            'Signer has already signed this proposal'
          )
        }

        // Get signer info
        const signer = await databaseService.getSigner(proposal.multiSigAccountId, Wallet.fromSeed(signerWalletSeed).address)
        if (!signer) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_INVALID_SIGNER,
            'Address is not a valid signer for this account'
          )
        }

        const transaction = JSON.parse(proposal.transactionBlob) as Transaction
        const signerWallet = Wallet.fromSeed(signerWalletSeed)

        // Sign transaction - returns tx_blob string
        const signatureBlob = multiSigService.signForMultiSig(transaction, signerWallet)

        // Save signature
        await databaseService.saveSignature({
          proposalId,
          signerAddress: signerWallet.address,
          signature: signatureBlob,
          publicKey: signerWallet.publicKey
        })

        // Update proposal weight
        await databaseService.updateProposalWeight(proposalId, signer.signerWeight)

        // Get updated proposal to check quorum
        const updatedProposal = await databaseService.getProposal(proposalId)
        const newWeight = updatedProposal?.currentWeight || 0
        const quorumMet = newWeight >= proposal.requiredWeight

        // Broadcast event
        wsService.emitToAll(XRPLEventType.MULTISIG_PROPOSAL_SIGNED, {
          proposalId,
          signerAddress: signerWallet.address,
          signerWeight: signer.signerWeight,
          currentWeight: newWeight,
          requiredWeight: proposal.requiredWeight,
          quorumMet
        })

        return reply.send({
          success: true,
          data: {
            proposalId,
            signerAddress: signerWallet.address,
            currentWeight: newWeight,
            requiredWeight: proposal.requiredWeight,
            quorumMet,
            signature: signatureBlob
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /multisig/proposals/:proposalId/execute
   * Execute a multi-sig proposal (after quorum reached)
   */
  fastify.post<ExecuteProposalRequest>(
    '/multisig/proposals/:proposalId/execute',
    {
      schema: {
        description: 'Execute a multi-sig proposal',
        tags: ['MultiSig'],
        params: {
          type: 'object',
          properties: {
            proposalId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ExecuteProposalRequest>, reply: FastifyReply) => {
      try {
        const { proposalId } = request.params

        // Get proposal with signatures
        const proposal = await databaseService.getProposalWithSignatures(proposalId)
        if (!proposal) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_PROPOSAL_NOT_FOUND,
            `Proposal not found: ${proposalId}`
          )
        }

        // Check quorum
        if (proposal.proposal.currentWeight < proposal.proposal.requiredWeight) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_QUORUM_NOT_MET,
            `Quorum not met. Current: ${proposal.proposal.currentWeight}, Required: ${proposal.proposal.requiredWeight}`
          )
        }

        // Check expiration
        if (proposal.proposal.expiresAt && new Date() > proposal.proposal.expiresAt) {
          throw new XRPLError(
            XRPLErrorCode.MULTISIG_PROPOSAL_EXPIRED,
            'Proposal has expired'
          )
        }

        // Get signature blobs from all signers
        const signatureBlobs = proposal.signatures.map(sig => sig.signature)

        // Combine signatures into multi-signed transaction
        const multiSignedTxBlob = multiSigService.combineSignatures(signatureBlobs)

        // Submit multi-signed transaction
        const result = await multiSigService.submitMultiSigned(multiSignedTxBlob)

        if (!result.success) {
          throw new Error(`Transaction submission failed: ${result.error}`)
        }

        // Update proposal status
        await databaseService.updateProposalStatus(proposalId, 'executed', result.transactionHash)

        // Broadcast event
        wsService.emitToAll(XRPLEventType.MULTISIG_PROPOSAL_EXECUTED, {
          proposalId,
          transactionHash: result.transactionHash,
          transactionType: proposal.proposal.transactionType
        })

        return reply.send({
          success: true,
          data: {
            transactionHash: result.transactionHash,
            proposalId,
            executedAt: new Date()
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /multisig/accounts/:accountAddress/signer-list
   * Get signer list for an account
   */
  fastify.get<GetSignerListRequest>(
    '/multisig/accounts/:accountAddress/signer-list',
    {
      schema: {
        description: 'Get signer list for a multi-sig account',
        tags: ['MultiSig'],
        params: {
          type: 'object',
          properties: {
            accountAddress: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<GetSignerListRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress } = request.params

        XRPLErrorHandler.validateAddress(accountAddress)

        // Get from blockchain
        const signerList = await multiSigService.getSignerList(accountAddress)

        return reply.send({
          success: true,
          data: {
            accountAddress,
            signerQuorum: signerList.signerQuorum,
            signers: signerList.signers,
            totalWeight: signerList.signers.reduce((sum: number, s: { weight: number }) => sum + s.weight, 0)
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /multisig/proposals
   * List proposals with pagination and filters
   */
  fastify.get<ListProposalsRequest>(
    '/multisig/proposals',
    {
      schema: {
        description: 'List multi-sig proposals',
        tags: ['MultiSig'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            accountAddress: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'executed', 'expired', 'cancelled'] },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListProposalsRequest>, reply: FastifyReply) => {
      try {
        const { page = 1, limit = 20, accountAddress, status } = request.query

        const offset = (page - 1) * limit
        const proposals = await databaseService.listProposals({
          offset,
          limit,
          accountAddress,
          status
        })

        return reply.send({
          success: true,
          data: {
            proposals,
            pagination: {
              page,
              limit,
              total: proposals.length,
              hasMore: proposals.length === limit
            }
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )
}
