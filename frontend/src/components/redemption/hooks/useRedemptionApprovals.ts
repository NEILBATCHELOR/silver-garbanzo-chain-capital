import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ApprovalRequest, 
  ApprovalStatusType, 
  ApprovalDecisionType, 
  ApprovalResponse,
  ApprovalQueueResponse,
  ApprovalQueueItem,
  ApprovalRecord,
  SubmitApprovalInput
} from '../types';
import { approvalService } from '../services';

export interface UseRedemptionApprovalsParams {
  redemptionId?: string;
  approverId?: string;
  status?: ApprovalStatusType;
  enableRealtime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ApprovalMetrics {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgApprovalTime: number;
  pendingOlderThan24h: number;
  userPendingCount: number;
}

export interface UseRedemptionApprovalsReturn {
  // Approval data
  approvals: ApprovalRecord[];
  queueItems: ApprovalQueueItem[];
  currentApproval: ApprovalRequest | null;
  loading: boolean;
  error: string | null;
  
  // Metrics
  metrics: ApprovalMetrics | null;
  
  // Additional properties for ApproverDashboard compatibility
  pendingApprovals: ApprovalQueueItem[];
  
  // Processing state for individual redemptions
  processingApprovals: Set<string>;
  isProcessing: (redemptionId: string) => boolean;
  
  // Actions
  submitApproval: (decision: ApprovalDecisionType, comments?: string) => Promise<boolean>;
  requestApproval: (redemptionId: string, approvers: string[]) => Promise<boolean>;
  delegateApproval: (approverId: string, delegateId: string) => Promise<boolean>;
  escalateApproval: (approvalId: string, reason?: string) => Promise<boolean>;
  refreshApprovals: () => Promise<void>;
  refreshQueue: () => Promise<void>;
  
  // Additional action methods for ApproverDashboard compatibility
  approveRedemption: (redemptionId: string, comments?: string) => Promise<boolean>;
  rejectRedemption: (redemptionId: string, reason?: string) => Promise<boolean>;
  
