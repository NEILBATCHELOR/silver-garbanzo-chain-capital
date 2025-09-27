/**
 * Conflict Resolver
 * Detects and resolves conflicts between rule evaluation results
 */

import type { 
  RuleResult, 
  RuleConflict, 
  ConflictType, 
  ConflictResolution 
} from '../types';

export interface ConflictResolverConfig {
  strategy?: 'restrictive' | 'permissive' | 'priority';
  autoResolve?: boolean;
  requireManualReview?: string[]; // Conflict types requiring manual review
}

export class ConflictResolver {
  private config: ConflictResolverConfig;

  constructor(config: ConflictResolverConfig = {}) {
    this.config = {
      strategy: 'restrictive',
      autoResolve: true,
      requireManualReview: [],
      ...config
    };
  }

  async resolve(results: RuleResult[]): Promise<RuleConflict[]> {
    const conflicts: RuleConflict[] = [];
    
    // Detect conflicts between rules
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const conflict = this.detectConflict(results[i], results[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Resolve conflicts if auto-resolve is enabled
    if (this.config.autoResolve) {
      for (const conflict of conflicts) {
        if (!this.requiresManualReview(conflict.type)) {
          conflict.resolved = true;
        }
      }
    }

    return conflicts;
  }

  private detectConflict(r1: RuleResult, r2: RuleResult): RuleConflict | null {
    // Check for contradictory outcomes
    if (r1.passed !== r2.passed) {
      // Check if rules evaluate the same aspect
      if (this.evaluateSameAspect(r1, r2)) {
        const conflictType = this.getConflictType(r1, r2);
        const resolution = this.resolveConflict(r1, r2);
        
        return {
          rule1: r1,
          rule2: r2,
          type: conflictType,
          resolution,
          resolved: false
        };
      }
    }

    // Check for conflicting conditions
    const conflictingConditions = this.findConflictingConditions(r1, r2);
    if (conflictingConditions.length > 0) {
      return {
        rule1: r1,
        rule2: r2,
        type: this.getConflictTypeFromConditions(conflictingConditions),
        resolution: this.resolveConflict(r1, r2),
        resolved: false
      };
    }

    return null;
  }

  private evaluateSameAspect(r1: RuleResult, r2: RuleResult): boolean {
    // Check if both rules evaluate the same type of condition
    const r1Types = new Set(r1.conditions.map(c => c.type));
    const r2Types = new Set(r2.conditions.map(c => c.type));
    
    // Find intersection
    for (const type of r1Types) {
      if (r2Types.has(type)) {
        return true;
      }
    }
    
    return false;
  }

  private getConflictType(r1: RuleResult, r2: RuleResult): ConflictType {
    // Determine conflict type based on rule conditions
    const conditionTypes = [
      ...r1.conditions.map(c => c.type),
      ...r2.conditions.map(c => c.type)
    ];

    if (conditionTypes.some(t => t.includes('amount') || t.includes('limit'))) {
      return 'AMOUNT_CONFLICT';
    }
    if (conditionTypes.some(t => t.includes('time') || t.includes('window'))) {
      return 'TIME_CONFLICT';
    }
    if (conditionTypes.some(t => t.includes('address') || t.includes('whitelist'))) {
      return 'ADDRESS_CONFLICT';
    }
    if (conditionTypes.some(t => t.includes('frequency') || t.includes('cooldown'))) {
      return 'FREQUENCY_CONFLICT';
    }
    if (conditionTypes.some(t => t.includes('compliance') || t.includes('kyc'))) {
      return 'COMPLIANCE_CONFLICT';
    }
    
    return 'PERMISSION_CONFLICT';
  }

  private getConflictTypeFromConditions(conditions: string[]): ConflictType {
    if (conditions.some(c => c.includes('amount'))) return 'AMOUNT_CONFLICT';
    if (conditions.some(c => c.includes('time'))) return 'TIME_CONFLICT';
    if (conditions.some(c => c.includes('address'))) return 'ADDRESS_CONFLICT';
    if (conditions.some(c => c.includes('frequency'))) return 'FREQUENCY_CONFLICT';
    if (conditions.some(c => c.includes('compliance'))) return 'COMPLIANCE_CONFLICT';
    return 'PERMISSION_CONFLICT';
  }

  private findConflictingConditions(r1: RuleResult, r2: RuleResult): string[] {
    const conflicts: string[] = [];
    
    for (const c1 of r1.conditions) {
      for (const c2 of r2.conditions) {
        if (c1.type === c2.type && c1.passed !== c2.passed) {
          conflicts.push(c1.type);
        }
      }
    }
    
    return conflicts;
  }

  private resolveConflict(r1: RuleResult, r2: RuleResult): ConflictResolution {
    const strategy = this.config.strategy;
    
    // Priority-based resolution
    const r1Priority = r1.metadata?.priority || 0;
    const r2Priority = r2.metadata?.priority || 0;
    
    if (r1Priority > r2Priority) {
      return {
        winner: r1.ruleId,
        strategy: 'priority',
        reason: `Rule ${r1.ruleName} has higher priority (${r1Priority} vs ${r2Priority})`
      };
    }
    
    if (r2Priority > r1Priority) {
      return {
        winner: r2.ruleId,
        strategy: 'priority',
        reason: `Rule ${r2.ruleName} has higher priority (${r2Priority} vs ${r1Priority})`
      };
    }
    
    // Critical rule precedence
    if (r1.metadata?.criticalRule && !r2.metadata?.criticalRule) {
      return {
        winner: r1.ruleId,
        strategy: 'critical',
        reason: `Rule ${r1.ruleName} is critical`
      };
    }
    
    if (r2.metadata?.criticalRule && !r1.metadata?.criticalRule) {
      return {
        winner: r2.ruleId,
        strategy: 'critical',
        reason: `Rule ${r2.ruleName} is critical`
      };
    }
    
    // Apply configured strategy
    if (strategy === 'restrictive') {
      // Most restrictive wins (failed rule takes precedence)
      return {
        winner: r1.passed ? r2.ruleId : r1.ruleId,
        strategy: 'restrictive',
        reason: 'Most restrictive rule takes precedence'
      };
    } else if (strategy === 'permissive') {
      // Most permissive wins (passed rule takes precedence)
      return {
        winner: r1.passed ? r1.ruleId : r2.ruleId,
        strategy: 'permissive',
        reason: 'Most permissive rule takes precedence'
      };
    }
    
    // Default: require manual review
    return {
      winner: '',
      strategy: 'manual',
      reason: 'Manual review required',
      requiresReview: true
    };
  }

  private requiresManualReview(conflictType: ConflictType): boolean {
    return this.config.requireManualReview?.includes(conflictType) || false;
  }
}
