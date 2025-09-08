/**
 * DFNS Wallet Types
 * 
 * Official DFNS API types for wallets, assets, transfers, and transactions
 * Based on DFNS API documentation: https://docs.dfns.co/d/api-docs/wallets
 */

import type { DfnsStatus, DfnsNetwork } from './core';

// ===============================
// CORE WALLET TYPES
// ===============================

// DFNS Wallet - Official API Structure
export interface DfnsWallet {
  id: string;                    // Wallet ID (wa-xxxx-xxxx-xxxxxxxxxxxxxxxx)
  network: DfnsNetwork;          // Blockchain network
  address: string;               // Wallet address on the network
  name?: string;                 // Optional wallet name
  signingKey: DfnsWalletSigningKey;
  status: 'Active' | 'Archived';
  custodial: boolean;            // Organization-owned vs user-owned
  imported?: boolean;            // Whether wallet was imported
  tags?: string[];               // Wallet tags
  dateCreated: string;           // ISO 8601 date string
  externalId?: string;           // External correlation ID
  delegatedTo?: string;          // End user ID if delegated
}

export interface DfnsWalletSigningKey {
  id: string;                    // Key ID
  scheme: 'ECDSA' | 'EdDSA' | 'Schnorr';
  curve: 'secp256k1' | 'ed25519' | 'stark';
  publicKey: string;             // Hex-encoded public key
  delegatedTo?: string;          // End user ID if delegated
}

// ===============================
// WALLET CRUD OPERATIONS
// ===============================

// Create Wallet Request
export interface DfnsCreateWalletRequest {
  network: DfnsNetwork;          // Required: blockchain network
  name?: string;                 // Optional: wallet name
  externalId?: string;           // Optional: external correlation ID
  tags?: string[];               // Optional: list of tags
  signingKey?: {                 // Optional: reuse existing key
    id: string;                  // Key ID to reuse
  };
  keyScheme?: 'ECDSA' | 'EdDSA' | 'Schnorr';  // Optional: key scheme
  keyCurve?: 'secp256k1' | 'ed25519' | 'stark'; // Optional: key curve
  delegateTo?: string;           // Optional: end user ID to delegate to
  pendingDelegation?: boolean;   // Optional: create for later delegation
}

// Create Wallet Response
export interface DfnsCreateWalletResponse extends DfnsWallet {}

// Update Wallet Request
export interface DfnsUpdateWalletRequest {
  name: string;                  // New wallet name
}

// Update Wallet Response
export interface DfnsUpdateWalletResponse extends DfnsWallet {}

// List Wallets Request
export interface DfnsListWalletsRequest {
  owner?: string;                // Filter by owner (userId or username)
  limit?: number;                // Max items to return (default: 100)
  paginationToken?: string;      // Next page token
}

// List Wallets Response
export interface DfnsListWalletsResponse {
  items: DfnsWallet[];
  nextPageToken?: string;        // Token for next page
}

// Get Wallet Response
export interface DfnsGetWalletResponse extends DfnsWallet {}

// Delete Wallet Response (Archive)
export interface DfnsDeleteWalletResponse extends DfnsWallet {}

// ===============================
// WALLET ASSETS
// ===============================

// Get Wallet Assets Request
export interface DfnsGetWalletAssetsRequest {
  walletId: string;
  includeUsdValue?: boolean;     // Quote total value in USD
}

// Wallet Asset - Base Interface
export interface DfnsWalletAssetBase {
  symbol: string;                // Asset symbol (ETH, BTC, USDC)
  decimals: number;              // Token decimals
  verified: boolean;             // Whether token is verified
  balance: string;               // Balance in smallest unit
  valueInUsd?: string;           // USD value if requested
}

// Native Asset (ETH, BTC, etc.)
export interface DfnsNativeAsset extends DfnsWalletAssetBase {
  kind: 'Native';
}

