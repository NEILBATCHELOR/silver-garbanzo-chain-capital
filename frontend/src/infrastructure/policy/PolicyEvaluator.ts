/**
 * PolicyEvaluator.ts - Enhanced
 * Core evaluation logic for policies with Stage 2 integration
 */

import type { 
  Policy
} from '@/services/policy/enhancedPolicyService';
import type {
  PolicyRule
} from '@/services/rule/enhancedRuleService';
import type { 
  CryptoOperation, 
  PolicyContext, 
  PolicyResult, 
  PolicyViolation 
} from './types';
import { RuleEvaluationPipeline } from './rules/RuleEvaluationPipeline';
import { RuleContext } from './rules/RuleContext';
import type { RuleEvaluationContext, PipelineResult } from './rules/types';

export class PolicyEvaluator {
  private ruleEvaluationPipeline: RuleEvaluationPipeline;
  private ruleContext: RuleContext;

  constructor() {
    this.ruleEvaluationPipeline = new RuleEvaluationPipeline({
      parallelProcessing: false,
      conflictResolution: 'restrictive',
      cacheEnabled: true,
      maxEvaluationTime: 5000,
      debugMode: false
    });
    this.ruleContext = new RuleContext();
  }

  /**
   * Evaluate a single policy against an operation using Rule Pipeline
   */
  async evaluatePolicy(
    policy: Policy,
    context: PolicyContext
  ): Promise<PolicyResult> {
    const startTime = Date.now();
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    try {
      // Check if policy is active
      if (policy.status !== 'active' && !policy.isActive) {
        return {
          policyId: policy.id || '',
          policyName: policy.name,
          passed: true, // Inactive policies pass by default
          violations: [],
          warnings: ['Policy is not active'],
          details: 'Policy evaluation skipped (inactive)',
          evaluationTime: Date.now() - startTime
        };
      }

      // Check policy jurisdiction if specified
      if (policy.jurisdiction && policy.jurisdiction !== 'global') {
        if (context.user.jurisdiction !== policy.jurisdiction) {
          warnings.push(`Policy jurisdiction mismatch: ${policy.jurisdiction}`);
        }
      }

      // Build rule evaluation context
      const ruleContext = await this.ruleContext.buildContext(
        context.operation || {} as CryptoOperation,
        context
      );

      // Use Rule Evaluation Pipeline for comprehensive rule processing
      if (policy.rules && policy.rules.length > 0) {
        const pipelineResult = await this.ruleEvaluationPipeline.evaluate(
          policy.rules as PolicyRule[],
          ruleContext
        );

        // Convert pipeline results to policy violations
        for (const ruleResult of pipelineResult.rules) {
          if (!ruleResult.passed) {
            violations.push({
              policyId: policy.id || '',
              policyName: policy.name,
              violationType: `rule_${ruleResult.ruleName}`,
              severity: this.determineSeverityFromScore(ruleResult.score),
              description: this.buildViolationDescription(ruleResult),
              remediation: this.generateRemediation(ruleResult),
              metadata: {
                ruleId: ruleResult.ruleId,
                conditions: ruleResult.conditions,
                executionTime: ruleResult.executionTime
              }
            });
          }
        }

        // Add conflict warnings
        if (pipelineResult.conflicts && pipelineResult.conflicts.length > 0) {
          for (const conflict of pipelineResult.conflicts) {
            warnings.push(
              `Rule conflict detected: ${conflict.rule1.ruleName} vs ${conflict.rule2.ruleName} (${conflict.type})`
            );
          }
        }

        // Add risk warnings based on risk factors
        if (ruleContext.riskFactors) {
          if (ruleContext.riskFactors.riskLevel === 'high' || 
              ruleContext.riskFactors.riskLevel === 'critical') {
            warnings.push(
              `High risk detected: Overall risk score ${ruleContext.riskFactors.overallRisk}/100`
            );
          }
        }

        // Use pipeline recommendation
        const passed = pipelineResult.recommendation !== 'reject';

        return {
          policyId: policy.id || '',
          policyName: policy.name,
          passed,
          violations,
          warnings,
          details: this.buildEvaluationDetails(pipelineResult, ruleContext),
          evaluationTime: Date.now() - startTime,
          metadata: {
            pipelineResult,
            riskFactors: ruleContext.riskFactors,
            userProfile: ruleContext.userProfile
          }
        };

      } else {
        // No rules, evaluate based on base policy criteria
        return await this.evaluateBasicPolicy(policy, context, warnings, startTime);
      }

    } catch (error) {
      console.error('Policy evaluation error:', error);
      
      return {
        policyId: policy.id || '',
        policyName: policy.name,
        passed: false,
        violations: [{
          policyId: policy.id || '',
          policyName: policy.name,
          violationType: 'evaluation_error',
          severity: 'high',
          description: `Policy evaluation failed: ${error.message}`
        }],
        warnings,
        details: 'Evaluation failed due to error',
        evaluationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Evaluate basic policy without complex rules
   */
  private async evaluateBasicPolicy(
    policy: Policy,
    context: PolicyContext,
    warnings: string[],
    startTime: number
  ): Promise<PolicyResult> {
    const violations: PolicyViolation[] = [];

    // Basic validation based on policy type
    switch (policy.type) {
      case 'governance':
        // Check governance requirements
        if (!context.user.governanceApproved) {
          violations.push({
            policyId: policy.id || '',
            policyName: policy.name,
            violationType: 'governance_approval',
            severity: 'high',
            description: 'Governance approval required'
          });
        }
        break;

      case 'compliance':
        // Check compliance requirements
        if (!context.user.kycVerified) {
          violations.push({
            policyId: policy.id || '',
            policyName: policy.name,
            violationType: 'kyc_required',
            severity: 'critical',
            description: 'KYC verification required'
          });
        }
        break;

      case 'operational':
        // Check operational requirements
        if (context.environment.network === 'mainnet' && !context.user.productionApproved) {
          violations.push({
            policyId: policy.id || '',
            policyName: policy.name,
            violationType: 'production_approval',
            severity: 'medium',
            description: 'Production environment approval required'
          });
        }
        break;
    }

    return {
      policyId: policy.id || '',
      policyName: policy.name,
      passed: violations.length === 0,
      violations,
      warnings,
      details: violations.length === 0 ? 'Basic policy evaluation passed' : 'Basic policy evaluation failed',
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * Build detailed evaluation description
   */
  private buildEvaluationDetails(
    pipelineResult: PipelineResult,
    ruleContext: RuleEvaluationContext
  ): string {
    const details: string[] = [];

    // Add pipeline summary
    details.push(`Evaluated ${pipelineResult.rules.length} rules`);
    details.push(`Recommendation: ${pipelineResult.recommendation}`);
    details.push(`Aggregate score: ${pipelineResult.aggregateScore.toFixed(2)}`);

    // Add risk summary if available
    if (ruleContext.riskFactors) {
      details.push(`Risk level: ${ruleContext.riskFactors.riskLevel}`);
      details.push(`Overall risk: ${ruleContext.riskFactors.overallRisk}/100`);
    }

    // Add conflict summary
    if (pipelineResult.conflicts && pipelineResult.conflicts.length > 0) {
      details.push(`Conflicts detected: ${pipelineResult.conflicts.length}`);
    }

    // Add metadata summary
    if (pipelineResult.metadata) {
      if (pipelineResult.metadata.terminatedEarly) {
        details.push(`Evaluation terminated early: ${pipelineResult.metadata.terminationReason}`);
      }
      if (pipelineResult.metadata.criticalFailures && pipelineResult.metadata.criticalFailures > 0) {
        details.push(`Critical failures: ${pipelineResult.metadata.criticalFailures}`);
      }
    }

    return details.join('; ');
  }

  /**
   * Build violation description from rule result
   */
  private buildViolationDescription(ruleResult: any): string {
    const failedConditions = ruleResult.conditions
      .filter((c: any) => !c.passed)
      .map((c: any) => c.message || `${c.type} check failed`)
      .join(', ');

    return failedConditions || `Rule ${ruleResult.ruleName} failed`;
  }

  /**
   * Generate remediation suggestion
   */
  private generateRemediation(ruleResult: any): string {
    const remediations: string[] = [];

    for (const condition of ruleResult.conditions) {
      if (!condition.passed) {
        switch (condition.type) {
          case 'max_amount':
            remediations.push(`Reduce transaction amount below ${condition.expected}`);
            break;
          case 'min_amount':
            remediations.push(`Increase transaction amount above ${condition.expected}`);
            break;
          case 'time_window':
            remediations.push(`Execute transaction during allowed hours: ${condition.expected}`);
            break;
          case 'frequency_limit':
            remediations.push(`Wait before attempting more transactions (limit: ${condition.expected})`);
            break;
          case 'whitelist':
            remediations.push('Use whitelisted address');
            break;
          case 'kyc':
            remediations.push('Complete KYC verification');
            break;
          case 'multi_sig':
            remediations.push('Obtain required signatures');
            break;
          default:
            remediations.push(`Fix ${condition.type} requirement`);
        }
      }
    }

    return remediations.join('; ') || 'Review rule requirements';
  }

  /**
   * Determine severity from score
   */
  private determineSeverityFromScore(score?: number): 'critical' | 'high' | 'medium' | 'low' {
    if (!score || score === 0) return 'critical';
    if (score < 0.25) return 'high';
    if (score < 0.5) return 'medium';
    return 'low';
  }

  /**
   * Legacy method for backward compatibility
   */
  private async evaluateRule(
    rule: PolicyRule,
    context: PolicyContext
  ): Promise<any> {
    // This is kept for backward compatibility
    // Actual evaluation happens through RuleEvaluationPipeline
    return {
      passed: true,
      description: 'Rule evaluated through pipeline',
      warnings: []
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  private determineSeverity(rule: any, policy: Policy): 'critical' | 'high' | 'medium' | 'low' {
    if (rule.critical || policy.type === 'compliance') return 'critical';
    if (rule.priority === 'high' || policy.type === 'governance') return 'high';
    if (rule.priority === 'medium') return 'medium';
    return 'low';
  }
}
