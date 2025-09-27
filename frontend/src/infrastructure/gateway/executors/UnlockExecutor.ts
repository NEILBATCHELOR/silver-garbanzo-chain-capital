/**
 * Unlock Operation Executor
 * Handles token unlocking operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class UnlockExecutor extends BaseOperationExecutor {
  /**
   * Execute unlock operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's unlock method
      const result = await this.tokenManager.unlock(
        request.tokenAddress,
        request.parameters.lockId || '',
        request.parameters.amount?.toString() || '0',
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
          operation: 'unlock',
          lockId: request.parameters.lockId,
          amount: request.parameters.amount,
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
