/**
 * DFNS Policy Management Component
 * 
 * Complete policy management interface for DFNS Policy Engine v2
 * Provides:
 * - Policy CRUD operations
 * - Approval management
 * - Policy dashboard and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getDfnsService } from '../../../services/dfns';
import type {
  DfnsPolicy,
  DfnsPolicyApproval,
  DfnsCreatePolicyRequest,
  DfnsUpdatePolicyRequest,
  DfnsPolicyRule,
  DfnsPolicyAction,
  DfnsPolicySummary,
  DfnsApprovalSummary,
} from '../../../types/dfns';
import {
  DfnsActivityKind,
  DfnsApprovalStatus,
  DfnsPolicyRuleKind,
  DfnsPolicyActionKind,
} from '../../../types/dfns';
import { DfnsPolicyError } from '../../../types/dfns/errors';

// UI Component Props
interface PolicyManagementProps {
  className?: string;
  onPolicyCreated?: (policy: DfnsPolicy) => void;
  onPolicyUpdated?: (policy: DfnsPolicy) => void;
  onPolicyArchived?: (policyId: string) => void;
  onApprovalDecision?: (approval: DfnsPolicyApproval) => void;
}

// Component State
interface PolicyManagementState {
  policies: DfnsPolicy[];
  approvals: DfnsPolicyApproval[];
  policySummaries: DfnsPolicySummary[];
  approvalSummaries: DfnsApprovalSummary[];
  loading: boolean;
  error: string | null;
  selectedPolicy: DfnsPolicy | null;
  selectedApproval: DfnsPolicyApproval | null;
  activeTab: 'policies' | 'approvals' | 'dashboard';
  showCreateDialog: boolean;
  showEditDialog: boolean;
}

// Policy Creation/Edit Form Data
interface PolicyFormData {
  name: string;
  activityKind: DfnsActivityKind;
  ruleKind: DfnsPolicyRuleKind;
  ruleConfiguration: Record<string, any>;
  actionKind: DfnsPolicyActionKind;
  actionConfiguration: Record<string, any>;
  externalId?: string;
}

/**
 * DFNS Policy Management Component
 */
