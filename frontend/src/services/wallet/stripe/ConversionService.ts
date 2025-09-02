// Stripe FIAT-to-Stablecoin Integration - Conversion Service
// Phase 1: Foundation & Infrastructure

import { supabase } from '@/infrastructure/supabaseClient';
import { stripeClient } from './StripeClient';
import { stablecoinAccountService } from './StablecoinAccountService';
import type { 
  ConversionTransaction,
  ConversionTransactionInsert,
  ConversionTransactionUpdate,
  FiatToStablecoinParams,
  FiatToStablecoinResponse,
  StablecoinToFiatParams,
  StablecoinToFiatResponse,
  ServiceResponse,
  ExchangeRate,
  TransactionLimits,
  PaginationParams,
  PaginatedResponse 
} from './types';
import { 
  debugLog, 
  debugError, 
  validateConversionAmount,
  calculateStripeFees,
  estimateNetworkFees,
  isValidWalletAddress,
  createTransactionMetadata,
  formatCurrencyAmount,
  getTransactionLimits
} from './utils';

/**
 * ConversionService - Handles FIAT ↔ Stablecoin conversions
 * Main service for the core functionality of the integration
 */
export class ConversionService {

  // ==========================================
  // FIAT TO STABLECOIN CONVERSION
  // ==========================================

  /**
   * Create FIAT to stablecoin conversion session
   */
  public async createFiatToStablecoinSession(
    params: FiatToStablecoinParams
  ): Promise<ServiceResponse<FiatToStablecoinResponse>> {
    try {
      debugLog('Creating FIAT to stablecoin conversion session', params);

      // Validate input parameters
      const validation = this.validateFiatToStablecoinParams(params);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          code: 'validation_failed'
        };
      }

      // Calculate exchange rate and fees
      const exchangeRate = await this.getExchangeRate(params.fiatCurrency, params.targetStablecoin);
      const stripeFee = calculateStripeFees(params.fiatAmount, 'fiat_to_crypto');
      const networkFee = estimateNetworkFees(params.targetNetwork, params.targetStablecoin);
      const totalFees = stripeFee + networkFee;
      const estimatedAmount = (params.fiatAmount - totalFees) * exchangeRate;

      // Create transaction record
      const transactionData: ConversionTransactionInsert = {
        userId: params.userId,
        conversionType: 'fiat_to_crypto',
        sourceCurrency: params.fiatCurrency,
        sourceAmount: params.fiatAmount,
        destinationCurrency: params.targetStablecoin,
        destinationAmount: estimatedAmount,
        destinationNetwork: params.targetNetwork,
        destinationWallet: params.walletAddress,
        exchangeRate,
        fees: totalFees,
        stripeFee,
        networkFee,
        status: 'pending',
        metadata: createTransactionMetadata(params.userId, 'fiat_to_crypto', params.metadata)
      };

      const transactionResponse = await this.createTransaction(transactionData);
      if (!transactionResponse.success || !transactionResponse.data) {
        return {
          success: false,
          error: transactionResponse.error || 'Failed to create transaction record',
          code: 'transaction_creation_failed'
        };
      }

      const transaction = transactionResponse.data;

      // Create Stripe checkout session
      const sessionResponse = await stripeClient.createOnrampSession({
        customerId: params.userId, // In production, map to Stripe customer ID
        amount: params.fiatAmount,
        sourceCurrency: params.fiatCurrency,
        destinationCurrency: params.targetStablecoin,
        destinationNetwork: params.targetNetwork,
        destinationWallet: params.walletAddress,
        metadata: {
          transactionId: transaction.id,
          conversionType: 'fiat_to_crypto',
          ...params.metadata
        }
      });

      if (!sessionResponse.success || !sessionResponse.data) {
        // Update transaction with error
        await this.updateTransaction(transaction.id, {
          status: 'failed',
          errorMessage: sessionResponse.error || 'Failed to create Stripe session'
        });

        return {
          success: false,
          error: sessionResponse.error || 'Failed to create payment session',
          code: 'stripe_session_failed'
        };
      }

      const session = sessionResponse.data;

      // Update transaction with session details
      await this.updateTransaction(transaction.id, {
        stripeSessionId: session.id,
        status: 'processing'
      });

