/**
 * XRPL DID Service
 * Manages Decentralized Identifiers (DID) on XRPL
 * Based on XLS-40 specification
 * 
 * Reference: /Users/neilbatchelor/Downloads/xrpl-dev-portal-master/_code-samples/did/
 */

import { Client, Wallet, DIDSet, DIDDelete } from 'xrpl';
import {
  SetDIDParams,
  SetDIDResult,
  DeleteDIDResult,
  DIDDocument,
  GenerateDIDDocumentParams,
  DIDVerificationResult,
  DIDResolutionResult
} from './did-types';

/**
 * Convert string to hex for XRPL
 */
const convertStringToHex = (str: string): string => {
  return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
};

/**
 * Convert hex to string
 */
const convertHexToString = (hex: string): string => {
  return Buffer.from(hex, 'hex').toString('utf8');
};

export class XRPLDIDService {
  constructor(private client: Client) {}

  /**
   * Set or update a DID for an account
   * 1. Creates/updates DID on blockchain
   * 2. Database operations should be handled separately
   */
  async setDID(
    wallet: Wallet,
    params: SetDIDParams
  ): Promise<SetDIDResult> {
    const tx: DIDSet = {
      TransactionType: 'DIDSet',
      Account: wallet.address,
      DIDDocument: params.didDocument 
        ? convertStringToHex(JSON.stringify(params.didDocument))
        : undefined,
      URI: params.uri ? convertStringToHex(params.uri) : undefined,
      Data: params.data ? convertStringToHex(params.data) : undefined
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `DID set failed: ${response.result.meta.TransactionResult}`
      );
    }

    const did = `did:xrpl:1:${wallet.address}`;

    return {
      did,
      transactionHash: response.result.hash
    };
  }

  /**
   * Delete a DID from an account
   */
  async deleteDID(wallet: Wallet): Promise<DeleteDIDResult> {
    const tx: DIDDelete = {
      TransactionType: 'DIDDelete',
      Account: wallet.address
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `DID deletion failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Resolve a DID to its DID document (blockchain query)
   */
  async resolveDID(did: string): Promise<DIDResolutionResult> {
    // Extract account address from DID
    const address = did.split(':').pop();
    if (!address) {
      throw new Error('Invalid DID format');
    }

    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'did',
      ledger_index: 'validated'
    });

    if (!response.result.account_objects || response.result.account_objects.length === 0) {
      throw new Error('DID not found');
    }

    const didObject = response.result.account_objects[0] as any;
    
    let document: DIDDocument | null = null;
    let uri: string | undefined;
    let data: string | undefined;

    if (didObject.DIDDocument) {
      const documentJson = convertHexToString(didObject.DIDDocument);
      document = JSON.parse(documentJson);
    }

    if (didObject.URI) {
      uri = convertHexToString(didObject.URI);
    }

    if (didObject.Data) {
      data = convertHexToString(didObject.Data);
    }

    if (!document) {
      throw new Error('DID document not found');
    }

    return {
      did,
      document,
      accountAddress: address,
      uri,
      data,
      createdAt: didObject.PreviousTxnLgrSeq ? new Date(didObject.PreviousTxnLgrSeq * 1000).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate a standard DID document
   */
  generateDIDDocument(params: GenerateDIDDocumentParams): DIDDocument {
    const did = `did:xrpl:1:${params.accountAddress}`;

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: did,
      controller: did,
      verificationMethod: [{
        id: `${did}#keys-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: params.publicKey
      }],
      authentication: [`${did}#keys-1`],
      service: params.serviceEndpoints?.map((endpoint, index) => ({
        id: `${did}#service-${index + 1}`,
        type: endpoint.type,
        serviceEndpoint: endpoint.endpoint
      }))
    };
  }

  /**
   * Verify DID document authenticity and validity
   */
  async verifyDID(did: string): Promise<DIDVerificationResult> {
    try {
      const resolution = await this.resolveDID(did);
      
      // Verify bidirectional link
      const address = did.split(':').pop();
      const isLinked = resolution.document.controller === did && 
                       resolution.document.id === did &&
                       address === resolution.accountAddress;

      return {
        isValid: isLinked,
        document: resolution.document,
        error: isLinked ? undefined : 'DID document link invalid'
      };
    } catch (error) {
      return {
        isValid: false,
        document: null,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get DID for an account address
   */
  async getDIDForAccount(address: string): Promise<string | null> {
    try {
      const response = await this.client.request({
        command: 'account_objects',
        account: address,
        type: 'did',
        ledger_index: 'validated'
      });

      if (!response.result.account_objects || response.result.account_objects.length === 0) {
        return null;
      }

      return `did:xrpl:1:${address}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if an account has a DID
   */
  async hasDID(address: string): Promise<boolean> {
    const did = await this.getDIDForAccount(address);
    return did !== null;
  }
}
