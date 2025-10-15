/**
 * MMF Data Hooks
 * React Query hooks for fetching and mutating MMF data
 * Provides caching, optimistic updates, and automatic revalidation
 * Following Bonds implementation pattern
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { MMFAPI } from '@/infrastructure/api/nav/mmf-api'
import type {
  MMFProduct,
  MMFProductInput,
  MMFHolding,
  MMFHoldingInput,
  MMFNAVHistory,
  MMFLiquidityBucket,
  MMFCalculationParams,
  MMFNAVResult
} from '@/types/nav/mmf'
import type {
  MMFProductComplete,
  MMFCalculation,
  BulkUploadResult
} from '@/infrastructure/api/nav/mmf-api'

// ==================== QUERY KEYS ====================

export const mmfKeys = {
  all: ['mmf'] as const,
  lists: () => [...mmfKeys.all, 'list'] as const,
  list: (projectId: string) => [...mmfKeys.lists(), projectId] as const,
  details: () => [...mmfKeys.all, 'detail'] as const,
  detail: (fundId: string) => [...mmfKeys.details(), fundId] as const,
  holdings: (fundId: string) => [...mmfKeys.detail(fundId), 'holdings'] as const,
  liquidityBuckets: (fundId: string) => [...mmfKeys.detail(fundId), 'liquidityBuckets'] as const,
  navHistory: (fundId: string) => [...mmfKeys.detail(fundId), 'navHistory'] as const,
  calculations: (fundId: string) => [...mmfKeys.detail(fundId), 'calculations'] as const,
  latestNAV: (fundId: string) => [...mmfKeys.detail(fundId), 'latestNAV'] as const,
}

// ==================== QUERY HOOKS ====================

/**
 * Fetch a single MMF with all supporting data
 */
