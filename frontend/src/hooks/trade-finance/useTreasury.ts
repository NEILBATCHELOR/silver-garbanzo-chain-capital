/**
 * Treasury Hooks
 * React hooks for treasury management, fee collection, and revenue distribution
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

// ============ Types ============

interface TreasuryStats {
  totalFeesCollected: string;
  pendingDistribution: string;
  reserveBalance: string;
  activeRecipients: number;
}

interface FeeCollection {
  id: string;
  token_address: string;
  amount: string;
  fee_source: string;
  collector_address: string | null;
  transaction_hash: string | null;
  created_at: string;
}

interface RevenueDistribution {
  recipients: RevenueRecipient[];
  lastDistribution: string | null;
}

interface RevenueRecipient {
  id: string;
  recipient_address: string;
  allocation_percentage: number;
  total_distributed: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface ProtocolReserve {
  balance: string;
  target_balance: string;
  token_holdings: TokenHolding[];
  total_inflows: string;
  total_outflows: string;
}

interface TokenHolding {
  token_address: string;
  token_symbol: string | null;
  amount: string;
  usd_value: string | null;
}

// ============ Stats Hooks ============

/**
 * Hook to fetch treasury statistics
 */
export function useTreasuryStats() {
  return useQuery({
    queryKey: ['treasuryStats'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/treasury/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch treasury stats');
      }

      const result = await response.json();
      return result.data as TreasuryStats;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============ Fee Collection Hooks ============

/**
 * Hook to fetch fee collection history
 */
export function useFeeCollectionHistory(params?: {
  tokenAddress?: string;
  feeSource?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['feeCollectionHistory', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.tokenAddress) queryParams.append('token_address', params.tokenAddress);
      if (params?.feeSource) queryParams.append('fee_source', params.feeSource);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(
        `/api/trade-finance/treasury/fees/history?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch fee collection history');
      }

      const result = await response.json();
      return result.data as FeeCollection[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============ Revenue Distribution Hooks ============

/**
 * Hook to fetch revenue distribution data
 */
export function useRevenueDistribution() {
  return useQuery({
    queryKey: ['revenueDistribution'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/treasury/revenue/distribution', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue distribution');
      }

      const result = await response.json();
      return result.data as RevenueDistribution;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============ Protocol Reserve Hooks ============

/**
 * Hook to fetch protocol reserve data
 */
export function useProtocolReserve() {
  return useQuery({
    queryKey: ['protocolReserve'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/treasury/reserve', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch protocol reserve');
      }

      const result = await response.json();
      return result.data as ProtocolReserve;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============ Revenue Recipients Hooks ============

/**
 * Hook to fetch revenue recipients
 */
export function useRevenueRecipients() {
  return useQuery({
    queryKey: ['revenueRecipients'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/treasury/recipients', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue recipients');
      }

      const result = await response.json();
      return result.data as RevenueRecipient[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to add a revenue recipient
 */
export function useAddRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      recipientAddress: string;
      allocationPercentage: number;
      notes?: string;
    }) => {
      const response = await fetch('/api/trade-finance/treasury/recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_address: data.recipientAddress,
          allocation_percentage: data.allocationPercentage,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add recipient');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenueRecipients'] });
      queryClient.invalidateQueries({ queryKey: ['revenueDistribution'] });
    },
  });
}

/**
 * Hook to update a revenue recipient
 */
export function useUpdateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      allocationPercentage: number;
      notes?: string;
      isActive: boolean;
    }) => {
      const response = await fetch(`/api/trade-finance/treasury/recipients/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allocation_percentage: data.allocationPercentage,
          notes: data.notes,
          is_active: data.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipient');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenueRecipients'] });
      queryClient.invalidateQueries({ queryKey: ['revenueDistribution'] });
    },
  });
}

/**
 * Hook to remove a revenue recipient
 */
export function useRemoveRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await fetch(`/api/trade-finance/treasury/recipients/${recipientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove recipient');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenueRecipients'] });
      queryClient.invalidateQueries({ queryKey: ['revenueDistribution'] });
    },
  });
}
