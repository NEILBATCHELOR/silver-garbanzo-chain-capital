/**
 * MPT Database Sync Client
 * 
 * Frontend service to trigger database synchronization after blockchain operations
 * CRITICAL: Only call after blockchain confirmation (validated: true)
 */

// Get backend API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface SyncTransactionParams {
  projectId: string;
  txHash: string;
}

export interface SyncIssuanceParams {
  projectId: string;
  issuanceId: string;
  ledgerIndex?: number;
}

export interface SyncHolderParams {
  projectId: string;
  issuanceId: string;
  holderAddress: string;
  ledgerIndex?: number;
}

export interface BlockchainIssuanceState {
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

export interface BlockchainHolderState {
  account: string;
  issuance_id: string;
  balance: string;
  locked_amount: string;
  flags: number;
  previous_txn_id: string;
  previous_txn_lgr_seq: number;
}

/**
 * Simple API client helper
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export class MPTDatabaseSyncService {

  /**
   * Sync all state changes from a validated transaction
   * 
   * Call this AFTER transaction is validated on blockchain:
   * ```typescript
   * const txResult = await xrplClient.submitAndWait(tx, { wallet });
   * if (txResult.result.validated) {
   *   await mptDatabaseSync.syncTransaction({
   *     projectId,
   *     txHash: txResult.result.hash
   *   });
   * }
   * ```
   */
  async syncTransaction(params: SyncTransactionParams): Promise<void> {
    try {
      const response = await apiRequest<{ success: boolean; error?: string }>(
        '/xrpl/mpt/sync/transaction',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: params.projectId,
            tx_hash: params.txHash
          })
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync transaction');
      }