export function useMMF(
  fundId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFProductComplete }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFProductComplete }, Error>({
    queryKey: mmfKeys.detail(fundId),
    queryFn: () => MMFAPI.getProduct(fundId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Fetch list of MMFs for a project
 */
export function useMMFs(
  projectId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFProduct[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFProduct[] }, Error>({
    queryKey: mmfKeys.list(projectId),
    queryFn: () => MMFAPI.listProducts(projectId),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch holdings for an MMF
 */
export function useMMFHoldings(
  fundId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFHolding[]; count: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFHolding[]; count: number }, Error>({
    queryKey: mmfKeys.holdings(fundId),
    queryFn: () => MMFAPI.getHoldings(fundId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!fundId,
    ...options,
  })
}

/**
 * Fetch liquidity buckets for an MMF
 */
export function useMMFLiquidityBuckets(
  fundId: string,
  asOfDate?: Date,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFLiquidityBucket[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFLiquidityBucket[] }, Error>({
    queryKey: [...mmfKeys.liquidityBuckets(fundId), asOfDate?.toISOString()],
    queryFn: () => MMFAPI.getLiquidityBuckets(fundId, asOfDate),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!fundId,
    ...options,
  })
}

/**
 * Fetch NAV history for an MMF
 */
export function useMMFNAVHistory(
  fundId: string,
  from?: Date,
  to?: Date,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFNAVHistory[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFNAVHistory[] }, Error>({
    queryKey: [...mmfKeys.navHistory(fundId), from?.toISOString(), to?.toISOString()],
    queryFn: () => MMFAPI.getNAVHistory(fundId, from, to),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!fundId,
    ...options,
  })
}

/**
 * Fetch latest NAV for an MMF
 */
export function useLatestMMFNAV(
  fundId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFNAVHistory }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFNAVHistory }, Error>({
    queryKey: mmfKeys.latestNAV(fundId),
    queryFn: () => MMFAPI.getLatestNAV(fundId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!fundId,
    ...options,
  })
}

/**
 * Fetch calculation history for an MMF
 */
export function useMMFCalculationHistory(
  fundId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MMFCalculation[] }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ success: boolean; data: MMFCalculation[] }, Error>({
    queryKey: mmfKeys.calculations(fundId),
    queryFn: () => MMFAPI.getCalculationHistory(fundId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!fundId,
    ...options,
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Create a new MMF
 */
export function useCreateMMF(
  options?: UseMutationOptions<{ success: boolean; data: MMFProduct }, Error, MMFProductInput, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: MMFAPI.createProduct,
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate lists to show new MMF
      queryClient.invalidateQueries({ queryKey: mmfKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Update an MMF
 */
export function useUpdateMMF(
  fundId: string,
  options?: UseMutationOptions<{ success: boolean; data: MMFProduct }, Error, Partial<MMFProductInput>, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data) => MMFAPI.updateProduct(fundId, data),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate both detail and lists
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Delete an MMF
 */
export function useDeleteMMF(
  options?: UseMutationOptions<{ success: boolean }, Error, string, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: MMFAPI.deleteProduct,
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate lists to remove deleted MMF
      queryClient.invalidateQueries({ queryKey: mmfKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Add holdings to an MMF
 */
export function useAddMMFHoldings(
  fundId: string,
  options?: UseMutationOptions<{ success: boolean; count: number }, Error, MMFHoldingInput[], unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (holdings) => MMFAPI.addHoldings(fundId, holdings),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate MMF detail and holdings to show new holdings
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.holdings(fundId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Update an MMF holding
 */
export function useUpdateMMFHolding(
  fundId: string,
  options?: UseMutationOptions<
    { success: boolean; data: MMFHolding; message: string }, 
    Error, 
    { holdingId: string; data: Partial<MMFHoldingInput> },
    unknown
  >
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ holdingId, data }) => MMFAPI.updateHolding(fundId, holdingId, data),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate MMF detail and holdings to refresh holding list
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.holdings(fundId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Delete an MMF holding
 */
export function useDeleteMMFHolding(
  fundId: string,
  options?: UseMutationOptions<{ success: boolean; message: string }, Error, string, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (holdingId) => MMFAPI.deleteHolding(fundId, holdingId),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate MMF detail and holdings to refresh holding list
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.holdings(fundId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Bulk upload MMF holdings
 */
export function useBulkUploadMMFHoldings(
  fundId: string,
  options?: UseMutationOptions<BulkUploadResult, Error, { holdings: MMFHoldingInput[] }, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data) => MMFAPI.bulkUploadHoldings(fundId, data),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate MMF detail and holdings
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.holdings(fundId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Calculate NAV for an MMF
 */
export function useCalculateMMFNAV(
  fundId: string,
  options?: UseMutationOptions<{ success: boolean; data: MMFNAVResult }, Error, MMFCalculationParams, unknown>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params) => MMFAPI.calculateNAV(fundId, params),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate MMF detail, NAV history, and calculation history
      queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.navHistory(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.calculations(fundId) })
      queryClient.invalidateQueries({ queryKey: mmfKeys.latestNAV(fundId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Batch calculate NAV for multiple MMFs
 */
export function useBatchCalculateMMFNAV(
  options?: UseMutationOptions<
    { success: boolean; results: MMFNAVResult[] },
    Error,
    { fundIds: string[]; params: MMFCalculationParams },
    unknown
  >
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (variables) => MMFAPI.batchCalculate(variables.fundIds, variables.params),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate all affected MMFs
      variables.fundIds.forEach((fundId) => {
        queryClient.invalidateQueries({ queryKey: mmfKeys.detail(fundId) })
        queryClient.invalidateQueries({ queryKey: mmfKeys.navHistory(fundId) })
        queryClient.invalidateQueries({ queryKey: mmfKeys.calculations(fundId) })
        queryClient.invalidateQueries({ queryKey: mmfKeys.latestNAV(fundId) })
      })
      queryClient.invalidateQueries({ queryKey: mmfKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Download holdings CSV template
 */
export async function downloadMMFHoldingsTemplate() {
  try {
    const blob = await MMFAPI.downloadHoldingsTemplate()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mmf-holdings-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download template:', error)
    throw error
  }
}

// ==================== UTILITY HOOKS ====================

/**
 * Prefetch MMF data
 */
export function usePrefetchMMF(fundId: string) {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.prefetchQuery<{ success: boolean; data: MMFProductComplete }, Error>({
      queryKey: mmfKeys.detail(fundId),
      queryFn: () => MMFAPI.getProduct(fundId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Prefetch MMFs list
 */
export function usePrefetchMMFs(projectId: string) {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.prefetchQuery<{ success: boolean; data: MMFProduct[] }, Error>({
      queryKey: mmfKeys.list(projectId),
      queryFn: () => MMFAPI.listProducts(projectId),
      staleTime: 1 * 60 * 1000,
    })
  }
}
