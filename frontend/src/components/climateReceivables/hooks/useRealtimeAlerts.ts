/**
 * Realtime Alert System Hook
 * 
 * React hook for integrating the realtime alert system with frontend components.
 * Provides real-time monitoring, alert management, and notification handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/infrastructure/database/client';

interface Alert {
  id: string;
  receivableId?: string;
  type?: string;
  severity: 'info' | 'warning' | 'critical';
  level: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
  details?: Record<string, any>;
  threshold?: number;
  value?: number;
  recommendations?: string[];
  timestamp?: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface AlertFilter {
  severity?: 'info' | 'warning' | 'critical';
  type?: string;
  acknowledged?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AlertStatistics {
  total: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
  unacknowledged: number;
  recentAlerts: number; // last 24 hours
}

interface UseRealtimeAlertsProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableNotifications?: boolean;
  filter?: AlertFilter;
}

interface AlertState {
  alerts: Alert[];
  statistics: AlertStatistics;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  subscription: any | null;
}

/**
 * Hook for Realtime Alert System
 */
export function useRealtimeAlerts({
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds default
  enableNotifications = true,
  filter = {}
}: UseRealtimeAlertsProps = {}) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationPermissionRef = useRef<boolean>(false);
  
  const [state, setState] = useState<AlertState>({
    alerts: [],
    statistics: {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
      acknowledged: 0,
      unacknowledged: 0,
      recentAlerts: 0
    },
    loading: false,
    error: null,
    lastUpdate: null,
    subscription: null
  });

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (enableNotifications && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      notificationPermissionRef.current = permission === 'granted';
      return permission === 'granted';
    }
    return false;
  }, [enableNotifications]);

  // Show browser notification for critical alerts
  const showNotification = useCallback((alert: Alert) => {
    if (!enableNotifications || !notificationPermissionRef.current) return;
    
    const icon = alert.severity === 'critical' ? '🚨' : 
                 alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    
    const notification = new Notification(`${icon} Climate Alert - ${alert.severity.toUpperCase()}`, {
      body: alert.message,
      icon: '/favicon.ico',
      tag: `climate-alert-${alert.id}`,
      requireInteraction: alert.severity === 'critical'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto-close after 10 seconds for non-critical alerts
    if (alert.severity !== 'critical') {
      setTimeout(() => notification.close(), 10000);
    }
  }, [enableNotifications]);

  // Fetch alerts from database
  const fetchAlerts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Note: This assumes alerts are stored in a dedicated table
      // For now, we'll create mock alerts based on risk calculations
      const { data: riskCalculations, error: riskError } = await supabase
        .from('climate_risk_calculations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (riskError) throw riskError;
      
      // Generate alerts from risk calculations
      const alerts: Alert[] = [];
      
      for (const calc of riskCalculations || []) {
        const riskScore = calc.risk_score || 0;
        const discountRate = calc.discount_rate || 0;
        
        // Generate risk score alerts
        if (riskScore >= 90) {
          alerts.push({
            id: `risk-critical-${calc.id}`,
            receivableId: calc.receivable_id,
            type: 'high_risk',
            severity: 'critical',
            level: 'critical',
            message: `Critical risk level detected: ${riskScore}% risk score`,
            action: 'Immediate review required',
            details: {
              riskScore,
              threshold: 90,
              factors: calc.risk_factors || []
            },
            threshold: 90,
            value: riskScore,
            recommendations: ['Immediate review required', 'Consider risk mitigation measures'],
            createdAt: calc.created_at || new Date().toISOString(),
            acknowledged: false
          });
        } else if (riskScore >= 70) {
          alerts.push({
            id: `risk-warning-${calc.id}`,
            receivableId: calc.receivable_id,
            type: 'elevated_risk',
            severity: 'warning',
            level: 'warning',
            message: `Elevated risk level: ${riskScore}% risk score`,
            action: 'Monitor closely',
            details: {
              riskScore,
              threshold: 70,
              factors: calc.risk_factors || []
            },
            threshold: 70,
            value: riskScore,
            recommendations: ['Monitor closely', 'Review risk factors'],
            createdAt: calc.created_at || new Date().toISOString(),
            acknowledged: false
          });
        }
        
        // Generate discount rate alerts
        if (discountRate >= 0.15) {
          alerts.push({
            id: `discount-high-${calc.id}`,
            receivableId: calc.receivable_id,
            type: 'high_discount_rate',
            severity: 'warning',
            level: 'warning',
            message: `High discount rate applied: ${(discountRate * 100).toFixed(2)}%`,
            action: 'Review pricing strategy',
            details: {
              discountRate,
              threshold: 0.15,
              impact: 'Significant value reduction'
            },
            threshold: 15,
            value: discountRate * 100,
            recommendations: ['Review pricing strategy', 'Analyze market conditions'],
            createdAt: calc.created_at || new Date().toISOString(),
            acknowledged: false
          });
        }
      }
      
      // Apply filters
      let filteredAlerts = alerts;
      
      if (filter.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filter.severity);
      }
      
      if (filter.type) {
        filteredAlerts = filteredAlerts.filter(a => a.type === filter.type);
      }
      
      if (filter.acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filter.acknowledged);
      }
      
      if (filter.dateRange) {
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        filteredAlerts = filteredAlerts.filter(a => {
          const alertDate = new Date(a.createdAt);
          return alertDate >= startDate && alertDate <= endDate;
        });
      }
      
      // Calculate statistics
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const statistics: AlertStatistics = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        acknowledged: alerts.filter(a => a.acknowledged).length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
        recentAlerts: alerts.filter(a => new Date(a.createdAt) >= oneDayAgo).length
      };
      
      // Show notifications for new critical alerts
      if (enableNotifications) {
        const previousLastUpdate = state.lastUpdate;
        
        setState(prev => ({
          ...prev,
          alerts: filteredAlerts,
          statistics,
          lastUpdate: new Date().toISOString()
        }));
        
        const newCriticalAlerts = filteredAlerts.filter(alert => 
          alert.severity === 'critical' && 
          !alert.acknowledged &&
          new Date(alert.createdAt) > new Date(previousLastUpdate || 0)
        );
        
        newCriticalAlerts.forEach(showNotification);
      } else {
        setState(prev => ({
          ...prev,
          alerts: filteredAlerts,
          statistics,
          lastUpdate: new Date().toISOString()
        }));
      }
      
      return filteredAlerts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      console.error('Failed to fetch alerts:', error);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [filter, enableNotifications, showNotification]);

  // Acknowledge single alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      // For now, just update local state since we don't have a dedicated alerts table
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                acknowledged: true,
                acknowledgedBy: 'current_user', // Would use actual user ID
                acknowledgedAt: new Date().toISOString()
              }
            : alert
        )
      }));
      
      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged."
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Acknowledge multiple alerts
  const acknowledgeAlerts = useCallback(async (alertIds: string[]) => {
    try {
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alertIds.includes(alert.id)
            ? {
                ...alert,
                acknowledged: true,
                acknowledgedBy: 'current_user',
                acknowledgedAt: new Date().toISOString()
              }
            : alert
        )
      }));
      
      toast({
        title: "Alerts Acknowledged",
        description: `${alertIds.length} alerts marked as acknowledged.`
      });
    } catch (error) {
      console.error('Failed to acknowledge alerts:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alerts.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Acknowledge all unacknowledged alerts
  const acknowledgeAllAlerts = useCallback(async () => {
    const unacknowledgedIds = state.alerts
      .filter(alert => !alert.acknowledged)
      .map(alert => alert.id);
    
    if (unacknowledgedIds.length > 0) {
      await acknowledgeAlerts(unacknowledgedIds);
    }
  }, [state.alerts, acknowledgeAlerts]);

  // Get alerts by severity
  const getAlertsBySeverity = useCallback((severity: 'info' | 'warning' | 'critical') => {
    return state.alerts.filter(alert => alert.severity === severity);
  }, [state.alerts]);

  // Get recent alerts (last 24 hours)
  const getRecentAlerts = useCallback(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return state.alerts.filter(alert => new Date(alert.createdAt) >= oneDayAgo);
  }, [state.alerts]);

  // Get alerts for specific receivable
  const getReceivableAlerts = useCallback((receivableId: string) => {
    return state.alerts.filter(alert => alert.receivableId === receivableId);
  }, [state.alerts]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      if (!autoRefresh) return;
      
      // Subscribe to changes in climate_risk_calculations table
      const subscription = supabase
        .channel('climate-alerts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'climate_risk_calculations'
          },
          () => {
            // Refresh alerts when risk calculations change
            fetchAlerts();
          }
        )
        .subscribe();
      
      setState(prev => ({ ...prev, subscription }));
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupSubscription();
  }, [autoRefresh, fetchAlerts]);

  // Setup polling for non-realtime updates
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && !state.subscription) {
      intervalRef.current = setInterval(fetchAlerts, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchAlerts, state.subscription]);

  // Initial setup
  useEffect(() => {
    requestNotificationPermission();
    fetchAlerts();
  }, [requestNotificationPermission, fetchAlerts]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (state.subscription) {
        state.subscription.unsubscribe();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.subscription]);

  return {
    // State
    alerts: state.alerts,
    statistics: state.statistics,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    
    // Actions
    fetchAlerts,
    acknowledgeAlert,
    acknowledgeAlerts,
    acknowledgeAllAlerts,
    clearAlerts: () => setState(prev => ({ ...prev, alerts: [] })),
    clearError,
    
    // Getters
    getAlertsBySeverity,
    getRecentAlerts,
    getReceivableAlerts,
    
    // Helper values
    unacknowledgedCount: state.statistics.unacknowledged,
    criticalCount: state.statistics.critical,
    hasUnacknowledged: state.statistics.unacknowledged > 0,
    hasCritical: state.statistics.critical > 0,
    notificationsEnabled: notificationPermissionRef.current
  };
}

/**
 * Hook for monitoring alerts for a specific receivable
 */
export function useReceivableAlerts(receivableId: string) {
  const { alerts, loading, error, acknowledgeAlert } = useRealtimeAlerts();
  
  const receivableAlerts = alerts.filter(alert => alert.receivableId === receivableId);
  
  const acknowledgeReceivableAlert = useCallback(async (alertId: string) => {
    await acknowledgeAlert(alertId);
  }, [acknowledgeAlert]);
  
  return {
    alerts: receivableAlerts,
    loading,
    error,
    acknowledgeAlert: acknowledgeReceivableAlert,
    alertCount: receivableAlerts.length,
    criticalCount: receivableAlerts.filter(a => a.severity === 'critical').length,
    warningCount: receivableAlerts.filter(a => a.severity === 'warning').length,
    hasAlerts: receivableAlerts.length > 0,
    hasCritical: receivableAlerts.some(a => a.severity === 'critical'),
    hasUnacknowledged: receivableAlerts.some(a => !a.acknowledged)
  };
}
