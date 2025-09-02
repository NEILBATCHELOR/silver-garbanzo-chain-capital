/**
 * System Process Dashboard Component
 * 
 * Monitors automated processes, batch operations, and background tasks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivityStatus } from '@/services/activity';
import type { ActivityEvent } from '@/services/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

interface SystemProcessDashboardProps {
  limit?: number;
  refreshInterval?: number;
}

interface ProcessMetrics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  failedProcesses: number;
  successRate: number;
  averageDuration: number;
}

const SystemProcessDashboard: React.FC<SystemProcessDashboardProps> = ({
  limit = 20,
  refreshInterval = 30000
}) => {
  const [processes, setProcesses] = useState<ActivityEvent[]>([]);
  const [metrics, setMetrics] = useState<ProcessMetrics>({
    totalProcesses: 0,
    activeProcesses: 0,
    completedProcesses: 0,
    failedProcesses: 0,
    successRate: 0,
    averageDuration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSystemProcesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get system and scheduled activities from the last 24 hours
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const result = await enhancedActivityService.getActivities({
        source: [ActivitySource.SYSTEM],
        startDate: new Date(startDate),
        dateTo: new Date(endDate),
        limit
      });

      const integrationResult = await enhancedActivityService.getActivities({
        source: [ActivitySource.INTEGRATION],
        startDate: new Date(startDate),
        dateTo: new Date(endDate),
        limit
      });

      // Combine and sort by timestamp
      const allProcesses = [...result.activities, ...integrationResult.activities]
        .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime())
        .slice(0, limit);

      setProcesses(allProcesses);

      // Calculate metrics
      const totalProcesses = result.total + integrationResult.total;
      const completedProcesses = allProcesses.filter(p => p.status === ActivityStatus.SUCCESS).length;
      const failedProcesses = allProcesses.filter(p => p.status === ActivityStatus.FAILURE).length;
      const activeProcesses = allProcesses.filter(p => p.status === ActivityStatus.PENDING).length;
      const successRate = totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : 0;
      
      // Calculate average duration
      const durationsMs = allProcesses
        .filter(p => p.duration && p.duration > 0)
        .map(p => p.duration!);
      const averageDuration = durationsMs.length > 0 
        ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length 
        : 0;

      setMetrics({
        totalProcesses,
        activeProcesses,
        completedProcesses,
        failedProcesses,
        successRate,
        averageDuration
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system processes');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadSystemProcesses();
  }, [loadSystemProcesses]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadSystemProcesses, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadSystemProcesses, refreshInterval]);

  const getProcessIcon = (action: string, status?: ActivityStatus) => {
    if (status === ActivityStatus.PENDING) return Clock;
    if (status === ActivityStatus.FAILURE) return AlertCircle;
    if (status === ActivityStatus.SUCCESS) return CheckCircle;
    return Activity;
  };

  const getProcessColor = (status?: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.SUCCESS: return 'text-green-500';
      case ActivityStatus.FAILURE: return 'text-red-500';
      case ActivityStatus.PENDING: return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getStatusBadgeVariant = (status?: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.SUCCESS: return 'default';
      case ActivityStatus.FAILURE: return 'destructive';
      case ActivityStatus.PENDING: return 'secondary';
      default: return 'outline';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading system processes: {error}</span>
          </div>
          <Button onClick={loadSystemProcesses} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Processes</p>
                <p className="text-2xl font-bold">{metrics.totalProcesses}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-yellow-500">{metrics.activeProcesses}</p>
              </div>
              <Play className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-500">{metrics.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={metrics.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{metrics.averageDuration.toFixed(0)}ms</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Recent System Processes
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadSystemProcesses} 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading processes...</span>
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No system processes found</p>
              <p className="text-sm">Check back later for process activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processes.map((process) => {
                const ProcessIcon = getProcessIcon(process.action, process.status);
                const processColor = getProcessColor(process.status);
                
                return (
                  <div
                    key={process.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <ProcessIcon className={`h-5 w-5 mt-0.5 ${processColor}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{process.action}</span>
                          <Badge variant={getStatusBadgeVariant(process.status)}>
                            {process.status || 'unknown'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {process.source}
                          </Badge>
                          {process.category && (
                            <Badge variant="secondary" className="text-xs">
                              {process.category}
                            </Badge>
                          )}
                        </div>
                        
                        {process.details && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {process.details}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {process.timestamp && format(new Date(process.timestamp), 'MMM dd, HH:mm:ss')}
                          </span>
                          
                          {process.entityType && process.entityId && (
                            <span>
                              {process.entityType}: {process.entityId}
                            </span>
                          )}
                          
                          {process.duration && (
                            <span>
                              Duration: {process.duration}ms
                            </span>
                          )}
                          
                          {process.metadata?.itemCount && (
                            <span>
                              Items: {process.metadata.itemCount}
                            </span>
                          )}
                        </div>
                        
                        {process.metadata && Object.keys(process.metadata).length > 0 && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(process.metadata).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="text-muted-foreground">
                                  {key}: {JSON.stringify(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemProcessDashboard;
