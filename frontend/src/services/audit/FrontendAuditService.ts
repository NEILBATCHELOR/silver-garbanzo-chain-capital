/**
 * Frontend Audit Service
 * Handles communication with backend audit API for comprehensive user action tracking
 * 
 * Features:
 * - User action logging (clicks, navigation, forms)
 * - Performance tracking
 * - Error boundary integration
 * - Real-time event streaming
 * - Correlation ID management
 */

// Simple HTTP client for backend audit API
const API_BASE_URL = '/api/v1'

const httpClient = {
  post: async (url: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if available
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export interface FrontendAuditEvent {
  action: string
  category: 'user_action' | 'navigation' | 'form_interaction' | 'file_operation' | 'error'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  page_url: string
  component_name?: string
  element_id?: string
  element_type?: string
  user_data?: Record<string, any>
  form_data?: Record<string, any>
  file_info?: {
    name: string
    size: number
    type: string
  }
  error_info?: {
    message: string
    stack?: string
    component: string
  }
  performance?: {
    duration_ms: number
    memory_used?: number
  }
  metadata?: Record<string, any>
}

export interface AuditConfig {
  enabled: boolean
  captureClicks: boolean
  captureNavigation: boolean
  captureForms: boolean
  captureErrors: boolean
  capturePerformance: boolean
  batchSize: number
  flushIntervalMs: number
  excludeElements: string[]
  sensitiveFields: string[]
}

const defaultConfig: AuditConfig = {
  enabled: false,  // TEMPORARILY DISABLED while fixing backend audit service
  captureClicks: true,
  captureNavigation: true,
  captureForms: true,
  captureErrors: true,
  capturePerformance: true,
  batchSize: 10,
  flushIntervalMs: 5000,
  excludeElements: ['.audit-exclude', '[data-audit-exclude]'],
  sensitiveFields: ['password', 'ssn', 'credit_card', 'token', 'secret']
}

class FrontendAuditService {
  private config: AuditConfig
  private eventQueue: FrontendAuditEvent[] = []
  private correlationId: string
  private sessionId: string
  private isFlushingQueue = false
  private flushTimer?: NodeJS.Timeout

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.correlationId = this.generateId()
    this.sessionId = this.getOrCreateSessionId()
    
    if (this.config.enabled) {
      this.initializeTracking()
    }
  }

  /**
   * Initialize comprehensive user action tracking
   */
  private initializeTracking(): void {
    // Start batch processing
    this.startBatchProcessor()

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.logEvent({
        action: document.hidden ? 'PAGE_HIDDEN' : 'PAGE_VISIBLE',
        category: 'navigation',
        page_url: window.location.href,
        metadata: {
          timestamp: new Date().toISOString(),
          visibility_state: document.visibilityState
        }
      })
    })

    // Track page unload
    window.addEventListener('beforeunload', () => {
      // Force flush queue before page unload
      this.flushQueueSync()
    })

    // Track navigation (for SPA routing)
    this.trackNavigationChanges()
  }

  /**
   * Log user action event
   */
  async logEvent(event: FrontendAuditEvent): Promise<void> {
    if (!this.config.enabled) return

    // Sanitize sensitive data
    const sanitizedEvent = this.sanitizeEvent(event)

    // Add standard metadata
    const enrichedEvent: FrontendAuditEvent = {
      ...sanitizedEvent,
      metadata: {
        ...sanitizedEvent.metadata,
        correlation_id: this.correlationId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer,
        is_mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
      }
    }

    // Add to queue
    this.eventQueue.push(enrichedEvent)

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushQueue()
    }
  }

  /**
   * Log page view
   */
  async logPageView(path: string, title?: string, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: 'PAGE_VIEW',
      category: 'navigation',
      page_url: path,
      metadata: {
        page_title: title || document.title,
        ...metadata
      }
    })
  }

  /**
   * Log user interaction (click, focus, etc.)
   */
  async logInteraction(
    action: string, 
    element: HTMLElement, 
    metadata?: Record<string, any>
  ): Promise<void> {
    // Skip if element should be excluded
    if (this.shouldExcludeElement(element)) return

    await this.logEvent({
      action: `USER_${action.toUpperCase()}`,
      category: 'user_action',
      page_url: window.location.href,
      component_name: this.getComponentName(element),
      element_id: element.id || undefined,
      element_type: element.tagName.toLowerCase(),
      metadata: {
        element_text: element.textContent?.slice(0, 100),
        element_classes: element.className,
        element_attributes: this.getRelevantAttributes(element),
        ...metadata
      }
    })
  }

  /**
   * Log form interaction
   */
  async logFormEvent(
    action: string,
    form: HTMLFormElement,
    formData?: FormData,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.captureForms) return

    const sanitizedFormData = formData ? this.sanitizeFormData(formData) : undefined

    await this.logEvent({
      action: `FORM_${action.toUpperCase()}`,
      category: 'form_interaction',
      page_url: window.location.href,
      component_name: this.getComponentName(form),
      element_id: form.id || undefined,
      form_data: sanitizedFormData,
      metadata: {
        form_name: form.name,
        form_method: form.method,
        form_action: form.action,
        field_count: form.elements.length,
        ...metadata
      }
    })
  }

  /**
   * Log file operation
   */
  async logFileOperation(
    action: string,
    file: File,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: `FILE_${action.toUpperCase()}`,
      category: 'file_operation',
      page_url: window.location.href,
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      metadata: {
        ...metadata
      }
    })
  }

  /**
   * Log error event
   */
  async logError(
    error: Error,
    component?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.captureErrors) return

    await this.logEvent({
      action: 'FRONTEND_ERROR',
      category: 'error',
      severity: 'high',
      page_url: window.location.href,
      component_name: component,
      error_info: {
        message: error.message,
        stack: error.stack,
        component: component || 'unknown'
      },
      metadata: {
        error_name: error.name,
        ...metadata
      }
    })
  }

  /**
   * Log performance event
   */
  async logPerformance(
    action: string,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.capturePerformance) return

    await this.logEvent({
      action: `PERFORMANCE_${action.toUpperCase()}`,
      category: 'user_action',
      severity: duration > 1000 ? 'medium' : 'low',
      page_url: window.location.href,
      performance: {
        duration_ms: duration,
        memory_used: (performance as any).memory?.usedJSHeapSize
      },
      metadata: {
        ...metadata
      }
    })
  }

  /**
   * Flush event queue to backend
   */
  private async flushQueue(): Promise<void> {
    if (this.isFlushingQueue || this.eventQueue.length === 0) return

    this.isFlushingQueue = true
    const eventsToFlush = this.eventQueue.splice(0, this.config.batchSize)

    try {
      // Convert to backend format
      const auditEvents = eventsToFlush.map(event => ({
        action: event.action,
        category: 'user_action', // Map to backend category
        severity: event.severity || 'low',
        entity_type: 'frontend_action',
        entity_id: this.correlationId,
        details: this.createEventDescription(event),
        metadata: {
          ...event.metadata,
          frontend_event: true,
          page_url: event.page_url,
          component_name: event.component_name,
          element_type: event.element_type,
          form_data: event.form_data,
          file_info: event.file_info,
          error_info: event.error_info,
          performance: event.performance
        },
        correlation_id: this.correlationId,
        session_id: this.sessionId,
        source: 'frontend'
      }))

      // Send to backend audit API
      await httpClient.post('/audit/events/bulk', {
        events: auditEvents,
        batch_id: `frontend_batch_${Date.now()}`
      })

      console.debug(`📊 Flushed ${eventsToFlush.length} audit events to backend`)

    } catch (error) {
      console.warn('Failed to flush audit events:', error)
      // Re-add events back to queue for retry (at the beginning)
      this.eventQueue.unshift(...eventsToFlush)
    } finally {
      this.isFlushingQueue = false
    }
  }

  /**
   * Synchronous queue flush for page unload
   */
  private flushQueueSync(): void {
    if (this.eventQueue.length === 0) return

    const auditEvents = this.eventQueue.map(event => ({
      action: event.action,
      category: 'user_action',
      entity_type: 'frontend_action',
      details: this.createEventDescription(event),
      metadata: { ...event.metadata, frontend_event: true },
      source: 'frontend'
    }))

    // Use sendBeacon for reliable delivery on page unload
    const data = JSON.stringify({
      events: auditEvents,
      batch_id: `frontend_unload_${Date.now()}`
    })

    navigator.sendBeacon('/api/v1/audit/events/bulk', data)
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushQueue()
      }
    }, this.config.flushIntervalMs)
  }

  /**
   * Track navigation changes (for SPA routing)
   */
  private trackNavigationChanges(): void {
    let currentPath = window.location.pathname

    // Override pushState and replaceState to track SPA navigation
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(state, title, url) {
      originalPushState.apply(history, [state, title, url])
      if (url && url !== currentPath) {
        currentPath = window.location.pathname
        // Use setTimeout to ensure the page has updated
        setTimeout(() => {
          window.frontendAuditService?.logPageView(currentPath)
        }, 0)
      }
    }

    history.replaceState = function(state, title, url) {
      originalReplaceState.apply(history, [state, title, url])
      if (url && url !== currentPath) {
        currentPath = window.location.pathname
        setTimeout(() => {
          window.frontendAuditService?.logPageView(currentPath)
        }, 0)
      }
    }

    // Track back/forward navigation
    window.addEventListener('popstate', () => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname
        this.logPageView(currentPath)
      }
    })
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return `fe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('audit_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      sessionStorage.setItem('audit_session_id', sessionId)
    }
    return sessionId
  }

  private shouldExcludeElement(element: HTMLElement): boolean {
    return this.config.excludeElements.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector)
      } catch {
        return false
      }
    })
  }

  private getComponentName(element: HTMLElement): string {
    // Try to find React component name (works in development)
    const reactKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance'))
    if (reactKey) {
      const instance = (element as any)[reactKey]
      return instance?.type?.displayName || instance?.type?.name || 'Unknown'
    }

    // Fallback to data attributes or class names (with null safety)
    return element.dataset.component || 
           (element.className && typeof element.className === 'string' ? element.className.split(' ')[0] : '') || 
           element.tagName.toLowerCase()
  }

  private getRelevantAttributes(element: HTMLElement): Record<string, string> {
    const relevantAttrs = ['id', 'class', 'type', 'name', 'role', 'data-testid']
    const attrs: Record<string, string> = {}

    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr)
      if (value) attrs[attr] = value
    })

    return attrs
  }

  private sanitizeEvent(event: FrontendAuditEvent): FrontendAuditEvent {
    const sanitized = { ...event }

    // Remove sensitive data from user_data
    if (sanitized.user_data) {
      sanitized.user_data = this.sanitizeObject(sanitized.user_data)
    }

    return sanitized
  }

  private sanitizeFormData(formData: FormData): Record<string, string> {
    const sanitized: Record<string, string> = {}

    for (const [key, value] of formData.entries()) {
      if (this.config.sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value.toString().slice(0, 200) // Limit length
      }
    }

    return sanitized
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private createEventDescription(event: FrontendAuditEvent): string {
    switch (event.category) {
      case 'navigation':
        return `User navigated to ${event.page_url}`
      case 'user_action':
        return `User performed ${event.action} on ${event.element_type || 'element'}${event.component_name ? ` in ${event.component_name}` : ''}`
      case 'form_interaction':
        return `User ${event.action.toLowerCase()} form${event.form_data ? ` with ${Object.keys(event.form_data).length} fields` : ''}`
      case 'file_operation':
        return `User ${event.action.toLowerCase()} file: ${event.file_info?.name}`
      case 'error':
        return `Frontend error in ${event.component_name || 'unknown component'}: ${event.error_info?.message}`
      default:
        return event.action
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    // Final flush
    this.flushQueueSync()
  }
}

// Global instance for easy access
declare global {
  interface Window {
    frontendAuditService?: FrontendAuditService
  }
}

// Default export for use as singleton
export const frontendAuditService = new FrontendAuditService()

// Add to window for global access and debugging
window.frontendAuditService = frontendAuditService

export default frontendAuditService
