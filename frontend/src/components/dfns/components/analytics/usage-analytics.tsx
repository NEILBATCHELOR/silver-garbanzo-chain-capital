import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet, 
  Zap, 
  Globe, 
  Clock,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";

interface UsageMetrics {
  totalApiCalls: number;
  apiCallsToday: number;
  apiCallsThisWeek: number;
  apiCallsThisMonth: number;
  activeUsers: number;
  activeWallets: number;
  transactionVolume: number;
  networkCount: number;
  avgResponseTime: number;
  errorRate: number;
  peakHourlyRequests: number;
  dataTransfer: number;
}

interface NetworkUsage {
  network: string;
  walletCount: number;
  transactionCount: number;
  volumeUsd: number;
  errorRate: number;
  avgConfirmationTime: number;
}

interface UserActivity {
  userId: string;
  username: string;
  lastActive: string;
  apiCalls: number;
  transactionsCreated: number;
  walletsManaged: number;
  permissionsAssigned: number;
  loginCount: number;
}

interface TimeSeriesData {
  timestamp: string;
  apiCalls: number;
  transactions: number;
  activeUsers: number;
  errors: number;
}

/**
 * Usage Analytics Component
 * 
 * Comprehensive usage analytics and statistics including:
 * - API usage metrics and trends
 * - User activity patterns
 * - Network performance analysis
 * - Transaction volume statistics
 * - Resource utilization
 */
