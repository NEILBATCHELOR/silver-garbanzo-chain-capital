/**
 * DFNS Policy Approval Service
 * 
 * Handles DFNS Policy Engine approval operations:
 * - Approval listing and retrieval
 * - Approval decision creation
 * - Database synchronization
 * 
 * Based on DFNS Policy Engine API:
 * https://docs.dfns.co/d/api-docs/policy-engine/api-reference
 */

import type { 
  DfnsApproval,
  DfnsListApprovalsRequest,
  DfnsListApprovalsResponse,
  DfnsCreateApprovalDecisionRequest,
  DfnsApprovalStatus,
  DfnsTriggerStatus,
  DfnsPolicyServiceResponse,
  DfnsApprovalStatistics,
  DfnsPolicyApprovalEntity,
  DfnsPolicyApprovalDecisionEntity,
  DfnsPolicyEvaluationEntity,
  DfnsActivityKind
} from '../../types/dfns/policy-engine';

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsPolicyEngineError } from '../../types/dfns/policy-engine';
import { createClient } from '@supabase/supabase-js';

export class DfnsPolicyApprovalService {
  private workingClient: WorkingDfnsClient;
  private supabase;

  constructor(workingClient: WorkingDfnsClient) {
    this.workingClient = workingClient;
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
  }

  // ==============================================
  // APPROVAL OPERATIONS
  // ==============================================

  /**
   * Get an approval by ID
   * 
   * @param approvalId - DFNS approval ID
   * @returns Approval details
   */
  async getApproval(approvalId: string): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    try {
      console.log('🔍 Getting DFNS approval:', approvalId);

      const approval = await this.workingClient.makeRequest<DfnsApproval>(
        'GET',
        `/v2/policy-approvals/${approvalId}`
      );

      return {
        success: true,
        data: approval,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get DFNS approval:', error);
      throw new DfnsPolicyEngineError(
        `Failed to get approval ${approvalId}: ${error}`,
        'APPROVAL_GET_FAILED',
        { approvalId }
      );
    }
  }

  /**
   * List approvals with filtering and pagination
   * 
   * @param request - List parameters
   * @returns Approval list
   */
  async listApprovals(
    request: DfnsListApprovalsRequest = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsListApprovalsResponse>> {
    try {
      console.log('📋 Listing DFNS approvals:', request);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (request.limit) queryParams.append('limit', request.limit.toString());
      if (request.paginationToken) queryParams.append('paginationToken', request.paginationToken);
      if (request.status) queryParams.append('status', request.status);
      if (request.triggerStatus) queryParams.append('triggerStatus', request.triggerStatus);
      if (request.initiatorId) queryParams.append('initiatorId', request.initiatorId);
      if (request.approverId) queryParams.append('approverId', request.approverId);

      const endpoint = `/v2/policy-approvals${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await this.workingClient.makeRequest<DfnsListApprovalsResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} DFNS approvals`);

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to list DFNS approvals:', error);
      throw new DfnsPolicyEngineError(
        `Failed to list approvals: ${error}`,
        'APPROVAL_LIST_FAILED',
        { request }
      );
    }
  }

