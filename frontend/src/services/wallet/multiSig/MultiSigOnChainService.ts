/**
 * Multi-Signature On-Chain Transaction Service
 * Handles on-chain transaction tracking using proper schema
 * Separates on-chain state from off-chain proposal lifecycle
 */

import { supabase } from '@/infrastructure/database/client';
import type { Database } from '@/types/core/database';

// ============================================================================
// TYPES
// ============================================================================

type OnChainTransaction = Database['public']['Tables']['multi_sig_on_chain_transactions']['Row'];
type OnChainConfirmation = Database['public']['Tables']['multi_sig_on_chain_confirmations']['Row'];

export interface OnChainTransactionWithConfirmations extends OnChainTransaction {
  confirmations: OnChainConfirmation[];
}

export interface CreateOnChainTransactionParams {
  walletId: string;
  onChainTxId: number;
  toAddress: string;
  value: string;
  data?: string;
  createdAtTimestamp: number;
  expiresAtTimestamp?: number;
  submissionTxHash: string;
  submittedBy: string;
  projectId?: string;
}

export interface CreateOnChainConfirmationParams {
  onChainTransactionId: string;
  signerAddress: string;
  confirmationTxHash: string;
  confirmedAtTimestamp: number;
  projectId?: string;
}

export interface UpdateExecutionParams {
  onChainTransactionId: string;
  executionTxHash: string;
  executedBy: string;
  executedAt: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MultiSigOnChainService {
  private static instance: MultiSigOnChainService;

  static getInstance(): MultiSigOnChainService {
    if (!MultiSigOnChainService.instance) {
      MultiSigOnChainService.instance = new MultiSigOnChainService();
    }
    return MultiSigOnChainService.instance;
  }

  // ==========================================================================
  // ON-CHAIN TRANSACTION CREATION
  // ==========================================================================

  /**
   * Create on-chain transaction record after submission to contract
   */
  async createOnChainTransaction(
    params: CreateOnChainTransactionParams
  ): Promise<OnChainTransaction> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .insert({
        wallet_id: params.walletId,
        on_chain_tx_id: params.onChainTxId,
        to_address: params.toAddress,
        value: params.value,
        data: params.data || '0x',
        executed: false,  // Not yet executed
        num_confirmations: 1,  // Submitter auto-confirmed
        created_at_timestamp: params.createdAtTimestamp,
        expires_at_timestamp: params.expiresAtTimestamp,
        submission_tx_hash: params.submissionTxHash,
        submitted_by: params.submittedBy,
        project_id: params.projectId
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create on-chain transaction:', error);
      throw new Error(`Failed to create on-chain transaction: ${error.message}`);
    }

    return data;
  }

  // ==========================================================================
  // ON-CHAIN CONFIRMATION TRACKING
  // ==========================================================================

  /**
   * Record on-chain confirmation after owner confirms
   */
  async createOnChainConfirmation(
    params: CreateOnChainConfirmationParams
  ): Promise<OnChainConfirmation> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_confirmations')
      .insert({
        on_chain_transaction_id: params.onChainTransactionId,
        signer_address: params.signerAddress,
        confirmation_tx_hash: params.confirmationTxHash,
        confirmed_at_timestamp: params.confirmedAtTimestamp,
        project_id: params.projectId
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create on-chain confirmation:', error);
      throw new Error(`Failed to create on-chain confirmation: ${error.message}`);
    }

    // Increment confirmation counter
    await this.incrementConfirmationCount(params.onChainTransactionId);

    return data;
  }

  /**
   * Increment confirmation count for transaction
   */
  private async incrementConfirmationCount(onChainTransactionId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_on_chain_confirmations', {
      p_transaction_id: onChainTransactionId
    });

