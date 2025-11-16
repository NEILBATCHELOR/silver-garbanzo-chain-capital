/**
 * Redemption Lifecycle Dashboard
 * Shows complete redemption journey from request to settlement
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  ArrowRight
} from 'lucide-react';
import {
  redemptionOrchestrator,
  type OrchestrationResult,
  type RedemptionLifecycleStatus
} from '@/infrastructure/redemption/orchestrator';

interface Props {
  redemptionId: string;
  onRefresh?: () => void;
}

export const RedemptionLifecycleDashboard: React.FC<Props> = ({
  redemptionId,
  onRefresh
}) => {
  const [lifecycle, setLifecycle] = useState<OrchestrationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLifecycle();
  }, [redemptionId]);

  const loadLifecycle = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await redemptionOrchestrator.getLifecycleStatus(redemptionId);
      setLifecycle(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lifecycle');
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: RedemptionLifecycleStatus) => {
    if (stage.status === 'completed') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (stage.status === 'in_progress') return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    if (stage.status === 'failed') return <XCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading lifecycle...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !lifecycle) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            {error || 'Failed to load lifecycle'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Redemption Lifecycle</CardTitle>
              <CardDescription>
                Complete journey from request to settlement
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                loadLifecycle();
                onRefresh?.();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall status */}
          <div className="flex items-center gap-4 mb-6">
            <Badge variant={lifecycle.success ? 'default' : 'destructive'} className="text-sm">
              {lifecycle.success ? 'In Progress' : 'Failed'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Current: {lifecycle.currentStage.stage}
            </span>
            <span className="text-sm text-muted-foreground">
              Duration: {Math.round(lifecycle.metrics.totalDuration / 1000)}s
            </span>
          </div>

          {/* Lifecycle stages */}
          <div className="space-y-4">
            {lifecycle.lifecycleStages.map((stage, index) => (
              <div key={stage.stage} className="relative">
                {/* Connection line */}
                {index < lifecycle.lifecycleStages.length - 1 && (
                  <div className="absolute left-[10px] top-[32px] h-[calc(100%+1rem)] w-[2px] bg-gray-200" />
                )}

                {/* Stage card */}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                    {getStageIcon(stage)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className={`rounded-lg p-4 ${getStageColor(stage.status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize">
                          {stage.stage.replace('_', ' ')}
                        </h4>
                        <Badge variant="outline" className="capitalize">
                          {stage.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-sm mb-2">{stage.message}</p>

                      {stage.details && (
                        <div className="text-xs space-y-1 mt-3">
                          {Object.entries(stage.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {stage.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          Error: {stage.error}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(stage.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Duration</div>
              <div className="text-2xl font-bold">
                {Math.round(lifecycle.metrics.totalDuration / 1000)}s
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Validation Checks</div>
              <div className="text-2xl font-bold">{lifecycle.metrics.validationChecks}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Rules Evaluated</div>
              <div className="text-2xl font-bold">{lifecycle.metrics.rulesEvaluated}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Transfers</div>
              <div className="text-2xl font-bold">{lifecycle.metrics.transfersExecuted}/2</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Stage Timings</h4>
            {Object.entries(lifecycle.metrics.stageTimings).map(([stage, time]) => (
              <div key={stage} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{stage}:</span>
                <span className="font-medium">{time}ms</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
