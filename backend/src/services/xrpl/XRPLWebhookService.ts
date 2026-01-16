/**
 * XRPL Webhook Service
 * Manages webhook subscriptions and delivery for XRPL events
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { WebhookPayload, WebhookSubscription } from '../../types/xrpl'
import { xrplMonitor } from './XRPLMonitorService'
import * as crypto from 'crypto'

export class XRPLWebhookService {
  private supabase: SupabaseClient
  private deliveryQueue: WebhookPayload[] = []
  private isProcessing: boolean = false

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Register a webhook subscription
   */
  async registerWebhook(data: {
    projectId: string
    webhookUrl: string
    events: string[]
    secret?: string
  }): Promise<WebhookSubscription> {
    try {
      const secret = data.secret ?? this.generateSecret()

      const { data: subscription, error } = await this.supabase
        .from('webhook_subscriptions')
        .insert({
          project_id: data.projectId,
          webhook_url: data.webhookUrl,
          events: data.events,
          secret: secret,
          active: true
        })
        .select()
        .single()

      if (error) throw error

      xrplMonitor.recordMetric('webhook_registered', 1)

      return subscription as WebhookSubscription
    } catch (error) {
      xrplMonitor.recordMetric('webhook_registration_error', 1)
      throw error
    }
  }

  /**
   * Unregister a webhook subscription
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('webhook_subscriptions')
        .update({ active: false })
        .eq('id', webhookId)

      if (error) throw error

      xrplMonitor.recordMetric('webhook_unregistered', 1)
    } catch (error) {
      xrplMonitor.recordMetric('webhook_unregistration_error', 1)
      throw error
    }
  }

  /**
   * Get active webhooks for a project
   */
  async getProjectWebhooks(projectId: string): Promise<WebhookSubscription[]> {
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)

    if (error) throw error

    return (data as WebhookSubscription[]) || []
  }

  /**
   * Trigger webhook for an event
   */
  async triggerWebhook(
    eventType: string,
    payload: WebhookPayload
  ): Promise<void> {
    try {
      // Get all subscriptions for this event type
      const { data: subscriptions, error } = await this.supabase
        .from('webhook_subscriptions')
        .select('*')
        .contains('events', [eventType])
        .eq('active', true)

      if (error) throw error

      if (!subscriptions || subscriptions.length === 0) {
        return
      }

      // Queue webhook deliveries
      for (const subscription of subscriptions) {
        this.deliveryQueue.push(payload)
        await this.deliverWebhook(subscription as WebhookSubscription, payload)
      }

      xrplMonitor.recordMetric('webhook_triggered', 1, { event: eventType })
    } catch (error) {
      xrplMonitor.recordMetric('webhook_trigger_error', 1, { event: eventType })
      throw error
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<void> {
    const startTime = Date.now()

    try {
      const signature = this.generateSignature(payload, subscription.secret || '')

      const response = await fetch(subscription.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XRPL-Signature': signature,
          'X-XRPL-Event': payload.type
        },
        body: JSON.stringify(payload)
      })

      const deliveryTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`)
      }

      // Record successful delivery
      await this.recordDelivery(subscription.id, payload, true, deliveryTime)

      xrplMonitor.recordMetric('webhook_delivered', 1)
      xrplMonitor.recordMetric('webhook_delivery_time_ms', deliveryTime)
    } catch (error) {
      const deliveryTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Record failed delivery
      await this.recordDelivery(
        subscription.id, 
        payload, 
        false, 
        deliveryTime, 
        errorMessage
      )

      xrplMonitor.recordMetric('webhook_delivery_error', 1, { 
        error: errorMessage 
      })

      // Disable webhook after 5 consecutive failures
      await this.checkFailureThreshold(subscription.id)
    }
  }

  /**
   * Record webhook delivery attempt
   */
  private async recordDelivery(
    subscriptionId: string,
    payload: WebhookPayload,
    success: boolean,
    deliveryTime: number,
    errorMessage?: string
  ): Promise<void> {
    await this.supabase
      .from('webhook_deliveries')
      .insert({
        subscription_id: subscriptionId,
        event_type: payload.type,
        payload: payload,
        success: success,
        delivery_time_ms: deliveryTime,
        error_message: errorMessage
      })
  }

  /**
   * Check failure threshold and disable webhook if needed
   */
  private async checkFailureThreshold(subscriptionId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('webhook_deliveries')
      .select('success')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data) return

    const recentFailures = data.filter(d => !d.success).length

    if (recentFailures >= 5) {
      await this.unregisterWebhook(subscriptionId)
      xrplMonitor.recordMetric('webhook_auto_disabled', 1, {
        subscription_id: subscriptionId
      })
    }
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: WebhookPayload,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Process delivery queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.deliveryQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      while (this.deliveryQueue.length > 0) {
        const payload = this.deliveryQueue.shift()
        if (payload) {
          await this.triggerWebhook(payload.type, payload)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }
}
