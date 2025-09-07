/**
 * DFNS Credential Manager - Enhanced credential management for DFNS integration
 * 
 * This service manages DFNS credentials including:
 * - Fido2/WebAuthn credentials (Passkeys)
 * - Key credentials (raw public/private key pairs)
 * - Password-protected key credentials
 * - Recovery key credentials
 * - Cross-device credential creation and management
 */

import type { DfnsClientConfig } from '@/types/dfns';
import { DfnsAuthenticator, DfnsCredentialKind, DfnsSignatureType, SigningChallenge } from './auth';
import { DFNS_CONFIG } from './config';

// ===== Credential Management Types =====

/**
 * DFNS-compliant credential information interface
 * Aligns with official DFNS API specification
 */
export interface DfnsCredentialInfo {
  id: string;                  // Legacy ID field for backward compatibility
  credentialId: string;        // DFNS credential ID  
  credentialUuid: string;      // DFNS credential UUID
  name?: string;               // Credential name
  kind: DfnsCredentialKind;    // Credential type
  status: DfnsCredentialStatus; // Credential status enum
  isActive: boolean;           // Activation status (replaces status enum)
  publicKey: string;           // Public key
  algorithm?: string;          // Algorithm used
  dateCreated: string;         // ISO date string
  lastUsedAt?: string;         // Last usage timestamp
  enrolledAt?: string;         // Enrollment timestamp
  relyingPartyId?: string;     // For Fido2 credentials
  origin?: string;             // For Fido2 credentials
  attestationType?: string;    // Attestation type
  authenticatorInfo?: AuthenticatorInfo; // WebAuthn info
  externalId?: string;         // External identifier
}

/**
 * Credential status enum for compatibility
 */
export enum DfnsCredentialStatus {
  Active = 'Active',
  Inactive = 'Inactive'
}

/**
 * @deprecated Use DfnsCredentialInfo instead
 * Legacy credential information interface for backward compatibility
 * This interface will be removed in a future version.
 */
export interface CredentialInfo {
  id: string;
  name: string;
  kind: DfnsCredentialKind;
  status: CredentialStatus;
  publicKey: string;
  algorithm: string;
  attestationType?: string;
  authenticatorInfo?: AuthenticatorInfo;
  enrolledAt: string;
  lastUsedAt?: string;
  externalId?: string;
}

export interface AuthenticatorInfo {
  aaguid: string;
  credentialPublicKey: string;
  counter: number;
  credentialBackedUp?: boolean;
  credentialDeviceType?: string;
  transports?: string[];
}

export interface CredentialCreationResult {
  credentialId: string;
  publicKey: string;
  privateKey?: string; // Only for Key credentials
  recoveryCode?: string; // Only for Recovery credentials
  encryptedPrivateKey?: string; // Only for PasswordProtected credentials
}

export interface RecoveryKeyInfo {
  recoveryCode: string;
  words: string[];
  checksum: string;
  entropy: string;
}

export interface PasswordProtectedKeyInfo {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  algorithm: string;
  iterations: number;
}

export interface CrossDeviceCodeInfo {
  code: string;
  expiresAt: string;
  deviceName: string;
  challenge: string;
}

export enum CredentialStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Revoked = 'Revoked'
}

// ===== DFNS API Request/Response Types =====

/**
 * Request to create a one-time code for cross-device credential creation
 */
export interface CreateCredentialCodeRequest {
  expiration: string; // ISO-8601 Date or Unix epoch, max 1 minute in future
}

/**
 * Response from creating a credential code
 */
export interface CreateCredentialCodeResponse {
  code: string;       // e.g., "A7U-KY6-9PT"
  expiration: string; // ISO-8601 expiration time
}

/**
 * Request to create credential challenge with code
 */
export interface CreateCredentialChallengeWithCodeRequest {
  code: string;           // From createCredentialCode
  credentialKind: DfnsCredentialKind;
}

/**
 * Request to activate a credential
 */
export interface ActivateCredentialRequest {
  credentialUuid: string; // e.g., "cr-4uc9u-12ij1-9s08327e73jqqcnr"
}

/**
 * Request to deactivate a credential  
 */
export interface DeactivateCredentialRequest {
  credentialUuid: string;
}

/**
 * Response from credential activation/deactivation
 */
export interface CredentialActionResponse {
  message: "success";
}

/**
 * Credential signing challenge from DFNS API
 * Renamed to avoid conflict with imported SigningChallenge
 */
export interface CredentialSigningChallenge {
  challenge: string;
  challengeIdentifier: string;
  allowCredentials?: {
    key?: Array<{
      id: string;
      type: string;
    }>;
    webauthn?: Array<{
      id: string;
      type: string;
    }>;
  };
  expiresAt: string;
}

