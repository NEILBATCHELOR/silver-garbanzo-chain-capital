/**
 * PSP Webhooks Types
 * Types for webhook management and event handling
 */

export type WebhookStatus = 'active' | 'suspended' | 'failed'
export type WebhookEventStatus = 'pending' | 'delivered' | 'failed'

export interface PspWebhook {
  id: string
  project_id: string
  warp_webhook_id: string | null
  callback_url: string
  auth_username: string
  auth_password_vault_id: string | null
  status: WebhookStatus
  retry_count: number
  last_success_at: string | null
  last_failure_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface PspWebhookEvent {
  id: string
  webhook_id: string | null
  project_id: string
  event_id: string
  event_name: string
  resource_urls: string[]
  payload: Record<string, any>
  status: WebhookEventStatus
  delivery_attempts: number
  delivered_at: string | null
  created_at: string
  updated_at: string
}

// Request/Response interfaces
export interface CreateWebhookRequest {
  callback_url: string
  auth_username: string
  auth_password: string
}

export interface UpdateWebhookRequest {
  callback_url?: string
  auth_username?: string
  auth_password?: string
  status?: WebhookStatus
}

export interface WebhookWithEvents extends PspWebhook {
  recent_events?: PspWebhookEvent[]
  event_count?: number
}

// Event name types based on Warp API documentation
export type WebhookEventName =
  | 'Payment.Initiated'
  | 'Payment.Completed'
  | 'Payment.Failed'
  | 'Payment.Cancelled'
  | 'Trade.Initiated'
  | 'Trade.Completed'
  | 'Trade.Failed'
  | 'Deposit.Received'
  | 'Deposit.Pending'
  | 'Deposit.Rejected'
  | 'Withdrawal.Initiated'
  | 'Withdrawal.Completed'
  | 'Withdrawal.Failed'
  | 'Business.Approved'
  | 'Business.Rejected'
  | 'Business.ReviewRequired'
  | 'Account.Created'
  | 'Account.Verified'
  | 'Account.Suspended'
