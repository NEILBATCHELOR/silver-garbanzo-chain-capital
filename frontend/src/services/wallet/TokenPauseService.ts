/**
 * Token Pause Service - Multi-Standard Support
 * Handles token pause/unpause with automatic nonce management
 * Supports: ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626
 * Pattern: Exact match with TokenMintingService.ts for consistency
 * 
 * Note: pause()/unpause() functions are standard across all pausable contracts
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

// Token Standards
export type TokenStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626';

// Pause Types
export interface PauseParams {
  contractAddress: string; // Token contract address
  pause: boolean; // true = pause, false = unpause
  reason?: string; // Optional reason for pause/unpause
  standard?: TokenStandard; // Optional: for diagnostics
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
  standard?: TokenStandard;
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
   * Detect token standard via ERC-165 (optional for pause operations)
   * @private
   */
  private async detectStandard(
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<TokenStandard> {
    const contract = new ethers.Contract(contractAddress, [
      'function supportsInterface(bytes4 interfaceId) view returns (bool)'
    ], provider);

    try {
      const ERC721_INTERFACE = '0x80ac58cd';
      const ERC1155_INTERFACE = '0xd9b67a26';
      const ERC3525_INTERFACE = '0xd5358140';

      if (await contract.supportsInterface(ERC721_INTERFACE)) {
        return 'ERC-721';
      }
      if (await contract.supportsInterface(ERC1155_INTERFACE)) {
        return 'ERC-1155';
      }
      if (await contract.supportsInterface(ERC3525_INTERFACE)) {
        return 'ERC-3525';
      }

      return 'ERC-20'; // Default
    } catch (error) {
      console.warn('Failed to detect standard, defaulting to ERC-20:', error);
      return 'ERC-20';
    }
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
   * 
   * Note: pause() and unpause() are standard functions across all pausable contracts
   * regardless of token standard (ERC-20, ERC-721, ERC-1155, etc.)
   */
  async executePause(params: PauseParams): Promise<PauseResult> {
    const startTime = Date.now();
    const action = params.pause ? 'pause' : 'unpause';
    
    try {
      // 1. Get provider
      const provider = await this.getProvider(params.chainId);

      // 2. Detect standard if not provided (for diagnostics only)
      const standard = params.standard || await this.detectStandard(params.contractAddress, provider);
      
      console.log(`⏸️  Starting ${action} operation for ${standard}:`, {
        contractAddress: params.contractAddress,
        chainId: params.chainId,
        reason: params.reason
      });

      // 3. Validate parameters
      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      // 4. Get private key
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);

      // 5. Get next nonce (or use forced nonce for replacement)
      const nonce = params.nonce !== undefined
        ? params.nonce
        : await nonceManager.getNextNonce(wallet.address, provider);

      console.log(`🔢 Using nonce ${nonce} for ${action} on ${standard} token`);

      // 6. Encode pause/unpause transaction
      // NOTE: These functions are identical across all pausable token standards
      const pausableInterface = new ethers.Interface([
        'function pause()',
        'function unpause()'
      ]);

      const data = params.pause
        ? pausableInterface.encodeFunctionData('pause', [])
        : pausableInterface.encodeFunctionData('unpause', []);

      // 7. Build transaction
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

      // 8. Sign and send
      console.log(`📡 Broadcasting ${action} transaction for ${standard} token...`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);

      // 9. Wait for confirmation
      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }

      // 10. Mark nonce as confirmed
      nonceManager.confirmNonce(wallet.address, nonce);

      console.log(`✅ ${action} confirmed for ${standard} token: Block ${receipt.blockNumber}`);

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
          standard,
          gasEstimate: {
            gasLimit: receipt.gasUsed.toString(),
            gasPrice: tx.gasPrice?.toString() || tx.maxFeePerGas?.toString() || '0',
            estimatedCost: ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || 0n))
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
