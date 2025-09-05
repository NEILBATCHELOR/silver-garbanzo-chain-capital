/**
 * useNavHistory Hook
 * React hook for fetching NAV calculation history with pagination
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { navService } from '@/services/nav'
import { NavRunsListRequest, CalculationResult, NavError, convertToNavError, AssetType, CalculationStatus, ApprovalStatus } from '@/types/nav'
import type { NavCalculationResult } from '@/services/nav/NavService'

export interface UseNavHistoryResult {
  // Data
  runs: CalculationResult[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  } | null
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  isFetching: boolean
  isPlaceholderData: boolean
  
  // Actions
  refetch: () => void
  
  // Pagination helpers
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface UseNavHistoryOptions {
  enabled?: boolean
  refetchInterval?: number // Auto-refresh interval in ms
  staleTime?: number // How long data stays fresh
  gcTime?: number // Garbage collection time (formerly cacheTime)
}

const defaultParams: NavRunsListRequest = {
  page: 1,
  limit: 20,
  sortBy: 'calculatedAt',
  sortOrder: 'desc'
}

export function useNavHistory(
  params: NavRunsListRequest = defaultParams,
  options: UseNavHistoryOptions = {}
): UseNavHistoryResult {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 30000, // 30 seconds
    gcTime = 300000 // 5 minutes
  } = options

  // Merge params with defaults
  const queryParams = { ...defaultParams, ...params }

  const query = useQuery({
    queryKey: ['nav', 'runs', queryParams],
    queryFn: async () => {
      try {
        const serviceResult = await navService.getCalculationRuns(queryParams)
        // Transform NavCalculationResult to CalculationResult
        const transformedRuns: CalculationResult[] = serviceResult.runs.map((run: NavCalculationResult) => ({
          runId: run.runId,
          assetId: run.assetId,
          projectId: run.projectId,
          productType: run.productType as AssetType,
          valuationDate: run.valuationDate,
          navValue: run.navValue,
          navPerShare: run.navPerShare,
          totalAssets: run.totalAssets,
          totalLiabilities: run.totalLiabilities,
          netAssets: run.netAssets,
          sharesOutstanding: run.sharesOutstanding,
          currency: run.currency,
          calculatedAt: run.calculatedAt,
          status: run.status as CalculationStatus,
          approvalStatus: run.approvalStatus as ApprovalStatus,
          errorMessage: run.errorMessage,
          metadata: run.metadata
        }))
        
        return {
          runs: transformedRuns,
          pagination: serviceResult.pagination
        }
      } catch (error) {
        throw convertToNavError(error)
      }
    },
    enabled,
    staleTime,
    gcTime,
    refetchInterval,
    placeholderData: keepPreviousData, // Keep previous data while fetching new
    retry: (failureCount, error) => {
      // Don't retry client errors (4xx)
      const navError = convertToNavError(error)
      if (navError?.statusCode && navError.statusCode >= 400 && navError.statusCode < 500) {
        return false
      }
      return failureCount < 2 // Retry up to 2 times for server errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000) // Exponential backoff, max 10s
  })

  // Pagination helpers
  const hasNextPage = query.data?.pagination?.hasMore ?? false
  const hasPreviousPage = (query.data?.pagination?.page ?? 1) > 1

  return {
    // Data
    runs: query.data?.runs ?? [],
    pagination: query.data?.pagination ?? null,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    
    // Actions
    refetch: query.refetch,
    
    // Pagination helpers
    hasNextPage,
    hasPreviousPage
  }
}

/**
 * Hook for getting specific NAV run details
 */
export function useNavRunDetails(runId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ['nav', 'run', runId],
    queryFn: async () => {
      try {
        return await navService.getCalculationById(runId)
      } catch (error) {
        if (error instanceof Error) {
          throw {
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString()
          } as NavError
        }
        throw {
          message: 'Failed to fetch run details',
          statusCode: 500,
          timestamp: new Date().toISOString()
        } as NavError
      }
    },
    enabled: enabled && Boolean(runId),
    staleTime: 60000, // 1 minute - run details don't change often
    gcTime: 600000, // 10 minutes
    retry: 1 // Single retry for run details
  })

  return {
    run: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    refetch: query.refetch
  }
}

/**
 * Hook for NAV history with real-time updates
 * Useful for dashboard displays that need frequent updates
 */
export function useNavHistoryRealtime(
  params: NavRunsListRequest = defaultParams,
  options: UseNavHistoryOptions = {}
) {
  return useNavHistory(params, {
    ...options,
    refetchInterval: options.refetchInterval ?? 30000, // 30 seconds default
    staleTime: 10000 // 10 seconds - more aggressive for real-time
  })
}

/**
 * Hook for exporting NAV history data
 * Fetches all available runs for export purposes
 */
export function useNavHistoryExport(filters?: Omit<NavRunsListRequest, 'page' | 'limit'>) {
  const query = useQuery({
    queryKey: ['nav', 'runs', 'export', filters],
    queryFn: async () => {
      // Fetch all runs for export (large limit)
      const exportParams: NavRunsListRequest = {
        ...filters,
        page: 1,
        limit: 1000, // Large limit for export
        sortBy: 'calculatedAt',
        sortOrder: 'desc'
      }
      
      try {
        return await navService.getCalculationRuns(exportParams)
      } catch (error) {
        if (error instanceof Error) {
          throw {
            message: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString()
          } as NavError
        }
        throw {
          message: 'Failed to export NAV history',
          statusCode: 500,
          timestamp: new Date().toISOString()
        } as NavError
      }
    },
    enabled: false, // Manual trigger only
    staleTime: 0, // Always fetch fresh data for export
    gcTime: 0 // Don't cache export data
  })

  return {
    runs: query.data?.runs ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    exportData: query.refetch // Manual trigger function
  }
}

export default useNavHistory