// ===== DFNS Credential Manager Class =====

export class DfnsCredentialManager {
  private config: DfnsClientConfig;
  private authenticator: DfnsAuthenticator;

  constructor(config: DfnsClientConfig, authenticator?: DfnsAuthenticator) {
    this.config = config;
    this.authenticator = authenticator || new DfnsAuthenticator(config);
  }

  // ===== Credential Creation Methods =====

  /**
   * Create a new Fido2/WebAuthn credential (Passkey)
   */
  async createFido2Credential(
    name: string,
    username: string,
    displayName: string,
    requiresUserVerification = true
  ): Promise<CredentialCreationResult> {
    if (!navigator.credentials) {
      throw new Error('WebAuthn not supported in this browser');
    }

    try {
      // Get credential challenge from DFNS
      const challenge = await this.getCredentialChallenge({
        kind: DfnsCredentialKind.Fido2,
        name: name,
        username: username
      });

      // Create WebAuthn credential with enhanced options
      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: this.base64UrlDecode(challenge.challenge),
          rp: {
            name: 'Chain Capital - DFNS',
            id: this.getRelyingPartyId()
          },
          user: {
            id: new TextEncoder().encode(username),
            name: username,
            displayName: displayName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256 (secp256r1)
            { alg: -257, type: 'public-key' }, // RS256
            { alg: -8, type: 'public-key' }    // EdDSA
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: requiresUserVerification ? 'required' : 'preferred',
            residentKey: 'preferred',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct',
          excludeCredentials: [] // Could be populated with existing credentials
        }
      };

      const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('Failed to create WebAuthn credential');
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = this.arrayBufferToBase64Url(credential.rawId);
      const publicKey = this.extractPublicKeyFromAttestation(response);
      const attestationObject = this.arrayBufferToBase64Url(response.attestationObject);
      const clientDataJSON = this.arrayBufferToBase64Url(response.clientDataJSON);

      // Register credential with DFNS
      const registeredCredential = await this.registerCredential({
        challengeIdentifier: challenge.challengeIdentifier,
        name: name,
        kind: DfnsCredentialKind.Fido2,
        credentialId: credentialId,
        publicKey: publicKey,
        attestationObject: attestationObject,
        clientDataJSON: clientDataJSON
      });

      return {
        credentialId: registeredCredential.id,
        publicKey: publicKey
      };
    } catch (error) {
      throw new Error(`Fido2 credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new Key credential (raw public/private key pair)
   */
  async createKeyCredential(
    name: string,
    curve: DfnsSignatureType = DfnsSignatureType.Secp256k1,
    externalId?: string
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Get credential challenge
      const challenge = await this.getCredentialChallenge({
        kind: DfnsCredentialKind.Key,
        name: name,
        publicKey: keyPair.publicKey,
        externalId: externalId
      });
      
      // Sign challenge with new private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Register credential
      const registeredCredential = await this.registerCredential({
        challengeIdentifier: challenge.challengeIdentifier,
        name: name,
        kind: DfnsCredentialKind.Key,
        publicKey: keyPair.publicKey,
        signature: signature,
        algorithm: this.getAlgorithmName(curve),
        externalId: externalId
      });

      return {
        credentialId: registeredCredential.id,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      throw new Error(`Key credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a password-protected key credential
   */
  async createPasswordProtectedKeyCredential(
    name: string,
    password: string,
    curve: DfnsSignatureType = DfnsSignatureType.Secp256k1,
    externalId?: string
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Encrypt private key with password
      const encryptedKeyInfo = await this.encryptPrivateKey(keyPair.privateKey, password);
      
      // Get credential challenge
      const challenge = await this.getCredentialChallenge({
        kind: DfnsCredentialKind.PasswordProtectedKey,
        name: name,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey: encryptedKeyInfo.encryptedPrivateKey,
        externalId: externalId
      });
      
      // Sign challenge with original private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Register credential
      const registeredCredential = await this.registerCredential({
        challengeIdentifier: challenge.challengeIdentifier,
        name: name,
        kind: DfnsCredentialKind.PasswordProtectedKey,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey: encryptedKeyInfo.encryptedPrivateKey,
        signature: signature,
        algorithm: this.getAlgorithmName(curve),
        externalId: externalId
      });

      return {
        credentialId: registeredCredential.id,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey: encryptedKeyInfo.encryptedPrivateKey
      };
    } catch (error) {
      throw new Error(`Password-protected key credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a recovery key credential
   */
  async createRecoveryKeyCredential(
    name: string,
    curve: DfnsSignatureType = DfnsSignatureType.Secp256k1,
    externalId?: string
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Generate recovery code
      const recoveryInfo = await this.generateRecoveryCode(keyPair.privateKey);
      
      // Get credential challenge
      const challenge = await this.getCredentialChallenge({
        kind: DfnsCredentialKind.RecoveryKey,
        name: name,
        publicKey: keyPair.publicKey,
        recoveryCode: recoveryInfo.recoveryCode,
        externalId: externalId
      });
      
      // Sign challenge with private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Register credential
      const registeredCredential = await this.registerCredential({
        challengeIdentifier: challenge.challengeIdentifier,
        name: name,
        kind: DfnsCredentialKind.RecoveryKey,
        publicKey: keyPair.publicKey,
        recoveryCode: recoveryInfo.recoveryCode,
        signature: signature,
        algorithm: this.getAlgorithmName(curve),
        externalId: externalId
      });

      return {
        credentialId: registeredCredential.id,
        publicKey: keyPair.publicKey,
        recoveryCode: recoveryInfo.recoveryCode
      };
    } catch (error) {
      throw new Error(`Recovery key credential creation failed: ${(error as Error).message}`);
    }
  }

  // ===== Cross-Device Credential Management =====

  /**
   * Create a one-time code for cross-device credential creation
   * Official DFNS API: POST /auth/credentials/code
   */
  async createCredentialCode(expiration: string): Promise<{ code: string; expiration: string }> {
    try {
      // Must be authenticated to create credential codes
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to create credential code');
      }

      // Get user action signature for creating the code
      const userActionSignature = await this.authenticator.signUserAction(
        'POST',
        '/auth/credentials/code'
      );

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId,
          'X-DFNS-USERACTION': this.base64UrlEncode(JSON.stringify(userActionSignature))
        },
        body: JSON.stringify({ expiration })
      });

      if (!response.ok) {
        throw new Error(`Failed to create credential code: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Credential code creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create credential challenge using one-time code
   * Official DFNS API: POST /auth/credentials/code/init
   */
  async createCredentialChallengeWithCode(
    code: string,
    credentialKind: DfnsCredentialKind
  ): Promise<SigningChallenge> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/credentials/code/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DFNS-APPID': this.config.appId
        },
        body: JSON.stringify({
          code: code,
          credentialKind: credentialKind
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create credential challenge with code: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Credential challenge with code failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create credential using one-time code (no authentication required)
   * Official DFNS API: POST /auth/credentials/code/verify
   */
  async createCredentialWithCode(
    challengeIdentifier: string,
    credentialName: string,
    credentialKind: DfnsCredentialKind,
    credentialInfo: any,
    encryptedPrivateKey?: string
  ): Promise<CredentialCreationResult> {
    try {
      const requestBody: any = {
        challengeIdentifier,
        credentialName,
        credentialKind,
        credentialInfo
      };

      if (encryptedPrivateKey) {
        requestBody.encryptedPrivateKey = encryptedPrivateKey;
      }

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/code/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DFNS-APPID': this.config.appId
          // Note: No Authorization or User Action headers required for code-based creation
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to create credential with code: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        credentialId: result.id || result.credentialId,
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        recoveryCode: result.recoveryCode,
        encryptedPrivateKey: result.encryptedPrivateKey
      };
    } catch (error) {
      throw new Error(`Credential creation with code failed: ${(error as Error).message}`);
    }
  }

  /**
   * @deprecated Use createCredentialCode() instead
   * Legacy method for backward compatibility
   */
  async createCrossDeviceCode(
    deviceName: string,
    expirationMinutes = 5
  ): Promise<CrossDeviceCodeInfo> {
    // Convert to new API format
    const expirationTime = new Date(Date.now() + expirationMinutes * 60000).toISOString();
    const result = await this.createCredentialCode(expirationTime);
    
    return {
      code: result.code,
      expiresAt: result.expiration,
      deviceName: deviceName,
      challenge: '' // Not needed in new API
    };
  }

  /**
   * Use a cross-device code to create a credential on another device
   */
  async createCredentialWithCrossDeviceCode(
    code: string,
    name: string,
    credentialKind: DfnsCredentialKind,
    options?: {
      username?: string;
      displayName?: string;
      curve?: DfnsSignatureType;
      password?: string;
    }
  ): Promise<CredentialCreationResult> {
    try {
      // Get credential challenge using the cross-device code
      const challenge = await this.getCredentialChallengeWithCode(code, {
        kind: credentialKind,
        name: name,
        ...options
      });

      // Create credential based on kind
      switch (credentialKind) {
        case DfnsCredentialKind.Fido2:
          return await this.createFido2CredentialWithChallenge(
            challenge,
            name,
            options?.username || 'user',
            options?.displayName || 'User'
          );
        
        case DfnsCredentialKind.Key:
          return await this.createKeyCredentialWithChallenge(
            challenge,
            name,
            options?.curve || DfnsSignatureType.Secp256k1
          );
        
        case DfnsCredentialKind.PasswordProtectedKey:
          if (!options?.password) {
            throw new Error('Password required for PasswordProtectedKey credential');
          }
          return await this.createPasswordProtectedKeyCredentialWithChallenge(
            challenge,
            name,
            options.password,
            options?.curve || DfnsSignatureType.Secp256k1
          );
        
        case DfnsCredentialKind.RecoveryKey:
          return await this.createRecoveryKeyCredentialWithChallenge(
            challenge,
            name,
            options?.curve || DfnsSignatureType.Secp256k1
          );
        
        default:
          throw new Error(`Unsupported credential kind: ${credentialKind}`);
      }
    } catch (error) {
      throw new Error(`Cross-device credential creation failed: ${(error as Error).message}`);
    }
  }

  // ===== Credential Management =====

  /**
   * List all credentials for the authenticated user
   * Returns DFNS-compliant credential information
   */
  async listCredentials(): Promise<DfnsCredentialInfo[]> {
    try {
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to list credentials');
      }

      const response = await fetch(`${this.config.baseUrl}/auth/credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list credentials: ${response.statusText}`);
      }

      const data = await response.json();
      // Handle DFNS standard response format: { items: DfnsCredentialInfo[] }
      return data.items || data.credentials || [];
    } catch (error) {
      throw new Error(`Failed to list credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Get credential details
   * Returns DFNS-compliant credential information
   */
  async getCredential(credentialId: string): Promise<DfnsCredentialInfo> {
    try {
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to get credential');
      }

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/${credentialId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get credential: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get credential: ${(error as Error).message}`);
    }
  }

  /**
   * Update credential (name, status)
   * Returns DFNS-compliant credential information
   */
  async updateCredential(
    credentialId: string,
    updates: {
      name?: string;
      status?: CredentialStatus;
      externalId?: string;
    }
  ): Promise<DfnsCredentialInfo> {
    try {
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to update credential');
      }

      // Get user action signature for updating
      const userActionSignature = await this.authenticator.signUserAction(
        'PUT',
        `/auth/credentials/${credentialId}`,
        updates
      );

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/${credentialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId,
          'X-DFNS-USERACTION': this.base64UrlEncode(JSON.stringify(userActionSignature))
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update credential: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to update credential: ${(error as Error).message}`);
    }
  }

  /**
   * Activate a credential using official DFNS API
   * Official DFNS API: PUT /auth/credentials/activate
   */
  async activateCredential(credentialUuid: string): Promise<{ message: string }> {
    try {
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to activate credential');
      }

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId
        },
        body: JSON.stringify({ credentialUuid })
      });

      if (!response.ok) {
        throw new Error(`Failed to activate credential: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to activate credential: ${(error as Error).message}`);
    }
  }

  /**
   * Deactivate a credential using official DFNS API
   * Official DFNS API: PUT /auth/credentials/deactivate
   */
  async deactivateCredential(credentialUuid: string): Promise<{ message: string }> {
    try {
      if (!this.authenticator.isAuthenticated()) {
        throw new Error('Authentication required to deactivate credential');
      }

      const response = await fetch(`${this.config.baseUrl}/auth/credentials/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authenticator.getAccessToken()}`,
          'X-DFNS-APPID': this.config.appId
        },
        body: JSON.stringify({ credentialUuid })
      });

      if (!response.ok) {
        throw new Error(`Failed to deactivate credential: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to deactivate credential: ${(error as Error).message}`);
    }
  }

  /**
   * @deprecated Use activateCredential() with credentialUuid instead
   * Legacy method for backward compatibility
   */
  async activateCredentialLegacy(credentialId: string): Promise<CredentialInfo> {
    const result = await this.updateCredential(credentialId, { status: CredentialStatus.Active });
    return this.mapToLegacyCredential(result);
  }

  /**
   * @deprecated Use deactivateCredential() with credentialUuid instead
   * Legacy method for backward compatibility
   */
  async deactivateCredentialLegacy(credentialId: string): Promise<CredentialInfo> {
    const result = await this.updateCredential(credentialId, { status: CredentialStatus.Inactive });
    return this.mapToLegacyCredential(result);
  }

  /**
   * Revoke a credential (cannot be reactivated)
   * @deprecated Use deactivateCredential() with credentialUuid instead
   */
  async revokeCredential(credentialId: string): Promise<CredentialInfo> {
    const result = await this.updateCredential(credentialId, { status: CredentialStatus.Revoked });
    return this.mapToLegacyCredential(result);
  }

  // ===== Password-Protected Key Utilities =====

  /**
   * Decrypt a password-protected private key
   */
  async decryptPrivateKey(
    encryptedPrivateKey: string,
    password: string,
    salt?: string,
    iv?: string
  ): Promise<string> {
    try {
      const key = await this.deriveKeyFromPassword(password, salt);
      const ivBuffer = iv ? this.base64ToArrayBuffer(iv) : crypto.getRandomValues(new Uint8Array(16));
      
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedPrivateKey);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        encryptedBuffer
      );
      
      return this.arrayBufferToBase64(decryptedBuffer);
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${(error as Error).message}`);
    }
  }

