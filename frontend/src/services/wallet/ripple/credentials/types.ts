/**
 * XRPL Credential Types
 * Based on XRPL Credentials feature for blockchain-based verifiable credentials
 * https://xrpl.org/docs/concepts/tokens/decentralized-identifiers/credentials
 */

/**
 * Credential data that can be stored on-chain
 */
export interface CredentialData {
  credentialType: string
  subject: string
  issuer: string
  expiration?: number
  data: Record<string, any>
}

/**
 * Parameters for issuing a credential
 */
export interface IssueCredentialParams {
  subject: string
  credentialType: string
  data: Record<string, any>
  expiration?: number
}

/**
 * Parameters for accepting a credential
 */
export interface AcceptCredentialParams {
  credentialId: string
}

/**
 * Parameters for deleting a credential
 */
export interface DeleteCredentialParams {
  credentialId: string
}

/**
 * Result from issuing a credential
 */
export interface IssueCredentialResult {
  credentialId: string
  transactionHash: string
}

/**
 * Result from accepting a credential
 */
export interface AcceptCredentialResult {
  transactionHash: string
}

/**
 * Result from deleting a credential
 */
export interface DeleteCredentialResult {
  transactionHash: string
}

/**
 * Verified credential information
 */
export interface VerifiedCredential {
  isValid: boolean
  issuer: string
  subject: string
  credentialType: string
  data: Record<string, any>
  expiration?: number
  isExpired: boolean
}

/**
 * Account credential summary
 */
export interface AccountCredential {
  credentialId: string
  issuer: string
  subject: string
  credentialType: string
  expiration?: number
}

/**
 * Credential verification result
 */
export interface CredentialVerification {
  credentialId: string
  isValid: boolean
  issuer: string
  subject: string
  credentialType: string
  data: Record<string, any>
  expiration?: number
  isExpired: boolean
  verifiedAt: string
}
