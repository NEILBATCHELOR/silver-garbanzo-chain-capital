/**
 * Enhanced Risk Calculation Hook
 * 
 * React hook for integrating the Enhanced Automated Risk Calculation Engine
 * with frontend components. Provides real-time risk monitoring, automated
 * calculations, and comprehensive alerting.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { EnhancedAutomatedRiskCalculationEngine } from '../services/business-logic/enhanced-automated-risk-calculation-engine';
import type { 
  EnhancedRiskAssessmentResult, 
  AlertItem
} from '../services/business-logic/enhanced-types';
import { RiskLevel } from '../services/business-logic/enhanced-types';

// Type for what the statistics service actually returns
type ActualStatisticsResult = {
  totalCalculations: number;
  averageRiskScore: number;
  riskDistribution: Record<RiskLevel, number>;
  trends: {
    dailyCalculations: Array<{ date: string; count: number; averageRisk: number }>;
    riskLevelTrends: Record<RiskLevel, number[]>;
  };
};

interface UseEnhancedRiskCalculationProps {
  projectId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface RiskCalculationState {
  results: EnhancedRiskAssessmentResult[];
  statistics: ActualStatisticsResult | null;
  alerts: AlertItem[];
  loading: boolean;
  calculating: boolean;
  lastUpdate: string | null;
  error: string | null;
}

/**
 * Hook for Enhanced Risk Calculation Engine Integration
 */
