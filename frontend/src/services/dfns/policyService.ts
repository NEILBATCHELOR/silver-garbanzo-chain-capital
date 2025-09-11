/**
 * DFNS Policy Service
 * 
 * Handles DFNS Policy Engine operations:
 * - Policy CRUD operations
 * - Policy rule management
 * - Policy action configuration
 * - Database synchronization
 * 
 * Based on DFNS Policy Engine API:
 * https://docs.dfns.co/d/api-docs/policy-engine/api-reference
 */

import type { 
  DfnsPolicy,
  DfnsCreatePolicyRequest,
  DfnsUpdatePolicyRequest,
  DfnsListPoliciesRequest,
  DfnsListPoliciesResponse,
  DfnsPolicyServiceResponse,
  DfnsPolicyStatistics,
  DfnsPolicyEntity,
  DfnsPolicyApprovalGroupEntity,
  DfnsPolicyChangeRequest,
  DfnsActivityKind,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
  DfnsPolicyStatus,
  DfnsRequestApprovalAction
} from '../../types/dfns/policy-engine';

import { isRequestApprovalAction } from '../../types/dfns/policy-engine';

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsPolicyEngineError } from '../../types/dfns/policy-engine';
import { createClient } from '@supabase/supabase-js';

export class DfnsPolicyService {
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
  // POLICY CRUD OPERATIONS
  // ==============================================

  /**
   * Create a new policy
   * 
   * @param request - Policy creation request
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Created policy
   */
  async createPolicy(
    request: DfnsCreatePolicyRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsPolicy>> {
    try {
      console.log('🏛️ Creating DFNS policy:', request.name);

      if (!userActionToken) {
        console.warn('⚠️ Creating policy without User Action token - may require Policies:Create permission');
      }

      // Validate the request
      this.validatePolicyRequest(request);

      // Make API call to DFNS
      const policy = await this.workingClient.makeRequest<DfnsPolicy>(
        'POST',
        '/v2/policies',
        request,
        userActionToken
      );

      console.log('✅ DFNS policy created:', policy.id);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncPolicyToDatabase(policy);
      }

      return {
        success: true,
        data: policy,
        metadata: {
          timestamp: new Date().toISOString(),
          syncedToDatabase: options.syncToDatabase
        }
      };
    } catch (error) {
      console.error('❌ Failed to create DFNS policy:', error);
      throw new DfnsPolicyEngineError(
        `Failed to create policy: ${error}`,
        'POLICY_CREATE_FAILED',
        { request, hasUserAction: !!userActionToken }
      );
    }
  }

