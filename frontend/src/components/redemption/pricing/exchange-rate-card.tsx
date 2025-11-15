/**
 * ExchangeRateCard Component
 * 
 * Compact rate display for token lists and portfolio views
 * Shows rate, 24h change, and mini sparkline chart
 */

import { useExchangeRate, usePriceTrend } from '@/infrastructure/redemption/pricing/hooks';
import { Currency } from '@/infrastructure/redemption/pricing/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/utils/utils';

interface ExchangeRateCardProps {
  tokenId: string;
  tokenSymbol?: string;
  currency?: Currency;
  onClick?: () => void;
  className?: string;
}

export function ExchangeRateCard({
  tokenId,
  tokenSymbol,
  currency = Currency.USDC,
  onClick,
  className
}: ExchangeRateCardProps) {
  const { exchangeRate, loading, error } = useExchangeRate(tokenId, currency);
  const { trend, loading: trendLoading } = usePriceTrend(tokenId, 1); // 24h trend

  if (loading || trendLoading) {
    return (
      <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !exchangeRate) {
    return (
      <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            Rate unavailable
          </div>
        </CardContent>
      </Card>
    );
  }

  const rate = Number(exchangeRate.rate) / 1e8;
  const changePercent = trend?.changePercent || 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const isNeutral = changePercent === 0;

  // Prepare sparkline data
  const sparklineData = trend?.periods
    ?.slice(-24) // Last 24 periods (24 hours)
    ?.map((p: any) => ({
      value: Number(p.closePrice) / 1e8
    })) || [];

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        onClick && "hover:border-primary",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Symbol & Badge */}
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-muted-foreground">
              {tokenSymbol || 'TOKEN'}
            </div>
            {exchangeRate.source && (
              <Badge variant="outline" className="text-xs">
                {exchangeRate.source.type === 'aggregated' ? 'Multi' : exchangeRate.source.provider}
              </Badge>
            )}
          </div>

          {/* Main Rate */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {rate.toFixed(4)}
            </span>
            <span className="text-sm text-muted-foreground">
              {currency}
            </span>
          </div>

          {/* Sparkline Chart */}
          {sparklineData.length > 0 && (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280'}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 24h Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              {isPositive && <TrendingUp className="h-3 w-3 text-green-600" />}
              {isNegative && <TrendingDown className="h-3 w-3 text-red-600" />}
              {isNeutral && <Minus className="h-3 w-3 text-gray-400" />}
              <span className={cn(
                "font-medium",
                isPositive && "text-green-600",
                isNegative && "text-red-600",
                isNeutral && "text-gray-600"
              )}>
                {isPositive && '+'}{changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              24h
            </div>
          </div>

          {/* Confidence Indicator */}
          {exchangeRate.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    exchangeRate.confidence >= 80 && "bg-green-500",
                    exchangeRate.confidence >= 60 && exchangeRate.confidence < 80 && "bg-yellow-500",
                    exchangeRate.confidence < 60 && "bg-red-500"
                  )}
                  style={{ width: `${exchangeRate.confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[3ch]">
                {exchangeRate.confidence}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact variant for grid layouts
 */
export function ExchangeRateCardCompact({
  tokenId,
  tokenSymbol,
  currency = Currency.USDC,
  onClick,
  className
}: ExchangeRateCardProps) {
  const { exchangeRate, loading } = useExchangeRate(tokenId, currency);
  const { trend } = usePriceTrend(tokenId, 1);

  if (loading || !exchangeRate) {
    return (
      <div className={cn("p-3 border rounded-lg", className)}>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const rate = Number(exchangeRate.rate) / 1e8;
  const changePercent = trend?.changePercent || 0;
  const isPositive = changePercent > 0;

  return (
    <div
      className={cn(
        "p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {tokenSymbol || 'TOKEN'}
          </div>
          <div className="text-lg font-bold">
            {rate.toFixed(2)}
          </div>
        </div>
        <div className={cn(
          "text-sm font-medium",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {isPositive && '+'}{changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
