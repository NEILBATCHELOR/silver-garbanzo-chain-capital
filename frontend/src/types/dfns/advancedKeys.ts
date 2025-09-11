/**
 * DFNS Advanced Keys API Types
 * 
 * TypeScript definitions for Advanced Keys operations:
 * - Key Import (migrate external keys to DFNS)
 * - Key Export (backup keys from DFNS)  
 * - Deterministic Derivation (generate derived outputs)
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/advanced-keys-apis
 */

import type { KeyScheme, KeyCurve, Key } from './key';

// ==============================================
// Common Advanced Keys Types
// ==============================================

/**
 * Supported MPC protocols for import/export
 */
export type MpcProtocol = 'CGGMP21' | 'FROST' | 'FROST_BITCOIN';

/**
 * Signer information from DFNS cluster
 */
export interface SignerInfo {
  /** Unique signer identifier */
  id: string;
  
  /** Signer's public encryption key for secure operations */
  encryptionKey: string;
  
  /** Whether signer is currently available */
  available: boolean;
}

/**
 * Encrypted key share for import/export operations
 */
export interface EncryptedKeyShare {
  /** Signer ID that will receive/provide this key share */
  signerId: string;
  
  /** Key share encrypted with signer's encryption key */
  encryptedKeyShare: string;
}

/**
 * Supported scheme for import/export operations
 */
export interface SupportedScheme {
  /** MPC protocol to use */
  protocol: MpcProtocol;
  
  /** Elliptic curve */
  curve: KeyCurve;
}

// ==============================================
// Key Import Types
// ==============================================

/**
 * Request to import an external key into DFNS
 */
export interface ImportKeyRequest {
  /** Human-readable name for the imported key */
  name?: string;
  
  /** MPC protocol to use for key shares */
  protocol: MpcProtocol;
  
  /** Elliptic curve of the key being imported */
  curve: KeyCurve;
  
  /** Minimum signers required (always 3 for DFNS) */
  minSigners: 3;
  
  /** Array of encrypted key shares for each signer */
  encryptedKeyShares: EncryptedKeyShare[];
}

/**
 * Response from key import operation
 */
export interface ImportKeyResponse extends Key {
  /** Confirms the key was imported (not generated) */
  imported: true;
}

/**
 * Key import operation options
 */
export interface KeyImportOptions {
  /** Whether to sync imported key to database */
  syncToDatabase?: boolean;
  
  /** External ID for tracking */
  externalId?: string;
  
  /** Number of retry attempts */
  retries?: number;
  
  /** Operation timeout in milliseconds */
  timeout?: number;
  
  /** Whether to validate key shares before import */
  validateKeyShares?: boolean;
}

/**
 * Key import preparation result (client-side processing)
 */
export interface KeyImportPreparation {
  /** Original private key being imported (hex format) */
  privateKey: string;
  
  /** Derived public key for verification */
  publicKey: string;
  
  /** Key format information */
  keyFormat: {
    scheme: KeyScheme;
    curve: KeyCurve;
    protocol: MpcProtocol;
  };
  
  /** Prepared encrypted key shares for import */
  encryptedKeyShares: EncryptedKeyShare[];
  
  /** Number of shares created */
  shareCount: number;
  
  /** Validation status */
  isValid: boolean;
}

// ==============================================
// Key Export Types
// ==============================================

/**
 * Request to export a key from DFNS
 */
export interface ExportKeyRequest {
  /** Public key of asymmetric key pair for encryption */
  encryptionKey: string;
  
  /** Supported schemes for export */
  supportedSchemes: SupportedScheme[];
  
  /** Whether to delete key after export (default: true) */
  deleteAfterExport?: boolean;
}

/**
 * Response from key export operation
 */
export interface ExportKeyResponse {
  /** Public key of the exported key */
  publicKey: string;
  
  /** MPC protocol used */
  protocol: MpcProtocol;
  
