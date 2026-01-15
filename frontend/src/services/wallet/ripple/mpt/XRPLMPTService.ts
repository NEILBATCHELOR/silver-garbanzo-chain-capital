import { Client, Wallet, Transaction, Payment } from 'xrpl';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPLNetwork } from '../config/XRPLConfig';

/**
 * MPT Metadata structure (XLS-89 standard)
 */
export interface MPTMetadata {
  ticker: string;        // Short symbol (e.g., "USDC")
  name: string;         // Full name
  desc: string;         // Description
  icon?: string;        // Icon URL
  asset_class?: string; // e.g., "rwa", "currency"
  asset_subclass?: string; // e.g., "treasury", "real-estate"
  issuer_name?: string; // Issuer's legal name
  uris?: Array<{
    uri: string;
    category: string;   // "website", "docs", "whitepaper"
    title: string;
  }>;
  additional_info?: Record<string, unknown>;
}

/**
 * MPT Issuance creation parameters
 */
export interface MPTIssuanceParams {
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
 * MPT Holder information
 */
export interface MPTHolder {
  address: string;
  balance: string;
  authorized: boolean;
}

/**
 * MPT Issuance details
 */
export interface MPTIssuanceDetails {
  issuer: string;
  assetScale: number;
  maximumAmount?: string;
  outstandingAmount: string;
  metadata: MPTMetadata;
  flags: number;
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
   * Create MPT Issuance with metadata
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
   * Authorize holder to receive MPT
   */
  async authorizeMPTHolder(params: {
    holderWallet: Wallet;
    mptIssuanceId: string;
  }): Promise<{ transactionHash: string }> {
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
   * Issue MPT to authorized holder
   */
  async issueMPT(params: {
    issuerWallet: Wallet;
    destination: string;
    mptIssuanceId: string;
    amount: string;
  }): Promise<{ transactionHash: string }> {
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
   * Transfer MPT between holders
   */
  async transferMPT(params: {
    senderWallet: Wallet;
    destination: string;
    mptIssuanceId: string;
    amount: string;
  }): Promise<{ transactionHash: string }> {
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
   * Get MPT issuance details
   */
  async getMPTIssuanceDetails(mptIssuanceId: string): Promise<MPTIssuanceDetails> {
    try {
      const client = await this.getClient();

      const response = await client.request({
        command: 'ledger_entry',
        mpt_issuance: mptIssuanceId,
        ledger_index: 'validated'
      });

      const node = response.result.node as unknown as Record<string, unknown>;
      const metadataBlob = node.MPTokenMetadata as string;
      const metadata = this.decodeMetadata(metadataBlob);

      return {
        issuer: node.Issuer as string,
        assetScale: node.AssetScale as number,
        maximumAmount: node.MaximumAmount as string | undefined,
        outstandingAmount: node.OutstandingAmount as string,
        metadata,
        flags: node.Flags as number
      };
    } catch (error) {
      throw new Error(
        `Failed to get MPT issuance details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get MPT holders
   * 
   * NOTE: The 'mpt_holders' command is not yet available in xrpl.js v4.4.1
   * This is a placeholder for when the feature becomes available.
   * Alternative: Use account_objects to find MPT holders manually.
   */
  async getMPTHolders(mptIssuanceId: string): Promise<MPTHolder[]> {
    try {
      const client = await this.getClient();

      // Workaround: Query account_objects to find MPT holders
      // This is less efficient but works with current xrpl.js version
      const response = await client.request({
        command: 'account_objects',
        account: mptIssuanceId, // Use issuer address here
        type: 'mpt_issuance',
        ledger_index: 'validated'
      });

      const objects = response.result.account_objects;

      return objects
        .filter((obj: unknown) => {
          const entry = obj as Record<string, unknown>;
          return entry.LedgerEntryType === 'MPToken';
        })
        .map((obj: unknown) => {
          const entry = obj as Record<string, unknown>;
          return {
            address: entry.Account as string,
            balance: entry.MPTAmount as string,
            authorized: true
          };
        });
    } catch (error) {
      // If MPT feature not available, return empty array
      console.warn('MPT holders query not supported:', error);
      return [];
    }
  }

  /**
   * Clawback MPT from holder
   */
  async clawbackMPT(params: {
    issuerWallet: Wallet;
    holderAddress: string;
    mptIssuanceId: string;
    amount: string;
  }): Promise<{ transactionHash: string }> {
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
   * Encode metadata to hex (XLS-89 format)
   */
  private encodeMetadata(metadata: MPTMetadata): string {
    const metadataJson = JSON.stringify(metadata);
    return Buffer.from(metadataJson).toString('hex').toUpperCase();
  }

  /**
   * Decode metadata from hex
   */
  private decodeMetadata(metadataHex: string): MPTMetadata {
    const metadataJson = Buffer.from(metadataHex, 'hex').toString('utf8');
    return JSON.parse(metadataJson) as MPTMetadata;
  }

  /**
   * Extract issuance ID from transaction metadata
   */
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

  /**
   * Get explorer URL for entity
   */
  private getExplorerUrl(id: string, type: 'mpt' | 'transaction'): string {
    const explorers: Record<string, string> = {
      MAINNET: 'https://xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    };

    const baseUrl = explorers[this.network] || explorers.TESTNET;
    return `${baseUrl}/${type}/${id}`;
  }
}
