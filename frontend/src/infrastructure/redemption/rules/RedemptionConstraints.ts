/**
 * Stage 9: Redemption Constraints
 * Enforces redemption limits and constraints
 */

import { supabase } from '@/infrastructure/database/client';
import type { RedemptionRequest } from '../types';
import type {
  RedemptionConstraints as IRedemptionConstraints,
  ConstraintValidation,
  ConstraintResult,
  Violation
} from './types';

export interface ConstraintsConfig {
  strictMode?: boolean;
  debugMode?: boolean;
}

export class RedemptionConstraints {
  private config: ConstraintsConfig;

  constructor(config: ConstraintsConfig = {}) {
    this.config = {
      strictMode: true,
      debugMode: false,
      ...config
    };
  }

  /**
   * Evaluate all constraints for a redemption request
   */
  async evaluate(request: RedemptionRequest): Promise<ConstraintResult> {
    const violations: Violation[] = [];
    const metadata: Record<string, any> = {};

    try {
      // Load constraints for the project
      const constraints = await this._loadConstraints(request.tokenId);
      metadata.constraintsLoaded = true;

      // 1. Check percentage limit
      if (constraints.maxRedemptionPercentage) {
        const percentageCheck = await this.enforcePercentageLimit(
          request,
          constraints.maxRedemptionPercentage
        );
        metadata.percentageCheck = percentageCheck.metadata;

        if (!percentageCheck.valid) {
          violations.push({
            rule: 'max_percentage',
            message: percentageCheck.message,
            severity: 'critical'
          });
        }
      }

      // 2. Check holding period
      if (constraints.minHoldingPeriod) {
        const holdingCheck = await this.enforceHoldingPeriod(
          request,
          constraints.minHoldingPeriod
        );
        metadata.holdingCheck = holdingCheck.metadata;

        if (!holdingCheck.valid) {
          violations.push({
            rule: 'holding_period',
            message: holdingCheck.message,
            severity: 'critical'
          });
        }
      }

      // 3. Check frequency limits
      if (constraints.maxRedemptionsPerPeriod && constraints.periodDays) {
        const frequencyCheck = await this.enforceFrequencyLimit(
          request,
          constraints.maxRedemptionsPerPeriod,
          constraints.periodDays
        );
        metadata.frequencyCheck = frequencyCheck.metadata;

        if (!frequencyCheck.valid) {
          violations.push({
            rule: 'frequency_limit',
            message: frequencyCheck.message,
            severity: 'warning'
          });
        }
      }

      // 4. Check amount limits
      if (constraints.minRedemptionAmount || constraints.maxRedemptionAmount) {
        const amountCheck = await this.enforceAmountLimits(
          request,
          constraints.minRedemptionAmount,
          constraints.maxRedemptionAmount
        );
        metadata.amountCheck = amountCheck.metadata;

        if (!amountCheck.valid) {
          violations.push({
            rule: 'amount_limits',
            message: amountCheck.message,
            severity: 'critical'
          });
        }
      }

      return {
        satisfied: violations.filter(v => v.severity === 'critical').length === 0,
        violations,
        metadata
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        satisfied: false,
        violations: [{
          rule: 'constraint_evaluation_error',
          message: `Constraint evaluation failed: ${errorMessage}`,
          severity: 'critical'
        }],
        metadata: {
          error: errorMessage
        }
      };
    }
  }

