/**
 * Base Network Wallet Routes
 * 
 * API endpoints for Base wallet management using CDP SDK
 * 
 * Endpoints:
 * - POST /base-wallet/create - Create a new developer-managed wallet
 * - POST /base-wallet/import - Import wallet from seed
 * - GET /base-wallet/list - List all wallets
 * - GET /base-wallet/:walletId - Get wallet details
 * - POST /base-wallet/:walletId/faucet - Request testnet funds
 * - GET /base-wallet/:walletId/balance - Get wallet balance
 * - POST /base-wallet/validate - Validate Base address
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createBaseWalletService, BaseWalletService } from '../services/wallets/base-wallet-service';

interface CreateWalletBody {
  network?: 'base-mainnet' | 'base-sepolia';
}

interface ImportWalletBody {
  seed: string;
  network?: 'base-mainnet' | 'base-sepolia';
}

interface ListWalletsQuery {
  limit?: string;
  page?: string;
}

interface WalletParams {
  walletId: string;
}

interface BalanceQuery {
  assetId?: string;
}

interface ValidateAddressBody {
  address: string;
}

export async function baseWalletRoutes(fastify: FastifyInstance) {
  // Initialize service with configuration from environment
  let walletService: BaseWalletService;

  try {
    const apiKeyName = process.env.CDP_API_KEY_NAME || process.env.COINBASE_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_PRIVATE_KEY || process.env.COINBASE_API_PRIVATE_KEY;

    if (!apiKeyName || !apiKeyPrivateKey) {
      fastify.log.warn('CDP API credentials not configured. Base wallet endpoints will be unavailable.');
      walletService = createBaseWalletService(); // Create unconfigured service
    } else {
      walletService = createBaseWalletService({
        apiKeyName,
        apiKeyPrivateKey
      });
      fastify.log.info('Base wallet service configured successfully');
    }
  } catch (error) {
    fastify.log.error('Failed to initialize Base wallet service:', error);
    walletService = createBaseWalletService(); // Create unconfigured service
  }

  /**
   * Create a new developer-managed wallet
   */
  fastify.post<{ Body: CreateWalletBody }>(
    '/base-wallet/create',
    async (request: FastifyRequest<{ Body: CreateWalletBody }>, reply: FastifyReply) => {
      try {
        const { network = 'base-sepolia' } = request.body;

        const result = await walletService.createDeveloperManagedWallet(network);

        return reply.code(201).send({
          success: true,
          data: result,
          message: `Base wallet created successfully on ${network}`
        });
      } catch (error) {
        fastify.log.error('Error creating Base wallet:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create wallet'
        });
      }
    }
  );

  /**
   * Import wallet from seed phrase
   */
  fastify.post<{ Body: ImportWalletBody }>(
    '/base-wallet/import',
    async (request: FastifyRequest<{ Body: ImportWalletBody }>, reply: FastifyReply) => {
      try {
        const { seed, network = 'base-sepolia' } = request.body;

        if (!seed) {
          return reply.code(400).send({
            success: false,
            error: 'Seed phrase is required'
          });
        }

        const result = await walletService.importWallet({ seed, network });

        return reply.code(200).send({
          success: true,
          data: result,
          message: 'Wallet imported successfully'
        });
      } catch (error) {
        fastify.log.error('Error importing wallet:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to import wallet'
        });
      }
    }
  );

  /**
   * List all wallets (paginated)
   */
  fastify.get<{ Querystring: ListWalletsQuery }>(
    '/base-wallet/list',
    async (request: FastifyRequest<{ Querystring: ListWalletsQuery }>, reply: FastifyReply) => {
      try {
        const limit = request.query.limit ? parseInt(request.query.limit) : 20;
        const page = request.query.page;

        const result = await walletService.listWallets(limit, page);

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        fastify.log.error('Error listing wallets:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list wallets'
        });
      }
    }
  );

  /**
   * Get wallet details by ID
   */
  fastify.get<{ Params: WalletParams }>(
    '/base-wallet/:walletId',
    async (request: FastifyRequest<{ Params: WalletParams }>, reply: FastifyReply) => {
      try {
        const { walletId } = request.params;

        const result = await walletService.getWallet(walletId);

        return reply.code(200).send({
          success: true,
          data: result
        });
      } catch (error) {
        fastify.log.error('Error getting wallet:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get wallet'
        });
      }
    }
  );

  /**
   * Request testnet funds from faucet (Base Sepolia only)
   */
  fastify.post<{ Params: WalletParams }>(
    '/base-wallet/:walletId/faucet',
    async (request: FastifyRequest<{ Params: WalletParams }>, reply: FastifyReply) => {
      try {
        const { walletId } = request.params;

        const txHash = await walletService.requestFaucetFunds(walletId);

        return reply.code(200).send({
          success: true,
          data: {
            transactionHash: txHash
          },
          message: 'Faucet funds requested successfully'
        });
      } catch (error) {
        fastify.log.error('Error requesting faucet funds:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to request faucet funds'
        });
      }
    }
  );

  /**
   * Get wallet balance
   */
  fastify.get<{ Params: WalletParams; Querystring: BalanceQuery }>(
    '/base-wallet/:walletId/balance',
    async (request: FastifyRequest<{ Params: WalletParams; Querystring: BalanceQuery }>, reply: FastifyReply) => {
      try {
        const { walletId } = request.params;
        const { assetId = 'eth' } = request.query;

        const balance = await walletService.getBalance(walletId, assetId);

        return reply.code(200).send({
          success: true,
          data: {
            walletId,
            assetId,
            balance
          }
        });
      } catch (error) {
        fastify.log.error('Error getting balance:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get balance'
        });
      }
    }
  );

  /**
   * Validate a Base address
   */
  fastify.post<{ Body: ValidateAddressBody }>(
    '/base-wallet/validate',
    async (request: FastifyRequest<{ Body: ValidateAddressBody }>, reply: FastifyReply) => {
      try {
        const { address } = request.body;

        if (!address) {
          return reply.code(400).send({
            success: false,
            error: 'Address is required'
          });
        }

        const isValid = walletService.validateAddress(address);

        return reply.code(200).send({
          success: true,
          data: {
            address,
            isValid
          }
        });
      } catch (error) {
        fastify.log.error('Error validating address:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate address'
        });
      }
    }
  );

  /**
   * Get chain configuration
   */
  fastify.get<{ Querystring: { network?: 'base-mainnet' | 'base-sepolia' } }>(
    '/base-wallet/chain-config',
    async (request: FastifyRequest<{ Querystring: { network?: 'base-mainnet' | 'base-sepolia' } }>, reply: FastifyReply) => {
      try {
        const { network = 'base-mainnet' } = request.query;

        const config = BaseWalletService.getChainConfig(network);

        return reply.code(200).send({
          success: true,
          data: config
        });
      } catch (error) {
        fastify.log.error('Error getting chain config:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get chain config'
        });
      }
    }
  );

  fastify.log.info('Base wallet routes registered');
}
