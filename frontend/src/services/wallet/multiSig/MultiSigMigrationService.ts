/**
 * Multi-Signature Migration Service
 * Handles migration from old proposal system to new on-chain tracking system
 */

import { supabase } from '@/infrastructure/database/client';
import { multiSigOnChainService } from './MultiSigOnChainService';
import { ethers } from 'ethers';
import MultiSigWalletABI from '@/../foundry-contracts/out/MultiSigWallet.sol/MultiSigWallet.json';
import { getRpcUrl } from './MultiSigHelpers';

// ============================================================================
// TYPES
// ============================================================================

interface ProposalData {
  id: string;
  wallet_id: string;
  on_chain_tx_id: number | null;
  on_chain_tx_hash: string | null;
  raw_transaction: any;
  executed_at: string | null;
  execution_hash: string | null;
  status: string;
  project_id?: string;
}

interface WalletData {
  id: string;
  address: string;
  blockchain: string;
  threshold: number;
  project_id?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MultiSigMigrationService {
  private static instance: MultiSigMigrationService;

  static getInstance(): MultiSigMigrationService {
    if (!MultiSigMigrationService.instance) {
      MultiSigMigrationService.instance = new MultiSigMigrationService();
    }
    return MultiSigMigrationService.instance;
  }

  // ==========================================================================
  // MIGRATION METHODS
  // ==========================================================================

  /**
   * Backfill on-chain transaction data from existing proposals
   * This creates records in the new on-chain tracking tables from old proposal data
   */
  async backfillOnChainTransactions(): Promise<{
    migrated: number;
    skipped: number;
    errors: Array<{ proposalId: string; error: string }>;
  }> {
    const results = {
      migrated: 0,
      skipped: 0,
      errors: [] as Array<{ proposalId: string; error: string }>
    };

    try {
      // Get all proposals that have been submitted on-chain
      const { data: proposals, error } = await supabase
        .from('multi_sig_proposals')
        .select('*')
        .not('on_chain_tx_id', 'is', null)
        .not('on_chain_tx_hash', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch proposals: ${error.message}`);
      }

      if (!proposals || proposals.length === 0) {
        console.log('No proposals to migrate');
        return results;
      }

      console.log(`Found ${proposals.length} proposals to migrate`);

      for (const proposal of proposals as ProposalData[]) {
        try {
          // Check if already migrated
          const existing = await multiSigOnChainService.getOnChainTransaction(
            proposal.wallet_id,
            proposal.on_chain_tx_id!
          );

          if (existing) {
            console.log(`Skipping proposal ${proposal.id} - already migrated`);
            results.skipped++;
            continue;
          }

          // Get wallet data
          const { data: wallet, error: walletError } = await supabase
            .from('multi_sig_wallets')
            .select('*')
            .eq('id', proposal.wallet_id)
            .single();

          if (walletError || !wallet) {
            throw new Error(`Failed to get wallet: ${walletError?.message}`);
          }

          await this.migrateProposal(proposal, wallet as WalletData);
          results.migrated++;
          console.log(`✅ Migrated proposal ${proposal.id}`);
        } catch (error: any) {
          console.error(`Failed to migrate proposal ${proposal.id}:`, error);
          results.errors.push({
            proposalId: proposal.id,
            error: error.message
          });
        }
      }

      console.log(`Migration complete: ${results.migrated} migrated, ${results.skipped} skipped, ${results.errors.length} errors`);
      return results;
    } catch (error: any) {
      console.error('Backfill failed:', error);
      throw new Error(`Backfill failed: ${error.message}`);
    }
  }

  /**
   * Migrate a single proposal to on-chain tracking system
   */
  private async migrateProposal(
    proposal: ProposalData,
    wallet: WalletData
  ): Promise<void> {
    // Get contract state to verify execution status
    const contractState = await this.getContractTransactionState(
      wallet.address,
      wallet.blockchain,
      proposal.on_chain_tx_id!
    );

    // Create on-chain transaction record
    await multiSigOnChainService.createOnChainTransaction({
      walletId: proposal.wallet_id,
      onChainTxId: proposal.on_chain_tx_id!,
      toAddress: proposal.raw_transaction.to,
      value: proposal.raw_transaction.value || '0',
      data: proposal.raw_transaction.data || '0x',
      createdAtTimestamp: Math.floor(new Date(contractState.createdAt).getTime() / 1000),
      expiresAtTimestamp: contractState.expiresAt,
      submissionTxHash: proposal.on_chain_tx_hash!,
      submittedBy: contractState.submittedBy,
      projectId: proposal.project_id
    });

    console.log(`Created on-chain transaction for proposal ${proposal.id}`);

    // If executed, update execution status
    if (contractState.executed) {
      const onChainTx = await multiSigOnChainService.getOnChainTransaction(
        proposal.wallet_id,
        proposal.on_chain_tx_id!
      );

      if (onChainTx) {
        await multiSigOnChainService.markAsExecuted({
          onChainTransactionId: onChainTx.id,
          executionTxHash: proposal.execution_hash || proposal.on_chain_tx_hash!,
          executedBy: contractState.executedBy || contractState.submittedBy,
          executedAt: proposal.executed_at || new Date().toISOString()
        });

        console.log(`Marked on-chain transaction as executed`);
      }
    }

    // Migrate confirmations
    await this.migrateConfirmations(proposal, contractState.confirmations);
  }
  /**
   * Migrate confirmations from proposal signatures
   */
  private async migrateConfirmations(
    proposal: ProposalData,
    contractConfirmations: string[]
  ): Promise<void> {
    // Get the on-chain transaction record
    const onChainTx = await multiSigOnChainService.getOnChainTransaction(
      proposal.wallet_id,
      proposal.on_chain_tx_id!
    );

    if (!onChainTx) {
      throw new Error('On-chain transaction not found after creation');
    }

    // Get off-chain signatures
    const { data: signatures } = await supabase
      .from('proposal_signatures')
      .select('*')
      .eq('proposal_id', proposal.id)
      .eq('confirmed_on_chain', true);

    if (!signatures || signatures.length === 0) {
      // No on-chain confirmations in database, use contract state
      for (const signerAddress of contractConfirmations) {
        await multiSigOnChainService.createOnChainConfirmation({
          onChainTransactionId: onChainTx.id,
          signerAddress,
          confirmationTxHash: proposal.on_chain_tx_hash!, // Best we have
          confirmedAtTimestamp: Math.floor(Date.now() / 1000),
          projectId: proposal.project_id
        });
      }
    } else {
      // Use database records
      for (const signature of signatures) {
        if (signature.on_chain_confirmation_tx) {
          await multiSigOnChainService.createOnChainConfirmation({
            onChainTransactionId: onChainTx.id,
            signerAddress: signature.signer_address,
            confirmationTxHash: signature.on_chain_confirmation_tx,
            confirmedAtTimestamp: Math.floor(new Date(signature.signed_at).getTime() / 1000),
            projectId: proposal.project_id
          });
        }
      }
    }

    console.log(`Migrated ${Math.max(signatures?.length || 0, contractConfirmations.length)} confirmations`);
  }

  /**
   * Get transaction state from smart contract
   */
  private async getContractTransactionState(
    walletAddress: string,
    blockchain: string,
    txId: number
  ): Promise<{
    executed: boolean;
    confirmations: string[];
    submittedBy: string;
    executedBy?: string;
    createdAt: Date;
    expiresAt: number;
  }> {
    const provider = new ethers.JsonRpcProvider(getRpcUrl(blockchain));
    const multiSig = new ethers.Contract(
      walletAddress,
      MultiSigWalletABI.abi,
      provider
    );

    // Get transaction from contract
    const tx = await multiSig.getTransaction(txId);
    
    // Transaction tuple: [to, value, data, executed, numConfirmations]
    const executed = tx[3];
    const numConfirmations = Number(tx[4]);

    // Get confirmations
    const confirmations: string[] = [];
    const owners = await multiSig.getOwners();
    
    for (const owner of owners) {
      const confirmed = await multiSig.isTransactionConfirmed(txId, owner);
      if (confirmed) {
        confirmations.push(owner);
      }
    }

    // Try to find submission event
    let submittedBy = owners[0]; // Fallback
    let createdAt = new Date();
    let expiresAt = Math.floor(Date.now() / 1000) + (24 * 3600);

    try {
      const submitFilter = multiSig.filters.SubmitTransaction(null, txId);
      const events = await multiSig.queryFilter(submitFilter, -10000); // Last ~10k blocks
      
      if (events.length > 0) {
        const submitEvent = events[0];
        // Type guard: EventLog has args property
        if ('args' in submitEvent && submitEvent.args) {
          submittedBy = submitEvent.args.owner || owners[0];
          const block = await provider.getBlock(submitEvent.blockNumber);
          createdAt = new Date(block!.timestamp * 1000);
          
          // Check if expiry is encoded in transaction
          if (submitEvent.args.expiry) {
            expiresAt = Number(submitEvent.args.expiry);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to query submit event, using defaults:', error);
    }

    return {
      executed,
      confirmations,
      submittedBy,
      createdAt,
      expiresAt
    };
  }
  /**
   * Sync execution status from contract for a specific proposal
   * Useful for checking if a transaction was executed outside our system
   */
  async syncExecutionStatus(proposalId: string): Promise<{
    wasExecuted: boolean;
    updated: boolean;
  }> {
    const { data: proposal, error } = await supabase
      .from('multi_sig_proposals')
      .select('*, wallet:multi_sig_wallets(*)')
      .eq('id', proposalId)
      .single();

    if (error || !proposal) {
      throw new Error(`Failed to get proposal: ${error?.message}`);
    }

    if (proposal.on_chain_tx_id === null) {
      return { wasExecuted: false, updated: false };
    }

    const wallet = (proposal as any).wallet;
    const contractState = await this.getContractTransactionState(
      wallet.address,
      wallet.blockchain,
      proposal.on_chain_tx_id
    );

    if (contractState.executed && !proposal.executed_at) {
      // Transaction was executed but our database doesn't reflect it
      console.log(`Syncing execution status for proposal ${proposalId}`);

      // Update old system
      await supabase
        .from('multi_sig_proposals')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_hash: proposal.on_chain_tx_hash // Best we have
        })
        .eq('id', proposalId);

      // Update new system if record exists
      const onChainTx = await multiSigOnChainService.getOnChainTransaction(
        proposal.wallet_id,
        proposal.on_chain_tx_id
      );

      if (onChainTx && !onChainTx.executed) {
        await multiSigOnChainService.markAsExecuted({
          onChainTransactionId: onChainTx.id,
          executionTxHash: proposal.on_chain_tx_hash || '',
          executedBy: contractState.executedBy || contractState.submittedBy,
          executedAt: new Date().toISOString()
        });
      }

      return { wasExecuted: true, updated: true };
    }

    return { wasExecuted: contractState.executed, updated: false };
  }

  /**
   * Verify data integrity between old and new systems
   */
  async verifyDataIntegrity(): Promise<{
    total: number;
    matching: number;
    mismatches: Array<{ proposalId: string; issue: string }>;
  }> {
    const results = {
      total: 0,
      matching: 0,
      mismatches: [] as Array<{ proposalId: string; issue: string }>
    };

    const { data: proposals } = await supabase
      .from('multi_sig_proposals')
      .select('*')
      .not('on_chain_tx_id', 'is', null);

    if (!proposals) return results;

    results.total = proposals.length;

    for (const proposal of proposals as ProposalData[]) {
      const onChainTx = await multiSigOnChainService.getOnChainTransaction(
        proposal.wallet_id,
        proposal.on_chain_tx_id!
      );

      if (!onChainTx) {
        results.mismatches.push({
          proposalId: proposal.id,
          issue: 'Missing on-chain record'
        });
        continue;
      }

      // Check execution status matches
      const proposalExecuted = proposal.status === 'executed' && !!proposal.executed_at;
      if (proposalExecuted !== onChainTx.executed) {
        results.mismatches.push({
          proposalId: proposal.id,
          issue: `Execution status mismatch: proposal=${proposalExecuted}, on_chain=${onChainTx.executed}`
        });
        continue;
      }

      results.matching++;
    }

    return results;
  }
}

// Export singleton instance
export const multiSigMigrationService = MultiSigMigrationService.getInstance();
