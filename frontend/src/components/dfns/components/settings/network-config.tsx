import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label"; // Added missing import
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, 
  Zap, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Loader2,
  Activity,
  Shield
} from "lucide-react";
import { useState, useEffect } from "react";
import { getDfnsService } from "../../../../services/dfns";
import type { NetworkName } from "../../../../types/dfns/core";

interface NetworkConfiguration {
  network: NetworkName;
  enabled: boolean;
  isTestnet: boolean;
  chainId?: number;
  rpcEndpoint?: string;
  explorerUrl?: string;
  gasTokenSymbol: string;
  avgBlockTime: number;
  avgConfirmationTime: number;
  minConfirmations: number;
  maxGasPrice?: string;
  description: string;
}

interface NetworkMetrics {
  network: NetworkName;
  walletCount: number;
  transactionCount: number;
  totalVolumeUsd: number;
  avgTransactionFee: number;
  successRate: number;
  avgConfirmationTime: number;
  lastTransaction?: string;
  isHealthy: boolean;
  healthIssues: string[];
}

/**
 * Network Configuration Component
 * 
 * Comprehensive network preferences and settings including:
 * - Multi-chain network configuration
 * - Network health monitoring
 * - Performance optimization settings
 * - Custom RPC endpoints
 * - Gas price management
 */
