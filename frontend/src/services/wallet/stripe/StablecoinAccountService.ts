// Stripe FIAT-to-Stablecoin Integration - Stablecoin Account Service
// Phase 1: Foundation & Infrastructure

import { supabase } from '@/infrastructure/supabaseClient';
import { stripeClient } from './StripeClient';
import type { 
  StablecoinAccount,
  StablecoinAccountInsert,
  StablecoinAccountUpdate,
  ServiceResponse,
  AccountBalance,
  PaginationParams,
  PaginatedResponse 
} from './types';
import { debugLog, debugError, createStripeError } from './utils';

/**
 * StablecoinAccountService - Manages stablecoin accounts
 * Handles database operations and Stripe financial account integration
 */
export class StablecoinAccountService {
  
  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  /**
   * Create a new stablecoin account
   */
  public async createAccount(data: StablecoinAccountInsert): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Creating stablecoin account', { userId: data.userId });

      // Insert into database
      const { data: account, error } = await supabase
        .from('stripe_stablecoin_accounts')
        .insert({
          user_id: data.userId,
          account_id: data.accountId,
          balance_usdc: data.balanceUsdc || 0,
          balance_usdb: data.balanceUsdb || 0,
          account_status: data.accountStatus || 'active'
        })
        .select()
        .single();

      if (error) {
        debugError('Database error creating account', error);
        throw error;
      }

      const mappedAccount = this.mapDatabaseToAccount(account);
      
      debugLog('Stablecoin account created', { accountId: mappedAccount.id });

