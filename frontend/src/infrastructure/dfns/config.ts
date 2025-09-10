/**
 * DFNS Configuration
 * 
 * Configuration settings for DFNS SDK integration
 */

import type { DfnsSdkConfig, DfnsClientOptions } from '../../types/dfns';

// Environment variables validation
const requiredEnvVars = {
  VITE_DFNS_APP_ID: import.meta.env.VITE_DFNS_APP_ID,
  VITE_DFNS_APP_ORIGIN: import.meta.env.VITE_DFNS_APP_ORIGIN,
  VITE_DFNS_RP_ID: import.meta.env.VITE_DFNS_RP_ID,
} as const;

// Check if DFNS is properly configured (non-blocking)
function isDfnsConfigured(): boolean {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  return missingVars.length === 0;
}

// Get missing environment variables for error reporting
function getMissingEnvVars(): string[] {
  return Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
}

// Export configuration status
export const DFNS_STATUS = {
  isConfigured: isDfnsConfigured(),
  missingVars: getMissingEnvVars(),
  canInitialize: isDfnsConfigured(),
} as const;

// Base configuration
export const DFNS_CONFIG = {
  // Core settings from environment
  baseUrl: import.meta.env.VITE_DFNS_BASE_URL || 'https://api.dfns.io',
  applicationId: requiredEnvVars.VITE_DFNS_APP_ID || 'or-4ogth-rni0d-83vreosehqn1nns5',
  appOrigin: requiredEnvVars.VITE_DFNS_APP_ORIGIN || 'http://localhost:5173',
  rpId: requiredEnvVars.VITE_DFNS_RP_ID || 'localhost',
  
  // Optional settings with defaults
  timeout: parseInt(process.env.VITE_DFNS_TIMEOUT || '30000'),
  environment: (process.env.VITE_DFNS_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  
  // Retry configuration
  retryConfig: {
    maxRetries: parseInt(process.env.VITE_DFNS_MAX_RETRIES || '3'),
    baseDelay: parseInt(process.env.VITE_DFNS_BASE_DELAY || '1000'),
    maxDelay: parseInt(process.env.VITE_DFNS_MAX_DELAY || '10000'),
  },
  
  // Feature flags
  enableLogging: process.env.VITE_DFNS_ENABLE_LOGGING === 'true',
  enableAnalytics: process.env.VITE_DFNS_ENABLE_ANALYTICS === 'true',
} as const;

// Client options factory
export function createDfnsClientOptions(overrides?: Partial<DfnsClientOptions>): DfnsClientOptions {
  if (!DFNS_STATUS.isConfigured) {
    console.warn('DFNS is not properly configured. Missing environment variables:', DFNS_STATUS.missingVars.join(', '));
  }
  
  return {
    environment: DFNS_CONFIG.environment,
    timeout: DFNS_CONFIG.timeout,
    retries: DFNS_CONFIG.retryConfig.maxRetries,
    enableLogging: DFNS_CONFIG.enableLogging,
    ...overrides,
  };
}

// SDK configuration factory
export function createDfnsSdkConfig(overrides?: Partial<DfnsSdkConfig>): Omit<DfnsSdkConfig, 'credentialProvider' | 'signerProvider' | 'userActionSigner'> {
  if (!DFNS_STATUS.isConfigured) {
    console.warn('DFNS SDK configuration created with placeholder values. Set proper environment variables for production use.');
  }
  
  return {
    baseUrl: DFNS_CONFIG.baseUrl,
    applicationId: DFNS_CONFIG.applicationId,
    appOrigin: DFNS_CONFIG.appOrigin,
    rpId: DFNS_CONFIG.rpId,
    timeout: DFNS_CONFIG.timeout,
    retryConfig: DFNS_CONFIG.retryConfig,
    ...overrides,
  };
}

// WebAuthn configuration
export const WEBAUTHN_CONFIG = {
  rpId: DFNS_CONFIG.rpId,
  rpName: process.env.VITE_DFNS_RP_NAME || 'Chain Capital',
  origin: DFNS_CONFIG.appOrigin,
  timeout: parseInt(process.env.VITE_DFNS_WEBAUTHN_TIMEOUT || '60000'),
  userVerification: 'required' as const,
  authenticatorAttachment: undefined, // Allow both platform and cross-platform
  residentKey: 'required' as const,
  attestation: 'direct' as const,
} as const;

// API endpoints
export const DFNS_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN_INIT: '/auth/login/init',
  AUTH_LOGIN_COMPLETE: '/auth/login',
  AUTH_LOGIN_SOCIAL: '/auth/login/social',
  AUTH_LOGIN_CODE: '/auth/login/code',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REGISTRATION_DELEGATED: '/auth/registration/delegated',
  AUTH_REGISTRATION_COMPLETE: '/auth/registration',
  AUTH_LOGIN_DELEGATED: '/auth/login/delegated',
  
  // Standard Registration APIs
  AUTH_REGISTRATION_INIT: '/auth/registration/init',
  AUTH_REGISTRATION_ENDUSER: '/auth/registration/enduser',
  AUTH_REGISTRATION_RESEND: '/auth/registration/code',
  AUTH_REGISTRATION_SOCIAL: '/auth/registration/social',
  
  // User Action Signing
  AUTH_ACTION_INIT: '/auth/action/init',
  AUTH_ACTION_COMPLETE: '/auth/action',
  
  // Users
  USERS: '/auth/users',
  USER_BY_ID: '/auth/users/:id',
  
  // User Management APIs
  AUTH_USERS_LIST: '/auth/users',
  AUTH_USERS_CREATE: '/auth/users',
  AUTH_USERS_GET: '/auth/users/:userId',
  AUTH_USERS_ACTIVATE: '/auth/users/:userId/activate',
  AUTH_USERS_DEACTIVATE: '/auth/users/:userId/deactivate',
  AUTH_USERS_ARCHIVE: '/auth/users/:userId',
  
  // Service Account Management APIs
  AUTH_SERVICE_ACCOUNTS_LIST: '/auth/service-accounts',
  AUTH_SERVICE_ACCOUNTS_CREATE: '/auth/service-accounts',
  AUTH_SERVICE_ACCOUNTS_GET: '/auth/service-accounts/:serviceAccountId',
  AUTH_SERVICE_ACCOUNTS_UPDATE: '/auth/service-accounts/:serviceAccountId',
  AUTH_SERVICE_ACCOUNTS_ACTIVATE: '/auth/service-accounts/:serviceAccountId/activate',
  AUTH_SERVICE_ACCOUNTS_DEACTIVATE: '/auth/service-accounts/:serviceAccountId/deactivate',
  AUTH_SERVICE_ACCOUNTS_ARCHIVE: '/auth/service-accounts/:serviceAccountId',
  
  // Personal Access Token Management APIs
  AUTH_PATS_LIST: '/auth/pats',
  AUTH_PATS_CREATE: '/auth/pats',
  AUTH_PATS_GET: '/auth/pats/:tokenId',
  AUTH_PATS_UPDATE: '/auth/pats/:tokenId',
  AUTH_PATS_ACTIVATE: '/auth/pats/:tokenId/activate',
  AUTH_PATS_DEACTIVATE: '/auth/pats/:tokenId/deactivate',
  AUTH_PATS_ARCHIVE: '/auth/pats/:tokenId',
  
  // Credential Management APIs
  AUTH_CREDENTIALS_INIT: '/auth/credentials/init',
  AUTH_CREDENTIALS_CREATE: '/auth/credentials',
  AUTH_CREDENTIALS_LIST: '/auth/credentials',
  AUTH_CREDENTIALS_ACTIVATE: '/auth/credentials/activate',
  AUTH_CREDENTIALS_DEACTIVATE: '/auth/credentials/deactivate',
  
  // Code-Based Credential Management APIs
  AUTH_CREDENTIALS_CODE_INIT: '/auth/credentials/code/init',
  AUTH_CREDENTIALS_CODE_VERIFY: '/auth/credentials/code/verify',
  
  // User Recovery APIs
  AUTH_RECOVERY_CODE: '/auth/recover/user/code',
  AUTH_RECOVERY_INIT: '/auth/recover/user/init',
  AUTH_RECOVERY_DELEGATED: '/auth/recover/user/delegated',
  AUTH_RECOVERY_USER: '/auth/recover/user',
  
  // Wallets - Core Management
  WALLETS_LIST: '/wallets',
  WALLETS_CREATE: '/wallets',
  WALLETS_GET: '/wallets/:walletId',
  WALLETS_UPDATE: '/wallets/:walletId',
  WALLETS_DELETE: '/wallets/:walletId',
  WALLETS_DELEGATE: '/wallets/:walletId/delegate',
  
  // Wallets - Assets & NFTs
  WALLETS_ASSETS: '/wallets/:walletId/assets',
  WALLETS_NFTS: '/wallets/:walletId/nfts',
  WALLETS_HISTORY: '/wallets/:walletId/history',
  
  // Wallets - Tags
  WALLETS_TAGS_ADD: '/wallets/:walletId/tags',
  WALLETS_TAGS_DELETE: '/wallets/:walletId/tags',
  
  // Wallets - Transfers
  WALLETS_TRANSFERS_CREATE: '/wallets/:walletId/transfers',
  WALLETS_TRANSFERS_GET: '/wallets/:walletId/transfers/:transferId',
  WALLETS_TRANSFERS_LIST: '/wallets/:walletId/transfers',
  
  // Wallets - Transaction Broadcasting
  WALLETS_TRANSACTIONS_BROADCAST: '/wallets/:walletId/transactions',
  WALLETS_TRANSACTIONS_GET: '/wallets/:walletId/transactions/:transactionId',
  WALLETS_TRANSACTIONS_LIST: '/wallets/:walletId/transactions',
  
  // Fee Sponsors Management APIs
  FEE_SPONSORS_CREATE: '/fee-sponsors',
  FEE_SPONSORS_LIST: '/fee-sponsors',
  FEE_SPONSORS_GET: '/fee-sponsors/:feeSponsorId',
  FEE_SPONSORS_ACTIVATE: '/fee-sponsors/:feeSponsorId/activate',
  FEE_SPONSORS_DEACTIVATE: '/fee-sponsors/:feeSponsorId/deactivate',
  FEE_SPONSORS_DELETE: '/fee-sponsors/:feeSponsorId',
  FEE_SPONSORS_FEES_LIST: '/fee-sponsors/:feeSponsorId/fees',
  
  // Keys Management APIs
  KEYS_CREATE: '/keys',
  KEYS_LIST: '/keys',
  KEYS_GET: '/keys/:keyId',
  KEYS_UPDATE: '/keys/:keyId',
  KEYS_DELETE: '/keys/:keyId',
  KEYS_DELEGATE: '/keys/:keyId/delegate',
  
  // Keys Signature Generation APIs (NEW)
  KEYS_SIGNATURE_GENERATE: '/keys/:keyId/signatures',
  KEYS_SIGNATURE_GET: '/keys/:keyId/signatures/:signatureId',
  KEYS_SIGNATURE_LIST: '/keys/:keyId/signatures',
  
  // Signing Keys
  SIGNING_KEYS: '/keys',
  SIGNING_KEY_BY_ID: '/keys/:id',
  
  // Signatures
  SIGNATURES: '/signatures',
  SIGNATURE_BY_ID: '/signatures/:id',
  
  // Policies (v1 - DEPRECATED)
  POLICIES: '/policies',
  POLICY_BY_ID: '/policies/:id',
  POLICY_APPROVALS: '/policy-approvals',

  // Policy Engine APIs (v2 - NEW)
  POLICIES_V2_CREATE: '/v2/policies',
  POLICIES_V2_GET: '/v2/policies/:policyId',
  POLICIES_V2_LIST: '/v2/policies',
  POLICIES_V2_UPDATE: '/v2/policies/:policyId',
  POLICIES_V2_ARCHIVE: '/v2/policies/:policyId',

  // Policy Approvals (v2)
  POLICY_APPROVALS_V2_GET: '/v2/policy-approvals/:approvalId',
  POLICY_APPROVALS_V2_LIST: '/v2/policy-approvals',
  POLICY_APPROVALS_V2_DECISION: '/v2/policy-approvals/:approvalId/decisions',

  // Permissions
  PERMISSIONS: '/permissions',
  PERMISSION_ASSIGNMENTS: '/permissions/assignments',
  
  // Webhooks Management APIs
  WEBHOOKS_CREATE: '/webhooks',
  WEBHOOKS_LIST: '/webhooks',
  WEBHOOKS_GET: '/webhooks/:webhookId',
  WEBHOOKS_UPDATE: '/webhooks/:webhookId',
  WEBHOOKS_DELETE: '/webhooks/:webhookId',
  WEBHOOKS_PING: '/webhooks/:webhookId/ping',
  
  // Webhook Events APIs
  WEBHOOKS_EVENTS_LIST: '/webhooks/:webhookId/events',
  WEBHOOKS_EVENTS_GET: '/webhooks/:webhookId/events/:webhookEventId',
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;
