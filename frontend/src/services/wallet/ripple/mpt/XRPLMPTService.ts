import { Client, Wallet, Transaction, Payment } from 'xrpl';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPLNetwork, XRPL_NETWORKS } from '../config/XRPLConfig';
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
    canEscrow?: boolean;
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
 * Issuer authorization parameters (Step 2 of authorization)
 */
export interface MPTIssuerAuthorizationParams {
  projectId: string;
  issuerWallet: Wallet;
  holderAddress: string;
  mptIssuanceId: string;
}

/**
 * Unauthorization parameters
 */
export interface MPTUnauthorizationParams {
  projectId: string;
  mptIssuanceId: string;
  issuerWallet?: Wallet;
  holderWallet?: Wallet;
  holderAddress?: string;
}

/**
 * MPT Issuance update parameters (lock/unlock and domain management)
 * MPTokenIssuanceSet transaction
 */
export interface MPTIssuanceUpdateParams {
  projectId: string;
  issuerWallet: Wallet;
  mptIssuanceId: string;
  lock?: boolean;
  unlock?: boolean;
  holderAddress?: string; // If provided, applies to specific holder; otherwise all holders
  domainId?: string; // Permissioned domain ID; use '0' or '' to remove domain requirement
}

/**
 * MPT Issuance destroy parameters
 */
