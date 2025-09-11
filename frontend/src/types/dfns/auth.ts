/**
 * DFNS Authentication Types
 * 
 * Types for DFNS authentication, delegated auth, and credentials
 */

import type { DfnsStatus, DfnsCredentialKind, DfnsUserKind, DfnsNetwork } from './core';
import type { DfnsPermissionAssignment } from './permissions';

// Re-export commonly used types
export type { DfnsCredentialKind, DfnsUserKind } from './core';

// Authentication Challenge Types
export interface DfnsAuthChallenge {
  challenge: string;
  challengeIdentifier: string;
  externalAuthenticationUrl?: string;
  supportedCredentialKinds: DfnsCredentialKind[];
}

// Delegated Registration Request
export interface DfnsDelegatedRegistrationRequest {
  email: string;
  kind: DfnsUserKind;
}

// Delegated Registration Response  
export interface DfnsDelegatedRegistrationResponse {
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  temporaryAuthenticationToken: string;
  supportedCredentialKinds: {
    firstFactor: DfnsCredentialKind[];
    secondFactor: DfnsCredentialKind[];
  };
  challenge: string;
  pubKeyCredParam: Array<{
    type: 'public-key';
    alg: number; // -7 for ES256, -257 for RS256
  }>;
  attestation: 'none' | 'indirect' | 'direct' | 'enterprise';
  excludeCredentials: Array<{
    type: 'public-key';
    id: string;
    transports: string;
  }>;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey: 'required' | 'preferred' | 'discouraged';
    requireResidentKey: boolean;
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
}

// User Registration Completion
export interface DfnsUserRegistrationRequest {
  challengeIdentifier: string;
  firstFactor: {
    kind: DfnsCredentialKind;
    credentialAssertion?: any; // WebAuthn credential
    credentialInfo?: any; // For Key/Password credentials
  };
  secondFactor?: {
    kind: DfnsCredentialKind;
    credentialAssertion?: any;
    credentialInfo?: any;
  };
}

// ================================
// LOGIN API TYPES (Current DFNS API)
// ================================

// Login Challenge Request (POST /auth/login/init)
export interface DfnsLoginChallengeRequest {
  username: string; // Email address of the user (optional for usernameless WebAuthn)
  orgId: string; // ID of the target Org
  loginCode?: string; // Optional OTP for PasswordProtectedKey credentials
}

// Login Challenge Response (POST /auth/login/init)
export interface DfnsLoginChallengeResponse {
  supportedCredentialKinds: Array<{
    kind: DfnsCredentialKind;
    factor: 'first' | 'second' | 'either';
    requiresSecondFactor: boolean;
  }>;
  challenge: string;
  challengeIdentifier: string;
  externalAuthenticationUrl?: string;
  allowCredentials: {
    key: Array<{
      type: 'public-key';
      id: string;
    }>;
    passwordProtectedKey: Array<{
      type: 'public-key';
      id: string;
      encryptedPrivateKey: string;
    }>;
    webauthn: Array<{
      type: 'public-key';
      id: string;
      transports?: string[];
    }>;
  };
}

// Login Credential Assertion (for different credential types)
export interface DfnsFido2LoginAssertion {
  credId: string; // base64url encoded credential ID
  clientData: string; // base64url encoded client data
  authenticatorData: string; // base64url encoded authenticator data
  signature: string; // base64url encoded signature
  userHandle: string; // base64url encoded user handle
}

export interface DfnsKeyLoginAssertion {
  credId: string; // base64url encoded credential ID
  clientData: string; // base64url encoded client data
  signature: string; // base64url encoded signature
}

export interface DfnsPasswordProtectedKeyLoginAssertion {
  credId: string; // base64url encoded credential ID
  clientData: string; // base64url encoded client data
  signature: string; // base64url encoded signature
}

