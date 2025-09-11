import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowRightLeft,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  RefreshCw,
  Plus,
  Activity,
  DollarSign,
  Network,
  Zap
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { 
  DfnsTransfer,
  DfnsBroadcastTransaction,
  DfnsTransactionHistory,
  WalletData
} from '@/types/dfns';

// Import transaction components (to be created)
import { TransactionList } from '../transactions/transaction-list';

/**
 * DFNS Transactions Page - Cross-chain transaction management
 * Following the climateReceivables pattern with real DFNS integration
 */
export function DfnsTransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real transaction data from DFNS
  const [transactionData, setTransactionData] = useState({
    totalTransactions: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    failedTransactions: 0,
    totalVolume: '$0.00',
    totalFees: '$0.00',
    activeNetworks: 0,
    isAuthenticated: false,
    transfers: [] as DfnsTransfer[],
    broadcasts: [] as DfnsBroadcastTransaction[],
    history: [] as DfnsTransactionHistory[],
    wallets: [] as WalletData[],
    isLoading: true
  });

  const refreshTransactionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view transaction management');
        setTransactionData(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          isLoading: false 
        }));
        return;
      }

      // Get wallets first
      const wallets = await dfnsService.getWalletService().getAllWallets();
      
      // Get transaction data for each wallet
      const [transfersResult, broadcastsResult] = await Promise.all([
        Promise.all(wallets.map(wallet => 
          dfnsService.getWalletTransfersService().getAllTransferRequests(wallet.id).catch(() => [])
        )),
        Promise.all(wallets.map(wallet => 
          dfnsService.getTransactionBroadcastService().getAllTransactionRequests(wallet.id).catch(() => [])
        ))
      ]);

      // Flatten arrays
      const allTransfers = transfersResult.flat();
      const allBroadcasts = broadcastsResult.flat();

      // Calculate metrics
      const pendingTransactions = allTransfers.filter(t => t.status === 'Pending').length;
      const completedTransactions = allTransfers.filter(t => t.status === 'Confirmed').length;
      const failedTransactions = allTransfers.filter(t => t.status === 'Failed').length;
      const totalTransactions = allTransfers.length + allBroadcasts.length;

      // Calculate total volume (simplified - would need proper aggregation)
      const totalVolume = allTransfers.reduce((sum, transfer) => {
        const amount = parseFloat(transfer.requestBody?.amount || '0') || 0;
        return sum + amount;
      }, 0);

      // Calculate total fees
      const totalFees = allTransfers.reduce((sum, transfer) => {
        const fee = parseFloat(transfer.fee || '0') || 0;
        return sum + fee;
      }, 0);

      // Get unique networks
      const activeNetworks = new Set(wallets.map(w => w.network)).size;

      setTransactionData({
        totalTransactions,
        pendingTransactions,
        completedTransactions,
        failedTransactions,
        totalVolume: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalFees: `$${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        activeNetworks,
        isAuthenticated: authStatus.isAuthenticated,
        transfers: allTransfers as DfnsTransfer[],
        broadcasts: allBroadcasts as DfnsBroadcastTransaction[],
        history: [], // No separate history for now - using transfers and broadcasts
        wallets,
        isLoading: false
      });

      toast({
        title: "Success",
        description: `Loaded ${totalTransactions} transactions across ${activeNetworks} networks`,
      });

    } catch (error: any) {
      console.error("Error loading transaction data:", error);
      setError(`Failed to load transaction data: ${error.message}`);
      setTransactionData(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: "Failed to load transaction data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTransactionData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cross-chain transaction monitoring, broadcasting, and analytics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTransactionData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="gap-2">
              <Send className="h-4 w-4" />
              Broadcast Transaction
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

        {/* Transaction Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{transactionData.totalTransactions}</div>
              <div className="text-xs text-muted-foreground">
                All-time transactions
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <div className="p-1.5 rounded-md bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{transactionData.pendingTransactions}</div>
              <div className="text-xs text-muted-foreground">
                Awaiting confirmation
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{transactionData.totalVolume}</div>
              <div className="text-xs text-muted-foreground">
                Total volume (USD)
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Network className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{transactionData.activeNetworks}</div>
              <div className="text-xs text-muted-foreground">
                Active networks
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full max-w-2xl grid grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <ArrowRightLeft className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Pending</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="gap-1.5">
              <Send className="h-4 w-4" />
              <span>Broadcast</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Transaction Summary</CardTitle>
                  <CardDescription>
                    Overview of recent transaction activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: transactionData.totalTransactions > 0 
                                ? `${(transactionData.completedTransactions / transactionData.totalTransactions) * 100}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          {transactionData.completedTransactions}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pending</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ 
                              width: transactionData.totalTransactions > 0 
                                ? `${(transactionData.pendingTransactions / transactionData.totalTransactions) * 100}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                          {transactionData.pendingTransactions}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Failed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ 
                              width: transactionData.totalTransactions > 0 
                                ? `${(transactionData.failedTransactions / transactionData.totalTransactions) * 100}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <Badge variant="destructive">
                          {transactionData.failedTransactions}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Network Activity</CardTitle>
                  <CardDescription>
                    Transaction distribution across blockchain networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Volume</span>
                      <Badge variant="outline">{transactionData.totalVolume}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Fees</span>
                      <Badge variant="outline">{transactionData.totalFees}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Networks</span>
                      <Badge variant="outline">{transactionData.activeNetworks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Success Rate</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        {transactionData.totalTransactions > 0 
                          ? `${((transactionData.completedTransactions / transactionData.totalTransactions) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common transaction management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-4 w-4" />
                      <span className="font-medium">Broadcast</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Manually broadcast raw transactions
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Monitor Pending</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Track pending transaction status
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">Analytics</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      View transaction analytics
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">Fee Estimation</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Estimate transaction fees
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      Complete transaction history across all wallets and networks
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{transactionData.totalTransactions} Total</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionList 
                  transfers={transactionData.transfers}
                  broadcasts={transactionData.broadcasts}
                  history={transactionData.history}
                  wallets={transactionData.wallets}
                  onTransactionUpdated={refreshTransactionData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Pending Transactions</CardTitle>
                <CardDescription>
                  Monitor transactions awaiting blockchain confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Pending Transaction Monitor</h3>
                  <p className="text-muted-foreground mb-6">
                    Real-time pending transaction tracking interface
                  </p>
                  <Button variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    View Pending ({transactionData.pendingTransactions})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Transaction Broadcasting</CardTitle>
                <CardDescription>
                  Manually broadcast raw transactions to blockchain networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Transaction Broadcaster</h3>
                  <p className="text-muted-foreground mb-6">
                    Advanced transaction broadcasting interface
                  </p>
                  <Button variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Broadcast Transaction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Transaction Analytics</CardTitle>
                <CardDescription>
                  Comprehensive transaction metrics and network analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground mb-6">
                    Transaction volume, fees, and network performance metrics
                  </p>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nested routes for detailed views */}
      <Routes>
        <Route path="/transactions/:transactionId" element={<div>Transaction Details View</div>} />
        <Route path="/broadcast/:broadcastId" element={<div>Broadcast Details View</div>} />
        <Route path="*" element={<Navigate to="/wallet/dfns/transactions" replace />} />
      </Routes>
    </div>
  );
}