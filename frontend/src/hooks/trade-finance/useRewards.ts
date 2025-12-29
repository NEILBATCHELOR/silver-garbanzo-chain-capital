import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface UserReward {
  id: string;
  user_address: string;
  reward_token_address: string;
  accrued_amount: string;
  claimed_amount: string;
  last_claim_timestamp: string | null;
  user_index: string;
  created_at: string;
  updated_at: string;
}

interface AssetReward {
  asset_address: string;
  reward_token_address: string;
  accrued_amount: string;
  pending_amount: string;
}

interface ClaimableReward {
  reward_token_address: string;
  claimable_amount: string;
  accrued_amount: string;
}

/**
 * Hook to fetch all rewards for the connected user
 * @returns Query result with user rewards data
 */
export function useUserRewards() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['userRewards', address],
    queryFn: async () => {
      if (!address) return [];
      
      const response = await fetch(
        `/api/trade-finance/rewards/user/${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user rewards');
      }

      const result = await response.json();
      return result.data as UserReward[];
    },
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

/**
 * Hook to fetch rewards for a specific asset
 * @param assetAddress The commodity asset address
 * @returns Query result with asset-specific rewards
 */
export function useRewardsByAsset(assetAddress: string) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['assetRewards', address, assetAddress],
    queryFn: async () => {
      if (!address || !assetAddress) return null;

      const response = await fetch(
        `/api/trade-finance/rewards/${address}/asset/${assetAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch asset rewards');
      }

      return response.json() as Promise<AssetReward>;
    },
    enabled: !!address && !!assetAddress,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch claimable rewards for specific assets
 * Note: This calculates claimable amounts from accrued rewards
 * @param assetAddresses Array of asset addresses to check
 * @returns Query result with claimable rewards
 */
export function useClaimableRewards(assetAddresses: string[]) {
  const { address } = useAccount();
  const { data: userRewards } = useUserRewards();

  return useQuery({
    queryKey: ['claimableRewards', address, ...assetAddresses],
    queryFn: async () => {
      if (!address || !userRewards) return [];

      // Filter rewards by specified assets and return claimable amounts
      return userRewards
        .filter(reward => assetAddresses.includes(reward.user_address))
        .map(reward => ({
          reward_token_address: reward.reward_token_address,
          claimable_amount: reward.accrued_amount,
          accrued_amount: reward.accrued_amount,
        }));
    },
    enabled: !!address && assetAddresses.length > 0 && !!userRewards,
  });
}

/**
 * Hook to fetch reward claim history for the connected user
 * @returns Query result with claim history
 */
export function useRewardClaimHistory() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['rewardClaimHistory', address],
    queryFn: async () => {
      if (!address) return [];

      const response = await fetch(
        `/api/trade-finance/rewards/claims/${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch claim history');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!address,
    staleTime: 60000, // Claim history doesn't change as frequently
  });
}

/**
 * Hook to fetch all available reward tokens in the system
 * @returns Query result with available reward tokens from active configs
 */
export function useAvailableRewardTokens() {
  return useQuery({
    queryKey: ['availableRewardTokens'],
    queryFn: async () => {
      const response = await fetch('/api/trade-finance/rewards/config/active', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available reward tokens');
      }

      const result = await response.json();
      // Extract unique reward tokens from active configs
      const configs = result.data || [];
      const uniqueTokens = [...new Set(configs.map((c: any) => c.reward_token_address))];
      
      return uniqueTokens;
    },
    staleTime: 300000, // Available tokens don't change often - 5 minutes
  });
}
