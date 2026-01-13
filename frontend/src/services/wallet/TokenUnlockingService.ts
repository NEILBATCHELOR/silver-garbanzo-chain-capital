/**
 * Token Unlocking Service
 * Handles token unlocking with automatic nonce management
 * Pattern: Exact match with TokenMintingService.ts for consistency
 */

import { ethers } from 'ethers';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import { getChainName, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface UnlockParams {
  contractAddress: string;
  lockId: string; // Lock ID to unlock
  amount?: string; // Optional partial unlock amount
  decimals?: number;
  chainId: number;
  walletId: string;
  walletType: 'project' | 'user';
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface UnlockResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: {
    step: string;
    timestamp: number;
    chainId: number;
    nonce: number;
    lockId: string;
    gasEstimate?: {
      gasLimit: string;
      gasPrice: string;
      estimatedCost: string;
    };
    rpcVerification?: {
      verified: boolean;
      blockNumber?: number;
    };
  };
}

export class TokenUnlockingService {
  private static instance: TokenUnlockingService;

  private constructor() {}

  static getInstance(): TokenUnlockingService {
    if (!TokenUnlockingService.instance) {
      TokenUnlockingService.instance = new TokenUnlockingService();
    }
    return TokenUnlockingService.instance;
  }

  private async getProvider(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);
    
    if (!rpcConfig) {
      throw new Error(`No RPC configuration found for chain ${chainId}`);
    }
    
    return new ethers.JsonRpcProvider(rpcConfig.url);
  }

  async executeUnlock(params: UnlockParams): Promise<UnlockResult> {
    try {
      console.log('🔓 Starting unlock operation:', {
        contractAddress: params.contractAddress,
        lockId: params.lockId,
        chainId: params.chainId
      });

      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      const provider = await this.getProvider(params.chainId);

      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);

      const nonce = params.nonce !== undefined
        ? params.nonce
        : await nonceManager.getNextNonce(wallet.address, provider);

      console.log(`🔢 Using nonce ${nonce} for unlock`);

      const unlockInterface = new ethers.Interface([
        'function unlock(uint256 lockId)',
        'function unlock(uint256 lockId, uint256 amount)'
      ]);

      let data: string;
      if (params.amount) {
        const amount = ethers.parseUnits(params.amount, params.decimals || 18);
        data = unlockInterface.encodeFunctionData('unlock(uint256,uint256)', [
          params.lockId,
          amount
        ]);
      } else {
        data = unlockInterface.encodeFunctionData('unlock(uint256)', [params.lockId]);
      }

      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '120000',
      };

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

      console.log(`📡 Broadcasting unlock transaction...`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);

      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }

      nonceManager.confirmNonce(wallet.address, nonce);

      console.log(`✅ Unlock confirmed: Block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        diagnostics: {
          step: 'complete',
          timestamp: Date.now(),
          chainId: params.chainId,
          nonce,
          lockId: params.lockId,
          gasEstimate: {
            gasLimit: receipt.gasUsed.toString(),
            gasPrice: tx.gasPrice?.toString() || tx.maxFeePerGas?.toString() || '0',
            estimatedCost: (receipt.gasUsed * (tx.gasPrice || tx.maxFeePerGas || 0n)).toString()
          },
          rpcVerification: {
            verified: true,
            blockNumber: receipt.blockNumber
          }
        }
      };

    } catch (error) {
      console.error('🔓 Unlock failed:', error);

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
        error: error instanceof Error ? error.message : 'Unlock failed'
      };
    }
  }

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
      recommendations.push('Cancel stuck transactions before unlocking');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenUnlockingService = TokenUnlockingService.getInstance();
