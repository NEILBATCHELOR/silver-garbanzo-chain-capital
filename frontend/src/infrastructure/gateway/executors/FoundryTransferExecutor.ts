/**
 * Foundry-Enhanced Transfer Executor
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';

export class FoundryTransferExecutor implements OperationExecutor {
  private foundryExecutor: FoundryOperationExecutor;

  constructor(config: FoundryExecutorConfig) {
    this.foundryExecutor = new FoundryOperationExecutor(config);
  }

  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    return await this.foundryExecutor.executeTransfer(request, gasEstimate);
  }
}
