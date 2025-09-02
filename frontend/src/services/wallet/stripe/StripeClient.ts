// Stripe FIAT-to-Stablecoin Integration - Stripe Client
// Phase 1: Foundation & Infrastructure

import Stripe from 'stripe';
import type { 
  StripeConfig, 
  StripeFinancialAccount,
  StripeIntegrationError,
  ServiceResponse 
} from './types';
import { getStripeConfig, createStripeError, debugLog, debugError } from './utils';

/**
 * StripeClient - Core client for Stripe API interactions
 * Handles authentication, stablecoin financial accounts, and crypto onramp
 */
export class StripeClient {
  private stripe: Stripe | undefined;
  private config: StripeConfig;

  constructor() {
    this.config = getStripeConfig();
    
    // Client-side: use publishable key, not secret key
    if (this.config.publishableKey) {
      this.stripe = new Stripe(this.config.publishableKey, {
        apiVersion: this.config.apiVersion,
        typescript: true,
      });
      
      debugLog('StripeClient initialized', { 
        environment: this.config.environment,
        apiVersion: this.config.apiVersion 
      });
    } else {
      debugLog('StripeClient initialized in mock mode - no publishable key provided');
    }
  }

  /**
   * Get the Stripe instance for direct API access
   */
  public getStripe(): Stripe | undefined {
    return this.stripe || undefined;
  }

  /**
   * Check if Stripe is properly initialized
   */
  public isInitialized(): boolean {
    return this.stripe !== undefined;
  }

  /**
   * Get configuration
   */
  public getConfig(): StripeConfig {
    return { ...this.config };
  }

  // ==========================================
  // STABLECOIN FINANCIAL ACCOUNTS
  // ==========================================

  /**
   * Create a stablecoin financial account for a customer
   */
  public async createStablecoinAccount(customerId: string): Promise<ServiceResponse<StripeFinancialAccount>> {
    try {
      debugLog('Creating stablecoin financial account', { customerId });

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const account = await this.stripe.treasury.financialAccounts.create({
        supported_currencies: ['usd'],
        features: {
          card_issuing: { requested: true },
          deposit_insurance: { requested: true },
          inbound_transfers: { 
            ach: { requested: true }
          },
          outbound_transfers: {
            ach: { requested: true },
            us_domestic_wire: { requested: true }
          }
        },
        metadata: {
          customerId,
          purpose: 'stablecoin_conversion',
          created_by: 'chain_capital_integration'
        }
      });

      debugLog('Stablecoin financial account created', { accountId: account.id });

      return {
        success: true,
        data: account as StripeFinancialAccount
      };
    } catch (error) {
      debugError('Failed to create stablecoin account', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create stablecoin account',
        code: 'account_creation_failed'
      };
    }
  }

  /**
   * Retrieve a stablecoin financial account
   */
  public async getStablecoinAccount(accountId: string): Promise<ServiceResponse<StripeFinancialAccount>> {
    try {
      debugLog('Retrieving stablecoin financial account', { accountId });

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const account = await this.stripe.treasury.financialAccounts.retrieve(accountId);

      return {
        success: true,
        data: account as StripeFinancialAccount
      };
    } catch (error) {
      debugError('Failed to retrieve stablecoin account', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account not found',
        code: 'account_not_found'
      };
    }
  }

  /**
   * Get account balance
   */
  public async getAccountBalance(accountId: string): Promise<ServiceResponse<Stripe.Treasury.FinancialAccount.Balance>> {
    try {
      debugLog('Getting account balance', { accountId });

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const account = await this.stripe.treasury.financialAccounts.retrieve(accountId);
      
      return {
        success: true,
        data: account.balance
      };
    } catch (error) {
      debugError('Failed to get account balance', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance',
        code: 'balance_retrieval_failed'
      };
    }
  }

  // ==========================================
  // CRYPTO ONRAMP (FIAT TO STABLECOIN)
  // ==========================================