// ERC-20 Token
export interface DfnsErc20Asset extends DfnsWalletAssetBase {
  kind: 'Erc20';
  contract: string;              // Contract address
}

// Algorand Standard Asset
export interface DfnsAsaAsset extends DfnsWalletAssetBase {
  kind: 'Asa';
  assetId: string;               // Asset ID
}

// Aptos Fungible Asset
export interface DfnsAip21Asset extends DfnsWalletAssetBase {
  kind: 'Aip21';
  metadata: string;              // Metadata address
}

// Solana Token
export interface DfnsSplAsset extends DfnsWalletAssetBase {
  kind: 'Spl' | 'Spl2022';
  mint: string;                  // Mint address
}

// Union type for all assets
export type DfnsWalletAsset = 
  | DfnsNativeAsset 
  | DfnsErc20Asset 
  | DfnsAsaAsset 
  | DfnsAip21Asset 
  | DfnsSplAsset;

// Get Wallet Assets Response
export interface DfnsGetWalletAssetsResponse {
  walletId: string;
  network: DfnsNetwork;
  assets: DfnsWalletAsset[];
  totalValueUsd?: string;        // Total portfolio value in USD
}

// ===============================
// WALLET NFTS
// ===============================

// NFT Base Interface
export interface DfnsWalletNftBase {
  symbol?: string;               // NFT symbol
  tokenUri?: string;             // Metadata URI
}

// Algorand NFT
export interface DfnsAsaNft extends DfnsWalletNftBase {
  kind: 'Asa';
  assetId: string;               // Asset ID
}

// ERC-721 NFT
export interface DfnsErc721Nft extends DfnsWalletNftBase {
  kind: 'Erc721';
  contract: string;              // Contract address
  tokenId: string;               // Token ID
}

// TRC-721 NFT (TRON)
export interface DfnsTrc721Nft extends DfnsWalletNftBase {
  kind: 'Trc721';
  contract: string;              // Contract address
  tokenId: string;               // Token ID
}

// Union type for all NFTs
export type DfnsWalletNft = DfnsAsaNft | DfnsErc721Nft | DfnsTrc721Nft;

// Get Wallet NFTs Response
export interface DfnsGetWalletNftsResponse {
  walletId: string;
  network: DfnsNetwork;
  nfts: DfnsWalletNft[];
}

// ===============================
// WALLET HISTORY
// ===============================

// Wallet History Entry
export interface DfnsWalletHistoryEntry {
  txHash: string;                // Transaction hash
  direction: 'Incoming' | 'Outgoing';
  status: 'Confirmed' | 'Pending' | 'Failed';
  asset: DfnsWalletAsset;        // Asset information
  amount: string;                // Amount transferred
  fee?: string;                  // Transaction fee
  fromAddress?: string;          // Sender address
  toAddress?: string;            // Recipient address
  blockNumber?: number;          // Block number
  timestamp: string;             // ISO 8601 timestamp
  metadata?: Record<string, any>; // Additional metadata
}

// Get Wallet History Response
export interface DfnsGetWalletHistoryResponse {
  walletId: string;
  network: DfnsNetwork;
  history: DfnsWalletHistoryEntry[];
}

// ===============================
// WALLET TAGS
// ===============================

// Add Wallet Tags Request
export interface DfnsAddWalletTagsRequest {
  tags: string[];                // List of tags to add
}

// Add Wallet Tags Response
export interface DfnsAddWalletTagsResponse extends DfnsWallet {}

// Delete Wallet Tags Request
export interface DfnsDeleteWalletTagsRequest {
  tags: string[];                // List of tags to remove
}

// Delete Wallet Tags Response
export interface DfnsDeleteWalletTagsResponse extends DfnsWallet {}

// ===============================
// TRANSFER OPERATIONS
// ===============================

// Transfer Asset Request - Base
export interface DfnsTransferAssetRequestBase {
  kind: string;                  // Asset kind
  to: string;                    // Destination address
  externalId?: string;           // External correlation ID
  feeSponsorId?: string;         // Optional fee sponsor ID for gasless transactions
}

