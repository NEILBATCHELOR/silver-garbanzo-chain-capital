/**
 * DFNS Services Index
 * 
 * Exports all DFNS services based on current API methods
 * Updated to follow current DFNS authentication patterns
 */

// Main service orchestrator
export { DfnsService, getDfnsService, initializeDfnsService, resetDfnsService } from './dfnsService';

// Core authentication services (current DFNS API)
export { DfnsAuthenticationService } from './authenticationService';
export { DfnsUserActionSigningService } from './userActionSigningService';
export { DfnsRequestService } from './requestService';
export { DfnsCredentialService } from './credentialService';
export { DfnsCredentialManagementService } from './credentialManagementService';

// Delegated authentication services (NEW)
export { DfnsDelegatedAuthenticationService } from './delegatedAuthenticationService';
export { DfnsDelegatedUserManagementService } from './delegatedUserManagementService';

// User Management services (CURRENT DFNS API)
export { DfnsUserManagementService } from './userManagementService';
export { DfnsServiceAccountManagementService } from './serviceAccountManagementService';
export { DfnsPersonalAccessTokenManagementService } from './personalAccessTokenManagementService';

// Registration and Login services (NEW)
export { DfnsRegistrationService } from './registrationService';
export { DfnsLoginService } from './loginService';

// User Recovery service (NEW)
export { DfnsUserRecoveryService } from './userRecoveryService';

// Wallet Management services (CURRENT DFNS API)
export { DfnsWalletService, getDfnsWalletService, resetDfnsWalletService } from './walletService';
export { DfnsWalletAssetsService, getDfnsWalletAssetsService, resetDfnsWalletAssetsService } from './walletAssetsService';
export { DfnsWalletTagsService, getDfnsWalletTagsService, resetDfnsWalletTagsService } from './walletTagsService';
export { DfnsWalletTransfersService, getDfnsWalletTransfersService, resetDfnsWalletTransfersService } from './walletTransfersService';

// Transaction Broadcasting service (CURRENT DFNS API)
export { DfnsTransactionBroadcastService, getDfnsTransactionBroadcastService, resetDfnsTransactionBroadcastService } from './transactionBroadcastService';

// Advanced Wallet & Signature services (NEW)
export { DfnsSignatureGenerationService, getDfnsSignatureGenerationService } from './signatureGenerationService';
export { DfnsAdvancedWalletService, getDfnsAdvancedWalletService, resetDfnsAdvancedWalletService } from './advancedWalletService';
export { DfnsWalletSignatureService, getDfnsWalletSignatureService, resetDfnsWalletSignatureService } from './walletSignatureService';

// Fee Sponsor service (NEW)
export { DfnsFeeSponsorService, getDfnsFeeSponsorService, resetDfnsFeeSponsorService } from './feeSponsorService';

// Key Management services (CURRENT DFNS Keys API)
export { DfnsKeyService, getDfnsKeyService } from './keyService';

// Advanced Key Management services (ENTERPRISE ONLY)
export { DfnsKeyImportService, getDfnsKeyImportService } from './keyImportService';
export { DfnsKeyExportService, getDfnsKeyExportService } from './keyExportService';
export { DfnsKeyDerivationService, getDfnsKeyDerivationService } from './keyDerivationService';

// Policy Engine services (NEW)
export { DfnsPolicyService, getDfnsPolicyService } from './policyService';
export { DfnsPolicyApprovalService, getDfnsPolicyApprovalService } from './policyApprovalService';
export { DfnsPolicyEngineService, getDfnsPolicyEngineService } from './policyEngineService';

// Permissions services (NEW)
export { DfnsPermissionsService, getDfnsPermissionsService, resetDfnsPermissionsService } from './permissionsService';
export { DfnsPermissionAssignmentsService, getDfnsPermissionAssignmentsService, resetDfnsPermissionAssignmentsService } from './permissionAssignmentsService';

// Webhook services (NEW)
export { DfnsWebhookService, getDfnsWebhookService } from './webhookService';
export { DfnsWebhookEventsService, getDfnsWebhookEventsService } from './webhookEventsService';

// Authentication types and interfaces
export type { 
  AuthenticationMethod, 
  AuthenticationStatus, 
  RequestHeaders,
  TokenValidationResult
} from './authenticationService';

export type { 
  UserActionSigningChallenge,
  UserActionSigningRequest,
  UserActionSigningCompletion,
  UserActionSigningResponse,
  CredentialAssertion,
  WebAuthnCredentialAssertion,
  ClientData
} from './userActionSigningService';

export type { 
  DfnsRequestOptions,
  DfnsResponse,
  RequestMetrics
} from './requestService';

export type { 
  CredentialKind,
  CredentialStatus,
  DfnsCredential,
  CreateCredentialRequest,
  CreateCredentialChallengeRequest,
  CreateCredentialChallengeResponse,
  CompleteCredentialCreationRequest
} from './credentialService';