  /**
   * Create a crypto onramp session for FIAT to stablecoin conversion
   */
  public async createOnrampSession(params: {
    customerId: string;
    amount: number;
    sourceCurrency: string;
    destinationCurrency: string;
    destinationNetwork: string;
    destinationWallet: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<Stripe.Checkout.Session>> {
    try {
      debugLog('Creating crypto onramp session', params);

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: params.customerId,
        mode: 'payment',
        
        payment_method_types: ['card', 'us_bank_account'],
        
        success_url: `${window.location.origin}/wallet/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/wallet/stripe/cancel`,
        
        metadata: {
          conversionType: 'fiat_to_crypto',
          destinationCurrency: params.destinationCurrency,
          destinationNetwork: params.destinationNetwork,
          destinationWallet: params.destinationWallet,
          ...params.metadata
        },

        // Enable crypto onramp features (when available)
        // Note: This is a placeholder for when Stripe fully releases crypto onramp APIs
        line_items: [{
          price_data: {
            currency: params.sourceCurrency.toLowerCase(),
            product_data: {
              name: `${params.destinationCurrency} on ${params.destinationNetwork}`,
              description: `Convert ${params.sourceCurrency} to ${params.destinationCurrency} stablecoin`,
              metadata: {
                type: 'stablecoin_purchase'
              }
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        }],
      });

      debugLog('Crypto onramp session created', { sessionId: session.id });

      return {
        success: true,
        data: session
      };
    } catch (error) {
      debugError('Failed to create onramp session', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create onramp session',
        code: 'onramp_session_failed'
      };
    }
  }

  // ==========================================
  // STABLECOIN PAYMENTS
  // ==========================================

  /**
   * Create a payment intent for stablecoin payments
   */
  public async createStablecoinPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<Stripe.PaymentIntent>> {
    try {
      debugLog('Creating stablecoin payment intent', params);

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        
        payment_method_types: ['card'], // Add stablecoin payment methods when available
        
        metadata: {
          type: 'stablecoin_payment',
          ...params.metadata
        },

        // Enable automatic payment method confirmation
        confirm: false,
        confirmation_method: 'manual',
      });

      debugLog('Stablecoin payment intent created', { paymentIntentId: paymentIntent.id });

      return {
        success: true,
        data: paymentIntent
      };
    } catch (error) {
      debugError('Failed to create payment intent', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
        code: 'payment_intent_failed'
      };
    }
  }

  /**
   * Confirm a payment intent
   */
  public async confirmPaymentIntent(
    paymentIntentId: string, 
    paymentMethodId?: string
  ): Promise<ServiceResponse<Stripe.PaymentIntent>> {
    try {
      debugLog('Confirming payment intent', { paymentIntentId, paymentMethodId });

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${window.location.origin}/wallet/stripe/return`,
      });

      debugLog('Payment intent confirmed', { 
        paymentIntentId: confirmedIntent.id, 
        status: confirmedIntent.status 
      });

      return {
        success: true,
        data: confirmedIntent
      };
    } catch (error) {
      debugError('Failed to confirm payment intent', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
        code: 'payment_confirmation_failed'
      };
    }
  }

  // ==========================================
  // OUTBOUND TRANSFERS (STABLECOIN TO FIAT)
  // ==========================================

  /**
   * Create an outbound transfer from stablecoin account to bank account
   */
  public async createOutboundTransfer(params: {
    financialAccountId: string;
    amount: number;
    currency: string;
    destinationPaymentMethod: string;
    metadata?: Record<string, any>;
  }): Promise<ServiceResponse<Stripe.Treasury.OutboundTransfer>> {
    try {
      debugLog('Creating outbound transfer', params);

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const transfer = await this.stripe.treasury.outboundTransfers.create({
        financial_account: params.financialAccountId,
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        destination_payment_method: params.destinationPaymentMethod,
        
        metadata: {
          type: 'stablecoin_to_fiat',
          ...params.metadata
        }
      });

      debugLog('Outbound transfer created', { transferId: transfer.id });

      return {
        success: true,
        data: transfer
      };
    } catch (error) {
      debugError('Failed to create outbound transfer', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transfer',
        code: 'transfer_creation_failed'
      };
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  /**
   * Construct webhook event from raw body and signature
   */
  public constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    endpointSecret?: string
  ): Stripe.Event | null {
    try {
      const secret = endpointSecret || this.config.webhookSecret;
      
      if (!secret) {
        debugError('Webhook secret not configured');
        return null;
      }

      if (!this.stripe) {
        debugError('Stripe not initialized for webhook construction');
        return null;
      }

      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      
      debugLog('Webhook event constructed', { type: event.type, id: event.id });
      
      return event;
    } catch (error) {
      debugError('Failed to construct webhook event', error);
      return null;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Test connection to Stripe API
   */
  public async testConnection(): Promise<ServiceResponse<boolean>> {
    try {
      debugLog('Testing Stripe API connection');

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      // Try to retrieve account information
      const account = await this.stripe.accounts.retrieve();
      
      debugLog('Stripe API connection successful', { 
        accountId: account.id,
        country: account.country 
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      debugError('Stripe API connection failed', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        code: 'connection_failed'
      };
    }
  }

  /**
   * Get account information
   */
  public async getAccountInfo(): Promise<ServiceResponse<Stripe.Account>> {
    try {
      debugLog('Retrieving account information');

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const account = await this.stripe.accounts.retrieve();

      return {
        success: true,
        data: account
      };
    } catch (error) {
      debugError('Failed to get account info', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account info',
        code: 'account_info_failed'
      };
    }
  }
}

// Export singleton instance
export const stripeClient = new StripeClient();
export default stripeClient;
