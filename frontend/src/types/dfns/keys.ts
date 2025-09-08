/**
 * DFNS Keys API Types
 * 
 * Complete TypeScript type definitions for DFNS Keys API
 * Supports multichain key management and delegated signing
 */

// ===============================
// Core Key Types
// ===============================

/**
 * Supported key schemes in DFNS
 */
export type DfnsKeyScheme = 'ECDSA' | 'EdDSA' | 'Schnorr';

/**
 * Supported key curves for each scheme
 */
export type DfnsKeyCurve = 'secp256k1' | 'ed25519' | 'stark';

/**
 * Key status values
 */
export type DfnsKeyStatus = 'Active' | 'Archived';

/**
 * Key store types
 */
export type DfnsKeyStoreKind = 'Mpc' | 'Hsm';

/**
 * Core DFNS Key entity
 */
export interface DfnsKey {
  /** Unique identifier of the key */
  id: string;
  /** Key name (optional) */
  name?: string;
  /** Key scheme (ECDSA, EdDSA, Schnorr) */
  scheme: DfnsKeyScheme;
  /** Key curve (secp256k1, ed25519, stark) */
  curve: DfnsKeyCurve;
  /** Hex-encoded public key */
  publicKey: string;
  /** Key status */
  status: DfnsKeyStatus;
  /** Whether key is custodial (org-owned) or non-custodial (user-owned) */
  custodial: boolean;
  /** ISO 8601 date when key was created */
  dateCreated: string;
  /** True if key was imported from external source */
  imported?: boolean;
  /** True if key was exported at least once */
  exported?: boolean;
  /** ISO 8601 date when key was first exported */
  dateExported?: string;
  /** End user ID if key is delegated */
  delegatedTo?: string;
}

/**
 * Wallet information associated with a key
 */
export interface DfnsKeyWalletInfo {
  /** Wallet ID */
  id: string;
  /** Blockchain network */
  network: string;
}

/**
 * Key store information
 */
export interface DfnsKeyStoreInfo {
  /** Type of key store */
  kind: DfnsKeyStoreKind;
  /** Internal key identifier for Layer 4 backup */
  keyId: string;
}

/**
 * Enhanced key entity with associated wallets and store info
 */
export interface DfnsKeyWithDetails extends DfnsKey {
  /** List of wallets using this key */
  wallets: DfnsKeyWalletInfo[];
  /** Key store information */
  store: DfnsKeyStoreInfo;
}

// ===============================
// Create Key API
// ===============================

/**
 * Request to create a new key
 */
export interface DfnsCreateKeyRequest {
  /** Key scheme */
  scheme: DfnsKeyScheme;
  /** Key curve compatible with chosen scheme */
  curve: DfnsKeyCurve;
  /** Optional name for the key */
  name?: string;
  /** ID of end user to delegate key to upon creation */
  delegateTo?: string;
  /** Create key for later delegation (requires delayDelegation: true) */
  delayDelegation?: boolean;
}

/**
 * Response from creating a key
 */
export interface DfnsCreateKeyResponse extends DfnsKey {}

// ===============================
// Update Key API
// ===============================

/**
 * Request to update a key
 */
export interface DfnsUpdateKeyRequest {
  /** New name for the key */
  name: string;
}

/**
 * Response from updating a key
 */
export interface DfnsUpdateKeyResponse extends DfnsKey {}

// ===============================
// Delete Key API
// ===============================

/**
 * Response from deleting a key (no request body)
 */
export interface DfnsDeleteKeyResponse extends DfnsKey {
  /** Status will be 'Archived' after deletion */
  status: 'Archived';
}

// ===============================
// Get Key API
// ===============================

/**
 * Response from getting a key by ID
 */
export interface DfnsGetKeyResponse extends DfnsKeyWithDetails {}

// ===============================
// List Keys API
// ===============================

/**
 * Request parameters for listing keys
 */
export interface DfnsListKeysRequest {
  /** Get delegated keys owned by specific user (userId or username) */
  owner?: string;
  /** Maximum number of items to return (default: 100) */
  limit?: number;
  /** Pagination token from previous request */
  paginationToken?: string;
}

/**
 * Response from listing keys
 */
