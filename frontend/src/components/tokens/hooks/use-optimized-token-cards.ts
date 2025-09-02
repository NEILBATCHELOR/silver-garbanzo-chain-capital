/**
 * useOptimizedTokenCards Hook
 * 
 * High-performance React hook for token card display
 * Uses minimal queries and progressive loading
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  TokenCardData,
  getTokenCardsForProject,
  getTokenStatusCounts
} from '../services/token-card-service';

interface UseOptimizedTokenCardsResult {
  tokens: TokenCardData[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  statusCounts: Record<string, number>;
}

export function useOptimizedTokenCards(projectId?: string): UseOptimizedTokenCardsResult {
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fast fetch for token cards - minimal data only
  const fetchTokenCards = useCallback(async () => {
    // Enhanced validation to prevent "undefined" string and invalid UUIDs
    if (!projectId || projectId === 'undefined' || projectId.trim() === '') {
      console.log(`[useOptimizedTokenCards] No valid projectId provided: ${projectId}`);
      setTokens([]);
      setStatusCounts({});
      return;
    }
    
    // Additional UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.warn(`[useOptimizedTokenCards] ProjectId is not a valid UUID format: ${projectId}`);
      setTokens([]);
      setStatusCounts({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[useOptimizedTokenCards] Starting fast fetch for project: ${projectId}`);
      
      // Fetch cards and status counts in parallel for maximum performance
      const [cardsData, countsData] = await Promise.all([
        getTokenCardsForProject(projectId),
        getTokenStatusCounts(projectId)
      ]);

      console.log(`[useOptimizedTokenCards] Successfully fetched ${cardsData.length} token cards`);
      
      setTokens(cardsData);
      setStatusCounts(countsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch token cards');
      setError(error);
      console.error('[useOptimizedTokenCards] Error fetching token cards:', error);
      setTokens([]);
      setStatusCounts({});
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Effect to fetch cards when projectId changes
  useEffect(() => {
    fetchTokenCards();
  }, [fetchTokenCards]);

  const refetch = useCallback(async () => {
    await fetchTokenCards();
  }, [fetchTokenCards]);

  return {
    tokens,
    loading,
    error,
    refetch,
    statusCounts
  };
}

export default useOptimizedTokenCards;
