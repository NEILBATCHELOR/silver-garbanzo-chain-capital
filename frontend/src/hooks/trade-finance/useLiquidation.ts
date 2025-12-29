/**
 * Liquidation Hooks
 * React hooks for liquidation management, margin calls, and grace periods
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

// ============ Types ============

interface MarginCall {
  id: string;
  user_address: string;
  health_factor: number;
  grace_period_end: string;
  required_collateral: string;
  status: 'ACTIVE' | 'RESOLVED' | 'LIQUIDATED';
  created_at: string;
  resolved_at: string | null;
}

interface InsuranceClaim {
  id: string;
  user_address: string;
  commodity_type: string;
  claim_amount: string;
  claim_reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  payout_amount: string | null;
  created_at: string;
  updated_at: string;
}

interface PhysicalDeliveryOption {
  warehouse_address: string;
  commodity_type: string;
  available_quantity: string;
  storage_cost: string;
  delivery_timeframe_days: number;
}

interface WarehouseTransferRequest {
  from_warehouse: string;
  to_warehouse: string;
  commodity_type: string;
  quantity: string;
  nft_token_id: string;
}

// ============ Margin Call Hooks ============

/**
 * Hook to fetch active margin calls for the connected user
 */
export function useUserMarginCalls() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['userMarginCalls', address],
    queryFn: async () => {
      if (!address) return [];

      const response = await fetch(
        `/api/trade-finance/liquidation/margin-calls/${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch margin calls');
      }

      const result = await response.json();
      return result.data as MarginCall[];
    },
    enabled: !!address,
    refetchInterval: 10000, // Refresh every 10 seconds for urgent updates
  });
}

/**
 * Hook to get all active margin calls (for liquidators)
 */
export function useActiveMarginCalls() {
  return useQuery({
    queryKey: ['activeMarginCalls'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/liquidation/margin-calls/active', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active margin calls');
      }

      const result = await response.json();
      return result.data as MarginCall[];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

/**
 * Hook to resolve a margin call by adding collateral
 */
export function useResolveMarginCall() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (data: {
      collateralAdded: bigint;
      newHealthFactor: number;
    }) => {
      if (!address) throw new Error('Wallet not connected');

      const response = await fetch(
        `/api/trade-finance/liquidation/margin-calls/${address}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collateralAdded: data.collateralAdded.toString(),
            newHealthFactor: data.newHealthFactor,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve margin call');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMarginCalls'] });
      queryClient.invalidateQueries({ queryKey: ['activeMarginCalls'] });
    },
  });
}

// ============ Insurance Claim Hooks ============

/**
 * Hook to fetch insurance claims for the connected user
 */
export function useUserInsuranceClaims() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['userInsuranceClaims', address],
    queryFn: async () => {
      if (!address) return [];

      const response = await fetch(
        `/api/trade-finance/liquidation/insurance-claims?userAddress=${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch insurance claims');
      }

      const result = await response.json();
      return result.data as InsuranceClaim[];
    },
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to create an insurance claim
 */
export function useCreateInsuranceClaim() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (data: {
      commodityType: string;
      claimAmount: bigint;
      claimReason?: string;
    }) => {
      if (!address) throw new Error('Wallet not connected');

      const response = await fetch('/api/trade-finance/liquidation/insurance-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          commodityType: data.commodityType,
          claimAmount: data.claimAmount.toString(),
          claimReason: data.claimReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create insurance claim');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInsuranceClaims'] });
    },
  });
}

// ============ Physical Delivery Hooks ============

/**
 * Hook to get available physical delivery options
 */
export function usePhysicalDeliveryOptions(commodityType: string) {
  return useQuery({
    queryKey: ['physicalDeliveryOptions', commodityType],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/liquidation/physical-delivery/options?commodityType=${commodityType}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch physical delivery options');
      }

      const result = await response.json();
      return result.data as PhysicalDeliveryOption[];
    },
    enabled: !!commodityType,
  });
}

/**
 * Hook to request physical delivery instead of liquidation
 */
export function useRequestPhysicalDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      warehouseAddress: string;
      commodityType: string;
      quantity: bigint;
      deliveryAddress: string;
    }) => {
      const response = await fetch('/api/trade-finance/liquidation/physical-delivery/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_address: data.warehouseAddress,
          commodity_type: data.commodityType,
          quantity: data.quantity.toString(),
          delivery_address: data.deliveryAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request physical delivery');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMarginCalls'] });
    },
  });
}

// ============ Warehouse Transfer Hooks ============

/**
 * Hook to initiate warehouse transfer
 */
export function useWarehouseTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WarehouseTransferRequest) => {
      const response = await fetch('/api/trade-finance/liquidation/warehouse-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_warehouse: data.from_warehouse,
          to_warehouse: data.to_warehouse,
          commodity_type: data.commodity_type,
          quantity: data.quantity,
          nft_token_id: data.nft_token_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate warehouse transfer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouseInventory'] });
      queryClient.invalidateQueries({ queryKey: ['userMarginCalls'] });
    },
  });
}

/**
 * Hook to get warehouse inventory
 */
export function useWarehouseInventory(warehouseAddress?: string) {
  return useQuery({
    queryKey: ['warehouseInventory', warehouseAddress],
    queryFn: async () => {
      const url = warehouseAddress
        ? `/api/trade-finance/liquidation/warehouse-inventory/${warehouseAddress}`
        : '/api/trade-finance/liquidation/warehouse-inventory';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch warehouse inventory');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: true,
  });
}
