/**
 * PriceTrendIndicator Component
 * 
 * Compact visual indicator of price movement with:
 * - Trend arrow (up/down/flat)
 * - Percentage change
 * - Color coding (green/red/gray)
 * - Configurable time period (7d, 30d, 90d)
 * - Compact size for embedding in cards/lists
 * 
 * @priority Medium
 * @usage Token cards, dashboard widgets, portfolio views
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePriceTrend } from '@/infrastructure/redemption/pricing/hooks';
import { cn } from '@/utils/utils';

interface PriceTrendIndicatorProps {
  tokenId: string;
  days?: 7 | 30 | 90;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PriceTrendIndicator({
  tokenId,
  days = 7,
  size = 'md',
  showLabel = true,
  className
}: PriceTrendIndicatorProps) {
  const { trend, loading, error } = usePriceTrend(tokenId, days);

  if (loading) {
    return <Skeleton className={cn('h-6 w-24', className)} />;
  }

  if (error || !trend) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        No data
      </div>
    );
  }

  const { changePercent, direction } = trend;

  // Determine trend
  const isPositive = direction === 'up';
  const isFlat = direction === 'flat';
  const absChange = Math.abs(changePercent);

  // Size configurations
  const sizeClasses = {
    sm: {
      icon: 'h-3 w-3',
      text: 'text-xs',
      badge: 'h-5 px-1.5'
    },
    md: {
      icon: 'h-4 w-4',
      text: 'text-sm',
      badge: 'h-6 px-2'
    },
    lg: {
      icon: 'h-5 w-5',
      text: 'text-base',
      badge: 'h-7 px-3'
    }
  };

  const config = sizeClasses[size];

  // Icon component
  const Icon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;

  // Color classes
  const colorClasses = isFlat
    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    : isPositive
    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1 font-medium border-0',
          config.badge,
          config.text,
          colorClasses
        )}
      >
        <Icon className={config.icon} />
        <span>
          {isPositive && '+'}
          {absChange.toFixed(2)}%
        </span>
      </Badge>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {days}d
        </span>
      )}
    </div>
  );
}

/**
 * PriceTrendSparkline Component
 * 
 * Shows a mini sparkline chart alongside the trend indicator
 */
interface PriceTrendSparklineProps extends PriceTrendIndicatorProps {
  showSparkline?: boolean;
}

export function PriceTrendSparkline({
  tokenId,
  days = 7,
  size = 'md',
  showLabel = true,
  showSparkline = true,
  className
}: PriceTrendSparklineProps) {
  const { trend, loading } = usePriceTrend(tokenId, days);

  if (loading) {
    return <Skeleton className={cn('h-8 w-32', className)} />;
  }

  if (!trend) {
    return <PriceTrendIndicator tokenId={tokenId} days={days} size={size} showLabel={showLabel} className={className} />;
  }

  const { changePercent, direction, sparklineData } = trend;
  const isPositive = direction === 'up';
  const isFlat = direction === 'flat';

  // Generate SVG path for sparkline
  const generateSparklinePath = () => {
    if (!sparklineData || sparklineData.length === 0) return '';

    const width = 40;
    const height = 20;
    const padding = 2;

    const values = sparklineData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = sparklineData.map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const strokeColor = isFlat
    ? 'rgb(107, 114, 128)'
    : isPositive
    ? 'rgb(34, 197, 94)'
    : 'rgb(239, 68, 68)';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <PriceTrendIndicator
        tokenId={tokenId}
        days={days}
        size={size}
        showLabel={showLabel}
      />
      {showSparkline && sparklineData && sparklineData.length > 0 && (
        <svg
          width="40"
          height="20"
          className="opacity-70"
          aria-label="Price trend sparkline"
        >
          <path
            d={generateSparklinePath()}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * PriceTrendBadge Component
 * 
 * Simple badge showing just the trend direction
 */
interface PriceTrendBadgeProps {
  tokenId: string;
  days?: 7 | 30 | 90;
  className?: string;
}

export function PriceTrendBadge({ tokenId, days = 7, className }: PriceTrendBadgeProps) {
  const { trend, loading } = usePriceTrend(tokenId, days);

  if (loading) {
    return <Skeleton className={cn('h-5 w-16', className)} />;
  }

  if (!trend) {
    return null;
  }

  const { direction } = trend;

  const variants = {
    up: { label: 'Bullish', variant: 'default' as const },
    down: { label: 'Bearish', variant: 'destructive' as const },
    flat: { label: 'Neutral', variant: 'secondary' as const }
  };

  const config = variants[direction];

  return (
    <Badge variant={config.variant} className={cn('text-xs', className)}>
      {config.label}
    </Badge>
  );
}
