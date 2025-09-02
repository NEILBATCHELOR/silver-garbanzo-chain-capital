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
  refreshing: boolean; // Separate state for refresh operations
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  realtimeConnected: boolean;
  lastRefreshTime: Date | null;
  // Actions
  createRedemption: (input: CreateRedemptionRequestInput) => Promise<RedemptionRequest | null>;
  createBulkRedemption: (data: BulkRedemptionData) => Promise<RedemptionRequest[] | null>;
  updateRedemption: (id: string, updates: Partial<RedemptionRequest>) => Promise<boolean>;
  cancelRedemption: (id: string) => Promise<boolean>;
  refreshRedemptions: () => Promise<void>;
  forceRefreshRedemptions: () => Promise<void>; // Force refresh with cache busting
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
    enableRealtime = false,
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = params;

  // Enhanced state management
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  // Refs for cleanup and state management
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchCountRef = useRef(0); // Track fetch attempts to prevent stale data

  // Clear error function
  const clearError = useCallback(() => setError(null), []);

  // Enhanced fetch function with abort controller and cache busting
  const fetchRedemptions = useCallback(async (
    page: number = 1, 
    append: boolean = false,
    forceRefresh: boolean = false
  ) => {
    if (isUnmountedRef.current) return;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentFetchCount = ++fetchCountRef.current;
    
    try {
      if (!append) {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      }
      clearError();

      console.log('📊 Fetching redemptions:', { 
        page, 
        append, 
        forceRefresh,
        investorId, 
        status,
        fetchCount: currentFetchCount 
      });

      // Add cache-busting parameter for force refresh
      const queryParams: any = {
        investorId,
        status,
        page,
        limit: 20
      };
      
      if (forceRefresh) {
        queryParams._t = Date.now(); // Cache-busting timestamp
      }

      const response: RedemptionListResponse = await redemptionService.getRedemptions(queryParams);

      // Check if this response is still relevant (not superseded by newer request)
      if (isUnmountedRef.current || currentFetchCount !== fetchCountRef.current) {
        console.log('🚫 Ignoring stale redemptions response:', { 
          currentFetchCount, 
          latestFetchCount: fetchCountRef.current 
        });
        return;
      }

      if (response.success && response.data) {
        const responseData = response.data as any;
        const newRedemptions = Array.isArray(responseData) ? responseData : (responseData.redemptions || responseData.requests || responseData);
        
        console.log('✅ Successfully fetched redemptions:', { 
          count: newRedemptions.length,
          totalCount: response.totalCount,
          page,
          append,
          forceRefresh
        });
        
        setRedemptions(prev => {
          const updated = append ? [...prev, ...newRedemptions] : newRedemptions;
          console.log('🔄 Updated redemptions state:', { 
            previousCount: prev.length, 
            newCount: updated.length 
          });
          return updated;
        });
        
        setTotalCount(response.totalCount || (responseData && typeof responseData === 'object' && 'totalCount' in responseData ? responseData.totalCount as number : newRedemptions.length));
        setHasMore(response.hasMore || (responseData && typeof responseData === 'object' && 'hasMore' in responseData ? Boolean(responseData.hasMore) : false));
        setCurrentPage(page);
        setLastRefreshTime(new Date());
        
        // Clear any existing errors on successful fetch
        setError(null);
      } else {
        console.error('❌ Failed to fetch redemptions:', response.error);
        setError(response.error || 'Failed to fetch redemptions');
      }
    } catch (err) {
      // Only set error if this wasn't cancelled
      if (!isUnmountedRef.current && currentFetchCount === fetchCountRef.current) {
        console.error('❌ Error fetching redemptions:', err);
        
        // Don't show abort errors to user
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      }
    } finally {
      if (!isUnmountedRef.current && currentFetchCount === fetchCountRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [investorId, status, clearError]);

  // Standard refresh (respects cache)
  const refreshRedemptions = useCallback(async () => {
    console.log('🔄 Refreshing redemptions (standard)');
    await fetchRedemptions(1, false, false);
  }, [fetchRedemptions]);

  // Force refresh with cache busting
  const forceRefreshRedemptions = useCallback(async () => {
    console.log('🔄 Force refreshing redemptions (cache-busting)');
    await fetchRedemptions(1, false, true);
  }, [fetchRedemptions]);

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
        setLastRefreshTime(new Date());
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
        setLastRefreshTime(new Date());
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
        setLastRefreshTime(new Date());
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
        setLastRefreshTime(new Date());
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

  // Load more redemptions
  const loadMore = useCallback(async () => {
    if (hasMore && !loading && !refreshing) {
      await fetchRedemptions(currentPage + 1, true, false);
    }
  }, [hasMore, loading, refreshing, currentPage, fetchRedemptions]);

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
    console.log('🚀 useRedemptions initial load:', { investorId, status });
    fetchRedemptions(1, false, false);
  }, [fetchRedemptions]);

  // Enhanced auto-refresh effect with stable interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    console.log('⏰ Setting up auto-refresh interval:', refreshInterval);
    
    // Clear any existing interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    // Create new interval with current fetchRedemptions reference
    autoRefreshRef.current = setInterval(() => {
      if (!loading && !refreshing && !isUnmountedRef.current) {
        console.log('⏰ Auto-refresh triggered');
        fetchRedemptions(1, false, true); // Force refresh for auto-refresh to ensure fresh data
      } else {
        console.log('⏰ Auto-refresh skipped (busy or unmounted)', { loading, refreshing, unmounted: isUnmountedRef.current });
      }
    }, refreshInterval);

    // Cleanup on effect change
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, loading, refreshing, fetchRedemptions]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 useRedemptions cleanup');
      isUnmountedRef.current = true;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear auto-refresh interval
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, []);

  return {
    redemptions,
    loading,
    refreshing,
    error,
    totalCount,
    hasMore,
    realtimeConnected,
    lastRefreshTime,
    createRedemption,
    createBulkRedemption,
    updateRedemption,
    cancelRedemption,
    refreshRedemptions,
    forceRefreshRedemptions,
    loadMore,
    getRedemptionById,
    getRedemptionsByStatus,
    clearError
  };
};