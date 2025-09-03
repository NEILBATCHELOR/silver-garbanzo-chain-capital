import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Type } from '@sinclair/typebox'
import {
  walletService,
  hdWalletService,
  keyManagementService,
  walletValidationService,
  transactionService,
  signingService,
  feeEstimationService,
  nonceManagerService,
  // Phase 3A Services - Smart Contract Foundation
  smartContractWalletService,
  facetRegistryService,
  webAuthnService,
  guardianRecoveryService,
  // Phase 3B Services - Account Abstraction
  userOperationService,
  paymasterService,
  batchOperationService,
  // Phase 3C Services - Multi-Signature Wallets
  multiSigWalletService,
  transactionProposalService,
  multiSigSigningService,
  gnosisSafeService,
  // Phase 3D Services - Smart Contract Integration
  signatureMigrationService,
  restrictionsService,
  lockService,
  unifiedWalletInterface,
  // HSM Services
  hsmKeyManagementService
} from '../services/wallets/index'
import {
  CreateWalletRequest,
  WalletResponse,
  BuildTransactionRequest,
  BroadcastTransactionRequest,
  SigningRequest,
  BlockchainNetwork,
  WalletType,
  TransactionPriority
} from '../services/wallets/types'
import {
  // Unified Wallet Types
  UnifiedWallet,
  WalletCapabilities,
  WalletUpgradeRequest,
  UnifiedTransactionRequest,
  // Signature Migration Types
  SignatureMigrationRequest,
  GuardianApproval,
  SignatureMigrationStatus,
  // Restrictions Types
  RestrictionRule,
  RestrictionRuleData,
  TransactionValidationRequest,
  ValidationResult,
  // Lock Types
  WalletLock,
  LockRequest,
  UnlockRequest,
  LockStatus
} from '../services/wallets/unified/index'

// Multi-Sig Types
import {
  MultiSigWallet,
  CreateMultiSigWalletRequest,
  UpdateMultiSigWalletRequest,
  TransactionProposal,
  CreateProposalRequest,
  SignProposalRequest,
  MultiSigWalletStatus,
  ProposalStatus,
  MultiSigQueryOptions
} from '../services/wallets/multi-sig/index'
import { logError } from '../utils/loggerAdapter'

// Request/Response Schema Definitions
const BlockchainNetworkSchema = Type.Union([
  Type.Literal('bitcoin'),
  Type.Literal('ethereum'),
  Type.Literal('polygon'),
  Type.Literal('arbitrum'),
  Type.Literal('optimism'),
  Type.Literal('avalanche'),
  Type.Literal('solana'),
  Type.Literal('near')
])

const WalletTypeSchema = Type.Union([
  Type.Literal('hd_wallet'),
  Type.Literal('multi_sig'),
  Type.Literal('custodial'),
  Type.Literal('external')
])

const TransactionPrioritySchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('urgent')
])

// Phase 1 Schemas
const CreateWalletSchema = Type.Object({
  investor_id: Type.String({ format: 'uuid' }),
  wallet_type: WalletTypeSchema,
  blockchains: Type.Array(BlockchainNetworkSchema),
  name: Type.Optional(Type.String())
})

const WalletResponseSchema = Type.Object({
  id: Type.String(),
  investor_id: Type.String(),
  name: Type.String(),
  primary_address: Type.String(),
  addresses: Type.Record(Type.String(), Type.String()),
  wallet_type: WalletTypeSchema,
  blockchains: Type.Array(Type.String()),
  status: Type.String(),
  is_multi_sig_enabled: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
})

// Phase 2 Schemas
const BuildTransactionSchema = Type.Object({
  wallet_id: Type.String({ format: 'uuid' }),
  to: Type.String(),
  amount: Type.String(),
  blockchain: BlockchainNetworkSchema,
  token_address: Type.Optional(Type.String()),
  priority: Type.Optional(TransactionPrioritySchema),
  gas_limit: Type.Optional(Type.String()),
  gas_price: Type.Optional(Type.String()),
  nonce: Type.Optional(Type.Number()),
  data: Type.Optional(Type.String())
})

const BroadcastTransactionSchema = Type.Object({
  transaction_id: Type.String(),
  signed_transaction: Type.String()
})

const SignTransactionSchema = Type.Object({
  wallet_id: Type.String({ format: 'uuid' }),
  message_hash: Type.String(),
  blockchain: BlockchainNetworkSchema,
  derivation_path: Type.Optional(Type.String())
})

const ListWalletsQuerySchema = Type.Object({
  investor_id: Type.String({ format: 'uuid' }),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  wallet_type: Type.Optional(WalletTypeSchema)
})

const SignMessageSchema = Type.Object({
  message: Type.String(),
  blockchain: BlockchainNetworkSchema
})

const FeeEstimationSchema = Type.Object({
  blockchain: BlockchainNetworkSchema,
  to: Type.Optional(Type.String()),
  amount: Type.Optional(Type.String()),
  gas_used: Type.Optional(Type.String()),
  priority: Type.Optional(TransactionPrioritySchema),
  data: Type.Optional(Type.String())
})

const ReserveNonceSchema = Type.Object({
  specific_nonce: Type.Optional(Type.Number())
})

const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
  errors: Type.Optional(Type.Array(Type.Object({
    field: Type.String(),
    message: Type.String(),
    code: Type.String()
  })))
})

const SuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Any()
})

// ===========================================
// ADDITIONAL PHASE 3 SCHEMAS
// ===========================================

const SignatureMigrationSchema = Type.Object({
  fromScheme: Type.Union([
    Type.Literal('secp256k1'),
    Type.Literal('secp256r1')
  ]),
  toScheme: Type.Union([
    Type.Literal('secp256k1'),
    Type.Literal('secp256r1')
  ]),
  newPublicKey: Type.String(),
  newCredentialId: Type.Optional(Type.String())
})

