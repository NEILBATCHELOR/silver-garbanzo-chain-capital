import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RedemptionRequest, 
  RedemptionListResponse, 
  CreateRedemptionRequestInput,
  RedemptionRequestResponse,
  BulkRedemptionData,
  RedemptionStatusType
} from '../types';
import { redemptionService } from '../services';

export interface UseRedemptionsParams {
  investorId?: string;
  status?: RedemptionStatusType;
  enableRealtime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseRedemptionsReturn {
  redemptions: RedemptionRequest[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  realtimeConnected: boolean;
  // Actions
  createRedemption: (input: CreateRedemptionRequestInput) => Promise<RedemptionRequest | null>;
  createBulkRedemption: (data: BulkRedemptionData) => Promise<RedemptionRequest[] | null>;
  updateRedemption: (id: string, updates: Partial<RedemptionRequest>) => Promise<boolean>;
  cancelRedemption: (id: string) => Promise<boolean>;
  refreshRedemptions: () => Promise<void>;
  loadMore: () => Promise<void>;
  // Utility
  getRedemptionById: (id: string) => RedemptionRequest | undefined;
  getRedemptionsByStatus: (status: RedemptionStatusType) => RedemptionRequest[];
  clearError: () => void;
}

export const useRedemptions = (params: UseRedemptionsParams = {}): UseRedemptionsReturn => {
  const {
    investorId,
    status,
    enableRealtime = false, // Disabled by default
    autoRefresh = true, // Enabled by default for simple background refresh
    refreshInterval = 30000 // 30 seconds for simple refresh
  } = params;

  // Simplified state
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false); // Always false now
  
  // Simple refs - only for auto-refresh timer and unmount tracking
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Clear error function
  const clearError = useCallback(() => setError(null), []);

  // Fetch redemptions with enhanced error handling
  const fetchRedemptions = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isUnmountedRef.current) return;
    
