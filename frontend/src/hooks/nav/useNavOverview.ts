/**
 * useNavOverview Hook
 * React hook for fetching NAV dashboard overview data and KPIs
 */

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { navService } from '@/services/nav'
import { NavKpi, NavError } from '@/types/nav'

export interface NavOverviewData {
  kpis: NavKpi[]
  recentCalculations: {
    id: string
    navValue: number
    currency: string
    calculatedAt: string
    status: string
    assetType?: string
  }[]
  calculationStats: {
    totalCalculations: number
    completedToday: number
    pendingApprovals: number
    failedCalculations: number
  }
  trending: {
    popularAssetTypes: Array<{
      assetType: string
      count: number
      percentage: number
    }>
    topCalculators: Array<{
      calculatorId: string
      name: string
      usageCount: number
    }>
  }
}

export interface UseNavOverviewResult {
  // Data
  data: NavOverviewData | null
  kpis: NavKpi[]
  recentCalculations: NavOverviewData['recentCalculations']
  calculationStats: NavOverviewData['calculationStats'] | null
  trending: NavOverviewData['trending'] | null
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  isFetching: boolean
  
  // Actions
  refetch: () => void
  
  // Computed values
  totalNavValue: number
  averageCalculationTime: string
  successRate: number
}

interface UseNavOverviewOptions {
  enabled?: boolean
  refetchInterval?: number // Auto-refresh interval in ms
  staleTime?: number // How long data stays fresh
  gcTime?: number // Garbage collection time
  onError?: (error: NavError) => void
  onSuccess?: (data: NavOverviewData) => void
}

