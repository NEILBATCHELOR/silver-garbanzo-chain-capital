/**
 * DFNS SDK Type Mappers - Convert between DFNS SDK types and domain types
 * 
 * This file contains mapper functions to convert DFNS SDK API response types
 * to our domain model types, handling type compatibility issues.
 */

// Import our domain types
import type {
  Wallet,
  SigningKey,
  TransferResponse,
  SignatureResponse,
  WalletBalance,
  TransactionHistory,
  NFT,
  Asset
} from './domain';

import { DfnsNetwork, DfnsCurve, DfnsScheme } from './core';

// ===== DFNS SDK Response Interface Definitions =====
// Since @dfns/sdk doesn't export response types, we define them here

export interface DfnsCreateWalletResponse {
  id: string;
  network: string;
  name?: string;
  address?: string; // Make address optional to match SDK
  signingKey?: {
    id?: string;
    publicKey?: string;
    curve?: string;
    scheme?: string;
    status?: string;
    imported?: boolean;
    exported?: boolean;
    dateExported?: string;
  };
  custodial?: boolean;
  imported?: boolean;
  exported?: boolean;
  dateExported?: string;
  externalId?: string;
  tags?: string[];
  status?: string;
  delegated?: boolean;
  delegatedTo?: string;
  dateCreated?: string;
}

export interface DfnsGetWalletResponse extends DfnsCreateWalletResponse {}

export interface DfnsListWalletsResponse {
  items?: DfnsCreateWalletResponse[];
  nextPageToken?: string;
}

export interface DfnsCreateKeyResponse {
  id: string;
  publicKey: string;
  curve: string;
  scheme: string;
  status: string;
  imported?: boolean;
  exported?: boolean;
  dateExported?: string;
  dateCreated?: string;
}

export interface DfnsGetKeyResponse extends DfnsCreateKeyResponse {}

export interface DfnsListKeysResponse {
  items?: DfnsCreateKeyResponse[];
  nextPageToken?: string;
}

export interface DfnsTransferAssetResponse {
  id: string;
  status: string;
  txHash?: string;
  fee?: string;
  dateCreated?: string;
  dateBroadcast?: string;
  dateConfirmed?: string;
}

export interface DfnsGenerateSignatureResponse {
  id: string;
  status: string;
  signature?: {
    encoded?: string;
    publicKey?: string;
  };
  dateCreated?: string;
}

export interface DfnsGetWalletAssetsResponse {
  assets?: Array<{
    symbol: string;
    decimals?: number;
    verified?: boolean;
    name?: string;
    logoUrl?: string;
    contractAddress?: string;
    nativeAsset?: boolean;
    balance: string;
    priceUsd?: string;
  }>;
}