  /**
   * Recover private key from recovery code
   */
  async recoverPrivateKeyFromCode(recoveryCode: string): Promise<string> {
    try {
      // Parse recovery code and extract entropy
      const recoveryInfo = this.parseRecoveryCode(recoveryCode);
      
      // Derive private key from entropy
      const privateKey = await this.derivePrivateKeyFromEntropy(recoveryInfo.entropy);
      
      return privateKey;
    } catch (error) {
      throw new Error(`Failed to recover private key: ${(error as Error).message}`);
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Convert legacy CredentialInfo to DFNS-compliant DfnsCredentialInfo
   * Provides backward compatibility during transition
   */
  private mapLegacyCredential(legacy: CredentialInfo): DfnsCredentialInfo {
    return {
      id: legacy.id, // Required ID field
      credentialId: legacy.id, // Map old id to credentialId
      credentialUuid: legacy.id, // Use same value for UUID initially
      name: legacy.name,
      kind: legacy.kind,
      status: legacy.status === CredentialStatus.Active ? DfnsCredentialStatus.Active : DfnsCredentialStatus.Inactive, // Required status field
      isActive: legacy.status === CredentialStatus.Active,
      publicKey: legacy.publicKey,
      algorithm: legacy.algorithm,
      dateCreated: legacy.enrolledAt,
      lastUsedAt: legacy.lastUsedAt,
      enrolledAt: legacy.enrolledAt,
      attestationType: legacy.attestationType,
      authenticatorInfo: legacy.authenticatorInfo,
      externalId: legacy.externalId
    };
  }

  /**
   * Convert DFNS-compliant DfnsCredentialInfo to legacy CredentialInfo
   * Provides backward compatibility for legacy code
   */
  private mapToLegacyCredential(dfns: DfnsCredentialInfo): CredentialInfo {
    return {
      id: dfns.credentialUuid || dfns.credentialId,
      name: dfns.name || '',
      kind: dfns.kind,
      status: dfns.isActive ? CredentialStatus.Active : CredentialStatus.Inactive,
      publicKey: dfns.publicKey,
      algorithm: dfns.algorithm || '',
      attestationType: dfns.attestationType,
      authenticatorInfo: dfns.authenticatorInfo,
      enrolledAt: dfns.enrolledAt || dfns.dateCreated,
      lastUsedAt: dfns.lastUsedAt,
      externalId: dfns.externalId
    };
  }

  /**
   * Legacy method: List credentials with backward compatibility
   * @deprecated Use listCredentials() which now returns DfnsCredentialInfo[]
   */
  async listCredentialsLegacy(): Promise<CredentialInfo[]> {
    const dfnsCredentials = await this.listCredentials();
    return dfnsCredentials.map(cred => this.mapToLegacyCredential(cred));
  }

  /**
   * Legacy method: Get credential with backward compatibility
   * @deprecated Use getCredential() which now returns DfnsCredentialInfo
   */
  async getCredentialLegacy(credentialId: string): Promise<CredentialInfo> {
    const dfnsCredential = await this.getCredential(credentialId);
    return this.mapToLegacyCredential(dfnsCredential);
  }

  /**
   * Legacy method: Update credential with backward compatibility
   * @deprecated Use updateCredential() which now returns DfnsCredentialInfo
   */
  async updateCredentialLegacy(
    credentialId: string,
    updates: {
      name?: string;
      status?: CredentialStatus;
      externalId?: string;
    }
  ): Promise<CredentialInfo> {
    const dfnsCredential = await this.updateCredential(credentialId, updates);
    return this.mapToLegacyCredential(dfnsCredential);
  }

  /**
   * Generate cryptographic key pair
   */
  private async generateKeyPair(curve: DfnsSignatureType): Promise<{ privateKey: string; publicKey: string }> {
    let algorithm: EcKeyGenParams | { name: string };
    
    switch (curve) {
      case DfnsSignatureType.Secp256k1:
        // For production, use noble-secp256k1 library
        algorithm = { name: 'ECDSA', namedCurve: 'P-256' }; // Fallback
        break;
      case DfnsSignatureType.Secp256r1:
        algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
        break;
      case DfnsSignatureType.Ed25519:
        algorithm = { name: 'Ed25519' };
        break;
      default:
        throw new Error(`Unsupported curve: ${curve}`);
    }

    const keyPair = await crypto.subtle.generateKey(
      algorithm,
      true,
      ['sign', 'verify']
    ) as CryptoKeyPair; // Type assertion to ensure it's a CryptoKeyPair

    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);

    return {
      privateKey: this.arrayBufferToBase64(privateKeyBuffer),
      publicKey: this.arrayBufferToBase64(publicKeyBuffer)
    };
  }

  /**
   * Sign challenge with private key
   */
  private async signChallenge(
    challenge: string,
    privateKey: string,
    signatureType: DfnsSignatureType
  ): Promise<string> {
    const keyBuffer = this.base64ToArrayBuffer(privateKey);
    
    let algorithm: EcdsaParams | RsaPssParams | AlgorithmIdentifier;
    switch (signatureType) {
      case DfnsSignatureType.Secp256k1:
      case DfnsSignatureType.Secp256r1:
        algorithm = { name: 'ECDSA', hash: { name: 'SHA-256' } };
        break;
      case DfnsSignatureType.Ed25519:
        algorithm = { name: 'Ed25519' };
        break;
      default:
        throw new Error(`Unsupported signature type: ${signatureType}`);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      algorithm,
      false,
      ['sign']
    );

    const challengeBuffer = new TextEncoder().encode(challenge);
    const signatureBuffer = await crypto.subtle.sign(algorithm, cryptoKey, challengeBuffer);
    
    return this.arrayBufferToBase64Url(signatureBuffer);
  }

  /**
   * Encrypt private key with password
   */
  private async encryptPrivateKey(privateKey: string, password: string): Promise<PasswordProtectedKeyInfo> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    const key = await this.deriveKeyFromPassword(password, this.arrayBufferToBase64(salt.buffer));
    const privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      privateKeyBuffer
    );
    
