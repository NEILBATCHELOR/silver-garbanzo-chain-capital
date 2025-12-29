/**
 * Compound vs Claim Optimizer Component
 * Helps users decide whether to claim or compound their rewards
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, DollarSign, Zap, Clock, Info, CheckCircle2 } from 'lucide-react';
import { formatEther } from 'viem';
import { cn } from '@/utils/utils';
import {
  calculateCompoundProjection,
  calculateOptimalClaimFrequency,
  compareStrategies,
  estimateClaimGasCost
} from '@/utils/apyCalculator';

interface CompoundVsClaimOptimizerProps {
  currentRewards: bigint;
  apy: number;
  rewardTokenPrice?: number;
  ethPrice?: number;
  gasPrice?: bigint;
  onClaim?: () => void;
  className?: string;
}

export function CompoundVsClaimOptimizer({
  currentRewards,
  apy,
  rewardTokenPrice = 1,
  ethPrice = 3000,
  gasPrice = BigInt(30e9), // 30 gwei
  onClaim,
  className
}: CompoundVsClaimOptimizerProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'claim' | 'compound'>('compound');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Calculate gas costs
  const gasCost = estimateClaimGasCost(1, gasPrice);
  
  // Calculate optimal claim frequency
  const rewardRate = currentRewards / BigInt(30 * 24 * 60 * 60); // Assuming 30-day accumulation
  const optimalFrequency = calculateOptimalClaimFrequency(
    rewardRate,
    rewardTokenPrice,
    gasCost,
    ethPrice
  );

  // Calculate compound projections
  const compoundProjection = calculateCompoundProjection(currentRewards, apy, 'daily');

  // Compare strategies
  const comparison = compareStrategies(
    currentRewards,
    apy,
    gasCost,
    ethPrice,
    rewardTokenPrice,
    timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365
  );

  // Get projection based on timeframe
  const getProjection = () => {
    switch (timeframe) {
      case 'week':
        return compoundProjection.weekly;
      case 'month':
        return compoundProjection.monthly;
      case 'year':
        return compoundProjection.yearly;
    }
  };

  const projection = getProjection();
  const totalWithCompound = currentRewards + projection;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Claim Strategy Optimizer
        </CardTitle>
        <CardDescription>
          Maximize your rewards with the optimal claiming strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Rewards Display */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Current Unclaimed Rewards</div>
              <div className="text-2xl font-bold mt-1">
                {formatEther(currentRewards)} Tokens
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ≈ ${(Number(formatEther(currentRewards)) * rewardTokenPrice).toFixed(2)} USD
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current APY</div>
              <div className="text-xl font-bold text-primary mt-1">
                {apy.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Recommendation</AlertTitle>
          <AlertDescription>{comparison.recommendation}</AlertDescription>
        </Alert>

        {/* Strategy Comparison Tabs */}
        <Tabs value={selectedStrategy} onValueChange={(v) => setSelectedStrategy(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="claim">Claim Now</TabsTrigger>
            <TabsTrigger value="compound">Compound & Wait</TabsTrigger>
          </TabsList>

          {/* Claim Now Strategy */}
          <TabsContent value="claim" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm">Gross Amount</span>
                <span className="font-mono font-medium">
                  {formatEther(currentRewards)} Tokens
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-destructive">Gas Fee</span>
                <span className="font-mono text-sm text-destructive">
                  -{formatEther(comparison.claimNow.fees)} Tokens
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="font-medium">Net Amount</span>
                <span className="font-mono font-bold text-lg">
                  {formatEther(comparison.claimNow.netAmount)} Tokens
                </span>
              </div>

              <div className="pt-2 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <span>Immediate access to funds</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <span>No price risk exposure</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5" />
                  <span>Gas fees reduce net amount</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Compound Strategy */}
          <TabsContent value="compound" className="space-y-4">
            {/* Timeframe Selection */}
            <div className="flex gap-2">
              <Button
                variant={timeframe === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('week')}
              >
                1 Week
              </Button>
              <Button
                variant={timeframe === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('month')}
              >
                1 Month
              </Button>
              <Button
                variant={timeframe === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('year')}
              >
                1 Year
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm">Current Amount</span>
                <span className="font-mono font-medium">
                  {formatEther(currentRewards)} Tokens
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-green-600">Est. Compound Earnings</span>
                <span className="font-mono text-sm text-green-600">
                  +{formatEther(projection)} Tokens
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="font-medium">Projected Total</span>
                <span className="font-mono font-bold text-lg">
                  {formatEther(totalWithCompound)} Tokens
                </span>
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  Additional Gain vs Claiming Now
                </div>
                <div className="font-mono text-xl font-bold text-green-700 dark:text-green-400 mt-1">
                  +{formatEther(projection + comparison.compound.gasSavings)} Tokens
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Includes gas savings from delayed claiming
                </div>
              </div>

              <div className="pt-2 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <span>Maximize compound interest</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <span>Save on gas fees</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5" />
                  <span>Subject to price volatility</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Optimal Frequency Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Clock className="inline h-4 w-4 mr-1" />
              Optimal Claim Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recommended Frequency</span>
              <Badge variant="secondary">
                Every {optimalFrequency.optimalDays} day{optimalFrequency.optimalDays > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Break-even Amount</span>
              <span className="font-mono text-sm">
                {formatEther(optimalFrequency.breakEvenAmount)} Tokens
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gas Cost per Claim</span>
              <span className="font-mono text-sm">
                ≈ ${((Number(gasCost) / 1e18) * ethPrice).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        {onClaim && (
          <Button 
            onClick={onClaim}
            className="w-full"
            disabled={currentRewards === BigInt(0)}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Claim Rewards Now
          </Button>
        )}

        {/* Disclaimer */}
        <Alert variant="default" className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Projections are estimates based on current APY and market conditions. 
            Actual returns may vary based on token price volatility and gas costs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
