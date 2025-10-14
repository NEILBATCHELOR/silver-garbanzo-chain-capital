/**
 * useNavAudit Hook
 * React hook for fetching NAV audit trail and logging events
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { navService } from '@/services/nav'
import { NavAuditEvent, NavError, PaginatedResponse, convertToNavError } from '@/types/nav'

export interface UseNavAuditResult {
  // Data
  events: NavAuditEvent[]
  pagination: PaginatedResponse<NavAuditEvent>['pagination'] | null
  
  // State
  isLoading: boolean
  isError: boolean
  error: NavError | null
  isFetching: boolean
  
  // Actions
  refetch: () => void
  
  // Computed stats
  stats: {
    totalEvents: number
    eventsToday: number
    uniqueUsers: number
    eventsByAction: Record<string, number>
    recentActivity: NavAuditEvent[]
  }
}

interface UseNavAuditOptions {
  page?: number
  limit?: number
  userId?: string
  action?: string
  entityType?: 'calculation' | 'valuation' | 'approval'
  entityId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'timestamp' | 'action' | 'userId'
  sortOrder?: 'asc' | 'desc'
  enabled?: boolean
  staleTime?: number
  gcTime?: number
  onError?: (error: NavError) => void
  onSuccess?: (data: PaginatedResponse<NavAuditEvent>) => void
}

export function useNavAudit(options: UseNavAuditOptions = {}): UseNavAuditResult {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    entityType,
    entityId,
    dateFrom,
    dateTo,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    enabled = true,
    staleTime = 30000, // 30 seconds for audit data
    gcTime = 300000, // 5 minutes
    onError,
    onSuccess
  } = options

  const queryKey = [
    'nav', 
    'audit', 
    { page, limit, userId, action, entityType, entityId, dateFrom, dateTo, sortBy, sortOrder }
  ]

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedResponse<NavAuditEvent>> => {
      try {
        const result = await navService.getAuditEvents({
          page, limit, userId, action, entityType, entityId, dateFrom, dateTo, sortBy, sortOrder
        })
        return result
      } catch (error) {
        throw convertToNavError(error)
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

  // Compute stats from the data
  const stats = React.useMemo(() => {
    const events = query.data?.data || []
    const today = new Date().toDateString()
    
    const eventsToday = events.filter(event => 
      new Date(event.timestamp).toDateString() === today
    ).length

    const uniqueUsers = new Set(events.map(event => event.userId)).size

    const eventsByAction = events.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentActivity = events.slice(0, 5)

    return {
      totalEvents: query.data?.pagination.total || 0,
      eventsToday,
      uniqueUsers,
      eventsByAction,
      recentActivity
    }
  }, [query.data])

  return {
    // Data
    events: query.data?.data || [],
    pagination: query.data?.pagination || null,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? convertToNavError(query.error) : null,
    isFetching: query.isFetching,
    
    // Actions
    refetch: query.refetch,
    
    // Computed stats
    stats
  }
}

/**
 * Hook for real-time audit monitoring with frequent updates
 */
export function useNavAuditRealtime(options: UseNavAuditOptions = {}) {
  return useNavAudit({
    ...options,
    staleTime: 10000, // 10 seconds
    limit: options.limit || 20 // Smaller limit for real-time
  })
}

/**
 * Hook for audit events related to a specific entity
 */
export function useNavEntityAudit(
  entityType: 'calculation' | 'valuation' | 'approval',
  entityId: string,
  options: Omit<UseNavAuditOptions, 'entityType' | 'entityId'> = {}
) {
  return useNavAudit({
    ...options,
    entityType,
    entityId,
    enabled: options.enabled !== false && !!entityId
  })
}

/**
 * Hook for user-specific audit events
 */
export function useNavUserAudit(
  userId: string,
  options: Omit<UseNavAuditOptions, 'userId'> = {}
) {
  return useNavAudit({
    ...options,
    userId,
    enabled: options.enabled !== false && !!userId
  })
}

export default useNavAudit