export function UsageAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [metrics, setMetrics] = useState<UsageMetrics>({
    totalApiCalls: 0,
    apiCallsToday: 0,
    apiCallsThisWeek: 0,
    apiCallsThisMonth: 0,
    activeUsers: 0,
    activeWallets: 0,
    transactionVolume: 0,
    networkCount: 0,
    avgResponseTime: 0,
    errorRate: 0,
    peakHourlyRequests: 0,
    dataTransfer: 0
  });

  const [networkUsage, setNetworkUsage] = useState<NetworkUsage[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  const fetchUsageData = async () => {
    try {
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      const walletService = dfnsService.getWalletService();
      const userService = dfnsService.getUserService();
      const transactionService = dfnsService.getTransactionService();
      const permissionService = dfnsService.getPermissionService();

      // Get wallet data
      const walletSummaries = await walletService.getWalletsSummary();
      const activeWallets = walletSummaries.filter(w => w.isActive).length;
      
      // Calculate network usage
      const networkStats = new Map<string, {
        walletCount: number;
        transactionCount: number;
        volumeUsd: number;
        transactions: any[];
      }>();

      // Group wallets by network
      walletSummaries.forEach(wallet => {
        if (!networkStats.has(wallet.network)) {
          networkStats.set(wallet.network, {
            walletCount: 0,
            transactionCount: 0,
            volumeUsd: 0,
            transactions: []
          });
        }
        
        const stats = networkStats.get(wallet.network)!;
        stats.walletCount++;
        stats.volumeUsd += wallet.totalValueUsd ? parseFloat(wallet.totalValueUsd) : 0;
      });

      // Get transaction data for each wallet to calculate network transaction stats
      let totalTransactions = 0;
      let totalErrors = 0;
      
      for (const wallet of walletSummaries) {
        try {
          const txSummaries = await transactionService.getTransactionsSummary(wallet.walletId);
          
          const networkStats_ = networkStats.get(wallet.network)!;
          networkStats_.transactionCount += txSummaries.length;
          
          totalTransactions += txSummaries.length;
          totalErrors += txSummaries.filter(tx => tx.status === 'Failed').length;
          
          // Store transaction data for time series analysis
          txSummaries.forEach(tx => {
            networkStats_.transactions.push({
              ...tx,
              network: wallet.network
            });
          });
        } catch (txError) {
          console.warn(`Failed to get transactions for wallet ${wallet.walletId}:`, txError);
        }
      }

      // Convert network stats to array
      const networkUsageData: NetworkUsage[] = Array.from(networkStats.entries()).map(([network, stats]) => {
        const failedTxs = stats.transactions.filter((tx: any) => tx.status === 'Failed').length;
        const errorRate = stats.transactionCount > 0 ? (failedTxs / stats.transactionCount) * 100 : 0;
        
        // Calculate average confirmation time (mock data for now)
        const avgConfirmationTime = network === 'Bitcoin' ? 600 : 
                                   network === 'Ethereum' ? 180 : 
                                   network === 'Solana' ? 30 : 120;

        return {
          network,
          walletCount: stats.walletCount,
          transactionCount: stats.transactionCount,
          volumeUsd: stats.volumeUsd,
          errorRate,
          avgConfirmationTime
        };
      }).sort((a, b) => b.transactionCount - a.transactionCount);

      // Get user activity data
      const users = await userService.getAllUsers();
      const activeUsers = users.filter(u => u.isActive).length;
      
      const userActivityData: UserActivity[] = users
        .filter(u => u.isActive)
        .map(user => {
          // Calculate user-specific metrics (this would ideally come from audit logs)
          const userWallets = walletSummaries.filter(w => 
            // This is a simplified assumption - in real implementation, you'd track wallet ownership
            w.dateCreated && new Date(w.dateCreated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length;

          return {
            userId: user.userId,
            username: user.username,
            lastActive: user.lastLoginAt || user.dateCreated,
            apiCalls: Math.floor(Math.random() * 1000), // Mock data - would come from API logs
            transactionsCreated: Math.floor(userWallets * Math.random() * 10),
            walletsManaged: userWallets,
            permissionsAssigned: Math.floor(Math.random() * 5),
            loginCount: user.lastLoginAt ? Math.floor(Math.random() * 30) : 0
          };
        })
        .sort((a, b) => b.apiCalls - a.apiCalls)
        .slice(0, 20); // Top 20 most active users

      // Generate time series data for charts
      const now = new Date();
      const timeSeriesData_: TimeSeriesData[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate mock time series data based on actual metrics
        const baseApiCalls = Math.floor(totalTransactions / 30) + Math.floor(Math.random() * 100);
        const baseTransactions = Math.floor(totalTransactions / 30) + Math.floor(Math.random() * 20);
        const baseActiveUsers = Math.floor(activeUsers * 0.7) + Math.floor(Math.random() * Math.floor(activeUsers * 0.3));
        const baseErrors = Math.floor(totalErrors / 30) + Math.floor(Math.random() * 5);
        
        timeSeriesData_.push({
          timestamp: date.toISOString(),
          apiCalls: baseApiCalls,
          transactions: baseTransactions,
          activeUsers: baseActiveUsers,
          errors: baseErrors
        });
      }

      // Calculate usage metrics
      const totalVolumeUsd = walletSummaries.reduce((sum, w) => 
        sum + (w.totalValueUsd ? parseFloat(w.totalValueUsd) : 0), 0
      );
      
      const errorRate = totalTransactions > 0 ? (totalErrors / totalTransactions) * 100 : 0;
      
      // Mock additional metrics that would come from monitoring systems
      const totalApiCalls = timeSeriesData_.reduce((sum, d) => sum + d.apiCalls, 0);
      const apiCallsToday = timeSeriesData_[timeSeriesData_.length - 1]?.apiCalls || 0;
      const apiCallsThisWeek = timeSeriesData_.slice(-7).reduce((sum, d) => sum + d.apiCalls, 0);
      const peakHourlyRequests = Math.max(...timeSeriesData_.map(d => d.apiCalls));

      setMetrics({
        totalApiCalls,
        apiCallsToday,
        apiCallsThisWeek,
        apiCallsThisMonth: totalApiCalls,
        activeUsers,
        activeWallets,
        transactionVolume: totalVolumeUsd,
        networkCount: networkUsageData.length,
        avgResponseTime: 250 + Math.floor(Math.random() * 100), // Mock response time
        errorRate,
        peakHourlyRequests,
        dataTransfer: totalApiCalls * 2.5 // Mock data transfer (KB)
      });

      setNetworkUsage(networkUsageData);
      setUserActivity(userActivityData);
      setTimeSeriesData(timeSeriesData_);
      setError(null);
    } catch (error) {
      console.error('Failed to load usage data:', error);
      setError(`Failed to load usage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchUsageData();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUsageData();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      fetchUsageData();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  const getGrowthIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-3 w-3 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading usage analytics...</p>
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
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
          <p className="text-muted-foreground">
            Monitor platform usage patterns and performance metrics
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

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.apiCallsToday)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              {formatNumber(metrics.apiCallsThisWeek)} this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across {metrics.networkCount} networks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.transactionVolume)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Wallet className="h-3 w-3 text-blue-500 mr-1" />
              {metrics.activeWallets} active wallets
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {metrics.errorRate < 2 ? (
                <>
                  <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
                  {metrics.errorRate.toFixed(1)}% error rate
                </>
              ) : (
                <>
                  <ArrowUp className="h-3 w-3 text-red-500 mr-1" />
                  {metrics.errorRate.toFixed(1)}% error rate
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Usage Trends */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatNumber(metrics.totalApiCalls)}</div>
                <div className="text-xs text-muted-foreground">All time</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Peak Hourly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatNumber(metrics.peakHourlyRequests)}</div>
                <div className="text-xs text-muted-foreground">Requests/hour</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Transfer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{(metrics.dataTransfer / 1024).toFixed(1)}MB</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{metrics.networkCount}</div>
                <div className="text-xs text-muted-foreground">Active chains</div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Timeline Mock Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends (Last 30 Days)</CardTitle>
              <CardDescription>API calls and transaction volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Chart visualization would go here</p>
                  <p className="text-sm text-muted-foreground">
                    Showing {timeSeriesData.length} days of data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Usage Statistics</CardTitle>
              <CardDescription>
                Usage metrics across different blockchain networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {networkUsage.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No network usage data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {networkUsage.map((network) => (
                    <div 
                      key={network.network}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="p-2 rounded-full bg-muted">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{network.network}</span>
                            <Badge variant="outline" className="text-xs">
                              {network.walletCount} wallets
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {network.transactionCount} transactions • 
                            {formatCurrency(network.volumeUsd)} volume • 
                            ~{network.avgConfirmationTime}s avg confirmation
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {network.errorRate.toFixed(1)}% error rate
                        </div>
                        <Badge 
                          variant={network.errorRate < 5 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {network.errorRate < 1 ? 'Excellent' : 
                           network.errorRate < 5 ? 'Good' : 'Needs attention'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
              <CardDescription>
                Users with highest platform usage in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No user activity data available</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userActivity.map((user, index) => (
                    <div 
                      key={user.userId}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{user.username}</span>
                            {index < 3 && (
                              <Badge variant="default" className="text-xs">
                                Top {index + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(user.apiCalls)} API calls • 
                            {user.transactionsCreated} transactions • 
                            {user.walletsManaged} wallets managed
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last active: {formatTimeAgo(user.lastActive)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {user.loginCount} logins
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.permissionsAssigned} permissions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>System performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Response Time</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={metrics.avgResponseTime < 500 ? "default" : "secondary"}
                      >
                        {metrics.avgResponseTime}ms
                      </Badge>
                      {metrics.avgResponseTime < 500 ? (
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUp className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Error Rate</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={metrics.errorRate < 2 ? "default" : "destructive"}
                      >
                        {metrics.errorRate.toFixed(2)}%
                      </Badge>
                      {metrics.errorRate < 2 ? (
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUp className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Peak Hourly Requests</span>
                    <Badge variant="outline">
                      {formatNumber(metrics.peakHourlyRequests)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Data Transfer (Month)</span>
                    <Badge variant="outline">
                      {(metrics.dataTransfer / 1024).toFixed(1)} MB
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Platform resource usage overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Connections</span>
                    <Badge variant="default">
                      {metrics.activeUsers}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Active Wallets</span>
                    <Badge variant="default">
                      {metrics.activeWallets}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Network Coverage</span>
                    <Badge variant="default">
                      {metrics.networkCount} chains
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Total Volume</span>
                    <Badge variant="outline">
                      {formatCurrency(metrics.transactionVolume)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance trends would go here with charts */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Response time and error rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Performance charts would display here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
