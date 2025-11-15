/**
 * Balance Validator
 * Validates that the investor has sufficient balance for redemption
 */

import type { RedemptionRequest, ValidatorResult } from '../types';

export class BalanceValidator {
  async validate(request: RedemptionRequest): Promise<ValidatorResult> {
    try {
      const currentBalance = BigInt(request.metadata.currentBalance);
      const availableBalance = BigInt(request.metadata.availableBalance);
      const requestedAmount = request.amount;

      // Check if sufficient total balance
      if (currentBalance < requestedAmount) {
        return {
          passed: false,
          message: `Insufficient balance. Available: ${currentBalance.toString()}, Requested: ${requestedAmount.toString()}`,
          errorCode: 'INSUFFICIENT_BALANCE',
          field: 'amount',
          metadata: {
            currentBalance: currentBalance.toString(),
            requestedAmount: requestedAmount.toString(),
            shortfall: (requestedAmount - currentBalance).toString()
          }
        };
      }

      // Check if sufficient available balance (after locks)
      if (availableBalance < requestedAmount) {
        const lockedAmount = currentBalance - availableBalance;
        return {
          passed: false,
          message: `Insufficient available balance. ${lockedAmount.toString()} tokens are locked.`,
          errorCode: 'TOKENS_LOCKED',
          field: 'amount',
          metadata: {
            availableBalance: availableBalance.toString(),
            lockedAmount: lockedAmount.toString(),
            requestedAmount: requestedAmount.toString()
          }
        };
      }

      return {
        passed: true,
        message: 'Balance validation passed',
        metadata: {
          availableBalance: availableBalance.toString(),
          requestedAmount: requestedAmount.toString()
        }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Balance validation error: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }
}
