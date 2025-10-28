/**
 * Use PSP Trades Hook
 * React hook for managing PSP trades
 */

import { useState, useEffect, useCallback } from 'react'
import { pspTradesService } from '@/services/psp'
import {
  PspTrade,
  TradesSummary,
  TradeListFilters,
  CreateTradeRequest,
  MarketRate
} from '@/types/psp'
import { useToast } from '@/components/ui/use-toast'

export function useTrades(projectId?: string, filters?: TradeListFilters) {
  const [trades, setTrades] = useState<PspTrade[]>([])
  const [summary, setSummary] = useState<TradesSummary | null>(null)
  const [marketRates, setMarketRates] = useState<MarketRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch trades
  const fetchTrades = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspTradesService.listTrades({
        project_id: projectId,
        ...filters
      })

      if (response.success && response.data) {
        setTrades(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch trades')
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

  // Fetch trades summary
  const fetchSummary = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await pspTradesService.getTradesSummary(projectId)

      if (response.success && response.data) {
        setSummary(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch trades summary')
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

  // Fetch market rates
  const fetchMarketRates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await pspTradesService.getMarketRates()

      if (response.success && response.data) {
        setMarketRates(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch market rates')
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
  }, [toast])

  // Create trade
  const createTrade = useCallback(async (data: CreateTradeRequest) => {
    try {
      setLoading(true)
      setError(null)

      const response = await pspTradesService.createTrade(data)

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Trade created successfully'
        })
        
        // Refresh the list
        await fetchTrades()
        
        return response.data
      } else {
        throw new Error(response.error || 'Failed to create trade')
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
  }, [fetchTrades, toast])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchTrades()
    fetchSummary()
    fetchMarketRates()
  }, [fetchTrades, fetchSummary, fetchMarketRates])

  return {
    trades,
    summary,
    marketRates,
    loading,
    error,
    fetchTrades,
    fetchSummary,
    fetchMarketRates,
    createTrade
  }
}