    try {
      setLoading(true);
      clearError();

      const response: RedemptionListResponse = await redemptionService.getRedemptions({
        investorId,
        status,
        page,
        limit: 20
      });

      if (isUnmountedRef.current) return;

      if (response.success && response.data) {
        const responseData = response.data as any;
        const newRedemptions = Array.isArray(responseData) ? responseData : (responseData.redemptions || responseData.requests || responseData);
        
        setRedemptions(prev => append ? [...prev, ...newRedemptions] : newRedemptions);
        setTotalCount(response.totalCount || (responseData && typeof responseData === 'object' && 'totalCount' in responseData ? responseData.totalCount as number : newRedemptions.length));
        setHasMore(response.hasMore || (responseData && typeof responseData === 'object' && 'hasMore' in responseData ? Boolean(responseData.hasMore) : false));
        setCurrentPage(page);
      } else {
        setError(response.error || 'Failed to fetch redemptions');
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        console.error('Error fetching redemptions:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  }, [investorId, status, clearError]);

  // Create single redemption
  const createRedemption = useCallback(async (input: CreateRedemptionRequestInput): Promise<RedemptionRequest | null> => {
    try {
      setLoading(true);
      clearError();

      const response: RedemptionRequestResponse = await redemptionService.createRedemptionRequest(input);

      if (response.success) {
        const newRedemption = response.data;
        setRedemptions(prev => [newRedemption, ...prev]);
        setTotalCount(prev => prev + 1);
        return newRedemption;
      } else {
        setError(response.error || 'Failed to create redemption request');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Create bulk redemption
  const createBulkRedemption = useCallback(async (data: BulkRedemptionData): Promise<RedemptionRequest[] | null> => {
    try {
      setLoading(true);
      clearError();

      const requests: CreateRedemptionRequestInput[] = data.investors.map(investor => ({
        tokenAmount: investor.tokenAmount,
        tokenType: data.tokenType,
        redemptionType: data.redemptionType,
        sourceWallet: investor.sourceWallet || investor.walletAddress,
        destinationWallet: investor.destinationWallet || investor.walletAddress,
        sourceWalletAddress: investor.sourceWallet || investor.walletAddress,
        destinationWalletAddress: investor.destinationWallet || investor.walletAddress,
        conversionRate: data.conversionRate,
        usdcAmount: investor.usdcAmount || investor.tokenAmount * data.conversionRate,
        investorName: investor.investorName,
        investorId: investor.investorId
      }));
      
      const response = await redemptionService.createBulkRedemption(requests);

      if (response.success) {
        const newRedemptions = response.data.requests;
        setRedemptions(prev => [...newRedemptions, ...prev]);
        setTotalCount(prev => prev + newRedemptions.length);
        return newRedemptions;
      } else {
        setError(response.error || 'Failed to create bulk redemption');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Update redemption
  const updateRedemption = useCallback(async (id: string, updates: Partial<RedemptionRequest>): Promise<boolean> => {
    try {
      clearError();

      const response = await redemptionService.updateRedemptionRequest(id, updates);

      if (response.success) {
        setRedemptions(prev => prev.map(redemption => 
          redemption.id === id ? { ...redemption, ...updates } : redemption
        ));
        return true;
      } else {
        setError(response.error || 'Failed to update redemption');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    }
  }, [clearError]);

  // Cancel redemption
  const cancelRedemption = useCallback(async (id: string): Promise<boolean> => {
    try {
      clearError();

      const response = await redemptionService.cancelRedemptionRequest(id);

      if (response.success) {
        setRedemptions(prev => prev.map(redemption => 
          redemption.id === id ? { ...redemption, status: 'cancelled' } : redemption
        ));
        return true;
      } else {
        setError(response.error || 'Failed to cancel redemption');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return false;
    }
  }, [clearError]);

  // Refresh redemptions - enhanced for better cache busting
  const refreshRedemptions = useCallback(async () => {
    // Add cache busting parameter to ensure fresh data
    const cacheBuster = Date.now();
    console.log('🔄 Refreshing redemptions with cache buster:', cacheBuster);
    
    await fetchRedemptions(1, false);
  }, [fetchRedemptions]);

  // Load more redemptions
  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchRedemptions(currentPage + 1, true);
    }
  }, [hasMore, loading, currentPage, fetchRedemptions]);

  // Utility functions
  const getRedemptionById = useCallback((id: string): RedemptionRequest | undefined => {
    return redemptions.find(redemption => redemption.id === id);
  }, [redemptions]);

  const getRedemptionsByStatus = useCallback((filterStatus: RedemptionStatusType): RedemptionRequest[] => {
    return redemptions.filter(redemption => redemption.status === filterStatus);
  }, [redemptions]);

  // Initial load effect
  useEffect(() => {
    isUnmountedRef.current = false;
    fetchRedemptions(1, false);
  }, [fetchRedemptions]);

  // Enhanced auto-refresh effect with stable interval
  useEffect(() => {
    if (!autoRefresh) return;

    console.log('⏰ Setting up auto-refresh interval:', refreshInterval);
    
    const intervalId = setInterval(() => {
      if (!loading && !isUnmountedRef.current) {
        console.log('⏰ Auto-refresh triggered - fetching fresh data');
        fetchRedemptions(1, false);
      } else {
        console.log('⏰ Auto-refresh skipped (loading or unmounted)', { loading, unmounted: isUnmountedRef.current });
      }
    }, refreshInterval);

    // Store reference for cleanup
    autoRefreshRef.current = intervalId;

    return () => {
      console.log('🧹 Cleaning up auto-refresh interval');
      clearInterval(intervalId);
      autoRefreshRef.current = null;
    };
  }, [autoRefresh, refreshInterval, fetchRedemptions, loading]);

  // Simple cleanup effect on unmount
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
    redemptions,
    loading,
    error,
    totalCount,
    hasMore,
    realtimeConnected,
    createRedemption,
    createBulkRedemption,
    updateRedemption,
    cancelRedemption,
    refreshRedemptions,
    loadMore,
    getRedemptionById,
    getRedemptionsByStatus,
    clearError
  };
};