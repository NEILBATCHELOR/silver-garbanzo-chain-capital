/**
 * Transfer Operation Executor
 * Handles token transfer operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class TransferExecutor extends BaseOperationExecutor {
  /**
   * Execute transfer operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's transferTokens method
      const result = await this.tokenManager.transferTokens(
        request.tokenAddress,
        {
          from: request.parameters.from || '0x0',
          to: request.parameters.to!,
          amount: request.parameters.amount?.toString() || '0',
          tokenId: request.parameters.tokenId,
          data: request.parameters.data
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
          operation: 'transfer',
          from: request.parameters.from,
          to: request.parameters.to,
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
