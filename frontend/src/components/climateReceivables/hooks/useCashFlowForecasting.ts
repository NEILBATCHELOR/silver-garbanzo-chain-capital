/**
 * Cash Flow Forecasting Hook
 * 
 * React hook for integrating cash flow forecasting services with frontend components.
 * Provides comprehensive financial projections, scenario analysis, and forecast monitoring.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/infrastructure/database/client';
import type { 
  ClimateCashFlowProjectionTable,
  ClimateCashFlowProjectionInsert 
} from '../services/business-logic/enhanced-types';

interface CashFlowProjection {
  id: string;
  receivableId: string;
  projectionDate: string;
  projectedAmount: number;
  confidenceLevel: number;
  scenarioType: 'base' | 'optimistic' | 'pessimistic';
  factors: string[];
  createdAt: string;
}

interface CashFlowForecast {
  receivableId: string;
  totalProjected: number;
  monthlyProjections: {
    month: string;
    amount: number;
    confidence: number;
  }[];
  scenarios: {
    base: number;
    optimistic: number;
    pessimistic: number;
  };
  riskFactors: string[];
  lastUpdated: string;
}

interface UseCashFlowForecastingProps {
  receivableIds?: string[];
  forecastPeriod?: number; // months
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface CashFlowState {
  projections: CashFlowProjection[];
  forecasts: CashFlowForecast[];
  loading: boolean;
  calculating: boolean;
  error: string | null;
  lastUpdate: string | null;
}

/**
 * Hook for Cash Flow Forecasting
 */