export interface DfnsListKeysResponse {
  /** Array of keys */
  items: DfnsKey[];
  /** Token for next page of results */
  nextPageToken?: string;
}

// ===============================
// Delegate Key API
// ===============================

/**
 * Request to delegate a key to an end user
 */
export interface DfnsDelegateKeyRequest {
  /** ID of the end user to delegate the key to */
  userId: string;
}

/**
 * Response from delegating a key
 */
export interface DfnsDelegateKeyResponse {
  /** Key ID that was delegated */
  keyId: string;
  /** Status of the delegation operation */
  status: 'Delegated';
}

// ===============================
// Service Layer Types
// ===============================

/**
 * Options for key service operations
 */
export interface DfnsKeyServiceOptions {
  /** Sync operation to database */
  syncToDatabase?: boolean;
  /** Auto-activate after creation */
  autoActivate?: boolean;
  /** Validate network compatibility */
  validateNetworkCompatibility?: boolean;
  /** Wait for confirmation */
  waitForConfirmation?: boolean;
}

/**
 * Key creation options with enhanced features
 */
export interface DfnsCreateKeyOptions extends DfnsKeyServiceOptions {
  /** Auto-create wallets for specified networks */
  autoCreateWallets?: string[];
  /** Tags to apply to created wallets */
  walletTags?: string[];
  /** External ID for tracking */
  externalId?: string;
}

/**
 * Key summary for dashboard display
 */
export interface DfnsKeySummary {
  /** Key ID */
  keyId: string;
  /** Key name */
  name?: string;
  /** Key scheme */
  scheme: DfnsKeyScheme;
  /** Key curve */
  curve: DfnsKeyCurve;
  /** Network compatibility count */
  compatibleNetworks: number;
  /** Associated wallet count */
  walletCount: number;
  /** Whether key is active */
  isActive: boolean;
  /** Whether key is custodial */
  isCustodial: boolean;
  /** Whether key is delegated */
  isDelegated: boolean;
  /** Delegated to user ID */
  delegatedTo?: string;
  /** Creation date */
  dateCreated: string;
  /** Whether key was imported */
  isImported: boolean;
  /** Whether key was exported */
  wasExported: boolean;
}

/**
 * Batch operation result
 */
export interface DfnsKeyBatchResult<T> {
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: Array<{
    keyId: string;
    error: string;
  }>;
}

/**
 * Network compatibility information
 */
export interface DfnsNetworkCompatibility {
  /** Network name */
  network: string;
  /** Whether network supports this key scheme/curve */
  compatible: boolean;
  /** Supported schemes for this network */
  supportedSchemes: DfnsKeyScheme[];
  /** Supported curves for this network */
  supportedCurves: DfnsKeyCurve[];
}

/**
 * Key validation result
 */
export interface DfnsKeyValidation {
  /** Whether key is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Network compatibility */
  networkCompatibility: DfnsNetworkCompatibility[];
}

// ===============================
// Database Integration Types
// ===============================

/**
 * Database representation of DFNS key
 * Maps to dfns_signing_keys table
 */
export interface DfnsKeyDatabaseRecord {
  id: string;
  key_id: string;
  public_key: string;
  network: string;
  curve: string;
  scheme: string;
  status: string;
  delegated: boolean;
  delegated_to?: string;
  external_id?: string;
  tags?: string[];
  imported: boolean;
  exported: boolean;
  date_exported?: string;
  organization_id?: string;
  dfns_key_id: string;
  created_at: string;
  updated_at: string;
  name?: string;
}

// ===============================
// Error Types
// ===============================

/**
 * Key-specific error context
 */
export interface DfnsKeyErrorContext {
  keyId?: string;
  scheme?: DfnsKeyScheme;
  curve?: DfnsKeyCurve;
  operation?: string;
  network?: string;
  userId?: string;
}

// ===============================
// Component Props Types
// ===============================

/**
 * Props for key creation form
 */
export interface DfnsKeyCreationFormProps {
  /** Callback when key is created */
  onKeyCreated?: (key: DfnsKey) => void;
  /** Initial scheme selection */
  defaultScheme?: DfnsKeyScheme;
  /** Initial curve selection */
  defaultCurve?: DfnsKeyCurve;
  /** Whether to show advanced options */
  showAdvancedOptions?: boolean;
  /** Available networks for wallet creation */
  availableNetworks?: string[];
  /** Whether form is disabled */
  disabled?: boolean;
}

