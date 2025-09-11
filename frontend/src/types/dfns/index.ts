/**
 * DFNS Types - Export Index
 * 
 * Centralized exports for all DFNS-related types
 * Using selective exports to avoid naming conflicts
 */

// ===== Core DFNS types =====
export type {
  DfnsStatus,
  DfnsTransactionStatus,
  DfnsCredentialKind,
  DfnsUserKind,
  DfnsOrganization,
  DfnsApplication,
  DfnsSigningKey,
  DfnsPolicy,
  DfnsPermission,
  DfnsWebhook,
  DfnsServiceAccount as DfnsServiceAccountFromCore,
  DfnsNetwork,
  NetworkName,
  DfnsIdentityKind,
  DfnsAsset,
  DfnsMetadata,
  DfnsApiResponse,
  DfnsError as DfnsErrorInterface,
} from './core';

// ===== Authentication types =====
export type {
  DfnsCredentialInfo,
  DfnsFido2CredentialInfo,
  DfnsKeyCredentialInfo,
  DfnsPasswordProtectedKeyCredentialInfo,
  DfnsRecoveryKeyCredentialInfo,
  DfnsAuthTokenResponse,
  DfnsAuthSession,
  DfnsLoginRequest,
  DfnsUserRegistrationRequest,
  DfnsDelegatedRegistrationRequest,
  DfnsDelegatedRegistrationResponse,
  DfnsLoginChallengeRequest,
  DfnsLoginChallengeResponse,
  DfnsCompleteLoginRequest,
  DfnsCompleteLoginResponse,
  DfnsFido2LoginAssertion,
  DfnsKeyLoginAssertion,
  DfnsPasswordProtectedKeyLoginAssertion,
  DfnsDelegatedLoginRequest,
  DfnsUserActionChallenge,
  DfnsUserActionSignature,
  DfnsUserActionSignatureResponse,
  DfnsRecoveryChallenge,
  DfnsUserRegistrationInitRequest,
  DfnsUserRegistrationInitResponse,
  DfnsEndUserRegistrationRequest,
  DfnsEndUserRegistrationResponse,
  DfnsSocialRegistrationRequest,
  DfnsSocialRegistrationResponse,
  DfnsResendRegistrationCodeRequest,
  DfnsResendRegistrationCodeResponse,
  DfnsEnhancedUserRegistrationRequest,
  DfnsEnhancedUserRegistrationResponse,
  DfnsSocialLoginRequest,
  DfnsSocialLoginResponse,
  DfnsSendLoginCodeRequest,
  DfnsSendLoginCodeResponse,
  DfnsLogoutResponse,
  DfnsPersonalAccessToken,
  DfnsListPersonalAccessTokensResponse,
  DfnsCreatePersonalAccessTokenRequest,
  DfnsCreatePersonalAccessTokenResponse,
  DfnsGetPersonalAccessTokenResponse,
  DfnsPersonalAccessTokenResponse,
  DfnsUpdatePersonalAccessTokenRequest,
  DfnsUpdatePersonalAccessTokenResponse,
  DfnsActivatePersonalAccessTokenResponse,
  DfnsDeactivatePersonalAccessTokenResponse,
  DfnsArchivePersonalAccessTokenResponse,
  DfnsCredentialChallengeRequest,
  DfnsCredentialChallengeResponse,
  DfnsCreateCredentialRequest,
  DfnsCreateCredentialResponse,
  DfnsListCredentialsResponse,
  DfnsActivateCredentialRequest,
  DfnsActivateCredentialResponse,
  DfnsDeactivateCredentialRequest,
  DfnsDeactivateCredentialResponse,
  DfnsCredentialCodeChallengeRequest,
  DfnsCredentialCodeChallengeResponse,
  DfnsCreateCredentialWithCodeRequest,
  DfnsCreateCredentialWithCodeResponse,
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  DfnsRecoveryCredentialAssertion,
  DfnsRecoveryObject,
  DfnsNewCredentials,
  DfnsWalletCreationSpec,
} from './auth';