    return {
      encryptedPrivateKey: this.arrayBufferToBase64(encryptedBuffer),
      salt: this.arrayBufferToBase64(salt.buffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      algorithm: 'AES-GCM',
      iterations: 100000
    };
  }

  /**
   * Derive encryption key from password
   */
  private async deriveKeyFromPassword(password: string, salt?: string): Promise<CryptoKey> {
    const saltBuffer = salt ? this.base64ToArrayBuffer(salt) : crypto.getRandomValues(new Uint8Array(16));
    
    const passwordBuffer = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate recovery code from private key
   */
  private async generateRecoveryCode(privateKey: string): Promise<RecoveryKeyInfo> {
    // Generate entropy from private key
    const privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
    const entropyBuffer = await crypto.subtle.digest('SHA-256', privateKeyBuffer);
    const entropy = this.arrayBufferToBase64(entropyBuffer);
    
    // Convert to BIP39-style words (simplified)
    const words = this.entropyToWords(entropy);
    const checksum = await this.calculateChecksum(entropy);
    const recoveryCode = words.join(' ');
    
    return {
      recoveryCode: recoveryCode,
      words: words,
      checksum: checksum,
      entropy: entropy
    };
  }

  /**
   * Parse recovery code and extract entropy
   */
  private parseRecoveryCode(recoveryCode: string): { entropy: string; words: string[] } {
    const words = recoveryCode.trim().split(/\s+/);
    
    if (words.length !== 12 && words.length !== 24) {
      throw new Error('Invalid recovery code length');
    }
    
    // Convert words back to entropy (simplified)
    const entropy = this.wordsToEntropy(words);
    
    return { entropy, words };
  }

  /**
   * Derive private key from entropy
   */
  private async derivePrivateKeyFromEntropy(entropy: string): Promise<string> {
    const entropyBuffer = this.base64ToArrayBuffer(entropy);
    
    // Use HKDF to derive private key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      entropyBuffer,
      'HKDF',
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('DFNS_RECOVERY_KEY'),
        info: new TextEncoder().encode('private_key')
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const derivedKeyBuffer = await crypto.subtle.exportKey('raw', derivedKey);
    return this.arrayBufferToBase64(derivedKeyBuffer);
  }

  /**
   * Get algorithm name for signature type
   */
  private getAlgorithmName(signatureType: DfnsSignatureType): string {
    switch (signatureType) {
      case DfnsSignatureType.Secp256k1:
        return 'ES256K';
      case DfnsSignatureType.Secp256r1:
        return 'ES256';
      case DfnsSignatureType.Ed25519:
        return 'EdDSA';
      default:
        return 'ES256';
    }
  }

  /**
   * Get relying party ID for WebAuthn
   */
  private getRelyingPartyId(): string {
    if (typeof window !== 'undefined') {
      return window.location.hostname;
    }
    return 'chaincapital.io'; // Fallback
  }

  /**
   * Extract public key from WebAuthn attestation
   */
  private extractPublicKeyFromAttestation(response: AuthenticatorAttestationResponse): string {
    // In a real implementation, you would parse the attestation object
    // and extract the public key from the authData
    // For now, return a placeholder
    return this.arrayBufferToBase64Url(response.getPublicKey() || new ArrayBuffer(0));
  }

  // ===== API Communication Methods =====

  /**
   * Get credential challenge from DFNS
   */
  private async getCredentialChallenge(request: any): Promise<{ challenge: string; challengeIdentifier: string }> {
    const response = await fetch(`${this.config.baseUrl}/auth/credentials/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DFNS-APPID': this.config.appId
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to get credential challenge: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get credential challenge with cross-device code
   */
  private async getCredentialChallengeWithCode(code: string, request: any): Promise<SigningChallenge> {
    const response = await fetch(`${this.config.baseUrl}/auth/credentials/cross-device/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DFNS-APPID': this.config.appId
      },
      body: JSON.stringify({
        code: code,
        ...request
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get credential challenge with code: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Ensure the response matches SigningChallenge interface
    return {
      challenge: data.challenge,
      challengeIdentifier: data.challengeIdentifier,
      allowCredentials: data.allowCredentials || { key: [], webauthn: [] },
      expiresAt: data.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString() // Default to 5 minutes from now
    };
  }

  /**
   * Register credential with DFNS
   */
  private async registerCredential(request: any): Promise<{ id: string }> {
    const response = await fetch(`${this.config.baseUrl}/auth/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DFNS-APPID': this.config.appId
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to register credential: ${response.statusText}`);
    }

    return await response.json();
  }

  // ===== Credential Creation with Challenge Methods =====
  // Note: Actual implementations are below in the IMPLEMENTATION section

  // ===== Utility Methods =====

  private base64UrlEncode(data: string): string {
    return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    return this.base64UrlEncode(this.arrayBufferToBase64(buffer));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ===== Simplified BIP39-style Word List Operations =====

  private entropyToWords(entropy: string): string[] {
    // Simplified implementation - in production use proper BIP39 library
    const entropyBytes = this.base64ToArrayBuffer(entropy);
    const words: string[] = [];
    const wordList = this.getSimpleWordList();
    
    for (let i = 0; i < entropyBytes.byteLength; i += 2) {
      const byte1 = i < entropyBytes.byteLength ? new Uint8Array(entropyBytes)[i] : 0;
      const byte2 = i + 1 < entropyBytes.byteLength ? new Uint8Array(entropyBytes)[i + 1] : 0;
      const index = (byte1 << 8) | byte2;
      words.push(wordList[index % wordList.length]);
    }
    
    return words.slice(0, 12); // Return 12 words
  }

  private wordsToEntropy(words: string[]): string {
    // Simplified implementation - in production use proper BIP39 library
    const wordList = this.getSimpleWordList();
    const bytes: number[] = [];
    
    for (let i = 0; i < words.length; i += 2) {
      const index1 = wordList.indexOf(words[i]) || 0;
      const index2 = i + 1 < words.length ? (wordList.indexOf(words[i + 1]) || 0) : 0;
      const combined = (index1 << 8) | index2;
      bytes.push((combined >> 8) & 0xFF);
      bytes.push(combined & 0xFF);
    }
    
    const buffer = new Uint8Array(bytes);
    return this.arrayBufferToBase64(buffer.buffer);
  }

  private async calculateChecksum(entropy: string): Promise<string> {
    const entropyBuffer = this.base64ToArrayBuffer(entropy);
    const hashBuffer = await crypto.subtle.digest('SHA-256', entropyBuffer);
    return this.arrayBufferToBase64(hashBuffer).slice(0, 8);
  }

  private getSimpleWordList(): string[] {
    // Simplified word list - in production use BIP39 word list
    return [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      // ... truncated for brevity - would include full 2048 word BIP39 list
    ];
  }

  // ===== IMPLEMENTATION: Missing Cross-Device Challenge Methods =====

  /**
   * Create Fido2 credential using existing challenge (for cross-device flow)
   */
  private async createFido2CredentialWithChallenge(
    challenge: CredentialSigningChallenge,
    name: string,
    username: string,
    displayName: string
  ): Promise<CredentialCreationResult> {
    if (!navigator.credentials) {
      throw new Error('WebAuthn not supported in this browser');
    }

    try {
      // Create WebAuthn credential with existing challenge
      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: this.base64UrlDecode(challenge.challenge),
          rp: {
            name: 'Chain Capital - DFNS',
            id: this.getRelyingPartyId()
          },
          user: {
            id: new TextEncoder().encode(username),
            name: username,
            displayName: displayName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256 (secp256r1)
            { alg: -257, type: 'public-key' }, // RS256
            { alg: -8, type: 'public-key' }    // EdDSA
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct',
          excludeCredentials: []
        }
      };

      const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('Failed to create WebAuthn credential');
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = this.arrayBufferToBase64Url(credential.rawId);
      const publicKey = this.extractPublicKeyFromAttestation(response);
      const attestationObject = this.arrayBufferToBase64Url(response.attestationObject);
      const clientDataJSON = this.arrayBufferToBase64Url(response.clientDataJSON);

      // Complete credential creation using existing challenge
      const registeredCredential = await this.createCredentialWithCode(
        challenge.challengeIdentifier,
        name,
        DfnsCredentialKind.Fido2,
        {
          credentialId: credentialId,
          publicKey: publicKey,
          attestationObject: attestationObject,
          clientDataJSON: clientDataJSON
        }
      );

      return registeredCredential;
    } catch (error) {
      throw new Error(`Cross-device Fido2 credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create Key credential using existing challenge (for cross-device flow)
   */
  private async createKeyCredentialWithChallenge(
    challenge: SigningChallenge,
    name: string,
    curve: DfnsSignatureType
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Sign challenge with new private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Complete credential creation using existing challenge
      const registeredCredential = await this.createCredentialWithCode(
        challenge.challengeIdentifier,
        name,
        DfnsCredentialKind.Key,
        {
          publicKey: keyPair.publicKey,
          signature: signature,
          algorithm: this.getAlgorithmName(curve)
        }
      );

      return {
        credentialId: registeredCredential.credentialId,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      throw new Error(`Cross-device Key credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create PasswordProtected credential using existing challenge (for cross-device flow)
   */
  private async createPasswordProtectedKeyCredentialWithChallenge(
    challenge: SigningChallenge,
    name: string,
    password: string,
    curve: DfnsSignatureType
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Encrypt private key with password
      const encryptedKeyInfo = await this.encryptPrivateKey(keyPair.privateKey, password);
      
      // Sign challenge with original private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Complete credential creation using existing challenge
      const registeredCredential = await this.createCredentialWithCode(
        challenge.challengeIdentifier,
        name,
        DfnsCredentialKind.PasswordProtectedKey,
        {
          publicKey: keyPair.publicKey,
          signature: signature,
          algorithm: this.getAlgorithmName(curve)
        },
        encryptedKeyInfo.encryptedPrivateKey
      );

      return {
        credentialId: registeredCredential.credentialId,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey: encryptedKeyInfo.encryptedPrivateKey
      };
    } catch (error) {
      throw new Error(`Cross-device PasswordProtected credential creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create Recovery credential using existing challenge (for cross-device flow)
   */
  private async createRecoveryKeyCredentialWithChallenge(
    challenge: SigningChallenge,
    name: string,
    curve: DfnsSignatureType
  ): Promise<CredentialCreationResult> {
    try {
      // Generate key pair
      const keyPair = await this.generateKeyPair(curve);
      
      // Generate recovery code
      const recoveryInfo = await this.generateRecoveryCode(keyPair.privateKey);
      
      // Sign challenge with private key
      const signature = await this.signChallenge(
        challenge.challenge, 
        keyPair.privateKey, 
        curve
      );
      
      // Complete credential creation using existing challenge
      const registeredCredential = await this.createCredentialWithCode(
        challenge.challengeIdentifier,
        name,
        DfnsCredentialKind.RecoveryKey,
        {
          publicKey: keyPair.publicKey,
          signature: signature,
          algorithm: this.getAlgorithmName(curve),
          recoveryCode: recoveryInfo.recoveryCode
        }
      );

      return {
        credentialId: registeredCredential.credentialId,
        publicKey: keyPair.publicKey,
        recoveryCode: recoveryInfo.recoveryCode
      };
    } catch (error) {
      throw new Error(`Cross-device Recovery credential creation failed: ${(error as Error).message}`);
    }
  }
}

// ===== Export =====

export default DfnsCredentialManager;