// Credential Management types (CURRENT DFNS API - 2024)
export type {
  DfnsCredentialResponse,
  DfnsCredentialListResponse,
  CreateCredentialCodeRequest,
  CreateCredentialCodeResponse,
  CredentialInfo,
  ActivateCredentialRequest,
  DeactivateCredentialRequest,
  CredentialOperationResponse
} from './credentialManagementService';

// Delegated authentication types (NEW)
export type {
  DelegatedAuthenticationConfig,
  DelegatedRegistrationOptions,
  DelegatedLoginOptions,
  EndUserAuthContext,
  DelegatedOperationResult
} from './delegatedAuthenticationService';

export type {
  EndUserProfile,
  EndUserRegistrationFlow,
  UserManagementOptions,
  UserOperationResult
} from './delegatedUserManagementService';

// User Management service types (CURRENT DFNS API)
export type {
  UserListFilters,
  UserStatistics,
  CreateUserOptions
} from './userManagementService';

// Service Account Management service types (CURRENT DFNS API)
export type {
  ServiceAccountListFilters,
  ServiceAccountStatistics,
  ServiceAccountOperationResult,
  CreateServiceAccountOptions,
  ServiceAccountSummary,
  ServiceAccountValidationResult
} from './serviceAccountManagementService';

// Personal Access Token Management service types (CURRENT DFNS API)
export type {
  PersonalAccessTokenListFilters,
  PersonalAccessTokenStatistics,
  PersonalAccessTokenOperationResult,
  CreatePersonalAccessTokenOptions,
  PersonalAccessTokenSummary,
  PersonalAccessTokenValidationResult
} from './personalAccessTokenManagementService';

// Registration service types (NEW)
export type {
  DfnsRegistrationMetrics,
  DfnsRegistrationConfig
} from './registrationService';

// Login service types (NEW)
// Note: Login service uses types from auth.ts which are already exported via types/dfns/index.ts

// User Recovery service types (NEW)
export type {
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  DfnsRecoveryCredentialAssertion,
  DfnsNewCredentials
} from './userRecoveryService';

// Transaction Broadcasting service types (CURRENT DFNS API)
// Note: Types are imported from types/dfns/transactions.ts, not from the service file
export type {
  DfnsBroadcastTransactionRequest,
  DfnsTransactionRequestResponse,
  DfnsListTransactionRequestsResponse,
  DfnsTransactionServiceOptions,
  DfnsTransactionPaginationOptions,
  DfnsTransactionBroadcastOptions,
  DfnsTransactionNetwork,
  DfnsNetworkCategory,
  DfnsNetworkDetectionResult,
  DfnsTransactionValidationResult,
  DfnsTransactionStatistics,
  DfnsEvmTransactionRequest,
  DfnsEvmUserOperationsRequest,
  DfnsBitcoinTransactionRequest,
  DfnsSolanaTransactionRequest,
  DfnsAlgorandTransactionRequest,
  DfnsAptosTransactionRequest,
  DfnsCardanoTransactionRequest,
  DfnsStellarTransactionRequest,
  DfnsTezosTransactionRequest,
  DfnsTronTransactionRequest,
  DfnsXrpLedgerTransactionRequest,
  DfnsCantonTransactionRequest
} from '../../types/dfns/transactions';

// Advanced Wallet & Signature service types (NEW)
export type {
  DfnsSignatureRequest,
  DfnsSignatureBody,
  DfnsSignatureKind,
  DfnsSignatureResponse,
  DfnsSignature,
  DfnsEvmTransactionSignature,
  DfnsEvmMessageSignature,
  DfnsEvmEip712Signature,
  DfnsBitcoinPsbtSignature,
  DfnsBitcoinBip322Signature,
  DfnsSolanaTransactionSignature,
  DfnsSolanaMessageSignature,
  DfnsSubstrateSignature,
  DfnsAlgorandSignature,
  DfnsTonSignature,
  DfnsNearSignature
} from './signatureGenerationService';

export type {
  DfnsEncryptedKeyShare,
  DfnsWalletImportRequest,
  DfnsImportedWallet,
  DfnsSignerInfo,
  DfnsSignerClusterResponse,
  DfnsWalletDelegationRequest,
  DfnsAdvancedWalletUpdateRequest,
  DfnsAdvancedWalletOptions
} from './advancedWalletService';

export type {
  DfnsHashSignatureRequest,
  DfnsTransactionSignatureRequest,
  DfnsEip712SignatureRequest,
  DfnsPsbtSignatureRequest,
  DfnsBip322SignatureRequest,
  DfnsSignatureRequestBody,
  DfnsListSignatureRequestsResponse,
  DfnsSignatureOptions,
  DfnsListSignatureOptions
} from './walletSignatureService';