/**
 * Props for key management dashboard
 */
export interface DfnsKeyManagementProps {
  /** Optional user ID to filter delegated keys */
  userId?: string;
  /** Callback when key is selected */
  onKeySelected?: (key: DfnsKey) => void;
  /** Whether to show delegation controls */
  showDelegationControls?: boolean;
  /** Whether to show multichain features */
  showMultichainFeatures?: boolean;
}

/**
 * Props for key delegation dialog
 */
export interface DfnsKeyDelegationProps {
  /** Key to delegate */
  keyId: string;
  /** Current key details */
  keyDetails?: DfnsKey;
  /** Available users for delegation */
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  /** Callback when delegation is complete */
  onDelegationComplete?: (result: DfnsDelegateKeyResponse) => void;
  /** Callback when dialog is cancelled */
  onCancel?: () => void;
}

// ===============================
// Keys Signature Generation APIs
// ===============================

/**
 * Blockchain kinds for signature generation
 */
export type DfnsBlockchainKind = 
  | 'Evm'
  | 'Bitcoin' 
  | 'Solana'
  | 'XrpLedger'
  | 'Tezos'
  | 'Stellar'
  | 'Algorand'
  | 'Aptos'
  | 'Cardano'
  | 'Cosmos'
  | 'Near'
  | 'Polkadot'
  | 'Sui';

/**
 * Signature kinds supported by DFNS
 */
export type DfnsSignatureKind = 
  | 'Transaction'   // Raw transaction signing
  | 'Hash'          // Hash signing  
  | 'Message'       // Message signing
  | 'Eip712'        // EIP-712 typed data signing
  | 'Psbt'          // Bitcoin PSBT signing
  | 'Bip322';       // Bitcoin BIP-322 message signing

/**
 * Signature status values
 */
export type DfnsSignatureStatus = 'Pending' | 'Signed' | 'Failed' | 'Cancelled';

/**
 * Request to generate a signature with a key
 */
export interface DfnsGenerateSignatureRequest {
  /** Blockchain hint for interpreting data format */
  blockchainKind?: DfnsBlockchainKind;
  /** Type of signature to generate */
  kind: DfnsSignatureKind;
  /** Raw transaction hex (for Transaction kind) */
  transaction?: string;
  /** Hash to sign (for Hash kind) */
  hash?: string;
  /** Message to sign (for Message kind) */
  message?: string;
  /** PSBT hex (for Bitcoin Psbt kind) */
  psbt?: string;
  /** EIP-712 typed data (for Eip712 kind) */
  types?: Record<string, any>;
  /** EIP-712 domain separator */
  domain?: Record<string, any>;
  /** External ID for tracking */
  externalId?: string;
}

/**
 * Signature data returned from DFNS
 */
export interface DfnsSignatureData {
  /** R component of signature */
  r: string;
  /** S component of signature */
  s: string;
  /** Recovery ID (for ECDSA) */
  recid?: number;
  /** Encoded signature */
  encoded: string;
  /** Public key used for signing */
  publicKey?: string;
}

/**
 * Request requester information
 */
export interface DfnsRequester {
  /** User ID */
  userId?: string;
  /** Token ID (for PAT requests) */
  tokenId?: string;
  /** Application ID */
  appId: string;
  /** IP address */
  clientIp?: string;
}

/**
 * Response from generating a signature
 */
