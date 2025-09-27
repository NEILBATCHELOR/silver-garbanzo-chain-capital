/**
 * Rule Evaluation Pipeline
 * Sequential processing of rules with conflict resolution
 */

import type { PolicyRule } from '@/services/rule/enhancedRuleService';
import type { CryptoOperation, PolicyContext } from '../PolicyEngine';
import { ConflictResolver } from './resolvers/ConflictResolver';
import { RuleCache } from './RuleCache';
import { 
  RuleProcessor,
  AmountRuleProcessor,
  TimeRuleProcessor,
  AddressRuleProcessor,
  FrequencyRuleProcessor,
  ComplianceRuleProcessor 
} from './processors';
import type {
  RuleResult,
  PipelineResult,
  RuleEvaluationContext,
  ConditionResult,
  GlobalRuleState
} from './types';

export interface PipelineConfig {
  parallelProcessing?: boolean;
  conflictResolution?: 'restrictive' | 'permissive' | 'priority';
  cacheEnabled?: boolean;
  maxEvaluationTime?: number;
  debugMode?: boolean;
}

export class RuleEvaluationPipeline {
  private processors: Map<string, RuleProcessor>;
  private conflictResolver: ConflictResolver;
  private cache: RuleCache;
  private config: PipelineConfig;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      parallelProcessing: false,
      conflictResolution: 'restrictive',
      cacheEnabled: true,
      maxEvaluationTime: 5000,
      debugMode: false,
      ...config
    };

    this.initializeProcessors();
    this.conflictResolver = new ConflictResolver({
      strategy: this.config.conflictResolution
    });
    this.cache = new RuleCache({ enabled: this.config.cacheEnabled });
  }

  private initializeProcessors(): void {
    this.processors = new Map();
    this.processors.set('amount', new AmountRuleProcessor());
    this.processors.set('time', new TimeRuleProcessor());
    this.processors.set('address', new AddressRuleProcessor());
    this.processors.set('frequency', new FrequencyRuleProcessor());
    this.processors.set('compliance', new ComplianceRuleProcessor());
  }

  async evaluate(
    rules: PolicyRule[],
    context: RuleEvaluationContext
  ): Promise<PipelineResult> {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(rules, context);
    const cached = await this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      if (this.config.debugMode) {
        console.log('Pipeline: Using cached result');
      }
      return cached;
    }

    // Sort rules by priority
    const sortedRules = this.sortByPriority(rules);
    
    // Process rules sequentially or in parallel
    const results: RuleResult[] = [];
    
    if (this.config.parallelProcessing && !this.hasCriticalRules(sortedRules)) {
      // Parallel processing for non-critical rules
      const promises = sortedRules.map(rule => this.processRule(rule, context));
      const parallelResults = await Promise.allSettled(promises);
      
      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle failed rule evaluation
          results.push(this.createFailedRuleResult(result.reason));
        }
      }
    } else {
      // Sequential processing
      for (const rule of sortedRules) {
        try {
          const result = await this.processRule(rule, context);
          
          // Check for early termination
          if (this.shouldTerminate(result, rule)) {
            if (this.config.debugMode) {
              console.log(`Pipeline: Early termination due to critical rule failure: ${rule.name}`);
            }
            return this.buildTerminationResult(results, result);
          }
          
          results.push(result);
          // Update context with previous evaluations
          context.previousEvaluations = [...results];
          
        } catch (error) {
          console.error(`Error processing rule ${rule.name}:`, error);
          results.push(this.createFailedRuleResult(error));
        }
      }
    }

    // Resolve conflicts
    const conflicts = await this.conflictResolver.resolve(results);
    
    // Calculate aggregate score
    const aggregateScore = this.calculateScore(results);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(results, conflicts, aggregateScore);
    
    const executionTime = performance.now() - startTime;
    
    // Build final result
    const pipelineResult: PipelineResult = {
      success: recommendation !== 'reject',
      rules: results,
      conflicts,
      aggregateScore,
      recommendation,
      executionTime,
      metadata: {
        totalRules: rules.length,
        passedRules: results.filter(r => r.passed).length,
        failedRules: results.filter(r => !r.passed).length,
        criticalFailures: results.filter(r => !r.passed && r.metadata?.criticalRule).length
      }
    };

    // Cache result
    await this.cache.set(cacheKey, pipelineResult);

    if (this.config.debugMode) {
      console.log('Pipeline Result:', pipelineResult);
    }

    return pipelineResult;
  }

  private async processRule(
    rule: PolicyRule,
    context: RuleEvaluationContext
  ): Promise<RuleResult> {
    const processor = this.getProcessor(rule.type);
    if (!processor) {
      throw new Error(`No processor found for rule type: ${rule.type}`);
    }

    const startTime = performance.now();
    const result = await processor.process(rule, context);
    result.executionTime = performance.now() - startTime;

    return result;
  }

  private getProcessor(ruleType: string): RuleProcessor | undefined {
    return this.processors.get(ruleType.toLowerCase());
  }

  private sortByPriority(rules: PolicyRule[]): PolicyRule[] {
    return [...rules].sort((a, b) => {
      // Critical rules first
      if (a.critical && !b.critical) return -1;
      if (!a.critical && b.critical) return 1;
      
      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      
      return bPriority - aPriority;
    });
  }

  private shouldTerminate(result: RuleResult, rule: PolicyRule): boolean {
    return !!(rule.critical && !result.passed);
  }

  private buildTerminationResult(
    results: RuleResult[],
    terminatingResult: RuleResult
  ): PipelineResult {
    return {
      success: false,
      rules: [...results, terminatingResult],
      conflicts: [],
      aggregateScore: 0,
      recommendation: 'reject',
      executionTime: 0,
      metadata: {
        terminatedEarly: true,
        terminationReason: `Critical rule failed: ${terminatingResult.ruleName}`
      }
    };
  }

  private calculateScore(results: RuleResult[]): number {
    if (results.length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const result of results) {
      const weight = result.metadata?.weight || 1;
      const score = result.score || (result.passed ? 1 : 0);
      
      totalScore += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private generateRecommendation(
    results: RuleResult[],
    conflicts: any[],
    aggregateScore: number
  ): 'approve' | 'reject' | 'review' {
    // Check for any critical failures
    const hasCriticalFailure = results.some(
      r => !r.passed && r.metadata?.criticalRule
    );
    
    if (hasCriticalFailure) {
      return 'reject';
    }
    
    // Check for unresolved conflicts
    if (conflicts.some(c => !c.resolved)) {
      return 'review';
    }
    
    // Score-based recommendation
    if (aggregateScore >= 0.8) {
      return 'approve';
    } else if (aggregateScore >= 0.5) {
      return 'review';
    } else {
      return 'reject';
    }
  }

  private hasCriticalRules(rules: PolicyRule[]): boolean {
    return rules.some(r => r.critical);
  }

  private generateCacheKey(rules: PolicyRule[], context: RuleEvaluationContext): string {
    const ruleIds = rules.map(r => r.id).sort().join(':');
    const operationKey = JSON.stringify(context.operation);
    return `pipeline:${ruleIds}:${operationKey}`;
  }

  private isExpired(cached: any): boolean {
    if (!cached.timestamp) return true;
    const age = Date.now() - cached.timestamp;
    return age > 5 * 60 * 1000; // 5 minutes
  }

  private createFailedRuleResult(error: any): RuleResult {
    return {
      ruleId: 'error',
      ruleName: 'Error',
      passed: false,
      score: 0,
      conditions: [],
      metadata: {
        error: error.message || 'Unknown error'
      },
      timestamp: new Date().toISOString()
    };
  }
}
