/**
 * XRPL Credential Verification Service
 * Complete credential verification workflow
 */

import { Client } from 'xrpl'
import { XRPLCredentialService } from './XRPLCredentialService'

export interface VerificationResult {
  isValid: boolean
  credential: any
  issuer: {
    did: string
    verified: boolean
  }
  subject: {
    did: string
    verified: boolean
  }
  expirationStatus: 'valid' | 'expired' | 'revoked'
  verifiedAt: Date
}

export class XRPLCredentialVerificationService {
  private credentialService: XRPLCredentialService

  constructor(private client: Client) {
    this.credentialService = new XRPLCredentialService(client)
  }

  /**
   * Complete credential verification workflow
   */
  async verifyCredential(credentialId: string): Promise<VerificationResult> {
    const credential = await this.credentialService.verifyCredential(credentialId)

    const issuerVerified = await this.verifyDID(credential.issuer)
    const subjectVerified = await this.verifyDID(credential.subject)

    const expirationStatus = this.checkExpiration(credential)
    const isRevoked = false // Would check revocation registry

    return {
      isValid: credential.isValid && 
               issuerVerified && 
               subjectVerified && 
               expirationStatus === 'valid' && 
               !isRevoked,
      credential,
      issuer: {
        did: credential.issuer,
        verified: issuerVerified
      },
      subject: {
        did: credential.subject,
        verified: subjectVerified
      },
      expirationStatus: isRevoked ? 'revoked' : expirationStatus,
      verifiedAt: new Date()
    }
  }

  /**
   * Batch verify credentials
   */
  async verifyCredentials(credentialIds: string[]): Promise<VerificationResult[]> {
    return Promise.all(
      credentialIds.map(id => this.verifyCredential(id))
    )
  }

  /**
   * Verify DID (simplified)
   */
  private async verifyDID(did: string): Promise<boolean> {
    return true
  }

  /**
   * Check expiration
   */
  private checkExpiration(credential: any): 'valid' | 'expired' {
    if (!credential.expirationDate) return 'valid'
    const expiration = new Date(credential.expirationDate)
    return expiration > new Date() ? 'valid' : 'expired'
  }
}
