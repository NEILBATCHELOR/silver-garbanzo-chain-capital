/**
 * XRPL Enhanced Credential Verification Service
 * Provides comprehensive credential verification workflows
 */

import { Client } from 'xrpl';
import { XRPLCredentialService } from '../credentials/XRPLCredentialService';
import { XRPLDIDService } from '../identity/XRPLDIDService';

export interface ComprehensiveVerificationResult {
  credentialId: string
  isValid: boolean
  
  // Credential details
  credential: {
    issuer: string
    subject: string
    credentialType: string
    data: Record<string, any>
    expiration?: number
    isExpired: boolean
  }
  
  // Issuer verification
  issuer: {
    did?: string
    didVerified: boolean
    address: string
  }
  
  // Subject verification
  subject: {
    did?: string
    didVerified: boolean
    address: string
  }
  
  // Status checks
  expirationStatus: 'valid' | 'expired' | 'revoked'
  isRevoked: boolean
  
  // Verification metadata
  verifiedAt: string
  verificationMethod: string
}

export class XRPLCredentialVerificationService {
  private credentialService: XRPLCredentialService
  private didService: XRPLDIDService

  constructor(private client: Client) {
    this.credentialService = new XRPLCredentialService(client);
    this.didService = new XRPLDIDService(client);
  }

  /**
   * Perform comprehensive credential verification
   * Includes DID verification for issuer and subject
   */
  async verifyCredentialComprehensive(
    credentialId: string
  ): Promise<ComprehensiveVerificationResult> {
    // 1. Verify credential exists and is valid
    const credential = await this.credentialService.verifyCredential(credentialId);

    // 2. Verify issuer DID (if exists)
    const issuerDID = await this.didService.getDIDForAccount(credential.issuer);
    let issuerDIDVerified = false;
    
    if (issuerDID) {
      const issuerVerification = await this.didService.verifyDID(issuerDID);
      issuerDIDVerified = issuerVerification.isValid;
    }

    // 3. Verify subject DID (if exists)
    const subjectDID = await this.didService.getDIDForAccount(credential.subject);
    let subjectDIDVerified = false;
    
    if (subjectDID) {
      const subjectVerification = await this.didService.verifyDID(subjectDID);
      subjectDIDVerified = subjectVerification.isValid;
    }

    // 4. Check expiration
    const expirationStatus = this.checkExpiration(credential);

    // 5. Check revocation (placeholder - would need revocation registry)
    const isRevoked = false; // await this.checkRevocation(credentialId);

    // 6. Compile comprehensive result
    const isValid = 
      credential.isValid && 
      !credential.isExpired && 
      expirationStatus === 'valid' && 
      !isRevoked;

    return {
      credentialId,
      isValid,
      credential: {
        issuer: credential.issuer,
        subject: credential.subject,
        credentialType: credential.credentialType,
        data: credential.data,
        expiration: credential.expiration,
        isExpired: credential.isExpired
      },
      issuer: {
        did: issuerDID || undefined,
        didVerified: issuerDIDVerified,
        address: credential.issuer
      },
      subject: {
        did: subjectDID || undefined,
        didVerified: subjectDIDVerified,
        address: credential.subject
      },
      expirationStatus: isRevoked ? 'revoked' : expirationStatus,
      isRevoked,
      verifiedAt: new Date().toISOString(),
      verificationMethod: 'comprehensive'
    };
  }

  /**
   * Batch verify multiple credentials
   */
  async verifyCredentialsBatch(
    credentialIds: string[]
  ): Promise<ComprehensiveVerificationResult[]> {
    return Promise.all(
      credentialIds.map(id => this.verifyCredentialComprehensive(id))
    );
  }

  /**
   * Verify credential with specific issuer DID requirement
   */
  async verifyCredentialWithIssuerDID(
    credentialId: string,
    requireIssuerDID: boolean = true
  ): Promise<ComprehensiveVerificationResult> {
    const result = await this.verifyCredentialComprehensive(credentialId);

    if (requireIssuerDID && !result.issuer.did) {
      return {
        ...result,
        isValid: false
      };
    }

    if (requireIssuerDID && result.issuer.did && !result.issuer.didVerified) {
      return {
        ...result,
        isValid: false
      };
    }

    return result;
  }

  /**
   * Verify credential with specific subject DID requirement
   */
  async verifyCredentialWithSubjectDID(
    credentialId: string,
    requireSubjectDID: boolean = true
  ): Promise<ComprehensiveVerificationResult> {
    const result = await this.verifyCredentialComprehensive(credentialId);

    if (requireSubjectDID && !result.subject.did) {
      return {
        ...result,
        isValid: false
      };
    }

    if (requireSubjectDID && result.subject.did && !result.subject.didVerified) {
      return {
        ...result,
        isValid: false
      };
    }

    return result;
  }

  /**
   * Get all credentials for an account and verify them
   */
  async getAndVerifyAccountCredentials(
    address: string
  ): Promise<ComprehensiveVerificationResult[]> {
    const accountCredentials = await this.credentialService.getAccountCredentials(address);
    
    return Promise.all(
      accountCredentials.map(cred => this.verifyCredentialComprehensive(cred.credentialId))
    );
  }

  /**
   * Check expiration status
   */
  private checkExpiration(credential: any): 'valid' | 'expired' {
    if (!credential.expiration) return 'valid';
    return credential.expiration > Math.floor(Date.now() / 1000) 
      ? 'valid' 
      : 'expired';
  }

  /**
   * Check if credential is revoked
   * TODO: Implement revocation registry checking
   */
  private async checkRevocation(credentialId: string): Promise<boolean> {
    // This would check against a revocation registry
    // For now, return false (not revoked)
    return false;
  }
}
