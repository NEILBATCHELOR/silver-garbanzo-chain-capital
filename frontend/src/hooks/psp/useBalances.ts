/**
 * Use PSP Balances Hook
 * React hook for managing PSP balances
 */

import { useState, useEffect, useCallback } from 'react'
import { pspBalancesService } from '@/services/psp'
import {
  PspBalance,
  BalancesSummary,
  BalanceListFilters,
  SyncBalancesRequest
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function useBalances(projectId?: string, filters?: BalanceListFilters) {
  const [balances, setBalances] = useState<PspBalance[]>([])
  const [summary, setSummary] = useState<BalancesSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspBalancesService.listBalances({
        project_id: projectId,
        ...filters
      })

      if (response.success && response.data) {
        setBalances(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch balances')
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

  // Fetch balances summary
  const fetchSummary = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspBalancesService.getBalancesSummary(projectId)

      if (response.success && response.data) {
        setSummary(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch balances summary')
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

  // Sync balances with Warp
  const syncBalances = useCallback(async (data: SyncBalancesRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspBalancesService.syncBalances(data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Balances synced successfully'
        })
        
        // Refresh the list
        await fetchBalances()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to sync balances')
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
  }, [fetchBalances, toast])

  // Auto-fetch on mount and when projectId changes (NOT when functions change!)
  useEffect(() => {
    if (projectId) {
      fetchBalances()
      fetchSummary()
    }
  }, [projectId]) // Only depend on projectId, not the functions themselves

  return {
    balances,
    summary,
    loading,
    error,
    fetchBalances,
    fetchSummary,
    syncBalances
  }
}
