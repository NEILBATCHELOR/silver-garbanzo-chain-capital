// Stripe Webhook Handler
// Phase 4: Backend Integration

import { Router, Request, Response } from 'express';
import { stripeClient } from '@/services/wallet/stripe/StripeClient';
import { webhookService } from '@/services/wallet/stripe/WebhookService';

const stripeWebhookRouter = Router();

/**
 * Stripe webhook endpoint
 * Handles all Stripe webhook events for FIAT-to-stablecoin conversion
 */
stripeWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      console.error('Missing stripe-signature header');
      return res.status(400).json({ 
        error: 'Missing stripe-signature header',
        status: 400 
      });
    }

    // Get raw body for webhook signature verification
    const payload = req.body;

    // Construct the webhook event
    const event = stripeClient.constructWebhookEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (!event) {
      console.error('Failed to construct webhook event');
      return res.status(400).json({ 
        error: 'Invalid webhook signature',
        status: 400 
      });
    }

    console.log(`Received Stripe webhook: ${event.type} (${event.id})`);

    // Process the webhook event using the raw payload and signature
    const result = await webhookService.handleWebhook(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (result.success) {
      console.log(`Successfully processed webhook: ${event.type}`);
      return res.status(200).json({ 
        received: true,
        eventId: event.id,
        eventType: event.type
      });
    } else {
      console.error(`Failed to process webhook: ${result.error}`);
      return res.status(500).json({ 
        error: result.error || 'Failed to process webhook',
        status: 500 
      });
    }
  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      status: 500 
    });
  }
});

/**
 * Health check endpoint for Stripe integration
 */
stripeWebhookRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const connectionTest = await stripeClient.testConnection();
    
    if (connectionTest.success) {
      return res.status(200).json({
        status: 'healthy',
        stripe: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(503).json({
        status: 'unhealthy',
        stripe: 'disconnected',
        error: connectionTest.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Stripe health check error:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default stripeWebhookRouter;