  /** Elliptic curve */
  curve: KeyCurve;
  
  /** Minimum signers (always 3) */
  minSigners: 3;
  
  /** Encrypted key shares from each signer */
  encryptedKeyShares: EncryptedKeyShare[];
}

/**
 * Key export operation options
 */
export interface KeyExportOptions {
  /** Whether to sync export status to database */
  syncToDatabase?: boolean;
  
  /** External ID for tracking */
  externalId?: string;
  
  /** Number of retry attempts (lower for destructive ops) */
  retries?: number;
  
  /** Operation timeout in milliseconds */
  timeout?: number;
  
  /** Whether to create backup before export */
  createBackup?: boolean;
  
  /** Confirmation of destructive operation */
  confirmDeletion?: boolean;
}

/**
 * Key export preparation (client-side encryption setup)
 */
export interface KeyExportPreparation {
  /** Generated encryption key pair for secure export */
  encryptionKeyPair: {
    publicKey: string;   // Send to DFNS
    privateKey: string;  // Keep locally for decryption
  };
  
  /** Supported schemes for this key */
  supportedSchemes: SupportedScheme[];
  
  /** Whether export will delete the key */
  willDeleteKey: boolean;
  
  /** Estimated export time */
  estimatedTime: number;
}

/**
 * Key export reconstruction result (client-side processing)
 */
export interface KeyExportReconstruction {
  /** Reconstructed private key (hex format) */
  privateKey: string;
  
  /** Verified public key */
  publicKey: string;
  
  /** Key format information */
  keyFormat: {
    scheme: KeyScheme;
    curve: KeyCurve;
    protocol: MpcProtocol;
  };
  
  /** Reconstruction metadata */
  metadata: {
    sharesProcessed: number;
    sharesRequired: number;
    reconstructionTime: number;
    isValid: boolean;
  };
}

// ==============================================
// Deterministic Derivation Types
// ==============================================

/**
 * Request for deterministic key derivation
 */
export interface DeriveKeyRequest {
  /** Domain separation tag (hex-encoded) */
  domain: string;
  
  /** Seed value (hex-encoded) */
  seed: string;
}

/**
 * Response from key derivation operation
 */
export interface DeriveKeyResponse {
  /** Derived output (hex-encoded) */
  output: string;
}

/**
 * Key derivation operation options
 */
export interface KeyDerivationOptions {
  /** Whether to cache derivation results */
  enableCaching?: boolean;
  
  /** Number of retry attempts */
  retries?: number;
  
  /** Operation timeout in milliseconds */
  timeout?: number;
  
  /** Whether to validate domain/seed format */
  validateInputs?: boolean;
}

/**
 * Derivation context for reproducible results
 */
export interface DerivationContext {
  /** Key ID used for derivation */
  keyId: string;
  
  /** Domain separation tag (original format) */
  domain: string;
  
  /** Seed value (original format) */
  seed: string;
  
  /** Derived output */
  output: string;
  
  /** Derivation timestamp */
  derivedAt: string;
  
  /** Whether result was cached */
  fromCache: boolean;
}

/**
 * Domain separation tag helpers
 */
export interface DomainSeparationTag {
  /** Company/organization identifier */
  company: string;
  
  /** Application name */
  application: string;
  
  /** Version identifier */
  version: string;
  
  /** Additional context */
  context?: string;
}

// ==============================================
// Advanced Keys Service Types
// ==============================================

/**
 * Advanced keys service metrics
 */
export interface AdvancedKeysMetrics {
  /** Import operation counts */
  imports: {
    total: number;
    successful: number;
    failed: number;
  };
  
  /** Export operation counts */
  exports: {
    total: number;
    successful: number;
    failed: number;
  };
  
  /** Derivation operation counts */
  derivations: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  
  /** Overall success rates */
  successRates: {
    import: number;
    export: number;
    derivation: number;
  };
}

/**
 * Advanced keys service status
 */
