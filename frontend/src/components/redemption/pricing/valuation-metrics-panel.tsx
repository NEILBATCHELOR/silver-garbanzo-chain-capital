/**
 * ValuationMetricsPanel Component
 * 
 * Displays calculated metrics for current valuation period including:
 * - TWAP (Time-Weighted Average Price)
 * - VWAP (Volume-Weighted Average Price)
 * - Volatility percentage
 * - Price change (absolute + percentage)
 * - Period timestamps
 * - Data point count
 * 
 * @priority Medium
 * @usage Token analytics page, detailed token views
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Clock } from 'lucide-react';
import { useValuation } from '@/infrastructure/redemption/pricing/hooks';
import { cn } from '@/utils/utils';

interface ValuationMetricsPanelProps {
  tokenId: string;
  className?: string;
}

export function ValuationMetricsPanel({ tokenId, className }: ValuationMetricsPanelProps) {
  const { valuation, loading, error, refresh } = useValuation(tokenId);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Failed to load valuation metrics: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!valuation || !valuation.metrics) {
    return (
      <Alert className={className}>
        <AlertDescription>
          No valuation data available for this token.
        </AlertDescription>
      </Alert>
    );
  }

  const { metrics, ohlcv, period } = valuation;

  // Calculate price change
  const priceChange = ohlcv.close - ohlcv.open;
  const priceChangePercent = (priceChange / ohlcv.open) * 100;
  const isPositive = priceChange >= 0;
  const isFlat = Math.abs(priceChangePercent) < 0.01;

  // Format numbers
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Valuation Metrics
            </CardTitle>
            <CardDescription>
              Current 4-hour period metrics
            </CardDescription>
          </div>
          <button
            onClick={refresh}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Period Information */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Period: {formatDate(period.start)} - {formatDate(period.end)}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* TWAP */}
          <MetricCard
            label="TWAP"
            value={formatPrice(metrics.twap)}
            description="Time-Weighted Average Price"
            icon={<BarChart3 className="h-4 w-4" />}
          />

          {/* VWAP */}
          <MetricCard
            label="VWAP"
            value={formatPrice(metrics.vwap)}
            description="Volume-Weighted Average Price"
            icon={<BarChart3 className="h-4 w-4" />}
          />

          {/* Price Change */}
          <MetricCard
            label="Price Change"
            value={formatPrice(Math.abs(priceChange))}
            description={formatPercent(priceChangePercent)}
            icon={
              isFlat ? (
                <Minus className="h-4 w-4" />
              ) : isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )
            }
            valueClassName={
              isFlat ? '' : isPositive ? 'text-green-600' : 'text-red-600'
            }
          />

          {/* Volatility */}
          <MetricCard
            label="Volatility"
            value={formatPercent(metrics.volatility)}
            description="Price variation in period"
            icon={<Activity className="h-4 w-4" />}
            badge={
              metrics.volatility > 5 ? (
                <Badge variant="destructive" className="text-xs">High</Badge>
              ) : metrics.volatility > 2 ? (
                <Badge variant="secondary" className="text-xs">Medium</Badge>
              ) : (
                <Badge variant="default" className="text-xs">Low</Badge>
              )
            }
          />

          {/* High Price */}
          <MetricCard
            label="Period High"
            value={formatPrice(ohlcv.high)}
            description="Highest price in period"
          />

          {/* Low Price */}
          <MetricCard
            label="Period Low"
            value={formatPrice(ohlcv.low)}
            description="Lowest price in period"
          />
        </div>

        {/* Volume Information */}
        {ohlcv.volume && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium">Trading Volume</div>
            <div className="text-lg font-semibold">
              {Number(ohlcv.volume).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  valueClassName?: string;
}

function MetricCard({
  label,
  value,
  description,
  icon,
  badge,
  valueClassName
}: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        {badge}
      </div>
      <div className={cn('text-2xl font-bold', valueClassName)}>
        {value}
      </div>
      {description && (
        <div className="text-sm text-muted-foreground mt-1">
          {description}
        </div>
      )}
    </div>
  );
}
