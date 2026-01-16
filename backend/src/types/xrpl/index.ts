/**
 * XRPL Backend Types
 * Type definitions for XRPL backend operations
 */

// ============================================================================
// MPT (Multi-Purpose Token) Types
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
    assetClass?: string
    assetSubclass?: string
    issuerName?: string
    uris?: Array<{
      uri: string
      category: string
      title: string
    }>
    additionalInfo?: Record<string, any>
  }
  flags: {
    canTransfer?: boolean
    canTrade?: boolean
    canLock?: boolean
    canClawback?: boolean
    requireAuth?: boolean
  }
}

export interface MPTIssuanceRecord {
  id: string
  projectId: string
  mptIssuanceId: string
  issuerAddress: string
  assetScale: number
  maximumAmount: string | null
  outstandingAmount: string
  transferFee: number | null
  metadata: any
  flags: number
  status: string
  transactionHash: string
  createdAt: Date
  updatedAt: Date
}

export interface MPTAuthorizationRequest {
  holderAddress: string
  mptIssuanceId: string
}

export interface MPTTransferRequest {
  senderAddress: string
  destinationAddress: string
  mptIssuanceId: string
  amount: string
}

// ============================================================================
// NFT Types
// ============================================================================

export interface NFTMintRequest {
  minterAddress: string
  projectId?: string
  uri?: string
  flags: {
    burnable?: boolean
    onlyXRP?: boolean
    trustLine?: boolean
    transferable?: boolean
  }
  transferFee?: number
  taxon?: number
}

export interface NFTOfferRequest {
  walletAddress: string
  nftId: string
  offerType: 'sell' | 'buy'
  amount: string
  currency?: string
  issuer?: string
  destination?: string
  owner?: string
  expiration?: number
}

export interface NFTRecord {
  id: string
  nftId: string
  projectId: string | null
  issuerAddress: string
  ownerAddress: string
  taxon: number
  serial: number
  uri: string | null
  name: string | null
  description: string | null
  imageUrl: string | null
  metadataJson: any | null
  transferFee: number | null
  flags: number
  isBurnable: boolean
  isOnlyXrp: boolean
  isTransferable: boolean
  status: string
  mintTransactionHash: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Payment Channel Types
// ============================================================================

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

export interface PaymentChannelRecord {
  id: string
  channelId: string
  sourceAddress: string
  destinationAddress: string
  amount: string
  balance: string
  settleDelay: number
  publicKey: string | null
  cancelAfter: Date | null
  expiration: Date | null
  status: string
  createTransactionHash: string
  closeTransactionHash: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Escrow Types
// ============================================================================

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
  walletAddress: string
  ownerAddress: string
  sequence: number
  condition?: string
  fulfillment?: string
}

export interface EscrowRecord {
  id: string
  ownerAddress: string
  destinationAddress: string
  amount: string
  finishAfter: Date | null
  cancelAfter: Date | null
  condition: string | null
  sequence: number
  status: string
  createTransactionHash: string
  finishTransactionHash: string | null
  cancelTransactionHash: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Check Types
// ============================================================================

export interface CheckCreateRequest {
  senderAddress: string
  destinationAddress: string
  sendMax: string
  currency?: string
  issuer?: string
  destinationTag?: number
  expiration?: number
  invoiceId?: string
}

export interface CheckCashRequest {
  checkId: string
  destinationAddress: string
  amount?: string
  deliverMin?: string
}

export interface CheckRecord {
  id: string
  checkId: string
  senderAddress: string
  destinationAddress: string
  sendMax: string
  currencyCode: string | null
  issuerAddress: string | null
  expiration: Date | null
  invoiceId: string | null
  status: string
  createTransactionHash: string
  cashTransactionHash: string | null
  cancelTransactionHash: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionRequest {
  address: string
  transactionType?: string
  limit?: number
  marker?: string
}

export interface TransactionRecord {
  hash: string
  type: string
  account: string
  destination?: string
  amount?: string
  fee: string
  sequence: number
  ledgerIndex: number
  result: string
  validated: boolean
  timestamp: Date
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookPayload {
  type: string
  transactionHash: string
  ledgerIndex: number
  timestamp: Date
  data: any
}

export interface WebhookSubscription {
  id: string
  projectId: string
  webhookUrl: string
  events: string[]
  active: boolean
  secret?: string
}

// ============================================================================
// Indexer Types
// ============================================================================

export interface IndexerBlock {
  ledgerIndex: number
  ledgerHash: string
  closeTime: Date
  transactionCount: number
  processed: boolean
}

export interface IndexerStatus {
  lastProcessedLedger: number
  currentLedger: number
  isRunning: boolean
  processingSpeed: number // ledgers per second
}

// ============================================================================
// Cache Types
// ============================================================================

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

// ============================================================================
// Monitoring Types
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

// ============================================================================
// Oracle Types
// ============================================================================

export interface OracleSetRequest {
  oracleAddress: string
  oracleDocumentId: number
  provider: string
  uri: string
  assetClass: string
  priceDataSeries: Array<{
    baseAsset: string
    quoteAsset: string
    assetPrice: number
    scale: number
  }>
}

export interface OracleRecord {
  id: string
  oracleAddress: string
  oracleDocumentId: number
  provider: string
  uri: string
  assetClass: string
  lastUpdateTime: Date
  status: string
  createTransactionHash: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Credential Types
// ============================================================================

export interface CredentialIssueRequest {
  issuerAddress: string
  subjectAddress: string
  credentialType: string
  data: Record<string, any>
  expiration?: number
}

export interface CredentialRecord {
  id: string
  credentialId: string
  issuerAddress: string
  subjectAddress: string
  credentialType: string
  data: any
  expiration: Date | null
  status: string
  issueTransactionHash: string
  acceptTransactionHash: string | null
  deleteTransactionHash: string | null
  createdAt: Date
  updatedAt: Date
}
