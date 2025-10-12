/**
 * useCouponSchedule Hook
 * 
 * React hook for managing bond coupon payment schedules
 * Handles fetching, creating, and validating coupon payments
 */

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BondsAPI } from '@/infrastructure/api/nav/bonds-api'
import type { CouponPaymentInput } from '@/types/nav/bonds'

export interface UseCouponScheduleOptions {
  bondId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useCouponSchedule({ 
  bondId, 
  onSuccess, 
  onError 
}: UseCouponScheduleOptions) {
  const queryClient = useQueryClient()
  
  // Mutation to add coupon payments
  const addCouponPaymentsMutation = useMutation({
    mutationFn: (payments: CouponPaymentInput[]) => 
      BondsAPI.addCouponPayments(bondId, payments),
    onSuccess: () => {
      // Invalidate bond data queries to refetch with new coupon payments
      queryClient.invalidateQueries({ queryKey: ['bond', bondId] })
      queryClient.invalidateQueries({ queryKey: ['bonds'] })
      onSuccess?.()
    },
    onError: (error: Error) => {
      console.error('Failed to add coupon payments:', error)
      onError?.(error)
    }
  })
  
  // Function to add coupon schedule
  const addCouponSchedule = useCallback(
    async (payments: CouponPaymentInput[]) => {
      return addCouponPaymentsMutation.mutateAsync(payments)
    },
    [addCouponPaymentsMutation]
  )
  
  return {
    addCouponSchedule,
    isLoading: addCouponPaymentsMutation.isPending,
    isSuccess: addCouponPaymentsMutation.isSuccess,
    isError: addCouponPaymentsMutation.isError,
    error: addCouponPaymentsMutation.error
  }
}
