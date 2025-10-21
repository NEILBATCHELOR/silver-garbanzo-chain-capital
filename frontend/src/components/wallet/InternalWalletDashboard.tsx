import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle2
} from 'lucide-react';

// Import existing wallet components
import { useWallet } from '@/services/wallet/WalletContext';
import { EnhancedWalletList } from './components/dashboard/EnhancedWalletList';
import { PortfolioOverview } from './components/dashboard/PortfolioOverview';
import { TokenBalances } from './components/dashboard/TokenBalances';
import { TransferTab } from './components/dashboard/TransferTab';
import { TestnetBalanceChecker } from './TestnetBalanceChecker';

// Import wallet connection utilities
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

// Import organization and project components
import { CombinedOrgProjectSelector } from '@/components/organizations';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';

// Import multi-sig components
import { SignatureCollectionDashboard } from './components/multisig/SignatureCollectionDashboard';
import { MultiSigWalletWizard } from './components/multisig/MultiSigWalletWizard';

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
    wallets, 
    selectedWallet, 
    selectWallet, 
    loading, 
    refreshBalances,
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

  // Initialize project on component mount
  useEffect(() => {
    findPrimaryProject();
  }, []);

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
      refreshBalances();
    }
  };

  const handleFullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshBalances(),
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

  // Calculate portfolio totals
  const portfolioTotal = wallets.reduce((total, wallet) => {
    return total + (parseFloat(wallet.balance || '0'));
  }, 0);

  const handleRefresh = async () => {
    await handleFullRefresh();
  };

  const handleCreateWallet = async () => {
    console.log('🔧 DEBUG: handleCreateWallet called');
    console.log('🔧 DEBUG: wallets.length:', wallets.length);
  
    try {
      const newWallet = await createWallet('New Wallet', 'eoa', 'ethereum-mainnet');
      toast({
        title: "Wallet Created",
        description: `New wallet created successfully: ${newWallet.address}`,
      });
      await refreshBalances();
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

  const isLoadingWallets = loading || wallets.length === 0 && loading;

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
          <Button onClick={handleCreateWallet}>
            <Plus className="h-4 w-4 mr-2" />
            Create Wallet
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {showBalances ? `$${portfolioTotal.toLocaleString()}` : '••••••'}
            </div>
            <p className="text-xs text-muted-foreground">
              +2.5% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.length}</div>
            <p className="text-xs text-muted-foreground">
              {wallets.filter(w => w.type === 'eoa').length} EOA, {wallets.filter(w => w.type === 'multisig').length} Multi-sig
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Badge variant="outline" className="text-xs">
              {new Set(wallets.map(w => w.network)).size} chains
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(wallets.map(w => w.network)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-chain portfolio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Wallet</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedWallet ? selectedWallet.name : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedWallet ? `${selectedWallet.network} • ${selectedWallet.type.toUpperCase()}` : 'Select a wallet to get started'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Internal Wallets</TabsTrigger>
          <TabsTrigger value="external">Connect External</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="multisig">Multi-Sig</TabsTrigger>
          <TabsTrigger value="testnet">Testnet Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PortfolioOverview />
            <div className="space-y-6">
              <EnhancedWalletList
                wallets={wallets}
                selectedWalletId={selectedWallet?.id}
                onSelectWallet={selectWallet}
                loading={loading}
                userId={user?.id || ''}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Chain Capital Internal Wallets</h3>
              <p className="text-sm text-muted-foreground">Wallets generated and controlled by Chain Capital</p>
            </div>
            <Button onClick={handleCreateWallet} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate New Address
            </Button>
          </div>
          <EnhancedWalletList
            wallets={wallets}
            selectedWalletId={selectedWallet?.id}
            onSelectWallet={selectWallet}
            loading={loading}
            userId={user?.id || ''}
          />
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

        <TabsContent value="multisig" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Multi-Signature Transactions</h3>
              <p className="text-sm text-muted-foreground">Manage proposals, collect signatures, and execute multi-sig transactions</p>
            </div>
            <MultiSigWalletWizard projectId={projectId || undefined} />
          </div>
          <SignatureCollectionDashboard />
        </TabsContent>

        <TabsContent value="testnet" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Testnet Balance Testing</h3>
              <p className="text-sm text-muted-foreground">Test wallet balance fetching on Sepolia and Holesky testnets</p>
            </div>
          </div>
          <TestnetBalanceChecker />
        </TabsContent>
      </Tabs>

      {/* Empty State for No Wallets */}
      {wallets.length === 0 && !loading && (
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
      {loading && (
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