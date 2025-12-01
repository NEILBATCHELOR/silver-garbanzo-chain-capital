/**
 * Multi-Sig Event Listener Service
 * 
 * PURPOSE: Listen for on-chain multi-sig contract events and sync to database
 * 
 * EVENTS TRACKED:
 * - ConfirmTransaction: When an owner confirms a transaction
 * - ExecuteTransaction: When a transaction is executed
 * - RevokeConfirmation: When an owner revokes their confirmation
 * 
 * This service maintains the Layer 3 (Blockchain State) tables:
 * - multi_sig_on_chain_transactions
 * - multi_sig_on_chain_confirmations
 * 
 * And syncs status back to Layer 2 (Business Logic) tables:
 * - multi_sig_proposals
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ListenerConfig {
  walletId: string;
  walletAddress: string;
  blockchain: string;
  abi?: any;
  projectId?: string;
}

export interface ListenerStatus {
  walletId: string;
  walletAddress: string;
  blockchain: string;
  isListening: boolean;
  eventsProcessed: number;
  errors: string[];
  startedAt: Date | null;
}

interface EventListenerInstance {
  contract: ethers.Contract;
  listeners: {
    confirm: any;
    execute: any;
    revoke: any;
  };
  status: {
    walletAddress: string;
    blockchain: string;
    eventsProcessed: number;
    errors: string[];
    startedAt: Date;
  };
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigEventListener {
  private static instance: MultiSigEventListener;
  private activeListeners: Map<string, EventListenerInstance> = new Map();

  static getInstance(): MultiSigEventListener {
    if (!MultiSigEventListener.instance) {
      MultiSigEventListener.instance = new MultiSigEventListener();
    }
    return MultiSigEventListener.instance;
  }

  /**
   * Start listening for events on a multi-sig wallet
   */
  async startListening(config: ListenerConfig): Promise<void> {
    try {
      // Don't start if already listening
      if (this.activeListeners.has(config.walletId)) {
        console.log('[MultiSig Events] Already listening to wallet:', config.walletId);
        return;
      }

      // Setup provider
      const validatedChain = validateBlockchain(config.blockchain);
      const chainId = getChainId(validatedChain);
      
      // Determine network type based on chain ID
      const networkType: NetworkType = chainId && isTestnet(chainId) ? 'testnet' : 'mainnet';
      
      const rpcConfig = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!rpcConfig) {
        throw new Error(`No RPC configuration for ${validatedChain} (${networkType})`);
      }

      const provider = new ethers.JsonRpcProvider(rpcConfig.url, {
        chainId,
        name: validatedChain
      });

      // Create contract instance
      const contract = new ethers.Contract(
        config.walletAddress,
        config.abi || this.getDefaultMultiSigABI(),
        provider
      );

      console.log('[MultiSig Events] Starting event listeners for wallet:', {
        walletId: config.walletId,
        address: config.walletAddress,
        blockchain: config.blockchain
      });

      // Setup event listeners
      const confirmListener = contract.on(
        'ConfirmTransaction',
        async (owner: string, txIndex: bigint, event: any) => {
          await this.handleConfirmEvent(
            config.walletId,
            config.projectId,
            owner,
            Number(txIndex),
            event
          );
        }
      );

      const executeListener = contract.on(
        'ExecuteTransaction',
        async (owner: string, txIndex: bigint, event: any) => {
          await this.handleExecuteEvent(
            config.walletId,
            config.projectId,
            Number(txIndex),
            event
          );
        }
      );

      const revokeListener = contract.on(
        'RevokeConfirmation',
        async (owner: string, txIndex: bigint, event: any) => {
          await this.handleRevokeEvent(
            config.walletId,
            Number(txIndex),
            owner,
            event
          );
        }
      );

      // Store listener instance
      this.activeListeners.set(config.walletId, {
        contract,
        listeners: {
          confirm: confirmListener,
          execute: executeListener,
          revoke: revokeListener
        },
        status: {
          walletAddress: config.walletAddress,
          blockchain: config.blockchain,
          eventsProcessed: 0,
          errors: [],
          startedAt: new Date()
        }
      });

      console.log('[MultiSig Events] Event listeners started successfully');
    } catch (error: any) {
      console.error('[MultiSig Events] Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for events on a multi-sig wallet
   */
  async stopListening(walletId: string): Promise<void> {
    const listener = this.activeListeners.get(walletId);
    if (!listener) {
      return;
    }

    try {
      // Remove all listeners
      listener.contract.removeAllListeners('ConfirmTransaction');
      listener.contract.removeAllListeners('ExecuteTransaction');
      listener.contract.removeAllListeners('RevokeConfirmation');

      // Remove from map
      this.activeListeners.delete(walletId);

      console.log('[MultiSig Events] Stopped listening to wallet:', walletId);
    } catch (error) {
      console.error('[MultiSig Events] Error stopping listener:', error);
    }
  }

  /**
   * Stop all active listeners (alias for stopAllListeners)
   */
  async stopAll(): Promise<void> {
    await this.stopAllListeners();
  }

  /**
   * Stop all active listeners
   */
  async stopAllListeners(): Promise<void> {
    const walletIds = Array.from(this.activeListeners.keys());
    
    for (const walletId of walletIds) {
      await this.stopListening(walletId);
    }

    console.log('[MultiSig Events] All listeners stopped');
  }

  /**
   * Get list of wallets being listened to
   */
  getActiveListeners(): string[] {
    return Array.from(this.activeListeners.keys());
  }

  /**
   * Get status of a specific listener
   */
  getStatus(walletId: string): ListenerStatus | null {
    const listener = this.activeListeners.get(walletId);
    if (!listener) {
      return null;
    }

    return {
      walletId,
      walletAddress: listener.status.walletAddress,
      blockchain: listener.status.blockchain,
      isListening: true,
      eventsProcessed: listener.status.eventsProcessed,
      errors: [...listener.status.errors],
      startedAt: listener.status.startedAt
    };
  }

  /**
   * Get statuses of all active listeners
   */
  getAllStatuses(): ListenerStatus[] {
    const statuses: ListenerStatus[] = [];
    
    for (const [walletId, listener] of this.activeListeners) {
      statuses.push({
        walletId,
        walletAddress: listener.status.walletAddress,
        blockchain: listener.status.blockchain,
        isListening: true,
        eventsProcessed: listener.status.eventsProcessed,
        errors: [...listener.status.errors],
        startedAt: listener.status.startedAt
      });
    }

    return statuses;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle ConfirmTransaction event
   */
  private async handleConfirmEvent(
    walletId: string,
    projectId: string | undefined,
    owner: string,
    txIndex: number,
    event: any
  ): Promise<void> {
    const listener = this.activeListeners.get(walletId);
    
    try {
      console.log('[MultiSig Events] ConfirmTransaction event:', {
        walletId,
        owner,
        txIndex,
        transactionHash: event.log?.transactionHash,
        blockNumber: event.log?.blockNumber
      });

      // Check if confirmation already recorded
      const { data: existing } = await supabase
        .from('multi_sig_on_chain_confirmations')
        .select('id')
        .eq('on_chain_transaction_id', txIndex)
        .eq('owner_address', owner.toLowerCase())
        .single();

      if (existing) {
        console.log('[MultiSig Events] Confirmation already recorded, skipping');
        return;
      }

      // Record confirmation in Layer 3
      await supabase
        .from('multi_sig_on_chain_confirmations')
        .insert({
          on_chain_transaction_id: txIndex,
          owner_address: owner.toLowerCase(),
          confirmation_tx_hash: event.log?.transactionHash,
          block_number: event.log?.blockNumber,
          timestamp: Math.floor(Date.now() / 1000),
          project_id: projectId
        });

      // Update confirmation count in on-chain transaction
      const { data: onChainTx } = await supabase
        .from('multi_sig_on_chain_transactions')
        .select('num_confirmations')
        .eq('on_chain_tx_id', txIndex)
        .single();

      if (onChainTx) {
        await supabase
          .from('multi_sig_on_chain_transactions')
          .update({
            num_confirmations: (onChainTx.num_confirmations || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('on_chain_tx_id', txIndex);
      }

      // Increment events processed counter
      if (listener) {
        listener.status.eventsProcessed++;
      }

      console.log('[MultiSig Events] Confirmation recorded successfully');
    } catch (error: any) {
      console.error('[MultiSig Events] Error handling confirm event:', error);
      
      // Track error
      if (listener) {
        listener.status.errors.push(`Confirm event error: ${error.message}`);
      }
    }
  }

  /**
   * Handle ExecuteTransaction event
   */
  private async handleExecuteEvent(
    walletId: string,
    projectId: string | undefined,
    txIndex: number,
    event: any
  ): Promise<void> {
    const listener = this.activeListeners.get(walletId);
    
    try {
      console.log('[MultiSig Events] ExecuteTransaction event:', {
        walletId,
        txIndex,
        transactionHash: event.log?.transactionHash,
        blockNumber: event.log?.blockNumber
      });

      // Update Layer 3 on-chain transaction
      await supabase
        .from('multi_sig_on_chain_transactions')
        .update({
          executed: true,
          execution_tx_hash: event.log?.transactionHash,
          executed_at_timestamp: Math.floor(Date.now() / 1000),
          updated_at: new Date().toISOString()
        })
        .eq('on_chain_tx_id', txIndex);

      // Find and update Layer 2 proposal
      const { data: proposal } = await supabase
        .from('multi_sig_proposals')
        .select('id')
        .eq('on_chain_tx_id', txIndex)
        .single();

      if (proposal) {
        await supabase
          .from('multi_sig_proposals')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString(),
            execution_hash: event.log?.transactionHash
          })
          .eq('id', proposal.id);

        // Status is tracked in multi_sig_proposals (transaction_proposals table removed)
      }

      // Increment events processed counter
      if (listener) {
        listener.status.eventsProcessed++;
      }

      console.log('[MultiSig Events] Execution recorded and synced across all layers');
    } catch (error: any) {
      console.error('[MultiSig Events] Error handling execute event:', error);
      
      // Track error
      if (listener) {
        listener.status.errors.push(`Execute event error: ${error.message}`);
      }
    }
  }

  /**
   * Handle RevokeConfirmation event
   */
  private async handleRevokeEvent(
    walletId: string,
    txIndex: number,
    owner: string,
    event: any
  ): Promise<void> {
    const listener = this.activeListeners.get(walletId);
    
    try {
      console.log('[MultiSig Events] RevokeConfirmation event:', {
        walletId,
        owner,
        txIndex,
        transactionHash: event.log?.transactionHash
      });

      // Delete confirmation from Layer 3
      await supabase
        .from('multi_sig_on_chain_confirmations')
        .delete()
        .eq('on_chain_transaction_id', txIndex)
        .eq('owner_address', owner.toLowerCase());

      // Update confirmation count
      const { data: onChainTx } = await supabase
        .from('multi_sig_on_chain_transactions')
        .select('num_confirmations')
        .eq('on_chain_tx_id', txIndex)
        .single();

      if (onChainTx) {
        await supabase
          .from('multi_sig_on_chain_transactions')
          .update({
            num_confirmations: Math.max(0, (onChainTx.num_confirmations || 0) - 1),
            updated_at: new Date().toISOString()
          })
          .eq('on_chain_tx_id', txIndex);
      }

      // Increment events processed counter
      if (listener) {
        listener.status.eventsProcessed++;
      }

      console.log('[MultiSig Events] Revocation recorded successfully');
    } catch (error: any) {
      console.error('[MultiSig Events] Error handling revoke event:', error);
      
      // Track error
      if (listener) {
        listener.status.errors.push(`Revoke event error: ${error.message}`);
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get default multi-sig ABI
   */
  private getDefaultMultiSigABI() {
    return [
      'event ConfirmTransaction(address indexed owner, uint256 indexed txIndex)',
      'event ExecuteTransaction(address indexed owner, uint256 indexed txIndex)',
      'event RevokeConfirmation(address indexed owner, uint256 indexed txIndex)',
      'function isOwner(address owner) public view returns (bool)',
      'function requiredSignatures() public view returns (uint256)'
    ];
  }

  /**
   * Start listeners for all multi-sig wallets in a project
   */
  async startListenersForProject(projectId: string): Promise<void> {
    try {
      const { data: wallets, error } = await supabase
        .from('multi_sig_wallets')
        .select('id, address, blockchain, abi, project_id')
        .eq('project_id', projectId);

      if (error || !wallets || wallets.length === 0) {
        console.log('[MultiSig Events] No wallets found for project:', projectId);
        return;
      }

      console.log(`[MultiSig Events] Starting listeners for ${wallets.length} wallets`);

      for (const wallet of wallets) {
        try {
          await this.startListening({
            walletId: wallet.id,
            walletAddress: wallet.address,
            blockchain: wallet.blockchain,
            abi: wallet.abi,
            projectId: wallet.project_id
          });
        } catch (error) {
          console.error(`[MultiSig Events] Failed to start listener for wallet ${wallet.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[MultiSig Events] Error starting project listeners:', error);
    }
  }

  /**
   * Start listeners for a specific user's wallets
   */
  async startListenersForUser(userId: string): Promise<void> {
    try {
      // Get wallets where user is an owner
      const { data: ownerships, error } = await supabase
        .from('multi_sig_wallet_owners')
        .select(`
          wallet_id,
          multi_sig_wallets!inner(
            id,
            address,
            blockchain,
            abi,
            project_id
          )
        `)
        .eq('user_id', userId);

      if (error || !ownerships || ownerships.length === 0) {
        console.log('[MultiSig Events] No wallets found for user:', userId);
        return;
      }

      console.log(`[MultiSig Events] Starting listeners for ${ownerships.length} user wallets`);

      for (const ownership of ownerships) {
        const wallet = ownership.multi_sig_wallets as any;
        try {
          await this.startListening({
            walletId: wallet.id,
            walletAddress: wallet.address,
            blockchain: wallet.blockchain,
            abi: wallet.abi,
            projectId: wallet.project_id
          });
        } catch (error) {
          console.error(`[MultiSig Events] Failed to start listener for wallet ${wallet.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[MultiSig Events] Error starting user listeners:', error);
    }
  }
}

// Export singleton instance
export const multiSigEventListener = MultiSigEventListener.getInstance();