export interface DfnsGenerateSignatureResponse {
  /** Unique signature request ID */
  id: string;
  /** Key ID used for signing */
  keyId: string;
  /** Blockchain network context */
  network?: string;
  /** Request metadata */
  requester: DfnsRequester;
  /** Original request body */
  requestBody: DfnsGenerateSignatureRequest;
  /** Current status */
  status: DfnsSignatureStatus;
  /** Signature data (if signed) */
  signature?: DfnsSignatureData;
  /** Signed data (encoded result) */
  signedData?: string;
  /** ISO 8601 date when request was made */
  dateRequested: string;
  /** ISO 8601 date when signature was completed */
  dateSigned?: string;
  /** ISO 8601 date when request was cancelled */
  dateCancelled?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Request parameters for listing signature requests
 */
export interface DfnsListSignatureRequestsRequest {
  /** Maximum number of items to return */
  limit?: number;
  /** Pagination token from previous request */
  paginationToken?: string;
  /** Filter by signature status */
  status?: DfnsSignatureStatus;
  /** Filter by blockchain kind */
  blockchainKind?: DfnsBlockchainKind;
  /** Filter by signature kind */
  kind?: DfnsSignatureKind;
}

/**
 * Response from listing signature requests
 */
export interface DfnsListSignatureRequestsResponse {
  /** Array of signature requests */
  items: DfnsGenerateSignatureResponse[];
  /** Token for next page of results */
  nextPageToken?: string;
}

/**
 * Response from getting a signature request by ID
 */
export interface DfnsGetSignatureRequestResponse extends DfnsGenerateSignatureResponse {}

// ===============================
// Network-Specific Signature Types
// ===============================

/**
 * EVM-specific signature request
 */
export interface DfnsEvmSignatureRequest {
  /** Always 'Evm' for EVM chains */
  blockchainKind: 'Evm';
  /** Transaction, Hash, Message, or Eip712 */
  kind: 'Transaction' | 'Hash' | 'Message' | 'Eip712';
  /** Unsigned transaction hex (for Transaction) */
  transaction?: string;
  /** Hash to sign (for Hash) */
  hash?: string;
  /** Message to sign (for Message) */
  message?: string;
  /** EIP-712 types (for Eip712) */
  types?: Record<string, Array<{ name: string; type: string }>>;
  /** EIP-712 domain (for Eip712) */
  domain?: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
  };
  /** EIP-712 message data (for Eip712) */
  data?: Record<string, any>;
  /** External ID for tracking */
  externalId?: string;
}

/**
 * Bitcoin-specific signature request
 */
export interface DfnsBitcoinSignatureRequest {
  /** Always 'Bitcoin' for Bitcoin/Litecoin */
  blockchainKind: 'Bitcoin';
  /** Psbt, Hash, or Bip322 */
  kind: 'Psbt' | 'Hash' | 'Bip322';
  /** PSBT hex (for Psbt) */
  psbt?: string;
  /** Hash to sign (for Hash) */
  hash?: string;
  /** Message for BIP-322 signing (for Bip322) */
  message?: string;
  /** External ID for tracking */
  externalId?: string;
}

/**
 * Solana-specific signature request
 */
export interface DfnsSolanaSignatureRequest {
  /** Always 'Solana' for Solana network */
  blockchainKind: 'Solana';
  /** Transaction, Hash, or Message */
  kind: 'Transaction' | 'Hash' | 'Message';
  /** Unsigned transaction hex (for Transaction) */
  transaction?: string;
  /** Hash to sign (for Hash) */
  hash?: string;
  /** Message to sign (for Message) */
  message?: string;
  /** External ID for tracking */
  externalId?: string;
}

/**
 * XRP Ledger-specific signature request
 */
export interface DfnsXrpLedgerSignatureRequest {
  /** Always 'XrpLedger' for XRP Ledger */
  blockchainKind: 'XrpLedger';
  /** Transaction, Hash, or Message */
  kind: 'Transaction' | 'Hash' | 'Message';
  /** Unsigned transaction hex (for Transaction) */
  transaction?: string;
  /** Hash to sign (for Hash) */
  hash?: string;
  /** Message to sign (for Message) */
  message?: string;
  /** External ID for tracking */
  externalId?: string;
}

// ===============================
// Service Layer Signature Types
// ===============================

/**
 * Options for signature generation operations
 */
