/**
 * System Metrics Dashboard
 * Shows overall redemption system health and performance
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Zap
} from 'lucide-react';
import { redemptionOrchestrator } from '@/infrastructure/redemption/orchestrator';

export const SystemMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await redemptionOrchestrator.getSystemMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return <div>Loading metrics...</div>;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Overview metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
                <p className="text-3xl font-bold">{metrics.totalRedemptions}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">{metrics.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{metrics.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-3xl font-bold">{metrics.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Processing Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Average Processing Time</span>
                  <Badge variant="outline">{formatTime(metrics.averageProcessingTime)}</Badge>
                </div>
                <Progress 
                  value={Math.min((metrics.averageProcessingTime / 3600) * 100, 100)} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt;5 minutes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Success Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Approval Rate</span>
                  <Badge 
                    variant={metrics.approvalRate >= 95 ? 'default' : 'destructive'}
                  >
                    {metrics.approvalRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.approvalRate} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Settlement Success</span>
                  <Badge 
                    variant={metrics.settlementSuccess >= 99 ? 'default' : 'destructive'}
                  >
                    {metrics.settlementSuccess.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.settlementSuccess} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Status</CardTitle>
          <CardDescription>Distribution of redemptions across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm">Pending ({metrics.pending})</div>
              <div className="flex-1">
                <Progress 
                  value={(metrics.pending / metrics.totalRedemptions) * 100} 
                  className="h-4"
                />
              </div>
              <div className="w-16 text-right text-sm text-muted-foreground">
                {((metrics.pending / metrics.totalRedemptions) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-32 text-sm">Processing ({metrics.processing})</div>
              <div className="flex-1">
                <Progress 
                  value={(metrics.processing / metrics.totalRedemptions) * 100} 
                  className="h-4"
                />
              </div>
              <div className="w-16 text-right text-sm text-muted-foreground">
                {((metrics.processing / metrics.totalRedemptions) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-32 text-sm">Completed ({metrics.completed})</div>
              <div className="flex-1">
                <Progress 
                  value={(metrics.completed / metrics.totalRedemptions) * 100} 
                  className="h-4"
                />
              </div>
              <div className="w-16 text-right text-sm text-muted-foreground">
                {((metrics.completed / metrics.totalRedemptions) * 100).toFixed(1)}%
              </div>
            </div>

            {metrics.failed > 0 && (
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-red-600">Failed ({metrics.failed})</div>
                <div className="flex-1">
                  <Progress 
                    value={(metrics.failed / metrics.totalRedemptions) * 100} 
                    className="h-4"
                  />
                </div>
                <div className="w-16 text-right text-sm text-red-600">
                  {((metrics.failed / metrics.totalRedemptions) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {metrics.approvalRate >= 95 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <div className="text-sm font-medium">Approval Rate</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.approvalRate >= 95 ? 'Healthy' : 'Needs Attention'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {metrics.settlementSuccess >= 99 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <div className="text-sm font-medium">Settlement Rate</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.settlementSuccess >= 99 ? 'Excellent' : 'Needs Improvement'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {metrics.averageProcessingTime < 300 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <div className="text-sm font-medium">Processing Speed</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.averageProcessingTime < 300 ? 'Fast' : 'Within Target'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
