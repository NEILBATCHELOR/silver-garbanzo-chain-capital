import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState } from 'react';

// ============ Types ============

interface StataToken {
  id: string;
  stata_token_address: string;
  ctoken_address: string;
  underlying_address: string;
  commodity_type: string;
  name: string;
  symbol: string;
  total_assets: string;
  total_shares: string;
  deployed_at: string;
  deployer_address: string;
  chain_id: number;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

interface StataOperation {
  id: string;
  stata_token_address: string;
  user_address: string;
  operation_type: 'wrap' | 'unwrap';
  assets_amount: string;
  shares_amount: string;
  transaction_hash: string;
  block_number: number;
  timestamp: string;
}

interface DeployStataTokenInput {
  stataTokenAddress: string;
  ctokenAddress: string;
  underlyingAddress: string;
  commodityType: string;
  name: string;
  symbol: string;
  deployerAddress: string;
  chainId?: number;
}

// ============ Hooks ============

/**
 * Hook to fetch all StataTokens
 */
export function useStataTokens(chainId?: number) {
  return useQuery({
    queryKey: ['stataTokens', chainId],
    queryFn: async () => {
      const params = chainId ? `?chain_id=${chainId}` : '';
      const response = await fetch(
        `/api/trade-finance/stata-tokens${params}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch StataTokens');
      }

      const result = await response.json();
      return result.data as StataToken[];
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch a specific StataToken by address
 */
export function useStataToken(stataTokenAddress: string) {
  return useQuery({
    queryKey: ['stataToken', stataTokenAddress],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/stata-tokens/${stataTokenAddress}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch StataToken');
      }

      const result = await response.json();
      return result.data as StataToken;
    },
    enabled: !!stataTokenAddress,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch StataToken by cToken address
 */
export function useStataTokenByCToken(ctokenAddress: string) {
  return useQuery({
    queryKey: ['stataTokenByCToken', ctokenAddress],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/stata-tokens/by-ctoken/${ctokenAddress}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch StataToken');
      }

      const result = await response.json();
      return result.data as StataToken;
    },
    enabled: !!ctokenAddress,
  });
}

/**
 * Hook to fetch StataToken APR
 */
export function useStataTokenAPR(stataTokenAddress: string) {
  return useQuery({
    queryKey: ['stataTokenAPR', stataTokenAddress],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/stata-tokens/${stataTokenAddress}/apr`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch APR');
      }

      const result = await response.json();
      return result.data.apr as number;
    },
    enabled: !!stataTokenAddress,
    refetchInterval: 60000,
  });
}

/**
 * Hook to fetch StataToken statistics
 */
export function useStataTokenStats(stataTokenAddress: string) {
  return useQuery({
    queryKey: ['stataTokenStats', stataTokenAddress],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/stata-tokens/${stataTokenAddress}/stats`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!stataTokenAddress,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch user's StataToken operations
 */
export function useUserStataOperations(limit?: number, offset?: number) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['userStataOperations', address, limit, offset],
    queryFn: async () => {
      if (!address) return [];

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await fetch(
        `/api/trade-finance/stata-tokens/user/${address}/operations?${params}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch operations');
      }

      const result = await response.json();
      return result.data as StataOperation[];
    },
    enabled: !!address,
  });
}

/**
 * Hook to fetch operations for a specific StataToken
 */
export function useStataTokenOperations(
  stataTokenAddress: string,
  limit?: number,
  offset?: number
) {
  return useQuery({
    queryKey: ['stataTokenOperations', stataTokenAddress, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await fetch(
        `/api/trade-finance/stata-tokens/${stataTokenAddress}/operations?${params}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch operations');
      }

      const result = await response.json();
      return result.data as StataOperation[];
    },
    enabled: !!stataTokenAddress,
  });
}

/**
 * Hook to deploy a new StataToken (Admin only)
 */
export function useDeployStataToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeployStataTokenInput) => {
      const response = await fetch(
        '/api/trade-finance/stata-tokens/deploy',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to deploy StataToken');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stataTokens'] });
    },
  });
}

/**
 * Hook to record a wrap/unwrap operation
 */
export function useRecordStataOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      stataTokenAddress: string;
      userAddress: string;
      operationType: 'wrap' | 'unwrap';
      assetsAmount: string;
      sharesAmount: string;
      transactionHash: string;
      blockNumber: number;
    }) => {
      const response = await fetch(
        '/api/trade-finance/stata-tokens/operation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to record operation');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userStataOperations'] });
      queryClient.invalidateQueries({ 
        queryKey: ['stataTokenOperations', variables.stataTokenAddress] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['stataToken', variables.stataTokenAddress] 
      });
    },
  });
}

/**
 * Hook to get StataTokens by commodity type
 */
export function useStataTokensByCommodity(commodityType: string) {
  return useQuery({
    queryKey: ['stataTokensByCommodity', commodityType],
    queryFn: async () => {
      const response = await fetch(
        `/api/trade-finance/stata-tokens/commodity/${commodityType}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch StataTokens by commodity');
      }

      const result = await response.json();
      return result.data as StataToken[];
    },
    enabled: !!commodityType,
  });
}

/**
 * Hook to calculate user's StataToken balance
 * This requires on-chain call via wagmi
 */
export function useUserStataBalance(stataTokenAddress: string) {
  const { address } = useAccount();

  // TODO: Implement with wagmi useReadContract
  // For now, return placeholder
  return useQuery({
    queryKey: ['userStataBalance', address, stataTokenAddress],
    queryFn: async () => {
      // Placeholder - implement with actual contract call
      return {
        balance: '0',
        shares: '0',
      };
    },
    enabled: !!address && !!stataTokenAddress,
  });
}

/**
 * Hook to wrap cTokens into StataTokens
 * Requires on-chain transaction
 */
export function useWrapCToken() {
  const queryClient = useQueryClient();
  const recordOperation = useRecordStataOperation();
  
  // TODO: Implement with wagmi useWriteContract
  return useMutation({
    mutationFn: async ({ 
      stataTokenAddress, 
      amount 
    }: { 
      stataTokenAddress: string; 
      amount: string 
    }) => {
      // Placeholder for actual contract interaction
      // 1. Call depositWithPermit or deposit on StataToken contract
      // 2. Wait for transaction
      // 3. Record operation in database
      throw new Error('Not implemented - requires wagmi integration');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStataBalance'] });
      queryClient.invalidateQueries({ queryKey: ['stataTokens'] });
    },
  });
}

/**
 * Hook to unwrap StataTokens back to cTokens
 * Requires on-chain transaction
 */
export function useUnwrapStataToken() {
  const queryClient = useQueryClient();
  
  // TODO: Implement with wagmi useWriteContract
  return useMutation({
    mutationFn: async ({ 
      stataTokenAddress, 
      shares 
    }: { 
      stataTokenAddress: string; 
      shares: string 
    }) => {
      // Placeholder for actual contract interaction
      // 1. Call redeem on StataToken contract
      // 2. Wait for transaction
      // 3. Record operation in database
      throw new Error('Not implemented - requires wagmi integration');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStataBalance'] });
      queryClient.invalidateQueries({ queryKey: ['stataTokens'] });
    },
  });
}

/**
 * Hook to calculate total assets in StataToken
 */
export function useStataTokenTotalAssets(stataTokenAddress: string) {
  const { data: stataToken } = useStataToken(stataTokenAddress);
  
  return {
    totalAssets: stataToken?.total_assets || '0',
    totalShares: stataToken?.total_shares || '0',
  };
}
