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
        // TODO: Replace with actual backend endpoint when available
        // const result = await navService.getValuations({
        //   page, limit, userId, tags, isPublic, sortBy, sortOrder
        // })
        
        // Mock implementation for now
        const mockValuations = generateMockValuations(page, limit, userId)
        return mockValuations
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
        // TODO: Replace with actual backend endpoint
        // return await navService.getValuation(valuationId)
        
        // Mock implementation
        const mockValuations = generateMockValuations(1, 10)
        const valuation = mockValuations.data.find(v => v.id === valuationId)
        
        if (!valuation) {
          throw {
            message: 'Valuation not found',
            statusCode: 404,
            timestamp: new Date().toISOString()
          } as NavError
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

/**
 * Generate mock valuations for testing
 */
function generateMockValuations(page: number = 1, limit: number = 20, userId?: string): PaginatedResponse<NavValuation> {
  const total = 47 // Mock total count
  const startIndex = (page - 1) * limit
  
  const mockValuations: NavValuation[] = Array.from({ length: Math.min(limit, total - startIndex) }, (_, i) => {
    const index = startIndex + i
    return {
      id: `val_${index + 1}`,
      name: `NAV Calculation ${index + 1}`,
      description: `Saved NAV calculation from ${new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      calculationResult: {
        runId: `run_${index + 1}`,
        valuationDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        navValue: Math.random() * 10000000 + 1000000, // $1M - $11M
        navPerShare: Math.random() * 100 + 50, // $50 - $150
        totalAssets: Math.random() * 12000000 + 1200000,
        totalLiabilities: Math.random() * 2000000 + 200000,
        netAssets: Math.random() * 10000000 + 1000000,
        sharesOutstanding: Math.random() * 100000 + 10000,
        currency: 'USD',
        calculatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: ['completed', 'completed', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
        approvalStatus: ['approved', 'draft', 'validated'][Math.floor(Math.random() * 3)] as any
      },
      savedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      savedBy: userId || `user_${Math.floor(Math.random() * 10) + 1}`,
      tags: ['equity', 'q4-2024', 'final'][Math.floor(Math.random() * 3)] ? 
        [['equity', 'portfolio'], ['bonds', 'fixed-income'], ['mmf', 'liquidity']][Math.floor(Math.random() * 3)] : 
        undefined,
      isPublic: Math.random() > 0.7
    }
  })

  return {
    success: true,
    data: mockValuations,
    pagination: {
      total,
      page,
      limit,
      hasMore: startIndex + limit < total,
      totalPages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  }
}

export default useNavValuations
