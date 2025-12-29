/**
 * Trade Finance - StataToken Service
 * Manages ERC4626 wrapped commodity tokens with auto-compounding
 */

import { supabase } from '../../infrastructure/database/supabase';
import { createLogger } from '../../utils/logger';

const logger = createLogger('StataTokenService');

// ============ Types ============

export interface StataToken {
  id: string;
  stata_token_address: string;
  ctoken_address: string;
  underlying_address: string;
  commodity_type: string;
  name: string;
  symbol: string;
  total_assets: string;
  total_shares: string;
  deployed_at: string;
  deployer_address: string;
  chain_id: number;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface StataOperation {
  id: string;
  stata_token_address: string;
  user_address: string;
  operation_type: 'wrap' | 'unwrap';
  assets_amount: string;
  shares_amount: string;
  transaction_hash: string;
  block_number: number;
  timestamp: string;
}

export interface DeployStataTokenInput {
  stataTokenAddress: string;
  ctokenAddress: string;
  underlyingAddress: string;
  commodityType: string;
  name: string;
  symbol: string;
  deployerAddress: string;
  chainId?: number;
}

export interface RecordOperationInput {
  stataTokenAddress: string;
  userAddress: string;
  operationType: 'wrap' | 'unwrap';
  assetsAmount: string;
  sharesAmount: string;
  transactionHash: string;
  blockNumber: number;
}

export interface UpdateTotalsInput {
  stataTokenAddress: string;
  totalAssets: string;
  totalShares: string;
}

// ============ Service ============

export class StataTokenService {
  /**
   * Register a newly deployed StataToken
   */
  async deployStataToken(input: DeployStataTokenInput): Promise<StataToken> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .insert({
          stata_token_address: input.stataTokenAddress.toLowerCase(),
          ctoken_address: input.ctokenAddress.toLowerCase(),
          underlying_address: input.underlyingAddress.toLowerCase(),
          commodity_type: input.commodityType,
          name: input.name,
          symbol: input.symbol,
          deployer_address: input.deployerAddress.toLowerCase(),
          chain_id: input.chainId || 1,
          total_assets: '0',
          total_shares: '0',
          is_paused: false,
        })
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to register StataToken');
        throw new Error(`Database error: ${error.message}`);
      }

