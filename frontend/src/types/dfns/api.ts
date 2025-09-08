/**
 * DFNS API Types
 * 
 * Types for DFNS API integration and client configuration
 */

// DFNS API Configuration
export interface DfnsApiConfig {
  baseUrl: string;
  applicationId: string;
  authToken?: string;
  appOrigin?: string;
  rpId?: string;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

// DFNS SDK Configuration
export interface DfnsSdkConfig extends DfnsApiConfig {
  credentialProvider?: DfnsCredentialProvider;
  signerProvider?: DfnsSignerProvider;
  userActionSigner?: DfnsUserActionSigner;
}

// Credential Provider Interface
export interface DfnsCredentialProvider {
  getCredential(): Promise<DfnsApiCredential>;
  refreshCredential?(): Promise<DfnsApiCredential>;
}

// Signer Provider Interface
export interface DfnsSignerProvider {
  sign(message: string): Promise<string>;
  getPublicKey(): Promise<string>;
}

// User Action Signer Interface
export interface DfnsUserActionSigner {
  signUserAction(challenge: string): Promise<DfnsUserActionSignature>;
}

// API Credential
export interface DfnsApiCredential {
  credentialId: string;
  privateKey: string;
  publicKey: string;
  algorithm: string;
}

// User Action Signature (from auth types)
export interface DfnsUserActionSignature {
  challengeIdentifier: string;
  firstFactor: {
    kind: string;
    credentialAssertion: any;
  };
}

// API Request Headers
export interface DfnsApiHeaders {
  'Content-Type': 'application/json';
  'X-DFNS-APPID': string;
  'X-DFNS-NONCE': string;
  'X-DFNS-TIMESTAMP': string;
  'X-DFNS-SIGNATURE': string;
  'X-DFNS-USERACTION'?: string;
  'Authorization'?: string;
}

// API Request Log
export interface DfnsApiRequestLog {
  id: string;
  endpoint: string;
  method: string;
  request_id?: string;
  request_body?: Record<string, any>;
  response_body?: Record<string, any>;
  status_code: number;
  response_time_ms?: number;
  error_message?: string;
  user_id?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// Pagination
export interface DfnsPagination {
  limit?: number;
  paginationToken?: string;
}

// Paginated Response
export interface DfnsPaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalCount?: number;
}

// API Error Response
export interface DfnsApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId?: string;
  timestamp: string;
}

// Client Options
export interface DfnsClientOptions {
  environment?: 'sandbox' | 'production';
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
  customHeaders?: Record<string, string>;
}