export interface DfnsSignatureServiceOptions {
  /** Sync operation to database */
  syncToDatabase?: boolean;
  /** Wait for signature completion */
  waitForCompletion?: boolean;
  /** Timeout for waiting (milliseconds) */
  timeout?: number;
  /** Auto-retry failed signatures */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Signature summary for dashboard display
 */
export interface DfnsSignatureSummary {
  /** Signature request ID */
  signatureId: string;
  /** Key ID used */
  keyId: string;
  /** Blockchain kind */
  blockchainKind?: DfnsBlockchainKind;
  /** Signature kind */
  kind: DfnsSignatureKind;
  /** Network context */
  network?: string;
  /** Current status */
  status: DfnsSignatureStatus;
  /** Whether signature is completed */
  isCompleted: boolean;
  /** Whether signature is pending */
  isPending: boolean;
  /** Whether signature failed */
  isFailed: boolean;
  /** Request date */
  dateRequested: string;
  /** Completion date */
  dateSigned?: string;
  /** External ID */
  externalId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Batch signature operation result
 */
export interface DfnsSignatureBatchResult<T> {
  /** Successfully processed signatures */
  successful: T[];
  /** Failed signatures with error details */
  failed: Array<{
    signatureId: string;
    error: string;
  }>;
}

/**
 * Network signature capabilities
 */
export interface DfnsNetworkSignatureCapabilities {
  /** Network name */
  network: string;
  /** Supported blockchain kinds */
  supportedBlockchainKinds: DfnsBlockchainKind[];
  /** Supported signature kinds */
  supportedSignatureKinds: DfnsSignatureKind[];
  /** Whether network supports EIP-712 */
  supportsEip712: boolean;
  /** Whether network supports message signing */
  supportsMessageSigning: boolean;
  /** Whether network supports hash signing */
  supportsHashSigning: boolean;
}

/**
 * Component props for signature generation
 */
export interface DfnsSignatureGenerationProps {
  /** Key ID to use for signing */
  keyId: string;
  /** Key details */
  keyDetails?: DfnsKey;
  /** Available networks for signing */
  availableNetworks?: string[];
  /** Callback when signature is generated */
  onSignatureGenerated?: (signature: DfnsGenerateSignatureResponse) => void;
  /** Callback when signature fails */
  onSignatureFailed?: (error: string) => void;
  /** Whether form is disabled */
  disabled?: boolean;
}

// ===============================
// Database Integration Types for Signatures
// ===============================

/**
 * Database representation of DFNS signature request
 * Maps to dfns_signature_requests table
 */
export interface DfnsSignatureDatabaseRecord {
  id: string;
  signature_id: string;
  key_id: string;
  blockchain_kind?: string;
  signature_kind: string;
  network?: string;
  status: string;
  request_body: Record<string, any>;
  signature_data?: Record<string, any>;
  signed_data?: string;
  requester_user_id?: string;
  requester_app_id: string;
  external_id?: string;
  error_message?: string;
  date_requested: string;
  date_signed?: string;
  date_cancelled?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// ===============================
// Utility Types
// ===============================

/**
 * Supported networks by scheme and curve
 */
export const DFNS_KEY_NETWORK_COMPATIBILITY: Record<DfnsKeyScheme, Record<DfnsKeyCurve, string[]>> = {
  ECDSA: {
    secp256k1: [
      'Ethereum', 'Bitcoin', 'BitcoinCash', 'Cosmos', 'Kaspa', 'Tron', 'Xrpl'
    ],
    stark: [
      // Starknet and other STARK-based networks
    ],
    ed25519: [] // ECDSA doesn't use ed25519
  },
  EdDSA: {
    ed25519: [
      'Algorand', 'Aptos', 'Canton', 'Cardano', 'Icp', 'Iota', 'Polymesh',
      'Solana', 'Stellar', 'Substrate', 'Sui', 'Tezos', 'Ton', 'Xrpl'
    ],
    secp256k1: [], // EdDSA doesn't use secp256k1
    stark: [] // EdDSA doesn't use stark
  },
  Schnorr: {
    secp256k1: [
      'Bitcoin' // Bitcoin supports both ECDSA and Schnorr
    ],
    ed25519: [], // Schnorr doesn't use ed25519
    stark: [] // Schnorr doesn't use stark
  }
};

/**
 * Helper type for scheme/curve validation
 */
export type DfnsValidSchemeCurvePair = 
  | { scheme: 'ECDSA'; curve: 'secp256k1' | 'stark' }
  | { scheme: 'EdDSA'; curve: 'ed25519' }
  | { scheme: 'Schnorr'; curve: 'secp256k1' };

// Note: All types are exported individually above where they are defined
