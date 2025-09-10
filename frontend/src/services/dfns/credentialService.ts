/**
 * DFNS Credential Management Service
 * 
 * High-level service for managing DFNS user credentials with comprehensive business logic,
 * database synchronization, and WebAuthn integration.
 */

import type {
  DfnsCredentialKind,
  DfnsCredentialChallengeRequest,
  DfnsCredentialChallengeResponse,
  DfnsCreateCredentialRequest,
  DfnsCreateCredentialResponse,
  DfnsListCredentialsResponse,
  DfnsActivateCredentialRequest,
  DfnsActivateCredentialResponse,
  DfnsDeactivateCredentialRequest,
  DfnsDeactivateCredentialResponse,
  DfnsFido2CredentialInfo,
  DfnsKeyCredentialInfo,
  DfnsPasswordProtectedKeyCredentialInfo,
  DfnsRecoveryKeyCredentialInfo,
  // Code-Based Credential Flow Types
  DfnsCredentialCodeChallengeRequest,
  DfnsCredentialCodeChallengeResponse,
  DfnsCreateCredentialWithCodeRequest,
  DfnsCreateCredentialWithCodeResponse,
} from '../../types/dfns';
import type { DfnsCredential as DfnsCredentialAPI } from '../../types/dfns/auth';
import type { DfnsCredential as DfnsCredentialDb } from '../../types/dfns/users';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { WEBAUTHN_CONFIG } from '../../infrastructure/dfns/config';
import {
  DfnsCredentialError,
  DfnsValidationError,
  DfnsError,
} from '../../types/dfns/errors';

// Service options for credential operations
export interface CredentialServiceOptions {
  syncToDatabase?: boolean;
  autoActivate?: boolean;
  validateCredentials?: boolean;
}

// Enhanced credential creation request
export interface EnhancedCredentialCreationRequest {
  name: string;
  kind: DfnsCredentialKind;
  credentialInfo?: DfnsFido2CredentialInfo | DfnsKeyCredentialInfo | DfnsPasswordProtectedKeyCredentialInfo | DfnsRecoveryKeyCredentialInfo;
  encryptedPrivateKey?: string;
  options?: CredentialServiceOptions;
}

// Credential summary for dashboards
export interface CredentialSummary {
  credentialUuid: string;
  name: string;
  kind: DfnsCredentialKind;
  isActive: boolean;
  dateCreated: string;
  relyingPartyId: string;
  origin: string;
  publicKey: string;
  credentialId: string;
}

// Batch operation result
export interface BatchCredentialResult {
  successful: string[];
  failed: Array<{
    credentialUuid: string;
    error: string;
  }>;
}

export class DfnsCredentialService {
  constructor(
    private authClient: DfnsAuthClient,
    private userActionService: DfnsUserActionService
  ) {}

