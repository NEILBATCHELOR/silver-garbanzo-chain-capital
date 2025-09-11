/**
 * DFNS Policy Engine Service
 * 
 * Main orchestrator service for DFNS Policy Engine operations:
 * - Policy management
 * - Approval workflows
 * - Analytics and reporting
 * - Database synchronization
 * 
 * Based on DFNS Policy Engine API:
 * https://docs.dfns.co/d/api-docs/policy-engine
 */

import type { 
  DfnsPolicy,
  DfnsApproval,
  DfnsCreatePolicyRequest,
  DfnsUpdatePolicyRequest,
  DfnsCreateApprovalDecisionRequest,
  DfnsPolicyServiceResponse,
  DfnsPolicyStatistics,
  DfnsApprovalStatistics,
  DfnsActivityKind,
  DfnsPolicyStatus,
  DfnsApprovalStatus,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
  DfnsRequestApprovalAction,
  DfnsTransactionAmountLimitRule,
  DfnsTransactionAmountVelocityRule,
  DfnsTransactionCountVelocityRule,
  DfnsTransactionRecipientWhitelistRule
} from '../../types/dfns/policy-engine';

import { isRequestApprovalAction } from '../../types/dfns/policy-engine';

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsPolicyEngineError } from '../../types/dfns/policy-engine';
import { DfnsPolicyService, getDfnsPolicyService } from './policyService';
import { DfnsPolicyApprovalService, getDfnsPolicyApprovalService } from './policyApprovalService';

export interface DfnsPolicyEngineOverview {
  policies: {
    total: number;
    active: number;
    archived: number;
    byActivityKind: Record<DfnsActivityKind, number>;
    byRuleKind: Record<DfnsPolicyRuleKind, number>;
    byActionKind: Record<DfnsPolicyActionKind, number>;
  };
  approvals: {
    total: number;
    pending: number;
    approved: number;
    denied: number;
    expired: number;
    averageApprovalTime?: number;
    byActivityKind: Record<DfnsActivityKind, number>;
  };
  recentActivity: {
    recentPolicies: DfnsPolicy[];
    pendingApprovals: DfnsApproval[];
    recentDecisions: DfnsApproval[];
  };
  lastUpdated: string;
}

export interface DfnsPolicyTemplateRequest {
  name: string;
  description?: string;
  activityKind: DfnsActivityKind;
  templateType: 
    | 'transaction_amount_limit'
    | 'transaction_velocity_limit'
    | 'recipient_whitelist'
    | 'always_approve'
    | 'always_block';
  config: {
    // For amount limits
    amount?: number;
    currency?: string;
    // For velocity limits  
    timeframe?: number; // minutes
    count?: number;
    // For whitelist
    addresses?: string[];
    // For approval workflow
    approvers?: string[]; // user IDs
    quorum?: number;
    autoRejectTimeout?: number; // minutes
  };
  walletFilters?: {
    walletIds?: string[];
    walletTags?: string[];
  };
}

export class DfnsPolicyEngineService {
  private workingClient: WorkingDfnsClient;
  private policyService: DfnsPolicyService;
  private approvalService: DfnsPolicyApprovalService;

  constructor(workingClient: WorkingDfnsClient) {
    this.workingClient = workingClient;
    this.policyService = getDfnsPolicyService(workingClient);
    this.approvalService = getDfnsPolicyApprovalService(workingClient);
  }

  // ==============================================
  // ORCHESTRATION METHODS
  // ==============================================

