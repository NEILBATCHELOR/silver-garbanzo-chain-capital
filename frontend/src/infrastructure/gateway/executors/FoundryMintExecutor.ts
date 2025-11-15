/**
 * Foundry-Enhanced Mint Executor
 * Integrates Gateway, Policy Engine, and Foundry on-chain validation
 */

import type { OperationExecutor, OperationRequest, TransactionResult, GasEstimate } from '../types';
import { FoundryOperationExecutor, type FoundryExecutorConfig } from '@/infrastructure/foundry/FoundryOperationExecutor';

export class FoundryMintExecutor implements OperationExecutor {
  private foundryExecutor: FoundryOperationExecutor;

  constructor(config: FoundryExecutorConfig) {
    this.foundryExecutor = new FoundryOperationExecutor(config);
  }

  /**
   * Execute mint operation with dual-layer validation:
   * 1. Off-chain validation already done by Gateway → PolicyEngine
   * 2. On-chain validation happens in smart contract via PolicyEngine.sol
   */
  async execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    // Foundry executor handles on-chain policy validation automatically
    // via the policyCompliant modifier in PolicyProtectedToken.sol
    return await this.foundryExecutor.executeMint(request, gasEstimate);
  }
}
