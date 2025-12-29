import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserRewards, useClaimAllRewards } from '@/hooks/trade-finance';
import { formatEther } from 'viem';
import { Gift, Sparkles } from 'lucide-react';
import { cn } from '@/utils/utils';

interface RewardsCardProps {
  className?: string;
  compact?: boolean;
}

/**
 * Compact rewards card for embedding in position/supply/borrow views
 */
export function RewardsCard({ className, compact = false }: RewardsCardProps) {
  const { data: rewards, isLoading } = useUserRewards();
  const claimAll = useClaimAllRewards();

  const totalUnclaimed = rewards?.reduce(
    (acc, r) => acc + BigInt(r.accrued_amount || '0'),
    BigInt(0)
  ) || BigInt(0);

  const hasRewards = totalUnclaimed > BigInt(0);

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasRewards && compact) {
    return null; // Don't show if no rewards in compact mode
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className={compact ? 'p-4 pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          {hasRewards ? 'Rewards Available!' : 'Rewards'}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'p-4 pt-2' : undefined}>
        {hasRewards ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {formatEther(totalUnclaimed)}
              </span>
              <span className="text-sm text-muted-foreground">Tokens</span>
            </div>
            <Button
              onClick={() => {
                const assetAddresses = [...new Set(rewards?.map(r => r.user_address) || [])];
                claimAll.mutateAsync({ assets: assetAddresses });
              }}
              disabled={claimAll.isPending}
              className="w-full"
              size={compact ? 'sm' : 'default'}
            >
              <Gift className="h-4 w-4 mr-2" />
              {claimAll.isPending ? 'Claiming...' : 'Claim Rewards'}
            </Button>
            {!compact && rewards && (
              <div className="text-xs text-muted-foreground">
                {rewards.length} reward{rewards.length !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>Start earning rewards by supplying or borrowing commodities.</p>
            {!compact && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs">
                  💡 <strong>Tip:</strong> Rewards accrue automatically based on your
                  position size and duration.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