// Complete Login Request (POST /auth/login)
export interface DfnsCompleteLoginRequest {
  challengeIdentifier: string;
  firstFactor: {
    kind: 'Fido2';
    credentialAssertion: DfnsFido2LoginAssertion;
  } | {
    kind: 'Key';
    credentialAssertion: DfnsKeyLoginAssertion;
  } | {
    kind: 'PasswordProtectedKey';
    credentialAssertion: DfnsPasswordProtectedKeyLoginAssertion;
  };
  secondFactor?: {
    kind: DfnsCredentialKind;
    credentialAssertion: DfnsFido2LoginAssertion | DfnsKeyLoginAssertion | DfnsPasswordProtectedKeyLoginAssertion;
  };
}

// Complete Login Response (POST /auth/login)
export interface DfnsCompleteLoginResponse {
  token: string;
}

// Legacy Login Request (for backward compatibility)
export interface DfnsLoginRequest {
  challengeIdentifier: string;
  firstFactor: {
    kind: DfnsCredentialKind;
    credentialAssertion?: any;
  };
  secondFactor?: {
    kind: DfnsCredentialKind;
    credentialAssertion?: any;
  };
}

// Authentication Token Response
export interface DfnsAuthTokenResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: string;
    username: string;
    email?: string;
    status: DfnsStatus;
    kind: DfnsUserKind;
  };
}

// Delegated Login Request
export interface DfnsDelegatedLoginRequest {
  username: string;
  orgId?: string;
}

// User Action Signing Challenge
export interface DfnsUserActionChallenge {
  challenge: string;
  challengeIdentifier: string;
  allowedCredentials: Array<{
    type: 'public-key';
    id: string;
    transports?: string[];
  }>;
}

// User Action Signature
export interface DfnsUserActionSignature {
  challengeIdentifier: string;
  firstFactor: {
    kind: DfnsCredentialKind;
    credentialAssertion: any;
  };
}

// User Action Signature Response
export interface DfnsUserActionSignatureResponse {
  userAction: string;
}

// Personal Access Token Management Types

// Personal Access Token
export interface DfnsPersonalAccessToken {
  dateCreated: string;
  credId: string;
  isActive: boolean;
  kind: string;
  linkedUserId: string;
  linkedAppId: string;
  name: string;
  orgId: string;
  permissionAssignments: DfnsPermissionAssignment[];
  publicKey: string;
  tokenId: string;
  externalId?: string;
}

// Create Personal Access Token Request
export interface DfnsCreatePersonalAccessTokenRequest {
  name: string;
  publicKey: string;
  secondsValid?: number;
  daysValid?: number;
  permissionId?: string;
  externalId?: string;
}

// Create Personal Access Token Response
export interface DfnsCreatePersonalAccessTokenResponse extends DfnsPersonalAccessToken {
  accessToken: string; // Only returned on creation
}

// List Personal Access Tokens Response
export interface DfnsListPersonalAccessTokensResponse {
  items: DfnsPersonalAccessToken[];
}

// Get Personal Access Token Response
export interface DfnsGetPersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Alias for compatibility
export interface DfnsPersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Update Personal Access Token Request
export interface DfnsUpdatePersonalAccessTokenRequest {
  name?: string;
  externalId?: string;
}

// Update Personal Access Token Response
export interface DfnsUpdatePersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Activate Personal Access Token Response
export interface DfnsActivatePersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Deactivate Personal Access Token Response
export interface DfnsDeactivatePersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Archive Personal Access Token Response
export interface DfnsArchivePersonalAccessTokenResponse extends DfnsPersonalAccessToken {}

// Authentication Session
export interface DfnsAuthSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token?: string;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

// Recovery Challenge
export interface DfnsRecoveryChallenge {
  challengeIdentifier: string;
  recoveryMethods: Array<{
    kind: 'email' | 'phone' | 'backup_key';
    identifier: string;
  }>;
}

// Standard User Registration Init Request
export interface DfnsUserRegistrationInitRequest {
  username: string;
  registrationCode: string;
  orgId: string;
}

// Standard User Registration Init Response (same as DfnsDelegatedRegistrationResponse)
export type DfnsUserRegistrationInitResponse = DfnsDelegatedRegistrationResponse;

// Enhanced Credential Information for different types
export interface DfnsFido2CredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
}

export interface DfnsKeyCredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
}

export interface DfnsPasswordProtectedKeyCredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
  encryptedPrivateKey: string;
}

export interface DfnsRecoveryKeyCredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
  encryptedPrivateKey?: string;
}

// Generic Credential Union
export type DfnsCredentialInfo = {
  credentialKind: 'Fido2';
  credentialInfo: DfnsFido2CredentialInfo;
} | {
  credentialKind: 'Key';
  credentialInfo: DfnsKeyCredentialInfo;
} | {
  credentialKind: 'PasswordProtectedKey';
  credentialInfo: DfnsPasswordProtectedKeyCredentialInfo;
  encryptedPrivateKey: string;
} | {
  credentialKind: 'RecoveryKey';
  credentialInfo: DfnsRecoveryKeyCredentialInfo;
  encryptedPrivateKey?: string;
};

// Wallet Creation Specification for End User Registration
export interface DfnsWalletCreationSpec {
  network: DfnsNetwork;
  name?: string;
}

// End User Registration Request
export interface DfnsEndUserRegistrationRequest {
  firstFactorCredential: DfnsCredentialInfo;
  secondFactorCredential?: DfnsCredentialInfo;
  recoveryCredential?: DfnsCredentialInfo;
  wallets: DfnsWalletCreationSpec[];
}

// End User Registration Response
export interface DfnsEndUserRegistrationResponse {
  credential: {
    uuid: string;
    credentialKind: DfnsCredentialKind;
    name: string;
  };
  user: {
    id: string;
    username: string;
    orgId: string;
  };
  authentication: {
    token: string;
  };
  wallets: Array<{
    id: string;
    network: string;
    signingKey: {
      id: string;
      scheme: string;
      curve: string;
      publicKey: string;
    };
    address: string;
    dateCreated: string;
    custodial: boolean;
    status: 'Active' | 'Inactive';
  }>;
}

// Social Registration Request
export interface DfnsSocialRegistrationRequest {
  idToken: string;
  socialLoginProviderKind: 'Oidc';
  orgId?: string;
}

// Social Registration Response (same as standard registration init)
export type DfnsSocialRegistrationResponse = DfnsDelegatedRegistrationResponse;

// Resend Registration Code Request
export interface DfnsResendRegistrationCodeRequest {
  username: string;
  orgId: string;
}

// Resend Registration Code Response
export interface DfnsResendRegistrationCodeResponse {
  message: 'success';
}

// Enhanced User Registration Request with all credential types
export interface DfnsEnhancedUserRegistrationRequest {
  firstFactorCredential: DfnsCredentialInfo;
  secondFactorCredential?: DfnsCredentialInfo;
  recoveryCredential?: DfnsCredentialInfo;
}

// Enhanced User Registration Response
export interface DfnsEnhancedUserRegistrationResponse {
  credential: {
    uuid: string;
    credentialKind: DfnsCredentialKind;
    name: string;
  };
  user: {
    id: string;
    username: string;
    orgId: string;
  };
}

// Social Login Request (different from social registration)
export interface DfnsSocialLoginRequest {
  idToken: string;
  socialLoginProviderKind: 'Oidc';
  orgId?: string;
}

// Social Login Response
export interface DfnsSocialLoginResponse {
  token: string;
}

// Send Login Code Request
export interface DfnsSendLoginCodeRequest {
  username: string;
  orgId: string;
}

// Send Login Code Response
export interface DfnsSendLoginCodeResponse {
  message: 'success';
}

// Logout Request
export interface DfnsLogoutRequest {
  // No body parameters needed
}

// Logout Response
export interface DfnsLogoutResponse {
  message: 'success';
}

// ================================
// CREDENTIAL MANAGEMENT API TYPES
// ================================

// DFNS Credential (Official DFNS API Structure)
export interface DfnsCredential {
  credentialId: string;
  credentialUuid: string;
  dateCreated: string;
  isActive: boolean;
  kind: DfnsCredentialKind;
  name: string;
  publicKey: string;
  relyingPartyId: string;
  origin: string;
}

// ================================
// CODE-BASED CREDENTIAL FLOW TYPES
// ================================

