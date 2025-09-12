/**
 * Enhanced Risk Calculation Hook
 * 
 * React hook for integrating the Enhanced Automated Risk Calculation Engine
 * with frontend components. Provides real-time risk monitoring, automated
 * calculations, and comprehensive alerting.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/infrastructure/database/client';
import { EnhancedRiskCalculationEngine } from '@/services/climateReceivables/enhancedRiskCalculationEngine';
import type { 
  ClimateRiskAssessmentResult as EnhancedRiskAssessmentResult, 
  ClimateAlert as AlertItem,
  AlertSeverity as RiskLevel
} from '@/types/domain/climate/receivables';

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
      
      const result = await EnhancedRiskCalculationEngine
        .calculateEnhancedRisk({
          receivableId,
          payerId: '', // Will be fetched by the service
          assetId: '', // Will be fetched by the service
          amount: 0,
          dueDate: ''
        }, forceRecalculation);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Risk calculation failed');
      }

      const riskResult = result.data;
      
      setState(prev => ({
        ...prev,
        results: prev.results.map(r => 
          r.receivableId === receivableId ? riskResult : r
        ),
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Risk Calculation Complete",
        description: `Risk score: ${riskResult.riskScore} (${riskResult.riskTier})`
      });
      
      return riskResult;
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
      
      // For now, process sequentially since we don't have batch methods
      const results: EnhancedRiskAssessmentResult[] = [];
      let successful = 0;
      let failed = 0;
      
      for (const receivableId of receivableIds) {
        try {
          const result = await EnhancedRiskCalculationEngine
            .calculateEnhancedRisk({
              receivableId,
              payerId: '',
              assetId: '',
              amount: 0,
              dueDate: ''
            });
          
          if (result.success && result.data) {
            results.push(result.data);
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }
      
      setState(prev => ({
        ...prev,
        results: [...prev.results, ...results],
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Batch Risk Calculation Complete",
        description: `Processed ${receivableIds.length} receivables. ${successful} successful, ${failed} failed.`
      });
      
      return {
        successful: results,
        failed: failed,
        summary: { successful, failed, processed: receivableIds.length }
      };
      
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
      
      // Get all receivables and calculate risk for each
      const { data: receivables, error } = await supabase
        .from('climate_receivables')
        .select('receivable_id')
        .limit(50); // Process in batches

      if (error) throw error;

      let initialized = 0;
      let errors = 0;

      if (receivables) {
        for (const receivable of receivables) {
          try {
            const result = await EnhancedRiskCalculationEngine
              .calculateEnhancedRisk({
                receivableId: receivable.receivable_id,
                payerId: '',
                assetId: '',
                amount: 0,
                dueDate: ''
              });

            if (result.success) {
              initialized++;
            } else {
              errors++;
            }
          } catch (err) {
            errors++;
          }
        }
      }
      
      setState(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Risk Calculation Initialized",
        description: `Processed ${initialized} receivables. ${errors} errors occurred.`
      });
        
      return { initialized, errors };
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
      // Since the engine doesn't have a statistics method, create basic stats from results
      const statistics: ActualStatisticsResult = {
        totalCalculations: state.results.length,
        averageRiskScore: state.results.length > 0 
          ? state.results.reduce((sum, r) => sum + r.riskScore, 0) / state.results.length 
          : 0,
        riskDistribution: {
          LOW: state.results.filter(r => r.riskScore <= 25).length,
          MEDIUM: state.results.filter(r => r.riskScore > 25 && r.riskScore <= 50).length,
          HIGH: state.results.filter(r => r.riskScore > 50 && r.riskScore <= 75).length,
          CRITICAL: state.results.filter(r => r.riskScore > 75).length,
        },
        trends: {
          dailyCalculations: [],
          riskLevelTrends: {
            LOW: [],
            MEDIUM: [],
            HIGH: [],
            CRITICAL: []
          }
        }
      };
      
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
  }, [state.results]);

  // Get risk level distribution
  const getRiskDistribution = useCallback(() => {
    const distribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    state.results.forEach(result => {
      // Map riskTier to RiskLevel (AlertSeverity)
      let level: RiskLevel;
      switch (result.riskTier) {
        case 'Prime':
        case 'Investment Grade':
          level = 'LOW';
          break;
        case 'Speculative':
          level = 'MEDIUM';
          break;
        case 'High Risk':
          level = 'HIGH';
          break;
        case 'Default Risk':
          level = 'CRITICAL';
          break;
        default:
          level = 'MEDIUM';
      }
      
      if (level in distribution) {
        distribution[level]++;
      }
    });
    
    return distribution;
  }, [state.results]);

  // Get high-priority alerts
  const getHighPriorityAlerts = useCallback(() => {
    return state.alerts.filter(alert => 
      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
    );
  }, [state.alerts]);

  // Get recent risk changes
  const getRecentRiskChanges = useCallback(() => {
    return state.results
      .filter(result => result.riskScore > 60) // High risk threshold
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
      ? state.results.reduce((sum, r) => sum + r.riskScore, 0) / state.results.length 
      : 0,
    highRiskCount: state.results.filter(r => 
      r.riskScore > 60 // Using risk score > 60 as high risk threshold
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
      
      const result = await EnhancedRiskCalculationEngine
        .calculateEnhancedRisk({
          receivableId,
          payerId: '',
          assetId: '',
          amount: 0,
          dueDate: ''
        }, forceRecalculation);
      
      if (result.success && result.data) {
        setRiskResult(result.data);
      } else {
        throw new Error(result.error || 'Risk calculation failed');
      }
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
    hasHighRisk: riskResult?.riskScore ? riskResult.riskScore > 60 : false,
    riskScore: riskResult?.riskScore || 0,
    discountRate: riskResult?.discountRate || 0,
    confidence: riskResult?.confidenceLevel || 0
  };
}
