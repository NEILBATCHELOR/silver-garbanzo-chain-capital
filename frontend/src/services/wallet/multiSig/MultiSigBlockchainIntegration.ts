/**
 * Multi-Sig Blockchain Integration Service
 * 
 * ARCHITECTURE: Three-Layer Integration
 * =====================================
 * 
 * LAYER 1 (UI):        transaction_proposals → transaction_signatures
 * LAYER 2 (Logic):     multi_sig_proposals
 * LAYER 3 (Blockchain): multi_sig_on_chain_transactions → multi_sig_on_chain_confirmations
 * 
 * PURPOSE:
 * - Bridge UI layer → Business Logic layer → Blockchain layer
 * - Convert user-friendly proposals to blockchain-ready technical proposals
 * - Submit to smart contracts and track on-chain state
 * - Sync on-chain execution status back to UI
 * 
 * WORKFLOW:
 * 1. prepareForBlockchain() - UI proposal → Technical proposal with raw tx
 * 2. submitToContract() - Submit technical proposal to multi-sig contract
 * 3. Event listeners - Track on-chain events and sync back to UI
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, isEIP1559Supported, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MultiSigProposal {
  id: string;
  walletId: string;
  transactionHash: string;
  rawTransaction: {
    to: string;
    value: string;
    data: string;
    chainId: number;
    nonce?: number;
  };
  chainType: string;
  status: 'prepared' | 'submitted' | 'confirmed' | 'executed' | 'failed';
  signaturesCollected: number;
  signaturesRequired: number;
  onChainTxId: number | null;
  onChainTxHash: string | null;
  submittedOnChain: boolean;
  executedAt: Date | null;
  executionHash: string | null;
  createdAt: Date;
}

export interface OnChainTransaction {
  id: string;
  walletId: string;
  onChainTxId: number;
  toAddress: string;
  value: string;
  data: string | null;
  executed: boolean;
  numConfirmations: number;
  submissionTxHash: string;
  executionTxHash: string | null;
  submittedBy: string;
  executedBy: string | null;
  createdAt: Date;
  executedAt: Date | null;
}

export interface PrepareResult {
  success: boolean;
  multiSigProposal?: MultiSigProposal;
  error?: string;
}

export interface SubmitResult {
  success: boolean;
  onChainTxId?: number;
  transactionHash?: string;
  error?: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigBlockchainIntegration {
  private static instance: MultiSigBlockchainIntegration;

  static getInstance(): MultiSigBlockchainIntegration {
    if (!MultiSigBlockchainIntegration.instance) {
      MultiSigBlockchainIntegration.instance = new MultiSigBlockchainIntegration();
    }
    return MultiSigBlockchainIntegration.instance;
  }

  // ============================================================================
  // LAYER 1 → LAYER 2: PREPARE FOR BLOCKCHAIN
  // ============================================================================

  /**
   * Convert UI proposal to blockchain-ready technical proposal
   * 
   * @param uiProposalId - ID from transaction_proposals (Layer 1)
   * @returns Technical proposal ready for blockchain submission (Layer 2)
   */
  async prepareForBlockchain(uiProposalId: string): Promise<PrepareResult> {
    try {
      // 1. Get UI proposal from Layer 1
      const { data: uiProposal, error: proposalError } = await supabase
        .from('transaction_proposals')
        .select(`
          *,
          multi_sig_wallets!inner(
            id,
            address,
            threshold,
            blockchain,
            project_id
          )
        `)
        .eq('id', uiProposalId)
        .single();

      if (proposalError || !uiProposal) {
        throw new Error(`Failed to fetch proposal: ${proposalError?.message}`);
      }

      // 2. Check if already prepared
      if (uiProposal.multi_sig_proposal_id) {
        const { data: existing } = await supabase
          .from('multi_sig_proposals')
          .select('*')
          .eq('id', uiProposal.multi_sig_proposal_id)
          .single();

        if (existing) {
          return {
            success: true,
            multiSigProposal: this.formatMultiSigProposal(existing)
          };
        }
      }

      // 3. Validate blockchain and get chain configuration
      const blockchain = uiProposal.multi_sig_wallets.blockchain;
      
      // Phase B: Blockchain Validation
      const validatedChain = validateBlockchain(blockchain);
      if (!isEVMChain(validatedChain)) {
        throw new Error(
          `Multi-sig wallets only supported on EVM chains. ${validatedChain} is not EVM-compatible.`
        );
      }

      // Phase C: Chain ID Management
      const chainId = getChainId(validatedChain);
      if (!chainId) {
        throw new Error(`Cannot resolve chain ID for blockchain: ${validatedChain}`);
      }

      // Phase A: EIP-1559 Support Detection
      const supportsEIP1559 = isEIP1559Supported(chainId);
      console.log(`Chain ${validatedChain} (${chainId}) EIP-1559 support: ${supportsEIP1559}`);

      // Get RPC provider for fee estimation - determine network type
      const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
      const config = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!config) {
        throw new Error(`No RPC configuration for blockchain: ${validatedChain} (${networkType})`);
      }

      const provider = new ethers.JsonRpcProvider(config.url, {
        chainId: chainId,
        name: validatedChain
      });

      // Get fee data based on EIP-1559 support
      const feeData = await provider.getFeeData();

      // Build raw transaction with correct fee structure
      const rawTx: any = {
        to: uiProposal.to_address,
        value: uiProposal.value,
        data: uiProposal.data || '0x',
        chainId: chainId,
        nonce: uiProposal.nonce
      };

      // Add fee fields based on EIP-1559 support
      if (supportsEIP1559) {
        // Type 2 transaction (EIP-1559)
        rawTx.type = 2;
        rawTx.maxFeePerGas = feeData.maxFeePerGas?.toString() || '0';
        rawTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString() || '0';
      } else {
        // Type 0 transaction (Legacy)
        rawTx.type = 0;
        rawTx.gasPrice = feeData.gasPrice?.toString() || '0';
      }

      // 4. Create transaction hash for signing
      const transactionHash = this.hashTransaction(rawTx);

      // 5. Create technical proposal in Layer 2
      const { data: multiSigProposal, error: insertError } = await supabase
        .from('multi_sig_proposals')
        .insert({
          wallet_id: uiProposal.wallet_id,
          transaction_hash: transactionHash,
          raw_transaction: rawTx,
          chain_type: uiProposal.blockchain,
          signatures_required: uiProposal.multi_sig_wallets.threshold,
          status: 'prepared',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          project_id: uiProposal.multi_sig_wallets.project_id,
          created_by: uiProposal.created_by
        })
        .select()
        .single();

      if (insertError || !multiSigProposal) {
        throw new Error(`Failed to create technical proposal: ${insertError?.message}`);
      }

      // 6. Link back to UI proposal (Layer 1 ← Layer 2)
      await supabase
        .from('transaction_proposals')
        .update({ multi_sig_proposal_id: multiSigProposal.id })
        .eq('id', uiProposalId);

      return {
        success: true,
        multiSigProposal: this.formatMultiSigProposal(multiSigProposal)
      };
    } catch (error: any) {
      console.error('Failed to prepare proposal for blockchain:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // LAYER 2 → LAYER 3: SUBMIT TO CONTRACT
  // ============================================================================

  /**
   * Submit prepared proposal to multi-sig smart contract
   * 
   * @param multiSigProposalId - ID from multi_sig_proposals (Layer 2)
   * @returns On-chain transaction index and hash
   */
  async submitToContract(multiSigProposalId: string): Promise<SubmitResult> {
    try {
      // 1. Get technical proposal from Layer 2
      const { data: proposal, error: fetchError } = await supabase
        .from('multi_sig_proposals')
        .select(`
          *,
          multi_sig_wallets!inner(
            id,
            address,
            blockchain,
            abi
          )
        `)
        .eq('id', multiSigProposalId)
        .single();

      if (fetchError || !proposal) {
        throw new Error(`Failed to fetch proposal: ${fetchError?.message}`);
      }

      // 2. Check if already submitted
      if (proposal.submitted_on_chain) {
        return {
          success: true,
          onChainTxId: proposal.on_chain_tx_id,
          transactionHash: proposal.on_chain_tx_hash
        };
      }

      // 3. Get RPC provider with chain validation
      const blockchain = proposal.chain_type;
      const validatedChain = validateBlockchain(blockchain);
      const chainId = getChainId(validatedChain);
      
      if (!chainId) {
        throw new Error(`Cannot resolve chain ID for blockchain: ${validatedChain}`);
      }

      // Determine network type based on chain ID
      const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
      const config = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!config) {
        throw new Error(`No RPC configuration for blockchain: ${validatedChain} (${networkType})`);
      }

      const provider = new ethers.JsonRpcProvider(config.url, {
        chainId: chainId,
        name: validatedChain
      });

      // 4. Create contract instance
      const contractAddress = proposal.multi_sig_wallets.address;
      const contractABI = proposal.multi_sig_wallets.abi || this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // 5. Submit transaction to contract (requires a signer with gas)
      // Note: This requires proper wallet integration for gas payment
      const rawTx = proposal.raw_transaction;
      const tx = await contract.submitTransaction(
        rawTx.to,
        rawTx.value,
        rawTx.data || '0x'
      );

      const receipt = await tx.wait();

      // 6. Extract transaction index from contract event
      const submitEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'SubmitTransaction';
        } catch {
          return false;
        }
      });

      if (!submitEvent) {
        throw new Error('SubmitTransaction event not found in receipt');
      }

      const parsedEvent = contract.interface.parseLog(submitEvent);
      const txIndex = Number(parsedEvent?.args?.txIndex);

      // 7. Update Layer 2 proposal with on-chain details
      await supabase
        .from('multi_sig_proposals')
        .update({
          on_chain_tx_id: txIndex,
          on_chain_tx_hash: receipt.hash,
          submitted_on_chain: true,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', multiSigProposalId);

      // 8. Create Layer 3 on-chain tracking record
      await supabase
        .from('multi_sig_on_chain_transactions')
        .insert({
          wallet_id: proposal.wallet_id,
          on_chain_tx_id: txIndex,
          to_address: rawTx.to,
          value: rawTx.value,
          data: rawTx.data || null,
          executed: false,
          num_confirmations: 0,
          created_at_timestamp: Math.floor(Date.now() / 1000),
          submission_tx_hash: receipt.hash,
          submitted_by: receipt.from,
          project_id: proposal.project_id
        });

      return {
        success: true,
        onChainTxId: txIndex,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to submit to contract:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // LAYER 3: ON-CHAIN STATE QUERIES
  // ============================================================================

  /**
   * Get on-chain transaction details
   */
  async getOnChainTransaction(
    walletId: string,
    onChainTxId: number
  ): Promise<OnChainTransaction | null> {
    const { data, error } = await supabase
      .from('multi_sig_on_chain_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('on_chain_tx_id', onChainTxId)
      .single();

    if (error || !data) return null;
    return this.formatOnChainTransaction(data);
  }

  /**
   * Get multi-sig proposal by ID
   */
  async getMultiSigProposal(proposalId: string): Promise<MultiSigProposal | null> {
    const { data, error } = await supabase
      .from('multi_sig_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error || !data) return null;
    return this.formatMultiSigProposal(data);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Hash transaction for signing (EIP-712 or simple keccak256)
   */
  private hashTransaction(rawTx: any): string {
    // Simple implementation - should be enhanced for EIP-712
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes'],
      [rawTx.to, rawTx.value, rawTx.data || '0x']
    );
    return ethers.keccak256(encoded);
  }

  /**
   * Format raw database record to MultiSigProposal
   */
  private formatMultiSigProposal(data: any): MultiSigProposal {
    return {
      id: data.id,
      walletId: data.wallet_id,
      transactionHash: data.transaction_hash,
      rawTransaction: data.raw_transaction,
      chainType: data.chain_type,
      status: data.status,
      signaturesCollected: data.signatures_collected || 0,
      signaturesRequired: data.signatures_required,
      onChainTxId: data.on_chain_tx_id,
      onChainTxHash: data.on_chain_tx_hash,
      submittedOnChain: data.submitted_on_chain || false,
      executedAt: data.executed_at ? new Date(data.executed_at) : null,
      executionHash: data.execution_hash,
      createdAt: new Date(data.created_at)
    };
  }

  /**
   * Format raw database record to OnChainTransaction
   */
  private formatOnChainTransaction(data: any): OnChainTransaction {
    return {
      id: data.id,
      walletId: data.wallet_id,
      onChainTxId: data.on_chain_tx_id,
      toAddress: data.to_address,
      value: data.value,
      data: data.data,
      executed: data.executed || false,
      numConfirmations: data.num_confirmations || 0,
      submissionTxHash: data.submission_tx_hash,
      executionTxHash: data.execution_tx_hash,
      submittedBy: data.submitted_by,
      executedBy: data.executed_by,
      createdAt: new Date(data.created_at),
      executedAt: data.executed_at ? new Date(data.executed_at) : null
    };
  }

  /**
   * Get default multi-sig wallet ABI (Gnosis Safe compatible)
   */
  private getDefaultMultiSigABI() {
    return [
      // Submit transaction
      'function submitTransaction(address destination, uint256 value, bytes data) public returns (uint256 txIndex)',
      // Confirm transaction
      'function confirmTransaction(uint256 txIndex) public',
      // Execute transaction
      'function executeTransaction(uint256 txIndex) public',
      // Revoke confirmation
      'function revokeConfirmation(uint256 txIndex) public',
      // Get transaction
      'function getTransaction(uint256 txIndex) public view returns (address destination, uint256 value, bytes data, bool executed, uint256 numConfirmations)',
      // Events
      'event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed destination, uint256 value, bytes data)',
      'event ConfirmTransaction(address indexed owner, uint256 indexed txIndex)',
      'event RevokeConfirmation(address indexed owner, uint256 indexed txIndex)',
      'event ExecuteTransaction(address indexed owner, uint256 indexed txIndex)'
    ];
  }
}

// Export singleton instance
export const multiSigBlockchainIntegration = MultiSigBlockchainIntegration.getInstance();
