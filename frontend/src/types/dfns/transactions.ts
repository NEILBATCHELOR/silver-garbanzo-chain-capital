/**
 * DFNS Transactions Types
 * 
 * Types for DFNS transaction handling, signatures, and broadcasting
 * Includes network-specific transaction types for all supported blockchains
 */

import type { DfnsTransactionStatus, DfnsNetwork } from './core';

// DFNS Signature
export interface DfnsSignature {
  id: string;
  signature_id: string;
  key_id?: string;
  kind: string;
  message: string;
  external_id?: string;
  status: DfnsTransactionStatus;
  signature?: string;
  public_key: string;
  date_created: string;
  date_completed?: string;
  error_message?: string;
  dfns_signature_id: string;
  created_at: string;
  updated_at: string;
}

// Signature Request
export interface DfnsSignatureRequest {
  kind: 'Transaction' | 'Message' | 'Hash';
  message: string;
  external_id?: string;
  key_id?: string;
}

// Transaction Request Base
export interface DfnsBaseTransactionRequest {
  walletId: string;
  kind: string;
  to?: string;
  value?: string;
  data?: string;
  nonce?: number;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  externalId?: string;
}

// Ethereum Transaction Request
export interface DfnsEthereumTransactionRequest extends DfnsBaseTransactionRequest {
  kind: 'Evm';
  to: string;
  value: string;
  data?: string;
}

// Transaction Response
export interface DfnsTransactionResponse {
  id: string;
  walletId: string;
  status: DfnsTransactionStatus;
  txHash?: string;
  signature?: string;
  signedTransaction?: string;
  fee?: {
    amount: string;
    unit: string;
  };
  dateCreated: string;
  dateBroadcast?: string;
  dateConfirmed?: string;
  estimatedConfirmationTime?: string;
}

// Message Signing Request
export interface DfnsMessageSignRequest {
  walletId: string;
  message: string;
  messageKind: 'String' | 'Hex' | 'Hash';
  externalId?: string;
}

// Message Signature Response
export interface DfnsMessageSignResponse {
  signature: string;
  publicKey: string;
  signedMessage?: string;
}

// Fee Estimation Request
export interface DfnsFeeEstimationRequest {
  network: string;
  kind: string;
  to?: string;
  value?: string;
  data?: string;
}

// Fee Estimation Response
export interface DfnsFeeEstimationResponse {
  low: {
    gasPrice?: string;
    gasLimit?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    total: string;
  };
  medium: {
    gasPrice?: string;
    gasLimit?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    total: string;
  };
  high: {
    gasPrice?: string;
    gasLimit?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    total: string;
  };
}

// ==============================================
// TRANSACTION BROADCASTING API TYPES (COMPLETE)
// ==============================================

// Transaction Request Base Type
export interface DfnsTransactionRequest {
  kind: 'Transaction' | 'Evm' | 'Eip1559' | 'Psbt' | 'UserOperation' | 'Btc' | 'Solana';
  externalId?: string;
}

// Generic Transaction Broadcasting (Raw Transaction Hex)
export interface DfnsGenericTransactionRequest extends DfnsTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded signed transaction (0x...)
}

// Broadcast Transaction Request (Main API Request)
export interface DfnsBroadcastTransactionApiRequest {
  body: DfnsBroadcastTransactionRequest;
  userAction?: string; // User Action Signature token
}

// List Transaction Requests Query Parameters
export interface DfnsListTransactionRequestsParams {
  limit?: number; // Default 100, max 1000
  paginationToken?: string;
}

// ==============================================
// EVM TRANSACTION TYPES
// ==============================================

// EVM Template Transaction (High-level)
export interface DfnsEvmTransactionRequest extends DfnsTransactionRequest {
  kind: 'Evm';
  to: string;
  value?: string; // Amount in wei
  data?: string; // ABI-encoded function call data
  nonce?: number;
}

// EIP-1559 Transaction (Type 2)
export interface DfnsEip1559TransactionRequest extends DfnsTransactionRequest {
  kind: 'Eip1559';
  to: string;
  value?: string; // Amount in wei
  data?: string; // ABI-encoded function call data
  nonce?: number;
  gasLimit?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
}