      logger.info(`StataToken registered: ${input.stataTokenAddress}`);
      return data;
    } catch (error) {
      logger.error({ error }, 'Deploy StataToken error');
      throw error;
    }
  }

  /**
   * Get all StataTokens
   */
  async getAllStataTokens(chainId?: number): Promise<StataToken[]> {
    try {
      let query = supabase
        .from('trade_finance_stata_tokens')
        .select('*')
        .order('deployed_at', { ascending: false });

      if (chainId) {
        query = query.eq('chain_id', chainId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error }, 'Failed to fetch StataTokens');
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Get all StataTokens error');
      throw error;
    }
  }

  /**
   * Get StataToken by address
   */
  async getStataTokenByAddress(address: string): Promise<StataToken | null> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .select('*')
        .eq('stata_token_address', address.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error({ error }, 'Failed to fetch StataToken');
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error({ error }, 'Get StataToken by address error');
      throw error;
    }
  }

  /**
   * Get StataToken by cToken address
   */
  async getStataTokenByCToken(ctokenAddress: string): Promise<StataToken | null> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .select('*')
        .eq('ctoken_address', ctokenAddress.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error({ error }, 'Failed to fetch StataToken by cToken');
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error({ error }, 'Get StataToken by cToken error');
      throw error;
    }
  }

  /**
   * Record a wrap/unwrap operation
   */
  async recordOperation(input: RecordOperationInput): Promise<StataOperation> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_operations')
        .insert({
          stata_token_address: input.stataTokenAddress.toLowerCase(),
          user_address: input.userAddress.toLowerCase(),
          operation_type: input.operationType,
          assets_amount: input.assetsAmount,
          shares_amount: input.sharesAmount,
          transaction_hash: input.transactionHash.toLowerCase(),
          block_number: input.blockNumber,
        })
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to record StataToken operation');
        throw new Error(`Database error: ${error.message}`);
      }

      logger.info(`StataToken operation recorded: ${input.operationType} - ${input.transactionHash}`);
      return data;
    } catch (error) {
      logger.error({ error }, 'Record operation error');
      throw error;
    }
  }

  /**
   * Get operations for a StataToken
   */
  async getOperationsByToken(
    stataTokenAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StataOperation[]> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_operations')
        .select('*')
        .eq('stata_token_address', stataTokenAddress.toLowerCase())
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error({ error }, 'Failed to fetch operations');
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Get operations by token error');
      throw error;
    }
  }

  /**
   * Get operations for a user
   */
  async getOperationsByUser(
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StataOperation[]> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_operations')
        .select('*')
        .eq('user_address', userAddress.toLowerCase())
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error({ error }, 'Failed to fetch user operations');
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Get operations by user error');
      throw error;
    }
  }

  /**
   * Update StataToken totals (called after deposits/withdrawals)
   */
  async updateTotals(input: UpdateTotalsInput): Promise<StataToken> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .update({
          total_assets: input.totalAssets,
          total_shares: input.totalShares,
          updated_at: new Date().toISOString(),
        })
        .eq('stata_token_address', input.stataTokenAddress.toLowerCase())
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to update totals');
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error({ error }, 'Update totals error');
      throw error;
    }
  }

  /**
   * Toggle pause state of a StataToken
   */
  async togglePause(stataTokenAddress: string, isPaused: boolean): Promise<StataToken> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .update({
          is_paused: isPaused,
          updated_at: new Date().toISOString(),
        })
        .eq('stata_token_address', stataTokenAddress.toLowerCase())
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to toggle pause');
        throw new Error(`Database error: ${error.message}`);
      }

      logger.info(`StataToken pause toggled: ${stataTokenAddress} - ${isPaused}`);
      return data;
    } catch (error) {
      logger.error({ error }, 'Toggle pause error');
      throw error;
    }
  }

  /**
   * Get StataTokens by commodity type
   */
  async getStataTokensByCommodity(commodityType: string): Promise<StataToken[]> {
    try {
      const { data, error } = await supabase
        .from('trade_finance_stata_tokens')
        .select('*')
        .eq('commodity_type', commodityType)
        .order('deployed_at', { ascending: false });

      if (error) {
        logger.error({ error }, 'Failed to fetch StataTokens by commodity');
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Get StataTokens by commodity error');
      throw error;
    }
  }

  /**
   * Calculate APR for a StataToken
   * This is a simplified calculation - in production, integrate with RewardsService
   */
  async calculateAPR(stataTokenAddress: string): Promise<number> {
    try {
      const stataToken = await this.getStataTokenByAddress(stataTokenAddress);
      if (!stataToken) {
        throw new Error('StataToken not found');
      }

      // Get operations history to calculate APR
      const operations = await this.getOperationsByToken(stataTokenAddress, 100);

      // Simplified APR calculation
      // In production, this should integrate with:
      // 1. RewardsService for liquidity mining rewards
      // 2. InterestRateService for base cToken yield
      // 3. Time-weighted calculations

      // Placeholder: return 5% base APR
      // TODO: Implement proper APR calculation
      return 5.0;
    } catch (error) {
      logger.error({ error }, 'Calculate APR error');
      throw error;
    }
  }

  /**
   * Get statistics for a StataToken
   */
  async getStataTokenStats(stataTokenAddress: string) {
    try {
      const stataToken = await this.getStataTokenByAddress(stataTokenAddress);
      if (!stataToken) {
        throw new Error('StataToken not found');
      }

      // Get operation counts
      const { count: wrapCount } = await supabase
        .from('trade_finance_stata_operations')
        .select('*', { count: 'exact', head: true })
        .eq('stata_token_address', stataTokenAddress.toLowerCase())
        .eq('operation_type', 'wrap');

      const { count: unwrapCount } = await supabase
        .from('trade_finance_stata_operations')
        .select('*', { count: 'exact', head: true })
        .eq('stata_token_address', stataTokenAddress.toLowerCase())
        .eq('operation_type', 'unwrap');

      // Get unique users
      const { data: uniqueUsers } = await supabase
        .from('trade_finance_stata_operations')
        .select('user_address')
        .eq('stata_token_address', stataTokenAddress.toLowerCase());

      const uniqueUserCount = new Set(uniqueUsers?.map((u: { user_address: string }) => u.user_address) || []).size;

      return {
        stataToken,
        totalWraps: wrapCount || 0,
        totalUnwraps: unwrapCount || 0,
        uniqueUsers: uniqueUserCount,
        totalAssets: stataToken.total_assets,
        totalShares: stataToken.total_shares,
      };
    } catch (error) {
      logger.error({ error }, 'Get stats error');
      throw error;
    }
  }
}
