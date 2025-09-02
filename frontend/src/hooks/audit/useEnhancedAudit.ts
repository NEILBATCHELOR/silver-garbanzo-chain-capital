/**
 * Enhanced Audit Hook - Fixed Version with Better Error Handling
 * Comprehensive audit integration with graceful error handling for backend issues
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { frontendAuditService, backendAuditService } from '@/services/audit';
import { useAudit } from '@/providers/audit/AuditProvider';
import type {
  AuditEvent,
  AuditQueryOptions,
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection,
  FrontendAuditEvent,
  PaginatedResponse,
} from '@/services/audit';

export interface EnhancedAuditOptions {
  projectId?: string;
  dateRange?: DateRange;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
  gracefulDegradation?: boolean; // New option for graceful error handling
}

export interface EnhancedAuditData {
  // Statistics
  statistics: AuditStatistics | null;
  analytics: AuditAnalytics | null;
  
  // Events
  events: AuditEvent[];
  eventsTotal: number;
  eventsLoading: boolean;
  
  // Health & Status
  systemHealth: any | null;
  
  // Compliance
  complianceReports: Record<string, ComplianceReport | null>;
  
  // Security
  securityAnalytics: any | null;
  anomalies: AnomalyDetection | null;
  
  // User Analytics
  userAnalytics: any | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Error handling
  backendAvailable: boolean;
  degradedMode: boolean;
}

export interface EnhancedAuditActions {
  // Data loading
  refreshAll: () => Promise<void>;
  loadEvents: (options?: AuditQueryOptions) => Promise<void>;
  
  // Frontend logging (enhanced)
  logUserAction: (action: string, metadata?: Record<string, any>) => Promise<void>;
  logPageView: (path: string, title?: string, metadata?: Record<string, any>) => Promise<void>;
  logError: (error: Error, component?: string, metadata?: Record<string, any>) => Promise<void>;
  logPerformance: (action: string, duration: number, metadata?: Record<string, any>) => Promise<void>;
  
  // Backend operations (with fallbacks)
  createAuditEvent: (event: Partial<AuditEvent>) => Promise<void>;
  searchEvents: (query: string, filters?: Record<string, any>) => Promise<void>;
  exportData: (format: 'csv' | 'excel' | 'pdf', filters?: Record<string, any>) => Promise<void>;
  
  // Compliance
  loadComplianceReport: (standard: 'SOX' | 'GDPR' | 'PCI_DSS' | 'ISO27001') => Promise<void>;
  
  // Real-time monitoring
  startEventStream: (filters?: Record<string, any>) => EventSource | null;
  stopEventStream: () => void;
  
  // Cache management
  clearCache: () => void;
  
  // Error recovery
  retryConnection: () => Promise<void>;
}

export function useEnhancedAudit(options: EnhancedAuditOptions = {}): [EnhancedAuditData, EnhancedAuditActions] {
  const {
    projectId,
    dateRange,
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealtime = false,
    gracefulDegradation = true,
  } = options;

  // Get basic audit context
  const auditContext = useAudit();

  // State management
  const [data, setData] = useState<EnhancedAuditData>({
    statistics: null,
    analytics: null,
    events: [],
    eventsTotal: 0,
    eventsLoading: false,
    systemHealth: null,
    complianceReports: {},
    securityAnalytics: null,
    anomalies: null,
    userAnalytics: null,
    loading: true,
    error: null,
    backendAvailable: true,
    degradedMode: false,
  });

  const [eventStream, setEventStream] = useState<EventSource | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Helper function to safely call backend with error handling
  const safeBackendCall = useCallback(async <T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string
  ): Promise<T> => {
    try {
      const result = await operation();
      // Reset retry count on success
      if (retryCount > 0) {
        setRetryCount(0);
        setData(prev => ({ ...prev, backendAvailable: true, degradedMode: false }));
      }
      return result;
    } catch (error) {
      console.warn(`Audit ${operationName} failed:`, error);
      
      if (gracefulDegradation) {
        setData(prev => ({ 
          ...prev, 
          backendAvailable: false, 
          degradedMode: true,
          error: `Backend ${operationName} temporarily unavailable`
        }));
        return fallbackValue;
      } else {
        throw error;
      }
    }
  }, [gracefulDegradation, retryCount]);

  // Load comprehensive data with error handling
  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Try to load basic statistics first to test backend connectivity
      const statsResult = await safeBackendCall(
        () => backendAuditService.getAuditStatistics(),
        { success: false, data: null },
        'statistics'
      );

      if (!statsResult.success || !statsResult.data) {
        // Backend is not available, set minimal data
        setData(prev => ({
          ...prev,
          statistics: null,
          analytics: null,
          systemHealth: null,
          securityAnalytics: null,
          anomalies: null,
          loading: false,
          backendAvailable: false,
          degradedMode: true,
          error: 'Audit backend temporarily unavailable - running in limited mode'
        }));
        return;
      }

      // Backend is available, load remaining data
      const promises = [];

      // Core analytics
      promises.push(
        safeBackendCall(
          () => backendAuditService.getAuditAnalytics(
            dateRange?.from?.toISOString(),
            dateRange?.to?.toISOString()
          ),
          { success: false, data: null },
          'analytics'
        )
      );

      // System health
      promises.push(
        safeBackendCall(
          () => backendAuditService.getAuditHealth(),
          { success: false, data: null },
          'health'
        )
      );

      // Security analytics
      promises.push(
        safeBackendCall(
          () => backendAuditService.getSecurityAnalytics(),
          { success: false, data: null },
          'security'
        )
      );

      // Anomaly detection
      promises.push(
        safeBackendCall(
          () => backendAuditService.getAnomalyDetection(),
          { success: false, data: null },
          'anomalies'
        )
      );

      const [analytics, systemHealth, securityAnalytics, anomalies] = await Promise.all(promises);

      setData(prev => ({
        ...prev,
        statistics: statsResult.data,
        analytics: analytics.success ? analytics.data : null,
        systemHealth: systemHealth.success ? systemHealth.data : null,
        securityAnalytics: securityAnalytics.success ? securityAnalytics.data : null,
        anomalies: anomalies.success ? anomalies.data : null,
        loading: false,
        backendAvailable: true,
        degradedMode: false,
      }));
    } catch (error) {
      console.error('Error loading enhanced audit data:', error);
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load audit data',
        loading: false,
        backendAvailable: false,
        degradedMode: gracefulDegradation,
      }));
    }
  }, [dateRange, gracefulDegradation, safeBackendCall]);

  // Load events with error handling
  const loadEvents = useCallback(async (options: AuditQueryOptions = {}) => {
    try {
      setData(prev => ({ ...prev, eventsLoading: true }));

      const queryOptions: AuditQueryOptions = {
        ...options,
        filters: {
          ...options.filters,
          ...(projectId && { entity_id: projectId }),
          ...(dateRange?.from && { date_from: dateRange.from.toISOString() }),
          ...(dateRange?.to && { date_to: dateRange.to.toISOString() }),
        },
      };

      const result = await safeBackendCall(
        () => backendAuditService.getAuditEvents(queryOptions),
        { success: false, data: null },
        'events'
      );

      if (result.success && result.data) {
        // Handle paginated response structure
        if ('data' in result.data && Array.isArray(result.data.data)) {
          const paginatedData = result.data as PaginatedResponse<AuditEvent>;
          setData(prev => ({
            ...prev,
            events: paginatedData.data,
            eventsTotal: paginatedData.total,
            eventsLoading: false,
          }));
        } else {
          // Handle direct array response
          const eventsArray = Array.isArray(result.data) ? result.data : [];
          setData(prev => ({
            ...prev,
            events: eventsArray,
            eventsTotal: eventsArray.length,
            eventsLoading: false,
          }));
        }
      } else {
        // Backend not available, show empty state
        setData(prev => ({
          ...prev,
          events: [],
          eventsTotal: 0,
          eventsLoading: false,
          error: gracefulDegradation ? 'Events temporarily unavailable' : 'Failed to load events',
        }));
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setData(prev => ({
        ...prev,
        events: [],
        eventsTotal: 0,
        eventsLoading: false,
        error: gracefulDegradation ? 'Events temporarily unavailable' : (error instanceof Error ? error.message : 'Failed to load events'),
      }));
    }
  }, [projectId, dateRange, gracefulDegradation, safeBackendCall]);

  // Enhanced frontend logging with backend integration (with fallbacks)
  const logUserAction = useCallback(async (action: string, metadata?: Record<string, any>) => {
    // Always log to frontend service for immediate tracking
    try {
      await auditContext.logUserAction(action, metadata);
    } catch (error) {
      console.warn('Frontend audit logging failed:', error);
    }

    // Try to log to backend if available
    try {
      await safeBackendCall(
        () => backendAuditService.createAuditEvent({
          action,
          category: 'user_action',
          entity_type: 'frontend_action',
          details: `User performed ${action}`,
          metadata: {
            ...metadata,
            source: 'frontend',
            project_id: projectId,
          },
        }),
        { 
          success: false, 
          data: {
            id: '',
            timestamp: new Date().toISOString(),
            action: action,
            category: 'user_interaction',
            severity: 'low',
            entity_type: 'user_action',
            details: `User action: ${action}`,
            user_id: null,
            project_id: null,
            correlation_id: null,
            source: 'frontend',
            metadata: {}
          } as AuditEvent
        },
        'user_action_logging'
      );
    } catch (error) {
      // Silently fail if in graceful degradation mode
      if (!gracefulDegradation) {
        console.error('Backend user action logging failed:', error);
      }
    }
  }, [auditContext, projectId, gracefulDegradation, safeBackendCall]);

  const logPageView = useCallback(async (path: string, title?: string, metadata?: Record<string, any>) => {
    // Frontend tracking
    try {
      await frontendAuditService.logPageView(path, title, metadata);
    } catch (error) {
      console.warn('Frontend page view logging failed:', error);
    }

    // Backend tracking (with fallback)
    try {
      await safeBackendCall(
        () => backendAuditService.createAuditEvent({
          action: 'page_view',
          category: 'navigation',
          entity_type: 'page',
          entity_id: path,
          details: `User viewed page: ${title || path}`,
          metadata: {
            page_title: title,
            page_url: path,
            ...metadata,
            source: 'frontend',
            project_id: projectId,
          },
        }),
        { 
          success: false, 
          data: {
            id: '',
            timestamp: new Date().toISOString(),
            action: 'page_view',
            category: 'navigation',
            severity: 'low',
            entity_type: 'page',
            details: `User viewed page: ${title || path}`,
            user_id: null,
            project_id: null,
            correlation_id: null,
            source: 'frontend',
            metadata: {}
          } as AuditEvent
        },
        'page_view_logging'
      );
    } catch (error) {
      // Silently fail if in graceful degradation mode
      if (!gracefulDegradation) {
        console.error('Backend page view logging failed:', error);
      }
    }
  }, [projectId, gracefulDegradation, safeBackendCall]);

  const logError = useCallback(async (error: Error, component?: string, metadata?: Record<string, any>) => {
    // Frontend error tracking
    try {
      await auditContext.logError(error, component, metadata);
    } catch (err) {
      console.warn('Frontend error logging failed:', err);
    }

    // Backend error tracking (with fallback)
    try {
      await safeBackendCall(
        () => backendAuditService.createAuditEvent({
          action: 'frontend_error',
          category: 'error',
          severity: 'high',
          entity_type: 'error',
          details: `Frontend error in ${component || 'unknown component'}: ${error.message}`,
          metadata: {
            error_message: error.message,
            error_stack: error.stack,
            component_name: component,
            ...metadata,
            source: 'frontend',
            project_id: projectId,
          },
        }),
        { 
          success: false, 
          data: {
            id: '',
            timestamp: new Date().toISOString(),
            action: 'frontend_error',
            category: 'error',
            severity: 'high',
            entity_type: 'error',
            details: `Frontend error in ${component || 'unknown component'}: ${error.message}`,
            user_id: null,
            project_id: null,
            correlation_id: null,
            source: 'frontend',
            metadata: {}
          } as AuditEvent
        },
        'error_logging'
      );
    } catch (err) {
      // Silently fail if in graceful degradation mode
      if (!gracefulDegradation) {
        console.error('Backend error logging failed:', err);
      }
    }
  }, [auditContext, projectId, gracefulDegradation, safeBackendCall]);

  const logPerformance = useCallback(async (action: string, duration: number, metadata?: Record<string, any>) => {
    // Frontend performance tracking
    try {
      await frontendAuditService.logPerformance(action, duration, metadata);
    } catch (error) {
      console.warn('Frontend performance logging failed:', error);
    }

    // Backend performance tracking (with fallback)
    try {
      await safeBackendCall(
        () => backendAuditService.createAuditEvent({
          action: `performance_${action}`,
          category: 'performance',
          severity: duration > 1000 ? 'medium' : 'low',
          entity_type: 'performance',
          duration,
          details: `Performance measurement for ${action}: ${duration}ms`,
          metadata: {
            duration_ms: duration,
            action_name: action,
            ...metadata,
            source: 'frontend',
            project_id: projectId,
          },
        }),
        { 
          success: false, 
          data: {
            id: '',
            timestamp: new Date().toISOString(),
            action: `performance_${action}`,
            category: 'performance',
            severity: 'low',
            entity_type: 'performance',
            details: `Performance measurement for ${action}`,
            user_id: null,
            project_id: null,
            correlation_id: null,
            source: 'frontend',
            metadata: {}
          } as AuditEvent
        },
        'performance_logging'
      );
    } catch (error) {
      // Silently fail if in graceful degradation mode
      if (!gracefulDegradation) {
        console.error('Backend performance logging failed:', error);
      }
    }
  }, [projectId, gracefulDegradation, safeBackendCall]);

  // Backend operations with error handling
  const createAuditEvent = useCallback(async (event: Partial<AuditEvent>) => {
    try {
      const result = await safeBackendCall(
        () => backendAuditService.createAuditEvent({
          ...event,
          project_id: event.project_id || projectId,
        }),
        { 
          success: false, 
          data: {
            id: '',
            timestamp: new Date().toISOString(),
            action: event.action || '',
            category: event.category || 'general',
            severity: event.severity || 'low',
            entity_type: event.entity_type || 'unknown',
            details: event.details || '',
            user_id: null,
            project_id: null,
            correlation_id: null,
            source: 'frontend',
            metadata: {}
          } as AuditEvent
        },
        'create_event'
      );

      if (result.success) {
        // Refresh events if needed
        await loadEvents();
      }
    } catch (error) {
      console.error('Error creating audit event:', error);
    }
  }, [projectId, loadEvents, safeBackendCall]);

  const searchEvents = useCallback(async (query: string, filters?: Record<string, any>) => {
    try {
      setData(prev => ({ ...prev, eventsLoading: true }));

      const result = await safeBackendCall(
        () => backendAuditService.searchAuditEvents({
          query,
          filters: {
            ...filters,
            ...(projectId && { project_id: projectId }),
          },
          dateRange: dateRange ? {
            from: dateRange.from?.toISOString() || '',
            to: dateRange.to?.toISOString() || '',
          } : undefined,
        }),
        { success: false, data: [], total: 0 },
        'search_events'
      );

      if (result.success) {
        const searchData = result.data as AuditEvent[];
        setData(prev => ({
          ...prev,
          events: searchData,
          eventsTotal: result.total || searchData.length,
          eventsLoading: false,
        }));
      } else {
        setData(prev => ({
          ...prev,
          events: [],
          eventsTotal: 0,
          eventsLoading: false,
          error: gracefulDegradation ? 'Search temporarily unavailable' : 'Failed to search events',
        }));
      }
    } catch (error) {
      console.error('Error searching events:', error);
      setData(prev => ({
        ...prev,
        events: [],
        eventsTotal: 0,
        eventsLoading: false,
        error: gracefulDegradation ? 'Search temporarily unavailable' : (error instanceof Error ? error.message : 'Failed to search events'),
      }));
    }
  }, [projectId, dateRange, gracefulDegradation, safeBackendCall]);

  const exportData = useCallback(async (format: 'csv' | 'excel' | 'pdf', filters?: Record<string, any>) => {
    try {
      const result = await safeBackendCall(
        () => backendAuditService.exportAuditData({
          format,
          filters: {
            ...filters,
            project_id: projectId,
          },
          dateRange: dateRange ? {
            from: dateRange.from?.toISOString() || '',
            to: dateRange.to?.toISOString() || '',
          } : undefined,
        }),
        { 
          success: false,
          downloadUrl: '',
          filename: ''
        },
        'export_data'
      );

      if (result.success) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.warn('Export not available in degraded mode');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [projectId, dateRange, safeBackendCall]);

  const loadComplianceReport = useCallback(async (standard: 'SOX' | 'GDPR' | 'PCI_DSS' | 'ISO27001') => {
    try {
      const result = await safeBackendCall(
        () => backendAuditService.getComplianceReport(
          standard,
          dateRange?.from?.toISOString(),
          dateRange?.to?.toISOString()
        ),
        { success: false, data: null },
        'compliance_report'
      );

      if (result.success) {
        setData(prev => ({
          ...prev,
          complianceReports: {
            ...prev.complianceReports,
            [standard]: result.data,
          },
        }));
      }
    } catch (error) {
      console.error(`Error loading ${standard} compliance report:`, error);
    }
  }, [dateRange, safeBackendCall]);

  // Real-time event streaming (with error handling)
  const startEventStream = useCallback((filters?: Record<string, any>) => {
    if (!enableRealtime || !data.backendAvailable) return null;

    try {
      const stream = backendAuditService.createEventStream({
        ...filters,
        project_id: projectId,
      });

      stream.onmessage = (event) => {
        try {
          const auditEvent = JSON.parse(event.data);
          setData(prev => ({
            ...prev,
            events: [auditEvent, ...prev.events.slice(0, 99)], // Keep last 100 events
            eventsTotal: prev.eventsTotal + 1,
          }));
        } catch (error) {
          console.error('Error parsing real-time event:', error);
        }
      };

      stream.onerror = (error) => {
        console.error('Event stream error:', error);
        setData(prev => ({ ...prev, backendAvailable: false, degradedMode: true }));
      };

      setEventStream(stream);
      return stream;
    } catch (error) {
      console.error('Error starting event stream:', error);
      return null;
    }
  }, [enableRealtime, projectId, data.backendAvailable]);

  const stopEventStream = useCallback(() => {
    if (eventStream) {
      eventStream.close();
      setEventStream(null);
    }
  }, [eventStream]);

  // Cache management
  const clearCache = useCallback(() => {
    backendAuditService.clearCache();
  }, []);

  // Error recovery
  const retryConnection = useCallback(async () => {
    if (retryCount >= maxRetries) {
      console.warn('Max retries reached for audit backend connection');
      return;
    }

    setRetryCount(prev => prev + 1);
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await loadData();
      await loadEvents();
    } catch (error) {
      console.error('Retry connection failed:', error);
    }
  }, [retryCount, loadData, loadEvents]);

  // Auto-refresh effect with error handling
  useEffect(() => {
    loadData();
    loadEvents();
  }, [loadData, loadEvents]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && data.backendAvailable) {
      const interval = setInterval(() => {
        loadData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadData, data.backendAvailable]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopEventStream();
    };
  }, [stopEventStream]);

  const actions: EnhancedAuditActions = useMemo(() => ({
    refreshAll: async () => {
      await loadData();
      await loadEvents();
    },
    loadEvents,
    logUserAction,
    logPageView,
    logError,
    logPerformance,
    createAuditEvent,
    searchEvents,
    exportData,
    loadComplianceReport,
    startEventStream,
    stopEventStream,
    clearCache,
    retryConnection,
  }), [
    loadData,
    loadEvents,
    logUserAction,
    logPageView,
    logError,
    logPerformance,
    createAuditEvent,
    searchEvents,
    exportData,
    loadComplianceReport,
    startEventStream,
    stopEventStream,
    clearCache,
    retryConnection,
  ]);

  return [data, actions];
}

export default useEnhancedAudit;
