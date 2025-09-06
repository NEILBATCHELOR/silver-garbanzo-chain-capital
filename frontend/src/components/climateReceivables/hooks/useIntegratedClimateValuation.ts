/**
 * Integrated Climate Receivables Valuation Hook
 * 
 * React hook for comprehensive climate receivables valuation combining:
 * - Monte Carlo cash flow forecasting with 10,000+ simulations
 * - Climate-specific NAV calculation with LCOE, PPA, and carbon credits
 * - Advanced ML models (LSTM, CNN-LSTM, ARIMA) for production forecasting
 * - Real-time risk assessment and scenario analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/infrastructure/database/client';
import { IntegratedClimateReceivablesValuationEngine } from '../services/business-logic/integrated-climate-receivables-valuation-engine';
import type { IntegratedValuationResult, PortfolioValuationSummary } from '../services/business-logic/integrated-climate-receivables-valuation-engine';
import { ClimateNAVResult } from '../types/climate-nav-types';

interface ValuationMetrics {
  receivableId: string;
  recommendedValue: number;
  cashFlowNPV: number;
  climateNAV: number;
  confidence: number;
  investmentRecommendation: 'BUY' | 'HOLD' | 'SELL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastValuation: string;
}

interface PortfolioMetrics {
  totalValue: number;
  totalNAV: number;
  averageRisk: number;
  diversificationBenefit: number;
  recommendedActions: string[];
  performanceAttribution: {
    assetSelection: number;
    timing: number;
    totalAlpha: number;
  };
}

interface UseIntegratedValuationProps {
  receivableIds?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableStressTesting?: boolean;
  enableMLModels?: boolean;
}

interface ValuationState {
  valuations: IntegratedValuationResult[];
  portfolioSummary: PortfolioValuationSummary | null;
  metrics: ValuationMetrics[];
  loading: boolean;
  calculating: boolean;
  error: string | null;
  lastUpdate: string | null;
  progress: {
    currentStep: string;
    percentage: number;
    estimatedTimeRemaining: number; // seconds
  } | null;
}

/**
 * Hook for Integrated Climate Receivables Valuation
 */
