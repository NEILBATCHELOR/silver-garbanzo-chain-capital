/**
 * Burn Operation Executor
 * Handles token burning operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class BurnExecutor extends BaseOperationExecutor {
  /**
   * Execute burn operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's burn method
      const result = await this.tokenManager.burn(
        request.tokenAddress,
        {
          from: request.parameters.from || '0x0', // Placeholder
          amount: request.parameters.amount?.toString() || '0',
          tokenId: request.parameters.tokenId
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
          operation: 'burn',
          burner: request.parameters.from,
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
