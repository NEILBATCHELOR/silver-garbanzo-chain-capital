/**
 * PolicyContext.ts
 * Context management for policy evaluation
 */

import type { 
  PolicyContext, 
  UserContext, 
  TokenContext, 
  EnvironmentContext, 
  CryptoOperation 
} from './types';
import { supabase } from '@/infrastructure/database/client';
import { ensureUUID } from '@/utils/shared/formatting/uuidUtils';

export class PolicyContextBuilder {
  private context: Partial<PolicyContext> = {};

  /**
   * Set the crypto operation
   */
  withOperation(operation: CryptoOperation): PolicyContextBuilder {
    this.context.operation = operation;
    return this;
  }

  /**
   * Set user context
   */
  withUser(user: UserContext): PolicyContextBuilder {
    this.context.user = user;
    return this;
  }

  /**
   * Set token context
   */
  withToken(token: TokenContext): PolicyContextBuilder {
    this.context.token = token;
    return this;
  }

  /**
   * Set environment context
   */
  withEnvironment(environment: EnvironmentContext): PolicyContextBuilder {
    this.context.environment = environment;
    return this;
  }

  /**
   * Build the complete context
   */
  build(): PolicyContext {
    if (!this.context.operation) {
      throw new Error('Operation is required for policy context');
    }
    if (!this.context.user) {
      throw new Error('User context is required for policy evaluation');
    }
    if (!this.context.token) {
      throw new Error('Token context is required for policy evaluation');
    }
    if (!this.context.environment) {
      // Provide default environment if not set
      this.context.environment = {
        chainId: this.context.token.chainId,
        network: 'mainnet',
        timestamp: Date.now()
      };
    }

    return this.context as PolicyContext;
  }

  /**
   * Create context from database records
   */
  static async fromDatabase(
    operation: CryptoOperation,
    userId: string,
    tokenId: string
  ): Promise<PolicyContext> {
    const builder = new PolicyContextBuilder();

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ensureUUID(userId))
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user context: ${userError.message}`);
    }

    // Fetch token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', ensureUUID(tokenId))
      .single();

    if (tokenError) {
      throw new Error(`Failed to fetch token context: ${tokenError.message}`);
    }

    // Build user context
    const userContext: UserContext = {
      id: userData.id,
      address: userData.wallet_address || '',
      role: userData.role || 'user',
      permissions: userData.permissions || [],
      kycStatus: userData.kyc_status,
      jurisdiction: userData.jurisdiction,
      metadata: {
        email: userData.email,
        name: userData.full_name
      }
    };

    // Build token context  
    const tokenContext: TokenContext = {
      id: tokenData.id,
      address: tokenData.address || '',
      name: tokenData.name,
      symbol: tokenData.symbol,
      standard: tokenData.standard,
      chainId: tokenData.blockchain || 'ethereum',
      totalSupply: tokenData.total_supply,
      decimals: tokenData.decimals,
      metadata: tokenData.metadata || {}
    };

    // Build environment context
    const environmentContext: EnvironmentContext = {
      chainId: tokenContext.chainId,
      network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
      timestamp: Date.now()
    };

    return builder
      .withOperation(operation)
      .withUser(userContext)
      .withToken(tokenContext)
      .withEnvironment(environmentContext)
      .build();
  }

  /**
   * Create a minimal context for testing
   */
  static createTestContext(
    operation: CryptoOperation,
    overrides?: Partial<PolicyContext>
  ): PolicyContext {
    const defaultContext: PolicyContext = {
      operation,
      user: {
        id: 'test-user-id',
        address: '0x0000000000000000000000000000000000000000',
        role: 'user',
        ...overrides?.user
      },
      token: {
        id: 'test-token-id',
        address: '0x0000000000000000000000000000000000000001',
        name: 'Test Token',
        symbol: 'TEST',
        standard: 'ERC20',
        chainId: 'ethereum',
        ...overrides?.token
      },
      environment: {
        chainId: 'ethereum',
        network: 'testnet',
        timestamp: Date.now(),
        ...overrides?.environment
      }
    };

    return defaultContext;
  }
}
