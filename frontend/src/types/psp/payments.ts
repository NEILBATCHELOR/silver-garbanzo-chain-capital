/**
 * PSP Payments Types
 * Types for payment transactions
 */

export type PaymentType =
  | 'fiat_payment'
  | 'crypto_payment'
  | 'trade'
  | 'fiat_withdrawal'
  | 'fiat_deposit'
  | 'crypto_withdrawal'

export type PaymentDirection = 'inbound' | 'outbound'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type PaymentRail =
  | 'ach'
  | 'wire'
  | 'rtp'
  | 'fednow'
  | 'push_to_card'
  | 'crypto'

export interface PspPayment {
  id: string
  project_id: string
  warp_payment_id: string | null
  payment_type: PaymentType
  direction: PaymentDirection
  source_type: string | null
  source_id: string | null
  destination_type: string | null
  destination_id: string | null
  amount: string
  currency: string
  network: string | null
  asset_symbol: string | null
  payment_rail: PaymentRail | null
  status: PaymentStatus
  error_code: string | null
  error_message: string | null
  memo: string | null
  idempotency_key: string | null
  metadata: Record<string, any> | null
  initiated_at: string
  completed_at: string | null
  failed_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentListFilters {
  project_id?: string
  payment_type?: PaymentType
  direction?: PaymentDirection
  status?: PaymentStatus
  payment_rail?: PaymentRail
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface CreateFiatPaymentRequest {
  project_id: string
  source_wallet_id: string
  destination_account_id: string
  amount: string
  payment_rail?: PaymentRail
  memo?: string
  idempotency_key: string
}

export interface CreateCryptoPaymentRequest {
  project_id: string
  source_wallet_id: string
  destination_account_id: string
  amount: string
  network: string
  memo?: string
  idempotency_key: string
}

export interface PaymentsSummary {
  total_count: number
  total_volume: number
  by_status: Record<PaymentStatus, number>
  by_type: Record<PaymentType, number>
  recent_payments: PspPayment[]
}
