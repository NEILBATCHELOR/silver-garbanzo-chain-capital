/**
 * Activity Monitor Page
 * 
 * Real-time activity monitoring dashboard with comprehensive filtering,
 * virtual scrolling, and live updates.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Organization Context
import { OrganizationSelector, useOrganizationContext } from '@/components/organizations';
import ActivityMonitor from '@/components/activity/ActivityMonitor';
import ActivityMetrics from '@/components/activity/ActivityMetrics';
import SystemProcessDashboard from '@/components/activity/SystemProcessDashboard';
import DatabaseChangeLog from '@/components/activity/DatabaseChangeLog';
import { enhancedActivityService, ActivityFilters } from '@/services/activity';
import { enhancedActivityAnalytics } from '@/utils/analytics/activityAnalytics';
import { Play, Pause, RefreshCw, Download, Filter } from 'lucide-react';

interface ActivityMonitorPageProps {
  projectId?: string;
}

export default function ActivityMonitorPage({ projectId }: ActivityMonitorPageProps) {
  const { selectedOrganization, shouldShowSelector } = useOrganizationContext();
  const [activeTab, setActiveTab] = useState('monitor');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [queueMetrics, setQueueMetrics] = useState({
    queueSize: 0,
    processingRate: 0,
    errorRate: 0,
    cacheSize: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      // TODO: Filter metrics by organization when service supports it
      const metrics = enhancedActivityService.getQueueMetrics();
      setQueueMetrics(metrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [selectedOrganization]);

  const handleExport = async () => {
    try {
      const activities = await enhancedActivityService.getActivities({
        limit: 1000,
        ...filters
      });
      
      const csvData = activities.activities.map(activity => ({
        timestamp: new Date(activity.timestamp).toISOString(),
        source: activity.source,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        status: activity.status,
        details: activity.details
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFlushQueue = async () => {
    try {
      await enhancedActivityService.flushQueue();
    } catch (error) {
      console.error('Flush failed:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Monitor</h1>
          <p className="text-muted-foreground">
            Real-time system activity monitoring and analytics
            {selectedOrganization && (
              <span className="block mt-1 text-sm text-blue-600">
                Organization: {selectedOrganization.name}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {shouldShowSelector && (
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Organization</label>
              <OrganizationSelector compact={true} />
            </div>
          )}
          <Badge variant={isRealTimeEnabled ? "default" : "secondary"}>
            {isRealTimeEnabled ? "Live" : "Paused"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
          >
            {isRealTimeEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleFlushQueue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Queue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueMetrics.queueSize}</div>
            <p className="text-xs text-muted-foreground">Pending activities</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueMetrics.processingRate}</div>
            <p className="text-xs text-muted-foreground">Activities/sec</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(queueMetrics.errorRate * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Error percentage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueMetrics.cacheSize}</div>
            <p className="text-xs text-muted-foreground">Cached entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="px-4 py-2">
          <TabsList className="grid w-full grid-cols-4 h-11">
            <TabsTrigger value="monitor" className="px-6 py-2">Activity Monitor</TabsTrigger>
            <TabsTrigger value="processes" className="px-6 py-2">System Processes</TabsTrigger>
            <TabsTrigger value="database" className="px-6 py-2">Database</TabsTrigger>
            <TabsTrigger value="metrics" className="px-6 py-2">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monitor" className="space-y-4 pt-4">
          <ActivityMonitor 
            projectId={projectId}
            height={600}
            refreshInterval={isRealTimeEnabled ? 30000 : 0}
            showHeader={false}
          />
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <SystemProcessDashboard 
            limit={50}
            refreshInterval={isRealTimeEnabled ? 30000 : 0}
          />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseChangeLog 
            limit={100}
            showHeader={false}
            refreshInterval={isRealTimeEnabled ? 30000 : 0}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <ActivityMetrics days={7} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
