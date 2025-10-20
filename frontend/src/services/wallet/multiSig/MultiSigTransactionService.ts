/**
 * Multi-Signature Transaction Service - ENHANCED
 * Core service for managing multi-sig transaction workflows
 * Supports threshold signatures across EVM and non-EVM chains
 * UPDATED: Uses project_wallets for deployment funding
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { ChainType, addressUtils } from '../AddressUtils';
import { SignatureAggregator } from './SignatureAggregator';
import { LocalSigner } from './LocalSigner';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, isValidChainId } from '@/infrastructure/web3/utils';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Import ABIs from foundry-contracts
import MultiSigWalletFactoryABI from '@/../foundry-contracts/out/MultiSigWalletFactory.sol/MultiSigWalletFactory.json';
import MultiSigWalletABI from '@/../foundry-contracts/out/MultiSigWallet.sol/MultiSigWallet.json';

// ============================================================================
// INTERFACES 
// ============================================================================

export interface MultiSigProposal {
  id: string;
  walletId: string;
  transactionHash: string;
  rawTransaction: any;
  chainType: ChainType;
  status: 'pending' | 'submitted' | 'signed' | 'executed' | 'expired' | 'rejected';
  signaturesCollected: number;
  signaturesRequired: number;
  expiresAt: Date;
  executedAt?: Date;
  executionHash?: string;
  createdBy: string;
  createdAt: Date;
  onChainTxId?: number;
  onChainTxHash?: string;
  submittedOnChain: boolean;
}

export interface ProposalSignature {
  id: string;
  proposalId: string;
  signerAddress: string;
  signature: string;
  signatureType: 'ecdsa' | 'schnorr' | 'eddsa';
  signedAt: Date;
  isValid: boolean;
  onChainConfirmationTx?: string;
  confirmedOnChain: boolean;
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
  contractType: 'custom' | 'gnosis_safe';
  deploymentTx?: string;
  factoryAddress?: string;
  projectId?: string;
  investorId?: string;
}

export interface ProjectWallet {
  id: string;
  projectId: string;
  walletType: string;
  walletAddress: string;
  publicKey: string;
  privateKey?: string;
  keyVaultId?: string;
  chainId?: string;
  net?: string;
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

export interface WalletDeploymentResult {
  address: string;
  transactionHash: string;
  factoryAddress: string;
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
  // PROJECT WALLET METHODS (NEW)
  // ============================================================================

  /**
   * Get project wallet for funding deployments
   * Uses any available wallet from project_wallets table
   * @param projectId - The project ID
   * @param blockchain - The blockchain network (e.g., 'ethereum', 'hoodi', 'mainnet')
   */
  async getProjectWallet(projectId: string, blockchain?: string): Promise<ProjectWallet> {
    try {
      const query = supabase
        .from('project_wallets')
        .select('*')
        .eq('project_id', projectId);

      // Filter by blockchain if provided
      // Try matching by 'net' field first (e.g., 'mainnet', 'hoodi', 'testnet')
      // Fall back to 'chain_id' if net doesn't match
      if (blockchain) {
        // First try: Match by net field (preferred)
        query.or(`net.eq.${blockchain},chain_id.eq.${this.getChainIdString(blockchain)}`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          `No wallet found for project ${projectId}${blockchain ? ` on ${blockchain}` : ''}`
        );
      }

      return {
        id: data.id,
        projectId: data.project_id,
        walletType: data.wallet_type,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        keyVaultId: data.key_vault_id,
        chainId: data.chain_id,
        net: data.net
      };
    } catch (error: any) {
      console.error('Failed to get project wallet:', error);
      throw new Error(`Failed to get project wallet: ${error.message}`);
    }
  }

  /**
   * Get project wallet by specific wallet ID
   * Used when user has explicitly selected which wallet to use for funding
   */
  async getProjectWalletById(walletId: string): Promise<ProjectWallet> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('id', walletId)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error(`No wallet found with ID ${walletId}`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        walletType: data.wallet_type,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        keyVaultId: data.key_vault_id,
        chainId: data.chain_id,
        net: data.net
      };
    } catch (error: any) {
      console.error('Failed to get project wallet by ID:', error);
      throw new Error(`Failed to get wallet by ID: ${error.message}`);
    }
  }

  /**
   * Get private key from project wallet (KeyVault or direct)
   */
  private async getProjectWalletPrivateKey(projectWallet: ProjectWallet): Promise<string> {
    try {
      // Try KeyVault first
      if (projectWallet.keyVaultId) {
        const keyResult = await keyVaultClient.getKey(projectWallet.keyVaultId);
        return typeof keyResult === 'string' ? keyResult : keyResult.privateKey;
      }

      // Fall back to direct private key (if stored)
      if (projectWallet.privateKey) {
        return projectWallet.privateKey;
      }

      throw new Error('No private key available for project wallet');
    } catch (error: any) {
      console.error('Failed to get project wallet private key:', error);
      throw new Error(`Failed to get private key: ${error.message}`);
    }
  }

  /**
   * Map blockchain name to chain ID using centralized utility
   * Based on https://docs.etherscan.io/supported-chains
   */
  private getChainIdString(blockchain: string): string {
    const chainId = getChainId(blockchain.toLowerCase());
    if (!chainId) {
      console.warn(`Unknown blockchain: ${blockchain}, defaulting to Ethereum`);
      return '1'; // Default to Ethereum
    }
    return chainId.toString();
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

    } catch (error: any) {
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

    } catch (error: any) {
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
  // ON-CHAIN MULTI-SIG METHODS (UPDATED)
  // ============================================================================

  /**
   * Deploy a new multi-sig wallet contract
   * Service provider selects which project wallet funds deployment
   */
  async deployMultiSigWallet(
    name: string,
    owners: string[],
    threshold: number,
    blockchain: string = 'ethereum',
    projectId: string,  // REQUIRED - for tracking association
    fundingWalletId?: string  // OPTIONAL - specific wallet ID selected by user for funding
  ): Promise<WalletDeploymentResult> {
    try {
      // Validate inputs
      if (!name || name.trim() === '') {
        throw new Error('Wallet name is required');
      }

      if (!projectId) {
        throw new Error('Project ID is required to fund deployment');
      }

      const validOwners = owners.filter(o => o.trim() !== '');
      if (validOwners.length < 2) {
        throw new Error('At least 2 owners required');
      }

      if (threshold < 1 || threshold > validOwners.length) {
        throw new Error('Invalid threshold: must be between 1 and number of owners');
      }

      // Get factory address from config
      const factoryAddress = this.getFactoryAddress(blockchain);
      if (!factoryAddress) {
        throw new Error(`No factory address configured for ${blockchain}`);
      }

      // Get project wallet to fund deployment
      // If specific wallet ID provided, use that; otherwise search by project + blockchain
      const deployerWallet = fundingWalletId 
        ? await this.getProjectWalletById(fundingWalletId)
        : await this.getProjectWallet(projectId, blockchain);
      console.log(`Using project wallet ${deployerWallet.walletAddress} to fund deployment`);
      
      // Get provider
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(blockchain));
      
      // Get signer from deployer wallet
      const privateKey = await this.getProjectWalletPrivateKey(deployerWallet);
      const signer = new ethers.Wallet(privateKey, provider);
      
      // Load factory contract
      const factory = new ethers.Contract(
        factoryAddress,
        MultiSigWalletFactoryABI.abi,
        signer
      );
      
      // Create wallet (gas paid by project wallet)
      console.log(`Deploying multi-sig wallet from project wallet ${deployerWallet.walletAddress}`);
      const tx = await factory.createWallet(name, validOwners, threshold);
      const receipt = await tx.wait();
      
      // Extract wallet address from WalletCreated event
      const walletCreatedEvent = receipt.logs.find(
        (log: any) => {
          try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === 'WalletCreated';
          } catch {
            return false;
          }
        }
      );
      
      if (!walletCreatedEvent) {
        throw new Error('WalletCreated event not found in transaction receipt');
      }
      
      const parsedEvent = factory.interface.parseLog(walletCreatedEvent);
      const walletAddress = parsedEvent?.args?.wallet;
      
      if (!walletAddress) {
        throw new Error('Could not extract wallet address from event');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Store in database
      await supabase.from('multi_sig_wallets').insert({
        name,
        blockchain,
        address: walletAddress,
        owners: validOwners,
        threshold,
        status: 'active',
        contract_type: 'custom',
        deployment_tx: receipt.hash,
        factory_address: factoryAddress,
        project_id: projectId,
        funded_by_wallet_id: deployerWallet.id, // Track which wallet funded deployment
        created_by: user?.id
      });
      
      console.log(`Multi-sig wallet deployed at ${walletAddress} by project wallet ${deployerWallet.walletAddress}`);
      
      return {
        address: walletAddress,
        transactionHash: receipt.hash,
        factoryAddress
      };
      
    } catch (error: any) {
      console.error('Failed to deploy multi-sig wallet:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

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
      // Get proposal
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }
      
      // Get wallet
      const wallet = await this.getMultiSigWallet(proposal.walletId);
      if (!wallet) {
        throw new Error(`Wallet ${proposal.walletId} not found`);
      }
      
      // Check signatures meet threshold
      const signatures = await this.getProposalSignatures(proposalId);
      if (signatures.length < wallet.threshold) {
        throw new Error(
          `Not enough signatures: ${signatures.length}/${wallet.threshold}`
        );
      }
      
      // Get provider and signer
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(wallet.blockchain));
      const signer = await this.getSigner(provider);
      
      // Load multi-sig contract
      const multiSig = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        signer
      );
      
      // Submit transaction to contract
      const tx = await multiSig.submitTransaction(
        proposal.rawTransaction.to,
        proposal.rawTransaction.value || '0',
        proposal.rawTransaction.data || '0x',
        24 // 24 hour expiry
      );
      
      const receipt = await tx.wait();
      
      // Extract transaction ID from SubmitTransaction event
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
      
      // Update proposal in database
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
      // Get proposal
      const proposal = await this.getProposal(proposalId);
      if (!proposal || !proposal.onChainTxId) {
        throw new Error('Proposal not submitted on-chain');
      }
      
      // Get wallet
      const wallet = await this.getMultiSigWallet(proposal.walletId);

      // Verify signer is an owner
      if (!wallet.owners.includes(signerAddress)) {
        throw new Error(`${signerAddress} is not an owner of this wallet`);
      }
      
      // Get provider and signer
      const provider = new ethers.JsonRpcProvider(this.getRpcUrl(wallet.blockchain));
      const signer = await this.getSigner(provider, signerAddress);
      
      // Load multi-sig contract
      const multiSig = new ethers.Contract(
        wallet.address,
        MultiSigWalletABI.abi,
        signer
      );
      
      // Confirm on-chain
      const tx = await multiSig.confirmTransaction(proposal.onChainTxId);
      const receipt = await tx.wait();
      
      // Update database
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

      return data?.map(d => this.formatProposal(d)) || [];
    } catch (error: any) {
      console.error('Failed to get proposals:', error);
      throw new Error(`Failed to get proposals: ${error.message}`);
    }
  }

  /**
   * Helper: Get factory address for blockchain from environment
   */
  private getFactoryAddress(blockchain: string): string {
    const envVarMap: Record<string, string> = {
      ethereum: 'VITE_MULTISIG_FACTORY_ETHEREUM',
      holesky: 'VITE_MULTISIG_FACTORY_HOLESKY',
      hoodi: 'VITE_MULTISIG_FACTORY_HOODI',
      polygon: 'VITE_MULTISIG_FACTORY_POLYGON',
      arbitrum: 'VITE_MULTISIG_FACTORY_ARBITRUM',
    };
    
    const envVar = envVarMap[blockchain.toLowerCase()];
    if (!envVar) {
      throw new Error(`No factory configuration for blockchain: ${blockchain}`);
    }
    
    const address = import.meta.env[envVar];
    if (!address) {
      throw new Error(
        `No factory address configured for ${blockchain}. Please set ${envVar} in .env`
      );
    }
    
    return address;
  }

  /**
   * Helper: Get RPC URL from centralized RPC manager
   */
  private getRpcUrl(blockchain: string): string {
    // Validate blockchain using centralized validator
    const chain = validateBlockchain(blockchain);
    
    // Determine network type (testnet for development, mainnet for production)
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
    const isTestnetChain = ['holesky', 'hoodi', 'sepolia'].includes(chain);
    const networkType = isTestnetChain ? 'testnet' : (isDevelopment ? 'testnet' : 'mainnet');
    
    // Get RPC URL from manager
    const rpcUrl = rpcManager.getRPCUrl(chain, networkType);
    if (!rpcUrl) {
      throw new Error(
        `No RPC URL configured for ${blockchain} (${networkType}). Please check your .env configuration.`
      );
    }
    
    return rpcUrl;
  }

  /**
   * Helper: Get signer
   */
  private async getSigner(provider: ethers.JsonRpcProvider, address?: string): Promise<ethers.Signer> {
    // Use KeyVault to get private key
    const keyResult = await keyVaultClient.getKey(address || 'default');
    // KeyResult can be either string or KeyData object
    const privateKey = typeof keyResult === 'string' ? keyResult : keyResult.privateKey;
    return new ethers.Wallet(privateKey, provider);
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

  async getProposal(proposalId: string): Promise<MultiSigProposal> {
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

  /**
   * Get network type from environment (defaulting to mainnet for production)
   */
  private getNetworkType(chainType: ChainType): 'mainnet' | 'testnet' {
    // In development, use testnet; in production, use mainnet
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
    return isDevelopment ? 'testnet' : 'mainnet';
  }

  private async validateTransaction(transaction: any, chainType: ChainType): Promise<boolean> {
    // Use address utils for validation
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
export const multiSigTransactionService = MultiSigTransactionService.getInstance();
