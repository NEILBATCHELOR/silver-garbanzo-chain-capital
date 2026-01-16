import { Client, Wallet, Transaction, Payment } from 'xrpl';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPLNetwork } from '../config/XRPLConfig';
import { XRPLMPTDatabaseService } from './XRPLMPTDatabaseService';
import type { MPTMetadata } from './types';

/**
 * MPT Issuance creation parameters
 */
export interface MPTIssuanceParams {
  projectId: string;
  issuerWallet: Wallet;
  assetScale: number;
  maximumAmount?: string;
  transferFee?: number;
  metadata: MPTMetadata;
  flags: {
    canTransfer?: boolean;
    canTrade?: boolean;
    canLock?: boolean;
    canClawback?: boolean;
    requireAuth?: boolean;
  };
}

/**
 * MPT Issuance result
 */
export interface MPTIssuanceResult {
  issuanceId: string;
  transactionHash: string;
  explorerUrl: string;
  metadata: MPTMetadata;
}

/**
 * MPT Authorization parameters
 */
export interface MPTAuthorizationParams {
  projectId: string;
  holderWallet: Wallet;
  mptIssuanceId: string;
}

/**
 * MPT Issuance parameters
 */
export interface MPTIssueParams {
  projectId: string;
  issuerWallet: Wallet;
  destination: string;
  mptIssuanceId: string;
  amount: string;
}

/**
 * MPT Transfer parameters
 */
export interface MPTTransferParams {
  projectId: string;
  senderWallet: Wallet;
  destination: string;
  mptIssuanceId: string;
  amount: string;
}

/**
 * MPT Clawback parameters
 */
export interface MPTClawbackParams {
  projectId: string;
  issuerWallet: Wallet;
  holderAddress: string;
  mptIssuanceId: string;
  amount: string;
}

/**
 * XRPL Multi-Purpose Token (MPT) Service
 * 
 * Handles MPT creation, authorization, issuance, and transfers.
 * MPT is XRPL's next-generation token standard (XLS-33).
 * 
 * Based on: xrpl-dev-portal _code-samples/issue-mpt-with-metadata/
 */
export class XRPLMPTService {
  private client: Client | null = null;
  private network: XRPLNetwork;

  constructor(network: XRPLNetwork = 'TESTNET') {
    this.network = network;
  }

  /**
   * Initialize client connection
   */
  private async getClient(): Promise<Client> {
    if (!this.client || !this.client.isConnected()) {
      this.client = await xrplClientManager.getClient(this.network);
    }
    return this.client;
  }

