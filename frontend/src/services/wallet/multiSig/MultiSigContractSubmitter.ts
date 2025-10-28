/**
 * Multi-Sig Contract Submitter Service
 * 
 * CRITICAL SERVICE: Submits approved proposals to blockchain with proper signing
 * 
 * PURPOSE:
 * - Take off-chain approved proposals and submit them to the multi-sig smart contract
 * - Use one of the signer's wallets to pay gas fees
 * - Track on-chain transaction ID and confirmations
 * 
 * WORKFLOW:
 * 1. Get approved proposal with all collected signatures
 * 2. Find a signer's wallet with sufficient gas
 * 3. Create contract instance with proper signer
 * 4. Submit transaction to contract (pays gas)
 * 5. Wait for confirmation and extract transaction index
 * 6. Update database with on-chain details
 */

import { supabase } from '@/infrastructure/database/client';
import { ethers } from 'ethers';
import { rpcManager } from '@/infrastructure/web3/rpc';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { validateBlockchain, isEVMChain } from '@/infrastructure/web3/utils/BlockchainValidator';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { RealTimeFeeEstimator } from '@/services/blockchain/RealTimeFeeEstimator';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ContractSubmissionResult {
  success: boolean;
  onChainTxId?: number;
  transactionHash?: string;
  submittedBy?: string;
  error?: string;
}

export interface SignerWallet {
  address: string;
  privateKey: string;
  balance: bigint;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class MultiSigContractSubmitter {
  private static instance: MultiSigContractSubmitter;

  static getInstance(): MultiSigContractSubmitter {
    if (!MultiSigContractSubmitter.instance) {
      MultiSigContractSubmitter.instance = new MultiSigContractSubmitter();
    }
    return MultiSigContractSubmitter.instance;
  }

  /**
   * Submit approved proposal to multi-sig smart contract
   * CRITICAL: Uses proper wallet signer to pay gas fees
   */
  async submitProposalToContract(
    proposalId: string,
    executorAddressId: string // User wallet ID that will pay gas
  ): Promise<ContractSubmissionResult> {
    try {
      // 1. Get proposal data
      const { data: proposal, error: proposalError } = await supabase
        .from('multi_sig_proposals')
        .select(`
          *,
          multi_sig_wallets!inner(
            id,
            address,
            blockchain,
            threshold
          )
        `)
        .eq('id', proposalId)
        .single();

      if (proposalError || !proposal) {
        throw new Error(`Proposal not found: ${proposalError?.message}`);
      }

      // 2. Check if already submitted
      if (proposal.submitted_on_chain) {
        return {
          success: true,
          onChainTxId: proposal.on_chain_tx_id,
          transactionHash: proposal.on_chain_tx_hash,
          submittedBy: proposal.submitted_by
        };
      }

      // 3. Validate blockchain
      const blockchain = proposal.chain_type;
      const validatedChain = validateBlockchain(blockchain);
      
      if (!isEVMChain(validatedChain)) {
        throw new Error(`Multi-sig only supported on EVM chains. ${validatedChain} is not EVM-compatible.`);
      }

      const chainId = getChainId(validatedChain);
      if (!chainId) {
        throw new Error(`Cannot resolve chain ID for blockchain: ${validatedChain}`);
      }

      // 4. Get RPC provider
      const config = rpcManager.getProviderConfig(validatedChain as any, 'mainnet');
      if (!config) {
        throw new Error(`No RPC configuration for blockchain: ${validatedChain}`);
      }

      const provider = new ethers.JsonRpcProvider(config.url, {
        chainId: chainId,
        name: validatedChain
      });

      // 5. Get executor's wallet to sign transaction
      const signerWallet = await this.getExecutorWallet(executorAddressId);
      const wallet = new ethers.Wallet(signerWallet.privateKey, provider);

      // 6. Check executor has enough gas
      const balance = await provider.getBalance(wallet.address);
      const estimatedGas = ethers.parseEther('0.01'); // Estimate ~0.01 ETH for gas
      
      if (balance < estimatedGas) {
        throw new Error(
          `Insufficient gas: Executor wallet has ${ethers.formatEther(balance)} ETH, need at least 0.01 ETH`
        );
      }

      // 7. Create contract instance WITH SIGNER (critical fix!)
      const contractAddress = proposal.multi_sig_wallets.address;
      const contractABI = this.getDefaultMultiSigABI();
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);

      // 8. Estimate gas for submission
      const rawTx = proposal.raw_transaction;
      const gasEstimate = await contract.submitTransaction.estimateGas(
        rawTx.to,
        rawTx.value,
        rawTx.data || '0x'
      );

      // 9. Get real-time fee data
      const feeEstimator = new RealTimeFeeEstimator(provider, chainId);
      await feeEstimator.initialize();
      const feeData = await feeEstimator.estimateFees('high'); // Use high priority for submissions

      // 10. Submit transaction with proper gas settings
      const tx = await contract.submitTransaction(
        rawTx.to,
        rawTx.value,
        rawTx.data || '0x',
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
          ...(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas ? {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
          } : {
            gasPrice: feeData.gasPrice
          })
        }
      );

      console.log('[MultiSig] Transaction submitted to contract:', tx.hash);

      // 11. Wait for confirmation
      const receipt = await tx.wait(1); // Wait for 1 confirmation

      if (!receipt) {
        throw new Error('Transaction receipt not received');
      }

      console.log('[MultiSig] Transaction confirmed in block:', receipt.blockNumber);

      // 12. Extract transaction index from SubmitTransaction event
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

      console.log('[MultiSig] On-chain transaction ID:', txIndex);

      // 13. Update Layer 2 proposal with on-chain details
      await supabase
        .from('multi_sig_proposals')
        .update({
          on_chain_tx_id: txIndex,
          on_chain_tx_hash: receipt.hash,
          submitted_on_chain: true,
          submitted_by: wallet.address,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId);

      // 14. Create Layer 3 on-chain tracking record
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
          submitted_by: wallet.address,
          project_id: proposal.project_id
        });

      // 15. Update UI proposal status
      const { data: uiProposal } = await supabase
        .from('transaction_proposals')
        .select('id')
        .eq('multi_sig_proposal_id', proposalId)
        .single();

      if (uiProposal) {
        await supabase
          .from('transaction_proposals')
          .update({
            status: 'submitted_to_contract', // New status to indicate on-chain submission
            updated_at: new Date().toISOString()
          })
          .eq('id', uiProposal.id);
      }

      return {
        success: true,
        onChainTxId: txIndex,
        transactionHash: receipt.hash,
        submittedBy: wallet.address
      };
    } catch (error: any) {
      console.error('[MultiSig] Failed to submit to contract:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get executor's wallet with private key for signing
   */
  private async getExecutorWallet(userAddressId: string): Promise<SignerWallet> {
    try {
      // Get user wallet
      const { data: userWallet, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', userAddressId)
        .single();

      if (error || !userWallet) {
        throw new Error(`User wallet not found: ${error?.message}`);
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
        throw new Error('No private key available for wallet');
      }

      return {
        address: userWallet.address,
        privateKey,
        balance: 0n // Will be checked later
      };
    } catch (error: any) {
      console.error('Failed to get executor wallet:', error);
      throw new Error(`Failed to get signing wallet: ${error.message}`);
    }
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
export const multiSigContractSubmitter = MultiSigContractSubmitter.getInstance();