  /**
   * Get a policy by ID
   * 
   * @param policyId - DFNS policy ID
   * @returns Policy details
   */
  async getPolicy(policyId: string): Promise<DfnsPolicyServiceResponse<DfnsPolicy>> {
    try {
      console.log('🔍 Getting DFNS policy:', policyId);

      const policy = await this.workingClient.makeRequest<DfnsPolicy>(
        'GET',
        `/v2/policies/${policyId}`
      );

      return {
        success: true,
        data: policy,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get DFNS policy:', error);
      throw new DfnsPolicyEngineError(
        `Failed to get policy ${policyId}: ${error}`,
        'POLICY_GET_FAILED',
        { policyId }
      );
    }
  }

  /**
   * List policies with filtering and pagination
   * 
   * @param request - List parameters
   * @returns Policy list
   */
  async listPolicies(
    request: DfnsListPoliciesRequest = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsListPoliciesResponse>> {
    try {
      console.log('📋 Listing DFNS policies:', request);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (request.limit) queryParams.append('limit', request.limit.toString());
      if (request.paginationToken) queryParams.append('paginationToken', request.paginationToken);
      if (request.status) queryParams.append('status', request.status);

      const endpoint = `/v2/policies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await this.workingClient.makeRequest<DfnsListPoliciesResponse>(
        'GET',
        endpoint
      );

      console.log(`✅ Retrieved ${response.items.length} DFNS policies`);

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to list DFNS policies:', error);
      throw new DfnsPolicyEngineError(
        `Failed to list policies: ${error}`,
        'POLICY_LIST_FAILED',
        { request }
      );
    }
  }

  /**
   * Update a policy
   * 
   * @param policyId - DFNS policy ID
   * @param request - Policy update request
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Updated policy or change request
   */
  async updatePolicy(
    policyId: string,
    request: DfnsUpdatePolicyRequest,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsPolicy | DfnsPolicyChangeRequest>> {
    try {
      console.log('📝 Updating DFNS policy:', policyId);

      if (!userActionToken) {
        console.warn('⚠️ Updating policy without User Action token - may require Policies:Update permission');
      }

      // Validate the request
      this.validatePolicyRequest(request);

      // Make API call to DFNS
      const response = await this.workingClient.makeRequest<DfnsPolicy | DfnsPolicyChangeRequest>(
        'PUT',
        `/v2/policies/${policyId}`,
        request,
        userActionToken
      );

      // Check if approval is required (202 status would indicate change request)
      const isChangeRequest = 'approvalId' in response;
      
      if (isChangeRequest) {
        console.log('⏳ Policy update requires approval:', (response as DfnsPolicyChangeRequest).approvalId);
      } else {
        console.log('✅ DFNS policy updated immediately:', policyId);
        
        // Sync to database if requested and not a change request
        if (options.syncToDatabase) {
          await this.syncPolicyToDatabase(response as DfnsPolicy);
        }
      }

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date().toISOString(),
          syncedToDatabase: options.syncToDatabase && !isChangeRequest,
          requiresApproval: isChangeRequest
        }
      };
    } catch (error) {
      console.error('❌ Failed to update DFNS policy:', error);
      throw new DfnsPolicyEngineError(
        `Failed to update policy ${policyId}: ${error}`,
        'POLICY_UPDATE_FAILED',
        { policyId, request, hasUserAction: !!userActionToken }
      );
    }
  }

  /**
   * Archive a policy
   * 
   * @param policyId - DFNS policy ID
   * @param userActionToken - Required for User Action Signing
   * @param options - Additional options
   * @returns Archived policy or change request
   */
  async archivePolicy(
    policyId: string,
    userActionToken?: string,
    options: { syncToDatabase?: boolean } = {}
  ): Promise<DfnsPolicyServiceResponse<DfnsPolicy | DfnsPolicyChangeRequest>> {
    try {
      console.log('🗃️ Archiving DFNS policy:', policyId);

      if (!userActionToken) {
        console.warn('⚠️ Archiving policy without User Action token - may require Policies:Archive permission');
      }

      // Make API call to DFNS
      const response = await this.workingClient.makeRequest<DfnsPolicy | DfnsPolicyChangeRequest>(
        'DELETE',
        `/v2/policies/${policyId}`,
        undefined,
        userActionToken
      );

      // Check if approval is required
      const isChangeRequest = 'approvalId' in response;
      
      if (isChangeRequest) {
        console.log('⏳ Policy archive requires approval:', (response as DfnsPolicyChangeRequest).approvalId);
      } else {
        console.log('✅ DFNS policy archived immediately:', policyId);
        
        // Sync to database if requested and not a change request
        if (options.syncToDatabase) {
          await this.syncPolicyToDatabase(response as DfnsPolicy);
        }
      }

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date().toISOString(),
          syncedToDatabase: options.syncToDatabase && !isChangeRequest,
          requiresApproval: isChangeRequest
        }
      };
    } catch (error) {
      console.error('❌ Failed to archive DFNS policy:', error);
      throw new DfnsPolicyEngineError(
        `Failed to archive policy ${policyId}: ${error}`,
        'POLICY_ARCHIVE_FAILED',
        { policyId, hasUserAction: !!userActionToken }
      );
    }
  }

  // ==============================================
  // CONVENIENCE METHODS
  // ==============================================

  /**
   * Get all active policies
   */
  async getActivePolicies(): Promise<DfnsPolicyServiceResponse<DfnsPolicy[]>> {
    try {
      const response = await this.listPolicies({ status: 'Active', limit: 100 });
      
      let allPolicies = response.data?.items || [];
      let nextPageToken = response.data?.nextPageToken;

      // Fetch all pages
      while (nextPageToken) {
        const nextPage = await this.listPolicies({ 
          status: 'Active', 
          limit: 100, 
          paginationToken: nextPageToken 
        });
        
        allPolicies = [...allPolicies, ...(nextPage.data?.items || [])];
        nextPageToken = nextPage.data?.nextPageToken;
      }

      return {
        success: true,
        data: allPolicies,
        metadata: {
          timestamp: new Date().toISOString(),
          totalCount: allPolicies.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get active policies: ${error}`,
        'ACTIVE_POLICIES_FAILED'
      );
    }
  }

  /**
   * Get policies by activity kind
   * 
   * @param activityKind - Activity kind to filter by
   */
  async getPoliciesByActivityKind(activityKind: DfnsActivityKind): Promise<DfnsPolicyServiceResponse<DfnsPolicy[]>> {
    try {
      const allPolicies = await this.getActivePolicies();
      
      const filteredPolicies = allPolicies.data?.filter(
        policy => policy.activityKind === activityKind
      ) || [];

      return {
        success: true,
        data: filteredPolicies,
        metadata: {
          timestamp: new Date().toISOString(),
          activityKind,
          totalCount: filteredPolicies.length
        }
      };
    } catch (error) {
      throw new DfnsPolicyEngineError(
        `Failed to get policies for activity ${activityKind}: ${error}`,
        'POLICIES_BY_ACTIVITY_FAILED',
        { activityKind }
      );
    }
  }

  /**
   * Get wallet signing policies
   */
  async getWalletSigningPolicies(): Promise<DfnsPolicyServiceResponse<DfnsPolicy[]>> {
    return this.getPoliciesByActivityKind('Wallets:Sign');
  }

  /**
   * Get policy statistics
   */
  async getPolicyStatistics(): Promise<DfnsPolicyServiceResponse<DfnsPolicyStatistics>> {
    try {
      const allPoliciesResponse = await this.listPolicies({ limit: 1000 });
      const allPolicies = allPoliciesResponse.data?.items || [];

      // Get additional pages if needed
      let nextPageToken = allPoliciesResponse.data?.nextPageToken;
      const additionalPolicies: DfnsPolicy[] = [];

      while (nextPageToken) {
        const nextPage = await this.listPolicies({ 
          limit: 1000, 
          paginationToken: nextPageToken 
        });
        
        additionalPolicies.push(...(nextPage.data?.items || []));
        nextPageToken = nextPage.data?.nextPageToken;
      }

      const completePolicies = [...allPolicies, ...additionalPolicies];

      // Calculate statistics
      const stats: DfnsPolicyStatistics = {
        totalPolicies: completePolicies.length,
        activePolicies: completePolicies.filter(p => p.status === 'Active').length,
        archivedPolicies: completePolicies.filter(p => p.status === 'Archived').length,
        policiesByActivityKind: this.groupByActivityKind(completePolicies),
        policiesByRuleKind: this.groupByRuleKind(completePolicies),
        policiesByActionKind: this.groupByActionKind(completePolicies),
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
        `Failed to get policy statistics: ${error}`,
        'POLICY_STATISTICS_FAILED'
      );
    }
  }

  // ==============================================
  // DATABASE SYNCHRONIZATION
  // ==============================================

  /**
   * Sync policy to local database
   * 
   * @param policy - DFNS policy to sync
   */
  async syncPolicyToDatabase(policy: DfnsPolicy): Promise<void> {
    try {
      console.log('💾 Syncing policy to database:', policy.id);

      // Prepare policy entity
      const policyEntity: Partial<DfnsPolicyEntity> = {
        dfns_policy_id: policy.id,
        name: policy.name,
        status: policy.status,
        activity_kind: policy.activityKind,
        rule_kind: policy.rule.kind,
        rule_configuration: policy.rule.kind === 'AlwaysTrigger' ? null : (policy.rule as any).configuration,
        action_kind: policy.action.kind,
        action_configuration: policy.action.kind === 'Block' || policy.action.kind === 'NoAction' 
          ? null 
          : (policy.action as any),
        filters: policy.filters || null,
        metadata: {
          lastSyncedAt: new Date().toISOString(),
          source: 'dfns-api'
        }
      };

      // Upsert policy
      const { error: policyError } = await this.supabase
        .from('dfns_policies')
        .upsert(policyEntity, { 
          onConflict: 'dfns_policy_id',
          ignoreDuplicates: false 
        });

      if (policyError) {
        throw new Error(`Database policy sync failed: ${policyError.message}`);
      }

      // Sync approval groups if RequestApproval action
      if (isRequestApprovalAction(policy.action)) {
        await this.syncApprovalGroupsToDatabase(policy.id, policy.action);
      }

      console.log('✅ Policy synced to database successfully');
    } catch (error) {
      console.error('❌ Failed to sync policy to database:', error);
      // Don't throw error - database sync is not critical
    }
  }

  /**
   * Sync approval groups to database
   * 
   * @param policyId - DFNS policy ID
   * @param action - RequestApproval action
   */
  private async syncApprovalGroupsToDatabase(
    policyId: string, 
    action: DfnsRequestApprovalAction
  ): Promise<void> {
    try {
      // Get policy database ID
      const { data: policyData, error: policyError } = await this.supabase
        .from('dfns_policies')
        .select('id')
        .eq('dfns_policy_id', policyId)
        .single();

      if (policyError || !policyData) {
        throw new Error(`Policy not found in database: ${policyId}`);
      }

      // Delete existing approval groups
      await this.supabase
        .from('dfns_policy_approval_groups')
        .delete()
        .eq('dfns_policy_id', policyId);

      // Insert new approval groups
      const approvalGroups: Partial<DfnsPolicyApprovalGroupEntity>[] = action.approvalGroups.map(group => ({
        policy_id: policyData.id,
        dfns_policy_id: policyId,
        group_name: group.name || null,
        quorum: group.quorum,
        approvers: group.approvers
      }));

      const { error: groupsError } = await this.supabase
        .from('dfns_policy_approval_groups')
        .insert(approvalGroups);

      if (groupsError) {
        throw new Error(`Approval groups sync failed: ${groupsError.message}`);
      }

      console.log(`✅ Synced ${approvalGroups.length} approval groups for policy ${policyId}`);
    } catch (error) {
      console.error('❌ Failed to sync approval groups:', error);
      // Don't throw error - this is not critical
    }
  }

  // ==============================================
  // VALIDATION HELPERS
  // ==============================================

  /**
   * Validate policy request
   * 
   * @param request - Policy request to validate
   */
  private validatePolicyRequest(request: DfnsCreatePolicyRequest | DfnsUpdatePolicyRequest): void {
    if (!request.name?.trim()) {
      throw new DfnsPolicyEngineError('Policy name is required', 'INVALID_REQUEST');
    }

    if (!request.activityKind) {
      throw new DfnsPolicyEngineError('Activity kind is required', 'INVALID_REQUEST');
    }

    if (!request.rule?.kind) {
      throw new DfnsPolicyEngineError('Policy rule is required', 'INVALID_REQUEST');
    }

    if (!request.action?.kind) {
      throw new DfnsPolicyEngineError('Policy action is required', 'INVALID_REQUEST');
    }

    // Validate rule configuration
    this.validateRuleConfiguration(request.rule);

    // Validate action configuration
    this.validateActionConfiguration(request.action);
  }

  /**
   * Validate rule configuration
   */
  private validateRuleConfiguration(rule: any): void {
    switch (rule.kind) {
      case 'TransactionAmountLimit':
      case 'TransactionAmountVelocity':
        if (!rule.configuration?.limit || rule.configuration.limit <= 0) {
          throw new DfnsPolicyEngineError('Transaction rule requires positive limit', 'INVALID_RULE_CONFIG');
        }
        if (!rule.configuration?.currency) {
          throw new DfnsPolicyEngineError('Transaction rule requires currency', 'INVALID_RULE_CONFIG');
        }
        break;
      case 'TransactionCountVelocity':
        if (!rule.configuration?.limit || rule.configuration.limit <= 0) {
          throw new DfnsPolicyEngineError('Count velocity rule requires positive limit', 'INVALID_RULE_CONFIG');
        }
        if (!rule.configuration?.timeframe || rule.configuration.timeframe <= 0) {
          throw new DfnsPolicyEngineError('Velocity rule requires positive timeframe', 'INVALID_RULE_CONFIG');
        }
        break;
      case 'TransactionRecipientWhitelist':
        if (!Array.isArray(rule.configuration?.addresses)) {
          throw new DfnsPolicyEngineError('Whitelist rule requires addresses array', 'INVALID_RULE_CONFIG');
        }
        break;
    }
  }

  /**
   * Validate action configuration
   */
  private validateActionConfiguration(action: any): void {
    if (action.kind === 'RequestApproval') {
      if (!Array.isArray(action.approvalGroups) || action.approvalGroups.length === 0) {
        throw new DfnsPolicyEngineError('RequestApproval action requires approval groups', 'INVALID_ACTION_CONFIG');
      }

      for (const group of action.approvalGroups) {
        if (!group.quorum || group.quorum <= 0) {
          throw new DfnsPolicyEngineError('Approval group requires positive quorum', 'INVALID_ACTION_CONFIG');
        }
        if (!group.approvers) {
          throw new DfnsPolicyEngineError('Approval group requires approvers configuration', 'INVALID_ACTION_CONFIG');
        }
      }
    }
  }

  // ==============================================
  // STATISTICS HELPERS
  // ==============================================

  private groupByActivityKind(policies: DfnsPolicy[]): Record<DfnsActivityKind, number> {
    return policies.reduce((acc, policy) => {
      acc[policy.activityKind] = (acc[policy.activityKind] || 0) + 1;
      return acc;
    }, {} as Record<DfnsActivityKind, number>);
  }

  private groupByRuleKind(policies: DfnsPolicy[]): Record<DfnsPolicyRuleKind, number> {
    return policies.reduce((acc, policy) => {
      acc[policy.rule.kind] = (acc[policy.rule.kind] || 0) + 1;
      return acc;
    }, {} as Record<DfnsPolicyRuleKind, number>);
  }

  private groupByActionKind(policies: DfnsPolicy[]): Record<DfnsPolicyActionKind, number> {
    return policies.reduce((acc, policy) => {
      acc[policy.action.kind] = (acc[policy.action.kind] || 0) + 1;
      return acc;
    }, {} as Record<DfnsPolicyActionKind, number>);
  }
}

// ==============================================
// GLOBAL SERVICE INSTANCE
// ==============================================

let globalDfnsPolicyService: DfnsPolicyService | null = null;

/**
 * Get or create the global DFNS Policy service instance
 */
export function getDfnsPolicyService(workingClient?: WorkingDfnsClient): DfnsPolicyService {
  if (!globalDfnsPolicyService) {
    if (!workingClient) {
      throw new DfnsPolicyEngineError('WorkingDfnsClient is required for DfnsPolicyService initialization', 'CLIENT_REQUIRED');
    }
    globalDfnsPolicyService = new DfnsPolicyService(workingClient);
  }
  return globalDfnsPolicyService;
}

/**
 * Reset the global service instance
 */
export function resetDfnsPolicyService(): void {
  globalDfnsPolicyService = null;
}