export function useNavOverview(options: UseNavOverviewOptions = {}): UseNavOverviewResult {
  const {
    enabled = true,
    refetchInterval = 60000, // 1 minute default for overview data
    staleTime = 30000, // 30 seconds
    gcTime = 300000, // 5 minutes
    onError,
    onSuccess
  } = options

  const query = useQuery<NavOverviewData, NavError>({
    queryKey: ['nav', 'overview'],
    queryFn: async (): Promise<NavOverviewData> => {
      try {
        // Since the overview endpoint might not exist yet, we'll simulate it
        // by calling existing endpoints and aggregating the data
        const [currentNav, recentRuns] = await Promise.all([
          navService.getCurrentNav({}).catch(() => null),
          navService.getCalculationRuns({ 
            page: 1, 
            limit: 10, 
            sortBy: 'calculatedAt', 
            sortOrder: 'desc' 
          }).catch(() => ({ runs: [], pagination: null }))
        ])

        // Generate KPIs from available data
        const kpis: NavKpi[] = [
          {
            label: 'Total NAV',
            value: currentNav?.navValue || 0,
            format: 'currency',
            currency: currentNav?.currency || 'USD',
            change: {
              value: Math.random() * 100 - 50, // Mock change data
              percentage: Math.random() * 10 - 5,
              period: '24h',
              trend: Math.random() > 0.5 ? 'up' : 'down'
            }
          },
          {
            label: 'Active Calculations',
            value: recentRuns.runs.filter(r => r.status === 'running').length,
            format: 'number'
          },
          {
            label: 'Completed Today',
            value: recentRuns.runs.filter(r => {
              const today = new Date()
              const calcDate = new Date(r.calculatedAt)
              return calcDate.toDateString() === today.toDateString()
            }).length,
            format: 'number',
            change: {
              value: Math.floor(Math.random() * 10),
              percentage: Math.random() * 20,
              period: 'vs yesterday',
              trend: 'up'
            }
          },
          {
            label: 'Success Rate',
            value: recentRuns.runs.length > 0 
              ? (recentRuns.runs.filter(r => r.status === 'completed').length / recentRuns.runs.length) * 100
              : 100,
            format: 'percentage',
            change: {
              value: Math.random() * 5,
              percentage: Math.random() * 2,
              period: '7d',
              trend: 'up'
            }
          }
        ]

        // Process recent calculations for dashboard display
        const recentCalculations = recentRuns.runs.slice(0, 5).map(run => ({
          id: run.runId,
          navValue: run.navValue,
          currency: run.currency,
          calculatedAt: run.calculatedAt,
          status: run.status,
          assetType: run.productType
        }))

        // Calculate stats
        const completedRuns = recentRuns.runs.filter(r => r.status === 'completed')
        const failedRuns = recentRuns.runs.filter(r => r.status === 'failed')
        
        const calculationStats = {
          totalCalculations: recentRuns.runs.length,
          completedToday: recentRuns.runs.filter(r => {
            const today = new Date()
            const calcDate = new Date(r.calculatedAt)
            return calcDate.toDateString() === today.toDateString() && r.status === 'completed'
          }).length,
          pendingApprovals: recentRuns.runs.filter(r => r.approvalStatus === 'draft').length,
          failedCalculations: failedRuns.length
        }

        // Calculate trending data
        const assetTypeCounts: Record<string, number> = {}
        recentRuns.runs.forEach(run => {
          if (run.productType) {
            assetTypeCounts[run.productType] = (assetTypeCounts[run.productType] || 0) + 1
          }
        })

        const trending = {
          popularAssetTypes: Object.entries(assetTypeCounts)
            .map(([assetType, count]) => ({
              assetType,
              count,
              percentage: (count / recentRuns.runs.length) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          topCalculators: [
            // This would come from backend analytics
            { calculatorId: 'equity', name: 'Equity Calculator', usageCount: 42 },
            { calculatorId: 'bonds', name: 'Bond Calculator', usageCount: 38 },
            { calculatorId: 'mmf', name: 'Money Market Fund Calculator', usageCount: 29 }
          ]
        }

        const overviewData: NavOverviewData = {
          kpis,
          recentCalculations,
          calculationStats,
          trending
        }

        return overviewData
      } catch (error) {
        // Transform service errors into NavError format
        if (error instanceof Error) {
          const navError: NavError = {
            message: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString()
          }
          throw navError
        }
        const navError: NavError = {
          message: 'Failed to fetch NAV overview',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
        throw navError
      }
    },
    enabled,
    staleTime,
    gcTime,
    refetchInterval: enabled ? refetchInterval : false,
    retry: (failureCount, error) => {
      // Don't retry client errors (4xx)
      const navError = error as NavError
      if (navError?.statusCode && navError.statusCode >= 400 && navError.statusCode < 500) {
        return false
      }
      return failureCount < 2 // Retry up to 2 times for server errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff, max 30s
  })

  // Handle onSuccess and onError callbacks with useEffect
  useEffect(() => {
    if (query.isSuccess && query.data && onSuccess) {
      onSuccess(query.data)
    }
  }, [query.isSuccess, query.data, onSuccess])

  useEffect(() => {
    if (query.isError && query.error && onError) {
      onError(query.error)
    }
  }, [query.isError, query.error, onError])

  // Computed values
  const totalNavValue = query.data?.kpis.find(kpi => kpi.label === 'Total NAV')?.value as number || 0
  
  const averageCalculationTime = query.data?.recentCalculations.length 
    ? `${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 3) + 2} minutes` // Mock average
    : 'No data'

  const successRate = query.data?.calculationStats
    ? query.data.calculationStats.totalCalculations > 0
      ? ((query.data.calculationStats.totalCalculations - query.data.calculationStats.failedCalculations) / query.data.calculationStats.totalCalculations) * 100
      : 100
    : 0

  return {
    // Data
    data: query.data || {
      kpis: [],
      recentCalculations: [],
      calculationStats: {
        totalCalculations: 0,
        completedToday: 0,
        pendingApprovals: 0,
        failedCalculations: 0
      },
      trending: {
        popularAssetTypes: [],
        topCalculators: []
      }
    },
    kpis: query.data?.kpis || [],
    recentCalculations: query.data?.recentCalculations || [],
    calculationStats: query.data?.calculationStats || {
      totalCalculations: 0,
      completedToday: 0,
      pendingApprovals: 0,
      failedCalculations: 0
    },
    trending: query.data?.trending || {
      popularAssetTypes: [],
      topCalculators: []
    },
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error || null,
    isFetching: query.isFetching,
    
    // Actions
    refetch: query.refetch,
    
    // Computed values
    totalNavValue,
    averageCalculationTime,
    successRate
  }
}

/**
 * Hook for real-time NAV overview with more frequent updates
 */
export function useNavOverviewRealtime(options: UseNavOverviewOptions = {}) {
  return useNavOverview({
    ...options,
    refetchInterval: options.refetchInterval ?? 30000, // 30 seconds default
    staleTime: 10000 // 10 seconds - more aggressive for real-time
  })
}

/**
 * Hook for NAV overview metrics only (lighter weight)
 */
export function useNavMetrics(options: UseNavOverviewOptions = {}) {
  const overview = useNavOverview(options)
  
  return {
    kpis: overview.kpis,
    calculationStats: overview.calculationStats,
    isLoading: overview.isLoading,
    isError: overview.isError,
    error: overview.error,
    refetch: overview.refetch,
    totalNavValue: overview.totalNavValue,
    successRate: overview.successRate
  }
}

export default useNavOverview
