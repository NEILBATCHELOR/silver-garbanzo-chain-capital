/**
 * Activity Metrics Page
 * 
 * Comprehensive analytics dashboard with advanced metrics, trends,
 * anomaly detection, and detailed reporting capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ActivityMetrics from '@/components/activity/ActivityMetrics';
import { 
  enhancedActivityAnalytics,
  SystemHealthScore,
  PerformanceMetrics,
  ActivityAnomaly,
  ActivityTrend,
  UserActivitySummary
} from '@/utils/analytics/activityAnalytics';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Users } from 'lucide-react';

interface ActivityMetricsPageProps {
  projectId?: string;
}

export default function ActivityMetricsPage({ projectId }: ActivityMetricsPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [healthScore, setHealthScore] = useState<SystemHealthScore | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<ActivityAnomaly[]>([]);
  const [trends, setTrends] = useState<ActivityTrend[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserActivitySummary[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const days = parseInt(selectedPeriod);
        
        const [
          healthData,
          performanceData,
          anomaliesData,
          trendsData
        ] = await Promise.all([
          enhancedActivityAnalytics.getSystemHealthScore(projectId),
          enhancedActivityAnalytics.getPerformanceMetrics(projectId, days),
          enhancedActivityAnalytics.getActivityAnomalies(projectId, days * 24), // Convert days to hours
          enhancedActivityAnalytics.getActivityTrends(projectId, days)
        ]);

        setHealthScore(healthData);
        setPerformanceMetrics(performanceData);
        setAnomalies(anomaliesData);
        setTrends(trendsData);

        // Load user summaries separately (requires userId, so we'll get top users instead)
        const analytics = await enhancedActivityAnalytics.getComprehensiveAnalytics(days);
        if (analytics.userActivity) {
          setUserSummaries(analytics.userActivity.map((user: any) => ({
            userId: user.userId,
            userEmail: user.userEmail,
            totalActions: user.totalActivities,
            successfulActions: Math.round(user.totalActivities * (user.successRate / 100)),
            failedActions: user.totalActivities - Math.round(user.totalActivities * (user.successRate / 100)),
            successRate: user.successRate / 100,
            mostCommonActions: [],
            lastActivityTime: new Date(user.lastActivity),
            engagementScore: 75 // Default engagement score
          })));
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    };

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedPeriod, projectId]);

  const getHealthBadgeColor = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    if (score >= 50) return 'destructive';
    return 'destructive';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive system performance metrics and insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Day</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* System Health Overview */}
      {healthScore && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {getHealthIcon(healthScore.score)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthScore.score}/100</div>
              <Badge variant={getHealthBadgeColor(healthScore.score)} className="mt-1">
                {healthScore.status}
              </Badge>
            </CardContent>
          </Card>
          
          {performanceMetrics && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceMetrics.averageResponseTime}ms</div>
                  <p className="text-xs text-muted-foreground">
                    Average response time
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peak Throughput</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceMetrics.peakThroughput}</div>
                  <p className="text-xs text-muted-foreground">events/hour</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(performanceMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Cache efficiency</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              System Anomalies Detected
            </CardTitle>
            <CardDescription>
              {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} detected in the last {selectedPeriod} day{selectedPeriod === '1' ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.slice(0, 3).map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <div>
                    <p className="font-medium">{anomaly.type}</p>
                    <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                  </div>
                  <Badge variant="destructive">{anomaly.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Dashboard */}
      <div className="space-y-6">
        <ActivityMetrics 
          days={parseInt(selectedPeriod)}
          projectId={projectId}
          refreshInterval={60000}
        />
      </div>

      {/* Trends and User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Key activity patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.slice(0, 5).map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trend.date}</p>
                    <p className="text-sm text-muted-foreground">{trend.total} total activities</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {trend.successful > trend.failed ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={trend.successful > trend.failed ? 'text-green-500' : 'text-red-500'}>
                      {((trend.successful / Math.max(trend.total, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
            <CardDescription>Most active users in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userSummaries.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">User {user.userId}</p>
                      <p className="text-sm text-muted-foreground">{user.totalActions} activities</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{(user.successRate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Success rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
