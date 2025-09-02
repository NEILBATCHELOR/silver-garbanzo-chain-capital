/**
 * React Audit Hooks
 * Provides easy-to-use React hooks for comprehensive user action tracking
 */

import * as React from 'react'
import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { frontendAuditService, FrontendAuditEvent } from '../../services/audit/FrontendAuditService'

/**
 * Hook to track page views automatically
 */
export function useAuditPageView(metadata?: Record<string, any>) {
  const location = useLocation()
  const previousPath = useRef<string>('')

  useEffect(() => {
    const currentPath = location.pathname + location.search
    
    // Only log if path actually changed
    if (currentPath !== previousPath.current) {
      frontendAuditService.logPageView(currentPath, document.title, {
        search: location.search,
        hash: location.hash,
        state: location.state,
        ...metadata
      })
      previousPath.current = currentPath
    }
  }, [location, metadata])
}

/**
 * Hook to track user interactions (clicks, focus, etc.)
 */
export function useAuditInteraction() {
  const logInteraction = useCallback(
    (action: string, element?: HTMLElement, metadata?: Record<string, any>) => {
      if (element) {
        frontendAuditService.logInteraction(action, element, metadata)
      } else {
        // Log without element reference
        frontendAuditService.logEvent({
          action: `USER_${action.toUpperCase()}`,
          category: 'user_action',
          page_url: window.location.href,
          metadata
        })
      }
    },
    []
  )

  const logClick = useCallback(
    (element: HTMLElement, metadata?: Record<string, any>) => {
      logInteraction('click', element, metadata)
    },
    [logInteraction]
  )

  const logFocus = useCallback(
    (element: HTMLElement, metadata?: Record<string, any>) => {
      logInteraction('focus', element, metadata)
    },
    [logInteraction]
  )

  return {
    logInteraction,
    logClick,
    logFocus
  }
}

/**
 * Hook to track form interactions
 */
export function useAuditForm() {
  const logFormEvent = useCallback(
    (action: string, form: HTMLFormElement, formData?: FormData, metadata?: Record<string, any>) => {
      frontendAuditService.logFormEvent(action, form, formData, metadata)
    },
    []
  )

  const logFormSubmit = useCallback(
    (form: HTMLFormElement, formData?: FormData, metadata?: Record<string, any>) => {
      logFormEvent('submit', form, formData, metadata)
    },
    [logFormEvent]
  )

  const logFormChange = useCallback(
    (form: HTMLFormElement, fieldName?: string, metadata?: Record<string, any>) => {
      logFormEvent('change', form, undefined, { field_name: fieldName, ...metadata })
    },
    [logFormEvent]
  )

  return {
    logFormEvent,
    logFormSubmit,
    logFormChange
  }
}

/**
 * Hook to track file operations
 */
export function useAuditFile() {
  const logFileEvent = useCallback(
    (action: string, file: File, metadata?: Record<string, any>) => {
      frontendAuditService.logFileOperation(action, file, metadata)
    },
    []
  )

  const logFileUpload = useCallback(
    (file: File, metadata?: Record<string, any>) => {
      logFileEvent('upload', file, metadata)
    },
    [logFileEvent]
  )

  const logFileDownload = useCallback(
    (file: File, metadata?: Record<string, any>) => {
      logFileEvent('download', file, metadata)
    },
    [logFileEvent]
  )

  return {
    logFileEvent,
    logFileUpload,
    logFileDownload
  }
}

/**
 * Hook to track errors in components
 */
export function useAuditError() {
  const logError = useCallback(
    (error: Error, component?: string, metadata?: Record<string, any>) => {
      frontendAuditService.logError(error, component, metadata)
    },
    []
  )

  return { logError }
}

/**
 * Hook to track performance metrics
 */
export function useAuditPerformance() {
  const logPerformance = useCallback(
    (action: string, duration: number, metadata?: Record<string, any>) => {
      frontendAuditService.logPerformance(action, duration, metadata)
    },
    []
  )

  const measureOperation = useCallback(
    <T>(action: string, operation: () => T | Promise<T>, metadata?: Record<string, any>): Promise<T> => {
      const startTime = performance.now()
      
      const finish = (result: T) => {
        const duration = performance.now() - startTime
        logPerformance(action, duration, metadata)
        return result
      }

      try {
        const result = operation()
        if (result instanceof Promise) {
          return result.then(finish)
        }
        return Promise.resolve(finish(result))
      } catch (error) {
        const duration = performance.now() - startTime
        logPerformance(`${action}_error`, duration, { ...metadata, error: error.message })
        throw error
      }
    },
    [logPerformance]
  )

  return {
    logPerformance,
    measureOperation
  }
}

/**
 * Hook to track component lifecycle
 */
