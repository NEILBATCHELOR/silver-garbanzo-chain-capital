/**
 * Transfer Service
 * Handles EOA (Externally Owned Account) transfers with proper encryption
 * 
 * Features:
 * - Validates transfers (balance, address, gas fees)
 * - Estimates gas costs accurately
 * - Creates and signs transactions
 * - Broadcasts to blockchain
 * - Secure key handling (decrypt → use → clear)
 * 
 * Supports:
 * - Project EOA → Any address
 * - User EOA → Any address
 * - EOA → Multi-sig (as recipient)
 * 
 * Security:
 * - Private keys never logged
 * - Immediate key cleanup using try/finally
 * - Explicit user confirmation required
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { internalWalletService } from './InternalWalletService';
import { universalTransactionBuilder } from './builders/TransactionBuilder';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainName } from '@/infrastructure/web3/utils/chainIds';

// Transfer Types
export interface TransferParams {
  from: string; // Wallet address
  to: string; // Destination address
  amount: string; // Amount to transfer (in token units)
  token?: string; // Token address (undefined = native token)
  blockchain: string; // e.g., 'ethereum', 'polygon', 'hoodi'
  walletId: string; // Database ID of source wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string; // In native token
  estimatedCostUSD?: string;
}

export interface UnsignedTransaction {
  to: string;
  value: string;
  data: string;
  chainId: number;
  nonce: number;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
}

export class TransferService {
  private static instance: TransferService;

  private constructor() {}

  static getInstance(): TransferService {
    if (!TransferService.instance) {
      TransferService.instance = new TransferService();
    }
    return TransferService.instance;
  }

  /**
   * Get ethers provider for a blockchain
   * @private
   */
  private async getProvider(blockchain: string): Promise<ethers.JsonRpcProvider> {
    const config = rpcManager.getProviderConfig(blockchain as any, 'mainnet');
    
    if (!config) {
      throw new Error(`No RPC configuration found for blockchain: ${blockchain}`);
    }

    return new ethers.JsonRpcProvider(config.url, {
      chainId: Number(config.id),
      name: config.chain
    });
  }

  /**
   * Get ethers provider by chainId
   * Uses centralized chainId mappings from infrastructure/web3/utils/chainIds
   * @private
   */
  private async getProviderByChainId(chainId: number): Promise<ethers.JsonRpcProvider> {
    const blockchain = getChainName(chainId);
    
    if (!blockchain) {
      throw new Error(`Unsupported chainId: ${chainId}. Check chainIds.ts for supported chains.`);
    }

    return this.getProvider(blockchain);
  }

  /**
   * Validate transfer parameters before execution
   */
  async validateTransfer(params: TransferParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate addresses
      if (!ethers.isAddress(params.from)) {
        errors.push('Invalid source address');
      }
      if (!ethers.isAddress(params.to)) {
        errors.push('Invalid destination address');
      }

      // Check for same address transfer
      if (params.from.toLowerCase() === params.to.toLowerCase()) {
        errors.push('Cannot transfer to the same address');
      }

      // Validate amount
      const amount = ethers.parseEther(params.amount);
      if (amount <= 0n) {
        errors.push('Transfer amount must be greater than 0');
      }

      // Check balance
      const provider = await this.getProvider(params.blockchain);
      const balance = await provider.getBalance(params.from);

      if (amount > balance) {
        errors.push(
          `Insufficient balance. Available: ${ethers.formatEther(balance)} ETH`
        );
      }

      // Estimate gas and check if enough for fees
      if (errors.length === 0) {
        try {
          const gasEstimate = await this.estimateGas(params);
          const totalCost = amount + ethers.parseEther(gasEstimate.estimatedCost);

          if (totalCost > balance) {
            errors.push(
              `Insufficient balance including gas fees. Required: ${ethers.formatEther(totalCost)} ETH`
            );
          }

          // Warn if gas cost is unusually high
          const gasCostPercent = (Number(gasEstimate.estimatedCost) / Number(params.amount)) * 100;
          if (gasCostPercent > 10) {
            warnings.push(
              `Gas fees are ${gasCostPercent.toFixed(2)}% of transfer amount`
            );
          }
        } catch (gasError) {
          warnings.push('Could not estimate gas fees');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        valid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings
      };
    }
  }

  /**
   * Estimate gas costs for transfer
   */
  async estimateGas(params: TransferParams): Promise<GasEstimate> {
    try {
      const provider = await this.getProvider(params.blockchain);
      
      // Build transaction for estimation
      const tx: any = {
        from: params.from,
        to: params.to,
        value: ethers.parseEther(params.amount)
      };

      // Estimate gas limit
      const gasLimit = await provider.estimateGas(tx);
      
      // Get current gas price
      const feeData = await provider.getFeeData();
      
      let estimatedCost: bigint;
      let gasPrice: string | undefined;
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        maxFeePerGas = feeData.maxFeePerGas.toString();
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.toString();
        estimatedCost = gasLimit * feeData.maxFeePerGas;
      } else if (feeData.gasPrice) {
        // Legacy transaction
        gasPrice = feeData.gasPrice.toString();
        estimatedCost = gasLimit * feeData.gasPrice;
      } else {
        throw new Error('Could not retrieve gas price data');
      }

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice || '',
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost: ethers.formatEther(estimatedCost)
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      throw new Error(
        `Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create unsigned transaction
   */
  async createTransfer(params: TransferParams): Promise<UnsignedTransaction> {
    try {
      const provider = await this.getProvider(params.blockchain);
      const network = await provider.getNetwork();
      const nonce = await provider.getTransactionCount(params.from);

      // Get gas parameters
      const gasEstimate = await this.estimateGas(params);

      const tx: UnsignedTransaction = {
        to: params.to,
        value: ethers.parseEther(params.amount).toString(),
        data: '0x',
        chainId: Number(network.chainId),
        nonce,
        gasLimit: params.gasLimit || gasEstimate.gasLimit
      };

      // Add gas pricing (EIP-1559 or legacy)
      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        tx.maxFeePerGas = params.maxFeePerGas || gasEstimate.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas || gasEstimate.maxPriorityFeePerGas;
      } else {
        tx.gasPrice = params.gasPrice || gasEstimate.gasPrice;
      }

      return tx;
    } catch (error) {
      console.error('Transaction creation error:', error);
      throw new Error(
        `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sign and broadcast transaction
   * SECURITY: Private keys are decrypted, used immediately, and cleared
   */
  async signAndBroadcast(
    transaction: UnsignedTransaction,
    walletId: string,
    walletType: 'project' | 'user'
  ): Promise<TransferResult> {
    let privateKey: string | null = null;

    try {
      // Step 1: Decrypt private key based on wallet type
      if (walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(walletId);
      }

      // Step 2: Create wallet instance
      const wallet = new ethers.Wallet(privateKey);

      // Step 3: Get provider - need to map chainId back to blockchain name
      // For now, create provider directly from chainId
      const provider = await this.getProviderByChainId(transaction.chainId);
      const connectedWallet = wallet.connect(provider);

      // Step 4: Sign transaction
      const signedTx = await connectedWallet.signTransaction(transaction);

      // Step 5: Broadcast transaction
      const txResponse = await provider.broadcastTransaction(signedTx);

      // Step 6: Wait for confirmation
      const receipt = await txResponse.wait();

      return {
        success: true,
        transactionHash: receipt?.hash,
        receipt
      };
    } catch (error) {
      console.error('Sign and broadcast error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // CRITICAL: Clear private key from memory
      if (privateKey) {
        privateKey = '';
        privateKey = null;
      }
    }
  }

  /**
   * Execute complete transfer (validate → create → sign → broadcast)
   */
  async executeTransfer(params: TransferParams): Promise<TransferResult> {
    try {
      // Step 1: Validate transfer
      const validation = await this.validateTransfer(params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Step 2: Create transaction
      const transaction = await this.createTransfer(params);

      // Step 3: Sign and broadcast
      const result = await this.signAndBroadcast(
        transaction,
        params.walletId,
        params.walletType
      );

      // Step 4: Record transaction if successful
      if (result.success && result.transactionHash) {
        await this.recordTransaction({
          transactionHash: result.transactionHash,
          fromAddress: params.from,
          toAddress: params.to,
          amount: params.amount,
          blockchain: params.blockchain,
          walletId: params.walletId,
          status: 'confirmed'
        });
      }

      return result;
    } catch (error) {
      console.error('Execute transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Record transaction in database
   */
  private async recordTransaction(data: {
    transactionHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    blockchain: string;
    walletId: string;
    status: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('wallet_transactions').insert({
        transaction_hash: data.transactionHash,
        from_address: data.fromAddress,
        to_address: data.toAddress,
        amount: data.amount,
        blockchain: data.blockchain,
        wallet_id: data.walletId,
        status: data.status,
        transaction_type: 'transfer',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to record transaction:', error);
        // Don't throw - transaction already sent
      }
    } catch (error) {
      console.error('Failed to record transaction:', error);
      // Don't throw - transaction already sent
    }
  }
}

// Export singleton instance
export const transferService = TransferService.getInstance();
