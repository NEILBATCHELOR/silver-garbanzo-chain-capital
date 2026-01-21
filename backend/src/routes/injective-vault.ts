import { FastifyInstance } from 'fastify';
import { getSupabaseClient } from '../infrastructure/database/supabase';
import { VaultService } from '../services/vault';

/**
 * Injective Vault API Routes
 * 
 * REST API endpoints for:
 * - CCeTracker vault deployment
 * - Deposit operations
 * - Withdrawal operations
 * - Exchange rate updates
 * - Strategy management
 */

// ============================================================================
// JSON SCHEMAS
// ============================================================================

const DeployVaultSchema = {
  type: 'object',
  required: ['projectId', 'name', 'symbol', 'decimals', 'underlyingDenom', 'backendOracleAddress', 'deployerAddress', 'privateKey'],
  properties: {
    projectId: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    symbol: { type: 'string', minLength: 1, maxLength: 20 },
    decimals: { type: 'integer', minimum: 0, maximum: 18 },
    productType: { type: 'string' },
    underlyingDenom: { type: 'string' },
    backendOracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    deployerAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' },
    gasLimit: { type: 'string' }
  }
};

const DepositSchema = {
  type: 'object',
  required: ['vaultAddress', 'amount', 'subaccountId', 'userAddress', 'privateKey', 'blockchain'],
  properties: {
    vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    amount: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    subaccountId: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
    userAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const WithdrawSchema = {
  type: 'object',
  required: ['vaultAddress', 'shares', 'subaccountId', 'userAddress', 'privateKey', 'blockchain'],
  properties: {
    vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    shares: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    subaccountId: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
    userAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const UpdateRateSchema = {
  type: 'object',
  required: ['vaultAddress', 'newRate', 'totalValue', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    newRate: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    totalValue: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    oracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const AddStrategySchema = {
  type: 'object',
  required: ['vaultAddress', 'strategyName', 'allocationPct', 'targetApy', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    strategyName: { type: 'string', minLength: 1, maxLength: 100 },
    allocationPct: { type: 'integer', minimum: 0, maximum: 10000 },
    targetApy: { type: 'integer', minimum: 0, maximum: 100000 },
    oracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

// ============================================================================
// ROUTES
// ============================================================================

export async function injectiveVaultRoutes(fastify: FastifyInstance) {
  const { authenticate } = fastify;

  /**
   * POST /api/injective/vault/deploy
   * Deploy CCeTracker vault contract
   */
  fastify.post('/api/injective/vault/deploy', {
    preHandler: [authenticate],
    schema: { body: DeployVaultSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await VaultService.deployVault(
        {
          projectId: body.projectId,
          productId: body.productId,
          name: body.name,
          symbol: body.symbol,
          decimals: body.decimals,
          productType: body.productType,
          underlyingDenom: body.underlyingDenom,
          backendOracleAddress: body.backendOracleAddress,
          deployerAddress: body.deployerAddress,
          blockchain: body.blockchain || 'injective',
          network: body.network || 'testnet',
          gasLimit: body.gasLimit,
          privateKey: body.privateKey,
          useHSM: body.useHSM || false
        },
        body.privateKey,
        body.useHSM || false
      );

      reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to deploy vault',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/vault/deposit
   * User deposits underlying asset, receives shares
   */
  fastify.post('/api/injective/vault/deposit', {
    preHandler: [authenticate],
    schema: { body: DepositSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await VaultService.deposit(
        {
          vaultAddress: body.vaultAddress,
          amount: body.amount,
          subaccountId: body.subaccountId,
          userAddress: body.userAddress,
          blockchain: body.blockchain || 'injective',
          network: body.network || 'testnet',
          privateKey: body.privateKey,
          useHSM: body.useHSM || false
        },
        body.blockchain || 'injective',
        body.network || 'testnet',
        body.privateKey,
        body.useHSM || false
      );

      reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to deposit',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/vault/withdraw
   * User burns shares, receives underlying asset
   */
  fastify.post('/api/injective/vault/withdraw', {
    preHandler: [authenticate],
    schema: { body: WithdrawSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await VaultService.withdraw(
        {
          vaultAddress: body.vaultAddress,
          shares: body.shares,
          subaccountId: body.subaccountId,
          userAddress: body.userAddress,
          blockchain: body.blockchain || 'injective',
          network: body.network || 'testnet',
          privateKey: body.privateKey,
          useHSM: body.useHSM || false
        },
        body.blockchain || 'injective',
        body.network || 'testnet',
        body.privateKey,
        body.useHSM || false
      );

      reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to withdraw',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/vault/update-rate
   * Backend oracle updates exchange rate (value appreciation)
   */
  fastify.post('/api/injective/vault/update-rate', {
    preHandler: [authenticate],
    schema: { body: UpdateRateSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await VaultService.updateExchangeRate(
        {
          vaultAddress: body.vaultAddress,
          newRate: body.newRate,
          totalValue: body.totalValue,
          oracleAddress: body.oracleAddress,
          blockchain: body.blockchain || 'injective',
          network: body.network || 'testnet',
          privateKey: body.privateKey,
          useHSM: body.useHSM || false
        },
        body.blockchain || 'injective',
        body.network || 'testnet',
        body.privateKey,
        body.useHSM || false
      );

      reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to update exchange rate',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/vault/add-strategy
   * Backend oracle adds yield strategy to vault
   */
  fastify.post('/api/injective/vault/add-strategy', {
    preHandler: [authenticate],
    schema: { body: AddStrategySchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      await VaultService.addStrategy(
        body.vaultAddress,
        body.strategyName,
        body.allocationPct,
        body.targetApy,
        body.blockchain || 'injective',
        body.network || 'testnet',
        body.privateKey,
        body.useHSM || false
      );

      reply.code(200).send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to add strategy',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/vault/contracts
   * List all vault contracts
   */
  fastify.get('/api/injective/vault/contracts', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          blockchain: { type: 'string' },
          network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'] },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = request.query as any;
      const supabase = getSupabaseClient();

      let dbQuery = supabase
        .from('exchange_contracts')
        .select('*')
        .eq('contract_type', 'vault');

      if (query.projectId) dbQuery = dbQuery.eq('project_id', query.projectId);
      if (query.productId) dbQuery = dbQuery.eq('product_id', query.productId);
      if (query.blockchain) dbQuery = dbQuery.eq('blockchain', query.blockchain);
      if (query.network) dbQuery = dbQuery.eq('network', query.network);
      if (query.isActive !== undefined) dbQuery = dbQuery.eq('is_active', query.isActive);

      const { data, error } = await dbQuery;

      if (error) throw error;

      reply.send(data);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to list vault contracts',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/vault/positions
   * List vault positions for a user
   */
  fastify.get('/api/injective/vault/positions', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          vaultAddress: { type: 'string' },
          userAddress: { type: 'string' },
          blockchain: { type: 'string' },
          network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'] },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = request.query as any;
      const supabase = getSupabaseClient();

      let dbQuery = supabase
        .from('vault_positions')
        .select('*');

      if (query.vaultAddress) dbQuery = dbQuery.eq('vault_contract', query.vaultAddress);
      if (query.userAddress) dbQuery = dbQuery.eq('user_address', query.userAddress);
      if (query.blockchain) dbQuery = dbQuery.eq('blockchain', query.blockchain);
      if (query.network) dbQuery = dbQuery.eq('network', query.network);
      if (query.isActive !== undefined) dbQuery = dbQuery.eq('is_active', query.isActive);

      const { data, error } = await dbQuery;

      if (error) throw error;

      reply.send(data);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to list positions',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/vault/info/:vaultAddress
   * Get vault information (contract state query)
   */
  fastify.get('/api/injective/vault/info/:vaultAddress', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['vaultAddress'],
        properties: {
          vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
          network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const query = request.query as any;

      const info = await VaultService.getVaultInfo(
        params.vaultAddress,
        query.blockchain || 'injective',
        query.network || 'testnet'
      );

      reply.send(info);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to get vault info',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/vault/strategies/:vaultAddress
   * Get vault strategies
   */
  fastify.get('/api/injective/vault/strategies/:vaultAddress', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['vaultAddress'],
        properties: {
          vaultAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
          network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const query = request.query as any;

      const strategies = await VaultService.getStrategies(
        params.vaultAddress,
        query.blockchain || 'injective',
        query.network || 'testnet'
      );

      reply.send(strategies);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to get strategies',
        message: error.message
      });
    }
  });
}
