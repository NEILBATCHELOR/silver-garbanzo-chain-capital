/**
 * Multi-Sig Event Listener Service
 * 
 * ARCHITECTURE: Event-Driven Blockchain State Synchronization
 * ==========================================================
 * 
 * PURPOSE:
 * - Listen to multi-sig smart contract events in real-time
 * - Populate LAYER 3 (Blockchain State) tables from on-chain events
 * - Sync execution status back to LAYER 1 (UI) and LAYER 2 (Business Logic)
 * - Maintain accurate on-chain state mirror in database
 * 
 * EVENTS TRACKED:
 * 1. SubmitTransaction  → Create multi_sig_on_chain_transactions record
 * 2. ConfirmTransaction → Add multi_sig_on_chain_confirmations record
 * 3. RevokeConfirmation → Remove confirmation, decrement count
 * 4. ExecuteTransaction → Mark as executed, sync back to UI
 * 
 * WORKFLOW:
 * Smart Contract emits event
 *   ↓
 * Event Listener catches event
 *   ↓
 * Update LAYER 3 (multi_sig_on_chain_*)
 *   ↓
 * Sync back to LAYER 2 (multi_sig_proposals)
 *   ↓
 * Sync back to LAYER 1 (transaction_proposals)
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { getChainId, validateBlockchain } from '@/infrastructure/web3/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EventListenerConfig {
  walletId: string;
  walletAddress: string;
  blockchain: string;
  abi?: any[];
  projectId?: string;
}

export interface ListenerStatus {
  walletId: string;
  isListening: boolean;
  startedAt: Date | null;
  lastEventAt: Date | null;
  eventsProcessed: number;
  errors: string[];
}

// ============================================================================
// EVENT LISTENER SERVICE
// ============================================================================

export class MultiSigEventListener {
  private static instance: MultiSigEventListener;
  private listeners: Map<string, ethers.Contract> = new Map();
  private status: Map<string, ListenerStatus> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MultiSigEventListener {
    if (!MultiSigEventListener.instance) {
      MultiSigEventListener.instance = new MultiSigEventListener();
    }
    return MultiSigEventListener.instance;
  }

  // ============================================================================
  // LISTENER LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Start listening to a multi-sig wallet's contract events
   * 
   * @param config - Wallet configuration with address, blockchain, ABI
   */
  async startListening(config: EventListenerConfig): Promise<void> {
    try {
      const { walletId, walletAddress, blockchain, abi, projectId } = config;

      // Check if already listening
      if (this.listeners.has(walletId)) {
        console.log(`Already listening to wallet ${walletId}`);
        return;
      }

      // Phase B & C: Validate blockchain and get chain ID
      const validatedChain = validateBlockchain(blockchain);
      const chainId = getChainId(validatedChain);
      if (!chainId) {
        throw new Error(`Cannot resolve chain ID for blockchain: ${validatedChain}`);
      }

      // Phase D: Get RPC provider with potential fallback
      let rpcUrl: string | null = null;
      
      // Try primary RPC first
      const providerConfig = rpcManager.getProviderConfig(validatedChain as any, 'mainnet');
      if (providerConfig) {
        rpcUrl = providerConfig.url;
      } else {
        // Fall back to public RPC if primary unavailable
        console.warn(`No primary RPC for ${validatedChain}, attempting fallback...`);
        rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, 'mainnet');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC available for blockchain: ${validatedChain} (chainId: ${chainId})`);
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId: chainId,
        name: validatedChain
      });

      // Create contract instance
      const contractABI = abi || this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(walletAddress, contractABI, provider);

      // Initialize status
      this.status.set(walletId, {
        walletId,
        isListening: true,
        startedAt: new Date(),
        lastEventAt: null,
        eventsProcessed: 0,
        errors: []
      });

      // ========================================================================
      // EVENT: SubmitTransaction
      // ========================================================================
      contract.on(
        'SubmitTransaction',
        async (owner: string, txIndex: bigint, to: string, value: bigint, data: string, event: any) => {
          try {
            console.log(`[SubmitTransaction] txIndex=${txIndex}, to=${to}, value=${value}`);
            
            await this.handleSubmitTransaction({
              walletId,
              walletAddress,
              onChainTxId: Number(txIndex),
              to,
              value: value.toString(),
              data,
              submissionTxHash: event.log.transactionHash,
              submittedBy: owner,
              blockNumber: event.log.blockNumber,
              projectId
            });

            this.updateStatus(walletId, { eventsProcessed: 1 });
          } catch (error: any) {
            console.error('[SubmitTransaction] Error:', error);
            this.updateStatus(walletId, { error: error.message });
          }
        }
      );

      // ========================================================================
      // EVENT: ConfirmTransaction
      // ========================================================================
      contract.on(
        'ConfirmTransaction',
        async (owner: string, txIndex: bigint, event: any) => {
          try {
            console.log(`[ConfirmTransaction] txIndex=${txIndex}, owner=${owner}`);
            
            await this.handleConfirmTransaction({
              walletId,
              walletAddress,
              onChainTxId: Number(txIndex),
              ownerAddress: owner,
              confirmationTxHash: event.log.transactionHash,
              blockNumber: event.log.blockNumber
            });

            this.updateStatus(walletId, { eventsProcessed: 1 });
          } catch (error: any) {
            console.error('[ConfirmTransaction] Error:', error);
            this.updateStatus(walletId, { error: error.message });
          }
        }
      );

      // ========================================================================
      // EVENT: RevokeConfirmation
      // ========================================================================
      contract.on(
        'RevokeConfirmation',
        async (owner: string, txIndex: bigint, event: any) => {
          try {
            console.log(`[RevokeConfirmation] txIndex=${txIndex}, owner=${owner}`);
            
            await this.handleRevokeConfirmation({
              walletId,
              walletAddress,
              onChainTxId: Number(txIndex),
              ownerAddress: owner,
              revocationTxHash: event.log.transactionHash
            });

            this.updateStatus(walletId, { eventsProcessed: 1 });
          } catch (error: any) {
            console.error('[RevokeConfirmation] Error:', error);
            this.updateStatus(walletId, { error: error.message });
          }
        }
      );

      // ========================================================================
      // EVENT: ExecuteTransaction
      // ========================================================================
      contract.on(
        'ExecuteTransaction',
        async (owner: string, txIndex: bigint, event: any) => {
          try {
            console.log(`[ExecuteTransaction] txIndex=${txIndex}, executor=${owner}`);
            
            await this.handleExecuteTransaction({
              walletId,
              walletAddress,
              onChainTxId: Number(txIndex),
              executionTxHash: event.log.transactionHash,
              executedBy: owner,
              blockNumber: event.log.blockNumber
            });

            this.updateStatus(walletId, { eventsProcessed: 1 });
          } catch (error: any) {
            console.error('[ExecuteTransaction] Error:', error);
            this.updateStatus(walletId, { error: error.message });
          }
        }
      );

      // Store contract reference
      this.listeners.set(walletId, contract);

      // Set up auto-reconnect on provider disconnect
      provider.on('error', (error) => {
        console.error(`Provider error for wallet ${walletId}:`, error);
        this.scheduleReconnect(walletId, config);
      });

      console.log(`✅ Started listening to wallet ${walletId} (${walletAddress})`);
    } catch (error: any) {
      console.error(`Failed to start listener for wallet ${config.walletId}:`, error);
      throw error;
    }
  }

  /**
   * Stop listening to a wallet's events
   */
  async stopListening(walletId: string): Promise<void> {
    const contract = this.listeners.get(walletId);
    if (contract) {
      await contract.removeAllListeners();
      this.listeners.delete(walletId);
      
      const statusData = this.status.get(walletId);
      if (statusData) {
        statusData.isListening = false;
      }

      console.log(`❌ Stopped listening to wallet ${walletId}`);
    }

    // Clear reconnect timer
    const interval = this.reconnectIntervals.get(walletId);
    if (interval) {
      clearTimeout(interval);
      this.reconnectIntervals.delete(walletId);
    }
  }

  /**
   * Stop all active listeners
   */
  async stopAll(): Promise<void> {
    const walletIds = Array.from(this.listeners.keys());
    await Promise.all(walletIds.map(id => this.stopListening(id)));
  }

  /**
   * Get status of a specific listener
   */
  getStatus(walletId: string): ListenerStatus | null {
    return this.status.get(walletId) || null;
  }

  /**
   * Get all active listeners
   */
  getAllStatuses(): ListenerStatus[] {
    return Array.from(this.status.values());
  }

  // ============================================================================
  // EVENT HANDLERS: POPULATE LAYER 3 (ON-CHAIN STATE)
  // ============================================================================

  /**
   * Handle SubmitTransaction event
   * Creates record in multi_sig_on_chain_transactions
   */
  private async handleSubmitTransaction(data: {
    walletId: string;
    walletAddress: string;
    onChainTxId: number;
    to: string;
    value: string;
    data: string;
    submissionTxHash: string;
    submittedBy: string;
    blockNumber: number;
    projectId?: string;
  }): Promise<void> {
    // Check if already exists
    const { data: existing } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('id')
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .single();

    if (existing) {
      console.log(`Transaction ${data.onChainTxId} already exists, skipping`);
      return;
    }

    // Create on-chain transaction record
    const { error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .insert({
        wallet_id: data.walletId,
        on_chain_tx_id: data.onChainTxId,
        to_address: data.to,
        value: data.value,
        data: data.data || null,
        executed: false,
        num_confirmations: 1, // Submitter auto-confirms
        created_at_timestamp: Math.floor(Date.now() / 1000),
        submission_tx_hash: data.submissionTxHash,
        submitted_by: data.submittedBy,
        project_id: data.projectId,
        block_number: data.blockNumber
      });

    if (error) {
      console.error('Failed to insert on-chain transaction:', error);
      throw error;
    }

    // Add submitter's auto-confirmation
    await this.handleConfirmTransaction({
      walletId: data.walletId,
      walletAddress: data.walletAddress,
      onChainTxId: data.onChainTxId,
      ownerAddress: data.submittedBy,
      confirmationTxHash: data.submissionTxHash,
      blockNumber: data.blockNumber
    });

    console.log(`✅ Created on-chain transaction ${data.onChainTxId} for wallet ${data.walletId}`);
  }

  /**
   * Handle ConfirmTransaction event
   * Adds record to multi_sig_on_chain_confirmations and updates confirmation count
   */
  private async handleConfirmTransaction(data: {
    walletId: string;
    walletAddress: string;
    onChainTxId: number;
    ownerAddress: string;
    confirmationTxHash: string;
    blockNumber: number;
  }): Promise<void> {
    // Check if confirmation already exists
    const { data: existing } = await supabase
      .from('multi_sig_on_chain_confirmations')
      .select('id')
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .eq('owner_address', data.ownerAddress)
      .single();

    if (existing) {
      console.log(`Confirmation already exists for ${data.ownerAddress}, skipping`);
      return;
    }

    // Add confirmation record
    const { error: insertError } = await supabase
      .from('multi_sig_on_chain_confirmations')
      .insert({
        wallet_id: data.walletId,
        on_chain_tx_id: data.onChainTxId,
        owner_address: data.ownerAddress,
        confirmation_tx_hash: data.confirmationTxHash,
        confirmed_at_timestamp: Math.floor(Date.now() / 1000),
        block_number: data.blockNumber
      });

    if (insertError) {
      console.error('Failed to insert confirmation:', insertError);
      throw insertError;
    }

    // Update confirmation count
    const { data: onChainTx, error: fetchError } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('num_confirmations')
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch on-chain transaction:', fetchError);
      return;
    }

    await supabase
      .from('multi_sig_on_chain_transactions')
      .update({ 
        num_confirmations: (onChainTx?.num_confirmations || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId);

    console.log(`✅ Added confirmation from ${data.ownerAddress} for tx ${data.onChainTxId}`);
  }

  /**
   * Handle RevokeConfirmation event
   * Removes confirmation and decrements count
   */
  private async handleRevokeConfirmation(data: {
    walletId: string;
    walletAddress: string;
    onChainTxId: number;
    ownerAddress: string;
    revocationTxHash: string;
  }): Promise<void> {
    // Remove confirmation record
    const { error: deleteError } = await supabase
      .from('multi_sig_on_chain_confirmations')
      .delete()
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .eq('owner_address', data.ownerAddress);

    if (deleteError) {
      console.error('Failed to delete confirmation:', deleteError);
      throw deleteError;
    }

    // Decrement confirmation count
    const { data: onChainTx } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('num_confirmations')
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .single();

    if (onChainTx) {
      await supabase
        .from('multi_sig_on_chain_transactions')
        .update({ 
          num_confirmations: Math.max(0, onChainTx.num_confirmations - 1),
          updated_at: new Date().toISOString()
        })
        .eq('wallet_id', data.walletId)
        .eq('on_chain_tx_id', data.onChainTxId);
    }

    console.log(`✅ Revoked confirmation from ${data.ownerAddress} for tx ${data.onChainTxId}`);
  }

  /**
   * Handle ExecuteTransaction event
   * Marks transaction as executed and syncs back to UI layer
   */
  private async handleExecuteTransaction(data: {
    walletId: string;
    walletAddress: string;
    onChainTxId: number;
    executionTxHash: string;
    executedBy: string;
    blockNumber: number;
  }): Promise<void> {
    // Update on-chain transaction as executed (LAYER 3)
    const { error: updateError } = await supabase
      .from('multi_sig_on_chain_transactions')
      .update({
        executed: true,
        execution_tx_hash: data.executionTxHash,
        executed_by: data.executedBy,
        executed_at: new Date().toISOString(),
        execution_block_number: data.blockNumber
      })
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId);

    if (updateError) {
      console.error('Failed to update on-chain transaction:', updateError);
      throw updateError;
    }

    console.log(`✅ Marked on-chain transaction ${data.onChainTxId} as executed`);

    // ========================================================================
    // SYNC BACK TO LAYER 2 (multi_sig_proposals)
    // ========================================================================
    const { data: proposal } = await supabase
      .from('multi_sig_proposals')
      .select('id')
      .eq('wallet_id', data.walletId)
      .eq('on_chain_tx_id', data.onChainTxId)
      .single();

    if (proposal) {
      await supabase
        .from('multi_sig_proposals')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_hash: data.executionTxHash
        })
        .eq('id', proposal.id);

      console.log(`✅ Synced status to multi_sig_proposals (Layer 2)`);

      // ======================================================================
      // SYNC BACK TO LAYER 1 (transaction_proposals)
      // ======================================================================
      const { data: uiProposal } = await supabase
        .from('transaction_proposals')
        .select('id')
        .eq('multi_sig_proposal_id', proposal.id)
        .single();

      if (uiProposal) {
        await supabase
          .from('transaction_proposals')
          .update({
            status: 'executed',
            updated_at: new Date().toISOString()
          })
          .eq('id', uiProposal.id);

        console.log(`✅ Synced status to transaction_proposals (Layer 1 UI)`);
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Update listener status
   */
  private updateStatus(walletId: string, updates: {
    eventsProcessed?: number;
    error?: string;
  }): void {
    const current = this.status.get(walletId);
    if (!current) return;

    if (updates.eventsProcessed) {
      current.eventsProcessed += updates.eventsProcessed;
      current.lastEventAt = new Date();
    }

    if (updates.error) {
      current.errors.push(updates.error);
      // Keep only last 10 errors
      if (current.errors.length > 10) {
        current.errors.shift();
      }
    }

    this.status.set(walletId, current);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(walletId: string, config: EventListenerConfig): void {
    // Clear existing timer
    const existing = this.reconnectIntervals.get(walletId);
    if (existing) {
      clearTimeout(existing);
    }

    // Attempt reconnect after 5 seconds
    const timer = setTimeout(async () => {
      try {
        console.log(`Attempting to reconnect wallet ${walletId}...`);
        await this.stopListening(walletId);
        await this.startListening(config);
      } catch (error) {
        console.error(`Reconnection failed for wallet ${walletId}:`, error);
        // Schedule another attempt
        this.scheduleReconnect(walletId, config);
      }
    }, 5000);

    this.reconnectIntervals.set(walletId, timer);
  }

  /**
   * Get default multi-sig ABI
   */
  private getDefaultMultiSigABI() {
    return [
      'event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data)',
      'event ConfirmTransaction(address indexed owner, uint256 indexed txIndex)',
      'event RevokeConfirmation(address indexed owner, uint256 indexed txIndex)',
      'event ExecuteTransaction(address indexed owner, uint256 indexed txIndex)'
    ];
  }
}

// Export singleton instance
export const multiSigEventListener = MultiSigEventListener.getInstance();
