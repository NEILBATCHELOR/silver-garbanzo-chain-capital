/**
 * DFNS Key Service Types
 * 
 * TypeScript type definitions for the DFNS Keys API service.
 * These types match the current DFNS Keys API specification.
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys
 */

// ==============================================
// Core Key Entity Types
// ==============================================

/**
 * Supported cryptographic schemes in DFNS
 */
export type KeyScheme = 'ECDSA' | 'EdDSA' | 'Schnorr';

/**
 * Supported elliptic curves by scheme
 */
export type KeyCurve = 
  | 'secp256k1'  // ECDSA (Bitcoin, Ethereum), Schnorr (Bitcoin Taproot)
  | 'stark'      // ECDSA (StarkNet)
  | 'ed25519';   // EdDSA (Solana, Stellar, Cardano, etc.)

/**
 * Key lifecycle status
 */
export type KeyStatus = 'Active' | 'Archived';

/**
 * Key store backend type
 */
export type KeyStoreKind = 'Mpc' | 'Hsm';

/**
 * Permission operations for keys
 */
export type KeyPermission = 
  | 'Keys:Create'   // Create new keys
  | 'Keys:Read'     // Read key information
  | 'Keys:Update'   // Update key metadata
  | 'Keys:Delete'   // Delete keys and associated wallets
  | 'Keys:Delegate' // Delegate keys to end users
  | 'Keys:Reuse'    // Reuse existing keys for wallet creation
  | 'Keys:Import'   // Import external keys
  | 'Keys:Export';  // Export keys for backup

// ==============================================
// API Request/Response Types
// ==============================================

/**
 * Wallet information attached to a key
 */
export interface KeyWalletInfo {
  id: string;      // Wallet ID
  network: string; // Blockchain network
}

/**
 * Key store information for backup and recovery
 */
export interface KeyStoreInfo {
  kind: KeyStoreKind; // Storage backend type
  keyId: string;      // Internal identifier for Layer 4 backup
}

/**
 * Core key entity (matches DFNS API response)
 */
export interface Key {
  /** Unique key identifier */
  id: string;
  
  /** Human-readable key name */
  name?: string;
  
  /** Cryptographic scheme */
  scheme: KeyScheme;
  
  /** Elliptic curve */
  curve: KeyCurve;
  
  /** Hex-encoded public key */
  publicKey: string;
  
  /** Key lifecycle status */
  status: KeyStatus;
  
  /** Whether key is custodial (organization) or non-custodial (user) */
  custodial: boolean;
  
  /** ISO 8601 creation timestamp */
  dateCreated: string;
  
  /** Whether key was imported from external source */
  imported?: boolean;
  
  /** Whether key has been exported */
  exported?: boolean;
  
  /** ISO 8601 first export timestamp */
  dateExported?: string;
  
  /** Associated wallets (only returned by getKey) */
  wallets?: KeyWalletInfo[];
  
  /** Key store information (only returned by getKey) */
  store?: KeyStoreInfo;
}

/**
 * Create key request parameters
 */
export interface CreateKeyRequest {
  /** Cryptographic scheme to use */
  scheme: KeyScheme;
  
  /** Elliptic curve to use */
  curve: KeyCurve;
  
  /** Optional human-readable name */
  name?: string;
  
  /** End user ID to immediately delegate key to */
  delegateTo?: string;
  
  /** Create key for later delegation (requires Keys:Delegate later) */
  delayDelegation?: boolean;
}

/**
 * Update key request parameters
 */
export interface UpdateKeyRequest {
  /** New name for the key */
  name: string;
}

/**
 * Delegate key request parameters
 */
export interface DelegateKeyRequest {
  /** End user ID to delegate key ownership to */
  userId: string;
}

/**
 * List keys query parameters
 */
export interface ListKeysParams {
  /** Filter by delegated key owner (userId or username) */
  owner?: string;
  
  /** Maximum number of items to return (default: 100, max: 100) */
  limit?: number;
  
  /** Pagination token from previous request */
  paginationToken?: string;
}

/**
 * List keys response
 */
