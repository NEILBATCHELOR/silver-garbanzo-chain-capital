/**
 * PriceDisplay Component
 * 
 * Shows current exchange rates for a token with metadata
 * Essential for redemption flow - investors see rates before redeeming
 */

import { useExchangeRate } from '@/infrastructure/redemption/pricing/hooks';
import { Currency } from '@/infrastructure/redemption/pricing/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/utils/utils';

interface PriceDisplayProps {
  tokenId: string;
  currency?: Currency;
  showRefresh?: boolean;
  showMetadata?: boolean;
  className?: string;
}

export function PriceDisplay({
  tokenId,
  currency = Currency.USDC,
  showRefresh = true,
  showMetadata = true,
  className
}: PriceDisplayProps) {
  const { exchangeRate, loading, error, cached, age, refresh } = useExchangeRate(tokenId, currency);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load exchange rate: {error.message}
            </AlertDescription>
          </Alert>
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!exchangeRate) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              No exchange rate available for this token
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isStale = age > 300; // 5 minutes
  const isFresh = age < 60; // 1 minute

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Exchange Rate</CardTitle>
          <div className="flex items-center gap-2">
            {cached && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  loading && "animate-spin"
                )} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Rate Display */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {Number(exchangeRate.rate) / 1e8}
            </span>
            <span className="text-lg text-muted-foreground">
              {currency}
            </span>
          </div>
        </div>

        {/* Metadata */}
        {showMetadata && (
          <div className="space-y-2">
            {/* Last Updated */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated
              </span>
              <span className={cn(
                "font-medium",
                isStale && "text-orange-600",
                isFresh && "text-green-600"
              )}>
                {formatAge(age)}
              </span>
            </div>

            {/* Source */}
            {exchangeRate.source && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium capitalize">
                  {exchangeRate.source.type === 'aggregated'
                    ? `${exchangeRate.source.references?.length || 0} sources`
                    : exchangeRate.source.provider}
                </span>
              </div>
            )}

            {/* Confidence */}
            {exchangeRate.confidence !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  <span className="font-medium min-w-[3ch]">
                    {exchangeRate.confidence}%
                  </span>
                </div>
              </div>
            )}

            {/* Age Indicator */}
            {isStale && (
              <Alert variant="default" className="mt-2">
                <AlertDescription className="text-xs">
                  This rate is older than 5 minutes. Consider refreshing for the latest price.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format age in seconds to human-readable string
 */
function formatAge(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
}
