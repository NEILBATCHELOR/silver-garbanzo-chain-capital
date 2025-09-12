import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Key, 
  UserCheck,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { 
  DfnsUser, 
  DfnsServiceAccount, 
  DfnsPersonalAccessToken, 
  DfnsCredential
} from '@/types/dfns';

// Import auth components (to be created)
import { AuthStatusCard } from '../authentication/auth-status-card';
import { UserManagementTable } from '../authentication/user-management-table';
import { ServiceAccountList } from '../authentication/service-account-list';
import { PersonalTokenList } from '../authentication/personal-token-list';
import { CredentialManager } from '../authentication/credential-manager';

/**
 * DFNS Authentication Page - User and identity management
 * Following the climateReceivables pattern with real DFNS integration
 */
export function DfnsAuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real authentication data from DFNS
  const [authData, setAuthData] = useState({
    currentUser: null as DfnsUser | null,
    totalUsers: 0,
    serviceAccounts: 0,
    personalTokens: 0,
    activeCredentials: 0,
    isAuthenticated: false,
    users: [] as DfnsUser[],
    tokens: [] as DfnsPersonalAccessToken[],
    credentials: [] as DfnsCredential[],
    isLoading: true
  });

  const refreshAuthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view user management');
        setAuthData(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          isLoading: false 
        }));
        return;
      }

      // Get authentication data from various services with proper method names
      const [usersResult, tokensResult, credentialsResult, serviceAccountsResult] = await Promise.all([
        dfnsService.getUserManagementService().listUsers().then(result => result?.data?.items || []).catch(() => []),
        dfnsService.getPersonalAccessTokenManagementService().listPersonalAccessTokens().then(result => result?.data?.items || []).catch(() => []),
        dfnsService.getCredentialManagementService().listCredentials().then(result => result || []).catch(() => []),
        dfnsService.getServiceAccountManagementService().getAllServiceAccounts().then(result => result.success ? result.data || [] : []).catch(() => [])
      ]);

      setAuthData({
        currentUser: authStatus.user || null,
        totalUsers: usersResult.length,
        serviceAccounts: serviceAccountsResult.length,
        personalTokens: tokensResult.length,
        activeCredentials: credentialsResult.length,
        isAuthenticated: authStatus.isAuthenticated,
        users: usersResult as DfnsUser[], // Type assertion for API compatibility
        tokens: tokensResult as DfnsPersonalAccessToken[], // Type assertion for API compatibility
        credentials: credentialsResult as DfnsCredential[], // Type assertion for API compatibility
        isLoading: false
      });

      toast({
        title: "Success",
        description: `Loaded authentication data: ${usersResult.length} users, ${serviceAccountsResult.length} service accounts, ${tokensResult.length} tokens, ${credentialsResult.length} credentials`,
      });

    } catch (error: any) {
      console.error("Error loading authentication data:", error);
      setError(`Failed to load authentication data: ${error.message}`);
      setAuthData(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: "Failed to load authentication data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuthData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Authentication & Identity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              User management, credentials, and access control
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAuthData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Authentication Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{authData.totalUsers}</div>
              <div className="text-xs text-muted-foreground">
                Organization members
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{authData.serviceAccounts}</div>
              <div className="text-xs text-muted-foreground">
                API access accounts
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Personal Tokens</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Key className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{authData.personalTokens}</div>
              <div className="text-xs text-muted-foreground">
                Active tokens
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Credentials</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{authData.activeCredentials}</div>
              <div className="text-xs text-muted-foreground">
                WebAuthn credentials
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full max-w-2xl grid grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="service-accounts" className="gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span>Service</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-1.5">
              <Key className="h-4 w-4" />
              <span>Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Credentials</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Authentication Status</CardTitle>
                  <CardDescription>
                    Current authentication and security status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuthStatusCard />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Security Overview</CardTitle>
                  <CardDescription>
                    Organization security metrics and status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Authentication Status</span>
                      <Badge variant={authData.isAuthenticated ? "secondary" : "destructive"} 
                             className={authData.isAuthenticated ? "bg-green-50 text-green-700" : ""}>
                        {authData.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WebAuthn Enabled</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">User Action Signing</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Organization Users</span>
                      <Badge variant="outline">{authData.totalUsers}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Organization Users</CardTitle>
                    <CardDescription>
                      Manage users and their access to the organization
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{authData.totalUsers} Users</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <UserManagementTable 
                  users={authData.users}
                  onUserUpdated={refreshAuthData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service-accounts" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Service Accounts</CardTitle>
                <CardDescription>
                  API access accounts for automated systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServiceAccountList 
                  onAccountUpdated={refreshAuthData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Personal Access Tokens</CardTitle>
                <CardDescription>
                  Manage personal API access tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalTokenList 
                  tokens={authData.tokens}
                  onTokenUpdated={refreshAuthData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>WebAuthn Credentials</CardTitle>
                <CardDescription>
                  Manage WebAuthn devices and credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CredentialManager 
                  credentials={authData.credentials}
                  onCredentialUpdated={refreshAuthData}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nested routes for detailed views */}
      <Routes>
        <Route path="/users/:userId" element={<div>User Details View</div>} />
        <Route path="/service-accounts/:accountId" element={<div>Service Account Details</div>} />
        <Route path="*" element={<Navigate to="/wallet/dfns/auth" replace />} />
      </Routes>
    </div>
  );
}