// ===== User types =====
export type {
  DfnsUser,
  DfnsCredential,
  DfnsGenericUserCreationRequest,
  DfnsCredentialRegistrationRequest,
  DfnsUserSession,
  DfnsUserProfileUpdate,
  DfnsUserStatusUpdate,
  DfnsUserRecoverySetup,
  DfnsUserMfaSetup,
  DfnsUserActivityLog,
  DfnsListUsersRequest,
  DfnsListUsersResponse,
  DfnsCreateUserRequest,
  DfnsCreateUserResponse,
  DfnsGetUserResponse,
  DfnsUserResponse,
  DfnsPermissionAssignment,
  DfnsActivateUserResponse,
  DfnsDeactivateUserResponse,
  DfnsArchiveUserResponse,
} from './users';

// ===== Service Account types =====
export type {
  DfnsServiceAccountUserInfo,
  DfnsServiceAccountAccessToken,
  DfnsServiceAccountResponse,
  DfnsListServiceAccountsRequest,
  DfnsListServiceAccountsResponse,
  DfnsCreateServiceAccountRequest,
  DfnsCreateServiceAccountResponse,
  DfnsGetServiceAccountResponse,
  DfnsUpdateServiceAccountRequest,
  DfnsUpdateServiceAccountResponse,
  DfnsActivateServiceAccountResponse,
  DfnsDeactivateServiceAccountResponse,
  DfnsArchiveServiceAccountResponse,
  ServiceAccountListFilters,
  ServiceAccountStatistics,
  ServiceAccountOperationResult,
  CreateServiceAccountOptions,
  ServiceAccountSummary,
  ServiceAccountValidationResult,
} from './serviceAccounts';

// Create missing alias for DfnsServiceAccount (commonly referenced)
// Note: DfnsServiceAccount from core.ts is different from DfnsServiceAccountResponse from serviceAccounts.ts
export type { DfnsServiceAccountResponse as DfnsServiceAccount } from './serviceAccounts';

// ===== Permission types =====
export type {
  DfnsPermissionRequest,
  DfnsPermissionAssignment as DfnsPermissionAssignmentFromPermissions,
  DfnsPermissionOperation,
  DfnsPermissionResource,
  DfnsListPermissionsRequest,
  DfnsListPermissionsResponse,
  DfnsGetPermissionResponse,
  DfnsCreatePermissionRequest,
  DfnsCreatePermissionResponse,
  DfnsUpdatePermissionRequest,
  DfnsUpdatePermissionResponse,
  DfnsArchivePermissionResponse,
  DfnsAssignPermissionRequest,
  DfnsCreatePermissionAssignmentRequest,
  DfnsAssignPermissionResponse,
  DfnsRevokePermissionAssignmentResponse,
  DfnsListPermissionAssignmentsRequest,
  DfnsListPermissionAssignmentsResponse,
  DfnsListPermissionAssignmentsForPermissionRequest,
  DfnsListPermissionAssignmentsForPermissionResponse,
  DfnsPermissionResponse,
  DfnsPermissionAssignmentResponse,
} from './permissions';

// ===== Policy types =====
// Export enums and constants as values
export {
  DfnsActivityKind,
  DfnsApprovalStatus,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
} from './policies';

export type {
  DfnsPolicy as DfnsPolicyFromPolicies,
  DfnsPolicyApproval,
  DfnsPolicyRule,
  DfnsPolicyAction,
  DfnsActivity,
  DfnsActivity as DfnsActivityLog,
  DfnsPolicySummary,
  DfnsApprovalSummary,
  DfnsCreatePolicyRequest,
  DfnsUpdatePolicyRequest,
  DfnsCreatePolicyResponse,
  DfnsUpdatePolicyResponse,
  DfnsListPoliciesRequest,
  DfnsListPoliciesResponse,
  DfnsGetPolicyResponse,
  DfnsArchivePolicyResponse,
  DfnsListApprovalsRequest,
  DfnsListApprovalsResponse,
  DfnsGetApprovalResponse,
  DfnsCreateApprovalDecisionRequest,
  DfnsCreateApprovalDecisionResponse,
  DfnsPolicyServiceOptions,
  DfnsPolicyFilters,
} from './policies';

// ===== Wallet types =====
export type * from './wallets';

// ===== Transaction types =====
export type * from './transactions';

// ===== Wallet types (additional exports) =====
export type {
  DfnsTransferRequestResponse as DfnsTransfer,
  DfnsGetWalletHistoryResponse as DfnsTransactionHistory,
  DfnsWalletHistoryEntry,
} from './wallets';

// ===== Transaction types (additional exports) =====
export type {
  DfnsTransactionRequestResponse as DfnsBroadcastTransaction,
} from './transactions';

