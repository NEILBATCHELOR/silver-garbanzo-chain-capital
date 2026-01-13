/**
 * Token Unblocking Service
 * Handles address unblocking with automatic nonce management
 * Pattern: Exact match with TokenMintingService.ts for consistency
 */

import { ethers } from 'ethers';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import { getChainName, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface UnblockParams {
  contractAddress: string;
  addressToUnblock: string; // Address to unblock
  blockId?: string; // Optional block ID for specific unblock
  reason?: string; // Optional reason for unblocking
  chainId: number;
  walletId: string;
  walletType: 'project' | 'user';
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface UnblockResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: {
    step: string;
    timestamp: number;
    chainId: number;
    nonce: number;
    unblockedAddress: string;
    blockId?: string;
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

export class TokenUnblockingService {
  private static instance: TokenUnblockingService;

  private constructor() {}

  static getInstance(): TokenUnblockingService {
    if (!TokenUnblockingService.instance) {
      TokenUnblockingService.instance = new TokenUnblockingService();
    }
    return TokenUnblockingService.instance;
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

  async executeUnblock(params: UnblockParams): Promise<UnblockResult> {
    try {
      console.log('✅ Starting unblock operation:', {
        contractAddress: params.contractAddress,
        addressToUnblock: params.addressToUnblock,
        blockId: params.blockId,
        chainId: params.chainId,
        reason: params.reason
      });

      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      if (!ethers.isAddress(params.addressToUnblock)) {
        throw new Error('Invalid address to unblock');
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

      console.log(`🔢 Using nonce ${nonce} for unblock`);

      const unblockInterface = new ethers.Interface([
        'function unblockAddress(address account)',
        'function unblockAddress(address account, string reason)',
        'function unblockAddress(uint256 blockId)'
      ]);

      let data: string;
      if (params.blockId) {
        // Unblock by block ID
        data = unblockInterface.encodeFunctionData('unblockAddress(uint256)', [
          params.blockId
        ]);
      } else if (params.reason) {
        // Unblock by address with reason
        data = unblockInterface.encodeFunctionData('unblockAddress(address,string)', [
          params.addressToUnblock,
          params.reason
        ]);
      } else {
        // Simple unblock by address
        data = unblockInterface.encodeFunctionData('unblockAddress(address)', [
          params.addressToUnblock
        ]);
      }

      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '100000',
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

      console.log(`📡 Broadcasting unblock transaction...`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);

      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }

      nonceManager.confirmNonce(wallet.address, nonce);

      console.log(`✅ Unblock confirmed: Block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        diagnostics: {
          step: 'complete',
          timestamp: Date.now(),
          chainId: params.chainId,
          nonce,
          unblockedAddress: params.addressToUnblock,
          blockId: params.blockId,
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
      console.error('✅ Unblock failed:', error);

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
        error: error instanceof Error ? error.message : 'Unblock failed'
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
      recommendations.push('Cancel stuck transactions before unblocking');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenUnblockingService = TokenUnblockingService.getInstance();