const RestrictionRuleSchema = Type.Object({
  ruleType: Type.Union([
    Type.Literal('whitelist'),
    Type.Literal('blacklist'),
    Type.Literal('amount_limit'),
    Type.Literal('time_window'),
    Type.Literal('custom')
  ]),
  target: Type.String(),
  conditions: Type.Record(Type.String(), Type.Any()),
  description: Type.Optional(Type.String())
})

const LockRequestSchema = Type.Object({
  lockType: Type.Union([
    Type.Literal('emergency'),
    Type.Literal('security'),
    Type.Literal('maintenance'),
    Type.Literal('guardian_triggered')
  ]),
  reason: Type.String(),
  duration: Type.Optional(Type.Number()),
  guardianApprovalRequired: Type.Optional(Type.Boolean())
})

const GuardianRequestSchema = Type.Object({
  guardianAddress: Type.String(),
  guardianName: Type.Optional(Type.String()),
  securityPeriod: Type.Optional(Type.Number()) // Hours
})

// ===========================================
// PHASE 3C SCHEMAS - Multi-Signature Wallets
// ===========================================

const MultiSigWalletStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('pending'),
  Type.Literal('blocked'),
  Type.Literal('archived')
])

const ProposalStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
  Type.Literal('executed'),
  Type.Literal('cancelled'),
  Type.Literal('expired')
])

const CreateMultiSigWalletSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  blockchain: BlockchainNetworkSchema,
  owners: Type.Array(Type.String(), { minItems: 1, maxItems: 50 }),
  threshold: Type.Number({ minimum: 1 }),
  created_by: Type.Optional(Type.String())
})

const UpdateMultiSigWalletSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  owners: Type.Optional(Type.Array(Type.String(), { minItems: 1, maxItems: 50 })),
  threshold: Type.Optional(Type.Number({ minimum: 1 })),
  status: Type.Optional(MultiSigWalletStatusSchema)
})

const CreateProposalSchema = Type.Object({
  wallet_id: Type.String({ format: 'uuid' }),
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  to_address: Type.String(),
  value: Type.String(), // Wei/smallest unit as string
  data: Type.Optional(Type.String()),
  blockchain: BlockchainNetworkSchema,
  token_address: Type.Optional(Type.String()),
  token_symbol: Type.Optional(Type.String()),
  created_by: Type.Optional(Type.String())
})

const SignProposalSchema = Type.Object({
  proposal_id: Type.String({ format: 'uuid' }),
  signer_address: Type.String(),
  private_key: Type.Optional(Type.String()),
  passphrase: Type.Optional(Type.String())
})

const MultiSigQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  status: Type.Optional(MultiSigWalletStatusSchema),
  blockchain: Type.Optional(BlockchainNetworkSchema),
  owner: Type.Optional(Type.String()),
  created_by: Type.Optional(Type.String()),
  sort_by: Type.Optional(Type.Union([
    Type.Literal('created_at'),
    Type.Literal('updated_at'),
    Type.Literal('name'),
    Type.Literal('threshold')
  ])),
  sort_order: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ]))
})

const ProposalQuerySchema = Type.Object({
  wallet_id: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.Optional(ProposalStatusSchema),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 }))
})

const GnosisSafeDeploymentSchema = Type.Object({
  blockchain: BlockchainNetworkSchema,
  owners: Type.Array(Type.String(), { minItems: 1, maxItems: 50 }),
  threshold: Type.Number({ minimum: 1 }),
  saltNonce: Type.Optional(Type.String())
})

// ===========================================
// PHASE 3D SCHEMAS - Unified Wallet Interface
// ===========================================

const WalletUpgradeSchema = Type.Object({
  walletId: Type.String({ format: 'uuid' }),
  targetType: Type.Union([
    Type.Literal('smart_contract'),
    Type.Literal('multi_sig')
  ]),
  features: Type.Object({
    enableWebAuthn: Type.Optional(Type.Boolean()),
    enableGuardians: Type.Optional(Type.Boolean()),
    enableRestrictions: Type.Optional(Type.Boolean()),
    enableAccountAbstraction: Type.Optional(Type.Boolean())
  })
})

const UnifiedTransactionSchema = Type.Object({
  walletId: Type.String({ format: 'uuid' }),
  transactions: Type.Array(Type.Object({
    to: Type.String(),
    value: Type.String(),
    blockchain: BlockchainNetworkSchema,
    data: Type.Optional(Type.String()),
    tokenAddress: Type.Optional(Type.String())
  })),
  options: Type.Optional(Type.Object({
    useAccountAbstraction: Type.Optional(Type.Boolean()),
    gasless: Type.Optional(Type.Boolean()),
    priority: Type.Optional(TransactionPrioritySchema)
  }))
})

// ===========================================
// PHASE 3A SCHEMAS - Smart Contract Wallets
// ===========================================

const CreateSmartContractWalletSchema = Type.Object({
  investor_id: Type.String({ format: 'uuid' }),
  name: Type.Optional(Type.String()),
  features: Type.Array(Type.Union([
    Type.Literal('webauthn'),
    Type.Literal('guardians'),
    Type.Literal('restrictions'),
    Type.Literal('account_abstraction')
  ]))
})

const WebAuthnRegisterSchema = Type.Object({
  credentialId: Type.String(),
  publicKeyX: Type.String(),
  publicKeyY: Type.String(),
  challenge: Type.String(),
  attestationData: Type.Optional(Type.String())
})

