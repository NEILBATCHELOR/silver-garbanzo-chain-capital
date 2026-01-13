/**
 * Enhanced Lock/Unlock/Block/Unblock Executors
 * All use the same pattern with their respective services
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { 
  tokenLockingService, 
  tokenUnlockingService,
  tokenBlockingService,
  tokenUnblockingService,
  nonceManager 
} from '@/services/wallet';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { getChainId } from '@/infrastructure/web3/utils/chainIds';
import { ethers } from 'ethers';

export interface EnhancedExecutorConfig {
  enableFoundryValidation?: boolean;
  foundryConfig?: FoundryExecutorConfig;
  walletConfig?: {
    walletId: string;
    walletType: 'project' | 'user';
  };
}

export class EnhancedLockExecutor implements OperationExecutor {
  private config: EnhancedExecutorConfig;
  private foundryExecutor?: FoundryOperationExecutor;

  constructor(config: EnhancedExecutorConfig = {}) {
    this.config = config;
    if (config.enableFoundryValidation && config.foundryConfig) {
      this.foundryExecutor = new FoundryOperationExecutor(config.foundryConfig);
    }
  }

  async execute(request: OperationRequest, gasEstimate: GasEstimate): Promise<TransactionResult> {
    try {
      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      if (!walletId) throw new Error('Wallet ID required');

      const result = await tokenLockingService.executeLock({
        contractAddress: request.tokenAddress,
        amount: request.parameters.amount?.toString() || '0',
        duration: request.parameters.duration || 0,
        reason: request.parameters.reason,
        chainId,
        walletId,
        walletType: this.config.walletConfig?.walletType || 'project'
      });

      if (!result.success) throw new Error(result.error || 'Lock failed');

      return {
        hash: result.transactionHash!,
        blockNumber: 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: { operation: 'lock', nonce: result.diagnostics?.nonce }
      };
    } catch (error: any) {
      return { hash: '', blockNumber: 0, status: 'failed', timestamp: Date.now(), metadata: { error: error.message } };
    }
  }
}

export class EnhancedUnlockExecutor implements OperationExecutor {
  private config: EnhancedExecutorConfig;

  constructor(config: EnhancedExecutorConfig = {}) {
    this.config = config;
  }

  async execute(request: OperationRequest, gasEstimate: GasEstimate): Promise<TransactionResult> {
    try {
      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      if (!walletId) throw new Error('Wallet ID required');

      const result = await tokenUnlockingService.executeUnlock({
        contractAddress: request.tokenAddress,
        lockId: request.parameters.lockId || '0',
        amount: request.parameters.amount?.toString(),
        chainId,
        walletId,
        walletType: this.config.walletConfig?.walletType || 'project'
      });

      if (!result.success) throw new Error(result.error || 'Unlock failed');

      return {
        hash: result.transactionHash!,
        blockNumber: 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: { operation: 'unlock', nonce: result.diagnostics?.nonce }
      };
    } catch (error: any) {
      return { hash: '', blockNumber: 0, status: 'failed', timestamp: Date.now(), metadata: { error: error.message } };
    }
  }
}

export class EnhancedBlockExecutor implements OperationExecutor {
  private config: EnhancedExecutorConfig;

  constructor(config: EnhancedExecutorConfig = {}) {
    this.config = config;
  }

  async execute(request: OperationRequest, gasEstimate: GasEstimate): Promise<TransactionResult> {
    try {
      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      if (!walletId) throw new Error('Wallet ID required');

      const result = await tokenBlockingService.executeBlock({
        contractAddress: request.tokenAddress,
        addressToBlock: request.parameters.address || request.parameters.to!,
        reason: request.parameters.reason || 'Administrative action',
        chainId,
        walletId,
        walletType: this.config.walletConfig?.walletType || 'project'
      });

      if (!result.success) throw new Error(result.error || 'Block failed');

      return {
        hash: result.transactionHash!,
        blockNumber: 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: { operation: 'block', nonce: result.diagnostics?.nonce }
      };
    } catch (error: any) {
      return { hash: '', blockNumber: 0, status: 'failed', timestamp: Date.now(), metadata: { error: error.message } };
    }
  }
}

export class EnhancedUnblockExecutor implements OperationExecutor {
  private config: EnhancedExecutorConfig;

  constructor(config: EnhancedExecutorConfig = {}) {
    this.config = config;
  }

  async execute(request: OperationRequest, gasEstimate: GasEstimate): Promise<TransactionResult> {
    try {
      const chainId = getChainId(request.chain);
      const walletId = request.parameters.from || this.config.walletConfig?.walletId;
      if (!walletId) throw new Error('Wallet ID required');

      const result = await tokenUnblockingService.executeUnblock({
        contractAddress: request.tokenAddress,
        addressToUnblock: request.parameters.address || request.parameters.to,
        blockId: request.parameters.blockId,
        chainId,
        walletId,
        walletType: this.config.walletConfig?.walletType || 'project'
      });

      if (!result.success) throw new Error(result.error || 'Unblock failed');

      return {
        hash: result.transactionHash!,
        blockNumber: 0,
        status: 'success',
        timestamp: Date.now(),
        confirmations: 1,
        metadata: { operation: 'unblock', nonce: result.diagnostics?.nonce }
      };
    } catch (error: any) {
      return { hash: '', blockNumber: 0, status: 'failed', timestamp: Date.now(), metadata: { error: error.message } };
    }
  }
}
