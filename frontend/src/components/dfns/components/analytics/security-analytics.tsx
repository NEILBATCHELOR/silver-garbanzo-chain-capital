import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  Key,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface SecurityAnalyticsProps {
  className?: string;
}

interface SecurityMetrics {
  credentialCount: number;
  activeUsers: number;
  securityScore: number;
  recentEvents: Array<{
    type: 'login' | 'credential_added' | 'permission_changed' | 'suspicious_activity';
    description: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  compliance: {
    mfa: boolean;
    webauthn: boolean;
    userActionSigning: boolean;
  };
}

/**
 * Security Analytics Component
 * Shows comprehensive security metrics and events
 */
export function SecurityAnalytics({ className }: SecurityAnalyticsProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get severity color and icon
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'login': return <Users className="h-4 w-4" />;
      case 'credential_added': return <Key className="h-4 w-4" />;
      case 'permission_changed': return <Shield className="h-4 w-4" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Load security metrics
  useEffect(() => {
    const loadSecurityMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view security analytics');
          return;
        }

        // Mock security data - replace with real security analytics service
        const mockMetrics: SecurityMetrics = {
          credentialCount: 18,
          activeUsers: 12,
          securityScore: 92,
          recentEvents: [
            {
              type: 'login',
              description: 'User logged in from new device',
              timestamp: new Date().toISOString(),
              severity: 'medium'
            },
            {
              type: 'credential_added',
              description: 'WebAuthn credential registered',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              severity: 'low'
            }
          ],
          compliance: {
            mfa: true,
            webauthn: true,
            userActionSigning: true
          }
        };

        setMetrics(mockMetrics);

      } catch (err: any) {
        console.error('Error loading security analytics:', err);
        setError(err.message || 'Failed to load security analytics');
        toast({
          title: "Error",
          description: "Failed to load security analytics. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSecurityMetrics();
  }, [toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Analytics
          </CardTitle>
          <CardDescription>Loading security data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading security analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{metrics.securityScore}</div>
              <div className="text-sm text-muted-foreground">Security Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.credentialCount}</div>
              <div className="text-sm text-muted-foreground">Credentials</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-muted-foreground">Compliance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Compliance</CardTitle>
          <CardDescription>Enterprise security features status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Multi-Factor Authentication</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">WebAuthn</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">User Action Signing</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>Latest security activity and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`mt-1 ${getSeverityColor(event.severity)}`}>
                  {getSeverityIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{event.description}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge 
                    variant={event.severity === 'high' ? 'destructive' : event.severity === 'medium' ? 'secondary' : 'default'}
                    className="text-xs mt-1"
                  >
                    {event.severity} priority
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
