/**
 * Priority Resolver
 * Resolves conflicts based on rule priority and weight
 */

import type { RuleResult } from '../types';

export interface PriorityConfig {
  defaultPriority?: number;
  criticalWeight?: number;
  priorityWeights?: {
    high: number;
    medium: number;
    low: number;
  };
}

export class PriorityResolver {
  private config: PriorityConfig;

  constructor(config: PriorityConfig = {}) {
    this.config = {
      defaultPriority: 1,
      criticalWeight: 10,
      priorityWeights: {
        high: 3,
        medium: 2,
        low: 1
      },
      ...config
    };
  }

  /**
   * Calculate effective priority for a rule result
   */
  calculateEffectivePriority(result: RuleResult): number {
    let priority = this.config.defaultPriority || 1;
    
    // Apply priority weight
    const rulePriority = result.metadata?.priority;
    if (rulePriority && this.config.priorityWeights) {
      priority = this.config.priorityWeights[rulePriority] || priority;
    }
    
    // Apply critical weight multiplier
    if (result.metadata?.criticalRule) {
      priority *= this.config.criticalWeight || 10;
    }
    
    // Apply custom weight if specified
    if (result.metadata?.weight) {
      priority *= result.metadata.weight;
    }
    
    return priority;
  }

  /**
   * Sort rule results by priority
   */
  sortByPriority(results: RuleResult[]): RuleResult[] {
    return [...results].sort((a, b) => {
      const aPriority = this.calculateEffectivePriority(a);
      const bPriority = this.calculateEffectivePriority(b);
      return bPriority - aPriority;
    });
  }

  /**
   * Determine which rule should take precedence
   */
  resolvePriority(r1: RuleResult, r2: RuleResult): RuleResult {
    const p1 = this.calculateEffectivePriority(r1);
    const p2 = this.calculateEffectivePriority(r2);
    
    if (p1 > p2) return r1;
    if (p2 > p1) return r2;
    
    // If priorities are equal, prefer the more restrictive rule
    if (!r1.passed && r2.passed) return r1;
    if (!r2.passed && r1.passed) return r2;
    
    // Default to first rule
    return r1;
  }

  /**
   * Get the highest priority failed rule
   */
  getHighestPriorityFailure(results: RuleResult[]): RuleResult | null {
    const failures = results.filter(r => !r.passed);
    if (failures.length === 0) return null;
    
    const sorted = this.sortByPriority(failures);
    return sorted[0];
  }
}
