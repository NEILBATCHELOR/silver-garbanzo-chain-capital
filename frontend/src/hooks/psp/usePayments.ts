/**
 * Use PSP Payments Hook
 * React hook for managing PSP payments
 */

import { useState, useEffect, useCallback } from 'react'
import { pspPaymentsService } from '@/services/psp'
import {
  PspPayment,
  PaymentsSummary,
  PaymentListFilters,
  CreateFiatPaymentRequest,
  CreateCryptoPaymentRequest
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function usePayments(projectId?: string, filters?: PaymentListFilters) {
  const [payments, setPayments] = useState<PspPayment[]>([])
  const [summary, setSummary] = useState<PaymentsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspPaymentsService.listPayments({
        project_id: projectId,
        ...filters
      })

      if (response.success && response.data) {
        setPayments(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch payments')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, filters, toast])

  // Fetch payments summary
  const fetchSummary = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspPaymentsService.getPaymentsSummary(projectId)

      if (response.success && response.data) {
        setSummary(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch payments summary')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  // Create fiat payment
  const createFiatPayment = useCallback(async (data: CreateFiatPaymentRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspPaymentsService.createFiatPayment(data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Fiat payment created successfully'
        })
        
        // Refresh the list
        await fetchPayments()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to create fiat payment')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchPayments, toast])

  // Create crypto payment
  const createCryptoPayment = useCallback(async (data: CreateCryptoPaymentRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspPaymentsService.createCryptoPayment(data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Crypto payment created successfully'
        })
        
        // Refresh the list
        await fetchPayments()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to create crypto payment')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchPayments, toast])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchPayments()
    fetchSummary()
  }, [fetchPayments, fetchSummary])

  return {
    payments,
    summary,
    loading,
    error,
    fetchPayments,
    fetchSummary,
    createFiatPayment,
    createCryptoPayment
  }
}