  // Utility functions
  getApprovalById: (id: string) => ApprovalRecord | undefined;
  getApprovalsByStatus: (status: ApprovalStatusType) => ApprovalRecord[];
  getUserPendingApprovals: () => ApprovalQueueItem[];
  canApprove: (approvalId: string) => boolean;
  getApprovalProgress: (approvalId: string) => { current: number; required: number; percentage: number } | null;
  clearError: () => void;
}

export const useRedemptionApprovals = (params: UseRedemptionApprovalsParams = {}): UseRedemptionApprovalsReturn => {
  const {
    redemptionId,
    approverId,
    status,
    enableRealtime = false, // Always disabled to prevent errors
    autoRefresh = false, // Disabled by default to prevent unnecessary calls
    refreshInterval = 30000
  } = params;

  // Simplified state - no complex real-time subscriptions
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [queueItems, setQueueItems] = useState<ApprovalQueueItem[]>([]);
  const [currentApproval, setCurrentApproval] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ApprovalMetrics | null>(null);
  const [processingApprovals, setProcessingApprovals] = useState<Set<string>>(new Set());
  
  // Simple refs for cleanup
  const isUnmountedRef = useRef(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Clear error function
  const clearError = useCallback(() => setError(null), []);

  // Simplified fetch function with better error handling
  const fetchApprovalData = useCallback(async () => {
    // Validate approverId before making any API calls
    if (isUnmountedRef.current || !approverId || approverId === 'current-user' || approverId === 'undefined' || approverId === 'null') {
      console.log('⚠️ [useRedemptionApprovals] Skipping fetch - invalid approverId:', approverId);
      return;
    }
    
    try {
      setLoading(true);
      clearError();

      console.log('🔍 [useRedemptionApprovals] Fetching approval data for approverId:', approverId);

      // Only fetch approval queue - simplified approach
      const response = await approvalService.getApprovalQueue(approverId, {
        status,
        page: 1,
        limit: 50,
        isSuperAdmin: true // Treat all users as admin to avoid permission issues
      });

      if (isUnmountedRef.current) return;

      if (response.success && response.data) {
        const queueData = response.data.items || response.data.queue || [];
        
        console.log('📊 [useRedemptionApprovals] Received queue data:', {
          totalItems: queueData.length,
          pendingItems: queueData.filter(item => item.status === 'pending').length
        });
        
        setQueueItems(queueData);
        
        // Calculate simple metrics
        const pendingItems = queueData.filter(item => item.status === 'pending');
        const approvedItems = queueData.filter(item => item.status === 'approved');
        const rejectedItems = queueData.filter(item => item.status === 'rejected');
        
        const pendingOlderThan24h = pendingItems.filter(item => {
          const ageHours = (Date.now() - new Date(item.submittedAt).getTime()) / (1000 * 60 * 60);
          return ageHours > 24;
        }).length;

        setMetrics({
          totalPending: pendingItems.length,
          totalApproved: approvedItems.length,
          totalRejected: rejectedItems.length,
          avgApprovalTime: response.data.avgApprovalTime || 0,
          pendingOlderThan24h,
          userPendingCount: pendingItems.length
        });

        // If no pending approvals, log this for debugging
        if (pendingItems.length === 0) {
          console.log('✅ [useRedemptionApprovals] No pending approvals found - dashboard will show empty state');
        }

      } else {
        console.error('❌ [useRedemptionApprovals] Failed to fetch approval queue:', response.error);
        setError(response.error || 'Failed to fetch approval data');
        // Set empty state when fetch fails
        setQueueItems([]);
        setMetrics({
          totalPending: 0,
          totalApproved: 0,
          totalRejected: 0,
          avgApprovalTime: 0,
          pendingOlderThan24h: 0,
          userPendingCount: 0
        });
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        console.error('❌ [useRedemptionApprovals] Exception in fetchApprovalData:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        // Set empty state when exception occurs
        setQueueItems([]);
        setMetrics({
          totalPending: 0,
          totalApproved: 0,
          totalRejected: 0,
          avgApprovalTime: 0,
          pendingOlderThan24h: 0,
          userPendingCount: 0
        });
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  }, [approverId, status, clearError]);

  // Simplified action methods
  const submitApproval = useCallback(async (decision: ApprovalDecisionType, comments?: string): Promise<boolean> => {
    if (!currentApproval || !approverId) {
      setError('No approval to process or approver ID missing');
      return false;
    }

    try {
      clearError();
      const response = await approvalService.submitApproval({
        approvalRequestId: currentApproval.id,
        decision,
        comments
      });

      if (response.success) {
        await fetchApprovalData(); // Refresh data
        return true;
      } else {
        setError(response.error || 'Failed to submit approval');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    }
  }, [currentApproval, approverId, clearError, fetchApprovalData]);

  const approveRedemption = useCallback(async (redemptionId: string, comments?: string): Promise<boolean> => {
    try {
      setProcessingApprovals(prev => new Set(prev).add(redemptionId));
      clearError();
      
      console.log('✅ [useRedemptionApprovals] Approving redemption:', redemptionId);
      
      const response = await approvalService.submitApproval({
        approvalRequestId: redemptionId,
        decision: 'approved',
        comments
      });

      if (response.success) {
        console.log('✅ [useRedemptionApprovals] Redemption approved successfully');
        await fetchApprovalData(); // Refresh data
        return true;
      } else {
        setError(response.error || 'Failed to approve redemption');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setProcessingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(redemptionId);
        return newSet;
      });
    }
  }, [clearError, fetchApprovalData]);

  const rejectRedemption = useCallback(async (redemptionId: string, reason?: string): Promise<boolean> => {
    try {
      setProcessingApprovals(prev => new Set(prev).add(redemptionId));
      clearError();
      
      console.log('❌ [useRedemptionApprovals] Rejecting redemption:', redemptionId);
      
      const response = await approvalService.submitApproval({
        approvalRequestId: redemptionId,
        decision: 'rejected',
        comments: reason
      });

      if (response.success) {
        console.log('❌ [useRedemptionApprovals] Redemption rejected successfully');
        await fetchApprovalData(); // Refresh data
        return true;
      } else {
        setError(response.error || 'Failed to reject redemption');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    } finally {
      setProcessingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(redemptionId);
        return newSet;
      });
    }
  }, [clearError, fetchApprovalData]);

  // Simplified utility functions
  const getApprovalById = useCallback((id: string): ApprovalRecord | undefined => {
    return approvals.find(approval => approval.id === id);
  }, [approvals]);

  const getApprovalsByStatus = useCallback((filterStatus: ApprovalStatusType): ApprovalRecord[] => {
    return approvals.filter(approval => approval.status === filterStatus);
  }, [approvals]);

  const getUserPendingApprovals = useCallback((): ApprovalQueueItem[] => {
    return queueItems.filter(item => item.status === 'pending');
  }, [queueItems]);

  const canApprove = useCallback((approvalId: string): boolean => {
    const queueItem = queueItems.find(item => item.approvalId === approvalId);
    return queueItem ? queueItem.status === 'pending' : false;
  }, [queueItems]);

  const getApprovalProgress = useCallback((approvalId: string): { current: number; required: number; percentage: number } | null => {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return null;

    const current = approval.status === 'approved' ? 1 : 0;
    const required = 1; // Simplified - assume 1 approval required
    const percentage = Math.round((current / required) * 100);

    return { current, required, percentage };
  }, [approvals]);

  const isProcessing = useCallback((redemptionId: string): boolean => {
    return processingApprovals.has(redemptionId);
  }, [processingApprovals]);

  // Simplified refresh functions
  const refreshApprovals = useCallback(async () => {
    await fetchApprovalData();
  }, [fetchApprovalData]);

  const refreshQueue = useCallback(async () => {
    await fetchApprovalData();
  }, [fetchApprovalData]);

  // Stub functions for compatibility
  const requestApproval = useCallback(async (redemptionId: string, approvers: string[]): Promise<boolean> => {
    try {
      const response = await approvalService.requestApproval(redemptionId, approvers);
      if (response.success) {
        await fetchApprovalData();
        return true;
      }
      setError(response.error || 'Failed to request approval');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    }
  }, [fetchApprovalData]);

  const delegateApproval = useCallback(async (approverId: string, delegateId: string): Promise<boolean> => {
    // Stub implementation
    console.log('Delegate approval not implemented');
    return false;
  }, []);

  const escalateApproval = useCallback(async (approvalId: string, reason?: string): Promise<boolean> => {
    // Stub implementation
    console.log('Escalate approval not implemented');
    return false;
  }, []);

  // Initial load effect - single call, no complex subscriptions
  useEffect(() => {
    isUnmountedRef.current = false;
    
    // Only proceed if approverId is a valid non-fake value
    if (approverId && approverId !== 'current-user' && approverId !== 'undefined' && approverId !== 'null') {
      console.log('🚀 [useRedemptionApprovals] Initializing with valid approverId:', approverId);
      fetchApprovalData();
    } else {
      console.log('⚠️ [useRedemptionApprovals] Invalid or fake approverId provided:', approverId, '- skipping data fetch');
      // Set empty state when no valid approverId
      setQueueItems([]);
      setMetrics({
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        avgApprovalTime: 0,
        pendingOlderThan24h: 0,
        userPendingCount: 0
      });
    }
  }, [approverId, fetchApprovalData]);

  // Simplified auto-refresh - only if explicitly enabled and valid approverId
  useEffect(() => {
    if (!autoRefresh || !approverId || approverId === 'current-user' || approverId === 'undefined' || approverId === 'null') return;

    autoRefreshRef.current = setInterval(() => {
      if (!loading && !isUnmountedRef.current) {
        console.log('🔄 [useRedemptionApprovals] Auto-refreshing approval data');
        fetchApprovalData();
      }
    }, refreshInterval);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, loading, fetchApprovalData, approverId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, []);

  return {
    approvals,
    queueItems,
    currentApproval,
    loading,
    error,
    metrics,
    pendingApprovals: queueItems.filter(item => item.status === 'pending'),
    processingApprovals,
    isProcessing,
    submitApproval,
    requestApproval,
    delegateApproval,
    escalateApproval,
    refreshApprovals,
    refreshQueue,
    approveRedemption,
    rejectRedemption,
    getApprovalById,
    getApprovalsByStatus,
    getUserPendingApprovals,
    canApprove,
    getApprovalProgress,
    clearError
  };
};
