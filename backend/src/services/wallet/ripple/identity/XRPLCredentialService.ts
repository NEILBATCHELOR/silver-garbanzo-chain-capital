/**
 * XRPL Credential Service - Backend Wrapper  
 * Verifiable Credentials functionality for XRPL (XLS-70)
 * 
 * This service provides:
 * - Credential issuance
 * - Credential acceptance
 * - Credential revocation
 * - Credential verification
 */

import {
  Client,
  Wallet,
  CredentialCreate,
  CredentialAccept,
  CredentialDelete
} from 'xrpl'

export interface CredentialData {
  type: string[]
  issuer: string
  subject: string
  credentialSubject: Record<string, any>
  issuanceDate: string
  expirationDate?: string
}

export class XRPLCredentialService {
  constructor(private client: Client) {}

  /**
   * Issue a verifiable credential
   */
  async issueCredential(params: {
    wallet: Wallet
    subject: string
    credentialType: string
    credentialData: Record<string, any>
    uri?: string
  }): Promise<{
    credentialId: string
    transactionHash: string
  }> {
    const tx: CredentialCreate = {
      TransactionType: 'CredentialCreate',
      Account: params.wallet.address,
      Subject: params.subject,
      CredentialType: params.credentialType,
      URI: params.uri
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Credential issuance failed: ${response.result.meta.TransactionResult}`)
      }
    }

    const credentialId = `${params.wallet.address}:${params.subject}`

    return {
      credentialId,
      transactionHash: response.result.hash
    }
  }

  /**
   * Accept a credential
   */
  async acceptCredential(params: {
    wallet: Wallet
    issuer: string
    credentialType: string
  }): Promise<{
    transactionHash: string
  }> {
    const tx: CredentialAccept = {
      TransactionType: 'CredentialAccept',
      Account: params.wallet.address,
      Issuer: params.issuer,
      CredentialType: params.credentialType
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Credential acceptance failed: ${response.result.meta.TransactionResult}`)
      }
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(params: {
    wallet: Wallet
    subject: string
    credentialType: string
  }): Promise<{
    transactionHash: string
  }> {
    const tx: CredentialDelete = {
      TransactionType: 'CredentialDelete',
      Account: params.wallet.address,
      Subject: params.subject,
      CredentialType: params.credentialType
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Credential revocation failed: ${response.result.meta.TransactionResult}`)
      }
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credentialId: string): Promise<{
    isValid: boolean
    issuer: string
    subject: string
    credentialType: string
    expirationDate?: string
  }> {
    const [issuer, subject] = credentialId.split(':')
    
    if (!issuer || !subject) {
      throw new Error('Invalid credential ID format')
    }

    const response = await this.client.request({
      command: 'account_objects',
      account: issuer,
      type: 'credential',
      ledger_index: 'validated'
    })

    // Safely handle account_objects which can be undefined
    const accountObjects = (response.result as any).account_objects || []
    const credential = accountObjects.find((obj: any) => 
      obj.Subject === subject
    )

    if (!credential) {
      throw new Error('Credential not found')
    }

    return {
      isValid: true,
      issuer: issuer,
      subject: subject,
      credentialType: (credential as any).CredentialType || 'unknown',
      expirationDate: (credential as any).Expiration
    }
  }

  /**
   * Get credentials for an account
   */
  async getCredentials(address: string): Promise<Array<{
    issuer: string
    subject: string
    credentialType: string
    uri?: string
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'credential',
      ledger_index: 'validated'
    })

    // Safely handle account_objects
    const accountObjects = (response.result as any).account_objects || []
    return accountObjects.map((obj: any) => ({
      issuer: obj.Issuer || address,
      subject: obj.Subject,
      credentialType: obj.CredentialType,
      uri: obj.URI
    }))
  }
}