  /**
   * Create MPT Issuance with metadata and save to database
   */
  async createMPTIssuance(params: MPTIssuanceParams): Promise<MPTIssuanceResult> {
    try {
      const client = await this.getClient();

      // Build flags
      let flags = 0;
      if (params.flags.canTransfer !== false) {
        flags |= 0x0001; // tfMPTCanTransfer
      }
      if (params.flags.canTrade) {
        flags |= 0x0002; // tfMPTCanTrade
      }
      if (params.flags.canLock) {
        flags |= 0x0004; // tfMPTCanLock
      }
      if (params.flags.canClawback) {
        flags |= 0x0008; // tfMPTCanClawback
      }
      if (params.flags.requireAuth) {
        flags |= 0x0010; // tfMPTRequireAuth
      }

      // Encode metadata
      const metadataHex = this.encodeMetadata(params.metadata);

      const tx: Transaction = {
        TransactionType: 'MPTokenIssuanceCreate',
        Account: params.issuerWallet.address,
        AssetScale: params.assetScale,
        MaximumAmount: params.maximumAmount,
        TransferFee: params.transferFee,
        MPTokenMetadata: metadataHex,
        Flags: flags
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`MPT creation failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Extract issuance ID from metadata
      const issuanceId = this.extractIssuanceId(response.result.meta);
      const explorerUrl = this.getExplorerUrl(issuanceId, 'mpt');

      // Save to database
      await XRPLMPTDatabaseService.createIssuance({
        project_id: params.projectId,
        issuance_id: issuanceId,
        issuer_address: params.issuerWallet.address,
        asset_scale: params.assetScale,
        maximum_amount: params.maximumAmount,
        transfer_fee: params.transferFee,
        outstanding_amount: '0',
        ticker: params.metadata.ticker,
        name: params.metadata.name,
        description: params.metadata.desc,
        icon_url: params.metadata.icon,
        asset_class: params.metadata.asset_class,
        asset_subclass: params.metadata.asset_subclass,
        issuer_name: params.metadata.issuer_name,
        metadata_json: params.metadata as unknown as Record<string, unknown>,
        can_transfer: params.flags.canTransfer !== false,
        can_trade: params.flags.canTrade,
        can_lock: params.flags.canLock,
        can_clawback: params.flags.canClawback,
        require_auth: params.flags.requireAuth,
        flags,
        status: 'active',
        creation_transaction_hash: response.result.hash
      });

      return {
        issuanceId,
        transactionHash: response.result.hash,
        explorerUrl,
        metadata: params.metadata
      };
    } catch (error) {
      throw new Error(
        `Failed to create MPT issuance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Authorize holder to receive MPT and save to database
   */
  async authorizeMPTHolder(params: MPTAuthorizationParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Transaction = {
        TransactionType: 'MPTokenAuthorize',
        Account: params.holderWallet.address,
        MPTokenIssuanceID: params.mptIssuanceId
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.holderWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Authorization failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Save to database
      await XRPLMPTDatabaseService.upsertHolder({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        holder_address: params.holderWallet.address,
        balance: '0',
        authorized: true,
        authorization_transaction_hash: response.result.hash,
        authorized_at: new Date().toISOString()
      });

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to authorize MPT holder: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Issue MPT to authorized holder and record in database
   */
  async issueMPT(params: MPTIssueParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Payment = {
        TransactionType: 'Payment',
        Account: params.issuerWallet.address,
        Destination: params.destination,
        Amount: {
          mpt_issuance_id: params.mptIssuanceId,
          value: params.amount
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Issuance failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Record transaction in database
      await XRPLMPTDatabaseService.createTransaction({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        transaction_type: 'issue',
        from_address: params.issuerWallet.address,
        to_address: params.destination,
        amount: params.amount,
        transaction_hash: response.result.hash,
        status: 'success'
      });

      // Update holder balance (increment)
      const holders = await XRPLMPTDatabaseService.getHolders(params.projectId, params.mptIssuanceId);
      const holder = holders.find(h => h.holder_address === params.destination);
      if (holder) {
        const currentBalance = parseFloat(holder.balance || '0');
        const newBalance = (currentBalance + parseFloat(params.amount)).toString();
        await XRPLMPTDatabaseService.updateHolderBalance(
          params.projectId,
          params.mptIssuanceId,
          params.destination,
          newBalance
        );
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to issue MPT: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Transfer MPT between holders and record in database
   */
  async transferMPT(params: MPTTransferParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Payment = {
        TransactionType: 'Payment',
        Account: params.senderWallet.address,
        Destination: params.destination,
        Amount: {
          mpt_issuance_id: params.mptIssuanceId,
          value: params.amount
        }
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.senderWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Transfer failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Record transaction in database
      await XRPLMPTDatabaseService.createTransaction({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        transaction_type: 'transfer',
        from_address: params.senderWallet.address,
        to_address: params.destination,
        amount: params.amount,
        transaction_hash: response.result.hash,
        status: 'success'
      });

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to transfer MPT: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clawback MPT from holder and record in database
   */
  async clawbackMPT(params: MPTClawbackParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Transaction = {
        TransactionType: 'Clawback',
        Account: params.issuerWallet.address,
        Amount: {
          mpt_issuance_id: params.mptIssuanceId,
          value: params.amount
        },
        Holder: params.holderAddress
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Clawback failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Record transaction in database
      await XRPLMPTDatabaseService.createTransaction({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        transaction_type: 'clawback',
        from_address: params.holderAddress,
        to_address: params.issuerWallet.address,
        amount: params.amount,
        transaction_hash: response.result.hash,
        status: 'success'
      });

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to clawback MPT: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Helper methods
   */
  private encodeMetadata(metadata: MPTMetadata): string {
    const metadataJson = JSON.stringify(metadata);
    return Buffer.from(metadataJson).toString('hex').toUpperCase();
  }

  private extractIssuanceId(meta: unknown): string {
    if (!meta || typeof meta !== 'object') {
      throw new Error('Invalid transaction metadata');
    }

    const metaObj = meta as Record<string, unknown>;
    
    if ('AffectedNodes' in metaObj && Array.isArray(metaObj.AffectedNodes)) {
      const createdNode = metaObj.AffectedNodes.find(
        (node: Record<string, unknown>) => 
          node.CreatedNode && 
          typeof node.CreatedNode === 'object' &&
          'LedgerEntryType' in node.CreatedNode &&
          node.CreatedNode.LedgerEntryType === 'MPTokenIssuance'
      );

      if (createdNode && typeof createdNode === 'object' && 'CreatedNode' in createdNode) {
        const created = createdNode.CreatedNode as Record<string, unknown>;
        if ('LedgerIndex' in created && typeof created.LedgerIndex === 'string') {
          return created.LedgerIndex;
        }
      }
    }

    throw new Error('Could not extract issuance ID from transaction metadata');
  }

  private getExplorerUrl(id: string, type: 'mpt' | 'transaction'): string {
    const explorers: Record<string, string> = {
      MAINNET: 'https://xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    };

    const baseUrl = explorers[this.network] || explorers.TESTNET;
    return `${baseUrl}/${type}/${id}`;
  }

  /**
   * Get MPT issuance details from XRPL ledger
   */
  async getMPTIssuanceDetails(mptIssuanceId: string): Promise<{
    issuer: string;
    assetScale: number;
    maximumAmount?: string;
    outstandingAmount: string;
    metadata: MPTMetadata;
    flags: number;
  }> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'ledger_entry',
        mpt_issuance: mptIssuanceId,
        ledger_index: 'validated'
      });

      const { node } = response.result;

      // Type assertion for MPT-specific fields (not yet in xrpl.js types)
      const mptNode = node as any;

      // Decode metadata from hex
      let metadata: MPTMetadata;
      try {
        const metadataStr = Buffer.from(mptNode.MPTokenMetadata || '', 'hex').toString('utf8');
        metadata = JSON.parse(metadataStr);
      } catch {
        // Fallback to empty metadata if decoding fails
        metadata = {
          ticker: 'UNKNOWN',
          name: 'Unknown Token',
          desc: 'No description available'
        };
      }

      return {
        issuer: mptNode.Issuer,
        assetScale: mptNode.AssetScale,
        maximumAmount: mptNode.MaximumAmount,
        outstandingAmount: mptNode.OutstandingAmount || '0',
        metadata,
        flags: mptNode.Flags || 0
      };
    } catch (error) {
      throw new Error(
        `Failed to get MPT issuance details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get MPT holders from XRPL ledger
   */
  async getMPTHolders(mptIssuanceId: string): Promise<Array<{
    address: string;
    balance: string;
  }>> {
    try {
      const client = await this.getClient();

      // Type assertion for MPT-specific command (not yet in xrpl.js types)
      const response = await client.request({
        command: 'mpt_holders',
        mpt_issuance_id: mptIssuanceId,
        ledger_index: 'validated'
      } as any);

      const result = response.result as any;
      return result.mpt_holders.map((holder: { account: string; MPTAmount: string }) => ({
        address: holder.account,
        balance: holder.MPTAmount
      }));
    } catch (error) {
      throw new Error(
        `Failed to get MPT holders: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