  /**
   * Enforce percentage limit
   */
  async enforcePercentageLimit(
    request: RedemptionRequest,
    limit: number
  ): Promise<ConstraintValidation> {
    try {
      // Get total supply
      const totalSupply = await this.getTotalSupply(request.tokenId);
      
      if (!totalSupply) {
        return {
          valid: false,
          message: 'Cannot determine total supply for percentage calculation',
          metadata: { totalSupply: null }
        };
      }

      // Calculate redemption percentage
      const redemptionPercentage = this.calculateRedemptionPercentage(
        request.amount,
        totalSupply
      );

      // Check against limit
      if (redemptionPercentage > limit) {
        return {
          valid: false,
          message: `Redemption of ${redemptionPercentage.toFixed(2)}% exceeds limit of ${limit}%`,
          metadata: {
            requested: redemptionPercentage,
            limit,
            totalSupply: totalSupply.toString()
          }
        };
      }

      // Check cumulative redemptions in current window
      const cumulativePercentage = await this.getCumulativeRedemptionPercentage(
        request.tokenId,
        request.windowId
      );

      const totalPercentage = cumulativePercentage + redemptionPercentage;

      if (totalPercentage > limit) {
        return {
          valid: false,
          message: `Total redemptions (${totalPercentage.toFixed(2)}%) would exceed window limit of ${limit}%`,
          metadata: {
            current: cumulativePercentage,
            requested: redemptionPercentage,
            total: totalPercentage,
            limit
          }
        };
      }

      return {
        valid: true,
        message: `Percentage limit satisfied (${redemptionPercentage.toFixed(2)}%)`,
        metadata: {
          percentage: redemptionPercentage,
          cumulative: totalPercentage,
          limit
        }
      };

    } catch (error) {
      return {
        valid: false,
        message: `Percentage check error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {}
      };
    }
  }

  /**
   * Enforce holding period
   */
  async enforceHoldingPeriod(
    request: RedemptionRequest,
    requiredDays: number
  ): Promise<ConstraintValidation> {
    try {
      // Get token acquisition history for investor
      const acquisitions = await this.getTokenAcquisitions(
        request.investorId,
        request.tokenId
      );

      if (acquisitions.length === 0) {
        return {
          valid: false,
          message: 'No token acquisition history found',
          metadata: { acquisitions: 0 }
        };
      }

      // Calculate available tokens meeting holding period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - requiredDays);

      let availableAmount = BigInt(0);

      for (const acquisition of acquisitions) {
        if (new Date(acquisition.timestamp) <= cutoffDate) {
          availableAmount += BigInt(acquisition.amount);
        }
      }

      if (availableAmount < request.amount) {
        const shortfall = request.amount - availableAmount;
        
        return {
          valid: false,
          message: `Only ${availableAmount.toString()} tokens meet ${requiredDays}-day holding requirement`,
          metadata: {
            required: request.amount.toString(),
            available: availableAmount.toString(),
            shortfall: shortfall.toString(),
            holdingPeriod: requiredDays
          }
        };
      }

      return {
        valid: true,
        message: `Holding period requirement satisfied (${requiredDays} days)`,
        metadata: {
          availableAmount: availableAmount.toString(),
          holdingPeriod: requiredDays
        }
      };

    } catch (error) {
      return {
        valid: false,
        message: `Holding period check error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {}
      };
    }
  }

  /**
   * Enforce frequency limits
   */
  async enforceFrequencyLimit(
    request: RedemptionRequest,
    maxRedemptions: number,
    periodDays: number
  ): Promise<ConstraintValidation> {
    try {
      // Get redemption count for investor in period
      const count = await this.getRedemptionCount(
        request.investorId,
        request.tokenId,
        periodDays
      );

      if (count >= maxRedemptions) {
        return {
          valid: false,
          message: `Maximum ${maxRedemptions} redemptions per ${periodDays} days exceeded (${count} made)`,
          metadata: {
            count,
            maxRedemptions,
            periodDays
          }
        };
      }

      return {
        valid: true,
        message: `Frequency limit satisfied (${count}/${maxRedemptions})`,
        metadata: {
          count,
          maxRedemptions,
          periodDays
        }
      };

    } catch (error) {
      return {
        valid: false,
        message: `Frequency check error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {}
      };
    }
  }

  /**
   * Enforce amount limits
   */
  async enforceAmountLimits(
    request: RedemptionRequest,
    minAmount?: bigint,
    maxAmount?: bigint
  ): Promise<ConstraintValidation> {
    try {
      if (minAmount && request.amount < minAmount) {
        return {
          valid: false,
          message: `Redemption amount ${request.amount.toString()} below minimum ${minAmount.toString()}`,
          metadata: {
            amount: request.amount.toString(),
            minimum: minAmount.toString()
          }
        };
      }

      if (maxAmount && request.amount > maxAmount) {
        return {
          valid: false,
          message: `Redemption amount ${request.amount.toString()} exceeds maximum ${maxAmount.toString()}`,
          metadata: {
            amount: request.amount.toString(),
            maximum: maxAmount.toString()
          }
        };
      }

      return {
        valid: true,
        message: 'Amount limits satisfied',
        metadata: {
          amount: request.amount.toString(),
          minimum: minAmount?.toString(),
          maximum: maxAmount?.toString()
        }
      };

    } catch (error) {
      return {
        valid: false,
        message: `Amount check error: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {}
      };
    }
  }