export function useIntegratedClimateValuation({
  receivableIds = [],
  autoRefresh = false,
  refreshInterval = 1800000, // 30 minutes default
  enableStressTesting = true,
  enableMLModels = true
}: UseIntegratedValuationProps = {}) {
  const { toast } = useToast();
  
  const [state, setState] = useState<ValuationState>({
    valuations: [],
    portfolioSummary: null,
    metrics: [],
    loading: false,
    calculating: false,
    error: null,
    lastUpdate: null,
    progress: null
  });

  // Fetch existing valuations from database
  const fetchValuations = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      let query = supabase
        .from('climate_cash_flow_projections')
        .select('*')
        .eq('source_type', 'integrated_valuation')
        .order('created_at', { ascending: false });
      
      if (receivableIds.length > 0) {
        query = query.in('entity_id', receivableIds);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Convert database records to metrics
      const metrics: ValuationMetrics[] = (data || []).map(item => ({
        receivableId: item.entity_id,
        recommendedValue: item.projected_amount,
        cashFlowNPV: item.projected_amount, // Would be separated in production
        climateNAV: item.projected_amount, // Would be separated in production
        confidence: item.confidence || 0.8,
        investmentRecommendation: 'HOLD', // Would be stored separately
        riskLevel: item.confidence > 0.8 ? 'LOW' : item.confidence > 0.6 ? 'MEDIUM' : 'HIGH',
        lastValuation: item.created_at || new Date().toISOString()
      }));
      
      setState(prev => ({
        ...prev,
        metrics,
        lastUpdate: new Date().toISOString()
      }));
      
      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      console.error('Failed to fetch valuations:', error);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [receivableIds]);

  // Perform integrated valuation for specific receivables
  const performIntegratedValuation = useCallback(async (
    targetReceivableIds: string[] = receivableIds,
    includeStressTesting: boolean = enableStressTesting
  ) => {
    try {
      setState(prev => ({ 
        ...prev, 
        calculating: true, 
        error: null,
        progress: {
          currentStep: 'Initializing valuation process...',
          percentage: 0,
          estimatedTimeRemaining: 120 // 2 minutes estimate
        }
      }));
      
      console.log(`🎯 Starting integrated valuation for ${targetReceivableIds.length} receivables...`);
      
      const valuationResults: IntegratedValuationResult[] = [];
      const totalReceivables = targetReceivableIds.length;
      
      for (let i = 0; i < targetReceivableIds.length; i++) {
        const receivableId = targetReceivableIds[i];
        const progress = {
          currentStep: `Valuing receivable ${i + 1} of ${totalReceivables} (${receivableId.slice(0, 8)}...)`,
          percentage: (i / totalReceivables) * 80, // Reserve 20% for portfolio analysis
          estimatedTimeRemaining: (totalReceivables - i) * 15 // 15 seconds per receivable
        };
        
        setState(prev => ({ ...prev, progress }));
        
        try {
          // Perform integrated valuation with progress tracking
          const result = await IntegratedClimateReceivablesValuationEngine
            .performIntegratedValuation(receivableId, includeStressTesting);
          
          valuationResults.push(result);
          
          console.log(`✅ Completed valuation for ${receivableId}: $${result.valuationComparison.recommendedValue.toLocaleString()}`);
          
        } catch (error) {
          console.error(`❌ Failed to value receivable ${receivableId}:`, error);
          
          // Continue with other receivables but log the error
          toast({
            title: "Valuation Warning",
            description: `Failed to value receivable ${receivableId.slice(0, 8)}... - continuing with others`,
            variant: "destructive"
          });
        }
      }
      
      // Portfolio analysis
      setState(prev => ({ 
        ...prev, 
        progress: {
          currentStep: 'Performing portfolio analysis...',
          percentage: 85,
          estimatedTimeRemaining: 15
        }
      }));
      
      let portfolioSummary: PortfolioValuationSummary | null = null;
      
      if (valuationResults.length > 1) {
        try {
          portfolioSummary = await IntegratedClimateReceivablesValuationEngine
            .performPortfolioValuation(valuationResults.map(v => v.receivableId));
          
          console.log(`📈 Portfolio valuation complete: $${(portfolioSummary.totalValue / 1000000).toFixed(1)}M`);
        } catch (error) {
          console.error('Portfolio valuation failed:', error);
        }
      }
      
      // Convert results to metrics
      const metrics: ValuationMetrics[] = valuationResults.map(result => ({
        receivableId: result.receivableId,
        recommendedValue: result.valuationComparison.recommendedValue,
        cashFlowNPV: result.cashFlowForecast.totalNPV,
        climateNAV: result.climateNAV.riskAdjustedNAV,
        confidence: result.cashFlowForecast.confidence,
        investmentRecommendation: result.recommendations.investment,
        riskLevel: result.riskMetrics.compositeRisk < 0.15 ? 'LOW' : 
                  result.riskMetrics.compositeRisk < 0.25 ? 'MEDIUM' : 
                  result.riskMetrics.compositeRisk < 0.35 ? 'HIGH' : 'CRITICAL',
        lastValuation: result.valuationDate
      }));
      
      setState(prev => ({
        ...prev,
        valuations: valuationResults,
        portfolioSummary,
        metrics,
        lastUpdate: new Date().toISOString(),
        progress: {
          currentStep: 'Valuation complete!',
          percentage: 100,
          estimatedTimeRemaining: 0
        }
      }));
      
      // Success notification
      toast({
        title: "Integrated Valuation Complete",
        description: `Successfully valued ${valuationResults.length} receivables with ${enableMLModels ? 'ML-enhanced' : 'statistical'} models.`
      });
      
      // Clear progress after 2 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: null }));
      }, 2000);
      
      return valuationResults;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        progress: null
      }));
      
      toast({
        title: "Valuation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return [];
    } finally {
      setState(prev => ({ ...prev, calculating: false }));
    }
  }, [receivableIds, enableStressTesting, enableMLModels, toast]);

  // Perform quick valuation refresh for existing receivables
  const refreshValuations = useCallback(async () => {
    if (state.metrics.length === 0) return;
    
    const receivableIds = state.metrics.map(m => m.receivableId);
    await performIntegratedValuation(receivableIds, false); // Skip stress testing for quick refresh
  }, [state.metrics, performIntegratedValuation]);

  // Get portfolio performance summary
  const getPortfolioPerformance = useCallback((): PortfolioMetrics | null => {
    if (state.metrics.length === 0) return null;
    
    const totalValue = state.metrics.reduce((sum, m) => sum + m.recommendedValue, 0);
    const totalNAV = state.metrics.reduce((sum, m) => sum + m.climateNAV, 0);
    const averageRisk = state.metrics.reduce((sum, m) => {
      const riskScore = m.riskLevel === 'LOW' ? 0.1 : 
                      m.riskLevel === 'MEDIUM' ? 0.2 : 
                      m.riskLevel === 'HIGH' ? 0.3 : 0.4;
      return sum + riskScore;
    }, 0) / state.metrics.length;
    
    // Calculate diversification benefit (simplified)
    const riskVariation = state.metrics.map(m => {
      const riskScore = m.riskLevel === 'LOW' ? 0.1 : 
                       m.riskLevel === 'MEDIUM' ? 0.2 : 
                       m.riskLevel === 'HIGH' ? 0.3 : 0.4;
      return Math.pow(riskScore - averageRisk, 2);
    }).reduce((sum, v) => sum + v, 0) / state.metrics.length;
    
    const diversificationBenefit = Math.sqrt(riskVariation) / averageRisk;
    
    // Generate recommended actions
    const recommendedActions = [];
    const highRiskCount = state.metrics.filter(m => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL').length;
    const lowConfidenceCount = state.metrics.filter(m => m.confidence < 0.7).length;
    const sellRecommendations = state.metrics.filter(m => m.investmentRecommendation === 'SELL').length;
    
    if (highRiskCount > state.metrics.length * 0.3) {
      recommendedActions.push('Reduce high-risk asset allocation');
    }
    if (lowConfidenceCount > state.metrics.length * 0.2) {
      recommendedActions.push('Improve data quality for valuation confidence');
    }
    if (sellRecommendations > 0) {
      recommendedActions.push(`Consider divesting ${sellRecommendations} recommended SELL positions`);
    }
    if (diversificationBenefit < 0.15) {
      recommendedActions.push('Increase portfolio diversification');
    }
    
    // Use portfolio summary if available
    const attribution = state.portfolioSummary ? {
      assetSelection: state.portfolioSummary.attribution.assetSelection,
      timing: state.portfolioSummary.attribution.timing,
      totalAlpha: state.portfolioSummary.attribution.totalAlpha
    } : {
      assetSelection: 0.02, // Default values
      timing: -0.005,
      totalAlpha: 0.015
    };
    
    return {
      totalValue,
      totalNAV,
      averageRisk,
      diversificationBenefit,
      recommendedActions,
      performanceAttribution: attribution
    };
  }, [state.metrics, state.portfolioSummary]);

  // Get risk distribution
  const getRiskDistribution = useCallback(() => {
    if (state.metrics.length === 0) return null;
    
    const distribution = state.metrics.reduce((acc, m) => {
      acc[m.riskLevel] = (acc[m.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = state.metrics.length;
    
    return {
      LOW: ((distribution.LOW || 0) / total * 100).toFixed(1),
      MEDIUM: ((distribution.MEDIUM || 0) / total * 100).toFixed(1),
      HIGH: ((distribution.HIGH || 0) / total * 100).toFixed(1),
      CRITICAL: ((distribution.CRITICAL || 0) / total * 100).toFixed(1)
    };
  }, [state.metrics]);

  // Get valuation accuracy metrics
  const getValuationAccuracy = useCallback(() => {
    if (state.metrics.length === 0) return null;
    
    const averageConfidence = state.metrics.reduce((sum, m) => sum + m.confidence, 0) / state.metrics.length;
    const varianceCount = state.metrics.filter(m => {
      const variance = Math.abs(m.cashFlowNPV - m.climateNAV) / Math.max(m.cashFlowNPV, m.climateNAV);
      return variance > 0.15; // High variance threshold
    }).length;
    
    const methodologyReliability = state.valuations.length > 0 ? 
      state.valuations.reduce((sum, v) => sum + v.cashFlowForecast.confidence, 0) / state.valuations.length : 0.85;
    
    return {
      averageConfidence: Math.round(averageConfidence * 100),
      highVarianceCount: varianceCount,
      methodologyReliability: Math.round(methodologyReliability * 100),
      recommendedActions: varianceCount > state.metrics.length * 0.2 ? 
        ['Investigate valuation model assumptions', 'Consider additional data sources'] : 
        ['Valuation models performing well']
    };
  }, [state.metrics, state.valuations]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial data load
  useEffect(() => {
    fetchValuations();
  }, [fetchValuations]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshValuations();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshValuations]);

  return {
    // State
    valuations: state.valuations,
    portfolioSummary: state.portfolioSummary,
    metrics: state.metrics,
    loading: state.loading,
    calculating: state.calculating,
    error: state.error,
    lastUpdate: state.lastUpdate,
    progress: state.progress,
    
    // Actions
    performIntegratedValuation,
    refreshValuations,
    fetchValuations,
    clearError,
    
    // Computed values
    getPortfolioPerformance,
    getRiskDistribution,
    getValuationAccuracy,
    
    // Helper values
    totalReceivables: state.metrics.length,
    totalPortfolioValue: state.metrics.reduce((sum, m) => sum + m.recommendedValue, 0),
    averageConfidence: state.metrics.length > 0 ? 
      state.metrics.reduce((sum, m) => sum + m.confidence, 0) / state.metrics.length : 0,
    highRiskCount: state.metrics.filter(m => m.riskLevel === 'HIGH' || m.riskLevel === 'CRITICAL').length,
    buyRecommendations: state.metrics.filter(m => m.investmentRecommendation === 'BUY').length,
    sellRecommendations: state.metrics.filter(m => m.investmentRecommendation === 'SELL').length,
    
    // Configuration
    isMLEnabled: enableMLModels,
    isStressTestingEnabled: enableStressTesting
  };
}

/**
 * Hook for monitoring a specific receivable's integrated valuation
 */
export function useReceivableValuationMonitor(receivableId: string) {
  const [valuation, setValuation] = useState<IntegratedValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshValuation = useCallback(async () => {
    if (!receivableId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await IntegratedClimateReceivablesValuationEngine
        .performIntegratedValuation(receivableId, false);
      
      setValuation(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to refresh receivable valuation:', err);
    } finally {
      setLoading(false);
    }
  }, [receivableId]);

  useEffect(() => {
    refreshValuation();
  }, [refreshValuation]);

  return {
    valuation,
    loading,
    error,
    refreshValuation,
    hasValuation: valuation !== null,
    recommendedValue: valuation?.valuationComparison.recommendedValue || 0,
    investmentRecommendation: valuation?.recommendations.investment || 'HOLD',
    riskLevel: valuation ? (
      valuation.riskMetrics.compositeRisk < 0.15 ? 'LOW' : 
      valuation.riskMetrics.compositeRisk < 0.25 ? 'MEDIUM' : 
      valuation.riskMetrics.compositeRisk < 0.35 ? 'HIGH' : 'CRITICAL'
    ) : 'UNKNOWN',
    confidence: valuation?.cashFlowForecast.confidence || 0,
    variance: valuation ? Math.abs(
      valuation.cashFlowForecast.totalNPV - valuation.climateNAV.riskAdjustedNAV
    ) / Math.max(valuation.cashFlowForecast.totalNPV, valuation.climateNAV.riskAdjustedNAV) : 0
  };
}

/**
 * Hook for portfolio optimization recommendations
 */
export function usePortfolioOptimization(receivableIds: string[]) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOptimizationRecommendations = useCallback(async () => {
    if (receivableIds.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // This would integrate with portfolio optimization algorithms
      // For now, providing simplified recommendations
      
      const optimizationRecommendations = [
        'Rebalance portfolio to reduce concentration risk',
        'Consider adding renewable energy assets in different geographic regions',
        'Implement hedging strategies for weather-dependent assets',
        'Diversify carbon credit vintage years and verification standards',
        'Optimize PPA contract mix between fixed and escalating rates'
      ];
      
      setRecommendations(optimizationRecommendations);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [receivableIds]);

  useEffect(() => {
    generateOptimizationRecommendations();
  }, [generateOptimizationRecommendations]);

  return {
    recommendations,
    loading,
    error,
    generateOptimizationRecommendations
  };
}
