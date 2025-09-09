import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Key, 
  Lock, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
  RefreshCw,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";

interface SecurityMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  archivedUsers: number;
  totalCredentials: number;
  activeCredentials: number;
  expiredCredentials: number;
  totalPermissions: number;
  assignedPermissions: number;
  serviceAccounts: number;
  personalAccessTokens: number;
  failedLogins24h: number;
  suspiciousActivity24h: number;
  mfaAdoptionRate: number;
  credentialRotationRate: number;
}

interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'credential' | 'permission' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  event: string;
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface CredentialHealth {
  credentialId: string;
  name: string;
  kind: string;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  warnings: string[];
}

/**
 * Security Analytics Component
 * 
 * Comprehensive security monitoring and analytics including:
 * - User authentication metrics
 * - Credential health monitoring
 * - Permission management oversight
 * - Security event tracking
 * - Risk assessment
 */
export function SecurityAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    archivedUsers: 0,
    totalCredentials: 0,
    activeCredentials: 0,
    expiredCredentials: 0,
    totalPermissions: 0,
    assignedPermissions: 0,
    serviceAccounts: 0,
    personalAccessTokens: 0,
    failedLogins24h: 0,
    suspiciousActivity24h: 0,
    mfaAdoptionRate: 0,
    credentialRotationRate: 0
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [credentialHealth, setCredentialHealth] = useState<CredentialHealth[]>([]);

  const fetchSecurityData = async () => {
    try {
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      const userService = dfnsService.getUserService();
      const credentialService = dfnsService.getCredentialService();
      const permissionService = dfnsService.getPermissionService();
      const serviceAccountService = dfnsService.getServiceAccountService();
      const personalAccessTokenService = dfnsService.getPersonalAccessTokenService();

      // Get user metrics
      const users = await userService.getAllUsers();
      const activeUsers = users.filter(u => u.isActive).length;
      const inactiveUsers = users.filter(u => !u.isActive).length;
      const archivedUsers = users.filter(u => !u.isActive && !u.isRegistered).length;

      // Get credential metrics
      const credentials = await credentialService.listCredentials();
      const activeCredentials = credentials.items.filter(c => c.isActive).length;
      
      // Calculate credential health
      const healthData: CredentialHealth[] = credentials.items.map(cred => {
        const warnings: string[] = [];
        let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

        // Note: Last used tracking is not available in current DFNS credential API
        // Focus on other health indicators instead

        // Check credential age
        const createdAt = new Date(cred.dateCreated);
        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        if (createdAt < yearAgo) {
          warnings.push('Over 1 year old');
          if (healthStatus === 'healthy') healthStatus = 'warning';
        }

        // Check if inactive
        if (!cred.isActive) {
          warnings.push('Inactive credential');
          healthStatus = 'critical';
        }

        return {
          credentialId: cred.credentialUuid,
          name: cred.name,
          kind: cred.kind,
          isActive: cred.isActive,
          lastUsed: undefined, // Not available in current DFNS API
          createdAt: cred.dateCreated,
          healthStatus,
          warnings
        };
      });

      // Get permission metrics
      const permissions = await permissionService.getAllPermissions();
      const permissionAssignments = await permissionService.getAllPermissionAssignments();

      // Get service account and token metrics
      const serviceAccounts = await serviceAccountService.getAllServiceAccounts();
      const personalAccessTokens = await personalAccessTokenService.getAllPersonalAccessTokens();

      // Calculate MFA adoption rate
      const usersWithMultipleCredentials = users.filter(user => {
        const userCreds = credentials.items.filter(c => 
          c.isActive && c.kind === 'Fido2' // WebAuthn credentials
        );
        return userCreds.length >= 1; // At least one active WebAuthn credential
      }).length;
      
      const mfaAdoptionRate = users.length > 0 
        ? (usersWithMultipleCredentials / users.length) * 100 
        : 0;

      // Calculate credential rotation rate (credentials created in last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const recentCredentials = credentials.items.filter(c => 
        new Date(c.dateCreated) > ninetyDaysAgo
      ).length;
      const credentialRotationRate = credentials.items.length > 0 
        ? (recentCredentials / credentials.items.length) * 100 
        : 0;

      // Generate security events from the data
      const events: SecurityEvent[] = [];
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Add user events
      users.forEach(user => {
        // Recent login events
        if (user.lastLoginAt && new Date(user.lastLoginAt) > dayAgo) {
          events.push({
            id: `login-${user.userId}-${user.lastLoginAt}`,
            type: 'authentication',
            severity: 'low',
            event: 'User Login',
            description: `User ${user.username} logged in successfully`,
            timestamp: user.lastLoginAt,
            userId: user.userId,
            username: user.username
          });
        }

        // Inactive user warnings
        if (!user.isActive && user.isRegistered) {
          events.push({
            id: `inactive-${user.userId}`,
            type: 'authorization',
            severity: 'medium',
            event: 'Inactive User',
            description: `User ${user.username} is inactive but registered`,
            timestamp: new Date().toISOString(),
            userId: user.userId,
            username: user.username
          });
        }
      });

      // Add credential events
      credentials.items.forEach(cred => {
        if (new Date(cred.dateCreated) > dayAgo) {
          events.push({
            id: `cred-created-${cred.credentialUuid}`,
            type: 'credential',
            severity: 'low',
            event: 'Credential Created',
            description: `New ${cred.kind} credential "${cred.name}" created`,
            timestamp: cred.dateCreated,
            metadata: {
              credentialId: cred.credentialUuid,
              kind: cred.kind
            }
          });
        }

        // Warn about unhealthy credentials
        const health = healthData.find(h => h.credentialId === cred.credentialUuid);
        if (health && health.healthStatus === 'critical') {
          events.push({
            id: `cred-health-${cred.credentialUuid}`,
            type: 'credential',
            severity: 'high',
            event: 'Credential Health Issue',
            description: `Credential "${cred.name}" has health issues: ${health.warnings.join(', ')}`,
            timestamp: new Date().toISOString(),
            metadata: {
              credentialId: cred.credentialUuid,
              warnings: health.warnings
            }
          });
        }
      });

      // Sort events by timestamp
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Update state
      setMetrics({
        totalUsers: users.length,
        activeUsers,
        inactiveUsers,
        archivedUsers,
        totalCredentials: credentials.items.length,
        activeCredentials,
        expiredCredentials: credentials.items.length - activeCredentials,
        totalPermissions: permissions.length,
        assignedPermissions: permissionAssignments.length,
        serviceAccounts: serviceAccounts.length,
        personalAccessTokens: personalAccessTokens.length,
        failedLogins24h: 0, // TODO: Get from audit logs
        suspiciousActivity24h: events.filter(e => 
          e.severity === 'high' || e.severity === 'critical'
        ).length,
        mfaAdoptionRate,
        credentialRotationRate
      });

      setSecurityEvents(events.slice(0, 100)); // Show last 100 events
      setCredentialHealth(healthData);
      setError(null);
    } catch (error) {
      console.error('Failed to load security data:', error);
      setError(`Failed to load security data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchSecurityData();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSecurityData();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchSecurityData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
    }
  };

  const getSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getHealthIcon = (status: CredentialHealth['healthStatus']) => {
    switch (status) {
      case 'healthy': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'warning': return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading security analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Security Analytics</h2>
          <p className="text-muted-foreground">
            Monitor authentication, credentials, and security events
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {metrics.mfaAdoptionRate.toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">MFA Adoption</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {((metrics.activeCredentials / Math.max(metrics.totalCredentials, 1)) * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Active Credentials</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {metrics.credentialRotationRate.toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Recent Rotation</p>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                metrics.suspiciousActivity24h === 0 ? 'text-green-600' : 
                metrics.suspiciousActivity24h < 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.suspiciousActivity24h}
              </div>
              <p className="text-sm text-muted-foreground">Threats (24h)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Security Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  {metrics.activeUsers} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credentials</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalCredentials}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Shield className="h-3 w-3 text-green-500 mr-1" />
                  {metrics.activeCredentials} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPermissions}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Zap className="h-3 w-3 text-blue-500 mr-1" />
                  {metrics.assignedPermissions} assigned
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.serviceAccounts}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Eye className="h-3 w-3 text-purple-500 mr-1" />
                  {metrics.personalAccessTokens} tokens
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Assessment */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Health</CardTitle>
                <CardDescription>User authentication status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <span className="font-medium text-green-600">{metrics.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inactive Users</span>
                    <span className="font-medium text-yellow-600">{metrics.inactiveUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Archived Users</span>
                    <span className="font-medium text-gray-600">{metrics.archivedUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MFA Adoption</span>
                    <span className="font-medium text-blue-600">{metrics.mfaAdoptionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credential Status</CardTitle>
                <CardDescription>Credential health overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Credentials</span>
                    <span className="font-medium">{metrics.totalCredentials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active</span>
                    <span className="font-medium text-green-600">{metrics.activeCredentials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inactive/Expired</span>
                    <span className="font-medium text-red-600">{metrics.expiredCredentials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rotation Rate (90d)</span>
                    <span className="font-medium text-purple-600">{metrics.credentialRotationRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credential Health Monitor</CardTitle>
              <CardDescription>
                Monitor credential usage and health status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {credentialHealth.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No credentials found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {credentialHealth.map((cred) => (
                    <div 
                      key={cred.credentialId} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {getHealthIcon(cred.healthStatus)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{cred.name}</span>
                            <Badge variant="outline">{cred.kind}</Badge>
                            <Badge 
                              variant={cred.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {cred.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created: {new Date(cred.createdAt).toLocaleDateString()}
                            {cred.lastUsed && (
                              <span> • Last used: {formatTimeAgo(cred.lastUsed)}</span>
                            )}
                          </div>
                          {cred.warnings.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cred.warnings.map((warning, index) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {warning}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          cred.healthStatus === 'healthy' ? 'text-green-600' :
                          cred.healthStatus === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }
                      >
                        {cred.healthStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Recent security-related events and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No security events found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {securityEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getSeverityIcon(event.severity)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{event.event}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSeverityColor(event.severity)}`}
                            >
                              {event.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                          {event.username && (
                            <div className="text-xs text-muted-foreground mt-1">
                              User: {event.username}
                            </div>
                          )}
                          {event.metadata && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
                <CardDescription>Security compliance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Multi-Factor Authentication</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={metrics.mfaAdoptionRate >= 80 ? "default" : "destructive"}
                      >
                        {metrics.mfaAdoptionRate.toFixed(1)}%
                      </Badge>
                      {metrics.mfaAdoptionRate >= 80 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Active User Monitoring</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">
                        {((metrics.activeUsers / Math.max(metrics.totalUsers, 1)) * 100).toFixed(1)}%
                      </Badge>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Credential Rotation</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={metrics.credentialRotationRate >= 25 ? "default" : "secondary"}
                      >
                        {metrics.credentialRotationRate.toFixed(1)}%
                      </Badge>
                      {metrics.credentialRotationRate >= 25 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Security Incidents (24h)</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={metrics.suspiciousActivity24h === 0 ? "default" : "destructive"}
                      >
                        {metrics.suspiciousActivity24h}
                      </Badge>
                      {metrics.suspiciousActivity24h === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Security improvement suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.mfaAdoptionRate < 80 && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Enable MFA for all users</div>
                        <div className="text-muted-foreground">
                          {metrics.totalUsers - Math.floor((metrics.mfaAdoptionRate / 100) * metrics.totalUsers)} users need MFA setup
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {metrics.inactiveUsers > 0 && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Review inactive users</div>
                        <div className="text-muted-foreground">
                          {metrics.inactiveUsers} inactive users should be reviewed
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {metrics.expiredCredentials > 0 && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Clean up expired credentials</div>
                        <div className="text-muted-foreground">
                          {metrics.expiredCredentials} inactive credentials found
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {metrics.credentialRotationRate < 25 && (
                    <div className="flex items-start space-x-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Improve credential rotation</div>
                        <div className="text-muted-foreground">
                          Consider implementing regular credential rotation
                        </div>
                      </div>
                    </div>
                  )}

                  {metrics.mfaAdoptionRate >= 80 && 
                   metrics.inactiveUsers === 0 && 
                   metrics.expiredCredentials === 0 && 
                   metrics.credentialRotationRate >= 25 && (
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium">Security posture is strong</div>
                        <div className="text-muted-foreground">
                          All security recommendations are being followed
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