      console.log(`✅ Synced transaction ${params.txHash} to database`);
    } catch (error: any) {
      console.error('Error syncing transaction to database:', error);
      throw new Error(`Database sync failed: ${error.message}`);
    }
  }

  /**
   * Sync issuance state from blockchain to database
   * 
   * Use when you need to refresh database state without a specific transaction
   */
  async syncIssuance(params: SyncIssuanceParams): Promise<void> {
    try {
      const response = await apiRequest<{ success: boolean; error?: string; ledger_index?: number }>(
        '/xrpl/mpt/sync/issuance',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: params.projectId,
            issuance_id: params.issuanceId,
            ledger_index: params.ledgerIndex
          })
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync issuance');
      }

      console.log(`✅ Synced issuance ${params.issuanceId} from ledger ${response.ledger_index}`);
    } catch (error: any) {
      console.error('Error syncing issuance to database:', error);
      throw new Error(`Database sync failed: ${error.message}`);
    }
  }

  /**
   * Sync holder balance from blockchain to database
   * 
   * Use after operations that affect holder balances (mint, burn, transfer)
   */
  async syncHolder(params: SyncHolderParams): Promise<void> {
    try {
      const response = await apiRequest<{ success: boolean; error?: string; ledger_index?: number }>(
        '/xrpl/mpt/sync/holder',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: params.projectId,
            issuance_id: params.issuanceId,
            holder_address: params.holderAddress,
            ledger_index: params.ledgerIndex
          })
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync holder');
      }

      console.log(`✅ Synced holder ${params.holderAddress} from ledger ${response.ledger_index}`);
    } catch (error: any) {
      console.error('Error syncing holder to database:', error);
      throw new Error(`Database sync failed: ${error.message}`);
    }
  }

  /**
   * Verify database state matches blockchain
   * 
   * Returns true if in sync, false if discrepancies found
   */
  async verifySync(issuanceId: string): Promise<{
    inSync: boolean;
    differences?: string[];
  }> {
    try {
      const response = await apiRequest<{ in_sync: boolean; differences?: string[] }>(
        '/xrpl/mpt/verify-sync',
        {
          method: 'POST',
          body: JSON.stringify({
            issuance_id: issuanceId
          })
        }
      );

      return {
        inSync: response.in_sync,
        differences: response.differences
      };
    } catch (error: any) {
      console.error('Error verifying sync:', error);
      throw new Error(`Sync verification failed: ${error.message}`);
    }
  }

  /**
   * Query blockchain directly (bypasses database)
   * 
   * Use when you need authoritative state and can't trust database
   */
  async getBlockchainState(issuanceId: string): Promise<BlockchainIssuanceState> {
    try {
      const response = await apiRequest<{ success: boolean; data: BlockchainIssuanceState; error?: string }>(
        `/xrpl/mpt/blockchain-state/${issuanceId}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Issuance not found on blockchain');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error querying blockchain state:', error);
      throw new Error(`Blockchain query failed: ${error.message}`);
    }
  }

  /**
   * Query holder balance directly from blockchain (bypasses database)
   * 
   * Use when you need authoritative balance and can't trust database
   */
  async getBlockchainHolderState(
    issuanceId: string, 
    holderAddress: string
  ): Promise<BlockchainHolderState> {
    try {
      const response = await apiRequest<{ success: boolean; data: BlockchainHolderState; error?: string }>(
        `/xrpl/mpt/blockchain-holder/${issuanceId}/${holderAddress}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Holder not found on blockchain');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error querying blockchain holder state:', error);
      throw new Error(`Blockchain query failed: ${error.message}`);
    }
  }

  /**
   * Helper: Sync after MPT creation
   */
  async syncAfterCreate(
    projectId: string,
    txHash: string,
    issuanceId: string,
    issuerAddress: string,
    ledgerIndex: number
  ): Promise<void> {
    // Process the creation transaction
    await this.syncTransaction({ projectId, txHash });
    
    // Ensure issuance state is synced
    await this.syncIssuance({ projectId, issuanceId, ledgerIndex });
    
    console.log(`✅ Synced MPT creation for ${issuanceId}`);
  }

  /**
   * Helper: Sync after MPT payment/transfer
   */
  async syncAfterPayment(
    projectId: string,
    txHash: string,
    issuanceId: string,
    fromAddress: string,
    toAddress: string,
    ledgerIndex: number
  ): Promise<void> {
    // Process the payment transaction
    await this.syncTransaction({ projectId, txHash });
    
    // Sync both sender and receiver balances
    await Promise.all([
      this.syncHolder({ projectId, issuanceId, holderAddress: fromAddress, ledgerIndex }),
      this.syncHolder({ projectId, issuanceId, holderAddress: toAddress, ledgerIndex })
    ]);
    
    // Sync issuance to update outstanding_amount if issuer was involved
    await this.syncIssuance({ projectId, issuanceId, ledgerIndex });
    
    console.log(`✅ Synced MPT payment from ${fromAddress} to ${toAddress}`);
  }

  /**
   * Helper: Sync after authorization
   */
  async syncAfterAuthorize(
    projectId: string,
    txHash: string,
    issuanceId: string,
    holderAddress: string,
    ledgerIndex: number
  ): Promise<void> {
    // Process the authorization transaction
    await this.syncTransaction({ projectId, txHash });
    
    // Sync holder to update authorized status
    await this.syncHolder({ projectId, issuanceId, holderAddress, ledgerIndex });
    
    console.log(`✅ Synced MPT authorization for ${holderAddress}`);
  }

  /**
   * Helper: Sync after lock/unlock
   */
  async syncAfterLock(
    projectId: string,
    txHash: string,
    issuanceId: string,
    holderAddress: string | null,
    ledgerIndex: number
  ): Promise<void> {
    // Process the lock/unlock transaction
    await this.syncTransaction({ projectId, txHash });
    
    if (holderAddress) {
      // Specific holder lock
      await this.syncHolder({ projectId, issuanceId, holderAddress, ledgerIndex });
    } else {
      // Global lock - sync issuance
      await this.syncIssuance({ projectId, issuanceId, ledgerIndex });
    }
    
    console.log(`✅ Synced MPT lock/unlock`);
  }
}

// Export singleton instance
export const mptDatabaseSync = new MPTDatabaseSyncService();