  /**
   * Create a new WebAuthn credential with full DFNS flow
   * This is the main method for adding new credentials to a user's account
   */
  async createWebAuthnCredential(
    name: string,
    options: CredentialServiceOptions = {}
  ): Promise<DfnsCreateCredentialResponse> {
    try {
      // Step 1: Validate input
      this.validateCredentialName(name);

      // Step 2: Initiate credential challenge
      const challengeRequest: DfnsCredentialChallengeRequest = {
        kind: 'Fido2'
      };

      const challenge = await this.authClient.initiateCredentialChallenge(challengeRequest);

      // Step 3: Create WebAuthn credential using browser API
      const webAuthnCredential = await this.createWebAuthnCredentialWithBrowser(challenge);

      // Step 4: Get User Action Signing token for credential creation
      const userActionToken = await this.userActionService.signUserAction(
        'CreateCredential',
        {
          credentialName: name,
          credentialKind: 'Fido2'
        }
      );

      // Step 5: Create credential request
      const createRequest: DfnsCreateCredentialRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        credentialName: name,
        credentialKind: 'Fido2',
        credentialInfo: webAuthnCredential
      };

      // Step 6: Create credential with DFNS
      const credentialResponse = await this.authClient.createCredential(createRequest, userActionToken);
      const credential = this.mapCredentialResponse(credentialResponse);

      // Step 7: Handle options
      if (options.autoActivate && credential.status !== 'Active') {
        await this.activateCredential(credential.credential_id, options);
      }

      if (options.syncToDatabase) {
        const apiCredential = this.mapResponseToApiCredential(credentialResponse);
        await this.syncCredentialToDatabase(apiCredential);
      }

      return credentialResponse;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to create WebAuthn credential: ${error}`,
        { name, options }
      );
    }
  }

  /**
   * Create a credential with custom credential info
   * For advanced use cases where you have existing credential info
   */
  async createCredentialWithInfo(
    request: EnhancedCredentialCreationRequest
  ): Promise<DfnsCreateCredentialResponse> {
    try {
      // Validate input
      this.validateCredentialName(request.name);
      this.validateCredentialKind(request.kind);

      if (!request.credentialInfo) {
        throw new DfnsValidationError('Credential info is required for custom credential creation');
      }

      // Initiate challenge
      const challengeRequest: DfnsCredentialChallengeRequest = {
        kind: request.kind
      };

      const challenge = await this.authClient.initiateCredentialChallenge(challengeRequest);

      // Get User Action Signing token
      const userActionToken = await this.userActionService.signUserAction(
        'CreateCredential',
        {
          credentialName: request.name,
          credentialKind: request.kind
        }
      );

      // Create credential request
      const createRequest: DfnsCreateCredentialRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        credentialName: request.name,
        credentialKind: request.kind,
        credentialInfo: request.credentialInfo,
        encryptedPrivateKey: request.encryptedPrivateKey
      };

      // Create credential
      const credentialResponse = await this.authClient.createCredential(createRequest, userActionToken);
      const credential = this.mapCredentialResponse(credentialResponse);

      // Handle options
      if (request.options?.autoActivate && credential.status !== 'Active') {
        await this.activateCredential(credential.credential_id, request.options);
      }

      if (request.options?.syncToDatabase) {
        const apiCredential = this.mapResponseToApiCredential(credentialResponse);
        await this.syncCredentialToDatabase(apiCredential);
      }

      return credentialResponse;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to create credential with custom info: ${error}`,
        { request: { ...request, credentialInfo: '[REDACTED]' } }
      );
    }
  }

  /**
   * List all credentials for the current user
   */
  async listCredentials(options: CredentialServiceOptions = {}): Promise<DfnsListCredentialsResponse> {
    try {
      // Get the API client directly and use the proper DFNS SDK method
      const apiClient = this.authClient.getDfnsClient().getApiClient();
      const response = await apiClient.auth.listCredentials();
      
      if (options.syncToDatabase) {
        await Promise.all(
          response.items.map(credential => this.syncCredentialToDatabase(credential))
        );
      }

      return response;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to list credentials: ${error}`,
        { options }
      );
    }
  }

  /**
   * Get credentials summary for dashboard display
   */
  async getCredentialsSummary(): Promise<CredentialSummary[]> {
    try {
      const response = await this.listCredentials();

      return response.items.map(credential => ({
        credentialUuid: credential.credentialUuid,
        name: credential.name,
        kind: credential.kind,
        isActive: credential.isActive,
        dateCreated: credential.dateCreated,
        relyingPartyId: credential.relyingPartyId || '', 
        origin: credential.origin || '', 
        publicKey: credential.publicKey,
        credentialId: credential.credentialId
      }));
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to get credentials summary: ${error}`
      );
    }
  }

  /**
   * Find credential by name
   */
  async getCredentialByName(name: string): Promise<DfnsCredentialDb | null> {
    try {
      const response = await this.listCredentials();
      const credential = response.items.find(credential => credential.name === name);
      
      if (!credential) {
        return null;
      }

      // Convert DFNS API response to database format
      return {
        id: credential.credentialUuid,
        credential_id: credential.credentialId,
        name: credential.name,
        kind: credential.kind,
        status: credential.isActive ? 'Active' : 'Inactive',
        public_key: credential.publicKey,
        algorithm: 'ES256', // Default algorithm
        enrolled_at: credential.dateCreated,
        dfns_credential_id: credential.credentialId,
        created_at: credential.dateCreated,
        updated_at: credential.dateCreated
      };
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to get credential by name: ${error}`,
        { name }
      );
    }
  }

  /**
   * Activate a deactivated credential
   * Requires User Action Signing
   */
  async activateCredential(
    credentialUuid: string,
    options: CredentialServiceOptions = {}
  ): Promise<DfnsCredentialDb> {
    try {
      this.validateCredentialUuid(credentialUuid);

      // Get User Action Signing token
      const userActionToken = await this.userActionService.signUserAction(
        'ActivateCredential',
        { credentialUuid }
      );

      // Activate credential
      const request: DfnsActivateCredentialRequest = { credentialUuid };
      await this.authClient.activateCredential(request, userActionToken);

      // Get updated credential info
      const response = await this.listCredentials();
      const activatedCredential = response.items.find(c => c.credentialUuid === credentialUuid);

      if (!activatedCredential) {
        throw new DfnsCredentialError(`Credential not found after activation: ${credentialUuid}`);
      }

      // Convert to database format
      const dbCredential: DfnsCredentialDb = {
        id: activatedCredential.credentialUuid,
        credential_id: activatedCredential.credentialId,
        name: activatedCredential.name,
        kind: activatedCredential.kind,
        status: 'Active',
        public_key: activatedCredential.publicKey,
        algorithm: 'ES256',
        enrolled_at: activatedCredential.dateCreated,
        dfns_credential_id: activatedCredential.credentialId,
        created_at: activatedCredential.dateCreated,
        updated_at: new Date().toISOString()
      };

      if (options.syncToDatabase) {
        await this.syncCredentialToDatabase(activatedCredential);
      }

      return dbCredential;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to activate credential: ${error}`,
        { credentialUuid, options }
      );
    }
  }

  /**
   * Deactivate an active credential
   * Requires User Action Signing
   */
  async deactivateCredential(
    credentialUuid: string,
    options: CredentialServiceOptions = {}
  ): Promise<DfnsCredentialDb> {
    try {
      this.validateCredentialUuid(credentialUuid);

      // Get User Action Signing token
      const userActionToken = await this.userActionService.signUserAction(
        'DeactivateCredential',
        { credentialUuid }
      );

      // Deactivate credential
      const request: DfnsDeactivateCredentialRequest = { credentialUuid };
      await this.authClient.deactivateCredential(request, userActionToken);

      // Get updated credential info
      const response = await this.listCredentials();
      const deactivatedCredential = response.items.find(c => c.credentialUuid === credentialUuid);

      if (!deactivatedCredential) {
        throw new DfnsCredentialError(`Credential not found after deactivation: ${credentialUuid}`);
      }

      // Convert to database format
      const dbCredential: DfnsCredentialDb = {
        id: deactivatedCredential.credentialUuid,
        credential_id: deactivatedCredential.credentialId,
        name: deactivatedCredential.name,
        kind: deactivatedCredential.kind,
        status: 'Inactive',
        public_key: deactivatedCredential.publicKey,
        algorithm: 'ES256',
        enrolled_at: deactivatedCredential.dateCreated,
        dfns_credential_id: deactivatedCredential.credentialId,
        created_at: deactivatedCredential.dateCreated,
        updated_at: new Date().toISOString()
      };

      if (options.syncToDatabase) {
        await this.syncCredentialToDatabase(deactivatedCredential);
      }

      return dbCredential;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to deactivate credential: ${error}`,
        { credentialUuid, options }
      );
    }
  }

  /**
   * Activate multiple credentials in batch
   */
  async activateCredentials(
    credentialUuids: string[],
    options: CredentialServiceOptions = {}
  ): Promise<BatchCredentialResult> {
    const result: BatchCredentialResult = {
      successful: [],
      failed: []
    };

    for (const credentialUuid of credentialUuids) {
      try {
        await this.activateCredential(credentialUuid, options);
        result.successful.push(credentialUuid);
      } catch (error) {
        result.failed.push({
          credentialUuid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Deactivate multiple credentials in batch
   */
  async deactivateCredentials(
    credentialUuids: string[],
    options: CredentialServiceOptions = {}
  ): Promise<BatchCredentialResult> {
    const result: BatchCredentialResult = {
      successful: [],
      failed: []
    };

    for (const credentialUuid of credentialUuids) {
      try {
        await this.deactivateCredential(credentialUuid, options);
        result.successful.push(credentialUuid);
      } catch (error) {
        result.failed.push({
          credentialUuid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  static isWebAuthnSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.navigator &&
      window.navigator.credentials &&
      window.PublicKeyCredential
    );
  }

  // ===============================
  // CODE-BASED CREDENTIAL FLOW METHODS
  // ===============================

  /**
   * Create WebAuthn credential using verification code flow
   * This flow does not require authentication or User Action Signing
   * Ideal for initial user onboarding scenarios
   */
  async createWebAuthnCredentialWithCode(
    name: string,
    verificationCode: string,
    options: CredentialServiceOptions = {}
  ): Promise<DfnsCreateCredentialWithCodeResponse> {
    try {
      // Step 1: Validate input
      this.validateCredentialName(name);
      this.validateVerificationCode(verificationCode);

      // Step 2: Initiate credential challenge with code
      const challengeRequest: DfnsCredentialCodeChallengeRequest = {
        code: verificationCode,
        credentialKind: 'Fido2'
      };

      const challenge = await this.authClient.initiateCredentialChallengeWithCode(challengeRequest);

      // Step 3: Create WebAuthn credential using browser API
      const webAuthnCredential = await this.createWebAuthnCredentialWithBrowser(challenge);

      // Step 4: Create credential request
      const createRequest: DfnsCreateCredentialWithCodeRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        credentialName: name,
        credentialKind: 'Fido2',
        credentialInfo: webAuthnCredential
      };

      // Step 5: Create credential with DFNS (no User Action Signing required)
      const credentialResponse = await this.authClient.createCredentialWithCode(createRequest);
      const credential = this.mapCredentialResponse(credentialResponse);

      // Step 6: Handle options
      if (options.autoActivate && credential.status !== 'Active') {
        // Note: Activation still requires User Action Signing even in code flow
        await this.activateCredential(credential.credential_id, options);
      }

      if (options.syncToDatabase) {
        const apiCredential = this.mapResponseToApiCredential(credentialResponse);
        await this.syncCredentialToDatabase(apiCredential);
      }

      return credentialResponse;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to create WebAuthn credential with code: ${error}`,
        { name, options }
      );
    }
  }

  /**
   * Create credential with custom credential info using verification code flow
   * For advanced use cases where you have existing credential info
   * Does not require authentication or User Action Signing
   */
  async createCredentialWithCodeAndInfo(
    request: EnhancedCredentialCreationRequest & { verificationCode: string }
  ): Promise<DfnsCreateCredentialWithCodeResponse> {
    try {
      // Validate input
      this.validateCredentialName(request.name);
      this.validateCredentialKind(request.kind);
      this.validateVerificationCode(request.verificationCode);

      if (!request.credentialInfo) {
        throw new DfnsValidationError('Credential info is required for custom credential creation');
      }

      // Initiate challenge with code
      const challengeRequest: DfnsCredentialCodeChallengeRequest = {
        code: request.verificationCode,
        credentialKind: request.kind
      };

      const challenge = await this.authClient.initiateCredentialChallengeWithCode(challengeRequest);

      // Create credential request
      const createRequest: DfnsCreateCredentialWithCodeRequest = {
        challengeIdentifier: challenge.challengeIdentifier,
        credentialName: request.name,
        credentialKind: request.kind,
        credentialInfo: request.credentialInfo,
        encryptedPrivateKey: request.encryptedPrivateKey
      };

      // Create credential (no User Action Signing required)
      const credentialResponse = await this.authClient.createCredentialWithCode(createRequest);
      const credential = this.mapCredentialResponse(credentialResponse);

      // Handle options
      if (request.options?.autoActivate && credential.status !== 'Active') {
        // Note: Activation still requires User Action Signing even in code flow
        await this.activateCredential(credential.credential_id, request.options);
      }

      if (request.options?.syncToDatabase) {
        const apiCredential = this.mapResponseToApiCredential(credentialResponse);
        await this.syncCredentialToDatabase(apiCredential);
      }

      return credentialResponse;
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to create credential with code and custom info: ${error}`,
        { request: { ...request, credentialInfo: '[REDACTED]', verificationCode: '[REDACTED]' } }
      );
    }
  }

  /**
   * Get verification code challenge for credential creation
   * This can be used to initiate the challenge and then handle the WebAuthn separately
   */
  async getCredentialChallengeWithCode(
    verificationCode: string,
    credentialKind: DfnsCredentialKind = 'Fido2'
  ): Promise<DfnsCredentialCodeChallengeResponse> {
    try {
      this.validateVerificationCode(verificationCode);
      this.validateCredentialKind(credentialKind);

      const challengeRequest: DfnsCredentialCodeChallengeRequest = {
        code: verificationCode,
        credentialKind
      };

      return await this.authClient.initiateCredentialChallengeWithCode(challengeRequest);
    } catch (error) {
      throw new DfnsCredentialError(
        `Failed to get credential challenge with code: ${error}`,
        { credentialKind }
      );
    }
  }

  /**
   * Create WebAuthn credential using browser API
   */
  private async createWebAuthnCredentialWithBrowser(
    challenge: DfnsCredentialChallengeResponse
  ): Promise<DfnsFido2CredentialInfo> {
    if (!DfnsCredentialService.isWebAuthnSupported()) {
      throw new DfnsCredentialError('WebAuthn is not supported in this browser');
    }

    try {
      // Create credential options based on DFNS challenge
      const credentialOptions: PublicKeyCredentialCreationOptions = {
        challenge: this.base64ToArrayBuffer(challenge.challenge),
        rp: challenge.rp || {
          id: WEBAUTHN_CONFIG.rpId,
          name: WEBAUTHN_CONFIG.rpName
        },
        user: {
          id: new TextEncoder().encode(challenge.user.id),
          name: challenge.user.name,
          displayName: challenge.user.displayName
        },
        pubKeyCredParams: challenge.pubKeyCredParam,
        timeout: WEBAUTHN_CONFIG.timeout,
        attestation: challenge.attestation,
        excludeCredentials: challenge.excludeCredentials.map(cred => ({
          type: cred.type,
          id: this.base64ToArrayBuffer(cred.id),
          transports: cred.transports as AuthenticatorTransport[]
        })),
        authenticatorSelection: challenge.authenticatorSelection
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: credentialOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new DfnsCredentialError('Failed to create WebAuthn credential');
      }

      // Process the credential response
      const response = credential.response as AuthenticatorAttestationResponse;

      return {
        credId: this.arrayBufferToBase64(credential.rawId),
        clientData: this.arrayBufferToBase64(response.clientDataJSON),
        attestationData: this.arrayBufferToBase64(response.attestationObject)
      };
    } catch (error) {
      throw new DfnsCredentialError(
        `WebAuthn credential creation failed: ${error}`
      );
    }
  }

  /**
   * Convert API credential format to database format
   */
  private convertApiToDbCredential(apiCredential: DfnsCredentialAPI): DfnsCredentialDb {
    return {
      id: apiCredential.credentialUuid,
      credential_id: apiCredential.credentialId,
      user_id: undefined, // Will be set by database
      name: apiCredential.name || '',
      kind: apiCredential.kind,
      status: apiCredential.isActive ? 'Active' : 'Inactive',
      public_key: apiCredential.publicKey || '',
      algorithm: 'ES256', // Default algorithm for WebAuthn
      attestation_type: undefined, // Not available in API response
      authenticator_info: undefined, // Not available in API response
      enrolled_at: apiCredential.dateCreated,
      last_used_at: undefined,
      dfns_credential_id: apiCredential.credentialId,
      created_at: apiCredential.dateCreated,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Sync credential to local database (placeholder for future implementation)
   */
  private async syncCredentialToDatabase(credential: DfnsCredentialAPI): Promise<void> {
    try {
      const dbCredential = this.convertApiToDbCredential(credential);
      
      // TODO: Implement database sync when Supabase client is available
      // This would insert/update the credential in the dfns_credentials table
      console.log('Credential sync to database:', {
        credentialUuid: dbCredential.credential_id,
        name: dbCredential.name,
        kind: dbCredential.kind,
        isActive: dbCredential.status === 'Active'
      });
    } catch (error) {
      console.warn('Failed to sync credential to database:', error);
    }
  }

  /**
   * Validate credential name
   */
  private validateCredentialName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new DfnsValidationError('Credential name is required and must be a string');
    }

    if (name.length < 1 || name.length > 100) {
      throw new DfnsValidationError('Credential name must be between 1 and 100 characters');
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      throw new DfnsValidationError('Credential name contains invalid characters');
    }
  }

  /**
   * Validate credential kind
   */
  private validateCredentialKind(kind: DfnsCredentialKind): void {
    const validKinds: DfnsCredentialKind[] = ['Fido2', 'Key', 'PasswordProtectedKey', 'RecoveryKey'];
    
    if (!validKinds.includes(kind)) {
      throw new DfnsValidationError(`Invalid credential kind: ${kind}. Must be one of: ${validKinds.join(', ')}`);
    }
  }

  /**
   * Validate credential UUID format
   */
  private validateCredentialUuid(credentialUuid: string): void {
    if (!credentialUuid || typeof credentialUuid !== 'string') {
      throw new DfnsValidationError('Credential UUID is required and must be a string');
    }

    // DFNS credential UUIDs follow pattern: cr-xxxxx-xxxxx-xxxxxxxxxxxxxxx
    const uuidPattern = /^cr-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{15}$/;
    if (!uuidPattern.test(credentialUuid)) {
      throw new DfnsValidationError('Invalid credential UUID format');
    }
  }

  /**
   * Validate verification code format
   */
  private validateVerificationCode(code: string): void {
    if (!code || typeof code !== 'string') {
      throw new DfnsValidationError('Verification code is required and must be a string');
    }

    if (code.length < 3 || code.length > 50) {
      throw new DfnsValidationError('Verification code must be between 3 and 50 characters');
    }

    // Allow alphanumeric codes with common separators (dash, underscore)
    if (!/^[a-zA-Z0-9\-_]+$/.test(code)) {
      throw new DfnsValidationError('Verification code contains invalid characters');
    }
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
   * Map DfnsCreateCredentialResponse to DfnsCredentialAPI (auth type) for API operations
   */
  private mapResponseToApiCredential(response: DfnsCreateCredentialResponse): DfnsCredentialAPI {
    return {
      credentialId: response.credentialId,
      credentialUuid: response.uuid,
      dateCreated: response.dateCreated,
      isActive: response.status === 'Active',
      kind: response.credentialKind,
      name: response.name,
      publicKey: response.publicKey,
      relyingPartyId: '', // Not provided in create response
      origin: '', // Not provided in create response
    };
  }

  /**
   * Map DfnsCreateCredentialResponse to DfnsCredentialDb (users type)
   */
  private mapCredentialResponse(response: DfnsCreateCredentialResponse): DfnsCredentialDb {
    return {
      id: response.uuid,
      credential_id: response.credentialId,
      user_id: '', // Not provided in create response
      name: response.name,
      kind: response.credentialKind,
      status: response.status,
      public_key: response.publicKey,
      algorithm: 'ES256', // Default algorithm
      attestation_type: undefined,
      authenticator_info: undefined,
      enrolled_at: response.dateCreated,
      last_used_at: undefined,
      dfns_credential_id: response.credentialId,
      created_at: response.dateCreated,
      updated_at: response.dateCreated,
    };
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
}
