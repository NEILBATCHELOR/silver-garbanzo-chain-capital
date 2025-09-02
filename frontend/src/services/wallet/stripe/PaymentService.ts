// Stripe FIAT-to-Stablecoin Integration - Payment Service
// Phase 1: Foundation & Infrastructure

import { stripeClient } from './StripeClient';
import { stablecoinAccountService } from './StablecoinAccountService';
import type { 
  ServiceResponse,
  SupportedStablecoin,
  SupportedNetwork,
  StripePaymentIntent 
} from './types';
import { 
  debugLog, 
  debugError, 
  validateConversionAmount,
  calculateStripeFees,
  formatCurrencyAmount,
  createTransactionMetadata
} from './utils';
import type Stripe from 'stripe';

/**
 * PaymentService - Handles stablecoin payment processing
 * Supports accepting stablecoin payments and processing them through Stripe
 */
export class PaymentService {

  // ==========================================
  // STABLECOIN PAYMENT INTENTS
  // ==========================================

  /**
   * Create a stablecoin payment intent
   */
  public async createStablecoinPayment(params: {
    amount: number;
    stablecoin: SupportedStablecoin;
    network: SupportedNetwork;
    customerId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    fees: {
      stripeFee: number;
      networkFee: number;
      totalFees: number;
    };
    expiresAt: Date;
  }>> {
    try {
      debugLog('Creating stablecoin payment', params);

      // Validate amount
      const amountValidation = validateConversionAmount(params.amount);
      if (!amountValidation.isValid) {
        return {
          success: false,
          error: amountValidation.error,
          code: 'invalid_amount'
        };
      }

      // Calculate fees
      const stripeFee = calculateStripeFees(params.amount, 'fiat_to_crypto'); // Using same fee structure
      const networkFee = 0; // No network fees for payment acceptance
      const totalFees = stripeFee + networkFee;

      // Create Stripe payment intent
      const paymentResponse = await stripeClient.createStablecoinPaymentIntent({
        amount: params.amount,
        currency: 'usd', // Convert stablecoin to fiat equivalent
        customerId: params.customerId,
        metadata: {
          stablecoin: params.stablecoin,
          network: params.network,
          type: 'stablecoin_payment',
          ...params.metadata
        }
      });

      if (!paymentResponse.success || !paymentResponse.data) {
        return {
          success: false,
          error: paymentResponse.error || 'Failed to create payment intent',
          code: 'payment_intent_failed'
        };
      }

      const paymentIntent = paymentResponse.data;

      const response = {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amount: params.amount,
        currency: params.stablecoin,
        fees: {
          stripeFee,
          networkFee,
          totalFees
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      debugLog('Stablecoin payment created', { paymentIntentId: paymentIntent.id });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to create stablecoin payment', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
        code: 'payment_creation_failed'
      };
    }
  }

  /**
   * Confirm a stablecoin payment
   */
  public async confirmStablecoinPayment(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<ServiceResponse<{
    status: string;
    amount: number;
    currency: string;
    transactionId: string;
    confirmedAt: Date;
  }>> {
    try {
      debugLog('Confirming stablecoin payment', { paymentIntentId, paymentMethodId });

      const confirmResponse = await stripeClient.confirmPaymentIntent(paymentIntentId, paymentMethodId);
      
      if (!confirmResponse.success || !confirmResponse.data) {
        return {
          success: false,
          error: confirmResponse.error || 'Failed to confirm payment',
          code: 'payment_confirmation_failed'
        };
      }

      const paymentIntent = confirmResponse.data;

      const response = {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        transactionId: paymentIntent.id,
        confirmedAt: new Date()
      };

      debugLog('Stablecoin payment confirmed', { 
        paymentIntentId, 
        status: paymentIntent.status 
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to confirm stablecoin payment', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
        code: 'payment_confirmation_failed'
      };
    }
  }

  // ==========================================
  // PAYMENT PROCESSING
  // ==========================================

  /**
   * Process stablecoin payment and update account balances
   */
  public async processStablecoinPayment(params: {
    paymentIntentId: string;
    userId: string;
    stablecoin: SupportedStablecoin;
    amount: number;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<{
    processed: boolean;
    newBalance: number;
    transactionId: string;
  }>> {
    try {
      debugLog('Processing stablecoin payment', params);

      // Get or create stablecoin account for user
      const accountResponse = await stablecoinAccountService.getOrCreateAccount(params.userId);
      if (!accountResponse.success || !accountResponse.data) {
        return {
          success: false,
          error: accountResponse.error || 'Failed to get account',
          code: 'account_error'
        };
      }

      const account = accountResponse.data;

      // Update balance based on stablecoin type
      const balanceUpdates: any = {};
      let newBalance = 0;

      if (params.stablecoin === 'USDC') {
        newBalance = account.balanceUsdc + params.amount;
        balanceUpdates.balanceUsdc = newBalance;
      } else if (params.stablecoin === 'USDB') {
        newBalance = account.balanceUsdb + params.amount;
        balanceUpdates.balanceUsdb = newBalance;
      }

      // Update account balance
      const updateResponse = await stablecoinAccountService.updateBalances(account.id, balanceUpdates);
      if (!updateResponse.success) {
        return {
          success: false,
          error: updateResponse.error || 'Failed to update balance',
          code: 'balance_update_failed'
        };
      }

      const response = {
        processed: true,
        newBalance,
        transactionId: params.paymentIntentId
      };

      debugLog('Stablecoin payment processed', { 
        userId: params.userId, 
        newBalance,
        stablecoin: params.stablecoin
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to process stablecoin payment', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
        code: 'payment_processing_failed'
      };
    }
  }

  // ==========================================
  // PAYMENT METHODS
  // ==========================================

  /**
   * Create a setup intent for saving payment methods
   */
  public async createSetupIntent(params: {
    customerId: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<{
    setupIntentId: string;
    clientSecret: string;
    status: string;
  }>> {
    try {
      debugLog('Creating setup intent', params);

      const stripe = stripeClient.getStripe();
      
      const setupIntent = await stripe.setupIntents.create({
        customer: params.customerId,
        payment_method_types: params.paymentMethodTypes || ['card'],
        metadata: {
          type: 'stablecoin_payment_method',
          ...params.metadata
        }
      });

      const response = {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret || '',
        status: setupIntent.status
      };

      debugLog('Setup intent created', { setupIntentId: setupIntent.id });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to create setup intent', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create setup intent',
        code: 'setup_intent_failed'
      };
    }
  }

  /**
   * List customer's saved payment methods
   */
  public async listPaymentMethods(
    customerId: string,
    type: string = 'card'
  ): Promise<ServiceResponse<Stripe.PaymentMethod[]>> {
    try {
      debugLog('Listing payment methods', { customerId, type });

      const stripe = stripeClient.getStripe();
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: type as any
      });

      debugLog('Payment methods retrieved', { count: paymentMethods.data.length });

      return {
        success: true,
        data: paymentMethods.data
      };
    } catch (error) {
      debugError('Failed to list payment methods', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list payment methods',
        code: 'payment_methods_failed'
      };
    }
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  /**
   * Create a refund for a stablecoin payment
   */
  public async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<{
    refundId: string;
    amount: number;
    status: string;
    estimatedArrival: Date;
  }>> {
    try {
      debugLog('Creating refund', params);

      const stripe = stripeClient.getStripe();
      
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount ? Math.round(params.amount * 100) : undefined, // Convert to cents
        reason: params.reason as any,
        metadata: {
          type: 'stablecoin_refund',
          ...params.metadata
        }
      });

      const response = {
        refundId: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: refund.status,
        estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5-10 business days
      };

      debugLog('Refund created', { refundId: refund.id });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      debugError('Failed to create refund', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create refund',
        code: 'refund_failed'
      };
    }
  }

  // ==========================================
  // PAYMENT UTILITIES
  // ==========================================

  /**
   * Get payment intent details
   */
  public async getPaymentIntent(paymentIntentId: string): Promise<ServiceResponse<Stripe.PaymentIntent>> {
    try {
      debugLog('Getting payment intent', { paymentIntentId });

      const stripe = stripeClient.getStripe();
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        data: paymentIntent
      };
    } catch (error) {
      debugError('Failed to get payment intent', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment intent',
        code: 'payment_intent_retrieval_failed'
      };
    }
  }

  /**
   * Calculate payment fees
   */
  public calculatePaymentFees(amount: number, paymentMethod: string = 'card'): {
    stripeFee: number;
    networkFee: number;
    totalFees: number;
    netAmount: number;
  } {
    const stripeFee = calculateStripeFees(amount, 'fiat_to_crypto');
    const networkFee = 0; // No network fees for payment acceptance
    const totalFees = stripeFee + networkFee;
    const netAmount = amount - totalFees;

    return {
      stripeFee,
      networkFee,
      totalFees,
      netAmount
    };
  }

  /**
   * Format payment summary
   */
  public formatPaymentSummary(params: {
    amount: number;
    stablecoin: string;
    fees: { stripeFee: number; networkFee: number; totalFees: number };
    paymentMethod: string;
  }): {
    grossAmount: string;
    fees: string;
    netAmount: string;
    currency: string;
  } {
    const netAmount = params.amount - params.fees.totalFees;
    
    return {
      grossAmount: formatCurrencyAmount(params.amount, params.stablecoin),
      fees: formatCurrencyAmount(params.fees.totalFees, params.stablecoin),
      netAmount: formatCurrencyAmount(netAmount, params.stablecoin),
      currency: params.stablecoin
    };
  }

  /**
   * Validate payment parameters
   */
  public validatePaymentParams(params: {
    amount: number;
    stablecoin: string;
    customerId?: string;
  }): { isValid: boolean; error?: string } {
    // Validate amount
    const amountValidation = validateConversionAmount(params.amount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate stablecoin
    if (!['USDC', 'USDB'].includes(params.stablecoin)) {
      return {
        isValid: false,
        error: `Unsupported stablecoin: ${params.stablecoin}`
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