      const response: FiatToStablecoinResponse = {
        sessionId: session.id,
        clientSecret: session.client_secret || '',
        transactionId: transaction.id,
        estimatedAmount,
        exchangeRate,
        fees: {
          stripeFee,
          networkFee,
          totalFees
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      debugLog('FIAT to stablecoin session created', { 
        sessionId: session.id, 
        transactionId: transaction.id 
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to create FIAT to stablecoin session', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversion session',
        code: 'conversion_session_failed'
      };
    }
  }

  // ==========================================
  // STABLECOIN TO FIAT CONVERSION
  // ==========================================

  /**
   * Create stablecoin to FIAT conversion
   */
  public async createStablecoinToFiatConversion(
    params: StablecoinToFiatParams
  ): Promise<ServiceResponse<StablecoinToFiatResponse>> {
    try {
      debugLog('Creating stablecoin to FIAT conversion', params);

      // Validate input parameters
      const validation = this.validateStablecoinToFiatParams(params);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          code: 'validation_failed'
        };
      }

      // Check user's stablecoin balance
      const balanceCheck = await this.checkStablecoinBalance(params.userId, params.stablecoin, params.stablecoinAmount);
      if (!balanceCheck.success) {
        return {
          success: false,
          error: balanceCheck.error || 'Insufficient balance',
          code: 'insufficient_funds'
        };
      }

      // Calculate exchange rate and fees
      const exchangeRate = await this.getExchangeRate(params.stablecoin, params.targetFiatCurrency);
      const stripeFee = calculateStripeFees(params.stablecoinAmount, 'crypto_to_fiat');
      const networkFee = estimateNetworkFees(params.sourceNetwork as any, params.stablecoin);
      const totalFees = stripeFee + networkFee;
      const estimatedAmount = (params.stablecoinAmount * exchangeRate) - totalFees;

      // Create transaction record
      const transactionData: ConversionTransactionInsert = {
        userId: params.userId,
        conversionType: 'crypto_to_fiat',
        sourceCurrency: params.stablecoin,
        sourceAmount: params.stablecoinAmount,
        sourceNetwork: params.sourceNetwork,
        destinationCurrency: params.targetFiatCurrency,
        destinationAmount: estimatedAmount,
        exchangeRate,
        fees: totalFees,
        stripeFee,
        networkFee,
        status: 'pending',
        metadata: createTransactionMetadata(params.userId, 'crypto_to_fiat', params.metadata)
      };

      const transactionResponse = await this.createTransaction(transactionData);
      if (!transactionResponse.success || !transactionResponse.data) {
        return {
          success: false,
          error: transactionResponse.error || 'Failed to create transaction record',
          code: 'transaction_creation_failed'
        };
      }

      const transaction = transactionResponse.data;

      // Get user's Stripe financial account
      const accountResponse = await stablecoinAccountService.getAccountByUserId(params.userId);
      if (!accountResponse.success || !accountResponse.data) {
        await this.updateTransaction(transaction.id, {
          status: 'failed',
          errorMessage: 'Stablecoin account not found'
        });

        return {
          success: false,
          error: 'Stablecoin account not found',
          code: 'account_not_found'
        };
      }

      const account = accountResponse.data;

      // Create outbound transfer
      const transferResponse = await stripeClient.createOutboundTransfer({
        financialAccountId: account.accountId,
        amount: estimatedAmount,
        currency: params.targetFiatCurrency,
        destinationPaymentMethod: params.targetBankAccount,
        metadata: {
          transactionId: transaction.id,
          conversionType: 'crypto_to_fiat',
          sourceStablecoin: params.stablecoin,
          ...params.metadata
        }
      });

      if (!transferResponse.success || !transferResponse.data) {
        await this.updateTransaction(transaction.id, {
          status: 'failed',
          errorMessage: transferResponse.error || 'Failed to create transfer'
        });

        return {
          success: false,
          error: transferResponse.error || 'Failed to create transfer',
          code: 'transfer_creation_failed'
        };
      }

      const transfer = transferResponse.data;

      // Update transaction with transfer details
      await this.updateTransaction(transaction.id, {
        stripePaymentIntentId: transfer.id,
        status: 'processing'
      });

      const response: StablecoinToFiatResponse = {
        transferId: transfer.id,
        transactionId: transaction.id,
        estimatedAmount,
        exchangeRate,
        fees: {
          stripeFee,
          networkFee,
          totalFees
        },
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      };

      debugLog('Stablecoin to FIAT conversion created', { 
        transferId: transfer.id, 
        transactionId: transaction.id 
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to create stablecoin to FIAT conversion', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversion',
        code: 'conversion_failed'
      };
    }
  }

