/**
 * Real-time Activity Feed Component
 * 
 * Live feed of marketplace activity with polling for updates
 * Features:
 * - Real-time updates (polling-based)
 * - Filtering by type and commodity
 * - Highlight large transactions
 * - Auto-refresh
 * - Compact and full modes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface ActivityItem {
  id: string;
  type: string;
  walletAddress: string;
  displayAddress: string;
  commodityType: string;
  amount: number;
  valueUSD: number;
  timestamp: string;
  txHash?: string;
  isLarge: boolean;
  status: string;
}

interface ActivityFeedProps {
  projectId: string;
  mode?: 'compact' | 'full';
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  filters?: {
    type?: string;
    commodity?: string;
    minValue?: number;
  };
  className?: string;
}

export function ActivityFeed({
  projectId,
  mode = 'full',
  limit = 10,
  autoRefresh = true,
  refreshInterval = 15000, // 15 seconds
  filters,
  className
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  
  // Local filters
  const [typeFilter, setTypeFilter] = useState<string>(filters?.type || 'all');
  const [commodityFilter, setCommodityFilter] = useState<string>(filters?.commodity || 'all');

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchActivities = useCallback(async (isPolling = false) => {
    if (!projectId) return;

    try {
      if (!isPolling) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const params = new URLSearchParams({
        project_id: projectId,
        limit: limit.toString()
      });

      if (typeFilter !== 'all') {
        params.append('action_types', typeFilter);
      }
      if (commodityFilter !== 'all') {
        params.append('commodity_type', commodityFilter);
      }
      if (filters?.minValue) {
        params.append('min_value', filters.minValue.toString());
      }

      // Use live endpoint for polling
      const endpoint = isPolling && lastTimestamp
        ? `/api/trade-finance/activity/live?${params.toString()}&since=${lastTimestamp}`
        : `/api/trade-finance/activity/feed?${params.toString()}`;

      const response = await fetch(`${baseURL}${endpoint}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }

      const result = await response.json();
      const newActivities = result.data.activities || result.data;

      if (isPolling && newActivities.length > 0) {
        // Prepend new activities
        setActivities(prev => {
          const combined = [...newActivities, ...prev];
          return combined.slice(0, limit); // Keep only last N items
        });
        setLastTimestamp(newActivities[0].timestamp);
      } else {
        setActivities(newActivities);
        if (newActivities.length > 0) {
          setLastTimestamp(newActivities[0].timestamp);
        }
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, limit, typeFilter, commodityFilter, filters, lastTimestamp]);

  // Initial load
  useEffect(() => {
    fetchActivities(false);
  }, [projectId, typeFilter, commodityFilter]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  const handleRefresh = () => {
    fetchActivities(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'supply':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'withdraw':
        return <ArrowDownCircle className="h-4 w-4 text-orange-600" />;
      case 'borrow':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      case 'repay':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'liquidate':
        return <Activity className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'supply':
        return 'bg-green-100 text-green-800';
      case 'withdraw':
        return 'bg-orange-100 text-orange-800';
      case 'borrow':
        return 'bg-blue-100 text-blue-800';
      case 'repay':
        return 'bg-purple-100 text-purple-800';
      case 'liquidate':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (mode === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Failed to load activity
            </p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.type)}
                    <div>
                      <Badge className={cn('text-xs', getActionColor(activity.type))}>
                        {activity.type.toUpperCase()}
                      </Badge>
                      {activity.isLarge && (
                        <Sparkles className="inline h-3 w-3 ml-1 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${activity.valueUSD.toLocaleString(undefined, {
                        maximumFractionDigits: 0
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
              {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              Real-time marketplace activity{autoRefresh && ' (auto-refreshing)'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="supply">Supply</SelectItem>
              <SelectItem value="withdraw">Withdraw</SelectItem>
              <SelectItem value="borrow">Borrow</SelectItem>
              <SelectItem value="repay">Repay</SelectItem>
              <SelectItem value="liquidate">Liquidate</SelectItem>
            </SelectContent>
          </Select>

          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Commodities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commodities</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="copper">Copper</SelectItem>
              <SelectItem value="oil">Oil</SelectItem>
              <SelectItem value="wheat">Wheat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : error ? (
          <p className="text-muted-foreground text-center py-8">{error}</p>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No activity to display
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-all',
                  activity.isLarge && 'border-yellow-200 bg-yellow-50/50'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(activity.type)}>
                        {activity.type.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium capitalize">
                        {activity.commodityType}
                      </span>
                      {activity.isLarge && (
                        <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                          <Sparkles className="h-3 w-3" />
                          Large
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.displayAddress} • {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {activity.amount.toLocaleString()} {activity.commodityType.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${activity.valueUSD.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  {activity.txHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://etherscan.io/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;
