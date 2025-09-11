/**
 * DFNS Transaction Broadcasting Types
 * 
 * Comprehensive types for DFNS transaction broadcasting across all supported networks
 * Based on: https://docs.dfns.co/d/api-docs/wallets/broadcast-transaction
 * 
 * Supports: Algorand, Aptos, Bitcoin, Canton, Cardano, EVM, Solana, Stellar, Tezos, TRON, XRP Ledger
 */

// ===============================
// COMMON TRANSACTION TYPES
// ===============================

/**
 * Transaction request status
 */
export type DfnsTransactionStatus = 
  | 'Pending'     // Pending approval due to policy
  | 'Executing'   // Approved and being executed
  | 'Broadcasted' // Successfully written to mempool
  | 'Confirmed'   // Confirmed on-chain
  | 'Failed'      // System failure or on-chain failure
  | 'Rejected';   // Rejected by policy approval

/**
 * Transaction requester information
 */
export interface DfnsTransactionRequester {
  userId: string;
  tokenId?: string;
}

/**
 * Base transaction request response
 */
export interface DfnsTransactionRequestResponse {
  id: string;
  walletId: string;
  network: string;
  requester: DfnsTransactionRequester;
  requestBody: any; // Network-specific request body
  externalId?: string;
  dateRequested: string;
  status: DfnsTransactionStatus;
  txHash?: string;
  dateBroadcasted?: string;
  approvalId?: string;
  datePolicyResolved?: string;
  reason?: string;
  fee?: string;
  dateConfirmed?: string;
}

/**
 * List transaction requests response
 */
export interface DfnsListTransactionRequestsResponse {
  items: DfnsTransactionRequestResponse[];
  nextPageToken?: string;
}

// ===============================
// EVM NETWORKS (Ethereum, Polygon, Base, etc.)
// ===============================

/**
 * EVM Authorization for EIP-7702 transactions
 */
export interface DfnsEvmAuthorization {
  chainId: number;
  address: string;
  nonce: number;
  signature: string;
}

/**
 * EVM Transaction JSON format
 */
export interface DfnsEvmTransactionJson {
  type?: number; // 0 = legacy, 2 = EIP-1559, 4 = EIP-7702
  to?: string;
  value?: string;
  data?: string;
  nonce?: number | string;
  gasLimit?: string;
  gasPrice?: string; // Only for type 0 (legacy)
  maxFeePerGas?: string; // For type 2 and 4
  maxPriorityFeePerGas?: string; // For type 2 and 4
  authorizationList?: DfnsEvmAuthorization[]; // Only for type 4
}

/**
 * EVM User Operation for fee sponsorship
 */
export interface DfnsEvmUserOperation {
  to: string;
  value?: string;
  data?: string;
}

/**
 * EVM Transaction request
 */
export interface DfnsEvmTransactionRequest {
  kind: 'Transaction';
  transaction: string | DfnsEvmTransactionJson; // Hex string or JSON
  externalId?: string;
}

/**
 * EVM User Operations request (fee sponsored)
 */
export interface DfnsEvmUserOperationsRequest {
  kind: 'UserOperations';
  userOperations: DfnsEvmUserOperation[];
  feeSponsorId: string;
  externalId?: string;
}

export type DfnsEvmBroadcastRequest = DfnsEvmTransactionRequest | DfnsEvmUserOperationsRequest;

// ===============================
// BITCOIN / LITECOIN
// ===============================

/**
 * Bitcoin PSBT (Partially Signed Bitcoin Transaction) request
 */
export interface DfnsBitcoinTransactionRequest {
  kind: 'Psbt';
  psbt: string; // Hex encoded PSBT
  externalId?: string;
}

// ===============================
// SOLANA
// ===============================

/**
 * Solana transaction request
 */
export interface DfnsSolanaTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex encoded unsigned transaction
  externalId?: string;
}

// ===============================
// ALGORAND
// ===============================

/**
 * Algorand transaction request
 */
export interface DfnsAlgorandTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Base64 encoded unsigned transaction
  externalId?: string;
}

// ===============================
// APTOS
// ===============================

/**
 * Aptos transaction request
 */
export interface DfnsAptosTransactionRequest {
  kind: 'Transaction';
  transaction: object; // Aptos transaction object
  externalId?: string;
}

// ===============================
// CARDANO
// ===============================

/**
 * Cardano transaction request
 */
export interface DfnsCardanoTransactionRequest {
  kind: 'Transaction';
  transaction: string; // CBOR hex encoded transaction
  externalId?: string;
}

// ===============================
// STELLAR
// ===============================

/**
 * Stellar transaction request
 */
export interface DfnsStellarTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Base64 encoded transaction envelope
  externalId?: string;
}

// ===============================
// TEZOS
// ===============================

/**
 * Tezos transaction request
 */
