/**
 * XRPL DID Service - Backend Wrapper
 * Decentralized Identifier functionality for XRPL (XLS-40)
 * 
 * This service provides:
 * - DID creation and management
 * - DID document handling
 * - DID resolution
 * - W3C DID standard compliance
 */

import {
  Client,
  Wallet,
  DIDSet,
  DIDDelete,
  convertStringToHex
} from 'xrpl'

export interface DIDDocument {
  context: string[]
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

export interface DIDSetParams {
  wallet: Wallet
  didDocument: DIDDocument
  uri?: string
  data?: string
}

export class XRPLDIDService {
  constructor(private client: Client) {}

  /**
   * Create or update DID
   */
  async setDID(params: DIDSetParams): Promise<{
    did: string
    transactionHash: string
  }> {
    const tx: DIDSet = {
      TransactionType: 'DIDSet',
      Account: params.wallet.address,
      DIDDocument: params.didDocument 
        ? convertStringToHex(JSON.stringify(params.didDocument))
        : undefined,
      URI: params.uri ? convertStringToHex(params.uri) : undefined,
      Data: params.data ? convertStringToHex(params.data) : undefined
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`DID set failed: ${response.result.meta.TransactionResult}`)
      }
    }

    const did = `did:xrpl:1:${params.wallet.address}`

    return {
      did,
      transactionHash: response.result.hash
    }
  }

  /**
   * Delete DID
   */
  async deleteDID(wallet: Wallet): Promise<{
    transactionHash: string
  }> {
    const tx: DIDDelete = {
      TransactionType: 'DIDDelete',
      Account: wallet.address
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`DID deletion failed: ${response.result.meta.TransactionResult}`)
      }
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Resolve DID to DID document
   */
  async resolveDID(did: string): Promise<DIDDocument> {
    const address = did.split(':').pop()!

    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'did',
      ledger_index: 'validated'
    })

    if (response.result.account_objects.length === 0) {
      throw new Error('DID not found')
    }

    const didObject = response.result.account_objects[0] as any
    const documentHex = didObject.DIDDocument
    const documentJson = Buffer.from(documentHex, 'hex').toString('utf8')

    return JSON.parse(documentJson)
  }

  /**
   * Generate DID document
   */
  generateDIDDocument(
    accountAddress: string,
    publicKey: string,
    serviceEndpoints?: Array<{ type: string; endpoint: string }>
  ): DIDDocument {
    const did = `did:xrpl:1:${accountAddress}`

    return {
      context: [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: did,
      controller: did,
      verificationMethod: [{
        id: `${did}#keys-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: publicKey
      }],
      authentication: [`${did}#keys-1`],
      service: serviceEndpoints?.map((endpoint, index) => ({
        id: `${did}#service-${index + 1}`,
        type: endpoint.type,
        serviceEndpoint: endpoint.endpoint
      }))
    }
  }

  /**
   * Verify DID document authenticity
   */
  async verifyDID(did: string): Promise<{
    isValid: boolean
    document: DIDDocument | null
    error?: string
  }> {
    try {
      const document = await this.resolveDID(did)
      
      const address = did.split(':').pop()!
      const isLinked = document.controller === did && 
                       document.id === did

      return {
        isValid: isLinked,
        document,
        error: isLinked ? undefined : 'DID document link invalid'
      }
    } catch (error) {
      return {
        isValid: false,
        document: null,
        error: (error as Error).message
      }
    }
  }
}
