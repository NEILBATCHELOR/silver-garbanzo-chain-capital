/**
 * useEnhancedTokens Hook
 * 
 * Enhanced React hook for managing token data with additional features
 * and standard-specific properties. Optimized with bulk fetching.
 */

import { useState, useEffect, useCallback } from 'react';
import { EnhancedTokenData } from '../types';
import { getBulkTokensForProject, getBulkTokenStatusCounts, BulkTokenData } from '../services/tokenBulkService';

interface UseEnhancedTokensResult {
  tokens: BulkTokenData[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  statusCounts: Record<string, number>;
}

export function useEnhancedTokens(projectId?: string): UseEnhancedTokensResult {
  const [tokens, setTokens] = useState<BulkTokenData[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Bulk fetch tokens with all properties
  const fetchTokens = useCallback(async () => {
    if (!projectId) {
      setTokens([]);
      setStatusCounts({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[useEnhancedTokens] Starting bulk fetch for project: ${projectId}`);
      
      // Fetch tokens and status counts in parallel for maximum performance
      const [tokensData, countsData] = await Promise.all([
        getBulkTokensForProject(projectId),
        getBulkTokenStatusCounts(projectId)
      ]);

      console.log(`[useEnhancedTokens] Successfully fetched ${tokensData.length} tokens`);
      
      setTokens(tokensData);
      setStatusCounts(countsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch tokens');
      setError(error);
      console.error('[useEnhancedTokens] Error fetching tokens:', error);
      setTokens([]);
      setStatusCounts({});
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Effect to fetch tokens when projectId changes
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const refetch = useCallback(async () => {
    await fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    loading,
    error,
    refetch,
    statusCounts
  };
}

export default useEnhancedTokens;
