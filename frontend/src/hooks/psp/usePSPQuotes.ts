/**
 * PSP Trading Quotes Hook
 * Get quotes for buying/selling crypto with spreads applied
 */

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface TradingQuote {
  marketRate: number;
  spreadBps: number;
  finalRate: number;
  amount: number;
  currency: string;
  direction: 'buy' | 'sell';
  tier: string;
  timestamp: string;
}

interface GetBuyQuoteParams {
  projectId: string;
  fiatAmount: number;
  cryptoAsset: string;
  network?: string;
}

interface GetSellQuoteParams {
  projectId: string;
  cryptoAmount: number;
  cryptoAsset: string;
  network?: string;
}

export function usePSPQuotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getBuyQuote = async (params: GetBuyQuoteParams): Promise<TradingQuote | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/psp/quotes/buy-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to get buy quote: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.quote) {
        return data.quote;
      } else {
        throw new Error('Failed to get buy quote');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: 'Error',
        description: `Failed to get buy quote: ${message}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getSellQuote = async (params: GetSellQuoteParams): Promise<TradingQuote | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/psp/quotes/sell-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to get sell quote: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.quote) {
        return data.quote;
      } else {
        throw new Error('Failed to get sell quote');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: 'Error',
        description: `Failed to get sell quote: ${message}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getBuyQuote,
    getSellQuote,
  };
}
