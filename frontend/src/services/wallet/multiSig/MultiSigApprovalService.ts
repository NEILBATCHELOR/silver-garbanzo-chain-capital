/**
 * Multi-Sig Approval Service
 * Simplified approval workflow for multi-sig transfers
 * Uses transaction_proposals table for user-friendly interface
 * 
 * ENHANCED: Now tracks signer names and addresses for proper contract verification
 */

import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { ChainType } from '../AddressUtils';
import { ethers } from 'ethers';
import { multiSigBlockchainIntegration } from './MultiSigBlockchainIntegration';
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

      // Create proposal in database
      const { data, error } = await supabase
        .from('transaction_proposals')
        .insert({
          wallet_id: params.walletId,
          title: params.title,
          description: params.description,
          to_address: params.toAddress,
          value: valueInWei,
          token_address: params.tokenAddress,
          token_symbol: params.tokenSymbol || 'ETH',
          blockchain: wallet.blockchain,
          status: 'pending',
          created_by: user.id
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
   */
  async getProposalsForWallet(
    walletId: string,
    includeExecuted: boolean = false
  ): Promise<ProposalWithSignatures[]> {
    try {
      // Build query - Join with multi_sig_proposals for on-chain data (Phase 4)
      let query = supabase
        .from('transaction_proposals')
        .select(`
          *,
          multi_sig_proposal:multi_sig_proposals!transaction_proposals_multi_sig_proposal_id_fkey (
            on_chain_tx_id,
            execution_hash
          )
        `)
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

          // Phase 4: Get on-chain data if available
          const onChainData = proposal.multi_sig_proposal as any;
          let onChainConfirmations = 0;
          
          // If we have on-chain transaction, get confirmation count
          if (onChainData?.on_chain_tx_id !== null && onChainData?.on_chain_tx_id !== undefined) {
            try {
              const { data: onChainTx } = await supabase
                .from('multi_sig_on_chain_transactions')
                .select('num_confirmations')
                .eq('on_chain_tx_id', onChainData.on_chain_tx_id)
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
            // Phase 4: Add on-chain fields
            onChainTxId: onChainData?.on_chain_tx_id ?? null,
            executionHash: onChainData?.execution_hash ?? null,
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
   */
  async getProposalDetails(proposalId: string): Promise<ProposalWithSignatures> {
    try {
      const { data, error } = await supabase
        .from('transaction_proposals')
        .select(`
          *,
          multi_sig_proposal:multi_sig_proposals!transaction_proposals_multi_sig_proposal_id_fkey (
            on_chain_tx_id,
            execution_hash
          )
        `)
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

      // Phase 4: Get on-chain data if available
      const onChainData = data.multi_sig_proposal as any;
      let onChainConfirmations = 0;
      
      // If we have on-chain transaction, get confirmation count
      if (onChainData?.on_chain_tx_id !== null && onChainData?.on_chain_tx_id !== undefined) {
        try {
          const { data: onChainTx } = await supabase
            .from('multi_sig_on_chain_transactions')
            .select('num_confirmations')
            .eq('on_chain_tx_id', onChainData.on_chain_tx_id)
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
        // Phase 4: Add on-chain fields
        onChainTxId: onChainData?.on_chain_tx_id ?? null,
        executionHash: onChainData?.execution_hash ?? null,
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
   * ENHANCED: Now records signer name and Ethereum address for verification
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
      if (proposal.status !== 'pending') {
        throw new Error(`Proposal is ${proposal.status}, cannot approve`);
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

      // Get user's wallet address and private key
      const userWallet = await this.getUserWallet(userAddressId);
      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Verify user is an owner of the multi-sig wallet
      const isOwner = await this.verifyUserIsOwner(proposal.walletId, user.id);
      if (!isOwner) {
        throw new Error('User is not an owner of this wallet');
      }

      // Verify the user's Ethereum address is in the contract owners
      const multiSigWallet = await this.getMultiSigWallet(proposal.walletId);
      
      // Get the user's address from multi_sig_wallet_owners via FK to user_addresses
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

      // Get the Ethereum address from the joined user_addresses table
      const signerEthereumAddress = (ownerRecord.user_addresses as any).address;

      // Check if already signed
      const existingSignature = proposal.signatures.find(
        sig => sig.signer === user.id
      );
      if (existingSignature) {
        throw new Error('User has already signed this proposal');
      }

      // Build transaction hash to sign
      const transactionHash = await this.buildTransactionHash(proposal, multiSigWallet.address);

      // Sign the transaction hash
      const privateKey = await this.getUserPrivateKey(userWallet);
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(ethers.getBytes(transactionHash));

      // Verify the signature was created by the expected address
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(transactionHash), signature);
      if (recoveredAddress.toLowerCase() !== signerEthereumAddress.toLowerCase()) {
        throw new Error('Signature verification failed: address mismatch');
      }

      // Store signature with enhanced details
      const { data, error } = await supabase
        .from('transaction_signatures')
        .insert({
          proposal_id: proposalId,
          signer: user.id,
          signer_name: userData.name,
          signer_address: signerEthereumAddress,
          signature,
          transaction_hash: transactionHash
        })
        .select()
        .single();

      if (error) throw error;

      // Update proposal signatures count and check if threshold met
      const newSignatureCount = proposal.signaturesCollected + 1;
      if (newSignatureCount >= proposal.signaturesRequired) {
        await supabase
          .from('transaction_proposals')
          .update({ status: 'approved' })
          .eq('id', proposalId);
      }

      return {
        success: true,
        signature: this.formatSignature(data)
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
   * ENHANCED: Now uses three-layer architecture (UI → Business Logic → Blockchain)
   */
  async executeProposal(proposalId: string): Promise<ExecutionResult> {
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

      // LAYER 1 → LAYER 2: Prepare for blockchain
      let multiSigProposal;
      const prepareResult = await multiSigBlockchainIntegration.prepareForBlockchain(proposalId);
      
      if (!prepareResult.success || !prepareResult.multiSigProposal) {
        throw new Error(`Failed to prepare proposal: ${prepareResult.error}`);
      }
      
      multiSigProposal = prepareResult.multiSigProposal;

      // LAYER 2 → LAYER 3: Submit to contract
      if (!multiSigProposal.submittedOnChain) {
        const submitResult = await multiSigBlockchainIntegration.submitToContract(multiSigProposal.id);
        
        if (!submitResult.success) {
          throw new Error(`Failed to submit to contract: ${submitResult.error}`);
        }

        // Update UI proposal status
        await supabase
          .from('transaction_proposals')
          .update({
            status: 'approved', // Will be 'executed' after on-chain execution
            updated_at: new Date().toISOString()
          })
          .eq('id', proposalId);

        return {
          success: true,
          transactionHash: submitResult.transactionHash
        };
      }

      // Already submitted - check on-chain status
      if (multiSigProposal.executedAt) {
        return {
          success: true,
          transactionHash: multiSigProposal.executionHash || multiSigProposal.onChainTxHash || undefined
        };
      }

      // Proposal submitted but waiting for confirmations
      throw new Error('Proposal submitted to contract, waiting for sufficient on-chain confirmations');
    } catch (error: any) {
      console.error('Failed to execute proposal:', error);
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
   */
  private async getProposalSignatures(
    proposalId: string
  ): Promise<ProposalApproval[]> {
    const { data, error } = await supabase
      .from('transaction_signatures')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

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
      tokenSymbol: data.token_symbol,
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
   */
  private formatSignature(data: any): ProposalApproval {
    return {
      id: data.id,
      proposalId: data.proposal_id,
      signer: data.signer,
      signerName: data.signer_name || 'Unknown User',
      signerAddress: data.signer_address || 'Unknown Address',
      signature: data.signature,
      transactionHash: data.transaction_hash,
      createdAt: new Date(data.created_at)
    };
  }
}

// Export singleton instance
export const multiSigApprovalService = MultiSigApprovalService.getInstance();
