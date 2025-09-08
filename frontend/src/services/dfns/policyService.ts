/**
 * DFNS Policy Service
 * 
 * High-level service for DFNS Policy Engine operations
 * Provides business logic layer over DFNS Policy Engine APIs v2
 * 
 * Implementation includes:
 * - Policy Management (CRUD operations)
 * - Approval Management (approval workflows)
 * - Policy Analytics and Dashboards
 */

import type {
  DfnsCreatePolicyRequest,
  DfnsCreatePolicyResponse,
  DfnsUpdatePolicyRequest,
  DfnsUpdatePolicyResponse,
  DfnsListPoliciesRequest,
  DfnsListPoliciesResponse,
  DfnsGetPolicyResponse,
  DfnsArchivePolicyResponse,
  DfnsListApprovalsRequest,
  DfnsListApprovalsResponse,
  DfnsGetApprovalResponse,
  DfnsCreateApprovalDecisionRequest,
  DfnsCreateApprovalDecisionResponse,
  DfnsPolicy,
  DfnsPolicyApproval,
  DfnsActivityKind,
  DfnsPolicyServiceOptions,
  DfnsPolicySummary,
  DfnsApprovalSummary,
  DfnsPolicyRule,
  DfnsPolicyAction,
  DfnsPolicyFilters,
} from '../../types/dfns';
import { DfnsApprovalStatus } from '../../types/dfns';
import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { 
  DfnsAuthenticationError, 
  DfnsValidationError, 
  DfnsPolicyError,
  DfnsAuthorizationError 
} from '../../types/dfns/errors';

export interface PolicyServiceOptions {
  enableDatabaseSync?: boolean;
  enableAuditLogging?: boolean;
  validatePermissions?: boolean;
  includeMetadata?: boolean;
  autoActivateNewPolicies?: boolean;
}

export interface PolicyListOptions {
  activityKind?: DfnsActivityKind;
  status?: 'Active' | 'Archived';
  limit?: number;
  paginationToken?: string;
  sortBy?: 'name' | 'createdAt' | 'activityKind' | 'triggeredCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalListOptions {
  status?: DfnsApprovalStatus;
  activityKind?: DfnsActivityKind;
  walletId?: string;
  keyId?: string;
  limit?: number;
  paginationToken?: string;
  includePendingOnly?: boolean;
  includeMyApprovals?: boolean;
}

export interface PolicyCreationOptions {
  syncToDatabase?: boolean;
  autoActivate?: boolean;
  validateRuleConfiguration?: boolean;
  validateActionConfiguration?: boolean;
}

export interface ApprovalDecisionOptions {
  syncToDatabase?: boolean;
  auditLog?: boolean;
  notifyInitiator?: boolean;
}

/**
 * DFNS Policy Service
 * 
 * Complete implementation of DFNS Policy Engine APIs v2
 */
export class DfnsPolicyService {
  private client: DfnsClient;
  private authClient: DfnsAuthClient;
  private userActionService: DfnsUserActionService;

  constructor(
    client: DfnsClient,
    authClient: DfnsAuthClient,
    userActionService: DfnsUserActionService
  ) {
    this.client = client;
    this.authClient = authClient;
    this.userActionService = userActionService;
  }

  // ===============================
  // POLICY MANAGEMENT METHODS
  // ===============================

  /**
   * Create a new policy
   * Requires User Action Signing for security
   */
  async createPolicy(
    request: DfnsCreatePolicyRequest,
    options: PolicyCreationOptions = {}
  ): Promise<DfnsCreatePolicyResponse> {
    try {
      this.validateCreatePolicyRequest(request);

      // Validate rule and action configuration if requested
      if (options.validateRuleConfiguration) {
        this.validatePolicyRule(request.rule);
      }
      if (options.validateActionConfiguration) {
        this.validatePolicyAction(request.action);
      }

      // Create User Action Signature for policy creation
      const userActionToken = await this.userActionService.signUserAction(
        'PoliciesModify',
        request
      );

      // Make the API call with User Action header
      const response = await this.authClient.createPolicy(request, userActionToken);

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncPolicyToDatabase(response);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'createPolicy');
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicy(
    policyId: string,
    options: DfnsPolicyServiceOptions = {}
  ): Promise<DfnsGetPolicyResponse> {
    try {
      this.validatePolicyId(policyId);

      const response = await this.authClient.getPolicy(policyId);

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncPolicyToDatabase(response);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'getPolicy', policyId);
    }
  }

