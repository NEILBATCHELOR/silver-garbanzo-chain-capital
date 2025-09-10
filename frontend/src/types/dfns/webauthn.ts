/**
 * WebAuthn Credential Types for DFNS Integration
 * 
 * Types for the webauthn_credentials and webauthn_challenges tables
 * These tables are wallet-specific (not user-specific) for multi-wallet support
 */

// ================================
// DATABASE TYPES
// ================================

// WebAuthn Credential (Database Table) - Updated for DFNS Integration
export interface WebAuthnCredential {
  id: string; // uuid primary key
  wallet_id: string; // uuid foreign key to wallets table
  credential_id: string; // DFNS credential ID (from DFNS API response)
  public_key_x: string; // EC public key X coordinate (extracted from DFNS)
  public_key_y: string; // EC public key Y coordinate (extracted from DFNS)
  authenticator_data?: string; // DFNS credential metadata (JSON encoded)
  is_primary?: boolean; // Whether this is the primary credential for the wallet
  device_name?: string; // Human-readable device name
  platform?: string; // Platform/browser information
  dfns_credential_uuid?: string; // DFNS credential UUID for API operations
  dfns_credential_name?: string; // DFNS credential name
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
}

// WebAuthn Challenge (Database Table)
export interface WebAuthnChallenge {
  id: string; // uuid primary key
  wallet_id: string; // uuid foreign key to wallets table
  challenge: string; // Challenge string from DFNS/WebAuthn
  challenge_type: 'registration' | 'authentication'; // Type of challenge
  expires_at: string; // ISO timestamp when challenge expires
  is_used?: boolean; // Whether the challenge has been used
  created_at?: string; // ISO timestamp
}

// ================================
// API REQUEST/RESPONSE TYPES
// ================================

// Create WebAuthn Credential Request
export interface CreateWebAuthnCredentialRequest {
  wallet_id: string;
  device_name?: string;
  platform?: string;
  is_primary?: boolean;
}

// Create WebAuthn Credential Response
export interface CreateWebAuthnCredentialResponse extends WebAuthnCredential {}

// List WebAuthn Credentials Request
export interface ListWebAuthnCredentialsRequest {
  wallet_id?: string; // Optional wallet filter
  is_primary?: boolean; // Optional primary filter
}

// List WebAuthn Credentials Response
export interface ListWebAuthnCredentialsResponse {
  credentials: WebAuthnCredential[];
  total: number;
}

// Update WebAuthn Credential Request
export interface UpdateWebAuthnCredentialRequest {
  id: string;
  device_name?: string;
  platform?: string;
  is_primary?: boolean;
}

// Update WebAuthn Credential Response
export interface UpdateWebAuthnCredentialResponse extends WebAuthnCredential {}

// Delete WebAuthn Credential Request
export interface DeleteWebAuthnCredentialRequest {
  id: string;
}

// Delete WebAuthn Credential Response
export interface DeleteWebAuthnCredentialResponse {
  success: boolean;
}

// ================================
// CHALLENGE TYPES
// ================================

// Create WebAuthn Challenge Request
export interface CreateWebAuthnChallengeRequest {
  wallet_id: string;
  challenge_type: 'registration' | 'authentication';
  challenge: string;
  expires_in_seconds?: number; // Default 300 (5 minutes)
}

// Create WebAuthn Challenge Response
export interface CreateWebAuthnChallengeResponse extends WebAuthnChallenge {}

// Get WebAuthn Challenge Request
export interface GetWebAuthnChallengeRequest {
  challenge: string;
  wallet_id?: string; // Optional wallet filter for validation
}

// Get WebAuthn Challenge Response
export interface GetWebAuthnChallengeResponse extends WebAuthnChallenge {}

// Mark Challenge as Used Request
export interface MarkChallengeUsedRequest {
  challenge: string;
  wallet_id: string;
}

// Mark Challenge as Used Response
export interface MarkChallengeUsedResponse {
  success: boolean;
}

// ================================
// WEBAUTHN BROWSER API TYPES
// ================================