export interface DfnsGetWalletHistoryResponse {
  items?: Array<{
    txHash?: string;
    id?: string;
    direction?: string;
    status?: string;
    asset?: {
      symbol: string;
      decimals?: number;
      verified?: boolean;
      name?: string;
    };
    amount?: string;
    fee?: string;
    to?: string;
    from?: string;
    blockNumber?: number;
    blockHash?: string;
    dateCreated?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface DfnsGetWalletNftsResponse {
  nfts?: Array<{
    contract: string;
    tokenId: string;
    collection?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    externalUrl?: string;
    attributes?: Array<{
      traitType: string;
      value: string;
    }>;
  }>;
}

// ===== Type Mapping Utilities =====

/**
 * Map DFNS curve string to our enum
 */
function mapCurve(curve: string): DfnsCurve {
  switch (curve.toLowerCase()) {
    case 'secp256k1':
      return DfnsCurve.Secp256k1;
    case 'secp256r1':
      return DfnsCurve.Secp256r1;
    case 'ed25519':
      return DfnsCurve.Ed25519;
    default:
      return DfnsCurve.Secp256k1; // Default fallback
  }
}

/**
 * Map DFNS scheme string to our enum
 */
function mapScheme(scheme: string): DfnsScheme {
  switch (scheme.toUpperCase()) {
    case 'ECDSA':
      return DfnsScheme.ECDSA;
    case 'EDDSA':
      return DfnsScheme.EdDSA;
    default:
      return DfnsScheme.ECDSA; // Default fallback
  }
}

/**
 * Map DFNS network string to our enum
 */
function mapNetwork(network: string): DfnsNetwork {
  // Handle common variations and return the exact enum value
  const networkMap: Record<string, DfnsNetwork> = {
    'Ethereum': DfnsNetwork.Ethereum,
    'ethereum': DfnsNetwork.Ethereum,
    'EthereumGoerli': DfnsNetwork.EthereumGoerli,
    'EthereumSepolia': DfnsNetwork.EthereumSepolia,
    'Polygon': DfnsNetwork.Polygon,
    'PolygonMumbai': DfnsNetwork.PolygonMumbai,
    'BinanceSmartChain': DfnsNetwork.BinanceSmartChain,
    'BinanceSmartChainTestnet': DfnsNetwork.BinanceSmartChainTestnet,
    'Arbitrum': DfnsNetwork.Arbitrum,
    'ArbitrumGoerli': DfnsNetwork.ArbitrumGoerli,
    'ArbitrumSepolia': DfnsNetwork.ArbitrumSepolia,
    'Optimism': DfnsNetwork.Optimism,
    'OptimismGoerli': DfnsNetwork.OptimismGoerli,
    'OptimismSepolia': DfnsNetwork.OptimismSepolia,
    'Avalanche': DfnsNetwork.Avalanche,
    'AvalancheFuji': DfnsNetwork.AvalancheFuji,
    'Bitcoin': DfnsNetwork.Bitcoin,
    'BitcoinTestnet3': DfnsNetwork.BitcoinTestnet3,
    'Solana': DfnsNetwork.Solana,
    'SolanaDevnet': DfnsNetwork.SolanaDevnet,
    'Stellar': DfnsNetwork.Stellar,
    'StellarTestnet': DfnsNetwork.StellarTestnet,
    'Algorand': DfnsNetwork.Algorand,
    'AlgorandTestnet': DfnsNetwork.AlgorandTestnet,
    'Tezos': DfnsNetwork.Tezos,
    'TezosTestnet': DfnsNetwork.TezosTestnet,
    'Cardano': DfnsNetwork.Cardano,
    'CardanoTestnet': DfnsNetwork.CardanoTestnet,
    'XrpLedger': DfnsNetwork.XrpLedger,
    'XrpLedgerTestnet': DfnsNetwork.XrpLedgerTestnet,
    'Tron': DfnsNetwork.Tron,
    'TronTestnet': DfnsNetwork.TronTestnet,
    'Near': DfnsNetwork.Near,
    'NearTestnet': DfnsNetwork.NearTestnet,
    'Aptos': DfnsNetwork.Aptos,
    'AptosTestnet': DfnsNetwork.AptosTestnet
  };

  return networkMap[network] || DfnsNetwork.Ethereum; // Default fallback
}

// ===== Wallet Mappers =====

/**
 * Map DFNS CreateWalletResponse to domain Wallet
 */
export function mapCreateWalletResponseToWallet(response: DfnsCreateWalletResponse): Wallet {
  return {
    id: response.id,
    walletId: response.id,
    network: mapNetwork(response.network),
    name: response.name,
    address: response.address || '', // Handle optional address
    signingKey: {
      id: response.signingKey?.id || '',
      keyId: response.signingKey?.id || '',
      publicKey: response.signingKey?.publicKey || '',
      network: mapNetwork(response.network),
      curve: mapCurve(response.signingKey?.curve || 'secp256k1'),
      scheme: mapScheme(response.signingKey?.scheme || 'ECDSA'),
      status: response.signingKey?.status as any || 'Active',
      imported: response.signingKey?.imported || false,
      exported: response.signingKey?.exported || false,
      dateExported: response.signingKey?.dateExported,
      createdAt: response.dateCreated || new Date().toISOString(),
      updatedAt: response.dateCreated || new Date().toISOString()
    },
    custodial: response.custodial || false,
    imported: response.imported || false,
    exported: response.exported || false,
    dateExported: response.dateExported,
    externalId: response.externalId,
    tags: response.tags || [],
    status: response.status as any || 'Active',
    delegated: response.delegated || false,
    delegatedTo: response.delegatedTo,
    createdAt: response.dateCreated || new Date().toISOString(),
    updatedAt: response.dateCreated || new Date().toISOString()
  };
}

/**
 * Map DFNS GetWalletResponse to domain Wallet
 */
export function mapGetWalletResponseToWallet(response: DfnsGetWalletResponse): Wallet {
  return mapCreateWalletResponseToWallet(response);
}

/**
 * Map DFNS ListWalletsResponse to domain Wallet array
 */
export function mapListWalletsResponseToWallets(response: DfnsListWalletsResponse): Wallet[] {
  return (response.items || []).map(item => 
    mapCreateWalletResponseToWallet(item)
  );
}

// ===== Key Mappers =====

/**
 * Map DFNS CreateKeyResponse to domain SigningKey
 */
export function mapCreateKeyResponseToSigningKey(response: DfnsCreateKeyResponse): SigningKey {
  return {
    id: response.id,
    keyId: response.id,
    publicKey: response.publicKey,
    network: DfnsNetwork.Ethereum, // Default network, can be overridden
    curve: mapCurve(response.curve),
    scheme: mapScheme(response.scheme),
    status: response.status as any,
    imported: response.imported || false,
    exported: response.exported || false,
    dateExported: response.dateExported,
    createdAt: response.dateCreated || new Date().toISOString(),
    updatedAt: response.dateCreated || new Date().toISOString()
  };
}

/**
 * Map DFNS GetKeyResponse to domain SigningKey
 */
export function mapGetKeyResponseToSigningKey(response: DfnsGetKeyResponse): SigningKey {
  return mapCreateKeyResponseToSigningKey(response);
}

/**
 * Map DFNS ListKeysResponse to domain SigningKey array
 */
export function mapListKeysResponseToSigningKeys(response: DfnsListKeysResponse): SigningKey[] {
  return (response.items || []).map(item => 
    mapCreateKeyResponseToSigningKey(item)
  );
}

// ===== Transfer Mappers =====

/**
 * Map DFNS TransferAssetResponse to domain TransferResponse
 */
export function mapTransferAssetResponseToTransferResponse(response: DfnsTransferAssetResponse): TransferResponse {
  return {
    id: response.id,
    status: response.status as any,
    txHash: response.txHash,
    fee: response.fee,
    formattedFee: response.fee ? `${response.fee} ETH` : undefined, // TODO: Format properly based on network
    dateCreated: response.dateCreated || new Date().toISOString(),
    dateBroadcast: response.dateBroadcast,
    dateConfirmed: response.dateConfirmed,
    estimatedConfirmationTime: undefined, // Not provided by DFNS SDK
    progress: response.status === 'Confirmed' ? 100 : response.status === 'Pending' ? 50 : 0
  };
}

// ===== Signature Mappers =====

/**
 * Map DFNS GenerateSignatureResponse to domain SignatureResponse
 */
export function mapGenerateSignatureResponseToSignatureResponse(response: DfnsGenerateSignatureResponse): SignatureResponse {
  return {
    id: response.id,
    status: response.status as any,
    signature: response.signature?.encoded,
    publicKey: response.signature?.publicKey || '', // Will need to be provided separately
    dateCreated: response.dateCreated || new Date().toISOString(),
    dateCompleted: response.status === 'Signed' ? (response.dateCreated || new Date().toISOString()) : undefined,
    description: undefined // Not provided by DFNS SDK
  };
}

// ===== Asset & Balance Mappers =====

/**
 * Map DFNS asset to domain Asset
 */
export function mapDfnsAssetToAsset(asset: any): Asset {
  return {
    symbol: asset.symbol,
    decimals: asset.decimals || 18,
    verified: asset.verified || false,
    name: asset.name,
    logoUrl: asset.logoUrl,
    contractAddress: asset.contractAddress,
    nativeAsset: asset.nativeAsset || false
  };
}

/**
 * Map DFNS GetWalletAssetsResponse to domain WalletBalance array
 */
export function mapGetWalletAssetsResponseToWalletBalances(response: DfnsGetWalletAssetsResponse): WalletBalance[] {
  return (response.assets || []).map(asset => ({
    asset: mapDfnsAssetToAsset(asset),
    balance: asset.balance,
    valueInUSD: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined,
    assetSymbol: asset.symbol,
    valueInUsd: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined,
    formattedBalance: `${asset.balance} ${asset.symbol}`,
    percentageOfTotal: undefined // Will need to be calculated separately
  }));
}

// ===== Transaction History Mappers =====

/**
 * Map DFNS transaction to domain TransactionHistory
 */
export function mapDfnsTransactionToTransactionHistory(transaction: any): TransactionHistory {
  return {
    txHash: transaction.txHash || transaction.id,
    direction: mapTransactionDirection(transaction.direction),
    status: transaction.status as any || 'Confirmed',
    asset: mapDfnsAssetToAsset(transaction.asset || { symbol: 'ETH', decimals: 18, verified: true }),
    amount: transaction.amount || '0',
    formattedAmount: transaction.amount ? `${transaction.amount} ${transaction.asset?.symbol || 'ETH'}` : '0',
    fee: transaction.fee,
    formattedFee: transaction.fee ? `${transaction.fee} ETH` : undefined,
    to: transaction.to,
    from: transaction.from,
    blockNumber: transaction.blockNumber,
    blockHash: transaction.blockHash,
    timestamp: transaction.dateCreated || transaction.timestamp || new Date().toISOString(),
    formattedTimestamp: new Date(transaction.dateCreated || transaction.timestamp || new Date()).toLocaleString(),
    metadata: transaction.metadata
  };
}

/**
 * Map DFNS direction to domain direction format
 */
function mapTransactionDirection(direction: string): 'Incoming' | 'Outgoing' {
  switch (direction) {
    case 'In':
      return 'Incoming';
    case 'Out':
      return 'Outgoing';
    default:
      return 'Outgoing'; // Default fallback
  }
}

/**
 * Map domain direction to DFNS direction format
 */
export function mapDomainDirectionToDfnsDirection(direction: 'Incoming' | 'Outgoing'): 'In' | 'Out' {
  switch (direction) {
    case 'Incoming':
      return 'In';
    case 'Outgoing':
      return 'Out';
    default:
      return 'Out'; // Default fallback
  }
}

/**
 * Map DFNS GetWalletHistoryResponse to domain transaction history
 */
export function mapGetWalletHistoryResponseToTransactionHistory(response: DfnsGetWalletHistoryResponse): TransactionHistory[] {
  return (response.items || []).map(mapDfnsTransactionToTransactionHistory);
}

// ===== NFT Mappers =====

/**
 * Map DFNS NFT to domain NFT
 */
export function mapDfnsNftToNft(nft: any): NFT {
  return {
    contract: nft.contract,
    tokenId: nft.tokenId,
    collection: nft.collection,
    name: nft.name,
    description: nft.description,
    imageUrl: nft.imageUrl,
    externalUrl: nft.externalUrl,
    attributes: nft.attributes || []
  };
}

/**
 * Map DFNS GetWalletNftsResponse to domain NFT array
 */
export function mapGetWalletNftsResponseToNfts(response: DfnsGetWalletNftsResponse): NFT[] {
  return (response.nfts || []).map(mapDfnsNftToNft);
}

// ===== Error Mappers =====

/**
 * Map DFNS API error to domain error format
 */
export function mapDfnsErrorToError(error: any): { code: string; message: string } {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred'
  };
}

// ===== Utility Functions =====

/**
 * Safely get nested property from DFNS response
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format currency amount for display
 */
export function formatAmount(amount: string, symbol: string, decimals = 6): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `0 ${symbol}`;
  
  return `${num.toFixed(decimals)} ${symbol}`;
}