export function useCashFlowForecasting({
  receivableIds = [],
  forecastPeriod = 12,
  autoRefresh = false,
  refreshInterval = 600000 // 10 minutes default
}: UseCashFlowForecastingProps = {}) {
  const { toast } = useToast();
  
  const [state, setState] = useState<CashFlowState>({
    projections: [],
    forecasts: [],
    loading: false,
    calculating: false,
    error: null,
    lastUpdate: null
  });

  // Fetch existing cash flow projections
  const fetchProjections = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      let query = supabase
        .from('climate_cash_flow_projections')
        .select('*')
        .order('projection_date', { ascending: true });
      
      if (receivableIds.length > 0) {
        query = query.in('receivable_id', receivableIds);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const projections: CashFlowProjection[] = (data || []).map(item => ({
        id: item.id,
        receivableId: item.receivable_id,
        projectionDate: item.projection_date,
        projectedAmount: item.projected_amount,
        confidenceLevel: item.confidence_level || 0.8,
        scenarioType: (item.scenario_type as any) || 'base',
        factors: Array.isArray(item.risk_factors) ? item.risk_factors : [],
        createdAt: item.created_at || new Date().toISOString()
      }));
      
      setState(prev => ({
        ...prev,
        projections,
        lastUpdate: new Date().toISOString()
      }));
      
      return projections;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      console.error('Failed to fetch cash flow projections:', error);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [receivableIds]);

  // Generate cash flow forecast for specific receivables
  const generateForecast = useCallback(async (
    targetReceivableIds: string[] = receivableIds,
    periods: number = forecastPeriod
  ) => {
    try {
      setState(prev => ({ ...prev, calculating: true, error: null }));
      
      // Fetch receivables data for forecasting
      let receivablesQuery = supabase
        .from('climate_receivables')
        .select(`
          *,
          asset:energy_assets(*),
          payer:climate_payers(*),
          risk_calculations:climate_risk_calculations(*)
        `);
      
      if (targetReceivableIds.length > 0) {
        receivablesQuery = receivablesQuery.in('id', targetReceivableIds);
      }
      
      const { data: receivables, error: receivablesError } = await receivablesQuery;
      
      if (receivablesError) throw receivablesError;
      
      const forecasts: CashFlowForecast[] = [];
      
      for (const receivable of receivables || []) {
        // Calculate base scenario projections
        const monthlyProjections = [];
        const baseAmount = receivable.amount || 0;
        const riskScore = receivable.risk_score || 50;
        const discountRate = receivable.discount_rate || 0.05;
        
        // Generate monthly projections with seasonal and risk adjustments
        for (let month = 0; month < periods; month++) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() + month);
          
          // Apply seasonal adjustments (simplified model)
          const seasonalFactor = 1 + 0.1 * Math.sin((monthDate.getMonth() / 12) * 2 * Math.PI);
          
          // Apply risk-based adjustments
          const riskAdjustment = 1 - (riskScore / 100) * 0.3;
          
          // Calculate projected amount
          const projectedAmount = baseAmount * seasonalFactor * riskAdjustment * 
            Math.pow(1 - discountRate / 12, month);
          
          // Calculate confidence based on forecast horizon
          const confidence = Math.max(0.5, 0.95 - (month * 0.05));
          
          monthlyProjections.push({
            month: monthDate.toISOString().slice(0, 7), // YYYY-MM format
            amount: Math.round(projectedAmount * 100) / 100,
            confidence: Math.round(confidence * 100) / 100
          });
        }
        
        // Calculate scenario totals
        const baseTotal = monthlyProjections.reduce((sum, p) => sum + p.amount, 0);
        const optimisticTotal = baseTotal * 1.2; // 20% upside
        const pessimisticTotal = baseTotal * 0.7; // 30% downside
        
        // Determine risk factors
        const riskFactors = [];
        if (riskScore > 70) riskFactors.push('High risk score');
        if (discountRate > 0.1) riskFactors.push('High discount rate');
        if (!receivable.asset) riskFactors.push('Missing asset data');
        if (!receivable.payer) riskFactors.push('Missing payer data');
        
        const forecast: CashFlowForecast = {
          receivableId: receivable.id,
          totalProjected: Math.round(baseTotal * 100) / 100,
          monthlyProjections,
          scenarios: {
            base: Math.round(baseTotal * 100) / 100,
            optimistic: Math.round(optimisticTotal * 100) / 100,
            pessimistic: Math.round(pessimisticTotal * 100) / 100
          },
          riskFactors,
          lastUpdated: new Date().toISOString()
        };
        
        forecasts.push(forecast);
        
        // Store projections in database
        const projectionInserts: ClimateCashFlowProjectionInsert[] = monthlyProjections.map(proj => ({
          entity_id: receivable.id,
          projection_date: proj.month + '-01', // First day of month
          projected_amount: proj.amount,
          source_type: 'forecast'
        }));
        
        // Delete existing projections for this receivable
        await supabase
          .from('climate_cash_flow_projections')
          .delete()
          .eq('receivable_id', receivable.id);
        
        // Insert new projections
        const { error: insertError } = await supabase
          .from('climate_cash_flow_projections')
          .insert(projectionInserts);
        
        if (insertError) {
          console.error('Failed to save cash flow projections:', insertError);
        }
      }
      
      setState(prev => ({
        ...prev,
        forecasts,
        lastUpdate: new Date().toISOString()
      }));
      
      toast({
        title: "Cash Flow Forecast Generated",
        description: `Generated forecasts for ${forecasts.length} receivables over ${periods} months.`
      });
      
      // Refresh projections to get saved data
      await fetchProjections();
      
      return forecasts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Forecast Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return [];
    } finally {
      setState(prev => ({ ...prev, calculating: false }));
    }
  }, [receivableIds, forecastPeriod, fetchProjections, toast]);

  // Get aggregated portfolio forecast
  const getPortfolioForecast = useCallback(() => {
    if (state.forecasts.length === 0) return null;
    
    const totalBase = state.forecasts.reduce((sum, f) => sum + f.scenarios.base, 0);
    const totalOptimistic = state.forecasts.reduce((sum, f) => sum + f.scenarios.optimistic, 0);
    const totalPessimistic = state.forecasts.reduce((sum, f) => sum + f.scenarios.pessimistic, 0);
    
    // Aggregate monthly projections
    const monthlyAggregates: { [month: string]: { amount: number; confidence: number; count: number } } = {};
    
    state.forecasts.forEach(forecast => {
      forecast.monthlyProjections.forEach(proj => {
        if (!monthlyAggregates[proj.month]) {
          monthlyAggregates[proj.month] = { amount: 0, confidence: 0, count: 0 };
        }
        monthlyAggregates[proj.month].amount += proj.amount;
        monthlyAggregates[proj.month].confidence += proj.confidence;
        monthlyAggregates[proj.month].count += 1;
      });
    });
    
    const monthlyProjections = Object.entries(monthlyAggregates)
      .map(([month, data]) => ({
        month,
        amount: Math.round(data.amount * 100) / 100,
        confidence: Math.round((data.confidence / data.count) * 100) / 100
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Aggregate risk factors
    const allRiskFactors = state.forecasts.flatMap(f => f.riskFactors);
    const riskFactorCounts = allRiskFactors.reduce((acc, factor) => {
      acc[factor] = (acc[factor] || 0) + 1;
      return acc;
    }, {} as { [factor: string]: number });
    
    const topRiskFactors = Object.entries(riskFactorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([factor, count]) => `${factor} (${count})`);
    
    return {
      totalProjected: Math.round(totalBase * 100) / 100,
      monthlyProjections,
      scenarios: {
        base: Math.round(totalBase * 100) / 100,
        optimistic: Math.round(totalOptimistic * 100) / 100,
        pessimistic: Math.round(totalPessimistic * 100) / 100
      },
      riskFactors: topRiskFactors,
      receivableCount: state.forecasts.length,
      lastUpdated: state.lastUpdate
    };
  }, [state.forecasts, state.lastUpdate]);

  // Get forecast accuracy metrics
  const getForecastAccuracy = useCallback(() => {
    // This would compare historical projections with actual results
    // For now, return placeholder metrics
    return {
      meanAbsoluteError: 5.2, // percentage
      r2Score: 0.85,
      biasMetric: 2.1, // percentage
      lastEvaluated: state.lastUpdate
    };
  }, [state.lastUpdate]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial data load
  useEffect(() => {
    fetchProjections();
  }, [fetchProjections]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchProjections();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchProjections]);

  return {
    // State
    projections: state.projections,
    forecasts: state.forecasts,
    loading: state.loading,
    calculating: state.calculating,
    error: state.error,
    lastUpdate: state.lastUpdate,
    
    // Actions
    fetchProjections,
    generateForecast,
    clearError,
    
    // Computed values
    getPortfolioForecast,
    getForecastAccuracy,
    
    // Helper values
    totalReceivables: state.forecasts.length,
    totalProjectedValue: state.forecasts.reduce((sum, f) => sum + f.totalProjected, 0),
    averageConfidence: state.forecasts.length > 0
      ? state.forecasts.reduce((sum, f) => 
          sum + f.monthlyProjections.reduce((mSum, m) => mSum + m.confidence, 0) / f.monthlyProjections.length
        , 0) / state.forecasts.length
      : 0
  };
}

/**
 * Hook for monitoring a specific receivable's cash flow forecast
 */
export function useReceivableCashFlowMonitor(receivableId: string) {
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshForecast = useCallback(async () => {
    if (!receivableId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: projections, error: projectionsError } = await supabase
        .from('climate_cash_flow_projections')
        .select('*')
        .eq('receivable_id', receivableId)
        .order('projection_date', { ascending: true });
      
      if (projectionsError) throw projectionsError;
      
      if (projections && projections.length > 0) {
        // Build forecast from projections
        const monthlyProjections = projections.map(p => ({
          month: p.projection_date.slice(0, 7), // YYYY-MM
          amount: p.projected_amount,
          confidence: p.confidence_level || 0.8
        }));
        
        const totalProjected = projections.reduce((sum, p) => sum + p.projected_amount, 0);
        const riskFactors = Array.isArray(projections[0].risk_factors) ? projections[0].risk_factors : [];
        
        const forecastData: CashFlowForecast = {
          receivableId,
          totalProjected: Math.round(totalProjected * 100) / 100,
          monthlyProjections,
          scenarios: {
            base: Math.round(totalProjected * 100) / 100,
            optimistic: Math.round(totalProjected * 1.2 * 100) / 100,
            pessimistic: Math.round(totalProjected * 0.7 * 100) / 100
          },
          riskFactors,
          lastUpdated: projections[0].created_at || new Date().toISOString()
        };
        
        setForecast(forecastData);
      } else {
        setForecast(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch receivable cash flow forecast:', err);
    } finally {
      setLoading(false);
    }
  }, [receivableId]);

  useEffect(() => {
    refreshForecast();
  }, [refreshForecast]);

  return {
    forecast,
    loading,
    error,
    refreshForecast,
    hasForecast: forecast !== null,
    totalProjected: forecast?.totalProjected || 0,
    monthlyAverage: forecast 
      ? forecast.totalProjected / forecast.monthlyProjections.length 
      : 0,
    riskLevel: forecast?.riskFactors.length || 0 > 2 ? 'high' : 'low'
  };
}
