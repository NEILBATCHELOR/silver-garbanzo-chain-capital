import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWallet } from "@/services/wallet/WalletContext";
import { useUser } from "@/hooks/auth/user/useUser";
import { Wallet, Shield, ArrowUpDown, BarChart3, CreditCard, ArrowLeftRight, RefreshCw, Globe, DollarSign } from "lucide-react";
import { PortfolioOverview } from "@/components/wallet/components/dashboard/PortfolioOverview";
import { WalletList, EnhancedWalletList } from "@/components/wallet/components/dashboard/EnhancedWalletList";
import { GuardianWalletList } from "@/components/wallet/components/guardian/GuardianWalletList";
import { SimplifiedGuardianWalletCreation } from "@/components/wallet/components/guardian/SimplifiedGuardianWalletCreation";
import { TokenBalances } from "@/components/wallet/components/dashboard/TokenBalances";
import { NetworkStatus } from "@/components/wallet/components/dashboard/NetworkStatus";
import { RecentTransactions } from "@/components/wallet/components/dashboard/RecentTransactions";
import { TransferTab } from "@/components/wallet/components/dashboard/TransferTab";
import SelectiveAppKitProvider from '@/infrastructure/web3/appkit/SelectiveAppKitProvider';
import { MoonpayIntegration } from "@/components/wallet/components/moonpay";
import { RipplePayments } from "@/components/wallet/components/ripple/RipplePayments";
import { GuardianWalletService } from "@/services/guardian/GuardianWalletService";
import { OrganizationSelector, useOrganizationContext } from "@/components/organizations";
import type { Wallet as WalletType } from "@/types/core/centralModels";
import type { GuardianWalletExtension } from "@/types/guardian/guardian";

const WalletDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallets, loading, selectedWallet, selectWallet, refreshBalances } = useWallet();
  const { user, loading: userLoading } = useUser();
  const { shouldShowSelector } = useOrganizationContext();
  const [activeTab, setActiveTab] = useState("overview");
  const [guardianWallets, setGuardianWallets] = useState<(WalletType & GuardianWalletExtension)[]>([]);
  const [guardianLoading, setGuardianLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const guardianWalletService = new GuardianWalletService();

  // Helper functions for wallet status classification
  const isActiveGuardianWallet = (wallet: any) => {
    return ['active', 'processed', 'completed'].includes(wallet.guardianMetadata?.status || '');
  };

  const isPendingGuardianWallet = (wallet: any) => {
    return ['pending', 'processing'].includes(wallet.guardianMetadata?.status || '');
  };

  useEffect(() => {
    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "transfer", "wallets", "tokens", "moonpay", "ripple"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    // Load Guardian wallets when user is available
    if (user) {
      loadGuardianWallets();
    }
  }, [user]);

  const loadGuardianWallets = async () => {
    if (!user) return;
    
    try {
      setGuardianLoading(true);
      
      // First sync any pending wallets with Guardian API
      await guardianWalletService.syncAllPendingWallets();
      
      // Then load the updated wallets
      const wallets = await guardianWalletService.listWallets();
      // Filter by current user
      const userWallets = wallets.filter(wallet => wallet.userId === user.id);
      setGuardianWallets(userWallets);
    } catch (error) {
      console.error('Error loading Guardian wallets:', error);
    } finally {
      setGuardianLoading(false);
    }
  };

  // Placeholder for wallet selection from list
  const handleWalletSelect = (walletId: string) => {
    selectWallet(walletId);
  };

  // Handle Guardian wallet selection
  const handleGuardianWalletSelect = (wallet: WalletType & GuardianWalletExtension) => {
    // For now, just log the selection. In future, could integrate with existing wallet context
    console.log('Guardian wallet selected:', wallet);
  };

  // Handle Guardian wallet creation completion
  const handleGuardianWalletCreated = (wallet: WalletType & GuardianWalletExtension) => {
    setGuardianWallets(prev => [...prev, wallet]);
    setShowCreateDialog(false);
    // Switch to wallets tab to show the new wallet
    setActiveTab("wallets");
  };

  // Navigate to Guardian wallet creation dialog
  const handleCreateGuardianWallet = () => {
    setShowCreateDialog(true);
  };

  // Navigate to transfer tab
  const handleTransfer = () => {
    setActiveTab("transfer");
  };

  // Combined refresh function for both wallet types
  const handleRefreshAll = async () => {
    setGuardianLoading(true);
    await Promise.all([
      refreshBalances(),
      loadGuardianWallets()
    ]);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="w-full max-w-none mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Wallet Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your crypto assets across multiple blockchains
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shouldShowSelector && (
              <OrganizationSelector 
                compact={true}
                showIcon={true}
                className="w-64"
              />
            )}
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={loading || guardianLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || guardianLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleTransfer}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              Transfer
            </Button>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleCreateGuardianWallet}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Create Guardian Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Guardian Wallet</DialogTitle>
                  <DialogDescription>
                    Create a new institutional-grade wallet managed by Guardian for enhanced security and compliance.
                  </DialogDescription>
                </DialogHeader>
                <SimplifiedGuardianWalletCreation 
                  onWalletCreated={handleGuardianWalletCreated}
                  onCancel={() => setShowCreateDialog(false)}
                  maxWallets={50}
                  currentWalletCount={guardianWallets.length}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Balance
            </CardTitle>
            <CardDescription>Across all wallets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wallets.length > 0 ? 
                `${wallets.reduce((total, wallet) => total + (parseFloat(wallet.balance) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                '$0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {(wallets.length > 0 || guardianWallets.length > 0) ? (
                <span className="text-green-500 font-medium">↗ Ready to transact</span>
              ) : (
                <span className="text-muted-foreground">Create your first wallet</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Wallets
            </CardTitle>
            <CardDescription>Standard and Guardian wallets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wallets.length + guardianWallets.filter(isActiveGuardianWallet).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {guardianWallets.filter(isActiveGuardianWallet).length} Guardian, {wallets.length} Standard
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Operations
            </CardTitle>
            <CardDescription>Guardian wallets processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {guardianWallets.filter(isPendingGuardianWallet).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {guardianWallets.filter(isPendingGuardianWallet).length === 0 ? (
                <span className="text-green-500 font-medium">All operations complete</span>
              ) : (
                <span className="text-yellow-500 font-medium">Operations in progress</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-6 w-full">
        <TabsTrigger value="overview" className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="transfer" className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4" />
        <span className="hidden sm:inline">Transfer</span>
        </TabsTrigger>
        <TabsTrigger value="wallets" className="flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Wallets</span>
        </TabsTrigger>
        <TabsTrigger value="tokens" className="flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        <span className="hidden sm:inline">Tokens</span>
        </TabsTrigger>
        <TabsTrigger value="moonpay" className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">Moonpay</span>
        </TabsTrigger>
        <TabsTrigger value="ripple" className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">Ripple</span>
        </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PortfolioOverview />
            </div>
            <div>
              <NetworkStatus />
            </div>
          </div>
          <div className="mt-6">
            <RecentTransactions limit={5} />
          </div>
        </TabsContent>

        <TabsContent value="transfer" className="mt-6">
          <TransferTab />
        </TabsContent>

        <TabsContent value="wallets" className="mt-6">
          {user ? (
            <GuardianWalletList 
              onWalletSelect={handleGuardianWalletSelect}
              userId={user.id}
              maxWallets={50}
              wallets={guardianWallets}
              loading={guardianLoading}
              onRefresh={loadGuardianWallets}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
                <p className="text-gray-500">Please sign in to view your Guardian wallets.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tokens" className="mt-6">
          <TokenBalances />
        </TabsContent>

        <TabsContent value="moonpay" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Fiat On/Off Ramp</h2>
                <p className="text-muted-foreground">Buy and sell crypto with fiat currency via MoonPay</p>
              </div>
              <Badge variant="secondary">Powered by MoonPay</Badge>
            </div>
            <MoonpayIntegration />
          </div>
        </TabsContent>

        <TabsContent value="ripple" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Cross-Border Payments</h2>
                <p className="text-muted-foreground">Send international payments using Ripple's On-Demand Liquidity</p>
              </div>
              <Badge variant="secondary">ODL Network</Badge>
            </div>
            <RipplePayments />
          </div>
        </TabsContent>

      </Tabs>

      {/* Guardian Wallets (Enterprise) Button */}
      <div className="mt-8 pt-6 border-t">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-900">Guardian Wallets (Enterprise)</h3>
                  <p className="text-blue-700">Institutional-grade wallet management</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/wallet/guardian/test")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Shield className="h-4 w-4 mr-2" />
                Test API
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

const WalletDashboardPageWithProvider: React.FC = () => {
  return (
    <SelectiveAppKitProvider>
      <WalletDashboardPage />
    </SelectiveAppKitProvider>
  );
};

export default WalletDashboardPageWithProvider;