  // ==========================================
  // TRANSACTION MANAGEMENT
  // ==========================================

  /**
   * Create a new conversion transaction
   */
  public async createTransaction(data: ConversionTransactionInsert): Promise<ServiceResponse<ConversionTransaction>> {
    try {
      debugLog('Creating conversion transaction', { userId: data.userId, type: data.conversionType });

      const { data: transaction, error } = await supabase
        .from('stripe_conversion_transactions')
        .insert({
          user_id: data.userId,
          stripe_payment_intent_id: data.stripePaymentIntentId,
          stripe_session_id: data.stripeSessionId,
          conversion_type: data.conversionType,
          source_currency: data.sourceCurrency,
          source_amount: data.sourceAmount,
          source_network: data.sourceNetwork,
          destination_currency: data.destinationCurrency,
          destination_amount: data.destinationAmount,
          destination_network: data.destinationNetwork,
          destination_wallet: data.destinationWallet,
          exchange_rate: data.exchangeRate,
          fees: data.fees,
          stripe_fee: data.stripeFee,
          network_fee: data.networkFee,
          status: data.status || 'pending',
          stripe_status: data.stripeStatus,
          metadata: data.metadata || {}
        })
        .select()
        .single();

      if (error) {
        debugError('Database error creating transaction', error);
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToTransaction(transaction)
      };
    } catch (error) {
      debugError('Failed to create transaction', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction',
        code: 'transaction_creation_failed'
      };
    }
  }

