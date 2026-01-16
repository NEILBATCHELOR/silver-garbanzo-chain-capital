/**
 * XRPL Credential Service
 * Manages blockchain-based verifiable credentials on XRPL
 * 
 * IMPORTANT: Flow: Blockchain first → Database second (for audit trail and querying)
 * All methods now require projectId for multi-tenant isolation.
 * 
 * Based on: /Users/neilbatchelor/Downloads/xrpl-dev-portal-master/_code-samples/issue-credentials/
 */

import { Client, Wallet } from 'xrpl';
import {
  XRPLCredentialDatabaseService,
  CredentialRecord
} from './XRPLCredentialDatabaseService';
import {
  IssueCredentialParams,
  AcceptCredentialParams,
  DeleteCredentialParams,
  IssueCredentialResult,
  AcceptCredentialResult,
  DeleteCredentialResult,
  VerifiedCredential,
  AccountCredential,
  CredentialVerification
} from './types';

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

export class XRPLCredentialService {
  constructor(private client: Client) {}

  /**
   * Issue a credential to a subject
   * 1. Creates credential on blockchain
   * 2. Saves credential to database with project_id
   */
  async issueCredential(
    projectId: string,
    issuerWallet: Wallet,
    params: IssueCredentialParams
  ): Promise<IssueCredentialResult> {
    const credentialDataHex = convertStringToHex(JSON.stringify(params.data));
    const credentialTypeHex = convertStringToHex(params.credentialType);

    // 1. BLOCKCHAIN OPERATION
    const tx: any = {
      TransactionType: 'CredentialCreate',
      Account: issuerWallet.address,
      Subject: params.subject,
      CredentialType: credentialTypeHex,
      Data: credentialDataHex,
      Expiration: params.expiration
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Credential issuance failed: ${response.result.meta.TransactionResult}`
      );
    }

    const credentialId = this.extractCredentialId(response.result.meta);

    // 2. DATABASE OPERATION
    const credentialRecord: CredentialRecord = {
      project_id: projectId,
      credential_id: credentialId,
      issuer_address: issuerWallet.address,
      subject_address: params.subject,
      credential_type: params.credentialType,
      data_json: params.data,
      expiration: params.expiration ? new Date(params.expiration * 1000).toISOString() : undefined,
      status: 'active',
      is_accepted: false,
      issue_transaction_hash: response.result.hash
    };

    await XRPLCredentialDatabaseService.createCredential(credentialRecord);

    return {
      credentialId,
      transactionHash: response.result.hash
    };
  }

  /**
   * Accept a credential that was issued to your account
   * 1. Accepts credential on blockchain
   * 2. Updates credential status in database
   */
  async acceptCredential(
    projectId: string,
    subjectWallet: Wallet,
    params: AcceptCredentialParams
  ): Promise<AcceptCredentialResult> {
    // 1. BLOCKCHAIN OPERATION
    const tx: any = {
      TransactionType: 'CredentialAccept',
      Account: subjectWallet.address,
      CredentialID: params.credentialId
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: subjectWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Credential acceptance failed: ${response.result.meta.TransactionResult}`
      );
    }

    // 2. DATABASE OPERATION
    await XRPLCredentialDatabaseService.updateCredentialStatus(
      projectId,
      params.credentialId,
      'accepted',
      true,
      response.result.hash
    );

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Delete a credential (can be done by issuer or subject)
   * 1. Deletes credential on blockchain
   * 2. Updates credential status in database
   */
  async deleteCredential(
    projectId: string,
    wallet: Wallet,
    params: DeleteCredentialParams
  ): Promise<DeleteCredentialResult> {
    // 1. BLOCKCHAIN OPERATION
    const tx: any = {
      TransactionType: 'CredentialDelete',
      Account: wallet.address,
      CredentialID: params.credentialId
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
        `Credential deletion failed: ${response.result.meta.TransactionResult}`
      );
    }

    // 2. DATABASE OPERATION
    await XRPLCredentialDatabaseService.updateCredentialStatus(
      projectId,
      params.credentialId,
      'deleted',
      undefined,
      response.result.hash
    );

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Verify a credential's validity and retrieve its data (blockchain only)
   */
  async verifyCredential(credentialId: string): Promise<VerifiedCredential> {
    const response = await this.client.request({
      command: 'ledger_entry',
      credential: credentialId,
      ledger_index: 'validated'
    });

    if (!response.result.node) {
      throw new Error('Credential not found');
    }

    const credential = response.result.node as any;

    const credentialType = convertHexToString(credential.CredentialType);
    const data = JSON.parse(convertHexToString(credential.Data));

    const isExpired = credential.Expiration 
      ? credential.Expiration < Math.floor(Date.now() / 1000)
      : false;

    return {
      isValid: !isExpired,
      issuer: credential.Issuer,
      subject: credential.Subject,
      credentialType,
      data,
      expiration: credential.Expiration,
      isExpired
    };
  }

  /**
   * Get all credentials for an account (blockchain only)
   */
  async getAccountCredentials(address: string): Promise<AccountCredential[]> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'credential',
      ledger_index: 'validated'
    });

    if (!response.result.account_objects) {
      return [];
    }

    return response.result.account_objects.map((cred: any) => ({
      credentialId: cred.index,
      issuer: cred.Issuer,
      subject: cred.Subject,
      credentialType: convertHexToString(cred.CredentialType),
      expiration: cred.Expiration
    }));
  }

  /**
   * Perform comprehensive credential verification
   * Returns detailed verification result with timestamp
   */
  async performCredentialVerification(
    credentialId: string
  ): Promise<CredentialVerification> {
    const verified = await this.verifyCredential(credentialId);

    return {
      credentialId,
      ...verified,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Get credentials issued by a specific issuer (blockchain only)
   */
  async getIssuedCredentials(issuerAddress: string): Promise<AccountCredential[]> {
    const credentials = await this.getAccountCredentials(issuerAddress);
    return credentials.filter(cred => cred.issuer === issuerAddress);
  }

  /**
   * Get credentials received by a subject (blockchain only)
   */
  async getReceivedCredentials(subjectAddress: string): Promise<AccountCredential[]> {
    const credentials = await this.getAccountCredentials(subjectAddress);
    return credentials.filter(cred => cred.subject === subjectAddress);
  }

  /**
   * Extract credential ID from transaction metadata
   */
  private extractCredentialId(meta: any): string {
    if (!meta || typeof meta !== 'object') {
      throw new Error('Invalid transaction metadata');
    }

    const affectedNodes = (meta as any).AffectedNodes || [];
    
    const createdNode = affectedNodes.find(
      (node: any) => 
        node.CreatedNode?.LedgerEntryType === 'Credential'
    );
    
    if (!createdNode?.CreatedNode?.LedgerIndex) {
      throw new Error('Credential ID not found in transaction metadata');
    }
    
    return createdNode.CreatedNode.LedgerIndex;
  }
}
