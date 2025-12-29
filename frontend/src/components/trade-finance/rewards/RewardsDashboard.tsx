import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useUserRewards, 
  useClaimAllRewards,
  useRewardClaimHistory,
  useAvailableRewardTokens 
} from '@/hooks/trade-finance';
import { formatUnits, formatEther } from 'viem';
import { useState } from 'react';
import { Coins, TrendingUp, History, Gift } from 'lucide-react';
import { cn } from '@/utils/utils';

interface RewardsDashboardProps {
  className?: string;
}

export function RewardsDashboard({ className }: RewardsDashboardProps) {
  const { data: rewards, isLoading, error } = useUserRewards();
  const { data: claimHistory } = useRewardClaimHistory();
  const claimAll = useClaimAllRewards();
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Your Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Error Loading Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load rewards data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalUnclaimed = rewards?.reduce(
    (acc, r) => acc + BigInt(r.accrued_amount || '0'), 
    BigInt(0)
  ) || BigInt(0);

  const totalClaimed = rewards?.reduce(
    (acc, r) => acc + BigInt(r.claimed_amount || '0'),
    BigInt(0)
  ) || BigInt(0);

  const handleClaimAll = async () => {
    if (!rewards || rewards.length === 0) return;
    
    // Extract unique asset addresses from rewards
    const assetAddresses = [...new Set(rewards.map(r => r.user_address))];
    
    await claimAll.mutateAsync({ assets: assetAddresses });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Rewards Summary
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Total Unclaimed */}
            <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                Total Unclaimed
              </div>
              <div className="text-2xl font-bold">
                {formatEther(totalUnclaimed)} Tokens
              </div>
              <Button 
                onClick={handleClaimAll}
                disabled={totalUnclaimed === BigInt(0) || claimAll.isPending}
                className="w-full mt-2"
              >
                {claimAll.isPending ? 'Claiming...' : 'Claim All Rewards'}
              </Button>
            </div>

            {/* Total Claimed */}
            <div className="space-y-2 p-4 bg-secondary/5 rounded-lg border border-secondary/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Total Claimed
              </div>
              <div className="text-2xl font-bold">
                {formatEther(totalClaimed)} Tokens
              </div>
              <p className="text-sm text-muted-foreground">
                Lifetime earnings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards by Token */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards by Token</CardTitle>
        </CardHeader>
        <CardContent>
          {!rewards || rewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No rewards yet. Start supplying or borrowing to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {reward.reward_token_address.slice(0, 6)}...
                        {reward.reward_token_address.slice(-4)}
                      </span>
                      {BigInt(reward.accrued_amount) > BigInt(0) && (
                        <Badge variant="secondary" className="text-xs">
                          Claimable
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Accrued: {formatEther(BigInt(reward.accrued_amount))} |
                      Claimed: {formatEther(BigInt(reward.claimed_amount))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={BigInt(reward.accrued_amount) === BigInt(0)}
                  >
                    Claim
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim History */}
      {showHistory && claimHistory && claimHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Claim History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {claimHistory.map((claim: any) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-3 rounded-lg border text-sm"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {formatEther(BigInt(claim.amount))} Tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(claim.claimed_at).toLocaleDateString()}
                    </div>
                  </div>
                  {claim.transaction_hash && (
                    <Badge variant="outline" className="text-xs">
                      <a
                        href={`https://etherscan.io/tx/${claim.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View Tx
                      </a>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
