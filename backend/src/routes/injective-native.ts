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
  required: ['subdenom', 'metadata'],
  properties: {
    subdenom: {
      type: 'string',
      minLength: 3,
      maxLength: 44,
      pattern: '^[a-z0-9.-]+$',
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
        description: { type: 'string', maxLength: 500 },
        uri: { 
          type: 'string', 
          maxLength: 500,
          description: 'Logo URI (IPFS hosted webp recommended)'
        },
        uriHash: { 
          type: 'string', 
          maxLength: 100,
          description: 'Hash of the URI (optional)'
        },
        displayDenom: {
          type: 'string',
          maxLength: 50,
          description: 'Custom display denom (defaults to subdenom if not provided)'
        }
      }
    },
    walletId: {
      type: 'string',
      format: 'uuid',
      description: 'Wallet ID for signing (private key will be decrypted from database)'
    },
    network: {
      type: 'string',
      enum: ['mainnet', 'testnet'],
      default: 'testnet'
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
  required: ['amount', 'walletId'],
  properties: {
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
    walletId: {
      type: 'string',
      format: 'uuid',
      description: 'Wallet ID for signing (must be token admin wallet)'
    }
  }
};

const BurnTokensSchema = {
  type: 'object',
  required: ['amount', 'walletId'],
  properties: {
    amount: {
      type: 'string',
      pattern: '^[0-9]+$',
      description: 'Amount to burn (in base units)'
    },
    walletId: {
      type: 'string',
      format: 'uuid',
      description: 'Wallet ID for signing (must be token admin wallet)'
    }
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
      
      // Validate walletId is provided
      if (!body.walletId) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'walletId is required'
        });
      }

      // Fetch wallet from project_wallets table (Injective-specific)
      // Note: wallet_type is stored in lowercase in the database
      const { data: wallet, error: walletError } = await getSupabaseClient()
        .from('project_wallets')
        .select('id, wallet_address, private_key_vault_id, net, non_evm_network')
        .eq('id', body.walletId)
        .eq('wallet_type', 'injective')
        .single();

      if (walletError || !wallet) {
        return reply.code(404).send({
          error: 'Wallet not found',
          message: 'The specified Injective wallet does not exist'
        });
      }

      // Validate wallet is Injective wallet
      if (!wallet.wallet_address.startsWith('inj1')) {
        return reply.code(400).send({
          error: 'Invalid wallet',
          message: 'Selected wallet is not an Injective address'
        });
      }

      // Fetch encrypted private key from key vault
      if (!wallet.private_key_vault_id) {
        return reply.code(500).send({
          error: 'Key vault not configured',
          message: 'This wallet does not have a key vault entry'
        });
      }

      const { data: keyVaultEntry, error: keyVaultError } = await getSupabaseClient()
        .from('key_vault_keys')
        .select('encrypted_key')
        .eq('id', wallet.private_key_vault_id)
        .single();

      if (keyVaultError || !keyVaultEntry) {
        return reply.code(500).send({
          error: 'Key vault error',
          message: 'Failed to retrieve private key from key vault'
        });
      }

      // Decrypt private key using backend encryption service
      const { WalletEncryptionService } = await import('../services/security/walletEncryptionService');
      let privateKey: string;
      
      try {
        // Decrypt from key vault
        privateKey = await WalletEncryptionService.decrypt(keyVaultEntry.encrypted_key);
        
        // Validate decrypted key is not empty
        if (!privateKey || privateKey.trim() === '') {
          throw new Error('Decrypted private key is empty');
        }
        
        // Remove 0x prefix if present (Injective SDK expects hex without prefix)
        if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
          privateKey = privateKey.slice(2);
        }
        
        // Validate it looks like a hex private key (64 hex characters)
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          fastify.log.error({ 
            keyLength: privateKey.length,
            keyPrefix: privateKey.substring(0, 10)
          }, 'Decrypted key does not look like a valid private key');
          throw new Error('Decrypted private key is not in valid hex format');
        }
        
        fastify.log.info('✅ Private key decrypted and validated successfully');
      } catch (decryptError: any) {
        fastify.log.error({ 
          error: decryptError,
          errorMessage: decryptError.message,
          walletId: body.walletId,
          vaultId: wallet.private_key_vault_id
        }, 'Failed to decrypt private key from key vault');
        
        // Check if it's a master password issue
        if (decryptError.message && decryptError.message.includes('WALLET_MASTER_PASSWORD')) {
          return reply.code(500).send({
            error: 'Configuration error',
            message: 'Server encryption is not configured. Please contact support.',
            details: {
              code: 'MASTER_PASSWORD_MISSING',
              suggestion: 'The WALLET_MASTER_PASSWORD environment variable must be configured on the server.'
            }
          });
        }
        
        return reply.code(500).send({
          error: 'Decryption failed',
          message: 'Failed to decrypt wallet private key from key vault',
          details: {
            code: 'DECRYPTION_ERROR',
            message: decryptError.message,
            suggestion: 'The wallet encryption key may be corrupted or the master password may have changed. Please contact support.'
          }
        });
      }

      // Import service from backend services
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');
      
      // Determine network (default to testnet for safety)
      const network = body.network || wallet.net || 'testnet';
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
        wallet.wallet_address, // Use wallet address as creator
        privateKey,
        false // useHSM - always false when using wallet service
      );

      if (!result.success) {
        // Provide detailed error messages
        let errorMessage = result.error || 'Token creation failed';
        let errorDetails = {};

        // Check for common error patterns and provide guidance
        if (errorMessage.includes('insufficient funds')) {
          errorDetails = {
            code: 'INSUFFICIENT_FUNDS',
            suggestion: network === 'testnet' 
              ? 'Get testnet INJ from: https://testnet.faucet.injective.network/'
              : 'Your wallet needs more INJ for gas fees'
          };
        } else if (errorMessage.includes('subdenom')) {
          errorDetails = {
            code: 'INVALID_SUBDENOM',
            suggestion: 'Subdenom must be 3-44 characters with only lowercase letters, numbers, periods, and dashes'
          };
        } else if (errorMessage.includes('metadata')) {
          errorDetails = {
            code: 'INVALID_METADATA',
            suggestion: 'Check that token name and symbol are provided and within length limits'
          };
        } else if (errorMessage.includes('already exists')) {
          errorDetails = {
            code: 'DENOM_EXISTS',
            suggestion: 'This subdenom has already been used. Try a different subdenom.'
          };
        }

        fastify.log.error({ 
          error: result.error,
          subdenom: body.subdenom,
          network,
          creatorAddress: wallet.wallet_address
        }, 'Token creation failed');

        return reply.code(400).send({
          error: 'Token creation failed',
          message: errorMessage,
          details: errorDetails
        });
      }

      // Save to database
      const { data: tokenRecord, error: dbError } = await getSupabaseClient()
        .from('injective_native_tokens')
        .insert({
          project_id: body.projectId || null,
          denom: result.denom,
          subdenom: body.subdenom,
          creator_address: wallet.wallet_address, // Use wallet address
          total_supply: body.initialSupply || '0',
          circulating_supply: body.initialSupply || '0',
          name: body.metadata.name,
          symbol: body.metadata.symbol,
          decimals: body.metadata.decimals,
          description: body.metadata.description,
          admin_address: wallet.wallet_address, // Use wallet address
          network,
          chain_id: network === 'mainnet' ? 'injective-1' : 'injective-888',
          creation_tx_hash: result.txHash,
          status: 'active'
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error({ 
          error: dbError,
          denom: result.denom,
          txHash: result.txHash 
        }, 'Failed to save token to database');
        
        // Token was created on-chain but database save failed
        // Still return success but warn about database issue
        return reply.send({
          success: true,
          denom: result.denom,
          txHash: result.txHash,
          tokenId: null,
          warning: 'Token created successfully but failed to save to database. Please contact support.'
        });
      }

      fastify.log.info({
        tokenId: tokenRecord.id,
        denom: result.denom,
        network,
        creatorAddress: wallet.wallet_address
      }, 'Token created and saved successfully');

      return reply.send({
        success: true,
        denom: result.denom,
        txHash: result.txHash,
        tokenId: tokenRecord?.id
      });

    } catch (error: any) {
      fastify.log.error({ 
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        subdenom: request.body ? (request.body as any).subdenom : 'unknown',
        walletId: request.body ? (request.body as any).walletId : 'unknown'
      }, 'Error creating Injective token');
      
      // Provide user-friendly error messages
      let userMessage = 'An unexpected error occurred while creating the token';
      let errorDetails: any = {
        code: 'INTERNAL_ERROR',
        suggestion: 'Please try again. If the problem persists, contact support.'
      };

      if (error.message) {
        if (error.message.includes('timeout')) {
          userMessage = 'Request timed out';
          errorDetails = {
            code: 'TIMEOUT',
            suggestion: 'The blockchain network may be congested. Please wait a moment and try again.'
          };
        } else if (error.message.includes('network')) {
          userMessage = 'Network connection error';
          errorDetails = {
            code: 'NETWORK_ERROR',
            suggestion: 'Check your internet connection and ensure the Injective RPC is accessible.'
          };
        } else if (error.message.includes('parse') || error.message.includes('JSON')) {
          userMessage = 'Invalid response from blockchain';
          errorDetails = {
            code: 'PARSE_ERROR',
            suggestion: 'The blockchain returned an unexpected response. Please try again.'
          };
        }
      }

      return reply.code(500).send({
        error: 'Internal server error',
        message: userMessage,
        details: errorDetails
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

      // Get token from database
      const { data: token, error: tokenError } = await getSupabaseClient()
        .from('injective_native_tokens')
        .select('network, admin_address')
        .eq('denom', denom)
        .single();

      if (tokenError || !token) {
        return reply.code(404).send({
          error: 'Token not found',
          message: 'The specified token does not exist'
        });
      }

      // Fetch wallet from project_wallets
      const { data: wallet, error: walletError } = await getSupabaseClient()
        .from('project_wallets')
        .select('id, wallet_address, private_key_vault_id')
        .eq('id', body.walletId)
        .eq('wallet_type', 'injective')
        .single();

      if (walletError || !wallet) {
        return reply.code(404).send({
          error: 'Wallet not found',
          message: 'The specified wallet does not exist'
        });
      }

      // Verify wallet is the token admin
      if (wallet.wallet_address !== token.admin_address) {
        return reply.code(403).send({
          error: 'Unauthorized',
          message: 'This wallet is not authorized to mint tokens for this denom'
        });
      }

      // Fetch encrypted private key
      if (!wallet.private_key_vault_id) {
        return reply.code(500).send({
          error: 'Key vault not configured',
          message: 'This wallet does not have a key vault entry'
        });
      }

      const { data: keyVaultEntry, error: keyVaultError } = await getSupabaseClient()
        .from('key_vault_keys')
        .select('encrypted_key')
        .eq('id', wallet.private_key_vault_id)
        .single();

      if (keyVaultError || !keyVaultEntry) {
        return reply.code(500).send({
          error: 'Key vault error',
          message: 'Failed to retrieve private key from key vault'
        });
      }

      // Decrypt private key
      const { WalletEncryptionService } = await import('../services/security/walletEncryptionService');
      let privateKey: string;
      
      try {
        privateKey = await WalletEncryptionService.decrypt(keyVaultEntry.encrypted_key);
        
        if (!privateKey || privateKey.trim() === '') {
          throw new Error('Decrypted private key is empty');
        }
        
        if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
          privateKey = privateKey.slice(2);
        }
        
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error('Decrypted private key is not in valid hex format');
        }
      } catch (decryptError: any) {
        fastify.log.error({ error: decryptError }, 'Failed to decrypt private key');
        return reply.code(500).send({
          error: 'Decryption failed',
          message: 'Failed to decrypt wallet private key'
        });
      }

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      const service = token.network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      // Mint tokens
      const txHash = await service.mintTokens(
        {
          denom: denom,
          amount: body.amount,
          recipient: body.recipient || wallet.wallet_address
        },
        wallet.wallet_address,
        privateKey,
        false
      );

      // Update total supply in database
      const { error: updateError } = await getSupabaseClient().rpc('increment_token_supply', {
        p_denom: denom,
        p_amount: body.amount
      });

      if (updateError) {
        fastify.log.error({ error: updateError }, 'Failed to update token supply');
      }

      fastify.log.info({
        denom,
        amount: body.amount,
        txHash
      }, 'Tokens minted successfully');

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

      // Get token from database
      const { data: token, error: tokenError } = await getSupabaseClient()
        .from('injective_native_tokens')
        .select('network, admin_address')
        .eq('denom', denom)
        .single();

      if (tokenError || !token) {
        return reply.code(404).send({
          error: 'Token not found',
          message: 'The specified token does not exist'
        });
      }

      // Fetch wallet from project_wallets
      const { data: wallet, error: walletError } = await getSupabaseClient()
        .from('project_wallets')
        .select('id, wallet_address, private_key_vault_id')
        .eq('id', body.walletId)
        .eq('wallet_type', 'injective')
        .single();

      if (walletError || !wallet) {
        return reply.code(404).send({
          error: 'Wallet not found',
          message: 'The specified wallet does not exist'
        });
      }

      // Verify wallet is the token admin
      if (wallet.wallet_address !== token.admin_address) {
        return reply.code(403).send({
          error: 'Unauthorized',
          message: 'This wallet is not authorized to burn tokens for this denom'
        });
      }

      // Fetch encrypted private key
      if (!wallet.private_key_vault_id) {
        return reply.code(500).send({
          error: 'Key vault not configured',
          message: 'This wallet does not have a key vault entry'
        });
      }

      const { data: keyVaultEntry, error: keyVaultError } = await getSupabaseClient()
        .from('key_vault_keys')
        .select('encrypted_key')
        .eq('id', wallet.private_key_vault_id)
        .single();

      if (keyVaultError || !keyVaultEntry) {
        return reply.code(500).send({
          error: 'Key vault error',
          message: 'Failed to retrieve private key from key vault'
        });
      }

      // Decrypt private key
      const { WalletEncryptionService } = await import('../services/security/walletEncryptionService');
      let privateKey: string;
      
      try {
        privateKey = await WalletEncryptionService.decrypt(keyVaultEntry.encrypted_key);
        
        if (!privateKey || privateKey.trim() === '') {
          throw new Error('Decrypted private key is empty');
        }
        
        if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
          privateKey = privateKey.slice(2);
        }
        
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error('Decrypted private key is not in valid hex format');
        }
      } catch (decryptError: any) {
        fastify.log.error({ error: decryptError }, 'Failed to decrypt private key');
        return reply.code(500).send({
          error: 'Decryption failed',
          message: 'Failed to decrypt wallet private key'
        });
      }

      // Import service
      const { injectiveNativeTokenServiceTestnet, injectiveNativeTokenServiceMainnet } = 
        await import('../services/injective');

      const service = token.network === 'mainnet'
        ? injectiveNativeTokenServiceMainnet
        : injectiveNativeTokenServiceTestnet;

      // Burn tokens
      const txHash = await service.burnTokens(
        {
          denom: denom,
          amount: body.amount
        },
        wallet.wallet_address,
        privateKey,
        false
      );

      // Update total supply in database
      const { error: updateError } = await getSupabaseClient().rpc('decrement_token_supply', {
        p_denom: denom,
        p_amount: body.amount
      });

      if (updateError) {
        fastify.log.error({ error: updateError }, 'Failed to update token supply');
      }

      fastify.log.info({
        denom,
        amount: body.amount,
        txHash
      }, 'Tokens burned successfully');

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
