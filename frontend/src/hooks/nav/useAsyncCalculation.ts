/**
 * Enhanced Async Calculation Hook for NAV
 * Handles both sync and async calculation flows with polling and cancellation
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { navService } from '@/services/nav'
import { CalculationResult, NavError } from '@/types/nav'
import { NavCalculationResult } from '@/services/nav/NavService'

export interface AsyncCalculationStatus {
  runId?: string
  status: 'idle' | 'pending' | 'polling' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  estimatedTimeRemaining?: number
  lastUpdated?: string
}

export interface UseAsyncCalculationResult {
  // State
  result: NavCalculationResult | null
  error: NavError | null
  status: AsyncCalculationStatus
  isLoading: boolean
  isPolling: boolean
  canCancel: boolean
  
  // Actions
  calculate: (input: any) => Promise<void>
  cancel: () => void
  reset: () => void
  saveAsValuation: (metadata?: Record<string, any>) => Promise<void>
  
  // Utils
  canCalculate: boolean
}

interface UseAsyncCalculationOptions {
  onSuccess?: (result: NavCalculationResult) => void
  onError?: (error: NavError) => void
  onProgress?: (status: AsyncCalculationStatus) => void
  onCancel?: () => void
  pollingInterval?: number // Default: 2000ms
  maxPollingTime?: number // Default: 5 minutes
  exponentialBackoff?: boolean // Default: true
}

export function useAsyncCalculation(options: UseAsyncCalculationOptions = {}): UseAsyncCalculationResult {
  const {
    onSuccess,
    onError,
    onProgress,
    onCancel,
    pollingInterval = 2000,
    maxPollingTime = 300000, // 5 minutes
    exponentialBackoff = true
  } = options

  const queryClient = useQueryClient()
  const [result, setResult] = useState<NavCalculationResult | null>(null)
  const [status, setStatus] = useState<AsyncCalculationStatus>({ status: 'idle' })
  const [error, setError] = useState<NavError | null>(null)
  
  // Refs for managing polling
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)
  const pollingAttemptsRef = useRef<number>(0)

  // Clear polling when component unmounts
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [])

  const clearPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    pollingStartTimeRef.current = null
    pollingAttemptsRef.current = 0
  }, [])

  // Calculate next polling interval with exponential backoff
  const getNextPollingInterval = useCallback(() => {
    if (!exponentialBackoff) return pollingInterval
    
    const attempt = pollingAttemptsRef.current
    const baseInterval = pollingInterval
    const maxInterval = 30000 // Max 30 seconds
    
    return Math.min(baseInterval * Math.pow(1.5, attempt), maxInterval)
  }, [pollingInterval, exponentialBackoff])

  // Poll for job status
  const pollJobStatus = useCallback(async (runId: string) => {
    if (!pollingStartTimeRef.current) {
      pollingStartTimeRef.current = Date.now()
    }

    // Check if we've exceeded max polling time
    const elapsed = Date.now() - pollingStartTimeRef.current
    if (elapsed > maxPollingTime) {
      setError({
        message: 'Calculation timeout exceeded',
        statusCode: 408,
        timestamp: new Date().toISOString()
      })
      setStatus(prev => ({ ...prev, status: 'failed' }))
      clearPolling()
      return
    }

    try {
      abortControllerRef.current = new AbortController()
      const jobResult = await navService.getCalculationById(runId)
      
      const newStatus: AsyncCalculationStatus = {
        runId,
        status: jobResult.status === 'completed' ? 'completed' : 
                jobResult.status === 'failed' ? 'failed' : 'polling',
        lastUpdated: new Date().toISOString(),
        // Estimate progress based on elapsed time (rough estimate)
        progress: jobResult.status === 'completed' ? 100 : 
                 jobResult.status === 'running' ? Math.min(50 + (elapsed / maxPollingTime) * 40, 90) :
                 jobResult.status === 'queued' ? 10 : 0
      }

      setStatus(newStatus)
      onProgress?.(newStatus)

      if (jobResult.status === 'completed') {
        setResult(jobResult)
        setError(null)
        onSuccess?.(jobResult)
        clearPolling()
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['nav', 'current'] })
        queryClient.invalidateQueries({ queryKey: ['nav', 'runs'] })
      } else if (jobResult.status === 'failed') {
        const error: NavError = {
          message: jobResult.errorMessage || 'Calculation failed',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
        setError(error)
        onError?.(error)
        clearPolling()
      } else {
        // Continue polling
        pollingAttemptsRef.current++
        const nextInterval = getNextPollingInterval()
        
        pollingTimeoutRef.current = setTimeout(() => {
          pollJobStatus(runId)
        }, nextInterval)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      
      const navError: NavError = {
        message: error instanceof Error ? error.message : 'Polling failed',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
      setError(navError)
      setStatus(prev => ({ ...prev, status: 'failed' }))
      onError?.(navError)
      clearPolling()
    }
  }, [maxPollingTime, onProgress, onSuccess, onError, queryClient, getNextPollingInterval])

  // Main calculation mutation
  const mutation = useMutation({
    mutationFn: async (input: any): Promise<NavCalculationResult> => {
      clearPolling()
      setError(null)
      setResult(null)
      setStatus({ status: 'pending' })
      
      try {
        const response = await navService.createCalculation(input)
        
        // Check if this is an async job (status is queued or running)
        if (response.status === 'queued' || response.status === 'running') {
          // Start polling for async job
          setStatus({
            runId: response.runId,
            status: 'polling',
            progress: response.status === 'queued' ? 5 : 20,
            lastUpdated: new Date().toISOString()
          })
          
          // Begin polling
          pollingAttemptsRef.current = 0
          await pollJobStatus(response.runId)
          
          // Return the initial response for now, actual result will come via polling
          return response
        } else {
          // Synchronous result
          setStatus({ 
            runId: response.runId,
            status: 'completed',
            progress: 100,
            lastUpdated: new Date().toISOString()
          })
          return response
        }
      } catch (error) {
        const navError: NavError = {
          message: error instanceof Error ? error.message : 'Calculation failed',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
        setError(navError)
        setStatus(prev => ({ ...prev, status: 'failed' }))
        throw navError
      }
    },
    onSuccess: (data) => {
      // Only call onSuccess for sync results, async results are handled in polling
      if (data.status === 'completed') {
        setResult(data)
        onSuccess?.(data)
      }
    },
    onError: (error: NavError) => {
      onError?.(error)
    }
  })

  // Calculate function
  const calculate = useCallback(async (input: any) => {
    await mutation.mutateAsync(input)
  }, [mutation])

  // Cancel function
  const cancel = useCallback(() => {
    clearPolling()
    setStatus(prev => ({ ...prev, status: 'cancelled' }))
    onCancel?.()
  }, [clearPolling, onCancel])

  // Reset function
  const reset = useCallback(() => {
    clearPolling()
    setResult(null)
    setError(null)
    setStatus({ status: 'idle' })
    mutation.reset()
  }, [clearPolling, mutation])

  // Save as valuation function
  const saveAsValuation = useCallback(async (metadata?: Record<string, any>) => {
    if (!result) {
      throw new Error('No calculation result to save')
    }

    try {
      const valuationPayload = {
        runId: result.runId,
        assetId: result.assetId,
        productType: result.productType,
        projectId: result.projectId,
        valuationDate: result.valuationDate,
        navValue: result.navValue,
        navPerShare: result.navPerShare,
        currency: result.currency,
        metadata: {
          ...result.metadata,
          ...metadata,
          savedAt: new Date().toISOString()
        }
      }

      await navService.createValuation(valuationPayload)
      
      // Invalidate valuations queries
      queryClient.invalidateQueries({ queryKey: ['nav', 'valuations'] })
      
    } catch (error) {
      throw new Error(`Failed to save valuation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [result, queryClient])

  return {
    // State
    result: result || mutation.data || null,
    error: error || mutation.error as NavError | null,
    status,
    isLoading: mutation.isPending || status.status === 'pending',
    isPolling: status.status === 'polling',
    canCancel: status.status === 'polling' || status.status === 'pending',
    
    // Actions
    calculate,
    cancel,
    reset,
    saveAsValuation,
    
    // Utils
    canCalculate: !mutation.isPending && status.status !== 'polling'
  }
}

export default useAsyncCalculation
