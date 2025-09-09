import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, DollarSign, Wallet, Shield, Users, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DfnsService } from "../../../../services/dfns";
import { DFNS_STATUS } from "../../../../infrastructure/dfns/config";
import type { WalletSummary } from "../../../../services/dfns/walletService";
import {
AuthStatusCard, 
UserList, 
CredentialManager, 
ServiceAccountList, 
PersonalTokenList 
} from "../authentication";
import {
  PermissionManager,
  PermissionAssignment,
  RoleTemplates
} from "../permissions";
import {
  TransactionList,
  TransactionDetails,
  BroadcastDialog
} from "../transactions";
import {
  PolicyDashboard,
  ApprovalQueue,
  RiskManagement
} from "../policies";

/**
 * Dashboard component for the DFNS module
 * Displays key metrics, charts, and quick access to main features
 * Uses real DFNS services to fetch live data
 */
export function DfnsDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real DFNS data state
  const [walletSummaries, setWalletSummaries] = useState<WalletSummary[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalServiceAccounts, setTotalServiceAccounts] = useState(0);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [activeCredentials, setActiveCredentials] = useState(0);
  
  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  // Initialize DFNS service on component mount (only if properly configured)
  useEffect(() => {
    const initializeDfns = async () => {
      try {
        // Check if DFNS is properly configured before attempting initialization
        if (!DFNS_STATUS.isConfigured) {
          console.warn('DFNS is not configured. Missing environment variables:', DFNS_STATUS.missingVars);
          setError(`DFNS configuration missing. Please set environment variables: ${DFNS_STATUS.missingVars.join(', ')}`);
          setLoading(false);
          return;
        }

        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service. Please check your configuration.');
      } finally {
        setLoading(false);
      }
    };

    initializeDfns();
  }, []);

  // Fetch dashboard data from real DFNS services
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);
        
        // Fetch wallet summaries and calculate portfolio value
        const walletService = dfnsService.getWalletService();
        const userService = dfnsService.getUserService();
        const serviceAccountService = dfnsService.getServiceAccountService();
        const credentialService = dfnsService.getCredentialService();

        // Get wallet data
        const walletSummariesData = await walletService.getWalletsSummary();
        setWalletSummaries(walletSummariesData);

        // Calculate total portfolio value from wallet summaries
        const totalValue = walletSummariesData.reduce((sum, wallet) => {
          if (wallet.totalValueUsd) {
            return sum + parseFloat(wallet.totalValueUsd);
          }
          return sum;
        }, 0);
        setPortfolioValue(totalValue);

        // Get user counts
        try {
          const users = await userService.getAllUsers();
          setTotalUsers(users.length);
        } catch (userError) {
          console.warn('Failed to fetch users:', userError);
          setTotalUsers(0);
        }

        // Get service account counts
        try {
          const serviceAccounts = await serviceAccountService.getAllServiceAccounts();
          setTotalServiceAccounts(serviceAccounts.length);
        } catch (serviceError) {
          console.warn('Failed to fetch service accounts:', serviceError);
          setTotalServiceAccounts(0);
        }

        // Get credential counts
        try {
          const credentials = await credentialService.listCredentials();
          const activeCredsCount = credentials.items.filter(cred => cred.isActive).length;
          setActiveCredentials(activeCredsCount);
        } catch (credError) {
          console.warn('Failed to fetch credentials:', credError);
          setActiveCredentials(0);
        }

        // Get pending transaction counts across all wallets
        try {
          const transactionService = dfnsService.getTransactionService();
          let totalPending = 0;
          
          for (const walletSummary of walletSummariesData) {
            try {
              const pendingTxs = await transactionService.getPendingTransactions(walletSummary.walletId);
              totalPending += pendingTxs.length;
            } catch (txError) {
              console.warn(`Failed to get pending transactions for wallet ${walletSummary.walletId}:`, txError);
            }
          }
          
          setPendingTransactions(totalPending);
        } catch (txError) {
          console.warn('Failed to get pending transactions:', txError);
          setPendingTransactions(0);
        }

      } catch (error) {
        console.error('Error fetching DFNS dashboard data:', error);
        setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dfnsService]);

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading DFNS dashboard data...</p>
          <p className="text-sm text-muted-foreground mt-2">Connecting to DFNS services...</p>
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
        
        {/* Show helpful configuration instructions if DFNS is not configured */}
        {!DFNS_STATUS.isConfigured && (
          <div className="mt-4 p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">DFNS Configuration Required</h3>
            <p className="text-sm text-muted-foreground mb-2">
              To use DFNS functionality, please set the following environment variables:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {DFNS_STATUS.missingVars.map((variable) => (
                <li key={variable} className="font-mono">{variable}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              The platform will continue to work without DFNS, but blockchain wallet features will be unavailable.
            </p>
          </div>
        )}
        
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Calculate metrics with real data
  const activeWallets = walletSummaries.filter(w => w.isActive).length;
  const totalAssets = walletSummaries.reduce((sum, w) => sum + w.assetCount, 0);
  const totalNfts = walletSummaries.reduce((sum, w) => sum + w.nftCount, 0);
  const networks = [...new Set(walletSummaries.map(w => w.network))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DFNS Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time view of your DFNS wallet infrastructure
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => handleQuickAction('/wallet/dfns/wallets/create')}>
            Create Wallet
          </Button>
          <Button onClick={() => handleQuickAction('/wallet/dfns/auth/users')} variant="outline">
            Manage Users
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {networks.length} blockchain networks
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeWallets}</div>
                <p className="text-xs text-muted-foreground">
                  {walletSummaries.length} total wallets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {totalServiceAccounts} service accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Credentials</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCredentials}</div>
                <p className="text-xs text-muted-foreground">
                  WebAuthn and keys
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Asset Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssets}</div>
                <p className="text-xs text-muted-foreground">
                  Total fungible assets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">NFT Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNfts}</div>
                <p className="text-xs text-muted-foreground">
                  Total NFTs across wallets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{networks.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active blockchain networks
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeWallets}</div>
                <p className="text-xs text-muted-foreground">
                  Across {networks.length} networks
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total asset value
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asset Types</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssets}</div>
                <p className="text-xs text-muted-foreground">
                  Fungible tokens
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NFTs</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNfts}</div>
                <p className="text-xs text-muted-foreground">
                  Non-fungible tokens
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Network breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Network Distribution</CardTitle>
              <CardDescription>
                Wallets across blockchain networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {networks.map(network => {
                  const networkWallets = walletSummaries.filter(w => w.network === network);
                  const networkValue = networkWallets.reduce((sum, w) => {
                    return sum + (w.totalValueUsd ? parseFloat(w.totalValueUsd) : 0);
                  }, 0);
                  
                  return (
                    <div key={network} className="flex justify-between items-center">
                      <span className="font-medium">{network}</span>
                      <div className="text-right">
                        <div className="font-medium">{networkWallets.length} wallets</div>
                        <div className="text-sm text-muted-foreground">
                          ${networkValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {/* Authentication Status Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Credentials</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCredentials}</div>
                <p className="text-xs text-muted-foreground">
                  WebAuthn and keys
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Organization members
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalServiceAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  Machine users
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallets Secured</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeWallets}</div>
                <p className="text-xs text-muted-foreground">
                  With user action signing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Authentication Status Card */}
          <div className="grid gap-4 md:grid-cols-1">
            <AuthStatusCard />
          </div>

          {/* Authentication and Permissions Management Components */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="service-accounts">Service Accounts</TabsTrigger>
              <TabsTrigger value="tokens">Access Tokens</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="roles">Role Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <UserList />
            </TabsContent>

            <TabsContent value="credentials" className="space-y-4">
              <CredentialManager />
            </TabsContent>

            <TabsContent value="service-accounts" className="space-y-4">
              <ServiceAccountList />
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
              <PersonalTokenList />
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <PermissionManager />
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <PermissionAssignment />
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <RoleTemplates />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting confirmation
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Networks Active</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{networks.length}</div>
                <p className="text-xs text-muted-foreground">
                  Blockchain networks
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DFNS Integration</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  Enterprise-ready
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">
                  All services operational
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Management Components */}
          <div className="grid gap-4 md:grid-cols-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Transaction Management</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage cross-chain transactions
                </p>
              </div>
              <BroadcastDialog />
            </div>
            
            <TransactionList />
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {/* Policy Management Components */}
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard">Policy Dashboard</TabsTrigger>
              <TabsTrigger value="approvals">Approval Queue</TabsTrigger>
              <TabsTrigger value="risk">Risk Management</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <PolicyDashboard />
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <ApprovalQueue />
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <RiskManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
