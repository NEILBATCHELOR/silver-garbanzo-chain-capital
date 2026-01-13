/**
 * Token Locking Service
 * Handles token locking with automatic nonce management
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

// Lock Types
export interface LockParams {
  contractAddress: string; // Token contract address
  amount: string; // Amount to lock (in token units)
  decimals?: number; // Token decimals (default: 18)
  duration: number; // Lock duration in seconds
  reason?: string; // Optional reason for lock
  recipient?: string; // Optional recipient (defaults to sender)
  chainId: number; // Chain ID from wallet data
  walletId: string; // Database ID of locker wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping)
}

export interface LockResult {
  success: boolean;
  transactionHash?: string;
  lockId?: string; // Returned lock ID for future unlock
  error?: string;
  receipt?: any;
  diagnostics?: LockDiagnostics;
}

export interface LockDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number;
  chainId: number;
  nonce: number;
  lockId?: string;
  unlockTime?: number;
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

export class TokenLockingService {
  private static instance: TokenLockingService;

  private constructor() {}

  static getInstance(): TokenLockingService {
    if (!TokenLockingService.instance) {
      TokenLockingService.instance = new TokenLockingService();
    }
    return TokenLockingService.instance;
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
   * Execute lock operation with automatic nonce management
   */
  async executeLock(params: LockParams): Promise<LockResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔒 Starting lock operation:', {
        contractAddress: params.contractAddress,
        amount: params.amount,
        duration: params.duration,
        chainId: params.chainId
      });

      // 1. Validate parameters
      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }
      
      const amount = ethers.parseUnits(params.amount, params.decimals || 18);
      if (amount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }

      if (params.duration <= 0) {
        throw new Error('Duration must be greater than 0');
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

      console.log(`🔢 Using nonce ${nonce} for lock`);

      // 5. Encode lock transaction
      const lockInterface = new ethers.Interface([
        'function lock(uint256 amount, uint256 duration)',
        'function lock(uint256 amount, uint256 duration, string reason)',
        'function lockFor(address recipient, uint256 amount, uint256 duration)'
      ]);

      let data: string;
      if (params.recipient && params.recipient !== wallet.address) {
        // Lock for another address
        data = lockInterface.encodeFunctionData('lockFor', [
          params.recipient,
          amount,
          params.duration
        ]);
      } else if (params.reason) {
        // Lock with reason
        data = lockInterface.encodeFunctionData('lock(uint256,uint256,string)', [
          amount,
          params.duration,
          params.reason
        ]);
      } else {
        // Simple lock
        data = lockInterface.encodeFunctionData('lock(uint256,uint256)', [
          amount,
          params.duration
        ]);
      }

      // 6. Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '150000',
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
      console.log(`📡 Broadcasting lock transaction...`);
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

      // 10. Extract lock ID from events (if available)
      let lockId: string | undefined;
      const lockEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = lockInterface.parseLog(log);
          return parsed?.name === 'TokensLocked';
        } catch {
          return false;
        }
      });

      if (lockEvent) {
        const parsed = lockInterface.parseLog(lockEvent);
        lockId = parsed?.args?.lockId?.toString();
      }

      console.log(`✅ Lock confirmed: Block ${receipt.blockNumber}${lockId ? `, Lock ID: ${lockId}` : ''}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        lockId,
        diagnostics: {
          step: 'complete',
          timestamp: Date.now(),
          broadcastTimestamp: Date.now(),
          chainId: params.chainId,
          nonce,
          lockId,
          unlockTime: Math.floor(Date.now() / 1000) + params.duration,
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
      console.error('🔒 Lock failed:', error);

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
        error: error instanceof Error ? error.message : 'Lock failed'
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
      recommendations.push('Cancel stuck transactions before locking');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenLockingService = TokenLockingService.getInstance();
