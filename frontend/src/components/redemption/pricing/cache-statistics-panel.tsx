/**
 * CacheStatisticsPanel Component
 * 
 * Monitors cache performance with:
 * - Cache hit rate (percentage)
 * - Total hits/misses
 * - Cache size / max size
 * - Oldest entry age
 * - Newest entry age
 * - Clear cache button
 * - Refresh stats button
 * 
 * @priority Medium-Low (Admin)
 * @usage Admin dashboard, system monitoring
 */

import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  RefreshCw,
  Trash2,
  TrendingUp,
  Clock,
  HardDrive,
  Activity
} from 'lucide-react';
import { useCacheStatistics } from '@/infrastructure/redemption/pricing/hooks';
import { cn } from '@/utils/utils';

// Cache maximum size from ExchangeRateCache default config
const MAX_CACHE_SIZE = 1000;

interface CacheStatisticsPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  className?: string;
}

export function CacheStatisticsPanel({
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
  className
}: CacheStatisticsPanelProps) {
  const { statistics, refresh, clearCache } = useCacheStatistics();

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Calculate derived metrics
  const hitRate = statistics.hits + statistics.misses > 0
    ? (statistics.hits / (statistics.hits + statistics.misses)) * 100
    : 0;

  const cacheUtilization = MAX_CACHE_SIZE > 0
    ? (statistics.size / MAX_CACHE_SIZE) * 100
    : 0;

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Handle clear cache
  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the cache? This will remove all cached exchange rates.')) {
      await clearCache();
      refresh();
    }
  };

  // Get hit rate status
  const getHitRateStatus = () => {
    if (hitRate >= 80) return { variant: 'default' as const, label: 'Excellent' };
    if (hitRate >= 60) return { variant: 'secondary' as const, label: 'Good' };
    if (hitRate >= 40) return { variant: 'outline' as const, label: 'Fair' };
    return { variant: 'destructive' as const, label: 'Poor' };
  };

  const hitRateStatus = getHitRateStatus();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Statistics
            </CardTitle>
            <CardDescription>
              Exchange rate cache performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearCache}
              disabled={statistics.size === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hit Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Cache Hit Rate</span>
            </div>
            <Badge variant={hitRateStatus.variant}>
              {hitRateStatus.label}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Hit Rate</span>
              <span className="font-mono font-semibold">{hitRate.toFixed(1)}%</span>
            </div>
            <Progress value={hitRate} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Cache Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Hits */}
          <MetricCard
            icon={<Activity className="h-4 w-4 text-green-600" />}
            label="Cache Hits"
            value={statistics.hits.toLocaleString()}
            description="Requests served from cache"
          />

          {/* Misses */}
          <MetricCard
            icon={<Activity className="h-4 w-4 text-orange-600" />}
            label="Cache Misses"
            value={statistics.misses.toLocaleString()}
            description="Requests requiring fetch"
          />
        </div>

        <Separator />

        {/* Cache Utilization */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cache Utilization</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {statistics.size} / {MAX_CACHE_SIZE} entries
              </span>
              <span className="font-mono font-semibold">
                {cacheUtilization.toFixed(1)}%
              </span>
            </div>
            <Progress value={cacheUtilization} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Age Information */}
        {(statistics.oldestEntry || statistics.newestEntry) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Entry Age</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {statistics.oldestEntry && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Oldest</div>
                  <div className="text-sm font-medium">
                    {formatTimeAgo(statistics.oldestEntry)}
                  </div>
                </div>
              )}
              {statistics.newestEntry && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Newest</div>
                  <div className="text-sm font-medium">
                    {formatTimeAgo(statistics.newestEntry)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {statistics.size === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Cache is empty</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}

function MetricCard({ icon, label, value, description }: MetricCardProps) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}

/**
 * CompactCacheStats Component
 * 
 * Smaller version for dashboard widgets
 */
interface CompactCacheStatsProps {
  className?: string;
}

export function CompactCacheStats({ className }: CompactCacheStatsProps) {
  const { statistics } = useCacheStatistics();

  const hitRate = statistics.hits + statistics.misses > 0
    ? (statistics.hits / (statistics.hits + statistics.misses)) * 100
    : 0;

  return (
    <div className={cn('flex items-center gap-4 p-3 border rounded-lg', className)}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Cache</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Hit Rate:</span>{' '}
          <span className="font-mono font-semibold">{hitRate.toFixed(1)}%</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Size:</span>{' '}
          <span className="font-mono">{statistics.size}/{MAX_CACHE_SIZE}</span>
        </div>
      </div>
    </div>
  );
}