export interface AdvancedKeysServiceStatus {
  /** Whether import endpoint is enabled */
  importEnabled: boolean;
  
  /** Whether export endpoint is enabled */
  exportEnabled: boolean;
  
  /** Whether derivation endpoint is enabled */
  derivationEnabled: boolean;
  
  /** Available signers for operations */
  availableSigners: number;
  
  /** Service health status */
  healthy: boolean;
  
  /** Last health check timestamp */
  lastHealthCheck: string;
}

// ==============================================
// Error Types
// ==============================================

/**
 * Advanced keys specific error codes
 */
export type AdvancedKeysErrorCode = 
  | 'KEY_IMPORT_FAILED'
  | 'KEY_EXPORT_FAILED'
  | 'KEY_DERIVATION_FAILED'
  | 'INVALID_KEY_SHARES'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'SIGNER_UNAVAILABLE'
  | 'PROTOCOL_NOT_SUPPORTED'
  | 'ENDPOINT_DISABLED'
  | 'CONTRACTUAL_RESTRICTION';

/**
 * Advanced keys error context
 */
export interface AdvancedKeysErrorContext {
  /** Operation type */
  operation: 'import' | 'export' | 'derivation';
  
  /** Key ID if applicable */
  keyId?: string;
  
  /** Protocol used */
  protocol?: MpcProtocol;
  
  /** Number of signers involved */
  signerCount?: number;
  
  /** Additional error details */
  details?: any;
}

// ==============================================
// Utility Types
// ==============================================

/**
 * Key format validation for advanced operations
 */
export interface AdvancedKeyFormatValidation {
  /** Whether format is supported for import */
  supportsImport: boolean;
  
  /** Whether format is supported for export */
  supportsExport: boolean;
  
  /** Whether format is supported for derivation */
  supportsDerivation: boolean;
  
  /** Recommended MPC protocols */
  recommendedProtocols: MpcProtocol[];
  
  /** Validation warnings */
  warnings: string[];
}

/**
 * Signer cluster information
 */
export interface SignerClusterInfo {
  /** Total number of signers */
  totalSigners: number;
  
  /** Number of available signers */
  availableSigners: number;
  
  /** Threshold required for operations */
  threshold: number;
  
  /** Individual signer details */
  signers: SignerInfo[];
  
  /** Cluster health status */
  healthy: boolean;
}

// ==============================================
// Constants
// ==============================================

/**
 * Default domain separation tag format
 */
export const DEFAULT_DOMAIN_SEPARATOR = 'dfns:documentation:key_derive';

/**
 * Supported MPC protocols by curve
 */
export const PROTOCOL_CURVE_COMPATIBILITY: Record<MpcProtocol, KeyCurve[]> = {
  'CGGMP21': ['secp256k1'],
  'FROST': ['ed25519'],
  'FROST_BITCOIN': ['secp256k1']
} as const;

/**
 * Default import/export configuration
 */
export const DEFAULT_ADVANCED_KEYS_CONFIG = {
  minSigners: 3,
  defaultRetries: 2,        // Lower for destructive operations
  defaultTimeout: 60000,    // 60 seconds for complex operations
  deleteAfterExport: true,  // Default DFNS behavior
  validateInputs: true
} as const;

// ==============================================
// Type Guards
// ==============================================

/**
 * Type guard for MPC protocol
 */
export function isMpcProtocol(value: any): value is MpcProtocol {
  return typeof value === 'string' && 
    ['CGGMP21', 'FROST', 'FROST_BITCOIN'].includes(value);
}

/**
 * Type guard for encrypted key share
 */
export function isEncryptedKeyShare(value: any): value is EncryptedKeyShare {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.signerId === 'string' &&
    typeof value.encryptedKeyShare === 'string'
  );
}

/**
 * Type guard for signer info
 */
export function isSignerInfo(value: any): value is SignerInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.encryptionKey === 'string' &&
    typeof value.available === 'boolean'
  );
}
