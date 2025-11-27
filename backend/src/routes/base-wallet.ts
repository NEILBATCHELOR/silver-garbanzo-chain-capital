/**
 * Base Network Wallet Routes
 * 
 * API endpoints for Base wallet management
 * 
 * Endpoints:
 * - POST /base-wallet/create - Create a new wallet
 * - POST /base-wallet/import/private-key - Import from private key
 * - POST /base-wallet/import/mnemonic - Import from mnemonic
 * - POST /base-wallet/generate-hd - Generate HD wallets
 * - POST /base-wallet/validate - Validate Base address
 * - GET /base-wallet/chain-config - Get chain configuration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createBaseWalletService, BaseWalletService } from '../services/wallets/base-wallet-service';

interface CreateAccountBody {
  network?: 'base' | 'base-sepolia';
  name?: string;
  includePrivateKey?: boolean;
  includeMnemonic?: boolean;
}

interface ImportPrivateKeyBody {
  privateKey: string;
  network?: 'base' | 'base-sepolia';
}

interface ImportMnemonicBody {
  mnemonic: string;
  network?: 'base' | 'base-sepolia';
  path?: string;
}

interface GenerateHDWalletsBody {
  mnemonic: string;
  count: number;
  network?: 'base' | 'base-sepolia';
}

interface ValidateAddressBody {
  address: string;
}

export async function baseWalletRoutes(fastify: FastifyInstance) {
  // Initialize service
  const walletService = createBaseWalletService();
  fastify.log.info('Base wallet service initialized');

  /**
   * Create a new wallet
   */
  fastify.post<{ Body: CreateAccountBody }>(
    '/base-wallet/create',
    async (request: FastifyRequest<{ Body: CreateAccountBody }>, reply: FastifyReply) => {
      try {
        const { 
          network = 'base-sepolia', 
          name,
          includePrivateKey = false,
          includeMnemonic = false
        } = request.body;

        const result = await walletService.createAccount(
          network, 
          name, 
          includePrivateKey, 
          includeMnemonic
        );

        return reply.code(201).send({
          success: true,
          data: result,
          message: `Base wallet created successfully on ${network}`
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
        fastify.log.error(`Error creating Base wallet: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Import wallet from private key
   */
  fastify.post<{ Body: ImportPrivateKeyBody }>(
    '/base-wallet/import/private-key',
    async (request: FastifyRequest<{ Body: ImportPrivateKeyBody }>, reply: FastifyReply) => {
      try {
        const { privateKey, network = 'base-sepolia' } = request.body;

        if (!privateKey) {
          return reply.code(400).send({
            success: false,
            error: 'Private key is required'
          });
        }

        const result = await walletService.importFromPrivateKey(privateKey, network);

        return reply.code(200).send({
          success: true,
          data: result,
          message: 'Wallet imported successfully from private key'
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
        fastify.log.error(`Error importing wallet from private key: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Import wallet from mnemonic
   */
  fastify.post<{ Body: ImportMnemonicBody }>(
    '/base-wallet/import/mnemonic',
    async (request: FastifyRequest<{ Body: ImportMnemonicBody }>, reply: FastifyReply) => {
      try {
        const { mnemonic, network = 'base-sepolia', path } = request.body;

        if (!mnemonic) {
          return reply.code(400).send({
            success: false,
            error: 'Mnemonic phrase is required'
          });
        }

        const result = await walletService.importFromMnemonic(mnemonic, network, path);

        return reply.code(200).send({
          success: true,
          data: result,
          message: 'Wallet imported successfully from mnemonic'
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
        fastify.log.error(`Error importing wallet from mnemonic: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Generate HD wallets from mnemonic
   */
  fastify.post<{ Body: GenerateHDWalletsBody }>(
    '/base-wallet/generate-hd',
    async (request: FastifyRequest<{ Body: GenerateHDWalletsBody }>, reply: FastifyReply) => {
      try {
        const { mnemonic, count, network = 'base-sepolia' } = request.body;

        if (!mnemonic) {
          return reply.code(400).send({
            success: false,
            error: 'Mnemonic phrase is required'
          });
        }

        if (!count || count < 1 || count > 20) {
          return reply.code(400).send({
            success: false,
            error: 'Count must be between 1 and 20'
          });
        }

        const result = await walletService.generateHDWallets(mnemonic, count, network);

        return reply.code(200).send({
          success: true,
          data: result,
          message: `Generated ${count} HD wallets successfully`
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate HD wallets';
        fastify.log.error(`Error generating HD wallets: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to validate address';
        fastify.log.error(`Error validating address: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  /**
   * Get chain configuration
   */
  fastify.get<{ Querystring: { network?: 'base' | 'base-sepolia' } }>(
    '/base-wallet/chain-config',
    async (request: FastifyRequest<{ Querystring: { network?: 'base' | 'base-sepolia' } }>, reply: FastifyReply) => {
      try {
        const { network = 'base' } = request.query;

        const config = BaseWalletService.getChainConfig(network);

        return reply.code(200).send({
          success: true,
          data: config
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get chain config';
        fastify.log.error(`Error getting chain config: ${errorMessage}`);
        return reply.code(500).send({
          success: false,
          error: errorMessage
        });
      }
    }
  );

  fastify.log.info('Base wallet routes registered successfully');
}
