import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Wallet, 
  Plus, 
  ArrowRightLeft, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData, WalletAsset } from '@/types/dfns';

// Import wallet components (to be created)
import { WalletList } from '../wallets/wallet-list';
import { WalletCreationWizard } from '../dialogs/wallet-creation-wizard';
import { WalletDetailsView } from '../wallets/wallet-details-view';
import { AssetTransferDialog } from '../dialogs/asset-transfer-dialog';

/**
 * DFNS Wallets Page - Comprehensive wallet management
 * Following the climateReceivables pattern with real DFNS integration
 */
export function DfnsWalletsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real wallet data from DFNS
  const [walletData, setWalletData] = useState({
    totalWallets: 0,
    totalValue: '$0.00',
    networks: 0,
    pendingTransactions: 0,
    wallets: [] as WalletData[],
    assets: [] as WalletAsset[],
    isLoading: true
  });

  const refreshWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view wallets');
        return;
      }

      // Get real wallet data
      const wallets = await dfnsService.getWalletService().getAllWallets();
      // Note: getWalletAssets requires a walletId, so we'll get assets for each wallet separately
      const walletsWithAssets = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const assets = await dfnsService.getWalletAssetsService().getWalletAssets(wallet.id);
            return { ...wallet, assets: assets.assets || [] };
          } catch {
            return { ...wallet, assets: [] };
          }
        })
      );
      
      // Calculate metrics
      const networks = new Set(wallets.map(w => w.network)).size;
      // Extract all assets from all wallets for total value calculation
      const allAssets = walletsWithAssets.flatMap(wallet => wallet.assets || []);
      const totalValue = allAssets.reduce((sum, asset) => {
        const balance = parseFloat(asset.balance) || 0;
        const valueInUsd = parseFloat(asset.valueInUsd || '0') || 0;
        return sum + valueInUsd;
      }, 0);
      
      // Get pending transactions across all wallets
      const allPendingTx = await Promise.all(
        wallets.map(wallet => 
          dfnsService.getTransactionService().getPendingTransactions(wallet.id)
        )
      );
      const pendingCount = allPendingTx.reduce((sum, txs) => sum + txs.length, 0);

      setWalletData({
        totalWallets: wallets.length,
        totalValue: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        networks,
        pendingTransactions: pendingCount,
        wallets,
        assets: allAssets,
        isLoading: false
      });

      toast({
        title: "Success",
        description: `Loaded ${wallets.length} wallets across ${networks} networks`,
      });

    } catch (error: any) {
      console.error("Error loading wallet data:", error);
      setError(`Failed to load wallet data: ${error.message}`);
      setWalletData(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWalletData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-network digital asset custody and management
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshWalletData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <WalletCreationWizard onWalletCreated={refreshWalletData} />
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

        {/* Wallet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{walletData.totalWallets}</div>
              <div className="text-xs text-muted-foreground">
                Across {walletData.networks} networks
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{walletData.totalValue}</div>
              <div className="text-xs text-muted-foreground">
                USD value
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{walletData.networks}</div>
              <div className="text-xs text-muted-foreground">
                Blockchain networks
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <div className="p-1.5 rounded-md bg-yellow-100">
                  <ArrowRightLeft className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{walletData.pendingTransactions}</div>
              <div className="text-xs text-muted-foreground">
                Transactions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Management Tabs */}
        <Tabs defaultValue="all-wallets" className="space-y-4">
          <TabsList className="w-full max-w-md grid grid-cols-3">
            <TabsTrigger value="all-wallets" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              <span>All Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Assets</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-wallets" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Wallets</CardTitle>
                    <CardDescription>
                      Manage wallets across multiple blockchain networks
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{walletData.totalWallets} Wallets</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <WalletList 
                  showCreateButton={false}
                  showFilters={true}
                  className="border-none"
                  onWalletUpdated={refreshWalletData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Asset Portfolio</CardTitle>
                <CardDescription>
                  View and manage digital assets across all wallets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Asset Management</h3>
                  <p className="text-muted-foreground mb-6">
                    Comprehensive asset portfolio view coming soon
                  </p>
                  <Button variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    View Assets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Transaction history and wallet activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Activity Timeline</h3>
                  <p className="text-muted-foreground mb-6">
                    Transaction history and activity monitoring
                  </p>
                  <Button variant="outline">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    View Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nested routes for detailed views */}
      <Routes>
        <Route path="/create" element={<WalletCreationWizard modal={false} />} />
        <Route path="/:walletId" element={<WalletDetailsView />} />
        <Route path="*" element={<Navigate to="/wallet/dfns/wallets" replace />} />
      </Routes>
    </div>
  );
}