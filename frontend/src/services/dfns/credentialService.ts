/**
 * DFNS Credential Service
 * 
 * Handles DFNS credential management:
 * - WebAuthn (Fido2) credentials
 * - Key credentials  
 * - Password Protected Key credentials
 * - Credential lifecycle management
 * 
 * Based on: https://docs.dfns.co/d/advanced-topics/authentication/credentials
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// Current DFNS API credential types
export type CredentialKind = 'Fido2' | 'Key' | 'PasswordProtectedKey' | 'RecoveryKey';
export type CredentialStatus = 'Active' | 'Inactive' | 'Revoked';

export interface DfnsCredential {
  id: string;
  kind: CredentialKind;
  name: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  publicKey?: string;
  algorithm?: 'ECDSA' | 'EDDSA' | 'RSA';
  encryptedPrivateKey?: string; // For PasswordProtectedKey
  attestationData?: any; // For Fido2 credentials
}

export interface CreateCredentialRequest {
  kind: CredentialKind;
  name: string;
  publicKey?: string; // Required for Key/PasswordProtectedKey
  algorithm?: 'ECDSA' | 'EDDSA' | 'RSA'; // For Key credentials
  encryptedPrivateKey?: string; // For PasswordProtectedKey
  attestation?: PublicKeyCredential; // For WebAuthn credentials
}

export interface CreateCredentialChallengeRequest {
  kind: CredentialKind;
  name: string;
  publicKey?: string;
  algorithm?: 'ECDSA' | 'EDDSA' | 'RSA';
}

export interface CreateCredentialChallengeResponse {
  challengeIdentifier: string;
  challenge: string;
  publicKey: {
    challenge: string;
    rp: {
      name: string;
      id: string;
    };
    user: {
      id: string;
      name: string;
      displayName: string;
    };
    pubKeyCredParams: Array<{
      type: 'public-key';
      alg: number;
    }>;
    timeout?: number;
    excludeCredentials?: PublicKeyCredentialDescriptor[];
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    attestation?: AttestationConveyancePreference;
  };
}

export interface CompleteCredentialCreationRequest {
  challengeIdentifier: string;
  credentialAssertion?: {
    id: string;
    rawId: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
    };
    type: 'public-key';
  };
}

export class DfnsCredentialService {
  constructor(private workingClient: WorkingDfnsClient) {}

  /**
   * List all credentials for the current user
   */
  async listCredentials(): Promise<DfnsCredential[]> {
    try {
      console.log('📋 Listing DFNS credentials...');
      
      const response = await this.workingClient.makeRequest<{ items: DfnsCredential[] }>(
        'GET',
        '/auth/credentials'
      );

      console.log(`✅ Found ${response.items.length} credentials`);
      return response.items;
    } catch (error) {
      console.error('❌ Failed to list credentials:', error);
      throw new DfnsError(
        `Failed to list credentials: ${error}`,
        'CREDENTIAL_LIST_FAILED'
      );
    }
  }

  /**
   * Get specific credential by ID
   */
  async getCredential(credentialId: string): Promise<DfnsCredential> {
    try {
      console.log('🔍 Getting credential:', credentialId);
      
      const credential = await this.workingClient.makeRequest<DfnsCredential>(
        'GET',
        `/auth/credentials/${credentialId}`
      );

      console.log('✅ Retrieved credential successfully');
      return credential;
    } catch (error) {
      console.error('❌ Failed to get credential:', error);
      throw new DfnsError(
        `Failed to get credential ${credentialId}: ${error}`,
        'CREDENTIAL_GET_FAILED'
      );
    }
  }

  /**
   * Create a new Key credential (direct creation)
   * For programmatic key creation with provided public key
   */
  async createKeyCredential(
    name: string,
    publicKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<DfnsCredential> {
    try {
      console.log('🔑 Creating Key credential:', { name, algorithm });
      
      const request: CreateCredentialRequest = {
        kind: 'Key',
        name,
        publicKey: publicKeyPem,
        algorithm
      };

      const credential = await this.workingClient.makeRequest<DfnsCredential>(
        'POST',
        '/auth/credentials',
        request
      );

      console.log('✅ Key credential created successfully:', credential.id);
      return credential;
    } catch (error) {
      console.error('❌ Failed to create Key credential:', error);
      throw new DfnsError(
        `Failed to create Key credential: ${error}`,
        'KEY_CREDENTIAL_CREATE_FAILED'
      );
    }
  }

  /**
   * Create WebAuthn (Fido2) credential challenge
   * Step 1 of WebAuthn credential creation
   */
  async createWebAuthnCredentialChallenge(name: string): Promise<CreateCredentialChallengeResponse> {
    try {
      console.log('🔐 Creating WebAuthn credential challenge:', name);
      
      const request: CreateCredentialChallengeRequest = {
        kind: 'Fido2',
        name
      };

      const challenge = await this.workingClient.makeRequest<CreateCredentialChallengeResponse>(
        'POST',
        '/auth/credentials/init',
        request
      );

      console.log('✅ WebAuthn credential challenge created');
      return challenge;
    } catch (error) {
      console.error('❌ Failed to create WebAuthn credential challenge:', error);
      throw new DfnsError(
        `Failed to create WebAuthn credential challenge: ${error}`,
        'WEBAUTHN_CHALLENGE_FAILED'
      );
    }
  }

  /**
   * Complete WebAuthn credential creation
   * Step 2 of WebAuthn credential creation
   */
  async completeWebAuthnCredentialCreation(
    challengeIdentifier: string,
    attestation: PublicKeyCredential
  ): Promise<DfnsCredential> {
    try {
      console.log('🔐 Completing WebAuthn credential creation');
      
      // Convert WebAuthn response to DFNS format
      const response = attestation.response as AuthenticatorAttestationResponse;
      const credentialAssertion = {
        id: attestation.id,
        rawId: this.arrayBufferToBase64Url(attestation.rawId),
        response: {
          attestationObject: this.arrayBufferToBase64Url(response.attestationObject),
          clientDataJSON: this.arrayBufferToBase64Url(response.clientDataJSON)
        },
        type: attestation.type as "public-key"
      };

      const request: CompleteCredentialCreationRequest = {
        challengeIdentifier,
        credentialAssertion
      };

      const credential = await this.workingClient.makeRequest<DfnsCredential>(
        'POST',
        '/auth/credentials',
        request
      );

      console.log('✅ WebAuthn credential created successfully:', credential.id);
      return credential;
    } catch (error) {
      console.error('❌ Failed to complete WebAuthn credential creation:', error);
      throw new DfnsError(
        `Failed to complete WebAuthn credential creation: ${error}`,
        'WEBAUTHN_CREATE_FAILED'
      );
    }
  }

  /**
   * Create WebAuthn credential (full flow)
   * Combines challenge creation and completion
   */
  async createWebAuthnCredential(name: string): Promise<DfnsCredential> {
    try {
      console.log('🔐 Starting WebAuthn credential creation flow:', name);
      
      // Step 1: Create challenge
      const challenge = await this.createWebAuthnCredentialChallenge(name);
      
      // Step 2: Use WebAuthn API to create credential
      // Convert challenge string to BufferSource for WebAuthn API
      const publicKeyOptions = {
        ...challenge.publicKey,
        challenge: this.base64UrlToArrayBuffer(challenge.publicKey.challenge as string),
        user: {
          ...challenge.publicKey.user,
          id: new TextEncoder().encode(challenge.publicKey.user.id)
        }
      };
      
      const attestation = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;
      
      if (!attestation) {
        throw new Error('WebAuthn credential creation was cancelled or failed');
      }
      
      // Step 3: Complete creation
      const credential = await this.completeWebAuthnCredentialCreation(
        challenge.challengeIdentifier,
        attestation
      );
      
      console.log('✅ WebAuthn credential creation flow completed');
      return credential;
    } catch (error) {
      console.error('❌ WebAuthn credential creation flow failed:', error);
      throw new DfnsError(
        `WebAuthn credential creation failed: ${error}`,
        'WEBAUTHN_FLOW_FAILED'
      );
    }
  }

  /**
   * Activate a credential
   */
  async activateCredential(credentialId: string): Promise<DfnsCredential> {
    try {
      console.log('✅ Activating credential:', credentialId);
      
      const credential = await this.workingClient.makeRequest<DfnsCredential>(
        'PUT',
        `/auth/credentials/${credentialId}/activate`
      );

      console.log('✅ Credential activated successfully');
      return credential;
    } catch (error) {
      console.error('❌ Failed to activate credential:', error);
      throw new DfnsError(
        `Failed to activate credential ${credentialId}: ${error}`,
        'CREDENTIAL_ACTIVATE_FAILED'
      );
    }
  }

  /**
   * Deactivate a credential
   */
  async deactivateCredential(credentialId: string): Promise<DfnsCredential> {
    try {
      console.log('🚫 Deactivating credential:', credentialId);
      
      const credential = await this.workingClient.makeRequest<DfnsCredential>(
        'PUT',
        `/auth/credentials/${credentialId}/deactivate`
      );

      console.log('✅ Credential deactivated successfully');
      return credential;
    } catch (error) {
      console.error('❌ Failed to deactivate credential:', error);
      throw new DfnsError(
        `Failed to deactivate credential ${credentialId}: ${error}`,
        'CREDENTIAL_DEACTIVATE_FAILED'
      );
    }
  }

  /**
   * Check if WebAuthn is supported in the current environment
   */
  isWebAuthnSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.navigator &&
      window.navigator.credentials &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  }

  /**
   * Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false;
    }
    
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.warn('⚠️ Failed to check platform authenticator availability:', error);
      return false;
    }
  }

  /**
   * Get credential statistics
   */
  async getCredentialStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byKind: Record<CredentialKind, number>;
  }> {
    try {
      const credentials = await this.listCredentials();
      
      const stats = {
        total: credentials.length,
        active: credentials.filter(c => c.status === 'Active').length,
        inactive: credentials.filter(c => c.status !== 'Active').length,
        byKind: {} as Record<CredentialKind, number>
      };
      
      // Count by kind
      const kinds: CredentialKind[] = ['Fido2', 'Key', 'PasswordProtectedKey', 'RecoveryKey'];
      kinds.forEach(kind => {
        stats.byKind[kind] = credentials.filter(c => c.kind === kind).length;
      });
      
      return stats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get credential statistics: ${error}`,
        'CREDENTIAL_STATS_FAILED'
      );
    }
  }

  /**
   * Find credentials by kind
   */
  async findCredentialsByKind(kind: CredentialKind): Promise<DfnsCredential[]> {
    try {
      const credentials = await this.listCredentials();
      return credentials.filter(c => c.kind === kind);
    } catch (error) {
      throw new DfnsError(
        `Failed to find credentials by kind ${kind}: ${error}`,
        'CREDENTIAL_FILTER_FAILED'
      );
    }
  }

  /**
   * Find active credentials suitable for User Action Signing
   */
  async findActiveSigningCredentials(): Promise<DfnsCredential[]> {
    try {
      const credentials = await this.listCredentials();
      return credentials.filter(c => 
        c.status === 'Active' && 
        (c.kind === 'Key' || c.kind === 'Fido2')
      );
    } catch (error) {
      throw new DfnsError(
        `Failed to find active signing credentials: ${error}`,
        'SIGNING_CREDENTIALS_FAILED'
      );
    }
  }

  // Utility methods

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

  private base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return bytes.buffer;
  }
}
