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
        // TODO: Replace with actual backend endpoint when available
        // const result = await navService.getAuditEvents({
        //   page, limit, userId, action, entityType, entityId, dateFrom, dateTo, sortBy, sortOrder
        // })
        
        // Mock implementation for now
        const mockEvents = generateMockAuditEvents(page, limit, {
          userId, action, entityType, entityId, dateFrom, dateTo
        })
        return mockEvents
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

/**
 * Generate mock audit events for testing
 */
function generateMockAuditEvents(
  page: number = 1, 
  limit: number = 50, 
  filters: {
    userId?: string
    action?: string
    entityType?: string
    entityId?: string
    dateFrom?: string
    dateTo?: string
  } = {}
): PaginatedResponse<NavAuditEvent> {
  const total = 234 // Mock total count
  const startIndex = (page - 1) * limit
  
  const actions = [
    'calculation_created',
    'calculation_started',
    'calculation_completed',
    'calculation_failed',
    'valuation_saved',
    'valuation_updated',
    'valuation_deleted',
    'valuation_shared',
    'approval_requested',
    'approval_granted',
    'approval_rejected',
    'schema_accessed',
    'calculator_launched',
    'export_generated'
  ]

  const entityTypes = ['calculation', 'valuation', 'approval'] as const
  const usernames = ['john.doe', 'jane.smith', 'alex.wilson', 'maria.garcia', 'david.chen']

  const mockEvents: NavAuditEvent[] = Array.from({ length: Math.min(limit, total - startIndex) }, (_, i) => {
    const index = startIndex + i
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
    const action = actions[Math.floor(Math.random() * actions.length)]
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)]
    const userId = `user_${Math.floor(Math.random() * 5) + 1}`
    const username = usernames[Math.floor(Math.random() * usernames.length)]

    // Apply filters
    if (filters.userId && userId !== filters.userId) return null
    if (filters.action && action !== filters.action) return null
    if (filters.entityType && entityType !== filters.entityType) return null
    
    return {
      id: `audit_${index + 1}`,
      timestamp: timestamp.toISOString(),
      userId,
      username,
      action,
      entityType,
      entityId: `${entityType}_${Math.floor(Math.random() * 100) + 1}`,
      details: generateEventDetails(action, entityType),
      ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  }).filter(Boolean) as NavAuditEvent[]

  return {
    success: true,
    data: mockEvents,
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

/**
 * Generate event-specific details
 */
function generateEventDetails(action: string, entityType: string): Record<string, any> {
  const baseDetails = {
    timestamp: new Date().toISOString(),
    source: 'nav_dashboard'
  }

  switch (action) {
    case 'calculation_created':
      return {
        ...baseDetails,
        calculatorType: ['equity', 'bonds', 'mmf', 'real-estate'][Math.floor(Math.random() * 4)],
        valuationDate: new Date().toISOString().split('T')[0],
        currency: 'USD'
      }
    
    case 'calculation_completed':
      return {
        ...baseDetails,
        navValue: Math.random() * 10000000 + 1000000,
        duration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
        status: 'completed'
      }
    
    case 'valuation_saved':
      return {
        ...baseDetails,
        name: `NAV Calculation ${Math.floor(Math.random() * 100)}`,
        isPublic: Math.random() > 0.5,
        tags: ['portfolio', 'q4-2024']
      }
    
    case 'approval_requested':
      return {
        ...baseDetails,
        requestedBy: 'portfolio_manager',
        approvalType: 'nav_calculation',
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      }
    
    default:
      return baseDetails
  }
}

export default useNavAudit
