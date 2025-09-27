/**
 * Unblock Operation Executor
 * Handles account unblocking (unfreeze) operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class UnblockExecutor extends BaseOperationExecutor {
  /**
   * Execute unblock operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's unblockAccount method
      const result = await this.tokenManager.unblockAccount(
        request.tokenAddress,
        request.parameters.address || '',
        request.parameters.reason || 'Unblocked',
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
          operation: 'unblock',
          address: request.parameters.address,
          blockId: request.parameters.blockId,
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
