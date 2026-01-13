/**
 * Enhanced Burn Executor
 * Combines Gateway policy validation + Foundry on-chain validation + Service nonce management
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { tokenBurningService } from '@/services/wallet/TokenBurningService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { ethers } from 'ethers';

export interface EnhancedBurnExecutorConfig {
  enableFoundryValidation?: boolean;
  foundryConfig?: FoundryExecutorConfig;
  walletConfig?: {
    walletId: string;
    walletType: 'project' | 'user';
  };
}

export class EnhancedBurnExecutor implements OperationExecutor {
  private config: EnhancedBurnExecutorConfig;
  private foundryExecutor?: FoundryOperationExecutor;

  constructor(config: EnhancedBurnExecutorConfig = {}) {
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
        throw new Error('Wallet ID required for burn operation');
      }

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
        console.log('🔒 Performing Foundry on-chain policy validation...');
        const preCheck = await this.foundryExecutor.getPolicyAdapter().canOperate(
          request.tokenAddress,
          walletId,
          {
            type: 'burn',
            amount: request.parameters.amount,
            metadata: request.metadata
          }
        );

        if (!preCheck.approved) {
          throw new Error(`Foundry on-chain policy check failed: ${preCheck.reason}`);
        }
        console.log('✅ Foundry on-chain policy check passed');
      }

      // Execute burn
      const result = await tokenBurningService.executeBurn({
        contractAddress: request.tokenAddress,
        amount: request.parameters.amount?.toString() || '0',
        decimals: 18,
        chainId,
        walletId,
        walletType,
        maxFeePerGas: gasEstimate.price?.toString(),
        maxPriorityFeePerGas: gasEstimate.price?.toString()
      });

      if (!result.success) {
        throw new Error(result.error || 'Burn failed');
      }

      return {
        hash: result.transactionHash!,
        blockNumber: result.diagnostics?.rpcVerification?.blockNumber || 0,
        status: 'success',
        timestamp: Date.now(),
        gasUsed: result.diagnostics?.gasEstimate?.gasLimit 
          ? BigInt(result.diagnostics.gasEstimate.gasLimit) 
          : undefined,
        confirmations: 1,
        metadata: {
          operation: 'burn',
          amount: request.parameters.amount,
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
          error: error.message,
          foundryValidated: this.config.enableFoundryValidation || false
        }
      };
    }
  }
}
