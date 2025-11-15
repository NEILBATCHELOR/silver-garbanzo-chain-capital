/**
 * React hooks for Exchange Rate & Valuation services
 * 
 * Provides hooks for accessing exchange rates, valuations, and price history
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExchangeRateService,
  ValuationOracle,
  PriceHistoryTracker,
  ExchangeRate,
  Currency,
  GetExchangeRateRequest,
  TokenExchangeConfig,
  CreateExchangeConfigRequest,
  ExchangeRateServiceConfig,
  TokenValuation,
  ValuationHistory
} from './index';

/**
 * Get Supabase configuration from environment
 */
function getSupabaseConfig(): Pick<ExchangeRateServiceConfig, 'supabaseUrl' | 'supabaseKey'> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return { supabaseUrl, supabaseKey };
}

// ============================================================================
// Exchange Rate Hooks
// ============================================================================

/**
 * Hook for managing exchange rate service
 */
export function useExchangeRateService() {
  const service = useMemo(() => {
    const config = getSupabaseConfig();
    return new ExchangeRateService({
      ...config,
      logLevel: 'error'
    });
  }, []);
  
  useEffect(() => {
    return () => {
      // Cleanup: stop all scheduled updates
      service.stopAllUpdates();
    };
  }, [service]);
  
  return service;
}

/**
 * Hook for getting exchange rate
 */
export function useExchangeRate(
  tokenId: string | undefined,
  currency: Currency = Currency.USDC
) {
  const service = useExchangeRateService();
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cached, setCached] = useState(false);
  const [age, setAge] = useState(0);
  
  const fetchRate = useCallback(async () => {
    if (!tokenId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const request: GetExchangeRateRequest = {
        tokenId,
        currency
      };
      
      const response = await service.getExchangeRate(request);
      
      setExchangeRate(response.rate);
      setCached(response.cached);
      setAge(response.age);
    } catch (err) {
      setError(err as Error);
      setExchangeRate(null);
    } finally {
      setLoading(false);
    }
  }, [service, tokenId, currency]);
  
  useEffect(() => {
    fetchRate();
  }, [fetchRate]);
  
  const refresh = useCallback(() => {
    return fetchRate();
  }, [fetchRate]);
  
  return {
    exchangeRate,
    loading,
    error,
    cached,
    age,
    refresh
  };
}

/**
 * Hook for configuring exchange rate
 */
export function useConfigureExchangeRate() {
  const service = useExchangeRateService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const configure = useCallback(async (
    request: CreateExchangeConfigRequest
  ): Promise<TokenExchangeConfig | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const config = await service.configureExchangeRate(request);
      return config;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [service]);
  
  return {
    configure,
    loading,
    error
  };
}

/**
 * Hook for getting cache statistics
 */
export function useCacheStatistics() {
  const service = useExchangeRateService();
  const [statistics, setStatistics] = useState(service.getCacheStatistics());
  
  const refresh = useCallback(() => {
    setStatistics(service.getCacheStatistics());
  }, [service]);
  
  useEffect(() => {
    // Refresh statistics every 10 seconds
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);
  
  return {
    statistics,
    refresh,
    clearCache: () => service.clearCache()
  };
}

// ============================================================================
// Valuation Oracle Hooks
// ============================================================================

/**
 * Hook for managing valuation oracle service
 */
export function useValuationOracle() {
  const oracle = useMemo(() => {
    const config = getSupabaseConfig();
    return new ValuationOracle({
      ...config,
      logLevel: 'error'
    });
  }, []);

  return oracle;
}

/**
 * Hook for valuation oracle
 */
export function useValuation(tokenId: string | undefined) {
  const oracle = useValuationOracle();
  const [valuation, setValuation] = useState<TokenValuation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchValuation = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await oracle.getValuation(tokenId);
      setValuation(result);
    } catch (err) {
      setError(err as Error);
      setValuation(null);
    } finally {
      setLoading(false);
    }
  }, [oracle, tokenId]);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  const refresh = useCallback(() => {
    return fetchValuation();
  }, [fetchValuation]);

  return {
    valuation,
    loading,
    error,
    refresh
  };
}

// ============================================================================
// Price History Hooks
// ============================================================================

/**
 * Hook for managing price history tracker service
 */
export function usePriceHistoryTracker() {
  const tracker = useMemo(() => {
    const config = getSupabaseConfig();
    return new PriceHistoryTracker({
      ...config,
      logLevel: 'error'
    });
  }, []);

  return tracker;
}

/**
 * Hook for price history
 */
export function usePriceHistory(
  tokenId: string | undefined,
  startDate: string,
  endDate: string
) {
  const tracker = usePriceHistoryTracker();
  const [history, setHistory] = useState<ValuationHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await tracker.getHistoricalValuation(tokenId, startDate, endDate);
      setHistory(result);
    } catch (err) {
      setError(err as Error);
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [tracker, tokenId, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refresh = useCallback(() => {
    return fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh
  };
}

/**
 * Hook for recent price periods (last 24 hours by default)
 */
export function useRecentPrices(
  tokenId: string | undefined,
  periodCount: number = 6
) {
  const tracker = usePriceHistoryTracker();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPeriods = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await tracker.getRecentPeriods(tokenId, periodCount);
      setPeriods(result);
    } catch (err) {
      setError(err as Error);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [tracker, tokenId, periodCount]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const refresh = useCallback(() => {
    return fetchPeriods();
  }, [fetchPeriods]);

  return {
    periods,
    loading,
    error,
    refresh
  };
}

/**
 * Hook for price trend
 */
export function usePriceTrend(
  tokenId: string | undefined,
  days: number = 7
) {
  const tracker = usePriceHistoryTracker();
  const [trend, setTrend] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrend = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await tracker.getPriceTrend(tokenId, days);
      setTrend(result);
    } catch (err) {
      setError(err as Error);
      setTrend(null);
    } finally {
      setLoading(false);
    }
  }, [tracker, tokenId, days]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  const refresh = useCallback(() => {
    return fetchTrend();
  }, [fetchTrend]);

  return {
    trend,
    loading,
    error,
    refresh
  };
}
