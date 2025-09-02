/**
 * Audit Context Provider
 * Provides audit functionality throughout the React application
 */

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { frontendAuditService, FrontendAuditEvent, AuditConfig } from '@/services/audit/FrontendAuditService'
import { useAuditPageView, useAuditSession } from '@/hooks/audit/useAudit'

interface AuditContextType {
  isEnabled: boolean
  logEvent: (event: Partial<FrontendAuditEvent>) => Promise<void>
  logUserAction: (action: string, metadata?: Record<string, any>) => Promise<void>
  logError: (error: Error, component?: string, metadata?: Record<string, any>) => Promise<void>
  startPerformanceMeasure: (name: string) => void
  endPerformanceMeasure: (name: string, metadata?: Record<string, any>) => void
}

const AuditContext = createContext<AuditContextType | undefined>(undefined)

export interface AuditProviderProps {
  children: ReactNode
  config?: Partial<AuditConfig>
  enableAutoTracking?: boolean
}

/**
 * Audit Provider Component
 * Wraps the entire application to provide comprehensive audit tracking
 */
export function AuditProvider({ 
  children, 
  config = {}, 
  enableAutoTracking = true 
}: AuditProviderProps) {
  const performanceMarks = useRef<Map<string, number>>(new Map())

  // Initialize global click tracking if enabled
  useEffect(() => {
    if (!enableAutoTracking) return

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target) return

      // Skip if element has audit exclusion
      if (target.closest('.audit-exclude, [data-audit-exclude]')) return

      // Log the click with context
      frontendAuditService.logInteraction('click', target, {
        global_click: true,
        button: event.button,
        keys: {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey
        }
      })
    }

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only log important key events
      const importantKeys = ['Enter', 'Escape', 'Tab', 'F1', 'F5']
      if (importantKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
        frontendAuditService.logEvent({
          action: `KEY_${event.key.toUpperCase()}`,
          category: 'user_action',
          page_url: window.location.href,
          metadata: {
            key: event.key,
            code: event.code,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey,
            target_tag: (event.target as HTMLElement)?.tagName
          }
        })
      }
    }

    const handleGlobalError = (event: ErrorEvent) => {
      frontendAuditService.logError(
        new Error(event.message),
        'global',
        {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack
        }
      )
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      frontendAuditService.logError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'promise',
        {
          reason: event.reason,
          promise: event.promise?.toString()
        }
      )
    }

    // Add global event listeners
    document.addEventListener('click', handleGlobalClick, true) // Capture phase
    document.addEventListener('keydown', handleGlobalKeyDown, true)
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      document.removeEventListener('click', handleGlobalClick, true)
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [enableAutoTracking])

  // Context value
  const contextValue: AuditContextType = {
    isEnabled: true,
    
    logEvent: async (event: Partial<FrontendAuditEvent>) => {
      const fullEvent: FrontendAuditEvent = {
        action: 'CUSTOM_EVENT',
        category: 'user_action',
        page_url: window.location.href,
        ...event
      }
      await frontendAuditService.logEvent(fullEvent)
    },

    logUserAction: async (action: string, metadata?: Record<string, any>) => {
      await frontendAuditService.logEvent({
        action,
        category: 'user_action',
        page_url: window.location.href,
        metadata
      })
    },

    logError: async (error: Error, component?: string, metadata?: Record<string, any>) => {
      await frontendAuditService.logError(error, component, metadata)
    },

    startPerformanceMeasure: (name: string) => {
      performanceMarks.current.set(name, performance.now())
    },

    endPerformanceMeasure: (name: string, metadata?: Record<string, any>) => {
      const startTime = performanceMarks.current.get(name)
      if (startTime) {
        const duration = performance.now() - startTime
        performanceMarks.current.delete(name)
        frontendAuditService.logPerformance(name, duration, metadata)
      }
    }
  }

  return (
    <AuditContext.Provider value={contextValue}>
      <AuditSessionTracker />
      <AuditPageTracker />
      {children}
    </AuditContext.Provider>
  )
}

/**
 * Component to handle session tracking
 */
function AuditSessionTracker() {
  useAuditSession()
  return null
}

/**
 * Component to handle page tracking
 */
function AuditPageTracker() {
  useAuditPageView()
  return null
}

/**
 * Hook to use audit context
 */
export function useAudit(): AuditContextType {
  const context = useContext(AuditContext)
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider')
  }
  return context
}

/**
 * HOC to wrap components with error boundary audit tracking
 */
interface AuditErrorBoundaryState {
  hasError: boolean
}

class AuditErrorBoundary extends React.Component<
  { children: ReactNode; componentName?: string },
  AuditErrorBoundaryState
> {
  constructor(props: { children: ReactNode; componentName?: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): AuditErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to audit system
    frontendAuditService.logError(error, this.props.componentName || 'ErrorBoundary', {
      error_info: errorInfo,
      component_stack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" data-audit-exclude>
          <h3>Something went wrong</h3>
          <p>This error has been logged for investigation.</p>
        </div>
      )
    }

    return this.props.children
  }
}

export { AuditErrorBoundary }

/**
 * HOC to wrap components with audit error boundary
 */
export function withAuditErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <AuditErrorBoundary componentName={componentName || Component.displayName || Component.name}>
      <Component {...props as P} ref={ref} />
    </AuditErrorBoundary>
  ))

  WrappedComponent.displayName = `withAuditErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Audit decorator for tracking component renders
 */
export function auditRender(componentName: string) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    const AuditedComponent = React.forwardRef<any, P>((props, ref) => {
      const renderStart = useRef<number>(0)

      useEffect(() => {
        renderStart.current = performance.now()
      })

      useEffect(() => {
        const renderDuration = performance.now() - renderStart.current
        frontendAuditService.logPerformance(`render_${componentName}`, renderDuration, {
          component_name: componentName,
          props_count: Object.keys(props || {}).length
        })
      })

      return <Component {...props as P} ref={ref} />
    })

    AuditedComponent.displayName = `auditRender(${componentName})`
    return AuditedComponent
  }
}

export default AuditProvider
