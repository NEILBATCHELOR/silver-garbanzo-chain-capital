/**
 * Enhanced Transfer Executor
 * Combines Gateway policy validation + Foundry on-chain validation + Service nonce management
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { transferService } from '@/services/wallet/TransferService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { ethers } from 'ethers';

export interface EnhancedTransferExecutorConfig {
  enableFoundryValidation?: boolean;
  foundryConfig?: FoundryExecutorConfig;
  walletConfig?: {
    walletId: string;
    walletType: 'project' | 'user';
  };
}

export class EnhancedTransferExecutor implements OperationExecutor {
  private config: EnhancedTransferExecutorConfig;
  private foundryExecutor?: FoundryOperationExecutor;

  constructor(config: EnhancedTransferExecutorConfig = {}) {
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
      if (!request.parameters.to) {
        throw new Error('Recipient address required for transfer');
      }

      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      const walletType = this.config.walletConfig?.walletType || 'project';

      if (!walletId) {
        throw new Error('Wallet ID required for transfer');
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
        const preCheck = await this.foundryExecutor.getPolicyAdapter().canOperate(
          request.tokenAddress,
          walletId,
          {
            type: 'transfer',
            amount: request.parameters.amount,
            to: request.parameters.to,
            metadata: request.metadata
          }
        );

        if (!preCheck.approved) {
          throw new Error(`Foundry on-chain policy check failed: ${preCheck.reason}`);
        }
      }

      // Execute transfer
      const result = await transferService.executeTransfer({
        from: walletId,
        to: request.parameters.to,
        amount: request.parameters.amount?.toString() || '0',
        chainId,
        walletId,
        walletType,
        maxFeePerGas: gasEstimate.price?.toString(),
        maxPriorityFeePerGas: gasEstimate.price?.toString()
      });

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      return {
        hash: result.transactionHash!,
        blockNumber: 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: {
          operation: 'transfer',
          recipient: request.parameters.to,
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
          error: error.message
        }
      };
    }
  }
}
