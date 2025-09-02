/**
 * Anomaly Detection Panel
 * Advanced anomaly detection and pattern analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Eye,
  RefreshCw,
  Zap,
  Target,
  Activity,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

import { backendAuditService, AnomalyDetection } from '@/services/audit/BackendAuditService';

interface AnomalyDetectionPanelProps {
  refreshInterval?: number;
  className?: string;
}

export function AnomalyDetectionPanel({ 
  refreshInterval = 60000,
  className = '' 
}: AnomalyDetectionPanelProps) {
  const [data, setData] = useState<AnomalyDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-red-500';
    if (confidence >= 70) return 'text-orange-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'security_breach':
      case 'unauthorized_access':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'performance_degradation':
      case 'system_overload':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'unusual_activity':
      case 'behavioral_anomaly':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await backendAuditService.getAnomalyDetection();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load anomaly detection data');
      }
    } catch (err) {
      console.error('Error loading anomaly detection data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load anomaly detection data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={loadData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`anomaly-detection-panel space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Anomaly Detection
          </h3>
          <p className="text-sm text-muted-foreground">
            Advanced pattern analysis and threat detection
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Anomalies Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold">{data.anomalies.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Anomalies</p>
                <p className="text-2xl font-bold text-red-500">
                  {data.anomalies.filter(a => a.severity === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Patterns</p>
                <p className="text-2xl font-bold">{data.patterns.length}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Anomalies
          </CardTitle>
          <CardDescription>
            Current anomalies requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.anomalies.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">No Anomalies Detected</p>
              <p className="text-muted-foreground">System behavior appears normal</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.anomalies.map((anomaly) => (
                <div 
                  key={anomaly.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getAnomalyIcon(anomaly.type)}
                        <Badge variant={getSeverityVariant(anomaly.severity)} className="text-xs">
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {anomaly.type.replace('_', ' ')}
                        </Badge>
                        <span className={`text-sm font-medium ${getConfidenceColor(anomaly.confidence)}`}>
                          {anomaly.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-sm mb-2">{anomaly.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(anomaly.timestamp), 'MMM dd, HH:mm:ss')}
                        </div>
                        <div>
                          Affected: {anomaly.affected_entities.length} entities
                        </div>
                      </div>
                      {anomaly.affected_entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {anomaly.affected_entities.slice(0, 5).map((entity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {entity}
                            </Badge>
                          ))}
                          {anomaly.affected_entities.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{anomaly.affected_entities.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <Progress value={anomaly.confidence} className="w-20 h-2" />
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Investigate
                        </Button>
                        <Button variant="outline" size="sm">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {anomaly.evidence && anomaly.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium mb-2">Evidence:</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {anomaly.evidence.slice(0, 3).map((evidence, idx) => (
                          <div key={idx}>• {JSON.stringify(evidence).slice(0, 100)}...</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pattern Analysis
          </CardTitle>
          <CardDescription>
            Detected behavioral patterns and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.patterns.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold">No Patterns Detected</p>
              <p className="text-muted-foreground">Insufficient data for pattern analysis</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.patterns.map((pattern, idx) => (
                <div 
                  key={idx}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {pattern.pattern_type.replace('_', ' ')}
                        </Badge>
                        <Badge 
                          variant={
                            pattern.risk_level === 'high' ? 'destructive' :
                            pattern.risk_level === 'medium' ? 'secondary' : 'outline'
                          } 
                          className="text-xs"
                        >
                          {pattern.risk_level} risk
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pattern.frequency}x frequency
                        </span>
                      </div>
                      <p className="text-sm">{pattern.description}</p>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        Analyze
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Target className="h-3 w-3 mr-1" />
              Adjust Sensitivity
            </Button>
            <Button variant="outline" size="sm">
              <Activity className="h-3 w-3 mr-1" />
              Configure Patterns
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="h-3 w-3 mr-1" />
              Security Rules
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-3 w-3 mr-1" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
