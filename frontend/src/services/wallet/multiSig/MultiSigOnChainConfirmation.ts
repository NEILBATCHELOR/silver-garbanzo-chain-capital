/**
 * Multi-Sig On-Chain Confirmation Service
 * 
 * PURPOSE: Handle on-chain confirmations for multi-sig transactions
 * 
 * This service implements the PURE ON-CHAIN confirmation pattern where:
 * 1. Each owner calls confirmTransaction(txIndex) directly on the smart contract
 * 2. Contract tracks confirmations internally
 * 3. Auto-executes when threshold is met
 * 
 * This replaces off-chain signature collection for the actual blockchain execution.
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import { RealTimeFeeEstimator, FeePriority } from '@/services/blockchain/RealTimeFeeEstimator';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// ============================================================================
// INTERFACES
// ============================================================================

export interface OnChainConfirmationResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface OnChainStatus {
  txIndex: number;
  confirmationsCount: number;
  threshold: number;
  isConfirmedByUser: boolean;
  hasUserConfirmed: boolean;
  canExecute: boolean;
  isExecuted: boolean;
  confirmingOwners: string[];
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigOnChainConfirmation {
  private static instance: MultiSigOnChainConfirmation;

  static getInstance(): MultiSigOnChainConfirmation {
    if (!MultiSigOnChainConfirmation.instance) {
      MultiSigOnChainConfirmation.instance = new MultiSigOnChainConfirmation();
    }
    return MultiSigOnChainConfirmation.instance;
  }

  /**
   * Submit on-chain confirmation for a transaction
   * This calls confirmTransaction(txIndex) on the smart contract
   */
  async confirmTransactionOnChain(
    proposalId: string,
    userAddressId: string
  ): Promise<OnChainConfirmationResult> {
    try {
      // 1. Get proposal with on-chain details
      const { data: proposal, error: proposalError } = await supabase
        .from('multi_sig_proposals')
        .select(`
          *,
          multi_sig_wallets!inner(
            id,
            address,
            blockchain,
            threshold,
            abi
          )
        `)
        .eq('id', proposalId)
        .single();

      if (proposalError || !proposal) {
        throw new Error(`Proposal not found: ${proposalError?.message}`);
      }

      // 2. Check if submitted to contract
      if (!proposal.submitted_on_chain || proposal.on_chain_tx_id === null) {
        throw new Error('Transaction must be submitted to contract before confirmation');
      }

      const onChainTxId = proposal.on_chain_tx_id;

      // 3. Validate blockchain
      const blockchain = proposal.chain_type;
      const validatedChain = validateBlockchain(blockchain);
      
      if (!isEVMChain(validatedChain)) {
        throw new Error(`Multi-sig only supported on EVM chains`);
      }

      const chainId = getChainId(validatedChain);
      if (!chainId) {
        throw new Error(`Cannot resolve chain ID for blockchain: ${validatedChain}`);
      }

      // 4. Get RPC provider - determine network type based on chain ID
      const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
      const config = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!config) {
        throw new Error(`No RPC configuration for blockchain: ${validatedChain} (${networkType})`);
      }

      const provider = new ethers.JsonRpcProvider(config.url, {
        chainId: chainId,
        name: validatedChain
      });

      // 5. Get user's wallet to sign confirmation
      const signerWallet = await this.getUserWallet(userAddressId);
      const wallet = new ethers.Wallet(signerWallet.privateKey, provider);

      // 6. Check user has enough gas
      const balance = await provider.getBalance(wallet.address);
      const estimatedGas = ethers.parseEther('0.005'); // Estimate ~0.005 ETH for gas
      
      if (balance < estimatedGas) {
        throw new Error(
          `Insufficient gas: Wallet has ${ethers.formatEther(balance)} ETH, need at least 0.005 ETH`
        );
      }

      // 7. Create contract instance WITH SIGNER
      const contractAddress = proposal.multi_sig_wallets.address;
      const contractABI = proposal.multi_sig_wallets.abi || this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);

      // 8. Check if user already confirmed on-chain
      const isConfirmed = await contract.isTransactionConfirmed(onChainTxId, wallet.address);
      
      if (isConfirmed) {
        throw new Error('You have already confirmed this transaction on-chain');
      }

      // 9. Estimate gas for confirmation
      const gasEstimate = await contract.confirmTransaction.estimateGas(onChainTxId);

      // 10. Get real-time fee data
      const feeEstimator = RealTimeFeeEstimator.getInstance();
      const feeData = await feeEstimator.getOptimalFeeData(validatedChain, FeePriority.MEDIUM);

      console.log('[MultiSig OnChain] Confirming transaction:', {
        onChainTxId,
        confirmingAddress: wallet.address,
        estimatedGas: gasEstimate.toString()
      });

      // 11. Submit on-chain confirmation
      const tx = await contract.confirmTransaction(onChainTxId, {
        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        ...(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas ? {
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        } : {
          gasPrice: feeData.gasPrice
        })
      });

      console.log('[MultiSig OnChain] Confirmation transaction submitted:', tx.hash);

      // 12. Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      console.log('[MultiSig OnChain] Confirmation confirmed in block:', receipt.blockNumber);

      // 13. Record on-chain confirmation in database
      await supabase
        .from('multi_sig_on_chain_confirmations')
        .insert({
          on_chain_transaction_id: proposal.on_chain_tx_id,
          owner_address: wallet.address,
          confirmation_tx_hash: receipt.hash,
          block_number: receipt.blockNumber,
          timestamp: Math.floor(Date.now() / 1000),
          project_id: proposal.project_id
        });

      // 14. Update confirmation count in on-chain transaction record
      const currentConfirmations = await contract.getConfirmationCount(onChainTxId);
      
      await supabase
        .from('multi_sig_on_chain_transactions')
        .update({
          num_confirmations: Number(currentConfirmations),
          updated_at: new Date().toISOString()
        })
        .eq('on_chain_tx_id', onChainTxId);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('[MultiSig OnChain] Failed to confirm transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get on-chain status for a proposal
   */
  async getOnChainStatus(
    proposalId: string,
    userAddress?: string
  ): Promise<OnChainStatus | null> {
    try {
      // 1. Get proposal
      const { data: proposal, error } = await supabase
        .from('multi_sig_proposals')
        .select(`
          *,
          multi_sig_wallets!inner(
            address,
            blockchain,
            threshold,
            abi
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error || !proposal || !proposal.submitted_on_chain) {
        return null;
      }

      const onChainTxId = proposal.on_chain_tx_id;
      if (onChainTxId === null) {
        return null;
      }

      // 2. Setup provider and contract
      const blockchain = proposal.chain_type;
      const validatedChain = validateBlockchain(blockchain);
      const chainId = getChainId(validatedChain);
      
      // Determine network type based on chain ID
      const networkType: NetworkType = chainId && isTestnet(chainId) ? 'testnet' : 'mainnet';
      const config = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!config) {
        throw new Error(`No RPC configuration for ${validatedChain} (${networkType})`);
      }

      const provider = new ethers.JsonRpcProvider(config.url, { chainId, name: validatedChain });
      const contractABI = proposal.multi_sig_wallets.abi || this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(
        proposal.multi_sig_wallets.address,
        contractABI,
        provider
      );

      // 3. Get on-chain transaction details
      const [to, value, data, executed, numConfirmations] = await contract.getTransaction(onChainTxId);

      // 4. Check if user has confirmed (if userAddress provided)
      let hasUserConfirmed = false;
      if (userAddress) {
        hasUserConfirmed = await contract.isTransactionConfirmed(onChainTxId, userAddress);
      }

      // 5. Get list of confirming owners
      const confirmingOwners = await contract.getConfirmations(onChainTxId);

      return {
        txIndex: onChainTxId,
        confirmationsCount: Number(numConfirmations),
        threshold: proposal.multi_sig_wallets.threshold,
        isConfirmedByUser: hasUserConfirmed,
        hasUserConfirmed,
        canExecute: Number(numConfirmations) >= proposal.multi_sig_wallets.threshold,
        isExecuted: executed,
        confirmingOwners: confirmingOwners.map((addr: string) => addr.toLowerCase())
      };
    } catch (error: any) {
      console.error('[MultiSig OnChain] Failed to get on-chain status:', error);
      return null;
    }
  }

  /**
   * Check if a user's address is an owner of the multi-sig wallet
   */
  async isOwnerAddress(
    walletId: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const { data: wallet, error } = await supabase
        .from('multi_sig_wallets')
        .select('address, blockchain, abi')
        .eq('id', walletId)
        .single();

      if (error || !wallet) {
        return false;
      }

      // Setup provider
      const blockchain = wallet.blockchain;
      const validatedChain = validateBlockchain(blockchain);
      const chainId = getChainId(validatedChain);
      
      // Determine network type based on chain ID
      const networkType: NetworkType = chainId && isTestnet(chainId) ? 'testnet' : 'mainnet';
      const config = rpcManager.getProviderConfig(validatedChain as any, networkType);
      if (!config) {
        return false;
      }

      const provider = new ethers.JsonRpcProvider(config.url, { chainId, name: validatedChain });
      const contractABI = wallet.abi || this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(wallet.address, contractABI, provider);

      // Check if address is owner on-chain
      return await contract.isOwner(userAddress);
    } catch (error) {
      console.error('[MultiSig OnChain] Failed to check owner status:', error);
      return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get user's wallet with private key
   */
  private async getUserWallet(userAddressId: string) {
    const { data: userWallet, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', userAddressId)
      .single();

    if (error || !userWallet) {
      throw new Error(`User wallet not found`);
    }

    // Get private key
    let privateKey: string;

    if (userWallet.encrypted_private_key) {
      const isEncrypted = WalletEncryptionClient.isEncrypted(
        userWallet.encrypted_private_key
      );

      if (isEncrypted) {
        privateKey = await WalletEncryptionClient.decrypt(
          userWallet.encrypted_private_key
        );
      } else {
        privateKey = userWallet.encrypted_private_key;
      }
    } else if (userWallet.key_vault_reference) {
      const { data: vaultKey, error: vaultError } = await supabase
        .from('key_vault_keys')
        .select('encrypted_key')
        .eq('key_id', userWallet.key_vault_reference)
        .single();

      if (vaultError || !vaultKey) {
        throw new Error('Key not found in vault');
      }

      privateKey = await WalletEncryptionClient.decrypt(vaultKey.encrypted_key);
    } else {
      throw new Error('No private key available');
    }

    return {
      address: userWallet.address,
      privateKey
    };
  }

  /**
   * Get default multi-sig ABI
   */
  private getDefaultMultiSigABI() {
    return [
      'function submitTransaction(address destination, uint256 value, bytes data, uint256 expiryHours) public returns (uint256 txIndex)',
      'function confirmTransaction(uint256 txIndex) public',
      'function executeTransaction(uint256 txIndex) public',
      'function revokeConfirmation(uint256 txIndex) public',
      'function getTransaction(uint256 txIndex) public view returns (address to, uint256 value, bytes data, bool executed, uint256 numConfirmations, uint256 createdAt, uint256 expiresAt)',
      'function getConfirmationCount(uint256 txIndex) public view returns (uint256)',
      'function getConfirmations(uint256 txIndex) public view returns (address[])',
      'function isTransactionConfirmed(uint256 txIndex, address owner) public view returns (bool)',
      'function isOwner(address owner) public view returns (bool)',
      'function owners(uint256 index) public view returns (address)',
      'function requiredSignatures() public view returns (uint256)',
      'event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data)',
      'event ConfirmTransaction(address indexed owner, uint256 indexed txIndex)',
      'event RevokeConfirmation(address indexed owner, uint256 indexed txIndex)',
      'event ExecuteTransaction(address indexed owner, uint256 indexed txIndex)'
    ];
  }
}

// Export singleton instance
export const multiSigOnChainConfirmation = MultiSigOnChainConfirmation.getInstance();
