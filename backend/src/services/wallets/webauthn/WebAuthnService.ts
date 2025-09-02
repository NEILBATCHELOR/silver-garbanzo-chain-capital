import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import * as crypto from 'crypto'

export interface WebAuthnCredential {
  id: string
  credentialId: string
  publicKeyX: string
  publicKeyY: string
  authenticatorData?: string
  isPrimary: boolean
  deviceName?: string
  platform?: string
  createdAt: string
  updatedAt: string
}

export interface WebAuthnRegistrationOptions {
  challenge: string
  rp: {
    id: string
    name: string
  }
  user: {
    id: string
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    type: 'public-key'
    alg: number // -7 for ES256 (secp256r1)
  }>
  timeout: number
  attestation: 'none' | 'indirect' | 'direct'
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform'
    userVerification: 'required' | 'preferred' | 'discouraged'
  }
}

export interface WebAuthnAuthenticationOptions {
  challenge: string
  timeout: number
  rpId: string
  allowCredentials: Array<{
    type: 'public-key'
    id: string
  }>
  userVerification: 'required' | 'preferred' | 'discouraged'
}

export interface WebAuthnRegistrationResponse {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    attestationObject: string
  }
  type: 'public-key'
}

export interface WebAuthnAuthenticationResponse {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle?: string
  }
  type: 'public-key'
}

/**
 * WebAuthnService - Passkey Authentication Service
 * 
 * Implements WebAuthn/FIDO2 with P-256 (secp256r1) signature verification
 * for passwordless authentication using passkeys, Touch ID, Face ID, etc.
 * 
 * Note: Currently uses placeholder implementation until database schema is updated.
 */
export class WebAuthnService extends BaseService {
  
  constructor() {
    super('WebAuthn')
  }

