/**
 * Mint Operation Executor
 * Handles token minting operations
 */

import { BaseOperationExecutor } from './OperationExecutors';
import type { OperationRequest, TransactionResult, GasEstimate } from '../types';

export class MintExecutor extends BaseOperationExecutor {
  /**
   * Execute mint operation
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    try {
      // Use EnhancedTokenManager's mint method
      const result = await this.tokenManager.mint(
        request.tokenAddress,
        {
          to: request.parameters.to!,
          amount: request.parameters.amount?.toString() || '0',
          tokenId: request.parameters.tokenId,
          metadata: request.metadata
        },
        request.chain,
        'mainnet' // TODO: Get network type from request
      );
      
      // Map result to TransactionResult format
      // Map status: 'confirmed' -> 'success', 'pending' -> 'pending', 'failed' -> 'failed'
      const mappedStatus = result.status === 'confirmed' ? 'success' : result.status as 'success' | 'failed' | 'pending';
      
      return {
        hash: result.txHash,
        blockNumber: 0, // Will be filled when confirmed
        status: mappedStatus,
        timestamp: Date.now(),
        metadata: {
          operation: 'mint',
          recipient: request.parameters.to,
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
