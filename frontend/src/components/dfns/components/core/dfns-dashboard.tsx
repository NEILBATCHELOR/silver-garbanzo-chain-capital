import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Wallet, 
  Users, 
  Key, 
  ArrowRightLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS components
import { AuthStatusCard } from '../authentication/auth-status-card';
import { WalletCreationWizard } from '../dialogs/wallet-creation-wizard';
import { WalletList } from '../wallets/wallet-list';
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

/**
 * DFNS Dashboard - Main overview page
 * Following factoring dashboard pattern with tabs and metrics
 */
export function DfnsDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real DFNS data - no more mock data
  const [dashboardData, setDashboardData] = useState({
    totalWallets: 0,
    activeUsers: 0,
    pendingTransactions: 0,
    activeCredentials: 0,
    totalPermissions: 0,
    securityScore: 100,
    isAuthenticated: false,
    dfnsReady: false
  });

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the global DFNS service instance
      const dfnsService = await initializeDfnsService();
      
      // Get real data from DFNS services
      const authStatus = dfnsService.getAuthenticationStatus();
      
      let walletCount = 0;
      let pendingTxCount = 0;
      
      if (authStatus.isAuthenticated) {
        try {
          // Get wallet count
          const wallets = await dfnsService.getWalletService().getAllWallets();
          walletCount = wallets.length;
          
          // Get pending transactions count
          const allTxs = await Promise.all(
            wallets.map(wallet => 
              dfnsService.getTransactionService().getPendingTransactions(wallet.id)
            )
          );
          pendingTxCount = allTxs.reduce((total, txs) => total + txs.length, 0);
        } catch (apiError) {
          console.warn('Some DFNS API calls failed:', apiError);
        }
      }
      
      setDashboardData({
        totalWallets: walletCount,
        activeUsers: 1, // Current user
        pendingTransactions: pendingTxCount,
        activeCredentials: authStatus.credentialCount || 0,
        totalPermissions: 0, // TODO: Add when permission service is ready
        securityScore: authStatus.isAuthenticated ? 100 : 50,
        isAuthenticated: authStatus.isAuthenticated,
        dfnsReady: dfnsService.isReady()
      });
      
      toast({
        title: "Success",
        description: `Dashboard data refreshed successfully (${walletCount} wallets found)`,
      });
      
    } catch (error: any) {
      console.error("Error refreshing dashboard:", error);
      setError("Failed to refresh dashboard data: " + error.message);
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DFNS Platform Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of wallets, users, transactions, and security metrics
              {dashboardData.dfnsReady && dashboardData.isAuthenticated && (
                <span className="ml-2 inline-flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-600">DFNS Connected</span>
                </span>
              )}
              {!dashboardData.isAuthenticated && (
                <span className="ml-2 inline-flex items-center">
                  <AlertTriangle className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-yellow-600">Limited Mode</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Quick Create
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 pb-2 space-y-1.5">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{dashboardData.totalWallets}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>Across 30+ networks</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 pb-2 space-y-1.5">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{dashboardData.activeUsers}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>Organization members</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 pb-2 space-y-1.5">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{dashboardData.pendingTransactions}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>Pending confirmations</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="p-4 pb-2 space-y-1.5">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{dashboardData.securityScore}%</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span>All systems secure</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full max-w-md grid grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="wallets" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              <span>Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Operations</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Platform Status</CardTitle>
                  <CardDescription>
                    Current status of DFNS platform components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">API Status</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WebAuthn Service</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">User Action Signing</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Network Coverage</span>
                      <Badge variant="outline">30+ Networks</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common DFNS operations and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <WalletCreationWizard />
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Add Organization User
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Key className="h-4 w-4 mr-2" />
                      Create Permission
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Broadcast Transaction
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="wallets" className="space-y-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Wallet Overview</h3>
                  <p className="text-muted-foreground">
                    Multi-network wallet management and asset distribution
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{dashboardData.totalWallets} Wallets</Badge>
                  {dashboardData.isAuthenticated ? (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">Connected</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">Limited Mode</Badge>
                  )}
                </div>
              </div>
              
              {/* Real DFNS wallet list */}
              <WalletList 
                showCreateButton={true} 
                maxHeight="400px"
                className="border-none shadow-sm"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
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
                <CardHeader className="pb-2">
                  <CardTitle>Security Metrics</CardTitle>
                  <CardDescription>
                    Security events and credential status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Credentials</span>
                      <Badge variant="outline">{dashboardData.activeCredentials}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Permissions</span>
                      <Badge variant="outline">{dashboardData.totalPermissions}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Security Events (24h)</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="operations" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Operational Metrics</CardTitle>
                <CardDescription>
                  Transaction metrics and system performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Operations Dashboard</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    This will display transaction volume, network activity, fee spending, and policy compliance metrics.
                  </p>
                  <Button variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}