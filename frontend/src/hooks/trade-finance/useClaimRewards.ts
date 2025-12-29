import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { writeContract } from '@wagmi/core';
import { useState } from 'react';

// Contract addresses - these should match your deployed contracts
const REWARDS_CONTROLLER_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Update with actual deployment

// Simplified ABI for RewardsController
const REWARDS_CONTROLLER_ABI = [
  {
    name: 'claimRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'reward', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'claimAllRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'to', type: 'address' }
    ],
    outputs: [
      { name: 'rewardsList', type: 'address[]' },
      { name: 'claimedAmounts', type: 'uint256[]' }
    ]
  }
] as const;

interface ClaimRewardsParams {
  assets: string[];
  reward: string;
  amount?: bigint;
  to?: string;
}

interface ClaimAllRewardsParams {
  assets: string[];
  to?: string;
}

/**
 * Hook to claim specific rewards
 * @returns Mutation for claiming rewards with transaction tracking
 */
export function useClaimRewards() {
  const { address, chain } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mutation = useMutation({
    mutationFn: async ({ assets, reward, amount, to }: ClaimRewardsParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!chain) {
        throw new Error('No chain connected');
      }

      const recipient = to || address;
      const claimAmount = amount || BigInt(0); // 0 means claim all

      const hash = await writeContract(config, {
        address: REWARDS_CONTROLLER_ADDRESS as `0x${string}`,
        abi: REWARDS_CONTROLLER_ABI,
        functionName: 'claimRewards',
        args: [assets as `0x${string}`[], claimAmount, recipient as `0x${string}`, reward as `0x${string}`],
        chain,
        account: address,
      });

      setTxHash(hash);
      return hash;
    },
    onSuccess: async (hash, variables) => {
      // Record claim in backend
      try {
        await fetch('/api/trade-finance/rewards/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address,
            rewardToken: variables.reward,
            amount: variables.amount?.toString() || '0',
            txHash: hash,
          }),
        });
      } catch (error) {
        console.error('Failed to record claim in backend:', error);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userRewards'] });
      queryClient.invalidateQueries({ queryKey: ['assetRewards'] });
      queryClient.invalidateQueries({ queryKey: ['claimableRewards'] });
      queryClient.invalidateQueries({ queryKey: ['rewardClaimHistory'] });
    },
    onError: (error) => {
      console.error('Claim rewards error:', error);
    },
  });

  return {
    ...mutation,
    txHash,
    receipt,
    isConfirming,
  };
}

/**
 * Hook to claim all rewards from multiple assets
 * @returns Mutation for claiming all available rewards
 */
export function useClaimAllRewards() {
  const { address, chain } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mutation = useMutation({
    mutationFn: async ({ assets, to }: ClaimAllRewardsParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!chain) {
        throw new Error('No chain connected');
      }

      const recipient = to || address;

      const hash = await writeContract(config, {
        address: REWARDS_CONTROLLER_ADDRESS as `0x${string}`,
        abi: REWARDS_CONTROLLER_ABI,
        functionName: 'claimAllRewards',
        args: [assets as `0x${string}`[], recipient as `0x${string}`],
        chain,
        account: address,
      });

      setTxHash(hash);
      return hash;
    },
    onSuccess: async (hash) => {
      // Record claim in backend
      try {
        await fetch('/api/trade-finance/rewards/claim-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address,
            txHash: hash,
          }),
        });
      } catch (error) {
        console.error('Failed to record claim in backend:', error);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userRewards'] });
      queryClient.invalidateQueries({ queryKey: ['assetRewards'] });
      queryClient.invalidateQueries({ queryKey: ['claimableRewards'] });
      queryClient.invalidateQueries({ queryKey: ['rewardClaimHistory'] });
    },
    onError: (error) => {
      console.error('Claim all rewards error:', error);
    },
  });

  return {
    ...mutation,
    txHash,
    receipt,
    isConfirming,
  };
}

/**
 * Helper hook to estimate gas for claiming rewards
 * @param assets Array of asset addresses
 * @param reward Reward token address
 * @returns Estimated gas cost
 */
export function useEstimateClaimGas(assets: string[], reward: string) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['estimateClaimGas', address, assets, reward],
    queryFn: async () => {
      if (!address) return null;

      // This would call a gas estimation endpoint
      // For now, return a placeholder
      return {
        gasEstimate: BigInt(150000),
        gasCostInEth: '0.003',
      };
    },
    enabled: !!address && assets.length > 0 && !!reward,
  });
}
