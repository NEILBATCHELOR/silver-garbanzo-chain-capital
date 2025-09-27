/**
 * Base Rule Processor
 * Abstract class for all rule processors
 */

import type { PolicyRule } from '@/services/rule/enhancedRuleService';
import type { 
  RuleEvaluationContext, 
  RuleResult, 
  ConditionResult,
  PolicyRuleExtended
} from '../types';

export abstract class RuleProcessor {
  protected debug: boolean = false;

  constructor(config?: { debug?: boolean }) {
    if (config?.debug) {
      this.debug = true;
    }
  }

  /**
   * Process a rule and return the evaluation result
   */
  abstract process(
    rule: PolicyRule | PolicyRuleExtended,
    context: RuleEvaluationContext
  ): Promise<RuleResult>;

  /**
   * Build a standardized rule result
   */
  protected buildResult(
    rule: PolicyRule | PolicyRuleExtended,
    conditions: ConditionResult[]
  ): RuleResult {
    const passed = conditions.every(c => c.passed);
    const score = this.calculateScore(conditions);

    return {
      ruleId: rule.id || 'unknown',
      ruleName: rule.name,
      passed,
      score,
      conditions,
      metadata: {
        ruleType: rule.type,
        criticalRule: (rule as PolicyRuleExtended).critical || false,
        weight: (rule as PolicyRuleExtended).weight || 1,
        evaluatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate a score based on conditions
   */
  protected calculateScore(conditions: ConditionResult[]): number {
    if (conditions.length === 0) return 0;
    
    const passedCount = conditions.filter(c => c.passed).length;
    return passedCount / conditions.length;
  }

  /**
   * Log debug information
   */
  protected log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[RuleProcessor] ${message}`, data || '');
    }
  }

  /**
   * Create a condition result
   */
  protected createCondition(
    type: string,
    passed: boolean,
    actual: string | number,
    expected: string | number,
    message?: string
  ): ConditionResult {
    return {
      type,
      passed,
      actual,
      expected,
      message,
      severity: passed ? 'info' : 'error'
    };
  }
}