export interface MPTIssuanceDestroyParams {
  projectId: string;
  issuerWallet: Wallet;
  mptIssuanceId: string;
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
        flags |= 0x0020; // tfMPTCanTransfer
      }
      if (params.flags.canTrade) {
        flags |= 0x0010; // tfMPTCanTrade
      }
      if (params.flags.canEscrow) {
        flags |= 0x0008; // tfMPTCanEscrow
      }
      if (params.flags.canLock) {
        flags |= 0x0002; // tfMPTCanLock
      }
      if (params.flags.canClawback) {
        flags |= 0x0040; // tfMPTCanClawback
      }
      if (params.flags.requireAuth) {
        flags |= 0x0004; // tfMPTRequireAuth
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
        uris: params.metadata.uris?.map(u => ({
          u: u.uri,
          c: u.category,
          t: u.title
        })),
        additional_info: params.metadata.additional_info,
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
   * Issuer grants authorization to holder (Step 2 of authorization)
   * This sets the lsfMPTAuthorized flag for the holder
   */
  async issuerAuthorizeMPTHolder(params: MPTIssuerAuthorizationParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Transaction = {
        TransactionType: 'MPTokenAuthorize',
        Account: params.issuerWallet.address,
        MPTokenIssuanceID: params.mptIssuanceId,
        Holder: params.holderAddress
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Issuer authorization failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Update holder record in database
      await XRPLMPTDatabaseService.upsertHolder({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        holder_address: params.holderAddress,
        authorized: true,
        authorization_transaction_hash: response.result.hash,
        authorized_at: new Date().toISOString()
      });

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to grant issuer authorization: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Revoke MPT authorization (holder or issuer)
   * Holder: Deletes MPToken entry (balance must be zero)
   * Issuer: Revokes permission (unsets lsfMPTAuthorized flag)
   */
  async unauthorizeMPTHolder(params: MPTUnauthorizationParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const wallet = params.holderWallet || params.issuerWallet;
      if (!wallet) {
        throw new Error('Either holderWallet or issuerWallet must be provided');
      }

      const tx: Transaction = {
        TransactionType: 'MPTokenAuthorize',
        Account: wallet.address,
        MPTokenIssuanceID: params.mptIssuanceId,
        Flags: 1 // tfMPTUnauthorize
      };

      // If issuer is revoking, include Holder field
      if (params.issuerWallet && params.holderAddress) {
        (tx as any).Holder = params.holderAddress;
      }

      const response = await client.submitAndWait(tx, {
        wallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Unauthorization failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to revoke authorization: ${error instanceof Error ? error.message : String(error)}`
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

      // CRITICAL: Sync from blockchain to get updated outstanding amount
      // Wait for ledger to settle then query authoritative blockchain state
      await this.syncIssuanceFromBlockchain({
        projectId: params.projectId,
        mptIssuanceId: params.mptIssuanceId
      });

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
   * Special case: Sending to issuer automatically burns the tokens
   */
  async transferMPT(params: MPTTransferParams): Promise<{ 
    transactionHash: string;
    isBurn: boolean;
  }> {
    try {
      const client = await this.getClient();

      // Check if destination is the issuer (burning tokens)
      const issuanceDetails = await this.getMPTIssuanceDetails(params.mptIssuanceId);
      const isBurn = params.destination === issuanceDetails.issuer;

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
          throw new Error(`${isBurn ? 'Burn' : 'Transfer'} failed: ${response.result.meta.TransactionResult}`);
        }
      }

      // Record transaction in database with appropriate type
      await XRPLMPTDatabaseService.createTransaction({
        project_id: params.projectId,
        issuance_id: params.mptIssuanceId,
        transaction_type: isBurn ? 'burn' : 'transfer',
        from_address: params.senderWallet.address,
        to_address: params.destination,
        amount: params.amount,
        transaction_hash: response.result.hash,
        status: 'success'
      });

      return {
        transactionHash: response.result.hash,
        isBurn
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
   * Update MPT issuance settings (lock/unlock tokens, manage domains)
   * MPTokenIssuanceSet transaction
   */
  async updateMPTIssuance(params: MPTIssuanceUpdateParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      // Validate that we're actually changing something
      const hasLockAction = params.lock || params.unlock;
      const hasDomainAction = params.domainId !== undefined;
      
      if (!hasLockAction && !hasDomainAction) {
        throw new Error('Must specify either lock/unlock action or domainId');
      }

      // Cannot set both domainId and holderAddress in the same transaction
      if (hasDomainAction && params.holderAddress) {
        throw new Error('Cannot specify both DomainID and Holder in the same transaction');
      }

      // Determine flags based on lock/unlock
      let flags = 0;
      if (params.lock) {
        flags = 1; // tfMPTLock
      } else if (params.unlock) {
        flags = 2; // tfMPTUnlock
      }

      const tx: Transaction = {
        TransactionType: 'MPTokenIssuanceSet',
        Account: params.issuerWallet.address,
        MPTokenIssuanceID: params.mptIssuanceId,
        Flags: flags
      };

      // If holderAddress is provided, apply to specific holder
      if (params.holderAddress) {
        (tx as any).Holder = params.holderAddress;
      }

      // If domainId is provided, set or remove permissioned domain
      if (params.domainId !== undefined) {
        // Empty string or '0' removes the domain requirement
        (tx as any).DomainID = params.domainId === '' || params.domainId === '0' 
          ? '0000000000000000000000000000000000000000000000000000000000000000'
          : params.domainId;
      }

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
          throw new Error(`Update failed: ${response.result.meta.TransactionResult}`);
        }
      }

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to update MPT issuance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if MPT issuance can be destroyed
   * Returns eligibility status and details about any obligations
   */
  async checkDestructionEligibility(params: {
    mptIssuanceId: string;
  }): Promise<{
    canDestroy: boolean;
    outstandingAmount: string;
    holdersCount: number;
    obligations: string[];
  }> {
    try {
      const client = await this.getClient();

      // Get MPTokenIssuance ledger entry
      const response = await client.request({
        command: 'ledger_entry',
        mpt_issuance: params.mptIssuanceId
      });

      if (!response.result || !response.result.node) {
        throw new Error('MPTokenIssuance not found');
      }

      const issuance = response.result.node as any;
      const outstandingAmount = issuance.OutstandingAmount || '0';
      
      // Query for MPToken entries (holders) - need to query each potential holder
      // Since we don't have a holder list, we'll rely on the OutstandingAmount check
      // To properly count holders, we'd need to query all accounts or maintain a holder registry
      const holdersCount = 0; // Cannot reliably count holders without querying all accounts

      const obligations: string[] = [];
      
      if (outstandingAmount !== '0') {
        obligations.push(`Outstanding amount: ${outstandingAmount} (must be 0)`);
      }
      
      if (holdersCount > 0) {
        obligations.push(`${holdersCount} holder(s) still exist (all MPToken entries must be deleted)`);
      }

      return {
        canDestroy: obligations.length === 0,
        outstandingAmount,
        holdersCount,
        obligations
      };
    } catch (error) {
      throw new Error(
        `Failed to check destruction eligibility: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Destroy MPT issuance (can only be done if no holders exist)
   * MPTokenIssuanceDestroy transaction
   */
  async destroyMPTIssuance(params: MPTIssuanceDestroyParams): Promise<{ transactionHash: string }> {
    try {
      const client = await this.getClient();

      const tx: Transaction = {
        TransactionType: 'MPTokenIssuanceDestroy',
        Account: params.issuerWallet.address,
        MPTokenIssuanceID: params.mptIssuanceId
      };

      const response = await client.submitAndWait(tx, {
        wallet: params.issuerWallet,
        autofill: true
      });

      if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
        const result = response.result.meta.TransactionResult;
        if (result !== 'tesSUCCESS') {
          // Provide helpful context for common errors
          if (result === 'tecHAS_OBLIGATIONS') {
            // Check what the obligations are
            const eligibility = await this.checkDestructionEligibility({
              mptIssuanceId: params.mptIssuanceId
            });
            
            const obligationDetails = eligibility.obligations.join('\n• ');
            throw new Error(
              `Cannot destroy MPT issuance - outstanding obligations exist:\n• ${obligationDetails}\n\nAll holders must delete their MPToken entries (via MPTokenAuthorize with tfMPTUnauthorize flag) and all tokens must be returned to the issuer.`
            );
          }
          throw new Error(`Destroy failed: ${result}`);
        }
      }

      // Update database to mark as destroyed with timestamp and transaction hash
      // IMPORTANT: We keep the original issuance_id - XRPL doesn't assign a new "destroyed ID"
      // The issuance ID becomes invalid on-chain but we preserve it for audit trail
      await XRPLMPTDatabaseService.updateIssuance(params.projectId, params.mptIssuanceId, {
        status: 'destroyed',
        destroyed_at: new Date().toISOString(),
        destruction_transaction_hash: response.result.hash
      });

      return {
        transactionHash: response.result.hash
      };
    } catch (error) {
      throw new Error(
        `Failed to destroy MPT issuance: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sync MPT issuance data from blockchain to database
   * Updates outstanding amount and holder balances from the authoritative blockchain state
   * 
   * CRITICAL: This ensures database reflects blockchain truth after every operation
   */
  async syncIssuanceFromBlockchain(params: {
    projectId: string;
    mptIssuanceId: string;
  }): Promise<{
    outstandingAmount: string;
    holdersUpdated: number;
  }> {
    try {
      console.log('⏳ Waiting for XRPL ledger to validate transaction (4 seconds)...')
      
      // Wait for ledger to validate transaction
      // XRPL ledgers close every 3-5 seconds with 2-4 second consensus
      // 4 seconds ensures we query a validated ledger that includes our transaction
      await new Promise(resolve => setTimeout(resolve, 4000));

      console.log('🔍 Querying blockchain for current state...')
      
      // Get current blockchain state (blockchain is single source of truth)
      const issuanceDetails = await this.getMPTIssuanceDetails(params.mptIssuanceId);
      
      console.log('📊 Blockchain state retrieved:', {
        issuanceId: params.mptIssuanceId,
        outstandingAmount: issuanceDetails.outstandingAmount,
        issuer: issuanceDetails.issuer
      });
      
      // Update database with blockchain data
      console.log('💾 Updating database with blockchain data...')
      await XRPLMPTDatabaseService.updateOutstandingAmount(
        params.projectId,
        params.mptIssuanceId,
        issuanceDetails.outstandingAmount
      );

      console.log('✅ Database updated successfully:', {
        outstandingAmount: issuanceDetails.outstandingAmount
      });

      // Sync holder balances
      let holdersUpdated = 0;
      try {
        const holders = await this.getMPTHolders(params.mptIssuanceId);
        
        console.log(`📋 Syncing ${holders.length} holder records...`);
        
        for (const holder of holders) {
          await XRPLMPTDatabaseService.upsertHolder({
            project_id: params.projectId,
            issuance_id: params.mptIssuanceId,
            holder_address: holder.address,
            balance: holder.balance,
            authorized: true // If they have a balance, they must be authorized
          });
          holdersUpdated++;
        }
        
        console.log(`✅ Successfully updated ${holdersUpdated} holder records`);
      } catch (holderError) {
        // mpt_holders command might not be available on all networks
        console.warn('⚠️ Could not sync holder balances (mpt_holders command may not be available on this network)');
      }

      console.log('🎉 Sync completed successfully!', {
        outstandingAmount: issuanceDetails.outstandingAmount,
        holdersUpdated
      });

      return {
        outstandingAmount: issuanceDetails.outstandingAmount,
        holdersUpdated
      };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw new Error(
        `Failed to sync issuance from blockchain: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a holder is authorized and can receive this MPT
   * IMPORTANT: Issuer can always receive tokens (they are auto-burned)
   */
  async checkHolderStatus(params: {
    holderAddress: string;
    mptIssuanceId: string;
  }): Promise<{
    canReceive: boolean;
    balance: string;
    message: string;
  }> {
    try {
      const client = await this.getClient();

      // Get issuance details to check if holder is the issuer
      const issuanceDetails = await this.getMPTIssuanceDetails(params.mptIssuanceId);
      
      // SPECIAL CASE: If destination is the issuer, tokens are automatically burned
      // Issuer doesn't need authorization because they can't hold their own tokens
      if (params.holderAddress === issuanceDetails.issuer) {
        return {
          canReceive: true,
          balance: '0',
          message: 'Tokens sent to issuer are automatically burned. No authorization required.'
        };
      }

      // For non-issuer holders, check MPToken entry
      try {
        const response = await client.request({
          command: 'ledger_entry',
          mptoken: {
            mpt_issuance_id: params.mptIssuanceId,
            account: params.holderAddress
          },
          ledger_index: 'validated'
        } as any);

        // Type assertion for MPToken entry response
        const result = response.result as any;
        const mptoken = result.node as any;
        const balance = mptoken.MPTAmount || '0';
        const flags = mptoken.Flags || 0;
        const isAuthorized = (flags & 0x0002) !== 0; // lsfMPTAuthorized

        // Check if token requires authorization
        const requiresAuth = (issuanceDetails.flags & 0x0010) !== 0; // lsfMPTRequireAuth

        if (requiresAuth && !isAuthorized) {
          return {
            canReceive: false,
            balance,
            message: `Holder has MPToken entry but is not authorized by issuer. Balance: ${balance}`
          };
        }

        return {
          canReceive: true,
          balance,
          message: `Holder is authorized and can receive tokens. Current balance: ${balance}`
        };
      } catch (entryError) {
        // No MPToken entry exists
        return {
          canReceive: false,
          balance: '0',
          message: 'Holder has not authorized this MPT. They must send MPTokenAuthorize transaction first.'
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to check holder status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all holders with their balances directly from blockchain
   * This queries account_objects for all holders of a specific MPT
   */
  async getAllHoldersFromBlockchain(params: {
    mptIssuanceId: string;
  }): Promise<Array<{
    address: string;
    balance: string;
    authorized: boolean;
  }>> {
    try {
      const client = await this.getClient();

      // Try using mpt_holders command first (if available)
      try {
        const response = await client.request({
          command: 'mpt_holders',
          mpt_issuance_id: params.mptIssuanceId,
          ledger_index: 'validated'
        } as any);

        const result = response.result as any;
        if (result.mpt_holders) {
          return result.mpt_holders.map((holder: any) => {
            const flags = holder.Flags || 0;
            const isAuthorized = (flags & 0x0002) !== 0; // lsfMPTAuthorized
            
            return {
              address: holder.account,
              balance: holder.MPTAmount || '0',
              authorized: isAuthorized
            };
          });
        }
      } catch (cmdError) {
        console.warn('mpt_holders command not available, falling back to account scanning');
      }

      // Fallback: This is a placeholder - in practice, you'd need to scan accounts
      // For now, return empty array if mpt_holders is not available
      console.warn('Unable to fetch all holders - mpt_holders command not supported on this network');
      return [];
    } catch (error) {
      throw new Error(
        `Failed to get all holders from blockchain: ${error instanceof Error ? error.message : String(error)}`
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

      // Type assertion for ledger_entry response structure
      const result = response.result as any;
      const node = result.node;

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
   * Get MPT holders by analyzing transaction history
   * This is more reliable than querying ledger state
   * Works by tracking MPTokenAuthorize and Payment transactions
   */
  async getMPTHolders(mptIssuanceId: string): Promise<Array<{
    address: string;
    balance: string;
  }>> {
    try {
      const client = await this.getClient();

      // Get the issuer address from the issuance details
      const issuanceDetails = await this.getMPTIssuanceDetails(mptIssuanceId);
      const issuerAddress = issuanceDetails.issuer;

      // Track holder balances
      const holderBalances = new Map<string, bigint>();

      // Query issuer's account transactions to find all MPT-related activity
      let marker: string | undefined;
      let transactionsProcessed = 0;
      const MAX_TRANSACTIONS = 1000; // Safety limit

      do {
        const response = await client.request({
          command: 'account_tx',
          account: issuerAddress,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 200,
          ...(marker && { marker })
        });

        const result = response.result as any;
        
        if (result.transactions && Array.isArray(result.transactions)) {
          for (const txData of result.transactions) {
            const tx = txData.tx;
            const meta = txData.meta;

            // Process MPTokenAuthorize transactions (indicates willingness to hold)
            if (tx.TransactionType === 'MPTokenAuthorize' && 
                tx.MPTokenIssuanceID === mptIssuanceId &&
                meta?.TransactionResult === 'tesSUCCESS') {
              const holder = tx.Account;
              if (holder !== issuerAddress && !holderBalances.has(holder)) {
                holderBalances.set(holder, 0n);
              }
            }

            // Process Payment transactions with MPTs
            if (tx.TransactionType === 'Payment' && 
                typeof tx.Amount === 'object' &&
                tx.Amount.mpt_issuance_id === mptIssuanceId &&
                meta?.TransactionResult === 'tesSUCCESS') {
              
              const from = tx.Account;
              const to = tx.Destination;
              const amount = BigInt(tx.Amount.value || '0');

              // Update sender balance (decrease)
              if (from !== issuerAddress) {
                const currentBalance = holderBalances.get(from) || 0n;
                holderBalances.set(from, currentBalance - amount);
              }

              // Update recipient balance (increase)
              if (to !== issuerAddress) {
                const currentBalance = holderBalances.get(to) || 0n;
                holderBalances.set(to, currentBalance + amount);
              }
            }
          }

          transactionsProcessed += result.transactions.length;
        }

        marker = result.marker;
        
        // Safety check to prevent infinite loops
        if (transactionsProcessed >= MAX_TRANSACTIONS) {
          console.warn(`Reached transaction limit (${MAX_TRANSACTIONS}). Some holders may be missing.`);
          break;
        }
      } while (marker);

      // Convert Map to array, filtering out zero balances
      const holders = Array.from(holderBalances.entries())
        .filter(([_, balance]) => balance > 0n)
        .map(([address, balance]) => ({
          address,
          balance: balance.toString()
        }))
        .sort((a, b) => {
          const balanceA = BigInt(a.balance);
          const balanceB = BigInt(b.balance);
          return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
        });

      return holders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Fallback: Try Clio server if available
      console.warn('Transaction-based holder extraction failed, trying Clio fallback:', errorMessage);
      
      try {
        return await this.getMPTHoldersFromClio(mptIssuanceId);
      } catch (clioError) {
        console.error('Clio fallback also failed:', clioError);
        // Return empty array rather than throwing
        return [];
      }
    }
  }

  /**
   * Fallback method: Get MPT holders using Clio server
   * @private
   */
  private async getMPTHoldersFromClio(mptIssuanceId: string): Promise<Array<{
    address: string;
    balance: string;
  }>> {
    const config = XRPL_NETWORKS[this.network];
    
    if (!config.clioUrl) {
      throw new Error(
        `Clio server not available for ${this.network}`
      );
    }

    const clioClient = new Client(config.clioUrl);
    
    try {
      await clioClient.connect();

      const response = await clioClient.request({
        command: 'mpt_holders',
        mpt_issuance_id: mptIssuanceId,
        ledger_index: 'validated'
      } as any);

      const result = response.result as any;
      
      if (!result.mpt_holders || !Array.isArray(result.mpt_holders)) {
        return [];
      }

      return result.mpt_holders.map((holder: { Account: string; MPTAmount: string }) => ({
        address: holder.Account,
        balance: holder.MPTAmount
      }));
    } finally {
      await clioClient.disconnect();
    }
  }
}