// Native Asset Transfer
export interface DfnsTransferNativeAssetRequest extends DfnsTransferAssetRequestBase {
  kind: 'Native';
  amount: string;                // Amount in smallest unit
}

// ERC-20 Transfer
export interface DfnsTransferErc20AssetRequest extends DfnsTransferAssetRequestBase {
  kind: 'Erc20';
  contract: string;              // Token contract address
  amount: string;                // Amount in smallest unit
}

// ERC-721 Transfer (NFT)
export interface DfnsTransferErc721AssetRequest extends DfnsTransferAssetRequestBase {
  kind: 'Erc721';
  contract: string;              // NFT contract address
  tokenId: string;               // Token ID to transfer
}

// Union type for all transfer requests
export type DfnsTransferAssetRequest = 
  | DfnsTransferNativeAssetRequest 
  | DfnsTransferErc20AssetRequest 
  | DfnsTransferErc721AssetRequest;

// Transfer Request Response
export interface DfnsTransferRequestResponse {
  id: string;                    // Transfer request ID
  walletId: string;              // Source wallet ID
  network: DfnsNetwork;          // Network
  requester: {
    userId?: string;             // Requesting user ID
    tokenId?: string;            // Requesting token ID
  };
  requestBody: DfnsTransferAssetRequest; // Original request
  status: 'Pending' | 'Executing' | 'Confirmed' | 'Failed' | 'Rejected';
  txHash?: string;               // Transaction hash when broadcast
  fee?: string;                  // Transaction fee
  dateRequested: string;         // ISO 8601 date when requested
  dateBroadcasted?: string;      // ISO 8601 date when broadcast
  dateConfirmed?: string;        // ISO 8601 date when confirmed
  failureReason?: string;        // Failure reason if failed
  approvalId?: string;           // Policy approval ID if required
  approvalDecision?: string;     // Policy approval decision
  externalId?: string;           // External correlation ID
}

// List Transfer Requests Response
export interface DfnsListTransferRequestsResponse {
  items: DfnsTransferRequestResponse[];
  nextPageToken?: string;
}

// Get Transfer Request Response
export interface DfnsGetTransferRequestResponse extends DfnsTransferRequestResponse {}

// ===============================
// DEPRECATED OPERATIONS
// ===============================

// Delegate Wallet Request (DEPRECATED - use Delegate Key instead)
export interface DfnsDelegateWalletRequest {
  endUserId: string;             // End user ID to delegate to
}

// Delegate Wallet Response (DEPRECATED)
export interface DfnsDelegateWalletResponse extends DfnsWallet {}

// ===============================
// SERVICE OPTIONS
// ===============================

// Service Options for enhanced functionality
export interface DfnsWalletServiceOptions {
  syncToDatabase?: boolean;      // Sync to Supabase database
  autoActivate?: boolean;        // Auto-activate after creation
  validateNetwork?: boolean;     // Validate network support
  includeMetadata?: boolean;     // Include additional metadata
  cacheResults?: boolean;        // Cache API responses
}

// Pagination Options
export interface DfnsPaginationOptions {
  limit?: number;                // Items per page
  paginationToken?: string;      // Next page token
}

// ===============================
// DATABASE SYNC TYPES
// ===============================

// Database Wallet Entity (for Supabase sync)
export interface DfnsWalletEntity {
  id: string;
  wallet_id: string;
  network: DfnsNetwork;
  name?: string;
  address: string;
  signing_key_id?: string;
  custodial: boolean;
  imported: boolean;
  external_id?: string;
  tags?: string[];
  status: DfnsStatus;
  delegated: boolean;
  delegated_to?: string;
  organization_id?: string;
  project_id?: string;
  investor_id?: string;
  dfns_wallet_id: string;
  created_at: string;
  updated_at: string;
}