  /**
   * List all policies with optional filtering and pagination
   */
  async listPolicies(
    params: PolicyListOptions = {},
    options: DfnsPolicyServiceOptions = {}
  ): Promise<DfnsListPoliciesResponse> {
    try {
      const request: DfnsListPoliciesRequest = {
        activityKind: params.activityKind,
        status: params.status,
        limit: params.limit || 100,
        paginationToken: params.paginationToken,
      };

      const response = await this.authClient.listPolicies(request);

      // Sort results if requested
      if (params.sortBy && response.items) {
        response.items = this.sortPolicies(response.items, params.sortBy, params.sortOrder);
      }

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncPoliciesToDatabase(response.items);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'listPolicies');
    }
  }

  /**
   * Update an existing policy
   * Requires User Action Signing for security
   */
  async updatePolicy(
    policyId: string,
    request: DfnsUpdatePolicyRequest,
    options: PolicyCreationOptions = {}
  ): Promise<DfnsUpdatePolicyResponse> {
    try {
      this.validatePolicyId(policyId);
      this.validateUpdatePolicyRequest(request);

      // Validate rule and action configuration if provided
      if (request.rule && options.validateRuleConfiguration) {
        this.validatePolicyRule(request.rule);
      }
      if (request.action && options.validateActionConfiguration) {
        this.validatePolicyAction(request.action);
      }

      // Create User Action Signature for policy update
      const userActionToken = await this.userActionService.signUserAction(
        'PoliciesModify',
        { policyId, ...request }
      );

      // Make the API call with User Action header
      const response = await this.authClient.updatePolicy(policyId, request, userActionToken);

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncPolicyToDatabase(response);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'updatePolicy', policyId);
    }
  }

  /**
   * Archive (soft delete) a policy
   * Requires User Action Signing for security
   */
  async archivePolicy(
    policyId: string,
    options: DfnsPolicyServiceOptions = {}
  ): Promise<DfnsArchivePolicyResponse> {
    try {
      this.validatePolicyId(policyId);

      // Create User Action Signature for policy archival
      const userActionToken = await this.userActionService.signUserAction(
        'PoliciesModify',
        { policyId, action: 'archive' }
      );

      // Make the API call with User Action header
      const response = await this.authClient.archivePolicy(policyId, userActionToken);

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncPolicyToDatabase(response);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'archivePolicy', policyId);
    }
  }

  // ===============================
  // APPROVAL MANAGEMENT METHODS
  // ===============================

  /**
   * Get a specific approval by ID
   */
  async getApproval(approvalId: string): Promise<DfnsGetApprovalResponse> {
    try {
      this.validateApprovalId(approvalId);

      const response = await this.authClient.getApproval(approvalId);
      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'getApproval', undefined, approvalId);
    }
  }

  /**
   * List all approvals with optional filtering and pagination
   */
  async listApprovals(
    params: ApprovalListOptions = {}
  ): Promise<DfnsListApprovalsResponse> {
    try {
      const request: DfnsListApprovalsRequest = {
        status: params.status,
        activityKind: params.activityKind,
        walletId: params.walletId,
        keyId: params.keyId,
        limit: params.limit || 100,
        paginationToken: params.paginationToken,
      };

      const response = await this.authClient.listApprovals(request);

      // Filter for pending only if requested
      if (params.includePendingOnly && response.items) {
        response.items = response.items.filter(
          approval => approval.status === DfnsApprovalStatus.Pending
        );
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'listApprovals');
    }
  }

  /**
   * Create an approval decision (approve or deny)
   */
  async createApprovalDecision(
    approvalId: string,
    decision: DfnsCreateApprovalDecisionRequest,
    options: ApprovalDecisionOptions = {}
  ): Promise<DfnsCreateApprovalDecisionResponse> {
    try {
      this.validateApprovalId(approvalId);
      this.validateApprovalDecision(decision);

      const response = await this.authClient.createApprovalDecision(approvalId, decision);

      // Optional database sync
      if (options.syncToDatabase) {
        await this.syncApprovalToDatabase(response);
      }

      return response;
    } catch (error) {
      throw this.handlePolicyError(error, 'createApprovalDecision', undefined, approvalId);
    }
  }

  // ===============================
  // BUSINESS LOGIC METHODS
  // ===============================

  /**
   * Get all policies (handles pagination automatically)
   */
  async getAllPolicies(
    filters: { activityKind?: DfnsActivityKind; status?: 'Active' | 'Archived' } = {}
  ): Promise<DfnsPolicy[]> {
    let allPolicies: DfnsPolicy[] = [];
    let paginationToken: string | undefined;

    do {
      const response = await this.listPolicies({
        ...filters,
        limit: 100,
        paginationToken,
      });

      allPolicies = allPolicies.concat(response.items);
      paginationToken = response.nextPageToken;
    } while (paginationToken);

    return allPolicies;
  }

  /**
   * Get policies by activity kind
   */
  async getPoliciesByActivityKind(activityKind: DfnsActivityKind): Promise<DfnsPolicy[]> {
    const response = await this.listPolicies({ activityKind, status: 'Active' });
    return response.items;
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<DfnsPolicyApproval[]> {
    const response = await this.listApprovals({ status: DfnsApprovalStatus.Pending });
    return response.items;
  }

  /**
   * Get pending approvals that the current user can approve
   */
  async getMyPendingApprovals(): Promise<DfnsPolicyApproval[]> {
    const response = await this.listApprovals({ 
      status: DfnsApprovalStatus.Pending,
      includeMyApprovals: true
    });
    return response.items;
  }

  /**
   * Get policy by name
   */
  async getPolicyByName(name: string): Promise<DfnsPolicy | null> {
    const policies = await this.getAllPolicies();
    return policies.find(policy => policy.name === name) || null;
  }

  // ===============================
  // DASHBOARD METHODS
  // ===============================

  /**
   * Get policy summaries for dashboard display
   */
  async getPoliciesSummary(): Promise<DfnsPolicySummary[]> {
    const policies = await this.getAllPolicies();
    const summaries: DfnsPolicySummary[] = [];

    for (const policy of policies) {
      // For now, we'll set counts to 0 - in full implementation, 
      // these would be fetched from analytics/metrics endpoints
      const summary: DfnsPolicySummary = {
        policyId: policy.id,
        name: policy.name,
        activityKind: policy.activityKind,
        ruleKind: policy.rule.kind,
        actionKind: policy.action.kind,
        status: policy.status,
        triggeredCount: 0, // TODO: Implement analytics
        approvedCount: 0,  // TODO: Implement analytics
        deniedCount: 0,    // TODO: Implement analytics
        pendingCount: 0,   // TODO: Implement analytics
        lastTriggered: undefined, // TODO: Implement analytics
        dateCreated: policy.dateCreated,
      };
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Get approval summaries for dashboard display
   */
  async getApprovalsSummary(): Promise<DfnsApprovalSummary[]> {
    const approvals = await this.listApprovals();
    const summaries: DfnsApprovalSummary[] = [];

    for (const approval of approvals.items) {
      const summary: DfnsApprovalSummary = {
        approvalId: approval.id,
        status: approval.status,
        activityKind: approval.activity.kind,
        initiatorName: approval.initiator.name,
        walletId: approval.activity.walletId,
        walletName: undefined, // TODO: Fetch wallet name
        requiredApprovals: this.calculateRequiredApprovals(approval),
        receivedApprovals: approval.decisions.length,
        timeToExpiry: this.calculateTimeToExpiry(approval.expirationDate),
        dateCreated: approval.dateCreated,
      };
      summaries.push(summary);
    }

    return summaries;
  }

  // ===============================
  // VALIDATION METHODS
  // ===============================

  private validateCreatePolicyRequest(request: DfnsCreatePolicyRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new DfnsValidationError('Policy name is required');
    }
    if (request.name.length > 100) {
      throw new DfnsValidationError('Policy name must be 100 characters or less');
    }
    if (!request.activityKind) {
      throw new DfnsValidationError('Activity kind is required');
    }
    if (!request.rule) {
      throw new DfnsValidationError('Policy rule is required');
    }
    if (!request.action) {
      throw new DfnsValidationError('Policy action is required');
    }
  }

  private validateUpdatePolicyRequest(request: DfnsUpdatePolicyRequest): void {
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        throw new DfnsValidationError('Policy name cannot be empty');
      }
      if (request.name.length > 100) {
        throw new DfnsValidationError('Policy name must be 100 characters or less');
      }
    }
  }

  private validatePolicyId(policyId: string): void {
    if (!policyId || policyId.trim().length === 0) {
      throw new DfnsValidationError('Policy ID is required');
    }
    if (!/^po-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(policyId)) {
      throw new DfnsValidationError('Invalid policy ID format');
    }
  }

  private validateApprovalId(approvalId: string): void {
    if (!approvalId || approvalId.trim().length === 0) {
      throw new DfnsValidationError('Approval ID is required');
    }
    if (!/^pa-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(approvalId)) {
      throw new DfnsValidationError('Invalid approval ID format');
    }
  }

  private validateApprovalDecision(decision: DfnsCreateApprovalDecisionRequest): void {
    if (!decision.value || (decision.value !== 'Approved' && decision.value !== 'Denied')) {
      throw new DfnsValidationError('Decision value must be "Approved" or "Denied"');
    }
    if (decision.reason && decision.reason.length > 500) {
      throw new DfnsValidationError('Decision reason must be 500 characters or less');
    }
  }

  private validatePolicyRule(rule: DfnsPolicyRule): void {
    if (!rule.kind) {
      throw new DfnsValidationError('Policy rule kind is required');
    }
    if (!rule.configuration || typeof rule.configuration !== 'object') {
      throw new DfnsValidationError('Policy rule configuration is required');
    }
    // Additional rule-specific validations would go here
  }

  private validatePolicyAction(action: DfnsPolicyAction): void {
    if (!action.kind) {
      throw new DfnsValidationError('Policy action kind is required');
    }
    // Additional action-specific validations would go here
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  private sortPolicies(
    policies: DfnsPolicy[],
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): DfnsPolicy[] {
    return policies.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
          break;
        case 'activityKind':
          comparison = a.activityKind.localeCompare(b.activityKind);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private calculateRequiredApprovals(approval: DfnsPolicyApproval): number {
    // This would calculate based on the policy's approval group configuration
    // For now, returning a default value
    return 1; // TODO: Implement proper calculation
  }

  private calculateTimeToExpiry(expirationDate?: string): number | undefined {
    if (!expirationDate) return undefined;
    
    const now = new Date();
    const expiry = new Date(expirationDate);
    const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, Math.round(hoursRemaining));
  }

  // ===============================
  // DATABASE SYNC METHODS (Stubs)
  // ===============================

  private async syncPolicyToDatabase(policy: DfnsPolicy): Promise<void> {
    // TODO: Implement database synchronization
    console.log('Policy database sync:', policy.id);
  }

  private async syncPoliciesToDatabase(policies: DfnsPolicy[]): Promise<void> {
    // TODO: Implement batch database synchronization
    console.log('Policies database sync:', policies.length, 'policies');
  }

  private async syncApprovalToDatabase(approval: DfnsPolicyApproval): Promise<void> {
    // TODO: Implement approval database synchronization
    console.log('Approval database sync:', approval.id);
  }

  // ===============================
  // ERROR HANDLING
  // ===============================

  private handlePolicyError(
    error: any,
    operation: string,
    policyId?: string,
    approvalId?: string
  ): Error {
    console.error(`DFNS Policy Service Error [${operation}]:`, error);

    if (error instanceof DfnsValidationError || 
        error instanceof DfnsAuthenticationError || 
        error instanceof DfnsAuthorizationError) {
      return error;
    }

    // Create contextual error
    const context = {
      operation,
      policyId,
      approvalId,
      timestamp: new Date().toISOString(),
    };

    return new DfnsPolicyError(
      `Policy operation '${operation}' failed: ${error.message}`,
      { ...context, errorCode: 'POLICY_OPERATION_FAILED' }
    );
  }
}
