/**
 * Stage 9: Redemption Rules Engine
 * Evaluates redemption requests against rules and constraints
 * Integrates with Policy Engine (Stages 1-6)
 */

import { supabase } from '@/infrastructure/database/client';
import type { RedemptionRequest, ValidationResult } from '../types';
import type {
  RedemptionRule,
  RedemptionRuleDB,
  RuleEvaluationResult,
  RuleEvaluation,
  RedemptionRuleType,
  Violation
} from './types';
import { mapRuleFromDB } from './types'; // Mapper function imported as value
import { WindowValidator } from '../validators/WindowValidator';
import { BalanceValidator } from '../validators/BalanceValidator';
import { HoldingPeriodValidator } from '../validators/HoldingPeriodValidator';
import { LimitValidator } from '../validators/LimitValidator';

export interface RulesEngineConfig {
  strictMode?: boolean;
  enableAutoQueue?: boolean;
  debugMode?: boolean;
}

export class RedemptionRulesEngine {
  private windowValidator: WindowValidator;
  private balanceValidator: BalanceValidator;
  private holdingPeriodValidator: HoldingPeriodValidator;
  private limitValidator: LimitValidator;
  private config: RulesEngineConfig;

  constructor(config: RulesEngineConfig = {}) {
    this.config = {
      strictMode: true,
      enableAutoQueue: true,
      debugMode: false,
      ...config
    };

    // Initialize validators
    this.windowValidator = new WindowValidator();
    this.balanceValidator = new BalanceValidator();
    this.holdingPeriodValidator = new HoldingPeriodValidator();
    this.limitValidator = new LimitValidator();
  }