// Fee Sponsor service types (NEW)
// Note: Types are imported from types/dfns/feeSponsors.ts for consistency with other services
export type {
  DfnsFeeSponsor,
  DfnsSponsoredFee,
  DfnsFeeSponsorStatus,
  DfnsSponsoredFeeStatus,
  DfnsCreateFeeSponsorRequest,
  DfnsCreateFeeSponsorResponse,
  DfnsGetFeeSponsorResponse,
  DfnsListFeeSponsorsRequest,
  DfnsListFeeSponsorsResponse,
  DfnsListSponsoredFeesRequest,
  DfnsListSponsoredFeesResponse,
  DfnsActivateFeeSponsorResponse,
  DfnsDeactivateFeeSponsorResponse,
  DfnsDeleteFeeSponsorResponse,
  DfnsFeeSponsorServiceOptions,
  DfnsBatchFeeSponsorOptions,
  DfnsBatchFeeSponsorResult,
  DfnsFeeSponsorSummary,
  DfnsSponsoredFeeSummary,
  DfnsFeeSponsorErrorReason,
  DfnsFeeSponsorSupportedNetwork
} from '../../types/dfns/feeSponsors';

// Key Management service types (CURRENT DFNS Keys API)
export type {
  DfnsKeyScheme,
  DfnsKeyCurve,
  DfnsKeyStatus,
  DfnsKey,
  CreateKeyRequest,
  UpdateKeyRequest,
  DelegateKeyRequest,
  ListKeysParams,
  ListKeysResponse,
  KeyOperationOptions,
  KeyStatistics
} from './keyService';

// Advanced Key Management service types (ENTERPRISE ONLY)
export type {
  DfnsImportProtocol,
  DfnsImportCurve,
  EncryptedKeyShare,
  ImportKeyRequest,
  SignerInfo,
  SigningCluster,
  ImportKeyResponse,
  ImportValidationResult,
  ImportOperationOptions,
  ImportStatistics
} from './keyImportService';

export type {
  DfnsExportProtocol,
  DfnsExportCurve,
  SupportedScheme,
  ExportEncryptedKeyShare,
  ExportKeyRequest,
  ExportKeyResponse,
  ExportContext,
  ExportValidationResult,
  ExportOperationOptions,
  ExportStatistics
} from './keyExportService';

export type {
  DfnsDerivationCurve,
  DeriveKeyRequest,
  DeriveKeyResponse,
  DomainSeparationTag,
  DerivationValidationResult,
  DerivationKeyInfo,
  DerivationOperationOptions,
  DerivationStatistics
} from './keyDerivationService';

// Policy Engine service types (NEW) - Import from policy-engine types
export type {
  DfnsPolicy,
  DfnsApproval,
  DfnsCreatePolicyRequest,
  DfnsUpdatePolicyRequest,
  DfnsListPoliciesRequest,
  DfnsListPoliciesResponse,
  DfnsCreateApprovalDecisionRequest,
  DfnsListApprovalsRequest,
  DfnsListApprovalsResponse,
  DfnsPolicyServiceResponse,
  DfnsPolicyStatistics,
  DfnsApprovalStatistics,
  DfnsActivityKind,
  DfnsPolicyStatus,
  DfnsApprovalStatus,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
  DfnsTriggerStatus
} from '../../types/dfns/policy-engine';

export type {
  DfnsPolicyEngineOverview
} from './policyEngineService';

// Permissions service types (NEW) - Import from permissions types
export type {
  DfnsPermission,
  DfnsPermissionResponse,
  DfnsPermissionOperation,
  DfnsPermissionResource,
  DfnsPermissionEffect,
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
  DfnsPermissionAssignmentResponse
} from '../../types/dfns/permissions';

// Webhook service types (NEW) - Import from webhooks types
export type {
  DfnsWebhookEvent,
  DfnsWebhookStatus,
  DfnsCreateWebhookRequest,
  DfnsCreateWebhookResponse,
  DfnsGetWebhookResponse,
  DfnsListWebhooksRequest,
  DfnsListWebhooksResponse,
  DfnsUpdateWebhookRequest,
  DfnsUpdateWebhookResponse,
  DfnsDeleteWebhookResponse,
  DfnsPingWebhookResponse,
  DfnsListWebhookEventsRequest,
  DfnsListWebhookEventsResponse,
  DfnsWebhookEventResponse,
  WebhookConfig,
  WebhookEvent,
  WebhookEventSummary,
  WebhookEventFilterOptions,
  WebhookServiceOptions,
  WebhookCreationOptions,
  WebhookSummary,
  WebhookUrlValidation,
  WebhookSignatureVerification,
  WebhookEventData,
  WebhookRetryConfig,
  WebhookError,
  DEFAULT_WEBHOOK_RETRY_CONFIG,
  WEBHOOK_EVENT_RETENTION_DAYS,
  WebhookSupportedNetwork
} from '../../types/dfns/webhooks';
