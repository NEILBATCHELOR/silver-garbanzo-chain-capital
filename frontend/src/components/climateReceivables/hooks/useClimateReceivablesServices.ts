/**
 * Climate Receivables Services Integration Hook
 * 
 * Master hook that orchestrates all climate receivables business logic services.
 * Provides a unified interface for risk calculation, cash flow forecasting,
 * alerts, and comprehensive system monitoring.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useEnhancedRiskCalculation } from './useEnhancedRiskCalculation';
import { useCashFlowForecasting } from './useCashFlowForecasting';
import { useRealtimeAlerts } from './useRealtimeAlerts';

interface SystemHealthStatus {
  riskCalculation: 'healthy' | 'warning' | 'critical';
  cashFlowForecasting: 'healthy' | 'warning' | 'critical';
  alertSystem: 'healthy' | 'warning' | 'critical';
  overall: 'healthy' | 'warning' | 'critical';
  lastChecked: string;
}

interface ServiceMetrics {
  totalReceivables: number;
  averageRiskScore: number;
  totalProjectedCashFlow: number;
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  systemHealth: SystemHealthStatus;
  performanceMetrics: {
    riskCalculationTime: number; // milliseconds
    forecastGenerationTime: number; // milliseconds
    alertResponseTime: number; // milliseconds
  };
}

interface UseClimateReceivablesServicesProps {
  projectId?: string;
  receivableIds?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableRiskCalculation?: boolean;
  enableCashFlowForecasting?: boolean;
  enableAlerts?: boolean;
}

/**
 * Master hook for Climate Receivables Services Integration
 */
