/**
 * XRPL Backend Types
 * Type definitions for XRPL backend services and routes
 */

// ============================================================================
// Request Types
// ============================================================================

export interface MPTIssuanceRequest {
  projectId: string
  issuerAddress: string
  assetScale: number
  maximumAmount?: string
  transferFee?: number
  metadata: {
    ticker: string
    name: string
    desc: string
    icon?: string
    asset_class?: string
    asset_subclass?: string
    issuer_name?: string
    uris?: Array<{
      uri: string
      category: string
      title: string
    }>
    additional_info?: Record<string, any>
  }
  flags: {
    canTransfer?: boolean
    canTrade?: boolean
    canLock?: boolean
    canClawback?: boolean
    requireAuth?: boolean
  }
}

export interface MPTAuthorizationRequest {
  mptIssuanceId: string
  holderAddress: string
}

export interface MPTTransferRequest {
  mptIssuanceId: string
  senderAddress: string
  destinationAddress: string
  amount: string
}

export interface NFTMintRequest {
  projectId: string
  issuerAddress: string
  uri?: string
  flags?: {
    burnable?: boolean
    onlyXRP?: boolean
    trustLine?: boolean
    transferable?: boolean
  }
  transferFee?: number
  taxon?: number
}

export interface NFTOfferRequest {
  nftId: string
  offerType: 'sell' | 'buy'
  amount: string
  currencyCode?: string
  issuerAddress?: string
  destination?: string
  owner?: string
  expiration?: number
}

export interface PaymentChannelCreateRequest {
  sourceAddress: string
  destinationAddress: string
  amount: string
  settleDelay: number
  publicKey?: string
  cancelAfter?: number
  destinationTag?: number
}

export interface PaymentChannelClaimRequest {
  channelId: string
  destinationAddress: string
  amount: string
  signature?: string
  publicKey?: string
}

export interface EscrowCreateRequest {
  senderAddress: string
  destinationAddress: string
  amount: string
  finishAfter?: number
  cancelAfter?: number
  condition?: string
  destinationTag?: number
}

export interface EscrowFinishRequest {
  ownerAddress: string
  sequence: number
  condition?: string
  fulfillment?: string
}

export interface CheckCreateRequest {
  senderAddress: string
  destinationAddress: string
  sendMax: string
  currencyCode?: string
  issuerAddress?: string
  destinationTag?: number
  expiration?: number
  invoiceID?: string
}

export interface CheckCashRequest {
  checkId: string
  amount?: string
  deliverMin?: string
}

export interface TransactionRequest {
  transactionHash: string
}

// ============================================================================
// Service Types
// ============================================================================

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: Date
  responseTime?: number
  errorMessage?: string
}

export interface MetricData {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  expiresAt: Date
  createdAt: Date
}

export interface CacheStats {
  totalKeys: number
  hitRate: number
  missRate: number
  memoryUsage: number
}

export interface IndexerBlock {
  ledgerIndex: number
  ledgerHash: string
  closeTime: Date
  transactionCount: number
}

export interface IndexerStatus {
  lastProcessedLedger: number
  currentLedger: number
  isRunning: boolean
  processingSpeed: number
}

export interface WebhookSubscription {
  id: string
  projectId: string
  webhookUrl: string
  events: string[]
  secret?: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface WebhookPayload {
  type: string
  data: any
  timestamp: Date
  transactionHash?: string
}

// ============================================================================
// Database Types
// ============================================================================

export interface MPTIssuanceDB {
  id: string
  project_id: string
  mpt_issuance_id?: string
  issuer_address: string
  asset_scale: number
  maximum_amount?: string
  transfer_fee?: number
  metadata: Record<string, any>
  flags: number
  status: string
  transaction_hash?: string
  created_at: Date
  updated_at: Date
}

export interface MPTHolderDB {
  id: string
  mpt_issuance_id: string
  holder_address: string
  balance: string
  authorized: boolean
  locked: boolean
  created_at: Date
  updated_at: Date
}

export interface MPTTransactionDB {
  id: string
  mpt_issuance_id: string
  from_address: string
  to_address: string
  amount: string
  transaction_type: string
  transaction_hash?: string
  status: string
  created_at: Date
}

export interface NFTDB {
  id: string
  nft_id: string
  project_id?: string
  issuer_address: string
  owner_address: string
  taxon: number
  serial: number
  uri?: string
  name?: string
  description?: string
  image_url?: string
  metadata_json?: Record<string, any>
  transfer_fee?: number
  flags: number
  is_burnable: boolean
  is_only_xrp: boolean
  is_transferable: boolean
  status: string
  burned_at?: Date
  mint_transaction_hash?: string
  created_at: Date
  updated_at: Date
}

export interface NFTOfferDB {
  id: string
  offer_index: string
  nft_id: string
  offer_type: string
  owner_address: string
  amount: string
  currency_code?: string
  issuer_address?: string
  destination_address?: string
  expiration?: Date
  status: string
  accepted_at?: Date
  canceled_at?: Date
  transaction_hash?: string
  created_at: Date
  updated_at: Date
}

export interface PaymentChannelDB {
  id: string
  channel_id: string
  project_id?: string
  source_address: string
  destination_address: string
  amount: string
  balance: string
  settle_delay: number
  public_key?: string
  cancel_after?: Date
  expiration?: Date
  status: string
  create_transaction_hash?: string
  close_transaction_hash?: string
  created_at: Date
  updated_at: Date
}

export interface EscrowDB {
  id: string
  project_id?: string
  sender_address: string
  destination_address: string
  amount: string
  sequence: number
  condition?: string
  fulfillment?: string
  finish_after?: Date
  cancel_after?: Date
  status: string
  create_transaction_hash?: string
  finish_transaction_hash?: string
  cancel_transaction_hash?: string
  created_at: Date
  updated_at: Date
}

export interface CheckDB {
  id: string
  check_id: string
  project_id?: string
  sender_address: string
  destination_address: string
  send_max: string
  currency_code?: string
  issuer_address?: string
  expiration?: Date
  invoice_id?: string
  status: string
  create_transaction_hash?: string
  cash_transaction_hash?: string
  cancel_transaction_hash?: string
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}
