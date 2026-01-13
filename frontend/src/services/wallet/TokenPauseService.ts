/**
 * Token Pause Service
 * Handles token pause/unpause with automatic nonce management
 * Pattern: Exact match with TokenMintingService.ts for consistency
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import {
  getChainName,
  isTestnet,
} from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Pause Types
export interface PauseParams {
  contractAddress: string; // Token contract address
  pause: boolean; // true = pause, false = unpause
  reason?: string; // Optional reason for pause/unpause
  chainId: number; // Chain ID from wallet data
  walletId: string; // Database ID of admin wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping)
}

export interface PauseResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: PauseDiagnostics;
}

export interface PauseDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number;
  chainId: number;
  nonce: number;
  action: 'pause' | 'unpause';
  gasEstimate?: {
    gasLimit: string;
    gasPrice: string;
    estimatedCost: string;
  };
  rpcVerification?: {
    verified: boolean;
    blockNumber?: number;
    latency?: number;
  };
  note?: string;
}

export class TokenPauseService {
  private static instance: TokenPauseService;

  private constructor() {}

  static getInstance(): TokenPauseService {
    if (!TokenPauseService.instance) {
      TokenPauseService.instance = new TokenPauseService();
    }
    return TokenPauseService.instance;
  }

  /**
   * Get provider from chainId
   * @private
   */
  private async getProvider(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);
    
    if (!rpcConfig) {
      throw new Error(`No RPC configuration found for chain ${chainId}`);
    }
    
    return new ethers.JsonRpcProvider(rpcConfig.url);
  }

  /**
   * Execute pause/unpause operation with automatic nonce management
   */
  async executePause(params: PauseParams): Promise<PauseResult> {
    const startTime = Date.now();
    const action = params.pause ? 'pause' : 'unpause';
    
    try {
      console.log(`⏸️  Starting ${action} operation:`, {
        contractAddress: params.contractAddress,
        chainId: params.chainId,
        reason: params.reason
      });

      // 1. Validate parameters
      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      // 2. Get provider
      const provider = await this.getProvider(params.chainId);

      // 3. Get private key
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);

      // 4. Get next nonce (or use forced nonce for replacement)
      const nonce = params.nonce !== undefined
        ? params.nonce
        : await nonceManager.getNextNonce(wallet.address, provider);

      console.log(`🔢 Using nonce ${nonce} for ${action}`);

      // 5. Encode pause/unpause transaction
      const pausableInterface = new ethers.Interface([
        'function pause()',
        'function unpause()'
      ]);

      const data = params.pause
        ? pausableInterface.encodeFunctionData('pause', [])
        : pausableInterface.encodeFunctionData('unpause', []);

      // 6. Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '80000',
      };

      // Add gas pricing
      if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
        tx.maxFeePerGas = params.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
      } else {
        const feeData = await provider.getFeeData();
        if (feeData.maxFeePerGas) {
          tx.maxFeePerGas = feeData.maxFeePerGas;
          tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          tx.gasPrice = feeData.gasPrice;
        }
      }

      // 7. Sign and send
      console.log(`📡 Broadcasting ${action} transaction...`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);

      // 8. Wait for confirmation
      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }

      // 9. Mark nonce as confirmed
      nonceManager.confirmNonce(wallet.address, nonce);

      console.log(`✅ ${action} confirmed: Block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        diagnostics: {
          step: 'complete',
          timestamp: Date.now(),
          broadcastTimestamp: Date.now(),
          chainId: params.chainId,
          nonce,
          action,
          gasEstimate: {
            gasLimit: receipt.gasUsed.toString(),
            gasPrice: tx.gasPrice?.toString() || tx.maxFeePerGas?.toString() || '0',
            estimatedCost: (receipt.gasUsed * (tx.gasPrice || tx.maxFeePerGas || 0n)).toString()
          },
          rpcVerification: {
            verified: true,
            blockNumber: receipt.blockNumber,
            latency: Date.now() - startTime
          }
        }
      };

    } catch (error) {
      console.error(`⏸️  ${action} failed:`, error);

      // Clear nonce tracking on error
      if (params.nonce === undefined) {
        const provider = await this.getProvider(params.chainId);
        const privateKey = params.walletType === 'project'
          ? await internalWalletService.getProjectWalletPrivateKey(params.walletId)
          : await internalWalletService.getUserWalletPrivateKey(params.walletId);
        const wallet = new ethers.Wallet(privateKey, provider);
        nonceManager.clearNonceTracking(wallet.address);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : `${action} failed`
      };
    }
  }

  /**
   * Diagnose nonce issues
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    recommendations: string[];
  }> {
    const provider = await this.getProvider(chainId);
    const status = await nonceManager.getNonceStatus(address, provider);

    const recommendations: string[] = [];

    if (status.hasGap) {
      recommendations.push(`⚠️ ${status.gapSize} stuck transaction(s) detected`);
      recommendations.push('Cancel stuck transactions first');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenPauseService = TokenPauseService.getInstance();
