/**
 * Multi-Sig Approval Service
 * Simplified approval workflow for multi-sig transfers
 * Uses multi_sig_proposals table with UI-friendly fields
 * Consolidated architecture - no separate UI/business logic tables
 * 
 * ENHANCED: Now tracks signer names and addresses for proper contract verification
 * Uses three-layer architecture for blockchain integration
 */

import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { ChainType } from '../AddressUtils';
import { ethers } from 'ethers';
import { multiSigBlockchainIntegration } from './MultiSigBlockchainIntegration';
import { multiSigContractSubmitter } from './MultiSigContractSubmitter';
import { multiSigOnChainConfirmation } from './MultiSigOnChainConfirmation';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TransferProposal {
  id: string;
  walletId: string;
  walletName?: string; // Added for display
  title: string;
  description?: string;
  toAddress: string;
  toWalletName?: string; // Added for multi-sig destination display
  value: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  blockchain: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'expired';
  nonce?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalApproval {
  id: string;
  proposalId: string;
  signer: string; // User ID for audit
  signerName: string; // User name for display
  signerAddress: string; // Ethereum address for contract verification
  signature: string;
  transactionHash?: string;
  createdAt: Date;
}

export interface ProposalWithSignatures extends TransferProposal {
  signatures: ProposalApproval[];
  signaturesCollected: number;
  signaturesRequired: number;
  canExecute: boolean;
  remainingSignatures: number;
  // Phase 4: On-Chain Status Fields
  onChainTxId?: number | null;
  executionHash?: string | null;
  onChainConfirmations?: number;
  network?: string;
}

export interface CreateProposalParams {
  walletId: string;
  title: string;
  description?: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  data?: string;
}

export interface ApprovalResult {
  success: boolean;
  signature?: ProposalApproval;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigApprovalService {
  private static instance: MultiSigApprovalService;

  static getInstance(): MultiSigApprovalService {
    if (!MultiSigApprovalService.instance) {
      MultiSigApprovalService.instance = new MultiSigApprovalService();
    }
    return MultiSigApprovalService.instance;
  }

  // ============================================================================
  // PROPOSAL CREATION
  // ============================================================================

  /**
   * Create a new transfer proposal for multi-sig approval
   * Stores directly in multi_sig_proposals (single source of truth)
   */
  async createTransferProposal(
    params: CreateProposalParams
  ): Promise<TransferProposal> {
    try {
      // Validate wallet exists and get details
      const wallet = await this.getMultiSigWallet(params.walletId);
      if (!wallet) {
        throw new Error(`Multi-sig wallet ${params.walletId} not found`);
      }

      // Phase B: Validate blockchain is EVM-compatible for multi-sig
      const validatedChain = validateBlockchain(wallet.blockchain);
      if (!isEVMChain(validatedChain)) {
        throw new Error(
          `Multi-sig operations only supported on EVM chains. ${validatedChain} is not EVM-compatible.`
        );
      }

      // Validate addresses
      if (!ethers.isAddress(params.toAddress)) {
        throw new Error('Invalid destination address');
      }

      if (params.tokenAddress && !ethers.isAddress(params.tokenAddress)) {
        throw new Error('Invalid token address');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is an owner
      const isOwner = await this.verifyUserIsOwner(params.walletId, user.id);
      if (!isOwner) {
        throw new Error('User is not an owner of this wallet');
      }

      // Convert amount to wei for EVM chains
      const valueInWei = ethers.parseEther(params.amount).toString();

      // Create proposal in multi_sig_proposals (single source of truth)
      const { data, error } = await supabase
        .from('multi_sig_proposals')
        .insert({
          wallet_id: params.walletId,
          title: params.title,
          description: params.description,
          to_address: params.toAddress,
          value: valueInWei,
          token_address: params.tokenAddress,
          blockchain: wallet.blockchain,
          chain_type: wallet.blockchain,
          status: 'pending',
          signatures_collected: 0,
          signatures_required: wallet.threshold,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          created_by: user.id,
          project_id: wallet.project_id,
          raw_transaction: {
            to: params.toAddress,
            value: valueInWei,
            data: params.data || '0x',
            tokenAddress: params.tokenAddress,
            tokenSymbol: params.tokenSymbol || 'ETH'
          },
          transaction_hash: ''
        })
        .select()
        .single();

      if (error) throw error;

      return await this.formatProposal(data);
    } catch (error: any) {
      console.error('Failed to create transfer proposal:', error);
      throw new Error(`Proposal creation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // PROPOSAL RETRIEVAL
  // ============================================================================

  /**
   * Get all proposals for a wallet with signature details
   * CONSOLIDATED: Queries multi_sig_proposals directly (no joins needed)
   */
  async getProposalsForWallet(
    walletId: string,
    includeExecuted: boolean = false
  ): Promise<ProposalWithSignatures[]> {
    try {
      // Build query - Direct access to multi_sig_proposals
      let query = supabase
        .from('multi_sig_proposals')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      // Filter by status if not including executed
      if (!includeExecuted) {
        query = query.in('status', ['pending', 'approved']);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get wallet threshold
      const wallet = await this.getMultiSigWallet(walletId);
      const threshold = wallet.threshold;

      // Fetch signatures for each proposal and resolve names
      const proposalsWithSigs = await Promise.all(
        (data || []).map(async (proposal) => {
          const signatures = await this.getProposalSignatures(proposal.id);
          const signaturesCollected = signatures.length;
          const canExecute = signaturesCollected >= threshold;

          // Get on-chain confirmation count if transaction exists
          let onChainConfirmations = 0;
          
          if (proposal.on_chain_tx_id !== null && proposal.on_chain_tx_id !== undefined) {
            try {
              const { data: onChainTx } = await supabase
                .from('multi_sig_on_chain_transactions')
                .select('num_confirmations')
                .eq('on_chain_tx_id', proposal.on_chain_tx_id)
                .single();
              
              if (onChainTx) {
                onChainConfirmations = onChainTx.num_confirmations || 0;
              }
            } catch (error) {
              console.warn('Failed to fetch on-chain confirmations:', error);
            }
          }

          return {
            ...(await this.formatProposal(proposal)),
            signatures,
            signaturesCollected,
            signaturesRequired: threshold,
            canExecute,
            remainingSignatures: Math.max(0, threshold - signaturesCollected),
            // On-chain fields - direct access
            onChainTxId: proposal.on_chain_tx_id ?? null,
            executionHash: proposal.execution_hash ?? null,
            onChainConfirmations
          };
        })
      );

      return proposalsWithSigs;
    } catch (error: any) {
      console.error('Failed to get proposals:', error);
      throw new Error(`Failed to get proposals: ${error.message}`);
    }
  }

  /**
   * Get pending proposals that need approval
   */
  async getPendingProposals(
    walletId: string
  ): Promise<ProposalWithSignatures[]> {
    const allProposals = await this.getProposalsForWallet(walletId, false);
    return allProposals.filter(p => p.status === 'pending');
  }

  /**
   * Get a single proposal with full details
   * CONSOLIDATED: Queries multi_sig_proposals directly (no joins needed)
   */
  async getProposalDetails(proposalId: string): Promise<ProposalWithSignatures> {
    try {
      // Query multi_sig_proposals directly
      const { data, error } = await supabase
        .from('multi_sig_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error || !data) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Get wallet and signatures
      const wallet = await this.getMultiSigWallet(data.wallet_id);
      const signatures = await this.getProposalSignatures(proposalId);

      const signaturesCollected = signatures.length;
      const canExecute = signaturesCollected >= wallet.threshold;

      // Get on-chain confirmation count if transaction exists
      let onChainConfirmations = 0;
      
      if (data.on_chain_tx_id !== null && data.on_chain_tx_id !== undefined) {
        try {
          const { data: onChainTx } = await supabase
            .from('multi_sig_on_chain_transactions')
            .select('num_confirmations')
            .eq('on_chain_tx_id', data.on_chain_tx_id)
            .single();
          
          if (onChainTx) {
            onChainConfirmations = onChainTx.num_confirmations || 0;
          }
        } catch (error) {
          console.warn('Failed to fetch on-chain confirmations:', error);
        }
      }

      return {
        ...(await this.formatProposal(data)),
        signatures,
        signaturesCollected,
        signaturesRequired: wallet.threshold,
        canExecute,
        remainingSignatures: Math.max(0, wallet.threshold - signaturesCollected),
        // On-chain fields - direct access
        onChainTxId: data.on_chain_tx_id ?? null,
        executionHash: data.execution_hash ?? null,
        onChainConfirmations
      };
    } catch (error: any) {
      console.error('Failed to get proposal details:', error);
      throw new Error(`Failed to get proposal: ${error.message}`);
    }
  }
  // ============================================================================
  // APPROVAL & SIGNING
  // ============================================================================

  /**
   * Approve a proposal by signing it
   * ENHANCED: Now supports both off-chain signatures AND on-chain confirmations
   * CONSOLIDATED: Uses proposal_signatures table directly
   * 
   * WORKFLOW:
   * 1. Always collect off-chain signature for audit trail
   * 2. If proposal already submitted to contract → Submit on-chain confirmation
   * 3. If not yet submitted → Just store signature for later batch submission
   */
  async approveProposal(
    proposalId: string,
    userAddressId: string
  ): Promise<ApprovalResult> {
    try {
      // Get proposal details
      const proposal = await this.getProposalDetails(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Check proposal status
      if (proposal.status === 'executed') {
        throw new Error('Proposal already executed, cannot approve');
      }

      if (proposal.status === 'rejected') {
        throw new Error('Proposal rejected, cannot approve');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User details not found');
      }

      // Verify user is an owner of the multi-sig wallet
      const isOwner = await this.verifyUserIsOwner(proposal.walletId, user.id);
      if (!isOwner) {
        throw new Error('User is not an owner of this wallet');
      }

      // Get the multi-sig wallet details
      const multiSigWallet = await this.getMultiSigWallet(proposal.walletId);
      
      // Get the owner's REGISTERED address from multi_sig_wallet_owners
      const { data: ownerRecord, error: ownerError } = await supabase
        .from('multi_sig_wallet_owners')
        .select(`
          id,
          user_address_id,
          user_addresses!inner (
            id,
            address
          )
        `)
        .eq('wallet_id', proposal.walletId)
        .eq('user_id', user.id)
        .single();

      if (ownerError || !ownerRecord) {
        throw new Error('User is not registered as an owner with an Ethereum address');
      }

      const signerEthereumAddress = (ownerRecord.user_addresses as any).address;
      const registeredUserAddressId = ownerRecord.user_address_id;
      
      // Get the wallet and private key for the REGISTERED owner address
      const userWallet = await this.getUserWallet(registeredUserAddressId);
      if (!userWallet) {
        throw new Error('Owner wallet not found');
      }

      // Check if already signed OFF-CHAIN
      const existingSignature = proposal.signatures.find(
        sig => sig.signer === user.id
      );

      // STEP 1: Always collect OFF-CHAIN signature for audit trail (if not already signed)
      let signatureData: any = existingSignature;

      if (!existingSignature) {
        const transactionHash = await this.buildTransactionHash(proposal, multiSigWallet.address);

        // Sign the transaction hash
        const privateKey = await this.getUserPrivateKey(userWallet);
        const wallet = new ethers.Wallet(privateKey);
        const signature = await wallet.signMessage(ethers.getBytes(transactionHash));

        // Verify the signature
        const recoveredAddress = ethers.verifyMessage(ethers.getBytes(transactionHash), signature);
        
        if (recoveredAddress.toLowerCase() !== signerEthereumAddress.toLowerCase()) {
          throw new Error(
            `Signature verification failed: Expected ${signerEthereumAddress}, got ${recoveredAddress}`
          );
        }

        // Store off-chain signature for audit trail (CONSOLIDATED: use proposal_signatures)
        const { data, error } = await supabase
          .from('proposal_signatures')
          .insert({
            proposal_id: proposalId,
            signer_address: signerEthereumAddress,
            signature,
            signature_type: 'ecdsa',
            is_valid: true
          })
          .select()
          .single();

        if (error) throw error;
        signatureData = data;

        // Update proposal signatures count in multi_sig_proposals
        const newSignatureCount = proposal.signaturesCollected + 1;
        const updateData: any = { 
          signatures_collected: newSignatureCount 
        };
        
        // Update status if threshold met
        if (newSignatureCount >= proposal.signaturesRequired) {
          updateData.status = 'approved';
        }
        
        await supabase
          .from('multi_sig_proposals')
          .update(updateData)
          .eq('id', proposalId);

        console.log('[MultiSig Approval] Off-chain signature collected');
      }

      // STEP 2: If proposal is submitted to contract → Submit ON-CHAIN confirmation
      if (proposal.onChainTxId !== null) {
        console.log('[MultiSig Approval] Proposal on-chain, submitting confirmation...');
        
        // Check on-chain status
        const onChainStatus = await multiSigOnChainConfirmation.getOnChainStatus(
          proposalId,
          signerEthereumAddress
        );

        if (onChainStatus?.hasUserConfirmed) {
          console.log('[MultiSig Approval] User already confirmed on-chain');
          return {
            success: true,
            signature: this.formatSignature(signatureData)
          };
        }

        // Submit on-chain confirmation
        const onChainResult = await multiSigOnChainConfirmation.confirmTransactionOnChain(
          proposalId,
          registeredUserAddressId
        );

        if (!onChainResult.success) {
          throw new Error(`On-chain confirmation failed: ${onChainResult.error}`);
        }

        console.log('[MultiSig Approval] On-chain confirmation successful:', {
          txHash: onChainResult.transactionHash,
          blockNumber: onChainResult.blockNumber
        });
      }

      return {
        success: true,
        signature: this.formatSignature(signatureData)
      };
    } catch (error: any) {
      console.error('Failed to approve proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Execute a proposal once threshold is met
   * ENHANCED: Now uses three-layer architecture with proper on-chain submission
   */
  async executeProposal(
    proposalId: string,
    executorAddressId: string // User wallet ID that will pay gas fees
  ): Promise<ExecutionResult> {
    try {
      // Get proposal with signatures
      const proposal = await this.getProposalDetails(proposalId);

      // Verify threshold met
      if (!proposal.canExecute) {
        throw new Error(
          `Not enough signatures: ${proposal.signaturesCollected}/${proposal.signaturesRequired}`
        );
      }

      // Verify status
      if (proposal.status === 'executed') {
        throw new Error('Proposal already executed');
      }

      if (proposal.status === 'rejected') {
        throw new Error('Proposal has been rejected');
      }

      // LAYER 1 → LAYER 2: Prepare for blockchain (already in multi_sig_proposals)
      console.log('[MultiSig] Proposal ready for blockchain submission');

      // LAYER 2 → LAYER 3: Submit to contract with proper signer
      const { data: proposalData } = await supabase
        .from('multi_sig_proposals')
        .select('submitted_on_chain, executed_at, execution_hash, on_chain_tx_hash')
        .eq('id', proposalId)
        .single();

      if (!proposalData?.submitted_on_chain) {
        console.log('[MultiSig] Submitting to smart contract...');
        const submitResult = await multiSigContractSubmitter.submitProposalToContract(
          proposalId,
          executorAddressId // Pass the executor's wallet ID for gas payment
        );
        
        if (!submitResult.success) {
          throw new Error(`Failed to submit to contract: ${submitResult.error}`);
        }

        console.log('[MultiSig] Successfully submitted to contract:', {
          onChainTxId: submitResult.onChainTxId,
          transactionHash: submitResult.transactionHash,
          submittedBy: submitResult.submittedBy
        });

        return {
          success: true,
          transactionHash: submitResult.transactionHash
        };
      }

      // Already submitted - check on-chain status
      if (proposalData.executed_at) {
        return {
          success: true,
          transactionHash: proposalData.execution_hash || proposalData.on_chain_tx_hash || undefined
        };
      }

      // Proposal submitted but waiting for confirmations
      return {
        success: true,
        transactionHash: proposalData.on_chain_tx_hash || undefined
      };
    } catch (error: any) {
      console.error('Failed to execute proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // ============================================================================
  // PROPOSAL MANAGEMENT (DELETE/REJECT)
  // ============================================================================

  /**
   * Delete a proposal (only if not yet submitted to blockchain)
   * IMPORTANT: Can only delete proposals that haven't been submitted on-chain
   * CONSOLIDATED: Uses multi_sig_proposals table directly
   */
  async deleteProposal(proposalId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get proposal
      const proposal = await this.getProposalDetails(proposalId);

      // Check if user is creator or owner
      const isCreator = proposal.createdBy === user.id;
      const isOwner = await this.verifyUserIsOwner(proposal.walletId, user.id);

      if (!isCreator && !isOwner) {
        throw new Error('Only the creator or wallet owners can delete this proposal');
      }

      // Check if already submitted to blockchain
      if (proposal.onChainTxId !== null) {
        throw new Error('Cannot delete proposal that has been submitted to blockchain. Use reject instead.');
      }

      // Check status
      if (proposal.status === 'executed') {
        throw new Error('Cannot delete executed proposal');
      }

      // Delete signatures first (cascade) - CONSOLIDATED: use proposal_signatures
      await supabase
        .from('proposal_signatures')
        .delete()
        .eq('proposal_id', proposalId);

      // Delete proposal - CONSOLIDATED: use multi_sig_proposals
      const { error } = await supabase
        .from('multi_sig_proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reject a proposal (mark as rejected, keep for audit trail)
   * This is the proper way to "delete" proposals that have been submitted on-chain
   * CONSOLIDATED: Uses multi_sig_proposals table directly
   */
  async rejectProposal(proposalId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get proposal
      const proposal = await this.getProposalDetails(proposalId);

      // Check if user is owner
      const isOwner = await this.verifyUserIsOwner(proposal.walletId, user.id);
      if (!isOwner) {
        throw new Error('Only wallet owners can reject proposals');
      }

      // Check status
      if (proposal.status === 'executed') {
        throw new Error('Cannot reject executed proposal');
      }

      if (proposal.status === 'rejected') {
        throw new Error('Proposal already rejected');
      }

      // Update proposal status to rejected - CONSOLIDATED: use multi_sig_proposals
      const { error } = await supabase
        .from('multi_sig_proposals')
        .update({
          status: 'rejected',
          description: proposal.description 
            ? `${proposal.description}\n\nREJECTED: ${reason || 'No reason provided'}`
            : `REJECTED: ${reason || 'No reason provided'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Failed to reject proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a proposal is ready to execute
   */
  async checkExecutionReadiness(proposalId: string): Promise<{
    ready: boolean;
    reason?: string;
    signaturesCollected: number;
    signaturesRequired: number;
  }> {
    try {
      const proposal = await this.getProposalDetails(proposalId);

      if (proposal.status === 'executed') {
        return {
          ready: false,
          reason: 'Already executed',
          signaturesCollected: proposal.signaturesCollected,
          signaturesRequired: proposal.signaturesRequired
        };
      }

      if (proposal.status === 'rejected') {
        return {
          ready: false,
          reason: 'Proposal rejected',
          signaturesCollected: proposal.signaturesCollected,
          signaturesRequired: proposal.signaturesRequired
        };
      }

      if (!proposal.canExecute) {
        return {
          ready: false,
          reason: `Need ${proposal.remainingSignatures} more signature(s)`,
          signaturesCollected: proposal.signaturesCollected,
          signaturesRequired: proposal.signaturesRequired
        };
      }

      return {
        ready: true,
        signaturesCollected: proposal.signaturesCollected,
        signaturesRequired: proposal.signaturesRequired
      };
    } catch (error: any) {
      console.error('Failed to check execution readiness:', error);
      throw new Error(`Readiness check failed: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get multi-sig wallet details
   */
  private async getMultiSigWallet(walletId: string) {
    const { data, error } = await supabase
      .from('multi_sig_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !data) {
      throw new Error(`Wallet not found: ${error?.message}`);
    }

    return data;
  }

  /**
   * Get user's wallet address details
   */
  private async getUserWallet(userAddressId: string) {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', userAddressId)
      .single();

    if (error || !data) {
      throw new Error(`User wallet not found: ${error?.message}`);
    }

    return data;
  }

  /**
   * Get decrypted private key from user wallet
   */
  private async getUserPrivateKey(userWallet: any): Promise<string> {
    try {
      // Check if key is encrypted
      if (userWallet.encrypted_private_key) {
        const isEncrypted = WalletEncryptionClient.isEncrypted(
          userWallet.encrypted_private_key
        );

        if (isEncrypted) {
          return await WalletEncryptionClient.decrypt(
            userWallet.encrypted_private_key
          );
        }
        return userWallet.encrypted_private_key;
      }

      // Check vault reference
      if (userWallet.key_vault_reference) {
        const { data, error } = await supabase
          .from('key_vault_keys')
          .select('encrypted_key')
          .eq('key_id', userWallet.key_vault_reference)
          .single();

        if (error || !data) {
          throw new Error('Key not found in vault');
        }

        return await WalletEncryptionClient.decrypt(data.encrypted_key);
      }

      throw new Error('No private key available');
    } catch (error: any) {
      console.error('Failed to get user private key:', error);
      throw new Error(`Key retrieval failed: ${error.message}`);
    }
  }

  /**
   * Verify user is an owner of the multi-sig wallet
   */
  private async verifyUserIsOwner(
    walletId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('multi_sig_wallet_owners')
      .select('id')
      .eq('wallet_id', walletId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  }

  /**
   * Get all signatures for a proposal with signer details
   * ENHANCED: Returns signatures with names and addresses
   * CONSOLIDATED: Uses proposal_signatures table directly
   */
  private async getProposalSignatures(
    proposalId: string
  ): Promise<ProposalApproval[]> {
    const { data, error } = await supabase
      .from('proposal_signatures')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('signed_at', { ascending: true });

    if (error) {
      console.error('Error fetching signatures:', error);
      return [];
    }

    return (data || []).map(d => this.formatSignature(d));
  }

  /**
   * Build transaction hash for signing
   */
  private async buildTransactionHash(proposal: TransferProposal, walletAddress: string): Promise<string> {
    // Create consistent hash of transaction data
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256', 'string', 'uint256'],
        [
          walletAddress,  // Use actual wallet Ethereum address instead of UUID
          proposal.toAddress,
          BigInt(proposal.value),
          proposal.tokenAddress || ethers.ZeroAddress,
          Date.now()
        ]
      )
    );
  }

  /**
   * Build final transaction for execution
   */
  private async buildTransaction(proposal: TransferProposal, wallet: any) {
    const builder = universalTransactionBuilder.getBuilder(
      proposal.blockchain as ChainType,
      'mainnet'
    );

    // If token transfer, build ERC20 transfer
    if (proposal.tokenAddress) {
      return await builder.buildTokenTransfer({
        from: wallet.address,
        to: proposal.toAddress,
        tokenAddress: proposal.tokenAddress,
        amount: proposal.value,
        decimals: 18 // TODO: Get from token contract
      });
    }

    // Native token transfer
    return await builder.buildSimpleTransfer({
      from: wallet.address,
      to: proposal.toAddress,
      amount: proposal.value
    });
  }

  /**
   * Resolve wallet name for an address
   * ENHANCED: Checks if address belongs to a multi-sig wallet
   */
  private async resolveWalletName(address: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from('multi_sig_wallets')
        .select('name')
        .eq('address', address)
        .single();

      if (error || !data) {
        return undefined;
      }

      return data.name;
    } catch (error) {
      console.error('Failed to resolve wallet name:', error);
      return undefined;
    }
  }

  /**
   * Format proposal data with wallet names
   * ENHANCED: Resolves wallet names for source and destination
   * CONSOLIDATED: Works directly with multi_sig_proposals data
   */
  private async formatProposal(data: any): Promise<TransferProposal> {
    // Get source wallet name
    const sourceWallet = await this.getMultiSigWallet(data.wallet_id);
    
    // Try to resolve destination wallet name
    const toWalletName = await this.resolveWalletName(data.to_address);

    return {
      id: data.id,
      walletId: data.wallet_id,
      walletName: sourceWallet.name,
      title: data.title,
      description: data.description,
      toAddress: data.to_address,
      toWalletName,
      value: data.value,
      tokenAddress: data.token_address,
      tokenSymbol: data.raw_transaction?.tokenSymbol,
      blockchain: data.blockchain,
      status: data.status,
      nonce: data.nonce,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Format signature data with all details
   * ENHANCED: Includes signer name and Ethereum address
   * CONSOLIDATED: Works with proposal_signatures data
   */
  private formatSignature(data: any): ProposalApproval {
    return {
      id: data.id,
      proposalId: data.proposal_id,
      signer: data.signer_address, // Use address as signer ID for consistency
      signerName: data.signer_address || 'Unknown Signer',
      signerAddress: data.signer_address || 'Unknown Address',
      signature: data.signature,
      transactionHash: data.on_chain_confirmation_tx,
      createdAt: new Date(data.signed_at || data.created_at)
    };
  }
}

// Export singleton instance
export const multiSigApprovalService = MultiSigApprovalService.getInstance();