  /**
   * Load constraints for a project
   */
  private async _loadConstraints(projectId: string): Promise<IRedemptionConstraints> {
    try {
      const { data, error } = await supabase
        .from('redemption_rules')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !data) {
        // Return default constraints
        return this.getDefaultConstraints();
      }

      return {
        maxRedemptionPercentage: data.max_redemption_percentage,
        minHoldingPeriod: data.lock_up_period,
        maxRedemptionsPerPeriod: null, // Not in current schema
        periodDays: null, // Not in current schema
        minRedemptionAmount: null, // Will come from window
        maxRedemptionAmount: null, // Will come from window
        requiresWindowOpen: !data.allow_continuous_redemption,
        allowContinuousRedemption: data.allow_continuous_redemption
      };

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error loading constraints:', error);
      }
      return this.getDefaultConstraints();
    }
  }

  /**
   * Get default constraints
   */
  private getDefaultConstraints(): IRedemptionConstraints {
    return {
      maxRedemptionPercentage: 10,
      minHoldingPeriod: 90,
      requiresWindowOpen: true,
      allowContinuousRedemption: false
    };
  }

  /**
   * Get total supply for token
   */
  private async getTotalSupply(tokenId: string): Promise<bigint | null> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('total_supply')
        .eq('token_id', tokenId)
        .single();

      if (error || !data || !data.total_supply) {
        return null;
      }

      return BigInt(data.total_supply);

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting total supply:', error);
      }
      return null;
    }
  }

  /**
   * Calculate redemption percentage
   */
  private calculateRedemptionPercentage(amount: bigint, totalSupply: bigint): number {
    return (Number(amount) / Number(totalSupply)) * 100;
  }

  /**
   * Get cumulative redemption percentage for window
   */
  private async getCumulativeRedemptionPercentage(
    tokenId: string,
    windowId?: string
  ): Promise<number> {
    if (!windowId) {
      return 0;
    }

    try {
      // This would query approved redemptions in the window
      // Placeholder for now
      return 0;

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting cumulative percentage:', error);
      }
      return 0;
    }
  }

  /**
   * Get token acquisitions for investor
   */
  private async getTokenAcquisitions(
    investorId: string,
    tokenId: string
  ): Promise<Array<{ amount: string; timestamp: string }>> {
    try {
      // This would query wallet_transactions or token_balances
      // Placeholder for now - return empty array
      return [];

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting acquisitions:', error);
      }
      return [];
    }
  }

  /**
   * Get redemption count for period
   */
  private async getRedemptionCount(
    investorId: string,
    tokenId: string,
    periodDays: number
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      // This would query redemption_requests table
      // Placeholder for now
      return 0;

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error getting redemption count:', error);
      }
      return 0;
    }
  }

  /**
   * Public method to load constraints for a project
   */
  async loadConstraints(projectId: string): Promise<IRedemptionConstraints> {
    return this._loadConstraints(projectId);
  }

  /**
   * Save constraints for a project
   */
  async saveConstraints(
    projectId: string,
    constraints: IRedemptionConstraints
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('redemption_rules')
        .upsert({
          project_id: projectId,
          max_redemption_percentage: constraints.maxRedemptionPercentage,
          lock_up_period: constraints.minHoldingPeriod,
          allow_continuous_redemption: constraints.allowContinuousRedemption,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error saving constraints:', error);
      }
      throw error;
    }
  }
}