// User Operation (Account Abstraction)
export interface DfnsUserOperationRequest extends DfnsTransactionRequest {
  kind: 'UserOperation';
  userOperations: DfnsUserOperation[];
  feeSponsorId?: string;
}

export interface DfnsUserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

// ==============================================
// BITCOIN TRANSACTION TYPES
// ==============================================

// Bitcoin PSBT Transaction
export interface DfnsBitcoinTransactionRequest extends DfnsTransactionRequest {
  kind: 'Psbt';
  psbt: string; // Hex-encoded PSBT
}

// ==============================================
// SOLANA TRANSACTION TYPES
// ==============================================

// Solana Transaction
export interface DfnsSolanaTransactionRequest extends DfnsTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded transaction
}

// ==============================================
// OTHER BLOCKCHAIN TRANSACTION TYPES
// ==============================================

// Aptos Transaction
export interface DfnsAptosTransactionRequest extends DfnsTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded transaction
}

// XRP Ledger Transaction
export interface DfnsXrpTransactionRequest extends DfnsTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded transaction
}

// Canton Transaction
export interface DfnsCantonTransactionRequest extends DfnsTransactionRequest {
  kind: 'Transaction';
  transaction: string; // Hex-encoded transaction
}

// Union type for all transaction request types
export type DfnsBroadcastTransactionRequest = 
  | DfnsGenericTransactionRequest
  | DfnsEvmTransactionRequest
  | DfnsEip1559TransactionRequest
  | DfnsUserOperationRequest
  | DfnsBitcoinTransactionRequest
  | DfnsSolanaTransactionRequest
  | DfnsAptosTransactionRequest
  | DfnsXrpTransactionRequest
  | DfnsCantonTransactionRequest;

// ==============================================
// TRANSACTION RESPONSE TYPES
// ==============================================

// Transaction Request Response (from broadcast)
export interface DfnsTransactionRequestResponse {
  id: string; // Transaction request ID (tx-xxxx-xxxx-xxxxxxxxxxxxxxxx)
  walletId: string;
  network: DfnsNetwork;
  requester: {
    userId?: string;
    tokenId?: string;
    appId?: string;
  };
  requestBody: DfnsBroadcastTransactionRequest;
  status: DfnsTransactionStatus;
  txHash?: string;
  fee?: string;
  dateRequested: string;
  dateBroadcasted?: string;
  dateConfirmed?: string;
  errorMessage?: string;
}

// Get Transaction Request Response
export interface DfnsGetTransactionRequestResponse extends DfnsTransactionRequestResponse {}

// List Transaction Requests Response
export interface DfnsListTransactionRequestsResponse {
  walletId: string;
  items: DfnsTransactionRequestResponse[];
  nextPageToken?: string;
}

// ==============================================
// NETWORK-SPECIFIC HELPERS
// ==============================================

// Network Support Matrix
export interface DfnsNetworkTransactionSupport {
  network: DfnsNetwork;
  supportedKinds: Array<'Transaction' | 'Evm' | 'Eip1559' | 'Psbt' | 'UserOperation'>;
  requiresUserAction: boolean;
  feeTokenSymbol: string;
  confirmationBlocks: number;
}

// Transaction Builder Options
export interface DfnsTransactionBuilderOptions {
  network: DfnsNetwork;
  gasEstimation?: 'low' | 'medium' | 'high';
  priorityFee?: string;
  maxFee?: string;
  nonce?: number;
  externalId?: string;
}

// ==============================================
// TRANSACTION STATUS TRACKING
// ==============================================

// Transaction Status Details
export interface DfnsTransactionStatusDetails {
  status: DfnsTransactionStatus;
  confirmations: number;
  requiredConfirmations: number;
  estimatedConfirmationTime?: string;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

// ==============================================
// ERROR TYPES
// ==============================================

// Transaction Error
export interface DfnsTransactionError {
  code: string;
  message: string;
  details?: {
    network?: DfnsNetwork;
    walletId?: string;
    transactionId?: string;
    txHash?: string;
    gasLimit?: string;
    gasPrice?: string;
    nonce?: number;
  };
}
