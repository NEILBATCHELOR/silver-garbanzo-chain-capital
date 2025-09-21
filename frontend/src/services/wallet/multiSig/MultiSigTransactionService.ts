/**
 * Multi-Signature Transaction Service
 * Core service for managing multi-sig transaction workflows
 * Supports threshold signatures across EVM and non-EVM chains
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { ChainType, addressUtils } from '../AddressUtils';
import { SignatureAggregator } from './SignatureAggregator';
import { LocalSigner } from './LocalSigner';

// ============================================================================
// INTERFACES 
// ============================================================================

export interface MultiSigProposal {
  id: string;
  walletId: string;
  transactionHash: string;
  rawTransaction: any;
  chainType: ChainType;
  status: 'pending' | 'signed' | 'executed' | 'expired' | 'rejected';
  signaturesCollected: number;
  signaturesRequired: number;
  expiresAt: Date;
  executedAt?: Date;
  executionHash?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ProposalSignature {
  id: string;
  proposalId: string;
  signerAddress: string;
  signature: string;
  signatureType: 'ecdsa' | 'schnorr' | 'eddsa';
  signedAt: Date;
  isValid: boolean;
}

export interface MultiSigWallet {
  id: string;
  name: string;
  blockchain: string;
  address: string;
  owners: string[];
  threshold: number;
  status: 'active' | 'blocked';
  createdAt: Date;
}

export interface SignatureRequirement {
  required: number;
  collected: number;
  remaining: number;
  signers: string[];
  hasSigned: string[];
  canSign: string[];
}

export interface SignedMultiSigTransaction {
  proposalId: string;
  rawTransaction: string;
  signatures: string[];
  chainType: ChainType;
  readyToBroadcast: boolean;
}

export interface MultiSigBroadcastResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
  proposalId: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigTransactionService {
  private static instance: MultiSigTransactionService;
  private signatureAggregator: SignatureAggregator;
  private localSigner: LocalSigner;

  constructor() {
    this.signatureAggregator = new SignatureAggregator();
    this.localSigner = new LocalSigner();
  }

  static getInstance(): MultiSigTransactionService {
    if (!MultiSigTransactionService.instance) {
      MultiSigTransactionService.instance = new MultiSigTransactionService();
    }
    return MultiSigTransactionService.instance;
  }

  // ============================================================================
  // PROPOSAL MANAGEMENT
  // ============================================================================

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
      // Get wallet details
      const wallet = await this.getMultiSigWallet(walletId);
      if (!wallet) {
        throw new Error(`Multi-sig wallet ${walletId} not found`);
      }

      // Validate transaction
      await this.validateTransaction(transaction, chainType);

      // Calculate transaction hash
      const transactionHash = this.calculateTransactionHash(transaction, chainType);

      // Create expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      // Store proposal in database
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

    } catch (error) {
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
      // Get proposal details
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Check if already signed by this address
      const existingSignature = await this.getSignature(proposalId, signerAddress);
      if (existingSignature) {
        throw new Error(`Address ${signerAddress} has already signed this proposal`);
      }

      // Validate signer is authorized
      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (!wallet.owners.includes(signerAddress)) {
        throw new Error(`Address ${signerAddress} is not an authorized signer`);
      }

      // Sign the transaction hash
      const signature = await this.localSigner.signTransaction(
        proposal.transactionHash,
        signerAddress,
        privateKeyOrKeyId,
        proposal.chainType
      );

      // Store signature
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

      // Update proposal signature count
      await this.updateProposalSignatureCount(proposalId);

      return this.formatSignature(data);

    } catch (error) {
      console.error('Failed to sign proposal:', error);
      throw new Error(`Proposal signing failed: ${error.message}`);
    }
  }

  /**
   * Aggregate signatures and prepare for broadcast
   */
  async aggregateSignatures(proposalId: string): Promise<SignedMultiSigTransaction> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      // Get all valid signatures
      const signatures = await this.getProposalSignatures(proposalId);
      
      // Validate threshold met
      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (signatures.length < wallet.threshold) {
        throw new Error(`Insufficient signatures: ${signatures.length}/${wallet.threshold}`);
      }

      // Aggregate signatures based on chain type
      const aggregatedTx = await this.signatureAggregator.aggregate(
        proposal.rawTransaction,
        signatures,
        proposal.chainType,
        wallet
      );

      // Update proposal status
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

    } catch (error) {
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

      // Get network type from wallet configuration
      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('network_type')
        .eq('id', proposal.walletId)
        .single();
      
      const networkType = walletData?.network_type || 'mainnet';
      
      // Get appropriate builder for chain
      const builder = universalTransactionBuilder.getBuilder(
        signedTx.chainType,
        networkType
      );

      // Broadcast transaction with retry logic
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
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
        }
      }

      if (result.success) {
        // Update proposal with execution details
        await supabase
          .from('multi_sig_proposals')
          .update({
            status: 'executed',
            executed_at: new Date(),
            execution_hash: result.transactionHash
          })
          .eq('id', signedTx.proposalId);
      }

      return {
        ...result,
        proposalId: signedTx.proposalId
      };

    } catch (error) {
      console.error('Failed to broadcast multi-sig transaction:', error);
      return {
        success: false,
        error: error.message,
        proposalId: signedTx.proposalId
      };
    }
  }
  // ============================================================================
  // VALIDATION & REQUIREMENTS
  // ============================================================================

  /**
   * Validate threshold requirements are met
   */
  async validateThreshold(
    walletId: string,
    signatures: ProposalSignature[]
  ): Promise<boolean> {
    const wallet = await this.getMultiSigWallet(walletId);
    if (!wallet) return false;

    // Check signature count
    if (signatures.length < wallet.threshold) return false;

    // Validate all signers are authorized
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

    // Get any pending proposal signatures
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
  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getMultiSigWallet(walletId: string): Promise<MultiSigWallet> {
    const { data, error } = await supabase
      .from('multi_sig_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get wallet: ${error?.message}`);
    }

    return data;
  }

  private async getProposal(proposalId: string): Promise<MultiSigProposal> {
    const { data, error } = await supabase
      .from('multi_sig_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get proposal: ${error?.message}`);
    }

    return this.formatProposal(data);
  }

  private async getProposalSignatures(proposalId: string): Promise<ProposalSignature[]> {
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
    
    await supabase
      .from('multi_sig_proposals')
      .update({ signatures_collected: signatures.length })
      .eq('id', proposalId);
  }

  private calculateTransactionHash(transaction: any, chainType: ChainType): string {
    // Chain-specific hash calculation
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
    
    // Add other chain types as needed
    throw new Error(`Hash calculation not implemented for ${chainType}`);
  }

  private async validateTransaction(transaction: any, chainType: ChainType): Promise<boolean> {
    // Use address utils for validation
    const validation = addressUtils.validateAddress(
      transaction.to,
      chainType,
      'mainnet' // TODO: Get from config
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
    return 'ecdsa'; // Default
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
      createdAt: new Date(data.created_at)
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
      isValid: data.is_valid
    };
  }
}

// Export singleton instance
export const multiSigTransactionService = MultiSigTransactionService.getInstance();