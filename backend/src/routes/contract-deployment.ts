/**
 * Contract Deployment API Routes
 * Provides endpoints for deploying Foundry contracts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { DeploymentOrchestrator } from '../services/contract-deployment';
import type {
  DeploymentRequest,
  ContractType,
} from '../services/contract-deployment/types';

// Request Schemas
const ContractDeploymentItemSchema = Type.Object({
  contractType: Type.String(),
  deployArgs: Type.Optional(Type.Array(Type.Any())),
  verifyOnEtherscan: Type.Optional(Type.Boolean()),
});

const DeploymentRequestSchema = Type.Object({
  walletId: Type.String({ minLength: 1 }),
  network: Type.String({ minLength: 1 }),
  environment: Type.Union([
    Type.Literal('mainnet'),
    Type.Literal('testnet'),
    Type.Literal('devnet'),
    Type.Literal('local'),
  ]),
  contracts: Type.Array(ContractDeploymentItemSchema, { minItems: 1 }),
  gasSettings: Type.Optional(
    Type.Object({
      maxFeePerGas: Type.Optional(Type.String()),
      maxPriorityFeePerGas: Type.Optional(Type.String()),
      gasLimit: Type.Optional(Type.String()),
    })
  ),
});

// Response Schemas
const DeploymentResultSchema = Type.Object({
  success: Type.Boolean(),
  contractType: Type.String(),
  address: Type.Optional(Type.String()),
  transactionHash: Type.Optional(Type.String()),
  gasUsed: Type.Optional(Type.String()),
  deploymentCost: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
  verificationStatus: Type.Optional(
    Type.Union([
      Type.Literal('pending'),
      Type.Literal('verified'),
      Type.Literal('failed'),
      Type.Literal('not_requested'),
    ])
  ),
});

const DeploymentResponseSchema = Type.Object({
  deploymentId: Type.String(),
  results: Type.Array(DeploymentResultSchema),
  totalGasUsed: Type.String(),
  totalCost: Type.String(),
  timestamp: Type.String(),
  deployer: Type.String(),
});

const DeploymentProgressSchema = Type.Object({
  deploymentId: Type.String(),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('deploying'),
    Type.Literal('completed'),
    Type.Literal('failed'),
  ]),
  currentContract: Type.Optional(Type.String()),
  currentStep: Type.Optional(Type.String()),
  completedCount: Type.Number(),
  totalCount: Type.Number(),
  results: Type.Array(DeploymentResultSchema),
  startedAt: Type.String(),
  completedAt: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
});

export default async function contractDeploymentRoutes(fastify: FastifyInstance) {
  const orchestrator = new DeploymentOrchestrator();

  /**
   * POST /api/contract-deployment/deploy
   * Deploy contracts to blockchain
   */
  fastify.post(
    '/api/contract-deployment/deploy',
    {
      schema: {
        tags: ['Contract Deployment'],
        description: 'Deploy Foundry contracts to blockchain',
        body: DeploymentRequestSchema,
        response: {
          200: DeploymentResponseSchema,
          400: Type.Object({
            error: Type.String(),
            message: Type.String(),
          }),
          500: Type.Object({
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: DeploymentRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { walletId, network, environment, contracts, gasSettings } =
          request.body;

        // Get user ID from session/auth (placeholder - implement auth)
        const userId = (request as any).user?.id || 'system';

        // Fetch wallet from database
        const { data: wallet, error: walletError } = await fastify.supabase
          .from('project_wallets')
          .select('private_key')
          .eq('id', walletId)
          .single();

        if (walletError || !wallet) {
          return reply.code(400).send({
            error: 'WalletNotFound',
            message: `Wallet ${walletId} not found`,
          });
        }

        if (!wallet.private_key) {
          return reply.code(400).send({
            error: 'WalletNotEncrypted',
            message: 'Wallet does not have encrypted private key',
          });
        }

        // Deploy contracts
        const response = await orchestrator.deployContracts(
          {
            walletId,
            network,
            environment,
            contracts,
            gasSettings,
          },
          userId,
          wallet.private_key
        );

        return reply.code(200).send(response);
      } catch (error) {
        fastify.log.error({ err: error }, 'Deployment failed');
        return reply.code(500).send({
          error: 'DeploymentError',
          message: error instanceof Error ? error.message : 'Deployment failed',
        });
      }
    }
  );

  /**
   * GET /api/contract-deployment/progress/:deploymentId
   * Get deployment progress
   */
  fastify.get(
    '/api/contract-deployment/progress/:deploymentId',
    {
      schema: {
        tags: ['Contract Deployment'],
        description: 'Get deployment progress',
        params: Type.Object({
          deploymentId: Type.String(),
        }),
        response: {
          200: DeploymentProgressSchema,
          404: Type.Object({
            error: Type.String(),
            message: Type.String(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { deploymentId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { deploymentId } = request.params;
      const progress = orchestrator.getProgress(deploymentId);

      if (!progress) {
        return reply.code(404).send({
          error: 'NotFound',
          message: `Deployment ${deploymentId} not found`,
        });
      }

      return reply.code(200).send(progress);
    }
  );

  /**
   * GET /api/contract-deployment/contract-types
   * Get available contract types
   */
  fastify.get(
    '/api/contract-deployment/contract-types',
    {
      schema: {
        tags: ['Contract Deployment'],
        description: 'Get available contract types',
        response: {
          200: Type.Object({
            contractTypes: Type.Array(
              Type.Object({
                type: Type.String(),
                category: Type.String(),
                description: Type.String(),
              })
            ),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const contractTypes = [
        // Token Factories (6)
        {
          type: 'erc20_factory',
          category: 'Token Factories',
          description: 'ERC20 Token Factory',
        },
        {
          type: 'erc721_factory',
          category: 'Token Factories',
          description: 'ERC721 NFT Factory',
        },
        {
          type: 'erc1155_factory',
          category: 'Token Factories',
          description: 'ERC1155 Multi-Token Factory',
        },
        {
          type: 'erc3525_factory',
          category: 'Token Factories',
          description: 'ERC3525 Semi-Fungible Factory',
        },
        {
          type: 'erc4626_factory',
          category: 'Token Factories',
          description: 'ERC4626 Vault Factory',
        },
        {
          type: 'erc1400_factory',
          category: 'Token Factories',
          description: 'ERC1400 Security Token Factory',
        },

        // Extension Factories (6)
        {
          type: 'erc20_extension_factory',
          category: 'Extension Factories',
          description: 'ERC20 Extension Factory (10 extensions)',
        },
        {
          type: 'erc721_extension_factory',
          category: 'Extension Factories',
          description: 'ERC721 Extension Factory (7 extensions)',
        },
        {
          type: 'erc1155_extension_factory',
          category: 'Extension Factories',
          description: 'ERC1155 Extension Factory (3 extensions)',
        },
        {
          type: 'erc3525_extension_factory',
          category: 'Extension Factories',
          description: 'ERC3525 Extension Factory (3 extensions)',
        },
        {
          type: 'erc4626_extension_factory',
          category: 'Extension Factories',
          description: 'ERC4626 Extension Factory (7 extensions)',
        },
        {
          type: 'erc1400_extension_factory',
          category: 'Extension Factories',
          description: 'ERC1400 Extension Factory (3 extensions)',
        },

        // Master Implementations (6)
        {
          type: 'erc20_master',
          category: 'Master Implementations',
          description: 'ERC20 Master Implementation',
        },
        {
          type: 'erc721_master',
          category: 'Master Implementations',
          description: 'ERC721 Master Implementation',
        },
        {
          type: 'erc1155_master',
          category: 'Master Implementations',
          description: 'ERC1155 Master Implementation',
        },
        {
          type: 'erc3525_master',
          category: 'Master Implementations',
          description: 'ERC3525 Master Implementation',
        },
        {
          type: 'erc4626_master',
          category: 'Master Implementations',
          description: 'ERC4626 Master Implementation',
        },
        {
          type: 'erc1400_master',
          category: 'Master Implementations',
          description: 'ERC1400 Master Implementation',
        },

        // Infrastructure (7)
        {
          type: 'universal_extension_factory',
          category: 'Infrastructure',
          description: 'Universal Extension Factory (Router)',
        },
        {
          type: 'extension_registry',
          category: 'Infrastructure',
          description: 'Extension Registry',
        },
        {
          type: 'token_registry',
          category: 'Infrastructure',
          description: 'Token Registry',
        },
        {
          type: 'policy_engine',
          category: 'Infrastructure',
          description: 'Policy Engine',
        },
        {
          type: 'upgrade_governor',
          category: 'Infrastructure',
          description: 'Upgrade Governor',
        },
        {
          type: 'beacon_proxy_factory',
          category: 'Infrastructure',
          description: 'Beacon Proxy Factory',
        },
        {
          type: 'multisig_wallet_factory',
          category: 'Infrastructure',
          description: 'Multi-Sig Wallet Factory',
        },
      ];

      return reply.code(200).send({ contractTypes });
    }
  );
}
