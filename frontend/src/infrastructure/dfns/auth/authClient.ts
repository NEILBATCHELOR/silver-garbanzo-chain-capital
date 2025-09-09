/**
 * DFNS Authentication Client
 * 
 * Handles delegated authentication flow as per DFNS documentation
 */

import type {
  DfnsDelegatedRegistrationRequest,
  DfnsDelegatedRegistrationResponse,
  DfnsUserRegistrationRequest,
  DfnsLoginChallengeResponse,
  DfnsLoginRequest,
  DfnsAuthTokenResponse,
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
  DfnsListUsersRequest,
  DfnsListUsersResponse,
  DfnsCreateUserRequest,
  DfnsCreateUserResponse,
  DfnsGetUserResponse,
  DfnsActivateUserResponse,
  DfnsDeactivateUserResponse,
  DfnsArchiveUserResponse,
  // Service Account Management Types
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
  // Personal Access Token Management Types
  DfnsListPersonalAccessTokensResponse,
  DfnsCreatePersonalAccessTokenRequest,
  DfnsCreatePersonalAccessTokenResponse,
  DfnsGetPersonalAccessTokenResponse,
  DfnsUpdatePersonalAccessTokenRequest,
  DfnsUpdatePersonalAccessTokenResponse,
  DfnsActivatePersonalAccessTokenResponse,
  DfnsDeactivatePersonalAccessTokenResponse,
  DfnsArchivePersonalAccessTokenResponse,
  // Credential Management Types
  DfnsCredentialChallengeRequest,
  DfnsCredentialChallengeResponse,
  DfnsCreateCredentialRequest,
  DfnsCreateCredentialResponse,
  DfnsListCredentialsResponse,
  DfnsActivateCredentialRequest,
  DfnsActivateCredentialResponse,
  DfnsDeactivateCredentialRequest,
  DfnsDeactivateCredentialResponse,
  // Code-Based Credential Management Types
  DfnsCredentialCodeChallengeRequest,
  DfnsCredentialCodeChallengeResponse,
  DfnsCreateCredentialWithCodeRequest,
  DfnsCreateCredentialWithCodeResponse,
  // User Recovery Types
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  // Wallet Management Types
  DfnsCreateWalletRequest,
  DfnsCreateWalletResponse,
  DfnsUpdateWalletRequest,
  DfnsUpdateWalletResponse,
  DfnsListWalletsRequest,
  DfnsListWalletsResponse,
  DfnsGetWalletResponse,
  DfnsDeleteWalletResponse,
  DfnsDelegateWalletRequest,
  DfnsDelegateWalletResponse,
  DfnsGetWalletAssetsRequest,
  DfnsGetWalletAssetsResponse,
  DfnsGetWalletNftsResponse,
  DfnsGetWalletHistoryResponse,
  DfnsAddWalletTagsRequest,
  DfnsAddWalletTagsResponse,
  DfnsDeleteWalletTagsRequest,
  DfnsDeleteWalletTagsResponse,
  DfnsTransferAssetRequest,
  DfnsTransferRequestResponse,
  DfnsListTransferRequestsResponse,
  DfnsGetTransferRequestResponse,
  // Transaction Broadcasting Types
  DfnsBroadcastTransactionRequest,
  DfnsTransactionRequestResponse,
  DfnsGetTransactionRequestResponse,
  DfnsListTransactionRequestsResponse,
  DfnsListTransactionRequestsParams,
  // Fee Sponsors Management Types
  DfnsCreateFeeSponsorRequest,
  DfnsCreateFeeSponsorResponse,
  DfnsGetFeeSponsorResponse,
  DfnsListFeeSponsorsRequest,
  DfnsListFeeSponsorsResponse,
  DfnsActivateFeeSponsorResponse,
  DfnsDeactivateFeeSponsorResponse,
  DfnsDeleteFeeSponsorResponse,
  DfnsListSponsoredFeesRequest,
  DfnsListSponsoredFeesResponse,
  // Keys Management Types
  DfnsCreateKeyRequest,
  DfnsCreateKeyResponse,
  DfnsUpdateKeyRequest,
  DfnsUpdateKeyResponse,
  DfnsDeleteKeyResponse,
  DfnsGetKeyResponse,
  DfnsListKeysRequest,
  DfnsListKeysResponse,
  DfnsDelegateKeyRequest,
  DfnsDelegateKeyResponse,
  // Keys Signature Generation Types
  DfnsGenerateSignatureRequest,
  DfnsGenerateSignatureResponse,
  DfnsGetSignatureRequestResponse,
  DfnsListSignatureRequestsRequest,
  DfnsListSignatureRequestsResponse,
  // Policy Engine Types (v2)
  DfnsCreatePolicyRequest,
  DfnsCreatePolicyResponse,
  DfnsUpdatePolicyRequest,
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
  // Permission Management Types
  DfnsListPermissionsRequest,
  DfnsListPermissionsResponse,
  DfnsGetPermissionResponse,
  DfnsCreatePermissionRequest,
  DfnsCreatePermissionResponse,
  DfnsUpdatePermissionRequest,
  DfnsUpdatePermissionResponse,
  DfnsArchivePermissionResponse,
  DfnsAssignPermissionRequest,
  DfnsAssignPermissionResponse,
  DfnsRevokePermissionAssignmentResponse,
  DfnsListPermissionAssignmentsRequest,
  DfnsListPermissionAssignmentsResponse,
  DfnsListPermissionAssignmentsForPermissionRequest,
  DfnsListPermissionAssignmentsForPermissionResponse,
  // Webhook Management Types
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
} from '../../../types/dfns';
import { DfnsClient } from '../client';
import { DFNS_ENDPOINTS } from '../config';
import { DfnsAuthenticationError } from '../../../types/dfns/errors';

export class DfnsAuthClient {
  constructor(private dfnsClient: DfnsClient) {}