// Credential Challenge With Code Request (POST /auth/credentials/code/init)
export interface DfnsCredentialCodeChallengeRequest {
  code: string; // One time code from Create Credential Code endpoint
  credentialKind: DfnsCredentialKind;
}

// Credential Challenge With Code Response (POST /auth/credentials/code/init)
// Same as regular credential challenge response
export type DfnsCredentialCodeChallengeResponse = DfnsCredentialChallengeResponse;

// Create Credential With Code Request (POST /auth/credentials/code/verify)
export interface DfnsCreateCredentialWithCodeRequest {
  challengeIdentifier: string;
  credentialName: string;
  credentialKind: DfnsCredentialKind;
  credentialInfo: DfnsFido2CredentialInfo | DfnsKeyCredentialInfo | DfnsPasswordProtectedKeyCredentialInfo | DfnsRecoveryKeyCredentialInfo;
  encryptedPrivateKey?: string; // For PasswordProtectedKey and RecoveryKey
}

// Create Credential With Code Response (POST /auth/credentials/code/verify)
// Same as regular credential creation response
export type DfnsCreateCredentialWithCodeResponse = DfnsCreateCredentialResponse;

// Credential Challenge Request (POST /auth/credentials/init)
export interface DfnsCredentialChallengeRequest {
  kind: DfnsCredentialKind;
}