    if (error) {
      // Fallback to manual increment
      console.warn('RPC failed, using manual increment:', error);
      const { data: tx } = await supabase
        .from('multi_sig_on_chain_transactions')
        .select('num_confirmations')
        .eq('id', onChainTransactionId)
        .single();

      if (tx) {
        await supabase
          .from('multi_sig_on_chain_transactions')
          .update({ num_confirmations: tx.num_confirmations + 1 })
          .eq('id', onChainTransactionId);
      }
    }
  }

  // ==========================================================================
  // EXECUTION TRACKING
  // ==========================================================================

  /**
   * Mark transaction as executed
   */
  async markAsExecuted(params: UpdateExecutionParams): Promise<void> {
    const { error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .update({
        executed: true,
        execution_tx_hash: params.executionTxHash,
        executed_by: params.executedBy,
        executed_at: params.executedAt
      })
      .eq('id', params.onChainTransactionId);

    if (error) {
      console.error('Failed to mark transaction as executed:', error);
      throw new Error(`Failed to mark transaction as executed: ${error.message}`);
    }
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  /**
   * Get on-chain transaction by wallet and contract tx ID
   */
  async getOnChainTransaction(
    walletId: string,
    onChainTxId: number
  ): Promise<OnChainTransactionWithConfirmations | null> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select(`
        *,
        confirmations:multi_sig_on_chain_confirmations(*)
      `)
      .eq('wallet_id', walletId)
      .eq('on_chain_tx_id', onChainTxId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Failed to get on-chain transaction:', error);
      throw new Error(`Failed to get on-chain transaction: ${error.message}`);
    }

    return data as OnChainTransactionWithConfirmations;
  }

  /**
   * Get all on-chain transactions for a wallet
   */
  async getWalletOnChainTransactions(
    walletId: string
  ): Promise<OnChainTransactionWithConfirmations[]> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select(`
        *,
        confirmations:multi_sig_on_chain_confirmations(*)
      `)
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get wallet on-chain transactions:', error);
      throw new Error(`Failed to get wallet on-chain transactions: ${error.message}`);
    }

    return (data || []) as OnChainTransactionWithConfirmations[];
  }

  /**
   * Check if transaction is executed
   */
  async isTransactionExecuted(
    walletId: string,
    onChainTxId: number
  ): Promise<boolean> {
    const { data } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('executed')
      .eq('wallet_id', walletId)
      .eq('on_chain_tx_id', onChainTxId)
      .single();

    return data?.executed || false;
  }

  /**
   * Get confirmation count for transaction
   */
  async getConfirmationCount(
    walletId: string,
    onChainTxId: number
  ): Promise<number> {
    const { data } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('num_confirmations')
      .eq('wallet_id', walletId)
      .eq('on_chain_tx_id', onChainTxId)
      .single();

    return data?.num_confirmations || 0;
  }

  /**
   * Get pending (not executed) transactions for wallet
   */
  async getPendingTransactions(
    walletId: string
  ): Promise<OnChainTransactionWithConfirmations[]> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select(`
        *,
        confirmations:multi_sig_on_chain_confirmations(*)
      `)
      .eq('wallet_id', walletId)
      .eq('executed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get pending transactions:', error);
      throw new Error(`Failed to get pending transactions: ${error.message}`);
    }

    return (data || []) as OnChainTransactionWithConfirmations[];
  }

  /**
   * Get executed transactions for wallet
   */
  async getExecutedTransactions(
    walletId: string
  ): Promise<OnChainTransactionWithConfirmations[]> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select(`
        *,
        confirmations:multi_sig_on_chain_confirmations(*)
      `)
      .eq('wallet_id', walletId)
      .eq('executed', true)
      .order('executed_at', { ascending: false });

    if (error) {
      console.error('Failed to get executed transactions:', error);
      throw new Error(`Failed to get executed transactions: ${error.message}`);
    }

    return (data || []) as OnChainTransactionWithConfirmations[];
  }
}

// Export singleton instance
export const multiSigOnChainService = MultiSigOnChainService.getInstance();