export function useAuditComponent(componentName: string, metadata?: Record<string, any>) {
  const mountTime = useRef<number>(0)

  useEffect(() => {
    mountTime.current = performance.now()
    
    // Log component mount
    frontendAuditService.logEvent({
      action: 'COMPONENT_MOUNT',
      category: 'user_action',
      page_url: window.location.href,
      component_name: componentName,
      metadata: {
        mount_timestamp: new Date().toISOString(),
        ...metadata
      }
    })

    return () => {
      // Log component unmount with duration
      const duration = performance.now() - mountTime.current
      frontendAuditService.logEvent({
        action: 'COMPONENT_UNMOUNT',
        category: 'user_action',
        page_url: window.location.href,
        component_name: componentName,
        performance: {
          duration_ms: duration
        },
        metadata: {
          unmount_timestamp: new Date().toISOString(),
          ...metadata
        }
      })
    }
  }, [componentName, metadata])
}

/**
 * Hook to automatically track element interactions
 */
export function useAuditElement<T extends HTMLElement>(
  elementRef: React.RefObject<T>,
  options: {
    trackClicks?: boolean
    trackFocus?: boolean
    trackHover?: boolean
    metadata?: Record<string, any>
  } = {}
) {
  const { trackClicks = true, trackFocus = false, trackHover = false, metadata } = options
  const { logInteraction } = useAuditInteraction()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handlers: { event: string; handler: (e: Event) => void }[] = []

    if (trackClicks) {
      const clickHandler = (e: Event) => {
        logInteraction('click', element, {
          ...metadata,
          click_coordinates: `${(e as MouseEvent).clientX},${(e as MouseEvent).clientY}`
        })
      }
      element.addEventListener('click', clickHandler)
      handlers.push({ event: 'click', handler: clickHandler })
    }

    if (trackFocus) {
      const focusHandler = () => {
        logInteraction('focus', element, metadata)
      }
      element.addEventListener('focus', focusHandler)
      handlers.push({ event: 'focus', handler: focusHandler })
    }

    if (trackHover) {
      const hoverHandler = () => {
        logInteraction('hover', element, metadata)
      }
      element.addEventListener('mouseenter', hoverHandler)
      handlers.push({ event: 'mouseenter', handler: hoverHandler })
    }

    return () => {
      handlers.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler)
      })
    }
  }, [elementRef, trackClicks, trackFocus, trackHover, metadata, logInteraction])
}

/**
 * Hook to create audit event manually
 */
export function useAuditEvent() {
  const logEvent = useCallback(
    (event: Partial<FrontendAuditEvent>) => {
      const fullEvent: FrontendAuditEvent = {
        action: event.action || 'CUSTOM_EVENT',
        category: event.category || 'user_action',
        page_url: event.page_url || window.location.href,
        ...event
      }
      
      frontendAuditService.logEvent(fullEvent)
    },
    []
  )

  return { logEvent }
}

/**
 * Higher-order component to wrap components with audit tracking
 */
export function withAuditTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown'
    
    useAuditComponent(name, {
      props: Object.keys(props || {}).length
    })

    // Fix TypeScript forwardRef generic constraint issue by type assertion
    const componentProps = { ...props, ref } as any
    return React.createElement(Component as any, componentProps)
  })

  const displayName = Component.displayName || Component.name || 'Unknown'
  WrappedComponent.displayName = `withAuditTracking(${displayName})`
  
  return WrappedComponent
}

/**
 * Custom hook for tracking user sessions
 */
export function useAuditSession() {
  const sessionStart = useRef<number>(Date.now())

  useEffect(() => {
    // Log session start
    frontendAuditService.logEvent({
      action: 'SESSION_START',
      category: 'navigation',
      page_url: window.location.href,
      metadata: {
        session_start: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })

    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStart.current
      frontendAuditService.logEvent({
        action: 'SESSION_END',
        category: 'navigation', 
        page_url: window.location.href,
        performance: {
          duration_ms: sessionDuration
        },
        metadata: {
          session_end: new Date().toISOString(),
          session_duration_minutes: Math.round(sessionDuration / 60000)
        }
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}

/**
 * Hook for tracking search and filter operations
 */
export function useAuditSearch() {
  const logSearch = useCallback(
    (query: string, filters?: Record<string, any>, results?: number, metadata?: Record<string, any>) => {
      frontendAuditService.logEvent({
        action: 'USER_SEARCH',
        category: 'user_action',
        page_url: window.location.href,
        metadata: {
          search_query: query,
          filters,
          result_count: results,
          ...metadata
        }
      })
    },
    []
  )

  const logFilter = useCallback(
    (filterName: string, filterValue: any, metadata?: Record<string, any>) => {
      frontendAuditService.logEvent({
        action: 'USER_FILTER',
        category: 'user_action',
        page_url: window.location.href,
        metadata: {
          filter_name: filterName,
          filter_value: filterValue,
          ...metadata
        }
      })
    },
    []
  )

  return {
    logSearch,
    logFilter
  }
}