export function useEnhancedRiskCalculation({
  projectId,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes default
}: UseEnhancedRiskCalculationProps = {}) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<RiskCalculationState>({
    results: [],
    statistics: null,
    alerts: [],
    loading: false,
    calculating: false,
    lastUpdate: null,
    error: null
  });

  // Calculate risk for a single receivable
  const calculateSingleRisk = useCallback(async (
    receivableId: string, 
    forceRecalculation: boolean = false
  ): Promise<EnhancedRiskAssessmentResult | null> => {
    try {
      setState(prev => ({ ...prev, calculating: true, error: null }));
      
      const result = await EnhancedAutomatedRiskCalculationEngine
        .performRiskCalculation(receivableId, forceRecalculation);
      
      setState(prev => ({
        ...prev,
        results: prev.results.map(r => 
          r.receivableId === receivableId ? result : r
        ),
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Risk Calculation Complete",
        description: `Risk score: ${result.compositeRisk.score} (${result.compositeRisk.level})`
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Risk Calculation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setState(prev => ({ ...prev, calculating: false }));
    }
  }, [toast]);

  // Calculate risk for multiple receivables (batch processing)
  const calculateBatchRisk = useCallback(async (
    receivableIds: string[] = [],
    maxConcurrency: number = 5
  ) => {
    try {
      setState(prev => ({ ...prev, calculating: true, error: null }));
      
      const result = receivableIds.length > 0
        ? await EnhancedAutomatedRiskCalculationEngine
            .performBatchRiskCalculation(receivableIds, maxConcurrency)
        : await EnhancedAutomatedRiskCalculationEngine
            .runScheduledCalculations();
      
      // Handle batch calculation result
      if ('successful' in result && Array.isArray(result.successful) && 'summary' in result) {
        const allAlerts = result.successful.flatMap(r => r.alerts);
        setState(prev => ({
          ...prev,
          results: result.successful,
          alerts: allAlerts,
          lastUpdate: new Date().toISOString()
        }));
        
        toast({
          title: "Batch Risk Calculation Complete",
          description: `Processed ${result.summary.successful} receivables. ${allAlerts.length} alerts generated.`
        });
      } else if ('processed' in result) {
        // Handle scheduled calculation result
        setState(prev => ({ 
          ...prev, 
          lastUpdate: new Date().toISOString() 
        }));
        
        toast({
          title: "Scheduled Calculations Complete",
          description: `Processed ${result.processed} receivables. ${result.successful} successful, ${result.failed} failed.`
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Batch Risk Calculation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setState(prev => ({ ...prev, calculating: false }));
    }
  }, [toast]);

  // Initialize automated risk calculation for all receivables
  const initializeAutomatedCalculation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await EnhancedAutomatedRiskCalculationEngine
        .initializeAutomatedCalculation();
      
      setState(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Risk Calculation Initialized",
        description: `Processed ${result.initialized} receivables. ${result.errors} errors occurred.`
      });
        
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Risk Calculation Initialization Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [toast]);

  // Fetch risk calculation statistics
  const fetchStatistics = useCallback(async (days: number = 30) => {
    try {
      const statistics = await EnhancedAutomatedRiskCalculationEngine
        .getRiskCalculationStatistics(days);
      
      setState(prev => ({
        ...prev,
        statistics,
        lastUpdate: new Date().toISOString()
      }));
      
      return statistics;
    } catch (error) {
      console.error('Failed to fetch risk statistics:', error);
      return null;
    }
  }, []);

  // Get risk level distribution
  const getRiskDistribution = useCallback(() => {
    const distribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    state.results.forEach(result => {
      const level = result.compositeRisk.level as RiskLevel;
      if (level in distribution) {
        distribution[level]++;
      }
    });
    
    return distribution;
  }, [state.results]);

  // Get high-priority alerts
  const getHighPriorityAlerts = useCallback(() => {
    return state.alerts.filter(alert => 
      alert.level === 'critical' || alert.level === 'warning'
    );
  }, [state.alerts]);

  // Get recent risk changes
  const getRecentRiskChanges = useCallback(() => {
    return state.results
      .filter(result => result.alerts && result.alerts.length > 0)
      .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())
      .slice(0, 10);
  }, [state.results]);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        calculateBatchRisk();
        fetchStatistics();
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, calculateBatchRisk, fetchStatistics]);

  // Initial data load
  useEffect(() => {
    if (projectId) {
      initializeAutomatedCalculation();
      fetchStatistics();
    }
  }, [projectId, initializeAutomatedCalculation, fetchStatistics]);

  return {
    // State
    results: state.results,
    statistics: state.statistics,
    alerts: state.alerts,
    loading: state.loading,
    calculating: state.calculating,
    lastUpdate: state.lastUpdate,
    error: state.error,
    
    // Actions
    calculateSingleRisk,
    calculateBatchRisk,
    initializeAutomatedCalculation,
    fetchStatistics,
    clearAlerts,
    clearError,
    
    // Computed values
    getRiskDistribution,
    getHighPriorityAlerts,
    getRecentRiskChanges,
    
    // Helper values
    totalReceivables: state.results.length,
    averageRiskScore: state.results.length > 0 
      ? state.results.reduce((sum, r) => sum + r.compositeRisk.score, 0) / state.results.length 
      : 0,
    highRiskCount: state.results.filter(r => 
      r.compositeRisk.level === RiskLevel.HIGH || r.compositeRisk.level === RiskLevel.CRITICAL
    ).length
  };
}

/**
 * Hook for monitoring a specific receivable's risk
 */
export function useReceivableRiskMonitor(receivableId: string) {
  const [riskResult, setRiskResult] = useState<EnhancedRiskAssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const refreshRisk = useCallback(async (forceRecalculation: boolean = false) => {
    if (!receivableId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await EnhancedAutomatedRiskCalculationEngine
        .performRiskCalculation(receivableId, forceRecalculation);
      
      setRiskResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (forceRecalculation) {
        toast({
          title: "Risk Calculation Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [receivableId, toast]);

  useEffect(() => {
    refreshRisk();
  }, [refreshRisk]);

  return {
    riskResult,
    loading,
    error,
    refreshRisk,
    hasHighRisk: riskResult?.compositeRisk.level === RiskLevel.HIGH || riskResult?.compositeRisk.level === RiskLevel.CRITICAL,
    riskScore: riskResult?.compositeRisk.score || 0,
    discountRate: riskResult?.discountRate.calculated || 0,
    confidence: riskResult?.compositeRisk.confidence || 0
  };
}