export interface DfnsTezosTransactionRequest {
  kind: 'Transaction';
  transaction: object; // Tezos transaction object
  externalId?: string;
}

// ===============================
// TRON
// ===============================

/**
 * TRON transaction request
 */
export interface DfnsTronTransactionRequest {
  kind: 'Transaction';
  transaction: object; // TRON transaction object
  externalId?: string;
}

// ===============================
// XRP LEDGER
// ===============================

/**
 * XRP Ledger transaction request
 */
export interface DfnsXrpLedgerTransactionRequest {
  kind: 'Transaction';
  transaction: object; // XRP transaction object
  externalId?: string;
}

// ===============================
// CANTON
// ===============================

/**
 * Canton transaction request
 */
export interface DfnsCantonTransactionRequest {
  kind: 'Transaction';
  transaction: object; // Canton transaction object
  externalId?: string;
}

// ===============================
// UNION TYPE FOR ALL NETWORKS
// ===============================

/**
 * Union type for all supported transaction request types
 */
export type DfnsBroadcastTransactionRequest = 
  | DfnsEvmTransactionRequest
  | DfnsEvmUserOperationsRequest
  | DfnsBitcoinTransactionRequest
  | DfnsSolanaTransactionRequest
  | DfnsAlgorandTransactionRequest
  | DfnsAptosTransactionRequest
  | DfnsCardanoTransactionRequest
  | DfnsStellarTransactionRequest
  | DfnsTezosTransactionRequest
  | DfnsTronTransactionRequest
  | DfnsXrpLedgerTransactionRequest
  | DfnsCantonTransactionRequest;

// ===============================
// NETWORK DETECTION
// ===============================

/**
 * Supported networks for transaction broadcasting
 */
export type DfnsTransactionNetwork = 
  // EVM Networks
  | 'Ethereum' | 'EthereumGoerli' | 'EthereumSepolia'
  | 'Polygon' | 'PolygonMumbai'
  | 'Arbitrum' | 'ArbitrumGoerli' | 'ArbitrumSepolia'
  | 'Optimism' | 'OptimismGoerli' | 'OptimismSepolia'
  | 'Base' | 'BaseGoerli' | 'BaseSepolia'
  | 'Avalanche' | 'AvalancheFuji'
  | 'Bsc' | 'BscTestnet'
  // Bitcoin Networks
  | 'Bitcoin' | 'BitcoinTestnet3'
  | 'Litecoin' | 'LitecoinTestnet'
  // Other Networks
  | 'Solana' | 'SolanaDevnet'
  | 'Algorand' | 'AlgorandTestnet'
  | 'Aptos' | 'AptosTestnet'
  | 'Cardano' | 'CardanoTestnet'
  | 'Stellar' | 'StellarTestnet'
  | 'Tezos' | 'TezosTestnet'
  | 'Tron' | 'TronTestnet'
  | 'XrpLedger' | 'XrpLedgerTestnet'
  | 'Canton' | 'CantonTestnet';

/**
 * Network category for request type detection
 */
export type DfnsNetworkCategory = 
  | 'evm'
  | 'bitcoin'
  | 'solana'
  | 'algorand'
  | 'aptos'
  | 'cardano'
  | 'stellar'
  | 'tezos'
  | 'tron'
  | 'xrp'
  | 'canton';

// ===============================
// SERVICE OPTIONS
// ===============================

/**
 * Transaction service options
 */
export interface DfnsTransactionServiceOptions {
  syncToDatabase?: boolean;
  validateRequest?: boolean;
  retryOptions?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

/**
 * Pagination options for listing transactions
 */
export interface DfnsTransactionPaginationOptions {
  limit?: number;
  paginationToken?: string;
}

// ===============================
// TRANSACTION ANALYTICS
// ===============================

/**
 * Transaction statistics
 */
export interface DfnsTransactionStatistics {
  total: number;
  byStatus: Record<DfnsTransactionStatus, number>;
  byNetwork: Record<string, number>;
  byTimeframe: {
    last24h: number;
    lastWeek: number;
    lastMonth: number;
  };
  totalFeesPaid: string;
  successRate: number;
  lastTransaction: string | null;
}

// ===============================
// HELPER TYPES
// ===============================

/**
 * Transaction validation result
 */
export interface DfnsTransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  networkCategory: DfnsNetworkCategory;
  estimatedNetwork?: DfnsTransactionNetwork;
}

/**
 * Transaction broadcast options
 */
export interface DfnsTransactionBroadcastOptions extends DfnsTransactionServiceOptions {
  userActionToken?: string;
  externalId?: string;
  feeSponsorId?: string; // For supported networks
}

/**
 * Network detection result
 */
export interface DfnsNetworkDetectionResult {
  category: DfnsNetworkCategory;
  networks: DfnsTransactionNetwork[];
  isSupported: boolean;
  requiresUserAction: boolean;
  supportsFeeSponsor: boolean;
}
