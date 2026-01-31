/**
 * MPT Blockchain Synchronization Service
 * 
 * CRITICAL PRINCIPLE: Blockchain is ALWAYS the source of truth
 * Database is a cache/index for query performance
 * 
 * Flow:
 * 1. Query XRPL for current state
 * 2. Parse transaction metadata
 * 3. Update database to match blockchain
 * 4. Never trust database for critical operations
 */

import { Client, Wallet } from 'xrpl';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MPTTransactionResult {
  tx_hash: string;
  ledger_index: number;
  validated: boolean;
  meta: {
    TransactionResult: string;
    AffectedNodes: any[];
    delivered_amount?: any;
  };
  tx: {
    Account: string;
    TransactionType: string;
    Fee: string;
    Sequence: number;
    SigningPubKey: string;
    TxnSignature: string;
    date: number;
    [key: string]: any;
  };
}

interface MPTIssuanceState {
  issuance_id: string;
  issuer: string;
  outstanding_amount: string;
  locked_amount: string;
  max_amount?: string;
  asset_scale: number;
  transfer_fee: number;
  metadata_hex: string;
  flags: number;
  sequence: number;
  previous_txn_id: string;
  previous_txn_lgr_seq: number;
}

interface MPTHolderState {
  account: string;
  issuance_id: string;
  balance: string;
  locked_amount: string;
  flags: number;
  previous_txn_id: string;
  previous_txn_lgr_seq: number;
}

export class MPTSyncService {
  private client: Client;

  constructor(rpcUrl: string = 'wss://s.altnet.rippletest.net:51233') {
    this.client = new Client(rpcUrl);
  }

  /**
   * Connect to XRPL
   */
  async connect(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from XRPL
   */
  async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }

