/**
 * Token Minting Service
 * Handles ERC-20 token minting with automatic nonce management
 * Pattern: Exact match with TransferService.ts for consistency
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import {
  getChainName,
  getChainId,
  isTestnet,
  getChainInfo,
  type ChainInfo,
} from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Mint Types
export interface MintParams {
  contractAddress: string; // Token contract address
  toAddress: string; // Recipient address
  amount: string; // Amount to mint (in token units, will be converted to wei)
  decimals?: number; // Token decimals (default: 18)
  chainId: number; // Chain ID from wallet data
  walletId: string; // Database ID of minter wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping)
}

export interface MintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MintGasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string;
  estimatedCost: string; // In native token
  estimatedCostUSD?: string;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: MintDiagnostics;
}

export interface MintDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number;
  chainId: number;
  nonce: number;
  gasEstimate?: MintGasEstimate;
  balanceCheck?: {
    balance: string;
    totalCost: string;
    sufficient: boolean;
  };
  rpcVerification?: {
    verified: boolean;
    blockNumber?: number;
    latency?: number;
  };
  mempoolVerification?: {
    found: boolean;
    timestamp?: number;
  };
  note?: string;
}

export class TokenMintingService {
  private static instance: TokenMintingService;

  private constructor() {}

  static getInstance(): TokenMintingService {
    if (!TokenMintingService.instance) {
      TokenMintingService.instance = new TokenMintingService();
    }
    return TokenMintingService.instance;
  }

  /**
   * Get provider from chainId
   * @private
   */
  private async getProviderFromChainId(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${chainId}`);
    }

    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);

    if (!rpcConfig) {
      throw new Error(`No RPC configuration for ${chainName} on ${networkType}`);
    }

    return new ethers.JsonRpcProvider(rpcConfig.url);
  }

  /**
   * Get next available nonce with gap detection
   * @private
   */
  private async getNextNonce(
    address: string,
    provider: ethers.JsonRpcProvider,
    forceNonce?: number
  ): Promise<number> {
    return await nonceManager.getNextNonce(address, provider, {
      forceNonce,
      allowGaps: false, // Never allow gaps
    });
  }

  /**
   * Clear nonce tracking for an address
   * @private
   */
  private clearNonceTracking(address: string): void {
    nonceManager.clearNonceTracking(address);
  }

  /**
   * Diagnose nonce issues for an address
   * PUBLIC method for troubleshooting
   * @public
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    status: any;
    recommendations: string[];
  }> {
    try {
      const provider = await this.getProviderFromChainId(chainId);
      const validation = await nonceManager.getNonceStatus(address, provider);

      const recommendations: string[] = [];

      if (validation.hasGap) {
        recommendations.push(
          `⚠️ Nonce gap detected: ${validation.gapSize} transaction(s) stuck`
        );
        recommendations.push('Recommended: Cancel stuck transactions before batch minting');
        recommendations.push('Option 1: Wait for transactions to confirm');
        recommendations.push('Option 2: Use fee bumping to replace stuck transactions');
      } else {
        recommendations.push('✅ No nonce issues detected');
        recommendations.push('Safe to proceed with minting');
      }

      return {
        hasGap: validation.hasGap,
        status: validation,
        recommendations,
      };
    } catch (error) {
      console.error('Error diagnosing nonce issues:', error);
      throw error;
    }
  }

  /**
   * Validate mint parameters
   * @public
   */
  async validateMint(params: MintParams): Promise<MintValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate contract address
    if (!ethers.isAddress(params.contractAddress)) {
      errors.push('Invalid token contract address');
    }

    // Validate recipient address
    if (!ethers.isAddress(params.toAddress)) {
      errors.push('Invalid recipient address');
    }

    // Validate amount
    try {
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);
      if (amount <= 0n) {
        errors.push('Amount must be greater than 0');
      }
    } catch (error) {
      errors.push('Invalid amount format');
    }

    // Validate chain ID
    const chainName = getChainName(params.chainId);
    if (!chainName) {
      errors.push(`Invalid chain ID: ${params.chainId}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute mint operation with automatic nonce management
   * CRITICAL: Follows exact pattern from TransferService.executeTransfer()
   * @public
   */
  async executeMint(params: MintParams): Promise<MintResult> {
    const diagnostics: MintDiagnostics = {
      step: 'Initializing',
      timestamp: Date.now(),
      chainId: params.chainId,
      nonce: -1,
    };

    try {
      // 1. Validate parameters
      diagnostics.step = 'Validating parameters';
      const validation = await this.validateMint(params);

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          diagnostics,
        };
      }

      // 2. Get provider
      diagnostics.step = 'Getting RPC provider';
      const provider = await this.getProviderFromChainId(params.chainId);

      // 3. Get private key
      diagnostics.step = 'Retrieving wallet credentials';
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const minterAddress = wallet.address;

      // 4. Get next nonce (or use forced nonce for replacement)
      diagnostics.step = 'Getting next nonce';
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(minterAddress, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting with nonce ${nonce} from ${minterAddress}`);

      // 5. Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // 6. Create mint transaction
      diagnostics.step = 'Building mint transaction';

      // ERC-20 mint function interface
      const erc20Interface = new ethers.Interface([
        'function mint(address to, uint256 amount) returns (bool)',
      ]);

      const data = erc20Interface.encodeFunctionData('mint', [params.toAddress, amount]);

      // 7. Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '100000', // Higher default than transfer
      };

      // Add gas pricing
      if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
        // EIP-1559
        tx.maxFeePerGas = params.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
        diagnostics.gasEstimate = {
          gasLimit: tx.gasLimit,
          gasPrice: '0',
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
          estimatedCost: ethers.formatEther(
            BigInt(tx.gasLimit) * BigInt(params.maxFeePerGas)
          ),
        };
      } else if (params.gasPrice) {
        // Legacy
        tx.gasPrice = params.gasPrice;
        diagnostics.gasEstimate = {
          gasLimit: tx.gasLimit,
          gasPrice: params.gasPrice,
          estimatedCost: ethers.formatEther(BigInt(tx.gasLimit) * BigInt(params.gasPrice)),
        };
      } else {
        // Get fee data from network
        const feeData = await provider.getFeeData();
        if (feeData.maxFeePerGas) {
          tx.maxFeePerGas = feeData.maxFeePerGas;
          tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
          diagnostics.gasEstimate = {
            gasLimit: tx.gasLimit,
            gasPrice: '0',
            maxFeePerGas: feeData.maxFeePerGas.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
            baseFeePerGas: feeData.gasPrice?.toString() || '0',
            estimatedCost: ethers.formatEther(BigInt(tx.gasLimit) * feeData.maxFeePerGas),
          };
        } else {
          tx.gasPrice = feeData.gasPrice;
          diagnostics.gasEstimate = {
            gasLimit: tx.gasLimit,
            gasPrice: feeData.gasPrice?.toString() || '0',
            estimatedCost: ethers.formatEther(
              BigInt(tx.gasLimit) * (feeData.gasPrice || 0n)
            ),
          };
        }
      }

      // 8. Check balance
      diagnostics.step = 'Checking balance';
      const balance = await provider.getBalance(minterAddress);
      const estimatedCost = BigInt(tx.gasLimit) * (tx.maxFeePerGas || tx.gasPrice || 0n);

      diagnostics.balanceCheck = {
        balance: ethers.formatEther(balance),
        totalCost: ethers.formatEther(estimatedCost),
        sufficient: balance >= estimatedCost,
      };

      if (balance < estimatedCost) {
        return {
          success: false,
          error: `Insufficient balance for gas. Have: ${ethers.formatEther(
            balance
          )} ETH, Need: ${ethers.formatEther(estimatedCost)} ETH`,
          diagnostics,
        };
      }

      // 9. Sign and broadcast
      diagnostics.step = 'Signing transaction';
      console.log(`🔐 Signing mint transaction with nonce ${nonce}`);

      const signedTx = await wallet.signTransaction(tx);

      diagnostics.step = 'Broadcasting transaction';
      diagnostics.broadcastTimestamp = Date.now();
      console.log(`📡 Broadcasting mint transaction...`);

      const txResponse = await provider.broadcastTransaction(signedTx);

      console.log(`✅ Transaction broadcast: ${txResponse.hash}`);

      // 10. Verify in mempool
      diagnostics.step = 'Verifying mempool';
      try {
        const mempoolTx = await provider.getTransaction(txResponse.hash);
        diagnostics.mempoolVerification = {
          found: !!mempoolTx,
          timestamp: Date.now(),
        };

        if (!mempoolTx) {
          console.warn('⚠️ Transaction not found in mempool immediately');
        }
      } catch (error) {
        console.warn('⚠️ Could not verify mempool:', error);
      }

      // 11. Wait for confirmation
      diagnostics.step = 'Waiting for confirmation';
      console.log(`⏳ Waiting for mint confirmation: ${txResponse.hash}`);

      const receipt = await txResponse.wait(1);

      if (!receipt) {
        this.clearNonceTracking(minterAddress);
        return {
          success: false,
          error: 'Transaction receipt is null',
          transactionHash: txResponse.hash,
          diagnostics,
        };
      }

      if (receipt.status === 0) {
        nonceManager.failNonce(minterAddress, nonce);
        return {
          success: false,
          error: 'Transaction reverted on-chain',
          transactionHash: txResponse.hash,
          receipt,
          diagnostics,
        };
      }

      // 12. Mark nonce as confirmed
      nonceManager.confirmNonce(minterAddress, nonce);

      diagnostics.step = 'Complete';
      diagnostics.rpcVerification = {
        verified: true,
        blockNumber: receipt.blockNumber,
        latency: Date.now() - diagnostics.broadcastTimestamp,
      };

      console.log(
        `✅ Mint confirmed in block ${receipt.blockNumber} (nonce: ${nonce}, gas: ${receipt.gasUsed.toString()})`
      );

      return {
        success: true,
        transactionHash: txResponse.hash,
        receipt,
        diagnostics,
      };
    } catch (error) {
      console.error('❌ Mint failed:', error);

      // Clear nonce tracking on error (unless we used forced nonce)
      if (params.nonce === undefined) {
        try {
          const provider = await this.getProviderFromChainId(params.chainId);
          const privateKey =
            params.walletType === 'project'
              ? await internalWalletService.getProjectWalletPrivateKey(params.walletId)
              : await internalWalletService.getUserWalletPrivateKey(params.walletId);

          const wallet = new ethers.Wallet(privateKey, provider);
          this.clearNonceTracking(wallet.address);
        } catch (clearError) {
          console.error('Error clearing nonce tracking:', clearError);
        }
      }

      diagnostics.step = 'Failed';
      diagnostics.note = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mint failed',
        diagnostics,
      };
    }
  }

  /**
   * Estimate gas for mint operation
   * @public
   */
  async estimateGas(params: MintParams): Promise<MintGasEstimate> {
    try {
      const provider = await this.getProviderFromChainId(params.chainId);

      // Get private key for estimation
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }

      const wallet = new ethers.Wallet(privateKey, provider);

      // Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // Create transaction for estimation
      const erc20Interface = new ethers.Interface([
        'function mint(address to, uint256 amount) returns (bool)',
      ]);

      const data = erc20Interface.encodeFunctionData('mint', [params.toAddress, amount]);

      const tx = {
        from: wallet.address,
        to: params.contractAddress,
        data,
      };

      // Estimate gas limit
      const gasLimit = await provider.estimateGas(tx);

      // Get fee data
      const feeData = await provider.getFeeData();

      if (feeData.maxFeePerGas) {
        // EIP-1559
        return {
          gasLimit: gasLimit.toString(),
          gasPrice: '0',
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
          baseFeePerGas: feeData.gasPrice?.toString() || '0',
          estimatedCost: ethers.formatEther(gasLimit * feeData.maxFeePerGas),
        };
      } else {
        // Legacy
        return {
          gasLimit: gasLimit.toString(),
          gasPrice: feeData.gasPrice?.toString() || '0',
          estimatedCost: ethers.formatEther(gasLimit * (feeData.gasPrice || 0n)),
        };
      }
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }
}

// Singleton export
export const tokenMintingService = TokenMintingService.getInstance();
