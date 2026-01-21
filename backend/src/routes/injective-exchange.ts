import { FastifyInstance } from 'fastify';
import { getSupabaseClient } from '../infrastructure/database/supabase';
import { ExchangeService } from '../services/exchange';

/**
 * Injective Exchange (Market Maker) API Routes
 * 
 * REST API endpoints for:
 * - CCMM contract deployment
 * - Product market configuration
 * - Liquidity provision (order placement)
 * - Order cancellation
 * - Market updates
 */

// ============================================================================
// JSON SCHEMAS
// ============================================================================

const DeployMarketMakerSchema = {
  type: 'object',
  required: ['projectId', 'backendOracleAddress', 'deployerAddress', 'privateKey'],
  properties: {
    projectId: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    backendOracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    contractName: { type: 'string' },
    deployerAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' },
    gasLimit: { type: 'string' }
  }
};

const ConfigureMarketSchema = {
  type: 'object',
  required: ['contractAddress', 'productId', 'marketId', 'baseDenom', 'quoteDenom', 'productType', 'spreadBps', 'orderSize', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    productId: { type: 'string', format: 'uuid' },
    marketId: { type: 'string' },
    baseDenom: { type: 'string' },
    quoteDenom: { type: 'string' },
    productType: { type: 'string' },
    spreadBps: { type: 'integer', minimum: 1, maximum: 10000 },
    orderSize: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    useNavPricing: { type: 'boolean', default: false },
    minOrderSize: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    maxOrderSize: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    maxDailyVolume: { type: 'integer' },
    oracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const ProvideLiquiditySchema = {
  type: 'object',
  required: ['contractAddress', 'productId', 'midPrice', 'subaccountId', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    productId: { type: 'string', format: 'uuid' },
    midPrice: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    subaccountId: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
    oracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const CancelOrdersSchema = {
  type: 'object',
  required: ['contractAddress', 'productId', 'subaccountId', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    productId: { type: 'string', format: 'uuid' },
    subaccountId: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
    oracleAddress: { type: 'string', pattern: '^(inj1|0x)[a-zA-Z0-9]+$' },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false },
    blockchain: { type: 'string', enum: ['injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'injective' },
    network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'], default: 'testnet' }
  }
};

const UpdateMarketSchema = {
  type: 'object',
  required: ['contractAddress', 'productId', 'oracleAddress', 'privateKey', 'blockchain'],
  properties: {
    contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    productId: { type: 'string', format: 'uuid' },
    spreadBps: { type: 'integer', minimum: 1, maximum: 10000 },
    orderSize: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
    paused: { type: 'boolean' },
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

export async function injectiveExchangeRoutes(fastify: FastifyInstance) {
  const { authenticate } = fastify;

  /**
   * POST /api/injective/exchange/deploy
   * Deploy CCMM market maker contract
   */
  fastify.post('/api/injective/exchange/deploy', {
    preHandler: [authenticate],
    schema: { body: DeployMarketMakerSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await ExchangeService.deployMarketMaker(
        {
          projectId: body.projectId,
          productId: body.productId,
          backendOracleAddress: body.backendOracleAddress,
          contractName: body.contractName,
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
        error: 'Failed to deploy market maker',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/exchange/configure
   * Configure product market on CCMM contract
   */
  fastify.post('/api/injective/exchange/configure', {
    preHandler: [authenticate],
    schema: { body: ConfigureMarketSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await ExchangeService.configureMarket(
        {
          contractAddress: body.contractAddress,
          productId: body.productId,
          marketId: body.marketId,
          baseDenom: body.baseDenom,
          quoteDenom: body.quoteDenom,
          productType: body.productType,
          spreadBps: body.spreadBps,
          orderSize: body.orderSize,
          useNavPricing: body.useNavPricing,
          minOrderSize: body.minOrderSize,
          maxOrderSize: body.maxOrderSize,
          maxDailyVolume: body.maxDailyVolume,
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
        error: 'Failed to configure market',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/exchange/provide-liquidity
   * Place buy/sell orders via Exchange Precompile
   */
  fastify.post('/api/injective/exchange/provide-liquidity', {
    preHandler: [authenticate],
    schema: { body: ProvideLiquiditySchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await ExchangeService.provideLiquidity(
        {
          contractAddress: body.contractAddress,
          productId: body.productId,
          midPrice: body.midPrice,
          subaccountId: body.subaccountId,
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
        error: 'Failed to provide liquidity',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/exchange/cancel-orders
   * Cancel all orders for a product
   */
  fastify.post('/api/injective/exchange/cancel-orders', {
    preHandler: [authenticate],
    schema: { body: CancelOrdersSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      await ExchangeService.cancelOrders(
        body.contractAddress,
        body.productId,
        body.subaccountId,
        body.blockchain || 'injective',
        body.network || 'testnet',
        body.privateKey,
        body.useHSM || false
      );

      reply.code(200).send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to cancel orders',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/exchange/update-market
   * Update market configuration (spread, size, pause status)
   */
  fastify.post('/api/injective/exchange/update-market', {
    preHandler: [authenticate],
    schema: { body: UpdateMarketSchema }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      const result = await ExchangeService.updateMarketConfig(
        body.contractAddress,
        body.productId,
        {
          spreadBps: body.spreadBps,
          orderSize: body.orderSize,
          paused: body.paused,
          oracleAddress: body.oracleAddress
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
        error: 'Failed to update market',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/exchange/contracts
   * List all exchange contracts
   */
  fastify.get('/api/injective/exchange/contracts', {
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
        .eq('contract_type', 'market_maker');

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
        error: 'Failed to list contracts',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/exchange/markets
   * List all product markets
   */
  fastify.get('/api/injective/exchange/markets', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          productId: { type: 'string', format: 'uuid' },
          marketId: { type: 'string' },
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
        .from('product_markets')
        .select('*');

      if (query.productId) dbQuery = dbQuery.eq('product_id', query.productId);
      if (query.marketId) dbQuery = dbQuery.eq('market_id', query.marketId);
      if (query.blockchain) dbQuery = dbQuery.eq('blockchain', query.blockchain);
      if (query.network) dbQuery = dbQuery.eq('network', query.network);
      if (query.isActive !== undefined) dbQuery = dbQuery.eq('is_active', query.isActive);

      const { data, error } = await dbQuery;

      if (error) throw error;

      reply.send(data);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to list markets',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/exchange/operations
   * List market maker operations
   */
  fastify.get('/api/injective/exchange/operations', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          productId: { type: 'string', format: 'uuid' },
          marketId: { type: 'string' },
          blockchain: { type: 'string' },
          network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = request.query as any;
      const supabase = getSupabaseClient();

      let dbQuery = supabase
        .from('market_maker_operations')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(query.limit || 20);

      if (query.productId) dbQuery = dbQuery.eq('product_id', query.productId);
      if (query.marketId) dbQuery = dbQuery.eq('market_id', query.marketId);
      if (query.blockchain) dbQuery = dbQuery.eq('blockchain', query.blockchain);
      if (query.network) dbQuery = dbQuery.eq('network', query.network);

      const { data, error } = await dbQuery;

      if (error) throw error;

      reply.send(data);
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to list operations',
        message: error.message
      });
    }
  });
}
