/**
 * Security Dashboard
 * Comprehensive security analytics and threat monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Activity,
  Clock,
  MapPin,
  User,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { backendAuditService } from '@/services/audit/BackendAuditService';

interface SecurityDashboardProps {
  dateRange?: DateRange;
  refreshInterval?: number;
  className?: string;
}

interface SecurityAnalytics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreats: number;
  securityEvents: Array<{
    type: string;
    count: number;
    lastOccurred: string;
    severity: string;
  }>;
  suspiciousActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user_id?: string;
    ip_address?: string;
    risk_score: number;
  }>;
  recommendations: string[];
}

export function SecurityDashboard({ 
  dateRange, 
  refreshInterval = 30000,
  className = '' 
}: SecurityDashboardProps) {
  const [data, setData] = useState<SecurityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getThreatLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getThreatLevelVariant = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'success';
      default: return 'outline';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await backendAuditService.getSecurityAnalytics();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('Failed to load security analytics');
      }
    } catch (err) {
      console.error('Error loading security analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

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
        {Array.from({ length: 4 }).map((_, idx) => (
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
    <div className={`security-dashboard space-y-6 ${className}`}>
      {/* Threat Level Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Threat Level
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`text-4xl font-bold ${getThreatLevelColor(data.threatLevel)}`}>
                {data.threatLevel.toUpperCase()}
              </div>
              <Badge variant={getThreatLevelVariant(data.threatLevel)} className="text-sm">
                {data.activeThreats} Active Threats
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="text-lg font-semibold">
                {data.threatLevel === 'low' ? 'Secure' :
                 data.threatLevel === 'medium' ? 'Monitor' :
                 data.threatLevel === 'high' ? 'Alert' : 'Critical'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.securityEvents.map((event, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getSeverityIcon(event.severity)}
                    <p className="text-sm font-medium">{event.type}</p>
                  </div>
                  <p className="text-2xl font-bold">{event.count}</p>
                  <p className="text-xs text-muted-foreground">
                    Last: {new Date(event.lastOccurred).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={getThreatLevelVariant(event.severity)} className="text-xs">
                  {event.severity}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suspicious Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Activities
          </CardTitle>
          <CardDescription>
            High-risk activities requiring investigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.suspiciousActivities.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">No Suspicious Activities</p>
              <p className="text-muted-foreground">All activities appear normal</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.suspiciousActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {activity.type}
                        </Badge>
                        <span className={`text-sm font-medium ${getRiskScoreColor(activity.risk_score)}`}>
                          Risk Score: {activity.risk_score}/100
                        </span>
                      </div>
                      <p className="text-sm mb-2">{activity.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                        {activity.ip_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.ip_address}
                          </div>
                        )}
                        {activity.user_id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User ID: {activity.user_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress 
                        value={activity.risk_score} 
                        className="w-20 h-2 mb-1"
                      />
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        Investigate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Recommendations
            </CardTitle>
            <CardDescription>
              Suggested actions to improve security posture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((recommendation, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Security Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Shield className="h-3 w-3 mr-1" />
              Run Security Scan
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-3 w-3 mr-1" />
              View Full Report
            </Button>
            <Button variant="outline" size="sm">
              <Lock className="h-3 w-3 mr-1" />
              Update Security Rules
            </Button>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Create Security Alert
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
