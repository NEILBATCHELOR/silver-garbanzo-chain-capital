/**
 * Block Operation Executor
 * Handles account blocking (freeze) operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class BlockExecutor extends BaseOperationExecutor {
  /**
   * Execute block operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's blockAccount method
      const result = await this.tokenManager.blockAccount(
        request.tokenAddress,
        request.parameters.address || '',
        request.parameters.reason || 'Blocked',
        request.chain,
        'mainnet', // TODO: Get network type from request
        request.parameters.duration
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
          operation: 'block',
          address: request.parameters.address,
          reason: request.parameters.reason,
          duration: request.parameters.duration,
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
