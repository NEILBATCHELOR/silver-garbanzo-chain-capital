/**
 * Cached Token Hooks
 * 
 * Enhanced React hooks with React Query for caching token data
 * Provides automatic cache invalidation and background refetching
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { EnhancedTokenData } from '../types';
import { BulkTokenData, getBulkTokensForProject, getBulkTokenStatusCounts } from '../services/tokenBulkService';
import { getEnhancedTokenData } from '../services/tokenDataService';
import TokenCacheService from '../services/tokenCacheService';

// Query keys for React Query
export const tokenQueryKeys = {
  all: ['tokens'] as const,
  projects: () => [...tokenQueryKeys.all, 'projects'] as const,
  project: (projectId: string) => [...tokenQueryKeys.projects(), projectId] as const,
  bulkTokens: (projectId: string) => [...tokenQueryKeys.project(projectId), 'bulk'] as const,
  statusCounts: (projectId: string) => [...tokenQueryKeys.project(projectId), 'statusCounts'] as const,
  enhancedToken: (tokenId: string) => [...tokenQueryKeys.all, 'enhanced', tokenId] as const,
  computedData: (key: string) => [...tokenQueryKeys.all, 'computed', key] as const,
};

interface UseCachedTokensResult {
  tokens: BulkTokenData[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  statusCounts: Record<string, number>;
  cacheStats: any;
  invalidateCache: () => void;
}

/**
 * Enhanced hook for fetching tokens with React Query caching
 */
export function useCachedTokens(projectId?: string): UseCachedTokensResult {
  const queryClient = useQueryClient();
  const cacheService = TokenCacheService.getInstance();

  // Fetch bulk tokens with React Query
  const {
    data: tokens = [],
    isLoading: tokensLoading,
    error: tokensError,
    refetch: refetchTokens
  } = useQuery({
    queryKey: tokenQueryKeys.bulkTokens(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      
      // Check cache first
      const cached = cacheService.getBulkTokens(projectId);
      if (cached) {
        console.log(`[useCachedTokens] Using cached bulk tokens for project: ${projectId}`);
        return cached;
      }
      
      // Fetch from API and cache
      console.log(`[useCachedTokens] Fetching bulk tokens for project: ${projectId}`);
      const data = await getBulkTokensForProject(projectId);
      cacheService.setBulkTokens(projectId, data);
      
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2
  });

  // Fetch status counts with React Query
  const {
    data: statusCounts = {} as Record<string, number>,
    isLoading: countsLoading,
    error: countsError,
    refetch: refetchCounts
  } = useQuery<Record<string, number>>({
    queryKey: tokenQueryKeys.statusCounts(projectId || ''),
    queryFn: async () => {
      if (!projectId) return {};
      
      // Check cache first
      const cached = cacheService.getStatusCounts(projectId);
      if (cached) {
        console.log(`[useCachedTokens] Using cached status counts for project: ${projectId}`);
        return cached;
      }
      
      // Fetch from API and cache
      console.log(`[useCachedTokens] Fetching status counts for project: ${projectId}`);
      const data = await getBulkTokenStatusCounts(projectId);
      cacheService.setStatusCounts(projectId, data);
      
      return data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Combined loading state
  const loading = tokensLoading || countsLoading;
  
  // Combined error state
  const error = tokensError || countsError;

  // Refetch function that invalidates both queries
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchTokens(),
      refetchCounts()
    ]);
  }, [refetchTokens, refetchCounts]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    if (projectId) {
      cacheService.invalidateProject(projectId);
      queryClient.invalidateQueries({ queryKey: tokenQueryKeys.project(projectId) });
    }
  }, [projectId, queryClient, cacheService]);

  // Get cache statistics
  const cacheStats = useMemo(() => cacheService.getStats(), [cacheService]);

  return {
    tokens: tokens || [],
    loading,
    error: error as Error | null,
    refetch,
    statusCounts: statusCounts || {},
    cacheStats,
    invalidateCache
  };
}

/**
 * Hook for fetching enhanced token data with caching
 */
