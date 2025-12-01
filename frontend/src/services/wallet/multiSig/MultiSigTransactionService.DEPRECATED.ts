/**
 * ⚠️ DEPRECATED - DO NOT USE IN NEW CODE ⚠️
 * 
 * This service has been split into focused services for better maintainability:
 * - MultiSigWalletService: Wallet creation, deployment, queries
 * - MultiSigProposalService: Proposal creation, signing, execution
 * 
 * Migration Guide:
 * 1. For wallet deployment:
 *    OLD: multiSigTransactionService.deployMultiSigWallet(...)
 *    NEW: MultiSigWalletService.deployMultiSigWallet(...)
 * 
 * 2. For proposal signing:
 *    OLD: multiSigTransactionService.signProposal(...)
 *    NEW: multiSigProposalService.signProposal(...)
 * 
 * 3. For proposal creation:
 *    OLD: multiSigTransactionService.createProposal(...)
 *    NEW: multiSigProposalService.createProposal(...)
 * 
 * @deprecated Use MultiSigWalletService and MultiSigProposalService instead
 * @see MultiSigWalletService for wallet operations
 * @see MultiSigProposalService for proposal operations
 */

/**
 * Multi-Signature Transaction Service - ENHANCED
 * Core service for managing multi-sig transaction workflows
 * Supports threshold signatures across EVM and non-EVM chains
 * UPDATED: Uses project_wallets for deployment funding
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { universalTransactionBuilder } from '../builders/TransactionBuilder';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { ChainType, addressUtils } from '../AddressUtils';
import { SignatureAggregator } from './SignatureAggregator';
import { LocalSigner } from './LocalSigner';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, getChainName, isValidChainId, CHAIN_IDS } from '@/infrastructure/web3/utils';
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
  projectWalletName?: string;
  address?: string; // Alternative to walletAddress
  walletAddress?: string; // Alternative to address
  publicKey: string;
  privateKey?: string;
  privateKeyVaultId?: string;
  mnemonicVaultId?: string;
  chainId?: string;
  nonEvmNetwork?: string;
  bitcoinNetworkType?: string;
  hasDirectKey?: boolean;
  hasVaultKey?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  id: string;
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
        .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
        .eq('project_id', projectId);

      // Filter by blockchain if provided
      // Try matching by 'non_evm_network' field first (e.g., 'mainnet', 'hoodi', 'testnet')
      // Fall back to 'chain_id' if non_evm_network doesn't match
      if (blockchain) {
        // First try: Match by non_evm_network field (preferred)
        query.or(`non_evm_network.eq.${blockchain},chain_id.eq.${this.getChainIdString(blockchain)}`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          `No wallet found for project ${projectId}${blockchain ? ` on ${blockchain}` : ''}`
        );
      }

      if (!data.private_key) {
        throw new Error(`Project wallet has no private key stored`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        privateKeyVaultId: data.private_key_vault_id,
        mnemonicVaultId: data.mnemonic_vault_id,
        chainId: data.chain_id,
        nonEvmNetwork: data.non_evm_network
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
        .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
        .eq('id', walletId)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error(`No wallet found with ID ${walletId}`);
      }

      if (!data.private_key) {
        throw new Error(`Project wallet ${walletId} has no private key stored`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        walletAddress: data.wallet_address,
        publicKey: data.public_key,
        privateKey: data.private_key,
        privateKeyVaultId: data.private_key_vault_id,
        mnemonicVaultId: data.mnemonic_vault_id,
        chainId: data.chain_id,
        nonEvmNetwork: data.non_evm_network
      };
    } catch (error: any) {
      console.error('Failed to get project wallet by ID:', error);
      throw new Error(`Failed to get wallet by ID: ${error.message}`);
    }
  }

  /**
   * Get private key from project wallet (using WalletEncryptionClient like ProjectWalletList)
   */
  private async getProjectWalletPrivateKey(projectWallet: ProjectWallet): Promise<string> {
    try {
      if (!projectWallet.privateKey) {
        throw new Error('No private key available for project wallet');
      }

      // Check if encrypted (using same pattern as ProjectWalletList)
      const isEncrypted = WalletEncryptionClient.isEncrypted(projectWallet.privateKey);
      
      if (isEncrypted) {
        // Decrypt via backend API
        console.log('Decrypting project wallet private key via WalletEncryptionClient');
        const decrypted = await WalletEncryptionClient.decrypt(projectWallet.privateKey);
        return decrypted;
      } else {
        // Not encrypted, return as-is
        console.log('Project wallet private key is not encrypted, using directly');
        return projectWallet.privateKey;
      }
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

      // If no private key provided, look up the key vault reference for this address
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

        // Determine which key source to use
        if (userAddress.key_vault_reference) {
          // Use key vault reference
          signingKey = `vault:${userAddress.key_vault_reference}`;
        } else if (userAddress.encrypted_private_key) {
          // Use encrypted private key (will need password prompt)
          signingKey = `encrypted:${userAddress.encrypted_private_key}`;
        } else {
          throw new Error(`No private key or key vault reference found for address ${signerAddress}`);
        }
      }

      // Sign the transaction hash
      const signature = await this.localSigner.signTransaction(
        proposal.transactionHash,
        signerAddress,
        signingKey,
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

      // Update proposal status (transaction_proposals table removed)
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
        // Update proposal with execution details in both layers
        // Update proposal with execution details (transaction_proposals table removed)
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
   * Normalize blockchain/network name using chainIds.ts as source of truth
   * 
   * Uses centralized chain ID utilities to ensure consistent naming:
   * - "ethereum" = Ethereum mainnet only (chain ID 1)
   * - "hoodi" = Hoodi testnet (chain ID 560048)
   * - "holesky" = Holesky testnet (chain ID 17000)
   * - "sepolia" = Sepolia testnet (chain ID 11155111)
   * - etc.
   * 
   * @param networkOrChainName - Network name, chain name, or "mainnet"
   * @param chainId - Optional chain ID for disambiguating "mainnet"
   * @returns Proper chain name from chainIds.ts (e.g., 'ethereum', 'hoodi', 'polygon', 'arbitrumOne')
   */
  private normalizeBlockchainName(networkOrChainName: string, chainId?: string): string {
    const input = networkOrChainName.toLowerCase().trim();

    // Case 1: Input is already a valid chain name from CHAIN_IDS
    // Examples: 'ethereum', 'hoodi', 'holesky', 'sepolia', 'polygon', 'arbitrumOne'
    if (input in CHAIN_IDS) {
      return input;
    }

    // Case 2: Handle "mainnet" - need chainId to determine WHICH mainnet
    if (input === 'mainnet') {
      if (chainId) {
        const numericChainId = parseInt(chainId, 10);
        if (!isNaN(numericChainId)) {
          const name = getChainName(numericChainId);
          if (name) {
            console.log(`Resolved "mainnet" with chain ID ${chainId} → "${name}"`);
            return name;
          }
        }
      }
      // Fallback: assume Ethereum mainnet if chainId not provided
      console.warn(`"mainnet" without chainId, defaulting to "ethereum". Provide chainId for accuracy.`);
      return 'ethereum';
    }

    // Case 3: Input is a numeric string (chain ID)
    // Examples: "1" → "ethereum", "137" → "polygon", "560048" → "hoodi"
    const numericChainId = parseInt(input, 10);
    if (!isNaN(numericChainId) && isValidChainId(numericChainId)) {
      const name = getChainName(numericChainId);
      if (name) {
        console.log(`Resolved chain ID ${input} → "${name}"`);
        return name;
      }
    }

    // Case 4: Check common aliases and map to proper names
    const aliases: Record<string, string> = {
      'eth': 'ethereum',
      'matic': 'polygon',
      'arb': 'arbitrumOne',
      'op': 'optimism',
      'avax': 'avalanche',
      'bnb': 'bnb',
      'bsc': 'bnb'
    };
    if (input in aliases) {
      const resolved = aliases[input];
      console.log(`Resolved alias "${input}" → "${resolved}"`);
      return resolved;
    }

    // Case 5: No match - use as-is (backward compatible, allow future networks)
    console.warn(`Unknown network name "${input}", using as-is. Add to chainIds.ts if this is a new network.`);
    return input;
  }

  /**
   * Deploy a new multi-sig wallet contract
   * Service provider selects which project wallet funds deployment
   * Populates both multi_sig_wallets and multi_sig_wallet_owners tables
   */
  async deployMultiSigWallet(
    name: string,
    owners: string[],
    threshold: number,
    blockchain: string = 'ethereum',
    projectId: string,  // REQUIRED - for tracking association
    fundingWalletId?: string,  // OPTIONAL - specific wallet ID selected by user for funding
    ownerUsers?: Array<{ userId: string; roleId: string; address: string }>  // OPTIONAL - user info for multi_sig_wallet_owners
  ): Promise<WalletDeploymentResult> {
    try {
      // Validate inputs
      if (!name || name.trim() === '') {
        throw new Error('Wallet name is required');
      }

      if (!projectId) {
        throw new Error('Project ID is required to fund deployment');
      }

      // Phase B & C: Validate blockchain is EVM-compatible
      const validatedChain = validateBlockchain(blockchain);
      if (!isEVMChain(validatedChain)) {
        throw new Error(
          `Multi-sig wallets only supported on EVM chains. ${validatedChain} is not EVM-compatible.`
        );
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
      
      // Normalize blockchain name using chainIds.ts as source of truth
      // Pass deployerWallet.chainId to intelligently resolve "mainnet"
      // Examples:
      //   "hoodi" + chainId 560048 → "hoodi" (already correct)
      //   "mainnet" + chainId 1 → "ethereum"
      //   "mainnet" + chainId 137 → "polygon"
      const normalizedBlockchain = this.normalizeBlockchainName(
        blockchain,
        deployerWallet.chainId
      );
      
      console.log(`Normalizing blockchain name: "${blockchain}" → "${normalizedBlockchain}" (chain ID: ${deployerWallet.chainId || 'none'})`);
      
      // Store in database with error handling
      // Owner relationships are tracked in multi_sig_wallet_owners table
      // and actual addresses are stored in user_addresses table
      const { data: insertedWallet, error: insertError } = await supabase
        .from('multi_sig_wallets')
        .insert({
          name,
          blockchain: normalizedBlockchain,  // Use normalized name
          address: walletAddress,
          // owners column dropped - using multi_sig_wallet_owners table instead
          threshold,
          status: 'active',
          contract_type: 'custom',
          deployment_tx: receipt.hash,
          factory_address: factoryAddress,
          project_id: projectId,
          funded_by_wallet_id: deployerWallet.id, // Track which wallet funded deployment
          created_by: user?.id
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ CRITICAL: Multi-sig wallet deployed on-chain but failed to save to database:', insertError);
        console.error('Deployment details:', {
          walletAddress,
          transactionHash: receipt.hash,
          blockchain,
          normalizedBlockchain,
          projectId,
          deployerWalletId: deployerWallet.id
        });
        throw new Error(
          `Wallet deployed on-chain at ${walletAddress} but failed to save to database: ${insertError.message}. ` +
          `Transaction hash: ${receipt.hash}. Please contact support to manually record this wallet.`
        );
      }
      
      console.log(`✅ Multi-sig wallet deployed and saved to database:`, {
        id: insertedWallet.id,
        address: walletAddress,
        blockchain: normalizedBlockchain,
        transactionHash: receipt.hash,
        fundedBy: deployerWallet.walletAddress
      });
      
      // Insert owner records into multi_sig_wallet_owners (if user info provided)
      if (ownerUsers && ownerUsers.length > 0) {
        console.log(`Inserting ${ownerUsers.length} owner records into multi_sig_wallet_owners...`);
        
        const ownerRecords = ownerUsers.map(owner => ({
          wallet_id: insertedWallet.id,
          user_id: owner.userId,
          role_id: owner.roleId,
          added_by: user?.id
        }));
        
        const { error: ownersError } = await supabase
          .from('multi_sig_wallet_owners')
          .insert(ownerRecords);
        
        if (ownersError) {
          console.error('⚠️ WARNING: Wallet deployed but failed to insert owner records:', ownersError);
          console.error('Owner records that failed:', ownerRecords);
          // Don't throw - wallet is deployed, owners can be added manually later
          // But log the issue for support
        } else {
          console.log(`✅ Successfully inserted ${ownerUsers.length} owner records`);
        }
      } else {
        console.log('ℹ️ No owner user info provided (manual mode or legacy), skipping multi_sig_wallet_owners insertion');
      }
      
      return {
        id: insertedWallet.id,
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
      
      // Get signer using project wallet (for gas and transaction submission)
      if (!wallet.projectId) {
        throw new Error('Multi-sig wallet must be associated with a project for automated operations');
      }
      
      const signer = await this.getSigner(provider, {
        projectId: wallet.projectId,
        blockchain: wallet.blockchain
      });
      
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
      
      // Update multi_sig_proposals directly with on-chain details
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
      
      // Get signer for the specific owner address
      // This looks up the project wallet that matches the signer's address
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
   * UPDATED: Query directly from multi_sig_proposals (transaction_proposals table removed)
   */
  async getProposalsForWallet(walletId: string): Promise<MultiSigProposal[]> {
    try {
      // Query multi_sig_proposals directly
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
   * Helper: Get signer for multi-sig operations
   * Uses project wallet with WalletEncryptionClient for secure key management
   * Supports both project wallets and specific address signing
   * 
   * @param provider - The JSON RPC provider
   * @param addressOrOptions - Either a specific signer address OR an options object
   * @returns ethers.Signer connected to provider
   * 
   * Usage examples:
   * - getSigner(provider) - throws error, requires context
   * - getSigner(provider, { projectId, blockchain }) - uses project wallet
   * - getSigner(provider, { walletAddress }) - uses specific project wallet
   * - getSigner(provider, signerAddress) - looks up wallet by address (backward compatible)
   */
  private async getSigner(
    provider: ethers.JsonRpcProvider, 
    addressOrOptions?: string | {
      projectId?: string;
      blockchain?: string;
      walletAddress?: string;
    }
  ): Promise<ethers.Signer> {
    try {
      let projectWallet: ProjectWallet;
      
      // Parse parameters - support both old string signature and new options object
      if (typeof addressOrOptions === 'string') {
        // Backward compatible: address provided as string
        // Look up project wallet by address
        const { data, error } = await supabase
          .from('project_wallets')
          .select('id, project_id, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network')
          .eq('wallet_address', addressOrOptions)
          .single();
          
        if (error || !data) {
          throw new Error(`No project wallet found for address ${addressOrOptions}`);
        }
        
        projectWallet = {
          id: data.id,
          projectId: data.project_id,
          projectWalletName: data.project_wallet_name,
          address: data.wallet_address,
          publicKey: data.public_key,
          chainId: data.chain_id,
          nonEvmNetwork: data.non_evm_network,
          bitcoinNetworkType: data.bitcoin_network_type,
          hasDirectKey: !!data.private_key,
          hasVaultKey: !!data.private_key_vault_id,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        
      } else if (addressOrOptions?.walletAddress) {
        // New: specific wallet address provided
        const { data, error } = await supabase
          .from('project_wallets')
          .select('id, project_id, project_wallet_name, wallet_address, public_key, private_key, private_key_vault_id, mnemonic_vault_id, chain_id, non_evm_network, bitcoin_network_type, created_at, updated_at')
          .eq('wallet_address', addressOrOptions.walletAddress)
          .single();
          
        if (error || !data) {
          throw new Error(`No project wallet found for address ${addressOrOptions.walletAddress}`);
        }
        
        projectWallet = {
          id: data.id,
          projectId: data.project_id,
          projectWalletName: data.project_wallet_name,
          address: data.wallet_address,
          publicKey: data.public_key,
          chainId: data.chain_id,
          nonEvmNetwork: data.non_evm_network,
          bitcoinNetworkType: data.bitcoin_network_type,
          hasDirectKey: !!data.private_key,
          hasVaultKey: !!data.private_key_vault_id,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        
      } else if (addressOrOptions?.projectId) {
        // New: project ID (and optionally blockchain) provided
        projectWallet = await this.getProjectWallet(
          addressOrOptions.projectId, 
          addressOrOptions.blockchain
        );
        
      } else {
        // No valid parameters provided
        throw new Error(
          'getSigner requires either:\n' +
          '- { projectId, blockchain } to use a project wallet\n' +
          '- { walletAddress } to use a specific wallet\n' +
          '- address string for backward compatibility'
        );
      }
      
      // Decrypt private key using WalletEncryptionClient (same as deployment)
      const privateKey = await this.getProjectWalletPrivateKey(projectWallet);
      
      // Create ethers.Wallet signer with provider
      const signer = new ethers.Wallet(privateKey, provider);
      
      console.log(`Created signer for address: ${signer.address}`);
      return signer;
      
    } catch (error: any) {
      console.error('Failed to get signer:', error);
      throw new Error(`Failed to get signer: ${error.message}`);
    }
  }
  
  /**
   * Get signer with LocalSigner for advanced signing scenarios
   * Supports hardware wallets, session keys, and multi-chain signing
   * 
   * @param provider - The JSON RPC provider
   * @param options - Advanced signing options
   * @returns ethers.Signer or custom signer for non-EVM chains
   * 
   * Future enhancement: Use for hardware wallet support, session keys, etc.
   */
  private async getAdvancedSigner(
    provider: ethers.JsonRpcProvider,
    options: {
      projectId?: string;
      blockchain?: string;
      walletAddress?: string;
      signingMethod?: 'local' | 'hardware' | 'keyVault' | 'session';
      chainType?: ChainType;
    }
  ): Promise<ethers.Signer> {
    // TODO: Future enhancement for LocalSigner integration
    // This method is a placeholder for when we need:
    // - Hardware wallet support (Ledger, Trezor, MetaMask)
    // - Session key signing
    // - Multi-chain support beyond EVM
    // - KeyVault direct signing
    
    // For now, delegate to standard getSigner
    return await this.getSigner(provider, {
      projectId: options.projectId,
      blockchain: options.blockchain,
      walletAddress: options.walletAddress
    });
    
    // Future implementation example:
    // const localSigner = new LocalSigner();
    // const projectWallet = await this.getProjectWallet(options.projectId!, options.blockchain);
    // const privateKey = await this.getProjectWalletPrivateKey(projectWallet);
    // 
    // if (options.signingMethod === 'hardware') {
    //   await localSigner.connectHardwareWallet(projectWallet.walletAddress, 'metamask');
    //   // Sign with hardware wallet...
    // } else {
    //   const signature = await localSigner.signTransaction(
    //     message, 
    //     projectWallet.walletAddress,
    //     privateKey,
    //     options.chainType || ChainType.ETHEREUM
    //   );
    //   // Convert to ethers.Signer...
    // }
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

    // Get actual owner addresses from multi_sig_wallet_owners table
    const { data: ownersData, error: ownersError } = await supabase
      .from('multi_sig_wallet_owners')
      .select('user_id')
      .eq('wallet_id', walletId);

    if (ownersError) {
      console.error(`Error fetching owners for wallet ${walletId}:`, ownersError);
    }

    // Get actual owner addresses from user_addresses table
    const ownerAddresses: string[] = [];
    if (ownersData && ownersData.length > 0) {
      const userIds = ownersData.map(o => o.user_id).filter(id => id !== null);
      if (userIds.length > 0) {
        // Query user_addresses table matching wallet's blockchain
        const { data: addressesData, error: addressesError } = await supabase
          .from('user_addresses')
          .select('user_id, address, blockchain, is_active')
          .in('user_id', userIds)
          .eq('blockchain', data.blockchain)
          .eq('is_active', true);

        if (!addressesError && addressesData) {
          ownerAddresses.push(...addressesData
            .map(ua => ua.address)
            .filter(addr => addr !== null && addr !== undefined));
        }
      }
    }

    // Return wallet data with accurate owner addresses from user_addresses
    return {
      ...data,
      owners: ownerAddresses
    };
  }

  async getProposal(proposalId: string): Promise<MultiSigProposal> {
    try {
      // Query multi_sig_proposals directly (single source of truth)
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

      // Format data from multi_sig_proposals
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
    // Update signature count directly in multi_sig_proposals
    const signatures = await this.getProposalSignatures(proposalId);
    
    const { error: updateError } = await supabase
      .from('multi_sig_proposals')
      .update({ signatures_collected: signatures.length })
      .eq('id', proposalId);
    
    if (updateError) {
      console.error('Failed to update multi_sig_proposals signature count:', updateError);
      throw updateError;
    }
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
