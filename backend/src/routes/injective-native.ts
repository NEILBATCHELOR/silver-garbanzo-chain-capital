import { FastifyInstance } from 'fastify';
import { getSupabaseClient } from '../infrastructure/database/supabase';

/**
 * Injective Native Token API Routes
 * 
 * REST API endpoints for Injective Native TokenFactory operations
 * including token creation, minting, burning, market launch, and permissions
 */

// JSON Schemas for validation
const CreateTokenSchema = {
  type: 'object',
  required: ['subdenom', 'metadata', 'creatorAddress', 'privateKey'],
  properties: {
    subdenom: {
      type: 'string',
      minLength: 3,
      maxLength: 44,
      pattern: '^[a-z0-9-]+$',
      description: 'Token subdenom (lowercase, numbers, dashes only)'
    },
    initialSupply: {
      type: 'string',
      pattern: '^[0-9]+$',
      description: 'Initial supply (optional, in base units)'
    },
    metadata: {
      type: 'object',
      required: ['name', 'symbol', 'decimals'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        symbol: { type: 'string', minLength: 2, maxLength: 10 },
        decimals: { type: 'integer', minimum: 0, maximum: 18 },
        description: { type: 'string', maxLength: 500 }
      }
    },
    creatorAddress: {
      type: 'string',
      pattern: '^inj1[a-z0-9]{38}$',
      description: 'Injective address (inj1...)'
    },
    privateKey: {
      type: 'string',
      description: 'Private key for signing (will be handled securely)'
    },
    useHSM: {
      type: 'boolean',
      default: false,
      description: 'Use HSM for signing'
    },
    projectId: {
      type: 'string',
      format: 'uuid',
      description: 'Optional project ID to link token'
    }
  }
};

const MintTokensSchema = {
  type: 'object',
  required: ['denom', 'amount', 'adminAddress', 'privateKey'],
  properties: {
    denom: {
      type: 'string',
      pattern: '^factory/inj1[a-z0-9]{38}/[a-z0-9-]+$',
      description: 'TokenFactory denom (factory/{creator}/{subdenom})'
    },
    amount: {
      type: 'string',
      pattern: '^[0-9]+$',
      description: 'Amount to mint (in base units)'
    },
    recipient: {
      type: 'string',
      pattern: '^inj1[a-z0-9]{38}$',
      description: 'Recipient address (optional, defaults to admin)'
    },
    adminAddress: {
      type: 'string',
      pattern: '^inj1[a-z0-9]{38}$'
    },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false }
  }
};

const BurnTokensSchema = {
  type: 'object',
  required: ['denom', 'amount', 'holderAddress', 'privateKey'],
  properties: {
    denom: {
      type: 'string',
      pattern: '^factory/inj1[a-z0-9]{38}/[a-z0-9-]+$'
    },
    amount: {
      type: 'string',
      pattern: '^[0-9]+$',
      description: 'Amount to burn (in base units)'
    },
    holderAddress: {
      type: 'string',
      pattern: '^inj1[a-z0-9]{38}$'
    },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false }
  }
};

const LaunchMarketSchema = {
  type: 'object',
  required: ['ticker', 'baseDenom', 'quoteDenom', 'minPriceTickSize', 'minQuantityTickSize', 'launcherAddress', 'privateKey'],
  properties: {
    ticker: {
      type: 'string',
      description: 'Market ticker (e.g., "BOND-A/USDT")'
    },
    baseDenom: {
      type: 'string',
      description: 'Base token denom (factory/... or peggy...)'
    },
    quoteDenom: {
      type: 'string',
      description: 'Quote token denom (usually USDT or INJ)'
    },
    minPriceTickSize: {
      type: 'string',
      pattern: '^[0-9]+(\\.[0-9]+)?$',
      description: 'Minimum price increment (e.g., "0.01")'
    },
    minQuantityTickSize: {
      type: 'string',
      pattern: '^[0-9]+(\\.[0-9]+)?$',
      description: 'Minimum quantity increment (e.g., "0.001")'
    },
    makerFeeRate: {
      type: 'string',
      pattern: '^[0-9]+(\\.[0-9]+)?$',
      default: '0.001',
      description: 'Maker fee rate (default: 0.1%)'
    },
    takerFeeRate: {
      type: 'string',
      pattern: '^[0-9]+(\\.[0-9]+)?$',
      default: '0.002',
      description: 'Taker fee rate (default: 0.2%)'
    },
    launcherAddress: {
      type: 'string',
      pattern: '^inj1[a-z0-9]{38}$'
    },
    privateKey: { type: 'string' },
    useHSM: { type: 'boolean', default: false }
  }
};