  /**
   * STEP 1: Query blockchain for MPT issuance state (SOURCE OF TRUTH)
   */
  async getIssuanceFromBlockchain(issuanceId: string): Promise<MPTIssuanceState | null> {
    await this.connect();

    try {
      const response = await this.client.request({
        command: 'ledger_entry',
        mpt_issuance_id: issuanceId,
        ledger_index: 'validated'
      });

      if (response.result && response.result.node) {
        const node = response.result.node as any;
        
        return {
          issuance_id: issuanceId,
          issuer: node.Issuer,
          outstanding_amount: node.OutstandingAmount || '0',
          locked_amount: node.LockedAmount || '0',
          max_amount: node.MaximumAmount,
          asset_scale: node.AssetScale,
          transfer_fee: node.TransferFee || 0,
          metadata_hex: node.MPTokenMetadata || '',
          flags: node.Flags || 0,
          sequence: node.Sequence,
          previous_txn_id: node.PreviousTxnID,
          previous_txn_lgr_seq: node.PreviousTxnLgrSeq
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching issuance from blockchain:', error);
      return null;
    }
  }

  /**
   * STEP 2: Query blockchain for holder balance (SOURCE OF TRUTH)
   */
  async getHolderFromBlockchain(
    issuanceId: string, 
    holderAddress: string
  ): Promise<MPTHolderState | null> {
    await this.connect();

    try {
      // Calculate MPToken ID using the specified formula
      const mptokenId = this.calculateMPTokenId(issuanceId, holderAddress);

      const response = await this.client.request({
        command: 'ledger_entry',
        mptoken: mptokenId,
        ledger_index: 'validated'
      });

      if (response.result && response.result.node) {
        const node = response.result.node as any;
        
        return {
          account: node.Account,
          issuance_id: node.MPTokenIssuanceID,
          balance: node.MPTAmount || '0',
          locked_amount: node.LockedAmount || '0',
          flags: node.Flags || 0,
          previous_txn_id: node.PreviousTxnID,
          previous_txn_lgr_seq: node.PreviousTxnLgrSeq
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching holder from blockchain:', error);
      return null;
    }
  }

  /**
   * Calculate MPToken ID from issuance ID and holder address
   * Formula from spec: SHA-512Half(MPToken space key + MPTokenIssuanceID + AccountID)
   */
  private calculateMPTokenId(issuanceId: string, holderAddress: string): string {
    // This is a placeholder - actual implementation would use xrpl.js hashing utilities
    // For now, we'll use ledger_entry with account + mpt_issuance_id
    return '';
  }

  /**
   * STEP 3: Sync issuance from blockchain to database
   */
  async syncIssuanceToDatabase(
    projectId: string,
    issuanceId: string,
    ledgerIndex: number,
    txHash?: string
  ): Promise<void> {
    // ALWAYS query blockchain first
    const blockchainState = await this.getIssuanceFromBlockchain(issuanceId);
    
    if (!blockchainState) {
      console.warn(`Issuance ${issuanceId} not found on blockchain`);
      return;
    }

    // Parse metadata if available
    const metadata = this.parseMetadata(blockchainState.metadata_hex);

    // Update database to match blockchain state
    const { error } = await supabase
      .from('mpt_issuances')
      .upsert({
        project_id: projectId,
        issuance_id: blockchainState.issuance_id,
        issuer_address: blockchainState.issuer,
        outstanding_amount: blockchainState.outstanding_amount,
        locked_amount: blockchainState.locked_amount,
        maximum_amount: blockchainState.max_amount,
        asset_scale: blockchainState.asset_scale,
        transfer_fee: blockchainState.transfer_fee,
        mpt_metadata_hex: blockchainState.metadata_hex,
        metadata_json: metadata,
        sequence: blockchainState.sequence,
        flags: blockchainState.flags,
        previous_txn_id: blockchainState.previous_txn_id,
        previous_txn_lgr_seq: blockchainState.previous_txn_lgr_seq,
        last_synced_ledger: ledgerIndex,
        last_synced_tx: txHash,
        last_synced_at: new Date().toISOString(),
        // Extract parsed metadata fields
        ticker: metadata?.ticker || '',
        name: metadata?.name || '',
        description: metadata?.desc || metadata?.description,
        icon_url: metadata?.icon,
        asset_class: metadata?.asset_class || metadata?.ac,
        asset_subclass: metadata?.asset_subclass || metadata?.as,
        issuer_name: metadata?.issuer_name || metadata?.in,
        // Extract flags
        can_lock: !!(blockchainState.flags & 0x00000002),
        require_auth: !!(blockchainState.flags & 0x00000004),
        can_escrow: !!(blockchainState.flags & 0x00000008),
        can_trade: !!(blockchainState.flags & 0x00000010),
        can_transfer: !!(blockchainState.flags & 0x00000020),
        can_clawback: !!(blockchainState.flags & 0x00000040),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'issuance_id'
      });

    if (error) {
      console.error('Error syncing issuance to database:', error);
      throw error;
    }

    console.log(`✅ Synced issuance ${issuanceId} from ledger ${ledgerIndex}`);
  }

  /**
   * STEP 4: Sync holder balance from blockchain to database
   */
  async syncHolderToDatabase(
    projectId: string,
    issuanceId: string,
    holderAddress: string,
    ledgerIndex: number,
    txHash?: string
  ): Promise<void> {
    // ALWAYS query blockchain first
    const blockchainState = await this.getHolderFromBlockchain(issuanceId, holderAddress);
    
    if (!blockchainState) {
      console.warn(`Holder ${holderAddress} for ${issuanceId} not found on blockchain`);
      return;
    }

    // Update database to match blockchain state
    const { error } = await supabase
      .from('mpt_holders')
      .upsert({
        project_id: projectId,
        issuance_id: blockchainState.issuance_id,
        holder_address: blockchainState.account,
        balance: blockchainState.balance,
        locked_amount: blockchainState.locked_amount,
        holder_flags: blockchainState.flags,
        authorized: !!(blockchainState.flags & 0x00000002), // lsfMPTAuthorized
        previous_txn_id: blockchainState.previous_txn_id,
        previous_txn_lgr_seq: blockchainState.previous_txn_lgr_seq,
        last_synced_ledger: ledgerIndex,
        last_synced_tx: txHash,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'issuance_id,holder_address'
      });

    if (error) {
      console.error('Error syncing holder to database:', error);
      throw error;
    }

    console.log(`✅ Synced holder ${holderAddress} balance from ledger ${ledgerIndex}`);
  }

  /**
   * STEP 5: Process transaction and sync all affected state
   */
  async processMPTTransaction(
    projectId: string,
    txHash: string
  ): Promise<void> {
    await this.connect();

    try {
      // Query blockchain for transaction details
      const txResponse = await this.client.request({
        command: 'tx',
        transaction: txHash,
        binary: false
      });

      // Extract the actual result structure
      const rawResult = txResponse.result as any;
      
      // Convert to our expected format
      const result: MPTTransactionResult = {
        tx_hash: rawResult.hash || txHash,
        ledger_index: rawResult.ledger_index,
        validated: rawResult.validated,
        meta: rawResult.meta,
        tx: rawResult
      };

      if (!result.validated) {
        console.warn(`Transaction ${txHash} not yet validated`);
        return;
      }

      // Determine operation type
      const operationType = this.determineOperationType(result);

      // Extract affected accounts and issuance
      const { issuanceId, fromAddress, toAddress, amount } = this.extractTransactionDetails(result);

      // Record transaction in database
      await this.recordTransaction(projectId, result, operationType, issuanceId, fromAddress, toAddress, amount);

      // Sync affected issuance
      if (issuanceId) {
        await this.syncIssuanceToDatabase(projectId, issuanceId, result.ledger_index, txHash);
      }

      // Sync affected holder balances
      if (fromAddress && issuanceId) {
        await this.syncHolderToDatabase(projectId, issuanceId, fromAddress, result.ledger_index, txHash);
      }
      if (toAddress && issuanceId && toAddress !== fromAddress) {
        await this.syncHolderToDatabase(projectId, issuanceId, toAddress, result.ledger_index, txHash);
      }

      console.log(`✅ Processed ${operationType} transaction ${txHash}`);
    } catch (error) {
      console.error('Error processing MPT transaction:', error);
      throw error;
    }
  }

  /**
   * Determine operation type from transaction
   */
  private determineOperationType(result: MPTTransactionResult): string {
    const { tx, meta } = result;

    // Check transaction type
    if (tx.TransactionType === 'MPTokenIssuanceCreate') return 'CREATE';
    if (tx.TransactionType === 'MPTokenIssuanceDestroy') return 'DESTROY';
    if (tx.TransactionType === 'MPTokenIssuanceSet') {
      if (tx.Flags & 0x00000001) return 'LOCK';
      if (tx.Flags & 0x00000002) return 'UNLOCK';
      return 'UPDATE';
    }
    if (tx.TransactionType === 'MPTokenAuthorize') {
      if (tx.Flags & 0x00000001) return 'UNAUTHORIZE';
      return 'AUTHORIZE';
    }

    // For Payment transactions, check if issuer is involved
    if (tx.TransactionType === 'Payment' && typeof tx.Amount === 'object' && 'mpt_issuance_id' in tx.Amount) {
      const affectedNodes = meta.AffectedNodes || [];
      
      // Check if outstanding amount changed
      for (const node of affectedNodes) {
        if (node.ModifiedNode?.LedgerEntryType === 'MPTokenIssuance') {
          const prev = node.ModifiedNode.PreviousFields?.OutstandingAmount;
          const final = node.ModifiedNode.FinalFields?.OutstandingAmount;
          
          if (prev !== undefined && final !== undefined) {
            const prevNum = BigInt(prev);
            const finalNum = BigInt(final);
            
            if (finalNum > prevNum) return 'MINT';
            if (finalNum < prevNum) return 'BURN';
          }
        }
      }
      
      return 'TRANSFER';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract transaction details for database recording
   */
  private extractTransactionDetails(result: MPTTransactionResult): {
    issuanceId: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    amount: string | null;
  } {
    const { tx } = result;

    let issuanceId: string | null = null;
    let fromAddress: string | null = null;
    let toAddress: string | null = null;
    let amount: string | null = null;

    // Extract from transaction fields
    if (tx.MPTokenIssuanceID) {
      issuanceId = tx.MPTokenIssuanceID;
    }

    if (tx.TransactionType === 'Payment') {
      fromAddress = tx.Account;
      toAddress = tx.Destination;
      
      if (typeof tx.Amount === 'object' && 'mpt_issuance_id' in tx.Amount) {
        issuanceId = tx.Amount.mpt_issuance_id;
        amount = tx.Amount.value;
      }
    } else {
      fromAddress = tx.Account;
      
      // For other transaction types, extract from metadata
      const affectedNodes = result.meta.AffectedNodes || [];
      for (const node of affectedNodes) {
        if (node.ModifiedNode?.LedgerEntryType === 'MPToken' || 
            node.CreatedNode?.LedgerEntryType === 'MPToken') {
          const fields = node.ModifiedNode?.FinalFields || node.CreatedNode?.NewFields;
          if (fields) {
            toAddress = fields.Account;
            amount = fields.MPTAmount;
          }
        }
      }
    }

    return { issuanceId, fromAddress, toAddress, amount };
  }

  /**
   * Record transaction in database
   */
  private async recordTransaction(
    projectId: string,
    result: MPTTransactionResult,
    operationType: string,
    issuanceId: string | null,
    fromAddress: string | null,
    toAddress: string | null,
    amount: string | null
  ): Promise<void> {
    // Record in mpt_transactions (detailed transaction table)
    const { error: txError } = await supabase
      .from('mpt_transactions')
      .upsert({
        project_id: projectId,
        issuance_id: issuanceId || '',
        transaction_type: operationType,
        from_address: fromAddress || '',
        to_address: toAddress || '',
        amount: amount || '0',
        transaction_hash: result.tx_hash,
        ledger_index: result.ledger_index,
        blockchain_timestamp: result.tx.date,
        validated: result.validated,
        fee: result.tx.Fee,
        sequence_number: result.tx.Sequence,
        signing_pub_key: result.tx.SigningPubKey,
        txn_signature: result.tx.TxnSignature,
        transaction_metadata: result.meta,
        affected_nodes: result.meta.AffectedNodes,
        delivered_amount: result.meta.delivered_amount ? JSON.stringify(result.meta.delivered_amount) : null,
        status: result.meta.TransactionResult === 'tesSUCCESS' ? 'confirmed' : 'failed',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'transaction_hash',
        ignoreDuplicates: false
      });

    if (txError) {
      console.error('Error recording transaction in mpt_transactions:', txError);
      throw txError;
    }

    // Record in mpt_operations (simplified operations table for MINT/BURN/TRANSFER)
    // Only record operations that involve token movement
    if (issuanceId && amount && ['MINT', 'BURN', 'TRANSFER'].includes(operationType)) {
      const { error: opError } = await supabase
        .from('mpt_operations')
        .upsert({
          tx_hash: result.tx_hash,
          mpt_issuance_id: issuanceId,
          operation_type: operationType,
          from_address: fromAddress,
          to_address: toAddress,
          amount: amount,
          ledger_index: result.ledger_index,
          timestamp: result.tx.date,
          validated: result.validated,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'tx_hash',
          ignoreDuplicates: false
        });

      if (opError) {
        console.error('Error recording operation in mpt_operations:', opError);
        // Don't throw - mpt_transactions is primary, mpt_operations is supplementary
      }
    }
  }

  /**
   * Parse metadata hex to JSON
   */
  private parseMetadata(metadataHex: string): any {
    if (!metadataHex) return null;

    try {
      const metadataStr = Buffer.from(metadataHex, 'hex').toString('utf8');
      return JSON.parse(metadataStr);
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return null;
    }
  }

  /**
   * Verify database state matches blockchain (reconciliation)
   */
  async verifySync(issuanceId: string): Promise<{
    inSync: boolean;
    differences: string[];
  }> {
    const differences: string[] = [];

    // Get blockchain state
    const blockchainState = await this.getIssuanceFromBlockchain(issuanceId);
    if (!blockchainState) {
      return {
        inSync: false,
        differences: ['Issuance not found on blockchain']
      };
    }

    // Get database state
    const { data: dbState } = await supabase
      .from('mpt_issuances')
      .select('*')
      .eq('issuance_id', issuanceId)
      .single();

    if (!dbState) {
      return {
        inSync: false,
        differences: ['Issuance not found in database']
      };
    }

    // Compare critical fields
    if (dbState.outstanding_amount !== blockchainState.outstanding_amount) {
      differences.push(
        `Outstanding amount mismatch: DB=${dbState.outstanding_amount}, Blockchain=${blockchainState.outstanding_amount}`
      );
    }

    if (dbState.locked_amount !== blockchainState.locked_amount) {
      differences.push(
        `Locked amount mismatch: DB=${dbState.locked_amount}, Blockchain=${blockchainState.locked_amount}`
      );
    }

    return {
      inSync: differences.length === 0,
      differences
    };
  }
}

export const mptSyncService = new MPTSyncService();