export function useClimateReceivablesServices({
  projectId,
  receivableIds = [],
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes default
  enableRiskCalculation = true,
  enableCashFlowForecasting = true,
  enableAlerts = true
}: UseClimateReceivablesServicesProps = {}) {
  const { toast } = useToast();
  
  const [systemMetrics, setSystemMetrics] = useState<ServiceMetrics>({
    totalReceivables: 0,
    averageRiskScore: 0,
    totalProjectedCashFlow: 0,
    unacknowledgedAlerts: 0,
    criticalAlerts: 0,
    systemHealth: {
      riskCalculation: 'healthy',
      cashFlowForecasting: 'healthy',
      alertSystem: 'healthy',
      overall: 'healthy',
      lastChecked: new Date().toISOString()
    },
    performanceMetrics: {
      riskCalculationTime: 0,
      forecastGenerationTime: 0,
      alertResponseTime: 0
    }
  });

  // Initialize all service hooks
  const riskCalculation = useEnhancedRiskCalculation({
    projectId,
    autoRefresh: enableRiskCalculation && autoRefresh,
    refreshInterval
  });

  const cashFlowForecasting = useCashFlowForecasting({
    receivableIds,
    autoRefresh: enableCashFlowForecasting && autoRefresh,
    refreshInterval
  });

  const alertSystem = useRealtimeAlerts({
    autoRefresh: enableAlerts && autoRefresh,
    refreshInterval: refreshInterval / 10, // More frequent for alerts
    enableNotifications: true
  });

  // Calculate system health status
  const calculateSystemHealth = useCallback((): SystemHealthStatus => {
    const now = new Date().toISOString();
    
    // Risk calculation health
    let riskHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (riskCalculation.error) {
      riskHealth = 'critical';
    } else if (riskCalculation.highRiskCount > riskCalculation.totalReceivables * 0.3) {
      riskHealth = 'warning';
    }
    
    // Cash flow forecasting health
    let cashFlowHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (cashFlowForecasting.error) {
      cashFlowHealth = 'critical';
    } else if (cashFlowForecasting.averageConfidence < 0.7) {
      cashFlowHealth = 'warning';
    }
    
    // Alert system health
    let alertHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (alertSystem.error) {
      alertHealth = 'critical';
    } else if (alertSystem.criticalCount > 5) {
      alertHealth = 'warning';
    }
    
    // Overall health
    const healthLevels = [riskHealth, cashFlowHealth, alertHealth];
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (healthLevels.includes('critical')) {
      overallHealth = 'critical';
    } else if (healthLevels.includes('warning')) {
      overallHealth = 'warning';
    }
    
    return {
      riskCalculation: riskHealth,
      cashFlowForecasting: cashFlowHealth,
      alertSystem: alertHealth,
      overall: overallHealth,
      lastChecked: now
    };
  }, [
    riskCalculation.error, riskCalculation.highRiskCount, riskCalculation.totalReceivables,
    cashFlowForecasting.error, cashFlowForecasting.averageConfidence,
    alertSystem.error, alertSystem.criticalCount
  ]);

  // Update system metrics
  const updateSystemMetrics = useCallback(() => {
    const portfolioForecast = cashFlowForecasting.getPortfolioForecast();
    
    const metrics: ServiceMetrics = {
      totalReceivables: Math.max(
        riskCalculation.totalReceivables,
        cashFlowForecasting.totalReceivables
      ),
      averageRiskScore: riskCalculation.averageRiskScore,
      totalProjectedCashFlow: portfolioForecast?.totalProjected || 0,
      unacknowledgedAlerts: alertSystem.unacknowledgedCount,
      criticalAlerts: alertSystem.criticalCount,
      systemHealth: calculateSystemHealth(),
      performanceMetrics: {
        riskCalculationTime: riskCalculation.calculating ? 5000 : 1200, // Estimated
        forecastGenerationTime: cashFlowForecasting.calculating ? 8000 : 2500, // Estimated
        alertResponseTime: alertSystem.loading ? 1000 : 300 // Estimated
      }
    };
    
    setSystemMetrics(metrics);
  }, [
    riskCalculation.totalReceivables, riskCalculation.averageRiskScore, riskCalculation.calculating,
    cashFlowForecasting.totalReceivables, cashFlowForecasting.getPortfolioForecast, cashFlowForecasting.calculating,
    alertSystem.unacknowledgedCount, alertSystem.criticalCount, alertSystem.loading,
    calculateSystemHealth
  ]);

  // Comprehensive system initialization
  const initializeAllServices = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      toast({
        title: "Initializing Climate Services",
        description: "Starting comprehensive system initialization..."
      });
      
      // Initialize services in parallel for better performance
      const promises = [];
      
      if (enableRiskCalculation) {
        promises.push(riskCalculation.initializeAutomatedCalculation());
      }
      
      if (enableCashFlowForecasting && receivableIds.length > 0) {
        promises.push(cashFlowForecasting.generateForecast());
      }
      
      if (enableAlerts) {
        promises.push(alertSystem.fetchAlerts());
      }
      
      const results = await Promise.allSettled(promises);
      
      // Count successful initializations
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      const duration = Date.now() - startTime;
      
      if (failed === 0) {
        toast({
          title: "System Initialization Complete",
          description: `All ${successful} services initialized successfully in ${duration}ms.`
        });
      } else {
        toast({
          title: "System Initialization Partial",
          description: `${successful} services initialized, ${failed} failed. Check individual service status.`,
          variant: "destructive"
        });
      }
      
      updateSystemMetrics();
      
    } catch (error) {
      console.error('System initialization failed:', error);
      toast({
        title: "System Initialization Failed",
        description: "Failed to initialize climate receivables services.",
        variant: "destructive"
      });
    }
  }, [
    enableRiskCalculation, enableCashFlowForecasting, enableAlerts,
    receivableIds, riskCalculation, cashFlowForecasting, alertSystem,
    updateSystemMetrics, toast
  ]);

  // Comprehensive data refresh
  const refreshAllData = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      const promises = [];
      
      if (enableRiskCalculation) {
        promises.push(riskCalculation.calculateBatchRisk());
      }
      
      if (enableCashFlowForecasting) {
        promises.push(cashFlowForecasting.fetchProjections());
      }
      
      if (enableAlerts) {
        promises.push(alertSystem.fetchAlerts());
      }
      
      await Promise.allSettled(promises);
      
      const duration = Date.now() - startTime;
      updateSystemMetrics();
      
      toast({
        title: "Data Refresh Complete",
        description: `All services refreshed in ${duration}ms.`
      });
      
    } catch (error) {
      console.error('Data refresh failed:', error);
      toast({
        title: "Data Refresh Failed",
        description: "Some services may not have updated properly.",
        variant: "destructive"
      });
    }
  }, [
    enableRiskCalculation, enableCashFlowForecasting, enableAlerts,
    riskCalculation, cashFlowForecasting, alertSystem,
    updateSystemMetrics, toast
  ]);

  // Get comprehensive dashboard data
  const getDashboardData = useCallback(() => {
    const riskDistribution = riskCalculation.getRiskDistribution();
    const portfolioForecast = cashFlowForecasting.getPortfolioForecast();
    const recentAlerts = alertSystem.getRecentAlerts();
    const recentRiskChanges = riskCalculation.getRecentRiskChanges();
    
    return {
      overview: {
        totalReceivables: systemMetrics.totalReceivables,
        averageRiskScore: systemMetrics.averageRiskScore,
        totalProjectedValue: systemMetrics.totalProjectedCashFlow,
        systemHealth: systemMetrics.systemHealth.overall
      },
      riskAnalysis: {
        distribution: riskDistribution,
        highRiskCount: riskCalculation.highRiskCount,
        averageScore: riskCalculation.averageRiskScore,
        recentChanges: recentRiskChanges,
        statistics: riskCalculation.statistics
      },
      cashFlowAnalysis: {
        portfolioForecast,
        totalProjected: cashFlowForecasting.totalProjectedValue,
        averageConfidence: cashFlowForecasting.averageConfidence,
        forecastAccuracy: cashFlowForecasting.getForecastAccuracy()
      },
      alertAnalysis: {
        total: alertSystem.statistics.total,
        unacknowledged: alertSystem.statistics.unacknowledged,
        critical: alertSystem.statistics.critical,
        recent: recentAlerts,
        bySeverity: {
          critical: alertSystem.getAlertsBySeverity('critical'),
          warning: alertSystem.getAlertsBySeverity('warning'),
          info: alertSystem.getAlertsBySeverity('info')
        }
      },
      performance: systemMetrics.performanceMetrics,
      lastUpdated: Math.max(
        new Date(riskCalculation.lastUpdate || 0).getTime(),
        new Date(cashFlowForecasting.lastUpdate || 0).getTime(),
        new Date(alertSystem.lastUpdate || 0).getTime()
      )
    };
  }, [
    systemMetrics, riskCalculation, cashFlowForecasting, alertSystem
  ]);

  // Check if any service is currently loading
  const isLoading = riskCalculation.loading || 
                   cashFlowForecasting.loading || 
                   alertSystem.loading;

  // Check if any service is calculating/processing
  const isProcessing = riskCalculation.calculating || 
                      cashFlowForecasting.calculating;

  // Check if any service has errors
  const hasErrors = !!(riskCalculation.error || 
                      cashFlowForecasting.error || 
                      alertSystem.error);

  // Get all error messages
  const getAllErrors = useCallback(() => {
    const errors = [];
    if (riskCalculation.error) errors.push(`Risk Calculation: ${riskCalculation.error}`);
    if (cashFlowForecasting.error) errors.push(`Cash Flow: ${cashFlowForecasting.error}`);
    if (alertSystem.error) errors.push(`Alerts: ${alertSystem.error}`);
    return errors;
  }, [riskCalculation.error, cashFlowForecasting.error, alertSystem.error]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    riskCalculation.clearError();
    cashFlowForecasting.clearError();
    alertSystem.clearError();
  }, [riskCalculation, cashFlowForecasting, alertSystem]);

  // Update metrics when service states change
  useEffect(() => {
    updateSystemMetrics();
  }, [updateSystemMetrics]);

  // Initial system initialization
  useEffect(() => {
    if (projectId) {
      initializeAllServices();
    }
  }, [projectId, initializeAllServices]);

  return {
    // Service instances
    riskCalculation,
    cashFlowForecasting,
    alertSystem,
    
    // System metrics
    metrics: systemMetrics,
    
    // Aggregated state
    isLoading,
    isProcessing,
    hasErrors,
    errors: getAllErrors(),
    
    // System actions
    initializeAllServices,
    refreshAllData,
    clearAllErrors,
    
    // Dashboard data
    getDashboardData,
    
    // Health status
    systemHealth: systemMetrics.systemHealth,
    
    // Performance metrics
    performance: systemMetrics.performanceMetrics
  };
}
