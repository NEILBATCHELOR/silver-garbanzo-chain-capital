/**
 * XRPL Identity API Routes
 * 
 * RESTful endpoints for Decentralized Identifiers (DID) and Verifiable Credentials
 * Implements XLS-40 DID standard and XLS-70 Credentials standard
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { XRPLDIDService } from '@/services/wallet/ripple/identity/XRPLDIDService'
import { XRPLCredentialService } from '@/services/wallet/ripple/identity/XRPLCredentialService'
import { XRPLCredentialVerificationService } from '@/services/wallet/ripple/identity/XRPLCredentialVerificationService'
import { XRPLIdentityDatabaseService } from '@/services/wallet/ripple/identity/XRPLIdentityDatabaseService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService } from '@/services/xrpl/websocket-service'
import { Wallet } from 'xrpl'
import type { DIDDocument } from '@/services/wallet/ripple/identity/XRPLDIDService'

// Request/Response Types
interface CreateDIDRequest {
  Body: {
    publicKey: string
    serviceEndpoints?: Array<{
      type: string
      endpoint: string
    }>
    uri?: string
    data?: string
    projectId: string
    walletSeed: string
  }
}

interface UpdateDIDRequest {
  Params: {
    did: string
  }
  Body: {
    didDocument?: DIDDocument
    uri?: string
    data?: string
    walletSeed: string
  }
}

interface DeleteDIDRequest {
  Params: {
    did: string
  }
  Body: {
    walletSeed: string
  }
}

interface ResolveDIDRequest {
  Params: {
    did: string
  }
}

interface IssueCredentialRequest {
  Body: {
    subject: string
    credentialType: string
    claims: Record<string, any>
    expirationDays?: number
    projectId: string
    issuerWalletSeed: string
  }
}

interface AcceptCredentialRequest {
  Params: {
    credentialId: string
  }
  Body: {
    subjectWalletSeed: string
  }
}

interface VerifyCredentialRequest {
  Params: {
    credentialId: string
  }
}

interface RevokeCredentialRequest {
  Params: {
    credentialId: string
  }
  Body: {
    issuerWalletSeed: string
  }
}

interface ListCredentialsRequest {
  Querystring: {
    page?: number
    limit?: number
    issuer?: string
    subject?: string
    credentialType?: string
    status?: string
    projectId?: string
  }
}

export async function identityRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const didService = new XRPLDIDService(xrplClient)
  const credentialService = new XRPLCredentialService(xrplClient)
  const verificationService = new XRPLCredentialVerificationService(xrplClient)
  const databaseService = new XRPLIdentityDatabaseService()
  const wsService = getXRPLWebSocketService()

  /**
   * POST /identity/did
   * Create a new Decentralized Identifier
   */
  fastify.post<CreateDIDRequest>(
    '/identity/did',
    {
      schema: {
        description: 'Create a new Decentralized Identifier (DID)',
        tags: ['Identity'],
        body: {
          type: 'object',
          required: ['publicKey', 'projectId', 'walletSeed'],
          properties: {
            publicKey: { type: 'string' },
            serviceEndpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  endpoint: { type: 'string' }
                }
              }
            },
            uri: { type: 'string' },
            data: { type: 'string' },
            projectId: { type: 'string', format: 'uuid' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<CreateDIDRequest>, reply: FastifyReply) => {
      try {
        const { publicKey, serviceEndpoints, uri, data, projectId, walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Generate DID document
        const didDocument = didService.generateDIDDocument(
          wallet.address,
          publicKey,
          serviceEndpoints
        )

        // Set DID on blockchain
        const result = await didService.setDID({
          wallet,
          didDocument,
          uri,
          data
        })

        // Save to database
        await databaseService.saveDID({
          projectId,
          did: result.did,
          accountAddress: wallet.address,
          didDocument,
          uri,
          data,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            did: result.did,
            didDocument,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * PUT /identity/did/:did
   * Update an existing DID
   */
  fastify.put<UpdateDIDRequest>(
    '/identity/did/:did',
    {
      schema: {
        description: 'Update an existing DID',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            did: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['walletSeed'],
          properties: {
            didDocument: { type: 'object' },
            uri: { type: 'string' },
            data: { type: 'string' },
            walletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<UpdateDIDRequest>, reply: FastifyReply) => {
      try {
        const { did } = request.params
        const { didDocument, uri, data, walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Verify ownership
        const address = did.split(':').pop()
        if (wallet.address !== address) {
          throw new XRPLError(
            XRPLErrorCode.DID_UNAUTHORIZED,
            'Wallet does not own this DID'
          )
        }

        // Update DID
        const result = await didService.setDID({
          wallet,
          didDocument: didDocument!,
          uri,
          data
        })

        // Update database
        await databaseService.updateDID({
          did,
          didDocument,
          uri,
          data,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            did,
            transactionHash: result.transactionHash
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /identity/did/:did
   * Delete a DID
   */
  fastify.delete<DeleteDIDRequest>(
    '/identity/did/:did',
    {
      schema: {
        description: 'Delete a DID',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            did: { type: 'string' }
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
    async (request: FastifyRequest<DeleteDIDRequest>, reply: FastifyReply) => {
      try {
        const { did } = request.params
        const { walletSeed } = request.body

        const wallet = Wallet.fromSeed(walletSeed)

        // Verify ownership
        const address = did.split(':').pop()
        if (wallet.address !== address) {
          throw new XRPLError(
            XRPLErrorCode.DID_UNAUTHORIZED,
            'Wallet does not own this DID'
          )
        }

        // Delete DID
        const result = await didService.deleteDID(wallet)

        // Update database
        await databaseService.deleteDID(did, result.transactionHash)

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
   * GET /identity/did/:did
   * Resolve a DID to its document
   */
  fastify.get<ResolveDIDRequest>(
    '/identity/did/:did',
    {
      schema: {
        description: 'Resolve a DID to its document',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            did: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ResolveDIDRequest>, reply: FastifyReply) => {
      try {
        const { did } = request.params

        // Resolve from blockchain
        const didDocument = await didService.resolveDID(did)

        // Verify DID
        const verification = await didService.verifyDID(did)

        return reply.send({
          success: true,
          data: {
            did,
            didDocument,
            isValid: verification.isValid,
            verifiedAt: new Date()
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /identity/credentials
   * Issue a verifiable credential
   */
  fastify.post<IssueCredentialRequest>(
    '/identity/credentials',
    {
      schema: {
        description: 'Issue a verifiable credential',
        tags: ['Identity'],
        body: {
          type: 'object',
          required: ['subject', 'credentialType', 'claims', 'projectId', 'issuerWalletSeed'],
          properties: {
            subject: { type: 'string' },
            credentialType: { type: 'string' },
            claims: { type: 'object' },
            expirationDays: { type: 'number', minimum: 1, maximum: 3650 },
            projectId: { type: 'string', format: 'uuid' },
            issuerWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<IssueCredentialRequest>, reply: FastifyReply) => {
      try {
        const { subject, credentialType, claims, expirationDays, projectId, issuerWalletSeed } = request.body

        XRPLErrorHandler.validateAddress(subject)

        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Calculate expiration
        const expiration = expirationDays
          ? Math.floor(Date.now() / 1000) + (expirationDays * 86400)
          : undefined

        // Issue credential on blockchain
        const result = await credentialService.issueCredential({
          wallet: issuerWallet,
          subject,
          credentialType,
          credentialData: claims
        })

        // Save to database
        await databaseService.saveCredential({
          projectId,
          credentialId: result.credentialId,
          issuerAddress: issuerWallet.address,
          subjectAddress: subject,
          credentialType,
          credentialData: claims,
          expiration: expiration ? new Date(expiration * 1000) : undefined,
          transactionHash: result.transactionHash
        })

        return reply.send({
          success: true,
          data: {
            credentialId: result.credentialId,
            issuer: issuerWallet.address,
            subject,
            credentialType,
            transactionHash: result.transactionHash,
            status: 'pending'
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /identity/credentials/:credentialId/accept
   * Accept a credential
   */
  fastify.post<AcceptCredentialRequest>(
    '/identity/credentials/:credentialId/accept',
    {
      schema: {
        description: 'Accept a verifiable credential',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            credentialId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['subjectWalletSeed'],
          properties: {
            subjectWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<AcceptCredentialRequest>, reply: FastifyReply) => {
      try {
        const { credentialId } = request.params
        const { subjectWalletSeed } = request.body

        const subjectWallet = Wallet.fromSeed(subjectWalletSeed)

        // Get credential details from database
        const credentialDetails = await databaseService.getCredential(credentialId)
        if (!credentialDetails) {
          throw new XRPLError(
            XRPLErrorCode.CREDENTIAL_NOT_FOUND,
            `Credential ${credentialId} not found`
          )
        }

        // Accept credential
        const result = await credentialService.acceptCredential({
          wallet: subjectWallet,
          issuer: credentialDetails.issuerAddress,
          credentialType: credentialDetails.credentialType
        })

        // Update database
        await databaseService.acceptCredential(credentialId, result.transactionHash)

        return reply.send({
          success: true,
          data: {
            credentialId,
            transactionHash: result.transactionHash,
            status: 'active'
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * POST /identity/credentials/:credentialId/verify
   * Verify a credential
   */
  fastify.post<VerifyCredentialRequest>(
    '/identity/credentials/:credentialId/verify',
    {
      schema: {
        description: 'Verify a credential',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            credentialId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<VerifyCredentialRequest>, reply: FastifyReply) => {
      try {
        const { credentialId } = request.params

        // Verify credential
        const verification = await verificationService.verifyCredential(credentialId)

        return reply.send({
          success: true,
          data: verification
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * DELETE /identity/credentials/:credentialId
   * Revoke a credential
   */
  fastify.delete<RevokeCredentialRequest>(
    '/identity/credentials/:credentialId',
    {
      schema: {
        description: 'Revoke a credential',
        tags: ['Identity'],
        params: {
          type: 'object',
          properties: {
            credentialId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['issuerWalletSeed'],
          properties: {
            issuerWalletSeed: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<RevokeCredentialRequest>, reply: FastifyReply) => {
      try {
        const { credentialId } = request.params
        const { issuerWalletSeed } = request.body

        const issuerWallet = Wallet.fromSeed(issuerWalletSeed)

        // Get credential details from database
        const credentialDetails = await databaseService.getCredential(credentialId)
        if (!credentialDetails) {
          throw new XRPLError(
            XRPLErrorCode.CREDENTIAL_NOT_FOUND,
            `Credential ${credentialId} not found`
          )
        }

        // Revoke credential
        const result = await credentialService.revokeCredential({
          wallet: issuerWallet,
          subject: credentialDetails.subjectAddress,
          credentialType: credentialDetails.credentialType
        })

        // Update database
        await databaseService.revokeCredential(credentialId, result.transactionHash)

        return reply.send({
          success: true,
          data: {
            credentialId,
            transactionHash: result.transactionHash,
            status: 'revoked'
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * GET /identity/credentials
   * List credentials with pagination and filters
   */
  fastify.get<ListCredentialsRequest>(
    '/identity/credentials',
    {
      schema: {
        description: 'List credentials',
        tags: ['Identity'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            issuer: { type: 'string' },
            subject: { type: 'string' },
            credentialType: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'active', 'revoked', 'expired'] },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<ListCredentialsRequest>, reply: FastifyReply) => {
      try {
        const { page = 1, limit = 20, issuer, subject, credentialType, status } = request.query

        const credentials = await databaseService.listCredentials({
          subjectAddress: subject,
          issuerAddress: issuer,
          status: status ? [status] : undefined
        })

        return reply.send({
          success: true,
          data: {
            credentials,
            pagination: {
              page,
              limit,
              total: credentials.length,
              totalPages: Math.ceil(credentials.length / limit)
            }
          }
        })
      } catch (error) {
        XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )
}
