/**
 * Holding Period Validator
 * Validates that tokens have been held for the required minimum period
 */

import { supabase } from '@/infrastructure/database/client';
import type { RedemptionRequest, ValidatorResult } from '../types';

export class HoldingPeriodValidator {
  async validate(request: RedemptionRequest): Promise<ValidatorResult> {
    try {
      // Get redemption rules for holding period
      const { data: rules, error: rulesError } = await supabase
        .from('redemption_rules')
        .select('lock_up_period')
        .eq('product_id', request.tokenId)
        .single();

      if (rulesError && rulesError.code !== 'PGRST116') {
        return {
          passed: false,
          message: `Error checking holding period: ${rulesError.message}`,
          errorCode: 'HOLDING_PERIOD_CHECK_ERROR'
        };
      }

      // If no lock-up period defined, pass validation
      if (!rules || !rules.lock_up_period) {
        return {
          passed: true,
          message: 'No holding period requirement',
          metadata: {
            hasLockUp: false
          }
        };
      }

      // Get investor's token acquisition date
      const { data: transactions, error: txError } = await supabase
        .from('wallet_transactions')
        .select('created_at, amount')
        .eq('to_address', request.metadata.investorWallet)
        .eq('token_address', request.tokenAddress)
        .eq('transaction_type', 'transfer')
        .order('created_at', { ascending: true });

      if (txError) {
        return {
          passed: false,
          message: `Error checking transaction history: ${txError.message}`,
          errorCode: 'TRANSACTION_HISTORY_ERROR'
        };
      }

      if (!transactions || transactions.length === 0) {
        return {
          passed: false,
          message: 'No token acquisition found',
          errorCode: 'NO_ACQUISITION_FOUND'
        };
      }

      // Calculate holding period from first acquisition
      const firstAcquisition = new Date(transactions[0].created_at);
      const now = new Date();
      const holdingDays = Math.floor((now.getTime() - firstAcquisition.getTime()) / (1000 * 60 * 60 * 24));

      if (holdingDays < rules.lock_up_period) {
        const remainingDays = rules.lock_up_period - holdingDays;
        return {
          passed: false,
          message: `Tokens held for ${holdingDays} days. Minimum required: ${rules.lock_up_period} days. ${remainingDays} days remaining.`,
          errorCode: 'HOLDING_PERIOD_NOT_MET',
          field: 'amount',
          metadata: {
            holdingDays: holdingDays.toString(),
            requiredDays: rules.lock_up_period.toString(),
            remainingDays: remainingDays.toString(),
            acquisitionDate: firstAcquisition.toISOString()
          }
        };
      }

      return {
        passed: true,
        message: `Holding period requirement met (${holdingDays} days)`,
        metadata: {
          holdingDays: holdingDays.toString(),
          requiredDays: rules.lock_up_period.toString()
        }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Holding period validation error: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }
}