  /**
   * Get comprehensive policy engine overview
   */
  async getPolicyEngineOverview(): Promise<DfnsPolicyServiceResponse<DfnsPolicyEngineOverview>> {
    try {
      console.log('📊 Getting DFNS Policy Engine overview...');

      // Get statistics from both services
      const [policyStats, approvalStats] = await Promise.all([
        this.policyService.getPolicyStatistics(),
        this.approvalService.getApprovalStatistics()
      ]);

      // Get recent activity
      const [recentPoliciesResponse, pendingApprovalsResponse] = await Promise.all([
        this.policyService.listPolicies({ limit: 5, status: 'Active' }),
        this.approvalService.getPendingApprovals()
      ]);

      // Get recent decisions (approved/denied in last 7 days)
      const allApprovalsResponse = await this.approvalService.listApprovals({ limit: 50 });
      const recentDecisions = (allApprovalsResponse.data?.items || [])
        .filter(approval => {
          if (approval.status !== 'Approved' && approval.status !== 'Denied') return false;
          const updatedDate = new Date(approval.dateUpdated);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return updatedDate > sevenDaysAgo;
        })
        .slice(0, 10);

      const overview: DfnsPolicyEngineOverview = {
        policies: {
          total: policyStats.data?.totalPolicies || 0,
          active: policyStats.data?.activePolicies || 0,
          archived: policyStats.data?.archivedPolicies || 0,
          byActivityKind: this.ensureCompleteActivityKindRecord(policyStats.data?.policiesByActivityKind || {}),
          byRuleKind: this.ensureCompleteRuleKindRecord(policyStats.data?.policiesByRuleKind || {}),
          byActionKind: this.ensureCompleteActionKindRecord(policyStats.data?.policiesByActionKind || {})
        },
        approvals: {
          total: approvalStats.data?.totalApprovals || 0,
          pending: approvalStats.data?.pendingApprovals || 0,
          approved: approvalStats.data?.approvedApprovals || 0,
          denied: approvalStats.data?.deniedApprovals || 0,
          expired: approvalStats.data?.expiredApprovals || 0,
          averageApprovalTime: approvalStats.data?.averageApprovalTime,
          byActivityKind: this.ensureCompleteActivityKindRecord(approvalStats.data?.approvalsByActivityKind || {})
        },
        recentActivity: {
          recentPolicies: recentPoliciesResponse.data?.items || [],
          pendingApprovals: pendingApprovalsResponse.data?.slice(0, 10) || [],
          recentDecisions
        },
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        data: overview,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get policy engine overview:', error);
      throw new DfnsPolicyEngineError(
        `Failed to get policy engine overview: ${error}`,
        'OVERVIEW_FAILED'
      );
    }
  }

  /**
   * Create policy from template
   * 
   * @param template - Policy template configuration
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   */
  async createPolicyFromTemplate(
    template: DfnsPolicyTemplateRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsPolicy>> {
    try {
      console.log('🏗️ Creating policy from template:', template.templateType);

      const policyRequest = this.buildPolicyFromTemplate(template);
      
      return await this.policyService.createPolicy(
        policyRequest,
        userActionToken,
        options
      );
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to create policy from template: ${error}`,
        'TEMPLATE_POLICY_FAILED',
        { template }
      );
    }
  }

  /**
   * Get policy compliance status for wallets
   * 
   * @param walletIds - Wallet IDs to check
   */
  async getWalletPolicyCompliance(
    walletIds: string[]
  ): Promise<DfnsPolicyServiceResponse<Record<string, { 
    applicablePolicies: DfnsPolicy[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>>> {
    try {
      console.log('🔍 Checking wallet policy compliance for', walletIds.length, 'wallets');

      // Get all active wallet signing policies
      const walletPoliciesResponse = await this.policyService.getWalletSigningPolicies();
      const allWalletPolicies = walletPoliciesResponse.data || [];

      const compliance: Record<string, any> = {};

      for (const walletId of walletIds) {
        // Find policies that apply to this wallet
        const applicablePolicies = allWalletPolicies.filter(policy => 
          this.doesPolicyApplyToWallet(policy, walletId)
        );

        // Assess risk level based on policies
        const riskLevel = this.assessWalletRiskLevel(applicablePolicies);

        // Generate recommendations
        const recommendations = this.generateWalletRecommendations(applicablePolicies, walletId);

        compliance[walletId] = {
          applicablePolicies,
          riskLevel,
          recommendations
        };
      }

      return {
        success: true,
        data: compliance,
        metadata: {
          timestamp: new Date().toISOString(),
          walletsChecked: walletIds.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to check wallet policy compliance: ${error}`,
        'COMPLIANCE_CHECK_FAILED',
        { walletIds }
      );
    }
  }

  /**
   * Get approval queue for user
   * 
   * @param userId - User ID
   */
  async getUserApprovalQueue(userId: string): Promise<DfnsPolicyServiceResponse<{
    pendingApprovals: DfnsApproval[];
    awaitingMyApproval: DfnsApproval[];
    myInitiatedApprovals: DfnsApproval[];
    statistics: {
      totalPending: number;
      awaitingMe: number;
      myInitiated: number;
    };
  }>> {
    try {
      console.log('📝 Getting approval queue for user:', userId);

      // Get all pending approvals
      const pendingApprovalsResponse = await this.approvalService.getPendingApprovals();
      const allPendingApprovals = pendingApprovalsResponse.data || [];

      // Get approvals initiated by user
      const initiatedApprovalsResponse = await this.approvalService.getApprovalsForUser(userId, 'initiator');
      const myInitiatedApprovals = (initiatedApprovalsResponse.data || [])
        .filter(approval => approval.status === 'Pending');

      // Filter approvals awaiting this user's decision
      const awaitingMyApproval = allPendingApprovals.filter(approval => 
        this.canUserApprove(approval, userId) && 
        !this.hasUserAlreadyDecided(approval, userId)
      );

      const queue = {
        pendingApprovals: allPendingApprovals,
        awaitingMyApproval,
        myInitiatedApprovals,
        statistics: {
          totalPending: allPendingApprovals.length,
          awaitingMe: awaitingMyApproval.length,
          myInitiated: myInitiatedApprovals.length
        }
      };

      return {
        success: true,
        data: queue,
        metadata: {
          timestamp: new Date().toISOString(),
          userId
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get user approval queue: ${error}`,
        'USER_QUEUE_FAILED',
        { userId }
      );
    }
  }

  // ==============================================
  // CONVENIENCE METHODS (DELEGATE TO SERVICES)
  // ==============================================

  /**
   * Create policy (delegates to policy service)
   */
  async createPolicy(
    request: DfnsCreatePolicyRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsPolicy>> {
    return this.policyService.createPolicy(request, userActionToken, options);
  }

  /**
   * Get policy (delegates to policy service)
   */
  async getPolicy(policyId: string): Promise<DfnsPolicyServiceResponse<DfnsPolicy>> {
    return this.policyService.getPolicy(policyId);
  }

  /**
   * Update policy (delegates to policy service)
   */
  async updatePolicy(
    policyId: string,
    request: DfnsUpdatePolicyRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<any>> {
    return this.policyService.updatePolicy(policyId, request, userActionToken, options);
  }

  /**
   * Archive policy (delegates to policy service)
   */
  async archivePolicy(
    policyId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<any>> {
    return this.policyService.archivePolicy(policyId, userActionToken, options);
  }

  /**
   * Get approval (delegates to approval service)
   */
  async getApproval(approvalId: string): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    return this.approvalService.getApproval(approvalId);
  }

  /**
   * Approve approval (delegates to approval service)
   */
  async approveApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    return this.approvalService.approveApproval(approvalId, reason, userActionToken, options);
  }

  /**
   * Deny approval (delegates to approval service)
   */
  async denyApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    return this.approvalService.denyApproval(approvalId, reason, userActionToken, options);
  }

  // ==============================================
  // TEMPLATE BUILDERS
  // ==============================================

  /**
   * Build policy request from template
   */
  private buildPolicyFromTemplate(template: DfnsPolicyTemplateRequest): DfnsCreatePolicyRequest {
    const baseRequest: DfnsCreatePolicyRequest = {
      name: template.name,
      activityKind: template.activityKind,
      rule: this.buildRuleFromTemplate(template),
      action: this.buildActionFromTemplate(template),
      filters: this.buildFiltersFromTemplate(template)
    };

    return baseRequest;
  }

  /**
   * Build rule from template
   */
  private buildRuleFromTemplate(template: DfnsPolicyTemplateRequest): any {
    switch (template.templateType) {
      case 'transaction_amount_limit':
        return {
          kind: 'TransactionAmountLimit',
          configuration: {
            limit: template.config.amount || 1000,
            currency: template.config.currency || 'USD'
          }
        } as DfnsTransactionAmountLimitRule;

      case 'transaction_velocity_limit':
        return {
          kind: 'TransactionAmountVelocity',
          configuration: {
            limit: template.config.amount || 10000,
            currency: template.config.currency || 'USD',
            timeframe: template.config.timeframe || 1440 // 24 hours
          }
        } as DfnsTransactionAmountVelocityRule;

      case 'recipient_whitelist':
        return {
          kind: 'TransactionRecipientWhitelist',
          configuration: {
            addresses: template.config.addresses || []
          }
        } as DfnsTransactionRecipientWhitelistRule;

      case 'always_approve':
      case 'always_block':
        return {
          kind: 'AlwaysTrigger'
        };

      default:
        throw new DfnsPolicyEngineError(
          `Unknown template type: ${template.templateType}`,
          'UNKNOWN_TEMPLATE_TYPE'
        );
    }
  }

  /**
   * Build action from template
   */
  private buildActionFromTemplate(template: DfnsPolicyTemplateRequest): any {
    switch (template.templateType) {
      case 'always_block':
        return { kind: 'Block' };

      case 'transaction_amount_limit':
      case 'transaction_velocity_limit':
      case 'recipient_whitelist':
      case 'always_approve':
        return {
          kind: 'RequestApproval',
          autoRejectTimeout: template.config.autoRejectTimeout || 60,
          approvalGroups: [{
            name: 'Default Approvers',
            quorum: template.config.quorum || 1,
            approvers: template.config.approvers?.length ? {
              userId: { in: template.config.approvers }
            } : {}
          }]
        } as DfnsRequestApprovalAction;

      default:
        throw new DfnsPolicyEngineError(
          `Unknown template type: ${template.templateType}`,
          'UNKNOWN_TEMPLATE_TYPE'
        );
    }
  }

  /**
   * Build filters from template
   */
  private buildFiltersFromTemplate(template: DfnsPolicyTemplateRequest): any {
    if (!template.walletFilters) return undefined;

    const filters: any = {};

    if (template.walletFilters.walletIds?.length) {
      filters.walletId = {
        in: template.walletFilters.walletIds
      };
    }

    if (template.walletFilters.walletTags?.length) {
      filters.walletTags = {
        hasAny: template.walletFilters.walletTags
      };
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  // ==============================================
  // HELPER METHODS
  // ==============================================

  /**
   * Ensure complete activity kind record with all enum values
   */
  private ensureCompleteActivityKindRecord(partial: Partial<Record<DfnsActivityKind, number>>): Record<DfnsActivityKind, number> {
    return {
      'Wallets:Sign': partial['Wallets:Sign'] || 0,
      'Wallets:IncomingTransaction': partial['Wallets:IncomingTransaction'] || 0,
      'Permissions:Assign': partial['Permissions:Assign'] || 0,
      'Permissions:Modify': partial['Permissions:Modify'] || 0,
      'Policies:Modify': partial['Policies:Modify'] || 0
    };
  }

  /**
   * Ensure complete rule kind record with all enum values
   */
  private ensureCompleteRuleKindRecord(partial: Partial<Record<DfnsPolicyRuleKind, number>>): Record<DfnsPolicyRuleKind, number> {
    return {
      'AlwaysTrigger': partial['AlwaysTrigger'] || 0,
      'TransactionAmountLimit': partial['TransactionAmountLimit'] || 0,
      'TransactionAmountVelocity': partial['TransactionAmountVelocity'] || 0,
      'TransactionCountVelocity': partial['TransactionCountVelocity'] || 0,
      'TransactionRecipientWhitelist': partial['TransactionRecipientWhitelist'] || 0,
      'ChainalysisTransactionPrescreening': partial['ChainalysisTransactionPrescreening'] || 0,
      'ChainalysisTransactionScreening': partial['ChainalysisTransactionScreening'] || 0
    };
  }

  /**
   * Ensure complete action kind record with all enum values
   */
  private ensureCompleteActionKindRecord(partial: Partial<Record<DfnsPolicyActionKind, number>>): Record<DfnsPolicyActionKind, number> {
    return {
      'Block': partial['Block'] || 0,
      'RequestApproval': partial['RequestApproval'] || 0,
      'NoAction': partial['NoAction'] || 0
    };
  }

  /**
   * Check if policy applies to wallet
   */
  private doesPolicyApplyToWallet(policy: DfnsPolicy, walletId: string): boolean {
    if (!policy.filters) return true;

    const filters = policy.filters as any;

    // Check wallet ID filter
    if (filters.walletId?.in) {
      return filters.walletId.in.includes(walletId);
    }

    // If no specific wallet filters, policy applies
    return true;
  }

  /**
   * Assess wallet risk level based on applicable policies
   */
  private assessWalletRiskLevel(policies: DfnsPolicy[]): 'low' | 'medium' | 'high' {
    if (policies.length === 0) return 'high'; // No policies = high risk

    const hasBlockPolicies = policies.some(p => p.action.kind === 'Block');
    const hasApprovalPolicies = policies.some(p => p.action.kind === 'RequestApproval');
    const hasAmountLimits = policies.some(p => p.rule.kind === 'TransactionAmountLimit');

    if (hasBlockPolicies && hasAmountLimits) return 'low';
    if (hasApprovalPolicies && hasAmountLimits) return 'medium';
    return 'high';
  }

  /**
   * Generate recommendations for wallet policy setup
   */
  private generateWalletRecommendations(policies: DfnsPolicy[], walletId: string): string[] {
    const recommendations: string[] = [];

    if (policies.length === 0) {
      recommendations.push('Consider adding transaction amount limits');
      recommendations.push('Set up approval workflows for sensitive operations');
      return recommendations;
    }

    const hasAmountLimits = policies.some(p => p.rule.kind === 'TransactionAmountLimit');
    const hasVelocityLimits = policies.some(p => p.rule.kind === 'TransactionAmountVelocity');
    const hasWhitelist = policies.some(p => p.rule.kind === 'TransactionRecipientWhitelist');

    if (!hasAmountLimits) {
      recommendations.push('Add transaction amount limits for better security');
    }

    if (!hasVelocityLimits) {
      recommendations.push('Consider velocity limits to prevent rapid draining');
    }

    if (!hasWhitelist) {
      recommendations.push('Set up recipient whitelists for critical wallets');
    }

    return recommendations;
  }

  /**
   * Check if user can approve an approval
   */
  private canUserApprove(approval: DfnsApproval, userId: string): boolean {
    // User cannot approve their own initiated approval
    if (approval.initiatorId === userId) return false;

    // Check if user is in any approval group (simplified check)
    // In reality, this would need to check the actual policy approval groups
    return true;
  }

  /**
   * Check if user has already made a decision
   */
  private hasUserAlreadyDecided(approval: DfnsApproval, userId: string): boolean {
    return approval.decisions.some(decision => decision.userId === userId);
  }

  /**
   * Get policy service
   */
  getPolicyService(): DfnsPolicyService {
    return this.policyService;
  }

  /**
   * Get approval service
   */
  getApprovalService(): DfnsPolicyApprovalService {
    return this.approvalService;
  }
}

// ==============================================
// GLOBAL SERVICE INSTANCE
// ==============================================

let globalDfnsPolicyEngineService: DfnsPolicyEngineService | null = null;

/**
 * Get or create the global DFNS Policy Engine service instance
 */
export function getDfnsPolicyEngineService(workingClient?: WorkingDfnsClient): DfnsPolicyEngineService {
  if (!globalDfnsPolicyEngineService) {
    if (!workingClient) {
      throw new DfnsPolicyEngineError('WorkingDfnsClient is required for DfnsPolicyEngineService initialization', 'CLIENT_REQUIRED');
    }
    globalDfnsPolicyEngineService = new DfnsPolicyEngineService(workingClient);
  }
  return globalDfnsPolicyEngineService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsPolicyEngineService(): void {
  globalDfnsPolicyEngineService = null;
}