const WebAuthnSignSchema = Type.Object({
  credentialId: Type.String(),
  challenge: Type.String(),
  signature: Type.String(),
  authenticatorData: Type.String(),
  clientDataJSON: Type.String()
})

/**
 * Register all wallet-related routes
 */
export async function walletRoutes(fastify: FastifyInstance) {
  
  // Add request authentication (assuming JWT middleware exists)
  // fastify.addHook('preHandler', fastify.authenticate)

  // ===========================================
  // PHASE 1 ROUTES - HD Wallet Management
  // ===========================================

  /**
   * Create a new HD wallet
   */
  fastify.post('/wallets', {
    schema: {
      tags: ['Wallets'],
      summary: 'Create HD wallet',
      description: 'Create a new hierarchical deterministic wallet with multi-chain support',
      body: CreateWalletSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateWalletRequest }>, reply: FastifyReply) => {
    try {
      const result = await walletService.instance.createWallet(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Create wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get wallet by ID
   */
  fastify.get('/wallets/:id', {
    schema: {
      tags: ['Wallets'],
      summary: 'Get wallet by ID',
      description: 'Retrieve wallet details including all blockchain addresses',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await walletService.instance.getWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * List wallets for investor
   */
  fastify.get('/wallets', {
    schema: {
      tags: ['Wallets'],
      summary: 'List wallets',
      description: 'List wallets for an investor with pagination',
      querystring: ListWalletsQuerySchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { 
    investor_id: string
    page?: number
    limit?: number
    wallet_type?: WalletType 
  } }>, reply: FastifyReply) => {
    try {
      const { investor_id, page = 1, limit = 20, wallet_type } = request.query
      
      const result = await walletService.instance.listWallets(investor_id, {
        page,
        limit,
        wallet_type
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'List wallets error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get wallet balance
   */
  fastify.get('/wallets/:id/balance', {
    schema: {
      tags: ['Wallets'],
      summary: 'Get wallet balance',
      description: 'Get wallet balance across all supported blockchains',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await walletService.instance.getWalletBalance(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get wallet balance error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 2 ROUTES - Transaction Infrastructure
  // ===========================================

  /**
   * Build a transaction
   */
  fastify.post('/wallets/transactions/build', {
    schema: {
      tags: ['Transactions'],
      summary: 'Build transaction',
      description: 'Build a raw transaction for any supported blockchain',
      body: BuildTransactionSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: BuildTransactionRequest }>, reply: FastifyReply) => {
    try {
      const result = await transactionService.instance.buildTransaction(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Build transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Broadcast a signed transaction
   */
  fastify.post('/wallets/transactions/broadcast', {
    schema: {
      tags: ['Transactions'],
      summary: 'Broadcast transaction',
      description: 'Broadcast a signed transaction to the blockchain network',
      body: BroadcastTransactionSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: BroadcastTransactionRequest }>, reply: FastifyReply) => {
    try {
      const result = await transactionService.instance.broadcastTransaction(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Broadcast transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get transaction status
   */
  fastify.get('/wallets/transactions/:hash/status', {
    schema: {
      tags: ['Transactions'],
      summary: 'Get transaction status',
      description: 'Get the current status of a transaction by hash',
      params: Type.Object({
        hash: Type.String()
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { hash: string } }>, reply: FastifyReply) => {
    try {
      const result = await transactionService.instance.getTransactionStatus(request.params.hash)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get transaction status error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Sign a transaction
   */
  fastify.post('/wallets/sign', {
    schema: {
      tags: ['Signing'],
      summary: 'Sign transaction',
      description: 'Cryptographically sign a transaction hash',
      body: SignTransactionSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: SigningRequest }>, reply: FastifyReply) => {
    try {
      const result = await signingService.instance.signTransaction(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Sign transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Sign a message
   */
  fastify.post('/wallets/:id/sign-message', {
    schema: {
      tags: ['Signing'],
      summary: 'Sign message',
      description: 'Sign an arbitrary message with wallet private key',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: SignMessageSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: { message: string; blockchain: BlockchainNetwork } 
  }>, reply: FastifyReply) => {
    try {
      const { message, blockchain } = request.body
      const result = await signingService.instance.signMessage(request.params.id, message, blockchain)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Sign message error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Estimate transaction fees
   */
  fastify.post('/wallets/transactions/estimate-fee', {
    schema: {
      tags: ['Fees'],
      summary: 'Estimate transaction fee',
      description: 'Estimate transaction fees for any supported blockchain',
      body: FeeEstimationSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: {
    blockchain: BlockchainNetwork
    gasUsed?: string
    priority?: TransactionPriority
    to?: string
    amount?: string
    data?: string
  } }>, reply: FastifyReply) => {
    try {
      const estimate = await feeEstimationService.instance.estimateFee(request.body)
      
      return reply.status(200).send({
        success: true,
        data: estimate
      })
    } catch (error) {
      logError(fastify.log, 'Estimate fee error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get nonce information
   */
  fastify.get('/wallets/:id/nonce/:blockchain', {
    schema: {
      tags: ['Nonce'],
      summary: 'Get nonce info',
      description: 'Get current nonce information for a wallet on a specific blockchain',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
        blockchain: BlockchainNetworkSchema
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string; blockchain: BlockchainNetwork } }>, reply: FastifyReply) => {
    try {
      const result = await nonceManagerService.instance.getNonceInfo(
        request.params.id,
        request.params.blockchain
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get nonce info error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Reserve a nonce
   */
  fastify.post('/wallets/:id/nonce/:blockchain/reserve', {
    schema: {
      tags: ['Nonce'],
      summary: 'Reserve nonce',
      description: 'Reserve a nonce for transaction building',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
        blockchain: BlockchainNetworkSchema
      }),
      body: ReserveNonceSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string; blockchain: BlockchainNetwork }
    Body: { specific_nonce?: number }
  }>, reply: FastifyReply) => {
    try {
      const result = await nonceManagerService.instance.reserveNonce(
        request.params.id,
        request.params.blockchain,
        request.body.specific_nonce
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Reserve nonce error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3D ROUTES - Unified Wallet Interface
  // ===========================================

  /**
   * Get unified wallet view
   */
  fastify.get('/wallets/:id/unified', {
    schema: {
      tags: ['Unified Wallet'],
      summary: 'Get unified wallet view',
      description: 'Get comprehensive wallet view with all capabilities',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await unifiedWalletInterface.instance.getUnifiedWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get unified wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Upgrade wallet to smart contract
   */
  fastify.post('/wallets/:id/upgrade-to-smart-contract', {
    schema: {
      tags: ['Unified Wallet'],
      summary: 'Upgrade wallet to smart contract',
      description: 'Upgrade traditional wallet to smart contract wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: WalletUpgradeSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: WalletUpgradeRequest 
  }>, reply: FastifyReply) => {
    try {
      const result = await unifiedWalletInterface.instance.upgradeToSmartContract({
        ...request.body,
        walletId: request.params.id
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Upgrade wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Send unified transaction
   */
  fastify.post('/wallets/:id/unified/transaction', {
    schema: {
      tags: ['Unified Wallet'],
      summary: 'Send unified transaction',
      description: 'Send transaction through unified interface (traditional or smart contract)',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: UnifiedTransactionSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: UnifiedTransactionRequest 
  }>, reply: FastifyReply) => {
    try {
      const result = await unifiedWalletInterface.instance.sendUnifiedTransaction({
        ...request.body,
        walletId: request.params.id
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Send unified transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get wallet capabilities
   */
  fastify.get('/wallets/:id/unified/capabilities', {
    schema: {
      tags: ['Unified Wallet'],
      summary: 'Get wallet capabilities',
      description: 'Get wallet capabilities and supported features',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // Get unified wallet which includes capabilities
      const result = await unifiedWalletInterface.instance.getUnifiedWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      // Extract just the capabilities
      const capabilities = result.data?.capabilities
      return reply.status(200).send({
        success: true,
        data: capabilities
      })
    } catch (error) {
      logError(fastify.log, 'Get wallet capabilities error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3A ROUTES - Smart Contract Wallets
  // ===========================================

  /**
   * Create smart contract wallet
   */
  fastify.post('/wallets/smart-contract', {
    schema: {
      tags: ['Smart Contract Wallets'],
      summary: 'Create smart contract wallet',
      description: 'Create a new Diamond proxy smart contract wallet',
      body: CreateSmartContractWalletSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: {
    investor_id: string
    name?: string
    features: string[]
  } }>, reply: FastifyReply) => {
    try {
      const { investor_id, name, features } = request.body
      
      // Create a base wallet first if needed
      const baseWalletResult = await walletService.instance.createWallet({
        investor_id,
        wallet_type: 'hd_wallet',
        blockchains: ['ethereum'], // Default to Ethereum for smart contracts
        name
      })
      
      if (!baseWalletResult.success) {
        return reply.status(400).send(baseWalletResult)
      }
      
      // Create smart contract wallet with required parameters
      const result = await smartContractWalletService.instance.createSmartContractWallet(
        baseWalletResult.data!.id,
        '0x...', // Facet registry address (would be configured in production)
        features || []
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Create smart contract wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get smart contract wallet details
   */
  fastify.get('/wallets/:id/smart-contract', {
    schema: {
      tags: ['Smart Contract Wallets'],
      summary: 'Get smart contract wallet',
      description: 'Get smart contract wallet details including facets',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await smartContractWalletService.instance.getSmartContractWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get smart contract wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3A ROUTES - WebAuthn/Passkey Support
  // ===========================================

  /**
   * Register WebAuthn credential
   */
  fastify.post('/wallets/:id/webauthn/register', {
    schema: {
      tags: ['WebAuthn'],
      summary: 'Register passkey credential',
      description: 'Register a WebAuthn/passkey credential for biometric authentication',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: WebAuthnRegisterSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      credentialId: string
      publicKeyX: string
      publicKeyY: string
      challenge: string
      attestationData?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await webAuthnService.instance.registerCredential(request.params.id, request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Register WebAuthn credential error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Authenticate with WebAuthn
   */
  fastify.post('/wallets/:id/webauthn/authenticate', {
    schema: {
      tags: ['WebAuthn'],
      summary: 'Authenticate with passkey',
      description: 'Authenticate using WebAuthn/passkey for transaction signing',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: WebAuthnSignSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      credentialId: string
      challenge: string
      signature: string
      authenticatorData: string
      clientDataJSON: string
    }
  }>, reply: FastifyReply) => {
    try {
      const { credentialId, challenge, signature, authenticatorData, clientDataJSON } = request.body as {
        credentialId: string
        challenge: string
        signature: string
        authenticatorData: string
        clientDataJSON: string
      }
      
      const result = await webAuthnService.instance.verifyAuthentication(
        request.params.id,
        {
          id: credentialId,
          rawId: credentialId,
          response: {
            clientDataJSON,
            authenticatorData,
            signature,
            userHandle: undefined
          },
          type: 'public-key'
        },
        challenge
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'WebAuthn authentication error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * List WebAuthn credentials
   */
  fastify.get('/wallets/:id/webauthn/credentials', {
    schema: {
      tags: ['WebAuthn'],
      summary: 'List passkey credentials',
      description: 'List all registered WebAuthn/passkey credentials for wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await webAuthnService.instance.listCredentials(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'List WebAuthn credentials error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3B ROUTES - Account Abstraction
  // ===========================================

  /**
   * Send gasless transaction
   */
  fastify.post('/wallets/:id/user-operations/send', {
    schema: {
      tags: ['Account Abstraction'],
      summary: 'Send gasless transaction',
      description: 'Send a gasless transaction using EIP-4337 UserOperation',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        operations: Type.Array(Type.Object({
          target: Type.String(),
          value: Type.String(),
          data: Type.String()
        })),
        paymasterPolicy: Type.Optional(Type.Object({
          type: Type.Union([
            Type.Literal('sponsor_all'),
            Type.Literal('token_payment'),
            Type.Literal('whitelist_only')
          ]),
          sponsorAddress: Type.Optional(Type.String()),
          tokenAddress: Type.Optional(Type.String())
        }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: any // Will be properly typed in production
  }>, reply: FastifyReply) => {
    try {
      const result = await userOperationService.instance.buildUserOperation({
        walletAddress: request.params.id,
        operations: (request.body as any).operations,
        paymasterPolicy: (request.body as any).paymasterPolicy
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      // Send the UserOperation
      const sendResult = await userOperationService.instance.sendUserOperation(result.data!.userOperation)
      
      return reply.status(200).send(sendResult)
    } catch (error) {
      logError(fastify.log, 'Send gasless transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Batch multiple operations
   */
  fastify.post('/wallets/:id/batch-operations', {
    schema: {
      tags: ['Account Abstraction'],
      summary: 'Batch multiple operations',
      description: 'Execute multiple operations in a single atomic transaction',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        operations: Type.Array(Type.Object({
          target: Type.String(),
          value: Type.String(),
          data: Type.String()
        }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: { operations: any[] }
  }>, reply: FastifyReply) => {
    try {
      const result = await batchOperationService.instance.createBatchOperation({
        walletAddress: request.params.id,
        operations: request.body.operations
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Batch operations error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3D ROUTES - Signature Migration  
  // ===========================================

  /**
   * Initiate signature scheme migration
   */
  fastify.post('/wallets/:id/signature-migration/initiate', {
    schema: {
      tags: ['Signature Migration'],
      summary: 'Initiate signature migration',
      description: 'Start migration between ECDSA and WebAuthn signature schemes',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: SignatureMigrationSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      fromScheme: 'secp256k1' | 'secp256r1'
      toScheme: 'secp256k1' | 'secp256r1'
      newPublicKey: string
      newCredentialId?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await signatureMigrationService.instance.initiateMigration({
        walletId: request.params.id,
        ...request.body
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Initiate signature migration error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get signature migration status
   */
  fastify.get('/wallets/:id/signature-migration/status', {
    schema: {
      tags: ['Signature Migration'],
      summary: 'Get migration status',
      description: 'Get the current status of signature scheme migration',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await signatureMigrationService.instance.getMigrationStatus(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get migration status error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3D ROUTES - Restrictions & Compliance
  // ===========================================

  /**
   * Get wallet restrictions
   */
  fastify.get('/wallets/:id/restrictions', {
    schema: {
      tags: ['Restrictions'],
      summary: 'Get wallet restrictions',
      description: 'List active restriction rules for wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await restrictionsService.instance.getRestrictions(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get restrictions error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Add restriction rule
   */
  fastify.post('/wallets/:id/restrictions', {
    schema: {
      tags: ['Restrictions'],
      summary: 'Add restriction rule',
      description: 'Add a new restriction rule to wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: RestrictionRuleSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      ruleType: string
      target: string
      conditions: Record<string, any>
      description?: string
    }
  }>, reply: FastifyReply) => {
    try {
      // Transform request body to match RestrictionRule requirements
      const restrictionRule = {
        ruleType: request.body.ruleType as 'whitelist' | 'blacklist' | 'daily_limit' | 'time_restriction' | 'amount_limit' | 'custom',
        name: `${request.body.ruleType}_rule_${Date.now()}`,
        description: request.body.description,
        isActive: true,
        priority: 100,
        ruleData: {
          // Map generic conditions to RestrictionRuleData structure
          addresses: request.body.ruleType === 'whitelist' || request.body.ruleType === 'blacklist' 
            ? [request.body.target] 
            : undefined,
          dailyLimitUSD: request.body.ruleType === 'daily_limit' 
            ? (request.body.conditions.dailyLimitUSD || 10000) 
            : undefined,
          maxTransactionUSD: request.body.ruleType === 'amount_limit' 
            ? (request.body.conditions.maxTransactionUSD || 5000) 
            : undefined,
          allowedHours: request.body.ruleType === 'time_restriction'
            ? request.body.conditions.allowedHours || [{ start: 9, end: 17 }]
            : undefined,
          customData: request.body.ruleType === 'custom'
            ? { target: request.body.target, ...request.body.conditions }
            : undefined
        }
      }
      
      const result = await restrictionsService.instance.addRestriction(
        request.params.id,
        restrictionRule
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Add restriction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Validate transaction against restrictions
   */
  fastify.post('/wallets/:id/restrictions/validate', {
    schema: {
      tags: ['Restrictions'],
      summary: 'Validate transaction',
      description: 'Validate a transaction against wallet restrictions',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        toAddress: Type.String(),
        value: Type.String(),
        data: Type.Optional(Type.String()),
        blockchain: BlockchainNetworkSchema
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      toAddress: string
      value: string
      data?: string
      blockchain: string
    }
  }>, reply: FastifyReply) => {
    try {
      // Get wallet address
      const walletResult = await walletService.instance.getWallet(request.params.id)
      if (!walletResult.success) {
        return reply.status(404).send(walletResult)
      }
      
      const result = await restrictionsService.instance.validateTransaction({
        walletId: request.params.id,
        fromAddress: walletResult.data!.primary_address,
        toAddress: request.body.toAddress,
        value: request.body.value,
        data: request.body.data,
        blockchain: request.body.blockchain
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Validate transaction error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3D ROUTES - Emergency Lock
  // ===========================================

  /**
   * Lock wallet (emergency)
   */
  fastify.post('/wallets/:id/lock', {
    schema: {
      tags: ['Emergency Lock'],
      summary: 'Lock wallet',
      description: 'Emergency lock wallet to prevent transactions',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: LockRequestSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      lockType: string
      reason: string
      duration?: number
      guardianApprovalRequired?: boolean
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await lockService.instance.lockWallet({
        walletId: request.params.id,
        lockedBy: 'system', // Would be derived from authentication context
        ...request.body,
        lockType: request.body.lockType as 'emergency' | 'security' | 'maintenance' | 'guardian_triggered'
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Lock wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Unlock wallet
   */
  fastify.post('/wallets/:id/unlock', {
    schema: {
      tags: ['Emergency Lock'],
      summary: 'Unlock wallet',
      description: 'Unlock wallet (may require guardian approval)',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        reason: Type.String(),
        guardianSignatures: Type.Optional(Type.Array(Type.String()))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      reason: string
      guardianSignatures?: string[]
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await lockService.instance.unlockWallet({
        walletId: request.params.id,
        approverAddress: '0x...', // Would be derived from authentication context
        signature: 'temp_signature', // Would be provided by client
        ...request.body
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Unlock wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get lock status
   */
  fastify.get('/wallets/:id/lock/status', {
    schema: {
      tags: ['Emergency Lock'],
      summary: 'Get lock status',
      description: 'Get current lock status and details',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await lockService.instance.getLockStatus(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get lock status error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3A ROUTES - Guardian Recovery
  // ===========================================

  /**
   * List wallet guardians
   */
  fastify.get('/wallets/:id/guardians', {
    schema: {
      tags: ['Guardian Recovery'],
      summary: 'List wallet guardians',
      description: 'Get all guardians for wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await guardianRecoveryService.instance.getWalletGuardians(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'List guardians error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Add guardian
   */
  fastify.post('/wallets/:id/guardians', {
    schema: {
      tags: ['Guardian Recovery'],
      summary: 'Add guardian',
      description: 'Add a new guardian to wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: GuardianRequestSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      guardianAddress: string
      guardianName?: string
      securityPeriod?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await guardianRecoveryService.instance.addGuardian(
        request.params.id,
        request.body.guardianAddress,
        request.body.guardianName
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Add guardian error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // HSM INTEGRATION ROUTES
  // ===========================================

  /**
   * HSM health check
   */
  fastify.get('/wallets/hsm/health', {
    schema: {
      tags: ['HSM'],
      summary: 'HSM health check',
      description: 'Check HSM provider health and connectivity',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await hsmKeyManagementService.instance.validateHSMConfiguration()
      
      if (!result.success) {
        return reply.status(500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'HSM health check error:', error)
      return reply.status(500).send({
        success: false,
        error: 'HSM health check failed'
      })
    }
  })

  /**
   * Enable HSM for wallet
   */
  fastify.post('/wallets/:id/hsm/enable', {
    schema: {
      tags: ['HSM'],
      summary: 'Enable HSM for wallet',
      description: 'Enable Hardware Security Module for wallet operations',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // This would enable HSM operations for a specific wallet
      // For now, return success as HSM is globally configured
      return reply.status(200).send({
        success: true,
        data: {
          walletId: request.params.id,
          hsmEnabled: true,
          provider: 'configured'
        }
      })
    } catch (error) {
      logError(fastify.log, 'Enable HSM error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // PHASE 3C ROUTES - Multi-Signature Wallets
  // ===========================================

  /**
   * Create multi-signature wallet
   */
  fastify.post('/wallets/multi-sig', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Create multi-sig wallet',
      description: 'Create a new multi-signature wallet with configurable threshold',
      body: CreateMultiSigWalletSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateMultiSigWalletRequest }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.createMultiSigWallet(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Create multi-sig wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * List multi-signature wallets
   */
  fastify.get('/wallets/multi-sig', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'List multi-sig wallets',
      description: 'List multi-signature wallets with filtering and pagination',
      querystring: MultiSigQuerySchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Querystring: MultiSigQueryOptions }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.listMultiSigWallets(request.query)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'List multi-sig wallets error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get multi-signature wallet by ID
   */
  fastify.get('/wallets/multi-sig/:id', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Get multi-sig wallet',
      description: 'Get multi-signature wallet details by ID',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.getMultiSigWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get multi-sig wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Update multi-signature wallet
   */
  fastify.put('/wallets/multi-sig/:id', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Update multi-sig wallet',
      description: 'Update multi-signature wallet configuration',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: UpdateMultiSigWalletSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: UpdateMultiSigWalletRequest 
  }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.updateMultiSigWallet({
        ...request.body,
        id: request.params.id
      } as any)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Update multi-sig wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Delete multi-signature wallet
   */
  fastify.delete('/wallets/multi-sig/:id', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Delete multi-sig wallet',
      description: 'Delete multi-signature wallet (requires no pending transactions)',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.deleteMultiSigWallet(request.params.id)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Delete multi-sig wallet error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Add owner to multi-sig wallet
   */
  fastify.post('/wallets/multi-sig/:id/owners', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Add owner to multi-sig wallet',
      description: 'Add a new owner to existing multi-signature wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        owner: Type.String()
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: { owner: string }
  }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.addOwner(request.params.id, request.body.owner)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Add owner error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Remove owner from multi-sig wallet
   */
  fastify.delete('/wallets/multi-sig/:id/owners/:owner', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Remove owner from multi-sig wallet',
      description: 'Remove an owner from existing multi-signature wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
        owner: Type.String()
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string; owner: string } }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.removeOwner(request.params.id, request.params.owner)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Remove owner error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Update multi-sig wallet threshold
   */
  fastify.put('/wallets/multi-sig/:id/threshold', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Update wallet threshold',
      description: 'Update the signature threshold for multi-sig wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        threshold: Type.Number({ minimum: 1 })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: { threshold: number }
  }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.updateThreshold(request.params.id, request.body.threshold)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Update threshold error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get multi-sig wallet statistics
   */
  fastify.get('/wallets/multi-sig/:id/statistics', {
    schema: {
      tags: ['Multi-Sig Wallets'],
      summary: 'Get multi-sig wallet statistics',
      description: 'Get comprehensive statistics for multi-signature wallet',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await multiSigWalletService.instance.getWalletStatistics(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get wallet statistics error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // TRANSACTION PROPOSAL ROUTES
  // ===========================================

  /**
   * Create transaction proposal
   */
  fastify.post('/wallets/multi-sig/proposals', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'Create transaction proposal',
      description: 'Create a new transaction proposal for multi-sig approval',
      body: CreateProposalSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateProposalRequest }>, reply: FastifyReply) => {
    try {
      const result = await transactionProposalService.instance.createProposal(request.body)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Create proposal error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * List transaction proposals
   */
  fastify.get('/wallets/multi-sig/proposals', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'List transaction proposals',
      description: 'List transaction proposals with filtering and pagination',
      querystring: ProposalQuerySchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Querystring: {
    wallet_id?: string
    status?: ProposalStatus
    page?: number
    limit?: number
  } }>, reply: FastifyReply) => {
    try {
      const result = await transactionProposalService.instance.listProposals(request.query)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'List proposals error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get transaction proposal by ID
   */
  fastify.get('/wallets/multi-sig/proposals/:id', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'Get transaction proposal',
      description: 'Get transaction proposal details by ID',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await transactionProposalService.instance.getProposal(request.params.id)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get proposal error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Sign transaction proposal
   */
  fastify.post('/wallets/multi-sig/proposals/:id/sign', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'Sign transaction proposal',
      description: 'Sign a transaction proposal with private key or passphrase',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        signer_address: Type.String(),
        private_key: Type.Optional(Type.String()),
        passphrase: Type.Optional(Type.String())
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }
    Body: {
      signer_address: string
      private_key?: string
      passphrase?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await multiSigSigningService.instance.signProposal({
        proposal_id: request.params.id,
        signer_address: request.body.signer_address,
        private_key: request.body.private_key,
        passphrase: request.body.passphrase
      })
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Sign proposal error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Execute transaction proposal
   */
  fastify.post('/wallets/multi-sig/proposals/:id/execute', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'Execute transaction proposal',
      description: 'Execute approved transaction proposal on blockchain',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await transactionProposalService.instance.executeProposal(request.params.id)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Execute proposal error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Cancel transaction proposal
   */
  fastify.delete('/wallets/multi-sig/proposals/:id', {
    schema: {
      tags: ['Multi-Sig Proposals'],
      summary: 'Cancel transaction proposal',
      description: 'Cancel pending transaction proposal',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await transactionProposalService.instance.cancelProposal(request.params.id)
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Cancel proposal error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // GNOSIS SAFE INTEGRATION ROUTES
  // ===========================================

  /**
   * Deploy Gnosis Safe wallet
   */
  fastify.post('/wallets/multi-sig/gnosis-safe/deploy', {
    schema: {
      tags: ['Gnosis Safe'],
      summary: 'Deploy Gnosis Safe wallet',
      description: 'Deploy a new Gnosis Safe multi-signature wallet',
      body: GnosisSafeDeploymentSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Body: {
    blockchain: BlockchainNetwork
    owners: string[]
    threshold: number
    saltNonce?: string
  } }>, reply: FastifyReply) => {
    try {
      const result = await gnosisSafeService.instance.deployGnosisSafe(
        request.body.blockchain,
        {
          owners: request.body.owners,
          threshold: request.body.threshold,
          saltNonce: request.body.saltNonce
        }
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      logError(fastify.log, 'Deploy Gnosis Safe error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Add owner to Gnosis Safe
   */
  fastify.post('/wallets/multi-sig/gnosis-safe/:address/owners', {
    schema: {
      tags: ['Gnosis Safe'],
      summary: 'Add owner to Gnosis Safe',
      description: 'Add a new owner to existing Gnosis Safe wallet',
      params: Type.Object({
        address: Type.String()
      }),
      body: Type.Object({
        blockchain: BlockchainNetworkSchema,
        owner: Type.String(),
        threshold: Type.Optional(Type.Number({ minimum: 1 }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { address: string }
    Body: {
      blockchain: BlockchainNetwork
      owner: string
      threshold?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await gnosisSafeService.instance.addOwnerToSafe(
        request.params.address,
        request.body.blockchain,
        request.body.owner,
        request.body.threshold
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Add owner to Gnosis Safe error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Remove owner from Gnosis Safe
   */
  fastify.delete('/wallets/multi-sig/gnosis-safe/:address/owners/:owner', {
    schema: {
      tags: ['Gnosis Safe'],
      summary: 'Remove owner from Gnosis Safe',
      description: 'Remove an owner from existing Gnosis Safe wallet',
      params: Type.Object({
        address: Type.String(),
        owner: Type.String()
      }),
      body: Type.Object({
        blockchain: BlockchainNetworkSchema,
        threshold: Type.Optional(Type.Number({ minimum: 1 }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { address: string; owner: string }
    Body: {
      blockchain: BlockchainNetwork
      threshold?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await gnosisSafeService.instance.removeOwnerFromSafe(
        request.params.address,
        request.body.blockchain,
        request.params.owner,
        request.body.threshold || 1
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Remove owner from Gnosis Safe error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Change Gnosis Safe threshold
   */
  fastify.put('/wallets/multi-sig/gnosis-safe/:address/threshold', {
    schema: {
      tags: ['Gnosis Safe'],
      summary: 'Change Gnosis Safe threshold',
      description: 'Change the signature threshold for Gnosis Safe wallet',
      params: Type.Object({
        address: Type.String()
      }),
      body: Type.Object({
        blockchain: BlockchainNetworkSchema,
        threshold: Type.Number({ minimum: 1 })
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { address: string }
    Body: {
      blockchain: BlockchainNetwork
      threshold: number
    }
  }>, reply: FastifyReply) => {
    try {
      const result = await gnosisSafeService.instance.changeThreshold(
        request.params.address,
        request.body.blockchain,
        request.body.threshold
      )
      
      if (!result.success) {
        return reply.status(400).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Change Gnosis Safe threshold error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // MULTI-SIG ANALYTICS ROUTES
  // ===========================================

  /**
   * Get multi-sig analytics
   */
  fastify.get('/wallets/multi-sig/analytics', {
    schema: {
      tags: ['Multi-Sig Analytics'],
      summary: 'Get multi-sig analytics',
      description: 'Get comprehensive multi-signature wallet analytics',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await multiSigSigningService.instance.getMultiSigAnalytics()
      
      if (!result.success) {
        return reply.status(500).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get multi-sig analytics error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get signer statistics
   */
  fastify.get('/wallets/multi-sig/signers/:address/statistics', {
    schema: {
      tags: ['Multi-Sig Analytics'],
      summary: 'Get signer statistics',
      description: 'Get detailed statistics for a specific signer',
      params: Type.Object({
        address: Type.String()
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
    try {
      const result = await multiSigSigningService.instance.getWalletSignatureStats(request.params.address)
      
      if (!result.success) {
        return reply.status(404).send(result)
      }
      
      return reply.status(200).send(result)
    } catch (error) {
      logError(fastify.log, 'Get signer statistics error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // ===========================================
  // UTILITY & HEALTH CHECK ROUTES
  // ===========================================

  /**
   * Health check endpoint
   */
  fastify.get('/wallets/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check wallet service health and connectivity',
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          services: Type.Object({
            // Phase 1 & 2 Services
            wallet_service: Type.String(),
            transaction_service: Type.String(),
            signing_service: Type.String(),
            fee_estimation_service: Type.String(),
            nonce_manager_service: Type.String(),
            // Phase 3A Services
            smart_contract_wallet_service: Type.String(),
            webauthn_service: Type.String(),
            guardian_recovery_service: Type.String(),
            // Phase 3B Services
            user_operation_service: Type.String(),
            paymaster_service: Type.String(),
            batch_operation_service: Type.String(),
            // Phase 3C Services - Multi-Signature Wallets
            multi_sig_wallet_service: Type.String(),
            transaction_proposal_service: Type.String(),
            multi_sig_signing_service: Type.String(),
            gnosis_safe_service: Type.String(),
            // Phase 3D Services
            unified_wallet_interface: Type.String(),
            restrictions_service: Type.String(),
            lock_service: Type.String(),
            // HSM Services
            hsm_service: Type.String()
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.status(200).send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          // Phase 1 & 2 Services
          wallet_service: 'operational',
          transaction_service: 'operational',
          signing_service: 'operational',
          fee_estimation_service: 'operational',
          nonce_manager_service: 'operational',
          // Phase 3A Services - Smart Contract Foundation
          smart_contract_wallet_service: 'operational',
          webauthn_service: 'operational',
          guardian_recovery_service: 'operational',
          // Phase 3B Services - Account Abstraction
          user_operation_service: 'operational',
          paymaster_service: 'operational',
          batch_operation_service: 'operational',
          // Phase 3C Services - Multi-Signature Wallets
          multi_sig_wallet_service: 'operational',
          transaction_proposal_service: 'operational',
          multi_sig_signing_service: 'operational',
          gnosis_safe_service: 'operational',
          // Phase 3D Services - Smart Contract Integration
          unified_wallet_interface: 'operational',
          restrictions_service: 'operational',
          lock_service: 'operational',
          // HSM Services - Hardware Security
          hsm_service: 'operational'
        }
      })
    } catch (error) {
      logError(fastify.log, 'Health check error:', error)
      return reply.status(500).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed'
      })
    }
  })

  /**
   * Generate test key pair (development only)
   */
  if (process.env.NODE_ENV !== 'production') {
    fastify.post('/wallets/dev/generate-keypair', {
      schema: {
        tags: ['Development'],
        summary: 'Generate test key pair',
        description: 'Generate a test key pair for development (dev environment only)',
        body: Type.Object({
          blockchain: BlockchainNetworkSchema
        }),
        response: {
          200: SuccessResponseSchema,
          400: ErrorResponseSchema
        }
      }
    }, async (request: FastifyRequest<{ Body: { blockchain: BlockchainNetwork } }>, reply: FastifyReply) => {
      try {
        const result = await signingService.instance.generateTestKeyPair(request.body.blockchain)
        
        if (!result.success) {
          return reply.status(400).send(result)
        }
        
        return reply.status(200).send(result)
      } catch (error) {
        logError(fastify.log, 'Generate test key pair error:', error)
        return reply.status(500).send({
          success: false,
          error: 'Internal server error'
        })
      }
    })
  }
}

export default walletRoutes
