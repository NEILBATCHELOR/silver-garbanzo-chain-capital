/**
 * Limit Validator
 * Validates redemption amount limits and percentages
 */

import { supabase } from '@/infrastructure/database/client';
import type { RedemptionRequest, ValidatorResult } from '../types';

export class LimitValidator {
  async validate(request: RedemptionRequest): Promise<ValidatorResult> {
    try {
      // Get redemption rules for this token
      const { data: rules, error } = await supabase
        .from('redemption_rules')
        .select('*')
        .eq('product_id', request.tokenId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return {
          passed: false,
          message: `Error checking redemption limits: ${error.message}`,
          errorCode: 'LIMIT_CHECK_ERROR'
        };
      }

      // If no rules exist, pass validation
      if (!rules) {
        return {
          passed: true,
          message: 'No redemption limits configured',
          metadata: {
            hasLimits: false
          }
        };
      }

      // Check max redemption percentage
      if (rules.max_redemption_percentage) {
        // Get token total supply
        const { data: token, error: tokenError } = await supabase
          .from('tokens')
          .select('total_supply')
          .eq('id', request.tokenId)
          .single();

        if (!tokenError && token) {
          const totalSupply = BigInt(token.total_supply);
          const requestPercentage = Number(request.amount * BigInt(100) / totalSupply);
          
          if (requestPercentage > Number(rules.max_redemption_percentage)) {
            return {
              passed: false,
              message: `Redemption exceeds maximum allowed percentage of ${rules.max_redemption_percentage}%`,
              errorCode: 'EXCEEDS_MAX_PERCENTAGE',
              field: 'amount',
              metadata: {
                requestPercentage: requestPercentage.toString(),
                maxPercentage: rules.max_redemption_percentage.toString(),
                totalSupply: totalSupply.toString()
              }
            };
          }
        }
      }

      return {
        passed: true,
        message: 'Redemption limit validation passed',
        metadata: {
          maxPercentage: rules.max_redemption_percentage
        }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Limit validation error: ${error instanceof Error ? error.message : String(error)}`,
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }
}