export function useCachedEnhancedToken(tokenId?: string) {
  const cacheService = TokenCacheService.getInstance();

  return useQuery({
    queryKey: tokenQueryKeys.enhancedToken(tokenId || ''),
    queryFn: async () => {
      if (!tokenId) return null;
      
      // Check cache first
      const cached = cacheService.getEnhancedToken(tokenId);
      if (cached) {
        console.log(`[useCachedEnhancedToken] Using cached enhanced token: ${tokenId}`);
        return cached;
      }
      
      // Fetch from API and cache
      console.log(`[useCachedEnhancedToken] Fetching enhanced token: ${tokenId}`);
      const data = await getEnhancedTokenData(tokenId);
      cacheService.setEnhancedToken(tokenId, data);
      
      return data;
    },
    enabled: !!tokenId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for caching computed data (expensive operations)
 */
export function useCachedComputation<T>(
  key: string,
  computeFn: () => T,
  dependencies: any[],
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): T {
  const cacheService = TokenCacheService.getInstance();

  return useMemo(() => {
    // Check cache first
    const cached = cacheService.getComputed<T>(key, ttl);
    if (cached !== null) {
      console.log(`[useCachedComputation] Using cached computation: ${key}`);
      return cached;
    }
    
    // Compute and cache
    console.log(`[useCachedComputation] Computing and caching: ${key}`);
    const result = computeFn();
    cacheService.setComputed(key, result, ttl);
    
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, ...dependencies]);
}

/**
 * Mutation hook for token operations with cache invalidation
 */
export function useTokenMutation() {
  const queryClient = useQueryClient();
  const cacheService = TokenCacheService.getInstance();

  return useMutation({
    mutationFn: async ({ 
      operation, 
      tokenId, 
      projectId, 
      data 
    }: { 
      operation: 'create' | 'update' | 'delete' | 'deploy';
      tokenId?: string;
      projectId: string;
      data?: any;
    }) => {
      // Your mutation logic here
      console.log(`[useTokenMutation] Executing ${operation} for token ${tokenId}`);
      
      // This would call your actual API
      // const result = await tokenAPI[operation](tokenId, data);
      // return result;
    },
    onSuccess: (data, variables) => {
      const { operation, tokenId, projectId } = variables;
      
      // Invalidate relevant caches
      if (tokenId) {
        cacheService.invalidateToken(tokenId);
        queryClient.invalidateQueries({ queryKey: tokenQueryKeys.enhancedToken(tokenId) });
      }
      
      cacheService.invalidateProject(projectId);
      queryClient.invalidateQueries({ queryKey: tokenQueryKeys.project(projectId) });
      
      console.log(`[useTokenMutation] Cache invalidated after ${operation}`);
    },
    onError: (error, variables) => {
      console.error(`[useTokenMutation] Error in ${variables.operation}:`, error);
    }
  });
}

/**
 * Hook for preloading token data
 */
export function useTokenPreloader() {
  const queryClient = useQueryClient();
  const cacheService = TokenCacheService.getInstance();

  const preloadEnhancedToken = useCallback(async (tokenId: string) => {
    // Check if already in cache
    if (cacheService.getEnhancedToken(tokenId)) {
      return;
    }

    // Prefetch with React Query
    await queryClient.prefetchQuery({
      queryKey: tokenQueryKeys.enhancedToken(tokenId),
      queryFn: async () => {
        const data = await getEnhancedTokenData(tokenId);
        cacheService.setEnhancedToken(tokenId, data);
        return data;
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient, cacheService]);

  const preloadProjectTokens = useCallback(async (projectId: string) => {
    // Check if already in cache
    if (cacheService.getBulkTokens(projectId)) {
      return;
    }

    // Prefetch with React Query
    await queryClient.prefetchQuery({
      queryKey: tokenQueryKeys.bulkTokens(projectId),
      queryFn: async () => {
        const data = await getBulkTokensForProject(projectId);
        cacheService.setBulkTokens(projectId, data);
        return data;
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient, cacheService]);

  return {
    preloadEnhancedToken,
    preloadProjectTokens
  };
}