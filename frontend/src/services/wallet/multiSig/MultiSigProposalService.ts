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

      const { data, error } = await supabase
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

      return this.formatSignature(data);

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

      await supabase
        .from('multi_sig_proposals')
        .update({ status: 'signed' })
        .eq('id', proposalId);

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
        await supabase
          .from('multi_sig_proposals')
          .update({
            status: 'executed',
            executed_at: new Date().toISOString(),
            execution_hash: result.transactionHash
          })
          .eq('id', signedTx.proposalId);
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
      
      if (!wallet.projectId) {
        throw new Error('Multi-sig wallet must be associated with a project');
      }
      
      const signer = await getSigner(provider, {
        projectId: wallet.projectId,
        blockchain: wallet.blockchain
      });
      
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
      
      await supabase
        .from('multi_sig_proposals')
        .update({
          on_chain_tx_id: onChainTxId,
          on_chain_tx_hash: receipt.hash,
          submitted_on_chain: true,
          status: 'submitted'
        })
        .eq('id', proposalId);
      
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
      if (!proposal || !proposal.onChainTxId) {
        throw new Error('Proposal not submitted on-chain');
      }

      const wallet = await this.getMultiSigWallet(proposal.walletId);

      if (!wallet.owners.includes(signerAddress)) {
        throw new Error(`${signerAddress} is not an owner of this wallet`);
      }
      
      const provider = new ethers.JsonRpcProvider(getRpcUrl(wallet.blockchain));
      const signer = await getSigner(provider, signerAddress);
      
      const multiSig = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        signer
      );
      
      const tx = await multiSig.confirmTransaction(proposal.onChainTxId);
      const receipt = await tx.wait();
      
      await supabase
        .from('proposal_signatures')
        .update({
          on_chain_confirmation_tx: receipt.hash,
          confirmed_on_chain: true
        })
        .eq('proposal_id', proposalId)
        .eq('signer_address', signerAddress);
      
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
      const { data, error } = await supabase
        .from('multi_sig_proposals')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(proposal => ({
        id: proposal.id,
        walletId: proposal.wallet_id,
        transactionHash: proposal.transaction_hash,
        rawTransaction: proposal.raw_transaction,
        chainType: proposal.chain_type as ChainType,
        status: proposal.status,
        signaturesCollected: proposal.signatures_collected || 0,
        signaturesRequired: proposal.signatures_required,
        expiresAt: new Date(proposal.expires_at),
        executedAt: proposal.executed_at ? new Date(proposal.executed_at) : undefined,
        executionHash: proposal.execution_hash || undefined,
        createdBy: proposal.created_by,
        createdAt: new Date(proposal.created_at),
        onChainTxId: proposal.on_chain_tx_id || undefined,
        onChainTxHash: proposal.on_chain_tx_hash || undefined,
        submittedOnChain: proposal.submitted_on_chain || false
      })) || [];
    } catch (error: any) {
      console.error('Failed to get proposals:', error);
      throw new Error(`Failed to get proposals: ${error.message}`);
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

    return {
      ...data,
      owners: ownerAddresses
    };
  }

  async getProposal(proposalId: string): Promise<MultiSigProposal> {
    try {
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
    } catch (error: any) {
      console.error('Failed to get proposal:', error);
      throw new Error(`Failed to get proposal: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  async getProposalSignatures(proposalId: string): Promise<ProposalSignature[]> {
    const { data, error } = await supabase
      .from('proposal_signatures')
      .select('*')
      .eq('proposal_id', proposalId)
      .eq('is_valid', true);

    if (error) {
      throw new Error(`Failed to get signatures: ${error.message}`);
    }

    return data?.map(s => this.formatSignature(s)) || [];
  }

  private async getSignature(
    proposalId: string,
    signerAddress: string
  ): Promise<ProposalSignature | null> {
    const { data } = await supabase
      .from('proposal_signatures')
      .select('*')
      .eq('proposal_id', proposalId)
      .eq('signer_address', signerAddress)
      .single();

    return data ? this.formatSignature(data) : null;
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