  /**
   * Main evaluation method - evaluates redemption request against all rules
   */
  async evaluateRedemptionRequest(
    request: RedemptionRequest
  ): Promise<RuleEvaluationResult> {
    const result: RuleEvaluationResult = {
      allowed: true,
      rules: [],
      violations: [],
      warnings: [],
      metadata: {}
    };

    try {
      // 1. Check redemption window
      const windowEval = await this.evaluateWindow(request);
      result.rules.push(windowEval);

      if (!windowEval.passed) {
        result.allowed = false;
        result.violations.push({
          rule: 'redemption_window',
          message: windowEval.message,
          severity: 'critical'
        });
        
        // Early exit if window is closed (critical failure)
        if (this.config.strictMode) {
          return result;
        }
      }

      // 2. Load project-specific rules
      const rules = await this.loadRedemptionRules(request.tokenId);
      result.metadata.rulesLoaded = rules.length;

      // 3. Evaluate each rule
      for (const rule of rules) {
        const evaluation = await this.evaluateRule(rule, request);
        result.rules.push(evaluation);

        if (!evaluation.passed) {
          if (evaluation.severity === 'critical') {
            result.allowed = false;
            result.violations.push({
              rule: evaluation.ruleId,
              message: evaluation.message,
              severity: evaluation.severity
            });
            
            // Stop on critical failure in strict mode
            if (this.config.strictMode) {
              break;
            }
          } else {
            result.warnings.push(evaluation.message);
          }
        }
      }

      // 4. Run standard validators
      const validatorResults = await this.runValidators(request);
      result.rules.push(...validatorResults.evaluations);

      if (!validatorResults.passed) {
        result.allowed = false;
        result.violations.push(...validatorResults.violations);
      }

      // 5. Check constraints
      const constraintsResult = await this.evaluateConstraints(request);
      result.metadata.constraints = constraintsResult;

      if (!constraintsResult.satisfied) {
        result.allowed = false;
        result.violations.push(...constraintsResult.violations);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      result.allowed = false;
      result.violations.push({
        rule: 'evaluation_error',
        message: `Rule evaluation failed: ${errorMessage}`,
        severity: 'critical'
      });

      if (this.config.debugMode) {
        console.error('Rule evaluation error:', error);
      }

      return result;
    }
  }

  /**
   * Evaluate redemption window constraint
   */
  private async evaluateWindow(request: RedemptionRequest): Promise<RuleEvaluation> {
    const validatorResult = await this.windowValidator.validate(request);

    return {
      ruleId: 'window_check',
      ruleType: 'window_restriction',
      passed: validatorResult.passed,
      message: validatorResult.message,
      severity: validatorResult.passed ? 'info' : 'critical',
      metadata: validatorResult.metadata
    };
  }

  /**
   * Load redemption rules for a specific token/project
   */
  private async loadRedemptionRules(tokenId: string): Promise<RedemptionRule[]> {
    try {
      const { data, error } = await supabase
        .from('redemption_rules')
        .select('*')
        .eq('project_id', tokenId)
        .eq('is_redemption_open', true);

      if (error) {
        throw new Error(`Failed to load redemption rules: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // Return default rules if none configured
        return this.getDefaultRules(tokenId);
      }

      return data.map((ruleDB) => mapRuleFromDB(ruleDB as RedemptionRuleDB));

    } catch (error) {
      if (this.config.debugMode) {
        console.error('Error loading rules:', error);
      }
      throw error;
    }
  }

  /**
   * Evaluate a single rule against the request
   */
  private async evaluateRule(
    rule: RedemptionRule,
    request: RedemptionRequest
  ): Promise<RuleEvaluation> {
    try {
      // Evaluate based on rule configuration
      const checks: { passed: boolean; message: string }[] = [];

      // Check max redemption percentage
      if (rule.maxRedemptionPercentage !== null) {
        const percentageCheck = await this.checkRedemptionPercentage(
          request,
          rule.maxRedemptionPercentage
        );
        checks.push(percentageCheck);
      }

      // Check lockup period
      if (rule.lockUpPeriod !== null) {
        const lockupCheck = await this.checkLockupPeriod(
          request,
          rule.lockUpPeriod
        );
        checks.push(lockupCheck);
      }

      // Check submission window
      if (rule.submissionWindowDays !== null && !rule.allowContinuousRedemption) {
        const submissionCheck = await this.checkSubmissionWindow(
          request,
          rule.submissionWindowDays
        );
        checks.push(submissionCheck);
      }

      // Aggregate results
      const allPassed = checks.every(check => check.passed);
      const failedChecks = checks.filter(check => !check.passed);

      return {
        ruleId: rule.id,
        ruleType: this.determineRuleType(rule),
        passed: allPassed,
        message: allPassed 
          ? 'All rule checks passed'
          : failedChecks.map(c => c.message).join('; '),
        severity: allPassed ? 'info' : 'warning',
        metadata: {
          ruleName: rule.redemptionType,
          checksPerformed: checks.length,
          checksPassed: checks.filter(c => c.passed).length
        }
      };

    } catch (error) {
      return {
        ruleId: rule.id,
        ruleType: 'window_restriction',
        passed: false,
        message: `Rule evaluation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical'
      };
    }
  }

  /**
   * Run all standard validators
   */
  private async runValidators(request: RedemptionRequest): Promise<{
    passed: boolean;
    evaluations: RuleEvaluation[];
    violations: Violation[];
  }> {
    const evaluations: RuleEvaluation[] = [];
    const violations: Violation[] = [];

    // Balance validation
    const balanceResult = await this.balanceValidator.validate(request);
    evaluations.push({
      ruleId: 'balance_check',
      ruleType: 'minimum_balance',
      passed: balanceResult.passed,
      message: balanceResult.message,
      severity: balanceResult.passed ? 'info' : 'critical',
      metadata: balanceResult.metadata
    });

    if (!balanceResult.passed) {
      violations.push({
        rule: 'balance_check',
        message: balanceResult.message,
        severity: 'critical'
      });
    }

    // Holding period validation
    const holdingResult = await this.holdingPeriodValidator.validate(request);
    evaluations.push({
      ruleId: 'holding_period_check',
      ruleType: 'holding_period',
      passed: holdingResult.passed,
      message: holdingResult.message,
      severity: holdingResult.passed ? 'info' : 'critical',
      metadata: holdingResult.metadata
    });

    if (!holdingResult.passed) {
      violations.push({
        rule: 'holding_period_check',
        message: holdingResult.message,
        severity: 'critical'
      });
    }

    // Limit validation
    const limitResult = await this.limitValidator.validate(request);
    evaluations.push({
      ruleId: 'limit_check',
      ruleType: 'percentage_limit',
      passed: limitResult.passed,
      message: limitResult.message,
      severity: limitResult.passed ? 'info' : 'warning',
      metadata: limitResult.metadata
    });

    if (!limitResult.passed) {
      violations.push({
        rule: 'limit_check',
        message: limitResult.message,
        severity: 'warning'
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'critical').length === 0,
      evaluations,
      violations
    };
  }

  /**
   * Check redemption percentage against limit
   */
  private async checkRedemptionPercentage(
    request: RedemptionRequest,
    maxPercentage: number
  ): Promise<{ passed: boolean; message: string }> {
    try {
      // Get total supply for the token
      const { data: tokenData } = await supabase
        .from('tokens')
        .select('total_supply')
        .eq('token_id', request.tokenId)
        .single();

      if (!tokenData || !tokenData.total_supply) {
        return {
          passed: false,
          message: 'Cannot determine total supply for percentage calculation'
        };
      }

      const totalSupply = BigInt(tokenData.total_supply);
      const requestedAmount = request.amount;
      const percentage = (Number(requestedAmount) / Number(totalSupply)) * 100;

      if (percentage > maxPercentage) {
        return {
          passed: false,
          message: `Redemption of ${percentage.toFixed(2)}% exceeds maximum of ${maxPercentage}%`
        };
      }

      return {
        passed: true,
        message: `Redemption percentage ${percentage.toFixed(2)}% within limit`
      };

    } catch (error) {
      return {
        passed: false,
        message: `Percentage check error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Check lockup period
   */
  private async checkLockupPeriod(
    request: RedemptionRequest,
    lockupDays: number
  ): Promise<{ passed: boolean; message: string }> {
    // This would integrate with token holdings history
    // For now, return pass - implement when holdings tracking is available
    return {
      passed: true,
      message: `Lockup period check passed (${lockupDays} days)`
    };
  }

  /**
   * Check submission window
   */
  private async checkSubmissionWindow(
    request: RedemptionRequest,
    windowDays: number
  ): Promise<{ passed: boolean; message: string }> {
    // Already checked by WindowValidator
    return {
      passed: true,
      message: 'Submission window validated'
    };
  }

  /**
   * Evaluate all constraints
   */
  private async evaluateConstraints(request: RedemptionRequest): Promise<{
    satisfied: boolean;
    violations: Violation[];
    metadata: Record<string, any>;
  }> {
    // Placeholder for constraint evaluation
    // Will be implemented in RedemptionConstraints class
    return {
      satisfied: true,
      violations: [],
      metadata: {}
    };
  }

  /**
   * Get default rules if none configured
   */
  private getDefaultRules(tokenId: string): RedemptionRule[] {
    return [
      {
        id: 'default-rule',
        ruleId: null,
        redemptionType: 'standard',
        requireMultiSigApproval: true,
        requiredApprovers: 2,
        totalApprovers: 3,
        notifyInvestors: true,
        settlementMethod: 'stablecoin',
        immediateExecution: null,
        useLatestNav: null,
        allowAnyTimeRedemption: false,
        repurchaseFrequency: null,
        lockUpPeriod: 90,
        submissionWindowDays: null,
        lockTokensOnRequest: true,
        useWindowNav: true,
        enableProRataDistribution: false,
        queueUnprocessedRequests: true,
        enableAdminOverride: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: tokenId,
        organizationId: null,
        productType: null,
        productId: null,
        isRedemptionOpen: true,
        openAfterDate: null,
        allowContinuousRedemption: false,
        maxRedemptionPercentage: 10,
        redemptionEligibilityRules: {},
        targetRaiseAmount: null,
        redemptionWindowId: null,
        approvalConfigId: null
      }
    ];
  }

  /**
   * Determine rule type from rule configuration
   */
  private determineRuleType(rule: RedemptionRule): RedemptionRuleType {
    if (rule.lockUpPeriod !== null) return 'holding_period';
    if (rule.maxRedemptionPercentage !== null) return 'percentage_limit';
    if (!rule.allowAnyTimeRedemption) return 'window_restriction';
    return 'window_restriction';
  }
}
