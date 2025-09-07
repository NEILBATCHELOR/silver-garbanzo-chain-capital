/**
 * DFNS User Action Signing Service - Full API Compliance Implementation
 * 
 * This service implements the complete DFNS User Action Signing API workflow
 * as specified in the DFNS documentation, addressing all gaps identified in
 * the implementation analysis.
 */

import {
  UserActionChallengeRequest,
  UserActionChallengeResponse,
  CompleteUserActionRequest,
  UserActionResponse,
  CredentialAssertion,
  KeyCredentialClientData,
  Fido2CredentialClientData,
  PasswordProtectedKeyClientData,
  UserActionSigningService,
  UserActionContext,
  UserActionResult,
  UserActionError
} from '@/types/dfns/user-actions';
import { DFNS_CONFIG } from './config';

/**
 * DFNS-compliant User Action Signing implementation
 */
export class DfnsUserActionSigning implements UserActionSigningService {
  private baseUrl: string;
  private appId: string;

  constructor(config = DFNS_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.appId = config.appId;
  }

  // ===== Core DFNS API Implementation =====

  /**
   * Step 1: Initialize user action challenge using DFNS API
   * POST /auth/action/init
   */
  async initUserActionChallenge(request: UserActionChallengeRequest): Promise<UserActionChallengeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/action/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DFNS-APPID': this.appId
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Challenge initialization failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as UserActionChallengeResponse;
    } catch (error) {
      throw this.createUserActionError(
        'CHALLENGE_FAILED',
        `Failed to initialize user action challenge: ${(error as Error).message}`,
        { request }
      );
    }
  }

  /**
   * Step 2: Complete user action signing using DFNS API
   * POST /auth/action
   */
  async completeUserActionSigning(request: CompleteUserActionRequest): Promise<UserActionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DFNS-APPID': this.appId
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`User action signing failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as UserActionResponse;
    } catch (error) {
      throw this.createUserActionError(
        'SIGNING_FAILED',
        `Failed to complete user action signing: ${(error as Error).message}`,
        { request }
      );
    }
  }

  // ===== Client Data Generation =====

  /**
   * Generate proper client data format for different credential types
   * following DFNS specifications
   */
  generateClientData(
    credentialKind: "Fido2" | "Key" | "PasswordProtectedKey",
    challenge: string,
    origin: string
  ): KeyCredentialClientData | Fido2CredentialClientData | PasswordProtectedKeyClientData {
    switch (credentialKind) {
      case 'Key':
        return {
          type: 'key.get',
          challenge,
          origin,
          crossOrigin: false
        };
      
      case 'Fido2':
        return {
          type: 'webauthn.get',
          challenge,
          origin,
          crossOrigin: false // Can be true for cross-origin
        };
      
      case 'PasswordProtectedKey':
        return {
          type: 'passwordProtectedKey.get',
          challenge,
          origin,
          crossOrigin: false
        };
      
      default:
        throw new Error(`Unsupported credential kind: ${credentialKind}`);
    }
  }

  /**
   * Create X-DFNS-USERACTION header value
   */
  createUserActionHeader(userActionToken: string): string {
    return userActionToken;
  }

  // ===== High-level Integration Methods =====

  /**
   * Complete user action signing workflow for WebAuthn credentials
   */
  async signUserActionWithWebAuthn(
    context: UserActionContext
  ): Promise<UserActionResult> {
    try {
      // Step 1: Initialize challenge
      const challengeRequest: UserActionChallengeRequest = {
        userActionPayload: JSON.stringify(context.payload || {}),
        userActionHttpMethod: context.method,
        userActionHttpPath: context.endpoint,
        userActionServerKind: 'Api'
      };

      const challenge = await this.initUserActionChallenge(challengeRequest);

      // Step 2: Find WebAuthn credential
      const webauthnCredentials = challenge.allowCredentials.webauthn;
      const credential = webauthnCredentials.find(cred => cred.id === context.credentialId);
      
      if (!credential) {
        throw new Error('WebAuthn credential not found in allowed credentials');
      }

      // Step 3: Perform WebAuthn signing
      const assertion = await this.performWebAuthnSigning(challenge.challenge, credential);

      // Step 4: Complete user action signing
      const completeRequest: CompleteUserActionRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        firstFactor: {
          kind: 'Fido2',
          credentialAssertion: assertion
        }
      };

      const result = await this.completeUserActionSigning(completeRequest);

      return {
        success: true,
        userActionToken: result.userAction,
        headers: {
          'X-DFNS-USERACTION': this.createUserActionHeader(result.userAction)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WEBAUTHN_SIGNING_FAILED',
          message: (error as Error).message,
          details: error
        }
      };
    }
  }

  /**
   * Complete user action signing workflow for private key credentials
   */
  async signUserActionWithPrivateKey(
    context: UserActionContext,
    privateKey: string
  ): Promise<UserActionResult> {
    try {
      // Step 1: Initialize challenge
      const challengeRequest: UserActionChallengeRequest = {
        userActionPayload: JSON.stringify(context.payload || {}),
        userActionHttpMethod: context.method,
        userActionHttpPath: context.endpoint,
        userActionServerKind: 'Api'
      };

      const challenge = await this.initUserActionChallenge(challengeRequest);

      // Step 2: Find key credential
      const keyCredentials = challenge.allowCredentials.key;
      const credential = keyCredentials.find(cred => cred.id === context.credentialId);
      
      if (!credential) {
        throw new Error('Key credential not found in allowed credentials');
      }

      // Step 3: Generate client data
      const clientData = this.generateClientData(
        'Key',
        challenge.challenge,
        window.location.origin
      );

      // Step 4: Sign challenge with private key
      const signature = await this.signChallengeWithPrivateKey(
        challenge.challenge,
        privateKey
      );

      // Step 5: Create credential assertion
      const assertion: CredentialAssertion = {
        credId: context.credentialId,
        clientData: this.base64UrlEncode(JSON.stringify(clientData)),
        signature: this.base64UrlEncode(signature)
      };

      // Step 6: Complete user action signing
      const completeRequest: CompleteUserActionRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        firstFactor: {
          kind: 'Key',
          credentialAssertion: assertion
        }
      };

      const result = await this.completeUserActionSigning(completeRequest);

      return {
        success: true,
        userActionToken: result.userAction,
        headers: {
          'X-DFNS-USERACTION': this.createUserActionHeader(result.userAction)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'KEY_SIGNING_FAILED',
          message: (error as Error).message,
          details: error
        }
      };
    }
  }

  // ===== Private Implementation Methods =====

  /**
   * Perform WebAuthn signing for user action
   */
  private async performWebAuthnSigning(
    challenge: string,
    credential: { id: string; type: string; transports?: string[] }
  ): Promise<CredentialAssertion> {
    if (!navigator.credentials) {
      throw new Error('WebAuthn not supported in this browser');
    }

    try {
      const getOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: this.base64UrlDecode(challenge),
          allowCredentials: [{
            id: this.base64UrlDecode(credential.id),
            type: 'public-key' as const,
            transports: credential.transports as AuthenticatorTransport[]
          }],
          userVerification: 'required',
          timeout: 60000
        }
      };

      const assertion = await navigator.credentials.get(getOptions) as PublicKeyCredential;
      
      if (!assertion) {
        throw new Error('WebAuthn authentication failed');
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      return {
        credId: credential.id,
        clientData: this.arrayBufferToBase64Url(response.clientDataJSON),
        signature: this.arrayBufferToBase64Url(response.signature)
      };
    } catch (error) {
      throw new Error(`WebAuthn signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Sign challenge with private key using Web Crypto API
   */
  private async signChallengeWithPrivateKey(
    challenge: string,
    privateKey: string
  ): Promise<string> {
    try {
      // Import private key
      const keyBuffer = this.base64ToArrayBuffer(privateKey);
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );

      // Sign challenge
      const challengeBuffer = new TextEncoder().encode(challenge);
      const signatureBuffer = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        cryptoKey,
        challengeBuffer
      );

      return this.arrayBufferToBase64Url(signatureBuffer);
    } catch (error) {
      throw new Error(`Private key signing failed: ${(error as Error).message}`);
    }
  }

  // ===== Utility Methods =====

  /**
   * Create standardized user action error
   */
  private createUserActionError(
    code: UserActionError['code'],
    message: string,
    details?: any
  ): UserActionError {
    return {
      code,
      message,
      details
    };
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(data: string): string {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(data: string): ArrayBuffer {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to Base64 URL
   */
  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return this.base64UrlEncode(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ===== Export =====
export default DfnsUserActionSigning;