      return {
        success: true,
        data: mappedAccount
      };
    } catch (error) {
      debugError('Failed to create stablecoin account', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create account',
        code: 'account_creation_failed'
      };
    }
  }

  /**
   * Get stablecoin account by ID
   */
  public async getAccountById(accountId: string): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Getting stablecoin account by ID', { accountId });

      const { data: account, error } = await supabase
        .from('stripe_stablecoin_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Account not found',
            code: 'account_not_found'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToAccount(account)
      };
    } catch (error) {
      debugError('Failed to get account by ID', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account',
        code: 'account_retrieval_failed'
      };
    }
  }

  /**
   * Get stablecoin account by user ID
   */
  public async getAccountByUserId(userId: string): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Getting stablecoin account by user ID', { userId });

      const { data: account, error } = await supabase
        .from('stripe_stablecoin_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Account not found for user',
            code: 'account_not_found'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToAccount(account)
      };
    } catch (error) {
      debugError('Failed to get account by user ID', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account',
        code: 'account_retrieval_failed'
      };
    }
  }

  /**
   * Get stablecoin account by Stripe account ID
   */
  public async getAccountByStripeAccountId(stripeAccountId: string): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Getting stablecoin account by Stripe account ID', { stripeAccountId });

      const { data: account, error } = await supabase
        .from('stripe_stablecoin_accounts')
        .select('*')
        .eq('account_id', stripeAccountId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Account not found',
            code: 'account_not_found'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToAccount(account)
      };
    } catch (error) {
      debugError('Failed to get account by Stripe account ID', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account',
        code: 'account_retrieval_failed'
      };
    }
  }

  /**
   * Update stablecoin account
   */
  public async updateAccount(
    accountId: string, 
    updates: StablecoinAccountUpdate
  ): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Updating stablecoin account', { accountId, updates });

      const updateData: any = {};
      
      if (updates.balanceUsdc !== undefined) updateData.balance_usdc = updates.balanceUsdc;
      if (updates.balanceUsdb !== undefined) updateData.balance_usdb = updates.balanceUsdb;
      if (updates.accountStatus !== undefined) updateData.account_status = updates.accountStatus;

      const { data: account, error } = await supabase
        .from('stripe_stablecoin_accounts')
        .update(updateData)
        .eq('id', accountId)
        .select()
        .single();

      if (error) {
        debugError('Database error updating account', error);
        throw error;
      }

      const mappedAccount = this.mapDatabaseToAccount(account);
      
      debugLog('Stablecoin account updated', { accountId: mappedAccount.id });

      return {
        success: true,
        data: mappedAccount
      };
    } catch (error) {
      debugError('Failed to update stablecoin account', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update account',
        code: 'account_update_failed'
      };
    }
  }

  /**
   * Update account balances
   */
  public async updateBalances(
    accountId: string,
    balances: { balanceUsdc?: number; balanceUsdb?: number }
  ): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Updating account balances', { accountId, balances });

      return this.updateAccount(accountId, balances);
    } catch (error) {
      debugError('Failed to update balances', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update balances',
        code: 'balance_update_failed'
      };
    }
  }

  /**
   * List stablecoin accounts with pagination
   */
  public async listAccounts(
    filters?: {
      userId?: string;
      accountStatus?: string;
    },
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<StablecoinAccount>>> {
    try {
      debugLog('Listing stablecoin accounts', { filters, pagination });

      let query = supabase
        .from('stripe_stablecoin_accounts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters?.accountStatus) {
        query = query.eq('account_status', filters.accountStatus);
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      
      query = query.range(offset, offset + limit - 1);

      // Apply sorting
      const sortBy = pagination?.sortBy || 'created_at';
      const sortOrder = pagination?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data: accounts, error, count } = await query;

      if (error) {
        debugError('Database error listing accounts', error);
        throw error;
      }

      const mappedAccounts = accounts?.map(this.mapDatabaseToAccount) || [];
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          data: mappedAccounts,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      debugError('Failed to list accounts', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list accounts',
        code: 'account_list_failed'
      };
    }
  }

  // ==========================================
  // STRIPE INTEGRATION
  // ==========================================

  /**
   * Create account with Stripe financial account
   */
  public async createAccountWithStripe(
    userId: string,
    customerId?: string
  ): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Creating account with Stripe integration', { userId, customerId });

      // Create Stripe financial account if customerId provided
      let stripeAccountId: string | undefined;
      
      if (customerId) {
        const stripeResponse = await stripeClient.createStablecoinAccount(customerId);
        
        if (!stripeResponse.success || !stripeResponse.data) {
          return {
            success: false,
            error: stripeResponse.error || 'Failed to create Stripe account',
            code: 'stripe_account_creation_failed'
          };
        }
        
        stripeAccountId = stripeResponse.data.id;
      } else {
        // Generate a temporary account ID for tracking
        stripeAccountId = `temp_${Date.now()}_${userId.substring(0, 8)}`;
      }

      // Create local database record
      return this.createAccount({
        userId,
        accountId: stripeAccountId,
        balanceUsdc: 0,
        balanceUsdb: 0,
        accountStatus: 'active'
      });
    } catch (error) {
      debugError('Failed to create account with Stripe', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create account with Stripe',
        code: 'integrated_account_creation_failed'
      };
    }
  }

  /**
   * Sync balance with Stripe
   */
  public async syncBalanceWithStripe(accountId: string): Promise<ServiceResponse<AccountBalance[]>> {
    try {
      debugLog('Syncing balance with Stripe', { accountId });

      // Get local account
      const accountResponse = await this.getAccountById(accountId);
      if (!accountResponse.success || !accountResponse.data) {
        return {
          success: false,
          error: 'Account not found',
          code: 'account_not_found'
        };
      }

      const account = accountResponse.data;

      // Get Stripe balance
      const balanceResponse = await stripeClient.getAccountBalance(account.accountId);
      if (!balanceResponse.success || !balanceResponse.data) {
        return {
          success: false,
          error: balanceResponse.error || 'Failed to get Stripe balance',
          code: 'stripe_balance_failed'
        };
      }

      const stripeBalance = balanceResponse.data;
      
      // Map Stripe balance to local format
      const balances: AccountBalance[] = Object.entries(stripeBalance).map(([currency, balance]) => ({
        currency: currency.toUpperCase(),
        available: (balance as any).available / 100, // Convert from cents
        pending: (balance as any).pending / 100,
        total: ((balance as any).available + (balance as any).pending) / 100
      }));

      // Update local balances (assuming USD maps to USDC for now)
      const usdBalance = balances.find(b => b.currency === 'USD');
      if (usdBalance) {
        await this.updateBalances(accountId, {
          balanceUsdc: usdBalance.total,
          // Keep existing USDB balance for now
          balanceUsdb: account.balanceUsdb
        });
      }

      return {
        success: true,
        data: balances
      };
    } catch (error) {
      debugError('Failed to sync balance with Stripe', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync balance',
        code: 'balance_sync_failed'
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Map database row to StablecoinAccount
   */
  private mapDatabaseToAccount(row: any): StablecoinAccount {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      balanceUsdc: parseFloat(row.balance_usdc) || 0,
      balanceUsdb: parseFloat(row.balance_usdb) || 0,
      accountStatus: row.account_status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Check if user has an account
   */
  public async hasAccount(userId: string): Promise<boolean> {
    try {
      const response = await this.getAccountByUserId(userId);
      return response.success;
    } catch (error) {
      debugError('Error checking if user has account', error);
      return false;
    }
  }

  /**
   * Get or create account for user
   */
  public async getOrCreateAccount(
    userId: string, 
    customerId?: string
  ): Promise<ServiceResponse<StablecoinAccount>> {
    try {
      debugLog('Getting or creating account for user', { userId });

      // Try to get existing account
      const existingResponse = await this.getAccountByUserId(userId);
      if (existingResponse.success) {
        return existingResponse;
      }

      // Create new account if none exists
      return this.createAccountWithStripe(userId, customerId);
    } catch (error) {
      debugError('Failed to get or create account', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get or create account',
        code: 'account_operation_failed'
      };
    }
  }
}

// Export singleton instance
export const stablecoinAccountService = new StablecoinAccountService();
export default stablecoinAccountService;
