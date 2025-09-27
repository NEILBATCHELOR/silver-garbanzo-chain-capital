/**
 * PolicyEngine.ts
 * Core Policy Engine that evaluates policies before any cryptographic operation
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  PolicyEvaluationResult, 
  PolicyEngineConfig,
  PolicyResult,
  PolicyViolation,
  PolicyCacheEntry
} from './types';
import type { Policy } from '@/services/policy/enhancedPolicyService';
import { PolicyEvaluator } from './PolicyEvaluator';
import { PolicyContextBuilder } from './PolicyContext';
import { supabase } from '@/infrastructure/database/client';
import { generateUUID } from '@/utils/shared/formatting/uuidUtils';

// Re-export types for external use
export type { CryptoOperation, PolicyContext } from './types';

export class PolicyEngine {
  private evaluator: PolicyEvaluator;
  private cache: Map<string, PolicyCacheEntry>;
  private config: PolicyEngineConfig;
  private policies: Map<string, Policy>;

  constructor(config: PolicyEngineConfig = {}) {
    this.config = {
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL ?? 300, // 5 minutes default
      evaluationTimeout: config.evaluationTimeout ?? 5000, // 5 seconds
      parallelEvaluation: config.parallelEvaluation ?? false,
      strictMode: config.strictMode ?? false,
      logLevel: config.logLevel ?? 'info'
    };
    
    this.evaluator = new PolicyEvaluator();
    this.cache = new Map();
    this.policies = new Map();
  }

  /**
   * Main method to evaluate an operation against all applicable policies
   */
  async evaluateOperation(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const evaluationId = generateUUID();
    const startTime = Date.now();
    
    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(operation, context);
        const cached = this.getCached(cacheKey);
        if (cached) {
          this.log('debug', `Cache hit for operation ${operation.type}`);
          return cached;
        }
      }

      // Load applicable policies
      const policies = await this.getApplicablePolicies(operation);
      
      if (policies.length === 0 && this.config.strictMode) {
        // In strict mode, no policies means rejection
        return {
          allowed: false,
          policies: [],
          violations: [{
            policyId: 'system',
            violationType: 'no_policies',
            severity: 'high',
            description: 'No policies found for this operation type'
          }],
          warnings: [],
          metadata: {
            evaluationId,
            evaluationTime: Date.now() - startTime
          }
        };
      }

      // Evaluate policies
      const policyResults = await this.evaluatePolicies(policies, context);
      
      // Aggregate results
      const result = this.aggregateResults(policyResults, evaluationId, startTime);
      
      // Cache result if enabled
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(operation, context);
        this.cacheResult(cacheKey, result);
      }

      // Log to database for audit
      await this.logEvaluation(operation, context, result);
      
      return result;
      
    } catch (error) {
      this.log('error', `Policy evaluation failed: ${error.message}`);
      
      return {
        allowed: false,
        policies: [],
        violations: [{
          policyId: 'system',
          violationType: 'evaluation_error',
          severity: 'critical',
          description: `Policy evaluation failed: ${error.message}`
        }],
        warnings: [],
        metadata: {
          evaluationId,
          evaluationTime: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  /**
   * Evaluate multiple policies
   */
  private async evaluatePolicies(
    policies: Policy[],
    context: PolicyContext
  ): Promise<PolicyResult[]> {
    if (this.config.parallelEvaluation) {
      // Evaluate policies in parallel
      return await Promise.all(
        policies.map(policy => this.evaluator.evaluatePolicy(policy, context))
      );
    } else {
      // Evaluate policies sequentially
      const results: PolicyResult[] = [];
      
      for (const policy of policies) {
        const result = await this.evaluator.evaluatePolicy(policy, context);
        results.push(result);
        
        // Stop on critical failure if in strict mode
        if (this.config.strictMode && !result.passed) {
          const hasCritical = result.violations.some(
            v => v.severity === 'critical'
          );
          if (hasCritical) {
            this.log('info', `Critical policy violation, stopping evaluation`);
            break;
          }
        }
      }
      
      return results;
    }
  }

  /**
   * Load policies from database
   */
  async loadPolicies(filters?: {
    operationType?: string;
    chainId?: string;
    status?: string;
  }): Promise<void> {
    try {
      // Build query for policy_operation_mappings
      let query = supabase
        .from('policy_operation_mappings')
        .select(`
          *,
          policy:rules(*)
        `);

      if (filters?.operationType) {
        query = query.eq('operation_type', filters.operationType);
      }
      
      if (filters?.chainId) {
        query = query.eq('chain_id', filters.chainId);
      }

      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to load policies: ${error.message}`);
      }

      // Store policies in memory
      this.policies.clear();
      for (const mapping of data || []) {
        if (mapping.policy) {
          const policy = this.transformDbPolicy(mapping.policy);
          this.policies.set(policy.id || mapping.policy_id, policy);
        }
      }

      this.log('info', `Loaded ${this.policies.size} policies`);
      
    } catch (error) {
      this.log('error', `Failed to load policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get policies applicable to an operation
   */
  async getApplicablePolicies(
    operation: CryptoOperation
  ): Promise<Policy[]> {
    // Query database for applicable policies
    const { data, error } = await supabase
      .from('policy_operation_mappings')
      .select(`
        *,
        policy:rules(*)
      `)
      .eq('operation_type', operation.type)
      .or(`chain_id.eq.${operation.chainId},chain_id.is.null`);

    if (error) {
      this.log('error', `Failed to fetch policies: ${error.message}`);
      return [];
    }

    const policies: Policy[] = [];
    
    for (const mapping of data || []) {
      if (mapping.policy && mapping.policy.status === 'active') {
        const policy = this.transformDbPolicy(mapping.policy);
        
        // Check if policy conditions match the operation
        if (this.checkPolicyConditions(policy, operation, mapping.conditions)) {
          policies.push(policy);
        }
      }
    }

    return policies;
  }  /**
   * Transform database policy to Policy interface
   */
  private transformDbPolicy(dbPolicy: any): Policy {
    const details = dbPolicy.rule_details || {};
    
    return {
      id: dbPolicy.rule_id,
      name: dbPolicy.rule_name,
      type: dbPolicy.rule_type,
      status: dbPolicy.status,
      isActive: dbPolicy.status === 'active',
      isTemplate: dbPolicy.is_template,
      rules: details.rules || [],
      approvers: details.approvers || [],
      description: details.description,
      jurisdiction: details.jurisdiction,
      effectiveDate: details.effectiveDate,
      createdBy: dbPolicy.created_by,
      createdAt: dbPolicy.created_at,
      version: details.version || 1
    };
  }

  /**
   * Check if policy conditions match the operation
   */
  private checkPolicyConditions(
    policy: Policy,
    operation: CryptoOperation,
    conditions: any
  ): boolean {
    if (!conditions) {
      return true; // No conditions means always applicable
    }

    // Check token standard if specified
    if (conditions.tokenStandard && operation.metadata?.standard) {
      if (conditions.tokenStandard !== operation.metadata.standard) {
        return false;
      }
    }

    // Check amount range if specified
    if (conditions.minAmount || conditions.maxAmount) {
      const amount = BigInt(operation.amount || 0);
      
      if (conditions.minAmount && amount < BigInt(conditions.minAmount)) {
        return false;
      }
      
      if (conditions.maxAmount && amount > BigInt(conditions.maxAmount)) {
        return false;
      }
    }

    // Additional condition checks can be added here

    return true;
  }

  /**
   * Aggregate policy results into final evaluation
   */
  private aggregateResults(
    policyResults: PolicyResult[],
    evaluationId: string,
    startTime: number
  ): PolicyEvaluationResult {
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];
    
    // Collect all violations and warnings
    for (const result of policyResults) {
      violations.push(...result.violations);
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    // Determine if operation is allowed
    const allowed = violations.length === 0 || 
      !violations.some(v => v.severity === 'critical' || v.severity === 'high');

    return {
      allowed,
      policies: policyResults,
      violations,
      warnings,
      metadata: {
        evaluationId,
        evaluationTime: Date.now() - startTime,
        policiesEvaluated: policyResults.length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate cache key for operation
   */
  private generateCacheKey(
    operation: CryptoOperation,
    context: PolicyContext
  ): string {
    const key = JSON.stringify({
      type: operation.type,
      amount: operation.amount?.toString(),
      from: operation.from,
      to: operation.to,
      tokenId: operation.tokenId,
      chainId: operation.chainId,
      userId: context.user.id
    });
    
    return Buffer.from(key).toString('base64');
  }

  /**
   * Get cached result
   */
  private getCached(key: string): PolicyEvaluationResult | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.result;
  }

  /**
   * Cache evaluation result
   */
  private cacheResult(key: string, result: PolicyEvaluationResult): void {
    const entry: PolicyCacheEntry = {
      key,
      result,
      expires: Date.now() + (this.config.cacheTTL! * 1000),
      hitCount: 0
    };
    
    this.cache.set(key, entry);
    
    // Clean up old entries if cache is too large
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expires < now) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Log evaluation to database
   */
  private async logEvaluation(
    operation: CryptoOperation,
    context: PolicyContext,
    result: PolicyEvaluationResult
  ): Promise<void> {
    try {
      // Log to transaction_validations table
      await supabase
        .from('transaction_validations')
        .insert({
          from_address: operation.from || context.user.address,
          to_address: operation.to || '',
          value: operation.amount?.toString() || '0',
          validation_result: result,
          policies_checked: result.policies.map(p => p.policyId),
          valid: result.allowed,
          created_at: new Date().toISOString()
        });

      // Log violations if any
      if (result.violations.length > 0) {
        for (const violation of result.violations) {
          await supabase
            .from('policy_violations')
            .insert({
              violation_id: generateUUID(),
              policy_id: violation.policyId,
              violation_type: violation.violationType,
              severity: violation.severity,
              description: violation.description,
              created_at: new Date().toISOString()
            });
        }
      }
      
    } catch (error) {
      this.log('error', `Failed to log evaluation: ${error.message}`);
      // Don't throw - logging failure shouldn't stop operations
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.log('info', 'Policy cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      totalRequests += entry.hitCount + 1;
    }
    
    return {
      size: this.cache.size,
      hits: totalHits,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    };
  }

  /**
   * Internal logging
   */
  private log(level: string, message: string): void {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = logLevels.indexOf(this.config.logLevel || 'info');
    const messageLevel = logLevels.indexOf(level);
    
    if (messageLevel >= currentLevel) {
      const prefix = `[PolicyEngine:${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message);
          break;
        case 'warn':
          console.warn(prefix, message);
          break;
        case 'debug':
          console.debug(prefix, message);
          break;
        default:
          console.log(prefix, message);
      }
    }
  }
}
