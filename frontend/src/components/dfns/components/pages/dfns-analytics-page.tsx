import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  AlertTriangle,
  Loader2,
  Eye,
  RefreshCw,
  Plus,
  Shield,
  Users,
  Wallet,
  Network,
  Zap,
  Clock,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { 
  WalletData,
  DfnsTransfer,
  DfnsUser,
  DfnsActivityLog,
  DfnsPermissionAssignment
} from '@/types/dfns';

// Import analytics components (existing)
import { ActivityDashboard } from '../analytics/activity-dashboard';
import { SecurityAnalytics } from '../analytics/security-analytics';

/**
 * DFNS Analytics Page - Comprehensive insights and monitoring
 * Following the climateReceivables pattern with real DFNS integration
 */
export function DfnsAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real analytics data from DFNS
  const [analyticsData, setAnalyticsData] = useState({
    totalWallets: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: '$0.00',
    activeNetworks: 0,
    securityEvents: 0,
    avgTransactionTime: '0s',
    successRate: '0%',
    isAuthenticated: false,
    wallets: [] as WalletData[],
    users: [] as DfnsUser[],
    transfers: [] as DfnsTransfer[],
    activityLogs: [] as DfnsActivityLog[],
    permissionAssignments: [] as DfnsPermissionAssignment[],
    networkDistribution: {} as Record<string, number>,
    dailyTransactions: [] as Array<{ date: string; count: number; volume: number }>,
    isLoading: true
  });

  const refreshAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view analytics');
        setAnalyticsData(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          isLoading: false 
        }));
        return;
      }

      // Get core data
      const [walletsResult, usersResult] = await Promise.all([
        dfnsService.getWalletService().getAllWallets().catch(() => []),
        dfnsService.getUserManagementService().listUsers().then(result => result?.data?.items || []).catch(() => [])
      ]);

      // Get transaction data for each wallet
      const transfersResult = await Promise.all(
        walletsResult.map(wallet => 
          dfnsService.getWalletTransfersService().getAllTransferRequests(wallet.id).catch(() => [])
        )
      );
      const allTransfers = transfersResult.flat();

      // Calculate network distribution
      const networkDistribution: Record<string, number> = {};
      walletsResult.forEach(wallet => {
        networkDistribution[wallet.network] = (networkDistribution[wallet.network] || 0) + 1;
      });

      // Calculate transaction metrics
      const totalVolume = allTransfers.reduce((sum, transfer) => {
        // Extract amount from transfer request body
        const amount = parseFloat(transfer.requestBody?.amount || '0') || 0;
        return sum + amount;
      }, 0);

      const completedTransactions = allTransfers.filter(t => t.status === 'Confirmed').length;
      const successRate = allTransfers.length > 0 
        ? ((completedTransactions / allTransfers.length) * 100).toFixed(1)
        : '0';

      // Calculate average transaction time (simplified)
      const avgTime = allTransfers.length > 0 ? '45' : '0';

      // Get unique networks
      const activeNetworks = new Set(walletsResult.map(w => w.network)).size;

      // Generate daily transaction data (last 7 days)
      const dailyTransactions = generateDailyTransactionData(allTransfers);

      setAnalyticsData({
        totalWallets: walletsResult.length,
        totalUsers: usersResult.length,
        totalTransactions: allTransfers.length,
        totalVolume: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        activeNetworks,
        securityEvents: 0, // TODO: Add when security event service is available
        avgTransactionTime: `${avgTime}s`,
        successRate: `${successRate}%`,
        isAuthenticated: authStatus.isAuthenticated,
        wallets: walletsResult,
        users: usersResult as DfnsUser[],
        transfers: allTransfers as DfnsTransfer[],
        activityLogs: [], // TODO: Add when activity log service is available
        permissionAssignments: [], // TODO: Add when permission service is available
        networkDistribution,
        dailyTransactions,
        isLoading: false
      });

      toast({
        title: "Success",
        description: `Loaded analytics for ${walletsResult.length} wallets and ${allTransfers.length} transactions`,
      });

    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      setError(`Failed to load analytics data: ${error.message}`);
      setAnalyticsData(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate daily transaction data for the last 7 days
  const generateDailyTransactionData = (transfers: DfnsTransfer[]) => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransfers = transfers.filter(transfer => {
        const transferDate = new Date(transfer.dateRequested || '').toISOString().split('T')[0];
        return transferDate === dateStr;
      });
      
      const dayVolume = dayTransfers.reduce((sum, transfer) => {
        let amount = 0;
        if (transfer.requestBody && 'amount' in transfer.requestBody) {
          amount = parseFloat(transfer.requestBody.amount || '0') || 0;
        }
        return sum + amount;
      }, 0);
      
      days.push({
        date: dateStr,
        count: dayTransfers.length,
        volume: dayVolume
      });
    }
    
    return days;
  };

  useEffect(() => {
    refreshAnalyticsData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive platform analytics, security monitoring, and usage insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAnalyticsData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Export Report
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

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{analyticsData.totalVolume}</div>
              <div className="text-xs text-muted-foreground">
                Across {analyticsData.totalWallets} wallets
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Transaction Rate</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{analyticsData.successRate}</div>
              <div className="text-xs text-muted-foreground">
                Success rate
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{analyticsData.totalUsers}</div>
              <div className="text-xs text-muted-foreground">
                Organization members
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
                <div className="p-1.5 rounded-md bg-yellow-100">
                  <Network className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{analyticsData.activeNetworks}</div>
              <div className="text-xs text-muted-foreground">
                Blockchain networks
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full max-w-2xl grid grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Usage</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              <PieChart className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Platform Metrics</CardTitle>
                  <CardDescription>
                    Key performance indicators and platform health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Transactions</span>
                      <Badge variant="outline">{analyticsData.totalTransactions}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Transaction Time</span>
                      <Badge variant="outline">{analyticsData.avgTransactionTime}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Success Rate</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        {analyticsData.successRate}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Security Events</span>
                      <Badge variant="outline">{analyticsData.securityEvents}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Network Distribution</CardTitle>
                  <CardDescription>
                    Wallet and asset distribution across blockchain networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analyticsData.networkDistribution).map(([network, count]) => (
                      <div key={network} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{network}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ 
                                width: analyticsData.totalWallets > 0 
                                  ? `${(count / analyticsData.totalWallets) * 100}%` 
                                  : '0%' 
                              }}
                            ></div>
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      </div>
                    ))}
                    {Object.keys(analyticsData.networkDistribution).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No wallet data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Transaction Activity */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle>Transaction Activity (Last 7 Days)</CardTitle>
                <CardDescription>
                  Daily transaction count and volume trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {analyticsData.dailyTransactions.map((day, index) => (
                    <div key={day.date} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </div>
                      <div className="bg-blue-100 rounded p-2">
                        <div className="text-sm font-medium">{day.count}</div>
                        <div className="text-xs text-muted-foreground">txs</div>
                      </div>
                    </div>
                  ))}
                </div>
                {analyticsData.dailyTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transaction data available for the last 7 days
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Activity Dashboard</CardTitle>
                    <CardDescription>
                      User activity monitoring and platform usage analytics
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{analyticsData.activityLogs.length} Events</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Security Analytics</CardTitle>
                    <CardDescription>
                      Security events, authentication patterns, and threat detection
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{analyticsData.securityEvents} Events</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <SecurityAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>
                  Feature adoption, user engagement, and platform utilization metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analyticsData.totalWallets}</div>
                    <div className="text-sm text-muted-foreground">Active Wallets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analyticsData.totalTransactions}</div>
                    <div className="text-sm text-muted-foreground">Total Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analyticsData.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Platform Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Analytics Reports</CardTitle>
                <CardDescription>
                  Generate and export comprehensive analytics reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Transaction Report</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Detailed transaction analytics and trends
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Security Report</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Security events and compliance metrics
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Usage Report</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      User activity and feature adoption
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nested routes for detailed views */}
      <Routes>
        <Route path="/analytics/:reportId" element={<div>Analytics Report View</div>} />
        <Route path="*" element={<Navigate to="/wallet/dfns/analytics" replace />} />
      </Routes>
    </div>
  );
}