export async function injectiveNativeRoutes(fastify: FastifyInstance) {
  const { authenticate } = fastify;

  // ============================================================================
  // TOKEN MANAGEMENT ROUTES
  // ============================================================================

  /**
   * POST /api/injective/native/tokens
   * Create a new TokenFactory token
   */
  fastify.post('/api/injective/native/tokens', {
    preHandler: [authenticate],
    schema: {
      body: CreateTokenSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            denom: { type: 'string' },
            txHash: { type: 'string' },
            tokenId: { type: 'string', format: 'uuid' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;
      
      // Import service from backend services
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');
      
      // Determine network (default to testnet for safety)
      const network = body.network || 'testnet';
      const service = network === 'mainnet' 
        ? injectiveNativeTokenServiceMainnet 
        : injectiveNativeTokenServiceTestnet;

      // Create token
      const result = await service.createToken(
        {
          subdenom: body.subdenom,
          initialSupply: body.initialSupply,
          metadata: body.metadata
        },
        body.creatorAddress,
        body.privateKey,
        body.useHSM
      );

      if (!result.success) {
        return reply.code(400).send({
          error: 'Token creation failed',
          message: result.error
        });
      }

      // Save to database
      const { data: tokenRecord, error: dbError } = await getSupabaseClient()
        .from('injective_native_tokens')
        .insert({
          project_id: body.projectId || null,
          denom: result.denom,
          subdenom: body.subdenom,
          creator_address: body.creatorAddress,
          total_supply: body.initialSupply || '0',
          circulating_supply: body.initialSupply || '0',
          name: body.metadata.name,
          symbol: body.metadata.symbol,
          decimals: body.metadata.decimals,
          description: body.metadata.description,
          admin_address: body.creatorAddress,
          network,
          chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
          creation_tx_hash: result.txHash,
          status: 'active'
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error({ error: dbError }, 'Failed to save token to database');
      }

      return reply.send({
        success: true,
        denom: result.denom,
        txHash: result.txHash,
        tokenId: tokenRecord?.id
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error creating Injective token');
      return reply.code(500).send({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/native/tokens
   * List all TokenFactory tokens
   */
  fastify.get('/api/injective/native/tokens', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          network: { type: 'string', enum: ['mainnet', 'testnet'] },
          creatorAddress: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { projectId, network, creatorAddress, status } = request.query as any;

      let query = getSupabaseClient()
        .from('injective_native_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) query = query.eq('project_id', projectId);
      if (network) query = query.eq('network', network);
      if (creatorAddress) query = query.eq('creator_address', creatorAddress);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) throw error;

      return reply.send({ success: true, tokens: data });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching tokens');
      return reply.code(500).send({
        error: 'Failed to fetch tokens',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/native/tokens/:denom
   * Get token details
   */
  fastify.get('/api/injective/native/tokens/:denom', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { denom } = request.params as { denom: string };

      const { data, error } = await getSupabaseClient()
        .from('injective_native_tokens')
        .select('*')
        .eq('denom', denom)
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({
          error: 'Token not found'
        });
      }

      return reply.send({ success: true, token: data });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching token details');
      return reply.code(500).send({
        error: 'Failed to fetch token',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/native/tokens/:denom/mint
   * Mint tokens to a denom
   */
  fastify.post('/api/injective/native/tokens/:denom/mint', {
    preHandler: [authenticate],
    schema: {
      body: MintTokensSchema
    }
  }, async (request, reply) => {
    try {
      const { denom } = request.params as { denom: string };
      const body = request.body as any;

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      // Get token to determine network
      const { data: token } = await getSupabaseClient()
        .from('injective_native_tokens')
        .select('network')
        .eq('denom', denom)
        .single();

      const service = token?.network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      // Mint tokens
      const txHash = await service.mintTokens(
        {
          denom: body.denom,
          amount: body.amount,
          recipient: body.recipient
        },
        body.adminAddress,
        body.privateKey,
        body.useHSM
      );

      // Update total supply in database
      const { error: updateError } = await getSupabaseClient().rpc('increment_token_supply', {
        p_denom: denom,
        p_amount: body.amount
      });

      if (updateError) {
        fastify.log.error({ error: updateError }, 'Failed to update token supply');
      }

      return reply.send({
        success: true,
        txHash,
        message: `Minted ${body.amount} tokens`
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error minting tokens');
      return reply.code(500).send({
        error: 'Failed to mint tokens',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/native/tokens/:denom/burn
   * Burn tokens from a denom
   */
  fastify.post('/api/injective/native/tokens/:denom/burn', {
    preHandler: [authenticate],
    schema: {
      body: BurnTokensSchema
    }
  }, async (request, reply) => {
    try {
      const { denom } = request.params as { denom: string };
      const body = request.body as any;

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      // Get token to determine network
      const { data: token } = await getSupabaseClient()
        .from('injective_native_tokens')
        .select('network')
        .eq('denom', denom)
        .single();

      const service = token?.network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      // Burn tokens
      const txHash = await service.burnTokens(
        {
          denom: body.denom,
          amount: body.amount
        },
        body.holderAddress,
        body.privateKey,
        body.useHSM
      );

      // Update total supply in database
      const { error: updateError } = await getSupabaseClient().rpc('decrement_token_supply', {
        p_denom: denom,
        p_amount: body.amount
      });

      if (updateError) {
        fastify.log.error({ error: updateError }, 'Failed to update token supply');
      }

      return reply.send({
        success: true,
        txHash,
        message: `Burned ${body.amount} tokens`
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error burning tokens');
      return reply.code(500).send({
        error: 'Failed to burn tokens',
        message: error.message
      });
    }
  });

  // ============================================================================
  // MARKET MANAGEMENT ROUTES
  // ============================================================================

  /**
   * POST /api/injective/native/markets
   * Launch a spot market on Injective DEX
   */
  fastify.post('/api/injective/native/markets', {
    preHandler: [authenticate],
    schema: {
      body: LaunchMarketSchema
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      const network = body.network || 'testnet';
      const service = network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      // Launch market
      const result = await service.launchSpotMarket(
        {
          ticker: body.ticker,
          baseDenom: body.baseDenom,
          quoteDenom: body.quoteDenom,
          minPriceTickSize: body.minPriceTickSize,
          minQuantityTickSize: body.minQuantityTickSize,
          makerFeeRate: body.makerFeeRate,
          takerFeeRate: body.takerFeeRate
        },
        body.launcherAddress,
        body.privateKey,
        body.useHSM
      );

      if (!result.success) {
        return reply.code(400).send({
          error: 'Market launch failed',
          message: result.error
        });
      }

      // Save to database
      const { data: marketRecord, error: dbError } = await getSupabaseClient()
        .from('injective_markets')
        .insert({
          market_id: result.marketId,
          ticker: body.ticker,
          market_type: 'spot',
          base_denom: body.baseDenom,
          quote_denom: body.quoteDenom,
          min_price_tick_size: body.minPriceTickSize,
          min_quantity_tick_size: body.minQuantityTickSize,
          maker_fee_rate: body.makerFeeRate || '0.001',
          taker_fee_rate: body.takerFeeRate || '0.002',
          network,
          chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
          launch_tx_hash: result.txHash,
          status: 'active'
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error({ error: dbError }, 'Failed to save market to database');
      }

      return reply.send({
        success: true,
        marketId: result.marketId,
        txHash: result.txHash,
        recordId: marketRecord?.id
      });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error launching market');
      return reply.code(500).send({
        error: 'Failed to launch market',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/native/markets
   * List all markets
   */
  fastify.get('/api/injective/native/markets', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          baseDenom: { type: 'string' },
          quoteDenom: { type: 'string' },
          network: { type: 'string', enum: ['mainnet', 'testnet'] },
          status: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { baseDenom, quoteDenom, network, status } = request.query as any;

      let query = getSupabaseClient()
        .from('injective_markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (baseDenom) query = query.eq('base_denom', baseDenom);
      if (quoteDenom) query = query.eq('quote_denom', quoteDenom);
      if (network) query = query.eq('network', network);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) throw error;

      return reply.send({ success: true, markets: data });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching markets');
      return reply.code(500).send({
        error: 'Failed to fetch markets',
        message: error.message
      });
    }
  });

  /**
   * GET /api/injective/native/markets/:marketId
   * Get market details
   */
  fastify.get('/api/injective/native/markets/:marketId', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };

      const { data, error } = await getSupabaseClient()
        .from('injective_markets')
        .select('*')
        .eq('market_id', marketId)
        .single();

      if (error) throw error;
      if (!data) {
        return reply.code(404).send({
          error: 'Market not found'
        });
      }

      return reply.send({ success: true, market: data });

    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching market details');
      return reply.code(500).send({
        error: 'Failed to fetch market',
        message: error.message
      });
    }
  });

  // ============================================================================
  // BALANCE & QUERY ROUTES
  // ============================================================================

  /**
   * GET /api/injective/native/balances/:address
   * Get token balances for an address
   */
  fastify.get('/api/injective/native/balances/:address', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            pattern: '^inj1[a-z0-9]{38}$'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          denom: { type: 'string' },
          network: { type: 'string', enum: ['mainnet', 'testnet'], default: 'testnet' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { address } = request.params as { address: string };
      const { denom, network } = request.query as any;

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      const service = network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      if (denom) {
        // Get specific balance
        const balance = await service.getBalance(address, denom);
        return reply.send({
          success: true,
          balance: {
            denom,
            amount: balance
          }
        });
      } else {
        // Get all balances
        const balances = await service.getAllBalances(address);
        return reply.send({
          success: true,
          balances
        });
      }

    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching balances');
      return reply.code(500).send({
        error: 'Failed to fetch balances',
        message: error.message
      });
    }
  });

  /**
   * POST /api/injective/native/validate-denom
   * Validate a denom format
   */
  fastify.post('/api/injective/native/validate-denom', {
    schema: {
      body: {
        type: 'object',
        required: ['denom'],
        properties: {
          denom: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { denom } = request.body as { denom: string };

      // Import service
      const { injectiveNativeTokenServiceTestnet } = 
        await import('../services/injective');

      const isValid = injectiveNativeTokenServiceTestnet.validateDenom(denom);
      const parsed = injectiveNativeTokenServiceTestnet.parseDenom(denom);

      return reply.send({
        success: true,
        valid: isValid,
        parsed: parsed || undefined
      });

    } catch (error: any) {
      return reply.code(400).send({
        error: 'Invalid denom format',
        message: error.message
      });
    }
  });
}

export default injectiveNativeRoutes;