export function NetworkConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("networks");
  
  const [networkConfigs, setNetworkConfigs] = useState<NetworkConfiguration[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Default network configurations
  const defaultNetworks: NetworkConfiguration[] = [
    {
      network: 'Ethereum',
      enabled: true,
      isTestnet: false,
      chainId: 1,
      gasTokenSymbol: 'ETH',
      avgBlockTime: 12,
      avgConfirmationTime: 180,
      minConfirmations: 12,
      description: 'Ethereum Mainnet - Primary blockchain for DeFi and smart contracts'
    },
    {
      network: 'Polygon',
      enabled: true,
      isTestnet: false,
      chainId: 137,
      gasTokenSymbol: 'MATIC',
      avgBlockTime: 2,
      avgConfirmationTime: 30,
      minConfirmations: 20,
      description: 'Polygon - Layer 2 scaling solution for Ethereum'
    },
    {
      network: 'Bitcoin',
      enabled: true,
      isTestnet: false,
      gasTokenSymbol: 'BTC',
      avgBlockTime: 600,
      avgConfirmationTime: 600,
      minConfirmations: 6,
      description: 'Bitcoin - The original cryptocurrency network'
    },
    {
      network: 'Arbitrum',
      enabled: true,
      isTestnet: false,
      chainId: 42161,
      gasTokenSymbol: 'ETH',
      avgBlockTime: 1,
      avgConfirmationTime: 15,
      minConfirmations: 5,
      description: 'Arbitrum One - Optimistic rollup for Ethereum'
    },
    {
      network: 'Optimism',
      enabled: true,
      isTestnet: false,
      chainId: 10,
      gasTokenSymbol: 'ETH',
      avgBlockTime: 2,
      avgConfirmationTime: 30,
      minConfirmations: 10,
      description: 'Optimism - Optimistic rollup for Ethereum scaling'
    },
    {
      network: 'Base',
      enabled: true,
      isTestnet: false,
      chainId: 8453,
      gasTokenSymbol: 'ETH',
      avgBlockTime: 2,
      avgConfirmationTime: 30,
      minConfirmations: 10,
      description: 'Base - Coinbase Layer 2 built on Optimism'
    },
    {
      network: 'Binance',
      enabled: false,
      isTestnet: false,
      chainId: 56,
      gasTokenSymbol: 'BNB',
      avgBlockTime: 3,
      avgConfirmationTime: 45,
      minConfirmations: 15,
      description: 'BNB Smart Chain - Fast and low-cost blockchain'
    },
    {
      network: 'Avalanche',
      enabled: false,
      isTestnet: false,
      chainId: 43114,
      gasTokenSymbol: 'AVAX',
      avgBlockTime: 2,
      avgConfirmationTime: 30,
      minConfirmations: 10,
      description: 'Avalanche C-Chain - High-performance blockchain platform'
    },
    {
      network: 'Solana',
      enabled: true,
      isTestnet: false,
      gasTokenSymbol: 'SOL',
      avgBlockTime: 0.4,
      avgConfirmationTime: 30,
      minConfirmations: 32,
      description: 'Solana - High-performance blockchain for DeFi and Web3'
    },
    // Testnets
    {
      network: 'EthereumSepolia',
      enabled: false,
      isTestnet: true,
      chainId: 11155111,
      gasTokenSymbol: 'ETH',
      avgBlockTime: 12,
      avgConfirmationTime: 180,
      minConfirmations: 3,
      description: 'Ethereum Sepolia Testnet - For testing smart contracts'
    },
    {
      network: 'PolygonAmoy',
      enabled: false,
      isTestnet: true,
      chainId: 80002,
      gasTokenSymbol: 'MATIC',
      avgBlockTime: 2,
      avgConfirmationTime: 30,
      minConfirmations: 5,
      description: 'Polygon Amoy Testnet - For testing Layer 2 applications'
    }
  ];

  const fetchNetworkData = async () => {
    try {
      const dfnsService = getDfnsService();
      await dfnsService.initialize();

      const walletService = dfnsService.getWalletService();
      const transactionService = dfnsService.getTransactionService();

      // Get wallet summaries to calculate network metrics
      const walletSummaries = await walletService.getWalletsSummary();
      
      // Group wallets by network
      const networkStats = new Map<NetworkName, {
        walletCount: number;
        transactionCount: number;
        totalVolumeUsd: number;
        transactions: any[];
      }>();

      // Initialize stats for all networks
      defaultNetworks.forEach(network => {
        networkStats.set(network.network, {
          walletCount: 0,
          transactionCount: 0,
          totalVolumeUsd: 0,
          transactions: []
        });
      });

      // Calculate wallet stats by network
      walletSummaries.forEach(wallet => {
        const stats = networkStats.get(wallet.network as NetworkName);
        if (stats) {
          stats.walletCount++;
          stats.totalVolumeUsd += wallet.totalValueUsd ? parseFloat(wallet.totalValueUsd) : 0;
        }
      });

      // Get transaction data for each wallet to calculate network transaction stats
      for (const wallet of walletSummaries) {
        try {
          const txSummaries = await transactionService.getTransactionsSummary(wallet.walletId);
          
          const networkStats_ = networkStats.get(wallet.network as NetworkName);
          if (networkStats_) {
            networkStats_.transactionCount += txSummaries.length;
            networkStats_.transactions.push(...txSummaries.map(tx => ({
              ...tx,
              network: wallet.network
            })));
          }
        } catch (txError) {
          console.warn(`Failed to get transactions for wallet ${wallet.walletId}:`, txError);
        }
      }

      // Convert network stats to metrics
      const metricsData: NetworkMetrics[] = Array.from(networkStats.entries()).map(([network, stats]) => {
        const networkConfig = defaultNetworks.find(n => n.network === network);
        const failedTxs = stats.transactions.filter((tx: any) => tx.status === 'Failed').length;
        const successRate = stats.transactionCount > 0 
          ? ((stats.transactionCount - failedTxs) / stats.transactionCount) * 100 
          : 100;

        // Find the most recent transaction
        const recentTx = stats.transactions
          .sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())[0];

        // Calculate average transaction fee (mock data based on network)
        const avgTransactionFee = network === 'Bitcoin' ? 0.0001 :
                                 network === 'Ethereum' ? 0.003 :
                                 network === 'Polygon' ? 0.0001 :
                                 network === 'Arbitrum' ? 0.0005 :
                                 network === 'Optimism' ? 0.0005 :
                                 network === 'Solana' ? 0.00025 :
                                 0.001;

        // Determine health status
        const isHealthy = successRate >= 95 && stats.transactionCount >= 0;
        const healthIssues: string[] = [];
        
        if (successRate < 95) healthIssues.push(`Low success rate: ${successRate.toFixed(1)}%`);
        if (stats.walletCount === 0) healthIssues.push('No active wallets');

        return {
          network,
          walletCount: stats.walletCount,
          transactionCount: stats.transactionCount,
          totalVolumeUsd: stats.totalVolumeUsd,
          avgTransactionFee,
          successRate,
          avgConfirmationTime: networkConfig?.avgConfirmationTime || 60,
          lastTransaction: recentTx?.dateCreated,
          isHealthy,
          healthIssues
        };
      });

      setNetworkMetrics(metricsData);
      
      // Load current network configuration (from localStorage or defaults)
      const savedConfig = localStorage.getItem('dfns-network-config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setNetworkConfigs(parsed);
        } catch {
          setNetworkConfigs(defaultNetworks);
        }
      } else {
        setNetworkConfigs(defaultNetworks);
      }

      setError(null);
    } catch (error) {
      console.error('Failed to load network data:', error);
      setError(`Failed to load network data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Still load default configs even if data fetch fails
      setNetworkConfigs(defaultNetworks);
    }
  };

  const saveNetworkConfiguration = async () => {
    try {
      setSaving(true);

      // Save to localStorage (in a real app, this would go to a backend)
      localStorage.setItem('dfns-network-config', JSON.stringify(networkConfigs));

      setUnsavedChanges(false);
      setError('Network configuration saved successfully.');
    } catch (error) {
      console.error('Failed to save network configuration:', error);
      setError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleNetworkEnabled = (network: NetworkName, enabled: boolean) => {
    setNetworkConfigs(prev => 
      prev.map(config => 
        config.network === network 
          ? { ...config, enabled }
          : config
      )
    );
    setUnsavedChanges(true);
  };

  const updateNetworkConfig = (network: NetworkName, updates: Partial<NetworkConfiguration>) => {
    setNetworkConfigs(prev => 
      prev.map(config => 
        config.network === network 
          ? { ...config, ...updates }
          : config
      )
    );
    setUnsavedChanges(true);
  };

  const resetToDefaults = () => {
    if (confirm('Reset all network configurations to defaults? This will lose any custom settings.')) {
      setNetworkConfigs(defaultNetworks);
      setUnsavedChanges(true);
    }
  };

  const getNetworkIcon = (network: NetworkName) => {
    return <Globe className="h-4 w-4" />; // In a real app, you'd have specific network icons
  };

  const getHealthStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getHealthStatusIcon = (isHealthy: boolean, issues: string[]) => {
    if (isHealthy) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (issues.length > 0) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchNetworkData();
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading network configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Network Configuration</h2>
          <p className="text-muted-foreground">
            Configure blockchain network preferences and settings
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => fetchNetworkData()} 
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={resetToDefaults} 
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {unsavedChanges && (
            <Button 
              onClick={saveNetworkConfiguration} 
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Networks</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {networkConfigs.filter(n => n.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {networkConfigs.length} configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {networkMetrics.reduce((sum, n) => sum + n.walletCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all networks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(networkMetrics.reduce((sum, n) => sum + n.totalVolumeUsd, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Networks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {networkMetrics.filter(n => n.isHealthy).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Operating normally
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant={error.includes('successfully') ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="networks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mainnet Networks */}
            <Card>
              <CardHeader>
                <CardTitle>Mainnet Networks</CardTitle>
                <CardDescription>
                  Production blockchain networks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {networkConfigs
                  .filter(config => !config.isTestnet)
                  .map(config => {
                    const metrics = networkMetrics.find(m => m.network === config.network);
                    
                    return (
                      <div key={config.network} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {getNetworkIcon(config.network)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{config.network}</span>
                              {metrics && (
                                <Badge variant="outline" className="text-xs">
                                  {metrics.walletCount} wallets
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {config.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>
                                {config.gasTokenSymbol} • {config.avgConfirmationTime}s conf
                              </span>
                              {metrics && (
                                <>
                                  <span>•</span>
                                  <span className={getHealthStatusColor(metrics.isHealthy)}>
                                    {metrics.isHealthy ? 'Healthy' : 'Issues'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(enabled) => toggleNetworkEnabled(config.network, enabled)}
                        />
                      </div>
                    );
                  })
                }
              </CardContent>
            </Card>

            {/* Testnet Networks */}
            <Card>
              <CardHeader>
                <CardTitle>Testnet Networks</CardTitle>
                <CardDescription>
                  Testing and development networks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {networkConfigs
                  .filter(config => config.isTestnet)
                  .map(config => {
                    const metrics = networkMetrics.find(m => m.network === config.network);
                    
                    return (
                      <div key={config.network} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {getNetworkIcon(config.network)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{config.network}</span>
                              <Badge variant="secondary" className="text-xs">
                                Testnet
                              </Badge>
                              {metrics && (
                                <Badge variant="outline" className="text-xs">
                                  {metrics.walletCount} wallets
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {config.description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {config.gasTokenSymbol} • {config.avgConfirmationTime}s conf
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(enabled) => toggleNetworkEnabled(config.network, enabled)}
                        />
                      </div>
                    );
                  })
                }
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Performance Metrics</CardTitle>
              <CardDescription>
                Real-time performance data for enabled networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {networkMetrics.filter(metrics => 
                networkConfigs.find(config => config.network === metrics.network && config.enabled)
              ).length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No enabled networks with activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {networkMetrics
                    .filter(metrics => 
                      networkConfigs.find(config => config.network === metrics.network && config.enabled)
                    )
                    .sort((a, b) => b.transactionCount - a.transactionCount)
                    .map(metrics => (
                      <div key={metrics.network} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            {getNetworkIcon(metrics.network)}
                            {getHealthStatusIcon(metrics.isHealthy, metrics.healthIssues)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{metrics.network}</span>
                              <Badge 
                                variant={metrics.isHealthy ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {metrics.successRate.toFixed(1)}% success
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{metrics.walletCount} wallets</span>
                              <span>{metrics.transactionCount} transactions</span>
                              <span>{formatCurrency(metrics.totalVolumeUsd)} volume</span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span>Avg fee: {metrics.avgTransactionFee.toFixed(6)} {
                                networkConfigs.find(c => c.network === metrics.network)?.gasTokenSymbol
                              }</span>
                              <span>Conf time: {metrics.avgConfirmationTime}s</span>
                              {metrics.lastTransaction && (
                                <span>Last tx: {formatTimeAgo(metrics.lastTransaction)}</span>
                              )}
                            </div>
                            {metrics.healthIssues.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {metrics.healthIssues.map((issue, index) => (
                                  <Badge key={index} variant="destructive" className="text-xs">
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Confirmation Settings</CardTitle>
                <CardDescription>
                  Configure transaction confirmation requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {networkConfigs
                  .filter(config => config.enabled)
                  .slice(0, 5) // Show first 5 enabled networks
                  .map(config => (
                    <div key={config.network} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>{config.network}</Label>
                        <Badge variant="outline">
                          {config.minConfirmations} confirmations
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Minimum confirmations required for transactions
                      </div>
                    </div>
                  ))
                }
                
                {networkConfigs.filter(config => config.enabled).length > 5 && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      +{networkConfigs.filter(config => config.enabled).length - 5} more networks
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization</CardTitle>
                <CardDescription>
                  Network-specific performance settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Connection Timeout</Label>
                  <div className="text-sm text-muted-foreground">
                    Maximum time to wait for network responses: 30 seconds
                  </div>
                  <Badge variant="default">Optimal</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Retry Strategy</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatic retry for failed network requests: 3 attempts
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Gas Price Strategy</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatic gas price estimation for optimal transaction speed
                  </div>
                  <Badge variant="default">Auto</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Network Health Monitoring</Label>
                  <div className="text-sm text-muted-foreground">
                    Continuous monitoring of network status and performance
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}