// Credential Challenge Response (POST /auth/credentials/init)
export interface DfnsCredentialChallengeResponse {
  kind: DfnsCredentialKind;
  challengeIdentifier: string;
  challenge: string;
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  rp?: {
    id: string;
    name: string;
  };
  pubKeyCredParam: Array<{
    type: 'public-key';
    alg: number; // -7 for ES256, -257 for RS256
  }>;
  attestation: 'none' | 'indirect' | 'direct' | 'enterprise';
  excludeCredentials: Array<{
    type: 'public-key';
    id: string;
    transports?: string[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey: 'required' | 'preferred' | 'discouraged';
    requireResidentKey: boolean;
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
}

// Create Credential Request (POST /auth/credentials)
export interface DfnsCreateCredentialRequest {
  challengeIdentifier: string;
  credentialName: string;
  credentialKind: DfnsCredentialKind;
  credentialInfo: DfnsFido2CredentialInfo | DfnsKeyCredentialInfo | DfnsPasswordProtectedKeyCredentialInfo | DfnsRecoveryKeyCredentialInfo;
  encryptedPrivateKey?: string; // For PasswordProtectedKey and RecoveryKey
}

// Create Credential Response (POST /auth/credentials)  
export interface DfnsCreateCredentialResponse {
  uuid: string;
  credentialKind: DfnsCredentialKind;
  credentialId: string;
  name: string;
  status: DfnsStatus;
  dateCreated: string;
  publicKey: string;
}

// List User Credentials Response (GET /auth/credentials)
export interface DfnsListCredentialsResponse {
  items: DfnsCredential[];
}

// Activate Credential Request (PUT /auth/credentials/activate)
export interface DfnsActivateCredentialRequest {
  credentialUuid: string;
}

// Activate Credential Response (PUT /auth/credentials/activate)
export interface DfnsActivateCredentialResponse {
  message: 'success';
}

// Deactivate Credential Request (PUT /auth/credentials/deactivate)
export interface DfnsDeactivateCredentialRequest {
  credentialUuid: string;
}

// Deactivate Credential Response (PUT /auth/credentials/deactivate)
export interface DfnsDeactivateCredentialResponse {
  message: 'success';
}

// ================================
// USER RECOVERY API TYPES
// ================================

// Send Recovery Code Email Request (PUT /auth/recover/user/code)
export interface DfnsSendRecoveryCodeRequest {
  username: string; // email of the user
  orgId: string; // globally unique ID of the organization of the user
}

// Send Recovery Code Email Response (PUT /auth/recover/user/code)
export interface DfnsSendRecoveryCodeResponse {
  message: 'success';
}

// Create Recovery Challenge Request (POST /auth/recover/user/init)
export interface DfnsCreateRecoveryRequest {
  username: string; // Email address of the user
  verificationCode: string; // The secret value that the user received in their recovery email
  orgId: string; // ID of the target Org
  credentialId: string; // The credential ID of the user's recovery credential
}

// Recovery Credential Info
export interface DfnsRecoveryCredentialInfo {
  id: string; // the credential ID of the recovery credential
  encryptedRecoveryKey: string; // the encrypted private key set when registering the recovery credential
}

// Create Recovery Challenge Response (POST /auth/recover/user/init)
export interface DfnsCreateRecoveryResponse {
  rp?: {
    id: string;
    name: string;
  };
  user: {
    id: string; // id that ties the user to the credential created in the user's WebAuthn client
    name: string; // additional value that will be displayed to the user on the WebAuthn client's display
    displayName: string; // name that will be displayed to the user on the WebAuthn client's display
  };
  temporaryAuthenticationToken: string; // temporary authentication token that is used to identify the recovery session
  supportedCredentialKinds: {
    firstFactor: DfnsCredentialKind[]; // list of the credential kinds that are supported as a first factor credential
    secondFactor: DfnsCredentialKind[]; // list of the credential kinds that are supported as a second factor credential
  };
  challenge: string; // random value used to uniquely identify the request
  pubKeyCredParam: Array<{
    type: 'public-key';
    alg: number; // integer that identifies a signing algorithm. Can be either `-7` for ES256 or `-257` for RS256
  }>;
  attestation: 'none' | 'indirect' | 'direct' | 'enterprise'; // identifies the information needed to verify the user's signing certificate
  excludeCredentials: Array<{
    type: 'public-key';
    id: string; // ID that can identify the credential on the authenticator
    transports: string; // types of transports that are not allowed
  }>;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform'; // optional value indicating the type of authenticators that are supported
    residentKey: 'required' | 'preferred' | 'discouraged'; // value indicating whether or not the authenticator should use resident keys
    requireResidentKey: boolean; // value indicating if the authenticator needs to support resident keys
    userVerification: 'required' | 'preferred' | 'discouraged'; // value indicating if the user should be prompted for a second factor
  };
  allowedRecoveryCredentials: DfnsRecoveryCredentialInfo[]; // the list of recovery credentials that can be used to recover the user
}

// Create Delegated Recovery Challenge Request (POST /auth/recover/user/delegated)
export interface DfnsDelegatedRecoveryRequest {
  username: string; // Email address of the user
  credentialId: string; // The credential ID of the user's recovery credential
}

// Create Delegated Recovery Challenge Response (POST /auth/recover/user/delegated)
export type DfnsDelegatedRecoveryResponse = DfnsCreateRecoveryResponse;

// Recovery Credential Assertion
export interface DfnsRecoveryCredentialAssertion {
  credId: string; // base64url encoded id of the recovery credential
  clientData: string; // base64url encoded client data
  signature: string; // base64url encoded signature generated by signing the clientData JSON string object
}

// Recovery Object
export interface DfnsRecoveryObject {
  kind: 'RecoveryKey'; // will always be RecoveryKey
  credentialAssertion: DfnsRecoveryCredentialAssertion; // a signature of the user's new credentials, using the user's recovery credential
}

// New Credentials for Recovery
export interface DfnsNewCredentials {
  firstFactorCredential: DfnsCredentialInfo; // new first factor credential that the user is registering
  secondFactorCredential?: DfnsCredentialInfo; // Optional new second factor credential that the user is registering
  recoveryCredential?: DfnsCredentialInfo; // Optional new recovery credential that can be used to recover the user's account
}

// Recover User Request (POST /auth/recover/user)
export interface DfnsRecoverUserRequest {
  recovery: DfnsRecoveryObject; // a signature of the user's new credentials, using the user's recovery credential, that proves the user initiated the recovery request
  newCredentials: DfnsNewCredentials; // the new credentials being assigned to the user
}

// Recover User Response (POST /auth/recover/user)
export interface DfnsRecoverUserResponse {
  credential: {
    uuid: string;
    kind: DfnsCredentialKind;
    name: string;
  };
  user: {
    id: string;
    username: string;
    orgId: string;
  };
}