  /**
   * Generate WebAuthn registration options for credential creation
   */
  async generateRegistrationOptions(
    walletId: string,
    userId: string,
    userName: string,
    userDisplayName: string
  ): Promise<ServiceResult<WebAuthnRegistrationOptions>> {
    try {
      // Generate cryptographically secure challenge
      const challenge = this.generateChallenge()

      // Store challenge temporarily for verification
      await this.storeChallenge(walletId, challenge, 'registration')

      const options: WebAuthnRegistrationOptions = {
        challenge,
        rp: {
          id: 'chaincapital.com', // This should be configurable
          name: 'Chain Capital'
        },
        user: {
          id: userId,
          name: userName,
          displayName: userDisplayName
        },
        pubKeyCredParams: [
          {
            type: 'public-key',
            alg: -7 // ES256 - ECDSA with P-256 curve and SHA-256
          }
        ],
        timeout: 60000, // 60 seconds
        attestation: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Prefer platform authenticators (Touch ID, Face ID)
          userVerification: 'required'
        }
      }

      this.logger.info({ walletId, userId }, 'Generated WebAuthn registration options')
      return this.success(options)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to generate registration options')
      return this.error('Failed to generate registration options', 'REGISTRATION_OPTIONS_ERROR')
    }
  }

  /**
   * Verify WebAuthn registration response and store credential
   */
  async verifyRegistration(
    walletId: string,
    registrationResponse: WebAuthnRegistrationResponse,
    expectedChallenge: string,
    deviceName?: string,
    platform?: string
  ): Promise<ServiceResult<WebAuthnCredential>> {
    try {
      // Verify the challenge
      const challengeValid = await this.verifyChallenge(walletId, expectedChallenge, 'registration')
      if (!challengeValid) {
        return this.error('Invalid or expired challenge', 'INVALID_CHALLENGE')
      }

      // Parse client data JSON
      const clientData = JSON.parse(
        Buffer.from(registrationResponse.response.clientDataJSON, 'base64').toString()
      )

      // Verify client data
      if (clientData.type !== 'webauthn.create') {
        return this.error('Invalid client data type', 'INVALID_CLIENT_DATA')
      }

      if (clientData.challenge !== expectedChallenge) {
        return this.error('Challenge mismatch', 'CHALLENGE_MISMATCH')
      }

      // Parse attestation object and extract public key
      const publicKey = await this.extractPublicKeyFromAttestation(
        registrationResponse.response.attestationObject
      )

      if (!publicKey) {
        return this.error('Failed to extract public key', 'PUBLIC_KEY_EXTRACTION_FAILED')
      }

      // Store credential (placeholder until schema is updated)
      const credential = {
        id: this.generateId(),
        credential_id: registrationResponse.id,
        public_key_x: publicKey.x,
        public_key_y: publicKey.y,
        authenticator_data: registrationResponse.response.attestationObject,
        is_primary: await this.isFirstCredential(walletId),
        device_name: deviceName,
        platform: platform,
        created_at: new Date(),
        updated_at: new Date()
      }

      this.logger.info({ 
        walletId, 
        credentialId: registrationResponse.id 
      }, 'WebAuthn credential registered (placeholder)')

      return this.success(this.mapToWebAuthnCredential(credential))

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to verify registration')
      return this.error('Failed to verify registration', 'REGISTRATION_VERIFICATION_ERROR')
    }
  }

  /**
   * Generate WebAuthn authentication options for signing
   */
  async generateAuthenticationOptions(
    walletId: string
  ): Promise<ServiceResult<WebAuthnAuthenticationOptions>> {
    try {
      // Generate challenge
      const challenge = this.generateChallenge()

      // Store challenge for verification
      await this.storeChallenge(walletId, challenge, 'authentication')

      // Get existing credentials for wallet (placeholder)
      const credentials = await this.getWalletCredentials(walletId)

      const options: WebAuthnAuthenticationOptions = {
        challenge,
        timeout: 60000,
        rpId: 'chaincapital.com',
        allowCredentials: credentials.data!.map(cred => ({
          type: 'public-key' as const,
          id: cred.credentialId
        })),
        userVerification: 'required'
      }

      this.logger.info({ walletId }, 'Generated WebAuthn authentication options')
      return this.success(options)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to generate authentication options')
      return this.error('Failed to generate authentication options', 'AUTHENTICATION_OPTIONS_ERROR')
    }
  }

  /**
   * Verify WebAuthn authentication response
   */
  async verifyAuthentication(
    walletId: string,
    authenticationResponse: WebAuthnAuthenticationResponse,
    expectedChallenge: string
  ): Promise<ServiceResult<{ verified: boolean; credentialId: string }>> {
    try {
      // Verify challenge
      const challengeValid = await this.verifyChallenge(walletId, expectedChallenge, 'authentication')
      if (!challengeValid) {
        return this.error('Invalid or expired challenge', 'INVALID_CHALLENGE')
      }

      // Get credential
      const credential = await this.getCredentialById(walletId, authenticationResponse.id)
      if (!credential.success) {
        return this.error('Credential not found', 'CREDENTIAL_NOT_FOUND')
      }

      // Parse client data
      const clientData = JSON.parse(
        Buffer.from(authenticationResponse.response.clientDataJSON, 'base64').toString()
      )

      // Verify client data
      if (clientData.type !== 'webauthn.get') {
        return this.error('Invalid client data type', 'INVALID_CLIENT_DATA')
      }

      if (clientData.challenge !== expectedChallenge) {
        return this.error('Challenge mismatch', 'CHALLENGE_MISMATCH')
      }

      // Verify signature using secp256r1
      const isValid = await this.verifySecp256r1Signature(
        {
          x: credential.data!.publicKeyX,
          y: credential.data!.publicKeyY
        },
        Buffer.from(authenticationResponse.response.signature, 'base64'),
        this.createSignedData(
          authenticationResponse.response.authenticatorData,
          authenticationResponse.response.clientDataJSON
        )
      )

      if (!isValid) {
        return this.error('Invalid signature', 'INVALID_SIGNATURE')
      }

      this.logger.info({ 
        walletId, 
        credentialId: authenticationResponse.id 
      }, 'WebAuthn authentication verified')

      return this.success({
        verified: true,
        credentialId: authenticationResponse.id
      })

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to verify authentication')
      return this.error('Failed to verify authentication', 'AUTHENTICATION_VERIFICATION_ERROR')
    }
  }

  /**
   * Sign arbitrary message using WebAuthn credential
   */
  async signMessage(
    walletId: string,
    credentialId: string,
    message: string,
    authenticationResponse: WebAuthnAuthenticationResponse
  ): Promise<ServiceResult<{ signature: string; publicKey: { x: string; y: string } }>> {
    try {
      // Get credential
      const credential = await this.getCredentialById(walletId, credentialId)
      if (!credential.success) {
        return this.error('Credential not found', 'CREDENTIAL_NOT_FOUND')
      }

      // Verify the WebAuthn response includes our message
      const clientData = JSON.parse(
        Buffer.from(authenticationResponse.response.clientDataJSON, 'base64').toString()
      )

      // In a real implementation, the message would be included in the challenge
      // For now, we'll verify the signature is valid

      const isValid = await this.verifySecp256r1Signature(
        {
          x: credential.data!.publicKeyX, 
          y: credential.data!.publicKeyY
        },
        Buffer.from(authenticationResponse.response.signature, 'base64'),
        this.createSignedData(
          authenticationResponse.response.authenticatorData,
          authenticationResponse.response.clientDataJSON
        )
      )

      if (!isValid) {
        return this.error('Invalid signature', 'INVALID_SIGNATURE')
      }

      return this.success({
        signature: authenticationResponse.response.signature,
        publicKey: {
          x: credential.data!.publicKeyX,
          y: credential.data!.publicKeyY
        }
      })

    } catch (error) {
      this.logger.error({ error, walletId, credentialId }, 'Failed to sign message')
      return this.error('Failed to sign message', 'MESSAGE_SIGNING_ERROR')
    }
  }

  /**
   * Get all credentials for a wallet
   */
  async getWalletCredentials(walletId: string): Promise<ServiceResult<WebAuthnCredential[]>> {
    try {
      // Get credentials from database (placeholder)
      const credentials: any[] = [] // Placeholder for non-existent table access

      const webAuthnCredentials = credentials.map((cred: any) => this.mapToWebAuthnCredential(cred))
      return this.success(webAuthnCredentials)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to get wallet credentials')
      return this.error('Failed to get wallet credentials', 'CREDENTIAL_LIST_ERROR')
    }
  }

  /**
   * Get credential by ID
   */
  async getCredentialById(walletId: string, credentialId: string): Promise<ServiceResult<WebAuthnCredential>> {
    try {
      // Get credential from database (placeholder)
      const credential = null // Placeholder for non-existent table access

      if (!credential) {
        return this.error('Credential not found', 'CREDENTIAL_NOT_FOUND', 404)
      }

      return this.success(this.mapToWebAuthnCredential(credential))

    } catch (error) {
      this.logger.error({ error, walletId, credentialId }, 'Failed to get credential')
      return this.error('Failed to get credential', 'CREDENTIAL_RETRIEVAL_ERROR')
    }
  }

  /**
   * Remove credential from wallet
   */
  async removeCredential(walletId: string, credentialId: string): Promise<ServiceResult<boolean>> {
    try {
      // Remove credential from database (placeholder)
      this.logger.info('Would remove credential (placeholder)')

      // If this was the primary credential, set another as primary
      await this.ensurePrimaryCredential(walletId)

      this.logger.info({ walletId, credentialId }, 'WebAuthn credential removed (placeholder)')
      return this.success(true)

    } catch (error) {
      this.logger.error({ error, walletId, credentialId }, 'Failed to remove credential')
      return this.error('Failed to remove credential', 'CREDENTIAL_REMOVAL_ERROR')
    }
  }

  /**
   * Set credential as primary
   */
  async setPrimaryCredential(walletId: string, credentialId: string): Promise<ServiceResult<boolean>> {
    try {
      // Update credentials in database (placeholder)
      this.logger.info('Would update primary credential (placeholder)')

      this.logger.info({ walletId, credentialId }, 'Primary credential updated (placeholder)')
      return this.success(true)

    } catch (error) {
      this.logger.error({ error, walletId, credentialId }, 'Failed to set primary credential')
      return this.error('Failed to set primary credential', 'PRIMARY_CREDENTIAL_ERROR')
    }
  }

  /**
   * Generate passkey credential for wallet authentication
   */
  async generatePasskeyCredential(
    walletId: string,
    userId: string,
    userName: string,
    userDisplayName: string
  ): Promise<ServiceResult<WebAuthnRegistrationOptions>> {
    try {
      // This is essentially the same as generateRegistrationOptions but with passkey-specific naming
      return await this.generateRegistrationOptions(walletId, userId, userName, userDisplayName)
      
    } catch (error) {
      this.logger.error({ error, walletId, userId }, 'Failed to generate passkey credential')
      return this.error('Failed to generate passkey credential', 'PASSKEY_GENERATION_ERROR')
    }
  }

  /**
   * Verify passkey signature for authentication
   */
  async verifyPasskeySignature(
    walletId: string,
    signature: string,
    challenge: string,
    credentialId: string
  ): Promise<ServiceResult<{ verified: boolean; credentialId: string }>> {
    try {
      // Get credential to get public key
      const credential = await this.getCredentialById(walletId, credentialId)
      if (!credential.success) {
        return this.error('Credential not found', 'CREDENTIAL_NOT_FOUND')
      }

      // Verify the P-256 signature using the stored public key
      const publicKey = {
        x: credential.data!.publicKeyX,
        y: credential.data!.publicKeyY
      }

      // Create signed data for verification (simplified for passkey)
      const signedData = Buffer.from(challenge, 'base64')
      const signatureBuffer = Buffer.from(signature, 'base64')

      const isValid = await this.verifySecp256r1Signature(
        publicKey,
        signatureBuffer,
        signedData
      )

      this.logger.info({
        walletId,
        credentialId,
        verified: isValid
      }, 'Passkey signature verified')

      return this.success({
        verified: isValid,
        credentialId
      })
      
    } catch (error) {
      this.logger.error({ error, walletId, credentialId }, 'Failed to verify passkey signature')
      return this.error('Failed to verify passkey signature', 'PASSKEY_VERIFICATION_ERROR')
    }
  }

  /**
   * Register a new passkey for the wallet
   */
  async registerPasskey(
    walletId: string,
    registrationResponse: WebAuthnRegistrationResponse,
    expectedChallenge: string,
    deviceName?: string,
    platform?: string
  ): Promise<ServiceResult<WebAuthnCredential>> {
    try {
      // This is essentially the same as verifyRegistration but with passkey-specific naming
      return await this.verifyRegistration(
        walletId,
        registrationResponse,
        expectedChallenge,
        deviceName || 'Passkey Device',
        platform || 'Unknown Platform'
      )
      
    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to register passkey')
      return this.error('Failed to register passkey', 'PASSKEY_REGISTRATION_ERROR')
    }
  }

  /**
   * Store credential for migration (used by SignatureMigrationService)
   */
  async storeCredentialForMigration(
    walletId: string,
    migrationData: { credentialId: string; publicKey: string; migrationId: string }
  ): Promise<ServiceResult<boolean>> {
    try {
      // Store credential data for migration process
      this.logger.info({
        walletId,
        credentialId: migrationData.credentialId,
        migrationId: migrationData.migrationId
      }, 'Storing credential for migration (placeholder)')
      
      return this.success(true)
      
    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to store credential for migration')
      return this.error('Failed to store credential for migration', 'MIGRATION_STORE_ERROR')
    }
  }

  /**
   * Validate public key format (used by SignatureMigrationService)
   */
  async validatePublicKey(publicKey: string): Promise<ServiceResult<boolean>> {
    try {
      // Validate WebAuthn P-256 public key format
      if (!publicKey || publicKey.length < 64) {
        return this.error('Invalid public key format', 'INVALID_PUBLIC_KEY_FORMAT')
      }
      
      // Additional P-256 validation could be added here
      this.logger.debug({ publicKey: publicKey.substring(0, 10) + '...' }, 'Public key validated')
      
      return this.success(true)
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to validate public key')
      return this.error('Failed to validate public key', 'PUBLIC_KEY_VALIDATION_ERROR')
    }
  }

  /**
   * Register credential (used by UnifiedWalletInterface)
   */
  async registerCredential(
    walletId: string,
    credentialData: {
      credentialId: string
      publicKeyX: string
      publicKeyY: string
      deviceName?: string
      platform?: string
    }
  ): Promise<ServiceResult<WebAuthnCredential>> {
    try {
      const credential = {
        id: this.generateId(),
        credential_id: credentialData.credentialId,
        public_key_x: credentialData.publicKeyX,
        public_key_y: credentialData.publicKeyY,
        is_primary: await this.isFirstCredential(walletId),
        device_name: credentialData.deviceName,
        platform: credentialData.platform,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      this.logger.info({
        walletId,
        credentialId: credentialData.credentialId
      }, 'Credential registered (placeholder)')
      
      return this.success(this.mapToWebAuthnCredential(credential))
      
    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to register credential')
      return this.error('Failed to register credential', 'CREDENTIAL_REGISTRATION_ERROR')
    }
  }

  /**
   * List credentials (used by UnifiedWalletInterface)
   */
  async listCredentials(walletId: string): Promise<ServiceResult<WebAuthnCredential[]>> {
    try {
      // This is the same as getWalletCredentials but with a different name
      return await this.getWalletCredentials(walletId)
      
    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to list credentials')
      return this.error('Failed to list credentials', 'CREDENTIAL_LIST_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private generateChallenge(): string {
    // Generate 32 bytes of secure random data and base64 encode
    return crypto.randomBytes(32).toString('base64url')
  }



  private async storeChallenge(
    walletId: string, 
    challenge: string, 
    type: 'registration' | 'authentication'
  ): Promise<void> {
    // Store challenge in database with expiry (placeholder)
    this.logger.debug({ walletId, challenge, type }, 'Storing challenge (placeholder)')
  }

  private async verifyChallenge(
    walletId: string,
    challenge: string,
    type: 'registration' | 'authentication'
  ): Promise<boolean> {
    // Verify challenge exists and hasn't expired (placeholder)
    this.logger.debug({ walletId, challenge, type }, 'Verifying challenge (placeholder)')
    return true // Placeholder - always return true
  }

  private async extractPublicKeyFromAttestation(attestationObject: string): Promise<{ x: string; y: string } | null> {
    try {
      // Parse CBOR attestation object and extract public key
      // This would use a CBOR library to decode the attestation
      
      // Placeholder implementation - in reality this would:
      // 1. Decode CBOR attestation object
      // 2. Extract authData from attestation statement
      // 3. Parse credential public key from authData
      // 4. Ensure it's a P-256 key (alg -7)
      // 5. Return x,y coordinates as hex strings
      
      return {
        x: '0x' + crypto.randomBytes(32).toString('hex'),
        y: '0x' + crypto.randomBytes(32).toString('hex')
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to extract public key from attestation')
      return null
    }
  }

  private async verifySecp256r1Signature(
    publicKey: { x: string; y: string },
    signature: Buffer,
    signedData: Buffer
  ): Promise<boolean> {
    try {
      // Verify P-256 (secp256r1) ECDSA signature
      // This is the core WebAuthn signature verification
      
      // Parse DER-encoded signature to extract r,s values
      const { r, s } = this.parseDERSignature(signature)
      
      // Create public key object for verification
      const publicKeyBuffer = this.createP256PublicKey(publicKey.x, publicKey.y)
      
      // Verify signature using Node.js crypto
      const verifier = crypto.createVerify('SHA256')
      verifier.update(signedData)
      
      // Convert to proper format for verification
      const keyObject = crypto.createPublicKey({
        key: publicKeyBuffer,
        format: 'der',
        type: 'spki'
      })
      
      return verifier.verify(keyObject, signature)
      
    } catch (error) {
      this.logger.error({ error, publicKey }, 'Failed to verify secp256r1 signature')
      return false
    }
  }

  private parseDERSignature(signature: Buffer): { r: Buffer; s: Buffer } {
    // Parse DER-encoded ECDSA signature
    // This is a simplified parser - production should use a proper ASN.1 library
    
    try {
      let offset = 0
      
      // Check SEQUENCE tag
      if (signature[offset] !== 0x30) {
        throw new Error('Invalid DER signature - missing SEQUENCE tag')
      }
      offset += 2 // Skip tag and length
      
      // Parse r INTEGER
      if (signature[offset] !== 0x02) {
        throw new Error('Invalid DER signature - missing r INTEGER tag')  
      }
      offset += 1
      const rLength = signature[offset]
      if (rLength === undefined) {
        throw new Error('Invalid DER signature - missing r length')
      }
      offset += 1
      const r = signature.subarray(offset, offset + rLength)
      offset += rLength
      
      // Parse s INTEGER
      if (signature[offset] !== 0x02) {
        throw new Error('Invalid DER signature - missing s INTEGER tag')
      }
      offset += 1
      const sLength = signature[offset]
      if (sLength === undefined) {
        throw new Error('Invalid DER signature - missing s length')
      }
      offset += 1
      const s = signature.subarray(offset, offset + sLength)
      
      return { r, s }
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse DER signature')
      throw error
    }
  }

  private createP256PublicKey(x: string, y: string): Buffer {
    // Create DER-encoded P-256 public key from x,y coordinates
    // This would create a proper ASN.1 DER structure
    
    // Remove '0x' prefix if present
    const xHex = x.startsWith('0x') ? x.slice(2) : x
    const yHex = y.startsWith('0x') ? y.slice(2) : y
    
    // Create uncompressed public key (0x04 + x + y)
    const publicKeyBytes = Buffer.concat([
      Buffer.from([0x04]), // Uncompressed point indicator
      Buffer.from(xHex, 'hex'),
      Buffer.from(yHex, 'hex')
    ])
    
    // Wrap in proper DER structure for SPKI format
    // This is simplified - production should use proper ASN.1 encoding
    const derHeader = Buffer.from([
      0x30, 0x59, // SEQUENCE, length 89
      0x30, 0x13, // SEQUENCE, length 19
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID: ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID: secp256r1
      0x03, 0x42, 0x00 // BIT STRING, length 66, unused bits 0
    ])
    
    return Buffer.concat([derHeader, publicKeyBytes])
  }

  private createSignedData(authenticatorData: string, clientDataJSON: string): Buffer {
    // Create the data that was actually signed during WebAuthn ceremony
    const authData = Buffer.from(authenticatorData, 'base64')
    const clientDataHash = crypto.createHash('sha256')
      .update(Buffer.from(clientDataJSON, 'base64'))
      .digest()
    
    return Buffer.concat([authData, clientDataHash])
  }

  private async isFirstCredential(walletId: string): Promise<boolean> {
    // Check if this is the first credential for the wallet (placeholder)
    return true // Placeholder - always return true
  }

  private async ensurePrimaryCredential(walletId: string): Promise<void> {
    // Ensure there's always a primary credential (placeholder)
    this.logger.debug({ walletId }, 'Ensuring primary credential (placeholder)')
  }

  private mapToWebAuthnCredential(credential: any): WebAuthnCredential {
    return {
      id: credential.id,
      credentialId: credential.credential_id,
      publicKeyX: credential.public_key_x,
      publicKeyY: credential.public_key_y,
      authenticatorData: credential.authenticator_data,
      isPrimary: credential.is_primary,
      deviceName: credential.device_name,
      platform: credential.platform,
      createdAt: credential.created_at.toISOString(),
      updatedAt: credential.updated_at.toISOString()
    }
  }
}
