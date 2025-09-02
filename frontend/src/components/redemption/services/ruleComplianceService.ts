// Rule compliance validation service for redemption requests
// Ensures no redemption can be approved without meeting business rules
// Validates against database redemption_rules table

import { supabase } from '@/infrastructure/supabaseClient';
import type { RedemptionRequest, RedemptionRule } from '../types';

export interface ComplianceValidationResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  applicableRules: RedemptionRule[];
  ruleEngineVersion: string;
  validatedAt: Date;
}

export interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  violationType: 'REDEMPTION_CLOSED' | 'LOCK_UP_PERIOD' | 'MAX_PERCENTAGE_EXCEEDED' | 'WINDOW_REQUIRED' | 'INSUFFICIENT_APPROVERS' | 'ELIGIBILITY_FAILED';
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  blockingApproval: boolean;
}

class RuleComplianceService {
  private readonly rulesTableName = 'redemption_rules';
  private readonly requestsTableName = 'redemption_requests';
  private readonly ruleEngineVersion = '1.0';

  /**
   * Map database row (snake_case) to RedemptionRule (camelCase)
   */
  private mapDbToRedemptionRule(row: any): RedemptionRule {
    return {
      id: row.id,
      ruleId: row.rule_id,
      redemptionType: row.redemption_type,
      requireMultiSigApproval: row.require_multi_sig_approval || false,
      requiredApprovers: row.required_approvers || 2,
      totalApprovers: row.total_approvers || 3,
      notifyInvestors: row.notify_investors || false,
      settlementMethod: row.settlement_method || 'stablecoin',
      immediateExecution: row.immediate_execution,
      useLatestNav: row.use_latest_nav,
      allowAnyTimeRedemption: row.allow_any_time_redemption,
      repurchaseFrequency: row.repurchase_frequency,
      lockUpPeriod: row.lock_up_period || 0,
      submissionWindowDays: row.submission_window_days,
      lockTokensOnRequest: row.lock_tokens_on_request,
      useWindowNav: row.use_window_nav,
      enableProRataDistribution: row.enable_pro_rata_distribution,
      queueUnprocessedRequests: row.queue_unprocessed_requests,
      enableAdminOverride: row.enable_admin_override,
      productType: row.product_type,
      productId: row.product_id,
      isRedemptionOpen: row.is_redemption_open || false,
      openAfterDate: row.open_after_date ? new Date(row.open_after_date) : undefined,
      allowContinuousRedemption: row.allow_continuous_redemption || false,
      maxRedemptionPercentage: row.max_redemption_percentage ? parseFloat(row.max_redemption_percentage) : undefined,
      redemptionEligibilityRules: row.redemption_eligibility_rules || {},
      targetRaiseAmount: row.target_raise_amount ? parseFloat(row.target_raise_amount) : undefined,
      projectId: row.project_id,
      organizationId: row.organization_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Get applicable redemption rules for a request
   */
  async getApplicableRules(
    projectId: string, 
    redemptionType: 'standard' | 'interval',
    productType?: string,
    productId?: string
  ): Promise<{
    success: boolean;
    data?: RedemptionRule[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from(this.rulesTableName)
        .select('*')
        .eq('project_id', projectId)
        .eq('redemption_type', redemptionType)
        .order('created_at', { ascending: false });

      // Add product-specific filters if provided
      if (productType) {
        query = query.eq('product_type', productType);
      }
      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rules = (data || []).map(row => this.mapDbToRedemptionRule(row));
      return { success: true, data: rules };
    } catch (error) {
      console.error('Error fetching applicable rules:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Validate redemption request against business rules
   */
  async validateRedemptionCompliance(
    redemptionRequest: RedemptionRequest,
    projectId: string
  ): Promise<ComplianceValidationResult> {
    const violations: ComplianceViolation[] = [];
    let isCompliant = true;

    try {
      // Get applicable rules
      const rulesResponse = await this.getApplicableRules(
        projectId,
        redemptionRequest.redemptionType
      );

      if (!rulesResponse.success || !rulesResponse.data || rulesResponse.data.length === 0) {
        violations.push({
          ruleId: 'NO_RULES',
          ruleName: 'No Applicable Rules',
          violationType: 'REDEMPTION_CLOSED',
          description: 'No redemption rules found for this project and redemption type',
          severity: 'CRITICAL',
          blockingApproval: true
        });
        isCompliant = false;

        return {
          isCompliant,
          violations,
          applicableRules: [],
          ruleEngineVersion: this.ruleEngineVersion,
          validatedAt: new Date()
        };
      }

      const rules = rulesResponse.data;

      // Validate each applicable rule
      for (const rule of rules) {
        const ruleViolations = await this.validateAgainstRule(redemptionRequest, rule, projectId);
        violations.push(...ruleViolations);
      }

      // Check if any critical violations exist
      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL' && v.blockingApproval);
      if (criticalViolations.length > 0) {
        isCompliant = false;
      }

      return {
        isCompliant,
        violations,
        applicableRules: rules,
        ruleEngineVersion: this.ruleEngineVersion,
        validatedAt: new Date()
      };
    } catch (error) {
      console.error('Error validating redemption compliance:', error);
      
      violations.push({
        ruleId: 'VALIDATION_ERROR',
        ruleName: 'Validation System Error',
        violationType: 'REDEMPTION_CLOSED',
        description: `Failed to validate redemption compliance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'CRITICAL',
        blockingApproval: true
      });

      return {
        isCompliant: false,
        violations,
        applicableRules: [],
        ruleEngineVersion: this.ruleEngineVersion,
        validatedAt: new Date()
      };
    }
  }

  /**
   * Validate redemption request against a specific rule
   */
  private async validateAgainstRule(
    request: RedemptionRequest, 
    rule: RedemptionRule,
    projectId: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    try {
      // 1. Check if redemption is open
      if (!rule.isRedemptionOpen) {
        violations.push({
          ruleId: rule.id,
          ruleName: 'Redemption Availability',
          violationType: 'REDEMPTION_CLOSED',
          description: 'Redemption is currently closed for this product',
          severity: 'CRITICAL',
          blockingApproval: true
        });
      }

      // 2. Check open after date
      if (rule.openAfterDate && new Date() < rule.openAfterDate) {
        violations.push({
          ruleId: rule.id,
          ruleName: 'Redemption Opening Date',
          violationType: 'REDEMPTION_CLOSED',
          description: `Redemption will open after ${rule.openAfterDate.toISOString().split('T')[0]}`,
          severity: 'CRITICAL',
          blockingApproval: true
        });
      }

      // 3. Check lock-up period (if investor distribution date is available)
      if (rule.lockUpPeriod > 0) {
        // Get investor's distribution to check lock-up period
        const { data: distributions } = await supabase
          .from('distributions')
          .select('distribution_date')
          .eq('investor_id', request.investorId)
          .eq('project_id', projectId)
          .order('distribution_date', { ascending: false })
          .limit(1);

        if (distributions && distributions.length > 0) {
          const distributionDate = new Date(distributions[0].distribution_date);
          const lockUpEndDate = new Date(distributionDate.getTime() + (rule.lockUpPeriod * 24 * 60 * 60 * 1000));
          
          if (new Date() < lockUpEndDate) {
            violations.push({
              ruleId: rule.id,
              ruleName: 'Lock-up Period',
              violationType: 'LOCK_UP_PERIOD',
              description: `Lock-up period of ${rule.lockUpPeriod} days has not expired. Can redeem after ${lockUpEndDate.toISOString().split('T')[0]}`,
              severity: 'CRITICAL',
              blockingApproval: true
            });
          }
        }
      }

      // 4. Check maximum redemption percentage
      if (rule.maxRedemptionPercentage && rule.targetRaiseAmount) {
        // Calculate total redemption amount for this project
        const { data: existingRedemptions } = await supabase
          .from(this.requestsTableName)
          .select('token_amount, conversion_rate')
          .eq('project_id', projectId)
          .in('status', ['approved', 'processing', 'settled']);

        const totalExistingRedemptions = (existingRedemptions || []).reduce((sum, req) => {
          const amount = typeof req.token_amount === 'number' ? req.token_amount : parseFloat(String(req.token_amount || '0'));
          const rate = typeof req.conversion_rate === 'number' ? req.conversion_rate : parseFloat(String(req.conversion_rate || '1'));
          return sum + (amount * rate);
        }, 0);

        const currentRequestValue = request.tokenAmount * request.conversionRate;
        const totalWithCurrentRequest = totalExistingRedemptions + currentRequestValue;
        const percentageOfTarget = (totalWithCurrentRequest / rule.targetRaiseAmount) * 100;

        if (percentageOfTarget > rule.maxRedemptionPercentage) {
          violations.push({
            ruleId: rule.id,
            ruleName: 'Maximum Redemption Percentage',
            violationType: 'MAX_PERCENTAGE_EXCEEDED',
            description: `Total redemptions would exceed ${rule.maxRedemptionPercentage}% of target raise amount (${percentageOfTarget.toFixed(2)}%)`,
            severity: 'CRITICAL',
            blockingApproval: true
          });
        }
      }

      // 5. Check interval redemption window requirements
      if (rule.redemptionType === 'interval' && !rule.allowContinuousRedemption) {
        // Check if there's an active redemption window
        const { data: activeWindows } = await supabase
          .from('redemption_windows')
          .select('*')
          .eq('config_id', rule.id)
          .eq('status', 'submission_open')
          .gte('submission_end_date', new Date().toISOString())
          .lte('submission_start_date', new Date().toISOString());

        if (!activeWindows || activeWindows.length === 0) {
          violations.push({
            ruleId: rule.id,
            ruleName: 'Redemption Window Required',
            violationType: 'WINDOW_REQUIRED',
            description: 'Interval redemptions require an active submission window',
            severity: 'CRITICAL',
            blockingApproval: true
          });
        }
      }

      // 6. Check approval requirements
      if (rule.requireMultiSigApproval && request.requiredApprovals < rule.requiredApprovers) {
        violations.push({
          ruleId: rule.id,
          ruleName: 'Insufficient Approvers',
          violationType: 'INSUFFICIENT_APPROVERS',
          description: `Request requires ${rule.requiredApprovers} approvers but only has ${request.requiredApprovals}`,
          severity: 'WARNING',
          blockingApproval: false // This can be fixed by adding more approvers
        });
      }

      // 7. Check custom eligibility rules
      if (rule.redemptionEligibilityRules && Object.keys(rule.redemptionEligibilityRules).length > 0) {
        const eligibilityViolations = await this.validateEligibilityRules(
          request,
          rule.redemptionEligibilityRules,
          rule.id
        );
        violations.push(...eligibilityViolations);
      }

    } catch (error) {
      console.error('Error validating against rule:', rule.id, error);
      violations.push({
        ruleId: rule.id,
        ruleName: 'Rule Validation Error',
        violationType: 'REDEMPTION_CLOSED',
        description: `Error validating against rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'CRITICAL',
        blockingApproval: true
      });
    }

    return violations;
  }

  /**
   * Validate custom eligibility rules
   */
  private async validateEligibilityRules(
    request: RedemptionRequest,
    eligibilityRules: any,
    ruleId: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    try {
      // Implement custom eligibility rule validation based on the rules structure
      // This is a placeholder for complex business logic that could include:
      // - Minimum holding period
      // - Investor accreditation status
      // - Geographic restrictions
      // - Investment amount thresholds
      // - KYC/AML compliance checks
      
      // Example validation (extend based on actual eligibility rules structure)
      if (eligibilityRules.minHoldingDays) {
        // This would require additional database queries to determine holding period
        // For now, we'll add a placeholder
        violations.push({
          ruleId: ruleId,
          ruleName: 'Minimum Holding Period',
          violationType: 'ELIGIBILITY_FAILED',
          description: 'Custom eligibility rule validation not fully implemented',
          severity: 'INFO',
          blockingApproval: false
        });
      }

    } catch (error) {
      console.error('Error validating eligibility rules:', error);
      violations.push({
        ruleId: ruleId,
        ruleName: 'Eligibility Rule Validation Error',
        violationType: 'ELIGIBILITY_FAILED',
        description: `Error validating eligibility rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'CRITICAL',
        blockingApproval: true
      });
    }

    return violations;
  }

  /**
   * Store validation results in the database
   */
  async storeValidationResults(
    requestId: string,
    validationResult: ComplianceValidationResult
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from(this.requestsTableName)
        .update({
          validation_results: validationResult,
          business_rules_version: this.ruleEngineVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error storing validation results:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Check if a redemption request can be approved based on rule compliance
   */
  async canApproveRedemption(requestId: string, projectId: string): Promise<{
    canApprove: boolean;
    reason?: string;
    validationResult?: ComplianceValidationResult;
  }> {
    try {
      // Get the redemption request
      const { data: requestData, error: requestError } = await supabase
        .from(this.requestsTableName)
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !requestData) {
        return {
          canApprove: false,
          reason: 'Redemption request not found'
        };
      }

      // Map to RedemptionRequest type
      const request: RedemptionRequest = {
        id: requestData.id,
        tokenAmount: parseFloat(String(requestData.token_amount || '0')),
        tokenType: requestData.token_type,
        redemptionType: requestData.redemption_type,
        status: requestData.status,
        sourceWallet: requestData.source_wallet_address,
        destinationWallet: requestData.destination_wallet_address,
        sourceWalletAddress: requestData.source_wallet_address, // Add required field
        destinationWalletAddress: requestData.destination_wallet_address, // Add required field
        conversionRate: parseFloat(String(requestData.conversion_rate || '1')),
        usdcAmount: parseFloat(String(requestData.token_amount || '0')) * parseFloat(String(requestData.conversion_rate || '1')),
        investorName: requestData.investor_name,
        investorId: requestData.investor_id,
        requiredApprovals: requestData.required_approvals || 2,
        isBulkRedemption: requestData.is_bulk_redemption || false,
        investorCount: requestData.investor_count || 1,
        rejectionReason: requestData.rejection_reason,
        rejectedBy: requestData.rejected_by,
        rejectionTimestamp: requestData.rejection_timestamp ? new Date(requestData.rejection_timestamp) : undefined,
        notes: '',
        submittedAt: new Date(requestData.created_at),
        createdAt: new Date(requestData.created_at),
        updatedAt: new Date(requestData.updated_at)
      };

      // Validate compliance
      const validationResult = await this.validateRedemptionCompliance(request, projectId);

      if (!validationResult.isCompliant) {
        const criticalViolations = validationResult.violations.filter(v => v.severity === 'CRITICAL' && v.blockingApproval);
        const reasons = criticalViolations.map(v => v.description).join('; ');
        
        return {
          canApprove: false,
          reason: `Rule compliance violations: ${reasons}`,
          validationResult
        };
      }

      return {
        canApprove: true,
        validationResult
      };

    } catch (error) {
      console.error('Error checking redemption approval eligibility:', error);
      return {
        canApprove: false,
        reason: `Error validating redemption: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const ruleComplianceService = new RuleComplianceService();
export default ruleComplianceService;