// ===== Network types =====
export type {
  DfnsNetworkInfo,
  DfnsFeeEstimationRequest,
  DfnsFeeEstimationResponse,
  DfnsEip1559FeeEstimation,
  DfnsLegacyFeeEstimation,
  DfnsFeePriority,
  DfnsContractReadRequest,
  DfnsContractReadResponse,
  DfnsValidator,
  DfnsValidatorKind,
  DfnsOAuth2Config,
  DfnsCreateValidatorRequest,
  DfnsCreateValidatorResponse,
  DfnsListValidatorsResponse,
  DfnsNetworkCapabilities
} from './networks';

// ===== Key types =====
export {
  EXTENDED_NETWORK_COMPATIBILITY,
} from './keys';

export type * from './keys';

// ===== Fiat types =====
export type * from './fiat';

export type {
  DfnsFiatProviderConfig,
  DfnsRampNetworkConfig,
} from './fiat';

// ===== Fee Sponsor types =====
export {
  isFeeSponsorSupportedNetwork,
  isValidFeeSponsorId,
  isValidSponsoredFeeId,
  DFNS_FEE_SPONSOR_ID_REGEX,
  DFNS_SPONSORED_FEE_ID_REGEX,
  DFNS_FEE_SPONSOR_SUPPORTED_NETWORKS,
} from './feeSponsors';

export type {
  DfnsFeeSponsor,
  DfnsSponsoredFee,
  DfnsCreateFeeSponsorRequest,
  DfnsCreateFeeSponsorResponse,
  DfnsListFeeSponsorsRequest,
  DfnsListFeeSponsorsResponse,
  DfnsGetFeeSponsorResponse,
  DfnsActivateFeeSponsorResponse,
  DfnsDeactivateFeeSponsorResponse,
  DfnsDeleteFeeSponsorResponse,
  DfnsListSponsoredFeesRequest,
  DfnsListSponsoredFeesResponse,
  DfnsFeeSponsorSummary,
  DfnsFeeSponsorSupportedNetwork,
  DfnsFeeSponsorStatus,
  DfnsFeeSponsorServiceOptions,
  DfnsBatchFeeSponsorOptions,
  DfnsSponsoredFeeSummary,
  DfnsBatchFeeSponsorResult,
  DfnsFeeSponsorErrorReason,
} from './feeSponsors';

// ===== Webhook types =====
export {
  isValidWebhookUrl,
  getSupportedWebhookEvents,
  isWebhookSupportedNetwork,
  WEBHOOK_EVENT_RETENTION_DAYS,
  validateWebhookEvents,
} from './webhooks';

export type * from './webhooks';

// ===== API types =====
export type * from './api';

// ===== WebAuthn types =====
export type {
  WebAuthnCredential,
  WebAuthnChallenge,
  CreateWebAuthnCredentialRequest,
  CreateWebAuthnCredentialResponse,
  ListWebAuthnCredentialsRequest,
  ListWebAuthnCredentialsResponse,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
  WebAuthnCredentialSummary,
  WalletCredentialSummary,
  WebAuthnServiceOptions,
} from './webauthn';

// ===== Error classes =====
// Export error classes as classes (not types)
export { 
  DfnsError,
  DfnsAuthenticationError,
  DfnsAuthorizationError,
  DfnsValidationError,
  DfnsRateLimitError,
  DfnsNetworkError,
  DfnsWalletError,
  DfnsTransactionError,
  DfnsCredentialError,
  DfnsPolicyError,
  DfnsSdkError,
  DfnsErrorFactory,
  DFNS_ERROR_CODES,
} from './errors';

// ===== Compatibility aliases =====
// Import specific types for aliases
import type { DfnsWallet, DfnsWalletAsset } from './wallets';
import type { DfnsUser, DfnsCredential } from './users';
import type { DfnsServiceAccountResponse } from './serviceAccounts';
import type { DfnsPersonalAccessToken } from './auth';

// Create aliases for commonly used types to avoid breaking changes
export type WalletData = DfnsWallet;
export type WalletAsset = DfnsWalletAsset;
export type User = DfnsUser;
export type ServiceAccount = DfnsServiceAccountResponse;
export type PersonalAccessToken = DfnsPersonalAccessToken;
export type Credential = DfnsCredential;
