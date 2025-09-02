/**
 * Enhanced Activity Monitor Component
 * 
 * High-performance activity monitoring component with virtual scrolling,
 * real-time updates, advanced filtering, and export capabilities.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivityStatus, ActivitySeverity } from '@/services/activity';
import type { ActivityEvent, ActivityFilters } from '@/services/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  Download, 
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityMonitorProps {
  projectId?: string;
  height?: number;
  refreshInterval?: number;
  showHeader?: boolean;
  compactMode?: boolean;
  hideSystemAndMetricsTabs?: boolean;
  limit?: number;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  projectId,
  height = 600,
  refreshInterval = 30000,
  showHeader = true,
  compactMode = false,
  hideSystemAndMetricsTabs = false,
  limit = 100
}) => {
  // State management
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ActivitySource | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ActivitySeverity | 'all'>('all');
  const [dateRange, setDateRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Queue metrics state
  const [queueMetrics, setQueueMetrics] = useState({
    queueSize: 0,
    cacheSize: 0,
    processingRate: 0,
    errorRate: 0
  });

  // Load activities
  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date().toISOString();
      let startDate: string;
      
      switch (dateRange) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      }

      const filters: ActivityFilters = {
        startDate: new Date(startDate),
        dateTo: new Date(endDate),
        limit,
        ...(projectId && { projectId }),
        ...(sourceFilter !== 'all' && { source: [sourceFilter as ActivitySource] }),
        ...(categoryFilter !== 'all' && { category: [categoryFilter as ActivityCategory] }),
        ...(statusFilter !== 'all' && { status: [statusFilter as ActivityStatus] }),
        ...(severityFilter !== 'all' && { severity: [severityFilter as ActivitySeverity] })
      };

      const result = await enhancedActivityService.getActivities(filters);
      setActivities(result.activities);
      setTotalCount(result.totalCount);
      
      // Get queue metrics
      const metrics = enhancedActivityService.getQueueMetrics();
      setQueueMetrics(metrics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [projectId, limit, sourceFilter, categoryFilter, statusFilter, severityFilter, dateRange]);

  // Filter activities based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return activities;
    }

    return activities.filter(activity => 
      activity.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Set up auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadActivities, refreshInterval]);

  // Export activities
  const handleExport = useCallback(async () => {
    try {
      const dataToExport = filteredData.map(activity => ({
        timestamp: activity.timestamp,
        action: activity.action,
        source: activity.source,
        category: activity.category,
        status: activity.status,
        severity: activity.severity,
        entityType: activity.entityType,
        entityId: activity.entityId,
        userId: activity.userId,
        userEmail: activity.userEmail,
        details: activity.details
      }));

      const csv = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).map(val => 
          JSON.stringify(val || '')).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [filteredData]);

  // Get status icon and color
  const getStatusDisplay = (status?: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.SUCCESS:
        return { icon: CheckCircle, className: 'text-green-500', label: 'Success' };
      case ActivityStatus.FAILURE:
        return { icon: XCircle, className: 'text-red-500', label: 'Failed' };
      case ActivityStatus.PENDING:
        return { icon: Clock, className: 'text-yellow-500', label: 'Pending' };
      case ActivityStatus.CANCELLED:
        return { icon: XCircle, className: 'text-gray-500', label: 'Canceled' };
      default:
        return { icon: Activity, className: 'text-blue-500', label: 'Unknown' };
    }
  };

  // Get severity badge variant
  const getSeverityVariant = (severity?: ActivitySeverity) => {
    switch (severity) {
      case ActivitySeverity.CRITICAL:
        return 'destructive';
      case ActivitySeverity.WARNING:
        return 'default';
      case ActivitySeverity.NOTICE:
        return 'secondary';
      case ActivitySeverity.INFO:
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading activities: {error}</span>
          </div>
          <Button onClick={loadActivities} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Monitor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount} activities • Queue: {queueMetrics.queueSize} • Cache: {queueMetrics.cacheSize}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={filteredData.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadActivities} 
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 pt-4">
          {/* Search and Time Range */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Options */}
          <div className="flex gap-2 flex-wrap">
            <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value={ActivitySource.USER}>User</SelectItem>
                <SelectItem value={ActivitySource.SYSTEM}>System</SelectItem>
                <SelectItem value={ActivitySource.INTEGRATION}>Integration</SelectItem>
                <SelectItem value={ActivitySource.DATABASE}>Database</SelectItem>
                <SelectItem value={ActivitySource.API}>API</SelectItem>
                <SelectItem value={ActivitySource.BLOCKCHAIN}>Blockchain</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value={ActivityCategory.AUTH}>Auth</SelectItem>
                <SelectItem value={ActivityCategory.USER_MANAGEMENT}>User Mgmt</SelectItem>
                <SelectItem value={ActivityCategory.DATA}>Data</SelectItem>
                <SelectItem value={ActivityCategory.SYSTEM}>System</SelectItem>
                <SelectItem value={ActivityCategory.INTEGRATION}>Integration</SelectItem>
                <SelectItem value={ActivityCategory.COMPLIANCE}>Compliance</SelectItem>
                <SelectItem value={ActivityCategory.FINANCIAL}>Financial</SelectItem>
                <SelectItem value={ActivityCategory.SECURITY}>Security</SelectItem>
                <SelectItem value={ActivityCategory.BLOCKCHAIN}>Blockchain</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ActivityStatus.SUCCESS}>Success</SelectItem>
                <SelectItem value={ActivityStatus.FAILURE}>Failed</SelectItem>
                <SelectItem value={ActivityStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ActivityStatus.CANCELLED}>Canceled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value={ActivitySeverity.INFO}>Info</SelectItem>
                <SelectItem value={ActivitySeverity.NOTICE}>Notice</SelectItem>
                <SelectItem value={ActivitySeverity.WARNING}>Warning</SelectItem>
                <SelectItem value={ActivitySeverity.CRITICAL}>Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activities List */}
        <ScrollArea style={{ height: `${height}px` }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading activities...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
              <p className="text-sm">Try adjusting your filters or time range</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map((activity) => {
                const statusDisplay = getStatusDisplay(activity.status);
                const StatusIcon = statusDisplay.icon;
                
                return (
                  <div
                    key={activity.id}
                    className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                      compactMode ? 'py-2' : 'py-4'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`h-5 w-5 mt-0.5 ${statusDisplay.className}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{activity.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.source}
                          </Badge>
                          {activity.category && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.category}
                            </Badge>
                          )}
                          {activity.severity && (
                            <Badge variant={getSeverityVariant(activity.severity)} className="text-xs">
                              {activity.severity}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {activity.details && (
                            <p className="truncate mb-1">{activity.details}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {activity.timestamp && format(new Date(activity.timestamp), 'MMM dd, HH:mm:ss')}
                            </span>
                            
                            {activity.userEmail && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {activity.userEmail}
                              </span>
                            )}
                            
                            {activity.entityType && activity.entityId && (
                              <span className="truncate">
                                {activity.entityType}: {activity.entityId}
                              </span>
                            )}
                            
                            {activity.duration && (
                              <span>{activity.duration}ms</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityMonitor;
