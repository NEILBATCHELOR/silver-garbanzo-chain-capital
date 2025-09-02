import { BlockchainNetwork } from '../types'

// Multi-Signature Wallet Types
export interface MultiSigWallet {
  id: string
  name: string
  blockchain: BlockchainNetwork
  address: string
  owners: string[]
  threshold: number
  created_by?: string
  created_at: Date
  updated_at: Date
  status: MultiSigWalletStatus
  blocked_at?: Date
  block_reason?: string
}

export type MultiSigWalletStatus = 'active' | 'pending' | 'blocked' | 'archived'

export interface CreateMultiSigWalletRequest {
  name: string
  blockchain: BlockchainNetwork
  owners: string[]
  threshold: number
  created_by?: string
}

export interface UpdateMultiSigWalletRequest {
  id: string
  name?: string
  owners?: string[]
  threshold?: number
  status?: MultiSigWalletStatus
}

// Transaction Proposal Types
export interface TransactionProposal {
  id: string
  wallet_id: string
  title: string
  description?: string
  to_address: string
  value: string
  data?: string
  nonce?: number
  status: ProposalStatus
  blockchain: BlockchainNetwork
  token_address?: string
  token_symbol?: string
  created_by?: string
  created_at: Date
  updated_at: Date
  signatures: MultiSigSignature[]
  required_signatures: number
  current_signatures: number
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled' | 'expired'

export interface CreateProposalRequest {
  wallet_id: string
  title: string
  description?: string
  to_address: string
  value: string
  data?: string
  blockchain: BlockchainNetwork
  token_address?: string
  token_symbol?: string
  created_by?: string
}

export interface UpdateProposalRequest {
  id: string
  title?: string
  description?: string
  status?: ProposalStatus
}

// Multi-Signature Types
export interface MultiSigSignature {
  id: string
  proposal_id: string
  transaction_hash?: string
  signer: string
  signature: string
  created_at: Date
  updated_at?: Date
}

export interface CreateSignatureRequest {
  proposal_id: string
  signer: string
  signature: string
  transaction_hash?: string
}

export interface SignProposalRequest {
  proposal_id: string
  signer_address: string
  private_key?: string
  passphrase?: string
}

// Multi-Sig Transaction Types
export interface MultiSigTransaction {
  id: string
  wallet_id: string
  destination_wallet_address: string
  value: string
  data: string
  nonce: number
  hash: string
  executed: boolean
  confirmations: number
  required: number
  blockchain: BlockchainNetwork
  token_address?: string
  token_symbol?: string
  to?: string
  description?: string
  created_at: Date
  updated_at: Date
  blockchain_specific_data?: any
}

export interface MultiSigConfirmation {
  id: string
  transaction_id: string
  owner: string
  signature: string
  confirmed: boolean
  signer?: string
  timestamp?: Date
  created_at: Date
}

// Gnosis Safe Types
export interface GnosisSafeConfig {
  masterCopyAddress: string
  proxyFactoryAddress: string
  fallbackHandlerAddress: string
  multiSendAddress: string
  multiSendCallOnlyAddress: string
  compatibilityFallbackHandlerAddress: string
  signMessageLibAddress: string
  createCallAddress: string
  simulateTxAccessorAddress: string
}

export interface GnosisSafeDeploymentRequest {
  owners: string[]
  threshold: number
  saltNonce?: string
}

export interface GnosisSafeTransaction {
  to: string
  value: string
  data: string
  operation: 0 | 1 // 0 = Call, 1 = DelegateCall
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: number
}

// Validation Types
export interface MultiSigValidationResult {
  isValid: boolean
  errors: MultiSigValidationError[]
  warnings: string[]
}

export interface MultiSigValidationError {
  field: string
  message: string
  code: string
}

// Analytics Types
export interface MultiSigAnalytics {
  total_wallets: number
  total_proposals: number
  pending_proposals: number
  executed_transactions: number
  average_confirmation_time: number
  most_active_signers: SignerActivity[]
  blockchain_distribution: Record<BlockchainNetwork, number>
  threshold_distribution: Record<number, number>
}

export interface SignerActivity {
  signer: string
  signatures_count: number
  proposals_created: number
  avg_response_time: number
}

// Service Results
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  errors?: MultiSigValidationError[]
}

// Query Options
export interface MultiSigQueryOptions {
  page?: number
  limit?: number
  status?: MultiSigWalletStatus | ProposalStatus
  blockchain?: BlockchainNetwork
  owner?: string
  created_by?: string
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'threshold'
  sort_order?: 'asc' | 'desc'
}

// Pagination
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextPage?: number
  prevPage?: number
}

// Event Types for Real-time Updates
export interface MultiSigEvent {
  type: MultiSigEventType
  wallet_id: string
  proposal_id?: string
  signature_id?: string
  data: any
  timestamp: Date
}

export type MultiSigEventType = 
  | 'wallet_created'
  | 'wallet_updated'
  | 'proposal_created'
  | 'proposal_signed'
  | 'proposal_executed'
  | 'proposal_rejected'
  | 'threshold_updated'
  | 'owner_added'
  | 'owner_removed'

// Constants
export const MULTI_SIG_CONSTANTS = {
  MIN_THRESHOLD: 1,
  MAX_OWNERS: 50,
  MIN_OWNERS: 1,
  DEFAULT_GAS_MULTIPLIER: 1.2,
  SIGNATURE_EXPIRY_HOURS: 24,
  MAX_PROPOSAL_AGE_DAYS: 30
} as const

// Blockchain-specific Multi-Sig Support
export const MULTI_SIG_SUPPORT: Record<BlockchainNetwork, boolean> = {
  bitcoin: true,      // Bitcoin multi-sig (P2SH, P2WSH)
  ethereum: true,     // Gnosis Safe, custom contracts
  polygon: true,      // Gnosis Safe compatible
  arbitrum: true,     // Gnosis Safe compatible
  optimism: true,     // Gnosis Safe compatible
  avalanche: true,    // Gnosis Safe compatible
  solana: true,       // Squads Protocol, custom multi-sig
  near: true          // NEAR multi-sig contracts
}

// Error Codes
export enum MultiSigErrorCodes {
  INVALID_THRESHOLD = 'INVALID_THRESHOLD',
  INSUFFICIENT_OWNERS = 'INSUFFICIENT_OWNERS',
  DUPLICATE_OWNER = 'DUPLICATE_OWNER',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  PROPOSAL_NOT_FOUND = 'PROPOSAL_NOT_FOUND',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  ALREADY_SIGNED = 'ALREADY_SIGNED',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  PROPOSAL_EXPIRED = 'PROPOSAL_EXPIRED',
  INSUFFICIENT_CONFIRMATIONS = 'INSUFFICIENT_CONFIRMATIONS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  BLOCKCHAIN_NOT_SUPPORTED = 'BLOCKCHAIN_NOT_SUPPORTED'
}
