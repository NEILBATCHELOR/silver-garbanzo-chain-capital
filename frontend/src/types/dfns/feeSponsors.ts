/**
 * DFNS Fee Sponsors Types
 * 
 * TypeScript interfaces for DFNS Fee Sponsors API operations.
 * Fee Sponsors enable gasless transactions by allowing designated wallets 
 * to sponsor gas fees for other wallets across supported networks.
 */

import type { DfnsNetwork } from './core';

// =============================================================================
// Fee Sponsor Core Types
// =============================================================================

/**
 * Fee Sponsor Status
 */
export type DfnsFeeSponsorStatus = 'Active' | 'Deactivated' | 'Archived';

/**
 * Sponsored Fee Status
 */
export type DfnsSponsoredFeeStatus = 'Pending' | 'Confirmed';

/**
 * Fee Sponsor Entity
 */
export interface DfnsFeeSponsor {
  /** Unique identifier for the fee sponsor */
  id: string;
  /** ID of the wallet that will sponsor fees */
  walletId: string;
  /** Blockchain network */
  network: DfnsNetwork;
  /** Current status of the fee sponsor */
  status: DfnsFeeSponsorStatus;
  /** ISO 8601 date when fee sponsor was created */
  dateCreated: string;
}

/**
 * Sponsored Fee Entity
 */
export interface DfnsSponsoredFee {
  /** Unique identifier for the sponsored fee */
  id: string;
  /** ID of the entity being sponsored (e.g., walletId) */
  sponsoreeId: string;
  /** ID of the request that was sponsored */
  requestId: string;
  /** Status of the sponsored fee */
  status: DfnsSponsoredFeeStatus;
  /** Fee amount that was paid for the request */
  fee: string;
  /** ISO 8601 date when the request was created */
  dateRequested: string;
  /** ISO 8601 date when the request was confirmed (optional) */
  dateConfirmed?: string;
}

// =============================================================================
// API Request Types
// =============================================================================

/**
 * Create Fee Sponsor Request
 */
export interface DfnsCreateFeeSponsorRequest {
  /** ID of the wallet that will be used to sponsor fees for other wallets */
  walletId: string;
}

/**
 * List Fee Sponsors Request (query parameters)
 */
export interface DfnsListFeeSponsorsRequest {
  /** Maximum number of items to return */
  limit?: number;
  /** Pagination token for next page */
  paginationToken?: string;
}

/**
 * List Sponsored Fees Request (query parameters)
 */
