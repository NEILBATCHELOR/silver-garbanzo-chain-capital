/**
 * useNavValuations Hook
 * React hook for managing saved NAV valuations with CRUD operations
 */

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { navService } from '@/services/nav'
import { NavValuation, NavError, PaginatedResponse, convertToNavError } from '@/types/nav'

export interface UseNavValuationsResult {
  // Data
  valuations: NavValuation[]
  pagination: PaginatedResponse<NavValuation>['pagination'] | null
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  isFetching: boolean
  
  // Actions
  refetch: () => void
  createValuation: (valuation: Omit<NavValuation, 'id' | 'savedAt'>) => Promise<NavValuation>
  updateValuation: (id: string, updates: Partial<NavValuation>) => Promise<NavValuation>
  deleteValuation: (id: string) => Promise<void>
  
  // Mutations state
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  createError: NavError | null
  updateError: NavError | null
  deleteError: NavError | null
}

interface UseNavValuationsOptions {
  page?: number
  limit?: number
  userId?: string
  tags?: string[]
  isPublic?: boolean
  sortBy?: 'savedAt' | 'name' | 'navValue'
  sortOrder?: 'asc' | 'desc'
  enabled?: boolean
  staleTime?: number
  gcTime?: number
  onError?: (error: NavError) => void
  onSuccess?: (data: PaginatedResponse<NavValuation>) => void
}

