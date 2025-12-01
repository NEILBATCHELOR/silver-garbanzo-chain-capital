/**
 * Multi-Signature Proposal Service
 * Handles proposal creation, signing, aggregation, and broadcasting
 * Separated from wallet deployment/management for single responsibility
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { ChainType, addressUtils } from '../AddressUtils';
import { SignatureAggregator } from './SignatureAggregator';
import { LocalSigner } from './LocalSigner';
import { internalWalletService } from '../InternalWalletService';
import {
  getSigner,
  getRpcUrl,
  normalizeBlockchainName
} from './MultiSigHelpers';
import type {
  MultiSigProposal,
  ProposalSignature,
  SignatureRequirement,
  SignedMultiSigTransaction,
  MultiSigBroadcastResult,
  MultiSigWallet
} from '@/types/domain/wallet';

// Import ABIs
import MultiSigWalletABI from '@/../foundry-contracts/out/MultiSigWallet.sol/MultiSigWallet.json';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MultiSigProposalService {
  private static instance: MultiSigProposalService;
  private signatureAggregator: SignatureAggregator;
  private localSigner: LocalSigner;

  constructor() {
    this.signatureAggregator = new SignatureAggregator();
    this.localSigner = new LocalSigner();
  }

  static getInstance(): MultiSigProposalService {
    if (!MultiSigProposalService.instance) {
      MultiSigProposalService.instance = new MultiSigProposalService();
    }
    return MultiSigProposalService.instance;
  }

  // ==========================================================================
  // PROPOSAL CREATION & MANAGEMENT
  // ==========================================================================

  /**
   * Create a new multi-sig transaction proposal
   */
  async createProposal(
    walletId: string,
    transaction: any,
    chainType: ChainType,
    expiryHours: number = 24
  ): Promise<MultiSigProposal> {
    try {
      const wallet = await this.getMultiSigWallet(walletId);
      if (!wallet) {
        throw new Error(`Multi-sig wallet ${walletId} not found`);
      }

      await this.validateTransaction(transaction, chainType);

      const transactionHash = this.calculateTransactionHash(transaction, chainType);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      const { data, error } = await supabase
        .from('multi_sig_proposals')
        .insert({
          wallet_id: walletId,
          transaction_hash: transactionHash,
          raw_transaction: transaction,
          chain_type: chainType,
          status: 'pending',
          signatures_collected: 0,
          signatures_required: wallet.threshold,
          expires_at: expiresAt,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return this.formatProposal(data);

    } catch (error: any) {
      console.error('Failed to create multi-sig proposal:', error);
      throw new Error(`Proposal creation failed: ${error.message}`);
    }
  }

  /**
   * Sign a multi-sig proposal
   */
  async signProposal(
    proposalId: string,
    signerAddress: string,
    privateKeyOrKeyId?: string
  ): Promise<ProposalSignature> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      const existingSignature = await this.getSignature(proposalId, signerAddress);
      if (existingSignature) {
        throw new Error(`Address ${signerAddress} has already signed this proposal`);
      }

      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (!wallet.owners.includes(signerAddress)) {
        throw new Error(`Address ${signerAddress} is not an authorized signer`);
      }

      let signingKey = privateKeyOrKeyId;
      if (!signingKey) {
        const { data: userAddress, error: addressError } = await supabase
          .from('user_addresses')
          .select('key_vault_reference, encrypted_private_key, signing_method')
          .eq('address', signerAddress)
          .single();

        if (addressError) {
          throw new Error(`Failed to find signing method for address ${signerAddress}: ${addressError.message}`);
        }

        if (!userAddress) {
          throw new Error(`No signing configuration found for address ${signerAddress}`);
        }

        if (userAddress.key_vault_reference) {
          signingKey = `vault:${userAddress.key_vault_reference}`;
        } else if (userAddress.encrypted_private_key) {
          signingKey = `encrypted:${userAddress.encrypted_private_key}`;
        } else {
          throw new Error(`No private key or key vault reference found for address ${signerAddress}`);
        }
      }

      const signature = await this.localSigner.signTransaction(
        proposal.transactionHash,
        signerAddress,
        signingKey,
        proposal.chainType
      );

      // Use SECURITY DEFINER function to bypass RLS issues
      const { data, error: rpcError } = await supabase
        .rpc('insert_proposal_signature', {
          p_proposal_id: proposalId,
          p_signer_address: signerAddress,
          p_signature: signature,
          p_signature_type: this.getSignatureType(proposal.chainType),
          p_is_valid: true
        });

      if (rpcError) {
        // Fallback to direct insert if function fails
        console.warn('RPC function failed, trying direct insert:', rpcError);
        const { data: fallbackData, error } = await supabase
          .from('proposal_signatures')
          .insert({
            proposal_id: proposalId,
            signer_address: signerAddress,
            signature: signature,
            signature_type: this.getSignatureType(proposal.chainType),
            is_valid: true
          })
          .select()
          .single();

        if (error) throw error;
        
        await this.updateProposalSignatureCount(proposalId);
        return this.formatSignature(fallbackData);
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to insert signature');
      }

      await this.updateProposalSignatureCount(proposalId);
      return this.formatSignature(data[0]);

    } catch (error: any) {
      console.error('Failed to sign proposal:', error);
      throw new Error(`Proposal signing failed: ${error.message}`);
    }
  }

  // ==========================================================================
  // SIGNATURE AGGREGATION & BROADCASTING
  // ==========================================================================

  /**
   * Aggregate signatures and prepare for broadcast
   */
  async aggregateSignatures(proposalId: string): Promise<SignedMultiSigTransaction> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      const signatures = await this.getProposalSignatures(proposalId);
      
      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (signatures.length < wallet.threshold) {
        throw new Error(`Insufficient signatures: ${signatures.length}/${wallet.threshold}`);
      }

      const aggregatedTx = await this.signatureAggregator.aggregate(
        proposal.rawTransaction,
        signatures,
        proposal.chainType,
        wallet
      );

      // Use SECURITY DEFINER function to bypass RLS issues
      const { error: rpcError } = await supabase
        .rpc('update_proposal_status', {
          p_proposal_id: proposalId,
          p_status: 'signed'
        });

      if (rpcError) {
        // Fallback to direct update
        console.warn('RPC function failed, trying direct update:', rpcError);
        await supabase
          .from('multi_sig_proposals')
          .update({ status: 'signed' })
          .eq('id', proposalId);
      }

      return {
        proposalId,
        rawTransaction: aggregatedTx,
        signatures: signatures.map(s => s.signature),
        chainType: proposal.chainType,
        readyToBroadcast: true
      };

    } catch (error: any) {
      console.error('Failed to aggregate signatures:', error);
      throw new Error(`Signature aggregation failed: ${error.message}`);
    }
  }

  /**
   * Broadcast multi-sig transaction to blockchain
   */
  async broadcastMultiSig(
    signedTx: SignedMultiSigTransaction
  ): Promise<MultiSigBroadcastResult> {
    try {
      const proposal = await this.getProposal(signedTx.proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${signedTx.proposalId} not found`);
      }

      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('network_type')
        .eq('id', proposal.walletId)
        .single();
      
      const networkType = walletData?.network_type || 'mainnet';
      
      const builder = universalTransactionBuilder.getBuilder(
        signedTx.chainType,
        networkType
      );

      let result;
      let retries = 3;
      while (retries > 0) {
        try {
          result = await builder.broadcastTransaction({
            rawTransaction: signedTx.rawTransaction
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (result.success) {
        // Use SECURITY DEFINER function to bypass RLS issues
        const { error: rpcError } = await supabase
          .rpc('update_proposal_status', {
            p_proposal_id: signedTx.proposalId,
            p_status: 'executed',
            p_executed_at: new Date().toISOString(),
            p_execution_hash: result.transactionHash
          });

        if (rpcError) {
          // Fallback to direct update
          console.warn('RPC function failed, trying direct update:', rpcError);
          await supabase
            .from('multi_sig_proposals')
            .update({
              status: 'executed',
              executed_at: new Date().toISOString(),
              execution_hash: result.transactionHash
            })
            .eq('id', signedTx.proposalId);
        }
      }

      return {
        ...result,
        proposalId: signedTx.proposalId
      };

    } catch (error: any) {
      console.error('Failed to broadcast multi-sig transaction:', error);
      return {
        success: false,
        error: error.message,
        proposalId: signedTx.proposalId
      };
    }
  }

  // ==========================================================================
  // ON-CHAIN MULTI-SIG OPERATIONS
  // ==========================================================================

  /**
   * Submit transaction to on-chain multi-sig wallet
   */
  async submitToContract(
    proposalId: string
  ): Promise<{
    onChainTxId: number;
    transactionHash: string;
  }> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }
      
      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (!wallet) {
        throw new Error(`Wallet ${proposal.walletId} not found`);
      }
      
      const signatures = await this.getProposalSignatures(proposalId);
      if (signatures.length < wallet.threshold) {
        throw new Error(
          `Not enough signatures: ${signatures.length}/${wallet.threshold}`
        );
      }
      
      const provider = new ethers.JsonRpcProvider(getRpcUrl(wallet.blockchain));
      
      // Find an owner address with signing capability
      // Priority: use addresses that have already signed this proposal
      const signedAddresses = signatures.map(sig => sig.signerAddress);
      const ownerWithKey = await this.findOwnerWithSigningKey(
        wallet.owners,
        signedAddresses
      );
      
      if (!ownerWithKey) {
        throw new Error(
          'No wallet owner has signing capability. At least one owner must have their private key configured.'
        );
      }
      
      // Get private key from user_addresses by blockchain address (handles key vault decryption)
      const privateKey = await internalWalletService.getUserWalletPrivateKeyByAddress(ownerWithKey);
      
      // Create signer from the owner's private key
      const signer = new ethers.Wallet(privateKey, provider);
      console.log(`Using multi-sig owner as signer: ${signer.address}`);
      
      const multiSig = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        signer
      );
      
      const tx = await multiSig.submitTransaction(
        proposal.rawTransaction.to,
        proposal.rawTransaction.value || '0',
        proposal.rawTransaction.data || '0x',
        24
      );
      
      const receipt = await tx.wait();
      
      const submitEvent = receipt.logs.find(
        (log: any) => {
          try {
            const parsed = multiSig.interface.parseLog(log);
            return parsed?.name === 'SubmitTransaction';
          } catch {
            return false;
          }
        }
      );
      
      if (!submitEvent) {
        throw new Error('SubmitTransaction event not found');
      }
      
      const parsedEvent = multiSig.interface.parseLog(submitEvent);
      const onChainTxId = Number(parsedEvent?.args?.txIndex);
      
      // Update old system (multi_sig_proposals)
      const { error: rpcError } = await supabase
        .rpc('update_proposal_on_chain_submission', {
          p_proposal_id: proposalId,
          p_on_chain_tx_id: onChainTxId,
          p_on_chain_tx_hash: receipt.hash,
          p_submitted_on_chain: true,
          p_status: 'signed'  // Valid status: proposal is signed and submitted
        });

      if (rpcError) {
        // Fallback to direct update
        console.warn('RPC function failed, trying direct update:', rpcError);
        await supabase
          .from('multi_sig_proposals')
          .update({
            on_chain_tx_id: onChainTxId,
            on_chain_tx_hash: receipt.hash,
            submitted_on_chain: true,
            status: 'signed'  // Valid status: pending | signed | executed | expired | rejected
          })
          .eq('id', proposalId);
      }
      
      // NEW: Write to proper on-chain tracking table
      try {
        const { multiSigOnChainService } = await import('./MultiSigOnChainService');
        await multiSigOnChainService.createOnChainTransaction({
          walletId: wallet.id,
          onChainTxId,
          toAddress: proposal.rawTransaction.to,
          value: proposal.rawTransaction.value || '0',
          data: proposal.rawTransaction.data,
          createdAtTimestamp: Math.floor(Date.now() / 1000),
          expiresAtTimestamp: Math.floor(Date.now() / 1000) + (24 * 3600),
          submissionTxHash: receipt.hash,
          submittedBy: signer.address,
          projectId: wallet.projectId
        });
        console.log(`✅ Created on-chain transaction record: ${onChainTxId}`);
      } catch (onChainError: any) {
        // Don't fail entire operation if on-chain tracking fails
        console.error('Failed to create on-chain transaction record:', onChainError);
      }
      
      return {
        onChainTxId,
        transactionHash: receipt.hash
      };
      
    } catch (error: any) {
      console.error('Failed to submit to contract:', error);
      throw new Error(`Submission failed: ${error.message}`);
    }
  }

  /**
   * Confirm transaction on-chain
   */
  async confirmOnChain(
    proposalId: string,
    signerAddress: string
  ): Promise<string> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal || proposal.onChainTxId === undefined || proposal.onChainTxId === null) {
        throw new Error('Proposal not submitted on-chain or missing transaction ID');
      }

      const wallet = await this.getMultiSigWallet(proposal.walletId);

      if (!wallet.owners.includes(signerAddress)) {
        throw new Error(`${signerAddress} is not an owner of this wallet`);
      }
      
      console.log(`Confirming transaction ${proposal.onChainTxId} on multi-sig ${wallet.address}`);
      
      const provider = new ethers.JsonRpcProvider(getRpcUrl(wallet.blockchain));
      
      // Check if this owner has already confirmed on-chain
      const multiSigCheck = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        provider
      );
      
      const alreadyConfirmed = await multiSigCheck.isTransactionConfirmed(
        proposal.onChainTxId,
        signerAddress
      );
      
      if (alreadyConfirmed) {
        console.log(`${signerAddress} has already confirmed transaction ${proposal.onChainTxId}`);
        return 'already-confirmed'; // Return special value instead of throwing
      }
      
      // Get private key from user_addresses by blockchain address (handles key vault decryption)
      const privateKey = await internalWalletService.getUserWalletPrivateKeyByAddress(signerAddress);
      
      // Create signer with decrypted private key
      const signer = new ethers.Wallet(privateKey, provider);
      console.log(`Confirming transaction on-chain with owner: ${signer.address}`);
      
      const multiSig = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        signer
      );
      
      const tx = await multiSig.confirmTransaction(proposal.onChainTxId);
      const receipt = await tx.wait();
      
      // Update old system (proposal_signatures)
      await supabase
        .from('proposal_signatures')
        .update({
          on_chain_confirmation_tx: receipt.hash,
          confirmed_on_chain: true
        })
        .eq('proposal_id', proposalId)
        .eq('signer_address', signerAddress);
      
      // NEW: Write to proper on-chain confirmations table
      try {
        const { multiSigOnChainService } = await import('./MultiSigOnChainService');
        
        // Get the on-chain transaction record
        const onChainTx = await multiSigOnChainService.getOnChainTransaction(
          wallet.id,
          proposal.onChainTxId
        );
        
        if (onChainTx) {
          await multiSigOnChainService.createOnChainConfirmation({
            onChainTransactionId: onChainTx.id,
            signerAddress,
            confirmationTxHash: receipt.hash,
            confirmedAtTimestamp: Math.floor(Date.now() / 1000),
            projectId: wallet.projectId
          });
          console.log(`✅ Recorded on-chain confirmation for ${signerAddress}`);
        }
      } catch (onChainError: any) {
        // Don't fail entire operation if on-chain tracking fails
        console.error('Failed to record on-chain confirmation:', onChainError);
      }
      
      // Check if transaction auto-executed when threshold was met
      const executeEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = multiSig.interface.parseLog(log);
          return parsed?.name === 'ExecuteTransaction' && 
                 Number(parsed?.args?.txIndex) === proposal.onChainTxId;
        } catch {
          return false;
        }
      });
      
      if (executeEvent) {
        console.log(`🎉 Transaction ${proposal.onChainTxId} auto-executed! Updating database...`);
        
        // Update old system (multi_sig_proposals)
        const { error: rpcError } = await supabase
          .rpc('update_proposal_execution', {
            p_proposal_id: proposalId,
            p_status: 'executed',
            p_executed_at: new Date().toISOString(),
            p_execution_hash: receipt.hash
          });

        if (rpcError) {
          // Fallback to direct update
          console.warn('RPC function failed, trying direct update:', rpcError);
          await supabase
            .from('multi_sig_proposals')
            .update({
              status: 'executed',
              executed_at: new Date().toISOString(),
              execution_hash: receipt.hash
            })
            .eq('id', proposalId);
        }
        
        // NEW: Update on-chain transaction table
        try {
          const { multiSigOnChainService } = await import('./MultiSigOnChainService');
          const onChainTx = await multiSigOnChainService.getOnChainTransaction(
            wallet.id,
            proposal.onChainTxId
          );
          
          if (onChainTx) {
            await multiSigOnChainService.markAsExecuted({
              onChainTransactionId: onChainTx.id,
              executionTxHash: receipt.hash,
              executedBy: signerAddress,
              executedAt: new Date().toISOString()
            });
            console.log(`✅ Marked on-chain transaction as executed`);
          }
        } catch (onChainError: any) {
          console.error('Failed to update on-chain execution status:', onChainError);
        }
      } else {
        // No execution event - check contract state as fallback
        console.log(`No ExecuteTransaction event found, checking contract state...`);
        const transaction = await multiSig.getTransaction(proposal.onChainTxId);
        const isExecuted = transaction[3]; // executed field is at index 3
        
        if (isExecuted) {
          console.log(`Transaction ${proposal.onChainTxId} is marked as executed in contract`);
          
          // Update old system (multi_sig_proposals)
          const { error: rpcError } = await supabase
            .rpc('update_proposal_execution', {
              p_proposal_id: proposalId,
              p_status: 'executed',
              p_executed_at: new Date().toISOString(),
              p_execution_hash: receipt.hash
            });

          if (rpcError) {
            console.warn('RPC function failed, trying direct update:', rpcError);
            await supabase
              .from('multi_sig_proposals')
              .update({
                status: 'executed',
                executed_at: new Date().toISOString(),
                execution_hash: receipt.hash
              })
              .eq('id', proposalId);
          }
          
          // NEW: Update on-chain transaction table
          try {
            const { multiSigOnChainService } = await import('./MultiSigOnChainService');
            const onChainTx = await multiSigOnChainService.getOnChainTransaction(
              wallet.id,
              proposal.onChainTxId
            );
            
            if (onChainTx) {
              await multiSigOnChainService.markAsExecuted({
                onChainTransactionId: onChainTx.id,
                executionTxHash: receipt.hash,
                executedBy: signerAddress,
                executedAt: new Date().toISOString()
              });
              console.log(`✅ Marked on-chain transaction as executed (from contract state)`);
            }
          } catch (onChainError: any) {
            console.error('Failed to update on-chain execution status:', onChainError);
          }
        }
      }
      
      return receipt.hash;
      
    } catch (error: any) {
      console.error('Failed to confirm on-chain:', error);
      throw new Error(`Confirmation failed: ${error.message}`);
    }
  }

  /**
   * Get all proposals for a wallet
   */
  async getProposalsForWallet(walletId: string): Promise<MultiSigProposal[]> {
    try {
      // Use SECURITY DEFINER function to bypass RLS issues
      const { data, error: rpcError } = await supabase
        .rpc('get_proposals_for_wallet', { p_wallet_id: walletId });

      if (rpcError) {
        // Fallback to direct table access
        console.warn('RPC function failed, trying direct access:', rpcError);
        const { data: fallbackData, error } = await supabase
          .from('multi_sig_proposals')
          .select('*')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return fallbackData?.map(proposal => this.formatProposalFromData(proposal)) || [];
      }

      return data?.map(proposal => this.formatProposalFromData(proposal)) || [];
      
    } catch (error: any) {
      console.error('Failed to get proposals:', error);
      throw new Error(`Failed to get proposals: ${error.message}`);
    }
  }

  /**
   * Delete a proposal (only if not completed or expired)
   * Only allows deletion of proposals that:
   * - Have not been executed (executed_at IS NULL)
   * - Are in 'pending' or 'signed' status (not 'executed')
   */
  async deleteProposal(proposalId: string): Promise<void> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Check if proposal has been executed
      if (proposal.executedAt) {
        throw new Error('Cannot delete executed proposal');
      }

      // Check if proposal is in completed status
      if (proposal.status === 'executed') {
        throw new Error('Cannot delete completed proposal');
      }

      // Delete associated signatures first (foreign key constraint)
      const { error: signaturesError } = await supabase
        .from('proposal_signatures')
        .delete()
        .eq('proposal_id', proposalId);

      if (signaturesError) {
        console.warn('Failed to delete signatures:', signaturesError);
        // Continue anyway as signatures might not exist
      }

      // Delete the proposal
      const { error: proposalError } = await supabase
        .from('multi_sig_proposals')
        .delete()
        .eq('id', proposalId);

      if (proposalError) {
        throw new Error(`Failed to delete proposal: ${proposalError.message}`);
      }

    } catch (error: any) {
      console.error('Failed to delete proposal:', error);
      throw new Error(`Proposal deletion failed: ${error.message}`);
    }
  }

  // ==========================================================================
  // VALIDATION & REQUIREMENTS
  // ==========================================================================

  /**
   * Validate threshold requirements are met
   */
  async validateThreshold(
    walletId: string,
    signatures: ProposalSignature[]
  ): Promise<boolean> {
    const wallet = await this.getMultiSigWallet(walletId);
    if (!wallet) return false;

    if (signatures.length < wallet.threshold) return false;

    const signerAddresses = signatures.map(s => s.signerAddress);
    const validSigners = signerAddresses.every(addr =>
      wallet.owners.includes(addr)
    );

    return validSigners;
  }

  /**
   * Get signature requirements for a wallet
   */
  async getRequiredSignatures(walletId: string): Promise<SignatureRequirement> {
    const wallet = await this.getMultiSigWallet(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const { data: proposals } = await supabase
      .from('multi_sig_proposals')
      .select('id')
      .eq('wallet_id', walletId)
      .eq('status', 'pending')
      .single();

    let hasSigned: string[] = [];
    if (proposals) {
      const { data: signatures } = await supabase
        .from('proposal_signatures')
        .select('signer_address')
        .eq('proposal_id', proposals.id);
      
      hasSigned = signatures?.map(s => s.signer_address) || [];
    }

    const canSign = wallet.owners.filter(owner => !hasSigned.includes(owner));

    return {
      required: wallet.threshold,
      collected: hasSigned.length,
      remaining: Math.max(0, wallet.threshold - hasSigned.length),
      signers: wallet.owners,
      hasSigned,
      canSign
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async getMultiSigWallet(walletId: string): Promise<MultiSigWallet> {
    const { data, error } = await supabase
      .from('multi_sig_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get wallet: ${error?.message}`);
    }

    const { data: ownersData } = await supabase
      .from('multi_sig_wallet_owners')
      .select('user_id')
      .eq('wallet_id', walletId);

    const ownerAddresses: string[] = [];
    if (ownersData && ownersData.length > 0) {
      const userIds = ownersData.map(o => o.user_id).filter(id => id !== null);
      if (userIds.length > 0) {
        const { data: addressesData } = await supabase
          .from('user_addresses')
          .select('user_id, address, blockchain, is_active')
          .in('user_id', userIds)
          .eq('blockchain', data.blockchain)
          .eq('is_active', true);

        if (addressesData) {
          ownerAddresses.push(...addressesData
            .map(ua => ua.address)
            .filter(addr => addr !== null && addr !== undefined));
        }
      }
    }

    // Map snake_case database fields to camelCase domain type
    return {
      id: data.id,
      name: data.name,
      blockchain: data.blockchain,
      address: data.address,
      owners: ownerAddresses,
      threshold: data.threshold,
      status: data.status as 'active' | 'blocked',
      createdAt: new Date(data.created_at),
      contractType: (data.contract_type || 'custom') as 'custom' | 'gnosis_safe',
      deploymentTx: data.deployment_tx,
      factoryAddress: data.factory_address,
      projectId: data.project_id,
      investorId: data.investor_id
    };
  }

  async getProposal(proposalId: string): Promise<MultiSigProposal> {
    try {
      // Use SECURITY DEFINER function to bypass RLS issues
      const { data: proposals, error: rpcError } = await supabase
        .rpc('get_proposal_by_id', { proposal_id_param: proposalId });

      if (rpcError) {
        // Fallback to direct table access if function fails
        console.warn('RPC function failed, trying direct access:', rpcError);
        const { data: proposal, error } = await supabase
          .from('multi_sig_proposals')
          .select('*')
          .eq('id', proposalId)
          .single();

        if (error) {
          console.error('Supabase error fetching proposal:', error);
          throw error;
        }
        
        if (!proposal) {
          throw new Error('Proposal not found');
        }

        return this.formatProposalFromData(proposal);
      }

      if (!proposals || proposals.length === 0) {
        throw new Error('Proposal not found');
      }

      const proposal = proposals[0];
      return this.formatProposalFromData(proposal);
      
    } catch (error: any) {
      console.error('Failed to get proposal:', error);
      throw new Error(`Failed to get proposal: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  private formatProposalFromData(proposal: any): MultiSigProposal {
    return {
      id: proposal.id,
      walletId: proposal.wallet_id,
      transactionHash: proposal.transaction_hash || '',
      rawTransaction: proposal.raw_transaction || {
        to: proposal.to_address,
        value: proposal.value,
        data: proposal.data || '0x'
      },
      chainType: (proposal.chain_type || proposal.blockchain) as ChainType,
      status: proposal.status || 'pending',
      signaturesCollected: proposal.signatures_collected || 0,
      signaturesRequired: proposal.signatures_required || 2,
      expiresAt: proposal.expires_at ? new Date(proposal.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      executedAt: proposal.executed_at ? new Date(proposal.executed_at) : undefined,
      executionHash: proposal.execution_hash,
      createdBy: proposal.created_by,
      createdAt: new Date(proposal.created_at),
      onChainTxId: proposal.on_chain_tx_id,
      onChainTxHash: proposal.on_chain_tx_hash,
      submittedOnChain: proposal.submitted_on_chain || false
    };
  }

  async getProposalSignatures(proposalId: string): Promise<ProposalSignature[]> {
    // Use SECURITY DEFINER function to bypass RLS issues
    const { data, error: rpcError } = await supabase
      .rpc('get_proposal_signatures', { p_proposal_id: proposalId });

    if (rpcError) {
      // Fallback to direct table access
      console.warn('RPC function failed, trying direct access:', rpcError);
      const { data: fallbackData, error } = await supabase
        .from('proposal_signatures')
        .select('*')
        .eq('proposal_id', proposalId)
        .eq('is_valid', true);

      if (error) {
        throw new Error(`Failed to get signatures: ${error.message}`);
      }

      return fallbackData?.map(s => this.formatSignature(s)) || [];
    }

    return data?.map(s => this.formatSignature(s)) || [];
  }

  private async getSignature(
    proposalId: string,
    signerAddress: string
  ): Promise<ProposalSignature | null> {
    // Use SECURITY DEFINER function to bypass RLS issues
    const { data, error: rpcError } = await supabase
      .rpc('check_existing_signature', {
        p_proposal_id: proposalId,
        p_signer_address: signerAddress
      });

    if (rpcError) {
      // Fallback to direct table access
      console.warn('RPC function failed, trying direct access:', rpcError);
      const { data: fallbackData } = await supabase
        .from('proposal_signatures')
        .select('*')
        .eq('proposal_id', proposalId)
        .eq('signer_address', signerAddress)
        .single();

      return fallbackData ? this.formatSignature(fallbackData) : null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return this.formatSignature(data[0]);
  }

  private async updateProposalSignatureCount(proposalId: string): Promise<void> {
    const signatures = await this.getProposalSignatures(proposalId);
    
    const { error: updateError } = await supabase
      .from('multi_sig_proposals')
      .update({ signatures_collected: signatures.length })
      .eq('id', proposalId);
    
    if (updateError) {
      console.error('Failed to update signature count:', updateError);
      throw updateError;
    }
  }

  private calculateTransactionHash(transaction: any, chainType: ChainType): string {
    if (this.isEVMChain(chainType)) {
      return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256', 'bytes', 'uint256'],
          [
            transaction.from || ethers.ZeroAddress,
            transaction.to,
            transaction.value || 0,
            transaction.data || '0x',
            transaction.nonce || 0
          ]
        )
      );
    }
    
    throw new Error(`Hash calculation not implemented for ${chainType}`);
  }

  private getNetworkType(chainType: ChainType): 'mainnet' | 'testnet' {
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
    return isDevelopment ? 'testnet' : 'mainnet';
  }

  private async validateTransaction(transaction: any, chainType: ChainType): Promise<boolean> {
    const validation = addressUtils.validateAddress(
      transaction.to,
      chainType,
      this.getNetworkType(chainType)
    );

    if (!validation.isValid) {
      throw new Error(`Invalid transaction: ${validation.error}`);
    }

    return true;
  }

  /**
   * Find an owner address that has signing capability
   * Prioritizes addresses that have already signed the proposal
   * Checks both direct encrypted keys and key vault references
   */
  private async findOwnerWithSigningKey(
    ownerAddresses: string[],
    priorityAddresses: string[] = []
  ): Promise<string | null> {
    // First try priority addresses (those who already signed)
    for (const address of priorityAddresses) {
      if (ownerAddresses.includes(address)) {
        const { data } = await supabase
          .from('user_addresses')
          .select('id, encrypted_private_key, key_vault_reference')
          .eq('address', address)
          .single();
        
        // Check if this address has signing capability via either method:
        // 1. Direct encrypted private key
        // 2. Key vault reference (backend encryption service)
        if (data && (data.encrypted_private_key || data.key_vault_reference)) {
          return address;
        }
      }
    }
    
    // Then try all other owners
    for (const address of ownerAddresses) {
      if (!priorityAddresses.includes(address)) {
        const { data } = await supabase
          .from('user_addresses')
          .select('id, encrypted_private_key, key_vault_reference')
          .eq('address', address)
          .single();
        
        // Check if this address has signing capability via either method
        if (data && (data.encrypted_private_key || data.key_vault_reference)) {
          return address;
        }
      }
    }
    
    return null;
  }

  private getSignatureType(chainType: ChainType): 'ecdsa' | 'schnorr' | 'eddsa' {
    if (this.isEVMChain(chainType)) return 'ecdsa';
    if (chainType === ChainType.BITCOIN) return 'schnorr';
    if (chainType === ChainType.SOLANA) return 'eddsa';
    return 'ecdsa';
  }

  private isEVMChain(chainType: ChainType): boolean {
    const evmChains = [
      ChainType.ETHEREUM,
      ChainType.POLYGON,
      ChainType.ARBITRUM,
      ChainType.OPTIMISM,
      ChainType.BASE,
      ChainType.BSC,
      ChainType.AVALANCHE,
      ChainType.ZKSYNC
    ];
    return evmChains.includes(chainType);
  }

  private formatProposal(data: any): MultiSigProposal {
    return {
      id: data.id,
      walletId: data.wallet_id,
      transactionHash: data.transaction_hash,
      rawTransaction: data.raw_transaction,
      chainType: data.chain_type as ChainType,
      status: data.status,
      signaturesCollected: data.signatures_collected,
      signaturesRequired: data.signatures_required,
      expiresAt: new Date(data.expires_at),
      executedAt: data.executed_at ? new Date(data.executed_at) : undefined,
      executionHash: data.execution_hash,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      onChainTxId: data.on_chain_tx_id,
      onChainTxHash: data.on_chain_tx_hash,
      submittedOnChain: data.submitted_on_chain || false
    };
  }

  private formatSignature(data: any): ProposalSignature {
    return {
      id: data.id,
      proposalId: data.proposal_id,
      signerAddress: data.signer_address,
      signature: data.signature,
      signatureType: data.signature_type,
      signedAt: new Date(data.signed_at),
      isValid: data.is_valid,
      onChainConfirmationTx: data.on_chain_confirmation_tx,
      confirmedOnChain: data.confirmed_on_chain || false
    };
  }
}

// Export singleton instance
export const multiSigProposalService = MultiSigProposalService.getInstance();
