/**
 * DFNS Credential Manager
 * 
 * Manages WebAuthn credentials and provides credential provider implementation
 */

import type {
  DfnsCredential,
  DfnsCredentialRegistrationRequest,
  DfnsApiCredential,
  DfnsCredentialProvider,
} from '../../../types/dfns';
import { DfnsClient } from '../client';
import { WEBAUTHN_CONFIG } from '../config';
import { DfnsCredentialError, DfnsError } from '../../../types/dfns/errors';

export class DfnsCredentialManager implements DfnsCredentialProvider {
  constructor(
    private dfnsClient: DfnsClient,
    private userId?: string
  ) {}

  /**
   * Get stored credential for API operations
   */
  async getCredential(): Promise<DfnsApiCredential> {
    try {
      const stored = this.getStoredCredential();
      if (!stored) {
        throw new DfnsCredentialError('No stored credential found');
      }
      return stored;
    } catch (error) {
      throw new DfnsCredentialError(`Failed to get credential: ${error}`);
    }
  }

  /**
   * Refresh stored credential
   */
  async refreshCredential(): Promise<DfnsApiCredential> {
    // For now, just return the existing credential
    // In a full implementation, this would handle credential rotation
    return this.getCredential();
  }

  /**
   * Register a new WebAuthn credential
   */
  async registerWebAuthnCredential(
    challenge: string,
    user: {
      id: string;
      name: string;
      displayName: string;
    },
    name?: string
  ): Promise<DfnsCredential> {
    try {
      // Create WebAuthn credential options
      const credentialOptions: PublicKeyCredentialCreationOptions = {
        challenge: this.base64ToArrayBuffer(challenge),
        rp: {
          id: WEBAUTHN_CONFIG.rpId,
          name: WEBAUTHN_CONFIG.rpName,
        },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.name,
          displayName: user.displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: WEBAUTHN_CONFIG.timeout,
        attestation: WEBAUTHN_CONFIG.attestation,
        authenticatorSelection: {
          authenticatorAttachment: WEBAUTHN_CONFIG.authenticatorAttachment,
          userVerification: WEBAUTHN_CONFIG.userVerification,
          residentKey: WEBAUTHN_CONFIG.residentKey,
          requireResidentKey: true,
        },
        excludeCredentials: [],
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: credentialOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new DfnsCredentialError('Failed to create WebAuthn credential');
      }

      // Process the credential response
      const response = credential.response as AuthenticatorAttestationResponse;
      
      const registrationRequest: DfnsCredentialRegistrationRequest = {
        kind: 'Fido2',
        name: name || `Credential ${Date.now()}`,
        credentialInfo: {
          credId: this.arrayBufferToBase64(credential.rawId),
          clientData: this.arrayBufferToBase64(response.clientDataJSON),
          attestationData: this.arrayBufferToBase64(response.attestationObject),
          algorithm: 'ES256', // Default to ES256
        },
      };

      // Register the credential with DFNS
      const dfnsCredential = await this.registerCredentialWithDfns(registrationRequest);
      
      // Store credential locally for future use
      this.storeCredential({
        credentialId: dfnsCredential.credential_id,
        privateKey: '', // WebAuthn doesn't expose private keys
        publicKey: dfnsCredential.public_key,
        algorithm: dfnsCredential.algorithm,
      });

      return dfnsCredential;
    } catch (error) {
      throw new DfnsCredentialError(`WebAuthn registration failed: ${error}`);
    }
  }

  /**
   * Authenticate with existing WebAuthn credential
   */
  async authenticateWithWebAuthn(
    challenge: string,
    allowedCredentials: Array<{
      type: 'public-key';
      id: string;
      transports?: string[];
    }>
  ): Promise<AuthenticatorAssertionResponse> {
    try {
      const credentialOptions: PublicKeyCredentialRequestOptions = {
        challenge: this.base64ToArrayBuffer(challenge),
        rpId: WEBAUTHN_CONFIG.rpId,
        timeout: WEBAUTHN_CONFIG.timeout,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        allowCredentials: allowedCredentials.map(cred => ({
          type: cred.type,
          id: this.base64ToArrayBuffer(cred.id),
          transports: cred.transports as AuthenticatorTransport[],
        })),
      };

      const assertion = await navigator.credentials.get({
        publicKey: credentialOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new DfnsCredentialError('WebAuthn authentication failed');
      }

      return assertion.response as AuthenticatorAssertionResponse;
    } catch (error) {
      throw new DfnsCredentialError(`WebAuthn authentication failed: ${error}`);
    }
  }

  /**
   * Register credential with DFNS API
   */
  private async registerCredentialWithDfns(
    request: DfnsCredentialRegistrationRequest
  ): Promise<DfnsCredential> {
    try {
      const response = await this.dfnsClient.makeRequest<DfnsCredential>(
        'POST',
        '/auth/credentials',
        request
      );
      return response;
    } catch (error) {
      throw new DfnsCredentialError(`Failed to register credential with DFNS: ${error}`);
    }
  }

  /**
   * List user's credentials
   */
  async listCredentials(): Promise<DfnsCredential[]> {
    try {
      const response = await this.dfnsClient.makeRequest<{ items: DfnsCredential[] }>(
        'GET',
        '/auth/credentials'
      );
      return response.items;
    } catch (error) {
      throw new DfnsCredentialError(`Failed to list credentials: ${error}`);
    }
  }

  /**
   * Delete a credential
   */
  async deleteCredential(credentialId: string): Promise<void> {
    try {
      await this.dfnsClient.makeRequest<void>(
        'DELETE',
        `/auth/credentials/${credentialId}`
      );
      
      // Remove from local storage if it's the stored credential
      const stored = this.getStoredCredential();
      if (stored && stored.credentialId === credentialId) {
        this.clearStoredCredential();
      }
    } catch (error) {
      throw new DfnsCredentialError(`Failed to delete credential: ${error}`);
    }
  }

  /**
   * Store credential in local storage
   */
  private storeCredential(credential: DfnsApiCredential): void {
    const key = this.getStorageKey();
    localStorage.setItem(key, JSON.stringify(credential));
  }

  /**
   * Get stored credential from local storage
   */
  private getStoredCredential(): DfnsApiCredential | null {
    try {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to parse stored credential:', error);
      return null;
    }
  }

  /**
   * Clear stored credential
   */
  private clearStoredCredential(): void {
    const key = this.getStorageKey();
    localStorage.removeItem(key);
  }

  /**
   * Get storage key for credentials
   */
  private getStorageKey(): string {
    const base = 'dfns_credential';
    return this.userId ? `${base}_${this.userId}` : base;
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Check if WebAuthn is supported
   */
  static isWebAuthnSupported(): boolean {
    return !!(navigator.credentials && window.PublicKeyCredential);
  }
}
