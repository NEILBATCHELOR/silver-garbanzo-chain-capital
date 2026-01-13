/**
 * Token Blocking Service
 * Handles address blocking with automatic nonce management
 * Pattern: Exact match with TokenMintingService.ts for consistency
 */

import { ethers } from 'ethers';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import { getChainName, isTestnet } from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface BlockParams {
  contractAddress: string;
  addressToBlock: string; // Address to block
  reason?: string; // Optional reason for blocking
  chainId: number;
  walletId: string;
  walletType: 'project' | 'user';
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface BlockResult {
  success: boolean;
  transactionHash?: string;
  blockId?: string; // Returned block ID for future unblock
  error?: string;
  receipt?: any;
  diagnostics?: {
    step: string;
    timestamp: number;
    chainId: number;
    nonce: number;
    blockedAddress: string;
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

export class TokenBlockingService {
  private static instance: TokenBlockingService;

  private constructor() {}

  static getInstance(): TokenBlockingService {
    if (!TokenBlockingService.instance) {
      TokenBlockingService.instance = new TokenBlockingService();
    }
    return TokenBlockingService.instance;
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

  async executeBlock(params: BlockParams): Promise<BlockResult> {
    try {
      console.log('🚫 Starting block operation:', {
        contractAddress: params.contractAddress,
        addressToBlock: params.addressToBlock,
        chainId: params.chainId,
        reason: params.reason
      });

      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      if (!ethers.isAddress(params.addressToBlock)) {
        throw new Error('Invalid address to block');
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

      console.log(`🔢 Using nonce ${nonce} for block`);

      const blockInterface = new ethers.Interface([
        'function blockAddress(address account)',
        'function blockAddress(address account, string reason)'
      ]);

      let data: string;
      if (params.reason) {
        data = blockInterface.encodeFunctionData('blockAddress(address,string)', [
          params.addressToBlock,
          params.reason
        ]);
      } else {
        data = blockInterface.encodeFunctionData('blockAddress(address)', [
          params.addressToBlock
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

      console.log(`📡 Broadcasting block transaction...`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);

      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }

      nonceManager.confirmNonce(wallet.address, nonce);

      // Extract block ID from events (if available)
      let blockId: string | undefined;
      const blockEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = blockInterface.parseLog(log);
          return parsed?.name === 'AddressBlocked';
        } catch {
          return false;
        }
      });

      if (blockEvent) {
        const parsed = blockInterface.parseLog(blockEvent);
        blockId = parsed?.args?.blockId?.toString();
      }

      console.log(`✅ Block confirmed: Block ${receipt.blockNumber}${blockId ? `, Block ID: ${blockId}` : ''}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        blockId,
        diagnostics: {
          step: 'complete',
          timestamp: Date.now(),
          chainId: params.chainId,
          nonce,
          blockedAddress: params.addressToBlock,
          blockId,
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
      console.error('🚫 Block failed:', error);

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
        error: error instanceof Error ? error.message : 'Block failed'
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
      recommendations.push('Cancel stuck transactions before blocking');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenBlockingService = TokenBlockingService.getInstance();