// WebAuthn Registration Options
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number; // -7 for ES256, -257 for RS256
  }>;
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  excludeCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'required' | 'preferred' | 'discouraged';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

// WebAuthn Authentication Options
export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

// WebAuthn Registration Result
export interface WebAuthnRegistrationResult {
  credential_id: string;
  public_key_x: string;
  public_key_y: string;
  authenticator_data: string;
  client_data_json: string;
  attestation_object: string;
}

// WebAuthn Authentication Result
export interface WebAuthnAuthenticationResult {
  credential_id: string;
  authenticator_data: string;
  client_data_json: string;
  signature: string;
  user_handle?: string;
}

// ================================
// SERVICE TYPES
// ================================

// WebAuthn Service Options
export interface WebAuthnServiceOptions {
  syncToDatabase?: boolean;
  validateWallet?: boolean;
  checkExistingCredentials?: boolean;
}

// Credential Summary for Dashboard
export interface WebAuthnCredentialSummary {
  id: string;
  wallet_id: string;
  credential_id: string;
  device_name?: string;
  platform?: string;
  is_primary: boolean;
  created_at: string;
  last_used_at?: string;
}

// Wallet Credential Summary
export interface WalletCredentialSummary {
  wallet_id: string;
  wallet_name?: string;
  credential_count: number;
  primary_credential?: WebAuthnCredentialSummary;
  last_used_at?: string;
}

// Batch Operation Result
export interface BatchWebAuthnResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// ================================
// ERROR TYPES
// ================================

// WebAuthn Error
export interface WebAuthnError {
  code: string;
  message: string;
  details?: any;
}

// Common WebAuthn Error Codes
export enum WebAuthnErrorCode {
  NOT_SUPPORTED = 'WEBAUTHN_NOT_SUPPORTED',
  REGISTRATION_FAILED = 'WEBAUTHN_REGISTRATION_FAILED',
  AUTHENTICATION_FAILED = 'WEBAUTHN_AUTHENTICATION_FAILED',
  CHALLENGE_EXPIRED = 'WEBAUTHN_CHALLENGE_EXPIRED',
  CHALLENGE_NOT_FOUND = 'WEBAUTHN_CHALLENGE_NOT_FOUND',
  CREDENTIAL_NOT_FOUND = 'WEBAUTHN_CREDENTIAL_NOT_FOUND',
  WALLET_NOT_FOUND = 'WEBAUTHN_WALLET_NOT_FOUND',
  INVALID_CREDENTIAL = 'WEBAUTHN_INVALID_CREDENTIAL',
  DUPLICATE_CREDENTIAL = 'WEBAUTHN_DUPLICATE_CREDENTIAL',
  USER_CANCELLED = 'WEBAUTHN_USER_CANCELLED',
  TIMEOUT = 'WEBAUTHN_TIMEOUT',
  NETWORK_ERROR = 'WEBAUTHN_NETWORK_ERROR',
}

// ================================
// UTILITY TYPES
// ================================

// EC Public Key (for parsing WebAuthn credentials)
export interface ECPublicKey {
  x: string; // Base64url encoded X coordinate
  y: string; // Base64url encoded Y coordinate
  kty: 'EC'; // Key type
  crv: 'P-256'; // Curve (usually P-256 for WebAuthn)
  alg?: string; // Algorithm (ES256, etc.)
}

// Authenticator Info
export interface AuthenticatorInfo {
  aaguid?: string; // Authenticator AAGUID
  make?: string; // Device manufacturer
  model?: string; // Device model
  platform?: string; // Platform type
  transport?: AuthenticatorTransport[]; // Supported transports
  residentKey?: boolean; // Supports resident keys
  userVerification?: boolean; // Supports user verification
}

// Challenge Validation Result
export interface ChallengeValidationResult {
  valid: boolean;
  challenge?: WebAuthnChallenge;
  error?: string;
}

// Credential Validation Result
export interface CredentialValidationResult {
  valid: boolean;
  credential?: WebAuthnCredential;
  error?: string;
}
