import { DfnsCredentialService } from './credentialService';
import { DfnsUserActionSigningService } from './userActionSigningService';
import { WebAuthnCredential, DfnsUserActionChallenge, DfnsError } from '../../types/dfns';

/**
 * DFNS WebAuthn Service
 * Handles WebAuthn/Passkey creation and User Action Signing
 * 
 * This service enables browser-based User Action Signing using device security features
 * (Touch ID, Face ID, Windows Hello, etc.) without requiring private key management.
 */
export class DfnsWebAuthnService {
  private credentialService: DfnsCredentialService;
  private userActionService: DfnsUserActionSigningService;

  constructor(
    credentialService: DfnsCredentialService,
    userActionService: DfnsUserActionSigningService
  ) {
    this.credentialService = credentialService;
    this.userActionService = userActionService;
  }

  /**
   * Check if WebAuthn is supported in current environment
   */
  public isWebAuthnSupported(): boolean {
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get
    );
  }

  /**
   * Check if platform authenticator (Touch ID, Face ID, etc.) is available
   */
  public async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Create a WebAuthn/Passkey credential for User Action Signing
   * This enables cryptographic signing for sensitive DFNS operations
   */
  public async createPasskeyCredential(credentialName: string = 'DFNS Device Passkey'): Promise<WebAuthnCredential> {
    if (!this.isWebAuthnSupported()) {
      throw new DfnsError('WebAuthn not supported in this browser', 'WEBAUTHN_NOT_SUPPORTED');
    }

    try {
      console.log('🔐 Creating WebAuthn credential for DFNS User Action Signing...');
      
      // Step 1: Initialize credential creation challenge
      const challenge = await this.credentialService.createWebAuthnCredentialChallenge(credentialName);
      
      // Step 2: Create WebAuthn credential using browser API
      const credentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: this.base64URLToBuffer(challenge.challenge),
        rp: {
          name: 'DFNS Platform',
          id: window.location.hostname
        },
        user: {
          id: this.stringToBuffer(challenge.publicKey?.user?.id || 'dfns-user'),
          name: credentialName,
          displayName: credentialName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (ECDSA)
          { alg: -257, type: 'public-key' } // RS256 (RSA)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device's built-in authenticator
          userVerification: 'required', // Require biometric/PIN verification
          residentKey: 'required' // Create discoverable credential
        },
        attestation: 'none' // No attestation required for DFNS
      };

      // Browser prompts user for biometric/PIN verification
      console.log('📱 Please verify your identity using your device security...');
      const credential = await navigator.credentials.create({
        publicKey: credentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new DfnsError('Failed to create WebAuthn credential', 'WEBAUTHN_CREATION_FAILED');
      }

      // Step 3: Complete credential registration with DFNS
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialData = {
        credentialId: this.bufferToBase64URL(credential.rawId),
        clientData: this.bufferToBase64URL(response.clientDataJSON),
        attestationData: this.bufferToBase64URL(response.attestationObject)
      };

      const dfnsCredential = await this.credentialService.completeWebAuthnCredentialCreation(
        challenge.challengeIdentifier,
        credential
      );

      console.log('✅ WebAuthn credential created successfully!');
      console.log(`📋 Credential ID: ${dfnsCredential.id}`);
      console.log(`🔑 Credential Kind: ${dfnsCredential.kind}`);

      // Convert DfnsCredential to WebAuthnCredential format expected by components
      const webAuthnCredential: WebAuthnCredential = {
        id: dfnsCredential.id,
        wallet_id: '', // This would need to be set by calling code
        credential_id: dfnsCredential.id,
        public_key_x: '', // Would be extracted from dfnsCredential.publicKey
        public_key_y: '', // Would be extracted from dfnsCredential.publicKey
        authenticator_data: JSON.stringify(dfnsCredential.attestationData || {}),
        is_primary: false,
        device_name: dfnsCredential.name,
        platform: navigator.userAgent,
        dfns_credential_uuid: dfnsCredential.id,
        dfns_credential_name: dfnsCredential.name,
        created_at: dfnsCredential.createdAt,
        updated_at: dfnsCredential.updatedAt
      };

      return webAuthnCredential;

    } catch (error) {
      console.error('❌ Failed to create WebAuthn credential:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new DfnsError('User cancelled credential creation', 'WEBAUTHN_USER_CANCELLED');
      } else if (error.name === 'NotSupportedError') {
        throw new DfnsError('WebAuthn not supported on this device', 'WEBAUTHN_NOT_SUPPORTED');
      } else if (error.name === 'SecurityError') {
        throw new DfnsError('WebAuthn security error - ensure HTTPS', 'WEBAUTHN_SECURITY_ERROR');
      }
      
      throw error;
    }
  }

  /**
   * Sign a User Action using WebAuthn/Passkey
   * This is the core method for DFNS User Action Signing with passkeys
   */
  public async signUserActionWithPasskey(
    userActionPayload: string,
    httpMethod: string,
    httpPath: string,
    credentialId?: string
  ): Promise<string> {
    try {
      console.log('🔐 Starting User Action Signing with WebAuthn...');

      // Step 1: Initialize User Action challenge
      const challenge = await this.userActionService.initializeChallenge({
        userActionPayload,
        userActionHttpMethod: httpMethod as 'POST' | 'PUT' | 'DELETE' | 'GET',
        userActionHttpPath: httpPath
      });

      // Step 2: Find available WebAuthn credentials
      const availableCredentials = challenge.allowCredentials?.webauthn || [];
      if (availableCredentials.length === 0) {
        throw new DfnsError('No WebAuthn credentials available for signing', 'NO_WEBAUTHN_CREDENTIALS');
      }

      // Use specific credential or first available
      const targetCredential = credentialId 
        ? availableCredentials.find(c => c.id === credentialId)
        : availableCredentials[0];

      if (!targetCredential) {
        throw new DfnsError('Specified WebAuthn credential not found', 'WEBAUTHN_CREDENTIAL_NOT_FOUND');
      }

      // Step 3: Create WebAuthn assertion options
      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge: this.base64URLToBuffer(challenge.challenge),
        allowCredentials: [{
          type: 'public-key',
          id: this.base64URLToBuffer(targetCredential.id),
          transports: (typeof targetCredential.transports === 'string' 
          ? JSON.parse(targetCredential.transports) 
          : targetCredential.transports) as AuthenticatorTransport[]
        }],
        userVerification: 'required'
      };

      // Browser prompts for biometric/PIN verification and signs
      console.log('📱 Please verify your identity to sign the action...');
      const assertion = await navigator.credentials.get({
        publicKey: assertionOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new DfnsError('Failed to create WebAuthn assertion', 'WEBAUTHN_ASSERTION_FAILED');
      }

      // Step 4: Complete User Action Signing
      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;
      const signedChallenge = {
        credentialAssertion: {
          credId: targetCredential.id,
          clientData: this.bufferToBase64URL(assertionResponse.clientDataJSON),
          authenticatorData: this.bufferToBase64URL(assertionResponse.authenticatorData),
          signature: this.bufferToBase64URL(assertionResponse.signature),
          userHandle: assertionResponse.userHandle ? this.bufferToBase64URL(assertionResponse.userHandle) : undefined
        }
      };

      // Note: userActionService doesn't have completeWebAuthnSigning method
      // Need to implement WebAuthn completion in userActionService or use alternative approach
      throw new DfnsError(
        'WebAuthn User Action Signing not yet implemented in userActionService',
        'WEBAUTHN_SIGNING_NOT_IMPLEMENTED'
      );

      // TODO: Implement actual WebAuthn User Action Signing
      // console.log('✅ User Action signed successfully with WebAuthn!');
      // return userActionToken;

    } catch (error) {
      console.error('❌ WebAuthn User Action Signing failed:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new DfnsError('User cancelled signing operation', 'WEBAUTHN_SIGNING_CANCELLED');
      }
      
      throw error;
    }
  }

  /**
   * Get WebAuthn credential status and capabilities
   */
  public async getWebAuthnStatus(): Promise<{
    supported: boolean;
    platformAuthenticator: boolean;
    conditionalMediation: boolean;
    credentials: WebAuthnCredential[];
    canSign: boolean;
  }> {
    const supported = this.isWebAuthnSupported();
    const platformAuthenticator = supported ? await this.isPlatformAuthenticatorAvailable() : false;
    
    let conditionalMediation = false;
    if (supported && 'isConditionalMediationAvailable' in PublicKeyCredential) {
      try {
        conditionalMediation = await PublicKeyCredential.isConditionalMediationAvailable();
      } catch {
        conditionalMediation = false;
      }
    }

    const allCredentials = await this.credentialService.listCredentials();
    const webauthnCredentials = allCredentials.filter(c => c.kind === 'Fido2' && c.status === 'Active');

    return {
      supported,
      platformAuthenticator,
      conditionalMediation,
      credentials: webauthnCredentials.map(cred => ({
        id: cred.id,
        wallet_id: '', // Would need to be provided by calling context
        credential_id: cred.id,
        public_key_x: '',
        public_key_y: '',
        authenticator_data: JSON.stringify(cred.attestationData || {}),
        is_primary: false,
        device_name: cred.name,
        platform: 'unknown',
        dfns_credential_uuid: cred.id,
        dfns_credential_name: cred.name,
        created_at: cred.createdAt,
        updated_at: cred.updatedAt
      })) as WebAuthnCredential[],
      canSign: webauthnCredentials.length > 0
    };
  }

  /**
   * Test WebAuthn User Action Signing end-to-end
   */
  public async testWebAuthnSigning(): Promise<{
    success: boolean;
    credentialId?: string;
    error?: string;
  }> {
    try {
      // Test payload (read-only operation simulation)
      const testPayload = JSON.stringify({ test: 'webauthn-signing' });
      
      const status = await this.getWebAuthnStatus();
      if (!status.canSign) {
        return {
          success: false,
          error: 'No active WebAuthn credentials for signing'
        };
      }

      // Use first available credential for test
      const credentialId = status.credentials[0].id;
      
      const userActionToken = await this.signUserActionWithPasskey(
        testPayload,
        'POST',
        '/test/webauthn',
        credentialId
      );

      return {
        success: true,
        credentialId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Utility methods for WebAuthn data conversion
  private base64URLToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  private bufferToBase64URL(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private stringToBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }
}