export const DfnsPolicyManagement: React.FC<PolicyManagementProps> = ({
  className = '',
  onPolicyCreated,
  onPolicyUpdated,
  onPolicyArchived,
  onApprovalDecision,
}) => {
  // State Management
  const [state, setState] = useState<PolicyManagementState>({
    policies: [],
    approvals: [],
    policySummaries: [],
    approvalSummaries: [],
    loading: false,
    error: null,
    selectedPolicy: null,
    selectedApproval: null,
    activeTab: 'dashboard',
    showCreateDialog: false,
    showEditDialog: false,
  });

  // Form State
  const [formData, setFormData] = useState<PolicyFormData>({
    name: '',
    activityKind: DfnsActivityKind.WalletsSign,
    ruleKind: DfnsPolicyRuleKind.AlwaysActivated,
    ruleConfiguration: {},
    actionKind: DfnsPolicyActionKind.Block,
    actionConfiguration: {},
  });

  // DFNS Service
  const dfnsService = getDfnsService();
  const policyService = dfnsService.getPolicyService();

  // ===============================
  // DATA LOADING METHODS
  // ===============================

  /**
   * Load all policy data
   */
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [policies, approvals, policySummaries, approvalSummaries] = await Promise.all([
        policyService.getAllPolicies(),
        policyService.listApprovals(),
        policyService.getPoliciesSummary(),
        policyService.getApprovalsSummary(),
      ]);

      setState(prev => ({
        ...prev,
        policies,
        approvals: approvals.items,
        policySummaries,
        approvalSummaries,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load policy data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to load policy data',
        loading: false,
      }));
    }
  }, [policyService]);

  /**
   * Load policies only
   */
  const loadPolicies = useCallback(async () => {
    try {
      const policies = await policyService.getAllPolicies();
      setState(prev => ({ ...prev, policies }));
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  }, [policyService]);

  /**
   * Load approvals only
   */
  const loadApprovals = useCallback(async () => {
    try {
      const approvals = await policyService.listApprovals();
      setState(prev => ({ ...prev, approvals: approvals.items }));
    } catch (error) {
      console.error('Failed to load approvals:', error);
    }
  }, [policyService]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===============================
  // POLICY CRUD OPERATIONS
  // ===============================

  /**
   * Create a new policy
   */
  const handleCreatePolicy = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: DfnsCreatePolicyRequest = {
        name: formData.name,
        activityKind: formData.activityKind,
        rule: {
          kind: formData.ruleKind,
          configuration: formData.ruleConfiguration,
        },
        action: {
          kind: formData.actionKind,
          ...formData.actionConfiguration,
        },
        externalId: formData.externalId,
      };

      const policy = await policyService.createPolicy(request, {
        syncToDatabase: true,
        autoActivate: true,
      });

      setState(prev => ({
        ...prev,
        showCreateDialog: false,
        loading: false,
      }));

      // Reset form
      setFormData({
        name: '',
        activityKind: DfnsActivityKind.WalletsSign,
        ruleKind: DfnsPolicyRuleKind.AlwaysActivated,
        ruleConfiguration: {},
        actionKind: DfnsPolicyActionKind.Block,
        actionConfiguration: {},
      });

      // Reload data and notify parent
      await loadData();
      onPolicyCreated?.(policy);
    } catch (error) {
      console.error('Failed to create policy:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to create policy',
        loading: false,
      }));
    }
  };

  /**
   * Update an existing policy
   */
  const handleUpdatePolicy = async () => {
    if (!state.selectedPolicy) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: DfnsUpdatePolicyRequest = {
        name: formData.name,
        rule: {
          kind: formData.ruleKind,
          configuration: formData.ruleConfiguration,
        },
        action: {
          kind: formData.actionKind,
          ...formData.actionConfiguration,
        },
      };

      const policy = await policyService.updatePolicy(
        state.selectedPolicy.id,
        request,
        { syncToDatabase: true }
      );

      setState(prev => ({
        ...prev,
        showEditDialog: false,
        selectedPolicy: null,
        loading: false,
      }));

      // Reload data and notify parent
      await loadData();
      onPolicyUpdated?.(policy);
    } catch (error) {
      console.error('Failed to update policy:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to update policy',
        loading: false,
      }));
    }
  };

  /**
   * Archive a policy
   */
  const handleArchivePolicy = async (policyId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await policyService.archivePolicy(policyId, { syncToDatabase: true });

      setState(prev => ({ ...prev, loading: false }));

      // Reload data and notify parent
      await loadData();
      onPolicyArchived?.(policyId);
    } catch (error) {
      console.error('Failed to archive policy:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to archive policy',
        loading: false,
      }));
    }
  };

  // ===============================
  // APPROVAL OPERATIONS
  // ===============================

  /**
   * Approve an approval request
   */
  const handleApprove = async (approvalId: string, reason?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const approval = await policyService.createApprovalDecision(
        approvalId,
        { value: 'Approved', reason },
        { syncToDatabase: true }
      );

      setState(prev => ({ ...prev, loading: false }));

      // Reload data and notify parent
      await loadApprovals();
      onApprovalDecision?.(approval);
    } catch (error) {
      console.error('Failed to approve request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to approve request',
        loading: false,
      }));
    }
  };

  /**
   * Deny an approval request
   */
  const handleDeny = async (approvalId: string, reason?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const approval = await policyService.createApprovalDecision(
        approvalId,
        { value: 'Denied', reason },
        { syncToDatabase: true }
      );

      setState(prev => ({ ...prev, loading: false }));

      // Reload data and notify parent
      await loadApprovals();
      onApprovalDecision?.(approval);
    } catch (error) {
      console.error('Failed to deny request:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof DfnsPolicyError ? error.message : 'Failed to deny request',
        loading: false,
      }));
    }
  };

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Open edit dialog for policy
   */
  const openEditDialog = (policy: DfnsPolicy) => {
    setFormData({
      name: policy.name,
      activityKind: policy.activityKind,
      ruleKind: policy.rule.kind,
      ruleConfiguration: policy.rule.configuration,
      actionKind: policy.action.kind,
      actionConfiguration: {
        autoRejectTimeout: policy.action.autoRejectTimeout,
        approvalGroups: policy.action.approvalGroups,
      },
      externalId: policy.externalId,
    });

    setState(prev => ({
      ...prev,
      selectedPolicy: policy,
      showEditDialog: true,
    }));
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ===============================
  // RENDER METHODS
  // ===============================

  /**
   * Render dashboard tab
   */
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Active Policies</h3>
          <p className="text-3xl font-bold text-blue-600">
            {state.policies.filter(p => p.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {state.approvals.filter(a => a.status === DfnsApprovalStatus.Pending).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Policies</h3>
          <p className="text-3xl font-bold text-gray-600">{state.policies.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Approvals</h3>
          <p className="text-3xl font-bold text-gray-600">{state.approvals.length}</p>
        </div>
      </div>

      {/* Policy Summaries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Policy Performance</h3>
        </div>
        <div className="p-6">
          {state.policySummaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Triggered
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.policySummaries.map((summary) => (
                    <tr key={summary.policyId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.activityKind}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.ruleKind}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(summary.status)}`}>
                          {summary.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.triggeredCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No policy data available</p>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Render policies tab
   */
  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Policy Management</h3>
        <button
          onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Policy
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {state.policies.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {state.policies.map((policy) => (
              <li key={policy.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{policy.name}</p>
                      <p className="text-sm text-gray-500">{policy.activityKind}</p>
                      <p className="text-xs text-gray-400">Rule: {policy.rule.kind}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(policy.status)}`}>
                        {policy.status}
                      </span>
                      <button
                        onClick={() => openEditDialog(policy)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      {policy.status === 'Active' && (
                        <button
                          onClick={() => handleArchivePolicy(policy.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No policies found</p>
            <button
              onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              Create your first policy
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render approvals tab
   */
  const renderApprovals = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Approval Management</h3>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {state.approvals.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {state.approvals.map((approval) => (
              <li key={approval.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {approval.activity.kind} Request
                      </p>
                      <p className="text-sm text-gray-500">
                        Initiated by: {approval.initiator.name || approval.initiator.id}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {new Date(approval.dateCreated).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                      {approval.status === DfnsApprovalStatus.Pending && (
                        <>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeny(approval.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No approval requests found</p>
          </div>
        )}
      </div>
    </div>
  );

  // ===============================
  // MAIN RENDER
  // ===============================

  return (
    <div className={`p-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DFNS Policy Engine</h1>
          <p className="text-gray-600 mt-2">
            Manage policies, approvals, and governance controls
          </p>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{state.error}</p>
            <button
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              className="mt-2 text-red-600 text-sm hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {state.loading && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {(['dashboard', 'policies', 'approvals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
                className={`${
                  state.activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {state.activeTab === 'dashboard' && renderDashboard()}
        {state.activeTab === 'policies' && renderPolicies()}
        {state.activeTab === 'approvals' && renderApprovals()}

        {/* Create/Edit Policy Dialog Placeholders */}
        {(state.showCreateDialog || state.showEditDialog) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {state.showCreateDialog ? 'Create Policy' : 'Edit Policy'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Policy creation/editing dialog will be implemented with form components
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      showCreateDialog: false, 
                      showEditDialog: false,
                      selectedPolicy: null 
                    }))}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={state.showCreateDialog ? handleCreatePolicy : handleUpdatePolicy}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {state.showCreateDialog ? 'Create' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DfnsPolicyManagement;
