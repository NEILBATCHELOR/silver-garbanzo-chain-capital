/**
 * XRPL DID Types
 * Based on XLS-40 Decentralized Identifiers
 * W3C DID Standard: https://www.w3.org/TR/did-core/
 */

/**
 * W3C DID Document structure
 */
export interface DIDDocument {
  '@context': string[]
  id: string
  controller: string
  verificationMethod: Array<{
    id: string
    type: string
    controller: string
    publicKeyMultibase?: string
  }>
  authentication: string[]
  service?: Array<{
    id: string
    type: string
    serviceEndpoint: string
  }>
}

/**
 * Parameters for setting a DID
 */
export interface SetDIDParams {
  didDocument?: DIDDocument
  uri?: string
  data?: string
}

/**
 * Parameters for generating a DID document
 */
export interface GenerateDIDDocumentParams {
  accountAddress: string
  publicKey: string
  serviceEndpoints?: Array<{
    type: string
    endpoint: string
  }>
}

/**
 * Result from setting a DID
 */
export interface SetDIDResult {
  did: string
  transactionHash: string
}

/**
 * Result from deleting a DID
 */
export interface DeleteDIDResult {
  transactionHash: string
}

/**
 * DID verification result
 */
export interface DIDVerificationResult {
  isValid: boolean
  document: DIDDocument | null
  error?: string
}

/**
 * DID Resolution Result
 */
export interface DIDResolutionResult {
  did: string
  document: DIDDocument
  accountAddress: string
  uri?: string
  data?: string
  createdAt: string
  updatedAt: string
}

/**
 * Database record for DID
 */
export interface DIDRecord {
  id?: string
  project_id: string
  did: string
  account_address: string
  did_document: DIDDocument
  uri?: string
  data?: string
  status: 'active' | 'deleted'
  creation_transaction_hash: string
  deletion_transaction_hash?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
  metadata?: Record<string, any>
}

/**
 * DID Verification Record
 */
export interface DIDVerificationRecord {
  id?: string
  did_id: string
  verifier_address: string
  verification_type: string
  is_valid: boolean
  verification_data?: Record<string, any>
  verified_at?: string
}

/**
 * DID Update History Record
 */
export interface DIDUpdateHistoryRecord {
  id?: string
  did_id: string
  update_type: 'create' | 'update' | 'delete'
  old_document?: DIDDocument
  new_document?: DIDDocument
  transaction_hash: string
  updated_at?: string
}