export function useNavValuations(options: UseNavValuationsOptions = {}): UseNavValuationsResult {
  const {
    page = 1,
    limit = 20,
    userId,
    tags,
    isPublic,
    sortBy = 'savedAt',
    sortOrder = 'desc',
    enabled = true,
    staleTime = 60000, // 1 minute for valuations
    gcTime = 300000, // 5 minutes
    onError,
    onSuccess
  } = options

  const queryClient = useQueryClient()
  const queryKey = ['nav', 'valuations', { page, limit, userId, tags, isPublic, sortBy, sortOrder }]

  // Main query for fetching valuations
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResponse<NavValuation>> => {
      try {
        // Fetch real data from nav_calculation_runs table via backend API
        const result = await navService.getCalculationRuns({
          page,
          limit,
          // Ensure sortBy maps only to allowed backend fields: 'status', 'navValue', 'valuationDate', 'calculatedAt'
          sortBy: sortBy === 'navValue'
            ? 'navValue'
            : sortBy === 'savedAt'
            ? 'calculatedAt'
            : sortBy === 'name'
            ? undefined
            : sortBy,
          sortOrder
        })
        const valuations: NavValuation[] = result.runs.map(run => ({
          id: run.runId,
          name: `${run.productType || 'Asset'} NAV - ${new Date(run.valuationDate).toLocaleDateString()}`,
          description: `NAV calculation for ${run.productType || 'asset'} on ${new Date(run.valuationDate).toLocaleDateString()}`,
          calculationResult: {
            runId: run.runId,
            valuationDate: run.valuationDate,
            navValue: run.navValue,
            navPerShare: run.navPerShare,
            totalAssets: run.totalAssets,
            totalLiabilities: run.totalLiabilities,
            netAssets: run.netAssets,
            sharesOutstanding: run.sharesOutstanding,
            currency: run.currency,
            calculatedAt: run.calculatedAt,
            status: run.status,
            approvalStatus: run.approvalStatus
          },
          savedAt: run.calculatedAt,
          savedBy: userId || 'system',
          tags: run.metadata?.tags as string[] | undefined,
          isPublic: false // Default to false, can be enhanced later
        }))

        return {
          success: true,
          data: valuations,
          pagination: result.pagination,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        if (error instanceof Error) {
          throw {
            message: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString()
          } as NavError
        }
        throw {
          message: 'Failed to fetch valuations',
          statusCode: 500,
          timestamp: new Date().toISOString()
        } as NavError
      }
    },
    enabled,
    staleTime,
    gcTime,
    retry: (failureCount, error) => {
      const navError = convertToNavError(error)
      if (navError?.statusCode && navError.statusCode >= 400 && navError.statusCode < 500) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Handle success callback using useEffect (modern React Query pattern)
  React.useEffect(() => {
    if (query.isSuccess && query.data && onSuccess) {
      onSuccess(query.data)
    }
  }, [query.isSuccess, query.data, onSuccess])

  // Handle error callback using useEffect
  React.useEffect(() => {
    if (query.isError && query.error && onError) {
      onError(convertToNavError(query.error))
    }
  }, [query.isError, query.error, onError])

  // Create valuation mutation
  const createMutation = useMutation({
    mutationFn: async (valuation: Omit<NavValuation, 'id' | 'savedAt'>): Promise<NavValuation> => {
      // TODO: Replace with actual backend endpoint
      // return await navService.createValuation(valuation)
      
      // Mock implementation
      const newValuation: NavValuation = {
        ...valuation,
        id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        savedAt: new Date().toISOString()
      }
      return newValuation
    },
    onSuccess: (newValuation) => {
      // Invalidate and refetch valuations
      queryClient.invalidateQueries({ queryKey: ['nav', 'valuations'] })
      
      // Optionally update the cache directly
      queryClient.setQueryData(queryKey, (oldData: PaginatedResponse<NavValuation> | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: [newValuation, ...oldData.data.slice(0, limit - 1)],
          pagination: {
            ...oldData.pagination,
            total: oldData.pagination.total + 1
          }
        }
      })
    }
  })

  // Update valuation mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NavValuation> }): Promise<NavValuation> => {
      // TODO: Replace with actual backend endpoint
      // return await navService.updateValuation(id, updates)
      
      // Mock implementation
      const existingValuation = query.data?.data.find(v => v.id === id)
      if (!existingValuation) {
        throw {
          message: 'Valuation not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        } as NavError
      }
      
      return {
        ...existingValuation,
        ...updates,
        id, // Ensure ID doesn't change
        savedAt: existingValuation.savedAt // Preserve original save time
      }
    },
    onSuccess: (updatedValuation) => {
      // Update the specific valuation in cache
      queryClient.setQueryData(queryKey, (oldData: PaginatedResponse<NavValuation> | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: oldData.data.map(v => v.id === updatedValuation.id ? updatedValuation : v)
        }
      })
    }
  })

  // Delete valuation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // TODO: Replace with actual backend endpoint
      // await navService.deleteValuation(id)
      
      // Mock implementation - just simulate the deletion
      console.log(`Deleting valuation: ${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Remove the valuation from cache
      queryClient.setQueryData(queryKey, (oldData: PaginatedResponse<NavValuation> | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: oldData.data.filter(v => v.id !== deletedId),
          pagination: {
            ...oldData.pagination,
            total: oldData.pagination.total - 1
          }
        }
      })
    }
  })

  return {
    // Data
    valuations: query.data?.data || [],
    pagination: query.data?.pagination || null,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    isFetching: query.isFetching,
    
    // Actions
    refetch: query.refetch,
    createValuation: (valuation) => createMutation.mutateAsync(valuation),
    updateValuation: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteValuation: (id) => deleteMutation.mutateAsync(id),
    
    // Mutations state
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error ? convertToNavError(createMutation.error) : null,
    updateError: updateMutation.error ? convertToNavError(updateMutation.error) : null,
    deleteError: deleteMutation.error ? convertToNavError(deleteMutation.error) : null
  }
}

/**
 * Hook for a specific valuation by ID
 */
export function useNavValuation(valuationId: string, options: Omit<UseNavValuationsOptions, 'page' | 'limit'> = {}) {
  const queryKey = ['nav', 'valuation', valuationId]

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<NavValuation> => {
      try {
        // Fetch specific calculation run by ID
        const run = await navService.getCalculationById(valuationId)
        
        // Map NavCalculationResult to NavValuation format
        const valuation: NavValuation = {
          id: run.runId,
          name: `${run.productType || 'Asset'} NAV - ${new Date(run.valuationDate).toLocaleDateString()}`,
          description: `NAV calculation for ${run.productType || 'asset'} on ${new Date(run.valuationDate).toLocaleDateString()}`,
          calculationResult: {
            runId: run.runId,
            valuationDate: run.valuationDate,
            navValue: run.navValue,
            navPerShare: run.navPerShare,
            totalAssets: run.totalAssets,
            totalLiabilities: run.totalLiabilities,
            netAssets: run.netAssets,
            sharesOutstanding: run.sharesOutstanding,
            currency: run.currency,
            calculatedAt: run.calculatedAt,
            status: run.status,
            approvalStatus: run.approvalStatus
          },
          savedAt: run.calculatedAt,
          savedBy: 'system',
          tags: run.metadata?.tags as string[] | undefined,
          isPublic: false
        }
        
        return valuation
      } catch (error) {
        if (error instanceof Error) {
          throw {
            message: error.message,
            statusCode: 500,
            timestamp: new Date().toISOString()
          } as NavError
        }
        throw error
      }
    },
    enabled: options.enabled !== false && !!valuationId,
    staleTime: options.staleTime || 300000, // 5 minutes for individual valuations
    gcTime: options.gcTime || 600000, // 10 minutes
    retry: (failureCount, error) => {
      const navError = convertToNavError(error)
      if (navError?.statusCode && navError.statusCode >= 400 && navError.statusCode < 500) {
        return false
      }
      return failureCount < 2
    }
  })

  return {
    valuation: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    refetch: query.refetch
  }
}

export default useNavValuations
