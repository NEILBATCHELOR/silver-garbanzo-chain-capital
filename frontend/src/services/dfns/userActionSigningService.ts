/**
 * DFNS User Action Signing Service
 * 
 * Handles the three-step User Action Signing flow required for all mutating operations:
 * 1. Initialize challenge (/auth/action/init)
 * 2. Sign challenge with credential
 * 3. Complete signing (/auth/action)
 * 
 * Based on current DFNS API: https://docs.dfns.co/d/api-docs/authentication/user-action-signing
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError, DfnsAuthenticationError } from '../../types/dfns/errors';

// Current DFNS API Types based on documentation
export interface UserActionSigningChallenge {
  supportedCredentialKinds: Array<{
    kind: 'Fido2' | 'Key';
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
      transports?: string;
    }>;
  };
}

export interface UserActionSigningRequest {
  userActionPayload: string; // JSON encoded body
  userActionHttpMethod: 'POST' | 'PUT' | 'DELETE' | 'GET';
  userActionHttpPath: string;
  userActionServerKind?: 'Api';
}

export interface CredentialAssertion {
  credId: string;
  clientData: string;
  signature: string;
}

export interface WebAuthnCredentialAssertion extends CredentialAssertion {
  authenticatorData: string;
  userHandle: string;
}

export interface UserActionSigningCompletion {
  challengeIdentifier: string;
  firstFactor: {
    kind: 'Fido2' | 'Key' | 'PasswordProtectedKey';
    credentialAssertion: CredentialAssertion | WebAuthnCredentialAssertion;
  };
  secondFactor?: {
    kind: 'Fido2' | 'Key' | 'PasswordProtectedKey';
    credentialAssertion: CredentialAssertion | WebAuthnCredentialAssertion;
  };
}

export interface UserActionSigningResponse {
  userAction: string; // Token to use in X-DFNS-USERACTION header
}

// Client Data format for key-based signing
export interface ClientData {
  type: 'key.get';
  challenge: string;
  origin?: string;
  crossOrigin?: boolean;
}

export class DfnsUserActionSigningService {
  constructor(private workingClient: WorkingDfnsClient) {}

  /**
   * Step 1: Initialize User Action Signing Challenge
   * Creates a challenge for the user to sign before performing a mutating operation
   */
  async initializeChallenge(request: UserActionSigningRequest): Promise<UserActionSigningChallenge> {
    try {
      console.log('🔐 Initializing User Action Signing challenge:', {
        method: request.userActionHttpMethod,
        path: request.userActionHttpPath
      });

      const challenge = await this.workingClient.makeRequest<UserActionSigningChallenge>(
        'POST',
        '/auth/action/init',
        request
      );

      console.log('✅ User Action Signing challenge initialized:', {
        challengeId: challenge.challengeIdentifier,
        supportedKinds: challenge.supportedCredentialKinds.map(k => k.kind),
        keyCredentials: challenge.allowCredentials.key.length,
        webauthnCredentials: challenge.allowCredentials.webauthn.length
      });

      return challenge;
    } catch (error) {
      console.error('❌ Failed to initialize User Action Signing challenge:', error);
      throw new DfnsError(
        `Failed to initialize User Action Signing challenge: ${error}`,
        'USER_ACTION_INIT_FAILED'
      );
    }
  }

  /**
   * Step 2 & 3: Sign Challenge and Complete User Action Signing
   * For key-based credentials, this handles both signing the challenge and completing the flow
   */
  async completeKeySigning(
    challenge: UserActionSigningChallenge,
    privateKey: string,
    credentialId: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<UserActionSigningResponse> {
    try {
      console.log('🔑 Completing User Action Signing with key credential');

      // Sign the challenge using the private key
      const signature = await this.signChallengeWithKey(
        challenge.challenge,
        privateKey,
        algorithm
      );

      // Complete the User Action Signing
      const completion: UserActionSigningCompletion = {
        challengeIdentifier: challenge.challengeIdentifier,
        firstFactor: {
          kind: 'Key',
          credentialAssertion: {
            credId: credentialId,
            clientData: signature.clientData,
            signature: signature.signature
          }
        }
      };

      const response = await this.workingClient.makeRequest<UserActionSigningResponse>(
        'POST',
        '/auth/action',
        completion
      );

      console.log('✅ User Action Signing completed successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to complete User Action Signing:', error);
      throw new DfnsError(
        `Failed to complete User Action Signing: ${error}`,
        'USER_ACTION_COMPLETE_FAILED'
      );
    }
  }

  /**
   * Step 3: Complete User Action Signing (for pre-signed challenges)
   * Use this when you've already signed the challenge externally
   */
  async completeChallenge(completion: UserActionSigningCompletion): Promise<UserActionSigningResponse> {
    try {
      console.log('🔐 Completing User Action Signing challenge');

      const response = await this.workingClient.makeRequest<UserActionSigningResponse>(
        'POST',
        '/auth/action',
        completion
      );

      console.log('✅ User Action Signing challenge completed');
      return response;
    } catch (error) {
      console.error('❌ Failed to complete User Action Signing challenge:', error);
      throw new DfnsError(
        `Failed to complete User Action Signing challenge: ${error}`,
        'USER_ACTION_COMPLETE_FAILED'
      );
    }
  }

  /**
   * Sign challenge with private key (Key credential type)
   * Based on DFNS documentation: https://docs.dfns.co/d/advanced-topics/authentication/request-signing
   */
  private async signChallengeWithKey(
    challenge: string,
    privateKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA'
  ): Promise<{ clientData: string; signature: string }> {
    try {
      // Create client data object according to DFNS spec
      const clientData: ClientData = {
        type: 'key.get',
        challenge,
        origin: window?.location?.origin || 'https://localhost:3000',
        crossOrigin: false
      };

      const clientDataString = JSON.stringify(clientData);
      const clientDataBuffer = new TextEncoder().encode(clientDataString);

      // Import the private key
      let keyAlgorithm: AlgorithmIdentifier;
      switch (algorithm) {
        case 'ECDSA':
          keyAlgorithm = { name: 'ECDSA', namedCurve: 'P-256' } as EcKeyImportParams;
          break;
        case 'EDDSA':
          keyAlgorithm = { name: 'Ed25519' };
          break;
        case 'RSA':
          keyAlgorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as RsaHashedImportParams;
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      // Convert PEM to key material
      const keyMaterial = this.pemToArrayBuffer(privateKeyPem);
      
      const cryptoKey = await window.crypto.subtle.importKey(
        'pkcs8',
        keyMaterial,
        keyAlgorithm,
        false,
        ['sign']
      );

      // Sign the client data
      let signatureBuffer: ArrayBuffer;
      if (algorithm === 'ECDSA') {
        signatureBuffer = await window.crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          cryptoKey,
          clientDataBuffer
        );
      } else if (algorithm === 'EDDSA') {
        signatureBuffer = await window.crypto.subtle.sign(
          'Ed25519',
          cryptoKey,
          clientDataBuffer
        );
      } else {
        signatureBuffer = await window.crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          cryptoKey,
          clientDataBuffer
        );
      }

      // Convert to base64url encoding
      const clientDataBase64url = this.arrayBufferToBase64Url(clientDataBuffer.buffer as ArrayBuffer);
      const signatureBase64url = this.arrayBufferToBase64Url(signatureBuffer);

      return {
        clientData: clientDataBase64url,
        signature: signatureBase64url
      };
    } catch (error) {
      throw new DfnsError(
        `Failed to sign challenge with ${algorithm} key: ${error}`,
        'CHALLENGE_SIGNING_FAILED'
      );
    }
  }

  /**
   * Convenience method: Full User Action Signing flow for key-based credentials
   * Combines initialize + sign + complete in one call
   */
  async signUserAction(
    request: UserActionSigningRequest,
    privateKey: string,
    credentialId: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<string> {
    try {
      console.log('🔐 Starting full User Action Signing flow:', {
        method: request.userActionHttpMethod,
        path: request.userActionHttpPath
      });

      // Step 1: Initialize challenge
      const challenge = await this.initializeChallenge(request);

      // Verify we have key credentials available
      if (!challenge.allowCredentials.key.length) {
        throw new DfnsError(
          'No key credentials available for User Action Signing',
          'NO_KEY_CREDENTIALS'
        );
      }

      // Step 2 & 3: Sign and complete
      const response = await this.completeKeySigning(
        challenge,
        privateKey,
        credentialId,
        algorithm
      );

      console.log('✅ Full User Action Signing flow completed');
      return response.userAction;
    } catch (error) {
      console.error('❌ User Action Signing flow failed:', error);
      throw error instanceof DfnsError ? error : new DfnsError(
        `User Action Signing flow failed: ${error}`,
        'USER_ACTION_FLOW_FAILED'
      );
    }
  }

  // Utility methods for cryptographic operations

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const pemContents = pem
      .replace(/-----BEGIN[^-]+-----/, '')
      .replace(/-----END[^-]+-----/, '')
      .replace(/\s/g, '');
    
    const binaryString = window.atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
