/**
 * Activity Metrics Component
 * 
 * Visual analytics and performance metrics for system activities
 */

import React, { useState, useEffect, useCallback } from 'react';
import { enhancedActivityAnalytics } from '@/utils/analytics/activityAnalytics';
import type { SystemHealthScore } from '@/utils/analytics/activityAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';

interface ActivityMetricsProps {
  days?: number;
  refreshInterval?: number;
  projectId?: string;
  className?: string;
}

interface MetricsData {
  overview: {
    totalActivities: number;
    successRate: number;
    errorRate: number;
    uniqueUsers: number;
  };
  trends: {
    dailyActivity: Array<{ date: string; count: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
    sourceDistribution: Array<{ category: string; count: number; percentage: number }>;
    categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
  };
  performance: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    queueHealth: 'good' | 'warning' | 'critical';
    cacheHitRate: number;
  };
  topActions: Array<{ action: string; count: number }>;
  userActivity: Array<{
    userId: string;
    userEmail: string;
    totalActivities: number;
    lastActivity: string;
    activeDays: number;
    successRate: number;
  }>;
}

const ActivityMetrics: React.FC<ActivityMetricsProps> = ({
  days = 7,
  refreshInterval = 60000,
  projectId,
  className
}) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthScore | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(days.toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const periodDays = parseInt(selectedPeriod);
      
      // Load comprehensive analytics
      const analyticsData = await enhancedActivityAnalytics.getComprehensiveAnalytics(periodDays);
      setMetrics(analyticsData);

      // Load system health score
      const healthData = await enhancedActivityAnalytics.getSystemHealthScore();
      setSystemHealth(healthData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadMetrics, refreshInterval]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return CheckCircle;
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading metrics: {error}</span>
          </div>
          <Button onClick={loadMetrics} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadMetrics} 
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading metrics...</span>
        </div>
      ) : metrics && systemHealth ? (
        <>
          {/* System Health Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  {React.createElement(getHealthStatusIcon(systemHealth.status), {
                    className: `h-8 w-8 ${getHealthStatusColor(systemHealth.status)}`
                  })}
                  <div>
                    <div className="text-3xl font-bold">{systemHealth.score}/100</div>
                    <div className={`text-sm font-medium ${getHealthStatusColor(systemHealth.status)}`}>
                      {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <Progress value={systemHealth.score} className="mb-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className="font-medium">{((1 - systemHealth.factors.errorRate) * 100).toFixed(0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{Math.max(0, (100 - Math.min(systemHealth.factors.responseTime / 1000, 100))).toFixed(0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Load</span>
                      <span className="font-medium">{(100 - systemHealth.factors.systemLoad).toFixed(0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Compliance</span>
                      <span className="font-medium">{(systemHealth.factors.complianceRate * 100).toFixed(0)}/100</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.overview.totalActivities)}</p>
                    <p className="text-xs text-muted-foreground">
                      {(metrics.overview.totalActivities / parseInt(selectedPeriod)).toFixed(1)}/day avg
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-green-500">{metrics.overview.successRate.toFixed(1)}%</p>
                    <Progress value={metrics.overview.successRate} className="mt-1" />
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{metrics.overview.uniqueUsers}</p>
                    <p className="text-xs text-muted-foreground">
                      {(metrics.overview.totalActivities / Math.max(metrics.overview.uniqueUsers, 1)).toFixed(1)} avg/user
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Performance</p>
                    <p className="text-2xl font-bold">{metrics.performance.averageResponseTime.toFixed(0)}ms</p>
                    <p className="text-xs text-muted-foreground">
                      Cache: {metrics.performance.cacheHitRate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.trends.sourceDistribution.slice(0, 5).map((source) => (
                    <div key={source.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{source.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(source.count)} activities
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-right text-sm font-medium">
                          {source.percentage.toFixed(1)}%
                        </div>
                        <Progress value={source.percentage} className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.trends.categoryDistribution.slice(0, 5).map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{category.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(category.count)} activities
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 text-right text-sm font-medium">
                          {category.percentage.toFixed(1)}%
                        </div>
                        <Progress value={category.percentage} className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Most Frequent Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.topActions.slice(0, 6).map((action, index) => (
                  <div key={action.action} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{action.action}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(action.count)} times</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Active Users */}
          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.userActivity.slice(0, 5).map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.userEmail || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.activeDays} active days • {user.successRate.toFixed(1)}% success rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatNumber(user.totalActivities)}</p>
                      <p className="text-sm text-muted-foreground">activities</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Response Time</span>
                  </div>
                  <p className="text-2xl font-bold">{metrics.performance.averageResponseTime.toFixed(0)}ms</p>
                  <p className="text-sm text-muted-foreground">Average response</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Cache Hit Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{metrics.performance.cacheHitRate.toFixed(1)}%</p>
                  <Progress value={metrics.performance.cacheHitRate} className="mt-1" />
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Throughput</span>
                  </div>
                  <p className="text-2xl font-bold">{metrics.performance.throughput.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Activities/day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default ActivityMetrics;
