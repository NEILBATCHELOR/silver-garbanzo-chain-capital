/**
 * XRPL Backend Types
 * Type definitions for XRPL backend operations
 * 
 * Updated to support XLS-89 MPT Metadata Standard and XLS-94 Dynamic MPT
 */

// ============================================================================
// XLS-89 MPT METADATA TYPES
// ============================================================================

/**
 * URI Category per XLS-89
 */
export type URICategory = 'website' | 'social' | 'docs' | 'other';

/**
 * Single URI entry with compressed keys (XLS-89 format)
 */
export interface MPTURI {
  u: string;       // uri
  c: URICategory;  // category
  t: string;       // title
}

/**
 * MPT Metadata in XLS-89 compliant compressed format
 * This gets hex-encoded and stored on-chain
 */
export interface MPTMetadata {
  t: string;                          // ticker (required)
  n: string;                          // name (required)
  d?: string;                         // desc (optional)
  i: string;                          // icon (required)
  ac: string;                         // asset_class (required)
  as?: string;                        // asset_subclass (optional, required if ac='rwa')
  in: string;                         // issuer_name (required)
  us?: MPTURI[];                      // uris (optional)
  ai?: Record<string, any> | string;  // additional_info (optional)
}

/**
 * Expanded metadata format for API requests
 * This format is accepted by API but converted to compressed format
 */
export interface MPTMetadataExpanded {
  ticker: string;
  name: string;
  desc?: string;
  icon: string;
  asset_class: string;
  asset_subclass?: string;
  issuer_name: string;
  uris?: Array<{
    uri: string;
    category: URICategory;
    title: string;
  }>;
  additional_info?: Record<string, any> | string;
}

// ============================================================================
// MPT (Multi-Purpose Token) TYPES
// ============================================================================

/**
 * MPT Issuance Creation Request
 * Supports both compressed and expanded metadata formats
 */
export interface MPTIssuanceRequest {
  projectId: string
  issuerAddress: string
  assetScale: number
  maximumAmount?: string
  transferFee?: number
  // Accept both formats - will be converted to compressed internally
  metadata: MPTMetadata | MPTMetadataExpanded
  flags: {
    canTransfer?: boolean
    canTrade?: boolean
    canLock?: boolean
    canClawback?: boolean
    canEscrow?: boolean
    requireAuth?: boolean
  }
  // XLS-94 Dynamic MPT Support (future)
  mutableFields?: {
    metadata?: boolean      // Allow metadata updates
    transferFee?: boolean   // Allow transfer fee updates
    flags?: boolean         // Allow flag updates
  }
}

/**
 * MPT Issuance Database Record
 * Reflects data stored in mpt_issuances table
 */
export interface MPTIssuanceRecord {
  id: string
  projectId: string
  issuanceId: string              // MPT Issuance ID (192-bit hex)
  issuerAddress: string
  assetScale: number
  maximumAmount: string | null
  outstandingAmount: string
  lockedAmount: string | null
  transferFee: number | null
  sequence: number
  
  // Metadata fields (extracted for quick access)
  ticker: string
  name: string
  description: string | null
  iconUrl: string | null
  assetClass: string | null
  assetSubclass: string | null
  issuerName: string | null
  
  // Full metadata storage
  metadataJson: any               // Parsed metadata (compressed format)
  mptMetadataHex: string | null   // Hex-encoded metadata (on-chain format)
  
  // Flags (extracted for indexing)
  canTransfer: boolean | null
  canTrade: boolean | null
  canLock: boolean | null
  canClawback: boolean | null
  canEscrow: boolean | null
  requireAuth: boolean | null
  flags: number | null            // Raw flags value
  
  // Status
  status: string
  destroyedAt: Date | null
  
  // Transaction tracking
  creationTransactionHash: string
  previousTxnId: string | null
  previousTxnLgrSeq: number | null
  ownerNode: string | null
  
  // Sync tracking
  lastSyncedLedger: number | null
  lastSyncedTx: string | null
  lastSyncedAt: Date | null
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  
  // XLS-94 Dynamic MPT fields (future)
  mutableMetadata?: boolean
  mutableTransferFee?: boolean
  mutableFlags?: boolean
}

/**
 * MPT Authorization Request
 */
export interface MPTAuthorizationRequest {
  holderAddress: string
  mptIssuanceId: string
  unauthorize?: boolean  // Set to true to revoke authorization
}

/**
 * MPT Transfer Request
 */
export interface MPTTransferRequest {
  senderAddress: string
  destinationAddress: string
  mptIssuanceId: string
  amount: string
}

/**
 * MPT Holder Record
 */
export interface MPTHolderRecord {
  id: string
  projectId: string
  issuanceId: string
  holderAddress: string
  balance: string
  lockedAmount: string | null
  holderFlags: number
  authorized: boolean
  previousTxnId: string | null
  previousTxnLgrSeq: number | null
  lastSyncedLedger: number | null
  lastSyncedTx: string | null
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * MPT Update Request (for XLS-94 Dynamic MPT)
 * Only mutable fields can be updated
 */
export interface MPTUpdateRequest {
  issuanceId: string
  updates: {
    metadata?: MPTMetadata | MPTMetadataExpanded
    transferFee?: number
    flags?: {
      locked?: boolean
    }
  }
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
