/**
 * DFNS User Recovery Service
 * 
 * High-level service for DFNS User Recovery operations
 * Provides business logic, validation, and WebAuthn integration for user account recovery
 */

import type {
  DfnsSendRecoveryCodeRequest,
  DfnsSendRecoveryCodeResponse,
  DfnsCreateRecoveryRequest,
  DfnsCreateRecoveryResponse,
  DfnsDelegatedRecoveryRequest,
  DfnsDelegatedRecoveryResponse,
  DfnsRecoverUserRequest,
  DfnsRecoverUserResponse,
  DfnsRecoveryCredentialAssertion,
  DfnsRecoveryObject,
  DfnsNewCredentials,
  DfnsCredentialInfo,
  DfnsFido2CredentialInfo,
  DfnsKeyCredentialInfo,
  DfnsPasswordProtectedKeyCredentialInfo,
  DfnsRecoveryKeyCredentialInfo,
  DfnsCredentialKind,
} from '../../types/dfns';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { 
  DfnsValidationError, 
  DfnsAuthenticationError,
  DfnsNetworkError 
} from '../../types/dfns/errors';

// Service Options
export interface DfnsUserRecoveryServiceOptions {
  syncToDatabase?: boolean;
  validateInput?: boolean;
  enableLogging?: boolean;
}

// Recovery Flow Status
export interface DfnsRecoveryFlowStatus {
  step: 'code_sent' | 'challenge_created' | 'recovery_complete';
  temporaryAuthenticationToken?: string;
  challenge?: string;
  allowedRecoveryCredentials?: Array<{
    id: string;
    encryptedRecoveryKey: string;
  }>;
}

// Recovery Summary
export interface DfnsRecoverySummary {
  username: string;
  orgId: string;
  credentialId: string;
  recoveryFlow: 'standard' | 'delegated';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
  invalidatedCredentialCount?: number;
}

export class DfnsUserRecoveryService {
  constructor(
    private authClient: DfnsAuthClient,
    private defaultOptions: DfnsUserRecoveryServiceOptions = {}
  ) {}

  // ===============================
  // STANDARD RECOVERY FLOW METHODS
  // ===============================

  /**
   * Complete standard user recovery flow
   * 1. Send recovery code to email
   * 2. Create recovery challenge with verification code
   * 3. Sign new credentials with recovery credential
   * 4. Complete recovery
   */
  async recoverUserAccount(
    username: string,
    orgId: string,
    verificationCode: string,
    credentialId: string,
    newCredentials: DfnsNewCredentials,
    recoveryCredentialAssertion: DfnsRecoveryCredentialAssertion,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<{
    recoveryResponse: DfnsRecoverUserResponse;
    summary: DfnsRecoverySummary;
  }> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateRecoveryInput(username, orgId, verificationCode, credentialId);
        this.validateNewCredentials(newCredentials);
        this.validateRecoveryAssertion(recoveryCredentialAssertion);
      }

      // Step 1: Create recovery challenge
      const challengeResponse = await this.createRecoveryChallenge({
        username,
        verificationCode,
        orgId,
        credentialId
      }, opts);

      // Step 2: Construct recovery object
      const recovery: DfnsRecoveryObject = {
        kind: 'RecoveryKey',
        credentialAssertion: recoveryCredentialAssertion
      };

      // Step 3: Complete recovery
      const recoveryResponse = await this.recoverUser({
        recovery,
        newCredentials
      }, opts);

      // Step 4: Create summary
      const summary: DfnsRecoverySummary = {
        username,
        orgId,
        credentialId,
        recoveryFlow: 'standard',
        status: 'completed',
        timestamp: new Date().toISOString(),
        invalidatedCredentialCount: undefined // This info isn't returned by DFNS API
      };

      if (opts.enableLogging) {
        console.log('User recovery completed successfully:', summary);
      }

