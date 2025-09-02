/**
 * Comprehensive Audit Dashboard
 * Main dashboard component integrating all audit features from backend
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  RefreshCw,
  Eye,
  Search
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

import { backendAuditService, AuditStatistics, AuditAnalytics } from '@/services/audit/BackendAuditService';
import { AuditEventsTable } from './AuditEventsTable';
import { DatabaseDataTable } from './DatabaseDataTable';

interface ComprehensiveAuditDashboardProps {
  projectId?: string;
  className?: string;
}

export function ComprehensiveAuditDashboard({ 
  projectId, 
  className = '' 
}: ComprehensiveAuditDashboardProps) {
  const [activeTab, setActiveTab] = useState('events');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data states
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsResult, analyticsResult, healthResult] = await Promise.all([
        backendAuditService.getAuditStatistics(),
        backendAuditService.getAuditAnalytics(
          dateRange?.from?.toISOString(),
          dateRange?.to?.toISOString()
        ),
        backendAuditService.getAuditHealth(),
      ]);

      if (statsResult.success) {
        setStatistics(statsResult.data);
      }

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      }

      if (healthResult.success) {
        setHealthStatus(healthResult.data);
      }
    } catch (err) {
      console.error('Error loading audit dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadData();
  }, [dateRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Computed values with defensive null checking
  const overviewMetrics = useMemo(() => {
    if (!statistics || !analytics) return null;

    return {
      totalEvents: statistics?.totalEvents || 0,
      activeUsers: analytics?.userBehavior?.activeUsers || 0,
      systemHealth: statistics?.systemHealth?.score || 0,
      successRate: analytics?.summary?.successRate || 0,
      averageResponseTime: analytics?.performance?.averageResponseTime || 0,
      securityThreats: analytics?.security?.suspiciousActivities || 0,
    };
  }, [statistics, analytics]);

  const handleExportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const result = await backendAuditService.exportAuditData({
        format,
        dateRange: {
          from: dateRange?.from?.toISOString() || '',
          to: dateRange?.to?.toISOString() || '',
        },
        filters: projectId ? { project_id: projectId } : {},
      });

      if (result.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export audit data');
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={loadData}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`comprehensive-audit-dashboard space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Audit Dashboard</h1>
          <p className="text-muted-foreground">
            Complete Audit
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          
          <Select 
            value={refreshInterval.toString()} 
            onValueChange={(value) => setRefreshInterval(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10000">10 seconds</SelectItem>
              <SelectItem value="30000">30 seconds</SelectItem>
              <SelectItem value="60000">1 minute</SelectItem>
              <SelectItem value="300000">5 minutes</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <React.Fragment><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Auto</React.Fragment>
            ) : (
              <React.Fragment><RefreshCw className="h-3 w-3 mr-1" /> Manual</React.Fragment>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <Badge 
                variant={
                  healthStatus.status === 'healthy' ? 'success' :
                  healthStatus.status === 'warning' ? 'secondary' : 'destructive'
                }
              >
                {healthStatus.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Queue Size</p>
                <p className="text-2xl font-bold">{healthStatus.queueSize.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{(healthStatus.errorRate * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Events Processed</p>
                <p className="text-2xl font-bold">{healthStatus.processedEvents.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{Math.floor(healthStatus.uptime / 3600)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      {overviewMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{overviewMetrics.totalEvents.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{overviewMetrics.activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <p className="text-2xl font-bold">{overviewMetrics.systemHealth}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{(overviewMetrics.successRate * 100).toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{overviewMetrics.averageResponseTime}ms</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Security Threats</p>
                  <p className="text-2xl font-bold">{overviewMetrics.securityThreats}</p>
                </div>
                <Shield className={`h-8 w-8 ${
                  overviewMetrics.securityThreats > 0 ? 'text-red-500' : 'text-green-500'
                }`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Dashboard Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">

              <TabsContent value="events">
                <AuditEventsTable 
                  projectId={projectId}
                  dateRange={dateRange}
                  refreshInterval={refreshInterval}
                />
              </TabsContent>

              <TabsContent value="data">
                <DatabaseDataTable 
                  projectId={projectId}
                  dateRange={dateRange}
                  refreshInterval={refreshInterval}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}