/**
 * Bond Data Hooks
 * React Query hooks for fetching and mutating bond data
 * Provides caching, optimistic updates, and automatic revalidation
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { BondsAPI } from '@/infrastructure/api/nav/bonds-api'
import type {
  BondProduct,
  BondProductInput,
  CouponPaymentInput,
  MarketPriceInput,
  BondCalculationParams
} from '@/types/nav/bonds'
import type {
  BondProductComplete,
  NAVResult,
  NAVCalculation,
  BulkUploadResult
} from '@/infrastructure/api/nav/bonds-api'

// ==================== QUERY KEYS ====================

export const bondKeys = {
  all: ['bonds'] as const,
  lists: () => [...bondKeys.all, 'list'] as const,
  list: (projectId: string) => [...bondKeys.lists(), projectId] as const,
  details: () => [...bondKeys.all, 'detail'] as const,
  detail: (bondId: string) => [...bondKeys.details(), bondId] as const,
  calculations: (bondId: string) => [...bondKeys.detail(bondId), 'calculations'] as const,
  marketPrices: (bondId: string) => [...bondKeys.detail(bondId), 'marketPrices'] as const,
  tokenLinks: (bondId: string) => [...bondKeys.detail(bondId), 'tokenLinks'] as const,
}

// ==================== QUERY HOOKS ====================

/**
 * Fetch a single bond with all supporting data
 */
export function useBond(
  bondId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: BondProductComplete }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: bondKeys.detail(bondId),
    queryFn: () => BondsAPI.getProduct(bondId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Fetch list of bonds for a project
 */
export function useBonds(
  projectId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: BondProduct[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: bondKeys.list(projectId),
    queryFn: () => BondsAPI.listProducts(projectId),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch calculation history for a bond
 */
export function useBondCalculationHistory(
  bondId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: NAVCalculation[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: bondKeys.calculations(bondId),
    queryFn: () => BondsAPI.getCalculationHistory(bondId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!bondId,
    ...options,
  })
}

/**
 * Fetch market prices for a bond
 */
export function useMarketPrices(
  bondId: string,
  options?: Omit<UseQueryOptions<{ success: boolean; data: MarketPriceInput[]; count: number }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: bondKeys.marketPrices(bondId),
    queryFn: () => BondsAPI.getMarketPrices(bondId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!bondId,
    ...options,
  })
}

/**
 * Fetch tokens linked to a bond
 */
export function useTokenLinks(
  bondId: string,
  options?: Omit<UseQueryOptions<{ 
    success: boolean; 
    data: Array<{
      id: string;
      name: string;
      symbol: string;
      product_id: string;
      ratio: number | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>; 
    count: number 
  }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: bondKeys.tokenLinks(bondId),
    queryFn: () => BondsAPI.getTokenLinks(bondId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!bondId,
    ...options,
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Create a new bond
 */
export function useCreateBond(
  options?: UseMutationOptions<{ success: boolean; data: BondProduct }, Error, BondProductInput>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: BondsAPI.createProduct,
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate lists to show new bond
      queryClient.invalidateQueries({ queryKey: bondKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Update a bond
 */
export function useUpdateBond(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; data: BondProduct }, Error, Partial<BondProductInput>>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data) => BondsAPI.updateProduct(bondId, data),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate both detail and lists
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      queryClient.invalidateQueries({ queryKey: bondKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Delete a bond
 */
export function useDeleteBond(
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: BondsAPI.deleteProduct,
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate lists to remove deleted bond
      queryClient.invalidateQueries({ queryKey: bondKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Add coupon payments to a bond
 */
export function useAddCouponPayments(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; count: number }, Error, CouponPaymentInput[]>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (payments) => BondsAPI.addCouponPayments(bondId, payments),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail to show new payments
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Delete a coupon payment from a bond
 */
export function useDeleteCouponPayment(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; message: string }, Error, string>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (paymentId) => BondsAPI.deleteCouponPayment(bondId, paymentId),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail to refresh payment list
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Add market prices to a bond
 */
export function useAddMarketPrices(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; count: number }, Error, MarketPriceInput[]>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (prices) => BondsAPI.addMarketPrices(bondId, prices),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail and market prices to show new prices
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      queryClient.invalidateQueries({ queryKey: bondKeys.marketPrices(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Update a market price for a bond
 */
export function useUpdateMarketPrice(
  bondId: string,
  options?: UseMutationOptions<
    { success: boolean; data: MarketPriceInput; message: string }, 
    Error, 
    { priceId: string; data: Partial<MarketPriceInput> }
  >
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ priceId, data }) => BondsAPI.updateMarketPrice(bondId, priceId, data),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail and market prices to refresh price list
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      queryClient.invalidateQueries({ queryKey: bondKeys.marketPrices(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Delete a market price from a bond
 */
export function useDeleteMarketPrice(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; message: string }, Error, string>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (priceId) => BondsAPI.deleteMarketPrice(bondId, priceId),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail and market prices to refresh price list
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      queryClient.invalidateQueries({ queryKey: bondKeys.marketPrices(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Bulk upload bonds
 */
export function useBulkUploadBonds(
  options?: UseMutationOptions<BulkUploadResult, Error, { bonds: BondProductInput[] }>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: BondsAPI.bulkUpload,
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate all bond lists
      queryClient.invalidateQueries({ queryKey: bondKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Calculate NAV for a bond
 */
export function useCalculateBondNAV(
  bondId: string,
  options?: UseMutationOptions<{ success: boolean; data: NAVResult }, Error, BondCalculationParams>
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params) => BondsAPI.calculateNAV(bondId, params),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate bond detail and calculation history
      queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
      queryClient.invalidateQueries({ queryKey: bondKeys.calculations(bondId) })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Batch calculate NAV for multiple bonds
 */
export function useBatchCalculateBondNAV(
  options?: UseMutationOptions<
    { success: boolean; results: NAVResult[] },
    Error,
    { bondIds: string[]; params: BondCalculationParams }
  >
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (variables) => BondsAPI.batchCalculate(variables.bondIds, variables.params),
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate all affected bonds
      variables.bondIds.forEach((bondId) => {
        queryClient.invalidateQueries({ queryKey: bondKeys.detail(bondId) })
        queryClient.invalidateQueries({ queryKey: bondKeys.calculations(bondId) })
      })
      queryClient.invalidateQueries({ queryKey: bondKeys.lists() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

/**
 * Download CSV template
 */
export async function downloadBondTemplate() {
  try {
    const blob = await BondsAPI.downloadTemplate()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bonds-template.csv'
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
 * Prefetch bond data
 */
export function usePrefetchBond(bondId: string) {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: bondKeys.detail(bondId),
      queryFn: () => BondsAPI.getProduct(bondId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Prefetch bonds list
 */
export function usePrefetchBonds(projectId: string) {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: bondKeys.list(projectId),
      queryFn: () => BondsAPI.listProducts(projectId),
      staleTime: 1 * 60 * 1000,
    })
  }
}

/**
 * Get latest YTM from NAV calculation
 */
export function useGetLatestYTM(bondId: string) {
  return useQuery({
    queryKey: ['bonds', bondId, 'latest-ytm'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/nav/bonds/${bondId}/latest-ytm`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch latest YTM')
      }
      
      const result = await response.json()
      return result.data as {
        ytm: number
        valuationDate: string
        navValue: number
        calculatedAt: string
      }
    },
    enabled: !!bondId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}