      return { recoveryResponse, summary };

    } catch (error) {
      const summary: DfnsRecoverySummary = {
        username,
        orgId,
        credentialId,
        recoveryFlow: 'standard',
        status: 'failed',
        timestamp: new Date().toISOString()
      };

      if (opts.enableLogging) {
        console.error('User recovery failed:', { error, summary });
      }

      throw new DfnsAuthenticationError(
        `Failed to recover user account: ${error}`,
        { username, orgId, credentialId }
      );
    }
  }

  /**
   * Send recovery code to user's email
   * First step in standard recovery flow
   */
  async sendRecoveryCode(
    username: string,
    orgId: string,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<DfnsSendRecoveryCodeResponse> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateEmail(username);
        this.validateOrgId(orgId);
      }

      const request: DfnsSendRecoveryCodeRequest = {
        username,
        orgId
      };

      const response = await this.authClient.sendRecoveryCode(request);

      if (opts.enableLogging) {
        console.log('Recovery code sent successfully:', { username, orgId });
      }

      return response;

    } catch (error) {
      if (opts.enableLogging) {
        console.error('Failed to send recovery code:', { error, username, orgId });
      }

      throw new DfnsAuthenticationError(
        `Failed to send recovery code to ${username}: ${error}`,
        { username, orgId }
      );
    }
  }

  /**
   * Create recovery challenge with verification code
   * Second step in standard recovery flow
   */
  async createRecoveryChallenge(
    request: DfnsCreateRecoveryRequest,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<DfnsCreateRecoveryResponse> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateEmail(request.username);
        this.validateOrgId(request.orgId);
        this.validateVerificationCode(request.verificationCode);
        this.validateCredentialId(request.credentialId);
      }

      const response = await this.authClient.createRecoveryChallenge(request);

      if (opts.enableLogging) {
        console.log('Recovery challenge created successfully:', {
          username: request.username,
          orgId: request.orgId,
          credentialId: request.credentialId,
          challengeLength: response.challenge.length,
          allowedCredentialsCount: response.allowedRecoveryCredentials.length
        });
      }

      return response;

    } catch (error) {
      if (opts.enableLogging) {
        console.error('Failed to create recovery challenge:', { error, request });
      }

      throw new DfnsAuthenticationError(
        `Failed to create recovery challenge for ${request.username}: ${error}`,
        { 
          username: request.username, 
          orgId: request.orgId,
          credentialId: request.credentialId 
        }
      );
    }
  }

  // ===============================
  // DELEGATED RECOVERY FLOW METHODS
  // ===============================

  /**
   * Complete delegated user recovery flow
   * Service account initiated recovery for custom branded UX
   */
  async recoverUserAccountDelegated(
    username: string,
    credentialId: string,
    newCredentials: DfnsNewCredentials,
    recoveryCredentialAssertion: DfnsRecoveryCredentialAssertion,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<{
    recoveryResponse: DfnsRecoverUserResponse;
    summary: DfnsRecoverySummary;
  }> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateEmail(username);
        this.validateCredentialId(credentialId);
        this.validateNewCredentials(newCredentials);
        this.validateRecoveryAssertion(recoveryCredentialAssertion);
      }

      // Step 1: Create delegated recovery challenge
      const challengeResponse = await this.createDelegatedRecoveryChallenge({
        username,
        credentialId
      }, opts);

      // Step 2: Construct recovery object
      const recovery: DfnsRecoveryObject = {
        kind: 'RecoveryKey',
        credentialAssertion: recoveryCredentialAssertion
      };

      // Step 3: Complete recovery
      const recoveryResponse = await this.recoverUser({
        recovery,
        newCredentials
      }, opts);

      // Step 4: Create summary
      const summary: DfnsRecoverySummary = {
        username,
        orgId: 'delegated', // Org ID not required for delegated flow
        credentialId,
        recoveryFlow: 'delegated',
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      if (opts.enableLogging) {
        console.log('Delegated user recovery completed successfully:', summary);
      }

      return { recoveryResponse, summary };

    } catch (error) {
      const summary: DfnsRecoverySummary = {
        username,
        orgId: 'delegated',
        credentialId,
        recoveryFlow: 'delegated',
        status: 'failed',
        timestamp: new Date().toISOString()
      };

      if (opts.enableLogging) {
        console.error('Delegated user recovery failed:', { error, summary });
      }

      throw new DfnsAuthenticationError(
        `Failed to recover user account via delegated flow: ${error}`,
        { username, credentialId }
      );
    }
  }

  /**
   * Create delegated recovery challenge
   * Service account initiated recovery
   */
  async createDelegatedRecoveryChallenge(
    request: DfnsDelegatedRecoveryRequest,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<DfnsDelegatedRecoveryResponse> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateEmail(request.username);
        this.validateCredentialId(request.credentialId);
      }

      const response = await this.authClient.createDelegatedRecoveryChallenge(request);

      if (opts.enableLogging) {
        console.log('Delegated recovery challenge created successfully:', {
          username: request.username,
          credentialId: request.credentialId,
          challengeLength: response.challenge.length,
          allowedCredentialsCount: response.allowedRecoveryCredentials.length
        });
      }

      return response;

    } catch (error) {
      if (opts.enableLogging) {
        console.error('Failed to create delegated recovery challenge:', { error, request });
      }

      throw new DfnsAuthenticationError(
        `Failed to create delegated recovery challenge for ${request.username}: ${error}`,
        { 
          username: request.username,
          credentialId: request.credentialId 
        }
      );
    }
  }

  // ===============================
  // CORE RECOVERY METHODS
  // ===============================

  /**
   * Complete user recovery using recovery credential
   * Final step in both standard and delegated recovery flows
   */
  async recoverUser(
    request: DfnsRecoverUserRequest,
    options: DfnsUserRecoveryServiceOptions = {}
  ): Promise<DfnsRecoverUserResponse> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateInput) {
        this.validateRecoveryRequest(request);
      }

      const response = await this.authClient.recoverUser(request);

      if (opts.enableLogging) {
        console.log('User recovery completed successfully:', {
          userId: response.user.id,
          username: response.user.username,
          orgId: response.user.orgId,
          newCredentialUuid: response.credential.uuid,
          newCredentialKind: response.credential.kind
        });
      }

      return response;

    } catch (error) {
      if (opts.enableLogging) {
        console.error('Failed to recover user:', { 
          error, 
          recoveryKind: request.recovery.kind,
          firstFactorKind: request.newCredentials.firstFactorCredential.credentialKind
        });
      }

      throw new DfnsAuthenticationError(
        `Failed to complete user recovery: ${error}`,
        { 
          recoveryKind: request.recovery.kind,
          firstFactorKind: request.newCredentials.firstFactorCredential.credentialKind
        }
      );
    }
  }

  // ===============================
  // WEBAUTHN HELPER METHODS
  // ===============================

  /**
   * Create WebAuthn credential for recovery
   * Helper method to create Fido2 credentials during recovery
   */
  async createWebAuthnCredentialForRecovery(
    challenge: string,
    credentialName: string = 'Recovery Credential'
  ): Promise<DfnsCredentialInfo> {
    try {
      // Check WebAuthn support
      if (!this.isWebAuthnSupported()) {
        throw new DfnsValidationError(
          'WebAuthn is not supported in this browser',
          { userAgent: navigator.userAgent }
        );
      }

      // Create WebAuthn credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new TextEncoder().encode(challenge),
          rp: {
            name: 'Chain Capital',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode('recovery-user'),
            name: 'Recovery User',
            displayName: 'Recovery User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            userVerification: 'required',
            residentKey: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new DfnsAuthenticationError('Failed to create WebAuthn credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      const credentialInfo: DfnsFido2CredentialInfo = {
        credId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        clientData: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
        attestationData: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)))
      };

      return {
        credentialKind: 'Fido2',
        credentialInfo
      };

    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create WebAuthn credential for recovery: ${error}`
      );
    }
  }

  /**
   * Sign recovery challenge with WebAuthn
   * Helper method to create recovery credential assertion
   */
  async signRecoveryChallenge(
    challenge: string,
    credentialId: string,
    allowedCredentials: Array<{ id: string; encryptedRecoveryKey: string }>
  ): Promise<DfnsRecoveryCredentialAssertion> {
    try {
      // Check WebAuthn support
      if (!this.isWebAuthnSupported()) {
        throw new DfnsValidationError(
          'WebAuthn is not supported in this browser',
          { userAgent: navigator.userAgent }
        );
      }

      // Find the matching recovery credential
      const recoveryCredential = allowedCredentials.find(cred => cred.id === credentialId);
      if (!recoveryCredential) {
        throw new DfnsValidationError(
          'Recovery credential not found in allowed credentials',
          { credentialId, allowedCount: allowedCredentials.length }
        );
      }

      // Create WebAuthn assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new TextEncoder().encode(challenge),
          allowCredentials: [{
            type: 'public-key',
            id: new TextEncoder().encode(credentialId)
          }],
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new DfnsAuthenticationError('Failed to create WebAuthn assertion');
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      return {
        credId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
        clientData: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
        signature: btoa(String.fromCharCode(...new Uint8Array(response.signature)))
      };

    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to sign recovery challenge: ${error}`,
        { credentialId }
      );
    }
  }

  // ===============================
  // VALIDATION METHODS
  // ===============================

  private validateRecoveryInput(
    username: string,
    orgId: string,
    verificationCode: string,
    credentialId: string
  ): void {
    this.validateEmail(username);
    this.validateOrgId(orgId);
    this.validateVerificationCode(verificationCode);
    this.validateCredentialId(credentialId);
  }

  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new DfnsValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DfnsValidationError('Invalid email format');
    }
  }

  private validateOrgId(orgId: string): void {
    if (!orgId || typeof orgId !== 'string' || orgId.trim().length === 0) {
      throw new DfnsValidationError('Organization ID is required');
    }

    // DFNS org IDs typically follow the pattern: or-xxxxx-xxxxx-xxxxxxxxxxxx
    if (!orgId.startsWith('or-')) {
      throw new DfnsValidationError('Invalid organization ID format');
    }
  }

  private validateVerificationCode(code: string): void {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new DfnsValidationError('Verification code is required');
    }

    // DFNS verification codes are typically in format: 1234-1234-1234-1234
    const codeRegex = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
    if (!codeRegex.test(code)) {
      throw new DfnsValidationError('Invalid verification code format. Expected: XXXX-XXXX-XXXX-XXXX');
    }
  }

  private validateCredentialId(credentialId: string): void {
    if (!credentialId || typeof credentialId !== 'string' || credentialId.trim().length === 0) {
      throw new DfnsValidationError('Credential ID is required');
    }

    // Basic length validation for base64url encoded credential IDs
    if (credentialId.length < 16) {
      throw new DfnsValidationError('Credential ID appears to be too short');
    }
  }

  private validateNewCredentials(newCredentials: DfnsNewCredentials): void {
    if (!newCredentials.firstFactorCredential) {
      throw new DfnsValidationError('First factor credential is required');
    }

    this.validateCredentialInfo(newCredentials.firstFactorCredential);

    if (newCredentials.secondFactorCredential) {
      this.validateCredentialInfo(newCredentials.secondFactorCredential);
    }

    if (newCredentials.recoveryCredential) {
      this.validateCredentialInfo(newCredentials.recoveryCredential);
    }
  }

  private validateCredentialInfo(credentialInfo: DfnsCredentialInfo): void {
    if (!credentialInfo.credentialKind) {
      throw new DfnsValidationError('Credential kind is required');
    }

    const validKinds: DfnsCredentialKind[] = ['Fido2', 'Key', 'PasswordProtectedKey', 'RecoveryKey'];
    if (!validKinds.includes(credentialInfo.credentialKind)) {
      throw new DfnsValidationError(`Invalid credential kind: ${credentialInfo.credentialKind}`);
    }

    if (!credentialInfo.credentialInfo) {
      throw new DfnsValidationError('Credential info is required');
    }

    const info = credentialInfo.credentialInfo;
    if (!info.credId || !info.clientData || !info.attestationData) {
      throw new DfnsValidationError('Credential info must include credId, clientData, and attestationData');
    }
  }

  private validateRecoveryAssertion(assertion: DfnsRecoveryCredentialAssertion): void {
    if (!assertion.credId || !assertion.clientData || !assertion.signature) {
      throw new DfnsValidationError('Recovery credential assertion must include credId, clientData, and signature');
    }
  }

  private validateRecoveryRequest(request: DfnsRecoverUserRequest): void {
    if (!request.recovery || request.recovery.kind !== 'RecoveryKey') {
      throw new DfnsValidationError('Recovery object must have kind "RecoveryKey"');
    }

    this.validateRecoveryAssertion(request.recovery.credentialAssertion);
    this.validateNewCredentials(request.newCredentials);
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Check if WebAuthn is supported in the current browser
   */
  static isWebAuthnSupported(): boolean {
    return !!(
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get &&
      window.PublicKeyCredential
    );
  }

  private isWebAuthnSupported(): boolean {
    return DfnsUserRecoveryService.isWebAuthnSupported();
  }

  /**
   * Create recovery flow status
   */
  createRecoveryFlowStatus(
    step: 'code_sent' | 'challenge_created' | 'recovery_complete',
    additionalData?: Partial<DfnsRecoveryFlowStatus>
  ): DfnsRecoveryFlowStatus {
    return {
      step,
      ...additionalData
    };
  }

  /**
   * Get recovery options with defaults
   */
  getOptionsWithDefaults(options?: DfnsUserRecoveryServiceOptions): DfnsUserRecoveryServiceOptions {
    return {
      syncToDatabase: false,
      validateInput: true,
      enableLogging: false,
      ...this.defaultOptions,
      ...options
    };
  }
}
