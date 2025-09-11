/**
 * DFNS Keys API - Extended Types & Integration
 * 
 * This file extends the core Keys API types with additional functionality:
 * - Signature generation integration
 * - Database mappings  
 * - UI component props
 * - Service layer extensions
 * 
 * Core Keys API types are imported from './key.ts'
 */

// Import core Keys API types from focused implementation
export * from './key';
import type {
  Key,
  KeyScheme, 
  KeyCurve,
  KeyStatus,
  CreateKeyRequest,
  UpdateKeyRequest,
  DelegateKeyRequest,
  ListKeysResponse,
  KeyFormat,
  KeyStatistics
} from './key';

// ===============================
// Extended Service Layer Types
// ===============================

/**
 * Extended key creation options with UI/service features
 */
export interface ExtendedKeyCreationOptions {
  /** Auto-create wallets for specified networks */
  autoCreateWallets?: string[];
  /** Tags to apply to created wallets */
  walletTags?: string[];
  /** External ID for tracking */
  externalId?: string;
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
 * Enhanced key summary for dashboard display
 */
export interface KeySummaryForDashboard {
  /** Key ID */
  keyId: string;
  /** Key name */
  name?: string;
  /** Key scheme */
  scheme: KeyScheme;
  /** Key curve */
  curve: KeyCurve;
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
 * Batch operation result for keys
 */
export interface KeyBatchOperationResult<T> {
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: Array<{
    keyId: string;
    error: string;
    details?: any;
  }>;
  /** Total operations attempted */
  total: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
}

// ===============================
// Database Integration Types
// ===============================

/**
 * Database representation of DFNS key (Supabase schema)
 * Maps to dfns_keys table
 */
export interface KeyDatabaseRecord {
  id: string;
  dfns_key_id: string;
  name?: string;
  scheme: string;
  curve: string;
  public_key: string;
  status: string;
  custodial: boolean;
  imported: boolean;
  exported: boolean;
  date_exported?: string;
  delegated_to?: string;
  store_kind?: string;
  store_key_id?: string;
  wallet_count: number;
  organization_id?: string;
  external_id?: string;
  tags?: string[];
  date_created: string;
  created_at: string;
  updated_at: string;
}

// ===============================
// Component Props Types
// ===============================

/**
 * Props for key creation form component
 */
export interface KeyCreationFormProps {
  /** Callback when key is created */
  onKeyCreated?: (key: Key) => void;
  /** Initial scheme selection */
  defaultScheme?: KeyScheme;
  /** Initial curve selection */
  defaultCurve?: KeyCurve;
  /** Whether to show advanced options */
  showAdvancedOptions?: boolean;
  /** Available networks for wallet creation */
  availableNetworks?: string[];
  /** Whether form is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Props for key management dashboard
 */
export interface KeyManagementDashboardProps {
  /** Optional user ID to filter delegated keys */
  userId?: string;
  /** Callback when key is selected */
  onKeySelected?: (key: Key) => void;
  /** Whether to show delegation controls */
  showDelegationControls?: boolean;
  /** Whether to show multichain features */
  showMultichainFeatures?: boolean;
  /** Current page for pagination */
  currentPage?: number;
  /** Items per page */
  itemsPerPage?: number;
}

/**
 * Props for key delegation dialog
 */
export interface KeyDelegationDialogProps {
  /** Key to delegate */
  keyId: string;
  /** Current key details */
  keyDetails?: Key;
  /** Available users for delegation */
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  /** Callback when delegation is complete */
  onDelegationComplete?: (key: Key) => void;
  /** Callback when dialog is cancelled */
  onCancel?: () => void;
  /** Whether dialog is open */
  open?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Props for key list component
 */
export interface KeyListProps {
  /** Keys to display */
  keys: Key[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Callback when key is selected */
  onKeySelect?: (key: Key) => void;
  /** Callback when key is deleted */
  onKeyDelete?: (keyId: string) => void;
  /** Callback when key is delegated */
  onKeyDelegate?: (keyId: string, userId: string) => void;
  /** Whether to show actions */
  showActions?: boolean;
  /** Whether user can delete keys */
  canDelete?: boolean;
  /** Whether user can delegate keys */
  canDelegate?: boolean;
}

/**
 * Props for key statistics card
 */
export interface KeyStatisticsCardProps {
  /** Key statistics */
  statistics: KeyStatistics;
  /** Loading state */
  loading?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Card variant */
  variant?: 'default' | 'compact' | 'detailed';
}

// ===============================
// Keys Signature Generation Types
// ===============================

/**
 * Blockchain kinds for signature generation
 */
export type BlockchainKind = 
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
 * Signature kinds supported by DFNS Keys API
 */
export type SignatureKind = 
  | 'Transaction'   // Raw transaction signing
  | 'Hash'          // Hash signing  
  | 'Message'       // Message signing
  | 'Eip712'        // EIP-712 typed data signing
  | 'Psbt'          // Bitcoin PSBT signing
  | 'Bip322';       // Bitcoin BIP-322 message signing

/**
 * Signature status values
 */
export type SignatureStatus = 'Pending' | 'Signed' | 'Failed' | 'Cancelled';

/**
 * Request to generate a signature with a key
 */
export interface GenerateSignatureRequest {
  /** Blockchain hint for interpreting data format */
  blockchainKind?: BlockchainKind;
  /** Type of signature to generate */
  kind: SignatureKind;
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
export interface SignatureData {
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
 * Response from generating a signature
 */
export interface GenerateSignatureResponse {
  /** Unique signature request ID */
  id: string;
  /** Key ID used for signing */
  keyId: string;
  /** Blockchain network context */
  network?: string;
  /** Original request body */
  requestBody: GenerateSignatureRequest;
  /** Current status */
  status: SignatureStatus;
  /** Signature data (if signed) */
  signature?: SignatureData;
  /** Signed data (encoded result) */
  signedData?: string;
  /** ISO 8601 date when request was made */
  dateRequested: string;
  /** ISO 8601 date when signature was completed */
  dateSigned?: string;
  /** Error message if failed */
  error?: string;
}

// ===============================
// Network-Specific Signature Types
// ===============================

/**
 * EVM-specific signature request
 */
export interface EvmSignatureRequest extends GenerateSignatureRequest {
  blockchainKind: 'Evm';
  kind: 'Transaction' | 'Hash' | 'Message' | 'Eip712';
}

/**
 * Bitcoin-specific signature request
 */
export interface BitcoinSignatureRequest extends GenerateSignatureRequest {
  blockchainKind: 'Bitcoin';
  kind: 'Psbt' | 'Hash' | 'Bip322';
}

/**
 * Solana-specific signature request
 */
export interface SolanaSignatureRequest extends GenerateSignatureRequest {
  blockchainKind: 'Solana';
  kind: 'Transaction' | 'Hash' | 'Message';
}

// ===============================
// Validation & Utility Types
// ===============================

/**
 * Key validation result with detailed feedback
 */
export interface KeyValidationResult {
  /** Whether key is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Network compatibility analysis */
  networkCompatibility: Array<{
    network: string;
    compatible: boolean;
    reason?: string;
  }>;
  /** Recommended networks for this key */
  recommendedNetworks: string[];
}

/**
 * Network signature capabilities analysis
 */
export interface NetworkSignatureCapabilities {
  /** Network name */
  network: string;
  /** Supported blockchain kinds */
  supportedBlockchainKinds: BlockchainKind[];
  /** Supported signature kinds */
  supportedSignatureKinds: SignatureKind[];
  /** Whether network supports EIP-712 */
  supportsEip712: boolean;
  /** Whether network supports message signing */
  supportsMessageSigning: boolean;
  /** Whether network supports hash signing */
  supportsHashSigning: boolean;
}

// ===============================
// Legacy Compatibility Types
// ===============================

/**
 * @deprecated Use Key from './key' instead
 */
export type DfnsKey = Key;

/**
 * @deprecated Use KeyScheme from './key' instead
 */
export type DfnsKeyScheme = KeyScheme;

/**
 * @deprecated Use KeyCurve from './key' instead
 */
export type DfnsKeyCurve = KeyCurve;

/**
 * @deprecated Use CreateKeyRequest from './key' instead
 */
export type DfnsCreateKeyRequest = CreateKeyRequest;

/**
 * @deprecated Use UpdateKeyRequest from './key' instead
 */
export type DfnsUpdateKeyRequest = UpdateKeyRequest;

/**
 * @deprecated Use DelegateKeyRequest from './key' instead
 */
export type DfnsDelegateKeyRequest = DelegateKeyRequest;

// ===============================
// Constants & Mappings
// ===============================

/**
 * Extended network compatibility mapping (includes legacy networks)
 */
export const EXTENDED_NETWORK_COMPATIBILITY: Record<string, KeyFormat[]> = {
  // Modern networks (from core implementation)
  ...require('./key').NETWORK_KEY_COMPATIBILITY,
  
  // Legacy network names for backward compatibility
  'BinanceSmartChain': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'BSC': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'Matic': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'AVAX': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'FTM': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  
  // Additional test networks
  'EthereumGoerli': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'EthereumSepolia': [{ scheme: 'ECDSA', curve: 'secp256k1' }],
  'BitcoinTestnet': [
    { scheme: 'ECDSA', curve: 'secp256k1' },
    { scheme: 'Schnorr', curve: 'secp256k1' }
  ]
} as const;

/**
 * Default signature capabilities by network
 */
export const DEFAULT_SIGNATURE_CAPABILITIES: Record<string, NetworkSignatureCapabilities> = {
  'Ethereum': {
    network: 'Ethereum',
    supportedBlockchainKinds: ['Evm'],
    supportedSignatureKinds: ['Transaction', 'Hash', 'Message', 'Eip712'],
    supportsEip712: true,
    supportsMessageSigning: true,
    supportsHashSigning: true
  },
  'Bitcoin': {
    network: 'Bitcoin',
    supportedBlockchainKinds: ['Bitcoin'],
    supportedSignatureKinds: ['Psbt', 'Hash', 'Bip322'],
    supportsEip712: false,
    supportsMessageSigning: true,
    supportsHashSigning: true
  },
  'Solana': {
    network: 'Solana',
    supportedBlockchainKinds: ['Solana'],
    supportedSignatureKinds: ['Transaction', 'Hash', 'Message'],
    supportsEip712: false,
    supportsMessageSigning: true,
    supportsHashSigning: true
  }
} as const;