  /**
   * Initiate delegated registration for a new user
   * Only service accounts can call this endpoint
   */
  async initiateDelegatedRegistration(
    request: DfnsDelegatedRegistrationRequest
  ): Promise<DfnsDelegatedRegistrationResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsDelegatedRegistrationResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_DELEGATED,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate delegated registration: ${error}`,
        { request }
      );
    }
  }

  /**
   * Complete user registration after delegated registration
   */
  async completeUserRegistration(
    request: DfnsUserRegistrationRequest
  ): Promise<DfnsAuthTokenResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsAuthTokenResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_COMPLETE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to complete user registration: ${error}`,
        { request: { challengeIdentifier: request.challengeIdentifier } }
      );
    }
  }

  /**
   * Initiate login challenge
   */
  async initiateLogin(username: string): Promise<DfnsLoginChallengeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsLoginChallengeResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGIN_INIT,
        { username }
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate login: ${error}`,
        { username }
      );
    }
  }

  /**
   * Complete login with credentials
   */
  async completeLogin(request: DfnsLoginRequest): Promise<DfnsAuthTokenResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsAuthTokenResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGIN_COMPLETE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to complete login: ${error}`,
        { challengeIdentifier: request.challengeIdentifier }
      );
    }
  }

  /**
   * Delegated login for service accounts
   * Allows authentication without user credentials
   */
  async delegatedLogin(request: DfnsDelegatedLoginRequest): Promise<DfnsAuthTokenResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsAuthTokenResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGIN_DELEGATED,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to perform delegated login: ${error}`,
        { request }
      );
    }
  }

  /**
   * Initiate user action challenge for sensitive operations
   */
  async initiateUserActionChallenge(actionKind: string, payload: any): Promise<DfnsUserActionChallenge> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsUserActionChallenge>(
        'POST',
        DFNS_ENDPOINTS.AUTH_ACTION_INIT,
        {
          actionKind,
          payload
        }
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate user action challenge: ${error}`,
        { actionKind }
      );
    }
  }

  /**
   * Complete user action signing - sends signature to DFNS and gets userAction token
   */
  async completeUserActionSigning(
    signature: DfnsUserActionSignature
  ): Promise<DfnsUserActionSignatureResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsUserActionSignatureResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_ACTION_COMPLETE,
        signature
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to complete user action signing: ${error}`,
        { challengeIdentifier: signature.challengeIdentifier }
      );
    }
  }

  /**
   * Create user action signature object (helper method)
   */
  createUserActionSignature(
    challengeIdentifier: string,
    credentialAssertion: any,
    credentialKind: 'Fido2' | 'Key' | 'PasswordProtectedKey' = 'Fido2'
  ): DfnsUserActionSignature {
    return {
      challengeIdentifier,
      firstFactor: {
        kind: credentialKind,
        credentialAssertion
      }
    };
  }

  /**
   * Initiate delegated recovery
   */
  async initiateDelegatedRecovery(username: string): Promise<DfnsRecoveryChallenge> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsRecoveryChallenge>(
        'POST',
        DFNS_ENDPOINTS.AUTH_RECOVERY_DELEGATED,
        { username }
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate delegated recovery: ${error}`,
        { username }
      );
    }
  }

  /**
   * Initiate standard user registration (non-delegated)
   * User provides registration code from email
   */
  async initiateUserRegistration(
    request: DfnsUserRegistrationInitRequest
  ): Promise<DfnsUserRegistrationInitResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsUserRegistrationInitResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_INIT,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate user registration: ${error}`,
        { username: request.username, orgId: request.orgId }
      );
    }
  }

  /**
   * Complete enhanced user registration with all credential types
   */
  async completeEnhancedUserRegistration(
    request: DfnsEnhancedUserRegistrationRequest
  ): Promise<DfnsEnhancedUserRegistrationResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsEnhancedUserRegistrationResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_COMPLETE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to complete enhanced user registration: ${error}`,
        { credentialKind: request.firstFactorCredential.credentialKind }
      );
    }
  }

  /**
   * Complete end user registration with automatic wallet creation
   * This is ideal for user onboarding as it creates wallets during registration
   */
  async completeEndUserRegistration(
    request: DfnsEndUserRegistrationRequest
  ): Promise<DfnsEndUserRegistrationResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsEndUserRegistrationResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_ENDUSER,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to complete end user registration: ${error}`,
        { 
          credentialKind: request.firstFactorCredential.credentialKind,
          walletCount: request.wallets.length 
        }
      );
    }
  }

  /**
   * Initiate social registration (OAuth)
   * Supports OIDC providers like Google
   */
  async initiateSocialRegistration(
    request: DfnsSocialRegistrationRequest
  ): Promise<DfnsSocialRegistrationResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsSocialRegistrationResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_SOCIAL,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate social registration: ${error}`,
        { provider: request.socialLoginProviderKind }
      );
    }
  }

  /**
   * Resend registration code to user's email
   * Useful when the original code expires or gets lost
   */
  async resendRegistrationCode(
    request: DfnsResendRegistrationCodeRequest
  ): Promise<DfnsResendRegistrationCodeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsResendRegistrationCodeResponse>(
        'PUT',
        DFNS_ENDPOINTS.AUTH_REGISTRATION_RESEND,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to resend registration code: ${error}`,
        { username: request.username, orgId: request.orgId }
      );
    }
  }

  /**
   * Convenience method for resending registration code
   */
  async resendRegistrationCodeForUser(
    username: string, 
    orgId: string
  ): Promise<DfnsResendRegistrationCodeResponse> {
    return this.resendRegistrationCode({ username, orgId });
  }

  /**
   * Validate authentication token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      await this.dfnsClient.makeRequest<any>(
        'GET',
        '/auth/validate',
        undefined,
        { Authorization: `Bearer ${token}` }
      );
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<DfnsAuthTokenResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsAuthTokenResponse>(
        'POST',
        '/auth/refresh',
        { refreshToken }
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to refresh token: ${error}`
      );
    }
  }

  /**
   * Social login with OAuth providers (Google, etc.)
   * Completes the login process using ID token from external provider
   */
  async socialLogin(
    request: DfnsSocialLoginRequest
  ): Promise<DfnsSocialLoginResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsSocialLoginResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGIN_SOCIAL,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to perform social login: ${error}`,
        { provider: request.socialLoginProviderKind, orgId: request.orgId }
      );
    }
  }

  /**
   * Send login code to user's email
   * Required for users with PasswordProtectedKey credentials
   */
  async sendLoginCode(
    request: DfnsSendLoginCodeRequest
  ): Promise<DfnsSendLoginCodeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsSendLoginCodeResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGIN_CODE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to send login code: ${error}`,
        { username: request.username, orgId: request.orgId }
      );
    }
  }

  /**
   * Convenience method for sending login code
   */
  async sendLoginCodeForUser(
    username: string, 
    orgId: string
  ): Promise<DfnsSendLoginCodeResponse> {
    return this.sendLoginCode({ username, orgId });
  }

  /**
   * Logout and invalidate session
   * Updated to use proper DFNS logout endpoint
   */
  async logout(token: string): Promise<DfnsLogoutResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsLogoutResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_LOGOUT,
        {},
        { Authorization: `Bearer ${token}` }
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to logout: ${error}`
      );
    }
  }

  // ===== DFNS User Management APIs =====

  /**
   * List all users in the organization
   * Requires Auth:Users:Read permission
   */
  async listUsers(request?: DfnsListUsersRequest): Promise<DfnsListUsersResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.AUTH_USERS_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.AUTH_USERS_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListUsersResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list users: ${error}`,
        { request }
      );
    }
  }

  /**
   * Create a new user in the organization
   * Requires Auth:Users:Create permission
   * Only creates CustomerEmployee users - EndUser creation uses delegated registration
   */
  async createUser(request: DfnsCreateUserRequest): Promise<DfnsCreateUserResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCreateUserResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_USERS_CREATE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create user: ${error}`,
        { email: request.email, kind: request.kind }
      );
    }
  }

  /**
   * Get a specific user by ID
   * Requires Auth:Users:Read permission
   */
  async getUser(userId: string): Promise<DfnsGetUserResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_USERS_GET.replace(':userId', userId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetUserResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Activate a deactivated user
   * Requires Auth:Users:Activate permission
   */
  async activateUser(userId: string): Promise<DfnsActivateUserResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_USERS_ACTIVATE.replace(':userId', userId);
      
      const response = await this.dfnsClient.makeRequest<DfnsActivateUserResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Deactivate an active user
   * Requires Auth:Users:Deactivate permission
   */
  async deactivateUser(userId: string): Promise<DfnsDeactivateUserResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_USERS_DEACTIVATE.replace(':userId', userId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeactivateUserResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate user: ${error}`,
        { userId }
      );
    }
  }

  /**
   * Archive a user (soft delete)
   * Requires Auth:Users:Delete permission
   */
  async archiveUser(userId: string): Promise<DfnsArchiveUserResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_USERS_ARCHIVE.replace(':userId', userId);
      
      const response = await this.dfnsClient.makeRequest<DfnsArchiveUserResponse>(
        'DELETE',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive user: ${error}`,
        { userId }
      );
    }
  }

  // ===== SERVICE ACCOUNT MANAGEMENT METHODS =====

  /**
   * List service accounts in the organization
   * Requires Auth:ServiceAccounts:Read permission
   */
  async listServiceAccounts(params?: DfnsListServiceAccountsRequest): Promise<DfnsListServiceAccountsResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_LIST;
      
      // Convert params to query parameters string format
      const queryParams = params ? {
        ...(params.limit !== undefined && { limit: params.limit.toString() }),
        ...(params.paginationToken && { paginationToken: params.paginationToken })
      } : undefined;
      
      const response = await this.dfnsClient.makeRequest<DfnsListServiceAccountsResponse>(
        'GET',
        url,
        undefined,
        queryParams
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list service accounts: ${error}`,
        { params }
      );
    }
  }

  /**
   * Create a new service account
   * Requires Auth:ServiceAccounts:Create permission
   */
  async createServiceAccount(params: DfnsCreateServiceAccountRequest): Promise<DfnsCreateServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_CREATE;
      
      const response = await this.dfnsClient.makeRequest<DfnsCreateServiceAccountResponse>(
        'POST',
        url,
        params
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create service account: ${error}`,
        { params: { ...params, publicKey: '[REDACTED]' } }
      );
    }
  }

  /**
   * Get a specific service account by ID
   * Requires Auth:ServiceAccounts:Read permission
   */
  async getServiceAccount(serviceAccountId: string): Promise<DfnsGetServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_GET.replace(':serviceAccountId', serviceAccountId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetServiceAccountResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Update a service account
   * Requires Auth:ServiceAccounts:Update permission
   */
  async updateServiceAccount(
    serviceAccountId: string, 
    params: DfnsUpdateServiceAccountRequest
  ): Promise<DfnsUpdateServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_UPDATE.replace(':serviceAccountId', serviceAccountId);
      
      const response = await this.dfnsClient.makeRequest<DfnsUpdateServiceAccountResponse>(
        'PUT',
        url,
        params
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update service account: ${error}`,
        { serviceAccountId, params }
      );
    }
  }

  /**
   * Activate a service account
   * Requires Auth:ServiceAccounts:Activate permission
   */
  async activateServiceAccount(serviceAccountId: string): Promise<DfnsActivateServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_ACTIVATE.replace(':serviceAccountId', serviceAccountId);
      
      const response = await this.dfnsClient.makeRequest<DfnsActivateServiceAccountResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Deactivate a service account
   * Requires Auth:ServiceAccounts:Deactivate permission
   */
  async deactivateServiceAccount(serviceAccountId: string): Promise<DfnsDeactivateServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_DEACTIVATE.replace(':serviceAccountId', serviceAccountId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeactivateServiceAccountResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  /**
   * Archive a service account (soft delete)
   * Requires Auth:ServiceAccounts:Delete permission
   */
  async archiveServiceAccount(serviceAccountId: string): Promise<DfnsArchiveServiceAccountResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_SERVICE_ACCOUNTS_ARCHIVE.replace(':serviceAccountId', serviceAccountId);
      
      const response = await this.dfnsClient.makeRequest<DfnsArchiveServiceAccountResponse>(
        'DELETE',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive service account: ${error}`,
        { serviceAccountId }
      );
    }
  }

  // ===============================
  // Personal Access Token Management Methods
  // ===============================

  /**
   * List personal access tokens for the caller
   * No special permissions required
   */
  async listPersonalAccessTokens(): Promise<DfnsListPersonalAccessTokensResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsListPersonalAccessTokensResponse>(
        'GET',
        DFNS_ENDPOINTS.AUTH_PATS_LIST
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list personal access tokens: ${error}`
      );
    }
  }

  /**
   * Create a new personal access token
   * Requires Auth:Pats:Create permission and User Action Signing
   */
  async createPersonalAccessToken(
    request: DfnsCreatePersonalAccessTokenRequest,
    userActionToken?: string
  ): Promise<DfnsCreatePersonalAccessTokenResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken } as Record<string, string>
        : undefined;

      const response = await this.dfnsClient.makeRequest<DfnsCreatePersonalAccessTokenResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_PATS_CREATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create personal access token: ${error}`,
        { name: request.name }
      );
    }
  }

  /**
   * Get a specific personal access token by ID
   * No special permissions required
   */
  async getPersonalAccessToken(tokenId: string): Promise<DfnsGetPersonalAccessTokenResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_PATS_GET.replace(':tokenId', tokenId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetPersonalAccessTokenResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get personal access token: ${error}`,
        { tokenId }
      );
    }
  }

  /**
   * Update a personal access token
   * No special permissions required
   */
  async updatePersonalAccessToken(
    tokenId: string,
    request: DfnsUpdatePersonalAccessTokenRequest
  ): Promise<DfnsUpdatePersonalAccessTokenResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_PATS_UPDATE.replace(':tokenId', tokenId);
      
      const response = await this.dfnsClient.makeRequest<DfnsUpdatePersonalAccessTokenResponse>(
        'PUT',
        url,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update personal access token: ${error}`,
        { tokenId, request }
      );
    }
  }

  /**
   * Activate a deactivated personal access token
   * No special permissions required
   */
  async activatePersonalAccessToken(tokenId: string): Promise<DfnsActivatePersonalAccessTokenResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_PATS_ACTIVATE.replace(':tokenId', tokenId);
      
      const response = await this.dfnsClient.makeRequest<DfnsActivatePersonalAccessTokenResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate personal access token: ${error}`,
        { tokenId }
      );
    }
  }

  /**
   * Deactivate an active personal access token
   * No special permissions required
   */
  async deactivatePersonalAccessToken(tokenId: string): Promise<DfnsDeactivatePersonalAccessTokenResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_PATS_DEACTIVATE.replace(':tokenId', tokenId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeactivatePersonalAccessTokenResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate personal access token: ${error}`,
        { tokenId }
      );
    }
  }

  /**
   * Archive a personal access token (soft delete)
   * No special permissions required
   */
  async archivePersonalAccessToken(tokenId: string): Promise<DfnsArchivePersonalAccessTokenResponse> {
    try {
      const url = DFNS_ENDPOINTS.AUTH_PATS_ARCHIVE.replace(':tokenId', tokenId);
      
      const response = await this.dfnsClient.makeRequest<DfnsArchivePersonalAccessTokenResponse>(
        'DELETE',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive personal access token: ${error}`,
        { tokenId }
      );
    }
  }

  // ===============================
  // CREDENTIAL MANAGEMENT METHODS
  // ===============================

  /**
   * Initiate credential creation challenge
   * Part of the credential creation flow (step 1 of 2)
   */
  async initiateCredentialChallenge(
    request: DfnsCredentialChallengeRequest
  ): Promise<DfnsCredentialChallengeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCredentialChallengeResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_INIT,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate credential challenge: ${error}`,
        { kind: request.kind }
      );
    }
  }

  /**
   * Create credential after completing challenge
   * Part of the credential creation flow (step 2 of 2)
   * Requires User Action Signing
   */
  async createCredential(
    request: DfnsCreateCredentialRequest,
    userActionToken?: string
  ): Promise<DfnsCreateCredentialResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken } as Record<string, string>
        : undefined;

      const response = await this.dfnsClient.makeRequest<DfnsCreateCredentialResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_CREATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create credential: ${error}`,
        { 
          name: request.credentialName, 
          kind: request.credentialKind,
          challengeIdentifier: request.challengeIdentifier 
        }
      );
    }
  }

  /**
   * List all credentials for the current user
   * No special permissions required
   */
  async listUserCredentials(): Promise<DfnsListCredentialsResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsListCredentialsResponse>(
        'GET',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_LIST
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list user credentials: ${error}`
      );
    }
  }

  /**
   * Activate a previously deactivated credential
   * Requires User Action Signing
   */
  async activateCredential(
    request: DfnsActivateCredentialRequest,
    userActionToken?: string
  ): Promise<DfnsActivateCredentialResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsActivateCredentialResponse>(
        'PUT',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_ACTIVATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate credential: ${error}`,
        { credentialUuid: request.credentialUuid }
      );
    }
  }

  /**
   * Deactivate an active credential
   * Requires User Action Signing
   */
  async deactivateCredential(
    request: DfnsDeactivateCredentialRequest,
    userActionToken?: string
  ): Promise<DfnsDeactivateCredentialResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsDeactivateCredentialResponse>(
        'PUT',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_DEACTIVATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate credential: ${error}`,
        { credentialUuid: request.credentialUuid }
      );
    }
  }

  // ===============================
  // CODE-BASED CREDENTIAL FLOW METHODS
  // ===============================

  /**
   * Initiate credential challenge with verification code
   * Part of the code-based credential creation flow (step 1 of 2)
   * Does not require authentication or User Action Signing
   */
  async initiateCredentialChallengeWithCode(
    request: DfnsCredentialCodeChallengeRequest
  ): Promise<DfnsCredentialCodeChallengeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCredentialCodeChallengeResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_CODE_INIT,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to initiate credential challenge with code: ${error}`,
        { credentialKind: request.credentialKind }
      );
    }
  }

  /**
   * Create credential with verification code
   * Part of the code-based credential creation flow (step 2 of 2)
   * Does not require authentication or User Action Signing
   */
  async createCredentialWithCode(
    request: DfnsCreateCredentialWithCodeRequest
  ): Promise<DfnsCreateCredentialWithCodeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCreateCredentialWithCodeResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_CREDENTIALS_CODE_VERIFY,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create credential with code: ${error}`,
        { 
          name: request.credentialName, 
          kind: request.credentialKind,
          challengeIdentifier: request.challengeIdentifier 
        }
      );
    }
  }

  // ===============================
  // USER RECOVERY METHODS
  // ===============================

  /**
   * Send recovery code email to user
   * First step in user recovery flow - sends verification code to user's email
   * No permissions required
   */
  async sendRecoveryCode(
    request: DfnsSendRecoveryCodeRequest
  ): Promise<DfnsSendRecoveryCodeResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsSendRecoveryCodeResponse>(
        'PUT',
        DFNS_ENDPOINTS.AUTH_RECOVERY_CODE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to send recovery code: ${error}`,
        { username: request.username, orgId: request.orgId }
      );
    }
  }

  /**
   * Create recovery challenge with verification code
   * Second step in standard user recovery flow - creates WebAuthn challenge for recovery
   * User must provide verification code from email
   * No permissions required
   */
  async createRecoveryChallenge(
    request: DfnsCreateRecoveryRequest
  ): Promise<DfnsCreateRecoveryResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCreateRecoveryResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_RECOVERY_INIT,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create recovery challenge: ${error}`,
        { 
          username: request.username, 
          orgId: request.orgId,
          credentialId: request.credentialId 
        }
      );
    }
  }

  /**
   * Create delegated recovery challenge
   * Service account initiated recovery for custom branded UX
   * Requires Auth:Recover:Delegated permission
   */
  async createDelegatedRecoveryChallenge(
    request: DfnsDelegatedRecoveryRequest
  ): Promise<DfnsDelegatedRecoveryResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsDelegatedRecoveryResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_RECOVERY_DELEGATED,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create delegated recovery challenge: ${error}`,
        { 
          username: request.username,
          credentialId: request.credentialId 
        }
      );
    }
  }

  /**
   * Recover user account using recovery credential
   * Final step in user recovery flow - completes recovery by signing new credentials
   * Requires cryptographic validation using recovery credential
   * Invalidates ALL existing user credentials after successful recovery
   * No permissions required
   */
  async recoverUser(
    request: DfnsRecoverUserRequest
  ): Promise<DfnsRecoverUserResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsRecoverUserResponse>(
        'POST',
        DFNS_ENDPOINTS.AUTH_RECOVERY_USER,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to recover user: ${error}`,
        { 
          recoveryKind: request.recovery.kind,
          firstFactorKind: request.newCredentials.firstFactorCredential.credentialKind
        }
      );
    }
  }

  // ===============================
  // WALLET MANAGEMENT METHODS
  // ===============================

  /**
   * Create a new wallet
   * Requires Wallets:Create permission and User Action Signing
   */
  async createWallet(
    request: DfnsCreateWalletRequest,
    userActionToken?: string
  ): Promise<DfnsCreateWalletResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsCreateWalletResponse>(
        'POST',
        DFNS_ENDPOINTS.WALLETS_CREATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create wallet: ${error}`,
        { network: request.network, name: request.name }
      );
    }
  }

  /**
   * Update wallet name
   * Requires Wallets:Update permission
   */
  async updateWallet(
    walletId: string,
    request: DfnsUpdateWalletRequest
  ): Promise<DfnsUpdateWalletResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_UPDATE.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsUpdateWalletResponse>(
        'PUT',
        url,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update wallet: ${error}`,
        { walletId, name: request.name }
      );
    }
  }

  /**
   * Delete (archive) a wallet
   * Requires Wallets:Delete permission and User Action Signing
   */
  async deleteWallet(
    walletId: string,
    userActionToken?: string
  ): Promise<DfnsDeleteWalletResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_DELETE.replace(':walletId', walletId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsDeleteWalletResponse>(
        'DELETE',
        url,
        undefined,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delete wallet: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Delegate wallet to end user (DEPRECATED - use Delegate Key instead)
   * Requires Wallets:Delegate permission and User Action Signing
   */
  async delegateWallet(
    walletId: string,
    request: DfnsDelegateWalletRequest,
    userActionToken?: string
  ): Promise<DfnsDelegateWalletResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_DELEGATE.replace(':walletId', walletId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsDelegateWalletResponse>(
        'POST',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delegate wallet: ${error}`,
        { walletId, endUserId: request.endUserId }
      );
    }
  }

  /**
   * Get wallet by ID
   * Requires Wallets:Read permission
   */
  async getWallet(walletId: string): Promise<DfnsGetWalletResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_GET.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetWalletResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get wallet: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * List wallets
   * Requires Wallets:Read permission
   */
  async listWallets(request?: DfnsListWalletsRequest): Promise<DfnsListWalletsResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.owner) {
        params.append('owner', request.owner);
      }
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.WALLETS_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.WALLETS_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListWalletsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list wallets: ${error}`,
        { request }
      );
    }
  }

  /**
   * Get wallet assets (balances)
   * Requires Wallets:Read permission
   */
  async getWalletAssets(
    walletId: string,
    request?: DfnsGetWalletAssetsRequest
  ): Promise<DfnsGetWalletAssetsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_ASSETS.replace(':walletId', walletId);
      
      const params = new URLSearchParams();
      if (request?.includeUsdValue) {
        params.append('quote', 'true');
      }

      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const response = await this.dfnsClient.makeRequest<DfnsGetWalletAssetsResponse>(
        'GET',
        finalUrl
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get wallet assets: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Get wallet NFTs
   * Requires Wallets:Read permission
   */
  async getWalletNfts(walletId: string): Promise<DfnsGetWalletNftsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_NFTS.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetWalletNftsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get wallet NFTs: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Get wallet transaction history
   * Requires Wallets:Read permission
   */
  async getWalletHistory(walletId: string): Promise<DfnsGetWalletHistoryResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_HISTORY.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetWalletHistoryResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get wallet history: ${error}`,
        { walletId }
      );
    }
  }

  /**
   * Add tags to wallet
   * Requires Wallets:Tags:Add permission
   */
  async addWalletTags(
    walletId: string,
    request: DfnsAddWalletTagsRequest
  ): Promise<DfnsAddWalletTagsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TAGS_ADD.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsAddWalletTagsResponse>(
        'POST',
        url,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to add wallet tags: ${error}`,
        { walletId, tags: request.tags }
      );
    }
  }

  /**
   * Delete tags from wallet
   * Requires Wallets:Tags:Delete permission
   */
  async deleteWalletTags(
    walletId: string,
    request: DfnsDeleteWalletTagsRequest
  ): Promise<DfnsDeleteWalletTagsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TAGS_DELETE.replace(':walletId', walletId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeleteWalletTagsResponse>(
        'DELETE',
        url,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delete wallet tags: ${error}`,
        { walletId, tags: request.tags }
      );
    }
  }

  /**
   * Transfer asset from wallet
   * Requires Wallets:Transfer permission and User Action Signing
   */
  async transferAsset(
    walletId: string,
    request: DfnsTransferAssetRequest,
    userActionToken?: string
  ): Promise<DfnsTransferRequestResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSFERS_CREATE.replace(':walletId', walletId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsTransferRequestResponse>(
        'POST',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to transfer asset: ${error}`,
        { walletId, kind: request.kind, to: request.to }
      );
    }
  }

  /**
   * Get transfer request by ID
   * Requires Wallets:Transfer:Read permission
   */
  async getTransferRequest(
    walletId: string,
    transferId: string
  ): Promise<DfnsGetTransferRequestResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSFERS_GET
        .replace(':walletId', walletId)
        .replace(':transferId', transferId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetTransferRequestResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get transfer request: ${error}`,
        { walletId, transferId }
      );
    }
  }

  /**
   * List transfer requests for wallet
   * Requires Wallets:Transfer:Read permission
   */
  async listTransferRequests(
    walletId: string,
    limit?: number,
    paginationToken?: string
  ): Promise<DfnsListTransferRequestsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSFERS_LIST.replace(':walletId', walletId);
      
      const params = new URLSearchParams();
      if (limit) {
        params.append('limit', limit.toString());
      }
      if (paginationToken) {
        params.append('paginationToken', paginationToken);
      }

      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const response = await this.dfnsClient.makeRequest<DfnsListTransferRequestsResponse>(
        'GET',
        finalUrl
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list transfer requests: ${error}`,
        { walletId }
      );
    }
  }

  // ===============================
  // TRANSACTION BROADCASTING METHODS
  // ===============================

  /**
   * Broadcast (sign and send) a transaction to the blockchain
   * Requires Wallets:Transactions:Create permission and User Action Signing
   * Supports all blockchain networks and transaction types
   */
  async broadcastTransaction(
    walletId: string,
    request: DfnsBroadcastTransactionRequest,
    userActionToken?: string
  ): Promise<DfnsTransactionRequestResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSACTIONS_BROADCAST.replace(':walletId', walletId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsTransactionRequestResponse>(
        'POST',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to broadcast transaction: ${error}`,
        { 
          walletId, 
          kind: request.kind,
          externalId: request.externalId
        }
      );
    }
  }

  /**
   * Get transaction request by ID
   * Requires Wallets:Transactions:Read permission
   */
  async getTransactionRequest(
    walletId: string,
    transactionId: string
  ): Promise<DfnsGetTransactionRequestResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSACTIONS_GET
        .replace(':walletId', walletId)
        .replace(':transactionId', transactionId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetTransactionRequestResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get transaction request: ${error}`,
        { walletId, transactionId }
      );
    }
  }

  /**
   * List transaction requests for wallet
   * Requires Wallets:Transactions:Read permission
   */
  async listTransactionRequests(
    walletId: string,
    params?: DfnsListTransactionRequestsParams
  ): Promise<DfnsListTransactionRequestsResponse> {
    try {
      const url = DFNS_ENDPOINTS.WALLETS_TRANSACTIONS_LIST.replace(':walletId', walletId);
      
      const urlParams = new URLSearchParams();
      if (params?.limit) {
        urlParams.append('limit', params.limit.toString());
      }
      if (params?.paginationToken) {
        urlParams.append('paginationToken', params.paginationToken);
      }

      const finalUrl = urlParams.toString() ? `${url}?${urlParams.toString()}` : url;

      const response = await this.dfnsClient.makeRequest<DfnsListTransactionRequestsResponse>(
        'GET',
        finalUrl
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list transaction requests: ${error}`,
        { walletId, params }
      );
    }
  }

  // ===============================
  // FEE SPONSORS MANAGEMENT METHODS
  // ===============================

  /**
   * Create a new fee sponsor
   * Requires FeeSponsors:Create permission
   * Designates a wallet to sponsor gas fees for other wallets
   */
  async createFeeSponsor(
    request: DfnsCreateFeeSponsorRequest
  ): Promise<DfnsCreateFeeSponsorResponse> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCreateFeeSponsorResponse>(
        'POST',
        DFNS_ENDPOINTS.FEE_SPONSORS_CREATE,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create fee sponsor: ${error}`,
        { walletId: request.walletId }
      );
    }
  }

  /**
   * Get fee sponsor by ID
   * Requires FeeSponsors:Read permission
   */
  async getFeeSponsor(feeSponsorId: string): Promise<DfnsGetFeeSponsorResponse> {
    try {
      const url = DFNS_ENDPOINTS.FEE_SPONSORS_GET.replace(':feeSponsorId', feeSponsorId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetFeeSponsorResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get fee sponsor: ${error}`,
        { feeSponsorId }
      );
    }
  }

  /**
   * List all fee sponsors
   * Requires FeeSponsors:Read permission
   */
  async listFeeSponsors(
    request?: DfnsListFeeSponsorsRequest
  ): Promise<DfnsListFeeSponsorsResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.FEE_SPONSORS_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.FEE_SPONSORS_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListFeeSponsorsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list fee sponsors: ${error}`,
        { request }
      );
    }
  }

  /**
   * Activate a fee sponsor
   * Requires FeeSponsors:Update permission
   * Once activated, the fee sponsor can be used for gasless transactions
   */
  async activateFeeSponsor(feeSponsorId: string): Promise<DfnsActivateFeeSponsorResponse> {
    try {
      const url = DFNS_ENDPOINTS.FEE_SPONSORS_ACTIVATE.replace(':feeSponsorId', feeSponsorId);
      
      const response = await this.dfnsClient.makeRequest<DfnsActivateFeeSponsorResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to activate fee sponsor: ${error}`,
        { feeSponsorId }
      );
    }
  }

  /**
   * Deactivate a fee sponsor
   * Requires FeeSponsors:Update permission
   * Once deactivated, the fee sponsor cannot be used for new transactions
   */
  async deactivateFeeSponsor(feeSponsorId: string): Promise<DfnsDeactivateFeeSponsorResponse> {
    try {
      const url = DFNS_ENDPOINTS.FEE_SPONSORS_DEACTIVATE.replace(':feeSponsorId', feeSponsorId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeactivateFeeSponsorResponse>(
        'PUT',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to deactivate fee sponsor: ${error}`,
        { feeSponsorId }
      );
    }
  }

  /**
   * Delete (archive) a fee sponsor
   * Requires FeeSponsors:Delete permission
   * Permanently removes the fee sponsor from active use
   */
  async deleteFeeSponsor(feeSponsorId: string): Promise<DfnsDeleteFeeSponsorResponse> {
    try {
      const url = DFNS_ENDPOINTS.FEE_SPONSORS_DELETE.replace(':feeSponsorId', feeSponsorId);
      
      const response = await this.dfnsClient.makeRequest<DfnsDeleteFeeSponsorResponse>(
        'DELETE',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delete fee sponsor: ${error}`,
        { feeSponsorId }
      );
    }
  }

  /**
   * List sponsored fees for a fee sponsor
   * Requires FeeSponsors:Read permission
   * Returns history of all fees paid by this sponsor
   */
  async listSponsoredFees(
    feeSponsorId: string,
    request?: DfnsListSponsoredFeesRequest
  ): Promise<DfnsListSponsoredFeesResponse> {
    try {
      const url = DFNS_ENDPOINTS.FEE_SPONSORS_FEES_LIST.replace(':feeSponsorId', feeSponsorId);
      
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const response = await this.dfnsClient.makeRequest<DfnsListSponsoredFeesResponse>(
        'GET',
        finalUrl
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list sponsored fees: ${error}`,
        { feeSponsorId, request }
      );
    }
  }

  // ===============================
  // KEYS MANAGEMENT METHODS
  // ===============================

  /**
   * Create a new cryptographic key
   * Requires Keys:Create permission and User Action Signing for sensitive operations
   * Also requires Keys:Delegate permission if delegateTo is specified
   */
  async createKey(
    request: DfnsCreateKeyRequest,
    userActionToken?: string
  ): Promise<DfnsCreateKeyResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsCreateKeyResponse>(
        'POST',
        DFNS_ENDPOINTS.KEYS_CREATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create key: ${error}`,
        { 
          scheme: request.scheme, 
          curve: request.curve,
          delegateTo: request.delegateTo
        }
      );
    }
  }

  /**
   * Update a key's name
   * Requires Keys:Update permission
   */
  async updateKey(
    keyId: string,
    request: DfnsUpdateKeyRequest
  ): Promise<DfnsUpdateKeyResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_UPDATE.replace(':keyId', keyId);
      
      const response = await this.dfnsClient.makeRequest<DfnsUpdateKeyResponse>(
        'PUT',
        url,
        request
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update key: ${error}`,
        { keyId, name: request.name }
      );
    }
  }

  /**
   * Delete (archive) a key and all associated wallets
   * Requires Keys:Delete permission and User Action Signing
   * This operation is permanent and cannot be undone
   */
  async deleteKey(
    keyId: string,
    userActionToken?: string
  ): Promise<DfnsDeleteKeyResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_DELETE.replace(':keyId', keyId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsDeleteKeyResponse>(
        'DELETE',
        url,
        undefined,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delete key: ${error}`,
        { keyId }
      );
    }
  }

  /**
   * Get a key by its ID
   * Requires Keys:Read permission
   * Returns key details including associated wallets and store information
   */
  async getKey(keyId: string): Promise<DfnsGetKeyResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_GET.replace(':keyId', keyId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetKeyResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get key: ${error}`,
        { keyId }
      );
    }
  }

  /**
   * List all keys
   * Requires Keys:Read permission
   * Supports filtering by owner and pagination
   */
  async listKeys(request?: DfnsListKeysRequest): Promise<DfnsListKeysResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.owner) {
        params.append('owner', request.owner);
      }
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.KEYS_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.KEYS_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListKeysResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list keys: ${error}`,
        { request }
      );
    }
  }

  /**
   * Delegate a key to an end user
   * Requires Keys:Delegate permission and User Action Signing
   * Only keys created with delayDelegation: true can be delegated
   * This operation is irreversible - transfers ownership to end user
   * When a key is delegated, all wallets using this key are also delegated
   */
  async delegateKey(
    keyId: string,
    request: DfnsDelegateKeyRequest,
    userActionToken?: string
  ): Promise<DfnsDelegateKeyResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_DELEGATE.replace(':keyId', keyId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsDelegateKeyResponse>(
        'POST',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delegate key: ${error}`,
        { keyId, userId: request.userId }
      );
    }
  }

  // ===============================
  // Keys Signature Generation APIs
  // ===============================

  /**
   * Generate a signature using a key
   * Requires Keys:Sign permission and User Action Signing
   * Supports multiple signature types: Transaction, Hash, Message, EIP-712, PSBT, BIP-322
   */
  async generateKeySignature(
    keyId: string,
    request: DfnsGenerateSignatureRequest,
    userActionToken?: string
  ): Promise<DfnsGenerateSignatureResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_SIGNATURE_GENERATE.replace(':keyId', keyId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsGenerateSignatureResponse>(
        'POST',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to generate key signature: ${error}`,
        { keyId, signatureKind: request.kind, blockchainKind: request.blockchainKind }
      );
    }
  }

  /**
   * Get a signature request by ID
   * Requires Keys:Read permission
   * Returns signature request details including current status and signature data if completed
   */
  async getKeySignatureRequest(
    keyId: string,
    signatureId: string
  ): Promise<DfnsGetSignatureRequestResponse> {
    try {
      const url = DFNS_ENDPOINTS.KEYS_SIGNATURE_GET
        .replace(':keyId', keyId)
        .replace(':signatureId', signatureId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetSignatureRequestResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get key signature request: ${error}`,
        { keyId, signatureId }
      );
    }
  }

  /**
   * List all signature requests for a key
   * Requires Keys:Read permission
   * Supports filtering by status, blockchain kind, and signature kind with pagination
   */
  async listKeySignatureRequests(
    keyId: string,
    request?: DfnsListSignatureRequestsRequest
  ): Promise<DfnsListSignatureRequestsResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }
      if (request?.status) {
        params.append('status', request.status);
      }
      if (request?.blockchainKind) {
        params.append('blockchainKind', request.blockchainKind);
      }
      if (request?.kind) {
        params.append('kind', request.kind);
      }

      const baseUrl = DFNS_ENDPOINTS.KEYS_SIGNATURE_LIST.replace(':keyId', keyId);
      const url = params.toString() 
        ? `${baseUrl}?${params.toString()}`
        : baseUrl;

      const response = await this.dfnsClient.makeRequest<DfnsListSignatureRequestsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list key signature requests: ${error}`,
        { keyId, request }
      );
    }
  }

  // ===============================
  // POLICY ENGINE API METHODS (v2)
  // ===============================

  /**
   * Create a new policy
   * Requires Policies:Create permission and User Action Signing
   */
  async createPolicy(
    request: DfnsCreatePolicyRequest,
    userActionToken?: string
  ): Promise<DfnsCreatePolicyResponse> {
    try {
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsCreatePolicyResponse>(
        'POST',
        DFNS_ENDPOINTS.POLICIES_V2_CREATE,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create policy: ${error}`,
        { name: request.name, activityKind: request.activityKind }
      );
    }
  }

  /**
   * Get a specific policy by ID
   * Requires Policies:Read permission
   */
  async getPolicy(policyId: string): Promise<DfnsGetPolicyResponse> {
    try {
      const url = DFNS_ENDPOINTS.POLICIES_V2_GET.replace(':policyId', policyId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetPolicyResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get policy: ${error}`,
        { policyId }
      );
    }
  }

  /**
   * List all policies with optional filtering and pagination
   * Requires Policies:Read permission
   */
  async listPolicies(
    request?: DfnsListPoliciesRequest
  ): Promise<DfnsListPoliciesResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.activityKind) {
        params.append('activityKind', request.activityKind);
      }
      if (request?.status) {
        params.append('status', request.status);
      }
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.POLICIES_V2_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.POLICIES_V2_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListPoliciesResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list policies: ${error}`,
        { request }
      );
    }
  }

  /**
   * Update an existing policy
   * Requires Policies:Update permission and User Action Signing
   */
  async updatePolicy(
    policyId: string,
    request: DfnsUpdatePolicyRequest,
    userActionToken?: string
  ): Promise<DfnsUpdatePolicyResponse> {
    try {
      const url = DFNS_ENDPOINTS.POLICIES_V2_UPDATE.replace(':policyId', policyId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsUpdatePolicyResponse>(
        'PUT',
        url,
        request,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update policy: ${error}`,
        { policyId, request }
      );
    }
  }

  /**
   * Archive (soft delete) a policy
   * Requires Policies:Delete permission and User Action Signing
   */
  async archivePolicy(
    policyId: string,
    userActionToken?: string
  ): Promise<DfnsArchivePolicyResponse> {
    try {
      const url = DFNS_ENDPOINTS.POLICIES_V2_ARCHIVE.replace(':policyId', policyId);
      
      const headers = userActionToken 
        ? { 'X-DFNS-USERACTION': userActionToken }
        : {};

      const response = await this.dfnsClient.makeRequest<DfnsArchivePolicyResponse>(
        'DELETE',
        url,
        undefined,
        headers
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive policy: ${error}`,
        { policyId }
      );
    }
  }

  // ===============================
  // POLICY APPROVAL API METHODS (v2)
  // ===============================

  /**
   * Get a specific approval by ID
   * Requires Policies:Read permission
   */
  async getApproval(approvalId: string): Promise<DfnsGetApprovalResponse> {
    try {
      const url = DFNS_ENDPOINTS.POLICY_APPROVALS_V2_GET.replace(':approvalId', approvalId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetApprovalResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get approval: ${error}`,
        { approvalId }
      );
    }
  }

  /**
   * List all approvals with optional filtering and pagination
   * Requires Policies:Read permission
   */
  async listApprovals(
    request?: DfnsListApprovalsRequest
  ): Promise<DfnsListApprovalsResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.status) {
        params.append('status', request.status);
      }
      if (request?.activityKind) {
        params.append('activityKind', request.activityKind);
      }
      if (request?.walletId) {
        params.append('walletId', request.walletId);
      }
      if (request?.keyId) {
        params.append('keyId', request.keyId);
      }
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.POLICY_APPROVALS_V2_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.POLICY_APPROVALS_V2_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListApprovalsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list approvals: ${error}`,
        { request }
      );
    }
  }

  /**
   * Create an approval decision (approve or deny)
   * Requires Policies:Approve permission
   */
  async createApprovalDecision(
    approvalId: string,
    decision: DfnsCreateApprovalDecisionRequest
  ): Promise<DfnsCreateApprovalDecisionResponse> {
    try {
      const url = DFNS_ENDPOINTS.POLICY_APPROVALS_V2_DECISION.replace(':approvalId', approvalId);
      
      const response = await this.dfnsClient.makeRequest<DfnsCreateApprovalDecisionResponse>(
        'POST',
        url,
        decision
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create approval decision: ${error}`,
        { approvalId, decision: decision.value }
      );
    }
  }

  // =============================================================================
  // PERMISSION MANAGEMENT APIS
  // =============================================================================

  /**
   * List all permissions in the organization
   * GET /permissions
   */
  async listPermissions(request: DfnsListPermissionsRequest): Promise<DfnsListPermissionsResponse> {
    try {
      const params = new URLSearchParams();
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.paginationToken) params.append('paginationToken', request.paginationToken);
      
      const url = `${DFNS_ENDPOINTS.PERMISSIONS}?${params.toString()}`;
      
      const response = await this.dfnsClient.makeRequest<DfnsListPermissionsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permissions: ${error}`,
        { request }
      );
    }
  }

  /**
   * Get a specific permission by ID
   * GET /permissions/{permissionId}
   */
  async getPermission(permissionId: string): Promise<DfnsGetPermissionResponse> {
    try {
      const url = `${DFNS_ENDPOINTS.PERMISSIONS}/${permissionId}`;
      
      const response = await this.dfnsClient.makeRequest<DfnsGetPermissionResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get permission: ${error}`,
        { permissionId }
      );
    }
  }

  /**
   * Create a new permission
   * POST /permissions
   * Requires User Action Signing
   */
  async createPermission(
    request: DfnsCreatePermissionRequest,
    userActionToken: string
  ): Promise<DfnsCreatePermissionResponse> {
    try {
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsCreatePermissionResponse>(
        'POST',
        DFNS_ENDPOINTS.PERMISSIONS,
        request,
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create permission: ${error}`,
        { request }
      );
    }
  }

  /**
   * Update an existing permission
   * PUT /permissions/{permissionId}
   * Requires User Action Signing
   */
  async updatePermission(
    permissionId: string,
    request: DfnsUpdatePermissionRequest,
    userActionToken: string
  ): Promise<DfnsUpdatePermissionResponse> {
    try {
      const url = `${DFNS_ENDPOINTS.PERMISSIONS}/${permissionId}`;
      
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsUpdatePermissionResponse>(
        'PUT',
        url,
        request,
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update permission: ${error}`,
        { permissionId, request }
      );
    }
  }

  /**
   * Archive (soft delete) a permission
   * DELETE /permissions/{permissionId}
   * Requires User Action Signing
   */
  async archivePermission(
    permissionId: string,
    userActionToken: string
  ): Promise<DfnsArchivePermissionResponse> {
    try {
      const url = `${DFNS_ENDPOINTS.PERMISSIONS}/${permissionId}`;
      
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsArchivePermissionResponse>(
        'DELETE',
        url,
        {},
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive permission: ${error}`,
        { permissionId }
      );
    }
  }

  /**
   * Assign a permission to an identity (user, service account, or PAT)
   * POST /permissions/assignments
   * Requires User Action Signing
   */
  async assignPermission(
    request: DfnsAssignPermissionRequest,
    userActionToken: string
  ): Promise<DfnsAssignPermissionResponse> {
    try {
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsAssignPermissionResponse>(
        'POST',
        DFNS_ENDPOINTS.PERMISSION_ASSIGNMENTS,
        request,
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to assign permission: ${error}`,
        { request }
      );
    }
  }

  /**
   * Revoke a permission assignment
   * DELETE /permissions/assignments/{assignmentId}
   * Requires User Action Signing
   */
  async revokePermissionAssignment(
    assignmentId: string,
    userActionToken: string
  ): Promise<DfnsRevokePermissionAssignmentResponse> {
    try {
      const url = `${DFNS_ENDPOINTS.PERMISSION_ASSIGNMENTS}/${assignmentId}`;
      
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsRevokePermissionAssignmentResponse>(
        'DELETE',
        url,
        {},
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to revoke permission assignment: ${error}`,
        { assignmentId }
      );
    }
  }

  /**
   * List all permission assignments
   * GET /permissions/assignments
   */
  async listPermissionAssignments(
    request: DfnsListPermissionAssignmentsRequest
  ): Promise<DfnsListPermissionAssignmentsResponse> {
    try {
      const params = new URLSearchParams();
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.paginationToken) params.append('paginationToken', request.paginationToken);
      if (request.permissionId) params.append('permissionId', request.permissionId);
      if (request.identityId) params.append('identityId', request.identityId);
      if (request.identityKind) params.append('identityKind', request.identityKind);
      
      const url = `${DFNS_ENDPOINTS.PERMISSION_ASSIGNMENTS}?${params.toString()}`;
      
      const response = await this.dfnsClient.makeRequest<DfnsListPermissionAssignmentsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permission assignments: ${error}`,
        { request }
      );
    }
  }

  /**
   * List assignments for a specific permission
   * GET /permissions/{permissionId}/assignments
   */
  async listPermissionAssignmentsForPermission(
    permissionId: string,
    request: DfnsListPermissionAssignmentsForPermissionRequest
  ): Promise<DfnsListPermissionAssignmentsForPermissionResponse> {
    try {
      const params = new URLSearchParams();
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.paginationToken) params.append('paginationToken', request.paginationToken);
      
      const url = `${DFNS_ENDPOINTS.PERMISSIONS}/${permissionId}/assignments?${params.toString()}`;
      
      const response = await this.dfnsClient.makeRequest<DfnsListPermissionAssignmentsForPermissionResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permission assignments for permission: ${error}`,
        { permissionId, request }
      );
    }
  }

  // =============================================================================
  // WEBHOOK MANAGEMENT APIS
  // =============================================================================

  /**
   * Create a new webhook
   * POST /webhooks
   * Requires Webhooks:Create permission and User Action Signing
   */
  async createWebhook(
    request: DfnsCreateWebhookRequest,
    userActionToken: string
  ): Promise<DfnsCreateWebhookResponse> {
    try {
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsCreateWebhookResponse>(
        'POST',
        DFNS_ENDPOINTS.WEBHOOKS_CREATE,
        request,
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create webhook: ${error}`,
        { url: request.url, events: request.events }
      );
    }
  }

  /**
   * Get a specific webhook by ID
   * GET /webhooks/{webhookId}
   * Requires Webhooks:Read permission
   */
  async getWebhook(webhookId: string): Promise<DfnsGetWebhookResponse> {
    try {
      const url = DFNS_ENDPOINTS.WEBHOOKS_GET.replace(':webhookId', webhookId);
      
      const response = await this.dfnsClient.makeRequest<DfnsGetWebhookResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get webhook: ${error}`,
        { webhookId }
      );
    }
  }

  /**
   * List all webhooks in the organization
   * GET /webhooks
   * Requires Webhooks:Read permission
   */
  async listWebhooks(
    request?: DfnsListWebhooksRequest
  ): Promise<DfnsListWebhooksResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }

      const url = params.toString() 
        ? `${DFNS_ENDPOINTS.WEBHOOKS_LIST}?${params.toString()}`
        : DFNS_ENDPOINTS.WEBHOOKS_LIST;

      const response = await this.dfnsClient.makeRequest<DfnsListWebhooksResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list webhooks: ${error}`,
        { request }
      );
    }
  }

  /**
   * Update an existing webhook
   * PUT /webhooks/{webhookId}
   * Requires Webhooks:Update permission and User Action Signing
   */
  async updateWebhook(
    webhookId: string,
    request: DfnsUpdateWebhookRequest,
    userActionToken: string
  ): Promise<DfnsUpdateWebhookResponse> {
    try {
      const url = DFNS_ENDPOINTS.WEBHOOKS_UPDATE.replace(':webhookId', webhookId);
      
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsUpdateWebhookResponse>(
        'PUT',
        url,
        request,
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update webhook: ${error}`,
        { webhookId, request }
      );
    }
  }

  /**
   * Delete (remove) a webhook
   * DELETE /webhooks/{webhookId}
   * Requires Webhooks:Delete permission and User Action Signing
   */
  async deleteWebhook(
    webhookId: string,
    userActionToken: string
  ): Promise<DfnsDeleteWebhookResponse> {
    try {
      const url = DFNS_ENDPOINTS.WEBHOOKS_DELETE.replace(':webhookId', webhookId);
      
      const response = await this.dfnsClient.makeRequestWithUserAction<DfnsDeleteWebhookResponse>(
        'DELETE',
        url,
        {},
        userActionToken
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to delete webhook: ${error}`,
        { webhookId }
      );
    }
  }

  /**
   * Ping a webhook to test connectivity
   * POST /webhooks/{webhookId}/ping
   * Requires Webhooks:Read permission
   */
  async pingWebhook(webhookId: string): Promise<DfnsPingWebhookResponse> {
    try {
      const url = DFNS_ENDPOINTS.WEBHOOKS_PING.replace(':webhookId', webhookId);
      
      const response = await this.dfnsClient.makeRequest<DfnsPingWebhookResponse>(
        'POST',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to ping webhook: ${error}`,
        { webhookId }
      );
    }
  }

  // =============================================================================
  // WEBHOOK EVENTS APIS
  // =============================================================================

  /**
   * List webhook events for a specific webhook
   * GET /webhooks/{webhookId}/events
   * Requires Webhooks:Events:Read permission
   */
  async listWebhookEvents(
    webhookId: string,
    request?: DfnsListWebhookEventsRequest
  ): Promise<DfnsListWebhookEventsResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.paginationToken) {
        params.append('paginationToken', request.paginationToken);
      }
      if (request?.deliveryFailed !== undefined) {
        params.append('deliveryFailed', request.deliveryFailed.toString());
      }

      const baseUrl = DFNS_ENDPOINTS.WEBHOOKS_EVENTS_LIST.replace(':webhookId', webhookId);
      const url = params.toString() 
        ? `${baseUrl}?${params.toString()}`
        : baseUrl;

      const response = await this.dfnsClient.makeRequest<DfnsListWebhookEventsResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list webhook events: ${error}`,
        { webhookId, request }
      );
    }
  }

  /**
   * Get a specific webhook event by ID
   * GET /webhooks/{webhookId}/events/{webhookEventId}
   * Requires Webhooks:Events:Read permission
   */
  async getWebhookEvent(
    webhookId: string,
    webhookEventId: string
  ): Promise<DfnsWebhookEventResponse> {
    try {
      const url = DFNS_ENDPOINTS.WEBHOOKS_EVENTS_GET
        .replace(':webhookId', webhookId)
        .replace(':webhookEventId', webhookEventId);
      
      const response = await this.dfnsClient.makeRequest<DfnsWebhookEventResponse>(
        'GET',
        url
      );
      
      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get webhook event: ${error}`,
        { webhookId, webhookEventId }
      );
    }
  }

  // ==============================================
  // DIRECT CLIENT ACCESS METHODS
  // ==============================================

  /**
   * Make a direct authenticated API request
   * Exposes the underlying DfnsClient.makeRequest method
   */
  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.dfnsClient.makeRequest<T>(method, endpoint, data, headers);
  }

  /**
   * Make API request with user action signature
   * Exposes the underlying DfnsClient.makeRequestWithUserAction method
   */
  async makeRequestWithUserAction<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    userActionToken?: string,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    return this.dfnsClient.makeRequestWithUserAction<T>(
      method, 
      endpoint, 
      data, 
      userActionToken, 
      additionalHeaders
    );
  }
}
