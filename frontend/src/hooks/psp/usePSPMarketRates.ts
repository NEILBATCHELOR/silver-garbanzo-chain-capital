/**
 * PSP Market Rates Hook
 * Real-time market rate fetching from CoinGecko
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface MarketRate {
  asset: string;
  symbol: string;
  usdPrice: number;
  lastUpdated: string;
}

export interface MarketRatesResponse {
  success: boolean;
  rates: MarketRate[];
  timestamp: string;
}

interface UsePSPMarketRatesOptions {
  assets: string[];
  vsCurrency?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function usePSPMarketRates({
  assets,
  vsCurrency = 'usd',
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds default
}: UsePSPMarketRatesOptions) {
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRates = async () => {
    if (!assets || assets.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const assetsParam = assets.join(',');
      const response = await fetch(
        `/api/psp/market-rates?assets=${assetsParam}&vsCurrency=${vsCurrency}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch market rates: ${response.statusText}`);
      }

      const data: MarketRatesResponse = await response.json();

      if (data.success) {
        setRates(data.rates);
        setLastUpdated(data.timestamp);
      } else {
        throw new Error('Failed to fetch market rates');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: 'Error',
        description: `Failed to fetch market rates: ${message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRates();
  }, [assets.join(','), vsCurrency]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRates();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, assets.join(','), vsCurrency]);

  return {
    rates,
    loading,
    error,
    lastUpdated,
    refresh: fetchRates,
  };
}
