// Stripe FIAT-to-Stablecoin Integration - Webhook Service
// Phase 1: Foundation & Infrastructure

import { supabase } from '@/infrastructure/supabaseClient';
import { stripeClient } from './StripeClient';
import { conversionService } from './ConversionService';
import { stablecoinAccountService } from './StablecoinAccountService';
import type Stripe from 'stripe';
import type { 
  WebhookEvent,
  WebhookEventInsert,
  ServiceResponse 
} from './types';
import { 
  debugLog, 
  debugError, 
  createStripeError,
  verifyWebhookSignature 
} from './utils';

/**
 * WebhookService - Handles Stripe webhook events
 * Processes real-time updates from Stripe for conversion transactions
 */
export class WebhookService {

  /**
   * Main webhook handler method
   */
  public async handleWebhook(
    payload: string | Buffer,
    signature: string,
    endpointSecret?: string
  ): Promise<ServiceResponse<boolean>> {
    return this.processWebhook(payload, signature, endpointSecret);
  }

  /**
   * Process incoming webhook from Stripe
   */
  public async processWebhook(
    payload: string | Buffer,
    signature: string,
    endpointSecret?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      debugLog('Processing Stripe webhook', { 
        payloadLength: payload.length,
        hasSignature: !!signature 
      });

      // Construct and verify webhook event
      const event = stripeClient.constructWebhookEvent(payload, signature, endpointSecret);
      if (!event) {
        return {
          success: false,
          error: 'Failed to verify webhook signature',
          code: 'webhook_verification_failed'
        };
      }

      // Store webhook event
      const webhookRecord = await this.storeWebhookEvent({
        stripeEventId: event.id,
        eventType: event.type,
        processed: false,
        data: event.data as any
      });

      if (!webhookRecord.success) {
        debugError('Failed to store webhook event', webhookRecord.error);
        // Continue processing even if storage fails
      }

      // Process the event
      const processResult = await this.handleWebhookEvent(event);
      
      // Mark webhook as processed if successful
      if (processResult.success && webhookRecord.success && webhookRecord.data) {
        await this.markWebhookProcessed(webhookRecord.data.id);
      }

      return processResult;
    } catch (error) {
      debugError('Failed to process webhook', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
        code: 'webhook_processing_failed'
      };
    }
  }

  /**
   * Handle specific webhook event types
   */
  private async handleWebhookEvent(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      debugLog(`Handling webhook event: ${event.type}`, { eventId: event.id });

      switch (event.type) {
        // Checkout session events (FIAT to stablecoin)
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(event);
        
        case 'checkout.session.expired':
          return await this.handleCheckoutSessionExpired(event);

        // Payment intent events (FIAT to stablecoin)
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event);

        // Financial account events (stablecoin to FIAT)
        case 'treasury.financial_account.features_status_updated':
          return await this.handleFinancialAccountUpdated(event);

        // Outbound transfer events (stablecoin to FIAT)
        case 'treasury.outbound_transfer.created':
          return await this.handleOutboundTransferCreated(event);
        
        case 'treasury.outbound_transfer.posted':
          return await this.handleOutboundTransferPosted(event);
        
        case 'treasury.outbound_transfer.failed':
          return await this.handleOutboundTransferFailed(event);

        // Note: Crypto onramp events are not yet available in production Stripe API
        // Uncomment when crypto.onramp_session.updated becomes available
        // case 'crypto.onramp_session.updated':
        //   return await this.handleCryptoOnrampUpdated(event);

        default:
          debugLog(`Unhandled webhook event type: ${event.type}`, { eventId: event.id });
          return { success: true, data: true };
      }
    } catch (error) {
      debugError(`Failed to handle webhook event ${event.type}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Event handling failed',
        code: 'event_handling_failed'
      };
    }
  }

  // ==========================================
  // SPECIFIC EVENT HANDLERS
  // ==========================================

  /**
   * Handle checkout session completed (FIAT to stablecoin)
   */
  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionId = session.metadata?.transactionId;

      if (!transactionId) {
        debugLog('No transaction ID in checkout session metadata', { sessionId: session.id });
        return { success: true, data: true };
      }

      debugLog('Checkout session completed', { 
        sessionId: session.id, 
        transactionId,
        paymentStatus: session.payment_status 
      });

      // Update transaction status
      await conversionService.updateTransaction(transactionId, {
        status: session.payment_status === 'paid' ? 'completed' : 'processing',
        stripeStatus: session.payment_status,
        metadata: {
          stripeSessionId: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency
        }
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle checkout session completed', error);
      throw error;
    }
  }

  /**
   * Handle checkout session expired (FIAT to stablecoin)
   */
  private async handleCheckoutSessionExpired(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionId = session.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Checkout session expired', { sessionId: session.id, transactionId });

      await conversionService.updateTransaction(transactionId, {
        status: 'expired',
        stripeStatus: 'expired',
        errorMessage: 'Checkout session expired'
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle checkout session expired', error);
      throw error;
    }
  }

  /**
   * Handle payment intent succeeded (FIAT to stablecoin)
   */
  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Payment intent succeeded', { 
        paymentIntentId: paymentIntent.id, 
        transactionId,
        amount: paymentIntent.amount 
      });

      // Get charge information separately if needed for fees
      let stripeFee = 0;
      let chargeId = '';
      let receiptUrl = '';

      try {
        const charges = await stripeClient.getStripe().charges.list({
          payment_intent: paymentIntent.id,
          limit: 1
        });

        if (charges.data.length > 0) {
          const charge = charges.data[0];
          stripeFee = charge.application_fee_amount || 0;
          chargeId = charge.id;
          receiptUrl = charge.receipt_url || '';
        }
      } catch (chargeError) {
        debugError('Failed to get charge details', chargeError);
        // Continue without charge details
      }

      await conversionService.updateTransaction(transactionId, {
        status: 'completed',
        stripeStatus: 'succeeded',
        stripeFee,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          chargeId,
          receiptUrl
        }
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle payment intent succeeded', error);
      throw error;
    }
  }

  /**
   * Handle payment intent failed (FIAT to stablecoin)
   */
  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Payment intent failed', { 
        paymentIntentId: paymentIntent.id, 
        transactionId,
        lastPaymentError: paymentIntent.last_payment_error 
      });

      await conversionService.updateTransaction(transactionId, {
        status: 'failed',
        stripeStatus: 'failed',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle payment intent failed', error);
      throw error;
    }
  }

  /**
   * Handle financial account features updated
   */
  private async handleFinancialAccountUpdated(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const account = event.data.object as Stripe.Treasury.FinancialAccount;
      
      debugLog('Financial account updated', { 
        accountId: account.id,
        features: account.features 
      });

      // Update stablecoin account status if needed
      const accountResponse = await stablecoinAccountService.getAccountByStripeAccountId(account.id);
      if (accountResponse.success && accountResponse.data) {
        // Properly handle Stripe account status
        const status = account.status && String(account.status) === 'active' ? 'active' : 'suspended';
        await stablecoinAccountService.updateAccount(accountResponse.data.id, {
          accountStatus: status
        });
      }

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle financial account updated', error);
      throw error;
    }
  }

  /**
   * Handle outbound transfer created (stablecoin to FIAT)
   */
  private async handleOutboundTransferCreated(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const transfer = event.data.object as Stripe.Treasury.OutboundTransfer;
      const transactionId = transfer.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Outbound transfer created', { 
        transferId: transfer.id, 
        transactionId,
        amount: transfer.amount 
      });

      await conversionService.updateTransaction(transactionId, {
        status: 'processing',
        stripeStatus: transfer.status,
        stripeFee: 0 // Fee information may not be available in preview
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle outbound transfer created', error);
      throw error;
    }
  }

  /**
   * Handle outbound transfer posted (stablecoin to FIAT)
   */
  private async handleOutboundTransferPosted(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const transfer = event.data.object as Stripe.Treasury.OutboundTransfer;
      const transactionId = transfer.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Outbound transfer posted', { 
        transferId: transfer.id, 
        transactionId 
      });

      await conversionService.updateTransaction(transactionId, {
        status: 'completed',
        stripeStatus: 'posted'
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle outbound transfer posted', error);
      throw error;
    }
  }

  /**
   * Handle outbound transfer failed (stablecoin to FIAT)
   */
  private async handleOutboundTransferFailed(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const transfer = event.data.object as Stripe.Treasury.OutboundTransfer;
      const transactionId = transfer.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Outbound transfer failed', { 
        transferId: transfer.id, 
        transactionId 
      });

      await conversionService.updateTransaction(transactionId, {
        status: 'failed',
        stripeStatus: 'failed',
        errorMessage: 'Outbound transfer failed'
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle outbound transfer failed', error);
      throw error;
    }
  }

  /**
   * Handle crypto onramp session updated (when available)
   */
  private async handleCryptoOnrampUpdated(event: Stripe.Event): Promise<ServiceResponse<boolean>> {
    try {
      const session = event.data.object as any; // Crypto onramp is still in preview
      const transactionId = session.metadata?.transactionId;

      if (!transactionId) {
        return { success: true, data: true };
      }

      debugLog('Crypto onramp session updated', { 
        sessionId: session.id, 
        transactionId,
        status: session.status 
      });

      let status: string;
      switch (session.status) {
        case 'completed':
          status = 'completed';
          break;
        case 'failed':
          status = 'failed';
          break;
        case 'processing':
        default:
          status = 'processing';
          break;
      }

      await conversionService.updateTransaction(transactionId, {
        status: status as any,
        stripeStatus: session.status,
        transactionHash: session.transaction_hash,
        blockNumber: session.block_number,
        confirmations: session.confirmations || 0
      });

      return { success: true, data: true };
    } catch (error) {
      debugError('Failed to handle crypto onramp updated', error);
      throw error;
    }
  }

  // ==========================================
  // WEBHOOK EVENT STORAGE
  // ==========================================

  /**
   * Store webhook event in database
   */
  private async storeWebhookEvent(data: WebhookEventInsert): Promise<ServiceResponse<WebhookEvent>> {
    try {
      debugLog('Storing webhook event', { eventType: data.eventType, eventId: data.stripeEventId });

      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from('stripe_webhook_events')
        .select('id')
        .eq('stripe_event_id', data.stripeEventId)
        .single();

      if (existingEvent) {
        debugLog('Webhook event already exists', { eventId: data.stripeEventId });
        return {
          success: true,
          data: {
            id: existingEvent.id,
            stripeEventId: data.stripeEventId,
            eventType: data.eventType,
            processed: data.processed || false,
            data: data.data as any, // Cast to any for flexibility with Stripe event data
            createdAt: new Date()
          }
        };
      }

      const { data: webhookEvent, error } = await supabase
        .from('stripe_webhook_events')
        .insert({
          stripe_event_id: data.stripeEventId,
          event_type: data.eventType,
          processed: data.processed || false,
          data: data.data
        })
        .select()
        .single();

      if (error) {
        debugError('Database error storing webhook event', error);
        throw error;
      }

      return {
        success: true,
        data: {
          id: webhookEvent.id,
          stripeEventId: webhookEvent.stripe_event_id,
          eventType: webhookEvent.event_type,
          processed: webhookEvent.processed,
          data: webhookEvent.data as any, // Cast to any for flexibility with Stripe event data
          createdAt: new Date(webhookEvent.created_at)
        }
      };
    } catch (error) {
      debugError('Failed to store webhook event', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store webhook event',
        code: 'webhook_storage_failed'
      };
    }
  }

  /**
   * Mark webhook event as processed
   */
  private async markWebhookProcessed(webhookId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('stripe_webhook_events')
        .update({ processed: true })
        .eq('id', webhookId);

      if (error) {
        debugError('Failed to mark webhook as processed', error);
        throw error;
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark webhook processed',
        code: 'webhook_update_failed'
      };
    }
  }

  // ==========================================
  // WEBHOOK MANAGEMENT
  // ==========================================

  /**
   * List webhook events
   */
  public async listWebhookEvents(
    filters?: {
      eventType?: string;
      processed?: boolean;
      fromDate?: Date;
      toDate?: Date;
    },
    limit: number = 50
  ): Promise<ServiceResponse<WebhookEvent[]>> {
    try {
      let query = supabase
        .from('stripe_webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.processed !== undefined) {
        query = query.eq('processed', filters.processed);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate.toISOString());
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate.toISOString());
      }

      const { data: events, error } = await query;

      if (error) {
        throw error;
      }

      const mappedEvents: WebhookEvent[] = events?.map(event => ({
        id: event.id,
        stripeEventId: event.stripe_event_id,
        eventType: event.event_type,
        processed: event.processed,
        data: event.data as any, // Cast to any for flexibility with Stripe event data
        createdAt: new Date(event.created_at)
      })) || [];

      return {
        success: true,
        data: mappedEvents
      };
    } catch (error) {
      debugError('Failed to list webhook events', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list webhook events',
        code: 'webhook_list_failed'
      };
    }
  }

  /**
   * Retry failed webhook processing
   */
  public async retryWebhookEvent(webhookId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: webhook, error } = await supabase
        .from('stripe_webhook_events')
        .select('*')
        .eq('id', webhookId)
        .single();

      if (error || !webhook) {
        return {
          success: false,
          error: 'Webhook event not found',
          code: 'webhook_not_found'
        };
      }

      // Reconstruct Stripe event
      const stripeEvent: Stripe.Event = {
        id: webhook.stripe_event_id,
        type: webhook.event_type as any,
        data: webhook.data as any, // Cast to any for flexibility with Stripe event data
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Math.floor(new Date(webhook.created_at).getTime() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null }
      };

      // Process the event
      const result = await this.handleWebhookEvent(stripeEvent);

      if (result.success) {
        await this.markWebhookProcessed(webhookId);
      }

      return result;
    } catch (error) {
      debugError('Failed to retry webhook event', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry webhook event',
        code: 'webhook_retry_failed'
      };
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
export default webhookService;
