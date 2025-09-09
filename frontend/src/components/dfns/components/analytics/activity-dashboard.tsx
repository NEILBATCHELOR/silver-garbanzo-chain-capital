import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Zap, 
  Users, 
  Wallet, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";

interface ActivityMetrics {
  totalTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  successfulTransactions: number;
  transactionVolume24h: number;
  userLogins24h: number;
  walletCreations24h: number;
  credentialActivations24h: number;
  permissionChanges24h: number;
  webhookEvents24h: number;
  errorRate: number;
  avgResponseTime: number;
}

interface ActivityEvent {
  id: string;
  type: 'transaction' | 'authentication' | 'wallet' | 'permission' | 'webhook' | 'error';
  action: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  userId?: string;
  walletId?: string;
  metadata?: Record<string, any>;
}

/**
 * Activity Dashboard Component
 * 
 * Real-time monitoring of DFNS platform activity including:
 * - Transaction metrics and status
 * - User authentication activity
 * - Wallet operations
 * - Permission changes
 * - System health metrics
 */
export function ActivityDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    totalTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    successfulTransactions: 0,
    transactionVolume24h: 0,
    userLogins24h: 0,
    walletCreations24h: 0,
    credentialActivations24h: 0,
    permissionChanges24h: 0,
    webhookEvents24h: 0,
    errorRate: 0,
    avgResponseTime: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivityData = async () => {
    try {
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      // Get wallet service for transaction metrics
      const walletService = dfnsService.getWalletService();
      const transactionService = dfnsService.getTransactionService();
      const userService = dfnsService.getUserService();
      const webhookService = dfnsService.getWebhookService();

      // Get all wallets to calculate metrics across them
      const walletSummaries = await walletService.getWalletsSummary();
      
      // Calculate transaction metrics
      let totalTransactions = 0;
      let pendingTransactions = 0;
      let failedTransactions = 0;
      let successfulTransactions = 0;
      const recentEvents: ActivityEvent[] = [];

      for (const wallet of walletSummaries) {
        try {
          // Get transaction summaries for each wallet
          const txSummaries = await transactionService.getTransactionsSummary(wallet.walletId);
          
          for (const tx of txSummaries) {
            totalTransactions++;
            
            if (tx.isPending) pendingTransactions++;
            else if (tx.status === 'Failed') failedTransactions++;
            else if (tx.isCompleted) successfulTransactions++;

            // Add to recent activity if recent (last 24h)
            const txTime = new Date(tx.dateCreated);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            if (txTime > dayAgo) {
              recentEvents.push({
                id: tx.id,
                type: 'transaction',
                action: `${tx.kind} Transaction`,
                description: `${tx.kind} transaction on ${tx.network}`,
                timestamp: tx.dateCreated,
                status: tx.isPending ? 'pending' : tx.isCompleted ? 'success' : 'failed',
                walletId: wallet.walletId,
                metadata: {
                  network: tx.network,
                  fee: tx.fee,
                  kind: tx.kind
                }
              });
            }
          }
        } catch (walletError) {
          console.warn(`Failed to get transactions for wallet ${wallet.walletId}:`, walletError);
        }
      }

      // Get user activity (approximate)
      try {
        const users = await userService.getAllUsers();
        const userLogins24h = users.filter(user => {
          if (!user.lastLoginAt) return false;
          const loginTime = new Date(user.lastLoginAt);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return loginTime > dayAgo;
        }).length;

        // Add recent user activities
        users.forEach(user => {
          if (user.lastLoginAt) {
            const loginTime = new Date(user.lastLoginAt);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            if (loginTime > dayAgo) {
              recentEvents.push({
                id: `login-${user.userId}`,
                type: 'authentication',
                action: 'User Login',
                description: `User ${user.username} logged in`,
                timestamp: user.lastLoginAt,
                status: 'success',
                userId: user.userId
              });
            }
          }
        });
      } catch (userError) {
        console.warn('Failed to get user activity:', userError);
      }

      // Get webhook activity
      let webhookEvents24h = 0;
      try {
        const webhookSummaries = await webhookService.getWebhooksSummary();
        
        for (const webhook of webhookSummaries) {
          const eventSummaries = await webhookService.getWebhookEventsSummary(webhook.webhookId);
          
          eventSummaries.forEach(event => {
            const eventTime = new Date(event.eventDate);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            if (eventTime > dayAgo) {
              webhookEvents24h++;
              
              recentEvents.push({
                id: event.eventId,
                type: 'webhook',
                action: 'Webhook Event',
                description: `${event.eventType} webhook delivery`,
                timestamp: event.eventDate,
                status: event.deliveryStatus === 'delivered' ? 'success' : 
                        event.deliveryStatus === 'retrying' ? 'pending' : 'failed',
                metadata: {
                  eventType: event.eventType,
                  responseStatus: event.responseStatus,
                  attempts: event.deliveryAttempts
                }
              });
            }
          });
        }
      } catch (webhookError) {
        console.warn('Failed to get webhook activity:', webhookError);
      }

      // Calculate error rate
      const errorRate = totalTransactions > 0 
        ? (failedTransactions / totalTransactions) * 100 
        : 0;

      // Sort recent events by timestamp
      recentEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Update metrics
      setMetrics({
        totalTransactions,
        pendingTransactions,
        failedTransactions,
        successfulTransactions,
        transactionVolume24h: recentEvents.filter(e => e.type === 'transaction').length,
        userLogins24h: recentEvents.filter(e => e.type === 'authentication').length,
        walletCreations24h: walletSummaries.filter(w => {
          const createdTime = new Date(w.dateCreated);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return createdTime > dayAgo;
        }).length,
        credentialActivations24h: 0, // TODO: Get from credential service
        permissionChanges24h: 0, // TODO: Get from permission service
        webhookEvents24h,
        errorRate,
        avgResponseTime: 0 // TODO: Calculate from transaction/API metrics
      });

      setRecentActivity(recentEvents.slice(0, 50)); // Show last 50 events
      setError(null);
    } catch (error) {
      console.error('Failed to load activity data:', error);
      setError(`Failed to load activity data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchActivityData();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchActivityData();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActivityData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'transaction': return <Zap className="h-4 w-4" />;
      case 'authentication': return <Users className="h-4 w-4" />;
      case 'wallet': return <Wallet className="h-4 w-4" />;
      case 'permission': return <Shield className="h-4 w-4" />;
      case 'webhook': return <Activity className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
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
          <p className="text-muted-foreground">Loading activity dashboard...</p>
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
          <h2 className="text-2xl font-bold">Activity Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of DFNS platform activity
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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              {metrics.transactionVolume24h} in last 24h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalTransactions > 0 
                ? ((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(1)
                : '0'}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {metrics.errorRate < 5 ? (
                <>
                  <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
                  Error rate: {metrics.errorRate.toFixed(1)}%
                </>
              ) : (
                <>
                  <ArrowUp className="h-3 w-3 text-red-500 mr-1" />
                  Error rate: {metrics.errorRate.toFixed(1)}%
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userLogins24h}</div>
            <p className="text-xs text-muted-foreground">
              Logins in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              {metrics.webhookEvents24h} webhook events
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">{metrics.pendingTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{metrics.failedTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{metrics.walletCreations24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">{metrics.webhookEvents24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{metrics.credentialActivations24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{metrics.permissionChanges24h}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest platform events and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentActivity.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="p-2 rounded-full bg-muted">
                      {getActivityIcon(event.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{event.action}</span>
                        {getStatusIcon(event.status)}
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
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
    </div>
  );
}