  /**
   * Create an approval decision (approve or deny)
   * 
   * @param approvalId - DFNS approval ID
   * @param decision - Approval decision
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Updated approval
   */
  async createApprovalDecision(
    approvalId: string,
    decision: DfnsCreateApprovalDecisionRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    try {
      console.log(`${decision.value === 'Approved' ? '✅' : '❌'} Creating approval decision:`, approvalId, decision.value);

      if (!userActionToken) {
        console.warn('⚠️ Creating approval decision without User Action token - may require Policies:Approvals:Approve permission');
      }

      // Validate decision
      if (!['Approved', 'Denied'].includes(decision.value)) {
        throw new DfnsPolicyEngineError('Decision value must be "Approved" or "Denied"', 'INVALID_DECISION');
      }

      // Make API call to DFNS
      const approval = await this.workingClient.makeRequest<DfnsApproval>(
        'POST',
        `/v2/policy-approvals/${approvalId}/decisions`,
        decision,
        userActionToken
      );

      console.log(`✅ Approval decision created: ${decision.value} for ${approvalId}`);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncApprovalToDatabase(approval);
        await this.syncApprovalDecisionToDatabase(approvalId, decision, approval);
      }

      return {
        success: true,
        data: approval,
        metadata: {
          timestamp: new Date().toISOString(),
          syncedToDatabase: options.syncToDatabase,
          decisionValue: decision.value
        }
      };
    } catch (error) {
      console.error('❌ Failed to create approval decision:', error);
      throw new DfnsPolicyEngineError(
        `Failed to create approval decision for ${approvalId}: ${error}`,
        'APPROVAL_DECISION_FAILED',
        { approvalId, decision, hasUserAction: !!userActionToken }
      );
    }
  }

  // ==============================================
  // CONVENIENCE METHODS
  // ==============================================

  /**
   * Approve an approval
   * 
   * @param approvalId - DFNS approval ID
   * @param reason - Optional reason for approval
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   */
  async approveApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    return this.createApprovalDecision(
      approvalId,
      { value: 'Approved', reason },
      userActionToken,
      options
    );
  }

  /**
   * Deny an approval
   * 
   * @param approvalId - DFNS approval ID
   * @param reason - Optional reason for denial
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   */
  async denyApproval(
    approvalId: string,
    reason?: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval>> {
    return this.createApprovalDecision(
      approvalId,
      { value: 'Denied', reason },
      userActionToken,
      options
    );
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<DfnsPolicyServiceResponse<DfnsApproval[]>> {
    try {
      const response = await this.listApprovals({ status: 'Pending', limit: 100 });
      
      let allApprovals = response.data?.items || [];
      let nextPageToken = response.data?.nextPageToken;

      // Fetch all pages
      while (nextPageToken) {
        const nextPage = await this.listApprovals({ 
          status: 'Pending', 
          limit: 100, 
          paginationToken: nextPageToken 
        });
        
        allApprovals = [...allApprovals, ...(nextPage.data?.items || [])];
        nextPageToken = nextPage.data?.nextPageToken;
      }

      return {
        success: true,
        data: allApprovals,
        metadata: {
          timestamp: new Date().toISOString(),
          totalCount: allApprovals.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get pending approvals: ${error}`,
        'PENDING_APPROVALS_FAILED'
      );
    }
  }

  /**
   * Get approvals for a specific user
   * 
   * @param userId - User ID to filter by
   * @param type - Filter by initiator or approver
   */
  async getApprovalsForUser(
    userId: string,
    type: 'initiator' | 'approver' = 'approver'
  ): Promise<DfnsPolicyServiceResponse<DfnsApproval[]>> {
    try {
      const filterParam = type === 'initiator' ? { initiatorId: userId } : { approverId: userId };
      const response = await this.listApprovals({ ...filterParam, limit: 100 });
      
      let allApprovals = response.data?.items || [];
      let nextPageToken = response.data?.nextPageToken;

      // Fetch all pages
      while (nextPageToken) {
        const nextPage = await this.listApprovals({ 
          ...filterParam, 
          limit: 100, 
          paginationToken: nextPageToken 
        });
        
        allApprovals = [...allApprovals, ...(nextPage.data?.items || [])];
        nextPageToken = nextPage.data?.nextPageToken;
      }

      return {
        success: true,
        data: allApprovals,
        metadata: {
          timestamp: new Date().toISOString(),
          userId,
          type,
          totalCount: allApprovals.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get approvals for user ${userId}: ${error}`,
        'USER_APPROVALS_FAILED',
        { userId, type }
      );
    }
  }

  /**
   * Get approvals by activity kind
   * 
   * @param activityKind - Activity kind to filter by
   */
  async getApprovalsByActivityKind(activityKind: DfnsActivityKind): Promise<DfnsPolicyServiceResponse<DfnsApproval[]>> {
    try {
      // Get all approvals (API doesn't support activity kind filtering directly)
      const response = await this.listApprovals({ limit: 1000 });
      let allApprovals = response.data?.items || [];
      let nextPageToken = response.data?.nextPageToken;

      // Fetch all pages
      while (nextPageToken) {
        const nextPage = await this.listApprovals({ 
          limit: 1000, 
          paginationToken: nextPageToken 
        });
        
        allApprovals = [...allApprovals, ...(nextPage.data?.items || [])];
        nextPageToken = nextPage.data?.nextPageToken;
      }

      // Filter by activity kind
      const filteredApprovals = allApprovals.filter(
        approval => approval.activity.kind === activityKind
      );

      return {
        success: true,
        data: filteredApprovals,
        metadata: {
          timestamp: new Date().toISOString(),
          activityKind,
          totalCount: filteredApprovals.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get approvals for activity ${activityKind}: ${error}`,
        'APPROVALS_BY_ACTIVITY_FAILED',
        { activityKind }
      );
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(): Promise<DfnsPolicyServiceResponse<DfnsApprovalStatistics>> {
    try {
      const allApprovalsResponse = await this.listApprovals({ limit: 1000 });
      const allApprovals = allApprovalsResponse.data?.items || [];

      // Get additional pages if needed
      let nextPageToken = allApprovalsResponse.data?.nextPageToken;
      const additionalApprovals: DfnsApproval[] = [];

      while (nextPageToken) {
        const nextPage = await this.listApprovals({ 
          limit: 1000, 
          paginationToken: nextPageToken 
        });
        
        additionalApprovals.push(...(nextPage.data?.items || []));
        nextPageToken = nextPage.data?.nextPageToken;
      }

      const completeApprovals = [...allApprovals, ...additionalApprovals];

      // Calculate average approval time for completed approvals
      const completedApprovals = completeApprovals.filter(a => 
        a.status === 'Approved' || a.status === 'Denied'
      );

      let averageApprovalTime: number | undefined;
      if (completedApprovals.length > 0) {
        const totalTime = completedApprovals.reduce((sum, approval) => {
          const createdTime = new Date(approval.dateCreated).getTime();
          const updatedTime = new Date(approval.dateUpdated).getTime();
          return sum + (updatedTime - createdTime);
        }, 0);
        
        // Convert to minutes
        averageApprovalTime = Math.round(totalTime / completedApprovals.length / 1000 / 60);
      }

      // Calculate statistics
      const stats: DfnsApprovalStatistics = {
        totalApprovals: completeApprovals.length,
        pendingApprovals: completeApprovals.filter(a => a.status === 'Pending').length,
        approvedApprovals: completeApprovals.filter(a => a.status === 'Approved').length,
        deniedApprovals: completeApprovals.filter(a => a.status === 'Denied').length,
        expiredApprovals: completeApprovals.filter(a => a.status === 'Expired').length,
        averageApprovalTime,
        approvalsByActivityKind: this.groupApprovalsByActivityKind(completeApprovals),
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get approval statistics: ${error}`,
        'APPROVAL_STATISTICS_FAILED'
      );
    }
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync approval to local database
   * 
   * @param approval - DFNS approval to sync
   */
  async syncApprovalToDatabase(approval: DfnsApproval): Promise<void> {
    try {
      console.log('💾 Syncing approval to database:', approval.id);

      // Prepare approval entity
      const approvalEntity: Partial<DfnsPolicyApprovalEntity> = {
        dfns_approval_id: approval.id,
        approval_id: approval.id, // For backward compatibility
        activity_id: this.extractActivityId(approval.activity),
        status: approval.status,
        initiator_id: approval.initiatorId,
        expiration_date: approval.expirationDate,
        activity_details: approval.activity,
        evaluated_policies: approval.evaluatedPolicies,
        metadata: {
          lastSyncedAt: new Date().toISOString(),
          source: 'dfns-api',
          activityKind: approval.activity.kind
        }
      };

      // Upsert approval
      const { error: approvalError } = await this.supabase
        .from('dfns_policy_approvals')
        .upsert(approvalEntity, { 
          onConflict: 'dfns_approval_id',
          ignoreDuplicates: false 
        });

      if (approvalError) {
        throw new Error(`Database approval sync failed: ${approvalError.message}`);
      }

      // Sync policy evaluations
      await this.syncPolicyEvaluationsToDatabase(approval);

      console.log('✅ Approval synced to database successfully');
    } catch (error) {
      console.error('❌ Failed to sync approval to database:', error);
      // Don't throw error - database sync is not critical
    }
  }

  /**
   * Sync approval decision to database
   * 
   * @param approvalId - DFNS approval ID
   * @param decision - Approval decision
   * @param approval - Updated approval object
   */
  async syncApprovalDecisionToDatabase(
    approvalId: string,
    decision: DfnsCreateApprovalDecisionRequest,
    approval: DfnsApproval
  ): Promise<void> {
    try {
      console.log('💾 Syncing approval decision to database:', approvalId);

      // Get approval database ID
      const { data: approvalData, error: approvalError } = await this.supabase
        .from('dfns_policy_approvals')
        .select('id')
        .eq('dfns_approval_id', approvalId)
        .single();

      if (approvalError || !approvalData) {
        console.warn(`Approval not found in database for decision sync: ${approvalId}`);
        return;
      }

      // Find the latest decision (should be the one we just created)
      const latestDecision = approval.decisions[approval.decisions.length - 1];
      if (!latestDecision) {
        console.warn(`No decision found in approval response: ${approvalId}`);
        return;
      }

      // Prepare decision entity
      const decisionEntity: Partial<DfnsPolicyApprovalDecisionEntity> = {
        approval_id: approvalData.id,
        dfns_approval_id: approvalId,
        user_id: latestDecision.userId,
        decision_value: latestDecision.value,
        reason: latestDecision.reason || decision.reason,
        date_actioned: latestDecision.dateActioned
      };

      // Insert decision
      const { error: decisionError } = await this.supabase
        .from('dfns_policy_approval_decisions')
        .insert(decisionEntity);

      if (decisionError) {
        throw new Error(`Decision sync failed: ${decisionError.message}`);
      }

      console.log('✅ Approval decision synced to database successfully');
    } catch (error) {
      console.error('❌ Failed to sync approval decision to database:', error);
      // Don't throw error - database sync is not critical
    }
  }

  /**
   * Sync policy evaluations to database
   * 
   * @param approval - DFNS approval with evaluations
   */
  private async syncPolicyEvaluationsToDatabase(approval: DfnsApproval): Promise<void> {
    try {
      if (!approval.evaluatedPolicies?.length) {
        return;
      }

      const evaluations: Partial<DfnsPolicyEvaluationEntity>[] = approval.evaluatedPolicies.map(evaluation => ({
        dfns_policy_id: evaluation.policyId,
        activity_id: this.extractActivityId(approval.activity),
        trigger_status: evaluation.triggerStatus,
        reason: evaluation.reason,
        evaluation_timestamp: approval.dateCreated,
        activity_kind: approval.activity.kind,
        activity_details: approval.activity
      }));

      const { error: evaluationsError } = await this.supabase
        .from('dfns_policy_evaluations')
        .insert(evaluations);

      if (evaluationsError) {
        throw new Error(`Policy evaluations sync failed: ${evaluationsError.message}`);
      }

      console.log(`✅ Synced ${evaluations.length} policy evaluations`);
    } catch (error) {
      console.error('❌ Failed to sync policy evaluations:', error);
      // Don't throw error - this is not critical
    }
  }

  // ==============================================
  // HELPER METHODS
  // ==============================================

  /**
   * Extract activity ID from activity object
   */
  private extractActivityId(activity: any): string {
    if (activity.transferRequest?.id) return activity.transferRequest.id;
    if (activity.transactionRequest?.id) return activity.transactionRequest.id;
    if (activity.signatureRequest?.id) return activity.signatureRequest.id;
    if (activity.incomingTransaction?.id) return activity.incomingTransaction.id;
    if (activity.permissionRequest?.id) return activity.permissionRequest.id;
    if (activity.policyRequest?.id) return activity.policyRequest.id;
    
    // Fallback to a generated ID based on activity kind and timestamp
    return `${activity.kind.toLowerCase()}-${Date.now()}`;
  }

  /**
   * Group approvals by activity kind
   */
  private groupApprovalsByActivityKind(approvals: DfnsApproval[]): Record<DfnsActivityKind, number> {
    return approvals.reduce((acc, approval) => {
      const activityKind = approval.activity.kind;
      acc[activityKind] = (acc[activityKind] || 0) + 1;
      return acc;
    }, {} as Record<DfnsActivityKind, number>);
  }
}

// ==============================================
// GLOBAL SERVICE INSTANCE
// ==============================================

let globalDfnsPolicyApprovalService: DfnsPolicyApprovalService | null = null;

/**
 * Get or create the global DFNS Policy Approval service instance
 */
export function getDfnsPolicyApprovalService(workingClient?: WorkingDfnsClient): DfnsPolicyApprovalService {
  if (!globalDfnsPolicyApprovalService) {
    if (!workingClient) {
      throw new DfnsPolicyEngineError('WorkingDfnsClient is required for DfnsPolicyApprovalService initialization', 'CLIENT_REQUIRED');
    }
    globalDfnsPolicyApprovalService = new DfnsPolicyApprovalService(workingClient);
  }
  return globalDfnsPolicyApprovalService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsPolicyApprovalService(): void {
  globalDfnsPolicyApprovalService = null;
}