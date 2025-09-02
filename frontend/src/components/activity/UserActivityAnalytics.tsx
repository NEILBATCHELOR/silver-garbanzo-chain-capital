/**
 * User Activity Analytics
 * Comprehensive user behavior analysis and insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock,
  AlertTriangle,
  TrendingUp,
  Eye,
  RefreshCw,
  User,
  Activity,
  MapPin,
  Globe
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { backendAuditService, AuditAnalytics } from '@/services/audit/BackendAuditService';

interface UserActivityAnalyticsProps {
  dateRange?: DateRange;
  analytics?: AuditAnalytics | null;
  className?: string;
}

export function UserActivityAnalytics({ 
  dateRange, 
  analytics: propAnalytics,
  className = '' 
}: UserActivityAnalyticsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analytics = propAnalytics;

  const loadUserAnalytics = async (userId: string) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);

      const result = await backendAuditService.getUserAuditAnalytics(userId);

      if (result.success) {
        setUserAnalytics(result.data);
      } else {
        throw new Error('Failed to load user analytics');
      }
    } catch (err) {
      console.error('Error loading user analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadUserAnalytics(selectedUserId);
    }
  }, [selectedUserId]);

  if (!analytics) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          No analytics data available. Please ensure the audit system is properly configured.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`user-activity-analytics space-y-6 ${className}`}>
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.userBehavior.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold">
                  {Math.round(analytics.userBehavior.averageSessionDuration / 60)}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{analytics.summary.totalEvents.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold">{analytics.summary.uniqueUsers}</p>
              </div>
              <User className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Top Pages
          </CardTitle>
          <CardDescription>
            Most visited pages by user activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.userBehavior.topPages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No page data available</p>
          ) : (
            <div className="space-y-3">
              {analytics.userBehavior.topPages.slice(0, 10).map((page, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{page.page}</p>
                      <p className="text-xs text-muted-foreground">{page.visits} visits</p>
                    </div>
                  </div>
                  <Progress 
                    value={(page.visits / analytics.userBehavior.topPages[0].visits) * 100} 
                    className="w-20 h-2"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Actions
          </CardTitle>
          <CardDescription>
            Most frequent user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.userBehavior.topActions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No action data available</p>
          ) : (
            <div className="space-y-3">
              {analytics.userBehavior.topActions.slice(0, 10).map((action, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{action.action}</p>
                      <p className="text-xs text-muted-foreground">{action.count} times</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {action.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Trends
          </CardTitle>
          <CardDescription>
            User activity patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Daily Trend */}
            <div>
              <h4 className="text-sm font-medium mb-2">Daily Activity</h4>
              <div className="flex items-end space-x-1 h-32">
                {analytics.trends.daily.slice(-7).map((day, idx) => {
                  const maxEvents = Math.max(...analytics.trends.daily.slice(-7).map(d => d.events));
                  const height = (day.events / maxEvents) * 100;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div 
                        className="bg-blue-500 w-full rounded-t-sm min-h-[4px]"
                        style={{ height: `${height}%` }}
                        title={`${day.events} events on ${day.date}`}
                      ></div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly Pattern */}
            <div>
              <h4 className="text-sm font-medium mb-2">Hourly Pattern</h4>
              <div className="flex items-end space-x-1 h-24">
                {analytics.trends.hourly.map((hour) => {
                  const maxEvents = Math.max(...analytics.trends.hourly.map(h => h.events));
                  const height = maxEvents > 0 ? (hour.events / maxEvents) * 100 : 0;
                  
                  return (
                    <div key={hour.hour} className="flex flex-col items-center flex-1">
                      <div 
                        className="bg-green-500 w-full rounded-t-sm min-h-[2px]"
                        style={{ height: `${height}%` }}
                        title={`${hour.events} events at ${hour.hour}:00`}
                      ></div>
                      {hour.hour % 4 === 0 && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {hour.hour}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual User Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Individual User Analysis
          </CardTitle>
          <CardDescription>
            Detailed analysis for specific users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a user to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {/* Note: In a real implementation, you'd load this from the user list */}
                <SelectItem value="user1">John Doe (john@example.com)</SelectItem>
                <SelectItem value="user2">Jane Smith (jane@example.com)</SelectItem>
                <SelectItem value="user3">Bob Johnson (bob@example.com)</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedUserId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => loadUserAnalytics(selectedUserId)}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading user analytics...</span>
            </div>
          )}

          {userAnalytics && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Actions</p>
                    <p className="text-xl font-bold">{userAnalytics.totalActions}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Avg Session</p>
                    <p className="text-xl font-bold">
                      {Math.round(userAnalytics.sessionMetrics.averageDuration / 60)}m
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-xl font-bold">{userAnalytics.sessionMetrics.totalSessions}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Common Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {userAnalytics.commonActions.slice(0, 5).map((action: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">{action.action}</span>
                        <Badge variant="secondary" className="text-xs">{action.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Security Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userAnalytics.securityEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No security events</p>
                    ) : (
                      <div className="space-y-2">
                        {userAnalytics.securityEvents.slice(0, 3).map((event: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{event.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={event.severity === 'high' ? 'destructive' : 'secondary'}>
                              {event.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
