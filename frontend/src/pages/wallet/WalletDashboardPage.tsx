import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWallet } from "@/services/wallet/WalletContext";
import { useUser } from "@/hooks/auth/user/useUser";
import { Wallet, Shield, ArrowUpDown, Clock, BarChart3, CreditCard, Settings, ArrowLeftRight, RefreshCw, Globe, DollarSign, CircuitBoard, Zap } from "lucide-react";
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
import { UnifiedWalletDashboard } from "@/components/wallet/components/smart-contract";
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
    if (tabParam && ["overview", "transfer", "wallets", "smart-contracts", "tokens", "transactions", "moonpay", "ripple", "security"].includes(tabParam)) {
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
        <TabsList className="grid grid-cols-9 w-full">
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
        <TabsTrigger value="smart-contracts" className="flex items-center gap-2">
        <CircuitBoard className="h-4 w-4" />
        <span className="hidden sm:inline">Smart</span>
        </TabsTrigger>
        <TabsTrigger value="tokens" className="flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        <span className="hidden sm:inline">Tokens</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">History</span>
        </TabsTrigger>
        <TabsTrigger value="moonpay" className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">Moonpay</span>
        </TabsTrigger>
        <TabsTrigger value="ripple" className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">Ripple</span>
        </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
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

        <TabsContent value="smart-contracts" className="mt-6">
          <div className="space-y-6">
            {/* Smart Contract Wallet Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CircuitBoard className="w-6 h-6 text-blue-600" />
                  Smart Contract Wallets
                </h2>
                <p className="text-muted-foreground">
                  Advanced wallet features with Diamond proxy architecture, WebAuthn, and gasless transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Zap className="w-3 h-3 mr-1" />
                  Phase 3D Complete
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => navigate('/wallet/smart-contract')}
                  className="flex items-center gap-2"
                >
                  <CircuitBoard className="w-4 h-4" />
                  Full Interface
                </Button>
              </div>
            </div>

            {/* Feature Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CircuitBoard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Diamond Proxy</p>
                      <p className="text-xs text-blue-700">EIP-2535 architecture</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">WebAuthn</p>
                      <p className="text-xs text-green-700">Biometric authentication</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Gasless Txns</p>
                      <p className="text-xs text-purple-700">Account abstraction</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">Restrictions</p>
                      <p className="text-xs text-orange-700">Compliance rules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Unified Wallet Dashboard */}
            <UnifiedWalletDashboard />
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="mt-6">
          <TokenBalances />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <RecentTransactions limit={20} showFilters={true} />
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

        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure your wallet security options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Transaction Limits</h3>
                    <p className="text-sm text-muted-foreground">
                      Set daily transfer limits
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Whitelist Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Control approved addresses
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Guardian Wallets (Enterprise)</h3>
                    <p className="text-sm text-muted-foreground">
                      Institutional-grade wallet management
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/wallet/guardian/test")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Test API
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Smart Contract Wallets</h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced features with Diamond proxy architecture
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/wallet/smart-contract")}
                  >
                    <CircuitBoard className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">WebAuthn Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Biometric authentication with passkeys
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('smart-contracts')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Wallet Health</CardTitle>
                <CardDescription>
                  Security recommendations and checks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-green-100 text-green-800 rounded-md flex items-start">
                  <Shield className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium">MultiSig Security</h3>
                    <p className="text-sm">
                      Your MultiSig wallets are properly configured with multiple signers
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-amber-100 text-amber-800 rounded-md flex items-start">
                  <Shield className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Backup Reminder</h3>
                    <p className="text-sm">
                      Please ensure you have backed up your recovery phrases
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-green-100 text-green-800 rounded-md flex items-start">
                  <Shield className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Password Protection</h3>
                    <p className="text-sm">
                      Your wallet access is protected with a strong password
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 text-blue-800 rounded-md flex items-start">
                  <CircuitBoard className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Smart Contract Security</h3>
                    <p className="text-sm">
                      Diamond proxy architecture with modular security facets enabled
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 text-purple-800 rounded-md flex items-start">
                  <Zap className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Account Abstraction</h3>
                    <p className="text-sm">
                      EIP-4337 support for gasless transactions and batch operations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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