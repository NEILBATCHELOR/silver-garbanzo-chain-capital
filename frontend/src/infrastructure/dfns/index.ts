/**
 * DFNS Infrastructure Index - Main exports for DFNS integration
 * 
 * This file exports all DFNS infrastructure components including:
 * - Enhanced authenticator with proper request signing
 * - Credential management system
 * - Service account management
 * - API client with retry logic
 * - Configuration and utilities
 */

// ===== Core Infrastructure =====
export { DfnsManager, default as DfnsManagerDefault } from './DfnsManager';
export { default as DfnsApiClient } from './client';
export type { RequestOptions } from './client';

// ===== SDK Migration =====
export { DfnsSDKClient } from './sdk-client';
export { DfnsMigrationAdapter } from './migration-adapter';
export type { DfnsSDKConfig, MigrationConfig } from './migration-adapter';

// ===== Factory Function =====
let dfnsManagerInstance: any | null = null;

/**
 * Get or create DFNS manager instance
 */
export async function getDfnsManager(config?: Partial<import('@/types/dfns').DfnsClientConfig>): Promise<any> {
  const { DfnsManager } = await import('./DfnsManager');
  if (!dfnsManagerInstance) {
    dfnsManagerInstance = new DfnsManager(config);
    // Initialize with default service account if available
    if (process.env.DFNS_SERVICE_ACCOUNT_ID && process.env.DFNS_SERVICE_ACCOUNT_PRIVATE_KEY) {
      await dfnsManagerInstance.authenticateServiceAccount(
        process.env.DFNS_SERVICE_ACCOUNT_ID,
        process.env.DFNS_SERVICE_ACCOUNT_PRIVATE_KEY
      );
    }
  }
  return dfnsManagerInstance;
}

// ===== Enhanced Authentication =====
export { default as DfnsAuthenticator } from './auth';
export { EnhancedDfnsAuth } from './enhanced-auth';
export { EnhancedDfnsAuthExtensions } from './enhanced-auth-extensions';
export { DfnsUserActionSigning } from './user-action-signing';
export { default as DfnsAuthenticationManager } from './auth-manager';
export type {
  AuthCredentials,
  AuthHeaders,
  SigningChallenge,
  UserActionSignature,
  ServiceAccountToken
} from './auth';
export type {
  UserActionChallenge,
  ServiceAccountTokenInfo,
  RecoveryCredential,
  PasskeyRegistrationResult
} from './enhanced-auth';
export type {
  UserActionChallengeRequest,
  UserActionChallengeResponse,
  CompleteUserActionRequest,
  UserActionResponse,
  UserActionContext,
  UserActionResult,
  UserActionSigningService
} from '@/types/dfns/user-actions';
export {
  DfnsCredentialKind,
  DfnsSignatureType
} from './auth';

// ===== Credential Management =====
export { default as DfnsCredentialManager } from './credential-manager';
export type {
  DfnsCredentialInfo,
  CredentialInfo, // @deprecated Use DfnsCredentialInfo instead
  AuthenticatorInfo,
  CredentialCreationResult,
  RecoveryKeyInfo,
  PasswordProtectedKeyInfo,
  CrossDeviceCodeInfo
} from './credential-manager';
export {
  CredentialStatus
} from './credential-manager';

// ===== Service Account Management =====
export { default as DfnsServiceAccountManager } from './service-account-manager';
export type {
  ServiceAccountInfo,
  ServiceAccountCreationRequest,
  ServiceAccountKeyPair,
  PermissionAssignment
} from './service-account-manager';
export {
  ServiceAccountStatus,
  PermissionAssignmentStatus
} from './service-account-manager';

// ===== User Management =====
export { default as DfnsUserManager } from './user-manager';
export type {
  DfnsUser,
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
  DfnsUserPermissionAssignment,
  UserSearchCriteria,
  UserFilterOptions,
  UserValidationResult,
  UserValidationError,
  DfnsUserManagementService
} from '@/types/dfns/user';
export {
  DfnsUserStatus,
  DfnsUserKind,
  DfnsPermissionAssignmentStatus,
  UserActivityType,
  UserManagementErrorCode
} from '@/types/dfns/user';

// ===== Registration Management =====
export { default as DfnsRegistrationManager } from './registration-manager';
export type {
  RegistrationChallenge,
  RegistrationState,
  RegistrationConfig,
  RegistrationResult,
  RegistrationInitRequest,
  CompleteRegistrationRequest,
  EndUserRegistrationRequest,
  SocialRegistrationRequest,
  RegistrationCodeRequest,
  CredentialRegistration,
  WalletSpec,
  RegisteredUser,
  RegisteredCredential,
  RegisteredWallet,
  SocialProvider,
  CredentialKind as RegistrationCredentialKind
} from '@/types/dfns/registration';

// ===== Configuration =====
export {
  DFNS_CONFIG,
  DFNS_SDK_CONFIG,
  MIGRATION_CONFIG,
  PHASE2_CONFIG,
  DFNS_ENDPOINTS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_LOGGING_CONFIG,
  DEFAULT_CLIENT_CONFIG,
  DEFAULT_NETWORKS,
  TESTNET_NETWORKS,
  getEnabledNetworks,
  getApiUrl,
  isProduction,
  isFeatureEnabled,
  getDefaultHeaders,
  validateDfnsConfig
} from './config';

// ===== Adapters =====
export * from './adapters';

// ===== Advanced Service Managers =====
export { default as DfnsWebhookManager } from './webhook-manager';
export { default as DfnsPolicyManager } from './policy-manager';
export { default as DfnsExchangeManager } from './exchange-manager';
export { default as DfnsStakingManager } from './staking-manager';
export { default as DfnsAmlKytManager } from './aml-kyt-manager';
export { default as DfnsAccountAbstractionManager } from './account-abstraction-manager';
export { default as DfnsDelegatedSigningManager } from './delegated-signing-manager';
export { default as DfnsFiatManager } from './fiat-manager';
export { DfnsPersonalAccessTokenManager, default as DfnsPersonalAccessTokenManagerDefault } from './personal-access-token-manager';

// ===== Enhanced Error Handling =====
export { 
  DfnsErrorEnhancer,
  DfnsErrorCode,
  DfnsErrorCategory,
  DfnsErrorSeverity,
  createUserFriendlyMessage,
  getEstimatedResolutionTime,
  isTemporaryError,
  getDocumentationUrl
} from './error-codes';

// ===== Re-export Types =====
export type {
  DfnsClientConfig,
  DfnsRetryConfig,
  DfnsLoggingConfig,
  DfnsResponse,
  DfnsError,
  DfnsEnhancedError,
  DfnsErrorContext
} from '@/types/dfns';

// ===== Fiat Integration Types =====
export type {
  FiatProvider,
  FiatTransactionResponse,
  FiatOnRampRequest,
  FiatOffRampRequest,
  FiatConfiguration,
  SupportedCurrency,
  PaymentMethod,
  BankAccountInfo,
  FiatTransactionStatus
} from '@/types/dfns/fiat';

// ===== Enhanced RAMP Network Integration =====
export { RampNetworkManager } from './fiat';
export type {
  RampInstantSDKConfig,
  RampPaymentMethod,
  RampAssetInfo,
  RampPurchase,
  RampSale,
  RampQuote,
  RampEventPayload,
  RampSendCryptoRequest
} from './fiat/ramp-network-manager';
export type {
  RampNetworkEnhancedConfig,
  RampPurchaseStatus,
  RampSaleStatus,
  RampCryptoStatus,
  RampPayoutStatus,
  RampWebhookEvent,
  RampWebhookSignature
} from '@/types/dfns/fiat';