export interface DfnsListSponsoredFeesRequest {
  /** Maximum number of items to return */
  limit?: number;
  /** Pagination token for next page */
  paginationToken?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Create Fee Sponsor Response
 */
export interface DfnsCreateFeeSponsorResponse {
  feeSponsor: DfnsFeeSponsor;
}

/**
 * Get Fee Sponsor Response
 */
export interface DfnsGetFeeSponsorResponse {
  feeSponsor: DfnsFeeSponsor;
}

/**
 * List Fee Sponsors Response
 */
export interface DfnsListFeeSponsorsResponse {
  /** List of fee sponsors */
  items: DfnsFeeSponsor[];
  /** Pagination token for next page (if available) */
  nextPageToken?: string;
}

/**
 * Activate Fee Sponsor Response
 */
export interface DfnsActivateFeeSponsorResponse {
  feeSponsor: DfnsFeeSponsor;
}

/**
 * Deactivate Fee Sponsor Response
 */
export interface DfnsDeactivateFeeSponsorResponse {
  feeSponsor: DfnsFeeSponsor;
}

/**
 * Delete Fee Sponsor Response
 */
export interface DfnsDeleteFeeSponsorResponse {
  feeSponsor: DfnsFeeSponsor;
}

/**
 * List Sponsored Fees Response
 */
export interface DfnsListSponsoredFeesResponse {
  /** List of sponsored fees */
  items: DfnsSponsoredFee[];
  /** Pagination token for next page (if available) */
  nextPageToken?: string;
}

// =============================================================================
// Service Options
// =============================================================================

/**
 * Fee Sponsor Service Options
 */
export interface DfnsFeeSponsorServiceOptions {
  /** Sync operations to local database */
  syncToDatabase?: boolean;
  /** Automatically activate fee sponsor after creation */
  autoActivate?: boolean;
  /** Validate wallet network compatibility */
  validateNetwork?: boolean;
  /** Include fee history in responses */
  includeFeeHistory?: boolean;
}

/**
 * Batch Fee Sponsor Operations Options
 */
export interface DfnsBatchFeeSponsorOptions extends DfnsFeeSponsorServiceOptions {
  /** Continue processing even if some operations fail */
  continueOnError?: boolean;
  /** Maximum number of concurrent operations */
  maxConcurrency?: number;
}

// =============================================================================
// Business Logic Types
// =============================================================================

/**
 * Fee Sponsor Summary (for dashboards)
 */
export interface DfnsFeeSponsorSummary {
  /** Fee sponsor ID */
  feeSponsorId: string;
  /** Associated wallet ID */
  walletId: string;
  /** Wallet name (if available) */
  walletName?: string;
  /** Network */
  network: DfnsNetwork;
  /** Current status */
  status: DfnsFeeSponsorStatus;
  /** Whether the fee sponsor is active */
  isActive: boolean;
  /** Total fees sponsored to date */
  totalFeesSponsored: string;
  /** Number of transactions sponsored */
  transactionCount: number;
  /** Average fee per transaction */
  averageFeePerTransaction: string;
  /** ISO 8601 date created */
  dateCreated: string;
  /** Days since creation */
  daysSinceCreated: number;
  /** Last fee sponsorship date */
  lastSponsorshipDate?: string;
}

/**
 * Sponsored Fee Summary (for analytics)
 */
export interface DfnsSponsoredFeeSummary {
  /** Sponsored fee ID */
  sponsoredFeeId: string;
  /** Fee sponsor ID */
  feeSponsorId: string;
  /** Sponsoree (recipient) ID */
  sponsoreeId: string;
  /** Request ID */
  requestId: string;
  /** Fee amount */
  fee: string;
  /** Status */
  status: DfnsSponsoredFeeStatus;
  /** Network */
  network: DfnsNetwork;
  /** Whether the fee is confirmed */
  isConfirmed: boolean;
  /** Time to confirmation (in seconds, if confirmed) */
  timeToConfirmation?: number;
  /** ISO 8601 date requested */
  dateRequested: string;
  /** ISO 8601 date confirmed */
  dateConfirmed?: string;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Fee Sponsor specific error reasons
 */
export type DfnsFeeSponsorErrorReason =
  | 'INVALID_FEE_SPONSOR_ID'
  | 'INVALID_WALLET_ID'
  | 'NETWORK_NOT_SUPPORTED'
  | 'WALLET_NETWORK_MISMATCH'
  | 'FEE_SPONSOR_NOT_FOUND'
  | 'FEE_SPONSOR_NOT_ACTIVE'
  | 'SPONSORED_FEE_NOT_FOUND'
  | 'INSUFFICIENT_BALANCE_FOR_SPONSORSHIP'
  | 'FEE_SPONSOR_ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'BATCH_OPERATION_FAILED';

/**
 * Batch operation result
 */
export interface DfnsBatchFeeSponsorResult<T> {
  /** Successful operations */
  successful: T[];
  /** Failed operations with errors */
  failed: Array<{
    feeSponsorId: string;
    error: string;
    reason?: DfnsFeeSponsorErrorReason;
  }>;
}

// =============================================================================
// Supported Networks for Fee Sponsoring
// =============================================================================

/**
 * Networks that support fee sponsoring
 */
export const DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS = [
  // Mainnet EVM Networks
  'Ethereum',
  'Arbitrum',
  'Base',
  'Binance',
  'Optimism',
  'Polygon',
  
  // Testnet EVM Networks
  'EthereumSepolia',
  'EthereumHolesky',
  'ArbitrumSepolia',
  'BaseSepolia',
  'BscTestnet',
  'OptimismSepolia',
  'PolygonAmoy',
  
  // Other Networks
  'Solana',
  'SolanaDevnet',
  'Stellar',
  'StellarTestnet',
  
  // Berachain (Testnet)
  'Berachain',
  'BerachainBepolia',
] as const;

/**
 * Fee sponsor supported network type
 */
export type DfnsFeeSponsorSupportedNetwork = typeof DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS[number];

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if network supports fee sponsoring
 */
export function isFeeSponsorSupportedNetwork(network: DfnsNetwork): network is DfnsFeeSponsorSupportedNetwork {
  return DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS.includes(network as DfnsFeeSponsorSupportedNetwork);
}

/**
 * Fee Sponsor ID validation regex
 */
export const DFNS_FEE_SPONSOR_ID_REGEX = /^fs-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{16}$/;

/**
 * Sponsored Fee ID validation regex
 */
export const DFNS_SPONSORED_FEE_ID_REGEX = /^sf-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{15}$/;

/**
 * Validate Fee Sponsor ID format
 */
export function isValidFeeSponsorId(id: string): boolean {
  return DFNS_FEE_SPONSOR_ID_REGEX.test(id);
}

/**
 * Validate Sponsored Fee ID format
 */
export function isValidSponsoredFeeId(id: string): boolean {
  return DFNS_SPONSORED_FEE_ID_REGEX.test(id);
}