export interface ListKeysResponse {
  /** Array of key entities */
  items: Key[];
  
  /** Token for retrieving next page */
  nextPageToken?: string;
}

// ==============================================
// Service Configuration Types
// ==============================================

/**
 * Key operation options
 */
export interface KeyOperationOptions {
  /** Whether to sync data to local database */
  syncToDatabase?: boolean;
  
  /** Number of retry attempts for failed requests */
  retries?: number;
  
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Key service metrics
 */
export interface KeyServiceMetrics {
  /** Total number of API requests made */
  requestCount: number;
  
  /** Number of failed requests */
  errorCount: number;
  
  /** Success rate as percentage */
  successRate: number;
}

/**
 * Key service connection test result
 */
export interface KeyServiceConnectionTest {
  /** Whether connection test succeeded */
  success: boolean;
  
  /** Number of keys accessible */
  keyCount: number;
  
  /** Error message if connection failed */
  error?: string;
}

// ==============================================
// Analytics & Statistics Types
// ==============================================

/**
 * Comprehensive key statistics for dashboard
 */
export interface KeyStatistics {
  /** Total number of keys */
  totalKeys: number;
  
  /** Number of active keys */
  activeKeys: number;
  
  /** Number of archived keys */
  archivedKeys: number;
  
  /** Number of delegated (non-custodial) keys */
  delegatedKeys: number;
  
  /** Number of custodial keys */
  custodialKeys: number;
  
  /** Key count by cryptographic scheme */
  byScheme: Record<KeyScheme, number>;
  
  /** Key count by elliptic curve */
  byCurve: Record<KeyCurve, number>;
  
  /** Number of wallets per key (keyId -> count) */
  walletsPerKey: Record<string, number>;
}

/**
 * Keys categorized by custodial status
 */
export interface KeysByCustodialStatus {
  /** Organization-owned (custodial) keys */
  custodial: Key[];
  
  /** User-owned (non-custodial) keys */
  nonCustodial: Key[];
  
  /** Total number of keys */
  total: number;
}

// ==============================================
// Network Compatibility Types
// ==============================================

/**
 * Key format specification (scheme + curve combination)
 */
export interface KeyFormat {
  scheme: KeyScheme;
  curve: KeyCurve;
}

/**
 * Network compatibility information
 */
export interface NetworkKeyCompatibility {
  /** Network name */
  network: string;
  
  /** Supported key formats for this network */
  supportedFormats: KeyFormat[];
  
  /** Recommended (preferred) key format */
  recommendedFormat: KeyFormat;
}

// ==============================================
// Error Types
// ==============================================

/**
 * Key service specific error codes
 */
export type KeyServiceErrorCode = 
  | 'KEY_CREATE_FAILED'
  | 'KEY_UPDATE_FAILED'
  | 'KEY_DELETE_FAILED'
  | 'KEY_DELEGATE_FAILED'
  | 'KEY_GET_FAILED'
  | 'KEY_LIST_FAILED'
  | 'KEY_STATS_FAILED'
  | 'INVALID_KEY_FORMAT'
  | 'NETWORK_NOT_SUPPORTED'
  | 'SERVICE_NOT_INITIALIZED';

/**
 * Key service error context
 */
export interface KeyServiceErrorContext {
  /** Key ID if applicable */
  keyId?: string;
  
  /** Request parameters if applicable */
  request?: any;
  
  /** Original error object */
  error?: Error;
  
