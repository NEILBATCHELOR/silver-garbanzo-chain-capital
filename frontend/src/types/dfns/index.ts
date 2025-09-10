/**
 * DFNS Types - Export Index
 * 
 * Centralized exports for all DFNS-related types
 * Using selective exports to avoid naming conflicts
 */

// Core DFNS types
export * from './core';
export type { NetworkName, DfnsIdentityKind } from './core';

// Authentication types  
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
  DfnsLoginChallengeResponse,
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
  DfnsPersonalAccessTokenResponse, // Added missing export
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

// User types
export type * from './users';
export type * from './serviceAccounts';
export type { DfnsServiceAccountResponse, DfnsGetServiceAccountResponse } from './serviceAccounts';

// Export the DfnsCredential type specifically for services
export type { DfnsCredential } from './users';

// Permissions types (database/API layer)
export type {
  DfnsPermissionRequest,
  DfnsPermissionAssignment,
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
  DfnsCreatePermissionAssignmentRequest, // Added missing export
  DfnsAssignPermissionResponse,
  DfnsRevokePermissionAssignmentResponse,
  DfnsListPermissionAssignmentsRequest,
  DfnsListPermissionAssignmentsResponse,
  DfnsListPermissionAssignmentsForPermissionRequest,
  DfnsListPermissionAssignmentsForPermissionResponse,
  DfnsPermissionResponse,
  DfnsPermissionAssignmentResponse,
} from './permissions';

// Policies types (domain/UI layer) - preferred for components
// Export enums and constants as values, interfaces as types
export {
  DfnsActivityKind,
  DfnsApprovalStatus,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
} from './policies';

export type {
  DfnsPolicy,
  DfnsPolicyApproval, // Domain type with camelCase
  DfnsPolicyRule,
  DfnsPolicyAction,
  DfnsActivity,
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
  // Missing service types
  DfnsPolicyServiceOptions,
  DfnsPolicyFilters,
} from './policies';

// Wallet types
export type * from './wallets';
export type * from './transactions';

// Keys - Export constants and utility functions as values, types as types
export {
  DFNS_KEY_NETWORK_COMPATIBILITY,
} from './keys';

export type * from './keys';

// Fiat and Fee Sponsors
export type * from './fiat';

// Export specific fiat types that might be needed individually
export type {
  DfnsFiatProviderConfig,
  DfnsRampNetworkConfig,
} from './fiat';

// Fee Sponsors - Export utility functions as values, types as types
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
  // Missing service options types
  DfnsFeeSponsorServiceOptions,
  DfnsBatchFeeSponsorOptions,
  DfnsSponsoredFeeSummary,
  DfnsBatchFeeSponsorResult,
  DfnsFeeSponsorErrorReason,
} from './feeSponsors';

// Webhooks - Export utility functions and constants as values, types as types
export {
  isValidWebhookUrl,
  getSupportedWebhookEvents,
  isWebhookSupportedNetwork,
  WEBHOOK_EVENT_RETENTION_DAYS,
  validateWebhookEvents,
} from './webhooks';

export type * from './webhooks';

// API types
export type * from './api';

// WebAuthn types
export type * from './webauthn';
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

// Error classes (these are classes, not types, so use regular export)
export { 
  DfnsError,
  DfnsAuthenticationError,
  DfnsAuthorizationError,
  DfnsValidationError,
  DfnsNetworkError,
  DfnsRateLimitError,
  DfnsWalletError,
  DfnsTransactionError,
  DfnsCredentialError,
  DfnsPolicyError,
  DfnsSdkError,
  DfnsErrorFactory,
  DFNS_ERROR_CODES,
} from './errors';