  /**
   * Update conversion transaction
   */
  public async updateTransaction(
    transactionId: string, 
    updates: ConversionTransactionUpdate
  ): Promise<ServiceResponse<ConversionTransaction>> {
    try {
      debugLog('Updating conversion transaction', { transactionId, updates });

      const updateData: any = {};
      
      if (updates.destinationAmount !== undefined) updateData.destination_amount = updates.destinationAmount;
      if (updates.exchangeRate !== undefined) updateData.exchange_rate = updates.exchangeRate;
      if (updates.fees !== undefined) updateData.fees = updates.fees;
      if (updates.stripeFee !== undefined) updateData.stripe_fee = updates.stripeFee;
      if (updates.networkFee !== undefined) updateData.network_fee = updates.networkFee;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.stripeStatus !== undefined) updateData.stripe_status = updates.stripeStatus;
      if (updates.transactionHash !== undefined) updateData.transaction_hash = updates.transactionHash;
      if (updates.blockNumber !== undefined) updateData.block_number = updates.blockNumber;
      if (updates.confirmations !== undefined) updateData.confirmations = updates.confirmations;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;

      const { data: transaction, error } = await supabase
        .from('stripe_conversion_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        debugError('Database error updating transaction', error);
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToTransaction(transaction)
      };
    } catch (error) {
      debugError('Failed to update transaction', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction',
        code: 'transaction_update_failed'
      };
    }
  }

  /**
   * Get conversion transaction by ID
   */
  public async getTransactionById(transactionId: string): Promise<ServiceResponse<ConversionTransaction>> {
    try {
      debugLog('Getting conversion transaction by ID', { transactionId });

      const { data: transaction, error } = await supabase
        .from('stripe_conversion_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Transaction not found',
            code: 'transaction_not_found'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToTransaction(transaction)
      };
    } catch (error) {
      debugError('Failed to get transaction by ID', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transaction',
        code: 'transaction_retrieval_failed'
      };
    }
  }

  /**
   * List user's conversion transactions
   */
  public async listUserTransactions(
    userId: string,
    filters?: {
      conversionType?: 'fiat_to_crypto' | 'crypto_to_fiat';
      status?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination?: PaginationParams
  ): Promise<ServiceResponse<PaginatedResponse<ConversionTransaction>>> {
    try {
      debugLog('Listing user transactions', { userId, filters, pagination });

      let query = supabase
        .from('stripe_conversion_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters?.conversionType) {
        query = query.eq('conversion_type', filters.conversionType);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate.toISOString());
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate.toISOString());
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

      const { data: transactions, error, count } = await query;

      if (error) {
        debugError('Database error listing transactions', error);
        throw error;
      }

      const mappedTransactions = transactions?.map(this.mapDatabaseToTransaction) || [];
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          data: mappedTransactions,
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
      debugError('Failed to list user transactions', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list transactions',
        code: 'transaction_list_failed'
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get exchange rate between currencies
   */
  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // In production, this would fetch real exchange rates from Stripe or external APIs
    // For now, return mock rates
    const mockRates: Record<string, Record<string, number>> = {
      'USD': { 'USDC': 1.0, 'USDB': 1.0 },
      'EUR': { 'USDC': 1.1, 'USDB': 1.1 },
      'GBP': { 'USDC': 1.25, 'USDB': 1.25 },
      'USDC': { 'USD': 1.0, 'EUR': 0.91, 'GBP': 0.8 },
      'USDB': { 'USD': 1.0, 'EUR': 0.91, 'GBP': 0.8 }
    };

    return mockRates[fromCurrency]?.[toCurrency] || 1.0;
  }

  /**
   * Validate FIAT to stablecoin parameters
   */
  private validateFiatToStablecoinParams(params: FiatToStablecoinParams): { isValid: boolean; error?: string } {
    // Validate amount
    const amountValidation = validateConversionAmount(params.fiatAmount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate wallet address
    if (!isValidWalletAddress(params.walletAddress, params.targetNetwork)) {
      return {
        isValid: false,
        error: `Invalid wallet address for ${params.targetNetwork} network`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate stablecoin to FIAT parameters
   */
  private validateStablecoinToFiatParams(params: StablecoinToFiatParams): { isValid: boolean; error?: string } {
    // Validate amount
    const amountValidation = validateConversionAmount(params.stablecoinAmount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    return { isValid: true };
  }

  /**
   * Check stablecoin balance
   */
  private async checkStablecoinBalance(
    userId: string, 
    stablecoin: string, 
    amount: number
  ): Promise<ServiceResponse<boolean>> {
    try {
      const accountResponse = await stablecoinAccountService.getAccountByUserId(userId);
      if (!accountResponse.success || !accountResponse.data) {
        return {
          success: false,
          error: 'Account not found',
          code: 'account_not_found'
        };
      }

      const account = accountResponse.data;
      let balance = 0;

      if (stablecoin === 'USDC') {
        balance = account.balanceUsdc;
      } else if (stablecoin === 'USDB') {
        balance = account.balanceUsdb;
      }

      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient ${stablecoin} balance. Available: ${formatCurrencyAmount(balance, stablecoin)}, Required: ${formatCurrencyAmount(amount, stablecoin)}`,
          code: 'insufficient_funds'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      debugError('Failed to check stablecoin balance', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check balance',
        code: 'balance_check_failed'
      };
    }
  }

  /**
   * Map database row to ConversionTransaction
   */
  private mapDatabaseToTransaction(row: any): ConversionTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeSessionId: row.stripe_session_id,
      conversionType: row.conversion_type,
      sourceCurrency: row.source_currency,
      sourceAmount: parseFloat(row.source_amount),
      sourceNetwork: row.source_network,
      destinationCurrency: row.destination_currency,
      destinationAmount: row.destination_amount ? parseFloat(row.destination_amount) : undefined,
      destinationNetwork: row.destination_network,
      destinationWallet: row.destination_wallet,
      exchangeRate: row.exchange_rate ? parseFloat(row.exchange_rate) : undefined,
      fees: row.fees ? parseFloat(row.fees) : undefined,
      stripeFee: row.stripe_fee ? parseFloat(row.stripe_fee) : undefined,
      networkFee: row.network_fee ? parseFloat(row.network_fee) : undefined,
      status: row.status,
      stripeStatus: row.stripe_status,
      transactionHash: row.transaction_hash,
      blockNumber: row.block_number,
      confirmations: row.confirmations || 0,
      metadata: row.metadata || {},
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Get transaction limits for user
   */
  public getTransactionLimits(): TransactionLimits {
    const limits = getTransactionLimits();
    
    return {
      minAmount: limits.minConversionAmount,
      maxAmount: limits.maxConversionAmount,
      dailyLimit: limits.dailyLimit,
      monthlyLimit: limits.dailyLimit * 30, // Simple calculation
      remainingDaily: limits.dailyLimit, // Would calculate based on today's transactions
      remainingMonthly: limits.dailyLimit * 30 // Would calculate based on month's transactions
    };
  }
}

// Export singleton instance
export const conversionService = new ConversionService();
export default conversionService;
