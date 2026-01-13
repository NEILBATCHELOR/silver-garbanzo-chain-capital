/**
 * Enhanced Pause Executor
 * Handles both pause and unpause operations with triple-layer security
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { tokenPauseService } from '@/services/wallet/TokenPauseService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { ethers } from 'ethers';

export interface EnhancedPauseExecutorConfig {
  enableFoundryValidation?: boolean;
  foundryConfig?: FoundryExecutorConfig;
  walletConfig?: {
    walletId: string;
    walletType: 'project' | 'user';
  };
}

export class EnhancedPauseExecutor implements OperationExecutor {
  private config: EnhancedPauseExecutorConfig;
  private foundryExecutor?: FoundryOperationExecutor;

  constructor(config: EnhancedPauseExecutorConfig = {}) {
    this.config = config;
    if (config.enableFoundryValidation && config.foundryConfig) {
      this.foundryExecutor = new FoundryOperationExecutor(config.foundryConfig);
    }
  }

  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      const walletType = this.config.walletConfig?.walletType || 'project';

      if (!walletId) {
        throw new Error('Wallet ID required for pause operation');
      }

      // Determine if this is pause or unpause
      const isPause = request.type === 'pause';

      // Check nonce gaps
      const rpcConfig = rpcManager.getProviderConfig(request.chain, 'testnet');
      if (rpcConfig) {
        const provider = new ethers.JsonRpcProvider(rpcConfig.url);
        const nonceStatus = await nonceManager.getNonceStatus(walletId, provider);
        if (nonceStatus.hasGap) {
          console.warn(`⚠️ Nonce gap detected: ${nonceStatus.gapSize} pending transactions`);
        }
      }

      // Optional Foundry validation
      if (this.config.enableFoundryValidation && this.foundryExecutor) {
        const preCheck = await this.foundryExecutor.getPolicyAdapter().canOperate(
          request.tokenAddress,
          walletId,
          {
            type: isPause ? 'pause' : 'unpause',
            metadata: request.metadata
          }
        );

        if (!preCheck.approved) {
          throw new Error(`Foundry on-chain policy check failed: ${preCheck.reason}`);
        }
      }

      // Execute pause/unpause
      const result = await tokenPauseService.executePause({
        contractAddress: request.tokenAddress,
        pause: isPause,
        reason: request.parameters.reason,
        chainId,
        walletId,
        walletType,
        maxFeePerGas: gasEstimate.price?.toString(),
        maxPriorityFeePerGas: gasEstimate.price?.toString()
      });

      if (!result.success) {
        throw new Error(result.error || `${isPause ? 'Pause' : 'Unpause'} failed`);
      }

      return {
        hash: result.transactionHash!,
        blockNumber: result.diagnostics?.rpcVerification?.blockNumber || 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: {
          operation: isPause ? 'pause' : 'unpause',
          tokenAddress: request.tokenAddress,
          nonce: result.diagnostics?.nonce,
          foundryValidated: this.config.enableFoundryValidation || false
        }
      };

    } catch (error: any) {
      return {
        hash: '',
        blockNumber: 0,
        status: 'failed',
        timestamp: Date.now(),
        metadata: {
          error: error.message
        }
      };
    }
  }
}
