/**
 * DFNS User Action Signing Types - Complete API compliance types
 * 
 * These types ensure full compliance with the DFNS User Action Signing API
 * as specified in the documentation analysis.
 */

// ===== Core User Action Challenge Types =====

export interface UserActionChallengeRequest {
  userActionPayload: string; // JSON stringified payload
  userActionHttpMethod: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  userActionHttpPath: string;
  userActionServerKind: 'Api';
}

export interface UserActionChallengeResponse {
  supportedCredentialKinds: Array<{
    kind: "Fido2" | "Key" | "PasswordProtectedKey";
    factor: "first" | "second" | "either";
    requiresSecondFactor: boolean;
  }>;
  challenge: string;
  challengeIdentifier: string;
  externalAuthenticationUrl?: string;
  allowCredentials: {
    key: Array<{
      type: string;
      id: string;
    }>;
    passwordProtectedKey: Array<{
      type: string;
      id: string;
      encryptedPrivateKey: string;
    }>;
    webauthn: Array<{
      type: string;
      id: string;
      transports?: string[];
    }>;
  };
}

// ===== User Action Completion Types =====

export interface CompleteUserActionRequest {
  challengeIdentifier: string;
  firstFactor: {
    kind: "Fido2" | "Key" | "PasswordProtectedKey";
    credentialAssertion: CredentialAssertion;
  };
  secondFactor?: {
    kind: "Fido2" | "Key" | "PasswordProtectedKey";
    credentialAssertion: CredentialAssertion;
  };
}

export interface CredentialAssertion {
  credId: string;
  clientData: string;
  signature: string;
}

export interface UserActionResponse {
  userAction: string; // Token for X-DFNS-USERACTION header
}

// ===== Client Data Types for Different Credential Kinds =====

export interface KeyCredentialClientData {
  type: 'key.get';
  challenge: string;
  origin: string;
  crossOrigin: false;
}

export interface Fido2CredentialClientData {
  type: 'webauthn.get';
  challenge: string;
  origin: string;
  crossOrigin: boolean;
}

export interface PasswordProtectedKeyClientData {
  type: 'passwordProtectedKey.get';
  challenge: string;
  origin: string;
  crossOrigin: false;
}

// ===== Enhanced User Action Service Interface =====

export interface UserActionSigningService {
  /**
   * Initialize user action challenge following DFNS API spec
   */
  initUserActionChallenge(request: UserActionChallengeRequest): Promise<UserActionChallengeResponse>;
  
  /**
   * Complete user action signing following DFNS API spec
   */
  completeUserActionSigning(request: CompleteUserActionRequest): Promise<UserActionResponse>;
  
  /**
   * Generate proper client data for different credential types
   */
  generateClientData(
    credentialKind: "Fido2" | "Key" | "PasswordProtectedKey",
    challenge: string,
    origin: string
  ): KeyCredentialClientData | Fido2CredentialClientData | PasswordProtectedKeyClientData;
  
  /**
   * Create X-DFNS-USERACTION header value
   */
  createUserActionHeader(userActionToken: string): string;
}

// ===== Integration Types =====

export interface UserActionContext {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload?: any;
  credentialKind: "Fido2" | "Key" | "PasswordProtectedKey";
  credentialId: string;
}

export interface UserActionResult {
  success: boolean;
  userActionToken?: string;
  headers?: Record<string, string>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ===== Error Types =====

export interface UserActionError {
  code: 'CHALLENGE_FAILED' | 'SIGNING_FAILED' | 'INVALID_CREDENTIAL' | 'EXPIRED_CHALLENGE';
  message: string;
  challengeIdentifier?: string;
  credentialId?: string;
  details?: any;
}
