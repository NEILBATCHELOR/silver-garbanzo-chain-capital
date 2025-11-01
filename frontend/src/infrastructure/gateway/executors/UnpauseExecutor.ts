/**
 * Unpause Operation Executor
 * Handles token unpause operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class UnpauseExecutor extends BaseOperationExecutor {
  /**
   * Execute unpause operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's unpause method
      const result = await this.tokenManager.unpause(
        request.tokenAddress,
        {
          reason: request.parameters.reason || 'Manual unpause operation',
          metadata: request.metadata
        },
        request.chain,
        'mainnet' // TODO: Get network type from request
      );
      
      // Map result to TransactionResult format
      const mappedStatus = result.status === 'confirmed' ? 'success' : result.status as 'success' | 'failed' | 'pending';
      
      return {
        hash: result.txHash,
        blockNumber: 0, // Will be filled when confirmed
        status: mappedStatus,
        timestamp: Date.now(),
        metadata: {
          operation: 'unpause',
          tokenAddress: request.tokenAddress,
          operationId: result.operationId,
          reason: request.parameters.reason
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
