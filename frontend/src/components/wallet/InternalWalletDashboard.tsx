import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/hooks/auth/user/useUser';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  Send, 
  Settings,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';

// Import InternalWalletService
import { 
  internalWalletService, 
  type ProjectWallet, 
  type UserWallet, 
  type MultiSigWallet,
  type AllWallets 
} from '@/services/wallet/InternalWalletService';

// Import WalletBalance type for proper balance display
import type { WalletBalance } from '@/services/wallet/balances';

// Import existing wallet components
import { useWallet } from '@/services/wallet/UnifiedWalletContext';
import { EnhancedWalletList } from './components/dashboard/EnhancedWalletList';
import { TokenBalances } from './components/dashboard/TokenBalances';
import { TransferTab } from './components/dashboard/TransferTab';
import { TestnetBalanceChecker } from './TestnetBalanceChecker';

// Import wallet connection utilities
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

// Import organization and project components
import { CombinedOrgProjectSelector } from '@/components/organizations';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';

import { Skeleton } from '@/components/ui/skeleton';

interface InternalWalletDashboardProps {
  className?: string;
}

export const InternalWalletDashboard: React.FC<InternalWalletDashboardProps> = ({
  className = ''
}) => {
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const { 
    wallets: contextWallets, 
    selectedWallet, 
    selectWallet, 
    loading: contextLoading, 
    refreshBalances: contextRefreshBalances,
    createWallet 
  } = useWallet();

  // External wallet connection hooks
  const { open } = useAppKit();
  const { isConnected, connector } = useAccount();

  // Dashboard state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showBalances, setShowBalances] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);

  // Project management state
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // NEW: InternalWalletService state
  const [internalWallets, setInternalWallets] = useState<AllWallets>({
    projectWallets: [],
    userWallets: [],
    multiSigWallets: []
  });
  const [loadingInternalWallets, setLoadingInternalWallets] = useState(false);
  const [walletBalancesLoaded, setWalletBalancesLoaded] = useState(false);
  const [totalUserWalletCount, setTotalUserWalletCount] = useState<number>(0);

  // Initialize project on component mount
  useEffect(() => {
    findPrimaryProject();
  }, []);

  // Load wallets when projectId changes
  useEffect(() => {
    if (projectId) {
      loadProjectWallets();
    }
  }, [projectId]);

  // Load user wallets when component mounts (not dependent on current user)
  useEffect(() => {
    loadUserWallets();
  }, []);

  // NEW: Load project wallets using InternalWalletService
  const loadProjectWallets = async () => {
    if (!projectId) return;

    try {
      setLoadingInternalWallets(true);
      // Fetch wallets WITH balances in one go
      const allWallets = await internalWalletService.refreshAllBalances(projectId);
      
      // IMPORTANT: Only update project and multisig wallets, preserve user wallets
      setInternalWallets(prev => ({
        ...prev,
        projectWallets: allWallets.projectWallets,
        multiSigWallets: allWallets.multiSigWallets
        // userWallets: keep existing user wallets from loadUserWallets()
      }));
      
      setWalletBalancesLoaded(true);
    } catch (error) {
      console.error('Failed to load project wallets:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load wallets',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoadingInternalWallets(false);
    }
  };

  // NEW: Load user wallets (ALL users, not just current user)
  const loadUserWallets = async () => {
    try {
      // Load ALL user wallets WITH balances
      const [userWallets, totalCount] = await Promise.all([
        internalWalletService.refreshAllUserWalletBalances(true), // Get ALL user wallets WITH balances
        internalWalletService.getTotalUserWalletCount() // Get total count across all users
      ]);
      
      setInternalWallets(prev => ({
        ...prev,
        userWallets
      }));
      setTotalUserWalletCount(totalCount);
    } catch (error) {
      console.error('Failed to load user wallets:', error);
    }
  };

  // NEW: Refresh all balances
  const refreshAllBalances = async () => {
    if (!projectId) return;

    try {
      setRefreshing(true);
      // Get updated wallets WITH balances from the service
      const updatedWallets = await internalWalletService.refreshAllBalances(projectId);
      
      // Update state with wallets that now have balance data
      setInternalWallets(prev => ({
        ...prev,
        projectWallets: updatedWallets.projectWallets,
        multiSigWallets: updatedWallets.multiSigWallets
      }));
      
      // Refresh ALL user wallets (not just current user)
      const updatedUserWallets = await internalWalletService.refreshAllUserWalletBalances();
      setInternalWallets(prev => ({
        ...prev,
        userWallets: updatedUserWallets
      }));

      setWalletBalancesLoaded(true);
      
      toast({
        title: 'Balances Updated',
        description: 'All wallet balances have been refreshed',
      });
    } catch (error) {
      console.error('Failed to refresh balances:', error);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Function to find and set the primary project
  const findPrimaryProject = async () => {
    try {
      setIsLoadingProject(true);
      
      const projectData = await getPrimaryOrFirstProject();
      
      if (projectData) {
        console.log(`Using project: ${projectData.name} (${projectData.id}) for wallet dashboard`);
        setProjectId(projectData.id);
        setProject(projectData);
      } else {
        console.warn("No projects found for wallet dashboard");
        toast({
          title: "No Projects Found",
          description: "Please create a project to access full wallet functionality.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error finding primary project:", error);
      toast({
        title: "Error",
        description: "Failed to find a default project.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      setProjectId(newProjectId);
      // Optionally refresh wallet data for new project
      refreshAllBalances();
    }
  };

  const handleFullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAllBalances(),
        contextRefreshBalances(),
        findPrimaryProject()
      ]);
      toast({
        title: "Dashboard Updated",
        description: "All wallet data and project information have been refreshed",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to update dashboard data",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate portfolio totals from internal wallets
  const calculatePortfolioTotal = () => {
    let total = 0;
    
    // Add project wallet balances (USD values only for mainnets)
    internalWallets.projectWallets.forEach(wallet => {
      if (wallet.balance && !wallet.balance.isTestnet) {
        total += wallet.balance.totalValueUsd;
      }
    });
    
    // Add user wallet balances (USD values only for mainnets)
    internalWallets.userWallets.forEach(wallet => {
      if (wallet.balance && !wallet.balance.isTestnet) {
        total += wallet.balance.totalValueUsd;
      }
    });
    
    // Add multi-sig wallet balances (USD values only for mainnets)
    internalWallets.multiSigWallets.forEach(wallet => {
      if (wallet.balance && !wallet.balance.isTestnet) {
        total += wallet.balance.totalValueUsd;
      }
    });
    
    // Also add context wallet balances (external wallets)
    contextWallets.forEach(wallet => {
      if (wallet.balance) {
        total += parseFloat(wallet.balance);
      }
    });
    
    return total;
  };

  const portfolioTotal = calculatePortfolioTotal();
  
  // Calculate wallet counts for "Standard • Multi-Sig" format
  const standardWalletCount = 
    internalWallets.projectWallets.length + 
    internalWallets.userWallets.length;
  const multiSigCount = internalWallets.multiSigWallets.length;
  
  const totalWalletCount = 
    standardWalletCount + 
    multiSigCount +
    contextWallets.length;

  // Helper functions
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (balance: WalletBalance | undefined) => {
    if (!balance) return "0";
    
    // Show native balance with symbol from network name
    const nativeSymbol = balance.network.toUpperCase();
    return `${parseFloat(balance.nativeBalance).toFixed(4)} ${nativeSymbol}`;
  };

  const formatBalanceWithUsd = (balance: WalletBalance | undefined) => {
    if (!balance) return "$0.00";
    
    // For testnets, just show native balance
    if (balance.isTestnet) {
      return formatBalance(balance);
    }
    
    // For mainnets, show USD value
    return `$${balance.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to get network display for a project wallet
  const getNetworkDisplay = (wallet: ProjectWallet): string => {
    if (wallet.chainId) {
      return `Chain ${wallet.chainId}`;
    }
    if (wallet.nonEvmNetwork) {
      return wallet.nonEvmNetwork.charAt(0).toUpperCase() + wallet.nonEvmNetwork.slice(1);
    }
    if (wallet.bitcoinNetworkType) {
      return `Bitcoin ${wallet.bitcoinNetworkType}`;
    }
    return 'Unknown Network';
  };

  // Helper to get wallet type display
  const getWalletTypeDisplay = (wallet: ProjectWallet): string => {
    if (wallet.chainId) {
      return 'EVM';
    }
    if (wallet.nonEvmNetwork) {
      return 'Non-EVM';
    }
    if (wallet.bitcoinNetworkType) {
      return 'Bitcoin';
    }
    return 'EOA';
  };

  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
  };

  const handleRefresh = async () => {
    await handleFullRefresh();
  };

  const handleCreateWallet = async () => {
    console.log('🔧 DEBUG: handleCreateWallet called');
    console.log('🔧 DEBUG: totalWalletCount:', totalWalletCount);
  
    try {
      const newWallet = await createWallet('New Wallet', 'eoa', 'ethereum-mainnet');
      toast({
        title: "Wallet Created",
        description: `New wallet created successfully: ${newWallet.address}`,
      });
      await Promise.all([
        contextRefreshBalances(),
        loadProjectWallets()
      ]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create wallet",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleConnectExternalWallet = () => {
    open();
  };

  const isLoadingWallets = contextLoading || loadingInternalWallets;

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Organization and Project Header */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              {project?.name || "Chain Capital"} - Internal Wallet Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate addresses, connect external wallets, and manage your multi-chain portfolio
              {project && ` for ${project.name}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector 
              currentProjectId={projectId || undefined} 
              onProjectChange={handleProjectChange}
              layout="horizontal"
              compact={true}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullRefresh}
              disabled={refreshing || isLoadingProject}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing || isLoadingProject ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className={`container mx-auto p-6 space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showBalances ? `$${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">
              USD Value (Mainnet Only)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWalletCount}</div>
            <p className="text-xs text-muted-foreground">
              {standardWalletCount} Standard • {multiSigCount} Multi-Sig
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              ({internalWallets.projectWallets.length} Project, {internalWallets.userWallets.length} User EOA)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Badge variant="outline" className="text-xs">
              Multi-chain
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const networks = new Set([
                  ...internalWallets.projectWallets.map(w => w.chainId || 'unknown'),
                  ...internalWallets.userWallets.map(w => w.blockchain),
                  ...internalWallets.multiSigWallets.map(w => w.blockchain),
                  ...contextWallets.map(w => w.network)
                ]);
                return networks.size;
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-chain portfolio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="external">Connect External</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            {user?.id ? (
              <EnhancedWalletList
                wallets={contextWallets}
                selectedWalletId={selectedWallet?.id}
                onSelectWallet={selectWallet}
                loading={contextLoading}
                userId={user.id}
                projectId={projectId || undefined}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <Skeleton className="h-4 w-48 mx-auto" />
                      <Skeleton className="h-4 w-32 mx-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="external" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Connect External Wallets</h3>
              <p className="text-sm text-muted-foreground">Connect MetaMask, Coinbase, and other external wallets</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                External Wallet Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">
                    Connected with {connector?.name || 'Unknown Wallet'}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={handleConnectExternalWallet} className="w-full" size="lg">
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect External Wallet
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Supports 300+ wallets including MetaMask, Coinbase Wallet, WalletConnect, and more
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-6">
          <TokenBalances />
        </TabsContent>

        <TabsContent value="transfer" className="space-y-6">
          <TransferTab />
        </TabsContent>
      </Tabs>

      {/* Empty State for No Wallets */}
      {totalWalletCount === 0 && !isLoadingWallets && (
        <Card className="p-8 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to Chain Capital</h3>
          <p className="text-muted-foreground mb-4">
            Create your first wallet to start managing your cryptocurrency portfolio
          </p>
          <Button onClick={handleCreateWallet}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Wallet
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingWallets && (
        <Card className="p-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading your wallet portfolio...</p>
        </Card>
      )}
      </div>
    </div>
  );
};

export default InternalWalletDashboard;