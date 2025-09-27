/**
 * Lock Operation Executor
 * Handles token locking operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class LockExecutor extends BaseOperationExecutor {
  /**
   * Execute lock operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's lock method
      const result = await this.tokenManager.lock(
        request.tokenAddress,
        {
          from: request.parameters.from || '0x0',
          amount: request.parameters.amount?.toString() || '0',
          duration: request.parameters.duration || 0,
          reason: request.parameters.reason || 'Locked'
        },
        request.chain,
        'mainnet' // TODO: Get network type from request
      );
      
      // Map result to TransactionResult format
      // Map status: 'confirmed' -> 'success', 'pending' -> 'pending', 'failed' -> 'failed'
      const mappedStatus = result.status === 'confirmed' ? 'success' : result.status as 'success' | 'failed' | 'pending';
      
      return {
        hash: result.txHash,
        blockNumber: 0,
        status: mappedStatus,
        timestamp: Date.now(),
        metadata: {
          operation: 'lock',
          from: request.parameters.from,
          amount: request.parameters.amount,
          duration: request.parameters.duration,
          reason: request.parameters.reason,
          tokenAddress: request.tokenAddress,
          operationId: result.operationId
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