  /** Additional context data */
  [key: string]: any;
}

// ==============================================
// Constants & Configuration
// ==============================================

/**
 * Supported key scheme and curve combinations
 */
export const SUPPORTED_KEY_FORMATS: Record<KeyScheme, KeyCurve[]> = {
  'ECDSA': ['secp256k1', 'stark'],
  'EdDSA': ['ed25519'],
  'Schnorr': ['secp256k1']
} as const;

/**
 * Blockchain networks and their compatible key formats
 */
export const NETWORK_KEY_COMPATIBILITY: Record<string, KeyFormat[]> = {
  // EVM-compatible networks
  'Ethereum': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Polygon': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'BinanceSmartChain': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Avalanche': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Arbitrum': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Optimism': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  
  // Bitcoin family
  'Bitcoin': [
    { scheme: 'ECDSA', curve: 'secp256k1' },
    { scheme: 'Schnorr', curve: 'secp256k1' }
  ],
  'BitcoinCash': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Litecoin': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  
  // EdDSA-based networks
  'Solana': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Aptos': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Sui': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Stellar': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Cardano': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Algorand': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'NEAR': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'IOTA': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Ton': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Polymesh': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'ICP': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Canton': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  'Substrate': [{ scheme: 'EdDSA', curve: 'ed25519' }],
  
  // Cosmos ecosystem
  'Cosmos': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  
  // Multi-format networks
  'Tezos': [
    { scheme: 'EdDSA', curve: 'ed25519' },
    { scheme: 'ECDSA', curve: 'secp256k1' }
  ],
  'XrpLedger': [
    { scheme: 'ECDSA', curve: 'secp256k1' },
    { scheme: 'EdDSA', curve: 'ed25519' }
  ],
  
  // Other networks
  'TRON': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Kaspa': [{ scheme: 'ECDSA', curve: 'secp256k1' }]
} as const;

/**
 * Default pagination limit for list operations
 */
export const DEFAULT_LIST_LIMIT = 100;

/**
 * Maximum pagination limit enforced by API
 */
export const MAX_LIST_LIMIT = 100;

/**
 * Default retry count for failed operations
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * Lower retry count for destructive operations
 */
export const DESTRUCTIVE_OPERATION_RETRY_COUNT = 1;

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds

// ==============================================
// Type Guards
// ==============================================

/**
 * Type guard to check if a value is a valid KeyScheme
 */
export function isKeyScheme(value: any): value is KeyScheme {
  return typeof value === 'string' && ['ECDSA', 'EdDSA', 'Schnorr'].includes(value);
}

/**
 * Type guard to check if a value is a valid KeyCurve
 */
export function isKeyCurve(value: any): value is KeyCurve {
  return typeof value === 'string' && ['secp256k1', 'stark', 'ed25519'].includes(value);
}

/**
 * Type guard to check if a value is a valid KeyStatus
 */
export function isKeyStatus(value: any): value is KeyStatus {
  return typeof value === 'string' && ['Active', 'Archived'].includes(value);
}

/**
 * Type guard to check if an object is a valid Key
 */
export function isKey(value: any): value is Key {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    isKeyScheme(value.scheme) &&
    isKeyCurve(value.curve) &&
    typeof value.publicKey === 'string' &&
    isKeyStatus(value.status) &&
    typeof value.custodial === 'boolean' &&
    typeof value.dateCreated === 'string'
  );
}

// ==============================================
// Utility Types
// ==============================================

/**
 * Key creation result with additional metadata
 */
export interface KeyCreationResult extends Key {
  /** Number of networks this key format supports */
  supportedNetworks: string[];
  
  /** Whether this key can be used for wallet creation */
  canCreateWallets: boolean;
  
  /** Recommended use cases for this key format */
  recommendedUseCases: string[];
}

/**
 * Key delegation result with transfer information
 */
export interface KeyDelegationResult extends Key {
  /** Previous owner information */
  previousOwner: {
    id: string;
    type: 'organization' | 'user';
  };
  
  /** New owner information */
  newOwner: {
    id: string;
    username?: string;
  };
  
  /** Delegation timestamp */
  delegatedAt: string;
  
  /** Number of wallets transferred */
  walletsTransferred: number;
}

/**
 * Bulk key operation result
 */
export interface BulkKeyOperationResult<T = Key> {
  /** Successfully processed keys */
  successful: T[];
  
  /** Failed operations with error details */
  failed: Array<{
    keyId: string;
    error: string;
    details?: any;
  }>;
  
  /** Total number of operations attempted */
  total: number;
  
  /** Number of successful operations */
  successCount: number;
  
  /** Number of failed operations */
  failureCount: number;
}
