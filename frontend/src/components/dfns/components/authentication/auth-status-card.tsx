import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  CheckCircle,
  AlertTriangle,
  User,
  Key,
  RefreshCw,
  ExternalLink,
  Loader2,
  Clock,
  Fingerprint,
  Users,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { AuthenticationStatus, AuthenticationMethod } from '@/services/dfns/authenticationService';

interface EnhancedAuthData {
  serviceAccounts: number;
  personalTokens: number;
  credentials: number;
  users: number;
  loading: boolean;
  error: string | null;
}

interface AuthStatusCardProps {
  showRefreshButton?: boolean;
  showActions?: boolean;
  compact?: boolean;
  showCounts?: boolean;
}

/**
 * DFNS Authentication Status Card
 * Shows current authentication state AND real counts from all DFNS services
 * Includes Service Accounts, Personal Tokens, Credentials, and Users
 */
export function AuthStatusCard({ 
  showRefreshButton = true, 
  showActions = true,
  compact = false,
  showCounts = true
}: AuthStatusCardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>({
    isAuthenticated: false,
    connected: false,
    method: 'NONE',
    methodDisplayName: 'Not Connected',
    user: null,
    isReady: false,
    credentialsCount: 0,
    walletsCount: 0,
    hasCredentialAccess: false,
    error: '',
    tokenExpiry: '',
    lastValidated: '',
    permissions: []
  });

  const [enhancedData, setEnhancedData] = useState<EnhancedAuthData>({
    serviceAccounts: 0,
    personalTokens: 0,
    credentials: 0,
    users: 0,
    loading: true,
    error: null
  });

  const { toast } = useToast();

  // Load authentication status and enhanced data
  const loadAuthData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading enhanced auth data...');
      const dfnsService = await initializeDfnsService();
      
      // Get basic auth status
      const authService = dfnsService.getAuthenticationService();
      const status = await authService.getAuthenticationStatus();
      
      setAuthStatus(status);

      if (status.isAuthenticated && showCounts) {
        // Fetch real data from all DFNS services
        console.log('📊 Fetching data from DFNS services...');
        
        const [serviceAccountsResult, personalTokensResult, credentialsResult, usersResult] = await Promise.allSettled([
          // Service Accounts
          dfnsService.getServiceAccountManagementService()
            .getAllServiceAccounts()
            .then(result => result.success ? result.data?.length || 0 : 0)
            .catch(error => {
              console.warn('Service accounts fetch failed:', error);
              return 0;
            }),
          
          // Personal Access Tokens
          dfnsService.getPersonalAccessTokenManagementService()
            .listPersonalAccessTokens()
            .then(result => result.success ? result.data?.items?.length || 0 : 0)
            .catch(error => {
              console.warn('Personal tokens fetch failed:', error);
              return 0;
            }),
          
          // Credentials
          dfnsService.getCredentialManagementService()
            .listCredentials()
            .then(result => result.length || 0)
            .catch(error => {
              console.warn('Credentials fetch failed:', error);
              return 0;
            }),
          
          // Users
          dfnsService.getUserManagementService()
            .listUsers()
            .then(result => result.success ? result.data?.items?.length || 0 : 0)
            .catch(error => {
              console.warn('Users fetch failed:', error);
              return 0;
            })
        ]);

        const serviceAccounts = serviceAccountsResult.status === 'fulfilled' ? serviceAccountsResult.value : 0;
        const personalTokens = personalTokensResult.status === 'fulfilled' ? personalTokensResult.value : 0;
        const credentials = credentialsResult.status === 'fulfilled' ? credentialsResult.value : 0;
        const users = usersResult.status === 'fulfilled' ? usersResult.value : 0;

        console.log('✅ Enhanced auth data loaded:', {
          serviceAccounts,
          personalTokens, 
          credentials,
          users
        });

        setEnhancedData({
          serviceAccounts,
          personalTokens,
          credentials,
          users,
          loading: false,
          error: null
        });

        // Show success toast with real numbers
        toast({
          title: "Auth Data Loaded",
          description: `${serviceAccounts} service accounts, ${personalTokens} tokens, ${credentials} credentials`,
        });

      } else {
        // Not authenticated or counts not requested
        setEnhancedData({
          serviceAccounts: 0,
          personalTokens: 0,
          credentials: 0,
          users: 0,
          loading: false,
          error: status.isAuthenticated ? null : 'Authentication required'
        });
      }

    } catch (error: any) {
      console.error('❌ Failed to load enhanced auth data:', error);
      setAuthStatus(prev => ({
        ...prev,
        error: error.message,
        isAuthenticated: false,
        connected: false
      }));
      setEnhancedData({
        serviceAccounts: 0,
        personalTokens: 0,
        credentials: 0,
        users: 0,
        loading: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh authentication status and data
  const refreshAuthData = async () => {
    setRefreshing(true);
    await loadAuthData();
    setRefreshing(false);
    
    toast({
      title: "Status Updated",
      description: "Authentication status and data refreshed successfully",
    });
  };

  // Test connection
  const testConnection = async () => {
    try {
      setRefreshing(true);
      
      const dfnsService = await initializeDfnsService();
      const authService = dfnsService.getAuthenticationService();
      const testResult = await authService.testConnection();
      
      if (testResult.success) {
        toast({
          title: "Connection Test Passed",
          description: `Connected via ${testResult.method} (${testResult.responseTime}ms)`,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: testResult.error || "Unknown connection error",
          variant: "destructive",
        });
      }
      
      await loadAuthData();
      
    } catch (error: any) {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuthData();
  }, []);

  // Get status color and icon
  const getStatusDisplay = () => {
    if (loading) {
      return {
        color: 'bg-gray-100 text-gray-700',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: 'Loading...'
      };
    }

    if (authStatus.error) {
      return {
        color: 'bg-red-100 text-red-700',
        icon: <AlertTriangle className="h-4 w-4" />,
        text: 'Error'
      };
    }

    if (authStatus.isAuthenticated && authStatus.connected) {
      return {
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Connected'
      };
    }

    return {
      color: 'bg-yellow-100 text-yellow-700',
      icon: <AlertTriangle className="h-4 w-4" />,
      text: 'Disconnected'
    };
  };

  const statusDisplay = getStatusDisplay();

  // Format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {statusDisplay.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">DFNS Status</span>
              <Badge className={statusDisplay.color}>
                {statusDisplay.text}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {authStatus.methodDisplayName}
            </p>
          </div>
        </div>
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAuthData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Authentication Status</CardTitle>
          </div>
          <Badge className={statusDisplay.color}>
            {statusDisplay.icon}
            <span className="ml-1">{statusDisplay.text}</span>
          </Badge>
        </div>
        <CardDescription>
          Current DFNS authentication and connection status with real data
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Alert */}
        {(authStatus.error || enhancedData.error) && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {authStatus.error || enhancedData.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Connection Method:</span>
            <span className="font-medium">{authStatus.methodDisplayName}</span>
          </div>

          {authStatus.user && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">User:</span>
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3" />
                <span className="font-medium">{authStatus.user.username || authStatus.user.email}</span>
              </div>
            </div>
          )}

          {showCounts && authStatus.isAuthenticated && (
            <>
              {/* Service Accounts */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Service Accounts:</span>
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-3 w-3" />
                  <span className="font-medium">
                    {enhancedData.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : (
                      enhancedData.serviceAccounts
                    )}
                  </span>
                </div>
              </div>

              {/* Personal Tokens */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Personal Tokens:</span>
                <div className="flex items-center space-x-2">
                  <Key className="h-3 w-3" />
                  <span className="font-medium">
                    {enhancedData.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : (
                      enhancedData.personalTokens
                    )}
                  </span>
                </div>
              </div>

              {/* Credentials */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credentials:</span>
                <div className="flex items-center space-x-2">
                  <Fingerprint className="h-3 w-3" />
                  <span className="font-medium">
                    {enhancedData.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : (
                      enhancedData.credentials
                    )}
                  </span>
                </div>
              </div>

              {/* Users */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Organization Users:</span>
                <div className="flex items-center space-x-2">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">
                    {enhancedData.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : (
                      enhancedData.users
                    )}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Wallets:</span>
            <span className="font-medium">{authStatus.walletsCount}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">WebAuthn Access:</span>
            <div className="flex items-center space-x-1">
              {authStatus.hasCredentialAccess ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              <span className={authStatus.hasCredentialAccess ? 'text-green-700' : 'text-yellow-700'}>
                {authStatus.hasCredentialAccess ? 'Available' : 'Limited'}
              </span>
            </div>
          </div>

          {authStatus.lastValidated && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Validated:</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{formatTimestamp(authStatus.lastValidated)}</span>
              </div>
            </div>
          )}

          {authStatus.tokenExpiry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Token Expires:</span>
              <span className="text-xs text-yellow-600">{formatTimestamp(authStatus.tokenExpiry)}</span>
            </div>
          )}
        </div>

        {/* Permissions Summary */}
        {authStatus.permissions && authStatus.permissions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Permissions:</div>
            <div className="flex flex-wrap gap-1">
              {authStatus.permissions.slice(0, 3).map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))}
              {authStatus.permissions.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{authStatus.permissions.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAuthData}
              disabled={refreshing}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={refreshing}
              className="gap-1"
            >
              <Fingerprint className="h-3 w-3" />
              Test
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://app.dfns.io', '_blank')}
              className="gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              DFNS
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}