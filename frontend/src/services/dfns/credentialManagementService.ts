/**
 * DFNS Credential Management Service
 * 
 * Implements current DFNS credential management API methods (2024)
 * Based on: https://docs.dfns.co/d/api-docs/authentication/credential-management/api-reference
 * 
 * Key Features:
 * - Current API endpoint compliance
 * - Regular flow and code-based flow support
 * - All credential kinds: Fido2, Key, PasswordProtectedKey, RecoveryKey
 * - Proper activate/deactivate using credentialUuid
 * - Enhanced error handling for token-based authentication
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================================
// CURRENT DFNS API TYPES (2024)
// ==============================================

export type CredentialKind = 'Fido2' | 'Key' | 'PasswordProtectedKey' | 'RecoveryKey';

export interface DfnsCredentialResponse {
  credentialId: string;
  credentialUuid: string;
  dateCreated: string;
  isActive: boolean;
  kind: CredentialKind;
  name: string;
  publicKey: string;
  relyingPartyId?: string;
  origin?: string;
}

export interface DfnsCredentialListResponse {
  items: DfnsCredentialResponse[];
}

// ==============================================
// CREDENTIAL CODE FLOW TYPES
// ==============================================

export interface CreateCredentialCodeRequest {
  expiration: string; // ISO-8601 date string, max 1 minute in future
}

export interface CreateCredentialCodeResponse {
  code: string;
  expiration: string;
}

// ==============================================
// CREDENTIAL CHALLENGE TYPES (REGULAR FLOW)
// ==============================================

export interface CreateCredentialChallengeRequest {
  kind: CredentialKind;
}

export interface CreateCredentialChallengeResponse {
  kind: CredentialKind;
  challengeIdentifier: string;
  challenge: string;
  rp?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParam?: Array<{
    type: 'public-key';
    alg: number;
  }>;
  attestation?: string;
  excludeCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: string[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

// ==============================================
// CREDENTIAL CREATION TYPES
// ==============================================

export interface CreateCredentialRequest {
  challengeIdentifier: string;
  credentialName: string;
  credentialKind: CredentialKind;
  credentialInfo: CredentialInfo;
  encryptedPrivateKey?: string; // For PasswordProtectedKey and RecoveryKey
}

export interface CredentialInfo {
  credId: string;
  clientData: string;
  attestationData: string;
}

// ==============================================
// CREDENTIAL ACTIVATION/DEACTIVATION TYPES
// ==============================================

export interface ActivateCredentialRequest {
  credentialUuid: string;
}

export interface DeactivateCredentialRequest {
  credentialUuid: string;
}

export interface CredentialOperationResponse {
  message: string;
}

export class DfnsCredentialManagementService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // ==============================================
  // CREDENTIAL LISTING (CURRENT API)
  // ==============================================

  /**
   * List all credentials for the current user
   * GET /auth/credentials
   */
  async listCredentials(): Promise<DfnsCredentialResponse[]> {
    try {
      console.log('📋 Listing DFNS credentials (current API)...');
      
      const response = await this.workingClient.makeRequest<DfnsCredentialListResponse>(
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

  // ==============================================
  // CREDENTIAL CODE FLOW (CURRENT API)
  // ==============================================

  /**
   * Create a credential code for code-based credential creation
   * POST /auth/credentials/code
   */
  async createCredentialCode(expirationMinutes: number = 1): Promise<CreateCredentialCodeResponse> {
    try {
      console.log('🔑 Creating credential code...');
      
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + Math.min(expirationMinutes, 1)); // Max 1 minute
      
      const request: CreateCredentialCodeRequest = {
        expiration: expiration.toISOString()
      };

      const response = await this.workingClient.makeRequest<CreateCredentialCodeResponse>(
        'POST',
        '/auth/credentials/code',
        request
      );

      console.log('✅ Credential code created:', response.code);
      return response;
    } catch (error) {
      console.error('❌ Failed to create credential code:', error);
      throw new DfnsError(
        `Failed to create credential code: ${error}`,
        'CREDENTIAL_CODE_CREATE_FAILED'
      );
    }
  }

  /**
   * Create credential challenge with code
   * POST /auth/credentials/code/init
   */
  async createCredentialChallengeWithCode(
    kind: CredentialKind,
    code: string
  ): Promise<CreateCredentialChallengeResponse> {
    try {
      console.log('🔐 Creating credential challenge with code:', { kind, code });
      
      const request = {
        kind,
        code
      };

      const challenge = await this.workingClient.makeRequest<CreateCredentialChallengeResponse>(
        'POST',
        '/auth/credentials/code/init',
        request
      );

      console.log('✅ Credential challenge with code created');
      return challenge;
    } catch (error) {
      console.error('❌ Failed to create credential challenge with code:', error);
      throw new DfnsError(
        `Failed to create credential challenge with code: ${error}`,
        'CREDENTIAL_CHALLENGE_CODE_FAILED'
      );
    }
  }

  /**
   * Create credential with code (bypass authentication)
   * POST /auth/credentials/code/verify
   */
  async createCredentialWithCode(
    challengeIdentifier: string,
    credentialName: string,
    credentialKind: CredentialKind,
    credentialInfo: CredentialInfo,
    encryptedPrivateKey?: string
  ): Promise<DfnsCredentialResponse> {
    try {
      console.log('🔑 Creating credential with code:', { credentialName, credentialKind });
      
      const request: CreateCredentialRequest = {
        challengeIdentifier,
        credentialName,
        credentialKind,
        credentialInfo,
        encryptedPrivateKey
      };

      const credential = await this.workingClient.makeRequest<DfnsCredentialResponse>(
        'POST',
        '/auth/credentials/code/verify',
        request
      );

      console.log('✅ Credential created with code:', credential.credentialUuid);
      return credential;
    } catch (error) {
      console.error('❌ Failed to create credential with code:', error);
      throw new DfnsError(
        `Failed to create credential with code: ${error}`,
        'CREDENTIAL_CREATE_CODE_FAILED'
      );
    }
  }

  // ==============================================
  // CREDENTIAL REGULAR FLOW (CURRENT API)
  // ==============================================

  /**
   * Create credential challenge (regular authenticated flow)
   * POST /auth/credentials/init
   */
  async createCredentialChallenge(kind: CredentialKind): Promise<CreateCredentialChallengeResponse> {
    try {
      console.log('🔐 Creating credential challenge (regular flow):', kind);
      
      const request: CreateCredentialChallengeRequest = {
        kind
      };

      const challenge = await this.workingClient.makeRequest<CreateCredentialChallengeResponse>(
        'POST',
        '/auth/credentials/init',
        request
      );

      console.log('✅ Credential challenge created');
      return challenge;
    } catch (error) {
      console.error('❌ Failed to create credential challenge:', error);
      throw new DfnsError(
        `Failed to create credential challenge: ${error}`,
        'CREDENTIAL_CHALLENGE_FAILED'
      );
    }
  }

  /**
   * Create credential (regular authenticated flow)
   * POST /auth/credentials
   */
  async createCredential(
    challengeIdentifier: string,
    credentialName: string,
    credentialKind: CredentialKind,
    credentialInfo: CredentialInfo,
    encryptedPrivateKey?: string
  ): Promise<DfnsCredentialResponse> {
    try {
      console.log('🔑 Creating credential (regular flow):', { credentialName, credentialKind });
      
      const request: CreateCredentialRequest = {
        challengeIdentifier,
        credentialName,
        credentialKind,
        credentialInfo,
        encryptedPrivateKey
      };

      const credential = await this.workingClient.makeRequest<DfnsCredentialResponse>(
        'POST',
        '/auth/credentials',
        request
      );

      console.log('✅ Credential created:', credential.credentialUuid);
      return credential;
    } catch (error) {
      console.error('❌ Failed to create credential:', error);
      throw new DfnsError(
        `Failed to create credential: ${error}`,
        'CREDENTIAL_CREATE_FAILED'
      );
    }
  }

  // ==============================================
  // CREDENTIAL ACTIVATION/DEACTIVATION (CURRENT API)
  // ==============================================

  /**
   * Activate a credential (current API)
   * PUT /auth/credentials/activate
   */
  async activateCredential(credentialUuid: string): Promise<CredentialOperationResponse> {
    try {
      console.log('✅ Activating credential:', credentialUuid);
      
      const request: ActivateCredentialRequest = {
        credentialUuid
      };

      const response = await this.workingClient.makeRequest<CredentialOperationResponse>(
        'PUT',
        '/auth/credentials/activate',
        request
      );

      console.log('✅ Credential activated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to activate credential:', error);
      throw new DfnsError(
        `Failed to activate credential ${credentialUuid}: ${error}`,
        'CREDENTIAL_ACTIVATE_FAILED'
      );
    }
  }

  /**
   * Deactivate a credential (current API)
   * PUT /auth/credentials/deactivate
   */
  async deactivateCredential(credentialUuid: string): Promise<CredentialOperationResponse> {
    try {
      console.log('🚫 Deactivating credential:', credentialUuid);
      
      const request: DeactivateCredentialRequest = {
        credentialUuid
      };

      const response = await this.workingClient.makeRequest<CredentialOperationResponse>(
        'PUT',
        '/auth/credentials/deactivate',
        request
      );

      console.log('✅ Credential deactivated successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to deactivate credential:', error);
      throw new DfnsError(
        `Failed to deactivate credential ${credentialUuid}: ${error}`,
        'CREDENTIAL_DEACTIVATE_FAILED'
      );
    }
  }

  // ==============================================
  // WEBAUTHN CREDENTIAL FLOWS (CURRENT API)
  // ==============================================

  /**
   * Create WebAuthn (Fido2) credential using current API flow
   */
  async createWebAuthnCredential(credentialName: string): Promise<DfnsCredentialResponse> {
    try {
      console.log('🔐 Starting WebAuthn credential creation (current API):', credentialName);
      
      // Step 1: Create challenge
      const challenge = await this.createCredentialChallenge('Fido2');
      
      if (!challenge.user || !challenge.rp || !challenge.pubKeyCredParam) {
        throw new Error('Invalid WebAuthn challenge response - missing required fields');
      }
      
      // Step 2: Use WebAuthn API to create credential
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: this.base64UrlToArrayBuffer(challenge.challenge),
        rp: challenge.rp,
        user: {
          id: this.stringToArrayBuffer(challenge.user.id),
          name: challenge.user.name,
          displayName: challenge.user.displayName
        },
        pubKeyCredParams: challenge.pubKeyCredParam,
        timeout: 60000,
        attestation: (challenge.attestation as AttestationConveyancePreference) || 'direct',
        excludeCredentials: challenge.excludeCredentials?.map(cred => ({
          type: cred.type as 'public-key',
          id: this.base64UrlToArrayBuffer(cred.id),
          transports: cred.transports as AuthenticatorTransport[]
        })),
        authenticatorSelection: challenge.authenticatorSelection as AuthenticatorSelectionCriteria
      };
      
      const attestation = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;
      
      if (!attestation) {
        throw new Error('WebAuthn credential creation was cancelled or failed');
      }
      
      // Step 3: Complete creation using current API format
      const response = attestation.response as AuthenticatorAttestationResponse;
      const credentialInfo: CredentialInfo = {
        credId: this.arrayBufferToBase64Url(attestation.rawId),
        clientData: this.arrayBufferToBase64Url(response.clientDataJSON),
        attestationData: this.arrayBufferToBase64Url(response.attestationObject)
      };
      
      const credential = await this.createCredential(
        challenge.challengeIdentifier,
        credentialName,
        'Fido2',
        credentialInfo
      );
      
      console.log('✅ WebAuthn credential creation completed');
      return credential;
    } catch (error) {
      console.error('❌ WebAuthn credential creation failed:', error);
      throw new DfnsError(
        `WebAuthn credential creation failed: ${error}`,
        'WEBAUTHN_FLOW_FAILED'
      );
    }
  }

  /**
   * Create Key credential using current API
   */
  async createKeyCredential(
    credentialName: string,
    publicKeyPem: string,
    algorithm: 'ECDSA' | 'EDDSA' | 'RSA' = 'EDDSA'
  ): Promise<DfnsCredentialResponse> {
    try {
      console.log('🔑 Creating Key credential (current API):', { credentialName, algorithm });
      
      // Step 1: Create challenge
      const challenge = await this.createCredentialChallenge('Key');
      
      // Step 2: Create client data and attestation for key credential
      const clientData = {
        type: 'key.create',
        challenge: challenge.challenge,
        origin: window.location.origin,
        crossOrigin: false
      };
      
      const attestationData = {
        challenge: challenge.challenge,
        crossOrigin: false,
        origin: window.location.origin,
        type: 'key.create'
      };
      
      const credentialInfo: CredentialInfo = {
        credId: this.generateCredentialId(),
        clientData: this.stringToBase64Url(JSON.stringify(clientData)),
        attestationData: this.stringToBase64Url(JSON.stringify(attestationData))
      };
      
      // Step 3: Create the credential
      const credential = await this.createCredential(
        challenge.challengeIdentifier,
        credentialName,
        'Key',
        credentialInfo
      );
      
      console.log('✅ Key credential created successfully');
      return credential;
    } catch (error) {
      console.error('❌ Failed to create Key credential:', error);
      throw new DfnsError(
        `Failed to create Key credential: ${error}`,
        'KEY_CREDENTIAL_CREATE_FAILED'
      );
    }
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

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
   * Check if platform authenticator is available
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
        active: credentials.filter(c => c.isActive).length,
        inactive: credentials.filter(c => !c.isActive).length,
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
  async findCredentialsByKind(kind: CredentialKind): Promise<DfnsCredentialResponse[]> {
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
  async findActiveSigningCredentials(): Promise<DfnsCredentialResponse[]> {
    try {
      const credentials = await this.listCredentials();
      return credentials.filter(c => 
        c.isActive && 
        (c.kind === 'Key' || c.kind === 'Fido2')
      );
    } catch (error) {
      throw new DfnsError(
        `Failed to find active signing credentials: ${error}`,
        'SIGNING_CREDENTIALS_FAILED'
      );
    }
  }

  // ==============================================
  // ENCODING/DECODING UTILITIES
  // ==============================================

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

  private stringToArrayBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer as ArrayBuffer;
  }

  private stringToBase64Url(str: string): string {
    return this.arrayBufferToBase64Url(this.stringToArrayBuffer(str));
  }

  private generateCredentialId(): string {
    // Generate a random credential ID
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64Url(array.buffer);
  }
}
