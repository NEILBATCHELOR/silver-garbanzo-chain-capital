/**
 * APY Display Component
 * Shows detailed APY breakdown for rewards
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Percent, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/utils/utils';
import { formatEther } from 'viem';
import { calculateAPY } from '@/utils/apyCalculator';

interface APYDisplayProps {
  emissionPerSecond: bigint;
  totalSupply: bigint;
  rewardTokenPrice?: number;
  assetPrice?: number;
  userBalance?: bigint;
  className?: string;
}

export function APYDisplay({
  emissionPerSecond,
  totalSupply,
  rewardTokenPrice = 1,
  assetPrice = 1,
  userBalance,
  className
}: APYDisplayProps) {
  const apy = calculateAPY(emissionPerSecond, totalSupply, rewardTokenPrice, assetPrice);

  // Calculate user's projected earnings if balance provided
  const userProjections = userBalance ? {
    daily: (userBalance * apy.yearlyProjection) / totalSupply / BigInt(365),
    weekly: (userBalance * apy.yearlyProjection) / totalSupply / BigInt(52),
    monthly: (userBalance * apy.yearlyProjection) / totalSupply / BigInt(12),
    yearly: (userBalance * apy.yearlyProjection) / totalSupply
  } : null;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            APY Breakdown
          </span>
          <Badge variant="default" className="text-lg px-3 py-1">
            {apy.totalAPY.toFixed(2)}% APY
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* APY Components */}
        <div className="space-y-3">
          {/* Base APY (from lending interest) */}
          {apy.baseAPY > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base Lending APY</span>
                <span className="font-medium">{apy.baseAPY.toFixed(2)}%</span>
              </div>
              <Progress 
                value={(apy.baseAPY / apy.totalAPY) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Rewards APY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                Rewards APY
              </span>
              <span className="font-medium text-primary">{apy.rewardsAPY.toFixed(2)}%</span>
            </div>
            <Progress 
              value={(apy.rewardsAPY / apy.totalAPY) * 100} 
              className="h-2 [&>div]:bg-primary"
            />
          </div>
        </div>

        {/* Time-based Rates */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary text-center">
            <div className="text-xs text-muted-foreground">Daily</div>
            <div className="text-lg font-bold mt-1">{apy.dailyRate.toFixed(4)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <div className="text-xs text-muted-foreground">Weekly</div>
            <div className="text-lg font-bold mt-1">{apy.weeklyRate.toFixed(3)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <div className="text-xs text-muted-foreground">Monthly</div>
            <div className="text-lg font-bold mt-1">{apy.monthlyRate.toFixed(2)}%</div>
          </div>
        </div>

        {/* Emission Details */}
        <div className="p-4 rounded-lg border space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Emission Rate</span>
            <span className="font-mono">
              {formatEther(emissionPerSecond)} / sec
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Daily Emissions</span>
            <span className="font-mono">
              {formatEther(emissionPerSecond * BigInt(24 * 60 * 60))} Tokens
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Yearly Projection</span>
            <span className="font-mono">
              {formatEther(apy.yearlyProjection)} Tokens
            </span>
          </div>
        </div>

        {/* User Projections */}
        {userBalance && userProjections && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Your Projected Earnings
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Daily</span>
                <span className="font-mono font-medium">
                  {formatEther(userProjections.daily)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Weekly</span>
                <span className="font-mono font-medium">
                  {formatEther(userProjections.weekly)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly</span>
                <span className="font-mono font-medium">
                  {formatEther(userProjections.monthly)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Yearly</span>
                <span className="font-mono font-medium text-primary">
                  {formatEther(userProjections.yearly)}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Based on your current balance of {formatEther(userBalance)} tokens
            </div>
          </div>
        )}

        {/* Value Metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Reward Token Price
            </div>
            <div className="font-mono font-bold">${rewardTokenPrice.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Asset Price
            </div>
            <div className="font-mono font-bold">${assetPrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Additional Context */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• APY is calculated based on current emission rates and may change</p>
          <p>• Actual returns depend on token price fluctuations</p>
          <p>• Compound interest not included in base calculations</p>
        </div>
      </CardContent>
    </Card>
  );
}
